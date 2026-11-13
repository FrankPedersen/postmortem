"""Azure Function `POST /api/analyse` (Python v2-programmeringsmodellen). Al logik ligger i pakken `postmortem`.

Anonym som kontakt-API'et; CORS sættes i Function App'ens platformsindstillinger. Loggen har kun sidetype, status,
antal spil og tid, aldrig navne og aldrig IP-adresser.
"""
import json
import logging
import re
import time
import urllib.parse

import azure.functions as func

from postmortem import cache as cache_modul
from postmortem.analyse import analyser
from postmortem.hent import hent_side

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

MAKS_KROP = 4096  # bytes; kroppen er kun {"url": …, "hold": …}
HENT = hent_side
_cache = None
FOR_MANGE = 'For mange analyser lige nu. Prøv igen om lidt.'
HOLDLISTE_SIDE = 'multihold_bordresultater.php'


class Graense:
    """Højst `maks` analyser pr. IP pr. `vindue` sekunder, i hukommelsen pr. instans som i kontakt-API'et
    (Forside/_kontakt-api/src/contact-protection.js): vinduet starter ved den første analyse. IP'en ligger kun her og
    logges ikke; tabellen har højst `maks_ip` adresser, og udløbne poster fjernes, når den er fuld
    (SPEC-postmortem-1c-app.md)."""

    def __init__(self, maks=10, vindue=600, maks_ip=5000, ur=time.monotonic):
        self.maks, self.vindue, self.maks_ip, self.ur = maks, vindue, maks_ip, ur
        self._ip = {}

    def tillad(self, ip):
        """None, når analysen må køre; ellers antal sekunder, til der er plads igen."""
        if not ip:
            return None
        nu = self.ur()
        post = self._ip.get(ip)
        if post is None or post[1] <= nu:
            if len(self._ip) >= self.maks_ip:
                for k in [k for k, (_, udloeb) in self._ip.items() if udloeb <= nu]:
                    del self._ip[k]
            if len(self._ip) >= self.maks_ip:
                return self.vindue
            self._ip[ip] = [1, nu + self.vindue]
            return None
        if post[0] >= self.maks:
            return max(1, int(post[1] - nu + 0.999))
        post[0] += 1
        return None


GRAENSE = Graense()


def klient_ip(req):
    """Klientens IP uden port: Azure sender "ip:port" (IPv6 som "[ip]:port") i X-Forwarded-For."""
    raa = ((req.headers.get('x-forwarded-for') or '').split(',')[0].strip()
           or (req.headers.get('x-client-ip') or '').strip())
    m = re.fullmatch(r'\[([^\]]+)\](?::\d+)?', raa)
    if m:
        return m.group(1)
    if re.fullmatch(r'[\d.]+:\d+', raa):
        return raa.rsplit(':', 1)[0]
    return raa or None


def er_holdliste(krop):
    """Første kald med et link til Bordresultater uden hold giver holdlisten, som ikke tæller som en analyse."""
    if not isinstance(krop, dict) or krop.get('hold') is not None or not isinstance(krop.get('url'), str):
        return False
    return urllib.parse.urlsplit(krop['url']).path.rsplit('/', 1)[-1] == HOLDLISTE_SIDE


def cache():
    global _cache
    if _cache is None:
        _cache = cache_modul.fra_miljoe()
    return _cache


def svar(status, krop):
    return func.HttpResponse(json.dumps(krop, ensure_ascii=False), status_code=status,
                             mimetype='application/json', charset='utf-8')


@app.route(route='analyse', methods=['POST'])
def analyse(req: func.HttpRequest) -> func.HttpResponse:
    start = time.perf_counter()
    raa = req.get_body() or b''
    if len(raa) > MAKS_KROP:
        return svar(413, {'fejl': 'Forespørgslen er for stor'})
    try:
        krop = json.loads(raa.decode('utf-8'))
    except (UnicodeDecodeError, ValueError):
        krop = None
    if not er_holdliste(krop):
        vent = GRAENSE.tillad(klient_ip(req))
        if vent is not None:
            logging.info('postmortem: 429 graense')
            ud = svar(429, {'fejl': FOR_MANGE})
            ud.headers['Retry-After'] = str(vent)
            return ud
    status, ud = analyser(krop, hent=HENT, cache=cache())
    sidetype = 'vaelg' if 'vaelg' in ud else (ud.get('turnering', {}).get('form') or '-')
    logging.info('postmortem: %s %s, %d spil, %.1f s', status, sidetype, len(ud.get('spil', [])),
                 time.perf_counter() - start)
    return svar(status, ud)
