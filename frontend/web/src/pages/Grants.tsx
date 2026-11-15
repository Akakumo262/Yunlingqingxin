import { Button } from 'antd';
import { AccessGrant, Role, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import { Empty, PageHead, Sheet, Stat, fmtTime } from '@/components/ui';

/** 紧急访问：紧急情况下临时看一个不归自己管的个案。到时间自动收回，事后必须有人复核。 */
export default function Grants() {
  const isAuditor = useAuth((s) => s.me)!.roles.includes(Role.auditor);
  const { data } = useGet<AccessGrant[]>(['grants'], Routes.accessGrantList);
  const review = useAct((id: string) => api(Routes.accessGrantReview, { params: { id } }), ['grants'], '已复核');
  const list = data ?? [], now = Date.now();

  return (
    <>
      <PageHead title="紧急访问" sub="规则：理由不少于 20 个字，最长 120 分钟，到时间自动收回。每一次都会通知审计员和校领导，并在事后复核。" />
      <div className="cols c-4" style={{ marginBottom: 20 }}>
        <Stat lead label="现在还开着" value={list.filter((g) => Date.parse(g.expires_at) > now).length} note="次" />
        <Stat label="等待复核" value={list.filter((g) => !g.reviewed).length} note="次" tone={list.some((g) => !g.reviewed) ? 'hot' : undefined} />
        <Stat label="累计" value={list.length} note="次" />
      </div>
      <Sheet>
        {list.length === 0 && <Empty title="没有紧急访问记录" hint="这是好事：说明日常授权够用。" />}
        {list.map((g) => {
          const live = Date.parse(g.expires_at) > now;
          return (
            <div className="row" key={g.id} style={{ alignItems: 'flex-start' }}>
              <span className={`pill ${live ? 'stop' : 'off'}`}>{live ? '访问中' : '已收回'}</span>
              <div className="grow">
                <b>{g.user_name}</b> <span className="faint">案件号 <span className="num">{g.case_no}</span></span>
                <small style={{ color: 'var(--ink)' }}>{g.reason}</small>
                <small className="faint">{fmtTime(g.created_at)} 开始 · {fmtTime(g.expires_at)} {live ? '自动收回' : '已自动收回'}</small>
              </div>
              {g.reviewed ? <span className="pill ok">{g.reviewed_by} 已复核</span> : isAuditor ? <Button type="primary" loading={review.isPending && review.variables === g.id} onClick={() => review.mutate(g.id)}>复核通过</Button> : <span className="pill wait">等待审计复核</span>}
            </div>
          );
        })}
      </Sheet>
    </>
  );
}
