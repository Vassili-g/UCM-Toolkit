# Grammaire des tokens de composant

Ce document propose la forme des chemins de la collection `components`
(question Q13 du [document préparatoire](./PREPARATION-TOKEN-ARCHITECT.md)).
Le kit décrit la forme des six autres collections dans `FORMES_DES_CHEMINS`
(`packages/kit/src/referentiel/architecture.ts`) et exclut `components`. Rien
n'est décidé.

La proposition part de l'export de tokens que le mainteneur a fourni, dont le
mapping n'est pas terminé. Cet export n'est pas versionné.

## 1. Ce que l'export contient

| Composant | Chemins observés | Forme |
|---|---|---|
| `button` | `button/color/primary/contained/hover/background` ; `button/size/medium/padding-x` | composant, famille, palette, style, état, rôle ; composant, famille, taille, propriété |
| `alert` | `alert/color/info/standard/background` ; `alert/size/gap` | composant, famille, palette, style, rôle ; composant, famille, propriété |
| `tilelink` | `tilelink/color/info/hover/foreground` ; `tilelink/size/width` | composant, famille, palette, état, rôle ; composant, famille, propriété |
| `icon` | `icon/size/xl` | composant, famille, taille |
| `stresstest` | `stresstest/info/head/color/text` ; `stresstest/info/tilesgrid/size/gap-col` | composant, palette, élément, famille, variable |

Les quatre premiers composants suivent la même forme : la famille vient juste
après le composant, puis les valeurs des variantes, puis le rôle ou la
propriété. `stresstest` place la palette et l'élément avant la famille.

## 2. La forme proposée

```
components / composant / famille / [élément] / [valeurs de variante] / rôle ou propriété
```

| Position | Obligatoire | Valeurs | Registre du kit | Exemple |
|---|---|---|---|---|
| composant | oui | le nom du jeu de variants | aucun : un nom propre | `button` |
| famille | oui | `color`, `size` ; `typography` plus tard | à créer, sur le modèle de `FAMILLES_LAYOUT` | `color` |
| élément | non | le nom d'une partie du composant | aucun : un nom propre | `head`, `badge` |
| palette | si le composant a un axe de palette | `primary`, `secondary`, `neutral`, `info`, `success`, `warning`, `danger` | familles de `brands`, statuts | `info` |
| style | si le composant a un axe de style | propre au composant | aucun pour l'instant | `contained`, `outlined`, `text` |
| taille | si le composant a un axe de taille | `sm`, `md`, `lg`… | `REGISTRE_TAILLES` (`small` est une forme tolérée de `sm`) | `md` |
| état | si le composant a un axe d'état | `default`, `hover`, `pressed`, `focus`, `disabled`, `selected` | `REGISTRE_ETATS` | `hover` |
| rôle | oui, en `color` | `background`, `foreground`, `icon`, `border`, `ring` | rôles de rendu du kit (`format/roles-de-rendu.ts`) | `background` |
| propriété | oui, en `size` | `padding-x`, `padding-y`, `gap`, `radius`, `width`, `height`, `border-width`, `icon-size`… | à créer | `padding-x` |

Exemples :

| Chemin | Lecture |
|---|---|
| `button/color/primary/contained/hover/background` | Fond du bouton primaire plein survolé |
| `button/size/md/padding-x` | Marge horizontale du bouton moyen |
| `alert/color/danger/standard/foreground` | Texte de l'alerte de danger teintée |
| `alert/size/gap` | Écart de l'alerte, sans axe de taille |
| `stresstest/color/head/info/foreground` | Texte de l'en-tête, dans la variante info |

## 3. Les règles

1. **Ordre fixe des valeurs de variante : palette, style, taille, état.** Un
   axe n'apparaît que si ses valeurs changent le token. Le style ne change pas
   les marges d'un bouton : il n'apparaît pas sous `size`.
2. **L'élément suit la famille.** Toutes les couleurs d'une partie se trouvent
   ainsi au même endroit dans le panneau de Figma.
3. **Un rôle absent d'une combinaison n'a pas de token.** Le bouton `outlined`
   au repos n'a pas de fond : `button/color/primary/outlined/default/background`
   n'existe pas.
