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
const SA = Role.schoolAdmin, EDU = Role.eduAdmin, CMT = Role.committee, COM = Role.community, INST = Role.institution, OP = Role.operator, AUD = Role.auditor, MOD = Role.moderator;
const teachers: Role[] = [HT, PSY, SL];
/** 能组织活动的角色 */
const organizers: Role[] = [HT, PSY, CMT, COM];

/**
 * 第一批：59 个接口，安全底线与主流程（身份、打卡、测评、求助、个案、转介、内容、AI、成长圈、机构、看板、审计）。
 * 请求体/响应体类型见 dto.ts；行为见 mock/core.ts。
 */
export const CoreRoutes = {
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

/**
 * 第二批：59 个接口，让平台日常用得起来的部分（搜索、收藏、专题、学习计划、五育活动、通知、
 * 求助进度、预约、家校沟通单、内容推送、回访、规则、名册、公告、导出、紧急访问、报告、帮助）。
 * 请求体/响应体类型见 dto-more.ts；行为见 mock/more.ts。
 */
export const MoreRoutes = {
  // ── 搜索、收藏、专题 ──
  searchAll: r('GET', '/search', []),
  contentFavorite: r('POST', '/contents/:id/favorite', []),
  favoriteList: r('GET', '/me/favorites', []),
  contentComplete: r('POST', '/contents/:id/complete', []),
  contentFeedback: r('POST', '/contents/:id/feedback', []),
  collectionList: r('GET', '/collections', []),
  collectionGet: r('GET', '/collections/:id', []),
  contentAdminList: r('GET', '/admin/contents', [OP]),

  // ── 学习计划、今日小行动 ──
  planList: r('GET', '/plans', [S], Purpose.growth),
  planJoin: r('POST', '/plans/:id/join', [S], Purpose.growth),
  planQuit: r('DELETE', '/plans/:id/join', [S], Purpose.growth),
  planStepDone: r('POST', '/plans/:id/steps/:day/done', [S], Purpose.growth),
  microActionDone: r('POST', '/micro-actions/:id/done', [S], Purpose.growth),

  // ── 五育活动：报名 → 签到 → 反思 → 见证 → 进成长护照 ──
  activityList: r('GET', '/activities', []),
  activityGet: r('GET', '/activities/:id', []),
  activitySignup: r('POST', '/activities/:id/signup', [S], Purpose.growth),
  activityCancel: r('DELETE', '/activities/:id/signup', [S], Purpose.growth),
  activityCheckIn: r('POST', '/activities/:id/check-in', [S], Purpose.growth),
  activityReflect: r('POST', '/activities/:id/reflection', [S], Purpose.growth),
  activityCreate: r('POST', '/activities', organizers),
  activityRoster: r('GET', '/activities/:id/roster', organizers, Purpose.growth),
  activityWitness: r('POST', '/activities/:id/witness', organizers, Purpose.growth),

  // ── 成长护照 ──
  passportAddRecord: r('POST', '/passport/records', [S], Purpose.growth),
  passportUpdate: r('PATCH', '/passport', [S], Purpose.growth),

  // ── 通知 ──
  noticeList: r('GET', '/notifications', []),
  noticeRead: r('POST', '/notifications/:id/read', []),
  noticeReadAll: r('POST', '/notifications/read-all', []),

  // ── 求助进度、预约心理老师 ──
  helpRequests: r('GET', '/me/help-requests', [S], Purpose.crisis),
  appointmentSlots: r('GET', '/appointments/slots', [S], Purpose.growth),
  appointmentCreate: r('POST', '/appointments', [S], Purpose.growth),
  appointmentList: r('GET', '/appointments', [S, PSY], Purpose.growth),
  appointmentConfirm: r('POST', '/appointments/:id/confirm', [PSY], Purpose.growth),
  appointmentCancel: r('DELETE', '/appointments/:id', [S], Purpose.growth),

  // ── 家校沟通单、内容推送、回访 ──
  noteList: r('GET', '/notes', [HT, G], Purpose.growth),
  noteCreate: r('POST', '/notes', [HT], Purpose.growth),
  noteReply: r('POST', '/notes/:id/reply', [G], Purpose.growth),
  classPush: r('POST', '/classes/:id/pushes', [HT, PSY], Purpose.growth),
  classPushList: r('GET', '/classes/:id/pushes', [HT, PSY], Purpose.growth),
  followUps: r('GET', '/follow-ups', [HT, PSY], Purpose.crisis),
  guardianTaskDone: r('POST', '/guardian/tasks/done', [G], Purpose.growth),

  // ── 测评历史与概览 ──
  assessmentHistory: r('GET', '/assessment-sessions', [S], Purpose.growth),
  assessmentOverview: r('GET', '/assessments/overview', [PSY], Purpose.growth),

  // ── 规则、名册、公告 ──
  riskRuleList: r('GET', '/risk-rules', [PSY, SL, OP]),
  riskRuleUpdate: r('PATCH', '/risk-rules/:id', [SL, OP]),
  rosterPreview: r('POST', '/orgs/import/preview', [SA]),
  rosterCommit: r('POST', '/orgs/import/commit', [SA]),
  announcementList: r('GET', '/announcements', []),
  announcementCreate: r('POST', '/announcements', [OP, EDU, SL]),

  // ── 导出审批、紧急访问 ──
  exportCreate: r('POST', '/exports', [HT, PSY, SL, EDU]),
  exportList: r('GET', '/exports', [HT, PSY, SL, EDU, AUD]),
  exportApprove: r('POST', '/exports/:id/approve', [SL, EDU]),
  breakGlass: r('POST', '/cases/:id/break-glass', [PSY, SL], Purpose.crisis),
  accessGrantList: r('GET', '/access-grants', [SL, AUD]),
  accessGrantReview: r('POST', '/access-grants/:id/review', [AUD], Purpose.audit),

  // ── 区域报告、系统状态 ──
  regionDocument: r('GET', '/reports/region/document', [EDU, SL], Purpose.stats),
  systemHealth: r('GET', '/admin/health', [OP]),

  // ── 帮助、反馈、点赞 ──
  helpFaqs: r('GET', '/help/faqs', []),
  feedbackCreate: r('POST', '/feedback', []),
  postLike: r('POST', '/posts/:id/like', [S, HT, PSY]),
} satisfies Record<string, RouteDef>;

/** 路由表 = 接口清单，共 118 个。新增接口先加到这里，再两端各自实现。 */
export const Routes = { ...CoreRoutes, ...MoreRoutes };

export type CoreRouteName = keyof typeof CoreRoutes;
export type MoreRouteName = keyof typeof MoreRoutes;
export type RouteName = keyof typeof Routes;

/** 把 /cases/:id 填成 /cases/123，并带上前缀 */
export function buildPath(route: RouteDef, params: Record<string, string> = {}): string {
  const path = route.path.replace(/:(\w+)/g, (_, k: string) => {
    if (!(k in params)) throw new Error(`缺少路径参数 ${k}`);
    return encodeURIComponent(params[k]);
  });
  return API_PREFIX + path;
}

/** 按 method + 完整路径反查路由。没有路径参数的路由优先，避免 /appointments/slots 被 /appointments/:id 抢走 */
export function matchRoute(method: string, fullPath: string): { name: RouteName; params: Record<string, string> } | null {
  const path = fullPath.startsWith(API_PREFIX) ? fullPath.slice(API_PREFIX.length) : fullPath;
  const names = (Object.keys(Routes) as RouteName[]).sort((a, b) => Number(Routes[a].path.includes(':')) - Number(Routes[b].path.includes(':')));
  for (const name of names) {
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
