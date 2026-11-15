import { useNavigate } from 'react-router-dom';
import { Button, Table } from 'antd';
import { FIVE_EDU_NAME, RegionReport, Routes } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import { TrendChart } from '@/components/charts';
import { Bar, EduBadge, PageHead, Sheet, Stat, eduColor, fmtTime, pct } from '@/components/ui';

type School = RegionReport['schools'][number];

/** P-18 区域看板：只有聚合，不排名；样本不足 10 人的学校不展示数值 */
export default function Region() {
  const nav = useNavigate();
  const { data: r } = useGet<RegionReport>(['region'], Routes.regionReport);
  if (!r) return <PageHead title="区域看板" />;
  const [y, m] = r.period.split('-');
  const srcTotal = (r.sources ?? []).reduce((a, s) => a + s.count, 0) || 1;

  return (
    <>
      <PageHead title={`${y} 年 ${Number(m)} 月`} sub={`数据更新于 ${fmtTime(r.updated_at)}。这里只有汇总数字，看不到任何一个学生。`}>
        <Button type="primary" onClick={() => nav('/report')}>生成月度报告</Button>
      </PageHead>
      <div className="cols c-4">
        <Stat lead label="需要支持的同学里，按时得到回应并闭环的" value={pct(r.escr)} note="有效支持闭环率，目标 80%" />
        <Stat label="紧急求助 15 分钟内有人回应" value={pct(r.l3_ack_within_15m_rate)} note="目标 98%" />
        <Stat label="转介后 30 天内收到反馈" value={pct(r.referral_closure_rate)} note="目标 85%" />
        <Stat label="本月新识别需要关注" value={r.new_focus ?? '—'} note="人，经老师确认" />
      </div>
      <div className="cols c-2-1 gap-top">
        <Sheet title="近六个月" aside="柱：新识别人数　线：闭环率">
          <TrendChart data={r.trend} />
        </Sheet>
        <Sheet title="怎么读这些数">
          <p className="muted">开学月份新识别人数会升高，这通常说明老师在认真看，不是情况变糟。</p>
          <p className="muted" style={{ marginTop: 10 }}>更值得看的是闭环率：被看见的孩子，后来有没有人一直跟到底。</p>
          <p className="muted" style={{ marginTop: 10 }}>各校之间不排名。数字低的学校，先问缺什么，再谈要求。</p>
        </Sheet>
      </div>
      <div className="cols c-1-1 gap-top">
        <Sheet title="五育活动参与" aside="本月参加过至少一场的学生比例">
          {r.five_edu?.map((e) => (
            <div className="hbar" key={e.edu} style={{ gridTemplateColumns: '28px 44px 1fr 44px' }}>
              <EduBadge edu={e.edu} /><span>{FIVE_EDU_NAME[e.edu]}</span>
              <div className="bar" style={{ height: 10, borderRadius: 5 }}><i style={{ width: `${(e.rate ?? 0) * 100}%`, background: eduColor(e.edu) }} /></div>
              <span className="num">{pct(e.rate)}</span>
            </div>
          ))}
        </Sheet>
        <Sheet title="提醒从哪里来" aside={`本月共 ${srcTotal} 条`}>
          {r.sources?.map((s) => (
            <div className="hbar" key={s.label} style={{ gridTemplateColumns: '110px 1fr 70px' }}>
              <span>{s.label}</span><Bar value={s.count / srcTotal} /><span className="num">{s.count} 条</span>
            </div>
          ))}
          <p className="faint" style={{ fontSize: 12, marginTop: 10 }}>学生主动求助占比升高，通常说明学生更愿意开口了。</p>
        </Sheet>
      </div>
      <Sheet title="各校使用情况" aside="按校名排序，不排名" className="gap-top">
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
