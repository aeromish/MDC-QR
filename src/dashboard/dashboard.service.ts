import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private ds: DataSource) {}

  async stats() {
    const [products] = await this.ds.query(`SELECT count(*)::int AS n FROM products`);
    const [batches] = await this.ds.query(`SELECT count(*)::int AS n FROM batches`);
    const lifecycle = await this.ds.query(
      `SELECT state, count(*)::int AS n FROM qr_codes WHERE voided_at IS NULL GROUP BY state`,
    );
    const life = { created: 0, activated: 0, assigned: 0 };
    let totalQr = 0;
    for (const r of lifecycle) { life[r.state] = r.n; totalQr += r.n; }

    const [activeW] = await this.ds.query(
      `SELECT count(*)::int AS n FROM warranties w JOIN lights l ON l.light_id=w.light_id
       WHERE l.product_id IS NOT NULL AND w.status='active' AND (w.expires_at IS NULL OR w.expires_at > now())`,
    );
    const warrantyBreakdown = await this.ds.query(
      `SELECT CASE WHEN w.status='active' AND (w.expires_at IS NULL OR w.expires_at>now()) THEN 'active'
                   WHEN w.status IN ('void') OR (w.status='active' AND w.expires_at<=now()) THEN 'expired'
                   ELSE 'inactive' END AS bucket,
              count(*)::int AS n
       FROM warranties w JOIN lights l ON l.light_id=w.light_id
       WHERE l.product_id IS NOT NULL GROUP BY bucket`,
    );
    const byProduct = await this.ds.query(
      `SELECT p.name, count(l.light_id)::int AS n
       FROM lights l JOIN products p ON p.product_id=l.product_id
       GROUP BY p.name ORDER BY n DESC LIMIT 12`,
    );
    const recentMaintenance = await this.ds.query(
      `SELECT ml.maintenance_type, ml.description, ml.performed_at, l.name AS light_name
       FROM maintenance_logs ml JOIN lights l ON l.light_id=ml.light_id
       ORDER BY ml.maintenance_log_id DESC LIMIT 5`,
    );

    return {
      counts: { products: products.n, batches: batches.n, totalQr, activeWarranties: activeW.n },
      lifecycle: life,
      warranty: warrantyBreakdown,
      byProduct,
      recentMaintenance,
    };
  }
}
