export const MAX_DRAFTS = 2000
export const MAX_DRAFT_BYTES = 200 * 1024

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

export function assertDraftSize(text: string): void {
  const bytes = utf8ByteLength(text)
  if (bytes > MAX_DRAFT_BYTES) {
    throw new Error(`Draft exceeds 200 KiB limit (${bytes} bytes).`)
  }
}
