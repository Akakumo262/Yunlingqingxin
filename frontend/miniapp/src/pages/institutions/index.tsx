import { useState } from 'react';
import { useLoad } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { INSTITUTION_TYPE_LABEL, Institution, Routes } from '@yunling/contracts';
import { api, fail } from '@/services/api';
import { px } from '@/utils/ui';

/** P-33 机构目录：只展示核验过资质的机构。服务由学校或团委统一安排，不向学生收费。 */
export default function Institutions() {
  const [list, setList] = useState<Institution[]>([]);
  useLoad(() => void api<Institution[]>(Routes.institutionList).then(setList).catch(fail));

  return (
    <View className="page">
      <View className="h1">能帮到你的机构</View>
      <View className="muted">这些机构的资质都核验过。需要时由学校帮你联系，不用自己花钱。</View>
      <View style={{ marginTop: px('16px') }}>
        {list.map((i) => (
          <View key={i.id} className="card" style={{ marginBottom: px('12px') }}>
            <View className="faint">{INSTITUTION_TYPE_LABEL[i.type]}　{i.district}</View>
            <View className="h2" style={{ marginTop: px('2px') }}>{i.name}</View>
            <View className="muted" style={{ margin: px('4px 0 10px') }}>{i.intro}</View>
            <View>{i.services.map((s) => <Text key={s} className="chip">{s}</Text>)}</View>
          </View>
        ))}
      </View>
    </View>
  );
}
