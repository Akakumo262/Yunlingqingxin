import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Text, Textarea, View } from '@tarojs/components';
import { HomeNote, NOTE_KIND_LABEL, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { Empty, ago } from '@/components/kit';
import { px } from '@/utils/ui';

const QUICK = ['收到，谢谢老师。', '好的，我们会多留意。', '方便的时候想和您通个电话。'];

/** 家校沟通单（家长端）：老师一对一发来的话，回一两句就行。不是群聊，别的家长看不到。 */
export default function Notes() {
  const [notes, setNotes] = useState<HomeNote[]>([]);
  const [replying, setReplying] = useState<string | null>(null);
  const [text, setText] = useState('');
  const load = () => api<HomeNote[]>(Routes.noteList).then(setNotes).catch(fail);
  useDidShow(load);
  const reply = (id: string) => text.trim() && api(Routes.noteReply, { params: { id }, body: { text: text.trim() } }).then(() => (setText(''), setReplying(null), load(), Taro.showToast({ title: '已经回给老师了', icon: 'none' }))).catch(fail);

  return (
    <View className="page">
      <View className="h1">家校沟通单</View>
      <View className="muted">老师想单独和您说的话。不用马上回，方便的时候回一两句就行。</View>
      {notes.length === 0 && <Empty title="老师还没有发来沟通单" kind="parent" />}
      <View className="mt16">
        {notes.map((n) => (
          <View key={n.id} className="card" style={{ marginBottom: px('12px') }}>
            <View className="row"><Text className="tag tag--wait">{NOTE_KIND_LABEL[n.kind]}</Text><Text className="faint grow">{n.from_name}　{ago(n.created_at)}</Text></View>
            <View className="mt8" style={{ fontSize: px('16px'), lineHeight: 1.75 }}>{n.text}</View>
            {n.reply ? (
              <View className="reply"><Text className="bold">我的回复：</Text>{n.reply.text}<Text className="faint">　{ago(n.reply.at)}</Text></View>
            ) : replying === n.id ? (
              <View className="mt12">
                <View>{QUICK.map((q) => <Text key={q} className="chip" onClick={() => setText(q)}>{q}</Text>)}</View>
                <Textarea className="area" style={{ minHeight: px('70px') }} value={text} maxlength={300} placeholder="回一两句" onInput={(e) => setText(e.detail.value)} />
                <View className={`btn mt12${text.trim() ? '' : ' btn--off'}`} onClick={() => reply(n.id)}>回给老师</View>
              </View>
            ) : (
              <View className="btn btn--ghost mt12" onClick={() => (setReplying(n.id), setText(''))}>回一句</View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
