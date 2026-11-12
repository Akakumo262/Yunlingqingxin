import { useState } from 'react';
import { Button, Segmented } from 'antd';
import { INSTITUTION_TYPE_LABEL, Institution, InstitutionStatus, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { Empty, PageHead, Sheet } from '@/components/ui';

const STATUS: Record<InstitutionStatus, { text: string; cls: string }> = {
  applied: { text: '待审核', cls: 'wait' }, approved: { text: '已入驻', cls: 'ok' }, rejected: { text: '未通过', cls: 'stop' }, offline: { text: '已下架', cls: 'off' },
};

/** P-34 机构入驻：核验资质后才出现在学生和家长能看到的目录里 */
export default function Institutions() {
  const { data } = useGet<Institution[]>(['institutions', 'all'], Routes.institutionApplications);
  const [tab, setTab] = useState<'applied' | 'approved'>('applied');
  const review = useAct((v: { id: string; approve: boolean }) => api(Routes.institutionReview, { params: { id: v.id }, body: { approve: v.approve } }), ['institutions'], '已处理');
  const list = data?.filter((i) => (tab === 'applied' ? i.status === 'applied' : i.status !== 'applied')) ?? [];

  return (
    <>
      <PageHead title="机构入驻" sub="医院、咨询机构、社工和公益组织。入驻后只能看到学校授权给它的个案，不能浏览学校名册。">
        <Segmented value={tab} onChange={(v) => setTab(v as typeof tab)} options={[{ value: 'applied', label: `待审核 ${data?.filter((i) => i.status === 'applied').length ?? ''}` }, { value: 'approved', label: '已处理' }]} />
      </PageHead>
      <Sheet>
        {list.length === 0 && <Empty title={tab === 'applied' ? '没有待审核的申请' : '还没有处理过的机构'} />}
        {list.map((i) => (
          <div className="row" key={i.id} style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <b>{i.name}</b><span className="pill">{INSTITUTION_TYPE_LABEL[i.type]}</span><span className={`pill ${STATUS[i.status].cls}`}>{STATUS[i.status].text}</span>
                <span className="faint">{i.district}</span>
              </div>
              <small style={{ marginTop: 4 }}>{i.intro}</small>
              <small>服务：{i.services.join('、') || '未填写'}{i.license_no && `　资质编号：${i.license_no}`}{i.contact_name && `　联系人：${i.contact_name}`}</small>
            </div>
            {i.status === 'applied' && (
              <div className="row-actions">
                <Button type="primary" onClick={() => review.mutate({ id: i.id, approve: true })}>资质无误，通过</Button>
                <Button danger onClick={() => review.mutate({ id: i.id, approve: false })}>不通过</Button>
              </div>
            )}
          </div>
        ))}
      </Sheet>
    </>
  );
}
