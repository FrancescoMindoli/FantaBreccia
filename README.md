# Fanta Breccia

Sito statico con il regolamento della lega, i dati delle stagioni e un
simulatore per calcolare il costo delle riconferme.

**Online:** https://FrancescoMindoli.github.io/FantaBreccia/

## Contenuto

| Pagina | Cosa contiene |
|---|---|
| `index.html` | Le regole spiegate in modo discorsivo |
| `stagioni.html` | Albo d'oro, classifiche, coppa e crediti per stagione |
| `contratti.html` | Giocatori sotto contratto, costo anno per anno, slot |
| `regolamento.html` | Regolamento integrale, con indice navigabile |
| `simulatore.html` | Calcolo dei costi di riconferma e delle penali di svincolo |
| `test.html` | Verifica automatica delle formule |

## Come funziona

Solo HTML, CSS e JavaScript. Nessun framework, nessuna compilazione, nessuna
chiamata di rete.

Per provarlo in locale basta aprire `index.html` con un doppio click.

## Aggiornare il sito

Tutti i dati vengono da **`dati/Gestione.xlsx`**, che è la fonte unica.

```
1. Apri dati\Gestione.xlsx, compila e SALVA
2. Chiudi Excel
3. Doppio click su aggiorna.bat
```

`aggiorna.bat` fa tutto: rigenera i dati, ti mostra cosa è cambiato e quali
incoerenze ha trovato, chiede conferma, poi salva e pubblica. Se qualcosa non
va si ferma senza pubblicare nulla.

Se preferisci i comandi a mano:

```
.venv\Scripts\python.exe strumenti\genera_dati.py
git add . && git commit -m "Dati aggiornati" && git push
```

### I fogli dell'Excel

| Foglio | Contenuto |
|---|---|
| `_Leggimi` | Mappa dei fogli e delle colonne |
| `AnagraficaSquadre` | Squadre e allenatori |
| `CambioNome` | Nome della squadra per anno |
| `Contratti` | Contratti di riconferma |
| `Svincoli` | Storico degli svincoli e penali |
| `Classifiche` | Classifica di campionato |
| `Coppa` | Podio della coppa |
| `CreditiAsta` | Crediti avanzati a fine stagione |
| `CreditiAnnoNuovo` | Budget della stagione nuova |
| `RegoleCrediti` | Premi, malus, tetti e crediti di partenza |

### Il foglio Contratti

Una riga per contratto.

| Colonna | Cosa scrivere |
|---|---|
| `Giocatore` | Nome del calciatore |
| `AnnoNascita` | Solo l'anno. **Determina la categoria A/B/C** e quindi gli slot |
| `IDSquadra` | ID come in `AnagraficaSquadre` |
| `AnnoInizio` | Anno della riconferma |
| `PrezzoAcquisto` | Prezzo pagato all'asta: non cambia mai |
| `Attivo` | `1` in corso, `0` chiuso |

`AnnoFine` non si scrive: è sempre `AnnoInizio + 3`.

Se lo stesso giocatore compare in due contratti attivi, lo script avvisa: o è
un doppione, o sono due omonimi da distinguere nel nome.

### Il foglio Svincoli

| Colonna | Cosa scrivere |
|---|---|
| `Giocatore` | Lo stesso nome usato in `Contratti` |
| `IDSquadra` | La squadra che lo svincola |
| `AnnoSvincolo` | Anno in cui avviene |
| `Penale` | **Lasciala vuota**: la calcola il sistema |
| `Note` | Motivo, facoltativo |

**Quando svincoli un giocatore servono due passaggi:**

1. Aggiungi la riga in `Svincoli`
2. Metti `Attivo = 0` nella sua riga di `Contratti`

Se ne fai solo uno, lo script te lo segnala.

La penale è `prezzo × 10% × anni residui`, arrotondata per eccesso
(regolamento § 8). Compila `Penale` solo per forzare un valore diverso da
quello da regolamento: in quel caso lo script avvisa, così una forzatura non
passa inosservata.

