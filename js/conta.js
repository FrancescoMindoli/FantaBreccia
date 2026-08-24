/*
 * conta.js — conteggio visite.
 *
 * Manda un ping a un'app web di Google Apps Script, che aggiunge una riga
 * a un foglio di calcolo: data, pagina, provenienza, tipo di dispositivo.
 * Non ci sono cookie e non si identifica nessuno: sono visite, non persone.
 *
 * Il ping e' volutamente silenzioso. Se Google non risponde, se la rete
 * manca o se un blocco pubblicita' lo ferma, la pagina non se ne accorge:
 * il conteggio e' un di piu', non deve mai rompere il sito.
 */

(function () {
  'use strict';

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzjT85UttZTM-EAcap6WzjlSmOrGp-pBlYgpi19GdBRJNEa807R6shEcWt8jEFBR51znA/exec';

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

  function invia() {
    var dati = JSON.stringify({
      pagina: pagina(),
      referrer: document.referrer,
      dispositivo: window.innerWidth < LARGHEZZA_TELEFONO ? 'telefono' : 'desktop'
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

  if (daContare()) invia();
})();
