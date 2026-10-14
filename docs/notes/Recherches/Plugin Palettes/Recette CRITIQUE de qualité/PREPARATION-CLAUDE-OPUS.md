# Recette critique de qualité des palettes

> **Document historique.** Point de départ de la recette critique ; ses
> propositions ont été mesurées puis tranchées. Pour l'implémentation, la
> référence est [DECISIONS.md](./DECISIONS.md).

Ce dossier prépare l'investigation de Claude Opus à partir des retours du
mainteneur. Les propositions restent à éprouver sur des composants avant de
modifier le moteur. Les sections distinguent observations, faits vérifiés et
expériences proposées.

**Point de départ recommandé.** Éprouver d'abord un fond Light proche du 50
avec un texte dont la chroma augmente à clarté constante. Les relevés
d'Untitled UI ci-dessous donnent des couples de comparaison précis. Traiter
séparément le support Dark et la géométrie du focus. La recette réelle des
alertes du mainteneur reste nécessaire pour attribuer leurs défauts au moteur.

**Résultats.** Le [dossier de qualité des palettes](./DOSSIER-QUALITE-DES-PALETTES.md)
chiffre les causes, compare trois règles de chroma et trois pistes pour les
fonds teintés, et renvoie aux trois maquettes de validation.

## Priorités et retours à conserver

1. Améliorer le rendu des palettes dans des interfaces réelles.
2. Revoir les crans affectés aux rôles d'usage.
3. Concevoir un onglet de comparaison et d'harmonisation.

| Retour du mainteneur | Question à résoudre |
|---|---|
| Le focus est difficile à retrouver dans `page` lors du mapping d'un bouton `solid`. Le nom `ring` paraît plus concret. | Où exposer ce rôle commun, comment le nommer et comment expliquer `page`, `surface` et `solid` ? |
| Le focus est trop foncé. Celui du design system de Figma paraît plus clair et plus agréable. | Quelle combinaison de couleur, d'épaisseur, de décalage et de support produit le résultat souhaité ? |
| `surface/default` paraît trop foncé en Light ; le cran 50 est préféré au cran 100, même sur blanc. | Le défaut vient-il du mapping, de la courbe de clarté ou de la chroma ? Faut-il un préréglage validé en interface ? |
| En Dark, un badge posé sur `elevation/raised` ne se distingue plus de la carte. | Quels supports réels faut-il inclure dans les règles d'usage et leurs contrôles ? |
| Sur une alerte, Soft donne un fond 50 satisfaisant mais un texte 700 fade. Vivid paraît trop saturé. L'aperçu du plugin masquait ce problème. | Quels réglages ou couplages du moteur empêchent d'obtenir simultanément un fond discret et un texte coloré ? |
| Des palettes utilitaires aux mêmes paramètres ne semblent pas harmonisées aux mêmes crans. Certaines teintes se ressemblent trop. | Quoi aligner, sur quels rôles, avec quelle référence, et comment séparer les teintes sans dégrader les autres usages ? |

Le ressenti sur le texte 700 est conservé comme observation. Il faudra relever
l'alias réellement utilisé : le numéro saisi dans un composant ne suffit pas à
identifier le rôle prévu par le moteur.

## Recherches déjà disponibles

- [Relevé des planches Colors et Notes d’Untitled UI](./ANALYSE-UNTITLED-UI.md) : styles de couleur extraits, conseils du document sur les neutres et les rôles, et essais à mener sans les transformer en recommandations UCM.
- [Collecte Figma des composants Untitled UI](./Collecte/Figma/README.md) : boutons et champs en états au repos, focus et destructive, et une modale Warning distincte d’une alerte contextuelle. Les tooltips neutres sont écartés de la comparaison des palettes.
- [Harmonisation entre palettes](../Harmonisation%20entre%20palettes/DOSSIER-HARMONISATION.md) : mesures, scripts et maquettes existants. La proposition d'intégrer la comparaison à Vérification reste à reconsidérer face à la demande d'un onglet dédié.
- [Élévation et surfaces](../../Archi%20Tokens%20Multi-marques/Elevation%20et%20surfaces/README.md) : collision mesurée entre le badge neutre et la carte en Dark, essais de mappings et limites des résultats.
- [Spécification de Palettes](../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md) : règles actuelles à distinguer des pistes de ce dossier.

## Éléments manquants pour reproduire le ressenti

