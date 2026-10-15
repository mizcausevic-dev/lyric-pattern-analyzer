import { describe, expect, it } from "vitest"
import { MAX_DRAFT_BYTES } from "../../src/core/limits"
import { MemoryStore } from "../../src/store/memory"

describe("memory store limits", () => {
  it("rejects drafts over 200 KiB", () => {
    const store = new MemoryStore()
    const song = store.createSong("limit")
    const body = "a".repeat(MAX_DRAFT_BYTES + 1)
    expect(() =>
      store.saveDraft({ songId: song.id, name: "too big", language: "en", tokenizationMode: "word", body })
    ).toThrow(/200 KiB/)
  })

  it("requires a recorded language", () => {
    const store = new MemoryStore()
    const song = store.createSong("lang")
    expect(() =>
      store.saveDraft({ songId: song.id, name: "d", language: "  ", tokenizationMode: "word", body: "a" })
    ).toThrow(/language/)
  })
})
