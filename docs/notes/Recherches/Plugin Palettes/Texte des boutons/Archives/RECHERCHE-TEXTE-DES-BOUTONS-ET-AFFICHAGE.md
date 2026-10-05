# Texte blanc ou noir sur les boutons, et commande Light/Dark : recherche et solutions

> Archivé : ce document est réuni dans le [dossier de recherche](../DOSSIER-TEXTE-DES-BOUTONS.md),
> qui fait foi. Ses liens relatifs datent de son ancien emplacement.

**Statut :** recherche. Propositions à éprouver sur la
[maquette](../MAQUETTE-MODES-ET-AFFICHAGE.html), sans décision du mainteneur
ni modification du code, de la recette ou des formats publiés.

Ce document répond aux [notes de recette](./NOTES-RECETTE-MODES-ET-AFFICHAGE.md)
et aux six questions de l'[étude préparatoire](./ETUDE-MODES-ET-AFFICHAGE-GLOBAL.md).
Dans le code, le bouton est l'emploi `solid` et son texte l'emploi
`on-solid`. Ce document dit « bouton » et « texte des boutons ».

## En bref

1. **Où on règle.** Dans les Réglages communs, carte « Couleurs de fond ».
   Sous le fond de chaque thème, un nouveau choix : « Texte des boutons :
   Clair | Sombre ». Par défaut, Clair en Light et Sombre en Dark : le
   comportement actuel. Le choix vaut pour toutes les palettes.
2. **Ce qui se passe.** Un texte blanc ne se lit que sur un bouton foncé.
   Choisir « Clair » en Dark change donc aussi la couleur du bouton : en
   Dark, il reprend les couleurs du bouton du thème Light. Le texte reste
   lisible, au moins 5,29:1.
3. **Ce qui change dans Figma.** Les palettes et leurs variables ne changent
   pas. Les planches sont à redessiner ; Gestion les signale « À actualiser ».
4. **À décider.** En Dark, un bouton foncé se détache moins de la page
   presque noire, et la garantie « bouton survolé contre la page » échoue.
   WCAG ne l'exige pas pour un bouton qui porte un texte. Proposition : le
   plugin ne la vérifie plus dans ce cas, et le dit.
5. **Commande Light/Dark.** Un seul bouton Light/Dark, dans la barre de la
   palette, visible pendant le défilement. Les choix Soft/Vivid restent dans
   leur carte, marqués « Régler » ou « Afficher ».

## Mesures

Elles se rejouent depuis la racine du dépôt :

```sh
npx tsx "docs/notes/Recherches/Plugin Palettes/Texte des boutons/mesurer-polarites.ts"
```

Le [script](../mesurer-polarites.ts) écrit [MESURES-POLARITES.json](../MESURES-POLARITES.json)
et actualise les couleurs de la maquette. Il couvre quatorze références,
celles de [MESURES-ENCRES.json](../MESURES-ENCRES.json) et de l'[étude des
usages indexés](../../../Archi%20Tokens%20Multi-marques/Collection%20usage/1%20Usages%20indexes%20et%20catalogue/04-EXPERIENCES.md),
chacune à une et à deux intensités : 42 rampes par thème. La recette est
celle par défaut, avec le préréglage Tailwind. Chaque cas compte 168 mesures
du texte sur les quatre états du bouton.

Résultats :

- Le texte sombre des boutons en Dark découle de deux règles du moteur : le
  bouton vise la nuance 700 dans les deux thèmes, et son texte vaut le fond
  du thème. Le thème Dark place la 700 à la clarté 0,67. Aucun texte clair
  ne s'y lit : 0 mesure sur 168 atteint 4,5:1.
- Changer la couleur du texte sans changer le bouton échoue sur les 168
  mesures, dans chaque thème.
- Un bouton qui porte un texte clair à 4,5:1 sur quatre états occupe les
  clartés 0,50 à 0,27. Ce sont les nuances 700 à 950 du thème Light. En Dark,
  le bouton à texte clair reprend donc les couleurs du bouton Light : 168
  mesures sur 168, minimum 5,29:1, comme en Light. Le cas symétrique, un
  texte sombre en Light, reprend les nuances 700 à 950 du thème Dark : 168 sur
  168, minimum 5,68:1.
