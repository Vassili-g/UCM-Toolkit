# Relevé des couleurs et composants d’Untitled UI

> **Document historique.** Point de départ de la recette critique ; ses
> propositions ont été mesurées puis tranchées. Pour l'implémentation, la
> référence est [DECISIONS.md](./DECISIONS.md).

Ce relevé complète la [préparation de la recette critique](./PREPARATION-CLAUDE-OPUS.md). Il sépare les données extraites du fichier Figma des recommandations écrites dans ses notes et des essais à mener dans UCM Palettes. Les captures, métadonnées et extractions se trouvent dans [Collecte/Figma](./Collecte/Figma/README.md).

## Sources relevées

Le lien fourni ouvre la sélection `1023:36350` du fichier Community [Untitled UI, kit gratuit et système de design v2.0](https://www.figma.com/design/iJscFYgN97zFFr0i2XLeyf/?node-id=1023-36350).

Cette sélection expose les planches `Colors` (`1525:271581`) et `Notes and documentation` (`1525:274384`). Les rampes de couleur sont dans [color-palettes.json](./Collecte/Figma/processed/tokens/color-palettes.json). Le relevé du [groupe de badges](./Collecte/Figma/processed/components/badges.json) garde quatre couples de couleurs et leurs contrastes. Les états de focus des boutons sont aussi consignés dans [RELEVE-UNTITLED-FOCUS.json](./RELEVE-UNTITLED-FOCUS.json).

La collecte couvre les exemples de boutons, champs et modale Warning dans [components-ui.json](./Collecte/Figma/processed/components/components-ui.json). Les tooltips ont été écartés : leurs variantes Light et Dark n’emploient que des surfaces et des textes neutres. Le fichier source n’expose pas de page dédiée Alert ou Toast. La modale Warning reste une comparaison de dialogue, pas une alerte contextuelle.

## Éléments observés dans le document

| Élément | Observation extraite | Usage pour la recette |
|---|---|---|
| Rampe de marque | `Brand` comporte les crans 50 à 950 ; `Brand/50` vaut `#F9F5FF`, `Brand/500` `#9E77ED` et `Brand/700` `#6941C6`. | Comparer la couleur des textes sur fonds clairs aux témoins déjà relevés. |
| Couleurs de retour | Les rampes `Red`, `Yellow` et `Green` ont chacune onze crans. Les badges relevés emploient les crans 50, 200 pour certains contours et 700 pour le texte. | Garder le triplet fond, contour et texte ; ne pas attribuer le rendu au fond seul. |
| Neutres | La rampe `Neutral` va de 50 à 950. Les notes présentent le gris comme fondation pour le texte, les champs, les fonds et les séparateurs. | Ajouter des contextes neutres réels aux essais de palettes, en particulier les séparateurs et les champs. |
| Usage des neutres | Les notes recommandent environ 8 à 12 valeurs de gris et citent `neutral-300` pour les bordures de champs et `neutral-200` pour les séparateurs. | Traiter ces numéros comme des conventions propres au kit, pas comme une échelle à reprendre dans UCM. |
| Palette fonctionnelle | Les notes distinguent couleurs neutres, marque, accent et retours d’état ; elles citent le vert pour le succès et le rouge pour l’échec, notamment dans les formulaires. | Tester les états dans le contexte d’un formulaire, avec leurs textes, icônes et bordures. |
| Contraste | Les notes conseillent 4,5:1 pour les éléments d’interface qu’elles qualifient de cruciaux. | Relever les seuils applicables selon le rôle et le texte ; ne pas transformer cette phrase générale en règle UCM universelle. |
| Personnalisation de marque | Le document explique qu’un changement des styles de couleur `brand` met à jour leur emploi dans les composants, plutôt qu’une modification composant par composant. | Examiner la séparation entre rampes primitives, alias sémantiques et usages de composants dans le corpus comparatif. |
| Évolution du gris | La planche explique le passage d’un gris bleuté à un gris neutre moins saturé dans Untitled UI v6.0. Elle recommande de remplacer la série de styles `neutral` pour propager ce choix. | Une préférence de gris dépend du caractère recherché et des autres couleurs. Évaluer le gris avec la marque et l’interface complète. |
| Réduction de tokens | La note d’Untitled UI React attribue à l’emploi des rampes natives de Tailwind CSS v4.2 le retrait de 436 variables redondantes ; elle indique un passage de 1 093 à 657 variables CSS. | Piste de maintenabilité seulement. Ces chiffres rapportés ne mesurent ni la qualité visuelle ni le coût de génération d’UCM. |
| Rampes Blue et Indigo | Les définitions lues partagent les crans 100 à 950. `Blue/50` vaut `#EFF6FF` et `Indigo/50` `#EEF2FF`. | Signaler les neuf valeurs communes et le cran 50 distinct ; ne pas conclure que les rôles sémantiques ou les usages sont identiques. |

## Contextes de composants

| Composant | Valeurs relevées | Comparaison utile |
|---|---|---|
| Bouton Primary | Fond et contour `Brand/600` (`#7F56D9`), texte blanc ; au focus, anneau de 4 px `Brand/100` (`#F4EBFF`) et ombre conservée. | Comparer le halo sur le bouton et sur le fond de page. |
| Bouton Secondary color | Fond et contour `Brand/50` (`#F9F5FF`), texte `Brand/700` (`#6941C6`) ; même anneau de focus 4 px. | Comparer les mêmes couleurs de focus sur un fond de bouton clair et sur le fond de page. |
| Champ normal | Placeholder : bord `Neutral/300` (`#D4D4D4`). Focus : bord `Brand/300` (`#D6BBFB`) et anneau `Brand/100` de 4 px. | Le focus change le bord et ajoute un halo ; le contenu reste neutre. |
| Champ Destructive | Focus : bord `Red/300` (`#FCA5A5`), icône rouge `Red/500` (`#EF4444`) et anneau `Red/100` (`#FEE2E2`) de 4 px. | Tester un état d’erreur où le rôle est porté par le bord, l’icône et le focus, pas seulement par le texte. |
| Modale Warning | Icône jaune `Yellow/100` (`#FEF9C3`) avec bordure extérieure `Yellow/50` (`#FEFCE8`), panneau blanc et voile sombre `rgba(10, 10, 10, 0.7)`. | Garder l’icône d’état distincte du panneau et du voile. Cet exemple n’équivaut pas à une alerte contextuelle. |

Ces mesures portent sur les variantes identifiées, pas sur tous les composants ni toutes leurs propriétés. La liste des pages accessibles contient `Badges`, `Buttons`, `Inputs`, `Tooltips` et `Modals`, sans page `Alert` ou `Toast`. Le relevé complet indique les nœuds et les variantes retenus, ainsi que les limites de chaque extrait.

## Extrait des couples de badges

Les quatre couples relevés pour les variantes de badges donnent :

| État | Fond extérieur | Texte | Contour du badge intérieur blanc |
|---|---|---|---|
| Brand | `Brand/50` `#F9F5FF` | `Brand/700` `#6941C6` | `#E9D7FE` |
| Error | `Red/50` `#FEF2F2` | `Red/700` `#B91C1C` | `#FECACA` |
| Warning | `Yellow/50` `#FEFCE8` | `Yellow/700` `#A16207` | `#FEF08A` |
| Success | `Green/50` `#F0FDF4` | `Green/700` `#15803D` | `#BBF7D0` |

Les contrastes texte/fond sont respectivement 6,16:1, 5,91:1, 4,76:1 et 4,79:1. Ils portent sur les couleurs de ces instances, pas sur toutes les variantes ou tous les thèmes du kit.

## Essais à transmettre à Claude Opus

1. Comparer les badges complets sur le fond réel, en incluant le fond pâle, le texte 700, le contour du badge intérieur et ses dimensions. Réutiliser les couples du relevé plutôt que comparer les numéros de cran seuls.
2. Séparer deux questions : le contraste du texte sur son fond et la distinction visuelle entre statuts. Une valeur qui passe un seuil de contraste ne prouve pas à elle seule que deux états se différencient assez.
3. Refaire le test des fonds et des textes sur des supports de page, de carte et de formulaire. Les notes du kit ne donnent pas une preuve que leurs exemples couvrent les supports UCM.
4. Comparer un neutre désaturé et un neutre teinté avec les mêmes composants et les mêmes couleurs de marque. Inclure les textes, bordures de champs et séparateurs.
5. Garder les recommandations du document au rang d’observations de conception. Le fichier ne décrit pas la formule OKLCH d’UCM, et ses rampes ne démontrent pas un réglage moteur à adopter.

## Limites du relevé

La sélection demandée ne contient pas un audit complet du kit. Les valeurs de la planche sont des styles nommés ; elles ne révèlent pas, à elles seules, toutes les liaisons et tous les alias des composants. Le relevé des badges et du focus couvre uniquement les instances et nœuds cités dans les documents associés.

Le nom du fichier Community contient `v2.0`, tandis que les notes intégrées parlent d’Untitled UI v5.0, v6.0 et Tailwind CSS v4.2. Ce relevé attribue ces affirmations aux notes du fichier ; il ne déduit pas leur date de publication ni leur correspondance exacte avec le kit gratuit.
