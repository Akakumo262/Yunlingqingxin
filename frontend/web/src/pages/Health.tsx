import { Routes, SystemHealth } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import { Bar, PageHead, Sheet, Stat } from '@/components/ui';

const ST = { ok: { text: '正常', cls: 'ok' }, slow: { text: '偏慢', cls: 'wait' }, down: { text: '不可用', cls: 'stop' } } as const;

/** 系统状态：运营每天看一眼。最要紧的是紧急通知有没有送到人手里。 */
export default function Health() {
  const { data: h } = useGet<SystemHealth>(['health'], Routes.systemHealth);
  if (!h) return <PageHead title="系统状态" />;
  const bad = h.services.filter((s) => s.status !== 'ok');

  return (
    <>
      <PageHead title="系统状态" sub={bad.length ? `有 ${bad.length} 项需要留意：${bad.map((s) => s.name).join('、')}。` : '所有服务运行正常。'} />
      <div className="cols c-4" style={{ marginBottom: 20 }}>
        <Stat lead label="近 30 天可用率" value={`${(h.uptime_30d * 100).toFixed(2)}%`} note="目标 99.9%" />
        <Stat label="紧急通知送达率" value={`${(h.l3_notice_delivery_rate * 100).toFixed(1)}%`} note="站内信 + 短信双通道" tone={h.l3_notice_delivery_rate < 0.98 ? 'hot' : 'ok'} />
        <Stat label="队列里等着的" value={h.queues.reduce((a, q) => a + q.depth, 0)} note="个任务" />
        <Stat label="失败的任务" value={h.queues.reduce((a, q) => a + q.failed, 0)} note="个，会自动重试" />
      </div>
      <div className="cols c-2-1">
        <Sheet title="服务" aside="响应时间">
          {h.services.map((s) => (
            <div className="svc" key={s.name}>
              <b>{s.name}</b>
              <span className={`pill ${ST[s.status].cls}`}>{ST[s.status].text}</span>
              <Bar value={Math.min(1, s.latency_ms / 2500)} tone={s.status === 'ok' ? 'ok' : s.status === 'slow' ? 'rape' : 'hot'} />
              <span className="num muted" style={{ textAlign: 'right' }}>{s.latency_ms} ms</span>
            </div>
          ))}
        </Sheet>
        <Sheet title="后台任务">
          {h.queues.map((q) => (
            <div className="row" key={q.name}>
              <div className="grow"><b>{q.name}</b></div>
              <span className="muted">等待 <b className="num">{q.depth}</b></span>
              <span className={q.failed ? 'due late' : 'faint'}>失败 {q.failed}</span>
            </div>
          ))}
          <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>“到期删除”每天凌晨运行：超过保留期限的对话、撤回同意后的记录在这里清理。</p>
        </Sheet>
      </div>
    </>
  );
}
