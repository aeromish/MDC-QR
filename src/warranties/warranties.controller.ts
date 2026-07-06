import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WarrantiesService } from './warranties.service';
import { RequirePermissions } from '../common/decorators';

class ActivateWarrantyDto {
  @IsString() @IsNotEmpty() customerName: string;
  @IsString() @IsNotEmpty() customerPhone: string;
  @IsOptional() @IsString() customerEmail?: string;
  @IsOptional() @IsString() location?: string;
}

class EditWarrantyDto {
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() customerPhone?: string;
  @IsOptional() @IsString() customerEmail?: string;
  @IsOptional() @IsString() location?: string;
}

@Controller('warranties')
export class WarrantiesController {
  constructor(private svc: WarrantiesService) {}

  @RequirePermissions('warranty.view')
  @Get()
  list() {
    return this.svc.list();
  }

  @RequirePermissions('warranty.activate')
  @Post(':sn/activate')
  activate(@Param('sn') sn: string, @Body() dto: ActivateWarrantyDto) {
    return this.svc.activate(sn, dto);
  }

  @RequirePermissions('warranty.edit')
  @Put(':sn')
  edit(@Param('sn') sn: string, @Body() dto: EditWarrantyDto) {
    return this.svc.edit(sn, dto);
  }

  @RequirePermissions('warranty.void')
  @Post(':sn/void')
  void(@Param('sn') sn: string) {
    return this.svc.void(sn);
  }
}
