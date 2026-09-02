import type {ReviewRule} from './index';
import {
  documentMap,
  isExternalTarget,
  resolveRelativeTarget,
  splitTarget,
} from './brokenLocalLink';

export const missingAnchorRule: ReviewRule = {
  id: 'missing-anchor',
  run({documents}) {
    const byPath = documentMap(documents);

    return documents.flatMap((document) =>
      document.links.flatMap((link) => {
        if (!link.target || isExternalTarget(link.target)) return [];

        const {path, anchor} = splitTarget(link.target);
        if (!anchor) return [];

        const resolved = resolveRelativeTarget(
          document.file.relativePath,
          path || '',
        );
        const targetDocument = byPath.get(resolved);

        if (!targetDocument) return [];
        if (targetDocument.anchors.some((item) => item.id === anchor)) return [];

        return [{
          ruleId: 'missing-anchor',
          category: 'links',
          severity: 'error' as const,
          file: document.file.relativePath,
          line: link.line,
          title: 'Несуществующий якорь',
          message: `Якорь #${anchor} не найден в файле ${resolved}.`,
          source: link.source,
          recommendation: 'Проверьте идентификатор якоря или добавьте его в целевой раздел.',
          target: link.target,
        }];
      }),
    );
  },
};
