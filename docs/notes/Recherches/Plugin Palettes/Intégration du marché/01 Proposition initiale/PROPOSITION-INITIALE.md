# UCM Palettes : intégrer les apports du marché

Ce document propose une place dans le plugin pour chaque élément que
[la comparaison avec les outils du marché](../../RECHERCHE-CONCURRENCE-PALETTES.md)
retient. Il s'adresse au mainteneur, qui valide ou écarte chaque piste, puis à
l'agent qui écrira le plan d'implémentation des pistes retenues.

Les écrans sont dans [MAQUETTES-PROPOSITION-INITIALE.html](./MAQUETTES-PROPOSITION-INITIALE.html),
à ouvrir dans un navigateur. Ses couleurs sortent du moteur ; la page se
régénère ainsi :

```sh
node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/01 Proposition initiale/generer-maquettes-proposition-initiale.mjs"
```

Ce document ne décide rien. La [spécification](../../RECHERCHE-PLUGIN-PALETTES.md)
reste l'autorité sur le comportement du plugin, et une piste retenue la modifie
d'abord.

## Le principe commun

La recherche ajoute l'écriture des variables à côté de l'existant : une rangée
de destination dans la configuration, une seconde pastille et un second geste
dans chaque fiche, un second bouton groupé. Chaque ajout est juste pris seul.
Ensemble, ils doublent l'état d'une palette face à Figma et laissent saisir des
combinaisons que l'architecture refuse.

Les pistes 1 à 4 prennent l'autre parti :

- une palette a un rôle dans le système, et ce rôle fixe ses intensités et le
  chemin de ses variables ;
- une palette a un seul état face à Figma, qui couvre son cadre, ses variables
  et ses alias de `theme`, et un seul geste pour le mettre à jour ;
- toute écriture de variables passe par une revue, qui liste les changements
  et les retouches faites à la main dans Figma ;
- une retouche gardée entre dans la recette, et les garanties se jugent sur
  elle.

Les pistes 5 à 10 s'appuient sur ces quatre-là, ou s'en passent.

## Les pistes

| # | Piste | Écrans | Coût | Proposition |
|---|---|---|---|---|
| 1 | Le rôle de la palette remplace Modèle, Intensités et destination | Création, Configuration de la palette, sélecteur | Moyen | Faire |
| 2 | Un état Figma par palette, onglet Palettes rangé par collection | Onglet Palettes | Moyen | Faire |
| 3 | La revue avant écriture | Modale de l'onglet Palettes | Moyen | Faire |
| 4 | Les retouches entrent dans la recette | Aperçu, détail d'une nuance, planche, rapport | Moyen | Faire |
| 5 | Le jeu de départ | Carte de création d'un fichier vide, menu « … » | Moyen | Faire après 1 |
| 6 | La couleur de la sélection partout où une couleur se saisit | Sélecteur de couleur, création | Faible | Faire |
| 7 | La vision simulée | Onglet Palettes, rapport | Faible | Faire |
| 8 | Les fonds lus sur le cran 50 du neutre | Réglages communs, carte Couleurs de fond | Moyen | À discuter |
| 9 | La carte Variables et les marques | Réglages communs | Faible | Faire avec 2 |
| 10 | Les aides de vocabulaire et la langue des planches | Création, Contenu des planches | Faible | Faire |

### Piste 1 : le rôle

La rangée « Rôle dans le système » propose Marque, Utilitaire, Neutre et
Autre. Marque fixe une intensité et demande la marque et la famille.
Utilitaire fixe deux intensités et demande la famille et « Référence exacte
dans ». Neutre fixe une intensité et la famille `neutral`. Autre rend la carte
actuelle, Modèle et intensités compris, et n'écrit aucune variable. Une ligne
secondaire donne le chemin des variables.

La variante de la recherche, une rangée « Variables » sous les Intensités,
laisse saisir une palette de marque à deux intensités, puis la refuse. Le rôle
rend cette combinaison impossible à saisir, et la carte perd deux rangées.

