import { lazy } from 'react';
import { Role } from '@yunling/contracts';

export interface MenuDef {
  path: string;
  name: string;
  roles: Role[];
  page: React.LazyExoticComponent<() => JSX.Element>;
}

const teacher: Role[] = [Role.headTeacher, Role.psychologist, Role.schoolLeader];

/** 菜单 = Web 端页面清单。按角色过滤只影响体验，权限以服务端为准。 */
export const MENUS: MenuDef[] = [
  { path: '/today', name: '今日待办', roles: teacher, page: lazy(() => import('@/pages/Workbench')) },
  { path: '/class', name: '我的班级', roles: [Role.headTeacher], page: lazy(() => import('@/pages/ClassBoard')) },
  { path: '/cases', name: '个案', roles: teacher, page: lazy(() => import('@/pages/Cases')) },
  { path: '/referrals', name: '转介', roles: [Role.psychologist, Role.institution], page: lazy(() => import('@/pages/Referrals')) },
  { path: '/resources', name: '话术与微课', roles: teacher, page: lazy(() => import('@/pages/Resources')) },
  { path: '/circles', name: '成长圈审核', roles: [Role.headTeacher, Role.operator], page: lazy(() => import('@/pages/Moderation')) },
  { path: '/region', name: '区域看板', roles: [Role.eduAdmin, Role.schoolLeader], page: lazy(() => import('@/pages/Region')) },
  { path: '/supervision', name: '督办', roles: [Role.eduAdmin], page: lazy(() => import('@/pages/Supervision')) },
  { path: '/orgs', name: '学校与班级', roles: [Role.schoolAdmin, Role.eduAdmin, Role.operator], page: lazy(() => import('@/pages/Orgs')) },
  { path: '/contents', name: '内容审核', roles: [Role.operator], page: lazy(() => import('@/pages/ContentReview')) },
  { path: '/institutions', name: '机构入驻', roles: [Role.operator, Role.committee], page: lazy(() => import('@/pages/Institutions')) },
  { path: '/tenants', name: '开通管理', roles: [Role.operator], page: lazy(() => import('@/pages/Tenants')) },
  { path: '/audit', name: '审计查询', roles: [Role.auditor], page: lazy(() => import('@/pages/Audit')) },
];

export const menusFor = (roles: Role[]) => MENUS.filter((m) => m.roles.some((r) => roles.includes(r)));
