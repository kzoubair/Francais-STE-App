#!/usr/bin/env node
/*
 * Lexique STE — générateur et validateur du vocabulaire.
 *
 * Lit les lots sources (donnees/lots/*.txt, une ligne par entrée),
 * vérifie chaque entrée et, seulement si AUCUNE erreur n'est trouvée,
 * écrit js/vocabulaire.js.
 *
 *   node outils/generer.js            → valide puis génère
 *   node outils/generer.js --verifier → valide sans écrire
 *   node outils/generer.js --corriger → remplace l'espace simple avant : ; ? ! par
 *                                       une espace insécable dans les lots, puis génère
 *
 * Format d'une ligne (11 champs séparés par « | ») :
 *   id | niveau | nature | genre | fr | pluriel | ar | info | alt | exemple1 | exemple2
 * Voir README.md, section « Mettre à jour le vocabulaire ».
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const DOSSIER_LOTS = path.join(RACINE, 'donnees', 'lots');
const SORTIE = path.join(RACINE, 'js', 'vocabulaire.js');

const NIVEAUX = ['A2', 'B1', 'B2'];
const NATURES = ['nom', 'verbe', 'adjectif', 'adverbe', 'expression'];
const NBSP = ' ';
const NNBSP = ' ';
const MAX_MOTS_EXEMPLE = 15;

/* ------------------------------------------------------------------ */
/* Normalisation : minuscules + accents retirés, 1 caractère → 1 caractère
 * (les positions restent alignées sur la phrase d'origine).            */
const ACCENTS = {
  'à': 'a', 'â': 'a', 'ä': 'a', 'á': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'î': 'i', 'ï': 'i', 'í': 'i', 'ô': 'o', 'ö': 'o', 'ó': 'o', 'û': 'u', 'ù': 'u',
  'ü': 'u', 'ú': 'u', 'ç': 'c', 'ÿ': 'y', 'œ': 'œ', 'æ': 'æ', '’': "'"
};
function norm(s) {
  let r = '';
  for (const ch of s.toLowerCase()) r += (ACCENTS[ch] !== undefined ? ACCENTS[ch] : ch);
  return r;
}
const LETTRE = /[a-zà-ÿœæA-ZÀ-ŸŒÆ0-9]/;
function tokens(phrase) {
  const out = [];
  const re = /[a-zà-ÿœæA-ZÀ-ŸŒÆ0-9]+/g;
  let m;
  while ((m = re.exec(phrase))) out.push({ t: norm(m[0]), brut: m[0], debut: m.index, fin: m.index + m[0].length });
  return out;
}

/* ------------------------------------------------------------------ */
/* Formes des verbes irréguliers (formes normalisées sans accents).    */
const IRREG_COMPLETS = {
  avoir: 'aie ayez ai as a avons avez ont eu eue eus avait avaient aura auront aurait ait ayant',
  etre: 'sois soyez soyons suis es est sommes etes sont ete etait etaient sera seront serait soit soient etant',
  aller: 'vais vas va allons allez vont ira iront irait allait allaient alle allee alles',
  pouvoir: 'peux peut pouvons pouvez peuvent pu pourra pourrait pouvait puisse',
  devoir: 'dois doit devons devez doivent du dus due devra devrait devait',
  savoir: 'sais sait savons savez savent su saura saurait savait sache',
  vouloir: 'veux veut voulons voulez veulent voulu voudrait voulait',
  valoir: 'vaut vaux valent valu vaudrait',
  falloir: 'faut fallu faudra faudrait fallait',
  resoudre: 'resous resout resolvons resolvez resolvent resolu resolue resolus resoudra',
  vivre: 'vis vit vivons vivez vivent vecu',
  croire: 'crois croit croyons croyez croient cru',
  boire: 'bois boit buvons buvez boivent bu',
  plaire: 'plais plait plu',
  pleuvoir: 'pleut plu',
  asseoir: 'assieds assied asseyez assis assise'
};
const IRREG_SUFFIXES = { // suffixe → terminaisons
  prendre: 'prends prend prenons prenez prennent pris prise prises prenait prendra prenne',
  mettre: 'mets met mettons mettez mettent mis mise mises mettait mettra',
  faire: 'fais fait faits faite faites faisons font fera feront ferait faisait faisaient fasse',
  venir: 'viens vient venons venez viennent venu venue venus viendra viendrait venait',
  tenir: 'tiens tient tenons tenez tiennent tenu tenue tenus tiendra tiendrait tenait',
  crire: 'cris crit crits crite crites crivons crivez crivent crivait',
  dire: 'dis dit dits dite dites disons disent disait',
  lire: 'lis lit lisons lisez lisent lu lue lus lisait',
  voir: 'vois voit voyons voyez voient vu vue vus verra verrait voyait',
  cevoir: 'cois coit cevons cevez coivent cu cue cus cevra',
  vrir: 'vre vres vrons vrez vrent vert verte verts vertes',
  frir: 'fre fres frons frez frent fert ferte',
  naitre: 'nais nait naissons naissez naissent nu nue',
  paraitre: 'parais parait paraissons paraissez paraissent paru',
  suivre: 'suis suit suivons suivez suivent suivi suivie suivis',
  eindre: 'eins eint eignons eignez eignent einte eints',
  aindre: 'ains aint aignons aignez aignent ainte',
  oindre: 'oins oint oignons oignez oignent ointe',
  battre: 'bats bat battons battez battent battu',
  sortir: 'sors sort sortons sortez sortent sorti sortie',
  partir: 'pars part partons partez partent parti partie',
  sentir: 'sens sent sentons sentez sentent senti',
  servir: 'sers sert servons servez servent servi',
  dormir: 'dors dort dormons dormez dorment dormi',
  courir: 'cours court courons courez courent couru',
  querir: 'quiers quiert querons querez quierent quis quise quiert'
};
const SUFFIXES_TRIES = Object.keys(IRREG_SUFFIXES).sort((a, b) => b.length - a.length);

