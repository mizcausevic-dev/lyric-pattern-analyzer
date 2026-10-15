import { useEffect, useMemo, useState } from "react"
import { DEFAULT_ECHO_SUFFIX, DEFAULT_MATTR_WINDOW } from "../../core/analyze"
import { OWNERSHIP_NOTICE, PREVIEW_PRIVACY_NOTICE, QUALITY_DISCLAIMER, type AnalysisReport, type ComparisonReport, type Figure, type TokenizationMode } from "../../core/types"
import type { Draft, DraftMeta, Song } from "../../store/types"
import { buildExport, type LyricClient } from "./client"

function fig(figure: Figure): string {
  const value = figure.value === null ? "n/a" : String(figure.value)
  return `${value} (n=${figure.n})`
}

export function App({ client }: { client: LyricClient }) {
  const [notice, setNotice] = useState(client.preview ? PREVIEW_PRIVACY_NOTICE : OWNERSHIP_NOTICE)
  const [songs, setSongs] = useState<Song[]>([])
  const [songId, setSongId] = useState("")
  const [drafts, setDrafts] = useState<DraftMeta[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [songName, setSongName] = useState("")
  const [draftName, setDraftName] = useState("Draft 1")
  const [language, setLanguage] = useState("en")
  const [mode, setMode] = useState<TokenizationMode>("word")
  const [body, setBody] = useState("")
  const [mattrWindow, setMattrWindow] = useState(DEFAULT_MATTR_WINDOW)
  const [echoSuffix, setEchoSuffix] = useState(DEFAULT_ECHO_SUFFIX)
  const [nfc, setNfc] = useState(true)
  const [casefold, setCasefold] = useState(true)
  const [stripPunctuation, setStripPunctuation] = useState(true)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [compareId, setCompareId] = useState("")
  const [comparison, setComparison] = useState<ComparisonReport | null>(null)
  const [tab, setTab] = useState<"draft" | "compare" | "export">("draft")
  const [snippets, setSnippets] = useState(false)
  const [formula, setFormula] = useState(true)
  const [busy, setBusy] = useState(false)

  const analyzeParams = useMemo(
    () => ({ mattrWindow, echoSuffixLength: echoSuffix, nfc, casefold, stripPunctuation }),
    [mattrWindow, echoSuffix, nfc, casefold, stripPunctuation]
  )

  async function refresh(nextSong = songId, nextDraft = draft?.id) {
    const listed = await client.listSongs()
    setSongs(listed)
    const currentSong = nextSong || listed[0]?.id || ""
    setSongId(currentSong)
    const listedDrafts = currentSong ? await client.listDrafts(currentSong) : []
    setDrafts(listedDrafts)
    const currentDraftId = nextDraft && listedDrafts.some((item) => item.id === nextDraft) ? nextDraft : listedDrafts[0]?.id
    if (currentDraftId) {
      const loaded = await client.getDraft(currentDraftId)
      setDraft(loaded)
      setDraftName(loaded.name)
      setLanguage(loaded.language)
      setMode(loaded.tokenizationMode)
      setBody(loaded.body)
    } else {
      setDraft(null)
      setBody("")
    }
  }

  useEffect(() => {
    client
      .info()
      .then(() => refresh())
      .catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Failed to open workspace"))
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Operation failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="kicker">Local workstation</p>
          <h1>Lyric Pattern Analyzer</h1>
        </div>
        <p className="claim">No quality score. No suggestions. No AI output. Unreleased drafts stay on this machine in the desktop app.</p>
      </header>
      <aside className="banner fx-layer" role="note">
        {notice}
      </aside>
      <div className="grid">
        <nav className="rail" aria-label="Songs and drafts">
          <form
            className="panel"
            onSubmit={(event) => {
              event.preventDefault()
              void run(async () => {
                const created = await client.createSong(songName)
                setSongName("")
                await refresh(created.id, "")
              })
            }}
          >
            <label>
              Song
              <input aria-label="Song name" value={songName} onChange={(event) => setSongName(event.target.value)} />
            </label>
            <button type="submit" disabled={busy || songName.trim().length === 0}>
              Add song
            </button>
          </form>
          <div className="panel list">
            {songs.map((song) => (
              <button key={song.id} type="button" className={song.id === songId ? "active" : ""} onClick={() => void refresh(song.id, "")}>
                {song.name}
              </button>
            ))}
          </div>
          <div className="panel list">
            <p className="label">Drafts</p>
            {drafts.map((item) => (
              <button key={item.id} type="button" className={item.id === draft?.id ? "active" : ""} onClick={() => void refresh(songId, item.id)}>
                {item.name}
              </button>
            ))}
            <button
              type="button"
              disabled={!songId || busy}
              onClick={() =>
                void run(async () => {
                  const created = await client.saveDraft({
                    songId,
                    name: `Draft ${drafts.length + 1}`,
                    language,
                    tokenizationMode: mode,
                    body: ""
                  })
                  await refresh(songId, created.id)
                })
              }
            >
              New draft
            </button>
          </div>
        </nav>
        <main className="work">
          <div className="tabs" role="tablist">
            {(["draft", "compare", "export"] as const).map((item) => (
              <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
                {item}
              </button>
            ))}
          </div>
          {tab === "draft" && (
            <section className="editor">
              <div className="row">
                <label>
                  Draft name
                  <input aria-label="Draft name" value={draftName} onChange={(event) => setDraftName(event.target.value)} />
                </label>
                <label>
                  Language
                  <input aria-label="Draft language" value={language} onChange={(event) => setLanguage(event.target.value)} />
                </label>
                <label>
                  Tokenization
                  <select aria-label="Tokenization mode" value={mode} onChange={(event) => setMode(event.target.value as TokenizationMode)}>
                    <option value="word">word</option>
                    <option value="character">character-based (labeled)</option>
                  </select>
                </label>
              </div>
              <label className="stack">
                Lyric text (UTF-8). Optional section labels in square brackets.
                <textarea
                  aria-label="Lyric draft text"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  spellCheck={false}
                />
              </label>
              <fieldset className="toggles">
                <legend>Normalization (applied steps are shown on the report)</legend>
                <label><input type="checkbox" checked={nfc} onChange={(event) => setNfc(event.target.checked)} /> NFC</label>
                <label><input type="checkbox" checked={casefold} onChange={(event) => setCasefold(event.target.checked)} /> casefold</label>
                <label><input type="checkbox" checked={stripPunctuation} onChange={(event) => setStripPunctuation(event.target.checked)} /> punctuation strip</label>
                <label>
                  MATTR window
                  <input type="number" min={1} aria-label="MATTR window" value={mattrWindow} onChange={(event) => setMattrWindow(Number(event.target.value) || 1)} />
                </label>
                <label>
                  Echo suffix length
                  <input type="number" min={1} aria-label="Orthographic echo suffix length" value={echoSuffix} onChange={(event) => setEchoSuffix(Number(event.target.value) || 1)} />
                </label>
              </fieldset>
              <div className="actions">
                <button
                  type="button"
                  disabled={!songId || busy}
                  onClick={() =>
                    void run(async () => {
                      const saved = await client.saveDraft({
                        songId,
                        name: draftName,
                        language,
                        tokenizationMode: mode,
                        body,
                        id: draft?.id
                      })
                      setDraft(saved)
                      await refresh(songId, saved.id)
                      setNotice("Draft saved locally. No network call was made.")
                    })
                  }
                >
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={!draft || busy}
                  onClick={() =>
                    void run(async () => {
                      const next = await client.analyze({ id: draft!.id, ...analyzeParams })
                      setReport(next)
                      setNotice(QUALITY_DISCLAIMER)
                    })
                  }
                >
                  Analyze
                </button>
              </div>
            </section>
          )}
          {tab === "compare" && (
            <section className="editor">
              <p>{QUALITY_DISCLAIMER}</p>
              <label>
                Compare with
                <select aria-label="Comparison draft" value={compareId} onChange={(event) => setCompareId(event.target.value)}>
                  <option value="">Select another draft</option>
                  {drafts.filter((item) => item.id !== draft?.id).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!draft || !compareId || busy}
                onClick={() =>
                  void run(async () => {
                    const next = await client.compare(draft!.id, compareId, analyzeParams)
                    setComparison(next)
                  })
                }
              >
                Compare drafts
              </button>
              {comparison && (
                <div className="report">
                  <h2>Statistic change</h2>
                  <table>
                    <thead>
                      <tr><th>Statistic</th><th>Left</th><th>Right</th><th>Delta</th></tr>
                    </thead>
                    <tbody>
                      {comparison.deltas.map((item) => (
                        <tr key={item.key}>
                          <td>{item.label}</td>
                          <td>{fig(item.left)}</td>
                          <td>{fig(item.right)}</td>
                          <td>{item.delta === null ? "n/a" : item.delta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <h2>Line diff</h2>
                  <ol className="diff">
                    {comparison.diff.map((row, index) => (
                      <li key={`${row.kind}-${index}`} className={row.kind}>{row.kind === "add" ? "+" : row.kind === "remove" ? "−" : " "} {row.text}</li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          )}
          {tab === "export" && (
            <section className="editor">
              <p>Exports omit lyric text by default. CSV formula-mitigated mode prefixes cells that start with = + - @.</p>
              <label><input type="checkbox" checked={snippets} onChange={(event) => setSnippets(event.target.checked)} /> Include lyric snippets (warning)</label>
              <label><input type="checkbox" checked={formula} onChange={(event) => setFormula(event.target.checked)} /> Formula-mitigated CSV</label>
              {snippets && <p className="warn">Snippets put unpublished lyric text into the file you save.</p>}
              <div className="actions">
                {(["md", "json", "csv"] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    disabled={!report || busy}
                    onClick={() =>
                      void run(async () => {
                        const file = buildExport("draft", format, report!, draftName, {
                          includeSnippets: snippets,
                          formulaMitigated: formula,
                          warningAcknowledged: snippets
                        })
                        await client.saveExport(file.filename, file.content)
                      })
                    }
                  >
                    Draft {format}
                  </button>
                ))}
                {(["md", "json", "csv"] as const).map((format) => (
                  <button
                    key={`c-${format}`}
                    type="button"
                    disabled={!comparison || busy}
                    onClick={() =>
                      void run(async () => {
                        const file = buildExport("compare", format, comparison!, `${draftName}-compare`, {
                          includeSnippets: snippets,
                          formulaMitigated: formula,
                          warningAcknowledged: snippets
                        })
                        await client.saveExport(file.filename, file.content)
                      })
                    }
                  >
                    Compare {format}
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>
        <aside className="stats" aria-live="polite">
          <h2>Statistics</h2>
          {!report && <p>Save, then analyze. Every figure includes n.</p>}
          {report && (
            <div className="report">
              <p className="chips">Normalization: {report.normalization.applied.join(" · ") || "none"}</p>
              <p className="chips">Tokenization: {report.tokenization.mode === "character" ? "character-based (labeled)" : "word"} · {report.tokenization.segmenter}</p>
              {report.tokenization.unsupportedWordMetrics && <p className="warn">{report.tokenization.unsupportedReason}</p>}
              <dl>
                <dt>Lines</dt><dd>{fig(report.lineStats.lineCount)}</dd>
                <dt>{report.lineStats.wordCount.label}</dt><dd>{fig(report.lineStats.wordCount)}</dd>
                <dt>Sections</dt><dd>{fig(report.lineStats.sectionCount)}</dd>
                <dt>WPL mean</dt><dd>{fig(report.lineStats.wordsPerLine.mean)}</dd>
                <dt>WPL median</dt><dd>{fig(report.lineStats.wordsPerLine.median)}</dd>
                <dt>WPL min / max</dt><dd>{fig(report.lineStats.wordsPerLine.min)} / {fig(report.lineStats.wordsPerLine.max)}</dd>
                <dt>WPL stdev</dt><dd>{fig(report.lineStats.wordsPerLine.stdev)}</dd>
                <dt>MATTR (window {report.variety.mattrWindow})</dt><dd>{fig(report.variety.mattr)}</dd>
                <dt>Plain TTR</dt><dd>{fig(report.variety.ttr)}</dd>
                <dt>Repeat share</dt><dd>{fig(report.repetition.repeatShare)}</dd>
                <dt>Most repeated group share</dt><dd>{report.repetition.mostRepeated ? fig(report.repetition.mostRepeated.share) : "none (n=0)"}</dd>
                <dt>Orthographic echo</dt><dd>{fig(report.echo.combinedShare)}</dd>
                <dt>Rhyme</dt><dd>{fig(report.rhyme)}</dd>
                <dt>Syllables</dt><dd>{fig(report.syllables)}</dd>
              </dl>
              <p className="note">{report.variety.ttrLengthWarning}</p>
              <p className="note">{report.echo.note}</p>
              <h3>Repeated n-grams</h3>
              <p className="note">Shown here because this is your draft. Exports omit gram text unless you opt in to snippets. Counts are not a quality score. n-gram n is order (3–5), not sample size.</p>
              {report.repetition.ngrams.length === 0 && <p>None with count ≥ 2.</p>}
              <ul>
                {report.repetition.ngrams.slice(0, 24).map((item) => (
                  <li key={`${item.n}-${item.gram}`}>{item.n}-gram ×{item.count}: {item.gram}</li>
                ))}
              </ul>
              <h3>Section similarity</h3>
              <p className="note">Jaccard: higher means more token-set overlap. Normalized edit distance: higher means farther. n=2 is the section pair. Not a quality score.</p>
              {report.sectionSimilarity.length === 0 && <p>No same-label-family pairs.</p>}
              <ul>
                {report.sectionSimilarity.map((pair) => (
                  <li key={`${pair.label}-${pair.leftIndex}-${pair.rightIndex}`}>
                    {pair.label} {pair.leftIndex + 1}–{pair.rightIndex + 1}: Jaccard {fig(pair.jaccard)}, edit {fig(pair.normalizedEditDistance)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
