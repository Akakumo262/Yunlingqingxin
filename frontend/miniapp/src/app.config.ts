// 页面清单 = 小程序端信息架构。首页用自绘底部导航在五个栏目间切换，其余为二级页面。
export default defineAppConfig({
  pages: [
    'pages/index/index', // 今天 / 发现 / 成长圈 / 助手 / 我的（P-02 P-03 P-26 P-28 P-29 P-30 P-08）
    'pages/login/index', // 登录与激活（P-01 P-10）
    'pages/content/index', // 内容详情与视频（P-27）
    'pages/career/index', // 生涯卡详情（P-28）
    'pages/assess/index', // 问卷：列表 → 作答 → 结果（P-04 P-05 P-06）
    'pages/help/index', // 我想找人说（P-07）
    'pages/circle/index', // 圈子里的帖子与发帖（P-31 P-32）
    'pages/privacy/index', // 隐私与授权（P-09）
    'pages/parent/index', // 家长端（P-11）
    'pages/institutions/index', // 能帮到你的机构（P-33）
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#F3F6FB',
    navigationBarTitleText: '云岭青心',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F3F6FB',
  },
});
