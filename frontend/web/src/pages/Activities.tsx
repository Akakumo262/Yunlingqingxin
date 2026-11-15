import { useState } from 'react';
import { Button, DatePicker, Drawer, Form, Input, InputNumber, Segmented, Select, Spin, Switch } from 'antd';
import { ActivityCard, ActivityDetail, ActivityRoster, ActivityStatus, FIVE_EDU, FIVE_EDU_NAME, FiveEdu, MyActivityStatus, ORGANIZER_TYPES, ORGANIZER_TYPE_LABEL, Role, Routes } from '@yunling/contracts';
import { api } from '@/api/client';
import { useAct, useGet } from '@/api/hooks';
import { useAuth } from '@/store/auth';
import { Bar, Cover, EduBadge, Empty, PageHead, Stat, fmtClock, fmtDate, weekday } from '@/components/ui';

const STATUS: Record<ActivityStatus, { text: string; cls: string }> = { open: { text: '报名中', cls: 'ok' }, full: { text: '名额已满', cls: 'wait' }, ongoing: { text: '进行中', cls: '' }, ended: { text: '已结束', cls: 'off' } };
const MY: Record<MyActivityStatus, { text: string; cls: string }> = { none: { text: '未报名', cls: 'off' }, signed: { text: '已报名', cls: '' }, checked_in: { text: '已签到', cls: 'wait' }, reflected: { text: '写了反思', cls: 'ok' } };
const when = (a: ActivityCard) => (fmtDate(a.start_at) === fmtDate(a.end_at) ? `${fmtDate(a.start_at)} 周${weekday(a.start_at)} ${fmtClock(a.start_at)}—${fmtClock(a.end_at)}` : `${fmtDate(a.start_at)} 至 ${fmtDate(a.end_at)}`);
const lines = (v?: string) => (v ?? '').split(/\n|、/).map((x) => x.trim()).filter(Boolean);

function ActivityDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: a } = useGet<ActivityDetail>(['activities', id], Routes.activityGet, { params: { id: id ?? '' } }, !!id);
  const mine = !!a?.check_in_code;
  const roster = useGet<ActivityRoster>(['activities', id, 'roster'], Routes.activityRoster, { params: { id: id ?? '' } }, !!id && mine);
  const witness = useAct((student_id: string) => api(Routes.activityWitness, { params: { id: id! }, body: { student_id } }), ['activities'], '已见证，这条记录写进了同学的成长护照');
  const items = roster.data?.items ?? [];

  return (
    <Drawer open={!!id} onClose={onClose} width={640} destroyOnClose title={a ? FIVE_EDU_NAME[a.edu] : '活动'}>
      {!a ? <Spin /> : (
        <div style={{ display: 'grid', gap: 22 }}>
          <Cover id={a.id} kind={a.edu} className="wide" />
          <div>
            <h2 style={{ fontSize: 24, lineHeight: 1.35 }}>{a.title}</h2>
            <div className="meta-line" style={{ marginTop: 8 }}>
              <span className={`pill ${STATUS[a.status].cls}`}>{STATUS[a.status].text}</span>
              <span>{when(a)}</span><span>{a.place}</span><span>{a.organizer}</span><span>面向{a.audience}</span>
            </div>
          </div>

          {mine ? (
            <div className="cols c-1-1">
              <div><div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>现场签到码，到场后念给同学</div><div className="code-big">{a.check_in_code}</div></div>
              <div className="cols c-1-1" style={{ gap: 10 }}>
                <Stat label="已报名" value={`${a.signed_count}`} note={`名额 ${a.capacity}`} />
                <Stat label="写了反思" value={items.filter((i) => i.status === 'reflected').length} note="人" tone="ok" />
              </div>
            </div>
          ) : <p className="faint">这场活动不是你组织的，所以看不到名单和签到码。</p>}

          <section><h3>做什么</h3><p className="muted" style={{ marginTop: 6 }}>{a.intro}</p></section>
          {a.schedule.length > 0 && <section><h3 style={{ marginBottom: 10 }}>怎么安排</h3><div className="tl">{a.schedule.map((s) => <div key={s}><p style={{ color: 'var(--ink)' }}>{s}</p></div>)}</div></section>}
          {a.bring.length > 0 && <section><h3 style={{ marginBottom: 8 }}>要带什么</h3><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{a.bring.map((b) => <span key={b} className="pill">{b}</span>)}</div></section>}
          <section className="quote"><small>安全</small>{a.safety}</section>

          {mine && (
            <section>
              <h3 style={{ marginBottom: 4 }}>名单</h3>
              <p className="faint" style={{ fontSize: 12 }}>只记参与和亮点，不做心理判断。为同学做见证后，他的成长护照里会写上你的名字。</p>
              {items.length === 0 && <Empty title="还没有本班同学报名" hint="同学在小程序“发现 → 活动”里报名。" />}
              {items.map((i) => (
                <div className="row" key={i.student.id} style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <b>{i.student.name}</b> <span className="faint">{i.student.class_name}</span>
                    {i.reflection && <div className="quote" style={{ marginTop: 6 }}>{i.reflection}</div>}
                  </div>
                  <span className={`pill ${MY[i.status].cls}`}>{MY[i.status].text}</span>
                  {i.witnessed ? <span className="pill ok">已见证</span> : <Button size="small" disabled={i.status === 'signed'} loading={witness.isPending && witness.variables === i.student.id} onClick={() => witness.mutate(i.student.id)}>做见证</Button>}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}

/** 五育活动：发起 → 学生报名 → 现场签到码 → 学生写反思 → 老师见证 → 进成长护照 */
export default function Activities() {
  const me = useAuth((s) => s.me)!;
  const [edu, setEdu] = useState<FiveEdu | ''>('');
  const [mine, setMine] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const { data } = useGet<ActivityCard[]>(['activities', 'list', edu, mine], Routes.activityList, { query: { edu, mine: mine ? '1' : undefined } });
  const create = useAct((body: object) => api<ActivityDetail>(Routes.activityCreate, { body }), ['activities'], '活动已发布，同学会收到通知');
  const list = data ?? [];
  const submit = async () => {
    const v = await form.validateFields();
    const { range, schedule, bring, ...rest } = v;
    create.mutate({ ...rest, start_at: range[0].toISOString(), end_at: range[1].toISOString(), schedule: lines(schedule), bring: lines(bring) }, { onSuccess: (a) => (setCreating(false), setId(a.id)) });
  };

  return (
    <>
      <PageHead title="五育活动" sub="活动是成长护照的来源：同学到场、写下两句话、老师做见证，这段经历才算数。">
        <Segmented value={edu} onChange={(v) => setEdu(v as FiveEdu | '')} options={[{ value: '', label: '全部' }, ...FIVE_EDU.map((e) => ({ value: e, label: FIVE_EDU_NAME[e] }))]} />
        <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Switch size="small" checked={mine} onChange={setMine} />只看我组织的</span>
        <Button type="primary" onClick={() => (form.resetFields(), setCreating(true))}>发起活动</Button>
      </PageHead>
      {data && list.length === 0 && <div className="sheet"><Empty title="这一类还没有活动" hint="发起一场，同学就能在小程序里报名。" /></div>}
      <div className="tiles">
        {list.map((a) => (
          <button className="tile" key={a.id} onClick={() => setId(a.id)}>
            <Cover id={a.id} kind={a.edu} />
            <div className="meta-line"><EduBadge edu={a.edu} /><span>{ORGANIZER_TYPE_LABEL[a.organizer_type]}组织</span><span className={`pill ${STATUS[a.status].cls}`} style={{ marginLeft: 'auto' }}>{STATUS[a.status].text}</span></div>
            <div><b>{a.title}</b><small>{when(a)} · {a.place}</small></div>
            <div><div className="meta-line" style={{ justifyContent: 'space-between', marginBottom: 4 }}><span>{a.organizer}</span><span className="num">{a.signed_count} / {a.capacity}</span></div><Bar value={a.signed_count / a.capacity} tone={a.signed_count >= a.capacity ? 'rape' : undefined} /></div>
          </button>
        ))}
      </div>

      <ActivityDrawer id={id} onClose={() => setId(null)} />
      <Drawer open={creating} onClose={() => setCreating(false)} width={560} title="发起活动" destroyOnClose extra={<Button type="primary" loading={create.isPending} onClick={submit}>发布</Button>}>
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ edu: 'labor', capacity: 30, audience: '初中', organizer_type: me.roles.includes(Role.committee) ? 'committee' : me.roles.includes(Role.community) ? 'community' : 'school', safety: '全程有老师或志愿者陪同。' }}>
          <div className="cols c-1-1">
            <Form.Item name="edu" label="属于哪一育"><Select options={FIVE_EDU.map((e) => ({ value: e, label: FIVE_EDU_NAME[e] }))} /></Form.Item>
            <Form.Item name="organizer_type" label="谁组织"><Select options={ORGANIZER_TYPES.map((t) => ({ value: t, label: ORGANIZER_TYPE_LABEL[t] }))} /></Form.Item>
          </div>
          <Form.Item name="title" label="活动名" rules={[{ required: true, min: 2, message: '写一个同学一看就懂的名字' }]}><Input maxLength={40} placeholder="比如：校园菜地值周" /></Form.Item>
          <Form.Item name="intro" label="做什么" rules={[{ required: true, message: '用两三句话说清楚要做什么' }]}><Input.TextArea rows={3} maxLength={500} /></Form.Item>
          <Form.Item name="range" label="什么时候" rules={[{ required: true, message: '选开始和结束时间' }]}><DatePicker.RangePicker showTime={{ format: 'HH:mm', minuteStep: 10 }} format="M月D日 HH:mm" style={{ width: '100%' }} /></Form.Item>
          <div className="cols c-1-1">
            <Form.Item name="place" label="在哪" rules={[{ required: true, message: '写地点' }]}><Input /></Form.Item>
            <Form.Item name="capacity" label="名额" rules={[{ required: true }]}><InputNumber min={1} max={500} style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="audience" label="面向谁"><Input placeholder="初中 / 八年级 / 全校" /></Form.Item>
          <Form.Item name="schedule" label="怎么安排" extra="一行一步。"><Input.TextArea rows={3} placeholder={'14:00 集合，讲安全\n14:20 分组动手\n15:40 收拾，说两句'} /></Form.Item>
          <Form.Item name="bring" label="要带什么" extra="用顿号或换行隔开。"><Input placeholder="水杯、帽子、旧衣服" /></Form.Item>
          <Form.Item name="safety" label="安全说明" extra="校外活动报名时，家长会收到这句话。"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
