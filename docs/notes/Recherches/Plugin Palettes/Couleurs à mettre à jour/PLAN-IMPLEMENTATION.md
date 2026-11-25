# Plan d'implémentation des couleurs à mettre à jour

Dans l'onglet Gestion d'UCM Palettes, une palette dont le plugin a changé des couleurs montre ces couleurs, avant et après, dès qu'elle est dépliée, et le designer écrit depuis cet encart. L'encart « Modifiés dans Figma » prend la même grille, sans limite, et déplier une palette replie les autres. La maquette validée est [MAQUETTE-COULEURS-A-METTRE-A-JOUR.html](./Maquettes/MAQUETTE-COULEURS-A-METTRE-A-JOUR.html).

Chaque lot se donne tel quel à un agent. Cocher sa case avec le hash de son commit.

## Avancement

- [ ] L1. Les couleurs d'une mise à jour et leurs groupes, sans DOM
- [ ] L2. Une seule palette dépliée
- [ ] L3. Les textes de l'encart, et le retrait de « Tout mettre à jour »
- [ ] L4. L'encart des couleurs à mettre à jour et la grille partagée
- [ ] L5. Les états de la galerie
- [ ] L6. Les tests d'interface
- [ ] L7. La spécification, le README et la carte
- [ ] L8. Vérification et clôture

## Décisions

| Point | Décision |
|---|---|
| D1 | Une palette « À mettre à jour » dont seules des couleurs ont changé dans le plugin ouvre d'office son encart quand elle est dépliée. Replier la palette ferme l'encart sans rien écrire. |
| D2 | Le plugin ne dit pas pourquoi les couleurs ont changé. Le suivi ne stocke aucune version. |
| D3 | Déplier une palette replie les autres. |
| Q5 | Toutes les couleurs s'affichent, même 52. |
| Q6 | Le texte `toutMettreAJour` disparaît des catalogues et de `tests/textes.test.ts`. |
| Encart `modifiees` | Même grille, colonnes « Nuance », « Dans Figma », « Dans le plugin », sans `COULEURS_LISTEES` ni « Et N autres ». Les deux choix ne changent pas. |

## Ce que le code fait aujourd'hui

Les chemins de cette section sont relatifs à `packages/plugin-palettes/`.

- `ligneDesTokens` (`src/ui/ongletGestion.ts`, vers la ligne 670) pose « Mettre à jour » sur la ligne « Tokens Figma ». Son clic suit trois branches. Des couleurs changées dans Figma rouvrent l'encart `modifiees`. Des créations, des variables existantes, des renommages ou un remplacement de reprise ouvrent `ouvrirLEcriture`. Le reste écrit tout de suite par `ecrire([id], [])`.
- La dernière branche couvre le cas « seulement des couleurs changées » : `etat` vaut `a-mettre-a-jour`, chaque entrée de `aEcrire` a `ecrite !== null`, et `aCreer`, `existantes`, `aRenommer` sont vides, sans reprise ni destination changée. Elle couvre aussi une destination changée sans création et une palette dont des noms sont occupés. Seul le premier cas change. Une palette reprise passe par `encartDuRemplacement`, une destination changée crée ses variables par l'encart d'écriture, et les deux restent tels quels.
- Pour une entrée de `aEcrire`, `ecrite` est aussi la couleur que Figma porte : une couleur lue qui diffère de `ecrite` range l'entrée dans `modifiees` (`src/variables/etat.ts`). La colonne « Dans Figma » lit donc `ecrite`.
- La clé d'une entrée est `{intensité}/{thème}/{nuance}` (`cleDuPlan`, `src/variables/plan.ts`). Le plan range intensité, puis thème, puis nuance. La maquette range thème Light puis Dark, puis intensité.
- Avec les thèmes en modes, Light et Dark portent le même nom de variable : deux groupes auraient le même chemin.
- `depliees` (vers la ligne 218) reçoit cinq écritures : `ouvrirLEcriture` (664), `basculerLaLigne` (934), `deplierLesDecisions` (1107, plusieurs palettes à la fois), `recevoirVariables` (1568, chaque palette refusée) et `recevoirDestination` (1595). `ligneDepliable` (961) la lit. Aucun focus ni aucune ouverture de la galerie n'y écrit par un autre chemin : la galerie clique les bascules.
- `COULEURS_LISTEES` (ligne 132) sert à `encartDesModifiees` et à `encartDuRemplacement`. `valeurDansFigma`, `valeurDansLePlugin` et `etNAutres` restent lus par `encartDuRemplacement` après ce plan.
- `toutMettreAJour` n'a aucun lecteur hors de `src/i18n/fr.ts`, `src/i18n/en.ts` et `tests/textes.test.ts` (grep sur tout le dépôt, `node_modules`, `dist` et `.git` exclus). `confirmationDeLaMiseAJour`, la confirmation du même bouton, n'a aucun lecteur hors des deux catalogues. `rendreLesGestes` (ligne 461) cherche encore `[data-geste="tout-mettre-a-jour"]`.
- Cinq états de galerie déplient plusieurs palettes : `planche-a-jour`, `planche-perimee`, `tokens-jamais-ecrits`, `tokens-a-jour` et `fiche-refaite`.
- Le helper `ouvrirLaPlanche` de `tests/interface/interface.test.mjs` (vers la ligne 4366) déplie chaque palette repliée jusqu'à n'en plus trouver. Avec D3, il ne s'arrêterait jamais. 42 tests l'appellent, et `etatsDesLignes` et `gestesDeLaPlanche` lisent plusieurs fiches ouvertes.

