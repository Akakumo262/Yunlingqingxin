import type { ZodTypeAny } from 'zod';
import { FiveEdu, MOODS, Mood, MyActivityStatus, NoticeKind, PurposeCode, Role, SignalSource, SupportLevel } from '../enums';
import type * as D from '../dto';
import type * as M from '../dto-more';
import * as F from './data';

/**
 * 模拟后端的状态与公共能力（纯内存）。core.ts / more.ts 里的每个接口处理函数都只通过这里读写数据。
 * 这里也是“联动”的中心：notify() 把一件事通知到相关的每个角色，raiseAlert() 按通知矩阵分发提醒，
 * stamp() 把活动、小行动写进成长护照。真实后端对应的是通知服务、规则引擎和领域事件。
 */

export class MockError extends Error {
  constructor(public status: number, public code: D.ErrorCode, title: string, public detail?: string) {
    super(title);
  }
}
export interface Ctx {
  user: F.MockUser;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
}
export type Handler = (c: Ctx) => unknown;

export const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
export const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();
export const dateOf = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10);
export const mask = (name: string) => name.slice(0, 1) + '*';
const LEVELS: SupportLevel[] = ['L0', 'L1', 'L2', 'L3'];

type StoredCheckIn = D.CheckIn & { student_id: string; client_id?: string };
export type StoredPost = Omit<D.Post, 'mine' | 'replies' | 'liked' | 'like_count'> & {
  author_id: string; parent_id?: string; why?: D.ModerationItem['why']; report_reason?: D.ModerationItem['report_reason']; base_likes: number;
};
export type StoredCase = D.CaseDetail & { class_id: string };
export interface StoredActivity extends M.ActivityDetail {
  code: string;
  base_signed: number;
  owner_roles: Role[];
  signups: Map<string, { status: MyActivityStatus; reflection?: string; witnessed: boolean }>;
}

