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

const exphbs = require('express-handlebars')
const octicons = require('@primer/octicons')

const hbs = exphbs.create({ defaultLayout: 'main' })
hbs.handlebars.registerHelper('octicon', (name, className, height, width) => {
  const octicon = octicons[name]
  const options = {
    height: typeof height === 'number' ? height : 16,
    width: typeof width === 'number' ? width : 16
  }

  if (typeof octicon === 'undefined') return ''
  if (className) options.class = className.toString()

  return new hbs.handlebars.SafeString(octicon.toSVG(options))
})

hbs.handlebars.registerHelper('split', (string, char, index) => {
  return string.split(char)[index]
})

hbs.handlebars.registerHelper('bytes', (bytes) => {
  if (typeof bytes !== 'number') bytes = parseInt(bytes)

  const units = ['b', 'kb', 'mb', 'gb', 'tb']
  let unitIndex = 0

  while (Math.floor(bytes / 1000) !== 0) {
    bytes /= 1024
    if (unitIndex < units.length - 1) unitIndex++
  }

  return `${bytes.toFixed(2)} ${units[unitIndex]}`
})

module.exports = hbs
