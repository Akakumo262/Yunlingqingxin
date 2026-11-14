import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Image, ScrollView, Text, View } from '@tarojs/components';
import { CONTENT_CHANNEL_LABEL, DISCOVER_KIND_LABEL, DISCOVER_KINDS, STUDENT_STAGE_LABEL, CareerCard, ContentCard, ContentChannel, DiscoverKind, Page, Routes, StudentStage } from '@yunling/contracts';
import { api, fail, session } from '@/services/api';
import { playIcon } from '@/components/icons';
import { ContentRow, TONE, openContent } from '@/components/ContentRow';

const CHANNELS: ContentChannel[] = ['psychology', 'learning', 'career', 'policy', 'culture', 'five_edu', 'role_model'];
const STAGES: StudentStage[] = ['middle_school', 'high_school', 'vocational', 'university'];
const CAREER_KIND = { job: '职业', industry: '行业', major: '专业', person: '人物' } as const;
const mmss = (s = 0) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const top = () => (Taro.getSystemInfoSync().statusBarHeight || 0) + 28;

/** P-26 内容频道 + P-28 生涯卡。有尽头的列表，不做无限下滑。 */
export default function Discover(_: { go: (tab: string) => void }) {
  const [channel, setChannel] = useState<ContentChannel | ''>('');
  const [kind, setKind] = useState<DiscoverKind | 'all'>('all');
  const [stage, setStage] = useState<StudentStage>(session.me?.student_stage ?? 'middle_school');
  const [items, setItems] = useState<ContentCard[]>([]);
  const [cards, setCards] = useState<CareerCard[]>([]);

  useEffect(() => void api<Page<ContentCard>>(Routes.contentFeed, { query: { channel, limit: 100 } }).then((p) => setItems(p.items.filter((c) => {
    if (['parent', 'teacher'].includes(c.channel)) return false;
    const stages = c.audience_stages;
    const stageMatch = !stages?.length || stages.includes('all') || stages.includes(stage);
    const kindMatch = kind === 'all' || (c.discover_kind ?? 'general') === kind;
    return stageMatch && kindMatch;
  }))).catch(fail), [channel, kind, stage]);
  useEffect(() => void api<CareerCard[]>(Routes.careerCards).then(setCards).catch(fail), []);

  const lead = items.find((c) => c.type === 'video') ?? items[0];
  const rest = items.filter((c) => c !== lead);

  return (
    <View className="page page--bar" style={{ paddingTop: `${top()}px` }}>
      <View className="h1">发现</View>
      <View className="muted">按你的学习阶段筛选 AI 资讯、竞赛和志愿机会；每条内容都写明来源。</View>

      <View className="section-title" style={{ marginTop: '24px' }}><Text className="h2">推荐给谁</Text><Text className="faint">当前：{STUDENT_STAGE_LABEL[stage]}</Text></View>
      <ScrollView scrollX className="hscroll">
        {STAGES.map((s) => <Text key={s} className={`chip${stage === s ? ' chip--on' : ''}`} onClick={() => setStage(s)}>{STUDENT_STAGE_LABEL[s]}</Text>)}
      </ScrollView>

      <ScrollView scrollX className="hscroll" style={{ marginTop: '8px' }}>
        <Text className={`chip${kind === 'all' ? ' chip--on' : ''}`} onClick={() => setKind('all')}>全部资讯</Text>
        {DISCOVER_KINDS.filter((k) => k !== 'general').map((k) => <Text key={k} className={`chip${kind === k ? ' chip--on' : ''}`} onClick={() => setKind(k)}>{DISCOVER_KIND_LABEL[k]}</Text>)}
      </ScrollView>

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

      {(channel === '' || channel === 'career') && kind === 'all' && cards.length > 0 && (
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
          <View className="section-title"><Text className="h2">{kind !== 'all' ? DISCOVER_KIND_LABEL[kind] : channel ? CONTENT_CHANNEL_LABEL[channel] : '都看看'}</Text><Text className="faint">来源与核验状态</Text></View>
          <View className="card">{rest.map((c) => <ContentRow key={c.id} c={c} />)}</View>
        </>
      )}
      {items.length === 0 && <View className="card faint" style={{ marginTop: '24px' }}>暂时没有匹配的资讯。可以换一个学习阶段或分类再看看。</View>}
      <View className="faint" style={{ textAlign: 'center', marginTop: '20px' }}>外部资讯会跳转到原发布页面；报名和截止时间以原页面为准。</View>
    </View>
  );
}
