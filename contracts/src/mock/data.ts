import { Purpose, Role } from '../enums';
import { PSYCHOLOGY } from './content/psychology';
import { LEARNING } from './content/learning';
import { CAREER, POLICY } from './content/career-policy';
import { CULTURE, FIVE_EDU, ROLE_MODEL } from './content/culture-edu-model';
import { PARENT, TEACHER } from './content/parent-teacher';
import { MORE_CAREERS } from './content/careers';
import { MORE_INSTRUMENTS } from './library-student';
import type {
  CareerCard, Circle, ConsentItem, ContentDetail, Institution, Me, OrgNode, Passport, RegionReport, SupervisionItem, TalkScript, Tenant,
} from '../dto';

/**
 * 合成数据。全部为虚构，不对应任何真实的人、学校或机构。
 * 后端可以直接把这里的内容当作种子数据导入，这样两端演示时看到的是同一批内容。
 */

export const TENANT_ID = 'tenant-demo';
export const SCHOOL_NAME = '云岭演示中学';
export const CLASS_ID = 'c1';
export const CLASS_NAME = '八年级（3）班';
/** 演示用：学生激活/家长绑定的学校码、短信验证码、教师端密码 */
export const DEMO_SCHOOL_CODE = 'YL2026';
export const DEMO_SMS_CODE = '123456';
export const DEMO_PASSWORD = 'demo123456';

export interface MockUser extends Me {
  account: string;
}

const base = { tenant_id: TENANT_ID, school_name: SCHOOL_NAME };
const klass = { class_id: CLASS_ID, class_name: CLASS_NAME };

/** 学生名单（班级看板用）。s1 即 student01 */
export const STUDENT_NAMES = [
  '青禾', '云舟', '小满', '松果', '星回', '阿朵', '石榴', '晚风', '禾木', '南星', '知夏', '山月',
  '阿诺', '梨花', '白露', '青松', '朝颜', '木棉', '稻香', '云雀', '石头', '小鱼', '阿彩', '晨星',
  '麦穗', '山茶', '流萤', '归雁', '春晓', '阿峰', '竹影', '知秋', '小禾', '北辰', '海棠', '远山',
];
export const studentId = (i: number) => `s${i + 1}`;

export const USERS: MockUser[] = [
  { account: 'student01', id: 's1', student_id: 's1', name: '青禾', nickname: '追云的山雀', roles: [Role.student], purposes: [Purpose.growth, Purpose.crisis], ...base, ...klass },
  { account: 'student02', id: 's2', student_id: 's2', name: '云舟', nickname: '湖边的风', roles: [Role.student], purposes: [Purpose.growth, Purpose.crisis], ...base, ...klass },
  { account: 'parent01', id: 'g1', name: '青禾妈妈', roles: [Role.guardian], purposes: [Purpose.growth], ...base, children: [{ id: 's1', name: '青禾', class_name: CLASS_NAME }] },
  { account: 'parent02', id: 'g2', name: '新家长', roles: [Role.guardian], purposes: [Purpose.growth], ...base, children: [] },
  { account: 'teacher01', id: 't1', name: '李老师', roles: [Role.headTeacher], purposes: [Purpose.growth, Purpose.crisis], ...base, ...klass },
  { account: 'psy01', id: 't2', name: '周老师', roles: [Role.psychologist], purposes: [Purpose.growth, Purpose.crisis], ...base },
  { account: 'leader01', id: 't3', name: '杨校长', roles: [Role.schoolLeader], purposes: [Purpose.crisis, Purpose.stats], ...base },
  { account: 'schooladmin01', id: 't4', name: '学校信息员', roles: [Role.schoolAdmin], purposes: [Purpose.growth], ...base },
  { account: 'edu01', id: 'e1', name: '教体局德育科', roles: [Role.eduAdmin], purposes: [Purpose.stats], tenant_id: TENANT_ID },
  { account: 'cmt01', id: 'm1', name: '团市委学少部', roles: [Role.committee], purposes: [Purpose.growth], tenant_id: TENANT_ID },
  { account: 'inst01', id: 'i1', name: '王医生', roles: [Role.institution], purposes: [Purpose.crisis], tenant_id: TENANT_ID, institution_name: '演示区妇幼保健院临床心理科' },
  { account: 'ops01', id: 'o1', name: '平台运营', roles: [Role.operator], purposes: [Purpose.growth], tenant_id: TENANT_ID },
  { account: 'audit01', id: 'a1', name: '审计员', roles: [Role.auditor], purposes: [Purpose.audit], tenant_id: TENANT_ID },
];
/** 这两个账号登录后 activated = false，用来演示激活/绑定流程 */
export const UNACTIVATED = ['student02', 'parent02'];

