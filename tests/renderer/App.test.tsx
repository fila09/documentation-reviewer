// @vitest-environment jsdom

import React from 'react';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from '../../src/renderer/src/App';

const reviewResult = {
  projectRoot: 'C:\\project',
  docsRoot: 'C:\\project\\documentation\\manual',
  checkedFiles: 3,
  checkedFilePaths: ['guide.md', 'index.md', 'clean.md'],
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
      ruleId: 'skipped-heading-level',
      category: 'markdown',
      severity: 'warning' as const,
      file: 'guide.md',
      line: 10,
      title: 'Пропущен уровень заголовка',
      message: 'После заголовка уровня 2 используется уровень 4.',
      source: '#### Подраздел',
      recommendation: 'Проверьте иерархию заголовков.',
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

const refreshedGuideResult = {
  file: 'guide.md',
  findings: [
    {
      ruleId: 'skipped-heading-level',
      category: 'markdown',
      severity: 'warning' as const,
      file: 'guide.md',
      line: 10,
      title: 'Пропущен уровень заголовка',
      message: 'После заголовка уровня 2 используется уровень 4.',
      source: '#### Подраздел',
      recommendation: 'Проверьте иерархию заголовков.',
    },
  ],
  diagnostics: [],
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
      reviewFile: vi.fn().mockResolvedValue(refreshedGuideResult),
    };
  });

  it('suggests docs/ru, lets the user change it, then reviews the selected directory', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    expect(await screen.findByText('C:\\project')).toBeInTheDocument();
    expect(screen.getByText('C:\\project\\docs\\ru')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Изменить папку'}));
    expect(await screen.findByText('C:\\project\\documentation\\manual')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));

    expect(await screen.findByText('Проверено: 3')).toBeInTheDocument();
    expect(window.reviewer.reviewProject).toHaveBeenCalledWith(
      'C:\\project',
      'C:\\project\\documentation\\manual',
    );

    expect(screen.getByRole('button', {name: 'Структура 1'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Ссылки 1'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Markdown 1'})).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Структура 1'}));
    expect(screen.queryByText('Несуществующий якорь')).not.toBeInTheDocument();
    expect(screen.getAllByText('Список без вводного текста')).toHaveLength(2);
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
  it('recalculates category counts for the selected severity and disables empty combinations', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));
    await screen.findByText('Проверено: 3');

    fireEvent.click(screen.getByRole('button', {name: 'Ошибки 1'}));

    expect(screen.getByRole('button', {name: 'Все категории 1'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Структура 0'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Markdown 0'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Ссылки 1'})).not.toBeDisabled();
  });

  it('recalculates severity counts for the selected category', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));
    await screen.findByText('Проверено: 3');

    fireEvent.click(screen.getByRole('button', {name: 'Структура 1'}));

    expect(screen.getByRole('button', {name: 'Все 1'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Ошибки 0'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Информация 1'})).not.toBeDisabled();
  });

  it('uses the russian product name and groups project actions in the header', () => {
    render(<App />);

    expect(screen.getByRole('heading', {name: 'ДокРевью'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Выбрать проект'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Выбрать папку'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Проверить проект'})).toHaveClass('primary-action');
  });

  it('shows checked files without findings and allows selecting them', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));
    await screen.findByText('Проверено: 3');

    expect(screen.getByRole('option', {name: 'clean.md'})).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Файл'), {target: {value: 'clean.md'}});

    expect(screen.getByText('Замечаний не найдено')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Все 0'})).toBeInTheDocument();
  });

  it('filters findings by file and recalculates counts for the selected file', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));
    await screen.findByText('Проверено: 3');

    fireEvent.change(screen.getByLabelText('Файл'), {target: {value: 'guide.md'}});

    expect(screen.queryByText('Несуществующий якорь')).not.toBeInTheDocument();
    expect(screen.getAllByText('Пропущен уровень заголовка')).toHaveLength(2);
    expect(screen.getByText('Список без вводного текста')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Все 2'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Предупреждения 1'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Информация 1'})).toBeInTheDocument();
  });


  it('refreshes only the selected file and keeps it selected', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));
    await screen.findByText('Проверено: 3');

    fireEvent.change(screen.getByLabelText('Файл'), {target: {value: 'guide.md'}});
    fireEvent.click(screen.getByRole('button', {name: 'Проверить файл повторно'}));

    expect(await screen.findByDisplayValue('guide.md')).toBeInTheDocument();
    expect(window.reviewer.reviewFile).toHaveBeenCalledWith(
      'C:\\project',
      'C:\\project\\docs\\ru',
      'guide.md',
    );
    expect(window.reviewer.reviewProject).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: 'Все 1'})).toBeInTheDocument();
    expect(screen.queryByText('Список без вводного текста')).not.toBeInTheDocument();
  });

  it('disables file refresh while all files are selected', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));
    await screen.findByText('Проверено: 3');

    expect(screen.getByRole('button', {name: 'Проверить файл повторно'})).toBeDisabled();
  });

  it('keeps the selected file after a full project review when it still exists', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));
    await screen.findByText('Проверено: 3');

    fireEvent.change(screen.getByLabelText('Файл'), {target: {value: 'guide.md'}});
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));

    expect(await screen.findByDisplayValue('guide.md')).toBeInTheDocument();
  });

  it('falls back to all files after a full review when the selected file disappeared', async () => {
    window.reviewer.reviewProject = vi.fn()
      .mockResolvedValueOnce(reviewResult)
      .mockResolvedValueOnce({...reviewResult, checkedFilePaths: ['index.md', 'clean.md']});

    render(<App />);
    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));
    await screen.findByText('Проверено: 3');

    fireEvent.change(screen.getByLabelText('Файл'), {target: {value: 'guide.md'}});
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));

    await waitFor(() => {
      expect(screen.getByLabelText('Файл')).toHaveValue('all');
    });
  });

  it('shows only the empty state when the selected file has no findings', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name: 'Выбрать проект'}));
    await screen.findByText('C:\\project');
    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));
    await screen.findByText('Проверено: 3');

    fireEvent.change(screen.getByLabelText('Файл'), {target: {value: 'clean.md'}});

    expect(screen.getByText('Замечаний не найдено')).toBeInTheDocument();
    expect(screen.queryByText('Выберите замечание слева.')).not.toBeInTheDocument();
    expect(screen.queryByText('Выберите замечание слева')).not.toBeInTheDocument();
  });

});
