# Synchronisation des icones

Piste P32. Un script relève les icônes FontAwesome Pro que le code emploie, et un plugin crée ou met à jour dans la library Figma un composant par icône, sans détacher les instances. La recréation des composants (P30) en a besoin : `Icon` échange des composants d'icônes. Le [plan](./PLAN-P32.md) en découle.

## 1. Ce que dit la licence

Le texte de la licence Pro actuelle n'a pas pu être lu : ses pages sont rendues en JavaScript. Les points ci-dessous viennent de la foire aux questions et des pages lues ; aucun texte ne traite une library Figma d'équipe.

- La foire aux questions interdit de partager les icônes Pro avec une personne qui n'a pas de siège, et de les publier publiquement, « e.g. in a Figma community plugin or file » ([support](https://fontawesome.com/support), lu en extrait de recherche).
- Un siège couvre chaque designer qui place des icônes et chaque développeur qui les cite dans son code ; les visiteurs et les outils qui compilent n'en ont pas besoin ([billet sur les sièges](https://blog.fontawesome.com/font-awesome-pro-seats/)).
- Figma, npm et les jetons Pro sont réservés aux plans annuels Solo et Team ([plans](https://fontawesome.com/plans), lu en extrait).

Une library réservée aux titulaires d'un siège semble donc compatible ; aucun texte ne le confirme. Une question écrite au support de FontAwesome, avec le cas exact, la tranche (Q1).

## 2. Ce qui existe

Le [plugin officiel](https://docs.fontawesome.com/desktop/add-icons/figma-plugin) insère des SVG dans un cadre, pas des composants, et une icône posée ne change pas quand FontAwesome publie une version. [Iconify](https://iconify.design/docs/design/figma/update-2024.html) importe en composant, sans rien dire des instances. Aucun outil trouvé ne va d'une liste tirée d'un dépôt de code vers des composants Figma tenus à jour.

## 3. D'où viennent les tracés

| Source | Accès | Limite |
|---|---|---|
| Paquets npm Pro (`@fortawesome/pro-*-svg-icons`, `@awesome.me/kit-*` pour Pro+) | jeton de paquet dans `.npmrc`, en local ou en CI ([paquets](https://docs.fontawesome.com/web/setup/packages)) | un plugin ne lit pas un `node_modules` |
| API GraphQL `https://api.fontawesome.com` | jeton d'API échangé contre un jeton d'accès d'une heure ([jeton](https://docs.fontawesome.com/apis/graphql/token-endpoint)) ; portée `svg_icons_pro` | domaine à ouvrir dans le manifeste ; CORS depuis l'iframe d'origine `null` non vérifié |

L'API rend pour chaque icône ses tracés (`svgs { width height pathData }`) et `changes`, la liste des versions qui l'ont modifiée ([objets](https://docs.fontawesome.com/apis/graphql/objects)). Une duotone a deux tracés. La version 7 a changé des noms en alias, par exemple `user-large` vers `user` ([changements](http://docs.fontawesome.com/upgrade/whats-changed/)) : le relevé résout les alias avant de nommer un composant.

Deux formes en découlent.

- Forme A. Un script, lancé là où les paquets Pro sont installés, écrit un fichier avec la liste des icônes employées et leurs tracés ; le plugin lit ce fichier. Aucun domaine nouveau, aucun jeton FontAwesome dans le plugin.
- Forme B. Le plugin lit la liste dans le dépôt par `api.github.com`, puis les tracés par l'API de FontAwesome. Le domaine s'ajoute au manifeste, et le jeton se garde dans le plugin.

La forme A garde le réseau du plugin tel qu'il est et le jeton hors de Figma : c'est la proposition de cette recherche (Q2).

## 4. Relever les icônes employées

Le style se lit dans le chemin du paquet : `pro-regular-svg-icons` vaut Classic Regular. Un relevé de l'arbre syntaxique lit le nom importé (`faCircleUser`, jamais l'alias local) de chaque import depuis `@fortawesome/*-svg-icons` ou `@awesome.me/kit-*/icons/*` ([React](https://docs.fontawesome.com/web/use-with/react/add-icons)). Il ne voit ni un nom calculé, ni `library.add(fas)`, ni la forme chaîne `"fa-solid fa-house"` construite à l'exécution : chacun devient une question dans le relevé.

## 5. Mettre à jour sans détacher

Figma met à jour les instances quand le contenu d'un composant change ([ComponentNode](https://developers.figma.com/docs/plugins/api/ComponentNode/)). Remplacer le contenu entier a fait perdre leurs surcharges de couleur aux instances ([forum](https://forum.figma.com/ask-the-community-7/retain-color-overrides-in-instances-of-components-that-get-updated-by-plugin-7337)). La voie retenue par [Icon Library Manager](https://www.kaimagnus.de/articles/building-icon-libraries-with-icon-library-manager) réécrit seulement le tracé du vecteur et garde le calque, pour que Figma voie un composant « changé » et non « supprimé puis ajouté ». Une empreinte du tracé, posée par `setPluginData` sur chaque composant, dit au plugin si une icône a changé.

Aucune documentation ne dit que la clé d'un composant reste stable après une telle mise à jour. Le premier essai le vérifie : une instance avec une surcharge de remplissage dans un second fichier, une mise à jour du tracé, une publication, puis la lecture de la clé et de la surcharge.

## Questions au mainteneur

- Q1. Combien de personnes ouvrent la library des composants, et ont-elles toutes un siège FontAwesome Pro ? Écrit-on au support de FontAwesome avec le cas exact ?
- Q2. Forme A (fichier produit par un script là où les paquets Pro sont installés) ou forme B (le plugin appelle l'API de FontAwesome) ?
- Q3. Quels dépôts fixent la liste : intencial-library seule, ou aussi les applications consommatrices ?
- Q4. Un composant par icône et par style, ou un composant par icône avec un axe de style ?
- Q5. Nouveau plugin, ou mode d'UCM Architect, qui travaille déjà sur le fichier des composants ?
- Q6. Les duotones entrent-elles dans la library ?
