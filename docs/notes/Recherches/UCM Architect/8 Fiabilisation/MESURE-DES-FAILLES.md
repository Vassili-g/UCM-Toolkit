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
