/**
 *  YouTube Downloader
 *  Copyright (C) 2020 Adriane Justine Tan
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const fs = require('fs')
const path = require('path')

const express = require('express')
const ytdl = require('ytdl-core')

const ffmpeg = require('fluent-ffmpeg')
const ffmpegStatic = require('ffmpeg-static')
ffmpeg.setFfmpegPath(ffmpegStatic)

const temp = path.join(__dirname, '../../temp/')
if (!fs.existsSync(temp)) fs.mkdirSync(temp)

const router = express.Router()

router.use(express.urlencoded({ extended: true }))

router.post('/download', async (req, res) => {
  try {
    const url = req.body.url
    const videoFormat = req.body['video-format']
    const audioFormat = req.body['audio-format']

    let id = ''
    let hasVideo = false
    let hasAudio = false
    let videoMime = ''
    let videoiTag = 0
    let audioMime = ''
    let audioiTag = 0

    if (typeof url === 'undefined') throw new Error('URL is undefined')
    else id = ytdl.getVideoID(url)

    if (typeof videoFormat === 'undefined') {
      throw new Error('Video format is undefined')
    } else if (videoFormat !== 'none') {
      hasVideo = true
      const match = videoFormat.match(/^(video\/[a-z0-9-_.]+)-(\d+)$/i)

      if (match !== null) {
        videoMime = match[1]
        videoiTag = match[2]
      } else throw new Error('Video format is invalid')
    }

    if (typeof audioFormat === 'undefined') {
      throw new Error('Audio format is undefined')
    } else if (audioFormat !== 'none') {
      hasAudio = true
      const match = audioFormat.match(/^(audio\/[a-z0-9-_.]+)-(\d+)$/i)

      if (match !== null) {
        audioMime = match[1]
        audioiTag = match[2]
      } else throw new Error('Audio format is invalid')
    }

    if (!hasVideo && !hasAudio) {
      throw new Error('Atleast 1 audio or video format should be included')
    }

    const resultMime = hasVideo ? videoMime : audioMime
    const ext = getExtension(resultMime)
    const filename = encodeURIComponent(`${req.body.filename}.${ext}`)

    const videoTempname = `${id}_${videoiTag}`
    const videoTemp = path.join(temp, videoTempname)
    const audioTempname = `${id}_${audioiTag}`
    const audioTemp = path.join(temp, audioTempname)

    let videoPipe = Promise.resolve(null)
    let audioPipe = Promise.resolve(null)

    if (hasVideo && !fs.existsSync(videoTemp)) {
      const videoWrite = fs.createWriteStream(videoTemp)
      const videoStream = ytdl(url, { quality: videoiTag })
      videoStream.pipe(videoWrite)
      videoPipe = new Promise((resolve, reject) => {
        videoWrite.on('finish', resolve)
        videoWrite.on('error', reject)
      })
    }

    if (hasAudio && !fs.existsSync(audioTemp)) {
      const audioWrite = fs.createWriteStream(audioTemp)
      const audioStream = ytdl(url, { quality: audioiTag })
      audioStream.pipe(audioWrite)
      audioPipe = new Promise((resolve, reject) => {
        audioWrite.on('finish', resolve)
        audioWrite.on('error', reject)
      })
    }

    await Promise.all([videoPipe, audioPipe])
    res.set('Content-Disposition', `attachment; filename=${filename}`)
    res.set('Content-Type', resultMime)
    res.status(200)

    if (hasVideo && hasAudio) {
      const outname = `${id}_${videoiTag}_${audioiTag}`
      const outpath = path.join(temp, outname)
      let exists = Promise.resolve(null)

      if (!fs.existsSync(outpath)) {
        exists = new Promise((resolve, reject) => {
          ffmpeg()
            .input(videoTemp).inputFormat(getExtension(videoMime))
            .input(audioTemp).inputFormat(getExtension(audioMime))
            .on('error', reject).on('end', resolve)
            .format(ext)
            .outputOptions(['-c:v copy', '-c:a aac'])
            .output(outpath)
            .run()
        })
      }

      await exists
      fs.createReadStream(outpath).pipe(res)
    } else if (hasVideo) {
      fs.createReadStream(videoTemp).pipe(res)
    } else if (hasAudio) {
      fs.createReadStream(audioTemp).pipe(res)
    }
  } catch (error) {
    res.status(400).json({
      message: 'Unable to convert video',
      error: error.message
    })
  }
})

function getExtension (mime) {
  let ext = ''
  switch (mime) {
    case 'audio/mp4':
      ext = 'm4a'
      break

    case 'video/mp4':
      ext = 'mp4'
      break

    case 'video/webm':
    case 'audio/webm':
      ext = 'webm'
  }

  return ext
}

module.exports = router
