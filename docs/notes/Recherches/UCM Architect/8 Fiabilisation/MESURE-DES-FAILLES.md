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
