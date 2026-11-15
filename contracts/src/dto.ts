import { z } from 'zod';
import {
  AlertStatus, AuditResult, CAREER_CARD_TYPES, CASE_STATUSES, CONSENT_PURPOSES, CONTACT_TARGETS, CONTENT_CHANNELS, CONTENT_TYPES,
  CareerCardType, CaseStatus, CircleType, ConsentPurpose, ContentChannel, ContentStatus, ContentType, FiveEdu, INSTITUTION_TYPES,
  INTERVENTION_TYPES, InstitutionStatus, InstitutionType, InstrumentKind, InterventionType, MODERATE_ACTIONS, MOODS, Mood, NEXT_STEPS,
  NextStep, OBSERVATION_DIMENSIONS, OBSERVATION_SCENES, ObservationDimension, ObservationScene, PostStatus, PurposeCode, REPORT_REASONS,
  ReferralStatus, ReportReason, Role, SIGNAL_SOURCES, SignalSource, SupportLevel,
} from './enums';
import type { ActivityCard, ClassPush } from './dto-more';

/**
 * 约定：JSON 字段一律 snake_case；时间 ISO 8601 UTC；id 为字符串。
 * 请求体用 zod schema（后端校验、前端表单复用），响应体用 interface。
 * 每个类型上方的「→ 路由名」标注它属于哪个接口。
 */

// ════════ 通用 ════════
export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}
/** 错误体：RFC 9457，Content-Type: application/problem+json */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  /** 机器可读错误码，前端按它分支 */
  code: ErrorCode;
  request_id?: string;
}
export const ERROR_CODES = [
  'UNAUTHENTICATED', 'FORBIDDEN', 'PURPOSE_DENIED', 'NOT_FOUND', 'VALIDATION_FAILED', 'CONFLICT',
  'CONSENT_REQUIRED', 'ILLEGAL_TRANSITION', 'SAMPLE_SUPPRESSED', 'RATE_LIMITED', 'NOT_IMPLEMENTED', 'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface StudentBrief {
  id: string;
  /** 已按调用者角色脱敏（机构、团委等跨域角色只得到「姓 + *」） */
  name: string;
  class_name: string;
}

// ════════ 身份 ════════
/** → authDevLogin 请求 */
export const DevLoginReq = z.object({ account: z.string().min(1) });
export type DevLoginReq = z.infer<typeof DevLoginReq>;
/** → authWechatLogin 请求。code 来自 wx.login */
export const WechatLoginReq = z.object({ code: z.string().min(1) });
export type WechatLoginReq = z.infer<typeof WechatLoginReq>;
/** → authPasswordLogin 请求（教师/管理端） */
export const PasswordLoginReq = z.object({ account: z.string().min(1), password: z.string().min(6) });
export type PasswordLoginReq = z.infer<typeof PasswordLoginReq>;
/** → authDevLogin / authWechatLogin / authPasswordLogin 响应 */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  /** 秒 */
  expires_in: number;
  /** 学生是否已用学籍信息激活；家长是否已绑定孩子。其余角色恒为 true */
  activated: boolean;
}
/** → authActivate 请求：学校码 + 学籍号后 4 位（BR-01） */
export const ActivateReq = z.object({ school_code: z.string().min(4), sno_last4: z.string().length(4) });
export type ActivateReq = z.infer<typeof ActivateReq>;
/** → authGuardianBind 请求 */
export const GuardianBindReq = z.object({ school_code: z.string().min(4), sno_last4: z.string().length(4), phone: z.string().regex(/^1\d{10}$/), sms_code: z.string().length(6) });
export type GuardianBindReq = z.infer<typeof GuardianBindReq>;
/** → me / authActivate / authGuardianBind 响应 */
export interface Me {
  id: string;
  tenant_id: string;
  name: string;
  roles: Role[];
  purposes: PurposeCode[];
  school_name?: string;
  class_id?: string;
  class_name?: string;
  /** 仅学生 */
  student_id?: string;
  /** 仅学生：成长圈里展示的昵称 */
  nickname?: string;
  /** 仅家长：已绑定的孩子 */
  children?: StudentBrief[];
  /** 仅机构账号 */
  institution_name?: string;
}
/** JWT payload */
export interface JwtClaims {
  sub: string;
  tid: string;
  roles: Role[];
  purpose: PurposeCode[];
  jti: string;
  iat?: number;
  exp?: number;
}

