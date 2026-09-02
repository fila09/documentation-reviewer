// @vitest-environment jsdom

import React from 'react';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from '../../src/renderer/src/App';

const reviewResult = {
  projectRoot: 'C:\\project',
  docsRoot: 'C:\\project\\documentation\\manual',
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
    {
      ruleId: 'empty-section',
      category: 'structure',
      severity: 'warning' as const,
      file: 'guide.md',
      line: 10,
      title: 'Пустой раздел',
      message: 'Раздел не содержит текста.',
      source: '## Пустой раздел',
      recommendation: 'Добавьте содержимое или удалите раздел.',
    },
    {
      ruleId: 'list-without-intro',
      category: 'structure',
      severity: 'info' as const,
      file: 'guide.md',
      line: 20,
      title: 'Список без вводного текста',
      message: 'Список начинается сразу после заголовка.',
      source: '1. Выполните действие.',
      recommendation: 'Добавьте вводную фразу перед списком.',
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe('App', () => {
  beforeEach(() => {
    window.reviewer = {
      selectProject: vi.fn().mockResolvedValue({
        projectRoot: 'C:\\project',
        suggestedDocsRoot: 'C:\\project\\docs\\ru',
      }),
      selectDocsRoot: vi.fn().mockResolvedValue('C:\\project\\documentation\\manual'),
      reviewProject: vi.fn().mockResolvedValue(reviewResult),
    };
  });

  it('suggests docs/ru, lets the user change it, then reviews the selected directory', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    expect(await screen.findByText('C:\\project')).toBeInTheDocument();
    expect(screen.getByText('C:\\project\\docs\\ru')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Изменить'}));
    expect(await screen.findByText('C:\\project\\documentation\\manual')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));

    expect(await screen.findByText('Проверено: 3')).toBeInTheDocument();
    expect(window.reviewer.reviewProject).toHaveBeenCalledWith(
      'C:\\project',
      'C:\\project\\documentation\\manual',
    );

    expect(screen.getByRole('button', {name: 'Структура 2'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Ссылки 1'})).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Структура 2'}));
    expect(screen.queryByText('Несуществующий якорь')).not.toBeInTheDocument();
    expect(screen.getAllByText('Пустой раздел')).toHaveLength(2);
  });

  it('keeps review disabled when docs/ru is not found and no directory is selected', async () => {
    window.reviewer.selectProject = vi.fn().mockResolvedValue({
      projectRoot: 'C:\\project',
      suggestedDocsRoot: null,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));

    expect(await screen.findByText('Папка документации не выбрана')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Проверить проект'})).toBeDisabled();
  });
});
