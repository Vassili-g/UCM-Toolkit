# Plan d'implémentation de la fiabilisation d'Architect

Ce plan implémente les maquettes validées de [MAQUETTE-FIABILISATION.html](./MAQUETTE-FIABILISATION.html), sections 1 à 8.
Il ajoute une phase de vitesse du mode Tokens. La phase E corrige les failles mesurées, d'après les réponses aux
[questions V2](./QUESTIONS-V2.html).

## Règles d'exécution

- La conversation principale confie un lot par appel à l'agent nommé. Le prompt contient sa note, les chemins complets,
  la sortie de `npm run agents:lire -- <chemins du lot>` et sa ligne « Fin ». L'agent ne reçoit pas le plan entier.
- Le mainteneur demande des lots en parallèle, quatre au plus. Deux lots tournent ensemble seulement s'ils n'ont aucun fichier
  commun, ni source, ni test, ni galerie. La colonne « Dépend de » donne l'ordre conseillé. Un lot part dès que ses prérequis
  fonctionnels sont commités.
- Un agent ne touche ni `CARTE.md`, ni `SPEC.md`, ni un invariant, ni ce plan. Il rend les lignes à changer, et la conversation
  principale les écrit avant le commit.
- Un agent qui modifie `packages/kit/src/` ne monte pas la version. La conversation principale la monte une fois, après le dernier
  lot du kit en cours, puis commite ces lots ensemble.
- Un échec dans un fichier d'un autre lot en cours se signale sans se corriger. Le `verificateur` relance l'arbre stable avant
  le commit.
- La conversation principale relit le diff et fait vérifier l'arbre stable par un `verificateur` avant chaque commit.
  Elle lance `npm run agents:diff`, relit les documents listés et commite par chemins explicites. Elle coche les cases avec le hash.
- La montée de version qui suit un lot du kit couvre les dépendants, le verrou, les pins exigés par
  `tests/versionSuitLeContenu.test.mjs` et `docs/references/design-systems/ucm/sources.json` (régénéré par
  `node docs/references/design-systems/_outils/ucm.mjs`). Chargez `publier-paquets` avant cette montée. Lancez les tests du kit et
  `node scripts/run-tests.cjs`. Publiez les seules versions finales en F2, dans l'ordre de la skill.
- Un bug reçoit un test de régression qui échoue sans la correction. Chaque écran changé reçoit un état dans
  `packages/plugin-architect/galerie/etats/`, ou dans la galerie du plugin concerné. Les harnais longs restent hors de `npm test`.
- Relisez la `SPEC.md` existante du paquet, sa `CARTE.md` et les invariants rendus par `agents:diff`.
  Modifiez leur règle dans le lot qui la change. Chargez `rediger-pour-agents` avant toute écriture de carte ou d'invariant.
  Le socle renvoie aux autorités de `packages/plugin-socle/AGENTS.md`, sans `SPEC.md` propre.
- Chargez `rediger-diagnostics-ucm` pour les textes du designer. Gardez les textes français validés de la note.
  Traduisez aussi dans le catalogue anglais si le paquet en possède un. Les textes d'Architect sont dans
  `packages/plugin-architect/src/ui/textes/`. Aucun catalogue anglais nouveau n'est prévu pour Architect.
- Réservez `implementeur-exigeant` à plusieurs lecteurs d'une règle, à une interface comparée à la maquette,
  ou à une réécriture sans perte. Une mesure seule revient au `verificateur`.
- Personne ne lance `test:ui`. Le mainteneur relit les captures et fait la recette dans Figma.
- `packages/plugin-palettes/` et `packages/couleur/` appartiennent à une autre session. Dans cette relecture, vérifiez seulement
  l'existence de leurs chemins. A3c et A8 attendent leur arbre commité et un relevé autorisé de leurs icônes.
- Aucun nom tiré d'un fichier client n'entre dans un fichier suivi. Les captures et les rapports nommés restent dans `_local/`.

### Chemins et commandes

Les chemins commençant par `src/` dans les phases A à E désignent `packages/plugin-architect/src/`.
Dans les listes abrégées, un nom seul reprend le dossier du chemin complet précédent, sauf mention contraire.
Les fichiers annoncés « nouveau » sont à créer. Les références de code emploient le chemin et le symbole, sans numéro de ligne.

`stress:f1` et `stress:rejeu` sont des scripts du `package.json` racine.
`stress:structure`, `stress:composant` et `stress:analyse` sont dans `packages/plugin-architect/package.json`.
Construisez le kit avec `npm run build --workspace @ucm-kit/core` avant ces trois harnais.
Les commandes `npx tsx <chemin>/mesurer.ts` exécutent un fichier suivi avec la dépendance `tsx` du `package.json` racine.
Elles ne désignent pas un script npm supplémentaire.

## Vue d'ensemble

| Phase | Lots | Objet |
|---|---|---|
| A | A1 à A11, A3 en trois appels | Signes d'objet dans le kit, alertes au socle, lecteurs des plugins (section 8) |
| B | B1 à B7 | Mode Composant : cochage, Ignorer, périmée, ignorés, partielle, refus (sections 2 à 7) |
| C | C1 à C6 | Mode Tokens en deux onglets, Constats et Règles (section 1) |
| D | D0 à D7 | Vitesse de l'analyse du mode Tokens |
| E | E1 à E12 | Corrections tirées des réponses V2, famille par famille |
| F | F1 à F3 | Clôture, publication, recette |

## Phase A. Les icônes dans le kit

Les signes d'objet ont une seule définition dans `packages/kit/src/referentiel/signes.ts`. Les icônes d'alerte restent dans
`packages/plugin-socle/src/ui/Alerte.ts`, conformément à R-8 et QM-11. Le test A11 distingue ces deux autorités.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| A1 Signes du mode Tokens et de la revue | `implementeur` | rien | [x] 8d4111ce |
| A2 Un tracé, une définition | `implementeur-exigeant` | A1 | [ ] |
| A3a Interface | `implementeur` | A2 | [ ] |
| A3b Types de terme et sorties texte | `implementeur` | A3a | [ ] |
| A3c Signes de Palettes | `implementeur` | A3b, arbre réservé commité et relevé autorisé | [ ] |
| A4 Documentation d'emploi et vue illustrée | `implementeur` | A3b | [ ] |
| A5 Le socle lit le kit | `implementeur-exigeant` | A3b | [ ] |
| A6 Architect lit le kit | `implementeur` | A5 | [ ] |
| A7 L'exporteur lit le kit | `implementeur` | A5 | [ ] |
| A8 Palettes lit le kit | `implementeur` | A3c, A5, arbre de Palettes commité | [ ] |
| A9 Le hub lit le kit | `implementeur` | A3b, A5 | [ ] |
| A10 Glyphes des sorties texte | `executant` | A3b | [ ] |
| A11 Test de la loi des icônes | `implementeur` | A6 à A10 | [ ] |

### A1. Signes du mode Tokens et de la revue

Fichiers : `packages/kit/src/referentiel/signes.ts`, `packages/kit/tests/signes.test.ts`.

- [x] A1.1 QM-3. Ajouter la famille `rubrique-tokens` (« Rubrique du mode Tokens », teinte `tokens`).
- [x] A1.2 Y définir `nom`, `valeurs`, `couches`, `types`, `rangement`, avec les tracés de la section 8 de la maquette
  (`NOUVEAUX` dans MAQUETTE-FIABILISATION.html).
- [x] A1.3 Y reprendre `a-creer` (Variables manquantes), `cran` (Crans), `rompue` (Alias), `mode` (Modes), `scope` (Scopes) dans
  `REPRISES_DE_SIGNES`.
- [x] A1.4 R-5 : remplacer le tracé de `information` par le rond à « i » de la maquette. R-6 : remplacer la corbeille d'`ignore` par
  l'œil barré.
- [x] A1.5 Monter la version du kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. `svgDuSigne` rend les 5 signes nouveaux. Les 10 catégories ont un signe.

### A2. Un tracé, une définition

R-7. Fichiers : `packages/kit/src/referentiel/signes.ts`, `packages/plugin-architect/src/ui/composant/signes.ts`, les lecteurs de `prop-boolean`, `prop-text`,
`prop-slot` (`git grep`).

- [ ] A2.1 `prop-boolean`, `prop-text` et `prop-slot` deviennent des reprises de `type-boolean`, `text` et `slot` dans la famille
  `property`, avec leur libellé actuel.
- [ ] A2.2 Remplacer chaque lecture des trois identifiants retirés par l'identifiant repris et l'option `famille: 'property'` de
  `creerSigne`. Migrez aussi la reprise de `prop-boolean` dans la famille `regles` de `REPRISES_DE_SIGNES`.
- [ ] A2.3 Ajouter à `signes.test.ts` le test qui refuse deux signes au même tracé non vide.
- [ ] A2.4 Monter la version du kit.

Fin : le test du tracé unique passe. `npm run test:paquet -- architect` passe. Les captures aux mêmes dimensions gardent tracés, tailles et teintes hors R-1 à R-6. Le mainteneur relit les écarts.

### A3a. Famille des icônes d'interface

Fichiers : `packages/kit/src/referentiel/signes.ts`, `packages/kit/tests/signes.test.ts`, `packages/kit/src/referentiel/signaux.ts` (`TYPES_D_ALERTE`).

Le relevé vérifié hors Palettes compte 27 définitions SVG, soit 10 au socle, 10 dans Architect, 1 dans l'exporteur et 6 au hub.
Il compte une définition par dessin, les deux thèmes du chevron CSS une fois, et le masque préfixé une fois.
La courbe dynamique du hub est un graphique et reste hors de ce compte. Le sous-total des glyphes est 10 caractères distincts,
`× › → − ≠ ◆ ⚠ ✓ ✗ ❌`. Le relevé lit les littéraux `.ts` et `.mjs` des 299 sources suivies de Socle, Architect, Exporter, Hub,
CLI et Adapter. Il cherche les caractères de l'inventaire `× → ✓ ⋯ ＋ − › ≠ ◆ ≈ ⊣ ✗ ℹ ⚠ ✅ ❌`, sans commentaires,
ASCII ni sélecteur de présentation. Le total incluant Palettes reste à relever après levée de la réserve de lecture.
Les nombres 31 SVG et 26 glyphes ne sont pas établis pour un périmètre reproductible.
`SigneDuLangage` reçoit une grille adaptée au tracé, sans déplacer les alertes du socle.

- [ ] A3.1 Conservez les cinq formes `FORMES` dans `packages/plugin-socle/src/ui/Alerte.ts` (R-8, QM-11).
  Testez que les migrations suivantes ne recopient pas ces formes dans le kit.
- [ ] A3.2 Famille `interface`, sans teinte : chevron (un tracé, quatre sens par rotation), fermer (`×`), lien externe, réglages,
  poignée de taille, loupe, tout replier, panneau latéral, synchroniser, menu (`⋯`), ajouter (`+`), retirer (`−`), avant-après (`→`),
  séparateur de chemin (`›`), différent (`≠`), vide (losange en tirets de la vue Composant).
Fin : `npm run test --workspace @ucm-kit/core` passe pour la famille interface.

### A3b. Types de terme et sorties texte

Fichiers : `packages/kit/src/referentiel/signes.ts`, `packages/kit/src/referentiel/signaux.ts` et leurs tests.

- [ ] A3.3 Famille `type-de-terme`, teinte `regles` : les six icônes de Nomenclature. R-1 `palette` reprend `palette`. R-2 `composant`
  reprend `component`. R-3 `a-trancher` reprend `question`, en ambre. R-4 `conforme` reprend `applique`. `remplace` et `sans-regle` sont
  définis ici.
- [ ] A3.6 Ajoutez le champ `texte` de repli à `TYPES_D_ALERTE`, sans déplacer les formes SVG du socle.
  Distinguez le texte brut et le commentaire de forge.

Fin : `npm run test --workspace @ucm-kit/core` passe pour les types de terme et les replis texte.

### A3c. Signes de Palettes

Fichiers : `packages/kit/src/referentiel/signes.ts`, ses tests et `packages/plugin-palettes/src/ui/glyphes.ts` (lecture après levée de la réserve).

