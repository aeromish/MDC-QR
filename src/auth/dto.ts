import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() @IsNotEmpty()
  username: string;

  @IsString() @IsNotEmpty()
  password: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty()
  currentPassword: string;

  @IsString() @MinLength(8, { message: 'Mat khau moi toi thieu 8 ky tu' })
  newPassword: string;
}
