import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import type { PropsWithChildren } from 'react';
import { useLanguage } from '../i18n';

export default function AntdLocaleBoundary({ children }: PropsWithChildren) {
  const { language } = useLanguage();

  return <ConfigProvider locale={language === 'zh-CN' ? zhCN : enUS}>{children}</ConfigProvider>;
}
