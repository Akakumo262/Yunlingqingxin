import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Image, Input, Text, View } from '@tarojs/components';
import { AiChatRes, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { icon } from '@/components/icons';

interface Msg {
  from: 'me' | 'ai';
  text: string;
  res?: AiChatRes;
}
const STARTERS = ['我以后想当护士，现在要准备什么？', '考试前一晚睡不着怎么办', '高中的助学金怎么申请', '和爸妈吵架了，心里很乱'];
const top = () => (Taro.getSystemInfoSync().statusBarHeight || 0) + 28;
const openSource = (id: string) => Taro.navigateTo({ url: id.startsWith('cc') ? `/pages/career/index?id=${id}` : `/pages/content/index?id=${id}` });

/** P-29 AI 成长助手：有标识、有来源、随时能转人工；出现危机表达时停止对话，把人交给老师 */
export default function Assistant({ ask }: { ask?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sid, setSid] = useState<string>();
  const [busy, setBusy] = useState(false);
  const stopped = msgs.some((m) => m.res?.kind === 'crisis');

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
      setTimeout(() => Taro.pageScrollTo({ scrollTop: 99999, duration: 200 }), 60);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => void (ask && send(ask)), []);

  return (
    <View className="page" style={{ paddingTop: `${top()}px`, paddingBottom: '170px' }}>
      <View className="h1">成长助手</View>
      <View className="notice" style={{ marginTop: '12px' }}>我是 AI 助手，不是真人，也不能做诊断。我的回答都来自平台上审核过的内容，会告诉你出处。想找老师，随时点“转人工”。</View>

      {msgs.length === 0 && (
        <View style={{ marginTop: '20px' }}>
          <View className="muted" style={{ marginBottom: '10px' }}>可以这样问我</View>
          {STARTERS.map((s) => <View key={s} className="card" style={{ marginBottom: '10px', padding: '14px 16px' }} onClick={() => send(s)}>{s}</View>)}
        </View>
      )}

      <View className="chat" style={{ marginTop: '20px' }}>
        {msgs.map((m, i) => (
          <View key={i} className={`bubble bubble--${m.res?.kind === 'crisis' ? 'crisis' : m.from}`}>
            {m.text}
            {m.res && m.res.sources.length > 0 && (
              <View>
                {m.res.sources.map((s) => <Text key={s.content_id} className="src" onClick={() => openSource(s.content_id)}>出处：{s.title}</Text>)}
              </View>
            )}
            {m.res?.remind_human && m.res.kind === 'answer' && <View className="faint" style={{ marginTop: '8px' }}>聊了一会儿了。想换成真人，点下面的“转人工”。</View>}
          </View>
        ))}
        {busy && <View className="bubble bubble--ai faint">正在查资料…</View>}
      </View>

      {stopped ? (
        <View>
          <View className="btn btn--help" onClick={() => Taro.makePhoneCall({ phoneNumber: '12355' })}>现在拨打 12355</View>
          <View className="btn btn--ghost" style={{ marginTop: '12px' }} onClick={() => Taro.navigateTo({ url: '/pages/help/index' })}>看看老师什么时候联系我</View>
        </View>
      ) : (
        <View className="composer composer--tab">
          <Text className="chip chip--rape" style={{ margin: '0 8px 0 0' }} onClick={() => Taro.navigateTo({ url: '/pages/help/index' })}>转人工</Text>
          <Input className="field" value={text} maxlength={1000} placeholder="想问点什么" confirmType="send" onInput={(e) => setText(e.detail.value)} onConfirm={() => send(text)} />
          <View className="send" onClick={() => send(text)}><Image src={icon('send', '#fff')} /></View>
        </View>
      )}
    </View>
  );
}
