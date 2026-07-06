import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import {
  IsArray, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductsService } from './products.service';
import { RequirePermissions } from '../common/decorators';

class ImageDto {
  @IsString() url: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

class ProductDto {
  @IsString() @MaxLength(50) code: string;
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsInt() powerW?: number;
  @IsOptional() @IsInt() cctK?: number;
  @IsOptional() @IsString() powerFactor?: string;
  @IsOptional() @IsString() cri?: string;
  @IsOptional() @IsString() ipRating?: string;
  @IsOptional() @IsString() ikRating?: string;
  @IsOptional() @IsString() dimming?: string;
  @IsOptional() @IsString() ledChip?: string;
  @IsOptional() @IsString() driver?: string;
  @IsOptional() @IsInt() @Min(0) warrantyMonths?: number;
  @IsOptional() @IsString() application?: string;
  @IsOptional() @IsString() features?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImageDto) images?: ImageDto[];
}

@Controller('products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @RequirePermissions('product.view')
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @RequirePermissions('product.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @RequirePermissions('product.manage')
  @Post()
  create(@Body() dto: ProductDto) {
    return this.svc.create(dto);
  }

  @RequirePermissions('product.manage')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<ProductDto>) {
    return this.svc.update(id, dto);
  }

  @RequirePermissions('product.manage')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
