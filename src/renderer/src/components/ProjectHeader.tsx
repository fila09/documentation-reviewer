interface Props {
  projectRoot: string | null;
  loading: boolean;
  onSelect(): void;
  onReview(): void;
}

export function ProjectHeader({projectRoot, loading, onSelect, onReview}: Props) {
  return (
    <header className="project-header">
      <div>
        <h1>Documentation Reviewer</h1>
        <div className="project-path">{projectRoot ?? 'Проект не выбран'}</div>
      </div>
      <div className="actions">
        <button onClick={onSelect} disabled={loading}>Выбрать</button>
        <button onClick={onReview} disabled={!projectRoot || loading}>
          {loading ? 'Проверяем…' : 'Проверить проект'}
        </button>
      </div>
    </header>
  );
}
