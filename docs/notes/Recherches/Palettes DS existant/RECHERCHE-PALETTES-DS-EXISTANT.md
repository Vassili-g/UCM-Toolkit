# Palettes DS existant

Piste P28. Le moteur `ucm-couleur` sait calculer les valeurs d'une échelle imposée par le client sans qu'un nom ni un alias change : un script qui compose ses fonctions exportées le prouve sur la seule marque dont l'export porte des valeurs. Le diagnostic chiffré des marques A à D reste à faire, parce que l'export disponible ne porte pas leurs couleurs. La recommandation est un script hors plugin, appliqué d'abord aux valeurs des primitives seules (option a).

## 1. La demande

Le lead UX d'un client demande deux choses pour les palettes de couleur de son design system. Les contrastes doivent être garantis par le calcul. Les tons clairs doivent progresser plus régulièrement. L'architecture des tokens ne change pas, ou de façon minime. La base des palettes suit MUI et en a divergé. Le mainteneur a recalculé à la main les crans du Button pour que ses contrastes passent. UCM Palettes suit l'architecture full UCM et ne s'applique pas tel quel à cette échelle.

## 2. La donnée et ses limites

La source est l'export DTCG au format UCM du fichier client, rangé dans `docs/notes/Archives/Plugin Architect/1 Architecture globale/Mesures/` et ignoré par Git. Il peut précéder les crans du Button que le mainteneur a recalculés.

L'export ne porte pas les couleurs des palettes. 234 des 260 primitives de couleur ont `"$value": null`. [FORMAT.md](../../../format/FORMAT.md) écrit `null` quand un alias vise une variable que le fichier ne publie pas : les primitives du client aliasent donc probablement une bibliothèque ou une collection hors de l'export. Le thème compte 1 236 feuilles de couleur par marque, Light et Dark réunis. Une couleur s'obtient au bout de la chaîne d'alias pour 22, 4, 5 et 3 d'entre elles dans les marques A, B, C et D. La marque E en obtient 173, toutes écrites en valeur littérale dans son mode du thème.

Le diagnostic mesure donc la structure sur les cinq marques, et les couleurs sur la marque E et sur une palette hors marque. Les relevés détaillés, avec les noms réels, sont dans `_local/p28/` (`releve.md`, `releve.json`, `marqueurs.txt`, `prototype.md`), produits par `analyse.mjs`, `marqueurs.mjs`, `portee.mjs` et `prototype.mts`. Ce document nomme les marques A à E dans l'ordre de leurs modes et ne donne aucune valeur de couleur du client.

## 3. Diagnostic

### 3.1 Structure des palettes

- Chaque marque porte une palette primaire et une palette secondaire ; la marque A porte aussi une palette tertiaire.
- Une palette de marque a dix crans, de 50 à 900, dont deux portent un marqueur `-[dark]` ou `-[light]`, et six accents, `a100`, `a200`, `a300`, `a400`, `a700` et `a900`. La marque B ajoute `a50` à sa palette primaire.
- Quatre palettes sémantiques (succès, information, avertissement, erreur) ont douze crans, de 50 à 1100, sans accent. Le gris a douze crans et un blanc.
- Chaque palette donne au thème huit rôles : les quatre de MUI (`main`, `light`, `dark`, `contrastText`) et quatre rôles propres au client, deux plus clairs que `light`, un intermédiaire et un plus foncé que `dark`.
- En Dark, les rôles des palettes de marque visent les accents. Les marques A à D comptent 60 à 103 alias vers un accent en Dark, et 0 à 9 en Light. Les accents tiennent donc lieu de rampe Dark.
- Dans la palette primaire de la marque A, `main` est au 400, et aucune feuille du thème ne vise les crans 700, 800, 900 ni `a700`.
- Chaque marque A à D vise 21 à 40 fois une primitive d'une autre marque, par le composant de visualisation de données. La marque E le fait 168 fois, dont 89 en Dark vers les accents de la marque D.

### 3.2 Les marqueurs

