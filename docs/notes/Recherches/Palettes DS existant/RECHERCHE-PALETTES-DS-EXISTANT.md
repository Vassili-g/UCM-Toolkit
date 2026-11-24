# Palettes DS existant

Piste P28. Les 19 palettes primitives du client se mesurent maintenant. Leurs clairs progressent en moyenne comme ceux de MUI, mais d'une palette à l'autre le premier pas va de 0,007 à 0,118 de clarté, et 7 palettes sur 19 font leur plus grand pas entre le 50 et le 100. Un recalcul qui garde le cran d'ancrage et les crans plus foncés rend les clairs progressifs sans toucher aux pleins ni aux textes. Une seule correspondance entre un cran de marque et une primitive est exacte. La recommandation est une évolution limitée d'UCM Palettes, une « échelle imposée » écrite dans les variables existantes par la reprise, précédée d'un choix des crans d'ancrage et de la courbe avec le lead UX.

## 1. La demande

Le lead UX d'un client demande deux choses pour les palettes de couleur de son design system. Les contrastes doivent être garantis par le calcul. Les tons clairs doivent progresser plus régulièrement. L'architecture des tokens ne change pas, ou de façon minime. La base des palettes suit MUI et en a divergé. Le mainteneur a recalculé à la main les crans du Button pour que ses contrastes passent.

Le mainteneur a ouvert une option. UCM Palettes peut ne plus être seulement full UCM, et choisir dans sa configuration un mode de calcul et d'interface. Ce n'est pas une obligation. La section 8 la compare au script hors plugin.

## 2. La donnée et ses limites

Deux fichiers ignorés par Git portent la donnée.

- L'export de novembre des primitives, dans `_local/p28/`, porte une collection à un mode et 295 couleurs en valeur littérale, toutes opaques. Il range 13 palettes de marque nommées par teinte, 4 palettes sémantiques, deux gris et 21 couleurs isolées ou de visualisation.
- L'export d'octobre du fichier client, dans `docs/notes/Archives/Plugin Architect/1 Architecture globale/Mesures/`, porte la couche des marques et le thème qui l'aliase. 234 de ses 260 primitives valent `null`, sans trace de la variable visée.

Les relevés nominatifs sont dans `_local/p28/`. `diagnostic.mts` mesure les primitives (`diagnostic.txt`, `diagnostic.json`). `correspondances.mjs` et `proches.mts` comparent les deux exports (`correspondances.txt`, `correspondances.json`). `prototype-primitives.mts` recalcule cinq palettes (`prototype-primitives.txt`, `prototype-primitives.json`). `analyse.mjs`, `marqueurs.mjs`, `portee.mjs` et `prototype.mts` portent les relevés de la première version. Ce document nomme les marques A à E dans l'ordre de leurs modes, les palettes primitives « palette 1 » à « palette 13 » dans l'ordre du fichier, et ne donne aucune valeur de couleur du client.

## 3. Diagnostic

### 3.1 La couche des marques

- Chaque marque porte une palette primaire et une palette secondaire ; la marque A porte aussi une palette tertiaire.
- Une palette de marque a dix crans, de 50 à 900, dont deux portent un marqueur `-[dark]` ou `-[light]`, et six accents, `a100`, `a200`, `a300`, `a400`, `a700` et `a900`. La marque B ajoute `a50` à sa palette primaire.
- Quatre palettes sémantiques ont douze crans, de 50 à 1100, sans accent. Le gris a douze crans et un blanc.
- Chaque palette donne au thème huit rôles : les quatre de MUI (`main`, `light`, `dark`, `contrastText`) et quatre rôles propres au client, deux plus clairs que `light`, un intermédiaire et un plus foncé que `dark`.
- En Dark, les rôles des palettes de marque visent les accents. Les marques A à D comptent 60 à 103 alias vers un accent en Dark, et 0 à 9 en Light.
- Dans la palette primaire de la marque A, `main` est au 400, et aucune feuille du thème ne vise les crans 700, 800, 900 ni `a700`.
- Chaque marque A à D vise 21 à 40 fois une primitive d'une autre marque, par le composant de visualisation de données. La marque E le fait 168 fois.

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

Le cran `-[light]` porte `main` dans les 13 palettes du tableau. Sur les 166 paires fond et texte dont le fond est un cran `-[light]`, 164 posent du blanc. Les 84 emplois d'un cran `-[dark]` comme texte sont tous en Dark, sur un fond sombre. Le marqueur nomme donc le contraste attendu : `-[light]` porte un texte clair, `-[dark]` se lit sur un fond sombre ou sous un texte foncé.

