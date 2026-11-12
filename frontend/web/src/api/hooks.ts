import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type { RouteDef } from '@yunling/contracts';
import { api } from './client';
import { fail } from '@/components/ui';

type Opts = Parameters<typeof api>[1];

/** 读：const { data } = useGet<Page<AlertItem>>(['alerts'], Routes.alertList) */
export function useGet<T>(key: unknown[], route: RouteDef, opts?: Opts, enabled = true) {
  return useQuery({ queryKey: key, queryFn: () => api<T>(route, opts), enabled });
}

/** 写：成功后刷新相关查询并给出一句话反馈 */
export function useAct<V, T = unknown>(fn: (v: V) => Promise<T>, refresh: string[], done?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      refresh.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (done) message.success(done);
    },
    onError: fail,
  });
}
