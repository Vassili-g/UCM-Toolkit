# Critique de la recherche et du format des pièces internes

La proposition peut décrire les variantes des pièces que l'hôte ne pose pas.
Sa forme actuelle ne suffit pas à garantir une reconstruction sans perte.
Les remplacements vides, les remplacements imbriqués, les liaisons traversantes
et le budget demandent une règle supplémentaire avant l'implémentation.

Cette critique porte sur
[RECHERCHE-PIECES-INTERNES.md](./RECHERCHE-PIECES-INTERNES.md) et
[ETUDE-FORMAT-DES-PIECES.md](./ETUDE-FORMAT-DES-PIECES.md).
Elle confronte leurs propositions au code du dépôt, au format 14.0 et aux
sources officielles citées ci-dessous. La 15.0 proposée n'est pas implémentée.
Les cas reproduits portent sur les fonctions actuelles que l'étude veut réutiliser.
Un essai dans Figma et des mesures sur le futur moteur restent nécessaires.

## 1. Les choix qui tiennent

| Proposition | Évaluation |
|---|---|
| Un bloc `pieces` propre au contrat de l'hôte | Il conserve la distinction entre une définition interne et une dépendance qui possède un contrat autonome. |
| Une entrée par identité Figma de pièce | Elle évite de recopier sa définition à chaque occurrence. Le nom normalisé sert à publier la clé, pas à reconnaître le maître. |
| Des pièces rangées à plat | Elles permettent de partager une définition à plusieurs profondeurs. Les occurrences doivent rester distinctes. |
| La lecture de tous les variants réels de chaque pièce | Elle répond au défaut décrit dans la recherche. Les booléens ne doivent pas devenir des axes de variants supplémentaires. |
| Des catalogues partagés par égalité stricte | Ils peuvent partager des blocs identiques. Leur résolution doit recevoir le contexte de l'entrée et celui de l'occurrence. |
| Une version majeure du format | Elle relève de la classe 2 de `docs/format/COMPATIBILITE.md`. Un lecteur ignorant les renvois perdrait le contenu des pièces. |
| Des règles propres aux pièces à propriétés | Cette décision permet de documenter leur API. Elle demande de changer ensemble la classification, le relevé et la création des règles. |

Ces choix restent des propositions, sauf les deux décisions explicitement
attribuées au mainteneur dans la recherche.

## 2. Défauts de résolution à corriger

### C1. Un remplacement vide devient impossible après élision

Priorité P1. Défaut reproduit avec la fonction actuelle.

Le §5 de l'étude donne à l'absence de `tokens` et de `strokes` le sens
« reprendre la feuille de la variante ». Une instance peut pourtant supprimer
la dernière peinture ou le dernier contour de son maître. Son remplacement
complet doit alors être vide.

`packages/plugin-socle/src/composant/contract/elideNeutrals.ts` retire les
objets et tableaux vides hors des chemins protégés. L'expérience suivante
appelle cette fonction du dépôt.

```text
Maître       tokens = { foreground: "{components.card.foreground}" }
Renvoi       { slotPath: ["header"], tokens: {}, strokes: {}, pieces: [] }
Après élision { slotPath: ["header"] }
Résolution   la couleur du maître revient
```

Le même problème concerne une liste de pièces remplacée par une liste vide.
Ajouter seulement `pieces` aux types ne corrige pas ce changement de sens.

Définissez trois états pour chaque champ remplaçable, puis testez leur
aller-retour de sérialisation. L'absence conserve la valeur du maître. Une
valeur vide explicite efface cette valeur. Une valeur non vide la remplace.
Protégez les chemins correspondants dans l'élision, ou publiez un marqueur
d'effacement distinct. Faites évoluer la règle « aucune valeur neutre écrite »
si le format retient les valeurs vides explicites.

### C2. Les remplacements des pièces imbriquées n'ont pas de résolution définie

Priorité P1. Lacune de la forme proposée.

Le §5 annonce un champ `pieces` dans le renvoi pour les propriétés exposées
d'une pièce imbriquée. Il ne définit ni son type, ni sa priorité, ni son
comportement quand la liste manque. Le tableau des types à modifier au §8
ne décrit pas cette récursivité.

Supposons que `Card` pose `.Header`, qui pose `.Badge`. Deux occurrences de
`.Header` choisissent deux variantes différentes de `.Badge`. Remplacer
uniquement la vue de `.Header` conserve un slot `piece: "Badge"` identique.
La différence peut donc ne changer ni l'arbre, ni les peintures de `.Header`.
Sans renvoi d'occurrence vers la bonne variante de `.Badge`, le lecteur reprend
le choix du maître.

