import type { LineDiff } from "./types"

export function lineDiff(left: string[], right: string[]): LineDiff[] {
  const n = left.length
  const m = right.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = left[i] === right[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: LineDiff[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (left[i] === right[j]) {
      out.push({ kind: "equal", text: left[i], leftLine: i + 1, rightLine: j + 1 })
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "remove", text: left[i], leftLine: i + 1, rightLine: null })
      i += 1
    } else {
      out.push({ kind: "add", text: right[j], leftLine: null, rightLine: j + 1 })
      j += 1
    }
  }
  while (i < n) {
    out.push({ kind: "remove", text: left[i], leftLine: i + 1, rightLine: null })
    i += 1
  }
  while (j < m) {
    out.push({ kind: "add", text: right[j], leftLine: null, rightLine: j + 1 })
    j += 1
  }
  return out
}
