import type {ReviewerConfig} from './types';

export const reviewerConfig: ReviewerConfig = {
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
