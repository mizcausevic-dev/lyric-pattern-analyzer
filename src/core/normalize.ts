import type { NormalizationSettings } from "./types"

const PUNCT_RE = /\p{P}+/gu

export const DEFAULT_NORMALIZATION: NormalizationSettings = {
  nfc: true,
  casefold: true,
  stripPunctuation: true
}

export function appliedSteps(settings: NormalizationSettings): string[] {
  const steps: string[] = []
  if (settings.nfc) steps.push("NFC")
  if (settings.casefold) steps.push("casefold")
  if (settings.stripPunctuation) steps.push("punctuation-strip")
  return steps
}

export function normalizeText(text: string, settings: NormalizationSettings, locale: string): string {
  let out = text
  if (settings.nfc) out = out.normalize("NFC")
  if (settings.casefold) out = out.toLocaleLowerCase(locale)
  if (settings.stripPunctuation) out = out.replace(PUNCT_RE, " ")
  return out.replace(/\s+/g, " ").trim()
}

export function normalizeToken(token: string, settings: NormalizationSettings, locale: string): string {
  let out = token
  if (settings.nfc) out = out.normalize("NFC")
  if (settings.casefold) out = out.toLocaleLowerCase(locale)
  if (settings.stripPunctuation) out = out.replace(PUNCT_RE, "")
  return out
}

export function normalizeLine(line: string, settings: NormalizationSettings, locale: string): string {
  return normalizeText(line, settings, locale)
}