### 3.3 Les contrastes du thème

Le thème déclare 376 paires par marque, Light et Dark réunis : 260 textes sur un fond, 88 bordures sur un fond, 16 couples `main` et `contrastText`, et 12 textes courants sur un fond de page. Le Button en porte, par mode, 91 textes sur un fond, dont 14 désactivés, 35 bordures sur un fond, et 6 textes sans fond déclaré. Aucune paire du Button ne se mesure dans les marques A à D, faute des valeurs de la couche des marques. La marque E en mesure 12, dont le texte de la variante `text` secondaire à 1,23 et les 6 bordures de la variante `outlined` à 1,00.

### 3.4 Les primitives

- Les 13 palettes de marque ont chacune dix crans, de 50 à 900, sans marqueur. Une palette nomme son 400 par le numéro suivi d'un suffixe.
- Leurs accents varient de 4 à 6 par palette. Huit palettes portent `a100`, `a200`, `a300`, `a400`, `a700` et `a900` ; une porte `a50`, `a100`, `a200`, `a400`, `a700` et `a800` ; quatre portent seulement `a100`, `a200`, `a400` et `a700`.
- Les 4 sémantiques et les deux gris ont douze crans, de 50 à 1100. Chaque gris ajoute un blanc.
- Aucune palette n'inverse l'ordre des clartés entre deux crans voisins, et aucune ne répète une couleur d'un cran au suivant.
- Les accents de 11 palettes vont du plus clair au plus foncé. Ceux de deux palettes jaunes s'inversent : `a200` est plus clair que `a100`, et `a800` plus clair que `a700` dans l'une d'elles. Les accents d'une palette bleu-vert restent tous plus clairs que son 400 : ils ne forment pas une rampe Dark.
- 19 valeurs sont portées par plusieurs primitives. La palette 13 et le second gris sont égaux sur les dix crans de 50 à 900. Deux palettes jaunes partagent 4 accents, deux palettes violettes en partagent 2, une palette porte la même couleur à son 700 et à un accent, les deux gris ont le même blanc, et deux couleurs de visualisation sont égales.
- La chroma culmine au 400 ou au 500 dans 17 palettes sur 19. La palette 13 et le second gris, presque neutres, culminent au 800. Le premier gris porte une teinte bleue faible.

### 3.5 La progression des clairs

| Palette | Teinte | 50 à 100 | 100 à 200 | 200 à 300 | Plus grand pas |
|---|---|---|---|---|---|
| Palette 1 | rouge | 0,103 | 0,074 | 0,073 | premier |
| Palette 2 | bleu-vert | 0,110 | 0,081 | 0,063 | premier |
| Palette 3 | bleue | 0,079 | 0,116 | 0,075 | deuxième |
| Palette 4 | bleu-vert | 0,063 | 0,040 | 0,066 | troisième |
| Palette 5 | bleue | 0,075 | 0,105 | 0,069 | deuxième |
| Palette 6 | bleue | 0,060 | 0,041 | 0,055 | premier |
| Palette 7 | jaune | 0,039 | 0,049 | 0,064 | troisième, pas croissants |
| Palette 8 | violette | 0,088 | 0,142 | 0,091 | deuxième |
| Palette 9 | rouge | 0,044 | 0,118 | 0,118 | deuxième |
| Palette 10 | violette | 0,029 | 0,120 | 0,119 | deuxième |
| Palette 11 | jaune | 0,008 | 0,011 | 0,008 | deuxième |
| Palette 12 | jaune | 0,053 | 0,056 | 0,069 | troisième, pas croissants |
| Palette 13 | grise | 0,007 | 0,025 | 0,030 | troisième, pas croissants |
| Succès | verte | 0,048 | 0,027 | 0,041 | premier |
| Information | bleue | 0,118 | 0,061 | 0,051 | premier |
| Avertissement | orange | 0,073 | 0,051 | 0,039 | premier |
| Erreur | rouge | 0,082 | 0,045 | 0,059 | premier |
| Premier gris | grise | 0,071 | 0,086 | 0,089 | troisième, pas croissants |
| Second gris | grise | 0,007 | 0,025 | 0,030 | troisième, pas croissants |
| Moyenne des 13 marques | | 0,058 | 0,075 | 0,069 | |
| MUI, moyenne de 8 teintes | | 0,065 | 0,076 | 0,073 | |
| Courbe commune d'UCM | | 0,025 | 0,045 | 0,060 | croissants |

