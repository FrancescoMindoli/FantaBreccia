/*
 * simulatore.js — solo interfaccia.
 * Le formule stanno in calcoli.js e non vanno duplicate qui.
 */

(function () {
  'use strict';

  var input = document.getElementById('prezzo');
  var fasciaValore = document.getElementById('fascia-valore');
  var fasciaDesc = document.getElementById('fascia-desc');
  var corpo = document.getElementById('tabella-corpo');
  var totale = document.getElementById('totale');
  var errore = document.getElementById('errore');
  var risultati = document.getElementById('risultati');

  var DESCRIZIONI = {
    0: 'I giocatori pagati 1 credito costano 1 per tutti e quattro gli anni.',
    10: 'Fascia da 2 a 49 crediti.',
    15: 'Fascia da 50 a 99 crediti.',
    20: 'Fascia da 100 a 299 crediti.',
    30: 'Fascia da 300 crediti in su.'
  };

  function mostraErrore(messaggio) {
    risultati.hidden = true;
    errore.textContent = messaggio;
    errore.hidden = false;
  }

  function aggiorna() {
    var grezzo = input.value.trim();

    if (grezzo === '') {
      mostraErrore('Inserisci il prezzo pagato all\'asta per vedere il calcolo.');
      return;
    }

    var prezzo = Number(grezzo);

    if (!Number.isFinite(prezzo)) {
      mostraErrore('Inserisci un numero valido.');
      return;
    }
    if (prezzo < 1) {
      mostraErrore('Il prezzo minimo è 1 credito.');
      return;
    }
    if (prezzo > 100000) {
      mostraErrore('Prezzo troppo alto: il massimo accettato è 100.000 crediti.');
      return;
    }

    // I prezzi d'asta sono interi: tronchiamo eventuali decimali incollati.
    prezzo = Math.floor(prezzo);

    var sim = Calcoli.simulaContratto(prezzo);

    errore.hidden = true;
    risultati.hidden = false;

    fasciaValore.textContent = sim.fasciaLabel;
    fasciaDesc.textContent = DESCRIZIONI[sim.fasciaPercentuale] || '';

    corpo.innerHTML = '';
    sim.anni.forEach(function (riga) {
      var tr = document.createElement('tr');

      var tdAnno = document.createElement('td');
      tdAnno.innerHTML = '<strong>Anno ' + riga.anno + '</strong>' +
        '<span class="meta">' +
        (riga.anno === 1
          ? 'quando lo riconfermi'
          : riga.anno + 'ª asta da allora') +
        '</span>';

      var tdCosto = document.createElement('td');
      tdCosto.className = 'num';
      tdCosto.innerHTML = '<span class="costo">' + riga.costoRiscatto + '</span>';

      var tdSvincolo = document.createElement('td');
      tdSvincolo.className = 'num';
      tdSvincolo.innerHTML =
        '<span class="costo costo-ko">' + riga.costoSvincolo + '</span>' +
        '<span class="meta">' + riga.anniRimanenti +
        (riga.anniRimanenti === 1 ? ' anno residuo' : ' anni residui') + '</span>';

      var tdSpiega = document.createElement('td');
      tdSpiega.className = 'spiega';
      tdSpiega.textContent = riga.anno === 1
        ? 'Paghi ' + riga.costoRiscatto + ' crediti e lo riconfermi. Se lo molli '
          + 'durante la stagione stessa, la penale è ' + riga.costoSvincolo + '.'
        : 'Paghi ' + riga.costoRiscatto + ' crediti per riscattarlo, oppure '
          + riga.costoSvincolo + ' di penale e lo lasci andare.';

      tr.appendChild(tdAnno);
      tr.appendChild(tdCosto);
      tr.appendChild(tdSvincolo);
      tr.appendChild(tdSpiega);
      corpo.appendChild(tr);
    });

    // Le etichette delle schede su telefono vanno rimesse: le celle sono nuove
    if (typeof window.preparaTabelle === 'function') window.preparaTabelle();

    var ultimo = sim.anni[sim.anni.length - 1].costoRiscatto;
    totale.innerHTML =
      'Se lo tieni per tutti e quattro gli anni spendi in totale <strong>' +
      sim.costoTotale + ' crediti</strong>. Il quarto anno da solo ne costa <strong>' +
      ultimo + '</strong>, contro i ' + prezzo + ' che hai pagato all\'asta.';
  }

  input.addEventListener('input', aggiorna);

  Array.prototype.forEach.call(
    document.querySelectorAll('.preset button'),
    function (bottone) {
      bottone.addEventListener('click', function () {
        input.value = bottone.dataset.prezzo;
        aggiorna();
        input.focus();
      });
    }
  );

  aggiorna();
})();
