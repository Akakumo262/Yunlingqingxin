import type { PurposeCode } from '../enums';
import { RouteDef, RouteName, Routes } from '../routes';
import type * as D from '../dto';
import { coreHandlers } from './core';
import { moreHandlers } from './more';
import { F, Handler, MockError, createState } from './state';

export * as fixtures from './data';
export { MockError };

/**
 * 模拟后端：118 个接口的可运行参考实现，纯内存，浏览器、小程序、Node 都能跑。
 * 三个用途：① 前端不依赖真实后端即可开发与演示；② tools/mock-server.cjs 把它包成 HTTP 服务；
 * ③ 它就是后端的行为规格——真实后端对同样的请求应返回同样结构、同样语义的响应（实现方式不限）。
 *
 * 文件分工：data.ts 与 content/ 是合成数据；state.ts 是状态和联动（通知、提醒分发、成长护照印记）；
 * core.ts 是第一批接口；more.ts 是第二批接口；本文件只做鉴权和分发。
 */
export interface MockRequest {
  /** 形如 mock.student01 */
  token?: string | null;
  purpose?: string | null;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
}
export interface MockResponse {
  status: number;
  body: unknown;
}

/** 这些读操作属于敏感读取，需要留审计（写操作全部留） */
const SENSITIVE_READS: RouteName[] = ['alertList', 'classBoard', 'studentCard', 'caseList', 'caseGet', 'assessmentReport', 'referralList', 'regionReport', 'assessmentOverview', 'activityRoster', 'followUps', 'accessGrantList', 'exportList', 'regionDocument'];
/** 这些接口创建了新资源，返回 201；其余成功返回 200 */
const CREATED: RouteName[] = ['checkInCreate', 'consentGrant', 'signalCreate', 'observationCreate', 'caseCreate', 'caseIntervention', 'caseRefer', 'contentCreate', 'assessmentStart', 'postCreate', 'institutionApply', 'activityCreate', 'passportAddRecord', 'appointmentCreate', 'noteCreate', 'classPush', 'announcementCreate', 'exportCreate', 'breakGlass', 'feedbackCreate'];

export function createMock() {
  const S = createState();
  const handlers: { [K in RouteName]: Handler } = { ...coreHandlers(S), ...moreHandlers(S) };

  function call(name: RouteName, req: MockRequest = {}): MockResponse {
    const route: RouteDef = Routes[name];
    let user: F.MockUser | null = null;
    const action = `${route.method} ${route.path}`, resource = route.path.split('/')[1];
    try {
      if (route.roles !== 'public') {
        const account = req.token?.replace(/^Bearer\s+/i, '').replace(/^mock\./, '');
        user = S.users.find((u) => u.account === account) ?? null;
        if (!user) throw new MockError(401, 'UNAUTHENTICATED', '未登录或登录已过期');
        if (route.roles.length && !route.roles.some((r) => user!.roles.includes(r))) throw new MockError(403, 'FORBIDDEN', '当前角色无权访问');
        if (route.purpose && (req.purpose !== route.purpose || !user.purposes.includes(route.purpose))) throw new MockError(403, 'PURPOSE_DENIED', '目的码不允许', `该接口要求 ${route.purpose}，当前为 ${req.purpose ?? '未携带'}`);
      }
      const body = handlers[name]({ user: user as F.MockUser, params: req.params ?? {}, query: (req.query ?? {}) as Record<string, any>, body: req.body });
      if (user && (route.method !== 'GET' || SENSITIVE_READS.includes(name))) S.record(user, action, resource, 'allow', route.purpose ?? null, req.params?.id ?? null);
      return { status: CREATED.includes(name) ? 201 : 200, body };
    } catch (e) {
      if (!(e instanceof MockError)) throw e;
      if (e.status === 403) S.record(user, action, resource, 'deny', (req.purpose as PurposeCode) ?? null, req.params?.id ?? null);
      const problem: D.Problem = { type: `https://errors.yunling.local/${e.code.toLowerCase().replace(/_/g, '-')}`, title: e.message, status: e.status, detail: e.detail, code: e.code, request_id: S.id('req') };
      return { status: e.status, body: problem };
    }
  }

  return { call };
}

export type Mock = ReturnType<typeof createMock>;
