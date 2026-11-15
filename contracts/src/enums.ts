/** 所有枚举值为小写字符串（数据库用 CHECK，不用 enum）。前后端只从这里取值，不手写字面量。 */

type V<T> = T[keyof T];

/** 角色码，对应《产品说明》3.1 的 R01—R17 */
export const Role = {
  student: 'student', // R01
  guardian: 'guardian', // R02
  headTeacher: 'head_teacher', // R03 班主任
  psychologist: 'psychologist', // R04 心理教师
  schoolLeader: 'school_leader', // R05
  schoolAdmin: 'school_admin', // R06
  eduAdmin: 'edu_admin', // R07 教体局
  committee: 'committee', // R08 团委
  community: 'community', // R09
  institution: 'institution', // R10/R13/R14 医疗机构/咨询师
  operator: 'operator', // R11 平台运营（含内容审核 R17）
  auditor: 'auditor', // R12
  moderator: 'moderator', // R16 版主
} as const;
export type Role = V<typeof Role>;

/** 目的码，请求头 X-Purpose-Code */
export const Purpose = {
  growth: 'PUR-01', // 教学与成长支持
  crisis: 'PUR-02', // 危机识别与处置
  stats: 'PUR-03', // 区域统计（只返回 k≥10 聚合）
  research: 'PUR-04', // 科研（G0 不实现）
  audit: 'PUR-05', // 安全审计
} as const;
export type PurposeCode = V<typeof Purpose>;

/** 支持等级。仅教师/管理端可见，学生端任何页面不得出现等级或“风险”字样 */
export const SupportLevel = { L0: 'L0', L1: 'L1', L2: 'L2', L3: 'L3' } as const;
export type SupportLevel = V<typeof SupportLevel>;

/** 心情标签（P-03，5 个） */
export const MOODS = ['great', 'good', 'okay', 'low', 'hard'] as const;
export type Mood = (typeof MOODS)[number];
export const MOOD_LABEL: Record<Mood, string> = {
  great: '很不错',
  good: '还可以',
  okay: '一般般',
  low: '有点低落',
  hard: '不太容易',
};

export const SIGNAL_SOURCES = ['one_click_help', 'check_in_rule', 'assessment_rule', 'teacher_observation', 'ai_guardrail'] as const;
export type SignalSource = (typeof SIGNAL_SOURCES)[number];

export const CONTACT_TARGETS = ['teacher', 'psychologist', 'guardian', '12355'] as const;
export type ContactTarget = (typeof CONTACT_TARGETS)[number];

