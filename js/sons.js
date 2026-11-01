/*
 * Lexique STE — sons courts synthétisés avec Web Audio (aucun fichier audio).
 */
(function (racine) {
  'use strict';
  var ctx = null;
  var actif = true;

  function contexte() {
    if (!ctx) {
      var AC = racine.AudioContext || racine.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* Une note brève : fréquence (Hz), début (s), durée (s), forme, volume. */
  function note(f, debut, duree, forme, vol) {
    var c = contexte();
    if (!c) return;
    var t0 = c.currentTime + (debut || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = forme || 'sine';
    o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + duree + 0.02);
  }

  var SONS = {
    retourner: function () { note(520, 0, 0.06, 'triangle', 0.05); },
    juste: function () { note(660, 0, 0.09, 'sine', 0.1); note(880, 0.07, 0.14, 'sine', 0.1); },
    faux: function () { note(220, 0, 0.18, 'triangle', 0.08); },
    clic: function () { note(440, 0, 0.04, 'square', 0.025); },
    combo: function (n) { var base = 523 + Math.min(n, 30) * 12; note(base, 0, 0.08, 'sine', 0.08); note(base * 1.5, 0.05, 0.12, 'sine', 0.07); },
    promotion: function () { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { note(f, i * 0.11, 0.35, 'triangle', 0.11); }); },
    fin: function () { note(587, 0, 0.12, 'sine', 0.08); note(784, 0.1, 0.2, 'sine', 0.08); }
  };

  var API = {
    jouer: function (nom, arg) { if (actif && SONS[nom]) { try { SONS[nom](arg); } catch (e) { /* silence */ } } },
    setActif: function (v) { actif = !!v; },
    estActif: function () { return actif; },
    debloquer: function () { if (actif) contexte(); }
  };
  racine.Sons = API;
})(this);
