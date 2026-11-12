import { MOODS, Mood } from '@yunling/contracts';
import { tokens } from '../../../design/tokens';
import { weekday } from './ui';

const MOOD_COLOR: Record<Mood, string> = { great: '#FFC83D', good: '#FFE08A', okay: '#B8C4DC', low: '#3B7BEA', hard: '#1E3A7B' };

/** 班级一周心情：每天一根堆叠柱，晴在上、雨在下。只有整体，没有个人。 */
export function MoodBars({ trend }: { trend: { date: string; counts: Record<Mood, number> }[] }) {
  const max = Math.max(1, ...trend.map((d) => MOODS.reduce((a, m) => a + d.counts[m], 0)));
  const H = 150, W = 56, GAP = 22;
  return (
    <div>
      <svg viewBox={`0 0 ${trend.length * (W + GAP)} ${H + 26}`} width="100%" role="img" aria-label="班级最近七天的心情分布">
        {trend.map((d, i) => {
          let y = H;
          return (
            <g key={d.date} transform={`translate(${i * (W + GAP) + GAP / 2},0)`}>
              {[...MOODS].reverse().map((m) => {
                const h = (d.counts[m] / max) * (H - 8);
                y -= h;
                return h > 0 ? <rect key={m} x="0" y={y} width={W} height={Math.max(h - 2, 1)} rx="5" fill={MOOD_COLOR[m]} /> : null;
              })}
              <text x={W / 2} y={H + 20} textAnchor="middle" fontSize="12" fill="#8590A8">周{weekday(d.date)}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: '#4A5878', marginTop: 6 }}>
        {MOODS.map((m) => (
          <span key={m}><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: MOOD_COLOR[m], marginRight: 6 }} />{tokens.weather[m].label}</span>
        ))}
      </div>
    </div>
  );
}

/** 区域趋势：柱是新增关注人数，线是闭环率 */
export function TrendChart({ data }: { data: { month: string; new_focus: number; closure_rate: number }[] }) {
  const W = 640, H = 220, PAD = 34, bw = 36;
  const maxN = Math.max(...data.map((d) => d.new_focus)) * 1.2;
  const x = (i: number) => PAD + (i + 0.5) * ((W - PAD * 2) / data.length);
  const yN = (v: number) => H - PAD - (v / maxN) * (H - PAD * 2);
  const yR = (v: number) => H - PAD - v * (H - PAD * 2);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${yR(d.closure_rate)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="近六个月新增关注人数与闭环率">
      {[0, 0.5, 1].map((g) => <line key={g} x1={PAD} x2={W - PAD} y1={yR(g)} y2={yR(g)} stroke="#DFE5F0" strokeDasharray={g ? '3 4' : undefined} />)}
      {data.map((d, i) => (
        <g key={d.month}>
          <rect x={x(i) - bw / 2} y={yN(d.new_focus)} width={bw} height={H - PAD - yN(d.new_focus)} rx="6" fill="#E3EDFC" />
          <text x={x(i)} y={yN(d.new_focus) - 6} textAnchor="middle" fontSize="12" fill="#4A5878" fontFamily={tokens.font.num}>{d.new_focus}</text>
          <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="12" fill="#8590A8">{Number(d.month.slice(5))} 月</text>
        </g>
      ))}
      <path d={line} fill="none" stroke="#14264D" strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((d, i) => <circle key={d.month} cx={x(i)} cy={yR(d.closure_rate)} r="4.5" fill="#FFC83D" stroke="#14264D" strokeWidth="2" />)}
      <text x={W - PAD} y={yR(data[data.length - 1].closure_rate) - 12} textAnchor="end" fontSize="13" fontWeight="700" fill="#14264D" fontFamily={tokens.font.num}>闭环率 {Math.round(data[data.length - 1].closure_rate * 100)}%</text>
    </svg>
  );
}
