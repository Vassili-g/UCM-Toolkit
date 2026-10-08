# Recherches sur UCM Palettes

Le [README du plugin](../../../../packages/plugin-palettes/README.md) décrit
l'utilisation actuelle. La
[spécification](./1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md)
reste la référence des règles, malgré son emplacement dans ce dossier.

## Implémentation et références

| Sujet | État | Documents utiles |
|---|---|---|
| Moteur et planches | Implémentés dans `packages/couleur` et `packages/plugin-palettes` | Spécification ; [recherche initiale](./1%20Recherche%20initiale/) pour les mesures et la comparaison du marché |
| Ergonomie, nuances et référence | Implémentées, puis reprises dans le parcours Création, Vérification et Gestion | [Spécification](./1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md), sections 8 et 9 |
| Palettes désaturées et grises | Implémentées dans `palette.ts` et `reglages.ts` | [Spécification, section 6.4](./1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#64-la-teinte-dun-cran) |
| Color shift et réglage global borné | Implémentés, y compris le calcul des limites par tranches | [Spécification, section 12](./1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#12-le-color-shift) |
| Anglais et français | Implémentés ; anglais par défaut, choix conservé sur le poste | [Plan et réserves de validation](./Textes%20et%20langues/PLAN-INTERNATIONALISATION-PALETTES.md#cases-ouvertes), [décisions éditoriales](./Textes%20et%20langues/DECISIONS-REDACTION-PALETTES.md) |
| Variables et parcours en trois onglets | Implémentés, avec reprise locale et copie de bibliothèque | [Direction simple et recette](./Intégration%20du%20marché/README.md) ; [règles d'écriture et de reprise](./1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#17-sortie-2--les-variables) |
| Sections repliables de Gestion et simulation des chemins | Présentes dans `ongletGestion.ts`, `connexion.ts` et `destination.ts` | [Maquettes de recette](./Intégration%20du%20marché/08%20Recette%20direction%20simple/MAQUETTES-RECETTE-DIRECTION-SIMPLE.html) ; conserver les variantes graphiques jusqu'au tri validé |
| Liste dépliable de Gestion | Implémentée dans `ongletGestion.ts` : une ligne par palette, sa fiche dépliée dessous | Le code fait foi |

Une recette non consignée ne remet pas ces fonctions dans les travaux à
implémenter. Les anciens nombres de tests et états de copie de travail ne
décrivent pas le build courant.

## Ce qui reste distinct

- Les couches `brand`, `theme` et `usage` ne sont pas générées par Palettes.
  Le [plan d'architecture](../Archi%20Tokens%20Multi-marques/PLAN-INTEGRATION-ARCHITECTURE.md)
  reste partiel, même si les emplois et leurs contrôles existent dans le kit.
- La [comparaison du marché](./1%20Recherche%20initiale/RECHERCHE-CONCURRENCE-PALETTES.md)
  conserve les pistes de vision simulée, de sélection, de jeu de départ,
  d'APCA et de Display P3. Leur présence dans une maquette ne vaut pas implémentation.
- La comparaison et l'harmonisation de plusieurs palettes attendent les
  décisions du mainteneur : le [dossier](./Harmonisation%20entre%20palettes/DOSSIER-HARMONISATION.md)
  mesure une recette réelle, calcule l'alignement de la luminosité et propose
  une comparaison dans Vérification, maquettée, sans implémentation.
- Le texte des boutons en Light et en Dark est implémenté avec le thème en
  dossiers et attend la recette dans Figma :
  [TEXTE-DES-BOUTONS.html](./Texte%20des%20boutons/TEXTE-DES-BOUTONS.html)
  réunit les décisions du mainteneur et le thème inversé.
- Les commandes Light/Dark et Soft/Vivid sont implémentées et attendent la
  recette dans Figma : voir le
  [dossier des commandes](https://github.com/Vassili-g/UCM-Toolkit/blob/5d7435d/docs/notes/Recherches/Plugin%20Palettes/Commandes%20Light-Dark%20et%20Soft-Vivid/DOSSIER-COMMANDES-D-AFFICHAGE.md).
- La recette v8 est implémentée : le
  [dossier de la recette v8](./Recette%20v8/DOSSIER-RECETTE-V8.md) explique
  la palette retirée par « Annuler la reprise » et sa réparation par le
  plugin ; son plan est réalisé.
- La recette v9 suit : le
  [dossier de la recette v9](./Recette%20v9/DOSSIER-RECETTE-V9.md) consigne
  le bandeau de vérification décidé sans implémentation, la configuration
  avancée repliée et l'écran sans palette ouverte, qui attend un choix.
- La validation éditoriale anglaise et les vérifications propres à Figma
  restent à consigner dans les recettes concernées.

## Conservation des recherches

Les mesures, leurs scripts, la spécification et les validations de textes
restent utiles. L'export
[validation-textes-palettes.json](./Textes%20et%20langues/validation-textes-palettes.json)
conserve les réponses du mainteneur ; il ne doit pas être réécrit.

Les parcours remplacés d'Intégration du marché sont conservés en attente
du choix de tri indiqué dans l'[état global des recherches](../README.md).
Les scripts de maquettes peuvent dépendre d'un ancien DOM de galerie :
leur présence ne garantit pas qu'ils régénèrent le résultat avec le build courant.
