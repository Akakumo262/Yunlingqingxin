import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Text, Textarea, View } from '@tarojs/components';
import { FEEDBACK_KINDS, FEEDBACK_KIND_LABEL, Faq, FeedbackKind, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { Chips, Section } from '@/components/kit';
import { px } from '@/utils/ui';

/** 帮助与反馈：常见问题按主题分组，点开看答案；不好用的地方可以直接告诉我们 */
export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [text, setText] = useState('');
  useLoad(() => void api<Faq[]>(Routes.helpFaqs).then(setFaqs).catch(fail));
  const groups = [...new Set(faqs.map((f) => f.group))];
  const send = () => text.trim().length >= 2 && api(Routes.feedbackCreate, { body: { kind, text: text.trim() } }).then(() => (setText(''), Taro.showToast({ title: '收到了，谢谢你', icon: 'none' }))).catch(fail);

  return (
    <View className="page">
      <View className="h1">帮助与反馈</View>
      {groups.map((g) => (
        <View key={g}>
          <Section title={g} />
          <View className="card">
            {faqs.filter((f) => f.group === g).map((f) => (
              <View key={f.id} className="list-item" style={{ display: 'block' }} onClick={() => setOpen(open === f.id ? null : f.id)}>
                <View className="row"><Text className="bold grow">{f.q}</Text><Text className="faint">{open === f.id ? '收起' : '看答案'}</Text></View>
                {open === f.id && <View className="muted mt8" style={{ lineHeight: 1.8 }}>{f.a}</View>}
              </View>
            ))}
          </View>
        </View>
      ))}

      <Section title="告诉我们" />
      <View className="card">
        <Chips value={kind} onChange={setKind} options={FEEDBACK_KINDS.map((k): [FeedbackKind, string] => [k, FEEDBACK_KIND_LABEL[k]])} />
        <Textarea className="area mt8" value={text} maxlength={500} placeholder="哪里不好用、哪篇内容有问题、你希望有什么，都可以说。" onInput={(e) => setText(e.detail.value)} />
        <View className={`btn mt12${text.trim().length >= 2 ? '' : ' btn--off'}`} onClick={send}>发给我们</View>
      </View>
      <View className="faint center mt16" style={{ paddingBottom: px('20px') }}>遇到紧急情况，请直接拨打 12355，或者在首页点“我想找人说”。</View>
    </View>
  );
}
