import type { Mood } from '@yunling/contracts';

/** 图标与天气图形都用内联 SVG 生成 data URI，不占包体里的图片资源，小程序和 H5 通用 */
const uri = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

const PATHS = {
  today: '<circle cx="16.5" cy="7.5" r="3"/><path d="M2 20l6-8 4 5 3-3 7 6z"/>',
  discover: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  circle: '<path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M19.5 9.5H20a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2v2.5L17 18h-3"/>',
  ai: '<path d="M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9z"/><path d="M19 15.5v5M16.5 18h5"/>',
  me: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><circle cx="12" cy="10" r="3"/><path d="M9 17h6"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  phone: '<path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.800-1-8-4.500-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  flag: '<path d="M5 21V4h11l-1.500 4L16 12H5"/>',
  send: '<path d="M4 12l16-8-6 16-2.500-6.500z"/>',
  heart: '<path d="M12 20s-7-4.400-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/>',
  book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 9h6M9 13h4"/>',
  building: '<path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6"/>',
  teacher: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  calendar: '<rect x="3.500" y="5" width="17" height="15" rx="2.500"/><path d="M8 3v4M16 3v4M3.500 10h17"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.500L21 21"/>',
  star: '<path d="M12 3.500l2.600 5.400 5.900.800-4.300 4.100 1.100 5.800L12 16.800 6.700 19.600l1.100-5.800-4.300-4.100 5.900-.800z"/>',
  check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.500 2"/>',
  pin: '<path d="M12 21s-6.500-5.800-6.500-11a6.500 6.500 0 0 1 13 0c0 5.200-6.500 11-6.500 11z"/><circle cx="12" cy="10" r="2.500"/>',
  people: '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20a6.500 6.500 0 0 1 13 0"/><path d="M16 4.800a3.500 3.500 0 0 1 0 6.400M21.500 20a6.500 6.500 0 0 0-4-6"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.700.400-1 1-1 1.700M12 17h.010"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.500"/><path d="M3.500 7l8.500 6 8.500-6"/>',
  flagRoute: '<path d="M5 21V4M5 5h12l-2.500 3.500L17 12H5"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19L14 10"/>',
  like: '<path d="M12 20s-7-4.400-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/>',
  text: '<path d="M5 6h14M12 6v13M8 19h8"/>',
} as const;
export type IconName = keyof typeof PATHS;

/** 实心的心：已点赞、已收藏时用 */
export const heartFilled = (color = '#D9366B') => uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 20s-7-4.400-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.600-7 10-7 10z" fill="${color}"/></svg>`);
export const starFilled = (color = '#FFC83D') => uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3.500l2.600 5.400 5.900.800-4.300 4.100 1.100 5.800L12 16.800 6.700 19.600l1.100-5.800-4.300-4.100 5.900-.800z" fill="${color}"/></svg>`);

export const icon = (name: IconName, color = '#0F1E3A') =>
  uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`);

export const playIcon = (color = '#14264D') => uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 4.500v15l13-7.500z" fill="${color}"/></svg>`);

const CLOUD = 'M14 35a7 7 0 0 1 .800-13.900A9.500 9.500 0 0 1 33 19.500 7.800 7.800 0 0 1 34 35z';
const RAYS = '<g stroke="#FFC83D" stroke-width="3" stroke-linecap="round"><path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.600 10.600l3.500 3.500M33.900 33.900l3.500 3.500M10.600 37.400l3.500-3.500M33.900 14.100l3.500-3.500"/></g>';
const DROPS = (c: string) => `<g stroke="${c}" stroke-width="3" stroke-linecap="round"><path d="M17 39l-2 5M25 39l-2 5M33 39l-2 5"/></g>`;
const WEATHER: Record<Mood, string> = {
  great: `<circle cx="24" cy="24" r="9" fill="#FFC83D"/>${RAYS}`,
  good: `<circle cx="32" cy="15" r="8" fill="#FFC83D"/><path d="${CLOUD}" fill="#fff" stroke="#A8C3EE" stroke-width="2.500"/>`,
  okay: `<path d="${CLOUD}" fill="#B8C4DC"/>`,
  low: `<path d="${CLOUD}" fill="#9FB3D1" transform="translate(0 -5)"/>${DROPS('#3B7BEA')}`,
  hard: `<path d="${CLOUD}" fill="#5A6E99" transform="translate(0 -6)"/><path d="M26 31l-6 8h5l-2 7 8-10h-5l3-5z" fill="#FFC83D"/><g stroke="#3B7BEA" stroke-width="3" stroke-linecap="round"><path d="M15 39l-2 5M35 39l-2 5"/></g>`,
};
export const weatherIcon = (mood: Mood) => uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${WEATHER[mood]}</svg>`);

/** 心情天气的叫法与确认语。学生端只说天气，不说情绪词。 */
export const WEATHER_TEXT: Record<Mood, { name: string; said: string }> = {
  great: { name: '大晴天', said: '记下了。把这份好心情也留一点给明天。' },
  good: { name: '晴间多云', said: '记下了。是不错的一天。' },
  okay: { name: '阴天', said: '记下了。平平常常也是一天。' },
  low: { name: '小雨', said: '记下了。下雨的日子也算数。' },
  hard: { name: '雷阵雨', said: '记下了。这样的天气，不用一个人撑着。' },
};

/** 成长圈头像：按编号取色，只显示昵称第一个字 */
const AVATAR = ['#14264D', '#1F5FD1', '#14876B', '#B36A00', '#D9366B', '#6B4FD8', '#0D7C8F'];
export const avatarColor = (seed: number) => AVATAR[seed % AVATAR.length];
