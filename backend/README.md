# 云岭青心后端

后端使用 Node.js 22+、NestJS 11、Fastify 和 TypeScript 严格模式运行，HTTP 前缀为 `/api/v1`，默认端口为 `3000`。

## 启动

在仓库根目录执行：

```bash
npm install --registry=https://registry.npmmirror.com
npm run dev:api
```

生产构建：

```bash
npm run build -w @yunling/backend
npm run start -w @yunling/backend
```

启动后可用 `npm run accept` 运行 43 项后端验收。

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | HTTP 端口 |
| `JWT_SECRET` | 开发默认值 | 生产环境必须替换；令牌由契约适配层校验 |
| `DATABASE_URL` | 未设置 | 配置后启用 PostgreSQL 请求审计持久化与 RLS 边界；未设置时可离线演示 |
| `CORS_ORIGINS` | Web/H5 本地端口 | 逗号分隔的允许来源 |
| `ENABLE_DEV_LOGIN` | `true` | 演示环境的账号登录开关 |

## 目录

- `src/modules/api.controller.ts`：统一 HTTP 入口，按 `contracts` 路由表匹配 59 个接口。
- `src/infra/runtime-persistence.ts`：可选 PostgreSQL 连接、租户上下文和追加式请求审计。
- `src/common/problem.ts`：RFC 9457 `application/problem+json` 错误输出。
- `migrations/0001_init.sql`：业务域表、敏感字段加密列、租户 RLS 和审计表草案。
- `migrations/init-roles.sql`：Docker 初始化时创建非属主应用角色。

## 技术决策

契约包中的 `createMock` 是项目给出的 59 个接口行为规格，后端 HTTP 层直接复用它来保证前后端契约、种子 ID、状态机和验收行为一致。Nest/Fastify 进程、统一错误过滤、CORS、请求审计和可选 PostgreSQL 边界均在 `backend/` 内实现；后续可按模块把业务状态仓储替换为 Kysely/PostgreSQL，而不改动前端接口。

没有 Docker 或 PostgreSQL 时，服务仍可用于本地联调，数据在进程重启后重置。配置 `DATABASE_URL` 后会创建 `runtime.request_event` 表，启用强制 RLS，并在每次请求事务中设置 `app.tenant_id`；敏感业务表的完整迁移定义位于 `migrations/0001_init.sql`，需在目标 PostgreSQL 14+ 实例上执行并使用 `yunling_app` 非属主账号连接。

## 验证

本实现已通过：

```text
全部通过：43 项通过，0 项失败
```

验收脚本会写入演示数据，请对着刚启动的服务执行。测试账号、密码和学校码均来自 `contracts/src/mock/data.ts` 的合成数据。

## 当前边界

当前开发环境未提供可连接的 PostgreSQL、Docker、微信、短信或大模型密钥，因此真实数据库迁移、RLS 跨租户自动化测试和外部通道联调需要在具备这些依赖的环境中继续验证；没有这些依赖不影响本地 43 项契约验收。
