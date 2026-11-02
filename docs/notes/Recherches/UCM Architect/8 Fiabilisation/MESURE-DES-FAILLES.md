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
| N-23 | Le résultat provisoire ne dessine aucune carte : 0 carte de corrections et 0 carte À faire, pour 1 et 113 dans le modèle. L'écran attendu du provisoire reste à trancher | D3-5 |
| N-24 | Avec une library à choisir, le panneau d'analyse dessine ses cartes sans demander le choix. Le choix est peut-être porté hors du panneau | D6-4, à confirmer |
