import Database from "better-sqlite3"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { analyzeDraft, type AnalyzeOptions } from "../core/analyze"
import { compareDrafts } from "../core/compare"
import { assertDraftSize, MAX_DRAFT_BYTES, MAX_DRAFTS, utf8ByteLength } from "../core/limits"
import type { TokenizationMode } from "../core/types"
import type { Draft, DraftMeta, LyricStore, Song, WorkspaceInfo } from "./types"

const MIGRATION = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  tokenization_mode TEXT NOT NULL,
  body TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`

function now(): string {
  return new Date().toISOString()
}

export class SqliteStore implements LyricStore {
  private db: Database.Database

  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true })
    this.db = new Database(file)
    this.db.pragma("journal_mode = WAL")
    this.db.pragma("foreign_keys = ON")
    const migrated = this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get()
    if (!migrated) {
      this.db.exec(MIGRATION)
      this.db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (1, ?)").run(now())
    }
    const workspace = this.db.prepare("SELECT value FROM app_meta WHERE key = 'workspace_id'").get() as { value: string } | undefined
    if (!workspace) {
      this.db.prepare("INSERT INTO app_meta (key, value) VALUES ('workspace_id', ?)").run(crypto.randomUUID())
    }
  }

  info(): WorkspaceInfo {
    const workspace = this.db.prepare("SELECT value FROM app_meta WHERE key = 'workspace_id'").get() as { value: string }
    const count = this.db.prepare("SELECT COUNT(*) AS n FROM drafts").get() as { n: number }
    return {
      workspaceId: workspace.value,
      draftCount: count.n,
      maxDrafts: MAX_DRAFTS,
      maxDraftBytes: MAX_DRAFT_BYTES,
      network: "disabled",
      dictionary: "unsupported"
    }
  }

  listSongs(): Song[] {
    return this.db.prepare("SELECT id, name, created_at AS createdAt FROM songs ORDER BY created_at").all() as Song[]
  }

  createSong(name: string): Song {
    const trimmed = name.trim()
    if (!trimmed) throw new Error("Song name is required.")
    const song: Song = { id: crypto.randomUUID(), name: trimmed, createdAt: now() }
    this.db.prepare("INSERT INTO songs (id, name, created_at) VALUES (?, ?, ?)").run(song.id, song.name, song.createdAt)
    return song
  }

  listDrafts(songId: string): DraftMeta[] {
    return this.db.prepare(
      "SELECT id, song_id AS songId, name, language, tokenization_mode AS tokenizationMode, byte_size AS byteSize, created_at AS createdAt, updated_at AS updatedAt FROM drafts WHERE song_id = ? ORDER BY created_at"
    ).all(songId) as DraftMeta[]
  }

  getDraft(draftId: string): Draft {
    const draft = this.db.prepare(
      "SELECT id, song_id AS songId, name, language, tokenization_mode AS tokenizationMode, body, byte_size AS byteSize, created_at AS createdAt, updated_at AS updatedAt FROM drafts WHERE id = ?"
    ).get(draftId) as Draft | undefined
    if (!draft) throw new Error("Draft not found.")
    return draft
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
    const song = this.db.prepare("SELECT id FROM songs WHERE id = ?").get(input.songId)
    if (!song) throw new Error("Song not found.")
    const name = input.name.trim()
    if (!name) throw new Error("Draft name is required.")
    const language = input.language.trim()
    if (!language) throw new Error("Record a language for this draft.")
    const byteSize = utf8ByteLength(input.body)
    if (input.id) {
      const existing = this.getDraft(input.id)
      this.db.prepare(
        "UPDATE drafts SET name = ?, language = ?, tokenization_mode = ?, body = ?, byte_size = ?, updated_at = ? WHERE id = ?"
      ).run(name, language, input.tokenizationMode, input.body, byteSize, now(), input.id)
      return { ...existing, name, language, tokenizationMode: input.tokenizationMode, body: input.body, byteSize, updatedAt: now() }
    }
    const count = this.db.prepare("SELECT COUNT(*) AS n FROM drafts").get() as { n: number }
    if (count.n >= MAX_DRAFTS) throw new Error(`Draft limit is ${MAX_DRAFTS}.`)
    const draft: Draft = {
      id: crypto.randomUUID(),
      songId: input.songId,
      name,
      language,
      tokenizationMode: input.tokenizationMode,
      body: input.body,
      byteSize,
      createdAt: now(),
      updatedAt: now()
    }
    this.db.prepare(
      "INSERT INTO drafts (id, song_id, name, language, tokenization_mode, body, byte_size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(draft.id, draft.songId, draft.name, draft.language, draft.tokenizationMode, draft.body, draft.byteSize, draft.createdAt, draft.updatedAt)
    return draft
  }

  deleteDraft(draftId: string): void {
    this.db.prepare("DELETE FROM drafts WHERE id = ?").run(draftId)
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
