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

const express = require('express')
const ytdl = require('ytdl-core')
const mime = require('mime-types')

const router = express.Router()

router.use(express.urlencoded({ extended: true }))

router.post('/download', async (req, res) => {
  try {
    let match = null
    if (typeof req.body.format === 'undefined') {
      throw new Error('Format is undefined')
    } else {
      match = req.body.format.match(/^([a-z0-9-_.]+\/[a-z0-9-_.]+)-(\d+)$/i)
      if (match === null) throw new Error('Format is invalid')
    }

    const format = match[1]
    const itag = match[2]
    const ext = mime.extension(format)
    const filename = `${req.body.filename}.${ext}`

    res.set('Content-Disposition', `attachment; filename=${filename}`)
    res.set('Content-Type', format)
    ytdl(req.body.url, { quality: itag }).pipe(res)
  } catch (error) {
    res.status(400).json({
      message: 'Unable to parse YouTube ID',
      error: error.message
    })
  }
})

module.exports = router
