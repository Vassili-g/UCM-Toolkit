# Plan d'implémentation de la fiabilisation d'Architect

Ce plan implémente les maquettes validées de [MAQUETTE-FIABILISATION.html](./MAQUETTE-FIABILISATION.html), sections 1 à 8.
Il ajoute une phase de vitesse du mode Tokens. La phase E corrige les failles mesurées, d'après les réponses aux
[questions V2](./QUESTIONS-V2.html).

## Règles d'exécution

- La conversation principale confie un lot par appel, à l'agent que le lot nomme. Le prompt contient la note du lot, la sortie de
  `npm run agents:lire -- <fichiers du lot>`, les fichiers et les critères de fin. L'agent ne voit pas ce plan en entier.
- Deux agents au plus en même temps, sur des lots sans fichier commun. La colonne « Dépend de » donne l'ordre.
- La conversation principale relit le diff, fait lancer les vérifications par un `verificateur`, lance `npm run agents:diff`, puis commite
  par chemins explicites sur `main`. Elle coche la case avec le hash du commit.
- Un lot qui touche `packages/kit/src/` monte la version de `@ucm-kit/core` et passe les tests racine (`versionSuitLeContenu`). La
  publication se fait à la fin de chaque phase, avec la skill `publier-paquets`.
- Un bug trouvé reçoit un test de régression. Un écran changé reçoit son état de galerie dans `packages/plugin-architect/galerie/`.
- Personne ne lance `test:ui`. Le mainteneur teste l'interface et fait la recette dans Figma.
- `packages/plugin-palettes/` et `packages/couleur/` sont modifiés par une autre session. Le lot A8 attend que leur arbre de travail soit
  commité.
- Aucun nom tiré d'un fichier client n'entre dans un fichier suivi. Les fichiers réels restent dans `_local/`.

## Vue d'ensemble

| Phase | Lots | Objet |
|---|---|---|
| A | A1 à A11 | Toutes les icônes définies et documentées dans le kit, lues par chaque plugin (section 8) |
| B | B1 à B7 | Mode Composant : cochage, Ignorer, périmée, ignorés, partielle, refus (sections 2 à 7) |
| C | C1 à C6 | Mode Tokens en deux onglets, Constats et Règles (section 1) |
| D | D0 à D7 | Vitesse de l'analyse du mode Tokens |
| E | E1 à E12 | Corrections tirées des réponses V2, famille par famille |
| F | F1 à F3 | Clôture, publication, recette |

## Phase A. Les icônes dans le kit

But : chaque icône d'un plugin UCM a une seule définition dans `packages/kit/src/referentiel/signes.ts`. Chaque définition dit quand
l'employer et comment la poser. Un test refuse une icône dessinée ailleurs.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| A1 Signes du mode Tokens et de la revue | `implementeur` | rien | [ ] |
| A2 Un tracé, une définition | `implementeur-exigeant` | A1 | [ ] |
| A3 Familles des icônes d'interface | `implementeur` | A2 | [ ] |
| A4 Documentation d'emploi et vue illustrée | `implementeur` | A3 | [ ] |
| A5 Le socle lit le kit | `implementeur-exigeant` | A3 | [ ] |
| A6 Architect lit le kit | `implementeur-exigeant` | A5 | [ ] |
| A7 L'exporteur lit le kit | `implementeur` | A5 | [ ] |
| A8 Palettes lit le kit | `implementeur-exigeant` | A5, arbre de Palettes commité | [ ] |
| A9 Le hub lit le kit | `implementeur` | A3 | [ ] |
| A10 Glyphes des sorties texte | `executant` | A3 | [ ] |
| A11 Test de la loi des icônes | `implementeur` | A6 à A10 | [ ] |

### A1. Signes du mode Tokens et de la revue

Fichiers : `packages/kit/src/referentiel/signes.ts`, `packages/kit/tests/signes.test.ts`.

- [ ] A1.1 Ajouter la famille `rubrique-tokens` (« Rubrique du mode Tokens », teinte `tokens`).
- [ ] A1.2 Y définir `nom`, `valeurs`, `couches`, `types`, `rangement`, avec les tracés de la section 8 de la maquette
  (`NOUVEAUX` dans MAQUETTE-FIABILISATION.html).
- [ ] A1.3 Y reprendre `a-creer` (Variables manquantes), `cran` (Crans), `rompue` (Alias), `mode` (Modes), `scope` (Scopes) dans
  `REPRISES_DE_SIGNES`.
- [ ] A1.4 R-5 : remplacer le tracé de `information` par le rond à « i » de la maquette. R-6 : remplacer la corbeille d'`ignore` par
  l'œil barré.
- [ ] A1.5 Monter la version du kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. `svgDuSigne` rend les 5 signes nouveaux. Les 10 catégories ont un signe.

### A2. Un tracé, une définition

R-7. Fichiers : `signes.ts`, `packages/plugin-architect/src/ui/composant/signes.ts`, les lecteurs de `prop-boolean`, `prop-text`,
`prop-slot` (`git grep`).

- [ ] A2.1 `prop-boolean`, `prop-text` et `prop-slot` deviennent des reprises de `type-boolean`, `text` et `slot` dans la famille
  `property`, avec leur libellé actuel.
- [ ] A2.2 Remplacer chaque lecture des trois identifiants retirés par l'identifiant repris et l'option `famille: 'property'` de
  `creerSigne`.
- [ ] A2.3 Ajouter à `signes.test.ts` le test qui refuse deux signes au même tracé non vide.
- [ ] A2.4 Monter la version du kit.

Fin : le test du tracé unique passe. `npm run test:paquet -- architect` passe. La galerie du mode Composant ne change pas au pixel près.

### A3. Familles des icônes d'interface

Fichiers : `signes.ts`, `signes.test.ts`, `packages/kit/src/referentiel/signaux.ts` (`TYPES_D_ALERTE`).

Le relevé des icônes liste 31 icônes en SVG et 26 glyphes hors du kit. Chaque famille ci-dessous les reçoit. `SigneDuLangage` gagne
`grille` (12, 16, 44×28), quand le tracé n'est pas sur 16.

- [ ] A3.1 Famille `alerte`, sans teinte : les cinq formes de `plugin-socle/src/ui/Alerte.ts` (`FORMES`), sur leur grille de 12, avec la
  partie à l'encre (`encre: 'trait' | 'plein'`).
- [ ] A3.2 Famille `interface`, sans teinte : chevron (un tracé, quatre sens par rotation), fermer (`×`), lien externe, réglages,
  poignée de taille, loupe, tout replier, panneau latéral, synchroniser, menu (`⋯`), ajouter (`+`), retirer (`−`), avant-après (`→`),
  séparateur de chemin (`›`), différent (`≠`), vide (losange en tirets de la vue Composant).
- [ ] A3.3 Famille `type-de-terme`, teinte `regles` : les six icônes de Nomenclature. R-1 `palette` reprend `palette`. R-2 `composant`
  reprend `component`. R-3 `a-trancher` reprend `question`, en ambre. R-4 `conforme` reprend `applique`. `remplace` et `sans-regle` sont
  définis ici.
