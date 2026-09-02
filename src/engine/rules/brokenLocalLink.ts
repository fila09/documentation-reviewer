import {dirname, posix} from 'node:path';
import type {ParsedDocument} from '../parser';
import type {ReviewRule} from './index';

export function isExternalTarget(target: string): boolean {
  return /^(?:https?:|mailto:|tel:|\/\/)/i.test(target);
}

export function splitTarget(target: string): {path: string; anchor?: string} {
  const [path, anchor] = target.split('#', 2);
  return {path, anchor: anchor || undefined};
}

export function resolveRelativeTarget(
  sourceFile: string,
  targetPath: string,
): string {
  if (targetPath === '') return sourceFile;
  return posix.normalize(posix.join(dirname(sourceFile), targetPath));
}

export function documentMap(documents: ParsedDocument[]): Map<string, ParsedDocument> {
  return new Map(documents.map((document) => [document.file.relativePath, document]));
}

export const brokenLocalLinkRule: ReviewRule = {
  id: 'broken-local-link',
  run({documents}) {
    const byPath = documentMap(documents);

    return documents.flatMap((document) =>
      document.links.flatMap((link) => {
        if (!link.target || isExternalTarget(link.target)) return [];

        const {path} = splitTarget(link.target);
        if (!path || !path.toLowerCase().endsWith('.md')) return [];

        const resolved = resolveRelativeTarget(document.file.relativePath, path);
        if (byPath.has(resolved)) return [];

        return [{
          ruleId: 'broken-local-link',
          category: 'links',
          severity: 'error' as const,
          file: document.file.relativePath,
          line: link.line,
          title: 'Битая локальная ссылка',
          message: `Файл ${resolved} не найден в выбранной папке документации.`,
          source: link.source,
          recommendation: 'Проверьте путь к целевой Markdown-странице.',
          target: link.target,
        }];
      }),
    );
  },
};
