import { useState } from 'react';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { Image, View } from '@tarojs/components';
import { Role } from '@yunling/contracts';
import { session } from '@/services/api';
import { IconName, icon } from '@/components/icons';
import Today from './tabs/Today';
import Discover from './tabs/Discover';
import Circles from './tabs/Circles';
import Assistant from './tabs/Assistant';
import Me from './tabs/Me';

const TABS: { key: string; text: string; icon: IconName }[] = [
  { key: 'today', text: '今天', icon: 'today' },
  { key: 'discover', text: '发现', icon: 'discover' },
  { key: 'circle', text: '成长圈', icon: 'circle' },
  { key: 'ai', text: '助手', icon: 'ai' },
  { key: 'me', text: '我的', icon: 'me' },
];

/**
 * 学生端外壳：自绘底部导航，五个栏目在同一页内切换，切换不闪屏。
 * tab 可以带子栏目，例如 discover:act 表示“发现”里的“活动”。
 */
export default function Index() {
  const router = useRouter();
  const [tab, setTab] = useState(router.params.tab || 'today');
  const [ready, setReady] = useState(false);
  const [big, setBig] = useState(session.bigType);
  const [main, sub] = tab.split(':');

  useDidShow(() => {
    if (!session.me) return void Taro.reLaunch({ url: '/pages/login/index' });
    if (session.me.roles.includes(Role.guardian)) return void Taro.reLaunch({ url: '/pages/parent/index' });
    setReady(true);
    setBig(session.bigType);
  });
  if (!ready) return <View />;

  return (
    <View className={big ? 'big-type' : ''}>
      {main === 'today' && <Today go={setTab} />}
      {main === 'discover' && <Discover initial={sub} />}
      {main === 'circle' && <Circles />}
      {main === 'ai' && <Assistant ask={router.params.q ? decodeURIComponent(router.params.q) : undefined} />}
      {main === 'me' && <Me onBigType={setBig} />}
      <View className="tabbar">
        {TABS.map((t) => (
          <View key={t.key} className={`tabbar__item${main === t.key ? ' tabbar__item--on' : ''}`} onClick={() => setTab(t.key)}>
            <Image src={icon(t.icon, main === t.key ? '#14264D' : '#8590A8')} />
            {t.text}
          </View>
        ))}
      </View>
    </View>
  );
}
