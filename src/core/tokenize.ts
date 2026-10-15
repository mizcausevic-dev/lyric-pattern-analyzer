import { normalizeToken } from "./normalize"
import type { NormalizationSettings, TokenizationMode, TokenizationResult } from "./types"

const UNSPACED_SCRIPT = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Thai}|\p{Script=Lao}|\p{Script=Khmer}|\p{Script=Myanmar}/u

export function hasUnspacedScript(text: string): boolean {
  return UNSPACED_SCRIPT.test(text)
}

function requireSegmenter(): typeof Intl.Segmenter {
  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") {
    throw new Error("Intl.Segmenter is required for tokenization on this platform.")
  }
  return Intl.Segmenter
}

export function tokenize(text: string, locale: string, mode: TokenizationMode, settings: NormalizationSettings): TokenizationResult {
  const Segmenter = requireSegmenter()
  const unspaced = hasUnspacedScript(text)
  if (mode === "word" && unspaced) {
    return {
      mode,
      locale,
      tokens: [],
      unsupportedWordMetrics: true,
      unsupportedReason:
        "Word-based metrics are unsupported for scripts that do not separate words with spaces (for example Chinese and Japanese). Select character-based mode, which is labeled as such.",
      segmenter: "Intl.Segmenter"
    }
  }

  const granularity = mode === "word" ? "word" : "grapheme"
  const segmenter = new Segmenter(locale, { granularity })
  const tokens: string[] = []
  for (const part of segmenter.segment(text)) {
    const raw = part.segment
    if (mode === "word") {
      if (!part.isWordLike) continue
      const normalized = normalizeToken(raw, settings, locale)
      if (normalized.length > 0) tokens.push(normalized)
      continue
    }
    if (/^\s+$/u.test(raw)) continue
    const normalized = normalizeToken(raw, settings, locale)
    if (normalized.length > 0) tokens.push(normalized)
  }

  return {
    mode,
    locale,
    tokens,
    unsupportedWordMetrics: false,
    segmenter: "Intl.Segmenter"
  }
}
