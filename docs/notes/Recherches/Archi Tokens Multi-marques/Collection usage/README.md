# La collection `usage` : où en est la recherche

`usage` est la dernière collection avant `components` : les noms qu'un calque
de composant cite pour sa couleur. Sa forme a changé plusieurs fois. Cette page
dit quel document lire, dans quel ordre, et ce que chacun vaut aujourd'hui.

## À lire en premier

[ARCHITECTURE-PROPOSEE.html](./ARCHITECTURE-PROPOSEE.html), à ouvrir dans un
navigateur, montre toute l'architecture proposée en une page : le panneau des
variables de Figma, des exemples en Light et en Dark, la recette sur les
contrats `Button` et `Alert` du Playground, les décisions D1 à D17 gardées ou
modifiées, et les versions précédentes. Ses couleurs viennent de
[generer-vue-architecture.ts](./generer-vue-architecture.ts).

[RECHERCHE-COLLECTION-USAGE.md](./RECHERCHE-COLLECTION-USAGE.md) reprend la
collection depuis le début : un dossier par sorte de fond, un texte qui ne
change pas avec l'état, et les valeurs de chaque thème écrites dans `theme`
d'après une table du kit. Ses décisions attendues sont en section 9. Ses mesures sont
dans [mesurer-dossiers.ts](./mesurer-dossiers.ts) et
[MESURES-DOSSIERS.json](./MESURES-DOSSIERS.json).

[CHANGEMENTS-DU-MOTEUR.md](./CHANGEMENTS-DU-MOTEUR.md) liste ce que cette
architecture demande au kit, à UCM Palettes, à `ucm check` et à UCM
Explorateur, avec l'état de chaque changement.
[CHANGEMENTS-DU-MOTEUR.html](./CHANGEMENTS-DU-MOTEUR.html) sert à les valider :
lexique, maquette qui met côte à côte la collection `theme` de Figma et
l'aperçu d'UCM Palettes, avant et après de chaque changement.

## Ce qui fait foi aujourd'hui

| Document | Ce qu'il porte |
|---|---|
| [ARCHITECTURE-FINALE-MULTIMARQUES.md](../ARCHITECTURE-FINALE-MULTIMARQUES.md), sections 4 et 5 | La table des emplois, les quatre rangs d'état et la collection `usage` retenus par le mainteneur |
| [VUE-ILLUSTREE-MULTIMARQUES.html](../VUE-ILLUSTREE-MULTIMARQUES.html) | Les décisions D1 à D17, dont D2 (`theme`), D13 (`usage`) et D17 (rangs) |
| [`packages/kit/src/emplois/`](../../../../../packages/kit/src/emplois/) | La table en code, que UCM Palettes et `ucm check` lisent |

## Les propositions successives

| Ordre | Proposition | Documents | État |
|---|---|---|---|
| 1 | Dix rôles facultatifs, câblés par marque et par thème | [Recherche initiale](../RECHERCHE-ARCHI-MULTIMARQUES.md), section 5.3 ; [revue critique](../SYNTHESE-CRITIQUE-ARCHI-MULTIMARQUES.md), section 3.5 | Remplacée par la table des emplois |
| 2 | Table des emplois, `usage` sans mode, quatre rangs d'état | Architecture finale et vue illustrée | Fait foi ; la recherche 7 propose de la remplacer |
| 3 | Niveaux indexés et catalogue de partenaires | [Usages indexés et contraste](./1%20Usages%20indexes%20et%20catalogue/README.md) : demande, notes 01 à 05, mesures | Abandonnée pour une règle |
| 4 | Règle de l'escalier | [Présentation des niveaux](./2%20Escalier/PRESENTATION-NIVEAUX-ET-TEXTE-DES-BOUTONS.html) | Jugée trop savante par le mainteneur |
| 5 | Ensembles numérotés `surface-0` à `surface-4` | [La collection usage en ensembles](./3%20Ensembles/ENSEMBLES-DANS-FIGMA.html) | Jugée trop complexe par le mainteneur |
| 6 | Thème inversé : texte blanc sur les boutons Dark | [Dossier du texte des boutons](../../Plugin%20Palettes/Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md) | À décider ; il impose une nuance par thème que D2 ne sait pas écrire |
| 7 | Dossiers à texte constant, valeurs par thème dans `theme` | [Ce dossier](./RECHERCHE-COLLECTION-USAGE.md) | Texte constant à 800 retenu ; décisions restantes en section 9 |

Les documents 3 à 5 sont rangés dans les sous-dossiers `1 Usages indexes et
catalogue`, `2 Escalier` et `3 Ensembles`, avec leurs scripts.
