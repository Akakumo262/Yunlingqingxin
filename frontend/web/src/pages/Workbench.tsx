import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal } from 'antd';
import { AlertItem, Announcement, Appointment, CaseDetail, ClassBoard, FollowUp, HomeNote, Page, Role, Routes, TalkScript } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import StudentDrawer from '@/components/StudentDrawer';
import { Due, Empty, Level, Ridge, Sheet, ago, fmtTime, weekday } from '@/components/ui';

const hello = () => { const h = new Date().getHours(); return h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'; };
const FROM = { talk: '谈话回访', case_plan: '计划复盘', referral: '转介跟进' } as const;
const SOURCE = { one_click_help: '学生主动求助', check_in_rule: '心情记录', assessment_rule: '成长问卷', teacher_observation: '老师观察', ai_guardrail: '助手对话' } as const;

/** P-12 今日待办：一眼看到今天要找谁、还剩多少时间、接下来要回访谁 */
export default function Workbench() {
  const nav = useNavigate();
  const me = useAuth((s) => s.me)!;
  const isHead = me.roles.includes(Role.headTeacher), isPsy = me.roles.includes(Role.psychologist), canTalk = isHead || isPsy;
  const alerts = useGet<Page<AlertItem>>(['alerts'], Routes.alertList);
  const board = useGet<ClassBoard>(['class'], Routes.classBoard, { params: { id: me.class_id ?? '' } }, isHead && !!me.class_id);
  const scripts = useGet<TalkScript[]>(['scripts'], Routes.talkScripts);
  const follow = useGet<FollowUp[]>(['followups'], Routes.followUps, undefined, canTalk);
  const appts = useGet<Appointment[]>(['appointments'], Routes.appointmentList, undefined, isPsy);
  const notes = useGet<HomeNote[]>(['notes'], Routes.noteList, undefined, isHead);
  const anns = useGet<Announcement[]>(['announcements'], Routes.announcementList);
  const [student, setStudent] = useState<string | null>(null);
  const [dismiss, setDismiss] = useState<AlertItem | null>(null);
  const [reason, setReason] = useState('');
  const [seed, setSeed] = useState(0);

  const ack = useAct((id: string) => api(Routes.alertAck, { params: { id } }), ['alerts'], '已记下由你跟进，学生会看到“老师看到了”');
  const escalate = useAct((id: string) => api(Routes.alertEscalate, { params: { id } }), ['alerts'], '已升级，更多人会收到通知');
  const drop = useAct((a: AlertItem) => api(Routes.alertDismiss, { params: { id: a.id }, body: { reason } }), ['alerts', 'class'], '已标记为不需要关注');
  const open = useAct((a: AlertItem) => api<CaseDetail>(Routes.caseCreate, { body: { student_id: a.student.id, alert_id: a.id, level: a.level === 'L0' ? 'L1' : a.level } }), ['alerts', 'cases'], '已建立个案');

  const all = alerts.data?.items ?? [];
  const todo = all.filter((a) => a.status === 'open' || a.status === 'escalated').sort((a, b) => a.due_at.localeCompare(b.due_at));
  const doing = all.filter((a) => a.status === 'acked');
  const pendingAppts = appts.data?.filter((a) => a.status === 'pending') ?? [];
  const upcoming = appts.data?.filter((a) => a.status === 'confirmed') ?? [];
  const replied = notes.data?.filter((n) => n.reply) ?? [];
  const dueSoon = follow.data?.filter((f) => Date.parse(f.due_at) - Date.now() < 2 * 86_400_000) ?? [];
  const picks = useMemo(() => {
    const list = scripts.data ?? [];
    return list.length ? [0, 1, 2].map((i) => list[(seed * 3 + i * 7) % list.length]) : [];
  }, [scripts.data, seed]);

  return (
    <>
      <div className="hero">
        <h1>{hello()}，{me.name}</h1>
        <p>{todo.length ? `有 ${todo.length} 件事等你回应，最急的排在最上面。` : '现在没有等你回应的提醒。'}</p>
        <div className="hero-nums">
          <button className={todo.some((a) => a.level === 'L3') ? 'hot' : ''}><b>{todo.length}</b><span>等你回应</span></button>
          <button><b>{doing.length}</b><span>正在跟进</span></button>
          {canTalk && <button><b>{dueSoon.length}</b><span>这两天要回访</span></button>}
          {isPsy && <button onClick={() => nav('/appointments')}><b>{pendingAppts.length}</b><span>预约待确认</span></button>}
          {isHead && <button onClick={() => nav('/notes')}><b>{replied.length}</b><span>家长回了话</span></button>}
        </div>
        <Ridge className="ridge" tone="hero" />
      </div>

      <div className="cols c-2-1">
        <div>
          <Sheet title="等你回应" aside="系统只是提示，需要你确认">
            {todo.length === 0 && <Empty title="这会儿挺平稳" hint="有新的提醒会出现在这里。" />}
            {todo.map((a) => (
              <div className={`row${a.level === 'L3' ? ' urgent' : ''}`} key={a.id}>
                <Level level={a.level} />
                <div className="grow">
                  <b>{a.student.name}</b> <span className="faint">{a.student.class_name} · {SOURCE[a.source]} · {ago(a.created_at)}</span>
                  <small>{a.reason}</small>
                </div>
                <Due at={a.due_at} />
                <div className="row-actions">
                  <Button type="primary" onClick={() => ack.mutate(a.id)}>我来跟进</Button>
                  {a.level !== 'L3' && <Button onClick={() => escalate.mutate(a.id)}>升级</Button>}
                  <Button type="text" onClick={() => (setReason(''), setDismiss(a))}>不需要关注</Button>
                </div>
              </div>
            ))}
          </Sheet>

          <Sheet title="正在跟进">
            {doing.length === 0 && <Empty title="还没有在跟进的事" />}
            {doing.map((a) => (
              <div className="row" key={a.id}>
                <Level level={a.level} />
                <div className="grow">
                  <b>{a.student.name}</b>
                  <small>{a.acked_by_name} 于 {a.acked_at && fmtTime(a.acked_at)} 接手 · {a.reason}</small>
                </div>
                <div className="row-actions">
                  {canTalk && <Button onClick={() => setStudent(a.student.id)}>记一次谈话</Button>}
                  {isPsy && <Button type="primary" ghost loading={open.isPending} onClick={() => open.mutate(a, { onSuccess: (c) => nav(`/cases?open=${c.id}`) })}>建立个案</Button>}
                </div>
              </div>
            ))}
          </Sheet>

          {canTalk && (
            <Sheet title="接下来要回访" aside="说好的事，到时间提醒你">
              {follow.data?.length === 0 && <Empty title="暂时没有要回访的" hint="谈话时选“过几天再聊”，三天后会出现在这里。" />}
              {follow.data?.map((f) => (
                <div className="row" key={f.id}>
                  <span className="pill">{FROM[f.from]}</span>
                  <div className="grow"><b>{f.student.name}</b> <span className="faint">{f.student.class_name}</span><small>{f.what}</small></div>
                  <Due at={f.due_at} />
                  <Button type="link" onClick={() => (f.case_id ? nav(`/cases?open=${f.case_id}`) : setStudent(f.student.id))}>{f.case_id ? '打开个案' : '去聊聊'}</Button>
                </div>
              ))}
            </Sheet>
          )}
        </div>

        <div>
          {isHead && (
            <Sheet title="这周多留意" aside="最多 5 人">
              {board.data?.focus.length === 0 && <Empty title="这周没有需要特别留意的同学" />}
              {board.data?.focus.map((s) => (
                <div className="row" key={s.id}>
                  <div className="grow"><b>{s.name}</b><small>{s.reason}</small></div>
                  <Button type="link" onClick={() => setStudent(s.id)}>看看</Button>
                </div>
              ))}
            </Sheet>
          )}
          {isPsy && (
            <Sheet title="面谈预约" aside={<button className="link-btn" onClick={() => nav('/appointments')}>全部</button>}>
              {pendingAppts.length + upcoming.length === 0 && <Empty title="还没有同学预约" />}
              {[...pendingAppts, ...upcoming].slice(0, 4).map((a) => (
                <div className="row" key={a.id}>
                  <div className="grow"><b>{a.student?.name}</b><small>{Number(a.slot.date.slice(5, 7))} 月 {Number(a.slot.date.slice(8))} 日 周{weekday(a.slot.date)} {a.slot.time}</small></div>
                  <span className={`pill ${a.status === 'pending' ? 'wait' : 'ok'}`}>{a.status === 'pending' ? '待确认' : '已确认'}</span>
                </div>
              ))}
            </Sheet>
          )}
          {isHead && replied.length > 0 && (
            <Sheet title="家长回了话" aside={<button className="link-btn" onClick={() => nav('/notes')}>全部</button>}>
              {replied.slice(0, 3).map((n) => (
                <div className="row" key={n.id}>
                  <div className="grow"><b>{n.student.name}的家长</b><small>“{n.reply!.text}”</small></div>
                  <span className="faint">{ago(n.reply!.at)}</span>
                </div>
              ))}
            </Sheet>
          )}
          <Sheet title="开口的第一句话" aside={<button className="link-btn" onClick={() => setSeed(seed + 1)}>换几句</button>}>
            {picks.map((s) => <div className="script" key={s.id}><small>{s.scene}</small>{s.text}</div>)}
          </Sheet>
          {!!anns.data?.length && (
            <Sheet title="公告" aside={<button className="link-btn" onClick={() => nav('/announcements')}>全部</button>}>
              {anns.data.slice(0, 2).map((a) => (
                <div className="row" key={a.id}><div className="grow"><b>{a.title}</b><small>{a.body}</small></div></div>
              ))}
            </Sheet>
          )}
        </div>
      </div>

      <StudentDrawer id={student} onClose={() => setStudent(null)} />
      <Modal open={!!dismiss} title={`${dismiss?.student.name} 不需要关注？`} okText="确认标记" cancelText="再想想" okButtonProps={{ disabled: !reason.trim(), loading: drop.isPending }}
        onCancel={() => setDismiss(null)} onOk={() => drop.mutate(dismiss!, { onSuccess: () => setDismiss(null) })}>
        <p className="muted" style={{ marginBottom: 12 }}>写一句你了解到的情况。标记误报不会被追责，这条说明会帮助改进提醒规则。</p>
        <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="比如：已当面聊过，是因为家里搬家这几天睡得少。" />
      </Modal>
    </>
  );
}
