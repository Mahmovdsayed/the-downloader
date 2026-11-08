import { VideoDetails } from '../../../shared/types/ipc.js'
import { getYtdlClient, validateYouTubeUrl } from './ytdl.client.js'
import { FormatSelectionService } from './format-selection.service.js'

// Cache raw info objects to avoid redundant network lookups and reuse tokens
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const videoInfoCache = new Map<string, { info: any; timestamp: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Fetch a thumbnail URL in the main process (which has network access) and
 * return it as a base64 data URI so the renderer never makes outbound HTTP
 * requests (which are blocked when contextIsolation + sandbox is enabled).
 */
async function fetchThumbnailAsDataUri(url: string): Promise<string | undefined> {
  try {
    // Use Node's built-in fetch (available in Node 18+)
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return undefined
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch {
    return undefined
  }
}

export class VideoInfoService {
  public static async getVideoDetails(url: string): Promise<VideoDetails> {
    const videoId = await validateYouTubeUrl(url)
    if (!videoId) {
      throw new Error('Please enter a valid YouTube video URL or ID.')
    }

    const yt = await getYtdlClient()

    // Check cache
    const cached = videoInfoCache.get(videoId)
    let rawInfo = cached?.info
    if (!rawInfo || Date.now() - (cached?.timestamp || 0) > CACHE_TTL_MS) {
      try {
        rawInfo = await yt.getInfo(url)
        videoInfoCache.set(videoId, { info: rawInfo, timestamp: Date.now() })
      } catch (err) {
        throw new Error(`Failed to retrieve video information: ${(err as Error).message}`)
      }
    }

    const details = rawInfo.videoDetails || {}
    const durationSeconds = parseInt(details.lengthSeconds || '0', 10)

    // Select best thumbnail — prefer medium-sized (480px wide) for balance of quality vs payload
    let thumbnailUrl: string | undefined
    if (Array.isArray(details.thumbnails) && details.thumbnails.length > 0) {
      const sorted = [...details.thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))
      // Pick the highest-res thumbnail but skip anything wider than 640 to keep data URI size sane
      const preferred = sorted.find((t) => (t.width || 9999) <= 640) || sorted[sorted.length - 1]
      const rawUrl: string | undefined = preferred?.url
      if (rawUrl) {
        // Fetch in main process and proxy as data URI → renderer never needs outbound HTTP
        thumbnailUrl = await fetchThumbnailAsDataUri(rawUrl)
        // Fallback: pass raw URL (works when renderer has network access)
        if (!thumbnailUrl) thumbnailUrl = rawUrl
      }
    }

    const normalizedFormats = FormatSelectionService.normalizeFormats(rawInfo.formats || [])

    return {
      id: videoId,
      url,
      title: details.title || 'Untitled YouTube Video',
      durationSeconds,
      thumbnailUrl,
      author: details.author?.name || undefined,
      formats: normalizedFormats,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static async getRawVideoInfo(url: string): Promise<any> {
    const videoId = await validateYouTubeUrl(url)
    if (videoId) {
      const cached = videoInfoCache.get(videoId)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.info
      }
    }

    const yt = await getYtdlClient()
    const info = await yt.getInfo(url)
    if (videoId) {
      videoInfoCache.set(videoId, { info, timestamp: Date.now() })
    }
    return info
  }
}


