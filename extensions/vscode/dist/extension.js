var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// extensions/vscode/src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var import_promises3 = require("node:fs/promises");
var import_node_path4 = require("node:path");
var vscode = __toESM(require("vscode"));

// src/engine/projectPaths.ts
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");
function isStrictlyInside(projectRoot, docsRoot) {
  const rel = (0, import_node_path.relative)(projectRoot, docsRoot);
  return rel !== "" && rel !== ".." && !rel.startsWith("../") && !rel.startsWith("..\\") && !(0, import_node_path.isAbsolute)(rel);
}
async function resolveProjectPaths(projectRoot, docsRoot) {
  let project;
  let docs;
  try {
    project = await (0, import_promises.realpath)(projectRoot);
  } catch {
    throw new Error(`\u041F\u0430\u043F\u043A\u0430 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430: ${projectRoot}`);
  }
  try {
    docs = await (0, import_promises.realpath)(docsRoot);
  } catch {
    throw new Error(`\u041F\u0430\u043F\u043A\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430: ${docsRoot}`);
  }
  if (!isStrictlyInside(project, docs)) {
    throw new Error("\u041F\u0430\u043F\u043A\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u0438 \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u0432\u043D\u0443\u0442\u0440\u0438 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430.");
  }
  return { projectRoot: project, docsRoot: docs };
}
async function suggestDefaultDocsRoot(projectRoot) {
  let project;
  try {
    project = await (0, import_promises.realpath)(projectRoot);
  } catch {
    return null;
  }
  const candidate = (0, import_node_path.join)(project, "docs", "ru");
  try {
    const candidateStat = await (0, import_promises.stat)(candidate);
    if (!candidateStat.isDirectory()) return null;
    const resolved = await resolveProjectPaths(project, candidate);
    return resolved.docsRoot;
  } catch {
    return null;
  }
}

// src/engine/config.ts
var reviewerConfig = {
  undesirablePhrases: [
    {
      phrase: "\u043E\u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0443",
      replacement: "\u043D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C"
    },
    {
      phrase: "\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0443",
      replacement: "\u043D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C"
    }
  ]
};

