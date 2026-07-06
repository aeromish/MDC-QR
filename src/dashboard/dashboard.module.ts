import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RequirePermissions } from '../common/decorators';
import { Module } from '@nestjs/common';

@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @RequirePermissions('dashboard.view')
  @Get('stats')
  stats() {
    return this.svc.stats();
  }
}

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
