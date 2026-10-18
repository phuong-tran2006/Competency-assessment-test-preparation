import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
