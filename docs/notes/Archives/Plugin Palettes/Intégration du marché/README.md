# Écriture des variables et parcours de Palettes

Le parcours **Création, Vérification, Gestion** est implémenté. Le plugin
écrit les palettes dans les variables locales, reprend les palettes du fichier
et copie celles des bibliothèques activées.

Le [README du plugin](../../../../../packages/plugin-palettes/README.md)
décrit le comportement actuel. La
[spécification](../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md)
porte ses règles.

## Références du parcours implémenté

| Document | Usage |
|---|---|
| [07 Direction simple](./07%20Direction%20simple/PLAN-DIRECTION-SIMPLE.md) | Décisions de parcours et périmètre de l'écriture |
| [Recette Figma](./07%20Direction%20simple/RECETTE-DIRECTION-SIMPLE.md) | Gestes à vérifier et essais des écritures |
| [Plan d'implémentation](./07%20Direction%20simple/PLAN-IMPLEMENTATION.md) | Décomposition du travail déjà réalisé ; les cases de validation ne constituent pas une liste de fonctions absentes |
| [08 Recette direction simple](./08%20Recette%20direction%20simple/MAQUETTES-RECETTE-DIRECTION-SIMPLE.html) | Variantes visuelles de Gestion ; sections repliables, séparation des bibliothèques et simulation des chemins sont présentes dans le code |

La gestion actuelle effectue les écritures depuis chaque fiche. Une palette
reprise conserve les identifiants de ses variables ; la reprise peut renommer
leurs chemins. Le plugin ne génère ni couches de marque, ni alias de thème.

## Propositions remplacées

| Ensemble | État et intérêt restant |
|---|---|
| [01 Proposition initiale](./01%20Proposition%20initiale/PROPOSITION-INITIALE.md) | Parcours remplacé ; premières pistes de sélection, jeu de départ et vision simulée |
| [02 Revue atelier](./02%20Revue%20atelier/REVUE-ET-PROTOTYPE-ATELIER.html) | Prototype de parcours remplacé |
| [03 Proposition finale](./03%20Proposition%20finale/PROPOSITION-FINALE.md) | Parcours remplacé ; cas limites des écritures |
| [04 Parcours en trois étapes](./04%20Parcours%20en%20trois%20étapes/PROPOSITION-TROIS-ETAPES.html) | Organisation remplacée par Création, Vérification et Gestion |
| [05 Revue critique](./05%20Revue%20critique/REVUE-CRITIQUE-TROIS-ETAPES.md) | Réserves sur les corrections qui abîment une rampe et les destinations ambiguës |
| [06 Direction globale](./06%20Direction%20globale/DIRECTION-GLOBALE.md) | Parcours remplacé ; propositions de marques, de jeu de départ et de vision simulée hors du périmètre actuel |

Ces propositions restent conservées jusqu'à validation du tri. Leur ordre ne
constitue plus un parcours de lecture du produit. La
[comparaison du marché](../1%20Recherche%20initiale/RECHERCHE-CONCURRENCE-PALETTES.md)
et l'[architecture multi-marques](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)
conservent les besoins futurs.

## Maquettes et générateurs

Chaque générateur reste à côté de sa page. Les prototypes 01 à 06 décrivent
des états de conception. Ceux de 07 et 08 partent d'une galerie construite,
dont le DOM a évolué : utilisez la galerie du plugin pour examiner l'état actuel.

Depuis la racine du dépôt :

```sh
npm run galerie --workspace ucm-palettes-plugin
```

Les tests de l'interface et leurs prérequis sont décrits dans le
[README du plugin](../../../../../packages/plugin-palettes/README.md#vérifier-une-modification).
