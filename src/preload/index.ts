import { contextBridge, ipcRenderer } from "electron"

const channels = [
  "workspace:info",
  "songs:list",
  "songs:create",
  "drafts:list",
  "drafts:get",
  "drafts:save",
  "drafts:delete",
  "drafts:analyze",
  "drafts:compare",
  "export:save"
] as const

const api = {
  invoke(channel: string, payload?: unknown) {
    if (!channels.includes(channel as (typeof channels)[number])) throw new Error("channel rejected")
    return ipcRenderer.invoke(channel, payload)
  }
}

contextBridge.exposeInMainWorld("lyric", api)
