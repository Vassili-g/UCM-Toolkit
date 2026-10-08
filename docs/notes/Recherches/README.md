# État des recherches UCM

Ce sommaire classe les sujets d'après les sources présentes dans les dépôts.
**Implémenté** signifie que le comportement existe dans le code ; une recette
Figma non consignée reste une validation à faire, sans rouvrir l'implémentation.

Les plans anciens servent à retrouver une décision ou une expérience. Pour
modifier le produit, partez des références de [docs/README.md](../../README.md)
et du code, pas d'une ancienne liste de tâches.

## Sujets implémentés

| Sujet | Éléments présents | Référence à conserver |
|---|---|---|
| Diagnostics de l'exporteur et propriétés visuelles du contrat 14.0 | Regroupement des constats, opacité, styles d'effets, placement des enfants de cadres libres | [Spécification du moteur](../../../packages/plugin-exporter/SPEC.md) et [format du contrat](../../format/FORMAT.md) |
| Plugin Palettes, ergonomie et réglages | Moteur, planches, modèles de nuances, référence réglable et interface de test | [Bilan Palettes](./Plugin%20Palettes/README.md) ; spécification et mesures conservées |
| Palettes désaturées et grises | Ancrage dans `palette.ts`, réglages dans `reglages.ts`, tests du moteur | [Spécification, section 6.4](./Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#64-la-teinte-dun-cran) |
| Color shift et limites | Trois grandeurs, réglage global borné, calcul des limites par tranches dans l'interface | [Spécification, section 12](./Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#12-le-color-shift) ; l'écriture des couches de marque et la migration du Playground sont des sujets distincts |
| Langues de Palettes | Catalogues anglais et français, préférence locale, traduction immédiate | [Plan et limites de validation](./Plugin%20Palettes/Textes%20et%20langues/PLAN-INTERNATIONALISATION-PALETTES.md#cases-ouvertes) ; décisions éditoriales et export des validations conservés |
| Direction simple de Palettes | Création, Vérification, Gestion, variables locales, reprise, copie de bibliothèque, sections repliables et simulation des chemins | [Parcours et recette](./Plugin%20Palettes/Intégration%20du%20marché/README.md) |
| Explorateur de tokens | Résolution, comparaison, diagnostics, intégrations, relevés et simulation | [Spécification](../../../packages/plugin-explorateur/SPEC.md) et [suivi des preuves](./Plugin%20Explorateur%20Tokens/SUIVI-IMPLEMENTATION.md) |
| Vue composant de l'explorateur | Sélection, frontières de composition, aperçu, tokens par nature et chaînes | [Suivi](./Plugin%20Explorateur%20Tokens/Vue%20composant/SUIVI-VUE-COMPOSANT.md) et [recette Figma](./Plugin%20Explorateur%20Tokens/Vue%20composant/RECETTE-VUE-COMPOSANT.md) |
| Thème en dossiers et texte des boutons | Table en dossiers du kit, format 9 de la recette, texte des boutons par thème et courbe inversée, sept garanties, aperçu en bandes, carte des garanties, planche, Interface de test, diagnostic des contrastes et profil de l'explorateur | [Architecture finale](./Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md), sections 4 et 5, et [plan exécuté](https://github.com/Vassili-g/UCM-Toolkit/blob/5d7435d/docs/notes/Recherches/Th%C3%A8me%20en%20dossiers%20et%20texte%20des%20boutons/PLAN-IMPLEMENTATION.md) |

## Sujets partiellement implémentés

| Sujet | Acquis | Suite distincte |
|---|---|---|
| [Performance de l'analyse](https://github.com/Vassili-g/UCM-Toolkit/blob/5d7435d/docs/notes/Recherches/Performance%20de%20l'analyse/PLAN-IMPLEMENTATION-PERFORMANCE-ANALYSE.md) | Maître résolu une fois par analyse, index par page, annulation, traces et avancement dans le build courant | Préchauffage conditionné par les sondes, accélérations après mesure, reprise d'un index modifié ; les sondes et le plan restent dans l'historique Git |
| [Architecture multi-marques](./Archi%20Tokens%20Multi-marques/PLAN-INTEGRATION-ARCHITECTURE.md) | Table en dossiers `solid`, `surface` et `page` dans `packages/kit/src/emplois`, ses deux sens, ses sept garanties et la mesure des contrastes de `ucm check` | Déployer les collections dans Figma et migrer les consommateurs ; Palettes écrit les palettes primitives, sans générer `color-brands`, `color-utilities` ni `theme` |

Le Playground et `intencial-library` portent encore l'axe
`color-brand-tokens`, à deux marques, sans axe de thème dans leurs exports.
La présence du vocabulaire dans le kit ne prouve donc pas la migration des
bibliothèques.

## Pistes conservées pour la suite

| Sujet | État et raison de conservation |
|---|---|
| [Bouton plein basculable](./Archi%20Tokens%20Multi-marques/Bouton%20plein%20basculable/README.md) | Question ouverte : l'état activé survolé d'un bouton plein dans la table à trois états ; solutions du marché modélisées, quatre propositions, aucune décision |
| [Collection `usage`](./Archi%20Tokens%20Multi-marques/Collection%20usage/README.md) | Les propositions successives pour la collection `usage`, de la table des emplois aux dossiers à texte constant ; la dernière est implémentée, les autres restent comme historique |
| [Direction artistique](./Direction%20artistique/Optique/README.md) | Brief d'exploration des quatre logos UCM : formes optiques abstraites, nuances et interactions en aplats, images carrées sans texte ni dégradé ; dessins à produire et à comparer |
| [Diff sémantique](./Diff%20Sémantique/PLAN-DIFF-SEMANTIQUE.md) | Proposé ; aucune commande `ucm diff` dans le CLI |
| [Conformité du rendu](./Linter%20Dev/PLAN-CONFORMITE-RENDU.md) | Piste non implémentée ; la parité TypeScript ne compare pas le rendu |
| [Coût de génération et implémenteur](./Optimisation%20Tokens/README.md) | Mesures et conception d'un compilateur ; aucun paquet d'implémenteur dans le monorepo |
| [Comparaison des outils de palettes](./Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-CONCURRENCE-PALETTES.md) | Pistes au-delà de l'écriture des variables : vision simulée, Display P3, APCA, sélection et jeu de départ |
| [Évolutions globales](./Evolutions%20globales/PISTES-EVOLUTION.md) | Catalogue d'options ; confronter chaque option au format courant avant de l'engager |

Les comparatifs externes sont des matériaux de recherche. Leurs tarifs,
versions et fonctions doivent être revérifiés avant une nouvelle décision.

## Documents anciens conservés pour validation du tri

Un ensemble mêle des propositions remplacées et des choix du mainteneur :

- `Plugin Palettes/Intégration du marché/01` à `06` : parcours remplacés
  par la direction simple, mais propositions de gestion des marques, de jeu
  de départ et de vision simulée encore utiles.

Cet ensemble reste présent jusqu'à validation de sa suppression.
La spécification de Palettes, les mesures, les validations éditoriales et les
maquettes utilisées par une vérification restent des références à conserver.
