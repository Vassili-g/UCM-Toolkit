# Plan de l'Historique de la Configuration

Maquette : [Maquettes/historique/MAQUETTE-HISTORIQUE.html](./Maquettes/historique/MAQUETTE-HISTORIQUE.html).
Paquet : `packages/plugin-nomenclature`.

La Configuration prend deux onglets, « Réglages » et « Historique ». L'Historique montre le dernier
renommage et le dernier import avec leur diff, et annonce les noms qui ne reviendront pas. Le format du
journal ne change pas.

## Décisions

- Q1 : le premier onglet s'appelle « Réglages ».
- Q2 : la version Figma avant « Appliquer » reste ouverte. Elle n'est pas dans ce plan.
- Q3 : l'auteur du renommage n'est pas affiché.
- Q4 : pas d'annulation partielle.

## Constat à corriger au passage

Le bilan envoie `journal.heure` tel quel, une date ISO. La Configuration affiche donc
« 12 noms, à 2026-10-20T12:32:00.000Z ». La galerie ne le montre pas, car ses données portent « 14:32 ».
Le lot 2 formate la date dans l'écran.

## Répartition

| Lot | Agent | Pourquoi |
|---|---|---|
| 1 | `implementeur-exigeant` | Une même règle sert l'annulation et l'Historique. |
| 2 | `implementeur` | Écran, textes et feuille de style d'après la maquette. |
| 3 | `implementeur` | Données et états de la galerie. |
| 4 | `executant` | Une ligne d'AGENTS.md. |
| 5 | `verificateur` | Typecheck, tests, build et galerie. |
| 6 | Conversation principale | Relecture des diffs, commit, push. |

Les lots 1 à 3 se suivent. Le lot 4 peut tourner pendant le lot 3.

## Lot 1 · Le sort du journal dans le bilan (f32bf072)

Fichiers : `src/ecriture.ts`, `src/projection.ts`, `src/messages.ts`, leurs tests.

- [x] Extraire de `annulerLeDernierRenommage` une fonction pure qui classe chaque entrée du journal :
  `retabli` (l'objet porte déjà son ancien nom), `revient`, `change-depuis` (objet absent, distant ou
  dont le nom n'est plus celui du lot ni un nom provisoire), `exclue` (collection exclue de l'analyse).
  L'ordre des contrôles reste celui d'aujourd'hui. `annulerLeDernierRenommage` l'emploie.
- [x] `Bilan.dernierRenommage` devient
  `{ nombre, reviennent, heure, collections }`. `heure` reste la date ISO du journal.
  `collections` liste `{ id: string | null, nom: string | null, exclue, lignes }`, dans l'ordre de
  l'inventaire. `id` vaut `null` pour les objets introuvables. Chaque ligne porte
  `{ type, aujourdhui: string | null, ancien, sort: 'revient' | 'change-depuis' }`. Les entrées `retabli`
  sont omises. Une collection exclue garde ses lignes.
