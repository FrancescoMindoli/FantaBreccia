# Regolamento Fantacalcio Privato

Questo documento descrive le regole implementate nel sistema, allineate al `regolamento_base.md` (la Bibbia, fonte normativa assoluta).

## 1. Riconferme (contratto di 4 anni)

Quando un giocatore viene riconfermato, viene creato un contratto di **4 anni**.
La squadra mantiene la giurisdizione sul giocatore per tutta la durata.

Il contratto ha:
- `start_year`: anno di inizio
- `end_year`: anno di fine (= start_year + 3)
- `buy_price`: prezzo pagato all'asta (immutabile)
- `is_active`: 1 se attivo, 0 se chiuso

Non è obbligatorio riconfermare alcun giocatore.

## 2. Categorie e limiti delle riconferme

Ogni squadra può riconfermare all'interno della propria rosa. Le categorie si calcolano **in base all'età relativa della stagione di riferimento**:

| Categoria | Limite | Requisito |
|-----------|--------|-----------|
| A | 3 | qualsiasi età (no under-age limit) |
| B | nessuno dedicato, ma A+B ≤ 6 | età ≤ 25 nella stagione di riferimento |
| C | illimitato | età ≤ 21 nella stagione di riferimento |

**Nota sulla logica di limiti aggregati**: il limite dedicato di Cat.A è sempre 3. Cat.B non ha un limite proprio, ma la somma A+B non può superare 6 in qualsiasi momento. Cat.C è completamente al di fuori di questi conteggi e rimane illimitata.

**Esempio numerico (stagione 2026)**: una squadra può avere 3 giocatori Gen.1999 (Cat.A) + 3 giocatori nati 2001 (Cat.B, età 25 nel 2026) = 6/6 nella fascia A+B, più un numero illimitato di giocatori Gen.2005+ (Cat.C, under-21). Quando arriva il 2027, quei giocatori del 2001 compiono 26 anni e diventano Cat.A: questo crea potenzialmente un conflitto (4 giocatori in Cat.A quando il max è 3), che il sistema rileva e segnala, ma non blocca retroattivamente i contratti già firmati.

## 3. Validazione dell'idoneità alla riconferma

La funzione centralizzata `can_renew_player(player_id, team_id)` verifica:
1. Il giocatore è nella rosa della squadra.
2. Il giocatore non ha un contratto attivo.
3. Il giocatore rientra in una categoria (A, B, o C), sempre in base all'età della stagione corrente.
4. I limiti sono rispettati: Cat.A ≤ 3 (dedicato), A+B ≤ 6 (aggregato), Cat.C illimitata.

La stessa validazione è esposta via API in `/api/players/eleggibilita`.

## 4. Fasce di costo delle riconferme

| Prezzo iniziale | Aumento       |
| --------------: | ------------: |
|               1 | costo fisso 1 |
|            2–49 |          +10% |
|           50–99 |          +15% |
|         100–299 |          +20% |
|            ≥300 |          +30% |

Casi di confine:
- `1` → fissato a 1 per tutti gli anni
- `49` → fascia 10%
- `50` → fascia 15%
- `99` → fascia 15%
- `100` → fascia 20%
- `299` → fascia 20%
- `300` → fascia 30%

## 5. Calcolo ricorsivo del costo

Il costo di riconferma è calcolato **ricorsivamente anno per anno**:

```
costo_anno_1 = prezzo_acquisto * (1 + percentuale)
costo_anno_1 = arrotondato per eccesso all'intero

costo_anno_2 = costo_anno_1 * (1 + percentuale)
costo_anno_2 = arrotondato per eccesso all'intero

... e così via per gli anni 3 e 4
```

Per il prezzo 1:

```
anno 1 = 1
anno 2 = 1
anno 3 = 1
anno 4 = 1
```

## 6. Arrotondamento

Tutti i costi delle riconferme e gli svincoli sono **arrotondati all'intero superiore** (ceiling).

Esempi:
- `22,0` → `22`
- `24,2` → `25`
- `27,5` → `28`
- `30,8` → `31`

## 7. Esempi ufficiali

| Prezzo | Anno 1 | Anno 2 | Anno 3 | Anno 4 |
| -----: | -----: | -----: | -----: | -----: |
|      1 |      1 |      1 |      1 |      1 |
|     20 |     22 |     25 |     28 |     31 |
|     70 |     81 |     94 |    109 |    126 |
|    150 |    180 |    216 |    260 |    312 |
|    310 |    403 |    524 |    682 |    887 |

## 8. Svincolo

Penale di svincolo:

```
penale = prezzo_acquisto * 10% * anni_rimanenti
```

con arrotondamento all'intero superiore.

Esempio ufficiale:
- `35 × 10% × 3 = 10,5` → penale = `11`

Se gli anni rimanenti sono 0, la penale è 0.

