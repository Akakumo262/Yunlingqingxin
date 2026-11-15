import Taro from '@tarojs/taro';
import { HeaderNames, Me, Problem, RouteDef, RouteName, Routes, TokenPair, buildPath, createMock } from '@yunling/contracts';

export class ApiError extends Error {
  constructor(public readonly problem: Problem) {
    super(problem.detail ? `${problem.title}：${problem.detail}` : problem.title);
  }
}

/** 会话只放内存：Token 不写入 Storage，重新打开小程序即重新登录 */
export const session: { token: string | null; me: Me | null; activated: boolean; bigType: boolean } = { token: null, me: null, activated: true, bigType: false };

const mock = createMock();
const nameOf = new Map<RouteDef, RouteName>((Object.keys(Routes) as RouteName[]).map((k) => [Routes[k], k]));
const uuid = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));

/**
 * 数据来源由 TARO_APP_API_MODE 决定（config/index.ts 注入 API_MODE）：
 *   auto（默认）— API_ORIGIN 上有后端就连后端，没有就用内置演示数据；http / mock 为强制指定。
 */
let resolved: Promise<'http' | 'mock'> | null = null;
export function apiMode(): Promise<'http' | 'mock'> {
  if (API_MODE !== 'auto') return Promise.resolve(API_MODE as 'http' | 'mock');
  resolved ??= Taro.request({ url: API_ORIGIN + buildPath(Routes.health), timeout: 1200 })
    .then((r) => (r.statusCode === 200 ? 'http' : 'mock') as 'http' | 'mock')
    .catch(() => 'mock' as const);
  return resolved;
}

interface CallOpts {
  params?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

/** 唯一的请求入口，与 Web 端同构：api<CheckIn>(Routes.checkInCreate, { body }) */
export async function api<T>(route: RouteDef, opts: CallOpts = {}): Promise<T> {
  let status: number, data: unknown;
  if ((await apiMode()) === 'mock') {
    await new Promise((r) => setTimeout(r, 120));
    ({ status, body: data } = mock.call(nameOf.get(route)!, { token: session.token, purpose: route.purpose, params: opts.params, query: opts.query, body: opts.body }));
  } else {
    const header: Record<string, string> = { 'content-type': 'application/json' };
    if (session.token) header[HeaderNames.auth] = `Bearer ${session.token}`;
    if (route.purpose) header[HeaderNames.purpose] = route.purpose;
    if (route.method !== 'GET') header[HeaderNames.idempotency] = uuid();
    const res = await Taro.request({ url: API_ORIGIN + buildPath(route, opts.params), method: route.method as 'GET', header, data: route.method === 'GET' ? opts.query : (opts.body ?? {}) });
    status = res.statusCode;
    data = res.data;
  }
  if (status >= 400) {
    if (status === 401 && session.token) {
      session.token = null;
      session.me = null;
      Taro.reLaunch({ url: '/pages/login/index' });
    }
    throw new ApiError((data as Problem) ?? { type: 'about:blank', title: '网络不太好，稍后再试', status, code: 'INTERNAL' });
  }
  return data as T;
}

/** G0：演示账号登录。接入微信后改为 Taro.login → Routes.authWechatLogin */
export async function loginAs(account: string): Promise<Me> {
  const t = await api<TokenPair>(Routes.authDevLogin, { body: { account } });
  session.token = t.access_token;
  session.activated = t.activated;
  session.me = await api<Me>(Routes.me);
  return session.me;
}

export function logout() {
  session.token = null;
  session.me = null;
  Taro.reLaunch({ url: '/pages/login/index' });
}

/** 统一的失败提示 */
export const fail = (e: unknown) => Taro.showToast({ title: (e as Error).message?.slice(0, 40) || '没有成功，请再试一次', icon: 'none', duration: 2600 });
export const newClientId = uuid;
