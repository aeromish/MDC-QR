import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User, Role } from '../entities/identity.entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Role) private roles: Repository<Role>,
  ) {}

  list() {
    return this.users.find({ relations: ['role'], order: { userId: 'ASC' } })
      .then((rows) => rows.map((u) => ({
        id: u.userId, username: u.username, email: u.email,
        role: u.role?.code, roleName: u.role?.name, createdAt: u.createdAt,
      })));
  }

  listRoles() {
    return this.roles.find({ order: { roleId: 'ASC' } });
  }

  private async roleByCode(code: string) {
    const r = await this.roles.findOne({ where: { code } });
    if (!r) throw new BadRequestException('Vai tro khong hop le');
    return r;
  }

  async create(dto: { username: string; email: string; password: string; role: string }) {
    const dup = await this.users.findOne({ where: [{ username: dto.username }, { email: dto.email }] });
    if (dup) throw new ConflictException('Tai khoan hoac email da ton tai');
    const role = await this.roleByCode(dto.role);
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const u = await this.users.save(this.users.create({
      username: dto.username, email: dto.email, passwordHash, roleId: role.roleId,
    }));
    return { id: u.userId, username: u.username, email: u.email, role: role.code };
  }

  async setRole(id: string, roleCode: string) {
    const u = await this.users.findOne({ where: { userId: id } });
    if (!u) throw new NotFoundException('Khong tim thay tai khoan');
    const role = await this.roleByCode(roleCode);
    u.roleId = role.roleId;
    await this.users.save(u);
    return { message: 'Da cap nhat vai tro' };
  }

  async resetPassword(id: string, newPassword: string) {
    const u = await this.users.findOne({ where: { userId: id } });
    if (!u) throw new NotFoundException('Khong tim thay tai khoan');
    u.passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.users.save(u);
    return { message: 'Da dat lai mat khau' };
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) throw new BadRequestException('Khong the tu xoa tai khoan dang dung');
    const u = await this.users.findOne({ where: { userId: id } });
    if (!u) throw new NotFoundException('Khong tim thay tai khoan');
    await this.users.delete(id);
    return { message: 'Da xoa tai khoan' };
  }
}