Les pas sont des écarts de clarté OKLCH entre crans voisins. En moyenne, les palettes de marque suivent MUI à 0,007 près. Le défaut est la dispersion : un même pas va de 0,007 à 0,142 d'une palette à l'autre. Les 4 sémantiques et 3 palettes de marque font leur plus grand pas entre le 50 et le 100, ce qui isole le 50 des autres clairs. Les palettes 9 et 10 font des pas de 0,118 à 0,120 entre 100 et 300, soit le double de la courbe d'UCM. La palette 11 a ses quatre premiers crans à moins de 0,03 de clarté les uns des autres : ses clairs se distinguent à peine. Seules 5 palettes sur 19 ont des pas croissants, comme la courbe d'UCM.

### 3.6 Les contrastes des primitives

| Premier cran où le blanc atteint 4,5 | Palettes de marque | Sémantiques et gris |
|---|---|---|
| 400 | 8, 9, 10 | |
| 500 | 3, 5 | |
| 600 | 1, 12, 13 | erreur, les deux gris |
| 700 | 2, 4 | succès |
| 800 | 6, 7, 11 | information, avertissement |

Dans 18 palettes sur 19, chaque cran tient 4,5 avec le blanc ou avec le gris le plus foncé, le 1100 du premier gris. La palette 1 fait exception. Son 500, cran de chroma maximale, porte le blanc à 4,38 et ce gris à 4,47.

Le tableau dit ce qu'une marque demande à sa primitive, sans connaître la correspondance. Une palette de marque dont `main` est au 400 et porte un texte blanc ne tient 4,5 qu'avec les palettes 8, 9 ou 10. C'est le cas de la palette primaire et de la palette tertiaire de la marque A. `main` au 700 manque 4,5 avec les palettes 6, 7 et 11 ; `main` au 800 le tient avec les 13. Si la couche des marques vise la sémantique de même nom, ce que l'export ne montre pas, les quatre `main` sémantiques tiennent le blanc à 4,5, et les quatre crans `-[dark]` tiennent le gris foncé à 4,5.

### 3.7 Les écarts à MUI

| Point | MUI | Client |
|---|---|---|
| Crans d'une couleur | 50 à 900, puis A100, A200, A400, A700 | 50 à 900, puis 4 à 6 accents, dont `a50`, `a300`, `a800` et `a900`, absents de MUI |
| Palettes sémantiques et gris | 50 à 900 | 50 à 1100 |
| Rôles d'une palette | 4 | 8 |
| `main` en Light | 700 pour le bleu primaire par défaut, 500 pour le violet secondaire | 400 à 800 selon la palette |
| Rôles en Dark | les crans 50 à 400 de la même couleur | les accents |
| Texte sur `main` | `getContrastText` choisit le blanc dès 3:1 (`contrastThreshold = 3`) | blanc pour toutes les palettes de marque et sémantiques |

Le seuil de 3:1 de MUI explique une partie des échecs. Le blanc n'atteint 4,5 qu'à partir du 700 pour le bleu, le rouge et le teal de MUI, du 800 pour le vert, du 600 pour le gris, et jamais pour l'orange. Source : `createPalette.js` du dépôt `mui/material-ui`, et les rampes publiques de `@mui/material/colors`.

## 4. Correspondances des marques aux primitives

Une correspondance s'établit seulement quand une valeur littérale de l'export d'octobre égale une seule primitive, composante par composante. L'export d'octobre porte 26 primitives en valeur littérale : 17 crans de la marque E et 9 couleurs isolées.

- Le 900 de la palette primaire de la marque E est le 900 de la palette 5. C'est la seule correspondance exacte.
- Les 16 autres crans de la marque E n'égalent aucune primitive. Le 700 et le 800 de sa palette primaire s'écartent de la primitive la plus proche de 0,042 et 0,037 en distance OKLab. Les crans de sa palette secondaire s'en écartent de 0,048 à 0,087.
- Les 9 couleurs isolées n'égalent aucune primitive.
- Les marques A à D n'ont aucune valeur littérale dans la couche des marques. Leurs correspondances sont toutes inconnues.

Le thème porte aussi des valeurs littérales. Elles relient un rôle du thème à une primitive, pas un cran de marque, et n'établissent donc aucune correspondance. En mode E, cinq rôles Light de la palette primaire égalent exactement les crans 50, 100, 200, 400 et 900 de la palette 5 ; 49 rôles égalent le blanc, que les deux gris portent ; 24 n'égalent aucune primitive. Dans les marques A à D, aucun rôle littéral n'égale une seule primitive.

