import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrCode, Light, Warranty } from '../entities/tracking.entities';
import { Product } from '../entities/catalog.entities';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QrCode, Light, Warranty, Product])],
  controllers: [QrController],
  providers: [QrService],
})
export class QrModule {}
