# Plan d'implémentation de la recette v2 d'Architect

Ce plan met en œuvre les décisions de [ANALYSE-RECETTE-V2.md](./ANALYSE-RECETTE-V2.md),
montrées par [MAQUETTE-RECETTE-V2.html](./MAQUETTE-RECETTE-V2.html). Chaque
sous-lot cite la section de l'analyse qui le décrit ; l'agent n'a pas à lire
le reste.

La conversation principale orchestre : elle lance les sous-lots, relit chaque
diff, fait relancer les vérifications, commite par chemins explicites et coche
les cases. Aucun agent ne pousse ni ne publie. La poussée et la publication
ont lieu une fois, au lot Z.

Version 2 : elle intègre la revue d'un second Opus, qui a contrôlé chemins,
lignes, fonctions, tests et comptes dans le code.

## 1. Règles d'exécution

### 1.1 Pistes et agents

Une piste dit qui fait le travail. La colonne « Écrit » liste tout ce que ses
sous-lots écrivent, exceptions comprises. Un sous-lot qui doit écrire hors de
cette liste s'arrête et le dit.

| Piste | Agent | Écrit |
|---|---|---|
| K · kit et moteur de couleur | Codex, dans son clone | `packages/kit/src/**`, `packages/kit/tests/**`, `packages/kit/README.md` (portes documentées), `packages/couleur/**`, hors `package.json` |
| S · socle | Claude 2, `implementeur-exigeant` | `packages/plugin-socle/**` ; pour S1.2, `plugin-architect/src/releveDuComposant.ts`, `src/lectureDuComposant.ts` et leurs tests |
| B · sandbox d'Architect | Claude 2, `implementeur` ou `implementeur-exigeant` | `packages/plugin-architect/src/**` hors `src/ui/`, `plugin-architect/tests/*.test.ts` du sous-lot |
| U · interface d'Architect | Claude 1, `implementeur-exigeant` | `packages/plugin-architect/src/ui/**`, `galerie/**`, `plugin-architect/tests/*.test.ts` du sous-lot ; pour U1.1, `src/fenetre.ts` et `src/sandbox/commun.ts` |
| P · Palettes | Claude 2, `implementeur` ou `implementeur-exigeant` | `packages/plugin-palettes/**` ; mesure dans `_local/recette-v2/` |
| V · versions | orchestrateur | `packages/{kit,cli,adapter-typescript}/package.json`, leurs README, `README.md` racine (pins), `package-lock.json` |
| O · documents et plan | orchestrateur | ce plan, CONTRIBUTING.md, FORMAT.md, CONCEPT.md, SPEC, cartes, invariants, spécification de Palettes |

Au plus deux agents Claude à la fois : Claude 1 sur U, Claude 2 sur S, B et P.
Codex avance la piste K en parallèle, dans son clone.

### 1.2 Dépenser peu de jetons

- Codex prend tout le travail pur du kit et du moteur de couleur : il ne coûte aucun jeton Claude.
- Le prompt d'un agent Claude contient la fiche du sous-lot, la section citée de l'analyse et la sortie de `npm run agents:lire -- <fichiers du sous-lot>`. Rien d'autre. Les fiches nomment fichiers et fonctions : l'agent ne lance aucune exploration.
- Un sous-lot = un appel d'agent = un commit. Un sous-lot rendu incomplet repart de sa ligne `Reste :`, pas de zéro.
- Les remplacements mécaniques vont à `executant` (Haiku), les commandes longues à `verificateur` (Haiku).
- L'agent lance seulement les tests de son sous-lot : `npx tsx --test <fichier>` ou `npm run test:paquet -- <paquet>`. Jamais `npm test`, jamais `test:ui`. Le `verificateur` lance la vérification complète une fois par jalon.
- L'orchestrateur relit `git diff --stat`, puis les fichiers publics (types et fonctions exportés) et les tests. Il ne relance pas une vérification consignée par `Vérifié :`.

### 1.3 Codex

- Clone `A:\UCM-codex`, branche `main`, remote `partage` vers l'arbre partagé. Codex ne pousse rien et n'écrit pas ce plan.
- Avant chaque sous-lot : `git status` propre, `git pull --rebase partage main`, lecture de ce plan par `git show partage/main:"docs/notes/Recherches/UCM Architect/6 Recette v2/PLAN-IMPLEMENTATION-RECETTE-V2.md"`.
- Il prend, dans l'ordre de la colonne Codex du §2, le premier sous-lot `[ ]` marqué Codex dont les dépendances sont `[x]`. Il ne prend jamais un sous-lot `[~ Claude …]`.
- **Un sous-lot à la fois, commité avant le suivant.** Codex termine un sous-lot, le vérifie et le commite avant d'en ouvrir un autre. Il ne commence jamais un sous-lot avec un `git status` non vide. Un clone sale à la synchronisation désigne donc un seul sous-lot interrompu, jamais plusieurs.
- Il ne monte aucune version. Entre son commit et le lot V suivant, seul `versionSuitLeContenu` peut échouer, et seulement dans son clone.
- Vérifie : tests du kit (`npm run test:paquet -- kit`) ou du moteur (`npm run test:paquet -- couleur`), puis tests racine `node scripts/run-tests.cjs`.
- Avant sa limite, il commite l'étape verte en cours avec une ligne `Reste : …`, ou l'abandonne par `git restore`.

**Synchronisation**, par l'orchestrateur, quand aucun agent Claude n'a de sous-lot ouvert : `git -C A:\UCM-codex status`, `git fetch codex`, `git merge --no-edit codex/main`, lot V, `npm run build -w @ucm-kit/core`, cases cochées avec leurs hashes. Un sous-lot B, S, U ou P qui consomme un sous-lot K attend la synchronisation qui l'apporte.

### 1.4 États, commits et sessions voisines