- [ ] A3.4 Famille `verdict-palettes`, teinte `couleurs` : `butee` (`⊣`), `reference` (`◆`), `confondus` (`≈`). Les verdicts `✓`, `!`,
  `✗` emploient les alertes du socle. Vérifiez leurs identifiants dans `TYPES_D_ALERTE` avant la migration.
- [ ] A3.5 Famille `pictogramme-palettes`, grille 44×28 : les 11 glyphes de carte de `packages/plugin-palettes/src/ui/glyphes.ts`.
- [ ] A3.7 Monter la version du kit.

Fin : chaque signe de Palettes du relevé relève du kit ou des alertes du socle. `npm run test --workspace @ucm-kit/core` passe.

### A4. Documentation d'emploi et vue illustrée

Fichiers : `packages/kit/src/referentiel/signes.ts`, `packages/kit/tests/signes.test.ts`, `packages/kit/invariants/referentiel.md`,
`docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel.ts`,
`docs/notes/Recherches/Archi Tokens Multi-marques/donnees-referentiel.js` et
`docs/notes/Recherches/Archi Tokens Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html`. Charger `rediger-pour-agents` avant
l'invariant.

- [ ] A4.1 Chaque signe porte `emploi` : quand l'employer, et le signe à prendre à sa place quand il ne convient pas.
- [ ] A4.2 Chaque famille porte `pose` : la fonction du socle qui la pose (`creerSigne`, `creerIcone`, `creerChevron`), les tailles
  admises, la règle de teinte (`informe`) et le nom accessible attendu.
- [ ] A4.3 `signes.test.ts` refuse un `emploi` ou une `pose` vide.
- [ ] A4.4 La vue illustrée gagne une page « Signes et icônes » : chaque famille, chaque signe en trois tailles, son sens, son emploi,
  ses reprises. Construisez le kit, puis lancez le générateur ciblé avec
  `npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel.ts"`.
  Cette commande écrit seulement `donnees-referentiel.js`. `npm run vues` reste réservé à un arbre stable.
- [ ] A4.5 Décrivez les deux autorités dans `packages/kit/invariants/referentiel.md`, le kit pour les signes et le socle pour les alertes.
- [ ] A4.6 Incluez la montée de version du kit et les contrôles racine.

Fin : la page montre toutes les icônes du kit. Le test de fraîcheur de la vue passe.

### A5. Le socle lit le kit

Fichiers : `packages/plugin-socle/src/ui/Alerte.ts`, `Chevron.ts`, `EnTete.ts`, `ResizeGrip.ts`, `Feuille.ts`, `Filtre.ts`, `Jeton.ts`,
`Changement.ts`, `Signe.ts`, `socle.css`.

- [ ] A5.1 Gardez `creerIcone` et `FORMES` dans le socle. Faites lire la famille `interface` par `creerChevron`, l'engrenage,
  la poignée et le lien externe.
- [ ] A5.2 Ajoutez `creerGlyphe(id)` pour les glyphes de la famille `interface`. Les coches de sévérité lisent les replis de `TYPES_D_ALERTE`.
- [ ] A5.4 Exposez un rendu SVG d'alerte sans DOM pour le hub, à partir de `FORMES`, sans deuxième table de tracés.
- [ ] A5.3 Le chevron de `select.input` (data URI de `socle.css`) reste en CSS. Un test compare son tracé à celui du kit.

Fin : `npm run test:paquet -- socle` passe. Les captures aux mêmes dimensions gardent tracés, tailles et teintes hors R-1 à R-6. Le mainteneur relit les écarts.

### A6. Architect lit le kit

Fichiers : `packages/plugin-architect/src/ui/nomenclature/icones.ts`, `packages/plugin-architect/src/ui/barre.ts`,
`packages/plugin-architect/src/ui/arbre.ts`, `packages/plugin-architect/src/ui/vues/composant.ts`.
Sous `packages/plugin-architect/src/ui/nomenclature/` : `aTrancher.ts`, `aAppliquer.ts`, `historique.ts`, `feuilles.ts`, `regles.ts`, `questions.ts`.
Autres lecteurs : `packages/plugin-architect/src/ui/questions/index.ts`, `packages/plugin-architect/src/ui/questions/modele.ts`,
`packages/plugin-architect/src/ui/preparation/`, `packages/plugin-architect/src/ui/textes/composant.ts`,
`packages/plugin-architect/src/ui/textes/preparation.ts`.

- [ ] A6.1 `creerIconeDeType` lit la famille `type-de-terme`. `TRAITS` disparaît.
- [ ] A6.2 Le panneau latéral, tout replier, la loupe et le losange vide lisent la famille `interface`.
- [ ] A6.3 Chaque glyphe du relevé passe par `creerGlyphe`, ou par la constante du kit dans un texte.
- [ ] A6.4 Mettre à jour `CARTE.md` d'Architect.

Fin : `npm run test:paquet -- architect` passe. Les écarts de galerie se limitent à R-1 à R-6.

### A7. L'exporteur lit le kit

Fichiers : `packages/plugin-exporter/src/ui/styles.css` (`.carte-chevron`), `packages/plugin-exporter/src/depot.ts` (titre des avertissements de demande de fusion).

- [ ] A7.1 La carte pose `creerChevron` au lieu du masque CSS.
- [ ] A7.2 Le commentaire de demande de fusion lit le champ `texte` de `TYPES_D_ALERTE`.

Fin : `npm run test:paquet -- exporter` passe.

### A8. Palettes lit le kit

Fichiers sous `packages/plugin-palettes/src/ui/` : `ligneFixe.ts`, `harmonisation/carteComparaison.ts`, `selecteur.ts`,
`piedDeLaPalette.ts`, `ongletHarmonisation.ts`, `vueDuBilanDesPalettes.ts`, `menuPalette.ts`, `glyphes.ts`, `connexion.ts`,
`ajustement.ts`, `traceDesCourbes.ts`, `garanties.ts`, `nuancier.ts`, `ongletCreation.ts`.
Catalogues : `packages/plugin-palettes/src/i18n/fr.ts` et `packages/plugin-palettes/src/i18n/en.ts`.
Feuille : `packages/plugin-palettes/src/ui/styles.css`. Vérifiez à nouveau ces chemins après le commit de l'autre session.

- [ ] A8.1 Verdicts et lignes fixes : alertes du socle et famille `verdict-palettes`.
- [ ] A8.2 Pictogrammes de carte : famille `pictogramme-palettes`. `GLYPHES` disparaît.
- [ ] A8.3 Chevrons CSS, menu, synchroniser, `＋`, `−`, `›` : famille `interface`.
- [ ] A8.4 `◆` et `≈` dans les textes : constantes du kit.
- [ ] A8.5 Gardez les mêmes faits et actions dans `packages/plugin-palettes/src/i18n/fr.ts` et
  `packages/plugin-palettes/src/i18n/en.ts`. Ajoutez les états de galerie des écrans modifiés.

Fin : `npm run test:paquet -- palettes` passe. Le mainteneur compare les captures aux mêmes dimensions et classe chaque écart de tracé, taille ou teinte.

### A9. Le hub lit le kit

Fichiers : `packages/hub/src/vues/page.ts` (`ICONES`).

- [ ] A9.1 `info`, `succes`, `alerte`, `coche` lisent le rendu sans DOM des alertes du socle (A5.4). `fleche` et `fermer` reprennent la famille `interface`.
- [ ] A9.2 Construisez le kit, puis lancez `npm run hub --workspace ucm-hub`. Cette commande régénère le hub seul.
  Vérifiez que ses sorties restent dans le lot.

Fin : `npm run test:paquet -- hub` passe, et la vue du hub est à jour.

### A10. Glyphes des sorties texte

Fichiers : `packages/kit/src/lecteurs/diagnostic-markdown.mjs`, `verdict-bilan.mjs`, `controle-repository.mjs`,
`packages/cli/src/aides.mjs`, `packages/cli/src/init.mjs`, `packages/cli/src/guide.mjs`,
`packages/adapter-typescript/src/generation.mjs`, `packages/adapter-typescript/src/cli.mjs`,
`packages/kit/src/lecteurs/avertissements-export.mjs`, `packages/kit/src/lecteurs/diagnostic-tests.mjs`,
`packages/kit/src/lecteurs/diagnostic-parite.mjs`, `packages/kit/src/lecteurs/diagnostic-tokens.mjs`,
`packages/kit/src/lecteurs/diagnostic-contrastes.mjs`, `packages/kit/src/lecteurs/version-contrat.mjs`,
`packages/kit/src/lecteurs/validation-graphe-contrats.mjs`.

- [ ] A10.1 Remplacez les glyphes de sévérité par le champ texte du type d'alerte. Gardez les symboles métier et les fragments de code.
- [ ] A10.2 Incluez la montée de version du kit et les contrôles racine.

Fin : les attentes des sorties texte restent identiques. `npm run test --workspace @ucm-kit/core`,
`npm run test:paquet -- cli` et `npm run test:paquet -- adapter` passent.

### A11. Test de la loi des icônes

Fichier nouveau : `tests/iconesDuKit.test.ts` (racine).

- [ ] A11.1 Parcourez les sources d'interface migrées et les producteurs de rapports nommés en A10. Refusez une nouvelle définition
  d'icône hors du kit ou de `FORMES` du socle. Distinguez un graphique, un aperçu SVG et une primitive de pose d'une icône.
  Testez séparément ces cas avec des sources fabriquées.
- [ ] A11.2 Une exception se déclare dans le test avec son motif (le data URI de `socle.css`).

Fin : `node scripts/run-tests.cjs` passe. Les cas fabriqués refusent une icône ajoutée hors autorité et acceptent un graphique SVG.

## Phase B. Mode Composant

| Lot | Agent | Dépend de | Section | État |
|---|---|---|---|---|
| B1 Corrections décochées | `implementeur` | rien | 2 | [x] f92b3d9c, B1.4 en partie |
| B2 Ignorer sur les cartes de règles | `implementeur` | B1 | 2 | [ ] |
| B3 Ignorer une question | `implementeur-exigeant` | B2 | 3 | [ ] |
| B4 Analyse périmée | `implementeur` | B3 | 4 | [ ] |
| B5 Tous les constats ignorés | `implementeur` | B4 | 5 | [ ] |
| B6 Analyse partielle | `implementeur` | B5 | 6 | [ ] |
| B7 Demande refusée pendant une écriture | `implementeur` | B6 | 7 | [ ] |

### B1. Corrections décochées

E-34, Q-F2, QM-8. Fichiers : `src/ui/corrections/index.ts`, `src/ui/panneau/rendu.ts`, `src/ui/textes/`, la galerie.

- [x] B1.1 Toutes les cases arrivent décochées. Le pied dit « Aucune correction cochée » et Appliquer tout est inactif.
- [x] B1.2 « Tout cocher » et « Tout décocher » sous la bande de chaque section qui a des cases.
- [x] B1.3 « Tout cocher » global, à gauche d'Appliquer tout.
- [ ] B1.4 Testez l'arrivée, le nouveau résultat, la réponse à une question, le modèle de propagation et le compte du pied.
  B1 porte E-34 pour Composant. C5 porte E-22 pour Tokens.

Fin : `npm run test:paquet -- architect` passe. La série D1 de `npm run stress:composant --workspace ucm-architect-plugin` vérifie E-34.

### B2. Ignorer sur les cartes de règles

N-86, QM-9. Fichiers : `src/ui/panneau/rendu.ts`, `src/ui/panneau/informations.ts`, `src/sandbox/ignores.ts`, `src/ui/ignores/`.

- [ ] B2.1 Les cartes C43, C45 `sans-regle` et C45 `sans-valeur` reçoivent Ignorer et « Ne plus proposer », comme une carte À faire.
- [ ] B2.2 Test : la carte ignorée passe dans les ignorés, et « Ne plus ignorer » la rend.

Fin : `npm run test:paquet -- architect` passe. La galerie montre Ignorer, puis Ne plus ignorer pour les trois sortes de cartes.

### B3. Ignorer une question

