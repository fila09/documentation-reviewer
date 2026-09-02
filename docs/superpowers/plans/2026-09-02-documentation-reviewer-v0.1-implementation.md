# Documentation Reviewer v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в существующий `diplodoc-example` локальное Windows-приложение, которое анализирует только `docs/ru` и показывает пять типов замечаний без изменения исходной документации и без сетевых обращений.

**Architecture:** Electron отвечает за desktop-оболочку, системный выбор папки и доступ к файловой системе; React отображает двухпанельный интерфейс. Независимый TypeScript Review Engine сканирует Markdown-файлы, извлекает ссылки/явные якоря/текст и запускает правила, возвращающие единый `Finding[]`.

**Tech Stack:** Electron, electron-vite, React, TypeScript, Vite, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-02-documentation-reviewer-v0.1-design.md`

## Global Constraints

- Анализируется только `docs/ru`.
- `docs/en` полностью игнорируется.
- Исходные Markdown-файлы открываются только для чтения.
- Приложение не выполняет сетевые запросы.
- AI/LLM отсутствует.
- Автоисправления отсутствуют.
- Рабочие файлы `docs/ru` не используются как намеренно сломанные test fixtures.
- Ошибка одного правила или одного файла не должна аварийно завершать весь анализ.
- Первые правила: `broken-local-link`, `missing-anchor`, `duplicate-explicit-anchor`, `empty-link`, `undesirable-phrase`.
- Для `missing-anchor` проверка выполняется только если целевой Markdown-файл существует, чтобы одна ссылка не создавала одновременно `broken-local-link` и `missing-anchor`.
- Дублирующийся якорь создает Finding на втором и каждом последующем объявлении, а первое объявление считается исходным.

---

## Target File Structure

```text
diplodoc-example/
├── electron.vite.config.ts
├── vitest.config.ts
├── reviewer.config.json
├── package.json
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   └── ipc.ts
│   ├── preload/
│   │   └── index.ts
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── main.tsx
│   │       ├── styles.css
│   │       └── components/
│   │           ├── FindingDetails.tsx
│   │           ├── FindingsList.tsx
│   │           ├── Filters.tsx
│   │           └── ProjectHeader.tsx
│   ├── engine/
│   │   ├── config.ts
│   │   ├── parser.ts
│   │   ├── reporter.ts
│   │   ├── reviewProject.ts
│   │   ├── scanner.ts
│   │   ├── types.ts
│   │   └── rules/
│   │       ├── brokenLocalLink.ts
│   │       ├── duplicateExplicitAnchor.ts
│   │       ├── emptyLink.ts
│   │       ├── index.ts
│   │       ├── missingAnchor.ts
│   │       └── undesirablePhrase.ts
│   └── shared/
│       └── electron-api.d.ts
└── tests/
    ├── fixtures/
    │   ├── clean-project/
    │   └── five-findings-project/
    ├── engine/
    │   ├── parser.test.ts
    │   ├── rules.test.ts
    │   ├── scanner.test.ts
    │   └── reviewProject.test.ts
    └── renderer/
        └── App.test.tsx
```

`docs/ru` остается пользовательской документацией. Все намеренно ошибочные файлы размещаются только в `tests/fixtures`.

---

### Task 1: Add the Electron/React/TypeScript testable shell

**Files:**
- Modify: `package.json`
- Create: `electron.vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/App.tsx`
- Create: `src/shared/electron-api.d.ts`

**Interfaces:**
- Produces: Electron main process, preload bridge `window.reviewer`, React renderer entry point.
- Preserves: existing `start` and `build:docs` Diplodoc scripts.

- [ ] **Step 1: Install application and test dependencies**

Run:

```bash
npm install react react-dom
npm install --save-dev electron electron-vite vite typescript vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/node @types/react @types/react-dom
```

Expected: dependencies are added to `package.json` and `package-lock.json`.

- [ ] **Step 2: Add reviewer scripts without removing Diplodoc scripts**

Add these scripts to `package.json`:

```json
{
  "reviewer:dev": "electron-vite dev",
  "reviewer:build": "electron-vite build",
  "reviewer:test": "vitest run",
  "reviewer:test:watch": "vitest"
}
```

Also set Electron's entry point:

```json
{
  "main": "./out/main/index.js"
}
```

Keep the existing:

```json
{
  "start": "npm run build:docs && node scripts/serve.js",
  "build:docs": "yfm --input docs --output docs-html"
}
```

- [ ] **Step 3: Configure electron-vite**

Create `electron.vite.config.ts`:

```ts
import {defineConfig, externalizeDepsPlugin} from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [react()],
  },
});
```

Create `vitest.config.ts`:

```ts
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create the minimum secure Electron window**

Create `src/main/index.ts`:

```ts
import {app, BrowserWindow} from 'electron';
import {join} from 'node:path';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 5: Create an empty typed preload bridge**

Create `src/preload/index.ts`:

```ts
import {contextBridge} from 'electron';

contextBridge.exposeInMainWorld('reviewer', {});
```

Create `src/shared/electron-api.d.ts`:

```ts
export {};

declare global {
  interface Window {
    reviewer: Record<string, never>;
  }
}
```

- [ ] **Step 6: Create the React entry point**

Create `src/renderer/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import {App} from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/renderer/src/App.tsx`:

```tsx
export function App() {
  return <main>Documentation Reviewer</main>;
}
```

Create `src/renderer/index.html`:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Documentation Reviewer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Verify build and existing docs build**

Run:

```bash
npm run reviewer:build
npm run build:docs
```

Expected: both commands exit with code `0`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json electron.vite.config.ts src
git commit -m "chore: add documentation reviewer shell"
```

If Git identity is still unset, leave the changes staged and record the commit command instead of changing global Git configuration.

---

### Task 2: Define domain types, reviewer configuration, and Markdown scanner

