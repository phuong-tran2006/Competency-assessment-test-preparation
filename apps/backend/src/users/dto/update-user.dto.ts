import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsInt()
  targetScore?: number;
}