E-35, QM-5, QM-9. Fichiers : `src/ui/questions/index.ts`, `src/ui/ignores/modele.ts`, `src/sandbox/ignores.ts`, `src/messages/`.

- [ ] B3.1 Une carte de question reçoit Ignorer (pour le fichier) et « Ne plus proposer » (pour la proposition), avant « Plus tard »
  (pour la session).
- [ ] B3.2 La clé d'Ignorer d'une question se range comme celle d'un constat. Le sandbox la relit à l'analyse suivante.
- [ ] B3.3 Tests : la question ignorée ne revient pas à l'analyse suivante, « Plus tard » ne dure que la session.

Fin : `npm run test:paquet -- architect` passe. Les tests distinguent session, fichier et proposition.

### B4. Analyse périmée

E-38, Q-F89-15, QV-2, QM-6. Décisions validées. Fichiers : `src/ui/analyse/index.ts`, `src/ui/composant/analyse.ts`, `src/ui/corrections/index.ts`.

- [ ] B4.1 La note périmée reste en tête : « Les constats datent d'avant le changement. Cliquez Actualiser pour relire. »
- [ ] B4.2 La liste reste lisible. Les cases, Ignorer et Appliquer tout sont inactifs jusqu'à Actualiser.
- [ ] B4.3 Tests : la liste survit à `perimee`, aucun geste n'est envoyé.

Fin : `npm run test:paquet -- architect` passe. La galerie périmée garde les cartes. Les tests refusent tout envoi d'écriture.

### B5. Tous les constats ignorés

N-77, Q-F89-18. Fichiers : `src/ui/analyse/index.ts`, `src/ui/panneau/rendu.ts`.

- [ ] B5.1 Le panneau dit « Aucun constat visible, N ignorés. » et garde la liste des ignorés avec « Ne plus ignorer ».
- [ ] B5.2 Test : ignorer le dernier constat garde la liste des ignorés.

Fin : `npm run test:paquet -- architect` passe. L'état de galerie conserve les ignorés quand le dernier constat disparaît.

### B6. Analyse partielle

E-31, E-32, N-85, Q-F89-16, QM-7. Fichiers : `src/sandbox/analyse.ts`, `src/messages/analyse.ts`, `src/ui/analyse/index.ts`, `src/ui/textes/`.

- [ ] B6.1 Le message de fin porte la liste des causes : variants non lus, règles illisibles, niveau illisible, ignorés illisibles.
- [ ] B6.2 Une lecture refusée des règles, du niveau ou des ignorés rend l'analyse partielle.
- [ ] B6.3 La bannière liste une ligne par cause et ne dit jamais « N lus sur N ».
- [ ] B6.4 Une analyse partielle ne montre aucune section tenue.
- [ ] B6.5 Testez chaque cause et leur cumul. Rejouez `npm run stress:analyse --workspace ucm-architect-plugin -- --section D`.
  B6 porte le rendu des causes. E11a ajoute les lecteurs refusés, sans refaire ce panneau.

Fin : `npm run test:paquet -- architect` passe. Les tests du panneau couvrent chaque cause, leur cumul et l'absence de section tenue.

### B7. Demande refusée pendant une écriture

N-80, E-39, Q-F89-17. Fichiers : `src/ui/analyse/index.ts`, `src/ui/corrections/index.ts`, `src/messages/analyse.ts`.

- [ ] B7.1 La réponse `occupe` montre l'alerte « Une opération est déjà en cours. L'écriture continue. Actualisez quand elle est finie. »
- [ ] B7.2 Appliquer tout reste inactif jusqu'à la fin de l'écriture.
- [ ] B7.3 Test : Actualiser pendant une écriture ne réactive pas Appliquer tout.

Fin : `npm run test:paquet -- architect` passe. Le test de refus conserve le verrou d'écriture. La galerie montre l'alerte.

## Phase C. Mode Tokens en deux onglets

QM-1, QM-2, QM-4 et QM-10. Option B de la section 1. Les cartes de Nomenclature gardent la forme validée du tour 3. Les catégories sont, dans l'ordre : Noms,
Variables manquantes, Crans, Alias, Modes, Valeurs, Couches, Types, Rangement, Scopes.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| C1 Modèle des catégories | `implementeur` | A1 | [ ] |
| C2 Coquille à deux onglets, sommaire et sections | `implementeur-exigeant` | C1 | [ ] |
| C3 Section Noms | `implementeur` | C2 | [ ] |
| C4 Sections de structure | `implementeur` | C3 | [ ] |
| C5 Cochage et Appliquer commun | `implementeur-exigeant` | C3, C4 | [ ] |
| C6 Galerie et SPEC | `implementeur` | C5 | [ ] |

### C1. Modèle des catégories

Fichiers : nouveau `src/ui/tokens/categories.ts`, `src/ui/structure/lecture.ts` (`GROUPES`), test.

- [ ] C1.1 Une fonction pure range les cartes de Nomenclature, les constats de structure et les corrections de scopes dans les 10
  catégories, avec le signe de chacune (A1) et son nombre.
- [ ] C1.2 Une catégorie sans constat est tenue. Une analyse partielle n'a aucune catégorie tenue.
- [ ] C1.3 Tests sur les états de galerie `a-appliquer`, `t-integrite-a-faire`, `t-structure`.

Fin : `npm run test:paquet -- architect` passe. Les dix catégories et leurs compteurs ont une assertion sur les fixtures citées.

### C2. Coquille à deux onglets, sommaire et sections

Fichiers : `src/ui/nomenclature/coquille.ts`, `src/ui/structure/index.ts`, `src/ui/panneau/rendu.ts` (puces et bandes à réutiliser),
`src/ui/textes/`.

- [ ] C2.1 Deux onglets, Constats et Règles. Le compte de Constats est le total.
- [ ] C2.2 Le sommaire du mode Composant : Tout, une puce par catégorie, la puce Questions (signe `question`).
- [ ] C2.3 Une section repliable par catégorie, avec la bande, le signe en teinte `tokens` et le nombre.
- [ ] C2.4 Comparez le cadre « Proposé » de la section 1 à 680 px. Relevez ordre, espacements, tailles et débordements.
  Gardez la forme des cartes du tour 3. Faites classer les écarts par le mainteneur.

Fin : `npm run test:paquet -- architect` passe. La galerie montre le cadre à 680 px. Le mainteneur compare son ordre et ses dimensions à l'option B.

### C3. Section Noms

Fichiers : `src/ui/nomenclature/aAppliquer.ts`, `aTrancher.ts`, `renommages.ts`, `lignes.ts`, `src/ui/virtualisation.ts`.

- [ ] C3.1 Les questions vont en tête de la section, avec Ignorer, « Ne plus proposer » et « Plus tard ».
- [ ] C3.2 Les cartes de renommage suivent, dans leur forme du tour 3.
- [ ] C3.3 Au-delà de 20 cartes, la section arrive repliée. Gardez son dépliage fonctionnel. La virtualisation des cartes attend D6,
  car `creerListeVirtuelle` suppose aujourd'hui une hauteur fixe.

Fin : `npm run test:paquet -- architect` passe. Les états de galerie montrent les questions en tête et la section Noms longue repliée.

### C4. Sections de structure

Fichiers : `src/ui/structure/aFaire.ts`, `src/ui/structure/corrections.ts`, `src/ui/structure/carte.ts`.

- [ ] C4.1 Chaque carte À faire va dans la section de son groupe, avec son menu Ignorer actuel.
- [ ] C4.2 Les corrections de structure (Variables manquantes, Crans, Modes, Scopes) vont dans leur section, avec leurs cases.
- [ ] C4.3 Les ignorés gardent leur intertitre en fin de liste.

Fin : `npm run test:paquet -- architect` passe. Les tests placent chaque genre de constat et chaque correction dans une seule catégorie.

### C5. Cochage et Appliquer commun

Fichiers : `src/ui/nomenclature/aAppliquer.ts`, `src/ui/structure/corrections.ts`, `src/ui/structure/index.ts`, `src/messages/`.

- [ ] C5.1 E-22, Q-F2 et QM-8. Toutes les cases arrivent décochées, y compris une ligne ajoutée après relecture. « Tout cocher » et « Tout décocher » par section, « Tout cocher » global.
- [ ] C5.2 Un seul pied compte toutes les cases cochées. Appliquer envoie les renommages, puis les corrections de structure par
  identifiant de variable, que le sandbox relit avant d'écrire.
- [ ] C5.3 Tests : l'ordre des deux écritures, un échec de la première arrête la seconde.

Fin : `npm run test:paquet -- architect` passe. La série D2 de `npm run stress:structure --workspace ucm-architect-plugin` vérifie E-22, dont une ligne ajoutée après relecture.

### C6. Galerie et SPEC

- [ ] C6.1 États de galerie du mode Tokens à deux onglets : liste longue, toutes catégories tenues, analyse partielle.
- [ ] C6.2 Vérifiez les mises à jour de `packages/plugin-architect/SPEC.md`, `packages/plugin-architect/CARTE.md` et
  `packages/plugin-architect/invariants/nomenclature.md` faites dans C1 à C5. Décrivez les onglets et les bornes de cochage.

Fin : `npm run galerie:plugin -- architect` construit les états. `npm run agents:diff` rend les documents relus. Aucun `test:ui` n'est lancé.

## Phase D. Vitesse du mode Tokens

D0 mesure le chemin Tokens avant toute optimisation. Les durées du mode Composant ne donnent aucune cible pour ce chemin.
Lisez `docs/notes/Recherches/UCM Architect/5 Vitesse de l'analyse/CHECKLIST-IMPLEMENTATION.md` et
`docs/notes/Recherches/UCM Architect/5 Vitesse de l'analyse/lots/README.md`.
Les lots 00, 04, 05, 06, 08, 09 et 16 portent les preuves à reprendre, dans le sous-dossier `lots/`.
La technique 16.11 porte sur la coopération. Elle ne prouve ni la fraîcheur ni le gain d'une prélecture.

Une optimisation compare les sorties complètes ordonnées à une référence fixée après C6. Comparez codes, identifiants, faits,
questions, corrections, `aRelire`, ignorés, limites et couverture. Gardez l'ordre et les candidats.
Isolez toute correction de comportement dans son lot E avec un test rouge. Ne modifiez pas les attentes pour faire passer la parité.
Une capture absente se compte absente. Une comparaison locale ne prouve pas la fraîcheur dans Figma.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| D0 Mesure de référence | `implementeur` | rien | [x] bd9f418d, 10956167, D0.3 et D0.4 en partie |
| D1 Acquisition commune dans la demande | `implementeur-exigeant` | D0 | en cours |
| D2 Lectures groupées | `implementeur` | D1 | [ ] |
| D3 Coûts algorithmiques du kit | `implementeur` | D0 | [x] 8d4111ce, D3.3 en partie |
| D4a Ignorer sans acquisition | `implementeur` | D3 | [ ] |
| D4b Relecture après Appliquer | `implementeur-exigeant` | D4a | [ ] |
| D5a Candidat de prélecture | `implementeur` | D4b | [ ] |
| D5b Mesure de prélecture | mainteneur | D5a, build disponible | [ ] |
| D6a Virtualisation des cartes | `implementeur` | D4b | [ ] |
| D6b Branchement des sections | `implementeur` | D6a | [ ] |
| D7 Mesure finale | `verificateur`, puis le mainteneur | D6b, D5a | [ ] |

### D0. Mesure de référence

Fichiers : `src/lecture.ts` (`mesurerLePortDeLecture`), `src/sandbox/arbre.ts`, `src/sandbox/structure.ts`,
`src/nomenclature/session.ts`, `src/sandbox/capture.ts`, `src/ui/telechargement.ts` et le rapport sous `src/ui/analyse/`.

- [x] D0.1 Mesurez séparément `lire-releve`, `lire-structure`, `rafraichir` de Nomenclature, contrôles du kit et rendu.
  Comptez les appels de lecture, les imports et les attentes. Gardez les mesures hors du résultat fonctionnel.
