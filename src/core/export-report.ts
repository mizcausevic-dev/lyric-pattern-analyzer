import { csvRow } from "./csv"
import { QUALITY_DISCLAIMER, type AnalysisReport, type ComparisonReport, type Figure } from "./types"

export interface ExportOptions {
  includeSnippets: boolean
  formulaMitigated: boolean
  warningAcknowledged: boolean
}

function figureText(fig: Figure): string {
  const value = fig.value === null ? "n/a" : String(fig.value)
  return `${value} (n=${fig.n})`
}

function collectFigures(report: AnalysisReport): Array<{ key: string; figure: Figure }> {
  const rows: Array<{ key: string; figure: Figure }> = [
    { key: "lines", figure: report.lineStats.lineCount },
    { key: "words_or_characters", figure: report.lineStats.wordCount },
    { key: "sections", figure: report.lineStats.sectionCount },
    { key: "wpl_mean", figure: report.lineStats.wordsPerLine.mean },
    { key: "wpl_median", figure: report.lineStats.wordsPerLine.median },
    { key: "wpl_min", figure: report.lineStats.wordsPerLine.min },
    { key: "wpl_max", figure: report.lineStats.wordsPerLine.max },
    { key: "wpl_stdev", figure: report.lineStats.wordsPerLine.stdev },
    { key: "mattr", figure: report.variety.mattr },
    { key: "ttr", figure: report.variety.ttr },
    { key: "repeat_share", figure: report.repetition.repeatShare },
    { key: "echo_adjacent", figure: report.echo.adjacentShare },
    { key: "echo_alternating", figure: report.echo.alternatingShare },
    { key: "echo_combined", figure: report.echo.combinedShare },
    { key: "rhyme", figure: report.rhyme },
    { key: "syllables", figure: report.syllables }
  ]
  if (report.repetition.mostRepeated) {
    rows.push({ key: "most_repeated_share", figure: report.repetition.mostRepeated.share })
  }
  return rows
}

