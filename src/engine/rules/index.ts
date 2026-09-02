import type {Finding, ReviewerConfig} from '../types';
import type {ParsedDocument} from '../parser';
import {brokenLocalLinkRule} from './brokenLocalLink';
import {duplicateExplicitAnchorRule} from './duplicateExplicitAnchor';
import {emptyLinkRule} from './emptyLink';
import {missingAnchorRule} from './missingAnchor';
import {undesirablePhraseRule} from './undesirablePhrase';

export interface RuleContext {
  documents: ParsedDocument[];
  config: ReviewerConfig;
}

export interface ReviewRule {
  id: string;
  run(context: RuleContext): Finding[];
}

export const rules: ReviewRule[] = [
  brokenLocalLinkRule,
  missingAnchorRule,
  duplicateExplicitAnchorRule,
  emptyLinkRule,
  undesirablePhraseRule,
];
