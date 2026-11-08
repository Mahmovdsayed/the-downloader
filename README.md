# Local Video Downloader — Desktop Foundation

A local-first, privacy-focused desktop application architecture for macOS and Windows built with **Electron**, **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **Bun**, and bundled **FFmpeg / FFprobe** binaries.

This repository implements the complete, hardened desktop architecture foundation. All media processing and file operations run directly on the user's computer with **zero remote servers**, **zero cloud dependencies**, and **no external telemetry**.

---

## Architecture Overview

The application enforces strict separation between three isolated tiers:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Renderer Process (React UI)                  │
│       • Sandboxed WebContext (contextIsolation: true)           │
│       • No Node.js runtime access (nodeIntegration: false)      │
│       • Communicates strictly via window.electronAPI            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                   Typed contextBridge Bridge
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                     Preload Process Bridge                      │
│       • Exposes curated, type-safe API methods                  │
│       • Never leaks ipcRenderer directly                        │
│       • Returns cleanup callbacks for updater subscriptions     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                       Strict Typed IPC Channels
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                      Main Process (Electron)                    │
│       • Privileged system coordinator                           │
│       • Strict IPC input validation                             │
│       • Resolves & executes bundled FFmpeg / FFprobe binaries   │
│       • Spawns fixed argument arrays (never shell strings)      │
│       • Restrictive Content Security Policy (CSP)               │
│       • electron-updater (GitHub Releases provider)             │
│       • Native system file dialogs                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```text
local-video-downloader/
├── build/
│   ├── icons/
│   │   ├── icon.icns            # macOS application icon
│   │   └── icon.png             # Master 512x512 icon
│   └── entitlements.mac.plist   # macOS hardened runtime entitlements
├── resources/
│   └── binaries/
│       ├── README.md            # Redistribution and sourcing guide
│       ├── darwin-arm64/        # macOS Apple Silicon (M1/M2/M3/M4)
│       │   ├── ffmpeg
│       │   └── ffprobe
│       ├── darwin-x64/          # macOS Intel (x86_64)
│       │   ├── ffmpeg
│       │   └── ffprobe
│       ├── win32-x64/           # Windows 64-bit (x86_64)
│       │   ├── ffmpeg.exe
│       │   └── ffprobe.exe
│       └── win32-arm64/         # Windows on ARM (ARM64)
│           ├── ffmpeg.exe
│           └── ffprobe.exe
├── src/
│   ├── main/
│   │   ├── index.ts                     # Main entry point & single-instance lock
│   │   ├── app/
│   │   │   └── lifecycle.ts             # Window lifecycle & CSP headers
│   │   ├── ipc/
│   │   │   ├── index.ts                 # IPC handler registrar
│   │   │   └── app.ipc.ts               # Handlers for app, ffmpeg, dialog, updater
│   │   ├── services/
│   │   │   ├── ffmpeg/
│   │   │   │   ├── binary-paths.ts      # Packaged vs dev runtime path resolver
│   │   │   │   ├── ffmpeg.service.ts    # Safe spawn execution with fixed args
│   │   │   │   └── ffprobe.service.ts   # Probe version verification
│   │   │   ├── updater/
│   │   │   │   └── updater.service.ts   # electron-updater service (GitHub Releases)
│   │   │   └── files/
│   │   │       └── file-dialog.service.ts # Native directory selection
│   │   └── utils/
│   │       └── platform.ts              # Platform & architecture helpers
│   ├── preload/
│   │   ├── index.ts                     # Safe contextBridge exposition
│   │   └── index.d.ts                   # Window interface typings
│   ├── shared/
│   │   └── types/
│   │       └── ipc.ts                   # Unified IPC contract & channel constants
│   └── renderer/
│       ├── index.html                   # HTML entry point with CSP
│       └── src/
│           ├── main.tsx                 # React DOM mount point
│           ├── App.tsx                  # Root layout & tab router
│           ├── styles/
│           │   └── globals.css          # Tailwind base & CSS variables
│           ├── components/
│           │   ├── layout/
│           │   │   ├── Header.tsx       # Drag region & titlebar
│           │   │   └── Sidebar.tsx      # View navigation
│           │   └── ui/
│           ├── features/
│           │   ├── home/
│           │   │   └── HomeScreen.tsx   # FFmpeg engine status & capability cards
│           │   ├── settings/
│           │   │   └── SettingsScreen.tsx # Themes, directories, preferences
│           │   └── about/
│           │       └── AboutScreen.tsx  # Version info, auto-updater, licenses
│           ├── lib/
│           │   └── utils.ts             # Tailwind class merging
│           └── types/
│               └── electron.d.ts        # Renderer Window type augmentation
├── .gitignore
├── electron-builder.yml                 # Packaging config (DMG & NSIS)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Prerequisites

- [Bun](https://bun.sh/) (v1.1+ recommended) or Node.js (v20+ / v22+)
- Xcode Command Line Tools (on macOS: `xcode-select --install`)

---

## Getting Started

### 1. Install Dependencies
```bash
bun install
```

### 2. Start Development Environment
```bash
bun run dev
```
This boots the Vite React hot-reloading dev server and launches the Electron application shell with hot module replacement (HMR).

### 3. Type Checking & Code Quality
```bash
bun run typecheck
```

### 4. Build Application Bundles
```bash
bun run build
```
Compiles:
- Renderer assets into `dist/`
- Main process into `dist-electron/main/`
- Preload script into `dist-electron/preload/`

---

## Bundled FFmpeg & FFprobe Setup

The application looks for static `ffmpeg` and `ffprobe` binaries in:
- **Development**: `<projectRoot>/resources/binaries/<platform-arch>/`
- **Packaged App**: `<process.resourcesPath>/binaries/<platform-arch>/`

Supported architectures:
- `darwin-arm64` (Apple Silicon M1/M2/M3/M4)
- `darwin-x64` (macOS Intel)
- `win32-x64` (Windows 64-bit)
- `win32-arm64` (Windows ARM64)

### Where to Obtain Static Binaries:
1. **macOS**:
   - Download signed static builds from [Evermeet](https://evermeet.cx/ffmpeg/) or build from source.
   - For local development on Apple Silicon, copy from Homebrew:
     ```bash
     cp /opt/homebrew/bin/ffmpeg resources/binaries/darwin-arm64/
     cp /opt/homebrew/bin/ffprobe resources/binaries/darwin-arm64/
     chmod +x resources/binaries/darwin-arm64/*
     ```
2. **Windows**:
   - Download official release builds from [Gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases).
   - Extract `ffmpeg.exe` and `ffprobe.exe` into `resources/binaries/win32-x64/`.

### Legal & Redistribution Compliance:
- FFmpeg is licensed under the **GNU Lesser General Public License (LGPL) version 2.1 or later**, or **GNU General Public License (GPL) version 2 or 3** depending on compiled codecs (e.g. `x264`).
- **No Dynamic Linking**: This application executes FFmpeg as an independent external binary subprocess via Node's `child_process.spawn` with fixed argument arrays (`['-version']`).
- **Source Availability & Notices**: If redistributing GPL builds, you must provide access to the exact build scripts and source code, along with copyright notices in the About section.

---

## Packaging & Distribution

### 1. Test Local Packaged Build (Directory Mode)
```bash
bun run package
```
Generates an unpacked `.app` bundle in `release/mac-arm64/` with binaries copied into `Contents/Resources/binaries/darwin-arm64/`.

### 2. Build macOS DMG & ZIP
```bash
bun run make:mac
```
Builds:
- `release/Local Video Downloader-<version>-arm64.dmg`
- `release/Local Video Downloader-<version>-arm64-mac.zip`

### 3. Build Windows NSIS Installer (on Windows machine or CI)
```bash
bun run make:win
```
Builds:
- `release/Local Video Downloader Setup <version>.exe`

---

## Code Signing & Auto-Updates

### Auto-Update Provider (GitHub Releases)
The auto-updater uses `electron-updater` configured in `electron-builder.yml`:
```yaml
publish:
  provider: github
  owner: Mahmovdsayed
  repo: the-downloader
  releaseType: release
```

- In development mode (`!app.isPackaged`), update checks are safely mocked to avoid throwing unhandled updater errors.
- In production, updates can be published by creating a signed release on GitHub and generating the `latest-mac.yml` / `latest.yml` update metadata.

### macOS Developer ID Signing & Notarization
To distribute outside the Mac App Store and support seamless auto-updates on macOS:
1. Obtain an **Apple Developer ID Application** certificate from developer.apple.com.
2. Set environment variables:
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="YOURTEAMID"
   ```
3. `electron-builder` will automatically apply the entitlements in `build/entitlements.mac.plist`, sign the binary with Hardened Runtime enabled, and notarize the DMG with Apple's notary service.

### Windows Authenticode Signing
For Windows distribution without SmartScreen warnings:
1. Obtain an EV (Extended Validation) code signing certificate or use Azure Trusted Signing.
2. Set environment variables or configure `win.certificateFile` / `win.certificatePassword` in `electron-builder.yml`.

---

## Scope & Non-Goals

As specified in the architectural project brief, this repository represents the desktop application foundation only:
- ❌ No `yt-dlp` or third-party scraper scripts are included.
- ❌ No platform downloaders (YouTube, TikTok, Instagram) are implemented.
- ❌ No user accounts or backend server connections are created.
