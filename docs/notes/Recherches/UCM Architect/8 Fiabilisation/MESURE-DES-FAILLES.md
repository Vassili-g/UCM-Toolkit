# Mesure des failles d'UCM Architect

Ce document réunit, famille par famille, ce que les harnais de stress test mesurent sur le code actuel. Chaque mesure donne son commit, sa commande, ses totaux, et rattache les écarts à l'inventaire ([INVENTAIRE-VERIFICATIONS.md](./INVENTAIRE-VERIFICATIONS.md), E-01 à E-45) ou les numérote comme nouveaux (N-xx). Les rapports complets sont sous `_local/stress/<famille>/`, ignoré par Git. Aucune correction n'est faite à ce stade.

## F1 Noms de Nomenclature

Mesure du lot 3 (`248624a2`), graine 7001, `npm run stress:f1` : 22 591 cas en 200 secondes.

| Strate | Contenu | Attendus | Détectés | Manqués | Faux positifs |
|---|---|---|---|---|---|
| S1 | Faute au placement de référence | 1 402 | 779 | 623 | 0 |
| S2 | Grille de placement des fautes | 7 020 | 90 | 6 930 | 0 |
| S5 | Formes tolérées | 624 | 462 | 162 | 0 |
| S6 | Synonymes | 784 | 484 | 300 | 0 |
| S7 | Pluriels et terminaisons | 182 | 62 | 120 | 16 |
| S8 | Casse | 720 | 0 | 720 | 0 |
| S9 | Termes de plusieurs mots | 50 | 0 | 50 | 0 |
| S10 | Mots collés | 1 350 | 1 296 | 54 | 0 |
| S11 | Branches parallèles | 190 | 48 | 142 | 9 |
| S12 | Collections | 100 | 70 | 30 | 0 |
| S13 | Collisions | 648 | 392 | 256 | 0 |
| S14 | Formes tolérées mutées | 60 | 0 | 60 | 0 |
| S15 | Mots distincts légitimes | 116 | 100 | 16 | 45 |
| S16 | Mutations sur les noms des design systems | 2 794 | 1 093 | 1 701 | 0 |
| S17 | Mots proches de deux termes | 120 | 0 | 120 | 0 |
| Total | | 16 160 | 4 876 | 11 284 | 70 |

Les strates S3 (fautes à deux lettres) et S4 (deux mots hors vocabulaire) sont comptées à part, car elles dépendent des décisions provisoires Q-F9 et Q-F1.

Le kit détecte 30 % des défauts de nom attendus. Les manqués se rattachent ainsi (un manqué peut relever de plusieurs écarts) :

| Écart | Manqués | Cause |
|---|---|---|
| E-05 | 7 803 | une faute doit partager une place avec le mot juste |
| E-01 | 5 571 | la référence doit apparaître dans 5 noms au moins |
| E-03 | 4 312 | l'échange de deux lettres n'est pas une faute |
| E-02 | 4 231 | une faute présente dans 3 noms ou plus n'est plus vue |
| E-08 | 567 | une forme tolérée bloquée par collision ne pose aucune question |
| E-09 | 162 | forme tolérée dans un bloc gardé entier (`status`, `etat`) |
| E-06 | 120 | une référence inconnue bloque sans repli |
| E-10 | 96 | pluriel d'une forme tolérée |
| E-04 | 61 | faute sur un terme de `REGISTRES_COMPOSANTS` |
| E-45 | 52 | branches parallèles au-delà de 12 branches |
| E-11 | 16 | synonymes hors des 9 groupes en dur |

Les cas du mainteneur sortent comme prévu : `backgrond` (E-01), `bordre` (E-03), `paddng` (E-04), `separators` (E-10) et `separator` près de `divider` (E-08) sont manqués. `separator-thin` est détecté : le kit le renomme en `divider-thin`. E-09 ne se reproduit qu'avec les formes tolérées `status` et `etat`.

Écarts nouveaux :

| Id | Écart | Mesure |
|---|---|---|
| N-01 | Le renommage n'est pas idempotent : un second passage renomme encore, ou pose une question nouvelle, sur 14 fichiers des design systems sur 100 (`@media(orientation:Landscape)` dans `mui`, `paire:line\|lines` dans `primer`, `faute:gap\|gapx` dans `ucm`) | P-21, 86 sur 100 |
| N-02 | Une faute dont la référence est une forme tolérée (`colors`, `attention`, `error`) n'est pas vue : le kit renomme la référence avant d'observer la faute | 379 manqués de S1 |
| N-03 | Aucun des 720 cas de casse (S8) n'est détecté. La cause, kit ou oracle, reste à établir | 720 manqués de S8 |

939 manqués et 46 faux positifs restent rattachés à « nouveau » dans `_local/stress/f1-noms/rapport.md`, en attendant le classement des faux positifs (lot 4).

Sur la visibilité à l'écran, 2 064 questions détectées sans seuil donnent 281 questions rangées dans « Autres pistes » avec les paramètres de la session (seuil 2, maximum 10) ; aucune n'est perdue.

### Faux positifs et seuil de longueur

Mesure du lot 4 (`f4a5fe90`) : 64 passes sur 59 484 noms justes des design systems. Le kit y produit 19 faux positifs certains, soit 0,32 pour 1 000 noms : 2 fautes et 17 terminaisons. Les fréquences des strates S6, S12 et S13 sont désormais effectives, et le total passe à 4 839 détectés sur 16 152 attendus.

