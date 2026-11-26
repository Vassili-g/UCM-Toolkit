# Conception de l'échelle imposée

Étape 1 du [plan de P28](./PLAN-P28.md), d'après la [recherche](./RECHERCHE-PALETTES-DS-EXISTANT.md) et ses réponses du mainteneur (section 10).

## La solution retenue

UCM Palettes reçoit une échelle imposée, qui recalcule les palettes primitives d'une bibliothèque simple sans changer leurs noms, leurs liens ni leur liste de nuances. Le designer coche dans chaque palette les nuances qui portent une couleur de marque. Le calcul les garde à l'octet, recalcule les nuances plus claires que la plus claire d'entre elles sur une courbe choisie, et garde les nuances plus foncées tant qu'elles restent ordonnées et régulières. Une nuance recalculée garde la teinte et la part de chroma de la nuance actuelle de même numéro, et seule sa clarté change. Une table de contrastes attendus remplace les marqueurs : Palettes la vérifie, la montre et l'écrit dans la description de chaque variable primitive. Le thème sombre se traite par les accents : un accent qui manque un contraste de la table fonce ou s'éclaircit juste assez. Seule la bibliothèque des primitives change, et la couche des marques et le thème suivent par leurs alias.

Deux faits sont acquis. Les noms et les alias ne changent pas, donc le code en production qui lit les noms publiés ne change pas. Les couleurs isolées, les couleurs de visualisation et les accents qu'aucune paire de la table ne vise restent hors du calcul.

Les chiffres de cette note viennent d'un audit contre le relevé des alias du fichier client (section « Relevé des alias »). Ils portent sur les quatre marques A à D, six familles de composants (bouton, chip, tag, badge, toast, encart) et 696 paires par thème, états désactivés exclus.

La page de preuve est `_local/p28/poc/index.html`, ignorée par Git. Elle se reconstruit par `npx tsx _local/p28/poc/calculer.mts`, qui appelle le moteur de `packages/couleur/src`. Les mesures de cette note viennent de `_local/p28/poc/calcul.txt`, `_local/p28/poc/mesures-dark.txt` et `_local/p28/poc/bilan.txt`.

## Ce qui est générique, ce qui est un réglage du client

L'échelle imposée ne contient aucun choix propre au client. Elle lit dans le fichier la liste des nuances de chaque palette, de 4 à 13 numéros multiples de 50 jusqu'à 1100, un numéro suivi d'un suffixe compris. Elle lit comme accents les variables dont le dernier segment est `a` suivi d'un numéro. La courbe des clairs, le traitement des nuances foncées, le traitement du sombre et les seuils sont des choix de la configuration.

Le client fournit quatre réglages, rangés dans sa recette :

