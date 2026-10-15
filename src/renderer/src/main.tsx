import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { electronClient } from "./client"
import "./styles.css"

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App client={electronClient()} />
  </StrictMode>
)
