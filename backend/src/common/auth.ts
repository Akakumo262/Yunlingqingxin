import { CanActivate, ExecutionContext, Injectable, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { HeaderNames, JwtClaims, PurposeCode, RouteDef } from '@yunling/contracts';
import { config } from '../config';
import { Problem } from './problem';
import { AuditService } from './audit';

const ROUTE_KEY = 'yl:route';

/**
 * 每个接口用契约里的路由定义声明权限：@Guarded(Routes.checkInCreate)
 * 角色与目的码只在 contracts/src/routes.ts 维护一份，后端不再手写。
 */
export const Guarded = (route: RouteDef) => SetMetadata(ROUTE_KEY, route);

export interface AuthUser extends JwtClaims {
  /** 本次请求声明的目的码 */
  activePurpose?: PurposeCode;
}
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);

/**
 * 全局守卫：认证 → RBAC → 目的码。
 * 数据域 / ABAC / 字段脱敏在各模块的应用服务里做；RLS 在数据库兜底。
 * 默认拒绝：没有 @Guarded 的接口一律 403。
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly audit: AuditService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const route = this.reflector.get<RouteDef | undefined>(ROUTE_KEY, ctx.getHandler());
    const req = ctx.switchToHttp().getRequest();
    if (!route) throw new Problem(403, 'FORBIDDEN', '接口未声明权限');
    if (route.roles === 'public') return true;

    const header: string | undefined = req.headers[HeaderNames.auth];
    if (!header?.startsWith('Bearer ')) throw new Problem(401, 'UNAUTHENTICATED', '未登录');
    let user: AuthUser;
    try {
      user = jwt.verify(header.slice(7), config.jwtSecret) as AuthUser;
    } catch {
      throw new Problem(401, 'UNAUTHENTICATED', '登录已过期');
    }

    const deny = (code: 'FORBIDDEN' | 'PURPOSE_DENIED', title: string, detail?: string): never => {
      this.audit.record({ user, action: `${route.method} ${route.path}`, resourceType: 'route', result: 'deny', requestId: req.id });
      throw new Problem(403, code, title, detail);
    };

    if (route.roles.length && !route.roles.some((r) => user.roles.includes(r))) deny('FORBIDDEN', '当前角色无权访问');

    if (route.purpose) {
      const sent = req.headers[HeaderNames.purpose] as PurposeCode | undefined;
      if (sent !== route.purpose || !user.purpose.includes(sent)) {
        deny('PURPOSE_DENIED', '目的码不允许', `该接口要求 ${route.purpose}，当前为 ${sent ?? '未携带'}`);
      }
      user.activePurpose = sent;
    }
    req.user = user;
    return true;
  }
}
