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

function maskInlineCode(line: string): string {
  return line.replace(/(`+)(.*?)\1/g, (match) => ' '.repeat(match.length));
}

function analysisLines(content: string): string[] {
  const sourceLines = content.split(/\r?\n/);
  let fence: {marker: '`' | '~'; length: number} | null = null;

  return sourceLines.map((line) => {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[1][0] as '`' | '~';
      const length = fenceMatch[1].length;

      if (!fence) {
        fence = {marker, length};
        return '';
      }

      if (fence.marker === marker && length >= fence.length) {
        fence = null;
        return '';
      }
    }

    if (fence) return '';
    return maskInlineCode(line);
  });
}

export function parseMarkdown(file: ProjectFile): ParsedDocument {
  const lines = analysisLines(file.content);
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