- États : `[ ]` libre, `[~ Claude 1]`, `[~ Claude 2]`, `[~ Codex]` pris, `[x] (hash)` fait. L'orchestrateur coche aussi les cases de Codex à chaque synchronisation.
- **Chaque sous-lot complété fait l'objet de son propre commit**, aussitôt vérifié, avant que l'agent ou Codex n'en ouvre un autre. Jamais deux sous-lots dans un commit, jamais un sous-lot fini laissé hors commit. Ainsi, un agent arrêté par sa limite de jetons ne laisse au plus qu'un sous-lot en plan.
- Message de commit : `R2-<id> · <titre>`, puis la ligne `Vérifié : <commandes>`.
- D'autres sessions travaillent dans l'arbre partagé. Avant chaque sous-lot, l'orchestrateur lance `git status` sur les fichiers du sous-lot. Un fichier déjà modifié hors de ce plan bloque le sous-lot : l'orchestrateur prend un autre sous-lot de la même piste, ou attend.
- Nature de la tâche, à nommer dans chaque prompt : « correction d'un défaut » exige un test qui échoue sans la correction ; « déplacement à sortie identique » exige les tests existants inchangés ; « écran nouveau » exige un état de galerie.
- Un texte d'écran absent de l'analyse et de ce plan s'écrit `TODO(texte)`. L'orchestrateur l'écrit ensuite.

### 1.5 Fichiers carrefours

| Carrefour | Parade |
|---|---|
| Versions du kit, de la CLI, de l'adaptateur | Lots V seulement, par l'orchestrateur |
| `packages/kit/src/controles/releve.ts`, types du relevé | K6.1 seul les change ; B3 les consomme après synchronisation |
| `packages/kit/src/controles/catalogue.ts`, type du catalogue | K4.1 seul le change ; B2 le remplit après synchronisation. Le fond de la page Figma passe par le catalogue, jamais par le relevé |
| `plugin-architect/src/releveDuComposant.ts` | S1.2 puis B3, tous deux Claude 2, en série |
| `plugin-architect/src/sandbox/analyse.ts` | B4 seul ; attend que la session de la vitesse l'ait commité |
| `plugin-architect/src/messages/corrections.ts` | B4.2 seul |
| `plugin-architect/src/ui/textes/*.ts`, `src/ui/ignores/modele.ts`, `galerie/etats/*.cjs` | Piste U seule, Claude 1, en série |
| Tests de Palettes qui comptent les promesses | P1.5, à la synchronisation qui apporte P1 |

## 2. Vagues

Chaque vague se termine par une synchronisation de Codex et un jalon. Une
case de la colonne Codex peut déborder sur la vague suivante sans bloquer
Claude, sauf là où une flèche le dit.

| Vague | Orchestrateur | Codex | Claude 1 (U) | Claude 2 (S, B, P) | Fin de vague |
|---|---|---|---|---|---|
| 0 | O0 | — | — | — | — |
| 1 | — | K1, K2, K3, K7 | U1 | P0, puis S1 | Sync, V1 (← O0.4), jalon J1 ; le mainteneur tranche R-30 |
| 2 | — | K5, K8, K9 | U2 | B1 | Sync, V2 |
| 3 | — | K4, K6 | U3 | S2, puis B4 (← K8) | Sync, V3, jalon J3 |
| 4 | — | P1 (← R-30) | U4, puis U5 (← K7, K9, K4) | B2 (← K4), puis B3 (← K6, S2) | Sync, P1.5, V4 |
| 5 | O1 | — | U6 (← B4, U4), puis U7 (← K4, B1) | P2 (← P1) | Jalon J5 |
| 6 | Z | — | — | — | — |

Chemins critiques : P0 → R-30 → P1 → P2, et K5 → K6 → B3. P0 ouvre la vague 1.

## 3. Lots

### O0 · Préparation

Agent : orchestrateur.

- [x] **O0.1** `git status` de l'arbre partagé. Noter dans ce plan les fichiers de §1.5 que d'autres sessions modifient, et les sous-lots qu'ils bloquent. Le 28/10 : la session de Nomenclature écrit `src/ui/nomenclature/ecriture.ts`, `regles.ts`, `src/ui/textes/nomenclature.ts` et `packages/kit/src/nommage/calcul.ts`. Aucun sous-lot ne les touche ; les lots K et V attendent sa publication du kit 0.13.30.
- [x] **O0.2** ~~Mettre le clone de Codex à jour~~. Codex a atteint sa limite : il a travaillé dans l'arbre partagé (U1, P0). Claude reprend la piste K.
- [x] **O0.3** Déplacer le rapport de Button (`ucm-architect-rapport-Button-*.json`, 5 Mo) dans `_local/recette-v2/`. Les tests de K1 et B1 en copient des extraits en fixtures.
- [x] **O0.4** Levé le 28/10 : ces fichiers sont commités. Une autre session a modifié sans commit les `package.json`, README et lock du kit, de la CLI et de l'adaptateur, et la spécification de Palettes. V1 attend son commit ; O1.4 aussi.

### Piste K · kit et moteur de couleur (Codex)

#### K1 · C21 ne vise plus une liaison qui porte les valeurs de son variant

Analyse 7.1. Nature : correction d'un défaut.

Une majorité demande au moins deux liaisons et plus de la moitié du groupe
(`mapping.ts:113-121`). Les liaisons justes restent donc dans le groupe et dans
le compte de la majorité ; elles ne reçoivent simplement jamais C21.