La courbe projette la règle voulue par D2 (une faute est un mot à une lettre d'un terme connu, sans condition de fréquence ni de place) selon la longueur minimale L du terme. Elle ne mesure pas le kit actuel, dont la constante de 5 lettres ne règle que le découpage des mots collés.

| L | Fautes attendues | Termes perdus | Faux positifs certains | Pour 1 000 noms |
|---|---|---|---|---|
| 3 | 1 384 | 0 | 261 | 4,39 |
| 4 | 1 279 | 7 | 229 | 3,85 |
| 5 | 1 069 | 26 | 129 | 2,17 |
| 6 | 801 | 47 | 100 | 1,68 |
| 7 | 532 | 69 | 20 | 0,34 |
| 8 | 321 | 88 | 2 | 0,03 |

La règle provisoire Q-F4 (moins de 1 faux positif pour 1 000 noms justes) retient L = 7, ce qui laisse sans détection les fautes sur 69 termes de moins de 7 lettres, `border` et `radius` compris. Ce compromis est une question pour le mainteneur à l'étape V2.

### Fichier Slice

Mesure du lot 5 (`df6ef65c`), `npm run stress:f1 -- --slice <chemin>`. Le détail, qui cite des noms du fichier, reste sous `_local/stress/f1-noms/slice/`.

- Le fichier compte 2 415 noms en 5 collections et 2 011 alias.
- Le renommage n'y est pas idempotent : un second passage renomme encore (N-01).
- Sur 209 fautes introduites dans ses noms, le kit en détecte 122 et en manque 87. Aucune des 40 inversions de deux lettres n'est vue (E-03). Les 49 synonymes et formes tolérées introduits sont tous vus.
- Le contrôle `--verifier-fuite` ne trouve aucun mot du fichier dans les 2 339 fichiers suivis par Git.

## F3-F4 Liaisons et tailles du composant

Mesure partielle du lot 2 (`e5b28b4f`), graine 7103, profil P0 (`button-36`) : opérateurs L, R et K, 150 cas.

| Opérateur | Contenu | Attendus | Détectés | Manqués | Faux constats |
|---|---|---|---|---|---|
| L | Liaisons d'axe (C16, C22) | 56 | 54 | 0 | 0 |
| R | Rôles (C24) | 41 | 41 | 0 | 0 |
| K | Cibles, couches et scopes (C18, C19, C20, C80) | 88 | 86 | 2 | 3 |
| Total | | 185 | 181 | 2 | 3 |

Quatre écarts de L5 dépendent de Q-F3-12 et sont comptés à part. Écarts observés :

| Id | Écart | Rattachement |
|---|---|---|
| N-04 | C18 accuse une icône ou une forme dont le token porte le scope `SHAPE_FILL` | hypothèse K4 du plan, confirmée ; test en `todo` dans `stressComposantBase.test.ts` |
| N-05 | C18 accepte `FRAME_FILL` sur une forme (RECTANGLE, VECTOR) | nouveau, miroir de N-04 |
| N-06 | Palette et état faux sur une même liaison donnent deux cartes, C16 et C22, dont aucune ne vise le token qui corrige les deux segments | Q-F3-12 |
| N-07 | C20 accuse l'alias d'un token de composant vers un autre token de `components` | Q-F3-15, réservée au mainteneur |
| N-08 | C63 `theme` sort en plus de C20 sur un alias de `components` vers `brands` dont la cible porte un segment de mode | nouveau |
| N-09 | `proposerLaPropagation` pose 70 questions sans candidat sur un composant entièrement lié, une par plage de texte et par variant visé | hypothèse du lot 1 |

Mesure du lot 3 (`8809b935`), même profil : opérateurs M, U, T et S, 126 cas.

| Opérateur | Contenu | Attendus | Détectés | Manqués | Faux constats | Corrections inexactes |
|---|---|---|---|---|---|---|
| M1 | Fratrie (C21) | 8 | 8 | 0 | 0 | 0 |
| M2 | Propagation et modèle (C24, C81) | 1 498 | 1 283 | 1 | 556 | 214 |
| U | Peinture unie sans token (C25) | 41 | 2 | 32 | 2 | 5 |
| T | Texte de surface sans fond (C59) | 38 | 24 | 0 | 0 | 0 |
| S | C63 `vide` et `theme` du mode Composant | 18 | 12 | 5 | 0 | 1 |

484 écarts dépendent de décisions provisoires (Q-F3-1, Q-F3-6, Q-F3-9, Q-F3-10) et sont comptés à part. Écarts observés :

| Id | Écart | Rattachement |
|---|---|---|
| N-09 | Chaque plage de texte donne une question de propagation sans candidat, que le variant visé soit nu ou déjà lié : 70 questions par cas sur P0, soit presque tous les 556 faux constats de M2 | confirmé, plus large que prévu (`propagation.ts`) |
| N-10 | La propagation reprend une liaison directe à `theme` ou un token au nom illisible, et propose 35 corrections et un C81 | Q-F3-6 |
| E-25 | C25 ne juge que le texte nommé `title` : 32 des 41 peintures sans token sont manquées | confirmé ; décision Q-06 |
| N-11 | Pour le texte `title`, la correction de C25 manque dans 4 ordres de propriétés sur 5 : le suffixe du token suit l'ordre des propriétés du jeu, pas celui de la grammaire | hypothèse 1 du plan, confirmée |
| N-12 | C25 accuse une peinture d'opacité 0 et une lecture mixte | nouveau |
| N-13 | C59 ne juge que la liaison directe à `theme` : un token de composant aliasé à `surface/foreground` ne déclenche rien, et la correction vise `theme/page/foreground` au lieu d'un token du composant | hypothèse 9 du plan, confirmée |
| N-14 | Une liaison de plage est énumérée deux fois, d'où deux C59 de même identifiant | nouveau (`theme.ts`, `liaisonsDuLayer`) |
| N-15 | C63 `vide` ne sort jamais sur un composant conforme : une sœur en alias ne compte pas comme une sœur qui a une valeur | nouveau (`structure.ts`) |
| N-16 | C63 `theme` propose une correction vers la cible d'une sœur, donc vers la palette d'une autre | hypothèse 16 du plan, confirmée |
| N-17 | C80 juge une liaison héritée d'une dépendance | hypothèse 10 du plan, confirmée |

Mesure du lot 4 (`c9ea9657`), même profil pour Z, X et les thèmes ciblés, 96 profils pour la base : 282 cas.

| Opérateur | Contenu | Attendus | Détectés | Manqués | Faux constats |
|---|---|---|---|---|---|
| Z | Tailles en dur (C29) | 113 | 97 | 0 | 0 |
| X | Lecture et entrées dégradées | 0 | 0 | 0 | 3 |
| A1 à A9 | Composants valides ciblés | 0 | 0 | 0 | 2 |
| A0 | 96 profils valides | 0 | 0 | 0 | 3 324 |

C29 tient ses 42 cas de proximité, ses cas exacts et `counterAxisSpacing`. Les 3 324 faux constats de A0 sont tous le C18 de N-04, sur les 48 profils aux scopes précis. 20 écarts dépendent de décisions provisoires et sont comptés à part.

| Id | Écart | Rattachement |
|---|---|---|
| N-18 | C29 compare en égalité stricte : un écart de 1e-6 px ou `0,1 + 0,2` face à `0,3` devient une question proche au lieu d'une correction | Q-F3-11, 7 cas |
| N-19 | De deux tokens proches à égalité, C29 n'en montre qu'un | Q-F3-11 |
| N-20 | C29 ne lit ni la famille `sizes` ni la propriété `border-radius` | Q-F3-13, 7 cas |
| N-21 | C16 accuse un token d'un autre état alors que la variable visée est non chargée ou inaccessible, ou que `components` est inaccessible | nouveau |
| N-22 | `divider` sur un fond ou un trait, `inverse` sur un texte et `ring` en fond reçoivent une correction de rôle (C24) | Q-F3-3 |


### Chaîne jusqu'à l'écran et l'écriture

Mesure du lot 6, `npm run stress:composant --workspace ucm-architect-plugin` : les 67 cas de la section D en 30 secondes. Le harnais monte le vrai panneau sur le faux DOM, puis écrit dans le double de Figma. Le composite fusionne 44 cas du kit et porte tous les codes de la portée sauf C25, que le kit n'émet pas (E-25).

| Série | Contenu | Cas | Tiennent | Écarts | Écarts en attente |
|---|---|---|---|---|---|
| D1 | Cases décochées | 17 | 0 | 17 | 0 |
| D2 | Cartes de question | 24 | 6 | 18 | 0 |
| D3 | Affichage de tous les codes | 6 | 4 | 2 | 0 |
| D4 | Doublon du moteur | 4 | 0 | 4 | 0 |
| D5 | Écriture | 11 | 4 | 5 | 2 |
| D6 | États | 5 | 2 | 3 | 0 |
| Total | | 67 | 16 | 49 | 2 |

Les deux écarts en attente dépendent de Q-F3-5 (D5-6) et de Q-F3-12 (D5-10). L'écriture d'une plage de texte, d'une marge et d'un rayon tient, et un variant renommé saute en `objet-change`.

| Écart | Cas | Ce que l'écran fait |
|---|---|---|
| E-34 | 15 | Les corrections arrivent cochées, Appliquer est actif, et « Tout cocher » et « Tout décocher » manquent par section et au global. La propagation du modèle coche 422 lignes sur 424. |
| E-35 | 12 | Les cartes de question n'ont ni Ignorer ni « Ne plus proposer ». |
| E-25 | 12 | Sans C25 sur un fond, un trait ou une plage, la carte « lier », ses motifs de saut et le doublon avec C30 ne se jugent pas. |
| E-30 | 2 | C29 et C30 donnent deux cartes pour la même valeur en dur. |
| N-15 | 3 | Sans C63 `vide`, aucune carte de question. |
| E-28 | 1 | La correction `alias-de-mode` de C63 a une case, mais l'écran ne l'envoie pas à l'écriture. |
| E-31 | 1 | L'échec de la lecture des ignorés laisse le statut `complete`. |
| E-32 | 1 | Sur un moteur partiel, la bannière dit « 1 variants lus sur 1 ». |
| E-38 | 1 | Une analyse périmée ne dessine aucune carte. |
| N-06 | 1 | Palette et rôle faux sur une même liaison : la seconde correction saute en `fait-faux`. |

Écarts nouveaux :

| Id | Écart | Mesure |
|---|---|---|
| N-23 | Le résultat provisoire ne dessine aucune carte : 0 carte de corrections et 0 carte À faire, pour 1 et 113 dans le modèle. Le mainteneur a tranché : le provisoire montre ses cartes | D3-5 |

D6-4 n'est pas un écart du plugin. Tant que la library reste à choisir, `barre.ts` désactive Analyser et le panneau demande le choix avec « Ouvrir la configuration ». Le harnais force une analyse que l'interface empêche. Le lot de régression réécrit D6-4 pour juger l'écran avant l'analyse.

## F2 Structure du mode Tokens

Mesure des lots A1 (`e20a3e3d`) et A2 (`2ce2db12`), graine 7102, profil P0 (`p14`), `npx tsx packages/kit/tests/stress/f2-structure/mesurer.ts` : 426 cas d'opérateurs et 85 faux positifs, avec les deux relations métamorphiques, en 58 secondes.

| Opérateur | Contenu | Cas | Attendus | Détectés | Manqués | Faux constats | Corrections inexactes | En attente |
|---|---|---|---|---|---|---|---|---|
| R | Rôles retirés (C82 `variable-absente`) | 53 | 100 | 100 | 0 | 0 | 0 | 0 |
| K | Crans déplacés (C82 `cran`) | 78 | 76 | 59 | 5 | 0 | 0 | 12 |
| M | Modes croisés (C60, `mode-du-theme`) | 41 | 41 | 29 | 0 | 0 | 5 | 12 |
| L | Alias, library, valeurs (C63) | 48 | 89 | 78 | 0 | 0 | 22 | 11 |
| S | Scopes (C63, C82) | 43 | 42 | 41 | 1 | 0 | 0 | 0 |
| Y | Couches, types, rangement (C82) | 63 | 66 | 61 | 0 | 0 | 0 | 5 |
| E | Doublons d'échelle (C63) | 13 | 10 | 8 | 1 | 0 | 0 | 1 |
| Q | Noms inconnus dans `theme` | 67 | 67 | 0 | 63 | 63 | 0 | 4 |
| X | Structure globale, entrées dégradées | 20 | 12 | 2 | 0 | 5 | 0 | 17 |
| Total | | 426 | 503 | 378 | 70 | 68 | 27 | 62 |
| A | Faux positifs (72 profils, 13 thèmes ciblés) | 85 | 0 | 0 | 0 | 0 | 0 | 0 |

R1 compte 47 attendus pour 39 cas, car un rôle retiré casse aussi l'alias des couleurs de `components` qui le visaient (C63 `alias-supprime`). Les 62 écarts en attente dépendent de Q-F2-1 (Q3), Q-F2-2 (K2), Q-F2-3 (K3), Q-F2-4 (M1), Q-F2-5 et Q-F2-6 (X1, X2), Q-F2-8 (L2, E1) et de deux cas sans question numérotée (Y4 `ring` hors de `theme`, troisième mode de `theme`).

Les relations métamorphiques tiennent. Mélanger l'ordre des variables ou changer la casse des noms laisse les mêmes constats sur les 511 cas, et aucun contrôle ne modifie son entrée. Aucun contrôle ne lève, même sur les 8 entrées dégradées de X6 (cycles, clé en double, nom vide).

Le kit émet 0 faux constat sur les thèmes valides. Ses faux constats viennent tous de deux causes : Q1 et Q2 (63) et les variables non chargées de X3 (5).

| Id | Écart | Rattachement |
|---|---|---|
| E-19 | Une faute ou un synonyme de rôle dans `theme` (`primary/solid/deault`, `surface/outline`) ne donne aucune question ; le kit propose à la place de créer le rôle absent, qui doublonne la variable fautive | confirmé ; hypothèse 4 du plan ; les 63 cas Q1 et Q2 |
| N-24 | C60 ne voit pas un alias vers l'autre branche quand le mode est un segment du chemin d'une rampe à modes de marque (`primary/dark/300`) | hypothèse 1 du plan, confirmée ; 12 cas M1 en attente de Q-F2-4 |
| N-25 | Un rôle déplacé sur le cran de l'autre table vote pour l'autre sens, et son cran faux disparaît sans constat : `page/foreground` et `page/border` dans les deux modes, `ring` en Light | hypothèse 2 du plan, confirmée ; K1-21 à K1-24, K1-27 |
| N-26 | Un rôle aliasé vers l'autre branche au cran de son propre mode donne une question C60 sans candidat, au lieu de la correction vers la bonne branche | nouveau ; M3-1 à M3-4 |
| N-27 | C60 pose une question à deux candidats quand le cran fautif vaut pour les deux sens, car il ne lit pas le sens de la palette | nouveau ; M1-19 |
| N-28 | La voisine citée par `alias-supprime` est choisie sur le dernier segment : `primary/surface/default` pour `primary/solid/default` | hypothèse 3 du plan, confirmée ; 22 constats L1 sur 24 |
| N-29 | Un rôle présent deux fois dans une palette n'est jugé que pour la première variable | hypothèse 5 du plan, confirmée ; X2-2, en attente de Q-F2-6 |
| N-30 | L'identifiant de `C82:cran-absent` ne porte pas la collection : deux collections `theme` donnent deux constats de même identifiant, que le plugin dédoublonne | hypothèse 6 du plan, confirmée ; X1-1 |
| N-31 | Une variable `theme` non chargée compte comme absente : le kit propose de créer 5 rôles qu'il n'a pas lus | nouveau ; X3-3 |
| N-32 | C82 `scopes` ne juge que les couleurs : un scope posé sur une variable FLOAT de `primitives` passe | nouveau ; S2-10 |
| N-33 | Les doublons d'échelle comparent les nombres tels quels : `0,1 + 0,2` et `0,3` ne forment pas un doublon | nouveau ; E1-7 |

Sans library choisie, une cible inaccessible ne donne aucun constat (L2-9, L2-10, Q-F2-8). `ring` rangé hors de `theme` n'est pas vu, faute de slash dans son nom (Y4, en attente). Un nom de `theme` sans proximité ne donne aucune information (Q3, Q-F2-1). Le constat C63 `scopes` et la question C60 n'ont pas de genre dans le kit (S1-1, M2-1) ; le lot B mesure ce que l'écran en fait (E-20, E-21).

Le plan compte 19 paires de couches interdites et 6 admises pour Y1 ; l'oracle, écrit d'après `CIBLES_DES_COLLECTIONS`, en trouve 20 et 5.

### Interactions et chaîne jusqu'à l'écran

Mesure du lot B (`25ecbd3e`). Les 24 interactions déclarées tournent sur P0, p37 et le profil tiré p24, en section C de `mesurer.ts` : 33 attendus, 30 détectés, 3 manqués, 3 faux constats et 3 corrections inexactes. Les écarts redisent E-19 (I2, faute sur un rôle voisin d'un rôle retiré) et N-26 (I5, cran et branche faux sur la même variable). Les six autres couples tiennent, et le sens d'une palette reste celui des rôles non dégradés quand deux rôles votants sont déplacés (I3).

La chaîne, `npm run stress:structure --workspace ucm-architect-plugin`, passe 28 cas par le sandbox et le vrai panneau monté sur le faux DOM, en 7 secondes.

| Série | Contenu | Cas | Tiennent | Écarts |
|---|---|---|---|---|
| D1 | Lecture qui échoue (P13) | 4 | 0 | 4 |
| D2 | Cases décochées (P12) | 10 | 1 | 9 |
| D3 | Proposition ignorée (P11) | 5 | 2 | 3 |
| D4 | Motifs de saut (P14) | 8 | 2 | 6 |
| D5 | Composite de 18 cas du kit, tous les genres émis (P9, P10) | 1 | 0 | 1 |
| Total | | 28 | 5 | 23 |

Aucun écart n'est nouveau. Les hypothèses 7 et 8 du plan sont confirmées.

| Écart | Cas | Ce que l'écran fait |
|---|---|---|
| E-22 | 9 | Les cartes Variables manquantes, Modes, Scopes C63 et Scopes C82 arrivent cochées, Appliquer est actif, et « Tout cocher » et « Tout décocher » manquent dans chaque section, crans compris. À la relecture, une ligne ajoutée arrive cochée. |
| E-24 | 6 | Les motifs `objet-change`, `fait-faux`, `cible-introuvable`, `erreur`, `non-ucm` et `journal-impossible` n'ont pas de texte : l'écran dit « 0 corrections écrite, 1 sautée. » |
| E-23 | 4 | Une lecture qui lève, un catalogue `null` ou un refus de Figma donnent « Rien à régler ». Des réglages illisibles font réapparaître l'ignoré et perdent la création. |
| E-21 | 3 | Ignorer la proposition d'un constat de scopes, de C82 comme de C63, fait disparaître le constat, qui n'est pas non plus sous Ignorés. E-21 s'étend donc à C63 `scopes` (hypothèse 7, D3-2). |
| E-20 | 2 | La question C60 sans correction n'a pas de genre et n'a aucune carte (hypothèse 8, D5-1). |

Les cas qui tiennent : un cran ajouté à la relecture reste décoché (D2-7), ignorer la proposition d'un cran ou d'une variable absente laisse le constat (D3-4, D3-5), et `deja-la` et `existe-divergente` ont un texte (D4-7, D4-8).

## F5-F6 Variants, typographie et icônes

Mesure du lot 1 (`7a05a0a1`), graine 7105, `npx tsx packages/kit/tests/stress/f5-variants/mesurer.ts` : les 60 profils et 270 cas de variants (F5) en 60 secondes. P0 est un `Button` de 72 variants (`Style`, `Color`, `Size`, `State`) sans constat. Le corpus des noms d'axes vient des tableaux du plan et de quatre sources figées du dépôt, sans relevé web.

| Opérateur | Contenu | Cas | Attendus | Détectés | Manqués | Faux constats | Corrections inexactes | En attente |
|---|---|---|---|---|---|---|---|---|
| A | Noms d'axes | 137 | 94 | 42 | 19 | 91 | 0 | 33 |
| V | Valeurs renommées (C7 à C10, C12, C13) | 66 | 2 280 | 2 260 | 12 | 10 | 0 | 13 |
| Q | Questions de valeur | 5 | 1 504 | 1 499 | 5 | 1 | 2 | 1 |
| M | Matrice trouée (C31) | 29 | 4 969 | 4 963 | 0 | 1 | 0 | 6 |
| O | Tokens orphelins (C32, C33) | 33 | 387 | 381 | 1 | 7 | 0 | 5 |
| Total | | 270 | 9 234 | 9 145 | 37 | 110 | 2 | 58 |

Les tokens de P0 écrivent les tailles `small`, `medium`, `large`, et ses variants `sm`, `md`, `lg`. Sinon le registre des dossiers rend C10 sur chaque token. Le test de garde dure 3,3 secondes, pour 3 demandées.

36 profils sur 60 ne sont pas muets. Primer (`Variant` à valeurs de palette), Fluent (`Appearance`, `Shape`) et Spectrum (`Fill style`) donnent des C7, C13 et C33, et de 72 à 192 tokens sans lecture. Carbon (`Kind`), Untitled UI (`Hierarchy`) et Ant Design (`Type`) ne donnent aucun constat, alors que 240 à 288 de leurs tokens de couleur ne se lisent pas. Les 24 autres profils (MUI, Polaris, UCM, Radix) sont muets avec une lecture complète.

| Id | Écart | Rattachement |
|---|---|---|
| E-27 | `Kind`, `Type`, `Tone`, `Emphasis`, `Hierarchy`, `Density`, `Shape`, `Colour` et `Fill style` ne sont pas des axes : leurs tokens deviennent illisibles sans un mot | confirmé ; hypothèse 1 ; 19 manqués de A1, profils J3, J5, J8 |
| E-33 | C32 `inutilise` accuse un token que seule une liaison illisible lie | confirmé ; O3-1 à O3-3 |
| E-44 | Au-delà de 4 096 combinaisons, C31 se tait sans information | confirmé ; hypothèse 8 ; M3-4 à M3-8 |
| N-34 | Une valeur écrite `sm`, `md` ou `lg` dans un axe ne correspond jamais au token `small` : `correspondAuxAutresAxes` compare les formes, `memeValeurDAxe` les termes, et C12 et C13 disparaissent | nouveau ; V1-1 à V1-5, V1-9 à V1-12, Q1-1, Q1-3 |
| N-35 | Les candidats d'une question de valeur comptent des valeurs déjà présentes, et un candidat unique présent dans deux familles donne C13 au lieu de C12 | hypothèse 5, confirmée ; Q1-2, V1-6 à V1-8, Q3-1 |
| N-36 | Un axe `Variant` à valeurs de palette (Primer) rend ses tokens illisibles : C7 et 24 C33, sans C12 ni C32 | hypothèse 2, confirmée ; A4-1, p07 |
| N-37 | C9 est asymétrique : `primary` face à `Primary` donne C9, `Default` face à `default` ne donne rien ; `S` et `Extra Large` donnent C9 au lieu d'une forme tolérée | hypothèse 6, confirmée ; V3-3, V5-1, V5-5 |
| N-38 | Une valeur répétée dans un axe donne deux C31 de même identifiant | hypothèse 10, confirmée ; M4-1 |
| N-39 | Un token au nom illisible est sauté par C32 et C33 sans constat | hypothèse 11, confirmée ; O6-1 à O6-6 |
| N-40 | Un token d'une palette hors registre (`tertiary`) non lié donne C32 `inutilise` au lieu de `sans-variant` | nouveau ; O1-2 |
| N-41 | Une matrice de 16 × 16 × 16 variants dépasse le budget de 2 secondes (2,9 s) | nouveau ; M3-1, M3-2 |

Le second axe d'un même rôle est ignoré sans le dire (hypothèse 4, A3-1). La forme tolérée d'une palette (`error`, `critical`) ne donne ni C8 ni C10 (hypothèse 7, V4-13, V4-14, en attente de Q-F5-5). La famille `Colours` rend 432 tokens illisibles sans constat (V4-12, en attente de Q-F5-8). Une matrice creuse à axes booléens (25 920 combinaisons pour 300 variants) se tait comme au-delà de la borne (hypothèse 9, M3-9).

### Typographie, icônes, faux positifs et interactions

Mesure du lot 2 (`16ff841e`), même commande : 101 cas de F6, 180 faux positifs, 32 interactions et les deux relations, en 188 secondes, dont 102 pour les relations.

| Opérateur | Contenu | Cas | Attendus | Détectés | Manqués | Faux constats | En attente |
|---|---|---|---|---|---|---|---|
| S | Styles de texte (C64, C65) | 43 | 28 | 16 | 4 | 0 | 12 |
| I | Icônes (C66, C67) et définitions | 58 | 112 | 67 | 7 | 18 | 30 |
| Total F6 | | 101 | 140 | 83 | 11 | 18 | 42 |

| Faux positifs | Cas | Résultat |
|---|---|---|
| FP1 | 60 profils | 24 muets ; les 36 autres, ceux de E-27 et N-36, portent 849 faux constats |
| FP2 | 88 valeurs attestées | 13 formes tolérées attendues, 9 vues, 4 palettes en attente de Q-F5-5, aucun faux constat |
| FP3 | 9 valeurs limites | `1.5`, `2.5`, `v2.0` et les accents passent ; `Small/Medium` donne C7, C12, C32 et C33 (Q-F5-10) |
| FP4 | 23 composants F6 valides | 30 faux constats : chacune des 10 non-icônes reçoit 3 C66 |

Les 32 interactions donnent 2 078 attendus, 1 272 détectés, 418 manqués, 22 faux constats et 393 écarts en attente. Les manques viennent presque tous de p18 (Carbon, `Kind`, N-36), et sur P0 du seul C12 de N-34. Les deux relations tiennent : mélanger l'ordre des variants (297 cas) ou changer l'écriture du nom d'axe (387 cas) ne change aucun constat.

Les trois définitions d'icône ne s'accordent que sur 5 layers sur 31. C66 prend tout nom qui contient `icon`, même un TEXT `Lexicon` ou un FRAME `Silicone`, et ignore `Pictogram`, `Glyph`, `icône` et `Symbol`. C49 ne prend que les VECTOR et BOOLEAN_OPERATION, donc aucune instance de library. C17 prend tout VECTOR et les FRAME à nom `icon`.

| Id | Écart | Rattachement |
|---|---|---|
| E-26 | Trois définitions d'icône divergentes, et des non-icônes jugées par C66 | confirmé, élargi ; I6, FP4, hypothèses 17 et 18 |
| N-42 | Sans axe de taille, C64 compare les styles de tous les variants ; un style de taille hors de son groupe ne donne rien | hypothèse 13, confirmée ; S2-1 à S2-4 |
| N-43 | Un texte à styles mixtes reçoit `sans-style-ni-variables`, jamais une information `styles-mixtes` | hypothèse 14, confirmée ; S1-5 à S1-7 |
| N-44 | Deux layers de même nom dans un variant masquent leurs styles différents : aucun `style-different` | hypothèse 24, confirmée ; S2-12 |

En attente des questions du plan : une icône liée aux tokens du composant reçoit `taille-hors-icone` et `couleur-hors-premier-plan` (Q-F6-1, I2-3, I3-3). Une couleur d'icône par `strokes` reçoit `couleur-sans-variable` (Q-F6-5, I3-5). Un slot INSTANCE_SWAP d'avatar ou d'illustration est jugé comme une icône (Q-F6-4, I5-4 à I5-6). C65 ne juge ni `lineHeight`, ni `letterSpacing`, ni `fontFamily` (Q-F6-7, S3-9 à S3-11). Les hypothèses 20 à 23 portent sur l'écran ; la version allégée ne mesure pas la chaîne de F5-F6.

## F7 Accessibilité

Mesure du lot 1 (`c47fd85d`), graine 7107, `npx tsx packages/kit/tests/stress/f7-accessibilite/mesurer.ts` : 48 profils sRGB et 294 cas en 5 secondes. L'oracle numérique rend 21 pour noir sur blanc et 4,5422 pour #767676 sur blanc. Sur 100 000 paires, il diffère de la fonction `contraste` du kit de moins de 1e-12. Les 48 profils ne donnent aucun constat C49 à C52.

| Opérateur | Contenu | Cas | Attendus | Détectés | Manqués | Faux constats | En attente |
|---|---|---|---|---|---|---|---|
| S | Seuils 3, 4,5 et 7 (C49, C50) | 96 | 46 | 46 | 0 | 0 | 0 |
| G | Grand texte, texte sous 12 px | 45 | 33 | 27 | 0 | 0 | 7 |
| O | Opacités et couches | 47 | 42 | 33 | 0 | 0 | 14 |
| F | Fonds et limites | 52 | 52 | 47 | 2 | 3 | 5 |
| M | Modes et collections | 36 | 37 | 29 | 0 | 0 | 10 |
| Y | Garanties du thème | 18 | 36 | 26 | 0 | 0 | 10 |
| Total | | 294 | 246 | 208 | 2 | 3 | 46 |

Le kit juge juste chaque paire autour des seuils 3, 4,5 et 7, à 1e-9 près. Ses écarts tiennent à ce qu'il compose sous le texte, pas au calcul du rapport.

| Id | Écart | Rattachement |
|---|---|---|
| N-45 | Un layer visible sous un parent visible sous un grand-parent masqué est jugé visible et accusé en C49 : la mémoire de `layersVisiblesDuVariant` note le parent visible | nouveau ; F5-3 |
| N-46 | Un dégradé posé sur un solide translucide ou sur un autre dégradé donne la limite `degrade` au lieu de `peinture-superposee` | nouveau ; F4-2, F4-6 |
| N-47 | Un frère placé sous le texte n'est jamais vu : le contraste se mesure sur la page Figma (2,13 attendu, 1 rendu) | hypothèse 4, confirmée ; F6-1, F6-2, F6-4 |
| N-48 | Un alpha, une opacité ou une plage sans peinture à zéro donnent un rapport de 1:1 sur un texte invisible | hypothèse 3, confirmée ; O1-9 à O1-12 |
| N-49 | La garantie du thème ne compare ni le seuil ni le niveau : elle sort `corriger` au lieu de `verifier` | hypothèse 5, confirmée ; Y1-10 à Y1-14 |
| N-50 | Un canal ou un alpha hors de [0, 1] donne un constat de contraste au lieu d'une limite, ou rien | hypothèse 16, confirmée ; M5-9 à M5-12 |
| N-51 | Un texte de 11 px dans un variant `disabled` n'est pas signalé | hypothèse 19, moitié texte, confirmée ; G3-9 |

En attente des questions du plan : l'opacité d'un ancêtre n'est pas appliquée (hypothèse 2, Q-F7-2, O5-1 à O5-5, O3-5). Un texte gras est grand dès 18,66 px (hypothèse 11, Q-F7-3, G1-7, G1-8, G1-11, G1-12, G2-2). Le kit se replie sur un seul mode du thème et manque la page et la carte du mode Dark (hypothèse 6, M6-1, M6-4). Une page ou une élévation d'alpha 0,5 est forcée opaque sans limite `fond-indetermine` (Q-F7-1, O4-10, O4-11). Le relevé ne lit pas le mode de fusion d'un layer, donc l'hypothèse 15 ne se rejoue pas hors de Figma.

### Formes, cibles, borne, faux positifs et interactions

Mesure du lot 2 (`c340662c`), même commande : 225 cas de plus (519 en tout), 94 faux positifs, 21 interactions et les deux relations, en 38 secondes. Display P3 retire les 27 cas E1 à E3 et le couple O2 et E1 des interactions.

| Opérateur | Contenu | Cas | Attendus | Détectés | Manqués | Faux constats | Exceptions | En attente |
|---|---|---|---|---|---|---|---|---|
| I | Icônes (C49 et définitions) | 41 | 26 | 13 | 0 | 0 | 0 | 13 |
| R | Contour et anneau (C50, C51) | 65 | 42 | 39 | 2 | 3 | 0 | 5 |
| Z | Cible (C52) | 34 | 20 | 19 | 1 | 0 | 0 | 0 |
| X | Variants désactivés (C53) | 30 | 38 | 33 | 0 | 0 | 0 | 7 |
| Q | Borne de 5 000 combinaisons | 19 | 17 | 14 | 0 | 0 | 0 | 3 |
| T | Texte mixte | 10 | 11 | 10 | 0 | 1 | 0 | 3 |
| L | Entrées dégradées et lectures manquées | 26 | 1 | 1 | 0 | 4 | 3 | 0 |
| Total des lots 1 et 2 | | 519 | 401 | 337 | 5 | 11 | 3 | 77 |

Les 94 faux positifs (22 thèmes ciblés et 72 garanties de palettes) et les 48 profils ne donnent aucun écart. Les palettes des garanties sont tirées de la graine, sans appel au moteur de `packages/couleur` : elles prouvent l'accord d'Architect avec la table de crans du kit, pas avec Palettes. Les 21 interactions tiennent, sauf O4 et M6 (4 en attente, hypothèse 6). Les relations tiennent sur 1 209 rejeux.

Les trois définitions d'icône se contredisent sur 25 des 36 layers de I1 à I6 (E-26, confirmé une seconde fois).

| Id | Écart | Rattachement |
|---|---|---|
| N-52 | `contrasteTronque` lève sur un canal ou un alpha NaN | nouveau ; L1-1, L1-2 |
| N-53 | Un cycle de `parent` ne termine jamais : `couchesDesAncetres` ne garde pas les ancêtres déjà vus | nouveau ; L1-13 |
| N-54 | C49 et C50 jugent un texte ou un contour dont les fills ou les strokes n'ont pas été lus, ou dont le variant n'a pas été lu ; seul C52 lit `manquees` | nouveau ; L2-2 à L2-5, R1-16 |
| N-55 | Un axe `État` aux valeurs `Défaut` et `Survol` n'est pas interactif, car `Survol` n'est pas une forme tolérée : aucun C52 pour une racine de 20 px | nouveau ; Z2-14 |
| N-56 | Une plage de texte vide (5 à 5) donne un C49 | nouveau ; T1-5 |
| N-57 | Un anneau à opacité ou alpha 0 compte comme anneau, et un contour à alpha 0 se mesure à 1:1 | hypothèse 3, confirmée pour l'anneau ; R4-4, R4-5, R1-8 |
| N-58 | Une instance `.Ring` sans peinture propre donne `C50:sans-anneau` | hypothèse 7, confirmée ; R4-9 |
| N-59 | Un anneau rempli sans contour n'est ni mesuré par C50, ni épargné par C51 | hypothèse 8, confirmée ; R4-10, R5-12 |
| N-60 | Un variant `Disabled=True` ou `Enabled=False` est mesuré comme actif | hypothèse 9, confirmée ; X2-8, X2-9 |
| N-61 | Au-delà de la borne, le constat ne dit pas quels variants sont coupés, et le produit des modes compte une collection inutile | hypothèses 12 et 13, confirmées ; Q2-2, Q4-1, Q4-2 |
| N-62 | Deux longueurs de plage pour un même texte donnent deux constats | hypothèse 14, confirmée ; T2-2 |
| N-63 | Un contour est accusé alors que le fill du layer le recouvre | hypothèse 17, confirmée ; R1-12 |

L'hypothèse 20 est infirmée : un second anneau de même nom a des identifiants distincts (R5-13, R5-14). C53 retire bien C52 d'un variant désactivé (X3-2). Les hypothèses 18 et la phrase « Contraste non mesuré » portent sur l'écran ; la version allégée ne mesure pas la chaîne de F7.

## F8-F9 Règles d'usage, moteur, lecture et états

Mesure du lot 1 (`84bffed0`), graine 7108, `npx tsx packages/plugin-architect/scripts/stress/f8-analyse/mesurer.ts` : 235 cas de F8, 67 faux positifs, 16 interactions et les deux relations, en 73 secondes. Les cas passent par le vrai sandbox d'analyse, avec un injecteur sur les 10 lecteurs. Les 48 profils de règles ne donnent ni C43 ni C45, et les 72 profils d'analyse finissent `complete`.

| Opérateur | Contenu | Cas | Attendus | Détectés | Manqués | Faux constats | Faits inexacts | En attente |
|---|---|---|---|---|---|---|---|---|
| G | Instance absente ou mal reconnue (C43) | 21 | 14 | 10 | 0 | 8 | 0 | 12 |
| H | Propriété, valeur ou règle en trop (C45) | 58 | 40 | 36 | 3 | 2 | 0 | 3 |
| J | Points « À compléter » (C44) | 6 | 21 | 21 | 0 | 0 | 0 | 0 |
| E | Écriture des règles (`creer`, `ajouter`) | 36 | 8 | 8 | 0 | 0 | 1 | 0 |
| M | Points du moteur (C30, C34, C35, C41, C42, C44) | 114 | 707 | 695 | 4 | 14 | 14 | 20 |
| Total | | 235 | 790 | 770 | 7 | 24 | 15 | 35 |

Les faux positifs donnent 3 manqués et 3 faux constats, tous sur un code choisi d'après un mot du titre (FP2-12 à FP2-14). Les relations tiennent sur 318 rejeux. Sur les 16 interactions, cinq couples tiennent. I1 redit E-30 et I6 redit E-31 (une lecture refusée laisse `complete`). I3 et I5 sont en attente de Q-F89-13 et Q-F89-12.

| Id | Écart | Rattachement |
|---|---|---|
| E-29 | C30 et C41 vont dans Couleurs même pour une marge | confirmé ; hypothèse 7 ; 11 cas M6 sur 14 |
| E-30 | C43 et C44 sortent ensemble pour la même instance absente | confirmé ; hypothèse 8 ; G1-1 à G1-6, G2-2, G2-9, M7-1, M7-2, I1 |
| E-37 | C34 reçoit tout point `proprietes` du moteur | confirmé ; hypothèse 6 ; M1-21 à M1-24, M8-3 à M8-6 |
| E-25 | Sans C25 du kit, le C30 du moteur reste seul sur une peinture en dur | confirmé ; M7-3 à M7-5 |
| N-64 | Une propriété au souligné (`show_icon`) donne `sans-regle` et `sans-propriete`, et un tiret ou un souligné dans le nom du conteneur donne un faux C43 | hypothèse 2, confirmée en partie ; H4-3, G2-7, G2-8 |
| N-65 | `Size.xxl` n'est pas rattaché à sa valeur | hypothèse 3, confirmée ; H3-7 |
| N-66 | Deux points du moteur de même empreinte prennent le même identifiant (collision trouvée en 95 398 essais) | hypothèse 4, confirmée ; M3-1, M3-6 |
| N-67 | Le code d'un point du moteur suit un mot de son titre | hypothèse 5, confirmée ; M2-1, M2-3, M2-4, M2-7, FP2-12 à FP2-14 |
| N-68 | Deux propriétés de même nom compacté se confondent | hypothèse 9, confirmée ; G2-10 |
| N-69 | Un conteneur de règles posé dans une instance donne C44 « plusieurs instances » | hypothèse 10, confirmée ; G2-14 |
| N-70 | Un conteneur sur une autre page ou un calque vide est accusé | hypothèse 11, confirmée en détection ; G2-1, G2-3, G2-4 |
| N-71 | Une analyse annulée pendant la phase `regles` laisse son modèle à la place de celui de l'analyse affichée | nouveau ; E5-4 |
| N-72 | Une cible `@prop` vide ou faite d'espaces ne donne aucun C45 `sans-propriete`, seulement un point C44 | nouveau ; H3-9, H3-10 |
| N-73 | `@boolean palette` posé sur un axe ne donne aucun constat | nouveau ; H3-12 |
| N-74 | `Size.Mode` donne `sans-regle` pour `sizeMode`, et `ExtraLarge` pour `Extra Large` donne `sans-valeur` | nouveau ; H4-9, H4-10 |
| N-75 | `reinitialiserLAnalyse` ne remet pas à zéro le compteur de génération des identités : une seconde analyse dans le même processus part à la génération 2 | nouveau ; aucun cas, lu dans le code |

L'hypothèse 1 est infirmée : le contrat remplace le point d'une valeur par un tiret, donc `1.5` n'atteint jamais les règles (H4-7, H4-8). `creer` sans modèle saute en `objet-change`, comme le plan l'attend (hypothèse 12, E1-4). Trois cas M7 restent non constructibles sans les opérateurs de F5-F6 ou la propagation.

### Lecture, budget, cycle et états de F9

Mesure du lot 2 (`e213ee45`), `npx tsx packages/plugin-architect/scripts/stress/f8-analyse/mesurer.ts --famille F9` : 344 cas, 88 faux positifs, 20 interactions et les deux relations, en 122 secondes. `seance.ts` monte l'analyse sur des lecteurs doubles et lit les messages, le panneau et la bannière. F9 ne juge pas des constats mais des faits : statut final, bannière, péremption, refus, ignorés. Le tableau compte donc les faits inexacts, plusieurs par cas au besoin.

| Opérateurs | Contenu | Cas | Faits inexacts | En attente |
|---|---|---|---|---|
| N1 à N11, Lm, Mp1 | Lectures refusées, lectures manquées, moteur partiel | 68 | 58 | 12 |
| Bd1 à Bd3 | Budget de lecture et bannière | 30 | 7 | 2 |
| An, Pe, Oc, Pr, Id, Pv | Annulation, péremption, `occupe`, prélecture, identité, provisoire | 150 | 17 | 0 |
| Li, Hu, Ig, St | Library, déclaration UCM, ignorés, statut final | 96 | 85 | 5 |
| Total | | 344 | 167 | 19 |

Les 88 faux positifs (72 profils d'analyse et 16 thèmes ciblés) ne donnent aucun écart. Les deux relations tiennent sur les 452 cas rejoués. Sur les 10 couples d'interactions, J4 à J7 et J10 tiennent sur les deux profils. J1, J2 et J3 redisent E-32, P15 et E-31. J8 tombe sur N-77 et J9 sur N-82.

| Id | Écart | Rattachement |
|---|---|---|
| E-31 | Le statut final ignore les lectures refusées : `complete` sans signal, et AAA devient AA sans le dire | confirmé ; hypothèse 13 ; 48 cas, dont N1, N2, Pv-4, Pv-11, St, J3 |
| E-32 | Un moteur partiel avec relevé complet affiche « N variants lus sur N » | confirmé ; hypothèse 14 ; Mp1, Bd3-6, St-4, J1 |
| E-38 | Le panneau périmé remplace la liste des constats par une note | confirmé ; hypothèse 19 ; 7 cas Pe |
| N-71 | Une analyse annulée laisse son modèle retenu | confirmé une seconde fois ; An-12 à An-14, An-26 à An-28 |
| N-76 | Le relevé et le moteur coupent à des variants différents (62 contre 54 ou 27) | hypothèse 14, confirmée ; Bd1-14, Bd1-15 |
| N-77 | Quand tous les constats sont ignorés, le statut reste `complete` et l'écran ne parle pas des ignorés | hypothèse 16, confirmée ; J8-1, J8-2 |
| N-78 | Une déclaration UCM qui lève saute les familles thème et structure, en silence et avec `complete` | hypothèse 17, confirmée ; N11-1, N11-2, Hu-4, Hu-5, Hu-9, Hu-10 |
| N-79 | Une library illisible laisse `complete`, sans dire que les tokens sont cherchés dans le fichier | hypothèse 18, confirmée ; N5-2, Li-16, St-3 ; la collection `inaccessible` attend Q-F89-4 |
| N-80 | `occupe` met `ecriture` à `null` alors que l'écriture continue | hypothèse 20, confirmée ; Oc-18, Oc-22 ; le silence d'`occupe` (E-39) se juge à l'écran, au lot 3 |
| N-81 | Un décompte de layers qui lève arrête le moteur | hypothèse 21, confirmée ; Bd1-9 ; la coupe des variants suivants attend Q-F89-19 |
| N-82 | La prélecture lit le relevé alors que la library est à choisir | hypothèse 22, confirmée ; Li-19, Li-20, J9 |
| N-83 | Une annulation pendant la lecture des règles compte comme lecture refusée | hypothèse 24, confirmée ; N1-3 |
| N-84 | Après un changement d'ordre de phrases jumelles, le point ignoré porte l'impact d'une autre phrase | hypothèse 4, confirmée à l'écran des ignorés ; Ig-15 à Ig-17 |
| N-85 | La bannière d'une analyse partielle donne une seule cause : elle tait les lectures échouées quand le budget coupe, et le moteur ou les règles quand une lecture échoue | P15 ; Lm2, Bd3-2, Bd3-5, J2 |

L'hypothèse 23 n'a aucun cas dans ce lot. L'hypothèse 15 (sections « tenues » dans une analyse partielle, Mp1-4) attend Q-F89-16. Deux cas n'ont pas de question au plan et restent `mesure` « à trancher ». N9-3 : un sujet sans nœud finit `complete` avec un message vide, au lieu de « Aucun composant n'est sélectionné ». Ig-10 : ignorer un constat sur une analyse périmée range sa clé (C53). Ils entrent dans les questions V2.

### Chaîne jusqu'à l'écran de F8-F9

Mesure du lot 3, `npm run stress:analyse --workspace ucm-architect-plugin -- --section D` : 129 cas en 89 secondes, et deux exécutions donnent le même rapport. La chaîne passe par `traiterAvec` du sandbox, `recevoirUneAnalyse` et le vrai panneau sur le faux DOM. D3 et D4 de F9 rejouent les 5 captures de `_local/`, toutes trouvées.

| Série | Contenu | Cas | Attendus | Détectés | Écarts | En attente |
|---|---|---|---|---|---|---|
| F8 D1 | Cartes lisibles | 4 | 26 | 26 | 0 | 0 |
| F8 D2 | Cases décochées, boutons de cochage | 6 | 13 | 3 | 7 | 0 |
| F8 D3 | Rangement par élément du panneau | 8 | 39 | 33 | 4 | 2 |
| F8 D4 | Ignorer, « Ne plus proposer », « Ne plus ignorer » | 18 | 96 | 87 | 9 | 0 |
| F8 D5 | Analyse, coche, écriture, relecture | 12 | 121 | 121 | 0 | 0 |
| F8 D6 | Doublons à l'écran | 7 | 26 | 16 | 9 | 1 |
| F9 D1 | Un écran par état | 19 | 78 | 70 | 8 | 0 |
| F9 D2 | Relecture de 20 suites de messages | 20 | 261 | 260 | 0 | 1 |
| F9 D3 | Captures sous six pannes | 30 | 190 | 140 | 50 | 0 |
| F9 D4 | Parité de la prélecture sur les captures | 5 | 40 | 40 | 0 | 0 |
| Total | | 129 | 890 | 796 | 87 | 4 |

L'écriture des règles tient de bout en bout sur les 6 formes (D5), et la prélecture promue rend la même analyse que le clic froid sur les 5 captures (D4). Sur les captures, l'annulation à mi-parcours tient. Les cinq autres pannes donnent 25 cas faux sur 25.

| Id | Écart | Rattachement |
|---|---|---|
| E-31 | Règles, niveau ou ignorés illisibles : statut `complete` et aucune alerte, sur les 5 captures | confirmé sur fichiers réels ; F9-D1-12, 15 cas F9-D3 |
| E-32 | Budget de 300 layers ou moteur partiel : « Analyse partielle : 90 variants lus sur 90 » | confirmé sur fichiers réels ; F9-D1-11, 10 cas F9-D3 |
| E-34 | Corrections de règles cochées, sans « Tout cocher » ni « Tout décocher », Appliquer actif | confirmé à l'écran ; F8-D2-1 à F8-D2-6 |
| E-29 | Une marge et un style de texte du moteur rangés dans Couleurs | confirmé à l'écran ; F8-D3-2, F8-D3-3 |
| E-25, E-30 | Sans C25, le C30 du moteur reste seul ; avec une valeur en dur de taille, deux cartes (kit et moteur) | confirmé à l'écran ; F8-D6-2 à F8-D6-7 |
| E-38 | Une analyse périmée, avant ou après écriture, remplace la liste par une note | confirmé à l'écran ; F9-D1-15, F9-D1-16 |
| N-77 | Tous les constats ignorés : aucun bouton « Ne plus ignorer » | confirmé à l'écran ; F9-D1-19 |
| N-80 | Une demande refusée pour `occupe` ramène la liste et réactive Appliquer pendant l'écriture | confirmé à l'écran ; F9-D1-18 |

Écart nouveau :

| Id | Écart | Mesure |
|---|---|---|
| N-86 | Les cartes de correction C43, C45 `sans-regle` et C45 `sans-valeur` n'ont ni Ignorer ni « Ne plus proposer » ; la correction revient à la relecture. Les cartes À faire (C45 `sans-propriete`, C44) les ont. | F8-D4-1, 2, 4, 5, 7, 8 |

Les quatre cas en attente sont F8-D3-4 (opacité rangée hors de Tokens, Q-F89-11), F8-D6-1 (C43 et C44 pour la même absence, Q-F89-5), F9-D2-14 (`occupe` muet, E-39, Q-F89-17) et F8-D5-8 (Divider n'a aucune propriété, non constructible).

## Rejeu des fichiers réels

Le rejeu remplace les combinaisons tirées au hasard de la version complète des plans. Il passe les fichiers réels dans les contrôles, sans oracle écrit cas par cas. Il juge des propriétés : aucune exception, même résultat à chaque exécution, même résultat quel que soit l'ordre, point fixe des corrections, détection de défauts injectés ensemble. Les détails, qui citent des noms, restent sous `_local/stress/rejeu-fichiers/`.

### Mode Tokens

Mesure de `npm run stress:rejeu`, graine 7110, en 6 secondes. `dtcg.ts` convertit chaque export DTCG en catalogue, et les deux contrôles tournent comme le mode Tokens les appelle (`controlerLeCatalogue`, `controlerLIntegriteUcm`). Deux exécutions donnent le même rapport, et le contrôle de fuite ne trouve aucun mot du fichier Slice dans la sortie.

| Propriété | Slice | Intencial Tokens |
|---|---|---|
| Conversion | 5 collections, 2 415 variables, 7 947 alias tous résolus | 8 collections, 755 variables, 576 alias tous résolus, 5 jetons composés sautés |
| R1 constats de base | 4 483, tous C82 sans correction | 0 |
| R2 déterminisme | 0 différence | 0 différence |
| R3 ordre (5 mélanges) | 0 différence | 0 différence |
| R4 point fixe | aucune correction émise, propriété non exercée | aucune correction émise, propriété non exercée |
| R5 défauts mêlés (20 tirages de 5) | 61 injectés, 61 détectés, 0 constat de base perdu | 45 injectés, 45 détectés, 0 constat de base perdu |

Les sept injecteurs de R5 reprennent le code et la clé d'un opérateur de F2 : L1, L4 et L5 (C63), S1 (C63), S2 (C82), M1 (C60), Y3 (C82). Sur Slice, S2, L5 et M1 ne trouvent aucune cible dans 12 à 14 tirages. Sur Intencial Tokens, S1, M1 et Y3 n'en trouvent pas dans 13 à 17 tirages, et S2 jamais.

| Id | Écart | Mesure |
|---|---|---|
| N-87 | Un thème dont les variables visent d'autres variables du thème reçoit un C82 `couche` par variable et par mode, sans correction : 908 variables sur 5 modes donnent 4 359 cartes. Le designer ne peut ni les régler ni les lire. | Slice, R1 |
| N-88 | Sans collection reconnue comme `theme`, `controlerLIntegriteUcm` rend 0 constat sans le dire : variables manquantes, couches, valeurs directes, scopes, types et rangement ne sont pas jugés. Intencial Tokens nomme son thème `color-brand-tokens`, que le référentiel ne reconnaît pas. | Intencial Tokens, R1 |

R4 reste sans preuve sur fichier réel : aucun des deux fichiers ne reçoit de correction `scope`, `alias-de-mode` ou `variable`. Seule la garde fabriquée (`tests/stressRejeuFichiers.test.ts`) applique une correction.

#### Durée des contrôles, référence de la phase D

`npm run stress:rejeu -- --chrono` donne la médiane de 11 passes, après une passe d'échauffement (lot D0, bd9f418d).

| Fichier | Variables | `controlerLeCatalogue` | `controlerLIntegriteUcm` |
|---|---|---|---|
| Premier fichier réel | 2 415 | 35 ms | 39 ms |
| Intencial Tokens | 755 | 0,9 ms | 0 ms, aucune collection `theme` reconnue |

Les deux contrôles du kit prennent moins de 0,1 s sur 2 415 variables. Ces contrôles ne couvrent pas le lexique, les renommages et les questions de Nomenclature, qui retardent le bilan des noms. Le lot D3 (8d4111ce) indexe la voisine de `controlerLesAliasesManquants` : 40 ms deviennent 11 ms sur un banc de 3 000 variables à 1 000 alias manquants, avec des constats identiques sur 428 catalogues. La durée dans Figma attend le rapport du mode Tokens (10956167), que le mainteneur télécharge.

#### Compteurs et croissance locale, lots D0.3, D0.4, D1.4 et D3.3

Les compteurs ne dépendent pas de la charge de la machine ; ils viennent du kit construit dans `packages/kit/dist` et des sources du dépôt tels qu'ils sont, avec les lots E déjà commités dans le kit. Les durées sont prises sous charge (deux autres agents travaillaient, la machine affichait 58 % de processeur) et se reprennent en D7.1.

Acquisition d'un Actualiser, appels natifs sur la fixture de 73 variables (`tests/acquisitionDesVariables.test.ts`) :

| Appel | Avant D1 | Après D1 |
|---|---|---|
| `getLocalVariablesAsync` | 3 | 1 |
| `getLocalVariableCollectionsAsync` | 2 | 1 |
| `getVariableByIdAsync` | 75 | 1 |
| `getVariableCollectionByIdAsync` | 5 | 1 |

Sur le rejeu converti en objets de Figma (`tests/acquisitionDuRejeu.test.ts`), `lire-structure` lit 0 variable par identifiant avec l'acquisition du relevé, contre 2 415 (premier fichier) et 755 (second fichier) sans elle. Le message `structure` est égal dans les deux cas : 4 888 constats et 104 corrections pour le premier fichier, 2 constats pour le second. Ces constats viennent de la conversion en objets de Figma, qui perd les valeurs des types composés ; ils ne sont pas ceux du rejeu du kit.

Contrôles du kit sur catalogues fabriqués (`npx tsx packages/plugin-architect/scripts/mesure/croissanceDuKit.ts`, 6 palettes, 30 % d'alias manquants, graine 7). Les lectures comptent les accès à `cle`, `nom` et `collection` des variables. Médiane de 11 passes après une passe d'échauffement, deux exécutions :

| Variables | `controlerLeCatalogue` : constats, lectures, ms | `controlerLIntegriteUcm` : constats, lectures, ms |
|---|---|---|
| 257 | 139, 43 972, 19,9 puis 19,6 | 126, 3 802, 8,2 puis 5,8 |
| 432 | 186, 81 343, 26,8 puis 21,5 | 239, 5 874, 11,2 puis 9,3 |
| 782 | 257, 148 634, 42,5 puis 43,7 | 467, 10 145, 14,8 puis 18,9 |
| 1 482 | 454, 259 396, 77,1 puis 64,0 | 873, 18 400, 32,9 puis 24,0 |
| 2 882 | 819, 505 877, 182,2 puis 154,4 | 1 711, 35 125, 58,8 puis 47,9 |
| 5 682 | 1 547, 982 943, 304,6 puis 268,0 | 3 374, 68 651, 112,0 puis 101,3 |

Pour 22 fois plus de variables, les lectures de `controlerLeCatalogue` sont multipliées par 22,4 et celles de `controlerLIntegriteUcm` par 18,1. La croissance est linéaire.

`controlerLesAliasesManquants`, index des voisines contre l'ancienne recherche (`tests/croissanceDuKit.test.ts`, lectures de `cle`, `nom` et `collection`) :

| Variables | Constats | Index | Ancienne recherche |
|---|---|---|---|
| 362 | 115 | 4 366 | 129 802 |
| 922 | 237 | 9 423 | 600 797 |
| 2 602 | 695 | 24 931 | 4 139 283 |

Pour des tailles multipliées par 2,5 puis 2,8, l'index multiplie ses lectures par 2,2 puis 2,6 et l'ancienne recherche par 4,6 puis 6,9. Les constats de l'index sont égaux à ceux de l'ancienne recherche sur 80 catalogues fabriqués (plus de 2 000 alias manquants) et sur les deux fichiers du rejeu.

Durée du rejeu (`npm run stress:rejeu -- --chrono`, médiane de 11 passes, une exécution) : premier fichier réel 41,8 ms pour `controlerLeCatalogue` (8 constats) et 53,1 ms pour `controlerLIntegriteUcm` (4 483 constats) sur 2 415 variables ; second fichier 1,3 ms et 0,0 ms (1 constat chacun) sur 755 variables. Les 35 ms et 39 ms de D0 portaient sur le kit d'avant les lots E : il rend depuis 8 constats C63 de plus sur le premier fichier et 2 constats sur le second, qui en rendait 0. La durée dans Figma attend le rapport du mode Tokens que télécharge le mainteneur.

#### Après la phase D, lot D7.1

Même banc, kit 0.15.1 reconstruit (`npm run build --workspace @ucm-kit/core`), machine peu chargée. Les deux sources du rejeu sont présentes : aucune source absente. Les compteurs sont ceux de D0.3 à l'unité près.

| Entrée | Variables | Compteur | Avant (D0) | Après (D7.1) |
|---|---|---|---|---|
| Fixture d'acquisition, `getLocalVariablesAsync` | 73 | appels | 3 | 1 (inchangé depuis D1) |
| Fixture d'acquisition, `getVariableByIdAsync` | 73 | appels | 75 | 1 (inchangé depuis D1) |
| Catalogue fabriqué | 257 | lectures `controlerLeCatalogue`, `controlerLIntegriteUcm` | 43 972, 3 802 | 43 972, 3 802 |
| Catalogue fabriqué | 5 682 | lectures `controlerLeCatalogue`, `controlerLIntegriteUcm` | 982 943, 68 651 | 982 943, 68 651 |
| Premier fichier réel | 2 415 | constats (`controlerLeCatalogue`, `controlerLIntegriteUcm`) | 8, 4 483 | 8, 4 483 |
| Second fichier réel | 755 | constats (`controlerLeCatalogue`, `controlerLIntegriteUcm`) | 1, 1 | 1, 1 |

Le rapport `resume.txt` de `npm run stress:rejeu` est identique entre deux exécutions : 4 491 constats au premier fichier (8 C63, 4 483 C82), 2 au second, 61 défauts injectés sur 61 détectés au premier fichier, 45 sur 45 au second, 7 947 et 576 alias résolus, 0 exception. Les trois tests d'acquisition et de croissance (`acquisitionDesVariables`, `acquisitionDuRejeu`, `croissanceDuKit`) passent.

Durées, médiane de 11 passes après échauffement (le catalogue fabriqué est la moyenne de deux exécutions) :

| Variables | `controlerLeCatalogue` D0 | D7.1 | `controlerLIntegriteUcm` D0 | D7.1 |
|---|---|---|---|---|
| 257 | 19,6 à 19,9 ms | 11,2 à 12,4 ms | 5,8 à 8,2 ms | 4,5 à 4,9 ms |
| 2 882 | 154,4 à 182,2 ms | 85,3 à 90,9 ms | 47,9 à 58,8 ms | 35,4 à 37,6 ms |
| 5 682 | 268,0 à 304,6 ms | 166,0 à 173,8 ms | 101,3 à 112,0 ms | 69,0 à 74,2 ms |
| 2 415 (premier fichier réel) | 41,8 ms | 30,1 ms | 53,1 ms | 36,1 ms |
| 755 (second fichier réel) | 1,3 ms | 0,7 ms | 0,0 ms | 0,0 ms |

Les durées D0 avaient été prises sous charge de la machine, donc l'écart ne dit pas ce que les lots D ont gagné : D3 n'a changé que `controlerLesAliasesManquants`, dont les lectures ne bougent pas ici. Ce banc ne mesure ni Actualiser, ni Ignorer, ni Appliquer, ni Figma. Le gain Figma de D7.2 passe par G5.2, plus bas.

### Attente mesurée dans Figma (G0.5)

Le mainteneur a exporté le rapport du mode Tokens après une analyse à froid puis un Actualiser, sur un fichier client de 2 415 variables.
Le rapport reste dans `_local/mesures-figma/`. Les durées viennent du journal par phase de G0 et des repères de l’interface.

| Étape, en ms depuis le clic | À froid | Actualiser |
|---|---:|---:|
| Relevé reçu | 608 | 516 |
| Structure reçue | 3 486 | 3 590 |
| Structure rendue | 3 547 | 3 639 |
| Noms reçus | 19 008 | 67 883 |
| Affichage complet | 19 098 | 68 125 |

| Phase | À froid | Actualiser |
|---|---:|---:|
| Contrôles du catalogue | 884 | 789 |
| Contrôles de l’intégrité | 1 780 | 1 706 |
| Inventaire des noms | 1 023 | 3 020 |
| Lexique, temps actif | 6 520 | 6 177 |
| Questions, temps actif | 2 937 | 4 022 |
| Calcul des noms, total | 13 497 | 61 394 |
| Calcul des noms, attente aux cessions | 3 688 | 50 924 |
| Plus long pas synchrone | 1 331 | 1 094 |

Le calcul actif des noms prend environ 10 s dans Figma. Le banc de la recherche en donnait 28 s dans QuickJS et 0,8 s sous Node.
Le moteur de Figma est donc environ trois fois plus rapide que le banc, et dix fois plus lent que Node.
La structure est prête après 3,5 s, mais l’écran la montrait seulement avec les noms, ce que G2 corrige.
Pendant Actualiser, 51 s sur 61 s du calcul des noms se passent à attendre la fin des 111 cessions, soit 459 ms par cession,
contre 38 ms à froid. La cession est un `setTimeout` de 0 ms dans `src/nomenclature/tranches.ts`. Sa cause n’est pas établie.
Le Worker de G1b retire ces cessions du sandbox. Sous Chromium, il calcule le même bilan en 510 à 535 ms.

### Attente avec le Worker (G5.2, premier essai)

Même fichier, plugin construit après G3. Figma autorise le Worker : le journal note la voie `worker` pour chaque calcul des noms.

| Étape, en ms depuis le clic | À froid | Actualiser |
|---|---:|---:|
| Structure rendue | 3 372 | 3 397 |
| Noms rendus | 4 371 | 3 747 |

| Phase | À froid | Actualiser |
|---|---:|---:|
| Contrôles du catalogue | 870 | 856 |
| Contrôles de l’intégrité | 1 735 | 1 439 |
| Inventaire des noms | 516 | 2 801 |
| Transfert vers le Worker | 122 | 200 |
| Démarrage du Worker | 47 | |
| Calcul dans le Worker | 241 | 202 |

Le calcul des noms passe de 13 497 ms à 412 ms, transfert compris. L’affichage complet passe de 19,1 s à 4,4 s à froid,
et de 68,1 s à 3,7 s pour Actualiser. Les contrôles de structure, qui restent dans le sandbox, prennent maintenant l’essentiel
de l’attente. Pendant Actualiser, l’inventaire des noms dure 2,8 s contre 0,5 s à froid, car il attend la fin de ces contrôles.
Aucune cession n’a lieu dans le sandbox sur cette voie : l’attente de 459 ms par cession de G4.3 ne s’y produit plus.

### Attente après G6 (G5.2)

Même fichier, plugin construit après G6. Les contrôles de structure et le calcul des noms passent tous deux par le Worker.

| Étape, en ms depuis le clic | Avant G1, à froid | Avant G1, Actualiser | Après G6, à froid | Après G6, Actualiser |
|---|---:|---:|---:|---:|
| Relevé reçu | 608 | 516 | 757 | 660 |
| Structure rendue | 3 547 | 3 639 | 2 267 | 1 786 |
| Noms rendus | 19 008 | 67 883 | 2 553 | 2 314 |

| Phase après G6 | À froid | Actualiser |
|---|---:|---:|
| Démarrage du Worker | 839 | |
| Transfert du catalogue | 98 | 366 |
| Contrôles du catalogue, dans le Worker | 124 | 27 |
| Contrôles de l’intégrité, dans le Worker | 169 | 46 |
| Inventaire des noms | 624 | 730 |
| Transfert de l’inventaire | 211 | 237 |
| Calcul des noms, dans le Worker | 336 | 589 |

L’affichage complet passe de 19,1 s à 2,6 s à froid, et de 68,1 s à 2,3 s pour Actualiser. Le démarrage du Worker coûte
0,84 s à froid, car il part au premier calcul. Un démarrage à l’ouverture du plugin retirerait ce temps de l’attente.

### Attente par voie, banc local (G5.1)

Le banc de la recherche (`_local/recherche-attente/mesurer.mjs`, kit 0.15.1 après G4) passe le même relevé dans la session de Nomenclature, une fois sous Node et une fois dans QuickJS. La voie Node tient lieu du Worker : le moteur de l'interface exécute le même calcul pur (`creerAtelier`), sans le transfert du message. La voie QuickJS est celle du sandbox. Les bilans des deux voies sont identiques. Le banc compte les phases par générateur du kit : `lexique` (lexique), `normaliserParEtapes` (renommages), `detecterParEtapes` (questions). Les pauses du banc se résolvent tout de suite, donc l'attente aux cessions de Figma n'y paraît pas.

| Phase, en ms | Source 1 Node | Source 1 QuickJS | Source 2 Node | Source 2 QuickJS | Figma avant G1, à froid (G0.5) |
|---|---:|---:|---:|---:|---:|
| Variables | 2 415 | 2 415 | 755 | 755 | 2 415 |
| Lexique | 152 | 12 502 | 34 | 3 221 | 6 520 |
| Renommages | 26 | 218 | 7 | 67 | non mesuré |
| Questions | 348 | 8 382 | 64 | 1 732 | 2 937 |
| Bilan complet | 625 | 22 815 | 132 | 5 614 | 13 497 |
| Plus long pas | 6 | 37 | 2 | 35 | 1 331 |
| Contrôles du catalogue | 25,8 | 1 984 | 0,7 | 8 | 884 |
| Contrôles de l'intégrité | 32,6 | 1 965 | 0,0 | 0 | 1 780 |

Les contrôles de structure se chronomètrent à part (`_local/recherche-attente/controles-vm-g5.cjs`, médiane de 11 passes, le même bundle sous Node puis sous QuickJS, constats égaux : 8 et 4 483, 1 et 1). QuickJS les rend 60 à 77 fois plus lents que Node sur le premier fichier ; Figma les rendait 34 à 54 fois plus lents que Node (884 et 1 780 ms). Le plus long pas se lit comme le maximum des trois générateurs ; celui de Figma (1 331 ms) vient du journal par phase de G0 et recouvre aussi le travail de l'hôte.

Après G6 (section précédente), Figma mesure le calcul des noms dans le Worker à 336 ms à froid et 589 ms pour Actualiser, contre 625 ms sous Node ici : les deux voies sont du même ordre. Le sandbox QuickJS du banc donne 22,8 s sur le premier fichier, contre 13,5 s dans Figma avant G1.

Ce que le banc ne sépare pas : le transfert vers le Worker (98 à 366 ms dans Figma), son démarrage (839 ms à froid), le rendu et les attentes aux cessions du sandbox. `stress:rejeu` ne passe que les contrôles du kit sous Node : le rejeu de D0 n'a pas de voie QuickJS, d'où le chronomètre ajouté ci-dessus. Aucune mesure n'a été inventée pour ces phases.

### Mode Composant

`npx tsx packages/plugin-architect/scripts/stress/f8-analyse/rejeuDeBase.ts` analyse sans panne les 5 sources de `rejeu.ts`, en 7 secondes. Les 5 fichiers sont le même Button, au même état : 90 variants, 198 layers, statut `complete` et les mêmes 7 constats.

| Code | Nombre | Lecture |
|---|---|---|
| C32 `inutilise` | 3 | Tokens du composant qu'aucun layer n'emploie. À vérifier dans Figma. |
| C50 `fond-indetermine` | 2 | Contraste d'un contour sans fond connu, en information. Limite assumée. |
| C53 | 1 | 18 variants exclus du contraste, en information. |
| C45 `sans-regle` | 1 | La propriété `state` n'a pas de règle, avec la correction `ajouter`. À vérifier dans Figma. |

Aucune exception et aucun faux constat évident. Le corpus réel du mode Composant ne compte qu'un composant : il faut d'autres captures (Alert, Input) pour que le rejeu mêle des défauts.

## Cibles

Les cibles valent pour le plan de correction. Un cas `attendu` doit tenir après correction, sauf s'il est classé limite assumée avec l'accord du mainteneur. Les cas `mesure` reçoivent leur cible quand la question V2 qui les tient est tranchée. Un faux constat sur un fichier juste est toujours un défaut, donc sa cible est 0 partout.

| Famille | Mesure actuelle | Cible | Rejeu E12 | Après E13 | Après E14 | Après E15 | Après E16 | Après E17 |
|---|---|---|---|---|---|---|---|---|
| F1 Noms | 30 % des 16 160 attendus détectés, 70 faux positifs ; Slice 122 fautes sur 209, 0 inversion sur 40 ; renommage non idempotent (N-01) | 90 % des attendus détectés hors S3 et S4, 0 faux positif sur les 15 design systems ; Slice 190 fautes sur 209 et 40 inversions sur 40 ; un second passage ne renomme rien | 8 020 sur 15 992 attendus (50 %), 18 faux positifs (S9 12, S11 6) ; idempotence P-21 sur 100 fichiers sur 100 ; Slice non rejoué (source privée, absence de preuve) ; 22 809 cas en 357,4 s | Non touchée par E13 : mêmes nombres. Cible non atteinte | 8 208 sur 8 208 attendus hors S3 et S4 (le dénominateur passe de 15 992 à 8 208 par les décisions de E2), 0 manqué, 0 faux constat ; 255 défauts du kit corrigés (casse mixte 77, formes soudées jointes 120, soudé fautif 30, collections 16, `paddingx` 12) ; 1 438 verdicts en attente (Q-F1 1 080, Q-F5 82, Q-F8 70, Q-E14-1 à Q-E14-6 206) ; idempotence P-21 et P-22 100 fichiers sur 100 ; 64 passes de faux positifs sans faux positif certain ; Slice 104 attendus sur 104 (214 cas, 110 hors attendu dont 99 sous 7 lettres, 112 détectés sur 214 en comptant tout) ; 22 809 cas en 233,7 s. Cible 90 % et 0 faux positif tenues ; Slice 190 fautes sur 209 et 40 inversions sur 40 non tenue sous Q-F4 (60 fautes sur 160 et 15 inversions sur 40 sont attendues, toutes détectées) | 15 297 sur 15 297 attendus hors S3 et S4 (E14 : 8 208 ; dès 4 lettres, une faute dont le mutant n'est pas un mot connu est attendue), 0 manqué, 0 faux constat ; 1 516 verdicts en attente (Q-F1 1 080, Q-F5 82, Q-F8 70, Q-E14-1 à Q-E14-5 284, dont 80 de plus en Q-E14-4 : un mot de 4 à 6 lettres touche souvent deux termes et la question n'en liste qu'un) ; idempotence P-21 et P-22 100 fichiers sur 100 ; 64 passes de faux positifs avec un dictionnaire sans le système mesuré : 0 faux positif certain pour 1 000 noms à 4, 5 et 6 lettres ; Slice 181 attendus sur 181 (214 cas, 33 hors attendu), 189 détectés sur 214 en comptant tout (E14 : 112), inversions 36 sur 40, autres mutations 153 sur 174 ; 22 809 cas en 175,1 s. Cible 90 % et 0 faux positif tenues ; Slice 190 fautes sur 209 et 40 inversions sur 40 non tenue à la lettre : les 25 mutations non détectées sont 16 mutants de moins de 4 lettres, 2 mots connus de 6 lettres, 5 noms de composant et 2 termes UCM | 15 627 sur 15 627 attendus hors S3 et S4 (E15 : 15 297), 0 manqué, 0 faux constat ; 1 348 verdicts en attente (Q-F1 1 080, Q-F5 82, Q-F8 70, Q-E14-4 116), 2 881 informatifs ; décisions entrées (noms de composant lus, fautes de 3 lettres, deux synonymes UCM du même fichier, `states`, `etat` et `état` renommés en `state` avec `status` hors des formes tolérées, pluriels d'abréviation et de terme composé, termes de composant dans les mots collés) ; P-21 et P-22 sur 100 fichiers sur 100 ; 64 passes de faux positifs avec 0 faux positif certain à 3, 4, 5 et 6 lettres ; sur Slice, 198 attendus sur 198 détectés, 208 mutations détectées sur 214 (E15 : 189), inversions 40 sur 40, cible 190 sur 209 et 40 sur 40 tenue ; 22 728 cas en 185,6 s | 15 647 sur 15 647 attendus hors S3 et S4 (E16 : 15 627), 0 manqué, 0 faux constat ; 1 328 verdicts en attente (Q-F1 1 080, Q-F5 82, Q-F8 70, Q-E14-4 96 contre 116 en E16) ; la question de faute liste désormais chaque terme proche (`autres`), et l'oracle compte détectée une faute dont la question liste le terme visé ; un mot de 3 lettres à une lettre d'un terme de 2 lettres (`bgg` près de `bg`) l'a pour candidat ; Slice inchangée (198 attendus sur 198 détectés, 208 mutations détectées sur 214, inversions 40 sur 40) ; 22 728 cas en 186,8 s |
| F2 Structure | 378 sur 503 détectés, 68 faux constats, 27 corrections inexactes ; chaîne 5 cas sur 28 | 100 % des attendus, 0 faux constat, 0 correction inexacte ; chaîne 28 sur 28 | 522 sur 527 attendus (5 en attente, Y4 `ring`), 11 faux constats (A1-2, X1-1 doublon, X1-2 sept, X3-1, X3-2), 0 correction inexacte ; chaîne 17 sur 28 | 533 sur 538 attendus (les mêmes 5 en attente), 0 faux constat, 0 correction inexacte ; chaîne 18 sur 28 (D5-1 tient ; restent E-20 D3-1, E-23 D1-3, E-24 D4-1 à D4-8) | Non rejoué : E14 ne touche que F1 | Non rejoué : E15 ne touche que F1 | Non rejoué : E16 ne touche que F1 | Non touchée par E17 : mêmes nombres |
| F3-F4 Liaisons et tailles | kit 181 sur 185, 3 faux constats ; chaîne 16 cas sur 67 | kit 185 sur 185, 0 faux constat ; chaîne 65 sur 65 hors les 2 cas en attente | opérateurs 1 896 sur 1 896 attendus, 48 faux constats, 5 cas `mesure` dont 1 en attente ; chaîne 62 sur 67 | opérateurs 1 896 sur 1 896, 0 faux constat, 0 correction inexacte, 1 cas `mesure` (S1), 0 en attente ; chaîne 65 sur 67 (restent E-34 D1-16 et E-28 D5-6, `mesure` Q-F3-5) | Non rejoué : E14 ne touche que F1 | Non rejoué : E15 ne touche que F1 | Non rejoué : E16 ne touche que F1 | Non touchée par E17 : mêmes nombres |
| F5 Variants | 9 145 sur 9 234, 110 faux constats | 100 % des attendus, 0 faux constat ; les 24 profils muets le restent | 5 347 sur 5 348 attendus (433 en attente, V4), 0 faux constat ; faux positifs 100 sur 100 ; interactions 1 356 sur 2 116 (766 en attente, Q-F5-2) | Mêmes nombres, rejoués après E13 | Non rejoué : E14 ne touche que F1 | Non rejoué : E15 ne touche que F1 | Non rejoué : E16 ne touche que F1 | Non touchée par E17 : mêmes nombres |
| F6 Typographie et icônes | 83 sur 140, 18 faux constats | 95 % des attendus, 0 faux constat ; une seule définition d'icône (E-26) | 134 sur 134 attendus, 0 faux constat ; interactions 277 sur 418 (141 en attente, Q-F5-2) ; 0 layer sur lequel C66, C49 et C17 se contredisent | Mêmes nombres, rejoués après E13 | Non rejoué : E14 ne touche que F1 | Non rejoué : E15 ne touche que F1 | Non rejoué : E16 ne touche que F1 | Non touchée par E17 : mêmes nombres |
| F7 Accessibilité | 545 sur 647, 14 faux constats, 3 exceptions | 100 % des seuils S et G, 0 faux constat, 0 exception | opérateurs 367 sur 401 attendus (23 manqués, 11 en attente), seuils S 37 sur 46 et G 33 sur 33, 0 faux constat, 0 exception ; relations 13 écarts sur 1 213 rejouées | opérateurs 385 sur 401 (5 manqués : I1-2, I1-4, I3-1 à I3-3 ; 11 en attente, Q-F3-4), seuils S 46 sur 46 et G 33 sur 33, 0 faux constat, 0 exception ; relations 0 écart sur 1 209 rejouées, 17 ignorées | Non rejoué : E14 ne touche que F1 | Non rejoué : E15 ne touche que F1 | Non rejoué : E16 ne touche que F1 | Non touchée par E17 : mêmes nombres |
| F8 Règles et moteur | 770 sur 790, 24 faux constats, 15 faits inexacts ; chaîne 286 sur 321 | 100 % des attendus, 0 faux constat, 0 fait inexact ; chaîne 321 sur 321 | opérateurs 789 sur 789 attendus, 0 faux constat, 0 fait inexact ; chaîne 321 sur 321 | Mêmes nombres, rejoués après E13 | Non rejoué : E14 ne touche que F1 | Non rejoué : E15 ne touche que F1 | Non rejoué : E16 ne touche que F1 | Non touchée par E17 : mêmes nombres |
| F9 Lecture et états | 167 faits inexacts sur 344 cas ; chaîne 510 sur 569 | 0 fait inexact ; chaîne 569 sur 569 ; aucune lecture refusée ne finit `complete` | opérateurs 344 cas, 0 fait inexact ; section D 339 sur 340 attendus (1 en attente), 35 cas sans source (30 en D3, 5 en D4) comptés absents, 5 captures sur 5 trouvées | Mêmes nombres, rejoués après E13 | Non rejoué : E14 ne touche que F1 | Non rejoué : E15 ne touche que F1 | Non rejoué : E16 ne touche que F1 | Non touchée par E17 : mêmes nombres |
| Rejeu Tokens | 4 359 cartes C82 sans correction sur Slice ; 0 constat et aucun signal sans `theme` | au plus une carte par couple de collections pour une même couche ; un signal quand le thème n'est pas reconnu ; R2, R3 et R5 restent à 100 % | Slice : 4 491 constats dont 4 359 `couche` ; R2 0 écart, R3 0 écart, R5 61 injectés et 61 détectés sur 100 tirés (39 non applicables) ; R4 non exercée (0 correction), absence de preuve | Non rejoué : E13 ne change aucun contrôle du mode Tokens | Non rejoué : E14 ne touche que F1 | Non rejoué : E15 ne touche que F1 | Non rejoué : E16 ne touche que F1 | Non touchée par E17 : mêmes nombres |
| Rejeu Composant | 1 composant capturé | 3 composants capturés (Button, Alert, Input), 0 exception, chaque constat classé | 1 composant (Button), E12.3 attend les captures du mainteneur | Inchangé | Non rejoué : E14 ne touche que F1 | Non rejoué : E15 ne touche que F1 | Non rejoué : E16 ne touche que F1 | Non touchée par E17 : mêmes nombres |

Durées de la mesure E13, en secondes : F2 opérateurs 74,7 ; F2 chaîne 3,8 ; F3-F4 opérateurs 34,3 et chaîne 39,6 ; F7 36,4 ; F8 opérateurs 129,0 (E12 : 172,6) ; F9 opérateurs 220,0 (E12 : 312,2) ; F8 et F9 section D 35,1. F1 (357,4 s) dépasse les 240 s de la cible de durée, et F9 en E12 (312,2 s) la dépassait. Après E14, F1 dure 233,7 s et tient la cible. Après E15, F1 dure 175,1 s. Après E16, F1 dure 185,6 s.

Temps : les harnais restent hors de `npm test`. Chaque fichier de régression dure moins de 15 secondes, et le harnais d'une famille moins de 240 secondes.

## Questions V2

Les questions des six plans, celles nées de la mesure (QV-1 à QV-5) et celles des écrans (QM-1 à QM-7) sont dans [QUESTIONS-V2.html](./QUESTIONS-V2.html), avec pour chacune le nombre de cas en attente. `Mesures/generer-questions-v2.mjs` la régénère d'après les plans et les rapports de `_local/stress/`. Les écrans sont dans [MAQUETTE-FIABILISATION.html](./MAQUETTE-FIABILISATION.html).
