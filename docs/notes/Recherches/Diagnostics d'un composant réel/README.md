# Diagnostics et propriétés visuelles de l'exporteur

Les corrections des diagnostics et l'évolution du contrat en 14.0 sont
implémentées. Ce bilan conserve les décisions et les validations restantes ;
les consignes d'exécution et les journaux de commandes se retrouvent dans Git.

## Ce qui est implémenté

| Sujet | Source ou preuve durable |
|---|---|
| Intention provisoire, états `focused` et `pressed`, tailles des calques masqués et marqueur des règles d'icônes | [Scénario de diagnostics](../../../../packages/plugin-exporter/tests/diagnosticsComposantReel.test.ts), tests des règles et de la sémantique |
| Constats regroupés sur les racines des variants | [localisation.ts](../../../../packages/plugin-exporter/src/contract/localisation.ts), [scénario de diagnostics](../../../../packages/plugin-exporter/tests/diagnosticsComposantReel.test.ts) |
| Instances imbriquées non publiées comme dépendances et calques des vues exactes | [Spécification de l'exporteur](../../../../packages/plugin-exporter/SPEC.md), [tests des silences de layout](../../../../packages/plugin-exporter/tests/layoutSilences.test.ts) |
| Collision d'identifiant avec noms des fichiers Figma | [depot.ts](../../../../packages/plugin-exporter/src/depot.ts) |
| Opacité tokenisée et catalogue de styles d'effets | [Format courant](../../../format/FORMAT.md), [effectStyles.ts](../../../../packages/plugin-exporter/src/contract/effectStyles.ts), [tests des effets](../../../../packages/plugin-exporter/tests/effectStyles.test.ts) |
| Enfants d'un cadre sans auto layout placés par contraintes et distances aux bords | [extractLayout.ts](../../../../packages/plugin-exporter/src/contract/extractLayout.ts), [tests de layout](../../../../packages/plugin-exporter/tests/extractLayout.test.ts) |

Le [changelog du format](../../../format/CHANGELOG-FORMAT.md) décrit la rupture
14.0. La forme contractuelle relève de FORMAT ; les conditions de lecture et
les constats relèvent de SPEC.

## Décisions à conserver

La [comparaison des formes possibles](./DECISION-PROPRIETES-VISUELLES.md)
garde les alternatives et les choix retenus : catalogue `effectStyles`,
opacité tokenisée, placement absolu des enfants d'un cadre libre et
avertissement pour les masques.

Les mesures Figma consignées pendant l'étude ont établi :

- un flou de calque de 8 correspond à `blur(4px)` ;
- une ombre suit le contenu sur un cadre sans fill et les lettres sur un texte ;
- une variable d'opacité de 0,5 correspond à 0,5 %, d'où la division par 100 ;
- un calque peut conserver l'identifiant de son effect style après une retouche.

Les aides [ombre](../../../../packages/cli/aides/ombre.md) et
[opacité](../../../../packages/cli/aides/opacite.md) donnent l'écriture attendue.
L'ordre des ombres dans la liste `effects` de l'API reste à confirmer sur un
fichier réel.

Les axes figés sans variable continuent d'avertir, y compris sous
`STRETCH` ou `SCALE`. Les avertissements d'absence d'auto layout restent
présents lorsque le contenu ne peut pas se redisposer.

## Validations et suites

La recette restante consiste à réexporter le composant réel et à vérifier :

1. un effect style à deux ombres de couleurs distinctes, avec comparaison de
   leur ordre dans Figma et dans le rendu ;
2. l'opacité publiée lorsqu'elle est liée à une variable ;
3. le placement des enfants d'un cadre libre ;
4. la liste agrégée des constats, sans répétition par variant.

Les cas suivants gardent une rédaction distincte ou demandent encore un
choix éditorial :

- une couleur ou un stroke qui change de rôle et implique deux calques ;
- une variable introuvable, signalée une fois mais encore rattachée au premier calque ;
- un variant sans aucune couleur liée ;
- les côtés sans variable d'un groupe dont aucun côté n'est publié.

[TEXTES-A-VALIDER.md](./TEXTES-A-VALIDER.md#reste-à-valider) conserve ces
réserves et les formulations retenues. L'absence de recette consignée ne remet
pas les corrections implémentées dans une liste de développement à lancer.
