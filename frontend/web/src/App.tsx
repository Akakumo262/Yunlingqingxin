import { Fragment, Suspense, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes as RouterRoutes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { AlertItem, NoticeList, Page, ROLE_LABEL, Role, Routes } from '@yunling/contracts';
import { api, apiMode } from '@/api/client';
import { useAuth } from '@/store/auth';
import { menusFor } from '@/layout/menus';
import { HelpDrawer, NoticeDrawer } from '@/layout/Drawers';
import { Icon, Ridge } from '@/components/ui';
import Login from '@/pages/Login';

export default function App() {
  const { me, logout } = useAuth();
  const [mode, setMode] = useState<'http' | 'mock' | null>(null);
  const [drawer, setDrawer] = useState<'notice' | 'help' | null>(null);
  useEffect(() => void apiMode().then(setMode), []);

  const canSeeAlerts = !!me?.roles.some((r) => (Routes.alertList.roles as Role[]).includes(r));
  const open = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api<Page<AlertItem>>(Routes.alertList),
    enabled: canSeeAlerts,
    refetchInterval: 15_000,
    select: (d) => d.items.filter((a) => a.status === 'open' || a.status === 'escalated').length,
  });
  const unread = useQuery({ queryKey: ['notices'], queryFn: () => api<NoticeList>(Routes.noticeList), enabled: !!me, refetchInterval: 20_000, select: (d) => d.unread });

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
          {menus.map((m, i) => (
            <Fragment key={m.path}>
              {m.group !== menus[i - 1]?.group && <h6>{m.group}</h6>}
              <NavLink to={m.path} className={({ isActive }) => (isActive ? 'on' : '')}>
                <Icon name={m.icon} />
                {m.name}
                {m.path === '/today' && !!open.data && <span className="dot">{open.data}</span>}
              </NavLink>
            </Fragment>
          ))}
        </nav>
        <div className="rail-tools">
          <button onClick={() => setDrawer('notice')}><Icon name="bell" size={16} />通知{!!unread.data && <span className="dot">{unread.data}</span>}</button>
          <button onClick={() => setDrawer('help')}><Icon name="help" size={16} />帮助</button>
        </div>
        <div className="rail-me">
          <b>{me.name}</b>
          <span>{[ROLE_LABEL[me.roles[0]], me.class_name ?? me.school_name ?? me.institution_name].filter(Boolean).join(' · ')}</span>
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
      <NoticeDrawer open={drawer === 'notice'} onClose={() => setDrawer(null)} allowed={menus.map((m) => m.path)} />
      <HelpDrawer open={drawer === 'help'} onClose={() => setDrawer(null)} />
      {flag}
    </div>
  );
}
