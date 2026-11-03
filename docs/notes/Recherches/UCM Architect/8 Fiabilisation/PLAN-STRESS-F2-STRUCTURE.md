# Plan de stress test F2, structure du mode Tokens

Ce plan décrit le harnais qui mesure les contrôles de structure du mode Tokens sur 988 cas fabriqués, depuis le constat du kit jusqu'à la case décochée à l'écran. Il ne corrige aucun code : il produit la mesure de l'existant, puis des tests de régression en attente des corrections. Il prolonge la famille F2 de [INVENTAIRE-VERIFICATIONS.md](./INVENTAIRE-VERIFICATIONS.md) (sections 3, 6.2, 7 et 8).

## 1. Portée

| Contrôle | Source | Genres couverts |
|---|---|---|
| C60 | `packages/kit/src/controles/theme.ts` (`controlerLesModes`) | alias vers une autre branche de mode |
| C63 | `packages/kit/src/controles/structure.ts` (`controlerLeCatalogue`) | `alias-supprime`, `library-inactive`, `sans-valeur-en-mode`, `couleur-sans-alias`, scopes de `theme`, doublons d'échelle |
| C82 | `packages/kit/src/controles/integrite.ts` (`controlerLIntegriteUcm`) | `variable-absente`, `cran-absent`, `cran`, `mode-du-theme`, `couche`, `valeur-directe`, `scopes`, `type`, `mal-rangee` |
| Assemblage | `packages/plugin-architect/src/sandbox/structure.ts` | dédoublonnage, ignorés, corrections retenues, lecture qui échoue |
| Écran | `packages/plugin-architect/src/ui/structure/` (`lecture.ts`, `aFaire.ts`, `corrections.ts`) | genres déclarés, cartes, cases cochées, textes de saut |

Hors plan. Les corrections du code (E-19 à E-24 compris), les contrôles du mode Composant (C63 `vide` et `theme`), la Nomenclature, la migration d'un fichier Figma et `test:ui`.

## 2. Oracle

### 2.1 Principe

L'oracle est écrit à partir des opérateurs de dégradation et du référentiel (`TABLE_DES_DOSSIERS`, `SUPPORT_DES_VARIABLES`, `CIBLES_DES_COLLECTIONS`, `COLLECTIONS_SANS_PORTEE`), jamais en rejouant le code mesuré. Chaque opérateur déclare ce qu'il casse et ce que le plugin doit dire. L'oracle ne juge pas la table du référentiel elle-même.

Chaque cas porte un verdict.

| Verdict | Sens |
|---|---|
| `attendu` | La règle est écrite (inventaire, référentiel, décision Q). Un écart est un défaut. |
| `mesure` | La règle dépend d'une réponse du mainteneur (section 9). Le rapport compte l'écart à part et ne le qualifie pas. |

### 2.2 Correction exacte

Une correction est exacte quand les quatre conditions tiennent. Une règle écrite la produit. Un seul candidat répond. La cible est locale et présente. Le sens de la palette se lit dans les alias des autres rôles, jamais dans une teinte. Hors de ces conditions, l'oracle attend un constat sans correction. S'il attend une question, elle ne présélectionne aucune réponse.

### 2.3 Propriétés