- Aucune rampe ni aucune variable primitive ne change. Les garanties et la
  planche changent, et plus tard les alias de la collection `theme`, quand
  UCM Palettes l'écrira.
- La garantie 14, le bouton survolé contre le fond de page à 3:1, échoue
  alors sur 42 mesures sur 42. Aucune nuance ne peut tenir à la fois le texte
  et la page sur quatre états : la zone possible contient une seule nuance
  en Dark, aucune en Light.
- Le noir ou le blanc choisi automatiquement pour chaque bouton rend le texte
  actuel sur les 84 rampes. Il ne répond pas à la demande.
- Material 3, Atlassian et shadcn posent un texte sombre sur un bouton clair
  en Dark, comme UCM. Primer, Radix et Carbon gardent un texte blanc sur un
  bouton moyen, au prix d'un contraste inférieur à 4,5:1 sur certains états
  ou d'un bouton qui se détache peu de la page.

## 1. Pourquoi le moteur pose un texte sombre en Dark

### Faits

La table des emplois donne `solid: 700` et `'on-solid': 'fond'`
([`emplois.ts`](../../../../../../packages/kit/src/emplois/emplois.ts)). Le
calcul des garanties prend pour texte du bouton `recette.fonds[mode]`
([`promesses.ts`](../../../../../../packages/couleur/src/promesses.ts)). Les
variables de `usage` font viser `on-solid` à la nuance 50 de `neutral` dans
`theme` ([`usages.ts`](../../../../../../packages/kit/src/emplois/usages.ts)).
En Dark, cette nuance est la plus sombre.

La courbe de luminosité du thème Dark croît : 0,18 à la nuance 50, 0,67 à la
700, 0,93 à la 950 ([`nuances.ts`](../../../../../../packages/couleur/src/nuances.ts)).
L'architecture le veut ainsi : un même numéro donne le même contraste contre
le fond de page dans les deux thèmes, et un état s'éloigne du fond de page
([ARCHITECTURE-FINALE, sections 1 et 4](../../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)).
En Dark, le bouton 700 est donc plus clair que la page, et son texte doit
être sombre.

La planche, l'Interface de test, la carte des garanties et, dans
l'architecture, les composants qui citent `usage.*.on-solid` montrent tous ce
texte sombre. Le comportement suit le modèle. Il ne résulte d'aucune
inversion accidentelle.

### Ce qui se modifie

Un texte clair en Dark reste compatible avec le moteur. Il n'oblige à changer
ni les courbes, ni la fabrication des rampes, ni les garanties du texte sur
`surface`. Il oblige à séparer le bouton de la nuance 700 du thème quand le
texte est changé : `text` garde la 700 de son thème, et le bouton prend
d'autres couleurs. La table des emplois dépend alors du texte choisi pour
chaque thème.

## 2. Ce que la couleur du texte impose au bouton

Un bouton porte son texte à 4,5:1 et se détache de la page à 3:1 sur une
seule zone de clarté. Le script la calcule pour un gris, dont la clarté OKLCH
vaut la racine cubique de la luminance. Les fonds sont ceux de la recette par
défaut, `#F7F7F7` et `#121212`.

| Thème | Texte des boutons | Clartés possibles | Nuances Light dedans | Nuances Dark dedans |
|---|---|---|---|---|
| Light | clair, actuel | 0 à 0,552 | 700 à 950 | 50 à 500 |
| Light | sombre | 0,587 à 0,652 | aucune | aucune |
| Dark | clair | 0,491 à 0,552 | 700 | aucune |
| Dark | sombre, actuel | 0,587 à 1 | 50 à 500 | 700 à 950 |

Avec le texte actuel, le texte et la page ont la même clarté : le bouton se
place de l'autre côté des deux, et la zone est large. Avec le texte changé,
le bouton se place entre le texte et la page. La zone se réduit à six
centièmes de clarté et ne loge pas quatre états.

