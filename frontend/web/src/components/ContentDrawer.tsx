import { useState } from 'react';
import { Button, Drawer, Input, Spin } from 'antd';
import { CONTENT_CHANNEL_LABEL, ClassPush, ContentCard, ContentDetail, Role, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import { Cover, Prose } from './ui';

export const TYPE_LABEL = { article: '图文', video: '视频', audio: '音频' } as const;

/** 一行内容：封面 + 标题 + 简介。列表里到处都用 */
export function ContentRow({ c, onClick, extra }: { c: ContentCard; onClick?: () => void; extra?: React.ReactNode }) {
  return (
    <div className="crow" onClick={onClick}>
      <Cover id={c.id} kind={c.channel} className="thumb" />
      <div className="grow">
        <b>{c.title}</b>
        <small>{c.summary}</small>
        <div className="meta-line"><span>{CONTENT_CHANNEL_LABEL[c.channel]}</span><span>{TYPE_LABEL[c.type]} {c.minutes} 分钟</span><span>{c.age_label}</span></div>
      </div>
      {extra}
    </div>
  );
}

/** 内容预览。班主任可以在这里把内容推荐给全班：学生首页的“老师推荐”和通知里都会出现。 */
export default function ContentDrawer({ id, onClose, onOpen }: { id: string | null; onClose: () => void; onOpen?: (id: string) => void }) {
  const me = useAuth((s) => s.me)!;
  const canPush = me.roles.includes(Role.headTeacher) && !!me.class_id;
  const { data: c } = useGet<ContentDetail>(['content', id], Routes.contentGet, { params: { id: id ?? '' } }, !!id);
  const [msg, setMsg] = useState('');
  const push = useAct(() => api<ClassPush>(Routes.classPush, { params: { id: me.class_id! }, body: { content_id: id!, message: msg.trim() || undefined } }), ['pushes'], '已推荐给全班，同学的首页和通知里都会出现');

  return (
    <Drawer open={!!id} onClose={onClose} width={640} destroyOnClose title={c ? CONTENT_CHANNEL_LABEL[c.channel] : '内容'}>
      {!c ? <Spin /> : (
        <>
          <Cover id={c.id} kind={c.channel} className="wide" />
          <h2 style={{ fontSize: 24, lineHeight: 1.35, marginTop: 18 }}>{c.title}</h2>
          <div className="meta-line" style={{ margin: '8px 0 18px' }}>
            <span>{c.author}</span><span>{TYPE_LABEL[c.type]} {c.minutes} 分钟</span><span>适合{c.age_label}</span>
            {c.tags?.map((t) => <span key={t} className="pill">{t}</span>)}
          </div>
          {canPush && (
            <div className="sheet" style={{ background: 'var(--lake-50)', padding: 16, marginBottom: 20 }}>
              <b>推荐给{me.class_name}</b>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Input value={msg} maxLength={100} onChange={(e) => setMsg(e.target.value)} placeholder="附一句话（可以不写）。比如：下周月考，考前可以看看。" />
                <Button type="primary" loading={push.isPending} onClick={() => push.mutate(undefined, { onSuccess: () => setMsg('') })}>推荐</Button>
              </div>
            </div>
          )}
          <Prose body={c.body} />
          {!!c.takeaways?.length && (
            <div className="takeaways">
              <small>记住这几点</small>
              {c.takeaways.map((t, i) => <p key={t}><span>{i + 1}</span>{t}</p>)}
            </div>
          )}
          <dl className="meta" style={{ margin: '24px 0', padding: '16px 18px', background: 'var(--sky)', borderRadius: 12 }}>
            <dt>来源</dt><dd>{c.source}</dd>
            <dt>授权</dt><dd>{c.license}</dd>
            {c.reviewed_by && <><dt>审核</dt><dd>{c.reviewed_by}</dd></>}
          </dl>
          {!!c.related?.length && onOpen && (
            <>
              <h3 style={{ fontSize: 14 }}>相关内容</h3>
              {c.related.map((r) => <ContentRow key={r.id} c={r} onClick={() => onOpen(r.id)} />)}
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
