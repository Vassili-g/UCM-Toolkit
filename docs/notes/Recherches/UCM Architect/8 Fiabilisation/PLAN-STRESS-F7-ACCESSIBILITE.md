# Plan de stress test F7, accessibilité du mode Composant

Ce plan décrit le harnais qui mesure les contrôles d'accessibilité du mode Composant sur 1 120 cas fabriqués, depuis le rapport de contraste du kit jusqu'à la carte lue par le designer. Il ne corrige aucun code : il produit la mesure de l'existant, puis des tests de régression en attente des corrections. Il prolonge la famille F7 de [INVENTAIRE-VERIFICATIONS.md](./INVENTAIRE-VERIFICATIONS.md) (sections 4.6, 6.3, 7 et 8). La forme suit [PLAN-STRESS-F2-STRUCTURE.md](./PLAN-STRESS-F2-STRUCTURE.md). Le générateur de composant est celui de [PLAN-STRESS-F3-F4-COMPOSANT.md](./PLAN-STRESS-F3-F4-COMPOSANT.md), que F7 appelle sans le modifier.

## 1. Portée

| Contrôle | Source | Ce que le plan mesure |
|---|---|---|
| C49 contraste | `packages/kit/src/controles/accessibilite.ts` (`mesurerLeVariant`, `pileDePeintures`, `fondEffectif`, `fondsDeMesure`) | texte, grand texte et icône sous 4,5, 7, 3 ou 4,5 ; fonds composés ; modes ; limites |
| C49 texte sous 12 px | `accessibilite.ts` (`controlerLeTexteMinimal`) | frontière 11,99 / 12 |
| C49 borne | `accessibilite.ts` (`BORNE_DE_COMBINAISONS`, `combinaisonsDeModes`) | 5 000 combinaisons, compte exact |
| C50 contour | `accessibilite.ts` (`ciblesDeContraste`) | contour visible d'épaisseur non nulle sous 3:1 |
| C50 sans anneau | `accessibilite.ts` (`controlerLAnneau`, `NOM_D_ANNEAU`) | variant en focus sans anneau reconnu |
| C51 | `accessibilite.ts` (`controlerLAnneau`) | épaisseur de l'anneau différente de 2 px |
| C52 | `accessibilite.ts` (`controlerLesCibles`, `estInteractif`) | racine sous 24 px (corriger) ou 44 px (vérifier) |
| C53 | `accessibilite.ts` (`etatDuVariant`) | variants `disabled` exclus et comptés |
| Définitions | `releve.ts` (`layersVisiblesDuVariant`, `peintureVisible`), `catalogue.ts`, `emplois/contraste.ts`, `emplois/couleur.ts`, `emplois/garanties.ts`, `referentiel/recommandations.ts`, `referentiel/reconnaissance.ts` (`estLAxeDEtats`), `controles/nommage.ts` (`etatReconnu`) | état, visibilité, garanties, seuils |
| Assemblage | `packages/plugin-architect/src/sandbox/analyse.ts` (niveau AA ou AAA, `controle-accessibilite`), `src/catalogue.ts` (`avecLesFondsDElevation`, `fondDeLaPageFigma`) | niveau, fonds d'élévation, page Figma |
| Écran | `src/ui/ignores/modele.ts` (`carteDAFaire`), `src/ui/textes/ignores.ts`, `src/ui/panneau/informations.ts` (`ligneDInformation`), `src/ecriture/ignores.ts` | cartes, informations, rapports affichés, ignorés |
| Paire choisie | `src/contraste.ts` (`jugerContraste`), `src/espace.ts` (`versSrgb`) | contraste d'une paire du designer, Display P3 |

Hors plan. Les corrections du code (E-26 et E-40 compris), les autres familles, la Nomenclature, la migration d'un fichier Figma et `test:ui`. C49 à C53 n'ont aucune correction ni question : le plan ne vérifie donc ni case cochée ni écriture.

Les tests existants (`packages/kit/tests/accessibilite.test.ts`, `borneDeContraste.test.ts` du plugin, `annexes.test.ts`) donnent un cas positif et un cas négatif par contrôle. F7 ajoute la mesure autour des seuils, les fonds composés, les modes et l'espace de couleur.

## 2. Oracle

### 2.1 Principe

L'oracle est écrit à partir des règles du WCAG 2 et des règles écrites de l'inventaire (4.6), jamais en rejouant le code mesuré. Il n'importe aucune fonction de `packages/kit/src/emplois/`. Chaque opérateur déclare ce qu'il casse et ce que le plugin doit dire. Un fond ou une couleur que le plugin ne sait pas lire donne une limite d'information, jamais un verdict.

Chaque cas porte un verdict.

| Verdict | Sens |
|---|---|
| `attendu` | La règle est écrite (WCAG 2, inventaire, décision Q). Un écart est un défaut. |
| `mesure` | La règle dépend d'une réponse du mainteneur (section 9). Le rapport compte l'écart à part et ne le qualifie pas. |

### 2.2 Mesure exacte

`oracleContraste.ts` calcule le rapport attendu en sept étapes.

1. Octet : `clamp(round(255 × canal), 0, 255)` pour chaque canal.
2. Linéaire : table de 256 valeurs, `o/255 / 12,92` jusqu'à 10/255, puis `((o/255 + 0,055) / 1,055)^2,4`. Les seuils 0,03928 (WCAG 2.0) et 0,04045 (sRGB) donnent la même table : 0 canal sur 256 diffère, ce que le lot 1 prouve.
3. Luminance : `0,2126 R + 0,7152 G + 0,0722 B`.
4. Rapport : `(Y clair + 0,05) / (Y sombre + 0,05)`.
5. Verdict : `rapport ≥ seuil`, comparaison de deux doubles, sans arrondi.
6. Affichage : le rapport tronqué à deux décimales, jamais arrondi.
7. Pire cas : le minimum des rapports sur les variants, les combinaisons de modes et les fonds.

Le kit compare à dix décimales (`atteintLeSeuil`, [MOT-22]). Cette règle ne change aucun verdict d'une paire à 8 bits : une recherche sur les 16 777 216 couleurs contre `#FFFFFF`, `#000000` et `#F8FAFC` place la paire la plus proche d'un seuil à 2,9e-9 (`#9688CC` sur `#F8FAFC`, 3,000000003). Le générateur refuse toute paire à moins de 1e-9 d'un seuil, et le lot 1 reproduit la recherche pour le prouver.

Composition. L'oracle compose le rendu final, de bas en haut, canal par canal dans l'espace encodé, comme Figma. L'alpha effectif d'une peinture vaut `couleur.a × opacité de la peinture × opacité du layer`. Pour un ancêtre, l'oracle applique l'opacité de l'ancêtre à tout ce qu'il contient (verdict `mesure`, Q-F7-2). Un seul arrondi à 8 bits a lieu à la fin. Un second oracle arrondit après chaque couche. Un cas où les deux oracles donnent un verdict différent est fragile et passe en `mesure` (Q-F7-1).

Fonds. Le fond d'un layer est la composition de ses ancêtres jusqu'au premier opaque. Sans ancêtre opaque, l'oracle mesure sur `elevation/page` puis `elevation/raised` du thème dans le mode de la combinaison, sinon sur la page Figma. Sans l'un ni l'autre, il attend la limite `fond-indetermine`.

Modes. Le produit des modes porte sur les collections que les alias des couleurs liées atteignent, tous modes confondus. L'oracle calcule le total avec des entiers exacts (BigInt).

Display P3. Pour un document P3, l'oracle compose dans l'espace encodé P3, linéarise avec la même fonction de transfert, applique la matrice P3 vers `XYZ` D65 puis `XYZ` vers sRGB (constantes de CSS Color 4), borne à [0, 1], encode et arrondit à 8 bits, puis juge selon les étapes 2 à 7. Le verdict d'une paire opaque est `attendu`. Celui d'une composition translucide est `mesure` (Q-F7-13).

### 2.3 Propriétés

