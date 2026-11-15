import { useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { ClassBoard as Board, ClassPush, Role, Routes, SearchResult } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import StudentDrawer from '@/components/StudentDrawer';
import ContentDrawer, { ContentRow } from '@/components/ContentDrawer';
import { MoodBars } from '@/components/charts';
import { Bar, Cover, Empty, Level, PageHead, Sheet, Stat, ago, pct } from '@/components/ui';

/** P-13 班级看板：看整体，不排名；要看某个同学时再点开。给全班推荐的内容，看完的人数也在这里。 */
export default function ClassBoard() {
  const me = useAuth((s) => s.me)!;
  const cid = me.class_id ?? '';
  const { data } = useGet<Board>(['class'], Routes.classBoard, { params: { id: cid } });
  const pushes = useGet<ClassPush[]>(['pushes'], Routes.classPushList, { params: { id: cid } });
  const [student, setStudent] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('考试');
  const found = useGet<SearchResult>(['search', q], Routes.searchAll, { query: { q } }, picking && !!q.trim());
  if (!data) return <PageHead title="我的班级" />;
  const steady = data.students.filter((s) => s.level === 'L0').length;

  return (
    <>
      <PageHead title={data.class_name} sub="记录是自愿的，没记不代表有事。这里只看整体，不排名。">
        {me.roles.includes(Role.headTeacher) && <Button type="primary" onClick={() => setPicking(true)}>给全班推荐一篇</Button>}
      </PageHead>
      <div className="cols c-4" style={{ marginBottom: 20 }}>
        <Stat lead label="全班同学" value={data.student_count} note="人" />
        <Stat label="这周记录过心情" value={pct(data.week_check_in_rate)} note="自愿记录" />
        <Stat label="这周多留意" value={data.focus.length} note="最多列 5 人" />
        <Stat label="平稳" value={steady} note="人" tone="ok" />
      </div>
      <div className="cols c-2-1">
        <Sheet title="这一周班里的天气" aside="人数分布，不对应到个人">
          <MoodBars trend={data.mood_trend} />
        </Sheet>
        <Sheet title="这周多留意" aside="最多 5 人">
          {data.focus.length === 0 && <Empty title="这周没有需要特别留意的同学" />}
          {data.focus.map((s) => (
            <div className="row" key={s.id}>
              <Level level={s.level} />
              <div className="grow"><b>{s.name}</b><small>{s.reason}</small></div>
              <Button type="link" onClick={() => setStudent(s.id)}>记一次谈话</Button>
            </div>
          ))}
        </Sheet>
      </div>

      <Sheet title="给全班推荐过的" aside="同学的首页“老师推荐”里会出现">
        {pushes.data?.length === 0 && <Empty title="还没有推荐过内容" hint="考试前、假期前，挑一篇合适的给全班。" />}
        {pushes.data?.map((p) => (
          <div className="crow" key={p.id} onClick={() => setContent(p.content.id)}>
            <Cover id={p.content.id} kind={p.content.channel} className="thumb" />
            <div className="grow">
              <b>{p.content.title}</b>
              <small>{p.message ? `“${p.message}”` : p.content.summary}</small>
              <div className="meta-line"><span>{p.teacher_name} · {ago(p.created_at)}</span></div>
            </div>
            <div style={{ width: 180 }}>
              <div className="meta-line" style={{ justifyContent: 'space-between' }}><span>看完了</span><span className="num">{p.completed_count ?? 0} / {data.student_count}</span></div>
              <Bar value={(p.completed_count ?? 0) / data.student_count} tone="ok" />
            </div>
          </div>
        ))}
      </Sheet>

      <Sheet title="全班同学" aside="按座号排列，点开可以记录谈话、给家长发沟通单">
        <div className="stu-grid">
          {data.students.map((s) => (
            <button className="stu" key={s.id} onClick={() => setStudent(s.id)}>
              <b>{s.name}</b>
              {s.level === 'L0' ? <span className="faint" style={{ fontSize: 12 }}>平稳</span> : <Level level={s.level} />}
            </button>
          ))}
        </div>
      </Sheet>

      <Modal open={picking} onCancel={() => setPicking(false)} footer={null} title="挑一篇推荐给全班" width={640}>
        <Input.Search value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜：考试、睡眠、手机、错题本…" allowClear />
        <div style={{ maxHeight: 420, overflow: 'auto', marginTop: 8 }}>
          {found.data?.contents.length === 0 && <Empty title="没搜到" hint="换个词试试。" />}
          {found.data?.contents.map((c) => <ContentRow key={c.id} c={c} onClick={() => (setPicking(false), setContent(c.id))} extra={<span className="link-btn">看看</span>} />)}
        </div>
      </Modal>
      <ContentDrawer id={content} onClose={() => setContent(null)} onOpen={setContent} />
      <StudentDrawer id={student} onClose={() => setStudent(null)} />
    </>
  );
}
