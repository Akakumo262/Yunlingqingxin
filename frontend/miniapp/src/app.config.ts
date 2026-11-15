// 页面清单 = 小程序端信息架构。首页用自绘底部导航在五个栏目间切换，其余为二级页面。
export default defineAppConfig({
  pages: [
    'pages/index/index', // 今天 / 发现（看看·生涯·活动·计划）/ 成长圈 / 助手 / 我的
    'pages/login/index', // 登录、激活、绑定、首次逐项同意
    'pages/content/index', // 内容详情
    'pages/collection/index', // 专题
    'pages/search/index', // 搜索：内容、生涯卡、活动
    'pages/career/index', // 生涯卡详情
    'pages/activity/index', // 活动：报名 → 签到 → 反思 → 成长护照
    'pages/plan/index', // 学习计划
    'pages/assess/index', // 问卷：列表 → 作答 → 结果
    'pages/help/index', // 我想找人说：求助、进度、预约
    'pages/circle/index', // 圈子里的帖子
    'pages/notices/index', // 通知与公告
    'pages/favorites/index', // 我的收藏 / 活动 / 计划
    'pages/privacy/index', // 隐私与授权
    'pages/faq/index', // 帮助与反馈
    'pages/parent/index', // 家长端
    'pages/notes/index', // 家校沟通单（家长）
    'pages/institutions/index', // 机构目录
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#F3F6FB',
    navigationBarTitleText: '云岭青心',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F3F6FB',
  },
});