// ════════ 同意与隐私 ════════
export interface ConsentItem {
  purpose: ConsentPurpose;
  title: string;
  /** 用学生读得懂的话说明：采什么、给谁看、存多久 */
  description: string;
  /** 基础服务为 true，不可撤回 */
  required: boolean;
  granted: boolean;
  version: string;
  granted_at?: string;
}
/** → consentGrant 请求；响应为 ConsentItem */
export const ConsentGrantReq = z.object({ purpose: z.enum(CONSENT_PURPOSES) });
export type ConsentGrantReq = z.infer<typeof ConsentGrantReq>;
/** → mePrivacy 响应：隐私仪表盘（P-09） */
export interface PrivacyDashboard {
  /** 谁在什么时候看了我的什么。只写角色称呼，不暴露教师备注里的专业判断 */
  access_logs: { at: string; viewer: string; what: string }[];
  consents: ConsentItem[];
}

// ════════ 学生日常 ════════
/** → checkInCreate 请求 */
export const CheckInCreateReq = z.object({
  mood: z.enum(MOODS),
  note: z.string().max(200).optional(),
  /** 离线幂等：客户端生成，同一 client_id 重复提交返回同一条记录 */
  client_id: z.string().uuid().optional(),
  client_ts: z.string().datetime().optional(),
});
export type CheckInCreateReq = z.infer<typeof CheckInCreateReq>;
/** → checkInCreate 响应；checkInList 响应为 Page<CheckIn> */
export interface CheckIn {
  id: string;
  mood: Mood;
  note?: string;
  created_at: string;
}
/** → homeGet 响应：学生首页一次拿齐 */
export interface HomeFeed {
  today_check_in: CheckIn | null;
  /** 最近 7 天（含今天），没打卡的那天 mood 为 null。不返回“连续天数” */
  week: { date: string; mood: Mood | null }[];
  micro_action: { id: string; title: string; minutes: number; done?: boolean; edu?: FiveEdu };
  recommended: ContentCard[];
  /** 班主任或心理老师推给全班的内容 */
  from_teacher?: ClassPush[];
  /** 正在进行的学习计划：今天该做哪一步 */
  plan?: { id: string; title: string; day: number; days: number; next_title: string; done_today: boolean } | null;
  /** 已报名或即将开始的活动，最多 3 个 */
  activities?: ActivityCard[];
  /** 未读通知数 */
  unread?: number;
}
/** → passportGet 响应：成长护照（P-08） */
export interface Passport {
  strengths: string[];
  stamps: { edu: FiveEdu; count: number }[];
  records: { id: string; edu: FiveEdu; title: string; date: string; reflection?: string; witness?: string; source?: 'self' | 'activity' | 'action' }[];
  /** 重要他人寄语 */
  messages: { from: string; text: string }[];
}
/** → guardianSummary 响应：家长每周摘要（P-11）。不含分数、逐题作答、咨询内容 */
export interface GuardianSummary {
  child: StudentBrief;
  week_text: string;
  suggestions: string[];
  task: { title: string; minutes: number; done?: boolean };
  courses: ContentCard[];
  /** 老师发来、还没回复的沟通单数 */
  notes_unread?: number;
  unread?: number;
  /** 仅危机处置期间出现：三步指引，不用恐吓性措辞 */
  crisis_notice: { text: string; steps: string[] } | null;
}