/* Mots outils ignorés pour repérer une expression dans un exemple. */
const MOTS_OUTILS = new Set(('le la les l de du des d un une au aux et ou se s a en ne n pas qu que ' +
  'quelque quelqu chose y on il elle').split(' '));

/* Construit le « motif » d'un mot : formes exactes + préfixes acceptés. */
function motifMot(mot, estVerbe) {
  const w = norm(mot);
  const formes = new Set([w]);
  const prefixes = [];
  if (estVerbe) {
    if (IRREG_COMPLETS[w]) IRREG_COMPLETS[w].split(' ').forEach(f => formes.add(f));
    else {
      for (const suf of SUFFIXES_TRIES) {
        if (w.endsWith(suf)) {
          const pre = w.slice(0, w.length - suf.length);
          IRREG_SUFFIXES[suf].split(' ').forEach(f => formes.add(pre + f));
          break;
        }
      }
    }
    let radical = null;
    if (w.endsWith('oir')) radical = w.slice(0, -3);
    else if (/(er|ir|re)$/.test(w)) radical = w.slice(0, -2);
    if (radical && radical.length >= 3) prefixes.push(radical);
    if (w.endsWith('yer')) prefixes.push(w.slice(0, -3) + 'i');
  } else if (w.length <= 4) {
    ['s', 'e', 'es', 'x'].forEach(s => formes.add(w + s));
  } else {
    prefixes.push(w.slice(0, Math.max(4, w.length - 2)));
  }
  return { formes, prefixes, longueur: w.length, verbe: !!estVerbe };
}
function scoreToken(tok, motif) {
  if (motif.formes.has(tok)) return 100;
  for (const p of motif.prefixes) {
    if (tok.startsWith(p) && tok.length <= p.length + 8) {
      // pour un verbe, on préfère une forme conjuguée à un nom de la même famille (compteur, décodeur…)
      const nomDerive = motif.verbe && /(eur|euse|ion|ment|age)s?$/.test(tok) ? 10 : 0;
      return 50 - Math.abs(tok.length - motif.longueur) - nomDerive;
    }
  }
  return 0;
}

