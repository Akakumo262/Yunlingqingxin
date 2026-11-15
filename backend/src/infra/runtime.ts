import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash, createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import * as jwt from 'jsonwebtoken';
import { createMock, fixtures, type MockRequest } from '@yunling/contracts/dist/mock';
import { HeaderNames, matchRoute, Routes, type RouteDef, type Role, type PurposeCode, type RouteName } from '@yunling/contracts';
import { config } from '../config';
import { Problem } from '../common/problem';

type JsonRecord = Record<string, unknown>;
type RuntimeRequest = {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  body?: unknown;
};

type Claims = jwt.JwtPayload & {
  account: string;
  tenant_id: string;
  roles: Role[];
  purposes: PurposeCode[];
};

const AUTH_ROUTES = new Set<RouteName>(['authDevLogin', 'authPasswordLogin', 'authWechatLogin']);
const CONTENT_ROUTES = new Set<RouteName>(['contentFeed', 'contentGet', 'contentCreate', 'contentReviewQueue', 'contentAdminList', 'searchAll']);
const JSON_NULL = JSON.stringify(null);

/**
 * 第一阶段的真实后端适配层：
 * - HTTP、JWT、事务和事件持久化由 backend 负责；
 * - contracts mock 只作为行为规格和种子数据来源；
 * - 每个成功写请求以 AES-GCM 加密事件写进 PostgreSQL，重启时按顺序重放。
 *
 * 这样可以先让 118 个契约在真实端口上运行，并为后续逐模块替换仓储保留可回放的行为基线。
 */
@Injectable()
export class RuntimeService implements OnModuleDestroy {
  private readonly mock = createMock();
  private readonly pool = config.databaseUrl ? new Pool({ connectionString: config.databaseUrl, max: 10 }) : null;
  private readonly key = createHash('sha256').update(config.dataEncryptionKey).digest();
  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.initialize();
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async handle(req: RuntimeRequest): Promise<{ status: number; body: unknown; contentType?: string }> {
    await this.ready;
    const routeMatch = matchRoute(req.method, req.url.split('?')[0]);
    if (!routeMatch) throw new Problem(404, 'NOT_FOUND', '接口不存在');
    const { name, params } = routeMatch;
    const route = Routes[name];
    const account = this.accountFromHeader(req.headers[HeaderNames.auth]);
    const token = account ? `mock.${account}` : undefined;
    const purpose = this.header(req.headers[HeaderNames.purpose]);
    const mockReq: MockRequest = { token, purpose, params, query: req.query ?? {}, body: req.body };
    const response = this.mock.call(name, mockReq);
    const eventAccount = account ?? this.accountForRequest(name, req.body) ?? (route.roles === 'public' && route.method !== 'GET' ? 'ops01' : undefined);

    // 打卡记录先由契约 mock 负责业务校验，再以独立表落库；列表把数据库中
    // 尚未进入当前 mock 状态的记录合并回来，保证重启或事件被清理后仍可读。
    if (name === 'checkInCreate' && response.status < 300 && eventAccount) {
      await this.persistCheckIn(eventAccount, req.body, response.body);
    }
    if (name === 'checkInList' && response.status < 300 && account) {
      response.body = await this.mergePersistedCheckIns(account, response.body);
    }
    if (CONTENT_ROUTES.has(name) && response.status < 300) {
      response.body = await this.decorateContentResponse(name, response.body);
    }

    if (AUTH_ROUTES.has(name) && response.status < 300) {
      const body = await this.issueAccessToken(name, req.body, response.body as JsonRecord);
      if (eventAccount) await this.appendEvent(eventAccount, route, name, purpose as PurposeCode | null, params, req.query ?? {}, req.body, body);
      return { status: response.status, body };
    }

    if (response.status < 300 && route.method !== 'GET' && name !== 'health' && eventAccount) {
      await this.appendEvent(eventAccount, route, name, purpose as PurposeCode | null, params, req.query ?? {}, req.body, response.body);
    }
    return { status: response.status, body: response.body, contentType: response.status >= 400 ? 'application/problem+json' : undefined };
  }