**Files:**
- Create: `reviewer.config.json`
- Create: `src/engine/types.ts`
- Create: `src/engine/config.ts`
- Create: `src/engine/scanner.ts`
- Create: `tests/engine/scanner.test.ts`
- Create: `tests/fixtures/clean-project/reviewer.config.json`
- Create: `tests/fixtures/clean-project/docs/ru/index.md`
- Create: `tests/fixtures/clean-project/docs/en/ignored.md`

**Interfaces:**
- Produces: `ReviewerConfig`, `Finding`, `ProjectFile`, `ScanResult`, `scanMarkdownFiles(projectRoot, config)`.
- `scanMarkdownFiles` returns only `.md` files under the configured `docsRoot`, sorted by relative path, plus diagnostics for individual unreadable files.

- [ ] **Step 1: Write the scanner test**

Create `tests/engine/scanner.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {resolve} from 'node:path';
import {loadConfig} from '../../src/engine/config';
import {scanMarkdownFiles} from '../../src/engine/scanner';

describe('scanMarkdownFiles', () => {
  it('scans only docs/ru and ignores docs/en', async () => {
    const projectRoot = resolve('tests/fixtures/clean-project');
    const config = await loadConfig(projectRoot);
    const result = await scanMarkdownFiles(projectRoot, config);

    expect(result.files.map((file) => file.relativePath)).toEqual(['index.md']);
    expect(result.diagnostics).toEqual([]);
  });
});
```

Create fixture config:

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

Create `tests/fixtures/clean-project/docs/ru/index.md`:

```md
# Тестовый проект

Документация без ошибок.
```

Create `tests/fixtures/clean-project/docs/en/ignored.md`:

```md
# This file must be ignored
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npx vitest run tests/engine/scanner.test.ts
```

Expected: FAIL because `loadConfig` and `scanMarkdownFiles` do not exist.

- [ ] **Step 3: Define shared engine types**

Create `src/engine/types.ts`:

```ts
export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  ruleId: string;
  category: string;
  severity: Severity;
  file: string;
  line: number;
  title: string;
  message: string;
  source: string;
  recommendation: string;
  target?: string;
}

export interface PhraseRule {
  phrase: string;
  replacement: string;
}

export interface ReviewerConfig {
  docsRoot: string;
  undesirablePhrases: PhraseRule[];
}

export interface ProjectFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}
```

- [ ] **Step 4: Add root reviewer configuration**

Create `reviewer.config.json`:

```json
{
  "docsRoot": "docs/ru",
  "undesirablePhrases": [
    {
      "phrase": "осуществить настройку",
      "replacement": "настроить"
    },
    {
      "phrase": "произвести настройку",
      "replacement": "настроить"
    }
  ]
}
```

- [ ] **Step 5: Implement config loading**

Create `src/engine/config.ts`:

```ts
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {ReviewerConfig} from './types';

export async function loadConfig(projectRoot: string): Promise<ReviewerConfig> {
  const raw = await readFile(join(projectRoot, 'reviewer.config.json'), 'utf8');
  const config = JSON.parse(raw) as ReviewerConfig;

  if (config.docsRoot !== 'docs/ru') {
    throw new Error('v0.1 supports only docs/ru');
  }

  return config;
}
```

- [ ] **Step 6: Implement scanner**

Create `src/engine/scanner.ts`:

```ts
import {readdir, readFile, stat} from 'node:fs/promises';
import {join, relative} from 'node:path';
import type {ProjectFile, ReviewerConfig} from './types';

export interface ScanDiagnostic {
  file: string;
  message: string;
}

export interface ScanResult {
  files: ProjectFile[];
  diagnostics: ScanDiagnostic[];
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {withFileTypes: true});
  const result: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push(...await walk(path));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      result.push(path);
    }
  }

  return result;
}

export async function scanMarkdownFiles(
  projectRoot: string,
  config: ReviewerConfig,
): Promise<ScanResult> {
  const docsRoot = join(projectRoot, config.docsRoot);

  try {
    const rootStat = await stat(docsRoot);
    if (!rootStat.isDirectory()) throw new Error('not a directory');
  } catch {
    throw new Error(`Область документации ${config.docsRoot} не найдена.`);
  }

  const paths = await walk(docsRoot);
  const files: ProjectFile[] = [];
  const diagnostics: ScanDiagnostic[] = [];

  for (const absolutePath of paths) {
    const relativePath = relative(docsRoot, absolutePath).replaceAll('\\', '/');

    try {
      files.push({
        absolutePath,
        relativePath,
        content: await readFile(absolutePath, 'utf8'),
      });
    } catch (error) {
      diagnostics.push({
        file: relativePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return {files, diagnostics};
}
```

- [ ] **Step 7: Run scanner test**

Run:

```bash
npx vitest run tests/engine/scanner.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add reviewer.config.json src/engine tests/engine/scanner.test.ts tests/fixtures/clean-project
git commit -m "feat: scan russian documentation scope"
```

---

### Task 3: Parse inline Markdown links and explicit Diplodoc anchors with line numbers

**Files:**
- Create: `src/engine/parser.ts`
- Create: `tests/engine/parser.test.ts`

**Interfaces:**
- Produces: `parseMarkdown(file: ProjectFile): ParsedDocument`.
- `ParsedDocument.links` excludes image syntax `![...]()`.
- Explicit anchors are recognized only in `{#anchor}` syntax for v0.1.

- [ ] **Step 1: Write parser tests**

