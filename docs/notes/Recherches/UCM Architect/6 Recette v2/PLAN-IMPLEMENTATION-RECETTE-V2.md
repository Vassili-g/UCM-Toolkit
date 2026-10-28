# Plan d'implémentation de la recette v2 d'Architect

Ce plan met en œuvre les décisions de [ANALYSE-RECETTE-V2.md](./ANALYSE-RECETTE-V2.md),
montrées par [MAQUETTE-RECETTE-V2.html](./MAQUETTE-RECETTE-V2.html). Chaque
sous-lot cite la section de l'analyse qui le décrit ; l'agent n'a pas à lire
le reste.

La conversation principale orchestre : elle lance les sous-lots, relit chaque
diff, fait relancer les vérifications, commite par chemins explicites et coche
les cases. Aucun agent ne pousse ni ne publie. La poussée et la publication
ont lieu une fois, au lot Z.

## 1. Règles d'exécution

### 1.1 Pistes et agents

| Piste | Écrit seulement | Agent |
|---|---|---|
| K · kit et moteur de couleur | `packages/kit/src/**`, `packages/kit/tests/**`, `packages/couleur/**`, hors `package.json` | Codex, dans son clone |
| S · socle et exporteur | `packages/plugin-socle/**`, `packages/plugin-exporter/**` | Claude 2, `implementeur-exigeant` |
| B · sandbox d'Architect | `packages/plugin-architect/src/**` hors `src/ui/`, ses tests hors `tests/interface/` | Claude 2, `implementeur` |
| U · interface d'Architect | `packages/plugin-architect/src/ui/**`, `galerie/**` | Claude 1, `implementeur-exigeant` |
| P · Palettes | `packages/plugin-palettes/**` ; mesure dans `_local/recette-v2/` | Claude 2, `implementeur` ou `implementeur-exigeant` selon le sous-lot |
| V · versions | `packages/{kit,cli,adapter-typescript}/package.json`, leurs README, `README.md` racine (pins), `package-lock.json` | orchestrateur |
| O · documents et plan | ce plan, CONTRIBUTING.md, FORMAT.md, CONCEPT.md, SPEC, cartes, invariants, spécification de Palettes | orchestrateur |

Au plus deux agents Claude à la fois : Claude 1 sur U, Claude 2 sur S, B et P.
Codex avance la piste K en parallèle, dans son clone. Un sous-lot qui doit
écrire hors de sa piste s'arrête et le dit.

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
- Il ne monte aucune version. Entre son commit et le lot V suivant, seul `versionSuitLeContenu` peut échouer, et seulement dans son clone.
- Vérifie : tests du kit (`npm run test:paquet -- kit`) ou du moteur (`npm run test:paquet -- couleur`), puis tests racine `node scripts/run-tests.cjs`.
- Avant sa limite, il commite l'étape verte en cours avec une ligne `Reste : …`, ou l'abandonne par `git restore`.

**Synchronisation**, par l'orchestrateur, quand aucun agent Claude n'a de sous-lot ouvert : `git -C A:\UCM-codex status`, `git fetch codex`, `git merge --no-edit codex/main`, lot V, `npm run build -w @ucm-kit/core`, cases cochées avec leurs hashes. Un sous-lot B, S, U ou P qui consomme un sous-lot K attend la synchronisation qui l'apporte.

### 1.4 États, commits et sessions voisines

- États : `[ ]` libre, `[~ Claude 1]`, `[~ Claude 2]`, `[~ Codex]` pris, `[x] (hash)` fait. L'orchestrateur coche aussi les cases de Codex à chaque synchronisation.
- Message de commit : `R2-<id> · <titre>`, puis la ligne `Vérifié : <commandes>`.
- D'autres sessions travaillent dans l'arbre partagé (vitesse de l'analyse, nommage de Palettes, préparation d'Architect). Avant chaque sous-lot, l'orchestrateur lance `git status` sur les fichiers du sous-lot. Un fichier déjà modifié hors de ce plan bloque le sous-lot : l'orchestrateur prend un autre sous-lot de la même piste, ou attend.
- Nature de la tâche, à nommer dans chaque prompt : « correction d'un défaut » exige un test qui échoue sans la correction ; « déplacement à sortie identique » exige les tests existants inchangés ; « écran nouveau » exige un état de galerie.
- Un texte d'écran absent de l'analyse s'écrit `TODO(texte)`. L'orchestrateur l'écrit ensuite.

