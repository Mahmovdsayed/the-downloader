# Local Video Downloader

A local-first desktop application for macOS and Windows that downloads YouTube videos entirely on-device — no cloud backend, no telemetry, no accounts.

Built with **Electron · React · TypeScript · Vite · Tailwind CSS · Bun · @distube/ytdl-core · FFmpeg**.

---

## Features

- **Paste any YouTube URL** → fetch video metadata, thumbnail, duration, author
- **Format picker** — Video+Audio, Video-Only, Audio-Only tabs with quality, codec, bitrate, and estimated file size
- **FFmpeg merge** — video-only formats are automatically paired with the best available audio stream and muxed locally
- **Trim** — optional clip range (hh:mm:ss) applied before saving via `ffmpeg -c copy`
- **Native save dialog** — choose exact output file path and name
- **Real-time progress** — per-phase status (preparing → downloading video → downloading audio → merging → saving), speed (MB/s), ETA, bytes downloaded
- **Cancel** — immediately destroys streams, kills FFmpeg processes, and removes temp files
- **Auto-updater** — GitHub Releases via `electron-updater` (enabled in signed/packaged builds)
- **Bundled FFmpeg** — no system install required; binaries resolved at runtime from `Resources/binaries/`

---

## Requirements

| Tool | Version |
|------|---------|
| [Bun](https://bun.sh) | ≥ 1.0 |
| Node.js | Not required (Electron embeds Node v20) |
| macOS | 12 Monterey or later (arm64 and x64) |
| Windows | 10/11 x64 |

---

## Setup

```bash
# 1. Install dependencies
bun install

# 2. Place FFmpeg binaries (see section below)

# 3. Start in development mode
bun run dev
```

---

## FFmpeg Binaries

The app bundles **static** FFmpeg and FFprobe binaries. They are **not** committed to git.  
Place the correct binaries for each target platform:

```
resources/binaries/
├── darwin-arm64/
│   ├── ffmpeg          # Apple Silicon
│   └── ffprobe
├── darwin-x64/
│   ├── ffmpeg          # Intel Mac
│   └── ffprobe
├── win32-x64/
│   ├── ffmpeg.exe
│   └── ffprobe.exe
└── win32-arm64/
    ├── ffmpeg.exe
    └── ffprobe.exe
```

### Where to get static builds

| Platform | Source |
|----------|--------|
| macOS arm64 / x64 | [evermeet.cx/ffmpeg](https://evermeet.cx/ffmpeg/) or Homebrew: `brew install ffmpeg` then copy from `/opt/homebrew/bin/` |
| Windows x64 | [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/) — use the `essentials` static build |

After placing the binaries, make them executable on macOS:

```bash
chmod +x resources/binaries/darwin-arm64/ffmpeg
chmod +x resources/binaries/darwin-arm64/ffprobe
```

The app's **Home / System Status** screen will confirm binary detection and version.

---

## Available Scripts

```bash
bun run dev          # Start Electron + Vite dev server (hot-reload)
bun run build        # Production build (renderer + main + preload)
bun run typecheck    # TypeScript type check only (no emit)
bun run package      # Build + package (no installer)
bun run make:mac     # Build + create macOS DMG (requires BypassSandbox / native terminal)
bun run make:win     # Build + create Windows NSIS installer
bun run make:all     # Both platforms
```

---

## Architecture

```
src/
├── main/                   # Electron main process (Node.js, privileged)
│   ├── index.ts            # Entry point, single-instance lock
│   ├── app/
│   │   └── lifecycle.ts    # BrowserWindow creation, CSP, navigation guard
│   ├── ipc/                # IPC handler registration
│   │   ├── index.ts        # Registers all 4 handler groups
│   │   ├── video.ipc.ts    # VIDEO_GET_INFO
│   │   ├── download.ipc.ts # DOWNLOADS_START / CANCEL / OPEN_FOLDER
│   │   ├── dialog.ipc.ts   # DIALOG_CHOOSE_SAVE_PATH / SAVE_LOCATION
│   │   └── updater.ipc.ts  # APP_GET_INFO, FFMPEG_GET_STATUS, updater events
│   ├── jobs/
│   │   ├── download-job.manager.ts   # Job lifecycle, cancel, IPC progress broadcast
│   │   └── download-job.types.ts
│   ├── services/
│   │   ├── youtube/
│   │   │   ├── ytdl.client.ts            # Singleton Ytdl via dynamic import()
│   │   │   ├── video-info.service.ts     # getVideoDetails() with 30-min cache
│   │   │   ├── format-selection.service.ts
│   │   │   └── download.service.ts       # Dual-stream and single-stream paths
│   │   ├── media/
│   │   │   ├── ffmpeg.service.ts         # mergeStreams(), getStatus()
│   │   │   ├── ffprobe.service.ts
│   │   │   └── trim.service.ts           # trimFile() with -c copy
│   │   ├── updater/
│   │   │   └── updater.service.ts        # Lazy CJS require for electron-updater
│   │   └── files/
│   │       └── file-dialog.service.ts
│   └── utils/
│       ├── binary-paths.ts   # Resolves bundled/dev FFmpeg paths
│       └── platform.ts
│
├── preload/
│   ├── index.ts    # contextBridge — exposes typed DesktopApi only
│   └── index.d.ts
│
├── renderer/src/   # React UI (sandboxed, no Node.js access)
│   ├── App.tsx
│   ├── components/layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx     # Download / History / Settings / About
│   └── features/
│       ├── downloader/     # Main download workflow
│       │   ├── index.tsx               # State machine screen
│       │   ├── components/
│       │   │   ├── url-input.tsx
│       │   │   ├── video-preview.tsx
│       │   │   ├── format-selector.tsx
│       │   │   ├── trim-range.tsx
│       │   │   ├── destination-picker.tsx
│       │   │   └── download-progress.tsx
│       │   └── hooks/
│       │       └── use-download.ts
│       ├── downloads/      # History placeholder
│       ├── settings/       # Theme, default save dir, preferences
│       └── about/          # App info, updater UI
│
└── shared/
    └── types/
        └── ipc.ts    # Shared types + IPC_CHANNELS constants
```

### Security model

- Renderer has `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Preload exposes **only** the `DesktopApi` interface via `contextBridge` — no raw `ipcRenderer`
- CSP is applied per-session; `connect-src: none` in production builds
- FFmpeg is spawned as a child process via `spawn(binary, args, { shell: false })` — no shell injection possible
- User-supplied URLs are never interpolated into shell commands

---

## IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `video:get-info` | invoke | Fetch `VideoDetails` (metadata + format list) |
| `downloads:start` | invoke | Start a download job (fire-and-forget; progress via event) |
| `downloads:cancel` | invoke | Cancel job by ID |
| `downloads:on-progress` | main→renderer event | `DownloadProgress` updates |
| `downloads:open-folder` | invoke | `shell.showItemInFolder()` |
| `dialog:choose-save-path` | invoke | Native save dialog with filters |
| `dialog:choose-save-location` | invoke | Native folder picker |
| `app:get-info` | invoke | Version, platform, Electron/Node/Chrome versions |
| `ffmpeg:get-status` | invoke | Binary availability and version strings |
| `updater:*` | invoke / event | Auto-updater lifecycle |

---

## Packaging & Distribution

### macOS (unsigned — local dev)

```bash
bun run make:mac   # → release/Local Video Downloader-{version}-arm64.dmg
```

For **notarized distribution**, set your Apple Developer credentials in `electron-builder.yml`:
```yaml
mac:
  identity: "Developer ID Application: Your Name (TEAMID)"
  notarize:
    teamId: "TEAMID"
```

### Windows

```bash
bun run make:win   # → release/Local Video Downloader Setup {version}.exe
```

### Auto-updates

Auto-updates use **GitHub Releases** as the provider. To configure:

1. Create a GitHub repository and add it to `electron-builder.yml`:
   ```yaml
   publish:
     provider: github
     owner: your-username
     repo: your-repo
   ```
2. Set `GH_TOKEN` in your CI environment (write access to Releases)
3. Run `bun run make:all` — the builder uploads artifacts to a draft release

> Auto-updates only activate in **packaged, signed** builds. In development mode, the updater is safely mocked.

---

## Known Limitations

- YouTube downloads only (`@distube/ytdl-core`) — no other platforms
- `@distube/ytdl-core@5.2.1` requires Node `^22 || ^24 || >=26`; loaded via dynamic `import()` inside Electron's Node v20 runtime (ESM-compatible path)
- Trim uses `-c copy` (stream copy) — output boundaries snap to nearest keyframes; exact frame accuracy requires re-encoding
- Download history is not persisted across app restarts (no local DB yet)
- DRM-protected content and age-restricted videos are not supported

---

## Development Notes

### Why dynamic `import()` for ytdl-core?

`@distube/ytdl-core@5.2.1` requires Node ≥ 22 for its native `require()` path. Electron v33 embeds Node v20. Using `await import('@distube/ytdl-core')` bypasses the `engines` check and works correctly with Electron's ESM loader.

### Why no `"type": "module"` in package.json?

`vite-plugin-electron/simple` builds main/preload as **CommonJS** when `"type"` is absent. `electron-updater` is a CJS module and must be loaded via `require()` at runtime (lazy, only when `app.isPackaged`).

### ELECTRON_RUN_AS_NODE

The IDE sandbox sets `ELECTRON_RUN_AS_NODE=1`, which breaks Electron's app mode. `vite.config.ts` deletes this variable before spawning Electron.