Create `tests/engine/parser.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {parseMarkdown} from '../../src/engine/parser';

const file = {
  absolutePath: '/tmp/page.md',
  relativePath: 'page.md',
  content: [
    '# Раздел {#section}',
    '',
    '[Рабочая](other.md#target)',
    '[Пустая]()',
    '![](image.png)',
  ].join('\n'),
};

describe('parseMarkdown', () => {
  it('extracts links with one-based line numbers and skips images', () => {
    const parsed = parseMarkdown(file);

    expect(parsed.links).toEqual([
      {
        text: 'Рабочая',
        target: 'other.md#target',
        line: 3,
        source: '[Рабочая](other.md#target)',
      },
      {
        text: 'Пустая',
        target: '',
        line: 4,
        source: '[Пустая]()',
      },
    ]);
  });

  it('extracts explicit anchors', () => {
    const parsed = parseMarkdown(file);

    expect(parsed.anchors).toEqual([
      {
        id: 'section',
        line: 1,
        source: '{#section}',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run parser tests and verify they fail**

Run:

```bash
npx vitest run tests/engine/parser.test.ts
```

Expected: FAIL because parser is missing.

- [ ] **Step 3: Implement the parser**

Create `src/engine/parser.ts`:

```ts
import type {ProjectFile} from './types';

export interface ParsedLink {
  text: string;
  target: string;
  line: number;
  source: string;
}

export interface ParsedAnchor {
  id: string;
  line: number;
  source: string;
}

export interface ParsedDocument {
  file: ProjectFile;
  links: ParsedLink[];
  anchors: ParsedAnchor[];
  lines: string[];
}

export function parseMarkdown(file: ProjectFile): ParsedDocument {
  const lines = file.content.split(/\r?\n/);
  const links: ParsedLink[] = [];
  const anchors: ParsedAnchor[] = [];

  lines.forEach((lineText, index) => {
    const line = index + 1;

    const linkPattern = /(?<!!)\[([^\]]*)\]\(([^)]*)\)/g;
    for (const match of lineText.matchAll(linkPattern)) {
      links.push({
        text: match[1],
        target: match[2].trim(),
        line,
        source: match[0],
      });
    }

    const anchorPattern = /\{#([A-Za-z0-9_-]+)\}/g;
    for (const match of lineText.matchAll(anchorPattern)) {
      anchors.push({
        id: match[1],
        line,
        source: match[0],
      });
    }
  });

  return {file, links, anchors, lines};
}
```

- [ ] **Step 4: Run parser tests**

Run:

```bash
npx vitest run tests/engine/parser.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/parser.ts tests/engine/parser.test.ts
git commit -m "feat: parse markdown review tokens"
```

---

### Task 4: Implement the four deterministic link and anchor rules

**Files:**
- Create: `src/engine/rules/emptyLink.ts`
- Create: `src/engine/rules/brokenLocalLink.ts`
- Create: `src/engine/rules/missingAnchor.ts`
- Create: `src/engine/rules/duplicateExplicitAnchor.ts`
- Create: `src/engine/rules/index.ts`
- Create: `tests/engine/rules.test.ts`

**Interfaces:**
- Consumes: `ParsedDocument[]`.
- Produces: `ReviewRule` and four rules returning `Finding[]`.

- [ ] **Step 1: Define the common rule interface**

Create `src/engine/rules/index.ts`:

```ts
import type {Finding, ReviewerConfig} from '../types';
import type {ParsedDocument} from '../parser';

export interface RuleContext {
  documents: ParsedDocument[];
  config: ReviewerConfig;
}

export interface ReviewRule {
  id: string;
  run(context: RuleContext): Finding[];
}
```

- [ ] **Step 2: Write failing tests for all four rules**

Create `tests/engine/rules.test.ts` with a helper:

```ts
import {describe, expect, it} from 'vitest';
import {parseMarkdown} from '../../src/engine/parser';
import {emptyLinkRule} from '../../src/engine/rules/emptyLink';
import {brokenLocalLinkRule} from '../../src/engine/rules/brokenLocalLink';
import {missingAnchorRule} from '../../src/engine/rules/missingAnchor';
import {duplicateExplicitAnchorRule} from '../../src/engine/rules/duplicateExplicitAnchor';

const config = {docsRoot: 'docs/ru', undesirablePhrases: []};

function doc(relativePath: string, content: string) {
  return parseMarkdown({
    absolutePath: `/project/docs/ru/${relativePath}`,
    relativePath,
    content,
  });
}

describe('deterministic rules', () => {
  it('reports an empty link', () => {
    const findings = emptyLinkRule.run({
      documents: [doc('index.md', '[Подробнее]()')],
      config,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'empty-link',
      severity: 'error',
      file: 'index.md',
      line: 1,
    });
  });

  it('reports a missing local markdown file', () => {
    const findings = brokenLocalLinkRule.run({
      documents: [doc('index.md', '[Страница](missing.md)')],
      config,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].target).toBe('missing.md');
  });

  it('reports a missing anchor only when the target file exists', () => {
    const documents = [
      doc('index.md', '[Раздел](target.md#missing)'),
      doc('target.md', '# Target {#real}'),
    ];

    const findings = missingAnchorRule.run({documents, config});

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'missing-anchor',
      file: 'index.md',
      line: 1,
      target: 'target.md#missing',
    });
  });

  it('reports the second duplicate explicit anchor', () => {
    const documents = [
      doc('a.md', '# A {#same}'),
      doc('b.md', '# B {#same}'),
    ];

    const findings = duplicateExplicitAnchorRule.run({documents, config});

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'duplicate-explicit-anchor',
      file: 'b.md',
      line: 1,
    });
  });
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npx vitest run tests/engine/rules.test.ts
```

Expected: FAIL because rule modules are missing.

- [ ] **Step 4: Implement `empty-link`**

Create `src/engine/rules/emptyLink.ts`:

```ts
import type {ReviewRule} from './index';

