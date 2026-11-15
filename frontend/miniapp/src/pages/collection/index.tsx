import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View } from '@tarojs/components';
import { Collection, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { ContentRow, Cover } from '@/components/kit';

/** 专题：把相关的内容放在一起，按顺序看 */
export default function CollectionPage() {
  const [c, setC] = useState<Collection | null>(null);
  useLoad((q) => void api<Collection>(Routes.collectionGet, { params: { id: q.id ?? '' } }).then((d) => (setC(d), Taro.setNavigationBarTitle({ title: d.title }))).catch(fail));
  if (!c) return <View className="page" />;
  const seen = c.items?.filter((i) => i.completed).length ?? 0;

  return (
    <View>
      <Cover id={c.id} kind={c.channel} className="cover--hero" />
      <View className="page" style={{ minHeight: 'auto' }}>
        <View className="h1">{c.title}</View>
        <View className="muted mt4">{c.intro}</View>
        <View className="faint mt8">共 {c.count} 篇，你看过 {seen} 篇</View>
        <View className="card mt16">{c.items?.map((i) => <ContentRow key={i.id} c={i} />)}</View>
      </View>
    </View>
  );
}
