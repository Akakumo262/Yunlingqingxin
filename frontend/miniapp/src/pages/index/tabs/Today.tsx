import { useEffect, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Image, Input, ScrollView, Text, View } from '@tarojs/components';
import { CheckIn, FiveEdu, HomeFeed, MOODS, Mood, Routes, coverUri } from '@yunling/contracts';
import { api, fail, newClientId, session } from '@/services/api';
import { WEATHER_TEXT, icon, weatherIcon } from '@/components/icons';
import { ContentRow, EduBadge, Section, StampToast, go, hm, md, openContent, weekday } from '@/components/kit';
import { px, safeTop } from '@/utils/ui';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const MY = { none: '', signed: '已报名', checked_in: '去写两句', reflected: '已完成' } as const;

/** P-02 首页 + P-03 心情打卡：选一种天气，天空跟着变。下面是今天和这一周要紧的事。 */
export default function Today({ go: goTab }: { go: (tab: string) => void }) {
  const [home, setHome] = useState<HomeFeed | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [noted, setNoted] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [stamp, setStamp] = useState<FiveEdu | null>(null);

  const load = () => api<HomeFeed>(Routes.homeGet).then((h) => (setHome(h), setMood((m) => m ?? h.today_check_in?.mood ?? null))).catch(fail);
  useEffect(() => void load(), []);
  useDidShow(() => void (home && load()));

  const pick = async (m: Mood) => {
    setMood(m); // 先让天空变，再去保存
    try {
      await api<CheckIn>(Routes.checkInCreate, { body: { mood: m, client_id: newClientId() } });
      load();
    } catch {
      // 弱网：先存在本机，下次打开时补交（F-22）
      Taro.setStorageSync('draft_check_in', { mood: m, client_id: newClientId(), client_ts: new Date().toISOString() });
      Taro.showToast({ title: '网络不太好，已经先帮你存下了', icon: 'none' });
    }
  };
  // 把上次没交出去的记录补交
  useEffect(() => {
    const draft = Taro.getStorageSync('draft_check_in');
    if (draft?.mood) api(Routes.checkInCreate, { body: draft }).then(() => (Taro.removeStorageSync('draft_check_in'), load())).catch(() => undefined);
  }, []);
  const saveNote = async () => {
    if (!mood || !note.trim()) return;
    await api<CheckIn>(Routes.checkInCreate, { body: { mood, note: note.trim(), client_id: newClientId() } }).then(() => setNoted(true)).catch(fail);
  };
  const doAction = async () => {
    if (!home || home.micro_action.done) return;
    try {
      await api(Routes.microActionDone, { params: { id: home.micro_action.id } });
      setStamp(home.micro_action.edu ?? 'moral');
      setTimeout(() => setStamp(null), 1800);
      load();
    } catch (e) {
      fail(e);
    }
  };

  const now = new Date();
  const name = session.me?.name ?? '';

  return (
    <View className="page--bar">
      <View className={`sky${mood ? ` sky--${mood}` : ''}`}>
        <View className="sky__text" style={{ paddingTop: `${safeTop() - 8}px` }}>
          <View className="topbar">
            <View className="date">{now.getMonth() + 1} 月 {now.getDate()} 日 周{WEEK[now.getDay()]}</View>
            <View className="row">
              <View className="bell" style={{ marginRight: px('10px') }} onClick={() => go('search')}><Image src={icon('search', '#fff')} /></View>
              <View className="bell" onClick={() => go('notices')}>
                <Image src={icon('bell', '#fff')} />
                {!!home?.unread && <Text className="badge">{home.unread}</Text>}
              </View>
            </View>
          </View>
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
            {!mood && <View className="faint center mt8" onClick={() => setSkipped(true)}>今天先不记</View>}
            {mood && !noted && (
              <View className="row mt12">
                <Input className="field grow" value={note} maxlength={200} placeholder="想多写一句吗？只有你自己看得到" onInput={(e) => setNote(e.detail.value)} onConfirm={saveNote} />
                {!!note.trim() && <Text className="link" style={{ marginLeft: px('10px') }} onClick={saveNote}>存下</Text>}
              </View>
            )}
            {noted && <View className="muted mt8">这句话也存好了。</View>}
            {(mood === 'low' || mood === 'hard') && <View className="btn btn--help mt12" onClick={() => go('help')}>想找人说说</View>}
          </>
        )}
      </View>

      {home && (
        <View style={{ padding: px('0 16px') }}>
          <View className="card mt12">
            <View className="week">
              {home.week.map((d, i) => (
                <View key={d.date} className={`week__day${i === 6 ? ' week__day--today' : ''}`}>
                  {d.mood ? <Image src={weatherIcon(d.mood)} /> : <View className="none" />}
                  {i === 6 ? '今天' : `周${WEEK[new Date(d.date).getDay()]}`}
                </View>
              ))}
            </View>
          </View>

          <Section title="今天的小行动" aside={`${home.micro_action.minutes} 分钟`} />
          <View className="card card--indigo">
            <View style={{ fontSize: px('17px'), lineHeight: 1.5 }}>{home.micro_action.title}</View>
            <View className="row mt12">
              <Text className="grow" style={{ opacity: 0.7, fontSize: px('12px') }}>做完会在成长护照里盖一枚印记</Text>
              <Text className="chip" style={{ margin: 0, background: home.micro_action.done ? 'rgba(255,255,255,0.16)' : '#ffc83d', color: home.micro_action.done ? '#fff' : '#14264d', fontWeight: 600 }} onClick={doAction}>
                {home.micro_action.done ? '今天做过了' : '我做完了'}
              </Text>
            </View>
          </View>

          {!!home.from_teacher?.length && (
            <>
              <Section title="老师推荐" />
              {home.from_teacher.map((p) => (
                <View key={p.id} className="card" style={{ marginBottom: px('10px') }} onClick={() => openContent(p.content.id)}>
                  {p.message && <View className="quote" style={{ marginTop: 0, marginBottom: px('12px') }}><View>{p.message}</View><View className="faint">{p.teacher_name}</View></View>}
                  <View className="row">
                    <Image className="cover cover--sm" src={coverUri(p.content.id, p.content.channel)} mode="aspectFill" />
                    <View className="grow"><View className="bold clamp2">{p.content.title}</View><View className="faint mt4">{p.content.minutes} 分钟{p.content.completed ? '　看过了' : ''}</View></View>
                  </View>
                </View>
              ))}
            </>
          )}

          {home.plan && (
            <>
              <Section title="接着做" aside="我的计划" onAside={() => go('plan', { id: home.plan!.id })} />
              <View className="card" onClick={() => go('plan', { id: home.plan!.id })}>
                <View className="faint">{home.plan.title}　第 {home.plan.day} / {home.plan.days} 天</View>
                <View className="bold mt4" style={{ fontSize: px('17px') }}>{home.plan.next_title}</View>
                <View className="bar"><View className="bar__fill" style={{ width: `${((home.plan.day - 1) / home.plan.days) * 100}%` }} /></View>
              </View>
            </>
          )}

          {!!home.activities?.length && (
            <>
              <Section title="最近的活动" aside="全部活动" onAside={() => goTab('discover:act')} />
              <ScrollView scrollX className="hscroll">
                {home.activities.map((a) => (
                  <View key={a.id} className="col-card" style={{ width: px('240px') }} onClick={() => go('activity', { id: a.id })}>
                    <Image className="cover cover--tile" src={coverUri(a.id, a.edu)} mode="aspectFill" />
                    <View className="col-card__body">
                      <View className="row"><EduBadge edu={a.edu} /><Text className="bold grow ellipsis">{a.title}</Text></View>
                      <View className="faint mt4">{md(a.start_at)} {weekday(a.start_at)} {hm(a.start_at)}</View>
                      <View className="mt4">{a.my_status && a.my_status !== 'none' ? <Text className="tag tag--ok">{MY[a.my_status]}</Text> : <Text className="tag">{a.signed_count}/{a.capacity} 人已报名</Text>}</View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <Section title="给你留的" aside="去发现" onAside={() => goTab('discover')} />
          <View className="card">{home.recommended.map((c) => <ContentRow key={c.id} c={c} />)}</View>

          <View className="row card mt12" onClick={() => go('help')}>
            <Image className="icon" src={icon('heart', '#D9366B')} style={{ marginRight: px('10px') }} />
            <View className="grow"><View className="bold">我想找人说</View><View className="muted">班主任、心理老师，或者 12355</View></View>
            <Image className="icon" src={icon('chevron', '#8590A8')} />
          </View>
        </View>
      )}
      <StampToast edu={stamp} text="小行动完成，成长护照里多了一枚印记" />
    </View>
  );
}
