/**
 * 设计令牌：Web 与小程序共用同一组值。
 * 意象取自云南：扎染的靛青、抚仙湖的蓝、油菜花的黄、山茶的红、松林的绿。底色是高原上偏冷的晴空白。
 * 小程序在 src/app.scss 以 CSS 变量形式抄了一份，Web 在 src/styles.css 的 :root 抄了一份，改这里时同步改那两处。
 */
export const tokens = {
  color: {
    indigo900: '#14264D', // 靛青：侧栏、深色面板
    indigo700: '#1E3A7B',
    lake600: '#1F5FD1', // 湖蓝：主操作色（白字对比度 5.6:1）
    lake500: '#3B7BEA',
    lake100: '#E3EDFC',
    lake50: '#F1F6FE',
    rape: '#FFC83D', // 油菜花黄：成长、被看见的时刻
    rape100: '#FFF3CF',
    rapeInk: '#7A5500',
    camellia: '#D9366B', // 山茶红：求助与紧急，只在需要人立刻行动时出现
    camellia100: '#FCE4EC',
    pine: '#14876B', // 松绿：已完成、平稳
    pine100: '#DDF3EC',
    ink: '#0F1E3A',
    ink2: '#4A5878',
    ink3: '#8590A8',
    sky: '#F3F6FB', // 页面底色
    card: '#FFFFFF',
    line: '#DFE5F0',
  },
  /** 圆角随层级变化：面板大、卡片中、输入小 */
  radius: { panel: 28, card: 18, control: 12, pill: 999 },
  font: {
    sans: '"HarmonyOS Sans SC","MiSans","PingFang SC","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif',
    /** 数字：关键指标、时间、案件号 */
    num: '"DIN Alternate","Bahnschrift","HarmonyOS Sans SC","PingFang SC",sans-serif',
  },
  /** 支持等级：必须“文字 + 形状”，不能只靠颜色。仅教师端/管理端使用 */
  level: {
    L0: { label: '平稳', mark: '○', color: '#4A5878', bg: '#EEF1F7' },
    L1: { label: '关注', mark: '●', color: '#7A5500', bg: '#FFF3CF' },
    L2: { label: '重点', mark: '▲', color: '#8A3D00', bg: '#FFE2C7' },
    L3: { label: '紧急', mark: '◆', color: '#FFFFFF', bg: '#D9366B' },
  },
  /** 心情天气：学生端用天气代替情绪词，降低表达门槛 */
  weather: {
    great: { label: '大晴天', hint: '很不错' },
    good: { label: '晴间多云', hint: '还可以' },
    okay: { label: '阴天', hint: '一般般' },
    low: { label: '小雨', hint: '有点低落' },
    hard: { label: '雷阵雨', hint: '不太容易' },
  },
} as const;
