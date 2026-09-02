import {realpath, stat} from 'node:fs/promises';
import {isAbsolute, join, relative} from 'node:path';

function isStrictlyInside(projectRoot: string, docsRoot: string): boolean {
  const rel = relative(projectRoot, docsRoot);
  return rel !== '' && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\') && !isAbsolute(rel);
}

export interface ResolvedProjectPaths {
  projectRoot: string;
  docsRoot: string;
}

export async function resolveProjectPaths(
  projectRoot: string,
  docsRoot: string,
): Promise<ResolvedProjectPaths> {
  let project: string;
  let docs: string;

  try {
    project = await realpath(projectRoot);
  } catch {
    throw new Error(`Папка проекта не найдена: ${projectRoot}`);
  }

  try {
    docs = await realpath(docsRoot);
  } catch {
    throw new Error(`Папка документации не найдена: ${docsRoot}`);
  }

  if (!isStrictlyInside(project, docs)) {
    throw new Error('Папка документации должна находиться внутри выбранного проекта.');
  }

  return {projectRoot: project, docsRoot: docs};
}

export async function suggestDefaultDocsRoot(projectRoot: string): Promise<string | null> {
  let project: string;

  try {
    project = await realpath(projectRoot);
  } catch {
    return null;
  }

  const candidate = join(project, 'docs', 'ru');

  try {
    const candidateStat = await stat(candidate);
    if (!candidateStat.isDirectory()) return null;
    const resolved = await resolveProjectPaths(project, candidate);
    return resolved.docsRoot;
  } catch {
    return null;
  }
}
