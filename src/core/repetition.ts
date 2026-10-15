import { normalizeLine } from "./normalize"
import { figure, round6 } from "./numbers"
import type { NormalizationSettings, NgramCount, RepeatedLineGroup, RepetitionStats } from "./types"

export function ngramCounts(tokens: string[], n: number): NgramCount[] {
  if (n < 1 || tokens.length < n) return []
  const counts = new Map<string, number>()
  for (let i = 0; i <= tokens.length - n; i += 1) {
    const gram = tokens.slice(i, i + n).join(" ")
    counts.set(gram, (counts.get(gram) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([gram, count]) => ({ n, gram, count }))
    .sort((a, b) => b.count - a.count || a.gram.localeCompare(b.gram))
}

export function repeatedNgrams(tokens: string[], sizes: number[] = [3, 4, 5]): NgramCount[] {
  return sizes.flatMap((n) => ngramCounts(tokens, n).filter((item) => item.count >= 2))
}

export function lineRepetition(lines: string[], settings: NormalizationSettings, locale: string): RepetitionStats {
  const total = lines.length
  const groups = new Map<string, number>()
  for (const line of lines) {
    const key = normalizeLine(line, settings, locale)
    if (key.length === 0) continue
    groups.set(key, (groups.get(key) ?? 0) + 1)
  }
  const repeated: RepeatedLineGroup[] = [...groups.entries()]
    .filter(([, count]) => count >= 2)
    .map(([normalized, count]) => ({
      normalized,
      count,
      share: figure("line group share", total === 0 ? null : round6(count / total), total)
    }))
    .sort((a, b) => b.count - a.count || a.normalized.localeCompare(b.normalized))

  const repeatedLineCount = repeated.reduce((sum, group) => sum + group.count, 0)
  const mostRepeated = repeated[0] ?? null

  return {
    repeatedLineGroups: repeated,
    mostRepeated,
    repeatShare: figure(
      "repeat share",
      total === 0 ? null : round6(repeatedLineCount / total),
      total,
      "Lines belonging to repeated line groups / total lyric lines, after the shown normalization. n is lyric line count. This is not a quality score."
    ),
    ngrams: []
  }
}
