import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Image, Video, View } from '@tarojs/components';
import { CONTENT_CHANNEL_LABEL, CONTENT_SOURCE_TYPE_LABEL, ContentDetail, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { playIcon } from '@/components/icons';
import { TONE } from '@/components/ContentRow';

const mmss = (s = 0) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const openOriginal = (url: string, title: string) => {
  if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.assign(url);
    return;
  }
  Taro.navigateTo({ url: `/pages/external/index?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}` });
};

/** P-27 内容详情：正文或视频，底部写明来源、作者、授权 */
export default function Content() {
  const [c, setC] = useState<ContentDetail | null>(null);
  useLoad((q) => void api<ContentDetail>(Routes.contentGet, { params: { id: q.id ?? '' } }).then((d) => (setC(d), Taro.setNavigationBarTitle({ title: CONTENT_CHANNEL_LABEL[d.channel] }))).catch(fail));
  if (!c) return <View className="page" />;

  const ask = () => Taro.reLaunch({ url: `/pages/index/index?tab=ai&q=${encodeURIComponent(`我刚看了《${c.title}》，想再问问`)}` });

  return (
    <View className="page">
      {c.type !== 'article' && (
        c.video_url ? (
          <Video src={c.video_url} style={{ width: '100%', borderRadius: '16px' }} controls />
        ) : (
          <View className={`poster ${TONE[c.channel]}`}>
            <View className="ridge ridge--mid" /><View className="ridge ridge--near" />
            <View className="poster__tag">演示素材，正式内容上线后可播放</View>
            <View className="poster__play"><Image src={playIcon()} /></View>
            <View className="poster__len num">{mmss(c.duration)}</View>
          </View>
        )
      )}
      <View className="h1" style={{ fontSize: '24px', marginTop: c.type === 'article' ? 0 : '16px' }}>{c.title}</View>
      <View className="muted" style={{ margin: '6px 0 20px' }}>{c.author}　{c.minutes} 分钟　适合{c.age_label}</View>

      <View className="prose">{c.body.split('\n').map((p, i) => <View key={i} className="p">{p}</View>)}</View>

      <View className="source faint">
        <View>来源：{c.source}</View>
        {c.source_type && <View>来源类型：{CONTENT_SOURCE_TYPE_LABEL[c.source_type]}</View>}
        {c.source_verified && <View style={{ color: '#14876b' }}>✓ 来源已通过平台核验</View>}
        <View>授权：{c.license}</View>
        {c.reviewed_by && <View>审核：{c.reviewed_by}</View>}
        {c.deadline && <View>截止：{c.deadline}</View>}
        {c.location && <View>地点：{c.location}</View>}
      </View>
      {c.external_url && (
        <View className="btn" style={{ marginTop: '20px' }} onClick={() => openOriginal(c.external_url!, c.title)}>查看原文 / 原资源</View>
      )}
      <View className="btn btn--ghost" style={{ marginTop: '20px' }} onClick={ask}>还有想问的，找助手聊聊</View>
    </View>
  );
}
