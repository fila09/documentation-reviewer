import type {Finding} from '../types';
import type {ReviewRule} from './index';

const headingPattern = /^\s{0,3}(#{1,6})\s+(.+?)\s*$/;

export const skippedHeadingLevelRule: ReviewRule = {
  id: 'skipped-heading-level',
  run({documents}) {
    return documents.flatMap((document) => {
      const findings: Finding[] = [];
      let previousLevel: number | null = null;

      document.lines.forEach((lineText, index) => {
        const match = lineText.match(headingPattern);
        if (!match) return;

        const level = match[1].length;
        if (previousLevel !== null && level > previousLevel + 1) {
          findings.push({
            ruleId: 'skipped-heading-level',
            category: 'markdown' as const,
            severity: 'warning' as const,
            file: document.file.relativePath,
            line: index + 1,
            title: 'Пропущен уровень заголовка',
            message: `После заголовка уровня ${previousLevel} используется уровень ${level}.`,
            source: lineText.trim(),
            recommendation: `Проверьте иерархию: после уровня ${previousLevel} обычно следует уровень ${previousLevel + 1}.`,
          });
        }

        previousLevel = level;
      });

      return findings;
    });
  },
};
