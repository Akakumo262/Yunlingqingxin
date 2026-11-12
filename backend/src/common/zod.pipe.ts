import { PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';
import { Problem } from './problem';

/** 用法：@Body(new ZodPipe(CheckInCreateReq)) body: CheckInCreateReq */
export class ZodPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}
  transform(value: unknown) {
    const parsed = this.schema.safeParse(value ?? {});
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
      throw new Problem(422, 'VALIDATION_FAILED', '请求参数不合法', detail);
    }
    return parsed.data;
  }
}
