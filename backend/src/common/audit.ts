import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { AuditEvent, AuditResult } from '@yunling/contracts';
import type { AuthUser } from './auth';

export interface AuditInput {
  user?: AuthUser;
  action: string;
  resourceType: string;
  resourceId?: string;
  result: AuditResult;
  requestId?: string;
}

/**
 * 追加式审计 + 哈希链：hash = SHA256(prev_hash + canonical_json(event))。
 * 骨架为内存实现；填肉时改为同事务写 aud.audit_event（Outbox），接口不变。
 * 规则：所有 DS3/DS4 读取、写操作、权限拒绝都必须调用 record。
 */
@Injectable()
export class AuditService {
  private readonly events: AuditEvent[] = [];

  record(input: AuditInput): AuditEvent {
    const prev = this.events[this.events.length - 1]?.hash ?? null;
    const base = {
      id: randomUUID(),
      actor_id: input.user?.sub ?? null,
      actor_role: input.user?.roles[0] ?? null,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      purpose: input.user?.activePurpose ?? null,
      result: input.result,
      request_id: input.requestId ?? null,
      created_at: new Date().toISOString(),
    };
    const hash = createHash('sha256').update((prev ?? '') + JSON.stringify(base)).digest('hex');
    const event: AuditEvent = { ...base, prev_hash: prev, hash };
    this.events.push(event);
    return event;
  }

  list(limit = 50): AuditEvent[] {
    return this.events.slice(-limit).reverse();
  }
}
