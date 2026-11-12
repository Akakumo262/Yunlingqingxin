import { Injectable } from '@nestjs/common';
import { AlertItem, CheckIn, Me, Purpose, Role } from '@yunling/contracts';

const TENANT = '00000000-0000-7000-8000-000000000001';
const CLASS = '00000000-0000-7000-8000-0000000000c1';
const uid = (n: number) => `00000000-0000-7000-8000-0000000001${String(n).padStart(2, '0')}`;

/** 演示账号（合成数据）。account 即登录名，G0 用 /auth/dev-login 免密登录 */
export interface DemoUser extends Me {
  account: string;
}
const school = { tenant_id: TENANT, school_name: '演示中学' };
const klass = { class_id: CLASS, class_name: '八年级（3）班' };

export const DEMO_USERS: DemoUser[] = [
  { account: 'student01', id: uid(1), student_id: uid(1), name: '测试学生001', roles: [Role.student], purposes: [Purpose.growth, Purpose.crisis], ...school, ...klass },
  { account: 'parent01', id: uid(2), name: '测试家长001', roles: [Role.guardian], purposes: [Purpose.growth], ...school },
  { account: 'teacher01', id: uid(3), name: '测试班主任', roles: [Role.headTeacher], purposes: [Purpose.growth, Purpose.crisis], ...school, ...klass },
  { account: 'psy01', id: uid(4), name: '测试心理教师', roles: [Role.psychologist], purposes: [Purpose.growth, Purpose.crisis], ...school },
  { account: 'leader01', id: uid(5), name: '测试校领导', roles: [Role.schoolLeader], purposes: [Purpose.crisis, Purpose.stats], ...school },
  { account: 'edu01', id: uid(6), name: '测试教体局', roles: [Role.eduAdmin], purposes: [Purpose.stats], tenant_id: TENANT },
  { account: 'ops01', id: uid(7), name: '测试运营', roles: [Role.operator], purposes: [Purpose.growth], tenant_id: TENANT },
  { account: 'audit01', id: uid(8), name: '测试审计员', roles: [Role.auditor], purposes: [Purpose.audit], tenant_id: TENANT },
];

/**
 * 骨架用的内存数据。填肉时每个模块换成自己的 Kysely 仓储（走 infra/db.ts 的 withTenant），
 * 本文件最终只保留演示账号种子。
 */
@Injectable()
export class Store {
  readonly users = DEMO_USERS;
  readonly checkIns = new Map<string, (CheckIn & { student_id: string; client_id?: string })[]>();
  readonly alerts: AlertItem[] = [];
}
