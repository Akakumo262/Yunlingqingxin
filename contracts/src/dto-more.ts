import { z } from 'zod';
import {
  APPOINTMENT_TOPICS, AUDIENCES, ActivityStatus, AppointmentStatus, AppointmentTopic, Audience, ContactTarget, ContentChannel, EXPORT_SCOPES,
  ExportScope, ExportStatus, FEEDBACK_KINDS, FIVE_EDU, FiveEdu, InstrumentKind, MyActivityStatus, NOTE_KINDS, NoteKind, NoticeKind, ORGANIZER_TYPES,
  OrganizerType, Role, SignalSource, SupportLevel,
} from './enums';
import type { CareerCard, ContentCard, StudentBrief } from './dto';

/**
 * 第二批接口的类型：让平台“真的能用”的那部分——搜索、收藏、专题、学习计划、五育活动、
 * 通知、求助进度、预约、家校沟通单、内容推送、规则、名册导入、公告、导出、紧急访问、帮助与反馈。
 * 约定与 dto.ts 相同。每个类型上方的「→ 路由名」标注它属于哪个接口。
 */

// ════════ 搜索、收藏、专题 ════════
/** → searchAll 响应。q 为空时只返回 hot（热门搜索词） */
export interface SearchResult {
  q: string;
  contents: ContentCard[];
  careers: CareerCard[];
  activities: ActivityCard[];
  hot: string[];
}
/** → contentFavorite 请求；响应 { favorited } */
export const FavoriteReq = z.object({ on: z.boolean() });
export type FavoriteReq = z.infer<typeof FavoriteReq>;
/** → contentFeedback 请求；响应 { ok: true } */
export const ContentFeedbackReq = z.object({ useful: z.boolean() });
export type ContentFeedbackReq = z.infer<typeof ContentFeedbackReq>;
/** → collectionList 响应为 Collection[]；collectionGet 响应带 items */
export interface Collection {
  id: string;
  title: string;
  intro: string;
  channel: ContentChannel;
  count: number;
  items?: ContentCard[];
}

// ════════ 学习计划 ════════
/** → planList 响应为 LearningPlan[]；planJoin / planQuit / planStepDone 响应为 LearningPlan */
export interface LearningPlan {
  id: string;
  title: string;
  intro: string;
  days: number;
  minutes_per_day: number;
  channel: ContentChannel;
  steps: { day: number; title: string; action: string; content_id?: string }[];
  joined: boolean;
  /** 已完成的天。不记录“连续”，漏一天不清零 */
  done_days: number[];
  joined_count: number;
}

// ════════ 五育活动 ════════
/** → activityList 响应为 ActivityCard[]，查询参数 edu / mine */
export interface ActivityCard {
  id: string;
  edu: FiveEdu;
  title: string;
  organizer: string;
  organizer_type: OrganizerType;
  start_at: string;
  end_at: string;
  place: string;
  capacity: number;
  signed_count: number;
  status: ActivityStatus;
  audience: string;
  /** 仅学生：我走到哪一步了 */
  my_status?: MyActivityStatus;
}
/** → activityGet / activitySignup / activityCancel / activityCheckIn / activityReflect / activityCreate 响应 */
export interface ActivityDetail extends ActivityCard {
  intro: string;
  schedule: string[];
  bring: string[];
  safety: string;
  /** 仅组织者可见：现场签到码 */
  check_in_code?: string;
  my_reflection?: string;
}
/** → activityCheckIn 请求：现场由老师念出签到码 */
export const ActivityCheckInReq = z.object({ code: z.string().min(4).max(8) });
export type ActivityCheckInReq = z.infer<typeof ActivityCheckInReq>;
/** → activityReflect 请求：写下反思，成为成长护照里的一条记录 */
export const ActivityReflectReq = z.object({ text: z.string().min(1).max(300) });
export type ActivityReflectReq = z.infer<typeof ActivityReflectReq>;
/** → activityCreate 请求 */
export const ActivityCreateReq = z.object({
  edu: z.enum(FIVE_EDU), title: z.string().min(2).max(40), intro: z.string().min(1).max(500), place: z.string().min(1), start_at: z.string().min(1), end_at: z.string().min(1),
  capacity: z.number().int().min(1).max(500), audience: z.string().default('初中'), organizer_type: z.enum(ORGANIZER_TYPES).default('school'),
  schedule: z.array(z.string()).default([]), bring: z.array(z.string()).default([]), safety: z.string().default('全程有老师或志愿者陪同。'),
});
export type ActivityCreateReq = z.infer<typeof ActivityCreateReq>;
/** → activityRoster 响应：组织者看到的名单。只记参与与亮点，不做心理判断 */
export interface ActivityRoster {
  activity: ActivityDetail;
  items: { student: StudentBrief; status: MyActivityStatus; reflection?: string; witnessed: boolean }[];
}
/** → activityWitness 请求：老师或志愿者为学生的参与做见证，写进成长护照 */
export const ActivityWitnessReq = z.object({ student_id: z.string().min(1) });
export type ActivityWitnessReq = z.infer<typeof ActivityWitnessReq>;

