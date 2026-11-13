"""Azure Function `POST /api/analyse` (Python v2-programmeringsmodellen). Al logik ligger i pakken `postmortem`.

Anonym som kontakt-API'et; CORS sættes i Function App'ens platformsindstillinger. Loggen har kun sidetype, status,
antal spil og tid, aldrig navne og aldrig IP-adresser eller deres hash. Timer-funktionen `slet_ip_vinduer` rydder op i
grænsens tabel (postmortem/graense.py).
"""
import json
import logging
import re
import time
import urllib.parse

import azure.functions as func

from postmortem import cache as cache_modul
from postmortem import graense as graense_modul
from postmortem.analyse import analyser
from postmortem.hent import hent_side

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

MAKS_KROP = 4096  # bytes; kroppen er kun {"url": …, "hold": …}
HENT = hent_side
_cache = None
FOR_MANGE = 'For mange analyser lige nu. Prøv igen om lidt.'
HOLDLISTE_SIDE = 'multihold_bordresultater.php'


# Grænsen pr. IP på tværs af instanser (SPEC-postmortem-ip-graense.md, postmortem/graense.py): tælleren står i Table
# Storage. Den hentes fra app-indstillingerne første gang, den bruges; testene sætter GRAENSE selv.
GRAENSE = None
_graense_hentet = False


def graensen():
    global GRAENSE, _graense_hentet
    if GRAENSE is None and not _graense_hentet:
        _graense_hentet = True
        GRAENSE = graense_modul.fra_miljoe()
    return GRAENSE


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
    ip = klient_ip(req)
    if ip and not er_holdliste(krop):
        g = graensen()
        if g is None:
            logging.warning('postmortem: graensen er slået fra (IP_HASH_KEY eller lageret mangler)')
        else:
            vent = g.tillad(ip)
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


@app.timer_trigger(schedule='0 */5 * * * *', arg_name='timer', run_on_startup=False, use_monitor=False)
def slet_ip_vinduer(timer: func.TimerRequest) -> None:
    """Sletter tællerens vinduer, når de er mindst 15 minutter gamle, så en hash af en IP står højst 20 minutter."""
    g = graensen()
    if g is None:
        logging.warning('postmortem: graensen er slået fra (IP_HASH_KEY eller lageret mangler)')
        return
    try:
        logging.info('postmortem: slettede %d gamle vinduer', g.slet_gamle())
    except Exception as e:
        logging.warning('postmortem: sletning af vinduer fejlede (%s)', type(e).__name__)
