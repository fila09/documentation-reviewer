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
