import type {ReviewRule} from './index';

const repeatedWordPattern = /(^|[^\p{L}\p{N}_-])([\p{L}\p{N}_-]+)(\s+)\2(?=$|[^\p{L}\p{N}_-])/iu;

export const repeatedWordRule: ReviewRule = {
  id: 'repeated-word',
  run({documents}) {
    return documents.flatMap((document) =>
      document.lines.flatMap((lineText, index) => {
        const match = lineText.match(repeatedWordPattern);
        if (!match) return [];

        return [{
          ruleId: 'repeated-word',
          category: 'style' as const,
          severity: 'error' as const,
          file: document.file.relativePath,
          line: index + 1,
          title: 'Повтор слова',
          message: `Слово «${match[2]}» повторяется подряд.`,
          source: lineText.trim(),
          recommendation: 'Удалите повторяющееся слово, если повтор не является намеренным.',
        }];
      }),
    );
  },
};
