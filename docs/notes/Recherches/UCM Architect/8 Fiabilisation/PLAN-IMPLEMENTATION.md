# Plan d'implémentation de la fiabilisation d'Architect

Ce plan implémente les maquettes validées de [MAQUETTE-FIABILISATION.html](./MAQUETTE-FIABILISATION.html), sections 1 à 8.
Il ajoute une phase de vitesse du mode Tokens. La phase E recevra le reste de la refonte après les réponses aux
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
| E | à écrire | Corrections tirées des réponses V2 |
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

À écrire après les réponses du mainteneur dans [QUESTIONS-V2.html](./QUESTIONS-V2.html). Chaque réponse donne un lot ou une case, par
famille : F1 Noms (10 questions), F2 Structure (7), F3-F4 Liaisons et tailles (16), F5-F6 Variants, typographie et icônes (17),
F7 Accessibilité (14), F8-F9 Règles, moteur, lecture et états (21), QV-1 à QV-5. Les écarts N-87 (regroupement des C82) et N-88
(thème non reconnu) attendent QV-3 et QV-4.

## Phase F. Clôture

- [ ] F1 `npm test`, `npm run typecheck`, `npm run build` par un `verificateur`. `npm run agents:diff`, relecture des documents listés.
- [ ] F2 Publier `@ucm-kit/core`, puis `@ucm-kit/cli` et `@ucm-kit/adapter-typescript` s'ils ont changé, avec `publier-paquets`.
- [ ] F3 Recette du mainteneur dans Figma : sections 1 à 8 de la maquette, et durées de D7.2.
