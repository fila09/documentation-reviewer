import type {Finding} from '../types';
import type {ReviewRule} from './index';

const headingPattern = /^\s{0,3}(#{1,6})\s+(.+?)\s*$/;

export const emptySectionRule: ReviewRule = {
  id: 'empty-section',
  run({documents}) {
    return documents.flatMap((document) => {
      const findings: Finding[] = [];

      for (let index = 0; index < document.lines.length; index += 1) {
        const lineText = document.lines[index];
        const heading = lineText.match(headingPattern);
        if (!heading) continue;

        let next = index + 1;
        while (next < document.lines.length && document.lines[next].trim() === '') {
          next += 1;
        }

        if (next < document.lines.length && !headingPattern.test(document.lines[next])) {
          continue;
        }

        findings.push({
          ruleId: 'empty-section',
          category: 'structure' as const,
          severity: 'warning' as const,
          file: document.file.relativePath,
          line: index + 1,
          title: 'Пустой раздел',
          message: 'После заголовка раздела нет содержимого.',
          source: lineText.trim(),
          recommendation: 'Добавьте содержимое раздела или удалите пустой заголовок.',
        });
      }

      return findings;
    });
  },
};
