import { tokenize } from "./tokenize"
import type { NormalizationSettings, Section } from "./types"

export function lyricTokensForSection(
  section: Section,
  locale: string,
  mode: "word" | "character",
  settings: NormalizationSettings
): string[] {
  const joined = section.lines.join("\n")
  return tokenize(joined, locale, mode, settings).tokens
}
