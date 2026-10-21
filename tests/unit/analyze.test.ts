import { describe, expect, it } from "vitest"
import { analyzeDraft } from "../../src/core/analyze"
import { compareDrafts } from "../../src/core/compare"
import { mitigateCell } from "../../src/core/csv"
import { lineDiff } from "../../src/core/diff"
import { exportComparisonCsv, exportCsv, exportJson, exportMarkdown } from "../../src/core/export-report"
import { jaccard, levenshtein, normalizedEditDistance } from "../../src/core/similarity"
import { movingAverageTtr, typeTokenRatio } from "../../src/core/mattr"
import { parseSections, sectionFamily } from "../../src/core/parse-sections"
import { WOLF_STAY_QUIET_FULL } from "../../src/core/presets"
import { ngramCounts } from "../../src/core/repetition"
import { hasUnspacedScript } from "../../src/core/tokenize"
import { isAllowedUrl } from "../../src/main/security"

const norm = { nfc: true, casefold: true, stripPunctuation: true }

describe("MATTR", () => {
  it("matches a hand-built repeating list", () => {
    const tokens = ["a", "b", "a", "b", "a", "b", "a", "b"]
    const result = movingAverageTtr(tokens, 4)
    expect(result.value).toBe(0.5)
    expect(result.n).toBe(5)
  })

  it("reports insufficient length when shorter than the window", () => {
    const result = movingAverageTtr(["one", "two", "three"], 50)
    expect(result.value).toBe("insufficient length")
    expect(result.n).toBe(3)
  })
})

describe("plain TTR length dependence", () => {
  it("falls as the same vocabulary repeats", () => {
    const short = typeTokenRatio(["one", "two"])
    const long = typeTokenRatio(["one", "two", "one", "two", "one", "two"])
    expect(short.ttr.value).toBe(1)
    expect(short.ttr.n).toBe(2)
    expect(long.ttr.value).toBeCloseTo(1 / 3, 6)
    expect(long.ttr.n).toBe(6)
    expect(String(long.ttr.note)).toMatch(/falls as a text gets longer/i)
  })
})

describe("n-grams", () => {
  it("counts a repeated trigram", () => {
    const grams = ngramCounts(["a", "b", "c", "a", "b", "c"], 3)
    const repeated = grams.find((item) => item.gram === "a b c")
    expect(repeated?.count).toBe(2)
  })
})

describe("repeat share", () => {
  it("uses repeated-line-group arithmetic", () => {
    const report = analyzeDraft("hello\nworld\nhello\nfoo", {
      language: "en",
      tokenizationMode: "word",
      normalization: norm
    })
    expect(report.repetition.repeatShare.value).toBe(0.5)
    expect(report.repetition.repeatShare.n).toBe(4)
    expect(report.repetition.mostRepeated?.count).toBe(2)
    expect(report.repetition.mostRepeated?.share.value).toBe(0.5)
  })
})

describe("section parsing", () => {
  it("treats unlabeled text as one section", () => {
    const sections = parseSections("alpha\nbravo")
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe("(unlabeled)")
    expect(sections[0].rawLabel).toBeNull()
    expect(sections[0].lines).toEqual(["alpha", "bravo"])
  })

  it("keeps empty labeled sections", () => {
    const sections = parseSections("[Bridge]\n\n[Verse 2]\nhi")
    expect(sections.map((section) => section.label)).toEqual(["Bridge", "Verse 2"])
    expect(sections[0].lines).toEqual([])
    expect(sections[1].lines).toEqual(["hi"])
  })

  it("keeps duplicate labels as separate sections", () => {
    const sections = parseSections("[Chorus]\na\n[Chorus]\nb")
    expect(sections).toHaveLength(2)
    expect(sections[0].label).toBe("Chorus")
    expect(sections[1].label).toBe("Chorus")
  })

  it("parses bare VERSE / HOOK (x2) / OUTRO headers", () => {
    const sections = parseSections("VERSE\nline one\n\nHOOK (x2)\nhook line\n\nOUTRO\nout")
    expect(sections.map((section) => section.label)).toEqual(["VERSE", "HOOK (x2)", "OUTRO"])
    expect(sections[0].lines).toEqual(["line one"])
    expect(sections[1].lines).toEqual(["hook line"])
    expect(sections[2].lines).toEqual(["out"])
    expect(sectionFamily("HOOK (x2)")).toBe("hook")
  })

  it("splits the user-supplied sample into three sections", () => {
    const sections = parseSections(WOLF_STAY_QUIET_FULL)
    expect(sections.map((section) => section.label)).toEqual(["VERSE", "HOOK (x2)", "OUTRO"])
    expect(sections[0].lines).toHaveLength(8)
    expect(sections[1].lines).toHaveLength(4)
    expect(sections[2].lines).toHaveLength(2)
  })
})

describe("set similarity", () => {
  it("Jaccard known answer", () => {
    expect(jaccard(["a", "b", "c"], ["b", "c", "d"])).toBe(0.5)
  })

  it("edit-distance known answers", () => {
    expect(levenshtein(["a", "b", "c"], ["a", "x", "c"])).toBe(1)
    expect(normalizedEditDistance(["a", "b", "c"], ["a", "x", "c"])).toBeCloseTo(1 / 3, 6)
    expect(normalizedEditDistance([], [])).toBe(0)
  })
})

