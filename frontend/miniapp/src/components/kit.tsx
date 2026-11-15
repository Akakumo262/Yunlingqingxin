import { ReactNode } from 'react';
import Taro from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';
import {
  ActivityCard, CONTENT_CHANNEL_LABEL, ContentCard, CoverKind, FIVE_EDU_LABEL, FIVE_EDU_NAME, FiveEdu, Notice, ORGANIZER_TYPE_LABEL, coverUri,
} from '@yunling/contracts';
import { icon, playIcon } from './icons';
import { px } from '@/utils/ui';

/** 小程序各页面共用的小零件。页面里尽量只写“这一页特有的东西”。 */

// ── 跳转 ──
export const go = (page: string, params: Record<string, string | undefined> = {}) => {
  const qs = Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
  return Taro.navigateTo({ url: `/pages/${page}/index${qs ? '?' + qs : ''}` });
};
export const goTab = (tab: string, q?: string) => Taro.reLaunch({ url: `/pages/index/index?tab=${tab}${q ? '&q=' + encodeURIComponent(q) : ''}` });
/** 通知、助手出处里的链接，统一在这里决定去哪个页面 */
export function openLink(link?: Notice['link']) {
  if (!link) return;
  const { page, id } = link;
  if (page === 'content') return go('content', { id });
  if (page === 'activity') return go('activity', { id });
  if (page === 'career') return go('career', { id });
  if (page === 'circle') return go('circle', { id });
  if (page === 'help') return go('help');
  if (page === 'notes') return go('notes');
  if (page === 'me') return goTab('me');
  if (page === 'summary') return Taro.reLaunch({ url: '/pages/parent/index' });
  if (page === 'announcements') return go('notices', { tab: 'ann' });
}
/** 助手给的出处：a 开头是活动，cc/cj/ci/cm/cp 开头是生涯卡，其余是内容 */
export const openSource = (id: string) => (/^a\d/.test(id) ? go('activity', { id }) : /^c[cjimp]\d/.test(id) ? go('career', { id }) : go('content', { id }));

