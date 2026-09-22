import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

import { assertMediaCapabilities } from './capabilities'

const coreBaseUrl = process.env.REACT_APP_FFMPEG_CORE_URL || '/assets/ffmpeg'

let ffmpegPromise

const loadCore = async (ffmpeg) => {
  const coreUrl = await toBlobURL(`${coreBaseUrl}/ffmpeg-core.js`, 'text/javascript')
  const wasmUrl = await toBlobURL(`${coreBaseUrl}/ffmpeg-core.wasm`, 'application/wasm')

  await ffmpeg.load({ coreURL: coreUrl, wasmURL: wasmUrl })
  return ffmpeg
}

export const getFfmpeg = () => {
  assertMediaCapabilities()

  if (!ffmpegPromise) {
    ffmpegPromise = loadCore(new FFmpeg()).catch((error) => {
      ffmpegPromise = undefined
      throw error
    })
  }

  return ffmpegPromise
}

export const readMediaFile = (file) => fetchFile(file)
