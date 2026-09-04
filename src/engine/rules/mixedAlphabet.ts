import type {Finding, SourceHighlight} from '../types';
import type {ReviewRule} from './index';

const tokenPattern = /[\p{L}\p{N}]+/gu;
const cyrillic = /[А-Яа-яЁё]/u;
const latin = /[A-Za-z]/u;

type Script = 'cyrillic' | 'latin';

function scriptOf(char: string): Script | null {
  if (cyrillic.test(char)) return 'cyrillic';
  if (latin.test(char)) return 'latin';
  return null;
}

function dominantScript(token: string): Script {
  const letters = [...token].filter((char) => scriptOf(char));
  const cyrillicCount = letters.filter((char) => scriptOf(char) === 'cyrillic').length;
  const latinCount = letters.filter((char) => scriptOf(char) === 'latin').length;

  if (cyrillicCount > latinCount) return 'cyrillic';
  if (latinCount > cyrillicCount) return 'latin';

  return scriptOf(letters[0] ?? '') ?? 'latin';
}

function suspiciousIndexes(token: string, dominant: Script): number[] {
  const result: number[] = [];
  let offset = 0;

  for (const char of token) {
    const script = scriptOf(char);
    if (script && script !== dominant) result.push(offset);
    offset += char.length;
  }

  return result;
}

function highlightRanges(
  tokenStart: number,
  indexes: number[],
  sourceOffset: number,
): SourceHighlight[] {
  return indexes.map((index) => ({
    start: tokenStart + index - sourceOffset,
    end: tokenStart + index + 1 - sourceOffset,
  }));
}

function messageFor(token: string, dominant: Script, suspicious: string[]): string {
  const symbols = suspicious.map((char) => `«${char}»`).join(', ');
  const singular = suspicious.length === 1;

  if (dominant === 'cyrillic') {
    return singular
      ? `В слове «${token}» найдена латинская буква ${symbols} среди кириллических символов.`
      : `В слове «${token}» найдены латинские символы ${symbols} среди кириллических символов.`;
  }

  return singular
    ? `В идентификаторе «${token}» найдена кириллическая буква ${symbols} среди латинских символов.`
    : `В идентификаторе «${token}» найдены кириллические символы ${symbols} среди латинских символов.`;
}

export const mixedAlphabetRule: ReviewRule = {
  id: 'mixed-alphabet',
  run({documents}) {
    return documents.flatMap((document) => {
      const sourceLines = document.file.content.split(/\r?\n/);

      return document.lines.flatMap((lineText, index) => {
        if (!lineText) return [];
        const sourceLine = sourceLines[index] ?? lineText;
        const leadingWhitespace = sourceLine.length - sourceLine.trimStart().length;
        const source = sourceLine.trim();

        for (const match of lineText.matchAll(tokenPattern)) {
          const token = match[0];
          if (!cyrillic.test(token) || !latin.test(token)) continue;

          const dominant = dominantScript(token);
          const indexes = suspiciousIndexes(token, dominant);
          const suspicious = indexes.map((position) => token[position]);
          const tokenStart = match.index ?? 0;

          const finding: Finding = {
            ruleId: 'mixed-alphabet',
            category: 'style',
            severity: 'warning',
            file: document.file.relativePath,
            line: index + 1,
            title: 'Смешение кириллицы и латиницы',
            message: messageFor(token, dominant, suspicious),
            source,
            recommendation: 'Проверьте раскладку клавиатуры и замените выделенные символы на нужный алфавит.',
            highlights: highlightRanges(tokenStart, indexes, leadingWhitespace),
          };

          return [finding];
        }

        return [];
      });
    });
  },
};
