import type { ZodTypeAny } from 'zod';
import { CASE_TRANSITIONS, MOODS, Mood, PurposeCode, Role, SupportLevel } from '../enums';
import { RouteDef, RouteName, Routes } from '../routes';
import * as D from '../dto';
import * as F from './data';

export * as fixtures from './data';

/**
 * 模拟后端：59 个接口的可运行参考实现，纯内存，浏览器、小程序、Node 都能跑。
 * 三个用途：① 前端不依赖真实后端即可开发与演示；② tools/mock-server.cjs 把它包成 HTTP 服务；
 * ③ 它就是后端的行为规格——真实后端对同样的请求应返回同样结构、同样语义的响应（实现方式不限）。
 */

export class MockError extends Error {
  constructor(public status: number, public code: D.ErrorCode, title: string, public detail?: string) {
    super(title);
  }
}
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

interface Ctx {
  user: F.MockUser;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
}
type StoredCheckIn = D.CheckIn & { student_id: string; client_id?: string };
type StoredPost = Omit<D.Post, 'mine' | 'replies'> & { author_id: string; parent_id?: string; why?: D.ModerationItem['why']; report_reason?: D.ModerationItem['report_reason'] };
type StoredCase = D.CaseDetail & { class_id: string };

const MIN = 60_000, DAY = 86_400_000;
const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();
const dateOf = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10);
const mask = (name: string) => name.slice(0, 1) + '*';
const LEVELS: SupportLevel[] = ['L0', 'L1', 'L2', 'L3'];

