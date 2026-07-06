import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { RequirePermissions } from '../common/decorators';

@Controller('uploads')
export class UploadsController {
  constructor(private config: ConfigService) {}

  @RequirePermissions('product.manage')
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Chua co file anh (field "file")');
    const base = this.config.get('PUBLIC_BASE_URL') || '';
    return { url: `${base}/uploads/${file.filename}`, filename: file.filename };
  }
}
