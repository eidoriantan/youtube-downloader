import json, yt_dlp

with yt_dlp.YoutubeDL({"quiet": True, "skip_download": True, "noprogress": True}) as ydl:
    _info = ydl.extract_info(TARGET_URL, download=False)

_keys = ["format_id", "ext", "resolution", "height", "fps", "vcodec", "acodec",
         "filesize", "filesize_approx", "tbr", "abr", "format_note", "protocol"]
_fmts = [{k: f.get(k) for k in _keys} for f in _info.get("formats", [])
         if f.get("ext") != "mhtml" and (f.get("vcodec") != "none" or f.get("acodec") != "none")]
json.dumps({"id": _info.get("id"), "title": _info.get("title"), "formats": _fmts})
