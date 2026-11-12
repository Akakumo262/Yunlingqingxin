import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditService } from './common/audit';
import { AuthGuard } from './common/auth';
import { Store } from './infra/store';
import { AlertController, AuditController, AuthController, CheckInController, HealthController } from './modules/core.controllers';

@Module({
  controllers: [HealthController, AuthController, CheckInController, AlertController, AuditController],
  providers: [Store, AuditService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
