# Piano: FantaBreccia come progetto autonomo

Stato: **in esecuzione**. Le caselle spuntate sono già fatte.

---

## Premessa: cosa cambia

Fino a ieri questo sito era un derivato del gestionale. Da adesso è un
**progetto a sé**, con la sua fonte dati, il suo ambiente Python e la sua
procedura di aggiornamento. Il gestionale su `d:\Codice\Fanta_Riconferme`
resta dov'è, ma i due non si parlano più.

> **Come ho interpretato la richiesta "adatta l'Excel al SQLite".**
> L'Excel *diventa* il database: ogni foglio corrisponde a una tabella dello
> schema SQLite del gestionale. Non si genera un file `.db` — non servirebbe a
> nulla, il sito è statico e legge JavaScript. Se intendevi altro, dimmelo.

---

## 1. L'Excel diventa il database

### Dove si trova

```
d:\Codice\FantaBreccia\dati\Gestione.xlsx
```

È **dentro il repository** e viene versionato con Git. Tre motivi: è la fonte
di verità e va tracciata; ogni push ne diventa un backup; se sbagli una
modifica torni indietro con un comando.

- [x] Copiare i dati esistenti dal vecchio file
- [x] Aggiungere i due fogli mancanti (`Giocatori`, `Contratti`)
- [x] Aggiungere un foglio `_Leggimi` con la mappa dei fogli e delle colonne
- [x] Togliere `*.xlsx` dal `.gitignore`

### I fogli e le tabelle SQLite corrispondenti

| Foglio | Tabella SQLite | Contenuto |
|---|---|---|
| `AnagraficaSquadre` | `teams` | Squadre e allenatori |
| `CambioNome` | `cambio_nome` | Nome della squadra per anno |
| `Giocatori` | `players` | 🆕 Calciatori |
| `Contratti` | `contracts` | 🆕 Contratti di riconferma |
| `Classifiche` | `season_rankings` | Classifica di campionato |
| `Coppa` | `coppa` | Podio della coppa |
| `CreditiAsta` | `credit_residual` | Crediti avanzati |
| `CreditiAnnoNuovo` | `crediti_anno_nuovo` | Budget della stagione nuova |

I nomi dei fogli restano quelli che avevi: rinominarli avrebbe rotto quello
che già funziona senza alcun guadagno. La corrispondenza con le tabelle è
documentata nel foglio `_Leggimi`.

### Il foglio nuovo

**`Contratti`** — `Giocatore` · `Ruolo` · `AnnoNascita` · `Squadra` ·
`AnnoInizio` · `PrezzoAcquisto` · `Attivo`

Autosufficiente: **nessun ID da scrivere**, giocatore e squadra si indicano per
nome. `AnnoFine` non si scrive, è sempre `AnnoInizio + 3`.

`AnnoNascita` è il campo critico: da lì dipende la categoria A/B/C e quindi
tutto il conteggio degli slot.

> Inizialmente c'era anche un foglio `Giocatori` separato, con gli ID. È stato
> eliminato perché costringeva a incrociare due fogli a mano per inserire un
> contratto. Le colonne che servivano davvero — nome, ruolo, anno di nascita —
> sono migrate qui.

---

## 2. Ambiente autonomo

- [x] Creare `.venv` nel progetto con `openpyxl` (Python 3.9)
- [x] Nessuna dipendenza dal gestionale

---

## 3. Aggiornamento con un doppio click

- [x] `aggiorna.bat` che esegue in sequenza: generazione dati → riepilogo →
      conferma → commit → push
- [x] Si ferma e mostra l'errore se qualcosa non va, senza pubblicare

---

## 4. Pagina Contratti

- [x] `categoriaPerEta()` in `js/calcoli.js`, con i casi di verifica
- [x] Lettura di `Giocatori` e `Contratti` nel generatore
- [x] Controlli di coerenza sui dati
- [x] `contratti.html` + `js/contratti.js`
- [x] Stato vuoto comprensibile finché i fogli non sono compilati

Mostra: selettore squadra e anno, ricerca, riepilogo slot (limiti 3 e 6),
griglia anno per anno con costo e categoria, totali.
Non mostra: svincolo e rettifiche — sono scritture, un sito statico non le può
registrare.

---

## 5. Correzioni grafiche

- [x] **Navigazione su telefono**: con cinque voci l'ultima usciva dalla barra
      e bisognava scorrere. Ora il logo sta sulla sua riga e le voci vanno a
      capo: sono tutte visibili senza scorrere
- [x] **Tabella del simulatore**: le colonne dicevano "Costo riconferma" e
      "Penale svincolo" senza spiegare cosa fossero quei numeri. Ora ogni riga
      ha una frase in chiaro e i valori sono etichettati come crediti
- [x] **Significato degli anni**: spiegato con esempi nel simulatore, nella
      pagina "Come funziona" e nel regolamento

### Cosa significano gli anni

Questo era il punto meno chiaro del sito:

- **Anno 1** è l'anno in cui riconfermi il giocatore. La penale dell'anno 1 è
  quella che paghi se lo molli **durante quello stesso anno** (per esempio a
  gennaio)
- **Anno 2** è la seconda asta da quando lo hai riconfermato: lì scegli se
  pagare la cifra dell'anno 2 per tenerlo, oppure pagare la penale e lasciarlo
  andare
- e così per gli anni 3 e 4

---

## 6. Il flusso, d'ora in poi

```
1. Apri  dati\Gestione.xlsx  e compili
2. Doppio click su  aggiorna.bat
3. Il sito è online in 1–2 minuti
```

Nient'altro. Lo script rigenera i dati, ti mostra cosa ha trovato, chiede
conferma e pubblica.

---

## 7. Cosa resta fuori

**Il gestionale non viene toccato.** Se continui a usarlo, i due archivi
divergono: lui non legge questo Excel e questo Excel non sa cosa inserisci
lì. Con questa scelta l'Excel è l'unica fonte, e il gestionale diventa
ridondante.

**Le regole restano scritte due volte** — in `js/calcoli.js` qui e nei moduli
Python del gestionale. Finché tieni entrambi i progetti, una modifica alle
fasce va fatta in tutti e due. Se abbandoni il gestionale, il problema sparisce
da solo.
