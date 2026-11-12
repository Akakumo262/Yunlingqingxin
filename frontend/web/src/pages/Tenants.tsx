import { Table } from 'antd';
import { Routes, Tenant } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import { PageHead, Sheet } from '@/components/ui';

const TYPE = { education: '教体局', school: '学校', committee: '团委', institution: '机构' } as const;

/** P-21 开通管理：每个单位一个独立的数据空间 */
export default function Tenants() {
  const { data, isLoading } = useGet<Tenant[]>(['tenants'], Routes.tenantList);
  return (
    <>
      <PageHead title="开通管理" sub="每个单位的数据彼此隔离。运营能看到开通情况，看不到任何学生的心理数据。" />
      <Sheet>
        <Table<Tenant> rowKey="id" loading={isLoading} dataSource={data} pagination={false}
          columns={[
            { title: '单位', dataIndex: 'name', render: (v) => <b>{v}</b> },
            { title: '类型', dataIndex: 'type', render: (v: Tenant['type']) => TYPE[v] },
            { title: '学生人数', dataIndex: 'student_count', render: (v) => <span className="num">{v || '—'}</span> },
            { title: '开通日期', dataIndex: 'opened_at', render: (v) => <span className="num">{v}</span> },
            { title: '状态', dataIndex: 'status', render: (v) => <span className={`pill ${v === 'active' ? 'ok' : 'wait'}`}>{v === 'active' ? '使用中' : '开通中'}</span> },
          ]} />
      </Sheet>
    </>
  );
}
