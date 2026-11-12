import { Table } from 'antd';
import { AuditEvent, Page, Role, Routes } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import { PageHead, Sheet, fmtTime } from '@/components/ui';

const ROLE: Partial<Record<Role, string>> = {
  student: '学生', guardian: '家长', head_teacher: '班主任', psychologist: '心理教师', school_leader: '校领导', school_admin: '学校信息员',
  edu_admin: '教体局', committee: '团委', institution: '协作机构', operator: '平台运营', auditor: '审计员',
};
const PURPOSE: Record<string, string> = { 'PUR-01': '成长支持', 'PUR-02': '危机处置', 'PUR-03': '区域统计', 'PUR-04': '科研', 'PUR-05': '安全审计' };

/** P-22 审计查询：谁在什么时候、出于什么目的、访问了什么。只有留痕，没有业务内容。 */
export default function Audit() {
  const { data, isLoading } = useGet<Page<AuditEvent>>(['audit'], Routes.auditEvents, { query: { limit: 100 } });
  const ev = data?.items ?? [];
  const intact = ev.every((e, i) => i === ev.length - 1 || e.prev_hash === ev[i + 1].hash);
  const denied = ev.filter((e) => e.result === 'deny').length;

  return (
    <>
      <PageHead title="审计查询" sub="每一次敏感数据的读取、每一次写入、每一次被拒绝的访问都记在这里，记录之间用哈希相连，改不了也删不掉。" />
      <div className="cols c-4" style={{ marginBottom: 20 }}>
        <div className={`kpi${intact ? '' : ' lead'}`}><span>记录链</span><b style={{ fontSize: 26, fontFamily: 'var(--sans)', color: intact ? 'var(--pine)' : undefined }}>{intact ? '完整' : '有断点'}</b><em>最近 {ev.length} 条逐条校验</em></div>
        <div className="kpi"><span>被拒绝的访问</span><b>{denied}</b><em>越权或目的码不符</em></div>
      </div>
      <Sheet>
        <Table<AuditEvent> rowKey="id" size="middle" loading={isLoading} dataSource={ev} pagination={{ pageSize: 20, hideOnSinglePage: true }}
          columns={[
            { title: '时间', dataIndex: 'created_at', render: (v) => <span className="num">{fmtTime(v)}</span> },
            { title: '谁', dataIndex: 'actor_role', render: (v: Role | null) => (v ? ROLE[v] ?? v : '未登录') },
            { title: '做了什么', dataIndex: 'action', render: (v) => <code style={{ fontSize: 12 }}>{v}</code> },
            { title: '目的', dataIndex: 'purpose', render: (v) => (v ? PURPOSE[v] ?? v : <span className="faint">—</span>) },
            { title: '结果', dataIndex: 'result', render: (v) => <span className={`pill ${v === 'allow' ? 'ok' : 'stop'}`}>{v === 'allow' ? '允许' : '拒绝'}</span> },
            { title: '指纹', dataIndex: 'hash', render: (v: string) => <code className="faint" style={{ fontSize: 12 }}>{v.slice(0, 10)}</code> },
          ]} />
      </Sheet>
    </>
  );
}
