import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Image, Text, Textarea, View } from '@tarojs/components';
import { APPOINTMENT_TOPICS, APPOINTMENT_TOPIC_LABEL, Appointment, AppointmentTopic, ContactTarget, HelpRequest, Routes, SignalCreated, Slot } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { icon } from '@/components/icons';
import { Chips, Section, ago, weekday } from '@/components/kit';
import { px } from '@/utils/ui';

const APPT = { pending: ['等老师确认', 'tag--wait'], confirmed: ['老师确认了', 'tag--ok'], done: ['已经聊过', 'tag--off'], cancelled: ['已取消', 'tag--off'] } as const;

/**
 * P-07 我想找人说。两步以内发起；页面只告诉学生“谁会在多久内联系你”和“现在到哪一步了”，不出现任何等级。
 * 不那么急的时候，可以约心理老师一个时间。
 */
export default function Help() {
  const [sent, setSent] = useState<{ who: ContactTarget; res: SignalCreated } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reqs, setReqs] = useState<HelpRequest[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [booking, setBooking] = useState(false);
  const [slot, setSlot] = useState('');
  const [topic, setTopic] = useState<AppointmentTopic>('other');
  const [note, setNote] = useState('');

  const load = () => {
    api<HelpRequest[]>(Routes.helpRequests).then(setReqs).catch(() => undefined);
    api<Slot[]>(Routes.appointmentSlots).then(setSlots).catch(() => undefined);
    api<Appointment[]>(Routes.appointmentList).then(setAppts).catch(() => undefined);
  };
  useDidShow(load);

  const call = () => Taro.makePhoneCall({ phoneNumber: '12355' }).catch(() => undefined);
  const send = async (who: ContactTarget) => {
    if (busy || sent) return;
    setBusy(true);
    try {
      setSent({ who, res: await api<SignalCreated>(Routes.signalCreate, { body: { source: 'one_click_help', contact_preference: [who] } }) });
      load();
    } catch {
      // 求助不能因为网络失败而落空：直接给出电话兜底
      Taro.showModal({ title: '暂时没连上', content: '消息没有发出去。如果情况紧急，请直接拨打 12355，或者去找身边任何一位你信任的大人。', confirmText: '拨打 12355', cancelText: '稍后再试' }).then((r) => { if (r.confirm) call(); });
    } finally {
      setBusy(false);
    }
  };
  const book = () => slot && api<Appointment>(Routes.appointmentCreate, { body: { slot_id: slot, topic, note: note.trim() || undefined } })
    .then(() => (setBooking(false), setSlot(''), setNote(''), load(), Taro.showToast({ title: '约好了，等老师确认', icon: 'none' }))).catch((e) => (fail(e), load()));
  const cancelAppt = (a: Appointment) => Taro.showModal({ title: '取消这次预约？', confirmText: '取消预约', cancelText: '不取消' }).then((r) => { if (r.confirm) api(Routes.appointmentCancel, { params: { id: a.id } }).then(load).catch(fail); });

  const days = [...new Set(slots.map((s) => s.date))];
  const active = appts.filter((a) => a.status === 'pending' || a.status === 'confirmed');

  return (
    <View className="page">
      <View className="h1">{sent ? '已经有人知道了' : '我想找人说'}</View>
      <View className="muted mt4">{sent ? sent.res.next : '选一种让你自在的方式。不用想好怎么说，先让人知道就行。'}</View>

      <View className={`help-opt${sent?.who === 'teacher' ? ' help-opt--done' : ''}`} onClick={() => send('teacher')}>
        <View className="badge"><Image className="icon" src={icon('teacher', '#1F5FD1')} /></View>
        <View style={{ flex: 1 }}><View className="bold">请班主任现在来找我</View><View className="muted">{sent?.who === 'teacher' ? '已经通知到了' : '老师会在 15 分钟内联系你'}</View></View>
      </View>
      <View className={`help-opt${sent?.who === 'psychologist' ? ' help-opt--done' : ''}`} onClick={() => send('psychologist')}>
        <View className="badge"><Image className="icon" src={icon('heart', '#1F5FD1')} /></View>
        <View style={{ flex: 1 }}><View className="bold">请心理老师现在来找我</View><View className="muted">{sent?.who === 'psychologist' ? '已经通知到了' : '心理老师会在 15 分钟内联系你'}</View></View>
      </View>
      <View className="help-opt" onClick={() => setBooking(!booking)}>
        <View className="badge"><Image className="icon" src={icon('calendar', '#1F5FD1')} /></View>
        <View style={{ flex: 1 }}><View className="bold">不急，约心理老师一个时间</View><View className="muted">午休或放学后，在心理辅导室</View></View>
      </View>

      {booking && (
        <View className="card mt12">
          <View className="bold">选一个时间</View>
          {days.map((d) => (
            <View key={d} className="mt8">
              <View className="faint">{Number(d.slice(5, 7))} 月 {Number(d.slice(8))} 日 {weekday(d)}</View>
              <View className="mt4">
                {slots.filter((s) => s.date === d).map((s) => (
                  <Text key={s.id} className={`chip${slot === s.id ? ' chip--on' : ''}`} style={s.available ? undefined : { opacity: 0.4, textDecoration: 'line-through' }} onClick={() => s.available && setSlot(s.id)}>{s.time}</Text>
                ))}
              </View>
            </View>
          ))}
          <View className="label">想聊哪方面（可以不选）</View>
          <Chips value={topic} onChange={setTopic} options={APPOINTMENT_TOPICS.map((t): [AppointmentTopic, string] => [t, APPOINTMENT_TOPIC_LABEL[t]])} />
          <Textarea className="area mt8" style={{ minHeight: px('70px') }} value={note} maxlength={200} placeholder="想先让老师知道的（可以不写）" onInput={(e) => setNote(e.detail.value)} />
          <View className={`btn mt12${slot ? '' : ' btn--off'}`} onClick={book}>约这个时间</View>
        </View>
      )}

      <View className="help-opt" onClick={call}>
        <View className="badge badge--hot"><Image className="icon" src={icon('phone', '#D9366B')} /></View>
        <View style={{ flex: 1 }}><View className="bold">拨打 12355</View><View className="muted">青少年服务台，有人接听，可以不说名字</View></View>
      </View>

      {sent && (
        <View className="card card--tint mt16">
          <View className="h2">等的这会儿，可以做的事</View>
          <View className="muted mt4">找个安静的地方坐下，慢慢呼吸三次。</View>
          <View className="muted">你不需要解释太多，老师会先听你说。</View>
          <View className="muted">如果十五分钟后还没人找你，再点一次，或者直接打 12355。</View>
        </View>
      )}

      {active.length > 0 && (
        <>
          <Section title="我约的时间" />
          {active.map((a) => (
            <View key={a.id} className="card" style={{ marginBottom: px('10px') }}>
              <View className="row"><Text className="bold grow">{Number(a.slot.date.slice(5, 7))} 月 {Number(a.slot.date.slice(8))} 日 {weekday(a.slot.date)}　{a.slot.time}</Text><Text className={`tag ${APPT[a.status][1]}`} style={{ margin: 0 }}>{APPT[a.status][0]}</Text></View>
              <View className="muted mt4">{a.slot.counselor_name}　{a.slot.place}</View>
              <View className="faint mt8" onClick={() => cancelAppt(a)}>去不了了，取消预约</View>
            </View>
          ))}
        </>
      )}

      {reqs.length > 0 && (
        <>
          <Section title="我的求助到哪一步了" />
          {reqs.slice(0, 3).map((r) => (
            <View key={r.id} className="card" style={{ marginBottom: px('10px') }}>
              <View className="bold">{r.status_text}</View>
              <View className="faint">{ago(r.created_at)}发出</View>
              <View className="flow mt12">
                {r.steps.map((s, i) => <View key={s.label} className={`flow__step${s.done ? ' flow__step--done' : r.steps[i - 1]?.done ? ' flow__step--now' : ''}`}>{s.label}{s.done && s.at ? <Text className="faint">　{ago(s.at)}</Text> : null}</View>)}
              </View>
            </View>
          ))}
        </>
      )}

      <View className="btn btn--help mt16" onClick={call}>情况紧急，现在就拨 12355</View>
      <View className="faint center mt12" style={{ paddingBottom: px('20px') }}>有人身危险时，请直接拨打 110 或 120。</View>
    </View>
  );
}