- les nuances de marque de chaque palette ;
- la courbe des clairs ;
- le contraste attendu de chaque nuance et de chaque accent (par exemple « l'accent `a300` porte un texte blanc »), saisi une fois et réutilisé par toutes ses palettes ;
- la proposition retenue pour le sombre.

La correspondance entre une marque et sa primitive se lit dans la couche des marques. Chaque nuance de marque est la cible d'une variable `[Light]`, et une primitive en porte une seconde par une cible au nom suffixé « Brand ». Le relevé des alias l'a établie pour les quatre marques mesurées.

## 1. Plusieurs nuances de marque par primitive

Les nuances de marque se lisent dans la couche des marques. Neuf palettes de marque et les quatre sémantiques en portent une. La palette 6 en porte deux, toutes deux de la marque D. Les palettes 2, 3, 8 et 12 et les deux gris n'en portent aucune et restent telles quelles. Aucune primitive ne porte les nuances de marque de deux marques. `main` vise partout la cible `[Light]` : 400 pour la palette primaire de la marque A, 700 pour les palettes primaires des marques C et D, 800 pour celle de la marque B.

Le designer les désigne dans l'onglet Création. Le détail d'une nuance porte une case « Couleur de marque ». Plusieurs nuances peuvent la porter, et aucune n'est cochée d'avance. Palettes ne peut pas lire le fichier client depuis la bibliothèque des primitives. Le relevé des alias, fait par un plugin local, donne les nuances à cocher.

Le calcul procède ainsi :

- chaque nuance de marque garde ses octets ;
- les nuances plus claires que la plus claire des nuances de marque prennent la clarté de la courbe choisie (section 2), avec la teinte et la part de chroma de la nuance actuelle de même numéro (`fabriquerCran`, sans dérive de teinte ni enveloppe). La dérive de Tailwind tournait les clairs de la palette 7 de 23,5° et le mainteneur l'a refusée. L'écart restant est sous 2° dans les 13 palettes, et la couleur ne sort jamais du gamut sRGB ;
- les nuances entre deux nuances de marque gardent leurs octets ;
- les nuances plus foncées que la plus foncée des nuances de marque gardent leurs octets, sauf dans les cas de la section 3.

La palette 13 et le second gris sont égaux de 50 à 900. La palette 13 porte une nuance de marque, le second gris aucune, donc ils diffèrent après le calcul. Le second gris est le gris de la couche des marques. Palettes signale deux palettes égales avant le calcul et différentes après, sans les lier (Q12).

## 2. Les courbes candidates des clairs

Les quatre courbes placent la clarté OKLCH des nuances plus claires que l'ancrage, la plus claire des nuances de marque. `u(n)` est la clarté de la courbe commune d'UCM au numéro `n` (`PREREGLAGES[13]`), `L50` et `La` les clartés actuelles du 50 et de l'ancrage `a`.

| Courbe | Définition | Ce qu'elle garde |
|---|---|---|
| Actuelle | Les nuances de la bibliothèque. | Tout |
| Lissée | `L(n) = L50 − (u(50) − u(n)) / (u(50) − u(a)) × (L50 − La)` | La clarté du 50 et l'ancrage ; la forme de la courbe d'UCM entre eux |
| Commune | `u(n)` jusqu'au 300, puis `u(300) − (u(300) − u(n)) / (u(300) − u(a)) × (u(300) − La)` jusqu'à l'ancrage | L'ancrage ; le 50 au 300 prennent la même clarté dans toutes les palettes |
| Régulière | `L(rang i) = L50 − i / ia × (L50 − La)`, `ia` étant le rang de l'ancrage | La clarté du 50 et l'ancrage ; des pas égaux entre eux |

Sur les 13 palettes à nuance de marque, aucune courbe ne déplace une nuance de marque. La courbe commune rompt l'ordre des clartés dans la palette 11. La lissée et la régulière ne le rompent jamais.

En clair, les six familles de composants tiennent 645 paires sur 696 aujourd'hui, 644 avec la lissée, 651 avec la commune et 643 avec la régulière. La lissée ne répare aucune paire et en casse 17. La commune en répare 7 et en casse 18. La régulière en casse 26. La lissée et la régulière changent 76 nuances, la commune 87.

Les paires cassées viennent d'une nuance plus claire que la couleur de marque qui porte elle-même un contraste. Le 500 de l'erreur sert de texte sur son 1000 dans le thème sombre (16 paires, de 4,62 à 4,27). Le 400 de la palette 10 porte un texte blanc dans le badge secondaire de la marque A (de 4,56 à 3,10). La courbe ne connaît pas ces emplois. La page de preuve les liste avant tout recalcul.

Le mainteneur a choisi la lissée (Q1). Ce que la lissée apporte est la régularité des clairs, pas des contrastes. Le traitement d'une nuance claire qui porte un contraste est la question QA1.

## 3. Quand les nuances foncées ne sont pas gardées

Les nuances foncées se gardent quand deux conditions tiennent. Le calcul les vérifie, et un message nomme celle qui manque.

- Leur ordre de clarté tient. Aucune des 19 palettes ne l'inverse aujourd'hui.
- Leurs écarts restent réguliers : deux nuances foncées voisines ne sont pas à moins de 0,04 de distance OKLab quand un autre écart foncé dépasse 0,10. Mesurée depuis la plus foncée des nuances de marque, seule la palette 9 manque cette condition : deux voisines à 0,031, un autre écart à 0,131.

Quand la régularité manque, les nuances situées entre la plus foncée des nuances de marque et la dernière nuance, qui garde ses octets, se répartissent selon la courbe d'UCM, d'office (Q9), et un message le dit. Dans la palette 9, les nuances 500 à 800 changent. Les nuances 500 et 600 portent les rôles clairs `dark` et `darker` de la palette primaire de la marque A, qui bougent de 0,040 et 0,088 (question QA2).

Le raccord entre le dernier clair recalculé et l'ancrage relève de la courbe, pas des foncés. Un raccord est un saut quand il dépasse 1,5 fois le pas de la courbe d'UCM au même endroit. La lissée en fait un, dans la palette 9 (0,159 pour un pas de 0,085). La commune en fait deux, dans les palettes 9 et 10. La régulière n'en fait aucun. Le message de saut propose de comparer une autre courbe.

## 4. Le thème sombre et les accents

### Ce que visent les rôles sombres

Les rôles sombres des palettes de marque visent les accents. Les comptes portent sur les feuilles du thème sombre des marques A à D qui passent par le rôle.

| Accent | Rôle sombre | Feuilles |
|---|---|---|
| `a300` | `main` | 92 |
| `a400` | `dark` (survol, appui, focus) | 94 |
| `a200` | `light` et `subtle` | 145 |
| `a900` | `darker` | 79 |
| `a100` | `lighter` | 24 |

La palette secondaire de la marque C, la palette secondaire de la marque A et la palette tertiaire de la marque A s'écartent de ce schéma. La palette primaire de la marque B vise en sombre les accents de la palette 12, par des alias directs du thème. Le rôle `darker` de la palette tertiaire de A vise `a700`. Aucun rôle sombre ne vise un `a300` ou un `a900` absent. Les palettes sémantiques ont sept rôles, sans `subtle`.

Le fond de la page sombre est le second gris au 1000.

### La table du sombre et la proposition retenue

La table des contrastes attendus du sombre réunit trois sortes de paires : un accent porte un texte blanc, un accent se lit en texte sur le fond de la page, un accent se lit en texte sur un autre accent de sa palette. Les accents des palettes 1, 4, 5, 6, 9, 10, 12 et 13 y figurent. Ils tiennent aujourd'hui ses 159 paires.

Proposition retenue (Q2). Un accent garde sa couleur, sauf s'il manque une paire de la table. Il fonce ou s'éclaircit alors juste assez, par pas de 0,001 de clarté, teinte et part de chroma gardées. Aujourd'hui, aucun accent ne change. Aucun nom ni alias ne change.

En sombre, les six familles de composants tiennent 603 paires sur 696 aujourd'hui, et 587 après la lissée et la proposition 1. Les 16 paires perdues viennent de la courbe des clairs (section 2), pas des accents. Les autres échecs sont des paires de structure : bord d'un bouton contour survolé sur le fond, texte gris sur un accent du badge, icône et bord d'encart. Palettes ne les juge pas (Q11), et la page de preuve les liste.

La proposition 2, qui recalculait tous les accents, et une troisième voie, qui re-visait 107 à 124 feuilles sombres par marque vers les clairs recalculés, sont écartées.

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

Ce qui apparaît : les nuances de marque, la table des contrastes attendus, la comparaison des courbes, la carte du sombre, les messages de saut au raccord, de foncés recalculés et de palettes égales.

### Écriture

L'écriture passe par la reprise en mode `recalculees` ([VAR-13]), dans la collection d'origine, mode clair seul. L'échelle imposée ajoute trois garanties, chacune avec son test : aucun renommage, aucune création, et un nom de palette distinct pour chacune des 13 palettes de marque, que `nomDeLaReprise` confond aujourd'hui. Les accents s'écrivent comme les nuances, par identifiant.

Le fichier client n'a pas accepté la dernière mise à jour de sa bibliothèque. Il vise 13 variables absentes du fichier des primitives et en voit 2 autres à une valeur ancienne (section « Relevé des alias »). Accepter cette mise à jour, sur une copie, est la première étape. Une variable supprimée de la bibliothèque demande un nouveau lien dans la couche des marques, geste manuel à décider (questions QA3 et QA4).

Après l'écriture, trois gestes ont lieu dans Figma : ouvrir Palettes dans le fichier des primitives, publier la bibliothèque, accepter la mise à jour dans le fichier client. Le premier passage se fait sur une copie. Le mainteneur duplique le fichier des primitives, le publie comme bibliothèque distincte, et fait viser cette copie par une copie du fichier client, par l'échange de bibliothèque de Figma. Ces gestes sont manuels, et la question 7 les pose.

### Revenir en arrière

Juste après l'écriture, l'annulation de Figma défait toute l'écriture, close par un seul `commitUndo`. Plus tard, la recette garde les couleurs lues à la reprise, et un geste « Rétablir les couleurs d'avant » les réécrit dans les mêmes variables. Ce geste est nouveau. L'historique des versions de Figma reste le recours sans plugin.

Après une publication, une version publiée ne se retire pas. Revenir en arrière consiste à rétablir les couleurs d'avant, publier de nouveau, puis accepter la mise à jour dans le fichier client. Un fichier qui a déjà accepté la version fautive la garde jusqu'à cette nouvelle acceptation.

### Format de la recette

Le format 13 ajoute à la recette le choix de gamme, la courbe des clairs et la table des contrastes attendus. Il ajoute à chaque palette reprise sa liste lue, ses accents lus, ses nuances de marque, son traitement des foncés et sa proposition du sombre, avec les couleurs lues à la reprise. `classerRecette` lit le format 12 en format 13 sans échelle imposée.

### Répercussions

| Lieu | Changement | Raison |
|---|---|---|
| Moteur, module nouveau | Calcul d'une palette en échelle imposée, ses trois courbes avec teinte et part de chroma gardées, les foncés recalculés, la correction des accents par pas de clarté | Points 1, 2, 3 et 4 des réponses |
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

Deux primitives égales se calculent chacune selon leurs nuances de marque, et un message signale qu'elles diffèrent après le calcul (Q12). Aucun accent n'est corrigé aujourd'hui. La marque E sort des mesures, des dispositions et de la page. La reprise se fait palette par palette, sans geste groupé.

## Le bouton réglé à la main

Le bouton visait des nuances que le mainteneur avait recalculées à la main. Ses rôles en clair sont `main`, `dark` et la nuance la plus claire, au 50, pour le fond de survol du bouton texte. La lissée et la régulière gardent le 50 à l'octet. En clair, les boutons tiennent 101 paires sur 111 pour la marque A et 104 sur 111 pour les marques B, C et D, avec la courbe actuelle comme avec la lissée et la régulière. La commune déplace le 50, de 0,005 dans la palette 1, et porte la marque A à 104. Dans la palette 9, les foncés recalculés d'office changent le `dark` de la marque A de 0,040 et son `darker` de 0,088 : le texte blanc du bouton plein survolé passe de 8,53 à 7,24. Le réglage manuel peut être écrasé tant que ses contrastes restent tenus.

Le fond de survol du bouton texte s'écarte du fond de repos de 0,022 en distance OKLab dans la palette 1, à la limite d'un écart visible, et de 0,027 avec la commune. Le survol, l'appui et le focus ont le même fond dans les 168 cas relevés.

## Ce que la page de preuve montre

`_local/p28/poc/index.html` s'ouvre par un double-clic, sans réseau. Une liste choisit la palette parmi les 19, une barre la courbe des clairs, la lissée à l'ouverture. Marques, nuances de marque, rôles et composants viennent du relevé des alias.

1. Le bilan des quatre marques mesurées : paires tenues en clair et en sombre, aujourd'hui et après, réparées et cassées.
2. Les nuances : les quatre courbes, les couleurs de marque lues dans le fichier, les messages de saut, de foncés recalculés d'office et de palettes égales, puis chaque nuance qui change et les rôles qui la visent.
3. Le sombre : les accents actuels et ceux de la proposition 1, les rôles qui les visent, la table tenue.
4. Les composants, marque par marque : chaque composant dont une variable vise la palette, rendu avec les couleurs réelles de ses variables, en clair et en sombre, aujourd'hui et après.
5. À corriger dans les composants : chaque paire en échec après le calcul (161 avec la lissée, dont 144 échouaient déjà), son contraste, son composant et la cause pour chacune de ses deux couleurs, en commençant par les paires que le calcul fait échouer.
6. Les liens du fichier client qui ne suivront pas le recalcul.

Vérification. `node _local/p28/poc/verifier.mjs` relève 0 erreur, 0 requête réseau et aucun défilement horizontal à 390 px. `node _local/p28/poc/bilan.mjs` compte les paires par courbe.

## Questions au mainteneur

| Question | Options | Recommandation |
|---|---|---|
| Q1. Quelle courbe proposer en premier au lead UX ? | Lissée, commune, régulière | Lissée, qui ne rompt jamais l'ordre ; le lead UX choisit sur la page. |
| Q2. Quel traitement du sombre ? | Proposition 1, proposition 2 | Proposition 1, qui ne change un accent que s'il manque une paire de la table. |
| Q3. Quel modèle du contraste attendu ? | Table de la recette, description des primitives, description dans la couche des marques, marqueurs renommés, document | Table de la recette, écrite par Palettes dans la description des primitives. |
| Q4. Palettes peut-il écrire la description d'une variable primitive ? | Oui, écriture nouvelle inscrite dans `ecriture.md` ; non, la table reste dans Palettes | Oui. |
| Q5. Où s'active l'échelle imposée ? | Dans la Configuration, pour toutes les palettes reprises ; palette par palette, comme un quatrième modèle | Dans la Configuration, désactivation par figement. |
| Q6. Comment le designer connaît-il les nuances de marque d'une primitive ? | Lecture manuelle de la couche des marques ; liste fournie par le mainteneur dans la recette de Figma ; lecture par un outil dans le fichier client | Le relevé des alias, par un plugin local, donne les nuances à cocher. Palettes ne lit pas ces alias. |
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
| Q2 | Proposition 1. Une variable nouvelle se raccorde à la main dans la couche des marques. | Palettes ne crée aucune variable. Les `a300` et `a900` absents ne sont visés par aucun rôle (Q10 sans objet), et aucun accent ne change aujourd'hui. |
| Q5 | UCM Palettes est agnostique par défaut et calcule l'échelle imposée. Le mode Full UCM s'active dans la Configuration et rend l'interface et les calculs actuels du moteur. | La section 6 s'inverse. La décision « seul l'Exporter est agnostique » tombe pour Palettes. Une recette rangée par une version antérieure se lit en Full UCM, pour qu'un fichier existant ne change pas de calcul. |
| Q6 | La case « Couleur de marque » se juge sur les maquettes de l'étape 2. | Le relevé des alias donne les nuances à cocher. |
| Q7 | Copie du seul fichier des primitives. | L'essai montre les nouvelles palettes dans la copie. Le fichier client réel n'est pas touché. |
| Q8 | Oui. | Le geste « Rétablir les couleurs d'avant » entre dans les lots. |
| Q9 | D'office. | Les nuances foncées irrégulières se recalculent sans case à cocher. Un message le dit. |
| Q11 | Pas dans Palettes. | La page de preuve reçoit une section « À corriger dans les composants » : chaque paire, son contraste, son composant. |
| Q12 | Sans gravité. | Un message, sans lien. |

Q3 attend le sens des marqueurs, que le mainteneur demande au lead UX. Q4 suit Q3.

### Relevé des alias du fichier client

Un plugin de lecture seule, `_local/p28/releve-alias/`, a relevé les alias du fichier client. La table est dans `_local/p28/correspondances-reelles.txt`.

- Les 234 alias de la couche des marques visent une primitive, et aucun ne reste sans cible.
- Chaque nuance N d'une palette de marque vise la nuance N d'une seule primitive, sauf 7 variables. Deux nuances d'une palette secondaire visent une autre primitive. Un accent vise la nuance 50 d'une autre primitive. Quatre nuances sémantiques visent une seconde palette sémantique.
- Dans la couche des marques, une primitive sert une seule marque mesurée. La palette 5 sert aussi la marque E, dont la couleur de marque est une valeur littérale. Dans le thème, plusieurs primitives servent plusieurs marques, par la visualisation de données et l'IA. La palette 6 porte deux nuances de marque, de la même marque.
- Les accents de la palette primaire de la marque B visent la palette 12, pas la primitive de ses nuances.
- Q10 est sans objet. Aucun rôle sombre ne vise un `a300` ou un `a900` absent. Les marques concernées passent par d'autres accents ou par les accents d'une autre primitive.
- Le thème vise 39 fois une primitive en direct, sans passer par la couche des marques.
- Le fichier des primitives, relevé par le même plugin, est identique à l'export de novembre. La page de preuve calcule donc sur les bonnes valeurs.
- Le fichier client n'est pas synchrone avec cette bibliothèque. 13 de ses cibles n'existent pas dans le fichier des primitives : 3 nuances au nom suffixé, 2 nuances d'une palette absente, 8 nuances d'une palette sémantique absente. 6 cibles y ont une autre valeur. Un recalcul des primitives n'atteindra pas ces 13 alias tant qu'ils visent des variables absentes.
- Chacune des 13 cibles absentes a la valeur exacte d'une variable du fichier des primitives sous un autre nom. Les clés trancheront entre renommage et suppression (QA3). 3 sont des nuances de marque, gardées à l'octet. Le rôle `light` clair de la palette secondaire de la marque C et le rôle `lighter` de l'erreur garderont leur couleur pendant que la lissée change leur nuance. 4 des 6 valeurs différentes sont des copies périmées que garde la marque E, sans effet sur le thème. Les 2 autres touchent le rôle `darker` sombre de la marque A et le rôle `lightest` clair de la marque B.

### Questions de l'audit

| Question | Options | Recommandation |
|---|---|---|
| QA1. La lissée casse 17 paires et n'en répare aucune. Que faire d'une nuance claire qui porte un contraste (le 500 de l'erreur en texte sombre, le 400 de la palette 10 sous du blanc) ? | La protéger : la table la marque et le calcul la garde, comme une couleur de marque ; borner la courbe pour que la paire tienne ; accepter et corriger le composant | La protéger. |
| QA2. Les foncés recalculés d'office de la palette 9 changent les rôles `dark` et `darker` clairs de la marque A. Q9 s'applique-t-elle ici ? | D'office ; garder les foncés qui portent un rôle ; au choix du designer | Garder les foncés qui portent un rôle, et recalculer seulement le 700 et le 800, que rien ne vise. |
| QA3. Faut-il relancer le relevé sur le fichier des primitives pour lire les clés ? | Oui ; non | Oui, avant la copie de Q7. |
| QA4. Faut-il accepter la mise à jour de la bibliothèque dans le fichier client avant tout recalcul ? | Oui, dans une copie ; non | Oui, dans une copie, pour mesurer ce qu'elle change seule. |
| QA5. La table du sombre en trois sortes de paires convient-elle ? | Oui ; ajouter les bords sur le fond de la page | Oui. |
| QA6. Les palettes tertiaires des marques B, C et D ont `main` au second gris 900 et un texte au second gris 1000, à 1,20. Faut-il le signaler au client ? | Oui, hors de P28 ; non | Oui, dans la liste des corrections de composants. |

Les alias de la couche des marques valent `null` dans l'export d'octobre parce que l'Exporter n'indexe que les variables du fichier exporté. Un alias qui vise une variable d'une autre bibliothèque n'a pas de chemin, et `exportTokens.ts` écrit `$value: null`. La donnée existe dans Figma : UCM Architect lit ces cibles par leur identifiant (`catalogue.ts`).
