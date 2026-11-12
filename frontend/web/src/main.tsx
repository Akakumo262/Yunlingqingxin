import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { tokens } from '../../design/tokens';
import './styles.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0, refetchOnWindowFocus: false } } });
const c = tokens.color;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: c.lake600, colorError: c.camellia, colorSuccess: c.pine, colorWarning: '#C98A00', colorInfo: c.lake600,
          colorTextBase: c.ink, colorTextSecondary: c.ink2, colorBorder: c.line, colorBorderSecondary: c.line, colorBgLayout: c.sky,
          borderRadius: tokens.radius.control, borderRadiusLG: tokens.radius.card, fontFamily: tokens.font.sans, fontSize: 14, controlHeight: 38,
        },
        components: {
          Button: { fontWeight: 600, primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none' },
          Table: { headerBg: 'transparent', headerColor: c.ink3, headerSplitColor: 'transparent', rowHoverBg: c.lake50, cellPaddingBlock: 14 },
          Drawer: { paddingLG: 28 },
          Modal: { titleFontSize: 18 },
          Segmented: { itemSelectedBg: c.indigo900, itemSelectedColor: '#fff', trackBg: '#E8EDF6' },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
