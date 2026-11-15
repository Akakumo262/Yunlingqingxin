import { useState } from 'react';
import { useDidShow } from '@tarojs/taro';
import { View } from '@tarojs/components';
import { ActivityCard, ContentCard, LearningPlan, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { ActivityRow, ContentRow, Empty, Row, Seg, go, goTab } from '@/components/kit';

/** 我的收藏、我的活动、我的计划：做过的和想做的都在这里 */
export default function Favorites() {
  const [tab, setTab] = useState<'fav' | 'act' | 'plan'>('fav');
  const [favs, setFavs] = useState<ContentCard[]>([]);
  const [acts, setActs] = useState<ActivityCard[]>([]);
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  useDidShow(() => {
    api<ContentCard[]>(Routes.favoriteList).then(setFavs).catch(fail);
    api<ActivityCard[]>(Routes.activityList, { query: { mine: 1 } }).then(setActs).catch(fail);
    api<LearningPlan[]>(Routes.planList).then((p) => setPlans(p.filter((x) => x.joined))).catch(fail);
  });

  return (
    <View className="page">
      <Seg value={tab} onChange={setTab} options={[['fav', `收藏 ${favs.length}`], ['act', `活动 ${acts.length}`], ['plan', `计划 ${plans.length}`]]} />
      <View className="mt16">
        {tab === 'fav' && (favs.length ? <View className="card">{favs.map((c) => <ContentRow key={c.id} c={c} />)}</View> : <><Empty title="还没有收藏" hint="看到想留着的内容，点“收藏”。" kind="learning" /><View className="btn btn--ghost" onClick={() => goTab('discover')}>去发现看看</View></>)}
        {tab === 'act' && (acts.length ? acts.map((a) => <ActivityRow key={a.id} a={a} />) : <><Empty title="还没有报名活动" kind="labor" /><View className="btn btn--ghost" onClick={() => goTab('discover:act')}>看看最近的活动</View></>)}
        {tab === 'plan' && (plans.length ? <View className="card">{plans.map((p) => <Row key={p.id} iconName="flagRoute" title={p.title} hint={`做到第 ${p.done_days.length} 天，共 ${p.days} 天`} onClick={() => go('plan', { id: p.id })} />)}</View> : <><Empty title="还没有加入计划" kind="career" /><View className="btn btn--ghost" onClick={() => goTab('discover:plan')}>挑一个小计划</View></>)}
      </View>
    </View>
  );
}
