import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { AssessmentBrief, AssessmentReport, AssessmentSession, InstrumentBrief, Routes } from '@yunling/contracts';
import { Section, ago } from '@/components/kit';
import { api, fail } from '@/services/api';
import { px } from '@/utils/ui';

/**
 * P-04 问卷列表 → P-05 作答 → P-06 结果，在同一页里推进。
 * 约束：不是考试；每一题都能跳过；不计时；娱乐问卷和成长问卷在样子上明确区分。
 */
export default function Assess() {
  const [list, setList] = useState<InstrumentBrief[]>([]);
  const [intro, setIntro] = useState<InstrumentBrief | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [s, setS] = useState<AssessmentSession | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [i, setI] = useState(0);
  const [report, setReport] = useState<AssessmentReport | null>(null);

  const [history, setHistory] = useState<AssessmentBrief[]>([]);
  const loadList = () => {
    api<InstrumentBrief[]>(Routes.instrumentList).then(setList).catch(fail);
    api<AssessmentBrief[]>(Routes.assessmentHistory).then(setHistory).catch(() => undefined);
  };
  useLoad(loadList);
  const reset = () => (setIntro(null), setS(null), setReport(null), setAgreed(false), setI(0), loadList());

  const start = async () => {
    try {
      const session = await api<AssessmentSession>(Routes.assessmentStart, { body: { instrument_id: intro!.id } });
      setS(session);
      setAnswers(session.items.map(() => null));
    } catch (e) {
      fail(e);
    }
  };
  const answer = async (v: number | null) => {
    const next = answers.map((a, k) => (k === i ? v : a));
    setAnswers(next);
    if (i < s!.items.length - 1) return setI(i + 1);
    try {
      setReport(await api<AssessmentReport>(Routes.assessmentSubmit, { params: { id: s!.id }, body: { answers: next } }));
    } catch (e) {
      fail(e);
    }
  };

  // ── 结果 ──
  if (report) {
    const fun = report.kind === 'entertainment';
    return (
      <View className="page">
        <View className={`card ${fun ? 'fun' : 'card--indigo'}`}>
          <View style={{ opacity: 0.8, fontSize: px('13px') }}>{report.instrument_name}</View>
          <View className="h1" style={{ fontSize: px('26px'), marginTop: px('4px'), color: fun ? '#7a5500' : '#fff' }}>{report.headline}</View>
          <View style={{ marginTop: px('10px'), opacity: 0.92 }}>{report.description}</View>
        </View>
        {report.strengths.length > 0 && <View className="section-title"><Text className="h2">你做得好的地方</Text></View>}
        {report.strengths.map((x) => <View key={x} className="card" style={{ marginBottom: px('8px'), padding: px('14px 16px') }}>{x}</View>)}
        <View className="section-title"><Text className="h2">可以试试</Text></View>
        {report.suggestions.map((x) => <View key={x} className="card" style={{ marginBottom: px('8px'), padding: px('14px 16px') }}>{x}</View>)}
        {report.suggest_talk && <View className="btn btn--help" style={{ marginTop: px('16px') }} onClick={() => Taro.navigateTo({ url: '/pages/help/index' })}>想找人聊聊</View>}
        <View className="faint" style={{ marginTop: px('20px') }}>{report.disclaimer}</View>
        {fun && <View className="faint">本结果不用于任何评价、分班、评优、招生、教师考核或医疗判断。</View>}
        <View className="btn btn--ghost" style={{ marginTop: px('20px') }} onClick={reset}>回到问卷列表</View>
      </View>
    );
  }

  // ── 作答：一屏一题 ──
  if (s) {
    const cur = s.items[i];
    return (
      <View className="page">
        <View className="row faint" style={{ marginBottom: px('8px') }}>
          <Text className="grow">第 {i + 1} 题，共 {s.items.length} 题</Text>
          {i > 0 && <Text className="link" onClick={() => setI(i - 1)}>上一题</Text>}
        </View>
        <View className="progress"><View className="progress__bar" style={{ width: `${((i + 1) / s.items.length) * 100}%` }} /></View>
        <View className="h1" style={{ fontSize: px('24px'), margin: px('28px 0 8px'), minHeight: px('96px') }}>{cur.text}</View>
        {s.options.map((o) => (
          <View key={o.value} className={`option${answers[i] === o.value ? ' option--on' : ''}`} onClick={() => answer(o.value)}>{o.label}</View>
        ))}
        <View className="faint" style={{ textAlign: 'center', marginTop: px('20px') }} onClick={() => answer(null)}>跳过这题</View>
        <View className="faint" style={{ textAlign: 'center', marginTop: px('14px') }} onClick={reset}>不做了，退出</View>
      </View>
    );
  }

  // ── 开始前的说明 ──
  if (intro) {
    const fun = intro.kind === 'entertainment';
    return (
      <View className="page">
        <View className="h1" style={{ fontSize: px('26px') }}>{intro.name}</View>
        <View className="muted" style={{ marginTop: px('6px') }}>{intro.item_count} 道题，大约 {intro.minutes} 分钟</View>
        <View className="card" style={{ marginTop: px('20px') }}>{intro.intro}</View>
        <View className={`card ${fun ? 'fun' : 'card--tint'}`} style={{ marginTop: px('12px') }}>{intro.disclaimer}</View>
        {fun && (
          <View className="row" style={{ marginTop: px('16px') }} onClick={() => setAgreed(!agreed)}>
            <View style={{ width: px('22px'), height: px('22px'), borderRadius: px('6px'), marginRight: px('10px'), border: px('2px solid #14264d'), background: agreed ? '#14264d' : 'transparent' }} />
            <Text className="grow">我已知晓：这只是好玩，不是医学诊断</Text>
          </View>
        )}
        <View className={`btn${fun && !agreed ? ' btn--off' : ''}`} style={{ marginTop: px('24px') }} onClick={() => (!fun || agreed) && start()}>开始</View>
        <View className="faint" style={{ textAlign: 'center', marginTop: px('14px') }} onClick={reset}>先不做</View>
      </View>
    );
  }

  // ── 列表：成长问卷与“轻松一下”分开摆放 ──
  const serious = list.filter((x) => x.kind !== 'entertainment'), fun = list.filter((x) => x.kind === 'entertainment');
  return (
    <View className="page">
      <View className="h1">成长问卷</View>
      <View className="muted">这不是考试，没有标准答案。想做就做，随时可以停。</View>
      <View style={{ marginTop: px('16px') }}>
        {serious.map((x) => (
          <View key={x.id} className="card" style={{ marginBottom: px('12px') }} onClick={() => setIntro(x)}>
            <View className="h2">{x.name}</View>
            <View className="muted">{x.intro}</View>
            <View className="faint" style={{ marginTop: px('6px') }}>{x.item_count} 题　约 {x.minutes} 分钟　{x.last_done_at ? `上次做是${ago(x.last_done_at)}` : '结果只有你和心理老师看得到'}</View>
          </View>
        ))}
      </View>
      {fun.length > 0 && <View className="section-title"><Text className="h2">轻松一下</Text><Text className="faint">只是好玩，不保存</Text></View>}
      {fun.map((x) => (
        <View key={x.id} className="card fun" style={{ marginBottom: px('12px') }} onClick={() => setIntro(x)}>
          <View className="h2">{x.name}</View>
          <View style={{ color: '#7a5500', fontSize: px('13px') }}>{x.intro}</View>
        </View>
      ))}
      {history.length > 0 && (
        <>
          <Section title="我做过的" aside="只有你自己和心理老师看得到" />
          <View className="card">
            {history.map((h) => (
              <View key={h.session_id} className="list-item" onClick={() => api<AssessmentReport>(Routes.assessmentReport, { params: { id: h.session_id } }).then(setReport).catch(fail)}>
                <View className="grow"><View className="bold">{h.instrument_name}</View><View className="faint">{h.headline}　{ago(h.created_at)}</View></View>
                <Text className="link">再看看</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
