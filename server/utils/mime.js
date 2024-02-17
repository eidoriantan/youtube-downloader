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

function getContainer (mime) {
  let container = ''
  mime = mime.split(';')[0]

  switch (mime) {
    case 'audio/mpeg':
      container = 'mp3'
      break

    case 'audio/m4a':
    case 'audio/mp4':
      container = 'm4a'
      break

    case 'video/3gpp':
      container = '3gp'
      break

    case 'video/mp4':
      container = 'mp4'
      break

    case 'video/x-flv':
      container = 'flv'
      break

    case 'video/webm':
    case 'audio/webm':
      container = 'webm'
      break
  }

  return container
}

function getExtension (mime) {
  let ext = ''
  mime = mime.split(';')[0]

  switch (mime) {
    case 'audio/mpeg':
      ext = 'mp3'
      break

    case 'audio/m4a':
    case 'audio/mp4':
      ext = 'm4a'
      break

    case 'video/3gpp':
      ext = '3gp'
      break

    case 'video/mp4':
      ext = 'mp4'
      break

    case 'video/x-flv':
      ext = 'flv'
      break

    case 'audio/webm':
    case 'video/webm':
      ext = 'webm'
      break
  }

  return ext
}

module.exports = { getContainer, getExtension }
