# Come gestire l'Excel, anno per anno

> **A cosa serve questo file**
> Fra dodici mesi non ti ricorderai niente di quello che hai fatto oggi.
> Qui c'è la procedura completa: cosa scrivere, dove, in che ordine, cosa
> lanciare e quali conti fa il computer al posto tuo.
>
> Il file da compilare è **`dati\Gestione.xlsx`**. È l'unica fonte: il sito
> non ha altre memorie, e il vecchio gestionale non c'entra più nulla.

---

## Il quadro in dieci secondi

```
    apri dati\Gestione.xlsx
            ↓
    compili i fogli (istruzioni sotto)
            ↓
    salvi e CHIUDI Excel
            ↓
    doppio click su aggiorna.bat
            ↓
    il sito è online in 1-2 minuti
```

**Chiudere Excel prima di lanciare il bat non è un dettaglio:** con il file
aperto le tue ultime modifiche restano in un file temporaneo e lo script legge
la versione vecchia. Il bat se ne accorge e si ferma, ma è meglio saperlo.

---

## I dieci fogli, e chi li compila

| Foglio | Lo compili tu? | Quando |
|---|---|---|
| `_Leggimi` | ❌ | Promemoria, non contiene dati |
| `AnagraficaSquadre` | 🖊️ Raramente | Solo se entra o esce una squadra |
| `CambioNome` | 🖊️ Ogni anno | Se qualcuno cambia nome alla squadra |
| `Contratti` | 🖊️ **Ogni anno** | Le riconferme che hai fatto |
| `Svincoli` | 🖊️ Quando serve | Se molli un giocatore prima della scadenza |
| `Classifiche` | 🖊️ **Ogni anno** | A campionato finito |
| `Coppa` | 🖊️ **Ogni anno** | A coppa finita |
| `CreditiAsta` | 🖊️ **Ogni anno** | I crediti avanzati da ciascuno |
| `CreditiAnnoNuovo` | 🤖 **No** | Lo riempie `calcola_crediti.py` |
| `RegoleCrediti` | 🖊️ Quasi mai | Solo se cambiate le regole della lega |

---

# La procedura di fine stagione

Esempio concreto: **stai chiudendo il 2026** e prepari il 2027.
Nei prossimi anni sostituisci i numeri, il resto non cambia.

---

## Passo 1 — Classifica finale

Foglio **`Classifiche`**, una riga per squadra.

| Anno | Posizione | ID | Punteggio | Miglior Punteggio | Squadra |
|---|---|---|---|---|---|
| 2026 | 1 | 8 | 2486 | 1 | Raoul e il socio |
| 2026 | 2 | 5 | 2471 | 0 | TurettaEPacciani FC |

- **Anno** — la stagione che hai appena finito (2026)
- **Posizione** — da 1 a 10, l'ordine finale del campionato
- **ID** — il numero della squadra, lo trovi in `AnagraficaSquadre`
- **Punteggio** — i fantapunti totali della stagione
- **Miglior Punteggio** — metti `1` a **una sola squadra**, quella col
  punteggio più alto; `0` a tutte le altre
- **Squadra** — il nome, serve solo a te per rileggere il foglio

> ⚠️ La classifica segue i **punti di campionato**, non i fantapunti totali.
> Può benissimo capitare che il primo in classifica non abbia il punteggio più
> alto: è normale, e il sito lo scrive esplicitamente quando succede.
>
> Se però metti il flag `1` a chi *non* ha il punteggio più alto, lo script te
> lo segnala: probabilmente è un errore di battitura.

---

## Passo 2 — Coppa

Foglio **`Coppa`**, due righe: finalista vincente e perdente.

| Anno | Posizione | ID | Squadra |
|---|---|---|---|
| 2026 | 1 | 4 | Whiteam FC |
| 2026 | 2 | 8 | Raoul e il socio |

