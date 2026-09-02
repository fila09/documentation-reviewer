import type {Severity} from '../../../engine/types';

export type SeverityFilter = 'all' | Severity;

interface Props {
  value: SeverityFilter;
  counts: {all: number; error: number; warning: number; info: number};
  onChange(value: SeverityFilter): void;
}

export function Filters({value, counts, onChange}: Props) {
  return (
    <nav className="filters" aria-label="Фильтры замечаний">
      {([
        ['all', `Все ${counts.all}`],
        ['error', `Ошибки ${counts.error}`],
        ['warning', `Предупреждения ${counts.warning}`],
        ['info', `Информация ${counts.info}`],
      ] as const).map(([key, label]) => (
        <button
          key={key}
          className={value === key ? 'active' : ''}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
