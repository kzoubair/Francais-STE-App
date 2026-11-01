# Lexique STE

Une webapp pour réviser le **vocabulaire français du bac STE** (2e Bac Sciences et Technologies Électriques, Maroc) avec des cartes à retourner et un moteur de **répétition espacée** de type Anki.

- **1 468 mots et expressions** (niveaux A2, B1, B2) répartis en **20 thèmes** : 746 entrées techniques (chaîne d'énergie, chaîne d'information, mesures et sécurité…) et 722 entrées de la vie quotidienne d'un lycéen (lycée, consignes d'examen, orientation, famille, ville, loisirs, santé, sentiments, quantités, connecteurs logiques).
- La face en **arabe** s'affiche toujours en premier. Le verso montre le mot français avec son article, puis deux exemples.
- **100 % hors ligne** une fois installée, sans compte, sans publicité, sans traceur. La progression reste sur le téléphone.
- HTML, CSS et JavaScript sans framework et sans dépendance. L'app complète pèse environ 0,7 Mo, polices comprises, et environ 0,25 Mo une fois compressée par le serveur.

Adresse publique : <https://kzoubair.github.io/Francais-STE-App/>

---

## Lancer l'app sur un ordinateur

Il faut un petit serveur web local, car le service worker ne marche pas en ouvrant directement le fichier :

```bash
python3 -m http.server 8080
```

Ouvrir ensuite <http://localhost:8080/> dans Chrome, Edge ou Firefox.

## Lancer les tests

Il faut Node.js 18 ou plus récent. Aucune installation n'est nécessaire.

```bash
node --test tests/*.test.js
```

Les tests couvrent le moteur de révision (`tests/moteur.test.js`), le correcteur des réponses écrites (`tests/correcteur.test.js`) et le validateur du vocabulaire (`tests/vocabulaire.test.js`).

## Déployer sur GitHub Pages

1. Pousser le dépôt sur GitHub, branche `main`.
2. Dans le dépôt, ouvrir **Settings → Pages**.
3. Choisir **Deploy from a branch**, puis la branche `main` et le dossier `/ (root)`. Enregistrer.
4. Attendre une à deux minutes. L'app est servie sur `https://<compte>.github.io/<dépôt>/`.

Tous les chemins sont relatifs, donc l'app fonctionne dans un sous-dossier.

**À chaque modification** d'un fichier de l'app (vocabulaire compris), incrémenter `CACHE_VERSION` dans `sw.js`, par exemple de `lexique-ste-v1` à `lexique-ste-v2`. Sans ce changement, les téléphones gardent l'ancienne version en cache. Avec ce changement, les élèves voient le bandeau « Une nouvelle version est prête » et touchent **Mettre à jour**. Leur progression n'est pas effacée.

## Installer l'app sur un téléphone

- **Android (Chrome)** : ouvrir l'adresse de l'app, toucher le menu ⋮, puis **Installer l'application** ou **Ajouter à l'écran d'accueil**.
- **iPhone (Safari)** : ouvrir l'adresse, toucher le bouton Partager, puis **Sur l'écran d'accueil**.

Il faut ouvrir l'app une fois avec Internet. Ensuite, elle fonctionne sans connexion.

Pour changer de téléphone : dans **Réglages → Sauvegarde**, choisir **Exporter ma progression**, envoyer le fichier sur le nouveau téléphone, puis choisir **Importer une progression**.

---

## Mettre à jour le vocabulaire (pour le professeur)

Le vocabulaire est écrit dans des fichiers texte simples, un par thème, dans `donnees/lots/`. Le fichier `js/vocabulaire.js` est **généré automatiquement** : il ne faut pas le modifier à la main.

### Format d'une ligne

Chaque entrée tient sur une ligne. Les 11 champs sont séparés par `|` :

```
id | niveau | nature | genre | fr | pluriel | ar | info | alt | exemple1 | exemple2
```

Exemple :

```
GRD-002 | B1 | nom | f | l'intensité | | شدة التيار الكهربائي | I, en ampères (A) | | L'intensité se mesure avec un ampèremètre en série. | L'intensité du courant augmente quand la résistance diminue.
```

| Champ | Contenu |
|---|---|
| `id` | Préfixe du thème + numéro sur 3 chiffres (`GRD-002`). **Ne jamais renuméroter** : la progression des élèves est liée à cet identifiant. Pour un nouveau mot, prendre le numéro suivant libre. |
| `niveau` | `A2`, `B1` ou `B2`. B2 est réservé aux thèmes techniques, aux consignes et aux connecteurs. |
| `nature` | `nom`, `verbe`, `adjectif`, `adverbe` ou `expression`. |
| `genre` | `m` ou `f`, obligatoire pour les noms et vide pour les autres natures. |
| `fr` | Le mot français. Un nom commence par son article défini : `le`, `la`, `l'` ou `les`. |
| `pluriel` | Facultatif. S'écrit tel qu'on veut l'afficher (`des signaux`). |
| `ar` | La traduction en arabe standard. Si un mot a deux sens, les séparer par ` ؛ `. |
| `info` | Facultatif. Construction, verbe irrégulier, abréviation, faux ami. |
| `alt` | Facultatif. Autres réponses acceptées à l'écrit, séparées par `;` (`fonctionnelle ; le PE`). |
| `exemple1`, `exemple2` | Deux phrases en français, de 15 mots au plus, qui contiennent le mot. |