- [ ] A3.4 Famille `verdict-palettes`, teinte `couleurs` : `butee` (`⊣`), `reference` (`◆`), `confondus` (`≈`). Les verdicts `✓`, `!`,
  `✗` de Palettes reprennent `tenu`, `corriger` et `bloquant` de la famille `alerte`.
- [ ] A3.5 Famille `pictogramme-palettes`, grille 44×28 : les 11 glyphes de carte de `plugin-palettes/src/ui/glyphes.ts`.
- [ ] A3.6 Champ `texte` de `TYPES_D_ALERTE` : le glyphe d'une sortie texte (`✓`, `⚠`, `✗`, `ℹ`) et l'emoji d'un commentaire de forge
  (`✅`, `⚠️`, `❌`, `ℹ️`).
- [ ] A3.7 Monter la version du kit.

Fin : chaque icône du relevé a une ligne dans le kit, définie ou reprise. `npm run test --workspace @ucm-kit/core` passe.

### A4. Documentation d'emploi et vue illustrée

Fichiers : `signes.ts`, `signes.test.ts`, `packages/kit/invariants/referentiel.md`,
`docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel.ts` et sa vue. Charger `rediger-pour-agents` avant
l'invariant.

- [ ] A4.1 Chaque signe porte `emploi` : quand l'employer, et le signe à prendre à sa place quand il ne convient pas.
- [ ] A4.2 Chaque famille porte `pose` : la fonction du socle qui la pose (`creerSigne`, `creerIcone`, `creerChevron`), les tailles
  admises, la règle de teinte (`informe`) et le nom accessible attendu.
- [ ] A4.3 `signes.test.ts` refuse un `emploi` ou une `pose` vide.
- [ ] A4.4 La vue illustrée gagne une page « Signes et icônes » : chaque famille, chaque signe en trois tailles, son sens, son emploi,
  ses reprises. `npm run vues` la régénère.
- [ ] A4.5 Une ligne de `referentiel.md` : une icône d'interface se définit dans `signes.ts`, et un paquet la pose par le socle.

Fin : la page montre toutes les icônes du kit. Le test de fraîcheur de la vue passe.

### A5. Le socle lit le kit

Fichiers : `packages/plugin-socle/src/ui/Alerte.ts`, `Chevron.ts`, `EnTete.ts`, `ResizeGrip.ts`, `Feuille.ts`, `Filtre.ts`, `Jeton.ts`,
`Changement.ts`, `Signe.ts`, `socle.css`.

- [ ] A5.1 `creerIcone` lit la famille `alerte`. `creerChevron`, l'engrenage, la poignée, le lien externe lisent la famille `interface`.
- [ ] A5.2 Une fonction `creerGlyphe(id)` pose `×`, `→`, `✓` et les autres glyphes de la famille `interface`.
- [ ] A5.3 Le chevron de `select.input` (data URI de `socle.css`) reste en CSS. Un test compare son tracé à celui du kit.

Fin : `npm run test:paquet -- socle` passe. La galerie de chaque plugin ne change pas au pixel près.

### A6. Architect lit le kit

Fichiers : `src/ui/nomenclature/icones.ts`, `src/ui/barre.ts`, `src/ui/arbre.ts`, `src/ui/vues/composant.ts`, les fichiers de glyphes du
relevé (`aTrancher.ts`, `aAppliquer.ts`, `historique.ts`, `feuilles.ts`, `regles.ts`, `questions.ts`, `questions/index.ts`,
`questions/modele.ts`, `preparation/`, `textes/composant.ts`, `textes/preparation.ts`).

- [ ] A6.1 `creerIconeDeType` lit la famille `type-de-terme`. `TRAITS` disparaît.
- [ ] A6.2 Le panneau latéral, tout replier, la loupe et le losange vide lisent la famille `interface`.
- [ ] A6.3 Chaque glyphe du relevé passe par `creerGlyphe`, ou par la constante du kit dans un texte.
- [ ] A6.4 Mettre à jour `CARTE.md` d'Architect.

Fin : `npm run test:paquet -- architect` passe. Les écarts de galerie se limitent à R-1 à R-6.

### A7. L'exporteur lit le kit

Fichiers : `packages/plugin-exporter/src/ui/styles.css` (`.carte-chevron`), `src/depot.ts:253`.

- [ ] A7.1 La carte pose `creerChevron` au lieu du masque CSS.
- [ ] A7.2 Le commentaire de demande de fusion lit le champ `texte` de `TYPES_D_ALERTE`.

Fin : `npm run test:paquet -- exporter` passe.

### A8. Palettes lit le kit

Fichiers : `ligneFixe.ts`, `harmonisation/carteComparaison.ts`, `selecteur.ts`, `piedDeLaPalette.ts`, `ongletHarmonisation.ts`,
`vueDuBilanDesPalettes.ts`, `menuPalette.ts`, `glyphes.ts`, `connexion.ts`, `ajustement.ts`, `traceDesCourbes.ts`, `garanties.ts`,
`nuancier.ts`, `ongletCreation.ts`, `i18n/fr.ts`, `i18n/en.ts`, `styles.css`, tous sous `packages/plugin-palettes/src/`.

- [ ] A8.1 Verdicts et lignes fixes : familles `alerte` et `verdict-palettes`.
- [ ] A8.2 Pictogrammes de carte : famille `pictogramme-palettes`. `GLYPHES` disparaît.
- [ ] A8.3 Chevrons CSS, menu, synchroniser, `＋`, `−`, `›` : famille `interface`.
- [ ] A8.4 `◆` et `≈` dans les textes : constantes du kit.

Fin : `npm run test:paquet -- palettes` passe. La galerie de Palettes ne change pas au pixel près.

### A9. Le hub lit le kit

Fichiers : `packages/hub/src/vues/page.ts` (`ICONES`).

- [ ] A9.1 `info`, `succes`, `alerte`, `coche` reprennent la famille `alerte`. `fleche` et `fermer` reprennent la famille `interface`.
- [ ] A9.2 `npm run vues`.

Fin : `npm run test:paquet -- hub` passe, et la vue du hub est à jour.

### A10. Glyphes des sorties texte

Fichiers : `packages/kit/src/lecteurs/diagnostic-markdown.mjs`, `verdict-bilan.mjs`, `controle-repository.mjs`,
`packages/cli/src/aides.mjs`, `packages/cli/src/init.mjs`, `packages/adapter-typescript/src/generation.mjs`.

- [ ] A10.1 Remplacer chaque glyphe littéral par le champ `texte` du type d'alerte qu'il dit.

Fin : les sorties texte ne changent pas. Les tests du kit, du CLI et de l'adaptateur passent.

### A11. Test de la loi des icônes

Fichier : `tests/iconesDuKit.test.ts` (racine).

