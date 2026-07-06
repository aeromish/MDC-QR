import { Body, Controller, Delete, Get, Param, Patch, Post, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { User, Role } from '../entities/identity.entities';
import { UsersService } from './users.service';
import { RequirePermissions, CurrentUser, AuthUser } from '../common/decorators';

class CreateUserDto {
  @IsString() @IsNotEmpty() username: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsIn(['admin', 'staff', 'user']) role: string;
}
class SetRoleDto { @IsIn(['admin', 'staff', 'user']) role: string; }
class ResetPwDto { @IsString() @MinLength(8) newPassword: string; }

// 'user.manage' khong duoc cap cho role nao -> chi admin (bypass) truy cap duoc.
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @RequirePermissions('user.manage')
  @Get()
  list() { return this.svc.list(); }

  @RequirePermissions('user.manage')
  @Get('roles')
  roles() { return this.svc.listRoles(); }

  @RequirePermissions('user.manage')
  @Post()
  create(@Body() dto: CreateUserDto) { return this.svc.create(dto); }

  @RequirePermissions('user.manage')
  @Patch(':id/role')
  setRole(@Param('id') id: string, @Body() dto: SetRoleDto) { return this.svc.setRole(id, dto.role); }

  @RequirePermissions('user.manage')
  @Patch(':id/password')
  resetPw(@Param('id') id: string, @Body() dto: ResetPwDto) { return this.svc.resetPassword(id, dto.newPassword); }

  @RequirePermissions('user.manage')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.svc.remove(id, user.userId); }
}

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
