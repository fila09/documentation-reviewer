import type {ReviewRule} from './index';

const pattern = /[\p{L}][.!?;:](?=[\p{L}])/u;

function proseWithoutMarkdownTargets(line: string): string {
  return line
    .replace(/!?\[[^\]]*\]\([^)]*\)/gu, (match) => {
      const label = match.match(/^!?\[([^\]]*)\]/u)?.[1] ?? '';
      return label;
    })
    .replace(/https?:\/\/\S+/giu, '');
}

export const missingSpaceAfterPunctuationRule: ReviewRule = {
  id: 'missing-space-after-punctuation',
  run({documents}) {
    return documents.flatMap((document) =>
      document.lines.flatMap((lineText, index) => {
        const prose = proseWithoutMarkdownTargets(lineText);
        if (!pattern.test(prose)) return [];

        return [{
          ruleId: 'missing-space-after-punctuation',
          category: 'style' as const,
          severity: 'warning' as const,
          file: document.file.relativePath,
          line: index + 1,
          title: 'Нет пробела после знака препинания',
          message: 'После знака препинания отсутствует пробел.',
          source: lineText.trim(),
          recommendation: 'Добавьте пробел после знака препинания.',
        }];
      }),
    );
  },
};
