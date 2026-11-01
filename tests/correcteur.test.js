// Tests du correcteur : node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/correcteur.js');

const intensite = { fr: "l'intensité", nature: 'nom', genre: 'f' };
const tension = { fr: 'la tension', nature: 'nom', genre: 'f' };
const signal = { fr: 'le signal', nature: 'nom', genre: 'm' };
const determiner = { fr: 'déterminer', nature: 'verbe' };
const matiere = { fr: "la matière d'œuvre", nature: 'nom', genre: 'f' };
const fonctionnel = { fr: 'fonctionnel', nature: 'adjectif', alt: ['fonctionnelle'] };

test('réponse exacte, majuscules, espaces et ponctuation tolérés', () => {
  assert.equal(C.verifier('la tension', tension).statut, 'exact');
  assert.equal(C.verifier('  La   Tension. ', tension).statut, 'exact');
  assert.equal(C.verifier("L’intensité", intensite).statut, 'exact');
  assert.equal(C.verifier("l' intensité !", intensite).statut, 'exact');
});

test('accents oubliés acceptés mais signalés', () => {
  const r = C.verifier("l'intensite", intensite);
  assert.equal(r.statut, 'accents');
  assert.ok(r.juste);
  assert.equal(r.attendu, "l'intensité");
  assert.equal(C.verifier('determiner', determiner).statut, 'accents');
  assert.equal(C.verifier("la matiere d'oeuvre", matiere).statut, 'accents');
});

test('une lettre d\'écart acceptée, lettre fautive repérée', () => {
  const r = C.verifier('la tansion', tension);
  assert.equal(r.statut, 'faute');
  assert.ok(r.juste);
  assert.equal('la tansion'[r.position], 'a');
  assert.equal(C.verifier('determner', determiner).juste, true); // lettre manquante + accent
  assert.equal(C.verifier('la tensoin', tension).juste, false);  // deux écarts
});

test('mot court : aucune faute tolérée', () => {
  const car = { fr: 'car', nature: 'expression' };
  assert.equal(C.verifier('par', car).juste, false);
});

test('article exigé par défaut, cohérent avec le genre', () => {
  assert.equal(C.verifier('tension', tension).statut, 'article');
  assert.equal(C.verifier('tension', tension, { exigerArticle: false }).statut, 'exact');
  assert.equal(C.verifier('une tension', tension).juste, true);
  assert.equal(C.verifier('le tension', tension).juste, false);
  assert.equal(C.verifier('un signal', signal).juste, true);
  assert.equal(C.verifier('une intensité', intensite).juste, true);
  assert.equal(C.verifier('un intensité', intensite).juste, false);
});

test('autres réponses acceptées (alt)', () => {
  assert.equal(C.verifier('fonctionnelle', fonctionnel).statut, 'exact');
  assert.equal(C.verifier('Le PE', { fr: 'le projet encadré', nature: 'nom', genre: 'm', alt: ['le PE'] }).juste, true);
});

test('réponse fausse', () => {
  assert.equal(C.verifier('le courant', tension).juste, false);
  assert.equal(C.verifier('', tension).juste, false);
});

test('indice', () => {
  assert.equal(C.indice(tension), 'l_ t______');
  assert.equal(C.indice(intensite), "l'i________");
});
