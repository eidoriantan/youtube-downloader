"""The parts of yt-dlp's JS challenge provider API used by the bootstrap."""
import enum

PROVIDERS = []
PREFERENCES = []
PLAYERS = {}        # player_url -> player JS returned by _get_player
PLAYER_CALLS = []   # (video_id, player_url)


class JsChallengeType(enum.Enum):
    N = "n"
    SIG = "sig"


class JsChallengeProviderError(Exception):
    pass


class _Logger:
    def __init__(self):
        self.messages = []

    def info(self, msg):
        self.messages.append(msg)


class JsChallengeProvider:
    def __init__(self):
        self.logger = _Logger()

    def _get_player(self, video_id, player_url):
        PLAYER_CALLS.append((video_id, player_url))
        return PLAYERS[player_url]


class NChallengeOutput:
    def __init__(self, results):
        self.results = results


class SigChallengeOutput:
    def __init__(self, results):
        self.results = results


class JsChallengeResponse:
    def __init__(self, type, output):
        self.type = type
        self.output = output


class JsChallengeProviderResponse:
    def __init__(self, request, response, error=None):
        self.request = request
        self.response = response
        self.error = error


def register_provider(cls):
    PROVIDERS.append(cls)
    return cls


def register_preference(*providers):
    def decorator(fn):
        PREFERENCES.append((providers, fn))
        return fn
    return decorator