Lo svincolo:
- chiude (disattiva) il contratto
- registra la penale nello storico crediti (`credits_history`)
- impedisce doppio svincolo o operazioni su contratti già chiusi

## 9. Anni rimanenti

| Anno contratto | Anni rimanenti |
| -------------- | ------------- |
| 1              | 4             |
| 2              | 3             |
| 3              | 2             |
| 4              | 1             |
| terminato      | 0             |

Gli anni rimanenti sono calcolati usando **esclusivamente** i dati del contratto:

```
anni_rimanenti = end_year - current_year + 1
```

Unica fonte di verità: `get_contract_remaining_years`.

## 10. Ciclo di vita

```
giocatore acquistato
        ↓
possibile riconferma (se eleggibile)
        ↓
contratto di 4 anni
        ↓
riconferma (nuovo contratto)
        oppure
svincolo (penale)
        ↓
fine contratto
```

## 11. RESET

Il RESET significa:
- non riconfermare nessun giocatore
- non effettuare svincoli
- non mantenere i contratti di riconferma
- partire con **950 crediti** anziché 1000 per l'asta

Il RESET è una scelta esplicita della squadra, registrata nella tabella `team_resets`.
Non può essere eseguito due volte nella stessa stagione.

## 12. Crediti iniziali

L'asta parte da **1000 crediti**.

A questi si aggiungono:
- crediti rimasti dalla stagione precedente
- crediti premio/malus della stagione precedente

Il budget iniziale è calcolato in un'unica funzione: `calculate_initial_budget`.

## 13. Tetto massimo e minimo

```
budget massimo = 1100
budget minimo  = 900
```

- Se il calcolo supera 1100 → budget = 1100
- Se il calcolo scende sotto 900 → budget = 900

## 14. Crediti residui

I crediti non spesi nella stagione precedente vengono riportati alla stagione successiva:

```
1000 iniziali
- 850 spesi
= 150 residui
```

I 150 sono inclusi nel calcolo del budget successivo (salvo tetto).

## 15. Premi e malus di classifica

| Posizione | Modifica |
| --------: | -------: |
|         1 |      +25 |
|         2 |      +15 |
|         3 |      +10 |
|         4 |       +5 |
|         5 |        0 |
|         6 |        0 |
|         7 |       -5 |
|         8 |      -10 |
|         9 |      -15 |
|        10 |      -20 |

Ogni valore è registrato nello storico crediti con motivazione esplicita.

## 16. Premi aggiuntivi

```
Miglior punteggio = +10
Coppa             = +10
```

Un singolo team può ricevere entrambi i bonus (+20). I due movimenti sono distinguibili nello storico.

## 17. Asta di riparazione

All'asta di riparazione vengono restituiti **+50 crediti** a ogni squadra.

Il movimento è un'operazione esplicita nello storico, assegnata **una sola volta** per sessione (tracciata in `season_rankings.auction_repair_credits`).

## 18. Storico crediti

La tabella `credits_history` registra ogni movimento con:
- `team_id`
- `change`
- `reason`

Movimenti registrati:
- acquisti
- riconferme
- svincoli
- crediti residui (via budget)
- premi/malus di classifica
- bonus miglior punteggio
- bonus coppa
- +50 riparazione
- RESET

Lo storico permette di ricostruire il saldo della squadra.

## 19. Modello dati contratti

La tabella `contracts` contiene:
- `player_id`
- `team_id`
- `start_year`
- `end_year`
- `buy_price`
- `is_active`

Vincoli implementati:
- impossibile creare contratti sovrapposti per lo stesso giocatore
- `end_year` = `start_year` + 3 (4 anni)
- `is_active` aggiornato correttamente su svincolo/scadenza

## 20. Regole NON implementate

Le seguenti regole NON sono implementate perché non presenti nel `regolamento_base.md`:
- fasce ≤10 / 11–20 / 21–30 / >30
- raddoppio del prezzo per acquisti di gennaio
- arrotondamento a 2 decimali
- formula esponenziale con arrotondamento solo alla fine
- altre soglie, categorie, bonus o malus non presenti nel regolamento base

## 21. API

Endpoint principali:
- `POST /api/calculations/riconferma` — calcola il costo di riconferma
- `POST /api/calculations/svincolo` — calcola la penale di svincolo
- `POST /api/players/eleggibilita` — verifica se un giocatore può essere riconfermato
- `POST /api/players/riconferma` — esegue la riconferma (crea contratto + registra renewal)
- `POST /api/contracts/release` — esegue lo svincolo
- `POST /api/teams/budget` — calcola il budget iniziale
- `POST /api/teams/{id}/premi-malus` — applica premi/malus
- `POST /api/teams/{id}/bonus-best-score` — bonus miglior punteggio
- `POST /api/teams/{id}/bonus-coppa` — bonus coppa
- `POST /api/teams/{id}/riparazione` — +50 asta di riparazione
- `POST /api/teams/{id}/reset` — RESET (950 crediti)