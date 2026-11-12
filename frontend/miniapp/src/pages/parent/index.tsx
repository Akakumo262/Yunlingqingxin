import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';
import { GuardianSummary, Routes } from '@yunling/contracts';
import { api, fail, logout, session } from '@/services/api';
import { icon } from '@/components/icons';
import { ContentRow } from '@/components/ContentRow';

const top = () => (Taro.getSystemInfoSync().statusBarHeight || 0) + 28;

/** P-11 家长端：每周一条摘要 + 一件三分钟的小事。没有分数、没有逐日记录。 */
export default function Parent() {
  const [s, setS] = useState<GuardianSummary | null>(null);
  useDidShow(() => {
    if (!session.me) return void Taro.reLaunch({ url: '/pages/login/index' });
    api<GuardianSummary>(Routes.guardianSummary).then(setS).catch(fail);
  });
  if (!s) return <View className="page" />;

  return (
    <View className="page" style={{ paddingTop: `${top()}px` }}>
      <View className="muted">{s.child.class_name}</View>
      <View className="h1">{s.child.name}的这一周</View>

      {s.crisis_notice && (
        <View className="card" style={{ marginTop: '16px', background: '#fce4ec' }}>
          <View className="h2" style={{ color: '#7d1238' }}>{s.crisis_notice.text}</View>
          {s.crisis_notice.steps.map((x, i) => (
            <View key={x} className="row" style={{ marginTop: '10px', alignItems: 'flex-start' }}>
              <Text className="num" style={{ width: '24px', fontWeight: 700, color: '#d9366b' }}>{i + 1}</Text>
              <Text className="grow">{x}</Text>
            </View>
          ))}
          <View className="btn btn--help" style={{ marginTop: '16px', background: '#fff' }} onClick={() => Taro.makePhoneCall({ phoneNumber: '12355' }).catch(() => undefined)}>需要帮助，拨打 12355</View>
        </View>
      )}

      <View className="card card--indigo" style={{ marginTop: '16px' }}>{s.week_text}</View>

      <View className="section-title"><Text className="h2">这周可以这样做</Text></View>
      <View className="card">
        {s.suggestions.map((x) => <View key={x} className="list-item">{x}</View>)}
      </View>

      <View className="section-title"><Text className="h2">三分钟的小事</Text><Text className="faint">和孩子一起</Text></View>
      <View className="card" style={{ background: '#fff3cf', color: '#7a5500' }}>{s.task.title}</View>

      <View className="section-title"><Text className="h2">家长课堂</Text></View>
      <View className="card">{s.courses.map((c) => <ContentRow key={c.id} c={c} />)}</View>

      <View className="card" style={{ marginTop: '16px' }}>
        <View className="list-item" onClick={() => Taro.navigateTo({ url: '/pages/privacy/index' })}>
          <Image className="icon" src={icon('shield', '#1F5FD1')} style={{ marginRight: '12px' }} />
          <View className="grow"><View style={{ fontWeight: 600 }}>监护人同意与授权</View><View className="faint">我同意了什么，随时可以改</View></View>
          <Image className="icon" src={icon('chevron', '#8590A8')} />
        </View>
        <View className="list-item" onClick={() => Taro.navigateTo({ url: '/pages/institutions/index' })}>
          <Image className="icon" src={icon('building', '#1F5FD1')} style={{ marginRight: '12px' }} />
          <View className="grow"><View style={{ fontWeight: 600 }}>能帮到你的机构</View><View className="faint">医院、咨询机构、社工和志愿者</View></View>
          <Image className="icon" src={icon('chevron', '#8590A8')} />
        </View>
      </View>
      <View className="faint" style={{ marginTop: '16px' }}>这里看不到孩子的分数、每天的记录和聊天内容。孩子愿意开放的部分，会体现在每周摘要里。</View>
      <View className="faint" style={{ textAlign: 'center', marginTop: '20px' }} onClick={logout}>退出登录</View>
    </View>
  );
}
