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

  async function selectProject() {
    try {
      const selectedPath = await window.reviewer.selectProject();
      if (!selectedPath) return;

      setProjectRoot(selectedPath);
      setResult(null);
      setSelected(null);
      setFilter('all');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function runReview() {
    if (!projectRoot) return;

    setLoading(true);
    setError(null);

    try {
      const next = await window.reviewer.reviewProject(projectRoot);
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
        loading={loading}
        onSelect={selectProject}
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
