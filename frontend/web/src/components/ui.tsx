import { ReactNode } from 'react';
import { message } from 'antd';
import { Mood, SupportLevel } from '@yunling/contracts';
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

export function Sheet({ title, aside, children }: { title?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="sheet">
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
      <b>{title}</b>
      {hint}
    </div>
  );
}

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];
export const weekday = (date: string) => WEEKDAY[new Date(date).getDay()];
export const fmtTime = (iso: string) => new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
export const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

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
export const fail = (e: unknown) => message.error((e as Error).message || '没有成功，请再试一次');

/** 山脊剪影：品牌图形，用在侧栏底部和登录页 */
export function Ridge({ className, tone = 'rail' }: { className?: string; tone?: 'rail' | 'login' }) {
  const c = tone === 'rail' ? ['#1b3162', '#22407e', '#2a4f9a'] : ['#1b3162', '#23428a', '#2f5fc0'];
  return (
    <svg className={className} viewBox="0 0 400 220" preserveAspectRatio={tone === 'login' ? 'xMidYMax slice' : 'none'} aria-hidden>
      {tone === 'login' && <circle cx="302" cy="52" r="26" fill="#FFC83D" />}
      <path d="M0 220V120l52-44 40 30 64-78 56 62 38-30 62 58 48-36 40 30v108z" fill={c[0]} />
      <path d="M0 220V160l70-50 58 40 62-56 70 60 60-40 80 52v54z" fill={c[1]} />
      <path d="M0 220v-28l90-34 80 26 90-40 140 46v30z" fill={c[2]} />
    </svg>
  );
}
