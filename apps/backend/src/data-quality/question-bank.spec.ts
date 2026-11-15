import { readBank, readCatalog, readBanks, validateBank, BANK_FILES, EXAM_BLUEPRINT } from '../../prisma/lib/question-bank';
import { selectExamQuestions } from '../../prisma/lib/seed-assessment';

const valid = () => ({ n: 1, content: '2 + 3 = ?', options: ['5', '6'], correct: 0, topicId: 'Toán', difficulty: 0.5 });

describe('BankQ validation', () => {
  it.each([
    { content: '' }, { options: ['5', ''] }, { options: ['5'] },
    { correct: 2 }, { correct: -1 }, { correct: [0, 1] }, { correct: 0.5 },
    { difficulty: 4 }, { difficulty: -0.1 }, { difficulty: NaN }, { difficulty: '0.5' },
    { topicId: 'Không có chủ đề này' }, { passage: 123 }, { explanation: null }, { n: 0 },
  ])('rejects malformed source data: %j', (invalid) => {
    expect(validateBank([{ ...valid(), ...invalid }])).not.toHaveLength(0);
  });

  it('rejects duplicate or missing question numbers and non-object rows', () => {
    for (const rows of [[valid(), valid()], [null], [], {}, [{ ...valid(), n: 2 }]]) {
      expect(validateBank(rows)).not.toHaveLength(0);
    }
  });

  it('accepts boundary difficulties and a single zero-based correct index', () => {
    expect(validateBank([{ ...valid(), difficulty: 0 }, { ...valid(), n: 2, difficulty: 1 }])).toEqual([]);
  });

  it('validates all 400 normalized questions and three independent annual files', () => {
    expect(BANK_FILES.reduce((count, bank) => count + readBank(bank.file).length, 0)).toBe(400);
    expect(readCatalog().map((exam) => exam.year)).toEqual([2024, 2025, 2026]);
  });

  it('reads 400 questions with source pages and 200 explanations from JSON', () => {
    const banks = readBanks();
    expect(banks).toHaveLength(4);
    expect(banks.reduce((sum, bank) => sum + bank.items.length, 0)).toBe(400);
    expect(banks.flatMap((bank) => bank.items).filter((question) => question.explanation)).toHaveLength(200);
    expect(banks.flatMap((bank) => bank.items).every((question) => question.source?.page)).toBe(true);
  });

  it('uses the PDF section boundaries for language and scientific topics', () => {
    const language = readBank('bank_lang100.json');
    expect(language[20].topicId).toBe('Tiếng Anh');
    expect(language[70].topicId).toBe('Tiếng Việt');
    const science = readBank('bank_sci100.json');
    expect(science.filter((q) => q.topicId === 'Logic - Suy luận')).toHaveLength(40);
    expect(science.filter((q) => q.topicId === 'Suy luận khoa học')).toHaveLength(60);
  });

  it('keeps both passages for cross-text questions', () => {
    const language = readBank('bank_lang100.json');
    expect(language[49].passage).toContain('VĂN BẢN A');
    expect(language[49].passage).toContain('VĂN BẢN B');
    expect(language[98].passage).toContain('READING TEXT B');
    expect(language[98].passage).toContain('READING TEXT C');
    expect(language[99].passage).toContain('READING TEXT B');
  });

  it('preserves the square root position and excludes section headings from choices', () => {
    expect(readBank('bank_adv100.json')[1].content).toContain('√(2x + 3)');
    const math = readBank('bank_toan100.json');
    expect(math[34].options[3]).toBe('14 cm');
    expect(math[74].options[3]).toBe('8 triệu đồng');
    expect(readBank('bank_sci100.json')[84].options[3]).toBe('Giảm 2 điểm phần trăm.');
  });

  it.each(readCatalog())('fills $year to 120 questions with the agreed quotas', (exam) => {
    const selected = selectExamQuestions(exam, readBanks());
    expect(selected).toHaveLength(120);
    expect(new Set(selected.map((item) => item.id)).size).toBe(120);
    for (const group of EXAM_BLUEPRINT) {
      expect(selected.filter((item) => group.topics.includes(item.question.topicId))).toHaveLength(30);
    }
    for (const question of exam.questions) {
      expect(selected.some((item) => item.id === 'q-' + exam.year + '-' + question.n)).toBe(true);
    }
  });

  it('keeps previous selections when reseeding and replaces unrelated IDs', () => {
    const exam = readCatalog()[0];
    const banks = readBanks();
    const selected = selectExamQuestions(exam, banks);
    expect(selectExamQuestions(exam, banks, selected.map((item) => item.id))).toEqual(selected);
    const repaired = selectExamQuestions(exam, banks, ['unknown', ...selected.map((item) => item.id)]);
    expect(repaired).toEqual(selected);
  });

  it('allocates 90 distinct English questions and preserves the allocation on reseed', () => {
    const banks = readBanks();
    const used = new Set<string>();
    const selections = readCatalog().map((exam) => {
      const selected = selectExamQuestions(exam, banks, [], used);
      for (const item of selected.filter((item) => item.question.topicId === 'Tiếng Anh')) {
        expect(used.has(item.id)).toBe(false);
        used.add(item.id);
      }
      return selected;
    });
    expect(used.size).toBe(90);
    used.clear();
    readCatalog().forEach((exam, index) => {
      const selected = selectExamQuestions(exam, banks, selections[index].map((item) => item.id), used);
      expect(selected).toEqual(selections[index]);
      selected.filter((item) => item.question.topicId === 'Tiếng Anh').forEach((item) => used.add(item.id));
    });
  });

  it('keeps all 50 supplied questions, reading blocks and proposed difficulty levels', () => {
    const additions = readCatalog().map((exam) => exam.questions.filter((question) => question.topicId === 'Tiếng Anh'));
    expect(additions.map((rows) => rows.length)).toEqual([17, 17, 16]);
    expect(additions.map((rows) => rows.filter((question) => question.passage).length)).toEqual([5, 5, 5]);
    expect(additions.map((rows) => rows.filter((question) => question.difficulty === 0.75).length)).toEqual([3, 3, 3]);
    const all = additions.flat();
    expect(new Set(all.map((question) => question.content)).size).toBe(50);
    expect(all.filter((question) => question.difficulty === 0.25)).toHaveLength(17);
    expect(all.filter((question) => question.difficulty === 0.5)).toHaveLength(24);
    expect(additions[0].filter((question) => question.passage).every((question) => question.passage!.includes('lifelong learning'))).toBe(true);
    expect(additions[1].filter((question) => question.passage).every((question) => question.passage!.includes('Artificial intelligence'))).toBe(true);
    expect(additions[2].filter((question) => question.passage).every((question) => question.passage!.includes('urban green spaces'))).toBe(true);
  });

  it('samples from the whole Logic/science group and fails if a quota cannot be filled', () => {
    const exam = readCatalog()[0];
    const banks = readBanks();
    const scienceOnly = banks.map((bank) => ({
      ...bank, items: bank.items.filter((question) => question.topicId !== 'Logic - Suy luận'),
    }));
    const selected = selectExamQuestions(exam, scienceOnly);
    expect(selected.filter((item) => item.question.topicId === 'Suy luận khoa học')).toHaveLength(30);
    const noEnglish = banks.map((bank) => ({
      ...bank, items: bank.items.filter((question) => question.topicId !== 'Tiếng Anh'),
    }));
    expect(() => selectExamQuestions(exam, noEnglish)).toThrow('thiếu câu Tiếng Anh');
    const overflow = { ...exam, questions: Array.from({ length: 31 }, (_, index) => ({ ...valid(), n: index + 1 })) };
    expect(() => selectExamQuestions(overflow, banks)).toThrow('quá số câu Toán');
  });
});