| Id | Assertion vérifiable | Constats, écarts, décisions |
|---|---|---|
| P1 | Les 85 thèmes valides de la section 4 ne produisent aucun constat de `controlerLeCatalogue` ni de `controlerLIntegriteUcm`. | tous |
| P2 | Chaque dégradation fait émettre les constats que son opérateur déclare, avec le code, le genre, la variable et le mode attendus (colonne « manqués »). | tous |
| P3 | Aucun constat n'est émis hors de ceux que l'opérateur déclare (colonne « faux constats »). | tous |
| P4 | Une correction est émise si et seulement si l'oracle la juge exacte. Sinon le constat n'a pas de correction, et sa question ne présélectionne rien (colonne « corrections inexactes »). | règle produit |
| P5 | `cible`, `avant` et `apres` d'une correction égalent ceux de l'oracle, soit le cran de la table pour le sens lu dans les alias des rôles non dégradés. | C60, C82 `cran`, `variable-absente` |
| P6 | Remplacer toutes les couleurs des primitives ne change aucun constat. Un rôle déplacé ne vote pas pour le sens de sa propre palette. | règle « sens dans les alias » |
| P7 | Appliquer les corrections exactes au catalogue, puis relire, donne zéro constat de leurs genres et aucun constat nouveau. | C60, C63 scopes, C82 `cran`, `scopes`, `variable-absente` |
| P8 | Mélanger l'ordre des variables, renommer les clés ou changer l'écriture des noms laisse les mêmes constats, aux noms près. L'entrée n'est pas modifiée. Les identifiants sont uniques et stables d'un appel à l'autre. | tous |
| P9 | Tout constat émis et non ignoré se lit à l'écran, soit dans `lireLesConstats`, soit par la carte de sa correction dans `lireLesCorrections` (colonne « non affichés »). | E-20, E-21 |
| P10 | Tout genre émis appartient à `GENRES_DECLARES` et à `GROUPE_DU_GENRE`. Une question de C60 a un genre. | E-20 |
| P11 | Ignorer la proposition d'un constat retire la correction et laisse le constat visible, avec une phrase et un statut non vides. Ignorer le constat le range sous Ignorés, et « Ne plus ignorer » le rend. | E-21, C63 scopes |
| P12 | Toute correction arrive décochée au premier affichage, à la relecture et après l'ajout d'une correction. Le pied dit qu'aucune n'est cochée et Appliquer est inactif. Chaque section porte « Tout cocher » et « Tout décocher ». | Q-03, E-22 |
| P13 | Un catalogue qui lève, un catalogue `null` sur un fichier UCM ou des réglages qui lèvent donnent un message `structure` qui le dit. L'écran n'affiche pas « Rien à faire », les ignorés ne réapparaissent pas et l'écriture choisie reste. | E-23 |
| P14 | Chaque motif de `MotifDeStructureSaute` a un texte lisible dans `TEXTES.motifDeSaut`. | E-24 |
| P15 | Une variable de `theme` qui n'est aucun rôle UCM donne une question qui nomme le rôle le plus proche, sans réponse présélectionnée. Si ce rôle manque à la palette, aucune création n'est proposée pour lui. | Q-07, E-19 |
| P16 | Aucun contrôle ne lève sur une entrée dégradée (cycle d'alias, clé en double, collection orpheline, nom vide). | robustesse |
| P17 | Hors UCM (`architecture` libre), le sandbox rend des listes vides et l'interface ne monte aucun onglet de structure. | inventaire, section 3 |

### 2.4 Colonnes du rapport

| Colonne | Définition |
|---|---|
| Attendus | Constats que l'oracle déclare pour les cas de l'opérateur. |
| Détectés | Attendus que le plugin émet avec le bon code, genre, variable et mode. |
| Manqués | Attendus que le plugin n'émet pas (P2). |
| Faux constats | Constats émis que l'oracle ne déclare pas (P3). |
| Corrections inexactes | Corrections émises à tort, vers une mauvaise cible, ou qui ne convergent pas (P4, P5, P7). |
| Non affichés | Constats émis sans trace à l'écran (P9, P10, P11). |
| Cochées | Corrections cochées à l'affichage (P12). |
| En attente | Écarts sur des cas `mesure`, comptés à part. |

## 3. Générateur

### 3.1 Thème de base

Le générateur construit un `CatalogueDeReference` à partir du référentiel du kit. Le fichier `catalogueDeStructure.ts` existant ne convient pas. Il omet `surface/subtle`, `surface/divider` et `neutral/page/foreground` à dessein, et ses variables de `brands` n'ont pas de `valeurs`, ce qui déclencherait `sans-valeur-en-mode` partout.

| Couche | Contenu du thème de base |
|---|---|
| `primitives` | `color/<famille>/<mode>/<cran>`, une couleur directe par cran, aucun scope, un mode. |
| `brands` | Une rampe `<marque>/<mode>/<cran>` par marque, en alias vers `primitives`, deux modes de marque, aucun scope. |
| `utility` | `neutral/<mode>/<cran>` plus `white` et `black`, `elevation/<mode>/{page,raised}`, et `<statut>/<profil>/<mode>/<cran>`, en alias vers `primitives`, aucun scope. |
| `theme` | Pour chaque palette les 15 rôles de `VARIABLES_DE_PALETTE`. Pour le neutre, les 4 rôles de `VARIABLES_DU_NEUTRE`. À la racine, les 3 rôles de `VARIABLES_GLOBALES` et `elevation/page` et `elevation/raised`. Un alias par mode `light` et `dark`, au cran de `TABLE_DES_DOSSIERS`, avec les scopes de `SUPPORT_DES_VARIABLES`. |
| `layout` | `sizing/<n>` en FLOAT, valeurs strictement croissantes, une valeur par mode. |
| `components` | Un composant dont chaque couleur est un alias vers `theme`, avec un segment `color`. |

Les 11 crans requis sont 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 et 950. Chaque variable a une valeur dans chaque mode de sa collection. Les clés sont `collection|nom`, comme dans la fixture existante. Les couleurs des primitives viennent d'un tirage de la graine, sans lien avec le cran, pour que P6 puisse les remplacer.

Le générateur écrit les noms avec `assembler`, `decouperSegment` et `motsAvecCasse` du kit, donc une écriture ne dépend que de la convention choisie. Chaque thème rend aussi une carte (`CarteDuTheme`) qui donne, pour chaque palette, son sens par mode et la clé de chaque variable par rôle et par mode. Les opérateurs et l'oracle lisent cette carte.

### 3.2 Profils de base

| Dimension | Valeurs | Nombre |
|---|---|---|
| Palettes | minimale (une marque et le neutre), moyenne (2 marques, neutre, 4 statuts en `soft` et `vivid`), large (3 marques, neutre, 4 statuts en `soft`, `vivid` et sans profil) | 3 |
| Écriture | minuscules et tiret, capitales initiales et tiret, minuscules et souligné | 3 |
| Collection redite en tête de nom | oui ou non | 2 |
| Sens | toutes les palettes en sens normal, ou mélange avec au moins une palette en sens inverse sur les deux modes | 2 |
| Rampes de library | locales, ou rampes de `brands` marquées `distante` avec une library choisie | 2 |

Le produit donne 72 profils (p01 à p72). Les opérateurs de la section 3.3 s'appliquent à un seul profil de référence, P0 : palettes moyennes, écriture minuscules et tiret, collection non redite, rampes locales, `secondary` en sens inverse. P0 fait partie des 72. Les nombres de la section 3.3 sont des cas sur P0, et chaque cas se nomme `<opérateur>-<n>`. Les combinaisons de la section 3.4 tournent sur 3 profils, P0, un profil minimal en capitales initiales (p37) et un profil large tiré de la graine.

### 3.3 Opérateurs de dégradation

Le verdict est `attendu` sauf mention contraire. « Corr. » dit si l'oracle attend une correction exacte.

**Rôles (C82 `variable-absente`)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| R1 | Un rôle retiré avec une écriture choisie. 15 rôles de palette en sens normal et inverse, 4 rôles du neutre, 3 globales, 2 élévations. | 39 | `variable-absente` du rôle et de la palette | oui, création avec un alias par mode, au cran de la table pour le sens lu |
| R2 | Un rôle retiré, aucune écriture choisie. 8 rôles tirés. | 8 | `variable-absente`, raison `sans-ecriture` | non |
| R3 | Palette réduite à une variable à une rampe, à une variable qui vise deux rampes, sans aucun alias. | 3 | `variable-absente` pour chaque rôle, raisons `sens-inconnu`, `prefixes-multiples`, `sans-jumelle` | seulement pour un rôle dont le cran est le même dans les deux sens |
| R4 | Un rôle ignoré dans tout le fichier (3 rôles). | 3 | aucun constat ne cite le rôle | non |

**Crans (C82 `cran`, `cran-absent`)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| K1 | Cran déplacé d'un pas (14 rôles, 2 sens, 2 modes). `solid/foreground` est en K3. | 56 | `cran` sur la variable et le mode, avec `avant` et `attendu` | oui, vers la variable de la même rampe au cran de la table |
| K2 | Rôle aliasé vers la rampe d'une autre palette, au bon cran (5 rôles, 2 modes). | 10 | `mesure` (Q-F2-2) | `mesure` |
| K3 | Couleur absolue inversée. `solid/foreground` en Light et Dark (`mesure`, Q-F2-3), puis `scale/0`, `scale/1000` et `page/foreground-main` dans les deux modes. | 8 | `cran` vers l'absolue de la table | oui pour les 6 cas `attendu` |
| K4 | Sens ambigu. Moitié des rôles en normal, moitié en inverse, dans les deux modes (`mesure`, Q-F2-3). Même palette avec un rôle sur un cran d'aucune table, dans les deux modes. | 4 | pour les 2 derniers cas, une question à deux candidats sur le rôle hors table | non |

**Modes (C60 et `mode-du-theme`)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| M1 | Un rôle aliasé vers l'autre branche de mode, au cran de cette branche. 6 rôles, 2 modes, 2 places du mode. La place « chemin » est la fixture (`brands/primary/dark/300`, modes de marque). La place « modes » est une collection cible aux modes Light et Dark. | 24 | C60 sur la variable et le mode | oui, même rampe dans la bonne branche |
| M2 | Même dégradation avec la cible attendue absente (4 cas) ou un alias qui boucle (1 cas). | 5 | C60 sans correction, lisible en À faire | non |
| M3 | Un rôle aliasé vers l'autre branche, au même cran. 2 rôles, 2 modes. | 4 | C60 | oui, bonne branche au cran de la table |
| M4 | Modes de `theme` renommés `Clair` et `Sombre`, `light` seul, `dark` seul, `Mode 1`, `light-mode`, `light` en double, `Day` et `Night`, et `light`, `dark` plus `high-contrast` (`mesure`). | 8 | `mode-du-theme` avec le mode manquant, ou `les-deux` | non |

**Alias, library, valeurs (C63)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| L1 | Cible d'alias supprimée. 9 variables (4 de `theme`, 2 de `brands`, 2 de `utility`, 1 de `components`), dans un mode puis dans les deux. | 18 | `alias-supprime` par variable et par mode. La voisine citée a le même rôle dans une autre palette, ou n'est pas citée. | non |
| L2 | Cible ou collection cible inaccessible, library choisie (4 palettes, 2 formes). Même cas sans library (2 cas, `mesure`, Q-F2-8). | 10 | `library-inactive` avec le nom de la library | non |
| L3 | Rampe de library avec un cran déplacé (2 cas), un rôle retiré (2 cas), un scope posé (2 cas). | 6 | `cran` sans correction, `variable-absente` raison `cible-de-library`, aucun constat de scope sur une variable distante | non |
| L4 | Valeur absente dans un mode. 8 variables de couches différentes. Puis `valeurs` entièrement absentes sur une variable `presente` (`mesure`). | 9 | `sans-valeur-en-mode` par mode vide | non |
| L5 | Couleur de `components` en valeur directe, dans un mode, dans deux modes, avec la forme tolérée `Colors`, avec la forme `Colour`. Même couleur sans segment de famille. | 5 | `couleur-sans-alias` par mode, aucun pour le dernier cas (règle écrite) | non |

**Scopes**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| S1 | Scope faux sur chacun des 24 rôles de `theme` (`ALL_SCOPES` ou un scope d'un autre support). | 24 | C63 `scopes` | oui, scopes de `SUPPORT_DES_VARIABLES` |
| S1b | Scopes vides où le support en attend, 4 rôles. | 4 | C63 `scopes` | oui |
| S1c | Scope en trop, sur-ensemble du support, 4 rôles. | 4 | C63 `scopes` | oui |
| S2 | Scope posé sur une couleur de `primitives`, `brands` ou `utility` (3 collections, 3 ensembles de scopes). Une variable FLOAT. Une variable distante. | 11 | C82 `scopes` sauf pour la variable distante | oui, retrait |

**Couches, types, rangement (C82)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| Y1 | Alias de couleur d'une couche vers une autre : 5 sources (`theme`, `brands`, `utility`, `primitives`, `components`) pour 5 cibles. Plus une cible dans une collection sans rôle. | 26 | `couche` pour les 19 paires interdites, aucun constat pour les 6 admises et pour la collection sans rôle | non |
| Y2 | Couleur directe dans `theme`, `brands` et `utility`, dans un mode puis dans deux. Un témoin de valeur `null`. | 7 | `valeur-directe` par mode, aucun pour `null` | non |
| Y3 | Rôle de `theme` en FLOAT, STRING ou BOOLEAN (4 rôles). | 12 | `type` | non |
| Y4 | Rôle de palette rangé hors de `theme`. 5 collections (`brands`, `utility`, `primitives`, `layout`, `typography`) pour `solid/default`, `surface/border` et `ring`. Plus 3 sondes de primitives nommées comme un rôle (`mesure`). | 18 | `mal-rangee` pour les rôles à deux segments. `ring` sans slash est un cas `mesure`. | non |

**Échelle (C63 doublons)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| E1 | Deux crans de même valeur dans un mode, trois crans, deux groupes, doublon dans deux modes, valeur 0, nombre à virgule, valeurs décimales proches, doublon dont les valeurs sont des alias (`mesure`, Q-F2-8). Puis un doublon entre `sizing/<n>` et `icon/<taille>`, et un doublon sur une variable STRING. | 10 | `doublons` avec les candidats, par mode, sauf pour les 2 derniers cas qui n'en attendent aucun | non, une question |
| E2 | Témoins sans doublon : échelle croissante, même valeur dans deux modes différents, `sizing/0` seul. | 3 | aucun constat | non |

**Noms inconnus dans `theme` (Q-07, E-19)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| Q1 | Faute sur un rôle. Dernier segment des 15 rôles de palette, 3 mutations (lettre retirée, remplacée, échangée). Segment de dossier, 10 cas. | 55 | question qui nomme le rôle proche, sans présélection. Aucune création du rôle absent. | non |
| Q2 | Synonyme de rôle (`surface/outline`, `page/text`, `solid/active`, `solid/hovered`, `page/separator`, `focus`, `surface/muted`, `surface/bg`). | 8 | question avec les rôles du dossier, sans présélection | non |
| Q3 | Nom sans proximité (`page/xyz`, `identity`, `custom/accent`, `tertiary-note`). | 4 | `mesure` (Q-F2-1) | non |

Le chiffre de Q1 compte 45 fautes de dernier segment et 10 fautes de dossier.

**Structure globale**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| X1 | Deux collections `theme` : copie complète, copie à moitié des rôles, copie à d'autres modes, copie nommée `Theme (copy)`. | 4 | `mesure` (Q-F2-5). Les identifiants restent uniques. | non |
| X2 | Rôle reconnu deux fois dans une palette : même alias, autre cran, autre casse, nom redisant la collection. | 4 | `mesure` (Q-F2-6) | non |
| X3 | Collection `theme` ou `brands` à l'état `inaccessible`, variables `non-chargee`. | 3 | aucun constat sur les variables non lues, et l'état est dit (P13) | non |
| X5 | Fichier déclaré libre. | 1 | listes vides, aucun onglet (P17) | non |
| X6 | Entrées dégradées. Alias en cycle, alias vers soi, clé en double, collection orpheline, mode sans nom, nom vide, nom à segment vide (`primary//ring`), nom d'un seul segment. | 8 | aucune exception (P16) | non |

### 3.4 Combinaisons

Un pool d'environ 45 atomes est tiré des opérateurs R1, K1, K2, K3, M1, M2, L1, L2, L4, S1, S2, Y1, Y2, Y3, Y4, E1, Q1 et Q2. Chaque atome déclare la zone qu'il touche (palette, rôle, mode). La liste est figée dans `combinaisons.ts`.

- 300 paires et 150 triples sont tirés avec la graine, sur les 3 profils de la section 3.2.
- Deux atomes se combinent seulement si leurs zones sont disjointes. L'oracle d'une combinaison est alors l'union des oracles des atomes, ce qui teste l'indépendance des contrôles.
- Les 24 cas d'interaction déclarée (8 couples, 3 profils) sont inclus dans les 450. Chaque couple a un oracle propre. Les couples sont les suivants.

| Couple | Oracle attendu |
|---|---|
| R1 d'un rôle et retrait du cran qu'il vise | `cran-absent`, aucune création |
| R1 d'un rôle et Q1 d'un rôle voisin qui le nomme | question, aucune création |
| K1 sur deux rôles votants de la même palette | le sens reste celui des rôles non dégradés |
| K1 et L1 sur la même variable | `alias-supprime` seul |
| K1 et M1 sur la même variable | un seul constat, correction vers la bonne branche au bon cran |
| S1 et Y2 sur la même variable | `valeur-directe` et `scopes` |
| Y1 et K1 sur la même variable | `couche` seul |
| R1 et L3 sur une rampe de library | `variable-absente` raison `cible-de-library` |

### 3.5 Graine et total

La graine est 7102, avec un générateur pseudo-aléatoire à 32 bits (`mulberry32`) dont le tirage suit l'ordre trié des identifiants de cas. Une même graine rend les mêmes cas.

| Section | Contenu | Cas |
|---|---|---|
| A | Faux positifs (section 4) | 85 |
| B | Opérateurs simples | 426 |
| C | Combinaisons | 450 |
| D | Chaîne sandbox et écran (section 5.3) | 27 |
| | Total | 988 |

Détail de B : R 53, K 78, M 41, L 48, S 43, Y 63, E 13, Q 67, X 20.

## 4. Faux positifs

Les 72 profils de la section 3.2 doivent donner zéro constat (P1). Treize thèmes ciblés s'y ajoutent.

| Thème ciblé | Cas |
|---|---|
| Collection `theme` écrite `Theme`, `themes`, `THEME`, avec les formes anciennes de `brands` (`color-brands`) et de `utility` (`color-utilities`), et `layouts` | 6 |
| Modes `Light` et `Dark`, puis `LIGHT` et `DARK` | 2 |
| Noms de groupes libres (`tertiary`, `accent`, `brand-a`, `brand_b`) et groupes à deux niveaux (`success/soft`) | 1 |
| Brands avec modes Light et Dark et chemins sans segment de mode (place « modes ») | 1 |
| Fichier déclaré libre avec une structure quelconque | 1 |
| Échelle `sizing` croissante sur trois modes | 1 |
| Couleur directe dans `primitives` et dans `components` sans segment de famille | 1 |

Le total compte 6 + 2 + 1 + 1 + 1 + 1 + 1 = 13 thèmes. Chaque thème vérifie aussi P8, donc les 85 cas rejouent un ordre de variables mélangé et une écriture changée.

## 5. Harnais

### 5.1 Emplacement

Le code vit hors de `npm test`, dans deux dossiers.

| Dossier | Contenu |
|---|---|
| `packages/kit/tests/stress/f2-structure/` | Hors de `tests/`, donc non découvert par `run-tests.cjs`. Le cadre commun est dans `packages/kit/tests/stress/commun/`. Générateur, carte du thème, opérateurs, oracle, combinaisons, relations métamorphiques, application des corrections. |
| `packages/plugin-architect/scripts/stress/f2-structure/` | `chaine.ts` (sandbox et écran), `executer.ts`, `rapport.ts`, `signatures.ts` (rattachement d'un écart à un E connu). |

Lancement, après construction du kit comme le font les scripts du plugin.

```sh
npm run stress:structure --workspace ucm-architect-plugin -- --graine 7102
```

Le script `stress:structure` de `packages/plugin-architect/package.json` appelle `node ../../scripts/construire-plugin.mjs verifier-kit architect` puis `npx tsx scripts/stress/f2-structure/executer.ts`. Options prévues : `--section A|B|C|D`, `--operateur K1`, `--cas K1-12` (rejoue un cas et imprime le catalogue, les constats et l'oracle), `--rapide` (P0 seul pour les sections B et C, pour une boucle courte) et `--strict` (sortie non nulle au premier écart `attendu`).

### 5.2 Appel du kit puis de l'écran

1. Le générateur rend un `CatalogueDeReference` (clés `collection|nom`, `collectionsDeReference(…, 'ucm')`) et sa carte.
2. L'opérateur copie le catalogue, applique la dégradation et rend l'oracle du cas.
3. Le harnais appelle `controlerLeCatalogue(catalogue)` et `controlerLIntegriteUcm(catalogue, { ecriture, rolesIgnores })`, puis dédoublonne comme `sansDoublon` de `sandbox/structure.ts`.
4. Pour la chaîne complète, il appelle `traiterAvec(acces)` de `sandbox/structure.ts` avec un double d'`Acces` (catalogue, réglages, écriture, rangement) et un `Contexte` qui capte le message `structure`, comme `tests/structure.test.ts`. Le message passe ainsi par `separerLesIgnores` et par la retenue des corrections.
5. Le harnais bâtit un `Noms` sur le catalogue (nom entier `collection/nom`, comme `ui/index.ts`), puis appelle `lireLesConstats`, `lireLesCorrections`, `monterAFaire` et `monterLesCorrections` sur le faux DOM de `tests/domDeTest.ts` (`poserLeDom`). Il lit les cartes, les cases et le pied.
6. `appliquer.ts` applique au catalogue les corrections du message (scope, alias de mode, création) pour P7.

### 5.3 Cas de la chaîne (section D)

| Id | Cas | Nombre | Propriétés |
|---|---|---|---|
| D1 | Lecture qui échoue. Catalogue qui lève, catalogue `null` sur un fichier UCM, réglages qui lèvent, `lireLesVariables` qui rend `null`. | 4 | P13 |
| D2 | Cases décochées. 5 sortes de carte (variables manquantes, crans, modes, scopes C63, scopes C82), au premier affichage puis à la relecture après une coche manuelle. | 10 | P12 |
| D3 | Proposition ignorée. Une par sorte de correction (C60, C63 scopes, C82 `scopes`, `cran`, `variable-absente`). | 5 | P11 |
| D4 | Motifs de saut. Un cas par valeur de `MotifDeStructureSaute` (8). | 8 | P14 |

### 5.4 Rapport et temps

Le rapport s'écrit dans `_local/stress/f2-structure/` (dossier ignoré par Git) en deux fichiers, `rapport.json` et `rapport.txt`. Le `.txt` porte ce tableau, une ligne par opérateur.

| Opérateur | Cas | Attendus | Détectés | Manqués | Faux constats | Corrections inexactes | Non affichés | Cochées | En attente |
|---|---|---|---|---|---|---|---|---|---|

Il porte aussi le total par section, puis la liste des écarts. Chaque écart donne l'identifiant du cas, la propriété violée, l'écart connu rattaché (E-19 à E-24) ou la mention « nouveau », et la commande qui rejoue le cas.

Le temps d'exécution est à mesurer au lot 6. Le seuil visé est 180 secondes pour les 988 cas sur le poste du mainteneur. S'il est dépassé, le lot 6 règle `--rapide` et le nombre de profils sans réduire le nombre d'opérateurs. Le catalogue du profil large compte environ 1 000 variables (estimation à vérifier au lot 1), et `integrite.absentes.test.ts` contrôle déjà 3 700 variables sans attente.

## 6. Deux temps

### 6.1 Mesure de l'existant

Le `verificateur` lance le harnais sur le code actuel. La conversation principale lit `rapport.txt`, classe chaque écart (défaut, limite assumée, cas à trancher) et rattache les nouveaux à un identifiant. Elle présente au mainteneur le tableau des écarts nouveaux et celui des cas `mesure`. Rien n'est corrigé dans cette étape.

Écarts que la lecture du code laisse prévoir, à confirmer ou infirmer par la mesure.

| Hypothèse | Opérateur | Source |
|---|---|---|
| C60 ne se déclenche pas quand les modes de la collection cible sont des modes de marque et que le mode est un segment du chemin. | M1, M3 | `controlerLesModes`, test de la collection cible par ses modes |
| Un rôle déplacé sur le cran de l'autre table vote pour l'autre sens, rend la palette ambiguë et disparaît sans bruit. | K1 (`ring`, `page/foreground` et `page/border` d'un pas) | `jugerLeCran`, `sensDeLaPalette` |
| La voisine d'un alias supprimé est choisie sur le dernier segment seul (`default` de `solid` et de `surface`). | L1 | `controlerLesAliasesManquants` |
| Une faute de rôle laisse la création du rôle absent, qui doublonne la variable fautive. | Q1 | `controlerUnTheme` |
| Un rôle reconnu deux fois dans une palette n'est jugé que pour le premier. | X2 | `lesPrefixes` |
| L'identifiant `C82:cran-absent` ne porte ni la collection ni le thème : deux thèmes ou deux rampes de même chemin se confondent. | X1 | `controlerUnTheme` |
| Un constat de C63 `scopes` dont la proposition est ignorée disparaît, comme C82 `scopes`. | D3 | `genreDe` |
| Une question de C60 sans correction n'a pas de genre et n'apparaît nulle part. | M2 | E-20 |

### 6.2 Tests de régression

Une fois la mesure lue, des cas représentatifs deviennent des tests dans `npm test`.

| Fichier | Contenu | Cas |
|---|---|---|
| `packages/kit/tests/stressStructure.test.ts` | Un test par opérateur de la section B qui a révélé un écart, avec 1 à 3 cas de la graine 7102, plus les 17 propriétés rejouées sur P0 et p37. | 45 à 60 |
| `packages/plugin-architect/tests/structureStress.test.ts` | Les cas D1 à D4, plus les cas de P9 qui ont révélé un écart. | 20 à 27 |

Un test dont le défaut n'est pas corrigé porte `{ todo: '<écart>' }` de `node:test`. Il s'exécute, et son échec ne fait pas échouer `npm test`. La correction du code retire le `todo`. Les deux fichiers durent moins de 10 secondes ensemble. Le contrôle du kit et du plugin reste dans `npm test`, le harnais complet reste hors de `npm test`.

## 7. Recette Figma

Ce qui ne se prouve qu'en Figma. Le mainteneur dégrade une copie d'un fichier UCM de recette qu'il a déjà. Le plan ne crée et ne migre aucun fichier. Le harnais imprime dans `_local/stress/f2-structure/recette-figma.txt` les cartes attendues pour chaque geste.

| N° | Geste du mainteneur | Ce qu'il vérifie |
|---|---|---|
| F1 | Ouvrir Architect, mode Tokens, sur la copie intacte. | Zéro constat, ou les constats propres au fichier, comptés avant tout geste. |
| F2 | Supprimer `surface/subtle` d'une palette. | Carte Variables manquantes décochée. Après Appliquer, la variable existe avec son nom, ses alias par mode et ses scopes de fond. L'Historique la défait. |
| F3 | Changer d'un cran l'alias de `solid/hover` en Light. | Carte Crans décochée. Appliquer, puis relire, ne montre plus rien. |
| F4 | Pointer `surface/default` en Light vers la rampe Dark. | Constat C60 visible, avec ou sans correction. Noter si le fichier réel a des modes de marque ou des modes Light et Dark sur la collection cible. |
| F5 | Poser `ALL_SCOPES` sur une variable de `theme` et sur une de `brands`. | Deux cartes Scopes décochées. Après Appliquer, relire les scopes dans la fenêtre Edit variable et noter si le retrait des scopes laisse « All scopes » ou une liste vide. |
| F6 | Supprimer la variable cible d'un alias de `theme`. | Constat `alias-supprime` en À faire, avec une voisine citée seulement si c'est le même rôle d'une autre palette. |
| F7 | Renommer le mode `dark` en `Sombre`. | Constat `mode-du-theme`. Les créations proposées s'arrêtent avec la raison attendue. |
| F8 | Renommer une variable `page/border` en `page/bordr`. | Une question vers `page/border`, rien de présélectionné, et aucune création de `page/border`. |
| F9 | Désactiver la library d'une collection cible. | Constat `library-inactive` avec le nom de la library. |
| F10 | Ignorer la proposition d'une carte Scopes. | Le constat reste visible en À faire. |
| F11 | Ignorer un constat pour sa palette, puis « Ne plus ignorer ». | La carte passe sous Ignorés et revient. |
| F12 | Appliquer trois corrections de natures différentes, puis Historique. | Valeurs restaurées, variable créée retirée, motifs de saut lisibles. |
| F13 | Cocher une carte à la main, relancer la lecture. | La case cochée à la main ne revient pas cochée par défaut sur les autres. |
| F14 | Chercher un geste qui fait échouer la lecture (fichier sans droit d'édition, library retirée). | L'onglet n'affiche pas « Rien à faire ». Sans geste connu, la preuve reste au cas D1. |
| F15 | Lire un fichier de plusieurs centaines de variables. | Temps de lecture noté. |

## 8. Lots d'exécution

Le plan d'ensemble reste dans la conversation principale. Un lot par appel d'agent, au plus deux lots en parallèle. Après chaque lot, la conversation relit le diff, un `verificateur` relance les vérifications, puis `npm run agents:diff`. Le prompt de chaque implémenteur contient la note du lot, la nature de la tâche et la sortie de `npm run agents:lire -- <chemins du lot>`.

| Lot | Fichiers | Agent | Critères de fin |
|---|---|---|---|
| 0 Cadre commun | `packages/kit/tests/stress/commun/prng.ts`, `types.ts`, `comparer.ts`, `packages/kit/tests/stressCadre.test.ts` ; partagé par toutes les familles | `implementeur` | `npm run typecheck` passe. `stressCadre.test.ts` prouve que deux tirages de la graine 7102 sont identiques et que `comparer` rend « manqué », « faux constat » et « correction inexacte » sur trois paires fabriquées. |
| 1 Générateur | `packages/kit/tests/stress/f2-structure/themeUcm.ts`, `carte.ts` | `implementeur-exigeant` | Les 72 profils donnent zéro constat de `controlerLeCatalogue` et de `controlerLIntegriteUcm`. Chaque profil compte au moins une valeur dans chaque mode de chaque collection. Un profil non vide en constats est lui-même un résultat à remonter. |
| 2 Opérateurs R, K, M | `packages/kit/tests/stress/f2-structure/operateursRoles.ts`, `operateursCrans.ts`, `operateursModes.ts` | `implementeur-exigeant` | Les opérateurs rendent 53 + 78 + 41 = 172 cas. Chaque cas a un oracle rédigé, et un contrôle de cohérence interne prouve que dégrader puis annuler la dégradation redonne le thème de base. |
| 3 Opérateurs L, S, Y, E, Q, X | `operateursAlias.ts`, `operateursScopes.ts`, `operateursStructure.ts`, `operateursEchelle.ts`, `operateursNoms.ts` | `implementeur` | Les opérateurs rendent 48 + 43 + 63 + 13 + 67 + 20 = 254 cas, et le lot rend les 13 thèmes ciblés de la section 4. Les verdicts `mesure` sont marqués. Les lots 2 et 3 touchent des fichiers distincts et peuvent tourner ensemble. |
| 4 Combinaisons et relations | `combinaisons.ts`, `metamorphiques.ts`, `appliquer.ts` | `implementeur-exigeant` | 300 paires, 150 triples et 24 interactions rendent des oracles sans zone partagée. Les relations M-1 (ordre), M-2 (clés), M-3 (écriture) et M-4 (couleurs des primitives) s'appliquent sans changer un thème de base. `appliquer.ts` applique scope, alias de mode et création. |
| 5 Chaîne sandbox et écran | `packages/plugin-architect/scripts/stress/f2-structure/chaine.ts`, `signatures.ts` | `implementeur-exigeant` | Les 27 cas D1 à D4 s'exécutent. Le faux DOM rend les cartes et les cases. Chaque propriété P9 à P14 rend un verdict sur un catalogue qui porte tous les genres. Le lot 5 ne dépend que des lots 0 et 1 et peut tourner avec le lot 4. |
| 6 Exécuteur et rapport | `executer.ts`, `rapport.ts`, `packages/plugin-architect/package.json` (script `stress:structure`) | `implementeur` | `npm run stress:structure --workspace ucm-architect-plugin -- --graine 7102` finit sur 988 cas, imprime le tableau de la section 5.4, écrit `rapport.json` et `rapport.txt`, et rejoue un cas par `--cas`. Deux exécutions donnent le même rapport. Le temps mesuré est noté. `npm run typecheck` passe. |
| 7 Mesure de l'existant | aucun fichier de code | `verificateur`, puis la conversation principale | `rapport.txt` du code actuel est lu en entier. Chaque écart est classé et rattaché. Le tableau des écarts nouveaux et celui des cas `mesure` sont remis au mainteneur. Les 8 hypothèses de la section 6.1 sont confirmées ou infirmées. |
| 8 Régression | `packages/kit/tests/stressStructure.test.ts`, `packages/plugin-architect/tests/structureStress.test.ts` | `implementeur` | Les deux fichiers couvrent chaque écart classé au lot 7. `npm test` passe, les écarts non corrigés portent `todo`, et les deux fichiers durent moins de 10 secondes. |
| 9 Scénario de recette | `packages/plugin-architect/scripts/stress/f2-structure/recette.ts`, sortie `recette-figma.txt` | `implementeur` | Le fichier donne, pour F2 à F9, les cartes attendues d'après l'oracle. Le mainteneur le lit avant la recette. |

La version allégée (section 7 de l'inventaire) remplace les lots 2 à 7 par les lots suivants. Les lots 8 et 9 s'écrivent avec les corrections.

| Lot allégé | Contenu | État |
|---|---|---|
| A1 | Opérateurs R, K, M, `mesurer.ts` | fait, `e20a3e3d` |
| A2 | Opérateurs L, S, Y, E, Q, X, faux positifs, relations M-1 et M-3 | fait, `2ce2db12` |
| B | Interactions déclarées, chaîne D1 à D4, script `stress:structure` | à faire |

## 9. Questions au mainteneur

Le mainteneur a laissé la suite en autonomie. La conversation principale retient chaque proposition comme décision provisoire, que le mainteneur peut revoir. Les cas liés restent `mesure` dans le rapport, comptés à part, jusqu'à sa confirmation. Q-F2-7 est tranchée autrement : les résultats de toutes les familles vont dans un seul document, `MESURE-DES-FAILLES.md`, dans ce dossier.

| Id | Question | Décision provisoire |
|---|---|---|
| Q-F2-1 | Q-07 s'applique-t-elle à toute variable de `theme` hors rôle (`identity`, `custom/accent`), ou seulement à celles proches d'un rôle ? | Question quand le dernier segment est à une lettre, à un échange ou à un synonyme listé d'un rôle du même dossier. Au-delà, une information grise sans action. |
| Q-F2-2 | Un rôle d'une palette aliasé vers la rampe d'une autre palette, au bon cran, est-il un constat ? | Oui, en question sans présélection, car l'oracle ne peut pas deviner la palette voulue. |
| Q-F2-3 | Quel résultat pour une palette au sens ambigu, ou pour `solid/foreground` à contre-sens des autres rôles ? | Une question à deux candidats, jamais une correction, puisque le texte des boutons est un choix du designer. |
| Q-F2-4 | C60 couvre-t-il les deux places du mode (segment du chemin et modes de la collection cible) ? | Oui : la fixture du kit (`catalogueDeStructure.ts`) met le mode dans le chemin de `brands` (`primary/dark/300`). |
| Q-F2-5 | Deux collections `theme` dans un fichier donnent-elles un constat ? | Oui, en À faire, sans correction. À rattacher à la décision Q-86 de la recette d'Architect si elle porte sur le même cas. |
| Q-F2-6 | Un rôle reconnu deux fois dans une même palette est-il un constat ? | Oui, en À faire, avec les deux variables citées. |
| Q-F2-7 | Le résultat de la mesure s'écrit-il dans un nouveau document du dossier `8 Fiabilisation`, ou dans une section 9 de l'inventaire ? | `MESURE-DES-FAILLES.md`, un seul document pour les neuf familles. |
| Q-F2-8 | Les doublons d'échelle visent-ils aussi des valeurs en alias, et d'autres échelles que `sizing` (`radius`, `spacing`) ? Une cible inaccessible sans library choisie est-elle silencieuse ? | Alias résolus pour `sizing` seulement. Sans library choisie, un constat d'information. |
| Q-F2-9 | Accepter des tests de régression `todo` dans `npm test` tant que la correction n'est pas faite ? | Oui, avec l'identifiant de l'écart dans le `todo`. |
