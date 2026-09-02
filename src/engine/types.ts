export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  ruleId: string;
  category: string;
  severity: Severity;
  file: string;
  line: number;
  title: string;
  message: string;
  source: string;
  recommendation: string;
  target?: string;
}

export interface PhraseRule {
  phrase: string;
  replacement: string;
}

export interface ReviewerConfig {
  docsRoot: string;
  undesirablePhrases: PhraseRule[];
}

export interface ProjectFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}
