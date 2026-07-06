import 'reflect-metadata';
import * as argon2 from 'argon2';
import { AppDataSource } from '../data-source';
import { Role, User } from '../../entities/identity.entities';

async function run() {
  const ds = await AppDataSource.initialize();
  try {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const email = process.env.ADMIN_EMAIL || 'admin@mdcgroup.com.vn';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe@12345';

    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(Role);

    const existing = await userRepo.findOne({ where: [{ username }, { email }] });
    if (existing) {
      console.log(`[seed] Admin '${username}' da ton tai — bo qua.`);
      return;
    }
    const adminRole = await roleRepo.findOne({ where: { code: 'admin' } });
    if (!adminRole) throw new Error('Chua co role "admin" — hay chay migration truoc.');

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const admin = userRepo.create({ username, email, passwordHash, roleId: adminRole.roleId });
    await userRepo.save(admin);
    console.log(`[seed] Da tao admin '${username}'. HAY DOI MAT KHAU sau khi dang nhap lan dau.`);
  } finally {
    await ds.destroy();
  }
}

run().catch((e) => {
  console.error('[seed] Loi:', e.message);
  process.exit(1);
});
