import type { ContentChannel, ContentType } from '../../enums';
import type { ContentDetail } from '../../dto';

const AUTHOR: Record<ContentChannel, string> = {
  psychology: '周老师（学校心理教师）', learning: '学习支持组', career: '生涯教育组', policy: '云岭青心内容组', culture: '民族文化内容组',
  five_edu: '五育活动组', role_model: '人物访谈（已授权，化名）', parent: '家庭教育指导师（演示）', teacher: '周老师（学校心理教师）',
};
const SOURCE: Partial<Record<ContentChannel, string>> = { policy: '政府公开信息整理', role_model: '人物访谈' };
const LICENSE: Partial<Record<ContentChannel, string>> = { policy: '政府公开信息', role_model: '书面授权 · 化名' };

let order = 0;
/**
 * 写一条内容。正文一行一段，行首「## 」是小标题、「- 」是要点、「> 」是划重点。
 * 全部为平台自写的合成内容；涉及政策的条目只讲办理路径，金额与时间一律以当年通知为准。
 */
export function item(
  id: string, channel: ContentChannel, type: ContentType, title: string, summary: string, minutes: number, age_label: string, tags: string[],
  body: string[], takeaways: string[] = [], extra: Partial<ContentDetail> = {},
): ContentDetail {
  order += 1;
  return {
    id, channel, type, title, summary, minutes, age_label, tags, body: body.join('\n'), takeaways,
    duration: type === 'article' ? undefined : minutes * 60,
    source: SOURCE[channel] ?? '云岭青心内容组', author: AUTHOR[channel], license: LICENSE[channel] ?? '自有内容',
    status: 'published', reviewed_by: '内容组 · 三审会签',
    // 发布时间错开，越靠后写的越早发布，列表里新旧有层次
    published_at: new Date(Date.now() - (order * 9 + 6) * 3600_000).toISOString(),
    ...extra,
  };
}
