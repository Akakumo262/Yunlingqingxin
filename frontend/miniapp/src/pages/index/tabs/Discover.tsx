import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Image, ScrollView, Text, View } from '@tarojs/components';
import { CONTENT_CHANNEL_LABEL, CareerCard, ContentCard, ContentChannel, Page, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { playIcon } from '@/components/icons';
import { ContentRow, TONE, openContent } from '@/components/ContentRow';

const CHANNELS: ContentChannel[] = ['psychology', 'learning', 'career', 'policy', 'culture', 'five_edu', 'role_model'];
const CAREER_KIND = { job: '职业', industry: '行业', major: '专业', person: '人物' } as const;
const mmss = (s = 0) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const top = () => (Taro.getSystemInfoSync().statusBarHeight || 0) + 28;

/** P-26 内容频道 + P-28 生涯卡。有尽头的列表，不做无限下滑。 */
export default function Discover(_: { go: (tab: string) => void }) {
  const [channel, setChannel] = useState<ContentChannel | ''>('');
  const [items, setItems] = useState<ContentCard[]>([]);
  const [cards, setCards] = useState<CareerCard[]>([]);

  useEffect(() => void api<Page<ContentCard>>(Routes.contentFeed, { query: { channel, limit: 30 } }).then((p) => setItems(p.items.filter((c) => !['parent', 'teacher'].includes(c.channel)))).catch(fail), [channel]);
  useEffect(() => void api<CareerCard[]>(Routes.careerCards).then(setCards).catch(fail), []);

  const lead = items.find((c) => c.type === 'video') ?? items[0];
  const rest = items.filter((c) => c !== lead);

  return (
    <View className="page page--bar" style={{ paddingTop: `${top()}px` }}>
      <View className="h1">发现</View>
      <View className="muted">每条内容都写明了是谁做的、从哪来。</View>

      <ScrollView scrollX className="hscroll" style={{ marginTop: '16px' }}>
        <Text className={`chip${channel === '' ? ' chip--on' : ''}`} onClick={() => setChannel('')}>全部</Text>
        {CHANNELS.map((c) => <Text key={c} className={`chip${channel === c ? ' chip--on' : ''}`} onClick={() => setChannel(c)}>{CONTENT_CHANNEL_LABEL[c]}</Text>)}
      </ScrollView>

      {lead && (
        <View style={{ marginTop: '10px' }} onClick={() => openContent(lead.id)}>
          <View className={`poster ${TONE[lead.channel]}`}>
            <View className="ridge ridge--mid" /><View className="ridge ridge--near" />
            <View className="poster__tag">{CONTENT_CHANNEL_LABEL[lead.channel]}</View>
            {lead.type !== 'article' && <View className="poster__play"><Image src={playIcon()} /></View>}
            {lead.duration && <View className="poster__len num">{mmss(lead.duration)}</View>}
          </View>
          <View className="h2" style={{ marginTop: '10px', lineHeight: 1.4 }}>{lead.title}</View>
          <View className="muted">{lead.summary}</View>
        </View>
      )}

      {(channel === '' || channel === 'career') && cards.length > 0 && (
        <>
          <View className="section-title"><Text className="h2">我想去哪</Text><Text className="faint">生涯卡，都标了来源</Text></View>
          <ScrollView scrollX className="hscroll">
            {cards.map((c) => (
              <View key={c.id} className={`career career--${c.type}`} onClick={() => Taro.navigateTo({ url: `/pages/career/index?id=${c.id}` })}>
                <View className="kind">{CAREER_KIND[c.type]}卡　{c.region}</View>
                <View className="name">{c.title}</View>
                <View className="tagline">{c.tagline}</View>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {rest.length > 0 && (
        <>
          <View className="section-title"><Text className="h2">{channel ? CONTENT_CHANNEL_LABEL[channel] : '都看看'}</Text></View>
          <View className="card">{rest.map((c) => <ContentRow key={c.id} c={c} />)}</View>
        </>
      )}
      <View className="faint" style={{ textAlign: 'center', marginTop: '20px' }}>就这些了。看了一会儿的话，起来走走。</View>
    </View>
  );
}