/** 预警工单 */
export const ALERT_STATUSES = ['open', 'acked', 'escalated', 'converted', 'dismissed'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

/** 个案状态机（BR-20）：待确认→跟进中→已转介→已结案；误报→已关闭 */
export const CASE_STATUSES = ['pending_confirm', 'following', 'referred', 'closed', 'dismissed'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  pending_confirm: ['following', 'dismissed'],
  following: ['referred', 'closed'],
  referred: ['following', 'closed'],
  closed: [],
  dismissed: [],
};

export const REFERRAL_STATUSES = ['sent', 'accepted', 'rejected', 'feedback_received', 'closed', 'revoked'] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

/** 内容审核状态机（《技术路径》19.11.4） */
export const CONTENT_STATUSES = ['draft', 'ai_pending', 'ai_passed', 'ai_blocked', 'team_review', 'tri_party_review', 'published', 'rejected', 'offline'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_CHANNELS = ['psychology', 'learning', 'career', 'policy', 'culture', 'five_edu', 'role_model', 'parent', 'teacher'] as const;
export type ContentChannel = (typeof CONTENT_CHANNELS)[number];
export const CONTENT_CHANNEL_LABEL: Record<ContentChannel, string> = {
  psychology: '心理科普',
  learning: '学习力',
  career: '生涯职业',
  policy: '政策资助',
  culture: '民族文化',
  five_edu: '五育活动',
  role_model: '榜样故事',
  parent: '家长课堂',
  teacher: '教师微课',
};
export const CONTENT_TYPES = ['article', 'video', 'audio'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CIRCLE_TYPES = ['class', 'topic', 'activity'] as const;
export type CircleType = (typeof CIRCLE_TYPES)[number];
export const POST_STATUSES = ['pending_review', 'published', 'rejected', 'removed'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/** 量表类型。entertainment 不存档、不进预警、不给家长/教师看（ES-01—ES-08） */
export const INSTRUMENT_KINDS = ['screening', 'development', 'career', 'entertainment'] as const;
export type InstrumentKind = (typeof INSTRUMENT_KINDS)[number];

export const AUDIT_RESULTS = ['allow', 'deny', 'error'] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];

/** 聚合展示最小样本数，低于此值返回 suppressed */
export const K_ANONYMITY = 10;

/** 五育：只记录“活动—参与—反思—见证”证据链，不打分、不排名 */
export const FIVE_EDU = ['moral', 'intellectual', 'physical', 'aesthetic', 'labor'] as const;
export type FiveEdu = (typeof FIVE_EDU)[number];
export const FIVE_EDU_LABEL: Record<FiveEdu, string> = { moral: '德', intellectual: '智', physical: '体', aesthetic: '美', labor: '劳' };

/** 同意项。service 为基础服务（必选），其余逐项单独同意、可随时撤回（BR-06—BR-08） */
export const CONSENT_PURPOSES = ['service', 'assessment', 'ai', 'community', 'referral', 'guardian_trend'] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const OBSERVATION_SCENES = ['break', 'after_class', 'home_visit', 'other'] as const;
export type ObservationScene = (typeof OBSERVATION_SCENES)[number];
export const OBSERVATION_DIMENSIONS = ['emotion', 'study', 'relationship'] as const;
export type ObservationDimension = (typeof OBSERVATION_DIMENSIONS)[number];
export const NEXT_STEPS = ['keep_watching', 'talk_again', 'refer_psychologist'] as const;
export type NextStep = (typeof NEXT_STEPS)[number];

export const INTERVENTION_TYPES = ['talk', 'counseling', 'family', 'other'] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const CAREER_CARD_TYPES = ['industry', 'job', 'major', 'person'] as const;
export type CareerCardType = (typeof CAREER_CARD_TYPES)[number];

export const REPORT_REASONS = ['bullying', 'privacy', 'ad', 'self_harm', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const MODERATE_ACTIONS = ['approve', 'reject', 'remove'] as const;
export type ModerateAction = (typeof MODERATE_ACTIONS)[number];

export const INSTITUTION_TYPES = ['hospital', 'counseling', 'social_work', 'charity', 'university'] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];
export const INSTITUTION_TYPE_LABEL: Record<InstitutionType, string> = {
  hospital: '医院心理科', counseling: '心理咨询机构', social_work: '社工机构', charity: '公益组织', university: '高校志愿者',
};
export const INSTITUTION_STATUSES = ['applied', 'approved', 'rejected', 'offline'] as const;
export type InstitutionStatus = (typeof INSTITUTION_STATUSES)[number];

export const FIVE_EDU_NAME: Record<FiveEdu, string> = { moral: '德育', intellectual: '智育', physical: '体育', aesthetic: '美育', labor: '劳育' };

/** 站内通知的类别。每一类对应一条跨角色的联动（见 mock/state.ts 的 notify） */
export const NOTICE_KINDS = ['help', 'alert', 'case', 'referral', 'activity', 'content', 'circle', 'note', 'appointment', 'system'] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export const ACTIVITY_STATUSES = ['open', 'full', 'ongoing', 'ended'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
/** 学生在一场活动里走到哪一步：报名 → 签到 → 写下反思（进成长护照） */
export const MY_ACTIVITY_STATUSES = ['none', 'signed', 'checked_in', 'reflected'] as const;
export type MyActivityStatus = (typeof MY_ACTIVITY_STATUSES)[number];
export const ORGANIZER_TYPES = ['school', 'committee', 'community', 'institution'] as const;
export type OrganizerType = (typeof ORGANIZER_TYPES)[number];
export const ORGANIZER_TYPE_LABEL: Record<OrganizerType, string> = { school: '学校', committee: '团委', community: '社区', institution: '入驻机构' };

export const APPOINTMENT_TOPICS = ['study', 'mood', 'peer', 'family', 'other'] as const;
export type AppointmentTopic = (typeof APPOINTMENT_TOPICS)[number];
export const APPOINTMENT_TOPIC_LABEL: Record<AppointmentTopic, string> = { study: '学习上的事', mood: '心情', peer: '和同学的事', family: '家里的事', other: '说不清，想聊聊' };
export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'done', 'cancelled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** 家校沟通单：结构化的一来一回，不是聊天 */
export const NOTE_KINDS = ['praise', 'remind', 'invite', 'care'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export const NOTE_KIND_LABEL: Record<NoteKind, string> = { praise: '想夸夸孩子', remind: '请家里留意', invite: '邀请参加', care: '想了解情况' };

export const EXPORT_SCOPES = ['class_report', 'case_summary', 'region_report'] as const;
export type ExportScope = (typeof EXPORT_SCOPES)[number];
export const EXPORT_SCOPE_LABEL: Record<ExportScope, string> = { class_report: '班级周报', case_summary: '个案摘要', region_report: '区域报告' };
export const EXPORT_STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];

export const AUDIENCES = ['all', 'students', 'guardians', 'teachers'] as const;
export type Audience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABEL: Record<Audience, string> = { all: '所有人', students: '学生', guardians: '家长', teachers: '教师' };

export const FEEDBACK_KINDS = ['bug', 'idea', 'content', 'other'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = { bug: '有地方不好用', idea: '有个想法', content: '内容有问题', other: '其他' };

export const ROLE_LABEL: Record<Role, string> = {
  student: '学生', guardian: '家长', head_teacher: '班主任', psychologist: '心理教师', school_leader: '校领导', school_admin: '学校信息员',
  edu_admin: '教体局', committee: '团委', community: '社区', institution: '协作机构', operator: '平台运营', auditor: '安全审计', moderator: '版主',
};
export const PURPOSE_LABEL: Record<PurposeCode, string> = { 'PUR-01': '成长支持', 'PUR-02': '危机处置', 'PUR-03': '区域统计', 'PUR-04': '科研', 'PUR-05': '安全审计' };
export const CASE_STATUS_LABEL: Record<CaseStatus, string> = { pending_confirm: '待确认', following: '跟进中', referred: '已转介', closed: '已结案', dismissed: '已关闭' };
