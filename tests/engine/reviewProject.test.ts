import {describe, expect, it} from 'vitest';
import {resolve} from 'node:path';
import {reviewProject} from '../../src/engine/reviewProject';

describe('reviewProject', () => {
  it('returns exactly five known findings and ignores docs/en', async () => {
    const result = await reviewProject(
      resolve('tests/fixtures/five-findings-project'),
    );

    expect(result.checkedFiles).toBe(3);
    expect(result.findings).toHaveLength(5);
    expect(result.findings.map((finding) => finding.ruleId).sort()).toEqual([
      'broken-local-link',
      'duplicate-explicit-anchor',
      'empty-link',
      'missing-anchor',
      'undesirable-phrase',
    ]);
    expect(result.findings.every((finding) => finding.line >= 1)).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });
});
