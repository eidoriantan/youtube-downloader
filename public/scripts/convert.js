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

/* eslint-env jquery */

$(document).ready(function () {
  $('#form-format').submit(async function (event) {
    event.preventDefault()

    const action = $(this).attr('action')
    const method = $(this).attr('method')
    const data = $(this).serialize()
    const toast = await $.toast({
      type: 'loading',
      octicon: 'spinner',
      message: 'Converting video...'
    })

    $.ajax(action, {
      method,
      data,
      dataType: 'json',
      complete: function () {
        $(toast).remove()
      },
      success: function (data, status, xhr) {
        const filename = $('#filename').val()
        const param = $.param({ id: data.result, filename: filename })

        window.location = '/download?' + param
        $.toast({
          type: 'success',
          octicon: 'check',
          message: 'Downloading "' + filename + '"...'
        })
      },
      error: function (xhr, status, error) {
        let data = null
        try { data = JSON.parse(xhr.responseText) } catch (e) {}

        $.toast({
          type: 'error',
          octicon: 'stop',
          message: data !== null ? data.error : error
        })
      }
    })
  })
})