## Règles changées dans la spécification

La spécification est [RECHERCHE-PLUGIN-PALETTES.md](../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md).

| Règle | Ligne | Changement |
|---|---|---|
| `[UI-27]` | 2831 | « Plusieurs lignes restent dépliées à la fois » devient une seule ligne dépliée. Une décision nouvelle remplace la ligne dépliée. |
| `[UI-31]` | 2867 | « Mettre à jour écrit sans encart tant qu'il ne crée rien » devient l'encart d'office pour des couleurs changées dans le plugin. |
| `[UI-32]` | 2878 | « six au plus puis Et N autres » devient la grille sans limite, et l'alias se dit. |
| Table des états de la galerie | 3038 | « Tokens à mettre à jour » décrit l'encart. Deux lignes s'ajoutent pour les deux états neufs de L5. |
| `[PLA-06]`, `[PLA-24]`, schéma de §13.2, trois lignes de la table des états | 1139, 1368, 2778, 3022, 3027, 3033 | Elles décrivent « Tout mettre à jour », que `[UI-28]` a retiré. Question Q2. |

`[VAR-05]` et `[VAR-06]` ne changent pas.

## Textes

Les textes statiques vont dans `TEXTES_DE_LA_GESTION`, les fonctions à côté de `titreDesModifiees`, dans `src/i18n/fr.ts` et `src/i18n/en.ts`.

| Clé | Français | Anglais |
|---|---|---|
| `TEXTES_DE_LA_GESTION.nuance` | `Nuance` | `Shade` |
| `TEXTES_DE_LA_GESTION.dansFigma` | `Dans Figma` | `In Figma` |
| `TEXTES_DE_LA_GESTION.dansLePlugin` | `Dans le plugin` | `In the plugin` |
| `TEXTES_DE_LA_GESTION.apresLaMiseAJour` | `Après la mise à jour` | `After the update` |
| `TEXTES_DE_LA_GESTION.alias`, remplace `aliasDansFigma` | `Un alias` | `An alias` |
| `titreDesCouleursAMettreAJour(1, nom)` | `1 couleur de ${nom} a changé dans le plugin.` | `1 color of ${nom} changed in the plugin.` |
| `titreDesCouleursAMettreAJour(n, nom)` | `${n} couleurs de ${nom} ont changé dans le plugin.` | `${n} colors of ${nom} changed in the plugin.` |
| `texteDesCouleursAMettreAJour(1)` | `Figma porte encore la couleur de la dernière écriture. La mise à jour la remplace par celle du plugin.` | `Figma still has the color from the last write. The update replaces it with the plugin’s.` |
| `texteDesCouleursAMettreAJour(n)` | `Figma porte encore les couleurs de la dernière écriture. La mise à jour les remplace par celles du plugin.` | `Figma still has the colors from the last write. The update replaces them with the plugin’s.` |
| `mettreAJourNCouleurs(1)` | `Mettre à jour 1 couleur` | `Update 1 color` |
| `mettreAJourNCouleurs(n)` | `Mettre à jour ${n} couleurs` | `Update ${n} colors` |

L'en-tête d'un groupe dont le chemin se répète (thèmes en modes) ajoute ` · ` puis `TEXTES.modeClairCourt` ou `TEXTES.modeSombreCourt`, déjà au catalogue (`Light`, `Dark` dans les deux langues).

## Ordre et parallélisme

```
L1 (gestion.ts) ──┐
L2 (dépliée) ─────┼──► L3 (textes) ──► L4 (encart) ──┬──► L5 (galerie) ──┐
                  │                                  └──► L6 (tests UI) ─┴──► L7 (documents) ──► L8 (clôture)
```

- L1 et L2 tournent en parallèle : `src/variables/gestion.ts` et `src/ui/ongletGestion.ts` sont disjoints.
- L3 tourne seul, ou en parallèle de L2 si L1 est commité. Il touche les catalogues, que L4 lit.
- L4 attend L1, L2 et L3. L2 et L4 éditent `ongletGestion.ts` et ne tournent jamais ensemble.
- L5 et L6 tournent en parallèle après L4 : `galerie/etats.cjs` et `tests/interface/interface.test.mjs` sont disjoints.
- L7 attend L5 et L6, pour décrire ce que le code fait. L8 vient en dernier.
- Deux agents au plus à la fois. La conversation principale relit le diff et commite chaque lot par chemins explicites avant de lancer un lot qui en dépend.

