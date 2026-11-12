/**
 * 后端验收脚本：对一个正在运行的后端发真实 HTTP 请求，逐条检查契约与产品红线。
 * 用法：先启动后端（或 npm run mock），再在根目录执行 npm run accept
 *       指定地址：node contracts/tools/accept.cjs http://192.168.1.20:3000
 * 全部通过 = 前后端可以直接联调。脚本会写入数据，请对着刚启动、带种子数据的服务运行。
 */
const { Routes, buildPath, fixtures } = require('../dist');

const BASE = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const tokens = {};
let passed = 0;
const failures = [];

async function http(routeName, { token, params, query, body, purpose } = {}) {
  const route = Routes[routeName];
  const qs = query ? '?' + new URLSearchParams(query) : '';
  const headers = { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() };
  if (token) headers.authorization = `Bearer ${token}`;
  const p = purpose === undefined ? route.purpose : purpose;
  if (p) headers['x-purpose-code'] = p;
  const res = await fetch(BASE + buildPath(route, params) + qs, { method: route.method, headers, body: route.method === 'GET' ? undefined : JSON.stringify(body ?? {}) });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* 非 JSON */ }
  return { status: res.status, body: json, type: res.headers.get('content-type') || '' };
}
async function login(account) {
  if (!tokens[account]) {
    const r = await http('authDevLogin', { body: { account } });
    if (r.status >= 300) throw new Error(`演示账号 ${account} 无法登录（${r.status}）`);
    tokens[account] = r.body.access_token;
  }
  return tokens[account];
}
/** as('student01')('homeGet', {...}) */
const as = (account) => async (routeName, opts = {}) => http(routeName, { ...opts, token: await login(account) });

function ok(cond, msg) { if (!cond) throw new Error(msg); }
const is2xx = (r) => r.status >= 200 && r.status < 300;
const expectOk = (r, what) => ok(is2xx(r), `${what} 应成功，实际 ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`);
const expectErr = (r, status, code, what) => ok(r.status === status && r.body?.code === code, `${what} 应返回 ${status} ${code}，实际 ${r.status} ${r.body?.code}`);
/** 学生/家长可见的响应里不得出现等级与污名化用语 */
const cleanForStudent = (obj, what) => {
  const s = JSON.stringify(obj);
  const hit = /"level"|\bL[0-3]\b|风险|高危|抑郁|焦虑症|障碍|问题学生/.exec(s);
  ok(!hit, `${what} 的响应里出现了不该给学生/家长看的内容：${hit && hit[0]}`);
};

async function t(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(name); console.log(`  ✗ ${name}\n      ${e.message}`); }
}
const group = (title) => console.log(`\n${title}`);

