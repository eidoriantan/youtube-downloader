
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
