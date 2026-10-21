import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { PRESETS } from "../core/presets"
import { App } from "../renderer/src/App"
import { memoryClient } from "../renderer/src/client"
import { MemoryStore } from "../store/memory"
import "../renderer/src/styles.css"

const store = new MemoryStore()
const song = store.createSong("Wolf stay quiet")
for (const preset of PRESETS) {
  store.saveDraft({
    songId: song.id,
    name: preset.name,
    language: "en",
    tokenizationMode: "word",
    body: preset.body
  })
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App client={memoryClient(store)} />
  </StrictMode>
)
