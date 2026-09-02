import {describe, expect, it} from 'vitest';
import {parseMarkdown} from '../../src/engine/parser';

const file = {
  absolutePath: '/tmp/page.md',
  relativePath: 'page.md',
  content: [
    '# Раздел {#section}',
    '',
    '[Рабочая](other.md#target)',
    '[Пустая]()',
    '![](image.png)',
  ].join('\n'),
};

describe('parseMarkdown', () => {
  it('extracts links with one-based line numbers and skips images', () => {
    const parsed = parseMarkdown(file);

    expect(parsed.links).toEqual([
      {
        text: 'Рабочая',
        target: 'other.md#target',
        line: 3,
        source: '[Рабочая](other.md#target)',
      },
      {
        text: 'Пустая',
        target: '',
        line: 4,
        source: '[Пустая]()',
      },
    ]);
  });

  it('extracts explicit anchors', () => {
    const parsed = parseMarkdown(file);

    expect(parsed.anchors).toEqual([
      {
        id: 'section',
        line: 1,
        source: '{#section}',
      },
    ]);
  });
});
