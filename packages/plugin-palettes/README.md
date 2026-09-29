# UCM Palettes

UCM Palettes est le plugin de [UCM Toolkit](../../README.md) consacré aux
palettes de couleurs. Il calcule les rampes Light et Dark depuis une couleur
de référence, affiche les contrastes des associations d'usage et dessine une
planche dans le document Figma.

## Ouvrir le plugin

Le manifeste porte l'identifiant que Figma a attribué au plugin. Depuis la
racine du dépôt, avec Node 22 :

```sh
npm install
npm run build --workspace ucm-palettes-plugin
```

Dans Figma Desktop, ouvrez `Plugins > Development > Import plugin from manifest`
et choisissez `packages/plugin-palettes/dist/manifest.json`.

## Composer une palette

Dans l'onglet **Palettes**, créez une palette avec un nom, une couleur de
référence et un modèle de nuances. Choisissez une intensité unique ou deux
intensités, Soft et Vivid. Le sélecteur de couleur accepte Hex, RGB et HSL.

L'aperçu montre les nuances sur le fond de chaque thème. Sélectionnez une
nuance pour examiner ses valeurs et ses emplois. Les cartes présentent les
garanties de contraste et les alertes de la palette ouverte. Le panneau
« Ajuster la référence » compare une proposition à la couleur d'origine avant
son application.

Les réglages communs définissent les fonds, les intensités, les courbes de
luminosité et les seuils de signalement. Une palette peut avoir ses propres
intensités. L'éditeur de dérive règle la variation de teinte le long des rampes.

Les contrastes portent sur les associations affichées. Ils ne constituent pas
un audit d'accessibilité de l'interface qui utilisera ces couleurs.

## Dessiner et mettre à jour les planches

L'onglet **Planches** présente l'état du cadre de chaque palette. Générez une
planche, mettez à jour les cadres périmés ou utilisez « Afficher dans Figma »
pour les retrouver. Les réglages du contenu choisissent les thèmes, les usages
et les grilles à dessiner.

Le plugin remplace ses cadres à leur emplacement. La présence de calques
étrangers demande confirmation avant leur remplacement. Une copie de cadre
faite par le designer reste distincte du cadre suivi. Supprimer une palette
conserve son ancien cadre jusqu'au retrait explicite depuis l'onglet Planches.

## Conserver et échanger la recette

Les modifications de palette sont enregistrées dans les données du document.
Le dessin des planches reste un geste distinct. La recette courante utilise le
format **4**, défini dans [le moteur de couleur](../couleur/README.md).

L'onglet Planches propose l'export de la recette JSON et du rapport de
vérification. L'import présente les différences et demande confirmation avant
de remplacer la recette. Il ne redessine pas les cadres. Une modification
concurrente du document suspend l'enregistrement pour éviter d'écraser une
recette plus récente.

Le plugin fonctionne sans accès réseau. Il ne crée pas de variables Figma et
ne produit pas de `tokens.json`. L'export des variables locales appartient à
[UCM Contract Exporter](../plugin-exporter/README.md).

## Vérifier une modification

Depuis la racine du dépôt :

```sh
npm run test --workspace ucm-palettes-plugin
npm run typecheck --workspace ucm-palettes-plugin
npm run galerie --workspace ucm-palettes-plugin
npm run test:ui --workspace ucm-palettes-plugin
```

Les tests d'interface demandent Chromium : `npx playwright install chromium`.
La galerie est générée dans `dist/galerie/index.html` et sa version étroite dans
`dist/galerie-minimale/index.html`, sous ce paquet ; `dist/galerie-en/` et
`dist/galerie-en-minimale/` en donnent la version anglaise. Elle présente les états de
l'interface en thèmes clair, sombre et sombre sans variables Figma.

Le [socle](../plugin-socle/README.md) fournit les composants d'interface et le
banc de galerie. Le [moteur de couleur](../couleur/README.md) porte les calculs.
Les règles du produit sont dans [AGENTS.md](../../AGENTS.md), les règles de
contribution dans [CONTRIBUTING.md](../../CONTRIBUTING.md).

## État du produit

L'interface s'ouvre en anglais, quelle que soit la langue de Figma ou du
système. Le champ « Language » des Réglages communs propose l'anglais et le
français ; le choix prend effet sans recharger et se range dans
`figma.clientStorage`, sous la clé `ucm-palettes.langue`, sur le poste du
designer. Il n'écrit rien dans le document. Les textes des planches dessinées
restent en français. Les plans d'ergonomie décrivent des travaux à réaliser ;
ils ne prouvent pas leur présence dans le build. Le [sommaire documentaire](../../docs/README.md)
donne accès aux spécifications et aux plans de Palettes.

## Ajouter une langue

1. Copier `src/i18n/en.ts` sous le code de la langue, puis traduire chaque
   entrée. Une fonction garde ses paramètres ; une phrase se traduit entière,
   sans recoller des fragments.
2. Écrire les pluriels et les ordinaux de la langue dans les fonctions qui
   comptent (`nombreDePalettes`, `nommerChamp` et leurs voisines).
   `pluriel` de `src/i18n/nombres.ts` donne la catégorie `Intl` d'un nombre.
3. Inscrire la langue dans `LANGUES` de `src/i18n/langues.ts` : code, nom
   dans sa propre langue, direction et séparateur décimal. Associer ensuite le
   code à son catalogue dans `CATALOGUES` de `src/i18n/index.ts` ; sans
   cette entrée, la compilation échoue.
4. Lancer `npm run test` : `tests/i18n.test.ts` refuse un catalogue dont une
   clé manque ou change de type. Ajouter à ce fichier les attentes des messages
   dynamiques de la langue, avec les valeurs 0, 1 et 2.
5. Ajouter une galerie de la langue dans `galerie/build-galerie.cjs` et
   relire ses états à 500 et à 600 px.

Une direction `rtl` se déclare dans le registre, mais la mise en page n'a été
relue qu'en `ltr` : une langue de droite à gauche demande sa propre relecture
visuelle.

## Licence

[MIT](../../LICENSE).
