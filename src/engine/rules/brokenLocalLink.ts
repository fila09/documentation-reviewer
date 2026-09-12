import {existsSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, posix} from 'node:path';
import type {ParsedDocument} from '../parser';
import type {ReviewRule} from './index';

export function isExternalTarget(target: string): boolean {
  return /^(?:https?:|mailto:|tel:|\/\/)/i.test(target);
}

export function splitTarget(target: string): {path: string; anchor?: string} {
  const [path, anchor] = target.split('#', 2);
  return {path, anchor: anchor || undefined};
}

function unescapeMarkdownPath(path: string): string {
  return path.replace(/\\([\\`*_{}\[\]()#+.!-])/g, '$1');
}

export function resolveRelativeTarget(
  sourceFile: string,
  targetPath: string,
): string {
  if (targetPath === '') return sourceFile;
  return posix.normalize(posix.join(dirname(sourceFile), unescapeMarkdownPath(targetPath)));
}

export function documentMap(documents: ParsedDocument[]): Map<string, ParsedDocument> {
  return new Map(documents.map((document) => [document.file.relativePath, document]));
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\') && !isAbsolute(rel));
}

function targetExistsInsideProject(
  sourceAbsolutePath: string,
  targetPath: string,
  projectRoot?: string,
): boolean {
  if (!projectRoot) return false;

  const unescaped = unescapeMarkdownPath(targetPath);
  const candidate = resolve(dirname(sourceAbsolutePath), unescaped);

  if (!isInside(projectRoot, candidate) || !existsSync(candidate)) return false;

  try {
    const realProject = realpathSync(projectRoot);
    const realCandidate = realpathSync(candidate);
    return isInside(realProject, realCandidate);
  } catch {
    return false;
  }
}

export const brokenLocalLinkRule: ReviewRule = {
  id: 'broken-local-link',
  run({documents, projectRoot}) {
    const byPath = documentMap(documents);

    return documents.flatMap((document) =>
      document.links.flatMap((link) => {
        if (!link.target || isExternalTarget(link.target)) return [];

        const {path} = splitTarget(link.target);
        if (!path || !path.toLowerCase().endsWith('.md')) return [];
        if (path.split(/[\\/]+/).includes('_includes')) return [];

        const resolved = resolveRelativeTarget(document.file.relativePath, path);
        if (byPath.has(resolved)) return [];

        if (targetExistsInsideProject(document.file.absolutePath, path, projectRoot)) return [];

        return [{
          ruleId: 'broken-local-link',
          category: 'links',
          severity: 'error' as const,
          file: document.file.relativePath,
          line: link.line,
          title: 'Битая локальная ссылка',
          message: `Файл ${resolved} не найден в выбранном проекте.`,
          source: link.source,
          recommendation: 'Проверьте путь к целевой Markdown-странице.',
          target: link.target,
        }];
      }),
    );
  },
};
