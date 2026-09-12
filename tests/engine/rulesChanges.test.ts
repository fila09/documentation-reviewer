import {mkdtemp, mkdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {parseMarkdown} from '../../src/engine/parser';
import {reviewProject} from '../../src/engine/reviewProject';
import {rules} from '../../src/engine/rules';

const temporaryProjects: string[] = [];

async function createProject(): Promise<{
  projectRoot: string;
  docsRoot: string;
}> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'docreview-rules-'));
  temporaryProjects.push(projectRoot);

  const docsRoot = join(projectRoot, 'docs', 'ru');
  await mkdir(docsRoot, {recursive: true});

  return {projectRoot, docsRoot};
}

function doc(relativePath: string, content: string) {
  return parseMarkdown({
    absolutePath: `/project/docs/ru/${relativePath}`,
    relativePath,
    content,
  });
}

afterEach(async () => {
  const {rm} = await import('node:fs/promises');
  await Promise.all(
    temporaryProjects.splice(0).map((path) => rm(path, {recursive: true, force: true})),
  );
});

describe('changes to the active rule set', () => {
  it('temporarily disables list-without-intro without deleting the rule implementation', () => {
    expect(rules.map((rule) => rule.id)).not.toContain('list-without-intro');
  });
});

describe('local links outside docsRoot', () => {
  it('allows a markdown link that goes above docsRoot but still points to a file inside the project', async () => {
    const {projectRoot, docsRoot} = await createProject();
    const targetDir = join(projectRoot, 'docs', 'RT_ClusterManager');
    await mkdir(targetDir, {recursive: true});
    await writeFile(join(targetDir, 'Installation_RT_ClusterManager.md'), '# Installation\n');
    await writeFile(
      join(docsRoot, 'index.md'),
      '[Установка](../RT_ClusterManager/Installation_RT_ClusterManager.md)\n',
    );

    const result = await reviewProject(projectRoot, docsRoot);

    expect(result.findings.filter((finding) => finding.ruleId === 'broken-local-link'))
      .toHaveLength(0);
  });

  it('understands escaped underscores in a markdown link path', async () => {
    const {projectRoot, docsRoot} = await createProject();
    const targetDir = join(projectRoot, 'docs', 'RT_ClusterManager');
    await mkdir(targetDir, {recursive: true});
    await writeFile(join(targetDir, 'Installation_RT_ClusterManager.md'), '# Installation\n');
    await writeFile(
      join(docsRoot, 'index.md'),
      '[Установка](../RT\\_ClusterManager/Installation\\_RT\\_ClusterManager.md)\n',
    );

    const result = await reviewProject(projectRoot, docsRoot);

    expect(result.findings.filter((finding) => finding.ruleId === 'broken-local-link'))
      .toHaveLength(0);
  });
});

describe('duplicate-content', () => {
  function duplicateRule() {
    const rule = rules.find((candidate) => candidate.id === 'duplicate-content');
    expect(rule, 'duplicate-content must be registered in the active rules').toBeDefined();
    return rule!;
  }

  it('reports both occurrences of the same long paragraph inside one file', () => {
    const paragraph =
      'Этот достаточно длинный фрагмент инструкции повторяется в документе и должен быть замечен правилом, чтобы автор проверил дублирование контента.';
    const document = doc('guide.md', `${paragraph}\n\nДругой текст.\n\n${paragraph}`);

    const findings = duplicateRule().run({documents: [document], config: {undesirablePhrases: []}});

    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.line)).toEqual([1, 5]);
    expect(findings.every((finding) => finding.severity === 'info')).toBe(true);
  });

  it('reports all occurrences of the same long paragraph in different files', () => {
    const paragraph =
      'Этот достаточно длинный фрагмент документации используется в нескольких файлах и должен быть показан во всех местах, где найден повтор.';
    const documents = [
      doc('a.md', paragraph),
      doc('b.md', paragraph),
      doc('c.md', paragraph),
    ];

    const findings = duplicateRule().run({documents, config: {undesirablePhrases: []}});

    expect(findings).toHaveLength(3);
    expect(findings.map((finding) => finding.file).sort()).toEqual(['a.md', 'b.md', 'c.md']);
  });

  it('treats a long markdown list as one comparable block', () => {
    const list = [
      '1. Откройте страницу администрирования и перейдите к настройкам нужного компонента.',
      '2. Укажите параметры подключения и сохраните внесенные изменения.',
      '3. Перезапустите компонент и проверьте его состояние.',
    ].join('\n');

    const findings = duplicateRule().run({
      documents: [doc('a.md', list), doc('b.md', list)],
      config: {undesirablePhrases: []},
    });

    expect(findings).toHaveLength(2);
  });

  it('treats a long fenced code block as one comparable block', () => {
    const code = [
      '```bash',
      'export DOCREVIEW_PROJECT=/opt/documentation/project',
      'export DOCREVIEW_CONFIG=/opt/documentation/config/reviewer.yaml',
      'docreview --project "$DOCREVIEW_PROJECT" --config "$DOCREVIEW_CONFIG"',
      '```',
    ].join('\n');

    const findings = duplicateRule().run({
      documents: [doc('a.md', code), doc('b.md', code)],
      config: {undesirablePhrases: []},
    });

    expect(findings).toHaveLength(2);
  });

  it('ignores duplicate blocks shorter than 100 characters', () => {
    const shortParagraph = 'Этот короткий текст повторяется, но его недостаточно для полезного сигнала.';

    const findings = duplicateRule().run({
      documents: [doc('a.md', shortParagraph), doc('b.md', shortParagraph)],
      config: {undesirablePhrases: []},
    });

    expect(findings).toHaveLength(0);
  });

  it('ignores headings and include references even when they repeat', () => {
    const heading = `## ${'Повторяющийся заголовок '.repeat(6)}`;
    const include = `{% include [shared](${('../_includes/shared.md ').repeat(8)}) %}`;

    const findings = duplicateRule().run({
      documents: [
        doc('a.md', `${heading}\n\n${include}`),
        doc('b.md', `${heading}\n\n${include}`),
      ],
      config: {undesirablePhrases: []},
    });

    expect(findings).toHaveLength(0);
  });
});
