import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { entities } from './database/data-source';
import { Init1710000000000 } from './database/migrations/1710000000000-Init';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { BatchesModule } from './batches/batches.module';
import { QrModule } from './qr/qr.module';
import { WarrantiesModule } from './warranties/warranties.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { VerifyModule } from './verify/verify.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: 'postgres',
        host: c.get('DB_HOST'),
        port: parseInt(c.get('DB_PORT') || '5432', 10),
        username: c.get('DB_USERNAME'),
        password: c.get('DB_PASSWORD'),
        database: c.get('DB_DATABASE'),
        entities,
        migrations: [Init1710000000000],
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        throttlers: [
          {
            ttl: parseInt(c.get('THROTTLE_TTL') || '60', 10) * 1000,
            limit: parseInt(c.get('THROTTLE_LIMIT') || '120', 10),
          },
        ],
      }),
    }),
    AuthModule,
    ProductsModule,
    BatchesModule,
    QrModule,
    WarrantiesModule,
    MaintenanceModule,
    VerifyModule,
    DashboardModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