Reste inconnue la primitive que visent 227 crans de la couche des marques : les 139 des marques A à D, 27 des 28 de la marque E, et les 61 crans sémantiques et gris. Un export qui publie la bibliothèque des primitives avec le fichier client, ou la couche des marques avec ses alias, le donnerait.

## 5. Ce que le moteur calcule, ce qui manque

| Besoin du client | Le moteur et Palettes aujourd'hui | Manque |
|---|---|---|
| Crans 50 à 900 des palettes de marque | Une palette libre accepte 4 à 13 multiples de 50, de 50 à 1050 (`BORNES_DES_CRANS_LIBRES`, kit). La liste du client passe. | Rien pour la liste |
| Crans 50 à 1100 des sémantiques et des gris | `validerRecette` refuse la liste par la règle `crans-libres-numeros`. La reprise d'une telle palette suit alors la liste commune, et seules les nuances communes s'écrivent : le 1100 reste hors du calcul. | Une borne à 1100 |
| Cran au nom suivi d'un suffixe | La détection des palettes du fichier exige un dernier segment numérique (`/^\d+$/`, `src/variables/detection.ts`) : la palette perd ce cran. Un renommage garde déjà un suffixe placé après le numéro. | La lecture d'un numéro suivi d'un suffixe |
| Accents en liste variable | Aucun nom de cran non numérique. Les accents forment un groupe que la détection écarte. | Des crans nommés, ou les laisser hors du calcul |
| Cran d'ancrage | La référence s'ancre au cran de clarté la plus proche (`ancrageDe`). Le prototype mesure le décalage : la palette 1 s'ancre au 600 au lieu du 500, la palette 8 au 700 au lieu du 500. | Un cran d'ancrage imposé par palette |
| Crans plus foncés que l'ancrage inchangés | Une palette est calculée en entier, ou figée en entier (`figees`, [VAR-13]). | Des crans gardés dans une palette calculée |
| Courbe des clairs | Une palette libre suit les courbes communes (`grilleDe`) ; le 50, le 100 et le 200 y ont la clarté de la courbe (`POIDS_DES_CRANS_COMMUNS`). | Une courbe qui garde le 50 et l'ancrage du client |
| Table de paires du client | Les garanties G1 à G9 jugent la table `solid`, `surface`, `page` d'UCM. Une palette libre n'a ni garantie ni correction des textes. `contraste` juge n'importe quelle paire. | Une table de paires fournie par la configuration, et son jugement |
| Teinte et chroma | `teinteA`, `fabriquerCran`, l'enveloppe et la dérive Tailwind. | Rien |
| Écriture dans les variables existantes | La reprise garde les identifiants des variables, donc les alias du thème. Une collection à un seul mode n'écrit que le thème Light. | Voir la section 8 |

## 6. Prototype

`_local/p28/prototype-primitives.mts` recalcule cinq palettes : la palette 6, claire, la palette 1, moyenne, la palette 8, foncée, la sémantique information et le premier gris. Le cran d'ancrage garde ses octets, et les crans plus foncés gardent les leurs. Seuls les crans plus clairs que l'ancrage se recalculent, avec la teinte de `teinteA` et la chroma de `fabriquerCran`, sur l'une de deux courbes.

- La courbe d'UCM place le 50, le 100, le 200 et le 300 à la clarté de la courbe commune, puis répartit les crans entre le 300 et l'ancrage dans ses proportions.
- La courbe lissée garde la clarté du 50 et celle de l'ancrage, et place chaque cran entre eux à la place que la courbe d'UCM lui donne. Elle a la forme de la courbe d'UCM et les bouts du client.

Le cran d'ancrage est une hypothèse du prototype : le cran de chroma maximale, le 400 de la palette 6 et le 500 des quatre autres. La couleur de marque de chaque primitive n'est pas connue.

| Pas des clairs (50 à 100, 100 à 200, 200 à 300) | Actuels | Courbe d'UCM | Courbe lissée |
|---|---|---|---|
| Palette 6, ancrage au 400 | 0,060 0,041 0,055 | 0,025 0,044 0,060 | 0,024 0,040 0,055 |
| Palette 1, ancrage au 500 | 0,103 0,074 0,073 | 0,025 0,045 0,060 | 0,032 0,056 0,073 |
| Palette 8, ancrage au 500 | 0,088 0,142 0,091 | 0,025 0,046 0,060 | 0,039 0,071 0,096 |
| Information, ancrage au 500 | 0,118 0,061 0,051 | 0,025 0,045 0,061 | 0,024 0,042 0,055 |
| Premier gris, ancrage au 500 | 0,071 0,086 0,089 | 0,024 0,046 0,059 | 0,030 0,054 0,072 |