export function exportJson(report: AnalysisReport, options: ExportOptions): string {
  const payload = {
    kind: "lyric-pattern-analyzer-report",
    version: "0.1.0",
    language: report.language,
    tokenizationMode: report.tokenization.mode,
    normalization: report.normalization,
    disclaimers: report.disclaimers,
    figures: collectFigures(report).map((row) => ({
      key: row.key,
      label: row.figure.label,
      value: row.figure.value,
      n: row.figure.n,
      note: row.figure.note ?? null
    })),
    ngrams: report.repetition.ngrams.map((item) => ({
      n: item.n,
      count: item.count,
      gram: options.includeSnippets ? item.gram : null
    })),
    repeatedLineGroupCounts: report.repetition.repeatedLineGroups.map((group) => ({
      count: group.count,
      share: group.share.value,
      n: group.share.n,
      normalized: options.includeSnippets ? group.normalized : null
    })),
    sectionSimilarity: report.sectionSimilarity.map((pair) => ({
      label: pair.label,
      leftIndex: pair.leftIndex,
      rightIndex: pair.rightIndex,
      jaccard: pair.jaccard.value,
      jaccardN: pair.jaccard.n,
      normalizedEditDistance: pair.normalizedEditDistance.value,
      editN: pair.normalizedEditDistance.n
    })),
    snippets: options.includeSnippets
      ? {
          warning: "This export includes lyric snippets you selected. Treat it as unpublished work.",
          sections: report.sections.map((section) => ({
            label: section.label,
            lines: section.lines
          }))
        }
      : null
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}

export function exportMarkdown(report: AnalysisReport, options: ExportOptions, title: string): string {
  const lines: string[] = [
    `# Lyric pattern report: ${escapeMd(title)}`,
    "",
    QUALITY_DISCLAIMER,
    "",
    `- Language recorded: ${escapeMd(report.language)}`,
    `- Tokenization: ${report.tokenization.mode === "character" ? "character-based (labeled)" : "word"} via ${report.tokenization.segmenter}`,
    `- Normalization applied: ${report.normalization.applied.join(", ") || "none"}`,
    `- MATTR window: ${report.variety.mattrWindow}`,
    `- Orthographic echo suffix length: ${report.echo.suffixLength}`,
    ""
  ]
  if (report.tokenization.unsupportedWordMetrics) {
    lines.push(`Word-based metrics: unsupported. ${report.tokenization.unsupportedReason ?? ""}`, "")
  }
  lines.push("## Figures", "", "| Statistic | Value | n | Note |", "| --- | --- | --- | --- |")
  for (const row of collectFigures(report)) {
    lines.push(
      `| ${escapeMd(row.figure.label)} | ${escapeMd(String(row.figure.value ?? "n/a"))} | ${row.figure.n} | ${escapeMd(row.figure.note ?? "")} |`
    )
  }
  lines.push("", "## Repeated n-grams (n=3..5, count ≥ 2)", "")
  if (report.repetition.ngrams.length === 0) {
    lines.push("None.")
  } else {
    lines.push("| n | Count | Gram |", "| --- | --- | --- |")
    for (const gram of report.repetition.ngrams) {
      const gramText = options.includeSnippets ? escapeMd(gram.gram) : `(${gram.n}-gram omitted)`
      lines.push(`| ${gram.n} | ${gram.count} | ${gramText} |`)
    }
  }
  lines.push("", "## Section similarity (same label family)", "")
  if (report.sectionSimilarity.length === 0) {
    lines.push("No same-label pairs.")
  } else {
    lines.push("| Label family | Pair | Jaccard (n=2) | Normalized edit distance (n=2) |", "| --- | --- | --- | --- |")
    for (const pair of report.sectionSimilarity) {
      lines.push(
        `| ${escapeMd(pair.label)} | ${pair.leftIndex + 1}–${pair.rightIndex + 1} | ${pair.jaccard.value} | ${pair.normalizedEditDistance.value} |`
      )
    }
  }
  if (options.includeSnippets) {
    lines.push("", "## Snippets (opt-in)", "", "> Warning: this section contains lyric text.", "")
    for (const section of report.sections) {
      lines.push(`### ${escapeMd(section.label)}`, "")
      for (const line of section.lines) lines.push(escapeMd(line))
      lines.push("")
    }
  } else {
    lines.push("", "Lyric text omitted (default).", "")
  }
  return `${lines.join("\n")}\n`
}

export function exportCsv(report: AnalysisReport, options: ExportOptions): string {
  const mitigated = options.formulaMitigated
  const rows = [csvRow(["key", "label", "value", "n", "note"], mitigated)]
  for (const row of collectFigures(report)) {
    rows.push(
      csvRow(
        [row.key, row.figure.label, String(row.figure.value ?? ""), String(row.figure.n), row.figure.note ?? ""],
        mitigated
      )
    )
  }
  rows.push(csvRow(["ngram_count", "repeated n-grams listed", String(report.repetition.ngrams.length), String(report.repetition.ngrams.length), "grams omitted unless snippets on"], mitigated))
  if (options.includeSnippets) {
    rows.push(csvRow(["snippet_warning", "lyric snippets", "included", "0", "Treat as unpublished work"], mitigated))
  }
  return `${rows.join("\n")}\n`
}

export function exportComparisonMarkdown(report: ComparisonReport, options: ExportOptions): string {
  const lines = [
    `# Draft comparison: ${escapeMd(report.leftName)} vs ${escapeMd(report.rightName)}`,
    "",
    report.disclaimer,
    "",
    "## Statistic change",
    "",
    "| Statistic | Left | n left | Right | n right | Delta |",
    "| --- | --- | --- | --- | --- | --- |"
  ]
  for (const delta of report.deltas) {
    lines.push(
      `| ${escapeMd(delta.label)} | ${escapeMd(String(delta.left.value ?? "n/a"))} | ${delta.left.n} | ${escapeMd(String(delta.right.value ?? "n/a"))} | ${delta.right.n} | ${delta.delta === null ? "n/a" : delta.delta} |`
    )
  }
  lines.push("", "## Line-level diff")
  if (!options.includeSnippets) {
    const adds = report.diff.filter((row) => row.kind === "add").length
    const removes = report.diff.filter((row) => row.kind === "remove").length
    const equals = report.diff.filter((row) => row.kind === "equal").length
    lines.push("", `Equal lines: ${equals}. Added: ${adds}. Removed: ${removes}. Lyric text omitted.`)
  } else {
    lines.push("", "> Warning: diff text is lyric content.", "")
    for (const row of report.diff) {
      const mark = row.kind === "add" ? "+" : row.kind === "remove" ? "-" : " "
      lines.push(`    ${mark} ${escapeMd(row.text)}`)
    }
  }
  return `${lines.join("\n")}\n`
}

export function exportComparisonJson(report: ComparisonReport, options: ExportOptions): string {
  return `${JSON.stringify(
    {
      kind: "lyric-pattern-analyzer-comparison",
      version: "0.1.0",
      leftName: report.leftName,
      rightName: report.rightName,
      disclaimer: report.disclaimer,
      deltas: report.deltas.map((delta) => ({
        key: delta.key,
        label: delta.label,
        left: delta.left,
        right: delta.right,
        delta: delta.delta
      })),
      diff: options.includeSnippets
        ? report.diff
        : {
            equal: report.diff.filter((row) => row.kind === "equal").length,
            add: report.diff.filter((row) => row.kind === "add").length,
            remove: report.diff.filter((row) => row.kind === "remove").length,
            textOmitted: true
          }
    },
    null,
    2
  )}\n`
}

export function exportComparisonCsv(report: ComparisonReport, options: ExportOptions): string {
  const rows = [
    csvRow(["disclaimer", report.disclaimer, "", "", "", "", ""], options.formulaMitigated),
    csvRow(["key", "label", "left", "n_left", "right", "n_right", "delta"], options.formulaMitigated)
  ]
  for (const delta of report.deltas) {
    rows.push(
      csvRow(
        [
          delta.key,
          delta.label,
          String(delta.left.value ?? ""),
          String(delta.left.n),
          String(delta.right.value ?? ""),
          String(delta.right.n),
          String(delta.delta ?? "")
        ],
        options.formulaMitigated
      )
    )
  }
  return `${rows.join("\n")}\n`
}

function escapeMd(value: string): string {
  return value.replace(/[<>|]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "|": "\\|" }[ch] ?? ch))
}

export { figureText }
