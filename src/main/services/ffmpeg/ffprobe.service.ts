import { executeBinaryVersionCheck, BinaryVersionResult } from './ffmpeg.service.js'

export class FfprobeService {
  public static async checkVersion(): Promise<BinaryVersionResult> {
    return executeBinaryVersionCheck('ffprobe')
  }
}

