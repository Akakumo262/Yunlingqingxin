import { ReactNode } from 'react';
import { toast } from '@/api/toast';
import { CoverKind, FIVE_EDU_LABEL, FiveEdu, Mood, SupportLevel, coverUri } from '@yunling/contracts';
import { tokens } from '../../../design/tokens';

/** 支持等级：文字 + 形状，不只靠颜色 */
export function Level({ level }: { level: SupportLevel }) {
  const lv = tokens.level[level];
  return (
    <span className="lv" style={{ color: lv.color, background: lv.bg }}>
      <span aria-hidden>{lv.mark}</span>
      {lv.label}
    </span>
  );
}

/** 时限：还剩多久 / 已超时多久 */
export function Due({ at }: { at: string }) {
  const mins = Math.round((Date.parse(at) - Date.now()) / 60000);
  const abs = Math.abs(mins);
  const text = abs < 60 ? `${abs} 分钟` : abs < 1440 ? `${Math.round(abs / 60)} 小时` : `${Math.round(abs / 1440)} 天`;
  return <span className={`due${mins < 0 ? ' late' : ''}`}>{mins < 0 ? `已超时 ${text}` : `还剩 ${text}`}</span>;
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row-actions">{children}</div>}
    </header>
  );
}

export function Sheet({ title, aside, children, className, style }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section className={`sheet${className ? ` ${className}` : ''}`} style={style}>
      {title && (
        <div className="sheet-head">
          <h2>{title}</h2>
          {aside && <span>{aside}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <svg viewBox="0 0 120 56" width="120" height="56" aria-hidden>
        <circle cx="88" cy="16" r="9" fill="#FFC83D" />
        <path d="M0 56V40l22-16 16 12 24-28 22 24 14-10 22 18v16z" fill="#E3EDFC" />
        <path d="M0 56V48l30-14 26 12 28-16 36 18v8z" fill="#CFDDF6" />
      </svg>
      <b>{title}</b>
      {hint}
    </div>
  );
}

/** 指标块。lead = 深色主指标 */
export function Stat({ label, value, note, lead, tone }: { label: string; value: ReactNode; note?: string; lead?: boolean; tone?: 'ok' | 'hot' }) {
  return (
    <div className={`kpi${lead ? ' lead' : ''}`}>
      <span>{label}</span>
      <b style={tone ? { color: tone === 'ok' ? 'var(--pine)' : 'var(--camellia)' } : undefined}>{value}</b>
      {note && <em>{note}</em>}
    </div>
  );
}

/** 进度条：比例一眼可见 */
export function Bar({ value, tone }: { value: number; tone?: 'ok' | 'hot' | 'rape' }) {
  return <div className="bar"><i className={tone} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>;
}

/** 程序生成的封面：同一个 id 永远是同一张图，不依赖任何图片文件 */
export function Cover({ id, kind, className }: { id: string; kind: CoverKind; className?: string }) {
  return <img className={`cover${className ? ` ${className}` : ''}`} src={coverUri(id, kind)} alt="" loading="lazy" />;
}

const EDU_COLOR: Record<FiveEdu, string> = { moral: '#D9366B', intellectual: '#1F5FD1', physical: '#C98A00', aesthetic: '#7A4FD6', labor: '#14876B' };
export function EduBadge({ edu }: { edu: FiveEdu }) {
  return <span className="edu" style={{ background: EDU_COLOR[edu] }}>{FIVE_EDU_LABEL[edu]}</span>;
}
export const eduColor = (edu: FiveEdu) => EDU_COLOR[edu];

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];
export const weekday = (date: string) => WEEKDAY[new Date(date).getDay()];
export const fmtTime = (iso: string) => new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
export const fmtClock = (iso: string) => new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
export const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
/** “3 小时前”“2 天后”这样的相对时间 */
export function ago(iso: string) {
  const d = Date.parse(iso) - Date.now(), abs = Math.abs(d), tail = d < 0 ? '前' : '后';
  if (abs < 60_000) return '刚刚';
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)} 分钟${tail}`;
  if (abs < 86_400_000) return `${Math.round(abs / 3_600_000)} 小时${tail}`;
  if (abs < 30 * 86_400_000) return `${Math.round(abs / 86_400_000)} 天${tail}`;
  return fmtDate(iso);
}

/** 一周心情点：晴是黄色圆点，雨是蓝色水滴，没记录是灰点 */
export function MoodDots({ week }: { week: { date: string; mood: Mood | null }[] }) {
  return (
    <div className="dots" role="img" aria-label="最近七天的心情记录">
      {week.map((d) => (
        <i key={d.date} className={d.mood ?? ''} title={d.mood ? tokens.weather[d.mood].label : '没有记录'}>
          {weekday(d.date)}
        </i>
      ))}
    </div>
  );
}

/** 统一的失败提示：说清发生了什么 */
export const fail = (e: unknown) => toast.api.error((e as Error).message || '没有成功，请再试一次');

/** 正文渲染：「## 」小标题、「- 」要点、「> 」划重点，其余是段落 */
export function Prose({ body }: { body: string }) {
  return (
    <div className="prose">
      {body.split('\n').filter((l) => l.trim()).map((l, i) =>
        l.startsWith('## ') ? <h3 key={i}>{l.slice(3)}</h3> : l.startsWith('- ') ? <p key={i} className="li">{l.slice(2)}</p> : l.startsWith('> ') ? <blockquote key={i}>{l.slice(2)}</blockquote> : <p key={i}>{l}</p>,
      )}
    </div>
  );
}

/** 山脊剪影：品牌图形，用在侧栏底部和登录页 */
export function Ridge({ className, tone = 'rail' }: { className?: string; tone?: 'rail' | 'login' | 'hero' }) {
  const c = tone === 'rail' ? ['#1b3162', '#22407e', '#2a4f9a'] : ['#1b3162', '#23428a', '#2f5fc0'];
  return (
    <svg className={className} viewBox="0 0 400 220" preserveAspectRatio={tone === 'rail' ? 'none' : 'xMidYMax slice'} aria-hidden>
      {tone !== 'rail' && <circle cx="302" cy="52" r="26" fill="#FFC83D" />}
      <path d="M0 220V120l52-44 40 30 64-78 56 62 38-30 62 58 48-36 40 30v108z" fill={c[0]} />
      <path d="M0 220V160l70-50 58 40 62-56 70 60 60-40 80 52v54z" fill={c[1]} />
      <path d="M0 220v-28l90-34 80 26 90-40 140 46v30z" fill={c[2]} />
    </svg>
  );
}

const ICONS: Record<string, string> = {
  today: 'M4 7h16M4 12h10M4 17h7M17 15l2 2 3-4',
  class: 'M4 19v-1a4 4 0 014-4h2a4 4 0 014 4v1M9 10a3 3 0 100-6 3 3 0 000 6zM16 5a3 3 0 010 6M17 14a4 4 0 013 4v1',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  cases: 'M4 7h16v12H4zM9 7V5h6v2M4 12h16',
  referral: 'M4 12h13M13 7l5 5-5 5M20 5v14',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  form: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5M9 7h6',
  chat: 'M4 5h16v11H9l-5 4z',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6',
  watch: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  tree: 'M12 4v5M6 14v-2h12v2M12 9v3M4 14h4v5H4zM10 14h4v5h-4zM16 14h4v5h-4zM10 2h4v3h-4z',
  check: 'M4 5h16v14H4zM8 12l3 3 5-6',
  library: 'M4 4h4v16H4zM10 4h4v16h-4zM16 6l4-1 2 14-4 1z',
  building: 'M4 21V6l8-3v18M12 9l8 2v10M2 21h20M7 9v.01M7 13v.01M7 17v.01M16 14v.01M16 17v.01',
  key: 'M14 10a4 4 0 11-3.5 2L3 19.5V21h3l1-1v-2h2l2.5-2.5',
  megaphone: 'M4 10v4h3l7 4V6l-7 4zM17 9a4 4 0 010 6',
  rule: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M19 18h1M16 4v4M10 10v4M17 16v4',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  unlock: 'M6 11h12v9H6zM8 11V8a4 4 0 017.5-2',
  shield: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6zM9 12l2 2 4-4',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  pulse: 'M3 12h4l2-6 4 12 2-6h6',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.2-1.5 2.5M12 17v.01',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
};
/** 线性图标：1.6 线宽，跟随文字颜色 */
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name] ?? ICONS.doc} />
    </svg>
  );
}
