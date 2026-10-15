import { analyzeDraft, type AnalyzeOptions } from "./analyze"
import { lineDiff } from "./diff"
import { lyricLines, parseSections } from "./parse-sections"
import { QUALITY_DISCLAIMER, type ComparisonReport, type Figure, type StatDelta } from "./types"

function numeric(value: Figure["value"]): number | null {
  return typeof value === "number" ? value : null
}

function delta(key: string, label: string, left: Figure, right: Figure): StatDelta {
  const a = numeric(left.value)
  const b = numeric(right.value)
  return {
    key,
    label,
    left,
    right,
    delta: a === null || b === null ? null : Number((b - a).toFixed(6)),
    note: QUALITY_DISCLAIMER
  }
}

export function compareDrafts(
  leftName: string,
  leftText: string,
  rightName: string,
  rightText: string,
  options: AnalyzeOptions
): ComparisonReport {
  const left = analyzeDraft(leftText, options)
  const right = analyzeDraft(rightText, options)
  const leftLines = lyricLines(parseSections(leftText))
  const rightLines = lyricLines(parseSections(rightText))
  return {
    leftName,
    rightName,
    diff: lineDiff(leftLines, rightLines),
    deltas: [
      delta("lines", left.lineStats.lineCount.label, left.lineStats.lineCount, right.lineStats.lineCount),
      delta("words", left.lineStats.wordCount.label, left.lineStats.wordCount, right.lineStats.wordCount),
      delta("sections", left.lineStats.sectionCount.label, left.lineStats.sectionCount, right.lineStats.sectionCount),
      delta("wpl_mean", left.lineStats.wordsPerLine.mean.label, left.lineStats.wordsPerLine.mean, right.lineStats.wordsPerLine.mean),
      delta("wpl_median", left.lineStats.wordsPerLine.median.label, left.lineStats.wordsPerLine.median, right.lineStats.wordsPerLine.median),
      delta("mattr", left.variety.mattr.label, left.variety.mattr, right.variety.mattr),
      delta("ttr", left.variety.ttr.label, left.variety.ttr, right.variety.ttr),
      delta("repeat_share", left.repetition.repeatShare.label, left.repetition.repeatShare, right.repetition.repeatShare),
      delta("echo", left.echo.combinedShare.label, left.echo.combinedShare, right.echo.combinedShare)
    ],
    disclaimer: QUALITY_DISCLAIMER
  }
}