export const emptyLinkRule: ReviewRule = {
  id: 'empty-link',
  run({documents}) {
    return documents.flatMap((document) =>
      document.links
        .filter((link) => link.target === '')
        .map((link) => ({
          ruleId: 'empty-link',
          category: 'links',
          severity: 'error' as const,
          file: document.file.relativePath,
          line: link.line,
          title: 'Пустая ссылка',
          message: 'Для ссылки не указан адрес.',
          source: link.source,
          recommendation: 'Укажите адрес ссылки или удалите ссылку.',
        })),
    );
  },
};
```

- [ ] **Step 5: Implement local-target helpers and `broken-local-link`**

Create `src/engine/rules/brokenLocalLink.ts`:

```ts
import {dirname, posix} from 'node:path';
import type {ParsedDocument} from '../parser';
import type {ReviewRule} from './index';

export function isExternalTarget(target: string): boolean {
  return /^(?:https?:|mailto:|tel:|\/\/)/i.test(target);
}

export function splitTarget(target: string): {path: string; anchor?: string} {
  const [path, anchor] = target.split('#', 2);
  return {path, anchor: anchor || undefined};
}

export function resolveRelativeTarget(
  sourceFile: string,
  targetPath: string,
): string {
  if (targetPath === '') return sourceFile;
  return posix.normalize(posix.join(dirname(sourceFile), targetPath));
}

export function documentMap(documents: ParsedDocument[]): Map<string, ParsedDocument> {
  return new Map(documents.map((document) => [document.file.relativePath, document]));
}

export const brokenLocalLinkRule: ReviewRule = {
  id: 'broken-local-link',
  run({documents}) {
    const byPath = documentMap(documents);

    return documents.flatMap((document) =>
      document.links.flatMap((link) => {
        if (!link.target || isExternalTarget(link.target)) return [];

        const {path} = splitTarget(link.target);
        if (!path || !path.toLowerCase().endsWith('.md')) return [];

        const resolved = resolveRelativeTarget(document.file.relativePath, path);
        if (byPath.has(resolved)) return [];

        return [{
          ruleId: 'broken-local-link',
          category: 'links',
          severity: 'error' as const,
          file: document.file.relativePath,
          line: link.line,
          title: 'Битая локальная ссылка',
          message: `Файл ${resolved} не найден в docs/ru.`,
          source: link.source,
          recommendation: 'Проверьте путь к целевой Markdown-странице.',
          target: link.target,
        }];
      }),
    );
  },
};
```

- [ ] **Step 6: Implement `missing-anchor`**

Create `src/engine/rules/missingAnchor.ts`:

```ts
import type {ReviewRule} from './index';
import {
  documentMap,
  isExternalTarget,
  resolveRelativeTarget,
  splitTarget,
} from './brokenLocalLink';

export const missingAnchorRule: ReviewRule = {
  id: 'missing-anchor',
  run({documents}) {
    const byPath = documentMap(documents);

    return documents.flatMap((document) =>
      document.links.flatMap((link) => {
        if (!link.target || isExternalTarget(link.target)) return [];

        const {path, anchor} = splitTarget(link.target);
        if (!anchor) return [];

        const resolved = resolveRelativeTarget(
          document.file.relativePath,
          path || '',
        );
        const targetDocument = byPath.get(resolved);

        // A missing file is owned by broken-local-link.
        if (!targetDocument) return [];

        if (targetDocument.anchors.some((item) => item.id === anchor)) return [];

        return [{
          ruleId: 'missing-anchor',
          category: 'links',
          severity: 'error' as const,
          file: document.file.relativePath,
          line: link.line,
          title: 'Несуществующий якорь',
          message: `Якорь #${anchor} не найден в файле ${resolved}.`,
          source: link.source,
          recommendation: 'Проверьте идентификатор якоря или добавьте его в целевой раздел.',
          target: link.target,
        }];
      }),
    );
  },
};
```

- [ ] **Step 7: Implement `duplicate-explicit-anchor`**

Create `src/engine/rules/duplicateExplicitAnchor.ts`:

```ts
import type {Finding} from '../types';
import type {ReviewRule} from './index';

export const duplicateExplicitAnchorRule: ReviewRule = {
  id: 'duplicate-explicit-anchor',
  run({documents}) {
    const firstById = new Map<string, {file: string; line: number}>();
    const findings: Finding[] = [];

    for (const document of documents) {
      for (const anchor of document.anchors) {
        const first = firstById.get(anchor.id);

        if (!first) {
          firstById.set(anchor.id, {
            file: document.file.relativePath,
            line: anchor.line,
          });
          continue;
        }

        findings.push({
          ruleId: 'duplicate-explicit-anchor',
          category: 'anchors',
          severity: 'error',
          file: document.file.relativePath,
          line: anchor.line,
          title: 'Дублирующийся явный якорь',
          message: `Якорь #${anchor.id} уже объявлен в ${first.file}:${first.line}.`,
          source: anchor.source,
          recommendation: 'Задайте этому разделу уникальный явный якорь.',
          target: `#${anchor.id}`,
        });
      }
    }

    return findings;
  },
};
```

- [ ] **Step 8: Run rule tests**

Run:

```bash
npx vitest run tests/engine/rules.test.ts
```

Expected: all four deterministic rule tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/engine/rules tests/engine/rules.test.ts
git commit -m "feat: add link and anchor review rules"
```

---

### Task 5: Add the configurable undesirable-phrase rule and reporter

**Files:**
- Create: `src/engine/rules/undesirablePhrase.ts`
- Create: `src/engine/reporter.ts`
- Modify: `tests/engine/rules.test.ts`

**Interfaces:**
- Produces: `undesirablePhraseRule`.
- Produces: `sortFindings(findings: Finding[]): Finding[]`.
- Phrase matching is case-insensitive and reports every line containing a configured phrase.

- [ ] **Step 1: Add failing phrase rule test**

Append to `tests/engine/rules.test.ts`:

