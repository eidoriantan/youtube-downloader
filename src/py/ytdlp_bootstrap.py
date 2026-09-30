# Runs yt-dlp in Pyodide with a custom JS challenge provider that uses the browser's JS engine.
from urllib.parse import urlencode

import js
from js import XMLHttpRequest

_original_xhr_open = XMLHttpRequest.prototype.open
_original_xhr_set_header = XMLHttpRequest.prototype.setRequestHeader
CORS_PROXY = "http://localhost:8787/"

_FORBIDDEN_HEADERS = {
    "accept-charset", "accept-encoding", "access-control-request-headers",
    "access-control-request-method", "connection", "content-length", "cookie",
    "cookie2", "date", "dnt", "expect", "host", "keep-alive", "origin", "referer",
    "set-cookie", "te", "trailer", "transfer-encoding", "upgrade", "via",
}
_FORBIDDEN_PREFIXES = ("proxy-", "sec-")


def _is_unsafe_header(name):
    lowered = name.lower()
    return lowered in _FORBIDDEN_HEADERS or lowered.startswith(_FORBIDDEN_PREFIXES)


def proxy_open_handler(xhr_instance, method, url, async_val=True, username=None, password=None):
    if url.startswith("http://") or url.startswith("https://"):
        params = urlencode({"url": url})
        url = f"{CORS_PROXY}?{params}"

    return _original_xhr_open.call(xhr_instance, method, url, async_val, username, password)


def proxy_set_header_handler(xhr_instance, name, value):
    if _is_unsafe_header(name):
        name = f"X-Proxy-{name}"

    return _original_xhr_set_header.call(xhr_instance, name, value)


js.globalThis.python_xhr_proxy_open_handler = proxy_open_handler
js.globalThis.python_xhr_proxy_set_header_handler = proxy_set_header_handler

XMLHttpRequest.prototype.open = js.Function("""
    return function(method, url, async_val, username, password) {
        return globalThis.python_xhr_proxy_open_handler(this, method, url, async_val, username, password);
    };
""")()

XMLHttpRequest.prototype.setRequestHeader = js.Function("""
    return function(name, value) {
        return globalThis.python_xhr_proxy_set_header_handler(this, name, value);
    };
""")()

import pyodide_http
pyodide_http.patch_all()

import json
import yt_dlp

from yt_dlp.extractor.youtube.jsc.provider import (
    JsChallengeProvider,
    JsChallengeProviderError,
    JsChallengeProviderResponse,
    JsChallengeResponse,
    JsChallengeType,
    NChallengeOutput,
    SigChallengeOutput,
    register_preference,
    register_provider,
)

import yt_dlp_ejs.yt.solver as _ejs_solver


def _eval_in_sandbox_frame(code: str) -> str:
    iframe = js.document.createElement("iframe")
    iframe.style.display = "none"
    iframe.setAttribute("aria-hidden", "true")
    js.document.body.appendChild(iframe)
    try:
        return iframe.contentWindow.eval(code)
    finally:
        iframe.remove()


@register_provider
class PyodideJCP(JsChallengeProvider):
    """Solves YouTube's n/sig JS challenges using the real browser JS engine."""

    PROVIDER_VERSION = "0.1"
    PROVIDER_NAME = "pyodide"
    BUG_REPORT_LOCATION = "https://github.com/yt-dlp/yt-dlp/issues"

    _SUPPORTED_TYPES = [JsChallengeType.N, JsChallengeType.SIG]

    def is_available(self) -> bool:
        return True

    def _real_bulk_solve(self, requests):
        grouped = {}
        for request in requests:
            grouped.setdefault(request.input.player_url, []).append(request)

        lib_code = _ejs_solver.lib()
        core_code = _ejs_solver.core()

        core_code = core_code.replace(
            "globalThis.location =", "globalThis.__ejs_location =",
        )

        for player_url, grouped_requests in grouped.items():
            video_id = next((r.video_id for r in grouped_requests), None)
            player_js = self._get_player(video_id, player_url)

            self.logger.info("Solving JS challenges using the browser JS engine (Pyodide)")

            data = {
                "type": "player",
                "player": player_js,
                "requests": [
                    {"type": r.type.value, "challenges": r.input.challenges}
                    for r in grouped_requests
                ],
                "output_preprocessed": True,
            }

            program = f"""
            {lib_code}
            Object.assign(globalThis, lib);
            {core_code}
            JSON.stringify(jsc({json.dumps(data)}));
            """

            try:
                stdout = _eval_in_sandbox_frame(program)
            except Exception as e:
                raise JsChallengeProviderError(f"Error evaluating challenge solver JS: {e}") from e

            output = json.loads(stdout)
            if output["type"] == "error":
                raise JsChallengeProviderError(output["error"])

            for request, response_data in zip(grouped_requests, output["responses"], strict=True):
                if response_data["type"] == "error":
                    yield JsChallengeProviderResponse(request, None, response_data["error"])
                else:
                    yield JsChallengeProviderResponse(
                        request,
                        JsChallengeResponse(
                            request.type,
                            NChallengeOutput(response_data["data"])
                            if request.type is JsChallengeType.N
                            else SigChallengeOutput(response_data["data"]),
                        ),
                    )


@register_preference(PyodideJCP)
def _pyodide_jcp_preference(provider, requests):
    return 1000
