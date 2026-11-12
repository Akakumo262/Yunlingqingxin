import { useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { AlertItem, CaseDetail, ClassBoard, Page, Role, Routes, TalkScript } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import StudentDrawer from '@/components/StudentDrawer';
import { Due, Empty, Level, PageHead, Sheet, fmtTime } from '@/components/ui';

const hello = () => { const h = new Date().getHours(); return h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'; };

/** P-12 今日待办：一眼看到今天要找谁、还剩多少时间 */
export default function Workbench() {
  const me = useAuth((s) => s.me)!;
  const isHead = me.roles.includes(Role.headTeacher), isPsy = me.roles.includes(Role.psychologist);
  const alerts = useGet<Page<AlertItem>>(['alerts'], Routes.alertList);
  const board = useGet<ClassBoard>(['class'], Routes.classBoard, { params: { id: me.class_id ?? '' } }, isHead && !!me.class_id);
  const scripts = useGet<TalkScript[]>(['scripts'], Routes.talkScripts);
  const [student, setStudent] = useState<string | null>(null);
  const [dismiss, setDismiss] = useState<AlertItem | null>(null);
  const [reason, setReason] = useState('');

  const ack = useAct((id: string) => api(Routes.alertAck, { params: { id } }), ['alerts'], '已记下由你跟进');
  const escalate = useAct((id: string) => api(Routes.alertEscalate, { params: { id } }), ['alerts'], '已升级，更多人会收到通知');
  const drop = useAct((a: AlertItem) => api(Routes.alertDismiss, { params: { id: a.id }, body: { reason } }), ['alerts', 'class'], '已标记为不需要关注');
  const open = useAct((a: AlertItem) => api<CaseDetail>(Routes.caseCreate, { body: { student_id: a.student.id, alert_id: a.id, level: a.level === 'L0' ? 'L1' : a.level } }), ['alerts', 'cases'], '已建立个案，去“个案”里填写支持计划');

  const all = alerts.data?.items ?? [];
  const todo = all.filter((a) => a.status === 'open' || a.status === 'escalated').sort((a, b) => a.due_at.localeCompare(b.due_at));
  const doing = all.filter((a) => a.status === 'acked');

  return (
    <>
      <PageHead title={`${hello()}，${me.name}`} sub={todo.length ? `有 ${todo.length} 件事等你回应，最急的排在最上面。` : '现在没有等你回应的提醒。'} />
      <div className="cols c-2-1">
        <div>
          <Sheet title="等你回应" aside="系统只是提示，需要你确认">
            {todo.length === 0 && <Empty title="班里这会儿挺平稳" hint="有新的提醒会出现在这里。" />}
            {todo.map((a) => (
              <div className={`row${a.level === 'L3' ? ' urgent' : ''}`} key={a.id}>
                <Level level={a.level} />
                <div className="grow">
                  <b>{a.student.name}</b> <span className="faint">{a.student.class_name}</span>
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
                  {(isHead || isPsy) && <Button onClick={() => setStudent(a.student.id)}>记一次谈话</Button>}
                  {isPsy && <Button type="primary" ghost loading={open.isPending} onClick={() => open.mutate(a)}>建立个案</Button>}
                </div>
              </div>
            ))}
          </Sheet>
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
          <Sheet title="开口的第一句话">
            {scripts.data?.slice(0, 4).map((s) => <div className="script" key={s.id}><small>{s.scene}</small>{s.text}</div>)}
          </Sheet>
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
