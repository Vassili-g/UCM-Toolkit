# Solutions externes et sources

Les sources primaires ci-dessous ont été consultées pour cette étude.
Les conclusions UCM sont des propositions ; les comportements
des autres systèmes ne prouvent pas les contrastes de nos palettes.

## Comparaison des systèmes

| Système | Mécanisme documenté | Apport possible à UCM | Limite de transposition |
|---|---|---|---|
| Radix Colors | Douze crans, emplois indicatifs par cran, premiers plans particuliers pour certaines couleurs | Des indices peuvent faciliter le choix sans nommer un composant | Les garanties annoncées pour 11 et 12 sur 2 utilisent APCA ; ne pas les traduire en ratios WCAG 2 |
| U.S. Web Design System | Grades définis par intervalles de luminance ; écarts de grades associés à des seuils | Formaliser une règle entre ensembles de couleurs | Les crans UCM n’ont pas ces intervalles ; un écart numérique UCM n’hérite pas de cette propriété |
| Adobe Spectrum | Couleurs produites à partir de contrastes cibles ; relations entre thèmes et surfaces | Construire une palette à partir de contraintes mesurées | Le respect d’une référence de marque peut entrer en conflit avec les cibles |
| Carbon | Jeux de tokens par couche, avec états ; tokens contextuels côté code | Séparer le niveau de surface de l’état d’interaction | Le contexte de couche doit être conservé entre Figma et le code |
| Material Color Utilities | Rôles de fond et premiers plans associés, courbes de contraste dans le générateur | Décrire explicitement la relation premier plan/fond | Les rôles et l’algorithme ne correspondent pas directement aux crans UCM |
| Adobe Leonardo | Génération de couleurs à partir de ratios cibles et thèmes adaptatifs | Étudier un solveur de contraintes à la génération | Une génération adaptative à l’exécution demanderait un autre contrat que les valeurs exportées actuelles |

### Radix

Les crans gardent des usages privilégiés : 3 à 5 pour les fonds interactifs,
9 et 10 pour les fonds pleins, 11 et 12 pour le texte. Certains fonds pleins
jaunes ou clairs demandent un premier plan sombre. Le nombre n’autorise donc
pas toutes les associations.
[Documentation Radix](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).

Pour UCM, conserver un rôle de peinture dans le nom, puis un niveau, paraît
plus utile que publier une série de nombres sans rôle. La compatibilité doit
rester consultable séparément.

### U.S. Web Design System

