import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Image, View } from '@tarojs/components';
import { CareerCard, Routes, coverUri } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { Cover, Section, go, goTab } from '@/components/kit';

const KIND = { job: '职业卡', industry: '行业卡', major: '专业卡', person: '人物卡' } as const;
const NOTE = { job: '不构成就业承诺。', industry: '数据会变，请留意更新时间。', major: '以学校当年的招生简章为准。', person: '已获本人授权，使用化名。' } as const;

/** P-28 生涯卡详情：打破信息差。每张卡写明来源和更新时间，看完可以接着问助手。 */
export default function Career() {
  const [c, setC] = useState<CareerCard | null>(null);
  const [others, setOthers] = useState<CareerCard[]>([]);
  useLoad((q) => void api<CareerCard[]>(Routes.careerCards).then((all) => {
    const card = all.find((x) => x.id === q.id) ?? null;
    setC(card);
    if (card) {
      Taro.setNavigationBarTitle({ title: KIND[card.type] });
      setOthers(all.filter((x) => x.type === card.type && x.id !== card.id).sort((a, b) => Number(b.region === card.region) - Number(a.region === card.region)).slice(0, 4));
    }
  }).catch(fail));
  if (!c) return <View className="page" />;

  return (
    <View>
      <Cover id={c.id} kind={c.type} className="cover--hero" />
      <View className="page" style={{ minHeight: 'auto' }}>
        <View className="faint">{KIND[c.type]}　{c.region}</View>
        <View className="h1">{c.title}</View>
        <View className="muted mt4">{c.tagline}</View>
        {c.sections.map((s, i) => (
          <View key={s.heading} className={i === 0 ? 'card mt16' : 'card mt12'}>
            <View className="bold">{s.heading}</View>
            <View className="mt4" style={{ lineHeight: 1.85 }}>{s.text}</View>
          </View>
        ))}
        <View className="btn mt16" onClick={() => goTab('ai', `想了解“${c.title}”，我现在可以准备什么？`)}>问问助手：我现在可以准备什么</View>
        <View className="source faint mt16">
          <View>来源：{c.source}</View>
          <View>更新于 {c.updated_at}。{NOTE[c.type]}</View>
        </View>

        {others.length > 0 && (
          <>
            <Section title="再看看别的" />
            <View className="tiles">
              {others.map((o) => (
                <View key={o.id} className="tile" onClick={() => go('career', { id: o.id })}>
                  <Image className="cover cover--tile" src={coverUri(o.id, o.type)} mode="aspectFill" />
                  <View className="tile__body"><View className="tile__title">{o.title}</View><View className="tile__sub clamp2">{o.tagline}</View></View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}
