import type {Finding} from '../types';
import type {ReviewRule} from './index';

const headingPattern = /^\s{0,3}#{1,6}\s+.+$/;
const listPattern = /^\s*(?:[-+*]\s+|\d+[.)]\s+)/;

export const listWithoutIntroRule: ReviewRule = {
  id: 'list-without-intro',
  run({documents}) {
    return documents.flatMap((document) => {
      const findings: Finding[] = [];

      for (let index = 0; index < document.lines.length; index += 1) {
        if (!headingPattern.test(document.lines[index])) continue;

        let next = index + 1;
        while (next < document.lines.length && document.lines[next].trim() === '') {
          next += 1;
        }

        if (next >= document.lines.length || !listPattern.test(document.lines[next])) {
          continue;
        }

        findings.push({
          ruleId: 'list-without-intro',
          category: 'structure' as const,
          severity: 'info' as const,
          file: document.file.relativePath,
          line: next + 1,
          title: 'Список без вводного текста',
          message: 'Список начинается сразу после заголовка раздела.',
          source: document.lines[next].trim(),
          recommendation: 'Проверьте, нужен ли перед списком вводный текст, который объясняет его назначение.',
        });
      }

      return findings;
    });
  },
};
