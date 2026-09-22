import {describe, expect, it} from 'vitest';
import {findingToDiagnosticData, findingsForCurrentFile} from '../../extensions/vscode/src/diagnostics';
import type {Finding} from '../../src/engine/types';

const baseFinding: Finding = {
  ruleId: 'mixed-alphabet',
  category: 'style',
  severity: 'warning',
  file: 'guide.md',
  line: 3,
  title: 'Смешение кириллицы и латиницы',
  message: 'Найдена буква из другого алфавита.',
  source: 'Используйте dс01.',
  recommendation: 'Исправьте раскладку.',
  highlights: [{start: 13, end: 14}],
};

describe('findingToDiagnosticData', () => {
  it('converts the one-based line and highlight to a zero-based editor range', () => {
    const result = findingToDiagnosticData(baseFinding, '    Используйте dс01.');

    expect(result.range).toEqual({
      startLine: 2,
      startCharacter: 17,
      endLine: 2,
      endCharacter: 18,
    });
  });

  it.each([
    ['error', 'error'],
    ['warning', 'warning'],
    ['info', 'info'],
  ] as const)('keeps %s severity for the VS Code adapter', (severity, expected) => {
    expect(findingToDiagnosticData({...baseFinding, severity}, baseFinding.source).severity)
      .toBe(expected);
  });

  it('includes the title, category and recommendation in the message', () => {
    const result = findingToDiagnosticData(baseFinding, baseFinding.source);

    expect(result.message).toContain('Смешение кириллицы и латиницы');
    expect(result.message).toContain('Стиль');
    expect(result.message).toContain('Исправьте раскладку.');
  });
});


describe('findingsForCurrentFile', () => {
  it('keeps only findings for the active Markdown file', () => {
    const findings: Finding[] = [
      baseFinding,
      {...baseFinding, file: 'other.md', line: 8},
    ];

    expect(findingsForCurrentFile(findings, 'guide.md')).toEqual([baseFinding]);
  });
});
