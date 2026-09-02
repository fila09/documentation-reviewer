import type {ReviewRule} from './index';

export const undesirablePhraseRule: ReviewRule = {
  id: 'undesirable-phrase',
  run({documents, config}) {
    return documents.flatMap((document) =>
      document.lines.flatMap((lineText, index) =>
        config.undesirablePhrases.flatMap((phraseRule) => {
          if (!lineText.toLocaleLowerCase('ru-RU')
            .includes(phraseRule.phrase.toLocaleLowerCase('ru-RU'))) {
            return [];
          }

          return [{
            ruleId: 'undesirable-phrase',
            category: 'style',
            severity: 'warning' as const,
            file: document.file.relativePath,
            line: index + 1,
            title: 'Нежелательная формулировка',
            message: `Найдена формулировка «${phraseRule.phrase}».`,
            source: lineText.trim(),
            recommendation: `Рекомендуемый вариант: «${phraseRule.replacement}».`,
          }];
        }),
      ),
    );
  },
};