Décrivez les renvois imbriqués dans le type du renvoi. Fixez leur portée
relative à la pièce, leur règle d'absence et leur règle d'effacement.
Collectez aussi les remplacements internes sans propriété exposée.
L'exposition facilite l'édition dans Figma, mais ne détermine pas la présence
d'une différence visuelle.

### C3. L'arrêt du parcours supprimerait des liaisons que l'étude veut conserver

Priorité P1. Contradiction entre deux passages du §5 et le parcours proposé.

L'étude arrête le parcours de l'hôte à l'instance de pièce. Elle conserve
aussi, dans les `bindings` de l'hôte, les liaisons vers les calques intérieurs
qui citent une propriété de l'hôte.

`packages/plugin-socle/src/composant/contract/propertyBindings.ts` relève les
liaisons en parcourant `getAllNodesParEtapes`. Ajouter les pièces à sa carte
d'arrêt retire ces calques de son entrée. L'analyse du maître de la pièce ne
peut pas retrouver une liaison propre à une occurrence posée dans l'hôte.

Prévoyez une acquisition des liaisons traversantes avant l'arrêt, ou un
parcours ciblé des occurrences. Rattachez chaque propriété au composant qui la
déclare par son identité Figma. Ne décidez pas ce rattachement par son nom
normalisé.

Un `figmaPath` est un chemin de noms Figma. Un `slotPath` est un chemin de slots
publiés. Le critère C doit les vérifier selon leurs règles respectives.
La concaténation de deux `slotPath` ne suffit pas à valider une liaison native.

### C4. La racine de la pièce et son slot peuvent décrire le même réglage

Priorité P1. Règle de priorité manquante.

Le slot porte `bounds`, `rotation` et `opacity`. La vue résolue de la pièce
peut également les porter à sa racine. Le §6 décrit la fusion des champs de
placement et de flux, sans attribuer tous ces champs à un seul propriétaire.

Pour une opacité du maître de 50 % et une instance passée à 80 %, appliquer
les deux valeurs sur deux boîtes imbriquées produit 40 %. Figma attend ici
l'opacité de l'instance, soit 80 %. Pour une rotation du maître de 10 degrés
et une instance réglée à 20 degrés, le lecteur doit savoir si le slot porte
une valeur finale ou un écart.

`docs/format/FORMAT.md` et
`packages/plugin-socle/src/composant/contract/extractLayout.ts` évitent déjà de
republier l'opacité d'une dépendance à égalité. Cette règle ne définit pas à
elle seule la fusion d'une pièce dépliée dans le même arbre.

Écrivez une table par champ de racine. Indiquez sa source, son propriétaire
dans l'occurrence résolue et la priorité du remplacement. Traitez aussi le
retour à la valeur neutre, les bornes retirées et le dimensionnement sur chaque
axe. Vérifiez que `sizing` exclu de la fusion ne fait perdre aucun comportement
`Hug` ou `Fill` que le slot doit alors porter.

### C5. Les `args` normatifs ne définissent pas encore une occurrence exacte

Priorité P1. Règle de cohérence manquante.

Une occurrence peut publier `args.showIcon: false` tout en citant une vue dont
le slot d'icône porte `visibilityProp: "showIcon"`. Il faut préciser comment
le lecteur applique cette valeur, puis comment un remplacement direct de
visibilité interagit avec cette liaison. Deux sources contradictoires doivent
produire un refus ou une résolution déterminée.

Le nom du composant placé dans un `INSTANCE_SWAP` ne désigne pas nécessairement
sa variante. Deux variantes du même set ont le même nom de propriétaire.
Décrivez la cible et sa variante quand cette distinction change le rendu.
Précisez aussi le traitement des alias de variables sur les propriétés.

Publiez une seule règle de résolution dans le kit. Le moteur, les diagnostics
et la fonction de dépliage doivent produire la même occurrence effective.
Le JSON d'exemple vérifie surtout les renvois par défaut. Ajoutez un exemple
avec une vue remplacée, un effacement et une pièce imbriquée remplacée.

## 3. Complétude, budget et performances

### C6. Le budget proposé contredit la complétude et ne borne pas les lectures

Priorité P1. Comportement du budget reproduit dans le code actuel.

