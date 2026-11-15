import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Image, Input, Text, View } from '@tarojs/components';
import { AiChatRes, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { IconName, icon } from '@/components/icons';
import { go, openSource } from '@/components/kit';
import { px, safeTop } from '@/utils/ui';

interface Msg {
  from: 'me' | 'ai';
  text: string;
  res?: AiChatRes;
}
/** 助手能做的五件事，各给两个可以直接点的问题 */
const SKILLS: { name: string; icon: IconName; asks: string[] }[] = [
  { name: '学习方法', icon: 'book', asks: ['背了就忘怎么办', '听得懂但不会做题'] },
  { name: '以后干什么', icon: 'flagRoute', asks: ['我不知道以后想干什么', '护士要怎么当'] },
  { name: '资助政策', icon: 'shield', asks: ['助学金怎么申请', '上大学学费不够怎么办'] },
  { name: '最近的活动', icon: 'calendar', asks: ['最近有什么活动', '怎么写进成长护照'] },
  { name: '心里不舒服', icon: 'heart', asks: ['考试前一晚睡不着怎么办', '和爸妈吵架了，心里很乱'] },
];

/** P-29 AI 成长助手：有标识、有来源、随时能转人工；出现危机表达时停止对话，把人交给老师 */
export default function Assistant({ ask }: { ask?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sid, setSid] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [skill, setSkill] = useState(0);
  const stopped = msgs.some((m) => m.res?.kind === 'crisis');
  const last = msgs[msgs.length - 1];

  const send = async (q: string) => {
    q = q.trim();
    if (!q || busy || stopped) return;
    setText('');
    setMsgs((m) => [...m, { from: 'me', text: q }]);
    setBusy(true);
    try {
      const res = await api<AiChatRes>(Routes.aiChat, { body: { message: q, session_id: sid } });
      setSid(res.session_id);
      setMsgs((m) => [...m, { from: 'ai', text: res.answer, res }]);
      setTimeout(() => Taro.pageScrollTo({ scrollTop: 99999, duration: 200 }), 80);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => void (ask && send(ask)), []);

  return (
    <View className="page" style={{ paddingTop: `${safeTop()}px`, paddingBottom: px('180px') }}>
      <View className="topbar">
        <View className="h1">成长助手</View>
        {msgs.length > 0 && <Text className="link" onClick={() => (setMsgs([]), setSid(undefined))}>重新开始</Text>}
      </View>
      <View className="notice mt8">我是 AI 助手，不是真人，也不能做诊断。我的回答都来自平台上审核过的内容，会告诉你出处。想找老师，随时点“转人工”。</View>

      {msgs.length === 0 && (
        <View className="mt16">
          <View className="muted">我能帮你做这几件事</View>
          <View className="mt8">
            {SKILLS.map((s, i) => (
              <Text key={s.name} className={`chip${skill === i ? ' chip--on' : ''}`} onClick={() => setSkill(i)}>{s.name}</Text>
            ))}
          </View>
          {SKILLS[skill].asks.map((q) => (
            <View key={q} className="card row" style={{ marginBottom: px('10px'), padding: px('14px 16px') }} onClick={() => send(q)}>
              <Image className="icon" src={icon(SKILLS[skill].icon, '#1F5FD1')} style={{ marginRight: px('10px') }} />
              <Text className="grow">{q}</Text>
            </View>
          ))}
          <View className="faint mt8">对话保存 30 天后自动删除，不会给老师和家长看。</View>
        </View>
      )}

      <View className="chat mt16">
        {msgs.map((m, i) => (
          <View key={i} className={`bubble bubble--${m.res?.kind === 'crisis' ? 'crisis' : m.from}`}>
            {m.text}
            {m.res && m.res.sources.length > 0 && (
              <View>{m.res.sources.map((s) => <Text key={s.content_id} className="src" onClick={() => openSource(s.content_id)}>出处：{s.title}</Text>)}</View>
            )}
            {m.res?.remind_human && m.res.kind === 'answer' && <View className="faint mt4">聊了一会儿了。想换成真人，点下面的“转人工”。</View>}
          </View>
        ))}
        {busy && <View className="bubble bubble--ai faint">正在查资料…</View>}
        {!busy && !stopped && last?.res?.suggestions && (
          <View>{last.res.suggestions.map((s) => <Text key={s} className="chip" onClick={() => (s.includes('找老师') ? go('help') : send(s))}>{s}</Text>)}</View>
        )}
      </View>

      {stopped ? (
        <View>
          <View className="btn btn--help" onClick={() => Taro.makePhoneCall({ phoneNumber: '12355' }).catch(() => undefined)}>现在拨打 12355</View>
          <View className="btn btn--ghost mt12" onClick={() => go('help')}>看看老师什么时候联系我</View>
        </View>
      ) : (
        <View className="composer composer--tab">
          <Text className="chip chip--rape" style={{ margin: px('0 8px 0 0') }} onClick={() => go('help')}>转人工</Text>
          <Input className="field" value={text} maxlength={1000} placeholder="想问点什么" confirmType="send" onInput={(e) => setText(e.detail.value)} onConfirm={() => send(text)} />
          <View className="send" onClick={() => send(text)}><Image src={icon('send', '#fff')} /></View>
        </View>
      )}
    </View>
  );
}
