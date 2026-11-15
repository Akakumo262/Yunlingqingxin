import { useState } from 'react';
import { Button, Form, Input, Modal, Select } from 'antd';
import { EXPORT_SCOPES, EXPORT_SCOPE_LABEL, ExportJob, ExportStatus, ROLE_LABEL, Role, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import { Empty, PageHead, Sheet, Stat, ago, fmtTime } from '@/components/ui';

const STATUS: Record<ExportStatus, { text: string; cls: string }> = { pending: { text: '等待批准', cls: 'wait' }, approved: { text: '已批准', cls: 'ok' }, rejected: { text: '没有通过', cls: 'stop' }, expired: { text: '已过期', cls: 'off' } };
const WHAT: Record<string, string> = { class_report: '班级心情与活动参与的汇总数字，不含任何学生姓名。', case_summary: '个案的案件号、状态和时间线摘要，学生姓名脱敏，不含面谈内容。', region_report: '区域月度报告全文，只有聚合数字。' };

/** 数据导出：先申请、再批准、带水印、限时限次。不能批准自己的申请。 */
export default function Exports() {
  const me = useAuth((s) => s.me)!;
  const has = (roles: readonly Role[] | 'public') => me.roles.some((r) => (roles as Role[]).includes(r));
  const canAsk = has(Routes.exportCreate.roles), canApprove = has(Routes.exportApprove.roles);
  const { data } = useGet<ExportJob[]>(['exports'], Routes.exportList);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ExportJob | null>(null);
  const [form] = Form.useForm();
  const ask = useAct((body: object) => api(Routes.exportCreate, { body }), ['exports'], '申请已提交，批准后会通知你');
  const decide = useAct((v: { id: string; approve: boolean }) => api(Routes.exportApprove, { params: { id: v.id }, body: { approve: v.approve } }), ['exports'], '已处理，申请人会收到通知');
  const jobs = data ?? [];

  return (
    <>
      <PageHead title="数据导出" sub="数据离开平台之前要过三道：说明理由、另一个人批准、文件带上导出人的水印。批准后 24 小时内有效，最多下载 3 次。">
        {canAsk && <Button type="primary" onClick={() => (form.resetFields(), setOpen(true))}>申请导出</Button>}
      </PageHead>
      <div className="cols c-4" style={{ marginBottom: 20 }}>
        <Stat lead label="等待批准" value={jobs.filter((j) => j.status === 'pending').length} note="条" />
        <Stat label="已批准" value={jobs.filter((j) => j.status === 'approved').length} note="条" />
        <Stat label="没有通过" value={jobs.filter((j) => j.status === 'rejected').length} note="条" />
      </div>
      <Sheet>
        {jobs.length === 0 && <Empty title="还没有导出申请" hint="每一次导出都会留在这里，审计员也看得到。" />}
        {jobs.map((j) => {
          const own = j.requester_name === me.name;
          return (
            <div className="row" key={j.id} style={{ alignItems: 'flex-start' }}>
              <span className={`pill ${STATUS[j.status].cls}`}>{STATUS[j.status].text}</span>
              <div className="grow">
                <b>{EXPORT_SCOPE_LABEL[j.scope]}</b> <span className="faint">{j.requester_name}（{ROLE_LABEL[j.requester_role]}）· {ago(j.created_at)}</span>
                <small>理由：{j.reason}</small>
                {j.status === 'approved' && <small className="faint">水印：{j.watermark} · {j.expires_at && `${fmtTime(j.expires_at)} 前有效`} · 还能下载 {j.downloads_left} 次</small>}
              </div>
              <div className="row-actions">
                {j.status === 'pending' && canApprove && !own && <><Button type="primary" onClick={() => decide.mutate({ id: j.id, approve: true })}>批准</Button><Button onClick={() => decide.mutate({ id: j.id, approve: false })}>不批准</Button></>}
                {j.status === 'pending' && canApprove && own && <span className="faint">不能批准自己的申请</span>}
                {j.status === 'approved' && <Button onClick={() => setView(j)}>预览文件</Button>}
              </div>
            </div>
          );
        })}
      </Sheet>

      <Modal open={open} title="申请导出" okText="提交申请" cancelText="取消" confirmLoading={ask.isPending} onCancel={() => setOpen(false)}
        onOk={async () => ask.mutate(await form.validateFields(), { onSuccess: () => setOpen(false) })}>
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ scope: 'class_report' }}>
          <Form.Item name="scope" label="导出什么"><Select options={EXPORT_SCOPES.map((s) => ({ value: s, label: EXPORT_SCOPE_LABEL[s] }))} /></Form.Item>
          <Form.Item noStyle shouldUpdate>{() => <p className="muted" style={{ marginBottom: 16 }}>{WHAT[form.getFieldValue('scope')]}</p>}</Form.Item>
          <Form.Item name="reason" label="用来做什么" rules={[{ required: true, min: 4, message: '写清楚用途' }]}><Input.TextArea rows={3} maxLength={200} placeholder="比如：期末家长会上介绍班级这学期的整体情况。" /></Form.Item>
        </Form>
      </Modal>

      <Modal open={!!view} onCancel={() => setView(null)} footer={null} width={640} title="带水印的文件预览">
        {view && (
          <div className="paper" style={{ padding: '36px 40px', boxShadow: 'none', border: '1px solid var(--line)' }}>
            <div className="wm">{Array.from({ length: 24 }, (_, i) => <span key={i}>{view.watermark}</span>)}</div>
            <header><h1 style={{ fontSize: 20 }}>{EXPORT_SCOPE_LABEL[view.scope]}</h1><p>导出人 {view.requester_name} · {fmtTime(view.created_at)}</p></header>
            <p>{WHAT[view.scope]}</p>
            <p>演示环境不生成真实文件。正式环境中，文件由后端生成，每一页都带上面这行水印，下载次数和有效期由服务端控制。</p>
          </div>
        )}
      </Modal>
    </>
  );
}
