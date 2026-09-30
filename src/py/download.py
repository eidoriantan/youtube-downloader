import os, shutil, yt_dlp

# yt-dlp only fetches raw streams here; it never merges (merging is done in the
# browser with ffmpeg.wasm). Each format ID is downloaded in its own call so the
# output is deterministic: /mnt/dl/<video_id>.f<format_id>.<ext>
shutil.rmtree("/mnt/dl", ignore_errors=True)
os.makedirs("/mnt/dl")
for _fid in FORMAT_IDS:
    with yt_dlp.YoutubeDL({
        "outtmpl": "/mnt/dl/%(id)s.f%(format_id)s.%(ext)s",
        "format": _fid,
        "quiet": True,
        "noprogress": True,
        "postprocessors": [],  # no merger / post-processing
    }) as ydl:
        ydl.download([TARGET_URL])
