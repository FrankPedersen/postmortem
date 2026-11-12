"""Cache til DD-beregningerne (tabel, par og DD efter udspil). Ingen navne: nøglen er turnering, sektion, spil, et kort
fingeraftryk af hænderne og evt. kontrakt og udspil.

I Azure gemmes de i Function App'ens egen lagerkonto (Blob, `AzureWebJobsStorage`). Lokalt, og hvis lagerkontoen ikke
svarer, bruges en mappe med JSON-filer bag samme grænseflade: get(nøgle) og set(nøgle, værdi).
"""
import hashlib
import json
import logging
import os
import pathlib
import tempfile

CONTAINER = 'postmortem-dd'


def _filnavn(noegle):
    return hashlib.sha1(noegle.encode('utf-8')).hexdigest() + '.json'


class HukommelsesCache:
    def __init__(self):
        self.data = {}

    def get(self, noegle):
        return self.data.get(noegle)

    def set(self, noegle, vaerdi):
        self.data[noegle] = vaerdi


class FilCache:
    def __init__(self, mappe):
        self.mappe = pathlib.Path(mappe)
        self.mappe.mkdir(parents=True, exist_ok=True)

    def get(self, noegle):
        sti = self.mappe / _filnavn(noegle)
        try:
            return json.loads(sti.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            return None

    def set(self, noegle, vaerdi):
        try:
            (self.mappe / _filnavn(noegle)).write_text(json.dumps(vaerdi), encoding='utf-8')
        except OSError:
            logging.warning('postmortem: kunne ikke skrive til fil-cachen')


class BlobCache:
    """Blob Storage. Fejl i lagerkontoen må aldrig vælte en analyse: de logges, og der regnes uden cache."""

    def __init__(self, forbindelse, container=CONTAINER):
        from azure.storage.blob import BlobServiceClient
        self.container = BlobServiceClient.from_connection_string(forbindelse).get_container_client(container)
        try:
            self.container.create_container()
        except Exception:  # findes allerede, eller lagerkontoen svarer ikke
            pass

    def get(self, noegle):
        try:
            return json.loads(self.container.download_blob(_filnavn(noegle)).readall())
        except Exception:
            return None

    def set(self, noegle, vaerdi):
        try:
            self.container.upload_blob(_filnavn(noegle), json.dumps(vaerdi), overwrite=True)
        except Exception:
            logging.warning('postmortem: kunne ikke skrive til Blob-cachen')


def fra_miljoe():
    """Blob, når AzureWebJobsStorage er sat; ellers en mappe (POSTMORTEM_CACHE_DIR eller systemets midlertidige)."""
    forbindelse = os.environ.get('AzureWebJobsStorage', '').strip()
    if forbindelse:
        try:
            return BlobCache(forbindelse)
        except Exception:
            logging.warning('postmortem: Blob-cachen kunne ikke åbnes; bruger fil-cachen')
    return FilCache(os.environ.get('POSTMORTEM_CACHE_DIR') or pathlib.Path(tempfile.gettempdir()) / 'postmortem-cache')
