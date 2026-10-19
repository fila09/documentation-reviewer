import {app} from 'electron';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';

const WORD_PATTERN = /^[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*$/u;
const normalize = (word: string) => word.trim().toLocaleLowerCase('ru-RU');
const dictionaryPath = () => join(app.getPath('userData'), 'user-dictionary.json');

export async function readUserWords(): Promise<string[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(dictionaryPath(), 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((word): word is string =>
      typeof word === 'string' && WORD_PATTERN.test(word) && word.length <= 80
    ).map(normalize))].sort((a, b) => a.localeCompare(b, 'ru'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function updateUserWords(words: unknown): Promise<string[]> {
  if (!Array.isArray(words) || words.length > 5000 ||
      !words.every((word) => typeof word === 'string' && word.length <= 80 && WORD_PATTERN.test(word.trim()))) {
    throw new Error('Допустимы только русские слова (до 80 символов).');
  }
  const normalized = [...new Set((words as string[]).map(normalize))].sort((a, b) => a.localeCompare(b, 'ru'));
  await mkdir(app.getPath('userData'), {recursive: true});
  await writeFile(dictionaryPath(), JSON.stringify(normalized, null, 2) + '\n', 'utf8');
  return normalized;
}
