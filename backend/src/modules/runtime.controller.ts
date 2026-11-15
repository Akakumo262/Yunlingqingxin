import { All, Controller, Req, Res } from '@nestjs/common';
import { RuntimeService } from '../infra/runtime';

@Controller()
export class RuntimeController {
  constructor(private readonly runtime: RuntimeService) {}

  @All('*')
  async dispatch(@Req() req: any, @Res() reply: any) {
    const result = await this.runtime.handle({
      method: req.method,
      url: req.raw?.url ?? req.url,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });
    if (result.contentType) reply.header('content-type', result.contentType);
    return reply.status(result.status).send(result.body);
  }
}
