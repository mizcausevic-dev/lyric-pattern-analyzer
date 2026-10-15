# Lyric Pattern Analyzer specification

Status: implemented 0.1.0
Owner: Kinetic Gain LLC

## Universal requirements (music edition)

The universal requirements block was not attached as a separate file. Prior Kinetic Gain local tools in this workspace record that block as: no accounts, no telemetry, no collection, and no push or publish without approval. Music edition, as applied here: no bundled lyrics, no quality score, no suggestions, no AI output, unreleased drafts stay on the machine, import ownership is the user's responsibility.

This request explicitly orders a private GitHub push and a GitHub Pages preview. That sentence is the approval for those two actions only. No signing, notarization, or other hosting.

Conflict named: standing "Always" filename suffix `-Claude` vs Cursor system instructions `-Cursor`. Files generated in this repo use `-Cursor`.

## Purpose

Give songwriters objective structure and repetition statistics for their own lyric drafts and show how statistics change between drafts.

## Non-goals

Quality scores, writing suggestions, generative output, rhyme/syllable claims without a user-supplied licensed pronunciation dictionary, network sync, accounts.

## Analysis

- Sections: `[Label]` headers. Unlabeled text is one section. Empty and duplicate labels are preserved.
- Tokenization: `Intl.Segmenter` word or labeled character-based mode.
- Figures always include `n`.
- MATTR window default 50. Short texts report `insufficient length`.
- Plain TTR is shown with a length warning.
- Repeat share = lines in repeated line groups / total lyric lines after the shown normalization.
- Section similarity is pairwise among the same label family (`Verse 1` and `Verse 2` share family `verse`): token-set Jaccard and token-sequence normalized Levenshtein.
- Orthographic echo uses adjacent and alternating last-word identity or suffix match. Never labeled rhyme.
- Line-level LCS diff for two drafts. Statistic deltas include both `n` values.

## Privacy

Desktop: SQLite in userData, network requests cancelled except `app://local` and the local Vite renderer during unpackaged dev. Preview: in-memory only, `noindex`, invented placeholders.
