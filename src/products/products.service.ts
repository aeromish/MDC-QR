import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product, ProductImage } from '../entities/catalog.entities';
import { Light } from '../entities/tracking.entities';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(ProductImage) private images: Repository<ProductImage>,
    @InjectRepository(Light) private lights: Repository<Light>,
    private ds: DataSource,
  ) {}

  findAll() {
    return this.products.find({ relations: ['images'], order: { productId: 'DESC' } });
  }

  async findOne(id: string) {
    const p = await this.products.findOne({ where: { productId: id }, relations: ['images'] });
    if (!p) throw new NotFoundException('Khong tim thay san pham');
    return p;
  }

  private async saveImages(productId: string, imgs?: { url: string; sortOrder?: number }[]) {
    await this.images.delete({ productId });
    if (imgs?.length) {
      const rows = imgs.slice(0, 3).map((im, i) =>
        this.images.create({ productId, url: im.url, sortOrder: im.sortOrder ?? i }),
      );
      await this.images.save(rows);
    }
  }

  async create(dto: any) {
    const dup = await this.products.findOne({ where: { code: dto.code } });
    if (dup) throw new ConflictException('Ma san pham da ton tai');
    const { images, ...data } = dto;
    const p = await this.products.save(this.products.create(data)) as unknown as Product;
    await this.saveImages(p.productId, images);
    return this.findOne(p.productId);
  }

  async update(id: string, dto: any) {
    const p = await this.findOne(id);
    if (dto.code && dto.code !== p.code) {
      const dup = await this.products.findOne({ where: { code: dto.code } });
      if (dup) throw new ConflictException('Ma san pham da ton tai');
    }
    const { images, ...data } = dto;
    await this.products.update(id, data);
    if (images !== undefined) await this.saveImages(id, images);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    const units = await this.lights.count({ where: { productId: id } });
    if (units > 0) {
      const activeW = await this.ds.query(
        `SELECT count(*)::int AS n FROM warranties w
         JOIN lights l ON l.light_id = w.light_id
         WHERE l.product_id = $1 AND w.status = 'active' AND (w.expires_at IS NULL OR w.expires_at > now())`,
        [id],
      );
      throw new BadRequestException(
        `Khong the xoa: con ${units} tem da gan san pham${activeW[0].n > 0 ? ` (trong do ${activeW[0].n} dang bao hanh)` : ''}. Hay go gan cac tem nay truoc.`,
      );
    }
    await this.products.delete(id);
    return { message: 'Da xoa san pham' };
  }
}
