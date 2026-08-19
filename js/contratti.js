/*
 * contratti.js — chi è sotto contratto e quanto costa tenerlo o mollarlo.
 *
 * La pagina risponde a una domanda sola: per ogni giocatore e per ogni anno,
 * quanto pago se lo riscatto e quanto pago se lo svincolo. Tutto il resto
 * (slot, categorie, avvisi) serve a spiegare quei numeri.
 *
 * Le colonne sono ANNI SOLARI: i contratti partono in stagioni diverse e
 * vanno letti sulla stessa scala temporale.
 *
 * Nessuna formula qui dentro: costi, penali e categorie vengono da calcoli.js.
 */

(function () {
  'use strict';

  var errore = document.getElementById('errore');
  var selSquadra = document.getElementById('squadra-select');
  var selAnno = document.getElementById('anno-select');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function avvisa(html) {
    errore.innerHTML = html;
    errore.hidden = false;
  }

  if (typeof window.DATI === 'undefined' || typeof window.Calcoli === 'undefined') {
    avvisa('Dati non disponibili: manca js/dati.js oppure js/calcoli.js.');
    return;
  }

  var D = window.DATI;
  var C = window.Calcoli;

  var contratti = (D.contratti || []).filter(function (c) { return c.attivo; });
  var svincoli = D.svincoli || [];

  var nomiSquadre = {};
  (D.squadre || []).forEach(function (s) { nomiSquadre[s.id] = s.squadra; });
  function nomeSquadra(id) { return nomiSquadre[id] || ('Squadra ' + id); }

  if (!contratti.length) {
    avvisa(
      '<strong>Nessun contratto inserito.</strong><br>' +
      'Compila il foglio <em>Contratti</em> in <code>dati\\Gestione.xlsx</code>, ' +
      'poi lancia <code>aggiorna.bat</code>.'
    );
    ['sezione-tabella', 'sezione-slot', 'sezione-svincoli'].forEach(function (id) {
      document.getElementById(id).hidden = true;
    });
    document.querySelector('.filtri').hidden = true;
    document.getElementById('generato-il').textContent = D.generatoIl || '—';
    return;
  }

  // --- Anni e squadre -----------------------------------------------------

  var anniSet = {};
  contratti.forEach(function (c) {
    for (var a = c.annoInizio; a <= c.annoFine; a++) anniSet[a] = true;
  });
  var anni = Object.keys(anniSet).map(Number).sort(function (a, b) { return a - b; });

  var squadre = [];
  contratti.forEach(function (c) {
    if (squadre.indexOf(c.idSquadra) === -1) squadre.push(c.idSquadra);
  });
  squadre.sort(function (a, b) { return a - b; });

  // Con una sola squadra il selettore non serve: si mostra quella e basta.
  if (squadre.length > 1) {
    var tutte = document.createElement('option');
    tutte.value = 'tutte';
    tutte.textContent = 'Tutte le squadre';
    selSquadra.appendChild(tutte);
  }
  squadre.forEach(function (id) {
    var o = document.createElement('option');
    o.value = String(id);
    o.textContent = nomeSquadra(id);
    selSquadra.appendChild(o);
  });

  anni.forEach(function (a) {
    var o = document.createElement('option');
    o.value = String(a);
    o.textContent = String(a);
    selAnno.appendChild(o);
  });
  selAnno.value = String(anni[0]);

  // --- Calcoli di appoggio -----------------------------------------------

  /** Costo, penale, categoria ed età di un contratto per ogni anno solare. */
  function dettaglio(c) {
    var durata = c.annoFine - c.annoInizio + 1;
    var out = {};
    var precedente = null;
    for (var i = 0; i < durata; i++) {
      var anno = c.annoInizio + i;
      var cat = C.categoriaPerEta(c.annoNascita, anno);
      out[anno] = {
        riscatto: C.calcolaRiscatto(c.prezzo, i + 1),
        svincolo: C.calcolaSvincolo(c.prezzo, durata - i),
        categoria: cat,
        eta: c.annoNascita ? anno - c.annoNascita : null,
        cambiata: precedente !== null && cat !== precedente
      };
      precedente = cat;
    }
    return out;
  }

  /** Slot di una squadra in un anno, con i motivi dello sforamento. */
  function slot(idSquadra, anno) {
    var conta = { A: 0, B: 0, C: 0 };
    contratti.forEach(function (c) {
      if (c.idSquadra !== idSquadra) return;
      if (anno < c.annoInizio || anno > c.annoFine) return;
      conta[C.categoriaPerEta(c.annoNascita, anno)] += 1;
    });
    var ab = conta.A + conta.B;
    var motivi = [];
    if (conta.A > C.MAX_CATEGORIA_A) {
      motivi.push(conta.A + ' giocatori in categoria A, il massimo è ' + C.MAX_CATEGORIA_A);
    }
    if (ab > C.MAX_A_PIU_B) {
      motivi.push(ab + ' giocatori fra A e B, il massimo è ' + C.MAX_A_PIU_B);
    }
    return { A: conta.A, B: conta.B, C: conta.C, ab: ab,
             totale: ab + conta.C, sfora: motivi.length > 0, motivi: motivi };
  }

  /** Chi ha causato lo sforamento: chi cambia categoria, o i nuovi arrivi. */
  function cause(idSquadra, anno, s) {
    var critiche = {};
    if (s.A > C.MAX_CATEGORIA_A) critiche.A = true;
    if (s.ab > C.MAX_A_PIU_B) { critiche.A = true; critiche.B = true; }

    var testi = [];
    contratti.forEach(function (c) {
      if (c.idSquadra !== idSquadra) return;
      var d = dettaglio(c)[anno];
      if (!d || !critiche[d.categoria]) return;
      if (d.cambiata) {
        var prima = dettaglio(c)[anno - 1];
        testi.push(c.giocatore + ' compie ' + d.eta + ' anni e passa da ' +
                   (prima ? prima.categoria : '?') + ' a ' + d.categoria);
      }
    });
    return testi;
  }

  function badge(cat) {
    return '<span class="badge ' + cat.toLowerCase() + '">' + cat + '</span>';
  }

  function squadreScelte() {
    return selSquadra.value === 'tutte' ? squadre : [Number(selSquadra.value)];
  }

  // --- 1. Avviso: rosso se il problema è ora, giallo se è futuro ---------

  function disegnaAvvisi(annoCorrente) {
    var contenitore = document.getElementById('avvisi');
    var ora = [];
    var futuri = [];

    squadreScelte().forEach(function (id) {
      anni.forEach(function (anno) {
        var s = slot(id, anno);
        if (!s.totale || !s.sfora) return;
        var voce = { id: id, anno: anno, motivi: s.motivi, cause: cause(id, anno, s) };
        if (anno <= annoCorrente) ora.push(voce); else futuri.push(voce);
      });
    });

    if (!ora.length && !futuri.length) {
      contenitore.innerHTML =
        '<div class="banner banner-ok">' +
          '<div class="banner-icona">✓</div>' +
          '<div><strong>Nessun problema di slot.</strong> I limiti sono ' +
          'rispettati in tutti gli anni di contratto, anche tenendo conto ' +
          'di come cambieranno le categorie.</div>' +
        '</div>';
      return;
    }

    function voci(elenco) {
      var html = '<ul class="banner-elenco">';
      elenco.forEach(function (v) {
        html += '<li><strong>' + v.anno + '</strong>' +
          (squadreScelte().length > 1 ? ' · ' + esc(nomeSquadra(v.id)) : '') +
          ' — ' + esc(v.motivi.join(' e ')) +
          (v.cause.length
            ? '<span class="banner-causa">' + esc(v.cause.join(' · ')) + '</span>'
            : '') +
          '</li>';
      });
      return html + '</ul>';
    }

    var html = '';

    if (ora.length) {
      html +=
        '<div class="banner banner-ko">' +
          '<div class="banner-icona">⚠</div>' +
          '<div>' +
            '<strong>Sei fuori dai limiti adesso.</strong>' +
            voci(ora) +
          '</div>' +
        '</div>';
    }

    if (futuri.length) {
      html +=
        '<div class="banner banner-attenzione">' +
          '<div class="banner-icona">⚠</div>' +
          '<div>' +
            '<strong>' +
              (ora.length ? 'E in futuro peggiora.' :
                'Adesso sei a posto, ma non lo resterai.') +
            '</strong>' +
            voci(futuri) +
            '<p class="banner-nota">I contratti già firmati restano validi: ' +
            'il regolamento non agisce retroattivamente. Ma di questi ' +
            'sforamenti va tenuto conto nelle riconferme future.</p>' +
          '</div>' +
        '</div>';
    }

    contenitore.innerHTML = html;
  }

  // --- 2. La tabella principale ------------------------------------------

  function disegnaTabella(annoCorrente) {
    var contenitore = document.getElementById('tabella');
    var elenco = squadreScelte();
    var html = '';

    elenco.forEach(function (id) {
      var suoi = contratti.filter(function (c) { return c.idSquadra === id; });
      if (!suoi.length) return;

      // Quali anni interessano questa squadra
      var suoiAnni = anni.filter(function (a) {
        return suoi.some(function (c) { return a >= c.annoInizio && a <= c.annoFine; });
      });

      var intestazioni = '';
      suoiAnni.forEach(function (a) {
        var s = slot(id, a);
        var classi = [];
        if (a === annoCorrente) classi.push('col-ora');
        if (s.sfora) classi.push('col-ko');
        intestazioni +=
          '<th class="' + classi.join(' ') + '">' + a +
            (a === annoCorrente ? '<span class="th-nota">in corso</span>' : '') +
            (s.sfora ? '<span class="th-nota">⚠ slot</span>' : '') +
          '</th>';
      });

      var righe = '';
      suoi.sort(function (a, b) { return b.prezzo - a.prezzo; }).forEach(function (c) {
        var d = dettaglio(c);
        var celle = '';
        suoiAnni.forEach(function (anno) {
          var v = d[anno];
          if (!v) { celle += '<td class="cella-vuota">—</td>'; return; }
          var s = slot(id, anno);
          var classi = ['cella-anno'];
          if (anno === annoCorrente) classi.push('col-ora');
          if (s.sfora) classi.push('col-ko');
          celle +=
            '<td class="' + classi.join(' ') + '">' +
              '<div class="scelta scelta-tieni">' +
                '<span>riscatti</span><b>' + v.riscatto + '</b></div>' +
              '<div class="scelta scelta-molli">' +
                '<span>svincoli</span><b>' + v.svincolo + '</b></div>' +
              '<div class="scelta-cat">' + badge(v.categoria) +
                (v.eta === null ? '' : ' ' + v.eta + ' anni') +
                (v.cambiata ? '<span class="cat-cambio">cambio</span>' : '') +
              '</div>' +
            '</td>';
        });

        righe +=
          '<tr>' +
            '<td class="cella-nome"><strong>' + esc(c.giocatore) + '</strong>' +
              '<span class="meta">preso a ' + c.prezzo + ' nel ' + c.annoInizio +
              (c.annoNascita ? ' · nato ' + c.annoNascita : '') + '</span></td>' +
            celle +
          '</tr>';
      });

      // Totali: quanto costa tenerli tutti, quanto costa mollarli tutti
      var totTieni = '', totMolli = '';
      suoiAnni.forEach(function (anno) {
        var t = 0, m = 0;
        suoi.forEach(function (c) {
          var v = dettaglio(c)[anno];
          if (v) { t += v.riscatto; m += v.svincolo; }
        });
        totTieni += '<td class="num"><strong>' + t + '</strong></td>';
        totMolli += '<td class="num">' + m + '</td>';
      });

      html +=
        (elenco.length > 1 ? '<h3>' + esc(nomeSquadra(id)) + '</h3>' : '') +
        '<div class="table-wrap"><table class="tab-contratti">' +
          '<thead><tr><th>Giocatore</th>' + intestazioni + '</tr></thead>' +
          '<tbody>' + righe + '</tbody>' +
          '<tfoot>' +
            '<tr><td>Se li riscatti tutti</td>' + totTieni + '</tr>' +
            '<tr><td>Se li svincoli tutti</td>' + totMolli + '</tr>' +
          '</tfoot>' +
        '</table></div>';
    });

    contenitore.innerHTML = html || '<p class="nota-tabella">Nessun contratto.</p>';
  }

  // --- 3. Dettaglio slot: spiega gli anni in rosso -----------------------

  function disegnaSlot(annoCorrente) {
    var contenitore = document.getElementById('slot');
    var elenco = squadreScelte();
    var html = '';

    elenco.forEach(function (id) {
      var righe = '';
      anni.forEach(function (anno) {
        var s = slot(id, anno);
        if (!s.totale) return;
        righe +=
          '<tr class="' + (s.sfora ? 'riga-ko' : '') +
            (anno === annoCorrente ? ' riga-ora' : '') + '">' +
            '<td><strong>' + anno + '</strong>' +
              (anno === annoCorrente ? ' <span class="badge b">in corso</span>' : '') + '</td>' +
            '<td class="num' + (s.A > C.MAX_CATEGORIA_A ? ' ko' : '') + '">' +
              s.A + '/' + C.MAX_CATEGORIA_A + '</td>' +
            '<td class="num">' + s.B + '</td>' +
            '<td class="num">' + s.C + '</td>' +
            '<td class="num' + (s.ab > C.MAX_A_PIU_B ? ' ko' : '') + '">' +
              s.ab + '/' + C.MAX_A_PIU_B + '</td>' +
            '<td>' + (s.sfora
              ? '<span class="ko">' + esc(s.motivi.join(' · ')) + '</span>'
              : '<span class="ok-muto">nei limiti</span>') + '</td>' +
          '</tr>';
      });
      if (!righe) return;
      html +=
        (elenco.length > 1 ? '<h3>' + esc(nomeSquadra(id)) + '</h3>' : '') +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th>Anno</th><th class="num">A</th><th class="num">B</th>' +
          '<th class="num">C</th><th class="num">A+B</th><th>Esito</th>' +
        '</tr></thead><tbody>' + righe + '</tbody></table></div>';
    });

    contenitore.innerHTML = html;
  }

  // --- 4. Svincoli --------------------------------------------------------

  function disegnaSvincoli() {
    var sezione = document.getElementById('sezione-svincoli');
    var elenco = svincoli.filter(function (s) {
      return selSquadra.value === 'tutte' || s.idSquadra === Number(selSquadra.value);
    });

    if (!elenco.length) {
      sezione.hidden = true;
      return;
    }
    sezione.hidden = false;

    var righe = '';
    var perAnno = {};
    elenco.forEach(function (s) {
      righe +=
        '<tr>' +
          '<td><strong>' + esc(s.giocatore) + '</strong>' +
            (s.note ? '<span class="meta">' + esc(s.note) + '</span>' : '') + '</td>' +
          '<td>' + esc(nomeSquadra(s.idSquadra)) + '</td>' +
          '<td class="num">' + s.anno + '</td>' +
          '<td class="num"><span class="ko">−' + s.penale + '</span>' +
            (s.penaleForzata ? '<span class="meta">forzata a mano</span>' : '') + '</td>' +
        '</tr>';
      perAnno[s.anno] = (perAnno[s.anno] || 0) + s.penale;
    });

    var voci = Object.keys(perAnno).map(Number).sort().map(function (a) {
      return 'asta ' + a + ': <strong class="ko">−' + perAnno[a] + '</strong>';
    }).join(' · ');

    document.getElementById('svincoli').innerHTML =
      '<div class="table-wrap"><table><thead><tr>' +
        '<th>Giocatore</th><th>Squadra</th><th class="num">Anno</th>' +
        '<th class="num">Penale</th>' +
      '</tr></thead><tbody>' + righe + '</tbody></table></div>' +
      '<p class="nota-tabella">Crediti da togliere: ' + voci + '.</p>';
  }

  // --- Avvio --------------------------------------------------------------

  function aggiorna() {
    var anno = Number(selAnno.value);
    disegnaAvvisi(anno);
    disegnaTabella(anno);
    disegnaSlot(anno);
    disegnaSvincoli();
    if (typeof window.preparaTabelle === 'function') window.preparaTabelle();
  }

  selSquadra.addEventListener('change', aggiorna);
  selAnno.addEventListener('change', aggiorna);

  document.getElementById('generato-il').textContent = D.generatoIl || '—';
  aggiorna();
})();
