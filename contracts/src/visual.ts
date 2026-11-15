/**
 * 两端共用的封面插画生成器（纯函数，不依赖任何库）。
 * 内容库里没有真实图片，也不能随便用网上的图，所以每条内容的封面由它的 id 和频道“算”出来：
 * 同一条内容在小程序和 Web 上永远是同一张画，不同内容各不相同。
 * 画面元素取自云南：晴空与山脊、梯田、扎染、油菜花、山茶。
 */

export type CoverKind =
  | 'psychology' | 'learning' | 'career' | 'policy' | 'culture' | 'five_edu' | 'role_model' | 'parent' | 'teacher'
  | 'job' | 'industry' | 'major' | 'person'
  | 'moral' | 'intellectual' | 'physical' | 'aesthetic' | 'labor';

const C = {
  indigo9: '#14264D', indigo7: '#1E3A7B', lake6: '#1F5FD1', lake5: '#3B7BEA', lake3: '#A8C3EE', lake1: '#E3EDFC', lake0: '#F1F6FE',
  rape: '#FFC83D', rape1: '#FFF3CF', camellia: '#D9366B', camellia1: '#FCE4EC', pine: '#14876B', pine1: '#DDF3EC', white: '#FFFFFF',
};
const W = 400, H = 240;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number): () => number {
  let a = seed || 1;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type R = () => number;
const n = (v: number) => Math.round(v * 10) / 10;
const pick = <T,>(r: R, list: T[]): T => list[Math.floor(r() * list.length)];
const between = (r: R, a: number, b: number) => a + r() * (b - a);

const grad = (id: string, from: string, to: string) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;
const bg = (fill: string) => `<rect width="${W}" height="${H}" fill="${fill}"/>`;
/** 一道山脊：从左到右若干个起伏的顶点 */
function ridge(r: R, base: number, amp: number, fill: string, opacity = 1): string {
  const steps = 6 + Math.floor(r() * 3);
  let d = `M0 ${H}V${n(base + r() * amp)}`;
  for (let i = 1; i <= steps; i++) d += `L${n((W / steps) * i)} ${n(base + (i % 2 ? -1 : 0.4) * r() * amp)}`;
  return `<path d="${d}V${H}z" fill="${fill}" opacity="${opacity}"/>`;
}
const cloud = (x: number, y: number, s: number, fill: string, o = 0.95) =>
  `<g fill="${fill}" opacity="${o}"><ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(34 * s)}" ry="${n(13 * s)}"/><circle cx="${n(x - 12 * s)}" cy="${n(y - 9 * s)}" r="${n(14 * s)}"/><circle cx="${n(x + 8 * s)}" cy="${n(y - 12 * s)}" r="${n(18 * s)}"/></g>`;
const sun = (x: number, y: number, rad: number, fill = C.rape) =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rad * 2.1)}" fill="${fill}" opacity="0.14"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(rad * 1.5)}" fill="${fill}" opacity="0.22"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(rad)}" fill="${fill}"/>`;

