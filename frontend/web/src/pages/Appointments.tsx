import { useState } from 'react';
import { Button } from 'antd';
import { APPOINTMENT_TOPIC_LABEL, Appointment, AppointmentStatus, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import StudentDrawer from '@/components/StudentDrawer';
import { Empty, PageHead, Sheet, Stat, ago, weekday } from '@/components/ui';

const STATUS: Record<AppointmentStatus, { text: string; cls: string }> = { pending: { text: '等你确认', cls: 'wait' }, confirmed: { text: '已确认', cls: 'ok' }, done: { text: '已经聊过', cls: 'off' }, cancelled: { text: '学生取消了', cls: 'off' } };
const day = (d: string) => `${Number(d.slice(5, 7))} 月 ${Number(d.slice(8))} 日 周${weekday(d)}`;

/** 面谈预约：学生自己约的时间。不急的事走这里，急的事走“我想找人说”。 */
export default function Appointments() {
  const { data } = useGet<Appointment[]>(['appointments'], Routes.appointmentList);
  const confirm = useAct((id: string) => api(Routes.appointmentConfirm, { params: { id } }), ['appointments'], '已确认，学生会收到通知');
  const [student, setStudent] = useState<string | null>(null);
  const all = data ?? [];
  const live = all.filter((a) => a.status === 'pending' || a.status === 'confirmed').sort((a, b) => (a.slot.date + a.slot.time).localeCompare(b.slot.date + b.slot.time));
  const past = all.filter((a) => a.status === 'done' || a.status === 'cancelled');
  const days = [...new Set(live.map((a) => a.slot.date))];

  return (
    <>
      <PageHead title="面谈预约" sub="学生在小程序里自己选的时间。确认后学生会收到一条通知，到时候直接来心理辅导室。" />
      <div className="cols c-2-1">
        <div>
          {days.length === 0 && <Sheet><Empty title="还没有同学预约" hint="学生在“我想找人说 → 约心理老师一个时间”里预约。" /></Sheet>}
          {days.map((d) => (
            <Sheet key={d} title={day(d)}>
              {live.filter((a) => a.slot.date === d).map((a) => (
                <div className="row" key={a.id} style={{ alignItems: 'flex-start' }}>
                  <b className="num" style={{ fontSize: 18, width: 110 }}>{a.slot.time}</b>
                  <div className="grow">
                    <b>{a.student?.name}</b> <span className="faint">{a.student?.class_name} · 想聊{APPOINTMENT_TOPIC_LABEL[a.topic]} · {ago(a.created_at)}预约</span>
                    <small>{a.slot.place}</small>
                    {a.note && <div className="quote" style={{ marginTop: 6 }}>{a.note}<small>学生想先让你知道的</small></div>}
                  </div>
                  <span className={`pill ${STATUS[a.status].cls}`}>{STATUS[a.status].text}</span>
                  <div className="row-actions">
                    {a.status === 'pending' && <Button type="primary" loading={confirm.isPending && confirm.variables === a.id} onClick={() => confirm.mutate(a.id)}>确认</Button>}
                    {a.student && <Button onClick={() => setStudent(a.student!.id)}>聊完记一笔</Button>}
                  </div>
                </div>
              ))}
            </Sheet>
          ))}
          {past.length > 0 && (
            <Sheet title="之前的">
              {past.map((a) => (
                <div className="row" key={a.id}>
                  <div className="grow"><b>{a.student?.name}</b><small>{day(a.slot.date)} {a.slot.time} · {APPOINTMENT_TOPIC_LABEL[a.topic]}</small></div>
                  <span className={`pill ${STATUS[a.status].cls}`}>{STATUS[a.status].text}</span>
                </div>
              ))}
            </Sheet>
          )}
        </div>
        <div>
          <div className="cols c-1-1" style={{ marginBottom: 20 }}>
            <Stat lead label="等你确认" value={all.filter((a) => a.status === 'pending').length} note="个" />
            <Stat label="已确认" value={all.filter((a) => a.status === 'confirmed').length} note="个" />
          </div>
          <Sheet title="面谈前可以想的三件事">
            <div className="script"><small>开场</small>谢谢你来。今天想聊什么都可以，不想说的可以不说。</div>
            <div className="script"><small>过程</small>先听完，再问“然后呢”。少问“为什么”。</div>
            <div className="script"><small>结束</small>约好下一次，或者告诉他随时可以再约。</div>
            <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>面谈内容只记在个案里，班主任和家长看不到原文。</p>
          </Sheet>
        </div>
      </div>
      <StudentDrawer id={student} onClose={() => setStudent(null)} />
    </>
  );
}
