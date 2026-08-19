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
      tdAnno.textContent = 'Anno ' + riga.anno;

      var tdCosto = document.createElement('td');
      tdCosto.className = 'num';
      tdCosto.innerHTML = '<strong>' + riga.costoRiscatto + '</strong>';

      var tdSvincolo = document.createElement('td');
      tdSvincolo.className = 'num';
      tdSvincolo.textContent = riga.costoSvincolo;

      var tdRimanenti = document.createElement('td');
      tdRimanenti.className = 'num';
      tdRimanenti.textContent = riga.anniRimanenti;

      tr.appendChild(tdAnno);
      tr.appendChild(tdCosto);
      tr.appendChild(tdSvincolo);
      tr.appendChild(tdRimanenti);
      corpo.appendChild(tr);
    });

    var ultimo = sim.anni[sim.anni.length - 1].costoRiscatto;
    totale.innerHTML =
      'Tenerlo tutti e quattro gli anni ti costa in totale <strong>' +
      sim.costoTotale + '</strong> crediti. ' +
      'L\'ultimo anno da solo ne costa <strong>' + ultimo + '</strong>, ' +
      'contro i ' + prezzo + ' pagati all\'asta.';
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