## L1. Les couleurs d'une mise à jour et leurs groupes, sans DOM

- Agent `implementeur` (Sonnet). Deux fonctions pures et leur test, sur un périmètre fermé.
- Nature de la tâche : comportement nouveau, sans écran.

Objectif. Deux fonctions exportées de `src/variables/gestion.ts`, que L4 lit seules.

1. `couleursAMettreAJour(tokens)` prend un `Pick<TokensDUnePalette, 'etat' | 'reprise' | 'refus' | 'destinationChangee' | 'aCreer' | 'existantes' | 'aRenommer' | 'modifiees' | 'aEcrire'>`, sur le modèle d'`ecartsDeLaReprise`. Elle rend `aEcrire` quand `etat === 'a-mettre-a-jour'`, `!reprise`, `refus === null`, `!destinationChangee`, `aCreer`, `existantes`, `aRenommer` et `modifiees` vides, `aEcrire` non vide et chaque entrée avec `ecrite !== null`. Sinon elle rend `[]`. Son commentaire cite `[UI-31]`.
2. `groupesDeCouleurs(couleurs)` prend des `{ cle, nom, avant: string | null, apres: string }` dans l'ordre du plan. Elle rend des `{ chemin, theme: Mode | null, lignes: { nuance, avant, apres }[] }`.
   - Le groupe se lit sur la clé, intensité et thème. Le chemin est le nom jusqu'au dernier `/` compris : `color/Jaune/soft/light/` pour `color/Jaune/soft/light/50`.
   - La nuance est le dernier segment de la clé, pas du nom : les règles de nommage peuvent changer le nom.
   - Les groupes se rangent par thème dans l'ordre de `MODES` (`ucm-couleur`), puis par intensité dans l'ordre de première apparition. Les lignes gardent l'ordre reçu.
   - `theme` vaut le thème du groupe quand un autre groupe a le même chemin, `null` sinon.
   - `avant === null` (alias dans Figma) passe tel quel.

Fichiers touchés :

- `packages/plugin-palettes/src/variables/gestion.ts`
- `packages/plugin-palettes/tests/miseAJourDesCouleurs.test.ts`, nouveau

Critères de fin :

- `tests/miseAJourDesCouleurs.test.ts` porte ces cas, chacun nommé par `[UI-31]` ou `[UI-32]` :
  - couleurs seules, la liste rendue ;
  - un cas `[]` pour chacune des conditions : créations, existantes, renommages, destination changée, reprise, refus, couleurs modifiées dans Figma, une entrée `ecrite === null`, état `a-jour` ;
  - thèmes dans le chemin, plan Soft Light, Soft Dark, Vivid Light, Vivid Dark, groupes rendus Soft Light, Vivid Light, Soft Dark, Vivid Dark, chaque `theme` à `null` ;
  - thèmes en modes, deux groupes de même chemin, `theme` à `light` puis `dark` ;
  - un `avant` à `null` gardé ;
  - une intensité `unique`.
- `npx tsx --test tests/miseAJourDesCouleurs.test.ts tests/variables.test.ts`, lancé depuis `packages/plugin-palettes/`, passe.
- `npx tsc --noEmit -p packages/plugin-palettes` passe.

## L2. Une seule palette dépliée

- Agent `implementeur-exigeant` (Sonnet). Le lot change cinq écritures et une lecture d'une même règle.
- Nature de la tâche : comportement nouveau.

Objectif. `depliees` devient `let depliee: string | null = null` dans `src/ui/ongletGestion.ts`.

1. `basculerLaLigne` : `depliee = depliee === cle ? null : cle`. Le focus reste sur la bascule, comme aujourd'hui.
2. `ligneDepliable` : `const ouverte = depliee === ligne.cle`.
3. `ouvrirLEcriture` et `recevoirDestination` : `depliee = id` et `depliee = ensuite`.
4. `recevoirVariables` : la première issue ni `ecrite` ni `absente` devient `depliee`. Une écriture ne porte qu'une palette depuis le retrait de « Tout mettre à jour ».
5. `deplierLesDecisions` : chaque palette qui attend une décision nouvelle entre dans `deplieesSeules`, comme aujourd'hui. La première d'entre elles dans l'ordre de la liste devient `depliee`, par `paletteADeplier`. L'ordre de la liste est celui de `rendre` : `rangerSelon(..., ordreAlphabetique(lue, nomDeLaPalette, i18n.langue), ...)`.
6. `paletteADeplier(depliee, ordre, nouvelles)` s'ajoute à `src/presentation.ts`. Elle rend le premier identifiant d'`ordre` présent dans `nouvelles`, sinon `depliee`. Son commentaire cite `[UI-27]`.
7. `rendreLesGestes` (ligne 461) ne cherche plus `[data-geste="tout-mettre-a-jour"]` (Q6).
8. Le commentaire d'en-tête du fichier et celui de `depliees` disent la règle : une seule ligne dépliée, qu'une décision nouvelle remplace.