Il faut donc renoncer à l'une de ces trois exigences :

1. quatre états distincts du bouton ;
2. le texte lisible à 4,5:1 dans chaque état ;
3. le bouton détaché de la page à 3:1, que la garantie 14 juge au survol.

Les solutions qui gardent les deux premières lâchent la troisième. Material 3,
Atlassian et shadcn font ce choix pour le texte actuel, et la section 4 le
discute pour le texte changé.

## 3. Les solutions comparées

| Solution | Ce que fait le designer | Texte lisible, 4 états | Garantie 14 | Palettes et variables | Avis |
|---|---|---|---|---|---|
| S1 Changer seulement le texte | Choisit le texte ; le bouton reste à 700 | 0 sur 168, en Light comme en Dark | 42 sur 42 | Inchangées | Écartée |
| S2 Le bouton prend les couleurs de l'autre thème | Choisit le texte par thème ; le bouton reprend les nuances 700 à 950 du thème qui porte ce texte | 168 sur 168, minimum 5,29 en Dark, 5,68 en Light | 0 sur 42 | Inchangées | Recommandée |
| S3 Le bouton descend dans son thème | Choisit le texte ; le bouton prend les nuances 500 à 200 de son thème | 168 sur 168, minimum 5,50 en Dark, 5,70 en Light | 0 sur 42 | Inchangées | Variante |
| S4 Des nuances de bouton fabriquées exprès | Choisit le texte ; le moteur fabrique quatre nuances de bouton par thème | Non mesuré | À construire | Nouvelles variables | Plus tard |
| S5 Noir ou blanc automatique | Rien ; le texte suit chaque bouton | Identique à l'actuel | 42 sur 42 | Inchangées | Ne répond pas |
| S6 Texte choisi par palette | Choisit le texte de chaque palette, par exemple un jaune à texte sombre | Selon S2 ou S3 | Selon S2 ou S3 | Inchangées | Plus tard |

### S1 : changer seulement le texte

L'interrupteur que les notes envisagent changerait `on-solid` sans toucher au
bouton. Les 168 mesures échouent dans chaque thème : 1,02:1 au pire en Dark,
1,05:1 en Light. La maquette montre cette solution comme contre-exemple.

### S2 : le bouton prend les couleurs de l'autre thème

**Règle.** Pour chaque thème, la recette porte la couleur du texte des
boutons, claire ou sombre. Un texte clair prend un bouton aux nuances 700,
800, 900 et 950 du thème Light ; un texte sombre, aux mêmes nuances du thème
Dark. Le texte vaut le fond de ce thème. Le défaut, texte clair en Light et
sombre en Dark, rend le comportement actuel à l'octet près.

**Mesures.** En Dark avec un texte clair, les 168 mesures tiennent, minimum
5,29:1 : ce sont les mesures du thème Light, puisque les couleurs sont les
mêmes. En Light avec un texte sombre, minimum 5,68:1, celles du thème Dark.
La chroma moyenne du bouton vaut 0,086 au repos et 0,051 au dernier état,
comme en Light. Le plus petit écart entre deux états voisins vaut 0,069 ΔEok.

**Ce que le designer voit.** Le bouton à texte clair ne change pas entre les
thèmes, comme chez Carbon ou dans l'échelle Radix. Ses états foncent dans les
deux thèmes. En Dark, ils se rapprochent de la page : le repos mesure 2,76 à
3,31:1 contre `#121212`, le survol 2,00 à 2,32:1.

**Règle des états.** La section 4 de l'architecture dit qu'un état s'éloigne
du fond de page. Avec le texte actuel, le texte et la page ont la même clarté
et les deux formulations coïncident. Avec le texte changé, la règle qui garde
le texte lisible est : un état s'éloigne de la couleur de son texte.

