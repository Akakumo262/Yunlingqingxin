import { Routes, SupervisionItem } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import { Empty, PageHead, Sheet } from '@/components/ui';

const KIND = { overdue_alert: '提醒超时未确认', zero_record: '长期没有记录' } as const;

/** P-19 督办：不是通报批评，是问一句“需不需要支持” */
export default function Supervision() {
  const { data } = useGet<SupervisionItem[]>(['supervisions'], Routes.supervisionList);
  return (
    <>
      <PageHead title="督办" sub="系统发现可能需要帮一把的学校。这里不显示任何学生信息，先打个电话问问情况。" />
      <Sheet>
        {data?.length === 0 && <Empty title="目前没有需要跟进的学校" />}
        {data?.map((s) => (
          <div className="row" key={s.id}>
            <div className="grow">
              <b>{s.school_name}</b> <span className="pill wait">{KIND[s.kind]}</span>
              <small>{s.detail}，自 {s.since} 起</small>
            </div>
            <span className={`pill ${s.status === 'open' ? 'stop' : 'ok'}`}>{s.status === 'open' ? '待联系' : '已联系'}</span>
          </div>
        ))}
      </Sheet>
    </>
  );
}
