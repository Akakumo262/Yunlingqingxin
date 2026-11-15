import { Module } from '@nestjs/common';
import { RuntimeService } from './infra/runtime';
import { RuntimeController } from './modules/runtime.controller';

@Module({
  controllers: [RuntimeController],
  providers: [RuntimeService],
})
export class AppModule {}
