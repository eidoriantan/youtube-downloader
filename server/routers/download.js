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
const router = require('express').Router()

const getExtension = require('../utils/mime.js').getExtension
const getMime = require('../utils/itag.js').getMime

router.get('/', async (req, res) => {
  const resultId = req.query.id || null
  const filename = req.query.filename || resultId

  if (resultId === null) {
    res.status(400).send('No ID')
    return
  }

  const temp = path.join(__dirname, '../../temp/')
  const filepath = path.join(temp, resultId.toString())
  if (!fs.existsSync(filepath)) {
    res.status(400).send('Convert the ID first')
    return
  }

  const parts = resultId.split('_')
  const hasVideo = typeof parts[1] !== 'undefined'
  const hasAudio = typeof parts[2] !== 'undefined'
  const videoMime = hasVideo && getMime(parts[1])
  const audioMime = hasAudio && getMime(parts[2])
  const resultMime = hasVideo ? videoMime : audioMime
  const ext = getExtension(resultMime)
  const resultName = encodeURIComponent(`${filename}.${ext}`)

  res.status(200)
  res.set('Content-Disposition', `attachment; filename=${resultName}`)
  res.set('Content-Type', resultMime)
  fs.createReadStream(filepath).pipe(res)
})

module.exports = router