Le §4 admet qu'une pièce puisse être écartée par le budget. Le critère B du
§6 exige tous ses variants. Le critère C exige que chaque renvoi résolve une
variante présente. Une pièce omise, mais encore citée dans l'hôte, violerait
ce dernier critère même avec une couverture partielle.

`packages/plugin-socle/src/composant/contract/budget.ts` conserve toujours le
variant de référence de chaque analyse, sans borne. Trois appels sur trois
racines de cinq layers, avec un budget de un par appel, conservent quinze
layers. Transmettre un budget restant à chaque appel ne supprimerait pas
cette exception.

Le compteur actuel s'arrête aussi à chaque instance. Il ne compte donc pas
les descendants d'occurrence que la comparaison des remplacements doit lire.
Le budget ne mesure ni les balayages de pages, ni les signatures, ni la
sérialisation. Il constitue une limite de sélection, pas une limite du coût
total de l'export.

Séparez les résultats d'analyse bornée des contrats publiables. Pour un export
complet, résolvez tous les renvois avant publication. Pour un export partiel,
définissez une représentation valide de la coupure et son diagnostic.
Réservez le coût des variantes réellement citées avant celui des variantes
supplémentaires. Comptez les lectures d'occurrence dans un budget commun.

### C7. Une file finie ne garantit pas un dépliage fini et peu coûteux

Priorité P1 pour les cycles des contrats entrants. Priorité P2 pour le coût.

L'ensemble des sets vus suffit à terminer la découverte des définitions.
Il ne suffit pas à terminer le dépliage des occurrences. Un JSON fabriqué peut
décrire A qui pose B, puis B qui pose A. Ces deux entrées sont atteintes et
leurs renvois peuvent viser des variantes existantes. Le critère C proposé
ne refuse pas ce cycle.

Validez l'absence de cycle avant le dépliage. Gardez aussi une pile des
occurrences en cours dans le résolveur. Un ensemble global de pièces visitées
ferait disparaître la deuxième occurrence légitime d'une pièce partagée.

Même sans cycle, une définition posant deux fois la définition suivante
produit `2^d` occurrences au niveau `d`. Les lecteurs du graphe peuvent garder
les définitions factorisées. Les contrastes doivent conserver le contexte de
placement de chaque occurrence. La parité doit conserver sa multiplicité.
Évitez de déplier tout le contrat pour chacun de ces lecteurs.

La profondeur locale de structure est déjà bornée à 12 dans
`packages/plugin-socle/src/composant/contract/structureTree.ts`.
Précisez si la nouvelle limite s'applique par définition ou au chemin déplié.
Une suite de pièces courtes peut dépasser 12 après résolution.

### C8. La mesure de taille n'établit aucune performance du futur moteur

Priorité P2. Preuve manquante.

Le script `mesure.mjs` n'est pas fourni avec l'étude. Les octets annoncés ne
sont donc pas reproductibles depuis le dépôt. La mesure part d'une fixture
13.0 synthétiquement enrichie, alors que la cible est une extraction 15.0
issue du moteur 14.0.

Le passage de 18 066 à 28 544 octets représente 10 478 octets supplémentaires,
soit 58 %. Le gain des catalogues partagés face aux catalogues locaux vaut
930 octets, soit 3,3 % de la forme proposée. Ce résultat ne tranche pas le
coût de leur résolution contextualisée.

Le nombre de variants doit rester 16 pour quatre thèmes et quatre affichages.
Deux propriétés booléennes donnent quatre configurations possibles par
variant. Elles ne donnent pas deux variants supplémentaires. Le produit
cartésien de comparaison atteint bien `8 × 16 × 4 = 512` configurations,
mais il reste une option artificielle que la proposition évite.

Mesurez le JSON réellement sérialisé, le temps d'analyse, le temps de
compaction, le temps de lecture et la mémoire maximale. Relevez aussi le
nombre d'appels aux maîtres et de chargements de pages. Comparez un cas sans
pièce, une pièce répétée, plusieurs niveaux et des remplacements presque tous
distincts. Publiez le protocole et les entrées nécessaires pour rejouer les
chiffres. Fixez les seuils après cette mesure.

La factorisation réduit la répétition des définitions publiées. Elle ne
supprime pas l'extraction de chaque occurrence qui peut différer de son maître.
Une mémoire de calcul doit inclure ce contexte, puis être invalidée quand les
nœuds ou les règles changent.

## 4. Lecteurs, parité et compatibilité

