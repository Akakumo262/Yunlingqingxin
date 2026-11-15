import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Image, Text, Video, View } from '@tarojs/components';
import { CONTENT_CHANNEL_LABEL, ContentDetail, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { heartFilled, icon, playIcon } from '@/components/icons';
import { ContentRow, Cover, Section, goTab, mmss } from '@/components/kit';
import { px } from '@/utils/ui';

/** 正文一行一段：「## 」小标题、「- 」要点、「> 」划重点 */
function Rich({ body }: { body: string }) {
  return (
    <View className="prose">
      {body.split('\n').filter(Boolean).map((line, i) =>
        line.startsWith('## ') ? <View key={i} className="h">{line.slice(3)}</View>
          : line.startsWith('- ') ? <View key={i} className="li">{line.slice(2)}</View>
            : line.startsWith('> ') ? <View key={i} className="q">{line.slice(2)}</View>
              : <View key={i} className="p">{line}</View>,
      )}
    </View>
  );
}

/** P-27 内容详情：封面、正文、记住这几点、收藏/看完/有没有用、相关内容、出处 */
export default function Content() {
  const [c, setC] = useState<ContentDetail | null>(null);
  const [useful, setUseful] = useState<boolean | null>(null);
  useLoad((q) => void api<ContentDetail>(Routes.contentGet, { params: { id: q.id ?? '' } }).then((d) => (setC(d), Taro.setNavigationBarTitle({ title: CONTENT_CHANNEL_LABEL[d.channel] }))).catch(fail));
  if (!c) return <View className="page" />;

  const favorite = () => api<{ favorited: boolean }>(Routes.contentFavorite, { params: { id: c.id }, body: { on: !c.favorited } }).then((r) => (setC({ ...c, favorited: r.favorited }), Taro.showToast({ title: r.favorited ? '收藏了，在“我的收藏”里' : '已取消收藏', icon: 'none' }))).catch(fail);
  const complete = () => api(Routes.contentComplete, { params: { id: c.id } }).then(() => setC({ ...c, completed: true })).catch(fail);
  const vote = (v: boolean) => api(Routes.contentFeedback, { params: { id: c.id }, body: { useful: v } }).then(() => setUseful(v)).catch(fail);

  return (
    <View>
      {c.type !== 'article' && c.video_url ? (
        <Video src={c.video_url} style={{ width: '100%' }} controls />
      ) : (
        <Cover id={c.id} kind={c.channel} className="cover--hero">
          {c.type !== 'article' && (
            <>
              <View className="poster__tag">演示素材，正式内容上线后可{c.type === 'video' ? '播放' : '收听'}</View>
              <View className="poster__play"><Image src={playIcon()} /></View>
              <View className="poster__len num">{mmss(c.duration)}</View>
            </>
          )}
        </Cover>
      )}
      <View className="page" style={{ minHeight: 'auto' }}>
        <View className="h1" style={{ fontSize: px('25px') }}>{c.title}</View>
        <View className="muted mt4">{c.author}　{c.type === 'article' ? '读' : c.type === 'video' ? '看' : '听'} {c.minutes} 分钟　适合{c.age_label}</View>
        <View className="mt8">{c.tags?.map((t) => <Text key={t} className="tag" onClick={() => Taro.navigateTo({ url: `/pages/search/index?q=${encodeURIComponent(t)}` })}>{t}</Text>)}</View>

        <View className="mt16"><Rich body={c.body} /></View>

        {!!c.takeaways?.length && (
          <View className="takeaways">
            <View className="t">记住这几点</View>
            {c.takeaways.map((t, i) => <View key={t} className="i"><Text className="n">{i + 1}</Text><Text style={{ flex: 1 }}>{t}</Text></View>)}
          </View>
        )}

        <View className="actions">
          <View className={`act-btn${c.favorited ? ' act-btn--on' : ''}`} onClick={favorite}>
            <Image src={c.favorited ? heartFilled('#FFC83D') : icon('like', '#0F1E3A')} style={{ width: px('16px'), height: px('16px'), verticalAlign: 'middle', marginRight: px('6px') }} />
            {c.favorited ? '已收藏' : '收藏'}
          </View>
          <View className={`act-btn${c.completed ? ' act-btn--on' : ''}`} onClick={complete}>{c.completed ? '看过了' : '我看完了'}</View>
        </View>
        <View className="card mt12 row">
          <Text className="grow">{useful === null ? '这篇对你有用吗？' : useful ? '谢谢，我们会多做这样的内容。' : '谢谢你告诉我们，我们会改进。'}</Text>
          {useful === null && (
            <>
              <Text className="chip" style={{ margin: px('0 8px 0 0') }} onClick={() => vote(true)}>有用</Text>
              <Text className="chip" style={{ margin: 0 }} onClick={() => vote(false)}>没什么用</Text>
            </>
          )}
        </View>
        <View className="btn btn--ghost mt12" onClick={() => goTab('ai', `我刚看了《${c.title}》，想再问问`)}>还有想问的，找助手聊聊</View>

        {!!c.related?.length && (
          <>
            <Section title="接着看" />
            <View className="card">{c.related.map((r) => <ContentRow key={r.id} c={r} />)}</View>
          </>
        )}

        <View className="source faint mt24">
          <View>来源：{c.source}</View>
          <View>授权：{c.license}</View>
          {c.reviewed_by && <View>审核：{c.reviewed_by}</View>}
          <View>内容有问题？在“我的—帮助与反馈”里告诉我们。</View>
        </View>
      </View>
    </View>
  );
}
