import { VideoFormatOption } from '../../../shared/types/ipc.js'

export class FormatSelectionService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static normalizeFormats(rawFormats: any[]): VideoFormatOption[] {
    if (!Array.isArray(rawFormats)) return []

    const normalized: VideoFormatOption[] = []

    for (const f of rawFormats) {
      if (!f || typeof f.itag !== 'number') continue

      const hasVideo = Boolean(f.hasVideo)
      const hasAudio = Boolean(f.hasAudio)

      // Skip formats that have neither audio nor video
      if (!hasVideo && !hasAudio) continue

      let label = ''
      if (hasVideo && hasAudio) {
        label = `${f.qualityLabel || 'Video'} (${f.container || 'mp4'}) [Video+Audio]`
      } else if (hasVideo) {
        label = `${f.qualityLabel || 'Video'} (${f.container || 'mp4'}) [Video Only]`
      } else if (hasAudio) {
        const audioBitrate = f.audioBitrate || (f.bitrate ? Math.round(f.bitrate / 1000) : null)
        label = `${audioBitrate ? `${audioBitrate} kbps` : 'Audio'} (${f.container || 'audio'}) [Audio Only]`
      }

      normalized.push({
        itag: f.itag,
        label,
        container: f.container || undefined,
        qualityLabel: f.qualityLabel || undefined,
        hasAudio,
        hasVideo,
        videoCodec: f.videoCodec || undefined,
        audioCodec: f.audioCodec || undefined,
        fps: f.fps || undefined,
        bitrate: f.bitrate || undefined,
        contentLength: f.contentLength || undefined,
      })
    }

    // Sort formats logically:
    // Video: by resolution descending, prefer MP4/H264, then fps descending
    // Audio: by bitrate descending, prefer M4A/AAC
    return normalized.sort((a, b) => {
      if (a.hasVideo && b.hasVideo) {
        const resA = parseInt(a.qualityLabel?.replace(/\D/g, '') || '0', 10)
        const resB = parseInt(b.qualityLabel?.replace(/\D/g, '') || '0', 10)
        if (resA !== resB) return resB - resA
        const isMp4A = a.container === 'mp4' || a.videoCodec?.startsWith('avc') ? 1 : 0
        const isMp4B = b.container === 'mp4' || b.videoCodec?.startsWith('avc') ? 1 : 0
        if (isMp4A !== isMp4B) return isMp4B - isMp4A
        return (b.fps || 0) - (a.fps || 0)
      }
      if (a.hasAudio && b.hasAudio) {
        const isM4aA = a.container === 'm4a' || a.audioCodec?.includes('mp4a') || a.audioCodec?.includes('aac') ? 1 : 0
        const isM4aB = b.container === 'm4a' || b.audioCodec?.includes('mp4a') || b.audioCodec?.includes('aac') ? 1 : 0
        if (isM4aA !== isM4aB) return isM4aB - isM4aA
        return (b.bitrate || 0) - (a.bitrate || 0)
      }
      return 0
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static findBestAudioFormat(rawFormats: any[]): any {
    if (!Array.isArray(rawFormats)) return null
    const audioOnly = rawFormats.filter((f) => f && f.hasAudio && !f.hasVideo)
    if (audioOnly.length > 0) {
      // Prefer M4A (AAC) first so it can be stream-copied directly into MP4 without re-encoding
      const m4aAudio = audioOnly.filter(
        (f) => f.container === 'm4a' || f.audioCodec?.includes('mp4a') || f.audioCodec?.includes('aac'),
      )
      if (m4aAudio.length > 0) {
        return m4aAudio.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]
      }
      // Otherwise pick highest bitrate audio
      return audioOnly.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]
    }
    // Fallback to any format with audio
    return rawFormats.find((f) => f && f.hasAudio) || null
  }
}

