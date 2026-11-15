# 云岭青心 · 青少年成长学习与资源协同平台

面向县域教体局和团委的青少年发展协同平台。学生和家长用微信小程序，教师和管理者用 Web。

| 目录 | 内容 | 端口 | 状态 |
|---|---|---|---|
| `contracts/` | 前后端共用契约：118 个接口、类型、合成内容库、模拟后端、68 项验收 | 3000（模拟后端） | 完成 |
| `frontend/web/` | 教师端 + 管理端（React + Ant Design），26 个页面 | 5173 | 完成 |
| `frontend/miniapp/` | 学生端 + 家长端（Taro 微信小程序 + H5），18 个页面 | 10086 | 完成，待真机验证 |
| `backend/` | 后端（NestJS + PostgreSQL） | 3000 | 阶段一已可运行：真实 HTTP、JWT、PostgreSQL 事件/打卡/来源元数据；68 项验收通过，业务仓储仍在推进 |

## 快速开始

需要 Node.js 22 或更高。不需要数据库、Docker 和任何密钥。

```bash
npm run setup       # 第一次：装依赖、构建契约包（官方源装不上会自动换国内镜像）
npm run demo        # 同时启动 模拟后端 + 教师端 + 学生端预览，Ctrl+C 一起停
npm run check       # 全量自检：类型检查 + 68 项验收
```

Windows 上可以直接双击 `启动演示.bat`。启动后打开：

- 教师端 / 管理端：http://localhost:5173 ，登录页下方直接点一个身份
- 学生端 / 家长端：http://localhost:10086 ，直接点“我是学生”或“我是家长”

只开发其中一端时也可以单独启动（`npm run dev:web`、`npm run dev:miniapp`）；不启动后端时前端会自动改用内置的演示数据。

**每个成员从 [docs/成员上手指南.md](docs/成员上手指南.md) 开始**，里面按分工（演示、Web、小程序、后端、内容、测试、交付材料）各有一节。

## 演示时可以这样走一遍

先 `npm run mock`，再同时打开 Web 和小程序 H5，两边连的是同一份数据：

1. 小程序“我是学生”：选心情天气 → 做完今天的小行动（成长护照多一枚印记）→ 发现里报名一场活动。
2. Web“班主任”：五育活动里打开这场活动，把签到码念给学生；学生签到、写两句话；老师点“做见证”。学生的成长护照里出现老师的名字。
3. Web“班主任”：内容与话术里挑一篇“推荐给全班”。学生首页出现“老师推荐”，通知里多一条。
4. 小程序学生点“我想找人说”。Web 班主任的今日待办立刻出现一条紧急提醒；点“我来跟进”，学生那边的进度变成“老师看到了”。
5. Web“班主任”给家长发一张沟通单 → 小程序“我是家长”回一句 → 班主任收到通知。
6. Web“校领导”对一条个案发起紧急访问 → Web“安全审计”复核。

### 换成真实后端

后端真实服务（Windows PowerShell）：先按 [`backend/README.md`](backend/README.md) 配置 PostgreSQL 和环境变量，再执行：

```powershell
npm.cmd run migrate -w @yunling/backend
npm.cmd run reset -w @yunling/backend
npm.cmd run seed:content -w @yunling/backend
npm.cmd run start -w @yunling/backend
```

另开终端执行 `npm.cmd run accept`，应看到 68 项全部通过。当前真实后端已经能进行前后端联调，但仍在把契约 mock 适配层逐模块替换为完整业务仓储。

后端起在 3000 端口后，`npm run demo` 会直接使用它，不再启动模拟后端。

## 文档

- [docs/成员上手指南.md](docs/成员上手指南.md)：所有成员的入口，按分工告诉你读什么、跑什么、改哪里
- [docs/前后端对齐契约.md](docs/前后端对齐契约.md)：端口、接口约定、演示账号、页面与接口对应、产品红线
- [docs/后端交接说明.md](docs/后端交接说明.md)：后端开发者从这里开始
- [AGENTS.md](AGENTS.md)：给 AI 协作者的入口说明
- 《云岭青心》产品说明.md、《云岭青心》技术路径.md：需求与架构原文

## 两台电脑怎么协作

仓库地址：https://github.com/Akakumo262/Yunlingqingxin

### 后端同事第一次上手

1. 仓库所有者在 GitHub 的 Settings → Collaborators 里把后端同事加为协作者，对方接受邀请后才能推送。
2. 后端同事在自己的电脑上执行（需要 Node 22 及以上）：

```bash
git clone https://github.com/Akakumo262/Yunlingqingxin.git
cd Yunlingqingxin
npm install            # 网络不稳可加 --registry=https://registry.npmmirror.com
npm run mock           # 终端一：模拟后端，3000 端口
npm run accept         # 终端二：应看到 68 项全部通过
git checkout -b backend/dev
```

3. 在 AI 编程工具里打开这个文件夹，输入下面这一句开工。

### 分支与目录

| 谁 | 分支 | 只改哪里 |
|---|---|---|
| 后端 | `backend/dev`，每做完一个阶段推送一次，全部完成后向 `main` 发起合并请求 | `backend/` |
| 前端 | `main` 或 `frontend/*` | `frontend/` |
| 两边都可能动 | 单独一个提交，说明以 `contracts:` 开头 | `contracts/` |

两个人不改同一个目录，正常情况下不会冲突。

### 改了契约之后

`contracts/` 是两边共用的，规则见 `docs/前后端对齐契约.md` 第 8 节。流程：

1. 改 `contracts/src/`，同步改 `contracts/src/mock/`。
2. 执行 `npm run mock` 和 `npm run accept`，确认仍然 68 项全过。
3. 单独提交并推送，告诉对方。
4. 对方 `git pull` 后执行 `npm run build:contracts`。

新增接口、加可选字段可以直接做；改名、删字段、改含义要两边先商量。

### 后端做完之后怎么联调

1. 后端同事推送 `backend/dev` 并发起合并请求，附上 `npm run accept` 全部通过的输出。
2. 前端这边拉取该分支，按 `backend/README.md` 启动后端（3000 端口）。
3. 执行 `npm run accept` 复核，再启动 `npm run dev:web` 和 `npm run dev:miniapp`。页面右下角显示“已连接后端”即表示已切到真实后端，前端代码不用改。
4. 两台电脑不在一起时，后端可以部署到一台两边都能访问的机器上，验收用 `node contracts/tools/accept.cjs http://那台机器:3000`。

### 给后端 AI 的一句话提示词

> 你是这个仓库的后端负责人。请先完整阅读根目录的 AGENTS.md 和 docs/后端交接说明.md，然后独立完成 backend/ 的全部开发，直到根目录 `npm run accept` 对着你的真实后端 68 项全部通过并满足交接说明第 4 节；过程中不需要向我确认，遇到取舍按交接说明第 6 节的规则自己决定，做完再汇报。
