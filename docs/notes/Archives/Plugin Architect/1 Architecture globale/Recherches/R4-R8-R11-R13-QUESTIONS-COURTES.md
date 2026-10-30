# Questions courtes de R4, R8, R11 et R13

**Statut :** réponses documentaires. La documentation officielle tranche peu ;
chaque section liste les essais à faire dans Figma.

Lecteur : le mainteneur, et l'agent qui reprend ces sujets.

## R4. Les données partagées d'un plugin

| Fait | Source |
|---|---|
| L'espace de noms, la clé et la valeur d'une entrée `setSharedPluginData` ne dépassent pas 100 ko ensemble ; la valeur est une chaîne, lisible par tout plugin | [setSharedPluginData](https://developers.figma.com/docs/plugins/api/properties/nodes-setsharedplugindata/) |
| La méthode s'applique aussi aux variables et aux collections de variables | Même page |
| Aucune limite par nœud ni par document n'est documentée | Non trouvée |

La déclaration mesurée pour C2 (13 ko de vocabulaires) tient dans une entrée.
Une déclaration posée sur la collection qu'elle décrit, plutôt que sur
`figma.root`, suivrait peut-être la collection dans un fichier consommateur ;
la documentation ne le dit pas.

**Réponse du mainteneur :** l'offre Professional ne permet pas de créer de
branche Figma. Le cas des branches est donc sans objet pour cette équipe.

**Essais du mainteneur :**

| Essai | Résultat |
|---|---|
| Dupliquer un fichier qui porte des palettes, ouvrir Palettes dans la copie | Les palettes sont présentes : la donnée rangée sur le fichier suit la duplication |
| Ouvrir un fichier vierge qui emploie la bibliothèque des palettes, puis l'explorateur, « Lire la recette UCM Palettes » | « Ce fichier ne porte aucune recette UCM Palettes » : la donnée rangée sur le fichier de la bibliothèque ne voyage pas avec elle |

Une déclaration rangée sur le fichier ne se lit donc que dans le fichier de
la bibliothèque, là où les variables se créent. Un fichier qui emploie la
bibliothèque la reçoit par le dépôt, dans `tokens.json`, ou pas du tout. La
donnée rangée sur une collection n'a pas été essayée.

## R8. Les descriptions de variables

| Fait | Source |
|---|---|
| `Variable.description` est une chaîne ; l'API ne dit rien de son affichage ni de sa longueur | [Variable](https://developers.figma.com/docs/plugins/api/Variable/) |
| L'outil `get_variable_defs` du serveur MCP de Figma rend les variables et styles de la sélection ; la page ne mentionne aucune description | [Outils du serveur MCP](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) |
| Figma déploierait un export natif au format DTCG, un fichier par mode, avec ses métadonnées sous `$extensions["com.figma"]` | Résultats de recherche seulement ([forum](https://forum.figma.com/ask-the-community-7/native-variable-export-feature-47831)) ; non vérifié |

**Réponse du mainteneur :** la description se modifie par clic droit sur une
variable, « Edit variable », champ « Description ». Elle s'affiche dans
l'infobulle, au survol de la variable, partout dans Figma. Un designer la lit
donc sans plugin.

**Essai du mainteneur :** une description d'environ 500 caractères s'affiche
entière dans l'infobulle, sans troncature. Le mainteneur note qu'une
description longue sert surtout à un agent, et qu'un designer lit une
description courte et précise.

Il reste à savoir si le serveur MCP de Figma transmet la description, et
l'exporteur ne la publie pas encore dans `tokens.json`.

## R11. Les échelles typographiques

| Système | Niveaux | Propriétés |
|---|---|---|
| [GitHub Primer](https://primer.style/product/primitives/typography/) | `display` ; `title-large`, `title-medium`, `title-small` ; `subtitle` ; `body-large`, `body-medium`, `body-small` ; `caption` ; `codeBlock`, `codeInline` | `--text-{style}-{property}-{size}` avec `size`, `lineHeight`, `weight` ; pas d'espacement des lettres |
| [IBM Carbon](https://carbondesignsystem.com/elements/typography/overview/) | Deux jeux, productif et expressif ; suffixes `-01` et `-02` ; titres expressifs variables selon le point de rupture | Taille, graisse, interligne |
| [Material 3](https://m3.material.io/styles/typography/type-scale-tokens) | Rôle, taille, propriété ; les rôles `display`, `headline`, `title`, `body`, `label` en `large`, `medium`, `small` sont à vérifier | `font`, `size`, `line-height`, `tracking`, `weight` |
| Atlassian | Non vérifié : page vide | Non vérifié |

Le Playground suit les rôles de Material 3. Primer écrit la propriété avant
la taille (`--text-body-size-large`) ; Material 3 écrit le rôle, la taille,
puis la propriété. La grammaire typographique du référentiel doit choisir
l'un de ces ordres.

## R13. Ce que lisent les agents

| Mécanisme | Ce qu'il expose | Source |
|---|---|---|
| Serveur MCP `@primer/mcp` | Recherche de tokens par intention ou par valeur, groupes de tokens, spécifications, conseils d'usage, contrôle d'une feuille CSS | [Primer MCP](https://primer.style/product/getting-started/foundations/mcp/) ; formats de sortie non détaillés |
| Extension de Primer pour les modèles de langage | `usage` et `rules` par token, dans le fichier de tokens | [R2-REFERENTIEL.md](./R2-REFERENTIEL.md#22-les-autres-systèmes) |
| Serveur MCP de Figma, `get_variable_defs` | Noms et valeurs des variables de la sélection | [Outils du serveur MCP](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) |

Primer est le seul système trouvé qui donne à un agent le sens d'un token et
pas seulement sa valeur. Ses deux canaux correspondent à deux pistes d'UCM :
`$description` ou une extension dans `tokens.json`, et `ucm guide` ou une
commande du CLI qui répond à une intention.

## R7. Le renommage

**Réponse du mainteneur :** renommer une variable ne rompt aucune liaison dans
Figma. La question du renommage porte donc sur le code seul : le chemin
publié change, donc les références des contrats et les variables CSS.