Il sito raggruppa le penali per squadra e per anno, e mostra quanti crediti
vanno tolti all'asta di quella stagione.

### Calcolare i crediti della stagione nuova

Le colonne bonus di `CreditiAnnoNuovo` non si compilano a mano: le calcola uno
strumento a partire da classifica, coppa e crediti residui.

```
.venv\Scripts\python.exe strumenti\calcola_crediti.py --prova   mostra i conti
.venv\Scripts\python.exe strumenti\calcola_crediti.py           scrive nell'Excel
```

La formula è quella del regolamento (§ 12–16):

```
budget = base + residui + premio/malus classifica
       + bonus miglior punteggio + bonus coppa
       poi limitato fra tetto minimo e tetto massimo
```

I valori **non sono scritti nel codice**: si leggono dal foglio
`RegoleCrediti`, che riproduce la tabella `credit_rules` del vecchio
gestionale. Per cambiare un premio si modifica quel foglio e si rilancia lo
strumento — nessun file Python da toccare.

| Categoria | Significato |
|---|---|
| `base` | Crediti di partenza all'asta (1000) |
| `reset` | Partenza per chi fa RESET (950) |
| `tetto_max` / `tetto_min` | Limiti del budget (1100 / 900) |
| `classifica` | Premio o malus per posizione, una riga per posizione |
| `best_score` | Bonus miglior punteggio (10) |
| `coppa` | Bonus per posizione in coppa |
| `riparazione` | Crediti dell'asta di riparazione (50) |

> **Il bonus coppa spetta solo a chi vince.** La riga ha posizione 1: una
> posizione diversa non trova regola e vale 0. È lo stesso comportamento del
> gestionale, dove `posizione or 1` normalizzava la regola su quella singola
> posizione.

> Il RESET (partire da 950) non è gestito: nell'Excel non c'è una colonna che
> lo registri. Se una squadra ha fatto reset, correggi la sua riga a mano dopo
> aver lanciato lo strumento.

### Se manca Python

```
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install openpyxl
```

> `js/dati.js` è **generato**: non modificarlo a mano, verrebbe sovrascritto
> alla prossima esecuzione dello script. La fonte è sempre l'Excel.

### Perché un `.js` e non un `.json`

Un file JSON andrebbe letto con `fetch()`, che i browser bloccano sulle pagine
aperte da `file://`. Il sito non sarebbe più provabile in locale con un doppio
click. Un `.js` che assegna una variabile globale funziona ovunque, senza
bisogno di un server.

### Cosa il sito non fa

Il sito **non calcola** i crediti: mostra i valori scritti nell'Excel. I premi
e i malus non sono costanti — nel gestionale vivono nella tabella
`credit_rules` e possono cambiare da un anno all'altro — quindi ricalcolarli
qui produrrebbe numeri che possono divergere da quelli veri.

Se una casella dell'Excel è vuota, il sito mostra un trattino.

## Le formule del simulatore

Vivono in [`js/calcoli.js`](js/calcoli.js) e riproducono le regole del
regolamento:

- **Fasce di costo** — +10% da 2 a 49, +15% da 50 a 99, +20% da 100 a 299,
  +30% da 300 in su. I giocatori pagati 1 credito costano 1 per sempre.
- **Costo di riconferma** — calcolato anno per anno sul costo dell'anno
  precedente, con arrotondamento all'intero superiore a ogni passo.
- **Penale di svincolo** — 10% del prezzo d'acquisto per ogni anno rimanente.

Apri [`test.html`](test.html) per verificare che il calcolo produca i valori
ufficiali del regolamento. Con Node installato, la stessa verifica gira da
terminale:

```
node js/calcoli.js
```

## Nota per chi mantiene il progetto

Le formule di `js/calcoli.js` sono una **seconda implementazione** di quelle
del gestionale privato. Se cambiano le fasce o le percentuali, vanno
aggiornate in entrambi i posti e va rieseguito `test.html`: due
implementazioni divergenti mostrerebbero numeri diversi tra questo sito e il
gestionale.
