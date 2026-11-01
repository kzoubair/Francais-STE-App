// Tests du moteur de révision : node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/moteur.js');

const T0 = Date.UTC(2026, 10, 1, 8, 0, 0);
const MIN = M.MINUTE, JOUR = M.JOUR;
const sansAlea = () => 0.5; // r = 0 → aucune variation

test('carte neuve : étapes 1 min puis 10 min, sortie à 1 jour avec Correct', () => {
  let c = M.nouvelleCarte();
  c = M.noter(c, M.NOTE.CORRECT, T0, { alea: sansAlea });
  assert.equal(c.etat, 'apprentissage');
  assert.equal(c.echeance - T0, 10 * MIN);
  c = M.noter(c, M.NOTE.CORRECT, T0, { alea: sansAlea });
  assert.equal(c.etat, 'revision');
  assert.equal(c.intervalle, 1);
  assert.equal(c.echeance - T0, JOUR);
});

test('carte neuve : Encore → 1 min ; Facile → sortie à 4 jours', () => {
  let c = M.noter(M.nouvelleCarte(), M.NOTE.ENCORE, T0);
  assert.equal(c.echeance - T0, 1 * MIN);
  c = M.noter(M.nouvelleCarte(), M.NOTE.FACILE, T0);
  assert.equal(c.etat, 'revision');
  assert.equal(c.intervalle, 4);
});

test('la facilité ne change pas pendant l\'apprentissage', () => {
  let c = M.noter(M.nouvelleCarte(), M.NOTE.ENCORE, T0);
  c = M.noter(c, M.NOTE.DIFFICILE, T0);
  assert.equal(c.facilite, 2.5);
});

test('révision : Difficile ×1,2 ; Correct ×facilité ; Facile ×facilité×1,3', () => {
  const base = { etat: 'revision', etape: 0, facilite: 2.5, intervalle: 10, echeance: T0, echecs: 0, vues: 3 };
  const d = M.noter(base, M.NOTE.DIFFICILE, T0, { alea: sansAlea });
  assert.equal(d.intervalle, 12);
  assert.equal(d.facilite, 2.35);
  const c = M.noter(base, M.NOTE.CORRECT, T0, { alea: sansAlea });
  assert.equal(c.intervalle, 25);
  assert.equal(c.facilite, 2.5);
  const f = M.noter(base, M.NOTE.FACILE, T0, { alea: sansAlea });
  assert.equal(f.facilite, 2.65);
  assert.equal(f.intervalle, Math.round(10 * 2.65 * 1.3));
});

test('Encore en révision : réapprentissage 10 min, puis moitié de l\'intervalle (min 1 jour)', () => {
  const base = { etat: 'revision', etape: 0, facilite: 2.5, intervalle: 30, echeance: T0, echecs: 0, vues: 5 };
  let c = M.noter(base, M.NOTE.ENCORE, T0, { alea: sansAlea });
  assert.equal(c.etat, 'reapprentissage');
  assert.equal(c.echeance - T0, 10 * MIN);
  assert.equal(c.facilite, 2.3);
  assert.equal(c.echecs, 1);
  c = M.noter(c, M.NOTE.CORRECT, T0, { alea: sansAlea });
  assert.equal(c.etat, 'revision');
  assert.equal(c.intervalle, 15);
  const petit = M.noter({ ...base, intervalle: 1 }, M.NOTE.ENCORE, T0);
  assert.equal(M.noter(petit, M.NOTE.CORRECT, T0).intervalle, 1);
});

test('la facilité ne descend jamais sous 1,3', () => {
  let c = { etat: 'revision', etape: 0, facilite: 1.4, intervalle: 5, echeance: T0, echecs: 0, vues: 1 };
  c = M.noter(c, M.NOTE.ENCORE, T0);
  assert.equal(c.facilite, 1.3);
  c = M.noter({ ...c, etat: 'revision' }, M.NOTE.ENCORE, T0);
  assert.equal(c.facilite, 1.3);
});

test('variation aléatoire bornée à ±5 %', () => {
  const base = { etat: 'revision', etape: 0, facilite: 2.5, intervalle: 40, echeance: T0, echecs: 0, vues: 3 };
  for (const r of [0, 0.25, 0.75, 0.9999]) {
    const c = M.noter(base, M.NOTE.CORRECT, T0, { alea: () => r });
    assert.ok(c.intervalle >= Math.round(100 * 0.95) && c.intervalle <= Math.round(100 * 1.05), `${r} → ${c.intervalle}`);
  }
});

test('prévisions affichées sous les boutons', () => {
  const p = M.previsions(M.nouvelleCarte(), T0);
  assert.equal(M.formaterDelai(p[1]), '1 min');
  assert.equal(M.formaterDelai(p[3]), '10 min');
  assert.equal(M.formaterDelai(p[4]), '4 j');
  assert.equal(M.formaterDelai(45 * JOUR), '2 mois');
});

test('carte ancrée à 21 jours, problématique après 8 échecs', () => {
  assert.ok(M.estAncree({ etat: 'revision', intervalle: 21 }));
  assert.ok(!M.estAncree({ etat: 'revision', intervalle: 20 }));
  assert.ok(M.estProbleme({ echecs: 8 }));
  assert.ok(!M.estProbleme({ echecs: 7 }));
});

test('ordre des nouvelles cartes : niveau croissant, thèmes alternés par paquets de 5', () => {
  const v = [];
  for (let i = 0; i < 7; i++) v.push({ id: 'A' + i, niveau: 'B1', theme: 'a' });
  for (let i = 0; i < 7; i++) v.push({ id: 'B' + i, niveau: 'B1', theme: 'b' });
  v.push({ id: 'Z', niveau: 'A2', theme: 'b' });
  const o = M.ordonnerNouvelles(v, false).map(e => e.id);
  assert.equal(o[0], 'Z');
  assert.deepEqual(o.slice(1, 6), ['A0', 'A1', 'A2', 'A3', 'A4']);
  assert.deepEqual(o.slice(6, 11), ['B0', 'B1', 'B2', 'B3', 'B4']);
  assert.equal(o.length, 15);
});

test('file de session : plafonds journaliers respectés', () => {
  const v = [];
  const cartes = {};
  for (let i = 0; i < 30; i++) { v.push({ id: 'N' + i, niveau: 'A2', theme: 't' }); }
  for (let i = 0; i < 30; i++) { v.push({ id: 'R' + i, niveau: 'A2', theme: 't' }); cartes['R' + i] = { etat: 'revision', intervalle: 3, echeance: T0 - i, facilite: 2.5 }; }
  const f = M.construireFile(v, cartes, T0, { nouvellesRestantes: 5, revuesRestantes: 8, longueur: 100, melanger: false });
  assert.equal(f.filter(e => e.id[0] === 'N').length, 5);
  assert.equal(f.filter(e => e.id[0] === 'R').length, 8);
  const g = M.construireFile(v, cartes, T0, { nouvellesRestantes: 15, revuesRestantes: 150, longueur: 20, melanger: false });
  assert.equal(g.length, 20);
});

test('rangs ajustés au nombre d\'entrées', () => {
  const r = M.rangs(1500);
  assert.deepEqual(r.map(x => x.seuil), [0, 40, 100, 220, 400, 650, 950]);
  const p = M.rangPour(105, 1500);
  assert.equal(p.rang.nom, 'Technicien');
  assert.equal(p.suivant.nom, 'Bachelier STE');
  assert.ok(M.rangs(1468)[6].seuil < 950);
});
