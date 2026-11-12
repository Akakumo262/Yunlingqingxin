import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { API_PREFIX, HeaderNames } from '@yunling/contracts';
import { AppModule } from './app.module';
import { config } from './config';
import { ProblemFilter } from './common/problem';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: config.corsOrigins,
    allowedHeaders: ['content-type', ...Object.values(HeaderNames)],
    exposedHeaders: [HeaderNames.requestId],
  });
  app.useGlobalFilters(new ProblemFilter());
  await app.listen(config.port, '0.0.0.0');
  console.log(`[api] http://localhost:${config.port}${API_PREFIX}  数据：${config.databaseUrl ? 'PostgreSQL' : '内存（重启清空）'}`);
}
bootstrap();
