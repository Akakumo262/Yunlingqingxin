import { useState } from 'react';
import { Button, DatePicker, Form, Input, Modal, Switch } from 'antd';
import { Page, ReferralItem, ReferralStatus, Role, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import { Empty, Level, PageHead, Sheet, fmtDate } from '@/components/ui';

const STATUS: Record<ReferralStatus, { text: string; cls: string }> = {
  sent: { text: '等待对方确认', cls: 'wait' }, accepted: { text: '对方已接收', cls: '' }, rejected: { text: '对方未接收', cls: 'stop' },
  feedback_received: { text: '已收到反馈', cls: 'ok' }, closed: { text: '已闭环', cls: 'ok' }, revoked: { text: '已撤回', cls: 'off' },
};

/** P-17 / P-24 转介：学校看进度，机构看收件箱。两边看到的是同一张单子的不同视图。 */
export default function Referrals() {
  const isInst = useAuth((s) => s.me)!.roles.includes(Role.institution);
  const { data } = useGet<Page<ReferralItem>>(['referrals'], Routes.referralList);
  const [fb, setFb] = useState<ReferralItem | null>(null);
  const [form] = Form.useForm();
  const accept = useAct((id: string) => api(Routes.referralAccept, { params: { id } }), ['referrals'], '已确认接收，学校会收到通知');
  const feedback = useAct((body: object) => api(Routes.referralFeedback, { params: { id: fb!.id }, body }), ['referrals'], '反馈已发回学校');
  const items = data?.items ?? [];

  return (
    <>
      <PageHead title={isInst ? '转介收件箱' : '转介'} sub={isInst ? '学校发来的转介单。你看到的是完成接诊所需的最少信息，学生姓名已脱敏。' : '发出的每一张转介单：对方 48 小时内确认，7 天内给初步反馈。'} />
      <Sheet>
        {items.length === 0 && <Empty title={isInst ? '现在没有待处理的转介' : '还没有发出过转介'} hint={isInst ? undefined : '在个案详情里可以“转介给专业机构”。'} />}
        {items.map((r) => (
          <div className="row" key={r.id} style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <b>{r.student.name}</b><Level level={r.level} />
                <span className={`pill ${STATUS[r.status].cls}`}>{STATUS[r.status].text}</span>
                <span className="faint num">{r.case_no}</span>
              </div>
              <small style={{ marginTop: 6 }}>{isInst ? '转介原因' : `转给 ${r.institution_name}`}：{r.reason}</small>
              {r.done_interventions.length > 0 && <small>学校已做：{r.done_interventions.join('、')}</small>}
              {r.assessment_summary && <small>问卷摘要：{r.assessment_summary}</small>}
              {r.feedback && <small style={{ color: 'var(--pine)' }}>反馈：{r.feedback.visited ? '已就诊。' : '尚未就诊。'}{r.feedback.advice}</small>}
              <small className="faint">发出于 {fmtDate(r.created_at)}，转介包 {fmtDate(r.expires_at)} 前有效</small>
            </div>
            {isInst && (
              <div className="row-actions">
                {r.status === 'sent' && <Button type="primary" onClick={() => accept.mutate(r.id)}>确认接收</Button>}
                {r.status === 'accepted' && <Button type="primary" onClick={() => (form.resetFields(), setFb(r))}>填写反馈</Button>}
              </div>
            )}
          </div>
        ))}
      </Sheet>
      <Modal open={!!fb} title="给学校的反馈" okText="发回学校" cancelText="取消" onCancel={() => setFb(null)} confirmLoading={feedback.isPending}
        onOk={async () => { const v = await form.validateFields(); feedback.mutate({ visited: !!v.visited, advice: v.advice, next_at: v.next_at?.format('YYYY-MM-DD') }, { onSuccess: () => setFb(null) }); }}>
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ visited: true }}>
          <Form.Item name="visited" label="学生已就诊" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="advice" label="给学校的建议" extra="写学校能配合做的事，不需要写诊断。" rules={[{ required: true, message: '请填写建议' }]}><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="next_at" label="复诊时间（可不填）"><DatePicker /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
