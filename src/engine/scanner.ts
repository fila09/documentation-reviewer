import {readdir, readFile, stat} from 'node:fs/promises';
import {join, relative} from 'node:path';
import type {ProjectFile} from './types';

export interface ScanDiagnostic {
  file: string;
  message: string;
}

export interface ScanResult {
  files: ProjectFile[];
  diagnostics: ScanDiagnostic[];
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {withFileTypes: true});
  const result: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push(...await walk(path));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      result.push(path);
    }
  }

  return result;
}

export async function scanMarkdownFiles(docsRoot: string): Promise<ScanResult> {
  try {
    const rootStat = await stat(docsRoot);
    if (!rootStat.isDirectory()) throw new Error('not a directory');
  } catch {
    throw new Error(`Папка документации не найдена: ${docsRoot}`);
  }

  const paths = await walk(docsRoot);
  const files: ProjectFile[] = [];
  const diagnostics: ScanDiagnostic[] = [];

  for (const absolutePath of paths) {
    const relativePath = relative(docsRoot, absolutePath).replaceAll('\\', '/');

    try {
      files.push({
        absolutePath,
        relativePath,
        content: await readFile(absolutePath, 'utf8'),
      });
    } catch (error) {
      diagnostics.push({
        file: relativePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return {files, diagnostics};
}
