import { useState } from 'react';
import { useDidShow, useLoad } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';
import { Announcement, Notice, NoticeKind, NoticeList, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { IconName, icon } from '@/components/icons';
import { Empty, Seg, ago, openLink } from '@/components/kit';
import { px } from '@/utils/ui';

const ICON: Record<NoticeKind, [IconName, string]> = {
  help: ['heart', '#D9366B'], alert: ['bell', '#D9366B'], case: ['book', '#1F5FD1'], referral: ['building', '#1F5FD1'], activity: ['calendar', '#14876B'],
  content: ['book', '#1F5FD1'], circle: ['circle', '#6B4FD8'], note: ['mail', '#C98A00'], appointment: ['clock', '#1F5FD1'], system: ['bell', '#4A5878'],
};

/** 通知：老师的回应、活动提醒、圈子里的回复，都在这里。点开会带你去对应的地方。 */
export default function Notices() {
  const [tab, setTab] = useState<'mine' | 'ann'>('mine');
  const [list, setList] = useState<NoticeList | null>(null);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const load = () => {
    api<NoticeList>(Routes.noticeList).then(setList).catch(fail);
    api<Announcement[]>(Routes.announcementList).then(setAnns).catch(fail);
  };
  useLoad((q) => q.tab === 'ann' && setTab('ann'));
  useDidShow(load);

  const open = async (n: Notice) => {
    if (!n.read) await api(Routes.noticeRead, { params: { id: n.id } }).catch(() => undefined);
    load();
    openLink(n.link);
  };
  const readAll = () => api(Routes.noticeReadAll).then(load).catch(fail);

  return (
    <View className="page">
      <Seg value={tab} onChange={setTab} options={[['mine', `给我的${list?.unread ? ` ${list.unread}` : ''}`], ['ann', '公告']]} />
      {tab === 'mine' && (
        <>
          {!!list?.unread && <View className="link right mt12" onClick={readAll}>全部标为已读</View>}
          {list?.items.length === 0 && <Empty title="现在没有新的通知" hint="老师回应你、活动快开始时，这里会提醒你。" />}
          <View className="mt12">
            {list?.items.map((n) => (
              <View key={n.id} className="card row" style={{ marginBottom: px('10px'), alignItems: 'flex-start', opacity: n.read ? 0.72 : 1 }} onClick={() => open(n)}>
                <Image className="icon" src={icon(ICON[n.kind][0], ICON[n.kind][1])} style={{ marginRight: px('12px'), marginTop: px('2px') }} />
                <View className="grow">
                  <View className="bold">{n.title}{!n.read && <Text className="dot" />}</View>
                  <View className="muted">{n.body}</View>
                  <View className="faint mt4">{ago(n.created_at)}</View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
      {tab === 'ann' && (
        <View className="mt12">
          {anns.length === 0 && <Empty title="暂时没有公告" />}
          {anns.map((a) => (
            <View key={a.id} className="card" style={{ marginBottom: px('10px') }}>
              <View className="bold">{a.title}</View>
              <View className="muted mt4">{a.body}</View>
              <View className="faint mt4">{a.author}　{ago(a.created_at)}</View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
