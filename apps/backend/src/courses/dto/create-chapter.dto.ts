import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateChapterDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
