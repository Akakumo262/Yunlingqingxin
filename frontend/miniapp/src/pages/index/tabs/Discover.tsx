import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from '@tarojs/components';
import {
  ActivityCard, CONTENT_CHANNEL_LABEL, CareerCard, CareerCardType, Collection, ContentCard, ContentChannel, FIVE_EDU, FIVE_EDU_NAME, FiveEdu, LearningPlan,
  Page, Routes, coverUri,
} from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { icon, playIcon } from '@/components/icons';
import { ActivityRow, Chips, ContentRow, Cover, Empty, Section, Seg, go, mmss, openContent } from '@/components/kit';
import { px, safeTop } from '@/utils/ui';

type Tab = 'read' | 'career' | 'act' | 'plan';
const CHANNELS: ContentChannel[] = ['psychology', 'learning', 'career', 'policy', 'culture', 'five_edu', 'role_model'];
const CAREER_KIND: Record<CareerCardType, string> = { job: '职业', industry: '行业', major: '专业', person: '人物' };
const PAGE = 10;

/** P-26 内容频道、P-28 生涯卡、五育活动、学习计划。四个子栏目共用一个搜索入口。 */
export default function Discover({ initial }: { initial?: string }) {
  const [tab, setTab] = useState<Tab>((initial as Tab) || 'read');
  return (
    <View className="page page--bar" style={{ paddingTop: `${safeTop()}px` }}>
      <View className="h1">发现</View>
      <View className="searchbar mt12" onClick={() => go('search')}>
        <Image src={icon('search', '#8590A8')} />
        <Text>搜内容、职业、活动</Text>
      </View>
      <View className="mt12"><Seg value={tab} onChange={setTab} options={[['read', '看看'], ['career', '生涯'], ['act', '活动'], ['plan', '计划']]} /></View>
      {tab === 'read' && <Read />}
      {tab === 'career' && <Careers />}
      {tab === 'act' && <Activities />}
      {tab === 'plan' && <Plans />}
    </View>
  );
}

