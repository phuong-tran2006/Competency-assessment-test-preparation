import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsInt,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsInt()
  targetScore?: number;
}