/* Cœur du mot : le français sans l'article (ni « se »). */
function coeur(entree) {
  let f = entree.fr;
  if (entree.nature === 'nom') f = f.replace(/^(le |la |les |l')/i, '');
  if (entree.nature === 'verbe' || entree.nature === 'expression') f = f.replace(/^(se |s')/i, '');
  return f;
}

/*
 * Repère le mot cible dans une phrase. Renvoie { debut, fin } ou null.
 * Priorité : 1) marqueur *…* écrit dans la source ; 2) l'expression entière ;
 * 3) les mots porteurs de sens, dans l'ordre, dans une fenêtre courte.
 */
function reperer(entree, phrase) {
  const c = coeur(entree);
  const nc = norm(c).replace(/\s*\.\.\.\s*|\s*…\s*/g, ' ');
  const np = norm(phrase);
  // 2) expression entière
  if (nc.length >= 3) {
    let i = np.indexOf(nc);
    while (i >= 0) {
      const avant = i === 0 ? ' ' : np[i - 1];
      const apres = np[i + nc.length] || ' ';
      if (!LETTRE.test(avant) && !LETTRE.test(apres)) return { debut: i, fin: i + nc.length };
      i = np.indexOf(nc, i + 1);
    }
  }
  // 3) mots porteurs
  const motsCibles = tokens(c).map(t => t.t).filter(t => !MOTS_OUTILS.has(t));
  if (motsCibles.length === 0) return null;
  const estVerbe = entree.nature === 'verbe';
  const motifs = motsCibles.map((m, k) => motifMot(m, estVerbe ? k === 0 : (entree.nature === 'expression' && (IRREG_COMPLETS[m] || /(er|ir|re|oir)$/.test(m)) && k === 0)));
  const tk = tokens(phrase);
  let meilleur = null;
  for (let s = 0; s < tk.length; s++) {
    const sc0 = scoreToken(tk[s].t, motifs[0]);
    if (!sc0) continue;
    let score = sc0, pos = s, ok = true;
    for (let k = 1; k < motifs.length; k++) {
      let trouve = -1;
      for (let j = pos + 1; j < Math.min(tk.length, pos + 7); j++) {
        const sc = scoreToken(tk[j].t, motifs[k]);
        if (sc) { trouve = j; score += sc; break; }
      }
      if (trouve < 0) { ok = false; break; }
      pos = trouve;
    }
    if (ok && (!meilleur || score > meilleur.score)) meilleur = { score, debut: tk[s].debut, fin: tk[pos].fin };
  }
  if (!meilleur) return null;
  // inclure les mots outils qui ouvrent l'expression (« aux bornes de » → « aux bornes »)
  const tc = tokens(c);
  const lead = [];
  for (const t of tc) { if (MOTS_OUTILS.has(t.t)) lead.push(t.t); else break; }
  let debut = meilleur.debut;
  if (lead.length && entree.nature !== 'nom') {
    const idx = tk.findIndex(t => t.debut === meilleur.debut);
    let k = lead.length - 1, j = idx - 1;
    while (k >= 0 && j >= 0 && tk[j].t === lead[k]) { debut = tk[j].debut; k--; j--; }
  }
  // inclure les mots outils qui ferment l'expression, même élidés (« parce qu' », « grâce au »)
  const fin0 = [];
  for (let k = tc.length - 1; k >= 0; k--) { if (MOTS_OUTILS.has(tc[k].t)) fin0.unshift(tc[k].t); else break; }
  let fin = meilleur.fin;
  if (fin0.length && entree.nature !== 'nom') {
    const VARIANTES = { que: ['que', 'qu'], qu: ['que', 'qu'], de: ['de', 'd', 'du', 'des'], d: ['de', 'd', 'du', 'des'], a: ['a', 'au', 'aux'] };
    let j = tk.findIndex(t => t.fin === meilleur.fin) + 1;
    for (const mot of fin0) {
      if (j >= tk.length || !(VARIANTES[mot] || [mot]).includes(tk[j].t)) break;
      fin = tk[j].fin;
      if (phrase[fin] === "'") fin++;
      j++;
    }
  }
  return { debut, fin };
}

/* ------------------------------------------------------------------ */
/* Lecture des lots                                                    */
function lireLots() {
  const fichiers = fs.readdirSync(DOSSIER_LOTS).filter(f => f.endsWith('.txt')).sort();
  const themes = [];
  const entrees = [];
  const erreurs = [];
  for (const fichier of fichiers) {
    const lignes = fs.readFileSync(path.join(DOSSIER_LOTS, fichier), 'utf8').split('\n');
    let theme = null;
    lignes.forEach((ligne, n) => {
      const ou = `${fichier}:${n + 1}`;
      const l = ligne.replace(/\r$/, '');
      if (!l.trim()) return;
      const meta = l.match(/^#\s*(THEME|DOMAINE|TITRE|COMPETENCE|PREFIXE|B2|ORDRE)\s*:\s*(.+)$/);
      if (meta) {
        if (meta[1] === 'THEME') { theme = { id: meta[2].trim(), fichier }; themes.push(theme); }
        else if (!theme) erreurs.push(`${ou} : en-tête ${meta[1]} avant # THEME`);
        else theme[meta[1].toLowerCase()] = meta[2].trim();
        return;
      }
      if (l.startsWith('#')) return;
      if (!theme) { erreurs.push(`${ou} : entrée avant l'en-tête # THEME`); return; }
      const ch = l.split('|').map(s => s.trim());
      if (ch.length !== 11) { erreurs.push(`${ou} : ${ch.length} champs au lieu de 11`); return; }
      const [id, niveau, nature, genre, fr, pluriel, ar, info, alt, exemple1, exemple2] = ch;
      entrees.push({ ou, id, niveau, nature, genre, fr, pluriel, ar, info, alt: alt ? alt.split(';').map(s => s.trim()).filter(Boolean) : [], exemple1, exemple2, theme: theme.id, _theme: theme });
    });
  }
  return { themes, entrees, erreurs };
}

/* ------------------------------------------------------------------ */
/* Contrôles                                                          */
const VOYELLE = /^[aeiouyœæ]/;
const H_ASPIRE_DEFAUT = new Set(['hacheur', 'haut', 'hauteur', 'hasard', 'honte', 'huit', 'hall', 'handicap', 'haine', 'hache', 'hangar', 'haricot', 'hibou', 'hockey', 'hublot', 'hurlement']);

function commenceParVoyelle(motNorm, hAspire) {
  if (VOYELLE.test(motNorm)) return true;
  if (motNorm.startsWith('h')) return !hAspire.has(motNorm);
  return false;
}

function verifierPhrase(p, ou, etiquette, erreurs) {
  if (!p) { erreurs.push(`${ou} : ${etiquette} manquant`); return; }
  const sansMarques = p.replace(/\*/g, '');
  if (!/^[«"]?\s?[A-ZÀÂÄÉÈÊËÎÏÔÖÛÙÜÇŒ0-9]/.test(sansMarques)) erreurs.push(`${ou} : ${etiquette} doit commencer par une majuscule`);
  if (!/[.!?…](\s?»)?$/.test(sansMarques)) erreurs.push(`${ou} : ${etiquette} doit finir par . ! ? ou …`);
  if (/  /.test(p) || /\s{2,}/.test(p)) erreurs.push(`${ou} : ${etiquette} contient un double espace`);
  if (/[؀-ۿ]/.test(p)) erreurs.push(`${ou} : ${etiquette} contient de l'arabe (exemples en français uniquement)`);
  // Espace insécable avant : ; ? ! (sauf heures et nombres « 18:30 »)
  for (let i = 0; i < sansMarques.length; i++) {
    const c = sansMarques[i];
    if (':;?!'.includes(c)) {
      const av = sansMarques[i - 1];
      if (c === ':' && /\d/.test(av) && /\d/.test(sansMarques[i + 1] || '')) continue;
      if (av === ' ') erreurs.push(`${ou} : ${etiquette} : espace simple avant « ${c} » (mettre une espace insécable ; --corriger le fait)`);
      else if (av !== NBSP && av !== NNBSP) erreurs.push(`${ou} : ${etiquette} : il manque l'espace insécable avant « ${c} »`);
    }
  }
  if (/\s[,.]/.test(sansMarques)) erreurs.push(`${ou} : ${etiquette} : espace avant une virgule ou un point`);
  if (/’/.test(p)) erreurs.push(`${ou} : ${etiquette} : utiliser l'apostrophe droite '`);
  if (/[^\sa-zA-Z0-9à-ÿÀ-ŸœŒæÆ'.,;:!?«»()\-–/%°+=×*…"  Ωµ²³]/.test(p)) erreurs.push(`${ou} : ${etiquette} : caractère inattendu`);
  const nbMots = sansMarques.split(/[\s'  ]+/).filter(m => /[a-zA-Z0-9à-ÿÀ-Ÿ]/.test(m)).length;
  if (nbMots > MAX_MOTS_EXEMPLE) erreurs.push(`${ou} : ${etiquette} trop long (${nbMots} mots, max ${MAX_MOTS_EXEMPLE})`);
  if ((p.match(/\*/g) || []).length % 2) erreurs.push(`${ou} : ${etiquette} : marqueur * non fermé`);
}

/* Contrôle croisé des déterminants dans une phrase.
 * noms : Map(nomNormalisé → { genre, hAspire }) */
const SUJETS = new Set(['je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'ne', 'n', 'me', 'te', 'se', 'qui']);
function controleDeterminants(phrase, noms, hAspire) {
  const pb = [];
  const tk = tokens(phrase.replace(/\*/g, ' '));
  for (let i = 1; i < tk.length; i++) {
    const info = noms.get(tk[i].brut.toLowerCase());
    if (!info) continue;
    if (phrase[tk[i].fin] === '-') continue; // mot composé : « ma grand-mère »
    const det = tk[i - 1].t;
    const avantDet = i >= 2 ? tk[i - 2].t : '';
    // l'apostrophe : « l » est-il élidé ?
    const elide = phrase[tk[i - 1].fin] === "'";
    const voy = commenceParVoyelle(tk[i].t, hAspire);
    const g = info.genre;
    const dire = (msg) => pb.push(`« ${tk[i - 1].brut}${elide ? "'" : ' '}${tk[i].brut} » : ${msg}`);
    if ((det === 'le' || det === 'la') && SUJETS.has(avantDet)) continue; // pronom : « il la mesure »
    if (det === 'l' && elide) { if (!voy) dire('l\' devant une consonne'); continue; }
    if (det === 'le' || det === 'au' || det === 'du') {
      if (g === 'f') dire(`le nom est féminin`);
      else if (voy) dire(`élision attendue (l' / à l' / de l')`);
    } else if (det === 'la') {
      if (g === 'm') dire('le nom est masculin');
      else if (voy) dire("élision attendue (l')");
    } else if (det === 'un') {
      if (g === 'f' && avantDet !== 'l') dire('le nom est féminin (une)');
    } else if (det === 'une') {
      if (g === 'm') dire('le nom est masculin (un)');
    } else if (det === 'ce') {
      if (g === 'f') dire('le nom est féminin (cette)'); else if (voy) dire('cet attendu devant voyelle');
    } else if (det === 'cet') {
      if (g === 'f') dire('le nom est féminin (cette)'); else if (!voy) dire('ce attendu devant consonne');
    } else if (det === 'cette') {
      if (g === 'm') dire('le nom est masculin (ce / cet)');
    } else if (det === 'ma' || det === 'ta' || det === 'sa') {
      if (g === 'm') dire('le nom est masculin'); else if (voy) dire('mon / ton / son attendu devant voyelle');
    } else if (det === 'mon' || det === 'ton' || det === 'son') {
      if (g === 'f' && !voy) dire('le nom est féminin (ma / ta / sa)');
    } else if (det === 'quel') {
      if (g === 'f') dire('le nom est féminin (quelle)');
    } else if (det === 'quelle') {
      if (g === 'm') dire('le nom est masculin (quel)');
    }
  }
  return pb;
}

function valider(themes, entrees, erreurs, avertissements) {
  const parId = new Map();
  const parFr = new Map();
  const parAr = new Map();
  const themeIds = new Set();

  for (const t of themes) {
    if (themeIds.has(t.id)) erreurs.push(`${t.fichier} : thème ${t.id} déclaré deux fois`);
    themeIds.add(t.id);
    for (const champ of ['domaine', 'titre', 'competence', 'prefixe']) if (!t[champ]) erreurs.push(`${t.fichier} : en-tête # ${champ.toUpperCase()} manquant`);
    if (t.domaine && !['technique', 'general'].includes(t.domaine)) erreurs.push(`${t.fichier} : DOMAINE doit valoir technique ou general`);
  }

  // h aspiré : déduit des noms « le h… / la h… »
  const hAspire = new Set(H_ASPIRE_DEFAUT);
  for (const e of entrees) {
    if (e.nature === 'nom') { const m = e.fr.match(/^(le|la) (h[^\s']*)/i); if (m) hAspire.add(norm(m[2])); }
  }

  for (const e of entrees) {
    const ou = `${e.ou} [${e.id}]`;
    // id
    if (!/^[A-Z]{3}-\d{3}$/.test(e.id)) erreurs.push(`${ou} : id invalide (format ABC-001)`);
    else if (e._theme.prefixe && !e.id.startsWith(e._theme.prefixe + '-')) erreurs.push(`${ou} : l'id doit commencer par ${e._theme.prefixe}-`);
    if (parId.has(e.id)) erreurs.push(`${ou} : id en double (déjà en ${parId.get(e.id).ou})`);
    parId.set(e.id, e);
    // niveau / nature
    if (!NIVEAUX.includes(e.niveau)) erreurs.push(`${ou} : niveau « ${e.niveau} » invalide`);
    if (e.niveau === 'B2' && e._theme.b2 !== 'oui') erreurs.push(`${ou} : B2 réservé au technique, aux consignes et aux connecteurs`);
    if (!NATURES.includes(e.nature)) erreurs.push(`${ou} : nature « ${e.nature} » invalide`);
    // français
    if (!e.fr) erreurs.push(`${ou} : champ fr vide`);
    if (/[؀-ۿ]/.test(e.fr + e.pluriel + e.alt.join(''))) erreurs.push(`${ou} : arabe dans un champ français`);
    if (/\s{2,}/.test(e.fr)) erreurs.push(`${ou} : double espace dans fr`);
    if (/’/.test(e.fr + e.alt.join(''))) erreurs.push(`${ou} : utiliser l'apostrophe droite '`);
    // arabe
    if (!/[؀-ۿ]/.test(e.ar)) erreurs.push(`${ou} : la traduction arabe est vide ou sans lettres arabes`);
    // Face arabe : seuls les sigles, symboles et unités latins sont permis (FAST, LCD, 220 V…).
    // Un mot français (minuscules ou accents) s'afficherait dans le désordre et donnerait la réponse.
    const francais = (e.ar.match(/[A-Za-zÀ-ÿœŒ'’]+/g) || []).filter(m => /[a-zà-ÿœ]{2,}|[À-ÿœŒ'’]/.test(m));
    if (francais.length) erreurs.push(`${ou} : mot français dans la traduction arabe (${francais.join(', ')}) : le mettre dans info`);
    // genre et article
    if (e.nature === 'nom') {
      const m = e.fr.match(/^(les|le|la|l')(?: |(?<=l'))(.*)$/i);
      if (!m) { erreurs.push(`${ou} : un nom doit commencer par son article défini (le, la, l', les)`); }
      else {
        const art = m[1].toLowerCase();
        const mot = norm(m[2]);
        e.article = art;
        if (!['m', 'f'].includes(e.genre)) erreurs.push(`${ou} : genre (m / f) obligatoire pour un nom`);
        if (art === 'le' && e.genre !== 'm') erreurs.push(`${ou} : « le » mais genre ${e.genre}`);
        if (art === 'la' && e.genre !== 'f') erreurs.push(`${ou} : « la » mais genre ${e.genre}`);
        if (art === "l'" && !commenceParVoyelle(mot, new Set())) erreurs.push(`${ou} : « l' » devant une consonne`);
        if ((art === 'le' || art === 'la') && commenceParVoyelle(mot, hAspire)) erreurs.push(`${ou} : élision attendue (l')`);
        if (art === "l'" && /\s/.test(e.fr[2] || '')) erreurs.push(`${ou} : pas d'espace après l'`);
      }
    } else if (e.genre) erreurs.push(`${ou} : genre réservé aux noms`);
    // doublons
    const cleFr = e.fr.toLowerCase();
    if (parFr.has(cleFr)) erreurs.push(`${ou} : doublon français « ${e.fr} » (déjà ${parFr.get(cleFr).id})`);
    parFr.set(cleFr, e);
    const cleAr = e.ar.replace(/[ً-ْ]/g, '').trim();
    if (parAr.has(cleAr)) avertissements.push(`${ou} : traduction arabe identique à ${parAr.get(cleAr).id} « ${e.ar} »`);
    parAr.set(cleAr, e);
    // exemples
    verifierPhrase(e.exemple1, ou, 'exemple1', erreurs);
    verifierPhrase(e.exemple2, ou, 'exemple2', erreurs);
    if (e.exemple1 && e.exemple1 === e.exemple2) erreurs.push(`${ou} : les deux exemples sont identiques`);
    for (const k of [1, 2]) {
      const p = e['exemple' + k];
      if (!p) continue;
      const mm = p.match(/\*([^*]+)\*/);
      if (mm) {
        e['g' + k] = [mm.index, mm.index + mm[1].length];
        e['exemple' + k] = p.replace(/\*/g, '');
      } else {
        const r = reperer(e, p);
        if (!r) erreurs.push(`${ou} : exemple${k} ne contient pas « ${coeur(e)} » (ni une forme reconnue ; marquer la forme avec *…*)`);
        else e['g' + k] = [r.debut, r.fin];
      }
    }
  }

  // ≥ 4 entrées par couple thème × nature
  const compte = new Map();
  for (const e of entrees) { const k = e.theme + ' × ' + e.nature; compte.set(k, (compte.get(k) || 0) + 1); }
  for (const [k, n] of compte) if (n < 4) erreurs.push(`couple ${k} : ${n} entrée(s), il en faut au moins 4 (QCM)`);

  // Contrôle croisé des déterminants
  const noms = construireNoms(entrees);
  verifierAutoTest(noms, hAspire); // bloque si le contrôle ne détecte pas un cas injecté
  for (const e of entrees) {
    for (const k of [1, 2]) {
      const p = e['exemple' + k];
      if (!p) continue;
      for (const pb of controleDeterminants(p, noms, hAspire)) erreurs.push(`${e.ou} [${e.id}] : exemple${k} : déterminant incohérent ${pb}`);
    }
  }
  return parId;
}

/* Noms dont le genre change le sens (le poste / la poste…) : jamais contrôlés. */
const HOMONYMES_GENRE = new Set(['poste', 'tour', 'mode', 'manche', 'livre', 'voile', 'moule', 'somme', 'vase',
  'mémoire', 'physique', 'critique', 'garde', 'aide', 'guide', 'solde', 'office', 'pendule', 'mousse', 'greffe', 'radio']);
/* Adjectifs placés avant le nom dans une entrée (« le grand taxi »). */
const ADJ_ANTEPOSES = new Set(['grand', 'petit', 'bon', 'mauvais', 'nouveau', 'vieux', 'beau', 'jeune', 'premier', 'haut', 'bas', 'gros', 'double', 'simple', 'demi']);

/* Table nom → genre (nom principal, au singulier). Les noms qui existent
 * aux deux genres dans le corpus (le poste / la poste) sont écartés.   */
function construireNoms(entrees) {
  const noms = new Map();
  const conflits = new Set();
  for (const e of entrees) {
    if (e.nature !== 'nom' || !['m', 'f'].includes(e.genre)) continue;
    const m = e.fr.match(/^(?:le |la |l')([^\s'-]+)/i);
    if (!m || /^les /i.test(e.fr)) continue;
    const tete = m[1].toLowerCase();
    if (ADJ_ANTEPOSES.has(tete)) continue; // « le grand taxi » : la tête n'est pas un nom
    if (noms.has(tete) && noms.get(tete).genre !== e.genre) conflits.add(tete);
    noms.set(tete, { genre: e.genre });
  }
  conflits.forEach(c => noms.delete(c));
  HOMONYMES_GENRE.forEach(c => noms.delete(c));
  return noms;
}

function verifierAutoTest(noms, hAspire) {
  const essai = new Map(noms);
  essai.set('tension', { genre: 'f' });
  essai.set('moteur', { genre: 'm' });
  essai.set('intensité', { genre: 'f' });
  const cas = [
    ['Le tension est trop forte.', true],
    ['On mesure la tension.', false],
    ['Une moteur tourne.', true],
    ['La intensité augmente.', true],
    ["L'intensité augmente.", false],
    ['Cette moteur chauffe.', true],
    ['Il la mesure avec le voltmètre.', false]
  ];
  for (const [phrase, attendu] of cas) {
    const detecte = controleDeterminants(phrase, essai, hAspire).length > 0;
    if (detecte !== attendu) {
      console.error(`ÉCHEC de l'auto-test du contrôle des déterminants sur « ${phrase} » (attendu : ${attendu ? 'erreur' : 'aucune erreur'}).`);
      process.exit(2);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Écriture de js/vocabulaire.js                                       */
function js(v) { return JSON.stringify(v); }
function ecrire(themes, entrees) {
  const ordreNiv = { A2: 0, B1: 1, B2: 2 };
  const parTheme = new Map(themes.map(t => [t.id, []]));
  entrees.forEach(e => parTheme.get(e.theme).push(e));
  const out = [];
  out.push('/*');
  out.push(' * Lexique STE — vocabulaire (fichier GÉNÉRÉ par outils/generer.js).');
  out.push(' * Ne pas modifier à la main : corriger les lots dans donnees/lots/ puis relancer');
  out.push(' *   node outils/generer.js');
  out.push(` * ${entrees.length} entrées, ${themes.length} thèmes.`);
  out.push(' * g1 / g2 : position [début, fin[ du mot cible dans exemple1 / exemple2 (mis en gras).');
  out.push(' */');
  out.push("'use strict';");
  out.push('');
  out.push('/* Langue cible (langue apprise). */');
  out.push("var LANGUE_CIBLE = 'fr';");
  out.push('');
  out.push('var THEMES = [');
  for (const t of themes) {
    out.push(`  { id: ${js(t.id)}, prefixe: ${js(t.prefixe)}, domaine: ${js(t.domaine)}, titre: ${js(t.titre)}, competence: ${js(t.competence)} },`);
  }
  out.push('];');
  out.push('');
  out.push('var VOCABULAIRE = [');
  for (const t of themes) {
    const liste = parTheme.get(t.id).sort((a, b) => ordreNiv[a.niveau] - ordreNiv[b.niveau] || a.id.localeCompare(b.id));
    out.push('');
    out.push(`  /* ================= ${t.titre.toUpperCase()} (${t.domaine}) ================= */`);
    let niv = null;
    for (const e of liste) {
      if (e.niveau !== niv) { niv = e.niveau; out.push(`  /* --- ${t.titre} · niveau ${niv} --- */`); }
      const o = { id: e.id, ar: e.ar, fr: e.fr, niveau: e.niveau, theme: e.theme, nature: e.nature };
      if (e.genre) o.genre = e.genre;
      if (e.article) o.article = e.article;
      if (e.pluriel) o.pluriel = e.pluriel;
      if (e.info) o.info = e.info;
      if (e.alt.length) o.alt = e.alt;
      o.exemple1 = e.exemple1; o.exemple2 = e.exemple2; o.g1 = e.g1; o.g2 = e.g2;
      out.push('  ' + JSON.stringify(o) + ',');
    }
  }
  out.push('];');
  out.push('');
  out.push("if (typeof module !== 'undefined') module.exports = { LANGUE_CIBLE: LANGUE_CIBLE, THEMES: THEMES, VOCABULAIRE: VOCABULAIRE };");
  out.push('');
  fs.writeFileSync(SORTIE, out.join('\n'));
}

function corrigerEspaces() {
  for (const f of fs.readdirSync(DOSSIER_LOTS).filter(f => f.endsWith('.txt'))) {
    const p = path.join(DOSSIER_LOTS, f);
    const avant = fs.readFileSync(p, 'utf8');
    const apres = avant.split('\n').map(l => l.startsWith('#') ? l : l.replace(/ ([?!;])/g, NBSP + '$1').replace(/([^\d|\s]) :(?!\d)/g, '$1' + NBSP + ':').replace(/([^\s|])([?!;])/g, (m, a, b) => (a === NBSP || a === NNBSP) ? m : a + NBSP + b)).join('\n');
    if (apres !== avant) { fs.writeFileSync(p, apres); console.log(`corrigé : ${f}`); }
  }
}

function principal() {
  const args = process.argv.slice(2);
  if (args.includes('--corriger')) corrigerEspaces();
  const { themes, entrees, erreurs } = lireLots();
  const avertissements = [];
  valider(themes, entrees, erreurs, avertissements);
  avertissements.forEach(a => console.warn('AVERTISSEMENT ' + a));
  if (erreurs.length) {
    erreurs.forEach(e => console.error('ERREUR ' + e));
    console.error(`\n${erreurs.length} erreur(s) : vocabulaire.js N'A PAS été généré.`);
    process.exit(1);
  }
  // statistiques
  const stat = {};
  for (const e of entrees) { stat[e.theme] = stat[e.theme] || { A2: 0, B1: 0, B2: 0, total: 0 }; stat[e.theme][e.niveau]++; stat[e.theme].total++; }
  const dom = { technique: 0, general: 0 };
  entrees.forEach(e => dom[e._theme.domaine]++);
  console.log(`${entrees.length} entrées valides · technique ${dom.technique} · général ${dom.general} · ${avertissements.length} avertissement(s)`);
  for (const t of themes) { const s = stat[t.id] || { A2: 0, B1: 0, B2: 0, total: 0 }; console.log(`  ${t.prefixe} ${t.id.padEnd(14)} ${String(s.total).padStart(3)}  (A2 ${s.A2} · B1 ${s.B1} · B2 ${s.B2})`); }
  if (!args.includes('--verifier')) { ecrire(themes, entrees); console.log(`→ ${path.relative(RACINE, SORTIE)} écrit.`); }
}

if (require.main === module) principal();
module.exports = { reperer, controleDeterminants, construireNoms, norm, tokens, motifMot };
