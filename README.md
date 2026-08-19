# Fanta Breccia

Sito statico con il regolamento della lega, i dati delle stagioni e un
simulatore per calcolare il costo delle riconferme.

**Online:** https://FrancescoMindoli.github.io/FantaBreccia/

## Contenuto

| Pagina | Cosa contiene |
|---|---|
| `index.html` | Le regole spiegate in modo discorsivo |
| `lega.html` | Squadre, classifica, coppa e crediti |
| `regolamento.html` | Regolamento integrale, con indice navigabile |
| `simulatore.html` | Calcolo dei costi di riconferma e delle penali di svincolo |
| `test.html` | Verifica automatica delle formule |

## Come funziona

Solo HTML, CSS e JavaScript. Nessun framework, nessuna compilazione, nessuna
chiamata di rete.

Per provarlo in locale basta aprire `index.html` con un doppio click.

## Aggiornare i dati della lega

I dati mostrati in `lega.html` vengono da `Gestione.xlsx`, il foglio che si
compila a mano. Il flusso è:

1. **Compila l'Excel** (`fantacalcio/database/Gestione.xlsx` nel progetto del
   gestionale)
2. **Rigenera i dati del sito:**
   ```
   d:\Codice\Fanta_Riconferme\fantacalcio\.venv\Scripts\python.exe strumenti\genera_dati.py
   ```
   Lo script legge i sei fogli e riscrive `js/dati.js`. Segnala anche le
   incoerenze che trova, senza correggerle: le correzioni si fanno nell'Excel.
3. **Controlla il risultato** aprendo `lega.html` con un doppio click
4. **Pubblica:**
   ```
   git add .
   git commit -m "Dati stagione aggiornati"
   git push
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