Fichiers touchés :

- `packages/plugin-palettes/src/ui/ongletGestion.ts`
- `packages/plugin-palettes/src/presentation.ts`
- `packages/plugin-palettes/tests/presentation.test.ts`

Critères de fin :

- `tests/presentation.test.ts` reçoit un test `[UI-27]` : aucune décision nouvelle garde la palette dépliée ; une décision nouvelle la remplace ; deux décisions nouvelles donnent la première de l'ordre ; `null` reste `null` sans décision.
- `grep -n "depliees\b" packages/plugin-palettes/src/ui/ongletGestion.ts` ne rend rien.
- `npx tsx --test tests/presentation.test.ts tests/stylesUi.test.ts tests/loiDesTextes.test.ts`, depuis `packages/plugin-palettes/`, passe.
- `npx tsc --noEmit -p packages/plugin-palettes` passe.
- Le compte rendu nomme les écrans qui changent : les cinq états de galerie de la section « Ce que le code fait aujourd'hui ».

## L3. Les textes de l'encart, et le retrait de « Tout mettre à jour »

- Agent `executant` (Haiku). Les textes exacts sont dans la section « Textes » ; le lot les recopie.
- Nature de la tâche : texte nouveau.

Objectif.

1. Ajouter les clés et les fonctions de la section « Textes », en français et en anglais, avec un commentaire d'une ligne par fonction qui cite `[UI-31]` ou `[UI-32]`.
2. Remplacer `aliasDansFigma` par `alias` dans les deux catalogues, et dans son seul lecteur, `encartDesModifiees` de `src/ui/ongletGestion.ts` (`TEXTES_DE_LA_GESTION.aliasDansFigma` devient `TEXTES_DE_LA_GESTION.alias`).
3. Retirer `toutMettreAJour` des deux catalogues, son import et son assertion de `tests/textes.test.ts` (ligne 25 et ligne 362).
4. Retirer `confirmationDeLaMiseAJour` des deux catalogues (Q2).

Fichiers touchés :

- `packages/plugin-palettes/src/i18n/fr.ts`
- `packages/plugin-palettes/src/i18n/en.ts`
- `packages/plugin-palettes/tests/textes.test.ts`
- `packages/plugin-palettes/src/ui/ongletGestion.ts`, une seule ligne (point 2)

Critères de fin :

- `tests/textes.test.ts` reçoit un test `[UI-31]` qui vérifie le singulier et le pluriel de `titreDesCouleursAMettreAJour`, `texteDesCouleursAMettreAJour` et `mettreAJourNCouleurs` en français, aux textes exacts de la section « Textes ».
- `grep -rn "toutMettreAJour\|confirmationDeLaMiseAJour\|aliasDansFigma" packages/plugin-palettes/src packages/plugin-palettes/tests` ne rend rien.
- `npx tsx --test tests/textes.test.ts tests/i18n.test.ts tests/loiDesTextes.test.ts`, depuis `packages/plugin-palettes/`, passe.
- `node scripts/controle-style.mjs packages/plugin-palettes/src/i18n/fr.ts` ne signale aucun refus.
- Aucun marqueur `TODO(texte)`.

## L4. L'encart des couleurs à mettre à jour et la grille partagée

- Agent `implementeur-exigeant` (Sonnet). Le lot reproduit la maquette au pixel près et change trois lecteurs de la règle de l'encart : `ligneDesTokens`, `ficheDePalette` et `encartDesModifiees`.
- Nature de la tâche : écran nouveau.

Objectif.

1. `grilleDesCouleurs(groupes, droite: Texte): HTMLDivElement`, dans la portée de `construireVues` de `src/ui/ongletGestion.ts`, rend le DOM de la fonction `grille` de la maquette :
   - `div.avant-apres` ;
   - trois `span.entete` : `TEXTES_DE_LA_GESTION.nuance`, `TEXTES_DE_LA_GESTION.dansFigma`, puis `droite` ;
   - par groupe, `div.groupe` qui porte un `code` au texte du chemin, ou du chemin suivi de ` · Light` ou ` · Dark` quand `theme` n'est pas `null`, avec le chemin en `title` ;
   - par ligne, `span.nuance`, puis deux `valeur(hexa, hexa)` ; un `avant` à `null` donne `valeur(null, TEXTES_DE_LA_GESTION.alias)`, sans pastille.