// ════════ 测评 ════════
/** → instrumentList 响应为 InstrumentBrief[] */
export interface InstrumentBrief {
  id: string;
  code: string;
  name: string;
  kind: InstrumentKind;
  minutes: number;
  item_count: number;
  intro: string;
  /** 非诊断声明；娱乐类为「非医学、非诊断、仅供自我了解」 */
  disclaimer: string;
  /** 仅学生：上次做这份问卷的时间 */
  last_done_at?: string;
}
/** → assessmentStart 请求 */
export const AssessmentStartReq = z.object({ instrument_id: z.string().min(1) });
export type AssessmentStartReq = z.infer<typeof AssessmentStartReq>;
/** → assessmentStart 响应：会话 + 题目 */
export interface AssessmentSession {
  id: string;
  instrument: InstrumentBrief;
  items: { id: string; text: string }[];
  options: { value: number; label: string }[];
}
/** → assessmentSubmit 请求。answers 与 items 等长；允许 null 表示跳过该题 */
export const AssessmentSubmitReq = z.object({ answers: z.array(z.number().int().nullable()).min(1) });
export type AssessmentSubmitReq = z.infer<typeof AssessmentSubmitReq>;
/** → assessmentSubmit / assessmentReport 响应。只用“状态/建议”表述，不出现疾病名 */
export interface AssessmentReport {
  session_id: string;
  instrument_name: string;
  kind: InstrumentKind;
  headline: string;
  description: string;
  strengths: string[];
  suggestions: string[];
  disclaimer: string;
  /** 为 true 时学生端展示“想找人聊聊吗”入口 */
  suggest_talk: boolean;
  /** 仅学生本人与心理教师可见；班主任、家长的任何接口都不返回 */
  raw_score?: number;
  created_at: string;
}

// ════════ 求助 / 预警 / 观察 ════════
/** → signalCreate 请求 */
export const SignalCreateReq = z.object({
  /** 教师上报时必填；学生发起时后端取本人 */
  student_id: z.string().optional(),
  source: z.enum(SIGNAL_SOURCES),
  message: z.string().max(500).optional(),
  location: z.object({ mode: z.literal('fuzzy'), district: z.string().max(50), consent: z.literal(true) }).optional(),
  contact_preference: z.array(z.enum(CONTACT_TARGETS)).min(1).default(['teacher']),
});
export type SignalCreateReq = z.infer<typeof SignalCreateReq>;
/** → signalCreate 响应。不含等级字段 */
export interface SignalCreated {
  signal_id: string;
  alert_id: string;
  status: 'notified';
  sla: { acknowledge_by: string; intervene_by: string };
  notified: { role: Role; channel: 'in_app' | 'sms' | 'phone' | 'wechat'; status: 'sent' | 'calling' | 'failed' }[];
  /** 给学生看的话：谁会在多久内联系你 */
  next: string;
}
/** → alertList 响应为 Page<AlertItem>；alertAck / alertEscalate / alertDismiss 响应为 AlertItem */
export interface AlertItem {
  id: string;
  level: SupportLevel;
  status: AlertStatus;
  source: SignalSource;
  student: StudentBrief;
  /** 触发原因，必须可解释 */
  reason: string;
  due_at: string;
  created_at: string;
  acked_by_name?: string;
  acked_at?: string;
  case_id?: string;
}
/** → alertDismiss 请求：标记误报，不追责（BR-19） */
export const AlertDismissReq = z.object({ reason: z.string().min(1).max(200) });
export type AlertDismissReq = z.infer<typeof AlertDismissReq>;
/** → observationCreate 请求：谈话/观察记录（P-15，3 步） */
export const ObservationCreateReq = z.object({
  student_id: z.string().min(1),
  scene: z.enum(OBSERVATION_SCENES),
  dimensions: z.array(z.enum(OBSERVATION_DIMENSIONS)).min(1),
  note: z.string().min(1).max(500),
  next_step: z.enum(NEXT_STEPS).default('keep_watching'),
});
export type ObservationCreateReq = z.infer<typeof ObservationCreateReq>;
/** → observationCreate 响应 */
export interface ObservationItem {
  id: string;
  scene: ObservationScene;
  dimensions: ObservationDimension[];
  note: string;
  next_step: NextStep;
  teacher_name: string;
  created_at: string;
}
/** → classBoard 响应（P-13） */
export interface ClassBoard {
  class_id: string;
  class_name: string;
  student_count: number;
  /** 本周关注清单，最多 5 人 */
  focus: (StudentBrief & { level: SupportLevel; reason: string })[];
  students: (StudentBrief & { level: SupportLevel })[];
  week_check_in_rate: number;
  /** 近 7 天班级心情分布（人数），只有整体没有个人 */
  mood_trend: { date: string; counts: Record<Mood, number> }[];
}
/** → studentCard 响应（P-14） */
export interface StudentCard {
  student: StudentBrief;
  level: SupportLevel;
  /** 班主任看到的是标签趋势，不含打卡题记原文 */
  mood_week: { date: string; mood: Mood | null }[];
  observations: ObservationItem[];
  case_id?: string;
  scripts: TalkScript[];
}
/** → talkScripts 响应为 TalkScript[] */
export interface TalkScript {
  id: string;
  scene: string;
  text: string;
}