export const CONSENTS: ConsentItem[] = [
  { purpose: 'service', title: '基础服务', description: '用你的学校和班级信息确认身份，让你能打卡、看内容、求助。', required: true, granted: true, version: 'demo-1' },
  { purpose: 'assessment', title: '成长问卷', description: '保存你的问卷结果。你自己和学校心理老师能看到，家长只看到建议，看不到分数。', required: false, granted: true, version: 'demo-1' },
  { purpose: 'ai', title: 'AI 成长助手', description: '保存你和助手的对话 30 天，用来接着聊。不会拿去训练模型，你可以随时删除。', required: false, granted: true, version: 'demo-1' },
  { purpose: 'community', title: '成长圈', description: '在圈子里用昵称发帖和评论。别人看不到你的姓名、学校和班级。', required: false, granted: true, version: 'demo-1' },
  { purpose: 'referral', title: '转介给专业机构', description: '需要时，把最少的必要信息交给医院或咨询机构。每次转介前都会再问你和家长。', required: false, granted: false, version: 'demo-1' },
  { purpose: 'guardian_trend', title: '向家长开放心情趋势', description: '家长每周能看到你的整体状态。不打开时，家长只收到通用的陪伴建议。', required: false, granted: false, version: 'demo-1' },
];


const body = (...p: string[]) => p.join('\n');
const pub = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

