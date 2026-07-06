import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MaintenanceService } from './maintenance.service';
import { RequirePermissions, CurrentUser, AuthUser } from '../common/decorators';

class CreateMaintenanceDto {
  @IsString() @IsNotEmpty() serial: string;
  @IsIn(['inspection', 'repair', 'replacement', 'installation', 'other']) maintenanceType: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() performedAt?: string;
}

@Controller('maintenance')
export class MaintenanceController {
  constructor(private svc: MaintenanceService) {}

  @RequirePermissions('maintenance.view')
  @Get()
  list() {
    return this.svc.list();
  }

  @RequirePermissions('maintenance.create')
  @Post()
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto.serial, dto, user.userId);
  }
}
