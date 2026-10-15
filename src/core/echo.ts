import { normalizeToken } from "./normalize"
import { figure, round6 } from "./numbers"
import type { EchoStats, NormalizationSettings } from "./types"

function lastWord(line: string, locale: string, settings: NormalizationSettings): string | null {
  const tokens = line
    .split(/\s+/u)
    .map((token) => normalizeToken(token, settings, locale))
    .filter((token) => token.length > 0)
  return tokens[tokens.length - 1] ?? null
}

function sharesSuffix(a: string, b: string, suffixLength: number): boolean {
  if (a === b) return true
  if (suffixLength < 1) return false
  if (a.length < suffixLength || b.length < suffixLength) return false
  return a.slice(-suffixLength) === b.slice(-suffixLength)
}

export const DEFAULT_ECHO_SUFFIX = 2

export function orthographicEcho(
  lines: string[],
  suffixLength: number,
  settings: NormalizationSettings,
  locale: string
): EchoStats {
  const last = lines.map((line) => lastWord(line, locale, settings))
  let adjacentHits = 0
  let adjacentPairs = 0
  for (let i = 0; i < last.length - 1; i += 1) {
    const a = last[i]
    const b = last[i + 1]
    if (!a || !b) continue
    adjacentPairs += 1
    if (sharesSuffix(a, b, suffixLength)) adjacentHits += 1
  }
  let alternatingHits = 0
  let alternatingPairs = 0
  for (let i = 0; i < last.length - 2; i += 1) {
    const a = last[i]
    const b = last[i + 2]
    if (!a || !b) continue
    alternatingPairs += 1
    if (sharesSuffix(a, b, suffixLength)) alternatingHits += 1
  }
  const combinedHits = adjacentHits + alternatingHits
  const combinedPairs = adjacentPairs + alternatingPairs
  const note =
    "Orthographic echo is identity or a shared written suffix of the chosen length on the last word of adjacent or alternating lines. It is not rhyme. True rhyme and syllable counts need a pronunciation dictionary, which this build does not ship."
  return {
    label: "orthographic echo",
    suffixLength,
    adjacentShare: figure(
      "orthographic echo (adjacent)",
      adjacentPairs === 0 ? null : round6(adjacentHits / adjacentPairs),
      adjacentPairs
    ),
    alternatingShare: figure(
      "orthographic echo (alternating)",
      alternatingPairs === 0 ? null : round6(alternatingHits / alternatingPairs),
      alternatingPairs
    ),
    combinedShare: figure(
      "orthographic echo",
      combinedPairs === 0 ? null : round6(combinedHits / combinedPairs),
      combinedPairs,
      note
    ),
    note
  }
}
