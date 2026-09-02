import {reviewerConfig} from './config';
import {parseMarkdown} from './parser';
import {resolveProjectPaths} from './projectPaths';
import {sortFindings} from './reporter';
import {rules} from './rules';
import {scanMarkdownFiles} from './scanner';
import type {Finding} from './types';

export interface ReviewDiagnostic {
  source: 'scanner' | 'rule';
  message: string;
  ruleId?: string;
}

export interface ReviewResult {
  projectRoot: string;
  docsRoot: string;
  checkedFiles: number;
  findings: Finding[];
  diagnostics: ReviewDiagnostic[];
}

export async function reviewProject(projectRoot: string, docsRoot: string): Promise<ReviewResult> {
  const resolved = await resolveProjectPaths(projectRoot, docsRoot);

  const scanResult = await scanMarkdownFiles(resolved.docsRoot);
  const documents = scanResult.files.map(parseMarkdown);
  const findings: Finding[] = [];
  const diagnostics: ReviewDiagnostic[] = scanResult.diagnostics.map((diagnostic) => ({
    source: 'scanner',
    message: `${diagnostic.file}: ${diagnostic.message}`,
  }));

  for (const rule of rules) {
    try {
      findings.push(...rule.run({documents, config: reviewerConfig}));
    } catch (error) {
      diagnostics.push({
        source: 'rule',
        ruleId: rule.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    projectRoot: resolved.projectRoot,
    docsRoot: resolved.docsRoot,
    checkedFiles: scanResult.files.length,
    findings: sortFindings(findings),
    diagnostics,
  };
}
