import { useState } from 'react';
import { Button, Drawer, Form, Input, Modal, Segmented, Select, Spin, Switch, Table } from 'antd';
import { CASE_TRANSITIONS, CaseDetail, CaseStatus, CaseSummary, Institution, InterventionType, Page, Role, Routes, SupportPlan } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import { Empty, Level, PageHead, Sheet, fmtDate, fmtTime } from '@/components/ui';

const STATUS: Record<CaseStatus, { text: string; cls: string }> = {
  pending_confirm: { text: '待确认', cls: 'wait' }, following: { text: '跟进中', cls: '' }, referred: { text: '已转介', cls: 'wait' },
  closed: { text: '已结案', cls: 'ok' }, dismissed: { text: '已关闭', cls: 'off' },
};
const KINDS: { value: InterventionType; label: string }[] = [{ value: 'talk', label: '谈话' }, { value: 'counseling', label: '面谈辅导' }, { value: 'family', label: '家庭沟通' }, { value: 'other', label: '其他支持' }];

function CaseDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const me = useAuth((s) => s.me)!;
  const isPsy = me.roles.includes(Role.psychologist);
  const { data: c } = useGet<CaseDetail>(['cases', id], Routes.caseGet, { params: { id: id ?? '' } }, !!id);
  const insts = useGet<Institution[]>(['institutions'], Routes.institutionList, undefined, isPsy);
  const [modal, setModal] = useState<'plan' | 'close' | 'refer' | null>(null);
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<InterventionType>('talk');
  const [planForm] = Form.useForm<SupportPlan>();
  const [form] = Form.useForm();

  const update = useAct((body: object) => api(Routes.caseUpdate, { params: { id: id! }, body }), ['cases', 'alerts'], '已更新');
  const add = useAct(() => api(Routes.caseIntervention, { params: { id: id! }, body: { type: kind, note } }), ['cases'], '已记入时间线');
  const refer = useAct((body: object) => api(Routes.caseRefer, { params: { id: id! }, body }), ['cases', 'referrals'], '转介已发出，对方会在 48 小时内确认');
  const can = (s: CaseStatus) => !!c && isPsy && CASE_TRANSITIONS[c.status].includes(s);
  const close = () => setModal(null);

  return (
    <Drawer open={!!id} onClose={onClose} width={620} destroyOnClose title={c ? <span className="num">{c.case_no}</span> : '个案'}>
      {!c ? <Spin /> : (
        <div style={{ display: 'grid', gap: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 22 }}>{c.student.name}</b>
            <Level level={c.level} />
            <span className={`pill ${STATUS[c.status].cls}`}>{STATUS[c.status].text}</span>
            <span className="faint">{c.student.class_name} · 主责 {c.owner_name}</span>
          </div>

          {isPsy && (
            <div className="row-actions" style={{ flexWrap: 'wrap' }}>
              {can('following') && c.status === 'pending_confirm' && <Button type="primary" onClick={() => (planForm.setFieldsValue(c.plan ?? {}), setModal('plan'))}>填写支持计划并开始跟进</Button>}
              {can('following') && c.status === 'referred' && <Button onClick={() => update.mutate({ status: 'following' })}>转回校内跟进</Button>}
              {can('referred') && <Button onClick={() => (form.resetFields(), setModal('refer'))}>转介给专业机构</Button>}
              {can('closed') && <Button onClick={() => (form.resetFields(), setModal('close'))}>结案</Button>}
              {can('dismissed') && <Button type="text" onClick={() => update.mutate({ status: 'dismissed' })}>确认是误报，关闭</Button>}
            </div>
          )}

          <section>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>支持计划</h3>
            {c.plan ? (
              <dl className="meta">
                <dt>目标</dt><dd>{c.plan.goal}</dd>
                <dt>谁负责</dt><dd>{c.plan.owner}</dd>
                <dt>多久一次</dt><dd>{c.plan.frequency}</dd>
                <dt>什么时候复盘</dt><dd>{c.plan.review_at}</dd>
              </dl>
            ) : <p className="muted">还没有支持计划。先写清目标、负责人、频次和复盘时间，才能进入跟进。</p>}
            {isPsy && c.plan && c.status === 'following' && <Button type="link" style={{ padding: 0 }} onClick={() => (planForm.setFieldsValue(c.plan!), setModal('plan'))}>修改计划</Button>}
          </section>

          {c.referral && (
            <section className="sheet" style={{ background: 'var(--lake-50)', padding: 16 }}>
              <b>转介 · {c.referral.institution_name}</b>
              <p className="muted">{c.referral.reason}</p>
              {c.referral.feedback
                ? <p style={{ marginTop: 6 }}>对方反馈：{c.referral.feedback.visited ? '已就诊。' : '尚未就诊。'}{c.referral.feedback.advice}{c.referral.feedback.next_at && `（复诊 ${c.referral.feedback.next_at}）`}</p>
                : <p className="faint" style={{ marginTop: 6 }}>等待对方确认与反馈，转介包 {fmtDate(c.referral.expires_at)} 前有效。</p>}
            </section>
          )}

          {!['closed', 'dismissed'].includes(c.status) && (
            <section>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>记一笔</h3>
              <Segmented options={KINDS} value={kind} onChange={(v) => setKind(v as InterventionType)} />
              <Input.TextArea style={{ marginTop: 10 }} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="做了什么、学生怎么回应、下一步打算。" />
              <Button style={{ marginTop: 10 }} type="primary" disabled={!note.trim()} loading={add.isPending} onClick={() => add.mutate(undefined, { onSuccess: () => setNote('') })}>记入时间线</Button>
            </section>
          )}

          <section>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>时间线</h3>
            <div className="tl">
              {[...c.timeline].reverse().map((e) => (
                <div key={e.id} className={e.type === 'feedback' ? 'fb' : ''}>
                  <b>{e.title}</b><small>{e.actor_name} {fmtTime(e.at)}</small>
                  {e.note ? <p>{e.note}</p> : e.type === 'intervention' && <p className="faint">面谈内容仅心理教师可见</p>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <Modal open={modal === 'plan'} title="支持计划" okText={c?.status === 'pending_confirm' ? '保存并开始跟进' : '保存'} cancelText="取消" onCancel={close} confirmLoading={update.isPending}
        onOk={async () => { const plan = await planForm.validateFields(); update.mutate(c?.status === 'pending_confirm' ? { plan, status: 'following' } : { plan }, { onSuccess: close }); }}>
        <Form form={planForm} layout="vertical" requiredMark={false}>
          <Form.Item name="goal" label="想达到什么" rules={[{ required: true, message: '写一个看得见的目标' }]}><Input placeholder="比如：两周内恢复规律作息" /></Form.Item>
          <Form.Item name="owner" label="谁负责" rules={[{ required: true, message: '写清主责和配合的人' }]}><Input placeholder="比如：周老师主责，李老师日常观察" /></Form.Item>
          <Form.Item name="frequency" label="多久一次" rules={[{ required: true, message: '写清频次' }]}><Input placeholder="比如：每周一次面谈" /></Form.Item>
          <Form.Item name="review_at" label="什么时候复盘" rules={[{ required: true, message: '定一个复盘日期' }]}><Input placeholder="比如：2026-11-25" /></Form.Item>
        </Form>
      </Modal>
      <Modal open={modal === 'close'} title="结案" okText="确认结案" cancelText="取消" onCancel={close} confirmLoading={update.isPending}
        onOk={async () => { const v = await form.validateFields(); update.mutate({ status: 'closed', close_summary: v.close_summary }, { onSuccess: close }); }}>
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="close_summary" label="结案摘要" extra="学生现在的状态、支持起了什么作用、之后建议怎么做。" rules={[{ required: true, message: '结案需要写摘要' }]}><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>
      <Modal open={modal === 'refer'} title="转介给专业机构" okText="发出转介" cancelText="取消" onCancel={close} confirmLoading={refer.isPending}
        onOk={async () => refer.mutate(await form.validateFields(), { onSuccess: close })}>
        <p className="muted" style={{ marginBottom: 16 }}>对方只会收到完成接诊所需的最少信息：案件号、脱敏后的学生信息、已做过的支持、转介原因。面谈内容不会发出。</p>
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ include_assessment_summary: false }}>
          <Form.Item name="institution_id" label="转给谁" rules={[{ required: true, message: '请选择机构' }]}><Select options={insts.data?.map((i) => ({ value: i.id, label: `${i.name}（${i.district}）` }))} placeholder="选择已入驻的机构" /></Form.Item>
          <Form.Item name="reason" label="为什么转介" rules={[{ required: true, message: '请写明原因' }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="include_assessment_summary" label="附上问卷摘要（不含分数）" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}

/** P-16 个案：一案一码，所有记录都挂在案件上 */
export default function Cases() {
  const [status, setStatus] = useState<CaseStatus | ''>('');
  const [id, setId] = useState<string | null>(null);
  const canOpen = useAuth((s) => s.me)!.roles.some((r) => (Routes.caseGet.roles as Role[]).includes(r));
  const { data, isLoading } = useGet<Page<CaseSummary>>(['cases', 'list', status], Routes.caseList, { query: { status } });

  return (
    <>
      <PageHead title="个案" sub="每个需要持续支持的同学有一个案件号。谈话、转介、反馈和回访都记在同一条时间线上。">
        <Segmented value={status} onChange={(v) => setStatus(v as CaseStatus | '')} options={[{ value: '', label: '全部' }, { value: 'pending_confirm', label: '待确认' }, { value: 'following', label: '跟进中' }, { value: 'referred', label: '已转介' }, { value: 'closed', label: '已结案' }]} />
      </PageHead>
      <Sheet>
        <Table<CaseSummary> rowKey="id" loading={isLoading} dataSource={data?.items} pagination={false} locale={{ emptyText: <Empty title="这里还没有个案" hint="在“今日待办”里确认提醒后，可以为同学建立个案。" /> }}
          onRow={(r) => ({ onClick: () => canOpen && setId(r.id), style: { cursor: canOpen ? 'pointer' : 'default' } })}
          columns={[
            { title: '案件号', dataIndex: 'case_no', render: (v) => <span className="num">{v}</span> },
            { title: '同学', render: (_, r) => <><b>{r.student.name}</b> <span className="faint">{r.student.class_name}</span></> },
            { title: '支持等级', dataIndex: 'level', render: (v) => <Level level={v} /> },
            { title: '状态', dataIndex: 'status', render: (v: CaseStatus) => <span className={`pill ${STATUS[v].cls}`}>{STATUS[v].text}</span> },
            { title: '主责', dataIndex: 'owner_name' },
            { title: '最近更新', dataIndex: 'updated_at', render: fmtTime },
          ]} />
      </Sheet>
      <CaseDrawer id={id} onClose={() => setId(null)} />
    </>
  );
}
