# Fanta Breccia — Regolamento e simulatore

Sito statico con il regolamento della lega e un simulatore per calcolare il
costo delle riconferme.

**Online:** https://FrancescoMindoli.github.io/FantaBreccia/

## Contenuto

| Pagina | Cosa contiene |
|---|---|
| `index.html` | Le regole spiegate in modo discorsivo |
| `regolamento.html` | Regolamento integrale, con indice navigabile |
| `simulatore.html` | Calcolo dei costi di riconferma e delle penali di svincolo |
| `test.html` | Verifica automatica delle formule |

## Come funziona

Solo HTML, CSS e JavaScript. Nessun framework, nessuna compilazione, nessuna
chiamata di rete, nessun dato raccolto o memorizzato.

Per provarlo in locale basta aprire `index.html` con un doppio click.

## Le formule

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

## Aggiornare il sito

```
git add .
git commit -m "descrizione della modifica"
git push
```

Online entro 1–2 minuti.

## Nota per chi mantiene il progetto

Le formule di `js/calcoli.js` sono una **seconda implementazione** di quelle
del gestionale privato. Se cambiano le fasce o le percentuali, vanno
aggiornate in entrambi i posti e va rieseguito `test.html`: due
implementazioni divergenti mostrerebbero numeri diversi tra questo sito e il
gestionale.
