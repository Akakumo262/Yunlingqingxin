import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Button, Text, View, WebView } from '@tarojs/components';

/** 外部资讯跳转页。微信端要求把来源域名加入业务域名白名单；未配置时保留复制链接兜底。 */
export default function External() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('原文 / 原资源');
  useLoad((query) => {
    const nextUrl = query.url ? decodeURIComponent(query.url) : '';
    const nextTitle = query.title ? decodeURIComponent(query.title) : '原文 / 原资源';
    setUrl(nextUrl);
    setTitle(nextTitle);
    Taro.setNavigationBarTitle({ title: nextTitle.slice(0, 16) });
  });

  if (!url) return <View className="page"><View className="card">正在准备原文链接…</View></View>;
  const openInBrowser = () => {
    if (typeof window !== 'undefined') {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) window.location.assign(url);
    }
  };
  return (
    <View className="page" style={{ padding: 0 }}>
      <WebView src={url} />
      <View className="card" style={{ margin: '24px 32px' }}>
        <View className="h2">{title}</View>
        <View className="faint" style={{ marginTop: '8px' }}>原文由经过核验的公开来源发布。报名资格、截止时间和页面内容以原站为准。</View>
        {process.env.TARO_ENV === 'h5' && <Button size="mini" style={{ marginTop: '16px' }} onClick={openInBrowser}>在浏览器打开原文</Button>}
        <Button size="mini" style={{ marginTop: '16px' }} onClick={() => Taro.setClipboardData({ data: url })}>复制原文链接</Button>
        <Text className="faint" style={{ display: 'block', marginTop: '8px' }}>{url}</Text>
      </View>
    </View>
  );
}
