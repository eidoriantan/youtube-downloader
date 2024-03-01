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

export function handleChange (setter) {
  return (event) => {
    const input = event.target;
    setter(input.type === 'checkbox' ? (val => !val) : input.value);
  }
}

export function handleFileChange (setter) {
  return (event) => {
    const input = event.target;
    setter(input.type === 'file' ? input.files[0] : input.value);
  }
}

export function inputTime (setter) {
  return (event) => {
    const value = event.target.value;
    const time = ['', '', ''];
    let timeCurrent = 0;

    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (char.match(/[0-9:]+/) === null) continue;

      if (char === ':') {
        timeCurrent++;
        continue;
      }

      if (time[timeCurrent].length === 2) timeCurrent++;
      if (timeCurrent < 3) time[timeCurrent] += char;
    }

    setter(time.map((part) => part.padStart(2, '0')).join(':'));
  }
}
