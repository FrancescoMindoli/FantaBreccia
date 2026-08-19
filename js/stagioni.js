/*
 * stagioni.js — medagliere storico e risultati stagione per stagione.
 *
 * La pagina si legge dall'alto: prima il medagliere, che riassume tutta la
 * storia della lega in una classifica; poi si sceglie una stagione, e da lì
 * in giù è tutto relativo a quella.
 *
 * Non calcola nulla: medagliere, albo d'oro e budget arrivano già pronti da
 * js/dati.js, prodotto da strumenti/genera_dati.py.
 */

(function () {
  'use strict';

  var errore = document.getElementById('errore');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (typeof window.DATI === 'undefined') {
    errore.textContent =
      'Dati non disponibili: manca js/dati.js. Va generato con ' +
      'strumenti/genera_dati.py a partire da Gestione.xlsx.';
    errore.hidden = false;
    return;
  }

  var D = window.DATI;
  var albo = (D.alboDoro || {}).perAnno || [];
  var medagliere = (D.alboDoro || {}).medagliere || [];
  var stagioni = D.stagioni || [];

  var allenatori = {};
  (D.squadre || []).forEach(function (s) { allenatori[s.id] = s.allenatore; });

  var MEDAGLIE = { 1: '🥇', 2: '🥈', 3: '🥉' };

  function nomeSquadra(id, anno, ripiego) {
    var perAnno = D.nomiPerAnno[anno];
    if (perAnno && perAnno[id]) return perAnno[id];
    if (ripiego) return ripiego;
    var s = (D.squadre || []).filter(function (x) { return x.id === id; })[0];
    return s ? s.squadra : '—';
  }

  function numero(v) { return (v === null || v === undefined) ? '—' : String(v); }

  function segnato(v) {
    if (v === null || v === undefined) return '—';
    if (v > 0) return '<span class="pos">+' + v + '</span>';
    if (v < 0) return '<span class="neg">' + v + '</span>';
    return '0';
  }

  // --- 1. Medagliere ------------------------------------------------------

  function disegnaMedagliere() {
    var contenitore = document.getElementById('medagliere');

    if (!medagliere.length) {
      contenitore.innerHTML =
        '<p class="nota-tabella">Nessuna stagione conclusa: il medagliere ' +
        'si popola da solo appena compili una classifica.</p>';
      return;
    }

    var righe = '';
    medagliere.forEach(function (m) {
      righe +=
        '<tr' + (m.posizione <= 3 ? ' data-pos="' + m.posizione + '"' : '') + '>' +
          '<td class="num">' + m.posizione + '</td>' +
          '<td><strong>' + esc(m.squadra) + '</strong>' +
            '<span class="meta">' + esc(allenatori[m.id] || '') + '</span></td>' +
          '<td class="num medaglia-oro">' + m.ori + '</td>' +
          '<td class="num medaglia-argento">' + m.argenti + '</td>' +
          '<td class="num medaglia-bronzo">' + m.bronzi + '</td>' +
          '<td class="num">' + m.coppe + '</td>' +
          '<td class="num">' + m.punteggio + '</td>' +
        '</tr>';
    });

    contenitore.innerHTML =
      '<div class="table-wrap"><table><thead><tr>' +
        '<th class="num">#</th><th>Squadra</th>' +
        '<th class="num">🥇</th><th class="num">🥈</th><th class="num">🥉</th>' +
        '<th class="num">🏆</th><th class="num">Punti totali</th>' +
      '</tr></thead><tbody>' + righe + '</tbody></table></div>';
  }

  // --- 2. Filtro dell'anno ------------------------------------------------

  function disegnaFiltro(annoScelto) {
    var contenitore = document.getElementById('anno-scelte');
    contenitore.innerHTML = '';
    stagioni.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = (String(s.anno) === String(annoScelto) ? 'attivo' : '') +
                    (s.giocata ? '' : ' anno-futuro');
      b.textContent = String(s.anno);
      if (!s.giocata) {
        var nota = document.createElement('span');
        nota.textContent = 'da giocare';
        b.appendChild(nota);
      }
      b.addEventListener('click', function () { mostra(String(s.anno)); });
      contenitore.appendChild(b);
    });
  }

  // --- 3. La stagione scelta ----------------------------------------------

  function disegnaStagione(anno) {
    var contenitore = document.getElementById('stagione');
    var classifica = D.classifiche[anno] || [];
    var coppa = D.coppa[anno] || [];
    var budget = (D.budget || {})[anno] || [];
    var edizione = albo.filter(function (v) { return String(v.anno) === String(anno); })[0];

    var html = '<h2>Stagione ' + anno + '</h2>';

    if (!classifica.length && !coppa.length && !budget.length) {
      contenitore.innerHTML = html +
        '<p class="nota-tabella">Nessun dato per questa stagione.</p>';
      return;
    }

    // Il campione dell'anno scelto, in evidenza
    if (edizione && edizione.campione) {
      html +=
        '<div class="vetrina">' +
          '<div class="vetrina-coppa">🏆</div>' +
          '<div>' +
            '<div class="vetrina-etichetta">Campione ' + anno + '</div>' +
            '<div class="vetrina-nome">' + esc(edizione.campione.squadra) + '</div>' +
            '<div class="vetrina-meta">' +
              esc(allenatori[edizione.campione.id] || '') +
              (edizione.campione.punteggio != null
                ? ' · ' + edizione.campione.punteggio + ' punti' : '') +
              (edizione.coppa
                ? ' · coppa a ' + esc(edizione.coppa.squadra) : '') +
            '</div>' +
          '</div>' +
        '</div>';
    }

    if (!classifica.length) {
      html +=
        '<div class="banner banner-attenzione">' +
          '<div class="banner-icona">⏳</div>' +
          '<div><strong>Stagione non ancora giocata.</strong> ' +
          'Classifica e coppa compariranno quando compilerai i fogli ' +
          '<em>Classifiche</em> e <em>Coppa</em>. Qui sotto trovi i crediti ' +
          'con cui ogni squadra si presenta all\'asta.</div>' +
        '</div>';
    }

    if (classifica.length) {
      var righe = '';
      classifica.forEach(function (r) {
        righe +=
          '<tr' + (r.posizione ? ' data-pos="' + r.posizione + '"' : '') + '>' +
            '<td class="num">' + (MEDAGLIE[r.posizione] || '') + ' ' +
              numero(r.posizione) + '</td>' +
            '<td><strong>' + esc(nomeSquadra(r.id, anno, r.squadra)) + '</strong>' +
              (r.migliorPunteggio
                ? ' <span class="badge c">miglior punteggio</span>' : '') + '</td>' +
            '<td>' + esc(allenatori[r.id] || '—') + '</td>' +
            '<td class="num">' + numero(r.punteggio) + '</td>' +
          '</tr>';
      });
      html +=
        '<h3>Classifica</h3>' +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th class="num">Pos.</th><th>Squadra</th><th>Allenatore</th>' +
          '<th class="num">Punteggio</th>' +
        '</tr></thead><tbody>' + righe + '</tbody></table></div>';

      var conPunteggio = classifica.filter(function (r) { return r.punteggio != null; });
      if (conPunteggio.length > 1) {
        var top = conPunteggio.slice().sort(function (a, b) {
          return b.punteggio - a.punteggio;
        })[0];
        if (top.posizione !== 1) {
          html += '<p class="nota-tabella">La classifica segue i punti di ' +
            'campionato, non il totale dei fantapunti: il punteggio più alto ' +
            'della stagione è di ' + esc(top.squadra) + ' (' + top.punteggio + ').</p>';
        }
      }
    }

    if (coppa.length) {
      var rc = '';
      coppa.forEach(function (r) {
        rc +=
          '<tr' + (r.posizione ? ' data-pos="' + r.posizione + '"' : '') + '>' +
            '<td class="num">' + (MEDAGLIE[r.posizione] || '') + ' ' +
              numero(r.posizione) + '</td>' +
            '<td><strong>' + esc(nomeSquadra(r.id, anno, r.squadra)) + '</strong></td>' +
            '<td>' + esc(allenatori[r.id] || '—') + '</td>' +
          '</tr>';
      });
      html +=
        '<h3>Coppa</h3>' +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th class="num">Pos.</th><th>Squadra</th><th>Allenatore</th>' +
        '</tr></thead><tbody>' + rc + '</tbody></table></div>';
    }

    if (budget.length) {
      var rb = '';
      budget.forEach(function (b) {
        rb +=
          '<tr>' +
            '<td><strong>' + esc(nomeSquadra(b.id, anno, b.squadra)) + '</strong></td>' +
            '<td class="num">' + numero(b.residui) + '</td>' +
            '<td class="num">' + segnato(b.campionato) + '</td>' +
            '<td class="num">' + segnato(b.coppa) + '</td>' +
            '<td class="num">' + segnato(b.punteggio) + '</td>' +
            '<td class="num">' + (b.totale == null
              ? '—' : '<strong>' + b.totale + '</strong>') + '</td>' +
          '</tr>';
      });
      html +=
        '<h3>Crediti portati all\'asta ' + anno + '</h3>' +
        '<p class="nota-tabella">Ricavati dalla stagione ' + budget[0].daStagione +
          ': crediti avanzati più premi e malus ' +
          '(<a href="regolamento.html#s12">regolamento § 12–17</a>).</p>' +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th>Squadra</th><th class="num">Avanzati</th>' +
          '<th class="num">Campionato</th><th class="num">Coppa</th>' +
          '<th class="num">Punteggio</th><th class="num">Totale asta</th>' +
        '</tr></thead><tbody>' + rb + '</tbody></table></div>';
    }

    contenitore.innerHTML = html;
  }

  // --- Avvio ---------------------------------------------------------------

  function mostra(anno) {
    disegnaFiltro(anno);
    disegnaStagione(anno);
    if (typeof window.preparaTabelle === 'function') window.preparaTabelle();
  }

  disegnaMedagliere();

  if (!stagioni.length) {
    document.getElementById('sezione-filtro').hidden = true;
    document.getElementById('sezione-stagione').hidden = true;
  } else {
    mostra(String(stagioni[0].anno));
  }

  document.getElementById('generato-il').textContent = D.generatoIl || '—';
})();
