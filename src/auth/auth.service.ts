import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { User } from '../entities/identity.entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private config: ConfigService,
    private ds: DataSource,
  ) {}

  private async permsForRole(roleId: string): Promise<string[]> {
    const rows = await this.ds.query(
      `SELECT p.code FROM role_permissions rp
       JOIN permissions p ON p.permission_id = rp.permission_id
       WHERE rp.role_id = $1`,
      [roleId],
    );
    return rows.map((r: any) => r.code);
  }

  private async signTokens(user: User, roleCode: string, perms: string[]) {
    const payload = { sub: user.userId, username: user.username, role: roleCode, perms };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL') || '15m',
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.userId },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_TTL') || '7d',
      },
    );
    return { accessToken, refreshToken };
  }

  async login(username: string, password: string) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.role', 'role')
      .where('u.username = :username', { username })
      .getOne();

    if (!user) throw new UnauthorizedException('Sai tai khoan hoac mat khau');
    const valid = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!valid) throw new UnauthorizedException('Sai tai khoan hoac mat khau');

    const roleCode = user.role?.code || 'user';
    const perms = await this.permsForRole(user.roleId);
    const tokens = await this.signTokens(user, roleCode, perms);
    return {
      ...tokens,
      user: { id: user.userId, username: user.username, email: user.email, role: roleCode, permissions: perms },
    };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token khong hop le');
    }
    const user = await this.users.findOne({ where: { userId: String(payload.sub) }, relations: ['role'] });
    if (!user) throw new UnauthorizedException('Tai khoan khong ton tai');
    const roleCode = user.role?.code || 'user';
    const perms = await this.permsForRole(user.roleId);
    const tokens = await this.signTokens(user, roleCode, perms);
    return tokens;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.user_id = :userId', { userId })
      .getOne();
    if (!user) throw new UnauthorizedException();
    const ok = await argon2.verify(user.passwordHash, currentPassword).catch(() => false);
    if (!ok) throw new BadRequestException('Mat khau hien tai khong dung');
    user.passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.users.save(user);
    return { message: 'Da doi mat khau' };
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { userId }, relations: ['role'] });
    if (!user) throw new UnauthorizedException();
    const perms = await this.permsForRole(user.roleId);
    return { id: user.userId, username: user.username, email: user.email, role: user.role?.code, permissions: perms };
  }
}
