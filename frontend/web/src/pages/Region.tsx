import { Table } from 'antd';
import { RegionReport, Routes } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import { TrendChart } from '@/components/charts';
import { PageHead, Sheet, fmtTime, pct } from '@/components/ui';

type School = RegionReport['schools'][number];

/** P-18 区域看板：只有聚合，不排名；样本不足 10 人的学校不展示数值 */
export default function Region() {
  const { data: r } = useGet<RegionReport>(['region'], Routes.regionReport);
  if (!r) return <PageHead title="区域看板" />;
  const [y, m] = r.period.split('-');

  return (
    <>
      <PageHead title={`${y} 年 ${Number(m)} 月`} sub={`数据更新于 ${fmtTime(r.updated_at)}。这里只有汇总数字，看不到任何一个学生。`} />
      <div className="cols c-4">
        <div className="kpi lead"><span>需要支持的同学里，按时得到回应并闭环的</span><b>{pct(r.escr)}</b><em>有效支持闭环率，目标 80%</em></div>
        <div className="kpi"><span>紧急求助 15 分钟内有人回应</span><b>{pct(r.l3_ack_within_15m_rate)}</b><em>目标 98%</em></div>
        <div className="kpi"><span>转介后 30 天内收到反馈</span><b>{pct(r.referral_closure_rate)}</b><em>目标 85%</em></div>
        <div className="kpi"><span>本月新识别需要关注</span><b>{r.new_focus ?? '—'}</b><em>人，经老师确认</em></div>
      </div>
      <div className="cols c-2-1" style={{ marginTop: 20 }}>
        <Sheet title="近六个月" aside="柱：新识别人数　线：闭环率">
          <TrendChart data={r.trend} />
        </Sheet>
        <Sheet title="怎么读这些数">
          <p className="muted">开学月份新识别人数会升高，这通常说明老师在认真看，不是情况变糟。</p>
          <p className="muted" style={{ marginTop: 10 }}>更值得看的是闭环率：被看见的孩子，后来有没有人一直跟到底。</p>
        </Sheet>
      </div>
      <Sheet title="各校使用情况" aside="按校名排序，不排名">
        <Table<School> rowKey="school_name" dataSource={r.schools} pagination={false}
          columns={[
            { title: '学校', dataIndex: 'school_name', render: (v) => <b>{v}</b> },
            { title: '学生月活', dataIndex: 'student_active_rate', render: (v, s) => (s.suppressed ? <span className="faint">样本不足 10 人，暂不展示</span> : <span className="num">{pct(v)}</span>), onCell: (s) => ({ colSpan: s.suppressed ? 3 : 1 }) },
            { title: '教师周活', dataIndex: 'teacher_active_rate', render: (v) => <span className="num" style={{ color: v !== null && v < 0.3 ? 'var(--camellia)' : undefined }}>{pct(v)}</span>, onCell: (s) => ({ colSpan: s.suppressed ? 0 : 1 }) },
            { title: '闭环率', dataIndex: 'closure_rate', render: (v) => <span className="num">{pct(v)}</span>, onCell: (s) => ({ colSpan: s.suppressed ? 0 : 1 }) },
          ]} />
      </Sheet>
    </>
  );
}