### C9. Une union de dépendances ne suffit pas à calculer leur cardinalité

Priorité P1. Contre-exemple à la recommandation Q5.

Supposons que l'hôte pose deux fois `.Actions`, qui contient un `Button`.
La définition de `.Actions` contient une dépendance. L'hôte en rend deux.
Une union simple des dépendances des entrées n'en exige qu'une.

`packages/adapter-typescript/src/parite.mjs` compte déjà les vues locales à
chaque appel. Ses tests vérifient qu'une vue réutilisée s'additionne.
Une union des définitions comparerait donc deux grandeurs différentes.

Gardez Q5 A pour ranger les dépendances dans leur entrée. Utilisez une union
de cibles pour le graphe de contrats. Pour la parité, calculez les occurrences
de chaque vue effective, puis le maximum entre variantes alternatives.
Incluez les dépendances introduites ou retirées par un renvoi remplacé.

La lecture facultative de `<Pièce>Props` reste compatible avec une pièce
privée. Elle doit rendre une mesure absente quand le type manque.
La présence d'un type homonyme ne prouve pas que le sous-composant le consomme.
Associez le type à sa fonction avant de juger les booléens utilisés.
Relisez toutes les pièces dans le même programme TypeScript pour éviter une
compilation par pièce.

Vérifiez aussi la collision entre le nom de l'hôte et celui d'une pièce.
`Card` et `.Card` conduisent tous deux à `CardProps` avec la convention proposée.

### C10. Le partage des catalogues exige une validation par contexte

Priorité P1 pour la validité des renvois. Priorité P2 pour la factorisation.

`packages/kit/src/lecteurs/variant-views.mjs` exporte
`vueExacteDuVariant`. La fonction `resoudreLaVue` citée au §3 n'y existe pas.
Le lecteur actuel lit la version, les catalogues et les champs d'un contrat
complet. Lui passer une entrée de pièce sans `meta` ne suffit pas.

Définissez une interface de résolution recevant le contrat racine, l'entrée
propriétaire, le variant et l'éventuel renvoi d'occurrence. Vérifiez chaque
usage avec les `props`, les rôles et les icônes de cette entrée. Comptez les
entrées de catalogue utilisées dans le contrat entier avant de refuser
les entrées orphelines.

La compaction des liaisons déplace une fin commune de `nodeId` dans
`propertyBindingDefinitions.*.nodeSuffix`. Le passage à des tables partagées
doit calculer cette fin sur toutes les occurrences d'une définition, ou garder
des définitions distinctes. Un appel ultérieur ne doit pas modifier une
définition déjà citée sans recalculer ses placements antérieurs.

L'unicité de l'id suffixant `figmaPropName` ne remplace pas cette vérification.
Des variantes, des wrappers et des occurrences peuvent réutiliser une
déclaration de propriété.

### C11. La classification du wrapper demande un seul ordre explicite

Priorité P1 pour la conservation de l'API de l'hôte.

La recherche décide de tester le préfixe avant les règles. Q1 recommande
pourtant l'ordre « dépendance publiée, wrapper, pièce, détail ». Dans le code
actuel, les règles rendent une pièce préfixée dépendance avant tout autre test.
Conserver ce premier test réintroduirait le problème que la décision retire.

Écrivez les prédicats, puis leur ordre. Un nom préfixé doit être exclu du test
de dépendance. Un wrapper élu doit garder son traitement de wrapper selon la
réponse à Q1. La règle actuelle compte les dimensions liées pour reconnaître
un wrapper. Vérifiez qu'une pièce ordinaire avec une dimension liée ne perd
pas involontairement son entrée.

Appliquez la même décision dans `packages/kit/src/referentiel/composition.ts`,
`packages/plugin-socle/src/composant/contract/composedComponents.ts` et
`packages/plugin-architect/src/imbriquesDuReleve.ts`.

Q2 A demande aussi un cas d'icône sans propriété. Une règle `@icons` de l'hôte
peut désigner un dessin situé dans une pièce. Arrêter le parcours de l'hôte,
puis analyser la pièce sans règles propres, risque de perdre cette déclaration.
Fixez le propriétaire de cette règle avant de généraliser la coupure.

Le référentiel admet aujourd'hui une pièce servant plusieurs composants.
La recherche écarte ce cas. Dites si cette exclusion limite seulement le
premier lot, ou si l'export doit la détecter. La nouvelle obligation de règles
ne doit pas casser silencieusement ce cas déjà reconnu.

