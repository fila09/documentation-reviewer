import {useMemo, useState} from 'react';
import {reviewRules, terminology} from '../data/terminology';

export function TerminologyPage() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [selected, setSelected] = useState(terminology[0].term);
  const matches = useMemo(() => terminology.filter((item) =>
    (kind === 'all' || item.kind === kind)
    && [item.term, item.definition, item.variants ?? '', item.category].join(' ').toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru').trim()),
  ), [query, kind]);
  const current = matches.find((item) => item.term === selected) ?? matches[0];

  return <section className="reference-page" aria-label="Словарь терминов">
    <h2>Словарь терминов</h2>
    <p className="reference-muted">Справочник принятых написаний. Пока записи доступны только для просмотра и не изменяют правила проверки.</p>
    <div className="reference-controls">
      <input aria-label="Поиск терминов" placeholder="Поиск термина, определения или варианта написания" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Тип термина" value={kind} onChange={(event) => setKind(event.target.value)}>
        <option value="all">Все термины</option>
        <option value="Допустимый">Допустимые</option>
        <option value="Рекомендуемый">Рекомендуемые</option>
      </select>
    </div>
    <div className="reference-columns">
      <div className="reference-list" aria-label="Список терминов">
        {matches.length === 0 && <p className="reference-muted">Термины не найдены.</p>}
        {matches.map((item) => <button key={item.term} type="button" className={current?.term === item.term ? 'reference-term active' : 'reference-term'} onClick={() => setSelected(item.term)}>
          <strong>{item.term}</strong><span>{item.category} · {item.kind}</span>
        </button>)}
      </div>
      <article className="reference-detail">
        {current ? <>
          <h3>{current.term}</h3>
          <p className="reference-muted">{current.category} · {current.kind}</p>
          <p>{current.definition}</p>
          <h4>Рекомендуемое написание</h4><p>{current.preferred}</p>
          {current.variants && <><h4>Нежелательные или ошибочные варианты</h4><p>{current.variants}</p></>}
          {current.note && <p className="reference-note">{current.note}</p>}
        </> : <p className="reference-muted">Выберите термин из списка.</p>}
      </article>
    </div>
  </section>;
}

export function RulesPage() {
  return <section className="reference-page" aria-label="Правила проверки">
    <h2>Правила проверки</h2>
    <p className="reference-muted">Краткий справочник по направлениям проверки. Точный перечень активных правил зависит от версии приложения.</p>
    <div className="reference-rules">{reviewRules.map((rule) => <article key={rule.title} className="reference-rule"><h3>{rule.title}</h3><p>{rule.description}</p></article>)}</div>
  </section>;
}
