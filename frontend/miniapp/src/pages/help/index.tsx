import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Image, View } from '@tarojs/components';
import { ContactTarget, Routes, SignalCreated } from '@yunling/contracts';
import { api } from '@/services/api';
import { icon } from '@/components/icons';

/** P-07 我想找人说：两步以内发起。页面只告诉学生“谁会在多久内联系你”，不出现任何等级。 */
export default function Help() {
  const [sent, setSent] = useState<{ who: ContactTarget; res: SignalCreated } | null>(null);
  const [busy, setBusy] = useState(false);

  const call = () => Taro.makePhoneCall({ phoneNumber: '12355' }).catch(() => undefined);
  const send = async (who: ContactTarget) => {
    if (busy || sent) return;
    setBusy(true);
    try {
      setSent({ who, res: await api<SignalCreated>(Routes.signalCreate, { body: { source: 'one_click_help', contact_preference: [who] } }) });
    } catch {
      // 求助不能因为网络失败而落空：直接给出电话兜底
      Taro.showModal({ title: '暂时没连上', content: '消息没有发出去。如果情况紧急，请直接拨打 12355，或者去找身边任何一位你信任的大人。', confirmText: '拨打 12355', cancelText: '稍后再试' }).then((r) => { if (r.confirm) call(); });
    } finally {
      setBusy(false);
    }
  };

  const Opt = ({ who, title, hint, name }: { who: ContactTarget; title: string; hint: string; name: 'teacher' | 'calendar' }) => (
    <View className={`help-opt${sent?.who === who ? ' help-opt--done' : ''}`} onClick={() => send(who)}>
      <View className="badge"><Image className="icon" src={icon(name, '#1F5FD1')} /></View>
      <View style={{ flex: 1 }}>
        <View style={{ fontWeight: 600 }}>{title}</View>
        <View className="muted">{sent?.who === who ? '已经通知到了' : hint}</View>
      </View>
    </View>
  );

  return (
    <View className="page">
      <View className="h1">{sent ? '已经有人知道了' : '我想找人说'}</View>
      <View className="muted" style={{ marginTop: '4px' }}>{sent ? sent.res.next : '选一种让你自在的方式。不用想好怎么说，先让人知道就行。'}</View>

      <Opt who="teacher" title="请班主任来找我" hint="老师会在 15 分钟内联系你" name="teacher" />
      <Opt who="psychologist" title="我想和心理老师聊" hint="心理老师会来约你的时间" name="calendar" />
      <View className="help-opt" onClick={call}>
        <View className="badge badge--hot"><Image className="icon" src={icon('phone', '#D9366B')} /></View>
        <View style={{ flex: 1 }}>
          <View style={{ fontWeight: 600 }}>拨打 12355</View>
          <View className="muted">青少年服务台，有人接听</View>
        </View>
      </View>

      {sent && (
        <View className="card card--tint" style={{ marginTop: '20px' }}>
          <View className="h2">等的这会儿，可以做的事</View>
          <View className="muted" style={{ marginTop: '6px' }}>找个安静的地方坐下，慢慢呼吸三次。</View>
          <View className="muted">你不需要解释太多，老师会先听你说。</View>
          <View className="muted">如果十五分钟后还没人找你，再点一次，或者直接打 12355。</View>
        </View>
      )}
      <View className="btn btn--help" style={{ marginTop: '24px' }} onClick={call}>情况紧急，现在就拨 12355</View>
    </View>
  );
}
