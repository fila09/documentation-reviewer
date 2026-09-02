import type {Finding} from '../../../engine/types';
import {categoryLabel} from './Filters';

export function FindingDetails({finding}: {finding: Finding | null}) {
  if (!finding) {
    return <div className="empty-state">Выберите замечание слева.</div>;
  }

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
      <pre><code>{finding.source}</code></pre>

      <h3>Рекомендация</h3>
      <p>{finding.recommendation}</p>

      <div className="rule-id">Правило: {finding.ruleId}</div>
    </article>
  );
}
