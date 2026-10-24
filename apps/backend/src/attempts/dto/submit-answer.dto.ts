import { IsArray, IsString, IsInt, Min } from 'class-validator';

export class SubmitAnswerDto {
  @IsArray()
  @IsString({ each: true })
  selectedOptionIds: string[];

  @IsInt()
  @Min(0)
  timeSpent: number;
}
