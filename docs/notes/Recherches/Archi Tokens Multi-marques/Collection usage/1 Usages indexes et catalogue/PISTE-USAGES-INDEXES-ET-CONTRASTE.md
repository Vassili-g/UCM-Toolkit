# Piste de recherche : usages indexés et garanties de contraste

Cette note ouvre une question de conception. Elle ne modifie pas les décisions
de [l’architecture multi-marques](../../ARCHITECTURE-FINALE-MULTIMARQUES.md) et ne
décrit pas un comportement implémenté. Un agent chargé de poursuivre l’étude
doit vérifier les hypothèses dans le code et les documents cités avant de
proposer une évolution.

## Demande originale

Le message ci-dessous est reproduit sans modification.

```text
document de recherche et réflexion à créer dans le dossier d'architecture des tokens multi marque :

dans la collection usage on a primary/solid et primary/surface et ces sous collections ont des dénomination d'usage type default, hover, active, active-hover

c'est bien mais un peu restrictif, ça donne l'impression que ça ne peut être utilisé que pour un usage précis.

mais est ce qu'on pourrait pas avoir un peu plus de liberté créative ?

On pourrait avoir ça :

primary/solid
on-1
on-2
on-3
on-4

primary/surface
1
2
3
4

la nomenclature n'est pas terrible mais c'est pour donner un exemple, en gros on donne des valeurs d'usage, genre on sait qu'un solid s'utilise sur une surface et plus précisément, solid/on-1 s'utilise avec surface/1 et on sait que le ratio de contraste est respecté. Sauf si j'ai mal compris un truc ?

ça permettrait d'avoir plus de flexibilité dans les design tout en utilisant correctement les nuances en respectant les garanties de contraste.

Piste à réfléchir profondemment pour voir toutes les implications, est ce que ça peut être plus généralisé aux autres catégories d'usage, est ce que ça peut être amélioré ? Il faudrait aussi voir comment répertorier à un endroit précis toutes ces règles d'usage pour que ça soit simple de savoir quel est l'usage de chaque cran d'une palette etc. Est ce que c'est un plugin qui génère ça ? comment on fait ?


tâche pour toi :
- créé un document qui note ces réflexion, pour un autre agent IA plus puissant
- insère aussi mon message original dans ce document, sans modification
- donne moi ton avis sur la question, ici même
- donne moi ton avis sur la question, ici même
```

## Question à étudier

Les rangs nommés `default`, `hover`, `active` et `active-hover` décrivent des
états de composant. La proposition remplace ces noms par des indices et semble
vouloir exprimer une autre relation : quelles couleurs peuvent être combinées
ensemble, et sous quelles conditions de contraste.

L’étude doit déterminer si l’architecture peut séparer :

- l’emploi d’une couleur, par exemple fond plein, texte sur fond plein,
  surface, texte, contour ou anneau ;
- l’état du composant, par exemple repos, survol, appui, sélection ou focus ;
- les paires de couleurs autorisées, leur contexte et leur seuil ;
- les crans de la palette vers lesquels chaque emploi renvoie.

La question pratique est la suivante : peut-on laisser un composant choisir
parmi plusieurs associations de couleurs tout en sachant précisément quelles
associations ont été vérifiées, plutôt que de faire porter ce choix par un
vocabulaire limité aux états actuels ?

## État vérifié dans le dépôt

L’architecture proposée expose déjà une collection `usage`. Dans
[ARCHITECTURE-FINALE-MULTIMARQUES.md](../../ARCHITECTURE-FINALE-MULTIMARQUES.md),
`usage.primary.solid.default` vise `theme.primary.700`, et
`usage.primary.surface.default` vise `theme.primary.100`. Les rangs de ces
emplois font avancer les crans. `solid` et `surface` n’ont donc pas la même
rampe ni le même point de départ.

Le kit porte une table commune dans
[`packages/kit/src/emplois/`](../../../../../../packages/kit/src/emplois/). Le module
[`emplois.ts`](../../../../../../packages/kit/src/emplois/emplois.ts) attribue un
cran par emploi. [`usages.ts`](../../../../../../packages/kit/src/emplois/usages.ts)
construit les chemins de variables, leurs cibles, et les portées Figma.
[`paires.ts`](../../../../../../packages/kit/src/emplois/paires.ts) énumère les
paires de couleurs, leurs décalages par rang et leur seuil WCAG.

