# API Figma pour les renommages du référentiel

Cette référence distingue les faits documentés, les déductions et les points à
éprouver dans Figma. Les signatures ont été confrontées aux types locaux
`@figma/plugin-typings` 1.138.0, dans `node_modules/@figma/plugin-typings/plugin-api.d.ts`.

## Propriétés et valeurs de variante

| Geste | API utilisable | Borne documentée |
|---|---|---|
| Renommer une propriété | `owner.editComponentProperty(oldId, { name })` | `name` accepte notamment `VARIANT`, `TEXT`, `BOOLEAN` et `INSTANCE_SWAP`. Conserver l'identifiant renvoyé pour toute opération suivante. |
| Renommer une valeur de variante | Modifier `ComponentNode.name` sur les variantes concernées | Les noms `Size=Small, State=Hover` déterminent les valeurs. `variantProperties` est en lecture seule. |
| Modifier une valeur par défaut | `editComponentProperty` avec `defaultValue` | Ce champ est interdit pour `VARIANT`. Il ne renomme donc pas une option. |

Sources : [editComponentProperty](https://developers.figma.com/docs/plugins/api/ComponentSetNode/#editcomponentproperty),
[noms des variantes et identifiants de propriété](https://developers.figma.com/docs/plugins/working-with-component-properties/#add-boolean-text-instance-swap-and-variant-properties),
[variantProperties](https://developers.figma.com/docs/plugins/api/properties/nodes-variantproperties/).

Pour un axe de variantes, le propriétaire est le `ComponentSetNode`. Lire les
clés exactes de `componentPropertyDefinitions`, y compris leur suffixe éventuel,
puis relire les définitions après chaque renommage.

Pour une valeur, préparer les noms complets depuis `variantProperties` en
conservant les autres axes. Refuser avant mutation toute combinaison finale
dupliquée et tout nom dont la syntaxe serait ambiguë. Figma signale les
[combinaisons identiques et noms corrompus](https://help.figma.com/hc/en-us/articles/360056440594-Create-and-use-variants#manage-variants).
Une permutation de noms exige des noms temporaires uniques, puis les noms finaux.

## Instances et surcharges

**Documenté.** Les modifications d'un maître se répercutent sur ses instances.
Les modifications destinées aux autres fichiers doivent être publiées dans la
bibliothèque. Voir [Edit main components](https://help.figma.com/hc/en-us/articles/360038665934-Edit-main-components).

**Déduction.** Renommer le maître existant conserve son identité de nœud.
Cette opération devrait conserver le lien des instances locales sans les
recréer ni appeler `swapComponent` ou `setProperties` sur chacune d'elles.
Les sources consultées ne garantissent pas explicitement le résultat pour
chaque surcharge après `editComponentProperty` ou modification du nom d'une variante.

**Borne.** Figma décrit une préservation conditionnelle des surcharges lors
d'un changement de variante ou de composant : noms des calques correspondants,
propriétés initiales compatibles, règles particulières pour le texte.
Cette règle ne constitue pas une garantie de renommage sans perte.
Voir [Apply changes to instances](https://help.figma.com/hc/en-us/articles/360039150733-Apply-changes-to-instances#change-preservation).

Le plugin agit dans le document ouvert. Il ne peut ni inspecter ni corriger
toutes les instances des fichiers consommateurs. La publication et la réception
des mises à jour restent des étapes distinctes à éprouver sur une bibliothèque.
Les maîtres `remote` sont exclus des cibles de renommage.

## Variables et collections

`Variable.name` et `VariableCollection.name` sont modifiables. Leurs `id` et
`key` sont en lecture seule ; une variable conserve aussi son
`variableCollectionId`. Les alias référencent un `id`, sans nom.
Sources : [Variable](https://developers.figma.com/docs/plugins/api/Variable/),
[VariableCollection](https://developers.figma.com/docs/plugins/api/VariableCollection/),
[VariableAlias](https://developers.figma.com/docs/plugins/api/VariableAlias/).

**Déduction.** Affecter seulement `name` sur l'objet existant conserve les
liaisons Figma et les alias fondés sur l'identifiant. Recréer la variable pour
la renommer ferait perdre cette propriété.

Les consommateurs qui calculent des chemins depuis les noms, dont les exports
de tokens, observent un changement de chemin. Aucun mécanisme Figma ne réécrit
leurs références textuelles externes. Renommer une collection change de même
le segment de collection calculé par un exporteur.

Limiter l'écriture aux objets locaux. Relire noms, identifiants, modes, valeurs
et alias après application ; éprouver séparément la propagation d'une variable
publiée dans un autre fichier.

## Annulation et échec partiel

`commitUndo()` crée une séparation dans l'historique. L'exemple officiel groupe
plusieurs créations dans une seule annulation en l'absence de séparation.
`triggerUndo()` revient au dernier état délimité par `commitUndo()`.
Sources : [commitUndo](https://developers.figma.com/docs/plugins/api/properties/figma-commitundo/),
[triggerUndo](https://developers.figma.com/docs/plugins/api/figma/#triggerundo).

Délimiter le geste avant la première écriture si le plugin a déjà écrit, puis
appeler `commitUndo()` une fois après l'ensemble des renommages et du rangement
de la convention. Aucun appel intermédiaire ne doit découper cette application.
Vérifier en recette qu'une seule annulation restaure tous ces objets.

L'API ne fournit pas ici de transaction avec validation atomique ou rollback
conditionnel. Une exception entre deux affectations peut laisser une application
partielle. Préparer et valider toutes les opérations avant écriture ; conserver
les anciennes valeurs et la liste exacte des opérations exécutées.

Une restauration manuelle ou `triggerUndo()` demande une vérification dans le
document réel, notamment avec plusieurs collaborateurs. Les sources consultées
ne garantissent pas l'isolation de ce rollback face aux mutations concurrentes.
Un `commitUndo()` final, à lui seul, ne restaure rien après un échec.

## Chargement et coût

Les variables existent hors des pages. Appeler une fois
`getLocalVariablesAsync()` et `getLocalVariableCollectionsAsync()` pour construire
l'index ; leur lecture n'exige pas le chargement de tous les calques.
Sources : [getLocalVariablesAsync](https://developers.figma.com/docs/plugins/api/properties/figma-variables-getlocalvariablesasync/),
[migration vers dynamic-page](https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading/).

Pour inventorier les composants de toutes les pages, charger chaque page avec
`await page.loadAsync()` avant son parcours, ou attendre
`figma.loadAllPagesAsync()` avant `figma.root.findAllWithCriteria(...)`.
Le chargement global peut être lent et atteindre une limite de mémoire.
La même documentation distingue le chargement global, qui suit les nouvelles
pages des autres clients, du chargement manuel des pages présentes.

Décision d'implémentation : parcourir les pages progressivement, relever les
composants avec un critère de type, indexer les résultats et afficher
l'avancement. Réserver le chargement global aux besoins qui l'exigent.
La documentation ne donne aucune durée pour 800 variables ni aucun nombre
de composants garantissant un délai. Mesurer séparément lecture, parcours et
écriture dans un fichier représentatif ; laisser respirer l'interface entre
les lots de travail. Les mutations de nom restent synchrones.

## Convention rangée dans le document

`figma.root` est le `DocumentNode`, qui accepte les données de plugin.
`setPluginData` est privé à l'identifiant du plugin ; les collaborateurs utilisant
ce même plugin lisent ainsi la convention du fichier.
`clientStorage` convient aux préférences locales, pas à cette convention.
Sources : [DocumentNode](https://developers.figma.com/docs/plugins/api/DocumentNode/),
[setPluginData](https://developers.figma.com/docs/plugins/api/properties/nodes-setplugindata/).

Si plusieurs plugins UCM doivent la lire, proposer
`figma.root.setSharedPluginData('ucm', 'referentiel', JSON.stringify(...))`.
Le namespace `ucm` et la clé `referentiel` sont une proposition à stabiliser.
Inclure une version de structure ; distinguer absence, JSON illisible et version
non prise en charge. La limite par entrée est de 100 kB, namespace et clé compris.
Tous les plugins peuvent accéder aux données partagées : ne pas y ranger de secret.
Source : [setSharedPluginData](https://developers.figma.com/docs/plugins/api/properties/nodes-setsharedplugindata/).

Relire la convention avant application pour détecter un changement depuis
l'aperçu. Cette comparaison réduit les écrasements ; l'API citée ne propose
pas d'écriture conditionnelle atomique.

## Recette nécessaire avant une promesse produit

| Cas | Résultat à relever |
|---|---|
| Propriété `VARIANT`, `TEXT`, `BOOLEAN`, `INSTANCE_SWAP` renommée | Nouvel identifiant, références imbriquées, valeurs et surcharges de plusieurs instances locales |
| Valeur de variante renommée sur plusieurs composants | Même maître pour chaque instance, nouvelles options, texte, couleur et instance imbriquée surchargés conservés |
| Variable et collection renommées | Identifiants, alias, liaisons, modes et rendu inchangés ; nouveaux chemins exportés |
| Bibliothèque publiée puis mise à jour dans un fichier consommateur | Nouvelle terminologie, choix de variante et surcharges avant/après réception |
| Application complète puis une annulation | Tous les noms et la convention restaurés ; rétablissement vérifié aussi |
| Échec injecté après quelques écritures | État partiel constaté, restauration vérifiée, absence d'annonce de réussite |
| 800 variables et composants répartis sur plusieurs pages | Temps de chaque phase, mémoire, réactivité, annulation avant mutation et conflit de convention |

Aucun blocage d'accès aux sources ou aux types. Les garanties de préservation,
de rollback et de durée restent à établir par cette recette ; aucune exécution
dans Figma n'a été réalisée pour cette référence.
