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
const hbs = require('./server/handlebars.js')
const views = require('./server/views.js')
const routers = require('./server/routers.js')
const libraries = require('./server/libraries.js')

const app = express()
let server = null

const port = process.env.PORT || 8080
const host = process.env.HOST || '0.0.0.0'

app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')

app.use('/', express.static('public'))
app.use('/libs', libraries)
app.use('/', views)
app.use('/', routers)

server = app.listen(port, host, () => {
  console.log(`Server is running on port: ${port}`)
})

async function exit (code) {
  if (server !== null) {
    server.close()
    server = null
  }

  process.exit(code)
}

process.on('exit', exit)
process.on('SIGTERM', exit)
process.on('SIGINT', exit)
