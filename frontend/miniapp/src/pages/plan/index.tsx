import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { LearningPlan, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { Cover, Section, go } from '@/components/kit';
import { px } from '@/utils/ui';

/** 学习计划：每天一小步。漏一天不清零，随时可以退出。 */
export default function Plan() {
  const [p, setP] = useState<LearningPlan | null>(null);
  useLoad((q) => void api<LearningPlan[]>(Routes.planList).then((all) => {
    const plan = all.find((x) => x.id === q.id) ?? null;
    setP(plan);
    if (plan) Taro.setNavigationBarTitle({ title: plan.title });
  }).catch(fail));
  if (!p) return <View className="page" />;

  const set = (r: Promise<LearningPlan>) => r.then(setP).catch(fail);
  const join = () => set(api<LearningPlan>(Routes.planJoin, { params: { id: p.id } }));
  const quit = () => Taro.showModal({ title: '退出这个计划？', content: '已经做过的不会消失，想回来随时可以再加入。', confirmText: '退出', cancelText: '继续做' }).then((r) => { if (r.confirm) set(api<LearningPlan>(Routes.planQuit, { params: { id: p.id } })); });
  const done = (day: number) => set(api<LearningPlan>(Routes.planStepDone, { params: { id: p.id, day: String(day) } }));
  const next = p.steps.find((s) => !p.done_days.includes(s.day))?.day;
  const finished = p.joined && p.done_days.length === p.days;

  return (
    <View>
      <Cover id={p.id} kind={p.channel} className="cover--hero" />
      <View className="page" style={{ minHeight: 'auto' }}>
        <View className="h1">{p.title}</View>
        <View className="muted mt4">{p.intro}</View>
        <View className="mt8"><Text className="tag">{p.days} 天</Text><Text className="tag">每天 {p.minutes_per_day} 分钟</Text><Text className="faint">{p.joined_count} 人在做</Text></View>

        {p.joined ? (
          <View className="card mt16">
            <View className="bold">{finished ? '全部做完了。成长护照里多了一枚印记。' : `做到第 ${p.done_days.length} 天，共 ${p.days} 天`}</View>
            <View className="days mt8">{p.steps.map((s) => <View key={s.day} className={`day${p.done_days.includes(s.day) ? ' day--done' : s.day === next ? ' day--now' : ''}`}>{s.day}</View>)}</View>
          </View>
        ) : (
          <View className="btn mt16" onClick={join}>加入这个计划</View>
        )}

        <Section title="每天做什么" />
        <View className="card">
          <View className="flow">
            {p.steps.map((s) => {
              const isDone = p.done_days.includes(s.day), isNow = p.joined && s.day === next;
              return (
                <View key={s.day} className={`flow__step${isDone ? ' flow__step--done' : isNow ? ' flow__step--now' : ''}`}>
                  <View className="faint">第 {s.day} 天</View>
                  <View className="bold">{s.title}</View>
                  <View className="muted">{s.action}</View>
                  {(s.content_id || isNow) && (
                    <View className="mt8">
                      {s.content_id && <Text className="chip" onClick={() => go('content', { id: s.content_id })}>看这篇内容</Text>}
                      {isNow && <Text className="chip chip--on" onClick={() => done(s.day)}>今天的做完了</Text>}
                      {p.joined && !isDone && !isNow && <Text className="chip" onClick={() => done(s.day)}>补上这一天</Text>}
                    </View>
                  )}
                  {p.joined && !s.content_id && !isNow && !isDone && <View className="mt8"><Text className="chip" onClick={() => done(s.day)}>补上这一天</Text></View>}
                </View>
              );
            })}
          </View>
        </View>
        {p.joined && !finished && <View className="faint center mt16" style={{ paddingBottom: px('20px') }} onClick={quit}>不想做了，退出计划</View>}
      </View>
    </View>
  );
}
