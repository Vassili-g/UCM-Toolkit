# Recherches sur UCM Palettes

Le [README du plugin](../../../../packages/plugin-palettes/README.md) décrit
l'utilisation actuelle. La
[spécification](./1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md)
reste la référence des règles, malgré son emplacement dans ce dossier.

## Implémentation et références

| Sujet | État | Documents utiles |
|---|---|---|
| Moteur et planches | Implémentés dans `packages/couleur` et `packages/plugin-palettes` | Spécification ; [recherche initiale](./1%20Recherche%20initiale/) pour les mesures et la comparaison du marché |
| Ergonomie, nuances et référence | Implémentées, puis reprises dans le parcours Création, Vérification et Gestion | [Étude des intensités](./2%20Ergonomie/RECHERCHE-REFONTE-INTENSITES.md) et mesures ; les plans V1 à V6 décrivent des étapes remplacées |
| Palettes désaturées et grises | Implémentées dans `palette.ts` et `reglages.ts` | [Conception](./3%20Palettes%20désaturées/PLAN-PALETTES-DESATUREES.md), cas limites et script de mesure |
| Color shift et réglage global borné | Implémentés, y compris le calcul des limites par tranches | [Étude](./Color%20shift/ETUDE-COLOR-SHIFT.md), maquette et mesure |
| Anglais et français | Implémentés ; anglais par défaut, choix conservé sur le poste | [Plan et réserves de validation](./Textes%20et%20langues/PLAN-INTERNATIONALISATION-PALETTES.md#cases-ouvertes), [décisions éditoriales](./Textes%20et%20langues/DECISIONS-REDACTION-PALETTES.md) |
| Variables et parcours en trois onglets | Implémentés, avec reprise locale et copie de bibliothèque | [Direction simple et recette](./Intégration%20du%20marché/README.md) |
| Sections repliables de Gestion et simulation des chemins | Présentes dans `ongletGestion.ts`, `connexion.ts` et `destination.ts` | [Maquettes de recette](./Intégration%20du%20marché/08%20Recette%20direction%20simple/MAQUETTES-RECETTE-DIRECTION-SIMPLE.html) ; conserver les variantes graphiques jusqu'au tri validé |

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
- La comparaison et l'harmonisation de plusieurs palettes sont à l'étude :
  le [plan de recherche](./Harmonisation%20entre%20palettes/PLAN-RECHERCHE-HARMONISATION.md)
  porte une première mesure et les questions ouvertes, sans implémentation.
- La validation éditoriale anglaise et les vérifications propres à Figma
  restent à consigner dans les recettes concernées.

## Conservation des recherches

Les mesures, leurs scripts, la spécification et les validations de textes
restent utiles. L'export
[validation-textes-palettes.json](./Textes%20et%20langues/validation-textes-palettes.json)
conserve les réponses du mainteneur ; il ne doit pas être réécrit.

Les plans successifs et les maquettes remplacées sont conservés en attente
du choix de tri indiqué dans l'[état global des recherches](../README.md).
Les scripts de maquettes peuvent dépendre d'un ancien DOM de galerie :
leur présence ne garantit pas qu'ils régénèrent le résultat avec le build courant.
