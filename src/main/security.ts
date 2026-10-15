export const RENDERER_PREFERENCES = {
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  webSecurity: true,
  allowRunningInsecureContent: false
} as const

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
  "form-action 'none'"
].join("; ")

export function isAllowedUrl(url: string, devRendererUrl: string | undefined, packaged: boolean): boolean {
  if (url.startsWith("app://")) {
    try {
      return new URL(url).hostname === "local"
    } catch {
      return false
    }
  }
  if (!packaged && devRendererUrl && url.startsWith(devRendererUrl)) return true
  if (url.startsWith("devtools://") || url.startsWith("devtools:")) return true
  return false
}
