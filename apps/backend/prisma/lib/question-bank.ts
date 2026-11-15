import * as fs from 'node:fs';
import * as path from 'node:path';

export const TOPIC_NAMES = [
  'Toán', 'Tiếng Việt', 'Tiếng Anh', 'Logic - Suy luận', 'Suy luận khoa học',
];
export const BANK_FILES = [
  { file: 'bank_toan100.json', prefix: 'q-t' },
  { file: 'bank_lang100.json', prefix: 'q-l' },
  { file: 'bank_adv100.json', prefix: 'q-ta' },
  { file: 'bank_sci100.json', prefix: 'q-s' },
];
export const DATA_DIR = path.resolve(__dirname, '..');

// Cơ cấu đã có trong seed_exam_demo.ts, dùng chung cho ba đề năm.
export const EXAM_BLUEPRINT = [
  { name: 'Tiếng Việt', topics: ['Tiếng Việt'], count: 30 },
  { name: 'Tiếng Anh', topics: ['Tiếng Anh'], count: 30 },
  { name: 'Toán', topics: ['Toán'], count: 30 },
  {
    name: 'Logic / Suy luận khoa học',
    topics: ['Logic - Suy luận', 'Suy luận khoa học'],
    count: 30,
  },
];
export const EXAM_QUESTION_COUNT = EXAM_BLUEPRINT.reduce((sum, group) => sum + group.count, 0);

export interface BankQ {
  n: number;
  content: string;
  options: string[];
  /** Zero-based index: exactly one correct option. */
  correct: number;
  /** Source topic key, resolved by name to a real Topic.id during import. */
  topicId: string;
  difficulty: number;
  passage?: string;
  explanation?: string;
  source?: { pdf: string; page: number; answerPage: number };
}

export interface ExamSource {
  id: string;
  year: number;
  title: string;
  file: string;
}

export interface LoadedBank {
  file: string;
  prefix: string;
  items: BankQ[];
}

export interface LoadedExam extends ExamSource {
  questions: BankQ[];
}

const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export function validateBank(input: unknown, topics: readonly string[] = TOPIC_NAMES): string[] {
  if (!Array.isArray(input) || input.length === 0) return ['Ngân hàng phải là mảng có câu hỏi'];
  const errors: string[] = [];
  const numbers = new Set<number>();
  input.forEach((q: unknown, index) => {
    const at = 'Câu tại vị trí ' + (index + 1) + ': ';
    if (!q || typeof q !== 'object' || Array.isArray(q)) {
      errors.push(at + 'phải là object');
      return;
    }
    const row = q as Record<string, unknown>;
    if (!Number.isInteger(row.n) || (row.n as number) < 1 || numbers.has(row.n as number)) {
      errors.push(at + 'n phải là số nguyên dương, không trùng');
    }
    numbers.add(row.n as number);
    if (row.n !== index + 1) errors.push(at + 'n phải liên tiếp theo thứ tự 1..N');
    if (!text(row.content)) errors.push(at + 'thiếu content');
    if (!Array.isArray(row.options) || row.options.length < 2 || !row.options.every(text)) {
      errors.push(at + 'options phải có ít nhất 2 lựa chọn không rỗng');
    }
    if (!Number.isInteger(row.correct) || (row.correct as number) < 0 ||
        !Array.isArray(row.options) || (row.correct as number) >= row.options.length) {
      errors.push(at + 'correct phải chỉ đến đúng một lựa chọn (index từ 0)');
    }
    if (!text(row.topicId) || !topics.includes(row.topicId)) errors.push(at + 'topicId không hợp lệ');
    if (typeof row.difficulty !== 'number' || !Number.isFinite(row.difficulty) || row.difficulty < 0 || row.difficulty > 1) {
      errors.push(at + 'difficulty phải nằm trong [0,1]');
    }
    for (const field of ['passage', 'explanation']) {
      if (row[field] !== undefined && typeof row[field] !== 'string') errors.push(at + field + ' phải là string');
    }
    if (row.source !== undefined) {
      const source = row.source as BankQ['source'];
      if (!source || !text(source.pdf) || !Number.isInteger(source.page) || source.page < 1 ||
          !Number.isInteger(source.answerPage) || source.answerPage < 1) {
        errors.push(at + 'source phải chỉ rõ PDF và trang hợp lệ');
      }
    }
  });
  return errors;
}

/** Validate the JSON used by the importer. PDF files are source references. */
export function readBanks(): LoadedBank[] {
  return BANK_FILES.map((bank) => {
    const items = readBank(bank.file);
    if (items.length !== 100) throw new Error(bank.file + ': cần đủ 100 câu ngân hàng');
    return { ...bank, items };
  });
}

export function readBank(file: string): BankQ[] {
  const data: unknown = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  const errors = validateBank(data);
  if (errors.length) throw new Error(file + ':\n' + errors.join('\n'));
  return data as BankQ[];
}

export function readCatalog(): LoadedExam[] {
  const catalog = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'exam-catalog.json'), 'utf8')) as ExamSource[];
  if (!Array.isArray(catalog) || catalog.length !== 3) throw new Error('Catalog phải khai báo 3 đề 2024/2025/2026');
  const ids = new Set<string>();
  const years = new Set<number>();
  return catalog.map((source) => {
    if (!text(source.id) || ids.has(source.id) || ![2024, 2025, 2026].includes(source.year) ||
        years.has(source.year) || !text(source.title)) {
      throw new Error('Mã đề/năm/tên đề không hợp lệ hoặc bị trùng');
    }
    ids.add(source.id);
    years.add(source.year);
    if (source.file !== 'de_minh_hoa_' + source.year + '.json') throw new Error(source.id + ': sai file dữ liệu năm');
    const questions = readBank(source.file);
    return { ...source, questions };
  });
}
