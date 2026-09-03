import {describe, expect, it} from 'vitest';
import {parseMarkdown} from '../../src/engine/parser';
import {emptyLinkRule} from '../../src/engine/rules/emptyLink';
import {brokenLocalLinkRule} from '../../src/engine/rules/brokenLocalLink';
import {missingAnchorRule} from '../../src/engine/rules/missingAnchor';
import {duplicateExplicitAnchorRule} from '../../src/engine/rules/duplicateExplicitAnchor';
import {undesirablePhraseRule} from '../../src/engine/rules/undesirablePhrase';
import {listWithoutIntroRule} from '../../src/engine/rules/listWithoutIntro';
import {skippedHeadingLevelRule} from '../../src/engine/rules/skippedHeadingLevel';
import {repeatedWordRule} from '../../src/engine/rules/repeatedWord';

const config = {undesirablePhrases: []};

function doc(relativePath: string, content: string) {
  return parseMarkdown({
    absolutePath: `/project/docs/ru/${relativePath}`,
    relativePath,
    content,
  });
}

describe('deterministic rules', () => {
  it('reports an empty link', () => {
    const findings = emptyLinkRule.run({
      documents: [doc('index.md', '[Подробнее]()')],
      config,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'empty-link',
      severity: 'error',
      file: 'index.md',
      line: 1,
    });
  });

  it('reports a missing local markdown file', () => {
    const findings = brokenLocalLinkRule.run({
      documents: [doc('index.md', '[Страница](missing.md)')],
      config,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].target).toBe('missing.md');
  });

  it('reports a missing anchor only when the target file exists', () => {
    const documents = [
      doc('index.md', '[Раздел](target.md#missing)'),
      doc('target.md', '# Target {#real}'),
    ];

    const findings = missingAnchorRule.run({documents, config});

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'missing-anchor',
      file: 'index.md',
      line: 1,
      target: 'target.md#missing',
    });
  });

  it('allows the same explicit anchor in different files', () => {
    const documents = [
      doc('a.md', '# A {#same}'),
      doc('b.md', '# B {#same}'),
    ];

    const findings = duplicateExplicitAnchorRule.run({documents, config});

    expect(findings).toHaveLength(0);
  });

  it('reports a duplicate explicit anchor inside one file', () => {
    const documents = [
      doc('a.md', '# A {#same}\n\n## B {#same}'),
    ];

    const findings = duplicateExplicitAnchorRule.run({documents, config});

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'duplicate-explicit-anchor',
      file: 'a.md',
      line: 3,
    });
  });

  it('ignores include references when checking broken local links', () => {
    const findings = brokenLocalLinkRule.run({
      documents: [doc('guide/page.md', '[repository-check](../_includes/rt_datalake/repository_check.md)')],
      config,
    });

    expect(findings).toHaveLength(0);
  });

  it('reports an undesirable russian phrase', () => {
    const findings = undesirablePhraseRule.run({
      documents: [
        doc('style.md', 'Необходимо осуществить настройку сервиса.'),
      ],
      config: {
        undesirablePhrases: [
          {
            phrase: 'осуществить настройку',
            replacement: 'настроить',
          },
        ],
      },
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'undesirable-phrase',
      severity: 'warning',
      file: 'style.md',
      line: 1,
    });
    expect(findings[0].recommendation).toContain('настроить');
  });

  it('reports a list that starts immediately after a heading', () => {
    const findings = listWithoutIntroRule.run({
      documents: [doc('instruction.md', '## Установка\n\n1. Скачайте архив.\n2. Распакуйте архив.')],
      config,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'list-without-intro',
      category: 'structure',
      severity: 'info',
      line: 3,
    });
  });

  it('does not report a list when there is introductory text', () => {
    const findings = listWithoutIntroRule.run({
      documents: [doc('instruction.md', '## Установка\n\nЧтобы установить компонент:\n\n1. Скачайте архив.')],
      config,
    });

    expect(findings).toHaveLength(0);
  });

  it('reports a skipped heading level', () => {
    const findings = skippedHeadingLevelRule.run({
      documents: [doc('headings.md', '# Документ\n\n### Подраздел')],
      config,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'skipped-heading-level',
      category: 'markdown',
      severity: 'warning',
      line: 3,
    });
  });

  it('does not report sequential heading levels', () => {
    const findings = skippedHeadingLevelRule.run({
      documents: [doc('headings.md', '# Документ\n\n## Раздел\n\n### Подраздел')],
      config,
    });

    expect(findings).toHaveLength(0);
  });

  it('ignores heading-like lines inside fenced code blocks', () => {
    const content = [
      '## Репозитории',
      '',
      '```',
      '# для репозиториев ca и продуктов',
      'rpm http://example',
      '# для репозитория prometheus',
      'http://example',
      '```',
      '',
      '#### 2.2.4 для Astra Linux {#h-224}',
    ].join('\n');

    const findings = skippedHeadingLevelRule.run({
      documents: [doc('install.md', content)],
      config,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(10);
    expect(findings[0].message).toContain('уровня 2');
  });

  it('does not treat markdown-looking content inside code as links or style text', () => {
    const document = doc('code.md', [
      '```markdown',
      '[Ошибка](missing.md)',
      'Чтобы чтобы настроить сервис.',
      '```',
    ].join('\n'));

    expect(brokenLocalLinkRule.run({documents: [document], config})).toHaveLength(0);
    expect(repeatedWordRule.run({documents: [document], config})).toHaveLength(0);
  });

  it('does not join words across inline code when checking repeated words', () => {
    const findings = repeatedWordRule.run({
      documents: [doc('inline.md', 'в `server.properties` в разделе настройте параметр')],
      config,
    });

    expect(findings).toHaveLength(0);
  });

  it('does not report adjacent inline-code spans as a repeated word', () => {
    const findings = repeatedWordRule.run({
      documents: [doc('inline.md', 'Хотя команда `cqlsh` `COPY` может загружать данные CSV')],
      config,
    });

    expect(findings).toHaveLength(0);
  });

  it('reports a repeated adjacent word case-insensitively', () => {
    const findings = repeatedWordRule.run({
      documents: [doc('style.md', 'Чтобы чтобы настроить сервис, откройте параметры.')],
      config,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'repeated-word',
      category: 'style',
      severity: 'error',
      line: 1,
    });
    expect(findings[0].message).toContain('Чтобы');
  });

});