- [x] (e67392ec) **K1.1** Test rouge dans `packages/kit/tests/controles-c21-modes.test.ts` : 12 variants Focus de statut liés à `Button/Color/<Statut>/<Variant>/Focus/ring` qui renvoie à `<Statut>/Vivid/ring`, 6 de marque liés à `Button/Color/<Marque>/<Variant>/Focus/ring` qui renvoie à `<Marque>/ring`. Aucun C21 attendu.
- [x] (e67392ec) **K1.2** `ecartsDeFratrie` (`packages/kit/src/controles/mapping.ts:87`) : dans la boucle qui émet C21, sauter une liaison dont chaque segment de property du nom de token, lu par `segmentDAxe`, vaut la valeur de son variant. Le groupement et le calcul de la majorité ne changent pas.
- [x] (e67392ec) **K1.3** Deux tests de plus : un variant `Color=Primary` lié à `Color/Info/…` au milieu de voisins justes garde C21 ; un token sans segment de property, différent de la majorité, garde C21. L'axe `Color` se lit désormais comme un axe de palette (`axeDePropriete`), comme `Severity`.

#### K2 · C10 lit l'écriture des dossiers

Analyse 7.2. Nature : correction d'un défaut.

- [x] (91fe6c14) **K2.1** Tests rouges dans `packages/kit/tests/nommageCalcul.test.ts` : `Size/Large/radius` tenu ; `Size/radius/Large` donne C10 attendu `lg` ; `Size/lg/radius` donne C10 attendu `Large`.
- [x] (91fe6c14) **K2.2** `packages/kit/src/controles/nommage.ts:225` : l'écriture attendue vient de `termePourCategorie(terme, categorieDuSegment(nom, rang))` (`referentiel/termes.ts`, `referentiel/ecriture-des-mots.ts`).
- [x] (91fe6c14) **K2.3** Loi dans `packages/kit/tests/` : aucun fichier de `src/controles/` ne compare un segment à `terme.id` hors de `termePourCategorie`.

#### K3 · C17 admet `foreground` sur un stroke

Analyse 8. Nature : correction d'un défaut.

- [x] (70e93209) **K3.1** Tests rouges : stroke d'Alert Outlined lié à `Color/Info/Outlined/foreground`, aucun C17 ; stroke lié à un token `background`, C17 ; stroke d'un layer `ring` lié à `foreground`, C17.
- [x] (70e93209) **K3.2** `rolesAdmis` (`mapping.ts:47`) : un stroke hors anneau admet `['border', 'foreground']`.

#### K7 · C67 « propriété absente » devient À corriger

Analyse 7.4. Nature : correction d'un défaut.

- [x] (04ce6d74) **K7.1** `packages/kit/src/controles/typographie.ts:245` : le C67 de motif `propriete-absente` passe de `verifier` à `corriger`. Ses deux limites (`icone-non-pilotee`, `icones-permises-non-lues`, lignes 251-252) restent `info` : elles iront dans la section Informations (U5). Test dans `typographie.test.ts`.

#### K5 · Les sortes de composant imbriqué

Analyse 7.3, « Factoriser et documenter la notion ». Nature : code nouveau.

- [x] (ce515caa) **K5.1** `packages/kit/src/referentiel/composition.ts` : sortes `dependance`, `wrapper-de-dimensions`, `piece-interne`, `detail` ; type `FaitsDImbrique` (nom, règles d'utilisation trouvées, dimensions liées) ; `sorteDeLImbrique(faits)`, testée dans l'ordre de l'analyse. Export par `referentiel/index.ts` et la porte documentée de `packages/kit/README.md`.
- [x] (ce515caa) **K5.2** Tests `packages/kit/tests/composition.test.ts` : `.sizeWrapperButton` avec dimensions liées donne `wrapper-de-dimensions` ; `.Ring` donne `piece-interne` ; un set nommé par `.componentRules` donne `dependance` ; un imbriqué sans préfixe ni règles donne `detail`.

#### K8 · Détection du modèle de liaisons

Analyse 4, « La carte ». Nature : code nouveau.

- [x] (bc472e9f) **K8.1** `packages/kit/src/controles/propagation.ts` : `candidatsDeModele(releve, catalogue)` rend, par sorte (`couleurs`, `tailles`), le variant qui porte le plus de liaisons de cette sorte, à égalité le premier du jeu ; les layers en dur ailleurs ; le nombre de liaisons que `proposerLaPropagation` proposerait. Rien si ce nombre vaut zéro.
- [x] (bc472e9f) **K8.2** Constat `C81`, famille `liaisons` ou `tailles`, type `corriger`, faits `{ modele, layers, variants, liaisons }`, sans correction. `C81` est libre ; l'ajouter au registre des codes de `packages/plugin-architect/invariants/explorateur.md`, où C80 est décrit (l'orchestrateur le fait à la synchronisation : fichier hors de la piste K).
- [x] (bc472e9f) **K8.3** Tests dans `propagation.test.ts` : un variant lié et 3 en dur donnent un C81 ; tous liés, aucun ; aucun lié, aucun.

#### K9 · Le signe de la section Informations

Analyse 7.4. Nature : code nouveau.

- [x] (4a5726ca) **K9.1** `packages/kit/src/referentiel/signes.ts` : signe `information`, une note grise (tracé de la maquette, cadre 7f), famille des sortes de proposition. Test dans `signes.test.ts`.

#### K4 · Contraste sur la page et la carte, sévérité selon les garanties

Analyse 7.5. Nature : correction d'un défaut.

