import { IsArray, IsString } from 'class-validator';

export class AttachTopicsDto {
  @IsArray()
  @IsString({ each: true })
  topicIds: string[];
}
