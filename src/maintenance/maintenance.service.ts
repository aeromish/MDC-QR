import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class MaintenanceService {
  constructor(private ds: DataSource) {}

  list(limit = 100) {
    return this.ds.query(
      `SELECT ml.maintenance_log_id, ml.maintenance_type, ml.description, ml.performed_at, ml.created_at,
              l.light_id, u.username AS user_name,
              (SELECT q.qr_code_value FROM qr_codes q WHERE q.light_id=l.light_id AND q.voided_at IS NULL LIMIT 1) AS serial
       FROM maintenance_logs ml JOIN lights l ON l.light_id=ml.light_id
       LEFT JOIN users u ON u.user_id=ml.user_id
       ORDER BY ml.maintenance_log_id DESC LIMIT $1`, [limit],
    );
  }

  async create(sn: string, dto: { maintenanceType: string; description?: string; performedAt?: string }, userId: string) {
    const rows = await this.ds.query(
      `SELECT l.light_id, l.product_id FROM qr_codes q JOIN lights l ON l.light_id=q.light_id
       WHERE q.qr_code_value=$1 AND q.voided_at IS NULL`, [sn],
    );
    if (!rows.length) throw new NotFoundException('Khong tim thay tem con hieu luc');
    if (!rows[0].product_id) throw new BadRequestException('Chi ghi bao tri cho den da gan san pham');
    await this.ds.query(
      `INSERT INTO maintenance_logs (light_id, user_id, maintenance_type, description, performed_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [rows[0].light_id, userId, dto.maintenanceType || 'other', dto.description ?? null, dto.performedAt ? new Date(dto.performedAt) : new Date()],
    );
    return { message: 'Da ghi log bao tri' };
  }
}