| Mesure | Palette 6 | Palette 1 | Palette 8 | Information | Premier gris |
|---|---|---|---|---|---|
| Crans changés de plus de 0,02 (UCM, lissée, moteur tel quel) | 3, 3, 8 | 4, 4, 9 | 4, 4, 9 | 4, 4, refusé | 4, 4, refusé |
| Distance OKLab maximale (UCM, lissée, moteur tel quel) | 0,031, 0,038, 0,111 | 0,144, 0,113, 0,144 | 0,206, 0,127, 0,206 | 0,135, 0,136, refusé | 0,110, 0,089, refusé |
| Blanc sur l'ancrage, inchangé (moteur tel quel) | 1,91 (1,91) | 4,38 (3,30) | 6,71 (3,09) | 2,76 | 3,78 |
| Ancrage sur le 100 (actuel, UCM, lissée) | 1,53, 1,67, 1,70 | 2,95, 3,76, 3,74 | 4,67, 5,80, 5,46 | 1,79, 2,39, 2,37 | 2,91, 3,28, 3,28 |
| Gris foncé sur le 300 (actuel, UCM, lissée) | 11,78, 12,65, 13,29 | 7,58, 11,83, 10,77 | 5,81, 12,03, 9,08 | 8,70, 12,24, 12,50 | 8,37, 12,22, 11,39 |
| Cran sous l'ancrage sur blanc, seuil 3 (actuel, UCM, lissée) | 1,66, 1,55, 1,47 | 3,49, 2,59, 2,74 | 4,70, 3,08, 3,65 | 2,52, 2,05, 2,03 | 3,06, 2,37, 2,48 |

Les deux courbes ramènent le premier pas entre 0,024 et 0,039, et gardent l'ordre des clartés dans les cinq palettes. La courbe lissée change moins que la courbe d'UCM dans les palettes moyenne et foncée, parce qu'elle garde le 50. Elle laisse des pas plus grands au milieu : 0,134 et 0,142 entre le 300 et l'ancrage de la palette 8. La distance OKLab de 0,02 sert ici de seuil d'écart visible.

Le moteur tel quel, en palette libre, déplace l'ancrage de la palette 1 et de la palette 8, recalcule 8 ou 9 crans sur 10, et fait tomber le blanc sur l'ancrage à 3,30 et 3,09. Il refuse la liste de 50 à 1100.

Un composant verrait ceci changer.

- Un token qui vise l'ancrage ou un cran plus foncé ne change pas : pleins, textes colorés, survols et appuis des variantes `contained` gardent leur couleur et leurs contrastes.
- Un token qui vise un cran entre le 100 et le cran sous l'ancrage s'éclaircit. Ce sont les fonds clairs, le rôle `light` au 200, les fonds d'alerte des sémantiques et les rôles plus clairs que `light`. Dans la palette 8, le 300 s'éclaircit de 0,114 de clarté avec la courbe lissée.
- Le texte posé sur ces clairs gagne du contraste : le gris foncé sur le 300 passe de 5,81 à 9,08 dans la palette 8.
- Une bordure posée sur le cran sous l'ancrage perd du contraste sur le blanc. Elle passe sous 3 dans la palette 1 et le premier gris.
- Le blanc sur l'ancrage ne change pas. Il reste sous 4,5 dans la palette 6, la palette 1, l'information et le premier gris : le calcul des clairs ne répare pas un ancrage trop clair pour un texte blanc.

## 7. Options, par ampleur du changement

Les primitives sont rangées par teinte, et une marque les vise par la couche des marques. Un recalcul d'une primitive change donc chaque marque qui la vise, et le composant de visualisation de données des autres marques qui l'emprunte. Une seule de ces liaisons est connue : la marque E vise le 900 de la palette 5.

### (a) Valeurs des primitives seules

- Tokens : les valeurs des crans recalculés changent ; noms et identifiants restent.
- Alias : aucun ne change.
- Composants : un token qui se résout vers un cran recalculé change de rendu, dans chaque marque qui vise la palette.
- Geste dans Figma : écrire les valeurs dans la collection des primitives, publier la bibliothèque si le fichier client la consomme, accepter la mise à jour dans le fichier client.
- Risque : les clairs bougent jusqu'à 0,206 en distance OKLab dans la palette 8. Les égalités entre primitives se rompent si une seule des deux palettes se recalcule : la palette 13 et le second gris, les accents partagés.
- Limite : un ancrage qui porte un texte blanc sous 4,5 le reste.