**Limite d'interface.** En Dark, les couleurs du bouton appartiennent à la
rampe Light, que le nuancier du thème Dark ne montre pas. L'accolade `solid`
ne peut plus pointer sur la rampe affichée. La maquette propose une rangée
« Bouton » de quatre pastilles sous les rampes, présente seulement quand le
texte est changé.

### S3 : le bouton descend dans les nuances de son thème

**Règle.** Avec le texte changé, le bouton prend les nuances 500, 400, 300 et
200 de son thème, de la plus proche du texte vers la page.

**Mesures.** Les clartés valent presque celles de S2 : 0,49, 0,40, 0,33 et
0,275 en Dark, contre 0,50, 0,42, 0,34 et 0,27. Les 168 mesures tiennent,
minimum 5,50:1 en Dark. Le réglage « Fonds du thème Dark » retire de la
chroma aux nuances 50 à 300 ([MOT-28]) : au dernier état, la chroma moyenne
tombe à 0,031 contre 0,051 pour S2. Pour le bleu `#2563EB` en Vivid, elle
passe de 0,233 au repos à 0,096. Les états appuyés grisent, et le plus petit
écart entre états descend à 0,052 ΔEok.

**Avantage.** Le bouton reste dans la rampe affichée, et l'accolade `solid`
garde sa place dans le nuancier.

### S4 : des nuances de bouton fabriquées exprès

Le moteur fabriquerait, pour chaque palette, intensité et thème, quatre
nuances de bouton à des clartés choisies, en gardant la part de chroma du
profil. C'est le scénario des notes : « ça actualise le calcul de toutes les
palettes existantes, qui doivent être ensuite ré-écrites sur Figma ». Il
ajoute huit variables par intensité et par palette, une nouvelle notion dans
la recette, de nouvelles limites et une nouvelle grille sur la planche. Rien
ne le justifie tant que S2 ou S3 donne des couleurs acceptables. Le script ne
le mesure pas.

### S5 : le noir ou le blanc choisi automatiquement

Le nuancier et la planche emploient déjà ce choix pour leurs étiquettes
(`noirOuBlanc`, [`planche/modele.ts`](../../../../../../packages/plugin-palettes/src/planche/modele.ts)).
Appliqué aux boutons actuels, il rend le blanc sur les nuances 700 à 950 du
thème Light et le noir sur celles du thème Dark : aucune des 84 rampes ne
diffère du texte actuel. Il ne sert qu'aux palettes libres et figées, qui
n'ont ni emplois ni garanties, dans l'Interface de test.

### S6 : un texte choisi par palette

Radix destine ses échelles jaune, ambre, citron vert, menthe et ciel à un
texte sombre sur les nuances 9 et 10. Un texte choisi par palette donnerait
le même résultat dans UCM. `usagesDeLaPalette` écrit déjà un `on-solid` par
palette : le chemin existe. Deux boutons de deux palettes voisines auraient
toutefois des textes opposés dans le même écran. L'avis est d'attendre une
demande de marque réelle.

### La couleur exacte du texte

| Couleur du texte | Light, texte clair | Dark, texte clair | Light, texte sombre | Dark, texte sombre |
|---|---|---|---|---|
| Gris de la recette, `#F7F7F7` ou `#121212` | 5,29 | 5,29 | 5,68 | 5,68 |
| Blanc ou noir purs | 5,67 | 5,67 | 6,37 | 6,37 |

Le gris de la recette est le texte actuel. Dans l'architecture, il correspond
à la nuance 50 de `neutral` de chaque thème, et `primitives` porte aussi
`colors/white` et `colors/black`. Les deux choix tiennent les seuils ; la
maquette les montre.

## 4. La garantie 14 quand le texte est changé

La garantie 14 juge le bouton survolé, `solid+1`, contre le fond de page à
3:1 ([spécification, section 11.2](../../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md)).
Sous S2 et S3, ses 42 mesures échouent par thème, au pire 2,00:1 en Dark et
1,79:1 en Light. La section 2 montre qu'aucune nuance ne corrige ce résultat.

