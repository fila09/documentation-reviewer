import type {Finding} from './types';

const severityOrder = {
  error: 0,
  warning: 1,
  info: 2,
} as const;

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity]
    || a.file.localeCompare(b.file)
    || a.line - b.line
    || a.ruleId.localeCompare(b.ruleId),
  );
}