2. `encartDesCouleursAMettreAJour(id, nom, couleurs)` rend `div.encart` avec `data-encart="mise-a-jour"` et `data-ton="avertissement"`. Il contient, dans cet ordre :
   - `p.encart-titre`, `titreDesCouleursAMettreAJour(n, nom)` ;
   - `p.ligne-secondaire`, `texteDesCouleursAMettreAJour(n)` ;
   - `grilleDesCouleurs(groupesDeCouleurs(...), TEXTES_DE_LA_GESTION.apresLaMiseAJour)`, avec `avant = ecrite` et `apres = plugin` ;
   - `div.confirmation-gestes`, qui porte le seul bouton `gesteDEcriture(mettreAJourNCouleurs(n), 'primary', 'confirmer-ecriture', ...)`. Son clic pose `gesteAFocaliser = { palette: id, geste: 'modifier' }` puis appelle `ecrire([id], [])`. Il n'y a pas d'« Annuler ».
3. `ficheDePalette` : après la branche `modifiees` et la branche `encart === id`, une troisième branche pousse cet encart quand `couleursAMettreAJour(etatDesTokens)` n'est pas vide.
4. `ligneDesTokens`, cas `a-mettre-a-jour` : `gestes` vaut `[]` quand `couleursAMettreAJour(etat)` n'est pas vide. Le détail reste `couleursChangeesDansLePlugin`. Le commentaire de la dernière branche du clic dit les cas qu'elle couvre encore.
5. `encartDesModifiees` : les lignes `.ecart` et le paragraphe « Et N autres » disparaissent. La grille, avec `avant = figma`, `apres = plugin` et `TEXTES_DE_LA_GESTION.dansLePlugin` à droite, suit le titre. Les choix « Laisser » et « Remettre » ne changent pas.
6. `COULEURS_LISTEES` garde son seul lecteur, `encartDuRemplacement` ; son commentaire cite `[UI-34]` à la place de `[UI-32]`.
7. `src/ui/styles.css`, après la règle `.ecart code`, reçoit les règles de la maquette :

   ```css
   /* Les couleurs d'un encart, dans Figma et dans le plugin, groupées par chemin de variable ([UI-31], [UI-32]). */
   .avant-apres {
     display: grid;
     align-items: center;
     gap: var(--espace-serre) var(--espace-controle);
     grid-template-columns: 44px 150px 150px;
   }

   .avant-apres .entete {
     color: var(--texte-second);
     font-size: 11px;
   }

   .avant-apres .groupe {
     grid-column: 1 / -1;
     margin-top: var(--espace-serre);
     overflow: hidden;
     text-overflow: ellipsis;
     white-space: nowrap;
   }

   .avant-apres .groupe code {
     color: var(--texte-second);
     font-size: 11px;
   }

   .avant-apres .nuance {
     font-variant-numeric: tabular-nums;
   }

   .avant-apres .valeur i {
     width: 20px;
     height: 20px;
   }
   ```

8. Le commentaire d'en-tête de `ongletGestion.ts` nomme le troisième encart de la fiche.

Fichiers touchés :

- `packages/plugin-palettes/src/ui/ongletGestion.ts`
- `packages/plugin-palettes/src/ui/styles.css`

Critères de fin :

- `grep -rn "EAB308\|FBF9DB\|Jaune\|8A5A00\|835925\|6E4500\|6A431B" packages/plugin-palettes/src` ne rend rien : aucune donnée de la maquette dans `src/`.
- `npx tsx --test tests/stylesUi.test.ts tests/loiDesTextes.test.ts tests/i18n.test.ts tests/miseAJourDesCouleurs.test.ts`, depuis `packages/plugin-palettes/`, passe. `stylesUi` refuse une classe posée sans règle et une règle sans classe.
- `npx tsc --noEmit -p packages/plugin-palettes` passe.
- `npm run galerie:plugin -- palettes` construit, et les états `tokens-a-mettre-a-jour` et `tokens-modifies` de `packages/plugin-palettes/dist/galerie/index.html` montrent la proposition de la maquette. Le compte rendu nomme ces deux écrans.

## L5. Les états de la galerie

- Agent `implementeur` (Sonnet). Le lot change des données et des descriptions dans un seul fichier.
- Nature de la tâche : écran nouveau.

Objectif. `packages/plugin-palettes/galerie/etats.cjs` suit D1 et D3.

1. Chaque état qui déplie plusieurs palettes n'en déplie plus qu'une, et son `regarder` dit que les autres lignes restent repliées, avec leurs pastilles d'état.

   | État | Palette dépliée | Pourquoi |
   |---|---|---|
   | `planche-a-jour` | Bleu | « À jour », « page Palettes » et « Afficher » |
   | `planche-perimee` | Jaune | « Actualiser » et « Afficher » ; les pastilles de Bleu et d'Ardoise donnent leur état |
   | `tokens-jamais-ecrits` | Ardoise | « Écrire dans les tokens » et « Créer la planche » dans la même fiche |
   | `tokens-a-jour` | Bleu | « À jour » et « 44 variables » |
   | `fiche-refaite` | Jaune | la disposition de la fiche avec « Actualiser » |

