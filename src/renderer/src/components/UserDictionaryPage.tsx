import {useEffect, useState} from 'react';
import type {FormEvent} from 'react';

type DictionaryApi = {
  getUserWords(): Promise<string[]>;
  setUserWords(words: string[]): Promise<string[]>;
};

const dictionary = (window.reviewer as typeof window.reviewer & DictionaryApi);
const VALID_WORD = /^[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*$/u;

export function UserDictionaryPage() {
  const [words, setWords] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void dictionary.getUserWords().then(setWords).catch((cause: unknown) => setError(String(cause)));
  }, []);

  async function save(next: string[]) {
    setBusy(true);
    setError('');
    try {
      setWords(await dictionary.setUserWords(next));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function addWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const word = input.trim().toLocaleLowerCase('ru-RU');
    if (!VALID_WORD.test(word) || word.length > 80) {
      setError('Введите одно русское слово (можно через дефис).');
      return;
    }
    if (words.includes(word)) {
      setError('Это слово уже добавлено.');
      return;
    }
    void save([...words, word]);
    setInput('');
  }

  return <section className="reference-page" aria-label="Пользовательский словарь">
    <h2>Пользовательский словарь</h2>
    <p className="reference-muted">Добавленные слова не будут считаться опечатками при следующей проверке текста. Словоформы добавляются отдельно. Словарь хранится в настройках приложения, не в проекте.</p>
    <form className="reference-controls" onSubmit={addWord}>
      <input aria-label="Новое слово" placeholder="Например, датакаталоге" value={input} onChange={(event) => setInput(event.target.value)} disabled={busy} />
      <button type="submit" disabled={busy}>Добавить</button>
    </form>
    {error && <p role="alert" className="error-banner">{error}</p>}
    <p className="reference-muted">Слов в словаре: {words.length}</p>
    <div className="user-dictionary-list">
      {words.length === 0 && <p className="reference-muted">Словарь пока пуст.</p>}
      {words.map((word) => <div className="user-dictionary-row" key={word}>
        <span>{word}</span>
        <button type="button" disabled={busy} onClick={() => void save(words.filter((item) => item !== word))}>Удалить</button>
      </div>)}
    </div>
  </section>;
}