export function createMock() {
  let seq = 0;
  const id = (p: string) => `${p}${(++seq).toString(36)}${Date.now().toString(36).slice(-4)}`;
  const parse = <T extends ZodTypeAny>(schema: T, v: unknown): ReturnType<T['parse']> => {
    const r = schema.safeParse(v ?? {});
    if (!r.success) throw new MockError(422, 'VALIDATION_FAILED', '请求参数不合法', r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
    return r.data;
  };
  const notFound = (what: string): never => {
    throw new MockError(404, 'NOT_FOUND', `${what}不存在`);
  };

  // ── 状态 ──
  const users = F.USERS;
  const activated = new Set(users.map((u) => u.account).filter((a) => !F.UNACTIVATED.includes(a)));
  const students = F.STUDENT_NAMES.map((name, i) => ({ id: F.studentId(i), name, class_name: F.CLASS_NAME }));
  const brief = (sid: string): D.StudentBrief => students.find((s) => s.id === sid) ?? notFound('学生');
  const levels = new Map<string, SupportLevel>(students.map((s) => [s.id, 'L0']));
  levels.set('s3', 'L1');
  levels.set('s5', 'L2');

  const checkIns: StoredCheckIn[] = [];
  const pattern: Mood[] = ['good', 'great', 'okay', 'good', 'low', 'good', 'great'];
  students.forEach((s, i) => {
    for (let d = 6; d >= 1; d--) {
      if ((i + d) % 4 === 0 && s.id !== 's3') continue; // 有些天没打卡
      const mood: Mood = s.id === 's3' ? (d <= 5 ? (d % 2 ? 'low' : 'hard') : 'okay') : pattern[(i * 3 + d * 2) % 7];
      checkIns.push({ id: id('ci'), student_id: s.id, mood, created_at: iso(-d * DAY) });
    }
  });

  const consents = new Map<string, D.ConsentItem[]>();
  const consentsOf = (uid: string) => {
    if (!consents.has(uid)) consents.set(uid, F.CONSENTS.map((c) => ({ ...c, granted_at: c.granted ? iso(-9 * DAY) : undefined })));
    return consents.get(uid)!;
  };

  const alerts: D.AlertItem[] = [
    { id: 'al1', level: 'L1', status: 'open', source: 'check_in_rule', student: brief('s3'), reason: '连续 5 天心情偏低，另有 1 次课堂观察记录', due_at: iso(20 * 60 * MIN), created_at: iso(-4 * 60 * MIN) },
    { id: 'al2', level: 'L2', status: 'converted', source: 'teacher_observation', student: brief('s5'), reason: '班主任谈话后转心理老师', due_at: iso(-2 * DAY), created_at: iso(-3 * DAY), acked_by_name: '周老师', acked_at: iso(-3 * DAY + 40 * MIN), case_id: 'ca1' },
  ];
  const observations: (D.ObservationItem & { student_id: string })[] = [
    { id: 'ob1', student_id: 's3', scene: 'break', dimensions: ['emotion', 'study'], note: '课间一个人坐在座位上，作业连续三天晚交。', next_step: 'talk_again', teacher_name: '李老师', created_at: iso(-2 * DAY) },
    { id: 'ob2', student_id: 's5', scene: 'after_class', dimensions: ['emotion', 'relationship'], note: '和同桌起了冲突后两天没说话，自述晚上睡不好。', next_step: 'refer_psychologist', teacher_name: '李老师', created_at: iso(-3 * DAY) },
  ];
  const cases: StoredCase[] = [
    {
      id: 'ca1', case_no: 'YL-2026-0001', class_id: F.CLASS_ID, student: brief('s5'), level: 'L2', status: 'following', owner_name: '周老师', created_at: iso(-3 * DAY + 60 * MIN), updated_at: iso(-1 * DAY),
      guardian_informed: true, plan: { goal: '两周内恢复规律作息，能和同桌正常相处', owner: '周老师（主责）、李老师（日常观察）', frequency: '每周一次面谈，班主任每日留意', review_at: dateOf(-11) },
      timeline: [
        { id: 'ev1', type: 'created', title: '建立个案', note: '由班主任谈话记录转入', actor_name: '周老师', at: iso(-3 * DAY + 60 * MIN) },
        { id: 'ev2', type: 'status', title: '进入跟进中', note: '已制定支持计划，已告知监护人', actor_name: '周老师', at: iso(-3 * DAY + 90 * MIN) },
        { id: 'ev3', type: 'intervention', title: '第一次面谈', note: '愿意表达，主要困扰是睡眠和同伴关系。约定睡前不看手机。', actor_name: '周老师', at: iso(-1 * DAY) },
      ],
    },
  ];
  const referrals: D.ReferralItem[] = [];
  const contents: D.ContentDetail[] = F.CONTENTS.map((c) => ({ ...c }));
  const reviewHistory = new Map<string, D.ContentReviewItem['history']>([
    ['ct11', [{ stage: 'ai', result: 'pass', reviewer: 'AI 机审', at: iso(-5 * 60 * MIN) }]],
    ['ct12', [{ stage: 'ai', result: 'pass', reviewer: 'AI 机审', at: iso(-2 * DAY) }, { stage: 'team', result: 'pass', reviewer: '平台运营', at: iso(-1 * DAY) }]],
    ['ct13', [{ stage: 'ai', result: 'reject', reviewer: 'AI 机审', reason: '缺少授权证明', at: iso(-3 * 60 * MIN) }]],
  ]);
  const posts: StoredPost[] = [
    { id: 'p1', circle_id: 'cr1', author_id: 't1', nickname: '李老师', avatar_seed: 0, is_teacher: true, content: '周五班会想聊聊“期中之后怎么调整”，大家有想说的可以先写在这里。', status: 'published', created_at: iso(-2 * DAY) },
    { id: 'p2', circle_id: 'cr1', author_id: 's4', nickname: '爱吃米线的松鼠', avatar_seed: 4, is_teacher: false, content: '数学错题本我是按“为什么错”分类的，不是按章节，复习快很多。', status: 'published', created_at: iso(-1 * DAY) },
    { id: 'p3', circle_id: 'cr1', author_id: 's6', nickname: '山那边的云', avatar_seed: 6, is_teacher: false, parent_id: 'p2', content: '学到了，我今晚试试。', status: 'published', created_at: iso(-20 * 60 * MIN) },
    { id: 'p4', circle_id: 'cr2', author_id: 's8', nickname: '晚风不晚', avatar_seed: 8, is_teacher: false, content: '背英语单词我放在等公交的时候，一次只背八个，比晚上硬背记得牢。', status: 'published', created_at: iso(-3 * DAY) },
    { id: 'p5', circle_id: 'cr2', author_id: 's9', nickname: '木头人', avatar_seed: 9, is_teacher: false, content: '有没有人和我一样，一写作文就不知道第一句写什么？', status: 'published', created_at: iso(-6 * 60 * MIN) },
    { id: 'p6', circle_id: 'cr2', author_id: 's10', nickname: '南边的星星', avatar_seed: 10, is_teacher: false, content: '我整理了一份物理公式小抄，想要的同学可以找我。', status: 'pending_review', why: 'new_user', created_at: iso(-50 * MIN) },
    { id: 'p7', circle_id: 'cr2', author_id: 's11', nickname: '夏天的知了', avatar_seed: 11, is_teacher: false, content: '某某班那个谁真的很讨厌，大家别理他。', status: 'published', why: 'reported', report_reason: 'bullying', created_at: iso(-90 * MIN) },
  ];
  const institutions: D.Institution[] = F.INSTITUTIONS.map((i) => ({ ...i }));
  const sessions = new Map<string, { student_id: string; instrument_id: string; report?: D.AssessmentReport }>();
  const aiTurns = new Map<string, number>();
  const accessLogs = new Map<string, D.PrivacyDashboard['access_logs']>([
    ['s1', [{ at: iso(-2 * DAY), viewer: '班主任', what: '心情趋势' }, { at: iso(-5 * DAY), viewer: '心理老师', what: '成长状态小问卷的结果' }]],
  ]);
  const logAccess = (sid: string, viewer: string, what: string) => accessLogs.set(sid, [{ at: iso(), viewer, what }, ...(accessLogs.get(sid) ?? [])]);

  // ── 审计（模拟用简化哈希；真实后端用 SHA-256 哈希链） ──
  const audit: D.AuditEvent[] = [];
  const hash = (s: string) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(8, '0').repeat(4);
  };
  const record = (user: F.MockUser | null, action: string, resource_type: string, result: D.AuditEvent['result'], purpose: PurposeCode | null, resource_id: string | null = null) => {
    const prev_hash = audit[0]?.hash ?? null;
    const e = { id: id('au'), actor_id: user?.id ?? null, actor_role: user?.roles[0] ?? null, action, resource_type, resource_id, purpose, result, request_id: id('req'), created_at: iso() };
    audit.unshift({ ...e, prev_hash, hash: hash((prev_hash ?? '') + JSON.stringify(e)) });
  };
  // 预置几条，审计页打开就有内容
  record(users[4], 'GET /alerts', 'alert', 'allow', 'PUR-02');
  record(users[4], 'GET /cases/:id', 'case', 'deny', 'PUR-01', 'ca1');
  record(users[5], 'POST /cases/:id/interventions', 'case', 'allow', 'PUR-02', 'ca1');

  // ── 业务辅助 ──
  const roleLabel = (u: F.MockUser) => (u.roles.includes(Role.headTeacher) ? '班主任' : u.roles.includes(Role.psychologist) ? '心理老师' : u.roles.includes(Role.schoolLeader) ? '校领导' : '老师');
  const weekOf = (sid: string) =>
    [6, 5, 4, 3, 2, 1, 0].map((d) => ({ date: dateOf(d), mood: checkIns.filter((c) => c.student_id === sid && c.created_at.slice(0, 10) === dateOf(d)).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.mood ?? null }));
  const raiseAlert = (sid: string, level: SupportLevel, source: D.AlertItem['source'], reason: string, dueMin: number): D.AlertItem => {
    const a: D.AlertItem = { id: id('al'), level, status: 'open', source, student: brief(sid), reason, due_at: iso(dueMin * MIN), created_at: iso() };
    alerts.unshift(a);
    if (LEVELS.indexOf(level) > LEVELS.indexOf(levels.get(sid) ?? 'L0')) levels.set(sid, level);
    return a;
  };
  const card = (c: D.ContentDetail): D.ContentCard => {
    const { body: _b, video_url: _v, author: _a, license: _l, reviewed_by: _r, ...rest } = c;
    return rest;
  };
  const page = <T,>(items: T[], q: Record<string, any>): D.Page<T> => {
    const limit = Math.min(Number(q.limit) || 20, 100), start = Number(q.cursor) || 0;
    return { items: items.slice(start, start + limit), next_cursor: start + limit < items.length ? String(start + limit) : null };
  };
  const postView = (p: StoredPost, uid: string): D.Post => {
    const { author_id, parent_id: _p, why: _w, report_reason: _r, ...rest } = p;
    return { ...rest, mine: author_id === uid, replies: posts.filter((x) => x.parent_id === p.id && (x.status === 'published' || x.author_id === uid)).map((x) => postView(x, uid)) };
  };
  const caseOf = (cid: string) => cases.find((c) => c.id === cid) ?? notFound('个案');
  const caseOut = (c: StoredCase): D.CaseDetail => {
    const { class_id: _c, ...rest } = c;
    return { ...rest, referral: referrals.find((r) => r.case_id === c.id) };
  };
  const touch = (c: StoredCase, type: D.CaseDetail['timeline'][number]['type'], title: string, actor: string, note?: string) => {
    c.timeline.push({ id: id('ev'), type, title, note, actor_name: actor, at: iso() });
    c.updated_at = iso();
  };
  const tokenFor = (u: F.MockUser): D.TokenPair => ({ access_token: `mock.${u.account}`, refresh_token: `mock-refresh.${u.account}`, expires_in: 900, activated: activated.has(u.account) });
  const meOf = (u: F.MockUser): D.Me => {
    const { account: _a, ...me } = u;
    return me;
  };

  // ── 59 个接口 ──
  const handlers: { [K in RouteName]: (c: Ctx) => unknown } = {
    health: () => ({ status: 'ok', data: 'mock', time: iso() }),

    authDevLogin: (c) => {
      const b = parse(D.DevLoginReq, c.body);
      const u = users.find((x) => x.account === b.account);
      if (!u) throw new MockError(401, 'UNAUTHENTICATED', '账号不存在');
      record(u, 'login', 'session', 'allow', null);
      return tokenFor(u);
    },
    authWechatLogin: (c) => {
      // 演示约定：code 以 guardian 开头视为家长，以 new 开头视为未激活的新同学
      const b = parse(D.WechatLoginReq, c.body);
      const account = b.code.startsWith('guardian') ? 'parent01' : b.code.startsWith('new') ? 'student02' : 'student01';
      return tokenFor(users.find((x) => x.account === account)!);
    },
    authPasswordLogin: (c) => {
      const b = parse(D.PasswordLoginReq, c.body);
      const u = users.find((x) => x.account === b.account);
      if (!u || b.password !== F.DEMO_PASSWORD) throw new MockError(401, 'UNAUTHENTICATED', '账号或密码不正确');
      record(u, 'login', 'session', 'allow', null);
      return tokenFor(u);
    },
    authActivate: (c) => {
      const b = parse(D.ActivateReq, c.body);
      if (b.school_code !== F.DEMO_SCHOOL_CODE) throw new MockError(422, 'VALIDATION_FAILED', '学校码不正确', '请向班主任确认学校码');
      activated.add(c.user.account);
      return meOf(c.user);
    },
    authGuardianBind: (c) => {
      const b = parse(D.GuardianBindReq, c.body);
      if (b.school_code !== F.DEMO_SCHOOL_CODE) throw new MockError(422, 'VALIDATION_FAILED', '学校码不正确');
      if (b.sms_code !== F.DEMO_SMS_CODE) throw new MockError(422, 'VALIDATION_FAILED', '验证码不正确');
      if (!c.user.children?.length) c.user.children = [brief('s2')];
      activated.add(c.user.account);
      return meOf(c.user);
    },
    me: (c) => meOf(c.user),
    mePrivacy: (c): D.PrivacyDashboard => {
      const sid = c.user.student_id ?? c.user.children?.[0]?.id ?? '';
      return { access_logs: accessLogs.get(sid) ?? [], consents: consentsOf(sid) };
    },
    consentGrant: (c) => {
      const b = parse(D.ConsentGrantReq, c.body);
      const item = consentsOf(c.user.student_id ?? c.user.children?.[0]?.id ?? '').find((x) => x.purpose === b.purpose)!;
      item.granted = true;
      item.granted_at = iso();
      return item;
    },
    consentRevoke: (c) => {
      const item = consentsOf(c.user.student_id ?? c.user.children?.[0]?.id ?? '').find((x) => x.purpose === c.params.purpose) ?? notFound('同意项');
      if (item.required) throw new MockError(409, 'CONFLICT', '基础服务的同意不能单独撤回', '如需停止使用，请联系学校注销账号');
      item.granted = false;
      item.granted_at = undefined;
      return item;
    },

    homeGet: (c): D.HomeFeed => {
      const sid = c.user.student_id!;
      const today = checkIns.filter((x) => x.student_id === sid && x.created_at.slice(0, 10) === dateOf(0)).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const actions = ['课间去操场走一圈，回来记一句感受', '给今天帮过你的人说声谢谢', '睡前把明天要带的东西放进书包', '找一位同学，问问他最近在听什么歌'];
      return {
        today_check_in: today ? { id: today.id, mood: today.mood, note: today.note, created_at: today.created_at } : null,
        week: weekOf(sid),
        micro_action: { id: 'ma' + (new Date().getDate() % actions.length), title: actions[new Date().getDate() % actions.length], minutes: 3 },
        recommended: contents.filter((x) => x.status === 'published' && !['parent', 'teacher'].includes(x.channel)).slice(0, 3).map(card),
      };
    },
    checkInCreate: (c): D.CheckIn => {
      const b = parse(D.CheckInCreateReq, c.body);
      const sid = c.user.student_id!;
      const dup = b.client_id ? checkIns.find((x) => x.student_id === sid && x.client_id === b.client_id) : undefined;
      if (dup) return { id: dup.id, mood: dup.mood, note: dup.note, created_at: dup.created_at };
      const row: StoredCheckIn = { id: id('ci'), student_id: sid, mood: b.mood, note: b.note, client_id: b.client_id, created_at: iso() };
      checkIns.push(row);
      // 规则示例：最近 5 次都偏低 → 生成一条 L1 提示（7 天内同类不重复，BR-19），等人工确认
      const last5 = checkIns.filter((x) => x.student_id === sid).slice(-5);
      const recent = alerts.some((a) => a.student.id === sid && a.source === 'check_in_rule' && Date.now() - Date.parse(a.created_at) < 7 * DAY);
      if (last5.length === 5 && last5.every((x) => x.mood === 'low' || x.mood === 'hard') && !recent) raiseAlert(sid, 'L1', 'check_in_rule', '最近 5 次心情记录都偏低', 24 * 60);
      return { id: row.id, mood: row.mood, note: row.note, created_at: row.created_at };
    },
    checkInList: (c) => page(checkIns.filter((x) => x.student_id === c.user.student_id).reverse().map(({ id, mood, note, created_at }) => ({ id, mood, note, created_at })), c.query),
    passportGet: () => F.PASSPORT,
    guardianSummary: (c): D.GuardianSummary => {
      const child = c.user.children?.[0];
      if (!child) throw new MockError(409, 'CONFLICT', '还没有绑定孩子');
      const open = consentsOf(child.id).find((x) => x.purpose === 'guardian_trend')!.granted;
      const crisis = alerts.some((a) => a.student.id === child.id && a.level === 'L3' && a.status !== 'dismissed');
      return {
        child,
        week_text: open ? '这一周孩子整体平稳，周三前后情绪有些起伏，周末回升。' : '孩子这周在正常使用平台。具体的心情记录由孩子自己决定是否向你开放。',
        suggestions: ['晚饭后留十分钟，只听不评价', '问一句“这周有什么事让你笑了”', '周末一起做一件不看手机的事'],
        task: { title: '和孩子一起走路去买一次菜，路上聊聊学校里好玩的事', minutes: 3 },
        courses: contents.filter((x) => x.status === 'published' && x.channel === 'parent').map(card),
        crisis_notice: crisis ? { text: '孩子刚才主动向老师求助，老师已经在跟进。', steps: ['先别追问原因，告诉孩子“我在”', '保持电话畅通，班主任会联系你', '今晚尽量有人陪在孩子身边'] } : null,
      };
    },

    instrumentList: (c): D.InstrumentBrief[] =>
      F.INSTRUMENTS.filter((i) => c.user.roles.includes(Role.student) || i.kind !== 'entertainment').map((i) => ({ id: i.id, code: i.code, name: i.name, kind: i.kind, minutes: i.minutes, item_count: i.items.length, intro: i.intro, disclaimer: i.disclaimer })),
    assessmentStart: (c): D.AssessmentSession => {
      const b = parse(D.AssessmentStartReq, c.body);
      const ins = F.INSTRUMENTS.find((i) => i.id === b.instrument_id) ?? notFound('问卷');
      if (ins.kind !== 'entertainment' && !consentsOf(c.user.student_id!).find((x) => x.purpose === 'assessment')!.granted) throw new MockError(403, 'CONSENT_REQUIRED', '需要先同意“成长问卷”', '可以在“我的—隐私与授权”里打开');
      const sid = id('as');
      sessions.set(sid, { student_id: c.user.student_id!, instrument_id: ins.id });
      return { id: sid, instrument: { id: ins.id, code: ins.code, name: ins.name, kind: ins.kind, minutes: ins.minutes, item_count: ins.items.length, intro: ins.intro, disclaimer: ins.disclaimer }, items: ins.items.map((text, i) => ({ id: `${ins.id}-${i + 1}`, text })), options: ins.options };
    },
    assessmentSubmit: (c): D.AssessmentReport => {
      const b = parse(D.AssessmentSubmitReq, c.body);
      const s = sessions.get(c.params.id);
      if (!s || s.student_id !== c.user.student_id) return notFound('测评');
      if (s.report) return s.report; // 幂等
      const ins = F.INSTRUMENTS.find((i) => i.id === s.instrument_id)!;
      const answered = b.answers.filter((x): x is number => x !== null);
      const score = answered.reduce((a, x) => a + x, 0), max = ins.items.length * (ins.options.length - 1), ratio = max ? score / max : 0;
      let report: D.AssessmentReport;
      const common = { session_id: c.params.id, instrument_name: ins.name, kind: ins.kind, disclaimer: ins.disclaimer, created_at: iso() };
      if (ins.kind === 'entertainment') {
        report = { ...common, headline: ratio >= 0.5 ? '你偏向“先感受，再行动”' : '你偏向“先计划，再出发”', description: '这只是一个轻松的偏好小测，换一天做结果可能就不一样。', strengths: ['了解自己做事的习惯'], suggestions: ['把结果当成和朋友聊天的话题就好'], suggest_talk: false };
        sessions.delete(c.params.id); // 娱乐量表不保存（ES-05）
        return report;
      }
      const good = ins.positive ? ratio >= 0.5 : ratio < 0.45;
      report = good
        ? { ...common, headline: '最近状态挺稳的', description: '你在学习、朋友和休息之间找到了自己的节奏。保持现在的做法就很好。', strengths: ['能照顾好自己的作息', '遇到事情愿意找人说'], suggestions: ['把管用的办法记在成长护照里', '有余力的话，帮一帮身边状态不太好的同学'], suggest_talk: false, raw_score: score }
        : { ...common, headline: '最近有些不容易', description: '这段时间你可能睡得不太好，或者压着一些事。这在这个年纪很常见，不代表你有什么问题。', strengths: ['愿意认真回答这份问卷，本身就是在照顾自己'], suggestions: ['今晚试试睡前三分钟的放松音频', '找一个你信任的人，说说最近最烦的一件事'], suggest_talk: true, raw_score: score };
      if (!good) raiseAlert(s.student_id, 'L1', 'assessment_rule', `《${ins.name}》结果提示近期状态偏低`, 24 * 60);
      s.report = report;
      return report;
    },
    assessmentReport: (c): D.AssessmentReport => {
      const s = sessions.get(c.params.id);
      if (!s?.report || (c.user.roles.includes(Role.student) && s.student_id !== c.user.student_id)) return notFound('报告');
      if (!c.user.roles.includes(Role.student)) logAccess(s.student_id, roleLabel(c.user), `《${s.report.instrument_name}》的结果`);
      return s.report;
    },

    signalCreate: (c): D.SignalCreated => {
      const b = parse(D.SignalCreateReq, c.body);
      const sid = c.user.student_id ?? b.student_id;
      if (!sid) throw new MockError(422, 'VALIDATION_FAILED', '缺少学生');
      // 一键求助按最高时限处理（BR-17）：15 分钟触达、2 小时首次介入
      const urgent = b.source === 'one_click_help';
      const a = raiseAlert(sid, urgent ? 'L3' : 'L1', b.source, urgent ? '学生主动求助' : (b.message ?? '教师上报'), urgent ? 15 : 24 * 60);
      const notified: D.SignalCreated['notified'] = [{ role: Role.headTeacher, channel: 'in_app', status: 'sent' }, { role: Role.psychologist, channel: 'in_app', status: 'sent' }];
      if (urgent) notified.push({ role: Role.schoolLeader, channel: 'sms', status: 'sent' }, { role: Role.guardian, channel: 'sms', status: 'sent' });
      return { signal_id: id('sg'), alert_id: a.id, status: 'notified', sla: { acknowledge_by: a.due_at, intervene_by: iso(120 * MIN) }, notified, next: '已经通知班主任和心理老师，他们会在 15 分钟内联系你。情况紧急的话，请直接拨打 12355。' };
    },
    alertList: (c) => page(alerts.filter((a) => !c.query.status || a.status === c.query.status), c.query),
    alertAck: (c) => {
      const a = alerts.find((x) => x.id === c.params.id) ?? notFound('提醒');
      if (a.status === 'open' || a.status === 'escalated') Object.assign(a, { status: 'acked', acked_by_name: c.user.name, acked_at: iso() });
      return a;
    },
    alertEscalate: (c) => {
      const a = alerts.find((x) => x.id === c.params.id) ?? notFound('提醒');
      a.level = LEVELS[Math.min(LEVELS.indexOf(a.level) + 1, 3)];
      a.status = 'escalated';
      levels.set(a.student.id, a.level);
      return a;
    },
    alertDismiss: (c) => {
      const b = parse(D.AlertDismissReq, c.body);
      const a = alerts.find((x) => x.id === c.params.id) ?? notFound('提醒');
      a.status = 'dismissed';
      a.reason += `（已标记不需要关注：${b.reason}）`;
      if (!alerts.some((x) => x.student.id === a.student.id && !['dismissed'].includes(x.status))) levels.set(a.student.id, 'L0');
      return a;
    },
    observationCreate: (c): D.ObservationItem => {
      const b = parse(D.ObservationCreateReq, c.body);
      brief(b.student_id);
      const o = { id: id('ob'), student_id: b.student_id, scene: b.scene, dimensions: b.dimensions, note: b.note, next_step: b.next_step, teacher_name: c.user.name, created_at: iso() };
      observations.unshift(o);
      if (b.next_step === 'refer_psychologist') raiseAlert(b.student_id, 'L1', 'teacher_observation', '班主任谈话后希望心理老师接手', 24 * 60);
      const { student_id: _s, ...out } = o;
      return out;
    },
    classBoard: (c): D.ClassBoard => {
      if (c.params.id !== F.CLASS_ID) return notFound('班级');
      if (c.user.roles.includes(Role.headTeacher) && c.user.class_id !== c.params.id) throw new MockError(403, 'FORBIDDEN', '只能查看自己的班级');
      const focus = students.filter((s) => levels.get(s.id) !== 'L0').slice(0, 5).map((s) => ({ ...s, level: levels.get(s.id)!, reason: alerts.find((a) => a.student.id === s.id && a.status !== 'dismissed')?.reason ?? '持续留意' }));
      const active = new Set(checkIns.filter((x) => Date.now() - Date.parse(x.created_at) < 7 * DAY).map((x) => x.student_id)).size;
      return {
        class_id: F.CLASS_ID, class_name: F.CLASS_NAME, student_count: students.length, focus,
        students: students.map((s) => ({ ...s, level: levels.get(s.id)! })),
        week_check_in_rate: Math.round((active / students.length) * 100) / 100,
        mood_trend: [6, 5, 4, 3, 2, 1, 0].map((d) => ({ date: dateOf(d), counts: Object.fromEntries(MOODS.map((m) => [m, checkIns.filter((x) => x.created_at.slice(0, 10) === dateOf(d) && x.mood === m).length])) as Record<Mood, number> })),
      };
    },
    studentCard: (c): D.StudentCard => {
      const s = brief(c.params.id);
      logAccess(s.id, roleLabel(c.user), '心情趋势');
      return { student: s, level: levels.get(s.id)!, mood_week: weekOf(s.id), observations: observations.filter((o) => o.student_id === s.id).map(({ student_id: _s, ...o }) => o), case_id: cases.find((x) => x.student.id === s.id && !['closed', 'dismissed'].includes(x.status))?.id, scripts: F.TALK_SCRIPTS.slice(0, 4) };
    },
    talkScripts: () => F.TALK_SCRIPTS,

    caseCreate: (c) => {
      const b = parse(D.CaseCreateReq, c.body);
      const nc: StoredCase = { id: id('ca'), case_no: `YL-2026-${String(cases.length + 1).padStart(4, '0')}`, class_id: F.CLASS_ID, student: brief(b.student_id), level: b.level, status: b.plan ? 'following' : 'pending_confirm', owner_name: c.user.name, created_at: iso(), updated_at: iso(), guardian_informed: false, plan: b.plan ?? null, timeline: [] };
      touch(nc, 'created', '建立个案', c.user.name);
      cases.unshift(nc);
      const a = alerts.find((x) => x.id === b.alert_id);
      if (a) Object.assign(a, { status: 'converted', case_id: nc.id });
      levels.set(b.student_id, b.level);
      return caseOut(nc);
    },
    caseList: (c) => page(cases.filter((x) => !c.query.status || x.status === c.query.status).map((x): D.CaseSummary => ({ id: x.id, case_no: x.case_no, student: x.student, level: x.level, status: x.status, owner_name: x.owner_name, created_at: x.created_at, updated_at: x.updated_at })), c.query),
    caseGet: (c) => {
      const x = caseOf(c.params.id);
      if (c.user.roles.includes(Role.headTeacher) && c.user.class_id !== x.class_id) throw new MockError(403, 'FORBIDDEN', '只能查看本班个案');
      logAccess(x.student.id, roleLabel(c.user), '个案记录目录');
      const out = caseOut(x);
      // 班主任只看摘要：不含咨询面谈的具体内容
      if (c.user.roles.includes(Role.headTeacher)) out.timeline = out.timeline.map((e) => (e.type === 'intervention' && e.actor_name !== c.user.name ? { ...e, note: undefined } : e));
      return out;
    },
    caseUpdate: (c) => {
      const b = parse(D.CaseUpdateReq, c.body);
      const x = caseOf(c.params.id);
      if (b.plan) x.plan = b.plan;
      if (b.status && b.status !== x.status) {
        if (!CASE_TRANSITIONS[x.status].includes(b.status)) throw new MockError(409, 'ILLEGAL_TRANSITION', '个案状态不能这样变更', `${x.status} 不能变为 ${b.status}`);
        if (b.status === 'following' && !x.plan) throw new MockError(422, 'VALIDATION_FAILED', '进入跟进前需要先填写支持计划');
        if (b.status === 'closed' && !b.close_summary) throw new MockError(422, 'VALIDATION_FAILED', '结案需要填写结案摘要');
        x.status = b.status;
        if (b.close_summary) x.close_summary = b.close_summary;
        if (b.status === 'closed' || b.status === 'dismissed') levels.set(x.student.id, 'L0');
        touch(x, 'status', { pending_confirm: '待确认', following: '进入跟进中', referred: '已转介', closed: '结案', dismissed: '关闭（误报）' }[b.status], c.user.name, b.close_summary);
      }
      return caseOut(x);
    },
    caseIntervention: (c) => {
      const b = parse(D.InterventionCreateReq, c.body);
      const x = caseOf(c.params.id);
      touch(x, 'intervention', { talk: '谈话', counseling: '面谈辅导', family: '家庭沟通', other: '其他支持' }[b.type], c.user.name, b.note + (b.outcome ? `（结果：${b.outcome}）` : ''));
      return caseOut(x);
    },
    caseRefer: (c): D.ReferralItem => {
      const b = parse(D.ReferralCreateReq, c.body);
      const x = caseOf(c.params.id);
      const inst = institutions.find((i) => i.id === b.institution_id && i.status === 'approved') ?? notFound('机构');
      if (!CASE_TRANSITIONS[x.status].includes('referred')) throw new MockError(409, 'ILLEGAL_TRANSITION', '当前状态不能发起转介');
      const ref: D.ReferralItem = { id: id('rf'), case_id: x.id, case_no: x.case_no, student: x.student, level: x.level, institution_id: inst.id, institution_name: inst.name, reason: b.reason, done_interventions: x.timeline.filter((e) => e.type === 'intervention').map((e) => e.title), assessment_summary: b.include_assessment_summary ? '近期状态问卷提示睡眠与压力偏高（仅摘要，不含原始分）' : undefined, status: 'sent', expires_at: iso(7 * DAY), created_at: iso() };
      referrals.unshift(ref);
      x.status = 'referred';
      touch(x, 'referral', `转介至 ${inst.name}`, c.user.name, b.reason);
      return ref;
    },
    referralList: (c) => {
      const isInst = c.user.roles.includes(Role.institution);
      // 机构只看转给自己的，且学生姓名脱敏
      return page(referrals.filter((r) => !isInst || r.institution_name === c.user.institution_name).map((r) => (isInst ? { ...r, student: { ...r.student, name: mask(r.student.name) } } : r)), c.query);
    },
    referralAccept: (c) => {
      const r = referrals.find((x) => x.id === c.params.id && x.institution_name === c.user.institution_name) ?? notFound('转介');
      r.status = 'accepted';
      touch(caseOf(r.case_id), 'referral', `${r.institution_name} 已确认接收`, c.user.name);
      return { ...r, student: { ...r.student, name: mask(r.student.name) } };
    },
    referralFeedback: (c) => {
      const b = parse(D.ReferralFeedbackReq, c.body);
      const r = referrals.find((x) => x.id === c.params.id && x.institution_name === c.user.institution_name) ?? notFound('转介');
      r.status = 'feedback_received';
      r.feedback = b;
      touch(caseOf(r.case_id), 'feedback', `收到 ${r.institution_name} 的反馈`, c.user.name, b.advice);
      return { ...r, student: { ...r.student, name: mask(r.student.name) } };
    },

    contentFeed: (c) => page(contents.filter((x) => x.status === 'published' && (!c.query.channel || x.channel === c.query.channel)).map(card), c.query),
    contentGet: (c) => contents.find((x) => x.id === c.params.id && (x.status === 'published' || c.user.roles.includes(Role.operator))) ?? notFound('内容'),
    contentCreate: (c) => {
      const b = parse(D.ContentCreateReq, c.body);
      // 机审示例：缺授权或含营销词即拦截，否则进入团队二审
      const hits = [/未知|缺授权|待补/.test(b.license) ? '缺少授权证明' : '', /加微信|优惠|报名费|保过/.test(b.body + b.title) ? '疑似营销内容' : ''].filter(Boolean);
      const item: D.ContentDetail = { id: id('ct'), ...b, minutes: Math.max(1, Math.round(b.body.length / 300)), status: hits.length ? 'ai_blocked' : 'team_review' };
      contents.unshift(item);
      reviewHistory.set(item.id, [{ stage: 'ai', result: hits.length ? 'reject' : 'pass', reviewer: 'AI 机审', reason: hits.join('；') || undefined, at: iso() }]);
      return item;
    },
    contentReviewQueue: (c) =>
      page(contents.filter((x) => ['team_review', 'tri_party_review', 'ai_blocked'].includes(x.status)).map((x): D.ContentReviewItem => {
        const history = reviewHistory.get(x.id) ?? [];
        const ai = history.find((h) => h.stage === 'ai');
        return { content: x, ai_result: { passed: ai?.result !== 'reject', hits: ai?.reason ? ai.reason.split('；') : [] }, history };
      }), c.query),
    contentReview: (c) => {
      const b = parse(D.ContentReviewReq, c.body);
      const x = contents.find((i) => i.id === c.params.id) ?? notFound('内容');
      const stage = x.status === 'tri_party_review' ? 'tri_party' : 'team';
      if (!['team_review', 'tri_party_review', 'ai_blocked'].includes(x.status)) throw new MockError(409, 'ILLEGAL_TRANSITION', '这条内容不在待审状态');
      if (b.result === 'reject' && !b.reason) throw new MockError(422, 'VALIDATION_FAILED', '退回需要填写原因');
      // ai_blocked 经人工复核通过后进入团队二审之后的阶段
      x.status = b.result === 'reject' ? 'rejected' : x.status === 'tri_party_review' ? 'published' : 'tri_party_review';
      if (x.status === 'published') Object.assign(x, { published_at: iso(), reviewed_by: '内容组 · 三审会签' });
      reviewHistory.set(x.id, [...(reviewHistory.get(x.id) ?? []), { stage, result: b.result, reviewer: c.user.name, reason: b.reason, at: iso() }]);
      return x;
    },
    careerCards: (c) => F.CAREER_CARDS.filter((x) => (!c.query.type || x.type === c.query.type) && (!c.query.region || x.region === c.query.region)),

    aiChat: (c): D.AiChatRes => {
      const b = parse(D.AiChatReq, c.body);
      const session_id = b.session_id ?? id('ai');
      const turn = (aiTurns.get(session_id) ?? 0) + 1;
      aiTurns.set(session_id, turn);
      if (F.CRISIS_WORDS.some((w) => b.message.includes(w))) {
        if (c.user.student_id) raiseAlert(c.user.student_id, 'L3', 'ai_guardrail', 'AI 助手对话中出现需要立即关注的表达', 15);
        return { session_id, kind: 'crisis', answer: F.AI_CRISIS_REPLY, sources: [], remind_human: true };
      }
      const hit = F.AI_FAQ.find((f) => f.keys.some((k) => b.message.includes(k)));
      const titleOf = (sid: string) => contents.find((x) => x.id === sid)?.title ?? F.CAREER_CARDS.find((x) => x.id === sid)?.title ?? sid;
      return { session_id, kind: 'answer', answer: hit?.answer ?? F.AI_FALLBACK, sources: (hit?.sources ?? []).map((s) => ({ content_id: s, title: titleOf(s) })), remind_human: turn % 5 === 0 };
    },

    circleList: (c) => (c.user.roles.includes(Role.student) && !consentsOf(c.user.student_id!).find((x) => x.purpose === 'community')!.granted ? [] : F.CIRCLES),
    postList: (c) => page(posts.filter((p) => p.circle_id === c.params.id && !p.parent_id && (p.status === 'published' || p.author_id === c.user.id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((p) => postView(p, c.user.id)), c.query),
    postCreate: (c): D.Post => {
      const b = parse(D.PostCreateReq, c.body);
      if (!F.CIRCLES.some((x) => x.id === c.params.id)) return notFound('圈子');
      if (F.POST_BANNED.some((re) => re.test(b.content))) throw new MockError(422, 'VALIDATION_FAILED', '内容里不能有联系方式或外部链接', '这是为了保护你和其他同学');
      const isStudent = c.user.roles.includes(Role.student);
      const mine = posts.filter((p) => p.author_id === c.user.id).length;
      const p: StoredPost = { id: id('p'), circle_id: c.params.id, author_id: c.user.id, parent_id: b.parent_id, nickname: isStudent ? (c.user.nickname ?? '同学') : c.user.name, avatar_seed: Number(c.user.id.replace(/\D/g, '')) || 0, is_teacher: !isStudent, content: b.content, status: isStudent && mine < 3 ? 'pending_review' : 'published', why: isStudent && mine < 3 ? 'new_user' : undefined, created_at: iso() };
      posts.push(p);
      if (F.CRISIS_WORDS.some((w) => b.content.includes(w)) && c.user.student_id) raiseAlert(c.user.student_id, 'L3', 'ai_guardrail', '成长圈发言中出现需要立即关注的表达', 15);
      return postView(p, c.user.id);
    },
    postReport: (c) => {
      const b = parse(D.PostReportReq, c.body);
      const p = posts.find((x) => x.id === c.params.id) ?? notFound('帖子');
      Object.assign(p, { why: 'reported', report_reason: b.reason });
      return { ok: true };
    },
    moderationQueue: (c) => page(posts.filter((p) => p.why && (p.status === 'pending_review' || (p.why === 'reported' && p.status === 'published'))).map((p): D.ModerationItem => ({ post: postView(p, c.user.id), circle_name: F.CIRCLES.find((x) => x.id === p.circle_id)?.name ?? '', why: p.why!, report_reason: p.report_reason })), c.query),
    postModerate: (c) => {
      const b = parse(D.PostModerateReq, c.body);
      const p = posts.find((x) => x.id === c.params.id) ?? notFound('帖子');
      p.status = b.action === 'approve' ? 'published' : b.action === 'reject' ? 'rejected' : 'removed';
      p.why = undefined;
      return postView(p, c.user.id);
    },

    institutionList: () => institutions.filter((i) => i.status === 'approved').map(({ license_no: _l, contact_name: _c, ...i }) => i),
    institutionApply: (c) => {
      const b = parse(D.InstitutionApplyReq, c.body);
      const { contact_phone: _p, ...rest } = b;
      const inst: D.Institution = { id: id('in'), ...rest, status: 'applied' };
      institutions.push(inst);
      return inst;
    },
    institutionApplications: () => institutions,
    institutionReview: (c) => {
      const b = parse(D.InstitutionReviewReq, c.body);
      const i = institutions.find((x) => x.id === c.params.id) ?? notFound('机构');
      i.status = b.approve ? 'approved' : 'rejected';
      return i;
    },

    orgTree: () => F.ORG_TREE,
    regionReport: (): D.RegionReport => ({ ...F.REGION_REPORT, updated_at: iso(-3 * 60 * MIN) }),
    supervisionList: () => F.SUPERVISIONS,
    tenantList: () => F.TENANTS,
    auditEvents: (c) => page(audit, c.query),
  };

  /** 哪些读操作属于敏感读取、需要留审计（写操作全部留） */
  const SENSITIVE_READS: RouteName[] = ['alertList', 'classBoard', 'studentCard', 'caseList', 'caseGet', 'assessmentReport', 'referralList', 'regionReport'];

  function call(name: RouteName, req: MockRequest = {}): MockResponse {
    const route: RouteDef = Routes[name];
    let user: F.MockUser | null = null;
    const action = `${route.method} ${route.path}`;
    try {
      if (route.roles !== 'public') {
        const account = req.token?.replace(/^Bearer\s+/i, '').replace(/^mock\./, '');
        user = users.find((u) => u.account === account) ?? null;
        if (!user) throw new MockError(401, 'UNAUTHENTICATED', '未登录或登录已过期');
        if (route.roles.length && !route.roles.some((r) => user!.roles.includes(r))) throw new MockError(403, 'FORBIDDEN', '当前角色无权访问');
        if (route.purpose && (req.purpose !== route.purpose || !user.purposes.includes(route.purpose))) throw new MockError(403, 'PURPOSE_DENIED', '目的码不允许', `该接口要求 ${route.purpose}，当前为 ${req.purpose ?? '未携带'}`);
      }
      const body = handlers[name]({ user: user as F.MockUser, params: req.params ?? {}, query: (req.query ?? {}) as Record<string, any>, body: req.body });
      if (user && (route.method !== 'GET' || SENSITIVE_READS.includes(name))) record(user, action, route.path.split('/')[1], 'allow', route.purpose ?? null, req.params?.id ?? null);
      return { status: route.method === 'POST' && !/ack|escalate|dismiss|accept|review|moderate|report|login|submit|chat|activate|bind/.test(route.path) ? 201 : 200, body };
    } catch (e) {
      if (!(e instanceof MockError)) throw e;
      if (e.status === 403) record(user, action, route.path.split('/')[1], 'deny', (req.purpose as PurposeCode) ?? null, req.params?.id ?? null);
      const problem: D.Problem = { type: `https://errors.yunling.local/${e.code.toLowerCase().replace(/_/g, '-')}`, title: e.message, status: e.status, detail: e.detail, code: e.code, request_id: id('req') };
      return { status: e.status, body: problem };
    }
  }

  return { call };
}

export type Mock = ReturnType<typeof createMock>;