// src/engine/parser.ts
function maskInlineCode(line) {
  return line.replace(/(`+)(.*?)\1/g, (match) => " ".repeat(match.length));
}
function analysisLines(content) {
  const sourceLines = content.split(/\r?\n/);
  let fence = null;
  return sourceLines.map((line) => {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      const length = fenceMatch[1].length;
      if (!fence) {
        fence = { marker, length };
        return "";
      }
      if (fence.marker === marker && length >= fence.length) {
        fence = null;
        return "";
      }
    }
    if (fence) return "";
    return maskInlineCode(line);
  });
}
function parseMarkdown(file) {
  const lines = analysisLines(file.content);
  const links = [];
  const anchors = [];
  lines.forEach((lineText, index) => {
    const line = index + 1;
    const linkPattern = /(?<!!)\[([^\]]*)\]\(([^)]*)\)/g;
    for (const match of lineText.matchAll(linkPattern)) {
      links.push({
        text: match[1],
        target: match[2].trim(),
        line,
        source: match[0]
      });
    }
    const anchorPattern = /\{#([A-Za-z0-9_-]+)\}/g;
    for (const match of lineText.matchAll(anchorPattern)) {
      anchors.push({
        id: match[1],
        line,
        source: match[0]
      });
    }
  });
  return { file, links, anchors, lines };
}

// src/engine/reporter.ts
var severityOrder = {
  error: 0,
  warning: 1,
  info: 2
};
function sortFindings(findings) {
  return [...findings].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.file.localeCompare(b.file) || a.line - b.line || a.ruleId.localeCompare(b.ruleId)
  );
}

// src/engine/rules/mixedAlphabet.ts
var tokenPattern = /[\p{L}\p{N}]+/gu;
var cyrillic = /[А-Яа-яЁё]/u;
var latin = /[A-Za-z]/u;
function scriptOf(char) {
  if (cyrillic.test(char)) return "cyrillic";
  if (latin.test(char)) return "latin";
  return null;
}
function dominantScript(token) {
  const letters = [...token].filter((char) => scriptOf(char));
  const cyrillicCount = letters.filter((char) => scriptOf(char) === "cyrillic").length;
  const latinCount = letters.filter((char) => scriptOf(char) === "latin").length;
  if (cyrillicCount > latinCount) return "cyrillic";
  if (latinCount > cyrillicCount) return "latin";
  return scriptOf(letters[0] ?? "") ?? "latin";
}
function suspiciousIndexes(token, dominant) {
  const result = [];
  let offset = 0;
  for (const char of token) {
    const script = scriptOf(char);
    if (script && script !== dominant) result.push(offset);
    offset += char.length;
  }
  return result;
}
function highlightRanges(tokenStart, indexes, sourceOffset) {
  return indexes.map((index) => ({
    start: tokenStart + index - sourceOffset,
    end: tokenStart + index + 1 - sourceOffset
  }));
}
function messageFor(token, dominant, suspicious) {
  const symbols = suspicious.map((char) => `\xAB${char}\xBB`).join(", ");
  const singular = suspicious.length === 1;
  if (dominant === "cyrillic") {
    return singular ? `\u0412 \u0441\u043B\u043E\u0432\u0435 \xAB${token}\xBB \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0430\u044F \u0431\u0443\u043A\u0432\u0430 ${symbols} \u0441\u0440\u0435\u0434\u0438 \u043A\u0438\u0440\u0438\u043B\u043B\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.` : `\u0412 \u0441\u043B\u043E\u0432\u0435 \xAB${token}\xBB \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0435 \u0441\u0438\u043C\u0432\u043E\u043B\u044B ${symbols} \u0441\u0440\u0435\u0434\u0438 \u043A\u0438\u0440\u0438\u043B\u043B\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.`;
  }
  return singular ? `\u0412 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0435 \xAB${token}\xBB \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043A\u0438\u0440\u0438\u043B\u043B\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0431\u0443\u043A\u0432\u0430 ${symbols} \u0441\u0440\u0435\u0434\u0438 \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0445 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.` : `\u0412 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0435 \xAB${token}\xBB \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u043A\u0438\u0440\u0438\u043B\u043B\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0441\u0438\u043C\u0432\u043E\u043B\u044B ${symbols} \u0441\u0440\u0435\u0434\u0438 \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0445 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.`;
}
var mixedAlphabetRule = {
  id: "mixed-alphabet",
  run({ documents }) {
    return documents.flatMap((document) => {
      const sourceLines = document.file.content.split(/\r?\n/);
      return document.lines.flatMap((lineText, index) => {
        if (!lineText) return [];
        const sourceLine = sourceLines[index] ?? lineText;
        const leadingWhitespace = sourceLine.length - sourceLine.trimStart().length;
        const source = sourceLine.trim();
        for (const match of lineText.matchAll(tokenPattern)) {
          const token = match[0];
          if (!cyrillic.test(token) || !latin.test(token)) continue;
          const dominant = dominantScript(token);
          const indexes = suspiciousIndexes(token, dominant);
          const suspicious = indexes.map((position) => token[position]);
          const tokenStart = match.index ?? 0;
          const finding = {
            ruleId: "mixed-alphabet",
            category: "style",
            severity: "warning",
            file: document.file.relativePath,
            line: index + 1,
            title: "\u0421\u043C\u0435\u0448\u0435\u043D\u0438\u0435 \u043A\u0438\u0440\u0438\u043B\u043B\u0438\u0446\u044B \u0438 \u043B\u0430\u0442\u0438\u043D\u0438\u0446\u044B",
            message: messageFor(token, dominant, suspicious),
            source,
            recommendation: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0430\u0441\u043A\u043B\u0430\u0434\u043A\u0443 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u044B \u0438 \u0437\u0430\u043C\u0435\u043D\u0438\u0442\u0435 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043D\u044B\u0435 \u0441\u0438\u043C\u0432\u043E\u043B\u044B \u043D\u0430 \u043D\u0443\u0436\u043D\u044B\u0439 \u0430\u043B\u0444\u0430\u0432\u0438\u0442.",
            highlights: highlightRanges(tokenStart, indexes, leadingWhitespace)
          };
          return [finding];
        }
        return [];
      });
    });
  }
};

// src/engine/rules/multipleSpaces.ts
var pattern = /\S {2,}\S/u;
function textSegmentsOutsideInlineCode(sourceLine) {
  const segments = [];
  const pattern3 = /(`+)(.*?)\1/g;
  let start = 0;
  for (const match of sourceLine.matchAll(pattern3)) {
    const index = match.index ?? 0;
    segments.push(sourceLine.slice(start, index));
    start = index + match[0].length;
  }
  segments.push(sourceLine.slice(start));
  return segments;
}
function isTableRow(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}
var multipleSpacesRule = {
  id: "multiple-spaces",
  run({ documents }) {
    return documents.flatMap((document) => {
      const sourceLines = document.file.content.split(/\r?\n/);
      return document.lines.flatMap((lineText, index) => {
        if (!lineText) return [];
        const sourceLine = sourceLines[index] ?? lineText;
        if (isTableRow(sourceLine)) return [];
        for (const segment of textSegmentsOutsideInlineCode(sourceLine)) {
          const withoutIndent = segment.replace(/^\s+/, "");
          if (!pattern.test(withoutIndent)) continue;
          return [{
            ruleId: "multiple-spaces",
            category: "style",
            severity: "info",
            file: document.file.relativePath,
            line: index + 1,
            title: "\u041D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u043E\u0431\u0435\u043B\u043E\u0432 \u043F\u043E\u0434\u0440\u044F\u0434",
            message: "\u0412 \u0442\u0435\u043A\u0441\u0442\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u043E\u0431\u0435\u043B\u043E\u0432 \u043F\u043E\u0434\u0440\u044F\u0434.",
            source: sourceLine.trim(),
            recommendation: "\u041E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043E\u0434\u0438\u043D \u043F\u0440\u043E\u0431\u0435\u043B, \u0435\u0441\u043B\u0438 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u043E\u0431\u0435\u043B\u043E\u0432 \u043D\u0435 \u043D\u0443\u0436\u043D\u044B \u043D\u0430\u043C\u0435\u0440\u0435\u043D\u043D\u043E."
          }];
        }
        return [];
      });
    });
  }
};

// src/engine/rules/spaceBeforePunctuation.ts
var pattern2 = /\s+[,.!?;:](?=\s|$)/u;
function textSegmentsOutsideInlineCode2(sourceLine) {
  const segments = [];
  const pattern3 = /(`+)(.*?)\1/g;
  let start = 0;
  for (const match of sourceLine.matchAll(pattern3)) {
    const index = match.index ?? 0;
    segments.push(sourceLine.slice(start, index));
    start = index + match[0].length;
  }
  segments.push(sourceLine.slice(start));
  return segments;
}
var spaceBeforePunctuationRule = {
  id: "space-before-punctuation",
  run({ documents }) {
    return documents.flatMap((document) => {
      const sourceLines = document.file.content.split(/\r?\n/);
      return document.lines.flatMap((lineText, index) => {
        if (!lineText) return [];
        const sourceLine = sourceLines[index] ?? lineText;
        for (const segment of textSegmentsOutsideInlineCode2(sourceLine)) {
          if (!pattern2.test(segment)) continue;
          return [{
            ruleId: "space-before-punctuation",
            category: "style",
            severity: "warning",
            file: document.file.relativePath,
            line: index + 1,
            title: "\u041F\u0440\u043E\u0431\u0435\u043B \u043F\u0435\u0440\u0435\u0434 \u0437\u043D\u0430\u043A\u043E\u043C \u043F\u0440\u0435\u043F\u0438\u043D\u0430\u043D\u0438\u044F",
            message: "\u041F\u0435\u0440\u0435\u0434 \u0437\u043D\u0430\u043A\u043E\u043C \u043F\u0440\u0435\u043F\u0438\u043D\u0430\u043D\u0438\u044F \u043D\u0430\u0439\u0434\u0435\u043D \u043B\u0438\u0448\u043D\u0438\u0439 \u043F\u0440\u043E\u0431\u0435\u043B.",
            source: sourceLine.trim(),
            recommendation: "\u0423\u0434\u0430\u043B\u0438\u0442\u0435 \u043F\u0440\u043E\u0431\u0435\u043B \u043F\u0435\u0440\u0435\u0434 \u0437\u043D\u0430\u043A\u043E\u043C \u043F\u0440\u0435\u043F\u0438\u043D\u0430\u043D\u0438\u044F."
          }];
        }
        return [];
      });
    });
  }
};

// src/engine/rules/emptyAnchor.ts
var emptyAnchorRule = {
  id: "empty-anchor",
  run({ documents }) {
    return documents.flatMap(
      (document) => document.lines.flatMap((lineText, index) => {
        if (!/\{#\}/.test(lineText)) return [];
        return [{
          ruleId: "empty-anchor",
          category: "markdown",
          severity: "error",
          file: document.file.relativePath,
          line: index + 1,
          title: "\u041F\u0443\u0441\u0442\u043E\u0439 \u044F\u043A\u043E\u0440\u044C",
          message: "\u042F\u043A\u043E\u0440\u044C \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440.",
          source: lineText.trim(),
          recommendation: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u044F\u043A\u043E\u0440\u044F \u0438\u043B\u0438 \u0443\u0434\u0430\u043B\u0438\u0442\u0435 \u043F\u0443\u0441\u0442\u043E\u0439 \u044F\u043A\u043E\u0440\u044C."
        }];
      })
    );
  }
};

// src/engine/rules/brokenLocalLink.ts
var import_node_fs = require("node:fs");
var import_node_path2 = require("node:path");
function isExternalTarget(target) {
  return /^(?:https?:|mailto:|tel:|\/\/)/i.test(target);
}
function splitTarget(target) {
  const [path, anchor] = target.split("#", 2);
  return { path, anchor: anchor || void 0 };
}
function unescapeMarkdownPath(path) {
  return path.replace(/\\([\\`*_{}\[\]()#+.!-])/g, "$1");
}
function resolveRelativeTarget(sourceFile, targetPath) {
  if (targetPath === "") return sourceFile;
  return import_node_path2.posix.normalize(import_node_path2.posix.join((0, import_node_path2.dirname)(sourceFile), unescapeMarkdownPath(targetPath)));
}
function documentMap(documents) {
  return new Map(documents.map((document) => [document.file.relativePath, document]));
}
function isInside(root, candidate) {
  const rel = (0, import_node_path2.relative)(root, candidate);
  return rel === "" || rel !== ".." && !rel.startsWith("../") && !rel.startsWith("..\\") && !(0, import_node_path2.isAbsolute)(rel);
}
function targetExistsInsideProject(sourceAbsolutePath, targetPath, projectRoot) {
  if (!projectRoot) return false;
  const unescaped = unescapeMarkdownPath(targetPath);
  const candidate = (0, import_node_path2.resolve)((0, import_node_path2.dirname)(sourceAbsolutePath), unescaped);
  if (!isInside(projectRoot, candidate) || !(0, import_node_fs.existsSync)(candidate)) return false;
  try {
    const realProject = (0, import_node_fs.realpathSync)(projectRoot);
    const realCandidate = (0, import_node_fs.realpathSync)(candidate);
    return isInside(realProject, realCandidate);
  } catch {
    return false;
  }
}
var brokenLocalLinkRule = {
  id: "broken-local-link",
  run({ documents, projectRoot }) {
    const byPath = documentMap(documents);
    return documents.flatMap(
      (document) => document.links.flatMap((link) => {
        if (!link.target || isExternalTarget(link.target)) return [];
        const { path } = splitTarget(link.target);
        if (!path || !path.toLowerCase().endsWith(".md")) return [];
        if (path.split(/[\\/]+/).includes("_includes")) return [];
        const resolved = resolveRelativeTarget(document.file.relativePath, path);
        if (byPath.has(resolved)) return [];
        if (targetExistsInsideProject(document.file.absolutePath, path, projectRoot)) return [];
        return [{
          ruleId: "broken-local-link",
          category: "links",
          severity: "error",
          file: document.file.relativePath,
          line: link.line,
          title: "\u0411\u0438\u0442\u0430\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430",
          message: `\u0424\u0430\u0439\u043B ${resolved} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C \u043F\u0440\u043E\u0435\u043A\u0442\u0435.`,
          source: link.source,
          recommendation: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0443\u0442\u044C \u043A \u0446\u0435\u043B\u0435\u0432\u043E\u0439 Markdown-\u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435.",
          target: link.target
        }];
      })
    );
  }
};

// src/engine/rules/duplicateExplicitAnchor.ts
var duplicateExplicitAnchorRule = {
  id: "duplicate-explicit-anchor",
  run({ documents }) {
    return documents.flatMap((document) => {
      const firstLineById = /* @__PURE__ */ new Map();
      const findings = [];
      for (const anchor of document.anchors) {
        const firstLine = firstLineById.get(anchor.id);
        if (firstLine === void 0) {
          firstLineById.set(anchor.id, anchor.line);
          continue;
        }
        findings.push({
          ruleId: "duplicate-explicit-anchor",
          category: "markdown",
          severity: "error",
          file: document.file.relativePath,
          line: anchor.line,
          title: "\u0414\u0443\u0431\u043B\u0438\u0440\u0443\u044E\u0449\u0438\u0439\u0441\u044F \u044F\u043A\u043E\u0440\u044C",
          message: `\u042F\u043A\u043E\u0440\u044C #${anchor.id} \u0443\u0436\u0435 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D \u0432 \u044D\u0442\u043E\u043C \u0444\u0430\u0439\u043B\u0435 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0435 ${firstLine}.`,
          source: anchor.source,
          recommendation: "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u044D\u0442\u043E\u043C\u0443 \u0440\u0430\u0437\u0434\u0435\u043B\u0443 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u044F\u043A\u043E\u0440\u044C \u0432 \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u0445 \u0444\u0430\u0439\u043B\u0430.",
          target: `#${anchor.id}`
        });
      }
      return findings;
    });
  }
};

// src/engine/rules/emptyLink.ts
var emptyLinkRule = {
  id: "empty-link",
  run({ documents }) {
    return documents.flatMap(
      (document) => document.links.filter((link) => link.target === "").map((link) => ({
        ruleId: "empty-link",
        category: "links",
        severity: "error",
        file: document.file.relativePath,
        line: link.line,
        title: "\u041F\u0443\u0441\u0442\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430",
        message: "\u0414\u043B\u044F \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0430\u0434\u0440\u0435\u0441.",
        source: link.source,
        recommendation: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u0441\u0441\u044B\u043B\u043A\u0438 \u0438\u043B\u0438 \u0443\u0434\u0430\u043B\u0438\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443."
      }))
    );
  }
};

// src/engine/rules/missingAnchor.ts
var missingAnchorRule = {
  id: "missing-anchor",
  run({ documents }) {
    const byPath = documentMap(documents);
    return documents.flatMap(
      (document) => document.links.flatMap((link) => {
        if (!link.target || isExternalTarget(link.target)) return [];
        const { path, anchor } = splitTarget(link.target);
        if (!anchor) return [];
        const resolved = resolveRelativeTarget(
          document.file.relativePath,
          path || ""
        );
        const targetDocument = byPath.get(resolved);
        if (!targetDocument) return [];
        if (targetDocument.anchors.some((item) => item.id === anchor)) return [];
        return [{
          ruleId: "missing-anchor",
          category: "links",
          severity: "error",
          file: document.file.relativePath,
          line: link.line,
          title: "\u041D\u0435\u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u044F\u043A\u043E\u0440\u044C",
          message: `\u042F\u043A\u043E\u0440\u044C #${anchor} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0444\u0430\u0439\u043B\u0435 ${resolved}.`,
          source: link.source,
          recommendation: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u044F\u043A\u043E\u0440\u044F \u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0435\u0433\u043E \u0432 \u0446\u0435\u043B\u0435\u0432\u043E\u0439 \u0440\u0430\u0437\u0434\u0435\u043B.",
          target: link.target
        }];
      })
    );
  }
};

// src/engine/rules/undesirablePhrase.ts
var undesirablePhraseRule = {
  id: "undesirable-phrase",
  run({ documents, config }) {
    return documents.flatMap(
      (document) => document.lines.flatMap(
        (lineText, index) => config.undesirablePhrases.flatMap((phraseRule) => {
          if (!lineText.toLocaleLowerCase("ru-RU").includes(phraseRule.phrase.toLocaleLowerCase("ru-RU"))) {
            return [];
          }
          return [{
            ruleId: "undesirable-phrase",
            category: "style",
            severity: "warning",
            file: document.file.relativePath,
            line: index + 1,
            title: "\u041D\u0435\u0436\u0435\u043B\u0430\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430",
            message: `\u041D\u0430\u0439\u0434\u0435\u043D\u0430 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430 \xAB${phraseRule.phrase}\xBB.`,
            source: lineText.trim(),
            recommendation: `\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u043C\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442: \xAB${phraseRule.replacement}\xBB.`
          }];
        })
      )
    );
  }
};

// src/engine/rules/skippedHeadingLevel.ts
var headingPattern = /^\s{0,3}(#{1,6})\s+(.+?)\s*$/;
var skippedHeadingLevelRule = {
  id: "skipped-heading-level",
  run({ documents }) {
    return documents.flatMap((document) => {
      const findings = [];
      let previousLevel = null;
      document.lines.forEach((lineText, index) => {
        const match = lineText.match(headingPattern);
        if (!match) return;
        const level = match[1].length;
        if (previousLevel !== null && level > previousLevel + 1) {
          findings.push({
            ruleId: "skipped-heading-level",
            category: "markdown",
            severity: "warning",
            file: document.file.relativePath,
            line: index + 1,
            title: "\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430",
            message: `\u041F\u043E\u0441\u043B\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 \u0443\u0440\u043E\u0432\u043D\u044F ${previousLevel} \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0443\u0440\u043E\u0432\u0435\u043D\u044C ${level}.`,
            source: lineText.trim(),
            recommendation: `\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u0435\u0440\u0430\u0440\u0445\u0438\u044E: \u043F\u043E\u0441\u043B\u0435 \u0443\u0440\u043E\u0432\u043D\u044F ${previousLevel} \u043E\u0431\u044B\u0447\u043D\u043E \u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u0443\u0440\u043E\u0432\u0435\u043D\u044C ${previousLevel + 1}.`
          });
        }
        previousLevel = level;
      });
      return findings;
    });
  }
};

// src/engine/rules/repeatedWord.ts
var repeatedWordPattern = /(^|[^\p{L}\p{N}_-])([\p{L}\p{N}_-]+)(\s+)\2(?=$|[^\p{L}\p{N}_-])/iu;
var inlineCodePattern = /(`+)(.*?)\1/g;
function textSegmentsOutsideInlineCode3(sourceLine) {
  const segments = [];
  let start = 0;
  for (const match of sourceLine.matchAll(inlineCodePattern)) {
    const index = match.index ?? 0;
    segments.push(sourceLine.slice(start, index));
    start = index + match[0].length;
  }
  segments.push(sourceLine.slice(start));
  return segments;
}
var repeatedWordRule = {
  id: "repeated-word",
  run({ documents }) {
    return documents.flatMap((document) => {
      const sourceLines = document.file.content.split(/\r?\n/);
      return document.lines.flatMap((lineText, index) => {
        if (!lineText) return [];
        const sourceLine = sourceLines[index] ?? lineText;
        for (const segment of textSegmentsOutsideInlineCode3(sourceLine)) {
          const match = segment.match(repeatedWordPattern);
          if (!match) continue;
          return [{
            ruleId: "repeated-word",
            category: "style",
            severity: "error",
            file: document.file.relativePath,
            line: index + 1,
            title: "\u041F\u043E\u0432\u0442\u043E\u0440 \u0441\u043B\u043E\u0432\u0430",
            message: `\u0421\u043B\u043E\u0432\u043E \xAB${match[2]}\xBB \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F \u043F\u043E\u0434\u0440\u044F\u0434.`,
            source: sourceLine.trim(),
            recommendation: "\u0423\u0434\u0430\u043B\u0438\u0442\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0435\u0435\u0441\u044F \u0441\u043B\u043E\u0432\u043E, \u0435\u0441\u043B\u0438 \u043F\u043E\u0432\u0442\u043E\u0440 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043D\u0430\u043C\u0435\u0440\u0435\u043D\u043D\u044B\u043C."
          }];
        }
        return [];
      });
    });
  }
};

// src/engine/rules/duplicateContent.ts
var MIN_DUPLICATE_LENGTH = 100;
var listItemPattern = /^\s*(?:[-*+]|\d+[.)])\s+/;
var headingPattern2 = /^\s{0,3}#{1,6}\s+/;
var includePattern = /\{%\s*include\b/i;
var fencePattern = /^\s{0,3}(`{3,}|~{3,})/;
function normalizeText(value) {
  return value.trim().replace(/\s+/g, " ");
}
function firstVisibleLine(lines) {
  return lines.find((line) => line.trim().length > 0)?.trim() ?? "";
}
function makeBlock(document, startLine, sourceLines, normalizedValue) {
  const source = sourceLines.join("\n").trim();
  const normalized = normalizedValue ?? normalizeText(source);
  if (normalized.length < MIN_DUPLICATE_LENGTH) return null;
  if (includePattern.test(source)) return null;
  return {
    file: document.file.relativePath,
    line: startLine,
    source: firstVisibleLine(sourceLines),
    normalized
  };
}
function extractBlocks(document) {
  const lines = document.file.content.split(/\r?\n/);
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (headingPattern2.test(line) || includePattern.test(line)) {
      index += 1;
      continue;
    }
    const fence = line.match(fencePattern);
    if (fence) {
      const marker = fence[1][0];
      const markerLength = fence[1].length;
      const start2 = index;
      const sourceLines2 = [line];
      const codeLines = [];
      index += 1;
      while (index < lines.length) {
        const current = lines[index];
        sourceLines2.push(current);
        const closing = current.match(fencePattern);
        if (closing && closing[1][0] === marker && closing[1].length >= markerLength) {
          index += 1;
          break;
        }
        codeLines.push(current);
        index += 1;
      }
      const block2 = makeBlock(
        document,
        start2 + 1,
        sourceLines2,
        codeLines.map((value) => value.trimEnd()).join("\n").trim()
      );
      if (block2) blocks.push(block2);
      continue;
    }
    if (listItemPattern.test(line)) {
      const start2 = index;
      const sourceLines2 = [];
      while (index < lines.length) {
        const current = lines[index];
        if (!current.trim()) break;
        if (headingPattern2.test(current) || includePattern.test(current) || fencePattern.test(current)) break;
        if (listItemPattern.test(current) || /^\s{2,}\S/.test(current)) {
          sourceLines2.push(current);
          index += 1;
          continue;
        }
        break;
      }
      const block2 = makeBlock(document, start2 + 1, sourceLines2);
      if (block2) blocks.push(block2);
      continue;
    }
    const start = index;
    const sourceLines = [];
    while (index < lines.length) {
      const current = lines[index];
      if (!current.trim() || headingPattern2.test(current) || includePattern.test(current) || listItemPattern.test(current) || fencePattern.test(current)) {
        break;
      }
      sourceLines.push(current);
      index += 1;
    }
    const block = makeBlock(document, start + 1, sourceLines);
    if (block) blocks.push(block);
    if (sourceLines.length === 0) index += 1;
  }
  return blocks;
}
function locationLabel(block, current) {
  if (block.file === current.file) {
    return `\u044D\u0442\u043E\u0442 \u0444\u0430\u0439\u043B, \u0441\u0442\u0440\u043E\u043A\u0430 ${block.line}`;
  }
  return `${block.file}, \u0441\u0442\u0440\u043E\u043A\u0430 ${block.line}`;
}
function findingsForGroup(group) {
  return group.map((current) => {
    const otherLocations = group.filter((candidate) => candidate !== current).map((candidate) => locationLabel(candidate, current)).join("; ");
    return {
      ruleId: "duplicate-content",
      category: "style",
      severity: "info",
      file: current.file,
      line: current.line,
      title: "\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0439\u0441\u044F \u043A\u043E\u043D\u0442\u0435\u043D\u0442",
      message: `\u0422\u0430\u043A\u043E\u0439 \u0436\u0435 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u043D\u0430\u0439\u0434\u0435\u043D: ${otherLocations}.`,
      source: current.source,
      recommendation: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043B\u0438 \u043F\u043E\u0432\u0442\u043E\u0440 \u043E\u0448\u0438\u0431\u043A\u043E\u0439. \u0415\u0441\u043B\u0438 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043D\u0430\u043C\u0435\u0440\u0435\u043D\u043D\u043E \u0432 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u043C\u0435\u0441\u0442\u0430\u0445 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u0438, \u0440\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0435 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u044C \u0432\u044B\u043D\u0435\u0441\u0442\u0438 \u0435\u0433\u043E \u0432 include."
    };
  });
}
var duplicateContentRule = {
  id: "duplicate-content",
  run({ documents }) {
    const groups = /* @__PURE__ */ new Map();
    for (const document of documents) {
      for (const block of extractBlocks(document)) {
        const group = groups.get(block.normalized) ?? [];
        group.push(block);
        groups.set(block.normalized, group);
      }
    }
    return [...groups.values()].filter((group) => group.length > 1).flatMap(findingsForGroup);
  }
};

// src/engine/rules/index.ts
var rules = [
  emptyAnchorRule,
  spaceBeforePunctuationRule,
  multipleSpacesRule,
  mixedAlphabetRule,
  brokenLocalLinkRule,
  missingAnchorRule,
  duplicateExplicitAnchorRule,
  emptyLinkRule,
  undesirablePhraseRule,
  // listWithoutIntroRule, // Временно отключено: слишком много ложных срабатываний.
  skippedHeadingLevelRule,
  repeatedWordRule,
  duplicateContentRule
];

// src/engine/scanner.ts
var import_promises2 = require("node:fs/promises");
var import_node_path3 = require("node:path");
async function walk(directory) {
  const entries = await (0, import_promises2.readdir)(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const path = (0, import_node_path3.join)(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...await walk(path));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      result.push(path);
    }
  }
  return result;
}
async function scanMarkdownFiles(docsRoot) {
  try {
    const rootStat = await (0, import_promises2.stat)(docsRoot);
    if (!rootStat.isDirectory()) throw new Error("not a directory");
  } catch {
    throw new Error(`\u041F\u0430\u043F\u043A\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430: ${docsRoot}`);
  }
  const paths = await walk(docsRoot);
  const files = [];
  const diagnostics = [];
  for (const absolutePath of paths) {
    const relativePath = (0, import_node_path3.relative)(docsRoot, absolutePath).replaceAll("\\", "/");
    try {
      files.push({
        absolutePath,
        relativePath,
        content: await (0, import_promises2.readFile)(absolutePath, "utf8")
      });
    } catch (error) {
      diagnostics.push({
        file: relativePath,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { files, diagnostics };
}

// src/engine/reviewProject.ts
async function reviewProject(projectRoot, docsRoot) {
  const resolved = await resolveProjectPaths(projectRoot, docsRoot);
  const scanResult = await scanMarkdownFiles(resolved.docsRoot);
  const documents = scanResult.files.map(parseMarkdown);
  const findings = [];
  const diagnostics = scanResult.diagnostics.map((diagnostic) => ({
    source: "scanner",
    message: `${diagnostic.file}: ${diagnostic.message}`
  }));
  for (const rule of rules) {
    try {
      findings.push(...rule.run({
        documents,
        config: reviewerConfig,
        projectRoot: resolved.projectRoot,
        docsRoot: resolved.docsRoot
      }));
    } catch (error) {
      diagnostics.push({
        source: "rule",
        ruleId: rule.id,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return {
    projectRoot: resolved.projectRoot,
    docsRoot: resolved.docsRoot,
    checkedFiles: scanResult.files.length,
    findings: sortFindings(findings),
    diagnostics
  };
}

// extensions/vscode/src/diagnostics.ts
var categoryLabels = {
  structure: "\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430",
  style: "\u0421\u0442\u0438\u043B\u044C",
  terminology: "\u0422\u0435\u0440\u043C\u0438\u043D\u043E\u043B\u043E\u0433\u0438\u044F",
  markdown: "Markdown",
  links: "\u0421\u0441\u044B\u043B\u043A\u0438"
};
function findingToDiagnosticData(finding, actualLine = finding.source) {
  const editorLine = Math.max(0, finding.line - 1);
  const sourceOffset = Math.max(0, actualLine.indexOf(finding.source));
  const highlight = finding.highlights?.[0];
  const startCharacter = sourceOffset + (highlight?.start ?? 0);
  const fallbackLength = Math.max(1, finding.source.length);
  const endCharacter = sourceOffset + (highlight?.end ?? fallbackLength);
  const category = categoryLabels[finding.category];
  const recommendation = finding.recommendation ? `
\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F: ${finding.recommendation}` : "";
  return {
    severity: finding.severity,
    code: finding.ruleId,
    message: `${finding.title} \xB7 ${category}
${finding.message}${recommendation}`,
    range: {
      startLine: editorLine,
      startCharacter,
      endLine: editorLine,
      endCharacter: Math.max(startCharacter + 1, endCharacter)
    }
  };
}

// extensions/vscode/src/extension.ts
var diagnosticSource = "\u0414\u043E\u043A\u0420\u0435\u0432\u044C\u044E";
function vscodeSeverity(severity) {
  switch (severity) {
    case "error":
      return vscode.DiagnosticSeverity.Error;
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
    case "info":
      return vscode.DiagnosticSeverity.Information;
  }
}
function getWorkspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}
async function getDocsRoot(projectRoot) {
  const configured = vscode.workspace.getConfiguration("docReview").get("docsRoot", "").trim();
  if (configured) {
    return (0, import_node_path4.isAbsolute)(configured) ? configured : (0, import_node_path4.join)(projectRoot, configured);
  }
  return suggestDefaultDocsRoot(projectRoot);
}
async function lineForFinding(docsRoot, finding) {
  try {
    const content = await (0, import_promises3.readFile)((0, import_node_path4.join)(docsRoot, finding.file), "utf8");
    return content.split(/\r?\n/)[finding.line - 1] ?? finding.source;
  } catch {
    return finding.source;
  }
}
async function publishFindings(collection, docsRoot, findings) {
  const grouped = /* @__PURE__ */ new Map();
  for (const finding of findings) {
    const filePath = (0, import_node_path4.join)(docsRoot, finding.file);
    const line = await lineForFinding(docsRoot, finding);
    const data = findingToDiagnosticData(finding, line);
    const range = new vscode.Range(
      data.range.startLine,
      data.range.startCharacter,
      data.range.endLine,
      data.range.endCharacter
    );
    const diagnostic = new vscode.Diagnostic(range, data.message, vscodeSeverity(data.severity));
    diagnostic.source = diagnosticSource;
    diagnostic.code = data.code;
    const diagnostics = grouped.get(filePath) ?? [];
    diagnostics.push(diagnostic);
    grouped.set(filePath, diagnostics);
  }
  collection.clear();
  for (const [filePath, diagnostics] of grouped) {
    collection.set(vscode.Uri.file(filePath), diagnostics);
  }
}
async function runFullReview(collection) {
  const projectRoot = getWorkspaceRoot();
  if (!projectRoot) {
    await vscode.window.showWarningMessage("\u0414\u043E\u043A\u0420\u0435\u0432\u044C\u044E: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u0432 VS Code.");
    return;
  }
  const docsRoot = await getDocsRoot(projectRoot);
  if (!docsRoot) {
    await vscode.window.showWarningMessage(
      "\u0414\u043E\u043A\u0420\u0435\u0432\u044C\u044E: \u043F\u0430\u043F\u043A\u0430 docs/ru \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430. \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 \xAB\u0414\u043E\u043A\u0420\u0435\u0432\u044C\u044E: \u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0443 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u0438\xBB."
    );
    return;
  }
  try {
    const result = await reviewProject(projectRoot, docsRoot);
    await publishFindings(collection, result.docsRoot, result.findings);
    const suffix = result.findings.length === 1 ? "\u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u0435" : "\u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u0439";
    await vscode.window.showInformationMessage(
      `\u0414\u043E\u043A\u0420\u0435\u0432\u044C\u044E: \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E \u0444\u0430\u0439\u043B\u043E\u0432 \u2014 ${result.checkedFiles}, \u043D\u0430\u0439\u0434\u0435\u043D\u043E ${result.findings.length} ${suffix}.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`\u0414\u043E\u043A\u0420\u0435\u0432\u044C\u044E: ${message}`);
  }
}
async function selectDocsRoot() {
  const projectRoot = getWorkspaceRoot();
  if (!projectRoot) {
    await vscode.window.showWarningMessage("\u0414\u043E\u043A\u0420\u0435\u0432\u044C\u044E: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u0432 VS Code.");
    return;
  }
  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: vscode.Uri.file(projectRoot),
    openLabel: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0443 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u0438"
  });
  const selectedPath = selected?.[0]?.fsPath;
  if (!selectedPath) return;
  const rel = (0, import_node_path4.relative)(projectRoot, selectedPath);
  if (!rel || rel === ".." || rel.startsWith("../") || rel.startsWith("..\\") || (0, import_node_path4.isAbsolute)(rel)) {
    await vscode.window.showErrorMessage(
      "\u0414\u043E\u043A\u0420\u0435\u0432\u044C\u044E: \u043F\u0430\u043F\u043A\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u0438 \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u0432\u043D\u0443\u0442\u0440\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u043E\u0433\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430."
    );
    return;
  }
  await vscode.workspace.getConfiguration("docReview").update("docsRoot", rel, vscode.ConfigurationTarget.Workspace);
  await vscode.window.showInformationMessage(`\u0414\u043E\u043A\u0420\u0435\u0432\u044C\u044E: \u043F\u0430\u043F\u043A\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u0438 \u2014 ${rel}.`);
}
function activate(context) {
  const diagnostics = vscode.languages.createDiagnosticCollection("docReview");
  context.subscriptions.push(
    diagnostics,
    vscode.commands.registerCommand("docReview.runReview", () => runFullReview(diagnostics)),
    vscode.commands.registerCommand("docReview.selectDocsRoot", selectDocsRoot)
  );
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