> 💰 **Solo il primo prende il bonus.** Il secondo classificato riceve 0
> crediti. Non è una dimenticanza: è la regola, scritta nel foglio
> `RegoleCrediti` alla riga `coppa`, che vale per la posizione 1.

---

## Passo 3 — Crediti avanzati

Foglio **`CreditiAsta`**: quanti crediti sono rimasti in tasca a ciascuno a
fine stagione.

| ID | Anno | CreditiFineAnno | Nome |
|---|---|---|---|
| 1 | 2026 | 32 | Mindo |
| 2 | 2026 | 13 | Alessio Cocchieri & Febio |

- **Anno** — la stagione che chiudi (2026)
- **CreditiFineAnno** — quello che è avanzato, si somma al budget dell'anno dopo
- **Nome** — l'allenatore, serve solo a te

---

## Passo 4 — Fai calcolare i crediti 🤖

**Non compilare `CreditiAnnoNuovo` a mano.** Apri il Prompt dei comandi:

```
cd /d d:\Codice\FantaBreccia
.venv\Scripts\python.exe strumenti\calcola_crediti.py --prova
```

`--prova` mostra i conti **senza scrivere niente**. Controlla che tornino, poi
rilancia senza:

```
.venv\Scripts\python.exe strumenti\calcola_crediti.py
```

Vedrai una tabella così:

```
=== Stagione 2026 → budget 2027 ===
Squadra                      Pos  Camp Coppa  Punt  Resid  Budget
Raoul e il socio               1   +25    +0   +10     13    1048
Whiteam FC                     3   +10   +10    +0     10    1030
Nkunku Settete                10   -20    +0    +0      4     984
```

### Che conto fa

```
budget = 1000                    crediti di partenza
       + crediti avanzati        dal foglio CreditiAsta
       + premio/malus            secondo la posizione in classifica
       + 10 se miglior punteggio
       + 10 se ha vinto la coppa
       poi limitato fra 900 e 1100
```

I valori **non sono scritti nel codice**: li legge dal foglio `RegoleCrediti`.
Se un anno decidete che il primo prende +30 invece di +25, cambi quel foglio e
rilanci — nessun file di programmazione da toccare.

Premi e malus attuali:

| Posizione | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Crediti | +25 | +15 | +10 | +5 | 0 | 0 | −5 | −10 | −15 | −20 |

> ⚠️ **Il RESET non è gestito.** Se una squadra sceglie di azzerare tutto
> (nessuna riconferma, si riparte da 950 invece che da 1000), lo script non lo
> sa: nell'Excel non c'è una colonna per registrarlo. **Correggi la sua riga a
> mano** dopo aver lanciato lo strumento, mettendo 950 come base.

---

## Passo 5 — Le riconferme

Foglio **`Contratti`**, una riga per ogni giocatore riconfermato.

| Giocatore | AnnoNascita | IDSquadra | AnnoInizio | PrezzoAcquisto | Attivo |
|---|---|---|---|---|---|
| McTominay | 1996 | 1 | 2026 | 122 | 1 |

- **Giocatore** — il nome. È anche il modo in cui il sistema lo riconosce:
  se hai due omonimi, distinguili (`Rossi M.` e `Rossi A.`)
- **AnnoNascita** — solo l'anno. **È il campo più importante dopo il prezzo:**
  da qui dipende la categoria, e quindi se sfori i limiti
- **IDSquadra** — il numero da `AnagraficaSquadre`
- **AnnoInizio** — l'anno della riconferma. Se stai riconfermando adesso per la
  stagione 2027, scrivi `2027`
- **PrezzoAcquisto** — quanto lo hai pagato **all'asta la prima volta**. Non
  cambia mai più, nemmeno negli anni successivi
- **Attivo** — `1` finché il contratto è in corso

**`AnnoFine` non si scrive**: è sempre `AnnoInizio + 3`, lo calcola il sistema.

### Le categorie, che decidono tutto