(async () => {
  console.log(`验收对象：${BASE}`);
  const student = as('student01'), student2 = as('student02'), parent = as('parent01'), teacher = as('teacher01'), psy = as('psy01');
  const leader = as('leader01'), edu = as('edu01'), ops = as('ops01'), auditor = as('audit01'), inst = as('inst01');
  const shared = {};

  group('一、基础约定');
  await t('健康检查可访问', async () => expectOk(await http('health'), 'GET /health'));
  await t('演示账号可登录，未知账号 401', async () => {
    ok(await login('student01'), '缺少 access_token');
    expectErr(await http('authDevLogin', { body: { account: 'nobody' } }), 401, 'UNAUTHENTICATED', '未知账号');
  });
  await t('未登录访问受保护接口返回 401，错误体是 problem+json', async () => {
    const r = await http('me');
    expectErr(r, 401, 'UNAUTHENTICATED', 'GET /me');
    ok(r.type.includes('application/problem+json'), `错误响应的 Content-Type 应为 application/problem+json，实际 ${r.type}`);
    ok(r.body.title && r.body.status === 401, '错误体缺少 title / status');
  });
  await t('/me 返回角色与目的码', async () => {
    const r = await student('me');
    expectOk(r, 'GET /me');
    ok(r.body.roles.includes('student') && Array.isArray(r.body.purposes) && r.body.student_id, 'Me 缺少 roles / purposes / student_id');
  });
  await t('角色不符返回 403 FORBIDDEN', async () => expectErr(await student('alertList'), 403, 'FORBIDDEN', '学生访问预警列表'));
  await t('不带目的码返回 403 PURPOSE_DENIED', async () => expectErr(await student('checkInList', { purpose: null }), 403, 'PURPOSE_DENIED', '不带 X-Purpose-Code'));
  await t('目的码不匹配返回 403 PURPOSE_DENIED', async () => expectErr(await student('checkInList', { purpose: 'PUR-03' }), 403, 'PURPOSE_DENIED', '错误的 X-Purpose-Code'));
  await t('参数不合法返回 422 VALIDATION_FAILED', async () => expectErr(await student('checkInCreate', { body: { mood: 'not-a-mood' } }), 422, 'VALIDATION_FAILED', '非法心情值'));
  await t('教师账号密码登录', async () => {
    expectOk(await http('authPasswordLogin', { body: { account: 'teacher01', password: fixtures.DEMO_PASSWORD } }), '正确密码');
    expectErr(await http('authPasswordLogin', { body: { account: 'teacher01', password: 'wrong-password' } }), 401, 'UNAUTHENTICATED', '错误密码');
  });
  await t('新同学激活流程：未激活 → 学校码错误 422 → 激活成功', async () => {
    const first = await http('authDevLogin', { body: { account: 'student02' } });
    ok(first.body.activated === false, 'student02 初始应为未激活');
    expectErr(await student2('authActivate', { body: { school_code: 'WRONG1', sno_last4: '0002' } }), 422, 'VALIDATION_FAILED', '错误学校码');
    expectOk(await student2('authActivate', { body: { school_code: fixtures.DEMO_SCHOOL_CODE, sno_last4: '0002' } }), '激活');
    ok((await http('authDevLogin', { body: { account: 'student02' } })).body.activated === true, '激活后 activated 应为 true');
  });

  group('二、学生日常');
  await t('首页一次拿齐：7 天心情、小行动、推荐内容；没有连续天数', async () => {
    const r = await student('homeGet');
    expectOk(r, 'GET /home');
    ok(r.body.week.length === 7 && r.body.micro_action?.title && Array.isArray(r.body.recommended), 'HomeFeed 结构不完整');
    ok(!/streak|连续/.test(JSON.stringify(r.body)), '首页不应返回连续打卡天数');
    cleanForStudent(r.body, '首页');
  });
  await t('打卡成功；同一 client_id 重复提交返回同一条', async () => {
    const client_id = crypto.randomUUID();
    const a = await student('checkInCreate', { body: { mood: 'good', note: '验收脚本', client_id } });
    const b = await student('checkInCreate', { body: { mood: 'good', note: '验收脚本', client_id } });
    expectOk(a, '打卡');
    ok(a.body.id && a.body.id === b.body.id, '相同 client_id 应幂等');
    const list = await student('checkInList');
    ok(list.body.items.some((x) => x.id === a.body.id) && 'next_cursor' in list.body, '打卡列表应包含新记录，且为 { items, next_cursor }');
    ok((await student('homeGet')).body.today_check_in?.id === a.body.id, '首页 today_check_in 应为刚才的打卡');
  });
  await t('成长护照：优势、五育印记、记录、寄语', async () => {
    const r = await student('passportGet');
    expectOk(r, 'GET /passport');
    ok(r.body.stamps.length === 5 && Array.isArray(r.body.records) && Array.isArray(r.body.strengths), 'Passport 结构不完整');
    ok(!/rank|排名|score|分数/.test(JSON.stringify(r.body)), '成长护照不应包含排名或分数');
  });
  await t('同意中心：基础服务不可撤回；撤回“成长问卷”后开始测评被拒；重新同意后可用', async () => {
    const p = await student('mePrivacy');
    ok(p.body.consents.length >= 6 && Array.isArray(p.body.access_logs), '隐私仪表盘结构不完整');
    expectErr(await student('consentRevoke', { params: { purpose: 'service' } }), 409, 'CONFLICT', '撤回基础服务');
    ok((await student('consentRevoke', { params: { purpose: 'assessment' } })).body.granted === false, '撤回后 granted 应为 false');
    expectErr(await student('assessmentStart', { body: { instrument_id: 'ins2' } }), 403, 'CONSENT_REQUIRED', '未同意时开始测评');
    ok((await student('consentGrant', { body: { purpose: 'assessment' } })).body.granted === true, '重新同意后 granted 应为 true');
  });

  group('三、测评');
  await t('学生能看到娱乐量表，心理教师看不到', async () => {
    const s = await student('instrumentList'), p = await psy('instrumentList');
    ok(s.body.some((i) => i.kind === 'entertainment'), '学生列表应含娱乐量表');
    ok(!p.body.some((i) => i.kind === 'entertainment'), '教师列表不应含娱乐量表');
    ok(s.body.every((i) => i.disclaimer && i.item_count > 0), '每份问卷都要有非诊断声明与题数');
  });
  await t('作答并提交：报告用“状态/建议”表述；结果偏低时给教师生成一条待确认提醒', async () => {
    const start = await student('assessmentStart', { body: { instrument_id: 'ins2' } });
    expectOk(start, '开始测评');
    ok(start.body.items.length === start.body.instrument.item_count && start.body.options.length >= 2, '题目或选项缺失');
    const top = Math.max(...start.body.options.map((o) => o.value));
    const answers = start.body.items.map((_, i) => (i === 0 ? null : top)); // 第一题跳过
    const rep = await student('assessmentSubmit', { params: { id: start.body.id }, body: { answers } });
    expectOk(rep, '提交测评（含跳过题）');
    ok(rep.body.headline && rep.body.suggestions.length && rep.body.disclaimer && rep.body.suggest_talk === true, '报告结构不完整，或高分未提示“想找人聊聊”');
    ok(!/抑郁症|焦虑症|障碍|确诊|诊断为|高危|高风险/.test(JSON.stringify(rep.body)), '报告出现了诊断或污名化用语');
    shared.sessionId = start.body.id;
    const alerts = await teacher('alertList');
    ok(alerts.body.items.some((a) => a.source === 'assessment_rule' && a.student.id === 's1' && a.status === 'open'), '应生成一条来自测评规则、等待人工确认的提醒');
  });
  await t('测评报告：心理教师可读且含原始分；班主任不可读', async () => {
    const p = await psy('assessmentReport', { params: { id: shared.sessionId } });
    expectOk(p, '心理教师读报告');
    ok(typeof p.body.raw_score === 'number', '心理教师应能看到 raw_score');
    expectErr(await teacher('assessmentReport', { params: { id: shared.sessionId } }), 403, 'FORBIDDEN', '班主任读报告');
  });
  await t('娱乐量表：有免责声明，提交后不保存，不生成提醒', async () => {
    const before = (await teacher('alertList')).body.items.length;
    const start = await student('assessmentStart', { body: { instrument_id: 'ins3' } });
    ok(/非医学|非诊断/.test(start.body.instrument.disclaimer), '娱乐量表缺少“非医学、非诊断”声明');
    const rep = await student('assessmentSubmit', { params: { id: start.body.id }, body: { answers: start.body.items.map(() => 1) } });
    expectOk(rep, '提交娱乐量表');
    ok(rep.body.raw_score === undefined, '娱乐量表不应返回原始分');
    ok((await student('assessmentReport', { params: { id: start.body.id } })).status === 404, '娱乐量表结果不应被保存');
    ok((await teacher('alertList')).body.items.length === before, '娱乐量表不应触发提醒');
  });

  group('四、求助与预警');
  await t('学生一键求助：返回“谁会在多久内联系你”，不含等级', async () => {
    const r = await student('signalCreate', { body: { source: 'one_click_help', contact_preference: ['teacher'] } });
    expectOk(r, '一键求助');
    ok(r.body.alert_id && r.body.next && r.body.notified.length >= 2 && r.body.sla.acknowledge_by, 'SignalCreated 结构不完整');
    cleanForStudent(r.body, '求助');
    shared.helpAlert = r.body.alert_id;
  });
  await t('班主任立刻看到这条提醒：最高等级、15 分钟时限', async () => {
    const a = (await teacher('alertList')).body.items.find((x) => x.id === shared.helpAlert);
    ok(a, '班主任的提醒列表里没有这条求助');
    ok(a.level === 'L3' && a.status === 'open' && a.reason, '求助应为 L3 / open，且有可解释的原因');
    const mins = (Date.parse(a.due_at) - Date.now()) / 60000;
    ok(mins > 5 && mins <= 16, `确认时限应约为 15 分钟，实际 ${mins.toFixed(1)} 分钟`);
  });
  await t('确认提醒后记录确认人与时间', async () => {
    const r = await teacher('alertAck', { params: { id: shared.helpAlert } });
    expectOk(r, '确认提醒');
    ok(r.body.status === 'acked' && r.body.acked_by_name && r.body.acked_at, '确认后应有 acked_by_name / acked_at');
  });
  await t('家长端：危机时出现三步指引；任何时候都没有分数和等级', async () => {
    const r = await parent('guardianSummary');
    expectOk(r, 'GET /guardian/summary');
    ok(r.body.crisis_notice && r.body.crisis_notice.steps.length >= 2, '孩子求助后家长应看到 crisis_notice');
    ok(r.body.week_text && r.body.suggestions.length && r.body.task?.title, 'GuardianSummary 结构不完整');
    cleanForStudent(r.body, '家长摘要');
    ok(!/raw_score|"score"|answers|逐题/.test(JSON.stringify(r.body)), '家长摘要不应含分数或作答');
  });
  await t('教师上报 → 升级 → 标记不需要关注（必须写原因）', async () => {
    const s = await teacher('signalCreate', { body: { student_id: 's4', source: 'teacher_observation', message: '验收：课堂上趴桌' } });
    expectOk(s, '教师上报');
    const up = await teacher('alertEscalate', { params: { id: s.body.alert_id } });
    ok(up.body.status === 'escalated' && up.body.level === 'L2', '升级后应为 escalated / L2');
    expectErr(await teacher('alertDismiss', { params: { id: s.body.alert_id }, body: {} }), 422, 'VALIDATION_FAILED', '不写原因的误报');
    ok((await teacher('alertDismiss', { params: { id: s.body.alert_id }, body: { reason: '验收：已当面了解，无需关注' } })).body.status === 'dismissed', '标记后应为 dismissed');
  });
  await t('谈话记录 3 步保存；学生卡片可见；学生在隐私仪表盘看到“班主任看过”', async () => {
    const before = (await student('mePrivacy')).body.access_logs.length;
    const o = await teacher('observationCreate', { body: { student_id: 's1', scene: 'break', dimensions: ['emotion'], note: '验收：课间聊了几句，状态还可以。', next_step: 'keep_watching' } });
    expectOk(o, '保存谈话记录');
    const card = await teacher('studentCard', { params: { id: 's1' } });
    expectOk(card, '学生卡片');
    ok(card.body.mood_week.length === 7 && card.body.observations.some((x) => x.id === o.body.id) && card.body.scripts.length, 'StudentCard 结构不完整');
    ok(!/"note":"验收脚本"/.test(JSON.stringify(card.body.mood_week)), '班主任不应看到打卡题记原文');
    const after = (await student('mePrivacy')).body.access_logs;
    ok(after.length > before && after[0].viewer && after[0].what, '教师查看后，学生的访问记录应新增一条');
  });
  await t('班级看板：关注清单不超过 5 人，7 天整体心情分布；看别的班被拒', async () => {
    const r = await teacher('classBoard', { params: { id: fixtures.CLASS_ID } });
    expectOk(r, '班级看板');
    ok(r.body.focus.length <= 5 && r.body.mood_trend.length === 7 && r.body.students.length === r.body.student_count, 'ClassBoard 结构不完整');
    ok(!/rank|排名/.test(JSON.stringify(r.body)), '班级看板不应有排名');
    ok([403, 404].includes((await teacher('classBoard', { params: { id: 'not-my-class' } })).status), '查看非本班应 403 或 404');
  });
  await t('教体局、审计员不能看个体提醒', async () => {
    expectErr(await edu('alertList'), 403, 'FORBIDDEN', '教体局看提醒');
    expectErr(await auditor('alertList'), 403, 'FORBIDDEN', '审计员看提醒');
  });

  group('五、个案与转介');
  await t('建案得到案件号；没有支持计划不能进入跟进；非法状态迁移 409', async () => {
    const c = await psy('caseCreate', { body: { student_id: 's4', level: 'L1' } });
    expectOk(c, '建案');
    ok(/^[A-Z]+-\d{4}-\d+$/.test(c.body.case_no) && c.body.status === 'pending_confirm' && c.body.timeline.length >= 1, '新个案应有案件号、待确认状态与时间线');
    shared.caseId = c.body.id;
    expectErr(await psy('caseUpdate', { params: { id: c.body.id }, body: { status: 'following' } }), 422, 'VALIDATION_FAILED', '无计划进入跟进');
    const plan = { goal: '两周内恢复课堂参与', owner: '周老师', frequency: '每周一次', review_at: '2026-12-01' };
    ok((await psy('caseUpdate', { params: { id: c.body.id }, body: { status: 'following', plan } })).body.status === 'following', '带计划后应进入跟进中');
    expectErr(await psy('caseUpdate', { params: { id: c.body.id }, body: { status: 'pending_confirm' } }), 409, 'ILLEGAL_TRANSITION', '跟进中退回待确认');
    expectErr(await psy('caseUpdate', { params: { id: c.body.id }, body: { status: 'closed' } }), 422, 'VALIDATION_FAILED', '无摘要结案');
  });
  await t('干预记录进时间线；班主任能看个案但看不到心理教师的面谈内容', async () => {
    const r = await psy('caseIntervention', { params: { id: shared.caseId }, body: { type: 'counseling', note: '验收机密：面谈细节不应被班主任看到' } });
    expectOk(r, '写干预记录');
    ok(r.body.timeline.some((e) => e.type === 'intervention'), '时间线应新增干预记录');
    const t1 = await teacher('caseGet', { params: { id: shared.caseId } });
    expectOk(t1, '班主任看本班个案');
    ok(!JSON.stringify(t1.body).includes('验收机密'), '班主任看到了心理教师的面谈内容');
  });
  await t('转介：生成最小必要包 → 机构只看到脱敏姓名 → 确认接收 → 反馈回到个案', async () => {
    const ref = await psy('caseRefer', { params: { id: shared.caseId }, body: { institution_id: 'in1', reason: '验收：建议专业评估睡眠问题' } });
    expectOk(ref, '发起转介');
    ok(ref.body.status === 'sent' && ref.body.expires_at && !JSON.stringify(ref.body).includes('验收机密'), '转介包应为 sent、有有效期，且不含面谈内容');
    ok((await psy('caseGet', { params: { id: shared.caseId } })).body.status === 'referred', '转介后个案应为 referred');
    const mine = (await inst('referralList')).body.items.find((x) => x.id === ref.body.id);
    ok(mine, '机构的转介列表里没有这条');
    ok(mine.student.name.includes('*') && !JSON.stringify(mine).includes('验收机密'), '机构看到的学生姓名应脱敏，且没有面谈内容');
    ok((await inst('referralAccept', { params: { id: ref.body.id } })).body.status === 'accepted', '确认接收后应为 accepted');
    ok((await inst('referralFeedback', { params: { id: ref.body.id }, body: { visited: true, advice: '验收：建议规律作息，两周后复诊' } })).body.status === 'feedback_received', '反馈后应为 feedback_received');
    const c = await psy('caseGet', { params: { id: shared.caseId } });
    ok(c.body.referral?.feedback?.advice && c.body.timeline.some((e) => e.type === 'feedback'), '机构反馈应回到个案');
  });
  await t('结案必须写摘要；结案后不能再变更', async () => {
    ok((await psy('caseUpdate', { params: { id: shared.caseId }, body: { status: 'closed', close_summary: '验收：状态恢复，转为日常观察' } })).body.status === 'closed', '结案');
    expectErr(await psy('caseUpdate', { params: { id: shared.caseId }, body: { status: 'following' } }), 409, 'ILLEGAL_TRANSITION', '结案后重开');
  });
  await t('学生、家长不能访问个案接口', async () => {
    expectErr(await student('caseList'), 403, 'FORBIDDEN', '学生看个案');
    expectErr(await parent('caseList'), 403, 'FORBIDDEN', '家长看个案');
  });

  group('六、内容与生涯');
  await t('内容流只有已发布内容，可按频道筛选，每条有来源与适龄标签', async () => {
    const r = await student('contentFeed');
    expectOk(r, '内容流');
    ok(r.body.items.length >= 3 && r.body.items.every((c) => c.status === 'published' && c.source && c.age_label), '内容流应只含已发布且带来源/适龄标签的内容');
    const one = await student('contentFeed', { query: { channel: 'psychology' } });
    ok(one.body.items.length && one.body.items.every((c) => c.channel === 'psychology'), '频道筛选无效');
    const d = await student('contentGet', { params: { id: r.body.items[0].id } });
    ok(d.body.body && d.body.author && d.body.license, '内容详情应有正文、作者、授权');
  });
  await t('内容发布走三审：缺授权 422；机审 → 团队二审 → 三审会签 → 发布；退回必须写原因', async () => {
    const draft = { channel: 'learning', type: 'article', title: '验收：错题本怎么用', summary: '验收用', body: '第一段。\n第二段。', source: '验收脚本', author: '验收', license: '自有内容' };
    expectErr(await ops('contentCreate', { body: { ...draft, license: '' } }), 422, 'VALIDATION_FAILED', '缺授权的内容');
    const c = await ops('contentCreate', { body: draft });
    expectOk(c, '创建内容');
    ok(c.body.status === 'team_review', `机审通过后应进入 team_review，实际 ${c.body.status}`);
    ok((await ops('contentReviewQueue')).body.items.some((i) => i.content.id === c.body.id && i.history.length >= 1), '审核队列应包含它并带机审记录');
    expectErr(await ops('contentReview', { params: { id: c.body.id }, body: { result: 'reject' } }), 422, 'VALIDATION_FAILED', '无原因退回');
    ok((await ops('contentReview', { params: { id: c.body.id }, body: { result: 'pass' } })).body.status === 'tri_party_review', '二审通过后应进入三审');
    ok(!(await student('contentFeed', { query: { limit: 100 } })).body.items.some((i) => i.id === c.body.id), '未过三审的内容不应出现在内容流');
    ok((await ops('contentReview', { params: { id: c.body.id }, body: { result: 'pass' } })).body.status === 'published', '三审通过后应发布');
    ok((await student('contentFeed', { query: { limit: 100 } })).body.items.some((i) => i.id === c.body.id), '发布后应出现在内容流');
  });
  await t('生涯卡：每张都有来源和更新时间，可按类型筛选', async () => {
    const r = await student('careerCards');
    ok(r.body.length >= 4 && r.body.every((c) => c.source && c.updated_at && c.sections.length), '生涯卡缺少来源/更新时间/内容');
    const jobs = await student('careerCards', { query: { type: 'job' } });
    ok(jobs.body.length && jobs.body.every((c) => c.type === 'job'), '类型筛选无效');
  });

  group('七、AI 成长助手');
  await t('普通提问：有回答、有来源、可续聊', async () => {
    const r = await student('aiChat', { body: { message: '我以后想当护士，初中要准备什么？' } });
    expectOk(r, 'AI 提问');
    ok(r.body.kind === 'answer' && r.body.answer.length > 10 && r.body.sources.length >= 1 && r.body.session_id, 'AI 回答应带来源与 session_id');
    ok(!/你有抑郁|诊断|吃.{0,4}药/.test(r.body.answer), 'AI 回答不应出现诊断或用药建议');
    ok((await student('aiChat', { body: { session_id: r.body.session_id, message: '助学金怎么申请' } })).body.session_id === r.body.session_id, '续聊应沿用 session_id');
  });
  await t('危机表达：立刻停止对话、给出求助指引，并通知老师', async () => {
    const r = await student('aiChat', { body: { message: '我觉得活着没意思，不想活了' } });
    ok(r.body.kind === 'crisis' && /12355/.test(r.body.answer), '命中危机表达时应返回 kind=crisis 并给出 12355');
    ok((await teacher('alertList')).body.items.some((a) => a.source === 'ai_guardrail' && a.level === 'L3'), '应为老师生成一条 L3 提醒');
  });

  group('八、成长圈');
  await t('学生发帖：前几条先审后发，自己能看到、别人看不到；只显示昵称', async () => {
    const circles = await student('circleList');
    ok(circles.body.length >= 2 && circles.body.every((c) => c.rules.length), '圈子列表应有规则说明');
    const p = await student('postCreate', { params: { id: 'cr2' }, body: { content: '验收：我背单词的办法是每天早读前看十个。' } });
    expectOk(p, '发帖');
    ok(p.body.status === 'pending_review' && p.body.mine === true && p.body.nickname, '新用户发帖应为 pending_review，并带昵称');
    shared.postId = p.body.id;
    ok((await student('postList', { params: { id: 'cr2' } })).body.items.some((x) => x.id === p.body.id), '作者自己应能看到待审帖');
    const others = await student2('postList', { params: { id: 'cr2' } });
    ok(!others.body.items.some((x) => x.id === p.body.id), '其他同学不应看到待审帖');
    const raw = JSON.stringify(others.body);
    ok(!raw.includes(fixtures.SCHOOL_NAME) && !raw.includes(fixtures.CLASS_NAME) && !/"name"|author_id|student_id/.test(raw), '帖子里不应出现姓名、学校、班级或作者 id');
  });
  await t('含联系方式或外链的内容被拒', async () => {
    expectErr(await student('postCreate', { params: { id: 'cr2' }, body: { content: '加我微信一起学 13800000000' } }), 422, 'VALIDATION_FAILED', '含联系方式的帖子');
  });
  await t('举报进入审核队列；版主处理后帖子发布', async () => {
    expectOk(await student2('postReport', { params: { id: 'p5' }, body: { reason: 'other' } }), '举报');
    const q = await teacher('moderationQueue');
    ok(q.body.items.some((i) => i.post.id === shared.postId && i.why === 'new_user') && q.body.items.some((i) => i.post.id === 'p5' && i.why === 'reported'), '审核队列应同时有待审新帖与被举报帖');
    ok((await teacher('postModerate', { params: { id: shared.postId }, body: { action: 'approve' } })).body.status === 'published', '通过后应为 published');
    ok((await student2('postList', { params: { id: 'cr2' } })).body.items.some((x) => x.id === shared.postId), '通过后其他同学应能看到');
  });

  group('九、机构');
  await t('机构目录只展示已审核；入驻申请 → 运营审核 → 出现在目录', async () => {
    const list = await student('institutionList');
    ok(list.body.length >= 3 && list.body.every((i) => i.status === 'approved' && !i.license_no), '目录应只含已审核机构，且不暴露资质编号');
    const a = await http('institutionApply', { body: { name: '验收演示机构', type: 'counseling', district: '红塔区', intro: '验收脚本创建', services: ['家长课堂'], license_no: 'YS-0000', contact_name: '验收', contact_phone: '13900000000' } });
    expectOk(a, '入驻申请（免登录）');
    ok(a.body.status === 'applied' && !(await student('institutionList')).body.some((i) => i.id === a.body.id), '未审核的机构不应出现在目录');
    ok((await ops('institutionApplications')).body.some((i) => i.id === a.body.id), '运营应能看到申请');
    ok((await ops('institutionReview', { params: { id: a.body.id }, body: { approve: true } })).body.status === 'approved', '审核通过');
    ok((await student('institutionList')).body.some((i) => i.id === a.body.id), '审核通过后应出现在目录');
  });

  group('十、区域看板、管理与审计');
  await t('区域看板只有聚合；小样本学校的数值为 null；没有任何学生信息', async () => {
    const r = await edu('regionReport');
    expectOk(r, '区域看板');
    ok(r.body.trend.length >= 3 && r.body.schools.length >= 2 && 'escr' in r.body, 'RegionReport 结构不完整');
    const small = r.body.schools.filter((s) => s.suppressed);
    ok(small.length >= 1, '种子数据里应有一所样本不足 10 人的学校，用来演示小样本抑制');
    ok(small.every((s) => s.student_active_rate === null && s.teacher_active_rate === null && s.closure_rate === null), '被抑制的学校所有数值应为 null');
    const raw = JSON.stringify(r.body);
    ok(!fixtures.STUDENT_NAMES.some((n) => raw.includes(`"${n}"`)) && !/rank|排名/.test(raw), '区域看板不应含学生姓名或排名');
    expectOk(await leader('regionReport'), '校领导看看板');
    expectErr(await teacher('regionReport'), 403, 'FORBIDDEN', '班主任看区域看板');
  });
  await t('督办、组织树、租户列表', async () => {
    const sv = await edu('supervisionList');
    ok(sv.body.length >= 1 && sv.body.every((s) => s.school_name && s.detail), '督办列表结构不完整');
    ok(!fixtures.STUDENT_NAMES.some((n) => JSON.stringify(sv.body).includes(`"${n}"`)), '督办列表不应含学生姓名');
    ok((await edu('orgTree')).body[0]?.children?.length >= 1, '组织树应有层级');
    ok((await ops('tenantList')).body.length >= 2, '租户列表');
  });
  await t('审计：记录了写操作、敏感读取和被拒绝的访问；哈希链连续；审计员看不到业务数据', async () => {
    const r = await auditor('auditEvents', { query: { limit: 100 } });
    expectOk(r, '审计查询');
    const ev = r.body.items;
    ok(ev.length >= 10, `本次验收至少应产生 10 条审计事件，实际 ${ev.length}`);
    ok(ev.some((e) => e.result === 'deny'), '被拒绝的访问也应留痕');
    ok(ev.some((e) => e.purpose === 'PUR-02') && ev.every((e) => e.hash && e.action && e.created_at), '审计事件应带目的码、动作、时间、哈希');
    for (let i = 0; i < Math.min(ev.length - 1, 20); i++) ok(ev[i].prev_hash === ev[i + 1].hash, `哈希链在第 ${i} 条断开（列表按时间倒序，prev_hash 应等于上一条的 hash）`);
    ok(!JSON.stringify(ev).includes('验收机密'), '审计日志里不应有业务明文');
    expectErr(await auditor('caseList'), 403, 'FORBIDDEN', '审计员看个案');
  });

  console.log(`\n${failures.length ? '未通过' : '全部通过'}：${passed} 项通过，${failures.length} 项失败`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
})().catch((e) => { console.error('\n验收脚本无法继续：', e.message, '\n请确认后端已启动，且种子数据里有全部演示账号。'); process.exit(2); });
