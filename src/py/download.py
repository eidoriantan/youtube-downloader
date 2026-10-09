import os, shutil, yt_dlp

# yt-dlp only fetches raw streams here; it never merges (merging is done in the
# browser with ffmpeg.wasm). Each format ID is downloaded in its own call so the
# output is deterministic: /mnt/dl/<video_id>.f<format_id>.<ext>
# REPORT_PROGRESS(index, downloaded_bytes, total_bytes, finished) is a JS callback.
shutil.rmtree("/mnt/dl", ignore_errors=True)
os.makedirs("/mnt/dl")


def _progress_hook(index):
    def hook(d):
        if d["status"] in ("downloading", "finished"):
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            REPORT_PROGRESS(index, d.get("downloaded_bytes") or 0, int(total), d["status"] == "finished")
    return hook


for _i, _fid in enumerate(FORMAT_IDS):
    with yt_dlp.YoutubeDL({
        "outtmpl": "/mnt/dl/%(id)s.f%(format_id)s.%(ext)s",
        "format": _fid,
        "quiet": True,
        "noprogress": True,
        "postprocessors": [],  # no merger / post-processing
        "progress_hooks": [_progress_hook(_i)],
    }) as ydl:
        ydl.download([TARGET_URL])
