import type {Finding} from '../types';
import type {ReviewRule} from './index';

export const duplicateExplicitAnchorRule: ReviewRule = {
  id: 'duplicate-explicit-anchor',
  run({documents}) {
    const firstById = new Map<string, {file: string; line: number}>();
    const findings: Finding[] = [];

    for (const document of documents) {
      for (const anchor of document.anchors) {
        const first = firstById.get(anchor.id);

        if (!first) {
          firstById.set(anchor.id, {
            file: document.file.relativePath,
            line: anchor.line,
          });
          continue;
        }

        findings.push({
          ruleId: 'duplicate-explicit-anchor',
          category: 'markdown',
          severity: 'error',
          file: document.file.relativePath,
          line: anchor.line,
          title: 'Дублирующийся явный якорь',
          message: `Якорь #${anchor.id} уже объявлен в ${first.file}:${first.line}.`,
          source: anchor.source,
          recommendation: 'Задайте этому разделу уникальный явный якорь.',
          target: `#${anchor.id}`,
        });
      }
    }

    return findings;
  },
};
