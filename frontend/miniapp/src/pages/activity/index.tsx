import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Image, Input, Text, Textarea, View } from '@tarojs/components';
import { ActivityDetail, FIVE_EDU_NAME, FiveEdu, ORGANIZER_TYPE_LABEL, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { icon } from '@/components/icons';
import { Cover, EduBadge, Section, StampToast, goTab, whenText } from '@/components/kit';
import { px } from '@/utils/ui';

const STEPS = ['报名', '到场签到', '写两句话', '记进成长护照'];
const AT = { none: 0, signed: 1, checked_in: 2, reflected: 4 } as const;

/** 五育活动详情：报名 → 现场签到 → 写下反思 → 成为成长护照里的一条记录 */
export default function Activity() {
  const [a, setA] = useState<ActivityDetail | null>(null);
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const [stamp, setStamp] = useState<FiveEdu | null>(null);
  useLoad((q) => void api<ActivityDetail>(Routes.activityGet, { params: { id: q.id ?? '' } }).then(setA).catch(fail));
  if (!a) return <View className="page" />;

  const run = (p: Promise<ActivityDetail>, done?: string) => p.then((d) => { setA(d); if (done) Taro.showToast({ title: done, icon: 'none' }); }).catch(fail);
  const params = { id: a.id };
  const signup = () => run(api<ActivityDetail>(Routes.activitySignup, { params }), '报名成功，到时候见');
  const cancel = () => Taro.showModal({ title: '取消报名？', content: '名额会留给别的同学。', confirmText: '取消报名', cancelText: '再想想' }).then((r) => { if (r.confirm) run(api<ActivityDetail>(Routes.activityCancel, { params })); });
  const checkIn = () => run(api<ActivityDetail>(Routes.activityCheckIn, { params, body: { code } }), '签到成功');
  const reflect = () => api<ActivityDetail>(Routes.activityReflect, { params, body: { text: text.trim() } }).then((d) => (setA(d), setStamp(a.edu), setTimeout(() => setStamp(null), 1800))).catch(fail);

  const my = a.my_status ?? 'none', at = AT[my], ratio = Math.min(1, a.signed_count / a.capacity);
  return (
    <View>
      <Cover id={a.id} kind={a.edu} className="cover--hero" />
      <View className="page" style={{ minHeight: 'auto', paddingBottom: px('40px') }}>
        <View className="row"><EduBadge edu={a.edu} /><Text className="faint">{FIVE_EDU_NAME[a.edu]}　{ORGANIZER_TYPE_LABEL[a.organizer_type]}组织</Text></View>
        <View className="h1 mt4" style={{ fontSize: px('25px') }}>{a.title}</View>

        <View className="card mt16">
          <View className="row"><Image className="icon" src={icon('clock', '#1F5FD1')} style={{ marginRight: px('10px') }} /><Text className="grow">{whenText(a)}</Text></View>
          <View className="row mt8"><Image className="icon" src={icon('pin', '#1F5FD1')} style={{ marginRight: px('10px') }} /><Text className="grow">{a.place}</Text></View>
          <View className="row mt8"><Image className="icon" src={icon('people', '#1F5FD1')} style={{ marginRight: px('10px') }} /><Text className="grow">{a.organizer}　面向{a.audience}</Text></View>
          <View className="faint mt8">已报名 {a.signed_count} / {a.capacity} 人</View>
          <View className="bar"><View className={`bar__fill${ratio >= 1 ? ' bar__fill--full' : ''}`} style={{ width: `${ratio * 100}%` }} /></View>
        </View>

        {/* 我走到哪一步了 */}
        <View className="card mt12">
          <View className="days">
            {STEPS.map((s, i) => <View key={s} className="row" style={{ marginRight: px('10px') }}><View className={`day${i < at ? ' day--done' : i === at ? ' day--now' : ''}`}>{i + 1}</View><Text className={i === at ? 'bold' : 'faint'}>{s}</Text></View>)}
          </View>

          {my === 'none' && a.status === 'open' && <View className="btn mt8" onClick={signup}>我要报名</View>}
          {my === 'none' && a.status === 'ongoing' && <View className="btn mt8" onClick={signup}>活动进行中，现在加入</View>}
          {my === 'none' && a.status === 'full' && <View className="notice mt8">名额满了。过几天再来看看，有人取消就会空出来。</View>}
          {my === 'none' && a.status === 'ended' && <View className="muted mt8">这场活动已经结束了。</View>}

          {my === 'signed' && (
            <View className="mt8">
              <View className="muted">到了现场，老师会念出四位签到码。</View>
              <Input className="field code mt8" type="number" maxlength={4} value={code} placeholder="· · · ·" onInput={(e) => setCode(e.detail.value)} />
              <View className={`btn mt12${code.length === 4 ? '' : ' btn--off'}`} onClick={() => code.length === 4 && checkIn()}>签到</View>
              <View className="faint center mt12" onClick={cancel}>去不了了，取消报名</View>
            </View>
          )}

          {my === 'checked_in' && (
            <View className="mt8">
              <View className="bold">写两句话，这次经历就属于你了</View>
              <View className="faint">做了什么、看到了什么、想到了什么。写真实的就好，搞砸的事也值得记。</View>
              <Textarea className="area mt8" value={text} maxlength={300} placeholder="比如：翻地比想象的累，但种下去的时候很踏实。" onInput={(e) => setText(e.detail.value)} />
              <View className={`btn mt12${text.trim() ? '' : ' btn--off'}`} onClick={() => text.trim() && reflect()}>记进成长护照</View>
            </View>
          )}

          {my === 'reflected' && (
            <View className="mt8">
              <View className="quote" style={{ marginTop: 0 }}><View>{a.my_reflection}</View><View className="faint">我写的</View></View>
              <View className="btn btn--ghost mt12" onClick={() => goTab('me')}>去成长护照里看看</View>
            </View>
          )}
        </View>

        <Section title="做什么" />
        <View className="card" style={{ lineHeight: 1.85 }}>{a.intro}</View>

        {a.schedule.length > 0 && (
          <>
            <Section title="怎么安排" />
            <View className="card"><View className="flow">{a.schedule.map((s) => <View key={s} className="flow__step">{s}</View>)}</View></View>
          </>
        )}

        {a.bring.length > 0 && <><Section title="要带什么" /><View>{a.bring.map((b) => <Text key={b} className="chip">{b}</Text>)}</View></>}

        <View className="notice mt16"><Text className="bold">安全　</Text>{a.safety}</View>
      </View>
      <StampToast edu={stamp} />
    </View>
  );
}
