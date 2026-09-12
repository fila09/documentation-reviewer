import type {ParsedDocument} from '../parser';
import type {Finding} from '../types';
import type {ReviewRule} from './index';

const MIN_DUPLICATE_LENGTH = 100;
const listItemPattern = /^\s*(?:[-*+]|\d+[.)])\s+/;
const headingPattern = /^\s{0,3}#{1,6}\s+/;
const includePattern = /\{%\s*include\b/i;
const fencePattern = /^\s{0,3}(`{3,}|~{3,})/;

interface ComparableBlock {
  file: string;
  line: number;
  source: string;
  normalized: string;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function firstVisibleLine(lines: string[]): string {
  return lines.find((line) => line.trim().length > 0)?.trim() ?? '';
}

function makeBlock(
  document: ParsedDocument,
  startLine: number,
  sourceLines: string[],
  normalizedValue?: string,
): ComparableBlock | null {
  const source = sourceLines.join('\n').trim();
  const normalized = normalizedValue ?? normalizeText(source);

  if (normalized.length < MIN_DUPLICATE_LENGTH) return null;
  if (includePattern.test(source)) return null;

  return {
    file: document.file.relativePath,
    line: startLine,
    source: firstVisibleLine(sourceLines),
    normalized,
  };
}

function extractBlocks(document: ParsedDocument): ComparableBlock[] {
  const lines = document.file.content.split(/\r?\n/);
  const blocks: ComparableBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (headingPattern.test(line) || includePattern.test(line)) {
      index += 1;
      continue;
    }

    const fence = line.match(fencePattern);
    if (fence) {
      const marker = fence[1][0];
      const markerLength = fence[1].length;
      const start = index;
      const sourceLines = [line];
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length) {
        const current = lines[index];
        sourceLines.push(current);
        const closing = current.match(fencePattern);

        if (closing && closing[1][0] === marker && closing[1].length >= markerLength) {
          index += 1;
          break;
        }

        codeLines.push(current);
        index += 1;
      }

      const block = makeBlock(
        document,
        start + 1,
        sourceLines,
        codeLines.map((value) => value.trimEnd()).join('\n').trim(),
      );
      if (block) blocks.push(block);
      continue;
    }

    if (listItemPattern.test(line)) {
      const start = index;
      const sourceLines: string[] = [];

      while (index < lines.length) {
        const current = lines[index];

        if (!current.trim()) break;
        if (headingPattern.test(current) || includePattern.test(current) || fencePattern.test(current)) break;

        if (listItemPattern.test(current) || /^\s{2,}\S/.test(current)) {
          sourceLines.push(current);
          index += 1;
          continue;
        }

        break;
      }

      const block = makeBlock(document, start + 1, sourceLines);
      if (block) blocks.push(block);
      continue;
    }

    const start = index;
    const sourceLines: string[] = [];

    while (index < lines.length) {
      const current = lines[index];

      if (
        !current.trim()
        || headingPattern.test(current)
        || includePattern.test(current)
        || listItemPattern.test(current)
        || fencePattern.test(current)
      ) {
        break;
      }

      sourceLines.push(current);
      index += 1;
    }

    const block = makeBlock(document, start + 1, sourceLines);
    if (block) blocks.push(block);

    if (sourceLines.length === 0) index += 1;
  }

  return blocks;
}

function locationLabel(block: ComparableBlock, current: ComparableBlock): string {
  if (block.file === current.file) {
    return `этот файл, строка ${block.line}`;
  }

  return `${block.file}, строка ${block.line}`;
}

function findingsForGroup(group: ComparableBlock[]): Finding[] {
  return group.map((current) => {
    const otherLocations = group
      .filter((candidate) => candidate !== current)
      .map((candidate) => locationLabel(candidate, current))
      .join('; ');

    return {
      ruleId: 'duplicate-content',
      category: 'style',
      severity: 'info',
      file: current.file,
      line: current.line,
      title: 'Повторяющийся контент',
      message: `Такой же фрагмент найден: ${otherLocations}.`,
      source: current.source,
      recommendation:
        'Проверьте, не является ли повтор ошибкой. Если фрагмент используется намеренно в нескольких местах документации, рассмотрите возможность вынести его в include.',
    };
  });
}

export const duplicateContentRule: ReviewRule = {
  id: 'duplicate-content',
  run({documents}) {
    const groups = new Map<string, ComparableBlock[]>();

    for (const document of documents) {
      for (const block of extractBlocks(document)) {
        const group = groups.get(block.normalized) ?? [];
        group.push(block);
        groups.set(block.normalized, group);
      }
    }

    return [...groups.values()]
      .filter((group) => group.length > 1)
      .flatMap(findingsForGroup);
  },
};
