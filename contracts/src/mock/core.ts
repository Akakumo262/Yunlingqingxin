import { CASE_TRANSITIONS, Mood, Role, SupportLevel } from '../enums';
import type { CoreRouteName } from '../routes';
import * as D from '../dto';
import { Ctx, DAY, F, HOUR, Handler, LEVELS, MIN, MOODS, MockError, State, StoredCase, StoredPost, dateOf, iso, mask } from './state';

/** 第一批 59 个接口的参考行为。真实后端对同样的请求应返回同样结构、同样语义的响应。 */
export function coreHandlers(S: State): { [K in CoreRouteName]: Handler } {
  const { parse, notFound, brief, users, students, levels, consentsOf, consented, card, page, id, notify } = S;

  const tokenFor = (u: F.MockUser): D.TokenPair => ({ access_token: `mock.${u.account}`, refresh_token: `mock-refresh.${u.account}`, expires_in: 900, activated: S.activated.has(u.account) });
  const meOf = (u: F.MockUser): D.Me => {
    const { account: _a, ...me } = u;
    return me;
  };
  const caseOf = (cid: string) => S.cases.find((c) => c.id === cid) ?? notFound('个案');
  const caseOut = (c: StoredCase): D.CaseDetail => {
    const { class_id: _c, ...rest } = c;
    return { ...rest, referral: S.referrals.find((r) => r.case_id === c.id) };
  };
  const touch = (c: StoredCase, type: D.CaseDetail['timeline'][number]['type'], title: string, actor: string, note?: string) => {
    c.timeline.push({ id: id('ev'), type, title, note, actor_name: actor, at: iso() });
    c.updated_at = iso();
  };
  const titleOf = (sid: string) => S.contents.find((x) => x.id === sid)?.title ?? F.CAREER_CARDS.find((x) => x.id === sid)?.title ?? S.activities.find((x) => x.id === sid)?.title ?? sid;

  /** 助手的回答：先查问答条目，再从内容库和生涯卡里检索；查不到就如实说不知道 */
  const answer = (q: string, forStudent: boolean): { text: string; sources: string[]; next: string[] } => {
    const qa = [...F.AI_QA, ...F.AI_FAQ.map((f) => ({ ...f, next: undefined as string[] | undefined }))]
      .map((f) => ({ f, hits: f.keys.filter((k) => q.includes(k)).length })).filter((x) => x.hits).sort((a, b) => b.hits - a.hits)[0]?.f;
    if (qa) return { text: qa.answer, sources: qa.sources, next: qa.next ?? ['最近有什么活动', '我想找老师聊'] };
    const pool = forStudent ? S.published(true) : S.contents.filter((x) => x.status === 'published');
    const hits = S.rank(q, pool, (c) => [c.title, c.tags ?? [], c.summary + c.body]).slice(0, 3);
    const careers = S.rank(q, F.CAREER_CARDS, (c) => [c.title, [c.tagline], c.sections.map((s) => s.text).join('')]).slice(0, 2);
    if (hits[0]) {
      const top = hits[0];
      const points = top.takeaways?.length ? top.takeaways.map((t, i) => `${i + 1}. ${t}`).join('\n') : top.summary;
      return { text: `平台上有一篇《${top.title}》讲到了这个：\n${points}\n想看完整内容，点下面的出处。`, sources: [...hits.map((h) => h.id), ...careers.map((c) => c.id)].slice(0, 4), next: [`${top.tags?.[0] ?? '这个'}还有别的办法吗`, '我想找老师聊'] };
    }
    if (careers[0]) {
      const c = careers[0];
      return { text: `「${c.title}」：${c.tagline}。\n${c.sections.map((s) => `${s.heading}：${s.text}`).join('\n')}`, sources: careers.map((x) => x.id), next: ['还有哪些类似的职业', '我不知道以后想干什么'] };
    }
    return { text: F.AI_FALLBACK, sources: [], next: ['你能帮我做什么', '我想找老师聊'] };
  };

  return {
    health: () => ({ status: 'ok', data: 'mock', time: iso() }),

    // ── 身份与同意 ──
    authDevLogin: (c) => {
      const b = parse(D.DevLoginReq, c.body);
      const u = users.find((x) => x.account === b.account);
      if (!u) throw new MockError(401, 'UNAUTHENTICATED', '账号不存在');
      S.record(u, 'login', 'session', 'allow', null);
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
      S.record(u, 'login', 'session', 'allow', null);
      return tokenFor(u);
    },
    authActivate: (c) => {
      const b = parse(D.ActivateReq, c.body);
      if (b.school_code !== F.DEMO_SCHOOL_CODE) throw new MockError(422, 'VALIDATION_FAILED', '学校码不正确', '请向班主任确认学校码');
      S.activated.add(c.user.account);
      return meOf(c.user);
    },
    authGuardianBind: (c) => {
      const b = parse(D.GuardianBindReq, c.body);
      if (b.school_code !== F.DEMO_SCHOOL_CODE) throw new MockError(422, 'VALIDATION_FAILED', '学校码不正确');
      if (b.sms_code !== F.DEMO_SMS_CODE) throw new MockError(422, 'VALIDATION_FAILED', '验证码不正确');
      if (!c.user.children?.length) c.user.children = [brief('s2')];
      S.activated.add(c.user.account);
      return meOf(c.user);
    },
    me: (c) => meOf(c.user),
    mePrivacy: (c): D.PrivacyDashboard => ({ access_logs: S.accessLogs.get(S.studentIdOf(c.user)) ?? [], consents: consentsOf(S.studentIdOf(c.user)) }),
    consentGrant: (c) => {
      const b = parse(D.ConsentGrantReq, c.body);
      const item = consentsOf(S.studentIdOf(c.user)).find((x) => x.purpose === b.purpose)!;
      item.granted = true;
      item.granted_at = iso();
      return item;
    },
    consentRevoke: (c) => {
      const item = consentsOf(S.studentIdOf(c.user)).find((x) => x.purpose === c.params.purpose) ?? notFound('同意项');
      if (item.required) throw new MockError(409, 'CONFLICT', '基础服务的同意不能单独撤回', '如需停止使用，请联系学校注销账号');
      item.granted = false;
      item.granted_at = undefined;
      return item;
    },

    // ── 学生日常 ──
    homeGet: (c): D.HomeFeed => {
      const sid = c.user.student_id!;
      const today = S.checkIns.filter((x) => x.student_id === sid && x.created_at.slice(0, 10) === dateOf(0)).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const action = S.todayAction();
      // 推荐只看学段和兴趣：优先没看过的，再混入不同频道。不使用任何心情或问卷数据
      const seen = S.setOf(S.completed, c.user.id);
      const fresh = S.published(true).filter((x) => !seen.has(x.id));
      const recommended: D.ContentDetail[] = [];
      for (const x of fresh) if (!recommended.some((r) => r.channel === x.channel)) recommended.push(x);
      const mine = [...(S.planProgress.get(c.user.id) ?? new Map<string, Set<number>>())].map(([pid, done]) => ({ p: F.PLANS.find((p) => p.id === pid)!, done })).find((x) => x.done.size < x.p.steps.length);
      const day = mine ? Math.min(mine.p.steps.length, [...Array(mine.p.steps.length).keys()].map((i) => i + 1).find((d) => !mine.done.has(d)) ?? 1) : 0;
      return {
        today_check_in: today ? { id: today.id, mood: today.mood, note: today.note, created_at: today.created_at } : null,
        week: S.weekOf(sid),
        micro_action: { id: action.id, title: action.title, minutes: 3, edu: action.edu, done: !!S.microDone.get(c.user.id)?.has(dateOf(0)) },
        recommended: recommended.slice(0, 4).map((x) => card(x, c.user.id)),
        from_teacher: S.pushes.filter((p) => p.class_id === c.user.class_id).slice(0, 2).map((p) => ({ id: p.id, content: card(S.contents.find((x) => x.id === p.content_id)!, c.user.id), message: p.message, teacher_name: p.teacher_name, created_at: p.created_at })),
        plan: mine ? { id: mine.p.id, title: mine.p.title, day, days: mine.p.steps.length, next_title: mine.p.steps[day - 1][0], done_today: false } : null,
        activities: S.activities.filter((a) => S.activityStatus(a) !== 'ended').sort((a, b) => Number(b.signups.has(sid)) - Number(a.signups.has(sid)) || a.start_at.localeCompare(b.start_at)).slice(0, 3).map((a) => S.activityCard(a, c.user)),
        unread: (S.notices.get(c.user.id) ?? []).filter((n) => !n.read).length,
      };
    },
    checkInCreate: (c): D.CheckIn => {
      const b = parse(D.CheckInCreateReq, c.body);
      const sid = c.user.student_id!;
      const dup = b.client_id ? S.checkIns.find((x) => x.student_id === sid && x.client_id === b.client_id) : undefined;
      if (dup) return { id: dup.id, mood: dup.mood, note: dup.note, created_at: dup.created_at };
      const row = { id: id('ci'), student_id: sid, mood: b.mood, note: b.note, client_id: b.client_id, created_at: iso() };
      S.checkIns.push(row);
      // 规则 rr3：最近 5 次都偏低 → 生成一条 L1 提示（7 天内同类不重复），等老师确认
      const last5 = S.checkIns.filter((x) => x.student_id === sid).slice(-5);
      const recent = S.alerts.some((a) => a.student.id === sid && a.source === 'check_in_rule' && Date.now() - Date.parse(a.created_at) < 7 * DAY);
      if (S.rules.find((r) => r.id === 'rr3')!.enabled && last5.length === 5 && last5.every((x) => x.mood === 'low' || x.mood === 'hard') && !recent) S.raiseAlert(sid, 'L1', 'check_in_rule', '最近 5 次心情记录都偏低', 24 * 60);
      return { id: row.id, mood: row.mood, note: row.note, created_at: row.created_at };
    },
    checkInList: (c) => page(S.checkIns.filter((x) => x.student_id === c.user.student_id).reverse().map(({ id, mood, note, created_at }) => ({ id, mood, note, created_at })), c.query),
    passportGet: (c) => S.passportOf(c.user.student_id!),
    guardianSummary: (c): D.GuardianSummary => {
      const child = c.user.children?.find((x) => x.id === c.query.student_id) ?? c.user.children?.[0];
      if (!child) throw new MockError(409, 'CONFLICT', '还没有绑定孩子');
      const open = consented(child.id, 'guardian_trend');
      const crisis = S.alerts.some((a) => a.student.id === child.id && a.level === 'L3' && a.status !== 'dismissed');
      const week = Math.floor(Date.now() / (7 * DAY));
      const tasks = ['和孩子一起走路去买一次菜，路上聊聊学校里好玩的事', '让孩子教您一样他会而您不会的事', '一起翻翻老照片，讲讲他小时候的事', '饭桌上每人说一件今天的小事，您先说'];
      return {
        child,
        week_text: open ? '这一周孩子整体平稳，周三前后情绪有些起伏，周末回升。参加了一次班级活动。' : '孩子这周在正常使用平台。具体的心情记录由孩子自己决定是否向您开放。',
        suggestions: ['晚饭后留十分钟，只听不评价', '问一句“这周有什么事让你笑了”', '周末一起做一件不看手机的事'],
        task: { title: tasks[week % tasks.length], minutes: 3, done: S.guardianTasksDone.has(`${c.user.id}:${week}`) },
        courses: S.contents.filter((x) => x.status === 'published' && x.channel === 'parent').map((x) => card(x, c.user.id)),
        crisis_notice: crisis ? { text: '孩子刚才主动向老师求助，老师已经在跟进。', steps: ['先别追问原因，告诉孩子“我在”', '保持电话畅通，班主任会联系您', '今晚尽量有人陪在孩子身边'] } : null,
        notes_unread: S.notes.filter((n) => n.guardian_ids.includes(c.user.id) && !n.reply).length,
        unread: (S.notices.get(c.user.id) ?? []).filter((n) => !n.read).length,
      };
    },

    // ── 测评 ──
    instrumentList: (c): D.InstrumentBrief[] =>
      F.INSTRUMENTS.filter((i) => c.user.roles.includes(Role.student) || i.kind !== 'entertainment').map((i) => ({
        id: i.id, code: i.code, name: i.name, kind: i.kind, minutes: i.minutes, item_count: i.items.length, intro: i.intro, disclaimer: i.disclaimer,
        last_done_at: c.user.student_id ? [...S.sessions.values()].filter((s) => s.student_id === c.user.student_id && s.instrument_id === i.id && s.report).map((s) => s.report!.created_at).sort().pop() : undefined,
      })),
    assessmentStart: (c): D.AssessmentSession => {
      const b = parse(D.AssessmentStartReq, c.body);
      const ins = F.INSTRUMENTS.find((i) => i.id === b.instrument_id) ?? notFound('问卷');
      if (ins.kind !== 'entertainment' && !consented(c.user.student_id!, 'assessment')) throw new MockError(403, 'CONSENT_REQUIRED', '需要先同意“成长问卷”', '可以在“我的—隐私与授权”里打开');
      const sid = id('as');
      S.sessions.set(sid, { student_id: c.user.student_id!, instrument_id: ins.id });
      return { id: sid, instrument: { id: ins.id, code: ins.code, name: ins.name, kind: ins.kind, minutes: ins.minutes, item_count: ins.items.length, intro: ins.intro, disclaimer: ins.disclaimer }, items: ins.items.map((text, i) => ({ id: `${ins.id}-${i + 1}`, text })), options: ins.options };
    },
    assessmentSubmit: (c): D.AssessmentReport => {
      const b = parse(D.AssessmentSubmitReq, c.body);
      const s = S.sessions.get(c.params.id);
      if (!s || s.student_id !== c.user.student_id) return notFound('测评');
      if (s.report) return s.report; // 幂等
      const ins = F.INSTRUMENTS.find((i) => i.id === s.instrument_id)!;
      const answered = b.answers.filter((x): x is number => x !== null);
      const total = answered.reduce((a, x) => a + x, 0), max = ins.items.length * (ins.options.length - 1), ratio = max ? total / max : 0;
      const common = { session_id: c.params.id, instrument_name: ins.name, kind: ins.kind, disclaimer: ins.disclaimer, created_at: iso() };
      if (ins.kind === 'entertainment') {
        S.sessions.delete(c.params.id); // 娱乐量表不保存（ES-05）
        const picked = ins.items.filter((_, i) => b.answers[i] === 1).map((t) => t.split('：')[0]);
        const fun: Record<string, [string, string]> = {
          ins3: [ratio >= 0.5 ? '你偏向“先感受，再行动”' : '你偏向“先计划，再出发”', '这只是一个轻松的偏好小测，换一天做结果可能就不一样。'],
          ins7: [picked.length ? `你想去：${picked.slice(0, 3).join('、')}` : '今天哪座岛都不想去，也行', '想去的岛说明你对那一类事有好奇心。可以去“发现—生涯”里翻翻相关的卡片。'],
          ins8: [`今天的电量：${Math.round(ratio * 100)}%`, ratio >= 0.6 ? '电量还不错。' : '电量有点低。今晚早点睡，明天吃个早饭，电会回来的。'],
        };
        const [headline, description] = fun[ins.id] ?? fun.ins3;
        return { ...common, headline, description, strengths: ['愿意花一分钟看看自己'], suggestions: ['把结果当成和朋友聊天的话题就好'], suggest_talk: false };
      }
      const good = ins.positive ? ratio >= 0.5 : ratio < 0.45;
      const tips: Record<string, [string[], string[]]> = {
        ins1: [['把管用的办法记在成长护照里', '有余力的话，帮一帮身边状态不太好的同学'], ['今晚试试睡前三分钟的放松音频', '找一个你信任的人，说说最近最烦的一件事']],
        ins2: [['保持现在的作息', '考前也别熬夜'], ['固定起床时间，周末也别睡到中午', '睡前一小时把手机放到卧室外面']],
        ins4: [['把你的错题整理办法分享给同桌', '试一个七天学习计划'], ['先从“每天写清单”这一件事开始', '看看《作业太多做不完怎么办》']],
        ins5: [['留意一下班里总是一个人的同学', '参加一次要一起做事的活动'], ['找一件固定的小事和同桌一起做', '看看《新学期换了班，一个朋友都没有》']],
        ins6: [['考前保持现在的节奏', '把你的办法告诉紧张的同学'], ['拿到卷子先翻一遍、先做会的', '试试三分钟呼吸音频']],
      };
      const [okTips, lowTips] = tips[ins.id] ?? tips.ins1;
      const report: D.AssessmentReport = good
        ? { ...common, headline: '最近状态挺稳的', description: '你在这方面找到了自己的节奏。保持现在的做法就很好。', strengths: ['能照顾好自己', '遇到事情愿意找人说'], suggestions: okTips, suggest_talk: false, raw_score: total }
        : { ...common, headline: '最近有些不容易', description: '这段时间你可能压着一些事。这在这个年纪很常见，不代表你有什么问题。', strengths: ['愿意认真回答这份问卷，本身就是在照顾自己'], suggestions: lowTips, suggest_talk: true, raw_score: total };
      if (!good && ins.kind === 'screening' && S.rules.find((r) => r.id === 'rr4')!.enabled) S.raiseAlert(s.student_id, 'L1', 'assessment_rule', `《${ins.name}》结果提示近期状态偏低`, 24 * 60);
      s.report = report;
      return report;
    },
    assessmentReport: (c): D.AssessmentReport => {
      const s = S.sessions.get(c.params.id);
      if (!s?.report || (c.user.roles.includes(Role.student) && s.student_id !== c.user.student_id)) return notFound('报告');
      if (!c.user.roles.includes(Role.student)) S.logAccess(s.student_id, S.roleLabel(c.user), `《${s.report.instrument_name}》的结果`);
      return s.report;
    },

    // ── 求助 / 预警 / 观察 ──
    signalCreate: (c): D.SignalCreated => {
      const b = parse(D.SignalCreateReq, c.body);
      const sid = c.user.student_id ?? b.student_id;
      if (!sid) throw new MockError(422, 'VALIDATION_FAILED', '缺少学生');
      // 规则 rr1：一键求助按最高时限处理（BR-17）：15 分钟触达、2 小时首次介入
      const urgent = b.source === 'one_click_help';
      const a = S.raiseAlert(sid, urgent ? 'L3' : 'L1', b.source, urgent ? '学生主动求助' : (b.message ?? '教师上报'), urgent ? 15 : 24 * 60);
      if (urgent) S.helpTargets.set(a.id, b.contact_preference[0]);
      const notified: D.SignalCreated['notified'] = [{ role: Role.headTeacher, channel: 'in_app', status: 'sent' }, { role: Role.psychologist, channel: 'in_app', status: 'sent' }];
      if (urgent) notified.push({ role: Role.schoolLeader, channel: 'sms', status: 'sent' }, { role: Role.guardian, channel: 'sms', status: 'sent' });
      const who = b.contact_preference[0] === 'psychologist' ? '心理老师' : '班主任';
      return { signal_id: id('sg'), alert_id: a.id, status: 'notified', sla: { acknowledge_by: a.due_at, intervene_by: iso(120 * MIN) }, notified, next: `已经通知${who}，老师会在 15 分钟内联系你。情况紧急的话，请直接拨打 12355。` };
    },
    alertList: (c) => page(S.alerts.filter((a) => !c.query.status || a.status === c.query.status), c.query),
    alertAck: (c) => {
      const a = S.alerts.find((x) => x.id === c.params.id) ?? notFound('提醒');
      if (a.status === 'open' || a.status === 'escalated') {
        Object.assign(a, { status: 'acked', acked_by_name: c.user.name, acked_at: iso() });
        // 学生主动求助的，告诉他“有人接住了”
        if (a.source === 'one_click_help' || a.source === 'ai_guardrail') notify([a.student.id], 'help', `${c.user.name}已经看到你的消息`, '老师会来找你。不用准备说什么，老师会先听你说。', { page: 'help' });
      }
      return a;
    },
    alertEscalate: (c) => {
      const a = S.alerts.find((x) => x.id === c.params.id) ?? notFound('提醒');
      a.level = LEVELS[Math.min(LEVELS.indexOf(a.level) + 1, 3)];
      a.status = 'escalated';
      levels.set(a.student.id, a.level);
      notify([...S.byRole(Role.psychologist), ...S.byRole(Role.schoolLeader)], 'alert', `${c.user.name}升级了一条提醒`, `${a.student.name}：${a.reason}`, { page: 'today', id: a.id });
      return a;
    },
    alertDismiss: (c) => {
      const b = parse(D.AlertDismissReq, c.body);
      const a = S.alerts.find((x) => x.id === c.params.id) ?? notFound('提醒');
      a.status = 'dismissed';
      a.reason += `（已标记不需要关注：${b.reason}）`;
      if (!S.alerts.some((x) => x.student.id === a.student.id && x.status !== 'dismissed') && !S.cases.some((x) => x.student.id === a.student.id && !['closed', 'dismissed'].includes(x.status))) levels.set(a.student.id, 'L0');
      const rule = S.rules.find((r) => r.source === a.source);
      if (rule) rule.dismissed_30d += 1; // 误报反馈给规则，不追责
      return a;
    },
    observationCreate: (c): D.ObservationItem => {
      const b = parse(D.ObservationCreateReq, c.body);
      brief(b.student_id);
      const o = { id: id('ob'), student_id: b.student_id, scene: b.scene, dimensions: b.dimensions, note: b.note, next_step: b.next_step, teacher_name: c.user.name, created_at: iso() };
      S.observations.unshift(o);
      if (b.next_step === 'refer_psychologist') S.raiseAlert(b.student_id, 'L1', 'teacher_observation', '班主任谈话后希望心理老师接手', 24 * 60);
      const { student_id: _s, ...out } = o;
      return out;
    },
    classBoard: (c): D.ClassBoard => {
      if (c.params.id !== F.CLASS_ID) return notFound('班级');
      if (c.user.roles.includes(Role.headTeacher) && c.user.class_id !== c.params.id) throw new MockError(403, 'FORBIDDEN', '只能查看自己的班级');
      const focus = students.filter((s) => levels.get(s.id) !== 'L0').sort((a, b) => LEVELS.indexOf(levels.get(b.id)!) - LEVELS.indexOf(levels.get(a.id)!)).slice(0, 5)
        .map((s) => ({ ...brief(s.id), level: levels.get(s.id)!, reason: S.alerts.find((a) => a.student.id === s.id && a.status !== 'dismissed')?.reason ?? '持续留意' }));
      const active = new Set(S.checkIns.filter((x) => Date.now() - Date.parse(x.created_at) < 7 * DAY).map((x) => x.student_id)).size;
      return {
        class_id: F.CLASS_ID, class_name: F.CLASS_NAME, student_count: students.length, focus,
        students: students.map((s) => ({ ...brief(s.id), level: levels.get(s.id)! })),
        week_check_in_rate: Math.round((active / students.length) * 100) / 100,
        mood_trend: [6, 5, 4, 3, 2, 1, 0].map((d) => ({ date: dateOf(d), counts: Object.fromEntries(MOODS.map((m) => [m, S.checkIns.filter((x) => x.created_at.slice(0, 10) === dateOf(d) && x.mood === m).length])) as Record<Mood, number> })),
      };
    },
    studentCard: (c): D.StudentCard => {
      const s = brief(c.params.id);
      S.logAccess(s.id, S.roleLabel(c.user), '心情趋势');
      const scene = levels.get(s.id) === 'L0' ? ['开场', '倾听'] : ['开场', '倾听', '回应情绪', '收尾'];
      return {
        student: s, level: levels.get(s.id)!, mood_week: S.weekOf(s.id),
        observations: S.observations.filter((o) => o.student_id === s.id).map(({ student_id: _s, ...o }) => o),
        case_id: S.cases.find((x) => x.student.id === s.id && !['closed', 'dismissed'].includes(x.status))?.id,
        scripts: scene.map((sc) => F.TALK_SCRIPTS.find((t) => t.scene === sc)!),
      };
    },
    talkScripts: () => F.TALK_SCRIPTS,

    // ── 个案与转介 ──
    caseCreate: (c) => {
      const b = parse(D.CaseCreateReq, c.body);
      const nc: StoredCase = { id: id('ca'), case_no: `YL-2026-${String(S.cases.length + 1).padStart(4, '0')}`, class_id: F.CLASS_ID, student: brief(b.student_id), level: b.level, status: b.plan ? 'following' : 'pending_confirm', owner_name: c.user.name, created_at: iso(), updated_at: iso(), guardian_informed: false, plan: b.plan ?? null, timeline: [] };
      touch(nc, 'created', '建立个案', c.user.name);
      S.cases.unshift(nc);
      const a = S.alerts.find((x) => x.id === b.alert_id);
      if (a) Object.assign(a, { status: 'converted', case_id: nc.id });
      levels.set(b.student_id, b.level);
      notify(S.byRole(Role.headTeacher), 'case', `${c.user.name}为${nc.student.name}建立了个案`, `案件号 ${nc.case_no}。你仍然是他每天见到的人，日常观察可以继续记在学生卡片里。`, { page: 'cases', id: nc.id });
      return caseOut(nc);
    },
    caseList: (c) => page(S.cases.filter((x) => !c.query.status || x.status === c.query.status).map((x): D.CaseSummary => ({ id: x.id, case_no: x.case_no, student: x.student, level: x.level, status: x.status, owner_name: x.owner_name, created_at: x.created_at, updated_at: x.updated_at })), c.query),
    caseGet: (c) => {
      const x = caseOf(c.params.id);
      if (c.user.roles.includes(Role.headTeacher) && c.user.class_id !== x.class_id) throw new MockError(403, 'FORBIDDEN', '只能查看本班个案');
      S.logAccess(x.student.id, S.roleLabel(c.user), '个案记录目录');
      const out = caseOut(x);
      // 班主任只看摘要：不含心理教师面谈的具体内容
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
        if (b.status === 'closed') notify(S.byRole(Role.headTeacher), 'case', `${x.student.name}的个案已结案`, '后续转为日常观察。', { page: 'cases', id: x.id });
      }
      return caseOut(x);
    },
    caseIntervention: (c) => {
      const b = parse(D.InterventionCreateReq, c.body);
      const x = caseOf(c.params.id);
      touch(x, 'intervention', { talk: '谈话', counseling: '面谈辅导', family: '家庭沟通', other: '其他支持' }[b.type], c.user.name, b.note + (b.outcome ? `（结果：${b.outcome}）` : ''));
      if (b.type === 'family') x.guardian_informed = true;
      return caseOut(x);
    },
    caseRefer: (c): D.ReferralItem => {
      const b = parse(D.ReferralCreateReq, c.body);
      const x = caseOf(c.params.id);
      const inst = S.institutions.find((i) => i.id === b.institution_id && i.status === 'approved') ?? notFound('机构');
      if (!CASE_TRANSITIONS[x.status].includes('referred')) throw new MockError(409, 'ILLEGAL_TRANSITION', '当前状态不能发起转介');
      const ref: D.ReferralItem = { id: id('rf'), case_id: x.id, case_no: x.case_no, student: x.student, level: x.level, institution_id: inst.id, institution_name: inst.name, reason: b.reason, done_interventions: x.timeline.filter((e) => e.type === 'intervention').map((e) => e.title), assessment_summary: b.include_assessment_summary ? '近期状态问卷提示睡眠与压力偏高（仅摘要，不含原始分）' : undefined, status: 'sent', expires_at: iso(7 * DAY), created_at: iso() };
      S.referrals.unshift(ref);
      x.status = 'referred';
      touch(x, 'referral', `转介至 ${inst.name}`, c.user.name, b.reason);
      notify(users.filter((u) => u.institution_name === inst.name).map((u) => u.id), 'referral', '收到一张新的转介单', `案件号 ${x.case_no}，请在 48 小时内确认是否接收。`, { page: 'referrals', id: ref.id });
      notify(S.guardiansOf(x.student.id), 'referral', '学校建议带孩子去专业机构看看', `学校已联系${inst.name}。这是出于谨慎，班主任会和您电话沟通具体安排。`, { page: 'summary' });
      return ref;
    },
    referralList: (c) => {
      const isInst = c.user.roles.includes(Role.institution);
      // 机构只看转给自己的，且学生姓名脱敏
      return page(S.referrals.filter((r) => !isInst || r.institution_name === c.user.institution_name).map((r) => (isInst ? { ...r, student: { ...r.student, name: mask(r.student.name) } } : r)), c.query);
    },
    referralAccept: (c) => {
      const r = S.referrals.find((x) => x.id === c.params.id && x.institution_name === c.user.institution_name) ?? notFound('转介');
      r.status = 'accepted';
      touch(caseOf(r.case_id), 'referral', `${r.institution_name} 已确认接收`, c.user.name);
      notify(S.byRole(Role.psychologist), 'referral', `${r.institution_name}已确认接收转介`, `案件号 ${r.case_no}。`, { page: 'cases', id: r.case_id });
      return { ...r, student: { ...r.student, name: mask(r.student.name) } };
    },
    referralFeedback: (c) => {
      const b = parse(D.ReferralFeedbackReq, c.body);
      const r = S.referrals.find((x) => x.id === c.params.id && x.institution_name === c.user.institution_name) ?? notFound('转介');
      r.status = 'feedback_received';
      r.feedback = b;
      touch(caseOf(r.case_id), 'feedback', `收到 ${r.institution_name} 的反馈`, c.user.name, b.advice);
      notify([...S.byRole(Role.psychologist), ...S.byRole(Role.headTeacher)], 'referral', `${r.institution_name}发回了反馈`, `案件号 ${r.case_no}：${b.advice.slice(0, 40)}`, { page: 'cases', id: r.case_id });
      return { ...r, student: { ...r.student, name: mask(r.student.name) } };
    },

    // ── 内容与生涯 ──
    contentFeed: (c) => {
      const staff = !c.user.roles.includes(Role.student);
      return page(S.contents.filter((x) => x.status === 'published' && (!c.query.channel || x.channel === c.query.channel) && (staff || c.query.channel || !['parent', 'teacher'].includes(x.channel)))
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')).map((x) => card(x, c.user.id)), c.query);
    },
    contentGet: (c): D.ContentDetail => {
      const x = S.contents.find((i) => i.id === c.params.id && (i.status === 'published' || c.user.roles.includes(Role.operator))) ?? notFound('内容');
      const related = S.published(!['parent', 'teacher'].includes(x.channel)).filter((o) => o.id !== x.id)
        .map((o) => ({ o, s: (o.tags ?? []).filter((t) => x.tags?.includes(t)).length * 3 + (o.channel === x.channel ? 1 : 0) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map((r) => card(r.o, c.user.id));
      return { ...x, ...card(x, c.user.id), body: x.body, author: x.author, license: x.license, related };
    },
    contentCreate: (c) => {
      const b = parse(D.ContentCreateReq, c.body);
      // 机审示例：缺授权或含营销词即拦截，否则进入团队二审
      const hits = [/未知|缺授权|待补/.test(b.license) ? '缺少授权证明' : '', /加微信|优惠|报名费|保过/.test(b.body + b.title) ? '疑似营销内容' : ''].filter(Boolean);
      const item: D.ContentDetail = { id: id('ct'), ...b, minutes: Math.max(1, Math.round(b.body.length / 300)), status: hits.length ? 'ai_blocked' : 'team_review', tags: [] };
      S.contents.unshift(item);
      S.reviewHistory.set(item.id, [{ stage: 'ai', result: hits.length ? 'reject' : 'pass', reviewer: 'AI 机审', reason: hits.join('；') || undefined, at: iso() }]);
      return item;
    },
    contentReviewQueue: (c) =>
      page(S.contents.filter((x) => ['team_review', 'tri_party_review', 'ai_blocked'].includes(x.status)).map((x): D.ContentReviewItem => {
        const history = S.reviewHistory.get(x.id) ?? [];
        const ai = history.find((h) => h.stage === 'ai');
        return { content: x, ai_result: { passed: ai?.result !== 'reject', hits: ai?.reason ? ai.reason.split('；') : [] }, history };
      }), c.query),
    contentReview: (c) => {
      const b = parse(D.ContentReviewReq, c.body);
      const x = S.contents.find((i) => i.id === c.params.id) ?? notFound('内容');
      const stage = x.status === 'tri_party_review' ? 'tri_party' : 'team';
      if (!['team_review', 'tri_party_review', 'ai_blocked'].includes(x.status)) throw new MockError(409, 'ILLEGAL_TRANSITION', '这条内容不在待审状态');
      if (b.result === 'reject' && !b.reason) throw new MockError(422, 'VALIDATION_FAILED', '退回需要填写原因');
      x.status = b.result === 'reject' ? 'rejected' : x.status === 'tri_party_review' ? 'published' : 'tri_party_review';
      if (x.status === 'published') Object.assign(x, { published_at: iso(), reviewed_by: '内容组 · 三审会签' });
      S.reviewHistory.set(x.id, [...(S.reviewHistory.get(x.id) ?? []), { stage, result: b.result, reviewer: c.user.name, reason: b.reason, at: iso() }]);
      return x;
    },
    careerCards: (c) => F.CAREER_CARDS.filter((x) => (!c.query.type || x.type === c.query.type) && (!c.query.region || x.region.includes(c.query.region))),

    // ── AI 成长助手 ──
    aiChat: (c): D.AiChatRes => {
      const b = parse(D.AiChatReq, c.body);
      const session_id = b.session_id ?? id('ai');
      const turn = (S.aiTurns.get(session_id) ?? 0) + 1;
      S.aiTurns.set(session_id, turn);
      // 规则 rr2：先过危机识别，命中后不再检索、不再生成
      if (F.CRISIS_WORDS.some((w) => b.message.includes(w))) {
        if (c.user.student_id) S.raiseAlert(c.user.student_id, 'L3', 'ai_guardrail', 'AI 助手对话中出现需要立即关注的表达', 15);
        return { session_id, kind: 'crisis', answer: F.AI_CRISIS_REPLY, sources: [], remind_human: true };
      }
      const a = answer(b.message, c.user.roles.includes(Role.student));
      return { session_id, kind: 'answer', answer: a.text, sources: a.sources.map((s) => ({ content_id: s, title: titleOf(s) })), remind_human: turn % 5 === 0, suggestions: a.next };
    },

    // ── 成长圈 ──
    circleList: (c) => {
      if (c.user.roles.includes(Role.student) && !consented(c.user.student_id!, 'community')) return [];
      return F.CIRCLES.map((x) => {
        const mine = S.posts.filter((p) => p.circle_id === x.id && !p.parent_id && p.status === 'published');
        return { ...x, post_count: mine.length, last_post_at: mine.map((p) => p.created_at).sort().pop() };
      });
    },
    postList: (c) => page(S.posts.filter((p) => p.circle_id === c.params.id && !p.parent_id && (p.status === 'published' || p.author_id === c.user.id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((p) => S.postView(p, c.user.id)), c.query),
    postCreate: (c): D.Post => {
      const b = parse(D.PostCreateReq, c.body);
      if (!F.CIRCLES.some((x) => x.id === c.params.id)) return notFound('圈子');
      if (F.POST_BANNED.some((re) => re.test(b.content))) throw new MockError(422, 'VALIDATION_FAILED', '内容里不能有联系方式或外部链接', '这是为了保护你和其他同学');
      const isStudent = c.user.roles.includes(Role.student);
      const mine = S.posts.filter((p) => p.author_id === c.user.id).length;
      const me = students.find((s) => s.id === c.user.id);
      const pending = isStudent && mine < 3;
      const p: StoredPost = { id: id('p'), circle_id: c.params.id, author_id: c.user.id, parent_id: b.parent_id, nickname: isStudent ? (me?.nickname ?? c.user.nickname ?? '同学') : c.user.name, avatar_seed: me ? students.indexOf(me) : 0, is_teacher: !isStudent, content: b.content, status: pending ? 'pending_review' : 'published', why: pending ? 'new_user' : undefined, created_at: iso(), base_likes: 0 };
      S.posts.push(p);
      if (F.CRISIS_WORDS.some((w) => b.content.includes(w)) && c.user.student_id) S.raiseAlert(c.user.student_id, 'L3', 'ai_guardrail', '成长圈发言中出现需要立即关注的表达', 15);
      const parent = b.parent_id ? S.posts.find((x) => x.id === b.parent_id) : undefined;
      if (parent && !pending && parent.author_id !== c.user.id) notify([parent.author_id], 'circle', '有人回复了你', `“${b.content.slice(0, 30)}”`, { page: 'circle', id: p.circle_id });
      if (pending) notify(S.byRole(Role.headTeacher), 'circle', '有一条新帖等你看过', `${p.nickname}：${b.content.slice(0, 30)}`, { page: 'circles' });
      return S.postView(p, c.user.id);
    },
    postReport: (c) => {
      const b = parse(D.PostReportReq, c.body);
      const p = S.posts.find((x) => x.id === c.params.id) ?? notFound('帖子');
      Object.assign(p, { why: 'reported', report_reason: b.reason });
      notify(S.byRole(Role.headTeacher), 'circle', '有一条帖子被举报', `${p.nickname}：${p.content.slice(0, 30)}`, { page: 'circles' });
      if (b.reason === 'self_harm' && students.some((x) => x.id === p.author_id)) S.raiseAlert(p.author_id, 'L1', 'ai_guardrail', '有同学担心这位同学的状态（来自成长圈举报）', 24 * 60);
      return { ok: true };
    },
    moderationQueue: (c) => page(S.posts.filter((p) => p.why && (p.status === 'pending_review' || (p.why === 'reported' && p.status === 'published'))).map((p): D.ModerationItem => ({ post: S.postView(p, c.user.id), circle_name: F.CIRCLES.find((x) => x.id === p.circle_id)?.name ?? '', why: p.why!, report_reason: p.report_reason })), c.query),
    postModerate: (c) => {
      const b = parse(D.PostModerateReq, c.body);
      const p = S.posts.find((x) => x.id === c.params.id) ?? notFound('帖子');
      const wasPending = p.status === 'pending_review';
      p.status = b.action === 'approve' ? 'published' : b.action === 'reject' ? 'rejected' : 'removed';
      p.why = undefined;
      if (wasPending || b.action !== 'approve') notify([p.author_id], 'circle', b.action === 'approve' ? '你的发言大家可以看到了' : '你的一条发言没有通过', b.action === 'approve' ? `“${p.content.slice(0, 30)}”` : '可能是因为包含了不适合公开的内容。有疑问可以问班主任。', { page: 'circle', id: p.circle_id });
      return S.postView(p, c.user.id);
    },

    // ── 机构 ──
    institutionList: () => S.institutions.filter((i) => i.status === 'approved').map(({ license_no: _l, contact_name: _c, ...i }) => i),
    institutionApply: (c) => {
      const b = parse(D.InstitutionApplyReq, c.body);
      const { contact_phone: _p, ...rest } = b;
      const inst: D.Institution = { id: id('in'), ...rest, status: 'applied' };
      S.institutions.push(inst);
      notify([...S.byRole(Role.operator), ...S.byRole(Role.committee)], 'system', '有一家机构申请入驻', inst.name, { page: 'institutions' });
      return inst;
    },
    institutionApplications: () => S.institutions,
    institutionReview: (c) => {
      const b = parse(D.InstitutionReviewReq, c.body);
      const i = S.institutions.find((x) => x.id === c.params.id) ?? notFound('机构');
      i.status = b.approve ? 'approved' : 'rejected';
      return i;
    },

    // ── 管理 / 看板 / 审计 ──
    orgTree: () => F.ORG_TREE,
    regionReport: (): D.RegionReport => ({ ...F.REGION_REPORT, updated_at: iso(-3 * HOUR) }),
    supervisionList: () => F.SUPERVISIONS,
    tenantList: () => F.TENANTS,
    auditEvents: (c) => page(S.audit, c.query),
  };
}

export type { Ctx, SupportLevel };
