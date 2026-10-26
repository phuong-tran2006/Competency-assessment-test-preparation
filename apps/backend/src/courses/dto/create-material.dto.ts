import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  IsInt,
  Min,
} from 'class-validator';
import { MaterialType } from '@prisma/client';

export class CreateMaterialDto {
  @IsEnum(MaterialType)
  type: MaterialType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  // content bắt buộc khi type = TEXT
  @ValidateIf((o) => o.type === MaterialType.TEXT)
  @IsString()
  content?: string;

  // url bắt buộc khi type = PDF
  @ValidateIf((o) => o.type !== MaterialType.TEXT)
  @IsString()
  @IsUrl({ require_tld: false })
  url?: string;
}
