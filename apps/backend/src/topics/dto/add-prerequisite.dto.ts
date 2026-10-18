import { IsString, IsNotEmpty } from 'class-validator';

export class AddPrerequisiteDto {
  @IsString()
  @IsNotEmpty()
  prerequisiteId: string;
}