2. `tokens-a-mettre-a-jour` : le `regarder` décrit l'encart. Jaune, « À mettre à jour », « 2 couleurs ont changé dans le plugin », sans geste sur la ligne ; dessous, l'encart d'avertissement « 2 couleurs de Jaune ont changé dans le plugin. », la phrase de la section « Textes », la grille « Nuance », « Dans Figma », « Après la mise à jour », le groupe `color/Jaune/vivid/light/` avec 700 et 800, puis « Mettre à jour 2 couleurs », seul.
3. `tokens-modifies` : le `regarder` décrit la grille, colonnes « Dans Figma » et « Dans le plugin », sans suffixe après les valeurs.
4. Un état neuf `tokens-a-mettre-a-jour-chemins` : Jaune a changé dans le plugin les clés `soft/light/50`, `vivid/light/700`, `soft/dark/700` et `vivid/dark/700`, par `fausser` sur `ecrite`. Le `regarder` donne l'ordre des groupes : `soft/light`, `vivid/light`, `soft/dark`, `vivid/dark`.
5. Un état neuf `tokens-modifies-nombreux` : huit couleurs de Jaune changées à la main, par `fausser` sur `lue`, sur trois chemins au moins. Le `regarder` dit huit lignes et aucun « Et N autres ».

Fichiers touchés :

- `packages/plugin-palettes/galerie/etats.cjs`

Critères de fin :

- `npx tsx --test tests/galerie.test.ts`, depuis `packages/plugin-palettes/`, passe.
- `npm run galerie:plugin -- palettes` construit, et chaque état de la table du point 1 montre une seule fiche ouverte.
- Le compte rendu nomme les sept écrans changés et les deux neufs.

## L6. Les tests d'interface

- Agent `implementeur-exigeant` (Sonnet). Le lot change un helper que 42 tests lisent.
- Nature de la tâche : tests d'un comportement nouveau.
- L'agent ne lance pas `test:ui` : `_local/autorise-test-ui` n'existe pas. Il vérifie la syntaxe seule.

Objectif. `packages/plugin-palettes/tests/interface/interface.test.mjs` suit D1, D3 et la grille.

1. `ouvrirLaPlanche(page, palette)` ouvre Gestion, puis déplie `palette` quand elle est donnée et repliée. Chacun des 42 appels passe la palette que ses assertions lisent, ou aucune.
2. `etatsDesLignes` lit l'état de la planche de chaque ligne : `.sortie[data-sortie="planche"] .pastille-d-etat` pour la ligne dépliée, la dernière `.palette-etats .pastille-d-etat` pour une ligne repliée. `gestesDeLaPlanche` déplie chaque palette à son tour et lit ses gestes.
3. `[UI-27] une ligne se déplie au clic ou au clavier` (vers la ligne 1504) : « Plusieurs lignes restent dépliées à la fois » devient « Déplier une autre ligne replie la première » (une seule `.palette-fiche`, Bleu à `aria-expanded="false"`).
4. `[UI-26] un état relu entre l'appui et le relâchement ne perd pas le clic` (vers la ligne 7690) presse `[data-encart="mise-a-jour"] [data-geste="confirmer-ecriture"]`. Le test vérifie aussi que la ligne « Tokens Figma » n'a pas de `[data-geste="mettre-a-jour"]`.
5. Tests neufs :
   - `[UI-31] une palette dont le plugin a changé des couleurs les montre dépliée, et n'écrit qu'au clic` : état `tokens-a-mettre-a-jour`, titre, en-têtes, groupe, deux lignes, aucun `ecrire-variables` avant le clic, puis une demande avec `palettes: [ID_DU_JAUNE]` et `remettre: []` ;
   - `[UI-31] replier la palette ferme l'encart sans rien écrire` ;
   - `[UI-31] les groupes suivent Light puis Dark, puis l'intensité` : état `tokens-a-mettre-a-jour-chemins`, ordre des `code` ;
   - `[UI-32] l'encart des couleurs changées dans Figma les liste toutes, sans suffixe` : état `tokens-modifies-nombreux`, huit lignes, aucun texte « Et », aucun « dans Figma » dans une valeur ;
   - `[UI-32] une variable qui porte un alias dit « Un alias », sans pastille` : le message de `tokens-modifies`, une valeur lue remplacée par un alias (`structuredClone`, comme le test de la ligne 1144) ;
   - `[UI-27] une décision nouvelle replie la palette dépliée` : Bleu dépliée, puis un état relu où Jaune attend une décision.
