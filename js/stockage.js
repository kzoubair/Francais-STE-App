/*
 * Lexique STE — stockage de la progression (localStorage versionné).
 * Tout reste sur l'appareil. Rien n'est envoyé.
 */
(function (racine) {
  'use strict';
  var CLE = 'lexique-ste:progression';
  var VERSION = 1;

  function reglagesParDefaut() {
    return {
      apparence: 'sombre',        // systeme | sombre | clair
      mode: 'retourner',          // retourner | qcm
      exigerArticle: true,
      melanger: false,
      objectif: 30,
      longueur: 20,
      maxNouvelles: 15,
      maxRevues: 150,
      son: true,
      animationsReduites: false,
      themesInactifs: [],
      niveaux: { A2: true, B1: true, B2: true }
    };
  }

  function progressionVide() {
    return {
      app: 'lexique-ste',
      version: VERSION,
      cartes: {},                 // id → état de la carte (moteur.js)
      jours: {},                  // 'AAAA-MM-JJ' → { cartes, justes, nouvelles, revues }
      meilleurRang: 0,
      sprint: { record: 0 },
      reglages: reglagesParDefaut()
    };
  }

  /* Complète une progression ancienne ou partielle (migration). */
  function migrer(p) {
    var base = progressionVide();
    if (!p || typeof p !== 'object') return base;
    var r = base;
    r.cartes = p.cartes && typeof p.cartes === 'object' ? p.cartes : {};
    r.jours = p.jours && typeof p.jours === 'object' ? p.jours : {};
    r.meilleurRang = +p.meilleurRang || 0;
    r.sprint = { record: (p.sprint && +p.sprint.record) || 0 };
    var reg = p.reglages || {};
    for (var k in base.reglages) if (reg[k] !== undefined) r.reglages[k] = reg[k];
    r.reglages.niveaux = Object.assign({ A2: true, B1: true, B2: true }, reg.niveaux || {});
    r.version = VERSION;
    return r;
  }

  function lireBrut() {
    try { return window.localStorage.getItem(CLE); } catch (e) { return null; }
  }

  function charger() {
    var brut = lireBrut();
    if (!brut) return progressionVide();
    try { return migrer(JSON.parse(brut)); } catch (e) { return progressionVide(); }
  }

  function sauver(p) {
    try { window.localStorage.setItem(CLE, JSON.stringify(p)); return true; } catch (e) { return false; }
  }

  function exporter(p) { return JSON.stringify(p, null, 1); }

  /* Renvoie la progression importée, ou null si le fichier n'est pas valable. */
  function importer(texte) {
    try {
      var p = JSON.parse(texte);
      if (!p || p.app !== 'lexique-ste' || typeof p.cartes !== 'object') return null;
      return migrer(p);
    } catch (e) { return null; }
  }

  function effacer() { try { window.localStorage.removeItem(CLE); } catch (e) { /* rien */ } }

  /* Date locale 'AAAA-MM-JJ'. */
  function jourLocal(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, j = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (j < 10 ? '0' : '') + j;
  }

  var API = { CLE: CLE, VERSION: VERSION, progressionVide: progressionVide, reglagesParDefaut: reglagesParDefaut, migrer: migrer, charger: charger, sauver: sauver, exporter: exporter, importer: importer, effacer: effacer, jourLocal: jourLocal };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else racine.Stockage = API;
})(this);
