import type {Finding, FindingCategory, Severity} from '../../../src/engine/types';

export interface DiagnosticRangeData {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

export interface DiagnosticData {
  severity: Severity;
  message: string;
  code: string;
  range: DiagnosticRangeData;
}

const categoryLabels: Record<FindingCategory, string> = {
  structure: 'Структура',
  style: 'Стиль',
  terminology: 'Терминология',
  markdown: 'Markdown',
  links: 'Ссылки',
};

export function findingToDiagnosticData(
  finding: Finding,
  actualLine: string = finding.source,
): DiagnosticData {
  const editorLine = Math.max(0, finding.line - 1);
  const sourceOffset = Math.max(0, actualLine.indexOf(finding.source));
  const highlight = finding.highlights?.[0];

  const startCharacter = sourceOffset + (highlight?.start ?? 0);
  const fallbackLength = Math.max(1, finding.source.length);
  const endCharacter = sourceOffset + (highlight?.end ?? fallbackLength);

  const category = categoryLabels[finding.category];
  const recommendation = finding.recommendation
    ? `\nРекомендация: ${finding.recommendation}`
    : '';

  return {
    severity: finding.severity,
    code: finding.ruleId,
    message: `${finding.title} · ${category}\n${finding.message}${recommendation}`,
    range: {
      startLine: editorLine,
      startCharacter,
      endLine: editorLine,
      endCharacter: Math.max(startCharacter + 1, endCharacter),
    },
  };
}


export function findingsForCurrentFile(findings: Finding[], relativeFile: string): Finding[] {
  const normalized = relativeFile.replace(/\\/g, '/');
  return findings.filter((finding) => finding.file.replace(/\\/g, '/') === normalized);
}
