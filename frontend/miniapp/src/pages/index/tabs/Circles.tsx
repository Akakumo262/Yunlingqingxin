import { useEffect, useState } from 'react';
import { useDidShow } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';
import { Circle, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { avatarColor, icon } from '@/components/icons';
import { Empty, Section, ago, go } from '@/components/kit';
import { px, safeTop } from '@/utils/ui';

const KIND = { class: '班级圈', topic: '主题圈', activity: '活动圈' } as const;

/** P-30 成长圈：有边界的圈子，不是陌生人社交。班级圈排在最前面。 */
export default function Circles() {
  const [list, setList] = useState<Circle[] | null>(null);
  const load = () => api<Circle[]>(Routes.circleList).then(setList).catch(fail);
  useEffect(() => void load(), []);
  useDidShow(() => void (list && load()));

  const mine = list?.filter((c) => c.type !== 'topic') ?? [], topics = list?.filter((c) => c.type === 'topic') ?? [];
  const Item = ({ c, i }: { c: Circle; i: number }) => (
    <View className="list-item" onClick={() => go('circle', { id: c.id, name: c.name })}>
      <View className="avatar" style={{ background: avatarColor(i + 1), borderRadius: px('14px') }}>{c.name.replace(/[（(].*/, '').slice(0, 1)}</View>
      <View className="grow">
        <View className="bold">{c.name}</View>
        <View className="faint ellipsis">{c.intro}</View>
        <View className="faint">{KIND[c.type]}　{c.member_count} 人　{c.post_count ?? 0} 条{c.last_post_at ? `　${ago(c.last_post_at)}有新发言` : ''}</View>
      </View>
      <Image className="icon" src={icon('chevron', '#8590A8')} />
    </View>
  );

  return (
    <View className="page page--bar" style={{ paddingTop: `${safeTop()}px` }}>
      <View className="h1">成长圈</View>
      <View className="muted">在这里大家只看得到你的昵称。没有私信；你的前三条发言会先由版主看过。</View>

      {list?.length === 0 && (
        <View className="card mt16">
          <Empty title="你还没有打开成长圈" hint="在“隐私与授权”里打开后，就能看到圈子了。" kind="aesthetic" />
          <View className="btn btn--ghost" onClick={() => go('privacy')}>去打开</View>
        </View>
      )}
      {mine.length > 0 && <><Section title="我的班和活动" /><View className="card">{mine.map((c, i) => <Item key={c.id} c={c} i={i} />)}</View></>}
      {topics.length > 0 && <><Section title="主题圈" aside="全平台的同学，全部匿名" /><View className="card">{topics.map((c, i) => <Item key={c.id} c={c} i={i + 2} />)}</View></>}
      {!!list?.length && (
        <View className="notice mt16">
          <Text className="bold">圈子里的三条规矩　</Text>不留联系方式和照片；有话好好说；看到让你担心的发言，点帖子右上角的小旗子告诉版主。
        </View>
      )}
    </View>
  );
}
