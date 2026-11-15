import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Switch, Text, View } from '@tarojs/components';
import { ConsentItem, Me, PrivacyDashboard, Role, Routes } from '@yunling/contracts';
import { api, fail, loginAs, session } from '@/services/api';
import { px } from '@/utils/ui';

const WHO = [
  { account: 'student01', title: '我是学生', hint: '已经用学籍信息激活过' },
  { account: 'parent01', title: '我是家长', hint: '已经绑定了孩子' },
  { account: 'student02', title: '新同学第一次来', hint: '体验用学校码激活，并逐项确认授权' },
  { account: 'parent02', title: '新家长第一次来', hint: '体验绑定孩子，并完成监护人同意' },
];
const home = (me: Me) => Taro.reLaunch({ url: me.roles.includes(Role.guardian) ? '/pages/parent/index' : '/pages/index/index' });
const HEAD = { who: '有内容可学，\n有人可问。', activate: '确认一下\n你是哪个班的', bind: '绑定你的孩子', consent: '用之前，\n先说清楚' } as const;

/**
 * P-01 登录与激活、P-10 家长绑定、同意中心的首次确认（BR-06 / BR-07：逐项同意，不默认勾选敏感项）。
 * G0 用演示身份进入；接入微信后，“进入”改为 Taro.login 拿 code 调 Routes.authWechatLogin，其余流程不变。
 */
export default function Login() {
  const [step, setStep] = useState<keyof typeof HEAD>('who');
  const [f, setF] = useState({ school_code: '', sno_last4: '', phone: '', sms_code: '' });
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const set = (k: keyof typeof f) => (e: { detail: { value: string } }) => setF((x) => ({ ...x, [k]: e.detail.value }));
  const isGuardian = !!me?.roles.includes(Role.guardian);

  const enter = async (account: string) => {
    try {
      const u = await loginAs(account);
      setMe(u);
      if (session.activated) return home(u);
      setStep(u.roles.includes(Role.guardian) ? 'bind' : 'activate');
    } catch (e) {
      fail(e);
    }
  };
  const submit = async () => {
    try {
      const u = step === 'activate'
        ? await api<Me>(Routes.authActivate, { body: { school_code: f.school_code, sno_last4: f.sno_last4 } })
        : await api<Me>(Routes.authGuardianBind, { body: f });
      session.me = u;
      session.activated = true;
      setMe(u);
      // 新用户：敏感项先全部关掉，让人自己一项一项打开
      const d = await api<PrivacyDashboard>(Routes.mePrivacy);
      for (const c of d.consents) if (!c.required && c.granted) await api(Routes.consentRevoke, { params: { purpose: c.purpose } });
      setConsents(d.consents.map((c) => (c.required ? c : { ...c, granted: false })));
      setStep('consent');
    } catch (e) {
      fail(e);
    }
  };
  const toggle = async (c: ConsentItem, on: boolean) => {
    try {
      if (on) await api(Routes.consentGrant, { body: { purpose: c.purpose } });
      else await api(Routes.consentRevoke, { params: { purpose: c.purpose } });
      setConsents((list) => list.map((x) => (x.purpose === c.purpose ? { ...x, granted: on } : x)));
    } catch (e) {
      fail(e);
    }
  };

  return (
    <View>
      <View className="sky" style={{ height: px('280px') }}>
        <View className="sky__text" style={{ paddingTop: px('64px') }}>
          <View className="date">云岭青心</View>
          <View className="h1">{HEAD[step]}</View>
        </View>
        <View className="sky__sun" style={{ top: px('90px') }} />
        <View className="ridge ridge--far" /><View className="ridge ridge--mid" /><View className="ridge ridge--near" />
      </View>

      <View className="page" style={{ paddingTop: px('20px'), minHeight: 'auto' }}>
        {step === 'who' && (
          <>
            <View className="muted" style={{ marginBottom: px('12px') }}>演示环境：选一个身份进入，数据都是合成的。</View>
            {WHO.map((w) => (
              <View key={w.account} className="card" style={{ marginBottom: px('10px') }} onClick={() => enter(w.account)}>
                <View className="h2">{w.title}</View>
                <View className="muted">{w.hint}</View>
              </View>
            ))}
            <View className="faint mt12">第一次使用时，会请你和家长逐项确认授权。没有同意的功能不会收集任何信息。</View>
          </>
        )}

        {(step === 'activate' || step === 'bind') && (
          <View className="card">
            <View className="muted">学校码</View>
            <Input className="field" style={{ margin: px('6px 0 14px') }} placeholder="问班主任要，演示环境是 YL2026" value={f.school_code} onInput={set('school_code')} />
            <View className="muted">{step === 'activate' ? '学籍号后四位' : '孩子学籍号后四位'}</View>
            <Input className="field" style={{ margin: px('6px 0 14px') }} type="number" maxlength={4} placeholder="四位数字" value={f.sno_last4} onInput={set('sno_last4')} />
            {step === 'bind' && (
              <>
                <View className="muted">你的手机号</View>
                <Input className="field" style={{ margin: px('6px 0 14px') }} type="number" maxlength={11} placeholder="用于紧急时联系你" value={f.phone} onInput={set('phone')} />
                <View className="muted">短信验证码</View>
                <Input className="field" style={{ margin: px('6px 0 14px') }} type="number" maxlength={6} placeholder="演示环境是 123456" value={f.sms_code} onInput={set('sms_code')} />
              </>
            )}
            <View className="btn" onClick={submit}>下一步</View>
            <View className="faint center mt12" onClick={() => setStep('who')}>换一个身份</View>
          </View>
        )}

        {step === 'consent' && (
          <>
            <View className="muted">{isGuardian ? '作为监护人，请逐项确认。每一项都可以之后在“监护人同意与授权”里改。' : '下面每一项，你都可以选“先不用”。之后想打开，在“我的—隐私与授权”里随时改。'}</View>
            <View className="card mt12">
              {consents.map((c) => (
                <View key={c.purpose} className="list-item" style={{ alignItems: 'flex-start' }}>
                  <View className="grow"><View className="bold">{c.title}</View><View className="muted">{c.description}</View></View>
                  {c.required ? <Text className="faint">必需</Text> : <Switch checked={c.granted} color="#1F5FD1" onChange={(e) => toggle(c, e.detail.value)} />}
                </View>
              ))}
            </View>
            <View className="notice mt12">我们不做的事：不读你的聊天记录和相册，不用摄像头和麦克风判断情绪，不定位，不给你的记录排名，不推销任何东西。</View>
            <View className="btn mt16" onClick={() => me && home(me)}>我看明白了，进入云岭青心</View>
            <View className="faint center mt12" style={{ paddingBottom: px('20px') }}>{isGuardian ? '孩子本人也会在自己的手机上再确认一次。' : '14 岁以下的同学，还需要家长在家长端确认。'}</View>
          </>
        )}
      </View>
    </View>
  );
}
