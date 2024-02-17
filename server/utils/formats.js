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

const formats = require('ytdl-core/lib/formats.js')

formats[256] = {
  mimeType: 'audio/mp4; codecs="aac"',
  qualityLabel: null,
  bitrate: null,
  audioBitrate: 192
}

formats[258] = {
  mimeType: 'audio/m4a; codecs="aac"',
  qualityLabel: null,
  bitrate: null,
  audioBitrate: 384
}

formats[394] = {
  mimeType: 'video/mp4; codecs="av01.0.00M.08"',
  qualityLabel: '144p',
  bitrate: 0,
  audioBitrate: null
}

formats[395] = {
  mimeType: 'video/mp4; codecs="av01.0.00M.08"',
  qualityLabel: '240p',
  birate: 0,
  audioBitrate: null
}

formats[396] = {
  mimeType: 'video/mp4; codecs="av01.0.01M.08"',
  qualityLabel: '360p',
  bitrate: 0,
  audioBitrate: null
}

formats[397] = {
  mimeType: 'video/mp4; codecs="av01.0.04M.08"',
  qualityLabel: '480p',
  bitrate: 0,
  audioBitrate: null
}

formats[398] = {
  mimeType: 'video/mp4; codecs="av01.0.05M.08"',
  qualityLabel: '720p',
  bitrate: 0,
  audioBitrate: null
}

formats[399] = {
  mimeType: 'video/mp4; codecs="av01.0.08M.08"',
  qualityLabel: '1080p',
  bitrate: 0,
  audioBitrate: null
}

module.exports = formats
