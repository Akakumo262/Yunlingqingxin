import { Suspense, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes as RouterRoutes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { AlertItem, Page, Role, Routes } from '@yunling/contracts';
import { api, apiMode } from '@/api/client';
import { useAuth } from '@/store/auth';
import { menusFor } from '@/layout/menus';
import { Ridge } from '@/components/ui';
import Login from '@/pages/Login';

const ROLE_NAME: Partial<Record<Role, string>> = {
  head_teacher: '班主任', psychologist: '心理教师', school_leader: '校领导', school_admin: '学校信息员', edu_admin: '教体局',
  committee: '团委', institution: '协作机构', operator: '平台运营', auditor: '安全审计',
};

export default function App() {
  const { me, logout } = useAuth();
  const [mode, setMode] = useState<'http' | 'mock' | null>(null);
  useEffect(() => void apiMode().then(setMode), []);

  const canSeeAlerts = !!me?.roles.some((r) => (Routes.alertList.roles as Role[]).includes(r));
  const open = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api<Page<AlertItem>>(Routes.alertList),
    enabled: canSeeAlerts,
    refetchInterval: 15_000,
    select: (d) => d.items.filter((a) => a.status === 'open' || a.status === 'escalated').length,
  });

  const flag = mode && <div className="mode-flag">{mode === 'mock' ? '内置演示数据' : '已连接后端'}</div>;
  if (!me) return <>{<Login />}{flag}</>;
  const menus = menusFor(me.roles);

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-brand">
          <b>云岭青心</b>
          <span>青少年成长协同平台</span>
        </div>
        <nav aria-label="主导航">
          {menus.map((m) => (
            <NavLink key={m.path} to={m.path} className={({ isActive }) => (isActive ? 'on' : '')}>
              {m.name}
              {m.path === '/today' && !!open.data && <span className="dot">{open.data}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="rail-me">
          <b>{me.name}</b>
          <span>{[ROLE_NAME[me.roles[0]], me.class_name ?? me.school_name ?? me.institution_name].filter(Boolean).join(' · ')}</span>
          <br />
          <button onClick={logout}>退出登录</button>
        </div>
        <Ridge className="rail-ridge" />
      </aside>
      <main className="main">
        <Suspense fallback={<Spin style={{ margin: 80 }} />}>
          <RouterRoutes>
            {menus.map((m) => (
              <Route key={m.path} path={m.path} element={<m.page />} />
            ))}
            <Route path="*" element={<Navigate to={menus[0]?.path ?? '/'} replace />} />
          </RouterRoutes>
        </Suspense>
      </main>
      {flag}
    </div>
  );
}
