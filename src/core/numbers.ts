import type { Figure } from "./types"

export function figure<T extends number | string | null>(label: string, value: T, n: number, note?: string): Figure<T> {
  return { label, value, n, note }
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function minValue(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.min(...values)
}

export function maxValue(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.max(...values)
}

export function populationStdev(values: number[]): number | null {
  if (values.length === 0) return null
  const m = mean(values)
  if (m === null) return null
  const variance = values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export function round6(value: number): number {
  return Number(value.toFixed(6))
}
