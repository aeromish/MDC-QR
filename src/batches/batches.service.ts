import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Batch } from '../entities/catalog.entities';

@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(Batch) private batches: Repository<Batch>,
    private ds: DataSource,
  ) {}

  private async statsFor(batchId: string) {
    const rows = await this.ds.query(
      `SELECT q.state, (q.voided_at IS NOT NULL) AS voided, count(*)::int AS n
       FROM qr_codes q JOIN lights l ON l.light_id = q.light_id
       WHERE l.batch_id = $1 GROUP BY q.state, voided`,
      [batchId],
    );
    const s = { total: 0, created: 0, activated: 0, assigned: 0, voided: 0 };
    for (const r of rows) {
      if (r.voided) s.voided += r.n;
      else { s.total += r.n; s[r.state] += r.n; }
    }
    return s;
  }

  async findAll() {
    const list = await this.batches.find({ order: { batchId: 'DESC' } });
    return Promise.all(
      list.map(async (b) => ({ ...b, stats: await this.statsFor(b.batchId) })),
    );
  }

  async findOne(id: string) {
    const b = await this.batches.findOne({ where: { batchId: id } });
    if (!b) throw new NotFoundException('Khong tim thay lo');
    return { ...b, stats: await this.statsFor(id) };
  }

  private async nextBatchCode(): Promise<string> {
    const d = new Date();
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const [{ n }] = await this.ds.query(`SELECT count(*)::int AS n FROM batches`);
    return `LOT-${ym}-${String(n + 1).padStart(3, '0')}`;
  }

  // Tao lo phoi: N tem chua gan san pham (light in_stock + qr created + warranty inactive)
  async createBatch(quantity: number, prefix: string, manufacturedAt: string | null, createdBy: string) {
    const qty = Math.min(1000, Math.max(1, quantity | 0));
    const pref = (prefix || '003').slice(0, 3);
    const batchCode = await this.nextBatchCode();
    const when = manufacturedAt ? new Date(manufacturedAt) : new Date();

    return this.ds.transaction(async (m) => {
      const batchRes = await m.query(
        `INSERT INTO batches (batch_code, product_id, quantity, manufactured_at, created_by)
         VALUES ($1, NULL, $2, $3, $4) RETURNING batch_id`,
        [batchCode, qty, when, createdBy],
      );
      const batchId = batchRes[0].batch_id;

      // Lay qty so serial tu sequence
      const seqRows = await m.query(
        `SELECT nextval('serial_seq') AS v FROM generate_series(1, $1)`,
        [qty],
      );
      for (const row of seqRows) {
        const serial = pref + String(row.v).padStart(5, '0');
        const lightRes = await m.query(
          `INSERT INTO lights (name, status, batch_id) VALUES ($1, 'in_stock', $2) RETURNING light_id`,
          ['(chua gan san pham)', batchId],
        );
        const lightId = lightRes[0].light_id;
        await m.query(
          `INSERT INTO qr_codes (qr_code_value, light_id, state, created_by) VALUES ($1, $2, 'created', $3)`,
          [serial, lightId, createdBy],
        );
        await m.query(
          `INSERT INTO warranties (light_id, status) VALUES ($1, 'inactive')`,
          [lightId],
        );
      }
      const stats = await (async () => {
        const rows = await m.query(
          `SELECT count(*)::int AS n FROM qr_codes q JOIN lights l ON l.light_id=q.light_id WHERE l.batch_id=$1`,
          [batchId],
        );
        return rows[0].n;
      })();
      return { batchId, batchCode, quantity: qty, created: stats };
    });
  }

  async update(id: string, batchCode?: string, manufacturedAt?: string) {
    const b = await this.batches.findOne({ where: { batchId: id } });
    if (!b) throw new NotFoundException('Khong tim thay lo');
    if (batchCode && batchCode !== b.batchCode) {
      const dup = await this.batches.findOne({ where: { batchCode } });
      if (dup) throw new ConflictException('Ma lo da ton tai');
      b.batchCode = batchCode;
    }
    if (manufacturedAt) b.manufacturedAt = new Date(manufacturedAt);
    await this.batches.save(b);
    return this.findOne(id);
  }

  // Chi xoa lo con toan phoi (chua kich hoat tem nao)
  async remove(id: string) {
    const b = await this.batches.findOne({ where: { batchId: id } });
    if (!b) throw new NotFoundException('Khong tim thay lo');
    const s = await this.statsFor(id);
    if (s.activated || s.assigned || s.voided) {
      throw new BadRequestException(
        'Lo da co tem kich hoat/gan SP/vo hieu — chi xoa duoc lo con toan phoi.',
      );
    }
    await this.ds.transaction(async (m) => {
      // qr, warranty, mlog cascade theo light; xoa light truoc roi batch
      await m.query(
        `DELETE FROM lights WHERE batch_id = $1`, [id],
      );
      await m.query(`DELETE FROM batches WHERE batch_id = $1`, [id]);
    });
    return { message: 'Da xoa lo' };
  }
}
