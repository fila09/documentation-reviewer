import type {Finding} from '../../../engine/types';
import {categoryLabel} from './Filters';

interface Props {
  findings: Finding[];
  selected: Finding | null;
  onSelect(finding: Finding): void;
}

export function FindingsList({findings, selected, onSelect}: Props) {
  if (findings.length === 0) {
    return <div className="empty-state">Замечаний не найдено</div>;
  }

  return (
    <div className="findings-list">
      {findings.map((finding, index) => (
        <button
          key={`${finding.ruleId}:${finding.file}:${finding.line}:${index}`}
          className={`finding severity-${finding.severity}${selected === finding ? ' selected' : ''}`}
          onClick={() => onSelect(finding)}
        >
          <div className="finding-meta">
            <span className={`severity ${finding.severity}`}>
              {finding.severity === 'error' ? 'Ошибка' : finding.severity === 'warning' ? 'Предупреждение' : 'Информация'}
            </span>
            <span className="category-badge">{categoryLabel(finding.category)}</span>
          </div>
          <strong>{finding.file} · {finding.line}</strong>
          <span>{finding.title}</span>
        </button>
      ))}
    </div>
  );
}
