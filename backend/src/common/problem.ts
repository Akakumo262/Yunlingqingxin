import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { ErrorCode, Problem as ProblemBody } from '@yunling/contracts';

/** 业务错误统一抛这个：throw new Problem(403, 'PURPOSE_DENIED', '目的码不允许', '…') */
export class Problem extends HttpException {
  constructor(status: number, public readonly code: ErrorCode, title: string, public readonly detail?: string) {
    super(title, status);
  }
}

const STATUS_CODE: Record<number, ErrorCode> = {
  400: 'VALIDATION_FAILED', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'RATE_LIMITED', 501: 'NOT_IMPLEMENTED',
};

/** 所有错误输出为 RFC 9457 problem+json；不泄露堆栈 */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(err: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest();
    const reply = http.getResponse();
    const isHttp = err instanceof HttpException;
    const status = isHttp ? err.getStatus() : 500;
    if (!isHttp && process.env.NODE_ENV !== 'test') console.error(err);
    const code: ErrorCode = err instanceof Problem ? err.code : (STATUS_CODE[status] ?? 'INTERNAL');
    const body: ProblemBody = {
      type: `https://errors.yunling.local/${code.toLowerCase().replace(/_/g, '-')}`,
      title: isHttp ? err.message : 'Internal error',
      status,
      detail: err instanceof Problem ? err.detail : undefined,
      code,
      request_id: req.id,
    };
    reply.status(status).header('content-type', 'application/problem+json').send(body);
  }
}