### 1.5 Fichiers carrefours

| Carrefour | Parade |
|---|---|
| Versions du kit, de la CLI, de l'adaptateur | Lots V seulement, par l'orchestrateur |
| `packages/kit/src/controles/releve.ts`, types du relevé | K6.1 seul les change ; B3 les consomme après synchronisation |
| `packages/kit/src/controles/catalogue.ts`, type du catalogue | K4.1 seul le change ; B2 le remplit après synchronisation |
| `plugin-architect/src/releveDuComposant.ts` | S1.2 puis B3, tous deux Claude 2, en série |
| `plugin-architect/src/sandbox/analyse.ts` | B4 seul ; attend que la session de la vitesse l'ait commité |
| `plugin-architect/src/ui/textes/*.ts`, `src/ui/ignores/modele.ts`, `galerie/etats/*.cjs` | Piste U seule, Claude 1, en série |
| `plugin-architect/tests/loiDuVocabulaire.test.ts` | U7.3 seul |

## 2. Vagues

Chaque vague se termine par une synchronisation de Codex et un jalon. Une
case de la colonne Codex peut déborder sur la vague suivante sans bloquer
Claude, sauf là où une flèche le dit.

| Vague | Codex | Claude 1 (U) | Claude 2 (S, B, P) | Fin de vague |
|---|---|---|---|---|
| 0 | O0.2 (synchroniser son clone) | — | — | O0 |
| 1 | K1, K2, K3, K7 | U1 | S1 | Sync, V1, jalon J1 |
| 2 | K5, K8, K9 | U2 | P0, puis B1 | Sync, V2 ; le mainteneur tranche R-30 |
| 3 | K4, K6 | U3 | S2, puis B4 (← K8) | Sync, V3, jalon J3 |
| 4 | P1 (← R-30) | U4, puis U5 (← K7, K9) | B2 (← K4), puis B3 (← K6) | Sync, V4 |
| 5 | — | U6 (← B4, U4), puis U7 (← K4, B1) | P2 (← P1) | O1, jalon J5 |
| 6 | — | — | — | Z |

Chemin critique : K5 → K6 → B3, et P0 → R-30 → P1 → P2. Les lancer tôt.

## 3. Lots

### O0 · Préparation

Agent : orchestrateur.

- [ ] **O0.1** `git status` de l'arbre partagé. Noter dans ce plan les fichiers de §1.5 que d'autres sessions modifient, et les sous-lots qu'ils bloquent.
- [ ] **O0.2** Mettre le clone de Codex à jour : `git -C A:\UCM-codex pull --rebase partage main`. Lui transmettre le §1.3.
- [ ] **O0.3** Déplacer le rapport de Button (`ucm-architect-rapport-Button-*.json`, 5 Mo) dans `_local/recette-v2/`. Il sert de capture aux tests de K1 et B1, par extraits copiés en fixtures.

### Piste K · kit et moteur de couleur (Codex)

#### K1 · C21 écarte une liaison qui porte les valeurs de son variant

Analyse 7.1. Nature : correction d'un défaut.

