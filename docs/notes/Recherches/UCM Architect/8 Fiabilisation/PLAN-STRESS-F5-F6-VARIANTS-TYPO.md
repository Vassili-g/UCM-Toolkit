# Plan de stress test F5 et F6, variants, nommage des tokens, typographie et icônes

Ce plan décrit le harnais qui mesure les contrôles de variants, de nommage des tokens du composant, de typographie et d'icônes sur 914 cas fabriqués, depuis le constat du kit jusqu'à la carte de question et à l'écriture du renommage. Il ne corrige aucun code : il produit la mesure de l'existant, puis des tests de régression en attente des corrections. Il prolonge les familles F5 et F6 de [INVENTAIRE-VERIFICATIONS.md](./INVENTAIRE-VERIFICATIONS.md) (sections 4.1, 4.4, 4.5, 6.3, 7 et 8) et suit la forme de [PLAN-STRESS-F2-STRUCTURE.md](./PLAN-STRESS-F2-STRUCTURE.md).

Avant d'écrire ce plan, treize hypothèses ont été rejouées sur le kit par des scripts jetables, rangés hors du dépôt. Le tableau de la section 6.1 marque ces hypothèses « sonde ». Aucun fichier du dépôt n'a changé.

## 1. Portée

| Contrôle | Source | Genres couverts |
|---|---|---|
| Reconnaissance des axes | `packages/kit/src/controles/nommage.ts` (`axeDePropriete`, `axesDesProprietes`) et `packages/kit/src/referentiel/reconnaissance.ts` (`estLAxeDEtats`, `formeReconnue`, `termeReconnu`) | rôle `palette`, `style`, `taille`, `etat` d'un nom de propriété |
| Lecture des tokens du composant | `nommage.ts` (`tokensDuComposant`) et `packages/kit/src/referentiel/grammaire.ts` (`reconnaitreLeChemin`) | lecture d'un chemin `Composant/color/palette/style/taille/état/rôle` |
| C7, C8, C9, C10, C12, C13 | `nommage.ts` (`controlerNommage`) | valeur d'axe sans token, forme tolérée, casse, taille tolérée, valeur renommée avec un ou plusieurs candidats |
| C31, C32, C33 | `packages/kit/src/controles/oublis.ts` (`controlerOublis`) | combinaison absente, token orphelin ou inutilisé, famille non couverte, borne de 4 096 combinaisons (E-44) |
| C64, C65, C66, C67 | `packages/kit/src/controles/typographie.ts` (`controlerLaTypographie`) | texte sans style ou de style différent, taille et graisse liées hors `typography`, icône hors library, taille ou couleur d'icône, propriété INSTANCE_SWAP absente |
| Définitions d'icône (E-26) | `typographie.ts` (`estIcone`), `packages/kit/src/controles/accessibilite.ts` (`estIcone`), `packages/kit/src/controles/mapping.ts` (`estUneIcone`, `rolesAdmis`) | trois lectures du même mot « icône », comparées entre elles |
| Assemblage | `packages/plugin-architect/src/sandbox/analyse.ts` | familles lancées, ignorés retirés, relevé partiel |
| Écran | `packages/plugin-architect/src/ui/panneau/elements.ts`, `src/ui/questions/modele.ts` (C12, C13), `src/ui/ignores/modele.ts`, `src/ui/textes/ignores.ts` | section d'un constat, phrase et statut, carte de question |
| Réponse et écriture | `packages/plugin-architect/src/sandbox/questions.ts`, `src/ecriture/noms-de-valeurs.ts` | correction `nom-de-valeur`, renommage dans les variants |

