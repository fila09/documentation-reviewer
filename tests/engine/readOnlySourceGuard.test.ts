import {readFile, readdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

const forbiddenFsOperations = [
  'writeFile',
  'appendFile',
  'mkdir',
  'rename',
  'unlink',
  'rm',
  'rmdir',
  'truncate',
  'chmod',
  'chown',
  'copyFile',
];

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {withFileTypes: true});
  const result: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...await collectTypeScriptFiles(path));
    } else if (entry.isFile() && path.endsWith('.ts')) {
      result.push(path);
    }
  }

  return result;
}

describe('read-only source guard', () => {
  it('does not use filesystem mutation APIs in the review engine', async () => {
    const engineRoot = resolve('src/engine');
    const files = await collectTypeScriptFiles(engineRoot);

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      for (const operation of forbiddenFsOperations) {
        expect(source, `${file} must not use ${operation}`).not.toMatch(
          new RegExp(`\\b${operation}\\b`),
        );
      }
    }
  });
});
