import {
  exportComparisonCsv,
  exportComparisonJson,
  exportComparisonMarkdown,
  exportCsv,
  exportJson,
  exportMarkdown,
  type ExportOptions
} from "../../core/export-report"
import type { AnalysisReport, ComparisonReport, TokenizationMode } from "../../core/types"
import type { Draft, DraftMeta, LyricStore, Song, WorkspaceInfo } from "../../store/types"

export interface AnalyzeParams {
  id: string
  mattrWindow: number
  echoSuffixLength: number
  nfc: boolean
  casefold: boolean
  stripPunctuation: boolean
}

export interface LyricClient {
  preview: boolean
  info(): Promise<WorkspaceInfo>
  listSongs(): Promise<Song[]>
  createSong(name: string): Promise<Song>
  listDrafts(songId: string): Promise<DraftMeta[]>
  getDraft(id: string): Promise<Draft>
  saveDraft(input: {
    songId: string
    name: string
    language: string
    tokenizationMode: TokenizationMode
    body: string
    id?: string
  }): Promise<Draft>
  deleteDraft(id: string): Promise<void>
  analyze(params: AnalyzeParams): Promise<AnalysisReport>
  compare(leftId: string, rightId: string, params: Omit<AnalyzeParams, "id">): Promise<ComparisonReport>
  saveExport(filename: string, content: string): Promise<{ saved: boolean; path?: string }>
}

declare global {
  interface Window {
    lyric?: { invoke(channel: string, payload?: unknown): Promise<unknown> }
  }
}

export function electronClient(): LyricClient {
  const invoke = <T>(channel: string, payload?: unknown) => window.lyric!.invoke(channel, payload) as Promise<T>
  return {
    preview: false,
    info: () => invoke("workspace:info"),
    listSongs: () => invoke("songs:list"),
    createSong: (name) => invoke("songs:create", { name }),
    listDrafts: (songId) => invoke("drafts:list", { songId }),
    getDraft: (id) => invoke("drafts:get", { id }),
    saveDraft: (input) => invoke("drafts:save", input),
    deleteDraft: async (id) => {
      await invoke("drafts:delete", { id })
    },
    analyze: (params) => invoke("drafts:analyze", params),
    compare: (leftId, rightId, params) => invoke("drafts:compare", { leftId, rightId, ...params }),
    saveExport: (filename, content) => invoke("export:save", { filename, content })
  }
}

export function memoryClient(store: LyricStore): LyricClient {
  return {
    preview: true,
    info: async () => store.info(),
    listSongs: async () => store.listSongs(),
    createSong: async (name) => store.createSong(name),
    listDrafts: async (songId) => store.listDrafts(songId),
    getDraft: async (id) => store.getDraft(id),
    saveDraft: async (input) => store.saveDraft(input),
    deleteDraft: async (id) => store.deleteDraft(id),
    analyze: async (params) =>
      store.analyze(params.id, {
        mattrWindow: params.mattrWindow,
        echoSuffixLength: params.echoSuffixLength,
        normalization: {
          nfc: params.nfc,
          casefold: params.casefold,
          stripPunctuation: params.stripPunctuation
        }
      }),
    compare: async (leftId, rightId, params) =>
      store.compare(leftId, rightId, {
        mattrWindow: params.mattrWindow,
        echoSuffixLength: params.echoSuffixLength,
        normalization: {
          nfc: params.nfc,
          casefold: params.casefold,
          stripPunctuation: params.stripPunctuation
        }
      }),
    saveExport: async (filename, content) => {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      return { saved: true }
    }
  }
}

export function buildExport(
  kind: "draft" | "compare",
  format: "md" | "json" | "csv",
  report: AnalysisReport | ComparisonReport,
  title: string,
  options: ExportOptions
): { filename: string; content: string } {
  if (kind === "draft") {
    const analysis = report as AnalysisReport
    if (format === "json") return { filename: `${slug(title)}.json`, content: exportJson(analysis, options) }
    if (format === "csv") return { filename: `${slug(title)}.csv`, content: exportCsv(analysis, options) }
    return { filename: `${slug(title)}.md`, content: exportMarkdown(analysis, options, title) }
  }
  const comparison = report as ComparisonReport
  if (format === "json") return { filename: `${slug(title)}-compare.json`, content: exportComparisonJson(comparison, options) }
  if (format === "csv") return { filename: `${slug(title)}-compare.csv`, content: exportComparisonCsv(comparison, options) }
  return { filename: `${slug(title)}-compare.md`, content: exportComparisonMarkdown(comparison, options) }
}

function slug(value: string): string {
  const s = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return s || "lyric-report"
}
