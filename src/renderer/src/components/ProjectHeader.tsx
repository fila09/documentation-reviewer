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
        <h1>Documentation Reviewer</h1>
        <div className="path-row">
          <span className="path-label">Проект</span>
          <span className="project-path">{projectRoot ?? 'Проект не выбран'}</span>
        </div>
        <div className="path-row">
          <span className="path-label">Документация</span>
          <span className="project-path">{docsRoot ?? 'Папка документации не выбрана'}</span>
          {projectRoot && (
            <button className="inline-action" onClick={onSelectDocsRoot} disabled={loading}>
              {docsRoot ? 'Изменить' : 'Выбрать'}
            </button>
          )}
        </div>
      </div>
      <div className="actions">
        <button onClick={onSelectProject} disabled={loading}>Выбрать проект</button>
        <button onClick={onReview} disabled={!projectRoot || !docsRoot || loading}>
          {loading ? 'Проверяем…' : 'Проверить проект'}
        </button>
      </div>
    </header>
  );
}
