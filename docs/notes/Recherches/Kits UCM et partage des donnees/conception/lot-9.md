# Conception du lot 9

Les chemins de tokens appartiennent à `core/format/chemins-de-tokens.ts`.
Leur écriture et leurs tests gardent les mêmes résultats.

## La décision des axes

`core/format/axes-de-collections.ts` publie `deciderAxesDesCollections`.
L’entrée portable porte `id`, `nom`, `nombreDeModes`, `extension` et `racine`.
Une collection sans modes connus ne devient pas un axe ; une racine locale
étendue en devient un même avec un seul mode.

La fonction décide seule des préfixes, des collisions de préfixes et des
collisions avec le nom réservé aux extensions. Elle rend les axes retenus
(`cle`, `extensions`) et toutes les paires en conflit, triées par identifiant
pour les préfixes partagés. L’ordre des axes suit celui des collections.

L’option `nomDe` simule les renommages. L’option `qualifier` valide un candidat
après le contrôle de son préfixe ; elle rend `null` pour un candidat écarté,
ou la présence des extensions réellement publiables. L’exporteur y valide les
noms des modes, le défaut et l’arbre des extensions avec ses données complètes.
Le socle ne dispose que du nombre de modes : son estimation conserve les
candidats dont ces données ne permettent pas de juger la validité.

Les callbacks `refuser` et `conflitDExtensions` situent les décisions dans
l’ordre de publication des diagnostics. Ils ne changent pas la décision.
L’exporteur garde ses textes et ses données d’extension ; le kit ne dépend
pas de Figma. Le socle appelle la même fonction pour les axes et les conflits.

## Les preuves

`tests/axesDeModes.test.ts` compare les adaptateurs au résultat du kit, avant
et après renommage. Les cas couvrent les collections à un et deux modes,
les extensions locales et distantes, les préfixes vides, les collisions
préexistantes et les noms réservés aux extensions. Les tests de l’exporteur
gardent leurs attentes sur les modes, les extensions et les diagnostics.