La table actuelle distingue notamment :

| Paire évaluée | Seuil | Ce qu’elle vérifie |
|---|---:|---|
| `on-solid` sur `solid` | 4,5:1 | Texte sur un fond plein |
| `text` sur le fond de page ou sur `surface` | 4,5:1 | Texte courant et surface |
| `border-control` sur le fond de page ou sur `surface` | 3:1 | Contour de contrôle et surface |
| `focus` sur le fond de page ou sur `surface` | 3:1 | Anneau de focus |

Le dépôt ne déduit pas une garantie du nom d’un token. UCM Palettes évalue les
paires déclarées dans chaque thème et chaque intensité applicable. `ucm check`
compare les emplois d’un contrat à la table publiée dans `usage`, puis relève
les supports, les paires, les rangs d’état et les couleurs hors table. Les
contrôles du kit et du CLI décrivent ces comportements dans
[`packages/kit/tests/emplois.test.ts`](../../../../../../packages/kit/tests/emplois.test.ts)
et
[`packages/kit/tests/diagnostic-emplois.test.mjs`](../../../../../../packages/kit/tests/diagnostic-emplois.test.mjs).

La règle « `solid/on-1` s’utilise avec `surface/1` » ne fait pas partie des
paires actuelles. Le dépôt vérifie `on-solid` sur `solid`, mais ne garantit pas
une paire `solid`/`surface`. Il vérifie `text` sur `surface` et
`border-control` sur `surface`. Toute nouvelle association doit donc être
ajoutée explicitement à la table des paires et mesurée ; des indices identiques
ne suffisent pas.

Il faut aussi clarifier le sens de `on-1`. Dans le vocabulaire existant,
`on-solid` désigne le texte peint sur un fond `solid`. La proposition pourrait
désigner ce premier plan, ou un niveau de fond plein qui s’associe à une
surface. Ces deux lectures exigent des tables différentes.

Enfin, les documents d’architecture décrivent une cible qui prévoit des usages
générés, tandis que le suivi des recherches indique que le plugin Palettes
actuel écrit les palettes primitives, sans générer les collections `brand`,
`theme` ou `usage`. Il faudra vérifier qui produit aujourd’hui les variables
de chaque collection avant de confier cette génération à un plugin.
[`docs/notes/Recherches/README.md`](../../../README.md) décrit la frontière de
déploiement connue.

## Hypothèses à éprouver

### Les indices ne sont pas, à eux seuls, une garantie

Un suffixe numérique peut identifier une association définie ailleurs.
Il ne fixe aucun rapport de contraste par sa valeur. Pour rendre
`solid/on-1` compatible avec `surface/1`, il faut au minimum :

1. définir si les deux chemins nomment des fonds, un fond et son premier plan,
   ou deux autres catégories de peinture ;
2. déclarer les associations admises entre ces chemins ;
3. associer à chaque association son seuil, par exemple le seuil texte ou
   non-texte déjà utilisé par le kit ;
4. mesurer les couleurs réellement résolues dans chaque mode et marque ;
5. relever les contextes non vérifiés au lieu de les présenter comme garantis.

Si chaque indice représente une paire compatible, le catalogue doit indiquer
cette relation. Si plusieurs valeurs de `solid` peuvent accompagner plusieurs
`surface`, la table doit énumérer les combinaisons admises ou les règles qui les
autorisent. Il faut aussi déterminer si l’indice signifie un niveau perceptif,
un seuil de contraste, un rang d’état ou seulement un identifiant stable.

### Contraste et liberté de composition doivent rester distincts

Une paire lisible en isolation peut échouer dans un autre contexte : autre
thème, autre marque, autre intensité, autre fond sous-jacent, transparence ou
contenu graphique. Le contraste d’un texte ne couvre pas nécessairement un
trait décoratif ou un indicateur non textuel. Les seuils dépendent de la nature
de ce qui est peint.

Les règles actuelles évaluent les couleurs de palette dans les thèmes et les
intensités concernés. Une nouvelle table doit dire si elle promet :

- la paire exacte entre deux variables nommées ;
- chaque combinaison d’un ensemble de couleurs ;
- la conformité d’une paire après placement dans un contexte précis ;
- ou une simple recommandation, vérifiée plus tard dans le contrat du
  composant.

