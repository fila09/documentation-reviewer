import type {ReactNode} from 'react';
import type {Finding, SourceHighlight} from '../../../engine/types';
import {categoryLabel} from './Filters';

function HighlightedSource({source, highlights}: {source: string; highlights?: SourceHighlight[]}) {
  if (!highlights?.length) return <>{source}</>;

  const sorted = [...highlights]
    .filter(({start, end}) => start >= 0 && end > start && end <= source.length)
    .sort((a, b) => a.start - b.start);

  const nodes: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach(({start, end}, index) => {
    if (start > cursor) nodes.push(source.slice(cursor, start));
    nodes.push(<mark className="source-highlight" key={`${start}-${end}-${index}`}>{source.slice(start, end)}</mark>);
    cursor = Math.max(cursor, end);
  });

  if (cursor < source.length) nodes.push(source.slice(cursor));
  return <>{nodes}</>;
}

export function FindingDetails({finding}: {finding: Finding | null}) {
  if (!finding) return null;

  const severityLabel =
    finding.severity === 'error'
      ? 'Ошибка'
      : finding.severity === 'warning'
        ? 'Предупреждение'
        : 'Информация';

  return (
    <article className={`finding-details severity-${finding.severity}`}>
      <div className="finding-meta">
        <span className={`severity ${finding.severity}`}>{severityLabel}</span>
        <span className="category-badge">{categoryLabel(finding.category)}</span>
      </div>
      <h2>{finding.title}</h2>
      <p><strong>{finding.file} · строка {finding.line}</strong></p>

      <h3>Проблема</h3>
      <p>{finding.message}</p>

      <h3>Фрагмент</h3>
      <pre><code><HighlightedSource source={finding.source} highlights={finding.highlights} /></code></pre>

      <h3>Рекомендация</h3>
      <p>{finding.recommendation}</p>

      <div className="rule-id">Правило: {finding.ruleId}</div>
    </article>
  );
}
