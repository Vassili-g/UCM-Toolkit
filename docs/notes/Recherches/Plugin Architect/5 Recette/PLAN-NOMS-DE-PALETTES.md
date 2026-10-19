# Plan des noms de palettes

Ce plan fait suivre à UCM Palettes les règles de nommage du fichier, puis lève
le blocage qu'UCM Nomenclature pose sur les variables de Palettes. Il vient de
l'analyse d'un export de tokens du mainteneur pris après application des
règles, comparé à l'export précédent (`docs/notes/Recherches/Archi Tokens Multi-marques/donnees-vue-illustree.js`).

Les chemins `src/…` sont précisés par paquet : `palettes/` pour
`packages/plugin-palettes/`, `nomenclature/` pour
`packages/plugin-nomenclature/`, `socle/` pour `packages/plugin-socle/`.

## Le constat

Après application des règles par UCM Nomenclature (écriture des groupes en
PascalCase), le fichier garde `Primitives/colors/Poppy/vivid/light/50` :

- **`colors`, `vivid`, `soft`, `light`, `dark` restent en minuscules** dans
  Primitives. Ces variables sont écrites par UCM Palettes : UCM Nomenclature
  les protège (`nomenclature/src/lectureFigma.ts`, `protegee`), et un dossier
  qui en contient garde son nom (`a165887`).
- **La protection est justifiée aujourd'hui.** Palettes compose ses noms
  lui-même et les réimpose à chaque écriture : le groupe vient de la
  destination (`colors`), l'intensité et le thème sont écrits en dur en
  minuscules (`palettes/src/variables/plan.ts`, `voulu` et `chemin`), et une
  variable suivie dont le nom diffère du plan est renommée
  (`palettes/src/ecriture/variables.ts`, `variable.name = entree.nom`).
  Renommer ces variables ailleurs serait défait au passage suivant.
- Dans `color-utilities` et `theme`, le calcul du kit donne bien
  `Success/Vivid/Light/50` : le défaut ne touche que les variables de Palettes.

## La solution

1. **Palettes nomme ses variables par la même fonction qu'UCM Nomenclature.**
   Il lit les règles qu'UCM Nomenclature range dans le fichier, et passe ses
   noms par le calcul de renommage partagé, sur l'inventaire entier du fichier.
2. **UCM Nomenclature cesse de protéger les variables de Palettes** quand le
   fichier déclare que Palettes suit les règles, et explique sinon pourquoi un
   dossier garde son nom.

### Pourquoi les deux plugins tombent sur le même nom

- Le calcul vit à un seul endroit (`ucm-plugin-socle`) : lecture des règles,
  inventaire, lexique du kit (`commencerLexique`, `normaliserParEtapes`) et
  contrôle des chemins publiés. Les deux plugins l'appellent avec les mêmes
  entrées : tous les noms locaux du fichier, les mêmes règles, les mêmes noms
  non renommables.
- Le calcul est idempotent : appliqué à ses propres résultats, il ne renomme
  rien (déjà vérifié par les tests du kit, à étendre au fichier entier).
  Palettes calcule sur ses noms bruts (`colors/Poppy/vivid/light/50`), UCM
  Nomenclature sur les noms du fichier ; les deux donnent
  `Color/Poppy/Vivid/Light/50`, et Palettes ne renomme plus rien ensuite.
- Un test du dépôt (`tests/`, qui peut importer les deux plugins) fait
  l'aller-retour : UCM Nomenclature renomme, puis le plan de Palettes ne
  propose aucun renommage.

### Les limites assumées

- Une copie plus ancienne de Palettes, ouverte par un autre designer sur le
  même fichier, réécrirait les noms bruts. La marque `nommage` (lot N1) ne
  protège que contre un fichier où Palettes n'a jamais été ouvert dans sa
  version à jour.
- Sans écriture enregistrée (premier lancement d'UCM Nomenclature non
  terminé, ou seulement la clé `conventions` de la v1), Palettes écrit ses
  noms bruts et UCM Nomenclature garde la protection.
- Une collection exclue dans UCM Nomenclature n'est pas touchée : Palettes y
  écrit ses noms bruts, UCM Nomenclature n'y renomme rien.

## Les lots

### S1 — Le calcul partagé dans le socle

- [x] `socle/src/reglesDeNommage.ts` : lecture des entrées de règles qui
  changent un nom, depuis les couples (clé, texte) de l'espace
  `ESPACE_ARCHITECT` : `ecriture` (et la clé `conventions` de la v1),
  `terme:`, `ecart:`, `ordinaire:`, `exclues`. Rend `null` sans écriture
  enregistrée en v2 (cas `ecritureDeLaV1`). `nomenclature/src/regles.ts`
  réutilise ces lecteurs : un seul analyseur pour ces clés.
