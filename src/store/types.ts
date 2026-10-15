import type { AnalyzeOptions } from "../core/analyze"
import type { AnalysisReport, ComparisonReport, TokenizationMode } from "../core/types"

export interface Song {
  id: string
  name: string
  createdAt: string
}

export interface DraftMeta {
  id: string
  songId: string
  name: string
  language: string
  tokenizationMode: TokenizationMode
  byteSize: number
  createdAt: string
  updatedAt: string
}

export interface Draft extends DraftMeta {
  body: string
}

export interface WorkspaceInfo {
  workspaceId: string
  draftCount: number
  maxDrafts: number
  maxDraftBytes: number
  network: "disabled"
  dictionary: "unsupported"
}

export interface LyricStore {
  info(): WorkspaceInfo
  listSongs(): Song[]
  createSong(name: string): Song
  listDrafts(songId: string): DraftMeta[]
  getDraft(id: string): Draft
  saveDraft(input: {
    songId: string
    name: string
    language: string
    tokenizationMode: TokenizationMode
    body: string
    id?: string
  }): Draft
  deleteDraft(id: string): void
  analyze(id: string, options: Omit<AnalyzeOptions, "language" | "tokenizationMode">): AnalysisReport
  compare(leftId: string, rightId: string, options: Omit<AnalyzeOptions, "language" | "tokenizationMode">): ComparisonReport
}