```ts
import {undesirablePhraseRule} from '../../src/engine/rules/undesirablePhrase';

it('reports an undesirable russian phrase', () => {
  const findings = undesirablePhraseRule.run({
    documents: [
      doc('style.md', 'Необходимо осуществить настройку сервиса.'),
    ],
    config: {
      docsRoot: 'docs/ru',
      undesirablePhrases: [
        {
          phrase: 'осуществить настройку',
          replacement: 'настроить',
        },
      ],
    },
  });

  expect(findings).toHaveLength(1);
  expect(findings[0]).toMatchObject({
    ruleId: 'undesirable-phrase',
    severity: 'warning',
    file: 'style.md',
    line: 1,
  });
  expect(findings[0].recommendation).toContain('настроить');
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npx vitest run tests/engine/rules.test.ts
```

Expected: FAIL because `undesirablePhraseRule` is missing.

- [ ] **Step 3: Implement phrase rule**

Create `src/engine/rules/undesirablePhrase.ts`:

```ts
import type {ReviewRule} from './index';

export const undesirablePhraseRule: ReviewRule = {
  id: 'undesirable-phrase',
  run({documents, config}) {
    return documents.flatMap((document) =>
      document.lines.flatMap((lineText, index) =>
        config.undesirablePhrases.flatMap((phraseRule) => {
          if (!lineText.toLocaleLowerCase('ru-RU')
            .includes(phraseRule.phrase.toLocaleLowerCase('ru-RU'))) {
            return [];
          }

          return [{
            ruleId: 'undesirable-phrase',
            category: 'style',
            severity: 'warning' as const,
            file: document.file.relativePath,
            line: index + 1,
            title: 'Нежелательная формулировка',
            message: `Найдена формулировка «${phraseRule.phrase}».`,
            source: lineText.trim(),
            recommendation: `Рекомендуемый вариант: «${phraseRule.replacement}».`,
          }];
        }),
      ),
    );
  },
};
```

- [ ] **Step 4: Add deterministic sorting**

Create `src/engine/reporter.ts`:

```ts
import type {Finding} from './types';

const severityOrder = {
  error: 0,
  warning: 1,
  info: 2,
} as const;

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity]
    || a.file.localeCompare(b.file)
    || a.line - b.line
    || a.ruleId.localeCompare(b.ruleId),
  );
}
```

- [ ] **Step 5: Run all engine tests**

Run:

```bash
npx vitest run tests/engine
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/rules/undesirablePhrase.ts src/engine/reporter.ts tests/engine/rules.test.ts
git commit -m "feat: add configurable style rule"
```

---

### Task 6: Compose the Review Engine and prove the exact five-finding acceptance case

**Files:**
- Create: `src/engine/reviewProject.ts`
- Modify: `src/engine/rules/index.ts`
- Create: `tests/engine/reviewProject.test.ts`
- Create: `tests/fixtures/five-findings-project/reviewer.config.json`
- Create: `tests/fixtures/five-findings-project/docs/ru/index.md`
- Create: `tests/fixtures/five-findings-project/docs/ru/target.md`
- Create: `tests/fixtures/five-findings-project/docs/ru/duplicate.md`
- Create: `tests/fixtures/five-findings-project/docs/en/ignored.md`

**Interfaces:**
- Produces: `reviewProject(projectRoot: string): Promise<ReviewResult>`.
- `ReviewResult = {projectRoot, docsRoot, checkedFiles, findings, diagnostics}`.
- A rule failure becomes a diagnostic and does not stop other rules.

- [ ] **Step 1: Create the five-known-errors fixture**

Create fixture config:

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

Create `tests/fixtures/five-findings-project/docs/ru/index.md`:

```md
# Главная {#shared-anchor}

[Битая страница](missing.md)

[Несуществующий якорь](target.md#missing-anchor)

[Пустая ссылка]()

Необходимо осуществить настройку сервиса.
```

Create `tests/fixtures/five-findings-project/docs/ru/target.md`:

```md
# Целевая страница {#real-anchor}
```

Create `tests/fixtures/five-findings-project/docs/ru/duplicate.md`:

```md
# Другая страница {#shared-anchor}
```

Create `tests/fixtures/five-findings-project/docs/en/ignored.md`:

```md
[This missing file must not be reported](another-missing.md)
```

Expected findings:
1. `broken-local-link`
2. `missing-anchor`
3. `empty-link`
4. `undesirable-phrase`
5. `duplicate-explicit-anchor`

- [ ] **Step 2: Write the acceptance test**

Create `tests/engine/reviewProject.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {resolve} from 'node:path';
import {reviewProject} from '../../src/engine/reviewProject';

describe('reviewProject', () => {
  it('returns exactly five known findings and ignores docs/en', async () => {
    const result = await reviewProject(
      resolve('tests/fixtures/five-findings-project'),
    );

    expect(result.checkedFiles).toBe(3);
    expect(result.findings).toHaveLength(5);
    expect(result.findings.map((finding) => finding.ruleId).sort()).toEqual([
      'broken-local-link',
      'duplicate-explicit-anchor',
      'empty-link',
      'missing-anchor',
      'undesirable-phrase',
    ]);
    expect(result.findings.every((finding) => finding.line >= 1)).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test and verify failure**

Run:

```bash
npx vitest run tests/engine/reviewProject.test.ts
```

Expected: FAIL because `reviewProject` is missing.

- [ ] **Step 4: Export the rule set**

Update `src/engine/rules/index.ts`:

```ts
import type {Finding, ReviewerConfig} from '../types';
import type {ParsedDocument} from '../parser';
import {brokenLocalLinkRule} from './brokenLocalLink';
import {duplicateExplicitAnchorRule} from './duplicateExplicitAnchor';
import {emptyLinkRule} from './emptyLink';
import {missingAnchorRule} from './missingAnchor';
import {undesirablePhraseRule} from './undesirablePhrase';

