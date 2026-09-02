import type {Finding} from '../../../engine/types';

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
    <article className="finding-details">
      <h2>{finding.title}</h2>
      <p><strong>{finding.file} · строка {finding.line}</strong></p>
      <p className={`severity ${finding.severity}`}>{severityLabel}</p>

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
