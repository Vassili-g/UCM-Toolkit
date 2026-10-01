# UCM Palettes et les outils du marché

Ce document compare UCM Palettes aux générateurs de palettes du marché. Pour
chaque écart, il décrit ce que font les concurrents, ce que le concept du
plugin demande, la place qu'une intégration prendrait dans le parcours et dans
les écrans, et l'utilité qu'elle aurait pour l'équipe du design system. Il
s'adresse au mainteneur, qui décide, et à l'agent qui écrira le plan d'un lot
retenu.

Ce document ne décide rien. La [spécification](./RECHERCHE-PLUGIN-PALETTES.md)
reste l'autorité sur le comportement du plugin, et [l'architecture
multi-marques](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)
sur la forme des tokens. Une proposition retenue modifie d'abord la
spécification.

Les propositions qui placent chaque apport dans le plugin, leurs écrans et
leurs revues sont rangées dans [le dossier de l'intégration du
marché](../Int%C3%A9gration%20du%20march%C3%A9/README.md). Les vérifications
de [la proposition
finale](../Int%C3%A9gration%20du%20march%C3%A9/03%20Proposition%20finale/PROPOSITION-FINALE.md)
dans le code ont corrigé les sections 1, 3, 7 et 8 de ce document.

Les capacités des concurrents viennent de leurs pages publiques, de leur
documentation et, pour Radix, du code de son générateur. Aucun outil n'a été
essayé. Les pages de la communauté Figma refusent la lecture automatique : les
nombres d'utilisateurs ne sont pas vérifiés, sauf celui que Supa Palette
annonce lui-même. Le plugin est relevé à la recette au format 6.

La mesure de la section 7 se rejoue :

```sh
node --import tsx "docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/mesurer-vision-simulee.mjs"
```

## Synthèse

