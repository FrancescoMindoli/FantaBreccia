"""Converte Gestione.xlsx nel file di dati letto dal sito.

Uso:
    python strumenti/genera_dati.py
    python strumenti/genera_dati.py --xlsx "percorso\\del\\file.xlsx"

Legge i sei fogli di Gestione.xlsx e scrive `js/dati.js`, che le pagine del
sito caricano come un normale script.

Perché un .js e non un .json: un file JSON andrebbe letto con fetch(), che i
browser bloccano quando la pagina è aperta da file:// — il sito non sarebbe
più provabile in locale con un doppio click. Un .js che assegna una variabile
globale funziona ovunque, senza server.

Lo script NON calcola nulla: riporta i valori così come li hai scritti
nell'Excel. I premi e i malus non sono costanti (nel gestionale vivono nella
tabella `credit_rules` e cambiano per anno), quindi ricalcolarli qui
introdurrebbe valori che possono divergere da quelli veri.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit(
        "Manca openpyxl. Installalo con:\n"
        "    pip install openpyxl\n"
        "oppure usa l'ambiente del gestionale:\n"
        '    d:\\Codice\\Fanta_Riconferme\\fantacalcio\\.venv\\Scripts\\python.exe '
        "strumenti/genera_dati.py"
    )

RADICE = Path(__file__).resolve().parent.parent
XLSX_PREDEFINITO = RADICE / "dati" / "Gestione.xlsx"
USCITA = RADICE / "js" / "dati.js"

DURATA_CONTRATTO = 4  # regolamento § 1
ETA_MAX_C = 21        # regolamento § 2
ETA_MAX_B = 25
MAX_CATEGORIA_A = 3
MAX_A_PIU_B = 6


def categoria_per_eta(anno_nascita, anno_riferimento):
    """Stessa regola di js/calcoli.js e del gestionale."""
    if anno_nascita is None or anno_riferimento is None:
        return "A"
    eta = anno_riferimento - anno_nascita
    if eta <= ETA_MAX_C:
        return "C"
    if eta <= ETA_MAX_B:
        return "B"
    return "A"


# --- Lettura dei fogli ---------------------------------------------------

def leggi_foglio(wb, nome: str) -> list[dict]:
    """Restituisce le righe di un foglio come dizionari, saltando le vuote."""
    if nome not in wb.sheetnames:
        print(f"  ! foglio '{nome}' assente, lo salto")
        return []

    ws = wb[nome]
    righe = [
        r for r in ws.iter_rows(values_only=True)
        if any(c is not None and str(c).strip() != "" for c in r)
    ]
    if len(righe) < 2:
        print(f"  ! foglio '{nome}' senza dati")
        return []

    intestazioni = [str(h).strip() if h is not None else "" for h in righe[0]]
    risultato = []
    for riga in righe[1:]:
        voce = {}
        for chiave, valore in zip(intestazioni, riga):
            if chiave:
                voce[chiave] = valore
        risultato.append(voce)
    return risultato


def intero(valore, predefinito=None):
    """Converte in int i numeri che Excel salva come float (1.0 -> 1)."""
    if valore is None or (isinstance(valore, str) and not valore.strip()):
        return predefinito
    try:
        return int(float(valore))
    except (TypeError, ValueError):
        return predefinito


def numero(valore, predefinito=None):
    """Converte in numero mantenendo i decimali (i punteggi hanno il ,5)."""
    if valore is None or (isinstance(valore, str) and not valore.strip()):
        return predefinito
    try:
        f = float(valore)
        return int(f) if f == int(f) else f
    except (TypeError, ValueError):
        return predefinito


def testo(valore, predefinito=""):
    if valore is None:
        return predefinito
    return str(valore).strip()


# --- Costruzione della struttura dati ------------------------------------

def costruisci(wb) -> dict:
    dati: dict = {
        "generatoIl": dt.date.today().isoformat(),
        "squadre": [],
        "nomiPerAnno": {},
        "giocatori": [],
        "contratti": [],
        "classifiche": {},
        "coppa": {},
        "creditiResidui": {},
        "creditiAnnoNuovo": {},
    }
    anni: set[int] = set()

    # Anagrafica: l'elenco delle squadre e di chi le allena
    print("  · AnagraficaSquadre")
    for riga in leggi_foglio(wb, "AnagraficaSquadre"):
        idx = intero(riga.get("ID"))
        if idx is None:
            continue
        dati["squadre"].append({
            "id": idx,
            "allenatore": testo(riga.get("Allenatore")),
            "squadra": testo(riga.get("Squadra")),
        })

    # Nome della squadra per ciascun anno (gestisce i cambi di nome)
    print("  · CambioNome")
    for riga in leggi_foglio(wb, "CambioNome"):
        idx, anno = intero(riga.get("ID")), intero(riga.get("Anno"))
        if idx is None or anno is None:
            continue
        anni.add(anno)
        dati["nomiPerAnno"].setdefault(str(anno), {})[str(idx)] = testo(riga.get("Nome"))

    # Giocatori
    print("  · Giocatori")
    for riga in leggi_foglio(wb, "Giocatori"):
        idx = intero(riga.get("ID"))
        nome = testo(riga.get("Nome"))
        # Le righe di esempio del file iniziale non finiscono nel sito
        if idx is None or not nome or nome.upper().startswith("ESEMPIO"):
            continue
        dati["giocatori"].append({
            "id": idx,
            "nome": nome,
            "ruolo": testo(riga.get("Ruolo")).upper(),
            "annoNascita": intero(riga.get("AnnoNascita")),
            "idSquadra": intero(riga.get("IDSquadra")),
        })

    # Contratti: l'anno di fine non si scrive, è sempre inizio + 3
    print("  · Contratti")
    id_giocatori_validi = {g["id"] for g in dati["giocatori"]}
    for riga in leggi_foglio(wb, "Contratti"):
        id_g = intero(riga.get("IDGiocatore"))
        inizio = intero(riga.get("AnnoInizio"))
        if id_g is None or inizio is None:
            continue
        if id_g not in id_giocatori_validi:
            continue  # riga di esempio o riferimento rotto: segnalato dai controlli
        fine = intero(riga.get("AnnoFine"), inizio + DURATA_CONTRATTO - 1)
        anni.add(inizio)
        dati["contratti"].append({
            "idGiocatore": id_g,
            "idSquadra": intero(riga.get("IDSquadra")),
            "annoInizio": inizio,
            "annoFine": fine,
            "prezzo": intero(riga.get("PrezzoAcquisto"), 0),
            "attivo": bool(intero(riga.get("Attivo"), 1)),
        })

    # Classifica di campionato
    print("  · Classifiche")
    for riga in leggi_foglio(wb, "Classifiche"):
        anno = intero(riga.get("Anno"))
        if anno is None:
            continue
        anni.add(anno)
        dati["classifiche"].setdefault(str(anno), []).append({
            "posizione": intero(riga.get("Posizione")),
            "id": intero(riga.get("ID")),
            "squadra": testo(riga.get("Squadra")),
            "punteggio": numero(riga.get("Punteggio")),
            "migliorPunteggio": bool(intero(riga.get("Miglior Punteggio"), 0)),
        })

    # Coppa
    print("  · Coppa")
    for riga in leggi_foglio(wb, "Coppa"):
        anno = intero(riga.get("Anno"))
        if anno is None:
            continue
        anni.add(anno)
        dati["coppa"].setdefault(str(anno), []).append({
            "posizione": intero(riga.get("Posizione")),
            "id": intero(riga.get("ID")),
            "squadra": testo(riga.get("Squadra")),
        })

    # Crediti avanzati a fine stagione
    print("  · CreditiAsta")
    for riga in leggi_foglio(wb, "CreditiAsta"):
        idx, anno = intero(riga.get("ID")), intero(riga.get("Anno"))
        if idx is None or anno is None:
            continue
        anni.add(anno)
        dati["creditiResidui"].setdefault(str(anno), {})[str(idx)] = {
            "crediti": intero(riga.get("CreditiFineAnno"), 0),
            "nome": testo(riga.get("Nome")),
        }

    # Budget della stagione successiva (compilato a mano nell'Excel)
    print("  · CreditiAnnoNuovo")
    for riga in leggi_foglio(wb, "CreditiAnnoNuovo"):
        anno = intero(riga.get("Anno"))
        if anno is None:
            continue
        anni.add(anno)
        dati["creditiAnnoNuovo"].setdefault(str(anno), []).append({
            "id": intero(riga.get("ID")),
            "squadra": testo(riga.get("Squadra")),
            "campionato": intero(riga.get("Crediti da Campionato")),
            "coppa": intero(riga.get("Crediti da Coppa")),
            "punteggio": intero(riga.get("Crediti da Punteggio")),
            "totale": intero(riga.get("Crediti per Anno Nuovo")),
        })

    # Ordinamenti stabili, così il file non cambia senza motivo fra due run
    dati["squadre"].sort(key=lambda s: s["id"])
    dati["giocatori"].sort(key=lambda g: g["id"])
    dati["contratti"].sort(key=lambda c: (c["idSquadra"] or 0, c["idGiocatore"]))
    for elenco in dati["classifiche"].values():
        elenco.sort(key=lambda r: (r["posizione"] is None, r["posizione"]))
    for elenco in dati["coppa"].values():
        elenco.sort(key=lambda r: (r["posizione"] is None, r["posizione"]))
    for elenco in dati["creditiAnnoNuovo"].values():
        elenco.sort(key=lambda r: (r["id"] is None, r["id"]))

    dati["anni"] = sorted(anni, reverse=True)
    return dati


def controlli(dati: dict) -> list[str]:
    """Segnala incoerenze senza correggerle: le correzioni si fanno nell'Excel."""
    avvisi = []
    id_noti = {s["id"] for s in dati["squadre"]}

    for anno, classifica in dati["classifiche"].items():
        posizioni = [r["posizione"] for r in classifica if r["posizione"] is not None]
        if len(posizioni) != len(set(posizioni)):
            avvisi.append(f"{anno}: posizioni duplicate in classifica")

        for riga in classifica:
            if riga["id"] not in id_noti:
                avvisi.append(f"{anno}: ID {riga['id']} in classifica ma non in anagrafica")

        con_punteggio = [r for r in classifica if r["punteggio"] is not None]
        migliori = [r for r in classifica if r["migliorPunteggio"]]
        if len(migliori) > 1:
            avvisi.append(f"{anno}: più di una squadra segnata come miglior punteggio")
        if migliori and con_punteggio:
            massimo = max(r["punteggio"] for r in con_punteggio)
            if migliori[0]["punteggio"] != massimo:
                avvisi.append(
                    f"{anno}: '{migliori[0]['squadra']}' è segnata come miglior punteggio "
                    f"({migliori[0]['punteggio']}) ma il punteggio più alto è {massimo}"
                )

    for anno, righe in dati["creditiAnnoNuovo"].items():
        vuote = [r["squadra"] for r in righe if r["totale"] is None]
        if vuote:
            avvisi.append(
                f"{anno}: 'Crediti per Anno Nuovo' non compilato per {len(vuote)} squadre "
                "(il sito mostrerà un trattino)"
            )

    # --- Giocatori ---
    id_giocatori = [g["id"] for g in dati["giocatori"]]
    if len(id_giocatori) != len(set(id_giocatori)):
        avvisi.append("Giocatori: ci sono ID duplicati")

    for g in dati["giocatori"]:
        if g["idSquadra"] not in id_noti:
            avvisi.append(
                f"Giocatori: '{g['nome']}' punta alla squadra {g['idSquadra']}, "
                "che non esiste in AnagraficaSquadre"
            )
        if g["annoNascita"] is None:
            avvisi.append(
                f"Giocatori: '{g['nome']}' senza AnnoNascita — verrà trattato "
                "come categoria A"
            )

    # --- Contratti ---
    nomi = {g["id"]: g["nome"] for g in dati["giocatori"]}
    attivi_per_giocatore: dict[int, int] = {}

    for c in dati["contratti"]:
        nome = nomi.get(c["idGiocatore"], f"ID {c['idGiocatore']}")
        if c["idSquadra"] not in id_noti:
            avvisi.append(
                f"Contratti: '{nome}' assegnato alla squadra {c['idSquadra']}, "
                "che non esiste"
            )
        if not c["prezzo"] or c["prezzo"] <= 0:
            avvisi.append(
                f"Contratti: '{nome}' ha PrezzoAcquisto {c['prezzo']} — "
                "i costi verranno calcolati male"
            )
        if c["attivo"]:
            attivi_per_giocatore[c["idGiocatore"]] = \
                attivi_per_giocatore.get(c["idGiocatore"], 0) + 1

    for id_g, quanti in attivi_per_giocatore.items():
        if quanti > 1:
            avvisi.append(
                f"Contratti: '{nomi.get(id_g, id_g)}' ha {quanti} contratti attivi "
                "insieme — il regolamento non lo consente"
            )

    # --- Slot per squadra e anno ---
    per_squadra_anno: dict = {}
    nascite = {g["id"]: g["annoNascita"] for g in dati["giocatori"]}

    for c in dati["contratti"]:
        if not c["attivo"]:
            continue
        for anno in range(c["annoInizio"], c["annoFine"] + 1):
            cat = categoria_per_eta(nascite.get(c["idGiocatore"]), anno)
            chiave = (c["idSquadra"], anno)
            conta = per_squadra_anno.setdefault(chiave, {"A": 0, "B": 0, "C": 0})
            conta[cat] += 1

    nomi_squadre = {s["id"]: s["squadra"] for s in dati["squadre"]}
    for (id_sq, anno), conta in sorted(per_squadra_anno.items()):
        squadra = nomi_squadre.get(id_sq, f"squadra {id_sq}")
        if conta["A"] > MAX_CATEGORIA_A:
            avvisi.append(
                f"{anno}: {squadra} ha {conta['A']} giocatori in categoria A "
                f"(massimo {MAX_CATEGORIA_A})"
            )
        if conta["A"] + conta["B"] > MAX_A_PIU_B:
            avvisi.append(
                f"{anno}: {squadra} ha {conta['A'] + conta['B']} giocatori in A+B "
                f"(massimo {MAX_A_PIU_B})"
            )

    return avvisi


