import { EXPORT_SCOPE_LABEL, FIVE_EDU_NAME, Role } from '../enums';
import type { MoreRouteName } from '../routes';
import type * as D from '../dto';
import * as M from '../dto-more';
import { DAY, F, HOUR, Handler, MockError, State, StoredActivity, dateOf, iso } from './state';

/** 第二批 59 个接口的参考行为：让平台日常用得起来的部分，以及各功能之间的联动。 */
export function moreHandlers(S: State): { [K in MoreRouteName]: Handler } {
  const { parse, notFound, brief, users, students, card, id, notify } = S;
  const activityOf = (aid: string): StoredActivity => S.activities.find((a) => a.id === aid) ?? notFound('活动');
  const planOf = (pid: string) => F.PLANS.find((p) => p.id === pid) ?? notFound('学习计划');
  const progressOf = (uid: string) => {
    if (!S.planProgress.has(uid)) S.planProgress.set(uid, new Map());
    return S.planProgress.get(uid)!;
  };
  const ownsActivity = (a: StoredActivity, roles: Role[]) => a.owner_roles.some((r) => roles.includes(r));
  const apptView = (a: (typeof S.appointments)[number], staff: boolean): M.Appointment => {
    const { student_id, ...rest } = a;
    return staff ? { ...rest, student: brief(student_id) } : rest;
  };

  return {
    // ── 搜索、收藏、专题 ──
    searchAll: (c): M.SearchResult => {
      const q = String(c.query.q ?? '').trim();
      if (!q) return { q, contents: [], careers: [], activities: [], hot: F.HOT_SEARCHES };
      const staff = !c.user.roles.includes(Role.student);
      return {
        q, hot: F.HOT_SEARCHES,
        contents: S.rank(q, staff ? S.contents.filter((x) => x.status === 'published') : S.published(true), (x) => [x.title, x.tags ?? [], x.summary + x.body]).slice(0, 12).map((x) => card(x, c.user.id)),
        careers: S.rank(q, F.CAREER_CARDS, (x) => [x.title, [x.tagline, x.region], x.sections.map((s) => s.text).join('')]).slice(0, 6),
        activities: S.rank(q, S.activities.filter((a) => S.activityStatus(a) !== 'ended'), (a) => [a.title, [FIVE_EDU_NAME[a.edu], a.organizer], a.intro]).slice(0, 4).map((a) => S.activityCard(a, c.user)),
      };
    },
    contentFavorite: (c) => {
      const b = parse(M.FavoriteReq, c.body);
      if (!S.contents.some((x) => x.id === c.params.id)) return notFound('内容');
      const set = S.setOf(S.favorites, c.user.id);
      b.on ? set.add(c.params.id) : set.delete(c.params.id);
      return { favorited: b.on };
    },
    favoriteList: (c) => [...S.setOf(S.favorites, c.user.id)].map((cid) => S.contents.find((x) => x.id === cid)).filter((x): x is D.ContentDetail => !!x && x.status === 'published').map((x) => card(x, c.user.id)).reverse(),
    contentComplete: (c) => {
      if (!S.contents.some((x) => x.id === c.params.id)) return notFound('内容');
      S.setOf(S.completed, c.user.id).add(c.params.id);
      return { completed: true };
    },
    contentFeedback: (c) => {
      parse(M.ContentFeedbackReq, c.body);
      return { ok: true };
    },
    collectionList: (): M.Collection[] => F.COLLECTIONS.map(({ ids, ...x }) => ({ ...x, count: ids.length })),
    collectionGet: (c): M.Collection => {
      const col = F.COLLECTIONS.find((x) => x.id === c.params.id) ?? notFound('专题');
      const { ids, ...rest } = col;
      return { ...rest, count: ids.length, items: ids.map((cid) => S.contents.find((x) => x.id === cid)).filter((x): x is D.ContentDetail => !!x && x.status === 'published').map((x) => card(x, c.user.id)) };
    },
    contentAdminList: (c) => S.page(S.contents.filter((x) => !c.query.status || x.status === c.query.status).filter((x) => !c.query.channel || x.channel === c.query.channel).map((x) => card(x)), c.query),

    // ── 学习计划、今日小行动 ──
    planList: (c) => F.PLANS.map((p) => S.planView(p, c.user.id)),
    planJoin: (c) => {
      const p = planOf(c.params.id), mine = progressOf(c.user.id);
      if (!mine.has(p.id)) mine.set(p.id, new Set());
      return S.planView(p, c.user.id);
    },
    planQuit: (c) => {
      const p = planOf(c.params.id);
      progressOf(c.user.id).delete(p.id); // 随时可以退出，不提示“前功尽弃”
      return S.planView(p, c.user.id);
    },
    planStepDone: (c) => {
      const p = planOf(c.params.id), mine = progressOf(c.user.id), day = Number(c.params.day);
      if (!mine.has(p.id)) throw new MockError(409, 'CONFLICT', '还没有加入这个计划');
      if (!(day >= 1 && day <= p.steps.length)) throw new MockError(422, 'VALIDATION_FAILED', '没有这一天');
      mine.get(p.id)!.add(day);
      const step = p.steps[day - 1];
      if (step[2]) S.setOf(S.completed, c.user.id).add(step[2]);
      // 做完整个计划，盖一枚印记
      if (mine.get(p.id)!.size === p.steps.length) S.stamp(c.user.student_id!, p.channel === 'five_edu' ? 'physical' : 'intellectual', `完成了“${p.title}”`, { source: 'action' });
      return S.planView(p, c.user.id);
    },
    microActionDone: (c) => {
      const action = S.todayAction();
      if (c.params.id !== action.id) throw new MockError(409, 'CONFLICT', '这个小行动已经过期了', '今天有新的小行动');
      const mine = S.microDone.get(c.user.id) ?? new Set<string>();
      if (!mine.has(dateOf(0))) {
        mine.add(dateOf(0));
        S.microDone.set(c.user.id, mine);
        S.stamp(c.user.student_id!, action.edu, action.title, { source: 'action' });
      }
      return { done: true };
    },

    // ── 五育活动 ──
    activityList: (c) => {
      const sid = c.user.student_id;
      return S.activities
        .filter((a) => (!c.query.edu || a.edu === c.query.edu) && (!c.query.mine || (sid ? a.signups.has(sid) : ownsActivity(a, c.user.roles))))
        .sort((a, b) => Number(S.activityStatus(a) === 'ended') - Number(S.activityStatus(b) === 'ended') || a.start_at.localeCompare(b.start_at))
        .map((a) => S.activityCard(a, c.user));
    },
    activityGet: (c) => S.activityDetail(activityOf(c.params.id), c.user),
    activitySignup: (c) => {
      const a = activityOf(c.params.id), sid = c.user.student_id!, st = S.activityStatus(a);
      if (a.signups.has(sid)) return S.activityDetail(a, c.user);
      if (st === 'ended') throw new MockError(409, 'CONFLICT', '这场活动已经结束了');
      if (st === 'full') throw new MockError(409, 'CONFLICT', '名额满了', '可以看看别的活动，或者过几天再来看有没有人取消');
      a.signups.set(sid, { status: 'signed', witnessed: false });
      notify([sid], 'activity', `报名成功：${a.title}`, `${a.place}。去之前看一眼要带什么。`, { page: 'activity', id: a.id });
      // 校外活动需要家长知情
      if (a.organizer_type !== 'school') notify(S.guardiansOf(sid), 'activity', `孩子报名了“${a.title}”`, `由${a.organizer}组织，${a.safety}`, { page: 'summary' });
      return S.activityDetail(a, c.user);
    },
    activityCancel: (c) => {
      const a = activityOf(c.params.id), mine = a.signups.get(c.user.student_id!);
      if (mine && mine.status !== 'signed') throw new MockError(409, 'CONFLICT', '已经签到的活动不能取消报名');
      a.signups.delete(c.user.student_id!);
      return S.activityDetail(a, c.user);
    },
    activityCheckIn: (c) => {
      const b = parse(M.ActivityCheckInReq, c.body);
      const a = activityOf(c.params.id), mine = a.signups.get(c.user.student_id!);
      if (!mine) throw new MockError(409, 'CONFLICT', '还没有报名这场活动');
      if (b.code !== a.code) throw new MockError(422, 'VALIDATION_FAILED', '签到码不对', '签到码由现场的老师念出来');
      if (mine.status === 'signed') mine.status = 'checked_in';
      return S.activityDetail(a, c.user);
    },
    activityReflect: (c) => {
      const b = parse(M.ActivityReflectReq, c.body);
      const a = activityOf(c.params.id), sid = c.user.student_id!, mine = a.signups.get(sid);
      if (!mine || mine.status === 'signed') throw new MockError(409, 'CONFLICT', '签到之后才能写反思');
      const first = mine.status !== 'reflected';
      mine.status = 'reflected';
      mine.reflection = b.text;
      // 联动：反思写完，成长护照里多一条记录、多一枚印记
      if (first) S.stamp(sid, a.edu, a.title, { reflection: b.text, source: 'activity' });
      return S.activityDetail(a, c.user);
    },
    activityCreate: (c) => {
      const b = parse(M.ActivityCreateReq, c.body);
      const a: StoredActivity = {
        id: id('a'), ...b, organizer: c.user.roles.includes(Role.committee) ? '共青团演示市委 · 学少部' : `${c.user.school_name ?? '学校'} · ${c.user.name}`, signed_count: 0, status: 'open',
        code: String(1000 + Math.floor(Math.random() * 9000)), base_signed: 0, owner_roles: c.user.roles, signups: new Map(),
      };
      S.activities.unshift(a);
      notify(students.map((s) => s.id), 'activity', `新活动：${a.title}`, `${a.place}，名额 ${a.capacity} 人。`, { page: 'activity', id: a.id });
      return S.activityDetail(a, c.user);
    },
    activityRoster: (c): M.ActivityRoster => {
      const a = activityOf(c.params.id);
      if (!ownsActivity(a, c.user.roles)) throw new MockError(403, 'FORBIDDEN', '只能查看自己组织的活动的名单');
      return { activity: S.activityDetail(a, c.user), items: [...a.signups].map(([sid, s]) => ({ student: brief(sid), status: s.status, reflection: s.reflection, witnessed: s.witnessed })) };
    },
    activityWitness: (c) => {
      const b = parse(M.ActivityWitnessReq, c.body);
      const a = activityOf(c.params.id), mine = a.signups.get(b.student_id);
      if (!ownsActivity(a, c.user.roles)) throw new MockError(403, 'FORBIDDEN', '只能为自己组织的活动做见证');
      if (!mine || mine.status === 'signed') throw new MockError(409, 'CONFLICT', '这位同学还没有签到');
      mine.witnessed = true;
      // 联动：见证写进学生成长护照里对应的那条记录；没写反思的，直接补一条
      const p = S.passportOf(b.student_id), rec = p.records.find((r) => r.title === a.title && r.source === 'activity');
      if (rec) rec.witness = c.user.name;
      else S.stamp(b.student_id, a.edu, a.title, { witness: c.user.name, source: 'activity' });
      notify([b.student_id], 'activity', `${c.user.name}为你的参与做了见证`, `“${a.title}”已经记进你的成长护照。`, { page: 'me' });
      return { ok: true };
    },

    // ── 成长护照 ──
    passportAddRecord: (c) => {
      const b = parse(M.PassportRecordReq, c.body);
      return S.stamp(c.user.student_id!, b.edu, b.title, { reflection: b.reflection, source: 'self' });
    },
    passportUpdate: (c) => {
      const b = parse(M.PassportUpdateReq, c.body);
      const p = S.passportOf(c.user.student_id!);
      p.strengths = b.strengths;
      return p;
    },

    // ── 通知 ──
    noticeList: (c): M.NoticeList => {
      const items = S.notices.get(c.user.id) ?? [];
      return { items: items.slice(0, 50), unread: items.filter((n) => !n.read).length };
    },
    noticeRead: (c) => {
      const n = (S.notices.get(c.user.id) ?? []).find((x) => x.id === c.params.id) ?? notFound('通知');
      n.read = true;
      return n;
    },
    noticeReadAll: (c) => {
      (S.notices.get(c.user.id) ?? []).forEach((n) => (n.read = true));
      return { ok: true };
    },

    // ── 求助进度、预约 ──
    helpRequests: (c): M.HelpRequest[] =>
      S.alerts.filter((a) => a.student.id === c.user.student_id && (a.source === 'one_click_help' || a.source === 'ai_guardrail')).map((a) => {
        const acked = ['acked', 'converted'].includes(a.status) || !!a.acked_at;
        const followed = a.status === 'converted' || S.observations.some((o) => o.student_id === a.student.id && o.created_at > a.created_at);
        return {
          id: a.id, target: S.helpTargets.get(a.id) ?? 'teacher', created_at: a.created_at,
          // 学生只看到进度，看不到任何等级
          status_text: followed ? '老师已经和你聊过了。之后想找人，随时再点。' : acked ? `${a.acked_by_name}已经看到，会来找你。` : '已经通知老师，正在等老师回应。',
          steps: [{ label: '已通知老师', done: true, at: a.created_at }, { label: '老师看到了', done: acked, at: a.acked_at }, { label: '老师来找你聊', done: followed }],
        };
      }),
    appointmentSlots: () => S.slots.filter((s) => s.date >= dateOf(0)),
    appointmentCreate: (c) => {
      const b = parse(M.AppointmentCreateReq, c.body);
      const slot = S.slots.find((s) => s.id === b.slot_id) ?? notFound('时间');
      if (!slot.available) throw new MockError(409, 'CONFLICT', '这个时间刚被约走了', '换一个时间试试');
      slot.available = false;
      const a = { id: id('ap'), slot, student_id: c.user.student_id!, topic: b.topic, note: b.note, status: 'pending' as const, created_at: iso() };
      S.appointments.unshift(a);
      notify(S.byRole(Role.psychologist), 'appointment', '有同学预约了面谈', `${brief(a.student_id).name}预约了 ${slot.date} ${slot.time}。`, { page: 'appointments', id: a.id });
      return apptView(a, false);
    },
    appointmentList: (c) => {
      const staff = c.user.roles.includes(Role.psychologist);
      return S.appointments.filter((a) => staff || a.student_id === c.user.student_id).map((a) => apptView(a, staff));
    },
    appointmentConfirm: (c) => {
      const a = S.appointments.find((x) => x.id === c.params.id) ?? notFound('预约');
      a.status = 'confirmed';
      notify([a.student_id], 'appointment', `${a.slot.counselor_name}确认了你的预约`, `${a.slot.date} ${a.slot.time}，${a.slot.place}。到时候直接去就行。`, { page: 'help' });
      return apptView(a, true);
    },
    appointmentCancel: (c) => {
      const a = S.appointments.find((x) => x.id === c.params.id && x.student_id === c.user.student_id) ?? notFound('预约');
      a.status = 'cancelled';
      a.slot.available = true;
      notify(S.byRole(Role.psychologist), 'appointment', '有同学取消了预约', `${a.slot.date} ${a.slot.time} 的时间空出来了。`, { page: 'appointments' });
      return apptView(a, false);
    },

    // ── 家校沟通单、内容推送、回访 ──
    noteList: (c) => {
      const isGuardian = c.user.roles.includes(Role.guardian);
      const mine = S.notes.filter((n) => (isGuardian ? n.guardian_ids.includes(c.user.id) : n.teacher_id === c.user.id));
      if (isGuardian) mine.forEach((n) => (n.read_at ??= iso()));
      return mine.map(({ guardian_ids: _g, teacher_id: _t, ...n }) => n);
    },
    noteCreate: (c) => {
      const b = parse(M.NoteCreateReq, c.body);
      const n = { id: id('no'), student: brief(b.student_id), from_name: c.user.name, kind: b.kind, text: b.text, created_at: iso(), guardian_ids: S.guardiansOf(b.student_id), teacher_id: c.user.id };
      S.notes.unshift(n);
      notify(n.guardian_ids, 'note', `${c.user.name}发来一张沟通单`, b.text.slice(0, 40), { page: 'notes', id: n.id });
      const { guardian_ids: _g, teacher_id: _t, ...out } = n;
      return out;
    },
    noteReply: (c) => {
      const b = parse(M.NoteReplyReq, c.body);
      const n = S.notes.find((x) => x.id === c.params.id && x.guardian_ids.includes(c.user.id)) ?? notFound('沟通单');
      n.reply = { text: b.text, at: iso() };
      notify([n.teacher_id], 'note', `${n.student.name}的家长回复了沟通单`, `“${b.text.slice(0, 40)}”`, { page: 'notes', id: n.id });
      const { guardian_ids: _g, teacher_id: _t, ...out } = n;
      return out;
    },
    classPush: (c): M.ClassPush => {
      const b = parse(M.ClassPushReq, c.body);
      const content = S.contents.find((x) => x.id === b.content_id && x.status === 'published') ?? notFound('内容');
      const p = { id: id('pu'), class_id: c.params.id, content_id: content.id, message: b.message, teacher_name: c.user.name, created_at: iso() };
      S.pushes.unshift(p);
      // 联动：全班同学的首页“老师推荐”和通知里都会出现
      notify(students.map((s) => s.id), 'content', `${c.user.name}给全班推荐了一篇内容`, `《${content.title}》${b.message ? '：' + b.message : ''}`, { page: 'content', id: content.id });
      return { id: p.id, content: card(content), message: p.message, teacher_name: p.teacher_name, created_at: p.created_at, completed_count: 0 };
    },
    classPushList: (c): M.ClassPush[] =>
      S.pushes.filter((p) => p.class_id === c.params.id).map((p) => ({
        id: p.id, content: card(S.contents.find((x) => x.id === p.content_id)!), message: p.message, teacher_name: p.teacher_name, created_at: p.created_at,
        completed_count: students.filter((s) => S.setOf(S.completed, s.id).has(p.content_id)).length + (p.id === 'pu1' ? 14 : 0),
      })),
    followUps: (c): M.FollowUp[] => {
      const out: M.FollowUp[] = [];
      // 谈话时选了“过几天再聊”的，三天后提醒
      for (const o of S.observations) if (o.next_step === 'talk_again' && !S.observations.some((x) => x.student_id === o.student_id && x.created_at > o.created_at)) out.push({ id: `fu-${o.id}`, student: brief(o.student_id), what: '上次谈话时说好过几天再聊', due_at: new Date(Date.parse(o.created_at) + 3 * DAY).toISOString(), from: 'talk' });
      for (const x of S.cases) {
        if (x.status === 'following' && x.plan) out.push({ id: `fu-${x.id}`, student: x.student, what: `支持计划复盘：${x.plan.goal}`, due_at: new Date(`${x.plan.review_at}T08:00:00Z`).toISOString(), case_id: x.id, from: 'case_plan' });
        const ref = S.referrals.find((r) => r.case_id === x.id);
        if (ref && ref.status !== 'feedback_received') out.push({ id: `fu-${ref.id}`, student: x.student, what: `转介到${ref.institution_name}，等待对方反馈`, due_at: new Date(Date.parse(ref.created_at) + 7 * DAY).toISOString(), case_id: x.id, from: 'referral' });
      }
      return out.filter((f) => c.user.roles.includes(Role.psychologist) || f.from === 'talk' || true).sort((a, b) => a.due_at.localeCompare(b.due_at));
    },
    guardianTaskDone: (c) => {
      S.guardianTasksDone.add(`${c.user.id}:${Math.floor(Date.now() / (7 * DAY))}`);
      return { done: true };
    },

    // ── 测评历史与概览 ──
    assessmentHistory: (c): M.AssessmentBrief[] =>
      [...S.sessions].filter(([, s]) => s.student_id === c.user.student_id && s.report).map(([sid, s]) => ({ session_id: sid, instrument_name: s.report!.instrument_name, kind: s.report!.kind, headline: s.report!.headline, created_at: s.report!.created_at })).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    assessmentOverview: (): M.AssessmentOverview => {
      const done = [...S.sessions].filter(([, s]) => s.report);
      return {
        instruments: F.INSTRUMENTS.filter((i) => i.kind !== 'entertainment').map((i) => {
          const mine = done.filter(([, s]) => s.instrument_id === i.id);
          // 演示数据量小，这里加上一个基数，让“人数不足 10 不显示”的规则看得出效果
          const base = { ins1: 31, ins2: 28, ins4: 6, ins5: 19, ins6: 24 }[i.id] ?? 0, total = base + mine.length;
          return { instrument_id: i.id, name: i.name, done_count: total, low_count: total < 10 ? null : Math.round(total * 0.18) + mine.filter(([, s]) => s.report!.suggest_talk).length };
        }),
        recent: done.map(([sid, s]) => ({ session_id: sid, student: brief(s.student_id), instrument_name: s.report!.instrument_name, headline: s.report!.headline, suggest_talk: s.report!.suggest_talk, created_at: s.report!.created_at })).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20),
      };
    },

    // ── 规则、名册、公告 ──
    riskRuleList: () => S.rules,
    riskRuleUpdate: (c) => {
      const b = parse(M.RiskRuleUpdateReq, c.body);
      const rule = S.rules.find((x) => x.id === c.params.id) ?? notFound('规则');
      if (!b.enabled && rule.level === 'L3') throw new MockError(409, 'CONFLICT', '安全底线规则不能关闭', '学生主动求助和危险表达必须始终有人回应');
      rule.enabled = b.enabled;
      return rule;
    },
    rosterPreview: (c): M.RosterResult => {
      const b = parse(M.RosterPreviewReq, c.body);
      const errors: M.RosterResult['errors'] = [], seen = new Set<string>();
      b.rows.forEach((r, i) => {
        const row = i + 1;
        if (!r.name.trim()) errors.push({ row, field: '姓名', message: '不能为空' });
        if (!/^[A-Za-z]?\d{8,19}$/.test(r.sno.trim())) errors.push({ row, field: '学籍号', message: '格式不对，应为 8—19 位数字（可带一位字母前缀）' });
        else if (seen.has(r.sno.trim())) errors.push({ row, field: '学籍号', message: '和前面的行重复' });
        seen.add(r.sno.trim());
        if (!/年级.*班/.test(r.class_name)) errors.push({ row, field: '班级', message: '请写成“八年级（3）班”这样的格式' });
        if (r.guardian_phone && !/^1\d{10}$/.test(r.guardian_phone.trim())) errors.push({ row, field: '监护人手机号', message: '应为 11 位手机号' });
      });
      const bad = new Set(errors.map((e) => e.row)).size;
      return { total: b.rows.length, valid: b.rows.length - bad, errors };
    },
    rosterCommit: (c): M.RosterResult => {
      const b = parse(M.RosterPreviewReq, c.body);
      const valid = b.rows.filter((r) => r.name.trim() && /^[A-Za-z]?\d{8,19}$/.test(r.sno.trim()) && /年级.*班/.test(r.class_name)).length;
      S.rosterImported += valid;
      return { total: b.rows.length, valid, errors: [], imported: valid };
    },
    announcementList: (c) => {
      const mine = c.user.roles.includes(Role.student) ? 'students' : c.user.roles.includes(Role.guardian) ? 'guardians' : 'teachers';
      const staff = mine === 'teachers';
      return S.announcements.filter((a) => staff || a.audience === 'all' || a.audience === mine);
    },
    announcementCreate: (c) => {
      const b = parse(M.AnnouncementCreateReq, c.body);
      const a: M.Announcement = { id: id('an'), ...b, author: c.user.name, created_at: iso() };
      S.announcements.unshift(a);
      const to = users.filter((u) => b.audience === 'all' || (b.audience === 'students' && u.roles.includes(Role.student)) || (b.audience === 'guardians' && u.roles.includes(Role.guardian)) || (b.audience === 'teachers' && !u.roles.includes(Role.student) && !u.roles.includes(Role.guardian)));
      notify([...to.map((u) => u.id), ...(b.audience === 'all' || b.audience === 'students' ? students.map((s) => s.id) : [])], 'system', b.title, b.body.slice(0, 60), { page: 'announcements' });
      return a;
    },

    // ── 导出审批、紧急访问 ──
    exportCreate: (c) => {
      const b = parse(M.ExportCreateReq, c.body);
      const job: M.ExportJob = { id: id('ex'), scope: b.scope, requester_name: c.user.name, requester_role: c.user.roles[0], reason: b.reason, status: 'pending', watermark: `${c.user.name} · 待批准`, created_at: iso() };
      S.exportsList.unshift(job);
      notify([...S.byRole(Role.schoolLeader), ...S.byRole(Role.eduAdmin)].filter((u) => u !== c.user.id), 'system', '有一条导出申请等你批准', `${c.user.name}申请导出“${EXPORT_SCOPE_LABEL[b.scope]}”。`, { page: 'exports' });
      return job;
    },
    exportList: (c) => S.exportsList.filter((j) => c.user.roles.some((r) => [Role.schoolLeader, Role.eduAdmin, Role.auditor].includes(r as never)) || j.requester_name === c.user.name),
    exportApprove: (c) => {
      const b = parse(M.ExportApproveReq, c.body);
      const job = S.exportsList.find((j) => j.id === c.params.id) ?? notFound('导出申请');
      if (job.status !== 'pending') throw new MockError(409, 'CONFLICT', '这条申请已经处理过了');
      if (job.requester_name === c.user.name) throw new MockError(403, 'FORBIDDEN', '不能批准自己的申请');
      Object.assign(job, b.approve ? { status: 'approved', expires_at: iso(DAY), downloads_left: 3, watermark: `${job.requester_name} · ${dateOf(0)} · 经${c.user.name}批准` } : { status: 'rejected' });
      notify(users.filter((u) => u.name === job.requester_name).map((u) => u.id), 'system', b.approve ? '你的导出申请已批准' : '你的导出申请没有通过', b.approve ? '24 小时内有效，最多下载 3 次，文件带水印。' : '如有需要，请补充理由后重新申请。', { page: 'exports' });
      return job;
    },
    breakGlass: (c): M.AccessGrant => {
      const b = parse(M.BreakGlassReq, c.body);
      const x = S.cases.find((k) => k.id === c.params.id) ?? notFound('个案');
      if (x.level !== 'L3' && x.level !== 'L2') throw new MockError(403, 'FORBIDDEN', '紧急访问只用于需要重点或紧急支持的个案');
      const g: M.AccessGrant = { id: id('ag'), case_id: x.id, case_no: x.case_no, user_name: c.user.name, reason: b.reason, created_at: iso(), expires_at: iso(b.minutes * 60_000), reviewed: false };
      S.grants.unshift(g);
      notify([...S.byRole(Role.auditor), ...S.byRole(Role.schoolLeader)].filter((u) => u !== c.user.id), 'system', `${c.user.name}发起了紧急访问`, `案件号 ${x.case_no}，${b.minutes} 分钟后自动收回，需要事后复核。`, { page: 'grants' });
      return g;
    },
    accessGrantList: () => S.grants,
    accessGrantReview: (c) => {
      const g = S.grants.find((x) => x.id === c.params.id) ?? notFound('紧急访问记录');
      g.reviewed = true;
      g.reviewed_by = c.user.name;
      return g;
    },

    // ── 区域报告、系统状态 ──
    regionDocument: (c): M.RegionDocument => {
      const r = F.REGION_REPORT, pct = (v: number | null) => (v === null ? '样本不足' : `${Math.round(v * 100)}%`);
      const shown = r.schools.filter((s) => !s.suppressed);
      return {
        title: '区域青少年发展支持月度报告', period: r.period, generated_at: iso(), watermark: `${c.user.name} · ${dateOf(0)} · 仅限内部使用`,
        sections: [
          { heading: '一、本月概况', paragraphs: [`本月全区新识别需要关注的学生 ${r.new_focus} 人，全部经教师人工确认。有效支持闭环率为 ${pct(r.escr)}，较上月提高 3 个百分点。`, `紧急求助 15 分钟内有人回应的比例为 ${pct(r.l3_ack_within_15m_rate)}；转介后 30 天内收到反馈的比例为 ${pct(r.referral_closure_rate)}。`] },
          { heading: '二、提醒从哪里来', paragraphs: ['本月的提醒来源构成如下。学生主动求助的比例上升，说明学生更愿意开口。'], bullets: (r.sources ?? []).map((s) => `${s.label}：${s.count} 条`) },
          { heading: '三、各校使用情况', paragraphs: ['按校名排序，不作排名。学生数不足 10 人的学校不展示具体数值。'], bullets: [...shown.map((s) => `${s.school_name}：学生月活 ${pct(s.student_active_rate)}，教师周活 ${pct(s.teacher_active_rate)}，闭环率 ${pct(s.closure_rate)}`), ...r.schools.filter((s) => s.suppressed).map((s) => `${s.school_name}：样本不足，暂不展示`)] },
          { heading: '四、五育活动参与', paragraphs: ['本月各类活动的学生参与率：'], bullets: (r.five_edu ?? []).map((e) => `${FIVE_EDU_NAME[e.edu]}：${pct(e.rate)}`) },
          { heading: '五、需要关注的问题', paragraphs: [], bullets: ['演示第三中学教师端连续两个月活跃度偏低，建议了解是否存在培训或人手方面的困难。', '美育和德育类活动参与率低于其他类别，建议下月由团委牵头增加社区活动供给。', '本月有 1 条紧急提醒超过 15 分钟才得到回应，已完成复盘。'] },
          { heading: '六、下月建议', paragraphs: [], bullets: ['期末前两周，面向初三年级推送“考试前后”专题内容。', '为演示第三中学安排一次教师端使用培训。', '寒假前发布“假期不白过”学习计划和社区成长营报名。'] },
        ],
      };
    },
    systemHealth: (): M.SystemHealth => ({
      uptime_30d: 0.9987, l3_notice_delivery_rate: 0.991,
      services: [{ name: '接口服务', status: 'ok', latency_ms: 86 }, { name: '数据库', status: 'ok', latency_ms: 12 }, { name: '缓存与队列', status: 'ok', latency_ms: 3 }, { name: '对象存储', status: 'ok', latency_ms: 41 }, { name: '短信通道', status: 'slow', latency_ms: 2300 }, { name: 'AI 模型网关', status: 'ok', latency_ms: 940 }],
      queues: [{ name: '通知', depth: 2, failed: 0 }, { name: '报表', depth: 0, failed: 0 }, { name: '导出', depth: 1, failed: 0 }, { name: '到期删除', depth: 0, failed: 0 }],
    }),

    // ── 帮助、反馈、点赞 ──
    helpFaqs: (c): M.Faq[] => {
      const list = c.user.roles.includes(Role.student) ? F.FAQS_STUDENT : c.user.roles.includes(Role.guardian) ? F.FAQS_GUARDIAN : F.FAQS_STAFF;
      return list.map(([group, q, a], i) => ({ id: `faq${i + 1}`, group, q, a }));
    },
    feedbackCreate: (c) => {
      const b = parse(M.FeedbackCreateReq, c.body);
      S.feedback.push({ user_id: c.user.id, kind: b.kind, text: b.text, at: iso() });
      notify(S.byRole(Role.operator), 'system', '收到一条使用反馈', b.text.slice(0, 40), { page: 'health' });
      return { ok: true };
    },
    postLike: (c): M.LikeResult => {
      const p = S.posts.find((x) => x.id === c.params.id) ?? notFound('帖子');
      const set = S.setOf(S.likes, p.id);
      set.has(c.user.id) ? set.delete(c.user.id) : set.add(c.user.id);
      return { liked: set.has(c.user.id), like_count: p.base_likes + set.size };
    },
  };
}

export { HOUR };
