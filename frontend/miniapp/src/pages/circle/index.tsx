import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Image, Input, Text, View } from '@tarojs/components';
import { Page, Post, REPORT_REASONS, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { avatarColor, icon } from '@/components/icons';

const REASONS: Record<(typeof REPORT_REASONS)[number], string> = { bullying: '在欺负人', privacy: '泄露了别人的隐私', ad: '是广告', self_harm: '让我担心发帖的人', other: '其他' };
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? '刚刚' : m < 60 ? `${m} 分钟前` : m < 1440 ? `${Math.round(m / 60)} 小时前` : `${Math.round(m / 1440)} 天前`;
};

/** P-31 帖子与发帖、P-32 举报。只显示昵称；没有私信；每条帖子都能举报。 */
export default function CirclePage() {
  const [id, setId] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Post | null>(null);

  const load = (cid = id) => api<Page<Post>>(Routes.postList, { params: { id: cid } }).then((p) => setPosts(p.items)).catch(fail);
  useLoad((q) => {
    setId(q.id ?? '');
    Taro.setNavigationBarTitle({ title: decodeURIComponent(q.name ?? '成长圈') });
    load(q.id);
  });

  const send = async () => {
    if (!text.trim()) return;
    try {
      const p = await api<Post>(Routes.postCreate, { params: { id }, body: { content: text.trim(), parent_id: replyTo?.id } });
      setText('');
      setReplyTo(null);
      if (p.status === 'pending_review') Taro.showToast({ title: '发出去了，版主看过后大家就能看到', icon: 'none', duration: 2600 });
      load();
    } catch (e) {
      fail(e);
    }
  };
  const report = async (p: Post) => {
    const keys = [...REPORT_REASONS];
    const r = await Taro.showActionSheet({ itemList: keys.map((k) => REASONS[k]) }).catch(() => null);
    if (!r) return;
    await api(Routes.postReport, { params: { id: p.id }, body: { reason: keys[r.tapIndex] } }).then(() => Taro.showToast({ title: '收到了，版主会在一天内处理', icon: 'none' })).catch(fail);
  };

  const Avatar = ({ p }: { p: Post }) => <View className="avatar" style={{ background: p.is_teacher ? '#14264D' : avatarColor(p.avatar_seed) }}>{p.nickname.slice(0, 1)}</View>;

  return (
    <View className="page" style={{ paddingBottom: '120px' }}>
      {posts.length === 0 && <View className="card"><View style={{ fontWeight: 600 }}>这里还没有人说话</View><View className="muted">你可以来开个头。</View></View>}
      {posts.map((p) => (
        <View key={p.id} className="card" style={{ marginBottom: '12px' }}>
          <View className="row">
            <Avatar p={p} />
            <View className="grow">
              <View style={{ fontWeight: 600 }}>{p.nickname}{p.is_teacher && <Text className="chip" style={{ margin: '0 0 0 8px', padding: '0 8px' }}>老师</Text>}</View>
              <View className="faint">{ago(p.created_at)}{p.mine ? '　我发的' : ''}</View>
            </View>
            <Image className="icon" style={{ width: '18px', height: '18px' }} src={icon('flag', '#8590A8')} onClick={() => report(p)} />
          </View>
          <View style={{ marginTop: '10px' }}>{p.content}</View>
          {p.status === 'pending_review' && <View className="notice" style={{ marginTop: '10px' }}>版主看过后，大家才能看到这条。</View>}
          {p.replies.map((r) => (
            <View key={r.id} className="reply"><Text style={{ fontWeight: 600 }}>{r.nickname}：</Text>{r.content}{r.status === 'pending_review' && <Text className="faint">（等版主看过）</Text>}</View>
          ))}
          <View className="link" style={{ marginTop: '10px', fontSize: '13px' }} onClick={() => setReplyTo(p)}>回一句</View>
        </View>
      ))}

      <View className="composer" style={{ flexWrap: 'wrap' }}>
        {replyTo && <View className="faint" style={{ width: '100%', marginBottom: '6px' }} onClick={() => setReplyTo(null)}>回复 {replyTo.nickname}　点这里取消</View>}
        <Input className="field" value={text} maxlength={500} placeholder={replyTo ? '回一句' : '说点什么，不要留联系方式'} confirmType="send" onInput={(e) => setText(e.detail.value)} onConfirm={send} />
        <View className="send" onClick={send}><Image src={icon('send', '#fff')} /></View>
      </View>
    </View>
  );
}
