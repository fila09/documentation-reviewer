import type {ReviewRule} from './index';

export const emptyAnchorRule: ReviewRule = {
  id: 'empty-anchor',
  run({documents}) {
    return documents.flatMap((document) =>
      document.lines.flatMap((lineText, index) => {
        if (!/\{#\}/.test(lineText)) return [];

        return [{
          ruleId: 'empty-anchor',
          category: 'markdown' as const,
          severity: 'error' as const,
          file: document.file.relativePath,
          line: index + 1,
          title: 'Пустой якорь',
          message: 'Якорь не содержит идентификатор.',
          source: lineText.trim(),
          recommendation: 'Укажите идентификатор якоря или удалите пустой якорь.',
        }];
      }),
    );
  },
};
