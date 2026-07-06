import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { BatchesService } from './batches.service';
import { RequirePermissions, CurrentUser, AuthUser } from '../common/decorators';

class CreateBatchDto {
  @IsInt() @Min(1) @Max(1000) quantity: number;
  @IsOptional() @IsString() @MaxLength(3) prefix?: string;
  @IsOptional() @IsString() manufacturedAt?: string;
}

class UpdateBatchDto {
  @IsOptional() @IsString() @MaxLength(50) batchCode?: string;
  @IsOptional() @IsString() manufacturedAt?: string;
}

@Controller('batches')
export class BatchesController {
  constructor(private svc: BatchesService) {}

  @RequirePermissions('batch.view')
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @RequirePermissions('batch.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @RequirePermissions('batch.create')
  @Post()
  create(@Body() dto: CreateBatchDto, @CurrentUser() user: AuthUser) {
    return this.svc.createBatch(dto.quantity, dto.prefix, dto.manufacturedAt ?? null, user.userId);
  }

  @RequirePermissions('batch.edit')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    return this.svc.update(id, dto.batchCode, dto.manufacturedAt);
  }

  @RequirePermissions('batch.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
