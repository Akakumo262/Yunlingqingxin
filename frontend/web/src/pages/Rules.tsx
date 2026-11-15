import { Switch } from 'antd';
import { RiskRule, Role, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import { Bar, Level, PageHead, Sheet, Stat } from '@/components/ui';

const SOURCE = { one_click_help: '学生主动求助', check_in_rule: '心情记录', assessment_rule: '成长问卷', teacher_observation: '老师观察', ai_guardrail: '助手对话' } as const;

/** 提醒规则：系统什么时候提示老师、提示给谁。每条都用人话写清楚，老师的“不需要关注”会反过来检验规则。 */
export default function Rules() {
  const canEdit = useAuth((s) => s.me)!.roles.some((r) => (Routes.riskRuleUpdate.roles as Role[]).includes(r));
  const { data } = useGet<RiskRule[]>(['rules'], Routes.riskRuleList);
  const toggle = useAct((r: RiskRule) => api(Routes.riskRuleUpdate, { params: { id: r.id }, body: { enabled: !r.enabled } }), ['rules'], '已更新');
  const rules = data ?? [];
  const hits = rules.reduce((a, r) => a + r.hits_30d, 0), dismissed = rules.reduce((a, r) => a + r.dismissed_30d, 0);

  return (
    <>
      <PageHead title="提醒规则" sub="规则只负责提醒，不负责下结论。每一条提醒都要有老师确认之后，才会进入下一步。" />
      <div className="cols c-4" style={{ marginBottom: 20 }}>
        <Stat lead label="启用中的规则" value={rules.filter((r) => r.enabled).length} note={`共 ${rules.length} 条`} />
        <Stat label="近 30 天提醒" value={hits} note="条" />
        <Stat label="被标为不需要关注" value={dismissed} note="条，不追责" />
        <Stat label="规则准不准" value={hits ? `${Math.round((1 - dismissed / hits) * 100)}%` : '—'} note="老师确认有必要的比例" tone="ok" />
      </div>
      <Sheet>
        {rules.map((r) => {
          const rate = r.hits_30d ? r.dismissed_30d / r.hits_30d : 0, noisy = rate > 0.4;
          return (
            <div className="row" key={r.id} style={{ alignItems: 'flex-start', opacity: r.enabled ? 1 : 0.55 }}>
              <Level level={r.level} />
              <div className="grow">
                <b>{r.name}</b> <span className="faint">来自{SOURCE[r.source]}</span>
                <small>{r.description}</small>
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, alignItems: 'center', marginTop: 8, maxWidth: 520 }}>
                  <span className="faint" style={{ fontSize: 12 }}>30 天提醒 <b className="num" style={{ color: 'var(--ink)' }}>{r.hits_30d}</b> 次，其中 <b className="num" style={{ color: 'var(--ink)' }}>{r.dismissed_30d}</b> 次不需要关注</span>
                  <Bar value={rate} tone={noisy ? 'hot' : 'ok'} />
                </div>
                {noisy && <span className="pill stop" style={{ marginTop: 6 }}>可能太敏感，建议和心理教师一起看看</span>}
              </div>
              {r.level === 'L3' ? <span className="pill">安全底线，不能关闭</span> : <Switch checked={r.enabled} disabled={!canEdit} loading={toggle.isPending && toggle.variables?.id === r.id} onChange={() => toggle.mutate(r)} />}
            </div>
          );
        })}
      </Sheet>
      {!canEdit && <p className="faint" style={{ marginTop: 12 }}>规则的开关由校领导和平台运营调整。你觉得哪条不准，可以在“帮助”里反馈。</p>}
    </>
  );
}
