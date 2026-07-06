import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Product, ProductImage } from '../entities/catalog.entities';
import { Light } from '../entities/tracking.entities';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, Light]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: diskStorage({
          destination: config.get('UPLOAD_DIR') || './uploads',
          filename: (_req, file, cb) => {
            const name = randomBytes(12).toString('hex') + extname(file.originalname);
            cb(null, name);
          },
        }),
        limits: { fileSize: (parseInt(config.get('MAX_UPLOAD_MB') || '3', 10)) * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          cb(null, /^image\//.test(file.mimetype));
        },
      }),
    }),
  ],
  controllers: [ProductsController, UploadsController],
  providers: [ProductsService],
})
export class ProductsModule {}