- [x] D0.2 Étendez « Télécharger le rapport d'analyse » au mode Tokens. Ajoutez l'état de galerie et le test du contenu.
- [ ] D0.3 Chronométrez `controlerLeCatalogue` et `controlerLIntegriteUcm` sur des catalogues fabriqués de tailles croissantes.
  Rejouez aussi `npm run stress:rejeu` sur les sources privées disponibles. `_local/stress/rejeu-fichiers/` reçoit les rapports,
  sans servir de catalogue d'entrée. Conservez les mêmes entrées pour les mesures suivantes.
- [ ] D0.4 Écrivez les compteurs et les durées locales dans `MESURE-DES-FAILLES.md`. Le mainteneur mesure Actualiser dans Figma.
  Une durée Figma absente reste non renseignée et ne bloque pas les preuves locales.

Fin : `npm run test:paquet -- architect` passe. `npm run stress:rejeu` donne un rapport reproductible sur les sources présentes.
La référence distingue acquisition, calcul et rendu, avec le nombre de sources absentes.

### D1. Acquisition commune dans la demande

Fichiers : `src/sandbox/arbre.ts`, `src/sandbox/structure.ts`, `src/lecture.ts`, `src/nomenclature/lectureFigma.ts`,
`packages/plugin-socle/src/inventaireDeNoms.ts`, `packages/plugin-socle/src/composant/analyse/ressources.ts`.

- [ ] D1.1 Faites partager aux trois lecteurs une acquisition attachée à la demande et à sa génération.
  Actualiser acquiert toujours à neuf. Rejetez une réponse d'une génération remplacée.
- [ ] D1.2 Tirez `valuesByMode`, `resolvedType` et `scopes` des objets déjà lus par la demande, sans lecture par identifiant répétée.
- [ ] D1.3 Bâtissez l'inventaire de Nomenclature dans cette acquisition. Gardez ses protections, ses refus et ses règles relues.
- [ ] D1.4 Testez la parité définie en tête de phase sur les fixtures et le rejeu disponible. Testez changement externe, Ctrl+Z,
  changement de library, déclaration, vocabulaire et refus de lecture puis disponibilité. Ces événements imposent une acquisition neuve.
  Une lecture refusée ou partielle ne valide aucune mémoire pour la demande suivante.

Fin : `npm run test:paquet -- socle` et `npm run test:paquet -- architect` passent. Les tests comptent une acquisition locale
par demande. Les sorties complètes restent égales à référence, dans leur ordre.

### D2. Lectures groupées

Fichiers : `src/lecture.ts` (`lireLesBasesDesExtensions`, `lireVariable`, `importerLesValeurs`),
`src/sandbox/structure.ts`, `src/ecriture/ignores.ts` et les tests de lecture.

- [ ] D2.1 Groupez `lireLesBasesDesExtensions` avec `executerAuPlus`, en gardant ordre et refus.
- [ ] D2.2 Conservez le comportement déjà présent, lecture par `getVariableByIdAsync` avant import par clé,
  et imports bornés par `IMPORTS_EN_VOL`. Ajoutez une assertion sur les appels, sans refaire cette implémentation.
- [ ] D2.3 Lisez réglage d'écriture, clés d'Ignorer et vocabulaire une fois par acquisition. Une nouvelle demande les relit.

Fin : `npm run test:paquet -- architect` passe. Les tests de lecture vérifient parité, ordre, refus et plafond d'appels en vol.

### D3. Coûts algorithmiques du kit

Fichiers : `packages/kit/src/controles/structure.ts`, `packages/kit/src/controles/integrite.ts` et leurs tests.
Relisez `docs/notes/Recherches/UCM Architect/5 Vitesse de l'analyse/lots/LOT-04.md` pour conserver les index déjà faits.

- [x] D3.1 Indexez les recherches de `controlerLesAliasesManquants`, sans changer la première occurrence retenue.
- [x] D3.2 Conservez la mémoire déjà présente dans `lesJumelles`, `prefixe.jumelles` par mode. Mesurez ses appels avant
  de proposer un autre index. Une entrée immuable reste la précondition de cette mémoire.
- [ ] D3.3 Comparez les objets complets avec la référence. Mesurez la croissance du nombre d'opérations sur les catalogues fabriqués.
  R2 et R3 du rejeu prouvent déterminisme et ordre. R1 donne le constat de base, sans prouver la parité avant et après.
- [x] D3.4 Incluez la montée de version du kit et les contrôles racine.

Fin : `npm run test --workspace @ucm-kit/core` et `npm run stress:rejeu` passent sur les sources présentes.
Le banc de D0 donne les durées avant et après. Les tests de croissance n'imposent aucun seuil de temps réel.

### D4a. Ignorer sans acquisition

Fichiers : `src/sandbox/structure.ts`, `src/ui/structure/index.ts` et leurs tests.

- [ ] D4.1 Refiltrez les constats acquis pour Ignorer et Ne plus ignorer un constat.
  Ignorer un rôle change `rolesIgnores` et relance les contrôles du kit sur le catalogue acquis.
- [ ] D4.3a Comparez les résultats ordonnés à une acquisition complète pour chaque portée d'Ignorer et de rétablissement.
  Au moindre doute sur la fraîcheur, relisez le catalogue. Gardez les états périmé et partiel.

Fin : `npm run test:paquet -- architect` passe. Les tests comptent zéro lecture de variable pour le simple filtre et vérifient
le recalcul de C82 après Ignorer un rôle.

### D4b. Relecture après Appliquer

Fichiers : `src/sandbox/structure.ts`, `src/ecriture/structure.ts`, `src/ui/structure/index.ts` et leurs tests.

- [ ] D4.2 Décrivez les données affectées par scopes, alias, modes, créations et renommages.
  Relisez tout le catalogue si cette liste ne prouve pas que les voisins et les candidats restent valides.
  Gardez la relecture avant écriture et l'invalidation après écriture, refus ou annulation.
- [ ] D4.3b Testez la parité avec une acquisition complète après chaque geste, puis création, renommage, alias modifié,
  écriture partielle, refus de lecture et Ctrl+Z. Une voie ciblée reste désactivée tant que sa parité n'est pas prouvée.

Fin : `npm run test:paquet -- architect` passe. Les tests couvrent le repli complet et l'absence de correction issue d'un catalogue périmé.

### D5a. Candidat de prélecture

Fichiers : `src/code.ts`, `src/sandbox/prelecture.ts`, `src/ui/index.ts` et leurs tests.

- [ ] D5.1 Préparez une acquisition Tokens coopérative, avec un budget de 50 ms et des points de cession explicites.
  Une attente d'API seule ne constitue pas une cession prouvée. La prélecture ne change aucun résultat affiché.
- [ ] D5.2 Annulez la prélecture remplacée ou rendue périmée. Une demande Composant passe avant elle.
  Relisez au clic les données sans preuve de fraîcheur. Gardez le candidat inactif jusqu'à la comparaison A/B dans Figma.

Fin : `npm run test:paquet -- architect` passe. Les tests vérifient priorité, abandon, génération et fraîcheur.
Le candidat reste inactif en attendant D5b. Cette attente ne bloque pas D6 ni les corrections E.

### D5b. Mesure de prélecture

- [ ] D5.3 Le mainteneur compare les interactions et le temps total avec et sans le candidat, sur la même source dans Figma.
  Rendez toute activation qui change le comportement au mainteneur avec ces mesures.

Fin : la comparaison A/B donne les durées et les éventuels ralentissements. Sans mesure, D5b reste non coché.

### D6a. Virtualisation des cartes

Fichiers : `src/ui/virtualisation.ts`, tests unitaires nouveaux dans `packages/plugin-architect/tests/`.

- [ ] D6.1a Adaptez la liste aux cartes dépliables, ou virtualisez seulement leurs sous-listes de hauteur fixe.
  Conservez focus, état déplié, menus, réponses et cases quand une ligne sort puis revient à l'écran.

Fin : `npm run test:paquet -- architect` passe. Les tests sur faux DOM bornent le nombre de nœuds et couvrent le retour d'une carte dépliée.

### D6b. Branchement des sections

Fichiers : `src/ui/structure/aFaire.ts`, `src/ui/structure/corrections.ts`, `src/ui/nomenclature/aAppliquer.ts`,
`src/ui/nomenclature/aTrancher.ts`, galerie et tests.

- [ ] D6.1b Branchez les sections de plus de 50 cartes sur D6a. Le repli au-delà de 20 cartes de C3 reste une règle distincte.
  Le cochage global compte aussi les cartes hors du DOM. Ajoutez les états longs de galerie.

Fin : `npm run test:paquet -- architect` passe. Les tests gardent les compteurs et les gestes après défilement.
Le mainteneur relit les listes longues dans la galerie.

### D7. Mesure finale

- [ ] D7.1 Rejouez le banc D0 et `npm run stress:rejeu`. Écrivez entrées, compteurs, durées et sources absentes dans `MESURE-DES-FAILLES.md`.
- [ ] D7.2 Le mainteneur mesure Actualiser, Ignorer et Appliquer dans Figma sur la même source que D0.
  Distinguez le gain local du gain Figma. N'annoncez aucune baisse de durée sans cette comparaison.

Fin : le tableau avant et après porte les mêmes entrées. Le `verificateur` classe tout écart de parité.
Les mesures Figma absentes restent non cochées et passent à la recette F3.

## Phase E. Corrections tirées des réponses V2

Chaque décision de [QUESTIONS-V2.html](./QUESTIONS-V2.html) (archive « Questions tranchées ») et chaque écart de
[MESURE-DES-FAILLES.md](./MESURE-DES-FAILLES.md) est rattaché aux cases de A à E et à la table de couverture finale. Chaque case cite sa question ou son écart. L'agent relit la décision avant d'écrire. Les 102 décisions sont acquises. QV-5 est tranchée comme report au prochain passage dans Figma.

Règles propres à la phase E :

- La conversation principale écrit les textes destinés au designer avant de confier un lot, avec la skill `rediger-diagnostics-ucm`, et
  les met dans la note du lot. Aucun texte ne dit « peinture » ni « mélange » (Q-F7-14).
- Toute proposition arrive décochée (Q-F2). Une correction n'est cochable que si elle est exacte, avec une règle écrite et un seul
  candidat. Sinon c'est une question.
- Un exemple, un test ou une fixture écrit un variant en toutes lettres (`Size=Small`) et un token en abréviation (`sm`) (Q-F5-6).
- Q-F2-9. Créez un test de régression pour chaque écart corrigé. Le `todo` connu de N-04 dans
  `packages/kit/tests/stressComposantBase.test.ts` se retire avec E5d. Les autres fichiers de régression ne sont pas supposés exister.
- Chaque sous-lot ci-dessous tient en un appel. Il garde les identifiants de cases E1 à E11 pour la traçabilité.
  La ligne « Fin » locale porte sur ses régressions. Le harnais complet et les cibles de famille se vérifient en E12.
  Une fin locale ne promet pas les résultats des autres sous-lots.
- Reclassez les cas `mesure` selon les décisions acquises avant de calculer les dénominateurs.
  Conservez les cibles de `MESURE-DES-FAILLES.md` comme objectifs de recette, sans les déclarer atteintes à l'avance.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| E0 Décisions et oracles | `implementeur` | C6 | [ ] |
