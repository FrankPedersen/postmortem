"""Hentning fra resultater.bridge.dk. Kun den vært; omdirigeringer til andre værter følges ikke."""
import urllib.error
import urllib.parse
import urllib.request

VAERT = 'resultater.bridge.dk'
TIDSGRAENSE = 15  # sekunder pr. side


class IkkeBridgeDk(ValueError):
    """Adressen er ikke https://resultater.bridge.dk/…"""


def er_bridge_dk(url):
    try:
        dele = urllib.parse.urlsplit(url)
    except (TypeError, ValueError):
        return False
    return dele.scheme == 'https' and dele.hostname == VAERT and not dele.username and not dele.password


class _KunBridgeDk(urllib.request.HTTPRedirectHandler):
    """Følger kun omdirigeringer, der bliver på resultater.bridge.dk."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not er_bridge_dk(newurl):
            raise IkkeBridgeDk(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_KunBridgeDk)


def hent_side(url):
    """Siden som tekst. Rejser IkkeBridgeDk, urllib.error.URLError eller TimeoutError ved fejl."""
    if not er_bridge_dk(url):
        raise IkkeBridgeDk(url)
    req = urllib.request.Request(url, headers={'User-Agent': 'kontraktbridge-postmortem (www.kontraktbridge.dk/postmortem/)'})
    with _opener.open(req, timeout=TIDSGRAENSE) as svar:
        return svar.read().decode('utf-8', errors='replace')
