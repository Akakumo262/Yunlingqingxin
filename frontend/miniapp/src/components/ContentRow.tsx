import Taro from '@tarojs/taro';
import { Image, View } from '@tarojs/components';
import { CONTENT_CHANNEL_LABEL, ContentCard, ContentChannel } from '@yunling/contracts';
import { playIcon } from './icons';

/** 每个频道一种封面底色，没有封面图时也好认 */
export const TONE: Record<ContentChannel, string> = {
  psychology: '', learning: 'poster--pine', career: '', policy: 'poster--rape', culture: 'poster--pine',
  five_edu: 'poster--rape', role_model: 'poster--camellia', parent: 'poster--camellia', teacher: '',
};
const KIND = { article: '读', video: '看', audio: '听' } as const;
export const openContent = (id: string) => Taro.navigateTo({ url: `/pages/content/index?id=${id}` });

/** 内容列表里的一行：方形封面 + 标题 + 来源 */
export function ContentRow({ c }: { c: ContentCard }) {
  return (
    <View className="list-item" onClick={() => openContent(c.id)}>
      <View className={`thumb poster ${TONE[c.channel]}`} style={{ height: undefined }}>
        <View className="ridge ridge--near" />
        {c.type !== 'article' && <View className="poster__play" style={{ left: '10px', bottom: '10px', width: '26px', height: '26px' }}><Image src={playIcon()} style={{ width: '13px', height: '13px', marginLeft: '2px' }} /></View>}
      </View>
      <View className="grow">
        <View style={{ fontWeight: 600, lineHeight: 1.4 }}>{c.title}</View>
        <View className="faint" style={{ marginTop: '4px' }}>{CONTENT_CHANNEL_LABEL[c.channel]}　{KIND[c.type]} {c.minutes} 分钟　{c.source}</View>
      </View>
    </View>
  );
}
