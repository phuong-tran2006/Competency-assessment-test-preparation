import { IsArray, IsString, IsInt, IsOptional, Min } from 'class-validator';

export class SubmitAnswerDto {
  @IsArray()
  @IsString({ each: true })
  selectedOptionIds: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpent?: number;
}
