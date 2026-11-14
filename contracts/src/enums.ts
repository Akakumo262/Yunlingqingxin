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

/** 学生发现页的推荐分层。没有阶段信息时按 all 返回，不阻断基础内容。 */
export const STUDENT_STAGES = ['primary_school', 'middle_school', 'high_school', 'vocational', 'university', 'all'] as const;
export type StudentStage = (typeof STUDENT_STAGES)[number];
export const STUDENT_STAGE_LABEL: Record<StudentStage, string> = {
  primary_school: '小学高年级', middle_school: '初中', high_school: '高中', vocational: '中职/高职', university: '大学', all: '全学段',
};

/** 发现页的内容意图，区别于内容载体 article/video/audio。 */
export const DISCOVER_KINDS = ['ai_insight', 'competition', 'volunteer', 'learning', 'career', 'policy', 'general'] as const;
export type DiscoverKind = (typeof DISCOVER_KINDS)[number];
export const DISCOVER_KIND_LABEL: Record<DiscoverKind, string> = {
  ai_insight: 'AI 资讯', competition: '竞赛机会', volunteer: '志愿活动', learning: '学习成长', career: '生涯探索', policy: '政策资讯', general: '精选内容',
};

/** 外部来源类型。仅标记已通过运营审核的来源，不能把普通转载当作权威来源。 */
export const CONTENT_SOURCE_TYPES = ['official_account', 'government', 'school', 'platform', 'internal'] as const;
export type ContentSourceType = (typeof CONTENT_SOURCE_TYPES)[number];
export const CONTENT_SOURCE_TYPE_LABEL: Record<ContentSourceType, string> = {
  official_account: '官方账号', government: '政府门户', school: '学校/高校', platform: '官方平台', internal: '平台自有',
};

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
