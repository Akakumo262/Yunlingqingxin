# 云岭青心 · 青少年成长学习与资源协同平台

面向县域教体局和团委的青少年发展协同平台。学生和家长用微信小程序，教师和管理者用 Web。

| 目录 | 内容 | 端口 | 状态 |
|---|---|---|---|
| `contracts/` | 前后端共用契约：59 个接口、类型、合成数据、模拟后端、验收脚本 | 3000（模拟后端） | 完成 |
| `frontend/web/` | 教师端 + 管理端（React + Ant Design） | 5173 | 完成 |
| `frontend/miniapp/` | 学生端 + 家长端（Taro 微信小程序 + H5） | 10086 | 完成，待真机验证 |
| `backend/` | 后端（NestJS + PostgreSQL） | 3000 | 起步骨架，待开发 |

## 快速开始

```bash
npm install
npm run mock        # 模拟后端
npm run dev:web     # 另开终端，打开 http://localhost:5173
```

小程序 H5 预览：

```bash
cd frontend/miniapp
npm install
npm run dev:h5      # 打开 http://localhost:10086，浏览器切到手机尺寸
```

不启动模拟后端也能运行，前端会自动改用内置的演示数据。

## 文档

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
npm run accept         # 终端二：应看到 43 项全部通过
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
2. 执行 `npm run mock` 和 `npm run accept`，确认仍然 43 项全过。
3. 单独提交并推送，告诉对方。
4. 对方 `git pull` 后执行 `npm run build:contracts`。

新增接口、加可选字段可以直接做；改名、删字段、改含义要两边先商量。

### 后端做完之后怎么联调

1. 后端同事推送 `backend/dev` 并发起合并请求，附上 `npm run accept` 全部通过的输出。
2. 前端这边拉取该分支，按 `backend/README.md` 启动后端（3000 端口）。
3. 执行 `npm run accept` 复核，再启动 `npm run dev:web` 和 `npm run dev:miniapp`。页面右下角显示“已连接后端”即表示已切到真实后端，前端代码不用改。
4. 两台电脑不在一起时，后端可以部署到一台两边都能访问的机器上，验收用 `node contracts/tools/accept.cjs http://那台机器:3000`。

### 给后端 AI 的一句话提示词

> 你是这个仓库的后端负责人。请先完整阅读根目录的 AGENTS.md 和 docs/后端交接说明.md，然后独立完成 backend/ 的全部开发，直到根目录 `npm run accept` 对着你的真实后端 43 项全部通过并满足交接说明第 4 节；过程中不需要向我确认，遇到取舍按交接说明第 6 节的规则自己决定，做完再汇报。
