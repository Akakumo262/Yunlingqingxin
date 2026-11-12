import { Button } from 'antd';
import { ModerateAction, ModerationItem, Page, REPORT_REASONS, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { Empty, PageHead, Sheet, fmtTime } from '@/components/ui';

const WHY = { new_user: '新同学的前三条', reported: '被同学举报', keyword: '命中关键词' } as const;
const REASON: Record<(typeof REPORT_REASONS)[number], string> = { bullying: '欺负人', privacy: '泄露隐私', ad: '广告', self_harm: '伤害自己的内容', other: '其他' };

/** P-36 成长圈审核：先审后发的新帖与被举报的帖子 */
export default function Moderation() {
  const { data } = useGet<Page<ModerationItem>>(['moderation'], Routes.moderationQueue);
  const act = useAct((v: { id: string; action: ModerateAction }) => api(Routes.postModerate, { params: { id: v.id }, body: { action: v.action } }), ['moderation'], '已处理');
  const items = data?.items ?? [];

  return (
    <>
      <PageHead title="成长圈审核" sub="同学在圈子里只显示昵称。遇到让人担心的发言，不要自己处理，转给心理老师。" />
      <Sheet title="待处理" aside={`${items.length} 条`}>
        {items.length === 0 && <Empty title="都处理完了" hint="新帖和举报会出现在这里。" />}
        {items.map(({ post, circle_name, why, report_reason }) => (
          <div className="row" key={post.id} style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <b>{post.nickname}</b>
                <span className={`pill ${why === 'reported' ? 'stop' : 'wait'}`}>{WHY[why]}{report_reason && `：${REASON[report_reason]}`}</span>
                <span className="faint">{circle_name} · {fmtTime(post.created_at)}</span>
              </div>
              <p style={{ marginTop: 6 }}>{post.content}</p>
            </div>
            <div className="row-actions">
              <Button type="primary" onClick={() => act.mutate({ id: post.id, action: 'approve' })}>{why === 'reported' ? '没有问题' : '通过'}</Button>
              <Button danger onClick={() => act.mutate({ id: post.id, action: why === 'reported' ? 'remove' : 'reject' })}>{why === 'reported' ? '删除' : '退回'}</Button>
            </div>
          </div>
        ))}
      </Sheet>
    </>
  );
}
