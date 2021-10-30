/**
 *  YouTube Downloader
 *  Copyright (C) 2020 - 2021, Adriane Justine Tan
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

const router = require('express').Router()
const formats = require('../utils/formats.js')
const getExtension = require('../utils/mime.js').getExtension

router.get('/', async (req, res) => {
  const resultId = req.query.id || null
  const filename = req.query.filename || resultId

  if (resultId === null) {
    res.status(400).send('No ID')
    return
  }

  const regex = /^([a-z0-9_-]{11})_([0-9]+)(_([0-9]+))?(-mp3)?$/i
  const match = resultId.match(regex)
  if (match === null) {
    res.status(400).send('Invalid result ID')
    return
  }

  const temp = path.join(__dirname, '../../temp/')
  const filepath = path.join(temp, resultId)
  if (!fs.existsSync(filepath)) {
    res.status(400).send('Convert the ID first')
    return
  }

  const hasVideo = typeof match[2] !== 'undefined'
  const hasAudio = typeof match[4] !== 'undefined'
  const convertedMP3 = typeof match[5] !== 'undefined'
  const videoiTag = match[2]
  const audioiTag = match[4]
  const videoMime = hasVideo && formats[videoiTag].mimeType
  const audioMime = hasAudio ? (convertedMP3 ? 'audio/mpeg' : formats[audioiTag].mimeType) : false
  const resultMime = hasVideo ? videoMime : audioMime
  const ext = getExtension(resultMime)
  const resultName = encodeURIComponent(`${filename}.${ext}`)

  res.status(200)
  res.set('Content-Disposition', `attachment; filename=${resultName}`)
  res.set('Content-Type', resultMime)
  fs.createReadStream(filepath).pipe(res)
})

module.exports = router