const BASE_CONTENTS: ContentDetail[] = [
  {
    id: 'ct1', channel: 'learning', type: 'article', title: '考前睡不着，可以试试这三步', summary: '不是让你“别紧张”，而是给身体一个能照做的办法。', minutes: 3,
    source: '云岭青心内容组', author: '周老师（学校心理教师）', license: '自有内容', age_label: '初中—高中', status: 'published', published_at: pub(1), reviewed_by: '内容组 · 三审会签',
    body: body('很多同学考试前一晚都会翻来覆去。越想“我必须睡着”，越睡不着。这很常见，不代表你明天会考砸。',
      '第一步：把明天要带的东西放进书包，把脑子里的清单搬到纸上。事情写下来，大脑才肯放手。',
      '第二步：躺下后做 4—7—8 呼吸。吸气数 4 下，屏住数 7 下，慢慢呼气数 8 下，做四轮。',
      '第三步：如果二十分钟还醒着，就起来坐一会儿，看几页不费脑子的书，困了再躺。躺着硬撑只会更清醒。',
      '少睡一两个小时对第二天的影响，比你担心的小得多。'),
  },
  {
    id: 'ct2', channel: 'psychology', type: 'article', title: '和爸妈吵架之后', summary: '先别急着分对错，先让自己从气头上下来。', minutes: 4,
    source: '云岭青心内容组', author: '周老师（学校心理教师）', license: '自有内容', age_label: '小学高年级—高中', status: 'published', published_at: pub(2), reviewed_by: '内容组 · 三审会签',
    body: body('吵完架，心里常常是两种感觉搅在一起：觉得自己没错，又有点难受。两种都可以有。',
      '先离开现场十分钟。去洗把脸，或者下楼走一圈。人在气头上说出来的话，多半不是真心话。',
      '等平静一点，试着把“你总是不理解我”换成“刚才那句话让我很难受”。说感受，比说对错更容易被听见。',
      '如果爸妈在外地，隔着电话更容易吵。可以改成发一段文字，写完读一遍再发。',
      '要是这样的争吵反复出现，你一个人扛得很累，可以找班主任或心理老师聊聊。这不是告状。'),
  },
  {
    id: 'ct3', channel: 'role_model', type: 'video', title: '返乡青年说：我为什么回来做电商', summary: '从昆明的写字楼回到镇上，她把家里的鲜花饼卖到了二十多个省。', minutes: 4, duration: 252,
    source: '云岭青心内容组', author: '演示人物（已授权）', license: '书面授权 · 仅演示', age_label: '初中—高中', status: 'published', published_at: pub(3), reviewed_by: '内容组 · 三审会签',
    body: body('“我不是混不下去才回来的，我是算过账才回来的。”', '这段访谈里，她讲了三件事：怎么判断一件事值不值得做，第一年亏了多少，以及她希望十四岁的自己早点知道什么。'),
  },
  {
    id: 'ct4', channel: 'policy', type: 'article', title: '高中阶段助学金怎么申请', summary: '谁可以申请、什么时候交材料、每年能拿到多少，一页说清。', minutes: 3,
    source: '政府公开信息整理', author: '云岭青心内容组', license: '政府公开信息', age_label: '初中—高中', status: 'published', published_at: pub(4), reviewed_by: '内容组 · 三审会签',
    body: body('普通高中和中职学校都有国家助学金，面向家庭经济困难的在校学生。',
      '怎么申请：每学年开学后，向班主任领取申请表，由学校评审小组评定，名单会在校内公示。',
      '需要准备：申请表、家庭情况说明。已纳入低保、特困、脱贫监测等的家庭，凭相关证明可直接认定。',
      '金额和档次每年以学校当年通知为准。拿不准的地方，直接问班主任，或者拨打学校资助办电话。',
      '申请助学金不会影响评优，也不会被公开家庭的具体情况。'),
  },
  {
    id: 'ct5', channel: 'culture', type: 'video', title: '哈尼梯田的四季', summary: '一千三百年，一代代人把一整座山修成了台阶。', minutes: 5, duration: 318,
    source: '开放授权素材', author: '演示作者', license: 'CC BY 4.0', age_label: '全学段', status: 'published', published_at: pub(5), reviewed_by: '内容组 · 三审会签',
    body: body('春天放水，夏天插秧，秋天收谷，冬天养田。', '梯田不是风景，是一套让水从山顶流到山脚、谁家都不缺水的办法。'),
  },
  {
    id: 'ct6', channel: 'psychology', type: 'audio', title: '睡前三分钟：把今天放下', summary: '跟着声音做一次身体扫描，不需要任何基础。', minutes: 3, duration: 186,
    source: '云岭青心内容组', author: '周老师（学校心理教师）', license: '自有内容', age_label: '小学高年级—高中', status: 'published', published_at: pub(6), reviewed_by: '内容组 · 三审会签',
    body: body('找个舒服的姿势躺好。', '从脚趾开始，一点点往上，留意每个地方现在是什么感觉。不用改变它，只是看一看。'),
  },
  {
    id: 'ct7', channel: 'five_edu', type: 'article', title: '课间十分钟，够做什么', summary: '五个不用器材、不用换衣服的小运动。', minutes: 2,
    source: '云岭青心内容组', author: '体育组（演示）', license: '自有内容', age_label: '全学段', status: 'published', published_at: pub(7), reviewed_by: '内容组 · 三审会签',
    body: body('久坐之后站起来走一走，下节课更容易听进去。', '靠墙静蹲三十秒；原地高抬腿二十下；走到操场边再走回来；和同桌互相压一压肩；对着窗外看远处一分钟。'),
  },
  {
    id: 'ct8', channel: 'career', type: 'article', title: '中职、高职、本科，三条路有什么不一样', summary: '不是谁高谁低，是先学手艺还是先学理论。', minutes: 5,
    source: '云岭青心内容组', author: '生涯教育组（演示）', license: '自有内容', age_label: '初中—高中', status: 'published', published_at: pub(8), reviewed_by: '内容组 · 三审会签',
    body: body('初中毕业后可以读普通高中，也可以读中等职业学校。两条路后面都能继续升学。',
      '中职三年以技能为主，毕业可以就业，也可以通过职教高考、“3+2”等方式升入高职甚至本科。',
      '高职三年，学的是能直接上岗的本事，比如护理、汽修、电商运营。', '本科四年，理论更多，适合想做研究、当教师、当医生这类需要长期学习的职业。',
      '没有哪条路是“差生才走的路”。选之前，先去看看每条路上的人每天在做什么。'),
  },
  {
    id: 'ct9', channel: 'parent', type: 'audio', title: '隔着电话，怎么问孩子“最近怎么样”', summary: '给在外务工的爸爸妈妈：三句比“好好学习”更管用的话。', minutes: 4, duration: 240,
    source: '云岭青心内容组', author: '家庭教育指导师（演示）', license: '自有内容', age_label: '家长', status: 'published', published_at: pub(2), reviewed_by: '内容组 · 三审会签',
    body: body('孩子说“还行”，多半是不知道从哪说起。', '可以这样问：今天有什么事让你笑了？这周有没有哪件事让你有点烦？有什么是我能帮上忙的？', '问完先听，忍住别马上给建议。'),
  },
  {
    id: 'ct10', channel: 'teacher', type: 'video', title: '五分钟微课：怎么开口问一个沉默的学生', summary: '从“你怎么了”换成“我注意到”。', minutes: 5, duration: 300,
    source: '云岭青心内容组', author: '周老师（学校心理教师）', license: '自有内容', age_label: '教师', status: 'published', published_at: pub(3), reviewed_by: '内容组 · 三审会签',
    body: body('“你怎么了”会让学生觉得自己出了问题。', '“我注意到你这周作业交得晚了一些”只是说出一个事实，把要不要解释的选择权留给学生。'),
  },
  {
    id: 'ct11', channel: 'psychology', type: 'article', title: '朋友不理我了怎么办', summary: '先分清：是他遇到了事，还是你们之间有了事。', minutes: 3,
    source: '云岭青心内容组', author: '周老师（学校心理教师）', license: '自有内容', age_label: '小学高年级—初中', status: 'team_review',
    body: body('被冷落的感觉很难受，尤其是不知道原因的时候。', '可以直接问一句：“最近是不是我哪里让你不舒服了？”这句话不丢人。'),
  },
  {
    id: 'ct12', channel: 'career', type: 'video', title: '汽修师傅的一天', summary: '早上七点半开门，他说最有成就感的是“听声音就知道哪坏了”。', minutes: 6, duration: 372,
    source: '机构供稿', author: '演示职业学校', license: '机构授权', age_label: '初中—高中', status: 'tri_party_review',
    body: body('“车不会骗人，哪里响就是哪里有问题。”', '一段跟拍：接车、诊断、报价、修理、交车。'),
  },
  {
    id: 'ct13', channel: 'psychology', type: 'audio', title: '午休放松音频', summary: '十分钟引导放松。', minutes: 10, duration: 600,
    source: '网络收集', author: '未知', license: '缺授权书', age_label: '全学段', status: 'ai_blocked',
    body: body('（机审拦截：缺少授权证明）'),
  },
];

