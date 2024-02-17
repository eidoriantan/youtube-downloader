/**
 *  YouTube Downloader
 *  Copyright (C) 2020 - 2024, Adriane Justine Tan
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

const asyncWrap = require('../utils/async-wrap.js')
const formats = require('../utils/formats.js')
const mime = require('../utils/mime.js')
const getExtension = mime.getExtension
const getContainer = mime.getContainer

const temp = path.join(__dirname, '../../temp/')
if (!fs.existsSync(temp)) fs.mkdirSync(temp)

const router = express.Router()

router.post('/', asyncWrap(async (req, res) => {
  try {
    const url = req.body.url
    const videoiTag = req.body.videoitag
    const audioiTag = req.body.audioitag
    const convertMP3 = req.body.audioconvert

    let id = ''
    let hasVideo = false
    let hasAudio = false
    let videoMime = ''
    let audioMime = ''

    if (typeof url === 'undefined') throw new Error('URL is undefined')
    else id = ytdl.getVideoID(url)

    if (typeof videoiTag === 'undefined') {
      throw new Error('Video iTag is undefined')
    } else if (videoiTag !== '') {
      hasVideo = true
      videoMime = formats[videoiTag].mimeType
      if (videoMime === null) throw new Error('Unknown video iTag value')
    }

    if (typeof audioiTag === 'undefined') {
      throw new Error('Audio iTag is undefined')
    } else if (audioiTag !== '') {
      hasAudio = true
      audioMime = formats[audioiTag].mimeType
      if (audioMime === null) throw new Error('Unknown audio iTag value')
    }

    if (!hasVideo && !hasAudio) {
      throw new Error('Atleast 1 audio or video format should be included')
    }

    const resultMime = hasVideo ? videoMime : (convertMP3 ? 'audio/mpeg' : audioMime)
    const ext = getExtension(resultMime)

    const videoTempname = `${id}_${videoiTag}`
    const videoTemp = path.join(temp, videoTempname)
    const audioTempname = `${id}_${audioiTag}`
    const audioTemp = path.join(temp, audioTempname)
    const mp3Tempname = `${audioTempname}-mp3`
    const mp3Temp = path.join(temp, mp3Tempname)

    let videoPipe = Promise.resolve(null)
    let audioPipe = Promise.resolve(null)
    let result = null
    let fileExt = ext

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
    if (hasAudio && fs.existsSync(audioTemp) && convertMP3 && !fs.existsSync(mp3Temp)) {
      await new Promise((resolve, reject) => {
        const audioCont = getContainer(audioMime)
        ffmpeg()
          .input(audioTemp).inputFormat(audioCont)
          .on('error', reject).on('end', resolve)
          .format('mp3')
          .outputOptions(['-c:a libmp3lame', '-q:a 4'])
          .output(mp3Temp)
          .run()
      })
    }

    res.status(200)

    if (hasVideo && hasAudio) {
      const outname = `${id}_${videoiTag}_${audioiTag + (convertMP3 ? '-mp3' : '')}`
      const outpath = path.join(temp, outname)

      if (!fs.existsSync(outpath)) {
        const videoCont = getContainer(videoMime)
        const audioCont = convertMP3 ? 'mp3' : getContainer(audioMime)
        let audio = ''

        switch (videoCont) {
          case 'mp4':
            audio = convertMP3 ? 'libmp3lame' : 'aac'
            break

          case 'webm':
            audio = 'libopus'
            break

          default:
            audio = 'copy'
        }

        await new Promise((resolve, reject) => {
          ffmpeg()
            .input(videoTemp).inputFormat(videoCont)
            .input(convertMP3 ? mp3Temp : audioTemp)
            .inputFormat(convertMP3 ? 'mp3' : audioCont)
            .on('error', reject).on('end', resolve)
            .format(ext)
            .outputOptions(['-c:v copy', `-c:a ${audio}`])
            .output(outpath)
            .run()
        })
      }

      result = outname
    } else if (hasVideo) {
      result = videoTempname
    } else if (hasAudio) {
      result = convertMP3 ? mp3Tempname : audioTempname
      fileExt = getExtension(convertMP3 ? 'audio/mpeg' : audioMime)
    }

    res.json({ success: true, id: result, extension: fileExt })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}))

module.exports = router