export function createState() {
  let seq = 0;
  /** 运行期生成的 id 带短横线，不会和种子数据的固定 id（s1、ct1、p5……）冲突，也不含时间，重放可复现 */
  const id = (p: string) => `${p}-${++seq}`;
  const parse = <T extends ZodTypeAny>(schema: T, v: unknown): ReturnType<T['parse']> => {
    const r = schema.safeParse(v ?? {});
    if (!r.success) throw new MockError(422, 'VALIDATION_FAILED', '请求参数不合法', r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
    return r.data;
  };
  const notFound = (what: string): never => {
    throw new MockError(404, 'NOT_FOUND', `${what}不存在`);
  };

  // ── 人 ──
  const users: F.MockUser[] = F.USERS.map((u) => ({ ...u, children: u.children ? [...u.children] : undefined }));
  const activated = new Set(users.map((u) => u.account).filter((a) => !F.UNACTIVATED.includes(a)));
  const students = F.STUDENT_NAMES.map((name, i) => ({ id: F.studentId(i), name, class_name: F.CLASS_NAME, nickname: F.NICKNAMES[i] ?? `同学${i + 1}` }));
  const brief = (sid: string): D.StudentBrief => {
    const s = students.find((x) => x.id === sid) ?? notFound('学生');
    return { id: s.id, name: s.name, class_name: s.class_name };
  };
  const byRole = (role: Role) => users.filter((u) => u.roles.includes(role)).map((u) => u.id);
  const guardiansOf = (sid: string) => users.filter((u) => u.children?.some((c) => c.id === sid)).map((u) => u.id);
  const roleLabel = (u: F.MockUser) => (u.roles.includes(Role.headTeacher) ? '班主任' : u.roles.includes(Role.psychologist) ? '心理老师' : u.roles.includes(Role.schoolLeader) ? '校领导' : '老师');
  const studentIdOf = (u: F.MockUser) => u.student_id ?? u.children?.[0]?.id ?? '';

  // ── 通知：一件事通知到相关的每个人 ──
  const notices = new Map<string, M.Notice[]>();
  const notify = (uids: string[], kind: NoticeKind, title: string, body: string, link?: M.Notice['link'], offsetMs = 0) => {
    for (const uid of new Set(uids)) notices.set(uid, [{ id: id('n'), kind, title, body, link, read: false, created_at: iso(offsetMs) }, ...(notices.get(uid) ?? [])]);
  };

  // ── 心情记录 ──
  const levels = new Map<string, SupportLevel>(students.map((s) => [s.id, 'L0']));
  const checkIns: StoredCheckIn[] = [];
  const pattern: Mood[] = ['good', 'great', 'okay', 'good', 'low', 'good', 'great', 'good', 'okay'];
  students.forEach((s, i) => {
    for (let d = 6; d >= 1; d--) {
      if ((i * 5 + d * 3) % 7 < 2 && s.id !== 's3') continue; // 有些天没记录，这很正常
      const mood: Mood = s.id === 's3' ? (d <= 5 ? (d % 2 ? 'low' : 'hard') : 'okay') : pattern[(i * 3 + d * 2) % pattern.length];
      checkIns.push({ id: id('ci'), student_id: s.id, mood, created_at: iso(-d * DAY + (i % 5) * HOUR) });
    }
  });
  const weekOf = (sid: string) =>
    [6, 5, 4, 3, 2, 1, 0].map((d) => ({
      date: dateOf(d),
      mood: checkIns.filter((c) => c.student_id === sid && c.created_at.slice(0, 10) === dateOf(d)).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.mood ?? null,
    }));

  // ── 同意、访问记录 ──
  const consents = new Map<string, D.ConsentItem[]>();
  const consentsOf = (sid: string) => {
    if (!consents.has(sid)) consents.set(sid, F.CONSENTS.map((c) => ({ ...c, granted_at: c.granted ? iso(-9 * DAY) : undefined })));
    return consents.get(sid)!;
  };
  const consented = (sid: string, purpose: D.ConsentItem['purpose']) => !!consentsOf(sid).find((x) => x.purpose === purpose)?.granted;
  const accessLogs = new Map<string, D.PrivacyDashboard['access_logs']>([
    ['s1', [{ at: iso(-2 * DAY), viewer: '班主任', what: '心情趋势' }, { at: iso(-5 * DAY), viewer: '心理老师', what: '成长状态小问卷的结果' }]],
  ]);
  const logAccess = (sid: string, viewer: string, what: string) => accessLogs.set(sid, [{ at: iso(), viewer, what }, ...(accessLogs.get(sid) ?? [])]);

  // ── 提醒：按通知矩阵分发（L1 班主任；L2 + 心理教师；L3 + 校领导 + 家长） ──
  const alerts: D.AlertItem[] = [
    { id: 'al1', level: 'L1', status: 'open', source: 'check_in_rule', student: brief('s3'), reason: '连续 5 天心情偏低，另有 1 次课堂观察记录', due_at: iso(20 * HOUR), created_at: iso(-4 * HOUR) },
    { id: 'al2', level: 'L2', status: 'converted', source: 'teacher_observation', student: brief('s5'), reason: '班主任谈话后转心理老师', due_at: iso(-2 * DAY), created_at: iso(-3 * DAY), acked_by_name: '周老师', acked_at: iso(-3 * DAY + 40 * MIN), case_id: 'ca1' },
  ];
  const helpTargets = new Map<string, D.SignalCreateReq['contact_preference'][number]>();
  const raiseAlert = (sid: string, level: SupportLevel, source: SignalSource, reason: string, dueMin: number): D.AlertItem => {
    const a: D.AlertItem = { id: id('al'), level, status: 'open', source, student: brief(sid), reason, due_at: iso(dueMin * MIN), created_at: iso() };
    alerts.unshift(a);
    if (LEVELS.indexOf(level) > LEVELS.indexOf(levels.get(sid) ?? 'L0')) levels.set(sid, level);
    const staff = [...byRole(Role.headTeacher), ...(level !== 'L1' || source !== 'check_in_rule' ? byRole(Role.psychologist) : []), ...(level === 'L3' ? byRole(Role.schoolLeader) : [])];
    notify(staff, 'alert', level === 'L3' ? '有同学需要你现在回应' : '有一条需要你留意的提醒', `${a.student.name}：${reason}`, { page: 'today', id: a.id });
    if (level === 'L3') notify(guardiansOf(sid), 'help', '孩子刚才向老师求助了', '老师已经在跟进。请保持电话畅通，先别追问原因。', { page: 'summary' });
    return a;
  };
  const observations: (D.ObservationItem & { student_id: string })[] = [
    { id: 'ob1', student_id: 's3', scene: 'break', dimensions: ['emotion', 'study'], note: '课间一个人坐在座位上，作业连续三天晚交。', next_step: 'talk_again', teacher_name: '李老师', created_at: iso(-2 * DAY) },
    { id: 'ob2', student_id: 's5', scene: 'after_class', dimensions: ['emotion', 'relationship'], note: '和同桌起了冲突后两天没说话，自述晚上睡不好。', next_step: 'refer_psychologist', teacher_name: '李老师', created_at: iso(-3 * DAY) },
    { id: 'ob3', student_id: 's12', scene: 'break', dimensions: ['study'], note: '最近数学作业正确率明显提高，主动来问了两次题。', next_step: 'keep_watching', teacher_name: '李老师', created_at: iso(-4 * DAY) },
  ];

  // ── 个案、转介、紧急访问 ──
  const cases: StoredCase[] = [
    {
      id: 'ca1', case_no: 'YL-2026-0001', class_id: F.CLASS_ID, student: brief('s5'), level: 'L2', status: 'following', owner_name: '周老师', created_at: iso(-3 * DAY + HOUR), updated_at: iso(-1 * DAY),
      guardian_informed: true, plan: { goal: '两周内恢复规律作息，能和同桌正常相处', owner: '周老师（主责）、李老师（日常观察）', frequency: '每周一次面谈，班主任每日留意', review_at: dateOf(-11) },
      timeline: [
        { id: 'ev1', type: 'created', title: '建立个案', note: '由班主任谈话记录转入', actor_name: '周老师', at: iso(-3 * DAY + HOUR) },
        { id: 'ev2', type: 'status', title: '进入跟进中', note: '已制定支持计划，已告知监护人', actor_name: '周老师', at: iso(-3 * DAY + 90 * MIN) },
        { id: 'ev3', type: 'intervention', title: '面谈辅导', note: '愿意表达，主要困扰是睡眠和同伴关系。约定睡前不看手机。', actor_name: '周老师', at: iso(-1 * DAY) },
      ],
    },
  ];
  const referrals: D.ReferralItem[] = [];
  const grants: M.AccessGrant[] = [
    { id: 'ag1', case_id: 'ca1', case_no: 'YL-2026-0001', user_name: '周老师', reason: '学生深夜求助，需立即查看既往干预记录以判断是否联系监护人与医院。', created_at: iso(-3 * DAY + 20 * MIN), expires_at: iso(-3 * DAY + 140 * MIN), reviewed: true, reviewed_by: '审计员' },
  ];

  // ── 内容 ──
  const contents: D.ContentDetail[] = F.CONTENTS.map((c) => ({ ...c }));
  const reviewHistory = new Map<string, D.ContentReviewItem['history']>([
    ['ct11', [{ stage: 'ai', result: 'pass', reviewer: 'AI 机审', at: iso(-5 * HOUR) }]],
    ['ct12', [{ stage: 'ai', result: 'pass', reviewer: 'AI 机审', at: iso(-2 * DAY) }, { stage: 'team', result: 'pass', reviewer: '平台运营', at: iso(-1 * DAY) }]],
    ['ct13', [{ stage: 'ai', result: 'reject', reviewer: 'AI 机审', reason: '缺少授权证明', at: iso(-3 * HOUR) }]],
  ]);
  const favorites = new Map<string, Set<string>>([['s1', new Set(['psy14', 'lrn01', 'car01'])]]);
  const completed = new Map<string, Set<string>>([['s1', new Set(['ct1', 'psy14', 'lrn01'])]]);
  const setOf = (m: Map<string, Set<string>>, uid: string) => {
    if (!m.has(uid)) m.set(uid, new Set());
    return m.get(uid)!;
  };
  const card = (c: D.ContentDetail, uid?: string): D.ContentCard => {
    const { body: _b, video_url: _v, author: _a, license: _l, reviewed_by: _r, takeaways: _t, related: _rel, ...rest } = c;
    return uid ? { ...rest, favorited: setOf(favorites, uid).has(c.id), completed: setOf(completed, uid).has(c.id) } : rest;
  };
  const published = (forStudent = true) => contents.filter((x) => x.status === 'published' && (!forStudent || !['parent', 'teacher'].includes(x.channel)));
  const pushes: { id: string; class_id: string; content_id: string; message?: string; teacher_name: string; created_at: string }[] = [
    { id: 'pu1', class_id: F.CLASS_ID, content_id: 'lrn12', message: '下周月考，考前可以看看这篇。', teacher_name: '李老师', created_at: iso(-1 * DAY) },
  ];

  // ── 搜索：按两个字一组去匹配标题、标签、正文 ──
  const grams = (q: string) => {
    const t = q.replace(/[\s，。？！、,.?!“”"'：:；;（）()]/g, '');
    const g = new Set<string>();
    for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2));
    if (t.length === 1) g.add(t);
    return [...g];
  };
  const score = (q: string, title: string, tags: string[], text: string) =>
    grams(q).reduce((a, g) => a + (title.includes(g) ? 4 : 0) + (tags.some((t) => t.includes(g)) ? 3 : 0) + (text.includes(g) ? 1 : 0), 0) + tags.filter((t) => q.includes(t)).length * 5;
  const rank = <T,>(q: string, items: T[], pick: (x: T) => [string, string[], string]) =>
    items.map((x) => ({ x, s: score(q, ...pick(x)) })).filter((r) => r.s >= 4).sort((a, b) => b.s - a.s).map((r) => r.x);

  // ── 成长圈 ──
  const authorOf = (who: number | string) => (typeof who === 'number' ? { id: students[who].id, nickname: students[who].nickname, seed: who, teacher: false } : { id: who, nickname: F.STAFF_AUTHORS[who].name, seed: F.STAFF_AUTHORS[who].seed, teacher: true });
  const posts: StoredPost[] = [];
  F.POSTS.forEach(([circle, who, content, hoursAgo, replies], i) => {
    const a = authorOf(who), pid = `p${i + 1}`;
    posts.push({ id: pid, circle_id: circle, author_id: a.id, nickname: a.nickname, avatar_seed: a.seed, is_teacher: a.teacher, content, status: 'published', created_at: iso(-hoursAgo * HOUR), base_likes: (i * 7 + 3) % 23 });
    (replies ?? []).forEach(([rw, text], j) => {
      const ra = authorOf(rw);
      posts.push({ id: `${pid}r${j + 1}`, circle_id: circle, parent_id: pid, author_id: ra.id, nickname: ra.nickname, avatar_seed: ra.seed, is_teacher: ra.teacher, content: text, status: 'published', created_at: iso(-hoursAgo * HOUR + (j + 1) * 25 * MIN), base_likes: 0 });
    });
  });
  // 审核队列里预置两条：一条新同学的待审帖，一条被举报的帖子
  posts.push({ id: 'pm1', circle_id: 'cr2', author_id: 's10', nickname: students[9].nickname, avatar_seed: 9, is_teacher: false, content: '我整理了一份物理公式小抄，想要的同学可以在这里说一声。', status: 'pending_review', why: 'new_user', created_at: iso(-50 * MIN), base_likes: 0 });
  posts.push({ id: 'pm2', circle_id: 'cr2', author_id: 's11', nickname: students[10].nickname, avatar_seed: 10, is_teacher: false, content: '某某班那个谁真的很讨厌，大家别理他。', status: 'published', why: 'reported', report_reason: 'bullying', created_at: iso(-90 * MIN), base_likes: 0 });
  const likes = new Map<string, Set<string>>();
  const postView = (p: StoredPost, uid: string): D.Post => {
    const { author_id, parent_id: _p, why: _w, report_reason: _r, base_likes, ...rest } = p;
    const liked = setOf(likes, p.id);
    return {
      ...rest, mine: author_id === uid, like_count: base_likes + liked.size, liked: liked.has(uid),
      replies: posts.filter((x) => x.parent_id === p.id && (x.status === 'published' || x.author_id === uid)).map((x) => postView(x, uid)),
    };
  };

  // ── 测评 ──
  const sessions = new Map<string, { student_id: string; instrument_id: string; report?: D.AssessmentReport }>();
  const seedReport = (sid: string, student: string, ins: string, name: string, headline: string, talk: boolean, days: number, raw: number) =>
    sessions.set(sid, { student_id: student, instrument_id: ins, report: { session_id: sid, instrument_name: name, kind: ins === 'ins2' || ins === 'ins6' ? 'screening' : 'development', headline, description: '', strengths: [], suggestions: [], disclaimer: '', suggest_talk: talk, raw_score: raw, created_at: iso(-days * DAY) } });
  seedReport('as-seed1', 's1', 'ins1', '成长状态小问卷', '最近状态挺稳的', false, 5, 17);
  seedReport('as-seed2', 's3', 'ins2', '睡眠与压力小问卷', '最近有些不容易', true, 3, 13);
  seedReport('as-seed3', 's7', 'ins4', '学习习惯小问卷', '最近状态挺稳的', false, 6, 19);
  seedReport('as-seed4', 's15', 'ins6', '考试心情小问卷', '最近有些不容易', true, 2, 12);
  seedReport('as-seed5', 's21', 'ins5', '和同学相处小问卷', '最近状态挺稳的', false, 8, 16);
  const aiTurns = new Map<string, number>();

  // ── 成长护照 ──
  const passports = new Map<string, D.Passport>([['s1', { ...F.PASSPORT, stamps: F.PASSPORT.stamps.map((s) => ({ ...s })), records: F.PASSPORT.records.map((r) => ({ ...r })), strengths: [...F.PASSPORT.strengths] }]]);
  const passportOf = (sid: string): D.Passport => {
    if (!passports.has(sid)) passports.set(sid, { strengths: [], stamps: (['moral', 'intellectual', 'physical', 'aesthetic', 'labor'] as FiveEdu[]).map((edu) => ({ edu, count: 0 })), records: [], messages: [] });
    return passports.get(sid)!;
  };
  /** 盖一枚印记：活动反思、今日小行动、自己添加的记录都走这里 */
  const stamp = (sid: string, edu: FiveEdu, title: string, extra: { reflection?: string; witness?: string; source: 'self' | 'activity' | 'action' }) => {
    const p = passportOf(sid);
    p.stamps.find((s) => s.edu === edu)!.count += 1;
    p.records.unshift({ id: id('pr'), edu, title, date: dateOf(0), ...extra });
    return p;
  };

  // ── 活动 ──
  const activities: StoredActivity[] = F.ACTIVITIES.map((a) => {
    const start = Date.now() + a.day * DAY, startAt = new Date(new Date(start).setHours(a.hour, 0, 0, 0));
    return {
      id: a.id, edu: a.edu, title: a.title, organizer: a.organizer, organizer_type: a.organizer_type, place: a.place, capacity: a.capacity, audience: a.audience,
      start_at: startAt.toISOString(), end_at: new Date(startAt.getTime() + a.hours * HOUR).toISOString(), signed_count: 0, status: 'open',
      intro: a.intro, schedule: a.schedule, bring: a.bring, safety: a.safety, code: a.code, base_signed: a.signed,
      owner_roles: a.organizer_type === 'school' ? [Role.headTeacher, Role.psychologist] : a.organizer_type === 'committee' ? [Role.committee] : [Role.committee, Role.community],
      signups: new Map(),
    };
  });
  // 预置：青禾报了三场、完成过一场；班里几位同学也有报名，供老师端名单展示
  const A = (aid: string) => activities.find((a) => a.id === aid)!;
  A('a04').signups.set('s1', { status: 'signed', witnessed: false });
  A('a13').signups.set('s1', { status: 'checked_in', witnessed: false });
  A('a15').signups.set('s1', { status: 'reflected', reflection: '把书按颜色排完才发现应该按类别排，又重排了一遍。', witnessed: true });
  ['s2', 's4', 's6', 's9', 's12', 's17', 's20'].forEach((s, i) => A('a01').signups.set(s, { status: 'signed', witnessed: false }));
  ['s2', 's7', 's8', 's13', 's16', 's23'].forEach((s) => A('a02').signups.set(s, { status: 'signed', witnessed: false }));
  ['s4', 's8', 's11', 's19'].forEach((s, i) => A('a15').signups.set(s, { status: i < 3 ? 'reflected' : 'checked_in', reflection: i < 3 ? ['原来班里有这么多我没看过的书。', '修了三本掉页的书，胶水粘了一手。', '登记的时候发现少了两本，后来在讲台下面找到了。'][i] : undefined, witnessed: i === 0 }));
  const activityStatus = (a: StoredActivity): M.ActivityCard['status'] => {
    const now = Date.now(), signed = a.base_signed + a.signups.size;
    return now > Date.parse(a.end_at) ? 'ended' : now >= Date.parse(a.start_at) ? 'ongoing' : signed >= a.capacity ? 'full' : 'open';
  };
  const activityCard = (a: StoredActivity, u?: F.MockUser): M.ActivityCard => ({
    id: a.id, edu: a.edu, title: a.title, organizer: a.organizer, organizer_type: a.organizer_type, start_at: a.start_at, end_at: a.end_at, place: a.place, capacity: a.capacity,
    signed_count: Math.min(a.capacity, a.base_signed + a.signups.size), status: activityStatus(a), audience: a.audience,
    my_status: u?.student_id ? (a.signups.get(u.student_id)?.status ?? 'none') : undefined,
  });
  const activityDetail = (a: StoredActivity, u: F.MockUser): M.ActivityDetail => ({
    ...activityCard(a, u), intro: a.intro, schedule: a.schedule, bring: a.bring, safety: a.safety,
    check_in_code: a.owner_roles.some((r) => u.roles.includes(r)) ? a.code : undefined,
    my_reflection: u.student_id ? a.signups.get(u.student_id)?.reflection : undefined,
  });

  // ── 学习计划、小行动 ──
  const planProgress = new Map<string, Map<string, Set<number>>>([['s1', new Map([['pl1', new Set([1, 2, 3])]])]]);
  const planView = (p: F.PlanSeed, uid: string): M.LearningPlan => {
    const mine = planProgress.get(uid)?.get(p.id);
    return {
      id: p.id, title: p.title, intro: p.intro, days: p.steps.length, minutes_per_day: p.minutes_per_day, channel: p.channel,
      steps: p.steps.map(([title, action, content_id], i) => ({ day: i + 1, title, action, content_id })),
      joined: !!mine, done_days: mine ? [...mine].sort((a, b) => a - b) : [], joined_count: p.joined_count + (mine ? 1 : 0),
    };
  };
  const microDone = new Map<string, Set<string>>();
  const todayAction = () => {
    const i = Math.floor(Date.now() / DAY) % F.MICRO_ACTIONS.length;
    return { id: `ma${i}`, ...F.MICRO_ACTIONS[i] };
  };

  // ── 预约、沟通单 ──
  const slots: M.Slot[] = [];
  for (let d = 1; slots.length < 8; d++) {
    const day = new Date(Date.now() + d * DAY);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    for (const time of ['12:30—13:00', '16:40—17:10']) slots.push({ id: `sl${slots.length + 1}`, date: day.toISOString().slice(0, 10), time, counselor_name: '周老师', place: '综合楼二楼 心理辅导室', available: true });
  }
  slots[1].available = false;
  const appointments: (M.Appointment & { student_id: string })[] = [
    { id: 'ap1', slot: slots[1], student_id: 's8', topic: 'peer', note: '想聊聊和同桌的事', status: 'confirmed', created_at: iso(-1 * DAY) },
  ];
  const notes: (M.HomeNote & { guardian_ids: string[]; teacher_id: string })[] = [
    { id: 'no1', student: brief('s1'), from_name: '李老师', kind: 'praise', text: '青禾这周主动帮同学讲了一道数学题，讲得很清楚。想让您也知道。', created_at: iso(-1 * DAY), guardian_ids: ['g1'], teacher_id: 't1' },
    { id: 'no2', student: brief('s3'), from_name: '李老师', kind: 'care', text: '小满最近上课容易走神。想了解一下他在家里睡觉、吃饭有没有变化。', created_at: iso(-2 * DAY), read_at: iso(-2 * DAY + 3 * HOUR), reply: { text: '老师好，他这几天确实睡得晚，我们在外地，晚上打电话多问问。', at: iso(-2 * DAY + 4 * HOUR) }, guardian_ids: [], teacher_id: 't1' },
  ];
  const guardianTasksDone = new Set<string>();

  // ── 机构、规则、公告、导出、反馈 ──
  const institutions: D.Institution[] = F.INSTITUTIONS.map((i) => ({ ...i }));
  const rules: M.RiskRule[] = F.RISK_RULES.map((r) => ({ ...r }));
  const announcements: M.Announcement[] = F.ANNOUNCEMENTS.map(({ daysAgo, ...a }) => ({ ...a, created_at: iso(-daysAgo * DAY) }));
  const exportsList: M.ExportJob[] = [
    { id: 'ex1', scope: 'class_report', requester_name: '李老师', requester_role: Role.headTeacher, reason: '家长会前打印本班本月的活动参与情况（不含个人心理数据）。', status: 'pending', watermark: '李老师 · 待批准', created_at: iso(-5 * HOUR) },
    { id: 'ex2', scope: 'region_report', requester_name: '教体局德育科', requester_role: Role.eduAdmin, reason: '提交市联席会议的月度报告。', status: 'approved', watermark: `教体局德育科 · ${dateOf(2)}`, expires_at: iso(-1 * DAY), downloads_left: 1, created_at: iso(-2 * DAY) },
  ];
  const feedback: { user_id: string; kind: string; text: string; at: string }[] = [];
  let rosterImported = 0;

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
  const T1 = users.find((u) => u.id === 't1')!, T2 = users.find((u) => u.id === 't2')!;
  record(T1, 'GET /alerts', 'alerts', 'allow', 'PUR-02');
  record(T1, 'GET /assessment-sessions/:id/report', 'assessment-sessions', 'deny', 'PUR-01', 'as-seed2');
  record(T2, 'POST /cases/:id/interventions', 'cases', 'allow', 'PUR-02', 'ca1');
  record(T2, 'POST /cases/:id/break-glass', 'cases', 'allow', 'PUR-02', 'ca1');

  // ── 预置的通知，让各角色一登录就有内容 ──
  notify(['s1'], 'content', '李老师给全班推荐了一篇内容', '《考试时一紧张就大脑空白》：下周月考，考前可以看看这篇。', { page: 'content', id: 'lrn12' }, -1 * DAY);
  notify(['s1'], 'activity', '扎染体验课后天开始', '周四 14:00，美术教室。记得穿不怕染色的旧衣服。', { page: 'activity', id: 'a04' }, -3 * HOUR);
  notify(['s1'], 'circle', '有人回复了你', '“歪掉的云最好看。”', { page: 'circle', id: 'cr5' }, -14 * HOUR);
  notify(['g1'], 'note', '李老师发来一张沟通单', '青禾这周主动帮同学讲了一道数学题……', { page: 'notes' }, -1 * DAY);
  notify(['g1'], 'activity', '环湖健步走开始报名', '欢迎和孩子一起参加。校外活动需要您确认后才算报名成功。', { page: 'summary' }, -2 * DAY);
  notify(['t1'], 'alert', '有一条需要你留意的提醒', '小满：连续 5 天心情偏低，另有 1 次课堂观察记录', { page: 'today', id: 'al1' }, -4 * HOUR);
  notify(['t1'], 'note', '小满的家长回复了沟通单', '“他这几天确实睡得晚……”', { page: 'notes' }, -2 * DAY + 4 * HOUR);
  notify(['t2'], 'appointment', '有同学预约了面谈', '晚风预约了明天 16:40 的时间，想聊“和同学的事”。', { page: 'appointments' }, -1 * DAY);
  notify(['t3', 'e1'], 'system', '有一条导出申请等你批准', '李老师申请导出“班级周报”。', { page: 'exports' }, -5 * HOUR);
  notify(['o1'], 'content', '有 3 条内容等待审核', '其中 1 条被机审拦截，需要人工复核。', { page: 'contents' }, -3 * HOUR);
  notify(['i1'], 'system', '欢迎使用协作端', '学校发来转介时，会出现在“转介收件箱”。', { page: 'referrals' }, -6 * DAY);

  return {
    id, parse, notFound, users, activated, students, brief, byRole, guardiansOf, roleLabel, studentIdOf, notices, notify, levels, checkIns, weekOf, consentsOf, consented,
    accessLogs, logAccess, alerts, helpTargets, raiseAlert, observations, cases, referrals, grants, contents, reviewHistory, favorites, completed, setOf, card, published, pushes,
    score, rank, posts, likes, postView, sessions, aiTurns, passportOf, stamp, activities, activityCard, activityDetail, activityStatus, planProgress, planView, microDone, todayAction,
    slots, appointments, notes, guardianTasksDone, institutions, rules, announcements, exportsList, feedback, audit, record,
    get rosterImported() { return rosterImported; }, set rosterImported(v: number) { rosterImported = v; },
    page<T>(items: T[], q: Record<string, any>): D.Page<T> {
      const limit = Math.min(Number(q.limit) || 20, 100), start = Number(q.cursor) || 0;
      return { items: items.slice(start, start + limit), next_cursor: start + limit < items.length ? String(start + limit) : null };
    },
  };
}
export type State = ReturnType<typeof createState>;
export { F, LEVELS, MOODS };
