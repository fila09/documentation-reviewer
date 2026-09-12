import {mixedAlphabetRule} from './mixedAlphabet';
import {multipleSpacesRule} from './multipleSpaces';
import {spaceBeforePunctuationRule} from './spaceBeforePunctuation';
import {emptyAnchorRule} from './emptyAnchor';
import type {Finding, ReviewerConfig} from '../types';
import type {ParsedDocument} from '../parser';
import {brokenLocalLinkRule} from './brokenLocalLink';
import {duplicateExplicitAnchorRule} from './duplicateExplicitAnchor';
import {emptyLinkRule} from './emptyLink';
import {missingAnchorRule} from './missingAnchor';
import {undesirablePhraseRule} from './undesirablePhrase';
import {listWithoutIntroRule} from './listWithoutIntro';
import {skippedHeadingLevelRule} from './skippedHeadingLevel';
import {repeatedWordRule} from './repeatedWord';
import {duplicateContentRule} from './duplicateContent';

export interface RuleContext {
  documents: ParsedDocument[];
  config: ReviewerConfig;
  projectRoot?: string;
  docsRoot?: string;
}

export interface ReviewRule {
  id: string;
  run(context: RuleContext): Finding[];
}

export const rules: ReviewRule[] = [
  emptyAnchorRule,
  spaceBeforePunctuationRule,
  multipleSpacesRule,
  mixedAlphabetRule,
  brokenLocalLinkRule,
  missingAnchorRule,
  duplicateExplicitAnchorRule,
  emptyLinkRule,
  undesirablePhraseRule,
  // listWithoutIntroRule, // Временно отключено: слишком много ложных срабатываний.
  skippedHeadingLevelRule,
  repeatedWordRule,
  duplicateContentRule,
];

// Экспорт оставлен, чтобы правило можно было тестировать и быстро вернуть в активный набор.
export {listWithoutIntroRule};
