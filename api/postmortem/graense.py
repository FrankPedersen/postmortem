"""Grænse pr. IP på tværs af instanser (SPEC-postmortem-ip-graense.md): højst 10 analyser pr. IP pr. 10 minutter.

Tælleren står i Table Storage i funktionens lagerkonto (`AzureWebJobsStorage`, tabellen `ipgraense`): én række pr.
10-minutters vindue (PartitionKey, fx `202611130600` i UTC) og pr. HMAC-SHA256 af IP'en med nøglen i app-indstillingen
`IP_HASH_KEY` (RowKey). Rækken har kun `antal`. Opdateringer bruger optimistisk samtidighed med ETag, så to instanser
ikke tæller samme kald dobbelt eller mister et. IP'en selv gemmes og logges aldrig, og hashen logges ikke.

Timer-funktionen `slet_ip_vinduer` (function_app.py) kører hvert 5. minut og sletter vinduer, der er mindst 15 minutter
gamle; en hash står derfor højst 20 minutter. Fejler lageret, går analysen igennem, og fejlen logges med fejltypen.
"""
import hashlib
import hmac
import logging
import math
import os
import time

# Azure SDK'en logger hver adresse på INFO og urllib3 på DEBUG, og for Table Storage står hashen i adressen: fra de to
# kommer kun advarsler og fejl (det fjerner også linjerne om blob-cachen fra Application Insights).
for _navn in ('azure', 'urllib3'):
    logging.getLogger(_navn).setLevel(logging.WARNING)

TABEL = 'ipgraense'
MAKS = 10
VINDUE = 600          # sekunder; vinduerne følger uret (06:00–06:10, 06:10–06:20 …)
SLET_EFTER = 900      # sekunder fra vinduets start; jobbet kører hvert 5. minut, så en hash står højst 20 minutter
FORSOEG = 8           # genforsøg ved samtidige opdateringer (ETag)


def hash_ip(noegle, ip):
    return hmac.new(noegle, ip.encode('utf-8'), hashlib.sha256).hexdigest()


def _start(t):
    return int(t // VINDUE) * VINDUE


def vindue_noegle(t):
    """Vinduets PartitionKey: starten i UTC som ÅÅÅÅMMDDTTMM, så nøglerne sorterer efter tid."""
    return time.strftime('%Y%m%d%H%M', time.gmtime(_start(t)))


def vindue_start(noegle):
    import calendar
    return calendar.timegm(time.strptime(noegle, '%Y%m%d%H%M'))


class IpGraense:
    def __init__(self, tabel, noegle, maks=MAKS, ur=time.time):
        self.tabel, self.noegle, self.maks, self.ur = tabel, noegle, maks, ur

    def tillad(self, ip):
        """None, når analysen må køre; ellers antal sekunder, til vinduet er slut. Uden IP er der ingen grænse."""
        if not ip:
            return None
        try:
            return self._tael(ip)
        except Exception as e:  # lageret svarer ikke, forkert forbindelse osv.: analysen går igennem
            logging.warning('postmortem: graense-lageret fejlede (%s)', type(e).__name__)
            return None

    def _tael(self, ip):
        from azure.core import MatchConditions
        from azure.core.exceptions import ResourceExistsError, ResourceModifiedError, ResourceNotFoundError
        from azure.data.tables import UpdateMode
        nu = self.ur()
        pk, rk = vindue_noegle(nu), hash_ip(self.noegle, ip)
        for _ in range(FORSOEG):
            try:
                raekke = self.tabel.get_entity(pk, rk)
            except ResourceNotFoundError:
                try:
                    self.tabel.create_entity({'PartitionKey': pk, 'RowKey': rk, 'antal': 1})
                    return None
                except ResourceExistsError:
                    continue  # en anden instans oprettede rækken lige før
            if raekke['antal'] >= self.maks:
                return max(1, math.ceil(_start(nu) + VINDUE - nu))
            raekke['antal'] += 1
            try:
                self.tabel.update_entity(raekke, mode=UpdateMode.REPLACE, etag=raekke.metadata['etag'],
                                         match_condition=MatchConditions.IfNotModified)
                return None
            except ResourceModifiedError:
                continue  # en anden instans talte imellem; læs igen
        logging.warning('postmortem: graense-lageret var optaget %d gange; analysen går igennem', FORSOEG)
        return None

    def slet_gamle(self):
        """Sletter vinduer, der er mindst SLET_EFTER sekunder gamle. Giver antallet af slettede rækker."""
        graense = vindue_noegle(self.ur() - SLET_EFTER)
        slettet = 0
        for r in self.tabel.query_entities('PartitionKey le @g', parameters={'g': graense},
                                           select=['PartitionKey', 'RowKey']):
            self.tabel.delete_entity(r['PartitionKey'], r['RowKey'])
            slettet += 1
        return slettet


def fra_miljoe():
    """Tælleren fra app-indstillingerne, eller None, når IP_HASH_KEY eller lageret mangler."""
    noegle = os.environ.get('IP_HASH_KEY')
    forbindelse = os.environ.get('AzureWebJobsStorage')
    if not noegle or not forbindelse:
        return None
    from azure.data.tables import TableClient
    # Få genforsøg og korte tidsgrænser: en analyse må ikke vente længe på tælleren.
    tabel = TableClient.from_connection_string(forbindelse, table_name=TABEL, retry_total=2,
                                               connection_timeout=3, read_timeout=5)
    return IpGraense(tabel, noegle.encode('utf-8'))