La recette exacte des alertes Soft/Vivid n'est pas fournie. Les fichiers
existants servent de premiers témoins, sans prouver qu'ils reproduisent ces
alertes. La référence visuelle est identifiée : le kit Community
[Untitled UI, groupe de badges](https://www.figma.com/design/iJscFYgN97zFFr0i2XLeyf/?node-id=1046-8088).
Il est distinct du Simple Design System publié par Figma.

Pour chaque cas réel, conserver la recette exportée, les alias résolus, le
thème, l'intensité, le fond parent et une capture du composant. Pour Untitled
UI, les nœuds et les couleurs inspectés figurent ci-dessous. Ces éléments
distingueront une couleur générée, un mauvais alias et une différence de rendu.

## Ce que le code établit

Les chemins de code ci-dessous partent de la racine de Toolkit. Chercher les
symboles cités pour retrouver la règle après un déplacement de lignes.

| Constat vérifié | Source | Conséquence pour l'enquête |
|---|---|---|
| `page/focus` peint déjà un `ring` dans `SUPPORT_DES_VARIABLES`. `ETAT_DU_FOND.focus` le réutilise. | `packages/kit/src/emplois/dossiers.ts` | Le rôle graphique et le chemin public sont deux décisions distinctes. Déplacer le token ne changera pas sa couleur. |
| En sens normal, les surfaces prennent 100/200/300, leur texte et leur contour 800, le focus 600. En sens inverse, le texte et le contour prennent 900, le focus 700. | `TABLE_DES_DOSSIERS`, même fichier | Le texte 700 signalé n'est pas le mapping actuel de `surface/foreground`. Éprouver aussi le mapping prévu sans supposer qu'il résoudra la fadeur. |
| Le sens dépend du texte des boutons. Light/blanc et Dark/noir sont normaux ; les deux autres combinaisons sont inverses. | `sensDuTheme`, même fichier | Une table « normal/inverse » ne représente pas une table « Light/Dark ». Toute proposition de surface sombre doit traiter cette distinction. |
| G7 compare le focus au fond de page et à `surface/default`. Les garanties ne comparent pas surface et carte. | `packages/kit/src/emplois/garanties.ts` | Un résultat conforme ne prouve ni la visibilité d'un badge sur une carte, ni tous les focus imbriqués. |
| La chroma visée vaut `part × plafond(L, H, gamut)`. | `cranVise`, `packages/couleur/src/rampe.ts` | Une même part ne donne pas la même chroma à deux teintes. Un profil Soft peut manquer de couleur sur certains textes. |
| Les parts effectives dépendent aussi de la référence, du profil porteur et des réglages propres. | `partsDesProfils`, `packages/couleur/src/palette.ts` | Comparer les parts calculées, pas seulement les valeurs communes affichées dans la configuration. |
| L'ancrage remplace un cran calculé par les octets exacts de la référence, dans chaque thème du profil porteur. | `ancrageDe`, `rampesDe`, même fichier | Deux palettes aux mêmes réglages peuvent avoir des crans ancrés de clartés différentes. Les inclure dans les mesures. |
| Le Color shift pondère ses effets autour du pivot ; son effet est nul au pivot. Les deux profils ont leurs dérives. | `poidsA`, `fabriquerRampe`, `rampe.ts` | Une saturation poussée vers un bout n'agit pas uniformément sur les rôles. Vérifier si le texte problématique est proche du pivot. |
| Les fonds Dark reçoivent une atténuation de chroma entre les clartés des crans 50 et 400. | `facteurSombre`, `rampe.ts` ; `fondsSombresDe`, `palette.ts` | Le diagnostic Dark doit distinguer l'atténuation, le mapping et la couleur du support. |
| L'interface de test utilise la palette ouverte, une intensité et `recette.fonds[mode]`. | `couleursDeLInterface`, `packages/plugin-palettes/src/ui/interfaceDeTest.ts` | Elle ne reproduit pas les alias `elevation/raised` du fichier réel, ni une composition de quatre palettes utilitaires. |

### Pourquoi le 50 mérite un essai, sans en faire une règle générale

Dans `packages/couleur/src/nuances.ts`, la courbe Light par défaut vise
`L = 0,975` au cran 50 et `L = 0,95` au cran 100. Le remplacement change
aussi le plafond de chroma. Un essai « 100 contre 50 » mélange donc clarté et
chroma ; il faut un second essai à chroma contrôlée pour identifier la cause.

En Dark, les mêmes numéros visent `L = 0,18` et `L = 0,225`. Passer à 50
assombrit le fond. Le choix préféré en Light ne se transpose pas tel quel en
Dark. Ces valeurs précèdent les réglages, l'ancrage et l'arrondi en sRGB.

### Ce que les recherches antérieures prouvent, et leurs limites

Le [dossier d'élévation](../../Archi%20Tokens%20Multi-marques/Elevation%20et%20surfaces/README.md)
mesure un badge neutre et une carte à `#1A1C1F`, soit 1:1. Sa proposition
sépare les couleurs, mais n'obtient que 1,16:1 entre badge et carte. Elle reste
à juger visuellement. Elle déplace plusieurs partenaires de contraste, dont
le focus vers 800 : cela ne répond pas à lui seul au souhait d'un focus discret.

Le [dossier d'harmonisation](../Harmonisation%20entre%20palettes/DOSSIER-HARMONISATION.md)
attribue les écarts d'une recette à des réglages différents, aux parts et à
l'ancrage. La recette source n'est pas dans le dépôt. Ses résultats sont des
mesures rapportées, non reproduites ici. Ils ne réfutent pas le nouveau retour
sur des paramètres strictement dupliqués : ce cas doit avoir son propre témoin.

Ne pas reprendre ses généralisations sur « le marché » comme des lois. Les
sources externes décrivent des choix précis, rarement une garantie universelle
de poids visuel entre toutes les teintes.

## Mesures complémentaires exécutées

Le [script des témoins](./mesurer-temoins.ts) utilise le moteur du dépôt sur
quatre références : `#ED0007`, `#F7A600`, `#00BD5F`, `#23BEFD`. Elles reprennent
les références citées dans la recherche d'harmonisation, avec des réglages
neufs identiques : parts 0,45/0,95, porteur Vivid, dérives nulles, recette par
défaut. Ce sont des témoins synthétiques, pas la recette du mainteneur.

Les [résultats complets](./MESURES-TEMOINS.json) contiennent les entrées, les
couleurs finales, leur ancrage, leurs coordonnées OKLCH et leurs contrastes.

### Une clarté presque identique laisse des chromas différentes

Avec `L` visé à 0,5 et une part de 0,45, le calcul d'un cran donne :

| Teinte visée | Couleur finale | L relu | C relue |
|---|---|---|---|
| 30° | `#904E44` | 0,5005 | 0,0908 |
| 90° | `#6D6245` | 0,4988 | 0,0452 |
| 150° | `#496D50` | 0,4988 | 0,0618 |
| 210° | `#496A70` | 0,5013 | 0,0392 |
| 270° | `#485DAB` | 0,5011 | 0,1264 |

La chroma varie d'un facteur d'environ 3,23. Cela établit une différence
numérique, pas un rapport universel d'intensité perçue. Les faibles différences
de L viennent ici de la conversion à l'octet.

Sur les quatre palettes complètes, le cran 100 Light/Soft a un écart maximal
de L de 0,0010, mais une chroma comprise entre 0,0112 et 0,0373. Une impression
d'inégalité au cran 100 peut donc subsister avec une clarté presque alignée.
Il faudra vérifier si c'est le mécanisme rencontré dans la recette réelle.

### Assombrir le texte ne lui rend pas forcément sa couleur

| Référence, Light/Soft | Texte 700 : couleur, C | Texte 800 : couleur, C | Contraste 700 sur 50 | Contraste 800 sur 50 |
|---|---|---|---|---|
| Rouge | `#904D44`, 0,0920 | `#713B34`, 0,0774 | 5,84:1 | 8,18:1 |
| Orange | `#745F45`, 0,0473 | `#5A4A34`, 0,0403 | 5,63:1 | 7,92:1 |
| Vert | `#496D52`, 0,0596 | `#38553F`, 0,0504 | 5,46:1 | 7,72:1 |
| Bleu | `#486879`, 0,0460 | `#37515F`, 0,0392 | 5,55:1 | 7,83:1 |

Le passage à 800 augmente le contraste et diminue la chroma dans ces quatre
cas. Il ne constitue donc pas une réponse démontrée à « trop désaturé ».
Le choix esthétique reste à faire sur les alertes rendues.

### L'ancrage peut défaire un accord de clarté

À réglages identiques, l'écart maximal de L au cran 800 Dark/Vivid atteint
0,0304. Deux références y sont ancrées. Au même cran Dark/Soft, sans ancrage,
l'écart vaut 0,0009. Conserver ces crans dans les comparaisons : les retirer
masquerait des couleurs réellement utilisées par les composants.

Reproduire depuis la racine de Toolkit :

```powershell
node --import tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/mesurer-temoins.ts"
```

Le script réécrit uniquement `MESURES-TEMOINS.json`. Il ne juge pas les sept
garanties et ne produit pas de validation visuelle.

## Références externes vérifiées

Les numéros de crans ne sont pas comparables d'un système à l'autre. Relever
les couleurs résolues et leur usage, puis comparer les mêmes composants.

| Source primaire | Fait utile | Essai à en tirer pour UCM |
|---|---|---|
| [Radix Colors, usages des crans](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | Sépare fonds discrets, fonds de composants 3/4/5, bordures, focus et textes 11/12. Le détail recommande notamment 8 pour le focus ; le tableau mentionne aussi 7. Certains pleins demandent un texte sombre. | Comparer des couples fond/texte par rôle. Ne pas transposer un numéro Radix en numéro UCM, ni reprendre ses promesses APCA comme une preuve WCAG 2. |
| [Stripe, conception de son système de couleurs](https://stripe.com/blog/accessible-color-systems) | Recherche ensemble contraste, couleur reconnaissable et poids visuel. Valide dans les composants. Ses badges ont demandé des fonds plus marqués que le niveau le plus clair. | Ajouter un contre-exemple à l'hypothèse « le plus clair est toujours meilleur » : juger aussi la distinction des statuts à petite taille. |
| [Atlassian, élévation](https://atlassian.design/foundations/elevation/) | Distingue plusieurs surfaces et emploie aussi des ombres. En Dark, les niveaux élevés s'éclaircissent. Un fond neutre transparent s'adapte au support. | Tester une surface opaque selon le support, puis une piste avec alpha. Toute transparence doit être composée sur les fonds réels avant mesure. |
| [Untitled UI, fichier du mainteneur](https://www.figma.com/design/iJscFYgN97zFFr0i2XLeyf/?node-id=1046-8088) | Groupe de badges aux fonds 50 et textes 700 ; styles de focus pâles, dont le halo Brand/100. | Témoin visuel prioritaire, avec valeurs et géométrie relevées ci-dessous. |
| [Figma Simple Design System](https://github.com/figma/sds) | Dépôt de démonstration publié par Figma. Son code expose un focus global réutilisé par plusieurs composants. | Comparaison secondaire d'organisation des rôles ; ce n'est pas le kit cité par le mainteneur. |

### Untitled UI : fonds et textes relevés dans le fichier fourni

Lecture du groupe `1046:8088`, page Badges, sans modification du document.
La [capture du groupe](./UNTITLED-BADGES.png) conserve la composition observée.
Les valeurs du tableau sont celles du fond extérieur et du texte du message.
Le petit badge intérieur est blanc, avec un contour coloré : reproduire aussi
cette composition avant d'attribuer tout le résultat au choix du fond.

| Variante et nœud | Style du fond, couleur | Style du texte, couleur | L du texte | C du texte | Contraste texte/fond |
|---|---|---|---|---|---|
| Brand, `1046:8087` | `Brand/50`, `#F9F5FF` | `Brand/700`, `#6941C6` | 0,4980 | 0,1953 | 6,16:1 |
| Error, `1130:86065` | `Red/50`, `#FEF2F2` | `Red/700`, `#B91C1C` | 0,5054 | 0,1905 | 5,91:1 |
| Warning, `1130:84018` | `Yellow/50`, `#FEFCE8` | `Yellow/700`, `#A16207` | 0,5538 | 0,1207 | 4,76:1 |
| Success, `1130:86461` | `Green/50`, `#F0FDF4` | `Green/700`, `#15803D` | 0,5273 | 0,1371 | 4,79:1 |

Les contours des badges intérieurs valent respectivement `#E9D7FE`,
`#FECACA`, `#FEF08A` et `#BBF7D0`. Leurs textes reprennent les couleurs 700.
Les couples et leurs mesures sont aussi dans `MESURES-TEMOINS.json`.

Le texte rouge a une chroma de 0,1905 contre 0,0920 dans le témoin UCM Soft,
pour L à 0,5054 contre 0,4988. Le vert vaut 0,1371 contre 0,0596, avec une
clarté un peu supérieure. Ces écarts appuient l'essai d'un texte plus coloré,
sans démontrer que ces teintes exactes conviennent à la marque du mainteneur.
Leurs références et leurs teintes diffèrent : ce n'est pas encore un essai
où seule la chroma change.

### Untitled UI : le halo pâle est confirmé

Le [bouton primaire au focus](https://www.figma.com/design/iJscFYgN97zFFr0i2XLeyf/?node-id=1041-34650)
porte un fond et un contour `#7F56D9`. Sa base `1041:34651` ajoute un effet
de couleur `#F4EBFF`, sans décalage ni flou, avec une étendue de 4 px.
Un second effet est une ombre noire à 5 %, décalée de 1 px verticalement et
floutée sur 2 px. Le halo appartient ici à un style d'effet.

Le [relevé des boutons et styles](./RELEVE-UNTITLED-FOCUS.json) conserve les
propriétés lues. Les styles incluent `Focus ring/4px primary-100` et
`Shadow/xs focused 4px brand-100`. Le bouton secondaire coloré `1041:35262`
emploie aussi ce halo, sur un fond `#F9F5FF`.

Le contraste du halo seul contre blanc vaut environ 1,16:1. La mesure confirme
sa discrétion, mais ne justifie pas de remplacer directement l'indicateur
contrasté d'UCM par ce halo. Évaluer le changement entre repos et focus du
composant complet. Les couples des badges ne prouvent rien sur ce point.
La lecture effectuée ne constitue pas un audit d'accessibilité du kit.

Pour comparaison, le focus de
[Simple Design System](https://github.com/figma/sds/blob/05525f75192a3aa5d5690c5e41277ebd19d2efe1/src/index.css)
vaut `rgb(0, 106, 255)`. Son
[bouton](https://github.com/figma/sds/blob/05525f75192a3aa5d5690c5e41277ebd19d2efe1/src/ui/primitives/Button/button.css)
utilise un anneau externe décalé. Ces deux exemples ne portent pas la même
direction visuelle.

### Focus : couleur et géométrie se jugent ensemble

Le [critère WCAG 2.2 1.4.11, contraste non textuel](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
traite le contraste de l'information nécessaire à l'identification d'un
composant ou de son état. Pour le focus, les couleurs adjacentes pertinentes
dépendent de sa position, interne ou externe. Un fond décoratif de badge ne
demande pas automatiquement 3:1 contre sa carte.

Le [critère 2.4.13, apparence du focus](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
est de niveau AAA. Il ajoute notamment une aire minimale et un contraste
entre pixels correspondants avec et sans focus. Ne pas le présenter comme
une exigence AA, ni réduire son contrôle à un couple de tokens.

Un anneau très pâle, seul sur un support blanc, peut manquer de contraste.
Éprouver un anneau décalé, un anneau interne et une composition à deux couleurs.
Un halo décoratif peut accompagner un indicateur contrasté. La largeur seule
ne dispense pas de mesurer le contraste requis.

## Corpus comparatif à relever avant de choisir une formule

La collecte doit préciser comment les composants utilisent leurs palettes.
Commencer par quatre systèmes et des cas comparables. Une collecte exhaustive
de bibliothèques ajouterait des variantes sans nécessairement expliquer les
défauts d'UCM.

| Système | Place dans la comparaison | Point d'entrée |
|---|---|---|
| Untitled UI | Préférence visuelle exprimée par le mainteneur ; relevés partiels déjà disponibles | Fichier Figma et nœuds cités ci-dessus |
| Radix Themes et Colors | Relation entre rampe et variantes de composants ; distinguer leur variante `soft` du profil UCM Soft | [Badge](https://www.radix-ui.com/themes/docs/components/badge), documentation des crans citée plus haut |
| Atlassian | Statuts sémantiques et composition sur plusieurs élévations | [Lozenge](https://atlassian.design/components/lozenge), [messages contextuels](https://atlassian.design/foundations/content/designing-messages) |
| Adobe Spectrum | Autre traitement des intensités et des statuts | [Badge de Spectrum 2](https://react-spectrum.adobe.com/Badge) |

Pour Spectrum, choisir une seule génération de composants par série : ne pas
comparer sans le signaler un Badge de Spectrum 2 et une InlineAlert de V3.
Pour chaque système, relever la version du paquet ou du fichier consulté.

### Première collecte

Relever un badge et une alerte contextuelle pour information, succès,
avertissement et erreur, en Light et Dark. Cela représente au plus 64 cas
de base pour quatre systèmes. Un cas absent reste absent ; ne pas inventer
une variante sombre ni assimiler une modale d'alerte à un message contextuel.

Commencer par les variantes discrètes. Ajouter ensuite une variante affirmée,
un bouton au focus et un champ au focus pour comprendre les différences
d'intensité. Ne relever des états interactifs que si le composant les possède.

### Fiche de relevé commune

- Source précise : système, version, composant, variante, nœud ou fichier.
- Contexte : thème, support page/carte, dimensions, taille et graisse du texte.
- Couleurs : fond, titre, texte courant, icône, bordure, lien et focus, séparés.
- Construction : alias sémantique, primitive finale, opacité, ombres et géométrie.
- Résultat : couleurs composées sur le support, L/C/H et contrastes pertinents.
- Preuve : capture du composant et extrait minimal de ses tokens ou styles.

Lire les composants, leurs alias et leurs primitives. Un nom de token ou
une capture seule ne suffit pas à reconstituer la composition. Conserver les
couleurs explicites quand aucun token n'existe et signaler les valeurs non
résolues. Pour un focus, relever aussi l'état au repos.

### Deux comparaisons distinctes

La première conserve chaque système tel qu'il est conçu. Elle explique les
choix d'ensemble : fond très léger, titre coloré, texte courant neutre,
bordure indépendante ou halo associé à un indicateur.

La seconde applique les couples de couleurs relevés à un même composant de
test. Typographie, dimensions et support sont fixes. Elle isole l'effet des
couleurs sans attribuer à la palette une préférence pour les espacements ou
les formes du système d'origine. Identifier cette vue comme une transposition.

Comparer les usages, jamais l'égalité des numéros de crans. Les variantes
`soft`, `subtle` ou `bold` ne désignent pas nécessairement deux rampes comme
Soft/Vivid dans UCM. Une option nommée `highContrast` ne prouve pas AAA.

### Questions auxquelles la collecte doit répondre

1. Les fonds discrets sont-ils surtout plus clairs, moins chromatiques, ou
   transparents ? Comment changent-ils sur une carte Dark ?
2. Le titre, le texte courant et l'icône partagent-ils leur couleur ? Le texte
   courant est-il parfois neutre alors que le titre garde la teinte du statut ?
3. Entre variantes discrète et affirmée, quels rôles changent réellement ?
4. À clarté comparable, quelle chroma les textes colorés conservent-ils ?
5. Les statuts sont-ils harmonisés en clarté, en contraste ou seulement par
   leur composition ? Où se trouvent les exceptions ?
6. Le focus apprécié repose-t-il sur une couleur unique ou sur plusieurs
   changements entre repos et focus ?

Produire des distributions et des exemples plutôt qu'une moyenne unique
des quatre systèmes. Un échantillon de couleurs finales ne révèle pas à lui
seul l'algorithme qui les a produites. La notoriété du système ne remplace
ni la mesure des contrastes ni le jugement visuel du mainteneur.

La collecte doit aboutir à quelques règles candidates, puis à des essais UCM.
Garder des teintes et des composants hors du corpus de calibration pour
vérifier que la règle retenue fonctionne aussi sur des cas inédits.
Cette section décrit le travail à effectuer ; les relevés détaillés disponibles
dans ce dossier portent actuellement sur Untitled UI et les témoins UCM.

## Hypothèses à départager avant de modifier le moteur

| Hypothèse | Expérience isolée | Résultat qui orienterait la décision |
|---|---|---|
| Le mapping 100 est trop présent en Light. | Même palette, même texte, comparer les fonds 50 et 100. | Si 50 est préféré sur plusieurs teintes et tailles sans effacer les statuts, essayer un mapping Light plus discret. |
| La courbe de clarté produit des surfaces trop sombres. | Conserver les rôles et déplacer seulement les valeurs L des fonds. Comparer aussi à C constante dans le gamut. | Si le changement de L suffit, éviter une refonte de la chroma. Vérifier tous les autres rôles qui partagent ces crans. |
| Une part de chroma par profil couple trop fortement fond et texte. | Fixer fond, L du texte et teinte. Faire varier seulement la chroma du texte ; comparer aux possibilités actuelles du Color shift. | Si aucun réglage actuel ne donne le couple préféré dans les deux thèmes, étudier une courbe de chroma par plage d'usage. |
| La référence et son ancrage dégradent les rôles. | Comparer la rampe finale à une rampe calculée avant ancrage, uniquement dans le banc de recherche. | Si l'écart disparaît, documenter le conflit entre référence exacte et rôle harmonisé. Ne pas supprimer l'ancrage par défaut. |
| La composition explique le décalage entre plugin et Figma. | Rejouer les mêmes hexas dans le plugin, sur une page blanche, sur la vraie carte et dans l'alerte réelle. | Si le jugement change avec le support ou la surface occupée, corriger les aperçus et les contextes testés. |
| Une différence d'export, de mode ou de profil explique le rendu. | Comparer couleur générée, variable Figma résolue et couleur peinte ; relever opacité et mode effectif. | Corriger le mapping ou la lecture avant d'optimiser le moteur. |

Le premier essai de couple devrait garder un fond Soft discret et donner au
texte une chroma intermédiaire, à clarté constante. Un texte issu de Vivid
peut servir de borne de comparaison. Cela n'implique pas de mélanger les
profils dans le produit : il faut mesurer le couple obtenu et décider ensuite
comment le représenter.

## Protocole de recette visuelle à confier à Claude

### Corpus et témoins

Commencer avec les quatre utilitaires réels, le neutre et une marque. Ajouter
un jaune, un cyan et une référence peu saturée si le corpus ne les couvre pas.
La petite série sert au choix visuel ; un balayage de teintes éprouvera ensuite
les contraintes numériques.

Construire un banc avec une alerte contenant titre, texte courant, icône et
lien ; un petit badge dans une carte ; un bouton plein ; un champ au focus.
Montrer les quatre statuts ensemble. Garder typographie, tailles, contenu et
espacements identiques entre propositions.

Croiser Light/Dark et Soft/Vivid sur blanc, sur le fond de page configuré et
sur `elevation/raised` réellement résolu. Vérifier aussi les deux couleurs de
texte des boutons ; elles changent le sens et les courbes du thème.

Pour une alerte statique, juger son repos. Pour les éléments interactifs,
inclure survol, appui, focus et focus pendant le survol. Ajouter les états
désactivés au contrôle de non-régression.

### Ordre des essais

1. Capturer le rendu actuel et les données exactes. Reproduire au moins une
   alerte jugée mauvaise et une surface jugée réussie.
2. Comparer 50/100 à texte identique, puis 700/800 ou le cran prévu par le
   sens du thème. Consigner séparément lisibilité et intensité colorée.
3. Faire varier la chroma du texte à L constante, puis celle du fond à L
   constante. Conserver la teinte et signaler toute limite du gamut.
4. Comparer les meilleurs couples sur carte Dark. Réutiliser les essais du
   dossier d'élévation avant de proposer d'autres crans.
5. Tester les géométries de focus avec les supports retenus.
6. Rejouer le résultat sur des références non utilisées pour le réglage.

Limiter chaque planche de choix à l'actuel et trois variantes. Alterner leur
ordre et masquer les noms de solution pendant le jugement. Le mainteneur
note séparément : fond discret, texte coloré, lisibilité, séparation de la
carte, distinction des statuts et cohérence du groupe. Une préférence visuelle
doit mentionner le composant et le contexte.

### Mesures et critères de sortie

Pour chaque couleur, enregistrer l'hexa final, L/C/H, la part du plafond,
le rôle et l'ancrage. Pour chaque composition, mesurer texte/fond, focus/support
et surface/carte. Afficher séparément l'écart de L, la chroma et la distance
Oklab entre palettes ; une distance totale ne dit pas quelle grandeur changer.

Une variante devient candidate si le mainteneur la préfère dans les cas
prioritaires, si les garanties attendues tiennent et si aucune régression
visuelle importante n'apparaît sur les témoins. Consigner les exceptions.
Un seuil de distance colorimétrique reste un seuil d'expérimentation tant
qu'il n'a pas été confronté à ces composants.

## Décisions de rôles à étudier après les premiers essais

### Où ranger et comment nommer le focus

Dans UCM, `page`, `surface` et `solid` sont des dossiers de rôles. Ils ne
désignent pas nécessairement trois collections Figma. Le dossier `page`
regroupe actuellement des peintures utilisées au contact du support général.
Cela explique le rangement du focus externe, mais le retour du mainteneur
établit une difficulté réelle de découverte.

| Option | Intérêt | Conséquence à mesurer |
|---|---|---|
| Garder `page/focus`, mieux montrer les mappings de composants | Migration limitée ; rôle déjà commun | Le nom continue à surprendre pendant la recherche d'un token de bouton. |
| Exposer un rôle transversal tel que `focus/ring` | Nomme l'état et la peinture ; utilisable par bouton, champ et lien | Nouveau chemin et migration des références. Vérifier si plusieurs supports demandent plusieurs valeurs. |
| Ajouter des alias `solid/focus` et `surface/focus` vers un rôle commun | Retrouvable dans chaque famille | Davantage d'alias à documenter ; risque de suggérer des valeurs indépendantes. |

Recommandation à éprouver : un rôle transversal avec des exemples de mapping.
`ring` seul indique la forme, mais perd l'état focus. Déplacer l'unique token
dans `solid` expliquerait moins bien son usage sur un champ ou un lien.

### Des défauts validés en interface

Comparer deux pistes : conserver les courbes avec un mapping revu, ou proposer
un préréglage de courbes et de chroma validé sur le corpus. Le mot « optimal »
demande un objectif défini : discrétion des fonds, couleur des textes,
contraste ou fidélité à une marque peuvent entrer en conflit.

Un état « personnalisé » pourrait indiquer un écart au préréglage. Il ne
doit pas transformer toute modification en défaut de qualité. Définir les
champs qui composent le préréglage, les écarts affichés et le geste de retour.
Conserver les recettes existantes reproductibles lors d'une évolution du moteur.

## Onglet de comparaison et d'harmonisation

La demande actuelle porte sur un onglet dédié. Reprendre les données et les
maquettes du dossier existant, puis comparer cette organisation à la place
envisagée dans Vérification. L'emplacement ne doit pas retarder les essais
de qualité du moteur.

### Première portée proposée

| Question | Proposition de départ, à valider |
|---|---|
| Combien de palettes ? | Deux ou plus ; quatre utilitaires sélectionnés pour le premier cas. Toutes les palettes sélectionnées participent au calcul, même hors écran. Fixer une limite seulement après mesure des performances et de la lisibilité. |
| Quelle référence ? | Courbe commune par défaut, palette modèle en option, médiane du groupe comme troisième essai. La médiane limite le poids d'un cas extrême, sans garantir un résultat esthétique. |
| Quoi aligner ? | L d'abord, avec contrôle du contraste sur les supports. Séparer ensuite chroma et contraste cible : ces objectifs ne sont pas équivalents. |
| Toute la palette ? | Choix par rôles : fonds de surface, textes, pleins, ou ensemble. Traduire ces rôles dans chaque thème ; les « tons clairs » ne désignent pas les mêmes numéros en Light et Dark. |
| Quelle granularité ? | Montrer les conséquences dans les deux thèmes et les deux profils, même si la sélection porte sur une partie. Les réglages actuels peuvent toucher plusieurs zones. |
| Quelles palettes exclure du geste ? | Une palette figée reste comparable, mais n'est pas recalculée implicitement. Signaler les rôles absents d'une palette libre. Traiter explicitement l'intensité unique et les références verrouillées. |
| Où corriger la teinte ? | Rester dans la comparaison pour prévisualiser un déplacement simple. Ouvrir Création pour les courbes détaillées, avec le groupe conservé au retour. |
| Comment appliquer ? | Une proposition explicite avant/après, une validation du groupe et une annulation complète. Un échec indique les palettes ou contraintes concernées. |

Le contrôle actuel `distanceDePalettes` de
`packages/couleur/src/alertes.ts` compare une moyenne sur 500/600/700 en Light.
Entre deux palettes à deux intensités, il ne compare que Vivid. Il ne suffit
donc pas pour juger quatre fonds 100 Soft ou leurs textes Dark.

### Écarter des teintes trop proches

Une action « plus rouge » ou « plus jaune » doit proposer une direction
compréhensible, puis montrer les couleurs produites. Définir le secteur de
teinte visé ; un simple signe de rotation ne décrit pas toujours la direction
attendue autour du cercle. Près du gris, la teinte n'est pas un levier fiable.

Préférer une contrainte sur des rôles nommés à « N crans différents ». Il est
possible de satisfaire N sur des nuances peu utilisées tout en gardant deux
badges indiscernables. Pour chaque paire, mesurer les rôles sélectionnés,
inclure les deux thèmes et afficher le plus petit écart ainsi que les cas
encore trop proches.

La recherche peut déplacer une seule palette, les autres étant verrouillées.
Tester des rotations bornées, recalculer gamut, ancrage et contrastes, puis
retenir le plus petit déplacement admissible. Prévoir un résultat « aucune
proposition dans ces contraintes ». Une recherche qui atteint son budget
sans solution ne prouve pas l'impossibilité mathématique.

Garder un libellé ou une icône distinctifs pour chaque statut. Une simulation
des déficiences de vision des couleurs aidera la revue, sans certifier à elle
seule la distinction pour tous les utilisateurs.

## Périmètre technique d'une future modification

| Changement envisagé | Fichiers et conséquences à examiner |
|---|---|
| Courbes, parts ou chroma | `packages/couleur/src/nuances.ts`, `rampe.ts`, `palette.ts`, `reglages.ts`, `garantie.ts`, `limites.ts` ; tests de propriétés, ancrage, fonds sombres et promesses. |
| Mapping des rôles | `packages/kit/src/emplois/dossiers.ts`, `garanties.ts` et leurs tests ; lecteurs des rôles, crans requis, aperçu, planches et plan des variables. Le cran 50 est actuellement facultatif. |
| Contexte `raised` | Définir sa provenance, sa palette neutre et ses modes avant d'étendre les garanties. Reprendre la passation du dossier d'élévation. |
| Nouveau chemin du focus | Rechercher `page/focus` dans Toolkit et les consommateurs ; prévoir alias transitoires, suivi des variables et migration des liaisons Figma. |
| Comparaison et gestes de groupe | `alertes.ts`, modèle pur du groupe, recette si groupes persistants, `edition.ts`, `ui/frontiere.ts`, nouveau panneau et galerie. |

Une modification des valeurs, un renommage de token et un changement de format
sont des migrations différentes. La version de recette, celle de `tokens.json`
et celle du contrat sont distinctes. Lire la
[politique de compatibilité](../../../../../docs/format/COMPATIBILITE.md) et
l'[historique du format](../../../../../docs/format/CHANGELOG-FORMAT.md)
avant de fixer la stratégie. Ne pas déduire une montée de version du contrat
du seul déplacement d'un cran.

## Solution recommandée à prototyper : courbes par usage sous contraintes

Cette proposition conserve deux rampes Soft/Vivid et les contrôles de
contraste. Elle change leur construction : des cibles de clarté et de chroma
décrivent les zones d'usage, puis le moteur ajuste leurs couples de couleurs.
Les paramètres restent à calibrer sur les composants du corpus.

### Donner un sens visuel aux deux profils

| Usage | Soft proposé | Vivid proposé |
|---|---|---|
| Fond de surface | Teinte légère, support encore perceptible | Teinte plus présente, sans approcher automatiquement le maximum du gamut |
| Texte et icône sur surface | Couleur identifiable, avec le contraste demandé | Couleur plus soutenue, avec le même niveau de contraste demandé |
| Fond plein | Couleur modérée | Accent plus intense |
| Bordure décorative | Discrète | Plus colorée si le composant le demande |
| Bordure nécessaire et focus | Visibilité mesurée dans la composition | Même exigence de visibilité ; l'intensité ne remplace pas le contraste |

Soft ne doit pas imposer la même réduction de chroma au fond et au texte.
Vivid ne doit pas pousser toutes les zones vers le maximum disponible.
Conserver un écart perceptible entre profils là où le gamut le permet ;
signaler les zones où leurs résultats se rapprochent.

### Remplacer la part constante par une courbe de chroma calibrée

Le calcul actuel `C = part × plafond(L, H)` lie fortement le résultat à la
forme du gamut. Prototyper une cible `C` selon le profil, le mode, la zone
d'usage et la teinte, avec une interpolation continue entre points de contrôle.
Le plafond reste une limite de réalisation, pas la seule définition de la
couleur souhaitée.

La première expérience peut conserver la formule actuelle avec une part
variable selon la zone. Elle départagera le manque de réglage par usage et
le problème de la normalisation au plafond. Comparer ensuite une cible de
chroma absolue, bornée par le gamut. Aucune de ces formules ne prouve à elle
seule un poids visuel égal entre teintes.

Calibrer quelques points sur des teintes représentatives, puis interpoler
sur le cercle. Ne pas écrire de correction selon le nom `warning` ou `success`.
Prévoir le cas des références peu saturées : conserver leur intention sans
injecter une teinte arbitraire dans les gris.

### Résoudre les couples tout en gardant des rampes régulières

1. Fixer le contexte : page, carte, mode, couleur du texte des boutons,
   référence et cible de contraste.
2. Générer les deux rampes depuis les courbes cibles. Affecter les rôles aux
   crans en distinguant le mode du sens du thème.
3. Évaluer ensemble tous les couples requis, y compris les états et les
   supports déclarés. Partir des couleurs finales à l'octet, après ancrage.
4. Chercher un ajustement borné de L et C qui conserve la teinte autant que
   possible. Favoriser la chroma du texte souhaitée et la discrétion du fond,
   sous les contraintes de contraste et de régularité de la rampe.
5. Recalculer tous les couples après chaque proposition. Un cran partagé
   par plusieurs rôles ne se corrige pas indépendamment dans chaque rôle.

Le contraste est une contrainte à respecter, pas une grandeur à maximiser.
Une recherche qui rend tout texte presque noir peut réussir numériquement
et manquer l'objectif visuel. Une petite marge au-dessus des seuils peut
éviter les propositions fragiles ; sa valeur reste à calibrer.

Conserver l'ordre des crans, éviter les ruptures de chroma et limiter les
écarts à la courbe commune du groupe. Une impossibilité sous les contraintes
retenues doit être visible. Ne pas publier une réussite à partir d'une moyenne
qui masque un couple en échec.

### Séparer intensité et cible de contraste

Chaque profil possède les mêmes contrôles AA et AAA. Pour le texte courant,
les seuils sont 4,5:1 et 7:1 ; pour le grand texte, 3:1 et 4,5:1. Sources :
[WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
et [WCAG 1.4.6](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html).
Sans taille et graisse connues, retenir le seuil du texte courant.

Proposer une cible de génération AA ou AAA, indépendante de Soft/Vivid,
en s'appuyant sur les seuils déjà présents dans la recette. Afficher les deux
résultats mesurés dans chaque cas. Choisir AA n'interdit pas qu'un couple
atteigne AAA ; choisir AAA peut demander un texte plus sombre en Light.
Le résultat porte sur les couples et supports contrôlés, pas sur une
conformité globale de l'interface.

Le focus possède ses propres critères. Une cible AAA textuelle ne prouve
pas son aire ni son contraste entre états, que traite
[WCAG 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html).
Séparer au besoin un halo décoratif pâle et l'indicateur contrasté.

### Traiter les supports et la référence exacte explicitement

Les fonds de surface Light peuvent rester proches du 50. En Dark, leur
cible doit tenir compte de la carte sur laquelle ils sont posés. Définir
des supports connus ; si une même couleur ne convient pas à tous, proposer
un alias dépendant du contexte ou une bordure. Le seuil de séparation
visuelle entre surface et carte reste à établir par la recette visuelle.

L'ancrage exact reste une contrainte du premier prototype. Lorsque son cran
contredit le rôle attendu, montrer le conflit. Une évolution possible serait
de conserver la référence exacte dans un token dédié et de libérer les crans
sémantiques. Ce changement remettrait en cause un invariant actuel : il
demande une décision et une migration, pas une correction silencieuse.

### Premier prototype utile

Comparer le moteur actuel, une part de chroma variable par zone et une cible
de chroma bornée par le gamut. Garder les mêmes références et les mêmes
composants. Commencer par quatre utilitaires et le neutre, dans les deux
thèmes, avec des cibles AA puis AAA.

Retenir la solution la plus simple qui améliore les alertes et badges sans
dégrader les boutons, le focus ou les palettes peu saturées. Étendre ensuite
le balayage de teintes et tester des références inédites. La conception de
l'onglet de comparaison pourra reprendre ce banc et ses mesures.

## Consigne prête à transmettre à Claude Opus

> Lis ce dossier, puis les sources de code et les recherches qu'il cible.
> Traite d'abord la qualité des palettes dans des composants réels, ensuite
> les crans et rôles, enfin l'onglet de comparaison.
>
> Commence par reproduire les alertes Soft jugées fades et les surfaces Dark
> confondues avec leur carte. Utilise les témoins synthétiques si la recette
> réelle manque, en signalant cette limite. Vérifie les alias, le thème et
> l'intensité avant d'attribuer un problème au moteur.
>
> Pour chaque problème, donne le constat reproduit, la cause démontrée ou
> supposée et l'expérience qui les départage. Compare des variantes où une
> seule grandeur change. Produis une planche de composants avec l'actuel et
> quelques alternatives mesurées. Soumets les préférences esthétiques au
> mainteneur ; un contraste conforme ne vaut pas validation visuelle.
>
> Réutilise les scripts et maquettes existants. Examine leurs limites,
> notamment l'absence de la recette historique d'harmonisation et la portée
> réduite du contrôle actuel de palettes proches. Utilise les relevés
> d'Untitled UI et compare repos/focus avant de reprendre son halo pâle.
>
> Propose au plus trois solutions par décision, leurs effets sur les deux
> thèmes, les références ancrées et les consommateurs. Termine par une
> recommandation justifiée, ses résultats et les décisions encore ouvertes.
> Prépare ensuite le plan d'implémentation et les migrations correspondant
> à la solution retenue.
>
> Complète ce document au fur et à mesure avec les résultats reproductibles.
> Conserve les observations du mainteneur et distingue-les de tes conclusions.
