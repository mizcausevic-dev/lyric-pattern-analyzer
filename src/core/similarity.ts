import { figure, round6 } from "./numbers"
import { sectionFamily } from "./parse-sections"
import { lyricTokensForSection } from "./section-tokens"
import type { NormalizationSettings, Section, SectionPairSimilarity } from "./types"

export function jaccard(a: Iterable<string>, b: Iterable<string>): number {
  const left = new Set(a)
  const right = new Set(b)
  if (left.size === 0 && right.size === 0) return 1
  let intersection = 0
  for (const item of left) {
    if (right.has(item)) intersection += 1
  }
  const union = left.size + right.size - intersection
  return union === 0 ? 1 : intersection / union
}

export function levenshtein(a: string[], b: string[]): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const dist: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0))
  for (let i = 0; i < rows; i += 1) dist[i][0] = i
  for (let j = 0; j < cols; j += 1) dist[0][j] = j
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost)
    }
  }
  return dist[a.length][b.length]
}

export function normalizedEditDistance(a: string[], b: string[]): number {
  const denom = Math.max(a.length, b.length)
  if (denom === 0) return 0
  return levenshtein(a, b) / denom
}

export function pairwiseSectionSimilarity(
  sections: Section[],
  locale: string,
  mode: "word" | "character",
  settings: NormalizationSettings
): SectionPairSimilarity[] {
  const byFamily = new Map<string, Section[]>()
  for (const section of sections) {
    const family = sectionFamily(section.label)
    const list = byFamily.get(family) ?? []
    list.push(section)
    byFamily.set(family, list)
  }
  const pairs: SectionPairSimilarity[] = []
  for (const [family, group] of byFamily) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const left = lyricTokensForSection(group[i], locale, mode, settings)
        const right = lyricTokensForSection(group[j], locale, mode, settings)
        const bothEmpty = left.length === 0 && right.length === 0
        const jac = bothEmpty ? null : round6(jaccard(left, right))
        const ned = bothEmpty ? null : round6(normalizedEditDistance(left, right))
        pairs.push({
          label: family,
          leftIndex: group[i].index,
          rightIndex: group[j].index,
          jaccard: figure(
            "token-set Jaccard (higher = more overlap)",
            jac,
            2,
            bothEmpty
              ? "Both sections empty. Not reported. n is the pair of sections, not token count. This is not a quality score."
              : "n is the pair of sections, not token count. Higher is more overlap. This is not a quality score."
          ),
          normalizedEditDistance: figure(
            "normalized edit distance (higher = farther)",
            ned,
            2,
            bothEmpty
              ? "Both sections empty. Not reported. n is the pair of sections. This is not a quality score."
              : "n is the pair of sections. Higher is farther. This is not a quality score."
          )
        })
      }
    }
  }
  return pairs.sort((a, b) => a.label.localeCompare(b.label) || a.leftIndex - b.leftIndex || a.rightIndex - b.rightIndex)
}
