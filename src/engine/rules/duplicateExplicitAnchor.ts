import type {Finding} from '../types';
import type {ReviewRule} from './index';

export const duplicateExplicitAnchorRule: ReviewRule = {
  id: 'duplicate-explicit-anchor',
  run({documents}) {
    return documents.flatMap((document) => {
      const firstLineById = new Map<string, number>();
      const findings: Finding[] = [];

      for (const anchor of document.anchors) {
        const firstLine = firstLineById.get(anchor.id);

        if (firstLine === undefined) {
          firstLineById.set(anchor.id, anchor.line);
          continue;
        }

        findings.push({
          ruleId: 'duplicate-explicit-anchor',
          category: 'markdown',
          severity: 'error',
          file: document.file.relativePath,
          line: anchor.line,
          title: 'Дублирующийся якорь',
          message: `Якорь #${anchor.id} уже объявлен в этом файле на строке ${firstLine}.`,
          source: anchor.source,
          recommendation: 'Задайте этому разделу уникальный якорь в пределах файла.',
          target: `#${anchor.id}`,
        });
      }

      return findings;
    });
  },
};
