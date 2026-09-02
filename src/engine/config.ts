import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {ReviewerConfig} from './types';

export async function loadConfig(projectRoot: string): Promise<ReviewerConfig> {
  const configPath = join(projectRoot, 'reviewer.config.json');
  let raw: string;

  try {
    raw = await readFile(configPath, 'utf8');
  } catch {
    throw new Error('Файл reviewer.config.json не найден в выбранном проекте.');
  }

  const config = JSON.parse(raw) as ReviewerConfig;

  if (config.docsRoot !== 'docs/ru') {
    throw new Error('Версия v0.1 поддерживает только область docs/ru.');
  }

  if (!Array.isArray(config.undesirablePhrases)) {
    throw new Error('В reviewer.config.json поле undesirablePhrases должно быть массивом.');
  }

  return config;
}
