import { useState } from 'react';
import { Button, Input, Select } from 'antd';
import { ClassBoard, HomeNote, NOTE_KINDS, NOTE_KIND_LABEL, NoteKind, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import { Empty, PageHead, Sheet, Stat, ago } from '@/components/ui';

/** 每种沟通单给两句可以直接改的话：具体的事 + 不下判断 */
const DRAFTS: Record<NoteKind, string[]> = {
  praise: ['这周主动帮同学讲了一道题，讲得很清楚。想让您也知道。', '今天值日做得很认真，走的时候把窗户都关好了。'],
  remind: ['这周有两次作业没交。不着急批评，想请您晚上问问是不是哪里卡住了。', '最近上午第一节课比较困。想了解一下晚上大概几点睡。'],
  invite: ['下周四下午有家长开放日，想请您来看看孩子的扎染作品。', '想约您通个十分钟的电话，聊聊孩子最近的变化。您哪个时间方便？'],
  care: ['孩子这几天话比较少。在家如果愿意说，先听就好，不用急着给建议。', '最近换季，班里感冒的同学多，提醒孩子多带一件外套。'],
};
const TONE: Record<NoteKind, string> = { praise: 'ok', remind: 'wait', invite: '', care: 'stop' };

/** 家校沟通单：一对一发给某位同学的家长。不是群，不发分数，不写等级。 */
export default function Notes() {
  const me = useAuth((s) => s.me)!;
  const board = useGet<ClassBoard>(['class'], Routes.classBoard, { params: { id: me.class_id ?? '' } });
  const { data } = useGet<HomeNote[]>(['notes'], Routes.noteList);
  const [sid, setSid] = useState<string>();
  const [kind, setKind] = useState<NoteKind>('praise');
  const [text, setText] = useState('');
  const send = useAct(() => api(Routes.noteCreate, { body: { student_id: sid, kind, text } }), ['notes'], '已发给家长');
  const notes = data ?? [], replied = notes.filter((n) => n.reply).length, read = notes.filter((n) => n.read_at).length;

  return (
    <>
      <PageHead title="家校沟通" sub="想单独和某位家长说的话。家长在小程序里看到，可以回一句；回了你会收到通知。" />
      <div className="cols c-1-2">
        <div>
          <Sheet title="写一张沟通单">
            <div className="steps">
              <div className="step">
                <label>发给谁的家长</label>
                <Select style={{ width: '100%' }} showSearch optionFilterProp="label" value={sid} onChange={setSid} placeholder="选一位同学" options={board.data?.students.map((s) => ({ value: s.id, label: s.name }))} />
              </div>
              <div className="step">
                <label>想说哪一类</label>
                <div className="choice">{NOTE_KINDS.map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{NOTE_KIND_LABEL[k]}</button>)}</div>
              </div>
              <div className="step">
                <label>写什么</label>
                <Input.TextArea rows={4} maxLength={300} showCount value={text} onChange={(e) => setText(e.target.value)} placeholder="写具体的事。不写分数、排名和等级。" />
                {DRAFTS[kind].map((d) => <div key={d} className="script" style={{ cursor: 'pointer' }} onClick={() => setText(d)}><small>可以这样写，点一下填进去</small>{d}</div>)}
              </div>
              <Button type="primary" disabled={!sid || !text.trim()} loading={send.isPending} onClick={() => send.mutate(undefined, { onSuccess: () => setText('') })}>发给家长</Button>
            </div>
          </Sheet>
        </div>
        <div>
          <div className="cols c-3" style={{ marginBottom: 20 }}>
            <Stat label="发出" value={notes.length} note="张" />
            <Stat label="家长看过" value={read} note="张" />
            <Stat label="家长回了话" value={replied} note="张" tone="ok" />
          </div>
          <Sheet title="发出去的">
            {notes.length === 0 && <Empty title="还没有发过沟通单" hint="从一句具体的表扬开始，最容易。" />}
            {notes.map((n) => (
              <div className="row" key={n.id} style={{ alignItems: 'flex-start' }}>
                <span className={`pill ${TONE[n.kind]}`}>{NOTE_KIND_LABEL[n.kind]}</span>
                <div className="grow">
                  <b>{n.student.name}的家长</b> <span className="faint">{ago(n.created_at)} · {n.read_at ? '家长看过了' : '还没看'}</span>
                  <small style={{ color: 'var(--ink)' }}>{n.text}</small>
                  {n.reply && <div className="quote" style={{ marginTop: 8 }}>{n.reply.text}<small>家长回复 · {ago(n.reply.at)}</small></div>}
                </div>
              </div>
            ))}
          </Sheet>
        </div>
      </div>
    </>
  );
}