| Palette | `-[dark]` | `-[light]` | `main` en Light | `light` en Light |
|---|---|---|---|---|
| Primaire, marque A | 200 | 400 | 400 | 200 |
| Secondaire, marque A | 200 | 800 | 800 | 200 |
| Tertiaire, marque A | 300 | 400 | 400 | 200 |
| Primaire, marque B | 400 | 800 | 800 | 200 |
| Secondaire, marque B | 400 | 800 | 800 | 200 |
| Primaire, marque C | 300 | 700 | 700 | 200 |
| Secondaire, marque C | 300 | 700 | 700 | 200 |
| Primaire, marque D | 200 | 700 | 700 | 200 |
| Secondaire, marque D | 400 | 800 | 800 | 200 |
| Succès | 500 | 700 | 700 | 500 |
| Information | 400 | 800 | 800 | 400 |
| Avertissement | 500 | 800 | 800 | 500 |
| Erreur | 300 | 600 | 600 | 500 |

Le cran `-[light]` porte `main` dans les 13 palettes du tableau. Sur les 166 paires fond et texte dont le fond est un cran `-[light]`, 164 posent du blanc, une un gris foncé et une un cran `-[dark]`. Aucune paire n'emploie un cran `-[dark]` comme fond. Les 84 emplois d'un cran `-[dark]` comme texte sont tous en Dark : 59 sur un cran 1000, 18 sur le gris 1000, 6 sur un accent `a900` et un sur un cran `-[light]`. Le marqueur nomme donc le contraste attendu : `-[light]` porte un texte clair, `-[dark]` se lit sur un fond sombre ou sous un texte foncé. `light` vise le cran `-[dark]` dans 6 palettes sur 13.

La marque E est la seule où la promesse se mesure. Le blanc atteint 9,54 sur le cran `-[light]` de sa palette primaire, et le noir 15,62 sur le cran `-[dark]` de sa palette secondaire. Le blanc atteint 1,47 sur le cran `-[light]` de sa palette secondaire, qui manque donc sa promesse. Dans cette palette, les crans 500 à 800 ont la même couleur, et les crans 300 et 400 aussi.

### 3.3 Les contrastes

Le thème déclare 376 paires par marque, Light et Dark réunis : 260 textes sur un fond, 88 bordures sur un fond, 16 couples `main` et `contrastText`, et 12 textes courants sur un fond de page. Le Button en porte, par mode, 91 textes sur un fond, dont 14 désactivés, 35 bordures sur un fond, et 6 textes sans fond déclaré.

Aucune paire du Button ne se mesure dans les marques A à D. La marque E en mesure 12, toutes en Light, au survol, au focus et à l'appui. Le texte de la variante `text` primaire atteint 8,89 sur son fond. Le texte de la variante `text` secondaire atteint 1,23, sous le seuil de 4,5. Les 6 bordures de la variante `outlined` valent 1,00, parce qu'elles prennent la couleur du fond.

### 3.4 La progression des clairs

| Pas de clarté OKLCH | 50 à 100 | 100 à 200 | 200 à 300 |
|---|---|---|---|
| Primaire, marque E | 0,075 | 0,105 | non mesuré |
| Secondaire, marque E | 0,043 | −0,001 | 0,041 |
| Palette hors marque | 0,179 | 0,215 | 0,214 |
| MUI, moyenne de 8 teintes | 0,065 | 0,076 | 0,073 |
| Courbe commune d'UCM | 0,025 | 0,045 | 0,060 |

Le 200 de la palette secondaire de la marque E est plus clair que son 100. La palette hors marque fait ensuite des pas de 0,050, 0,014 et 0,084 entre ses crans 300 et 600. La courbe d'UCM resserre les clairs et élargit les pas vers le milieu ; MUI garde des pas de 0,06 à 0,08 sur toute l'échelle.

### 3.5 Les écarts à MUI

| Point | MUI | Client |
|---|---|---|
| Crans d'une couleur | 50 à 900, puis A100, A200, A400, A700 | 50 à 900, puis six accents dont `a300` et `a900`, absents de MUI |
| Palettes sémantiques | 50 à 900 | 50 à 1100 |
| Rôles d'une palette | 4 | 8 |
| `main` en Light | 700 pour le bleu primaire par défaut, 500 pour le violet secondaire | 400 à 800 selon la palette |
| Rôles en Dark | les crans 50 à 400 de la même couleur | les accents |
| Texte sur `main` | `getContrastText` choisit le blanc dès 3:1 (`contrastThreshold = 3`) | blanc pour toutes les palettes de marque et sémantiques |

