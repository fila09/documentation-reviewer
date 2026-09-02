import {createHash} from 'node:crypto';
import {readdir, readFile, stat} from 'node:fs/promises';
import {join, relative, resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import {reviewProject} from '../../src/engine/reviewProject';

async function snapshotTree(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, {withFileTypes: true});

    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);
      const relativePath = relative(root, absolutePath).replaceAll('\\', '/');

      if (entry.isDirectory()) {
        result[`${relativePath}/`] = 'directory';
        await walk(absolutePath);
      } else if (entry.isFile()) {
        const bytes = await readFile(absolutePath);
        result[relativePath] = createHash('sha256').update(bytes).digest('hex');
      }
    }
  }

  await walk(root);
  return result;
}

describe('external project safety', () => {
  it('does not require reviewer.config.json in the checked project', async () => {
    const projectRoot = resolve('tests/fixtures/external-project-no-config');
    const configPath = join(projectRoot, 'reviewer.config.json');

    await expect(stat(configPath)).rejects.toThrow();

    const result = await reviewProject(projectRoot);

    expect(result.checkedFiles).toBe(1);
    expect(result.docsRoot.replaceAll('\\', '/')).toContain('/docs/ru');
  });

  it('leaves every file and directory unchanged after a full review', async () => {
    const projectRoot = resolve('tests/fixtures/external-project-no-config');
    const before = await snapshotTree(projectRoot);

    await reviewProject(projectRoot);

    const after = await snapshotTree(projectRoot);
    expect(after).toEqual(before);
  });
});
