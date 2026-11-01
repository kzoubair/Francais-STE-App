// Génère les icônes PNG à partir de icones/icone.svg (nécessite Playwright) : node outils/icones.js
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '../icones/icone.svg'), 'utf8');
  const b = await chromium.launch(); const p = await b.newPage();
  const rendre = async (taille, fichier, marge) => {
    await p.setViewportSize({ width: taille, height: taille });
    const fond = marge ? 'background:#0E1116;' : 'background:transparent;';
    const t = marge ? Math.round(taille * 0.8) : taille;
    await p.setContent(`<html><body style="margin:0;${fond}display:grid;place-items:center;width:${taille}px;height:${taille}px">${svg.replace('<svg ', `<svg width="${t}" height="${t}" `)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, '../icones', fichier), omitBackground: !marge });
  };
  await rendre(192, 'icone-192.png'); await rendre(512, 'icone-512.png');
  await rendre(512, 'icone-maskable-512.png', true); await rendre(180, 'apple-touch-icon.png', true);
  await b.close();
})();