La documentation relie un écart de grades de 40, 50 ou 70 à des niveaux de
contraste. Cette propriété repose sur des intervalles de luminance bornés.
Elle s’applique aux couleurs de ce système.
[Règles de grades](https://designsystem.digital.gov/design-tokens/color/overview/).

Pour UCM, une garantie portant sur toutes les couleurs d’un niveau demanderait
des bornes sur la luminance après conversion et arrondi. Une courbe de clarté
OKLCH seule ne fournit pas ces bornes.

### Spectrum et Leonardo

Spectrum décrit une construction fondée sur les contrastes et cite Leonardo
comme outil de génération.
[Couleurs Spectrum](https://spectrum.adobe.com/foundations/color/color).
Leonardo expose un générateur de palettes à ratios cibles et un modèle de
couleur adaptative.
[Dépôt Adobe Leonardo](https://github.com/adobe/leonardo).

Une intégration UCM pourrait proposer un ajustement au designer quand une paire
échoue. Elle devrait afficher le déplacement de la référence et les autres
paires affectées avant application. Le calcul seul ne tranche pas une priorité
entre fidélité à la marque et contraste demandé.

### Carbon

Carbon distingue les jeux explicites par couche et les tokens contextuels du
code. Les suffixes de couche regroupent plusieurs rôles, y compris des états.
[Modèle de couches Carbon](https://www.carbondesignsystem.com/building-blocks/foundations/color/guidelines).

Cette distinction suggère une dimension séparée pour les surfaces UCM.
L’indice d’une surface ne devrait pas être confondu avec son état de survol.

### Material

Le code officiel déclare les rôles `primary`, `onPrimary`, `primaryContainer`
et `onPrimaryContainer`, ainsi que leurs règles de contraste.
[Material Color Utilities](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/dynamiccolor/material_dynamic_colors.ts).
La page de présentation Material n’a pas fourni de texte exploitable par
l’outil de recherche ; l’analyse s’appuie sur le code officiel.

Pour UCM, `on-solid` doit conserver son sens de premier plan posé sur `solid`.
Un fond plein contrastant avec une surface devrait avoir une autre relation
déclarée. Le mot `on` ne doit pas désigner alternativement ces deux fonctions.

## Seuils et portée de l’évaluation

Le texte courant demande 4,5:1 au niveau AA. Le grand texte demande 3:1,
avec une qualification de taille et de graisse : au moins 18 points, ou
14 points en gras. Une couleur de texte sans information typographique doit
être évaluée par défaut à 4,5:1. Un rapport de 4,499 ne doit pas devenir un
succès par arrondi d’affichage.
[WCAG, contraste minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Le contraste non textuel concerne les informations visuelles nécessaires
à l’identification des composants et de leurs états, ainsi que les parties
graphiques nécessaires à la compréhension. Il ne prescrit pas un contraste de
3:1 entre toutes les surfaces adjacentes, ni entre repos et survol. Une bordure
peut fournir la séparation nécessaire quand le fond du contrôle ne la fournit
pas.
[WCAG, contraste non textuel](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Le critère 2.4.13, de niveau AAA, comprend une aire minimale équivalente à un
périmètre de 2 pixels CSS et un contraste de changement de 3:1 entre les mêmes
pixels avec et sans focus. Une paire anneau/fond ne prouve pas ces deux clauses.
[WCAG, apparence du focus](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html).

Les contrôles inactifs bénéficient d’exemptions de contraste. Un libellé nommé
`disabled` ne suffit pas à établir que le contrôle est réellement inactif.
Un état exempté doit rester distinct d’un succès mesuré. La couleur seule ne
doit pas porter l’information ; le contraste ne couvre pas cette exigence.
[Texte normatif WCAG 2.2](https://www.w3.org/TR/WCAG22/).

APCA peut être une mesure exploratoire distincte. Les verdicts demandés par
WCAG 2.2 doivent utiliser la métrique et le seuil de ces critères. Ne pas
remplacer une mesure par l’autre sous un même badge.

## Échange des données et Figma

DTCG 2025.10 autorise les métadonnées propres à un outil dans `$extensions`.
La lecture de la valeur doit rester indépendante de ces métadonnées. Le
format ne fournit pas un catalogue normatif des associations UCM.
[DTCG Format](https://www.designtokens.org/tr/2025.10/format/).

Le module Resolver décrit la résolution des tokens dans plusieurs contextes.
Il constitue une référence pour séparer marque et thème, mais ne remplace pas
automatiquement les extensions de modes actuellement exportées par UCM.
Il s’agit d’une spécification du groupe communautaire DTCG, pas d’une
recommandation W3C.
[DTCG Resolver](https://www.designtokens.org/tr/2025.10/resolver/).

Les portées Figma filtrent les variables proposées dans les sélecteurs.
Elles ne décrivent pas une compatibilité entre deux variables. La description
d’une variable peut expliquer un emploi ; un plugin ou une documentation reste
nécessaire pour présenter une matrice de partenaires.
[API Variable](https://developers.figma.com/docs/plugins/api/Variable/).

## Questions que les sources ne tranchent pas

Aucune source consultée ne prouve que les quatre couples proposés conviennent
à toutes les palettes UCM. Le choix de quatre niveaux, le maintien des noms
d’état et l’acceptation des associations entre familles restent des décisions
de produit à éprouver sur les couleurs et les composants locaux.