// ── 各频道的画面 ──
/** 心理：一片天气。晴、多云、黄昏、夜晚各有各的样子 */
function sky(r: R): string {
  const mood = pick(r, [['#3F97FF', '#CFE5FF', 'sun'], ['#6FB0FF', '#E9F3FF', 'cloud'], ['#F2A65A', '#FCE4EC', 'dusk'], ['#14264D', '#3B5FA8', 'night']] as const);
  const x = between(r, 240, 330), y = between(r, 50, 90);
  let s = `<defs>${grad('g', mood[0], mood[1])}</defs>${bg('url(#g)')}`;
  if (mood[2] === 'night') {
    s += `<circle cx="${n(x)}" cy="${n(y)}" r="22" fill="#FFF3CF"/><circle cx="${n(x + 9)}" cy="${n(y - 6)}" r="19" fill="${mood[0]}"/>`;
    for (let i = 0; i < 9; i++) s += `<circle cx="${n(r() * W)}" cy="${n(r() * 120)}" r="${n(0.8 + r() * 1.4)}" fill="#fff" opacity="${n(0.5 + r() * 0.5)}"/>`;
  } else s += sun(x, y, mood[2] === 'dusk' ? 30 : 24, mood[2] === 'dusk' ? '#FFE08A' : C.rape);
  if (mood[2] !== 'sun') s += cloud(between(r, 60, 150), between(r, 60, 100), between(r, 0.9, 1.3), '#fff') + cloud(between(r, 200, 300), between(r, 110, 130), 0.8, '#fff', 0.8);
  const dark = mood[2] === 'night';
  return s + ridge(r, 150, 44, dark ? '#2A4A8F' : C.lake3) + ridge(r, 178, 34, dark ? '#1E3A7B' : C.lake5) + ridge(r, 206, 24, dark ? '#0F1E3A' : C.indigo7);
}
/** 学习：方格纸上的一本书和一支笔 */
function desk(r: R): string {
  let s = bg(C.rape1);
  for (let x = 20; x < W; x += 28) s += `<path d="M${x} 0V${H}" stroke="#F3DFA0" stroke-width="1"/>`;
  for (let y = 16; y < H; y += 28) s += `<path d="M0 ${y}H${W}" stroke="#F3DFA0" stroke-width="1"/>`;
  const bx = between(r, 110, 170), by = between(r, 96, 116), tilt = between(r, -6, 6);
  s += `<g transform="rotate(${n(tilt)} ${n(bx + 80)} ${n(by + 50)})"><path d="M${n(bx)} ${n(by + 12)}L${n(bx + 80)} ${n(by)}V${n(by + 96)}L${n(bx)} ${n(by + 108)}z" fill="#fff" stroke="${C.indigo9}" stroke-width="3" stroke-linejoin="round"/><path d="M${n(bx + 160)} ${n(by + 12)}L${n(bx + 80)} ${n(by)}V${n(by + 96)}L${n(bx + 160)} ${n(by + 108)}z" fill="#fff" stroke="${C.indigo9}" stroke-width="3" stroke-linejoin="round"/>`;
  for (let i = 0; i < 4; i++) s += `<path d="M${n(bx + 14)} ${n(by + 34 + i * 16)}L${n(bx + 66)} ${n(by + 26 + i * 16)}" stroke="${C.lake3}" stroke-width="3" stroke-linecap="round"/><path d="M${n(bx + 94)} ${n(by + 26 + i * 16)}L${n(bx + (i === 3 ? 124 : 146))} ${n(by + 34 + i * 16)}" stroke="${i === 1 ? C.rape : C.lake3}" stroke-width="3" stroke-linecap="round"/>`;
  s += '</g>';
  const px = between(r, 40, 80);
  s += `<g transform="rotate(${n(between(r, 28, 52))} ${n(px)} 60)"><rect x="${n(px)}" y="40" width="110" height="14" rx="3" fill="${C.lake6}"/><path d="M${n(px + 110)} 40l18 7-18 7z" fill="${C.indigo9}"/><rect x="${n(px)}" y="40" width="16" height="14" rx="3" fill="${C.camellia}"/></g>`;
  return s + `<circle cx="${n(between(r, 300, 360))}" cy="${n(between(r, 40, 70))}" r="${n(between(r, 14, 22))}" fill="${C.rape}"/>`;
}
/** 生涯：一条通向山外的路 */
function road(r: R, tone: 'pine' | 'indigo' = 'pine'): string {
  const sky0 = tone === 'pine' ? '#BDE9DC' : '#BFD6FA', far = tone === 'pine' ? '#63C2A6' : C.lake3, near = tone === 'pine' ? C.pine : C.lake6;
  let s = `<defs>${grad('g', sky0, C.lake0)}</defs>${bg('url(#g)')}` + sun(between(r, 60, 120), between(r, 46, 70), 20);
  s += ridge(r, 128, 40, far) + ridge(r, 160, 26, near);
  const bend = between(r, 120, 280);
  s += `<path d="M${n(W / 2 - 70)} ${H}C${n(bend)} 200 ${n(W - bend)} 176 ${n(between(r, 180, 230))} 150" fill="none" stroke="${C.indigo9}" stroke-width="46" stroke-linecap="round"/>`;
  s += `<path d="M${n(W / 2 - 70)} ${H}C${n(bend)} 200 ${n(W - bend)} 176 ${n(between(r, 180, 230))} 150" fill="none" stroke="${C.rape}" stroke-width="3" stroke-dasharray="12 12"/>`;
  const sx = between(r, 280, 340);
  return s + `<path d="M${n(sx)} 212V150" stroke="${C.indigo9}" stroke-width="5" stroke-linecap="round"/><path d="M${n(sx - 4)} 152h44l10 11-10 11h-44z" fill="${C.rape}" stroke="${C.indigo9}" stroke-width="3" stroke-linejoin="round"/>`;
}
/** 政策：几页纸和一枚印章 */
function paper(r: R): string {
  let s = bg(C.lake1);
  const sheets: [number, number, number][] = [[between(r, 90, 120), between(r, 34, 50), between(r, -10, -4)], [between(r, 130, 160), between(r, 28, 44), between(r, 3, 9)]];
  sheets.forEach(([x, y, rot], k) => {
    s += `<g transform="rotate(${n(rot)} ${n(x + 75)} ${n(y + 95)})"><rect x="${n(x)}" y="${n(y)}" width="150" height="190" rx="10" fill="#fff" stroke="${C.indigo9}" stroke-width="3"/>`;
    for (let i = 0; i < 6; i++) s += `<path d="M${n(x + 20)} ${n(y + 34 + i * 22)}h${n(i % 3 === 2 ? 70 : 110)}" stroke="${k && i === 0 ? C.indigo9 : C.lake3}" stroke-width="${k && i === 0 ? 6 : 4}" stroke-linecap="round"/>`;
    s += '</g>';
  });
  const x = between(r, 270, 320), y = between(r, 140, 170);
  return s + `<g transform="rotate(${n(between(r, -18, 12))} ${n(x)} ${n(y)})"><circle cx="${n(x)}" cy="${n(y)}" r="36" fill="none" stroke="${C.camellia}" stroke-width="5"/><circle cx="${n(x)}" cy="${n(y)}" r="27" fill="none" stroke="${C.camellia}" stroke-width="2"/><path d="M${n(x)} ${n(y - 16)}l4.700 10.800 11.700 1-8.900 7.700 2.700 11.500L${n(x)} ${n(y + 9)}l-10.200 6 2.700-11.500-8.900-7.700 11.700-1z" fill="${C.camellia}"/></g>`;
}
/** 文化：扎染。几朵扎出来的花，每一朵都不太圆 */
function tieDye(r: R, base = C.indigo9): string {
  let s = bg(base);
  for (let i = 0; i < 26; i++) s += `<circle cx="${n(r() * W)}" cy="${n(r() * H)}" r="${n(1 + r() * 2.2)}" fill="#fff" opacity="${n(0.25 + r() * 0.35)}"/>`;
  const flowers = 3 + Math.floor(r() * 2);
  for (let f = 0; f < flowers; f++) {
    const x = between(r, 50, W - 50), y = between(r, 40, H - 40), rad = between(r, 26, 54), rings = 3 + Math.floor(r() * 2);
    for (let k = rings; k >= 1; k--) {
      const rr = (rad * k) / rings;
      s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rr)}" fill="none" stroke="#fff" stroke-width="${n(2 + r() * 3)}" stroke-dasharray="${n(2 + r() * 8)} ${n(3 + r() * 6)}" opacity="${n(0.55 + r() * 0.4)}"/>`;
    }
    s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rad / rings / 2.2)}" fill="#fff" opacity="0.9"/>`;
  }
  return s;
}
/** 梯田：一层一层的等高线 */
function terrace(r: R): string {
  let s = `<defs>${grad('g', '#BDE9DC', '#F1F6FE')}</defs>${bg('url(#g)')}` + sun(between(r, 280, 340), between(r, 40, 60), 18);
  const tones = ['#DDF3EC', '#A9DFCB', '#63C2A6', '#2FA385', C.pine, '#0D5C4A'];
  tones.forEach((fill, i) => {
    const y = 84 + i * 26, a = between(r, 10, 26), ph = r() * 60;
    s += `<path d="M0 ${H}V${n(y + a)}C${n(90 + ph)} ${n(y - a)} ${n(170 + ph)} ${n(y + a * 1.6)} ${n(260 + ph / 2)} ${n(y)}S${W} ${n(y + a)} ${W} ${n(y - a / 2)}V${H}z" fill="${fill}"/>`;
    s += `<path d="M0 ${n(y + a + 9)}C${n(90 + ph)} ${n(y - a + 9)} ${n(170 + ph)} ${n(y + a * 1.6 + 9)} ${n(260 + ph / 2)} ${n(y + 9)}S${W} ${n(y + a + 9)} ${W} ${n(y - a / 2 + 9)}" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.45"/>`;
  });
  return s;
}
/** 五育：球、苗、一笔颜料 */
function play(r: R, base = C.rape): string {
  let s = bg(base);
  const bx = between(r, 70, 130), by = between(r, 80, 130), br = between(r, 44, 60);
  s += `<circle cx="${n(bx)}" cy="${n(by)}" r="${n(br)}" fill="#fff" stroke="${C.indigo9}" stroke-width="4"/><path d="M${n(bx - br)} ${n(by)}h${n(br * 2)}M${n(bx)} ${n(by - br)}v${n(br * 2)}M${n(bx - br * 0.7)} ${n(by - br * 0.7)}q${n(br * 0.7)} ${n(br * 0.7)} 0 ${n(br * 1.4)}M${n(bx + br * 0.7)} ${n(by - br * 0.7)}q${n(-br * 0.7)} ${n(br * 0.7)} 0 ${n(br * 1.4)}" fill="none" stroke="${C.indigo9}" stroke-width="3"/>`;
  const px = between(r, 250, 320);
  s += `<path d="M${n(px)} 216V${n(between(r, 120, 150))}" stroke="${C.pine}" stroke-width="7" stroke-linecap="round"/><path d="M${n(px)} 170c-34 4-48-18-46-40 30-2 46 12 46 40z" fill="${C.pine}"/><path d="M${n(px)} 150c30 2 46-16 44-38-28-2-44 12-44 38z" fill="#2FA385"/>`;
  s += `<path d="M${n(between(r, 150, 190))} ${n(between(r, 180, 205))}q${n(between(r, 40, 70))} ${n(between(r, -50, -20))} ${n(between(r, 110, 150))} ${n(between(r, -10, 16))}" fill="none" stroke="${base === C.rape ? C.camellia : C.rape}" stroke-width="16" stroke-linecap="round" opacity="0.9"/>`;
  return s + `<rect y="216" width="${W}" height="24" fill="${C.indigo9}" opacity="0.12"/>`;
}
/** 人物：逆光里的一个人 */
function portrait(r: R, from = '#F07AA0', to = '#A8224F'): string {
  const x = between(r, 150, 250);
  let s = `<defs>${grad('g', from, to)}</defs>${bg('url(#g)')}` + `<circle cx="${n(x)}" cy="118" r="${n(between(r, 92, 112))}" fill="#fff" opacity="0.14"/><circle cx="${n(x)}" cy="118" r="66" fill="${C.rape}" opacity="0.9"/>`;
  s += `<circle cx="${n(x)}" cy="112" r="30" fill="${C.indigo9}"/><path d="M${n(x - 78)} ${H}c0-52 34-82 78-82s78 30 78 82z" fill="${C.indigo9}"/>`;
  for (let i = 0; i < 5; i++) {
    const sx = r() * W, sy = r() * 90;
    s += `<path d="M${n(sx)} ${n(sy - 6)}v12M${n(sx - 6)} ${n(sy)}h12" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="${n(0.5 + r() * 0.4)}"/>`;
  }
  return s;
}
/** 家长：夜里亮着灯的家 */
function home(r: R): string {
  let s = `<defs>${grad('g', '#14264D', '#35579F')}</defs>${bg('url(#g)')}`;
  for (let i = 0; i < 12; i++) s += `<circle cx="${n(r() * W)}" cy="${n(r() * 110)}" r="${n(0.8 + r() * 1.3)}" fill="#fff" opacity="${n(0.4 + r() * 0.5)}"/>`;
  const mx = between(r, 290, 350);
  s += `<circle cx="${n(mx)}" cy="52" r="20" fill="#FFF3CF"/><circle cx="${n(mx + 9)}" cy="46" r="17" fill="#1B3162"/>` + ridge(r, 168, 30, '#1E3A7B');
  const hx = between(r, 110, 190);
  s += `<path d="M${n(hx - 14)} 150l74-52 74 52z" fill="#0F1E3A"/><rect x="${n(hx)}" y="148" width="120" height="76" fill="#22407E"/><rect x="${n(hx + 20)}" y="166" width="32" height="32" rx="3" fill="${C.rape}"/><path d="M${n(hx + 36)} 166v32M${n(hx + 20)} 182h32" stroke="#22407E" stroke-width="3"/><rect x="${n(hx + 74)}" y="176" width="26" height="48" rx="3" fill="#0F1E3A"/>`;
  return s + `<path d="M0 ${H}v-16h${W}v16z" fill="#0F1E3A"/><path d="M${n(hx + 36)} 204l-30 36h60z" fill="${C.rape}" opacity="0.18"/>`;
}
/** 教师：一块黑板 */
function board(r: R): string {
  let s = bg('#E3EDFC') + `<rect x="30" y="26" width="340" height="178" rx="12" fill="#0D5C4A" stroke="#7A5500" stroke-width="8"/>`;
  for (let i = 0; i < 4; i++) s += `<path d="M${n(62 + r() * 10)} ${n(62 + i * 30)}h${n(between(r, 90, 190))}" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-dasharray="${n(between(r, 30, 60))} 10" opacity="0.85"/>`;
  const x = between(r, 280, 320), y = between(r, 80, 110);
  s += `<circle cx="${n(x)}" cy="${n(y)}" r="20" fill="none" stroke="${C.rape}" stroke-width="4"/><path d="M${n(x)} ${n(y - 34)}v8M${n(x)} ${n(y + 26)}v8M${n(x - 34)} ${n(y)}h8M${n(x + 26)} ${n(y)}h8" stroke="${C.rape}" stroke-width="4" stroke-linecap="round"/>`;
  return s + `<rect x="${n(between(r, 60, 240))}" y="206" width="34" height="9" rx="3" fill="#fff"/><rect x="30" y="208" width="340" height="10" rx="4" fill="#7A5500"/>`;
}
/** 德育：两只靠在一起的手 */
function hands(r: R): string {
  let s = bg(C.camellia1) + `<circle cx="${n(between(r, 180, 220))}" cy="120" r="${n(between(r, 84, 100))}" fill="#fff" opacity="0.7"/>`;
  const x = 200, y = between(r, 96, 112);
  s += `<path d="M${x} ${n(y + 76)}c-70-40-84-80-64-106 18-22 50-16 64 8 14-24 46-30 64-8 20 26 6 66-64 106z" fill="${C.camellia}"/>`;
  s += `<path d="M${x - 46} ${n(y + 34)}c18-18 34-18 46 0 12-18 28-18 46 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`;
  for (let i = 0; i < 4; i++) s += `<circle cx="${n(r() * W)}" cy="${n(r() * H)}" r="${n(4 + r() * 6)}" fill="${C.rape}" opacity="0.8"/>`;
  return s;
}

