import { useState } from 'react';
import { useLoad } from '@tarojs/taro';
import { Image, Input, Text, View } from '@tarojs/components';
import { Routes, SearchResult, coverUri } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { icon } from '@/components/icons';
import { ActivityRow, ContentRow, Empty, Section, go, goTab } from '@/components/kit';
import { px } from '@/utils/ui';

const KIND = { job: '职业', industry: '行业', major: '专业', person: '人物' } as const;

/** 搜索：内容、生涯卡、活动一起搜。不记录搜索词，不做“猜你想搜” */
export default function Search() {
  const [q, setQ] = useState('');
  const [r, setR] = useState<SearchResult | null>(null);
  const run = (text: string) => {
    setQ(text);
    api<SearchResult>(Routes.searchAll, { query: { q: text.trim() } }).then(setR).catch(fail);
  };
  useLoad((p) => run(p.q ? decodeURIComponent(p.q) : ''));
  const none = r && r.q && !r.contents.length && !r.careers.length && !r.activities.length;

  return (
    <View className="page">
      <View className="searchbar">
        <Image src={icon('search', '#8590A8')} />
        <Input className="grow" value={q} focus placeholder="搜内容、职业、活动" confirmType="search" onInput={(e) => setQ(e.detail.value)} onConfirm={() => run(q)} />
        {!!q && <Text className="link" onClick={() => run('')}>清空</Text>}
      </View>

      {r && !r.q && (
        <>
          <Section title="大家常搜" />
          <View>{r.hot.map((h) => <Text key={h} className="chip" onClick={() => run(h)}>{h}</Text>)}</View>
        </>
      )}

      {none && (
        <>
          <Empty title={`没有找到“${r.q}”`} hint="换个说法试试，或者直接问助手。" kind="learning" />
          <View className="btn btn--ghost" onClick={() => goTab('ai', r.q)}>问问助手</View>
        </>
      )}

      {!!r?.contents.length && <><Section title="内容" aside={`${r.contents.length} 条`} /><View className="card">{r.contents.map((c) => <ContentRow key={c.id} c={c} />)}</View></>}
      {!!r?.careers.length && (
        <>
          <Section title="生涯卡" />
          <View className="tiles">
            {r.careers.map((c) => (
              <View key={c.id} className="tile" onClick={() => go('career', { id: c.id })}>
                <Image className="cover cover--tile" src={coverUri(c.id, c.type)} mode="aspectFill" />
                <View className="tile__body"><View className="faint">{KIND[c.type]}卡</View><View className="tile__title">{c.title}</View><View className="tile__sub clamp2">{c.tagline}</View></View>
              </View>
            ))}
          </View>
        </>
      )}
      {!!r?.activities.length && <><Section title="活动" />{r.activities.map((a) => <ActivityRow key={a.id} a={a} />)}</>}
      {r && r.q && !none && <View className="btn btn--ghost mt16" style={{ marginBottom: px('20px') }} onClick={() => goTab('ai', r.q)}>没找到想要的？问问助手</View>}
    </View>
  );
}
