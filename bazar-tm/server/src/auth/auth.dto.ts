import { IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { PRINTABLE, Trim } from '../common/validation';

export class RegisterDto {
  @Trim()
  @IsString()
  @Length(1, 80)
  @Matches(PRINTABLE)
  name!: string;

  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsIn(['ru', 'tk'])
  locale?: 'ru' | 'tk';
}

export class LoginDto {
  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class GoogleLoginDto {
  @IsString()
  @Length(20, 4096)
  idToken!: string;

  @IsOptional()
  @IsIn(['ru', 'tk'])
  locale?: 'ru' | 'tk';
}

export class RefreshDto {
  @IsString()
  @MaxLength(200)
  refreshToken!: string;
}