// ════════ 个案与转介 ════════
export const SupportPlan = z.object({ goal: z.string().min(1), owner: z.string().min(1), frequency: z.string().min(1), review_at: z.string().min(1) });
export type SupportPlan = z.infer<typeof SupportPlan>;
/** → caseCreate 请求 */
export const CaseCreateReq = z.object({ student_id: z.string().min(1), alert_id: z.string().optional(), level: z.enum(['L1', 'L2', 'L3']), plan: SupportPlan.optional() });
export type CaseCreateReq = z.infer<typeof CaseCreateReq>;
/** → caseList 响应为 Page<CaseSummary> */
export interface CaseSummary {
  id: string;
  case_no: string;
  student: StudentBrief;
  level: SupportLevel;
  status: CaseStatus;
  owner_name: string;
  created_at: string;
  updated_at: string;
}
/** → caseCreate / caseGet / caseUpdate / caseIntervention 响应 */
export interface CaseDetail extends CaseSummary {
  plan: SupportPlan | null;
  guardian_informed: boolean;
  close_summary?: string;
  timeline: { id: string; type: 'created' | 'status' | 'intervention' | 'referral' | 'feedback'; title: string; note?: string; actor_name: string; at: string }[];
  referral?: ReferralItem;
}
/** → caseUpdate 请求。状态迁移须符合 CASE_TRANSITIONS，否则 409 ILLEGAL_TRANSITION；进入 following 必须已有 plan；closed 必须带 close_summary */
export const CaseUpdateReq = z.object({ status: z.enum(CASE_STATUSES).optional(), plan: SupportPlan.optional(), close_summary: z.string().max(1000).optional() });
export type CaseUpdateReq = z.infer<typeof CaseUpdateReq>;
/** → caseIntervention 请求 */
export const InterventionCreateReq = z.object({ type: z.enum(INTERVENTION_TYPES), note: z.string().min(1).max(1000), outcome: z.string().max(200).optional() });
export type InterventionCreateReq = z.infer<typeof InterventionCreateReq>;
export type { InterventionType };
/** → caseRefer 请求：生成最小必要转介包（BR-22），默认不含咨询全文 */
export const ReferralCreateReq = z.object({ institution_id: z.string().min(1), reason: z.string().min(1).max(500), include_assessment_summary: z.boolean().default(false) });
export type ReferralCreateReq = z.infer<typeof ReferralCreateReq>;
/** → caseRefer / referralAccept / referralFeedback 响应；referralList 响应为 Page<ReferralItem> */
export interface ReferralItem {
  id: string;
  case_id: string;
  case_no: string;
  student: StudentBrief;
  level: SupportLevel;
  institution_id: string;
  institution_name: string;
  reason: string;
  done_interventions: string[];
  assessment_summary?: string;
  status: ReferralStatus;
  /** 转介包 7 天有效 */
  expires_at: string;
  created_at: string;
  feedback?: { visited: boolean; advice: string; next_at?: string };
}
/** → referralFeedback 请求 */
export const ReferralFeedbackReq = z.object({ visited: z.boolean(), advice: z.string().min(1).max(1000), next_at: z.string().optional() });
export type ReferralFeedbackReq = z.infer<typeof ReferralFeedbackReq>;

