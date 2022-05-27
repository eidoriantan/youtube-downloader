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

/* eslint-env jquery */

const customIcons = ['spinner']
let toastTemp = null

$.toast = async function (options = {}) {
  const type = options.type || 'info'
  const octicon = options.octicon || 'info'
  const message = options.message || ''

  if (toastTemp === null) return null

  const toast = $(toastTemp).clone(true, true).find('.Toast')
  const iconRes = await $.getOcticon(octicon, 16, customIcons.includes(octicon))
  const icon = $(iconRes).addClass('octicon octicon-' + octicon)

  if (octicon === 'spinner') $(icon).addClass('Toast--spinner')

  $(toast).find('.Toast-content').text(message)
  $(toast).find('.Toast-icon').html(icon).parent().addClass('Toast--' + type)
  $(toast).find('.Toast-dismissButton').click(function (event) {
    $(this).parent().remove()
  })

  $('#toasts-container').append(toast)
  return toast
}

$.getOcticon = async function (name, width = 16, custom = false) {
  return new Promise((resolve, reject) => {
    const url = custom
      ? '/assets/svg/' + name + '.svg'
      : '/libs/@primer/octicons/svg/' + name + '-' + width + '.svg'

    $.ajax(url, {
      method: 'GET',
      dataType: 'text',
      success: function (data, status, xhr) {
        resolve(data)
      },
      error: function (xhr, status, error) {
        console.error('Resource returned: ' + xhr.responseText)
        reject(error)
      }
    })
  })
}

$(document).ready(function () {
  toastTemp = $('#temp-toast').prop('content')
})