| E0b Mesure des opérateurs F3-F4 | `implementeur` | E0 | [ ] |
| E1a Valeurs de variant et axes | `implementeur-exigeant` | E0 | [ ] |
| E1b Icône, anneau et rôle de layer | `implementeur-exigeant` | E1a | [ ] |
| E2a Dictionnaire et vocabulaire du fichier | `implementeur-exigeant` | E1b | [ ] |
| E2b Fautes et seuils | `implementeur` | E2a | [ ] |
| E2c Formes tolérées, synonymes et collections | `implementeur` | E2b | [ ] |
| E2d Idempotence et branches parallèles | `implementeur` | E2c | [ ] |
| E3a Rôles proches et palette voisine | `implementeur` | E2d | [ ] |
| E3b Sens et modes | `implementeur-exigeant` | E3a | [ ] |
| E3c Doublons de rôle et d’échelle | `implementeur` | E3b | [ ] |
| E3d Cible des alias du thème | `implementeur` | E3c | [ ] |
| E3e Variables indisponibles, voisins et scopes | `implementeur` | E3c | [ ] |
| E3f Cartes de couches et thème absent | `implementeur` | E3e | [ ] |
| E4a Questions et cartes de structure | `implementeur` | E3f, C6 | [ ] |
| E4b Échecs, ignorés et alias à écrire | `implementeur` | E4a, E3d | [ ] |
| E4c Fusion de variables | `implementeur-exigeant` | E4b, E3c | [ ] |
| E5a Layers masqués et rôles | `implementeur` | E1b | [ ] |
| E5b Propagation et héritage | `implementeur` | E5a | [ ] |
| E5c Texte et fond de page | `implementeur` | E5b | [ ] |
| E5d Liaisons, alias de composant et scopes | `implementeur` | E5c | [ ] |
| E6 Tailles du composant | `implementeur` | E5d | [ ] |
| E7a Axes et valeurs | `implementeur-exigeant` | E6, E1a | [ ] |
| E7b Matrice et tokens sans emploi | `implementeur` | E7a | [ ] |
| E8a Icônes du composant | `implementeur-exigeant` | E7b, E1b | [ ] |
| E8b Styles de texte | `implementeur` | E8a | [ ] |
| E9a Composition et valeurs de couleur | `implementeur` | E8b | [ ] |
| E9b Visibilité et fond du texte | `implementeur` | E9a | [ ] |
| E9c Modes, garanties et identifiants | `implementeur` | E9b | [ ] |
| E9d Contours et anneaux | `implementeur` | E9c, E1b | [ ] |
| E9e Désactivés et limites de lecture | `implementeur` | E9d | [ ] |
| E10a Règles d’usage | `implementeur` | E9e, B2 | [ ] |
| E10b Points du moteur et dédoublonnage | `implementeur-exigeant` | E10a, E5d, E6 | [ ] |
| E11a Lectures refusées | `implementeur` | E10b, B6 | [ ] |
| E11b Ordre, budget et library à choisir | `implementeur-exigeant` | E11a, B7 | [ ] |
| E11c Sujet, cycle et résultat provisoire | `implementeur` | E11b | [ ] |
| E12 Rejeu complet et cibles | `verificateur`, puis la conversation principale | E11c, E0b, E3d, E4c, D7.1, D5a | [ ] |

### E0. Décisions et oracles

Agent : `implementeur`. Dépend de : C6.
Fichier : ce plan. Les oracles des harnais restent en lecture pendant E0.

- [ ] E0.1 Q-F7. Gardez la recette retirée du travail d'agent. Le mainteneur prépare lui-même son fichier.
- [ ] E0.2 Q-F2-7. Gardez `MESURE-DES-FAILLES.md` comme seul document de mesures des neuf familles.
- [ ] E0.3 Q-F7-13. Gardez Display P3 hors du périmètre des corrections. Cette décision ne demande aucun changement produit.
- [ ] E0.4 Q-F2-9. Listez les régressions à créer par écart. Retirez seulement les `todo` réellement présents avec leur correction.
- [ ] E0.5 Associez les cas provisoires à leur sous-lot, dont S3 et S4 de F1 et les deux cas en attente de F3-F4.
  Chaque sous-lot reclasse ses propres cas avant sa correction. Il rend les anciens et nouveaux dénominateurs avec graine et entrées.
  Il vérifie son oracle avec le harnais de sa famille. Aucun oracle ne change pour masquer un défaut.

Fin : `git diff --check` passe. La table de couverture rattache les 102 décisions à des cases existantes.
Le relevé associe chaque écart à une régression existante ou à créer, puis à son sous-lot. Aucun oracle n'est modifié dans E0.

### E0b. Mesure des opérateurs F3-F4

Agent : `implementeur`. Dépend de : E0.
Fichiers : `packages/plugin-architect/scripts/stress/f3-composant/executer.ts`, les opérateurs existants sous
`packages/kit/tests/stress/f3-composant/` et un nouveau module de mesure dans le dossier de l'exécuteur.

- [ ] E0.6 Faites mesurer les opérateurs du kit F3-F4 par l'exécuteur existant. Il ne joue aujourd'hui que la chaîne de 67 cas.
  Réemployez les opérateurs et leurs oracles, sans recopier les contrôles. Séparez leur tableau de celui de la chaîne.
- [ ] E0.7 Donnez attendus, manqués, faux constats, corrections inexactes, exceptions et durées.
  Gardez les résultats nommés sous `_local/stress/f3-composant/`. Testez le comptage sur un échantillon fabriqué.

Fin : `npm run stress:composant --workspace ucm-architect-plugin` rend deux tableaux distincts et déterministes sur les mêmes entrées.
`npm run test:paquet -- architect` passe. Le lot mesure les défauts existants sans corriger le produit.

### E1a. Valeurs de variant et axes

Agent : `implementeur-exigeant`. Dépend de : E0, D6b.

Fichiers : `packages/kit/src/referentiel/vocabulaire.ts`, `packages/kit/src/referentiel/ecriture-des-mots.ts`,
`packages/kit/src/referentiel/architecture.ts`, `packages/kit/src/referentiel/conventions.ts`,
`packages/kit/src/controles/nommage.ts` (`axeDePropriete`).
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E1.1 Écriture d'une valeur de variant (Q-F5-5, Q-F5-6). Le variant s'écrit en toutes lettres, avec une majuscule à chaque mot
  (`Small`, `Extra Large`, `Danger`). Le token s'écrit en minuscules et en abréviation (`sm`, `xl`, `danger`). Une table du kit passe de
  l'un à l'autre. `S`, `M`, `L`, `sm` et `Middle` dans un variant ont une correction vers le mot entier.
- [ ] E1.2 Rôle d'un nom d'axe (Q-F5-1, Q-F5-9, E-27). `Type`, `Kind` et `Shape` pilotent le style. `Density` et `Spacing` pilotent la
  taille. Un nom français prend le rôle de son équivalent anglais et reçoit un renommage vers l'anglais. Un axe booléen ne pilote aucun segment.
- [ ] E1.6 Segment d'une valeur à point ou à barre (Q-F5-10). Le point et la barre deviennent un tiret (`16-9`, `1-5`).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E1b. Icône, anneau et rôle de layer

Agent : `implementeur-exigeant`. Dépend de : E1a.

Fichiers : `packages/kit/src/controles/mapping.ts`, `packages/kit/src/controles/typographie.ts`,
`packages/kit/src/controles/accessibilite.ts`, `packages/plugin-architect/src/ui/composant/signes.ts`.
Auditez aussi `packages/plugin-socle/src/composant/contract/imbriques.ts`, sans changer sa règle d’export sur son seul nom.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E1.3 Définition unique d'une icône (Q-F6-3, Q-F3-4, Q-F6-4, E-26). L'instance d'un composant `Icon` est le cas principal. Puis
  une instance qu'une propriété INSTANCE_SWAP pilote, dont la propriété ou le layer porte un mot d'icône, ou un VECTOR ou
  BOOLEAN_OPERATION dont le nom contient le mot entier `icon`, `icône`, `glyph`, `pictogram` ou `symbol`. Un FRAME ou un TEXT n'est jamais
  une icône. Les contrôles importent la définition commune du kit. Auditez aussi
  `packages/plugin-architect/src/ui/composant/signes.ts` (`estUnLayerDIcone`, `estUnTokenDIcone`).
  Distinguez la responsabilité d'export de `packages/plugin-socle/src/composant/contract/imbriques.ts` (`estUneIcone`).
  Ne supprimez pas ce lecteur sur son seul nom.
- [ ] E1.4 Définition d'un anneau (Q-F7-9). Un layer lié à un token de rôle `ring`, ou nommé `Ring` ou `Focus ring`. `NOM_D_ANNEAU`
  passe dans le référentiel.
