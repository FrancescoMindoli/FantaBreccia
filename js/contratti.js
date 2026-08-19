/*
 * contratti.js — contratti attivi, andamento per squadra, controllo età
 * e storico svincoli.
 *
 * Ricalca la pagina Contratti del gestionale: le colonne sono ANNI SOLARI,
 * non "anno 1..4". Serve perché i contratti partono in stagioni diverse e
 * vanno confrontati sulla stessa scala temporale.
 *
 * Nessuna formula qui dentro: costi, penali e categorie vengono da calcoli.js.
 */

(function () {
  'use strict';

  var errore = document.getElementById('errore');
  var selSquadra = document.getElementById('squadra-select');
  var selAnno = document.getElementById('anno-select');
  var ricerca = document.getElementById('ricerca');

  function avvisa(html) {
    errore.innerHTML = html;
    errore.hidden = false;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (typeof window.DATI === 'undefined' || typeof window.Calcoli === 'undefined') {
    avvisa('Dati non disponibili: manca js/dati.js oppure js/calcoli.js.');
    return;
  }

  var D = window.DATI;
  var C = window.Calcoli;

  var tutti = D.contratti || [];
  var contratti = tutti.filter(function (c) { return c.attivo; });
  var svincoli = D.svincoli || [];

  var nomiSquadre = {};
  (D.squadre || []).forEach(function (s) { nomiSquadre[s.id] = s.squadra; });
  function nomeSquadra(id) { return nomiSquadre[id] || ('Squadra ' + id); }

  // --- Stato vuoto -------------------------------------------------------

  if (!contratti.length) {
    avvisa(
      '<strong>Nessun contratto inserito.</strong><br>' +
      'Compila il foglio <em>Contratti</em> in <code>dati\\Gestione.xlsx</code>, ' +
      'poi lancia <code>aggiorna.bat</code>.'
    );
    ['sezione-slot', 'sezione-andamento', 'sezione-griglia', 'sezione-eta', 'sezione-svincoli']
      .forEach(function (id) { document.getElementById(id).hidden = true; });
    document.querySelector('.filtri').hidden = true;
    document.getElementById('generato-il').textContent = D.generatoIl || '—';
    return;
  }

  // --- Anni coperti ------------------------------------------------------

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

  // --- Filtri ------------------------------------------------------------

  var o = document.createElement('option');
  o.value = 'tutte';
  o.textContent = 'Tutte le squadre';
  selSquadra.appendChild(o);
  squadre.forEach(function (id) {
    var x = document.createElement('option');
    x.value = String(id);
    x.textContent = nomeSquadra(id);
    selSquadra.appendChild(x);
  });

  anni.forEach(function (a) {
    var x = document.createElement('option');
    x.value = String(a);
    x.textContent = String(a);
    selAnno.appendChild(x);
  });
  selAnno.value = String(anni[0]);

  // --- Calcoli di appoggio ----------------------------------------------

  /** Dettaglio di un contratto per ogni anno solare che copre. */
  function dettaglio(c) {
    var durata = c.annoFine - c.annoInizio + 1;
    var righe = {};
    var precedente = null;
    for (var i = 0; i < durata; i++) {
      var anno = c.annoInizio + i;
      var cat = C.categoriaPerEta(c.annoNascita, anno);
      righe[anno] = {
        annoContratto: i + 1,
        eta: c.annoNascita ? anno - c.annoNascita : null,
        categoria: cat,
        cambiata: precedente !== null && cat !== precedente,
        costo: C.calcolaRiscatto(c.prezzo, i + 1),
        penale: C.calcolaSvincolo(c.prezzo, durata - i)
      };
      precedente = cat;
    }
    return righe;
  }

  /** Conteggio slot di una squadra in un anno, con i motivi di sforamento. */
  function slotSquadra(idSquadra, anno) {
    var conta = { A: 0, B: 0, C: 0 };
    contratti.forEach(function (c) {
      if (c.idSquadra !== idSquadra) return;
      if (anno < c.annoInizio || anno > c.annoFine) return;
      conta[C.categoriaPerEta(c.annoNascita, anno)] += 1;
    });
    var ab = conta.A + conta.B;
    var motivi = [];
    if (conta.A > C.MAX_CATEGORIA_A) {
      motivi.push('categoria A ' + conta.A + '/' + C.MAX_CATEGORIA_A);
    }
    if (ab > C.MAX_A_PIU_B) {
      motivi.push('A+B ' + ab + '/' + C.MAX_A_PIU_B);
    }
    return { A: conta.A, B: conta.B, C: conta.C, ab: ab,
             totale: ab + conta.C, sfora: motivi.length > 0, motivi: motivi };
  }

  function badge(cat) {
    var cl = cat === 'A' ? 'a' : cat === 'B' ? 'b' : 'c';
    return '<span class="badge ' + cl + '">' + cat + '</span>';
  }

  function squadreVisibili(sel) {
    return sel === 'tutte' ? squadre : [Number(sel)];
  }

  // --- 1. Riepilogo slot dell'anno selezionato --------------------------

  function disegnaSlot(anno, sel) {
    var elenco = squadreVisibili(sel);
    var html = '';

    if (elenco.length === 1) {
      var s = slotSquadra(elenco[0], anno);
      html =
        '<div class="slot-numeri">' +
          statistica('A · over 25', s.A, C.MAX_CATEGORIA_A, s.A > C.MAX_CATEGORIA_A) +
          statistica('B · under 25', s.B, null, false) +
          statistica('C · under 21', s.C, null, false) +
          statistica('A + B', s.ab, C.MAX_A_PIU_B, s.ab > C.MAX_A_PIU_B) +
        '</div>' +
        (s.sfora
          ? '<p class="esito-ko">✗ Limite superato: ' + esc(s.motivi.join(' · ')) + '</p>'
          : '<p class="esito-ok">✓ Limiti rispettati nel ' + anno + '</p>');
    } else {
      var righe = '';
      var fuori = 0;
      elenco.forEach(function (id) {
        var s = slotSquadra(id, anno);
        if (!s.totale) return;
        if (s.sfora) fuori++;
        righe +=
          '<tr' + (s.sfora ? ' class="riga-ko"' : '') + '>' +
            '<td><strong>' + esc(nomeSquadra(id)) + '</strong></td>' +
            '<td class="num' + (s.A > C.MAX_CATEGORIA_A ? ' ko' : '') + '">' +
              s.A + '/' + C.MAX_CATEGORIA_A + '</td>' +
            '<td class="num">' + s.B + '</td>' +
            '<td class="num">' + s.C + '</td>' +
            '<td class="num' + (s.ab > C.MAX_A_PIU_B ? ' ko' : '') + '">' +
              s.ab + '/' + C.MAX_A_PIU_B + '</td>' +
            '<td>' + (s.sfora
              ? '<span class="ko">' + esc(s.motivi.join(' · ')) + '</span>'
              : '<span class="ok-muto">ok</span>') + '</td>' +
          '</tr>';
      });
      html =
        '<p class="' + (fuori ? 'esito-ko' : 'esito-ok') + '">' +
          (fuori
            ? '✗ ' + anno + ': ' + fuori + (fuori === 1 ? ' squadra fuori regola' : ' squadre fuori regola')
            : '✓ ' + anno + ': tutte le squadre rispettano i limiti') +
        '</p>' +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th>Squadra</th><th class="num">A</th><th class="num">B</th>' +
          '<th class="num">C</th><th class="num">A+B</th><th>Note</th>' +
        '</tr></thead><tbody>' + righe + '</tbody></table></div>';
    }

    document.getElementById('slot-riepilogo').innerHTML = html;
  }

  function statistica(etichetta, valore, limite, sfora) {
    return '<div class="slot-stat' + (sfora ? ' slot-stat-ko' : '') + '">' +
      '<div class="slot-valore">' + valore +
        (limite !== null ? '<span>/' + limite + '</span>' : '') + '</div>' +
      '<div class="slot-etichetta">' + etichetta + '</div>' +
    '</div>';
  }

  // --- 2. Andamento per squadra: anni, slot e costi ---------------------

  function disegnaAndamento(annoRif, sel) {
    var html = '';

    squadreVisibili(sel).forEach(function (id) {
      var suoi = contratti.filter(function (c) { return c.idSquadra === id; });
      if (!suoi.length) return;

      var righe = '';
      anni.forEach(function (anno) {
        var s = slotSquadra(id, anno);
        if (!s.totale) return;

        var costo = 0, penale = 0, quanti = 0;
        suoi.forEach(function (c) {
          var d = dettaglio(c)[anno];
          if (!d) return;
          costo += d.costo;
          penale += d.penale;
          quanti++;
        });

        righe +=
          '<tr' + (anno === annoRif ? ' class="riga-anno-rif"' : '') + '>' +
            '<td><strong>' + anno + '</strong>' +
              (anno === annoRif ? ' <span class="badge b">selezionato</span>' : '') + '</td>' +
            '<td class="num">' + quanti + '</td>' +
            '<td class="num' + (s.A > C.MAX_CATEGORIA_A ? ' ko' : '') + '">' +
              s.A + '/' + C.MAX_CATEGORIA_A + '</td>' +
            '<td class="num">' + s.B + '</td>' +
            '<td class="num">' + s.C + '</td>' +
            '<td class="num' + (s.ab > C.MAX_A_PIU_B ? ' ko' : '') + '">' +
              s.ab + '/' + C.MAX_A_PIU_B + '</td>' +
            '<td class="num">' + costo + '</td>' +
            '<td class="num">' + penale + '</td>' +
            '<td>' + (s.sfora
              ? '<span class="ko">✗ ' + esc(s.motivi.join(' · ')) + '</span>'
              : '<span class="ok-muto">✓</span>') + '</td>' +
          '</tr>';
      });

      html +=
        '<h3>' + esc(nomeSquadra(id)) + '</h3>' +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th>Anno</th><th class="num">Giocatori</th>' +
          '<th class="num">A</th><th class="num">B</th><th class="num">C</th>' +
          '<th class="num">A+B</th>' +
          '<th class="num">Costo riconferme</th><th class="num">Se svincoli tutti</th>' +
          '<th>Esito</th>' +
        '</tr></thead><tbody>' + righe + '</tbody></table></div>';
    });

    document.getElementById('andamento').innerHTML =
      html || '<p class="nota-tabella">Nessun contratto da mostrare.</p>';
  }

  // --- 3. Controllo età anno per anno ------------------------------------

  function disegnaEta(annoRif, sel, filtro) {
    var visibili = filtraContratti(sel, filtro);
    if (!visibili.length) {
      document.getElementById('eta-tabella').innerHTML =
        '<p class="nota-tabella">Nessun giocatore corrisponde ai filtri.</p>';
      return;
    }

    var intestazioni = '';
    anni.forEach(function (a) {
      intestazioni += '<th class="num' + (a === annoRif ? ' col-rif' : '') + '">' + a + '</th>';
    });

    var righe = '';
    visibili.forEach(function (c) {
      var d = dettaglio(c);
      var celle = '';
      anni.forEach(function (anno) {
        var v = d[anno];
        if (!v) { celle += '<td class="num vuota">—</td>'; return; }
        var classi = ['num'];
        if (anno === annoRif) classi.push('col-rif');
        if (v.cambiata) classi.push('cella-cambio');
        celle +=
          '<td class="' + classi.join(' ') + '">' +
            '<span class="eta">' + (v.eta === null ? '?' : v.eta) + '</span> ' +
            badge(v.categoria) +
            (v.cambiata ? '<span class="meta">cambio categoria</span>' : '') +
          '</td>';
      });

      righe +=
        '<tr>' +
          '<td><strong>' + esc(c.giocatore) + '</strong>' +
            '<span class="meta">' +
              (c.annoNascita ? 'nato nel ' + c.annoNascita : '⚠️ anno di nascita mancante') +
              ' · ' + esc(nomeSquadra(c.idSquadra)) +
            '</span></td>' +
          celle +
        '</tr>';
    });

    document.getElementById('eta-tabella').innerHTML =
      '<div class="table-wrap"><table><thead><tr><th>Giocatore</th>' +
      intestazioni + '</tr></thead><tbody>' + righe + '</tbody></table></div>';
  }

  // --- 4. Griglia dei costi ----------------------------------------------

  function filtraContratti(sel, filtro) {
    return contratti.filter(function (c) {
      if (sel !== 'tutte' && c.idSquadra !== Number(sel)) return false;
      if (filtro && c.giocatore.toLowerCase().indexOf(filtro) === -1) return false;
      return true;
    });
  }

  function disegnaGriglia(annoRif, sel, filtro) {
    var visibili = filtraContratti(sel, filtro);
    var contenitore = document.getElementById('griglia');

    if (!visibili.length) {
      contenitore.innerHTML = '<p class="nota-tabella">Nessun giocatore corrisponde ai filtri.</p>';
      return;
    }

    var intestazioni = '';
    anni.forEach(function (a) {
      var fuori = squadre.filter(function (id) { return slotSquadra(id, a).sfora; });
      intestazioni +=
        '<th class="num' + (a === annoRif ? ' col-rif' : '') +
          (fuori.length ? ' col-conflitto' : '') + '">' + a +
          (fuori.length ? '<span class="meta">⚠️ slot</span>' : '') +
        '</th>';
    });

    var righe = '';
    visibili.forEach(function (c) {
      var d = dettaglio(c);
      var celle = '';
      anni.forEach(function (anno) {
        var v = d[anno];
        if (!v) { celle += '<td class="num vuota">—</td>'; return; }
        var classi = ['num'];
        if (anno === annoRif) classi.push('col-rif');
        if (v.cambiata) classi.push('cella-cambio');
        celle +=
          '<td class="' + classi.join(' ') + '">' +
            '<span class="costo">' + v.costo + '</span> ' + badge(v.categoria) +
            '<span class="penale">svinc. ' + v.penale + '</span>' +
          '</td>';
      });

      righe +=
        '<tr>' +
          '<td><strong>' + esc(c.giocatore) + '</strong>' +
            '<span class="meta">' + esc(nomeSquadra(c.idSquadra)) +
              ' · acquisto ' + c.prezzo + ' nel ' + c.annoInizio + '</span></td>' +
          celle +
        '</tr>';
    });

    // Totali e check, come nel gestionale
    var totRiconferme = '', totSvincoli = '', check = '';
    anni.forEach(function (anno) {
      var tr = 0, ts = 0;
      visibili.forEach(function (c) {
        var v = dettaglio(c)[anno];
        if (v) { tr += v.costo; ts += v.penale; }
      });
      totRiconferme += '<td class="num"><strong>' + tr + '</strong></td>';
      totSvincoli += '<td class="num">' + ts + '</td>';

      var fuori = squadreVisibili(sel).filter(function (id) {
        return slotSquadra(id, anno).sfora;
      });
      check += fuori.length
        ? '<td class="num ko">✗<span class="meta">' +
            esc(fuori.map(function (id) {
              return nomeSquadra(id) + ': ' + slotSquadra(id, anno).motivi.join(', ');
            }).join(' · ')) + '</span></td>'
        : '<td class="num ok-muto">✓</td>';
    });

    contenitore.innerHTML =
      '<div class="table-wrap"><table><thead><tr><th>Giocatore</th>' +
      intestazioni + '</tr></thead><tbody>' + righe + '</tbody>' +
      '<tfoot>' +
        '<tr><td>Totale riconferme</td>' + totRiconferme + '</tr>' +
        '<tr><td>Totale se svincoli tutti</td>' + totSvincoli + '</tr>' +
        '<tr><td>Limiti di slot</td>' + check + '</tr>' +
      '</tfoot></table></div>';
  }

  // --- 5. Svincoli --------------------------------------------------------

  function disegnaSvincoli(sel) {
    var sezione = document.getElementById('sezione-svincoli');
    var elenco = svincoli.filter(function (s) {
      return sel === 'tutte' || s.idSquadra === Number(sel);
    });

    if (!elenco.length) {
      sezione.hidden = svincoli.length === 0;
      document.getElementById('svincoli-tabella').innerHTML =
        '<p class="nota-tabella">Nessuno svincolo registrato' +
        (sel === 'tutte' ? '.' : ' per questa squadra.') + '</p>';
      document.getElementById('svincoli-totale').innerHTML = '';
      return;
    }
    sezione.hidden = false;

    var righe = '';
    elenco.forEach(function (s) {
      righe +=
        '<tr>' +
          '<td><strong>' + esc(s.giocatore) + '</strong>' +
            (s.note ? '<span class="meta">' + esc(s.note) + '</span>' : '') + '</td>' +
          '<td>' + esc(nomeSquadra(s.idSquadra)) + '</td>' +
          '<td class="num">' + s.anno + '</td>' +
          '<td class="num">' + (s.anniRimanenti == null ? '—' : s.anniRimanenti) + '</td>' +
          '<td class="num"><span class="costo costo-ko">−' + s.penale + '</span>' +
            (s.penaleForzata ? '<span class="meta">forzata a mano</span>' : '') + '</td>' +
        '</tr>';
    });

    document.getElementById('svincoli-tabella').innerHTML =
      '<div class="table-wrap"><table><thead><tr>' +
        '<th>Giocatore</th><th>Squadra</th><th class="num">Anno</th>' +
        '<th class="num">Anni residui</th><th class="num">Penale</th>' +
      '</tr></thead><tbody>' + righe + '</tbody></table></div>';

    // Penali da togliere all'asta, raggruppate per anno e squadra
    var perAnno = {};
    elenco.forEach(function (s) {
      (perAnno[s.anno] = perAnno[s.anno] || {});
      perAnno[s.anno][s.idSquadra] = (perAnno[s.anno][s.idSquadra] || 0) + s.penale;
    });

    var voci = '';
    Object.keys(perAnno).map(Number).sort(function (a, b) { return b - a; })
      .forEach(function (anno) {
        Object.keys(perAnno[anno]).map(Number).sort().forEach(function (id) {
          voci += '<li><strong>' + esc(nomeSquadra(id)) + '</strong> — asta ' + anno +
                  ': <strong class="ko">−' + perAnno[anno][id] + '</strong> crediti</li>';
        });
      });

    document.getElementById('svincoli-totale').innerHTML =
      '<div class="callout warn"><span class="callout-title">Crediti da togliere all\'asta</span>' +
      '<ul>' + voci + '</ul>' +
      '<p>Le penali si sottraggono ai crediti spendibili della stagione in cui ' +
      'lo svincolo avviene (<a href="regolamento.html#s8">regolamento § 8</a>).</p></div>';
  }

  // --- Avvio --------------------------------------------------------------

  function aggiorna() {
    var anno = Number(selAnno.value);
    var sel = selSquadra.value;
    var filtro = ricerca.value.trim().toLowerCase();

    disegnaSlot(anno, sel);
    disegnaAndamento(anno, sel);
    disegnaEta(anno, sel, filtro);
    disegnaGriglia(anno, sel, filtro);
    disegnaSvincoli(sel);

    if (typeof window.preparaTabelle === 'function') window.preparaTabelle();
  }

  selSquadra.addEventListener('change', aggiorna);
  selAnno.addEventListener('change', aggiorna);
  ricerca.addEventListener('input', aggiorna);

  document.getElementById('generato-il').textContent = D.generatoIl || '—';
  aggiorna();
})();