- [x] `Bilan.dernierImport` devient `{ heure, lignes }`. Une ligne est
  `{ sorte: 'ecriture', avant: EcritureChoisie | null, apres: EcritureChoisie | null }`,
  `{ sorte: 'terme', terme: string, avant: readonly string[] | null, apres: readonly string[] | null }`
  (les formes remplacées, `null` si la règle n'existe pas), ou `{ sorte: 'autres', nombre }` pour les
  autres clés changées.
- [x] Le sandbox n'envoie que des données. Aucun texte destiné au designer.
- [x] Tests : chaque sort, le nom provisoire compté en `revient`, l'objet disparu, la collection exclue,
  l'entrée déjà rétablie omise. Les tests d'annulation existants restent verts sans changement de leurs
  attentes. Un test de projection pour chaque forme de `dernierImport`.

Fin : `npm run typecheck` et `npm test` du paquet passent.

## Lot 2 · La Configuration en deux onglets (0d6fc543)

Fichiers : `src/ui/configuration.ts`, `src/ui/textes.ts`, `src/ui/styles.css`, `src/ui/aAppliquer.ts`,
leurs tests. Règles de style à reprendre : `Maquettes/historique/propose.css`.

- [x] Monter les onglets avec `createOnglets` du socle, comme la Configuration de Palettes
  (`plugin-palettes/src/ui/index.ts`, `phraseDeLOnglet`). Une `p.subtitle` sous les onglets change
  avec l'onglet.
- [x] Réglages : « Collections analysées » et « Règles de ce fichier », sans changement.
- [x] Historique, section « Dernier renommage » :
  - la ligne « 12 noms, aujourd’hui à 14:32 » et le bouton « Annuler le renommage » ;
  - la note « Seul le dernier renommage est gardé. » ;
  - si des noms ne reviendront pas, la ligne d'avertissement « 5 noms ne reviendront pas. » ;
  - une carte repliable par collection, la première ouverte. En tête, le nom et « 8 noms ». Une collection
    exclue porte la pastille « Non analysée » et la phrase « Cochez cette collection dans Réglages pour
    rétablir ses noms. » ;
  - dans la carte, les colonnes « Aujourd’hui » et « Après l’annulation », puis une ligne par nom. Les
    segments qui changent sont en `seg-ancien` à gauche et `seg-nouveau` à droite (`segmentsDeNom` de
    `lignes.ts`). Une ligne `change-depuis` est grise, avec « Changé dans Figma depuis » à droite.
- [x] Historique, section « Dernier import » : « 3 règles changées, aujourd’hui à 14:35 », le bouton
  « Annuler l’import », puis le diff des règles en jetons neutres. Une règle absente s'écrit « Aucune règle ».
- [x] Historique vide : « Rien à annuler pour l’instant. » puis « Après chaque renommage ou import,
  l’état d’avant apparaît ici. »
- [x] Après une annulation réussie : la ligne verte « 12 noms rétablis » avec « Les renommages reviennent
  dans l’onglet Renommages. »
- [x] La confirmation garde sa forme. Son titre compte `reviennent`.
- [x] Une fonction de `textes.ts` formate la date du lot : « aujourd’hui à 14:32 », « hier à 17:05 »,
  « le 14 octobre à 09:12 », à l'heure locale. Elle reçoit le moment présent en paramètre.
- [x] `annulationDansUneCollectionExclue` renvoie à l'onglet Historique et à l'onglet Réglages au lieu de
  « Dernier renommage » et « Collections analysées ».
- [x] Onglet Renommages, ligne verte après « Appliquer » : la ligne « Les anciens noms sont gardés dans
  Configuration › Historique. » quand le lot est annulable.
- [x] Tests : `configuration.test.ts` adapté, un test de la date, `textesDeLAnnulation.test.ts` adapté.

Fin : `npm run typecheck` et `npm test` du paquet passent.

## Lot 3 · La galerie

Fichiers : `galerie/donnees.cjs`, `galerie/etats.cjs`, `tests/interface/galerie.test.mjs`.

- [x] Les bilans de la galerie portent les nouvelles formes. Les dates se calculent à partir du jour du build,
  pour que la galerie affiche « aujourd’hui » et « hier ».
- [x] États : `configuration` (Réglages), `configuration-historique`, `historique-partiel`,
  `historique-vide`, `historique-apres-annulation`, `confirmation-annulation` ouverte depuis l'Historique,
  `application` avec sa ligne de plus. `configuration-dernier-import` est absorbé par
  `configuration-historique`.
- [x] Les attentes de `galerie.test.mjs` suivent les états. Ne pas lancer `test:ui`.

Fin : `npm run galerie -w ucm-nomenclature-plugin` passe.

## Lot 4 · La documentation

- [x] AGENTS.md, section « UCM Nomenclature » : l'Historique classe le journal avec la fonction de
  l'annulation. Le test qui le tient est nommé.

## Lot 5 · Vérification

- [x] `npm run typecheck`, `npm test` et `npm run build` du paquet, puis `npm run galerie`.
- [x] `npm test` à la racine : 3578 sur 3579. L'échec vient de 7d7d8102 (`@ucm-kit/core` changé sans montée de version), hors de ce plan.

## Lot 6 · Livraison

- [ ] Relire les diffs des lots 1 à 4.
- [ ] Vérifier que les fins de ligne restent celles du dernier commit.
- [ ] Commit par chemins explicites, push sur main, hash coché ici.
- [ ] La recette dans Figma reste au mainteneur.
