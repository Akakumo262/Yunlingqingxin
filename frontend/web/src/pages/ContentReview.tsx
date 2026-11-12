import { useState } from 'react';
import { Button, Drawer, Form, Input, Modal, Select } from 'antd';
import { CONTENT_CHANNELS, CONTENT_CHANNEL_LABEL, CONTENT_TYPES, ContentReviewItem, ContentStatus, Page, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { Empty, PageHead, Sheet, fmtTime } from '@/components/ui';

const STAGE: Partial<Record<ContentStatus, { text: string; cls: string; next: string }>> = {
  ai_blocked: { text: '机审拦截，待人工复核', cls: 'stop', next: '复核通过' },
  team_review: { text: '待团队二审', cls: 'wait', next: '二审通过' },
  tri_party_review: { text: '待三审会签', cls: 'wait', next: '会签通过并发布' },
};
const TYPE = { article: '图文', video: '视频', audio: '音频' } as const;
const STAGE_NAME = { ai: 'AI 一审', team: '团队二审', tri_party: '三审会签' } as const;

/** P-20 / P-35 内容审核：AI 一审 → 团队二审 → 团委/教体局/心理机构三审 */
export default function ContentReview() {
  const { data } = useGet<Page<ContentReviewItem>>(['reviews'], Routes.contentReviewQueue);
  const [cur, setCur] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');
  const [form] = Form.useForm();
  const items = data?.items ?? [];
  const item = items.find((i) => i.content.id === cur) ?? items[0];

  const review = useAct((body: object) => api(Routes.contentReview, { params: { id: item!.content.id }, body }), ['reviews'], '已处理');
  const create = useAct((body: object) => api(Routes.contentCreate, { body }), ['reviews'], '已提交，机审完成后会出现在队列里');

  return (
    <>
      <PageHead title="内容审核" sub="每条内容都要有来源、作者和授权。心理、性教育、民族、宗教、政策类内容必须过三审。">
        <Button type="primary" onClick={() => (form.resetFields(), setCreating(true))}>新建内容</Button>
      </PageHead>
      {items.length === 0 ? <Sheet><Empty title="队列清空了" hint="新提交的内容会出现在这里。" /></Sheet> : (
        <div className="cols" style={{ gridTemplateColumns: 'minmax(260px, 340px) 1fr' }}>
          <Sheet title="待审" aside={`${items.length} 条`}>
            {items.map(({ content: c }) => (
              <button key={c.id} className="stu" style={{ width: '100%', marginBottom: 8, background: c.id === item.content.id ? 'var(--lake-100)' : undefined }} onClick={() => setCur(c.id)}>
                <b>{c.title}</b>
                <span className={`pill ${STAGE[c.status]?.cls}`}>{STAGE[c.status]?.text}</span>
              </button>
            ))}
          </Sheet>
          <Sheet>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <span className="pill">{CONTENT_CHANNEL_LABEL[item.content.channel]}</span>
              <span className="pill">{TYPE[item.content.type]} · {item.content.minutes} 分钟</span>
              <span className="pill">{item.content.age_label}</span>
            </div>
            <h2 style={{ fontSize: 24, lineHeight: 1.35 }}>{item.content.title}</h2>
            <p className="muted" style={{ margin: '6px 0 18px' }}>{item.content.summary}</p>
            <div className="prose">{item.content.body.split('\n').map((p, i) => <p key={i}>{p}</p>)}</div>
            <dl className="meta" style={{ margin: '24px 0', padding: '16px 18px', background: 'var(--sky)', borderRadius: 12 }}>
              <dt>来源</dt><dd>{item.content.source}</dd>
              <dt>作者</dt><dd>{item.content.author}</dd>
              <dt>授权</dt><dd>{item.content.license}</dd>
              <dt>机审</dt><dd>{item.ai_result.passed ? '未发现问题' : <span style={{ color: 'var(--camellia)' }}>{item.ai_result.hits.join('；')}</span>}</dd>
              <dt>审核记录</dt><dd>{item.history.map((h) => `${STAGE_NAME[h.stage]} ${h.result === 'pass' ? '通过' : '未通过'}（${h.reviewer}，${fmtTime(h.at)}）`).join(' → ')}</dd>
            </dl>
            <div className="row-actions">
              <Button type="primary" loading={review.isPending} onClick={() => review.mutate({ result: 'pass' })}>{STAGE[item.content.status]?.next}</Button>
              <Button danger onClick={() => (setReason(''), setReject(true))}>退回</Button>
            </div>
          </Sheet>
        </div>
      )}

      <Modal open={reject} title="退回这条内容" okText="确认退回" cancelText="取消" okButtonProps={{ disabled: !reason.trim() }} onCancel={() => setReject(false)}
        onOk={() => review.mutate({ result: 'reject', reason }, { onSuccess: () => setReject(false) })}>
        <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="告诉作者哪里需要改。" maxLength={200} />
      </Modal>

      <Drawer open={creating} onClose={() => setCreating(false)} width={560} title="新建内容" destroyOnClose
        extra={<Button type="primary" loading={create.isPending} onClick={async () => create.mutate(await form.validateFields(), { onSuccess: () => setCreating(false) })}>提交审核</Button>}>
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ channel: 'psychology', type: 'article', age_label: '初中—高中' }}>
          <div className="cols c-1-1">
            <Form.Item name="channel" label="频道"><Select options={CONTENT_CHANNELS.map((c) => ({ value: c, label: CONTENT_CHANNEL_LABEL[c] }))} /></Form.Item>
            <Form.Item name="type" label="形式"><Select options={CONTENT_TYPES.map((t) => ({ value: t, label: TYPE[t] }))} /></Form.Item>
          </div>
          <Form.Item name="title" label="标题" rules={[{ required: true, min: 2, message: '请写标题' }]}><Input maxLength={60} /></Form.Item>
          <Form.Item name="summary" label="一句话简介"><Input maxLength={120} /></Form.Item>
          <Form.Item name="body" label="正文" extra="一段一行。" rules={[{ required: true, message: '请写正文' }]}><Input.TextArea rows={8} /></Form.Item>
          <div className="cols c-1-1">
            <Form.Item name="source" label="来源" rules={[{ required: true, message: '必填' }]}><Input placeholder="比如：云岭青心内容组" /></Form.Item>
            <Form.Item name="author" label="作者" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          </div>
          <div className="cols c-1-1">
            <Form.Item name="license" label="授权" rules={[{ required: true, message: '没有授权不能上架' }]}><Input placeholder="自有内容 / CC BY 4.0 / 书面授权" /></Form.Item>
            <Form.Item name="age_label" label="适合谁看"><Input /></Form.Item>
          </div>
        </Form>
      </Drawer>
    </>
  );
}
