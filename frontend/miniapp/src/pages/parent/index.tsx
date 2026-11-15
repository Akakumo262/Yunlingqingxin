import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';
import { Announcement, GuardianSummary, Routes } from '@yunling/contracts';
import { api, fail, logout, session } from '@/services/api';
import { icon } from '@/components/icons';
import { ContentRow, Row, Section, go } from '@/components/kit';
import { px, safeTop } from '@/utils/ui';

/** P-11 家长端：每周一条摘要 + 一件三分钟的小事。没有分数、没有逐日记录。 */
export default function Parent() {
  const [s, setS] = useState<GuardianSummary | null>(null);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const load = () => {
    api<GuardianSummary>(Routes.guardianSummary).then(setS).catch(fail);
    api<Announcement[]>(Routes.announcementList).then(setAnns).catch(() => undefined);
  };
  useDidShow(() => {
    if (!session.me) return void Taro.reLaunch({ url: '/pages/login/index' });
    load();
  });
  if (!s) return <View className="page" />;
  const done = () => api(Routes.guardianTaskDone).then(load).catch(fail);

  return (
    <View className="page" style={{ paddingTop: `${safeTop()}px` }}>
      <View className="topbar">
        <View><View className="muted">{s.child.class_name}</View><View className="h1">{s.child.name}的这一周</View></View>
        <View className="bell bell--solid" onClick={() => go('notices')}>
          <Image src={icon('bell', '#14264D')} />
          {!!s.unread && <Text className="badge">{s.unread}</Text>}
        </View>
      </View>

      {s.crisis_notice && (
        <View className="card mt16" style={{ background: '#fce4ec' }}>
          <View className="h2" style={{ color: '#7d1238' }}>{s.crisis_notice.text}</View>
          {s.crisis_notice.steps.map((x, i) => (
            <View key={x} className="row mt8" style={{ alignItems: 'flex-start' }}>
              <Text className="num bold" style={{ width: px('24px'), color: '#d9366b' }}>{i + 1}</Text>
              <Text className="grow">{x}</Text>
            </View>
          ))}
          <View className="btn btn--help mt16" style={{ background: '#fff' }} onClick={() => Taro.makePhoneCall({ phoneNumber: '12355' }).catch(() => undefined)}>需要帮助，拨打 12355</View>
        </View>
      )}

      <View className="card card--indigo mt16" style={{ fontSize: px('16px'), lineHeight: 1.75 }}>{s.week_text}</View>

      {!!s.notes_unread && (
        <View className="card row mt12" style={{ background: '#fff3cf' }} onClick={() => go('notes')}>
          <Image className="icon" src={icon('mail', '#7A5500')} style={{ marginRight: px('10px') }} />
          <Text className="grow bold" style={{ color: '#7a5500' }}>老师发来 {s.notes_unread} 张沟通单，等您回一句</Text>
          <Image className="icon" src={icon('chevron', '#7A5500')} />
        </View>
      )}

      <Section title="这周可以这样做" />
      <View className="card">{s.suggestions.map((x) => <View key={x} className="list-item">{x}</View>)}</View>

      <Section title="三分钟的小事" aside="和孩子一起" />
      <View className="card" style={{ background: '#fff3cf', color: '#7a5500' }}>
        <View style={{ fontSize: px('16px') }}>{s.task.title}</View>
        <View className="row mt12">
          <Text className="grow" style={{ fontSize: px('12px') }}>每周换一件。做了就点一下，只是给自己记着。</Text>
          <Text className="chip" style={{ margin: 0, background: s.task.done ? 'rgba(122,85,0,0.12)' : '#7a5500', color: s.task.done ? '#7a5500' : '#fff' }} onClick={() => !s.task.done && done()}>{s.task.done ? '这周做过了' : '我们做了'}</Text>
        </View>
      </View>

      <Section title="家长课堂" aside={`${s.courses.length} 篇`} />
      <View className="card">{s.courses.slice(0, 5).map((c) => <ContentRow key={c.id} c={c} />)}</View>

      {anns.length > 0 && (
        <>
          <Section title="学校和平台的通知" />
          <View className="card">{anns.slice(0, 3).map((a) => <View key={a.id} className="list-item" style={{ display: 'block' }}><View className="bold">{a.title}</View><View className="muted">{a.body}</View></View>)}</View>
        </>
      )}

      <View className="card mt16">
        <Row iconName="mail" title="家校沟通单" hint="老师发来的话，一对一，不是群聊" dot={!!s.notes_unread} onClick={() => go('notes')} />
        <Row iconName="shield" title="监护人同意与授权" hint="我同意了什么，随时可以改" onClick={() => go('privacy')} />
        <Row iconName="building" title="能帮到你的机构" hint="医院、咨询机构、社工和志愿者" onClick={() => go('institutions')} />
        <Row iconName="question" title="帮助与反馈" hint="为什么看不到孩子每天的记录" onClick={() => go('faq')} />
      </View>
      <View className="faint mt16">这里看不到孩子的分数、每天的记录和聊天内容。孩子愿意开放的部分，会体现在每周摘要里。涉及孩子安全的事，学校一定会第一时间通知您。</View>
      <View className="faint center mt16" style={{ paddingBottom: px('20px') }} onClick={logout}>退出登录</View>
    </View>
  );
}
