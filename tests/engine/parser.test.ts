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

  it('ignores markdown syntax inside fenced and inline code', () => {
    const parsed = parseMarkdown({
      absolutePath: '/tmp/code.md',
      relativePath: 'code.md',
      content: [
        '`[inline](inline.md) {#inline}`',
        '```markdown',
        '[fenced](missing.md) {#fenced}',
        '```',
        '[real](real.md) {#real}',
      ].join('\n'),
    });

    expect(parsed.links.map((link) => link.target)).toEqual(['real.md']);
    expect(parsed.anchors.map((anchor) => anchor.id)).toEqual(['real']);
  });

});
