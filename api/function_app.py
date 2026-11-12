"""Azure Function `POST /api/analyse` (Python v2-programmeringsmodellen). Al logik ligger i pakken `postmortem`.

Anonym som kontakt-API'et; CORS sættes i Function App'ens platformsindstillinger. Loggen har kun sidetype, status,
antal spil og tid, aldrig navne.
"""
import json
import logging
import time

import azure.functions as func

from postmortem import cache as cache_modul
from postmortem.analyse import analyser
from postmortem.hent import hent_side

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

MAKS_KROP = 4096  # bytes; kroppen er kun {"url": …, "hold": …}
HENT = hent_side
_cache = None


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
    status, ud = analyser(krop, hent=HENT, cache=cache())
    sidetype = 'vaelg' if 'vaelg' in ud else (ud.get('turnering', {}).get('form') or '-')
    logging.info('postmortem: %s %s, %d spil, %.1f s', status, sidetype, len(ud.get('spil', [])),
                 time.perf_counter() - start)
    return svar(status, ud)
