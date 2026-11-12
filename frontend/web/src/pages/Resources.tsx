import { useState } from 'react';
import { Button, Input, message } from 'antd';
import { AiChatRes, ContentCard, Page, Routes, TalkScript } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { PageHead, Sheet } from '@/components/ui';

/** 资源库：话术、教师微课、备课助手 */
export default function Resources() {
  const scripts = useGet<TalkScript[]>(['scripts'], Routes.talkScripts);
  const courses = useGet<Page<ContentCard>>(['contents', 'teacher'], Routes.contentFeed, { query: { channel: 'teacher' } });
  const [q, setQ] = useState('');
  const [log, setLog] = useState<{ q: string; a: AiChatRes }[]>([]);
  const ask = useAct((message: string) => api<AiChatRes>(Routes.aiChat, { body: { message, session_id: log[0]?.a.session_id } }), []);
  const groups = [...new Set(scripts.data?.map((s) => s.scene))];
  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => message.success('已复制'));

  return (
    <>
      <PageHead title="话术与微课" sub="不知道怎么开口的时候，先从这里找一句。" />
      <div className="cols c-1-1">
        <Sheet title="谈话话术">
          {groups.map((g) => (
            <div key={g} style={{ marginBottom: 18 }}>
              <b>{g}</b>
              {scripts.data?.filter((s) => s.scene === g).map((s) => (
                <div className="script" key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ flex: 1 }}>{s.text}</span>
                  <Button size="small" type="text" onClick={() => copy(s.text)}>复制</Button>
                </div>
              ))}
            </div>
          ))}
        </Sheet>
        <div>
          <Sheet title="五分钟微课">
            {courses.data?.items.map((c) => (
              <div className="row" key={c.id}>
                <div className="grow"><b>{c.title}</b><small>{c.summary}</small></div>
                <span className="pill">{c.minutes} 分钟</span>
              </div>
            ))}
          </Sheet>
          <Sheet title="备课助手" aside="AI 生成，仅供参考，不做学生评价">
            <Input.Search value={q} onChange={(e) => setQ(e.target.value)} placeholder="比如：学生和爸妈吵架了，班会可以怎么聊" enterButton="问一问" loading={ask.isPending}
              onSearch={(v) => v.trim() && ask.mutate(v, { onSuccess: (a) => (setLog((l) => [{ q: v, a }, ...l]), setQ('')) })} />
            {log.map((x, i) => (
              <div key={i} style={{ marginTop: 16 }}>
                <b>{x.q}</b>
                <p style={{ whiteSpace: 'pre-wrap' }} className="muted">{x.a.answer}</p>
                {x.a.sources.length > 0 && <p className="faint" style={{ fontSize: 12 }}>来源：{x.a.sources.map((s) => `《${s.title}》`).join(' ')}</p>}
              </div>
            ))}
          </Sheet>
        </div>
      </div>
    </>
  );
}
