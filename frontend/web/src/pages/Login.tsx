import { useState } from 'react';
import { Button, Form, Input, Modal, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { INSTITUTION_TYPES, INSTITUTION_TYPE_LABEL, Me, Routes, TokenPair } from '@yunling/contracts';
import { api } from '@/api/client';
import { toast } from '@/api/toast';
import { useAuth } from '@/store/auth';
import { menusFor } from '@/layout/menus';
import { Ridge, fail } from '@/components/ui';

const DEMO = [
  { account: 'teacher01', who: '班主任', what: '处理提醒、记录谈话' },
  { account: 'psy01', who: '心理教师', what: '个案、转介、回访' },
  { account: 'leader01', who: '校领导', what: '规则、导出审批、紧急访问' },
  { account: 'schooladmin01', who: '学校信息员', what: '组织结构、导入名册' },
  { account: 'edu01', who: '教体局', what: '区域看板、月度报告、督办' },
  { account: 'ops01', who: '平台运营', what: '内容库、审核、系统状态' },
  { account: 'inst01', who: '协作机构', what: '接收转介并反馈' },
  { account: 'cmt01', who: '团委', what: '发起活动、机构入驻审核' },
  { account: 'audit01', who: '安全审计', what: '留痕、复核紧急访问' },
];

export default function Login() {
  const nav = useNavigate();
  const { setToken, setSession } = useAuth();
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyForm] = Form.useForm();
  const apply = async () => {
    const v = await applyForm.validateFields();
    try {
      await api(Routes.institutionApply, { body: { ...v, services: String(v.services ?? '').split(/、|,|，/).map((x: string) => x.trim()).filter(Boolean) } });
      toast.api.success('申请已提交。团委和平台运营审核后会电话联系您。');
      setApplying(false);
    } catch (e) {
      fail(e);
    }
  };

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
        <Form layout="vertical" style={{ marginTop: 24 }} requiredMark={false}  onFinish={(v) => run(() => api<TokenPair>(Routes.authPasswordLogin, { body: v }))}>
          <Form.Item name="account" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" size="large" placeholder="演示环境可以直接选下面的身份" />
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
        <p className="faint" style={{ marginTop: 20, fontSize: 13 }}>
          医院、心理咨询机构、社工机构想加入协作？<button className="link-btn" onClick={() => (applyForm.resetFields(), setApplying(true))}>申请入驻</button>
        </p>
      </section>
      <Modal open={applying} title="机构申请入驻" okText="提交申请" cancelText="取消" onCancel={() => setApplying(false)} onOk={apply} width={560}>
        <p className="muted" style={{ marginBottom: 16 }}>提交后由团委和平台运营核验资质。通过后才会出现在学校的转介名单和家长能看到的机构列表里。</p>
        <Form form={applyForm} layout="vertical" requiredMark={false} initialValues={{ type: 'counseling' }}>
          <div className="cols c-1-1">
            <Form.Item name="name" label="机构名称" rules={[{ required: true, min: 2, message: '请填写机构名称' }]}><Input /></Form.Item>
            <Form.Item name="type" label="类型"><Select options={INSTITUTION_TYPES.map((t) => ({ value: t, label: INSTITUTION_TYPE_LABEL[t] }))} /></Form.Item>
          </div>
          <div className="cols c-1-1">
            <Form.Item name="district" label="所在区县" rules={[{ required: true, message: '请填写区县' }]}><Input /></Form.Item>
            <Form.Item name="license_no" label="执业许可证或登记证号" rules={[{ required: true, min: 4, message: '请填写证号' }]}><Input /></Form.Item>
          </div>
          <Form.Item name="intro" label="能提供什么帮助" rules={[{ required: true, message: '用一两句话介绍' }]}><Input.TextArea rows={2} maxLength={300} /></Form.Item>
          <Form.Item name="services" label="服务项目" extra="用顿号隔开。"><Input placeholder="个案咨询、家长课堂、教师培训" /></Form.Item>
          <div className="cols c-1-1">
            <Form.Item name="contact_name" label="联系人" rules={[{ required: true, message: '请填写联系人' }]}><Input /></Form.Item>
            <Form.Item name="contact_phone" label="联系人手机号" rules={[{ required: true, pattern: /^1\d{10}$/, message: '请填写 11 位手机号' }]}><Input /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
