
<p align="center">
  <img src="public/og-image.png" alt="Media Downloader: yt-dlp, Pyodide and ffmpeg.wasm, all inside your browser" width="720">
</p>

## YouTube Downloader

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fytdl.eidoriantan.com)][homepage]
![Node.js CI](https://github.com/eidoriantan/youtube-downloader/workflows/Node.js%20CI/badge.svg)
[![GitHub](https://img.shields.io/github/license/eidoriantan/youtube-downloader)](https://github.com/eidoriantan/youtube-downloader/blob/main/LICENSE.txt)

YouTube Downloader is an open-sourced, easy-to-use, mobile-friendly, and ad-free YouTube video downloader/converter.

It is a serverless media downloader that uses a proxy, [yt-dlp] with [pyodide], and [ffmpeg.wasm] so everything from downloading to converting works in just your browser.

It is recommended to use your own local machine/server as proxy using this repository [cf-proxy] as the one on the website is limited.

### Features
- Pick from video and audio, video only, or audio only formats. Video-only streams get an audio track merged in automatically.
- Convert audio to MP3 (128–320 kbps) with editable ID3 tags and cover art.
- Step-by-step download progress in a modal.
- yt-dlp runs in a Web Worker, so the page stays responsive while it works.
- Set your own proxy URL; it is saved in your browser.

### Development
Requires Node.js 20 or newer.

```sh
npm install
echo "VITE_SITE_URL=http://localhost:5173" > .env  # used for the sitemap and Open Graph image
npm run dev
```

Other scripts:

- `npm run build` type-checks and builds to `dist/`
- `npm run preview` serves the production build
- `npm run lint` runs oxlint

To test against a local proxy, run [cf-proxy] with `wrangler dev` and paste its URL into the **Proxy URL** field.

### Support
If you had found a bug or any unexpected behavior, you can submit an issue
through GitHub
[issues](https://github.com/eidoriantan/youtube-downloader/issues). If you wanted to
contribute to this repository and become a contributor, you are very welcome to
do so.

[homepage]: https://ytdl.eidoriantan.com
[yt-dlp]: https://github.com/yt-dlp/yt-dlp
[pyodide]: https://pyodide.org/en/stable/
[ffmpeg.wasm]: https://ffmpegwasm.netlify.app/
[cf-proxy]: https://github.com/eidoriantan/cf-proxy