Le critère WCAG 1.4.11 n'exige pas de frontière contrastée pour un bouton dont
le texte indique la présence du contrôle. Il n'exige pas non plus de contraste
entre l'état de repos et l'état de survol. L'anneau de focus reste exigé, et
les garanties 12 et 13 le jugent sans changement : l'anneau est posé sur la
page, à distance du bouton.

| Option | Effet | Avis |
|---|---|---|
| Ne pas vérifier la garantie 14 quand le texte est changé, et le dire dans la carte des garanties et sur la planche | 18 garanties vérifiées dans ce thème, une note nomme la raison | Recommandée |
| Vérifier le repos à la place du survol | 31 rampes sur 42 tiennent en Dark sous S2, aucune en Light | Écartée : le résultat dépend de la teinte |
| Ajouter un contour au bouton, un nouvel emploi | Le bouton se détache par son bord | À étudier si le mainteneur exige la séparation |
| Vérifier la garantie 14 et laisser l'échec | Toutes les palettes affichent des garanties manquées | Écartée |

`ucm check` ne mesure pas aujourd'hui le contraste d'une paire qu'il
reconnaît : la [sonde des usages indexés](../../../Archi%20Tokens%20Multi-marques/Collection%20usage/1%20Usages%20indexes%20et%20catalogue/04-EXPERIENCES.md)
passe sans constat un `on-solid` égal à son `solid`. Le choix sur la
garantie 14 ne change donc rien à ce contrôle tant que cette mesure n'existe
pas.

Une garantie non vérifiée doit rester distincte d'une garantie tenue, comme
le demandent les [critères des usages indexés](../../../Archi%20Tokens%20Multi-marques/Collection%20usage/1%20Usages%20indexes%20et%20catalogue/03-MODELE-PROPOSE.md).

## 5. Ce que S2 change, partie par partie

| Partie | Changement | Conséquence pour l'existant |
|---|---|---|
| Recette | Un champ par thème, par exemple `textesDesBoutons: { light: 'clair', dark: 'sombre' }` ; variante blanc ou noir purs | Version de format à trancher, voir plus bas |
| Kit, emplois | `on-solid` suit le texte choisi ; le bouton prend les nuances du thème qui porte ce texte ; la garantie 14 se vérifie seulement sous le texte actuel | `@ucm-kit/core/emplois` monte d'une version mineure ; Palettes et `ucm check` lisent la même fonction |
| Moteur, garanties | `designer` lit le bouton dans la rampe du thème qui porte le texte, et le texte dans le fond de ce thème | L'empreinte de la recette change dès que le champ s'écarte du défaut |
| Rampes et variables primitives | Aucun changement | Les variables écrites restent « À jour » dans Gestion |
| Planche | Les exemples de boutons et leurs garanties changent | Les cadres passent « À actualiser » par leur empreinte ; Gestion propose de les redessiner |
| Interface du plugin | Ligne « Texte des boutons » dans « Couleurs de fond » ; rangée « Bouton » du nuancier ; Interface de test, garanties, rapport et import lisent le réglage | Les tests Chromium couvrent les quatre combinaisons |
| Architecture, `theme` | Le bouton passe par `theme.<palette>.solid.<rang>` et son texte par `theme.on-solid`, dont la cible dépend du mode | `theme` gagne 41 variables pour six marques ; `usage` garde ses 226 variables et change ses alias |
| `ucm check` | Le diagnostic des emplois reconnaît un usage par son chemin dans `usage` ; à vérifier sur la nouvelle chaîne d'alias | Le contrôle numérique des paires reconnues n'existe pas encore |

### `theme` et la décision D2

D2 fait de `theme` le seul endroit où le thème se choisit, par une règle sans
choix du designer. Sous S2, la règle lit le réglage de la recette, comme
l'élévation lit ses deux valeurs dans `color-utilities`
([ARCHITECTURE-FINALE, section 6](../../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)).
Exemple, un texte clair dans les deux thèmes :

```text
usage.primary.solid.hover     →  theme.primary.solid.hover
theme.primary.solid.hover     light → brand.palette.primary.light.800
                              dark  → brand.palette.primary.light.800
usage.primary.on-solid        →  theme.on-solid
theme.on-solid                light → color-utilities.neutral.light.50
                              dark  → color-utilities.neutral.light.50
```