- [x] Déplacer dans le socle ce qui forme l'entrée du calcul :
  `inventaireDeLectures` et ses aides (`nomenclature/src/lecture.ts`),
  `inventairePublie` et `cheminsEnConflit` (`nomenclature/src/cheminsPublies.ts`).
  UCM Nomenclature les importe du socle ; aucun comportement ne change.
- [x] `socle/src/nomsSelonLesRegles.ts` : un générateur qui, pour un
  inventaire et des règles, rend les renommages après contrôle des chemins
  publiés. C'est la composition que `calculerTout` fait aujourd'hui
  (`nomenclature/src/session.ts`) ; `calculerTout` l'appelle. Les questions
  et les collections renommées restent dans UCM Nomenclature.
- [x] Test d'idempotence sur un inventaire de fichier entier (collections,
  composants, palettes à deux intensités, thèmes dans le chemin) : appliquer
  les renommages puis recalculer ne donne aucun renommage.
- Fait (`2ff5d11a`).
- Fin : `npm test` vert ; aucun test d'UCM Nomenclature modifié sauf
  imports.

### P1 — Palettes suit les règles du fichier

- [x] Au moment d'écrire comme de simuler (`palettes/src/ecriture/variables.ts`,
  `palettes/src/variables/gestion.ts`, l'aperçu de `palettes/src/ui/ongletCreation.ts`),
  construire un nommeur une fois par geste : il lit les règles (S1), lit
  toutes les collections et variables locales (tous types, pas seulement
  `COLOR`), remplace le nom des variables suivies par leur nom brut du plan,
  ajoute les variables à créer, et rend le nom final de chaque entrée par
  `nomsSelonLesRegles`.
- [x] Les comparaisons de noms (nom pris, variable à renommer, occupant)
  portent sur les noms finaux. `planDesVariables` reste pur et rend les
  noms bruts ; le nommeur s'applique à sa sortie.
- [x] Sans règles, ou quand la collection de destination est exclue, les
  noms restent bruts (comportement actuel).
- [x] À l'ouverture du plugin, ranger la marque `nommage`
  (`{ "version": 1 }`) dans `ESPACE_PARTAGE` à la racine si elle manque, dans
  un `try` (fichier en lecture seule). La clé est déclarée dans le kit, à côté
  de `CLES_PARTAGEES_DE_PALETTES`.
- [x] Tests : écriture des groupes en PascalCase → `Color/Poppy/Vivid/Light/50` ;
  liaison `destination` et liaison `reprise` ; thèmes en modes ; sans règles,
  noms inchangés ; collection exclue, noms inchangés ; la détection relit
  une palette aux segments `Vivid`/`Light`.
- Fait (`d8126cb8`).
- Fin : `npm test` vert dans `packages/plugin-palettes`.

### N1 — UCM Nomenclature cesse de bloquer les variables de Palettes

- [x] Une variable de Palettes est renommable quand la marque `nommage` est
  présente, que l'écriture est enregistrée (S1 ne rend pas `null`) et que sa
  collection n'est pas exclue. Sinon elle reste protégée comme aujourd'hui.
- [x] Quand la protection reste, le bloc des noms non renommés dit, en mots
  de designer, que le dossier garde son nom parce qu'UCM Palettes y écrit, et
  qu'il suffit d'ouvrir UCM Palettes une fois pour qu'il suive les règles.
  Textes dans `nomenclature/src/ui/textes.ts`.
- [x] Le test d'aller-retour dans `tests/` : fichier avec palettes suivies
  en minuscules, règles PascalCase et `colors → color` ; UCM Nomenclature
  calcule et applique ; le plan de Palettes avec le nommeur ne renomme rien
  et donne les mêmes noms.
- [ ] Brancher le jugement dans le calcul de la session
  (`nomenclature/src/session.ts` : `calculerTout`, `recalculer`,
  `construireEtat`) ; tant que ce n'est pas fait, l'écran garde les
  variables de Palettes protégées.
- Fait sans `session.ts` (`5c7bb067`).
- Fin : `npm test` vert à la racine.

### D1 — Le corpus d'UCM montre la forme des dossiers

- [x] `docs/references/design-systems/_outils/ucm.mjs` écrit
  `identifiantParCategorie` dans `registres.json` (les tailles des dossiers
  `small`, `medium`, `large`) ; régénérer `registres.json` et `sources.json`.
- Fait (`37f31e45`).
- Fin : `tests/corpusUcm.test.ts` vert.

### V — Versions et build

- [ ] Versions selon `versionSuitLeContenu` (kit seulement si le kit change),
  publication autorisée ; `npm run build` ; tests de tous les paquets.
- [ ] Recette Figma du mainteneur : ouvrir UCM Palettes, puis UCM
  Nomenclature ; vérifier `Color/…/Vivid/Light` dans Primitives, puis une
  écriture de Palettes qui ne renomme rien.
