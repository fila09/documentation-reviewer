import type {ReviewRule} from './index';

const pattern = /\s+[,.!?;:](?=\s|$)/u;

function textSegmentsOutsideInlineCode(sourceLine: string): string[] {
  const segments: string[] = [];
  const pattern = /(`+)(.*?)\1/g;
  let start = 0;

  for (const match of sourceLine.matchAll(pattern)) {
    const index = match.index ?? 0;
    segments.push(sourceLine.slice(start, index));
    start = index + match[0].length;
  }

  segments.push(sourceLine.slice(start));
  return segments;
}

export const spaceBeforePunctuationRule: ReviewRule = {
  id: 'space-before-punctuation',
  run({documents}) {
    return documents.flatMap((document) => {
      const sourceLines = document.file.content.split(/\r?\n/);

      return document.lines.flatMap((lineText, index) => {
        if (!lineText) return [];
        const sourceLine = sourceLines[index] ?? lineText;

        for (const segment of textSegmentsOutsideInlineCode(sourceLine)) {
          if (!pattern.test(segment)) continue;

          return [{
            ruleId: 'space-before-punctuation',
            category: 'style' as const,
            severity: 'warning' as const,
            file: document.file.relativePath,
            line: index + 1,
            title: 'Пробел перед знаком препинания',
            message: 'Перед знаком препинания найден лишний пробел.',
            source: sourceLine.trim(),
            recommendation: 'Удалите пробел перед знаком препинания.',
          }];
        }

        return [];
      });
    });
  },
};
