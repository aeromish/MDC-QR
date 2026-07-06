import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { VerifyService } from './verify.service';
import { Public } from '../common/decorators';

@Controller('verify')
export class VerifyController {
  constructor(private svc: VerifyService) {}

  // Cong khai, khong can dang nhap. Gioi han chat de chong do serial hang loat (30/phut/IP).
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get()
  verify(@Query('sn') sn: string) {
    return this.svc.verify(sn);
  }
}
