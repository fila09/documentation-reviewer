export type Severity = 'error' | 'warning' | 'info';
export type FindingCategory = 'structure' | 'style' | 'terminology' | 'markdown' | 'links';

export interface SourceHighlight {
  start: number;
  end: number;
}

export interface Finding {
  ruleId: string;
  category: FindingCategory;
  severity: Severity;
  file: string;
  line: number;
  title: string;
  message: string;
  source: string;
  recommendation: string;
  target?: string;
  highlights?: SourceHighlight[];
}

export interface PhraseRule {
  phrase: string;
  replacement: string;
}

export interface ReviewerConfig {
  undesirablePhrases: PhraseRule[];
}

export interface ProjectFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}
