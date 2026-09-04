/*
 * contratti.js — chi è sotto contratto e quanto costa tenerlo o mollarlo.
 *
 * Ordine della pagina: prima chi hai, poi se stai nei limiti.
 *   1. una scheda per giocatore, con i costi anno per anno
 *   2. riepilogo anno per anno: gli slot sono a posto o no
 *   3. gli avvisi, con il perché
 *   4. quanto costa in totale riscattarli o svincolarli tutti
 *   5. dettaglio slot: chi occupa quale categoria, anno per anno
 *   6. svincoli già registrati
 *
 * Le categorie del regolamento (A, B, C) sono mostrate come O25, U25 e U21:
 * dicono la stessa cosa ma si capiscono senza andare a cercare la legenda.
 *
 * Nessuna formula qui dentro: costi, penali e categorie vengono da calcoli.js.
 */

(function () {
  'use strict';

  var errore = document.getElementById('errore');
  var selSquadra = document.getElementById('squadra-select');
  var selAnno = document.getElementById('anno-select');

  // Categorie: codice del regolamento -> come le chiamiamo qui
  var CAT = {
    A: { breve: 'O25', lungo: 'Over 25', classe: 'a' },
    B: { breve: 'U25', lungo: 'Under 25', classe: 'b' },
    C: { breve: 'U21', lungo: 'Under 21', classe: 'c' }
  };

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

  var SEZIONI = ['sezione-giocatori', 'sezione-riepilogo', 'sezione-totali',
                 'sezione-slot', 'sezione-svincoli'];

  if (!contratti.length) {
    avvisa(
      '<strong>Nessun contratto inserito.</strong><br>' +
      'Compila il foglio <em>Contratti</em> in <code>dati\\Gestione.xlsx</code>, ' +
      'poi lancia <code>aggiorna.bat</code>.'
    );
    SEZIONI.forEach(function (id) { document.getElementById(id).hidden = true; });
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

  function slot(idSquadra, anno) {
    var conta = { A: 0, B: 0, C: 0 };
    var chi = { A: [], B: [], C: [] };
    contratti.forEach(function (c) {
      if (c.idSquadra !== idSquadra) return;
      if (anno < c.annoInizio || anno > c.annoFine) return;
      var cat = C.categoriaPerEta(c.annoNascita, anno);
      conta[cat] += 1;
      chi[cat].push(c);
    });
    var ab = conta.A + conta.B;
    var motivi = [];
    if (conta.A > C.MAX_CATEGORIA_A) {
      motivi.push(conta.A + ' Over 25, il massimo è ' + C.MAX_CATEGORIA_A);
    }
    if (ab > C.MAX_A_PIU_B) {
      motivi.push(ab + ' fra Over e Under 25, il massimo è ' + C.MAX_A_PIU_B);
    }
    return { A: conta.A, B: conta.B, C: conta.C, ab: ab, chi: chi,
             totale: ab + conta.C, sfora: motivi.length > 0, motivi: motivi };
  }

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
        testi.push(c.giocatore + ' compie ' + d.eta + ' anni: da ' +
                   (prima ? CAT[prima.categoria].breve : '?') + ' a ' +
                   CAT[d.categoria].breve);
      }
    });
    return testi;
  }

  function badge(cat, conEta) {
    var c = CAT[cat];
    return '<span class="badge ' + c.classe + '" title="' + c.lungo + '">' +
      c.breve + '</span>' + (conEta ? ' ' + conEta + ' anni' : '');
  }

  function squadreScelte() {
    return selSquadra.value === 'tutte' ? squadre : [Number(selSquadra.value)];
  }

  /**
   * Anni di contratto di una squadra, **dalla stagione scelta in poi**.
   *
   * Il selettore non evidenzia soltanto l'anno in corso: nasconde anche il
   * passato. Le stagioni già giocate non si possono più cambiare, e mostrarle
   * insieme a quelle su cui puoi ancora decidere confondeva la lettura.
   */
  function anniDi(idSquadra, da) {
    return anni.filter(function (a) {
      if (da !== undefined && a < da) return false;
      return contratti.some(function (c) {
        return c.idSquadra === idSquadra && a >= c.annoInizio && a <= c.annoFine;
      });
    });
  }

  // --- 2. Riepilogo: il check anno per anno ------------------------------

  function disegnaRiepilogo(annoCorrente) {
    var html = '';

    squadreScelte().forEach(function (id) {
      var suoiAnni = anniDi(id, annoCorrente);
      if (!suoiAnni.length) return;

      var righe = '';
      suoiAnni.forEach(function (anno) {
        var s = slot(id, anno);
        righe +=
          '<tr class="' + (s.sfora ? 'riga-ko' : 'riga-ok') +
            (anno === annoCorrente ? ' riga-ora' : '') + '">' +
            '<td><strong>' + anno + '</strong>' +
              (anno === annoCorrente
                ? '<span class="meta">stagione in corso</span>' : '') + '</td>' +
            '<td class="num' + (s.A > C.MAX_CATEGORIA_A ? ' ko' : '') + '">' +
              s.A + ' / ' + C.MAX_CATEGORIA_A + '</td>' +
            '<td class="num' + (s.ab > C.MAX_A_PIU_B ? ' ko' : '') + '">' +
              s.ab + ' / ' + C.MAX_A_PIU_B + '</td>' +
            '<td class="num">' + s.C + '</td>' +
            '<td>' + (s.sfora
              ? '<span class="esito-no">✗ fuori dai limiti</span>'
              : '<span class="esito-si">✓ a posto</span>') + '</td>' +
          '</tr>';
      });

      html +=
        (squadreScelte().length > 1 ? '<h3>' + esc(nomeSquadra(id)) + '</h3>' : '') +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th>Anno</th>' +
          '<th class="num">Over 25</th>' +
          '<th class="num">O25 + U25</th>' +
          '<th class="num">Under 21</th>' +
          '<th>Esito</th>' +
        '</tr></thead><tbody>' + righe + '</tbody></table></div>';
    });

    document.getElementById('riepilogo').innerHTML = html;
  }

  // --- 3. Avvisi ----------------------------------------------------------

  function disegnaAvvisi(annoCorrente) {
    var ora = [], futuri = [];

    squadreScelte().forEach(function (id) {
      anni.forEach(function (anno) {
        // Coerente col resto della pagina: le stagioni prima di quella scelta
        // non si guardano più. Segnalare un problema del 2026 mentre il 2026
        // è nascosto ovunque sarebbe solo confondente.
        if (anno < annoCorrente) return;
        var s = slot(id, anno);
        if (!s.totale || !s.sfora) return;
        var v = { id: id, anno: anno, motivi: s.motivi, cause: cause(id, anno, s) };
        if (anno === annoCorrente) ora.push(v); else futuri.push(v);
      });
    });

    var contenitore = document.getElementById('avvisi');

    if (!ora.length && !futuri.length) {
      contenitore.innerHTML =
        '<div class="banner banner-ok">' +
          '<div class="banner-icona">✓</div>' +
          '<div><strong>Nessun problema di slot.</strong> I limiti sono ' +
          'rispettati in tutti gli anni di contratto, anche tenendo conto di ' +
          'come cambieranno le categorie.</div>' +
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
            : '') + '</li>';
      });
      return html + '</ul>';
    }

    var html = '';
    if (ora.length) {
      html +=
        '<div class="banner banner-ko"><div class="banner-icona">⚠</div><div>' +
          '<strong>Sei fuori dai limiti adesso.</strong>' + voci(ora) +
        '</div></div>';
    }
    if (futuri.length) {
      html +=
        '<div class="banner banner-attenzione"><div class="banner-icona">⚠</div><div>' +
          '<strong>' + (ora.length ? 'E in futuro peggiora.'
            : 'Adesso sei a posto, ma non lo resterai.') + '</strong>' +
          voci(futuri) +
          '<p class="banner-nota">I contratti già firmati restano validi: il ' +
          'regolamento non agisce retroattivamente. Ma di questi sforamenti va ' +
          'tenuto conto nelle riconferme future.</p>' +
        '</div></div>';
    }
    contenitore.innerHTML = html;
  }

  // --- 1. Una scheda per giocatore ---------------------------------------

  function disegnaGiocatori(annoCorrente) {
    var html = '';

    squadreScelte().forEach(function (id) {
      var suoi = contratti.filter(function (c) { return c.idSquadra === id; })
                          .sort(function (a, b) { return b.prezzo - a.prezzo; });
      if (!suoi.length) return;

      if (squadreScelte().length > 1) html += '<h3>' + esc(nomeSquadra(id)) + '</h3>';
      html += '<div class="schede-giocatori">';

      suoi.forEach(function (c) {
        var d = dettaglio(c);
        var rimanenti = c.annoFine - annoCorrente + 1;
        if (rimanenti > c.annoFine - c.annoInizio + 1) {
          rimanenti = c.annoFine - c.annoInizio + 1;   // contratto non ancora iniziato
        }
        var attuale = d[annoCorrente];

        var anniHtml = '';
        Object.keys(d).map(Number).sort(function (a, b) { return a - b; })
          .forEach(function (anno) {
            var v = d[anno];
            anniHtml +=
              '<div class="g-anno' + (anno === annoCorrente ? ' g-anno-ora' : '') + '">' +
                '<div class="g-anno-testa">' + anno +
                  (anno === annoCorrente ? '<span>ora</span>' : '') + '</div>' +
                '<div class="g-riga g-ris"><span>riscatti</span><b>' +
                  v.riscatto + '</b></div>' +
                '<div class="g-riga g-svi"><span>svincoli</span><b>' +
                  v.svincolo + '</b></div>' +
                '<div class="g-anno-cat">' + badge(v.categoria) +
                  (v.eta === null ? '' : ' <span class="g-eta">' + v.eta + ' anni</span>') +
                  (v.cambiata ? '<span class="cat-cambio">cambio</span>' : '') +
                '</div>' +
              '</div>';
          });

        html +=
          '<article class="scheda-g">' +
            '<header class="g-testa">' +
              '<div>' +
                '<div class="g-nome">' + esc(c.giocatore) + '</div>' +
                '<div class="g-meta">' +
                  'preso nel <strong>' + c.annoInizio + '</strong>' +
                  ' · contratto fino al <strong>' + c.annoFine + '</strong>' +
                  (rimanenti > 0
                    ? ' · <strong>' + rimanenti +
                      (rimanenti === 1 ? ' anno rimanente' : ' anni rimanenti') + '</strong>'
                    : ' · <strong>scaduto</strong>') +
                  (attuale ? ' · ' + badge(attuale.categoria, attuale.eta) : '') +
                '</div>' +
              '</div>' +
              '<div class="g-prezzo">' +
                '<span>pagato</span><b>' + c.prezzo + '</b>' +
              '</div>' +
            '</header>' +
            '<div class="g-anni">' + anniHtml + '</div>' +
          '</article>';
      });

      html += '</div>';
    });

    document.getElementById('giocatori').innerHTML = html;
  }

  // --- 4. Quanto costa in totale ------------------------------------------

  function disegnaTotali(annoCorrente) {
    var html = '';

    squadreScelte().forEach(function (id) {
      var suoi = contratti.filter(function (c) { return c.idSquadra === id; });
      var suoiAnni = anniDi(id, annoCorrente);
      if (!suoi.length || !suoiAnni.length) return;

      var righe = '';
      suoiAnni.forEach(function (anno) {
        var tieni = 0, molli = 0, quanti = 0;
        suoi.forEach(function (c) {
          var v = dettaglio(c)[anno];
          if (!v) return;
          tieni += v.riscatto; molli += v.svincolo; quanti++;
        });
        righe +=
          '<tr' + (anno === annoCorrente ? ' class="riga-ora"' : '') + '>' +
            '<td><strong>' + anno + '</strong>' +
              (anno === annoCorrente ? '<span class="meta">stagione in corso</span>' : '') +
            '</td>' +
            '<td class="num">' + quanti + '</td>' +
            '<td class="num"><span class="soldi soldi-tieni">' + tieni + '</span></td>' +
            '<td class="num"><span class="soldi soldi-molli">' + molli + '</span></td>' +
          '</tr>';
      });

      html +=
        (squadreScelte().length > 1 ? '<h3>' + esc(nomeSquadra(id)) + '</h3>' : '') +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th>Anno</th><th class="num">Giocatori</th>' +
          '<th class="num">Riscattarli tutti</th>' +
          '<th class="num">Svincolarli tutti</th>' +
        '</tr></thead><tbody>' + righe + '</tbody></table></div>';
    });

    document.getElementById('totali').innerHTML = html;
  }

  // --- 5. Dettaglio slot: chi occupa cosa ---------------------------------

  function disegnaSlot(annoCorrente) {
    var html = '';

    squadreScelte().forEach(function (id) {
      var suoiAnni = anniDi(id, annoCorrente);
      if (!suoiAnni.length) return;

      if (squadreScelte().length > 1) html += '<h3>' + esc(nomeSquadra(id)) + '</h3>';

      // Una scheda per anno, con tre colonne di nomi impilati. In tabella i
      // nomi affiancati sfondavano la cella: qui ogni categoria ha la sua
      // colonna e i nomi vanno a capo naturalmente.
      suoiAnni.forEach(function (anno) {
        var s = slot(id, anno);

        function colonna(cat, titolo, limite, valore, sfora) {
          var nomi = s.chi[cat].map(function (c) {
            var d = dettaglio(c)[anno];
            return '<li' + (d && d.cambiata ? ' class="nome-cambio"' : '') + '>' +
              esc(c.giocatore) +
              (d && d.eta !== null ? '<span>' + d.eta + '</span>' : '') +
              '</li>';
          }).join('');

          return '<div class="slot-col' + (sfora ? ' slot-col-ko' : '') + '">' +
            '<div class="slot-col-testa">' +
              '<span class="slot-col-nome">' + titolo + '</span>' +
              '<span class="slot-col-conto">' + valore +
                (limite === null ? '' : '<i>/' + limite + '</i>') + '</span>' +
            '</div>' +
            (nomi ? '<ul class="slot-col-elenco">' + nomi + '</ul>'
                  : '<p class="slot-col-vuota">nessuno</p>') +
          '</div>';
        }

        html +=
          '<article class="slot-anno' + (s.sfora ? ' slot-anno-ko' : '') +
            (anno === annoCorrente ? ' slot-anno-ora' : '') + '">' +
            '<header class="slot-anno-testa">' +
              '<span class="slot-anno-num">' + anno + '</span>' +
              (anno === annoCorrente
                ? '<span class="badge b">stagione in corso</span>' : '') +
              (s.sfora
                ? '<span class="slot-anno-ko-testo">✗ ' + esc(s.motivi.join(' · ')) + '</span>'
                : '<span class="slot-anno-ok-testo">✓ nei limiti</span>') +
            '</header>' +
            '<div class="slot-colonne">' +
              colonna('A', 'Over 25', C.MAX_CATEGORIA_A, s.A, s.A > C.MAX_CATEGORIA_A) +
              colonna('B', 'Under 25', null, s.B, false) +
              colonna('C', 'Under 21', null, s.C, false) +
            '</div>' +
            '<p class="slot-anno-ab">Over 25 + Under 25: <strong' +
              (s.ab > C.MAX_A_PIU_B ? ' class="ko"' : '') + '>' + s.ab +
              ' / ' + C.MAX_A_PIU_B + '</strong></p>' +
          '</article>';
      });
    });

    document.getElementById('slot').innerHTML = html;
  }

  // --- 6. Svincoli --------------------------------------------------------

  function disegnaSvincoli() {
    var sezione = document.getElementById('sezione-svincoli');
    var elenco = svincoli.filter(function (s) {
      return selSquadra.value === 'tutte' || s.idSquadra === Number(selSquadra.value);
    });

    if (!elenco.length) { sezione.hidden = true; return; }
    sezione.hidden = false;

    var righe = '', perAnno = {};
    elenco.forEach(function (s) {
      righe +=
        '<tr>' +
          '<td><strong>' + esc(s.giocatore) + '</strong>' +
            (s.note ? '<span class="meta">' + esc(s.note) + '</span>' : '') + '</td>' +
          '<td>' + esc(nomeSquadra(s.idSquadra)) + '</td>' +
          '<td class="num">' + s.anno + '</td>' +
          '<td class="num"><span class="soldi soldi-molli">−' + s.penale + '</span>' +
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
    disegnaGiocatori(anno);
    disegnaRiepilogo(anno);
    disegnaAvvisi(anno);
    disegnaTotali(anno);
    disegnaSlot(anno);
    disegnaSvincoli();
    if (typeof window.preparaTabelle === 'function') window.preparaTabelle();
  }

  selSquadra.addEventListener('change', aggiorna);
  selAnno.addEventListener('change', aggiorna);

  document.getElementById('generato-il').textContent = D.generatoIl || '—';
  aggiorna();
})();
