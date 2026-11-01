/*
 * Lexique STE — tous les textes de l'interface.
 * Pour ajouter une langue : copier le bloc « fr », le traduire, puis changer LANGUE_INTERFACE.
 * {x} est remplacé par une valeur (nombre, nom…).
 */
(function (racine) {
  'use strict';
  var LANGUE_INTERFACE = 'fr';

  var TEXTES = {
    fr: {
      app: 'Lexique STE',
      sousTitre: 'Le vocabulaire du bac STE, mot après mot.',

      // Accueil
      commencer: 'Réviser',
      aReviser: '{x} à revoir',
      nouveaux: '{x} nouveaux',
      rienAReviser: 'Tout est à jour. Tu peux apprendre de nouveaux mots demain ou lancer un sprint.',
      sessionVide: 'Rien à réviser pour le moment.',
      sprint: 'Sprint 60 s',
      sprintSous: 'QCM rapide, sans effet sur tes révisions',
      collection: 'Mes compétences',
      reglages: 'Réglages',
      objectifJour: 'Objectif du jour',
      cartesSur: '{x} / {y} cartes',
      cartes: 'cartes',
      objectifAtteint: 'Objectif atteint',
      serie: 'Série',
      jours: '{x} jours',
      jour: '{x} jour',
      serieInfo: 'Un jour de repos par semaine ne casse pas la série.',
      rang: 'Rang',
      motsAncres: '{x} mots ancrés',
      ancreInfo: 'Un mot est ancré quand tu le retiens au moins 21 jours.',
      versRang: 'Encore {x} pour devenir {y}',
      rangMax: 'Rang le plus haut atteint. Bravo !',
      calendrier: '30 derniers jours',
      jourActif: 'jour actif',
      jourRepos: 'repos',

      // Carte
      toucher: 'Touche la carte pour la retourner',
      toucherClavier: 'Touche la carte ou appuie sur Espace',
      natures: { nom: 'nom', verbe: 'verbe', adjectif: 'adjectif', adverbe: 'adverbe', expression: 'expression' },
      genres: { m: 'masculin', f: 'féminin' },
      pluriel: 'Pluriel : {x}',
      boutons: { 1: 'Encore', 2: 'Difficile', 3: 'Correct', 4: 'Facile' },
      quitter: 'Quitter',
      carteSur: '{x} / {y}',
      choisis: 'Choisis la bonne traduction',
      ecris: 'Écris le mot en français',
      ecrisArticle: 'Écris le mot en français (avec l\'article)',
      indice: 'Indice : {x}',
      valider: 'Valider',
      jeNeSaisPas: 'Je ne sais pas',
      continuer: 'Continuer',
      bravo: 'Juste !',
      presque: 'Presque : une lettre à corriger.',
      accents: 'Juste, mais attention aux accents.',
      oubliArticle: 'N\'oublie pas l\'article.',
      faux: 'Pas encore. La bonne réponse :',
      reponseAttendue: 'Forme exacte : {x}',
      combo: 'combo',
      accentsTitre: 'Lettres accentuées',

      // Fin de session
      finTitre: 'Session terminée',
      finVues: 'cartes vues',
      finReussite: 'de réussite',
      finAncres: 'mots ancrés au total',
      finCombo: 'plus long combo',
      finNouveaux: 'Nouveaux mots appris',
      finAucunNouveau: 'Pas de nouveau mot cette fois.',
      finCompetences: 'Compétences',
      finRang: 'Encore {x} mots ancrés pour devenir {y}.',
      finRangMax: 'Tu as atteint le rang le plus haut.',
      retourAccueil: 'Accueil',
      encoreUne: 'Encore une session',

      // Promotion
      promotion: 'Nouveau rang',

      // Collection
      collectionTitre: 'Mes compétences',
      domaines: { technique: 'Sciences et technologies électriques', general: 'Français de tous les jours' },
      competencePrete: 'Compétence prête',
      ancresSur: '{x} / {y} ancrés',
      voirMots: 'Voir les mots',
      masquerMots: 'Masquer',
      legende: 'Gris : pas encore vu · Bleu : en cours · Doré : ancré',

      // Sprint
      sprintTitre: 'Sprint',
      sprintPret: '60 secondes, un maximum de bonnes réponses. Ton travail de révision n\'est pas modifié.',
      sprintGo: 'Partir',
      sprintBonnes: 'bonnes réponses',
      sprintPrecision: 'précision',
      sprintRecord: 'record',
      sprintNouveauRecord: 'Nouveau record !',
      rejouer: 'Rejouer',

      // Réglages
      reglagesTitre: 'Réglages',
      apparence: 'Apparence',
      apparences: { systeme: 'Système', sombre: 'Sombre', clair: 'Clair' },
      modeReponse: 'Mode de réponse',
      modes: { retourner: 'Carte à retourner', qcm: 'QCM et saisie' },
      exigerArticle: 'Exiger l\'article à l\'écrit',
      melanger: 'Mélanger les nouvelles cartes (Shuffle)',
      objectif: 'Objectif du jour (cartes)',
      longueur: 'Longueur d\'une session (cartes)',
      maxNouvelles: 'Nouvelles cartes par jour',
      maxRevues: 'Révisions par jour',
      son: 'Sons',
      animationsReduites: 'Réduire les animations',
      themesActifs: 'Thèmes actifs',
      niveauxActifs: 'Niveaux actifs',
      tout: 'Tout',
      rien: 'Rien',
      problematiques: 'Cartes difficiles',
      problematiquesInfo: 'Ces mots ont été ratés 8 fois ou plus. Relis les exemples à voix haute.',
      aucuneProblematique: 'Aucune carte difficile. Continue comme ça.',
      sauvegarde: 'Sauvegarde',
      exporter: 'Exporter ma progression',
      importer: 'Importer une progression',
      importOk: 'Progression importée.',
      importErreur: 'Ce fichier n\'est pas une sauvegarde de Lexique STE.',
      reset: 'Tout remettre à zéro',
      resetConfirme: 'Toucher encore pour confirmer : tout sera effacé',
      resetFait: 'Progression effacée.',
      vieprivee: 'Aucun compte, aucune donnée envoyée : ta progression reste sur ce téléphone.',
      version: 'Version {x}',
      retour: 'Retour',

      // Mise à jour
      majDispo: 'Une nouvelle version est prête.',
      majBouton: 'Mettre à jour',

      // Sons
      sonOn: 'Couper le son',
      sonOff: 'Activer le son',

      // Compétences (une par thème)
      niveau: 'Niveau {x}'
    }
  };

  function t(cle, params) {
    var dict = TEXTES[LANGUE_INTERFACE] || TEXTES.fr;
    var v = cle.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, dict);
    if (v == null) return cle;
    if (typeof v !== 'string') return v;
    if (params) for (var k in params) v = v.split('{' + k + '}').join(params[k]);
    return v;
  }

  var API = { TEXTES: TEXTES, LANGUE_INTERFACE: LANGUE_INTERFACE, t: t };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { racine.Textes = API; racine.t = t; }
})(this);
