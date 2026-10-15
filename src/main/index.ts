import { app, BrowserWindow, dialog, ipcMain, protocol, session } from "electron"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { assertInside } from "../core/paths"
import { SqliteStore } from "../store/sqlite"
import { CONTENT_SECURITY_POLICY, RENDERER_PREFERENCES, isAllowedUrl } from "./security"

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

let mainWindow: BrowserWindow | null = null
let store: SqliteStore | null = null

function rendererRoot(): string {
  return join(import.meta.dirname, "../renderer")
}

function allowedOrigin(url: string): boolean {
  return isAllowedUrl(url, process.env.ELECTRON_RENDERER_URL, app.isPackaged)
}

function assertSender(event: Electron.IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender.id !== mainWindow.webContents.id) throw new Error("sender rejected")
  if (event.senderFrame !== event.sender.mainFrame) throw new Error("frame rejected")
  if (!allowedOrigin(event.senderFrame.url)) throw new Error("origin rejected")
}

function requireStore(): SqliteStore {
  if (!store) throw new Error("workspace is not open")
  return store
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      ...RENDERER_PREFERENCES,
      preload: join(import.meta.dirname, "../preload/index.mjs")
    }
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault())
  if (process.env.ELECTRON_RENDERER_URL && !app.isPackaged) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await mainWindow.loadURL("app://local/index.html")
  }
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (isAllowedUrl(details.url, process.env.ELECTRON_RENDERER_URL, app.isPackaged)) {
      callback({})
      return
    }
    callback({ cancel: true })
  })
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.url.startsWith("app://")) {
      callback({ responseHeaders: details.responseHeaders })
      return
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [CONTENT_SECURITY_POLICY]
      }
    })
  })
  protocol.handle("app", async (request) => {
    const url = new URL(request.url)
    if (url.hostname !== "local") return new Response("forbidden", { status: 403 })
    const pathname = decodeURIComponent(url.pathname)
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "")
    try {
      const file = assertInside(rendererRoot(), join(rendererRoot(), relativePath))
      const bytes = await readFile(file)
      const type = file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : "text/html"
      return new Response(bytes, { headers: { "content-type": type } })
    } catch {
      return new Response("forbidden", { status: 403 })
    }
  })
  store = new SqliteStore(join(app.getPath("userData"), "lyric-pattern-analyzer.sqlite"))
  registerIpc()
  await createWindow()
})

const channels = {
  "workspace:info": () => requireStore().info(),
  "songs:list": () => requireStore().listSongs(),
  "songs:create": (payload: { name?: string }) => requireStore().createSong(payload.name ?? ""),
  "drafts:list": (payload: { songId?: string }) => requireStore().listDrafts(payload.songId ?? ""),
  "drafts:get": (payload: { id?: string }) => requireStore().getDraft(payload.id ?? ""),
  "drafts:save": (payload: {
    songId?: string
    name?: string
    language?: string
    tokenizationMode?: "word" | "character"
    body?: string
    id?: string
  }) =>
    requireStore().saveDraft({
      songId: payload.songId ?? "",
      name: payload.name ?? "",
      language: payload.language ?? "",
      tokenizationMode: payload.tokenizationMode === "character" ? "character" : "word",
      body: payload.body ?? "",
      id: payload.id
    }),
  "drafts:delete": (payload: { id?: string }) => {
    requireStore().deleteDraft(payload.id ?? "")
    return { ok: true }
  },
  "drafts:analyze": (payload: { id?: string; mattrWindow?: number; echoSuffixLength?: number; nfc?: boolean; casefold?: boolean; stripPunctuation?: boolean }) =>
    requireStore().analyze(payload.id ?? "", {
      mattrWindow: payload.mattrWindow,
      echoSuffixLength: payload.echoSuffixLength,
      normalization: {
        nfc: payload.nfc !== false,
        casefold: payload.casefold !== false,
        stripPunctuation: payload.stripPunctuation !== false
      }
    }),
  "drafts:compare": (payload: { leftId?: string; rightId?: string; mattrWindow?: number; echoSuffixLength?: number; nfc?: boolean; casefold?: boolean; stripPunctuation?: boolean }) =>
    requireStore().compare(payload.leftId ?? "", payload.rightId ?? "", {
      mattrWindow: payload.mattrWindow,
      echoSuffixLength: payload.echoSuffixLength,
      normalization: {
        nfc: payload.nfc !== false,
        casefold: payload.casefold !== false,
        stripPunctuation: payload.stripPunctuation !== false
      }
    })
} as const

function registerIpc(): void {
  for (const channel of Object.keys(channels) as Array<keyof typeof channels>) {
    ipcMain.handle(channel, (event, payload) => {
      assertSender(event)
      return channels[channel](payload ?? {})
    })
  }
  ipcMain.handle("export:save", async (event, payload: { filename?: string; content?: string }) => {
    assertSender(event)
    if (!mainWindow || typeof payload?.filename !== "string" || typeof payload.content !== "string") {
      throw new Error("invalid export")
    }
    const selected = await dialog.showSaveDialog(mainWindow, {
      defaultPath: payload.filename,
      filters: [{ name: "Export", extensions: ["md", "json", "csv"] }]
    })
    if (selected.canceled || !selected.filePath) return { saved: false }
    const { writeFile } = await import("node:fs/promises")
    await writeFile(selected.filePath, payload.content, "utf8")
    return { saved: true, path: selected.filePath }
  })
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
