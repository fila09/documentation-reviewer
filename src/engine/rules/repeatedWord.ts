import type {ReviewRule} from './index';

const repeatedWordPattern = /(^|[^\p{L}\p{N}_-])([\p{L}\p{N}_-]+)(\s+)\2(?=$|[^\p{L}\p{N}_-])/iu;
const inlineCodePattern = /(`+)(.*?)\1/g;

function textSegmentsOutsideInlineCode(sourceLine: string): string[] {
  const segments: string[] = [];
  let start = 0;

  for (const match of sourceLine.matchAll(inlineCodePattern)) {
    const index = match.index ?? 0;
    segments.push(sourceLine.slice(start, index));
    start = index + match[0].length;
  }

  segments.push(sourceLine.slice(start));
  return segments;
}

export const repeatedWordRule: ReviewRule = {
  id: 'repeated-word',
  run({documents}) {
    return documents.flatMap((document) => {
      const sourceLines = document.file.content.split(/\r?\n/);

      return document.lines.flatMap((lineText, index) => {
        // Fenced code is masked by the parser. Do not inspect its original source line.
        if (!lineText) return [];

        const sourceLine = sourceLines[index] ?? lineText;

        for (const segment of textSegmentsOutsideInlineCode(sourceLine)) {
          const match = segment.match(repeatedWordPattern);
          if (!match) continue;

          return [{
            ruleId: 'repeated-word',
            category: 'style' as const,
            severity: 'error' as const,
            file: document.file.relativePath,
            line: index + 1,
            title: 'Повтор слова',
            message: `Слово «${match[2]}» повторяется подряд.`,
            source: sourceLine.trim(),
            recommendation: 'Удалите повторяющееся слово, если повтор не является намеренным.',
          }];
        }

        return [];
      });
    });
  },
};
