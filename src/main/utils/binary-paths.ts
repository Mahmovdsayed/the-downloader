import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { getPlatformArchKey, getBinaryExecutableName, isWindows } from './platform.js'

export interface ResolvedBinary {
  found: boolean
  path?: string
  error?: string
  isBundled: boolean
}

export function resolveBinaryPath(binaryName: string): ResolvedBinary {
  const exeName = getBinaryExecutableName(binaryName)
  const platformArch = getPlatformArchKey()

  // 1. Packaged location: inside process.resourcesPath/binaries/<platform-arch>/
  // 2. Unpackaged (development) location: <appRoot>/resources/binaries/<platform-arch>/
  const bundledDir = app.isPackaged
    ? path.join(process.resourcesPath, 'binaries', platformArch)
    : path.join(app.getAppPath(), 'resources', 'binaries', platformArch)

  const candidatePath = path.join(bundledDir, exeName)

  if (fs.existsSync(candidatePath)) {
    try {
      if (!isWindows) {
        try {
          fs.accessSync(candidatePath, fs.constants.X_OK)
        } catch {
          fs.chmodSync(candidatePath, 0o755)
        }
      }
      return {
        found: true,
        path: candidatePath,
        isBundled: true,
      }
    } catch (err) {
      return {
        found: false,
        error: `Permission error accessing bundled ${binaryName} at ${candidatePath}: ${(err as Error).message}`,
        isBundled: true,
      }
    }
  }

  // Fallback for development convenience: if not yet copied to resources/binaries in dev, check PATH
  if (!app.isPackaged) {
    const systemCandidate = isWindows
      ? exeName
      : `/opt/homebrew/bin/${exeName}`
    if (fs.existsSync(systemCandidate)) {
      return {
        found: true,
        path: systemCandidate,
        isBundled: false,
      }
    }
  }

  return {
    found: false,
    error: `Binary ${exeName} not found for architecture '${platformArch}' at ${candidatePath}.`,
    isBundled: false,
  }
}