Ces variables de `theme` sont à créer même sous le texte actuel. Changer le
réglage ne changera alors que des cibles dans `theme`, jamais la forme du
graphe que les composants citent. Le compte : quatre états pour chacune des
dix palettes de couleur, soit `primary`, `secondary` et les quatre statuts à
deux intensités, plus `on-solid`. `theme` passe de 124 à 165 variables.

### Version de la recette

La recette courante est en format 8, et `validerRecette` refuse toute clé
inconnue ([`recette.ts`](../../../../../../packages/couleur/src/recette.ts)).
Les notes demandent de ne rien casser.

| Option | Effet sur une recette rangée en format 8 | Effet sur un build antérieur | Avis |
|---|---|---|---|
| Format 9, le format 8 se lit avec le texte actuel | Lue, comportement inchangé | Une recette 9 est « future », sans rien écrire | Recommandée ; elle déroge à la règle « aucune conversion », pour une conversion qui ne change aucune valeur |
| Format 9 strict | Illisible | Une recette 9 est « future » | Écartée : casse les réglages rangés |
| Clé facultative dans le format 8 | Lue | Une recette qui porte la clé est refusée comme illisible | Acceptable seulement si aucun build antérieur ne circule |

## 6. La commande Light/Dark

### Inventaire vérifié

| Surface | Commande | Ce qu'elle pilote |
|---|---|---|
| Création, en-tête de l'aperçu | Light / Dark | Le thème de l'aperçu, transmis au Color shift et à l'Interface de test |
| Vérification, carte des garanties | Light / Dark, et un lien vers le résultat de l'autre thème | Le même état que l'aperçu, par `gestes.mode()` |
| Réglage global | Soft / Vivid / les deux | Les profils que les réglettes modifient |
| Color shift | Soft / Vivid | Le profil que l'éditeur modifie ; le graphe montre les deux |
| Interface de test | Soft / Vivid | La rampe affichée ; ne modifie rien |
| Carte des garanties | Soft / Vivid | Le profil dont les garanties s'affichent ; ne modifie rien |
| Réglages communs | Colonnes Light et Dark pour les fonds et les courbes | Des valeurs propres à chaque thème |

Le thème s'initialise à Light au chargement et ne se range nulle part
([`nuancier.ts`](../../../../../../packages/plugin-palettes/src/ui/nuancier.ts)).
Deux commandes le montrent déjà, une par onglet, et aucune ne reste visible
pendant le défilement.

### Régler Light et Dark indépendamment : trois besoins

1. **Voir l'autre thème sans remonter.** C'est un défaut de placement. Une
   commande toujours visible le corrige.
2. **Régler des valeurs communes propres à chaque thème.** Les fonds, les
   courbes et la part des fonds du thème Dark existent déjà en deux colonnes.
   Le texte des boutons s'y ajoute, et répond au besoin qui motivait la
   question : un bouton différent en Dark.
3. **Régler chaque palette par thème.** Ce serait un nouvel axe dans
   `palettes[].reglages` : deux fois plus de réglettes, de limites et de
   champs de recette. Aucun besoin mesuré ne l'impose une fois le texte des
   boutons réglable. L'avis est de ne pas l'ajouter.

### Principe proposé

« Ce qu'on voit = ce qu'on modifie » tient si chaque commande annonce sa
portée :

- le thème est un contexte d'aperçu. Une palette se règle pour les deux thèmes
  à la fois, et une seule commande de thème suffit ;
- Soft et Vivid sont visibles ensemble dans l'aperçu. Un choix de profil est
  soit une cible, marquée « Régler », soit un choix d'affichage, marqué
  « Afficher » ;
- les valeurs propres à un thème se règlent dans les Réglages communs, où les
  deux colonnes restent visibles côte à côte.

### Modèles d'affichage