- [ ] A11.1 Le test parcourt `packages/*/src/` et refuse un tracé SVG (`<path`, `d:` dans une table, `createElementNS` d'un `svg`) ou un
  glyphe de la famille `interface` écrit hors de `signes.ts` et des fonctions de pose du socle.
- [ ] A11.2 Une exception se déclare dans le test avec son motif (le data URI de `socle.css`).

Fin : le test passe sur `main` et échoue sur un tracé ajouté à la main dans un fichier d'essai.

## Phase B. Mode Composant

| Lot | Agent | Dépend de | Section | État |
|---|---|---|---|---|
| B1 Corrections décochées | `implementeur` | rien | 2 | [ ] |
| B2 Ignorer sur les cartes de règles | `implementeur` | B1 | 2 | [ ] |
| B3 Ignorer une question | `implementeur-exigeant` | B2 | 3 | [ ] |
| B4 Analyse périmée | `implementeur` | B1 | 4 | [ ] |
| B5 Tous les constats ignorés | `implementeur` | B3 | 5 | [ ] |
| B6 Analyse partielle | `implementeur-exigeant` | B4 | 6 | [ ] |
| B7 Demande refusée pendant une écriture | `implementeur` | B4 | 7 | [ ] |

### B1. Corrections décochées

E-34. Fichiers : `src/ui/corrections/index.ts`, `src/ui/panneau/rendu.ts`, `src/ui/textes/`, la galerie.

- [ ] B1.1 Toutes les cases arrivent décochées. Le pied dit « Aucune correction cochée » et Appliquer tout est inactif.
- [ ] B1.2 « Tout cocher » et « Tout décocher » sous la bande de chaque section qui a des cases.
- [ ] B1.3 « Tout cocher » global, à gauche d'Appliquer tout.
- [ ] B1.4 Tests : aucun cochage à l'arrivée, un cochage par section, le compte du pied.

### B2. Ignorer sur les cartes de règles

N-86. Fichiers : `src/ui/panneau/rendu.ts`, `src/ui/panneau/informations.ts`, `src/sandbox/ignores.ts`, `src/ui/ignores/`.

- [ ] B2.1 Les cartes C43, C45 `sans-regle` et C45 `sans-valeur` reçoivent Ignorer et « Ne plus proposer », comme une carte À faire.
- [ ] B2.2 Test : la carte ignorée passe dans les ignorés, et « Ne plus ignorer » la rend.

### B3. Ignorer une question

E-35. Fichiers : `src/ui/questions/index.ts`, `src/ui/ignores/modele.ts`, `src/sandbox/ignores.ts`, `src/messages/`.

- [ ] B3.1 Une carte de question reçoit Ignorer (pour le fichier) et « Ne plus proposer » (pour la proposition), avant « Plus tard »
  (pour la session).
- [ ] B3.2 La clé d'Ignorer d'une question se range comme celle d'un constat. Le sandbox la relit à l'analyse suivante.
- [ ] B3.3 Tests : la question ignorée ne revient pas à l'analyse suivante, « Plus tard » ne dure que la session.

### B4. Analyse périmée

E-38. Décision provisoire de QV-2. Fichiers : `src/ui/analyse/index.ts`, `src/ui/composant/analyse.ts`, `src/ui/corrections/index.ts`.

- [ ] B4.1 La note périmée reste en tête : « Les constats datent d'avant le changement. Cliquez Actualiser pour relire. »
- [ ] B4.2 La liste reste lisible. Les cases, Ignorer et Appliquer tout sont inactifs jusqu'à Actualiser.
- [ ] B4.3 Tests : la liste survit à `perimee`, aucun geste n'est envoyé.

### B5. Tous les constats ignorés

N-77. Fichiers : `src/ui/analyse/index.ts`, `src/ui/panneau/rendu.ts`.

- [ ] B5.1 Le panneau dit « Aucun constat visible, N ignorés. » et garde la liste des ignorés avec « Ne plus ignorer ».
- [ ] B5.2 Test : ignorer le dernier constat garde la liste des ignorés.

### B6. Analyse partielle

E-31, E-32, N-85. Fichiers : `src/sandbox/analyse.ts`, `src/messages/analyse.ts`, `src/ui/analyse/index.ts`, `src/ui/textes/`.

- [ ] B6.1 Le message de fin porte la liste des causes : variants non lus, règles illisibles, niveau illisible, ignorés illisibles.
- [ ] B6.2 Une lecture refusée des règles, du niveau ou des ignorés rend l'analyse partielle.
- [ ] B6.3 La bannière liste une ligne par cause et ne dit jamais « N lus sur N ».
- [ ] B6.4 Une analyse partielle ne montre aucune section tenue.
- [ ] B6.5 Tests de chaque cause et de leur cumul. Rejouer `npm run stress:analyse` sur les séries D1 à D6.

### B7. Demande refusée pendant une écriture

N-80, E-39. Fichiers : `src/ui/analyse/index.ts`, `src/ui/corrections/index.ts`, `src/messages/analyse.ts`.

- [ ] B7.1 La réponse `occupe` montre l'alerte « Une opération est déjà en cours. L'écriture continue. Actualisez quand elle est finie. »
- [ ] B7.2 Appliquer tout reste inactif jusqu'à la fin de l'écriture.
- [ ] B7.3 Test : Actualiser pendant une écriture ne réactive pas Appliquer tout.

## Phase C. Mode Tokens en deux onglets

Option B de la section 1. Les cartes de Nomenclature gardent la forme validée du tour 3. Les catégories sont, dans l'ordre : Noms,
Variables manquantes, Crans, Alias, Modes, Valeurs, Couches, Types, Rangement, Scopes.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| C1 Modèle des catégories | `implementeur` | A1 | [ ] |
| C2 Coquille à deux onglets, sommaire et sections | `implementeur-exigeant` | C1 | [ ] |
| C3 Section Noms | `implementeur-exigeant` | C2 | [ ] |
| C4 Sections de structure | `implementeur` | C2 | [ ] |
| C5 Cochage et Appliquer commun | `implementeur-exigeant` | C3, C4 | [ ] |
| C6 Galerie et SPEC | `implementeur` | C5 | [ ] |

### C1. Modèle des catégories

Fichiers : nouveau `src/ui/tokens/categories.ts`, `src/ui/structure/lecture.ts` (`GROUPES`), test.

- [ ] C1.1 Une fonction pure range les cartes de Nomenclature, les constats de structure et les corrections de scopes dans les 10
  catégories, avec le signe de chacune (A1) et son nombre.
- [ ] C1.2 Une catégorie sans constat est tenue. Une analyse partielle n'a aucune catégorie tenue.
- [ ] C1.3 Tests sur les états de galerie `a-appliquer`, `t-integrite-a-faire`, `t-structure`.

### C2. Coquille à deux onglets, sommaire et sections

Fichiers : `src/ui/nomenclature/coquille.ts`, `src/ui/structure/index.ts`, `src/ui/panneau/rendu.ts` (puces et bandes à réutiliser),
`src/ui/textes/`.

- [ ] C2.1 Deux onglets, Constats et Règles. Le compte de Constats est le total.
- [ ] C2.2 Le sommaire du mode Composant : Tout, une puce par catégorie, la puce Questions (signe `question`).
- [ ] C2.3 Une section repliable par catégorie, avec la bande, le signe en teinte `tokens` et le nombre.
- [ ] C2.4 Reproduire le cadre « Proposé » de la section 1 au pixel près, à 680 px.

### C3. Section Noms

Fichiers : `src/ui/nomenclature/aAppliquer.ts`, `aTrancher.ts`, `renommages.ts`, `lignes.ts`, `src/ui/virtualisation.ts`.

- [ ] C3.1 Les questions vont en tête de la section, avec Ignorer, « Ne plus proposer » et « Plus tard ».
- [ ] C3.2 Les cartes de renommage suivent, dans leur forme du tour 3.
- [ ] C3.3 Au-delà de 20 cartes, la section arrive repliée. Ouverte, la liste est virtualisée (`creerListeVirtuelle`).

### C4. Sections de structure

Fichiers : `src/ui/structure/aFaire.ts`, `src/ui/structure/corrections.ts`, `src/ui/structure/carte.ts`.

- [ ] C4.1 Chaque carte À faire va dans la section de son groupe, avec son menu Ignorer actuel.
- [ ] C4.2 Les corrections de structure (Variables manquantes, Crans, Modes, Scopes) vont dans leur section, avec leurs cases.
- [ ] C4.3 Les ignorés gardent leur intertitre en fin de liste.

### C5. Cochage et Appliquer commun

Fichiers : `src/ui/nomenclature/aAppliquer.ts`, `src/ui/structure/corrections.ts`, `src/ui/structure/index.ts`, `src/messages/`.

- [ ] C5.1 Toutes les cases arrivent décochées. « Tout cocher » et « Tout décocher » par section, « Tout cocher » global.
- [ ] C5.2 Un seul pied compte toutes les cases cochées. Appliquer envoie les renommages, puis les corrections de structure par
  identifiant de variable, que le sandbox relit avant d'écrire.
- [ ] C5.3 Tests : l'ordre des deux écritures, un échec de la première arrête la seconde.

### C6. Galerie et SPEC

- [ ] C6.1 États de galerie du mode Tokens à deux onglets : liste longue, toutes catégories tenues, analyse partielle.
- [ ] C6.2 `packages/plugin-architect/SPEC.md` et `CARTE.md` décrivent les deux onglets.

## Phase D. Vitesse du mode Tokens

Le mode Composant est passé de 14,2 s à 5 s à froid sur le Button, et à 2 s après prélecture. Aucune de ses techniques ne sert au mode
Tokens. Actualiser lit toutes les variables locales deux fois (`lire-releve`, puis `lire-structure`), et Nomenclature les lit une
troisième fois. Ignorer et Appliquer relisent toute la structure. Aucune durée du mode Tokens n'est mesurée. Les cibles se fixent après D0.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| D0 Mesure de référence | `implementeur` | rien | [ ] |
| D1 Une acquisition par Actualiser | `implementeur-exigeant` | D0 | [ ] |
| D2 Lectures groupées | `implementeur` | D1 | [ ] |
| D3 Coûts algorithmiques du kit | `implementeur` | D0 | [ ] |
| D4 Ignorer et Appliquer sans relecture complète | `implementeur-exigeant` | D1 | [ ] |
| D5 Prélecture à l'ouverture | `implementeur` | D1 | [ ] |
| D6 Listes virtualisées | `implementeur` | C3, C4 | [ ] |
| D7 Mesure finale | `verificateur`, puis le mainteneur | D1 à D6 | [ ] |

### D0. Mesure de référence

Fichiers : `src/lecture.ts` (`mesurerLePortDeLecture`), `src/sandbox/arbre.ts`, `src/sandbox/structure.ts`,
`src/nomenclature/session.ts`, `src/sandbox/capture.ts`, `src/ui/telechargement.ts`.

- [ ] D0.1 Chaque phase (`lire-releve`, `lire-structure`, `rafraichir` de Nomenclature, contrôles du kit, rendu) donne sa durée et ses
  compteurs d'appels à l'API.
- [ ] D0.2 « Télécharger le rapport d'analyse » couvre le mode Tokens.
- [ ] D0.3 Un banc hors Figma chronomètre `controlerLeCatalogue` et `controlerLIntegriteUcm` sur les fichiers de
  `_local/stress/rejeu-fichiers/` (`npm run stress:rejeu`).
- [ ] D0.4 Écrire la mesure de référence dans MESURE-DES-FAILLES.md. Le mainteneur donne la durée dans Figma sur son plus gros fichier.

### D1. Une acquisition par Actualiser

Fichiers : `src/sandbox/arbre.ts`, `src/sandbox/structure.ts:65-71`, `src/lecture.ts:486-512`, `src/nomenclature/lectureFigma.ts`,
`plugin-socle/src/inventaireDeNoms.ts`, `plugin-socle/src/composant/analyse/ressources.ts`.

- [ ] D1.1 Le sandbox garde le relevé lu par `lire-releve`, avec sa date, jusqu'à la prochaine écriture (`perimerApresUneEcriture`).
- [ ] D1.2 `lire-structure` part de ce relevé : `valuesByMode`, `resolvedType` et `scopes` viennent des objets déjà lus, sans
  `getVariableByIdAsync` par variable (technique 16.8).
- [ ] D1.3 Nomenclature lit son inventaire dans la même acquisition.
- [ ] D1.4 Test d'égalité : les constats de structure et les cartes de Nomenclature sont identiques avant et après, sur les fixtures et
  sur le rejeu des fichiers réels.

### D2. Lectures groupées

Fichiers : `src/lecture.ts:370-464`, `src/sandbox/structure.ts:74`, `src/ecriture/ignores.ts:32`.

- [ ] D2.1 `lireLesBasesDesExtensions` passe par `executerAuPlus`.
- [ ] D2.2 Les cibles d'alias distantes essaient `getVariableByIdAsync` avant l'import par clé, et les imports respectent
  `IMPORTS_EN_VOL`.
- [ ] D2.3 Le réglage d'écriture, les clés d'Ignorer et le vocabulaire se lisent une fois par acquisition (technique 16.12).

### D3. Coûts algorithmiques du kit

Fichiers : `packages/kit/src/controles/structure.ts`, `packages/kit/src/controles/integrite.ts`, tests du kit. Lire
`5 Vitesse de l'analyse/lots/LOT-04.md` d'abord.

- [ ] D3.1 `controlerLesAliasesManquants` indexe les variables au lieu d'un `find` dans la boucle (variable × mode).
- [ ] D3.2 `lesJumelles` se calcule une fois par préfixe et par mode.
- [ ] D3.3 Le banc de D0.3 donne la durée avant et après. Les constats sont identiques (propriétés R1 et R2 du rejeu).
- [ ] D3.4 Monter la version du kit.

### D4. Ignorer et Appliquer sans relecture complète

Fichiers : `src/sandbox/structure.ts:126-193`, `src/ui/structure/index.ts:112`.

- [ ] D4.1 Ignorer et « Ne plus ignorer » refiltrent les constats gardés, sans relire Figma.
- [ ] D4.2 Après Appliquer, le sandbox relit seulement les variables écrites et leurs alias, puis relance les contrôles du kit.
- [ ] D4.3 Tests : mêmes constats qu'une relecture complète après chaque geste.

### D5. Prélecture à l'ouverture

Fichiers : `src/code.ts`, `src/sandbox/prelecture.ts`, `src/ui/index.ts:451`.

- [ ] D5.1 L'acquisition du mode Tokens part à l'ouverture du plugin, en cédant la main (budget de 50 ms, technique 16.11).
- [ ] D5.2 Une demande du mode Composant passe avant elle.

### D6. Listes virtualisées

Fichiers : `src/ui/structure/aFaire.ts:227-239`, `src/ui/structure/corrections.ts:325-345`, `src/ui/virtualisation.ts`.

- [ ] D6.1 Une section de plus de 50 cartes se virtualise. Le rendu ne crée que les cartes visibles.

### D7. Mesure finale

- [ ] D7.1 Le `verificateur` rejoue le banc de D0.3 et écrit les durées dans MESURE-DES-FAILLES.md.
- [ ] D7.2 Le mainteneur mesure Actualiser, Ignorer et Appliquer dans Figma sur le fichier de D0.4.

## Phase E. Corrections tirées des réponses V2

Chaque décision de [QUESTIONS-V2.html](./QUESTIONS-V2.html) (archive « Questions tranchées ») et chaque écart de
[MESURE-DES-FAILLES.md](./MESURE-DES-FAILLES.md) a une case ci-dessous. Une case cite la question ou l'écart, et l'agent relit la
décision dans la page avant d'écrire. Toutes les questions sont tranchées, sauf QV-5 reportée à la recette.

Règles propres à la phase E :

- La conversation principale écrit les textes destinés au designer avant de confier un lot, avec la skill `rediger-diagnostics-ucm`, et
  les met dans la note du lot. Aucun texte ne dit « peinture » ni « mélange » (Q-F7-14).
- Toute proposition arrive décochée (Q-F2). Une correction n'est cochable que si elle est exacte, avec une règle écrite et un seul
  candidat. Sinon c'est une question.
- Un exemple, un test ou une fixture écrit un variant en toutes lettres (`Size=Small`) et un token en abréviation (`sm`) (Q-F5-6).
- Les tests `todo` d'un écart (Q-F2-9) passent dans le lot qui le corrige. Le lot retire le `todo`.
- La fin d'un lot se lit sur son harnais, dont la cible est celle de la section « Cibles » de MESURE-DES-FAILLES.md. Un `verificateur`
  lance le harnais et rend les nombres.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| E1 Définitions communes du référentiel | `implementeur-exigeant` | A1 | [ ] |
| E2 Noms de Nomenclature (F1) | `implementeur-exigeant` | E1 | [ ] |
| E3 Structure du mode Tokens, kit (F2) | `implementeur-exigeant` | E1 | [ ] |
| E4 Structure du mode Tokens, écrans et écritures (F2) | `implementeur` | E3, C4 | [ ] |
| E5 Liaisons du composant (F3) | `implementeur-exigeant` | E1 | [ ] |
| E6 Tailles du composant (F4) | `implementeur` | E5 | [ ] |
| E7 Variants et noms des tokens du composant (F5) | `implementeur-exigeant` | E1 | [ ] |
| E8 Typographie et icônes (F6) | `implementeur-exigeant` | E1, E7 | [ ] |
| E9 Accessibilité (F7) | `implementeur-exigeant` | E1 | [ ] |
| E10 Règles d'usage et moteur (F8) | `implementeur-exigeant` | B2 | [ ] |
| E11 Lecture et états de l'analyse (F9) | `implementeur-exigeant` | B6, B7 | [ ] |
| E12 Rejeu complet et cibles | `verificateur`, puis la conversation principale | E2 à E11 | [ ] |

### E1. Définitions communes du référentiel

Plusieurs contrôles lisent chacune de ces définitions. Elles vont dans `packages/kit/src/referentiel/`, et chaque lecteur les importe.
Fichiers : `vocabulaire.ts`, `ecriture-des-mots.ts`, `architecture.ts`, `conventions.ts`, `packages/kit/src/controles/nommage.ts`
(`axeDePropriete`), `mapping.ts` (`estUneIcone`), `typographie.ts` et `accessibilite.ts` (`estIcone`, `NOM_D_ANNEAU`), les tests du kit.

- [ ] E1.1 Écriture d'une valeur de variant (Q-F5-5, Q-F5-6). Le variant s'écrit en toutes lettres, avec une majuscule à chaque mot
  (`Small`, `Extra Large`, `Danger`). Le token s'écrit en minuscules et en abréviation (`sm`, `xl`, `danger`). Une table du kit passe de
  l'un à l'autre. `S`, `M`, `L`, `sm` et `Middle` dans un variant ont une correction vers le mot entier.
- [ ] E1.2 Rôle d'un nom d'axe (Q-F5-1, Q-F5-9, E-27). `Type`, `Kind` et `Shape` pilotent le style. `Density` et `Spacing` pilotent la
  taille. Un nom français prend le rôle de son équivalent anglais et reçoit un renommage vers l'anglais. Un interrupteur oui ou non n'est
  pas un axe.
- [ ] E1.3 Définition unique d'une icône (Q-F6-3, Q-F3-4, Q-F6-4, E-26). L'instance d'un composant `Icon` est le cas principal. Puis
  une instance qu'une propriété INSTANCE_SWAP pilote, dont la propriété ou le layer porte un mot d'icône, ou un VECTOR ou
  BOOLEAN_OPERATION dont le nom contient le mot entier `icon`, `icône`, `glyph`, `pictogram` ou `symbol`. Un FRAME ou un TEXT n'est jamais
  une icône. Les trois fonctions `estUneIcone` et `estIcone` disparaissent au profit de celle du kit.
- [ ] E1.4 Définition d'un anneau (Q-F7-9). Un layer lié à un token de rôle `ring`, ou nommé `Ring` ou `Focus ring`. `NOM_D_ANNEAU`
  passe dans le référentiel.
- [ ] E1.5 Rôles qui désignent un layer (Q-F3-3). `divider` (noms `Divider`, `Separator`), `ring` (noms `Ring`, `Focus ring`) et `icon`
  (instance d'`Icon`). Les autres rôles ne regardent pas le nom.
- [ ] E1.6 Segment d'une valeur à point ou à barre (Q-F5-10). Le point et la barre deviennent un tiret (`16-9`, `1-5`).
- [ ] E1.7 Monter la version du kit.

Fin : chaque définition a un test. `git grep` ne trouve plus de seconde définition d'icône ni d'anneau. `npm run test --workspace
@ucm-kit/core` passe.

### E2. Noms de Nomenclature (F1)

Fichiers : `packages/kit/src/referentiel/questions.ts`, `termes-connus.ts`, `normalisation.ts`, `harmonisation.ts`,
`vocabulaire-du-fichier.ts`, `packages/plugin-architect/src/nomenclature/`, `packages/kit/tests/stress/f1-noms/donnees/`,
`packages/kit/tests/stressF1Regressions.test.ts`. Lire PLAN-STRESS-F1-NOMS.md, sections 1, 4 et 8.

- [ ] E2.1 Dictionnaire (Q-F6). La conversation principale classe les listes de candidats du lot 1 dans `formes.json` et
  `synonymes.json`. Le mainteneur ne relit aucun JSON. Un couple qu'elle ne sait pas classer reste hors du dictionnaire.
- [ ] E2.2 Question « même mot ou deux mots ? » de Nomenclature pour ce couple. La réponse du designer se range dans le vocabulaire du
  fichier, et la question ne revient pas.
- [ ] E2.3 Règle des fautes. Une faute n'a plus besoin de partager une place (E-05), ni d'une référence vue dans 5 noms (E-01). Une
  faute vue dans 3 noms ou plus reste vue (E-02). L'échange de deux lettres est une faute (E-03). Deux mots hors vocabulaire à une lettre
  donnent une question, le plus fréquent en premier (Q-F1). Une faute d'un seul nom va dans Questions (Q-F3).
- [ ] E2.4 Fautes à deux lettres (Q-F9). Elles donnent une question, seulement pour un mot au-dessus du seuil de longueur.
- [ ] E2.5 Seuils (Q-F4). `npm run stress:f1 -- --faux-positifs` mesure la courbe. Le seuil d'une lettre et celui de deux lettres sont
  les plus petites longueurs à moins d'un faux positif pour 1 000 noms justes. Les valeurs vont dans le kit.
- [ ] E2.6 Formes tolérées et synonymes. Une forme tolérée bloquée par collision pose une question (E-08). Les blocs gardés entiers
  (E-09), les pluriels (E-10), les termes de `REGISTRES_COMPOSANTS` (E-04) et une référence tolérée (N-02) sont lus. Les synonymes
  viennent de `synonymes.json` au lieu des 9 groupes en dur (E-11). Un synonyme seul donne une question si son terme UCM est unique
  (Q-F5).
- [ ] E2.7 Une collection à une lettre d'une collection UCM (`thme`) propose cette collection en question (Q-F8, E-15). Une référence
  inconnue se replie au lieu de bloquer (E-06). La conversion par `couche` reste (Q-F10).
- [ ] E2.8 Le renommage est idempotent (N-01). Les 720 cas de casse sont expliqués, puis corrigés côté kit ou côté oracle (N-03).
- [ ] E2.9 Branches parallèles au-delà de 12 branches (E-45).
- [ ] E2.10 Monter la version du kit. Les tests `todo` de F1 passent.

Fin : `npm run stress:f1` détecte 90 % des attendus hors S4, S3 compris après E2.4, avec 0 faux positif sur les 15 design systems. Avec
`--slice`, 190 fautes sur 209 et 40 inversions sur 40. Un second passage ne renomme rien.

### E3. Structure du mode Tokens, kit (F2)

Fichiers : `packages/kit/src/controles/integrite.ts`, `theme.ts`, `structure.ts`, `catalogue.ts`, leurs tests,
`packages/kit/tests/stress/f2-structure/`. Lire PLAN-STRESS-F2-STRUCTURE.md, sections 3 et 8.

- [ ] E3.1 Rôles proches (Q-F2-1, E-19). Un dernier segment proche d'un rôle du même dossier donne une question, au lieu de créer le
  rôle absent. Une variable loin de tout rôle ne donne rien.
- [ ] E3.2 Sens de la palette (Q-F2-3, N-25, N-27). Le sens se lit sur les rôles non dégradés. Un sens partagé ou un `solid/foreground` à
  contre-sens donne une question à deux réponses, sans correction. C60 lit le sens.
- [ ] E3.3 Modes (Q-F2-4, N-24, N-26, E-20). C60 trouve la branche dans le chemin (`primary/dark/300`) et dans les modes de la cible. Un
  alias vers l'autre branche au cran de son propre mode a la correction vers la bonne branche. Toute question C60 a un genre.
- [ ] E3.4 Palette voisine (Q-F2-2). Un rôle aliasé vers la rampe d'une autre palette donne une question sans présélection.
- [ ] E3.5 Doublons. Deux collections `theme` donnent un constat À faire (Q-F2-5, à rapprocher de Q-86). Un rôle présent deux fois est
  jugé pour ses deux variables (N-29) et reçoit la question de fusion de Q-F2-6 (écriture en E4.4).
- [ ] E3.6 Doublons d'échelle (Q-F2-8, N-33). Les alias se résolvent avant la comparaison, pour toutes les échelles, à 1e-6 près. Sans
  library choisie, une cible inaccessible donne une information.
- [ ] E3.7 Alias de mode de C63 `theme` (Q-F3-5, N-16). La cible est le cran de la configuration d'UCM Palettes pour ce rôle et ce mode.
  Vérifier d'abord que la recette rangée par Palettes (`figma.root`, espace `ucm_palettes`, clé `recette`) donne ce cran. Si elle ne le
  donne pas, rendre la question à la conversation principale. Sans recette, la table UCM du kit sert.
- [ ] E3.8 Regroupement des C82 `couche` (QV-3, N-87). Une carte par couple de collections et par couche visée, avec le nombre de
  variables et de modes.
- [ ] E3.9 Thème non reconnu (QV-4, N-88). Une information dit qu'aucune collection n'est reconnue comme `theme`.
- [ ] E3.10 Écarts restants. N-08, N-15, N-28 (voisine choisie par le dernier segment), N-30 (collection dans l'identifiant), N-31
  (variable non chargée), N-32 (scopes des FLOAT).
- [ ] E3.11 Monter la version du kit. Les tests `todo` de F2 passent.

Fin : `npx tsx packages/kit/tests/stress/f2-structure/mesurer.ts` donne 100 % des attendus, 0 faux constat et 0 correction inexacte.
`npm run stress:rejeu` donne au plus une carte par couple de collections pour une même couche, et R2, R3, R5 restent à 100 %.

### E4. Structure du mode Tokens, écrans et écritures (F2)

Fichiers : `packages/plugin-architect/src/ui/structure/`, `src/sandbox/structure.ts`, `src/ecriture/`, `src/ui/textes/`, la galerie.

- [ ] E4.1 La question du sens décrit le rendu (Q-F2-3). « Garder le texte noir sur les boutons » ou « Passer au texte blanc ». Pour une
  palette partagée, un bouton et un encadré dessinés dans chaque couleur, jamais « sens normal » ni « sens inverse ».
- [ ] E4.2 Chaque motif de saut a un texte (E-24). Une lecture qui lève, un catalogue `null` ou un refus de Figma ne disent plus « Rien à
  régler » (E-23).
- [ ] E4.3 Ignorer la proposition d'un constat de scopes range le constat sous Ignorés (E-21).
- [ ] E4.4 Fusion de deux variables du même rôle (Q-F2-6, option C). Architect relie à la variable gardée chaque token et chaque layer du
  fichier, puis fait de l'autre un alias de la variable gardée, marquée à retirer. Un second constat propose de la retirer quand plus
  rien ne l'emploie.
- [ ] E4.5 La correction `alias-de-mode` part à l'écriture (E-28).
- [ ] E4.6 Carte groupée de QV-3, avec la liste des variables qui se déplie. Information de QV-4 en tête du mode Tokens.
- [ ] E4.7 États de galerie de chaque écran changé.

Fin : `npm run stress:structure` passe la chaîne de 28 cas sur 28. `npm run test:paquet -- architect` passe.

### E5. Liaisons du composant (F3)

Fichiers : `packages/kit/src/controles/corrections.ts`, `mapping.ts`, `propagation.ts`, `theme.ts`, `couche.ts`, leurs tests,
`packages/kit/tests/stress/f3-composant/`, `packages/plugin-architect/src/constatsDuMoteur.ts` (E5.8). Lire PLAN-STRESS-F3-F4-COMPOSANT.md,
sections 3 et 8.

- [ ] E5.1 Layers masqués (Q-F3-1). C25 et C29 jugent un layer masqué ou sous un ancêtre masqué. La carte dit que le layer est masqué.
  Une instance imbriquée reste une frontière (Q-F3-2).
- [ ] E5.2 C25 juge toute peinture sans token, pas seulement `title` (E-25, N-11). Il saute l'opacité 0 et la lecture mixte (N-12).
- [ ] E5.3 Nom et rôle (Q-F3-3, N-22). C24 lit la table de E1.5 dans les deux sens. La correction propose le token ou le nom, s'il est
  unique.
- [ ] E5.4 Propagation (Q-F3-6, Q-F3-7, N-09, N-10). Elle recopie seulement les tokens lisibles du composant. Une plage déjà liée ne
  donne pas de question. Un layer propre à un variant ne donne rien. Deux homonymes sous le même parent donnent une question.
- [ ] E5.5 Héritage (Q-F3-8, N-17). Une liaison héritée sans changement n'est jamais jugée. Une surcharge de l'hôte l'est.
- [ ] E5.6 Texte sur fond de page (Q-F3-9, Q-F3-10, N-13, N-14). C59 suit l'alias du token du composant jusqu'au thème. Sa correction
  vise le token du composant qui vise `page/foreground`. Une plage n'est énumérée qu'une fois.
- [ ] E5.7 Un constat par liaison (Q-F3-12, Q-F3-16, N-06). Palette et état faux donnent une carte, vers le token qui corrige les deux
  segments. Quand plusieurs constats visent la même liaison, celui qui porte la correction reste.
- [ ] E5.8 Doublon du kit et du moteur (Q-F3-17, Q-F89-12, E-30). Un point C30 tombe quand un C25 ou un C29 porte le même layer et le
  même champ. Ignorer le constat du kit fait taire le point.
- [ ] E5.9 Tokens d'icône (Q-F3-15, N-07). Un composant ne déclare plus de token d'icône. L'alias d'un token de composant vers un autre
  composant est un défaut. Les 3 fixtures qui emploient ce motif se mettent à jour.
- [ ] E5.10 Écarts restants. N-04 et N-05 (scopes `SHAPE_FILL` et `FRAME_FILL` de C18), N-21 (variable non chargée ou inaccessible).
- [ ] E5.11 Monter la version du kit. Les tests `todo` de F3 passent.

Fin : `npm run stress:composant` donne 185 sur 185 et 0 faux constat pour le kit, et la chaîne passe 65 cas sur 65.

### E6. Tailles du composant (F4)

Fichiers : `packages/kit/src/controles/corrections.ts` (C29), `candidatsDeLongueur.ts`, `structure.ts`, leurs tests,
`packages/kit/tests/stress/f3-composant/operateursTailles.ts`.

- [ ] E6.1 Égalité à 1e-6 px près. À égalité, les deux candidats sont montrés (Q-F3-11, N-18, N-19).
- [ ] E6.2 C29 lit la famille `sizes` et la propriété `border-radius`, et C8 demande l'harmonisation (Q-F3-13, N-20).
- [ ] E6.3 Un token de taille dont la valeur change entre Light et Dark donne un constat À faire. La carte demande quelle valeur garder,
  sans case cochée (Q-F3-14).
- [ ] E6.4 Monter la version du kit.

Fin : les cas Z1 à Z8 du harnais F3 sont à leur oracle.

### E7. Variants et noms des tokens du composant (F5)

Fichiers : `packages/kit/src/controles/nommage.ts`, `oublis.ts`, leurs tests, `packages/kit/tests/stress/f5-variants/`. Lire
PLAN-STRESS-F5-F6-VARIANTS-TYPO.md, sections 3 et 8.

- [ ] E7.1 Le nom de l'axe décide de son rôle, avant les termes d'un autre registre (Q-F5-2, N-36).
- [ ] E7.2 Deux valeurs renommées dans deux axes donnent C7 sans question (Q-F5-4). Les candidats ne comptent pas une valeur déjà
  présente (N-35).
- [ ] E7.3 Deux axes de style (Q-F5-3). Un constat À faire demande de les réunir en un seul axe (`Variant=Solid, Subtle, Outline`),
  sans fusion automatique. Les tokens du style `subtle` visent `surface/*` du thème, ceux du style `solid` visent `solid/*`, et un écart
  donne un constat.
- [ ] E7.4 Casse et forme (Q-F5-5, Q-F5-6, N-34, N-37). Le variant en toutes lettres correspond au token abrégé par la table de E1.1. C9
  reste pour une valeur inconnue. `Error` reçoit C8 vers `Danger`.
- [ ] E7.5 Au-delà de 4 096 combinaisons, une information donne le total et le nombre de variants. Sous la borne, 200 constats au plus,
  puis « et N autres » (Q-F5-7, E-44). Une valeur répétée ne donne qu'un C31 (N-38).
- [ ] E7.6 Un token au nom illisible donne C32 `nom-illisible` (Q-F5-8, N-39). C32 `inutilise` ne compte pas une liaison illisible
  (E-33). Une palette hors registre donne `sans-variant` (N-40).
- [ ] E7.7 Valeur à point ou à barre lue par E1.6 (Q-F5-10).
- [ ] E7.8 La matrice de 16 × 16 × 16 variants tient sous 2 secondes (N-41).
- [ ] E7.9 Monter la version du kit. Les tests `todo` de F5 passent.

Fin : `npx tsx packages/kit/tests/stress/f5-variants/mesurer.ts --famille F5` donne 100 % des attendus et 0 faux constat. Les 24 profils
muets le restent.

### E8. Typographie et icônes (F6)

Fichiers : `packages/kit/src/controles/typographie.ts`, `mapping.ts`, leurs tests, `packages/kit/tests/stress/f5-variants/typo/`,
`packages/plugin-architect/src/ui/textes/composant.ts`.

- [ ] E8.1 Icône (Q-F6-1, option A). C66 contrôle que l'icône est une instance d'`Icon`, que son remplissage suit le token de premier
  plan du composant (`button/color/primary/solid/foreground`), et que sa propriété `Size` suit la taille du variant. Les textes « Liez-la
  à une taille de layout/icon » changent.
- [ ] E8.2 Les `strokes` d'une icône à tracé tiennent lieu de couleur sans fill visible (Q-F6-5).
- [ ] E8.3 C64 compare les styles dans chaque valeur de l'axe de taille (Q-F6-2, N-42). Deux layers homonymes ne masquent pas leurs
  styles (N-44). Un texte à styles mixtes reçoit l'information `styles-mixtes` (Q-F6-6, N-43).
- [ ] E8.4 C65 couvre les huit champs de `CHAMPS_DE_TYPOGRAPHIE` (Q-F6-7).
- [ ] E8.5 Un slot sans mot d'icône n'est pas une icône, et C67 ne le compte pas (Q-F6-4).
- [ ] E8.6 Monter la version du kit.

Fin : `mesurer.ts --famille F6` donne 95 % des attendus et 0 faux constat.

### E9. Accessibilité (F7)

Fichiers : `packages/kit/src/controles/accessibilite.ts`, `packages/kit/src/emplois/`, leurs tests,
`packages/kit/tests/stress/f7-accessibilite/`, les textes de C49 à C53. Lire PLAN-STRESS-F7-ACCESSIBILITE.md, sections 3 et 8.

- [ ] E9.1 Composition et arrondi (Q-F7-1). Un fond de page ou d'élévation d'alpha inférieur à 1 donne `fond-indetermine`.
- [ ] E9.2 Opacités (Q-F7-2, N-48, N-57). L'alpha effectif multiplie ceux des ancêtres. Un layer d'alpha effectif nul n'est pas mesuré.
- [ ] E9.3 Grand texte gras à 56/3 px et 700 (Q-F7-3).
- [ ] E9.4 Fonds (Q-F7-4, N-45, N-47). Un frère plus bas qui couvre la boîte du texte est son fond. La visibilité suit chaque ancêtre.
- [ ] E9.5 Valeurs hors gamme (Q-F7-5, N-50, N-52). Un canal ou un alpha hors de [0, 1], ou NaN, donne `couleur-hors-gamut`.
- [ ] E9.6 Modes du thème au repli (Q-F7-6). Borne de 5 000 qui dit les variants non mesurés, sans collection inutile (Q-F7-11, N-61).
- [ ] E9.7 Garantie du thème (Q-F7-7, N-49). `corriger` seulement si la garantie vise le même type de seuil, le niveau demandé et ce fond.
- [ ] E9.8 Contours (Q-F7-8, N-63). Un contour sous 3:1 reste muet quand le remplissage du layer atteint 3:1.
- [ ] E9.9 Anneau par E1.4 (Q-F7-9, N-58, N-59). Un anneau rempli sans contour se mesure sur son remplissage.
- [ ] E9.10 Variants désactivés (Q-F7-10, N-51, N-55, N-60). `Disabled=True` et `Enabled=False` sont exclus, et `Survol` est une forme
  tolérée de `hover`.
- [ ] E9.11 Identifiant d'un constat de contraste sans plage ni niveau (Q-F7-12, N-62). Une plage vide ne donne rien (N-56).
- [ ] E9.12 Mode de fusion et flou d'arrière-plan (Q-F7-14, N-46). La limite dit « mode de fusion » pour un mode de fusion.
- [ ] E9.13 Lecture partielle (N-53, N-54). Un cycle de `parent` termine. C49 et C50 ne jugent pas ce qui n'a pas été lu.
- [ ] E9.14 Monter la version du kit. Les tests `todo` de F7 passent.

Fin : `npx tsx packages/kit/tests/stress/f7-accessibilite/mesurer.ts` donne 100 % des seuils S et G, 0 faux constat et 0 exception.

### E10. Règles d'usage et moteur (F8)

Fichiers : `packages/plugin-architect/src/regles.ts`, `src/constatsDuMoteur.ts`, `src/sandbox/analyse.ts`, `src/ui/panneau/`, leurs tests,
`packages/plugin-architect/scripts/stress/f8-analyse/`. Lire PLAN-STRESS-F8-F9-ANALYSE.md, sections 3 et 8.

- [ ] E10.1 Noms de règle (Q-F89-1, N-64, N-74). La comparaison retire espaces, tirets, soulignés, casse et suffixe `#1:2`.
- [ ] E10.2 Valeur inconnue (Q-F89-2, N-65). `Size.xxl` donne C45 `valeur-inconnue`. Une cible `@prop` vide donne `sans-propriete`
  (N-72). `@boolean` sur un axe donne un constat (N-73).
- [ ] E10.3 Conteneurs (Q-F89-5 à Q-F89-9, N-68 à N-70, E-30). Le scan reste sur la page du composant. Un conteneur vide est rempli. Deux
  noms compactés égaux donnent un constat. Le premier conteneur de la page l'emporte. Seule l'instance la plus proche compte. C43 et
  C44 ne sortent plus ensemble.
- [ ] E10.4 Points du moteur (Q-F89-10, Q-F89-11, E-29, E-37, N-67). Les points `proprietes` se répartissent entre C34 et C42. Une marge
  va dans Tailles, un style de texte dans Texte.
- [ ] E10.5 Règle renommée (Q-F89-13). Une propriété sans règle et une règle sans propriété au nom voisin font un constat.
- [ ] E10.6 Identifiant d'un point (Q-F89-21, N-66). L'empreinte porte le titre, les nœuds et les éléments.
- [ ] E10.7 Écarts N-84 (point ignoré après un changement d'ordre des phrases).

Fin : `npm run stress:analyse` donne 100 % des attendus de F8, 0 faux constat et 0 fait inexact, et la chaîne passe 321 cas sur 321.

### E11. Lecture et états de l'analyse (F9)

Fichiers : `packages/plugin-architect/src/sandbox/analyse.ts`, `src/sandbox/prelecture.ts`, `src/messages/analyse.ts`,
`src/ui/analyse/index.ts`, leurs tests. B4 à B7 couvrent déjà Q-F89-15 à Q-F89-18 et QV-2.

- [ ] E11.1 Lectures refusées (Q-F89-3, N-78, N-83). Règles, niveau, ignorés et déclaration refusés rendent `partielle`. Les
  dépendances refusées laissent une trace. Une annulation n'est pas un refus.
- [ ] E11.2 Library illisible (Q-F89-4, N-79). L'analyse est partielle. La bannière nomme la library et dit de l'activer dans les
  libraries du fichier (Assets, Libraries), puis d'actualiser.
- [ ] E11.3 Ordre des états (Q-F89-14). Arrêtée, annulée, périmée, partielle, complète.
- [ ] E11.4 Décompte des layers (Q-F89-19, N-76, N-81). Une seule fonction de décompte. Un variant qui lève est une lecture manquée sans
  couper les suivants. Au-delà de 2 000 layers dans le premier variant, une information.
- [ ] E11.5 Library à choisir (Q-F89-20, N-82). La garde passe dans le sandbox, pour la prélecture et pour Analyser.
- [ ] E11.6 Sujet sans nœud (QV-1). L'écran « Aucun composant n'est sélectionné ».
- [ ] E11.7 Modèle d'une analyse annulée (N-71). Compteur de génération remis à zéro (N-75).

Fin : `npm run stress:analyse` donne 0 fait inexact de F9, et la chaîne passe 569 cas sur 569. Aucune lecture refusée ne finit
`complete`.

### E12. Rejeu complet et cibles

- [ ] E12.1 Le `verificateur` relance les sept harnais et `npm run stress:rejeu`, et rend un tableau par famille.
- [ ] E12.2 La conversation principale écrit les nombres dans la section « Cibles » de MESURE-DES-FAILLES.md. Un écart qui reste a une
  question au mainteneur.
- [ ] E12.3 QV-5 : le mainteneur capture Alert et Input au prochain passage dans Figma.

## Phase F. Clôture

- [ ] F1 `npm test`, `npm run typecheck`, `npm run build` par un `verificateur`. `npm run agents:diff`, relecture des documents listés.
- [ ] F2 Publier `@ucm-kit/core`, puis `@ucm-kit/cli` et `@ucm-kit/adapter-typescript` s'ils ont changé, avec `publier-paquets`.
- [ ] F3 Recette du mainteneur dans Figma : sections 1 à 8 de la maquette, durées de D7.2, et gestes de la section 7 de chaque plan de
  stress test.
