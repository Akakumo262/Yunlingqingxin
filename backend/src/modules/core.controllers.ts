import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import {
  AlertItem, AuditEvent, CheckIn, CheckInCreateReq, DevLoginReq, JwtClaims, Me, Page, Role, Routes,
  SignalCreateReq, SignalCreated, SupportLevel, TokenPair,
} from '@yunling/contracts';
import { config } from '../config';
import { AuthUser, CurrentUser, Guarded } from '../common/auth';
import { AuditService } from '../common/audit';
import { Problem } from '../common/problem';
import { ZodPipe } from '../common/zod.pipe';
import { Store } from '../infra/store';

/**
 * 参考实现：一条贯穿三端的最小链路
 *   学生打卡 → 学生一键求助 → 班主任看到预警并确认 → 审计员查到全过程
 * 这只是起步骨架，实现了 59 个接口里的 8 个。完整行为以 contracts/src/mock/index.ts 为准，
 * 目录怎么拆、用不用这些文件，由后端开发者自己决定。
 */

@Controller()
export class HealthController {
  @Get(Routes.health.path)
  @Guarded(Routes.health)
  health() {
    return { status: 'ok', data: config.databaseUrl ? 'postgres' : 'memory', time: new Date().toISOString() };
  }
}

@Controller()
export class AuthController {
  constructor(private readonly store: Store, private readonly audit: AuditService) {}

  @Post(Routes.authDevLogin.path)
  @Guarded(Routes.authDevLogin)
  devLogin(@Body(new ZodPipe(DevLoginReq)) body: DevLoginReq): TokenPair {
    if (!config.enableDevLogin) throw new Problem(404, 'NOT_FOUND', '未开启演示登录');
    const u = this.store.users.find((x) => x.account === body.account);
    if (!u) throw new Problem(401, 'UNAUTHENTICATED', '账号不存在');
    const claims: JwtClaims = { sub: u.id, tid: u.tenant_id, roles: u.roles, purpose: u.purposes, jti: randomUUID() };
    this.audit.record({ user: claims, action: 'login', resourceType: 'session', result: 'allow' });
    return {
      access_token: jwt.sign(claims, config.jwtSecret, { expiresIn: config.accessTtlSec }),
      refresh_token: randomUUID(), // 填肉：存 hash、轮换、撤销
      expires_in: config.accessTtlSec,
      activated: true,
    };
  }

  @Get(Routes.me.path)
  @Guarded(Routes.me)
  me(@CurrentUser() user: AuthUser): Me {
    const u = this.store.users.find((x) => x.id === user.sub);
    if (!u) throw new Problem(401, 'UNAUTHENTICATED', '用户不存在');
    const { account: _account, ...me } = u;
    return me;
  }
}

@Controller()
export class CheckInController {
  constructor(private readonly store: Store, private readonly audit: AuditService) {}

  @Post(Routes.checkInCreate.path)
  @Guarded(Routes.checkInCreate)
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(CheckInCreateReq)) body: CheckInCreateReq): CheckIn {
    const list = this.store.checkIns.get(user.sub) ?? [];
    // 幂等：同一 client_id 重复提交返回原记录
    const dup = body.client_id && list.find((c) => c.client_id === body.client_id);
    if (dup) return { id: dup.id, mood: dup.mood, note: dup.note, created_at: dup.created_at };
    const row = { id: randomUUID(), student_id: user.sub, mood: body.mood, note: body.note, client_id: body.client_id, created_at: new Date().toISOString() };
    this.store.checkIns.set(user.sub, [row, ...list]);
    this.audit.record({ user, action: 'check_in.create', resourceType: 'check_in', resourceId: row.id, result: 'allow' });
    return { id: row.id, mood: row.mood, note: row.note, created_at: row.created_at };
  }

  @Get(Routes.checkInList.path)
  @Guarded(Routes.checkInList)
  list(@CurrentUser() user: AuthUser, @Query('limit') limit = '20'): Page<CheckIn> {
    const items = (this.store.checkIns.get(user.sub) ?? []).slice(0, Number(limit)).map(({ id, mood, note, created_at }) => ({ id, mood, note, created_at }));
    return { items, next_cursor: null };
  }
}

@Controller()
export class AlertController {
  constructor(private readonly store: Store, private readonly audit: AuditService) {}

  @Post(Routes.signalCreate.path)
  @Guarded(Routes.signalCreate)
  createSignal(@CurrentUser() user: AuthUser, @Req() req: any, @Body(new ZodPipe(SignalCreateReq)) body: SignalCreateReq): SignalCreated {
    const isStudent = user.roles.includes(Role.student);
    const studentId = isStudent ? user.sub : body.student_id;
    const student = this.store.users.find((u) => u.id === studentId);
    if (!student) throw new Problem(422, 'VALIDATION_FAILED', '缺少学生');
    // 一键求助按 L3 时限处理（BR-17）：15 分钟触达、2 小时首次介入。等级需人工确认后才进入个案（BR-15）。
    const level: SupportLevel = body.source === 'one_click_help' ? 'L3' : 'L1';
    const now = Date.now();
    const alert: AlertItem = {
      id: randomUUID(),
      level,
      status: 'open',
      source: body.source,
      student: { id: student.id, name: student.name, class_name: student.class_name ?? '' },
      reason: body.source === 'one_click_help' ? '学生主动求助' : (body.message ?? '教师上报'),
      due_at: new Date(now + 15 * 60_000).toISOString(),
      created_at: new Date(now).toISOString(),
    };
    this.store.alerts.unshift(alert);
    this.audit.record({ user, action: 'signal.create', resourceType: 'alert', resourceId: alert.id, result: 'allow', requestId: req.id });
    // 填肉：按通知矩阵（BR-16）投递 notify 队列，站内 + 短信 + 电话升级
    return {
      signal_id: randomUUID(),
      alert_id: alert.id,
      status: 'notified',
      sla: { acknowledge_by: alert.due_at, intervene_by: new Date(now + 2 * 3600_000).toISOString() },
      notified: [{ role: Role.headTeacher, channel: 'in_app', status: 'sent' }, { role: Role.psychologist, channel: 'in_app', status: 'sent' }],
      next: '老师会在 15 分钟内联系你；如果情况紧急，请直接拨打 12355。',
    };
  }

  @Get(Routes.alertList.path)
  @Guarded(Routes.alertList)
  list(@CurrentUser() user: AuthUser): Page<AlertItem> {
    // 填肉：数据域过滤（班主任只看本班，心理教师/校领导看本校）+ 字段脱敏
    this.audit.record({ user, action: 'alert.list', resourceType: 'alert', result: 'allow' });
    return { items: this.store.alerts, next_cursor: null };
  }

  @Post(Routes.alertAck.path)
  @Guarded(Routes.alertAck)
  ack(@CurrentUser() user: AuthUser, @Param('id') id: string): AlertItem {
    const alert = this.store.alerts.find((a) => a.id === id);
    if (!alert) throw new Problem(404, 'NOT_FOUND', '预警不存在');
    if (alert.status === 'open') {
      alert.status = 'acked';
      alert.acked_by_name = this.store.users.find((u) => u.id === user.sub)?.name ?? '';
      alert.acked_at = new Date().toISOString();
      this.audit.record({ user, action: 'alert.ack', resourceType: 'alert', resourceId: id, result: 'allow' });
    }
    return alert;
  }
}

@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get(Routes.auditEvents.path)
  @Guarded(Routes.auditEvents)
  list(@Query('limit') limit = '50'): Page<AuditEvent> {
    return { items: this.audit.list(Number(limit)), next_cursor: null };
  }
}
