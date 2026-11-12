import { Purpose, PurposeCode, Role } from './enums';

/** 端口与前缀：三端统一从这里取 */
export const PORTS = { api: 3000, web: 5173, miniappH5: 10086, postgres: 5432, redis: 6379, minio: 9000 } as const;
export const API_PREFIX = '/api/v1';

export interface RouteDef {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** 不含前缀；路径参数写成 :id */
  path: string;
  /** 允许的角色；空数组 = 登录即可；public = 免登录 */
  roles: Role[] | 'public';
  /** 需要携带的目的码；undefined = 不要求 */
  purpose?: PurposeCode;
}

const r = (method: RouteDef['method'], path: string, roles: RouteDef['roles'], purpose?: PurposeCode): RouteDef => ({ method, path, roles, purpose });

const S = Role.student, G = Role.guardian, HT = Role.headTeacher, PSY = Role.psychologist, SL = Role.schoolLeader;
const SA = Role.schoolAdmin, EDU = Role.eduAdmin, CMT = Role.committee, INST = Role.institution, OP = Role.operator, AUD = Role.auditor, MOD = Role.moderator;
const teachers: Role[] = [HT, PSY, SL];

/**
 * 路由表 = 接口清单，共 59 个，G0 全部要实现。
 * 每个接口的请求体/响应体类型见 dto.ts 里同名注释；行为见 mock/handlers.ts（可运行的参考实现）。
 */
