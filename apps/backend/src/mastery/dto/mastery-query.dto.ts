import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class MasteryQueryDto {
  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(3000)
  masteryThreshold = 1300;
}

export class RecommendationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(300)
  minutes = 30;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(3000)
  masteryThreshold = 1300;
}

export class MasteryHistoryQueryDto extends MasteryQueryDto {
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}

export class PracticeQuestionsQueryDto extends MasteryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  difficultyMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  difficultyMax?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  @IsBoolean()
  unseenOnly = false;
}
