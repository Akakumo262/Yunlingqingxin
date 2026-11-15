import { useState } from 'react';
import { Button, Drawer, Spin, Table } from 'antd';
import { AssessmentOverview, AssessmentReport, InstrumentBrief, Routes } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import StudentDrawer from '@/components/StudentDrawer';
import { Bar, Empty, PageHead, Sheet, ago } from '@/components/ui';

type Recent = AssessmentOverview['recent'][number];
const KIND = { screening: '成长状态', development: '发展优势', career: '生涯探索', entertainment: '轻松一下' } as const;

/** 问卷概览：先看整体，再看最近谁做了、要不要找他聊聊。人数不足 10 的不显示细分。 */
export default function Assessments() {
  const { data } = useGet<AssessmentOverview>(['assess'], Routes.assessmentOverview);
  const lib = useGet<InstrumentBrief[]>(['instruments'], Routes.instrumentList);
  const [sid, setSid] = useState<Recent | null>(null);
  const [student, setStudent] = useState<string | null>(null);
  const report = useGet<AssessmentReport>(['assess', 'report', sid?.session_id], Routes.assessmentReport, { params: { id: sid?.session_id ?? '' } }, !!sid);
  const r = report.data;

  return (
    <>
      <PageHead title="问卷概览" sub="问卷结果只有学生本人和你看得到。它是一条线索，不是结论：要不要跟进，由你和学生聊过之后决定。" />
      <div className="cols c-3">
        {data?.instruments.map((i) => {
          const brief = lib.data?.find((x) => x.id === i.instrument_id);
          return (
            <div className="kpi" key={i.instrument_id}>
              <span>{brief ? KIND[brief.kind] : '问卷'} · {brief?.item_count ?? '—'} 题</span>
              <h3 style={{ fontSize: 16, margin: '4px 0 10px' }}>{i.name}</h3>
              <div className="meta-line" style={{ justifyContent: 'space-between' }}><span>本校做过</span><b className="num" style={{ fontSize: 18, margin: 0, display: 'inline', color: 'var(--indigo-900)' }}>{i.done_count} 人</b></div>
              {i.low_count === null
                ? <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>人数不足 10，暂不展示细分，避免对应到个人。</p>
                : <><div className="meta-line" style={{ justifyContent: 'space-between', margin: '8px 0 4px' }}><span>建议聊一聊</span><span className="num">{i.low_count} 人</span></div><Bar value={i.low_count / i.done_count} tone="rape" /></>}
            </div>
          );
        })}
      </div>

      <Sheet title="最近完成的" aside="按时间排列" className="gap-top">
        <Table<Recent> rowKey="session_id" dataSource={data?.recent} pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty title="这几天还没有同学做问卷" hint="学生在小程序“我的 → 成长问卷”里自愿作答，每一题都可以跳过。" /> }}
          columns={[
            { title: '同学', render: (_, x) => <><b>{x.student.name}</b> <span className="faint">{x.student.class_name}</span></> },
            { title: '问卷', dataIndex: 'instrument_name' },
            { title: '结果摘要', dataIndex: 'headline' },
            { title: '', dataIndex: 'suggest_talk', render: (v) => (v ? <span className="pill wait">建议聊一聊</span> : <span className="pill off">平稳</span>) },
            { title: '时间', dataIndex: 'created_at', render: ago },
            { title: '', render: (_, x) => <Button type="link" onClick={() => setSid(x)}>看报告</Button> },
          ]} />
      </Sheet>

      <Drawer open={!!sid} onClose={() => setSid(null)} width={520} title={sid ? `${sid.student.name} · ${sid.instrument_name}` : ''} destroyOnClose
        extra={sid && <Button type="primary" onClick={() => (setStudent(sid.student.id), setSid(null))}>记一次谈话</Button>}>
        {!r ? <Spin /> : (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="takeaways" style={{ marginTop: 0 }}>
              <small>{r.instrument_name}</small>
              <p style={{ fontSize: 20, fontWeight: 700 }}>{r.headline}</p>
              <p style={{ opacity: 0.85 }}>{r.description}</p>
            </div>
            {r.raw_score !== undefined && <p className="muted">原始分 <b className="num">{r.raw_score}</b>。分数只给你作参考，学生端、班主任和家长的任何页面都不显示。</p>}
            {r.strengths.length > 0 && <section><h3>做得好的地方</h3>{r.strengths.map((x) => <div key={x} className="script">{x}</div>)}</section>}
            <section><h3>给学生的建议</h3>{r.suggestions.map((x) => <div key={x} className="script">{x}</div>)}</section>
            <p className="faint" style={{ fontSize: 12 }}>{r.disclaimer}</p>
          </div>
        )}
      </Drawer>
      <StudentDrawer id={student} onClose={() => setStudent(null)} />
    </>
  );
}