- [ ] **K1.1** Test rouge dans `packages/kit/tests/controles-c21-modes.test.ts` : six variants Focus, quatre couleurs de statut liées à `Button/Color/<Statut>/Contained/Focus/ring` qui renvoie à `<Statut>/Vivid/ring`, deux de marque liées à `Button/Color/Primary/Contained/Focus/ring` qui renvoie à `Primary/ring`. Aucun C21 attendu.
- [ ] **K1.2** `ecartsDeFratrie` (`packages/kit/src/controles/mapping.ts:87`) : avant de grouper, écarter une liaison dont chaque segment de property du nom de token, lu par `segmentDAxe`, vaut la valeur du variant.
- [ ] **K1.3** Deux tests de plus : `Color=Primary` lié à `Color/Info/…` garde C21 ; un token sans segment de property, différent de ses voisins, garde C21.

#### K2 · C10 lit l'écriture des dossiers

Analyse 7.2. Nature : correction d'un défaut.

- [ ] **K2.1** Tests rouges dans `packages/kit/tests/nommageCalcul.test.ts` : `Size/Large/radius` tenu ; `Size/radius/Large` donne C10 attendu `lg` ; `Size/lg/radius` donne C10 attendu `Large`.
- [ ] **K2.2** `packages/kit/src/controles/nommage.ts:225` : l'écriture attendue vient de `termePourCategorie(terme, categorieDuSegment(nom, rang))` (`referentiel/termes.ts`, `referentiel/ecriture-des-mots.ts`).
- [ ] **K2.3** Loi dans `packages/kit/tests/` : aucun fichier de `src/controles/` ne compare un segment à `terme.id` hors de `termePourCategorie`.

#### K3 · C17 admet `foreground` sur un stroke

Analyse 8. Nature : correction d'un défaut.

- [ ] **K3.1** Tests rouges : stroke d'Alert Outlined lié à `Color/Info/Outlined/foreground`, aucun C17 ; stroke lié à un token `background`, C17 ; stroke d'un layer `ring` lié à `foreground`, C17.
- [ ] **K3.2** `rolesAdmis` (`mapping.ts:47`) : un stroke hors anneau admet `['border', 'foreground']`.

#### K7 · C67 devient une carte À corriger

Analyse 7.4. Nature : correction d'un défaut.

- [ ] **K7.1** `packages/kit/src/controles/typographie.ts:244` : C67 passe de `info` à `corriger`. Test dans `typographie.test.ts`.

#### K5 · Les sortes de composant imbriqué

Analyse 7.3, « Factoriser et documenter la notion ». Nature : code nouveau.