const BASE_CAREERS: CareerCard[] = [
  { id: 'cc1', type: 'job', title: '护士', tagline: '离病人最近的人', region: '玉溪', source: '云岭青心生涯组整理', updated_at: '2026-10-20',
    sections: [{ heading: '典型的一天', text: '交接班、测体温量血压、配药打针、记录病情、安抚病人和家属。要一直站着，也要一直想着。' }, { heading: '怎么入门', text: '初中毕业可读中职护理，再升高职；也可读高中后考护理专科或本科。上岗前要通过护士执业资格考试。' }, { heading: '现在可以准备', text: '把生物和化学学扎实；假期去社区卫生站看看真实的工作是什么样。' }] },
  { id: 'cc2', type: 'job', title: '汽车维修技师', tagline: '听声音就知道哪坏了', region: '云南', source: '云岭青心生涯组整理', updated_at: '2026-10-12',
    sections: [{ heading: '典型的一天', text: '接车问诊、用诊断仪读故障码、拆检、更换配件、试车交付。新能源车越来越多，电路和软件也要懂。' }, { heading: '怎么入门', text: '中职或高职汽修专业，在校期间可以考汽车维修工职业技能等级证书。' }, { heading: '现在可以准备', text: '物理里的电学和力学会一直用到；家里有摩托车电动车，可以跟着大人学换个零件。' }] },
  { id: 'cc3', type: 'industry', title: '高原特色农业', tagline: '花、菜、果，从山里到全国', region: '云南', source: '政府公开信息整理', updated_at: '2026-09-30',
    sections: [{ heading: '这个行业在做什么', text: '种植、冷链、加工、电商、农技推广。云南的鲜花、蔬菜、蓝莓大量销往省外。' }, { heading: '需要什么样的人', text: '会种的人，也需要会卖的人、会修冷库的人、会做检测的人。' }] },
  { id: 'cc4', type: 'industry', title: '智能制造', tagline: '让机器自己把活干好', region: '全国', source: '云岭青心生涯组整理', updated_at: '2026-09-18',
    sections: [{ heading: '这个行业在做什么', text: '用自动化设备和软件来生产东西。工厂里的人越来越多在看屏幕、调机器，而不是拧螺丝。' }, { heading: '需要什么样的人', text: '设备操作与维护、工业机器人调试、质量检测、生产管理。数学和动手能力都重要。' }] },
  { id: 'cc5', type: 'major', title: '学前教育', tagline: '陪三到六岁的孩子长大', region: '云南', source: '以各校当年招生简章为准', updated_at: '2026-10-08',
    sections: [{ heading: '学什么', text: '儿童发展心理、幼儿园课程、弹唱画跳、观察与记录孩子。' }, { heading: '适合谁', text: '有耐心，愿意蹲下来和小孩说话，不怕吵。' }, { heading: '毕业去向', text: '幼儿园教师、托育机构、儿童活动策划。当教师需要取得幼儿园教师资格证。' }] },
  { id: 'cc6', type: 'person', title: '阿雅 · 返乡做电商的姐姐', tagline: '我是算过账才回来的', region: '玉溪', source: '人物访谈（已授权，化名）', updated_at: '2026-10-25',
    sections: [{ heading: '她走过的路', text: '中职电子商务专业，在昆明做了三年客服和运营，二十三岁回镇上开网店卖鲜花饼。' }, { heading: '她想对十四岁的自己说', text: '别怕问“为什么”。很多事情大人也没想明白，你问了，才知道该往哪走。' }] },
];

