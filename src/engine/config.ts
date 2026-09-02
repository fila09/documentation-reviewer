import type {ReviewerConfig} from './types';

export const reviewerConfig: ReviewerConfig = {
  docsRoot: 'docs/ru',
  undesirablePhrases: [
    {
      phrase: 'осуществить настройку',
      replacement: 'настроить',
    },
    {
      phrase: 'произвести настройку',
      replacement: 'настроить',
    },
  ],
};
