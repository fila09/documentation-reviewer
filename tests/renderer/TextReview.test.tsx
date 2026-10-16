// @vitest-environment jsdom

import React from 'react';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from '../../src/renderer/src/App';

const projectReviewResult = {
  projectRoot: 'C:\\project',
  docsRoot: 'C:\\project\\docs\\ru',
  checkedFiles: 2,
  checkedFilePaths: ['guide.md', 'index.md'],
  diagnostics: [],
  findings: [],
};

const textFileReviewResult = {
  projectRoot: 'C:\\project',
  docsRoot: 'C:\\project\\docs\\ru',
  file: 'guide.md',
  findings: [
    {
      ruleId: 'russian-spelling',
      category: 'text',
      severity: 'warning' as const,
      file: 'guide.md',
      line: 3,
      title: 'Возможная опечатка',
      message: 'Слово «действя» не найдено в русском словаре.',
      source: 'Выполните следующие действя.',
      recommendation: 'Возможно: «действия».',
    },
  ],
  diagnostics: [],
};

afterEach(() => cleanup());

describe('text review', () => {
  beforeEach(() => {
    window.reviewer = {
      selectProject: vi.fn().mockResolvedValue({
        projectRoot: 'C:\\project',
        suggestedDocsRoot: 'C:\\project\\docs\\ru',
      }),
      selectDocsRoot: vi.fn().mockResolvedValue('C:\\project\\docs\\ru'),
      reviewProject: vi.fn().mockResolvedValue(projectReviewResult),
      reviewFile: vi.fn(),
      reviewTextProject: vi.fn().mockResolvedValue(projectReviewResult),
      reviewTextFile: vi.fn().mockResolvedValue(textFileReviewResult),
    } as typeof window.reviewer;
  });

  it('shows a separate Проверить текст action', async () => {
    render(<App />);

    expect(screen.getByRole('button', {name: 'Проверить текст'})).toBeDisabled();

    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');

    expect(screen.getByRole('button', {name: 'Проверить текст'})).not.toBeDisabled();
  });

  it('checks only the selected file and shows findings in the Текст category', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');

    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));
    await screen.findByText('Проверено: 2');

    fireEvent.change(screen.getByLabelText('Файл'), {target: {value: 'guide.md'}});
    fireEvent.click(screen.getByRole('button', {name: 'Проверить текст'}));

    expect(window.reviewer.reviewTextFile).toHaveBeenCalledWith(
      'C:\\project',
      'C:\\project\\docs\\ru',
      'guide.md',
    );
    expect(await screen.findByRole('button', {name: 'Текст 1'})).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText('Возможная опечатка')).toHaveLength(2);
    });
  });
});