describe("unsupported scripts", () => {
  it("flags Han text in word mode", () => {
    expect(hasUnspacedScript("你好世界")).toBe(true)
    const report = analyzeDraft("你好世界", { language: "zh", tokenizationMode: "word", normalization: norm })
    expect(report.tokenization.unsupportedWordMetrics).toBe(true)
    expect(report.lineStats.wordCount.value).toBeNull()
    expect(String(report.tokenization.unsupportedReason)).toMatch(/character-based mode/i)
  })

  it("labels character-based mode and computes counts", () => {
    const report = analyzeDraft("你好世界", { language: "zh", tokenizationMode: "character", normalization: norm })
    expect(report.tokenization.unsupportedWordMetrics).toBe(false)
    expect(report.lineStats.wordCount.label).toMatch(/character-based mode/)
    expect(report.lineStats.wordCount.value).toBe(4)
  })
})

describe("orthographic echo", () => {
  it("is labeled orthographic echo, never rhyme", () => {
    const report = analyzeDraft("cat sat\nhat bat", { language: "en", tokenizationMode: "word", echoSuffixLength: 2, normalization: norm })
    expect(report.echo.label).toBe("orthographic echo")
    expect(report.echo.combinedShare.label).toBe("orthographic echo")
    expect(report.echo.label.toLowerCase()).not.toBe("rhyme")
    expect(report.echo.note).toMatch(/not rhyme/i)
    expect(report.echo.adjacentShare.value).toBe(1)
    expect(report.rhyme.value).toBe("unsupported")
    expect(report.syllables.value).toBe("unsupported")
    expect(String(report.rhyme.note)).toMatch(/dictionary/i)
  })
})

describe("diff", () => {
  it("records equal, add, and remove", () => {
    const diff = lineDiff(["alpha", "bravo"], ["alpha", "charlie"])
    expect(diff).toEqual([
      { kind: "equal", text: "alpha", leftLine: 1, rightLine: 1 },
      { kind: "remove", text: "bravo", leftLine: 2, rightLine: null },
      { kind: "add", text: "charlie", leftLine: null, rightLine: 2 }
    ])
  })
})

describe("exports omit lyric text by default", () => {
  it("JSON/Markdown/CSV keep snippet lines out unless opted in", () => {
    const report = analyzeDraft("[Verse 1]\nalpha bravo charlie\nalpha bravo charlie", { language: "en", tokenizationMode: "word", normalization: norm })
    const opts = { includeSnippets: false, formulaMitigated: true, warningAcknowledged: false }
    const json = exportJson(report, opts)
    const md = exportMarkdown(report, opts, "t")
    const csv = exportCsv(report, opts)
    expect(json).not.toMatch(/alpha bravo charlie/)
    expect(md).not.toMatch(/alpha bravo charlie/)
    expect(csv).not.toMatch(/alpha bravo charlie/)
    expect(json).toMatch(/"gram": null/)
    expect(json).toMatch(/"snippets": null/)
    const withSnippets = exportMarkdown(report, { ...opts, includeSnippets: true }, "t")
    expect(withSnippets).toMatch(/alpha bravo charlie/)
    expect(withSnippets).toMatch(/Warning/)
  })
})

describe("hostile text stays inert", () => {
  it("escapes markup in markdown and prefixes CSV formulas", () => {
    const report = analyzeDraft("<img onerror=alert(1)>\n=CMD|' /C calc'!A0", { language: "en", tokenizationMode: "word", normalization: norm })
    const md = exportMarkdown(report, { includeSnippets: true, formulaMitigated: true, warningAcknowledged: true }, "x")
    expect(md).toMatch(/&lt;img/)
    expect(md).not.toMatch(/<img onerror/)
    expect(mitigateCell("=1+1")).toBe(`"'=1+1"`)
    expect(mitigateCell("+2")).toBe(`"'+2"`)
    expect(mitigateCell("@SUM(1)")).toBe(`"'@SUM(1)"`)
    const csv = exportCsv(report, { includeSnippets: false, formulaMitigated: true, warningAcknowledged: false })
    expect(csv.startsWith('"')).toBe(true)
  })
})

describe("comparison disclaimer", () => {
  it("states that a statistic change is not a quality change", () => {
    const comparison = compareDrafts("a", "one two", "b", "one two two", { language: "en", tokenizationMode: "word", normalization: norm })
    expect(comparison.disclaimer).toMatch(/not a change in quality/i)
    expect(comparison.deltas[0].left.n).toBeGreaterThan(0)
    expect(comparison.deltas[0].right.n).toBeGreaterThan(0)
    const csv = exportComparisonCsv(comparison, { includeSnippets: false, formulaMitigated: true, warningAcknowledged: false })
    expect(csv).toMatch(/not a change in quality/i)
  })
})

describe("network policy", () => {
  it("allows only the app origin and optional local renderer", () => {
    expect(isAllowedUrl("app://local/index.html", undefined, true)).toBe(true)
    expect(isAllowedUrl("https://example.com", undefined, true)).toBe(false)
    expect(isAllowedUrl("http://127.0.0.1:5173/", "http://127.0.0.1:5173", false)).toBe(true)
    expect(isAllowedUrl("https://example.com", "http://127.0.0.1:5173", false)).toBe(false)
  })
})