export const PASSPORT: Passport = {
  strengths: ['愿意帮同学', '动手能力强', '坚持跑步', '会照顾弟弟妹妹'],
  stamps: [{ edu: 'moral', count: 2 }, { edu: 'intellectual', count: 3 }, { edu: 'physical', count: 5 }, { edu: 'aesthetic', count: 1 }, { edu: 'labor', count: 4 }],
  records: [
    { id: 'pr1', edu: 'labor', title: '校园菜地值周', date: '2026-11-03', reflection: '第一次种出小白菜，比想象中难，天天都要浇水。', witness: '李老师' },
    { id: 'pr2', edu: 'physical', title: '班级篮球赛', date: '2026-10-24', reflection: '输了两分。下次想练好罚球。', witness: '体育委员' },
    { id: 'pr3', edu: 'moral', title: '社区敬老志愿服务', date: '2026-10-12', reflection: '陪李奶奶聊了一下午，她给我看了年轻时的照片。', witness: '社区志愿者协调员' },
    { id: 'pr4', edu: 'aesthetic', title: '扎染体验课', date: '2026-09-27', witness: '美术老师' },
    { id: 'pr5', edu: 'intellectual', title: '给同桌讲明白了一次函数', date: '2026-09-15', reflection: '讲给别人听，自己才发现哪里没懂。' },
  ],
  messages: [{ from: '李老师', text: '你认真的样子，全班都看得见。' }, { from: '妈妈', text: '菜地的照片我存在手机里了。' }],
};


