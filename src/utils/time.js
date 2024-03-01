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

export function msToTime (ms) {
  const s = Math.floor(ms / 1000);
  const secs = s % 60;
  const left = (s - secs) / 60;
  const mins = left % 60;
  const hrs = (left - mins) / 60;

  return hrs.toString().padStart(2, '0') + ':' +
    mins.toString().padStart(2, '0') + ':' +
    secs.toString().padStart(2, '0');
}

export function timeToS (time) {
  const parts = time.split(':');
  let seconds = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    seconds += parseInt(part) * (60 ** (2 - i));
  }

  return seconds;
}
