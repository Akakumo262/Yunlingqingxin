import { useEffect, useState } from 'react';
import { useDidShow } from '@tarojs/taro';
import { Input, Switch, Text, Textarea, View } from '@tarojs/components';
import { FIVE_EDU, FIVE_EDU_LABEL, FIVE_EDU_NAME, FiveEdu, NoticeList, Passport, Routes } from '@yunling/contracts';
import { api, fail, logout, session } from '@/services/api';
import { Chips, Row, Section, StampToast, go } from '@/components/kit';
import { px, safeTop } from '@/utils/ui';

const SOURCE = { self: '自己记的', activity: '活动', action: '小行动' } as const;

/** P-08 成长护照：属于学生自己的记录。五育是五枚印章，只数盖了几次，不打分不排名。 */
export default function Me({ onBigType }: { onBigType: (v: boolean) => void }) {
  const [p, setP] = useState<Passport | null>(null);
  const [unread, setUnread] = useState(0);
  const [adding, setAdding] = useState(false);
  const [edu, setEdu] = useState<FiveEdu>('labor');
  const [title, setTitle] = useState('');
  const [reflection, setReflection] = useState('');
  const [strength, setStrength] = useState('');
  const [editing, setEditing] = useState(false);
  const [all, setAll] = useState(false);
  const [stamp, setStamp] = useState<FiveEdu | null>(null);
  const me = session.me!;

  const load = () => {
    api<Passport>(Routes.passportGet).then(setP).catch(fail);
    api<NoticeList>(Routes.noticeList).then((n) => setUnread(n.unread)).catch(() => undefined);
  };
  useEffect(load, []);
  useDidShow(() => void (p && load()));

  const add = async () => {
    if (!title.trim()) return;
    try {
      setP(await api<Passport>(Routes.passportAddRecord, { body: { edu, title: title.trim(), reflection: reflection.trim() || undefined } }));
      setStamp(edu);
      setTimeout(() => setStamp(null), 1800);
      setTitle(''), setReflection(''), setAdding(false);
    } catch (e) {
      fail(e);
    }
  };
  const saveStrengths = async (list: string[]) => {
    try {
      setP(await api<Passport>(Routes.passportUpdate, { body: { strengths: list } }));
    } catch (e) {
      fail(e);
    }
  };
  const total = p?.stamps.reduce((a, s) => a + s.count, 0) ?? 0;
  const records = all ? p?.records : p?.records.slice(0, 5);

  return (
    <View className="page page--bar" style={{ paddingTop: `${safeTop()}px` }}>
      <View className="passport">
        <View className="passport__kicker">成长护照</View>
        <View className="passport__name">{me.name}</View>
        <View style={{ opacity: 0.75, fontSize: px('13px') }}>{me.school_name}　{me.class_name}　圈子里叫“{me.nickname}”</View>
        <View className="stamps">
          {p?.stamps.map((s, i) => (
            <View key={s.edu} className={`stamp stamp--${i}`}>
              <Text className="edu">{FIVE_EDU_LABEL[s.edu]}</Text>
              <Text className="n num">{s.count} 次</Text>
            </View>
          ))}
        </View>
        <View style={{ opacity: 0.7, fontSize: px('12px'), marginTop: px('14px'), position: 'relative', zIndex: 1 }}>一共 {total} 枚印记。参加活动、完成小行动、自己记一件事，都会盖一枚。</View>
        <View className="ridge ridge--near" />
      </View>

      {p && (
        <>
          <Section title="我擅长的" aside={editing ? '改好了' : '改一改'} onAside={() => setEditing(!editing)} />
          <View>
            {p.strengths.map((s) => (
              <Text key={s} className="chip chip--rape" onClick={() => editing && saveStrengths(p.strengths.filter((x) => x !== s))}>{s}{editing ? '　×' : ''}</Text>
            ))}
            {p.strengths.length === 0 && !editing && <Text className="muted">还没有写。问问朋友“你觉得我哪里还不错”，把答案记在这里。</Text>}
          </View>
          {editing && (
            <View className="row mt8">
              <Input className="field grow" value={strength} maxlength={12} placeholder="加一条，比如：有耐心" onInput={(e) => setStrength(e.detail.value)} />
              <Text className="link" style={{ marginLeft: px('10px') }} onClick={() => strength.trim() && (saveStrengths([...p.strengths, strength.trim()]), setStrength(''))}>加上</Text>
            </View>
          )}

          <Section title="这学期的足迹" aside={adding ? '先不记' : '记一件事'} onAside={() => setAdding(!adding)} />
          {adding && (
            <View className="card" style={{ marginBottom: px('10px') }}>
              <View className="label" style={{ marginTop: 0 }}>这件事算哪一类</View>
              <Chips value={edu} onChange={setEdu} options={FIVE_EDU.map((e): [FiveEdu, string] => [e, FIVE_EDU_NAME[e]])} />
              <View className="label">做了什么</View>
              <Input className="field" value={title} maxlength={40} placeholder="比如：帮奶奶收了一下午玉米" onInput={(e) => setTitle(e.detail.value)} />
              <View className="label">想到了什么（可以不写）</View>
              <Textarea className="area" value={reflection} maxlength={300} placeholder="我看到了什么，想到了什么" onInput={(e) => setReflection(e.detail.value)} />
              <View className={`btn mt12${title.trim() ? '' : ' btn--off'}`} onClick={add}>记进成长护照</View>
            </View>
          )}
          <View className="card">
            {records?.map((r) => (
              <View key={r.id} className="record">
                <View className="bold">{r.title}</View>
                <View className="faint">{FIVE_EDU_NAME[r.edu]}　{r.date}{r.source ? `　${SOURCE[r.source]}` : ''}{r.witness ? `　${r.witness}见证` : ''}</View>
                {r.reflection && <View className="muted mt4">“{r.reflection}”</View>}
              </View>
            ))}
            {p.records.length === 0 && <View className="muted">还没有记录。从“记一件事”开始。</View>}
            {p.records.length > 5 && <View className="link center mt12" onClick={() => setAll(!all)}>{all ? '收起' : `看全部 ${p.records.length} 条`}</View>}
          </View>

          {p.messages.length > 0 && (
            <>
              <Section title="他们想对你说" />
              <View className="card">
                {p.messages.map((m, i) => (
                  <View key={i} className="quote" style={i === 0 ? { marginTop: 0 } : undefined}>
                    <View>{m.text}</View>
                    <View className="faint">{m.from}</View>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}

      <View className="card mt16">
        <Row iconName="bell" title="通知" hint="老师的回复、活动提醒、圈子里的回复" dot={unread > 0} onClick={() => go('notices')} />
        <Row iconName="star" title="我的收藏" hint="收藏的内容和看过的内容" onClick={() => go('favorites')} />
        <Row iconName="book" title="成长问卷" hint="不是考试，可以跳过任何一题" onClick={() => go('assess')} />
        <Row iconName="heart" title="我的求助和预约" hint="看看老师回应到哪一步了" color="#D9366B" onClick={() => go('help')} />
      </View>
      <View className="card mt12">
        <Row iconName="shield" title="隐私与授权" hint="谁看过我的记录，我同意了什么" onClick={() => go('privacy')} />
        <Row iconName="building" title="能帮到你的机构" hint="医院、咨询机构、社工和志愿者" onClick={() => go('institutions')} />
        <Row iconName="question" title="帮助与反馈" hint="常见问题，或者告诉我们哪里不好用" onClick={() => go('faq')} />
        <View className="list-item">
          <View className="grow"><View className="bold">大字号</View><View className="faint">字看着小就打开</View></View>
          <Switch checked={session.bigType} color="#1F5FD1" onChange={(e) => ((session.bigType = e.detail.value), onBigType(e.detail.value))} />
        </View>
      </View>
      <View className="faint center mt16" onClick={logout}>退出登录</View>
      <StampToast edu={stamp} />
    </View>
  );
}
