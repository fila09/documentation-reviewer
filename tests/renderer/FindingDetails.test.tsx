// @vitest-environment jsdom

import React from 'react';
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {FindingDetails} from '../../src/renderer/src/components/FindingDetails';

afterEach(() => cleanup());

describe('FindingDetails', () => {
  it('highlights suspicious characters in the source fragment', () => {
    const {container} = render(<FindingDetails finding={{
      ruleId: 'mixed-alphabet',
      category: 'style',
      severity: 'warning',
      file: 'page.md',
      line: 1,
      title: 'Смешение кириллицы и латиницы',
      message: 'В идентификаторе смешаны символы разных алфавитов.',
      source: 'Используйте dс01.',
      recommendation: 'Проверьте символ.',
      highlights: [{start: 13, end: 14}],
    }} />);

    expect(container.querySelector('mark')).toHaveTextContent('с');
  });
});
