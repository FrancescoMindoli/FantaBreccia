/*
 * contratti.js — griglia dei contratti attivi, squadra per squadra.
 *
 * Non contiene formule: costi, penali e categorie vengono da calcoli.js,
 * che è l'unico posto dove vivono le regole.
 */

(function () {
  'use strict';

  var errore = document.getElementById('errore');
  var selSquadra = document.getElementById('squadra-select');
  var selAnno = document.getElementById('anno-select');
  var ricerca = document.getElementById('ricerca');

  function avvisa(messaggio) {
    errore.innerHTML = messaggio;
    errore.hidden = false;
  }

  if (typeof window.DATI === 'undefined' || typeof window.Calcoli === 'undefined') {
    avvisa('Dati non disponibili: manca js/dati.js oppure js/calcoli.js.');
    return;
  }

  var D = window.DATI;
  var C = window.Calcoli;

  // Ogni contratto porta con sé nome, ruolo e anno di nascita del giocatore:
  // nel foglio non esistono più ID da incrociare.
  var contratti = (D.contratti || []).filter(function (c) { return c.attivo; });

  var nomiSquadre = {};
  (D.squadre || []).forEach(function (s) { nomiSquadre[s.id] = s.squadra; });

  // --- Stato vuoto -------------------------------------------------------

  if (!contratti.length) {
    avvisa(
      '<strong>Nessun contratto inserito.</strong><br>' +
      'Compila il foglio <em>Contratti</em> in ' +
      '<code>dati\\Gestione.xlsx</code>, poi lancia <code>aggiorna.bat</code>.'
    );
    document.getElementById('sezione-slot').hidden = true;
    document.getElementById('sezione-griglia').hidden = true;
    document.querySelector('.filtri').hidden = true;
    document.getElementById('generato-il').textContent = D.generatoIl || '—';
    return;
  }

  // --- Anni coperti dai contratti ----------------------------------------

  var anniSet = {};
  contratti.forEach(function (c) {
    for (var a = c.annoInizio; a <= c.annoFine; a++) anniSet[a] = true;
  });
  var anni = Object.keys(anniSet).map(Number).sort(function (a, b) { return a - b; });

  var squadreConContratti = [];
  contratti.forEach(function (c) {
    if (squadreConContratti.indexOf(c.idSquadra) === -1) squadreConContratti.push(c.idSquadra);
  });
  squadreConContratti.sort(function (a, b) { return a - b; });

  // --- Riempimento dei filtri --------------------------------------------

  var opzione = document.createElement('option');
  opzione.value = 'tutte';
  opzione.textContent = 'Tutte le squadre';
  selSquadra.appendChild(opzione);

  squadreConContratti.forEach(function (id) {
    var o = document.createElement('option');
    o.value = String(id);
    o.textContent = nomiSquadre[id] || ('Squadra ' + id);
    selSquadra.appendChild(o);
  });

  anni.forEach(function (a) {
    var o = document.createElement('option');
    o.value = String(a);
    o.textContent = String(a);
    selAnno.appendChild(o);
  });
  selAnno.value = String(anni[0]);

  // --- Calcolo di una riga -----------------------------------------------

  /**
   * Per ogni anno del contratto: costo di riconferma, penale di svincolo e
   * categoria del giocatore in quella stagione.
   */
  function dettaglio(contratto) {
    var durata = contratto.annoFine - contratto.annoInizio + 1;
    var righe = [];
    var categoriaPrecedente = null;

    for (var i = 0; i < durata; i++) {
      var annoSolare = contratto.annoInizio + i;
      var annoContratto = i + 1;
      var categoria = C.categoriaPerEta(contratto.annoNascita, annoSolare);
      righe.push({
        annoSolare: annoSolare,
        annoContratto: annoContratto,
        costo: C.calcolaRiscatto(contratto.prezzo, annoContratto),
        penale: C.calcolaSvincolo(contratto.prezzo, durata + 1 - annoContratto),
        categoria: categoria,
        cambiata: categoriaPrecedente !== null && categoria !== categoriaPrecedente
      });
      categoriaPrecedente = categoria;
    }
    return righe;
  }

  function badge(categoria) {
    var classe = categoria === 'A' ? 'a' : categoria === 'B' ? 'b' : 'c';
    return '<span class="badge ' + classe + '">' + categoria + '</span>';
  }

  // --- Riepilogo slot ----------------------------------------------------

  function disegnaSlot(anno, idSquadra) {
    var contenitore = document.getElementById('slot-riepilogo');
    contenitore.innerHTML = '';

    var squadre = idSquadra === 'tutte'
      ? squadreConContratti
      : [Number(idSquadra)];

    var html = '';
    squadre.forEach(function (id) {
      var conta = { A: 0, B: 0, C: 0 };
      contratti.forEach(function (c) {
        if (c.idSquadra !== id) return;
        if (anno < c.annoInizio || anno > c.annoFine) return;
        conta[C.categoriaPerEta(c.annoNascita, anno)] += 1;
      });

      var totale = conta.A + conta.B + conta.C;
      if (!totale) return;

      var sforaA = conta.A > C.MAX_CATEGORIA_A;
      var sforaAB = (conta.A + conta.B) > C.MAX_A_PIU_B;

      html +=
        '<div class="slot-squadra' + (sforaA || sforaAB ? ' slot-ko' : '') + '">' +
          '<div class="slot-nome">' + (nomiSquadre[id] || ('Squadra ' + id)) + '</div>' +
          '<div class="slot-numeri">' +
            statistica('A', conta.A, C.MAX_CATEGORIA_A, sforaA) +
            statistica('A + B', conta.A + conta.B, C.MAX_A_PIU_B, sforaAB) +
            statistica('C', conta.C, null, false) +
          '</div>' +
          (sforaA || sforaAB
            ? '<p class="slot-avviso">⚠️ Limite superato</p>'
            : '') +
        '</div>';
    });

    contenitore.innerHTML = html || '<p class="nota-tabella">Nessun contratto attivo nel ' + anno + '.</p>';
  }

  function statistica(etichetta, valore, limite, sfora) {
    return '<div class="slot-stat' + (sfora ? ' slot-stat-ko' : '') + '">' +
      '<div class="slot-valore">' + valore + (limite !== null ? '<span>/' + limite + '</span>' : '') + '</div>' +
      '<div class="slot-etichetta">' + etichetta + '</div>' +
    '</div>';
  }

  // --- Griglia -----------------------------------------------------------

  function disegnaGriglia(anno, idSquadra, filtro) {
    var contenitore = document.getElementById('griglia');
    contenitore.innerHTML = '';

    var visibili = contratti.filter(function (c) {
      if (idSquadra !== 'tutte' && c.idSquadra !== Number(idSquadra)) return false;
      if (filtro && (c.giocatore || '').toLowerCase().indexOf(filtro) === -1) {
        return false;
      }
      return true;
    });

    if (!visibili.length) {
      contenitore.innerHTML = '<p class="nota-tabella">Nessun giocatore corrisponde ai filtri.</p>';
      return;
    }

    // Una tabella per squadra, così i totali hanno senso
    var perSquadra = {};
    visibili.forEach(function (c) {
      (perSquadra[c.idSquadra] = perSquadra[c.idSquadra] || []).push(c);
    });

    var html = '';
    Object.keys(perSquadra).map(Number).sort(function (a, b) { return a - b; })
      .forEach(function (id) {
        html += '<h3>' + (nomiSquadre[id] || ('Squadra ' + id)) + '</h3>';
        html += tabellaSquadra(perSquadra[id], anno);
      });

    contenitore.innerHTML = html;
    if (typeof window.preparaTabelle === 'function') window.preparaTabelle(contenitore);
  }

  function tabellaSquadra(elenco, annoRif) {
    var righe = '';
    var totali = [0, 0, 0, 0];

    elenco.forEach(function (c) {
      var det = dettaglio(c);

      var celle = '';
      det.forEach(function (d, i) {
        var classi = ['num'];
        if (d.annoSolare === annoRif) classi.push('cella-anno-rif');
        if (d.cambiata) classi.push('cella-cambio');
        celle +=
          '<td class="' + classi.join(' ') + '">' +
            '<span class="costo">' + d.costo + '</span> ' + badge(d.categoria) +
            '<span class="penale">svinc. ' + d.penale + '</span>' +
          '</td>';
        if (i < 4) totali[i] += d.costo;
      });

      righe +=
        '<tr>' +
          '<td>' +
            '<strong>' + c.giocatore + '</strong>' +
            '<span class="meta">' + (c.ruolo || '—') +
              (c.annoNascita ? ' · ' + c.annoNascita : '') +
              ' · pagato ' + c.prezzo +
            '</span>' +
          '</td>' + celle +
        '</tr>';
    });

    var intestazioniAnni = '';
    var durata = 4;
    for (var i = 1; i <= durata; i++) {
      intestazioniAnni += '<th class="num">Anno ' + i + '</th>';
    }

    var celleTotali = '';
    totali.forEach(function (t) { celleTotali += '<td class="num">' + t + '</td>'; });

    return '<div class="table-wrap"><table>' +
      '<thead><tr><th>Giocatore</th>' + intestazioniAnni + '</tr></thead>' +
      '<tbody>' + righe + '</tbody>' +
      '<tfoot><tr><td>Totale</td>' + celleTotali + '</tr></tfoot>' +
    '</table></div>';
  }

  // --- Avvio -------------------------------------------------------------

  function aggiorna() {
    var anno = Number(selAnno.value);
    var squadra = selSquadra.value;
    var filtro = ricerca.value.trim().toLowerCase();
    disegnaSlot(anno, squadra);
    disegnaGriglia(anno, squadra, filtro);
  }

  selSquadra.addEventListener('change', aggiorna);
  selAnno.addEventListener('change', aggiorna);
  ricerca.addEventListener('input', aggiorna);

  document.getElementById('generato-il').textContent = D.generatoIl || '—';
  aggiorna();
})();