  private async initialize() {
    if (!this.pool) {
      if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL must be configured in production');
      return;
    }
    const client = await this.pool.connect();
    let rows: { rows: Array<{
      account: string; route_name: RouteName; purpose: PurposeCode | null; params: Record<string, string>; query: Record<string, unknown>;
      payload_ciphertext: string; payload_iv: string; payload_tag: string;
      result_ciphertext: string | null; result_iv: string | null; result_tag: string | null;
    }> };
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.tenant_id', 'tenant-demo', true)`);
      rows = await client.query(`SELECT account, route_name, purpose, params, query, payload_ciphertext, payload_iv, payload_tag, result_ciphertext, result_iv, result_tag FROM app_runtime.events ORDER BY id`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    const idMap = new Map<string, string>();
    for (const row of rows.rows) {
      const body = this.replaceIds(this.decrypt(row.payload_ciphertext, row.payload_iv, row.payload_tag), idMap);
      const params = this.replaceIds(row.params, idMap);
      const query = this.replaceIds(row.query, idMap);
      const result = this.mock.call(row.route_name, { token: AUTH_ROUTES.has(row.route_name) ? undefined : `mock.${row.account}`, purpose: row.purpose, params, query, body });
      if (result.status >= 300) {
        const message = `无法重放事件 ${row.route_name}: ${result.status}`;
        if (process.env.REPLAY_STRICT === 'true' || process.env.NODE_ENV === 'production') throw new Error(message);
        console.warn(`[runtime] ${message}，已跳过该历史事件`);
        continue;
      }
      if (row.result_ciphertext && row.result_iv && row.result_tag) {
        const original = this.decrypt(row.result_ciphertext, row.result_iv, row.result_tag);
        this.collectIds(original, result.body, idMap);
      }
    }
  }

  private async appendEvent(account: string, route: RouteDef, name: RouteName, purpose: PurposeCode | null | undefined, params: Record<string, string>, query: Record<string, unknown>, body: unknown, responseBody: unknown) {
    if (!this.pool) return;
    const user = fixtures.USERS.find((x) => x.account === account);
    if (!user) return;
    const encrypted = this.encrypt(body === undefined ? JSON_NULL : JSON.stringify(body));
    const result = this.encrypt(responseBody === undefined ? JSON_NULL : JSON.stringify(responseBody));
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [user.tenant_id]);
      await client.query(
        `INSERT INTO app_runtime.events (tenant_id, account, route_name, purpose, params, query, payload_ciphertext, payload_iv, payload_tag, result_ciphertext, result_iv, result_tag)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12)`,
        [user.tenant_id, account, name, purpose ?? null, JSON.stringify(params), JSON.stringify(query), encrypted.ciphertext, encrypted.iv, encrypted.tag, result.ciphertext, result.iv, result.tag],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private accountFromHeader(value: string | string[] | undefined): string | undefined {
    const header = this.header(value);
    if (!header?.startsWith('Bearer ')) return undefined;
    const token = header.slice(7);
    try {
      const claims = jwt.verify(token, config.jwtSecret) as Claims;
      return claims.account;
    } catch {
      if (token.startsWith('mock.')) return token.slice(5);
      return undefined;
    }
  }

  private accountForRequest(name: RouteName, body: unknown): string | undefined {
    const b = (body ?? {}) as JsonRecord;
    if (name === 'authWechatLogin') {
      const code = String(b.code ?? '');
      return code.startsWith('guardian') ? 'parent01' : code.startsWith('new') ? 'student02' : 'student01';
    }
    if (name === 'authDevLogin' || name === 'authPasswordLogin') return String(b.account ?? '') || undefined;
    return undefined;
  }

  private async issueAccessToken(name: RouteName, body: unknown, response: JsonRecord): Promise<JsonRecord> {
    const b = (body ?? {}) as JsonRecord;
    const account = name === 'authWechatLogin'
      ? String(b.code ?? '').startsWith('guardian') ? 'parent01' : String(b.code ?? '').startsWith('new') ? 'student02' : 'student01'
      : String(b.account ?? '');
    const user = fixtures.USERS.find((x) => x.account === account);
    if (!user) return response;
    const refreshToken = randomUUID();
    const claims: Claims = {
      sub: user.id,
      account: user.account,
      tenant_id: user.tenant_id,
      roles: user.roles,
      purposes: user.purposes,
      jti: randomUUID(),
    };
    await this.persistRefreshToken(user.tenant_id, user.account, refreshToken);
    return {
      ...response,
      access_token: jwt.sign(claims, config.jwtSecret, { expiresIn: config.accessTtlSec }),
      refresh_token: refreshToken,
      expires_in: config.accessTtlSec,
    };
  }

  private async persistRefreshToken(tenantId: string, account: string, refreshToken: string) {
    if (!this.pool) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
      await client.query(
        `INSERT INTO app_runtime.refresh_tokens (tenant_id, account, token_hash, expires_at)
         VALUES ($1, $2, $3, now() + ($4 * interval '1 second'))`,
        [tenantId, account, createHash('sha256').update(refreshToken).digest('hex'), config.refreshTtlSec],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async persistCheckIn(account: string, body: unknown, responseBody: unknown) {
    if (!this.pool) return;
    const user = fixtures.USERS.find((x) => x.account === account);
    if (!user?.student_id || !responseBody || typeof responseBody !== 'object') return;
    const response = responseBody as JsonRecord;
    const payload = (body ?? {}) as JsonRecord;
    const createdAt = String(response.created_at ?? new Date().toISOString());
    const clientId = payload.client_id == null ? null : String(payload.client_id);
    const note = response.note == null ? null : this.encrypt(String(response.note));
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [user.tenant_id]);
      await client.query(
        `INSERT INTO app_runtime.check_ins (id, tenant_id, account, student_id, client_id, mood, note_ciphertext, note_iv, note_tag, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz)
         ON CONFLICT (id) DO NOTHING`,
        [String(response.id), user.tenant_id, account, user.student_id, clientId, String(response.mood), note?.ciphertext ?? null, note?.iv ?? null, note?.tag ?? null, createdAt],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async mergePersistedCheckIns(account: string, body: unknown) {
    if (!this.pool || !body || typeof body !== 'object') return body;
    const user = fixtures.USERS.find((x) => x.account === account);
    if (!user?.student_id) return body;
    const current = body as JsonRecord;
    const items = Array.isArray(current.items) ? current.items as JsonRecord[] : [];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [user.tenant_id]);
      const rows = await client.query(
        `SELECT id, mood, note_ciphertext, note_iv, note_tag, created_at FROM app_runtime.check_ins
         WHERE tenant_id = $1 AND student_id = $2 ORDER BY created_at DESC`,
        [user.tenant_id, user.student_id],
      );
      await client.query('COMMIT');
      const seen = new Set(items.map((item) => String(item.id)));
      const persisted = rows.rows
        .filter((row) => !seen.has(String(row.id)))
        .map((row) => {
          let note: string | undefined;
          if (row.note_ciphertext && row.note_iv && row.note_tag) note = this.decryptText(row.note_ciphertext, row.note_iv, row.note_tag);
          return { id: row.id, mood: row.mood, ...(note == null ? {} : { note }), created_at: new Date(row.created_at).toISOString() };
        });
      const limit = Math.min(Number((current as JsonRecord).limit) || 20, 100);
      const merged = [...items, ...persisted].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { ...current, items: merged.slice(0, limit), next_cursor: merged.length > limit ? String(limit) : null };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 将发现流的外部来源元数据附加到契约内容卡片。
   * 元数据单独存储，只有完成 source_verified 的导入记录才会带上外链。
   */
  private async decorateContentResponse(name: RouteName, body: unknown) {
    if (!this.pool || !body || typeof body !== 'object') return body;
    const root = body as JsonRecord;
    const cards: JsonRecord[] = [];
    if (name === 'contentGet' || name === 'contentCreate') cards.push(root);
    if (name === 'contentFeed' || name === 'contentAdminList' || name === 'searchAll') {
      const items = Array.isArray(root.items) ? root.items : Array.isArray(root.contents) ? root.contents : [];
      for (const item of items) if (item && typeof item === 'object') cards.push(item as JsonRecord);
    }
    if (name === 'contentReviewQueue') {
      const items = Array.isArray(root.items) ? root.items : [];
      for (const item of items) {
        if (item && typeof item === 'object' && (item as JsonRecord).content && typeof (item as JsonRecord).content === 'object') {
          cards.push((item as JsonRecord).content as JsonRecord);
        }
      }
    }
    const ids = [...new Set(cards.map((card) => String(card.id ?? '')).filter(Boolean))];
    if (!ids.length) return body;
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT content_id, external_url, source_verified, discover_kind, audience_stages, deadline, location
         FROM cnt.content_discovery WHERE content_id = ANY($1::text[])`,
        [ids],
      );
      const metadata = new Map(result.rows.map((row) => [String(row.content_id), row]));
      for (const card of cards) {
        const row = metadata.get(String(card.id));
        if (!row) continue;
        card.source_verified = row.source_verified;
        card.discover_kind = row.discover_kind;
        card.audience_stages = row.audience_stages ?? [];
        // 未经审核的抓取候选只展示分类，不向学生暴露外链。
        if (row.source_verified) card.external_url = row.external_url;
        if (row.deadline) card.deadline = new Date(row.deadline).toISOString();
        if (row.location) card.location = row.location;
      }
      return body;
    } finally {
      client.release();
    }
  }

  private encrypt(text: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64');
    return { ciphertext, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
  }

  private decrypt(ciphertext: string, iv: string, tag: string) {
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const text = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
    return text === JSON_NULL ? undefined : JSON.parse(text);
  }

  private decryptText(ciphertext: string, iv: string, tag: string) {
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }

  private replaceIds<T>(value: T, idMap: Map<string, string>): T {
    if (typeof value === 'string') return (idMap.get(value) ?? value) as T;
    if (Array.isArray(value)) return value.map((item) => this.replaceIds(item, idMap)) as T;
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as JsonRecord).map(([k, v]) => [k, this.replaceIds(v, idMap)])) as T;
    return value;
  }

  private collectIds(original: unknown, replayed: unknown, idMap: Map<string, string>) {
    if (typeof original === 'string' && typeof replayed === 'string' && /^[a-z]+-\d+$/.test(original) && /^[a-z]+-\d+$/.test(replayed)) {
      idMap.set(original, replayed);
      return;
    }
    if (Array.isArray(original) && Array.isArray(replayed)) {
      original.forEach((value, index) => this.collectIds(value, replayed[index], idMap));
      return;
    }
    if (original && replayed && typeof original === 'object' && typeof replayed === 'object') {
      for (const key of Object.keys(original as JsonRecord)) this.collectIds((original as JsonRecord)[key], (replayed as JsonRecord)[key], idMap);
    }
  }

  private header(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
