import {useEffect, useMemo, useState} from 'react';
import type {Finding, FindingCategory, Severity} from '../../engine/types';
import type {ReviewResult} from '../../engine/reviewProject';
import {sortFindings} from '../../engine/reporter';
import {FindingDetails} from './components/FindingDetails';
import {FindingsList} from './components/FindingsList';
import {Filters, type CategoryFilter, type FileFilter, type SeverityFilter} from './components/Filters';
import {ProjectHeader} from './components/ProjectHeader';
import './styles.css';

export function App() {
  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [docsRoot, setDocsRoot] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileFilter, setFileFilter] = useState<FileFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selected, setSelected] = useState<Finding | null>(null);
  const [error, setError] = useState<string | null>(null);

  const files = useMemo(
    () => [...(result?.checkedFilePaths ?? [])].sort(),
    [result],
  );

  const findingsForFile = useMemo(
    () => (result?.findings ?? []).filter((finding) =>
      fileFilter === 'all' || finding.file === fileFilter),
    [result, fileFilter],
  );

  const visibleFindings = useMemo(
    () => findingsForFile.filter((finding) =>
      (severityFilter === 'all' || finding.severity === severityFilter)
      && (categoryFilter === 'all' || finding.category === categoryFilter),
    ),
    [findingsForFile, severityFilter, categoryFilter],
  );

  const severityCounts = useMemo(() => {
    const findings = findingsForFile.filter((finding) =>
      categoryFilter === 'all' || finding.category === categoryFilter,
    );
    const count = (severity: Severity) =>
      findings.filter((finding) => finding.severity === severity).length;

    return {
      all: findings.length,
      error: count('error'),
      warning: count('warning'),
      info: count('info'),
    };
  }, [findingsForFile, categoryFilter]);

  const categoryCounts = useMemo(() => {
    const findings = findingsForFile.filter((finding) =>
      severityFilter === 'all' || finding.severity === severityFilter,
    );
    const count = (category: FindingCategory) =>
      findings.filter((finding) => finding.category === category).length;

    return {
      all: findings.length,
      structure: count('structure'),
      style: count('style'),
      terminology: count('terminology'),
      markdown: count('markdown'),
      links: count('links'),
    };
  }, [findingsForFile, severityFilter]);

  useEffect(() => {
    if (selected && visibleFindings.includes(selected)) return;
    setSelected(visibleFindings[0] ?? null);
  }, [visibleFindings, selected]);

  function clearReviewState() {
    setResult(null);
    setSelected(null);
    setFileFilter('all');
    setSeverityFilter('all');
    setCategoryFilter('all');
    setError(null);
  }

  async function selectProject() {
    try {
      const selection = await window.reviewer.selectProject();
      if (!selection) return;

      setProjectRoot(selection.projectRoot);
      setDocsRoot(selection.suggestedDocsRoot);
      clearReviewState();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function selectDocsRoot() {
    if (!projectRoot) return;

    try {
      const selectedPath = await window.reviewer.selectDocsRoot(projectRoot);
      if (!selectedPath) return;

      setDocsRoot(selectedPath);
      clearReviewState();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function runReview() {
    if (!projectRoot || !docsRoot) return;

    setLoading(true);
    setError(null);

    try {
      const previousFile = fileFilter;
      const next = await window.reviewer.reviewProject(projectRoot, docsRoot);
      const nextFile = previousFile !== 'all' && next.checkedFilePaths.includes(previousFile)
        ? previousFile
        : 'all';

      setResult(next);
      setFileFilter(nextFile);
      setSeverityFilter('all');
      setCategoryFilter('all');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  async function refreshSelectedFile() {
    if (!projectRoot || !docsRoot || fileFilter === 'all' || !result) return;

    const file = fileFilter;
    setLoading(true);
    setError(null);

    try {
      const refreshed = await window.reviewer.reviewFile(projectRoot, docsRoot, file);
      setResult((current) => {
        if (!current) return current;

        return {
          ...current,
          findings: sortFindings([
            ...current.findings.filter((finding) => finding.file !== file),
            ...refreshed.findings,
          ]),
        };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <ProjectHeader
        projectRoot={projectRoot}
        docsRoot={docsRoot}
        loading={loading}
        onSelectProject={selectProject}
        onSelectDocsRoot={selectDocsRoot}
        onReview={runReview}
      />

      {error && <div role="alert" className="error-banner">{error}</div>}

      {result && (
        <>
          <section className="summary">
            <span>Проверено: {result.checkedFiles}</span>
            <span>Замечаний: {result.findings.length}</span>
          </section>

          <Filters
            fileValue={fileFilter}
            files={files}
            severityValue={severityFilter}
            categoryValue={categoryFilter}
            severityCounts={severityCounts}
            categoryCounts={categoryCounts}
            onFileChange={setFileFilter}
            onRefreshFile={refreshSelectedFile}
            refreshingFile={loading}
            onSeverityChange={setSeverityFilter}
            onCategoryChange={setCategoryFilter}
          />

          {visibleFindings.length === 0 ? (
            <section className="workspace workspace-empty">
              <div className="empty-state">Замечаний не найдено</div>
            </section>
          ) : (
            <section className="workspace">
              <FindingsList
                findings={visibleFindings}
                selected={selected}
                onSelect={setSelected}
              />
              <FindingDetails finding={selected} />
            </section>
          )}
        </>
      )}
    </main>
  );
}
