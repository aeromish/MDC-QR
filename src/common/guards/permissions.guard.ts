import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, AuthUser } from '../decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Khong co thong tin nguoi dung');

    // admin luon co full quyen; nguoi khac phai co du quyen yeu cau
    const ok = user.role === 'admin' || required.every((p) => user.perms?.includes(p));
    if (!ok) throw new ForbiddenException('Ban khong co quyen thuc hien thao tac nay');
    return true;
  }
}
