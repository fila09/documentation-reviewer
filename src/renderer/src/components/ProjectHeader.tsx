interface Props {
  projectRoot: string | null;
  docsRoot: string | null;
  loading: boolean;
  onSelectProject(): void;
  onSelectDocsRoot(): void;
  onReview(): void;
}

export function ProjectHeader({
  projectRoot,
  docsRoot,
  loading,
  onSelectProject,
  onSelectDocsRoot,
  onReview,
}: Props) {
  return (
    <header className="project-header">
      <div className="project-info">
        <h1>ДокРевью</h1>
        <p className="app-subtitle">Проверка технической документации</p>
        <div className="path-row">
          <span className="path-label">Проект</span>
          <span className="project-path" title={projectRoot ?? undefined}>{projectRoot ?? 'Проект не выбран'}</span>
        </div>
        <div className="path-row">
          <span className="path-label">Документация</span>
          <span className="project-path" title={docsRoot ?? undefined}>{docsRoot ?? 'Папка документации не выбрана'}</span>
        </div>
      </div>
      <div className="header-actions">
        <div className="secondary-actions">
          <button onClick={onSelectProject} disabled={loading}>Выбрать проект</button>
          <button onClick={onSelectDocsRoot} disabled={!projectRoot || loading}>
            {docsRoot ? 'Изменить папку' : 'Выбрать папку'}
          </button>
        </div>
        <button
          className="primary-action"
          onClick={onReview}
          disabled={!projectRoot || !docsRoot || loading}
        >
          {loading ? 'Проверяем…' : 'Проверить проект'}
        </button>
      </div>
    </header>
  );
}
