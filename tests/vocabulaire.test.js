// Tests du générateur / validateur et du corpus : node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../outils/generer.js');
const { VOCABULAIRE, THEMES } = require('../js/vocabulaire.js');

test('le contrôle des déterminants détecte un cas injecté', () => {
  const noms = new Map([['tension', { genre: 'f' }], ['moteur', { genre: 'm' }], ['intensité', { genre: 'f' }]]);
  assert.ok(G.controleDeterminants('Le tension augmente.', noms, new Set()).length > 0);
  assert.ok(G.controleDeterminants('Une moteur tourne.', noms, new Set()).length > 0);
  assert.ok(G.controleDeterminants('La intensité baisse.', noms, new Set()).length > 0);
  assert.equal(G.controleDeterminants("On mesure l'intensité.", noms, new Set()).length, 0);
  assert.equal(G.controleDeterminants('Il la mesure.', noms, new Set()).length, 0);
});

test('repérage du mot dans les exemples (formes conjuguées et accordées)', () => {
  const p = 'Les ingénieurs conçoivent un système.';
  const r = G.reperer({ fr: 'concevoir', nature: 'verbe' }, p);
  assert.equal(p.slice(r.debut, r.fin), 'conçoivent');
  const q = 'Les signaux sinusoïdaux ont une seule fréquence.';
  const s = G.reperer({ fr: 'sinusoïdal', nature: 'adjectif' }, q);
  assert.equal(q.slice(s.debut, s.fin), 'sinusoïdaux');
  assert.equal(G.reperer({ fr: 'la tension', nature: 'nom' }, 'Le moteur tourne.'), null);
});

test('corpus : identifiants uniques, champs obligatoires, deux exemples', () => {
  const ids = new Set();
  for (const e of VOCABULAIRE) {
    assert.ok(!ids.has(e.id), e.id); ids.add(e.id);
    assert.ok(e.ar && e.fr && e.niveau && e.theme && e.nature, e.id);
    assert.ok(e.exemple1 && e.exemple2 && e.g1 && e.g2, e.id);
    if (e.nature === 'nom') assert.ok(['m', 'f'].includes(e.genre) && e.article, e.id);
  }
  assert.ok(VOCABULAIRE.length >= 1400);
});

test('corpus : au moins 4 entrées par couple thème × nature (QCM possibles)', () => {
  const n = {};
  for (const e of VOCABULAIRE) n[e.theme + '/' + e.nature] = (n[e.theme + '/' + e.nature] || 0) + 1;
  for (const [k, v] of Object.entries(n)) assert.ok(v >= 4, k);
  assert.ok(THEMES.length >= 18);
});
