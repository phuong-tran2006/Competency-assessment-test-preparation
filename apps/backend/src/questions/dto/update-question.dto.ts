import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateQuestionDto } from './create-question.dto';

// Không cho update topicId (đổi topic thì tạo câu hỏi mới)
export class UpdateQuestionDto extends PartialType(
  OmitType(CreateQuestionDto, ['topicId'] as const),
) {}
