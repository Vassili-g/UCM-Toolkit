# Reprise de H0

Les calculs du moteur et leur raccordement au geste de teinte sont prêts à
relire. La case H0 reste décochée. Aucun commit ni push.

## Fichiers

Créés :

- `packages/couleur/src/harmonisation.ts`
- `packages/couleur/tests/harmonisation.test.ts`
- Cette note.

Modifiés :

- `packages/couleur/src/index.ts` : export du nouveau module.
- `packages/plugin-palettes/src/edition.ts` : raccordement de `reglerTeinte` ;
  voir « Relecture » pour le rangement des réglages qui en sort.

Les fichiers de P3,
P4 et P5, le README des recherches et le dossier « Architecture globale UCM »
n'ont pas été modifiés par Codex. Les fichiers de cette tâche sont en LF.

## Calculs disponibles

`candidatDeTeinte(recette, palette, ecartCommun, cible = 'deux')` décale les
deux profils du même écart. Le quatrième argument conserve les gestes visant
un seul profil dans Création. `reglerTeinte` convertit la valeur visée par sa
cible en écart avant cet appel. Le candidat conserve le départ, l'originale,
la saturation et la luminosité ; il retire les réglages nuls et rend les
octets du départ quand la teinte revient à zéro.

`courseDeTeinte(recette, palette)` rend `{ bas, haut }` en écart commun.
La course croise les bornes des profils et les limites des garanties tenues
au départ, au pas de 1°. Les garanties sont relevées par `verifierPromesses` ;
les candidats sont jugés avec leurs rampes déjà calculées. Les garanties
manquées au départ ne bornent pas la course.

`zonesTropProches(recette, palette, autre, profilAffiche?)` rend des intervalles
`{ debut, fin }`, bornes incluses. Le profil affiché est le porteur par défaut.
Pour une intensité unique, il désigne toujours la valeur rangée sous `vivid`.
Les trois mesures de proximité suivent les mêmes rôles, thèmes et seuil que
l'alerte existante ; leur égalité est éprouvée degré par degré. Les rampes
de l'autre palette sont calculées une fois par appel. Une paire déjà séparée
n'entraîne aucun balayage.

`sortieLaPlusProche(recette, palette, autre)` rend un écart commun signé,
zéro pour une paire déjà séparée et `null` sans sortie permise. Une égalité
entre les deux sens prend l'écart négatif. Pour choisir entre deux palettes
à régler, comparer les valeurs absolues des sorties.

Les palettes libres se règlent mais sortent de l'alerte de rôles. Une palette
figée reste immobile. Les palettes ternes et celles qui manquent d'un cran
nécessaire sortent aussi de cette comparaison.

`grisDeMemeClarte` encode `L³` sur les trois canaux sRGB, puis arrondit à
8 bits. Les tests couvrent le blanc, le noir et 506 couleurs, avec une
tolérance de 0,005 sur la clarté OKLab.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run build --workspace @ucm-kit/core` | Réussi |
| `npx tsx --test packages/couleur/tests/harmonisation.test.ts` | 15 tests réussis |
| `npm test --workspace ucm-couleur` | 332 tests réussis, 1 `todo`, aucun échec bloquant |
| `npm test --workspace ucm-palettes-plugin` | 495 tests réussis |
| `npm run typecheck --workspace ucm-couleur` | Réussi |
| `npm run typecheck` | Réussi |
| `npx tsx --test tests/inventaireInvariants.test.ts` | 9 tests réussis |
| `node scripts/controle-style.mjs` sur les fichiers de cette tâche | Style conforme |
| Contrôle des fins de ligne et `git diff --check` sur les fichiers de cette tâche | LF, aucun défaut d'espacement |

Les 15 tests nouveaux couvrent notamment la course de −10° à +5° avec
Soft à +25° et Vivid à −20°, sa conversion dans chaque profil affiché,
le retour à l'origine, les candidats égaux au geste, les garanties et les
paires sans sortie. Les suites d'interface `test:ui` restent à Claude.

## Questions ouvertes

Aucune question nouvelle pour H0. Le test `todo` préexistant de
`desaturees.test.ts` sur stone-950 reste en attente du choix du mainteneur,
déjà décrit au point de reprise du plan.

## Relecture

Deux copies de règles existantes sont supprimées. Le comportement de H0 reste
le même.

### Rangement des réglages

`appliquerLesReglages`, `sansZero` et `ValeursReglees` passent de
`packages/plugin-palettes/src/edition.ts` à `packages/couleur/src/reglages.ts`,
et `appliquerLesReglages` et `ValeursReglees` sont exportés. `edition.ts`
importe `appliquerLesReglages` et `ValeursReglees` depuis `ucm-couleur` pour
la luminosité, la saturation et ses autres gestes. `candidatDeTeinte` ne
garde que la palette figée rendue telle quelle, la cible d'un seul profil,
les bornes ±30° par profil et l'arrondi au centième ; il confie le
rangement (départ, originale, porteur, base, référence) à
`appliquerLesReglages`.

### Couleurs comparées

`nuancesDeProximite` et `proximiteDeNuances` de `packages/couleur/src/alertes.ts`
sont exportés, avec le type `NuancesDeProximite`. `nuancesDeProximite` prend un
paramètre `rampes` facultatif, par défaut `rampesDe(recette, palette)`.
`pairesTropProches` et `proximiteDePalettes` gardent leur comportement.
`harmonisation.ts` perd `MESURES`, `couleursComparees`, `distanceMin` et
`entreDansLaComparaison`. Il lit les crans dans `grilleDe(recette, palette)`
et non plus dans `recette.crans`, comme l'alerte.

### Carte du code

`AGENTS.md` décrit `reglages.ts` avec le rangement des réglages et reçoit une
ligne pour `harmonisation.ts`.

### Résultats

| Commande | Résultat |
|---|---|
| `npm run build --workspace @ucm-kit/core` | Réussi |
| `npm test --workspace ucm-couleur` | 332 tests réussis, 1 `todo` préexistant, 0 échec |
| `npm test --workspace ucm-palettes-plugin` | 495 tests réussis |
| `npm run typecheck` | Réussi |
| `node scripts/run-tests.cjs` | 29 tests réussis |
| `npx tsx --test tests/inventaireInvariants.test.ts` | Réussi |
| `node scripts/controle-style.mjs` sur les fichiers modifiés | Style conforme |

Les suites `test:ui` restent à Claude.
