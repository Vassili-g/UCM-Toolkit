# État du code et contraintes

## Constats établis

Le kit associe huit emplois à des crans fixes. `solid` et `text` partent du
cran 700, `surface` du 100, `border-control` et `focus` du 600.
`on-solid` désigne le fond de référence du thème dans le calcul des promesses.
[Source : emplois.ts](../../../../../../packages/kit/src/emplois/emplois.ts).

Les dix-neuf paires couvrent dix associations. Les paires `text/surface` et
`border-control/surface` avancent leurs deux membres ensemble sur quatre rangs.
`on-solid/solid` conserve son premier plan et avance le fond plein.
La seule paire entre `solid` et le fond de page utilise le décalage 1.
Aucune paire ne couvre directement `solid/surface`.
[Source : paires.ts](../../../../../../packages/kit/src/emplois/paires.ts).

Les états sélectionné et appuyé utilisent tous deux `active`. Le focus utilise
`default` avec un anneau. La table actuelle réduit donc des états distincts à
quatre rangs ; ces rangs ne représentent pas toutes les combinaisons possibles
entre sélection, focus et survol.
[Source : rangs.ts](../../../../../../packages/kit/src/emplois/rangs.ts).

`usagesDeLaPalette()` produit des descriptions de variables et des alias vers
`theme`. La présence de cette fonction ne prouve pas l’écriture des collections
dans Figma. Le plan d’écriture de Palettes porte actuellement sur les palettes
primitives et leurs destinations. Le commentaire d’introduction de `usages.ts`
présente une responsabilité plus large que le déploiement constaté.
[Usages](../../../../../../packages/kit/src/emplois/usages.ts),
[plan d’écriture](../../../../../../packages/plugin-palettes/src/variables/plan.ts),
[état des recherches](../../../README.md).

## Limites d’une garantie

UCM Palettes mesure les couleurs calculées pour chaque thème et chaque intensité
présente. Une palette libre ne porte aucune promesse. Les seuils proviennent de
la recette ; une promesse tenue ne suffit donc pas à revendiquer un niveau WCAG
sans connaître le seuil configuré.
[Source : promesses.ts](../../../../../../packages/couleur/src/promesses.ts).

Le calcul utilise les couleurs sRGB à huit bits après conversion. Une mesure
sur les valeurs théoriques d’une courbe ne remplace pas cette vérification.
Un échantillonnage de teintes ne constitue pas une preuve sur une infinité de
couleurs, de réglages et de fonds.

L’étude devra distinguer une association déclarée, sa mesure sur les tokens
résolus et son application dans un composant. Un nom identique ou un indice
commun ne fournit aucune de ces trois preuves.

## Ce que le diagnostic vérifie réellement

`constatsDesEmplois()` contrôle le support, le rang d’état, la paire et les
couleurs hors table. Les mesures de contraste enrichissent les constats de
paire absente ou de couleur hors table. Une paire reconnue ne passe pas par un
contrôle systématique de son seuil. Ce diagnostic reste non bloquant.
[Source : diagnostic-emplois.mjs](../../../../../../packages/kit/src/lecteurs/diagnostic-emplois.mjs).

Quatre autres limites affectent une évolution vers un catalogue de garanties :

- la reconnaissance d’emploi lit le premier alias dans le contexte par
  défaut ; une chaîne intermédiaire ajoutée exige une adaptation du lecteur ;
- la paire exige une même palette, sauf pour le fond de page ; une combinaison
  entre deux familles est donc hors table même si son contraste suffit ;
- au-delà de 32 combinaisons, le calcul retient le défaut et un seul autre mode
  par axe ; il ne couvre pas les interactions entre tous les modes ;
- un fond ambigu interrompt le contrôle de la paire. L’absence de constat ne
  démontre donc pas un contraste suffisant.

Le lecteur accepte les couleurs sRGB opaques. Il ne compose pas les opacités
des calques avec les couleurs. Les placements servent à retrouver un fond par
préfixe de chemin ; cette relation ne décrit pas toute la géométrie d’un anneau.

## Conséquences pour la recherche

Renommer les rangs casse la reconnaissance actuelle. Ajouter un alias entre
`components` et `usage` peut aussi modifier le résultat. Une proposition doit
prévoir un lecteur de catalogue explicite et une migration des chemins.

Les six marques et deux thèmes de l’architecture représentent douze contextes
si les deux membres dépendent de ces deux axes. Les intensités sont des
segments de chemins, pas nécessairement un troisième axe de modes.
Les extensions de collection et les surcharges demandent un inventaire
supplémentaire des contextes.

Les fichiers `src/tokens/tokens.json` des dépôts voisins `UCM-Playground` et
`intencial-library` ont aussi été inspectés. Ils sont identiques et déclarent
un seul axe, `color-brand-tokens`, avec les modes `intencial` et `marque-2`.
Ils ne portent pas les collections `usage` et `theme` de la cible étudiée.
Leur empreinte SHA-256 commune est
`b0171e0256939144995643b5986c418a81ca87c9e7f487a9e6b7cffdd05f38a5`.
Ces exports ne permettent pas d’évaluer la cible à six marques et deux thèmes.

L’architecture indique une proximité des contrastes à clarté OKLCH égale.
Cette proximité ne doit pas être interprétée comme une égalité de luminance
relative. Les calculs de l’étude portent sur les couleurs produites.

La compatibilité des références relève de la
[politique de compatibilité](../../../../../format/COMPATIBILITE.md).
Les modes publiés utilisent actuellement les extensions UCM décrites dans le
[format](../../../../../format/FORMAT.md#partie-2--export-tokens), et leur historique
reste distinct de celui du contrat de composant dans le
[changelog](../../../../../format/CHANGELOG-FORMAT.md).
