import {useMemo, useState} from 'react';
import type {Finding, Severity} from '../../engine/types';
import type {ReviewResult} from '../../engine/reviewProject';
import {FindingDetails} from './components/FindingDetails';
import {FindingsList} from './components/FindingsList';
import {Filters, type SeverityFilter} from './components/Filters';
import {ProjectHeader} from './components/ProjectHeader';
import './styles.css';

export function App() {
  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [docsRoot, setDocsRoot] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [selected, setSelected] = useState<Finding | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleFindings = useMemo(
    () => result?.findings.filter((finding) =>
      filter === 'all' || finding.severity === filter,
    ) ?? [],
    [result, filter],
  );

  const counts = useMemo(() => {
    const findings = result?.findings ?? [];
    const count = (severity: Severity) =>
      findings.filter((finding) => finding.severity === severity).length;

    return {
      all: findings.length,
      error: count('error'),
      warning: count('warning'),
      info: count('info'),
    };
  }, [result]);

  function clearReviewState() {
    setResult(null);
    setSelected(null);
    setFilter('all');
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
      const next = await window.reviewer.reviewProject(projectRoot, docsRoot);
      setResult(next);
      setSelected(next.findings[0] ?? null);
      setFilter('all');
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

          <Filters value={filter} counts={counts} onChange={setFilter} />

          <section className="workspace">
            <FindingsList
              findings={visibleFindings}
              selected={selected}
              onSelect={setSelected}
            />
            <FindingDetails finding={selected} />
          </section>
        </>
      )}
    </main>
  );
}
