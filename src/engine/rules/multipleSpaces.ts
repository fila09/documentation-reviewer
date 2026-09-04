import type {ReviewRule} from './index';

const pattern = /\S {2,}\S/u;

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

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

export const multipleSpacesRule: ReviewRule = {
  id: 'multiple-spaces',
  run({documents}) {
    return documents.flatMap((document) => {
      const sourceLines = document.file.content.split(/\r?\n/);

      return document.lines.flatMap((lineText, index) => {
        if (!lineText) return [];
        const sourceLine = sourceLines[index] ?? lineText;
        if (isTableRow(sourceLine)) return [];

        for (const segment of textSegmentsOutsideInlineCode(sourceLine)) {
          const withoutIndent = segment.replace(/^\s+/, '');
          if (!pattern.test(withoutIndent)) continue;

          return [{
            ruleId: 'multiple-spaces',
            category: 'style' as const,
            severity: 'info' as const,
            file: document.file.relativePath,
            line: index + 1,
            title: 'Несколько пробелов подряд',
            message: 'В тексте найдено несколько пробелов подряд.',
            source: sourceLine.trim(),
            recommendation: 'Оставьте один пробел, если несколько пробелов не нужны намеренно.',
          }];
        }

        return [];
      });
    });
  },
};
