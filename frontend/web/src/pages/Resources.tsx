import { useState } from 'react';
import { Button, Input, Segmented } from 'antd';
import { AiChatRes, CONTENT_CHANNELS, CONTENT_CHANNEL_LABEL, Collection, ContentCard, ContentChannel, Page, Routes, SearchResult, TalkScript } from '@yunling/contracts';
import { api } from '@/api/client';
import { toast } from '@/api/toast';
import { useAct, useGet } from '@/api/hooks';
import ContentDrawer, { TYPE_LABEL } from '@/components/ContentDrawer';
import { Cover, Empty, PageHead, Sheet } from '@/components/ui';

type Tab = 'scripts' | 'courses' | 'library' | 'ai';
const ASK = ['学生和爸妈吵架了，班会可以怎么聊', '怎么和不爱说话的学生开口', '期中考后怎么开一次不谈分数的班会', '家长总问排名，怎么回'];

/** 资源库：话术、教师微课、可以推荐给学生的内容、备课助手 */
export default function Resources() {
  const [tab, setTab] = useState<Tab>('scripts');
  const [scene, setScene] = useState('');
  const [kw, setKw] = useState('');
  const [channel, setChannel] = useState<ContentChannel>('psychology');
  const [id, setId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [log, setLog] = useState<{ q: string; a: AiChatRes }[]>([]);

  const scripts = useGet<TalkScript[]>(['scripts'], Routes.talkScripts);
  const courses = useGet<Page<ContentCard>>(['contents', 'teacher'], Routes.contentFeed, { query: { channel: 'teacher', limit: 50 } });
  const feed = useGet<Page<ContentCard>>(['contents', channel], Routes.contentFeed, { query: { channel, limit: 50 } }, tab === 'library' && !kw.trim());
  const found = useGet<SearchResult>(['search', kw], Routes.searchAll, { query: { q: kw } }, tab === 'library' && !!kw.trim());
  const cols = useGet<Collection[]>(['collections'], Routes.collectionList, undefined, tab === 'library');
  const ask = useAct((text: string) => api<AiChatRes>(Routes.aiChat, { body: { message: text, session_id: log[0]?.a.session_id } }), []);
  const send = (v: string) => v.trim() && ask.mutate(v, { onSuccess: (a) => (setLog((l) => [{ q: v, a }, ...l]), setQ('')) });

  const scenes = [...new Set(scripts.data?.map((s) => s.scene))];
  const shown = scripts.data?.filter((s) => !scene || s.scene === scene) ?? [];
  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.api.success('已复制'));
  const list = kw.trim() ? found.data?.contents ?? [] : feed.data?.items ?? [];

  return (
    <>
      <PageHead title="内容与话术" sub="不知道怎么开口的时候，先从这里找一句；想给学生看点什么，从这里挑一篇。">
        <Segmented value={tab} onChange={(v) => setTab(v as Tab)} options={[{ value: 'scripts', label: `谈话话术 ${scripts.data?.length ?? ''}` }, { value: 'courses', label: '教师微课' }, { value: 'library', label: '给学生的内容' }, { value: 'ai', label: '备课助手' }]} />
      </PageHead>

      {tab === 'scripts' && (
        <div className="cols" style={{ gridTemplateColumns: '220px 1fr' }}>
          <Sheet title="什么场合">
            <div className="choice" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <button aria-pressed={!scene} onClick={() => setScene('')} style={{ textAlign: 'left' }}>全部</button>
              {scenes.map((s) => <button key={s} aria-pressed={scene === s} onClick={() => setScene(s)} style={{ textAlign: 'left' }}>{s}</button>)}
            </div>
          </Sheet>
          <Sheet title={scene || '全部话术'} aside="点一下复制。照着说也行，改成自己的话更好">
            <div className="cols c-1-1" style={{ gap: 10 }}>
              {shown.map((s) => <div className="script" key={s.id} style={{ margin: 0, cursor: 'pointer' }} onClick={() => copy(s.text)}><small>{s.scene}</small>{s.text}</div>)}
            </div>
          </Sheet>
        </div>
      )}

      {tab === 'courses' && (
        <div className="tiles">
          {courses.data?.items.map((c) => (
            <button className="tile" key={c.id} onClick={() => setId(c.id)}>
              <Cover id={c.id} kind={c.channel} />
              <div className="meta-line"><span>{TYPE_LABEL[c.type]} {c.minutes} 分钟</span></div>
              <div><b>{c.title}</b><small>{c.summary}</small></div>
            </button>
          ))}
        </div>
      )}

      {tab === 'library' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <Input.Search style={{ width: 260 }} allowClear placeholder="搜：考试、睡眠、手机、助学金…" value={kw} onChange={(e) => setKw(e.target.value)} />
            {!kw.trim() && <Segmented value={channel} onChange={(v) => setChannel(v as ContentChannel)} options={CONTENT_CHANNELS.filter((c) => c !== 'teacher').map((c) => ({ value: c, label: CONTENT_CHANNEL_LABEL[c] }))} />}
          </div>
          {!kw.trim() && !!cols.data?.filter((c) => c.channel === channel).length && (
            <p className="muted" style={{ marginBottom: 14 }}>这个频道的专题：{cols.data.filter((c) => c.channel === channel).map((c) => `《${c.title}》${c.count} 篇`).join('、')}。学生在小程序“发现”里能看到。</p>
          )}
          {(kw.trim() ? found.data : feed.data) && list.length === 0 && <div className="sheet"><Empty title="没有找到" hint="换个词试试。" /></div>}
          <div className="tiles">
            {list.map((c) => (
              <button className="tile" key={c.id} onClick={() => setId(c.id)}>
                <Cover id={c.id} kind={c.channel} />
                <div className="meta-line"><span>{CONTENT_CHANNEL_LABEL[c.channel]}</span><span>{TYPE_LABEL[c.type]} {c.minutes} 分钟</span><span>{c.age_label}</span></div>
                <div><b>{c.title}</b><small>{c.summary}</small></div>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'ai' && (
        <div className="cols c-2-1">
          <Sheet title="备课助手" aside="AI 生成，仅供参考，不做学生评价">
            <Input.Search value={q} onChange={(e) => setQ(e.target.value)} placeholder="比如：学生和爸妈吵架了，班会可以怎么聊" enterButton="问一问" loading={ask.isPending} onSearch={send} />
            {log.length === 0 && <Empty title="问一个备课或沟通上的问题" hint="回答来自平台审核过的内容，会告诉你出处。不要输入学生的姓名和具体情况。" />}
            {log.map((x, i) => (
              <div key={i} style={{ marginTop: 18 }}>
                <b>{x.q}</b>
                <p style={{ whiteSpace: 'pre-wrap', marginTop: 4 }} className="muted">{x.a.answer}</p>
                {x.a.sources.length > 0 && <div className="meta-line" style={{ marginTop: 6 }}>来源：{x.a.sources.map((s) => <button key={s.title} className="link-btn" style={{ fontWeight: 400, fontSize: 12 }} onClick={() => s.content_id && setId(s.content_id)}>《{s.title}》</button>)}</div>}
              </div>
            ))}
          </Sheet>
          <Sheet title="可以这样问">
            {ASK.map((a) => <div key={a} className="script" style={{ cursor: 'pointer' }} onClick={() => send(a)}>{a}</div>)}
          </Sheet>
        </div>
      )}
      <ContentDrawer id={id} onClose={() => setId(null)} onOpen={setId} />
    </>
  );
}
