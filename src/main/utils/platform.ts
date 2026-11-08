export const isMac = process.platform === 'darwin'
export const isWindows = process.platform === 'win32'
export const isLinux = process.platform === 'linux'

export function getPlatformArchKey(): string {
  const platform = process.platform
  const arch = process.arch
  return `${platform}-${arch}`
}

export function getBinaryExecutableName(baseName: string): string {
  return isWindows ? `${baseName}.exe` : baseName
}

