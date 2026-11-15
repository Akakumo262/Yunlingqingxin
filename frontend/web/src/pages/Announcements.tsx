import { useState } from 'react';
import { Button, Form, Input, Modal, Segmented } from 'antd';
import { AUDIENCES, AUDIENCE_LABEL, Announcement, Audience, Role, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import { Empty, PageHead, Sheet, fmtTime } from '@/components/ui';

const TONE: Record<Audience, string> = { all: '', students: 'ok', guardians: 'wait', teachers: 'off' };

/** 公告：发给所有人、学生、家长或教师。学生和家长在小程序的通知里看到。 */
export default function Announcements() {
  const canPost = useAuth((s) => s.me)!.roles.some((r) => (Routes.announcementCreate.roles as Role[]).includes(r));
  const { data } = useGet<Announcement[]>(['announcements'], Routes.announcementList);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Audience | ''>('');
  const [form] = Form.useForm();
  const post = useAct((body: object) => api(Routes.announcementCreate, { body }), ['announcements', 'notices'], '已发布，对应的人会收到通知');
  const list = (data ?? []).filter((a) => !filter || a.audience === filter);

  return (
    <>
      <PageHead title="公告" sub="活动报名、放假安排、平台更新。写清楚谁、什么时候、做什么。">
        <Segmented value={filter} onChange={(v) => setFilter(v as Audience | '')} options={[{ value: '', label: '全部' }, ...AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_LABEL[a] }))]} />
        {canPost && <Button type="primary" onClick={() => (form.resetFields(), setOpen(true))}>发公告</Button>}
      </PageHead>
      <Sheet>
        {list.length === 0 && <Empty title="还没有公告" />}
        {list.map((a) => (
          <div className="row" key={a.id} style={{ alignItems: 'flex-start' }}>
            <span className={`pill ${TONE[a.audience]}`}>发给{AUDIENCE_LABEL[a.audience]}</span>
            <div className="grow"><b>{a.title}</b><small style={{ color: 'var(--ink)' }}>{a.body}</small><small className="faint">{a.author} · {fmtTime(a.created_at)}</small></div>
          </div>
        ))}
      </Sheet>
      <Modal open={open} title="发公告" okText="发布" cancelText="取消" confirmLoading={post.isPending} onCancel={() => setOpen(false)}
        onOk={async () => post.mutate(await form.validateFields(), { onSuccess: () => setOpen(false) })}>
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ audience: 'all' }}>
          <Form.Item name="audience" label="发给谁"><Segmented options={AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_LABEL[a] }))} /></Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, min: 2, message: '写一个标题' }]}><Input maxLength={40} /></Form.Item>
          <Form.Item name="body" label="内容" rules={[{ required: true, message: '写内容' }]} extra="不写学生姓名，不写任何个人情况。"><Input.TextArea rows={4} maxLength={500} showCount /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
