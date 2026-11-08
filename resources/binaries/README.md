# Bundled FFmpeg & FFprobe Binaries

This directory contains platform- and architecture-specific static builds of `ffmpeg` and `ffprobe`.

## Directory Structure

```text
resources/binaries/
├── darwin-arm64/        # macOS Apple Silicon (M1/M2/M3/M4)
│   ├── ffmpeg
│   └── ffprobe
├── darwin-x64/          # macOS Intel (x86_64)
│   ├── ffmpeg
│   └── ffprobe
├── win32-x64/           # Windows 64-bit (x86_64)
│   ├── ffmpeg.exe
│   └── ffprobe.exe
└── win32-arm64/         # Windows on ARM (ARM64)
    ├── ffmpeg.exe
    └── ffprobe.exe
```

## Recommended Static Build Sources

### 1. macOS (darwin-arm64 & darwin-x64)
- **Evermeet**: [https://evermeet.cx/ffmpeg/](https://evermeet.cx/ffmpeg/) (Signed static builds)
- **Homebrew builds**: `/opt/homebrew/bin/ffmpeg` or built from source with `--enable-shared=no`

### 2. Windows (win32-x64 & win32-arm64)
- **Gyan.dev**: [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/) (Official release builds)
- **BtbN / FFmpeg-Builds**: [https://github.com/BtbN/FFmpeg-Builds/releases](https://github.com/BtbN/FFmpeg-Builds/releases) (GPL / LGPL builds)

## Licensing & Redistribution Compliance

FFmpeg is licensed under the **GNU Lesser General Public License (LGPL) version 2.1 or later**. However, if custom builds enable non-free libraries or GPL-only components (such as `libx264` or `libx265`), the entire binary becomes subject to the **GNU General Public License (GPL) version 2 or 3**.

### Important Rules for Redistribution:
1. **No Proprietary Linking**: This application executes `ffmpeg` and `ffprobe` purely as standalone subprocesses via fixed argument arrays using Node's `child_process.spawn`. It does not link or bind against FFmpeg shared libraries (`.dylib` / `.dll`).
2. **Attribution**: You must include the FFmpeg copyright notice and source code URL in the app's About / Legal section.
3. **Source Code Availability**: If redistributing GPL-compiled binaries, you must provide access to the exact FFmpeg build configuration and source code upon request.
4. **macOS Gatekeeper & Code Signing**: Before distribution, binaries in `darwin-*` must be signed with your Apple Developer ID and notarized alongside the main `.app` bundle.