### (a') Alias de la couche des marques seuls

- Tokens : aucune valeur ne change ; un cran de marque vise un autre cran de sa primitive.
- Alias : ceux des crans de marque re-visés, dans le mode de leur marque.
- Composants : un token qui se résout vers un cran re-visé prend la couleur du nouveau cran, dans cette marque seule.
- Geste dans Figma : changer l'alias de chaque cran dans la couche des marques. Aucun outil d'UCM ne le fait aujourd'hui.
- Risque : `main` re-visé vers un cran plus foncé change la couleur de marque affichée. Un cran `-[light]` qui vise un cran plus foncé garde son nom et son marqueur, qui ne disent plus son cran.
- Limite : cette option répare un contraste quand un cran existant le tient. Elle ne crée aucun ton : elle ne rend pas les clairs progressifs. Elle ne se mesure pas aujourd'hui, faute des alias.

### (b) Changement minime

- Déplacer `main` d'une palette vers un cran plus foncé. Dans la palette primaire de la marque A, 34 feuilles du thème se résolvent vers le 400 : 25 passent par `main`, et 9 l'aliasent directement, dont 8 tokens de composants.
- Déplacer un marqueur. Le geste renomme deux variables de la couche des marques. Figma garde leurs identifiants et leurs liaisons ; le nom publié change, et un code qui le lit casse.
- Ajouter un cran, un 150 ou un 250, pour adoucir les clairs. Le geste crée une variable primitive sans changer d'alias. Le cran sort de l'échelle de MUI.
- Ajuster de quelques millièmes de clarté l'ancrage d'une palette où le blanc manque 4,5 de peu : le 500 de la palette 1 est à 4,38. La couleur de marque change, ce que le lead UX décide.

### (c) Plus que minime

- Une rampe Dark propre à chaque palette remplace les accents ; tous les rôles Dark des palettes de marque se re-visent, soit 60 à 103 alias par marque.
- La table `solid`, `surface`, `page` d'UCM remplace les rôles de MUI. C'est une migration vers full UCM, hors de la demande.

## 8. L'outil

### Script hors plugin

Un script lit une configuration et appelle le moteur, comme `prototype-primitives.mts`. La configuration donne pour chaque palette son cran d'ancrage, la courbe des clairs et les paires à tenir. Le script rend la valeur de chaque cran et un rapport des pas et des contrastes.

- Avantage : aucun changement du produit, et la mesure est faite en une journée.
- Limite : le script ne sait pas écrire dans Figma. Les valeurs arrivent dans le fichier par une saisie à la main, de 76 couleurs si seuls les clairs changent avec l'ancrage du prototype, de 202 si tous les crans changent, ou par un outil d'import de variables étranger à UCM. Les deux sont des gestes manuels non discutés.
- Limite : la configuration du client vit dans `_local/` et n'est relue par aucun test. Le prochain recalcul repart d'un script que personne ne maintient.

### Évolution d'UCM Palettes : l'échelle imposée

UCM Palettes recevrait une seconde architecture de référence, limitée aux primitives : l'échelle imposée. Elle étend la palette libre, qui ne lit déjà ni la table des dossiers ni les garanties G1 à G9. Elle lit l'échelle du fichier.

Ce que la configuration choisit :

- l'architecture de référence du fichier : full UCM, ou échelle imposée ;
- la liste des crans de chaque palette, lue dans le fichier : 50 à 900, ou 50 à 1100 ;
- les accents : hors du calcul, lus et montrés tels quels ;
- le cran d'ancrage de chaque palette, proposé au cran de chroma maximale et choisi par le designer ;
- les crans plus foncés que l'ancrage : gardés, ou recalculés ;
- la courbe des clairs : actuelle, lissée, ou courbe d'UCM ;
- les paires de contraste à tenir : un fond (un cran), un texte (un cran, le blanc ou le gris foncé) et un seuil, 4,5 pour un texte et 3 pour une bordure.

Ce mode n'est pas un préréglage de paramètres. La liste des crans et les seuils sont des paramètres. L'ancrage imposé, les crans gardés, la courbe lissée et la table de paires sont des calculs nouveaux.