6. Les textes du test viennent de la section « Textes ».

Fichiers touchés :

- `packages/plugin-palettes/tests/interface/interface.test.mjs`

Critères de fin :

- `node --check packages/plugin-palettes/tests/interface/interface.test.mjs` passe.
- `grep -n "ouvrirLaPlanche(page)" packages/plugin-palettes/tests/interface/interface.test.mjs` ne rend que les appels qui ne lisent aucune fiche.
- Le compte rendu liste chaque test changé et chaque test neuf, et dit qu'aucun n'a tourné.

## L7. La spécification, le README et la carte

- Agent `implementeur` (Sonnet). Le lot réécrit des passages nommés, d'après le code de L1 à L6.
- Nature de la tâche : documentation.

Objectif.

1. Dans la spécification, `[UI-27]`, `[UI-31]`, `[UI-32]` et la table des états de la galerie suivent la section « Règles changées dans la spécification ». Les textes cités sont ceux de la section « Textes ».
2. Les mentions de « Tout mettre à jour » de `[PLA-06]`, de `[PLA-24]`, du schéma de §13.2 et des lignes « Génération en cours », « Confirmation au-delà de six palettes » et « Planche à actualiser » de la table des états disparaissent, ou décrivent le geste d'une fiche (Q2).
3. `packages/plugin-palettes/README.md`, paragraphe de Gestion (ligne 81) : un clic sur la ligne déplie sa fiche et replie les autres ; une palette dont le plugin a changé des couleurs les montre avant la mise à jour.
4. `packages/plugin-palettes/CARTE.md` : la ligne de `gestion.ts` nomme les couleurs d'une mise à jour et leurs groupes ; celle de `presentation.ts` nomme la ligne dépliée de Gestion ; celle de `ongletGestion.ts` nomme l'encart des couleurs à mettre à jour et la ligne dépliée unique.
5. Les lignes de `docs/notes/Recherches/Plugin Palettes/README.md` et le `README.md` du dossier, s'ils existent à ce moment, gardent leur texte. La conversation principale les ajoute.

Fichiers touchés :

- `docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`
- `packages/plugin-palettes/README.md`
- `packages/plugin-palettes/CARTE.md`

Critères de fin :

- `node scripts/controle-style.mjs` sur les trois fichiers ne signale aucun refus, et chaque signal est revu.
- `grep -n "Plusieurs lignes\|six au plus puis\|Tout mettre à jour" "docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md"` ne rend que la mention de `[UI-34]`, que Q1 garde.
- `npx tsx --test tests/styleDocumentaire.test.ts tests/docLinks.test.ts`, depuis la racine, passe.

## L8. Vérification et clôture

- Agent `verificateur` (Haiku) pour les commandes, en un seul appel, sur l'arbre de L1 à L7 commité. La conversation principale lit son tableau et relit les documents.

Commandes, dans cet ordre :

```sh
npm run test:paquet -- palettes
npm run typecheck
npm run build:plugin -- palettes
npm run galerie:plugin -- palettes
node --check packages/plugin-palettes/tests/interface/interface.test.mjs
node scripts/run-tests.cjs
node scripts/controle-style.mjs "docs/notes/Recherches/Plugin Palettes/Couleurs à mettre à jour/PLAN-IMPLEMENTATION.md" "docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md" packages/plugin-palettes/README.md packages/plugin-palettes/CARTE.md
npm run agents:diff
```

`node scripts/run-tests.cjs` est la suite racine : CONTRIBUTING la demande quand la tâche touche Palettes, et elle porte `registreDesDocuments`, `plansDeRecherche` et `dossiersDeRecherche`.

Critères de fin :

- Chaque commande passe. `test:ui` ne tourne que si le mainteneur a créé `_local/autorise-test-ui`.
- La conversation principale relit chaque document que `npm run agents:diff` liste, et retire toute description devenue fausse.
- La conversation principale regarde les états `tokens-a-mettre-a-jour`, `tokens-a-mettre-a-jour-chemins`, `tokens-modifies`, `tokens-modifies-nombreux` et `gestion-depliee` dans `dist/galerie/` et `dist/galerie-minimale/`, à côté de la maquette, et vérifie l'absence de défilement horizontal à 500 px.
- Chaque case de « Avancement » porte son hash.

## Stratégie d'économie de tokens

### Modèles

Sonnet porte les lots où une erreur coûte une relecture du mainteneur : L2 et L4 touchent plusieurs lecteurs d'une règle, L6 change un helper lu 42 fois, L1 pose une API que L4 lit, L5 et L7 décrivent des écrans. Haiku porte L3, une copie de textes donnés en entier, et L8, une suite de commandes. Aucun lot ne prend Opus.

### Le prompt de chaque agent

Le prompt évite à l'agent de relire le dépôt.