- [x] (6a6d4ac9) **K4.1** Type du catalogue (`controles/catalogue.ts`) : champ facultatif `fondsDElevation`, par mode du thème, `{ page, carte }` en couleur résolue ; champ facultatif `fondDeLaPageFigma`, une couleur. Aucun lecteur ne change encore.
- [x] (6a6d4ac9) **K4.2** `fondEffectif` et `calculerLeFond` (`controles/accessibilite.ts:474`) : sans fill opaque dans le variant, mesurer contre la page et contre la carte, dans chaque mode. Sans `fondsDElevation`, mesurer contre `fondDeLaPageFigma`.
- [x] (6a6d4ac9) **K4.3** Sévérité : suivre l'alias du premier plan jusqu'à la variable du thème, chercher la variable et le fond dans `GARANTIES` (`emplois/garanties.ts`). Garanti : `corriger`. Non garanti, variable hors thème, ou fond de la page Figma : `verifier`. Faits : `fondNomme` (`page`, `carte` ou `page-figma` ; `fond` garde la couleur que l'interface lit), `mode`, `variableDuTheme`, `garanti`. Au repli sur la page Figma, émettre aussi un constat `info`, une fois par analyse, cause `fond-de-repli`.
- [x] (6a6d4ac9) **K4.4** Tests dans `accessibilite.test.ts`, valables avant et après P1 : stroke `page/border` à 2,7:1 sur la page en Dark, `corriger` (garanti sur la page dès aujourd'hui) ; stroke `page/divider` à 2,4:1 sur la carte en Dark, `verifier` (aucune garantie, ni avant ni après P1) ; sans `fondsDElevation`, `verifier` avec `fond: 'page-figma'` et un constat `info` `fond-de-repli` ; ancien cas `fond-indetermine` remplacé.

#### K6 · La pièce interne dans C80

Analyse 7.3, « Décision ». Dépend de K5. Nature : correction d'un défaut.

`LiaisonLue` porte déjà `surcharge?: { id, nom, type }`, le layer intérieur
d'une instance. Le nouveau champ prend un autre nom pour ne pas s'y confondre.

- [x] (63f21dc9) **K6.1** `controles/releve.ts` : `LiaisonLue` reçoit `provenance?: 'composant-principal' | 'instance'` ; le layer imbriqué reçoit `sorte?: SorteDImbrique`. Champs facultatifs : un relevé ancien reste lisible.
- [x] (63f21dc9) **K6.2** `controlerCouches` (`controles/couche.ts:60`) : une liaison de provenance `composant-principal` d'une `piece-interne` ou d'un `wrapper-de-dimensions` vers `theme` ou `layout` ne donne pas C80. Une liaison de provenance `instance` reste jugée comme un layer de l'hôte.
- [x] (63f21dc9) **K6.3** Tests dans `controles-composant.test.ts` : radius de `.Ring` lié à `Radius/lg` dans le composant principal, aucun C80 ; couleur posée sur l'instance par un token de Button, aucun ; couleur posée sur l'instance par `layout`, C80.

#### P1 · Les garanties sur la carte

Analyse 10. Dépend de P0 et R-30. Nature : code nouveau.

- [x] (e44583fc) **P1.1** `packages/kit/src/emplois/garanties.ts` : `FOND_DE_LA_CARTE` rejoint les fonds de G2 à G6. Tests `garanties.test.ts`.
- [x] (e44583fc) **P1.2** `packages/couleur/src/garantie.ts` : la garantie des courbes juge aussi contre la carte en Dark (`couleurDeLaCarte`, `packages/couleur/src/jugement.ts:66`). Tests `garantie.test.ts`.
- [x] (e44583fc) **P1.3** `packages/couleur/tests/promesses.test.ts:200-243` et `limites.test.ts` : 21 promesses par mode et par intensité, 84 et 42 par palette ; la limite dynamique prend la carte.
- [x] **P1.4** ~~Si R-30 change la courbe Dark, la table des dossiers ou la carte~~ : R-30 accepté le 29/10, rien ne change.
- [x] (e44583fc) **P1.5** À la synchronisation qui apporte P1, par `executant` dans l'arbre partagé : `packages/plugin-palettes/tests/rapport.test.ts:32` (64 devient 84) et `tests/modeleDePlanche.test.ts:300` (16 devient 21). Codex ne lance pas ces tests ; ils échouent entre P1 et P1.5.

### Piste S · socle (Claude 2)

#### S1 · Un espacement sans effet n'est pas une valeur en dur

Analyse 9. Agent : `implementeur-exigeant` (trois lecteurs d'une règle). Nature : correction d'un défaut.

- [x] (cfd1b85a, 45e2be4c) **S1.1** `packages/plugin-socle/src/composant/contract/nodeBindings.ts` : exporter `espacementSansEffet(noeud, champ)`, bâti sur `inapplicableReason` (définie ligne 225). Ses deux appels du socle (lignes 315 et 442) restent tels quels ; un test de la fonction s'ajoute.
- [x] (cfd1b85a, 45e2be4c) **S1.2** `plugin-architect/src/releveDuComposant.ts:159` et `src/lectureDuComposant.ts:198` sautent un espacement sans effet. Tests rouges dans `releveDuComposant.test.ts` et `lectureDuComposant.test.ts` : auto layout `SPACE_BETWEEN`, `itemSpacing` 10, aucune valeur en dur.

#### S2 · Le socle classe les imbriqués par le kit

Dépend de K5 (V2). Agent : `implementeur-exigeant`. Nature : déplacement à sortie identique.

- [x] (f20b4c5d) **S2.1** Dans `packages/plugin-socle/src/composant/contract/`, la reconnaissance du wrapper de dimensions et des dépendances relève les faits de `FaitsDImbrique` et appelle `sorteDeLImbrique`. Les contrats des fixtures restent identiques à l'octet.
- [x] (f20b4c5d) **S2.2** Test dans le socle : aucune reconnaissance d'imbriqué hors de `sorteDeLImbrique`. La même loi côté Architect arrive avec B3.

### Piste B · sandbox d'Architect (Claude 2)

#### B1 · C45 voit les props du wrapper

Analyse 7.6. Agent : `implementeur`. Nature : correction d'un défaut.

- [x] (97a60667) **B1.1** Test rouge dans `plugin-architect/tests/regles.test.ts`, d'après le rapport de Button : jeu `Color`, `Variant`, `State` ; wrapper `.sizeWrapperButton` à `Size`, `Label`, `Icon-Left`, `Icon-Right` ; règles `size`, `label`, `iconLeft`, `iconRight`. Aucun C45 `sans-propriete`. `State` sans règle garde son C45.
- [x] (97a60667) **B1.2** `lireLesRegles` (`src/regles.ts:150`) : ajouter à `surface` les clés des props que le moteur fusionne depuis le wrapper de dimensions, lues dans `ResultatInterne`.

#### B4 · La carte de modèle côté sandbox

Analyse 4. Dépend de K8 (V2). Agent : `implementeur`. Nature : code nouveau.

- [x] (bc472e9f) **B4.1** ~~`src/sandbox/analyse.ts` : ajouter les C81 de `candidatsDeModele` aux constats de l'analyse~~. K8 émet C81 dans `controlerCouchesParEtapes`, que l'analyse appelle déjà. Rien à changer dans le sandbox.
- [x] (e16ffeb4) **B4.2** `servir-de-modele` (`src/sandbox/corrections.ts:83`) accepte le variant des faits de C81. Le message `modele-propose` (`src/messages/corrections.ts`) reçoit un champ `retires`, les identifiants des constats qu'il remplace : le C81 d'origine. Test dans `corrections.test.ts`.

#### B2 · Les fonds au catalogue

Analyse 7.5, « D'où vient la valeur ». Dépend de K4 (V3). Agent : `implementeur`. Nature : code nouveau.

- [x] (c8acfc30) **B2.1** `src/catalogue.ts` : trouver `elevation/page` et `elevation/raised` par leur nom dans la collection de rôle `theme`, importer leurs valeurs par mode en suivant les alias, remplir `fondsDElevation`. Deux imports par analyse au plus.
- [x] (c8acfc30) **B2.2** Toujours dans `src/catalogue.ts` : remplir `fondDeLaPageFigma` par `figma.currentPage.backgrounds`. Tests dans `catalogue.test.ts`.

#### B3 · La provenance des liaisons d'un imbriqué

Analyse 7.3. Dépend de K5, K6 (V3) et S2. Agent : `implementeur-exigeant`. Nature : correction d'un défaut.

- [x] (7aeecb61) **B3.1** `src/releveDuComposant.ts` : pour un layer d'instance imbriquée, relever `FaitsDImbrique` et la `sorte` par `sorteDeLImbrique`.
- [x] (7aeecb61) **B3.2** Marquer chaque liaison `provenance: 'composant-principal'` ou `'instance'`, en comparant à la liaison du layer homologue dans le composant principal, lu une fois par composant principal et par demande. Test dans `releveDuComposant.test.ts`.
- [x] (7aeecb61) **B3.3** Loi dans `plugin-architect/tests/` : aucune reconnaissance d'imbriqué hors de `sorteDeLImbrique`.
- [x] (7aeecb61) **B3.4** Mesurer le coût sur la capture de Button (`scripts/rejouer-la-capture.ts`). Au-delà de 5 % du relevé, le dire avant de commiter.

### Piste U · interface d'Architect (Claude 1, `implementeur-exigeant`)

Chaque sous-lot U met à jour ses états de galerie et les nomme dans son compte
rendu. Le mainteneur vérifie l'interface lui-même. Un test DOM suit le modèle
de `tests/panneauSections.test.ts`, qui emploie `tests/domDeTest.ts`.

#### U1 · Fenêtre, barre et Configuration

Analyse 1. Nature : correction d'un défaut.

U1.5 passe sans correction : la cause vue en recette reste à reproduire dans Figma. La fenêtre ouverte fait 1144 px : avec la poignée de 7 px, le panneau en reçoit 637.

- [x] (ad2c05bb) **U1.1** Largeurs : `src/fenetre.ts` (500 px à l'ouverture et en minimum, panneau à 640 px, fenêtre ouverte à 1144 px), `src/sandbox/commun.ts` (taille rangée remontée à 500 px), `src/ui/application.ts` (`basculerLePanneau`), `src/ui/composant/corps.ts` (bornes de la vue et du panneau), `src/ui/styles/composant.css` (`min-width`). Tests `fenetre.test.ts`.
- [x] (ad2c05bb) **U1.2** Barre compacte en mode Composant (`src/ui/barre.ts`) : sans logo ni nom, Analyser avec son libellé, Constats en icône et pastille, Configuration en icône. Analyser désactivé quand la sélection est connue et ne contient aucun composant, avec la bulle « Sélectionnez un composant dans Figma ». Une sélection inconnue (`null`, commentaire de `src/ui/composant/analyse.ts:75-77`) garde le comportement actuel : séparer les deux cas dans `selectionSurLAnalyse`. Test DOM.
- [x] (ad2c05bb) **U1.3** Frontière (`src/ui/composant/corps.ts:47`) : suivi sur `window` en phase de capture, fin au relâchement ou à la sortie de la fenêtre, sur le modèle de `src/ui/poignee.ts`.
- [x] (ad2c05bb) **U1.4** Configuration (`ouvrirLaConfiguration`, `src/ui/application.ts:187` ; `src/ui/nomenclature/coquille.ts`) : bascule `aria-pressed` ; même mode ; à la place du panneau quand il est ouvert, de la vue sinon, en une colonne sous 640 px ; le second clic rend l'écran précédent.
- [x] (ad2c05bb) **U1.5** Test : Analyser ne change pas `etat.panneau.ouvert`. S'il passe, le dire : la cause vue en recette reste à reproduire dans Figma.

#### U2 · Changer de variant sans saut, chevron des sections

Analyse 2. Nature : correction d'un défaut.

- [x] (32d7520d) **U2.1** `src/ui/vues/composant.ts` : pour un autre variant du même jeu, garder l'ancienne lecture pendant la lecture, avec la barre fine sous l'en-tête. L'écran « Lecture du composant… » reste pour un nouveau composant.
- [x] (32d7520d) **U2.2** Mise à jour par clé dans `rendre()` : en-tête, section Variants et lignes de tokens gardent leurs nœuds ; sections ouvertes, filtre et défilement gardés ; aperçu à hauteur constante, image remplacée une fois chargée.
- [x] (32d7520d) **U2.3** Une valeur changée est surlignée 600 ms (classe et style dans `src/ui/styles/composant.css`).
- [x] (32d7520d) **U2.4** Chevron des en-têtes de section de la liste à droite, après le titre et le nombre.
- [x] (32d7520d) **U2.5** Test DOM `tests/changementDeVariant.test.ts`, sur le modèle de `panneauSections.test.ts` : après un changement de variant du même jeu, les nœuds des lignes communes sont les mêmes objets.

#### U3 · Les variants en valeurs seules, tableau retiré

Analyse 3 et 5. Nature : écran nouveau.

- [x] (553bef4c) **U3.1** Puce de valeur : la valeur seule, la paire exacte de Figma en `title` ; la property reste dans la puce quand deux properties du jeu partagent cette valeur. Une fonction, dans `src/ui/composant/`, que tous les écrans emploient.
- [x] (553bef4c) **U3.2** Section Variants (`src/ui/composant/variants.ts`) : retirer la ligne Affiché (ligne 296), le bouton Tableau, `basculerLeTableau` (`src/ui/vues/composant.ts:423`), le rendu croisé (ligne 213), le bouton de copie et leurs textes.
- [x] (553bef4c) **U3.3** Constats (`src/ui/ignores/modele.ts:101`, `src/ui/corrections/modele.ts`, `src/ui/corrections/index.ts`, `src/ui/questions/index.ts`) : la phrase ne nomme plus le variant ; la ligne de lieu donne le nombre de variants, puis les puces des seules paires partagées. « Tous les variants désactivés » disparaît.
- [x] (553bef4c) **U3.4** Liste avant / après d'une carte de correction : la valeur en dur d'abord, puis le variant en puces.
- [x] (553bef4c) **U3.5** États de galerie mis à jour ; ceux du tableau retirés.

#### U4 · Ligne d'actions et Sélectionner

Analyse 4 et 6. Nature : écran nouveau.

- [x] (a7e43ae1) **U4.1** Carte de constat et de question : chevron en haut à droite, sur la ligne de la sévérité ; ligne d'actions en bas, sous le texte (`src/ui/ignores/index.ts`, `src/ui/questions/index.ts`).
- [x] (a7e43ae1) **U4.2** Bouton Sélectionner, signe `selection` du kit, sur toute carte qui vise des layers. Après le clic, « Sélectionnés », désactivé jusqu'au prochain message `selection` du sandbox. Une carte de correction le porte dans son corps déplié.
- [x] (a7e43ae1) **U4.3** Ouvrir une carte ne sélectionne plus rien : retirer les appels de `src/ui/corrections/index.ts:400`, `:464` et `src/ui/ignores/index.ts:158`. Tests `ignores.test.ts`, `corrections.test.ts`.

#### U5 · La section Informations

Analyse 7.4. Dépend de K7, K9 et K4 (V3). Nature : écran nouveau.

- [x] (98bf022c) **U5.1** `src/ui/panneau/elements.ts` : un constat `info` sort des éléments, des nombres, de « Tout », du sommaire et de la pastille de Constats.
- [x] (98bf022c) **U5.2** `src/ui/panneau/rendu.ts` : section Informations en dernier, signe `information`, repliée à l'arrivée ; une ligne par information, avec sa ligne de lieu et Sélectionner quand elle vise des layers.
- [x] (98bf022c) **U5.3** Textes des lignes, dans `src/ui/textes/` :
  - C53 : « Contraste non mesuré sur `Disabled`, que WCAG exempte. »
  - C49 et C50 avec limite : « Contraste non mesuré : » suivi de la cause, avec les phrases de cause existantes (`CAUSES_DE_LIMITE`).
  - C49 borne : « {n} paires de couleurs non mesurées sur {total}. »
  - C67 `icone-non-pilotee` : « L’icône du layer `{calque}` n’est pilotée par aucune propriété : ses icônes ne sont pas contrôlées. »
  - C67 `icones-permises-non-lues` : « Les icônes permises par `{propriete}` n’ont pas pu être lues : ses icônes ne sont pas contrôlées. »
  - K4 `fond-de-repli` : « Fond lu sur la page Figma : `elevation/raised` est introuvable. »

  Tests `panneauElements.test.ts`.

#### U6 · La carte de modèle

Analyse 4. Dépend de B4 et U4. Nature : écran nouveau.

- [x] (1edcdc8c, 81b2edfa) **U6.1** Carte C81 dans la section de sa sorte : « 4 layers ont une couleur en dur dans 215 variants. » ; ligne de lieu « Un variant les lie déjà : » et les puces du modèle ; action « Proposer les liaisons ».
- [x] (1edcdc8c, 81b2edfa) **U6.2** Le chevron déplie la liste des layers et de leur token dans le modèle (cadre 4f).
- [x] (1edcdc8c, 81b2edfa) **U6.3** Le clic envoie `servir-de-modele` avec le variant des faits. À la réponse, `src/ui/composant/analyse.ts` retire les constats de `retires` et ajoute les corrections dans la même section, ouverte. Test DOM.

#### U7 · Les textes des constats

Analyse 7.5, 7.6. Dépend de K4 (V3) et B1. Agent : `implementeur`, puis `executant` pour U7.3.

- [x] (6bec0305) **U7.1** Contraste (`src/ui/textes/ignores.ts`) : deux phrases, fond garanti et fond non garanti, d'après l'analyse 7.5 ; elles nomment le fond, le mode, le contraste, le seuil et la garantie.
- [x] (6bec0305) **U7.2** C45 : « La règle `label` ne correspond à aucune propriété de Button. » ; action « Donnez-lui le nom exact de la propriété, ou supprimez-la ».
- [x] (6bec0305) **U7.3** « property » devient « propriété » dans toutes les phrases de `src/ui/textes/`, trouvées par `grep -n "property" src/ui/textes/` (aujourd'hui `ignores.ts:141`, `:143`, `:144`, `:160`) ; les noms de types de Figma, comme `Instance swap`, restent. `tests/loiDuVocabulaire.test.ts` admet « propriété ».

### Piste P · Palettes (Claude 2)

#### P0 · Mesurer la courbe Dark contre la carte

Analyse 10, « Ce que la carte change ». Agent : `implementeur`. Nature : mesure, aucun fichier versionné.

- [x] (eb4a2ae7) **P0.1** Script `_local/recette-v2/mesure-carte.ts`, sur `packages/couleur` : pour les quatre combinaisons de texte des boutons, les deux profils et 360 teintes, le contraste en Dark de `solid/default`, `surface/foreground`, `surface/border`, `page/foreground` et `page/border` contre la carte (`couleurDeLaCarte`, `jugement.ts:66`). Rendre le pire cas par variable et le nombre de teintes sous le seuil.
- [x] (eb4a2ae7) **P0.2** Sur les 14 références de la spécification de Palettes, la largeur des curseurs du Color shift et du réglage global avant et après l'ajout de la carte (`limiteDynamique`, `limites.ts:107`).
- [x] (eb4a2ae7) **P0.3** L'orchestrateur reporte les deux tableaux dans l'analyse, section 10, et pose R-30 au mainteneur.

#### P2 · Palettes montre les garanties sur la carte

Analyse 10, « Ce que le changement touche ». Dépend de P1 (V4). Agent : `implementeur-exigeant`.

- [x] (a2e8ddf6) **P2.1** Carte des garanties et réglette (`src/ui/modeleDesGaranties.ts`, réglette) : les colonnes « sur la page » et « sur la carte » de G7 servent à G2 à G6. Tests `modeleDesGaranties.test.ts`.
- [x] (a2e8ddf6) **P2.2** Planche (`src/planche/modele.ts`) et rapport (`src/rapport.ts`) : les promesses sur la carte s'ajoutent. Tests `modeleDePlanche.test.ts`, `rapport.test.ts`, au-delà des comptes déjà mis à jour en P1.5.
- [x] (a2e8ddf6) **P2.3** Textes (`src/i18n/fr.ts`, `en.ts`) : aucun nombre de contrôles à changer. Vérifier que les libellés de G7, « sur la page » et « sur la carte », valent pour les autres garanties ; sinon `TODO(texte)`.
- [x] (a2e8ddf6) **P2.4** États de galerie de Palettes mis à jour.

### Lots de l'orchestrateur

#### V · Versions

- [x] (c8cb3ae5) **V1** Kit 0.13.31, CLI 0.1.128, adaptateur 0.1.121 : K1 à K9, hors P1. V2 et V3 n'ont plus d'objet ; V4 suit P1.
- [x] (f3bde749) **V2** Kit 0.13.32, CLI 0.1.129, adaptateur 0.1.122 : export de `cleDuTheme` (B2), `faits.lignes` de C81 (U6).
- [x] **V3** ~~Vague 3~~, comprise dans V1.
- [x] (9d9ec699) **V4** Kit 0.13.33, CLI 0.1.130, adaptateur 0.1.123 : P1, et les correctifs du rapport Button du 29/10 : wrappers de dimensions (9de1021c), variables du thème quelle que soit l'écriture (9432cae8), première analyse qui ouvre le panneau (6bc08128).

#### O1 · Documents

- [x] (07411e74) **O1.1** CONTRIBUTING.md : un variant s'écrit en puces de valeur, la paire exacte au survol ; « propriété » dans la table des termes ; la section Informations, seule exception à la règle « aucun constat sans geste » ; la ligne d'actions d'une carte de constat.
- [x] (af6aae4d) **O1.2** CONCEPT.md, section 2 : la pièce interne, en une phrase. FORMAT.md, « Composition et dépendances » : renvoi à `sorteDeLImbrique`. `packages/kit/invariants/referentiel.md` : la règle.
- [x] (93d6f373 et les commits des sous-lots U) **O1.3** Architect : `SPEC.md`, `README.md`, `CARTE.md`, `invariants/explorateur.md` (C81), d'après `npm run agents:diff`.
- [x] (72a198c2) **O1.4** Spécification de Palettes, une fois O0.4 levé : section 11.2, `[VER-21]`, `[ENT-10]`, le nombre de contrôles (ligne 1409 aujourd'hui) ; `[MOT-37]` place `couleurDeLaCarte` dans `jugement.ts`, pas dans `promesses.ts`.
- [x] (1471812d) **O1.5** README du dossier `UCM Architect` : ligne de ce plan.

#### Jalons

- [x] **J1** ~~Après V1~~ : compris dans J3.
- [x] (3ca9ba2f) **J3** Après V2 : npm test (seul échec : vue du hub périmée, régénérée en 3ca9ba2f), typecheck, build, build:plugin architect verts.
- [x] **J5** Après V4 : npm test, typecheck, build verts ; build:plugin palettes et architect le 29/10 à 10:28.

#### Z · Clôture

- [x] **Z.1a** Liste des écrans à vérifier : §4.
- [ ] **Z.1b** Recette Figma par le mainteneur : Button, Alert, Stresstest, une palette en Dark.
- [x] **Z.2** Poussé et publié le 29/10, avant la recette à la demande du mainteneur : kit 0.13.33, CLI 0.1.130, adaptateur 0.1.123.

## 4. Écrans à vérifier

Le mainteneur rejoue ces gestes dans Figma. Avant la recette, reconstruire
les deux plugins : `npm run build:plugin -- architect`, puis
`npm run build:plugin -- palettes`. Le build du 29/10 à 10:28 précède les
commits du plan des crans clairs, qui changent aussi Palettes en Dark.

La colonne Galerie nomme les états qui montrent le même écran hors de Figma
(`npm run galerie:plugin -- architect` ou `-- palettes`).

### Architect, interface

| Sous-lot | Geste dans Figma | Attendu | Galerie |
|---|---|---|---|
| U1.1 | Ouvrir Architect, puis ouvrir et fermer le panneau des constats | 500 px à l'ouverture et au minimum ; 1144 px panneau ouvert, panneau de 640 px | `composant-vide` |
| U1.2 | Lire Alert, puis tout désélectionner dans Figma | Barre sans logo ni nom ; Analyser avec son libellé, grisé, bulle « Sélectionnez un composant dans Figma » ; Constats en icône et pastille ; engrenage seul | `u1-sans-composant`, `c-bouton-texte` |
| U1.3 | Glisser la frontière vue / panneau et relâcher hors de la fenêtre | La frontière suit le pointeur et s'arrête au relâchement | — |
| U1.4 | Ouvrir la Configuration depuis le mode Composant, panneau fermé puis ouvert ; cliquer une seconde fois | Même mode ; la Configuration remplace la vue ou le panneau ; le second clic rend l'écran précédent | `u1-configuration-vue`, `u1-configuration-panneau` |
| 6bc08128 | Analyser un composant jamais analysé, panneau fermé ; puis Analyser de nouveau | Le panneau s'ouvre à la première analyse ; la seconde n'y touche pas | — |
| U2 | Alert lu : choisir Severity « error » dans la section Variants | L'ancienne lecture reste sous une barre fine ; sections ouvertes, filtre et défilement gardés ; valeurs changées surlignées un instant ; chevrons des sections à droite | `u2-variant-en-lecture`, `u2-variant-lu`, `composant-section` |
| U3 | Survoler une puce de variant d'Alert ; analyser Button | La puce porte la valeur seule, la bulle la paire de Figma ; sur Button, `default` garde sa property ; ni ligne Affiché ni bouton Tableau ; une carte donne le nombre de variants puis les puces partagées ; la liste avant / après commence par la valeur en dur | `composant-variants`, `u3-valeurs-partagees` |
| U4 | Ouvrir une carte, puis cliquer Sélectionner ; changer la sélection dans Figma | Ouvrir ne sélectionne rien ; Sélectionner sélectionne les layers, puis « Sélectionnés » grisé jusqu'au changement de sélection | `c-clic`, `u4-selectionner`, `u4-selectionnes`, `u4-reactive` |
| U5 | Analyser Button, choisir « Tout » | Section Informations en dernier, repliée ; la ligne C53 de `Disabled` n'entre ni dans les nombres ni dans la pastille | `u5-informations` |
| U6 | Analyser un composant dont un seul variant lie ses layers, ouvrir la carte, cliquer « Proposer les liaisons » | Carte À corriger dans Couleurs ou Tailles et forme ; le chevron liste layers et tokens ; la carte disparaît, les corrections arrivent dans sa section, ouverte ; rien n'est écrit avant Appliquer | `c-carte-modele`, `c-carte-modele-ouverte`, `c-carte-modele-proposee` |
| U7 | Analyser Button et Alert | Une carte de contraste nomme le fond, le mode, le contraste, le seuil et la garantie ; « propriété » dans les phrases | `x-alert`, `x-button` |

### Architect, constats

| Sous-lot | Composant | Attendu |
|---|---|---|
| K1 | Button | Aucun C21 « lié autrement dans 12 autres variants » sur l'anneau des variants Focus |
| K2 | Button | Aucun C10 « 4 tokens écrivent Large » quand le dossier écrit `Large` |
| K3 | Alert | Le stroke d'Outlined lié à `foreground` ne donne plus C17 |
| K4, B2 | Button | Contraste mesuré sur `elevation/page` et `elevation/raised`, par mode ; À corriger sur un fond garanti, À vérifier sinon ; dans un fichier sans `elevation/raised`, l'information « Fond lu sur la page Figma » |
| K5, K6, B3 | Button | Le radius de `.Ring` lié à `Radius/lg` dans son composant principal ne donne plus C80 ; la couleur de l'anneau posée par un token de Button non plus |
| K7 | composant à C67 `propriete-absente` | Carte À corriger, plus À vérifier |
| B1 | Button | Aucun C45 pour `size`, `label`, `iconLeft`, `iconRight` ; `State` sans règle garde le sien |
| S1 | Stresstest | Un gap Auto (`SPACE_BETWEEN`) n'est plus une valeur en dur |
| S2 | Button, par l'Exporter | Contrat réexporté identique au précédent |
| 9de1021c | Button | Les tokens `Size/*` liés dans `.sizeWrapperButton` ne sont plus inutilisés (C32) |
| 9432cae8 | fichier où le thème écrit `Elevation/page` | Variable du thème reconnue, aucun constat nouveau |

### Palettes, une palette en Dark

| Sous-lot | Geste | Attendu | Galerie |
|---|---|---|---|
| P1, P2 | Ouvrir la carte des garanties et la réglette d'une palette en Dark | G2 à G6 ont une colonne « sur la page » et une colonne « sur la carte » ; planche et rapport comptent les promesses sur la carte | `courbe-hors-garantie-sur-la-carte`, `garantie-sur-la-carte-en-echec` |
| R-30 | Déplacer le réglage global de luminosité en Dark | La course est plus courte qu'avant P1 : décision acceptée, pas un défaut | — |

## 5. Questions ouvertes

| N° | Question | Quand |
|---|---|---|
| R-30 | Si la courbe Dark par défaut ne tient pas la carte : éclaircir la courbe, changer un cran de la table, ou rapprocher la carte de la page | Décidé le 29/10 : accepté, la courbe ne change pas |
