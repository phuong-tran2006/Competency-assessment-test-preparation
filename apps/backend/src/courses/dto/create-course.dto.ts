import {
  IsString,
  IsOptional,
  MinLength,
  IsArray,
  IsInt,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicIds?: string[];
}