Ces garanties ne sont pas interchangeables. Une paire de tokens peut être
validée avant usage ; le résultat ne prouve pas qu’un composant l’emploie au bon
état ou sur le fond prévu. Le contrôle de contrat doit continuer à vérifier
l’usage réel.

### Généralisation aux autres emplois

L’étude doit examiner les familles une par une, sans supposer qu’elles
partagent toutes le modèle d’une paire de fonds :

| Famille | Relation à formaliser |
|---|---|
| Texte sur fond | Le texte et le fond exacts, le seuil texte, le thème et le rang |
| Texte sur fond plein | Le couple `on-solid` et `solid`, y compris chaque état |
| Contour de contrôle | Le contour contre son fond, avec le seuil non-texte |
| Anneau de focus | L’anneau contre le fond qu’il borde, et les règles de séparation du contrôle |
| Icône | Le lien avec `text` ou un emploi dédié, selon la fonction et le support |
| Contour décoratif | La distinction entre une couleur décorative et un indicateur requis |
| État désactivé | L’absence de seuil WCAG existant et le statut de la couleur comme exemption |
| Surface de carte et élévation | Le rapport avec le fond sous-jacent et le niveau d’élévation |

Le catalogue doit distinguer les emplois soumis à un seuil de ceux qui n’en
ont pas. Une couleur sans promesse mesurée ne doit pas recevoir le même signe
de conformité qu’une association vérifiée.

### État d’interaction et association de contraste

Les rangs actuels relient un état de composant à des couleurs précises. Une
indexation pourrait offrir plus de variantes visuelles, mais le contrat doit
encore pouvoir dire quelle valeur correspond au repos, au survol, à l’appui, à
la sélection et au focus.

L’étude doit comparer au moins ces modèles :

1. garder les états nommés et permettre plusieurs associations au sein d’un
   état ;
2. indexer les associations, puis déclarer dans le contrat le rang choisi
   pour chaque état ;
3. conserver les associations comme primitives et laisser chaque composant
   choisir les transitions d’état, sous vérification de ses variantes.

Les nombres ne doivent pas effacer l’information dont `ucm check` a besoin pour
comparer l’état d’un variant à son rang attendu. La sémantique pourrait rester
dans les métadonnées, même si les noms des variables changent.

## Où tenir la règle et qui devrait la produire

Le dépôt dispose déjà d’une source commune pour les emplois, les paires, les
rangs et leurs supports : `@ucm-kit/core/emplois`. Les chemins DTCG et les
diagnostics sont dérivés de ces données. Une nouvelle table devrait prolonger
cette source si ses règles doivent être partagées par UCM Palettes et `ucm
check`. Il faut éviter de tenir à la main la même relation dans le plugin, le
CLI et une page de documentation.

Une source canonique devrait décrire, au minimum :

- l’identifiant stable et le nom lisible d’un emploi ;
- ce que la variable peint et ses portées Figma ;
- le chemin DTCG attendu et la règle de résolution vers la palette ;
- les associations autorisées et leur seuil ;
- les modes, marques, intensités et profils concernés ;
- les états de composant qui peuvent choisir cette association ;
- le verdict de calcul et les raisons qui rendent un cas non jugeable.

Une documentation lisible par les designers et développeurs peut ensuite être
générée depuis cette source. Elle devrait permettre de partir d’un cran de
palette et de voir les emplois qui le ciblent, leurs associations, leurs
seuils, les contextes où ils sont valides et ceux où aucune promesse n’existe.
`emploisDuCran()` fournit déjà une partie de l’inversion emploi vers cran ;
elle n’explique pas, à elle seule, les paires garanties.

Le choix du producteur dépend de la responsabilité de la table :

| Option | À retenir si… | Risque à étudier |
|---|---|---|
| Source versionnée dans le kit | La règle est stable et partagée entre outils | Une modification de vocabulaire peut exiger une évolution publiée du kit |
| Plugin qui calcule les paires depuis les palettes | Les couleurs et la table sont éditées dans Figma | Le résultat risque de masquer la provenance de la règle ou de dépendre d’une saisie non validée |
| Générateur qui publie un catalogue dérivé | Il faut faciliter la lecture sans ajouter de seconde autorité | Les artefacts générés doivent rester déterministes et contrôlés |
| Configuration propre à chaque système de design | Les associations sont réellement spécifiques à une marque ou un produit | Le CLI et les contrats doivent savoir quel catalogue versionné ils évaluent |

