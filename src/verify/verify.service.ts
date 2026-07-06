import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class VerifyService {
  constructor(private ds: DataSource) {}

  async verify(sn: string) {
    const serial = (sn || '').trim();
    if (!serial) return { status: 'not_found' };
    const rows = await this.ds.query(
      `SELECT q.state, (q.voided_at IS NOT NULL) AS voided,
              l.product_id,
              p.name, p.code, p.power_w, p.cct_k, p.ip_rating, p.ik_rating, p.led_chip, p.driver,
              p.warranty_months, p.application, p.features,
              w.status AS w_status, w.customer_name, w.activated_at AS w_activated, w.expires_at
       FROM qr_codes q JOIN lights l ON l.light_id=q.light_id
       LEFT JOIN products p ON p.product_id=l.product_id
       LEFT JOIN warranties w ON w.light_id=l.light_id
       WHERE q.qr_code_value=$1`, [serial],
    );
    if (!rows.length) return { status: 'not_found', serial };
    const r = rows[0];
    if (r.voided) return { status: 'voided', serial };
    if (r.state === 'created') return { status: 'not_activated', serial };
    if (!r.product_id) return { status: 'activated_unassigned', serial, genuine: true };

    // assigned: tra full + tinh trang bao hanh
    let warranty: any = { status: r.w_status };
    if (r.w_status === 'active' && (!r.expires_at || new Date(r.expires_at) > new Date())) {
      warranty = { status: 'active', activatedAt: r.w_activated, expiresAt: r.expires_at, customerName: r.customer_name };
    } else if (r.w_status === 'inactive') {
      warranty = { status: 'inactive', warrantyMonths: r.warranty_months };
    } else {
      warranty = { status: r.expires_at && new Date(r.expires_at) <= new Date() ? 'expired' : r.w_status };
    }
    return {
      status: 'genuine',
      serial,
      product: {
        code: r.code, name: r.name, powerW: r.power_w, cctK: r.cct_k,
        ipRating: r.ip_rating, ikRating: r.ik_rating, ledChip: r.led_chip, driver: r.driver,
        warrantyMonths: r.warranty_months, application: r.application, features: r.features,
      },
      warranty,
    };
  }
}