Le seuil de 3:1 de MUI explique une partie des échecs. Le blanc n'atteint 4,5 qu'à partir du 700 pour le bleu, le rouge et le teal de MUI, du 800 pour le vert, du 600 pour le gris, et jamais pour l'orange. Une palette qui garde `main` au 500 de MUI pose donc un texte blanc sous 4,5 pour 6 teintes sur 8. Source : `createPalette.js` du dépôt `mui/material-ui`, et les rampes publiques de `@mui/material/colors`.

## 4. Ce que le moteur calcule, ce qui manque

| Besoin du client | Le moteur aujourd'hui | Manque |
|---|---|---|
| Crans 50 à 900 | La liste commune porte 11 ou 13 crans, et la recette exige le 950 que la table des dossiers vise (règle `crans-emplois`). Une palette libre accepte 4 à 13 multiples de 50, de 50 à 1050. | La liste commune sans 950, hors full UCM |
| Crans 1000 et 1100 du sémantique et du gris | Le 1100 sort des bornes d'une palette libre. | Une borne plus haute |
| Accents `a100` à `a900` | Aucun nom de cran non numérique. La détection des palettes du fichier exige un dernier segment numérique (`/^\d+$/`, `src/variables/detection.ts`), et écarte donc aussi les crans à marqueur. | Des crans nommés, et leur rampe |
| Marqueurs `-[dark]` et `-[light]` | Un renommage garde le suffixe placé après le numéro (`[VAR-13]`). | Leur lecture comme promesse de contraste |
| Couleur de marque à un cran donné | La référence s'ancre au cran de clarté la plus proche (`rangPorteur`, `ancrageDe`). | Un cran d'ancrage imposé |
| Cibles de contraste par paire | Les garanties G1 à G9 jugent la table `solid`, `surface`, `page` d'UCM. Une palette libre n'a aucune garantie. | Une table de paires fournie par l'appelant |
| Courbe des clairs | Courbes par numéro ; le 50, le 100 et le 200 ont la même clarté dans toutes les palettes (`POIDS_DES_CRANS_COMMUNS`) ; facteur `clairs` de la chroma. | Rien |
| Teinte et chroma | `teinteA`, `fabriquerCran`, l'enveloppe et la dérive Tailwind. | Rien |
| Une rampe pour Light et Dark | Deux rampes par palette, une par thème. | L'écriture de la rampe Dark dans les accents |

`ucm-couleur` exporte `fabriquerCran`, `teinteA`, `enveloppeDe`, `prereglageTailwind`, `partDeChroma` et `contraste`. Un script peut donc fabriquer chaque cran à une clarté qu'il choisit, ancrer la couleur de marque au cran voulu et juger ses propres paires, sans modifier le moteur.

## 5. Prototype

`_local/p28/prototype.mts` calcule la palette primaire de la marque E de trois façons, avec la couleur de son cran 700 pour référence. Le moteur tel quel, en palette libre 50 à 900, ancre cette référence au 800. L'échelle imposée garde la référence exacte au 700, place 50 à 300 sur la courbe commune d'UCM, répartit 400 à 600 entre le 300 et la référence dans les proportions de cette courbe, et place 800 et 900 entre la référence et le 950 d'UCM. Teinte et chroma viennent de `teinteA` et `fabriquerCran`.

| Pas de clarté | 50 à 100 | 100 à 200 | 200 à 300 | 300 à 400 | 400 à 500 | 500 à 600 | 600 à 700 | 700 à 800 | 800 à 900 |
|---|---|---|---|---|---|---|---|---|---|
| Actuelle | 0,075 | 0,105 | non mesuré | non mesuré | non mesuré | non mesuré | non mesuré | 0,079 | 0,064 |
| Échelle imposée | 0,026 | 0,045 | 0,060 | 0,110 | 0,115 | 0,111 | 0,110 | 0,064 | 0,065 |

| Paire | Seuil | Actuelle | Moteur tel quel | Échelle imposée |
|---|---|---|---|---|
| Blanc sur 700, `contained` au repos | 4,5 | 9,54 | 6,10 | 9,54 |
| Blanc sur 800, `contained` au survol | 4,5 | 12,98 | 9,54 | 12,48 |
| Blanc sur 900, `contained` à l'appui | 4,5 | 15,79 | 12,25 | 15,50 |
| 700 sur blanc, `outlined` et `text` | 4,5 | 9,54 | 6,10 | 9,54 |
| 700 sur 50 | 4,5 | 8,87 | 5,67 | 8,87 |
| 700 sur 100 | 4,5 | 7,09 | 5,26 | 8,23 |
| Gris 900 de MUI sur 200, le cran `-[dark]` | 4,5 | 8,49 | 12,13 | 12,13 |
| 200 sur le fond sombre de MUI | 4,5 | 9,88 | 14,11 | 14,11 |