export interface RuleContext {
  documents: ParsedDocument[];
  config: ReviewerConfig;
}

export interface ReviewRule {
  id: string;
  run(context: RuleContext): Finding[];
}

export const rules: ReviewRule[] = [
  brokenLocalLinkRule,
  missingAnchorRule,
  duplicateExplicitAnchorRule,
  emptyLinkRule,
  undesirablePhraseRule,
];
```

- [ ] **Step 5: Implement the orchestrator with diagnostics isolation**

Create `src/engine/reviewProject.ts`:

```ts
import {join} from 'node:path';
import {loadConfig} from './config';
import {parseMarkdown} from './parser';
import {sortFindings} from './reporter';
import {rules} from './rules';
import {scanMarkdownFiles} from './scanner';
import type {Finding} from './types';

export interface ReviewDiagnostic {
  source: 'scanner' | 'rule';
  message: string;
  ruleId?: string;
}

export interface ReviewResult {
  projectRoot: string;
  docsRoot: string;
  checkedFiles: number;
  findings: Finding[];
  diagnostics: ReviewDiagnostic[];
}

export async function reviewProject(projectRoot: string): Promise<ReviewResult> {
  const config = await loadConfig(projectRoot);
  const scanResult = await scanMarkdownFiles(projectRoot, config);
  const documents = scanResult.files.map(parseMarkdown);
  const findings: Finding[] = [];
  const diagnostics: ReviewDiagnostic[] = scanResult.diagnostics.map((diagnostic) => ({
    source: 'scanner',
    message: `${diagnostic.file}: ${diagnostic.message}`,
  }));

  for (const rule of rules) {
    try {
      findings.push(...rule.run({documents, config}));
    } catch (error) {
      diagnostics.push({
        source: 'rule',
        ruleId: rule.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    projectRoot,
    docsRoot: join(projectRoot, config.docsRoot),
    checkedFiles: scanResult.files.length,
    findings: sortFindings(findings),
    diagnostics,
  };
}
```

- [ ] **Step 6: Run acceptance and all engine tests**

Run:

```bash
npx vitest run tests/engine
```

Expected: all tests PASS and acceptance fixture returns exactly five findings.

- [ ] **Step 7: Verify the real project is read-only**

Run:

```bash
git diff -- docs/ru
npm run reviewer:test -- --run
git diff -- docs/ru
```

Expected: the two `git diff -- docs/ru` outputs are identical; tests do not write into `docs/ru`.

- [ ] **Step 8: Commit**

```bash
git add src/engine tests/engine tests/fixtures
git commit -m "feat: compose documentation review engine"
```

---

### Task 7: Expose safe folder selection and review execution through Electron IPC

**Files:**
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/electron-api.d.ts`

**Interfaces:**
- Produces renderer API:
  - `selectProject(): Promise<string | null>`
  - `reviewProject(projectRoot: string): Promise<ReviewResult>`
- Renderer never receives direct Node.js filesystem access.

- [ ] **Step 1: Implement IPC handlers**

Create `src/main/ipc.ts`:

```ts
import {dialog, ipcMain} from 'electron';
import {reviewProject} from '../engine/reviewProject';

export function registerReviewerIpc(): void {
  ipcMain.handle('reviewer:select-project', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Выберите папку проекта',
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('reviewer:run', async (_event, projectRoot: string) => {
    if (typeof projectRoot !== 'string' || projectRoot.trim() === '') {
      throw new Error('Не выбрана папка проекта.');
    }

    return reviewProject(projectRoot);
  });
}
```

- [ ] **Step 2: Register handlers from the main process**

Update `src/main/index.ts`:

```ts
import {registerReviewerIpc} from './ipc';

// inside app.whenReady()
app.whenReady().then(() => {
  registerReviewerIpc();
  createWindow();
});
```

Replace the earlier standalone `app.whenReady().then(createWindow)`.

- [ ] **Step 3: Expose only the two approved operations**

Update `src/preload/index.ts`:

```ts
import {contextBridge, ipcRenderer} from 'electron';

contextBridge.exposeInMainWorld('reviewer', {
  selectProject: (): Promise<string | null> =>
    ipcRenderer.invoke('reviewer:select-project'),
  reviewProject: (projectRoot: string) =>
    ipcRenderer.invoke('reviewer:run', projectRoot),
});
```

Update `src/shared/electron-api.d.ts`:

```ts
import type {ReviewResult} from '../engine/reviewProject';

export {};

declare global {
  interface Window {
    reviewer: {
      selectProject(): Promise<string | null>;
      reviewProject(projectRoot: string): Promise<ReviewResult>;
    };
  }
}
```

- [ ] **Step 4: Verify production build**

Run:

```bash
npm run reviewer:build
```

Expected: PASS with main, preload and renderer bundles generated.

- [ ] **Step 5: Commit**

```bash
git add src/main src/preload src/shared
git commit -m "feat: expose safe local review ipc"
```

---

### Task 8: Build the two-panel v0.1 results interface

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/styles.css`
- Create: `src/renderer/src/components/ProjectHeader.tsx`
- Create: `src/renderer/src/components/Filters.tsx`
- Create: `src/renderer/src/components/FindingsList.tsx`
- Create: `src/renderer/src/components/FindingDetails.tsx`
- Create: `tests/renderer/App.test.tsx`

**Interfaces:**
- Consumes: `window.reviewer.selectProject()` and `window.reviewer.reviewProject()`.
- UI state: project path, loading, review result, active severity filter, selected Finding.
- No edit/fix action is exposed.

- [ ] **Step 1: Add a jsdom Vitest setup for renderer tests**

Update `vitest.config.ts`:

```ts
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/renderer/**', 'jsdom'],
    ],
    setupFiles: ['./tests/setup.ts'],
  },
});
```

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Write the UI acceptance test**

Create `tests/renderer/App.test.tsx`:

```tsx
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from '../../src/renderer/src/App';

const reviewResult = {
  projectRoot: 'C:\\project',
  docsRoot: 'C:\\project\\docs\\ru',
  checkedFiles: 3,
  diagnostics: [],
  findings: [
    {
      ruleId: 'missing-anchor',
      category: 'links',
      severity: 'error' as const,
      file: 'index.md',
      line: 5,
      title: 'Несуществующий якорь',
      message: 'Якорь #missing не найден.',
      source: '[Раздел](target.md#missing)',
      recommendation: 'Проверьте идентификатор якоря.',
      target: 'target.md#missing',
    },
  ],
};

describe('App', () => {
  beforeEach(() => {
    window.reviewer = {
      selectProject: vi.fn().mockResolvedValue('C:\\project'),
      reviewProject: vi.fn().mockResolvedValue(reviewResult),
    };
  });

  it('selects a project, runs review and shows finding details', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', {name: 'Выбрать'}));
    expect(await screen.findByText('C:\\project')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Проверить проект'}));

    expect(await screen.findByText('Проверено: 3')).toBeInTheDocument();
    expect(screen.getByText('Несуществующий якорь')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Несуществующий якорь'));

    expect(screen.getByText('Якорь #missing не найден.')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /исправить/i})).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run UI test and verify failure**

Run:

```bash
npx vitest run tests/renderer/App.test.tsx
```

Expected: FAIL because the production UI is not implemented.

- [ ] **Step 4: Implement `ProjectHeader`**

Create `src/renderer/src/components/ProjectHeader.tsx`:

```tsx
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
```

- [ ] **Step 5: Implement filters, list and details**

Create `src/renderer/src/components/Filters.tsx`:

```tsx
import type {Severity} from '../../../engine/types';

export type SeverityFilter = 'all' | Severity;

interface Props {
  value: SeverityFilter;
  counts: {all: number; error: number; warning: number; info: number};
  onChange(value: SeverityFilter): void;
}

export function Filters({value, counts, onChange}: Props) {
  return (
    <nav className="filters" aria-label="Фильтры замечаний">
      {([
        ['all', `Все ${counts.all}`],
        ['error', `Ошибки ${counts.error}`],
        ['warning', `Предупреждения ${counts.warning}`],
        ['info', `Информация ${counts.info}`],
      ] as const).map(([key, label]) => (
        <button
          key={key}
          className={value === key ? 'active' : ''}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
```

Create `src/renderer/src/components/FindingsList.tsx`:

```tsx
import type {Finding} from '../../../engine/types';

interface Props {
  findings: Finding[];
  selected: Finding | null;
  onSelect(finding: Finding): void;
}

export function FindingsList({findings, selected, onSelect}: Props) {
  if (findings.length === 0) {
    return <div className="empty-state">Замечаний нет.</div>;
  }

  return (
    <div className="findings-list">
      {findings.map((finding, index) => (
        <button
          key={`${finding.ruleId}:${finding.file}:${finding.line}:${index}`}
          className={selected === finding ? 'finding selected' : 'finding'}
          onClick={() => onSelect(finding)}
        >
          <span className={`severity ${finding.severity}`}>{finding.severity}</span>
          <strong>{finding.file} · {finding.line}</strong>
          <span>{finding.title}</span>
        </button>
      ))}
    </div>
  );
}
```

Create `src/renderer/src/components/FindingDetails.tsx`:

```tsx
import type {Finding} from '../../../engine/types';

export function FindingDetails({finding}: {finding: Finding | null}) {
  if (!finding) {
    return <div className="empty-state">Выберите замечание слева.</div>;
  }

  return (
    <article className="finding-details">
      <h2>{finding.title}</h2>
      <p><strong>{finding.file} · строка {finding.line}</strong></p>
      <p className={`severity ${finding.severity}`}>{finding.severity}</p>

      <h3>Проблема</h3>
      <p>{finding.message}</p>

      <h3>Фрагмент</h3>
      <pre><code>{finding.source}</code></pre>

      <h3>Рекомендация</h3>
      <p>{finding.recommendation}</p>

      <div className="rule-id">Правило: {finding.ruleId}</div>
    </article>
  );
}
```

- [ ] **Step 6: Implement application state and the two-panel layout**

Replace `src/renderer/src/App.tsx` with:

```tsx
import {useMemo, useState} from 'react';
import type {Finding, Severity} from '../../engine/types';
import type {ReviewResult} from '../../engine/reviewProject';
import {FindingDetails} from './components/FindingDetails';
import {FindingsList} from './components/FindingsList';
import {Filters, type SeverityFilter} from './components/Filters';
import {ProjectHeader} from './components/ProjectHeader';
import './styles.css';

export function App() {
  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [selected, setSelected] = useState<Finding | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleFindings = useMemo(
    () => result?.findings.filter((finding) =>
      filter === 'all' || finding.severity === filter,
    ) ?? [],
    [result, filter],
  );

  const counts = useMemo(() => {
    const findings = result?.findings ?? [];
    const count = (severity: Severity) =>
      findings.filter((finding) => finding.severity === severity).length;

    return {
      all: findings.length,
      error: count('error'),
      warning: count('warning'),
      info: count('info'),
    };
  }, [result]);

  async function selectProject() {
    const selectedPath = await window.reviewer.selectProject();
    if (!selectedPath) return;

    setProjectRoot(selectedPath);
    setResult(null);
    setSelected(null);
    setError(null);
  }

  async function runReview() {
    if (!projectRoot) return;

    setLoading(true);
    setError(null);

    try {
      const next = await window.reviewer.reviewProject(projectRoot);
      setResult(next);
      setSelected(next.findings[0] ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <ProjectHeader
        projectRoot={projectRoot}
        loading={loading}
        onSelect={selectProject}
        onReview={runReview}
      />

      {error && <div role="alert" className="error-banner">{error}</div>}

      {result && (
        <>
          <section className="summary">
            <span>Проверено: {result.checkedFiles}</span>
            <span>Замечаний: {result.findings.length}</span>
          </section>

          <Filters value={filter} counts={counts} onChange={setFilter} />

          <section className="workspace">
            <FindingsList
              findings={visibleFindings}
              selected={selected}
              onSelect={setSelected}
            />
            <FindingDetails finding={selected} />
          </section>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 7: Add restrained desktop layout styles**

Create `src/renderer/src/styles.css` with these layout requirements:

```css
:root {
  font-family: Inter, system-ui, sans-serif;
  color: #1f2937;
  background: #f7f8fa;
}

* { box-sizing: border-box; }

body { margin: 0; }

button { font: inherit; cursor: pointer; }

.app-shell {
  min-height: 100vh;
  padding: 24px;
}

.project-header,
.summary,
.filters,
.workspace {
  max-width: 1200px;
  margin: 0 auto;
}

.project-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
}

.actions,
.filters,
.summary {
  display: flex;
  gap: 12px;
}

.summary,
.filters {
  margin-top: 20px;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
  gap: 16px;
  margin-top: 16px;
  min-height: 520px;
}

.findings-list,
.finding-details {
  background: white;
  border: 1px solid #dfe3e8;
  border-radius: 10px;
  overflow: auto;
}

.finding {
  width: 100%;
  display: grid;
  gap: 4px;
  padding: 14px;
  text-align: left;
  border: 0;
  border-bottom: 1px solid #eceff2;
  background: white;
}

.finding.selected {
  background: #eef3ff;
}

.finding-details {
  padding: 22px;
}

.finding-details pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #f3f4f6;
  padding: 12px;
  border-radius: 8px;
}

.severity.error { font-weight: 700; }
.severity.warning { font-weight: 600; }
.severity.info { font-weight: 500; }

.empty-state,
.error-banner {
  padding: 20px;
}

.error-banner {
  max-width: 1200px;
  margin: 16px auto 0;
  background: #fff4f4;
  border: 1px solid #e3baba;
  border-radius: 8px;
}
```

Do not add an edit, replace, or “Исправить” button.

- [ ] **Step 8: Run UI and engine tests**

Run:

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 9: Build the desktop application**

Run:

```bash
npm run reviewer:build
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/renderer tests/renderer tests/setup.ts vitest.config.ts
git commit -m "feat: add two-panel review interface"
```

---

### Task 9: Final local verification against the existing `diplodoc-example`

**Files:**
- Modify only if a verified defect is found in reviewer code.
- Do not intentionally modify: `docs/ru/**`.

**Interfaces:**
- Validates the complete v0.1 flow.

- [ ] **Step 1: Capture the current docs diff before running the reviewer**

Run:

```bash
git diff -- docs/ru > /tmp/docs-ru-before.diff
```

On Windows PowerShell use:

```powershell
git diff -- docs/ru | Set-Content "$env:TEMP\docs-ru-before.diff"
```

- [ ] **Step 2: Run the automated acceptance suite**

Run:

```bash
npm run reviewer:test
```

Expected:
- all tests PASS;
- `five-findings-project` returns exactly five Findings.

- [ ] **Step 3: Run both builds**

Run:

```bash
npm run reviewer:build
npm run build:docs
```

Expected: both PASS.

- [ ] **Step 4: Start the reviewer and perform the manual smoke test**

Run:

```bash
npm run reviewer:dev
```

Manual checks:
1. Window opens.
2. Click **Выбрать**.
3. Select the real `diplodoc-example` root.
4. The selected path appears in the header.
5. Click **Проверить проект**.
6. Only files under `docs/ru` count toward `Проверено`.
7. Any current real-project findings show file, line, severity, source and recommendation.
8. Filters change the visible finding list.
9. Selecting a finding updates the right panel.
10. There is no auto-fix/edit control.

- [ ] **Step 5: Prove that real documentation was not changed**

Linux/macOS shell:

```bash
git diff -- docs/ru > /tmp/docs-ru-after.diff
diff -u /tmp/docs-ru-before.diff /tmp/docs-ru-after.diff
```

Windows PowerShell:

```powershell
git diff -- docs/ru | Set-Content "$env:TEMP\docs-ru-after.diff"
Compare-Object `
  (Get-Content "$env:TEMP\docs-ru-before.diff") `
  (Get-Content "$env:TEMP\docs-ru-after.diff")
```

Expected: no difference caused by the reviewer.

- [ ] **Step 6: Check the final working tree deliberately**

Run:

```bash
git status --short
```

Expected: only intended reviewer files plus pre-existing user changes are present. Do not reset or overwrite pre-existing modifications.

- [ ] **Step 7: Final commit**

```bash
git add package.json package-lock.json electron.vite.config.ts reviewer.config.json src tests docs/superpowers
git commit -m "feat: complete documentation reviewer v0.1"
```

If Git identity is unset, do not set it automatically; leave the project in a verified state and report the exact commit command to the user.

---

## Acceptance Checklist

v0.1 is complete only when all items are true:

- [ ] `npm run reviewer:test` passes.
- [ ] `npm run reviewer:build` passes.
- [ ] `npm run build:docs` still passes.
- [ ] The acceptance fixture produces exactly five Findings.
- [ ] `docs/en` does not affect results.
- [ ] The real `docs/ru` folder is not modified by a review run.
- [ ] The UI shows checked file count and total finding count.
- [ ] The UI supports severity filters.
- [ ] Selecting a Finding opens details in the right panel.
- [ ] Each Finding includes rule ID, severity, file, line, title, message, source and recommendation.
- [ ] No “Исправить”/auto-fix functionality exists.
- [ ] No network integration or AI/LLM dependency exists.