La maquette dessine chaque modèle à la taille par défaut, 600 × 720, et à la
taille minimale, 500 × 520 ([`fenetre.ts`](../../../../../../packages/plugin-palettes/src/fenetre.ts)).

| Modèle | Ce qui change | Risque | Avis |
|---|---|---|---|
| A. Un seul bouton, dans la barre de la palette, fixe en haut du panneau | Light / Dark rejoint la barre que Création et Vérification partagent déjà ; l'aperçu et la carte des garanties perdent le leur | Une ligne de 32 px à la taille minimale ; la barre doit rester fixe pendant le défilement | Recommandé |
| B. Un bouton dans chaque carte, tous liés | Chaque carte qui montre un thème garde une petite bascule, toutes liées | Quatre commandes pour un réglage ; la portée se lit mal | Variante |
| C. Light et Dark côte à côte | L'Interface de test et l'aperçu montrent les deux thèmes ; le Color shift garde une bascule | Largeur : deux écrans de 270 px à la taille par défaut, empilés à la taille minimale | Option de l'Interface de test |
| D. Un bouton par carte, indépendants | Chaque carte choisit son thème | Deux thèmes à l'écran sans repère | À éviter |

## 7. Réponses aux six questions de l'étude

1. **Où le texte sombre apparaît-il ?** Dans l'Interface de test, la carte des
   garanties, la planche, et dans les composants que l'architecture fait
   citer `usage.*.on-solid`. Les tokens publiés ne le portent pas encore, car
   UCM Palettes n'écrit que les rampes.
2. **Quel besoin ?** Choisir le texte des boutons par thème sans perdre de
   contraste. S2 l'obtient : les minima du texte restent ceux du thème
   d'origine.
3. **Quelle portée ?** Globale, dans la recette, une valeur par thème. Ni par
   palette, ni par profil, ni par composant, tant qu'aucune marque ne demande
   S6.
4. **Que veut dire « régler Light et Dark » ?** L'aperçu, par une commande
   globale, et les valeurs communes par thème, texte des boutons compris. Pas
   les réglages de chaque palette.
5. **La commande globale couvre-t-elle les écritures ?** Non : elle choisit
   l'aperçu. Les cibles de réglage restent dans leur carte, marquées
   « Régler ».
6. **Quelle fenêtre ?** La maquette tient aux deux tailles. La fréquence des
   bascules et la hauteur courante se relèveront pendant la recette.

## 8. Recommandation et critères de changement

Recommandation, sous réserve de la recette sur maquette :

- le texte des boutons se choisit par thème dans les Réglages communs, avec la
  règle S2 ; le défaut rend le comportement actuel ;
- la garantie 14 ne se vérifie pas quand le texte est changé, et une note le
  dit ;
- la recette passe au format 9 et lit le format 8 avec le texte actuel ;
- la commande Light/Dark rejoint la barre de la palette, fixe en haut du
  panneau ; les choix de profil disent « Régler » ou « Afficher ».

Ce qui ferait changer cette recommandation :

| Constat en recette | Nouvelle direction |
|---|---|
| Le bouton doit se détacher de la page à 3:1 dans chaque état | Un emploi de contour pour le bouton, ou S4 avec un état de moins |
| Le bouton repris du thème Light paraît trop vif sur les surfaces désaturées du thème Dark | S3, ou S4 avec une part réduite |
| Le designer préfère garder l'accolade `solid` dans la rampe affichée | S3 |
| Une marque exige un texte sombre sur son seul jaune | S6, sur la base de S2 |
| Une palette demande une teinte différente par thème | Réouvrir les réglages par thème, avec leurs limites |

## 9. Essais à mener

1. Relire la maquette avec le mainteneur et retenir une solution et un modèle
   d'affichage.
2. Dans Figma, poser un écran Dark avec les boutons de S2 et de S3, sur la
   page, sur une carte et dans une modale, pour les cinq palettes de la
   maquette.
3. Capturer la galerie du plugin aux deux tailles avec la barre fixe, une fois
   le modèle retenu.