L'échelle imposée garde la référence à l'octet et tient les huit paires. Elle éclaircit le 100 de 0,050 et le 200 de 0,110 : les composants qui emploient ces deux crans changent d'aspect. Ses pas du milieu valent 0,11, contre 0,085 sur la courbe d'UCM, parce que la référence est plus foncée que le 700 de cette courbe. Le prototype ne prouve rien pour les marques A à D, dont les couleurs manquent.

## 6. Options, par ampleur du changement

### (a) Valeurs des primitives seules

- Tokens : les valeurs des primitives recalculées changent ; leurs noms restent.
- Alias : aucun ne change.
- Composants : aucun token ne change ; tout token qui se résout vers une primitive recalculée change de rendu.
- Geste du designer : remplacer les valeurs des variables dans Figma, dans la bibliothèque source si les primitives l'aliasent.
- Risque : les clairs bougent le plus (+0,110 de clarté sur le 200 de la marque E). Les composants de visualisation de données des autres marques bougent avec la palette qu'ils empruntent.
- Outil : le script de la section 7.
- Limite : une palette dont `main` est sur un cran clair ne tient pas son texte blanc sans casser l'ordre des clartés. La palette primaire de la marque A, `main` au 400, est le premier cas à vérifier sur un export récent.

### (b) Changement minime

- Déplacer `main` d'une palette vers un cran plus foncé. Dans la palette primaire de la marque A, 34 feuilles du thème se résolvent vers le 400 : 25 passent par `main`, et 9 l'aliasent directement, dont 8 tokens de composants. Le geste re-vise `main` dans le mode de la marque et ces 8 alias directs.
- Déplacer un marqueur. Le geste renomme deux variables. Figma garde leurs identifiants et leurs liaisons ; le nom publié des deux primitives change, et un code qui le lit casse.
- Ajouter un cran, un 150 ou un 250, pour adoucir les clairs. Le geste crée une variable sans changer d'alias. Le cran sort de l'échelle de MUI.
- Outil : le même script, avec une liste de crans ou un cran d'ancrage changé.

### (c) Plus que minime

- Une rampe Dark propre à chaque palette remplace les accents ; tous les rôles Dark des palettes de marque se re-visent, soit 60 à 103 alias par marque.
- La table `solid`, `surface`, `page` d'UCM remplace les rôles de MUI ; c'est une migration vers full UCM, hors de la demande.

## 7. L'outil

### Script hors plugin

Un script lit une configuration et appelle le moteur. La configuration donne la liste des crans, pour chaque palette sa couleur de marque et son cran d'ancrage, la courbe des clairs, et les paires à tenir avec leur seuil. Le script rend la valeur de chaque cran, et un rapport des contrastes et des pas de clarté contre les valeurs actuelles. Il ne touche à aucun plugin. Il ne contredit pas la décision qui réserve le périmètre agnostique à UCM Exporter. La configuration du client vit dans `_local/` ; une version générique du script, avec un exemple inventé, serait un nouveau fichier suivi et demande l'accord du mainteneur.

### Mode « MUI » dans UCM Palettes

UCM Palettes choisirait dans sa configuration un mode de calcul, full UCM ou MUI. Le mode MUI imposerait l'échelle 50 à 900, les accents et les marqueurs.

