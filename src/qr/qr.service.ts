import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { QrCode, Light, Warranty } from '../entities/tracking.entities';
import { Product } from '../entities/catalog.entities';

@Injectable()
export class QrService {
  constructor(
    @InjectRepository(QrCode) private qrs: Repository<QrCode>,
    @InjectRepository(Light) private lights: Repository<Light>,
    @InjectRepository(Warranty) private warranties: Repository<Warranty>,
    @InjectRepository(Product) private products: Repository<Product>,
    private ds: DataSource,
  ) {}

  private async bySerial(sn: string) {
    const qr = await this.qrs.findOne({ where: { qrCodeValue: sn } });
    if (!qr) throw new NotFoundException('Khong tim thay tem');
    return qr;
  }

  private async isWarrantyActive(lightId: string): Promise<boolean> {
    const rows = await this.ds.query(
      `SELECT 1 FROM warranties WHERE light_id=$1 AND status='active' AND (expires_at IS NULL OR expires_at > now())`,
      [lightId],
    );
    return rows.length > 0;
  }

  async list(opts: { q?: string; productId?: string; state?: string; limit?: number; offset?: number }) {
    const limit = Math.min(200, opts.limit || 50);
    const offset = opts.offset || 0;
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (opts.q) { params.push(`%${opts.q.toLowerCase()}%`); where.push(`lower(q.qr_code_value) LIKE $${params.length}`); }
    if (opts.productId) { params.push(opts.productId); where.push(`l.product_id = $${params.length}`); }
    if (opts.state === 'voided') where.push(`q.voided_at IS NOT NULL`);
    else {
      where.push(`q.voided_at IS NULL`);
      if (opts.state) { params.push(opts.state); where.push(`q.state = $${params.length}`); }
    }
    const base = `FROM qr_codes q JOIN lights l ON l.light_id=q.light_id WHERE ${where.join(' AND ')}`;
    const total = (await this.ds.query(`SELECT count(*)::int AS n ${base}`, params))[0].n;
    params.push(limit); params.push(offset);
    const rows = await this.ds.query(
      `SELECT q.qr_code_value AS serial, q.state, (q.voided_at IS NOT NULL) AS voided,
              l.light_id, l.product_id, p.name AS product_name, p.power_w,
              w.status AS warranty_status, w.expires_at
       ${base}
       LEFT JOIN products p ON p.product_id=l.product_id
       LEFT JOIN warranties w ON w.light_id=l.light_id
       ORDER BY q.qr_code_id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { total, limit, offset, items: rows };
  }

  async detail(sn: string) {
    const rows = await this.ds.query(
      `SELECT q.qr_code_value AS serial, q.state, (q.voided_at IS NOT NULL) AS voided, q.activated_at,
              l.light_id, l.status AS light_status, l.location, l.product_id,
              p.code AS product_code, p.name AS product_name, p.power_w, p.warranty_months,
              w.status AS warranty_status, w.customer_name, w.customer_phone, w.customer_email,
              w.activated_at AS warranty_activated_at, w.expires_at
       FROM qr_codes q JOIN lights l ON l.light_id=q.light_id
       LEFT JOIN products p ON p.product_id=l.product_id
       LEFT JOIN warranties w ON w.light_id=l.light_id
       WHERE q.qr_code_value=$1`, [sn],
    );
    if (!rows.length) throw new NotFoundException('Khong tim thay tem');
    return rows[0];
  }

  async activate(sn: string) {
    const qr = await this.bySerial(sn);
    if (qr.voidedAt) throw new BadRequestException('Tem da bi vo hieu');
    if (qr.state !== 'created') return this.detail(sn); // idempotent
    qr.state = 'activated'; qr.activatedAt = new Date();
    await this.qrs.save(qr);
    return this.detail(sn);
  }

  async activateBatch(batchId: string) {
    const res = await this.ds.query(
      `UPDATE qr_codes q SET state='activated', activated_at=now()
       FROM lights l WHERE q.light_id=l.light_id AND l.batch_id=$1
       AND q.state='created' AND q.voided_at IS NULL`,
      [batchId],
    );
    return { message: 'Da kich hoat', affected: res[1] ?? undefined };
  }

  // Gan tat ca tem DA KICH HOAT (chua gan, chua vo hieu) trong lo vao 1 san pham
  async assignBatch(batchId: string, productId: string) {
    const product = await this.products.findOne({ where: { productId } });
    if (!product) throw new NotFoundException('Khong tim thay san pham');
    const name = `${product.name} ${product.powerW || ''}W`.trim();
    return this.ds.transaction(async (m) => {
      const targets = await m.query(
        `SELECT q.qr_code_id, l.light_id FROM qr_codes q JOIN lights l ON l.light_id=q.light_id
         WHERE l.batch_id=$1 AND q.state='activated' AND q.voided_at IS NULL`,
        [batchId],
      );
      for (const t of targets) {
        await m.query(`UPDATE lights SET product_id=$1, name=$2 WHERE light_id=$3`, [productId, name, t.light_id]);
        await m.query(`UPDATE qr_codes SET state='assigned' WHERE qr_code_id=$1`, [t.qr_code_id]);
      }
      return { message: 'Da gan san pham', affected: targets.length };
    });
  }

  async assign(sn: string, productId: string) {
    const qr = await this.bySerial(sn);
    if (qr.voidedAt) throw new BadRequestException('Tem da bi vo hieu');
    if (qr.state === 'created') throw new BadRequestException('Can kich hoat ma QR truoc khi gan san pham');
    if (await this.isWarrantyActive(qr.lightId)) {
      throw new BadRequestException('Tem dang co bao hanh hieu luc — huy bao hanh truoc khi doi/gan san pham');
    }
    const product = await this.products.findOne({ where: { productId } });
    if (!product) throw new NotFoundException('Khong tim thay san pham');
    const light = await this.lights.findOne({ where: { lightId: qr.lightId } });
    if (!light) throw new NotFoundException('Khong tim thay don vi den');
    light.productId = productId;
    light.name = `${product.name} ${product.powerW || ''}W`.trim();
    await this.lights.save(light);
    qr.state = 'assigned';
    await this.qrs.save(qr);
    return this.detail(sn);
  }

  async unassign(sn: string) {
    const qr = await this.bySerial(sn);
    if (await this.isWarrantyActive(qr.lightId)) {
      throw new BadRequestException('Tem dang co bao hanh hieu luc — huy bao hanh truoc khi go san pham');
    }
    const light = await this.lights.findOne({ where: { lightId: qr.lightId } });
    if (!light) throw new NotFoundException('Khong tim thay don vi den');
    light.productId = null;
    light.name = '(chua gan san pham)';
    await this.lights.save(light);
    qr.state = 'activated';
    await this.qrs.save(qr);
    return this.detail(sn);
  }

  async editSerial(sn: string, newSerial: string) {
    const qr = await this.bySerial(sn);
    if (qr.voidedAt || qr.state !== 'created') {
      throw new BadRequestException('Chi sua serial khi tem con phoi (chua kich hoat)');
    }
    const v = newSerial.trim();
    if (!v) throw new BadRequestException('Serial khong duoc trong');
    const dup = await this.qrs.findOne({ where: { qrCodeValue: v } });
    if (dup && dup.qrCodeId !== qr.qrCodeId) throw new BadRequestException('Serial da ton tai');
    qr.qrCodeValue = v;
    await this.qrs.save(qr);
    return this.detail(v);
  }

  async reissue(sn: string) {
    const qr = await this.bySerial(sn);
    if (qr.voidedAt) throw new BadRequestException('Tem da bi vo hieu');
    if (qr.state === 'created') throw new BadRequestException('Tem con phoi — khong can cap lai, chi can in lai');
    const prefix = (qr.qrCodeValue || '003').slice(0, 3);
    return this.ds.transaction(async (m) => {
      const [{ v }] = await m.query(`SELECT nextval('serial_seq') AS v`);
      const newSerial = prefix + String(v).padStart(5, '0');
      // vo hieu tem cu truoc de khong vi pham unique index (1 tem hieu luc/den)
      await m.query(`UPDATE qr_codes SET voided_at=now() WHERE qr_code_id=$1`, [qr.qrCodeId]);
      await m.query(
        `INSERT INTO qr_codes (qr_code_value, light_id, state, activated_at, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [newSerial, qr.lightId, qr.state, qr.activatedAt ?? new Date(), qr.createdBy],
      );
      return { message: 'Da cap lai tem', newSerial, oldSerial: qr.qrCodeValue };
    });
  }

  async remove(sn: string) {
    const qr = await this.bySerial(sn);
    if (await this.isWarrantyActive(qr.lightId)) {
      throw new BadRequestException('Tem dang co bao hanh hieu luc — huy bao hanh truoc khi xoa');
    }
    await this.ds.transaction(async (m) => {
      await m.query(`DELETE FROM qr_codes WHERE qr_code_id=$1`, [qr.qrCodeId]);
      const rest = await m.query(`SELECT 1 FROM qr_codes WHERE light_id=$1 LIMIT 1`, [qr.lightId]);
      if (!rest.length) await m.query(`DELETE FROM lights WHERE light_id=$1`, [qr.lightId]);
    });
    return { message: 'Da xoa tem' };
  }
}
