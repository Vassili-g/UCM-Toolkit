# Texte des boutons en Light et en Dark : dossier de recherche

**Statut :** recherche. Ce dossier réunit les notes de
recette, l'étude préparatoire et la première recherche, puis les décisions
du mainteneur et un second tour de recherche. Il sert de base au futur plan
d'action. Aucun code, aucune recette ni aucun format publié n'est modifié.

La même demande portait sur la place des commandes Light/Dark et Soft/Vivid
du plugin. Ce sujet a son propre
[dossier](../Commandes%20Light-Dark%20et%20Soft-Vivid/DOSSIER-COMMANDES-D-AFFICHAGE.md).

Vocabulaire : le **bouton** est l'emploi `solid` ; le **texte des boutons**,
l'emploi `on-solid` ; le **texte coloré**, l'emploi `text`, posé sur la page
ou sur une surface. Un thème est **inversé** quand le texte des boutons n'a
pas la couleur de sa page : texte blanc en Dark, ou texte noir en Light.

## En bref

**Validé par le mainteneur :**

1. Le texte des boutons est en blanc ou en noir purs.
2. Le choix vaut pour tout le design system, dans les réglages du plugin, un
   choix par thème. Pas de choix par palette.
3. Le bouton reste la nuance 700 dans toutes les palettes et les deux thèmes.
4. Pas de troisième palette, pas de rangée « Bouton » ajoutée au nuancier,
   pas de nuances fabriquées exprès, pas de noir ou blanc automatique.
5. Quand le texte des boutons change, c'est la rampe du thème qui est
   recalculée.

**Ce que le second tour établit :**

- Dans un thème inversé, une même couleur ne peut pas être à la fois le
  bouton et le texte coloré. Blanc et `#121212` ne sont qu'à 18,73:1 l'un de
  l'autre ; il faudrait 20,25:1 pour qu'une couleur intermédiaire tienne
  4,5:1 contre les deux. Aujourd'hui, la 700 est les deux.
- Si le bouton garde la 700, le texte coloré doit donc quitter la 700 dans le
  thème inversé. Recalculer la courbe sans changer la table fait échouer le
  texte coloré, les contours et le focus : 301 paires tenues sur 662.

**Proposition (section 5) :** dans le thème inversé,

- la courbe recalcule les nuances 500 à 800 : 0,45, 0,50, 0,55 et 0,70 en
  Dark, au lieu de 0,49, 0,58, 0,67 et 0,76 ;
- le bouton reste la 700, et ses états vont vers la page : 700, 600, 500, 400 ;
- tout ce qui se pose sur la page monte d'une nuance : texte coloré à 800,
  contour et focus à 700.

Résultat en Dark avec texte blanc, sur 42 rampes : toutes les paires tiennent,
sauf sur la nuance où trois références sur quatorze sont ancrées. Le texte
coloré, les contours et le focus gardent presque leur clarté actuelle ; seul
le bouton change. Le bleu `#2563EB` devient lui-même le bouton Dark, avec un
texte blanc à 5,17:1.

**Décisions attendues :** section 9. La proposition se voit dans la
[maquette du thème inversé](./MAQUETTE-THEME-INVERSE.html).

## 1. La demande

