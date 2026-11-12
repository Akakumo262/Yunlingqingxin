import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View } from '@tarojs/components';
import { CareerCard, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';

const KIND = { job: '职业卡', industry: '行业卡', major: '专业卡', person: '人物卡' } as const;
const NOTE = { job: '不构成就业承诺。', industry: '数据会变，请留意更新时间。', major: '以学校当年的招生简章为准。', person: '已获本人授权，使用化名。' } as const;

/** P-28 生涯卡详情：打破信息差。每张卡写明来源和更新时间。 */
export default function Career() {
  const [c, setC] = useState<CareerCard | null>(null);
  useLoad((q) => void api<CareerCard[]>(Routes.careerCards).then((all) => setC(all.find((x) => x.id === q.id) ?? null)).catch(fail));
  if (!c) return <View className="page" />;

  return (
    <View className="page">
      <View className={`career career--${c.type}`} style={{ display: 'block', width: 'auto', height: '180px', marginRight: 0 }}>
        <View className="kind">{KIND[c.type]}　{c.region}</View>
        <View className="name" style={{ fontSize: '30px' }}>{c.title}</View>
        <View className="tagline">{c.tagline}</View>
      </View>
      {c.sections.map((s) => (
        <View key={s.heading}>
          <View className="section-title"><View className="h2">{s.heading}</View></View>
          <View className="prose" style={{ fontSize: '15px' }}>{s.text}</View>
        </View>
      ))}
      <View className="source faint" style={{ marginTop: '24px' }}>
        <View>来源：{c.source}</View>
        <View>更新于 {c.updated_at}。{NOTE[c.type]}</View>
      </View>
      <View className="btn btn--ghost" style={{ marginTop: '20px' }} onClick={() => Taro.reLaunch({ url: `/pages/index/index?tab=ai&q=${encodeURIComponent(`想了解“${c.title}”，我现在可以准备什么？`)}` })}>问问助手：我现在可以准备什么</View>
    </View>
  );
}