Le sélecteur de palette range ses entrées par collection, puis par marque.

### Piste 2 : un état et un geste

La pastille d'une fiche prend l'état le plus grave du cadre et des variables.
La ligne de la référence nomme ce qui manque : « Cadre à jour · 23 variables à
écrire ». « Générer sur Figma » et « Actualiser sur Figma » écrivent le cadre,
les variables de la palette et ses alias de `theme`. Les fiches se rangent en
groupes repliables : `primitives`, une marque par groupe sous `brand`, `theme`
sans fiche, puis « Hors variables ». Un mode de marque ajouté à la main dans
Figma, que Figma remplit avec la première colonne, se signale sous les groupes
de marque.

### Piste 3 : la revue

Une modale, sur le modèle de l'écart d'un import (`[REC-08]`) et de
`[UI-15]`, compte ce qui sera créé, modifié et renommé, par collection et par
mode, puis liste chaque retouche avec « Garder » ou « Remplacer ». « Garder »
est choisi par défaut : il ne détruit rien dans Figma, et « Rétablir la valeur
calculée » le défait. Un seul `commitUndo` clôt l'écriture. Un redessin de
cadre sans variable reste direct.

### Piste 4 : les retouches

Une retouche gardée se range dans la recette : profil, thème, cran, hexa.
L'aperçu la peint et la marque d'un ✎, la planche la montre marquée, les
garanties se jugent sur elle et le rapport donne les deux valeurs. Le détail
de la nuance propose « Rétablir la valeur calculée ». Avant la revue, une
retouche en attente porte une pastille orange dans la fiche de l'onglet
Palettes.

### Piste 5 : le jeu de départ

Dans un fichier sans palette, la carte de création propose « Une palette » ou
« Le jeu de départ ». Le jeu crée le neutre, les quatre utilitaires aux 600 de
Tailwind et deux palettes par marque saisie. « Compléter le jeu de départ »,
dans le menu « … », ouvre la même carte avec les palettes présentes cochées et
figées. Aucune invitation ne reçoit de geste propre : la règle des surfaces
d'UCM Palettes tient.

### Piste 6 : la sélection

Le sélecteur de couleur embarqué gagne une rangée « Dans la sélection » : les
remplissages unis des calques choisis, huit au plus, avec le nom du calque.
Elle sert à la référence, aux fonds et au jeu de départ. Un seul calque à
remplissage uni préremplit aussi la création.

### Piste 7 : la vision simulée

Une liste « Vision » rejoint le choix du thème en tête de l'onglet Palettes et
repeint les rampes des fiches. Sous une vision simulée, une information de
rang 3 nomme les paires d'utilitaires sous le seuil des palettes proches et
rappelle le critère 1.4.1 de WCAG. Aucune alerte : aucun réglage ne sépare
danger et warning sans rompre la règle « un numéro de cran vaut un contraste ».

### Piste 8 : les fonds lus sur le neutre

Le cran 50 d'un neutre gris vaut `#F7F7F7` en Thème Light et `#121212` en
Thème Dark, les deux fonds par défaut de la recette. L'architecture fait de ce
cran le fond de page. Quand une palette porte le rôle Neutre, la carte
« Couleurs de fond » peut lire ses fonds sur elle. La piste change D8, et un
réglage du neutre déplace alors toutes les garanties : elle se décide après
les pistes 1 à 3.

### Piste 9 : la carte Variables

Une carte repliée des Réglages communs porte les noms des trois collections,
l'écriture des alias de `theme` et la liste des marques. Renommer une marque
renomme son mode à la prochaine actualisation.

### Piste 10 : les textes

Une aide d'une phrase derrière un ? pour Soft, Vivid, « Référence exacte
dans » et « Dérive de teinte ». La langue des planches devient un réglage de
« Contenu des planches », rangé dans la recette.

## Ce que les pistes changent ailleurs

