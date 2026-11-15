import { lazy } from 'react';
import { Role } from '@yunling/contracts';

export interface MenuDef {
  group: string;
  path: string;
  name: string;
  icon: string;
  roles: Role[];
  page: React.LazyExoticComponent<() => JSX.Element>;
}

const HT = Role.headTeacher, PSY = Role.psychologist, SL = Role.schoolLeader, SA = Role.schoolAdmin, EDU = Role.eduAdmin;
const CMT = Role.committee, COM = Role.community, INST = Role.institution, OP = Role.operator, AUD = Role.auditor;
const teacher: Role[] = [HT, PSY, SL];
const staff: Role[] = [HT, PSY, SL, SA, EDU, CMT, COM, OP];

/** 菜单 = Web 端页面清单。按角色过滤只影响体验，权限以服务端为准。 */
export const MENUS: MenuDef[] = [
  { group: '每天', path: '/today', name: '今日待办', icon: 'today', roles: teacher, page: lazy(() => import('@/pages/Workbench')) },
  { group: '每天', path: '/class', name: '我的班级', icon: 'class', roles: [HT], page: lazy(() => import('@/pages/ClassBoard')) },
  { group: '每天', path: '/notes', name: '家校沟通', icon: 'mail', roles: [HT], page: lazy(() => import('@/pages/Notes')) },
  { group: '每天', path: '/activities', name: '五育活动', icon: 'flag', roles: [HT, PSY, CMT, COM], page: lazy(() => import('@/pages/Activities')) },

  { group: '支持', path: '/cases', name: '个案', icon: 'cases', roles: teacher, page: lazy(() => import('@/pages/Cases')) },
  { group: '支持', path: '/referrals', name: '转介', icon: 'referral', roles: [PSY, INST], page: lazy(() => import('@/pages/Referrals')) },
  { group: '支持', path: '/appointments', name: '面谈预约', icon: 'calendar', roles: [PSY], page: lazy(() => import('@/pages/Appointments')) },
  { group: '支持', path: '/assessments', name: '问卷概览', icon: 'form', roles: [PSY], page: lazy(() => import('@/pages/Assessments')) },

  { group: '资源', path: '/resources', name: '内容与话术', icon: 'book', roles: teacher, page: lazy(() => import('@/pages/Resources')) },
  { group: '资源', path: '/circles', name: '成长圈审核', icon: 'chat', roles: [HT, OP], page: lazy(() => import('@/pages/Moderation')) },

  { group: '区域', path: '/region', name: '区域看板', icon: 'chart', roles: [EDU, SL], page: lazy(() => import('@/pages/Region')) },
  { group: '区域', path: '/report', name: '月度报告', icon: 'doc', roles: [EDU, SL], page: lazy(() => import('@/pages/RegionDoc')) },
  { group: '区域', path: '/supervision', name: '督办', icon: 'watch', roles: [EDU], page: lazy(() => import('@/pages/Supervision')) },

  { group: '管理', path: '/orgs', name: '学校与班级', icon: 'tree', roles: [SA, EDU, OP], page: lazy(() => import('@/pages/Orgs')) },
  { group: '管理', path: '/contents', name: '内容审核', icon: 'check', roles: [OP], page: lazy(() => import('@/pages/ContentReview')) },
  { group: '管理', path: '/library', name: '内容库', icon: 'library', roles: [OP], page: lazy(() => import('@/pages/Library')) },
  { group: '管理', path: '/institutions', name: '机构入驻', icon: 'building', roles: [OP, CMT], page: lazy(() => import('@/pages/Institutions')) },
  { group: '管理', path: '/tenants', name: '开通管理', icon: 'key', roles: [OP], page: lazy(() => import('@/pages/Tenants')) },
  { group: '管理', path: '/rules', name: '提醒规则', icon: 'rule', roles: [PSY, SL, OP], page: lazy(() => import('@/pages/Rules')) },
  { group: '管理', path: '/announcements', name: '公告', icon: 'megaphone', roles: staff, page: lazy(() => import('@/pages/Announcements')) },

  { group: '合规', path: '/exports', name: '数据导出', icon: 'download', roles: [HT, PSY, SL, EDU, AUD], page: lazy(() => import('@/pages/Exports')) },
  { group: '合规', path: '/grants', name: '紧急访问', icon: 'unlock', roles: [SL, AUD], page: lazy(() => import('@/pages/Grants')) },
  { group: '合规', path: '/audit', name: '审计查询', icon: 'shield', roles: [AUD], page: lazy(() => import('@/pages/Audit')) },
  { group: '合规', path: '/matrix', name: '权限矩阵', icon: 'grid', roles: [OP, AUD, SL, EDU], page: lazy(() => import('@/pages/Matrix')) },
  { group: '合规', path: '/health', name: '系统状态', icon: 'pulse', roles: [OP], page: lazy(() => import('@/pages/Health')) },
];

export const menusFor = (roles: Role[]) => MENUS.filter((m) => m.roles.some((r) => roles.includes(r)));

/** 通知里的 link.page → Web 端路径。小程序有自己的映射。 */
export const NOTICE_PATH: Record<string, string> = {
  today: '/today', cases: '/cases', referrals: '/referrals', circles: '/circles', contents: '/contents', institutions: '/institutions',
  appointments: '/appointments', notes: '/notes', exports: '/exports', grants: '/grants', announcements: '/announcements', health: '/health', activity: '/activities',
};
