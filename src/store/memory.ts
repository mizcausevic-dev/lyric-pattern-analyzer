import { analyzeDraft, type AnalyzeOptions } from "../core/analyze"
import { compareDrafts } from "../core/compare"
import { assertDraftSize, MAX_DRAFT_BYTES, MAX_DRAFTS, utf8ByteLength } from "../core/limits"
import type { TokenizationMode } from "../core/types"
import type { Draft, DraftMeta, LyricStore, Song, WorkspaceInfo } from "./types"

function now(): string {
  return new Date().toISOString()
}

function id(): string {
  return crypto.randomUUID()
}

export class MemoryStore implements LyricStore {
  readonly workspaceId = "preview-memory"
  private songs: Song[] = []
  private drafts: Draft[] = []

  info(): WorkspaceInfo {
    return {
      workspaceId: this.workspaceId,
      draftCount: this.drafts.length,
      maxDrafts: MAX_DRAFTS,
      maxDraftBytes: MAX_DRAFT_BYTES,
      network: "disabled",
      dictionary: "unsupported"
    }
  }

  listSongs(): Song[] {
    return [...this.songs]
  }

  createSong(name: string): Song {
    const trimmed = name.trim()
    if (!trimmed) throw new Error("Song name is required.")
    const song: Song = { id: id(), name: trimmed, createdAt: now() }
    this.songs.push(song)
    return song
  }

  listDrafts(songId: string): DraftMeta[] {
    return this.drafts.filter((draft) => draft.songId === songId).map(toMeta)
  }

  getDraft(draftId: string): Draft {
    const draft = this.drafts.find((item) => item.id === draftId)
    if (!draft) throw new Error("Draft not found.")
    return { ...draft }
  }

  saveDraft(input: {
    songId: string
    name: string
    language: string
    tokenizationMode: TokenizationMode
    body: string
    id?: string
  }): Draft {
    assertDraftSize(input.body)
    const song = this.songs.find((item) => item.id === input.songId)
    if (!song) throw new Error("Song not found.")
    const name = input.name.trim()
    if (!name) throw new Error("Draft name is required.")
    const language = input.language.trim()
    if (!language) throw new Error("Record a language for this draft.")
    if (input.id) {
      const existing = this.drafts.find((item) => item.id === input.id)
      if (!existing) throw new Error("Draft not found.")
      existing.name = name
      existing.language = language
      existing.tokenizationMode = input.tokenizationMode
      existing.body = input.body
      existing.byteSize = utf8ByteLength(input.body)
      existing.updatedAt = now()
      return { ...existing }
    }
    if (this.drafts.length >= MAX_DRAFTS) throw new Error(`Draft limit is ${MAX_DRAFTS}.`)
    const draft: Draft = {
      id: id(),
      songId: input.songId,
      name,
      language,
      tokenizationMode: input.tokenizationMode,
      body: input.body,
      byteSize: utf8ByteLength(input.body),
      createdAt: now(),
      updatedAt: now()
    }
    this.drafts.push(draft)
    return { ...draft }
  }

  deleteDraft(draftId: string): void {
    this.drafts = this.drafts.filter((item) => item.id !== draftId)
  }

  analyze(draftId: string, options: Omit<AnalyzeOptions, "language" | "tokenizationMode">) {
    const draft = this.getDraft(draftId)
    return analyzeDraft(draft.body, {
      ...options,
      language: draft.language,
      tokenizationMode: draft.tokenizationMode
    })
  }

  compare(leftId: string, rightId: string, options: Omit<AnalyzeOptions, "language" | "tokenizationMode">) {
    const left = this.getDraft(leftId)
    const right = this.getDraft(rightId)
    return compareDrafts(left.name, left.body, right.name, right.body, {
      ...options,
      language: left.language,
      tokenizationMode: left.tokenizationMode
    })
  }
}

function toMeta(draft: Draft): DraftMeta {
  const { body: _body, ...meta } = draft
  return meta
}
