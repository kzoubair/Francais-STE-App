/*
 * Lexique STE — interface (affichage, sessions, sprint, collection, réglages).
 * La logique de révision est dans moteur.js, la correction dans correcteur.js,
 * le stockage dans stockage.js, les sons dans sons.js et les textes dans textes.js.
 */
(function () {
  'use strict';
  var M = window.Moteur, C = window.Correcteur, S = window.Stockage, Son = window.Sons, t = window.t;
  var VOC = window.VOCABULAIRE, THEMES = window.THEMES;
  var PAR_ID = {};
  VOC.forEach(function (e) { PAR_ID[e.id] = e; });
  var P = S.charger();

  /* ---------------- Outils ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sauver() { S.sauver(P); }
  function aujourdhui() { return S.jourLocal(new Date()); }
  function statJour(j) {
    j = j || aujourdhui();
    if (!P.jours[j]) P.jours[j] = { cartes: 0, justes: 0, nouvelles: 0, revues: 0 };
    return P.jours[j];
  }
  function animReduites() {
    return P.reglages.animationsReduites || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(toast.minuteur);
    toast.minuteur = setTimeout(function () { el.classList.remove('visible'); }, 2600);
  }

  /* Texte arabe : les morceaux latins (sigles, unités, chiffres) sont isolés en LTR. */
  function arHTML(ar) {
    return esc(ar).replace(/[A-Za-z0-9µΩΔαφ][A-Za-z0-9µΩΔαφ.,/×=+\-' ]*[A-Za-z0-9µΩΔαφ]|[A-Za-z0-9µΩΔαφ]/g, function (m) { return '<bdi dir="ltr">' + m + '</bdi>'; });
  }
  /* Exemple avec le mot cible en gras. */
  function exHTML(p, g) {
    if (!g) return esc(p);
    return esc(p.slice(0, g[0])) + '<b>' + esc(p.slice(g[0], g[1])) + '</b>' + esc(p.slice(g[1]));
  }
  /* Le mot français avec l'indication du genre quand l'article ne le montre pas. */
  function frHTML(e) {
    var h = esc(e.fr);
    if (e.nature === 'nom' && (e.article === "l'" || e.article === 'les')) h += ' <span class="genre">(' + e.genre + ')</span>';
    return h;
  }

  function vocabActif() {
    var r = P.reglages;
    return VOC.filter(function (e) { return r.themesInactifs.indexOf(e.theme) < 0 && r.niveaux[e.niveau]; });
  }
  function nbAncres(liste) {
    var n = 0;
    (liste || VOC).forEach(function (e) { if (M.estAncree(P.cartes[e.id])) n++; });
    return n;
  }
  function rangAffiche() {
    var r = M.rangPour(nbAncres(), VOC.length);
    var idx = Math.max(r.index, P.meilleurRang || 0);
    return { index: idx, rang: r.liste[idx], suivant: r.liste[idx + 1] || null, liste: r.liste, ancres: nbAncres(), calcule: r.index };
  }
  function ancresParTheme() {
    var res = {};
    THEMES.forEach(function (th) { res[th.id] = { ancres: 0, total: 0, enCours: 0 }; });
    VOC.forEach(function (e) {
      var c = P.cartes[e.id], s = res[e.theme];
      s.total++;
      if (M.estAncree(c)) s.ancres++;
      else if (c && c.etat !== 'nouvelle') s.enCours++;
    });
    return res;
  }
  function limitesDuJour() {
    var j = statJour();
    var r = P.reglages;
    return {
      nouvellesRestantes: Math.max(0, r.maxNouvelles - j.nouvelles),
      revuesRestantes: Math.max(0, r.maxRevues - j.revues),
      longueur: r.longueur,
      melanger: r.melanger
    };
  }
  function animerNombre(el, cible, suffixe) {
    suffixe = suffixe || '';
    if (animReduites()) { el.textContent = cible + suffixe; return; }
    var debut = performance.now(), duree = 900;
    (function pas(maintenant) {
      var x = Math.min(1, (maintenant - debut) / duree);
      el.textContent = Math.round(cible * (1 - Math.pow(1 - x, 3))) + suffixe;
      if (x < 1) requestAnimationFrame(pas);
    })(debut);
  }
  function anneau(svg, fraction) {
    var c = svg.querySelector('.val-anneau');
    var r = +c.getAttribute('r');
    var tour = 2 * Math.PI * r;
    c.style.strokeDasharray = tour;
    c.style.strokeDashoffset = tour * (1 - Math.max(0, Math.min(1, fraction)));
  }

  /* ---------------- Apparence, textes, son ---------------- */
  function appliquerApparence() {
    var a = P.reglages.apparence;
    document.documentElement.setAttribute('data-theme', a === 'clair' ? 'light' : a === 'systeme' ? 'systeme' : 'dark');
    document.documentElement.classList.toggle('sans-anim', !!P.reglages.animationsReduites);
    var clair = a === 'clair' || (a === 'systeme' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', clair ? '#E7E3DB' : '#0E1116');
  }
  function appliquerTextes(racine) {
    (racine || document).querySelectorAll('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
    (racine || document).querySelectorAll('[data-label]').forEach(function (el) {
      var l = t(el.getAttribute('data-label'));
      el.setAttribute('aria-label', l); el.setAttribute('title', l);
    });
  }
  var ICONE_SON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
  var ICONE_MUET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>';
  function majBoutonSon() {
    var b = $('btn-son');
    b.innerHTML = P.reglages.son ? ICONE_SON : ICONE_MUET;
    var l = P.reglages.son ? t('sonOn') : t('sonOff');
    b.setAttribute('aria-label', l); b.setAttribute('title', l);
    b.setAttribute('aria-pressed', P.reglages.son ? 'false' : 'true');
    Son.setActif(P.reglages.son);
  }

  /* ---------------- Navigation ---------------- */
  var ecranCourant = 'accueil';
  function afficherEcran(nom) {
    document.querySelectorAll('.ecran').forEach(function (s) { s.classList.remove('actif'); });
    $('ecran-' + nom).classList.add('actif');
    ecranCourant = nom;
    document.body.classList.remove('c20');
    window.scrollTo(0, 0);
    if (nom === 'accueil') rendreAccueil();
  }

  /* ---------------- Série de jours ---------------- */
  function jourActif(j) {
    var s = P.jours[j];
    return !!s && s.cartes >= Math.min(10, P.reglages.objectif);
  }
  function semaineISO(d) {
    var x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var jour = x.getUTCDay() || 7;
    x.setUTCDate(x.getUTCDate() + 4 - jour);
    var an = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
    return x.getUTCFullYear() + '-' + Math.ceil(((x - an) / 86400000 + 1) / 7);
  }
  function calculerSerie() {
    var d = new Date();
    var repos = {};
    if (!jourActif(S.jourLocal(d))) d.setDate(d.getDate() - 1);
    if (!jourActif(S.jourLocal(d))) return { n: 0, repos: repos };
    var n = 0, joker = {};
    for (var i = 0; i < 800; i++) {
      var j = S.jourLocal(d);
      if (jourActif(j)) n++;
      else {
        var sem = semaineISO(d);
        if (joker[sem]) break;
        // le jour de repos ne compte que s'il est suivi (plus tôt) d'un jour actif
        var veille = new Date(d); veille.setDate(veille.getDate() - 1);
        if (!jourActif(S.jourLocal(veille))) break;
        joker[sem] = true; repos[j] = true;
      }
      d.setDate(d.getDate() - 1);
    }
    return { n: n, repos: repos };
  }

  /* ---------------- Accueil ---------------- */
  function rendreAccueil() {
    var r = rangAffiche();
    $('rang-nom').textContent = r.rang.nom;
    var frac = 1, info;
    if (r.suivant) {
      var base = r.rang.seuil;
      frac = (r.ancres - base) / Math.max(1, r.suivant.seuil - base);
      info = t('motsAncres', { x: r.ancres }) + ' · ' + t('versRang', { x: Math.max(0, r.suivant.seuil - r.ancres), y: r.suivant.nom });
    } else info = t('motsAncres', { x: r.ancres }) + ' · ' + t('rangMax');
    $('rang-info').textContent = info;
    requestAnimationFrame(function () { $('rang-barre').style.transform = 'scaleX(' + Math.max(0.02, Math.min(1, frac)) + ')'; });
    $('bloc-rang').title = t('ancreInfo');

    var file = M.construireFile(vocabActif(), P.cartes, Date.now(), Object.assign(limitesDuJour(), { longueur: 9999 }));
    var nNeuves = file.filter(function (e) { var c = P.cartes[e.id]; return !c || c.etat === 'nouvelle'; }).length;
    var nRevues = file.length - nNeuves;
    var b = $('btn-commencer');
    b.innerHTML = '<span>' + esc(t('commencer')) + '<small class="num">' + esc(t('aReviser', { x: nRevues }) + ' · ' + t('nouveaux', { x: nNeuves })) + '</small></span>';
    b.disabled = file.length === 0;
    var msg = $('msg-accueil');
    msg.classList.toggle('cache', file.length > 0);
    msg.textContent = t('rienAReviser');

    var j = statJour(), obj = P.reglages.objectif;
    $('jour-cartes').textContent = j.cartes + ' / ' + obj;
    $('jour-info').textContent = j.cartes >= obj ? t('objectifAtteint') : t('cartes');
    anneau($('anneau-jour'), j.cartes / obj);
    $('anneau-jour').classList.toggle('ok', j.cartes >= obj);

    var serie = calculerSerie();
    $('serie-n').textContent = t(serie.n > 1 ? 'jours' : 'jour', { x: serie.n });
    var cal = $('calendrier');
    cal.innerHTML = '';
    cal.setAttribute('aria-label', t('calendrier'));
    for (var i = 29; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var cle = S.jourLocal(d);
      var c = document.createElement('i');
      if (jourActif(cle)) c.className = 'actif';
      else if (serie.repos[cle]) c.className = 'repos';
      if (i === 0) c.className += ' aujourdhui';
      c.title = cle + (jourActif(cle) ? ' · ' + t('jourActif') : serie.repos[cle] ? ' · ' + t('jourRepos') : '');
      cal.appendChild(c);
    }
  }

  /* ---------------- Session ---------------- */
  var sess = null;

  function demarrerSession() {
    Son.debloquer();
    var file = M.construireFile(vocabActif(), P.cartes, Date.now(), limitesDuJour());
    if (!file.length) { toast(t('sessionVide')); return; }
    sess = {
      file: file, pos: 0, vues: 0, justes: 0, combo: 0, maxCombo: 0, nouveauxAppris: [],
      themesAvant: ancresParTheme(), themesVus: {}, reponses: 0, maxReponses: P.reglages.longueur * 2
    };
    afficherEcran('session');
    majCombo(false);
    afficherCarte();
  }

  function typeQuestion(e) {
    if (P.reglages.mode !== 'qcm') return 'retourner';
    var c = P.cartes[e.id];
    if (!c || c.etat === 'nouvelle') return 'qcm';
    return 'saisie';
  }

  function distracteurs(e, n) {
    var exclus = [e.fr].concat(e.alt || []);
    function ok(x) {
      return x.id !== e.id && exclus.indexOf(x.fr) < 0 && (x.alt || []).indexOf(e.fr) < 0 && x.ar !== e.ar;
    }
    var pool = VOC.filter(function (x) { return x.theme === e.theme && x.nature === e.nature && ok(x); });
    if (pool.length < n) pool = pool.concat(VOC.filter(function (x) { return x.nature === e.nature && x.theme !== e.theme && ok(x); }));
    return M.melangerTableau(pool).slice(0, n);
  }

  function rendreRecto(e, type) {
    $('recto').innerHTML =
      '<p class="mot-ar" lang="ar" dir="rtl">' + arHTML(e.ar) + '</p>' +
      '<div class="nature" lang="fr" dir="ltr">' + esc(t('natures.' + e.nature)) + '</div>' +
      (type === 'retourner' ? '<div class="invitation" lang="fr">' + esc(t('toucherClavier')) + '</div>' : '');
  }
  function rendreVerso(e) {
    var h = '<div lang="fr" dir="ltr" style="width:100%">';
    h += '<p class="mot-fr">' + frHTML(e) + '</p>';
    if (e.pluriel) h += '<p class="details">' + esc(t('pluriel', { x: e.pluriel })) + '</p>';
    if (e.info) h += '<p class="details">' + esc(e.info) + '</p>';
    h += '<div class="exemples"><p>' + exHTML(e.exemple1, e.g1) + '</p><p>' + exHTML(e.exemple2, e.g2) + '</p></div></div>';
    $('verso').innerHTML = h;
  }

  function afficherCarte() {
    var e = sess.file[sess.pos];
    var type = typeQuestion(e);
    sess.courante = { e: e, type: type, decouvert: false, repondu: false, juste: null, suggere: 3 };
    var carte = $('carte');
    carte.classList.add('instant');
    carte.classList.remove('retournee');
    void carte.offsetWidth;
    carte.classList.remove('instant');
    rendreRecto(e, type);
    rendreVerso(e);
    carte.setAttribute('aria-label', e.ar);
    $('session-compteur').textContent = t('carteSur', { x: Math.min(sess.pos + 1, sess.file.length), y: sess.file.length });
    $('session-barre').style.transform = 'scaleX(' + (sess.pos / sess.file.length) + ')';
    $('zone-bas').innerHTML = '';
    var zr = $('zone-reponse');
    zr.innerHTML = '';
    if (type === 'qcm') rendreQCM(e, zr);
    else if (type === 'saisie') rendreSaisie(e, zr);
    else carte.focus({ preventScroll: true });
  }

  function rendreQCM(e, zone) {
    var options = M.melangerTableau([e].concat(distracteurs(e, 3)));
    sess.courante.options = options;
    var h = '<p class="consigne">' + esc(t('choisis')) + '</p><div class="options" role="group">';
    options.forEach(function (o, i) {
      h += '<button type="button" class="option" data-i="' + i + '" lang="fr"><kbd>' + (i + 1) + '</kbd><span>' + esc(o.fr) + '</span></button>';
    });
    zone.innerHTML = h + '</div>';
    zone.querySelectorAll('.option').forEach(function (b) {
      b.addEventListener('click', function () { choisirOption(+b.getAttribute('data-i')); });
    });
  }

  function choisirOption(i) {
    var cr = sess.courante;
    if (cr.repondu || !cr.options || !cr.options[i]) return;
    cr.repondu = true;
    var juste = cr.options[i].id === cr.e.id;
    var boutons = document.querySelectorAll('#zone-reponse .option');
    boutons.forEach(function (b, k) {
      b.disabled = true;
      if (cr.options[k].id === cr.e.id) b.classList.add('juste');
      else if (k === i) b.classList.add('faux');
    });
    apresReponse(juste, 3);
  }

  var LETTRES = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'œ', "'", '-'];
  function rendreSaisie(e, zone) {
    var c = P.cartes[e.id];
    var avecIndice = !(c && c.intervalle >= M.PARAMS.seuilAncre && c.etat === 'revision');
    var consigne = e.nature === 'nom' && P.reglages.exigerArticle ? t('ecrisArticle') : t('ecris');
    var h = '<p class="consigne">' + esc(consigne) + '</p>';
    if (avecIndice) h += '<p class="indice" lang="fr" dir="ltr">' + esc(t('indice', { x: C.indice(e) })) + '</p>';
    h += '<form class="saisie" id="form-saisie" autocomplete="off"><input id="entree" lang="fr" dir="ltr" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="' + esc(consigne) + '"><button class="btn btn-principal" type="submit" style="font-size:1rem">' + esc(t('valider')) + '</button></form>';
    h += '<div class="accents" aria-label="' + esc(t('accentsTitre')) + '">' + LETTRES.map(function (l) { return '<button type="button" data-l="' + esc(l) + '">' + esc(l) + '</button>'; }).join('') + '</div>';
    h += '<button type="button" class="lien-btn" id="btn-sais-pas">' + esc(t('jeNeSaisPas')) + '</button>';
    zone.innerHTML = h;
    var input = $('entree');
    $('form-saisie').addEventListener('submit', function (ev) { ev.preventDefault(); validerSaisie(); });
    zone.querySelectorAll('.accents button').forEach(function (b) {
      b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      b.addEventListener('click', function () {
        var l = b.getAttribute('data-l');
        var d = input.selectionStart || input.value.length, f = input.selectionEnd || input.value.length;
        input.value = input.value.slice(0, d) + l + input.value.slice(f);
        input.focus();
        input.setSelectionRange(d + l.length, d + l.length);
      });
    });
    $('btn-sais-pas').addEventListener('click', function () { input.value = ''; validerSaisie(); });
    setTimeout(function () { input.focus({ preventScroll: true }); }, 60);
  }

  function validerSaisie() {
    var cr = sess.courante;
    if (cr.repondu) return;
    var input = $('entree');
    var saisie = input.value;
    var r = C.verifier(saisie, cr.e, { exigerArticle: P.reglages.exigerArticle });
    cr.repondu = true;
    input.disabled = true;
    var zone = $('zone-reponse');
    zone.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    var h;
    if (r.statut === 'exact') h = '<div class="retour-saisie ok"><span class="titre-retour">' + esc(t('bravo')) + '</span></div>';
    else if (r.statut === 'accents') h = '<div class="retour-saisie ok"><span class="titre-retour">' + esc(t('accents')) + '</span>' + esc(t('reponseAttendue', { x: '' })) + '<strong lang="fr">' + esc(r.attendu) + '</strong></div>';
    else if (r.statut === 'faute') {
      var s = C.nettoyer(saisie), p = r.position;
      var souligne = esc(s.slice(0, p)) + '<u>' + esc(s.charAt(p) || ' ') + '</u>' + esc(s.slice(p + 1));
      h = '<div class="retour-saisie ok"><span class="titre-retour">' + esc(t('presque')) + '</span><span lang="fr">' + souligne + '</span> → <strong lang="fr">' + esc(r.attendu) + '</strong></div>';
    } else if (r.statut === 'article') h = '<div class="retour-saisie ko"><span class="titre-retour">' + esc(t('oubliArticle')) + '</span><strong lang="fr">' + esc(r.attendu) + '</strong></div>';
    else h = '<div class="retour-saisie ko"><span class="titre-retour">' + esc(t('faux')) + '</span><strong lang="fr">' + esc(cr.e.fr) + '</strong></div>';
    zone.insertAdjacentHTML('afterbegin', h);
    var form = $('form-saisie'); if (form) form.classList.add('cache');
    zone.querySelectorAll('.consigne, .indice').forEach(function (x) { x.classList.add('cache'); });
    var acc = zone.querySelector('.accents'); if (acc) acc.classList.add('cache');
    var sp = $('btn-sais-pas'); if (sp) sp.classList.add('cache');
    apresReponse(r.juste, r.statut === 'exact' ? 3 : 2);
  }

  /* Après une réponse QCM / saisie : la carte se retourne et la notation apparaît. */
  function apresReponse(juste, suggere) {
    var cr = sess.courante;
    cr.juste = juste;
    cr.suggere = juste ? suggere : 1;
    Son.jouer(juste ? 'juste' : 'faux');
    retourner(true);
    if (!juste) {
      $('zone-bas').innerHTML = '<button type="button" class="btn btn-principal" id="btn-continuer" style="font-size:1.05rem">' + esc(t('continuer')) + '</button>';
      $('btn-continuer').addEventListener('click', function () { noter(1); });
      $('btn-continuer').focus({ preventScroll: true });
    } else rendreNotes(suggere);
  }

  function rendreNotes(suggere) {
    var e = sess.courante.e;
    var prev = M.previsions(P.cartes[e.id] || M.nouvelleCarte(), Date.now());
    var h = '<div class="notes" role="group">';
    [1, 2, 3, 4].forEach(function (n) {
      h += '<button type="button" class="note' + (n === suggere ? ' suggere' : '') + '" data-n="' + n + '">' + esc(t('boutons.' + n)) + '<small class="num">' + esc(M.formaterDelai(prev[n])) + '</small></button>';
    });
    $('zone-bas').innerHTML = h + '</div>';
    $('zone-bas').querySelectorAll('.note').forEach(function (b) {
      b.addEventListener('click', function () { noter(+b.getAttribute('data-n')); });
    });
  }

  function retourner(force) {
    if (!sess || !sess.courante) return;
    var cr = sess.courante;
    if (cr.type !== 'retourner' && !cr.repondu) return; // QCM / saisie : on répond d'abord
    var carte = $('carte');
    if (force === true) carte.classList.add('retournee');
    else carte.classList.toggle('retournee');
    Son.jouer('retourner');
    if (cr.type === 'retourner' && !cr.decouvert) {
      cr.decouvert = true;
      rendreNotes(0);
    }
  }

  function noter(n) {
    var cr = sess && sess.courante;
    if (!cr || cr.note) return;
    if (cr.type === 'retourner' && !cr.decouvert) return;
    if (cr.type !== 'retourner' && !cr.repondu) return;
    if (cr.type !== 'retourner' && cr.juste === false) n = 1;
    cr.note = n;
    var e = cr.e;
    var maintenant = Date.now();
    var avant = P.cartes[e.id] || M.nouvelleCarte();
    var apres = M.noter(avant, n, maintenant);
    P.cartes[e.id] = apres;

    var j = statJour();
    j.cartes++;
    if (n > 1) j.justes++;
    if (avant.etat === 'nouvelle') j.nouvelles++;
    else if (avant.etat === 'revision') j.revues++;

    sess.vues++; sess.reponses++;
    sess.themesVus[e.theme] = true;
    if (n > 1) { sess.justes++; sess.combo++; sess.maxCombo = Math.max(sess.maxCombo, sess.combo); }
    else sess.combo = 0;
    if ((avant.etat === 'nouvelle' || avant.etat === 'apprentissage') && apres.etat === 'revision' && sess.nouveauxAppris.indexOf(e) < 0) sess.nouveauxAppris.push(e);
    if (cr.type === 'retourner') Son.jouer(n > 1 ? 'juste' : 'faux');
    majCombo(n > 1);

    // Carte encore en apprentissage : on la revoit plus loin dans la session.
    if ((apres.etat === 'apprentissage' || apres.etat === 'reapprentissage') && apres.echeance - maintenant < 20 * M.MINUTE && sess.reponses < sess.maxReponses) {
      var pos = Math.min(sess.file.length, sess.pos + 4);
      sess.file.splice(pos, 0, e);
    }
    sauver();

    var suite = function () {
      sess.pos++;
      if (sess.pos >= sess.file.length) finSession();
      else afficherCarte();
    };
    var r = M.rangPour(nbAncres(), VOC.length);
    if (r.index > (P.meilleurRang || 0)) {
      P.meilleurRang = r.index;
      sauver();
      promotion(r.rang.nom, suite);
    } else suite();
  }

  /* ---------------- Combo (uniquement visuel) ---------------- */
  function majCombo(juste) {
    var n = sess ? sess.combo : 0;
    var bloc = $('combo'), scene = $('scene');
    $('combo-n').textContent = '×' + n;
    bloc.classList.toggle('visible', n >= 2);
    if (juste && n >= 2) {
      bloc.classList.remove('bond'); void bloc.offsetWidth; bloc.classList.add('bond');
      if (n % 5 === 0) Son.jouer('combo', n);
    }
    scene.classList.toggle('c3', n >= 3);
    document.body.classList.toggle('c20', n >= 20 && !animReduites());
    if (!juste || animReduites()) return;
    if (n >= 5) particules();
    if (n >= 10) {
      scene.classList.remove('c10'); void scene.offsetWidth; scene.classList.add('c10');
      if (navigator.vibrate) { try { navigator.vibrate(35); } catch (er) { /* rien */ } }
    }
  }
  function particules() {
    var zone = $('particules');
    zone.innerHTML = '';
    for (var i = 0; i < 14; i++) {
      var p = document.createElement('i');
      var angle = (i / 14) * Math.PI * 2, dist = 110 + Math.random() * 70;
      p.style.setProperty('--dx', Math.round(Math.cos(angle) * dist) + 'px');
      p.style.setProperty('--dy', Math.round(Math.sin(angle) * dist) + 'px');
      if (i % 3 === 0) p.style.background = 'var(--juste)';
      zone.appendChild(p);
    }
    setTimeout(function () { zone.innerHTML = ''; }, 900);
  }

  /* ---------------- Promotion de rang ---------------- */
  function promotion(nom, ensuite) {
    var ov = $('promotion');
    $('promotion-nom').textContent = nom;
    ov.classList.add('visible');
    Son.jouer('promotion');
    setTimeout(function () {
      ov.classList.remove('visible');
      if (ensuite) ensuite();
    }, 1500);
  }

  /* ---------------- Fin de session ---------------- */
  function quitterSession() {
    if (sess && sess.vues > 0) finSession();
    else { sess = null; afficherEcran('accueil'); }
  }
  function finSession() {
    var s = sess;
    sess = null;
    document.body.classList.remove('c20');
    afficherEcran('fin');
    Son.jouer('fin');
    animerNombre($('fin-vues'), s.vues);
    animerNombre($('fin-reussite'), s.vues ? Math.round(100 * s.justes / s.vues) : 0, ' %');
    animerNombre($('fin-ancres'), nbAncres());
    animerNombre($('fin-combo'), s.maxCombo);

    var r = rangAffiche();
    $('fin-rang').innerHTML = '<p class="rang-nom" style="font-size:1.3rem">' + esc(r.rang.nom) + '</p><p class="doux">' +
      esc(r.suivant ? t('finRang', { x: Math.max(0, r.suivant.seuil - r.ancres), y: r.suivant.nom }) : t('finRangMax')) + '</p>';

    var apres = ancresParTheme();
    var h = '';
    THEMES.forEach(function (th) {
      if (!s.themesVus[th.id]) return;
      var a = s.themesAvant[th.id], b = apres[th.id];
      var pa = Math.round(100 * a.ancres / a.total), pb = Math.round(100 * b.ancres / b.total);
      h += '<div class="comp-ligne"><span>' + esc(th.competence) + '</span><span class="num">' + pa + ' % → ' + pb + ' %</span></div>' +
        '<div class="barre" style="margin:4px 0 10px"><span style="transform:scaleX(' + Math.max(0.01, pb / 100) + ')"></span></div>';
    });
    $('fin-competences').innerHTML = h;
    var nv = $('fin-nouveaux');
    nv.innerHTML = s.nouveauxAppris.length ? s.nouveauxAppris.map(function (e) { return '<span lang="fr">' + esc(e.fr) + '</span>'; }).join('') : '<p class="doux">' + esc(t('finAucunNouveau')) + '</p>';
  }

  /* ---------------- Collection ---------------- */
  function rendreCollection() {
    var stats = ancresParTheme();
    var h = '';
    ['technique', 'general'].forEach(function (dom) {
      h += '<h3 class="domaine-titre">' + esc(t('domaines.' + dom)) + '</h3>';
      THEMES.filter(function (th) { return th.domaine === dom; }).forEach(function (th) {
        var s = stats[th.id];
        var frac = s.ancres / s.total;
        var prete = frac >= 0.8;
        var seg = '', nSeg = 20, nA = Math.round(nSeg * s.ancres / s.total), nC = Math.round(nSeg * (s.ancres + s.enCours) / s.total);
        for (var i = 0; i < nSeg; i++) seg += '<i class="' + (i < nA ? 'ancre' : i < nC ? 'en-cours' : '') + '"></i>';
        h += '<div class="competence' + (prete ? ' prete' : '') + '" data-theme="' + th.id + '">' +
          '<div class="comp-tete"><svg class="anneau" viewBox="0 0 64 64" aria-hidden="true" data-frac="' + frac + '"><circle class="fond-anneau" cx="32" cy="32" r="26"/><circle class="val-anneau" cx="32" cy="32" r="26"/></svg>' +
          '<div style="flex:1"><div class="comp-titre">' + esc(th.competence) + '</div><div class="comp-theme">' + esc(th.titre) + ' · <span class="num">' + esc(t('ancresSur', { x: s.ancres, y: s.total })) + '</span></div>' +
          (prete ? '<div class="badge-pret">✓ ' + esc(t('competencePrete')) + '</div>' : '') + '</div></div>' +
          '<div class="segments" aria-hidden="true">' + seg + '</div>' +
          '<button type="button" class="lien-btn" aria-expanded="false">' + esc(t('voirMots')) + '</button><div class="vignettes cache"></div></div>';
      });
    });
    var zone = $('collection');
    zone.innerHTML = h;
    zone.querySelectorAll('.anneau').forEach(function (svg) { anneau(svg, +svg.getAttribute('data-frac')); });
    zone.querySelectorAll('.competence .lien-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var bloc = b.parentNode, grille = bloc.querySelector('.vignettes');
        var ouvert = b.getAttribute('aria-expanded') === 'true';
        if (!ouvert && !grille.innerHTML) {
          grille.innerHTML = VOC.filter(function (e) { return e.theme === bloc.getAttribute('data-theme'); }).map(function (e) {
            var c = P.cartes[e.id];
            var cl = M.estAncree(c) ? 'ancre' : c && c.etat !== 'nouvelle' ? 'en-cours' : '';
            return '<div class="vignette ' + cl + '" lang="fr" title="' + esc(e.ar) + '">' + esc(e.fr) + '</div>';
          }).join('');
        }
        grille.classList.toggle('cache', ouvert);
        b.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
        b.textContent = ouvert ? t('voirMots') : t('masquerMots');
      });
    });
  }

  /* ---------------- Sprint (ne modifie jamais la progression) ---------------- */
  var sprint = null;
  function ouvrirSprint() {
    Son.debloquer();
    afficherEcran('sprint');
    $('chrono').textContent = '60';
    $('sprint-zone').innerHTML = '<div class="bloc"><p>' + esc(t('sprintPret')) + '</p><p class="doux num">' + esc(t('sprintRecord')) + ' : ' + (P.sprint.record || 0) + '</p></div>' +
      '<button type="button" class="btn btn-principal" id="btn-sprint-go">' + esc(t('sprintGo')) + '</button>';
    $('btn-sprint-go').addEventListener('click', lancerSprint);
    $('btn-sprint-go').focus({ preventScroll: true });
  }
  function lancerSprint() {
    var actif = vocabActif();
    var connues = M.melangerTableau(actif.filter(function (e) { var c = P.cartes[e.id]; return c && c.etat !== 'nouvelle'; }));
    var autres = M.melangerTableau(actif.filter(function (e) { var c = P.cartes[e.id]; return !c || c.etat === 'nouvelle'; }));
    sprint = { file: connues.concat(autres), pos: 0, bonnes: 0, total: 0, fin: Date.now() + 60000, bloque: false };
    sprint.minuteur = setInterval(tickSprint, 200);
    questionSprint();
  }
  function tickSprint() {
    if (!sprint) return;
    var reste = Math.max(0, Math.ceil((sprint.fin - Date.now()) / 1000));
    $('chrono').textContent = reste;
    if (reste <= 0) terminerSprint();
  }
  function questionSprint() {
    var e = sprint.file[sprint.pos % sprint.file.length];
    var options = M.melangerTableau([e].concat(distracteurs(e, 3)));
    sprint.courante = { e: e, options: options };
    var h = '<p class="sprint-score num">' + sprint.bonnes + ' ✓</p><div class="face" style="min-height:150px;margin:8px 0 12px"><p class="mot-ar" lang="ar" dir="rtl">' + arHTML(e.ar) + '</p><div class="nature">' + esc(t('natures.' + e.nature)) + '</div></div><div class="options">';
    options.forEach(function (o, i) { h += '<button type="button" class="option" data-i="' + i + '" lang="fr"><kbd>' + (i + 1) + '</kbd><span>' + esc(o.fr) + '</span></button>'; });
    $('sprint-zone').innerHTML = h + '</div>';
    $('sprint-zone').querySelectorAll('.option').forEach(function (b) { b.addEventListener('click', function () { repondreSprint(+b.getAttribute('data-i')); }); });
  }
  function repondreSprint(i) {
    if (!sprint || sprint.bloque || !sprint.courante.options[i]) return;
    sprint.bloque = true;
    var juste = sprint.courante.options[i].id === sprint.courante.e.id;
    sprint.total++;
    if (juste) sprint.bonnes++;
    Son.jouer(juste ? 'juste' : 'faux');
    var bs = $('sprint-zone').querySelectorAll('.option');
    bs.forEach(function (b, k) { if (sprint.courante.options[k].id === sprint.courante.e.id) b.classList.add('juste'); else if (k === i) b.classList.add('faux'); });
    setTimeout(function () {
      if (!sprint) return;
      sprint.bloque = false;
      sprint.pos++;
      if (Date.now() < sprint.fin) questionSprint();
    }, juste ? 250 : 700);
  }
  function terminerSprint() {
    if (!sprint) return;
    clearInterval(sprint.minuteur);
    var s = sprint;
    sprint = null;
    var record = s.bonnes > (P.sprint.record || 0);
    if (record) { P.sprint.record = s.bonnes; sauver(); }
    Son.jouer(record ? 'promotion' : 'fin');
    $('chrono').textContent = '0';
    $('sprint-zone').innerHTML = (record ? '<p class="message" style="color:var(--accent-lien);font-weight:700">' + esc(t('sprintNouveauRecord')) + '</p>' : '') +
      '<div class="stats"><div class="stat"><div class="v num" id="sp-b">0</div><div class="l">' + esc(t('sprintBonnes')) + '</div></div>' +
      '<div class="stat"><div class="v num" id="sp-p">0</div><div class="l">' + esc(t('sprintPrecision')) + '</div></div>' +
      '<div class="stat"><div class="v num">' + (P.sprint.record || 0) + '</div><div class="l">' + esc(t('sprintRecord')) + '</div></div></div>' +
      '<div class="btn-ligne"><button type="button" class="btn" id="sp-accueil">' + esc(t('retourAccueil')) + '</button><button type="button" class="btn btn-principal" id="sp-rejouer" style="font-size:1rem;min-height:52px">' + esc(t('rejouer')) + '</button></div>';
    animerNombre($('sp-b'), s.bonnes);
    animerNombre($('sp-p'), s.total ? Math.round(100 * s.bonnes / s.total) : 0, ' %');
    $('sp-accueil').addEventListener('click', function () { afficherEcran('accueil'); });
    $('sp-rejouer').addEventListener('click', lancerSprint);
  }
  function quitterSprint() {
    if (sprint) { clearInterval(sprint.minuteur); sprint = null; }
    afficherEcran('accueil');
  }

  /* ---------------- Réglages ---------------- */
  function rendreReglages() {
    var r = P.reglages;
    function segmente(cle, valeurs, libelles) {
      return '<div class="segmente" role="group" data-cle="' + cle + '">' + valeurs.map(function (v) {
        return '<button type="button" data-v="' + v + '" aria-pressed="' + (r[cle] === v) + '">' + esc(libelles[v]) + '</button>';
      }).join('') + '</div>';
    }
    function inter(cle) {
      return '<div class="reglage"><label id="l-' + cle + '">' + esc(t(cle)) + '</label><button type="button" class="interrupteur" role="switch" data-cle="' + cle + '" aria-labelledby="l-' + cle + '" aria-checked="' + !!r[cle] + '"></button></div>';
    }
    function nombre(cle, min, max) {
      return '<div class="reglage"><label for="n-' + cle + '">' + esc(t(cle)) + '</label><input type="number" inputmode="numeric" id="n-' + cle + '" data-cle="' + cle + '" min="' + min + '" max="' + max + '" value="' + r[cle] + '"></div>';
    }
    var h = '';
    h += '<div class="bloc"><h3>' + esc(t('apparence')) + '</h3>' + segmente('apparence', ['systeme', 'sombre', 'clair'], t('apparences')) + '</div>';
    h += '<div class="bloc"><h3>' + esc(t('modeReponse')) + '</h3>' + segmente('mode', ['retourner', 'qcm'], t('modes')) + inter('exigerArticle') + inter('melanger') + '</div>';
    h += '<div class="bloc">' + nombre('objectif', 5, 300) + nombre('longueur', 5, 100) + nombre('maxNouvelles', 0, 100) + nombre('maxRevues', 10, 999) + '</div>';
    h += '<div class="bloc">' + inter('son') + inter('animationsReduites') + '</div>';
    h += '<div class="bloc"><h3>' + esc(t('niveauxActifs')) + '</h3><div class="puces">' + ['A2', 'B1', 'B2'].map(function (n) {
      return '<button type="button" class="puce" data-niveau="' + n + '" aria-pressed="' + !!r.niveaux[n] + '">' + n + '</button>';
    }).join('') + '</div></div>';
    h += '<div class="bloc"><h3>' + esc(t('themesActifs')) + '</h3><div class="puces" style="margin-bottom:8px"><button type="button" class="puce" id="th-tout">' + esc(t('tout')) + '</button><button type="button" class="puce" id="th-rien">' + esc(t('rien')) + '</button></div>';
    ['technique', 'general'].forEach(function (dom) {
      h += '<p class="doux" style="margin:10px 0 6px">' + esc(t('domaines.' + dom)) + '</p><div class="puces">';
      THEMES.filter(function (th) { return th.domaine === dom; }).forEach(function (th) {
        h += '<button type="button" class="puce" data-theme-id="' + th.id + '" aria-pressed="' + (r.themesInactifs.indexOf(th.id) < 0) + '">' + esc(th.titre) + '</button>';
      });
      h += '</div>';
    });
    h += '</div>';
    var pb = VOC.filter(function (e) { return M.estProbleme(P.cartes[e.id]); });
    h += '<div class="bloc"><h3>' + esc(t('problematiques')) + '</h3><p class="doux">' + esc(pb.length ? t('problematiquesInfo') : t('aucuneProblematique')) + '</p>';
    if (pb.length) h += '<div class="liste-mots">' + pb.map(function (e) { return '<span lang="fr" title="' + esc(e.ar) + '">' + esc(e.fr) + ' · <span lang="ar" dir="rtl">' + arHTML(e.ar) + '</span></span>'; }).join('') + '</div>';
    h += '</div>';
    h += '<div class="bloc"><h3>' + esc(t('sauvegarde')) + '</h3><div class="btn-ligne" style="margin-top:0"><button type="button" class="btn" id="btn-export">' + esc(t('exporter')) + '</button><button type="button" class="btn" id="btn-import">' + esc(t('importer')) + '</button></div>' +
      '<button type="button" class="btn btn-danger" id="btn-reset" style="margin-top:12px">' + esc(t('reset')) + '</button></div>';
    h += '<p class="doux" style="text-align:center">' + esc(t('vieprivee')) + '</p><p class="doux num" style="text-align:center" id="version-app"></p>';
    var zone = $('reglages');
    zone.innerHTML = h;

    zone.querySelectorAll('.segmente').forEach(function (g) {
      g.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          r[g.getAttribute('data-cle')] = b.getAttribute('data-v');
          g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          sauver(); appliquerApparence();
        });
      });
    });
    zone.querySelectorAll('.interrupteur').forEach(function (b) {
      b.addEventListener('click', function () {
        var cle = b.getAttribute('data-cle');
        r[cle] = !r[cle];
        b.setAttribute('aria-checked', r[cle] ? 'true' : 'false');
        sauver(); appliquerApparence(); majBoutonSon();
      });
    });
    zone.querySelectorAll('input[type="number"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var v = Math.round(+inp.value), min = +inp.min, max = +inp.max;
        if (!isFinite(v)) v = r[inp.getAttribute('data-cle')];
        v = Math.max(min, Math.min(max, v));
        inp.value = v;
        r[inp.getAttribute('data-cle')] = v;
        sauver();
      });
    });
    zone.querySelectorAll('[data-niveau]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = b.getAttribute('data-niveau');
        r.niveaux[n] = !r.niveaux[n];
        if (!r.niveaux.A2 && !r.niveaux.B1 && !r.niveaux.B2) r.niveaux[n] = true; // au moins un niveau
        b.setAttribute('aria-pressed', r.niveaux[n] ? 'true' : 'false');
        sauver();
      });
    });
    function majThemes() {
      zone.querySelectorAll('[data-theme-id]').forEach(function (b) { b.setAttribute('aria-pressed', r.themesInactifs.indexOf(b.getAttribute('data-theme-id')) < 0 ? 'true' : 'false'); });
      sauver();
    }
    zone.querySelectorAll('[data-theme-id]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-theme-id'), i = r.themesInactifs.indexOf(id);
        if (i >= 0) r.themesInactifs.splice(i, 1);
        else if (r.themesInactifs.length < THEMES.length - 1) r.themesInactifs.push(id);
        majThemes();
      });
    });
    $('th-tout').addEventListener('click', function () { r.themesInactifs = []; majThemes(); });
    $('th-rien').addEventListener('click', function () { r.themesInactifs = THEMES.slice(1).map(function (th) { return th.id; }); majThemes(); });

    $('btn-export').addEventListener('click', function () {
      var blob = new Blob([S.exporter(P)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lexique-ste-progression-' + aujourdhui() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $('btn-import').addEventListener('click', function () { $('fichier-import').click(); });
    var resetArme = false;
    $('btn-reset').addEventListener('click', function () {
      var b = $('btn-reset');
      if (!resetArme) {
        resetArme = true;
        b.textContent = t('resetConfirme');
        setTimeout(function () { if (resetArme) { resetArme = false; b.textContent = t('reset'); } }, 5000);
        return;
      }
      S.effacer();
      var reglages = P.reglages;
      P = S.progressionVide();
      P.reglages = reglages;
      sauver();
      toast(t('resetFait'));
      rendreReglages();
    });
    if (window.caches) caches.keys().then(function (cles) {
      var v = cles.filter(function (k) { return k.indexOf('lexique-ste') === 0; })[0];
      if (v) $('version-app').textContent = t('version', { x: v.replace('lexique-ste-', '') });
    }).catch(function () { /* rien */ });
  }

  $('fichier-import').addEventListener('change', function (ev) {
    var f = ev.target.files && ev.target.files[0];
    if (!f) return;
    var lecteur = new FileReader();
    lecteur.onload = function () {
      var p = S.importer(lecteur.result);
      if (!p) { toast(t('importErreur')); return; }
      P = p; sauver(); appliquerApparence(); majBoutonSon();
      toast(t('importOk'));
      rendreReglages();
    };
    lecteur.readAsText(f);
    ev.target.value = '';
  });

  /* ---------------- Événements ---------------- */
  $('btn-commencer').addEventListener('click', demarrerSession);
  $('btn-sprint').addEventListener('click', ouvrirSprint);
  $('btn-collection').addEventListener('click', function () { rendreCollection(); afficherEcran('collection'); });
  $('btn-reglages').addEventListener('click', function () { rendreReglages(); afficherEcran('reglages'); });
  $('btn-son').addEventListener('click', function () { P.reglages.son = !P.reglages.son; sauver(); majBoutonSon(); Son.jouer('clic'); });
  $('btn-quitter').addEventListener('click', quitterSession);
  $('btn-fin-accueil').addEventListener('click', function () { afficherEcran('accueil'); });
  $('btn-fin-encore').addEventListener('click', demarrerSession);
  document.querySelectorAll('.btn-retour').forEach(function (b) {
    b.addEventListener('click', function () { if (ecranCourant === 'sprint') quitterSprint(); else afficherEcran('accueil'); });
  });
  $('carte').addEventListener('click', function () { retourner(); });

  document.addEventListener('keydown', function (ev) {
    if ($('promotion').classList.contains('visible')) return;
    var k = ev.key;
    var dansChamp = ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT');
    if (k === 'Escape') {
      ev.preventDefault();
      if (ecranCourant === 'session') quitterSession();
      else if (ecranCourant === 'sprint') quitterSprint();
      else if (ecranCourant !== 'accueil') afficherEcran('accueil');
      return;
    }
    if (ecranCourant === 'session' && sess && sess.courante) {
      var cr = sess.courante;
      if (dansChamp && !cr.repondu) return; // la saisie gère Entrée
      if (k === ' ' || k === 'Spacebar') {
        if (ev.target.tagName === 'BUTTON' && ev.target.id !== 'carte' && !ev.target.classList.contains('note')) return;
        ev.preventDefault();
        retourner();
        return;
      }
      if (/^[1-4]$/.test(k)) {
        ev.preventDefault();
        if (cr.type === 'qcm' && !cr.repondu) choisirOption(+k - 1);
        else if (cr.repondu && cr.juste === false) noter(1);
        else noter(+k);
        return;
      }
      if (k === 'Enter') {
        if (ev.target.tagName === 'BUTTON' && ev.target.id !== 'carte') return; // le bouton focalisé agit
        ev.preventDefault();
        if (cr.type === 'retourner' && !cr.decouvert) retourner();
        else if (cr.repondu || cr.decouvert) noter(cr.juste === false ? 1 : (cr.suggere || 3));
      }
      return;
    }
    if (ecranCourant === 'sprint' && sprint && /^[1-4]$/.test(k)) { ev.preventDefault(); repondreSprint(+k - 1); }
  });

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    if (mq.addEventListener) mq.addEventListener('change', appliquerApparence);
  }

  /* ---------------- Service worker et mise à jour ---------------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    var rechargeDemandee = false;
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      function proposer(w) {
        $('bandeau-maj').classList.remove('cache');
        $('btn-maj').onclick = function () { rechargeDemandee = true; w.postMessage({ type: 'SKIP_WAITING' }); };
      }
      if (reg.waiting && navigator.serviceWorker.controller) proposer(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) proposer(w); });
      });
    }).catch(function () { /* hors ligne ou non pris en charge */ });
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (rechargeDemandee) location.reload(); });
  }

  /* ---------------- Démarrage ---------------- */
  appliquerApparence();
  appliquerTextes();
  majBoutonSon();
  rendreAccueil();
  window.LexiqueSTE = { progression: function () { return P; }, demarrerSession: demarrerSession }; // aide au débogage
})();