Si calcolano dall'anno di nascita, **rispetto all'anno che stai guardando**:

| Categoria | Chi ci rientra | Quanti |
|---|---|---|
| **O25** | oltre i 25 anni | massimo **3** |
| **U25** | fino a 25 anni | nessun limite proprio |
| **U21** | fino a 21 anni | **illimitati** |

E il vincolo che lega le prime due: **O25 + U25 non può superare 6**.

> 🎯 **La trappola da conoscere.** Un giocatore invecchia. Uno nato nel 2001 è
> U25 nel 2026, ma nel 2027 compie 26 anni e diventa O25: se ne avevi già 3 in
> O25, ti ritrovi a 4 su 3 **senza aver fatto nulla**.
>
> I contratti già firmati restano validi — nessuno te li annulla. Ma la pagina
> Contratti del sito te lo dice in anticipo, con l'avviso giallo, e ti nomina
> il giocatore responsabile. **Guardala prima di riconfermare**, non dopo.

---

## Passo 6 — Gli svincoli (solo se ne fai)

Molli un giocatore prima della scadenza? Servono **due modifiche**, non una.

**6a.** Aggiungi la riga nel foglio **`Svincoli`**:

| Giocatore | IDSquadra | AnnoSvincolo | Penale | Note |
|---|---|---|---|---|
| Pierotti | 1 | 2028 | *(vuota)* | non rendeva |

**Lascia `Penale` vuota.** La calcola il sistema:

```
penale = prezzo d'acquisto × 10% × anni che restavano
         arrotondata all'intero superiore
```

Esempio: pagato 310, lo svincoli nel 2028 quando restano 2 anni →
`310 × 0,10 × 2 = 62` crediti.

Riempi la casella `Penale` **solo** per forzare un valore diverso da quello del
regolamento, per esempio un accordo particolare. In quel caso lo script te lo
segnala, così una forzatura non passa inosservata.

**6b.** Nel foglio `Contratti`, metti **`Attivo = 0`** sulla riga di quel
giocatore.

> Se fai solo una delle due cose, lo script te lo dice:
> *"risulta svincolato nel 2028 ma il suo contratto è ancora Attivo = 1"*.

---

## Passo 7 — Cambi di nome (se ce ne sono)

Qualcuno ha ribattezzato la squadra? Foglio **`CambioNome`**:

| ID | Anno | Nome |
|---|---|---|
| 1 | 2027 | Il nuovo nome |

Il sito mostrerà il nome giusto per ciascuna stagione, senza riscrivere la
storia passata.

---

## Passo 8 — Pubblica

Salva l'Excel, **chiudi Excel**, poi:

```
doppio click su aggiorna.bat
```

Lo script fa tutto in sequenza:

1. Rilegge l'Excel e rigenera i dati del sito
2. Ti mostra **cosa ha trovato che non torna** (vedi sotto)
3. Ti elenca le modifiche da pubblicare
4. Chiede conferma: `S` per andare online, `N` per fermarsi
5. Pubblica

Se rispondi `N` non viene pubblicato nulla e le tue modifiche restano sul
computer.

---

# I controlli automatici

Lo script non corregge mai niente: **segnala e basta**, perché le correzioni
vanno fatte nell'Excel, che è la fonte. Ecco cosa guarda.

| Avviso | Cosa significa |
|---|---|
| *ha IDSquadra 99, che non esiste* | Hai scritto un ID sbagliato in `Contratti` |
| *senza AnnoNascita* | Verrà trattato come O25 e il conteggio slot sarà falsato |
| *ha PrezzoAcquisto 0* | I costi verranno calcolati male |
| *risultano 2 contratti attivi per X* | O è un doppione, o sono due omonimi |
| *è segnata come miglior punteggio ma il punteggio più alto è…* | Probabile errore nel flag |
| *risulta svincolato ma il contratto è ancora Attivo = 1* | Hai fatto solo metà del passo 6 |
| *la penale è scritta a mano, non calcolata* | Hai forzato un valore: se non volevi, svuota la casella |
| *ha 4 giocatori in categoria A (massimo 3)* | Sforamento slot, presente o futuro |
| *'Crediti per Anno Nuovo' non compilato* | Ti sei dimenticato il passo 4 |

