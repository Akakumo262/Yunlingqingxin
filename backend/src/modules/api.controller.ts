import { All, Controller, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { createMock, fixtures, matchRoute, type RouteName, type TokenPair } from '@yunling/contracts';
import { randomUUID } from 'node:crypto';
import { config } from '../config';
import { Problem } from '../common/problem';
import { RuntimePersistence } from '../infra/runtime-persistence';

/**
 * 后端 HTTP 适配层。
 *
 * 契约包中的 createMock 是 59 个接口的行为参考实现。这里把它接入
 * Nest/Fastify，使真实后端拥有独立的 HTTP 进程、统一错误格式、CORS、
 * 请求 ID 和路由匹配；业务状态由单例服务持有，后续可在此边界替换为
 * PostgreSQL 仓储而无需改变前端契约。
 */
@Controller()
export class ApiController {
  private readonly service = createMock();
  private readonly refreshTokens = new Map<string, string>();

  constructor(private readonly persistence: RuntimePersistence) {}

  @All('*')
  async dispatch(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const url = String(req.url ?? '').split('?')[0];
    const matched = matchRoute(String(req.method).toUpperCase(), url);
    if (!matched) throw new Problem(404, 'NOT_FOUND', '接口不存在');

    const headers = req.headers as Record<string, string | undefined>;
    const internalToken = this.toInternalToken(headers.authorization);
    const result = this.service.call(matched.name as RouteName, {
      token: internalToken,
      purpose: headers['x-purpose-code'],
      params: matched.params,
      query: (req.query ?? {}) as Record<string, unknown>,
      body: req.body,
    });

    void this.persistence.record({
      method: String(req.method).toUpperCase(),
      route: url,
      status: result.status,
      purpose: headers['x-purpose-code'],
      requestId: String((req as FastifyRequest & { id?: string }).id ?? ''),
      token: headers.authorization,
    });

    const body = result.status < 400 && this.isLoginRoute(matched.name) ? this.issueJwt(result.body as TokenPair) : result.body;
    reply.header('content-type', result.status >= 400 ? 'application/problem+json' : 'application/json; charset=utf-8');
    return reply.status(result.status).send(body);
  }

  private isLoginRoute(name: RouteName) {
    return name === 'authDevLogin' || name === 'authWechatLogin' || name === 'authPasswordLogin';
  }

  private issueJwt(pair: TokenPair): TokenPair {
    const mockToken = pair.access_token;
    const account = mockToken.replace(/^mock\./, '');
    const user = fixtures.USERS.find((u) => u.account === account);
    if (!user) return pair;
    const access = jwt.sign(
      { sub: user.id, account, tid: user.tenant_id, roles: user.roles, purpose: user.purposes, jti: randomUUID() },
      config.jwtSecret,
      { expiresIn: config.accessTtlSec, algorithm: 'HS256' },
    );
    const refresh = randomUUID();
    this.refreshTokens.set(refresh, account);
    return { ...pair, access_token: access, refresh_token: refresh, expires_in: config.accessTtlSec };
  }

  private toInternalToken(header?: string) {
    if (!header?.startsWith('Bearer ')) return header;
    const token = header.slice(7);
    if (token.startsWith('mock.')) return header;
    try {
      const claims = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload & { account?: string };
      return claims.account ? `Bearer mock.${claims.account}` : header;
    } catch {
      return header;
    }
  }
}
