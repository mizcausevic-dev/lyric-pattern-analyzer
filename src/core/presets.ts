export interface LyricPreset {
  id: string
  name: string
  section: string
  body: string
}

/** User-supplied sample, 2026-10-20. Not a quality example. Counts use written lines, not performed repeats. */
export const WOLF_STAY_QUIET_FULL = `VERSE

Talk too loud — I fade away
Never let ‘em see my play
Show no hand — feel no fear
Silent moves shift the air

Cold world — read your tone
If they know you — not your throne
Blink slow when chaos lead
Wolf don’t bark — still lead

HOOK (x2)

Don’t say nothin’ — I just stand
Shadow walk through the land
Hard to read — can’t foresee
Wolf stay quiet — still lead

OUTRO

Gone too quick — now they stare
Quiet talk fill the air
`

export const PRESETS: LyricPreset[] = [
  {
    id: "wolf-full",
    name: "Wolf stay quiet",
    section: "Full draft",
    body: WOLF_STAY_QUIET_FULL
  },
  {
    id: "wolf-verse",
    name: "Verse",
    section: "VERSE",
    body: `VERSE

Talk too loud — I fade away
Never let ‘em see my play
Show no hand — feel no fear
Silent moves shift the air

Cold world — read your tone
If they know you — not your throne
Blink slow when chaos lead
Wolf don’t bark — still lead
`
  },
  {
    id: "wolf-hook",
    name: "Hook (x2)",
    section: "HOOK",
    body: `HOOK (x2)

Don’t say nothin’ — I just stand
Shadow walk through the land
Hard to read — can’t foresee
Wolf stay quiet — still lead
`
  },
  {
    id: "wolf-outro",
    name: "Outro",
    section: "OUTRO",
    body: `OUTRO

Gone too quick — now they stare
Quiet talk fill the air
`
  }
]
