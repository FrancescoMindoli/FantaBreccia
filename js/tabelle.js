/*
 * tabelle.js — rende le tabelle leggibili su telefono.
 *
 * Sotto i 640px una tabella a più colonne costringe a scorrere di lato.
 * Qui ogni riga diventa una scheda con l'etichetta a sinistra e il valore a
 * destra: l'etichetta viene copiata dall'intestazione della colonna nel
 * data-label della cella, e il CSS la mostra con ::before.
 *
 * Le tabelle a due colonne restano tabelle: su telefono ci stanno già, e
 * trasformarle in schede le renderebbe più lunghe senza guadagno.
 */

(function (root) {
  'use strict';

  var COLONNE_MINIME = 3;

  function preparaTabelle(radice) {
    var tabelle = (radice || document).querySelectorAll('table');

    Array.prototype.forEach.call(tabelle, function (tabella) {
      var intestazioni = tabella.querySelectorAll('thead th');
      if (intestazioni.length < COLONNE_MINIME) {
        tabella.classList.remove('schede');
        return;
      }

      var etichette = Array.prototype.map.call(intestazioni, function (th) {
        return th.textContent.trim();
      });

      tabella.classList.add('schede');

      Array.prototype.forEach.call(
        tabella.querySelectorAll('tbody tr'),
        function (riga) {
          Array.prototype.forEach.call(riga.children, function (cella, i) {
            if (etichette[i]) cella.setAttribute('data-label', etichette[i]);
          });
        }
      );
    });
  }

  root.preparaTabelle = preparaTabelle;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { preparaTabelle(); });
  } else {
    preparaTabelle();
  }
})(window);
