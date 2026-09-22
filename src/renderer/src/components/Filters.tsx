import type {FindingCategory, Severity} from '../../../engine/types';

export type SeverityFilter = 'all' | Severity;
export type CategoryFilter = 'all' | FindingCategory;
export type FileFilter = 'all' | string;

interface Props {
  fileValue: FileFilter;
  files: string[];
  severityValue: SeverityFilter;
  categoryValue: CategoryFilter;
  severityCounts: {all: number; error: number; warning: number; info: number};
  categoryCounts: {all: number} & Record<FindingCategory, number>;
  onFileChange(value: FileFilter): void;
  onSeverityChange(value: SeverityFilter): void;
  onCategoryChange(value: CategoryFilter): void;
}

const categoryLabels: Record<FindingCategory, string> = {
  structure: 'Структура',
  style: 'Стиль',
  terminology: 'Терминология',
  markdown: 'Markdown',
  links: 'Ссылки',
};

export function categoryLabel(category: FindingCategory): string {
  return categoryLabels[category];
}

export function Filters({
  fileValue,
  files,
  severityValue,
  categoryValue,
  severityCounts,
  categoryCounts,
  onFileChange,
  onSeverityChange,
  onCategoryChange,
}: Props) {
  return (
    <section className="filter-groups" aria-label="Фильтры замечаний">
      <div className="file-filter">
        <label htmlFor="finding-file-filter">Файл</label>
        <select
          id="finding-file-filter"
          value={fileValue}
          onChange={(event) => onFileChange(event.target.value)}
        >
          <option value="all">Все файлы</option>
          {files.map((file) => <option key={file} value={file}>{file}</option>)}
        </select>
      </div>
      <nav className="filters severity-filters" aria-label="По уровню">
        {([
          ['all', `Все ${severityCounts.all}`],
          ['error', `Ошибки ${severityCounts.error}`],
          ['warning', `Предупреждения ${severityCounts.warning}`],
          ['info', `Информация ${severityCounts.info}`],
        ] as const).map(([key, label]) => {
          const count = severityCounts[key];
          const disabled = key !== 'all' && count === 0;
          return (
            <button
              key={key}
              className={`${severityValue === key ? 'active' : ''} severity-filter ${key}`.trim()}
              disabled={disabled}
              onClick={() => onSeverityChange(key)}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <nav className="filters category-filters" aria-label="По категории">
        <button
          className={categoryValue === 'all' ? 'active' : ''}
          onClick={() => onCategoryChange('all')}
        >
          Все категории {categoryCounts.all}
        </button>
        {(Object.keys(categoryLabels) as FindingCategory[]).map((category) => {
          const count = categoryCounts[category];
          return (
            <button
              key={category}
              className={categoryValue === category ? 'active' : ''}
              disabled={count === 0}
              onClick={() => onCategoryChange(
                categoryValue === category ? 'all' : category,
              )}
            >
              {categoryLabels[category]} {count}
            </button>
          );
        })}
      </nav>
    </section>
  );
}
