import { Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { OrgNode, Routes } from '@yunling/contracts';
import { useGet } from '@/api/hooks';
import { PageHead, Sheet } from '@/components/ui';

const TYPE = { bureau: '教体局', school: '学校', grade: '年级', class: '班级' } as const;
const toNode = (n: OrgNode): DataNode => ({
  key: n.id,
  title: <span><b>{n.name}</b> <span className="faint">{TYPE[n.type]}</span> <span className="num muted">{n.student_count} 人</span></span>,
  children: n.children?.map(toNode),
});

/** F-01 组织与名册：局—校—年级—班四级 */
export default function Orgs() {
  const { data } = useGet<OrgNode[]>(['orgs'], Routes.orgTree);
  return (
    <>
      <PageHead title="学校与班级" sub="名册由学校信息员每学期用模板导入。学生凭学校码和学籍号后四位在小程序里激活。" />
      <Sheet>{data && <Tree treeData={data.map(toNode)} defaultExpandAll selectable={false} blockNode />}</Sheet>
    </>
  );
}
