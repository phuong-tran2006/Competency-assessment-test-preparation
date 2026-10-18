import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '@prisma/client';

export class QuestionOptionDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class CreateQuestionDto {
  @IsString()
  @MinLength(5)
  content: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  difficulty?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  license?: string;

  @IsString()
  topicId: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options: QuestionOptionDto[];
}
