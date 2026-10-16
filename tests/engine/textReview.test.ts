import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {reviewTextFile, reviewTextProject} from '../../src/engine/textReviewProject';

const temporaryProjects: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryProjects.splice(0).map((path) => rm(path, {recursive: true, force: true})));
});

describe('russian text review', () => {
  it('reports a russian typo and ignores technical identifiers and code', async () => {
    const projectRoot = resolve('tests/fixtures/spelling-project');
    const docsRoot = resolve(projectRoot, 'docs/ru');
    const result = await reviewTextProject(projectRoot, docsRoot);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      ruleId: 'russian-spelling',
      category: 'text',
      source: 'Выполните следующие действя.',
    });
    expect(result.findings[0].message).toContain('действя');
  });

  it('accepts common Russian forms, IT vocabulary and hyphenated words', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'docreview-vocabulary-'));
    temporaryProjects.push(projectRoot);
    const docsRoot = join(projectRoot, 'docs', 'ru');
    await mkdir(docsRoot, {recursive: true});
    await writeFile(join(docsRoot, 'terms.md'),
      'Оркестратор сервисов и хостов. Репозитория и оркестрации. Фреймворк масштабируется. ИТ-специалистов каким-либо образом.\n', 'utf8');
    const result = await reviewTextFile(projectRoot, docsRoot, 'terms.md');
    expect(result.findings).toEqual([]);
  });

  it('checks terminology and style without duplicate spelling warnings', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'docreview-terminology-'));
    temporaryProjects.push(projectRoot);
    const docsRoot = join(projectRoot, 'docs', 'ru');
    await mkdir(docsRoot, {recursive: true});
    await writeFile(join(docsRoot, 'terms.md'),
      'Керберизация и керберизации. Ошибка кеберизации. Работа с урлами.\n', 'utf8');
    const result = await reviewTextFile(projectRoot, docsRoot, 'terms.md');
    expect(result.findings.filter((finding) => finding.category === 'terminology')).toHaveLength(1);
    expect(result.findings.filter((finding) => finding.category === 'style')).toHaveLength(1);
    expect(result.findings.find((finding) => finding.category === 'terminology')?.recommendation).toContain('керберизации');
    expect(result.findings.find((finding) => finding.category === 'style')?.recommendation).toContain('URL-адресами');
    expect(result.findings.filter((finding) => finding.ruleId === 'russian-spelling')).toHaveLength(0);
  });

  it('ignores terminology in code, URLs, paths and markdown targets', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'docreview-terminology-masks-'));
    temporaryProjects.push(projectRoot);
    const docsRoot = join(projectRoot, 'docs', 'ru');
    await mkdir(docsRoot, {recursive: true});
    await writeFile(join(docsRoot, 'terms.md'),
      '`кеберизация`\n```text\nурлами\n```\nhttps://example.org/кеберизация\n[ссылка](./урлами.md)\n', 'utf8');
    const result = await reviewTextFile(projectRoot, docsRoot, 'terms.md');
    expect(result.findings.filter((finding) => ['terminology', 'style'].includes(finding.category))).toEqual([]);
  });

  it('reviews only the selected markdown file instead of scanning the whole docs tree', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'docreview-text-file-'));
    temporaryProjects.push(projectRoot);
    const docsRoot = join(projectRoot, 'docs', 'ru');
    await mkdir(docsRoot, {recursive: true});

    await writeFile(join(docsRoot, 'selected.md'), 'Выполните следующие действя.\n', 'utf8');

    // Если reviewTextFile по ошибке снова запустит reviewTextProject, он прочитает
    // и этот огромный посторонний файл. Прямая проверка выбранного файла не должна
    // зависеть от его содержимого.
    const unrelated = `${'Корректный текст.\n'.repeat(10000)}Еще один текст.\n`;
    await writeFile(join(docsRoot, 'unrelated.md'), unrelated, 'utf8');

    const result = await reviewTextFile(projectRoot, docsRoot, 'selected.md');

    expect(result.file).toBe('selected.md');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].file).toBe('selected.md');
    expect(result.findings[0].message).toContain('действя');
  });
});
