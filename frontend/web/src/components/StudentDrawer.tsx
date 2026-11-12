import { useState } from 'react';
import { Button, Drawer, Input, Spin } from 'antd';
import { NextStep, ObservationCreateReq, ObservationDimension, ObservationScene, Routes, StudentCard } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { Level, MoodDots, fmtTime } from './ui';

const SCENES: [ObservationScene, string][] = [['break', '课间'], ['after_class', '课后'], ['home_visit', '家访'], ['other', '其他']];
const DIMS: [ObservationDimension, string][] = [['emotion', '情绪'], ['study', '学习'], ['relationship', '人际']];
const NEXT: [NextStep, string][] = [['keep_watching', '继续留意'], ['talk_again', '过几天再聊'], ['refer_psychologist', '请心理老师接手']];
const label = <T extends string>(list: [T, string][], v: T) => list.find(([k]) => k === v)?.[1] ?? v;

/** 学生卡片（P-14）+ 三步谈话记录（P-15）。班主任和心理教师共用。 */
export default function StudentDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useGet<StudentCard>(['student', id], Routes.studentCard, { params: { id: id ?? '' } }, !!id);
  const [scene, setScene] = useState<ObservationScene>('break');
  const [dims, setDims] = useState<ObservationDimension[]>([]);
  const [note, setNote] = useState('');
  const [next, setNext] = useState<NextStep>('keep_watching');

  const save = useAct(
    (body: ObservationCreateReq) => api(Routes.observationCreate, { body }),
    ['student', 'alerts', 'class'],
    next === 'refer_psychologist' ? '已保存，并通知了心理老师' : '谈话记录已保存',
  );
  const submit = () => save.mutate({ student_id: id!, scene, dimensions: dims, note, next_step: next }, { onSuccess: () => (setNote(''), setDims([])) });
  const toggle = (d: ObservationDimension) => setDims((x) => (x.includes(d) ? x.filter((i) => i !== d) : [...x, d]));

  return (
    <Drawer open={!!id} onClose={onClose} width={520} title={data ? <span>{data.student.name} <Level level={data.level} /></span> : '学生'} destroyOnClose>
      {isLoading || !data ? (
        <Spin />
      ) : (
        <div style={{ display: 'grid', gap: 28 }}>
          <section>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>最近七天</h3>
            <MoodDots week={data.mood_week} />
            <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>只显示学生选的天气，不显示他写的话。学生能看到“班主任看过心情趋势”。</p>
          </section>

          <section>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>记一次谈话</h3>
            <div className="steps">
              <div className="step">
                <label>在哪聊的</label>
                <div className="choice">{SCENES.map(([k, t]) => <button key={k} aria-pressed={scene === k} onClick={() => setScene(k)}>{t}</button>)}</div>
              </div>
              <div className="step">
                <label>聊到了什么（可多选）</label>
                <div className="choice">{DIMS.map(([k, t]) => <button key={k} aria-pressed={dims.includes(k)} onClick={() => toggle(k)}>{t}</button>)}</div>
              </div>
              <div className="step">
                <label>写两句话就够了</label>
                <Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="只写你看到的和他说的，不用下判断。" />
              </div>
              <div className="step">
                <label>接下来</label>
                <div className="choice">{NEXT.map(([k, t]) => <button key={k} aria-pressed={next === k} onClick={() => setNext(k)}>{t}</button>)}</div>
              </div>
              <Button type="primary" disabled={!dims.length || !note.trim()} loading={save.isPending} onClick={submit}>保存谈话记录</Button>
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: 14 }}>开口的第一句话</h3>
            {data.scripts.map((s) => <div className="script" key={s.id}><small>{s.scene}</small>{s.text}</div>)}
          </section>

          <section>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>之前的记录</h3>
            {data.observations.length === 0 && <p className="muted">还没有记录。</p>}
            <div className="tl">
              {data.observations.map((o) => (
                <div key={o.id}>
                  <b>{label(SCENES, o.scene)} · {o.dimensions.map((d) => label(DIMS, d)).join('、')}</b>
                  <small>{o.teacher_name} {fmtTime(o.created_at)}</small>
                  <p>{o.note}</p>
                  <p className="faint">{label(NEXT, o.next_step)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
}
