"""Fælles for testene: de gemte sider fra resultater.bridge.dk og en hentefunktion, der læser dem i stedet for nettet."""
import pathlib
import sys
import urllib.parse

import pytest

API = pathlib.Path(__file__).resolve().parents[1]
DATA = API / 'tests' / 'data'
sys.path.insert(0, str(API))

HOLD_URL = ('https://resultater.bridge.dk/template/multihold_bordresultater.php'
            '?filename=2151/MT450GT714.XML&tournament=450&section=2&round=2&half=1')
PAR_URL = ('https://resultater.bridge.dk/template/personligt_regnskab.php'
           '?filename=2151/MT452GT720.XML&tournament=452&section=1&pairno=1')
SCORESHEET_URL = ('https://resultater.bridge.dk/template/scoresheet.php?filename=2151/MT450GT714.XML'
                  '&tournament=450&section=2&round=2&halfno=1&hometeam=5&awayteam=7')

SIDER = {
    'multihold_bordresultater.php': 'bordresultater-450.html',
    'personligt_regnskab.php': 'personligt-regnskab-452.html',
    'kortfordeling.php': 'kortfordeling-452.html',
    'spilresultater.php': 'spilresultater-452.html',
    'scoresheet.php': 'scoresheet-450.html',
}


def side(navn):
    return (DATA / navn).read_text(encoding='utf-8')


class GemteSider:
    """Hentefunktion til testene: svarer med den gemte side for adressens sidetype og husker adresserne."""

    def __init__(self, erstat=None):
        self.adresser = []
        self.erstat = erstat or {}

    def __call__(self, url):
        dele = urllib.parse.urlsplit(url)
        assert dele.scheme == 'https' and dele.hostname == 'resultater.bridge.dk', url
        self.adresser.append(url)
        navn = dele.path.rsplit('/', 1)[-1]
        if navn in self.erstat:
            return self.erstat[navn]
        return side(SIDER[navn])


@pytest.fixture
def gemte_sider():
    return GemteSider()


# Azurite, Microsofts lokale udgave af Table Storage, til testene af grænsen pr. IP (SPEC-postmortem-ip-graense.md).
# Startes med npx første gang, den bruges; kontoen og nøglen er Azurites faste udviklingskonto, ikke en hemmelighed.
AZURITE = 'azurite@3.37.0'
AZURITE_KONTO = ('DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;'
                 'AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;'
                 'TableEndpoint=http://127.0.0.1:{port}/devstoreaccount1;')


def _ledig_port():
    import socket
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def _svarer(port):
    import socket
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=0.5):
            return True
    except OSError:
        return False


@pytest.fixture(scope='session')
def azurite():
    """Forbindelsesstrengen til en Azurite-tabeltjeneste, der kører, mens testene kører."""
    import os
    import shutil
    import signal
    import subprocess
    import time
    npx = shutil.which('npx') or shutil.which('npx.cmd')
    if not npx:
        pytest.fail('Testene af grænsen kræver Node (npx) til Azurite')
    port = _ledig_port()
    kommando = [npx, '--yes', '-p', AZURITE, 'azurite-table', '--inMemoryPersistence', '--tableHost', '127.0.0.1',
                '--tablePort', str(port), '--skipApiVersionCheck', '--silent', '--disableTelemetry']
    windows = os.name == 'nt'
    proc = subprocess.Popen(kommando, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if windows else 0,
                            start_new_session=not windows)
    try:
        for _ in range(240):  # første gang henter npx Azurite
            if _svarer(port):
                break
            if proc.poll() is not None:
                pytest.fail('Azurite stoppede ved start')
            time.sleep(0.5)
        else:
            pytest.fail('Azurite svarede ikke')
        yield AZURITE_KONTO.format(port=port)
    finally:
        if windows:
            subprocess.run(['taskkill', '/T', '/F', '/PID', str(proc.pid)], capture_output=True)
        else:
            os.killpg(proc.pid, signal.SIGTERM)


@pytest.fixture
def ny_tabel(azurite):
    """En tom tabel i Azurite for hver test: (forbindelsesstreng, tabelnavn)."""
    import uuid
    from azure.data.tables import TableServiceClient
    navn = 'ipgraense' + uuid.uuid4().hex[:10]
    TableServiceClient.from_connection_string(azurite).create_table(navn)
    return azurite, navn
