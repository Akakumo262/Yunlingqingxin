import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Image, View } from '@tarojs/components';
import { Circle, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { icon } from '@/components/icons';

const KIND = { class: '班级圈', topic: '主题圈', activity: '活动圈' } as const;
const top = () => (Taro.getSystemInfoSync().statusBarHeight || 0) + 28;

/** P-30 成长圈：有边界的圈子，不是陌生人社交 */
export default function Circles() {
  const [list, setList] = useState<Circle[] | null>(null);
  useEffect(() => void api<Circle[]>(Routes.circleList).then(setList).catch(fail), []);

  return (
    <View className="page page--bar" style={{ paddingTop: `${top()}px` }}>
      <View className="h1">成长圈</View>
      <View className="muted">在这里大家只看得到你的昵称。没有私信，发的话先由版主看过。</View>

      <View style={{ marginTop: '16px' }}>
        {list?.length === 0 && (
          <View className="card">
            <View style={{ fontWeight: 600 }}>你还没有打开成长圈</View>
            <View className="muted">在“我的—隐私与授权”里打开后，就能看到圈子了。</View>
            <View className="btn btn--ghost" style={{ marginTop: '12px' }} onClick={() => Taro.navigateTo({ url: '/pages/privacy/index' })}>去看看</View>
          </View>
        )}
        {list?.map((c) => (
          <View key={c.id} className="card" style={{ marginBottom: '12px' }} onClick={() => Taro.navigateTo({ url: `/pages/circle/index?id=${c.id}&name=${encodeURIComponent(c.name)}` })}>
            <View className="row">
              <View className="grow">
                <View className="faint">{KIND[c.type]}　{c.member_count} 人</View>
                <View className="h2" style={{ marginTop: '2px' }}>{c.name}</View>
              </View>
              <Image className="icon" src={icon('chevron', '#8590A8')} />
            </View>
            <View className="muted" style={{ marginTop: '4px' }}>{c.intro}</View>
          </View>
        ))}
      </View>
    </View>
  );
}