Se non c'è niente da segnalare leggerai:

```
Nessuna incoerenza rilevata.
```

---

# Cosa calcola il sito da solo

Non devi scrivere nessuno di questi numeri: si ricavano tutti dai dati che hai
inserito, e si aggiornano da soli.

| Cosa | Come |
|---|---|
| **Costo di riconferma** anno per anno | Il prezzo cresce di una percentuale che dipende dalla fascia (+10% da 2 a 49, +15% da 50 a 99, +20% da 100 a 299, +30% da 300 in su), calcolata **sul costo dell'anno prima** e arrotondata per eccesso a ogni passo |
| **Penale di svincolo** | 10% del prezzo per ogni anno rimanente |
| **Categoria** di ogni giocatore, anno per anno | Dall'anno di nascita |
| **Slot occupati** e sforamenti, presenti e futuri | Contando le categorie squadra per squadra |
| **Chi causa** uno sforamento | Cercando chi cambia categoria in quell'anno |
| **Albo d'oro e medagliere** | Da `Classifiche` e `Coppa` |
| **Anno di fine contratto** | `AnnoInizio + 3` |

---

# Promemoria per il tuo io del prossimo anno

- [ ] `Classifiche` — posizioni, punteggi, un solo flag miglior punteggio
- [ ] `Coppa` — le due finaliste
- [ ] `CreditiAsta` — i crediti avanzati
- [ ] Lanciare `calcola_crediti.py` (prima con `--prova`)
- [ ] Correggere a mano chi ha fatto RESET, se qualcuno lo ha fatto
- [ ] **Guardare la pagina Contratti prima di decidere le riconferme**
- [ ] `Contratti` — le nuove riconferme, con `AnnoInizio` = anno nuovo
- [ ] `Svincoli` + `Attivo = 0` per chi è stato mollato
- [ ] `CambioNome` se qualcuno ha cambiato nome
- [ ] Salvare, chiudere Excel, lanciare `aggiorna.bat`
- [ ] Leggere gli avvisi prima di rispondere `S`

---

# Se qualcosa va storto

| Problema | Soluzione |
|---|---|
| `aggiorna.bat` dice che l'Excel è aperto | Chiudi Excel salvando, e rilancia |
| `Python non trovato` | `py -3 -m venv .venv` poi `.venv\Scripts\python.exe -m pip install openpyxl` |
| Ho pubblicato un errore | Correggi l'Excel e rilancia `aggiorna.bat`: il sito si aggiorna in 2 minuti |
| Ho fatto un disastro nell'Excel | L'Excel è dentro Git: `git checkout dati/Gestione.xlsx` riporta l'ultima versione pubblicata |
| Il sito non si aggiorna | Ricarica con `Ctrl+F5`: è la cache del browser |
| I numeri del sito non tornano | Apri `test.html`: verifica le formule contro i casi ufficiali del regolamento |

---

# Dove sono le cose

```
d:\Codice\FantaBreccia\
├── dati\Gestione.xlsx          ← IL FILE CHE COMPILI
├── aggiorna.bat                ← IL FILE CHE LANCI
├── strumenti\
│   ├── calcola_crediti.py      passo 4: calcola i budget
│   ├── genera_dati.py          lo chiama aggiorna.bat, non serve lanciarlo
│   └── importa_da_db.py        servì una volta sola, per il travaso iniziale
└── js\dati.js                  GENERATO: non modificarlo, viene sovrascritto
```

Il sito online: **https://francescomindoli.github.io/FantaBreccia/**
