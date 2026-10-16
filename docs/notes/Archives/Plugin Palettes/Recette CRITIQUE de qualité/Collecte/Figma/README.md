# Collecte Figma

Cette collecte porte sur le fichier Community [Untitled UI, kit gratuit et système de design v2.0](https://www.figma.com/design/iJscFYgN97zFFr0i2XLeyf/), et non sur le Simple Design System publié par Figma.

## Périmètre

| Planche | Nœud Figma | Données gardées |
|---|---|---|
| Colors | `1525:271581` | Styles de couleur extraits, capture et détails des rampes |
| Notes and documentation | `1525:274384` | Capture et conseils de conception affichés dans la planche |
| Badges | `1046:8088` | Capture du groupe et variantes de couleurs relevées |
| Buttons | `1038:34411` | Variantes Primary et Secondary color, au repos et au focus |
| Inputs | `1090:57817` | Exemples Placeholder/Focused, normaux et Destructive |
| Modals | `1109:660` | Une modale Warning de bureau ; les variantes modales restent distinctes des alertes |
| Focus des boutons | `1041:34650` et `1041:35262` | Styles, ombres et propriétés dans [RELEVE-UNTITLED-FOCUS.json](../../RELEVE-UNTITLED-FOCUS.json) |

La sélection fournie, `1023:36350`, est le canevas qui contient les planches Colors et Notes and documentation. Les identifiants ci-dessus sont les nœuds précis utilisés pour la collecte.

## Fichiers

- [sources/metadata.json](./sources/metadata.json) consigne l’origine et les méthodes de collecte.
- [sources/Badges.png](./sources/Badges.png), [sources/Buttons.png](./sources/Buttons.png) et [sources/Inputs.png](./sources/Inputs.png) conservent les captures des planches de composants ; les couleurs de la planche `Colors` sont dans `processed/tokens/`.
- [processed/tokens/color-palettes.json](./processed/tokens/color-palettes.json) contient les rampes de couleur lues sur la planche Colors.
- [processed/components/badges.json](./processed/components/badges.json) consigne les couples de couleurs relevés dans le groupe de badges.
- [processed/components/components-ui.json](./processed/components/components-ui.json) rassemble les exemples de boutons, champs, modale Warning et tooltips.
- [ANALYSE-UNTITLED-UI.md](../../ANALYSE-UNTITLED-UI.md) distingue les recommandations du document des hypothèses à tester dans UCM.

Les tooltips ont été écartés : leurs variantes Light et Dark n’emploient que des surfaces et des textes neutres, sans rôle coloré utile à l’étude des palettes. Les captures facilitent la relecture visuelle ; les styles extraits font foi pour les valeurs hexadécimales. Les captures ne prouvent ni le mapping exhaustif des composants ni le comportement en Dark. L’inventaire des pages accessibles comprend Badges, Buttons, Inputs, Tooltips et Modals, sans page dédiée Alert ou Toast. La modale Warning n’est donc pas utilisée comme substitut d’une alerte contextuelle.
