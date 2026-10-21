import type { Section } from "./types"

const BRACKET_HEADER = /^\s*\[([^\]]*)\]\s*$/
const BARE_HEADER =
  /^\s*(verse|chorus|hook|bridge|outro|intro|pre-?chorus|pre-?hook|refrain|tag|break|interlude)(?:\s+\d+)?(?:\s*\([^)]+\))?\s*$/i

function matchHeader(line: string): string | null {
  const bracket = line.match(BRACKET_HEADER)
  if (bracket) {
    const raw = bracket[1].trim()
    return raw.length > 0 ? raw : "(empty label)"
  }
  const bare = line.match(BARE_HEADER)
  if (bare) return line.trim()
  return null
}

export function parseSections(text: string): Section[] {
  const rawLines = text.split(/\r?\n/)
  const sections: Section[] = []
  let current: Section | null = null

  function start(label: string, rawLabel: string | null, startLine: number): void {
    current = {
      index: sections.length,
      label,
      rawLabel,
      startLine,
      lines: []
    }
    sections.push(current)
  }

  rawLines.forEach((line, index) => {
    const lineNo = index + 1
    const header = matchHeader(line)
    if (header) {
      start(header, header === "(empty label)" ? "" : header, lineNo)
      return
    }
    if (!current) start("(unlabeled)", null, 1)
    if (line.trim().length === 0) return
    sections[sections.length - 1].lines.push(line)
  })

  if (sections.length === 0) {
    return [{ index: 0, label: "(unlabeled)", rawLabel: null, startLine: 1, lines: [] }]
  }
  return sections
}

export function lyricLines(sections: Section[]): string[] {
  return sections.flatMap((section) => section.lines)
}

export function sectionFamily(label: string): string {
  return label
    .replace(/\s*\([^)]*\)\s*$/u, "")
    .replace(/\s+\d+\s*$/u, "")
    .trim()
    .toLocaleLowerCase("en")
}
