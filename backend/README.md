# 云岭青心后端

后端使用 NestJS 11、Fastify、PostgreSQL 16 和 TypeScript。最新契约基线包含 118 个接口、68 项验收。

## 本机启动

先准备 PostgreSQL 16，并在根目录 `.env.local` 或当前 PowerShell 会话中设置：

- `DATABASE_URL`：应用运行账号，建议使用非属主账号 `yunling_app`
- `MIGRATE_DATABASE_URL`：迁移账号，使用数据库属主或专用迁移账号
- `JWT_SECRET`：访问令牌签名密钥
- `DATA_ENCRYPTION_KEY`：事件载荷加密密钥

迁移和安全检查使用 PowerShell 5.1 时请调用 `npm.cmd`：

```powershell
npm.cmd run migrate -w @yunling/backend
npm.cmd run security:test -w @yunling/backend
npm.cmd run build -w @yunling/backend
npm.cmd run start -w @yunling/backend
```

API 地址为 `http://localhost:3000/api/v1`。

## 内容发现来源

内容发现的外部链接和受众标签存放在 `cnt.content_discovery`，来源白名单存放在
`cnt.content_source`。迁移后可先导入官方来源：

```powershell
npm.cmd run seed:content -w @yunling/backend
```

当前只建立来源审核与元数据边界，不会自动抓取网页；只有人工核验后将
`source_verified` 设为 `true` 的记录才会向内容接口附加外链。

## 验收

另开一个终端，在后端已经启动后执行：

```powershell
npm.cmd run accept
```

最新基线要求 68 项全部通过。测试写入演示数据；需要重新开始时执行：

```powershell
npm.cmd run reset -w @yunling/backend
```

## 当前实现阶段

第一阶段已经完成真实 HTTP 服务、JWT 令牌、刷新令牌哈希持久化、PostgreSQL 事件表、AES-256-GCM 载荷加密、强制 RLS、迁移、重置和安全检查。契约中的 mock 仍被作为行为规格和种子数据来源，成功写请求以加密事件记录并在重启时回放，以便先完成真实端口联调和可重复验收。

后续阶段需要继续把事件回放逐模块替换为独立 Kysely 仓储，补齐业务表种子、数据域过滤、审计表哈希链、刷新令牌轮换、真实内容抓取和通知调度。当前阶段不会把 mock 适配层当作最终生产实现。