// ── 时间 ──
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
export const weekday = (iso: string) => `周${WEEK[new Date(iso).getDay()]}`;
export const hm = (iso: string) => new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
export const md = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1} 月 ${d.getDate()} 日`; };
export const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? '刚刚' : m < 60 ? `${m} 分钟前` : m < 1440 ? `${Math.round(m / 60)} 小时前` : m < 43200 ? `${Math.round(m / 1440)} 天前` : md(iso);
};
export const mmss = (s = 0) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
/** 活动时间：跨天的写起止日期，当天的写时段 */
export const whenText = (a: { start_at: string; end_at: string }) =>
  Date.parse(a.end_at) - Date.parse(a.start_at) > 86400000 ? `${md(a.start_at)} — ${md(a.end_at)}` : `${md(a.start_at)} ${weekday(a.start_at)} ${hm(a.start_at)}—${hm(a.end_at)}`;

// ── 基础零件 ──
export function Cover({ id, kind, className = '', children }: { id: string; kind: CoverKind; className?: string; children?: ReactNode }) {
  return (
    <View className="cover-wrap">
      <Image className={`cover ${className}`} src={coverUri(id, kind)} mode="aspectFill" />
      {children}
    </View>
  );
}
export function Section({ title, aside, onAside }: { title: string; aside?: string; onAside?: () => void }) {
  return (
    <View className="section-title">
      <Text className="h2">{title}</Text>
      {aside && <Text className={onAside ? 'more' : 'faint'} onClick={onAside}>{aside}</Text>}
    </View>
  );
}
export function Empty({ title, hint, kind = 'psychology' }: { title: string; hint?: string; kind?: CoverKind }) {
  return (
    <View className="empty">
      <Image src={coverUri('empty-' + title, kind)} mode="aspectFill" />
      <View className="bold" style={{ color: '#0f1e3a' }}>{title}</View>
      {hint && <View className="muted mt4">{hint}</View>}
    </View>
  );
}
export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <View className="seg">
      {options.map(([k, label]) => <View key={k} className={`seg__item${value === k ? ' seg__item--on' : ''}`} onClick={() => onChange(k)}>{label}</View>)}
    </View>
  );
}
export function Chips<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <View>{options.map(([k, label]) => <Text key={k} className={`chip${value === k ? ' chip--on' : ''}`} onClick={() => onChange(k)}>{label}</Text>)}</View>;
}
export function Row({ iconName, title, hint, onClick, dot, color = '#1F5FD1' }: { iconName: Parameters<typeof icon>[0]; title: string; hint?: string; onClick: () => void; dot?: boolean; color?: string }) {
  return (
    <View className="list-item" onClick={onClick}>
      <Image className="icon" src={icon(iconName, color)} style={{ marginRight: px('12px') }} />
      <View className="grow">
        <View className="bold">{title}{dot && <Text className="dot" />}</View>
        {hint && <View className="faint">{hint}</View>}
      </View>
      <Image className="icon" src={icon('chevron', '#8590A8')} />
    </View>
  );
}
export const EduBadge = ({ edu }: { edu: FiveEdu }) => <Text className={`edu edu--${edu}`}>{FIVE_EDU_LABEL[edu]}</Text>;

// ── 内容 ──
const KIND = { article: '读', video: '看', audio: '听' } as const;
export const openContent = (id: string) => go('content', { id });
/** 内容列表里的一行：封面 + 标题 + 来源 */
export function ContentRow({ c }: { c: ContentCard }) {
  return (
    <View className="list-item" onClick={() => openContent(c.id)}>
      <View className="cover-wrap">
        <Image className="cover cover--sm" src={coverUri(c.id, c.channel)} mode="aspectFill" />
        {c.type !== 'article' && <View className="mini-play"><Image src={playIcon()} /></View>}
      </View>
      <View className="grow">
        <View className="bold clamp2" style={{ lineHeight: 1.4 }}>{c.title}</View>
        <View className="faint mt4">{CONTENT_CHANNEL_LABEL[c.channel]}　{KIND[c.type]} {c.minutes} 分钟{c.completed ? '　看过了' : ''}</View>
      </View>
    </View>
  );
}

// ── 活动 ──
const ACT_STATUS = { open: ['可报名', 'tag--ok'], full: ['名额已满', 'tag--wait'], ongoing: ['进行中', ''], ended: ['已结束', 'tag--off'] } as const;
const MY_STATUS = { none: '', signed: '已报名', checked_in: '已签到，等你写两句', reflected: '已记进成长护照' } as const;
export function ActivityRow({ a }: { a: ActivityCard }) {
  const d = new Date(a.start_at), [label, cls] = ACT_STATUS[a.status];
  const ratio = Math.min(1, a.signed_count / a.capacity);
  return (
    <View className="act" onClick={() => go('activity', { id: a.id })}>
      <View className={`datebox${a.status === 'ended' ? ' datebox--ended' : ''}`}>
        <View className="m">{d.getMonth() + 1} 月</View>
        <View className="d">{d.getDate()}</View>
        <View className="m">{weekday(a.start_at)}</View>
      </View>
      <View className="grow" style={{ flex: 1, minWidth: 0 }}>
        <View className="row"><EduBadge edu={a.edu} /><Text className="bold grow clamp2" style={{ lineHeight: 1.35 }}>{a.title}</Text></View>
        <View className="faint mt4 ellipsis">{a.place}　{ORGANIZER_TYPE_LABEL[a.organizer_type]}组织</View>
        <View className="mt4">
          <Text className={`tag ${cls}`}>{label}</Text>
          {a.my_status && a.my_status !== 'none' && <Text className="tag tag--ok">{MY_STATUS[a.my_status]}</Text>}
          <Text className="faint">{a.signed_count}/{a.capacity} 人</Text>
        </View>
        <View className="bar"><View className={`bar__fill${ratio >= 1 ? ' bar__fill--full' : ''}`} style={{ width: `${ratio * 100}%` }} /></View>
      </View>
    </View>
  );
}
export const eduName = (e: FiveEdu) => FIVE_EDU_NAME[e];

/** 盖章提示：成长护照新增一枚印记时，屏幕中间盖一下 */
export function StampToast({ edu, text }: { edu: FiveEdu | null; text?: string }) {
  if (!edu) return null;
  return (
    <View className="stamp-toast">
      <View className="stamp"><Text className="edu">{FIVE_EDU_LABEL[edu]}</Text><Text className="n">+1</Text></View>
      <View className="say">{text ?? `成长护照里多了一枚“${FIVE_EDU_LABEL[edu]}”的印记`}</View>
    </View>
  );
}
