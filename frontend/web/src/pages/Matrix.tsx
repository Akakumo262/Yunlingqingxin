import { useState } from 'react';
import { Input } from 'antd';
import { CoreRoutes, MoreRoutes, PURPOSE_LABEL, ROLE_LABEL, Role, RouteDef } from '@yunling/contracts';
import { PageHead, Stat } from '@/components/ui';

const ROLES = Object.values(Role) as Role[];
const GROUPS: [string, Record<string, RouteDef>][] = [['第一批：安全底线与主流程', CoreRoutes], ['第二批：日常使用', MoreRoutes]];
const total = GROUPS.reduce((a, [, g]) => a + Object.keys(g).length, 0);

/** 权限矩阵：直接从接口清单生成，和服务端校验用的是同一份定义，所以不会过期。 */
export default function Matrix() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const hit = (name: string, d: RouteDef) => (!q.trim() || (name + d.path).toLowerCase().includes(q.trim().toLowerCase())) && (!role || d.roles === 'public' || d.roles.length === 0 || d.roles.includes(role));
  const all = GROUPS.flatMap(([, g]) => Object.values(g));

  return (
    <>
      <PageHead title="权限矩阵" sub="谁能调用哪个接口、必须带什么目的码。点表头的角色，只看这个角色能做的事。">
        <Input.Search style={{ width: 240 }} allowClear placeholder="搜接口名或路径" value={q} onChange={(e) => setQ(e.target.value)} />
      </PageHead>
      <div className="cols c-4" style={{ marginBottom: 20 }}>
        <Stat lead label="接口" value={total} note="个，定义在 contracts 一处" />
        <Stat label="角色" value={ROLES.length} note="种" />
        <Stat label="要求目的码" value={all.filter((d) => d.purpose).length} note="个接口" />
        <Stat label="免登录" value={all.filter((d) => d.roles === 'public').length} note="个接口" />
      </div>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th>接口</th>
              <th>目的</th>
              {ROLES.map((r) => <th key={r} style={{ cursor: 'pointer', background: role === r ? 'var(--lake-600)' : undefined }} onClick={() => setRole(role === r ? null : r)}>{ROLE_LABEL[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map(([title, g]) => {
              const rows = Object.entries(g).filter(([n, d]) => hit(n, d));
              return rows.length === 0 ? null : [
                <tr className="grp" key={title}><td colSpan={ROLES.length + 2}>{title}（{rows.length}）</td></tr>,
                ...rows.map(([name, d]) => (
                  <tr key={name}>
                    <td><b>{name}</b><code>{d.method} {d.path}</code></td>
                    <td>{d.purpose ? <span className="pill">{PURPOSE_LABEL[d.purpose]}</span> : <span className="n">—</span>}</td>
                    {ROLES.map((r) => (d.roles === 'public' ? <td key={r} className="pub">公开</td> : d.roles.length === 0 ? <td key={r} className="pub">登录</td> : d.roles.includes(r) ? <td key={r} className="y">●</td> : <td key={r} className="n">·</td>))}
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
