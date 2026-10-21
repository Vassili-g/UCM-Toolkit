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

Décidé : la forme de la section 2 est adoptée (G-2).

Un registre est une liste du kit : les mots qu'UCM reconnaît à une position du
chemin, et leurs formes tolérées. Le registre des états connaît `pressed` et
tolère `press` ; Nomenclature propose alors de renommer `press` en `pressed`,
et Token Architect signale l'écart.

| # | Question | Recommandation |
|---|---|---|
| G-5 | Un token de composant peut-il viser le token d'un autre composant ? Dans l'export, `tilelink/size/icon` vise `icon/size/xl` : l'icône de la tuile prend la taille `xl` du composant Icon. La règle actuelle n'autorise qu'une cible `theme`, `layout` ou `typography` | Oui, pour les tailles seulement |
| G-6 | Le token `icon/size/xl` existe et vaut 28 px. Son nom finit par la taille `xl`, sans mot de propriété après, alors que la forme demande une propriété finale (`padding-x`, `gap`…). Admettre ce nom tel quel, ou exiger `icon/size/xl/size` ? | L'admettre tel quel : un composant qui n'a qu'une dimension par taille n'a pas besoin du mot |
| G-7 | Créer le registre des styles : `contained`, `outlined`, `text`, `standard`, `filled`… Token Architect signalerait alors deux mots pour un même style dans deux composants, comme `filled` dans Alert et `contained` dans Button | Plus tard, quand la bibliothèque aura plus de composants |
| G-8 | Créer le registre des propriétés de taille : `padding-x`, `padding-y`, `gap`, `radius`, `width`, `height`, `border-width`, `icon-size`… Token Architect signalerait alors `gap-col`, `gap-rows` et `gap-x` dans `stresstest`, trois noms pour deux propriétés | Oui |