La migration 14.0 vers 15.0 doit aussi prévoir les versions des paquets et
l'ordre de mise à jour des consommateurs. Ne retirez un ancien corpus que
dans les conditions de `packages/kit/invariants/corpus-de-test.md`.

## 5. Les preuves proposées doivent être élargies

La comparaison `E14` contre le dépliage de `E15` vérifie une conservation sur
les cas déjà décrits par la 14.0. Elle ne prouve pas la fidélité de deux voies
qui partagent une extraction fautive. Le critère B emploie aussi deux appels
du même moteur. Ajoutez des attentes explicites tirées de chaque montage.

Une carte de pièces vide ne rétablit pas automatiquement le comportement
14.0. La nouvelle exclusion des noms préfixés dans `estContracte` et la
nouvelle attribution des propriétés changent aussi la classification.
Définissez la politique de l'ancienne voie, surtout pour une pièce qui porte
déjà des règles. Faites converger les extractions communes après cette
classification.

Q6 B accepte une perte sur le contenu `SLOT`. Cette décision est compatible
avec une couverture partielle, mais pas avec une preuve générale « sans
perte ». Bornez le critère A aux cas pris en charge. Vérifiez séparément la
coupure, son diagnostic et la validité des renvois restants.

Les trois fichiers de test proposés ne constituent pas trois preuves déjà
acquises. Leur contenu devra couvrir au moins les cas suivants.

| Cas | Résultat à vérifier |
|---|---|
| Pièce `COMPONENT` seule, sans set et sans propriété | Une variante sans axe et un renvoi valide. |
| Variante de pièce jamais posée par l'hôte | Sa définition est publiée et ses tokens sont contrôlés. |
| Deux occurrences du même maître | Une définition, deux contextes de rendu distincts. |
| Suppression du dernier fill ou stroke | Le vide survit à la sérialisation et efface le maître. |
| Remplacement d'une variante de pièce imbriquée | Le choix atteint l'occurrence concernée seulement. |
| Boolean local et propriété de l'hôte sur un calque intérieur | Chaque liaison garde son propriétaire. |
| Propriété exposée à plusieurs niveaux | Son adresse reste résoluble après factorisation. |
| Override de visibilité sans propriété | La vue effective correspond à l'instance. |
| Opacité héritée, remplacée et ramenée à 100 % | Une seule valeur finale agit sur le layer. |
| Rotation, bornes et dimensionnement remplacés | La résolution applique la priorité documentée. |
| Deux variantes d'un même set choisi par swap | La cible visuelle reste distinguable. |
| Texte remplacé, sauts de ligne et échantillon absent | Le normatif reste inchangé après retrait de `samples`. |
| Dépendance publiée dans une pièce répétée | Le graphe garde la cible et la parité garde le nombre. |
| Deux noms donnant le même identifiant de code | L'export refuse la collision en nommant les deux pièces. |
| Cycle direct ou indirect dans un JSON entrant | Le lecteur refuse avant le dépliage. |
| Catalogue partagé par deux entrées aux props différentes | Chaque usage est validé dans sa propre portée. |
| Budget épuisé avant une variante citée | Aucun renvoi pendant ne sort dans le contrat. |
| Page non chargée ou maître illisible | Un échec explicite remplace toute omission silencieuse. |
| Annulation ou modification pendant les lectures | Aucun contrat mélangé entre deux états n'est publié. |
| Contrats 14.0 et 15.0 | La fenêtre de compatibilité donne le verdict attendu. |

## 6. Les sources externes confirment une partie des recherches

