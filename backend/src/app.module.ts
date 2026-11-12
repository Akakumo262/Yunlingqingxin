import { Module } from '@nestjs/common';
import { ApiController } from './modules/api.controller';
import { RuntimePersistence } from './infra/runtime-persistence';

@Module({
  controllers: [ApiController],
  providers: [RuntimePersistence],
})
export class AppModule {}