def scrivi(dati: dict, destinazione: Path) -> None:
    corpo = json.dumps(dati, ensure_ascii=False, indent=2, sort_keys=False)
    destinazione.parent.mkdir(parents=True, exist_ok=True)
    destinazione.write_text(
        "/* GENERATO AUTOMATICAMENTE — non modificare a mano.\n"
        " * Prodotto da strumenti/genera_dati.py a partire da Gestione.xlsx.\n"
        " * Per aggiornarlo: modifica l'Excel e rilancia lo script.\n"
        " */\n"
        "window.DATI = " + corpo + ";\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Genera js/dati.js da Gestione.xlsx")
    parser.add_argument("--xlsx", type=Path, default=XLSX_PREDEFINITO,
                        help="percorso del file Excel di partenza")
    parser.add_argument("--out", type=Path, default=USCITA,
                        help="file da scrivere")
    args = parser.parse_args()

    if not args.xlsx.exists():
        print(f"ERRORE: non trovo {args.xlsx}")
        return 1

    print(f"Leggo {args.xlsx}")
    wb = openpyxl.load_workbook(args.xlsx, data_only=True)
    dati = costruisci(wb)

    scrivi(dati, args.out)

    print(f"\nScritto {args.out}")
    print(f"  {len(dati['squadre'])} squadre")
    print(f"  {len(dati['giocatori'])} giocatori")
    attivi = sum(1 for c in dati["contratti"] if c["attivo"])
    print(f"  {len(dati['contratti'])} contratti ({attivi} attivi)")
    print(f"  {len(dati['anni'])} stagioni: {', '.join(str(a) for a in dati['anni'])}")

    avvisi = controlli(dati)
    if avvisi:
        print("\nDa controllare nell'Excel:")
        for a in avvisi:
            print(f"  ! {a}")
    else:
        print("\nNessuna incoerenza rilevata.")

    print("\nOra: apri lega.html per vedere il risultato, poi commit e push.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
