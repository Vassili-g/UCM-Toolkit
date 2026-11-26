# Conception de l'échelle imposée

Étape 1 du [plan de P28](./PLAN-P28.md), d'après la [recherche](./RECHERCHE-PALETTES-DS-EXISTANT.md) et ses réponses du mainteneur (section 10).

## La solution retenue

UCM Palettes reçoit une échelle imposée, qui recalcule les palettes primitives d'une bibliothèque simple sans changer leurs noms, leurs liens ni leur liste de nuances. Le designer marque dans chaque palette les nuances qui portent une couleur de marque. Le calcul les garde à l'octet, recalcule les nuances plus claires que la plus claire d'entre elles sur une courbe choisie, et garde les nuances plus foncées tant qu'elles restent ordonnées et régulières. Une table de contrastes attendus, nuance par nuance, remplace les marqueurs : Palettes la vérifie, la montre et l'écrit dans la description de chaque variable primitive. Le thème sombre se traite par les accents, selon l'une de deux propositions : corriger seulement l'accent qui manque son contraste, ou recalculer tous les accents depuis la couleur de marque. Seule la bibliothèque des primitives change, et la couche des marques et le thème suivent par leurs alias.

Deux faits sont acquis. Les noms et les alias ne changent pas, donc le code en production qui lit les noms publiés ne change pas. Les couleurs isolées, les couleurs de visualisation et les accents que le thème sombre ne vise pas (`a700`, `a50`, `a800`) restent hors du calcul.

La page de preuve est `_local/p28/poc/index.html`, ignorée par Git. Elle se reconstruit par `npx tsx _local/p28/poc/calculer.mts`, qui appelle le moteur de `packages/couleur/src`. Les mesures de cette note viennent de `_local/p28/poc/calcul.txt`, `_local/p28/poc/mesures-dark.txt` et `_local/p28/poc/bilan.txt`.

## Ce qui est générique, ce qui est un réglage du client

L'échelle imposée ne contient aucun choix propre au client. Elle lit dans le fichier la liste des nuances de chaque palette, de 4 à 13 numéros multiples de 50 jusqu'à 1100, un numéro suivi d'un suffixe compris. Elle lit comme accents les variables dont le dernier segment est `a` suivi d'un numéro. La courbe des clairs, le traitement des nuances foncées, le traitement du sombre et les seuils sont des choix de la configuration.

Le client fournit quatre réglages, rangés dans sa recette :

