import type { Section } from "./types"

const HEADER = /^\s*\[([^\]]*)\]\s*$/

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
    const header = line.match(HEADER)
    if (header) {
      const raw = header[1].trim()
      const label = raw.length > 0 ? raw : "(empty label)"
      start(label, raw.length > 0 ? raw : "", lineNo)
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
  return label.replace(/\s+\d+\s*$/u, "").trim().toLocaleLowerCase("en")
}