- [ ] **K5.1** `packages/kit/src/referentiel/composition.ts` : sortes `dependance`, `wrapper-de-dimensions`, `piece-interne`, `detail` ; type `FaitsDImbrique` (nom, règles d'utilisation trouvées, dimensions liées) ; `sorteDeLImbrique(faits)`, testée dans l'ordre de l'analyse. Export par `referentiel/index.ts` et la porte documentée du kit (`packages/kit/README.md`).
- [ ] **K5.2** Tests `packages/kit/tests/composition.test.ts` : `.sizeWrapperButton` avec dimensions liées donne `wrapper-de-dimensions` ; `.Ring` donne `piece-interne` ; un set nommé par `.componentRules` donne `dependance` ; un imbriqué sans préfixe ni règles donne `detail`.

#### K8 · Détection du modèle de liaisons

Analyse 4, « La carte ». Nature : code nouveau.

- [ ] **K8.1** `packages/kit/src/controles/propagation.ts` : `candidatsDeModele(releve, catalogue)` rend, par sorte (`couleurs`, `tailles`), le variant qui porte le plus de liaisons de cette sorte, à égalité le premier du jeu ; les layers en dur ailleurs ; le nombre de liaisons que `proposerLaPropagation` proposerait. Rien si ce nombre vaut zéro.
- [ ] **K8.2** Constat `C81`, famille `liaisons` ou `tailles`, type `corriger`, faits `{ modele, layers, variants, liaisons }`, sans correction. Vérifier que `C81` est libre dans `PREPARATION-ARCHITECT.md` avant de le prendre.
- [ ] **K8.3** Tests dans `propagation.test.ts` : un variant lié et 3 en dur donnent un C81 ; tous liés, aucun ; aucun lié, aucun.

#### K9 · Le signe de la section Informations

Analyse 7.4. Nature : code nouveau.

- [ ] **K9.1** `packages/kit/src/referentiel/signes.ts` : signe `information`, une note grise (tracé de la maquette, cadre 7f), famille des sortes de proposition. Test dans `signes.test.ts`.

#### K4 · Contraste sur la page et la carte, sévérité selon les garanties

Analyse 7.5. Nature : correction d'un défaut.

- [ ] **K4.1** Type du catalogue (`controles/catalogue.ts`) : champ facultatif `fondsDElevation`, par mode du thème, `{ page, carte }` en couleur résolue, ou absent. Aucun lecteur ne change encore.
- [ ] **K4.2** `fondEffectif` et `calculerLeFond` (`controles/accessibilite.ts:474`) : sans fill opaque dans le variant, mesurer contre la page et contre la carte, dans chaque mode. Sans `fondsDElevation`, repli sur un fond de page fourni par le relevé.
- [ ] **K4.3** Sévérité : suivre l'alias du premier plan jusqu'à la variable du thème, chercher la variable et le fond dans `GARANTIES` (`emplois/garanties.ts`). Garanti : `corriger`. Non garanti, variable hors thème ou repli : `verifier`. Faits : `fond` (`page`, `carte` ou `page-figma`), `mode`, `variableDuTheme`, `garanti`.
- [ ] **K4.4** Tests dans `accessibilite.test.ts` : stroke `page/border` à 2,4:1 sur la page en Dark, `corriger` ; même stroke à 2,7:1 sur la carte, `verifier` ; sans `fondsDElevation`, `verifier` avec `fond: 'page-figma'` ; ancien cas `fond-indetermine` remplacé.

#### K6 · La pièce interne dans C80

Analyse 7.3, « Décision ». Dépend de K5. Nature : correction d'un défaut.

- [ ] **K6.1** `controles/releve.ts` : `LiaisonLue` reçoit `origine?: 'maitre' | 'surcharge'` et le layer imbriqué reçoit `sorte?: SorteDImbrique`. Champs facultatifs : un relevé ancien reste lisible.
- [ ] **K6.2** `controlerCouches` (`controles/couche.ts:60`) : une liaison `origine: 'maitre'` d'une `piece-interne` ou d'un `wrapper-de-dimensions` vers `theme` ou `layout` ne donne pas C80. Une `surcharge` reste jugée comme un layer de l'hôte.
- [ ] **K6.3** Tests dans `controles-composant.test.ts` : radius de `.Ring` lié à `Radius/lg` dans le maître, aucun C80 ; couleur surchargée par un token de Button, aucun ; couleur surchargée par `layout`, C80.

#### P1 · Les garanties sur la carte

Analyse 10. Dépend de P0 et R-30. Nature : code nouveau.

- [ ] **P1.1** `packages/kit/src/emplois/garanties.ts` : `FOND_DE_LA_CARTE` rejoint les fonds de G2 à G6. Tests `garanties.test.ts`.
- [ ] **P1.2** `packages/couleur/src/garantie.ts` : la garantie des courbes juge aussi contre la carte en Dark (`couleurDeLaCarte`). Tests `garantie.test.ts`.
- [ ] **P1.3** `packages/couleur/tests/promesses.test.ts`, `limites.test.ts` : 21 promesses par mode et par intensité ; la limite dynamique prend la carte.
- [ ] **P1.4** Si R-30 change la courbe Dark, la table des dossiers ou la carte : la case suit R-30, avec ses tests. Sinon, case barrée.

### Piste S · socle et exporteur (Claude 2)

#### S1 · Un espacement sans effet n'est pas une valeur en dur

Analyse 9. Agent : `implementeur-exigeant` (trois lecteurs d'une règle). Nature : correction d'un défaut.

- [ ] **S1.1** `packages/plugin-socle/src/composant/contract/nodeBindings.ts` : exporter `espacementSansEffet(noeud, champ)`, bâti sur `inapplicableReason`. L'exporteur l'emploie à la place de ses appels directs. Tests du socle inchangés, plus un test de la fonction.
- [ ] **S1.2** `plugin-architect/src/releveDuComposant.ts:159` et `src/lectureDuComposant.ts:198` sautent un espacement sans effet. Tests rouges dans `releveDuComposant.test.ts` et `lectureDuComposant.test.ts` : auto layout `SPACE_BETWEEN`, `itemSpacing` 10, aucune valeur en dur.

#### S2 · L'exporteur classe ses imbriqués par le kit

Dépend de K5 (V2). Agent : `implementeur-exigeant`. Nature : déplacement à sortie identique.

- [ ] **S2.1** Dans `packages/plugin-socle/src/composant/contract/`, la reconnaissance du wrapper de dimensions et des dépendances relève les faits de `FaitsDImbrique` et appelle `sorteDeLImbrique`. Les contrats des fixtures restent identiques à l'octet.
- [ ] **S2.2** Test qui refuse une reconnaissance d'imbriqué hors de `sorteDeLImbrique`, dans le socle et dans Architect.

### Piste B · sandbox d'Architect (Claude 2)

#### B1 · C45 voit les props du wrapper

Analyse 7.6. Agent : `implementeur`. Nature : correction d'un défaut.

- [ ] **B1.1** Test rouge dans `plugin-architect/tests/regles.test.ts`, d'après le rapport de Button : jeu `Color`, `Variant`, `State` ; wrapper `.sizeWrapperButton` à `Size`, `Label`, `Icon-Left`, `Icon-Right` ; règles `size`, `label`, `iconLeft`, `iconRight`. Aucun C45 `sans-propriete`. `State` sans règle garde son C45.
- [ ] **B1.2** `lireLesRegles` (`src/regles.ts:150`) : ajouter à `surface` les clés des props que le moteur fusionne depuis le wrapper de dimensions, lues dans `ResultatInterne`.

#### B4 · La carte de modèle côté sandbox

Analyse 4. Dépend de K8 (V2). Agent : `implementeur`. Nature : code nouveau.

- [ ] **B4.1** `src/sandbox/analyse.ts` : ajouter les C81 de `candidatsDeModele` aux constats de l'analyse, après `proposerLesCorrections`.
- [ ] **B4.2** `servir-de-modele` (`src/sandbox/corrections.ts:83`) accepte le variant des faits de C81 ; la réponse `modele-propose` retire le C81 d'origine. Test dans `corrections.test.ts`.

#### B2 · Les fonds d'élévation au catalogue

Analyse 7.5, « D'où vient la valeur ». Dépend de K4 (V3). Agent : `implementeur`. Nature : code nouveau.

- [ ] **B2.1** `src/catalogue.ts` : trouver `elevation/page` et `elevation/raised` par leur nom dans la collection de rôle `theme`, importer leurs valeurs par mode en suivant les alias, remplir `fondsDElevation`. Deux imports par analyse au plus.
- [ ] **B2.2** Sans ces variables, `figma.currentPage.backgrounds` en repli, et le relevé le porte. Tests dans `catalogue.test.ts`.

#### B3 · L'origine des liaisons d'un imbriqué

Analyse 7.3. Dépend de K5 et K6 (V3). Agent : `implementeur-exigeant`. Nature : correction d'un défaut.

- [ ] **B3.1** `src/releveDuComposant.ts` : pour un layer d'instance imbriquée, relever `FaitsDImbrique` et la `sorte` par `sorteDeLImbrique`.
- [ ] **B3.2** Marquer chaque liaison `origine: 'maitre'` ou `'surcharge'`, en comparant à la liaison du layer homologue dans le composant principal, lu une fois par composant principal et par demande. Test dans `releveDuComposant.test.ts`.
- [ ] **B3.3** Mesurer le coût sur la capture de Button (`scripts/rejouer-la-capture.ts`). Au-delà de 5 % du relevé, le dire avant de commiter.

### Piste U · interface d'Architect (Claude 1, `implementeur-exigeant`)

Chaque sous-lot U met à jour ses états de galerie et les nomme dans son compte
rendu. Le mainteneur vérifie l'interface lui-même.

#### U1 · Fenêtre, barre et Configuration

Analyse 1. Nature : correction d'un défaut.

- [ ] **U1.1** Largeurs : `src/fenetre.ts` (500 px à l'ouverture et en minimum, panneau à 640 px, fenêtre ouverte à 1144 px), `src/sandbox/commun.ts` (taille rangée remontée à 500 px), `src/ui/application.ts` (`basculerLePanneau`), `src/ui/composant/corps.ts` (bornes de la vue et du panneau), `src/ui/styles/composant.css` (`min-width`). Tests `fenetre.test.ts`.
- [ ] **U1.2** Barre compacte en mode Composant (`src/ui/barre.ts`) : sans logo ni nom, Analyser avec son libellé, Constats en icône et pastille, Configuration en icône. Analyser désactivé sans composant sélectionné, bulle « Sélectionnez un composant dans Figma » (`selectionSurLAnalyse`, `src/ui/composant/analyse.ts:78`). Test : sélection vide, bouton désactivé.
- [ ] **U1.3** Frontière (`src/ui/composant/corps.ts:47`) : suivi sur `window` en phase de capture, fin au relâchement ou à la sortie de la fenêtre, sur le modèle de `src/ui/poignee.ts`.
- [ ] **U1.4** Configuration (`ouvrirLaConfiguration`, `src/ui/application.ts:187` ; `src/ui/nomenclature/coquille.ts`) : bascule `aria-pressed` ; même mode ; à la place du panneau quand il est ouvert, de la vue sinon, en une colonne sous 640 px ; le second clic rend l'écran précédent.
- [ ] **U1.5** Test : Analyser ne change pas `etat.panneau.ouvert`. Si le test passe, le dire : la cause vue en recette reste à reproduire dans Figma.

#### U2 · Changer de variant sans saut, chevron des sections

Analyse 2. Nature : correction d'un défaut.

- [ ] **U2.1** `src/ui/vues/composant.ts` : pour un autre variant du même jeu, garder l'ancienne lecture pendant la lecture, avec la barre fine sous l'en-tête. L'écran « Lecture du composant… » reste pour un nouveau composant.
- [ ] **U2.2** Mise à jour par clé dans `rendre()` : en-tête, section Variants et lignes de tokens gardent leurs nœuds ; sections ouvertes, filtre et défilement gardés ; aperçu à hauteur constante, image remplacée une fois chargée.
- [ ] **U2.3** Une valeur changée est surlignée 600 ms (classe et style dans `src/ui/styles/composant.css`).
- [ ] **U2.4** Chevron des en-têtes de section de la liste à droite, après le titre et le nombre.
- [ ] **U2.5** Test DOM dans `composant.test.ts` : après un changement de variant, les nœuds des lignes communes sont les mêmes objets.

#### U3 · Les variants en valeurs seules, tableau retiré

Analyse 3 et 5. Nature : écran nouveau.

- [ ] **U3.1** Puce de valeur : la valeur seule, la paire exacte de Figma en `title` ; la property reste dans la puce quand deux properties du jeu partagent cette valeur. Une fonction, dans `src/ui/composant/`, que tous les écrans emploient.
- [ ] **U3.2** Section Variants (`src/ui/composant/variants.ts`) : retirer la ligne Affiché, le bouton Tableau et `basculerLeTableau` (`src/ui/vues/composant.ts:423`), le rendu croisé, le bouton de copie et leurs textes.
- [ ] **U3.3** Constats (`src/ui/ignores/modele.ts:101`, `src/ui/corrections/modele.ts`, `src/ui/corrections/index.ts`, `src/ui/questions/index.ts`) : la phrase ne nomme plus le variant ; la ligne de lieu donne le nombre de variants, puis les puces des seules paires partagées. « Tous les variants désactivés » disparaît.
- [ ] **U3.4** Liste avant / après d'une carte de correction : la valeur en dur d'abord, puis le variant en puces.
- [ ] **U3.5** États de galerie mis à jour ; ceux du tableau retirés.

#### U4 · Ligne d'actions et Sélectionner

Analyse 4 et 6. Nature : écran nouveau.

- [ ] **U4.1** Carte de constat et de question : chevron en haut à droite, sur la ligne de la sévérité ; ligne d'actions en bas, sous le texte (`src/ui/ignores/index.ts`, `src/ui/questions/index.ts`).
- [ ] **U4.2** Bouton Sélectionner, signe `selection` du kit, sur toute carte qui vise des layers. Après le clic, « Sélectionnés », désactivé jusqu'au prochain message `selection` du sandbox. Une carte de correction le porte dans son corps déplié.
- [ ] **U4.3** Ouvrir une carte ne sélectionne plus rien : retirer les appels de `src/ui/corrections/index.ts:400`, `:464` et `src/ui/ignores/index.ts:158`. Tests `ignores.test.ts`, `corrections.test.ts`.

#### U5 · La section Informations

Analyse 7.4. Dépend de K7 et K9 (V2). Nature : écran nouveau.

- [ ] **U5.1** `src/ui/panneau/elements.ts` : un constat `info` sort des éléments, des nombres, de « Tout », du sommaire et de la pastille de Constats.
- [ ] **U5.2** `src/ui/panneau/rendu.ts` : section Informations en dernier, signe `information`, repliée à l'arrivée ; une ligne par information, avec sa ligne de lieu et Sélectionner quand elle vise des layers.
- [ ] **U5.3** Textes des lignes : C53 « Contraste non mesuré sur `Disabled`, que WCAG exempte. » ; C49 et C50 avec limite, leur cause ; borne, le nombre de paires non mesurées ; repli sur la page Figma, « Fond lu sur la page Figma : `elevation/raised` est introuvable. » Tests `panneauElements.test.ts`.

#### U6 · La carte de modèle

Analyse 4. Dépend de B4 et U4. Nature : écran nouveau.

- [ ] **U6.1** Carte C81 dans la section de sa sorte : « 4 layers ont une couleur en dur dans 215 variants. » ; ligne de lieu « Un variant les lie déjà : » et les puces du modèle ; action « Proposer les liaisons ».
- [ ] **U6.2** Le chevron déplie la liste des layers et de leur token dans le modèle (cadre 4f).
- [ ] **U6.3** Le clic envoie `servir-de-modele` avec le variant des faits ; les corrections arrivent dans la même section, ouverte. Test dans `corrections.test.ts`.

#### U7 · Les textes des constats

Analyse 7.5, 7.6. Dépend de K4 (V3) et B1. Agent : `implementeur`, puis `executant` pour U7.3.

- [ ] **U7.1** Contraste (`src/ui/textes/ignores.ts`) : deux phrases, fond garanti et fond non garanti, d'après l'analyse 7.5 ; elles nomment le fond, le mode, le contraste, le seuil et la garantie.
- [ ] **U7.2** C45 : « La règle `label` ne correspond à aucune propriété de Button. » ; action « Donnez-lui le nom exact de la propriété, ou supprimez-la ».
- [ ] **U7.3** « property » devient « propriété » dans les phrases de `src/ui/textes/` (lignes 141, 144 et 159 d'`ignores.ts`) ; les noms de types de Figma restent. `tests/loiDuVocabulaire.test.ts` admet « propriété ».

### Piste P · Palettes (Claude 2)

#### P0 · Mesurer la courbe Dark contre la carte

Analyse 10, « Ce que la carte change ». Agent : `implementeur`. Nature : mesure, aucun fichier versionné.

- [ ] **P0.1** Script `_local/recette-v2/mesure-carte.ts`, sur `packages/couleur` : pour les quatre combinaisons de texte des boutons, les deux profils et 360 teintes, le contraste en Dark de `solid/default`, `surface/foreground`, `surface/border`, `page/foreground` et `page/border` contre la carte (`couleurDeLaCarte`). Rendre le pire cas par variable et le nombre de teintes sous le seuil.
- [ ] **P0.2** Sur les 14 références de la spécification de Palettes, la largeur des curseurs du Color shift et du réglage global avant et après l'ajout de la carte (`limiteDynamique`).
- [ ] **P0.3** L'orchestrateur reporte les deux tableaux dans l'analyse, section 10, et pose R-30 au mainteneur.

#### P2 · Palettes montre les garanties sur la carte

Analyse 10, « Ce que le changement touche ». Dépend de P1 (V4). Agent : `implementeur-exigeant`.

- [ ] **P2.1** Carte des garanties et réglette (`src/ui/modeleDesGaranties.ts`, réglette) : les colonnes « sur la page » et « sur la carte » de G7 servent à G2 à G6. Tests `modeleDesGaranties.test.ts`.
- [ ] **P2.2** Planche (`src/planche/modele.ts`) et rapport (`src/rapport.ts`) : les promesses sur la carte s'ajoutent. Tests `modeleDePlanche.test.ts`, `rapport.test.ts`.
- [ ] **P2.3** Textes en français et en anglais (`src/i18n/fr.ts`, `en.ts`) : 64 et 32 contrôles deviennent 84 et 42. Agent : `executant`.
- [ ] **P2.4** États de galerie de Palettes mis à jour.

### Lots de l'orchestrateur

#### V · Versions

- [ ] **V1** Après la synchronisation de la vague 1 : kit, CLI et adaptateur montés, pins, READMEs, lock.
- [ ] **V2** Vague 2.
- [ ] **V3** Vague 3.
- [ ] **V4** Vague 4.

#### O1 · Documents

- [ ] **O1.1** CONTRIBUTING.md : un variant s'écrit en puces de valeur, la paire exacte au survol ; « propriété » dans la table des termes ; la section Informations, seule exception à la règle « aucun constat sans geste » ; la ligne d'actions d'une carte de constat.
- [ ] **O1.2** CONCEPT.md, section 2 : la pièce interne, en une phrase. FORMAT.md, « Composition et dépendances » : renvoi à `sorteDeLImbrique`. `packages/kit/invariants/referentiel.md` : la règle.
- [ ] **O1.3** Architect : `SPEC.md`, `README.md`, `CARTE.md`, `invariants/explorateur.md`, d'après `npm run agents:diff`.
- [ ] **O1.4** Spécification de Palettes, section 11.2, `[VER-21]`, `[ENT-10]` : les garanties sur la carte et les nouveaux nombres.
- [ ] **O1.5** README du dossier `UCM Architect` : ligne de ce plan.

#### Jalons

- [ ] **J1** `verificateur` : `npm test`, `npm run typecheck`, `npm run build`, sur l'arbre après V1.
- [ ] **J3** Même vérification après V3.
- [ ] **J5** Même vérification après O1, puis `npm run build:plugin -- architect` et `npm run build:plugin -- palettes`.

#### Z · Clôture

- [ ] **Z.1** Liste des écrans à vérifier pour le mainteneur, sous-lot par sous-lot, et recette Figma : Button, Alert, Stresstest, une palette en Dark.
- [ ] **Z.2** Après la recette : poussée unique et publication du kit, de la CLI et de l'adaptateur, avec la skill `publier-paquets`. À coordonner avec le lot 15 de la vitesse de l'analyse, qui pousse et publie aussi.

## 4. Questions ouvertes

| N° | Question | Quand |
|---|---|---|
| R-30 | Si la courbe Dark par défaut ne tient pas la carte : éclaircir la courbe, changer un cran de la table, ou rapprocher la carte de la page | Après P0 |
