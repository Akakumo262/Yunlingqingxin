import { useState } from 'react';
import { Button } from 'antd';
import { ClassBoard as Board, Routes } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import StudentDrawer from '@/components/StudentDrawer';
import { MoodBars } from '@/components/charts';
import { Empty, Level, PageHead, Sheet, pct } from '@/components/ui';

/** P-13 班级看板：看整体，不排名；要看某个同学时再点开 */
export default function ClassBoard() {
  const me = useAuth((s) => s.me)!;
  const { data } = useGet<Board>(['class'], Routes.classBoard, { params: { id: me.class_id ?? '' } });
  const [student, setStudent] = useState<string | null>(null);
  if (!data) return <PageHead title="我的班级" />;

  return (
    <>
      <PageHead title={data.class_name} sub={`${data.student_count} 位同学，这周有 ${pct(data.week_check_in_rate)} 的人记录过心情。记录是自愿的，没记不代表有事。`} />
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
      <Sheet title="全班同学" aside="按座号排列，点开可以记录谈话">
        <div className="stu-grid">
          {data.students.map((s) => (
            <button className="stu" key={s.id} onClick={() => setStudent(s.id)}>
              <b>{s.name}</b>
              {s.level === 'L0' ? <span className="faint" style={{ fontSize: 12 }}>平稳</span> : <Level level={s.level} />}
            </button>
          ))}
        </div>
      </Sheet>
      <StudentDrawer id={student} onClose={() => setStudent(null)} />
    </>
  );
}
