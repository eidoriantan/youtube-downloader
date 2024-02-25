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

import MP3Tag from 'mp3tag.js';
import axios from 'axios';

export async function audioTag (url, tags) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'blob'
  });

  const buffer = await response.data.arrayBuffer();
  const mp3tag = new MP3Tag(buffer, true);
  mp3tag.read();
  if (mp3tag.error) throw new Error(mp3tag.error);

  if (tags.artwork) {
    const artworkBytes = new Uint8Array(await tags.artwork.arrayBuffer());
    mp3tag.tags.v2.APIC = [
      {
        format: tags.artwork.type,
        type: 3,
        description: '',
        data: artworkBytes
      }
    ];
  }

  mp3tag.tags.title = tags.title;
  mp3tag.tags.artist = tags.artist;
  mp3tag.tags.album = tags.album;
  mp3tag.save({
    id3v1: { include: false },
    id3v2: {
      include: true,
      version: 3,
      padding: 1024
    }
  });
  if (mp3tag.error) throw new Error(mp3tag.error);

  const blob = new Blob([mp3tag.buffer]);
  return URL.createObjectURL(blob);
}
