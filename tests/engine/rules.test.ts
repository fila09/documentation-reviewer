import {describe, expect, it} from 'vitest';
import {parseMarkdown} from '../../src/engine/parser';
import {emptyLinkRule} from '../../src/engine/rules/emptyLink';
import {brokenLocalLinkRule} from '../../src/engine/rules/brokenLocalLink';
import {missingAnchorRule} from '../../src/engine/rules/missingAnchor';
import {duplicateExplicitAnchorRule} from '../../src/engine/rules/duplicateExplicitAnchor';
import {undesirablePhraseRule} from '../../src/engine/rules/undesirablePhrase';

const config = {docsRoot: 'docs/ru', undesirablePhrases: []};

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

  it('reports the second duplicate explicit anchor', () => {
    const documents = [
      doc('a.md', '# A {#same}'),
      doc('b.md', '# B {#same}'),
    ];

    const findings = duplicateExplicitAnchorRule.run({documents, config});

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'duplicate-explicit-anchor',
      file: 'b.md',
      line: 1,
    });
  });

  it('reports an undesirable russian phrase', () => {
    const findings = undesirablePhraseRule.run({
      documents: [
        doc('style.md', 'Необходимо осуществить настройку сервиса.'),
      ],
      config: {
        docsRoot: 'docs/ru',
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
});
