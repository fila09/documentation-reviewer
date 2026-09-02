import {describe, expect, it} from 'vitest';
import {resolve} from 'node:path';
import {reviewProject} from '../../src/engine/reviewProject';

describe('reviewProject', () => {
  it('returns exactly five known findings for an explicitly selected docs/ru directory', async () => {
    const projectRoot = resolve('tests/fixtures/five-findings-project');
    const docsRoot = resolve(projectRoot, 'docs/ru');
    const result = await reviewProject(projectRoot, docsRoot);

    expect(result.checkedFiles).toBe(3);
    expect(result.findings).toHaveLength(5);
    expect(result.findings.map((finding) => finding.ruleId).sort()).toEqual([
      'broken-local-link',
      'duplicate-explicit-anchor',
      'empty-link',
      'missing-anchor',
      'undesirable-phrase',
    ]);
    expect(result.docsRoot).toBe(docsRoot);
    expect(result.diagnostics).toEqual([]);
  });

  it('reviews a non-standard documentation directory', async () => {
    const projectRoot = resolve('tests/fixtures/custom-docs-project');
    const docsRoot = resolve(projectRoot, 'documentation/manual');
    const result = await reviewProject(projectRoot, docsRoot);

    expect(result.checkedFiles).toBe(1);
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(['empty-link']);
    expect(result.docsRoot).toBe(docsRoot);
  });

  it('returns the editorial findings enabled in v0.3', async () => {
    const projectRoot = resolve('tests/fixtures/editorial-rules-project');
    const docsRoot = resolve(projectRoot, 'docs/ru');
    const result = await reviewProject(projectRoot, docsRoot);

    expect(result.findings.map((finding) => finding.ruleId).sort()).toEqual([
      'list-without-intro',
      'repeated-word',
      'skipped-heading-level',
      'undesirable-phrase',
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects a documentation directory outside the selected project', async () => {
    const projectRoot = resolve('tests/fixtures/custom-docs-project');
    const outsideDocsRoot = resolve('tests/fixtures/five-findings-project/docs/ru');

    await expect(reviewProject(projectRoot, outsideDocsRoot)).rejects.toThrow(
      'Папка документации должна находиться внутри выбранного проекта.',
    );
  });
});
