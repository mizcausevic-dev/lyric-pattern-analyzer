# Lyric Pattern Analyzer

Local songwriter workstation. It reports structure and repetition statistics for lyric drafts you type or paste, and it shows how those statistics change between drafts. It does not score quality, suggest lines, or generate lyrics. Unreleased drafts stay on this machine in the desktop app.

## What runs where

- Windows desktop app: Electron, React, TypeScript, SQLite. The main process owns the database. The renderer cannot reach Node or the network.
- Browser preview: the same analysis core on invented nonce-word placeholders. It is a public page. Do not paste unreleased lyrics there.

Tested desktop OS: Windows 10.0.26200. This repository does not claim macOS or Linux desktop behavior. CI runs unit tests on `ubuntu-latest`.

## Commands

```powershell
npm install
npm test
npm run typecheck
npm run build
npm run build:preview
```

Desktop:

```powershell
npm run rebuild:electron
npm run dev
```

Packaging and code signing are not configured. There is no auto-updater. `publish` is null.

## Data

App data on Windows: `%APPDATA%\lyric-pattern-analyzer\lyric-pattern-analyzer.sqlite`. Storage is plaintext. Limits: 2,000 drafts, 200 KiB per draft.

Tokenization uses `Intl.Segmenter`. Word-based metrics are unsupported for scripts that do not separate words with spaces (for example Chinese and Japanese) unless you select **character-based mode**, which is labeled. Normalization (NFC, casefold, punctuation strip) is explicit and listed on the report.

Orthographic echo is identity or a shared written suffix. It is not rhyme. Rhyme and syllable counts stay unsupported because no pronunciation dictionary is shipped.

Exports (Markdown, JSON, CSV) omit lyric text unless you opt in to snippets. CSV has a formula-mitigated mode.

## GitHub

Private repository. The Pages site is a synthetic preview and sends `noindex`. For a user-owned GitHub account, a private repository does not make the Pages URL private. `noindex` and `robots.txt` are crawler hints, not access control. Do not put real lyrics in the preview.

## About

Local songwriter workstation for draft structure and repetition statistics. No quality score, no suggestions, no network.

Topics: `lyrics`, `songwriting`, `electron`, `sqlite`, `typescript`, `mattr`, `draft-diff`, `local-first`, `privacy`, `text-statistics`
