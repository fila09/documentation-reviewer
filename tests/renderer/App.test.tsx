import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from '../../src/renderer/src/App';

const reviewResult = {
  projectRoot: 'C:\\project',
  docsRoot: 'C:\\project\\docs\\ru',
  checkedFiles: 3,
  diagnostics: [],
  findings: [
    {
      ruleId: 'missing-anchor',
      category: 'links',
      severity: 'error' as const,
      file: 'index.md',
      line: 5,
      title: 'Несуществующий якорь',
      message: 'Якорь #missing не найден.',
      source: '[Раздел](target.md#missing)',
      recommendation: 'Проверьте идентификатор якоря.',
      target: 'target.md#missing',
    },
  ],
};

describe('App', () => {
  beforeEach(() => {
    window.reviewer = {
      selectProject: vi.fn().mockResolvedValue('C:\\project'),
      reviewProject: vi.fn().mockResolvedValue(reviewResult),
    };
  });

  it('selects a project, runs review and shows finding details', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', {name: 'Выбрать'}));
    expect(await screen.findByText('C:\\project')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));

    expect(await screen.findByText('Проверено: 3')).toBeInTheDocument();
    expect(screen.getAllByText('Несуществующий якорь').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText('Несуществующий якорь')[0]);

    expect(screen.getByText('Якорь #missing не найден.')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /исправить/i})).not.toBeInTheDocument();
  });
});