| Endroit | Changement | Pistes |
|---|---|---|
| Spécification, D2 et section 5 | Le plugin écrit des variables | 2, 3 |
| Spécification, D3 | Le plugin connaît la marque et la famille saisies, sans nommer seul | 1 |
| Spécification, D8 | Le plugin fabrique le neutre quand le rôle existe | 1, 8 |
| Spécification, `[ENT-14]` | Le choix des intensités ne reste libre que pour le rôle Autre | 1 |
| Spécification, `[UI-05]`, `[UI-06]`, `[UI-11]`, `[UI-13]`, `[UI-16]` | Geste unique, sélecteur rangé, rangée Rôle, couleurs de la sélection, langue des planches | 1, 2, 6, 10 |
| Spécification, section 17 | Remplacée par la description de l'écriture | 2, 3, 4 |
| Recette, format 7 | Rôle, famille et marque par palette ; liste des marques ; retouches ; réglage des variables ; langue des planches ; source des fonds | 1, 4, 8, 9, 10 |
| CONTRIBUTING, surfaces d'UCM Palettes | Fiche avec famille et détail ; groupes de l'onglet Palettes ; revue | 2, 3 |
| Architecture, sections 2 et 3.4 | `brand.identity.{famille}` par palette de marque, 46 variables par marque ; la couleur exacte est aussi dans le cran porteur | 1 |
| Galerie | Un état par écran nouveau : rôles, groupes, revue, retouches, jeu de départ, sélection, vision, marque recopiée | toutes |

Une recette au format 6 migre en rôle Autre pour toutes ses palettes. Aucune
variable ne s'écrit sans un geste du designer.

## Ordre proposé

1. Pistes 6, 7 et les aides de la piste 10. Elles ne touchent pas à la
   recette.
2. Format 7 de la recette, piste 1, piste 9 et la langue des planches.
3. Écriture de `primitives` et de `brand` : pistes 2, 3 et 4.
4. Écriture des alias de `theme`.
5. Piste 5.
6. Piste 8, si elle est retenue.

Le lot 3 porte le coût le plus élevé : un domaine d'écriture nouveau, que la
spécification et ses tests bornent comme ils bornent la planche.

## Les décisions à valider

| # | Décision | Proposition |
|---|---|---|
| V1 | Le rôle de la palette remplace Modèle, Intensités et destination | Oui, variante A |
| V2 | Une pastille et un geste par palette, cadre et variables ensemble | Oui |
| V3 | L'onglet Palettes se range par collection et par marque | Oui |
| V4 | Toute écriture de variables passe par la revue ; une retouche est gardée par défaut | Oui |
| V5 | `brand.identity.{famille}` reçoit l'hexa de la référence, en valeur, une par palette de marque | Oui |
| V6 | Une retouche gardée entre dans la recette, et les garanties se jugent sur elle | Oui |
| V7 | Le jeu de départ dans la création d'un fichier vide, et « Compléter le jeu de départ » dans « … » | Oui |
| V8 | Les couleurs de la sélection dans le sélecteur de couleur, et la création préremplie | Oui |
| V9 | La vision simulée dans l'onglet Palettes, avec une information sur les paires proches | Oui |
| V10 | Les fonds lus sur le cran 50 du neutre | À discuter |
| V11 | La carte Variables des Réglages communs, marques comprises | Oui |
| V12 | Les aides de vocabulaire, et la langue des planches rangée dans la recette | Oui |
| V13 | `primitives` et `brand` dans un premier lot, `theme` dans un second | Oui |

V1 à V4 fixent la forme du plan. Un refus de V1 ramène la rangée « Variables »
de la recherche, et un refus de V2 ses deux pastilles par fiche.

## Ce qui reste écarté

La recherche écarte l'export de code, APCA, Display P3 et la table des emplois
réglable ; ces pistes n'y reviennent pas. Deux refontes ont aussi été
examinées et écartées :

- une liste des palettes à gauche et l'éditeur à droite, sans onglets :
  l'aperçu demande toute la largeur pour ses onze colonnes, et à 500 px la
  liste devrait se replier ;
- renommer l'onglet Palettes en « Figma » : le rangement par collection montre
  déjà que l'onglet décrit le document.
