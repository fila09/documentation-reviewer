import {readFile} from 'node:fs/promises';
import {isAbsolute, join, relative} from 'node:path';
import * as vscode from 'vscode';
import {suggestDefaultDocsRoot} from '../../../src/engine/projectPaths';
import {reviewProject} from '../../../src/engine/reviewProject';
import type {Finding, Severity} from '../../../src/engine/types';
import {findingToDiagnosticData} from './diagnostics';

const diagnosticSource = 'ДокРевью';

function vscodeSeverity(severity: Severity): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'error':
      return vscode.DiagnosticSeverity.Error;
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'info':
      return vscode.DiagnosticSeverity.Information;
  }
}

function getWorkspaceRoot(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

async function getDocsRoot(projectRoot: string): Promise<string | null> {
  const configured = vscode.workspace
    .getConfiguration('docReview')
    .get<string>('docsRoot', '')
    .trim();

  if (configured) {
    return isAbsolute(configured) ? configured : join(projectRoot, configured);
  }

  return suggestDefaultDocsRoot(projectRoot);
}

async function lineForFinding(docsRoot: string, finding: Finding): Promise<string> {
  try {
    const content = await readFile(join(docsRoot, finding.file), 'utf8');
    return content.split(/\r?\n/)[finding.line - 1] ?? finding.source;
  } catch {
    return finding.source;
  }
}

async function publishFindings(
  collection: vscode.DiagnosticCollection,
  docsRoot: string,
  findings: Finding[],
): Promise<void> {
  const grouped = new Map<string, vscode.Diagnostic[]>();

  for (const finding of findings) {
    const filePath = join(docsRoot, finding.file);
    const line = await lineForFinding(docsRoot, finding);
    const data = findingToDiagnosticData(finding, line);
    const range = new vscode.Range(
      data.range.startLine,
      data.range.startCharacter,
      data.range.endLine,
      data.range.endCharacter,
    );
    const diagnostic = new vscode.Diagnostic(range, data.message, vscodeSeverity(data.severity));
    diagnostic.source = diagnosticSource;
    diagnostic.code = data.code;

    const diagnostics = grouped.get(filePath) ?? [];
    diagnostics.push(diagnostic);
    grouped.set(filePath, diagnostics);
  }

  collection.clear();
  for (const [filePath, diagnostics] of grouped) {
    collection.set(vscode.Uri.file(filePath), diagnostics);
  }
}

async function runFullReview(collection: vscode.DiagnosticCollection): Promise<void> {
  const projectRoot = getWorkspaceRoot();
  if (!projectRoot) {
    await vscode.window.showWarningMessage('ДокРевью: сначала откройте папку проекта в VS Code.');
    return;
  }

  const docsRoot = await getDocsRoot(projectRoot);
  if (!docsRoot) {
    await vscode.window.showWarningMessage(
      'ДокРевью: папка docs/ru не найдена. Укажите папку документации командой «ДокРевью: Выбрать папку документации».',
    );
    return;
  }

  try {
    const result = await reviewProject(projectRoot, docsRoot);
    await publishFindings(collection, result.docsRoot, result.findings);

    const suffix = result.findings.length === 1 ? 'замечание' : 'замечаний';
    await vscode.window.showInformationMessage(
      `ДокРевью: проверено файлов — ${result.checkedFiles}, найдено ${result.findings.length} ${suffix}.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`ДокРевью: ${message}`);
  }
}

async function selectDocsRoot(): Promise<void> {
  const projectRoot = getWorkspaceRoot();
  if (!projectRoot) {
    await vscode.window.showWarningMessage('ДокРевью: сначала откройте папку проекта в VS Code.');
    return;
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: vscode.Uri.file(projectRoot),
    openLabel: 'Выбрать папку документации',
  });
  const selectedPath = selected?.[0]?.fsPath;
  if (!selectedPath) return;

  const rel = relative(projectRoot, selectedPath);
  if (!rel || rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) {
    await vscode.window.showErrorMessage(
      'ДокРевью: папка документации должна находиться внутри открытого проекта.',
    );
    return;
  }

  await vscode.workspace
    .getConfiguration('docReview')
    .update('docsRoot', rel, vscode.ConfigurationTarget.Workspace);

  await vscode.window.showInformationMessage(`ДокРевью: папка документации — ${rel}.`);
}

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection('docReview');

  context.subscriptions.push(
    diagnostics,
    vscode.commands.registerCommand('docReview.runReview', () => runFullReview(diagnostics)),
    vscode.commands.registerCommand('docReview.selectDocsRoot', selectDocsRoot),
  );
}

export function deactivate(): void {}
