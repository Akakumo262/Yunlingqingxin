import { useState } from 'react';
import { Input, Segmented, Select } from 'antd';
import { CONTENT_CHANNELS, CONTENT_CHANNEL_LABEL, ContentCard, ContentChannel, ContentStatus, Page, Routes } from '@yunling/contracts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import ContentDrawer, { TYPE_LABEL } from '@/components/ContentDrawer';
import { Cover, Empty, PageHead, Stat } from '@/components/ui';

const STATUS: Partial<Record<ContentStatus, { text: string; cls: string }>> = {
  published: { text: '已上架', cls: 'ok' }, ai_blocked: { text: '机审拦截', cls: 'stop' }, team_review: { text: '待二审', cls: 'wait' }, tri_party_review: { text: '待三审', cls: 'wait' },
  rejected: { text: '已退回', cls: 'stop' }, offline: { text: '已下架', cls: 'off' }, draft: { text: '草稿', cls: 'off' },
};

/** 内容库：平台上所有内容的总账。按频道看结构是否均衡，按状态看哪些还没上架。 */
export default function Library() {
  const [channel, setChannel] = useState<ContentChannel | ''>('');
  const [status, setStatus] = useState<string>('');
  const [q, setQ] = useState('');
  const [id, setId] = useState<string | null>(null);
  // 接口一页最多 100 条，这里沿着 next_cursor 把整本总账取完
  const all = useQuery({
    queryKey: ['library'],
    queryFn: async () => {
      const out: ContentCard[] = [];
      for (let cursor: string | null | undefined; cursor !== null;) {
        const p: Page<ContentCard> = await api<Page<ContentCard>>(Routes.contentAdminList, { query: { limit: 100, cursor: cursor ?? undefined } });
        out.push(...p.items);
        cursor = p.next_cursor;
      }
      return out;
    },
  });
  const items = all.data ?? [];
  const list = items.filter((c) => (!channel || c.channel === channel) && (!status || c.status === status) && (!q.trim() || (c.title + c.summary + (c.tags ?? []).join('')).includes(q.trim())));
  const count = (ch: ContentChannel) => items.filter((c) => c.channel === ch).length;

  return (
    <>
      <PageHead title="内容库" sub="每条内容都有来源、作者和授权，上架前过三审。政策类内容上线前需由对口部门核对口径。">
        <Input.Search style={{ width: 220 }} allowClear placeholder="搜标题、标签" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select style={{ width: 130 }} value={status} onChange={setStatus} options={[{ value: '', label: '全部状态' }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s!.text }))]} />
      </PageHead>
      <div className="cols c-4" style={{ marginBottom: 20 }}>
        <Stat lead label="内容总数" value={items.length} note="条" />
        <Stat label="已上架" value={items.filter((c) => c.status === 'published').length} note="条" tone="ok" />
        <Stat label="在审" value={items.filter((c) => ['team_review', 'tri_party_review', 'ai_blocked'].includes(c.status)).length} note="条" />
        <Stat label="音视频" value={items.filter((c) => c.type !== 'article').length} note="条" />
      </div>
      <Segmented style={{ marginBottom: 18 }} value={channel} onChange={(v) => setChannel(v as ContentChannel | '')}
        options={[{ value: '', label: `全部 ${items.length}` }, ...CONTENT_CHANNELS.map((c) => ({ value: c, label: `${CONTENT_CHANNEL_LABEL[c]} ${count(c)}` }))]} />
      {all.data && list.length === 0 && <div className="sheet"><Empty title="没有符合条件的内容" /></div>}
      <div className="tiles">
        {list.map((c) => (
          <button className="tile" key={c.id} onClick={() => setId(c.id)}>
            <Cover id={c.id} kind={c.channel} />
            <div className="meta-line"><span>{CONTENT_CHANNEL_LABEL[c.channel]}</span><span>{TYPE_LABEL[c.type]} {c.minutes} 分钟</span><span className={`pill ${STATUS[c.status]?.cls ?? ''}`} style={{ marginLeft: 'auto' }}>{STATUS[c.status]?.text ?? c.status}</span></div>
            <div><b>{c.title}</b><small>{c.summary}</small></div>
            <div className="meta-line"><span>{c.source}</span><span>{c.age_label}</span></div>
          </button>
        ))}
      </div>
      <ContentDrawer id={id} onClose={() => setId(null)} onOpen={setId} />
    </>
  );
}