- les nuances de marque de chaque palette ;
- la courbe des clairs ;
- le contraste attendu de chaque nuance et de chaque accent (par exemple « l'accent `a300` porte un texte blanc »), saisi une fois et réutilisé par toutes ses palettes ;
- la proposition retenue pour le sombre.

La correspondance entre une marque et sa primitive reste inconnue, et rien ne la demande. La page suppose seulement que la nuance N d'une palette de marque vise la nuance N de sa primitive.

## 1. Plusieurs nuances de marque par primitive

Une primitive porte une nuance de marque par marque qui la vise, à des numéros différents. Dans l'export d'octobre, `main` vaut 400 pour la palette primaire de la marque A, 700 pour les palettes primaires des marques C et D, et 800 pour les deux palettes de la marque B.

Le designer les désigne dans l'onglet Création. Le détail d'une nuance porte une case « Couleur de marque ». Plusieurs nuances peuvent la porter, et aucune n'est cochée d'avance. Une phrase sous l'aperçu nomme la première nuance qui porte un texte blanc à 4,5:1, comme repère. Le designer apprend quelles nuances portent une couleur de marque en lisant la couche des marques du fichier client : `main` y vise la nuance marquée `-[light]`. Palettes ne peut pas lire ce fichier depuis la bibliothèque des primitives. Cette lecture est un geste manuel, posé en question.

Le calcul procède ainsi :

- chaque nuance de marque garde ses octets ;
- les nuances plus claires que la plus claire des nuances de marque se recalculent sur la courbe choisie (section 2), avec la teinte de `teinteA` (dérive Tailwind) et la part de chroma de cette nuance par `fabriquerCran`, enveloppe Vivid Light ;
- les nuances entre deux nuances de marque gardent leurs octets ;
- les nuances plus foncées que la plus foncée des nuances de marque gardent leurs octets, sauf dans les cas de la section 3.

Le calcul ne lit que la liste des nuances, les nuances de marque et la courbe. Deux primitives égales, comme la palette 13 et le second gris de 50 à 900, reçoivent donc le même résultat si le designer y marque les mêmes nuances. Palettes signale deux palettes égales avant le calcul et différentes après, sans corriger.

## 2. Les courbes candidates des clairs

Les quatre courbes placent la clarté OKLCH des nuances plus claires que l'ancrage, la plus claire des nuances de marque. `u(n)` est la clarté de la courbe commune d'UCM au numéro `n` (`PREREGLAGES[13]`), `L50` et `La` les clartés actuelles du 50 et de l'ancrage `a`.

| Courbe | Définition | Ce qu'elle garde |
|---|---|---|
| Actuelle | Les nuances de la bibliothèque. | Tout |
| Lissée | `L(n) = L50 − (u(50) − u(n)) / (u(50) − u(a)) × (L50 − La)` | La clarté du 50 et l'ancrage ; la forme de la courbe d'UCM entre eux |
| Commune | `u(n)` jusqu'au 300, puis `u(300) − (u(300) − u(n)) / (u(300) − u(a)) × (u(300) − La)` jusqu'à l'ancrage | L'ancrage ; le 50 au 300 prennent la même clarté dans toutes les palettes |
| Régulière | `L(rang i) = L50 − i / ia × (L50 − La)`, `ia` étant le rang de l'ancrage | La clarté du 50 et l'ancrage ; des pas égaux entre eux |

Sur les 164 couples d'une palette et d'un ancrage possible, du 200 au dernier numéro, aucune courbe ne déplace une nuance de marque. La courbe commune rompt l'ordre des clartés dans 4 couples. La lissée et la régulière ne le rompent jamais.

Vues par une couleur de marque au 700, les 13 palettes de marque tiennent 327 paires de contraste sur 390 avec la courbe actuelle, 337 avec la lissée, 336 avec la commune et 325 avec la régulière. Au 800, elles en tiennent 362, 371, 372 et 361. Au 400, elles en tiennent 130 à 147, parce que le blanc ne se lit pas sur la couleur de marque, et aucune courbe des clairs ne le répare.

La recommandation montrée au lead UX est la lissée, qui gagne le plus de paires sans rompre l'ordre. La page compare les quatre courbes côte à côte, et le lead UX choisit.

## 3. Quand les nuances foncées ne sont pas gardées

Les nuances foncées se gardent quand deux conditions tiennent. Le calcul les vérifie, et un message nomme celle qui manque.

- Leur ordre de clarté tient. Aucune des 19 palettes ne l'inverse aujourd'hui.
- Leurs écarts restent réguliers : deux nuances foncées voisines ne sont pas à moins de 0,04 de distance OKLab quand un autre écart foncé dépasse 0,10. Les palettes 3, 9 et 10 manquent cette condition dès le 400. Dans la palette 10, les écarts valent 0,137 et 0,114, puis 0,026 et 0,027 entre les trois dernières nuances.

Quand la régularité manque, le designer peut choisir « Recalculées ». Les nuances situées entre la plus foncée des nuances de marque et la dernière nuance, qui garde ses octets, se répartissent alors selon la courbe d'UCM. Le choix arrive décoché.

Le raccord entre le dernier clair recalculé et l'ancrage relève de la courbe, pas des foncés. Un raccord est un saut quand il dépasse 1,5 fois le pas de la courbe d'UCM au même endroit. La lissée en fait 35 sur 164 couples, au plus 0,159 de clarté, surtout avec un ancrage au 400 ou au 500 dans les palettes 3, 5, 8, 9 et 10. La commune en fait 46, au plus 0,289. La régulière en fait 12, au plus 0,114. Avec un ancrage au 700, seule la palette 10 saute avec la lissée. Le message de saut propose de comparer une autre courbe.

## 4. Le thème sombre et les accents

### Ce que visent les rôles sombres

Dans l'export d'octobre, les marques A à D font viser les accents par les rôles sombres de leurs palettes de marque, toujours de la même façon. Les comptes portent sur les feuilles du thème sombre qui passent par le rôle.

| Accent | Rôle sombre | Feuilles | Paire que l'accent doit tenir |
|---|---|---|---|
| `a300` | `main` | 61 | texte blanc à 4,5 |
| `a400` | `dark` (survol, appui, focus) | 86 | texte blanc à 4,5 |
| `a200` | `light`, et le rôle de nuance discrète | 106 | 4,5 sur le gris 1000, fond sombre de l'export |
| `a100` | le rôle plus clair que `light` | 24 | 4,5 sur le gris 1000 |
| `a900` | le rôle plus foncé que `dark` | 48 | porter `a200` à 4,5 |

Trois feuilles visent `a700` directement. La palette primaire de la marque B n'a aucun rôle sombre défini. Les palettes sémantiques gardent en sombre les nuances du clair.

Cinq palettes primitives sur 13 ne portent ni `a300` ni `a900` (palettes 2, 3, 7, 8 et 11). Une marque qui les vise fait donc pointer ses `a300` et `a900` vers une autre variable, que l'export ne nomme pas.

Les accents actuels tiennent déjà la plupart de ces paires. Le blanc sur `a300` tient dans les 8 palettes qui le portent, de 4,51 à 5,98. Le blanc sur `a400` manque dans 3 palettes (la palette 2 à 1,46, les palettes 7 et 11, qui partagent cet accent, à 4,35). `a200` sur le gris 1000 manque dans la palette 8 (3,45). `a200` sur `a900` tient partout.

### Les deux propositions au lead UX

#### Proposition 1, accents corrigés au besoin

- Résultat visible. Le sombre garde ses couleurs. Seul l'accent qui manque son contraste fonce ou s'éclaircit, juste assez, par pas de 0,001 de clarté, teinte et part de chroma gardées.
- Architecture des tokens. Aucun nom ni alias ne change. Quatre accents primitifs changent de valeur.
- Impact concret. `a400` de la palette 2 fonce de 0,301, ce qui change sa couleur et demande l'accord du lead UX. `a400` des palettes 7 et 11 fonce de 0,009, à l'identique puisqu'il est partagé. `a200` de la palette 8 s'éclaircit de 0,062. Les `a300` et `a900` absents restent à vérifier à la main dans la couche des marques.

#### Proposition 2, accents recalculés

- Résultat visible. Chaque palette reçoit une gamme sombre régulière, calculée depuis sa couleur de marque, aux contrastes garantis par le moteur.
- Architecture des tokens. Aucun nom ni alias ne change. Chaque accent visé par le sombre prend la valeur d'une nuance de la rampe sombre du moteur, texte des boutons blanc : `a300` le fond plein (700), `a400` le survol (600), `a200` le texte de la page (800), `a100` le texte des surfaces (950), `a900` le survol des surfaces (300).
- Impact concret. Tout le sombre change de teinte et de vivacité. Deux palettes qui partagent un accent peuvent se séparer. Une couleur de marque trop claire pour le blanc le reste, car le moteur la garde à l'octet. La palette 1, couleur de marque au 500, manque ainsi une garantie sombre à 4,38. Les `a300` et `a900` absents restent à la main, comme dans la proposition 1.

Vues par une couleur de marque au 800, les 13 palettes tiennent 258 paires sombres sur 390 aujourd'hui, 290 avec la proposition 1 et 296 avec la proposition 2. Les cinq palettes sans `a300` gardent leurs échecs dans les deux propositions. Dans la palette 1 vue au 700, les autres échecs viennent de paires que la structure pose, comme le bord du bouton plein survolé contre le fond sombre, le texte gris foncé sur un accent clair du badge, et l'encart à fond clair et texte d'accent. Le calcul d'une palette ne les répare pas.

La proposition 1 est recommandée : elle tient presque autant de paires et ne change que quatre accents.

Une troisième voie fait viser par les rôles sombres les nuances claires recalculées, comme MUI. Elle change 60 à 103 alias par marque dans la couche des marques et sort du cadre décidé.

## 5. Le contraste attendu sur chaque nuance

Le marqueur `-[light]` dit aujourd'hui « texte blanc attendu ». Le marqueur `-[dark]` dit deux choses, « texte foncé attendu » en clair et « lisible sur un fond sombre » en sombre. Une nuance sans marqueur ne dit rien. Les marqueurs vivent dans la couche des marques, que Palettes n'écrit pas. Le modèle doit donc vivre sur les primitives.

| Forme | Qui fait le changement, et comment | Ce qu'elle casse |
|---|---|---|
| Table des contrastes attendus dans la recette de Palettes | Le designer la règle dans Palettes, une fois ; Palettes la vérifie à chaque calcul | Rien. Elle ne se voit que dans Palettes et sur la planche. |
| Description de chaque variable primitive, par exemple « Texte blanc 4,5:1 tenu. Texte foncé non tenu. » | Palettes l'écrit à l'écriture des valeurs, depuis la table | Rien dans les noms ni les alias. C'est une écriture nouvelle de Palettes. FORMAT.md ne publie aucune description de variable. |
| Description des variables de la couche des marques | À la main, dans le fichier client, variable par variable | Rien, mais aucun outil ne la tient à jour. |
| Marqueurs renommés, par exemple `-[texte-blanc]` | À la main, dans la couche des marques | Les noms publiés, donc le code qui les lit. |
| Marqueurs gardés, sens écrit dans un document | Le mainteneur l'écrit une fois | Rien, et l'ambiguïté de `-[dark]` reste. |

La recommandation réunit les deux premières formes. La table de la recette fait foi, le calcul la tient, et Palettes en écrit la trace dans la description des primitives. Les marqueurs restent tels quels, et rien ne s'écrit dans la couche des marques. Si le mainteneur veut retirer l'ambiguïté des noms, le geste manuel consiste à renommer dans la couche des marques chaque variable `-[dark]` selon sa table, en acceptant de casser les noms publiés. La note ne le recommande pas.

## 6. L'outil, dans UCM Palettes

### Activation et désactivation

La Configuration, onglet Palettes, reçoit une carte « Gamme des palettes reprises » avec deux choix, « Celle du plugin » et « Celle de votre bibliothèque ». Le second active l'échelle imposée pour toute palette reprise ensuite. Les palettes créées par le plugin ne changent pas. L'activation est un rangement ordinaire de la recette, sous un seul `commitUndo`.

La désactivation fige chaque palette en échelle imposée aux couleurs que le plugin a calculées, comme « Telles quelles ». Rien ne s'écrit dans Figma. Une recette rangée par une version antérieure se lit sans échelle imposée.

### Interface, écran par écran

Les textes s'adressent au designer, en mots simples. Le lead UX travaillera sur la version publiée du plugin.

- Gestion, « Déjà dans le fichier ». « Modifier dans le plugin » ouvre un choix « Garder votre gamme de nuances » quand l'échelle imposée est active. Les accents de la palette apparaissent dans sa fiche, à droite de la rampe.
- Création, encart de reprise. Il montre trois rampes, « Fichier », « Calculée » et l'écart de chaque nuance, puis « Les noms de vos couleurs ne changent pas ».
- Création, « Configuration de la palette ». La référence, le modèle et les intensités disparaissent. Paraissent la liste des nuances lue, les nuances de marque cochées, et un rappel des palettes égales.
- Création, aperçu. Il montre la rampe lue, les accents, le ◆ sur chaque nuance de marque et le point des nuances recalculées. Les bandes `solid`, `surface` et `page` disparaissent. Le détail d'une nuance porte la case « Couleur de marque » et le contraste attendu.
- Création, nouvelle carte « Nuances claires ». Elle compare les courbes « Actuelles », « Lissées », « Communes » et « Régulières », avec les écarts de clarté.
- Création, nouvelle carte « Nuances foncées ». « Gardées » est choisi ; « Recalculées » paraît quand la régularité manque.
- Création, nouvelle carte « Thème sombre ». Elle propose « Corriger au besoin » et « Recalculer », avec les accents avant et après.
- Création, « Réglage global », « Color shift » et « Interface de test ». Ils disparaissent en échelle imposée.
- Vérification. La carte des garanties devient « Contrastes à tenir », une ligne par paire de la table. Les neuf garanties de la table d'UCM disparaissent.
- Comparaison. Rien ne change.

Ce qui disparaît en échelle imposée : les garanties G1 à G9, la correction des textes, le glissement de la référence en sombre, la clarté commune des crans clairs, sauf avec la courbe commune, et les alertes « Profils confondus » et « Palettes proches ».

Ce qui apparaît : les nuances de marque, la table des contrastes attendus, la comparaison des courbes, les deux propositions du sombre, les messages de saut au raccord, de foncés irréguliers, de palettes égales et d'accents absents.

### Écriture

L'écriture passe par la reprise en mode `recalculees` ([VAR-13]), dans la collection d'origine, mode clair seul. L'échelle imposée ajoute trois garanties, chacune avec son test : aucun renommage, aucune création, et un nom de palette distinct pour chacune des 13 palettes de marque, que `nomDeLaReprise` confond aujourd'hui. Les accents s'écrivent comme les nuances, par identifiant.

Après l'écriture, trois gestes ont lieu dans Figma : ouvrir Palettes dans le fichier des primitives, publier la bibliothèque, accepter la mise à jour dans le fichier client. Le premier passage se fait sur une copie. Le mainteneur duplique le fichier des primitives, le publie comme bibliothèque distincte, et fait viser cette copie par une copie du fichier client, par l'échange de bibliothèque de Figma. Ces gestes sont manuels, et la question 7 les pose.

### Revenir en arrière

Juste après l'écriture, l'annulation de Figma défait toute l'écriture, close par un seul `commitUndo`. Plus tard, la recette garde les couleurs lues à la reprise, et un geste « Rétablir les couleurs d'avant » les réécrit dans les mêmes variables. Ce geste est nouveau. L'historique des versions de Figma reste le recours sans plugin.

Après une publication, une version publiée ne se retire pas. Revenir en arrière consiste à rétablir les couleurs d'avant, publier de nouveau, puis accepter la mise à jour dans le fichier client. Un fichier qui a déjà accepté la version fautive la garde jusqu'à cette nouvelle acceptation.

### Format de la recette

Le format 13 ajoute à la recette le choix de gamme, la courbe des clairs et la table des contrastes attendus. Il ajoute à chaque palette reprise sa liste lue, ses accents lus, ses nuances de marque, son traitement des foncés et sa proposition du sombre, avec les couleurs lues à la reprise. `classerRecette` lit le format 12 en format 13 sans échelle imposée.

### Répercussions

| Lieu | Changement | Raison |
|---|---|---|
| Moteur, module nouveau | Calcul d'une palette en échelle imposée, ses trois courbes, les foncés recalculés, la correction des accents par pas de clarté | Points 1, 2, 3 et 4 des réponses |
| Moteur, `rampesDe` | Rampe sombre d'une couleur de marque, texte des boutons blanc, pour la proposition 2 ; aucun changement du calcul | Point 4 |
| Moteur, jugement | Une table de paires fournie par la recette, jugée par `contraste` | Seuils de 4,5 et 3, désactivé exclu |
| Kit, `BORNES_DES_CRANS_LIBRES` | Borne portée à 1100, donc `NUMEROS_DE_PALETTE` | Les sémantiques et les gris vont jusqu'à 1100 |
| Kit, `referentiel/produits.ts` et `vocabulaire.ts` | Ce que Palettes lit et écrit en échelle imposée, la borne | Documentation de la borne |
| Palettes, `src/variables/detection.ts` | Numéro suivi d'un suffixe, accents lus, nom de palette distinct | Liste et accents lus dans le fichier |
| Palettes, écriture | Description des variables, aucun renommage, aucune création | Point 5 et architecture inchangée |
| UCM Architect | La nature `palette` couvre 1000 et 1100 ; rien d'autre, Architect restant full UCM | Borne du kit |

Documents à réécrire au moment des lots : [CONCEPT.md](../../../../CONCEPT.md), l'invariant [moteur-de-couleur.md](../../../../packages/couleur/invariants/moteur-de-couleur.md), l'invariant [ecriture.md](../../../../packages/plugin-palettes/invariants/ecriture.md), la [spec de Palettes](../Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md) (sections 5, 7.1, 8.1, 9.4, 11.2, 13.2 et 17.4), et `decisions.json` de `docs/notes/Recherches/Evolutions globales/`.

## 7. Seuils

Un texte tient 4,5:1, un élément graphique (bord, icône, liseret) tient 3:1, et un état désactivé reste hors du jugement. Les minimums `texte` et `nonTexte` de la recette portent déjà ces valeurs par défaut.

## 8. Égalités, marque E et reprise

Deux primitives égales reçoivent le même calcul (section 1), et deux accents partagés reçoivent la même correction dans la proposition 1. La marque E sort des mesures, des dispositions et de la page. La reprise se fait palette par palette, sans geste groupé.

## Le bouton réglé à la main

Le bouton visait des nuances que le mainteneur avait recalculées à la main. Ses rôles en clair sont `main`, `dark` et la nuance la plus claire, au 50, pour le fond de survol du bouton texte. La lissée et la régulière gardent la clarté du 50 et toutes les nuances de marque et plus foncées. Vues par une couleur de marque au 700, les 13 palettes tiennent 190 paires du bouton sur 208 avec chacune des quatre courbes. La commune déplace le 50, de 0,005 dans la palette 1. Le réglage manuel peut être écrasé tant que ses contrastes restent tenus. La page montre, rôle par rôle, la nuance qui bouge et ses contrastes.

Le fond de survol du bouton texte s'écarte du fond de repos de 0,022 à 0,027 en distance OKLab dans la palette 1, à la limite d'un écart visible. Le survol, l'appui et le focus ont le même fond dans l'export, donc un écart nul entre eux, quelle que soit la courbe.

## Ce que la page de preuve montre

`_local/p28/poc/index.html` s'ouvre par un double-clic, sans réseau. Une liste choisit la palette parmi les 19. La barre choisit une à quatre marques sur cette palette, chacune par sa couleur de marque seule (300 à 900) ou par la disposition d'une marque du fichier (marques A à D, sémantiques). Elle règle aussi les nuances foncées, gardées ou recalculées, et la courbe sous le thème sombre.

1. Les nuances. Quatre rangées, l'actuelle et les trois courbes, avec le ◆ des nuances de marque, le point des nuances recalculées, les pas de clarté, l'écart à l'actuelle et les messages de saut, de foncés irréguliers, de palettes égales et d'accents partagés.
2. Le sombre. Les deux propositions en trois lignes, côte à côte, puis les accents actuels, corrigés et recalculés, et le message des accents absents.
3. Les composants, marque par marque. Bouton plein, contour et texte dans leurs cinq états, chip, chip sélectionné, tag, badge, toast et encart, rendus par les rôles du client. Sept colonnes, quatre courbes en clair et les trois traitements en sombre. Chaque paire porte son contraste en vert ou en rouge, et chaque colonne le compte des paires tenues. Suivent l'écart entre les états et un tableau des rôles qui bougent, ceux du bouton surlignés.
4. Comment lire.

Vérification. `node _local/p28/poc/verifier.mjs` ouvre la page dans Chromium sans tête, parcourt les 19 palettes, ajoute une seconde marque et passe les foncés en « Recalculées ». Il relève 0 erreur, 0 requête réseau, et aucun défilement horizontal de la page à 390 px de large. `node _local/p28/poc/capturer.mjs` capture une palette vue par une ou plusieurs marques, et `node _local/p28/poc/bilan.mjs` compte les paires tenues sur les 13 palettes de marque.

## Questions au mainteneur

| Question | Options | Recommandation |
|---|---|---|
| Q1. Quelle courbe proposer en premier au lead UX ? | Lissée, commune, régulière | Lissée, qui gagne 10 paires au 700 sans rompre l'ordre ; le lead UX choisit sur la page. |
| Q2. Quel traitement du sombre ? | Proposition 1, proposition 2 | Proposition 1, qui change quatre accents. |
| Q3. Quel modèle du contraste attendu ? | Table de la recette, description des primitives, description dans la couche des marques, marqueurs renommés, document | Table de la recette, écrite par Palettes dans la description des primitives. |
| Q4. Palettes peut-il écrire la description d'une variable primitive ? | Oui, écriture nouvelle inscrite dans `ecriture.md` ; non, la table reste dans Palettes | Oui. |
| Q5. Où s'active l'échelle imposée ? | Dans la Configuration, pour toutes les palettes reprises ; palette par palette, comme un quatrième modèle | Dans la Configuration, désactivation par figement. |
| Q6. Comment le designer connaît-il les nuances de marque d'une primitive ? | Lecture manuelle de la couche des marques ; liste fournie par le mainteneur dans la recette de Figma ; lecture par un outil dans le fichier client | Lecture manuelle, guidée par la recette de Figma, car aucun outil ne lit les alias d'une bibliothèque distante aujourd'hui. |
| Q7. Le premier passage sur une copie, par l'échange de bibliothèque de Figma, convient-il ? | Copie des deux fichiers ; copie du seul fichier des primitives | Copie des deux fichiers, pour que le fichier client réel ne reçoive aucune mise à jour. |
| Q8. Faut-il le geste « Rétablir les couleurs d'avant » ? | Oui, couleurs lues gardées dans la recette ; non, l'historique de Figma suffit | Oui. |
| Q9. Les nuances foncées irrégulières se recalculent-elles d'office ? | D'office ; au choix du designer, décoché ; jamais | Au choix du designer, décoché. |
| Q10. Que faire des `a300` et `a900` absents de cinq primitives ? | Lire à la main leur cible dans la couche des marques ; les créer dans les primitives et re-viser les alias à la main | Les lire à la main d'abord ; décider ensuite palette par palette. |
| Q11. Les paires que la structure pose en sombre (bord du bouton survolé, badge, encart) entrent-elles dans la table ? | Oui, jugées par Palettes ; non, signalées au mainteneur comme corrections manuelles de l'architecture | Non, parce que le calcul d'une palette ne les répare pas. |
| Q12. Deux primitives égales se lient-elles dans la recette ? | Lien qui impose le même calcul ; message quand elles divergent | Message, sans lien. |

## Réponses du mainteneur

| Question | Réponse | Conséquence |
|---|---|---|
| Q1 | Lissée. | La page de preuve ouvre sur la lissée. |
| Q2 | Proposition 1. La page de preuve propose la valeur des `a300` et `a900` absents. Leur création et le raccordement de la couche des marques se font à la main. | Palettes ne crée aucune variable. |
| Q5 | UCM Palettes est agnostique par défaut et calcule l'échelle imposée. Le mode Full UCM s'active dans la Configuration et rend l'interface et les calculs actuels du moteur. | La section 6 s'inverse. La décision « seul l'Exporter est agnostique » tombe pour Palettes. Une recette rangée par une version antérieure se lit en Full UCM, pour qu'un fichier existant ne change pas de calcul. |
| Q6 | La case « Couleur de marque » se juge sur les maquettes de l'étape 2. | Le relevé des alias donne les nuances à cocher. |
| Q7 | Copie du seul fichier des primitives. | L'essai montre les nouvelles palettes dans la copie. Le fichier client réel n'est pas touché. |
| Q8 | Oui. | Le geste « Rétablir les couleurs d'avant » entre dans les lots. |
| Q9 | D'office. | Les nuances foncées irrégulières se recalculent sans case à cocher. Un message le dit. |
| Q11 | Pas dans Palettes. | La page de preuve reçoit une section « À corriger dans les composants » : chaque paire, son contraste, son composant. |
| Q12 | Sans gravité. | Un message, sans lien. |

Q3 attend le sens des marqueurs, que le mainteneur demande au lead UX. Q4 suit Q3. Q10 attend le relevé des alias : un plugin de lecture seule, dans `_local/p28/releve-alias/`, que le mainteneur lance une fois dans le fichier client.

Les alias de la couche des marques valent `null` dans l'export d'octobre parce que l'Exporter n'indexe que les variables du fichier exporté. Un alias qui vise une variable d'une autre bibliothèque n'a pas de chemin, et `exportTokens.ts` écrit `$value: null`. La donnée existe dans Figma : UCM Architect lit ces cibles par leur identifiant (`catalogue.ts`).