// ════════ 成长护照自己加记录、今日小行动 ════════
/** → passportAddRecord 请求；响应为 Passport */
export const PassportRecordReq = z.object({ edu: z.enum(FIVE_EDU), title: z.string().min(1).max(40), reflection: z.string().max(300).optional() });
export type PassportRecordReq = z.infer<typeof PassportRecordReq>;
/** → passportUpdate 请求：学生自己改“我擅长的”；响应为 Passport */
export const PassportUpdateReq = z.object({ strengths: z.array(z.string().min(1).max(12)).max(8) });
export type PassportUpdateReq = z.infer<typeof PassportUpdateReq>;

// ════════ 通知 ════════
/** → noticeList 响应为 { items: Notice[]; unread: number } */
export interface Notice {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  /** 点开后去哪：page 为前端自己的页面名，id 为对象 id */
  link?: { page: string; id?: string };
  read: boolean;
  created_at: string;
}
export interface NoticeList {
  items: Notice[];
  unread: number;
}

// ════════ 求助进度、预约 ════════
/** → helpRequests 响应为 HelpRequest[]。学生只看到进度，不看到等级 */
export interface HelpRequest {
  id: string;
  target: ContactTarget;
  created_at: string;
  status_text: string;
  steps: { label: string; done: boolean; at?: string }[];
}
/** → appointmentSlots 响应为 Slot[] */
export interface Slot {
  id: string;
  date: string;
  time: string;
  counselor_name: string;
  place: string;
  available: boolean;
}
/** → appointmentCreate 请求 */
export const AppointmentCreateReq = z.object({ slot_id: z.string().min(1), topic: z.enum(APPOINTMENT_TOPICS).default('other'), note: z.string().max(200).optional() });
export type AppointmentCreateReq = z.infer<typeof AppointmentCreateReq>;
/** → appointmentCreate / appointmentConfirm / appointmentCancel 响应；appointmentList 响应为 Appointment[] */
export interface Appointment {
  id: string;
  slot: Slot;
  /** 仅心理教师可见 */
  student?: StudentBrief;
  topic: AppointmentTopic;
  note?: string;
  status: AppointmentStatus;
  created_at: string;
}

// ════════ 家校沟通单、内容推送、回访 ════════
/** → noteCreate 请求 */
export const NoteCreateReq = z.object({ student_id: z.string().min(1), kind: z.enum(NOTE_KINDS), text: z.string().min(1).max(300) });
export type NoteCreateReq = z.infer<typeof NoteCreateReq>;
/** → noteReply 请求 */
export const NoteReplyReq = z.object({ text: z.string().min(1).max(300) });
export type NoteReplyReq = z.infer<typeof NoteReplyReq>;
/** → noteList 响应为 HomeNote[]；noteCreate / noteReply 响应为 HomeNote */
export interface HomeNote {
  id: string;
  student: StudentBrief;
  from_name: string;
  kind: NoteKind;
  text: string;
  created_at: string;
  read_at?: string;
  reply?: { text: string; at: string };
}
/** → classPush 请求 */
export const ClassPushReq = z.object({ content_id: z.string().min(1), message: z.string().max(100).optional() });
export type ClassPushReq = z.infer<typeof ClassPushReq>;
/** → classPush 响应；classPushList 响应为 ClassPush[] */
export interface ClassPush {
  id: string;
  content: ContentCard;
  message?: string;
  teacher_name: string;
  created_at: string;
  /** 仅教师可见：班里多少人看完了 */
  completed_count?: number;
}
/** → followUps 响应为 FollowUp[]：今天和接下来要回访谁 */
export interface FollowUp {
  id: string;
  student: StudentBrief;
  what: string;
  due_at: string;
  case_id?: string;
  from: 'talk' | 'case_plan' | 'referral';
}

// ════════ 测评历史与概览 ════════
/** → assessmentHistory 响应为 AssessmentBrief[] */
export interface AssessmentBrief {
  session_id: string;
  instrument_name: string;
  kind: InstrumentKind;
  headline: string;
  created_at: string;
}
/** → assessmentOverview 响应：心理教师看到的本校测评概览。人数不足 10 时 low_count 为 null */
export interface AssessmentOverview {
  instruments: { instrument_id: string; name: string; done_count: number; low_count: number | null }[];
  recent: { session_id: string; student: StudentBrief; instrument_name: string; headline: string; suggest_talk: boolean; created_at: string }[];
}

