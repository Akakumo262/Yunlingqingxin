import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Image, Input, Text, View } from '@tarojs/components';
import { CheckIn, HomeFeed, MOODS, Mood, Routes } from '@yunling/contracts';
import { api, fail, newClientId, session } from '@/services/api';
import { WEATHER_TEXT, icon, weatherIcon } from '@/components/icons';
import { ContentRow } from '@/components/ContentRow';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const statusBar = () => (Taro.getSystemInfoSync().statusBarHeight || 0) + 28;

/** P-02 首页 + P-03 心情打卡：选一种天气，天空跟着变。两步以内，永远可以不记。 */
export default function Today({ go }: { go: (tab: string) => void }) {
  const [home, setHome] = useState<HomeFeed | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [noted, setNoted] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const load = () => api<HomeFeed>(Routes.homeGet).then((h) => (setHome(h), setMood(h.today_check_in?.mood ?? null))).catch(fail);
  useEffect(() => void load(), []);

  const pick = async (m: Mood) => {
    setMood(m); // 先让天空变，再去保存
    try {
      await api<CheckIn>(Routes.checkInCreate, { body: { mood: m, client_id: newClientId() } });
      load();
    } catch (e) {
      fail(e);
    }
  };
  const saveNote = async () => {
    if (!mood || !note.trim()) return;
    await api<CheckIn>(Routes.checkInCreate, { body: { mood, note: note.trim(), client_id: newClientId() } }).then(() => setNoted(true)).catch(fail);
  };

  const now = new Date();
  const name = session.me?.name ?? '';

  return (
    <View className="page--bar">
      <View className={`sky${mood ? ` sky--${mood}` : ''}`}>
        <View className="sky__text" style={{ paddingTop: `${statusBar()}px` }}>
          <View className="date">{now.getMonth() + 1} 月 {now.getDate()} 日 周{WEEK[now.getDay()]}</View>
          <View className="h1">{mood ? `今天是${WEATHER_TEXT[mood].name}` : `${name}，今天心里\n是什么天气？`}</View>
          <View className="sub">{mood ? WEATHER_TEXT[mood].said : '选一个最像的就行。'}</View>
        </View>
        <View className="sky__sun" />
        <View className="cloud cloud--a" />
        <View className="cloud cloud--b" />
        <View className="sky__rain" />
        <View className="ridge ridge--far" />
        <View className="ridge ridge--mid" />
        <View className="ridge ridge--near" />
      </View>

      <View className="card weather-card">
        {skipped && !mood ? (
          <View className="row">
            <Text className="grow muted">今天不记也没关系。想记的时候再来。</Text>
            <Text className="link" onClick={() => setSkipped(false)}>还是记一下</Text>
          </View>
        ) : (
          <>
            <View className="weather-row">
              {MOODS.map((m) => (
                <View key={m} className={`weather-pick${mood === m ? ' weather-pick--on' : ''}`} onClick={() => pick(m)}>
                  <Image src={weatherIcon(m)} />
                  {WEATHER_TEXT[m].name}
                </View>
              ))}
            </View>
            {!mood && <View className="faint" style={{ textAlign: 'center', marginTop: '10px' }} onClick={() => setSkipped(true)}>今天先不记</View>}
            {mood && !noted && (
              <View className="row" style={{ marginTop: '12px' }}>
                <Input className="field grow" value={note} maxlength={200} placeholder="想多写一句吗？只有你自己看得到" onInput={(e) => setNote(e.detail.value)} onConfirm={saveNote} />
                {!!note.trim() && <Text className="link" style={{ marginLeft: '10px' }} onClick={saveNote}>存下</Text>}
              </View>
            )}
            {noted && <View className="muted" style={{ marginTop: '10px' }}>这句话也存好了。</View>}
            {(mood === 'low' || mood === 'hard') && (
              <View className="btn btn--help" style={{ marginTop: '14px' }} onClick={() => Taro.navigateTo({ url: '/pages/help/index' })}>想找人说说</View>
            )}
          </>
        )}
      </View>

      {home && (
        <View style={{ padding: '0 16px' }}>
          <View className="section-title"><Text className="h2">这一周</Text></View>
          <View className="card">
            <View className="week">
              {home.week.map((d, i) => (
                <View key={d.date} className={`week__day${i === 6 ? ' week__day--today' : ''}`}>
                  {d.mood ? <Image src={weatherIcon(d.mood)} /> : <View className="none" />}
                  {i === 6 ? '今天' : `周${WEEK[new Date(d.date).getDay()]}`}
                </View>
              ))}
            </View>
          </View>

          <View className="section-title"><Text className="h2">今天的小行动</Text><Text className="faint">{home.micro_action.minutes} 分钟</Text></View>
          <View className="card card--indigo">{home.micro_action.title}</View>

          <View className="section-title"><Text className="h2">给你留的</Text><Text className="more" onClick={() => go('discover')}>去发现</Text></View>
          <View className="card">{home.recommended.map((c) => <ContentRow key={c.id} c={c} />)}</View>

          <View className="row card" style={{ marginTop: '12px' }} onClick={() => Taro.navigateTo({ url: '/pages/help/index' })}>
            <Image className="icon" src={icon('heart', '#D9366B')} style={{ marginRight: '10px' }} />
            <View className="grow"><View style={{ fontWeight: 600 }}>我想找人说</View><View className="muted">班主任、心理老师，或者 12355</View></View>
            <Image className="icon" src={icon('chevron', '#8590A8')} />
          </View>
        </View>
      )}
    </View>
  );
}
