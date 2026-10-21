import { useEffect, useMemo, useState } from "react"
import { DEFAULT_ECHO_SUFFIX, DEFAULT_MATTR_WINDOW } from "../../core/analyze"
import { parseSections } from "../../core/parse-sections"
import { PRESETS } from "../../core/presets"
import {
  OWNERSHIP_NOTICE,
  PREVIEW_PRIVACY_NOTICE,
  QUALITY_DISCLAIMER,
  type AnalysisReport,
  type ComparisonReport,
  type Figure,
  type TokenizationMode
} from "../../core/types"
import type { Draft, DraftMeta, Song } from "../../store/types"
import { buildExport, type LyricClient } from "./client"

function fig(figure: Figure): string {
  const value = figure.value === null ? "n/a" : String(figure.value)
  return `${value}`
}

function figN(figure: Figure): string {
  return `n=${figure.n}`
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
  const liveSections = useMemo(() => parseSections(body), [body])
  const liveLines = liveSections.reduce((sum, section) => sum + section.lines.length, 0)

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

  useEffect(() => {
    const shell = document.querySelector(".shell")
    if (!(shell instanceof HTMLElement)) return
    const onMove = (event: PointerEvent) => {
      const box = shell.getBoundingClientRect()
      shell.style.setProperty("--mx", `${((event.clientX - box.left) / box.width) * 100}%`)
      shell.style.setProperty("--my", `${((event.clientY - box.top) / box.height) * 100}%`)
    }
    shell.addEventListener("pointermove", onMove)
    return () => shell.removeEventListener("pointermove", onMove)
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

  async function ensureSong(): Promise<string> {
    if (songId) return songId
    const created = await client.createSong(songName.trim() || "Untitled song")
    setSongName("")
    await refresh(created.id, "")
    return created.id
  }

  function loadPreset(id: string) {
    const preset = PRESETS.find((item) => item.id === id)
    if (!preset) return
    setDraftName(preset.name)
    setBody(preset.body)
    setReport(null)
    setNotice(`Loaded ${preset.name}. HOOK (x2) is a label. Counts use written lines, not performed repeats. Save to keep it.`)
  }

  return (
    <div className="shell">
      <header className="masthead">
        <div className="brand">
          <p className="kicker">{client.preview ? "Public preview" : "Local workstation"}</p>
          <h1>Lyric Pattern Analyzer</h1>
          <p className="lede">Structure and repetition counts for drafts you already wrote.</p>
        </div>
        <div className="pills" aria-label="Product limits">
          <span>No quality score</span>
          <span>No suggestions</span>
          <span>No AI output</span>
          <span>Every figure has n</span>
        </div>
      </header>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          <span>Descriptive statistics only</span>
          <span>Orthographic echo is not rhyme</span>
          <span>MATTR is not a craft score</span>
          <span>Exports omit lyric text by default</span>
          <span>Descriptive statistics only</span>
          <span>Orthographic echo is not rhyme</span>
          <span>MATTR is not a craft score</span>
          <span>Exports omit lyric text by default</span>
        </div>
      </div>

      <aside className="banner fx-layer" role="note">{notice}</aside>

      <div className="stage">
        <nav className="library" aria-label="Songs and drafts">
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
            <p className="label">Catalog</p>
            <label>
              New song
              <input aria-label="Song name" value={songName} onChange={(event) => setSongName(event.target.value)} placeholder="Song title" />
            </label>
            <button type="submit" disabled={busy || songName.trim().length === 0}>Add song</button>
          </form>
          <div className="song-stack">
            {songs.map((song) => (
              <button
                key={song.id}
                type="button"
                className={`song-card ${song.id === songId ? "active" : ""}`}
                onClick={() => void refresh(song.id, "")}
              >
                <strong>{song.name}</strong>
                <em>{song.id === songId ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"}` : "Open"}</em>
              </button>
            ))}
          </div>
          <div className="panel">
            <p className="label">Drafts</p>
            <div className="draft-stack">
              {drafts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === draft?.id ? "active" : ""}
                  onClick={() => void refresh(songId, item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="ghost"
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
              New blank draft
            </button>
          </div>
        </nav>

        <main className="desk">
          <section className="presets" aria-label="Sample loads">
            <div className="preset-head">
              <p className="label">Sample loads</p>
              <p className="note">User-supplied draft. HOOK (x2) does not multiply written lines.</p>
            </div>
            <div className="preset-row">
              {PRESETS.map((preset) => (
                <button key={preset.id} type="button" className="preset" onClick={() => loadPreset(preset.id)}>
                  <span>{preset.section}</span>
                  <strong>{preset.name}</strong>
                </button>
              ))}
            </div>
          </section>

          <div className="tabs" role="tablist">
            {(["draft", "compare", "export"] as const).map((item) => (
              <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="desk-body">
            <section className="folio">
              {tab === "draft" && (
                <>
                  <div className="meta-row">
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
                  <div className="editor-frame">
                    <div className="section-map" aria-label="Detected sections">
                      {liveSections.map((section) => (
                        <div key={`${section.index}-${section.label}`} className="section-chip">
                          <b>{section.label}</b>
                          <span>{section.lines.length} lines</span>
                        </div>
                      ))}
                      <p className="live-count">{liveLines} lyric {liveLines === 1 ? "line" : "lines"} · {liveSections.length} section{liveSections.length === 1 ? "" : "s"}</p>
                    </div>
                    <label className="stack editor-stack">
                      Lyric text. Bare headers (VERSE, HOOK, OUTRO) or [Verse 1] both count as sections.
                      <textarea aria-label="Lyric draft text" value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} />
                    </label>
                  </div>
                  <fieldset className="toggles">
                    <legend>Normalization shown on the report</legend>
                    <label><input type="checkbox" checked={nfc} onChange={(event) => setNfc(event.target.checked)} /> NFC</label>
                    <label><input type="checkbox" checked={casefold} onChange={(event) => setCasefold(event.target.checked)} /> casefold</label>
                    <label><input type="checkbox" checked={stripPunctuation} onChange={(event) => setStripPunctuation(event.target.checked)} /> punctuation strip</label>
                    <label>
                      MATTR window
                      <input type="number" min={1} aria-label="MATTR window" value={mattrWindow} onChange={(event) => setMattrWindow(Number(event.target.value) || 1)} />
                    </label>
                    <label>
                      Echo suffix
                      <input type="number" min={1} aria-label="Orthographic echo suffix length" value={echoSuffix} onChange={(event) => setEchoSuffix(Number(event.target.value) || 1)} />
                    </label>
                  </fieldset>
                  <div className="actions">
                    <button
                      type="button"
                      className="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const id = await ensureSong()
                          const saved = await client.saveDraft({
                            songId: id,
                            name: draftName,
                            language,
                            tokenizationMode: mode,
                            body,
                            id: draft?.id
                          })
                          setDraft(saved)
                          await refresh(id, saved.id)
                          setNotice("Draft saved locally. No network call was made.")
                        })
                      }
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="primary pulse-glow"
                      disabled={!draft || busy}
                      onClick={() =>
                        void run(async () => {
                          const next = await client.analyze({ id: draft!.id, ...analyzeParams })
                          setReport(next)
                          setNotice(QUALITY_DISCLAIMER)
                        })
                      }
                    >
                      Analyze draft
                    </button>
                  </div>
                </>
              )}

              {tab === "compare" && (
                <div className="compare-pane">
                  <p className="claim">{QUALITY_DISCLAIMER}</p>
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
                    className="primary"
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
                    <>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr><th>Statistic</th><th>Left</th><th>Right</th><th>Delta</th></tr>
                          </thead>
                          <tbody>
                            {comparison.deltas.map((item) => (
                              <tr key={item.key}>
                                <td>{item.label}</td>
                                <td>{fig(item.left)} <small>{figN(item.left)}</small></td>
                                <td>{fig(item.right)} <small>{figN(item.right)}</small></td>
                                <td>{item.delta === null ? "n/a" : item.delta}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <ol className="diff">
                        {comparison.diff.map((row, index) => (
                          <li key={`${row.kind}-${index}`} className={row.kind}>
                            {row.kind === "add" ? "+" : row.kind === "remove" ? "−" : " "} {row.text}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              )}

              {tab === "export" && (
                <div className="export-pane">
                  <p>Exports omit lyric text by default. Formula-mitigated CSV prefixes cells that start with = + - @.</p>
                  <label><input type="checkbox" checked={snippets} onChange={(event) => setSnippets(event.target.checked)} /> Include lyric snippets</label>
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
                </div>
              )}
            </section>

            <aside className="console" aria-live="polite">
              <div className="console-head">
                <h2>Counts</h2>
                <p>Not a score.</p>
              </div>
              {!report && (
                <div className="empty-console">
                  <p>Save, then analyze.</p>
                  <p className="note">Live map on the left is parsing only. Figures appear after Analyze.</p>
                </div>
              )}
              {report && (
                <>
                  <div className="stat-grid">
                    <article className="stat-card wide">
                      <p>Lines</p>
                      <strong>{fig(report.lineStats.lineCount)}</strong>
                      <small>{figN(report.lineStats.lineCount)}</small>
                    </article>
                    <article className="stat-card">
                      <p>{report.tokenization.mode === "character" ? "Characters" : "Words"}</p>
                      <strong>{fig(report.lineStats.wordCount)}</strong>
                      <small>{figN(report.lineStats.wordCount)}</small>
                    </article>
                    <article className="stat-card">
                      <p>Sections</p>
                      <strong>{fig(report.lineStats.sectionCount)}</strong>
                      <small>{figN(report.lineStats.sectionCount)}</small>
                    </article>
                    <article className="stat-card">
                      <p>MATTR</p>
                      <strong>{fig(report.variety.mattr)}</strong>
                      <small>window {report.variety.mattrWindow} · {figN(report.variety.mattr)}</small>
                    </article>
                    <article className="stat-card">
                      <p>Repeat share</p>
                      <strong>{fig(report.repetition.repeatShare)}</strong>
                      <small>{figN(report.repetition.repeatShare)}</small>
                    </article>
                    <article className="stat-card">
                      <p>Orthographic echo</p>
                      <strong>{fig(report.echo.combinedShare)}</strong>
                      <small>{figN(report.echo.combinedShare)}</small>
                    </article>
                    <article className="stat-card">
                      <p>Plain TTR</p>
                      <strong>{fig(report.variety.ttr)}</strong>
                      <small>{figN(report.variety.ttr)}</small>
                    </article>
                  </div>
                  <div className="wpl">
                    <p className="label">Words per line</p>
                    <p>mean {fig(report.lineStats.wordsPerLine.mean)} · median {fig(report.lineStats.wordsPerLine.median)} · min {fig(report.lineStats.wordsPerLine.min)} · max {fig(report.lineStats.wordsPerLine.max)} · stdev {fig(report.lineStats.wordsPerLine.stdev)}</p>
                    <div className="wpl-bars" aria-hidden="true">
                      {report.lineStats.wordsPerLine.values.map((value, index) => {
                        const max = Number(report.lineStats.wordsPerLine.max.value) || 1
                        return <span key={`${index}-${value}`} style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
                      })}
                    </div>
                    <small>{figN(report.lineStats.wordsPerLine.mean)}</small>
                  </div>
                  <p className="chips">Normalization: {report.normalization.applied.join(" · ") || "none"}</p>
                  {report.tokenization.unsupportedWordMetrics && <p className="warn">{report.tokenization.unsupportedReason}</p>}
                  <p className="note">{report.variety.ttr.note}</p>
                  <p className="note">{report.echo.note}</p>
                  <p className="note">Rhyme {fig(report.rhyme)}. Syllables {fig(report.syllables)}.</p>
                  <h3>Repeated n-grams</h3>
                  <p className="note">On-screen because this is your draft. Exports omit gram text unless snippets are on. Not a quality score.</p>
                  {report.repetition.ngrams.length === 0 && <p>None with count ≥ 2.</p>}
                  <ul className="gram-list">
                    {report.repetition.ngrams.slice(0, 16).map((item) => (
                      <li key={`${item.n}-${item.gram}`}><code>{item.n}</code> ×{item.count} {item.gram}</li>
                    ))}
                  </ul>
                  <h3>Section similarity</h3>
                  <p className="note">Jaccard: higher = more overlap. Edit distance: higher = farther. n=2 is the pair.</p>
                  {report.sectionSimilarity.length === 0 && <p>No same-label-family pairs.</p>}
                  <ul>
                    {report.sectionSimilarity.map((pair) => (
                      <li key={`${pair.label}-${pair.leftIndex}-${pair.rightIndex}`}>
                        {pair.label} {pair.leftIndex + 1}–{pair.rightIndex + 1}: Jaccard {fig(pair.jaccard)}, edit {fig(pair.normalizedEditDistance)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}