export const INSTITUTIONS: Institution[] = [
  { id: 'in1', type: 'hospital', name: '演示区妇幼保健院临床心理科', intro: '儿童青少年情绪与行为问题的评估和治疗，可接收学校转介。', services: ['转介接收', '心理评估', '科普讲座'], district: '红塔区', status: 'approved' },
  { id: 'in2', type: 'counseling', name: '演示心理咨询中心', intro: '签约咨询师为学校提供个案督导和家长工作坊。', services: ['个案督导', '家长课堂', '教师培训'], district: '红塔区', status: 'approved' },
  { id: 'in3', type: 'social_work', name: '演示社会工作服务站', intro: '在社区开展青少年小组活动和假期陪伴。', services: ['小组活动', '假期陪伴', '入户探访'], district: '江川区', status: 'approved' },
  { id: 'in4', type: 'university', name: '演示大学朋辈志愿服务队', intro: '大学生志愿者，做学长答疑和活动带领。', services: ['学长答疑', '活动带领'], district: '昆明市', status: 'approved' },
  { id: 'in5', type: 'charity', name: '演示乡村儿童阅读公益项目', intro: '为乡镇学校配送图书并组织读书会。', services: ['图书角', '读书会'], district: '通海县', status: 'applied', license_no: '演示登记证 0005', contact_name: '项目专员' },
  { id: 'in6', type: 'hospital', name: '演示县人民医院心理门诊', intro: '每周二、周四下午开诊，接收学校转介，可使用医保。', services: ['转介接收', '门诊评估'], district: '通海县', status: 'approved' },
  { id: 'in7', type: 'charity', name: '演示青少年成长公益基金', intro: '为困难家庭学生提供助学支持，并资助乡镇学校的心理辅导室建设。', services: ['助学支持', '辅导室建设', '教师培训'], district: '玉溪市', status: 'approved' },
  { id: 'in8', type: 'social_work', name: '演示儿童之家社工站', intro: '面向留守儿童开展周末陪伴、课后托管和家访。', services: ['周末陪伴', '课后托管', '家访'], district: '江川区', status: 'approved' },
  { id: 'in9', type: 'counseling', name: '演示家庭教育指导中心', intro: '申请为家长提供线上课程和一对一指导。', services: ['家长课堂', '家庭指导'], district: '红塔区', status: 'applied', license_no: '演示登记证 0009', contact_name: '中心主任' },
];

export const ORG_TREE: OrgNode[] = [
  { id: 'o-b', type: 'bureau', name: '演示市教育体育局', student_count: 3460, children: [
    { id: 'o-s1', type: 'school', name: '云岭演示中学', student_count: 1180, children: [
      { id: 'o-g7', type: 'grade', name: '七年级', student_count: 402 },
      { id: 'o-g8', type: 'grade', name: '八年级', student_count: 396, children: [{ id: 'c1', type: 'class', name: CLASS_NAME, student_count: 36 }] },
      { id: 'o-g9', type: 'grade', name: '九年级', student_count: 382 },
    ] },
    { id: 'o-s2', type: 'school', name: '演示第二中学', student_count: 1024 },
    { id: 'o-s3', type: 'school', name: '演示第三中学', student_count: 1248 },
    { id: 'o-s4', type: 'school', name: '演示乡镇中学', student_count: 8 },
  ] },
];

export const REGION_REPORT: Omit<RegionReport, 'updated_at'> = {
  period: '2026-11',
  new_focus: 46, l3_ack_within_15m_rate: 0.986, referral_closure_rate: 0.87, escr: 0.82,
  trend: [
    { month: '2026-06', new_focus: 71, closure_rate: 0.64 }, { month: '2026-07', new_focus: 38, closure_rate: 0.69 }, { month: '2026-08', new_focus: 33, closure_rate: 0.72 },
    { month: '2026-09', new_focus: 62, closure_rate: 0.76 }, { month: '2026-10', new_focus: 54, closure_rate: 0.79 }, { month: '2026-11', new_focus: 46, closure_rate: 0.82 },
  ],
  five_edu: [{ edu: 'moral', rate: 0.31 }, { edu: 'intellectual', rate: 0.52 }, { edu: 'physical', rate: 0.64 }, { edu: 'aesthetic', rate: 0.27 }, { edu: 'labor', rate: 0.43 }],
  sources: [{ label: '学生主动求助', count: 9 }, { label: '心情记录规则', count: 14 }, { label: '状态问卷', count: 8 }, { label: '教师观察', count: 13 }, { label: '助手与圈子', count: 2 }],
  schools: [
    { school_name: '云岭演示中学', student_active_rate: 0.58, teacher_active_rate: 0.61, closure_rate: 0.85, suppressed: false },
    { school_name: '演示第二中学', student_active_rate: 0.49, teacher_active_rate: 0.52, closure_rate: 0.8, suppressed: false },
    { school_name: '演示第三中学', student_active_rate: 0.44, teacher_active_rate: 0.12, closure_rate: 0.74, suppressed: false },
    { school_name: '演示乡镇中学', student_active_rate: null, teacher_active_rate: null, closure_rate: null, suppressed: true },
  ],
};

export const SUPERVISIONS: SupervisionItem[] = [
  { id: 'sv1', school_name: '演示第三中学', kind: 'zero_record', detail: '教师端连续两个月没有观察或谈话记录', since: '2026-09-01', status: 'open' },
  { id: 'sv2', school_name: '演示第二中学', kind: 'overdue_alert', detail: '1 条需重点支持的提醒超过 24 小时未确认', since: '2026-11-09', status: 'followed' },
];

