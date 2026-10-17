"""Stand-in for the yt-dlp-ejs solver bundle; tests set LIB and CORE."""
LIB = "var lib = {};"
CORE = "var jsc = () => ({ type: 'result', responses: [] });"


def lib():
    return LIB


def core():
    return CORE
