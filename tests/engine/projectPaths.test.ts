import {describe, expect, it} from 'vitest';
import {resolve} from 'node:path';
import {resolveProjectPaths, suggestDefaultDocsRoot} from '../../src/engine/projectPaths';

describe('project paths', () => {
  it('suggests docs/ru when it exists', async () => {
    const projectRoot = resolve('tests/fixtures/external-project-no-config');
    const expected = resolve(projectRoot, 'docs/ru');

    await expect(suggestDefaultDocsRoot(projectRoot)).resolves.toBe(expected);
  });

  it('returns no suggestion when docs/ru does not exist', async () => {
    const projectRoot = resolve('tests/fixtures/custom-docs-project');

    await expect(suggestDefaultDocsRoot(projectRoot)).resolves.toBeNull();
  });

  it('accepts a nested documentation directory', async () => {
    const projectRoot = resolve('tests/fixtures/custom-docs-project');
    const docsRoot = resolve(projectRoot, 'documentation/manual');

    await expect(resolveProjectPaths(projectRoot, docsRoot)).resolves.toMatchObject({
      docsRoot,
    });
  });

  it('rejects the project root itself as the documentation directory', async () => {
    const projectRoot = resolve('tests/fixtures/custom-docs-project');

    await expect(resolveProjectPaths(projectRoot, projectRoot)).rejects.toThrow(
      'Папка документации должна находиться внутри выбранного проекта.',
    );
  });
});