- [ ] E1.5 Rôles qui désignent un layer (Q-F3-3). `divider` (noms `Divider`, `Separator`), `ring` (noms `Ring`, `Focus ring`) et `icon`
  (instance d'`Icon`). Les autres rôles ne regardent pas le nom.
- [ ] E1.7 Monter la version du kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

### E2a. Dictionnaire et vocabulaire du fichier

Agent : `implementeur-exigeant`. Dépend de : E1b.

Fichiers : `packages/kit/src/referentiel/vocabulaire.ts`, `packages/kit/src/referentiel/questions.ts`,
`packages/kit/src/referentiel/vocabulaire-du-fichier.ts`, `packages/plugin-architect/src/nomenclature/`,
`packages/kit/tests/stress/f1-noms/donnees/`. Lisez `PLAN-STRESS-F1-NOMS.md`, sections 1, 4 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E2.1 Dictionnaire (Q-F6). La conversation principale classe les listes de candidats du lot 1 dans `formes.json` et
  `synonymes.json`. Le mainteneur ne relit aucun JSON. Transférez les définitions retenues dans
  `packages/kit/src/referentiel/vocabulaire.ts`. Le runtime n'importe aucune donnée depuis `tests/`. Un couple qu'elle ne sait pas classer reste hors du dictionnaire.
- [ ] E2.2 Question « même mot ou deux mots ? » de Nomenclature pour ce couple. La réponse du designer se range dans le vocabulaire du
  fichier, et la question ne revient pas.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

### E2b. Fautes et seuils

Agent : `implementeur`. Dépend de : E2a.

Fichiers : `packages/kit/src/referentiel/questions.ts`, `packages/kit/src/referentiel/harmonisation.ts`,
`packages/kit/tests/stress/f1-noms/`. Lisez `PLAN-STRESS-F1-NOMS.md`, sections 4 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E2.3 Règle des fautes. Une faute n'a plus besoin de partager une place (E-05), ni d'une référence vue dans 5 noms (E-01). Une
  faute vue dans 3 noms ou plus reste vue (E-02). L'échange de deux lettres est une faute (E-03). Deux mots hors vocabulaire à une lettre
  donnent une question, le plus fréquent en premier (Q-F1). Une faute ou un mot collé d'un seul nom va dans Questions (Q-F3).
- [ ] E2.4 Fautes à deux lettres (Q-F9). Elles donnent une question, seulement pour un mot au-dessus du seuil de longueur.
- [ ] E2.5 Seuils (Q-F4). `npm run stress:f1 -- --faux-positifs` mesure la courbe. Le seuil d'une lettre et celui de deux lettres sont
  les plus petites longueurs à moins d'un faux positif pour 1 000 noms justes. Les valeurs vont dans le kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E2c. Formes tolérées, synonymes et collections

Agent : `implementeur`. Dépend de : E2b.

Fichiers : `packages/kit/src/referentiel/termes-connus.ts`, `packages/kit/src/referentiel/normalisation.ts`,
`packages/kit/src/referentiel/harmonisation.ts`, `packages/kit/src/referentiel/vocabulaire.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E2.6 Formes tolérées et synonymes. Une forme tolérée bloquée par collision pose une question (E-08). Les blocs gardés entiers
  (E-09), les pluriels (E-10), les termes de `REGISTRES_COMPOSANTS` (E-04) et une référence tolérée (N-02) sont lus. Les synonymes
  du classement `synonymes.json` alimentent la table de `packages/kit/src/referentiel/vocabulaire.ts`, au lieu des 9 groupes en dur (E-11). Un synonyme seul donne une question si son terme UCM est unique
  (Q-F5). Un synonyme sans terme UCM unique donne une information sans action.
- [ ] E2.7 Une collection à une lettre d'une collection UCM (`thme`) propose cette collection en question (Q-F8, E-15). Une référence
  inconnue se replie au lieu de bloquer (E-06). La conversion par `couche` reste (Q-F10).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E2d. Idempotence et branches parallèles

Agent : `implementeur`. Dépend de : E2c.

Fichiers : `packages/kit/src/referentiel/normalisation.ts`, `packages/kit/src/referentiel/harmonisation.ts`,
`packages/kit/tests/stressF1Harnais.test.ts` et nouveaux tests de régression F1 dans `packages/kit/tests/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E2.8 Le renommage est idempotent (N-01). Les 720 cas de casse sont expliqués, puis corrigés côté kit ou côté oracle (N-03).
- [ ] E2.9 Branches parallèles au-delà de 12 branches (E-45).
- [ ] E2.10 Monter la version du kit. Les nouvelles régressions F1 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions vérifient le second passage sans renommage ni question nouvelle, la casse et plus de 12 branches.

### E3a. Rôles proches et palette voisine

Agent : `implementeur`. Dépend de : E2d.

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/theme.ts`.
Lisez `PLAN-STRESS-F2-STRUCTURE.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E3.1 Rôles proches (Q-F2-1, E-19). Un dernier segment proche d'un rôle du même dossier donne une question, au lieu de créer le
  rôle absent. Une variable loin de tout rôle ne donne rien.
- [ ] E3.4 Palette voisine (Q-F2-2). Un rôle aliasé vers la rampe d'une autre palette donne une question sans présélection.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E3b. Sens et modes

Agent : `implementeur-exigeant`. Dépend de : E3a.

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/theme.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E3.2 Sens de la palette (Q-F2-3, N-25, N-27). Le sens se lit sur les rôles non dégradés. Un sens partagé ou un `solid/foreground` à
  contre-sens donne une question à deux réponses, sans correction. C60 lit le sens.
- [ ] E3.3 Modes (Q-F2-4, N-24, N-26, E-20). C60 trouve la branche dans le chemin (`primary/dark/300`) et dans les modes de la cible. Un
  alias vers l'autre branche au cran de son propre mode a la correction vers la bonne branche. Toute question C60 a un genre.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E3c. Doublons de rôle et d’échelle

Agent : `implementeur`. Dépend de : E3b.

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/structure.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E3.5 Doublons. Deux collections `theme` donnent un constat À faire (Q-F2-5). Un rôle présent deux fois est
  jugé pour ses deux variables (N-29) et reçoit la question de fusion de Q-F2-6 (écriture en E4.4).
- [ ] E3.6 Doublons d'échelle (Q-F2-8, N-33). Les alias se résolvent avant la comparaison, pour toutes les échelles, à 1e-6 près. Sans
  library choisie, une cible inaccessible donne une information.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E3d. Cible des alias du thème

Agent : `implementeur`. Dépend de : E3c.

Fichiers : `packages/kit/src/controles/structure.ts`, `packages/kit/src/controles/integrite.ts` et les ports de lecture d’Architect.
La vérification de la recette attend la levée de la réserve sur Palettes.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E3.7 Alias de mode de C63 `theme` (Q-F3-5, N-16). La cible est le cran de la configuration d'UCM Palettes pour ce rôle et ce mode.
  Vérifier d'abord que la recette rangée par Palettes (`figma.root`, espace `ucm_palettes`, clé `recette`) donne ce cran. Si elle ne le
  donne pas, rendre la question à la conversation principale. Sans recette, la table UCM du kit sert.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E3e. Variables indisponibles, voisins et scopes

Agent : `implementeur`. Dépend de : E3c.

Fichiers : `packages/kit/src/controles/structure.ts`, `packages/kit/src/controles/integrite.ts`,
`packages/kit/src/controles/catalogue.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E3.10 Écarts restants. N-08, N-15, N-28 (voisine choisie par le dernier segment), N-30 (collection dans l'identifiant), N-31
  (variable non chargée), N-32 (scopes des FLOAT).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E3f. Cartes de couches et thème absent

Agent : `implementeur`. Dépend de : E3e.

Fichiers : `packages/kit/src/controles/integrite.ts` et les faits échangés avec Architect.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E3.8 Regroupement des C82 `couche` (QV-3, N-87). Une carte par couple de collections et par couche visée, avec le nombre de
  variables et de modes.
- [ ] E3.9 Thème non reconnu (QV-4, N-88). Une information dit qu'aucune collection n'est reconnue comme `theme` et que l'intégrité UCM n'est pas contrôlée.
- [ ] E3.11 Monter la version du kit. Les nouvelles régressions F2 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E4a. Questions et cartes de structure

Agent : `implementeur`. Dépend de : E3f, C6.

Fichiers : `packages/plugin-architect/src/ui/structure/`, `packages/plugin-architect/src/ui/textes/`,
`packages/plugin-architect/galerie/etats/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E4.1 La question du sens décrit le rendu (Q-F2-3). « Garder le texte noir sur les boutons » ou « Passer au texte blanc ». Pour une
  palette partagée, un bouton et un encadré dessinés dans chaque couleur, jamais « sens normal » ni « sens inverse ».
- [ ] E4.6 Carte groupée de QV-3, avec la liste des variables qui se déplie. Information de QV-4 en tête du mode Tokens, avec la conséquence sur l'intégrité non contrôlée.
- [ ] E4.7 États de galerie de chaque écran changé.

Fin : `npm run test:paquet -- architect` passe. Les régressions couvrent les cases de ce sous-lot. La galerie expose ses cartes et ses refus.

### E4b. Échecs, ignorés et alias à écrire

Agent : `implementeur`. Dépend de : E4a, E3d.

Fichiers : `packages/plugin-architect/src/sandbox/structure.ts`, `packages/plugin-architect/src/ecriture/structure.ts`,
`packages/plugin-architect/src/ui/structure/`, `packages/plugin-architect/src/ui/textes/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E4.2 Chaque motif de saut a un texte (E-24). Une lecture qui lève, un catalogue `null` ou un refus de Figma ne disent plus « Rien à
  régler » (E-23).
- [ ] E4.3 Ignorer la proposition d'un constat de scopes range le constat sous Ignorés (E-21).
- [ ] E4.5 La correction `alias-de-mode` part à l'écriture (E-28).

Fin : `npm run test:paquet -- architect` passe. Les régressions couvrent les cases de ce sous-lot. La galerie expose ses cartes et ses refus.

### E4c. Fusion de variables

Agent : `implementeur-exigeant`. Dépend de : E4b, E3c.

Fichiers : `packages/plugin-architect/src/ecriture/structure.ts`, `packages/plugin-architect/src/ecriture/journal.ts`,
`packages/plugin-architect/src/messages/structure.ts`, `packages/plugin-architect/src/sandbox/structure.ts`
et les cartes de `packages/plugin-architect/src/ui/structure/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E4.4 Fusion de deux variables du même rôle (Q-F2-6, option C). Architect relie à la variable gardée chaque token et chaque layer du
  fichier, puis fait de l'autre un alias de la variable gardée, marquée à retirer. Un second constat propose de la retirer quand plus
  rien ne l'emploie.

Fin : `npm run test:paquet -- architect` passe. Les tests vérifient tokens, layers, alias et marquage, avec refus et écriture partielle. Le critère de retrait reste soumis à la preuve demandée au mainteneur dans le rapport de relecture.

### E5a. Layers masqués et rôles

Agent : `implementeur`. Dépend de : E1b.

Fichiers : `packages/kit/src/controles/corrections.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/kit/tests/stress/f3-composant/`. Lisez `PLAN-STRESS-F3-F4-COMPOSANT.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E5.1 Layers masqués (Q-F3-1). C25 et C29 jugent un layer masqué ou sous un ancêtre masqué. La carte dit que le layer est masqué.
  Une instance imbriquée reste une frontière (Q-F3-2).
- [ ] E5.2 C25 juge toute peinture sans token, pas seulement `title` (E-25, N-11). Il saute l'opacité 0 et la lecture mixte (N-12).
- [ ] E5.3 Nom et rôle (Q-F3-3, N-22). C24 lit la table de E1.5 dans les deux sens. La correction propose le token ou le nom, s'il est
  unique.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E5b. Propagation et héritage

Agent : `implementeur`. Dépend de : E5a.

Fichiers : `packages/kit/src/controles/propagation.ts`, `packages/kit/src/controles/couche.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E5.4 Propagation (Q-F3-6, Q-F3-7, N-09, N-10). Elle recopie seulement les tokens lisibles du composant. Une plage déjà liée ne
  donne pas de question. Un layer propre à un variant ne donne rien. Deux homonymes sous le même parent donnent une question qui demande de renommer l'un des deux.
- [ ] E5.5 Héritage (Q-F3-8, N-17). Une liaison héritée sans changement n'est jamais jugée. Une surcharge de l'hôte l'est.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E5c. Texte et fond de page

Agent : `implementeur`. Dépend de : E5b.

Fichiers : `packages/kit/src/controles/theme.ts`, `packages/kit/src/controles/corrections.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E5.6 Texte sur fond de page (Q-F3-9, Q-F3-10, N-13, N-14). C59 suit l'alias du token du composant jusqu'au thème. Sa correction
  vise le token du composant qui vise `page/foreground`. Une plage n'est énumérée qu'une fois.
  C59 inclut les fonds `subtle`. Une liaison directe au thème garde C80 seul. Plusieurs tokens possibles vers
  `page/foreground` donnent une question, sans correction présélectionnée.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E5d. Liaisons, alias de composant et scopes

Agent : `implementeur`. Dépend de : E5c.

Fichiers : `packages/kit/src/controles/corrections.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/kit/src/controles/couche.ts`, `packages/kit/tests/stressComposantBase.test.ts` et les fixtures concernées.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E5.7 Un constat par liaison (Q-F3-12, Q-F3-16, N-06). Palette et état faux donnent une carte, vers le token qui corrige les deux
  segments, seulement si ce token est unique. Sinon, posez une question. Quand plusieurs constats visent la même liaison, celui qui porte la correction reste.
- [ ] E5.9 Tokens d'icône (Q-F3-15, N-07). Un composant ne déclare plus de token d'icône. L'alias d'un token de composant vers un autre
  composant est un défaut. Les 3 fixtures qui emploient ce motif se mettent à jour.
- [ ] E5.10 Écarts restants. N-04 et N-05 (scopes `SHAPE_FILL` et `FRAME_FILL` de C18), N-21 (variable non chargée ou inaccessible).
- [ ] E5.11 Monter la version du kit. Les régressions F3 passent. Retirez le `todo` N-04 seulement avec sa correction.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E6. Tailles du composant

Agent : `implementeur`. Dépend de : E5d.

Fichiers : `packages/kit/src/controles/corrections.ts`, `packages/kit/src/controles/candidatsDeLongueur.ts`,
`packages/kit/src/controles/structure.ts`, `packages/kit/tests/stress/f3-composant/operateursTailles.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E6.1 Égalité à 1e-6 px près. À égalité, les deux candidats sont montrés (Q-F3-11, N-18, N-19).
- [ ] E6.2 C29 lit la famille `sizes` et la propriété `border-radius`, et C8 demande l'harmonisation (Q-F3-13, N-20).
- [ ] E6.3 Un token de taille dont la valeur change entre Light et Dark donne un constat À faire. La carte demande quelle valeur garder,
  sans case cochée (Q-F3-14).
- [ ] E6.4 Monter la version du kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E7a. Axes et valeurs

Agent : `implementeur-exigeant`. Dépend de : E6, E1a.

Fichiers : `packages/kit/src/controles/nommage.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/kit/tests/stress/f5-variants/`. Lisez `PLAN-STRESS-F5-F6-VARIANTS-TYPO.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E7.1 Le nom de l'axe décide de son rôle, avant les termes d'un autre registre (Q-F5-2, N-36).
- [ ] E7.2 Deux valeurs renommées dans deux axes donnent C7 sans question (Q-F5-4). Un seul axe encore ouvert donne une question. Les candidats ne comptent pas une valeur déjà
  présente (N-35).
- [ ] E7.3 Deux axes de style (Q-F5-3). Un constat À faire demande de les réunir en un seul axe (`Variant=Solid, Subtle, Outline`),
  sans fusion automatique. Les tokens du style `subtle` visent `surface/*` du thème, ceux du style `solid` visent `solid/*`, et un écart
  donne un constat.
- [ ] E7.4 Casse et forme (Q-F5-5, Q-F5-6, N-34, N-37). Le variant en toutes lettres correspond au token abrégé par la table de E1.1. C9
  reste pour une valeur inconnue. `Error` reçoit C8 vers `Danger`.
- [ ] E7.7 Valeur à point ou à barre lue par E1.6 (Q-F5-10).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E7b. Matrice et tokens sans emploi

Agent : `implementeur`. Dépend de : E7a.

Fichiers : `packages/kit/src/controles/nommage.ts`, `packages/kit/src/controles/oublis.ts`,
`packages/kit/tests/stress/f5-variants/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E7.5 Au-delà de 4 096 combinaisons, une information donne le total et le nombre de variants. Sous la borne, 200 constats au plus,
  puis « et N autres » (Q-F5-7, E-44). Une valeur répétée ne donne qu'un C31 (N-38).
- [ ] E7.6 Un token au nom illisible donne C32 `nom-illisible` ignorable (Q-F5-8, N-39). C32 `inutilise` ne compte pas une liaison illisible
  (E-33). Une palette hors registre donne `sans-variant` (N-40).
- [ ] E7.8 N-41. Comptez les opérations sur la matrice de 16 × 16 × 16 variants. Mesurez sa durée sur le même banc.
  La cible de 2 secondes reste un objectif du harnais, sans seuil de temps réel dans `npm test`.
- [ ] E7.9 Monter la version du kit. Les nouvelles régressions F5 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les tests bornent le nombre de combinaisons et de constats. La durée de la matrice est relevée dans le harnais, hors test unitaire.

### E8a. Icônes du composant

Agent : `implementeur-exigeant`. Dépend de : E7b, E1b.

Fichiers : `packages/kit/src/controles/typographie.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/plugin-architect/src/ui/textes/composant.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E8.1 Icône (Q-F6-1, option A). C66 contrôle que l'icône est une instance d'`Icon`, que son remplissage suit le token de premier
  plan du composant (`button/color/primary/solid/foreground`), et que sa propriété `Size` suit la taille du variant. Les textes « Liez-la
  à une taille de layout/icon » changent.
- [ ] E8.2 Les `strokes` d'une icône à tracé tiennent lieu de couleur sans fill visible. C17 y admet `icon` ou `foreground` (Q-F6-5).
- [ ] E8.5 Un slot sans mot d'icône n'est pas une icône, et C67 ne le compte pas (Q-F6-4).
- [ ] E8.6 Monter la version du kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

### E8b. Styles de texte

Agent : `implementeur`. Dépend de : E8a.

Fichiers : `packages/kit/src/controles/typographie.ts`, `packages/kit/tests/stress/f5-variants/typo/`.
Lisez `PLAN-STRESS-F5-F6-VARIANTS-TYPO.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E8.3 C64 compare les styles dans chaque valeur de l'axe de taille (Q-F6-2, N-42). Deux layers homonymes ne masquent pas leurs
  styles (N-44). Un texte à styles mixtes reçoit l'information `styles-mixtes` (Q-F6-6, N-43).
  C64 `sans-style-ni-variables` vise seulement une plage sans style ni variable.
- [ ] E8.4 C65 couvre les huit champs de `CHAMPS_DE_TYPOGRAPHIE` (Q-F6-7).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E9a. Composition et valeurs de couleur

Agent : `implementeur`. Dépend de : E8b.

Fichiers : `packages/kit/src/controles/accessibilite.ts`, `packages/kit/src/emplois/`,
`packages/kit/tests/stress/f7-accessibilite/`. Lisez `PLAN-STRESS-F7-ACCESSIBILITE.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E9.1 Composition et arrondi (Q-F7-1). Gardez les flottants jusqu'à un seul arrondi à 8 bits, puis comparez à dix décimales.
  Corrigez l'oracle si l'écart d'un octet vient d'un ordre d'arrondi différent. Un fond de page ou d'élévation d'alpha inférieur à 1 donne `fond-indetermine`.
- [ ] E9.5 Valeurs hors gamme (Q-F7-5, N-50, N-52). Un canal ou un alpha hors de [0, 1], ou NaN, donne `couleur-hors-gamut`.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E9b. Visibilité et fond du texte

Agent : `implementeur`. Dépend de : E9a.

Fichiers : `packages/kit/src/controles/accessibilite.ts` et les acquisitions qui alimentent les opacités et les fonds.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E9.2 Opacités (Q-F7-2, N-48, N-57). L'alpha effectif multiplie ceux des ancêtres. Un layer d'alpha effectif nul n'est pas mesuré.
- [ ] E9.3 Grand texte gras à 56/3 px et 700 (Q-F7-3).
- [ ] E9.4 Fonds (Q-F7-4, N-45, N-47). Un frère plus bas qui couvre la boîte du texte est son fond. Une couverture partielle donne `fond-indetermine`. La visibilité suit chaque ancêtre.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E9c. Modes, garanties et identifiants

Agent : `implementeur`. Dépend de : E9b.

Fichiers : `packages/kit/src/controles/accessibilite.ts` et les faits des garanties dans `packages/kit/src/emplois/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E9.6 Modes du thème au repli (Q-F7-6). Incluez les modes de `theme` dès que le repli sert, même pour le texte en dur. Borne de 5 000 qui dit les variants non mesurés, sans collection inutile (Q-F7-11, N-61).
- [ ] E9.7 Garantie du thème (Q-F7-7, N-49). `corriger` seulement si la garantie vise le même type de seuil, le niveau demandé et ce fond.
- [ ] E9.11 Identifiant d'un constat de contraste par code, nom du layer, usage et fond nommé, sans plage ni niveau (Q-F7-12, N-62). Une plage vide ne donne rien (N-56).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E9d. Contours et anneaux

Agent : `implementeur`. Dépend de : E9c, E1b.

Fichiers : `packages/kit/src/controles/accessibilite.ts` et la définition commune d’anneau de E1b.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E9.8 Contours (Q-F7-8, N-63). Un contour sous 3:1 reste muet quand le remplissage du layer atteint 3:1. Sans remplissage visible,
  ou sous 3:1, mesurez le contour sur le fond des ancêtres.
- [ ] E9.9 Anneau par E1.4 (Q-F7-9, N-58, N-59). Un anneau rempli sans contour se mesure sur son remplissage.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

### E9e. Désactivés et limites de lecture

Agent : `implementeur`. Dépend de : E9d.

Fichiers : `packages/kit/src/controles/accessibilite.ts`, `packages/plugin-architect/src/ui/textes/composant.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E9.10 Variants désactivés (Q-F7-10, N-51, N-55, N-60). Gardez `disabled` et `disable`, ajoutez `Disabled=True` et `Enabled=False`.
  C53 dit que contraste et cible sont exclus. Mesurez encore `Inactive`, `read-only`, `dimmed` et le texte sous 12 px, même désactivé.
  `Survol` est une forme tolérée de `hover`.
- [ ] E9.12 Mode de fusion et flou d'arrière-plan (Q-F7-14, N-46). La limite dit « mode de fusion » pour un mode de fusion.
  N-46. Testez la priorité de `peinture-superposee` sur `degrade` quand les remplissages se superposent.
- [ ] E9.13 Lecture partielle (N-53, N-54). Un cycle de `parent` termine. C49 et C50 ne jugent pas ce qui n'a pas été lu.
- [ ] E9.14 Monter la version du kit. Les nouvelles régressions F7 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

### E10a. Règles d’usage

Agent : `implementeur`. Dépend de : E9e, B2.

Fichiers : `packages/plugin-architect/src/regles.ts` et ses lecteurs du socle.
Lisez `PLAN-STRESS-F8-F9-ANALYSE.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E10.1 Noms de règle (Q-F89-1, N-64, N-74). La comparaison retire espaces, tirets, soulignés, casse et suffixe `#1:2`.
- [ ] E10.2 Valeur inconnue (Q-F89-2, N-65). `Size.xxl` donne C45 `valeur-inconnue`. Une cible `@prop` vide donne `sans-propriete`
  (N-72). `@boolean` sur un axe donne un constat (N-73).
- [ ] E10.3 Conteneurs (Q-F89-5, Q-F89-6, Q-F89-7, Q-F89-8, Q-F89-9, N-68, N-69, N-70). Le scan reste sur la page du composant. Un conteneur vide est rempli. Deux
  noms compactés égaux donnent un constat. Le premier conteneur de la page l'emporte. Seule l'instance la plus proche compte. C43 dit qu'une instance d'une autre page n'est pas lue.
  Deux noms compactés égaux ne partagent pas leur conteneur. Un conteneur supplémentaire ignoré garde C44.
  Testez C43 et C44 sans accuser deux fois le même défaut.
- [ ] E10.5 Règle renommée (Q-F89-13). Une propriété sans règle et une règle sans propriété au nom voisin font un constat qui cite les deux noms, sans correction.

Fin : `npm run test:paquet -- architect` passe. Les régressions couvrent les cases de ce sous-lot sur les lecteurs doubles et le vrai panneau sur faux DOM.

### E10b. Points du moteur et dédoublonnage

Agent : `implementeur-exigeant`. Dépend de : E10a, E5d, E6.

Fichiers : `packages/plugin-architect/src/constatsDuMoteur.ts`, `packages/plugin-architect/src/sandbox/analyse.ts`,
`packages/plugin-architect/src/ui/panneau/`, `packages/plugin-architect/scripts/stress/f8-analyse/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E10.4 Points du moteur (Q-F89-10, Q-F89-11, E-29, E-37, N-67). C34 garde combinaisons manquantes, états non reconnus et états tolérés.
  Aucun variant devient C42 bloquant. Aucune propriété et les collisions de noms deviennent C42 à vérifier.
  Opacité et effets vont dans Tokens. Marges, espacement, rayon et contour vont dans Tailles.
  Remplissage et contour de couleur vont dans Couleurs. Un style de texte va dans Texte.
- [ ] E10.6 Identifiant d'un point (Q-F89-21, N-66). L'empreinte porte le titre, les nœuds et les éléments. Retirez le suffixe de rang pour les points distincts.
- [ ] E10.7 Écarts N-84 (point ignoré après un changement d'ordre des phrases).
- [ ] E5.8 Doublon du kit et du moteur (Q-F3-17, Q-F89-12, E-30). Un point C30 tombe quand un C25 ou un C29 porte le même layer et le
  même champ. Ignorer le constat du kit fait taire le point.

Fin : `npm run test:paquet -- architect` passe. Les régressions couvrent les cases de ce sous-lot sur les lecteurs doubles et le vrai panneau sur faux DOM.

### E11a. Lectures refusées

Agent : `implementeur`. Dépend de : E10b, B6.

Fichiers : `packages/plugin-architect/src/sandbox/analyse.ts`, `packages/plugin-architect/src/messages/analyse.ts`.
B6 porte la bannière. B4, B5 et B7 portent déjà Q-F89-15, Q-F89-18, Q-F89-17 et QV-2.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E11.1 Lectures refusées (Q-F89-3, N-78, N-83). Règles, niveau, ignorés et déclaration refusés rendent `partielle`. Un refus des dépendances interdit la reprise de l'entrée.
  Il laisse une trace dans la mesure, sans message d'écran. Une annulation n'est pas un refus.
- [ ] E11.2 Library illisible (Q-F89-4, N-79). L'analyse est partielle. La bannière nomme la library et dit de l'activer dans les
  libraries du fichier (Assets, Libraries), puis d'actualiser.

Fin : `npm run test:paquet -- architect` passe. Les régressions couvrent les cases de ce sous-lot sur les lecteurs doubles et le vrai panneau sur faux DOM.

### E11b. Ordre, budget et library à choisir

Agent : `implementeur-exigeant`. Dépend de : E11a, B7.

Fichiers : `packages/plugin-architect/src/sandbox/analyse.ts`, `packages/plugin-architect/src/sandbox/prelecture.ts`,
`packages/plugin-socle/src/composant/analyse/` et les lecteurs de layers d’Architect.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E11.3 Ordre des états (Q-F89-14). Arrêtée, annulée, périmée, partielle, complète.
- [ ] E11.4 Décompte des layers (Q-F89-19, N-76, N-81). Une seule fonction de décompte. Un variant qui lève est une lecture manquée sans
  couper les suivants. Le premier variant reste lu sans borne. Au-delà de 2 000 layers dans ce variant, ajoutez une information.
- [ ] E11.5 Library à choisir (Q-F89-20, N-82). La garde passe dans le sandbox, pour la prélecture et pour Analyser.

Fin : `npm run test:paquet -- architect` et `npm run test:paquet -- socle` passent. Les régressions couvrent les cases de ce sous-lot sur les lecteurs doubles et le vrai panneau sur faux DOM.

### E11c. Sujet, cycle et résultat provisoire

Agent : `implementeur`. Dépend de : E11b.

Fichiers : `packages/plugin-architect/src/sandbox/analyse.ts`, `packages/plugin-architect/src/messages/analyse.ts`,
`packages/plugin-architect/src/ui/analyse/index.ts`, `packages/plugin-architect/src/ui/composant/analyse.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E11.6 Sujet sans nœud (QV-1). L'écran « Aucun composant n'est sélectionné », sans statut `complete`.
- [ ] E11.7 Modèle d'une analyse annulée (N-71). Compteur de génération remis à zéro (N-75).
- [ ] E11.8 Résultat provisoire (N-23). Montrez ses cartes pendant le calcul. Gardez les verrous du provisoire,
  sans sections tenues ni pied applicable. Testez son rendu et son remplacement par le résultat final.

Fin : `npm run test:paquet -- architect` passe. Les régressions couvrent les cases de ce sous-lot sur les lecteurs doubles et le vrai panneau sur faux DOM.

### E12. Rejeu complet et cibles

Agent : `verificateur`, puis la conversation principale. Dépend de : E11c, E0b, E3d, E4c, D7.1 et D5a.

- [ ] E12.1 Construisez le kit, puis rejouez les opérateurs des sept harnais et les trois chaînes, avec les commandes ci-dessous.
  Pour F3-F4, la commande existante `stress:composant` rend les deux mesures après E0b.
  Donnez cas, attendus, manqués, faux constats, corrections inexactes, faits inexacts, exceptions et durée par famille.
- [ ] E12.2 Rejouez `npm run stress:rejeu`. R2, R3 et R5 doivent tenir sur les sources présentes.
  R4 n'est pas exercée sur les sources sans correction. Gardez cette absence de preuve dans le tableau.
- [ ] E12.3 QV-5. Le mainteneur capture Alert et Input au prochain passage dans Figma. Gardez ces cases de recette ouvertes jusque-là.
- [ ] E12.4 Comparez les résultats à la section « Cibles » de `MESURE-DES-FAILLES.md` et écrivez les nombres obtenus dans ce document.
  Chaque écart restant garde son identifiant, sa régression et une question au mainteneur. Aucune cible de couverture ne supprime un cas en échec.

```sh
npm run build --workspace @ucm-kit/core
npm run stress:f1
npx tsx packages/kit/tests/stress/f2-structure/mesurer.ts
npx tsx packages/kit/tests/stress/f5-variants/mesurer.ts --famille F5
npx tsx packages/kit/tests/stress/f5-variants/mesurer.ts --famille F6
npx tsx packages/kit/tests/stress/f7-accessibilite/mesurer.ts
npx tsx packages/plugin-architect/scripts/stress/f8-analyse/mesurer.ts --famille toutes
npm run stress:structure --workspace ucm-architect-plugin
npm run stress:composant --workspace ucm-architect-plugin
npm run stress:analyse --workspace ucm-architect-plugin -- --section D
npm run stress:rejeu
```

Fin : le tableau donne un résultat pour chaque famille et chaque source absente. Les cibles suivantes restent des critères de recette.
E12 ne se coche pas si une cible applicable manque, sauf décision explicite du mainteneur sur la limite observée.

| Famille | Cible et borne de preuve |
|---|---|
| F1 | 90 % des attendus hors S3 et S4 selon la section « Cibles ». Recalculez séparément S3 et S4 après E0.5. Gardez la cible de zéro faux positif et rendez sa tension avec le seuil de Q-F4 au mainteneur. |
| F1 sur source privée | 190 fautes sur 209, 40 inversions sur 40, second passage sans renommage. Source absente reste absence de preuve. |
| F2 | 100 % des attendus reclassés, zéro faux constat et zéro correction inexacte. Chaîne 28 cas sur 28. |
| F3-F4 | Base de 185 attendus à reclasser, zéro faux constat. Chaîne complète de 67 cas après réintégration des deux décisions, au lieu de 65 cas hors attente. |
| F5 | 100 % des attendus reclassés, zéro faux constat. Les 24 profils muets le restent. |
| F6 | 95 % des attendus reclassés, zéro faux constat. La définition d'icône est commune aux lecteurs concernés. |
| F7 | 100 % des seuils S et G, zéro faux constat et zéro exception. Classez aussi les cas hors seuil après décisions. |
| F8 | 100 % des attendus reclassés, zéro faux constat et zéro fait inexact. Chaîne 321 cas sur 321 à entrées inchangées. |
| F9 | Zéro fait inexact. Chaîne 569 cas sur 569 à entrées inchangées. Aucune lecture refusée ne finit `complete`. |
| Rejeu Tokens | Une carte au plus par couple de collections et couche. Une information sans thème reconnu. R2, R3 et R5 tiennent. |
| Rejeu Composant | Trois composants capturés après QV-5, zéro exception, chaque constat classé. |
| Durée | Chaque fichier de régression reste sous 15 secondes et chaque harnais de famille sous 240 secondes sur le banc de référence. Ces mesures restent hors des assertions unitaires de temps réel. |

### Couverture des décisions

Les 102 décisions de l'archive sont rattachées à une case ci-dessous. E0 porte les décisions retirées ou documentaires.
QM-8 et QM-9 appartiennent à la maquette, hors des 102 entrées. B1/C5 portent QM-8 et B2/B3/C3 portent QM-9.
Les 32 identifiants E mesurés et N-01 à N-88 ont une case dans le plan. E-34 appartient à B1, E-22 à C5,
les états d'écran à B4-B7 et le doublon kit/moteur à E5.8 dans E10b.

| Décision | Cases |
|---|---|
| Q-F1 | E2.3 |
| Q-F2 | B1.1, C5.1 |
| Q-F3 | E2.3 |
| Q-F4 | E2.5 |
| Q-F5 | E2.6 |
| Q-F6 | E2.1, E2.2 |
| Q-F7 | E0.1 |
| Q-F8 | E2.7 |
| Q-F9 | E2.4, E2.5 |
| Q-F10 | E2.7 |
| Q-F2-1 | E3.1 |
| Q-F2-2 | E3.4 |
| Q-F2-3 | E3.2, E4.1 |
| Q-F2-4 | E3.3 |
| Q-F2-5 | E3.5 |
| Q-F2-6 | E3.5, E4.4 |
| Q-F2-7 | E0.2 |
| Q-F2-8 | E3.6 |
| Q-F2-9 | E0.4 |
| Q-F3-1 | E5.1 |
| Q-F3-2 | E5.1 |
| Q-F3-3 | E1.5, E5.3 |
| Q-F3-4 | E1.3 |
| Q-F3-5 | E3.7 |
| Q-F3-6 | E5.4 |
| Q-F3-7 | E5.4 |
| Q-F3-8 | E5.5 |
| Q-F3-9 | E5.6 |
| Q-F3-10 | E5.6, E7.3 |
| Q-F3-11 | E6.1 |
| Q-F3-12 | E5.7 |
| Q-F3-13 | E6.2 |
| Q-F3-14 | E6.3 |
| Q-F3-15 | E5.9 |
| Q-F3-16 | E5.7 |
| Q-F3-17 | E5.8 (E10b) |
| Q-F5-1 | E1.2 |
| Q-F5-2 | E7.1 |
| Q-F5-3 | E7.3 |
| Q-F5-4 | E7.2 |
| Q-F5-5 | E1.1, E7.4 |
| Q-F5-6 | E1.1, E7.4 |
| Q-F5-7 | E7.5 |
| Q-F5-8 | E7.6 |
| Q-F5-9 | E1.2 |
| Q-F5-10 | E1.6, E7.7 |
| Q-F6-1 | E8.1 |
| Q-F6-2 | E8.3 |
| Q-F6-3 | E1.3 |
| Q-F6-4 | E1.3, E8.5 |
| Q-F6-5 | E8.2 |
| Q-F6-6 | E8.3 |
| Q-F6-7 | E8.4 |
| Q-F7-1 | E9.1 |
| Q-F7-2 | E9.2 |
| Q-F7-3 | E9.3 |
| Q-F7-4 | E9.4 |
| Q-F7-5 | E9.5 |
| Q-F7-6 | E9.6 |
| Q-F7-7 | E9.7 |
| Q-F7-8 | E9.8 |
| Q-F7-9 | E1.4, E9.9 |
| Q-F7-10 | E9.10 |
| Q-F7-11 | E9.6 |
| Q-F7-12 | E9.11 |
| Q-F7-13 | E0.3 |
| Q-F7-14 | E9.12 |
| Q-F89-1 | E10.1 |
| Q-F89-2 | E10.2 |
| Q-F89-3 | E11.1 |
| Q-F89-4 | E11.2 |
| Q-F89-5 | E10.3 |
| Q-F89-6 | E10.3 |
| Q-F89-7 | E10.3 |
| Q-F89-8 | E10.3 |
| Q-F89-9 | E10.3 |
| Q-F89-10 | E10.4 |
| Q-F89-11 | E10.4 |
| Q-F89-12 | E5.8 (E10b) |
| Q-F89-13 | E10.5 |
| Q-F89-14 | E11.3 |
| Q-F89-15 | B4.1, B4.2 |
| Q-F89-16 | B6.4 |
| Q-F89-17 | B7.1, B7.2 |
| Q-F89-18 | B5.1 |
| Q-F89-19 | E11.4 |
| Q-F89-20 | E11.5 |
| Q-F89-21 | E10.6 |
| QV-1 | E11.6 |
| QV-2 | B4.2 |
| QV-3 | E3.8, E4.6 |
| QV-4 | E3.9, E4.6 |
| QV-5 | E12.3, F3.2 |
| QM-1 | C2.1 |
| QM-2 | C1.1, C1.2 |
| QM-3 | A1.1, A1.2, A1.3 |
| QM-4 | C2.2, C3.1 |
| QM-5 | B3.1, C3.1 |
| QM-6 | B4.2 |
| QM-7 | B6.3 |
| QM-10 | C2.3 |
| QM-11 | A1.4, A2.1, A3.1, A3.3, A6.1 |

## Phase F. Clôture

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| F1 Vérification du dépôt | `verificateur` | A11, E12.1, E12.2, E12.4 | [ ] |
| F2 Publication finale | conversation principale | F1 | [ ] |
| F3 Recette Figma | mainteneur | F1, build disponible | [ ] |

### F1. Vérification du dépôt

- [ ] F1.1 Lancez `npm test`, `npm run typecheck` et `npm run build` sur l'arbre stable.
- [ ] F1.2 Lancez `npm run agents:diff` et relisez les documents listés.
  Vérifiez `SPEC.md`, `CARTE.md`, les invariants concernés et les deux langues des paquets qui en possèdent.
- [ ] F1.3 Lancez `node scripts/controle-style.mjs`. Gardez les mesures, états de galerie et limites de recette dans le compte rendu.

Fin : les trois commandes racine, le contrôle de style et la relecture des documents sont terminés. Le compte rendu distingue les preuves locales et Figma.

### F2. Publication finale

- [ ] F2.1 Publiez les seules versions finales avec `publier-paquets`, kit puis CLI et adaptateur s'ils ont changé.
  Vérifiez chaque version servie et les pins. Les versions intermédiaires locales ne sont pas publiées.

Fin : les commandes de constat du registre prescrites par la skill rendent les versions attendues.

### F3. Recette Figma

- [ ] F3.1 Le mainteneur rejoue les sections 1 à 8 de la maquette et les gestes de la section 7 des six plans de stress.
- [ ] F3.2 Le mainteneur complète D5b, D7.2 et QV-5. Il compare les captures des icônes et les états longs de galerie.

Fin : chaque geste a un résultat ou une limite nommée. Les cases qui demandent Figma restent ouvertes tant que la preuve manque.
