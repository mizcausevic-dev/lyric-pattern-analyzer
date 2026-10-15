import { resolve, sep } from "node:path"

export function assertInside(root: string, candidate: string): string {
  const resolvedRoot = resolve(root)
  const resolved = resolve(candidate)
  const prefix = resolvedRoot.endsWith(sep) ? resolvedRoot : `${resolvedRoot}${sep}`
  if (resolved !== resolvedRoot && !resolved.startsWith(prefix)) {
    throw new Error("path rejected")
  }
  return resolved
}
