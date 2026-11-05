---
name: guide-composant
description: "Écrire le guide d'un composant d'après les design systems du marché, avant de le créer dans UCM. Charger quand le mainteneur dit « je veux créer un composant X, génère-moi un guide » ou « génère un guide pour le composant X ». Vaut pour n'importe quel composant."
---

# Guide d'un composant

Rend `docs/references/analyses/<id>.html` (gabarit 2) : cinq sections qui montrent les vrais composants des systèmes de `docs/references/systemes.json` dans une galerie, puis ce qu'il faut comprendre, dessiner et décider. Couches, licences, fraîcheur et commandes : [docs/references/README.md](../../../docs/references/README.md). Le seul guide au gabarit 2 est `segmented-control` : le lire comme modèle.

`guide.ts` désigne `npx tsx docs/references/_outils/guide.ts`, lancé depuis la racine.

## Étapes

| n° | Étape | Qui |
|---|---|---|
| 1 | `guide.ts etat "<nom>"` : cherche le nom dans l'index (`id`, nom français, noms locaux) ; liste les fiches présentes, absentes ou de plus de 12 mois, l'état du relevé et du guide | script |
| 2 | Composant absent de l'index : écrire son entrée dans `composants/index.json` ; voir « Entrée de l'index » | conversation principale |
| 3 | `guide.ts relever <id>` : écrit `composants/<id>/tokens.json` | script |
| 4 | Fiches absentes ou de plus de 12 mois : deux agents `releveur` au plus, chacun avec la moitié des systèmes ; chacun lance `guide.ts verifier <id>` | `releveur` (Sonnet) |
| 5 | Source de composant utile et absente : l'ajouter à `design-systems/_outils/figer.mjs` avec `usage: "composant"`, puis `recuperer.mjs`, `extraire.mjs`, `guide.ts relever <id>` ; jamais un fichier non figé | conversation principale |
| 6 | Écrire les scènes de `_outils/scenes/<id>/` ; voir « Scènes » | non fixé |
| 7 | `guide.ts carte <id>` : demande à JSPM la table d'imports de chaque scène de la galerie, l'écrit dans `<système>.carte.json` | script (réseau) |
| 8 | Lire les fiches et les scènes en action ; écrire `analyses/<id>.json` ; voir « Synthèse » | conversation principale |
| 9 | `guide.ts rendre <id>` : schéma, index, fiches, scènes, tables d'imports, références croisées, style ; écrit le HTML ou liste les erreurs | script |
| 10 | `npx tsx --test tests/referencesComposants.test.ts` par un `verificateur` ; montrer le HTML au mainteneur ; commiter par chemins | `verificateur`, puis conversation principale |

`carte` est la seule commande qui lit le réseau, et `etat` la seule qui lit l'horloge. `relever`, `verifier` et `rendre` ne lisent que les fichiers. `relever`, `verifier` et `rendre` acceptent `--tous` à la place d'un `id`.

## Entrée de l'index

- `id` : nom anglais en kebab-case, forme des composants d'UCM.
- `definition` : une phrase en français.
- `voisins` : des `id` de l'index. Un voisin absent s'ajoute avec `id`, `nom`, `definition`, `voisins` et `systemes: {}`.
- `systemes` : une clé par système vérifié.
  - Alias `{ nom, url }`, `note` si le système n'a qu'un motif proche (`wai-aria-apg`).
  - `null` : le système n'a pas ce composant, vérifié sur sa documentation.
  - Clé absente : pas encore vérifié.
- `motifs` : seulement pour un système au rôle `tokens`. Expressions ancrées sur les noms de `design-systems/<système>/noms.json`, trouvées par `Grep` dans ce fichier. Un motif large prend du bruit : `button` trouve aussi `md.comp.date-picker-docked.menu-button-*`.
- `guide.ts verifier <id>` refuse un motif qui ne trouve aucun nom.

## Systèmes qui reçoivent une fiche

- Rôle `composants` : `material-3`, `carbon`, `fluent-2`, `spectrum`, `atlassian`, `polaris`, `radix`, `ant-design`.
- Comportement et rédaction : `wai-aria-apg`, `react-aria`, `govuk`.
- Aucun autre système : `primer`, `figma-sds`, `shadcn`, `mui`, `untitled-ui`, `tailwind` n'apportent que noms et valeurs ; `open-ui` seulement un alias.
- Table `tokens` d'une fiche : seulement pour les systèmes marqués `tableDeTokens` (`carbon`, `material-3`, `ant-design`, `spectrum`). `verifier` refuse les autres.

## Prompt d'un `releveur`

Contient l'`id`, la liste de ses systèmes, l'entrée de l'index et la partie de `tokens.json` de ces systèmes. Rien d'autre.

## Scènes

