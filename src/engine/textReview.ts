import type {ParsedDocument} from './parser';
import {terminology, termVariants} from '../shared/terminology';
import type {Finding} from './types';
import aff from './dictionaries/ru_RU.aff?raw';
import dic from './dictionaries/ru_RU.dic?raw';

interface SpellChecker {
  add(word: string): void;
  correct(word: string): boolean;
  suggest(word: string): string[];
}

let spellPromise: Promise<SpellChecker> | null = null;

async function createSpellChecker(): Promise<SpellChecker> {
  const {default: nspell} = await import('nspell');
  const spell = nspell({aff, dic}) as SpellChecker;

  // Небольшой встроенный словарь терминов ДокРевью. Его можно расширять
  // по результатам реальной работы, не изменяя основной русский словарь.
  for (const word of [...new Set(['ДокРевью', 'Диплодок', 'слабоструктурированный', ...terminology.filter((entry) => entry.kind === 'Допустимый').flatMap((entry) => entry.preferred.split(',').map((word) => word.trim()))])]) {
    spell.add(word);
  }

  return spell;
}

async function getSpellChecker(): Promise<SpellChecker> {
  spellPromise ??= createSpellChecker();
  return spellPromise;
}

const TOKEN_PATTERN = /[\p{L}\p{N}_-]+/gu;
const RUSSIAN_WORD_PATTERN = /^[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*$/u;
const TERM_VARIANTS = new Map(termVariants.map((entry) => [entry.value.toLocaleLowerCase('ru-RU'), entry]));
const UPPERCASE_ABBREVIATION = /^[А-ЯЁ]{2,}$/u;

function blank(value: string): string {
  return ' '.repeat(value.length);
}

function maskNonProse(line: string): string {
  let result = line;

  // Parser уже маскирует inline/fenced code. Здесь убираем то, что похоже
  // на служебный Markdown/YFM, адреса и пути, сохраняя длину строки.
  const patterns = [
    /\{\{[^}]*\}\}/g,
    /\{%[^%]*%\}/g,
    /https?:\/\/\S+/gi,
    /(?:[\p{L}\p{N}_.-]+[\\/])+[\p{L}\p{N}_.-]+/gu,
  ];

  for (const pattern of patterns) {
    result = result.replace(pattern, blank);
  }

  // В Markdown-ссылках проверяем видимый текст, но не target.
  result = result.replace(/(!?\[[^\]]*\])\(([^)]*)\)/g, (_match, label: string, target: string) =>
    `${label}(${blank(target)})`,
  );

  return result;
}

function shouldCheckWord(word: string): boolean {
  if (!RUSSIAN_WORD_PATTERN.test(word)) return false;
  if (word.length < 2) return false;
  if (UPPERCASE_ABBREVIATION.test(word)) return false;

  // Внутренняя заглавная буква обычно означает название/термин, например ДокРевью.
  if (/[а-яё][А-ЯЁ]/u.test(word)) return false;

  return true;
}

function isCorrect(spell: SpellChecker, word: string): boolean {
  const lower = word.toLocaleLowerCase('ru-RU');
  if (spell.correct(word) || spell.correct(lower)) return true;

  if (!lower.includes('-')) return false;
  // Частицы и составные обозначения проверяем по составляющим.
  // Для частиц -то/-либо/-нибудь проверяем основу.
  const parts = lower.split('-');
  const particles = new Set(['то', 'либо', 'нибудь']);
  return parts.every((part, index) =>
    index > 0 && particles.has(part) || spell.correct(part),
  );
}

function recommendationFor(_spell: SpellChecker, word: string): string {
  // Не выдаём случайные похожие слова как уверенные исправления.
  return `Проверьте написание слова «${word}».`;
}

export async function reviewRussianSpelling(documents: ParsedDocument[], userWords: readonly string[] = []): Promise<Finding[]> {
  const spell = await getSpellChecker();
  const findings: Finding[] = [];
  const allowedWords = new Set(userWords.map((word) => word.toLocaleLowerCase('ru-RU')));

  for (const document of documents) {
    const sourceLines = document.file.content.split(/\r?\n/);

    document.lines.forEach((analysisLine, index) => {
      const prose = maskNonProse(analysisLine);
      const source = sourceLines[index] ?? analysisLine;

      for (const match of prose.matchAll(TOKEN_PATTERN)) {
        const word = match[0];
        if (!shouldCheckWord(word)) continue;
        const start = match.index ?? 0;
        const variant = TERM_VARIANTS.get(word.toLocaleLowerCase('ru-RU'));
        if (variant) {
          findings.push({
            ruleId: variant.category === 'style' ? 'terminology-style' : 'terminology-variant',
            category: variant.category,
            severity: 'warning',
            file: document.file.relativePath,
            line: index + 1,
            title: variant.category === 'style' ? 'Нежелательный вариант термина' : 'Ошибка в термине',
            message: `Найден вариант «${word}».`,
            source,
            recommendation: `Используйте «${variant.replacement}».`,
            highlights: [{start, end: start + word.length}],
          });
          continue;
        }
        if (allowedWords.has(word.toLocaleLowerCase('ru-RU')) || isCorrect(spell, word)) continue;
        findings.push({
          ruleId: 'russian-spelling',
          category: 'text',
          severity: 'warning',
          file: document.file.relativePath,
          line: index + 1,
          title: 'Возможная опечатка',
          message: `Слово «${word}» не найдено в русском словаре.`,
          source,
          recommendation: recommendationFor(spell, word),
          highlights: [{start, end: start + word.length}],
        });
      }
    });
  }

  return findings;
}
