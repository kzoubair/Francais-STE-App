/*
 * Lexique STE — correcteur des réponses écrites (testé sous Node).
 *
 * verifier(saisie, entree, { exigerArticle }) →
 *   { statut: 'exact' | 'accents' | 'faute' | 'article' | 'faux',
 *     juste: bool, attendu: forme exacte à réafficher,
 *     position: index de la lettre fautive dans la saisie (statut 'faute') }
 * - majuscules, espaces et ponctuation tolérés ;
 * - accents oubliés acceptés mais signalés (e pour é/è/ê, a pour à/â, c pour ç, oe pour œ…) ;
 * - une seule lettre d'écart acceptée (mots de 4 lettres ou plus) ;
 * - article exigé par défaut pour les noms (le, la, l', les, un, une selon le genre).
 */
(function (racine) {
  'use strict';

  var SANS_ACCENT = {
    'à': 'a', 'â': 'a', 'ä': 'a', 'á': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'î': 'i', 'ï': 'i',
    'ô': 'o', 'ö': 'o', 'û': 'u', 'ù': 'u', 'ü': 'u', 'ç': 'c', 'ÿ': 'y', 'œ': 'oe', 'æ': 'ae'
  };

  /* Minuscules, apostrophes unifiées, ponctuation retirée, espaces normalisés. */
  function nettoyer(s) {
    return String(s || '').toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/[.,;:!?«»"()…]/g, ' ')
      .replace(/\s*'\s*/g, "'")
      .replace(/\s*-\s*/g, '-')
      .replace(/[\s  ]+/g, ' ')
      .trim();
  }
  function sansAccents(s) {
    var r = '';
    for (var i = 0; i < s.length; i++) r += SANS_ACCENT[s[i]] !== undefined ? SANS_ACCENT[s[i]] : s[i];
    return r;
  }

  /* Distance d'édition limitée : renvoie la position de l'unique écart dans a (saisie), ou -1 si > 1 écart. */
  function ecartUnique(a, b) {
    if (a === b) return null;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return -1;
    var i = 0;
    while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) ? i : -1;          // substitution
    if (la > lb) return a.slice(i + 1) === b.slice(i) ? i : -1;                // lettre en trop
    return a.slice(i) === b.slice(i + 1) ? Math.min(i, la - 1) : -1;          // lettre manquante
  }

  var ARTICLES = { m: ['le', 'un'], f: ['la', 'une'] };
  /* Sépare l'article d'une saisie : { article, mot } */
  function separerArticle(s) {
    var m = s.match(/^(les|le|la|une|un|des|l')(?:\s|(?<=l'))(.*)$/);
    if (!m || !m[2]) return { article: '', mot: s };
    return { article: m[1], mot: m[2] };
  }

  /* Formes acceptées pour une entrée : [{ complet, mot, article }] */
  function formesAcceptees(entree) {
    var liste = [entree.fr].concat(entree.alt || []);
    return liste.map(function (f) {
      var n = nettoyer(f);
      var sep = entree.nature === 'nom' ? separerArticle(n) : { article: '', mot: n };
      return { complet: n, mot: sep.mot, article: sep.article, affichage: f };
    });
  }

  function articleValide(art, entree, formeArticle) {
    if (!art) return false;
    if (art === formeArticle) return true;
    if (formeArticle === 'les' || art === 'les' || art === 'des') return formeArticle === 'les' && (art === 'les' || art === 'des');
    var g = entree.genre;
    if (formeArticle === "l'") return art === "l'" || art === (g === 'f' ? 'une' : 'un');
    return (ARTICLES[g] || []).indexOf(art) >= 0;
  }

  function verifier(saisie, entree, opts) {
    opts = opts || {};
    var exiger = opts.exigerArticle !== false;
    var s = nettoyer(saisie);
    var attendu = entree.fr;
    if (!s) return { statut: 'faux', juste: false, attendu: attendu };
    var estNom = entree.nature === 'nom';
    var sep = estNom ? separerArticle(s) : { article: '', mot: s };
    var formes = formesAcceptees(entree);
    var meilleur = null;

    formes.forEach(function (f) {
      var r = comparer(sep.mot, f.mot);
      if (!r) return;
      // contrôle de l'article
      var artOk = !estNom || !f.article || articleValide(sep.article, entree, f.article);
      if (estNom && f.article && !sep.article && !exiger) artOk = true;
      var res;
      if (!artOk) res = { statut: sep.article ? 'faux' : 'article', juste: false, attendu: f.affichage };
      else res = { statut: r.statut, juste: true, attendu: f.affichage, position: r.position !== undefined ? r.position + (s.length - sep.mot.length) : undefined };
      if (!meilleur || rangStatut(res) < rangStatut(meilleur)) meilleur = res;
    });
    return meilleur || { statut: 'faux', juste: false, attendu: attendu };
  }
  function rangStatut(r) { return { exact: 0, accents: 1, faute: 2, article: 3, faux: 4 }[r.statut]; }

  /* Compare un mot saisi (sans article) à une forme attendue. */
  function comparer(saisi, attendu) {
    if (saisi === attendu) return { statut: 'exact' };
    var a = sansAccents(saisi), b = sansAccents(attendu);
    if (a === b) return { statut: 'accents' };
    if (b.replace(/[-' ]/g, '') === a.replace(/[-' ]/g, '')) return { statut: 'accents' }; // tiret ou espace oublié
    if (b.length >= 4) {
      var pos = ecartUnique(saisi, attendu);
      if (pos !== null && pos >= 0) return { statut: 'faute', position: pos };
      // une faute + accents oubliés : on compare sans accents (la position reste approximative)
      var pos2 = ecartUnique(a, b);
      if (pos2 !== null && pos2 >= 0 && a.length === saisi.length) return { statut: 'faute', position: pos2 };
    }
    return null;
  }

  /* Indice : première lettre + longueur de chaque mot (« d_______ », « l_ t______ »). */
  function indice(entree) {
    return entree.fr.split(/(\s|'|-)/).map(function (m) {
      if (/^(\s|'|-)$/.test(m) || !m) return m;
      return m[0] + m.slice(1).replace(/./g, '_');
    }).join('');
  }

  var API = { nettoyer: nettoyer, sansAccents: sansAccents, ecartUnique: ecartUnique, verifier: verifier, indice: indice };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else racine.Correcteur = API;
})(this);
