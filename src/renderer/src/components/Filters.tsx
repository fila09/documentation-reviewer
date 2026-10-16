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
  onRefreshFile(): void;
  refreshingFile?: boolean;
  onSeverityChange(value: SeverityFilter): void;
  onCategoryChange(value: CategoryFilter): void;
}

const categoryLabels: Record<FindingCategory, string> = {
  structure: 'Структура',
  style: 'Стиль',
  terminology: 'Терминология',
  markdown: 'Markdown',
  links: 'Ссылки',
  text: 'Текст',
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
  onRefreshFile,
  refreshingFile = false,
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
        <button
          type="button"
          className="file-refresh-button"
          aria-label="Проверить файл повторно"
          title="Проверить файл повторно"
          disabled={fileValue === 'all' || refreshingFile}
          onClick={onRefreshFile}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
            <path d="M23 4V10H17" />
            <path d="M20.4899 15C19.8399 16.8399 18.6094 18.4187 16.984 19.4985C15.3586 20.5783 13.4263 21.1006 11.4783 20.9866C9.53026 20.8726 7.67203 20.1286 6.18363 18.8667C4.69524 17.6047 3.6573 15.8932 3.22625 13.9901C2.79519 12.0869 2.99436 10.0952 3.79374 8.31508C4.59313 6.53496 5.94942 5.06288 7.65823 4.12065C9.36705 3.17843 11.3358 2.81711 13.2678 3.09116C15.1999 3.3652 16.9905 4.25975 18.3699 5.64001L22.9999 10" />
          </svg>
        </button>
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
              onClick={() => onCategoryChange(category)}
            >
              {categoryLabel(category)} {count}
            </button>
          );
        })}
      </nav>
    </section>
  );
}