// ════════ 内容与生涯 ════════
/** → contentFeed 响应为 Page<ContentCard>，查询参数 channel / cursor / limit；只返回 published */
export interface ContentCard {
  id: string;
  channel: ContentChannel;
  type: ContentType;
  title: string;
  summary: string;
  cover_url?: string;
  /** 秒，视频/音频 */
  duration?: number;
  /** 阅读/观看分钟数 */
  minutes: number;
  source: string;
  /** 外部原文地址；未完成来源审核时为空 */
  external_url?: string;
  /** 是否已按来源白名单和人工审核核验 */
  source_verified?: boolean;
  /** 发现流分类：AI 资讯、竞赛、志愿、政策等 */
  discover_kind?: 'ai_insight' | 'competition' | 'volunteer' | 'policy' | 'career' | 'activity' | 'other';
  /** 面向的学生阶段，例如大学生、高中生 */
  audience_stages?: string[];
  deadline?: string;
  location?: string;
  age_label: string;
  status: ContentStatus;
  published_at?: string;
  /** 用于搜索与“相关内容” */
  tags?: string[];
  /** 仅登录用户：是否已收藏、已看完 */
  favorited?: boolean;
  completed?: boolean;
}
/** → contentGet / contentCreate / contentReview 响应 */
export interface ContentDetail extends ContentCard {
  /** 正文，一行一段。行首标记：「## 」小标题、「- 」要点、「> 」划重点；其余为普通段落 */
  body: string;
  /** 文末“记住这几点” */
  takeaways?: string[];
  related?: ContentCard[];
  /** 短时效签名地址；演示素材来自隔离桶 */
  video_url?: string;
  author: string;
  license: string;
  reviewed_by?: string;
}
/** → contentCreate 请求。来源、作者、授权缺一不可（BR-34）；创建后自动进入机审 */
export const ContentCreateReq = z.object({
  channel: z.enum(CONTENT_CHANNELS), type: z.enum(CONTENT_TYPES), title: z.string().min(2).max(60), summary: z.string().max(120).default(''),
  body: z.string().min(1), source: z.string().min(1), author: z.string().min(1), license: z.string().min(1), age_label: z.string().default('初中—高中'),
});
export type ContentCreateReq = z.infer<typeof ContentCreateReq>;
/** → contentReviewQueue 响应为 Page<ContentReviewItem> */
export interface ContentReviewItem {
  content: ContentDetail;
  ai_result: { passed: boolean; hits: string[] };
  history: { stage: 'ai' | 'team' | 'tri_party'; result: 'pass' | 'reject'; reviewer: string; reason?: string; at: string }[];
}
/** → contentReview 请求：对当前阶段给出结论，后端按状态机推进（team_review→tri_party_review→published） */
export const ContentReviewReq = z.object({ result: z.enum(['pass', 'reject']), reason: z.string().max(200).optional() });
export type ContentReviewReq = z.infer<typeof ContentReviewReq>;
/** → careerCards 响应为 CareerCard[]，查询参数 type / region */
export interface CareerCard {
  id: string;
  type: CareerCardType;
  title: string;
  tagline: string;
  region: string;
  sections: { heading: string; text: string }[];
  /** 每张卡必须有来源与更新时间 */
  source: string;
  updated_at: string;
}
export const CareerQuery = z.object({ type: z.enum(CAREER_CARD_TYPES).optional(), region: z.string().optional() });

// ════════ AI 成长助手 ════════
/** → aiChat 请求 */
export const AiChatReq = z.object({ session_id: z.string().optional(), message: z.string().min(1).max(1000) });
export type AiChatReq = z.infer<typeof AiChatReq>;
/** → aiChat 响应 */
export interface AiChatRes {
  session_id: string;
  /** crisis：命中危机词，不再继续对话，前端展示求助入口，后端同时生成一条预警（AI-04） */
  kind: 'answer' | 'crisis';
  answer: string;
  sources: { content_id: string; title: string }[];
  /** 每 5 轮为 true，前端提示“可以随时转人工” */
  remind_human: boolean;
  /** 可以接着问的问题 */
  suggestions?: string[];
}

