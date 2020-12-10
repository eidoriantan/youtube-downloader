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

function getMime (iTag) {
  let mime = ''
  switch (iTag) {
    case '5': case '6': case '34': case '35':
      mime = 'video/x-flv'
      break

    case '17': case '36':
      mime = 'video/3gpp'
      break

    case '18': case '22': case '37': case '38': case '82': case '83': case '84':
    case '85': case '133': case '134': case '135': case '136': case '137':
    case '138': case '160': case '264': case '266': case '298': case '299':
      mime = 'video/mp4'
      break

    case '43': case '44': case '45': case '46': case '100': case '101':
    case '102': case '167': case '168': case '169': case '218': case '219':
    case '242': case '243': case '244': case '245': case '246': case '247':
    case '248': case '271': case '272': case '278': case '302': case '303':
    case '308': case '313': case '315': case '330': case '331': case '332':
    case '333': case '334': case '335': case '336': case '337':
      mime = 'video/webm'
      break

    case '139': case '140': case '141':
      mime = 'audio/mp4'
      break

    case '171': case '249': case '250': case '251':
      mime = 'audio/webm'
      break

    default:
      mime = null
  }

  return mime
}

module.exports = { getMime }