4. **Cibles.** Une couleur vise `theme`, et rien d'autre (règle déjà écrite dans
   `CIBLES_DES_COULEURS_DE_COMPOSANT`). Une dimension vise `layout`, une
   valeur de texte vise `typography`. Aucun token de composant ne vise
   `primitives`, `brands` ou `utility`, et aucun ne porte une valeur directe.
5. **Désactivé.** L'état `disabled` vise `theme/disabled/*`, pour toutes les
   palettes.
6. **Écriture.** La casse et les séparateurs suivent la convention du fichier,
   que Nomenclature applique déjà : `Color` dans Figma s'exporte `color`.

## 4. L'export relu avec cette forme

Ces écarts sont ceux que Token Architect afficherait sur l'export fourni. La
colonne « Contrôle » renvoie aux fonctions du document préparatoire.

| Écart | Où | Contrôle | Correction proposée |
|---|---|---|---|
| Palette et élément avant la famille | `stresstest/info/head/color/text` | C7, règle 2 | `stresstest/color/head/info/foreground` |
| Couleur qui vise une primitive | `stresstest/info/base/color/border` vise `primitives.color.titanium.light.500` | C61 | Une variable du thème, par la règle du dossier |
| Couleur qui vise `utility` en Light seul : elle ne change pas en Dark | `tilelink/color/info/default/background` vise `utility.info.vivid.light.50` | C20, C61 | `theme/info/vivid/surface/default` |
| Token vide | `stresstest/info/tilesgrid/color/tile`, `stresstest/info/scalewrap/color/scale-1` à `scale-6`, `tilelink/color/info/hover/foreground`… | C30 | Lier, ou supprimer le token |
| Dimension qui vise une primitive | `button/size/medium/padding-x` vise `primitives.dimension.14` ; même cas pour `gap`, `padding-y`, `icon/size/*`, `alert/size/*` | C20 | Une valeur de `layout` : `layout/sizing/3,5` vaut 14 px |
| Valeur directe | `stresstest/info/base/size/max-width` vaut 600 px | C61 | Une variable de `layout` |
| Bouton texte primaire au focus : texte de `surface`, alors que les cinq autres palettes prennent `page` | `button/color/primary/text/focus/foreground` | C21 | `theme/primary/page/foreground` |
| Alerte `outlined` : texte de `surface` sans fond teinté | `alert/color/info/outlined/foreground` vise `theme.info.soft.surface.foreground` | C59 | `theme/info/soft/page/foreground`, si l'alerte `outlined` n'a pas de fond |
| Alerte `outlined` sans token de contour | `alert/color/*/outlined` | C32 | Créer `…/outlined/border` |
| Taille écrite `medium` au lieu de `md` | `button/size/medium` | C10 | `button/size/md` ; Nomenclature le propose déjà |
| Un composant vise un autre composant | `tilelink/size/icon` vise `components.icon.size.xl` | C20 | Question G-5 ci-dessous |

## 5. Les questions

| # | Question | Recommandation |
|---|---|---|
| G-2 | Adopter la forme de la section 2 ? | Oui ; elle reprend la forme de `button`, `alert` et `tilelink` |
| G-5 | Un token de composant peut-il viser un autre composant, comme `tilelink/size/icon` qui vise `icon/size/xl` ? | Oui, pour les tailles seulement : la taille d'une icône imbriquée suit le composant Icon. `CIBLES_DES_COLLECTIONS` ajouterait `components` aux cibles de `components` pour la famille `size` |
| G-6 | `icon/size/xl` n'a pas de propriété finale. L'admettre quand le composant n'a qu'une propriété par taille, ou écrire `icon/size/xl/size` ? | L'admettre : la propriété est implicite quand la famille n'en porte qu'une |
| G-7 | Créer un registre des styles (`contained`, `outlined`, `text`, `standard`, `filled`) ? | Plus tard. Les styles restent propres à chaque composant tant que deux composants n'emploient pas deux mots pour la même chose |
| G-8 | Créer un registre des propriétés de `size` ? | Oui, avec les mots déjà présents dans l'export : `padding-x`, `padding-y`, `gap`, `radius`, `width`, `height`, `border-width`, `icon-size`, `max-width` |
