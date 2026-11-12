import { useState } from 'react';
import { Button, Form, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Me, Routes, TokenPair, fixtures } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAuth } from '@/store/auth';
import { menusFor } from '@/layout/menus';
import { Ridge, fail } from '@/components/ui';

const DEMO = [
  { account: 'teacher01', who: '班主任', what: '处理提醒、记录谈话' },
  { account: 'psy01', who: '心理教师', what: '个案、转介、回访' },
  { account: 'leader01', who: '校领导', what: '全校态势与督办' },
  { account: 'edu01', who: '教体局', what: '区域看板' },
  { account: 'ops01', who: '平台运营', what: '内容审核、机构入驻' },
  { account: 'inst01', who: '协作机构', what: '接收转介并反馈' },
  { account: 'cmt01', who: '团委', what: '机构入驻审核' },
  { account: 'audit01', who: '安全审计', what: '查看访问留痕' },
];

export default function Login() {
  const nav = useNavigate();
  const { setToken, setSession } = useAuth();
  const [busy, setBusy] = useState(false);

  const enter = async (t: TokenPair) => {
    setToken(t.access_token);
    const me = await api<Me>(Routes.me);
    setSession(t.access_token, me);
    nav(menusFor(me.roles)[0]?.path ?? '/');
  };
  const run = async (fn: () => Promise<TokenPair>) => {
    setBusy(true);
    try {
      await enter(await fn());
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-art">
        <div className="brand">云岭青心</div>
        <h1>孩子开口的那一刻，要有人接住。</h1>
        <p>学校、家庭、社区、医院和团委在同一个案件上协作：谁在什么时候做了什么，一目了然。</p>
        <Ridge tone="login" />
      </section>
      <section className="login-form">
        <h2>登录工作台</h2>
        <p className="muted">教师、学校、教体局、团委与协作机构由此进入。学生和家长请使用微信小程序。</p>
        <Form layout="vertical" style={{ marginTop: 24 }} requiredMark={false} initialValues={{ account: 'teacher01', password: fixtures.DEMO_PASSWORD }} onFinish={(v) => run(() => api<TokenPair>(Routes.authPasswordLogin, { body: v }))}>
          <Form.Item name="account" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={busy}>
            登录
          </Button>
        </Form>
        <p className="muted" style={{ marginTop: 32 }}>
          演示环境可以直接选一个身份进入，数据全部是合成的。
        </p>
        <div className="who">
          {DEMO.map((d) => (
            <button key={d.account} disabled={busy} onClick={() => run(() => api<TokenPair>(Routes.authDevLogin, { body: { account: d.account } }))}>
              <b>{d.who}</b>
              <small>{d.what}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