export const TENANTS: Tenant[] = [
  { id: 'tn1', type: 'education', name: '演示市教育体育局', status: 'active', student_count: 3460, opened_at: '2026-11-01' },
  { id: 'tn2', type: 'school', name: '云岭演示中学', status: 'active', student_count: 1180, opened_at: '2026-11-02' },
  { id: 'tn3', type: 'school', name: '演示第二中学', status: 'active', student_count: 1024, opened_at: '2026-11-02' },
  { id: 'tn4', type: 'committee', name: '共青团演示市委', status: 'active', student_count: 0, opened_at: '2026-11-05' },
  { id: 'tn5', type: 'school', name: '演示乡镇中学', status: 'pending', student_count: 8, opened_at: '2026-11-10' },
];

/** 自编非诊断问卷（不使用任何需授权的量表原文） */
const BASE_INSTRUMENTS = [
  {
    id: 'ins1', code: 'growth-state', name: '成长状态小问卷', kind: 'development' as const, minutes: 4,
    intro: '看看最近两周，你在学习、朋友、心情和身体这几件事上感觉怎么样。',
    disclaimer: '这不是考试，没有标准答案，可以跳过任何一题。结果只是一个参考，不是诊断。',
    options: [{ value: 0, label: '几乎没有' }, { value: 1, label: '有几天' }, { value: 2, label: '一半以上的日子' }, { value: 3, label: '几乎每天' }],
    items: ['我能安心听完一节课', '遇到不会的题，我愿意问同学或老师', '我有可以说心里话的人', '我对至少一件事提得起劲', '我晚上睡得还算踏实', '遇到烦心事，我有办法让自己缓一缓', '我觉得自己在慢慢变好', '我愿意参加班里或社区的活动'],
    positive: true,
  },
  {
    id: 'ins2', code: 'sleep-stress', name: '睡眠与压力小问卷', kind: 'screening' as const, minutes: 3,
    intro: '最近两周的睡眠和压力情况。六道题，三分钟。',
    disclaimer: '这是一份自编的状态问卷，不是诊断工具。如果结果让你担心，可以找心理老师聊聊。',
    options: [{ value: 0, label: '几乎没有' }, { value: 1, label: '有几天' }, { value: 2, label: '一半以上的日子' }, { value: 3, label: '几乎每天' }],
    items: ['躺下很久才能睡着', '半夜醒来后很难再睡', '白天上课犯困', '觉得事情多得做不完', '因为一点小事就烦躁', '提不起劲做平时喜欢的事'],
    positive: false,
  },
  {
    id: 'ins3', code: 'four-pref', name: '四维偏好探索（非官方）', kind: 'entertainment' as const, minutes: 2,
    intro: '轻松看看你做事的偏好。只是好玩。',
    disclaimer: '非医学、非诊断、仅供自我了解。本结果不用于任何评价、分班、评优、招生、教师考核或医疗判断，不会保存，也不会给老师和家长看。',
    options: [{ value: 0, label: '更像前者' }, { value: 1, label: '更像后者' }],
    items: ['周末更想：约朋友出去 / 自己待着', '做作业更喜欢：先易后难 / 先难后易', '听到新点子：先想能不能做 / 先想有多有趣', '做决定更看重：道理 / 感受', '收拾书包：前一晚收好 / 出门前再说', '遇到难题：马上问人 / 先自己琢磨'],
    positive: true,
  },
];