Le mot est mis en gras automatiquement dans les exemples, y compris quand il est conjugué ou accordé. Si le générateur ne le trouve pas (forme très irrégulière), entourer la forme d'astérisques : `Ne sois pas *jalouse* de ta sœur.`

Chaque fichier commence par un en-tête :

```
# THEME: grandeurs
# PREFIXE: GRD
# DOMAINE: technique          (ou general)
# TITRE: Grandeurs et lois de l'électricité
# COMPETENCE: Expliquer une loi de l'électricité
# B2: oui                     (oui si le niveau B2 est autorisé)
```

Pour créer un nouveau thème, ajouter un fichier `donnees/lots/21-montheme.txt` avec un nouveau préfixe de 3 lettres.

### Générer et vérifier

```bash
node outils/generer.js --corriger
```

`--corriger` remplace automatiquement l'espace simple avant `: ; ? !` par une espace insécable. Le script **bloque la génération** s'il trouve une erreur, et il donne le fichier et la ligne en cause. Il vérifie :

- les doublons en français (erreur) et les traductions arabes identiques (avertissement à corriger) ;
- les phrases d'exemple : majuscule au début, ponctuation finale, pas de double espace, espace insécable avant `: ; ? !`, 15 mots au plus ;
- la présence du mot, ou d'une de ses formes, dans les deux exemples ;
- au moins 4 entrées par couple thème × nature, pour que les QCM aient toujours 3 mauvaises réponses ;
- l'article et le genre de chaque nom ;
- les déterminants dans tous les exemples. Par exemple, « le tension » ou « un intensité » sont refusés. Avant de vérifier le corpus, le script teste ce contrôle sur des erreurs volontaires et s'arrête s'il ne les détecte pas.

Pour relire les exemples, avec le mot repéré entre crochets :

```bash
node outils/apercu.js grandeurs
```

Ensuite, incrémenter `CACHE_VERSION` dans `sw.js`, puis publier.

### Polices

Les polices (Space Grotesk, Inter, Noto Naskh Arabic, licence SIL OFL) sont servies en local et réduites aux caractères utilisés. Si un nouveau mot arabe utilise une lettre absente, le téléphone utilise sa police arabe système pour cette lettre. Pour régénérer les polices, voir l'outil `pyftsubset` de [fontTools](https://github.com/fonttools/fonttools).

---

## Organisation du code

| Fichier | Rôle |
|---|---|
| `index.html` | Structure des écrans. |
| `css/style.css` | Apparence, thèmes sombre et clair, animations. |
| `js/textes.js` | Tous les textes de l'interface, pour pouvoir ajouter une autre langue. |
| `js/vocabulaire.js` | Le vocabulaire (généré). La langue cible est dans `LANGUE_CIBLE`. |
| `js/moteur.js` | Le moteur de répétition espacée, les rangs et l'ordre des cartes. Il n'utilise pas le DOM et il est testé sous Node. |
| `js/correcteur.js` | La correction des réponses écrites (accents, une lettre d'écart, article). |
| `js/stockage.js` | La progression dans `localStorage`, avec un numéro de version, plus l'export et l'import. |
| `js/sons.js` | Les sons courts, synthétisés avec Web Audio. |
| `js/app.js` | L'interface : sessions, QCM, saisie, sprint, collection, réglages. |
| `sw.js` | Le service worker, en cache d'abord. |
| `outils/generer.js` | Le générateur et validateur du vocabulaire. |

### Règles du moteur

- Facilité initiale 2,5, jamais sous 1,3. En révision : Encore −0,20, Difficile −0,15, Correct 0, Facile +0,15.
- Carte neuve : étapes de 1 min puis 10 min. Sortie à 1 jour avec Correct, à 4 jours avec Facile.
- Révision réussie : Difficile ×1,2, Correct ×facilité, Facile ×facilité×1,3. Variation aléatoire de ±5 %.
- Encore sur une carte en révision : réapprentissage dans 10 min, puis la moitié de l'ancien intervalle, au moins 1 jour.
- Par défaut : 15 nouvelles cartes et 150 révisions par jour. Une carte ratée 8 fois est signalée comme difficile.
- Un mot est **ancré** quand son intervalle atteint 21 jours. Le rang et les compétences ne comptent que les mots ancrés.
