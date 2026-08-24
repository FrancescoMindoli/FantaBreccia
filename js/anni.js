/*
 * anni.js — riempie gli anni citati nel testo, calcolandoli dalla data.
 *
 * Le pagine di regole non devono contenere anni scritti a mano: invecchiano
 * male e ogni stagione qualcuno si dimentica di aggiornarli. Qui si scrive
 * <span data-anno="natoB"></span> e il valore arriva da solo.
 *
 * La stagione parte ad agosto: da agosto a dicembre la stagione è l'anno
 * corrente, da gennaio a luglio è ancora quella iniziata l'anno prima.
 */

(function (root) {
  'use strict';

  var ETA_MAX_B = 25;   // categoria B: fino a 25 anni
  var ETA_MAX_C = 21;   // categoria C: fino a 21 anni
  var MESE_INIZIO_STAGIONE = 7; // agosto (i mesi partono da 0)

  function annoStagione(data) {
    data = data || new Date();
    var anno = data.getFullYear();
    return data.getMonth() >= MESE_INIZIO_STAGIONE ? anno : anno - 1;
  }

  function etichettaStagione(anno) {
    var dopo = String((anno + 1) % 100);
    if (dopo.length < 2) dopo = '0' + dopo;
    return anno + '/' + dopo;
  }

  function valori(data) {
    var s = annoStagione(data);
    return {
      stagione: s,
      stagioneLabel: etichettaStagione(s),
      prossima: s + 1,
      prossimaLabel: etichettaStagione(s + 1),
      // Anni di nascita corrispondenti alle soglie delle categorie
      natoB: s - ETA_MAX_B,          // il più vecchio ancora in categoria B
      natoC: s - ETA_MAX_C,          // il più vecchio ancora in categoria C
      natoA: s - ETA_MAX_B - 2       // un anno chiaramente in categoria A
    };
  }

  function riempi(radice, data) {
    var v = valori(data);
    var campi = (radice || document).querySelectorAll('[data-anno]');

    Array.prototype.forEach.call(campi, function (el) {
      var chiave = el.getAttribute('data-anno');
      if (Object.prototype.hasOwnProperty.call(v, chiave)) {
        el.textContent = v[chiave];
      }
    });
  }

  var api = { annoStagione: annoStagione, etichettaStagione: etichettaStagione, valori: valori, riempi: riempi };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Anni = api;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { riempi(); });
    } else {
      riempi();
    }
  }
})(typeof self !== 'undefined' ? self : this);
