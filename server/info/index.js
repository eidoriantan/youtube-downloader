/**
 *  YouTube Downloader
 *  Copyright (C) 2020 - 2022, Adriane Justine Tan
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
const asyncWrap = require('../utils/async-wrap.js')

const router = express.Router()

router.get('/', asyncWrap(async (req, res) => {
  try {
    const id = ytdl.getVideoID(req.query.url)
    const info = await ytdl.getInfo(id)
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly')
    const videoFormats = ytdl.filterFormats(info.formats, 'videoonly')
    res.json({
      success: true,
      message: 'No errors.',
      error: null,
      info: {
        ...info,
        audioFormats,
        videoFormats
      }
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Unable to parse YouTube ID',
      error: error.message,
      info: null
    })
  }
}))

module.exports = router
