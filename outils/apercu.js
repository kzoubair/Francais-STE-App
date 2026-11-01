// Affiche les exemples d'un thème avec le mot repéré entre [crochets] (relecture).
const { VOCABULAIRE } = require('../js/vocabulaire.js');
const theme = process.argv[2];
for (const e of VOCABULAIRE.filter(e => !theme || e.theme === theme)) {
  const b = (p, g) => p.slice(0, g[0]) + '[' + p.slice(g[0], g[1]) + ']' + p.slice(g[1]);
  console.log(`${e.id} ${e.fr} :: ${b(e.exemple1, e.g1)} || ${b(e.exemple2, e.g2)}`);
}
