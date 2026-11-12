import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Switch, Text, View } from '@tarojs/components';
import { ConsentItem, PrivacyDashboard, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';

const when = (iso: string) => new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** P-09 隐私与授权：谁看过我的什么；我同意了什么；随时可以改主意 */
export default function Privacy() {
  const [d, setD] = useState<PrivacyDashboard | null>(null);
  const load = () => api<PrivacyDashboard>(Routes.mePrivacy).then(setD).catch(fail);
  useLoad(() => void load());

  const toggle = async (c: ConsentItem, on: boolean) => {
    try {
      if (on) await api(Routes.consentGrant, { body: { purpose: c.purpose } });
      else await api(Routes.consentRevoke, { params: { purpose: c.purpose } });
      Taro.showToast({ title: on ? '已打开' : '已关闭，之后不再收集', icon: 'none' });
    } catch (e) {
      fail(e);
    }
    load();
  };

  return (
    <View className="page">
      <View className="h1">隐私与授权</View>
      <View className="muted">你的记录属于你。这里能看到谁看过，也能随时改主意。</View>

      <View className="section-title"><Text className="h2">谁看过我的记录</Text></View>
      <View className="card">
        {d?.access_logs.length === 0 && <View className="muted">最近没有人查看过你的记录。</View>}
        {d?.access_logs.map((l, i) => (
          <View key={i} className="list-item">
            <View className="grow"><Text style={{ fontWeight: 600 }}>{l.viewer}</Text> 看了 {l.what}</View>
            <Text className="faint num">{when(l.at)}</Text>
          </View>
        ))}
      </View>
      <View className="faint" style={{ marginTop: '8px' }}>老师只能看到你选的天气，看不到你写的话。</View>

      <View className="section-title"><Text className="h2">我同意了什么</Text></View>
      <View className="card">
        {d?.consents.map((c) => (
          <View key={c.purpose} className="list-item" style={{ alignItems: 'flex-start' }}>
            <View className="grow">
              <View style={{ fontWeight: 600 }}>{c.title}</View>
              <View className="muted">{c.description}</View>
            </View>
            {c.required ? <Text className="faint">必需</Text> : <Switch checked={c.granted} color="#1F5FD1" onChange={(e) => toggle(c, e.detail.value)} />}
          </View>
        ))}
      </View>
      <View className="faint" style={{ marginTop: '12px' }}>关掉某一项后，对应的功能会停用，已经存下的记录按规定保留期限后删除。遇到紧急情况时，学校会依法联系你的家长。</View>
    </View>
  );
}
