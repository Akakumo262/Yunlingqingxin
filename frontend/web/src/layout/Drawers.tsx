import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Drawer, Input, Segmented } from 'antd';
import { FEEDBACK_KINDS, FEEDBACK_KIND_LABEL, Faq, FeedbackKind, Notice, NoticeList, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { Empty, ago } from '@/components/ui';
import { NOTICE_PATH } from './menus';

/** 通知：别的角色做了和你有关的事，都会落到这里。点开直接去对应页面。 */
export function NoticeDrawer({ open, onClose, allowed }: { open: boolean; onClose: () => void; allowed: string[] }) {
  const nav = useNavigate();
  const { data } = useGet<NoticeList>(['notices'], Routes.noticeList);
  const read = useAct((id: string) => api(Routes.noticeRead, { params: { id } }), ['notices']);
  const readAll = useAct(() => api(Routes.noticeReadAll), ['notices'], '全部标为已读');
  const go = (n: Notice) => {
    if (!n.read) read.mutate(n.id);
    const path = n.link && NOTICE_PATH[n.link.page];
    if (path && allowed.includes(path)) (nav(n.link?.id && path === '/cases' ? `${path}?open=${n.link.id}` : path), onClose());
  };
  return (
    <Drawer open={open} onClose={onClose} width={420} title="通知" extra={!!data?.unread && <Button type="link" onClick={() => readAll.mutate(undefined)}>全部已读</Button>}>
      {data?.items.length === 0 && <Empty title="没有新的通知" hint="和你有关的事会出现在这里。" />}
      {data?.items.map((n) => (
        <div key={n.id} className={`ntc${n.read ? ' read' : ''}`} onClick={() => go(n)}>
          <i />
          <div><b>{n.title}</b><p>{n.body}</p><small>{ago(n.created_at)}</small></div>
        </div>
      ))}
    </Drawer>
  );
}

/** 帮助与反馈：按当前角色给常见问题；反馈会进运营的通知 */
export function HelpDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useGet<Faq[]>(['faqs'], Routes.helpFaqs, undefined, open);
  const [kind, setKind] = useState<FeedbackKind>('idea');
  const [text, setText] = useState('');
  const send = useAct(() => api(Routes.feedbackCreate, { body: { kind, text } }), [], '收到了，谢谢。运营同事会看到。');
  const groups = [...new Set(data?.map((f) => f.group))];
  return (
    <Drawer open={open} onClose={onClose} width={460} title="帮助与反馈">
      {groups.map((g) => (
        <section key={g} style={{ marginBottom: 20 }}>
          <h3 className="faint" style={{ fontSize: 12, letterSpacing: '0.1em', marginBottom: 4 }}>{g}</h3>
          {data?.filter((f) => f.group === g).map((f) => <details className="faq" key={f.id}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </section>
      ))}
      <section className="sheet" style={{ background: 'var(--sky)', padding: 18 }}>
        <h3 style={{ marginBottom: 10 }}>没找到答案，或者有想法</h3>
        <Segmented value={kind} onChange={(v) => setKind(v as FeedbackKind)} options={FEEDBACK_KINDS.map((k) => ({ value: k, label: FEEDBACK_KIND_LABEL[k] }))} />
        <Input.TextArea style={{ marginTop: 10 }} rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="哪一页、做了什么、看到了什么。不要写学生的姓名。" />
        <Button style={{ marginTop: 10 }} type="primary" disabled={text.trim().length < 2} loading={send.isPending} onClick={() => send.mutate(undefined, { onSuccess: () => setText('') })}>发给运营</Button>
      </section>
    </Drawer>
  );
}