Un plugin peut aider à choisir ou visualiser des associations. Il ne devrait
pas être l’unique endroit où leur définition existe si le CLI doit vérifier les
mêmes garanties. Avant de choisir l’outil, il faut établir si les règles sont
universelles au kit, propres à une architecture de tokens, ou éditables par
chaque organisation.

## Implications à relever

L’agent qui poursuit l’étude devrait vérifier les conséquences pour :

- le type `Emploi`, `TABLE_DES_EMPLOIS`, `PAIRES`, les rangs et
  `usagesDeLaPalette()` dans le kit ;
- la génération des alias DTCG, l’identité stable des variables et les portées
  Figma ;
- les calculs UCM Palettes sur les palettes de marque, les deux thèmes et les
  intensités `soft` et `vivid` quand elles s’appliquent ;
- le diagnostic `ucm check`, notamment la vérification du support, de la paire,
  de l’état et des couleurs hors table ;
- la lecture par cran, pour publier chaque usage, ses partenaires et la portée
  de sa garantie ;
- les cas hors gamut sRGB, translucides, d’alias manquant ou de cible absente ;
- la compatibilité des noms et chemins existants, la migration des tokens et
  les contrats consommateurs ;
- l’expérience dans Figma : recherche de variables, noms accessibles,
  collections, modes, portées et coût de maintenance ;
- les usages partagés entre plusieurs composants et les exceptions propres à
  un composant.

Une liberté de choisir un emploi ne garantit pas une liberté de combiner toutes
les valeurs. Le contrôle doit permettre les choix déclarés et signaler les
associations non couvertes. Il ne doit pas convertir une absence de règle en
validation implicite.

## Questions pour la suite

1. Dans `solid/on-1`, que désigne `on-1` : un premier plan sur `solid`, une
   variante de `solid`, ou un identifiant de paire ?
2. Les nombres identifient-ils une famille de couleurs compatible, une
   échelle ordonnée, un niveau de contraste ou seulement une entrée de
   catalogue ?
3. La règle attendue est-elle une correspondance un-à-un entre `solid` et
   `surface`, ou plusieurs associations doivent-elles être sûres ?
4. Quelle preuve est attendue : seuil calculé pour deux tokens précis, garantie
   sur toutes les teintes d’une rampe, ou contrôle de chaque composant après
   son choix ?
5. Quelles paires manquent au modèle actuel, et quelles paires ne doivent pas
   être garanties ?
6. Les rangs nommés doivent-ils disparaître, ou rester une couche
   indépendante du choix des associations ?
7. Les mêmes règles s’appliquent-elles aux couleurs de marque et de statut,
   ainsi qu’aux intensités, thèmes et exceptions ?
8. Quelle source fait autorité, qui peut la modifier et quel outil génère les
   variables ou les pages de référence ?
9. Que doit voir le développeur en partant d’un cran précis, et que doit voir
   le designer au moment de choisir une variable dans Figma ?
10. Quelle stratégie de versionnage et de migration permet aux dépôts
    consommateurs de relire leurs contrats sans prétendre que les anciennes
    associations ont été vérifiées ?

## Critères d’une proposition exploitable

Une proposition ultérieure devrait fournir un modèle de données précis et un
petit exemple de palette, puis démontrer que :

- chaque paire porte son seuil et ses contextes de validité ;
- le calcul mesure les valeurs résolues pour chaque marque et chaque thème
  déclaré ;
- un numéro ou un nom n’est jamais traité comme une preuve de contraste ;
- un usage absent, une paire inconnue et une paire manquée donnent des états
  distincts ;
- UCM Palettes et `ucm check` lisent la même règle ;
- le catalogue répond à « quels usages et partenaires concernent ce cran ? » ;
- l’état d’un composant reste vérifiable même si les noms de rang changent ;
- l’accès à une nuance hors catalogue reste explicite et ne reçoit pas de
  garantie qu’aucun contrôle n’a calculée.

Une maquette ou une table d’exemple ne suffit pas à trancher. La proposition
doit être éprouvée sur les thèmes, les marques, les profils et les seuils
réellement visés par l’architecture.
