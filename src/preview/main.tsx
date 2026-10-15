import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { PLACEHOLDER_DRAFT } from "./placeholder"
import { App } from "../renderer/src/App"
import { memoryClient } from "../renderer/src/client"
import { MemoryStore } from "../store/memory"
import "../renderer/src/styles.css"

const store = new MemoryStore()
const song = store.createSong("Synthetic placeholder song")
store.saveDraft({
  songId: song.id,
  name: "Placeholder A",
  language: "en",
  tokenizationMode: "word",
  body: PLACEHOLDER_DRAFT.a
})
store.saveDraft({
  songId: song.id,
  name: "Placeholder B",
  language: "en",
  tokenizationMode: "word",
  body: PLACEHOLDER_DRAFT.b
})

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App client={memoryClient(store)} />
  </StrictMode>
)