- La liste de `npm run agents:lire -- <chemins du lot>`, calculée par la conversation principale. Pour `ongletGestion.ts` et `fr.ts`, elle donne `AGENTS.md`, les sections 12.3, 13.1 et 13.2 de la spécification, `packages/plugin-palettes/AGENTS.md`, `CARTE.md`, `invariants/interface.md` et `invariants/langue.md`. Le prompt dit de lire dans la spécification les seules règles que le lot cite, par leur ligne.
- La section du lot, recopiée en entier, avec la section « Ce que le code fait aujourd'hui » pour L2, L4 et L6.
- Les noms de fonction et les lignes de départ : `ligneDesTokens` (670), `encartDesModifiees` (836), `basculerLaLigne` (933), `ficheDePalette` (1032), `deplierLesDecisions` (1101), `recevoirVariables` (1552), `recevoirDestination` (1582). Les lignes bougent après L2 : le prompt de L4 donne les noms seuls.
- Pour L4, le script de la maquette, fonctions `grille`, `valeur`, `bouton` et le bloc `plugin-proposition`, collés tels quels, et la feuille du point 7. L'agent n'ouvre pas `Maquettes/galerie/socle.css` (130 ko).
- Pour L3 et L6, la table de la section « Textes ».
- Les règles communes : `git status` d'abord ; aucun commit ; LF ; aucun fichier hors de la liste du lot sans le signaler ; jamais `test:ui` ; seules les commandes ciblées du lot, pas `npm run test:paquet`.

### Vérifications

Chaque implémenteur lance les seuls tests de son lot par `npx tsx --test <fichiers>` et le typecheck du paquet. La suite complète, le build et la galerie tournent une fois, dans L8, par un seul appel au `verificateur`. Une sortie longue en cours de lot (galerie de L4 et L5) passe aussi par un `verificateur`.

### Ce que la conversation principale relit

Le diff de chaque lot avant son commit. Les textes de L3 contre la section « Textes ». Les `regarder` de L5. Le texte des règles réécrites par L7, avec la skill `relire-le-style`. Le tableau de L8.

## Questions ouvertes

Q2 à Q9 suivent la recommandation. Q1 attend l'accord du mainteneur, et aucun lot L4b ne tourne sans lui.

| Point | Question | Recommandation |
|---|---|---|
| Q1 | L'encart de remplacement d'une palette reprise (`encartDuRemplacement`, `[UI-34]`) liste encore six couleurs, avec les suffixes « dans Figma » et « dans le plugin », puis « Et N autres ». | L'aligner sur la grille, colonnes « Dans Figma » et « Après la mise à jour », sans limite, dans un lot L4b après L4. `COULEURS_LISTEES`, `valeurDansFigma`, `valeurDansLePlugin`, `etNAutres` et la règle `.ecart` disparaissent alors, et `[UI-34]` change. Sans accord, rien ne change. |
| Q2 | `confirmationDeLaMiseAJour` et six passages de la spécification décrivent « Tout mettre à jour », que `[UI-28]` a retiré. | Les retirer avec `toutMettreAJour` (L3 et L7). |
| Q3 | Une palette dont des couleurs ont changé et qui doit aussi créer des variables, ou dont la destination a changé, ouvre l'encart d'écriture, qui ne liste pas les couleurs changées. | Garder ce cas tel quel. La décision ne porte que sur les couleurs seules. |
| Q4 | Une décision nouvelle, sur une palette, replie la palette que le designer a dépliée. Plusieurs décisions nouvelles n'en déplient qu'une. | Déplier la première de la liste. Les autres gardent leur pastille « Modifiés dans Figma » et ne se déplient plus seules tant que la même décision attend. |
| Q5 | Avec les thèmes en modes, Light et Dark portent le même chemin : deux en-têtes de groupe seraient identiques. | Ajouter ` · Light` ou ` · Dark` au chemin quand il se répète (L1, L4). |
| Q6 | L'encart d'écriture, l'encart de remplacement et la confirmation de copie restent en attente quand leur palette se replie, et reviennent quand elle se déplie de nouveau. D3 rend ce cas fréquent. | Garder ce comportement. Les replier avec la ligne changerait des écrans que la maquette ne montre pas. |
| Q7 | Une variable qui porte un alias dans Figma n'a pas de couleur à montrer. `CouleurModifiee` ne porte pas la cible de l'alias. | Écrire « Un alias », sans pastille, sans lire la cible. |
| Q8 | Les tests de L6 ne tournent pas sans `_local/autorise-test-ui`. | Le mainteneur crée ce fichier pour L8, ou lance `npm run test:ui --workspace ucm-palettes-plugin` lui-même. |
| Q9 | Cinq états de galerie montraient plusieurs fiches côte à côte. | Garder une fiche par état, choisie dans la table de L5. Les pastilles des lignes repliées donnent l'état des autres. |