La documentation de `ComponentSetNode` confirme l'accès aux variants par le
set et la dépréciation de `variantGroupProperties`. La documentation
d'`InstanceNode` confirme les propriétés appliquées et les instances exposées.
Elle précise que `overrides` exclut les remplacements hérités. Le tableau du
§5 ne doit donc pas utiliser cette seule liste comme vérité complète de
l'instance. Comparez ses valeurs effectives au maître.
Sources officielles [ComponentSetNode](https://developers.figma.com/docs/plugins/api/ComponentSetNode/)
et [InstanceNode](https://developers.figma.com/docs/plugins/api/InstanceNode/).

Figma documente le chargement explicite d'une page avant la lecture de ses
enfants. Le dépôt possède déjà ce chemin dans `nomsGardesDeLaPage`, dans
`packages/plugin-socle/src/composant/contract/composedComponents.ts`.
L'essai R1 reste utile, mais son résultat ne doit pas supprimer ce chargement
explicite pour lire les règles de la pièce.
Source officielle [Accessing the Document](https://developers.figma.com/docs/plugins/accessing-document/).

L'aide de publication cite `.` pour les composants et cite `.` ou `_` pour
les collections de variables. Garder `_` comme convention UCM est donc un
choix de produit. Cette aide ne prouve pas qu'un composant préfixé est
impossible à instancier localement.
Source officielle [Hide styles, components, and variables when publishing](https://help.figma.com/hc/en-us/articles/360039238193-Hide-styles-components-and-variables-when-publishing).

Spectrum décrit une anatomie, pas une bibliothèque de sous-contrats de rendu.
Sa propriété `contains` est informative. Sa spécification admet aussi une
référence à une partie d'un autre composant, avec un avertissement si elle ne
se résout pas localement. L'affirmation « aucun ne déclare une partie une fois
pour plusieurs composants » dépasse donc ce que la comparaison établit.
Cette source soutient l'intérêt d'une liste à plat, pas la résolution proposée.
Source officielle [Anatomy format](https://opensource.adobe.com/spectrum-design-data/spec/anatomy-format/).

Storybook confirme que `subcomponents` sert à documenter ensemble les API.
Cette fonction ne prouve aucune conservation des overrides Figma.
La page React de Code Connect citée dans la recherche appartient désormais
aux guides historiques. Elle annonce que les templates sont la voie maintenue.
Sources officielles [Storybook](https://storybook.js.org/docs/writing-stories/stories-for-multiple-components)
et [Code Connect React](https://developers.figma.com/docs/code-connect/react/).

## 7. Corrections à reporter dans les deux études

Dans `docs/notes/Recherches/Pièces internes/RECHERCHE-PIECES-INTERNES.md`,
conservez la distinction entre les décisions du mainteneur et les
recommandations. Précisez que la parité reste une recommandation distincte
des quatre choix numérotés en attente. Remplacez les généralisations sur les
formats tiers par les capacités effectivement observées.

Dans `docs/notes/Recherches/Pièces internes/ETUDE-FORMAT-DES-PIECES.md`,
définissez d'abord la résolution des occurrences et des effacements.
Réécrivez ensuite les critères A, B et C avec leur périmètre de complétude.
Ajoutez le budget, les cycles et les multiplicités à la liste des impacts.

La ligne « valeur posée à la main » du tableau des remplacements est trop
générale. Le format publie déjà des rotations, des distances absolues et des
pistes de grille fixes sans variable. Renvoyez aux règles propres à chaque
champ pour décider de sa publication.

Corrigez les renvois à « question 9 » quand ils désignent Q1, Q5 ou Q6 du §9.
Corrigez le nom `resoudreLaVue`. Précisez aussi la frontière entre analyse et
publication. `packages/plugin-socle/src/composant/contract/publication.ts`
appelle `extractVariantSampleParEtapes`, qui lit encore les nœuds Figma.
La phrase « sans relire Figma » ne décrit donc pas la publication actuelle.

## 8. Vérifications de cette critique

Les reproductions ont importé directement `elideNeutrals`, `bornerLesVariants`
et le module `packages/kit/src/lecteurs/variant-views.mjs` avec Node et `tsx`.
Elles ont confirmé l'effacement des remplacements vides, l'exception de
budget du variant de référence et l'absence d'export `resoudreLaVue`.

Les 63 tests ciblés passent avec cette commande.

```sh
node --import tsx --test packages/plugin-exporter/tests/elideNeutrals.test.ts packages/plugin-exporter/tests/budgetEtAnnulation.test.ts packages/kit/tests/composition.test.ts packages/adapter-typescript/tests/parite.test.mjs
```

Les trois contrôles de liens et de registre passent avec cette commande.

```sh
node --import tsx --test tests/docLinks.test.ts tests/registreDesDocuments.test.ts
```

Ces tests vérifient les comportements actuels utilisés par l'analyse.
Ils ne couvrent pas les futurs renvois de pièces de la 15.0.

La relecture ne certifie pas une implémentation 15.0 absente du dépôt.
Les règles de résolution C1 à C6 et la cardinalité C9 doivent être fixées avant
le plan. Les performances restent à mesurer sur le moteur modifié.
L'essai Figma reste à exécuter par le mainteneur selon la frontière de recette
du dépôt.
