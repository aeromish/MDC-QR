import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { QrService } from './qr.service';
import { RequirePermissions } from '../common/decorators';

class AssignDto { @IsString() @IsNotEmpty() productId: string; }
class EditSerialDto { @IsString() @IsNotEmpty() serial: string; }

@Controller()
export class QrController {
  constructor(private svc: QrService) {}

  @RequirePermissions('serial.view')
  @Get('serials')
  list(
    @Query('q') q?: string,
    @Query('productId') productId?: string,
    @Query('state') state?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.list({ q, productId, state, limit: limit ? +limit : undefined, offset: offset ? +offset : undefined });
  }

  @RequirePermissions('serial.view')
  @Get('serials/:sn')
  detail(@Param('sn') sn: string) {
    return this.svc.detail(sn);
  }

  @RequirePermissions('qr.activate')
  @Post('serials/:sn/activate')
  activate(@Param('sn') sn: string) {
    return this.svc.activate(sn);
  }

  @RequirePermissions('qr.assign')
  @Post('serials/:sn/assign')
  assign(@Param('sn') sn: string, @Body() dto: AssignDto) {
    return this.svc.assign(sn, dto.productId);
  }

  @RequirePermissions('qr.assign')
  @Post('serials/:sn/unassign')
  unassign(@Param('sn') sn: string) {
    return this.svc.unassign(sn);
  }

  @RequirePermissions('serial.edit')
  @Put('serials/:sn')
  edit(@Param('sn') sn: string, @Body() dto: EditSerialDto) {
    return this.svc.editSerial(sn, dto.serial);
  }

  @RequirePermissions('qr.reissue')
  @Post('serials/:sn/reissue')
  reissue(@Param('sn') sn: string) {
    return this.svc.reissue(sn);
  }

  @RequirePermissions('serial.delete')
  @Delete('serials/:sn')
  remove(@Param('sn') sn: string) {
    return this.svc.remove(sn);
  }

  // ----- thao tac hang loat theo lo -----
  @RequirePermissions('qr.activate')
  @Post('batches/:id/activate-all')
  activateAll(@Param('id') id: string) {
    return this.svc.activateBatch(id);
  }

  @RequirePermissions('qr.assign')
  @Post('batches/:id/assign-all')
  assignAll(@Param('id') id: string, @Body() dto: AssignDto) {
    return this.svc.assignBatch(id, dto.productId);
  }
}
