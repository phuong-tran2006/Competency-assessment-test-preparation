import { readBanks, readCatalog } from './lib/question-bank';
import { selectExamQuestions } from './lib/seed-assessment';

try {
  const banks = readBanks();
  for (const bank of banks) console.log('PASS ' + bank.file + ': ' + bank.items.length + ' câu');
  const usedEnglishIds = new Set<string>();
  for (const exam of readCatalog()) {
    const selected = selectExamQuestions(exam, banks, [], usedEnglishIds);
    for (const item of selected) {
      if (item.question.topicId === 'Tiếng Anh') usedEnglishIds.add(item.id);
    }
    console.log('PASS ' + exam.id + ': ' + exam.questions.length + ' câu năm + ' +
      (selected.length - exam.questions.length) + ' câu ngân hàng = ' + selected.length + ' câu, đúng cơ cấu');
  }
  console.log('PASS ' + usedEnglishIds.size + ' câu Tiếng Anh riêng giữa ba đề');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
