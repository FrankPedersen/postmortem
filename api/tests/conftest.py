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