Le mainteneur a créé de nombreuses palettes et juge l'outil très bon. En Dark,
les boutons portent un texte sombre. Le mainteneur pensait à un texte clair et
demande s'il peut le choisir, en Light comme en Dark, et ce que ce choix
coûte, sans rien casser : réglages enregistrés, recettes de format 8, tokens
publiés. La demande est citée en [annexe A](#annexe-a--demande-originale).

## 2. Décisions du mainteneur

Réponses du mainteneur à la [première recherche](./Archives/RECHERCHE-TEXTE-DES-BOUTONS-ET-AFFICHAGE.md)
et à la [maquette](./MAQUETTE-MODES-ET-AFFICHAGE.html).

| Sujet | Décision | Motif donné |
|---|---|---|
| Couleur du texte des boutons | Blanc ou noir purs, plus le gris de la page | — |
| Portée du choix | Tout le design system, dans les réglages du plugin ; une valeur par thème | « C'est le design system entier qui doit choisir » |
| S1, changer seulement le texte | Écartée | Impossible, confirmé par les mesures |
| S2, le bouton prend les couleurs de l'autre thème | Écartée | Un bouton Dark ne peut pas venir de la rampe Light. Le thème Dark doit avoir sa rampe adaptée, recalculée selon la couleur du texte, sans palette supplémentaire |
| Rangée « Bouton » dans le nuancier | Écartée | Pas de troisième palette |
| S3, le bouton descend dans les nuances de son thème | Écartée | Garder une norme commune : la 700 reste le bouton de toutes les palettes |
| S4, des nuances de bouton fabriquées exprès | Écartée | — |
| S5, noir ou blanc automatique | Écartée | Ne peut pas fonctionner dans Figma |
| S6, texte choisi par palette | Écartée | Le choix appartient au design system |

## 3. Pourquoi le texte des boutons est sombre en Dark aujourd'hui

La table des emplois donne `solid: 700`, `text: 700` et `'on-solid': 'fond'`
([`emplois.ts`](../../../../../packages/kit/src/emplois/emplois.ts)). Les
garanties prennent pour texte des boutons le fond du thème
([`promesses.ts`](../../../../../packages/couleur/src/promesses.ts)).

La courbe Dark croît : 0,18 à la 50, 0,67 à la 700, 0,93 à la 950
([`nuances.ts`](../../../../../packages/couleur/src/nuances.ts)). Ainsi un même
numéro donne le même contraste contre la page dans les deux thèmes
([ARCHITECTURE-FINALE, sections 1 et 4](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)).
En Dark, la 700 est claire : son texte doit être sombre. Le comportement suit
le modèle et ne résulte d'aucune erreur.

La règle tient parce que le texte des boutons a la couleur de la page. Le
bouton et le texte coloré se placent alors du même côté, à l'opposé de la
page : la 700 sert aux deux. Les nuances 600 à 950 portent tout le premier
plan, texte coloré, bouton, contour et focus, avec leurs états.

## 4. Ce que « le bouton reste la 700 » impose

### Une couleur ne peut pas être bouton et texte coloré dans un thème inversé

Pour un gris, dont la clarté OKLCH vaut la racine cubique de la luminance :

| Thème | Texte des boutons | Bouton qui porte ce texte à 4,5:1 | Texte coloré lisible sur la page à 4,5:1 | Zone commune |
|---|---|---|---|---|
| Light, page `#F7F7F7` | blanc, normal | clarté ≤ 0,568 | ≤ 0,552 | 0 à 0,552 |
| Light | noir, inversé | ≥ 0,559 | ≤ 0,552 | aucune |
| Dark, page `#121212` | noir, normal | ≥ 0,559 | ≥ 0,587 | 0,587 à 1 |
| Dark | blanc, inversé | ≤ 0,568 | ≥ 0,587 | aucune |

La raison est arithmétique. Une couleur tient 4,5:1 contre deux autres
seulement si ces deux couleurs sont à 4,5² = 20,25:1 l'une de l'autre. Le
blanc et `#121212` sont à 18,73:1 ; le noir et `#F7F7F7`, à 19,60:1. Même une
page noire pure ne laisserait qu'un centième de clarté.

### Recalculer la courbe sans changer la table échoue

Mesure : courbe Dark recalculée pour que 700 à 950 portent du blanc (0,55,
0,48, 0,41, 0,34), table inchangée. 301 paires tenues sur 662, hors nuance
ancrée. Le texte coloré échoue sur la page (pire 3,47:1), sur les surfaces et
sur les cartes ; les contours survolés et appuyés échouent aussi.

Le mainteneur fixe le bouton à la 700. Dans le thème inversé, c'est donc le
texte coloré, et avec lui le contour et le focus, qui doivent quitter la 700.

## 5. Proposition : le thème inversé

### 5.1 La règle

Le texte des boutons se choisit par thème : blanc ou noir. Le thème normal ne
change pas. Dans le thème inversé :

| Emploi | Thème normal (aujourd'hui) | Thème inversé |
|---|---|---|
| Bouton, du repos au 4ᵉ état | 700, 800, 900, 950 : les états s'éloignent de la page | 700, 600, 500, 400 : les états s'éloignent du texte des boutons, donc vont vers la page |
| Texte des boutons | blanc en Light, noir en Dark | noir en Light, blanc en Dark |
| Texte coloré, 4 niveaux | 700, 800, 900, 950 | 800, 900, 950, 950 |
| Contour, 4 niveaux | 600, 700, 800, 900 | 700, 800, 900, 950 |
| Focus | 600 | 700 ; voir la décision 7 |
| Surfaces, carte, contour décoratif | 100 à 400, 50, 300 | inchangés |

Formulation commune : **le bouton est la 700 ; ses états s'éloignent de son
texte ; tout ce qui se pose sur la page reste du côté opposé à la page.**
Dans un thème normal, ces deux côtés coïncident. Dans un thème inversé, ils se
séparent autour de la 700.

### 5.2 La courbe recalculée

Les nuances 50 à 400, 900 et 950 gardent leur clarté. Le script a cherché les
clartés de 500 à 800 qui tiennent toutes les paires avec le plus grand écart
entre deux états du bouton.

| Nuance | 400 | 500 | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|
| Dark, aujourd'hui | 0,40 | 0,49 | 0,58 | 0,67 | 0,76 | 0,85 |
| Dark, texte blanc | 0,40 | **0,45** | **0,50** | **0,55** | **0,70** | 0,85 |
| Light, aujourd'hui | 0,76 | 0,67 | 0,585 | 0,50 | 0,42 | 0,34 |
| Light, texte noir | 0,76 | **0,71** | **0,66** | **0,58** | 0,42 | 0,34 |

Les clartés restent réglables dans les Réglages communs. La courbe reste
monotone ; les accolades du nuancier montrent les états du bouton à gauche de
la 700 et le texte coloré à droite.

### 5.3 Mesures

Protocole : recette par défaut, préréglage Tailwind, quatorze références à
une et deux intensités, soit 42 rampes par thème. Dix-neuf paires par rampe,
seuils 4,5 et 3, texte des boutons en blanc ou noir purs. Une paire qui touche
la nuance où la référence est ancrée se compte à part (section 5.6).

| Cas | Paires tenues, hors nuance ancrée | Échecs sur la nuance ancrée | Plus petit écart entre deux états (ΔEok) | Chroma moyenne du bouton |
|---|---|---|---|---|
| Dark aujourd'hui, texte noir | toutes | aucun | 0,046 | 0,087 |
| Dark, texte blanc, courbe et table actuelles | 516 sur 674 ; le texte des boutons échoue partout | 10 | 0,046 | 0,087 |
| Dark, texte blanc, courbe seule recalculée | 301 sur 662 | 30 | 0,068 | 0,091 |
| **Dark, texte blanc, proposition** | **toutes** | **3 références** | **0,047** | **0,093** |
| Light aujourd'hui, texte blanc | toutes | vert `#16A34A`, contour à 2,92:1, déjà connu | 0,069 | 0,086 |
| Light, texte noir, proposition | toutes | 5 références | 0,046 | 0,094 |

Les états du bouton inversé sont aussi distincts que ceux du Dark actuel.
Ils gardent toute leur chroma : la part des fonds du thème Dark ([MOT-28])
ne s'applique qu'en dessous de la 400. S3 tombait à 0,031 au dernier état.

### 5.4 Ce que voit le designer

Dark, intensité Vivid :

| Référence | Bouton aujourd'hui, texte noir | Bouton proposé, texte blanc | Survol proposé | Texte coloré aujourd'hui → proposé |
|---|---|---|---|---|
| Bleu `#2563EB` | `#5E93F0`, 6,91:1 | `#2563EB` (ancré), 5,17:1 | `#154FE4`, 6,42:1 | `#5E93F0` → `#6C9EF2` |
| Violet `#9333EA` | `#AD73F1`, 6,50:1 | `#9333EA` (ancré), 5,38:1 | `#7E2BCB` | `#AD73F1` → `#B481F2` |
| Vert `#16A34A` | `#16A34A`, 6,37:1 | `#11883D`, 4,55:1 | `#0D7734` | `#16A34A` → `#16A34A` |
| Gris `#737373` | `#959595`, 7,01:1 | `#717171`, 4,88:1 | `#636363` | `#959595` → `#9E9E9E` |
| Jaune `#EAB308` | `#C38905`, 6,90:1 | `#9C6303`, 5,00:1 | `#8C5502` | `#C38905` → `#CD9206` |

Le texte coloré, les contours et le focus restent proches d'aujourd'hui :
texte de 0,67 à 0,70, contour et focus de 0,58 à 0,55. Le bouton Dark d'une
marque bleue ou violette devient sa couleur de référence exacte. Un jaune
donne un bouton ocre : c'est le prix d'un texte blanc sur un jaune, que Radix
résout par un texte sombre propre à ses jaunes.

### 5.5 La garantie 14

La garantie 14 juge le bouton survolé contre la page à 3:1. Dans le thème
inversé, le survol va vers la page.

| Option | Résultat en Dark, texte blanc | Avis |
|---|---|---|
| Juger le survol, comme aujourd'hui | 31 rampes sur 42 ; tenir 42 sur 42 resserre les états à 0,017 ΔEok, à peine visibles | Écartée |
| Juger le bouton au repos | 42 sur 42 en Dark (3,48 à 4,92:1), 42 sur 42 en Light texte noir (3,56 à 5,02:1) | **Recommandée** |
| Ne pas la vérifier, avec une note | Rien à mesurer | Repli |

Le critère WCAG 1.4.11 n'exige ni contraste entre repos et survol, ni bord
contrasté pour un bouton que son texte identifie. Juger le repos garde une
promesse utile : le bouton se détache de la page tant qu'on ne le touche pas.
La première recherche écartait ce choix parce qu'il ne tenait que pour 31
rampes sur 42 sous S2 ; la courbe recalculée le fait tenir partout.

### 5.6 L'ancrage de la référence

Le moteur pose les octets exacts de la référence sur la nuance de clarté la
plus proche ([MOT-17], [`palette.ts`](../../../../../packages/couleur/src/palette.ts)).
Dans le thème inversé, l'écart entre 700 (0,55) et 800 (0,70) attire sur la
700 les références de clarté 0,57 à 0,62 : elles ne portent pas le blanc.

| Thème inversé | Références touchées | Texte des boutons sur la référence |
|---|---|---|
| Dark, texte blanc | rouge `#D94635`, gris `#808080`, terne `#8B8178` | 4,31, 3,95 et 3,81:1 |
| Light, texte noir | `#1E6FD9`, `#2563EB`, `#DC2626`, `#9333EA`, `#737373` | 3,90 à 4,43:1 |

Le moteur connaît déjà ce cas : en Light, le vert `#16A34A` ancré sur la 600
manque la garantie du contour à 2,92:1, et la carte des garanties le dit. La
même question est ouverte dans l'[étude des usages indexés](../../Archi%20Tokens%20Multi-marques/Collection%20usage/README.md).
Options en section 9.

### 5.7 Limites connues

- Le texte coloré n'a que trois nuances au-delà de la 700 : son quatrième
  niveau reprend la 950. Le préréglage à treize nuances lui donnerait la 1000.
- Au repos, le contour et le focus prennent la couleur du bouton. Ils restent
  lisibles : 3:1 tenu sur la page, les surfaces et la carte.
- Le quatrième état du bouton et le quatrième niveau de surface partagent la
  400.
- Une courbe Dark réglée par le designer garde ses valeurs : passer au texte
  blanc propose les clartés 500 à 800 de la section 5.2, et les contrôles de
  la courbe doivent vérifier les nouvelles limites (700 assez sombre pour le
  blanc, 800 assez claire pour le texte coloré).

## 6. Ce que la proposition change, partie par partie

| Partie | Changement | Conséquence pour l'existant |
|---|---|---|
| Recette | Un champ par thème, par exemple `texteDesBoutons: { light: 'blanc', dark: 'noir' }`, et la courbe du thème inversé | Format 9 qui lit le format 8 avec les valeurs normales ; voir plus bas |
| Texte des boutons | Blanc et noir purs au lieu du gris de la page, y compris dans le thème normal | Les contrastes montent : minimum 5,29 → 5,67:1 en Light. Les planches passent « À actualiser » une fois |
| Kit, emplois | La table dépend du thème inversé : niveaux du bouton vers la page, texte, contour et focus d'une nuance plus loin | `@ucm-kit/core/emplois` change de version mineure ; Palettes et `ucm check` lisent la même fonction |
| Moteur, garanties | Paires lues dans la table du thème ; garantie 14 sur le repos dans le thème inversé | L'empreinte de la recette change quand le réglage change |
| Rampes et variables primitives | Les nuances 500 à 800 du thème inversé changent pour toutes les palettes | Gestion signale les variables « À actualiser » ; il faut les réécrire dans Figma. C'est voulu : la rampe est recalculée |
| Planches | Exemples de boutons, accolades et garanties | « À actualiser » par l'empreinte |
| Interface du plugin | « Texte des boutons : Blanc / Noir » sous le fond de chaque thème, carte « Couleurs de fond » des Réglages communs ; nuancier, Interface de test, carte des garanties, rapport et import lisent la table | Tests Chromium sur les quatre combinaisons |
| Architecture, `theme` | `usage` vise `theme`, qui choisit la nuance selon le thème | Les noms de `usage` ne changent pas ; seules des cibles de `theme` changent |
| `ucm check` | Le diagnostic des emplois reconnaît un usage par son chemin | Le contrôle numérique des paires reconnues n'existe pas encore |

### Format de la recette

La recette est en format 8 et `validerRecette` refuse toute clé inconnue
([`recette.ts`](../../../../../packages/couleur/src/recette.ts)).

| Option | Recette rangée en format 8 | Build antérieur | Avis |
|---|---|---|---|
| Format 9, le format 8 se lit avec les valeurs normales | Lue ; seul le blanc et noir purs change les contrastes | Une recette 9 est « future » | Recommandée |
| Format 9 strict | Illisible | Une recette 9 est « future » | Écartée : casse les réglages rangés |
| Clé facultative dans le format 8 | Lue | Une recette qui la porte est refusée | Seulement si aucun build antérieur ne circule |

### Le lien avec l'étude des usages indexés

L'étude parallèle propose des noms sans numéro de nuance, par exemple
`usage.primary.solid-1..4/background` et `/text`, et
`usage.primary.surface-0..4/background`, `/text` et `/border`. La couche
`theme` choisit la nuance de chaque nom selon le thème. La proposition ne
change alors que des cibles de `theme` :

| Nom proposé | Thème normal | Thème inversé |
|---|---|---|
| `solid-1` à `solid-4` / background | 700, 800, 900, 950 | 700, 600, 500, 400 |
| `solid-n` / text | blanc en Light, noir en Dark | noir en Light, blanc en Dark |
| `surface-0` à `surface-4` / text | 700, 700, 800, 900, 950 | 800, 800, 900, 950, 950 |
| `surface-0` à `surface-4` / border | 600, 600, 700, 800, 900 | 700, 700, 800, 900, 950 |
| focus | 600, ou 900 selon la décision 7 | 700, ou 950 selon la décision 7 |

`surface-0` est la carte, nuance 50. Ce nommage reste une proposition de
l'autre étude.

## 7. Commandes Light/Dark et Soft/Vivid

Ce sujet a son [dossier](../Commandes%20Light-Dark%20et%20Soft-Vivid/DOSSIER-COMMANDES-D-AFFICHAGE.md).
La numérotation des sections et des décisions de ce document reste celle que
les autres études citent.

## 8. Solutions écartées

| Solution | Ce qu'elle faisait | Mesure | Décision |
|---|---|---|---|
| S1, changer seulement le texte | Le bouton reste à 700 | 0 sur 168 mesures du texte, par thème | Écartée |
| S2, bouton pris dans l'autre thème | En Dark, le bouton reprend les nuances 700 à 950 du thème Light | 168 sur 168, minimum 5,29:1 | Écartée par le mainteneur |
| S3, bouton descendu dans son thème | Le bouton passe à 500, 400, 300, 200 | 168 sur 168 ; chroma du dernier état 0,031 | Écartée : le bouton doit rester 700 |
| S4, nuances fabriquées exprès | Huit variables de plus par palette | Non mesurée | Écartée |
| S5, noir ou blanc automatique | Le texte suit chaque nuance | Rend le texte actuel sur les 84 rampes | Écartée : ne fonctionne pas dans Figma |
| S6, texte par palette | Une marque choisit un texte sombre pour son jaune | Selon S2 ou S3 | Écartée : choix du design system |

La proposition de la section 5 garde de S2 la séparation du bouton et du
texte coloré, et de S3 le fait de rester dans la rampe du thème. Elle s'en
distingue en recalculant la courbe, ce qui garde le bouton à la 700.

## 9. Décisions à prendre

1. **La règle du thème inversé** (section 5.1) : texte coloré à 800, contour
   et focus à 700, états du bouton vers la page.
2. **La garantie 14 dans le thème inversé** : juger le repos (recommandé), ou
   ne pas la vérifier.
3. **L'ancrage d'une référence qui ne porte pas le texte des boutons**, à
   trancher avec l'étude des usages indexés :
   - a. la garder ancrée, la garantie manquée s'affiche, comme le vert
     d'aujourd'hui ;
   - b. dans le thème inversé, l'ancrer sur la nuance voisine où elle tient
     ses paires ;
   - c. ne pas l'ancrer dans le thème inversé.
4. **Les clartés de la courbe inversée** : 0,45, 0,50, 0,55 et 0,70 en Dark,
   à éprouver dans Figma.
5. **Le quatrième niveau du texte coloré** : la 950 répétée, ou treize
   nuances.
6. **Le sens de « Les deux » dans le Color shift** : voir le
   [dossier des commandes](../Commandes%20Light-Dark%20et%20Soft-Vivid/DOSSIER-COMMANDES-D-AFFICHAGE.md).
7. **L'anneau de focus**, proposé par l'étude des usages indexés : un anneau
   unique au cran du contour de `surface-4`, 900 en thème normal et 950 en
   thème inversé. L'anneau se dessine sur le fond du conteneur, que le
   composant ne connaît pas. Mesure sur les 42 rampes, contre la page, la
   carte et les surfaces 100 à 400 :

   | Anneau | Échecs à 3:1 | Pire ratio |
   |---|---|---|
   | 900, thème normal, Light et Dark | aucun sur 252 | 5,47:1 sur la 400 |
   | 950, thème inversé, Light et Dark | aucun sur 252 | 6,88:1 sur la 400 |
   | 700, table de la section 5.1, Dark inversé | 91 sur 252 | 1,86:1 sur la 400 |

   Les garanties 12 et 13 tiennent avec une large marge. L'anneau perd en
   revanche la teinte vive de la palette : à 900, il se rapproche du texte.
   Avis : retenir l'anneau unique, qui remplace le focus à 700 de la
   section 5.1.

## 10. Pour le plan d'action

Ordre proposé, chaque lot testé avant le suivant :

1. Maquette de la proposition : faite, voir
   [MAQUETTE-THEME-INVERSE.html](./MAQUETTE-THEME-INVERSE.html). Elle sert à
   la relecture avec le mainteneur.
2. Essai dans Figma : un écran Dark avec texte blanc, bouton sur la page, sur
   une carte et dans une modale.
3. Kit : table des emplois selon le thème, garantie 14 sur le repos, tests
   des quatre combinaisons.
4. Moteur et recette : format 9, lecture du format 8, courbe du thème
   inversé, empreinte et fraîcheur des planches.
5. Plugin : choix « Texte des boutons » dans les Réglages communs, tests
   Chromium sur les quatre combinaisons.
6. Planches, variables, `theme` et `ucm check`.

## 11. Mesures et scripts

Depuis la racine du dépôt :

```sh
npx tsx "docs/notes/Recherches/Plugin Palettes/Texte des boutons/mesurer-courbe-du-texte.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Texte des boutons/mesurer-polarites.ts"
```

- [mesurer-courbe-du-texte.ts](./mesurer-courbe-du-texte.ts) et
  [MESURES-COURBE-DU-TEXTE.json](./MESURES-COURBE-DU-TEXTE.json) : second tour,
  zones de clarté, courbe recalculée, table inversée, garantie 14, ancrage.
- [mesurer-polarites.ts](./mesurer-polarites.ts) et
  [MESURES-POLARITES.json](./MESURES-POLARITES.json) : premier tour, S1 à S5 ;
  le script actualise aussi la maquette.
- [mesurer-encres.mjs](./mesurer-encres.mjs) et
  [MESURES-ENCRES.json](./MESURES-ENCRES.json) : toute première mesure.
- [Maquette du thème inversé](./MAQUETTE-THEME-INVERSE.html) et
  [generer-maquette-theme-inverse.ts](./generer-maquette-theme-inverse.ts) :
  la proposition, avant et après, sur six palettes.
- [Maquette du premier tour](./MAQUETTE-MODES-ET-AFFICHAGE.html) : solutions S1
  à S6 ; sa section 4 montre aussi les modèles de commande Light/Dark.
- [Archives](./Archives/) : notes de recette, étude préparatoire et première
  recherche. Elles traitent aussi des commandes.

## Annexe A : demande originale

> - en dark mode, le boutons sont affichés avec un texte en teintes sombres
>   mais je n'avais pas pensé à ça moi, je pensais plutôt utiliser des teintes
>   claires pour le texte mais ça change tout le moteur je pense. Il faudrait
>   avoir une réflexion là dessus : est ce que c'est quelque chose qui est
>   modifiable ou bien ça va à l'encontre même de l'architecture et du concept
>   du moteur de couleur ? est ce qu'on pourrait avoir des toggle pour choisir
>   si les texte sont clairs ou sombres dans le light mode et le dark mode ?
>   ça serait quoi l'impact de faire ça ?

La suite du message porte sur les commandes Light/Dark et Soft/Vivid ; le
[dossier des commandes](../Commandes%20Light-Dark%20et%20Soft-Vivid/DOSSIER-COMMANDES-D-AFFICHAGE.md) la cite.

## Annexe B : systèmes comparés

Contrastes calculés par la formule WCAG sur les valeurs publiées.

| Système | Bouton en Dark | Texte | Contraste |
|---|---|---|---|
| Material 3, spécification 2021 | `primary` au ton 80, contre 40 en Light | `onPrimary` au ton 20 | Courbe de contraste minimale 4,5 |
| Atlassian | `#669DF1` | `#1F1F21` | 6,00:1 |
| shadcn | `oklch(0.922 0 0)` | `oklch(0.205 0 0)` | Texte sombre |
| Radix | `blue9` `#0090ff`, proche de Light | blanc | 3,26:1 |
| Primer | `#238636`, survol `#29903b`, appui `#2e9a40` | blanc | 4,63, 4,08 et 3,61:1 |
| Carbon, thème g100 | bleu 60 `#0f62fe` | blanc | 5,00:1 ; 3,62:1 contre la page `#161616` |

Material, Atlassian et shadcn posent un texte sombre en Dark, comme UCM
aujourd'hui. Radix, Primer et Carbon gardent un texte blanc, au prix d'un
contraste sous 4,5:1 sur certains états ou d'un bouton qui se détache peu de
la page. La proposition tient 4,5:1 sur tous les états et 3:1 au repos.

## Sources

### Dépôt

- [ARCHITECTURE-FINALE-MULTIMARQUES.md](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md),
  [plan d'intégration](../../Archi%20Tokens%20Multi-marques/PLAN-INTEGRATION-ARCHITECTURE.md)
  et [usages indexés](../../Archi%20Tokens%20Multi-marques/Collection%20usage/README.md).
- [Spécification d'UCM Palettes](../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md), section 11.2.
- [`emplois.ts`](../../../../../packages/kit/src/emplois/emplois.ts),
  [`paires.ts`](../../../../../packages/kit/src/emplois/paires.ts),
  [`usages.ts`](../../../../../packages/kit/src/emplois/usages.ts),
  [`promesses.ts`](../../../../../packages/couleur/src/promesses.ts),
  [`recette.ts`](../../../../../packages/couleur/src/recette.ts),
  [`rampe.ts`](../../../../../packages/couleur/src/rampe.ts),
  [`nuances.ts`](../../../../../packages/couleur/src/nuances.ts),
  [`palette.ts`](../../../../../packages/couleur/src/palette.ts).
- [`nuancier.ts`](../../../../../packages/plugin-palettes/src/ui/nuancier.ts),
  [`interfaceDeTest.ts`](../../../../../packages/plugin-palettes/src/ui/interfaceDeTest.ts),
  [`garanties.ts`](../../../../../packages/plugin-palettes/src/ui/garanties.ts),
  [`configuration.ts`](../../../../../packages/plugin-palettes/src/ui/configuration.ts),
  [`barreDePalette.ts`](../../../../../packages/plugin-palettes/src/ui/barreDePalette.ts).

### Externes

- [Material Color Utilities, `color_spec_2021.ts`](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/dynamiccolor/color_spec_2021.ts)
- [Atlassian, thème Dark de `@atlaskit/tokens`](https://unpkg.com/@atlaskit/tokens/dist/esm/artifacts/themes/atlassian-dark.js)
- [shadcn, Theming](https://ui.shadcn.com/docs/theming)
- [Radix, Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Primer, thème Dark](https://unpkg.com/@primer/primitives/dist/css/functional/themes/dark.css)
- [Carbon, Themes](https://carbondesignsystem.com/elements/themes/overview/)
- [W3C, Understanding 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C, Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
