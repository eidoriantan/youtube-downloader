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

const path = require('path')
const express = require('express')

const envPath = path.resolve(__dirname, '..', '.env')
require('dotenv').config({ path: envPath })

const info = require('./info/')
const convert = require('./convert/')
const download = require('./download/')

const app = express()
const port = process.env.SERVER_PORT || 3001
const appBuild = path.resolve(__dirname, '../build')

app.use(express.static(appBuild))
app.use(express.json())

app.use('/api/info', info)
app.use('/api/convert', convert)
app.use('/api/download', download)

app.use((err, req, res, next) => {
  console.error(err)
  res.json({
    success: false,
    message: err.message
  })
})

app.use('*', (req, res) => {
  const indexPath = path.resolve(__dirname, '../build/index.html')
  res.sendFile(indexPath)
})

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`)
})
