# Relevé des surfaces de support et des fonds de statut

Cette collecte relève, dans huit systèmes, les surfaces qui portent les composants (page, carte, fond creusé, fond des superpositions) et les fonds teintés de statut avec leur texte, en thème clair et en thème sombre. Elle décrit des valeurs publiées et ne recommande rien à UCM. Elle complète [`../RELEVE-STATUTS-ET-FOCUS.md`](../RELEVE-STATUTS-ET-FOCUS.md) et suit la méthode de [`../Spectrum/fetch.mjs`](../Spectrum/fetch.mjs).

## Reproduire

```
node Collecte/Surfaces/fetch.mjs     # télécharge, réécrit sources.json
node Collecte/Surfaces/extract.mjs   # relit sources/, réécrit processed/*.json
```

`fetch.mjs` n'installe aucun paquet : il utilise le `fetch` de Node, prend chaque fichier à une version npm épinglée (jsdelivr) ou à une révision GitHub épinglée, l'écrit dans `sources/` avec l'extension `.txt` ajoutée (pour échapper aux contrôles locaux de code) et consigne dans `sources.json` l'URL, la version, le chemin d'origine, le fichier local et le SHA-256. Une seconde exécution donne un `sources.json` identique à l'octet près.

`extract.mjs` relit ces fichiers sans exécuter aucun code téléchargé (lecture par motifs, `JSON.parse` des tables publiées). Il refuse de s'exécuter si un SHA-256 ne correspond pas, et s'arrête si une règle attendue (paire fond/texte d'un composant, règle de palette de Fluent) n'est plus dans le fichier source. Il écrit :

- `processed/surfaces.json` : par système et par thème, la page, les cartes, le fond creusé, le fond des superpositions et quelques autres surfaces. Chaque carte donne `contrasteAvecPage` et `sens`.
- `processed/statuts.json` : par système et par thème, le fond teinté, son texte, éventuellement le contour et l'icône, `contrasteTexteFond`, `contrasteFondPage` et `contrasteFondCartes`.

Chaque valeur porte `token`, `valeurPubliee`, `source.fichier` (et `source.ligne` quand le fichier n'est pas compacté). Quand la valeur publiée est une référence (`var(--x)`, rôle M3 vers palette, expression Fluent `grey[14]`), `valeurResolue` ou `resolutionVia` donne la chaîne jusqu'à la couleur.

## Versions figées

| Système | Fichiers | Version ou révision |
|---|---|---|
| GitHub Primer | `dist/css/functional/themes/light.css`, `dark.css` | `@primer/primitives@11.10.0` |
| Atlassian | `dist/cjs/artifacts/themes/atlassian-light.js`, `atlassian-dark.js`, `token-names.js` | `@atlaskit/tokens@20.4.1` |
| IBM Carbon | `js/generated/themes/{white,g10,g90,g100}.js`, `scss/generated/_notification-tokens.scss` | `@carbon/themes@11.83.0` |
| IBM Carbon (composant) | `scss/components/notification/_inline-notification.scss` | `@carbon/styles@1.117.0` |
| Shopify Polaris (tokens) | `dist/cjs/build/index.js` (tous les thèmes résolus) | `@shopify/polaris-tokens@9.4.2` |
| Shopify Polaris (composants) | `build/esm/styles.css`, `components/Banner/utilities.js` | `@shopify/polaris@13.9.5` |
| Material 3 | `tokens/versions/v0_192/_md-sys-color.scss`, `_md-ref-palette.scss`, `_md-comp-*-card.scss`, `_md-comp-dialog.scss`, `_md-comp-menu.scss`, et `labs/gb/styles/color/md-color-tokens-full.css` | `@material/web@2.5.0` |
| Fluent 2 | `lib/alias/{light,dark}Color.js`, `…ColorPalette.js`, `lib/global/colors.js`, `lib/statusColorMapping.js` | `@fluentui/tokens@1.0.0-alpha.24` |
| Fluent 2 (composants) | `useCardStyles`, `useMessageBarStyles`, `useBadgeStyles` (`.styles.raw.js`) | `@fluentui/react-card@9.7.3`, `react-message-bar@9.7.7`, `react-badge@9.5.6` |
| shadcn/ui | `apps/v4/registry/themes.ts`, `apps/v4/app/globals.css`, `apps/v4/public/r/themes/neutral.json` | révision `30a58d4498f270af1c1e981a7d78a15cf5740841` |
| Radix Themes | reprise de `../Radix/sources/themes/base.css.txt` et `gray.css.txt`, sans retéléchargement | `@radix-ui/themes@3.3.0`, `@radix-ui/colors@3.0.0` |

Les licences des paquets sont dans `sources/` (fichiers `*-licence*.txt`). Les versions retenues sont les dernières publiées sur npm lors de la collecte, sauf `@carbon/styles` et `@shopify/polaris` choisis pour correspondre aux dépendances de `@carbon/themes` et de `@shopify/polaris-tokens`.

## Ce qui a été relevé

### Surfaces

- Primer : `bgColor-default` (page), `card-bgColor` (carte, token dédié), `bgColor-inset` (creusé), `overlay-bgColor`, plus `bgColor-muted`.
- Atlassian : `elevation.surface` (page), `.raised` (carte), `.sunken`, `.overlay`. Les noms de variables viennent de `token-names.js`.
- Carbon : quatre thèmes ; `background` (page), `layer-01` (carte), `layer-02`, `layer-accent-01`, et `overlay` (voile).
- Polaris : `color-bg` (page), `color-bg-surface` (carte), `color-bg-surface-secondary`, `color-backdrop-bg` (voile), thèmes `light` et `dark-experimental`.
- Material 3 : `background` (page), cartes elevated (`surface-container-low`), filled (`surface-container-highest`) et outlined (`surface`) lues dans les fichiers de composants, dialogue (`surface-container-high`), menu (`surface-container`), échelle complète `surface-dim` à `surface-container-highest`. Les valeurs du CSS de labs sont comparées aux tokens Sass (champ `verifLabs`).
- Fluent 2 : `colorNeutralBackground1` à `6` ; la carte est Background1 (Card `filled`, vérifié dans `useCardStyles`).
- shadcn/ui : `--background`, `--card`, `--popover`, `--muted`, lus dans `themes.ts` (jeu `neutral`) et recoupés avec `globals.css` ; ils coïncident.
- Radix Themes : `--color-background` et `--color-panel-solid`.

### Fonds de statut

- Material 3 : `error-container` et `on-error-container` (deux artefacts).
- Carbon : `notification-background-{error,success,warning,info}`, texte `text-primary`, trait `support-*` (paires lues dans `_inline-notification.scss`).
- Polaris : Badge (`bg-fill-<ton>-secondary` avec `text-<ton>`, lu dans `styles.css`) et Banner dans un contenu (`bg-surface-<ton>` avec `text-<ton>`, lu dans `utilities.js`), pour critical, success, warning, info et caution.
- Fluent 2 : MessageBar (`colorStatus*Background1`, contour `Border1`, icône `Foreground1`), Badge `tint` (`colorPalette{Red,DarkOrange,Green,Yellow}Background1`, `Foreground1`, `Border1`), et les paires `Background2` / `Foreground2` des mêmes couleurs.
- Primer et Atlassian : les valeurs claires figuraient déjà dans le relevé précédent. Ce relevé n'y ajoute que les contrastes et les valeurs sombres composées, signalés comme compléments.

## Valeurs calculées

Les calculs sont faits par `extract.mjs`. Aucune valeur calculée n'est présentée comme publiée.

- Couleur translucide : composée sur l'hexa opaque indiqué (`composeSur`). Les fonds `-muted` de Primer en sombre sont composés sur la page et sur chaque carte (`hexSurPage`, `hexSurCarte`). Les voiles de Carbon et de Polaris sont composés sur la page.
- oklch (shadcn/ui) : converti en sRGB, arrondi à 8 bits (`conversion`). Les valeurs obtenues (`#0a0a0a`, `#171717`, `#262626`, `#f5f5f5`) sont des gris neutres.
- Contraste : WCAG 2, luminance relative standard, arrondi à 0,01. Le contraste texte/fond d'un fond translucide est donné sur la carte de référence (la première de la liste) et, à part, sur la page. Contrôle de la fonction : noir sur blanc donne 21,00.
- `sens` : compare les luminances de la carte et de la page ; `identique` si l'hexa est le même.

## Constats de lecture

- Primer, Atlassian, shadcn/ui et Radix en clair : la carte est identique à la page. En sombre, elle est plus claire, de 1,07 à 1,10 en contraste.
- Carbon : `white` pose `layer-01` plus foncée (#f4f4f4) que la page ; `g10` la pose plus claire (#ffffff) ; `g90` et `g100` la posent plus claire. `layer-02` est identique à la page dans `white` et `g10`, parce que les couches alternent.
- Polaris clair : carte plus claire que la page (#ffffff sur #f1f1f1).
- Polaris `dark-experimental` ne redéfinit qu'une partie des tokens. `color-bg-surface-secondary` reste à #f7f7f7 sur une page à #1a1a1a (contraste 16,25), et tous les tokens de statut gardent leurs valeurs claires.
- Carbon g90 et g100 : les quatre fonds de notification valent le même gris, identique à `layer-01` du thème (#393939, #262626). Le ton ne passe que par le trait et l'icône.
- Material 3 : `on-error-container` en clair diffère selon l'artefact (`error10` #410e0b dans les tokens Sass, `error30` #8c1d18 dans le CSS de labs). Les autres valeurs relevées coïncident.
- Fluent 2 : aucune page déclarée. Les fonds neutres 2 à 5 sont plus foncés que la carte dans les deux thèmes ; le fond 6 est plus foncé en clair et plus clair en sombre.
- shadcn/ui : `public/r/themes/neutral.json`, de la même révision, porte d'autres valeurs (HSL, `--card` égal à `--background` dans les deux thèmes). Ce fichier est conservé dans `sources/` et ses valeurs figurent dans `ancienRegistreJson`.

## Ce qui manque et pourquoi

- Material 3 : les fichiers lus ne contiennent aucun rôle success, warning ni info (recherche textuelle faite par le script), ni composant d'alerte ou de bannière. Seul `error-container` est relevé. Aucun fond « creusé » nommé n'existe. Les fichiers de composants ne désignent pas de carte par défaut : les trois variantes sont données. Les valeurs sont celles du schéma de base, pas d'un schéma dynamique.
- Carbon : pas de fond creusé nommé. `layer-03` n'a pas été relevé (hors demande). Le voile `overlay` n'est pas une surface.
- Polaris : le thème sombre est expérimental et partiel (voir plus haut). Les thèmes `light-mobile` et `light-high-contrast-experimental` ne sont pas relevés. Le Banner posé dans une page (aplat `bg-fill-<ton>` et `text-<ton>-on-bg-fill`) n'est pas relevé. L'usage de `bg-surface` par le composant Card n'a pas été relu : la carte est donnée d'après la liste de la demande.
- Fluent 2 : pas de rôle page. Les fonds de Dialog, de Popover et de Drawer ne sont pas relus. Le texte du corps d'un MessageBar n'est pas fixé dans `useMessageBarStyles` ; le texte indiqué est `colorNeutralForeground1`, texte courant du thème, sans lecture du composant `MessageBarBody`. Les thèmes Teams et à contraste élevé ne sont pas relevés. Le jeu `…Background2` / `…Foreground2` n'est assemblé par aucun composant lu. Les versions des paquets `react-*` ne sont pas recoupées avec `@fluentui/tokens@1.0.0-alpha.24` (la dépendance exacte n'a pas été vérifiée).
- shadcn/ui : pas de fond teinté de statut ni de fond creusé dans les fichiers lus. `--muted` et `--popover` sont donnés comme repères. Le jeu `neutral` est un des sept jeux de couleur de base ; les autres ne sont pas relevés.
- Primer : l'association de Flash (fond `-muted`, texte `fgColor-default`) vient du relevé précédent, non relue dans `Flash.module.css`. Atlassian : l'association du Lozenge et de la Section message vient aussi du relevé précédent.
- Radix Themes : valeurs reprises des fichiers locaux, sans retéléchargement (l'archive d'origine est décrite dans `../Radix/fetch.ps1`). Le gris suit l'accent choisi (`grayColor`) ; le relevé garde `gray`. Le voile `--color-overlay` n'est pas repris.
- Aucun rendu dans un navigateur : les contrastes sont calculés sur les hexa lus, pas mesurés sur des pixels.
- Polaris et Carbon : la version de `@shopify/polaris-tokens` embarquée dans `@shopify/polaris@13.9.5`, et celle de `@carbon/themes` dans `@carbon/styles@1.117.0`, sont déduites de leurs `package.json` (plages `^9.4.2` et `^11.83.0`), non vérifiées dans un arbre installé.
