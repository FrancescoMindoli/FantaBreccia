/*
 * simulatore.js — solo interfaccia.
 * Le formule stanno in calcoli.js e non vanno duplicate qui.
 *
 * Il risultato si aggiorna mentre scrivi; il pulsante "Calcola" serve a
 * chiudere la tastiera sul telefono e a portare gli occhi sul risultato.
 */

(function () {
  'use strict';

  var form = document.getElementById('sim-form');
  var input = document.getElementById('prezzo');
  var fasciaValore = document.getElementById('fascia-valore');
  var fasciaDesc = document.getElementById('fascia-desc');
  var anniBox = document.getElementById('anni');
  var totale = document.getElementById('totale');
  var errore = document.getElementById('errore');
  var risultati = document.getElementById('risultati');

  var DESCRIZIONI = {
    0: 'I giocatori pagati 1 credito costano 1 per tutti e quattro gli anni: il costo non cresce mai.',
    10: 'Fascia da 2 a 49 crediti: ogni anno costa il 10% in più del precedente.',
    15: 'Fascia da 50 a 99 crediti: ogni anno costa il 15% in più del precedente.',
    20: 'Fascia da 100 a 299 crediti: ogni anno costa il 20% in più del precedente.',
    30: 'Fascia da 300 crediti in su: ogni anno costa il 30% in più del precedente.'
  };

  /** Sottotitolo della scheda: che momento è, questo anno. */
  function quando(anno) {
    if (anno === 1) return 'l\'anno in cui lo riconfermi';
    if (anno === 2) return 'la seconda asta da allora';
    if (anno === 3) return 'la terza asta';
    return 'l\'ultima asta del contratto';
  }

  /** La frase che spiega la scelta di quell'anno. */
  function spiegazione(riga, prezzo) {
    if (riga.anno === 1) {
      return 'Firmi il contratto e paghi <strong>' + riga.costoRiscatto +
        '</strong>. Se cambi idea durante la stagione stessa, lo lasci andare ' +
        'pagando <strong>' + riga.costoSvincolo + '</strong> di penale.';
    }
    return 'Paghi <strong>' + riga.costoRiscatto + '</strong> per tenerlo ' +
      'un altro anno, oppure <strong>' + riga.costoSvincolo + '</strong> di ' +
      'penale e lo lasci andare.';
  }

  function mostraErrore(messaggio) {
    risultati.hidden = true;
    errore.textContent = messaggio;
    errore.hidden = false;
  }

  function aggiorna() {
    var grezzo = input.value.trim();

    if (grezzo === '') {
      mostraErrore('Scrivi il prezzo pagato all\'asta per vedere il calcolo.');
      return;
    }

    var prezzo = Number(grezzo);

    if (!Number.isFinite(prezzo)) {
      mostraErrore('Scrivi un numero valido.');
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

    // Una scheda per anno. I due numeri stanno in una griglia a colonne fisse,
    // così riscatto e svincolo restano incolonnati fra loro e fra le schede.
    var html = '';
    sim.anni.forEach(function (riga) {
      html +=
        '<article class="anno-card">' +
          '<header class="anno-card-testa">' +
            '<span class="anno-card-num">Anno ' + riga.anno + '</span>' +
            '<span class="anno-card-quando">' + quando(riga.anno) + '</span>' +
          '</header>' +

          '<div class="scelte">' +
            '<div class="scelta scelta-tieni">' +
              '<span class="scelta-etichetta">Lo riscatti</span>' +
              '<span class="scelta-num">' + riga.costoRiscatto + '</span>' +
              '<span class="scelta-unita">' +
                (riga.costoRiscatto === 1 ? 'credito' : 'crediti') + '</span>' +
            '</div>' +
            '<div class="scelta scelta-molli">' +
              '<span class="scelta-etichetta">Lo svincoli</span>' +
              '<span class="scelta-num">' + riga.costoSvincolo + '</span>' +
              '<span class="scelta-unita">di penale</span>' +
            '</div>' +
          '</div>' +

          '<p class="anno-card-spiega">' + spiegazione(riga, prezzo) + '</p>' +

          '<p class="anno-card-nota">' + riga.anniRimanenti +
            (riga.anniRimanenti === 1 ? ' anno' : ' anni') +
            ' di contratto ancora da fare</p>' +
        '</article>';
    });
    anniBox.innerHTML = html;

    var ultimo = sim.anni[sim.anni.length - 1].costoRiscatto;
    totale.innerHTML =
      'Se lo tieni per tutti e quattro gli anni spendi in totale <strong>' +
      sim.costoTotale + ' crediti</strong>. Il quarto anno da solo ne costa ' +
      '<strong>' + ultimo + '</strong>, contro i ' + prezzo +
      ' che hai pagato all\'asta.';
  }

  // Aggiornamento continuo mentre si scrive
  input.addEventListener('input', aggiorna);

  // "Calcola" (e il tasto Invio della tastiera) chiudono la tastiera e
  // portano il risultato sotto gli occhi. Il calcolo è già aggiornato.
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    aggiorna();
    input.blur();
    if (!risultati.hidden && risultati.scrollIntoView) {
      risultati.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  Array.prototype.forEach.call(
    document.querySelectorAll('.preset button'),
    function (bottone) {
      bottone.addEventListener('click', function () {
        input.value = bottone.dataset.prezzo;
        aggiorna();
      });
    }
  );

  aggiorna();
})();