| Changement | Où | Raison, rattachée à la demande |
|---|---|---|
| Borne des listes libres portée à 1100 | `BORNES_DES_CRANS_LIBRES` (kit), donc `NUMEROS_DE_PALETTE` et la nature `palette` que lit UCM Architect | Architecture inchangée : les sémantiques et les gris portent 1000 et 1100 |
| Cran d'ancrage imposé | `ancrageDe`, `rampesDe` | Architecture inchangée : `main` vise un cran fixé, et le moteur tel quel déplace l'ancrage d'un ou deux crans |
| Crans gardés | `rampesDe`, recette | Changement minime : pleins et textes déjà validés ne bougent pas |
| Courbe lissée | `grilleDe` pour cette architecture | Tons clairs plus progressifs |
| Table de paires et son jugement | nouveau module du moteur, sur `contraste` | Contrastes garantis par le calcul |
| Numéro suivi d'un suffixe | `src/variables/detection.ts` | Architecture inchangée : une palette porte un 400 suffixé |
| Format 13 de la recette | `recette.ts`, `classerRecette` | Ranger l'architecture, l'ancrage, les crans gardés, la courbe et les paires |

Une paire manquée ne se corrige pas d'elle-même. Le moteur ne déplace pas un ancrage, couleur de marque du client, et aucune correction automatique ne s'applique sans règle écrite et candidat unique. La paire manquée devient un message, et le designer choisit : accepter, changer l'ancrage, ou retirer la paire.

L'écriture passe par la reprise d'une palette du fichier, en mode `recalculees` ([VAR-13]). Le suivi désigne chaque variable d'origine par son identifiant, et l'écriture remplace sa couleur : les alias de la couche des marques et du thème restent liés. Cette architecture demande quatre garanties de plus, chacune avec son test.

- Aucun renommage. Aujourd'hui une reprise renomme les variables que le plan du lot annonce ; dans l'échelle imposée, le nom écrit est le nom lu.
- Aucune création. Un cran que le fichier ne porte pas ne se crée pas.
- Un nom de palette distinct. `nomDeLaReprise` prend le dernier segment non numérique du chemin, qui est le même pour les 13 palettes de marque.
- Une reprise de toute la collection. Reprendre 19 palettes une à une demande 19 gestes ; un geste « Reprendre les palettes de cette collection » les remplace, à discuter.

La collection des primitives n'a qu'un mode : la reprise y écrit le thème Light seul, ce qui convient. Le refus des collections `theme`, `brands` et `utility` ne s'applique pas, le fichier ne déclarant aucune architecture. Après l'écriture, trois gestes restent hors du plugin, à discuter avec le mainteneur : ouvrir Palettes dans le fichier des primitives, publier sa bibliothèque, accepter la mise à jour dans le fichier client.

Ce que voit le designer, en mots simples :

- dans la configuration, « Échelle de votre design system » à côté de « Échelle UCM » ;
- pour chaque palette, ses nuances actuelles et les nuances proposées côte à côte, la couleur de marque marquée d'un ◆ ;
- « Nuances claires » : « Actuelles », « Plus régulières » ;
- « Garder les nuances foncées » : coché par défaut ;
- « Contrastes à tenir », une ligne par association, par exemple « Texte blanc sur la couleur de marque », avec son résultat ;
- avant l'écriture, la liste des nuances qui changent, et « Les noms de vos couleurs ne changent pas ».

Coût de maintenance. 36 fichiers de `packages/*/src` lisent la table des dossiers, son sens ou les garanties, dont 12 dans le moteur, 6 dans le kit, 17 dans Palettes et 1 dans le hub. L'échelle imposée ne les touche pas, parce qu'elle passe par la branche des palettes libres. Cette branche compte 12 fichiers, qui lisent `estLibre` ou `BORNES_DES_CRANS_LIBRES` : chacun reçoit le cas nouveau. S'y ajoutent la détection, la reprise, le plan des variables, le format 13, une carte de la configuration, les deux catalogues de langue, les tests de chaque changement, une publication du kit pour la borne, et un état de la galerie par écran nouveau. Un mode MUI complet, avec rôles et garanties propres, ajouterait une branche aux 36 fichiers et une seconde source à la table que `tests/referentielUnique.test.ts` garde unique.

Réécritures à faire, sans les faire ici :

