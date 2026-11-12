import { HeaderNames, Problem, RouteDef, RouteName, Routes, buildPath, createMock } from '@yunling/contracts';
import { useAuth } from '@/store/auth';

export class ApiError extends Error {
  constructor(public readonly problem: Problem) {
    super(problem.detail ? `${problem.title}：${problem.detail}` : problem.title);
  }
}

interface CallOpts {
  params?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

/**
 * 数据来源由 VITE_API_MODE 决定：
 *   auto（默认）— 3000 端口有后端就连后端，没有就用内置演示数据
 *   http        — 只连后端
 *   mock        — 只用内置演示数据
 */
const MODE = (import.meta.env.VITE_API_MODE as 'auto' | 'http' | 'mock' | undefined) ?? 'auto';
const mock = createMock();
const nameOf = new Map<RouteDef, RouteName>((Object.keys(Routes) as RouteName[]).map((k) => [Routes[k], k]));

let resolved: Promise<'http' | 'mock'> | null = null;
export function apiMode(): Promise<'http' | 'mock'> {
  if (MODE !== 'auto') return Promise.resolve(MODE);
  resolved ??= fetch(buildPath(Routes.health), { signal: AbortSignal.timeout(900) })
    .then((r) => (r.ok ? 'http' : 'mock'))
    .catch(() => 'mock' as const);
  return resolved;
}

/** 唯一的请求入口：api<Page<AlertItem>>(Routes.alertList)。目的码、鉴权头、幂等键按契约自动带上。 */
export async function api<T>(route: RouteDef, opts: CallOpts = {}): Promise<T> {
  const token = useAuth.getState().token;
  const query = Object.fromEntries(Object.entries(opts.query ?? {}).filter(([, v]) => v !== undefined && v !== '')) as Record<string, string | number>;
  let status: number, data: unknown;

  if ((await apiMode()) === 'mock') {
    await new Promise((r) => setTimeout(r, 120)); // 留一点加载感，避免界面“瞬移”
    ({ status, body: data } = mock.call(nameOf.get(route)!, { token, purpose: route.purpose, params: opts.params, query, body: opts.body }));
  } else {
    const qs = new URLSearchParams(query as Record<string, string>).toString();
    const headers: Record<string, string> = {};
    if (token) headers[HeaderNames.auth] = `Bearer ${token}`;
    if (route.purpose) headers[HeaderNames.purpose] = route.purpose;
    if (route.method !== 'GET') {
      headers['content-type'] = 'application/json';
      headers[HeaderNames.idempotency] = crypto.randomUUID();
    }
    const res = await fetch(buildPath(route, opts.params) + (qs ? `?${qs}` : ''), { method: route.method, headers, body: route.method === 'GET' ? undefined : JSON.stringify(opts.body ?? {}) });
    status = res.status;
    data = status === 204 ? undefined : await res.json().catch(() => null);
  }

  if (status >= 400) {
    if (status === 401 && token) useAuth.getState().logout();
    throw new ApiError((data as Problem) ?? { type: 'about:blank', title: '网络异常，请稍后再试', status, code: 'INTERNAL' });
  }
  return data as T;
}