- Moteur : un préréglage couvre la liste des crans et les courbes. L'ancrage à un cran imposé, la table des paires de MUI et leur jugement, les crans nommés et la rampe Dark rangée dans les accents sont des calculs nouveaux. Le mode n'est donc pas un simple préréglage.
- Recette : un champ du mode, un format 13 et une étape de `classerRecette` ; `crans-emplois` dépendrait du mode.
- Configuration : le choix du mode ; « Texte des boutons » et les cartes des courbes changent de sens.
- Interface : le vocabulaire des rôles, la carte des garanties, « Quelle nuance pour quel usage » (§9.4 de la spec) et le rapport ont une version par mode.
- Destination : l'écriture passerait par la reprise d'une palette du fichier (`[VAR-13]`), qui garde les identifiants des variables, donc les alias du thème. La détection devrait accepter les accents et les crans à marqueur. Le refus des collections `theme`, `brands` et `utility` (`COUCHES_SANS_PALETTES`) ne s'applique pas, car le fichier du client ne porte pas de déclaration d'architecture.
- Décision : le mainteneur a décidé que seul UCM Exporter est agnostique, en option, et que tout autre outil est full UCM. Un mode MUI n'est pas agnostique ; c'est une seconde architecture de référence, que ni la décision ni les documents ne prévoient. Il faudrait réécrire la phrase « seul l'Exporter l'offre, en option » de [CONCEPT.md](../../../../CONCEPT.md), section « Les produits et les deux périmètres », `packages/kit/src/referentiel/produits.ts`, la règle de la table unique et celle de l'ancrage dans [moteur-de-couleur.md](../../../../packages/couleur/invariants/moteur-de-couleur.md), la règle full UCM de [ecriture.md](../../../../packages/plugin-palettes/invariants/ecriture.md), les sections 5, 9.4 et 11.2 de la [spec de Palettes](../Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md), et `decisions.json`.
- Coût de N modes : 31 fichiers de `packages/*/src` lisent la table des dossiers, son sens ou les garanties, dont 10 dans le moteur, 8 dans le kit et 12 dans Palettes. Chaque mode ajoute une branche à chacun, une seconde source à la table que `tests/referentielUnique.test.ts` garde unique, et un jeu de tests par mode.

## 8. Recommandation

Fournir d'abord un export récent qui porte les couleurs, puis relancer `_local/p28/analyse.mjs` pour mesurer les marques A à D et le Button après le recalcul du mainteneur. Écrire ensuite le script hors plugin et l'appliquer en option (a). Réserver l'option (b) aux palettes où (a) casse l'ordre des clartés, en commençant par la palette primaire de la marque A. Reporter le mode MUI dans UCM Palettes : il demande une seconde architecture de référence et une branche dans 31 fichiers, pour un seul client aujourd'hui. Le reprendre si un second design system issu de MUI le demande, ou si le script sert plusieurs fois.

## Questions au mainteneur

| Question | Options | Recommandation |
|---|---|---|
| Quelle donnée mesure les marques A à D ? | Réexport du fichier client avec la bibliothèque des primitives publiée ; export de la bibliothèque seule ; relevé à la main | Réexport après le recalcul du Button, bibliothèque comprise |
| Où vivent les valeurs des primitives ? | Dans la collection du fichier ; dans une bibliothèque qu'elle aliase | À vérifier dans Figma : le geste de l'option (a) en dépend |
| La marque E est-elle une marque livrée ? | Marque livrée ; modèle de démonstration | À demander au lead UX : ses palettes secondaires répètent quatre crans |
| Que promettent les marqueurs ? | `-[light]` porte un texte blanc et `-[dark]` se lit sur fond sombre ; autre convention | Faire confirmer la lecture de la section 3.2 par le lead UX |
| Quels seuils tenir ? | 4,5 pour le texte et 3 pour le non-texte, état désactivé exclu ; AAA | 4,5 et 3, désactivé exclu comme le permet WCAG |
| Quelle courbe pour les clairs ? | Courbe commune d'UCM, même clarté du 50 au 200 dans toutes les palettes ; clarté actuelle du 50 gardée et pas lissés jusqu'au 300 | À trancher avec le lead UX sur le prototype : la courbe d'UCM éclaircit le 200 de 0,110 |
| Quel outil ? | Script hors plugin ; mode MUI dans UCM Palettes ; le script puis le mode | Le script, le mode seulement à un second client |
| Où ranger le script ? | `_local/p28/` seulement ; script générique suivi dans `packages/couleur/scripts/` avec un exemple inventé | Script générique suivi, configuration du client dans `_local/` ; demande ton accord |
| Le moteur reçoit-il l'ancrage imposé ? | Fonction pure du moteur, avec son test ; calcul dans le script seul | Dans le script d'abord, dans le moteur si le mode MUI vient |
| Que faire de la rampe Dark ? | Recalculer les accents sur la courbe Dark du moteur ; laisser les accents | Mesurer d'abord les accents sur l'export récent |
| Comment le designer reçoit-il les valeurs ? | Tableau à saisir dans Figma ; fichier pour un outil d'import de variables | À discuter : aucun geste manuel ne se conçoit sans toi |