| Point | Utilité pour UCM | Coût | Proposition | Section |
|---|---|---|---|---|
| Écrire les variables `primitives` et `brand` | Forte : relie la recette à `tokens.json` | Élevé | Faire en premier, avec les alias de `theme` | [3](#3-écrire-les-variables) |
| Écrire les alias de `theme` | Forte : sans eux, aucune variable écrite n'apparaît dans un sélecteur de Figma | Moyen | Faire avec le point précédent | [3.4](#34-la-couche-theme) |
| Créer une palette depuis la sélection | Moyenne | Faible | Faire | [8.1](#81-une-palette-depuis-la-sélection) |
| Créer le jeu de palettes de l'architecture | Moyenne, forte avec les variables | Moyen | Faire après les variables | [8.2](#82-le-jeu-de-départ) |
| Montrer les palettes en vision simulée | Moyenne, pour les utilitaires | Faible | Faire, sans alerte | [7](#7-daltonisme) |
| Exporter du CSS, du Tailwind ou du DTCG | Faible | Faible | Ne pas faire | [4](#4-exporter-du-code) |
| Afficher le contraste APCA | Faible | Faible | Attendre WCAG 3 | [5](#5-apca) |
| Fabriquer en Display P3 | Faible | Élevé | Ne pas faire | [6](#6-display-p3) |
| Rendre la table des emplois réglable | Nulle en interne | Élevé | Ne pas faire | [9](#9-la-table-des-emplois) |

## 1. Le critère : le concept et sa chaîne

UCM Palettes fabrique les rampes que l'architecture multi-marques range dans
Figma : le neutre et les quatre utilitaires dans `primitives`, les rampes de
chaque marque dans `brand`, et les noms que les composants citent dans
`theme`. Le parcours du designer passe par ces étapes :

| Étape | Outil | Résultat | État |
|---|---|---|---|
| Composer et régler une palette | Onglet Création | La recette, rangée dans le document | Fait |
| Juger les garanties | Onglet Création, carte « Garanties de contraste » | Les promesses par mode et par intensité | Fait |
| Documenter | Onglet Palettes, « Générer sur Figma » | Un cadre par palette | Fait |
| Créer les variables | Panneau des variables de Figma, à la main | `primitives`, `brand`, `theme` | Manuel |
| Exporter les tokens | UCM Exporter | `tokens.json`, au format DTCG | Fait |
| Produire le CSS | `ucm tokens css` | La feuille, avec `data-brand` et `data-theme` | Fait |
| Conserver la recette | Onglet Palettes, export | `palettes.recette.json`, rangé à la main dans le dépôt | Manuel |

Entre la planche et UCM Exporter, le designer crée les variables à la main.
Pour six marques, l'architecture compte trois collections ([section
2](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md#2-les-collections)) :

- `primitives` : 198 variables, une valeur chacune ;
- `brand` : 45 variables, une valeur par marque, soit 270 valeurs ;
- `theme` : 121 variables, un alias en `light` et un en `dark`, soit 242
  valeurs.

Le designer saisit donc 710 valeurs ou alias, et reprend chaque couleur
touchée quand la recette change. Une variable et une valeur ne se comptent pas
ensemble : une seconde marque ne crée aucune variable dans `brand`, elle écrit
45 valeurs dans son mode.

Une proposition se juge sur quatre questions :

1. Retire-t-elle une saisie manuelle de la chaîne ?
2. Garde-t-elle la règle « un numéro de cran vaut un contraste » (architecture,
   section 1) et la table fixe des emplois (D9) ?
3. Garde-t-elle une seule source par valeur ? La recette rangée fait autorité
   (D10), et une valeur de code sort de `tokens.json`.
4. Tient-elle dans [les surfaces
   d'UCM Palettes](../../../../../CONTRIBUTING.md#les-surfaces-ducm-palettes) et
   sous la douzaine d'objets du protocole de relecture ?

## 2. Le marché

### 2.1 Les outils

| Outil | Forme | Principe de fabrication | Couleur saisie gardée exacte | Thème sombre | Contraste | Sortie dans Figma | Autres sorties | Prix |
|---|---|---|---|---|---|---|---|---|
| tints.dev | Site et API | Onze nuances ; décalage de teinte et de saturation, luminosité minimale et maximale | Oui, sur la nuance choisie | Non | Non documenté | Aucune | CSS en hexa, HSL, OKLCH ou P3 ; Tailwind 3 et 4 | Gratuit |
| uicolors.app | Site et plugin | Une gamme Tailwind ; retouche de chaque nuance | Non documenté | Non | Non documenté | Variables | CSS, Tailwind | Gratuit ; retouche payante |
| Atmos | Application web | Nuances uniformes en LCH ou OKLCH | Non documenté | Non documenté | WCAG 2 et APCA ; simulation du daltonisme | Synchronisation par plugin | CSS, Tailwind, Style Dictionary, JavaScript, SVG | Non relevé |
| Radix, palette personnalisée | Site | Trois entrées : accent, gris, fond. Douze pas, mêlés des deux échelles Radix les plus proches de l'accent | Oui, au pas 9, sauf un accent à moins de 0,25 en ΔEok du pas 1 | Oui, par bascule | APCA, pour choisir le texte posé sur le pas 9 | Aucune | CSS, variantes alpha, P3 et repli sRGB | Gratuit |
| Material Theme Builder | Plugin et site | Palettes tonales en espace HCT ; rôles d'un schéma clair et d'un schéma sombre | Non : la couleur donne la teinte, un rôle prend un ton fixe | Oui | Contraste des rôles | Styles et variables | CSS, Android, Compose | Gratuit |
| Leonardo (Adobe) | Site et module npm, code ouvert | Couleurs clés et ratio de contraste visé par nuance | Non : la nuance vise un ratio | Thèmes adaptatifs : luminosité, contraste, saturation | Ratio visé ; palettes de données sûres pour le daltonisme | Aucune | CSS, SVG, tokens du W3C | Gratuit |
| Harmonizer (Evil Martians) | Plugin et site, code ouvert | Niveau de contraste visé contre le fond ; chroma constante d'une teinte à l'autre | Non | Fond réglable | APCA par défaut, WCAG 2 en option | Variables et aperçu, mis à jour quand le cadre « Harmonized Palette » est retrouvé | Tailwind, CSS, JSON ; configuration partageable | Gratuit |
| Huetone | Site | Courbes de clarté et de chroma point par point, par teinte, en LCH ou OKLCH | Non | Non | Contraste en direct | Par export | JSON | Gratuit |
| Color Scales I/O | Plugin | Moteur de Leonardo ; pas ajoutés ou retirés par cible de contraste ; douze espaces, dont OKLCH, HCT et HSLuv | Couleur importée d'une sélection, d'un JSON ou d'une adresse Leonardo | Clair, sombre, contraste élevé, modes libres | WCAG 2.1 et APCA | Variables et styles | Tokens du W3C en JSON ou YAML, extraits pour Dev Mode | 3 exports par 30 jours ; 49 $ une fois |
| Supa Palette | Plugin | Quatorze systèmes intégrés, dont Tailwind, Material UI et Radix ; 30 000 palettes ; luminosité et saturation réglables | Non documenté | Oui | WCAG 2.1 et APCA ; grille de contraste | Variables et styles ; planche de documentation en quatre styles ; association sémantique par OpenAI, en bêta | Tokens Studio, Chakra, Material UI, Tailwind, CSS, JSON | 59 $ seul, 139 $ à trois, 279 $ à dix ; 100 000 utilisateurs annoncés |
| OKLCH Color Scale | Plugin | Début et fin de L, C et H, chacun avec sa courbe d'accélération | Une couleur de référence par thème | Oui : mêmes pas et mêmes noms dans les deux thèmes | WCAG AA, AAA et APCA ; pas hors gamut signalés, chroma réduite en option | Une collection à modes Light et Dark, ou des pastilles annotées | Non relevé | Non relevé |
| PencilColor | Plugin | OKLCH | Non documenté | Non documenté | WCAG et APCA | Variables liées, guide de style | Non relevé | Non relevé |
| Tokens Studio, Graph Engine | Éditeur de nœuds | Nœuds « Scale colors » et « Range » | Selon le graphe | Selon le graphe | Non relevé | Par Tokens Studio | JSON, CSS | Non relevé |

### 2.2 Ce qu'UCM Palettes fait seul

- **La référence exacte dans sa rampe, garanties recalculées autour
  d'elle.** Radix, tints.dev et OKLCH Color Scale gardent la couleur saisie,
  sans vérifier les usages des nuances voisines. UCM ancre la référence dans
  le profil porteur (`[MOT-17]`) et juge chaque promesse sur les rampes
  ancrées.
- **Deux intensités par palette**, Soft et Vivid, avec l'alerte « Profils
  confondus ». Aucun outil relevé ne documente deux rampes de chroma
  différente pour une même couleur, dans un même thème.
- **Une table d'emplois vérifiée, états compris.** Seize paires par mode et
  par intensité, dont `text+1` sur `surface+1` au survol (section 11.2 de la
  spécification). Les concurrents mesurent une nuance contre un fond.
  Material fixe des rôles. Radix documente l'usage de chaque pas, survol et
  appui compris, sans mesurer les paires.
- **Une recette déterministe et versionnée.** Hexa à 8 bits, JSON canonique,
  empreinte, migrations et import précédé de l'écart. Harmonizer partage un
  fichier de configuration ; sa documentation ne décrit ni version ni écart
  avant chargement.
- **Une planche suivie.** Chaque cadre a un état de fraîcheur, et le plugin
  protège les calques étrangers. Supa dessine une documentation ; ses pages
  ne décrivent aucun suivi de fraîcheur.

### 2.3 Ce que presque tous font et qu'UCM ne fait pas

Les treize outils relevés écrivent des variables Figma ou exportent du code.
Six affichent le contraste APCA, et Radix l'emploie pour choisir un texte.
Ces écarts, et les suivants, font l'objet des sections 3 à 9.

## 3. Écrire les variables

### 3.1 Ce que fait le marché

Sept plugins écrivent des variables. Le schéma documenté est une collection
par jeu de palettes, avec les modes Light et Dark, et des noms de la forme
`{palette}/{pas}` : OKLCH Color Scale le décrit ainsi. Harmonizer met à jour
les variables qu'il a déjà écrites quand il retrouve son cadre d'aperçu par
son nom. Color Scales I/O réserve les modes multiples à son offre payante.
Material Theme Builder écrit trois groupes : schémas, palettes et couleurs
ajoutées.

Aucun de ces outils ne documente trois choses : la détection d'une valeur
retouchée à la main, un mode par marque, et une couche d'alias déduite d'une
table d'emplois. Material fixe des rôles, et Supa confie l'association à un
modèle de langage.

### 3.2 Ce que demande l'architecture

La forme de l'architecture diffère du schéma du marché. Le thème fait partie
du chemin dans `primitives` et dans `brand`. Les modes de `brand` sont les
marques. Seule `theme` porte les modes `light` et `dark`.

```text
primitives.success.soft.light.700        pas de mode
brand.palette.primary.dark.700           un mode par marque
brand.identity.primary                   un mode par marque
theme.primary.700                        light → brand.palette.primary.light.700
                                         dark  → brand.palette.primary.dark.700
```

La sortie d'un concurrent se reconstruit donc à la main. Seul un outil qui lit
l'architecture écrit cette forme.

### 3.3 Les questions de la section 17

La [section 17](./RECHERCHE-PLUGIN-PALETTES.md#17-sortie-2--les-variables)
de la spécification liste ce que l'option devra trancher. Voici une réponse
par question.

**Les noms.** Chaque palette reçoit une destination, saisie par le
designer : une collection, une famille, et une marque pour `brand`. Le
chemin s'en déduit :

| Collection | Chemin | Exemple |
|---|---|---|
| `primitives`, deux intensités | `{famille}.{profil}.{mode}.{cran}` | `primitives.danger.vivid.light.700` |
| `primitives`, une intensité | `{famille}.{mode}.{cran}` | `primitives.neutral.dark.50` |
| `brand` | `palette.{famille}.{mode}.{cran}`, dans le mode de la marque | `brand.palette.primary.light.700` |

La fin du chemin est le nom de calque de `[PLA-14]`. La destination entre
dans la recette, dont le format monte. D3 tient : le plugin ne choisit aucun
nom, il assemble celui que le designer donne.

**Les contraintes de l'architecture.** Une rampe de marque porte une
intensité, un utilitaire deux. Une destination `brand` sur une palette à deux
intensités se refuse à la saisie, avec cette raison. Deux palettes à la même
destination, et à la même marque pour `brand`, se refusent aussi.

**Les modes Figma.** Le plugin crée le mode d'une marque absente, puis écrit
toutes les valeurs de ce mode. L'offre Professional admet dix modes par
collection et l'offre Organization vingt : six marques y tiennent. Les
collections étendues, réservées à l'offre Enterprise, ne sont pas requises.
Chaque variable écrite porte une marque posée par `setPluginData` : la
palette, et la dernière valeur écrite dans chaque mode. Figma recopie la
première colonne dans un mode ajouté à la main. Une valeur sans marque égale à
celle de la première colonne ne prouve pourtant pas une copie : un designer a
pu la choisir. Le plugin la classe « à attribuer », et le designer décide.

**Les retouches.** Avant d'écrire, le plugin compare trois valeurs : la
dernière qu'il a écrite, celle de la recette et celle de Figma. Une valeur de
Figma différente de la dernière écrite est une retouche. Le plugin ne l'écrase
pas : la confirmation la montre avec deux choix, aucun coché d'avance, et
les garanties que chacun donne. Le plugin relit le fichier au clic final, et
un écart annule l'écriture. Une retouche adoptée entre dans la recette, sous la liste des crans
retouchés que [la section 3.5 de
l'architecture](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md#35-le-fichier-de-recette)
prévoit et que la recette ne porte pas encore. Sans cette liste, la recette
ne décrit plus le document, et D10 ne tient plus. La planche et le rapport
montrent alors la couleur retouchée, marquée comme telle.

**Le profil du document.** La valeur d'une variable suit la table de la
[section 6.7](./RECHERCHE-PLUGIN-PALETTES.md#67-peindre-dans-lespace-du-document),
comme une pastille. UCM Exporter lit déjà ce profil (`espaceDuProfil`,
`packages/plugin-exporter/src/tokens/exportTokens.ts`). `[MOT-25]` se vérifie
aussi sur une variable, dans Figma.

**UCM Exporter.** Rien ne change : il exporte les variables locales et garde
la chaîne d'alias.

Trois décisions complètent ces réponses :

- **L'identité de la marque.** `brand.identity.{famille}` reçoit la couleur
  que le designer a saisie avant tout ajustement : la couleur de la charte.
  La [section 3.4 de
  l'architecture](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md#34-la-couleur-exacte-de-la-marque)
  garde cette couleur hors de la rampe ; le plugin place la référence dans le
  cran porteur. Sans ajustement, les deux sont égales ; après un ajustement,
  l'identité garde la couleur d'origine. Une retouche du cran porteur ne peut
  pas devenir une exception : elle devient une nouvelle référence, ou
  disparaît.
- **Les portées et la syntaxe de code.** Un composant ne cite ni `primitives`
  ni `brand`. Leurs variables prennent des portées vides, `scopes = []`, qui
  les retirent des sélecteurs de Figma. Les portées ne règlent que les
  sélecteurs : l'API peut encore lier ces variables. `theme` garde les portées de
  remplissage et de contour. `setVariableCodeSyntax('WEB', …)` reçoit le nom
  que `tokenCssVariable` du kit produit : Dev Mode montre la propriété que
  `ucm tokens css` écrit.
- **L'identité d'une variable.** Un suivi rangé dans le document garde
  l'identifiant de chaque collection, de chaque mode et de chaque variable. Le
  plugin ne reconnaît jamais une variable à son nom. Changer la famille d'une
  palette dans la même collection renomme ses variables : les calques liés
  restent liés. Une variable ne change pas de collection, puisque
  `variableCollectionId` est en lecture seule dans l'API. Une palette qui
  change de collection reçoit donc de nouvelles variables, et les anciennes
  restent, sans palette. Supprimer une palette
  laisse ses variables, comme `[PLA-27]` laisse son cadre. Les supprimer est
  un geste `danger` séparé, puisqu'il détache les calques liés.

### 3.4 La couche `theme`

Les alias de `theme` se déduisent de la table « Ce que `theme` expose » de
l'architecture, sans choix du designer :

```text
theme.neutral.{cran}                   → primitives.neutral.{mode}.{cran}
theme.{utilitaire}.{profil}.{cran}     → primitives.{utilitaire}.{profil}.{mode}.{cran}
theme.{famille}.{cran}                 → brand.palette.{famille}.{mode}.{cran}
```

Le plugin les écrit par `createVariableAlias`, une colonne par mode de
`theme`. Supa confie cette association à un modèle de langage ; ici, la règle
est fixe, et un modèle n'ajoute rien. Les exceptions, `theme.exception.…`,
restent au designer : ce sont des décisions de marque.

### 3.5 Le parcours et les écrans

Le parcours devient : composer dans l'onglet Création, juger, générer la
planche, écrire les variables dans l'onglet Palettes, publier la bibliothèque
dans Figma, exporter avec UCM Exporter. Le plugin ne publie rien : la
publication reste le geste du designer, et elle seule propage les variables
aux autres fichiers.

Une première esquisse ajoutait une rangée « Variables » sous les Intensités,
une seconde pastille et un second geste par fiche. La rangée laissait saisir
une palette de marque à deux intensités, puis la refusait, et la fiche portait
deux boutons principaux. La proposition finale les remplace (pistes 1 à 3) :

| Écran | Ajout | Règle tenue |
|---|---|---|
| Onglet Création, carte « Configuration de la palette » | La rangée « Rôle dans le système » : Marque, Utilitaire, Neutre, Hors variables. Le rôle fixe les intensités et le chemin des variables. Hors variables par défaut : une palette d'essai n'écrit rien | L'onglet Création n'écrit que la recette |
| Onglet Palettes, fiche | Une pastille, à l'état le plus urgent de la planche et des variables, et un premier geste. Une ligne nomme les deux états quand ils diffèrent | Un seul bouton principal par fiche |
| Revue avant écriture | Deux sorties cochables, la planche et les variables ; variables créées, valeurs écrites et cadres dessinés ; retouches à décider sans choix par défaut. Annuler ne touche à rien | Un geste qui écrit hors de la planche se confirme |
| Réglages communs | Une carte repliée « Variables et marques » : noms des trois collections, liste des marques | Les cartes repliées gardent leur place |
| Galerie | Les états : rôles, conversion, deux sorties, conflit, revue invalidée, bilan partiel | Un message déclaré a son écran |

### 3.6 Utilité

L'écriture retire les 710 saisies de la section 1 et leur reprise à chaque
changement de recette. Elle retire aussi une erreur qu'aucun contrôle ne voit
aujourd'hui : un cran mal recopié dans `brand` rompt une garantie de contraste
sans message. Avec la marque de chaque valeur, toute couleur écrite se
rattache à une recette et à une empreinte.

Le coût est le plus élevé de la liste. D2, la section 5 de la spécification
(« Le plugin ne fait pas ») et la section 17 changent ; la recette prend un
format ; le plugin gagne un domaine d'écriture, que la spécification et ses
tests doivent borner comme ils bornent la planche.

**Proposition : faire, en deux tranches.** La première écrit une famille sans
marque, un utilitaire ou le neutre, avec ses alias de `theme`, la revue, les
retouches et la reprise après un échec. Une variable de `primitives` ou de
`brand` n'apparaît dans aucun sélecteur : un premier lot sans `theme` ne
donnerait rien à lier. La seconde tranche ajoute les marques, leurs modes et
leur identité.

## 4. Exporter du code

### 4.1 Ce que fait le marché

Presque tous les outils exportent des propriétés CSS, une configuration
Tailwind ou du JSON. Leonardo et Color Scales I/O exportent des tokens au
format du W3C. Color Scales I/O ajoute des extraits pour Dev Mode, et Supa
les formats de Chakra et de Material UI.

### 4.2 Ce que le concept demande

La chaîne vers le code existe déjà. UCM Exporter écrit `tokens.json` au
format DTCG 2025.10, que le groupe de travail du W3C a publié comme première
version stable ; `ucm tokens css` en tire la feuille. Un export depuis
Palettes ouvrirait une seconde route vers les mêmes valeurs. Cette route
contournerait les alias de `theme` et produirait un fichier que `ucm check`
ne lit pas. Deux fichiers porteraient alors une même couleur, et le kit n'a
aucune règle pour choisir entre eux.

Deux besoins restent :

- un développeur veut une rampe avant que les variables existent : la
  section 3, suivie d'UCM Exporter, y répond ;
- un script veut l'hexa de chaque cran : le rapport de vérification le donne
  déjà (`[VER-01]`).

Une copie de la rampe ouverte en propriétés CSS, depuis le menu de l'aperçu,
servirait un collage rapide. Elle vivrait hors de la chaîne, et son libellé
devrait le dire.

Si la section 3 était écartée, un fragment DTCG de `primitives` et de `brand`
deviendrait le repli. Il demanderait au kit une règle de fusion avec
`tokens.json`, pour un résultat moindre que l'écriture des variables.

**Proposition : ne pas faire.**

## 5. APCA

### 5.1 Ce que fait le marché

Harmonizer mesure en APCA par défaut. Supa, Atmos, OKLCH Color Scale, Color
Scales I/O et PencilColor affichent WCAG 2 et APCA. Le générateur de Radix
emploie APCA pour choisir le texte posé sur son pas 9, avec un seuil de Lc 40.

### 5.2 Le statut normatif

- Le brouillon de WCAG 3 écrit que l'algorithme de contraste reste à
  déterminer. APCA en a été retiré en 2023, faute d'accord du groupe de
  travail. La feuille de route vise une recommandation candidate fin 2027,
  et une recommandation au plus tôt en 2028 ; Adrian Roselli situe la fin
  des travaux vers 2030.
- La version 4.1.1 d'EN 301 549 se réfère à WCAG 2.2. La Commission ne l'a
  pas encore citée au Journal officiel : la version 3.2.1, fondée sur
  WCAG 2.1, reste la référence de conformité à l'European Accessibility Act
  (EAA).
- Le RGAA 5 se construit sur WCAG 2.2.
- Les critères de contraste 1.4.3, 1.4.6 et 1.4.11 sont identiques en
  WCAG 2.1 et 2.2.

Les obligations d'Apicil se mesurent donc en ratio WCAG 2, celui que le plugin
calcule (section 5 et `[VER-13]` de la spécification).

### 5.3 Ce qu'une lecture APCA apporterait

APCA tient compte de la polarité, texte clair sur fond sombre ou l'inverse, et
de la graisse du texte. Ses promoteurs reprochent à WCAG 2 de surestimer le
contraste entre deux couleurs sombres, ce qui concerne le Thème Dark.

Une intégration ne toucherait ni les promesses ni les badges :

- le rapport gagnerait un champ `apca` par paire ;
- le détail d'une nuance afficherait « Lc 62 » en couleur secondaire, sans
  badge ;
- un réglage des Réglages communs, désactivé par défaut, l'afficherait.

### 5.4 Utilité

Aucune décision du designer ne change : promesses, badges et obligations
restent en WCAG 2. Deux nombres côte à côte poseraient au designer la
question de celui qui compte, et la spécification n'y répond qu'en excluant
APCA (section 5).

**Proposition : attendre qu'un algorithme soit retenu dans WCAG 3.** Le jour
venu, le moteur ajoute une fonction pure à `contraste.ts`, et les promesses
changent de modèle par un réglage de la recette.

## 6. Display P3

### 6.1 Ce que fait le marché

Harmonizer suit le profil du document, sRGB ou P3. tints.dev exporte en P3.
Radix exporte chaque pas en P3 avec un repli sRGB. Tailwind 4 écrit sa
palette en OKLCH, et certaines nuances sortent de sRGB. Le module de couleur
DTCG 2025.10 accepte `display-p3` et `oklch`.

### 6.2 L'état d'UCM

La [section 3.5 de
l'architecture](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md#35-le-fichier-de-recette)
écarte P3 : il changerait toutes les valeurs, et un écran sRGB ne montre pas
la différence au designer. La recette n'accepte que `srgb` (Q4). Le plugin
peint juste dans un document P3 (section 6.7 de la spécification), et la
galerie en montre l'état « Document Display P3 ». Le préréglage Tailwind
relève les teintes de Tailwind 4 (rouge 50 à 17,38°) ; une teinte ne dépend
pas du gamut.

### 6.3 Ce que P3 changerait

Le plafond de chroma monterait, surtout pour les verts, les rouges et les
cyans : Vivid gagnerait en éclat sur un écran P3. En contrepartie :

- chaque cran porterait deux valeurs, P3 et repli sRGB ;
- chaque promesse se jugerait deux fois, puisque la luminance de WCAG 2 se
  définit en sRGB ;
- `ucm tokens css` devrait écrire `@media (color-gamut: p3)` ou des valeurs
  OKLCH ;
- les chartes de marque donnent des hexas sRGB.

**Proposition : ne pas faire.** La question se rouvre si une charte définit
une couleur hors de sRGB.

## 7. Daltonisme

### 7.1 Ce que fait le marché

Leonardo compose des palettes de données sûres pour le daltonisme : un seuil
de ΔE 2000 entre couleurs, et des simulations triées par ressemblance. Atmos
simule le daltonisme sur une palette. Dans Figma, Accessibility Checker et
InclusiColor calculent le contraste pour chaque type de vision. Chrome
l'émule dans ses outils de développement.

Trois modèles de simulation dominent : Brettel 1997, Viénot 1999 et Machado
2009. La revue de DaltonLens juge Viénot et Brettel fiables pour une
dichromacie complète, et Machado mieux fondé pour une vision anomale
partielle.

### 7.2 Mesure

`mesurer-vision-simulee.mjs` crée les quatre utilitaires dans la recette par
défaut, à deux intensités, avec les matrices de libDaltonLens : Viénot pour
la protanopie et la deutéranopie, Brettel pour la tritanopie. La distance est
celle de l'alerte « Palettes proches » (section 11.3 de la spécification) :
ΔEok moyen sur les crans 500, 600 et 700, Vivid, Thème Light. Le seuil par
défaut vaut 0,05. Une distance en gras passe sous ce seuil.

Jeu des 600 de Tailwind : danger `#DC2626`, warning `#D97706`, success
`#16A34A`, info `#2563EB`.

| Paire | Normale | Protanopie | Deutéranopie | Tritanopie |
|---|---|---|---|---|
| danger et warning | 0,102 | 0,079 | **0,015** | 0,075 |
| danger et success | 0,319 | 0,179 | **0,042** | 0,281 |
| danger et info | 0,355 | 0,281 | 0,317 | 0,297 |
| warning et success | 0,224 | 0,117 | 0,052 | 0,207 |
| warning et info | 0,333 | 0,309 | 0,329 | 0,224 |
| success et info | 0,307 | 0,297 | 0,285 | **0,048** |

Le contraste de `text` 700 sur le fond du Thème Light reste au-dessus de 4,5
dans les quatre visions : 4,77 au plus bas, pour success en protanopie.

Deux autres jeux déplacent les teintes :

| Jeu | danger et warning, deutéranopie | danger et success, deutéranopie | success et info, tritanopie |
|---|---|---|---|
| 600 de Tailwind | **0,015** | **0,042** | **0,048** |
| danger `#E11D48`, success `#0D9488` | **0,044** | 0,102 | **0,031** |
| warning `#CA8A04`, success `#0D9488`, info `#4F46E5` | **0,016** | 0,133 | **0,032** |

Un success sarcelle se sépare de danger pour un deutéranope, et se rapproche
d'info pour un tritanope. Danger et warning restent sous le seuil en
deutéranopie dans les trois jeux.

La cause tient à l'architecture. Toutes les rampes partagent la courbe de
clarté : au même cran, deux palettes ont la même clarté. Une vision
dichromate perd un axe de couleur, et il ne reste qu'un petit écart. C'est la
contrepartie de « un numéro de cran vaut un contraste ». Aucun réglage d'une
palette ne sépare danger et warning sans rompre cette règle. Le critère 1.4.1
de WCAG, « Utilisation de la couleur », demande de ne pas porter une
information par la couleur seule : la réponse se trouve dans le composant,
avec une icône ou un texte.

### 7.3 Le parcours et les écrans

- **Moteur.** Un module pur, `vision.ts`, reprend les matrices du script. Ses
  tests comparent ses sorties aux vecteurs de libDaltonLens.
- **Onglet Palettes.** Une carte repliée, « Distinguer les statuts », ouvre
  le groupe des couleurs communes. Elle porte le choix de la vision, normale,
  protanopie, deutéranopie ou tritanopie, quatre spécimens de statut peints
  des utilitaires, les paires sous le seuil et le nom du modèle simulé. La
  vision repeint aussi les rampes des utilitaires. C'est le seul écran du
  plugin où les palettes se voient côte à côte, et l'en-tête de l'onglet ne
  gagne aucun objet.
- **Rapport.** Les distances de chaque paire de palettes, par vision.
- **Pas d'alerte.** Une alerte qu'aucun réglage ne lève contredit `[VER-08]`,
  qui veut qu'une alerte mène au réglage qui la lève. Danger et warning la
  feraient sonner en permanence.

### 7.4 Utilité

La vision simulée éclaire deux décisions : la teinte de référence des
utilitaires, et l'obligation d'une icône dans les composants de statut. La
seconde appartient aux contrats de composant, donc à UCM Exporter.

**Proposition : faire la bascule et les distances du rapport, sans alerte.**

## 8. Prise en main

### 8.1 Une palette depuis la sélection

**Marché.** tints.dev et Material partent d'une couleur, Radix de trois.
Color Scales I/O importe la couleur d'une sélection Figma, d'un JSON, d'une
adresse ou d'une image.

**État d'UCM.** La carte de création demande le nom, la référence, le Modèle
et les Intensités. La première palette se crée vite. Le designer recopie
pourtant l'hexa depuis la charte ou depuis un calque du document.

**Intégration.** Quand un calque à remplissage uni est sélectionné,
« Nouvelle palette » préremplit la référence avec sa couleur et le nom avec
celui du calque. Une ligne secondaire dit d'où vient la couleur. Le sandbox
suit `selectionchange` et lit la couleur résolue, variable liée comprise. Un
dégradé, une image ou plusieurs remplissages ne préremplissent rien.

La même lecture peut servir partout où une couleur se saisit : une rangée
« Dans la sélection » du sélecteur de couleur embarqué, une pastille par
calque à peinture unie, visible et opaque. Le préremplissage ne remplace
jamais une saisie du designer.

**Proposition : faire.** Le coût est faible. Chaque palette de marque part
d'une couleur de charte, souvent déjà posée dans le document.

### 8.2 Le jeu de départ

**Marché.** Supa part de quatorze systèmes. Foundation propose les palettes
de Material, d'Atlassian et d'Ant Design.

**État d'UCM.** L'architecture demande dix-sept palettes pour six marques :
le neutre à une intensité, quatre utilitaires à deux intensités, et une
primaire et une secondaire par marque, à une intensité. Le designer les crée
une à une, en choisissant chaque fois les intensités.

**Intégration.** Un fichier sans palette montre déjà la carte de création.
Elle propose aussi « Le jeu de départ » : le neutre et les quatre
utilitaires, avec leurs intensités et leur rôle, puis une ligne par marque.
Une famille de marque vaut pour toutes les marques, puisque les variables de
`brand` sont communes à ses modes. « Compléter le jeu de départ », dans le
menu « … », range une palette existante dans une case vide au lieu d'en créer
une autre. L'invitation de l'onglet Création n'a pas de geste propre
(CONTRIBUTING) : le jeu est un choix de la carte de création. Les
références par défaut des utilitaires se choisissent avec la mesure de la
section 7.

**Proposition : faire après la section 3.** Sans destination, le jeu épargne
cinq créations. Avec elle, il prépare aussi 198 variables.

### 8.3 Le vocabulaire et la langue des planches

Soft, Vivid, « Référence exacte dans » et « Dérive de teinte » sont propres
au plugin. Une aide d'une phrase à côté de chacun de ces libellés suit le
circuit de [TEXTES-A-VALIDER.md](../Textes et langues/TEXTES-A-VALIDER.md).

L'interface s'ouvre en anglais, et les planches restent en français
(`[UI-16]`). La planche est le document que le designer partage avec les
développeurs. Sa langue deviendrait un réglage de « Contenu des planches »,
rangé dans la recette : deux designers qui génèrent la même palette
obtiendraient la même planche.

**Proposition : faire avec la prochaine relecture des textes.**

## 9. La table des emplois

**Marché.** Leonardo et Harmonizer laissent le designer viser un contraste
par nuance. Material et Radix fixent des rôles. Supa montre une grille de
contrastes sans rôle.

**État d'UCM.** La table est fixe (D9). La recette règle les minimums,
`seuils.texte` et `seuils.nonTexte`, et non les crans. `theme.primary.700`
sert un texte dans toutes les marques parce que la table ne change pas d'un
fichier à l'autre. Une table réglable ferait différer les promesses d'un
fichier à l'autre, alors que la garantie de l'architecture vaut pour toutes
les marques.

**Utilité.** Nulle pour l'équipe. Elle compterait si le plugin était publié
pour d'autres design systems : la table deviendrait une donnée de la
recette, avec son éditeur et des promesses génériques.

**Proposition : ne pas faire.** La carte « Garanties de contraste » et la
partie « Quelle nuance pour quel usage » de la planche (section 9.4 de la
spécification) montrent déjà la table.

## 10. Ce que ce document écarte

| Fonction | Outils | Raison |
|---|---|---|
| Harmonies et roue chromatique | Atmos, Coolors | Les couleurs de départ viennent des chartes de marque |
| Bibliothèques de palettes | Supa, Foundation | Une rampe importée ne suit pas les courbes communes. Le préréglage Tailwind reprend déjà ce qui se transpose : la dérive |
| Association sémantique par modèle de langage | Supa | La couche `theme` se déduit par règle (section 3.4) |
| Extraction depuis une image | Color Scales I/O | Même raison que les harmonies |
| Fabrication par contraste visé | Leonardo, Harmonizer, Color Scales I/O | La courbe commune donne déjà un contraste par cran. Viser un ratio déplacerait la couleur de marque, que le plugin garde exacte |

## 11. Écarts relevés dans la documentation

| Écart | Où | Conséquence |
|---|---|---|
| Le README annonce le format 4 de la recette ; `FORMAT_RECETTE` vaut 6 | [README d'UCM Palettes](../../../../../packages/plugin-palettes/README.md), `packages/couleur/src/recette.ts` | Corriger le README |
| L'architecture garde la couleur exacte hors de la rampe, sous `brand.identity` ; `[MOT-17]` la place dans le cran porteur | Architecture, section 3.4 ; spécification, section 6.4 | Proposé : l'identité vaut la couleur saisie avant ajustement, `originaleDe` dans `packages/plugin-palettes/src/edition.ts` (section 3.3) |
| La spécification donne 770 × 720 pour la fenêtre ; le code l'ouvre à 600 × 720 et range 770 parmi les anciens défauts | Spécification, `[UI-01]` ; `packages/plugin-palettes/src/fenetre.ts` | Corriger la spécification |
| L'architecture compte une identité par marque, 45 variables dans `brand` ; une identité par famille en donne 46 | Architecture, section 2 | À corriger si la décision V5 de la proposition finale est retenue |
| L'architecture prévoit la liste des crans retouchés dans la recette ; la recette ne la porte pas | Architecture, section 3.5 ; `packages/couleur/src/recette.ts` | Requise par l'écriture des variables (section 3.3) |
| L'architecture donne une intensité aux rampes de marque ; le plugin laisse choisir une ou deux intensités pour toute palette | Architecture, section 2 ; `[ENT-14]` | Devient une contrainte de la destination `brand` (section 3.3) |

## Sources

Outils :
[tints.dev](https://www.tints.dev/) ;
[UI Colors](https://uicolors.app/generate) ;
[Atmos](https://atmos.style/) ;
[Radix, palettes personnalisées](https://www.radix-ui.com/colors/docs/overview/custom-palettes)
et [code du générateur](https://github.com/radix-ui/website/blob/main/components/generate-radix-colors.tsx) ;
[Material Theme Builder](https://github.com/material-foundation/material-theme-builder) ;
[Leonardo](https://leonardocolor.io/) et [ses palettes de données](https://medium.com/@NateBaldwin/color-scales-for-data-visualization-in-leonardo-bf206feb61b9) ;
[Harmonizer](https://github.com/evilmartians/harmonizer) ;
[Huetone](https://flowingdata.com/2024/09/03/huetone-for-accessible-color-systems/) ;
[Color Scales I/O](https://forum.figma.com/showcase-your-work-14/color-scales-i-o-create-edit-and-export-accessible-palettes-for-design-systems-54816) ;
[Supa Palette](https://supa-palette.com/) ;
[OKLCH Color Scale](https://www.figma.com/community/plugin/1643955360098316524/oklch-color-scale) ;
[PencilColor](https://www.figma.com/community/plugin/1543205987982919489/pencilcolor-smart-oklch-figma-color-palette-generator) ;
[Foundation: Color Generator](https://www.figma.com/community/plugin/1024452006068794933/foundation-color-generator) ;
[Tokens Studio, Graph Engine](https://documentation.tokens.studio/graph-engine/introduction).

Figma :
[plans et fonctions](https://help.figma.com/hc/en-us/articles/360040328273-Figma-plans-and-features) ;
[modes des variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables) ;
[collections étendues](https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection) ;
`@figma/plugin-typings` 1.138, pour `createVariableAlias`, `setVariableCodeSyntax`, `scopes` et `setPluginData`.

Normes :
[WCAG 3, brouillon](https://www.w3.org/TR/wcag-3.0/) ;
[Adrian Roselli, le contraste dans WCAG 3](http://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html) ;
[EN 301 549](https://en.wikipedia.org/wiki/EN_301_549) et l'annonce de sa version 4.1.1 par le [centre AccessibleEU](https://accessible-eu-centre.ec.europa.eu/) ;
[RGAA 5](https://binclusive.io/en/blog/rgaa-5-france-digital-accessibility-standard) ;
[DTCG 2025.10, module de couleur](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/) ;
[Tailwind CSS 4](https://tailwindcss.com/blog/tailwindcss-v4).

Daltonisme :
[DaltonLens, revue des simulations](https://daltonlens.org/opensource-cvd-simulation/) ;
[Chrome, simulation dans Blink](https://developer.chrome.com/docs/chromium/cvd) ;
[Machado, Oliveira et Fernandes 2009](https://www.researchgate.net/publication/38015459_A_Physiologically-Based_Model_for_Simulation_of_Color_Vision_Deficiency_vol_15_pg_1291_2009) ;
[Accessibility Checker](https://www.figma.com/community/plugin/1320443008808677895/accessibility-checker) ;
[InclusiColor](https://www.figma.com/community/plugin/1291949728605622601/accessiblity-contrast-checker-inclusicolor).
