export class UpdateQuestionDto {
  content?: string;
  type?: string;
  options?: unknown;
  answer?: string;
  difficulty?: string;
  courseId?: string;
  lessonId?: string;
}
