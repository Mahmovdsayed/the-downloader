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
    // Video: by resolution descending, then fps descending
    // Audio: by bitrate descending
    return normalized.sort((a, b) => {
      if (a.hasVideo && b.hasVideo) {
        const resA = parseInt(a.qualityLabel?.replace(/\D/g, '') || '0', 10)
        const resB = parseInt(b.qualityLabel?.replace(/\D/g, '') || '0', 10)
        if (resA !== resB) return resB - resA
        return (b.fps || 0) - (a.fps || 0)
      }
      if (a.hasAudio && b.hasAudio) {
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
      // Pick highest bitrate audio
      return audioOnly.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]
    }
    // Fallback to any format with audio
    return rawFormats.find((f) => f && f.hasAudio) || null
  }
}