// ════════ 成长圈 ════════
/** → circleList 响应为 Circle[] */
export interface Circle {
  id: string;
  type: CircleType;
  name: string;
  intro: string;
  member_count: number;
  rules: string[];
  post_count?: number;
  last_post_at?: string;
}
/** → postList 响应为 Page<Post>（只含 published 与本人的 pending_review）；postCreate / postModerate 响应为 Post */
export interface Post {
  id: string;
  circle_id: string;
  /** 学生只展示昵称与头像编号，不含姓名、学校、班级（CM-01） */
  nickname: string;
  avatar_seed: number;
  is_teacher: boolean;
  content: string;
  status: PostStatus;
  mine: boolean;
  created_at: string;
  replies: Post[];
  like_count?: number;
  liked?: boolean;
}
/** → postCreate 请求。学生前 3 条为 pending_review；含联系方式/链接等违规内容直接 422 */
export const PostCreateReq = z.object({ content: z.string().min(1).max(500), parent_id: z.string().optional() });
export type PostCreateReq = z.infer<typeof PostCreateReq>;
/** → postReport 请求；响应 { ok: true } */
export const PostReportReq = z.object({ reason: z.enum(REPORT_REASONS) });
export type PostReportReq = z.infer<typeof PostReportReq>;
/** → moderationQueue 响应为 Page<ModerationItem> */
export interface ModerationItem {
  post: Post;
  circle_name: string;
  why: 'new_user' | 'reported' | 'keyword';
  report_reason?: ReportReason;
}
/** → postModerate 请求 */
export const PostModerateReq = z.object({ action: z.enum(MODERATE_ACTIONS) });
export type PostModerateReq = z.infer<typeof PostModerateReq>;

// ════════ 机构 ════════
/** → institutionList 响应为 Institution[]（只含 approved）；institutionApplications 响应为 Institution[]（含全部状态）；institutionReview 响应为 Institution */
export interface Institution {
  id: string;
  type: InstitutionType;
  name: string;
  intro: string;
  services: string[];
  district: string;
  status: InstitutionStatus;
  /** 仅审核接口返回 */
  license_no?: string;
  contact_name?: string;
}
/** → institutionApply 请求；响应为 Institution（status = applied） */
export const InstitutionApplyReq = z.object({
  name: z.string().min(2), type: z.enum(INSTITUTION_TYPES), district: z.string().min(1), intro: z.string().min(1).max(300),
  services: z.array(z.string()).default([]), license_no: z.string().min(4), contact_name: z.string().min(1), contact_phone: z.string().regex(/^1\d{10}$/),
});
export type InstitutionApplyReq = z.infer<typeof InstitutionApplyReq>;
/** → institutionReview 请求 */
export const InstitutionReviewReq = z.object({ approve: z.boolean(), reason: z.string().max(200).optional() });
export type InstitutionReviewReq = z.infer<typeof InstitutionReviewReq>;

// ════════ 管理 / 看板 / 审计 ════════
/** → orgTree 响应为 OrgNode[] */
export interface OrgNode {
  id: string;
  type: 'bureau' | 'school' | 'grade' | 'class';
  name: string;
  student_count: number;
  children?: OrgNode[];
}
/**
 * → regionReport 响应（P-18）。只有聚合。
 * 小样本抑制：任何统计口径的样本数 < 10 时该值为 null，学校行 suppressed = true。不排名，按校名排序。
 */
export interface RegionReport {
  period: string;
  updated_at: string;
  new_focus: number | null;
  l3_ack_within_15m_rate: number | null;
  referral_closure_rate: number | null;
  escr: number | null;
  trend: { month: string; new_focus: number; closure_rate: number }[];
  schools: { school_name: string; student_active_rate: number | null; teacher_active_rate: number | null; closure_rate: number | null; suppressed: boolean }[];
  /** 五育活动参与率（聚合） */
  five_edu?: { edu: FiveEdu; rate: number | null }[];
  /** 提醒来源的构成（聚合） */
  sources?: { label: string; count: number }[];
}
/** → supervisionList 响应为 SupervisionItem[]（P-19）。不含学生个体信息 */
export interface SupervisionItem {
  id: string;
  school_name: string;
  kind: 'overdue_alert' | 'zero_record';
  detail: string;
  since: string;
  status: 'open' | 'followed';
}
/** → tenantList 响应为 Tenant[] */
export interface Tenant {
  id: string;
  type: 'education' | 'school' | 'committee' | 'institution';
  name: string;
  status: 'active' | 'pending';
  student_count: number;
  opened_at: string;
}
/** → auditEvents 响应为 Page<AuditEvent> */
export interface AuditEvent {
  id: string;
  actor_id: string | null;
  actor_role: Role | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  purpose: PurposeCode | null;
  result: AuditResult;
  request_id: string | null;
  prev_hash: string | null;
  hash: string;
  created_at: string;
}

/** 类型占位，避免未使用告警 */
export type _Unused = CircleType | ReportReason;
