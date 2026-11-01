/*
 * Lexique STE — moteur de répétition espacée (logique Anki, 4 boutons).
 * Aucun accès au DOM : ce fichier est testé sous Node (tests/moteur.test.js).
 *
 * État d'une carte :
 *   { etat: 'nouvelle'|'apprentissage'|'revision'|'reapprentissage',
 *     etape, facilite, intervalle (jours), echeance (ms), echecs, vues, intervalleApres }
 */
(function (racine) {
  'use strict';

  var MINUTE = 60 * 1000;
  var JOUR = 24 * 60 * MINUTE;

  var PARAMS = {
    facInitiale: 2.5,
    facMin: 1.3,
    deltaFac: { 1: -0.20, 2: -0.15, 3: 0, 4: 0.15 },
    etapes: [1, 10],              // minutes (cartes neuves)
    etapeReapprentissage: 10,     // minutes
    sortieCorrect: 1,             // jours
    sortieFacile: 4,              // jours
    multDifficile: 1.2,
    bonusFacile: 1.3,
    variation: 0.05,              // ±5 %
    seuilAncre: 21,               // jours
    seuilProbleme: 8              // échecs
  };

  var NOTE = { ENCORE: 1, DIFFICILE: 2, CORRECT: 3, FACILE: 4 };

  function nouvelleCarte() {
    return { etat: 'nouvelle', etape: 0, facilite: PARAMS.facInitiale, intervalle: 0, echeance: 0, echecs: 0, vues: 0 };
  }

  function copie(c) { var o = {}; for (var k in c) o[k] = c[k]; return o; }

  /* Variation aléatoire de ±5 % (au moins ±1 jour au-delà de 20 jours). */
  function varier(jours, alea) {
    if (jours < 3) return jours;
    var r = (alea ? alea() : Math.random()) * 2 - 1; // [-1, 1[
    return Math.max(1, Math.round(jours * (1 + r * PARAMS.variation)));
  }

  /*
   * Applique une note à une carte. Renvoie une NOUVELLE carte (pas de mutation).
   * opts.alea : fonction aléatoire injectable (tests) ; opts.sansVariation : pour l'aperçu.
   */
  function noter(carte, note, maintenant, opts) {
    opts = opts || {};
    var c = copie(carte || nouvelleCarte());
    var alea = opts.sansVariation ? null : (opts.alea || Math.random);
    var fuzz = function (j) { return opts.sansVariation ? j : varier(j, alea); };
    c.vues = (c.vues || 0) + 1;

    if (c.etat === 'nouvelle' || c.etat === 'apprentissage') {
      c.etat = 'apprentissage';
      var etapes = PARAMS.etapes;
      if (note === NOTE.ENCORE) {
        c.etape = 0;
        c.echeance = maintenant + etapes[0] * MINUTE;
      } else if (note === NOTE.DIFFICILE) {
        var dureeDiff = c.etape === 0 && etapes.length > 1 ? (etapes[0] + etapes[1]) / 2 : etapes[c.etape];
        c.echeance = maintenant + dureeDiff * MINUTE;
      } else if (note === NOTE.CORRECT) {
        if (c.etape + 1 < etapes.length) {
          c.etape += 1;
          c.echeance = maintenant + etapes[c.etape] * MINUTE;
        } else {
          diplomer(c, PARAMS.sortieCorrect, maintenant);
        }
      } else if (note === NOTE.FACILE) {
        diplomer(c, PARAMS.sortieFacile, maintenant);
      }
      return c;
    }

    if (c.etat === 'reapprentissage') {
      if (note === NOTE.ENCORE || note === NOTE.DIFFICILE) {
        c.echeance = maintenant + PARAMS.etapeReapprentissage * MINUTE;
      } else {
        var base = c.intervalleApres || 1;
        diplomer(c, note === NOTE.FACILE ? base + 1 : base, maintenant);
      }
      return c;
    }

    // Révision
    var ancien = Math.max(1, c.intervalle || 1);
    c.facilite = Math.max(PARAMS.facMin, Math.round((c.facilite + PARAMS.deltaFac[note]) * 100) / 100);
    if (note === NOTE.ENCORE) {
      c.echecs = (c.echecs || 0) + 1;
      c.etat = 'reapprentissage';
      c.intervalleApres = Math.max(1, Math.round(ancien / 2));
      c.echeance = maintenant + PARAMS.etapeReapprentissage * MINUTE;
      return c;
    }
    var nouv;
    if (note === NOTE.DIFFICILE) nouv = ancien * PARAMS.multDifficile;
    else if (note === NOTE.CORRECT) nouv = ancien * c.facilite;
    else nouv = ancien * c.facilite * PARAMS.bonusFacile;
    nouv = Math.max(ancien + 1, Math.round(nouv));
    c.intervalle = fuzz(nouv);
    c.echeance = maintenant + c.intervalle * JOUR;
    return c;
  }

  function diplomer(c, jours, maintenant) {
    c.etat = 'revision';
    c.etape = 0;
    c.intervalle = jours;
    c.echeance = maintenant + jours * JOUR;
    delete c.intervalleApres;
  }

  /* Délai (ms) prévu pour chaque bouton, sans variation aléatoire. */
  function previsions(carte, maintenant) {
    var res = {};
    [1, 2, 3, 4].forEach(function (n) {
      res[n] = noter(carte, n, maintenant, { sansVariation: true }).echeance - maintenant;
    });
    return res;
  }

  /* Texte court d'un délai : « 1 min », « 10 min », « 1 j », « 3 mois »… */
  function formaterDelai(ms) {
    var min = Math.round(ms / MINUTE);
    if (min < 60) return Math.max(1, min) + ' min';
    var h = Math.round(min / 60);
    if (h < 24) return h + ' h';
    var j = Math.round(ms / JOUR);
    if (j < 31) return j + ' j';
    var mois = Math.round(j / 30);
    if (mois < 12) return mois + ' mois';
    return (Math.round(j / 36.5) / 10).toString().replace('.', ',') + ' an' + (j >= 730 ? 's' : '');
  }

  function estAncree(carte) { return !!carte && carte.etat === 'revision' && carte.intervalle >= PARAMS.seuilAncre; }
  function estProbleme(carte) { return !!carte && (carte.echecs || 0) >= PARAMS.seuilProbleme; }
  function estDue(carte, maintenant) { return !!carte && carte.etat !== 'nouvelle' && carte.echeance <= maintenant; }

  /* ---------------------------------------------------------------- */
  /* Ordre des nouvelles cartes : niveau croissant, puis thèmes alternés
   * par paquets de 5 (ou mélange complet si melanger = true).          */
  var RANG_NIVEAU = { A2: 0, B1: 1, B2: 2 };
  function melangerTableau(t, alea) {
    t = t.slice();
    for (var i = t.length - 1; i > 0; i--) {
      var j = Math.floor((alea ? alea() : Math.random()) * (i + 1));
      var x = t[i]; t[i] = t[j]; t[j] = x;
    }
    return t;
  }
  function ordonnerNouvelles(entrees, melanger, alea) {
    if (melanger) return melangerTableau(entrees, alea);
    var res = [];
    ['A2', 'B1', 'B2'].forEach(function (niv) {
      var parTheme = {};
      var ordreThemes = [];
      entrees.filter(function (e) { return e.niveau === niv; }).forEach(function (e) {
        if (!parTheme[e.theme]) { parTheme[e.theme] = []; ordreThemes.push(e.theme); }
        parTheme[e.theme].push(e);
      });
      var reste = true;
      while (reste) {
        reste = false;
        ordreThemes.forEach(function (t) {
          var paquet = parTheme[t].splice(0, 5);
          if (paquet.length) { res.push.apply(res, paquet); reste = true; }
        });
      }
    });
    return res;
  }

  /*
   * Construit la file d'une session.
   *  vocab : entrées actives (thèmes et niveaux filtrés)
   *  cartes : { id → état }
   *  limites : { nouvellesRestantes, revuesRestantes, longueur, melanger }
   */
  function construireFile(vocab, cartes, maintenant, limites, alea) {
    var dues = [];
    var neuves = [];
    vocab.forEach(function (e) {
      var c = cartes[e.id];
      if (!c || c.etat === 'nouvelle') neuves.push(e);
      else if (c.echeance <= maintenant) dues.push(e);
    });
    dues.sort(function (a, b) { return cartes[a.id].echeance - cartes[b.id].echeance; });
    dues = dues.slice(0, Math.max(0, limites.revuesRestantes));
    neuves = ordonnerNouvelles(neuves, limites.melanger, alea).slice(0, Math.max(0, limites.nouvellesRestantes));
    // Mélange doux : une nouvelle carte toutes les 3 révisions.
    var file = [];
    var i = 0, j = 0;
    while (file.length < limites.longueur && (i < dues.length || j < neuves.length)) {
      if (i < dues.length && (file.length % 4 !== 3 || j >= neuves.length)) file.push(dues[i++]);
      else if (j < neuves.length) file.push(neuves[j++]);
      else file.push(dues[i++]);
    }
    return file;
  }

  /* Prochaine échéance d'apprentissage dans les 20 minutes (pour revoir dans la même session). */
  function prochaineCourte(cartes, ids, maintenant) {
    var meilleur = null;
    ids.forEach(function (id) {
      var c = cartes[id];
      if (c && (c.etat === 'apprentissage' || c.etat === 'reapprentissage') && c.echeance - maintenant < 20 * MINUTE) {
        if (!meilleur || c.echeance < cartes[meilleur].echeance) meilleur = id;
      }
    });
    return meilleur;
  }

  /* ---------------------------------------------------------------- */
  /* Rangs (seuils de base pour 1 500 entrées, ajustés au corpus).    */
  var RANGS_BASE = [
    { nom: 'Élève', seuil: 0 },
    { nom: 'Apprenti électricien', seuil: 40 },
    { nom: 'Technicien', seuil: 100 },
    { nom: 'Bachelier STE', seuil: 220 },
    { nom: 'Étudiant ingénieur', seuil: 400 },
    { nom: 'Ingénieur', seuil: 650 },
    { nom: 'Ingénieur en chef', seuil: 950 }
  ];
  function rangs(total) {
    var f = total / 1500;
    return RANGS_BASE.map(function (r) { return { nom: r.nom, seuil: Math.round(r.seuil * f / 5) * 5 }; });
  }
  function rangPour(nbAncres, total) {
    var liste = rangs(total);
    var idx = 0;
    liste.forEach(function (r, i) { if (nbAncres >= r.seuil) idx = i; });
    return { index: idx, rang: liste[idx], suivant: liste[idx + 1] || null, liste: liste };
  }

  var API = {
    PARAMS: PARAMS, NOTE: NOTE, MINUTE: MINUTE, JOUR: JOUR,
    nouvelleCarte: nouvelleCarte, noter: noter, previsions: previsions, formaterDelai: formaterDelai,
    estAncree: estAncree, estProbleme: estProbleme, estDue: estDue,
    ordonnerNouvelles: ordonnerNouvelles, construireFile: construireFile, prochaineCourte: prochaineCourte,
    melangerTableau: melangerTableau, rangs: rangs, rangPour: rangPour
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else racine.Moteur = API;
})(this);
