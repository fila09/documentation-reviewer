import {describe, expect, it} from 'vitest';
import {resolve} from 'node:path';
import {loadConfig} from '../../src/engine/config';
import {scanMarkdownFiles} from '../../src/engine/scanner';

describe('scanMarkdownFiles', () => {
  it('scans only docs/ru and ignores docs/en', async () => {
    const projectRoot = resolve('tests/fixtures/clean-project');
    const config = await loadConfig(projectRoot);
    const result = await scanMarkdownFiles(projectRoot, config);

    expect(result.files.map((file) => file.relativePath)).toEqual(['index.md']);
    expect(result.diagnostics).toEqual([]);
  });
});
