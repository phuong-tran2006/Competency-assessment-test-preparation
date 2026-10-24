import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  IsArray,
  Max,
  Min,
} from 'class-validator';

export class CreateAttemptDto {
  @IsOptional()
  @IsString()
  examId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(14400)
  timeLimit?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  topicIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  questionCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  difficultyMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  difficultyMax?: number;
}
