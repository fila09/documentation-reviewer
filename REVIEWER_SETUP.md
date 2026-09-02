# Documentation Reviewer v0.1

## Что делает версия v0.1

Приложение анализирует только каталог `docs/ru` и ничего не изменяет в исходной документации.

Проверки:

- битая локальная ссылка на Markdown-файл;
- ссылка на несуществующий явный якорь;
- дублирующийся явный якорь `{#anchor}`;
- пустая ссылка;
- нежелательная формулировка из `reviewer.config.json`.

Изображения, AI/LLM, GitLab и автоисправления в v0.1 не используются.

## Первый запуск

Требуется Node.js и npm.

```bash
npm install
npm run reviewer:dev
```

После установки зависимостей `npm install` также обновит `package-lock.json`, потому что новые зависимости ревьюера были добавлены в `package.json`.

## Проверки

```bash
npm run reviewer:test
npm run reviewer:build
npm run build:docs
```

Контрольный fixture находится в `tests/fixtures/five-findings-project` и должен возвращать ровно пять замечаний.

## Настройка

Корневой каталог документации задается в `reviewer.config.json`:

```json
{
  "docsRoot": "docs/ru",
  "undesirablePhrases": [
    {
      "phrase": "осуществить настройку",
      "replacement": "настроить"
    }
  ]
}
```