function Read() {
  const [channel, setChannel] = useState<ContentChannel | ''>('');
  const [items, setItems] = useState<ContentCard[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [cols, setCols] = useState<Collection[]>([]);

  const load = (cursor?: string) =>
    api<Page<ContentCard>>(Routes.contentFeed, { query: { channel, limit: PAGE, cursor } }).then((p) => (setItems((old) => (cursor ? [...old, ...p.items] : p.items)), setNext(p.next_cursor))).catch(fail);
  useEffect(() => void load(), [channel]);
  useEffect(() => void api<Collection[]>(Routes.collectionList).then(setCols).catch(fail), []);

  const lead = items[0], rest = items.slice(1);
  return (
    <>
      {channel === '' && cols.length > 0 && (
        <>
          <Section title="专题" aside="把相关的内容放在一起" />
          <ScrollView scrollX className="hscroll">
            {cols.map((c) => (
              <View key={c.id} className="col-card" onClick={() => go('collection', { id: c.id })}>
                <Image className="cover cover--tile" src={coverUri(c.id, c.channel)} mode="aspectFill" />
                <View className="col-card__body">
                  <View className="bold" style={{ fontSize: px('16px') }}>{c.title}</View>
                  <View className="faint clamp2 mt4">{c.intro}</View>
                  <View className="mt4"><Text className="tag">{c.count} 篇</Text></View>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <ScrollView scrollX className="hscroll mt16">
        <Text className={`chip${channel === '' ? ' chip--on' : ''}`} onClick={() => setChannel('')}>全部</Text>
        {CHANNELS.map((c) => <Text key={c} className={`chip${channel === c ? ' chip--on' : ''}`} onClick={() => setChannel(c)}>{CONTENT_CHANNEL_LABEL[c]}</Text>)}
      </ScrollView>

      {lead && (
        <View className="mt8" onClick={() => openContent(lead.id)}>
          <Cover id={lead.id} kind={lead.channel}>
            <View className="poster__tag">{CONTENT_CHANNEL_LABEL[lead.channel]}</View>
            {lead.type !== 'article' && <View className="poster__play"><Image src={playIcon()} /></View>}
            {!!lead.duration && <View className="poster__len num">{mmss(lead.duration)}</View>}
          </Cover>
          <View className="h2 mt8" style={{ lineHeight: 1.4 }}>{lead.title}</View>
          <View className="muted">{lead.summary}</View>
        </View>
      )}
      {rest.length > 0 && <View className="card mt12">{rest.map((c) => <ContentRow key={c.id} c={c} />)}</View>}
      {next ? <View className="btn btn--ghost mt12" onClick={() => load(next)}>再看十条</View> : <View className="faint center mt16">就这些了。看了一会儿的话，起来走走。</View>}
    </>
  );
}

function Careers() {
  const [type, setType] = useState<CareerCardType | ''>('');
  const [region, setRegion] = useState('');
  const [cards, setCards] = useState<CareerCard[]>([]);
  useEffect(() => void api<CareerCard[]>(Routes.careerCards, { query: { type, region } }).then(setCards).catch(fail), [type, region]);

  return (
    <>
      <View className="card card--indigo mt12">
        <View className="bold" style={{ fontSize: px('17px') }}>不用现在就决定以后干什么</View>
        <View style={{ opacity: 0.8, fontSize: px('13px'), marginTop: px('4px') }}>先看看有哪些可能。每张卡都写了来源和更新时间，看完可以问助手“我现在能准备什么”。</View>
      </View>
      <View className="mt12"><Chips value={type} onChange={setType} options={[['', '全部'], ['job', '职业'], ['industry', '行业'], ['major', '专业'], ['person', '过来人']]} /></View>
      {(type === 'job' || type === 'industry' || type === '') && <Chips value={region} onChange={setRegion} options={[['', '不限地方'], ['玉溪', '玉溪'], ['云南', '云南'], ['全国', '全国']]} />}
      <View className="faint mt4">共 {cards.length} 张</View>
      <View className="tiles mt8">
        {cards.map((c) => (
          <View key={c.id} className="tile" onClick={() => go('career', { id: c.id })}>
            <Image className="cover cover--tile" src={coverUri(c.id, c.type)} mode="aspectFill" />
            <View className="tile__body">
              <View className="faint">{CAREER_KIND[c.type]}卡　{c.region}</View>
              <View className="tile__title">{c.title}</View>
              <View className="tile__sub clamp2">{c.tagline}</View>
            </View>
          </View>
        ))}
      </View>
      {cards.length === 0 && <Empty title="这个筛选下还没有卡片" hint="换一个地方或类型试试。" kind="career" />}
    </>
  );
}

function Activities() {
  const [edu, setEdu] = useState<FiveEdu | '' | 'mine'>('');
  const [list, setList] = useState<ActivityCard[]>([]);
  useEffect(() => void api<ActivityCard[]>(Routes.activityList, { query: edu === 'mine' ? { mine: 1 } : { edu } }).then(setList).catch(fail), [edu]);
  const open = list.filter((a) => a.status !== 'ended'), ended = list.filter((a) => a.status === 'ended');

  return (
    <>
      <View className="muted mt12">参加完写两句话，这次经历就会记进你的成长护照。不打分，不排名。</View>
      <View className="mt8"><Chips value={edu} onChange={setEdu} options={[['', '全部'], ['mine', '我报名的'], ...FIVE_EDU.map((e): [FiveEdu, string] => [e, FIVE_EDU_NAME[e]])]} /></View>
      <View className="mt8">{open.map((a) => <ActivityRow key={a.id} a={a} />)}</View>
      {open.length === 0 && <Empty title={edu === 'mine' ? '你还没有报名活动' : '这一类暂时没有活动'} hint="看看别的类型，或者过几天再来。" kind="labor" />}
      {ended.length > 0 && <><Section title="已经结束的" />{ended.map((a) => <ActivityRow key={a.id} a={a} />)}</>}
    </>
  );
}

function Plans() {
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  useEffect(() => void api<LearningPlan[]>(Routes.planList).then(setPlans).catch(fail), []);
  return (
    <>
      <View className="muted mt12">每天几分钟的小计划。漏一天不清零，想退出随时可以退。</View>
      <View className="mt8">
        {plans.map((p) => (
          <View key={p.id} className="card" style={{ marginBottom: px('10px'), padding: 0, overflow: 'hidden' }} onClick={() => go('plan', { id: p.id })}>
            <Image className="cover cover--tile" src={coverUri(p.id, p.channel)} mode="aspectFill" />
            <View style={{ padding: px('14px 16px 16px') }}>
              <View className="h2">{p.title}</View>
              <View className="muted">{p.intro}</View>
              <View className="mt8">
                <Text className="tag">{p.days} 天</Text><Text className="tag">每天 {p.minutes_per_day} 分钟</Text>
                {p.joined ? <Text className="tag tag--ok">做到第 {p.done_days.length} 天</Text> : <Text className="faint">{p.joined_count} 人在做</Text>}
              </View>
              {p.joined && <View className="bar"><View className="bar__fill" style={{ width: `${(p.done_days.length / p.days) * 100}%` }} /></View>}
            </View>
          </View>
        ))}
      </View>
    </>
  );
}
