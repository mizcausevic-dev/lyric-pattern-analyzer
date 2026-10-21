export type TokenizationMode = "word" | "character"

export interface NormalizationSettings {
  nfc: boolean
  casefold: boolean
  stripPunctuation: boolean
}

export interface Figure<T = number | string | null> {
  value: T
  n: number
  label: string
  note?: string
}

export interface Section {
  index: number
  label: string
  rawLabel: string | null
  startLine: number
  lines: string[]
}

export interface TokenizationResult {
  mode: TokenizationMode
  locale: string
  tokens: string[]
  unsupportedWordMetrics: boolean
  unsupportedReason?: string
  segmenter: "Intl.Segmenter"
}

export interface LineStats {
  lineCount: Figure
  wordCount: Figure
  sectionCount: Figure
  wordsPerLine: {
    mean: Figure
    median: Figure
    min: Figure
    max: Figure
    stdev: Figure
    values: number[]
  }
}

export interface VarietyStats {
  mattr: Figure
  mattrWindow: number
  ttr: Figure
  ttrLengthWarning: string
}

export interface RepeatedLineGroup {
  normalized: string
  count: number
  share: Figure
}

export interface NgramCount {
  n: number
  gram: string
  count: number
}

export interface RepetitionStats {
  repeatedLineGroups: RepeatedLineGroup[]
  mostRepeated: RepeatedLineGroup | null
  repeatShare: Figure
  ngrams: NgramCount[]
}

export interface SectionPairSimilarity {
  label: string
  leftIndex: number
  rightIndex: number
  jaccard: Figure
  normalizedEditDistance: Figure
}

export interface EchoStats {
  label: "orthographic echo"
  suffixLength: number
  adjacentShare: Figure
  alternatingShare: Figure
  combinedShare: Figure
  note: string
}

export interface AnalysisReport {
  language: string
  tokenization: TokenizationResult
  normalization: {
    settings: NormalizationSettings
    applied: string[]
  }
  sections: Section[]
  lineStats: LineStats
  variety: VarietyStats
  repetition: RepetitionStats
  sectionSimilarity: SectionPairSimilarity[]
  echo: EchoStats
  rhyme: Figure
  syllables: Figure
  disclaimers: string[]
}

export interface LineDiff {
  kind: "equal" | "add" | "remove"
  text: string
  leftLine: number | null
  rightLine: number | null
}

export interface StatDelta {
  key: string
  label: string
  left: Figure
  right: Figure
  delta: number | null
  note: string
}

export interface ComparisonReport {
  leftName: string
  rightName: string
  diff: LineDiff[]
  deltas: StatDelta[]
  disclaimer: string
}

export const QUALITY_DISCLAIMER =
  "A change in a statistic is not a change in quality. This tool does not score, suggest, or generate lyrics."

export const OWNERSHIP_NOTICE =
  "Importing lyrics you do not own is your responsibility. This app stores drafts on this machine only. Exports omit lyric text unless you opt in to snippets."

export const PREVIEW_PRIVACY_NOTICE =
  "This browser preview is a public page. The Wolf stay quiet loads are a user-supplied sample on this page. Do not paste other unreleased lyrics here. Use the desktop app for drafts that must stay on your machine."
