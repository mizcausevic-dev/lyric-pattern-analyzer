import { figure, mean, round6 } from "./numbers"
import type { Figure } from "./types"

export const DEFAULT_MATTR_WINDOW = 50

export function typeTokenRatio(tokens: string[]): { ttr: Figure; types: number } {
  const n = tokens.length
  if (n === 0) {
    return {
      types: 0,
      ttr: figure("plain TTR", null, 0, "No tokens.")
    }
  }
  const types = new Set(tokens).size
  return {
    types,
    ttr: figure(
      "plain TTR",
      round6(types / n),
      n,
      "Plain type-token ratio falls as a text gets longer even when vocabulary is stable. n is token count. This is not a quality score."
    )
  }
}

export function movingAverageTtr(tokens: string[], windowSize = DEFAULT_MATTR_WINDOW): Figure {
  const n = tokens.length
  if (windowSize < 1) {
    return figure("MATTR", null, n, "Window size must be at least 1.")
  }
  if (n < windowSize) {
    return figure("MATTR", "insufficient length", n, `Need at least ${windowSize} tokens for window size ${windowSize}. n is token count. This is not a quality score.`)
  }
  const windowTtrs: number[] = []
  for (let i = 0; i <= n - windowSize; i += 1) {
    const window = tokens.slice(i, i + windowSize)
    windowTtrs.push(new Set(window).size / windowSize)
  }
  const value = mean(windowTtrs)
  return figure(
    "MATTR",
    value === null ? null : round6(value),
    windowTtrs.length,
    "n is the number of overlapping windows. This is not a quality score."
  )
}
