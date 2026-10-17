"""Stand-in for yt-dlp: records how it is used and writes canned files."""
from . import utils

CALLS = []      # (options, method, url) for each use of YoutubeDL
INFO = {}       # returned by extract_info
FILES = {}      # format_id -> (ext, bytes) written by download
PROGRESS = []   # hook dicts sent with status "downloading" before each file is written
ERROR = None    # raised by extract_info/download when set


def reset():
    global INFO, ERROR
    CALLS.clear()
    FILES.clear()
    PROGRESS.clear()
    INFO = {}
    ERROR = None


class YoutubeDL:
    def __init__(self, params=None):
        self.params = params or {}
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.closed = True
        return False

    def extract_info(self, url, download=True):
        CALLS.append((self.params, "extract_info", url, download))
        if ERROR:
            raise ERROR
        return INFO

    def download(self, urls):
        fid = self.params["format"]
        CALLS.append((self.params, "download", urls[0], fid))
        if ERROR:
            raise ERROR
        ext, data = FILES[fid]
        hooks = self.params.get("progress_hooks", [])
        for d in PROGRESS:
            for hook in hooks:
                hook({"status": "downloading", **d})
        path = self.params["outtmpl"] % {"id": INFO.get("id", "vid"), "format_id": fid, "ext": ext}
        with open(path, "wb") as f:
            f.write(data)
        for hook in hooks:
            hook({"status": "finished", "downloaded_bytes": len(data), "total_bytes": len(data)})
        return 0
