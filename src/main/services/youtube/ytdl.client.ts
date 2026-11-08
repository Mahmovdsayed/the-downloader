// Singleton Ytdl client manager following @distube/ytdl-core lifecycle guidance

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ytdlModule: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ytdlInstance: any = null

export async function getYtdlModule() {
  if (!ytdlModule) {
    // Dynamic import to bridge ESM package into Electron runtime
    ytdlModule = await import('@distube/ytdl-core')
  }
  return ytdlModule
}

export async function getYtdlClient() {
  if (!ytdlInstance) {
    const { Ytdl } = await getYtdlModule()
    // Create one Ytdl instance per application to reuse player tokens and session metadata
    ytdlInstance = new Ytdl()
  }
  return ytdlInstance
}

export async function validateYouTubeUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== 'string') return null
  const { parseVideoId } = await getYtdlModule()
  try {
    const videoId = parseVideoId(url.trim())
    return videoId || null
  } catch {
    return null
  }
}