| Id | Assertion vérifiable | Constats, écarts, décisions |
|---|---|---|
| P1 | Les 96 profils de la section 3.2 ne produisent aucun constat C49, C50, C51 ni C52. Seul C53 sort, pour un profil qui a un état `disabled`. | tous |
| P2 | Chaque dégradation fait émettre les constats que son opérateur déclare, avec le code, l'usage, le variant, le layer, la plage de texte et le fond nommé attendus (colonne « manqués »). | tous |
| P3 | Aucun constat n'est émis hors de ceux que l'opérateur déclare (colonne « faux constats »). | tous |
| P4 | `faits.rapport` égale le rapport de l'oracle tronqué à deux décimales, `faits.seuil` et `faits.niveau` ceux de l'oracle, et le verdict égale celui de l'oracle sans arrondi. | C49, C50 |
| P5 | `faits.rapport`, `faits.mode`, `faits.premierPlan`, `faits.fond` et `faits.rapports` d'un constat groupé égalent le pire cas de l'oracle sur les variants, les modes et les fonds. | C49, C50 |
| P6 | Une couleur ou un fond illisible donne la limite attendue (`degrade`, `image`, `peinture-superposee`, `mode-illisible`, `couleur-absente`, `fond-indetermine`, `fond-de-repli`) et aucun verdict pour la combinaison concernée. | limites |
| P7 | Le type du constat (`corriger` ou `verifier`) égale celui de l'oracle : `corriger` si le fond est réel, ou si la garantie du thème couvre ce fond, ce seuil et ce niveau ; `verifier` sinon. | Q-F7-7 |
| P8 | Mélanger l'ordre des variants, des layers, des collections, des modes et des variables, ou renommer les identifiants, laisse les mêmes constats, aux identifiants et aux ordres près. L'entrée n'est pas modifiée. Les identifiants de constat sont uniques. | tous |
| P9 | Échanger le fond et le premier plan d'une paire opaque ne change pas le rapport. Dupliquer un mode à valeurs égales ne change aucun rapport. Une couleur liée par une chaîne d'alias donne le rapport de la même couleur posée en dur. | relations |
| P10 | Le grand texte, le texte et la taille minimale se classent selon l'oracle sur les frontières 11,99 / 12, 23,99 / 24 et 18,666… / 700. | G1, G3 |
| P11 | La borne : le nombre de combinaisons mesurées vaut `min(5 000, total)`, l'information `C49:borne` existe si et seulement si le total dépasse 5 000, et les deux comptes sont exacts, y compris au-delà de 2^53. | Q1 à Q5 |
| P12 | Un variant à l'état `disabled`, écrit `disabled`, `Disabled`, `DISABLED` ou `disable`, est exclu des mesures. C53 compte exactement ces variants. Aucun autre variant n'est exclu. | C53 |
| P13 | C52 sort si et seulement si le composant est interactif (un axe d'états avec un état autre que `default` et `disabled`) et que `min(largeur, hauteur)` de la racine est sous 24 px (corriger) ou sous 44 px (vérifier). | C52, E-40 |
| P14 | Un variant en focus (`focus`, `Focused`, `Focus visible`) sans layer d'anneau reconnu visible donne `C50:sans-anneau`. Un anneau reconnu visible dont le contour n'a pas 2 px donne C51 avec l'épaisseur lue. | C50, C51 |
| P15 | Un fichier Display P3 donne le rapport des canaux convertis en sRGB. Les mêmes canaux dans un fichier sRGB donnent un autre rapport. | Q-F7-13 |
| P16 | Tout constat émis et non ignoré se lit une fois à l'écran : une carte À faire pour `corriger` et `verifier`, une ligne Informations pour `info`. Aucune phrase de repli (`sansPhrase`). | écran |
| P17 | Le rapport affiché est la troncature de l'oracle. Il reste strictement sous le seuil affiché, et le seuil affiché est celui du niveau. Aucune carte ne dit « 4,50:1 sous le seuil de 4,5:1 ». | écran |
| P18 | Le niveau AAA change les seuils du texte et du grand texte, et aucun autre seuil. Changer le niveau périme l'analyse. Un niveau illisible retombe sur AA et la barre le dit. | niveau, E-31 |
| P19 | Un constat ignoré reste ignoré à la relecture. Une limite ne s'ignore pas. L'identifiant d'un constat ne change ni avec la longueur du texte ni avec le niveau. | Q-F7-12 |
| P20 | Aucun contrôle ne lève sur une entrée dégradée (canal NaN, alpha hors [0, 1], taille nulle ou négative, dimension infinie, cycle de `parent`, alias en cycle, variant sans layer). | robustesse |
| P21 | Une lecture manquée (`manquees`, `variantsNonLus`, peinture mixte) ne produit aucune accusation sur ce qui n'a pas été lu. | E-31 |

### 2.4 Colonnes du rapport

| Colonne | Définition |
|---|---|
| Attendus | Constats que l'oracle déclare pour les cas de l'opérateur. |
| Détectés | Attendus que le plugin émet avec le bon code, usage, variant, layer et fond. |
| Manqués | Attendus que le plugin n'émet pas (P2). |
| Faux constats | Constats émis que l'oracle ne déclare pas (P3). |
| Rapports inexacts | Constats dont le rapport, le pire cas ou le verdict diffère de l'oracle (P4, P5, P10, P15). |
| Limites inexactes | Limites manquantes, en trop ou de la mauvaise cause (P6). |
| Types inexacts | Type `corriger` ou `verifier` différent de l'oracle (P7). |
| Non affichés | Constats sans trace à l'écran, doublés, ou au rapport affiché faux (P16, P17, P19). |
| En attente | Écarts sur des cas `mesure`, comptés à part. |

## 3. Générateur

### 3.1 Composant de base

F7 réutilise le générateur de F3 (`packages/kit/scripts/stress/f3-composant/composantDeBase.ts` et `profils.ts`) : relevé, catalogue et carte. Il n'en écrit pas un second. Un module de F7, `composantDeContraste.ts`, appelle `composantDeBase` puis impose sur la copie les états de l'axe `State` et les couleurs. Il ne modifie aucun fichier de F3.

| Couche | Ce que F7 impose |
|---|---|
| Relevé | Layers `Root` (FRAME, fond lié, trait lié), `Label` (TEXT, une ou deux plages), `Icon` (VECTOR, fond lié) et `Ring` (RECTANGLE, trait lié) de F3. Dimensions de la racine 48 × 48 px. Axe `State` de quatre valeurs : `Default`, `Hover`, `Focus`, `Disabled`. |
| Couleurs | Un module `couleursDeStress.ts` pose les valeurs des variables de `theme` par mode. Chaque paire de base dépasse son seuil de 25 % au moins dans les deux modes et dans les deux lectures P3 et sRGB (texte à 12:1 au moins). |
| `theme` | Les rôles de trois palettes, `elevation/page` et `elevation/raised` dans les modes `Light` et `Dark`. |
| `fondsDElevation` | Construits par le générateur à partir des valeurs de `elevation/*`. Le test de la chaîne (section 5.3) utilise la vraie fonction `avecLesFondsDElevation`. |
| Espace | `espaceDeCouleur` vaut `srgb` ou `display-p3` selon le profil. |

Le module `paires.ts` cherche les paires d'octets qui encadrent chaque seuil. Les trois plus proches sont données pour les fonds de la section 3.3, S1.

| Seuil | Fond | Juste au-dessus | Juste au-dessous |
|---|---|---|---|
| 3 | #FFFFFF | #E969A1, 3,000000193 | #989A30, 2,999999768 |
| 3 | #F8FAFC | #9688CC, 3,000000003 | #F947C0, 2,999999817 |
| 4,5 | #FFFFFF | #7C7290, 4,500000635 | #9A6C5A, 4,499999851 |
| 4,5 | #000000 | #9D5D9F, 4,500000660 | #458301, 4,499999932 |
| 7 | #FFFFFF | #33642C, 7,000000295 | #960FB1, 6,999998691 |
| 7 | #F8FAFC | #174CC4, 7,000000265 | #553FC1, 6,999999979 |

### 3.2 Profils de base

| Dimension | Valeurs | Nombre |
|---|---|---|
| Forme du jeu (F3) | `button-36` avec les états de F7 (48 variants), `alert-11`, `button-216`, `switch-4`, `divider-1`, `badge-9` | 6 |
| Espace de couleur | `srgb`, `display-p3` | 2 |
| Modes du thème | un mode, ou `Light` et `Dark` | 2 |
| Fond du `Root` | opaque et lié, ou translucide sans ancêtre opaque (repli sur la page et la carte) | 2 |
| Niveau | AA, AAA | 2 |

Le produit donne 96 profils (p001 à p096). Les opérateurs de la section 3.3 s'appliquent à un seul profil de référence, P0 : `button-36` à 48 variants, sRGB, `Light` et `Dark`, fond opaque lié, niveau AA. P0 fait partie des 96. Les nombres de la section 3.3 sont des cas sur P0, et chaque cas se nomme `<opérateur>-<n>`. Un opérateur qui change la forme, l'espace ou le niveau le dit. Les combinaisons de la section 3.4 tournent sur 3 profils : P0, un profil `alert-11` P3 à fond translucide (Pα) et un profil tiré de la graine.

### 3.3 Opérateurs de dégradation

Le verdict est `attendu` sauf mention contraire. Aucun opérateur n'attend de correction.

**Seuils (C49, C50)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| S1 | Paires autour des seuils. 10 lignes : texte AA, texte AAA, grand texte AA, grand texte AAA, icône AA, icône AAA, contour AA, contour AAA, anneau AA, anneau AAA. Par ligne, 8 paires : une juste au-dessus et une juste au-dessous du seuil de la ligne sur #FFFFFF, #000000 et #F8FAFC, puis deux paires de gris, une de chaque côté. | 80 | constat du bon usage sous le seuil, aucun au-dessus ; rapport affiché 2,99 pour 2,999999817 et 3,00 pour 3,000000003 |
| S2 | Repères connus sur blanc. #767676 (4,5422) et #777777 (4,4781) en texte AA. #595959 (7,0047) et #5A5A5A (6,8969) en texte AAA. #949494 (3,0335) et #959595 (2,9953) en grand texte AA et en icône. | 8 | constat pour #777777, #5A5A5A et #959595 seulement |
| S3 | Un même rapport aux deux niveaux : 5,0:1 en texte, 3,9:1 en grand texte, en icône et en contour. | 8 | texte 5,0 : aucun en AA, un en AAA ; grand texte 3,9 : aucun en AA, un en AAA ; icône et contour : même verdict aux deux niveaux |

**Texte (C49 grand texte, C49 sous 12 px)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| G1 | Classe du texte. Tailles 18,65, 18,66, 18,664, 18,6667, 18,67, 23,99 et 24 px × graisses 400, 699, 700 et 900, sur une paire à 3,5:1 en AA. | 28 | seuil 3 si la classe est grand texte, 4,5 sinon. `mesure` pour 18,66 et 18,664 à 700 et 900 (Q-F7-3) |
| G2 | Les tailles 18,66, 18,67, 23,99 et 24 px en graisses 400 et 700 sur une paire à 4,0:1, niveau AAA. | 8 | seuil 4,5 pour un grand texte, 7 sinon |
| G3 | Texte sous 12 px. Tailles 8, 10, 11, 11,99, 12, 12,01 et 0. Plage de 11 px et plage de 14 px dans le même texte. Texte de 11 px dans un variant `disabled` (`mesure`, Q-F7-10). | 9 | `C49:taille` pour les tailles sous 12, la plage de 11 px et la taille 0 ; aucun pour 12 et 12,01 |

**Opacités et couches (C49)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| O1 | Alpha du texte. `couleur.a`, opacité de la peinture et opacité du layer dans {1 ; 0,5} : 8. L'un des trois à 0 : 3 (`mesure`, Q-F7-2). Plage sans peinture : 1 (`mesure`). | 12 | rapport de l'oracle sur le fond composé ; pour les 4 cas `mesure`, l'oracle attend l'absence de verdict de lisibilité |
| O2 | Couches empilées sur le texte. Deux peintures translucides, trois peintures, opaque au milieu, opaque en bas, masquée au milieu, ordre inversé. | 6 | pile jusqu'à la première couche opaque, rapport de l'oracle |
| O3 | Fond composé des ancêtres. Fond translucide sur ancêtre opaque à 2 et à 3 niveaux, opaque au grand-parent, ancêtre sans peinture entre deux fonds, ancêtre à opacité 0,5 sur sa propre peinture, deux fonds translucides empilés. | 6 | rapport de l'oracle |
| O4 | Fond translucide sans ancêtre opaque. Alpha 0,9, 0,5, 0,1 et 0 sur la page et la carte : 4. Les mêmes sans `elevation/*` mais avec la page Figma : 4. Sans l'un ni l'autre : 1. Page Figma d'alpha 0,5 : 1 (`mesure`, Q-F7-1). `elevation/page` d'alpha 0,5 : 1 (`mesure`). `Root` sans peinture : 1. | 12 | constats sur `page` et `carte`, ou `page-figma` avec l'information `fond-de-repli` ; `C49` limite `fond-indetermine` pour le cas sans repli |
| O5 | Opacité héritée. Parent à 0,5, parent à 0,1, grand-parent à 0,5, parent à 0, parent à 0,5 avec sa propre peinture. | 5 | `mesure` (Q-F7-2) |
| O6 | Composition fragile. Six paires où l'arrondi final et l'arrondi par couche donnent deux verdicts. | 6 | `mesure` (Q-F7-1) |

**Fonds et limites (C49, C50)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| F1 | Dégradé (linéaire, radial, angulaire, diamant) en fond, puis en peinture du texte. | 8 | limite `degrade`, aucun verdict |
| F2 | Image et vidéo en fond, puis en peinture du texte. | 4 | limite `image` |
| F3 | Mode de fusion d'une peinture du texte : les 19 valeurs de Figma. `MULTIPLY`, `OVERLAY` et `PASS_THROUGH` sur le fond : 3. | 22 | verdict normal pour `NORMAL` et `PASS_THROUGH` ; limite `peinture-superposee` pour les 17 autres |
| F4 | Peintures superposées. Dégradé sous solide translucide, solide translucide sous dégradé, dégradé masqué, dégradé sous solide opaque, image sous solide opaque, deux dégradés. | 6 | limite `peinture-superposee` pour 1, 2 et 6 ; verdict normal pour 3, 4 et 5 |
| F5 | Visibilité. Layer masqué, parent masqué, grand-parent masqué, texte visible sous un parent masqué, peinture d'ancêtre masquée, peinture d'ancêtre d'opacité 0. | 6 | aucun constat pour les 4 premiers ; fond suivant pour les 2 derniers |
| F6 | Fond porté par un frère. Rectangle frère dessous qui couvre le texte, qui le couvre en partie, frère au-dessus, frère translucide. Parent sans peinture, page Figma blanche. | 4 | `mesure` (Q-F7-4) |
| F7 | Peinture de type inconnu (`PATTERN`), peinture `SOLID` sans couleur. | 2 | limite `peinture-superposee` pour la première, `couleur-absente` pour la seconde |

**Modes et collections (C49)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| M1 | Texte lié à un token de `theme` aux valeurs différentes par mode : échec en Light seul, en Dark seul, dans les deux, dans aucun. | 4 | un constat au pire mode, `autresModes` et `rapports` justes, aucun dans le dernier cas |
| M2 | Mode effectif du variant (`modesEffectifs`) en Dark, en Light, absent. | 3 | première combinaison dans le mode effectif ; le pire mode reste rapporté |
| M3 | Plusieurs collections. Premier plan dans une collection à 2 modes et fond dans une à 3 : 6 combinaisons. Trois collections de 2, 3 et 4 modes : 24. Chaîne `components` vers `theme` vers `brands` vers `primitives` : 2. | 4 | pire des combinaisons, étiquette `collection en mode, collection en mode` |
| M4 | Chaîne d'alias de 1, 9, 10, 11 et 12 renvois, alias en cycle, alias vers soi. | 7 | lisible jusqu'à 10 renvois ; limite `mode-illisible` au-delà et pour les cycles |
| M5 | Valeurs illisibles. Mode absent des valeurs, variable absente, `non-chargee`, `inaccessible`, collection `inaccessible`, valeur FLOAT, valeur STRING, canal manquant : 8. Canal à 1,2, canal à −0,1, alpha à 1,5, alpha à −0,2 : 4 (`mesure`, Q-F7-5). | 12 | limite `mode-illisible` pour les 8 premiers |
| M6 | Repli par mode. Texte en dur sous le seuil en Dark seulement, fond translucide, `elevation/page` différente par mode. Variantes : thème à un mode, texte lié au thème, texte lié à une autre collection. | 4 | `mesure` (Q-F7-6) |
| M7 | Couleur liée à une variable de library (`distante`), lue ; non lue. | 2 | verdict normal ; limite `mode-illisible` |

**Garanties du thème (type du constat)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| Y1 | Échec sur la page et la carte, texte lié à chacune des 7 variables qui portent une garantie (`solid/foreground`, `solid/default`, `surface/foreground`, `surface/border`, `page/foreground`, `page/border`, `ring`) : 7. Variable hors du thème, variable du thème non reconnue : 2. Texte à 4,5 lié à `solid/default`, `surface/border`, `page/border` et `ring`, et à 7 lié à `surface/foreground` en AAA : 5 (`mesure`, Q-F7-7). | 14 | `corriger` si la garantie nomme ce fond ; `verifier` sinon et pour la page Figma |
| Y2 | Deux liaisons sur la même cible (indices 0 et 1), alias à deux renvois vers le thème, deux collections `theme` dans le catalogue. | 4 | variable du thème lue sur la première liaison, nommée dans les faits |

**Icône (C49, définitions de E-26)**

Les verdicts suivent la définition unique de Q-F3-4 (VECTOR, BOOLEAN_OPERATION, instance pilotée par INSTANCE_SWAP, ou nom dont un mot entier est `icon`). Ils sont `mesure` tant que Q-F3-4 n'a pas de réponse, sauf pour un VECTOR ou un BOOLEAN_OPERATION de nom libre.

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| I1 | 12 types (VECTOR, BOOLEAN_OPERATION, ELLIPSE, RECTANGLE, STAR, POLYGON, LINE, FRAME, GROUP, COMPONENT, INSTANCE pilotée, INSTANCE non pilotée) × nom `icon` ou `Shape`, peinture à 2:1. | 24 | C49 `icone` selon la définition |
| I2 | RECTANGLE nommé `Silicone`, `Lexicon`, `Icon Leading`, `icon-trailing`, `IconButton`, `Icons`. | 6 | `Silicone` et `Lexicon` sans constat ; `Icon Leading` et `icon-trailing` mesurés |
| I3 | VECTOR nommé `Divider`, `Separator`, `Chevron`, `Glyph`. | 4 | mesurés comme icône (E-26) |
| I4 | Icône avec fill et stroke, avec deux fills, avec un fill translucide. | 3 | rapport de l'oracle sur le fill ; le stroke relève de C50 |
| I5 | VECTOR nommé `ring`, VECTOR nommé `Focus ring`. | 2 | non mesurés comme icône |
| I6 | Icône sans peinture visible, icône avec stroke seul. | 2 | aucun C49 `icone` |

**Contour et anneau (C50, C51)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| R1 | Contour. Épaisseur absente, 0, 0,5, 1, 2 avec une peinture visible : 5. Peinture masquée, d'opacité 0, d'alpha 0, translucide, en dégradé : 5. Contour d'un TEXT : 1. Contour sur un layer qui a son propre fill : 3 (`mesure`, Q-F7-8). Racine sans parent : 1. Peintures mixtes (lecture manquée) : 1. | 16 | C50 `stroke` sous 3:1 pour une épaisseur non nulle et une peinture visible ; aucun pour les autres, limite pour le dégradé |
| R2 | Nom du layer d'anneau, variant en focus : `ring`, `.Ring`, `_ring`, `focus-ring`, `Focus Ring`, `focus_ring`, `focusRing`, `RING`, `ringer`, et `Ring Wrapper`, `ring-2`, `Focus`, `outline`, `focus-outline`, `Ring/Outer` (ces 6 en `mesure`, Q-F7-9). | 15 | pas de `C50:sans-anneau` pour les 8 premiers ; `C50:sans-anneau` pour `ringer` |
| R3 | Valeur de l'état : `focus`, `Focused`, `Focus`, `focus-visible`, `Focus Visible`, `hover`, `pressed`, `selected`, `default`, sans anneau. Un neuvième cas avec deux axes d'états. | 10 | `C50:sans-anneau` pour les 5 premières écritures ; aucun pour les autres |
| R4 | Anneau invisible. Layer masqué, peinture masquée, peinture d'opacité 0, layer d'opacité 0, couleur d'alpha 0, sous un ancêtre masqué, de type TEXT, sans peinture : 8. Instance nommée `.Ring` sans peinture propre, ELLIPSE nommée `ring` remplie sans contour : 2 (`mesure`, Q-F7-9). | 10 | `C50:sans-anneau` pour les 8 premiers |
| R5 | Épaisseur de l'anneau : absente, 0, 1, 1,5, 1,99, 2, 2,01, 3, 4, 8 : 10. 1,9999999 : 1 (`mesure`). Anneau rempli d'épaisseur 0 : 1 (`mesure`, Q-F7-9). Deux anneaux dans un variant : 1. Même anneau dans trois variants : 1. | 14 | C51 avec l'épaisseur lue pour toute valeur différente de 2 ; un seul constat par nom et épaisseur, sans layer en double |

**Cible (C52)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| Z1 | Racine carrée de 23,99, 24, 43,99 et 44 px : 4. Rectangles 23,99 × 100, 100 × 23,99, 24 × 200, 44 × 30, 100 × 43,99, 100 × 44 : 6. Racine de 0 × 0, de NaN, d'infini, de largeur négative : 4. | 14 | corriger sous 24, vérifier de 24 à moins de 44, rien à 44 ; les 4 derniers sans exception (P20) |
| Z2 | Interactivité, racine de 20 × 20. Axe `State` à {default}, {default, disabled}, {default, hover}, {default, focus}, {default, pressed}, {default, selected}, {Default, Hovered}, {rest, press}, {on, off}, {Active, Inactive}, {default, loading}, aucun axe, axe `Status` à {Success, Error}, axe `État` à {Défaut, Survol}. | 14 | C52 pour les 6 premiers hors {default}, {default, disabled}, plus {Default, Hovered}, {rest, press} et `État` ; aucun pour les autres. `mesure` pour {on, off}, {Active, Inactive} et {default, loading} (E-40) |
| Z3 | Dimensions illisibles (`manquees`), variant sans racine, deux racines, racine masquée. | 4 | aucune accusation (P21) ; la racine masquée reste mesurée |
| Z4 | Regroupement : trois variants de tailles différentes, trois variants de même taille. | 2 | un constat par couple dimensions et seuil |

**Variants désactivés (C53)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| X1 | Écriture de l'état, texte à 2:1 : `disabled`, `Disabled`, `DISABLED`, `disable`, `Disabled ` (espace final), `inactive`, `Inactive`, `unavailable`, `read-only`, `dimmed`. | 10 | exclus pour les 4 premières écritures ; les 6 autres sont mesurées (`mesure`, Q-F7-10) |
| X2 | Nom de l'axe : `State`, `states`, `Status`, `État`, `Etat`, `Mode`, `Interaction`, axe booléen `Disabled=True`, axe `Enabled=False`. | 9 | exclus pour les 5 premiers ; `mesure` pour les 4 autres |
| X3 | Portée de l'exclusion dans un variant `disabled` : texte de 11 px, racine de 20 px, anneau d'épaisseur 1, contour sous 3:1. | 4 | aucun constat (C53 les exclut) ; verdict `mesure` (Q-F7-10) |
| X4 | Nombre de variants désactivés : 0, 1, 3, tous, un jeu qui n'a que `disabled`. | 5 | C53 avec `variantsExclus` exact ; aucun C53 pour 0 |
| X5 | Variant `disabled` en focus (deux axes), variant `disabled` sans texte. | 2 | exclus |

**Display P3 et paire choisie (C49, `jugerContraste`)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| E1 | Paires opaques en P3 dont la conversion en sRGB tombe juste au-dessus et juste au-dessous de 3, 4,5 et 7 : 6. Mêmes canaux dans un document sRGB et P3 : 2. P3 saturé hors du gamut sRGB (0, 1, 0) : 2. Gris P3 : 1. Fond et premier plan liés à des variables P3 : 2. | 13 | rapport de l'oracle converti (P15) |
| E2 | Composition translucide en P3 (alpha 0,5, 0,25, 0,75). | 3 | `mesure` (Q-F7-13) |
| E3 | Canaux de P3 posés dans un fichier déclaré sRGB. | 1 | rapport sRGB |
| E4 | `jugerContraste` : paire opaque au-dessus et au-dessous de 3 (2), alpha différent de 1, canal hors de [0, 1], valeur non résolue, valeur qui n'est pas une couleur, trois paires P3. | 10 | `juge` avec le rapport de l'oracle ; `non-juge` avec la raison `transparence`, `gamut`, `non-resolu` ou `pas-une-couleur` |

**Borne de 5 000 combinaisons (C49)**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| Q1 | Totaux : 4 999, 5 000, 5 001 combinaisons pour un variant ; 2 × 2 500 ; 2 × 2 501 ; 50 × 100 ; 51 × 100 ; 216 × 24 (5 184). | 8 | `C49:borne` si et seulement si le total dépasse 5 000 ; comptes exacts |
| Q2 | Un variant qui échoue placé au dernier rang mesuré, au premier rang non mesuré, au milieu d'un produit coupé, en tête. | 4 | constat pour les rangs mesurés ; aucun pour les non mesurés, sans le dire (`mesure`, Q-F7-11) |
| Q3 | Cinq collections de 2, 3, 4, 5 et 6 modes, puis 1 000 000 de combinaisons, puis plus de 2^53 combinaisons. | 3 | compte en nombre, puis en chaîne de chiffres exacts |
| Q4 | Collection atteinte par un layer dont la couleur ne change pas la mesure, 2 modes puis 3 modes. | 2 | `mesure` (Q-F7-11) |
| Q5 | Variants `disabled` avec la borne, composant sans couleur liée. | 2 | variants désactivés hors du compte ; total de 1 |

**Texte mixte**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| T1 | Plages de couleurs mixtes (2, puis 3 dont 1 échoue), de tailles mixtes (grand texte et petit texte), de graisses mixtes, plage vide, plage liée et plage en dur, plusieurs TEXT de même nom. | 8 | un constat par plage qui échoue, seuil de la plage |
| T2 | Même TEXT de nom `Label` dans deux variants avec des tailles différentes. | 2 | deux identifiants distincts, un seul groupe par couple identique |

**Entrées dégradées et lectures manquées**

| Id | Dégradation | Cas | Constat attendu |
|---|---|---|---|
| L1 | Entrées dégradées : canal NaN, alpha NaN, opacité négative, opacité 2, taille 0, taille NaN, taille négative, taille infinie, graisse NaN, dimensions NaN, épaisseur NaN, épaisseur négative, cycle de `parent`, deux layers de même identifiant, variant sans layer, aucun variant, propriétés vides, catalogue vide, collection sans mode, alias en cycle. | 20 | aucune exception (P20) |
| L2 | Lectures manquées. `manquees` sur `dimensions`, sur `fills` d'un texte, d'un fond, d'un contour. `variantsNonLus`. `layersNonLus` inconnu. | 6 | aucune accusation sur ce qui n'a pas été lu (P21) |

Le total de la section B est 96 (S) + 45 (G) + 47 (O) + 52 (F) + 36 (M) + 18 (Y) + 41 (I) + 65 (R) + 34 (Z) + 30 (X) + 27 (E) + 19 (Q) + 10 (T) + 26 (L) = 546.

### 3.4 Combinaisons

Un pool d'environ 40 atomes est tiré des opérateurs S1, G1, G3, O1, O2, O3, F1, F3, F5, M1, M3, M5, Y1, I1, R1, R2, R4, R5, Z1, X1, E1 et T1. Chaque atome déclare la zone qu'il touche (variant, layer, plage, champ). La liste est figée dans `combinaisons.ts`.

- 200 paires et 100 triples sont tirés avec la graine, sur les 3 profils de la section 3.2.
- Deux atomes se combinent seulement si leurs zones sont disjointes. L'oracle d'une combinaison est alors l'union des oracles des atomes, ce qui teste l'indépendance des contrôles et du regroupement par groupe de constats.
- 24 cas d'interaction déclarée (8 couples, 3 profils) complètent les 300. Chaque couple a un oracle propre.

| Couple | Oracle attendu |
|---|---|
| O4 et M6 sur le même texte (fond translucide, texte en dur, thème à deux modes) | `mesure` : les deux modes du thème sont mesurés ou l'écart est dit |
| F1 et M5 sur le même variant (dégradé en fond, couleur illisible sur un autre layer) | deux limites de causes distinctes, aucun verdict |
| X1 et Q1 (variants désactivés avec 5 001 combinaisons) | les variants désactivés ne consomment aucune combinaison |
| G1 et S3 en AAA | seuil 4,5 pour le grand texte, 7 pour le texte |
| R4 et R5 (anneau invisible d'épaisseur 1) | `C50:sans-anneau`, aucun C51 |
| O2 et E1 (couches empilées en P3) | rapport de l'oracle P3 sur la pile composée |
| Y1 et O4 (fond translucide, texte lié à `surface/foreground`) | deux constats `page` et `carte` de types indépendants |
| T1 et M1 (plages mixtes, deux modes) | un constat par plage, pire mode par plage |

### 3.5 Graine et total

La graine est 7107, avec le générateur pseudo-aléatoire à 32 bits `mulberry32` du cadre commun, dont le tirage suit l'ordre trié des identifiants de cas. Une même graine rend les mêmes cas.

| Section | Contenu | Cas |
|---|---|---|
| A | Faux positifs (section 4) | 190 |
| B | Opérateurs simples | 546 |
| C | Combinaisons | 324 |
| D | Chaîne sandbox et écran (section 5.3) | 60 |
| | Total | 1 120 |

Détail de B : S 96, G 45, O 47, F 52, M 36, Y 18, I 41, R 65, Z 34, X 30, E 27, Q 19, T 10, L 26. Détail de C : 200 paires, 100 triples et 24 interactions.

## 4. Faux positifs

Les 96 profils de la section 3.2 doivent donner zéro constat (P1). Vingt-deux thèmes ciblés et 72 cas de garantie s'y ajoutent.

| Thème ciblé | Cas |
|---|---|
| Cinq états conformes (`Default`, `Hover`, `Pressed`, `Focus`, `Selected`) avec anneau de 2 px | 1 |
| Variant `disabled` dont le texte est à 1,5:1 ; dont l'icône est à 1,5:1 | 2 |
| Fond opaque lié et texte conforme, niveaux AA puis AAA | 2 |
| Texte de 12, 13 et 24 px conformes | 3 |
| Racine interactive de 44 × 44 et de 48 × 48 ; racine non interactive de 20 × 20 | 3 |
| Anneaux de 2 px nommés `ring`, `Focus Ring` et `.Ring` | 3 |
| Composant sans texte ni icône (`divider-1`) | 1 |
| Fichier libre sans thème, page Figma blanche, texte conforme | 1 |
| Layer masqué à contraste faible ; layer sous un parent masqué | 2 |
| Contour d'épaisseur 0 avec peinture visible ; layer sans contour | 2 |
| Texte translucide à 90 % conforme | 1 |
| Cinq collections de modes, couleurs conformes dans chaque combinaison | 1 |

Le total compte 1 + 2 + 2 + 3 + 3 + 3 + 1 + 1 + 2 + 2 + 1 + 1 = 22 thèmes. Chaque thème vérifie aussi P8.

Garanties de Palettes. Pour 4 palettes tirées de la graine dans le moteur de `packages/couleur` (la fonction de génération est à relever au lot 2), chacune des 9 garanties de `emplois/garanties.ts` est posée dans les deux modes : le premier plan sur son fond, texte à 4,5 ou contour à 3. Une garantie jugeable ne doit produire aucun constat C49 ni C50. Les 72 cas (9 × 2 × 4) vérifient qu'Architect et Palettes rendent le même verdict sur un même couple de couleurs. Un fond de garantie non jugeable pour une palette donne un cas vide, compté et signalé.

## 5. Harnais

### 5.1 Emplacement

Le code vit hors de `npm test`, dans deux dossiers.

| Dossier | Contenu |
|---|---|
| `packages/kit/scripts/stress/f7-accessibilite/` | Hors de `tests/`, donc non découvert par `run-tests.cjs`. Le cadre commun (`prng.ts`, `types.ts`, `comparer.ts`) est dans `packages/kit/scripts/stress/commun/`. Ici : `oracleContraste.ts`, `paires.ts`, `couleursDeStress.ts`, `composantDeContraste.ts`, `profils.ts`, `operateursSeuils.ts` (S, G, O), `operateursFonds.ts` (F, M, Y), `operateursFormes.ts` (I, R, Z, X), `operateursEspaceEtBorne.ts` (E, Q, T, L), `fauxPositifs.ts`, `combinaisons.ts`, `metamorphiques.ts`. Il importe `composantDeBase.ts` et `profils.ts` de `f3-composant/`. |
| `packages/plugin-architect/scripts/stress/f7-accessibilite/` | `chaine.ts` (sandbox et écran), `executer.ts`, `rapport.ts`, `signatures.ts` (rattachement d'un écart à un E connu), `recette.ts`. |

Lancement, après construction du kit comme le font les scripts du plugin.

```sh
npm run stress:accessibilite --workspace ucm-architect-plugin -- --graine 7107
```

Le script `stress:accessibilite` de `packages/plugin-architect/package.json` appelle `node ../../scripts/construire-plugin.mjs verifier-kit architect` puis `npx tsx scripts/stress/f7-accessibilite/executer.ts`. Options prévues : `--section A|B|C|D`, `--operateur G1`, `--cas G1-14` (rejoue un cas et imprime le relevé, le catalogue, les constats, l'oracle et le calcul pas à pas du rapport), `--rapide` (P0 seul pour les sections B et C) et `--strict` (sortie non nulle au premier écart `attendu`).

### 5.2 Appel du kit puis de l'écran

1. Le générateur rend un `ReleveDeComposant`, un `CatalogueDeReference` et leur carte, avec `fondsDElevation` et `fondDeLaPageFigma` selon le cas.
2. L'opérateur copie le composant (`structuredClone`), applique la dégradation et rend l'oracle du cas.
3. Le harnais appelle `controlerLAccessibilite(releve, catalogue, { niveau })`, puis compare avec l'oracle. Pour les cas de la borne, il appelle aussi `controlerLAccessibiliteParEtapes` et vérifie que les deux voies rendent les mêmes constats.
4. Pour la chaîne, il appelle `traiterAvec(lecteurs)` de `sandbox/analyse.ts` avec des `Lecteurs` doubles (sujet, relevé, catalogue, moteur, niveau, ignorés) et un `Contexte` qui capte les messages, comme `tests/analyse.test.ts`. Le catalogue du fichier passe par `avecLesFondsDElevation` et `fondDeLaPageFigma`.
5. Le harnais appelle `elementsDuPanneau`, `carteDAFaire` et `ligneDInformation` sur le faux DOM de `tests/domDeTest.ts`. Il lit la phrase, le statut, le rapport affiché, le seuil affiché et les lignes Informations.
6. Pour les ignorés, il appelle `ignorerUnConstat`, `nePlusIgnorer` et `separerLesIgnores` sur un double de `PortDIgnores`.
7. Pour la paire choisie, il appelle `jugerContraste` avec des `Resultat` fabriqués et compare le rapport à l'oracle.

### 5.3 Cas de la chaîne (section D)

| Id | Cas | Nombre | Propriétés |
|---|---|---|---|
| D1 | Niveau. AA, AAA, niveau illisible (retombe sur AA), changement de niveau qui périme l'analyse. | 4 | P18 |
| D2 | Cartes À faire : C49 texte sur fond réel, sur `page` garanti, sur `carte` non garanti, sur la page Figma, hors thème ; C49 grand texte ; C49 icône ; C50 contour ; C50 anneau ; `C50:sans-anneau` à un et à plusieurs variants ; C51 ; C52 corriger ; C52 vérifier (hauteur, puis largeur) ; C49 sous 12 px. | 14 | P16, P17 |
| D3 | Informations : C53 ; une limite par cause (6) ; `fond-de-repli` ; borne avec un total en nombre, en chaîne au-delà de 2^53, et pour une seule paire. | 11 | P16 |
| D4 | Rapport affiché pour 2,999999817, 3,000000003, 4,4999993, 4,5, 7,0, 6,999999, 1, 21. | 8 | P17 |
| D5 | Ignorer. Ignorer C49, `C50:sans-anneau`, C51 et C52, puis « Ne plus ignorer » ; limite non ignorable ; C53 ; identifiant après une plage de texte plus longue ; identifiant après le passage de AA à AAA. | 9 | P19 |
| D6 | États. Fichier libre ; fichier UCM ; moteur partiel ; lecture manquée du relevé. | 4 | P16, P21 |
| D7 | Fonds du fichier. `fondDeLaPageFigma` : dégradé, image, fond masqué, opacité 0,5, aucun fond (5). `avecLesFondsDElevation` : mode sans valeur, alias hors collection, page sans carte, deux collections `theme`, alpha 0,5 (5). | 10 | P6 |

### 5.4 Rapport et temps

Le rapport s'écrit dans `_local/stress/f7-accessibilite/` (dossier ignoré par Git) en deux fichiers, `rapport.json` et `rapport.txt`. Le `.txt` porte ce tableau, une ligne par opérateur.

| Opérateur | Cas | Attendus | Détectés | Manqués | Faux constats | Rapports inexacts | Limites inexactes | Types inexacts | Non affichés | En attente |
|---|---|---|---|---|---|---|---|---|---|---|

Il porte aussi le total par section, puis la liste des écarts. Chaque écart donne l'identifiant du cas, la propriété violée, l'écart connu rattaché (E-26, E-31, E-40) ou la mention « nouveau », le rapport de l'oracle et celui du plugin à dix décimales, et la commande qui rejoue le cas.

Le temps d'exécution est à mesurer au lot 7. Le seuil visé est 180 secondes pour les 1 120 cas sur le poste du mainteneur. Les cas Q1 à Q3 font mesurer jusqu'à 5 000 combinaisons par cible, et les profils `button-216` comptent environ 1 300 layers. Si le seuil est dépassé, le lot 7 règle `--rapide` et limite la borne à P0, sans réduire le nombre d'opérateurs.

## 6. Deux temps

### 6.1 Mesure de l'existant

Le `verificateur` lance le harnais sur le code actuel. La conversation principale lit `rapport.txt`, classe chaque écart (défaut, limite assumée, cas à trancher) et rattache les nouveaux à un identifiant. Elle présente au mainteneur le tableau des écarts nouveaux et celui des cas `mesure`. Rien n'est corrigé dans cette étape.

Écarts que la lecture du code laisse prévoir. Un essai en lecture seule, qui appelle `controlerLAccessibilite` sur des relevés fabriqués hors du dépôt, a déjà confirmé ceux de la colonne « Essai ». La mesure confirme les autres.

| Hypothèse | Opérateur | Source | Essai |
|---|---|---|---|
| Le kit ne lit jamais `espaceDeCouleur`. Dans un document Display P3, C49 et C50 jugent les canaux P3 comme des canaux sRGB : les mêmes couleurs donnent le même rapport (1,18) dans les deux espaces. | E1, E2 | `accessibilite.ts` (aucune lecture de `espaceDeCouleur`), `releve.ts` | confirmé |
| L'opacité d'un ancêtre ne s'applique pas à ce qu'il contient. Un texte sous un parent à 10 % d'opacité garde son rapport de 3,36. | O5 | `couchesDesAncetres`, `pileDePeintures` | confirmé |
| Une peinture dont la couleur a un alpha de 0, un layer d'opacité 0 et une plage sans peinture visible donnent un texte mesuré à 1:1 et un constat `corriger`. `peintureVisible` ne lit pas l'alpha de la couleur. | O1 | `releve.ts` (`peintureVisible`), `pileDePeintures` | confirmé |
| Un fond porté par un frère placé dessous n'est jamais vu : un texte blanc sur un rectangle bleu frère, dans un frame sans fond, est mesuré sur la page Figma à 1:1. | F6 | `couchesDesAncetres` | confirmé |
| La garantie du thème ne compare ni le seuil ni le niveau. Un texte à 4,5 lié à `solid/default` ou à `surface/border`, dont la garantie vise 3:1, sort `corriger` avec « UCM Palettes garantit ce contraste ». Un texte à 7 en AAA lié à `surface/foreground` aussi. | Y1 | `estGaranti`, `surUnFondNomme` | confirmé |
| Le repli sur la page et la carte ne mesure que le premier mode du thème (ou le mode effectif) quand la couleur du texte n'est pas liée : le mode Dark n'est jamais jugé. | M6 | `fondsDeRepli`, `modeDeLaCollection` | confirmé |
| Une instance nommée `.Ring`, sans peinture propre, n'est pas reconnue comme anneau : `C50:sans-anneau` sort. | R4 | `anneauxDuVariant` | confirmé |
| Un anneau rempli, sans contour (ELLIPSE nommée `ring`), n'est ni mesuré comme icône ni comme contour, et ne donne aucune information. Avec une épaisseur de 0, C51 l'accuse de ne pas avoir 2 px. | R4, R5 | `ciblesDeContraste`, `controlerLAnneau` | confirmé |
| Un variant dont l'axe booléen `Disabled=True` ou dont l'état s'écrit `Inactive` est mesuré comme un variant actif. | X1, X2 | `etatDuVariant` | confirmé |
| Tout VECTOR est une icône, quel que soit son nom : un VECTOR nommé `Divider` à 1,24:1 sort en C49 `icone`. Un RECTANGLE nommé `icon` n'en est pas une. | I1, I3 | `estIcone` (E-26) | confirmé |
| Le grand texte en graisse 700 commence à 18,66 px, alors que 14 pt valent 18,6667 px. Un texte de 18,664 px passe au seuil de 3 au lieu de 4,5. | G1 | `estGrandTexte` | confirmé |
| La borne coupe les derniers variants en entier et ne dit que le nombre de paires non mesurées, pas quels variants. | Q2 | `controlerLAccessibiliteParEtapes` | lecture |
| Le produit des modes compte les collections atteintes par n'importe quel layer, même quand leur mode ne change pas la mesure : la borne s'atteint plus tôt qu'il ne faut. | Q4 | `combinaisonsDeModes`, `collectionsAtteintes` | lecture |
| L'identifiant d'un constat de contraste porte la plage de texte et le niveau : agrandir le texte ou passer à AAA fait réapparaître un constat ignoré. | D5 | `mesurerLeVariant` (`base`, `cle`) | lecture |
| Le mode de fusion d'une peinture non normal donne la cause `peinture-superposee`, que la phrase dit « superpose plusieurs peintures ». Le mode de fusion du layer et les effets ne sont pas lus : un layer en `MULTIPLY` est mesuré comme un layer normal. | F3 | `pileDePeintures`, `releveDuComposant.ts` (`lireLeLayer`) | lecture |
| Un canal hors de [0, 1] ou un alpha hors de [0, 1] est borné ou pris tel quel, alors que `jugerContraste` rend `non-juge` avec la raison `gamut`. | M5, E4 | `versOctet`, `resoudreLaCouleur`, `contraste.ts` du plugin | lecture |
| Un contour est mesuré sur le fond de ses ancêtres seulement. Un contour décoratif de 1,5:1 sur un bouton dont le fill atteint 3:1 est accusé. | R1 | `ciblesDeContraste`, `fondsDeMesure` | lecture |
| La phrase de l'information `fond-de-repli` dit « `elevation/raised` est introuvable » même quand `elevation/page` ou le thème manque. Le constat porte le code du premier layer mesuré, C49 ou C50. | D3 | `ui/textes/ignores.ts`, `limites` | lecture |
| L'exclusion de C53 retire aussi le texte sous 12 px et la cible, mais la phrase d'information dit « Contraste non mesuré ». | X3 | `controlerLAccessibiliteParEtapes`, `T.variantsExclus` | lecture |
| C51 ajoute le layer d'un second anneau de même nom et de même épaisseur sans test de doublon. | R5 | `controlerLAnneau` | lecture |

### 6.2 Tests de régression

Une fois la mesure lue, des cas représentatifs deviennent des tests dans `npm test`.

| Fichier | Contenu | Cas |
|---|---|---|
| `packages/kit/tests/stressAccessibilite.test.ts` | Un test par opérateur de la section B qui a révélé un écart, avec 1 à 3 cas de la graine 7107, plus les propriétés P1 à P15, P20 et P21 rejouées sur P0 et Pα. | 50 à 70 |
| `packages/plugin-architect/tests/accessibiliteStress.test.ts` | Les cas D1 à D7 qui ont révélé un écart, plus les cas E4 de `jugerContraste`. | 20 à 30 |

Un test dont le défaut n'est pas corrigé porte `{ todo: '<écart>' }` de `node:test`. Il s'exécute, et son échec ne fait pas échouer `npm test`. La correction du code retire le `todo`. Les deux fichiers durent moins de 10 secondes ensemble. Le contrôle du kit et du plugin reste dans `npm test`, le harnais complet reste hors de `npm test`. Les résultats entrent dans `MESURE-DES-FAILLES.md`.

## 7. Recette Figma

Ce qui ne se prouve qu'en Figma. Le mainteneur dégrade une copie d'un fichier de recette qu'il a déjà (Button à 216 variants, Alert à 11). Le plan ne crée et ne migre aucun fichier. Le harnais imprime dans `_local/stress/f7-accessibilite/recette-figma.txt` les cartes et informations attendues pour chaque geste.

| N° | Geste du mainteneur | Ce qu'il vérifie |
|---|---|---|
| H1 | Ouvrir Architect, mode Composant, sur la copie intacte de Button. | Les constats d'accessibilité propres au fichier, comptés avant tout geste, et le temps de l'analyse. |
| H2 | Poser un texte de 11 px, puis de 12 px. | `C49:taille` pour 11 px seulement. |
| H3 | Donner à la racine 23,99, 24, 43,99 puis 44 px de côté. | Les dimensions lues par `absoluteBoundingBox`, arrondies ou non par Figma, et le seuil de C52. Noter l'effet d'une rotation. |
| H4 | Mettre le parent d'un texte à 50 % d'opacité, puis à 10 %. | Le rapport lu. Noter s'il ignore l'opacité du parent. |
| H5 | Passer un layer en `Multiply` au niveau du layer, puis activer un flou d'arrière-plan sur son fond. | Une limite ou un rapport. Noter le silence. |
| H6 | Poser un texte blanc sur un rectangle bleu frère, dans un frame sans fond. | Le fond lu. Noter si le texte est mesuré sur la page Figma. |
| H7 | Ouvrir le même composant dans un document sRGB et dans un document Display P3, avec les mêmes canaux. | Les canaux `r, g, b` que l'API rend dans chaque document et le rapport affiché. |
| H8 | Donner à la page un fond d'opacité 50 %, puis un dégradé. Supprimer `elevation/raised` du thème. | Le fond de repli lu et la phrase de l'information. |
| H9 | Ajouter une propriété `Disabled` (True ou False), puis un état `Inactive`. | Variants mesurés ou exclus, texte de C53. |
| H10 | Remplacer l'anneau par une instance `.Ring`, puis par un cercle `ring` rempli sans contour, puis par un `focus-ring` de 1 px. | `C50:sans-anneau`, C51, et le rapport de l'anneau. |
| H11 | Passer le niveau de AA à AAA et relancer. Ignorer un constat de texte, puis allonger le texte. | Les seuils affichés, la périmée de l'analyse, le constat qui réapparaît ou non. |
| H12 | Poser sur un bouton rempli un contour décoratif de 1,5:1. | Le constat C50. Noter si le bouton se distingue par son fill. |
| H13 | Poser un VECTOR décoratif nommé `Divider`, puis une instance d'icône pilotée par INSTANCE_SWAP. | Quel layer est mesuré comme icône. |
| H14 | Forcer le mode Dark sur un frame du composant. | `modesEffectifs` lus, mode mesuré en premier, et les modes rapportés. |
| H15 | Lancer l'analyse sur un composant de plus de 5 000 combinaisons de modes. | L'information de la borne, son compte, et les variants non mesurés. |

## 8. Lots d'exécution

Le plan d'ensemble reste dans la conversation principale. Un lot par appel d'agent, au plus deux lots en parallèle. Après chaque lot, la conversation relit le diff, un `verificateur` relance les vérifications, puis `npm run agents:diff`. Le prompt de chaque implémenteur contient la note du lot, la nature de la tâche et la sortie de `npm run agents:lire -- <chemins du lot>`. L'ordre est 0, puis 1 avec 2, puis 3 avec 4, puis 5 avec 6, puis 7, 8, et enfin 9 avec 10.

| Lot | Fichiers | Agent | Critères de fin |
|---|---|---|---|
| 0 Cadre commun et générateur de F3 | `packages/kit/scripts/stress/commun/`, `packages/kit/scripts/stress/f3-composant/composantDeBase.ts`, `profils.ts` | `implementeur` | Le lot 0 de F2 et le lot 1 de F3 sont livrés. Si `comparer` a une clé fixe, la famille fournit la clé (code, usage, variant, layer, plage, fond). `stressCadre.test.ts` prouve que deux tirages de la graine 7107 sont identiques. `npm run typecheck` passe. |
| 1 Oracle numérique | `oracleContraste.ts`, `paires.ts`, `packages/kit/tests/oracleContraste.test.ts` | `implementeur-exigeant` | L'oracle n'importe rien de `emplois/`. Il rend 21 pour noir sur blanc, 1 pour deux couleurs égales, 4,5422 pour #767676 sur blanc et 7,0047 pour #595959. La table de luminance est la même avec 0,03928 et 0,04045. Sur 100 000 paires opaques de la graine, l'oracle et `contraste` du kit diffèrent de moins de 1e-12. La recherche de `paires.ts` rend la paire la plus proche de chaque seuil, à plus de 1e-9. La conversion P3 retrouve (1, 1, 1) pour le blanc P3. |
| 2 Générateur | `couleursDeStress.ts`, `composantDeContraste.ts`, `profils.ts` de F7 | `implementeur-exigeant` | Les 96 profils donnent zéro constat C49 à C52 (P1). `button-216` se construit en moins de 2 s. Chaque profil porte les fonds d'élévation et la carte de ses couleurs. Un profil non vide en constats est lui-même un résultat à remonter. Le lot 2 relève la fonction de `packages/couleur` qui génère une palette. |
| 3 Opérateurs S, G, O, F, M, Y | `operateursSeuils.ts`, `operateursFonds.ts` | `implementeur-exigeant` | Les opérateurs rendent 96 + 45 + 47 + 52 + 36 + 18 = 294 cas. Chaque cas a un oracle rédigé, les verdicts `mesure` sont marqués, et un contrôle de cohérence prouve que dégrader puis annuler redonne le composant de base. |
| 4 Opérateurs I, R, Z, X, E, Q, T, L et faux positifs | `operateursFormes.ts`, `operateursEspaceEtBorne.ts`, `fauxPositifs.ts` | `implementeur` | Les opérateurs rendent 41 + 65 + 34 + 30 + 27 + 19 + 10 + 26 = 252 cas, et le lot rend les 22 thèmes ciblés et les 72 cas de garantie. Les lots 3 et 4 touchent des fichiers distincts et peuvent tourner ensemble. |
| 5 Combinaisons et relations | `combinaisons.ts`, `metamorphiques.ts` | `implementeur-exigeant` | 200 paires, 100 triples et 24 interactions rendent des oracles sans zone partagée. Les relations de P8 et P9 (ordre, identifiants, échange du fond et du premier plan, mode dupliqué, alias) s'appliquent sans changer le composant de base. |
| 6 Chaîne sandbox et écran | `chaine.ts`, `signatures.ts` | `implementeur-exigeant` | Les 60 cas D1 à D7 s'exécutent. Le faux DOM rend les cartes et les informations. Chaque propriété P16 à P19 rend un verdict sur un composant qui porte tous les codes. Le lot 6 ne dépend que des lots 0 et 2 et peut tourner avec le lot 5. |
| 7 Exécuteur et rapport | `executer.ts`, `rapport.ts`, `packages/plugin-architect/package.json` (script `stress:accessibilite`) | `implementeur` | `npm run stress:accessibilite --workspace ucm-architect-plugin -- --graine 7107` finit sur 1 120 cas, imprime le tableau de la section 5.4, écrit `rapport.json` et `rapport.txt`, et rejoue un cas par `--cas`. Deux exécutions donnent le même rapport. Le temps mesuré est noté. `npm run typecheck` passe. |
| 8 Mesure de l'existant | aucun fichier de code | `verificateur`, puis la conversation principale | `rapport.txt` du code actuel est lu en entier. Chaque écart est classé et rattaché. Le tableau des écarts nouveaux et celui des cas `mesure` sont remis au mainteneur. Les 20 hypothèses de la section 6.1 sont confirmées ou infirmées, et le résultat entre dans `MESURE-DES-FAILLES.md`. |
| 9 Régression | `packages/kit/tests/stressAccessibilite.test.ts`, `packages/plugin-architect/tests/accessibiliteStress.test.ts` | `implementeur` | Les deux fichiers couvrent chaque écart classé au lot 8. `npm test` passe, les écarts non corrigés portent `todo`, et les deux fichiers durent moins de 10 secondes. |
| 10 Scénario de recette | `recette.ts`, sortie `recette-figma.txt` | `implementeur` | Le fichier donne, pour H1 à H15, les cartes et informations attendues d'après l'oracle. Le mainteneur le lit avant la recette. |

## 9. Questions au mainteneur

Les décisions Q-F2-7 (un seul document, `MESURE-DES-FAILLES.md`) et Q-F2-9 (tests `todo` dans `npm test`) s'appliquent ici. Q-F3-4 (une définition d'icône) commande les cas I1 à I6 : F7 n'en pose pas de seconde. La conversation principale retient chaque proposition comme décision provisoire, que le mainteneur peut revoir. Les cas liés restent `mesure` dans le rapport, comptés à part, jusqu'à sa confirmation.

| Id | Question | Proposition |
|---|---|---|
| Q-F7-1 | La composition des couches se fait-elle en flottant avec un seul arrondi à 8 bits, et la comparaison à dix décimales ([MOT-22]) reste-t-elle la règle ? | Oui aux deux. Un écart d'un niveau d'octet entre deux ordres d'arrondi n'est pas un défaut. Aucune paire à 8 bits n'est à moins de 2,9e-9 d'un seuil, donc la règle des dix décimales ne change aucun verdict. Un fond de page ou d'élévation d'alpha inférieur à 1 donne la limite `fond-indetermine` plutôt qu'un fond forcé opaque. |
| Q-F7-2 | L'opacité d'un ancêtre s'applique-t-elle au texte qu'il contient ? Que fait-on d'un layer dont l'alpha effectif est nul ? | Oui : l'alpha effectif multiplie ceux des ancêtres. Un layer d'alpha effectif nul n'est pas mesuré et ne donne ni verdict ni constat. |
| Q-F7-3 | Où commence le grand texte gras ? | À 14 pt, soit 56/3 px (18,6667), en graisse 700 ou plus. 18,66 px reste un petit texte. |
| Q-F7-4 | Un frère placé sous le texte et qui le couvre est-il un fond ? | Oui, quand sa boîte contient celle du texte et qu'il est plus bas dans l'ordre d'empilement. S'il ne la couvre qu'en partie, la limite `fond-indetermine`. |
| Q-F7-5 | Que fait-on d'un canal ou d'un alpha hors de [0, 1] ? | Une limite `couleur-hors-gamut`, comme la raison `gamut` de `jugerContraste`. Le canal n'est pas borné en silence. |
| Q-F7-6 | Quand le repli sur la page et la carte sert, faut-il mesurer chaque mode du thème ? | Oui : les modes de la collection `theme` entrent dans le produit dès que le repli sert, même si le texte est en dur. |
| Q-F7-7 | Une garantie du thème couvre-t-elle un échec dont le seuil ou le niveau est plus haut que le sien ? | Non : `corriger` seulement si la garantie vise le même type de seuil (texte ou non-texte), le niveau demandé et ce fond. Sinon `verifier`. |
| Q-F7-8 | Un contour sous 3:1 est-il un défaut quand le layer a un remplissage qui atteint 3:1 sur son fond ? | Non : le contour est décoratif et reste muet. Sans remplissage visible, ou avec un remplissage sous 3:1, il est mesuré sur le fond des ancêtres. |
| Q-F7-9 | Qu'est-ce qu'un anneau ? | Un layer visible dont le nom suit l'expression actuelle, ou une instance de ce nom dont un descendant lu a une peinture visible. Un anneau rempli sans contour est mesuré sur son fill et n'est pas accusé par C51. Les noms `Focus`, `outline` et `Ring Wrapper` ne sont pas des anneaux. |
| Q-F7-10 | Quels variants sont désactivés, et que retire C53 ? | Les états `disabled` et `disable`, plus un axe booléen `Disabled=True` et `Enabled=False`. `Inactive`, `read-only` et `dimmed` restent mesurés. C53 exclut le contraste et la cible et le dit dans sa phrase. Le texte sous 12 px reste mesuré. |
| Q-F7-11 | La borne de 5 000 doit-elle dire quels variants ne sont pas mesurés ? Doit-elle compter des combinaisons distinctes ? | Oui aux deux : l'information donne le nombre de variants non mesurés, et les collections dont le mode ne change aucune valeur lue sortent du produit. |
| Q-F7-12 | De quoi se compose l'identifiant d'un constat de contraste ? | Du code, du nom du layer, de l'usage et du fond nommé. La plage de texte et le niveau en sortent, pour qu'un constat ignoré le reste. |
| Q-F7-13 | Où convertit-on Display P3 vers sRGB pour C49 et C50 ? | Dans le kit, qui lit `espaceDeCouleur` du relevé et convertit relevé et catalogue avant de composer, avec la conversion de `p3VersRgb8` copiée dans `emplois/`. Les paires opaques sont `attendu`. Une composition translucide se fait dans l'espace encodé P3 puis se convertit. |
| Q-F7-14 | Le relevé lit-il le mode de fusion du layer et ses effets ? | Oui : un layer en mode de fusion autre que `NORMAL` ou `PASS_THROUGH`, ou un fond à flou d'arrière-plan, donne la limite `peinture-superposee`. La phrase de cette cause dit « mélange » et non « superpose plusieurs peintures » quand il s'agit d'un mode de fusion. |
