# 云岭青心 · 给 AI 协作者的说明

这个仓库由两个人在两台电脑上协作：一人负责前端，一人负责后端。两边靠 `contracts/` 对齐。
先确认你被分配的是哪一部分，再读对应的文档。不属于前端或后端的分工（演示、内容、测试、交付材料）见 `docs/成员上手指南.md`。

## 如果你负责后端

完整阅读 `docs/后端交接说明.md`，然后直接开工。要点：

- 你是后端负责人。文档里标“必须”的是验收条件，其余一切由你决定，不需要请示。
- 终点是：根目录 `npm run accept` 对着你的真实后端 68 项全部通过，并满足文档第 4 节。
- 做完整：118 个接口都要有真实实现，不留桩、不返回 501、不用“后续建议”代替实现。
- 缺外部条件（微信、短信、大模型密钥、Docker）不是停工理由，按文档第 6 节的规则处理后继续。
- 只改 `backend/`。`contracts/` 可以新增接口和可选字段；改名、删字段、改语义要先确认。不要改 `frontend/`。

## 如果你负责前端

阅读 `docs/前后端对齐契约.md`。要点：

- 页面已全部完成，默认跑在内置的模拟后端上；3000 端口有真实后端时自动切过去。
- 只改 `frontend/`。请求一律走 `api(Routes.xxx, …)`，不要手写路径和请求头。
- 设计令牌在 `frontend/design/tokens.ts`，Web 的 `styles.css` 和小程序的 `app.scss` 各抄了一份，改一处同步另两处。
- 小程序 TSX 行内样式里的尺寸一律包 `px()`（`src/utils/ui.ts`），颜色用 SCSS 变量。其余工程约定见对齐契约第 10 节。
- 学生端不出现任何等级、“风险”“高危”等字样；所有采集都能跳过；不显示排名、倒计时、连续天数。
- 封面图不用图片文件，用 `coverUri(id, kind)`（`contracts/src/visual.ts`）按 id 生成；同一个 id 永远是同一张图。
- 内容、话术、活动、计划等文案都在 `contracts/src/mock/content/` 和 `library-*.ts`。加内容改这里，不要写进页面。

## 两边都适用

- 接口、类型、枚举只在 `contracts/src/` 定义一份。改了契约后执行 `npm run build:contracts`，并保证 `npm run mock` + `npm run accept` 仍然全部通过。
- 测试数据一律合成，不使用任何真实学生信息。
- 密钥不入库；演示用的视频素材放 `demo-assets/`，不入库。
- 对外文案不出现“学习强国”字样。

## 常用命令（根目录）

```bash
npm run setup               # 第一次：装全部依赖并构建契约包（装不上会自动换国内镜像）
npm run demo                # 同时启动模拟后端、Web、小程序预览
npm run check               # 全量自检：类型检查 + 68 项验收。提交之前跑一次
npm run pack                # 把已提交的内容打成 zip，放在 release/
npm run build:contracts     # 改了 contracts 之后
npm run mock                # 启动模拟后端（3000）
npm run accept              # 运行 68 项验收
npm run dev:api             # 启动 backend/（3000）
npm run dev:web             # Web 端（5173）
npm run dev:miniapp         # 小程序 H5 预览（10086），需先在 frontend/miniapp 里 npm install
```