const SCENES: Record<CoverKind, (r: R) => string> = {
  psychology: sky, learning: desk, career: (r) => road(r, 'pine'), policy: paper, culture: (r) => (r() < 0.5 ? tieDye(r) : terrace(r)), five_edu: play,
  role_model: portrait, parent: home, teacher: board,
  job: (r) => road(r, 'indigo'), industry: terrace, major: desk, person: (r) => portrait(r, '#F2B45A', '#B36A00'),
  moral: hands, intellectual: desk, physical: (r) => play(r, '#BDE9DC'), aesthetic: (r) => tieDye(r, pick(r, [C.indigo9, C.indigo7, '#0D5C4A'])), labor: terrace,
};

/** 生成封面的 SVG 源码（400×240） */
export function coverSvg(id: string, kind: CoverKind): string {
  const h = hash(id + kind), r = rng(h);
  // 渐变 id 带上哈希：多张封面内联在同一页时不会互相串色
  const body = (SCENES[kind] ?? sky)(r).replace(/id="g"/g, `id="g${h}"`).split('url(#g)').join(`url(#g${h})`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
}
/** 生成可以直接放进 <img src> 或小程序 <Image src> 的地址 */
export function coverUri(id: string, kind: CoverKind): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(coverSvg(id, kind));
}
