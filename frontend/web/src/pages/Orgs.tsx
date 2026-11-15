import { useState } from 'react';
import { Button, Input, Segmented, Table, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { OrgNode, Role, RosterResult, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import { PageHead, Sheet, Stat } from '@/components/ui';

const TYPE = { bureau: '教体局', school: '学校', grade: '年级', class: '班级' } as const;
const toNode = (n: OrgNode): DataNode => ({
  key: n.id,
  title: <span><b>{n.name}</b> <span className="faint">{TYPE[n.type]}</span> <span className="num muted">{n.student_count} 人</span></span>,
  children: n.children?.map(toNode),
});
const count = (nodes: OrgNode[], t: OrgNode['type']): number => nodes.reduce((a, n) => a + (n.type === t ? 1 : 0) + count(n.children ?? [], t), 0);

const HEAD = '姓名\t学籍号\t班级\t监护人手机号';
/** 合成的示例：故意带三行有问题的，方便看校验效果 */
const SAMPLE = [
  '和顺\tG53040220120301\t八年级（3）班\t13800000001', '普晴\tG53040220120302\t八年级（3）班\t13800000002', '字明亮\tG53040220120303\t八年级（3）班\t',
  '\tG53040220120304\t八年级（3）班\t13800000004', '段小满\t2012\t八年级（3）班\t13800000005', '罗一苇\tG53040220120302\t八年级3班\t1380000',
  '者海生\tG53040220120307\t八年级（4）班\t13800000007', '施云朵\tG53040220120308\t八年级（4）班\t13800000008',
].join('\n');
const parse = (text: string) => text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() && !l.startsWith('姓名'))
  .map((l) => { const [name = '', sno = '', class_name = '', guardian_phone = ''] = l.split(/\t|,|，/).map((x) => x.trim()); return { name, sno, class_name, guardian_phone: guardian_phone || undefined }; });

function Import() {
  const [text, setText] = useState('');
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [res, setRes] = useState<RosterResult | null>(null);
  const rows = parse(text);
  const preview = useAct(() => api<RosterResult>(Routes.rosterPreview, { body: { rows } }), []);
  const commit = useAct(() => api<RosterResult>(Routes.rosterCommit, { body: { rows } }), ['orgs'], '导入完成');
  const template = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + HEAD.replace(/\t/g, ',') + '\n'], { type: 'text/csv' }));
    a.download = '名册导入模板.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const bad = new Set(res?.errors.map((e) => e.row));

  return (
    <Sheet>
      <div className="steps-bar">
        {['一、贴入名册', '二、检查', '三、导入'].map((s, i) => <span key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>{s}</span>)}
      </div>

      {step === 0 && (
        <>
          <p className="muted">从表格里选中“姓名、学籍号、班级、监护人手机号”四列，复制后贴到下面。一行一个学生，最多 2000 行。先检查，不会直接写入。</p>
          <Input.TextArea style={{ marginTop: 12, fontFamily: 'var(--num)' }} rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={`${HEAD}\n…`} />
          <div className="row-actions" style={{ marginTop: 12 }}>
            <Button type="primary" disabled={rows.length === 0} loading={preview.isPending} onClick={() => preview.mutate(undefined, { onSuccess: (r) => (setRes(r), setStep(1)) })}>检查这 {rows.length} 行</Button>
            <Button onClick={() => setText(`${HEAD}\n${SAMPLE}`)}>填入示例（合成数据）</Button>
            <Button type="text" onClick={template}>下载空白模板</Button>
          </div>
        </>
      )}

      {step === 1 && res && (
        <>
          <div className="cols c-3" style={{ marginBottom: 16 }}>
            <Stat label="一共" value={res.total} note="行" />
            <Stat label="可以导入" value={res.valid} note="行" tone="ok" />
            <Stat label="有问题" value={bad.size} note="行，不会阻断其他行" tone={bad.size ? 'hot' : undefined} />
          </div>
          {res.errors.length > 0 && (
            <Table size="small" rowKey={(e) => `${e.row}-${e.field}`} dataSource={res.errors} pagination={false} style={{ marginBottom: 16 }}
              columns={[
                { title: '第几行', dataIndex: 'row', width: 90, render: (v) => <span className="num">{v}</span> },
                { title: '姓名', width: 120, render: (_, e) => rows[e.row - 1]?.name || <span className="faint">（空）</span> },
                { title: '哪一列', dataIndex: 'field', width: 140 },
                { title: '怎么改', dataIndex: 'message' },
              ]} />
          )}
          <div className="row-actions">
            <Button type="primary" disabled={res.valid === 0} loading={commit.isPending} onClick={() => commit.mutate(undefined, { onSuccess: (r) => (setRes(r), setStep(2)) })}>导入没问题的 {res.valid} 行</Button>
            <Button onClick={() => setStep(0)}>回去改</Button>
          </div>
        </>
      )}

      {step === 2 && res && (
        <div className="empty">
          <b>已导入 {res.imported} 位同学</b>
          同学凭学校码和学籍号后四位在小程序里激活；填了手机号的监护人可以绑定孩子。
          <div style={{ marginTop: 16 }}><Button onClick={() => (setText(''), setRes(null), setStep(0))}>再导一批</Button></div>
        </div>
      )}
    </Sheet>
  );
}

/** F-01 组织与名册：局—校—年级—班四级；学校信息员每学期导入名册 */
export default function Orgs() {
  const canImport = useAuth((s) => s.me)!.roles.includes(Role.schoolAdmin);
  const { data } = useGet<OrgNode[]>(['orgs'], Routes.orgTree);
  const [tab, setTab] = useState<'tree' | 'import'>('tree');
  const nodes = data ?? [];

  return (
    <>
      <PageHead title="学校与班级" sub="名册由学校信息员每学期导入。学生凭学校码和学籍号后四位在小程序里激活。">
        {canImport && <Segmented value={tab} onChange={(v) => setTab(v as 'tree' | 'import')} options={[{ value: 'tree', label: '组织结构' }, { value: 'import', label: '导入名册' }]} />}
      </PageHead>
      {tab === 'tree' ? (
        <>
          <div className="cols c-4" style={{ marginBottom: 20 }}>
            <Stat lead label="学生" value={nodes.reduce((a, n) => a + n.student_count, 0)} note="人" />
            <Stat label="学校" value={count(nodes, 'school')} note="所" />
            <Stat label="年级" value={count(nodes, 'grade')} note="个" />
            <Stat label="班级" value={count(nodes, 'class')} note="个" />
          </div>
          <Sheet>{data && <Tree treeData={nodes.map(toNode)} defaultExpandAll selectable={false} blockNode />}</Sheet>
        </>
      ) : <Import />}
    </>
  );
}