// ════════ 规则、名册、公告 ════════
/** → riskRuleList 响应为 RiskRule[]；riskRuleUpdate 响应为 RiskRule */
export interface RiskRule {
  id: string;
  name: string;
  /** 用人话写清楚：什么情况下会提示、提示给谁 */
  description: string;
  source: SignalSource;
  level: SupportLevel;
  enabled: boolean;
  hits_30d: number;
  /** 被老师标记为“不需要关注”的次数，用来判断规则是否太敏感 */
  dismissed_30d: number;
}
export const RiskRuleUpdateReq = z.object({ enabled: z.boolean() });
export type RiskRuleUpdateReq = z.infer<typeof RiskRuleUpdateReq>;
/** → rosterPreview 请求：把表格里的行贴进来先校验，不落库 */
export const RosterRow = z.object({ name: z.string(), sno: z.string(), class_name: z.string(), guardian_phone: z.string().optional() });
export const RosterPreviewReq = z.object({ rows: z.array(RosterRow).min(1).max(2000) });
export type RosterPreviewReq = z.infer<typeof RosterPreviewReq>;
/** → rosterPreview / rosterCommit 响应。错误行不阻断整批，可下载后修正 */
export interface RosterResult {
  total: number;
  valid: number;
  errors: { row: number; field: string; message: string }[];
  imported?: number;
}
/** → announcementCreate 请求 */
export const AnnouncementCreateReq = z.object({ title: z.string().min(2).max(40), body: z.string().min(1).max(500), audience: z.enum(AUDIENCES).default('all') });
export type AnnouncementCreateReq = z.infer<typeof AnnouncementCreateReq>;
/** → announcementList 响应为 Announcement[] */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  author: string;
  created_at: string;
}

// ════════ 导出审批、紧急访问 ════════
/** → exportCreate 请求 */
export const ExportCreateReq = z.object({ scope: z.enum(EXPORT_SCOPES), reason: z.string().min(4).max(200) });
export type ExportCreateReq = z.infer<typeof ExportCreateReq>;
/** → exportApprove 请求 */
export const ExportApproveReq = z.object({ approve: z.boolean() });
export type ExportApproveReq = z.infer<typeof ExportApproveReq>;
/** → exportCreate / exportApprove 响应；exportList 响应为 ExportJob[] */
export interface ExportJob {
  id: string;
  scope: ExportScope;
  requester_name: string;
  requester_role: Role;
  reason: string;
  status: ExportStatus;
  /** 水印文字：谁、什么时候导出的 */
  watermark: string;
  /** 批准后 24 小时内有效，最多下载 3 次 */
  expires_at?: string;
  downloads_left?: number;
  created_at: string;
}
/** → breakGlass 请求：紧急情况下临时扩大权限。理由不少于 20 字，最长 120 分钟 */
export const BreakGlassReq = z.object({ reason: z.string().min(20).max(300), minutes: z.number().int().min(10).max(120).default(120) });
export type BreakGlassReq = z.infer<typeof BreakGlassReq>;
/** → breakGlass / accessGrantReview 响应；accessGrantList 响应为 AccessGrant[] */
export interface AccessGrant {
  id: string;
  case_id: string;
  case_no: string;
  user_name: string;
  reason: string;
  created_at: string;
  expires_at: string;
  reviewed: boolean;
  reviewed_by?: string;
}

// ════════ 区域报告、系统状态 ════════
/** → regionDocument 响应：一键生成的区域报告，前端排版成可打印的页面 */
export interface RegionDocument {
  title: string;
  period: string;
  generated_at: string;
  watermark: string;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
}
/** → systemHealth 响应 */
export interface SystemHealth {
  uptime_30d: number;
  services: { name: string; status: 'ok' | 'slow' | 'down'; latency_ms: number }[];
  queues: { name: string; depth: number; failed: number }[];
  l3_notice_delivery_rate: number;
}

// ════════ 帮助与反馈 ════════
/** → helpFaqs 响应为 Faq[]，按当前角色返回 */
export interface Faq {
  id: string;
  group: string;
  q: string;
  a: string;
}
/** → feedbackCreate 请求；响应 { ok: true } */
export const FeedbackCreateReq = z.object({ kind: z.enum(FEEDBACK_KINDS), text: z.string().min(2).max(500) });
export type FeedbackCreateReq = z.infer<typeof FeedbackCreateReq>;
/** → postLike 响应 */
export interface LikeResult {
  liked: boolean;
  like_count: number;
}

export type { AppointmentTopic, Audience, ExportScope, NoteKind };
