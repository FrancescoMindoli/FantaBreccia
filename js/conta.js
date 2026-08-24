/*
 * conta.js — conteggio visite.
 *
 * Manda un ping a un'app web di Google Apps Script, che aggiunge una riga
 * a un foglio di calcolo privato: data, pagina, provenienza, dispositivo,
 * indirizzo di rete, paese e un identificativo casuale del browser.
 *
 * L'identificativo non e' un nome: e' un numero a caso generato la prima
 * volta e tenuto nel browser. Serve a distinguere "dieci visite da due
 * dispositivi" da "dieci visite da dieci dispositivi", niente di piu'.
 *
 * Il ping e' volutamente silenzioso. Se qualcosa non risponde, se la rete
 * manca o se un blocco pubblicita' lo ferma, la pagina non se ne accorge:
 * il conteggio e' un di piu', non deve mai rompere il sito.
 */

(function () {
  'use strict';

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzjT85UttZTM-EAcap6WzjlSmOrGp-pBlYgpi19GdBRJNEa807R6shEcWt8jEFBR51znA/exec';

  // Cloudflare risponde in testo semplice con "ip=..." e "loc=..." su righe
  // separate. Nessuna chiave, nessun limite di chiamate.
  var TRACCIA = 'https://www.cloudflare.com/cdn-cgi/trace';

  var CHIAVE_ID = 'fb_id';
  var LARGHEZZA_TELEFONO = 640;

  // Aperture da file locale o da localhost sono prove di sviluppo:
  // sporcherebbero le statistiche senza dire niente di utile.
  function daContare() {
    var host = location.hostname;
    return location.protocol.indexOf('http') === 0 &&
           host !== 'localhost' &&
           host !== '127.0.0.1';
  }

  function pagina() {
    var p = location.pathname;
    var ultimo = p.substring(p.lastIndexOf('/') + 1);
    return ultimo || 'index.html';
  }

  /* Identificativo casuale del browser, creato una volta sola.
     Se il browser blocca la memoria locale si torna a stringa vuota: una
     riga senza identificativo vale comunque come visita. */
  function identificativo() {
    try {
      var id = localStorage.getItem(CHIAVE_ID);
      if (!id) {
        id = Math.random().toString(36).slice(2, 10);
        localStorage.setItem(CHIAVE_ID, id);
      }
      return id;
    } catch (err) {
      return '';
    }
  }

  function invia(ip, paese) {
    var dati = JSON.stringify({
      pagina: pagina(),
      referrer: document.referrer,
      dispositivo: window.innerWidth < LARGHEZZA_TELEFONO ? 'telefono' : 'desktop',
      ip: ip || '',
      paese: paese || '',
      id: identificativo()
    });

    try {
      // sendBeacon sopravvive alla chiusura della pagina: se uno apre e
      // chiude subito, il ping parte lo stesso.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, dati);
        return;
      }

      fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: dati });
    } catch (err) {
      // Silenzio: un conteggio mancato non e' un problema dell'utente.
    }
  }

  function leggiCampo(testo, nome) {
    var righe = testo.split('\n');
    for (var i = 0; i < righe.length; i++) {
      if (righe[i].indexOf(nome + '=') === 0) {
        return righe[i].slice(nome.length + 1);
      }
    }
    return '';
  }

  /* Prima si chiede l'indirizzo, poi si manda la riga. Se la richiesta
     fallisce si manda comunque la visita, solo senza IP: meglio un dato
     mancante che una visita persa. */
  function avvia() {
    if (!daContare()) return;

    try {
      fetch(TRACCIA)
        .then(function (r) { return r.text(); })
        .then(function (testo) {
          invia(leggiCampo(testo, 'ip'), leggiCampo(testo, 'loc'));
        })
        .catch(function () { invia('', ''); });
    } catch (err) {
      invia('', '');
    }
  }

  avvia();
})();
