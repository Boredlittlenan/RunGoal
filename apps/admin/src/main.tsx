import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#54a52f',
          colorInfo: '#277f6d',
          colorBgLayout: '#f1f3ed',
          colorText: '#18221b',
          borderRadius: 12,
          borderRadiusLG: 18,
          fontFamily: 'Inter, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Card: { headerBg: 'transparent' },
          Table: { headerBg: '#f3f5f0', headerColor: '#5d6b61' },
          Menu: { darkItemBg: '#10251a', darkSubMenuItemBg: '#10251a', darkItemSelectedBg: '#b7ef45', darkItemSelectedColor: '#17310c' },
        },
      }}
    >
      <BrowserRouter basename="/admin" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