4. Mesurer S2 avec les fonds que le mainteneur prévoit, dont `#f8fafc` en
   Light, en changeant `recetteParDefaut()` dans le script.
5. Écrire les tests avant le code : garanties sous les quatre combinaisons,
   garantie 14 non vérifiée, lecture d'une recette 8, empreinte et fraîcheur
   des planches, Interface de test dans Chromium.

## Sources

### Dépôt

- [Notes de recette](./NOTES-RECETTE-MODES-ET-AFFICHAGE.md) et
  [étude préparatoire](./ETUDE-MODES-ET-AFFICHAGE-GLOBAL.md).
- [ARCHITECTURE-FINALE-MULTIMARQUES.md](../../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md),
  [plan d'intégration](../../../Archi%20Tokens%20Multi-marques/PLAN-INTEGRATION-ARCHITECTURE.md)
  et [usages indexés](../../../Archi%20Tokens%20Multi-marques/Collection%20usage/README.md).
- [Spécification d'UCM Palettes](../../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md).
- [`emplois.ts`](../../../../../../packages/kit/src/emplois/emplois.ts),
  [`paires.ts`](../../../../../../packages/kit/src/emplois/paires.ts),
  [`usages.ts`](../../../../../../packages/kit/src/emplois/usages.ts),
  [`promesses.ts`](../../../../../../packages/couleur/src/promesses.ts),
  [`recette.ts`](../../../../../../packages/couleur/src/recette.ts),
  [`rampe.ts`](../../../../../../packages/couleur/src/rampe.ts),
  [`palette.ts`](../../../../../../packages/couleur/src/palette.ts).
- [`nuancier.ts`](../../../../../../packages/plugin-palettes/src/ui/nuancier.ts),
  [`interfaceDeTest.ts`](../../../../../../packages/plugin-palettes/src/ui/interfaceDeTest.ts),
  [`garanties.ts`](../../../../../../packages/plugin-palettes/src/ui/garanties.ts),
  [`configuration.ts`](../../../../../../packages/plugin-palettes/src/ui/configuration.ts),
  [`barreDePalette.ts`](../../../../../../packages/plugin-palettes/src/ui/barreDePalette.ts).

### Systèmes comparés

Les contrastes ci-dessous sont calculés par la formule WCAG sur les valeurs
publiées.

| Système | Bouton en Dark | Texte | Contraste mesuré |
|---|---|---|---|
| Material 3, spécification 2021 | `primary` au ton 80, contre 40 en Light | `onPrimary` au ton 20, contre 100 | Courbe de contraste minimale 4,5 |
| Atlassian | `background.brand.bold` `#669DF1` | `text.inverse` `#1F1F21` | 6,00:1 |
| shadcn | `--primary` `oklch(0.922 0 0)` | `--primary-foreground` `oklch(0.205 0 0)` | Texte sombre |
| Radix | `blue9` `#0090ff`, proche de Light | blanc | 3,26:1 |
| Primer | `#238636`, survol `#29903b`, appui `#2e9a40` | blanc | 4,63, 4,08 et 3,61:1 |
| Carbon, thème g100 | bleu 60 `#0f62fe` dans tous les thèmes | blanc | 5,00:1 ; 3,62:1 contre la page `#161616` |

- [Material Color Utilities, `color_spec_2021.ts`](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/dynamiccolor/color_spec_2021.ts)
- [Atlassian, thème Dark de `@atlaskit/tokens`](https://unpkg.com/@atlaskit/tokens/dist/esm/artifacts/themes/atlassian-dark.js)
- [shadcn, Theming](https://ui.shadcn.com/docs/theming)
- [Radix, Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
  et [échelle sombre](https://raw.githubusercontent.com/radix-ui/colors/main/src/dark.ts)
- [Primer, thème Dark](https://unpkg.com/@primer/primitives/dist/css/functional/themes/dark.css)
- [Carbon, Themes](https://carbondesignsystem.com/elements/themes/overview/)
  et [signalxjs/zero, pull request 231](https://github.com/signalxjs/zero/pull/231)
- [W3C, Understanding 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C, Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