/** AI 助手的演示知识库：关键词命中即回答，并给出来源 */
export const AI_FAQ: { keys: string[]; answer: string; sources: string[] }[] = [
  { keys: ['护士', '护理', '医生', '医院'], answer: '想当护士，可以从三件事开始：\n1. 把生物和化学学扎实，这两门以后一直用得到。\n2. 了解三条路：中职护理、高职护理、本科护理，都能通向护士执业资格考试。\n3. 假期去社区卫生站看看真实的工作是什么样。', sources: ['cc1', 'ct8'] },
  { keys: ['睡不着', '失眠', '考试', '紧张'], answer: '考前睡不着很常见，不代表明天会考砸。可以试试：先把明天要带的东西收好并写下清单；躺下后做四轮 4—7—8 呼吸；二十分钟还醒着就起来坐一会儿，困了再躺。', sources: ['ct1', 'ct6'] },
  { keys: ['助学金', '资助', '学费', '补助', '没钱'], answer: '高中和中职都有国家助学金。开学后向班主任领申请表，学校评审后公示。已纳入低保、特困等的家庭凭证明可直接认定。具体金额以学校当年通知为准，拿不准就直接问班主任。', sources: ['ct4'] },
  { keys: ['吵架', '爸妈', '父母', '爸爸', '妈妈', '家里'], answer: '吵完先离开现场十分钟，让自己从气头上下来。平静后试着说感受而不是分对错，比如“刚才那句话让我很难受”。如果总是反复吵、你一个人扛得很累，可以找班主任或心理老师聊聊。', sources: ['ct2'] },
  { keys: ['中职', '高职', '职高', '本科', '读什么', '升学'], answer: '中职、高职、本科不是谁高谁低，而是先学手艺还是先学理论。中职和高职毕业都可以继续升学。选之前，先去看看每条路上的人每天在做什么。', sources: ['ct8', 'cc2'] },
  { keys: ['朋友', '同学', '不理我', '孤单', '没人'], answer: '被冷落真的不好受。可以先分清：是对方自己遇到了事，还是你们之间有了事。直接问一句“最近是不是我哪里让你不舒服了”并不丢人。想有人陪你理一理的话，可以点下面的“转人工”。', sources: ['ct2'] },
];
export const AI_FALLBACK = '这个问题我手头的资料里还没有可靠的答案，不想随便说。你可以换个问法，或者点“转人工”，让老师来帮你。';
/** 危机词：命中后不再继续对话。真实后端应使用更完整的词表 + 模型双检，召回率 ≥95% */
export const CRISIS_WORDS = ['不想活', '想死', '去死', '自杀', '伤害自己', '割腕', '跳楼', '活着没意思', '结束生命'];
export const AI_CRISIS_REPLY = '谢谢你告诉我。你现在的感受很重要，我已经帮你联系老师了，他们会尽快找到你。在这之前，如果情况紧急，请马上拨打 12355，或者去找身边任何一位你信任的大人。';
/** 成长圈违规内容：联系方式、外链、拉群等（CM-04） */
export const POST_BANNED = [/1\d{10}/, /微信|vx|加我|QQ|qq群|拉群|二维码/i, /https?:\/\/|www\./i];

// ════════ 合并内容库 ════════
/** 最早写的 13 条内容补上标签，和内容库的格式对齐 */
const BASE_TAGS: Record<string, string[]> = {
  ct1: ['考试', '睡眠', '紧张', '失眠'], ct2: ['父母', '吵架', '家庭', '沟通'], ct3: ['返乡', '电商', '创业'], ct4: ['助学金', '资助', '高中', '申请'],
  ct5: ['梯田', '哈尼族', '民族文化'], ct6: ['睡眠', '放松', '身体扫描'], ct7: ['课间', '运动', '体育'], ct8: ['中职', '高职', '本科', '升学'],
  ct9: ['留守', '电话', '家长', '沟通'], ct10: ['谈话', '教师', '开场'], ct11: ['朋友', '同学', '人际'], ct12: ['汽修', '职业体验'], ct13: ['放松', '音频'],
};
/** 全部内容：约 115 条，覆盖 9 个频道 */
export const CONTENTS: ContentDetail[] = [
  ...BASE_CONTENTS.map((c) => ({ ...c, tags: BASE_TAGS[c.id] ?? [] })),
  ...PSYCHOLOGY, ...LEARNING, ...CAREER, ...POLICY, ...CULTURE, ...FIVE_EDU, ...ROLE_MODEL, ...PARENT, ...TEACHER,
];
/** 全部生涯卡：48 张（职业 18、行业 12、专业 11、人物 7） */
export const CAREER_CARDS: CareerCard[] = [...BASE_CAREERS, ...MORE_CAREERS];
/** 全部问卷：8 份，其中 3 份是“轻松一下” */
export const INSTRUMENTS = [...BASE_INSTRUMENTS, ...MORE_INSTRUMENTS];

export * from './library-student';
export * from './library-staff';
