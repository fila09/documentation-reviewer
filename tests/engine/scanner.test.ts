import {describe, expect, it} from 'vitest';
import {join, resolve} from 'node:path';
import {scanMarkdownFiles} from '../../src/engine/scanner';

describe('scanMarkdownFiles', () => {
  it('scans only the documentation directory passed by the reviewer', async () => {
    const projectRoot = resolve('tests/fixtures/clean-project');
    const result = await scanMarkdownFiles(join(projectRoot, 'docs/ru'));

    expect(result.files.map((file) => file.relativePath)).toEqual(['index.md']);
    expect(result.diagnostics).toEqual([]);
  });
});
