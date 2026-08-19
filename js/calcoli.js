/*
 * calcoli.js — Formule ufficiali del Fanta Breccia
 * =================================================
 *
 * ⚠️  ATTENZIONE — SECONDA IMPLEMENTAZIONE
 *
 * Queste funzioni sono la traduzione in JavaScript di:
 *   - fantacalcio/modules/riconferme.py  (calculate_fascia, calculate_riscatto)
 *   - fantacalcio/modules/svincoli.py    (calculate_svincolo)
 *
 * Se modifichi le fasce, le percentuali o l'arrotondamento QUI,
 * devi aggiornare anche i moduli Python — e viceversa.
 * Due implementazioni della stessa regola che divergono producono
 * numeri diversi tra sito pubblico e gestionale.
 *
 * Dopo ogni modifica esegui la verifica:
 *   node js/calcoli.js
 * Tutti i casi devono risultare OK.
 *
 * Nessuna di queste funzioni tocca il DOM: sono funzioni pure,
 * verificabili in isolamento.
 */

(function (root) {
  'use strict';

  /** Durata standard di un contratto, in anni. */
  var DURATA_CONTRATTO = 4;

  /**
   * Arrotondamento all'intero superiore, come nel Python.
   *
   * L'epsilon 1e-9 NON è un dettaglio estetico: in virgola mobile
   * 20 * 1.10 vale 22.000000000000004, e Math.ceil lo porterebbe a 23
   * invece che a 22. Sottrarre l'epsilon prima di arrotondare elimina
   * l'errore di rappresentazione senza alterare i valori legittimi.
   *
   * Equivalente di: math.ceil(costo - 1e-9)
   */
  function arrotondaPerEccesso(valore) {
    return Math.ceil(valore - 1e-9);
  }

  /**
   * Percentuale di aumento annuo in base al prezzo d'acquisto.
   * Restituisce 0 per il caso speciale "prezzo 1" (costo fisso).
   *
   * Regolamento § 4.
   */
  function calcolaFascia(prezzo) {
    if (prezzo <= 1) return 0;
    if (prezzo <= 49) return 10;
    if (prezzo <= 99) return 15;
    if (prezzo <= 299) return 20;
    return 30;
  }

  /** Etichetta leggibile della fascia applicata. */
  function etichettaFascia(prezzo) {
    var percentuale = calcolaFascia(prezzo);
    return percentuale === 0 ? 'Costo fisso 1' : '+' + percentuale + '%';
  }

  /**
   * Costo di riconferma per un dato anno di contratto.
   *
   * Il calcolo è ricorsivo anno per anno, con arrotondamento a OGNI passo.
   * Arrotondare solo alla fine darebbe risultati diversi: è esattamente la
   * "formula esponenziale con arrotondamento solo alla fine" che il
   * regolamento § 20 esclude esplicitamente.
   *
   * Regolamento § 5, § 6.
   */
  function calcolaRiscatto(prezzoAcquisto, anno) {
    // Caso speciale: il prezzo 1 resta 1 per sempre.
    if (prezzoAcquisto <= 1) return 1;

    var percentuale = calcolaFascia(prezzoAcquisto);
    var costo = prezzoAcquisto;

    for (var i = 0; i < anno; i++) {
      costo = costo * (1 + percentuale / 100);
      costo = arrotondaPerEccesso(costo);
    }

    return costo;
  }

  /**
   * Penale di svincolo: 10% del prezzo d'acquisto per ogni anno rimanente.
   * Con 0 anni rimanenti la penale è 0.
   *
   * Regolamento § 8.
   */
  function calcolaSvincolo(prezzoBase, anniRimanenti) {
    if (anniRimanenti <= 0) return 0;
    return arrotondaPerEccesso(prezzoBase * 0.10 * anniRimanenti);
  }

  /**
   * Simulazione completa di un contratto: per ogni anno il costo di
   * riconferma e la penale che si pagherebbe svincolando in quel momento.
   *
   * Gli anni rimanenti scalano da 4 (anno 1) a 1 (anno 4) — regolamento § 9.
   * Rispecchia simulate_contract() di modules/riconferme.py.
   */
  function simulaContratto(prezzoAcquisto, anni) {
    anni = anni || DURATA_CONTRATTO;

    var righe = [];
    var totale = 0;

    for (var anno = 1; anno <= anni; anno++) {
      var costo = calcolaRiscatto(prezzoAcquisto, anno);
      totale += costo;
      righe.push({
        anno: anno,
        costoRiscatto: costo,
        anniRimanenti: anni + 1 - anno,
        costoSvincolo: calcolaSvincolo(prezzoAcquisto, anni + 1 - anno)
      });
    }

    return {
      prezzoAcquisto: prezzoAcquisto,
      fasciaPercentuale: calcolaFascia(prezzoAcquisto),
      fasciaLabel: etichettaFascia(prezzoAcquisto),
      anni: righe,
      costoTotale: totale
    };
  }

  // ---------------------------------------------------------------------
  // Verifica contro i casi ufficiali del regolamento (§ 7 e § 8)
  // ---------------------------------------------------------------------

  var CASI_RISCATTO = [
    { prezzo: 1, fascia: 0, attesi: [1, 1, 1, 1] },
    { prezzo: 20, fascia: 10, attesi: [22, 25, 28, 31] },
    { prezzo: 70, fascia: 15, attesi: [81, 94, 109, 126] },
    { prezzo: 150, fascia: 20, attesi: [180, 216, 260, 312] },
    { prezzo: 310, fascia: 30, attesi: [403, 524, 682, 887] }
  ];

  var CASI_FASCIA = [
    { prezzo: 1, atteso: 0 },
    { prezzo: 2, atteso: 10 },
    { prezzo: 49, atteso: 10 },
    { prezzo: 50, atteso: 15 },
    { prezzo: 99, atteso: 15 },
    { prezzo: 100, atteso: 20 },
    { prezzo: 299, atteso: 20 },
    { prezzo: 300, atteso: 30 }
  ];

  var CASI_SVINCOLO = [
    { prezzo: 35, anni: 3, atteso: 11 },
    { prezzo: 35, anni: 0, atteso: 0 },
    { prezzo: 100, anni: 4, atteso: 40 },
    { prezzo: 20, anni: 1, atteso: 2 }
  ];

  /**
   * Esegue tutti i casi ufficiali e riporta gli esiti.
   * In console del browser: verifica()
   * Da terminale:           node js/calcoli.js
   */
  function verifica(silenzioso) {
    var log = silenzioso ? function () {} : function (m) { console.log(m); };
    var errori = 0;
    var totali = 0;

    function controlla(descrizione, ottenuto, atteso) {
      totali++;
      if (ottenuto === atteso) {
        log('  OK   ' + descrizione + ' = ' + atteso);
      } else {
        errori++;
        log('  FAIL ' + descrizione + ' = ' + ottenuto + ' (atteso ' + atteso + ')');
      }
    }

    log('\n--- Fasce (regolamento § 4) ---');
    CASI_FASCIA.forEach(function (c) {
      controlla('fascia(' + c.prezzo + ')', calcolaFascia(c.prezzo), c.atteso);
    });

    log('\n--- Costi di riconferma (regolamento § 7) ---');
    CASI_RISCATTO.forEach(function (c) {
      controlla('fascia(' + c.prezzo + ')', calcolaFascia(c.prezzo), c.fascia);
      c.attesi.forEach(function (atteso, i) {
        controlla(
          'riscatto(' + c.prezzo + ', anno ' + (i + 1) + ')',
          calcolaRiscatto(c.prezzo, i + 1),
          atteso
        );
      });
    });

    log('\n--- Penali di svincolo (regolamento § 8) ---');
    CASI_SVINCOLO.forEach(function (c) {
      controlla(
        'svincolo(' + c.prezzo + ', ' + c.anni + ' anni)',
        calcolaSvincolo(c.prezzo, c.anni),
        c.atteso
      );
    });

    log('\n--- Valori limite (non devono produrre NaN) ---');
    [0, -5, NaN, Infinity].forEach(function (v) {
      var r = calcolaRiscatto(v, 1);
      totali++;
      if (Number.isFinite(r)) {
        log('  OK   riscatto(' + v + ', 1) = ' + r + ' (finito)');
      } else {
        errori++;
        log('  FAIL riscatto(' + v + ', 1) = ' + r + ' (non finito)');
      }
    });

    log('\n' + (errori === 0
      ? '✅ TUTTI I ' + totali + ' CASI SUPERATI'
      : '❌ ' + errori + ' CASI FALLITI su ' + totali));

    return { totali: totali, errori: errori };
  }

  // ---------------------------------------------------------------------
  // Esportazione: funziona sia nel browser sia sotto Node
  // ---------------------------------------------------------------------

  var api = {
    DURATA_CONTRATTO: DURATA_CONTRATTO,
    arrotondaPerEccesso: arrotondaPerEccesso,
    calcolaFascia: calcolaFascia,
    etichettaFascia: etichettaFascia,
    calcolaRiscatto: calcolaRiscatto,
    calcolaSvincolo: calcolaSvincolo,
    simulaContratto: simulaContratto,
    verifica: verifica
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    // Eseguito direttamente da terminale: lancia la verifica ed esce
    // con codice 1 se qualcosa non torna (utile in automazione).
    if (require.main === module) {
      var esito = verifica();
      process.exit(esito.errori === 0 ? 0 : 1);
    }
  } else {
    root.Calcoli = api;
    root.verifica = verifica; // comodo dalla console del browser
  }
})(typeof self !== 'undefined' ? self : this);
