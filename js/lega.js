/*
 * lega.js — mostra i dati di js/dati.js.
 * Non calcola nulla: riporta quello che c'è nel foglio di gestione.
 */

(function () {
  'use strict';

  var errore = document.getElementById('errore');

  if (typeof window.DATI === 'undefined') {
    errore.textContent =
      'Dati non disponibili: manca js/dati.js. Va generato con ' +
      'strumenti/genera_dati.py a partire da Gestione.xlsx.';
    errore.hidden = false;
    return;
  }

  var D = window.DATI;
  var MEDAGLIE = { 1: '🥇', 2: '🥈', 3: '🥉' };

  // Mappa id -> allenatore, per non ripetere la ricerca a ogni riga
  var allenatori = {};
  D.squadre.forEach(function (s) { allenatori[s.id] = s.allenatore; });

  function allenatoreDi(id) {
    return allenatori[id] || '—';
  }

  /** Nome della squadra nell'anno indicato, con ripiego sull'anagrafica. */
  function nomeSquadra(id, anno, ripiego) {
    var perAnno = D.nomiPerAnno[anno];
    if (perAnno && perAnno[id]) return perAnno[id];
    if (ripiego) return ripiego;
    var s = D.squadre.filter(function (x) { return x.id === id; })[0];
    return s ? s.squadra : '—';
  }

  function cella(testo, classe) {
    var td = document.createElement('td');
    if (classe) td.className = classe;
    td.textContent = testo;
    return td;
  }

  function numeroOTrattino(valore) {
    return (valore === null || valore === undefined) ? '—' : String(valore);
  }

  function svuota(elemento) {
    while (elemento.firstChild) elemento.removeChild(elemento.firstChild);
  }

  function mostraSezione(id, visibile) {
    document.getElementById(id).hidden = !visibile;
  }

  // --- Le quattro tabelle ------------------------------------------------

  function disegnaClassifica(anno) {
    var corpo = document.getElementById('classifica-corpo');
    var nota = document.getElementById('nota-classifica');
    var righe = D.classifiche[anno] || [];
    svuota(corpo);
    nota.textContent = '';

    mostraSezione('sezione-classifica', righe.length > 0);
    if (!righe.length) return;

    righe.forEach(function (r) {
      var tr = document.createElement('tr');
      if (r.posizione) tr.setAttribute('data-pos', String(r.posizione));

      var pos = document.createElement('td');
      pos.className = 'num';
      pos.textContent = (MEDAGLIE[r.posizione] || '') + ' ' + numeroOTrattino(r.posizione);

      var squadra = document.createElement('td');
      squadra.innerHTML = '<strong>' + nomeSquadra(r.id, anno, r.squadra) + '</strong>';
      if (r.migliorPunteggio) {
        squadra.innerHTML += ' <span class="badge c">miglior punteggio</span>';
      }

      tr.appendChild(pos);
      tr.appendChild(squadra);
      tr.appendChild(cella(allenatoreDi(r.id)));
      tr.appendChild(cella(numeroOTrattino(r.punteggio), 'num'));
      corpo.appendChild(tr);
    });

    // La classifica è per punti di campionato, non per fantapunti totali:
    // senza questa nota la tabella sembra ordinata male.
    var conPunteggio = righe.filter(function (r) { return r.punteggio != null; });
    if (conPunteggio.length > 1) {
      var ordinatePerPunteggio = conPunteggio.slice().sort(function (a, b) {
        return b.punteggio - a.punteggio;
      });
      if (ordinatePerPunteggio[0].posizione !== 1) {
        nota.textContent =
          'La classifica segue i punti di campionato, non il totale dei fantapunti: ' +
          'il punteggio più alto della stagione è di ' +
          ordinatePerPunteggio[0].squadra + ' (' + ordinatePerPunteggio[0].punteggio + ').';
      }
    }
  }

  function disegnaCoppa(anno) {
    var corpo = document.getElementById('coppa-corpo');
    var righe = D.coppa[anno] || [];
    svuota(corpo);

    mostraSezione('sezione-coppa', righe.length > 0);
    if (!righe.length) return;

    righe.forEach(function (r) {
      var tr = document.createElement('tr');
      if (r.posizione) tr.setAttribute('data-pos', String(r.posizione));
      var pos = document.createElement('td');
      pos.className = 'num';
      pos.textContent = (MEDAGLIE[r.posizione] || '') + ' ' + numeroOTrattino(r.posizione);
      tr.appendChild(pos);
      tr.appendChild(cella(nomeSquadra(r.id, anno, r.squadra)));
      tr.appendChild(cella(allenatoreDi(r.id)));
      corpo.appendChild(tr);
    });
  }

  function disegnaCrediti(anno) {
    var corpo = document.getElementById('crediti-corpo');
    var residui = D.creditiResidui[anno] || {};
    var nuovi = D.creditiAnnoNuovo[anno] || [];
    svuota(corpo);

    // Unisce le due fonti sull'id squadra
    var perId = {};
    Object.keys(residui).forEach(function (id) {
      perId[id] = { id: Number(id), residui: residui[id].crediti };
    });
    nuovi.forEach(function (r) {
      var v = perId[r.id] || (perId[r.id] = { id: r.id });
      v.campionato = r.campionato;
      v.coppa = r.coppa;
      v.punteggio = r.punteggio;
      v.totale = r.totale;
      v.squadra = r.squadra;
    });

    var righe = Object.keys(perId)
      .map(function (k) { return perId[k]; })
      .sort(function (a, b) { return a.id - b.id; });

    mostraSezione('sezione-crediti', righe.length > 0);
    if (!righe.length) return;

    righe.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.appendChild(cella(nomeSquadra(r.id, anno, r.squadra)));
      tr.appendChild(cella(numeroOTrattino(r.residui), 'num'));
      tr.appendChild(cella(numeroOTrattino(r.campionato), 'num'));
      tr.appendChild(cella(numeroOTrattino(r.coppa), 'num'));
      tr.appendChild(cella(numeroOTrattino(r.punteggio), 'num'));

      var totale = document.createElement('td');
      totale.className = 'num';
      totale.innerHTML = r.totale == null
        ? '—'
        : '<strong>' + r.totale + '</strong>';
      tr.appendChild(totale);

      corpo.appendChild(tr);
    });
  }

  function disegnaSquadre(anno) {
    var corpo = document.getElementById('squadre-corpo');
    svuota(corpo);

    mostraSezione('sezione-squadre', D.squadre.length > 0);

    D.squadre.forEach(function (s) {
      // L'ID è un identificativo interno del foglio di gestione: non dice
      // nulla a chi legge, quindi non compare.
      var tr = document.createElement('tr');
      var nome = document.createElement('td');
      nome.innerHTML = '<strong>' + nomeSquadra(s.id, anno, s.squadra) + '</strong>';
      tr.appendChild(nome);
      tr.appendChild(cella(s.allenatore || '—'));
      corpo.appendChild(tr);
    });
  }

  function mostraAnno(anno) {
    disegnaClassifica(anno);
    disegnaCoppa(anno);
    disegnaCrediti(anno);
    disegnaSquadre(anno);

    // Rimette le etichette sulle celle appena create, così su telefono le
    // tabelle restano schede anche dopo un cambio di stagione.
    // Al primo giro tabelle.js non è ancora caricato: ci pensa lui da solo.
    if (typeof window.preparaTabelle === 'function') window.preparaTabelle();

    Array.prototype.forEach.call(
      document.querySelectorAll('#anno-scelte button'),
      function (b) {
        b.classList.toggle('attivo', b.dataset.anno === String(anno));
      }
    );
  }

  // --- Avvio -------------------------------------------------------------

  var anni = D.anni || [];

  if (!anni.length) {
    errore.textContent = 'Nessuna stagione presente nel foglio di gestione.';
    errore.hidden = false;
    ['sezione-classifica', 'sezione-coppa', 'sezione-crediti'].forEach(function (s) {
      mostraSezione(s, false);
    });
    disegnaSquadre(null);
  } else {
    if (anni.length > 1) {
      var contenitore = document.getElementById('anno-scelte');
      anni.forEach(function (anno) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.anno = String(anno);
        b.textContent = String(anno);
        b.addEventListener('click', function () { mostraAnno(String(anno)); });
        contenitore.appendChild(b);
      });
      document.getElementById('selettore-anno').hidden = false;
    }
    mostraAnno(String(anni[0]));
  }

  document.getElementById('generato-il').textContent = D.generatoIl || '—';
})();