export const Routes = {
  // ── 身份与同意 ──
  health: r('GET', '/health', 'public'),
  authDevLogin: r('POST', '/auth/dev-login', 'public'),
  authWechatLogin: r('POST', '/auth/wechat/login', 'public'),
  authPasswordLogin: r('POST', '/auth/password/login', 'public'),
  authActivate: r('POST', '/auth/activate', [S]),
  authGuardianBind: r('POST', '/auth/guardian/bind', [G]),
  me: r('GET', '/me', []),
  mePrivacy: r('GET', '/me/privacy', [S, G]),
  consentGrant: r('POST', '/consents', [S, G]),
  consentRevoke: r('DELETE', '/consents/:purpose', [S, G]),

  // ── 学生日常 ──
  homeGet: r('GET', '/home', [S], Purpose.growth),
  checkInCreate: r('POST', '/check-ins', [S], Purpose.growth),
  checkInList: r('GET', '/check-ins', [S], Purpose.growth),
  passportGet: r('GET', '/passport', [S], Purpose.growth),
  guardianSummary: r('GET', '/guardian/summary', [G], Purpose.growth),

  // ── 测评 ──
  instrumentList: r('GET', '/assessments', [S, PSY], Purpose.growth),
  assessmentStart: r('POST', '/assessment-sessions', [S], Purpose.growth),
  assessmentSubmit: r('POST', '/assessment-sessions/:id/submit', [S], Purpose.growth),
  assessmentReport: r('GET', '/assessment-sessions/:id/report', [S, PSY], Purpose.growth),

  // ── 求助 / 预警 / 观察 ──
  signalCreate: r('POST', '/signals', [S, ...teachers], Purpose.crisis),
  alertList: r('GET', '/alerts', teachers, Purpose.crisis),
  alertAck: r('POST', '/alerts/:id/ack', teachers, Purpose.crisis),
  alertEscalate: r('POST', '/alerts/:id/escalate', teachers, Purpose.crisis),
  alertDismiss: r('POST', '/alerts/:id/dismiss', teachers, Purpose.crisis),
  observationCreate: r('POST', '/observations', [HT, PSY], Purpose.growth),
  classBoard: r('GET', '/classes/:id/board', [HT, PSY], Purpose.growth),
  studentCard: r('GET', '/students/:id/card', [HT, PSY], Purpose.growth),
  talkScripts: r('GET', '/talk-scripts', teachers),

  // ── 个案与转介 ──
  caseCreate: r('POST', '/cases', [PSY], Purpose.crisis),
  caseList: r('GET', '/cases', teachers, Purpose.crisis),
  caseGet: r('GET', '/cases/:id', [PSY, HT], Purpose.crisis),
  caseUpdate: r('PATCH', '/cases/:id', [PSY], Purpose.crisis),
  caseIntervention: r('POST', '/cases/:id/interventions', [PSY, HT], Purpose.crisis),
  caseRefer: r('POST', '/cases/:id/referrals', [PSY], Purpose.crisis),
  referralList: r('GET', '/referrals', [PSY, INST], Purpose.crisis),
  referralAccept: r('POST', '/referrals/:id/accept', [INST], Purpose.crisis),
  referralFeedback: r('POST', '/referrals/:id/feedback', [INST], Purpose.crisis),

  // ── 内容与生涯 ──
  contentFeed: r('GET', '/contents', []),
  contentGet: r('GET', '/contents/:id', []),
  contentCreate: r('POST', '/contents', [OP, PSY]),
  contentReviewQueue: r('GET', '/content-reviews', [OP]),
  contentReview: r('POST', '/contents/:id/review', [OP]),
  careerCards: r('GET', '/career-cards', []),

  // ── AI 成长助手 ──
  aiChat: r('POST', '/ai/chat', [S, ...teachers], Purpose.growth),

  // ── 成长圈 ──
  circleList: r('GET', '/circles', [S, HT, PSY, MOD]),
  postList: r('GET', '/circles/:id/posts', [S, HT, PSY, MOD]),
  postCreate: r('POST', '/circles/:id/posts', [S, HT, PSY]),
  postReport: r('POST', '/posts/:id/report', [S, HT, PSY]),
  moderationQueue: r('GET', '/moderation/posts', [HT, MOD, OP]),
  postModerate: r('POST', '/posts/:id/moderate', [HT, MOD, OP]),

  // ── 机构 ──
  institutionList: r('GET', '/institutions', []),
  institutionApply: r('POST', '/institutions/applications', 'public'),
  institutionApplications: r('GET', '/institutions/applications', [OP, CMT]),
  institutionReview: r('POST', '/institutions/:id/review', [OP, CMT]),

  // ── 管理 / 看板 / 审计 ──
  orgTree: r('GET', '/orgs', [SA, EDU, OP]),
  regionReport: r('GET', '/reports/region', [EDU, SL], Purpose.stats),
  supervisionList: r('GET', '/supervisions', [EDU], Purpose.stats),
  tenantList: r('GET', '/tenants', [OP]),
  auditEvents: r('GET', '/audit/events', [AUD], Purpose.audit),
} satisfies Record<string, RouteDef>;

export type RouteName = keyof typeof Routes;

/** 把 /cases/:id 填成 /cases/123，并带上前缀 */
export function buildPath(route: RouteDef, params: Record<string, string> = {}): string {
  const path = route.path.replace(/:(\w+)/g, (_, k: string) => {
    if (!(k in params)) throw new Error(`缺少路径参数 ${k}`);
    return encodeURIComponent(params[k]);
  });
  return API_PREFIX + path;
}

/** 按 method + 完整路径反查路由（模拟服务与测试用） */
export function matchRoute(method: string, fullPath: string): { name: RouteName; params: Record<string, string> } | null {
  const path = fullPath.startsWith(API_PREFIX) ? fullPath.slice(API_PREFIX.length) : fullPath;
  for (const name of Object.keys(Routes) as RouteName[]) {
    const def: RouteDef = Routes[name];
    if (def.method !== method) continue;
    const keys: string[] = [];
    const re = new RegExp('^' + def.path.replace(/:(\w+)/g, (_, k: string) => (keys.push(k), '([^/]+)')) + '$');
    const m = re.exec(path);
    if (m) return { name, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

/** 请求头名，统一小写 */
export const HeaderNames = {
  auth: 'authorization',
  purpose: 'x-purpose-code',
  idempotency: 'idempotency-key',
  requestId: 'x-request-id',
} as const;