Hors plan. Les corrections du code (E-26, E-27, E-35, E-36 et E-44 compris), les liaisons de couleur et de taille (F3 et F4, y compris les rôles que C17 admet), le contraste (F7, hors la définition d'icône que C49 lit), les lectures refusées et le budget de layers (F9), la migration d'un fichier Figma et `test:ui`.

## 2. Oracle

### 2.1 Principe

L'oracle est écrit à partir des opérateurs de dégradation, des registres du kit (`REGISTRE_ETATS`, `REGISTRE_TAILLES`, `REGISTRE_PALETTES_COMPOSANT`, `REGISTRE_AXES_ETAT`) et du corpus des design systems de la section 3.2, jamais en rejouant le code mesuré. Chaque opérateur déclare ce qu'il casse et ce que le plugin doit dire.

| Verdict | Sens |
|---|---|
| `attendu` | La règle est écrite (inventaire, registre, décision D ou Q). Un écart est un défaut. |
| `mesure` | La règle dépend d'une réponse du mainteneur (section 9). Le rapport compte l'écart à part et ne le qualifie pas. |

### 2.2 Correction exacte

Aucun constat de ces familles ne porte de `correction` dans le kit. Seule la réponse à une question C12 ou C13 produit une correction `nom-de-valeur`. L'oracle applique donc la règle produit à la question et à cette correction.

- Une question n'offre que des candidats exacts : un token que nul variant ne porte, local au composant, qui n'est pas déjà une valeur de l'axe.
- Une question à plusieurs candidats ne présélectionne aucune réponse, et son bouton principal ne désigne aucun candidat.
- Une réponse construit une correction qui arrive décochée (Q-03), et la carte offre Ignorer et « Ne plus proposer » (Q-11).
- Hors de ces conditions, l'oracle attend un constat sans correction ni question.

### 2.3 Propriétés

Variants et nommage (F5).

| Id | Assertion vérifiable | Constats, écarts, décisions |
|---|---|---|
| P1 | Les 60 profils valides de la section 3.2 ne produisent aucun constat C7 à C13 ni C31 à C33, et chaque segment de chaque token se lit avec le rôle que le corpus lui donne. | tous, E-27 |
| P2 | Chaque dégradation fait émettre les constats que son opérateur déclare, avec le code, l'axe, la valeur et les variants attendus (colonne « manqués »). | tous |
| P3 | Aucun constat n'est émis hors de ceux que l'opérateur déclare (colonne « faux constats »). | tous |
| P4 | Les candidats d'un C12 ou C13 sont exactement les segments de tokens que nul variant ne porte. Aucun n'est déjà une valeur de l'axe. C12 n'existe que pour un candidat unique. | C12, C13, règle produit |
| P5 | `axeDePropriete(nom)` égale le rôle du corpus pour chaque entrée `attendu`, quelle que soit l'écriture du nom. Les entrées `mesure` sont comptées à part. | E-27, Q-08 |
| P6 | Mélanger l'ordre des propriétés, des valeurs ou des variants, changer la casse ou le séparateur du nom d'un axe reconnu dans les deux écritures, ou changer la casse du nom du composant laisse les mêmes constats, aux noms près. L'entrée n'est pas modifiée. Les identifiants sont uniques et stables. | tous |
| P7 | C31 est exactement l'ensemble des combinaisons du produit des valeurs que nul variant ne porte, sans doublon. Au-delà de 4 096 combinaisons, le plugin le dit par une information et ne rend jamais une liste vide muette. | C31, E-44 |
| P8 | Aucun contrôle ne lève sur une entrée dégradée, et une matrice de 4 096 combinaisons répond en moins de 2 secondes (budget à mesurer au lot 8). | robustesse |
| P9 | Un relevé dont des variants ou des layers ne sont pas lus ne produit aucun constat C31, C32 ni C33. | `oublis.ts`, F9 |
| P10 | Un token lié par une liaison illisible n'est jamais accusé par C32. Un token du composant dont le nom ne se lit pas n'est pas silencieux. | E-33, O6 |
| P11 | Une forme tolérée donne C8 ou C10 avec le terme canonique. La casse d'un terme connu ne donne pas de C9. Une valeur identique au segment, même hors registre, ne donne aucun constat. | D3, inventaire 4.1 |
| P12 | Tout constat émis et non ignoré apparaît dans la section attendue (Variants, Tokens, Tailles) avec une phrase et un statut non vides. | C7 à C33 |
| P13 | Répondre à C12 ou C13 produit une correction décochée au premier affichage et après relecture. La carte offre Ignorer et « Ne plus proposer ». L'écriture ne renomme que la propriété visée, jamais vers une valeur déjà présente, et le relevé relu ne contient plus ni C7 ni C12 ni C13 pour cette valeur. | Q-03, Q-11, E-35 |
| P14 | Ignorer un constat le retire de la liste et le range sous Ignorés. « Ne plus ignorer » le rend. | E-35 |

Typographie et icônes (F6).

| Id | Assertion vérifiable | Constats, écarts, décisions |
|---|---|---|
| P15 | Les 12 variants de base, avec textes à style et icônes valides, ne produisent aucun constat C64 à C67 hors les informations de limite de C67. | tous |
| P16 | Un texte sans style ni variable donne C64 `sans-style-ni-variables`. Un texte à styles mixtes ne reçoit pas ce motif. Un style différent se juge parmi les variants de même valeur de l'axe de taille. Un texte masqué n'est jamais jugé. | C64, E-36 |
| P17 | Une taille ou une graisse liée hors de `typography` donne `mauvaise-collection`. Une liaison absente alors que les voisins en ont une donne `sans-liaison-comme-les-autres`. | C65 |
| P18 | Une icône qui n'est pas une instance de library, dont la taille n'est pas liée à un token d'icône ou dont la couleur n'est pas liée à un premier plan, donne le motif de C66 qui la décrit. | C66 |
| P19 | Une liaison que C66 accepte n'est pas refusée par la règle des couches (C80), et inversement. | C66, C80, mémoire « layer vers tokens du composant » |
| P20 | Une couleur d'icône liée par `strokes` compte comme une couleur liée par `fills`. | C66 |
| P21 | Les trois définitions d'icône (C66, C49, C17) rendent le même verdict pour un même layer. Les noms piégeux ne sont pas des icônes. | E-26 |
| P22 | Une instance pilotée par une propriété que le jeu ne déclare pas donne C67 `propriete-absente`. Un slot INSTANCE_SWAP qui n'est pas une icône n'est pas jugé comme une icône. | C67 |
| P23 | Un même défaut sur N variants donne un seul constat qui nomme les N variants. Les identifiants sont uniques et stables. | C64 à C67 |
| P24 | Chaque couple (code, motif) de F6 a une phrase exacte pour son motif et se range dans la section attendue. | E-36 |
| P25 | Aucun contrôle ne lève sur une entrée dégradée (0 variant, texte sans plage, parent cyclique, instance sans maître). | robustesse |

### 2.4 Colonnes du rapport

| Colonne | Définition |
|---|---|
| Attendus | Constats que l'oracle déclare pour les cas de l'opérateur. |
| Détectés | Attendus que le plugin émet avec le bon code, la bonne valeur et les bons variants. |
| Manqués | Attendus que le plugin n'émet pas (P2). |
| Faux constats | Constats émis que l'oracle ne déclare pas (P3). |
| Candidats inexacts | Candidats de question hors de ceux que P4 admet, ou question qui présélectionne (P4, P13). |
| Mal placés | Constats affichés dans une mauvaise section ou avec une phrase fausse (P12, P24). |
| Non affichés | Constats émis sans trace à l'écran (P12, P14). |
| Cochées | Corrections cochées à l'affichage (P13). |
| En attente | Écarts sur des cas `mesure`, comptés à part. |

## 3. Générateur

### 3.1 Composant de base

Le générateur construit un `ReleveDeComposant` et un `CatalogueDeReference` complets, et une carte (`CarteDuComposant`) que les opérateurs et l'oracle lisent. La carte donne, pour chaque axe, son rôle, ses valeurs et la clé du token de chaque famille et de chaque valeur, et pour chaque variant, les identifiants de ses layers.

**Dépendance explicite.** Le plan F3 et F4 est écrit en parallèle dans `PLAN-STRESS-F3-F4-COMPOSANT.md`. Son générateur de `ReleveDeComposant` et de `CatalogueDeReference` vit sous `packages/kit/tests/stress/f3-composant/`. Ce plan ne l'importe que par un seul fichier, `packages/kit/tests/stress/f5-variants/portF3.ts`, qui expose trois fonctions : `composantValide(spec, prng)`, `releveDe(composant)` et `catalogueDe(composant)`. Si le générateur de F3 n'accepte pas une liste d'axes libre, `portF3.ts` construit la matrice et les tokens ici et ne reprend de F3 que les constructeurs de layers et de liaisons. Le lot 1 attend la livraison du lot générateur de F3, et le lot 0 de F2 (`commun/prng.ts`, `types.ts`, `comparer.ts`).

| Élément | Contenu du composant de base |
|---|---|
| Collection | Une collection `components` à l'état `lue`. Les couches `theme`, `layout`, `typography` et `primitives` existent avec leurs modes, vides de variables inutiles. |
| Axes | Un jeu d'axes de la section 3.2, chaque axe en propriété `VARIANT` avec ses valeurs. |
| Matrice | Le produit complet des valeurs, un variant par combinaison, nommé `Axe=Valeur, Axe=Valeur`. |
| Tokens de couleur | `Comp/color/<palette>/<style>/<état>/<rôle>` pour les rôles `background`, `foreground`, `border`, `icon`, un token par combinaison des axes présents. |
| Tokens de taille | `Comp/size/<taille>/<propriété>` pour `padding`, `gap`, `radius`, `icon-size`. |
| Layers | Par variant : `container` (FRAME, fills et strokes liés, rayon et marges liés), `label` (TEXT, style de library, fills liés à `foreground`), `icon` (INSTANCE d'une library, pilotée par `Icon#1:2` déclarée en INSTANCE_SWAP, taille liée à `layout/icon/<taille>`, couleur liée à `theme/…/icon`). |
| Segments | Le segment d'un token égale la valeur du variant, caractère pour caractère, sauf pour les opérateurs de forme (V3, V4, V5). |

La base des 12 variants de F6 est un sous-jeu de P0 : l'axe `Size` à 3 valeurs et l'axe `State` à 4 valeurs, avec un style de texte propre à chaque taille (`Label/Small`, `Label/Medium`, `Label/Large`), donc sans constat C64 sous l'une ou l'autre règle de comparaison. L'icône de base suit la forme que C66 accepte, soit des variables de `layout` et de `theme` liées directement. La forme par tokens du composant est un cas de l'opérateur I2 (Q-F6-1).

### 3.2 Corpus et profils

Le corpus des noms de propriétés de variants vit dans `packages/kit/tests/stress/f5-variants/corpus/axes-attestes.json`. Une ligne donne le nom, le système, le composant, le rôle attendu, le verdict et la source. Les `noms.json` de `docs/references/design-systems/` portent des noms de tokens, pas des noms de propriétés de variants : ils ne suffisent pas. Quatre composants de bouton sont figés dans le dépôt (MUI, Primer, Radix, Fluent) et donnent des noms et des valeurs lus (`variant`, `color`, `size` dans `mui/sources/composant__mui-material__Button__Button.js.txt`, `data-variant` et `data-size` dans `primer/sources/`, `rt-variant-*` et `rt-high-contrast` dans `radix/sources/`). Les relevés `docs/references/composants/segmented-control/*.json` donnent des tailles (`Small`, `Medium`, `Large`, `desktop`, `mobile`) et des états (`default`, `selected`, `hover`, `focus`, `pressed`, `disabled`, `active`, `data-focus-visible`). Le reste du corpus vient de deux relevés du `chercheur` au lot 1, chacun avec la moitié des 15 systèmes.

Corpus des noms d'axes, 35 entrées.

| Rôle | Entrées `attendu` | Entrées `mesure` |
|---|---|---|
| `taille` | `Size`, `Sizes`, `Taille` | `Density`, `Spacing` |
| `etat` | `State`, `States`, `Status`, `Etat`, `État` | `Loading`, `Selected` |
| `palette` | `Color`, `Colour`, `Intent`, `Severity`, `Tone` | `Couleur`, `Intention`, `Gravité`, `Destructive`, `Danger` |
| `style` | `Style`, `Variant`, `Appearance`, `Hierarchy`, `Emphasis`, `Fill style` | `Variante`, `Apparence`, `Hiérarchie`, `Type`, `Kind`, `Shape`, `High contrast` |

Le rôle de `Tone`, `Hierarchy`, `Emphasis` et `Fill style` découle de Q-08. Les noms français ne viennent d'aucun design system relevé : ils restent `mesure` (Q-F5-9). `Type` et `Kind` mêlent palette et style chez Ant Design, Carbon et Untitled UI : ils restent `mesure` (Q-F5-1).

Les 10 jeux d'axes servent de profils de base.

| Jeu | Origine | Axes et valeurs |
|---|---|---|
| J1 | MUI | `Variant` (text, outlined, contained), `Color` (primary, secondary, error, warning, info, success), `Size` (small, medium, large), `State` (default, hover, focus, disabled) |
| J2 | Primer | `Variant` (default, primary, danger, invisible, link), `Size` (small, medium, large), `State` (default, hover, focus, disabled) |
| J3 | Carbon | `Kind` (primary, secondary, tertiary, ghost, danger), `Size` (sm, md, lg, xl, 2xl), `State` (default, hover, focus, disabled) |
| J4 | Polaris | `Variant` (primary, secondary, tertiary, plain), `Tone` (critical, success), `Size` (micro, slim, medium, large), `State` (default, hover, pressed, disabled) |
| J5 | Untitled UI | `Hierarchy` (Primary, Secondary, Tertiary, Link), `Size` (sm, md, lg, xl, 2xl), `State` (Default, Hover, Focused, Disabled), `Destructive` (True, False) |
| J6 | Fluent 2 | `Appearance` (primary, outline, subtle, transparent), `Size` (small, medium, large), `Shape` (rounded, circular, square), `State` (rest, hover, pressed, disabled) |
| J7 | Spectrum | `Variant` (accent, primary, secondary, negative), `Fill style` (fill, outline), `Size` (S, M, L, XL), `State` (default, hover, focus, disabled) |
| J8 | Ant Design | `Type` (primary, default, dashed, text, link), `Size` (large, middle, small), `Danger` (True, False), `State` (default, hover, active, disabled) |
| J9 | UCM, composant `Alert` | `Severity` (info, success, warning, danger), `Style` (standard, outline), `Size` (sm, md, lg), `State` (default, hover, pressed, focus, disabled) |
| J10 | Radix Themes | `Variant` (classic, solid, soft, surface, outline, ghost), `Color` (accent, gray, red), `Size` (1, 2, 3, 4), `High contrast` (True, False) |

| Dimension | Valeurs | Nombre |
|---|---|---|
| Jeu d'axes | J1 à J10 | 10 |
| Écriture du nom d'axe | forme du corpus, minuscules, majuscules initiales avec espaces | 3 |
| Écriture des valeurs | forme d'origine du design system, forme UCM (`sm`, `md`, `hover`, minuscules) | 2 |

Le produit donne 60 profils (p01 à p60). Les opérateurs des sections 3.3 et 3.4 s'appliquent à un profil de référence P0 : le composant `Button` à quatre axes `Style` (solid, outline), `Color` (primary, secondary, danger), `Size` (sm, md, lg) et `State` (default, hover, pressed, disabled), soit 72 variants, avec les layers de F6. P0 n'est pas l'un des 60 profils : ses axes sont tous reconnus aujourd'hui, ce qui isole la logique de valeurs de la reconnaissance des axes. Les cas de la section 3.3 portent sur P0, sauf ceux des opérateurs A, M3 et I6, qui fabriquent leurs entrées. Chaque cas se nomme `<opérateur>-<n>`. Les combinaisons de la section 3.4 tournent sur 3 profils : P0, p18 (J3 en forme UCM, majuscules initiales) et un profil tiré de la graine parmi les 60.

### 3.3 Opérateurs de dégradation

Le verdict est `attendu` sauf mention contraire. Les cas de P0 portent sur ses 12 valeurs d'axes : `solid`, `outline`, `primary`, `secondary`, `danger`, `sm`, `md`, `lg`, `default`, `hover`, `pressed`, `disabled`.

**A. Reconnaissance des axes (E-27, Q-08)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| A1 | Chaque nom du corpus (35) dans 3 écritures (forme du corpus, minuscules, majuscules). Les deux noms composés (`Fill style`, `High contrast`) reçoivent en plus 4 écritures (`fill-style`, `fill_style`, `fillStyle`, `FillStyle`). | 113 | `axeDePropriete` rend le rôle du corpus. 19 noms `attendu`, 16 `mesure` |
| A2 | Noms qui ne sont pas des axes : `Icon`, `Label`, `Orientation`, `Theme`, `Mode`, `Statusbar`, `Resize`, `Colorful`, `Sizing`, `Stateful`. | 10 | `undefined` pour chacun |
| A3 | Deux axes du même rôle dans un jeu : `Variant` et `Appearance`, `Style` et `Hierarchy`, `Size` et `Density`, `Color` et `Tone`, `Color` et `Intent`, `State` et `Status`, `Variant` et `Type`, `Style` et `Kind`. Tokens écrits pour les deux axes. | 8 | `mesure` (Q-F5-3) |
| A4 | Axe reconnu dont les valeurs viennent d'un autre registre : `Variant` de Primer (default, primary, danger), `Appearance` d'Atlaskit (default, primary, subtle, warning, danger, discovery), `Kind` de Carbon, `Type` d'Ant Design, `Status` à valeurs de sévérité (info, success, warning, danger), `Variant` de Spectrum (accent, primary, secondary, negative). Matrice complète, tokens identiques aux valeurs. | 6 | aucun constat et lecture complète des tokens. `mesure` pour les axes dont le rôle est `mesure` (Q-F5-2) |

**V. Valeurs, formes et casse (C7 à C13)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| V1 | Une valeur renommée dans les variants, le token gardant l'ancien nom. 12 valeurs de P0 renommées en un mot neuf (`Destructive`, `Ghost`, `Compact`, `Idle`). | 12 | C7 sur l'axe et la valeur. Question C12 dont l'unique candidat est le token orphelin, sinon C13 avec les seuls orphelins. Ni `primary` ni `secondary` parmi les candidats (P4) |
| V2 | Une valeur neuve ajoutée à un axe, ses variants créés, aucun token pour elle (`Tertiary`, `xl`, `focus`, `dashed`). | 4 | C7 de la valeur, C33 pour chaque variant concerné et chaque famille sans token, aucune question |
| V3 | Casse du segment contre la valeur : variant capitalisé et token en minuscules, puis l'inverse, pour les 12 valeurs. Les 10 valeurs d'un terme connu (état, taille, palette) attendent zéro constat. Les 2 styles hors registre (`solid`, `outline`) attendent C9. | 24 | P11. Verdict `attendu` selon l'inventaire 4.1 |
| V4 | Forme tolérée dans le token : états `hovered`, `focused`, `press`, `disable`, `rest`, `normal` (6), tailles `small`, `medium`, `large` (3), famille `Colors`, `Colour`, `Colours` (3), palette `error` pour `danger` et `critical` pour `danger` (2). Forme tolérée dans la valeur du variant, token canonique, pour les 6 états. | 20 | C8 pour les états et les familles, C10 pour les tailles, avec le terme canonique. Palette et valeur de variant tolérée : `mesure` (Q-F5-5) |
| V5 | Valeur de taille d'écriture attestée contre son token UCM : `S` et `sm`, `M` et `md`, `L` et `lg`, `XL` et `xl`, `Extra Large` et `xl`, `Middle` et `md`. | 6 | `mesure` (Q-F5-6) |

**Q. Questions de nom (C12, C13)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| Q1 | Deux valeurs renommées dans le même axe : `Color`, `Size`, `State`. | 3 | C7 ×2 et C13 ×2 dont les candidats sont les deux seuls orphelins, sans présélection |
| Q2 | Une valeur renommée dans `Color` et une dans `Size` à la fois. | 1 | `mesure` : C7 ×2, question possible ou non (Q-F5-4) |
| Q3 | Un axe `Size` qui apparaît dans les tokens de couleur et de taille, une valeur renommée. | 1 | C12 avec un seul candidat |

**M. Matrice et borne (C31, E-44)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| M1 | Variant retiré. 1 variant à 6 positions (premier, dernier, 4 tirés), 2 variants (2 cas), une ligne entière sur un axe (3 cas), 10 variants tirés, la moitié des variants. | 13 | C31 pour exactement les combinaisons retirées |
| M2 | Deux variants de mêmes valeurs. | 2 | aucune levée, identifiants uniques |
| M3 | Borne : 16×16×16 complet, avec 1 variant retiré, sans variant (4 096 constats attendus, durée mesurée) ; 17×241 = 4 097 complet ; 17×16×16 complet puis avec 1 retiré ; 2^20 combinaisons sans variant ; 65×64 avec 1 retiré ; une matrice creuse de 8 axes à 25 920 combinaisons déclarées et 300 variants. | 9 | à 4 096 ou moins : P7 exact. Au-delà : une information qui dit le total (`mesure`, Q-F5-7) |
| M4 | Axe dégénéré : valeurs dupliquées, valeur vide, propriété `VARIANT` sans `valeurs`. | 3 | aucune levée, aucun identifiant dupliqué |
| M5 | Lecture incomplète : `variantsNonLus` non vide, `layersNonLus` à `inconnu`. | 2 | aucun C31, C32 ni C33 |

**O. Orphelins et couverture (C32, C33)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| O1 | Token nommé d'une valeur qu'aucun variant ne porte, dans chacun des 4 axes. | 4 | C32 `sans-variant` |
| O2 | Token que nul layer ne lie : `border`, `icon`, `foreground` de couleur, `gap`, `padding`, `radius` de taille. | 6 | C32 `inutilise` |
| O3 | Token lié seulement par une liaison illisible : `fills`, `width`, `strokes`. | 3 | aucun C32 (P10) |
| O4 | Token de taille lié seulement dans le variant d'un wrapper de dimensions. | 2 | aucun C32 |
| O5 | Tous les tokens d'une famille retirés pour une valeur d'axe, pour les 12 valeurs. | 12 | C33 pour chaque variant de cette valeur, plus C7 de la valeur |
| O6 | Token au nom illisible : segments d'état et de palette échangés, segment en trop, famille `color` absente, préfixe de composant différent (`BtnPrimary`), `colours` seul, rôle inconnu. | 6 | `mesure` (Q-F5-8) |

**S. Styles de texte (C64, C65)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| S1 | Texte sans style ni variable : 1 variant à 3 positions, tous les variants. Texte à styles mixtes (2 plages, 3 plages, 1 plage à style et 1 plage directe). | 7 | C64 `sans-style-ni-variables` pour les 4 premiers. Les styles mixtes : `mesure` (Q-F6-6) |
| S2 | Style différent : 1 variant sur 12 dans son groupe de taille (4 positions). Style propre à une taille (`sm` et `md` partagent, `lg` diffère), 3 cas. 2 variants seulement, 3 variants dont 1 diffère, 3 variants tous différents. Deux layers `Text` de styles différents dans chaque variant, puis permutés dans un seul. Un layer renommé dans un variant. Un texte masqué, un texte sous un parent masqué. | 15 | C64 `style-different` pour les 4 premiers, aucun pour les cas de taille (`mesure`, Q-F6-2), aucun sous 3 variants unanimes, aucun pour un texte masqué. Les autres : `mesure` |
| S3 | `fontSize` et `fontWeight` liés à `primitives`, `theme`, `layout`, `components` (8). `lineHeight`, `letterSpacing`, `fontFamily` liés à `primitives` (3). Liaison absente alors que les voisins en ont une, 2 champs à 2 positions (4). Liaison sur plage et sur layer (2). Variable de `typography` d'un autre champ (2). Liaison illisible ou collection absente (2). | 21 | C65 `mauvaise-collection` (8), C65 `sans-liaison-comme-les-autres` (4), aucun pour les liaisons valides et illisibles. `lineHeight` et les autres : `mesure` (Q-F6-7) |

**I. Icônes (C66, C67, E-26)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| I1 | Icône qui n'est pas une instance de library : instance d'un composant local, vecteur nu nommé `icon`, frame nommé `icon` qui contient des vecteurs, instance d'un composant principal local. | 4 | C66 `pas-une-instance` ou `instance-locale` |
| I2 | Taille : non liée, liée à `layout/sizing/16`, liée à un token du composant, liée à `primitives`, `width` seul lié, `width` et `height` liés à deux variables. | 6 | C66 `taille-sans-variable` ou `taille-hors-icone`. Le token du composant : `mesure` (Q-F6-1) |
| I3 | Couleur : `fills` non lié, lié à `theme/…/border`, lié à un token du composant, lié à `primitives`, couleur portée par `strokes`, deux fills dont un seul lié. | 5 | C66 `couleur-sans-variable` ou `couleur-hors-premier-plan`. Token du composant et `strokes` : `mesure` (Q-F6-1, Q-F6-5) |
| I4 | Deux icônes (`icon-left`, `icon-right`) dont une puis les deux fautives, dans un variant (2). Icônes dans un variant masqué ou sous un parent masqué (2). Même défaut dans les 12 variants (1). | 5 | un constat par nom de layer, aucun constat pour les icônes masquées, un constat unique qui nomme 12 variants |
| I5 | Instance pilotée par une propriété absente du jeu, puis par une propriété renommée. Instance non pilotée. Slots INSTANCE_SWAP qui portent un avatar, une illustration, un contenu libre (3). Propriété INSTANCE_SWAP que nul layer ne pilote. | 7 | C67 `propriete-absente` pour les 2 premiers, information `icone-non-pilotee` pour le 3e. Les slots hors icône et la propriété sans layer : `mesure` (Q-F6-4) |
| I6 | Définition d'icône. 23 layers passés aux trois fonctions : 10 non-icônes (`Silicone` FRAME, `Silicon`, `Lexicon` TEXT, `Semiconductor`, `Iconoclast` TEXT, `Iconography` FRAME, `IconButton` FRAME, `icon-container` FRAME, `icon-label` TEXT, un TEXT nommé `Icon`), 6 icônes (`icon`, `Icon/Left`, `leading-icon`, `trailing icon` instances de library, une instance pilotée nommée `Icon`, une instance pilotée nommée `Slot`), 7 ambiguës (`Pictogram`, `Glyph`, `icône`, `Symbol`, `Vector` nu, `Ico`, `icons`). Puis les couples nom `icon` et nom `Silicone` contre 4 types (INSTANCE, FRAME, VECTOR, BOOLEAN_OPERATION). | 31 | les non-icônes et les icônes : verdict `attendu`, identique pour C66, C49 et C17. Les ambiguës : `mesure` (Q-F6-3) |

### 3.4 Combinaisons

Un pool d'environ 60 atomes est tiré des opérateurs V1, V2, V3, V4, Q1, M1, O1, O2, O3, O5, S1, S2, S3, I1, I2, I3 et I5. Chaque atome déclare la zone qu'il touche : un couple (axe, valeur) pour F5, un couple (layer, variant) pour F6. La liste est figée dans `combinaisons.ts`.

- 200 paires et 100 triples sont tirés avec la graine, sur les 3 profils de la section 3.2.
- Deux atomes se combinent seulement si leurs zones sont disjointes. L'oracle d'une combinaison est alors l'union des oracles des atomes, ce qui teste l'indépendance des contrôles. Un atome de F5 et un atome de F6 se combinent sur le même composant.
- Les 32 cas d'interaction déclarée (16 couples, 2 profils) sont inclus dans les 300. Chaque couple a un oracle propre.

| Couple | Oracle attendu |
|---|---|
| V1 et M1 sur la valeur renommée | C7, question et C31 de la combinaison retirée, indépendants |
| V1 et O1 sur un autre axe | candidats limités à l'orphelin de l'axe renommé |
| V1 sur `Color` et V1 sur `Size` | `mesure` : deux C7, questions possibles ou non |
| V3 et V4 sur le même token | C8 seul, pas de C9 en plus |
| M1 et O5 | C31 de la combinaison retirée, C33 seulement pour les variants présents |
| A3 et V1 | `mesure` : le second axe du rôle |
| O2 et M1 sur l'unique variant du token | C32 `sans-variant` et C31 |
| A4 et V1 | `mesure` : lecture des tokens à valeurs de palette puis renommage |
| S2 sur un variant et S1 sur un autre | deux constats distincts, un par variant |
| S3 `mauvaise-collection` et S3 `sans-liaison` sur le même texte | `mauvaise-collection` seul |
| S2 de taille et S2 d'écart | seul l'écart est signalé |
| I1 et I2 sur la même icône | deux constats C66, motifs distincts |
| I1 et I5 `propriete-absente` | C66 et C67 |
| S1 sur un TEXT nommé `Silicone` | C64 seul, aucun C66 |
| I2 et I3 par `strokes` | `mesure` : tailles et couleurs jugées séparément |
| V1 et I2 sur le même composant | union des deux oracles |

### 3.5 Graine et total

La graine est 7105, avec un générateur pseudo-aléatoire à 32 bits (`mulberry32`) dont le tirage suit l'ordre trié des identifiants de cas. Une même graine rend les mêmes cas.

| Section | Contenu | Cas |
|---|---|---|
| A | Faux positifs (section 4) | 180 |
| B | Opérateurs simples | 371 |
| C | Combinaisons | 300 |
| D | Chaîne sandbox et écran (section 5.3) | 63 |
| | Total | 914 |

Détail de B : F5 270 (A 137, V 66, Q 5, M 29, O 33) et F6 101 (S 43, I 58).

## 4. Faux positifs

Les 60 profils de la section 3.2 doivent donner zéro constat et une lecture complète des tokens (P1). Quatre corpus s'y ajoutent. Chaque cas vérifie aussi P6, donc rejoue un ordre mélangé des variants et une écriture changée du nom d'axe.

| Corpus | Contenu | Cas |
|---|---|---|
| FP1 | Les 60 profils : 10 jeux, 3 écritures du nom d'axe, 2 écritures des valeurs | 60 |
| FP2 | Valeurs attestées, une par composant à un axe, le token écrit comme la valeur. 30 tailles (`xs` à `3xl`, `S` à `XXL`, `Mini`, `Micro`, `Slim`, `Small`, `Medium`, `Large`, `Extra Large`, `X-Large`, `Middle`, `Default`, `Compact`, `Comfortable`, `Desktop`, `Mobile`, `1` à `4`). 20 états (`Default`, `Rest`, `Enabled`, `Hover`, `Hovered`, `Focus`, `Focused`, `Focus-visible`, `Pressed`, `Press`, `Active`, `Disabled`, `Disable`, `Loading`, `Selected`, `Checked`, `Dragged`, `Error`, `Read-only`, `Visited`). 18 palettes (`Primary`, `Secondary`, `Tertiary`, `Accent`, `Brand`, `Neutral`, `Danger`, `Destructive`, `Critical`, `Negative`, `Success`, `Positive`, `Warning`, `Info`, `Informative`, `Discovery`, `Inverse`, `Error`). 20 styles (`Solid`, `Soft`, `Surface`, `Outline`, `Ghost`, `Classic`, `Filled`, `Tonal`, `Text`, `Link`, `Plain`, `Dashed`, `Contained`, `Outlined`, `Elevated`, `Invisible`, `Transparent`, `Subtle`, `Standard`, `Fill`). | 88 |
| FP3 | Valeurs limites : `1.5`, `2.5`, `v2.0` (point), `Small/Medium` (barre), `Défaut`, `Survol`, `Pressé`, `Désactivé`, `Actif` (accents). | 9 |
| FP4 | Composants F6 valides : 5 textes (style seul, variables de `typography` seules, style et variables, plusieurs plages au même style, style par taille), 6 icônes (liaisons de base, `fills` sur le layer, `width` seul lié, 3 noms de library `lucide/chevron-down`, `check_circle`, `ph-caret-down`), 10 non-icônes de l'opérateur I6 posées comme layers du composant, 2 composants sans texte ni icône (`Divider`, point de `Badge`). | 23 |
| | Total | 180 |

Le verdict de FP2 vient des registres : une valeur dont la forme reconnue est une forme tolérée de `REGISTRE_ETATS` ou de `REGISTRE_TAILLES` (`Hovered`, `Focused`, `Rest`, `Press`, `Disable`, `Small`, `Medium`, `Large`) attend C8 ou C10 avec le terme canonique (D3). Toute autre valeur attend zéro constat. Les 4 valeurs de palette tolérées (`Critical`, `Positive`, `Informative`, `Error`) sont `mesure` (Q-F5-5). Les 4 cas de FP3 à point ou à barre sont `mesure` (Q-F5-10).

## 5. Harnais

### 5.1 Emplacement

Le code vit hors de `npm test`, dans deux dossiers.

| Dossier | Contenu |
|---|---|
| `packages/kit/tests/stress/f5-variants/` | Hors de `tests/`, donc non découvert par `run-tests.cjs`. Le cadre commun est dans `packages/kit/tests/stress/commun/` (`prng.ts`, `types.ts`, `comparer.ts`). `corpus/` (noms et valeurs attestés), `portF3.ts`, `profils.ts`, `composantDeBase.ts`, `operateursAxes.ts`, `operateursValeurs.ts`, `operateursQuestions.ts`, `operateursMatrice.ts`, `operateursOrphelins.ts`, `fauxPositifs.ts`, `combinaisons.ts`, `relations.ts`, `appliquer.ts`. |
| `packages/kit/tests/stress/f5-variants/typo/` | `operateursTexte.ts`, `operateursIcones.ts`, `definitionsDIcone.ts` (appel des trois fonctions d'icône). |
| `packages/plugin-architect/scripts/stress/f5-variants/` | `chaine.ts` (sandbox et écran), `executer.ts`, `rapport.ts`, `signatures.ts` (rattachement d'un écart à un E connu), `recette.ts`. |

Lancement, après construction du kit comme le font les scripts du plugin.

```sh
npm run stress:variants --workspace ucm-architect-plugin -- --graine 7105
```

Le script `stress:variants` de `packages/plugin-architect/package.json` appelle `node ../../scripts/construire-plugin.mjs verifier-kit architect` puis `npx tsx scripts/stress/f5-variants/executer.ts`. Options prévues : `--famille F5|F6`, `--section A|B|C|D`, `--operateur V1`, `--cas V1-04` (rejoue un cas et imprime le relevé, les constats et l'oracle), `--rapide` (P0 seul pour les sections B et C) et `--strict` (sortie non nulle au premier écart `attendu`).

### 5.2 Appel du kit puis de l'écran

1. Le générateur rend un `ReleveDeComposant`, un `CatalogueDeReference` (`collectionsDeReference(…, 'ucm')`) et sa carte.
2. L'opérateur copie le relevé et le catalogue, applique la dégradation et rend l'oracle du cas.
3. Le harnais appelle `controlerNommage`, `controlerOublis` et `controlerLaTypographie`, plus `axeDePropriete` pour l'opérateur A. Pour l'opérateur I6 et P19, il appelle aussi `controlerMapping` (C17), `controlerLAccessibilite` (C49) et `controlerCouches` (C80) sur un composant réduit.
4. Pour la chaîne complète, il appelle `traiterAvec` de `sandbox/analyse.ts` avec un double de `Lecteurs`, comme `tests/analyse.test.ts`, puis `traiter` de `sandbox/questions.ts` pour répondre. Le message passe ainsi par les ignorés et par la retenue des corrections.
5. Le harnais appelle `elementsDuPanneau`, `carteDeQuestion` et le contenu de `ui/ignores/modele.ts` sur le faux DOM de `tests/domDeTest.ts`. Il lit la section, la phrase, le statut, les boutons et les cases.
6. `appliquer.ts` applique au relevé la réponse d'une question (valeur renommée dans la propriété et dans chaque variant) pour P13.
7. `ecrireLesNomsDeValeurs` tourne sur le double de `figmaDeTest.ts` (`atelierDEcriture`, `jeuDeVariants`).

Les relations métamorphiques entre cas (`relations.ts`).

| Id | Relation |
|---|---|
| Rel-1 | Mélanger l'ordre des propriétés, des valeurs et des variants ne change aucun constat. |
| Rel-2 | Changer l'écriture du nom d'un axe reconnu dans les deux écritures ne change aucun constat. |
| Rel-3 | Changer la casse du nom du composant et des tokens ne change aucun constat. |
| Rel-4 | Renommer un layer qui n'est pas une icône (`label` en `text`) ne change aucun constat C64 à C66. |

### 5.3 Cas de la chaîne (section D)

| Id | Cas | Nombre | Propriétés |
|---|---|---|---|
| D1 | Ignorer un constat, le retrouver sous Ignorés, « Ne plus ignorer ». Un cas par code : C7, C8, C9, C10, C12, C13, C31, C32, C33, C64, C65, C66, C67. | 13 | P14 |
| D2 | Réponses. Les 12 cas V1 répondus puis relus (convergence). Les 3 candidats d'un C13 de `Color`, dont 2 sont déjà des valeurs, écrits un par un (refus attendu pour les 2). Cases décochées d'une correction `nom-de-valeur` au premier affichage et à la relecture (2). Boutons Ignorer et « Ne plus proposer » sur une carte C12 et une carte C13 (2). | 19 | P4, P13 |
| D3 | Écriture. Valeur qui contient une virgule, valeur qui contient `=`, même valeur dans deux propriétés, nom de propriété à espace (`Fill style`), changement de casse seule (`danger` en `Danger`), 72 variants dans un lot, jeu supprimé, relevé périmé. | 8 | P13 |
| D4 | Section, phrase et statut de chaque couple (code, motif) : C7, C8, C9, C10, C12, C13, C31, C32 (`sans-variant`, `inutilise`), C33, C64 (`sans-style-ni-variables`, `style-different`), C65 (2 motifs), C66 (6 motifs), C67 (`propriete-absente`, 2 limites). | 23 | P12, P24 |

### 5.4 Rapport et temps

Le rapport s'écrit dans `_local/stress/f5-variants/` (dossier ignoré par Git) en deux fichiers, `rapport.json` et `rapport.txt`. Le `.txt` porte ce tableau, une ligne par opérateur.

| Opérateur | Cas | Attendus | Détectés | Manqués | Faux constats | Candidats inexacts | Mal placés | Non affichés | Cochées | En attente |
|---|---|---|---|---|---|---|---|---|---|---|

Il porte aussi le total par section et par famille, puis la liste des écarts. Chaque écart donne l'identifiant du cas, la propriété violée, l'écart connu rattaché (E-26, E-27, E-33, E-35, E-36, E-44) ou la mention « nouveau », et la commande qui rejoue le cas.

Le temps d'exécution est à mesurer au lot 8. Le seuil visé est 240 secondes pour les 914 cas sur le poste du mainteneur. S'il est dépassé, le lot 8 règle `--rapide` sans réduire le nombre d'opérateurs. Les cas M3 à 4 096 et à 2^20 combinaisons portent chacun un budget de 2 secondes et une borne mémoire, et le harnais les abandonne avec un constat de durée.

## 6. Deux temps

### 6.1 Mesure de l'existant

Le `verificateur` lance le harnais sur le code actuel. La conversation principale lit `rapport.txt`, classe chaque écart (défaut, limite assumée, cas à trancher) et rattache les nouveaux à un identifiant. Elle présente au mainteneur le tableau des écarts nouveaux et celui des cas `mesure`, puis résume le tout dans `MESURE-DES-FAILLES.md`. Rien n'est corrigé dans cette étape.

Écarts que la lecture du code laisse prévoir. « Sonde » marque une hypothèse déjà rejouée sur le kit.

| Hypothèse | Opérateur | Source | État |
|---|---|---|---|
| `Kind`, `Type`, `Tone`, `Emphasis`, `Hierarchy`, `Density`, `Shape` ne sont pas des axes : C7 se tait pour un axe `Kind` dont la valeur n'a pas de token. | A1, A3 | `nommage.ts` (`axeDePropriete`) | sonde |
| Un axe `Variant` à valeurs de palette (Primer : default, primary, danger) rend les tokens `primary` et `danger` illisibles (lecture ambiguë, `lecture` vide). Le composant correct reçoit C7 ×2, C12 ×2, C32 `inutilise` ×2 et C33 ×4. | A4, FP1 | `grammaire.ts` (`comparerLectures`, égalité de score) | sonde |
| `Status` est toujours l'axe d'états, même avec des valeurs de sévérité (info, success, warning, danger). | A4 | `vocabulaire.ts` (`REGISTRE_AXES_ETAT`) | sonde du rôle, lecture à mesurer |
| Un second axe du même rôle est ignoré : avec `Variant` et `Appearance`, seul `Variant` est contrôlé. | A3 | `nommage.ts` (`axesDesProprietes`, `!axes[axe]`) | sonde |
| Les candidats de C12 et C13 comprennent les tokens que d'autres valeurs de l'axe portent déjà. Pour un axe à plusieurs valeurs, C12 n'existe donc jamais, et la carte propose des renommages que l'écriture refuse (`fait-faux`). Le premier candidat devient le bouton principal. | V1, Q1, D2 | `nommage.ts` (boucle de `candidatsParFamille`), `ui/questions/modele.ts` (`questionDeNom`), `ecriture/noms-de-valeurs.ts` | sonde |
| C9 est asymétrique : `Primary` contre `primary` donne C9, `Hover` contre `hover` rien. `S` contre `s` et `Extra Large` contre `extra-large` donnent aussi C9. | V3, V5 | `nommage.ts` (le registre ne couvre que l'état et la taille) | sonde |
| Une forme tolérée de palette (`error`, `critical`) ne donne ni C8 ni C10, alors que celle d'un état en donne un. | V4 | `nommage.ts` (`registre` nul pour la palette) | lecture |
| Au-delà de 4 096 combinaisons déclarées, C31 rend zéro constat, sans information ; à 4 096 exactement et sans variant, il en rend 4 096. | M3 | `oublis.ts` (`combinaisons`) | sonde |
| Une matrice creuse à axes booléens (cas fréquent chez Untitled UI) dépasse 4 096 combinaisons déclarées avec quelques centaines de variants : C31 ne parle alors jamais. | M3 | `oublis.ts` | lecture |
| Des valeurs dupliquées dans une propriété donnent des identifiants C31 dupliqués. | M4 | `oublis.ts` (`combinaisons`) | lecture |
| Un token du composant dont le nom ne se lit pas (`lecture` vide) est sauté par C32 et C33 : aucun constat. | O6 | `oublis.ts` (`if (!token.lecture.length) continue`) | lecture |
| Une valeur à point ou à barre rend le segment mal formé et tous les tokens de cette valeur illisibles. | FP3 | `grammaire.ts` (`segmentBienForme`) | lecture |
| C64 compare tous les variants sans tenir compte de l'axe de taille : 3 variants dont un seul en `Label/Large` donnent `style-different`, alors que le style suit la taille. | S2 | `typographie.ts` (`valeurUnanimeHorsContribution`) | sonde |
| Un texte à styles mixtes reçoit le motif `sans-style-ni-variables`, parce que le relevé range alors `style: null`. | S1 | `releveDuComposant.ts` (`texteDe`), `typographie.ts` | sonde |
| Une icône liée aux tokens du composant reçoit `taille-hors-icone` ×2 et `couleur-hors-premier-plan`, alors que la liaison directe à `layout` et à `theme` que C66 réclame relève de C80. Le statut dit « Liez-la à une taille de layout/icon ». | I2, I3 | `typographie.ts` (`estUneTailleDIcone`, `estUnPremierPlan`), `couche.ts` | sonde |
| Une icône à tracé, couleur liée par `strokes`, reçoit `couleur-sans-variable`. | I3 | `typographie.ts` (`champ === 'fills'`) | sonde |
| `Silicone`, `Lexicon` ou `IconButton` en FRAME reçoivent C66 ×3 et l'information C67 ; `Pictogram`, `Glyph` et `icône` ne sont jamais reconnus. | I6, FP4 | `typographie.ts` (`NOM_D_ICONE`) | sonde |
| C17 attend `icon` pour un fond nommé `IconButton`, `Silicone` ou `icon-bg`, et `border` pour les `strokes` d'une icône liés à `icon`, alors que C66 veut `icon` ou `foreground`. | I6, P21 | `mapping.ts` (`estUneIcone`, `rolesAdmis`) | sonde |
| Toute INSTANCE_SWAP est une icône : un slot d'avatar reçoit C66 et l'information C67. | I5 | `typographie.ts` (`estIcone`, `pilotee`) | lecture |
| `taille-hors-icone` porte `champ: width`, donc l'écran le range dans Tailles, alors que les autres motifs de C66 vont dans Texte. | D4 | `ui/panneau/elements.ts` (`elementDuConstat`) | lecture |
| Le texte de C64 `sans-style-ni-variables` parle du style des autres variants (E-36). | D4 | `ui/textes/ignores.ts` | lecture |
| C67 affiche le nom Figma de la propriété avec son suffixe `#id` (`Icon#1:2`). | D4 | `releveDuComposant.ts` (`proprietesDe`), `ui/textes/ignores.ts` | lecture |
| Les cartes de question et la correction `nom-de-valeur` arrivent cochées ou sans Ignorer (E-34, E-35). | D2 | `ui/corrections/index.ts`, `ui/questions/` | lecture |
| Deux layers de même nom dans un variant mêlent leurs fréquences et font passer un style permuté pour l'unanimité. | S2 | `typographie.ts` (`sources` groupe par `layer.nom`) | lecture |

### 6.2 Tests de régression

Une fois la mesure lue, des cas représentatifs deviennent des tests dans `npm test`.

| Fichier | Contenu | Cas |
|---|---|---|
| `packages/kit/tests/stressVariants.test.ts` | Un test par opérateur A, V, Q, M, O qui a révélé un écart, avec 1 à 3 cas de la graine 7105, plus les propriétés P1 à P11 rejouées sur P0 et p18. | 40 à 55 |
| `packages/kit/tests/stressTypographie.test.ts` | Un test par opérateur S et I qui a révélé un écart, plus P15 à P23 rejouées sur la base de 12 variants. | 30 à 40 |
| `packages/plugin-architect/tests/variantsStress.test.ts` | Les cas D1 à D4 et les cas de P12 à P14 qui ont révélé un écart. | 25 à 35 |

Un test dont le défaut n'est pas corrigé porte `{ todo: '<écart>' }` de `node:test`. Il s'exécute, et son échec ne fait pas échouer `npm test`. La correction du code retire le `todo`. Les trois fichiers durent moins de 12 secondes ensemble. Le harnais complet reste hors de `npm test`.

## 7. Recette Figma

Ce qui ne se prouve qu'en Figma. Le mainteneur dégrade une copie d'un fichier UCM de recette qu'il a déjà, avec un composant de bouton à axes et à icône. Le plan ne crée et ne migre aucun fichier. Le harnais imprime dans `_local/stress/f5-variants/recette-figma.txt` les cartes attendues pour chaque geste.

| N° | Geste du mainteneur | Ce qu'il vérifie |
|---|---|---|
| G1 | Ouvrir Architect, mode Composant, sur la copie intacte. | Les constats propres au fichier, comptés avant tout geste. |
| G2 | Renommer la valeur `danger` en `Destructive` dans le jeu. | C7 sur l'axe, une question dont les candidats sont les seuls orphelins, sans bouton principal quand ils sont plusieurs. Noter si Figma renomme les variants et la liste des options d'un seul geste. |
| G3 | Répondre à la question, puis Appliquer, puis Historique. | La correction arrive décochée. Le nom des variants change, les autres propriétés restent. Ctrl+Z défait le lot. |
| G4 | Dupliquer un variant et lui donner une valeur neuve (`tertiary`). | C7 de la valeur, C33 par famille, C31 pour les combinaisons manquantes. |
| G5 | Supprimer un variant. | C31 pour cette seule combinaison. |
| G6 | Renommer l'axe `Color` en `Tone`, `Kind`, `Type`, `Intent`. | Quels noms gardent les constats de nommage. |
| G7 | Recréer l'axe `Variant` de Primer (default, primary, danger). | Les constats d'un composant correct, ou aucun. |
| G8 | Ajouter quatre propriétés `VARIANT` à deux valeurs pour dépasser 4 096 combinaisons déclarées. | L'information de borne. Noter la limite de variants que Figma impose. |
| G9 | Écrire une valeur de taille `1.5`, puis `Small/Medium`. | La réaction de Figma et celle du plugin. |
| G10 | Détacher le text style d'un label dans un variant. | C64 `sans-style-ni-variables`, sa phrase et sa section. |
| G11 | Appliquer deux text styles à deux mots d'un même label. | Le constat des styles mixtes. |
| G12 | Donner le style `Label/Medium` au variant `lg`. | C64 `style-different` ou aucun, selon la décision Q-F6-2. |
| G13 | Remplacer l'instance d'icône par un vecteur collé, puis par un composant local. | C66 `pas-une-instance`, puis `instance-locale`. |
| G14 | Lier la taille et la couleur de l'icône à un token du composant, puis directement à `layout` et à `theme`. | Les constats C66 et C80 dans les deux cas. |
| G15 | Renommer le frame du bouton en `Silicone`, puis `IconButton`. | Les constats C66 et C17 qui apparaissent. |
| G16 | Remplacer l'icône par une icône à tracé et lier sa couleur aux strokes. | `couleur-sans-variable` ou aucun. |
| G17 | Supprimer la propriété INSTANCE_SWAP de l'icône. | Noter si Figma garde la référence : si oui, C67 `propriete-absente` est atteignable. |
| G18 | Brancher un composant d'avatar dans un slot INSTANCE_SWAP. | Les constats C66 et C67 du slot. |
| G19 | Ignorer un C12, puis « Ne plus proposer », puis « Ne plus ignorer ». | La carte quitte la liste, passe sous Ignorés et revient. |
| G20 | Lire un composant de plus de 300 variants. | Temps de lecture et d'analyse noté. |

## 8. Lots d'exécution

Le plan d'ensemble reste dans la conversation principale. Un lot par appel d'agent, au plus deux lots en parallèle. Après chaque lot, la conversation relit le diff, un `verificateur` relance les vérifications, puis `npm run agents:diff`. Le prompt de chaque implémenteur contient la note du lot, la nature de la tâche et la sortie de `npm run agents:lire -- <chemins du lot>`.

Les lots 1 à 8 supposent que le lot 0 de F2 (cadre commun) et le lot générateur de F3 et F4 sont livrés. Si l'un manque, le lot 1 s'arrête et la conversation décide de l'ordre.

| Lot | Fichiers | Agent | Critères de fin |
|---|---|---|---|
| 1a Corpus | `corpus/axes-attestes.json`, `corpus/valeurs-attestees.json` | deux `chercheur` en parallèle (chacun la moitié des 15 systèmes), puis la conversation principale | 35 noms d'axes et 88 valeurs, chacun avec système, composant, source et verdict. Les 19 noms `attendu` ont une source. Les entrées sans source restent `mesure`. |
| 1b Profils et base | `portF3.ts`, `profils.ts`, `composantDeBase.ts` | `implementeur-exigeant` | Les 60 profils donnent zéro constat C7 à C13 et C31 à C33 et une lecture complète. P0 compte 72 variants. La base de 12 variants donne zéro constat C64 à C67 hors information. Un profil non vide en constats est lui-même un résultat à remonter. |
| 2 Opérateurs A, V, Q | `operateursAxes.ts`, `operateursValeurs.ts`, `operateursQuestions.ts` | `implementeur-exigeant` | Les opérateurs rendent 137 + 66 + 5 = 208 cas, chacun avec un oracle rédigé. Dégrader puis annuler redonne la base. |
| 3 Opérateurs M, O | `operateursMatrice.ts`, `operateursOrphelins.ts` | `implementeur` | Les opérateurs rendent 29 + 33 = 62 cas. Les cas M3 portent leur budget de durée. Les lots 2 et 3 touchent des fichiers distincts et tournent ensemble. |
| 4 Opérateurs S, I | `typo/operateursTexte.ts`, `typo/operateursIcones.ts`, `typo/definitionsDIcone.ts` | `implementeur-exigeant` | Les opérateurs rendent 43 + 58 = 101 cas. `definitionsDIcone.ts` appelle les trois fonctions d'icône sur les 31 cas de I6. |
| 5 Faux positifs | `fauxPositifs.ts` | `implementeur` | Les 4 corpus rendent 180 cas, dont l'oracle de FP2 est calculé depuis les registres. Les lots 4 et 5 touchent des fichiers distincts et tournent ensemble. |
| 6 Combinaisons et relations | `combinaisons.ts`, `relations.ts`, `appliquer.ts` | `implementeur-exigeant` | 200 paires, 100 triples et 32 interactions rendent des oracles sans zone partagée. Rel-1 à Rel-4 s'appliquent sans changer une base. `appliquer.ts` applique une réponse C12 ou C13 au relevé. |
| 7 Chaîne sandbox et écran | `packages/plugin-architect/scripts/stress/f5-variants/chaine.ts`, `signatures.ts` | `implementeur-exigeant` | Les 63 cas D1 à D4 s'exécutent. Le faux DOM rend les cartes, les boutons et les cases. Chaque propriété P12 à P14 et P24 rend un verdict sur un composant qui porte tous les codes. Le lot 7 ne dépend que des lots 1a et 1b et tourne avec le lot 6. |
| 8 Exécuteur et rapport | `executer.ts`, `rapport.ts`, `packages/plugin-architect/package.json` (script `stress:variants`) | `implementeur` | `npm run stress:variants --workspace ucm-architect-plugin -- --graine 7105` finit sur 914 cas, imprime le tableau de la section 5.4, écrit `rapport.json` et `rapport.txt`, et rejoue un cas par `--cas`. Deux exécutions donnent le même rapport. Le temps mesuré est noté. `npm run typecheck` passe. |
| 9 Mesure de l'existant | aucun fichier de code | `verificateur`, puis la conversation principale | `rapport.txt` du code actuel est lu en entier. Chaque écart est classé et rattaché. Les 24 hypothèses de la section 6.1 sont confirmées ou infirmées. Le tableau des écarts nouveaux et celui des cas `mesure` sont remis au mainteneur et résumés dans `MESURE-DES-FAILLES.md`. |
| 10 Régression | `packages/kit/tests/stressVariants.test.ts`, `packages/kit/tests/stressTypographie.test.ts`, `packages/plugin-architect/tests/variantsStress.test.ts` | `implementeur` | Les trois fichiers couvrent chaque écart classé au lot 9. `npm test` passe, les écarts non corrigés portent `todo`, et les trois fichiers durent moins de 12 secondes. |
| 11 Scénario de recette | `packages/plugin-architect/scripts/stress/f5-variants/recette.ts`, sortie `recette-figma.txt` | `implementeur` | Le fichier donne, pour G2 à G19, les cartes et les phrases attendues d'après l'oracle. Le mainteneur le lit avant la recette. |

Ordre : 1a avec 1b si F3 est livré, puis 2 avec 3, puis 4 avec 5, puis 6 avec 7, puis 8, 9, 10 et 11.

## 9. Questions au mainteneur

Chaque proposition vaut décision provisoire. Les cas liés restent `mesure` dans le rapport, comptés à part, jusqu'à la confirmation du mainteneur. Les tests de régression `todo` suivent la décision Q-F2-9.

| Id | Question | Proposition |
|---|---|---|
| Q-F5-1 | Quel rôle pour les noms d'axes ambigus : `Type`, `Kind`, `Shape`, `Density`, `Spacing`, `Destructive`, `Danger`, `High contrast`, `Loading`, `Selected` ? | `Type`, `Kind` et `Shape` valent `style`, `Density` et `Spacing` valent `taille`. Une propriété booléenne (`Destructive`, `Danger`, `High contrast`, `Loading`, `Selected`) n'est pas un axe : aucun segment de token ne lui correspond. |
| Q-F5-2 | Quand le nom d'un axe donne un rôle et que ses valeurs sont des termes d'un autre registre (Primer `Variant` à valeurs `primary` et `danger`, `Status` à valeurs de sévérité), qui décide ? | Le nom décide. La lecture d'un token accepte d'abord la valeur de l'axe à la position de cet axe, avant tout terme d'un autre registre. |
| Q-F5-3 | Deux axes du même rôle (`Variant` et `Appearance`) donnent-ils un constat ? | Le premier axe est contrôlé comme aujourd'hui. Une information grise dit que le second n'est pas contrôlé, sans action. |
| Q-F5-4 | Deux valeurs renommées dans deux axes à la fois donnent-elles une question ? | Non. C7 sans question, puisque les candidats se déduisent des autres axes concordants. La question revient quand un seul axe est ouvert. |
| Q-F5-5 | C9 et C8 s'appliquent-ils à la palette comme à l'état et à la taille ? | Aucun C9 pour la casse d'un terme connu de la palette, de l'état ou de la taille. C8 s'étend à la palette (`error` pour `danger`). C9 reste pour les valeurs hors registre. |
| Q-F5-6 | `S`, `M`, `L`, `XL`, `Extra Large`, `Middle` sont-ils des formes tolérées de `sm`, `md`, `lg`, `xl` ? | Oui pour `s`, `m`, `l`, `xl`, `extra-large`, `x-large`, `middle`, ajoutés à `REGISTRE_TAILLES` comme formes tolérées. Le résultat est alors C10, pas C9 ni C7. |
| Q-F5-7 | Que dit C31 au-delà de 4 096 combinaisons déclarées ? | Une information qui donne le total déclaré et le nombre de variants. Sous la borne, au plus 200 constats listés, puis « et N autres ». |
| Q-F5-8 | Un token du composant au nom illisible donne-t-il un constat ? | Oui : C32, motif `nom-illisible`, en À faire, ignorable. |
| Q-F5-9 | Les noms d'axes français (`Couleur`, `Intention`, `Gravité`, `Variante`, `Apparence`, `Hiérarchie`) sont-ils reconnus ? | Oui, avec le rôle de leur équivalent anglais. Aucun design system relevé n'en porte : la liste vient du mainteneur. |
| Q-F5-10 | Une valeur à point (`1.5`) ou à barre (`Small/Medium`) s'écrit-elle dans un token ? | Le point et la barre deviennent un tiret dans le segment attendu (`1-5`). Le constat de nom le dit, et C7 ne parle pas d'un token absent. |
| Q-F6-1 | Une icône se lie-t-elle à des variables de `layout` et de `theme`, ou à des tokens du composant ? | Aux tokens du composant, comme tout layer. C66 accepte un token de `components` dont le dernier segment est `icon` ou `foreground` pour la couleur, et `icon-size` pour la taille. La liaison directe à `layout` ou à `theme` relève de C80 seul. Les textes « Liez-la à une taille de layout/icon » changent. |
| Q-F6-2 | C64 compare-t-il les styles à l'intérieur d'une même valeur de l'axe de taille ? | Oui quand le composant a un axe de taille. Sans axe de taille, la comparaison reste globale. |
| Q-F6-3 | Quelle définition unique d'une icône ? | Une instance qu'une propriété INSTANCE_SWAP pilote, ou une instance de la library d'icônes, ou un VECTOR ou BOOLEAN_OPERATION dont le nom contient le mot entier `icon`, `icône`, `glyph`, `pictogram` ou `symbol`. Un FRAME ou un TEXT n'est jamais une icône. `Silicone` et `Lexicon` ne contiennent pas le mot entier. Une fonction unique du kit sert C66, C49 et C17. |
| Q-F6-4 | Un slot INSTANCE_SWAP qui ne porte pas d'icône (avatar, illustration) est-il jugé comme une icône ? | Non. Le slot n'est une icône que si le nom de sa propriété ou celui du layer contient un mot d'icône. Sinon aucun C66, et C67 ne le compte pas. |
| Q-F6-5 | La couleur d'une icône à tracé, liée par `strokes`, compte-t-elle ? | Oui. Les `strokes` tiennent lieu de couleur quand aucun fill n'est visible. C17 admet alors `icon` ou `foreground` pour ces strokes. |
| Q-F6-6 | Un texte à styles mixtes reçoit-il C64 ? | Non. Une information `styles-mixtes` le dit. C64 `sans-style-ni-variables` reste pour une plage sans style ni variable. |
| Q-F6-7 | C65 s'étend-il à `lineHeight`, `letterSpacing` et `fontFamily` ? | Oui, aux huit champs de `CHAMPS_DE_TYPOGRAPHIE`, avec la même règle que `fontSize` et `fontWeight`. |
