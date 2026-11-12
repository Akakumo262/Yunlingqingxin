import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';
import { FIVE_EDU_LABEL, Passport, Routes } from '@yunling/contracts';
import { api, fail, logout, session } from '@/services/api';
import { IconName, icon } from '@/components/icons';

const top = () => (Taro.getSystemInfoSync().statusBarHeight || 0) + 28;
const LINKS: { text: string; hint: string; icon: IconName; url: string }[] = [
  { text: '成长问卷', hint: '不是考试，可以跳过任何一题', icon: 'book', url: '/pages/assess/index' },
  { text: '隐私与授权', hint: '谁看过我的记录，我同意了什么', icon: 'shield', url: '/pages/privacy/index' },
  { text: '能帮到你的机构', hint: '医院、咨询机构、社工和志愿者', icon: 'building', url: '/pages/institutions/index' },
];

/** P-08 成长护照：属于学生自己的记录。五育是五枚印章，只数盖了几次，不打分不排名。 */
export default function Me() {
  const [p, setP] = useState<Passport | null>(null);
  useEffect(() => void api<Passport>(Routes.passportGet).then(setP).catch(fail), []);
  const me = session.me!;

  return (
    <View className="page page--bar" style={{ paddingTop: `${top()}px` }}>
      <View className="passport">
        <View className="passport__kicker">成长护照</View>
        <View className="passport__name">{me.name}</View>
        <View style={{ opacity: 0.75, fontSize: '13px' }}>{me.school_name}　{me.class_name}　圈子里叫“{me.nickname}”</View>
        <View className="stamps">
          {p?.stamps.map((s, i) => (
            <View key={s.edu} className={`stamp stamp--${i}`}>
              <Text className="edu">{FIVE_EDU_LABEL[s.edu]}</Text>
              <Text className="n num">{s.count} 次</Text>
            </View>
          ))}
        </View>
        <View className="ridge ridge--near" />
      </View>

      {p && (
        <>
          <View className="section-title"><Text className="h2">我擅长的</Text></View>
          <View>{p.strengths.map((s) => <Text key={s} className="chip chip--rape">{s}</Text>)}</View>

          <View className="section-title"><Text className="h2">这学期的足迹</Text><Text className="faint">只有你和你授权的人能看</Text></View>
          <View className="card">
            {p.records.map((r) => (
              <View key={r.id} className="record">
                <View style={{ fontWeight: 600 }}>{r.title}</View>
                <View className="faint">{FIVE_EDU_LABEL[r.edu]}育　{r.date}{r.witness ? `　${r.witness}见证` : ''}</View>
                {r.reflection && <View className="muted" style={{ marginTop: '4px' }}>“{r.reflection}”</View>}
              </View>
            ))}
          </View>

          <View className="section-title"><Text className="h2">他们想对你说</Text></View>
          <View className="card">
            {p.messages.map((m, i) => (
              <View key={i} className="quote" style={i === 0 ? { marginTop: 0 } : undefined}>
                <View>{m.text}</View>
                <View className="faint">{m.from}</View>
              </View>
            ))}
          </View>
        </>
      )}

      <View className="card" style={{ marginTop: '24px' }}>
        {LINKS.map((l) => (
          <View key={l.url} className="list-item" onClick={() => Taro.navigateTo({ url: l.url })}>
            <Image className="icon" src={icon(l.icon, '#1F5FD1')} style={{ marginRight: '12px' }} />
            <View className="grow"><View style={{ fontWeight: 600 }}>{l.text}</View><View className="faint">{l.hint}</View></View>
            <Image className="icon" src={icon('chevron', '#8590A8')} />
          </View>
        ))}
      </View>
      <View className="faint" style={{ textAlign: 'center', marginTop: '24px' }} onClick={logout}>退出登录</View>
    </View>
  );
}