- [CONCEPT.md](../../../../CONCEPT.md), section « Les produits et les deux périmètres » : Palettes offre aussi l'échelle imposée, pour ses primitives ;
- `packages/kit/src/referentiel/produits.ts` : ce que Palettes lit et écrit dans cette architecture ;
- `packages/kit/src/referentiel/vocabulaire.ts` : la borne des listes libres ;
- [moteur-de-couleur.md](../../../../packages/couleur/invariants/moteur-de-couleur.md) : l'ancrage au cran de clarté la plus proche, la liste libre de 50 à 1050, la palette libre sans correction ni garantie, la clarté commune des crans clairs, la table unique ;
- [ecriture.md](../../../../packages/plugin-palettes/invariants/ecriture.md) : la règle full UCM, le renommage à la reprise, la création des entrées manquantes ;
- la [spec de Palettes](../Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md), sections 5, 7.1, 8.1, 9.4, 11.2 et 17.4 ;
- `decisions.json` de `docs/notes/Recherches/Evolutions globales/` : la décision des deux périmètres.

## 9. Recommandation

Faire d'abord choisir au lead UX, sur `prototype-primitives.txt` rendu lisible, le cran d'ancrage de chaque primitive et la courbe des clairs. Recommander la courbe lissée, qui change moins que celle d'UCM, et les crans foncés gardés.

Construire ensuite l'échelle imposée dans UCM Palettes, en option (a), plutôt qu'un script. Le script mesure, mais il n'écrit dans Figma que par une saisie à la main de 76 à 202 couleurs. Palettes écrit par identifiant, montre au designer ce qui change et rejoue le calcul. L'échelle imposée coûte une branche dans les 12 fichiers des palettes libres, au lieu des 36 qu'un mode MUI complet toucherait. Garder les accents hors du calcul : la demande ne les vise pas, et leur liste varie.

La table de paires du client demande la couche des marques avec ses alias : sans elle, on ne sait pas quel cran de quelle primitive porte un texte blanc. Demander cet export avant d'écrire la table. Réserver l'option (a') et l'option (b) aux ancrages qui manquent leur paire après le recalcul, en commençant par le 500 de la palette 1 et la palette primaire de la marque A.

## Questions au mainteneur

| Question | Options | Recommandation |
|---|---|---|
| Quelle donnée relie les marques aux primitives ? | Réexport du fichier client avec la bibliothèque publiée ; export de la couche des marques avec ses alias ; relevé à la main | Réexport avec la bibliothèque, après le recalcul du Button : il donne les 227 correspondances inconnues |
| Le fichier des primitives est-il la bibliothèque que le fichier client consomme ? | Oui, une bibliothèque publiée ; non, une copie | À vérifier dans Figma : les gestes de publication en dépendent |
| Quel cran porte la couleur de marque de chaque primitive ? | Cran de chroma maximale ; cran que vise `main` dans la marque qui l'emploie ; choix du lead UX | Proposer le cran de chroma maximale, faire choisir le lead UX |
| Quelle courbe pour les clairs ? | Courbe d'UCM ; courbe lissée, 50 et ancrage gardés ; actuelle | Courbe lissée |
| Les crans plus foncés que l'ancrage changent-ils ? | Gardés ; recalculés | Gardés : pleins et textes validés ne bougent pas |
| Quels seuils tenir ? | 4,5 pour le texte et 3 pour le non-texte, état désactivé exclu ; AAA | 4,5 et 3, désactivé exclu comme le permet WCAG |
| Quel outil ? | Script hors plugin ; échelle imposée dans UCM Palettes ; mode MUI complet | Échelle imposée, le prototype local servant au choix du lead UX |
| Que deviennent les égalités entre primitives ? | Recalculer ensemble la palette 13 et le second gris ; les séparer ; signaler seulement | Les recalculer ensemble, et le dire au lead UX |
| Que faire des accents ? | Hors du calcul ; recalculés sur la courbe Dark du moteur | Hors du calcul : deux palettes ont des accents désordonnés, et une a des accents tous clairs |
| La marque E est-elle une marque livrée ? | Marque livrée ; modèle de démonstration | À demander au lead UX : sa palette secondaire répète une couleur sur 8 crans et n'égale aucune primitive |
| Que promettent les marqueurs ? | `-[light]` porte un texte blanc et `-[dark]` se lit sur fond sombre ; autre convention | Faire confirmer la lecture de la section 3.2 par le lead UX |
| Quels gestes Figma après l'écriture ? | Ouvrir Palettes dans le fichier des primitives, publier, accepter la mise à jour ; autre circuit | À discuter : aucun geste manuel ne se conçoit sans toi |
| Une reprise de toute une collection ? | Un geste pour les 19 palettes ; 19 reprises une à une | Un geste, à discuter |
