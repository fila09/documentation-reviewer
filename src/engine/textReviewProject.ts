import {readFile, realpath, stat} from 'node:fs/promises';
import {isAbsolute, join, relative} from 'node:path';
import {parseMarkdown} from './parser';
import {resolveProjectPaths} from './projectPaths';
import {sortFindings} from './reporter';
import {scanMarkdownFiles} from './scanner';
import {reviewRussianSpelling} from './textReview';
import type {FileReviewResult, ReviewDiagnostic, ReviewResult} from './reviewProject';
import type {Finding, ProjectFile} from './types';

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== '' && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\') && !isAbsolute(rel);
}

function normalizeRelativePath(value: string): string {
  return value.replaceAll('\\', '/');
}

async function yieldToEventLoop(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function reviewDocumentsWithYield(documents: ReturnType<typeof parseMarkdown>[]): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const document of documents) {
    findings.push(...await reviewRussianSpelling([document]));
    await yieldToEventLoop();
  }

  return findings;
}

async function readSelectedMarkdownFile(docsRoot: string, relativePath: string): Promise<ProjectFile> {
  const normalizedPath = normalizeRelativePath(relativePath);
  if (!normalizedPath.toLowerCase().endsWith('.md')) {
    throw new Error(`Файл документации не найден: ${normalizedPath}`);
  }

  const candidate = join(docsRoot, normalizedPath);
  let absolutePath: string;

  try {
    absolutePath = await realpath(candidate);
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile() || !isInside(docsRoot, absolutePath)) throw new Error('outside docs root');
  } catch {
    throw new Error(`Файл документации не найден: ${normalizedPath}`);
  }

  return {
    absolutePath,
    relativePath: normalizeRelativePath(relative(docsRoot, absolutePath)),
    content: await readFile(absolutePath, 'utf8'),
  };
}

export async function reviewTextProject(projectRoot: string, docsRoot: string): Promise<ReviewResult> {
  const resolved = await resolveProjectPaths(projectRoot, docsRoot);
  const scanResult = await scanMarkdownFiles(resolved.docsRoot);
  const documents = scanResult.files.map(parseMarkdown);
  const diagnostics: ReviewDiagnostic[] = scanResult.diagnostics.map((diagnostic) => ({
    source: 'scanner',
    message: `${diagnostic.file}: ${diagnostic.message}`,
  }));

  let findings: Finding[] = [];
  try {
    findings = await reviewDocumentsWithYield(documents);
  } catch (error) {
    diagnostics.push({
      source: 'rule',
      ruleId: 'russian-spelling',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    projectRoot: resolved.projectRoot,
    docsRoot: resolved.docsRoot,
    checkedFiles: scanResult.files.length,
    checkedFilePaths: scanResult.files.map((file) => file.relativePath),
    findings: sortFindings(findings),
    diagnostics,
  };
}

export async function reviewTextFile(
  projectRoot: string,
  docsRoot: string,
  relativePath: string,
): Promise<FileReviewResult> {
  const resolved = await resolveProjectPaths(projectRoot, docsRoot);
  const file = await readSelectedMarkdownFile(resolved.docsRoot, relativePath);
  const diagnostics: ReviewDiagnostic[] = [];
  let findings: Finding[] = [];

  try {
    findings = await reviewRussianSpelling([parseMarkdown(file)]);
  } catch (error) {
    diagnostics.push({
      source: 'rule',
      ruleId: 'russian-spelling',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    projectRoot: resolved.projectRoot,
    docsRoot: resolved.docsRoot,
    file: file.relativePath,
    findings: sortFindings(findings),
    diagnostics,
  };
}
