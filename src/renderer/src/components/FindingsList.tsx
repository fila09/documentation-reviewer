import type {Finding} from '../../../engine/types';

interface Props {
  findings: Finding[];
  selected: Finding | null;
  onSelect(finding: Finding): void;
}

export function FindingsList({findings, selected, onSelect}: Props) {
  if (findings.length === 0) {
    return <div className="empty-state">Замечаний нет.</div>;
  }

  return (
    <div className="findings-list">
      {findings.map((finding, index) => (
        <button
          key={`${finding.ruleId}:${finding.file}:${finding.line}:${index}`}
          className={selected === finding ? 'finding selected' : 'finding'}
          onClick={() => onSelect(finding)}
        >
          <span className={`severity ${finding.severity}`}>
            {finding.severity === 'error' ? 'Ошибка' : finding.severity === 'warning' ? 'Предупреждение' : 'Информация'}
          </span>
          <strong>{finding.file} · {finding.line}</strong>
          <span>{finding.title}</span>
        </button>
      ))}
    </div>
  );
}
