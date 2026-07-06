import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class WarrantiesService {
  constructor(private ds: DataSource) {}

  list() {
    return this.ds.query(
      `SELECT w.warranty_id, w.status, w.customer_name, w.customer_phone, w.customer_email,
              w.activated_at, w.expires_at, l.light_id, p.name AS product_name,
              (SELECT q.qr_code_value FROM qr_codes q WHERE q.light_id=l.light_id AND q.voided_at IS NULL LIMIT 1) AS serial
       FROM warranties w JOIN lights l ON l.light_id=w.light_id
       LEFT JOIN products p ON p.product_id=l.product_id
       WHERE w.status <> 'inactive'
       ORDER BY w.warranty_id DESC`,
    );
  }

  private async lightBySerial(sn: string) {
    const rows = await this.ds.query(
      `SELECT l.light_id, l.product_id, l.status, p.warranty_months,
              w.status AS w_status
       FROM qr_codes q JOIN lights l ON l.light_id=q.light_id
       LEFT JOIN products p ON p.product_id=l.product_id
       LEFT JOIN warranties w ON w.light_id=l.light_id
       WHERE q.qr_code_value=$1 AND q.voided_at IS NULL`, [sn],
    );
    if (!rows.length) throw new NotFoundException('Khong tim thay tem con hieu luc');
    return rows[0];
  }

  async activate(sn: string, dto: { customerName: string; customerPhone: string; customerEmail?: string; location?: string }) {
    const l = await this.lightBySerial(sn);
    if (!l.product_id) throw new BadRequestException('Tem chua gan san pham — khong the kich hoat bao hanh');
    const months = l.warranty_months || 60;
    await this.ds.transaction(async (m) => {
      await m.query(
        `UPDATE warranties SET status='active', customer_name=$2, customer_phone=$3, customer_email=$4,
           activated_at=now(), expires_at=now() + ($5 || ' months')::interval
         WHERE light_id=$1`,
        [l.light_id, dto.customerName, dto.customerPhone, dto.customerEmail ?? null, String(months)],
      );
      await m.query(
        `UPDATE lights SET status='installed', installed_at=now(), location=$2 WHERE light_id=$1`,
        [l.light_id, dto.location ?? null],
      );
    });
    return { message: 'Da kich hoat bao hanh' };
  }

  async edit(sn: string, dto: { customerName?: string; customerPhone?: string; customerEmail?: string; location?: string }) {
    const l = await this.lightBySerial(sn);
    if (l.w_status !== 'active') throw new BadRequestException('Chi sua duoc bao hanh dang hieu luc');
    await this.ds.query(
      `UPDATE warranties SET
         customer_name=COALESCE($2,customer_name),
         customer_phone=COALESCE($3,customer_phone),
         customer_email=COALESCE($4,customer_email)
       WHERE light_id=$1`,
      [l.light_id, dto.customerName ?? null, dto.customerPhone ?? null, dto.customerEmail ?? null],
    );
    if (dto.location !== undefined) {
      await this.ds.query(`UPDATE lights SET location=$2 WHERE light_id=$1`, [l.light_id, dto.location]);
    }
    return { message: 'Da cap nhat thong tin bao hanh' };
  }

  async void(sn: string) {
    const l = await this.lightBySerial(sn);
    await this.ds.transaction(async (m) => {
      await m.query(`UPDATE warranties SET status='void' WHERE light_id=$1`, [l.light_id]);
      await m.query(
        `UPDATE lights SET status='in_stock', installed_at=NULL, location=NULL
         WHERE light_id=$1 AND status='installed'`, [l.light_id],
      );
    });
    return { message: 'Da huy bao hanh' };
  }
}
