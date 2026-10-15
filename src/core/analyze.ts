import { DEFAULT_ECHO_SUFFIX, orthographicEcho } from "./echo"
import { DEFAULT_MATTR_WINDOW, movingAverageTtr, typeTokenRatio } from "./mattr"
import { figure, maxValue, mean, median, minValue, populationStdev, round6 } from "./numbers"
import { appliedSteps, DEFAULT_NORMALIZATION } from "./normalize"
import { lyricLines, parseSections } from "./parse-sections"
import { lineRepetition, repeatedNgrams } from "./repetition"
import { pairwiseSectionSimilarity } from "./similarity"
import { tokenize } from "./tokenize"
import {
  QUALITY_DISCLAIMER,
  type AnalysisReport,
  type NormalizationSettings,
  type TokenizationMode
} from "./types"

export interface AnalyzeOptions {
  language: string
  tokenizationMode: TokenizationMode
  mattrWindow?: number
  echoSuffixLength?: number
  normalization?: NormalizationSettings
}

const UNSUPPORTED_DICT =
  "Unsupported without a user-supplied pronunciation dictionary whose license the user has verified. This build ships none. Results would be labeled approximate."

export function analyzeDraft(text: string, options: AnalyzeOptions): AnalysisReport {
  const language = options.language.trim() || "und"
  const settings = options.normalization ?? DEFAULT_NORMALIZATION
  const mattrWindow = options.mattrWindow ?? DEFAULT_MATTR_WINDOW
  const echoSuffixLength = options.echoSuffixLength ?? DEFAULT_ECHO_SUFFIX
  const sections = parseSections(text)
  const lines = lyricLines(sections)
  const tokenization = tokenize(lines.join("\n"), language, options.tokenizationMode, settings)
  const unsupported = tokenization.unsupportedWordMetrics
  const perLineCounts = unsupported
    ? []
    : lines.map((line) => tokenize(line, language, options.tokenizationMode, settings).tokens.length)
  const wordCount = unsupported ? 0 : tokenization.tokens.length
  const lineN = lines.length
  const lineStats = {
    lineCount: figure("lines", lineN, lineN),
    wordCount: figure(
      options.tokenizationMode === "character" ? "characters (character-based mode)" : "words",
      unsupported ? null : wordCount,
      unsupported ? 0 : wordCount,
      unsupported ? tokenization.unsupportedReason : options.tokenizationMode === "character" ? "Character-based mode. These are not word counts." : undefined
    ),
    sectionCount: figure("sections", sections.length, sections.length),
    wordsPerLine: {
      mean: figure("words per line mean", unsupported ? null : roundNullable(mean(perLineCounts)), lineN),
      median: figure("words per line median", unsupported ? null : roundNullable(median(perLineCounts)), lineN),
      min: figure("words per line min", unsupported ? null : minValue(perLineCounts), lineN),
      max: figure("words per line max", unsupported ? null : maxValue(perLineCounts), lineN),
      stdev: figure(
        "words per line standard deviation (population)",
        unsupported ? null : roundNullable(populationStdev(perLineCounts)),
        lineN
      ),
      values: perLineCounts
    }
  }

  const variety = unsupported
    ? {
        mattr: figure("MATTR", null, 0, tokenization.unsupportedReason),
        mattrWindow,
        ttr: figure("plain TTR", null, 0, tokenization.unsupportedReason),
        ttrLengthWarning: "Plain TTR is omitted because word-based metrics are unsupported for this text in word mode."
      }
    : {
        mattr: movingAverageTtr(tokenization.tokens, mattrWindow),
        mattrWindow,
        ttr: typeTokenRatio(tokenization.tokens).ttr,
        ttrLengthWarning:
          "Plain type-token ratio falls as text length grows. It is shown with this warning and is not a quality score."
      }

  const repetition = unsupported
    ? {
        repeatedLineGroups: [],
        mostRepeated: null,
        repeatShare: figure("repeat share", null, lineN, tokenization.unsupportedReason),
        ngrams: []
      }
    : {
        ...lineRepetition(lines, settings, language),
        ngrams: repeatedNgrams(tokenization.tokens, [3, 4, 5])
      }

  const sectionSimilarity = unsupported
    ? []
    : pairwiseSectionSimilarity(sections, language, options.tokenizationMode, settings)

  const echo = orthographicEcho(lines, echoSuffixLength, settings, language)

  return {
    language,
    tokenization,
    normalization: { settings, applied: appliedSteps(settings) },
    sections,
    lineStats,
    variety,
    repetition,
    sectionSimilarity,
    echo,
    rhyme: figure("rhyme", "unsupported", 0, UNSUPPORTED_DICT),
    syllables: figure("syllable counts", "unsupported", 0, UNSUPPORTED_DICT),
    disclaimers: [
      QUALITY_DISCLAIMER,
      "Orthographic echo is not rhyme.",
      "No pronunciation dictionary is bundled.",
      "Exports omit lyric text unless snippets are selected."
    ]
  }
}

function roundNullable(value: number | null): number | null {
  return value === null ? null : round6(value)
}

export { DEFAULT_MATTR_WINDOW, DEFAULT_ECHO_SUFFIX, DEFAULT_NORMALIZATION }
