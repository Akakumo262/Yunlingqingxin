import { Button } from 'antd';
import { FIVE_EDU_NAME, RegionDocument, RegionReport, Routes } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import { Bar, PageHead, eduColor, fmtTime, pct } from '@/components/ui';

/** 月度报告：一键生成，排成一张可以直接打印或另存为 PDF 的纸。只有聚合数字，每页带水印。 */
export default function RegionDoc() {
  const { data: d } = useGet<RegionDocument>(['region', 'doc'], Routes.regionDocument);
  const { data: r } = useGet<RegionReport>(['region'], Routes.regionReport);
  if (!d) return <PageHead title="月度报告" />;
  const [y, m] = d.period.split('-');
  const maxSrc = Math.max(1, ...(r?.sources ?? []).map((s) => s.count));

  return (
    <>
      <PageHead title="月度报告" sub="根据本月数据自动生成的初稿。可以直接打印，也可以另存为 PDF 后在会上使用。">
        <Button type="primary" onClick={() => window.print()}>打印 / 另存为 PDF</Button>
      </PageHead>
      <article className="paper">
        <div className="wm" aria-hidden>{Array.from({ length: 40 }, (_, i) => <span key={i}>{d.watermark}</span>)}</div>
        <header>
          <h1>{d.title}</h1>
          <p>{y} 年 {Number(m)} 月 · 生成于 {fmtTime(d.generated_at)}</p>
        </header>
        {d.sections.map((s, i) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p) => <p key={p}>{p}</p>)}
            {i === 1 && r?.sources && (
              <div style={{ margin: '10px 0 0 2em' }}>
                {r.sources.map((x) => <div className="hbar" key={x.label}><span>{x.label}</span><Bar value={x.count / maxSrc} /><span className="num">{x.count}</span></div>)}
              </div>
            )}
            {i === 3 && r?.five_edu && (
              <div style={{ margin: '10px 0 0 2em' }}>
                {r.five_edu.map((e) => <div className="hbar" key={e.edu}><span>{FIVE_EDU_NAME[e.edu]}</span><div className="bar"><i style={{ width: `${(e.rate ?? 0) * 100}%`, background: eduColor(e.edu) }} /></div><span className="num">{pct(e.rate)}</span></div>)}
              </div>
            )}
            {s.bullets && i !== 1 && i !== 3 && <ul>{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          </section>
        ))}
        <footer><span>云岭青心 · 青少年成长协同平台</span><span>{d.watermark}</span></footer>
      </article>
    </>
  );
}
