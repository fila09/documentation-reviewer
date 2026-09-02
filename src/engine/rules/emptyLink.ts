import type {ReviewRule} from './index';

export const emptyLinkRule: ReviewRule = {
  id: 'empty-link',
  run({documents}) {
    return documents.flatMap((document) =>
      document.links
        .filter((link) => link.target === '')
        .map((link) => ({
          ruleId: 'empty-link',
          category: 'links',
          severity: 'error' as const,
          file: document.file.relativePath,
          line: link.line,
          title: 'Пустая ссылка',
          message: 'Для ссылки не указан адрес.',
          source: link.source,
          recommendation: 'Укажите адрес ссылки или удалите ссылку.',
        })),
    );
  },
};
