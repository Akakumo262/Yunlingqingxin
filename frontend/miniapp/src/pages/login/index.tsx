import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, View } from '@tarojs/components';
import { Me, Role, Routes } from '@yunling/contracts';
import { api, fail, loginAs, session } from '@/services/api';

const WHO = [
  { account: 'student01', title: '我是学生', hint: '已经用学籍信息激活过' },
  { account: 'student03', title: '我是大学生', hint: '查看竞赛、志愿和 AI 资讯推荐' },
  { account: 'parent01', title: '我是家长', hint: '已经绑定了孩子' },
  { account: 'student02', title: '新同学第一次来', hint: '体验用学校码激活' },
  { account: 'parent02', title: '新家长第一次来', hint: '体验绑定孩子' },
];
const home = (me: Me) => Taro.reLaunch({ url: me.roles.includes(Role.guardian) ? '/pages/parent/index' : '/pages/index/index' });

/**
 * P-01 登录与激活、P-10 家长绑定。
 * G0 用演示身份进入；接入微信后，“进入”改为 Taro.login 拿 code 调 Routes.authWechatLogin，其余流程不变。
 */
export default function Login() {
  const [step, setStep] = useState<'who' | 'activate' | 'bind'>('who');
  const [f, setF] = useState({ school_code: '', sno_last4: '', phone: '', sms_code: '' });
  const set = (k: keyof typeof f) => (e: { detail: { value: string } }) => setF((x) => ({ ...x, [k]: e.detail.value }));

  const enter = async (account: string) => {
    try {
      const me = await loginAs(account);
      if (session.activated) return home(me);
      setStep(me.roles.includes(Role.guardian) ? 'bind' : 'activate');
    } catch (e) {
      fail(e);
    }
  };
  const submit = async () => {
    try {
      const me = step === 'activate'
        ? await api<Me>(Routes.authActivate, { body: { school_code: f.school_code, sno_last4: f.sno_last4 } })
        : await api<Me>(Routes.authGuardianBind, { body: f });
      session.me = me;
      session.activated = true;
      home(me);
    } catch (e) {
      fail(e);
    }
  };

  return (
    <View>
      <View className="sky" style={{ height: '280px' }}>
        <View className="sky__text" style={{ paddingTop: '64px' }}>
          <View className="date">云岭青心</View>
          <View className="h1">{step === 'who' ? '有内容可学，\n有人可问。' : step === 'activate' ? '确认一下\n你是哪个班的' : '绑定你的孩子'}</View>
        </View>
        <View className="sky__sun" style={{ top: '90px' }} />
        <View className="ridge ridge--far" /><View className="ridge ridge--mid" /><View className="ridge ridge--near" />
      </View>

      <View className="page" style={{ paddingTop: '20px', minHeight: 'auto' }}>
        {step === 'who' && (
          <>
            <View className="muted" style={{ marginBottom: '12px' }}>演示环境：选一个身份进入，数据都是合成的。</View>
            {WHO.map((w) => (
              <View key={w.account} className="card" style={{ marginBottom: '10px' }} onClick={() => enter(w.account)}>
                <View className="h2">{w.title}</View>
                <View className="muted">{w.hint}</View>
              </View>
            ))}
            <View className="faint" style={{ marginTop: '12px' }}>使用前会请你和家长分别确认《隐私说明》。没有同意的功能不会收集任何信息。</View>
          </>
        )}
        {step !== 'who' && (
          <View className="card">
            <View className="muted">学校码</View>
            <Input className="field" style={{ margin: '6px 0 14px' }} placeholder="问班主任要，演示环境是 YL2026" value={f.school_code} onInput={set('school_code')} />
            <View className="muted">{step === 'activate' ? '学籍号后四位' : '孩子学籍号后四位'}</View>
            <Input className="field" style={{ margin: '6px 0 14px' }} type="number" maxlength={4} placeholder="四位数字" value={f.sno_last4} onInput={set('sno_last4')} />
            {step === 'bind' && (
              <>
                <View className="muted">你的手机号</View>
                <Input className="field" style={{ margin: '6px 0 14px' }} type="number" maxlength={11} placeholder="用于危机时联系你" value={f.phone} onInput={set('phone')} />
                <View className="muted">短信验证码</View>
                <Input className="field" style={{ margin: '6px 0 14px' }} type="number" maxlength={6} placeholder="演示环境是 123456" value={f.sms_code} onInput={set('sms_code')} />
              </>
            )}
            <View className="btn" onClick={submit}>{step === 'activate' ? '确认，进入云岭青心' : '确认绑定'}</View>
            <View className="faint" style={{ textAlign: 'center', marginTop: '12px' }} onClick={() => setStep('who')}>换一个身份</View>
          </View>
        )}
      </View>
    </View>
  );
}