Une scène montre le vrai composant d'un système, chargé depuis son paquet npm à la version figée dans la carte du guide. `guide.ts rendre` la place dans un `iframe` de la galerie. Elle demande donc le réseau à l'ouverture de la page.

- `_outils/scenes/scene.js` : coquille commune, placée avant chaque scène. Elle définit `CAS` (la liste `cas` du guide), `feuille(href)` et `monter(rendre)`.
- `_outils/scenes/<id>/commun.js` (facultatif) : données partagées des scènes du composant, placées entre la coquille et la scène. Exemple : libellés, tracés d'icônes.
- `_outils/scenes/<id>/<système>.js` : une scène par système de la galerie. Elle importe le paquet du système, charge sa feuille de style avec `feuille(url)` si le paquet en a une, puis appelle `monter(rendre)`.
- `rendre(cas, hote, signaler)` dessine le cas d'`id` `cas` dans `hote`. `signaler(valeur)` met à jour la ligne « Valeur ». Retourner un texte affiche une note sous le cas, quand le système ne permet pas ce cas.
- Un import nu (`react`, `antd`, `@react-spectrum/s2/icons/X`) doit correspondre à un paquet de `paquets` dans la carte de la galerie. `rendre` refuse l'import sans paquet, et une version écrite en dur (`npm:paquet@1.2.3`) absente de `paquets`.
- Après toute modification d'une scène ou de `paquets`, lancer `guide.ts carte <id>`. `rendre` refuse une table d'imports absente ou qui ne suit plus les imports.
- Un système sans scène (pas de paquet web, licence) va dans `absences`, pas dans `galerie`.

## Synthèse

`analyses/<id>.json` suit `docs/references/_outils/guide.schema.json`. Champs : `gabarit` (2), `composant` (l'`id`), `date`, `resume`, `cas`, `galerie`, `absences` (facultatif), `comprendre`, `dessiner`, `questions`. Le script produit `sources`.

| Section | Contenu | Bornes |
|---|---|---|
| en-tête | `resume` : ce qu'est le composant, une ou deux phrases ; `cas` : les cas que chaque scène montre, dans cet ordre (`id`, `titre`, `largeur` en px, facultative, 120 au moins) | 1 à 6 cas |
| `galerie` | une carte par système : `systeme`, `composant` (nom dans le code du système), `paquets` (nom et version exacte, `antd@6.6.3`), `points` (ce qui distingue ce composant, un fait par point), `note` facultative | 3 à 5 points |
| `absences` | un système au rôle `composants` qui a ce composant sans scène : `systeme`, `raison` | |
| `comprendre` | les différences entre systèmes qui changent le dessin : `titre`, `constat`, `options` (`nom`, `detail`, `systemes`), `decider` | 1 à 6 entrées ; 2 options au moins |
| `dessiner` | `tableaux` : variantes à créer dans Figma (`titre`, `colonnes`, `lignes` avec `nom`, `cellules`, `pourquoi`, `note` facultative) ; `proprietes` : `nom`, `valeurs`, `note` | une cellule par colonne |
| `questions` | `question`, `options`, `dependDe` | peut être vide |
| `sources` | fiches lues avec leur date et leurs pages, paquets de la galerie avec lien npm | script |

- Une cellule de `dessiner` vaut `oui` (affichée « À dessiner »), `non`, ou une condition qui commence par « Si ».
- Une option de `comprendre` cite des systèmes par `id`. Chacun a une carte dans `galerie` ou une entrée dans `absences`, sinon `rendre` refuse.
- Un système au rôle `composants` avec un alias non nul dans l'index a une carte dans `galerie` ou une entrée dans `absences`, jamais les deux, sinon `rendre` refuse.
- `rendre` refuse la fiche d'un système au rôle `composants` lue plus de 12 mois avant la `date` du guide : la relire avec un `releveur`.
- Les points, constats, options et notes sont en français, paraphrasés. Les noms locaux restent dans la langue du système.- La prose du JSON passe `scripts/controle-style.mjs`, que `rendre` applique.

## Interdits

- Copier la prose d'une page ; joindre une capture.
- Publier le guide ou une maquette en ligne (artefact claude.ai) : le travail reste dans le dépôt.
- Éditer `tokens.json`, un `<système>.carte.json` ou un HTML de `analyses/` à la main.
- Trancher une question à la place du mainteneur : la section `questions`.

## Critères de fin

- `guide.ts rendre <id>` sort sans erreur.
- `npx tsx --test tests/referencesComposants.test.ts` passe : il refuse un `tokens.json`, une table d'imports ou un HTML qui ne suit plus ses données.
- Chaque système au rôle `composants` avec un alias non nul a une carte dans la galerie ou une entrée dans `absences`.
- Chaque système cité par une option de `comprendre` figure dans la galerie ou dans `absences`.
