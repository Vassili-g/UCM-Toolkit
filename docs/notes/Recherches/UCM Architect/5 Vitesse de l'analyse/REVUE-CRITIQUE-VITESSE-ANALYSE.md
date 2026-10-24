# Revue critique de la recherche sur la vitesse d'analyse

Le diagnostic justifie de mesurer Architect et de rendre sa progression
visible. Il ne permet pas encore de promettre une accélération drastique ni
la disparition du gel. Plusieurs leviers proposés peuvent changer les
constats, même avec un composant inchangé.

**Avis : commencer par la mesure et les cessions à l'horloge. Corriger la
conception du moteur réduit et des mémoires avant de les implémenter.**

Cette revue porte sur [RECHERCHE-VITESSE-ANALYSE.md](./RECHERCHE-VITESSE-ANALYSE.md),
confronté aux sources et aux tests du dépôt. Le
[plan d'implémentation voisin](./PLAN-IMPLEMENTATION.md) et la
[maquette](./MAQUETTE-PROGRESSION.html) sont pris en compte lorsqu'ils précisent
une proposition. Aucune mesure d'Architect dans Figma n'a été faite pour cette
revue ; les gains restent à établir par le mainteneur.

## Points à corriger avant les lots concernés

### 1. Priorité haute : V6 peut ne céder aucune fois pendant le relevé

**Passages : §2, V6 ; lot L3.**

Dans [lireLeReleve](../../../../../packages/plugin-architect/src/releveDuComposant.ts),
`layers` est recréé pour chaque variant. La pause intervient lorsque
`layers.length` atteint un multiple de 400. Avec 90 variants de 12 calques,
ce point de pause n'est donc jamais atteint. La phrase « à chaque lot de
400 calques » masque ce cas, précisément proche du composant étudié.

Remplacer ce compteur par `respirerSiBesoin` ne suffit pas. Cette fonction
ne fait rien hors d'une portée ouverte dans
[porteeDAnalyse.ts](../../../../../packages/plugin-socle/src/composant/contract/porteeDAnalyse.ts).
Or [analyserLeComposant](../../../../../packages/plugin-socle/src/composant/contract/exportComponent.ts)
ouvre cette portée seulement autour du moteur. Le relevé court avant ; les
contrôles courent après dans l'ordre actuel. Envelopper toute l'analyse dans
une seconde portée poserait aussi problème : les portées imbriquées
désactivent les mémoires et les respirations tant qu'elles se chevauchent.

Enfin, une pause entre deux contrôles ne coupe pas un contrôle long. Le
`findAll` du sujet et `parcourir` dans le relevé restent synchrones.

**Correction proposée.** Donner au relevé un budget de temps qui traverse
les variants, avec une horloge et une pause injectables. Définir un seul
propriétaire de la portée du moteur. Découper les boucles internes des
contrôles qui dépassent le budget mesuré. Le générateur de
[nomenclature/tranches.ts](../../../../../packages/plugin-architect/src/nomenclature/tranches.ts)
fournit déjà un exemple local de cette approche.

**Preuve attendue.** Une fixture de nombreux petits variants doit céder la
main avant d'avoir fini. Une horloge simulée doit aussi déclencher une
annulation au milieu d'un contrôle. Mesurer séparément les appels Figma
indivisibles : un seuil de 200 ms vérifié entre deux appels ne garantit pas
un blocage maximal de 200 ms. La documentation Figma recommande des tranches
avec une cession effective au fil principal, sans garantir une durée de
blocage à partir du seul seuil choisi.
[Source : Frozen Plugins](https://developers.figma.com/docs/plugins/frozen-plugins/).

### 2. Priorité haute : V7 ne suit pas toutes les dépendances du moteur

**Passages : V7 et Q3 ; lot L7.**

Le moteur lit davantage que les descendants du jeu : variables et
collections locales, styles de texte, règles d'usage sur la page et
composants imbriqués. Pourtant,
[surChangementDuDocument](../../../../../packages/plugin-architect/src/sandbox/analyse.ts)
ne périme l'analyse que si l'identifiant reçu appartient à la liste du
sujet. [code.ts](../../../../../packages/plugin-architect/src/code.ts) suit
les changements de nœuds sur les pages surveillées ; il ne constitue pas
un suivi de toutes ces dépendances.

Cas concret : modifier une règle d'usage placée à côté du jeu, puis relancer
l'analyse. Le jeu n'a pas changé. Le résultat mémorisé du moteur peut garder
l'ancien diagnostic C44. L7 prévoit même de mémoriser les règles, ce qui
étend le risque aux constats C43 et C45. Une variable renommée peut de même
changer les chemins ou les diagnostics du moteur sans modifier les calques.

La décision Q3 demande de conserver la mémoire après un changement de
library. Ce choix peut se défendre pour le seul résultat du moteur si le
catalogue et les contrôles sont relus. Il ne prouve pas que les variables
effectivement lues par le moteur sont restées identiques. Distinguer le
choix de la library de la modification de son contenu ou des variables
disponibles dans le fichier.

**Correction proposée.** Définir les dépendances de chaque résultat gardé,
la durée de sa conservation et le geste qui force une nouvelle lecture.
Actualiser doit pouvoir contourner la mémoire. Une dépendance dont la
révision n'est pas observable impose une relecture ou une limite explicite
de fraîcheur. Ne pas mémoriser une analyse annulée, arrêtée ou périmée
pendant son calcul. Borner aussi le nombre de jeux retenus.

**Preuve attendue.** Rejouer après modification d'une règle hors du jeu,
d'une variable, d'un style et d'un maître imbriqué. Vérifier aussi une
écriture du plugin, Ctrl+Z et un changement pendant le calcul. La seconde
analyse sans modification doit garder les mêmes sorties ; elle ne devient
pas nécessairement immédiate, puisque V7 conserve encore le relevé, le
catalogue et les contrôles à exécuter.

### 3. Priorité haute : V2 couperait des diagnostics après `structure`

**Passage : V2 ; lot L5.**

Dans [exportComponent.ts](../../../../../packages/plugin-socle/src/composant/contract/exportComponent.ts),
des diagnostics sont émis après `extractStructure` : fusion des règles
d'icône, icône sans emplacement unique, absence de consigne d'usage,
composant imbriqué sans emplacement. Plus loin, après la compaction,
`pousserLesImbriques` ajoute encore les points bloquants. La construction de
`allWarnings`, `parties` et `localisations` vient ensuite.

Un retour « après structure » supprimerait donc des constats attendus par
Architect. La suppression des échantillons ne justifie pas de supprimer
cette finalisation des diagnostics.

Le besoin des règles est en revanche plus réduit que ne le laisse penser
le passage sur `content`. [lireLesRegles](../../../../../packages/plugin-architect/src/regles.ts)
parse actuellement le JSON, mais
[ContratLu](../../../../../packages/plugin-socle/src/composant/template/modele.ts)
ne demande que `props` et `stateModel`. Le lecteur utilise aussi
`imbriques.auParent`, transmis séparément.

**Correction proposée.** Définir un résultat interne d'analyse contenant les
diagnostics finalisés, la surface des propriétés et les informations
d'imbrication nécessaires. Faire de la production du contrat sérialisé une
suite facultative de ce résultat. Éviter de fabriquer un faux
`ComponentExport` avec un `content` vide ou incomplet.

**Preuve attendue.** Comparer tous les constats, leurs identifiants, leurs
localisations, les corrections et le modèle des règles. Ajouter les cas
où un diagnostic apparaît après `structure`, dont un composant imbriqué
bloquant. Comparer seulement les codes C30 à C45 ne suffit pas à établir
cette égalité.

### 4. Priorité haute : la racine seule n'est pas une clé suffisante pour V3

**Passage : V3 ; lot L6.**

[getAllNodes](../../../../../packages/plugin-socle/src/composant/contract/exportableNodes.ts)
dépend de `root` et de `composed`. Avec une racine présente dans `composed`,
il rend seulement la racine ; sans cette entrée, il peut rendre ses
descendants. [textSlots](../../../../../packages/plugin-socle/src/composant/contract/extractVariantTypography.ts)
dépend aussi de `iconNames`, qui intervient dans les chemins publiés.
Une mémoire du résultat final indexée uniquement par racine peut donc
réutiliser un parcours filtré pour un autre contexte.

Le plan prévoit de conserver l'avertissement des calques masqués. C'est
nécessaire, mais les registres de localisation et les parties du diagnostic
doivent également être conservés, dans chaque destination concernée.

**Correction proposée.** Mémoriser le parcours brut par racine puis appliquer
les filtres, ou inclure le contexte de filtrage dans la clé. Une identité
de `Map` ou de `Set` ne suffit que si son contenu reste immuable pendant
l'analyse. Définir séparément la mémoire des chemins de texte.

**Preuve attendue.** Appeler la même racine avec puis sans frontière composée,
et avec deux ensembles de noms d'icône. Comparer les sorties et les
diagnostics localisés aux appels sans mémoire. Étendre le banc de parité
existant à ces variations de contexte.

### 5. Priorité moyenne : V9 réduit aussi la surveillance des changements

**Passage : V9.**

Le `findAll` du sujet sert à construire la liste des nœuds surveillés.
Écarter ses enfants masqués peut accélérer ce parcours, mais retire aussi
leurs identifiants de cette liste. Le code de péremption ne remonte pas les
ancêtres d'un identifiant reçu. Il faudrait prouver que tout changement
pertinent d'un enfant exclu produit aussi un événement sur un nœud retenu.

Le drapeau est global : il affecte `children`, les recherches et les accès
par identifiant ; l'accès à un objet déjà obtenu peut même lever. Il ne
s'agit donc pas d'une option locale de `findAll`.
[Source : skipInvisibleInstanceChildren](https://developers.figma.com/docs/plugins/api/properties/figma-skipinvisibleinstancechildren/).

**Correction proposée.** Garder V9 hors des premiers lots. Avant de l'activer,
prouver la couverture de péremption et restaurer la valeur précédente dans
un `finally`, sans attente pendant son activation temporaire. Éprouver le
cas d'un enfant masqué dont la visibilité ou une liaison change.

## Mesure, progression et ordre des travaux

### 6. Les gains chiffrés ne permettent pas encore de classer les leviers

**Passages : §1, §3.1, tableau de §4.**

Le nombre de variants ne décrit ni le nombre de calques, ni les instances,
ni la quantité de texte. L'extrapolation de 140 à 90 variants ne constitue
pas une référence de durée pour le Button. Les poids de
`ETAPES_DE_L_ANALYSE` servent à estimer une progression ; ils ne sont pas
une mesure de la part économisable par V2 sur ce composant.

Le facteur QuickJS/V8 de 10 à 50 ne vient pas d'une mesure du kit. Le billet
officiel établit le passage à QuickJS et indique une différence de
performance, sans donner ce multiplicateur pour Architect.
[Source : An update on plugin security](https://www.figma.com/blog/an-update-on-plugin-security/).
Les 0,1 ms par aller-retour du second billet décrivent la première
architecture en iframe, abandonnée. Ils ne quantifient pas les appels
actuels à `getVariableByIdAsync`.
[Source : How we built the Figma plugin system](https://www.figma.com/blog/how-we-built-the-figma-plugin-system/).

**Correction proposée.** Séparer le délai avant les premiers constats, la
durée totale et la durée des blocages. V1 agit surtout sur le premier ; V6
sur le troisième ; V2 et V3 peuvent réduire le deuxième. Classer les lots
d'après leur coût mesuré et leur risque, sans additionner les économies de
passes qui se recouvrent.

V8 doit comparer le calcul actuel au trajet complet : préparation des
données, transfert vers l'iframe, transfert au worker, calcul, retour et
intégration. Le seuil d'une seconde ne suffit pas à choisir une architecture.
Le relevé part à l'aller ; les constats reviennent au retour. Mesurer ces
deux charges distinctes, ainsi que la taille du catalogue.

### 7. V5 doit mesurer la livraison à l'interface et les vrais points de cession

**Passages : V5, §5 et §6 ; lots L0 à L3.**

Ouvrir [mesure.ts](../../../../../packages/plugin-socle/src/composant/contract/mesure.ts)
ne renseigne pas automatiquement `plusLongSilenceMs`. Dans l'exporteur,
c'est [code.ts](../../../../../packages/plugin-exporter/src/code.ts), via
`noterUnContact` et `rendreLaMain`, qui alimente ce compteur. Architect doit
instrumenter ses propres cessions dès la mesure initiale, pas seulement
après V6, sinon la comparaison avant/après manque.

Une attente de library peut laisser Figma répondre sans produire de
progression. Un calcul synchrone peut au contraire bloquer Figma. Un même
intervalle entre messages ne distingue pas les deux. Chronométrer l'appel
à `postMessage` ne mesure pas non plus sa réception ni le rendu du panneau.

La règle « un message par point de pourcentage » peut retenir une nouvelle
phase dont le pourcentage arrondi n'a pas changé. L'exporteur compare déjà
le pourcentage, le compte et le temps restant. Architect doit aussi inclure
la phase, et annoncer tout changement d'état terminal.

**Correction proposée.** Mesurer le clic jusqu'au premier affichage, aux
premiers constats et au résultat final. Ajouter des acquittements de
réception et de rendu, corrélés par identité, sans soustraire des horloges
de contextes différents sans calibration. Garder une mesure des tranches
synchrones distincte du silence visible. Réserver 100 % à la fin effective ;
ne pas afficher un temps restant quand les mesures ne permettent pas de
l'estimer. Le calcul actuel depuis `wrapper` ne couvre pas le démarrage.

### 8. Le résultat provisoire exige encore des cas de fin explicites

**Passages : V1 et §5 ; lot L4.**

L4 ferme déjà les corrections, les questions et Ignorer pendant le résultat
provisoire. La maquette interdit aussi les sections « tenues » avant la
fin. Ces précisions répondent au principal risque annoncé par V1.

Il reste à définir le sort des constats provisoires lors d'une annulation,
d'un arrêt du moteur, d'une lecture incomplète et d'une péremption avant
le résultat final. Dans le code actuel,
[rendre](../../../../../packages/plugin-architect/src/sandbox/analyse.ts)
retient les corrections en même temps qu'il envoie le résultat. Réutiliser
cette fonction pour un état provisoire demande donc une règle explicite
côté sandbox, en plus des boutons désactivés.

**Correction proposée.** Décrire les transitions du protocole et les données
conservées pour chacune. Distinguer un résultat provisoire d'une analyse
terminée `partielle`. La réception finale doit préserver `perimee`, comme
le fait aujourd'hui [ui/composant/analyse.ts](../../../../../packages/plugin-architect/src/ui/composant/analyse.ts).
Lire les ignorés avant le premier affichage pour éviter de montrer
brièvement les points déjà écartés.

**Preuve attendue.** Tester chaque fin après publication du provisoire,
une réponse tardive d'une ancienne génération et l'interdiction d'écriture
pendant le calcul. Maintenir les identifiants des constats entre les deux
messages pour conserver le défilement et les sections ouvertes.

### 9. V4 mélange une optimisation locale et une refonte du moteur

**Passage : V4.**

Mutualiser les lectures de `fills`, `strokes` et des segments de texte dans
le relevé est un changement limité. Faire consommer ce relevé au moteur
demande un modèle partagé qui porte les frontières, les modes et les plages
de texte nécessaires à l'export. Le second travail n'est pas une
précondition du premier.

**Correction proposée.** Séparer ces deux travaux. Mesurer d'abord les
lectures répétées et leur part dans le relevé. Si elles coûtent assez, les
mutualiser sans changer son modèle public, puis comparer profondément les
relevés, notamment les plages et `lecture.manquees`. Reporter le modèle
commun jusqu'à une trace qui justifie son coût. Cette mutualisation ne
réalise pas encore une analyse par famille : aucun calcul des différences
entre variants n'est décrit.

## Conditions de recette proposées

Le protocole à froid et à chaud est utile, mais fermer le plugin ne garantit
pas des caches Figma froids. Décrire exactement ce qui est relancé : plugin,
fichier ou application. Conserver le poste, la version du client, le build,
la library et le jeu analysé avec chaque série.

| Mesure | Critère à préciser avant la comparaison |
|---|---|
| Durée complète | Objectif et gain minimal par rapport à la référence ; les seuils de 2 s et 4 s du document d'optimisation précédent restent des propositions |
| Premiers constats | Délai depuis le clic, avec le coût de rendu du panneau |
| Réactivité | Plus longue tranche synchrone et délai entre Annuler et sa prise en compte, distincts de la fréquence des messages |
| Parité | Constats ordonnés, identifiants, faits, corrections, questions, modèles de règles et lectures manquées |
| Mémoire | Cas où une réutilisation est permise, cas qui imposent une relecture, borne de conservation |

Dix exécutions servent à établir une médiane et une dispersion initiales.
Elles ne suffisent pas à stabiliser un 95e percentile : conserver les valeurs
brutes et augmenter la série si ce percentile devient un critère de recette.
Faire varier aussi la structure : nombreux petits variants, gros variant,
texte mixte, instances imbriquées, lecture incomplète et library inaccessible.

Les essais de `findAll` avec et sans le drapeau doivent comparer les nœuds
renvoyés et la couverture attendue. Une série de 90 parcours synchrones
mesurerait aussi un gel provoqué par le banc ; céder entre les essais et
alterner leur ordre. Les mesures de worker restent conditionnelles à son
intérêt dans la trace.

## Ordre recommandé

1. Préciser V5 et les critères de recette. Mesurer les phases, les cessions
   et la réception dans le panneau sur le build de référence.
2. Corriger V6 pour les petits variants et les contrôles longs. Brancher
   la progression et Annuler sur ces cessions effectives.
3. Livrer V1 avec le protocole provisoire de L4 complété par ses cas de fin.
4. Choisir V2, V3 ou la mutualisation locale de V4 selon la trace. Conserver
   les diagnostics et les contextes décrits dans les points 3 et 4.
5. Traiter V7 après la définition de ses dépendances et d'Actualiser.
   Décider V8 sur son coût total mesuré. Garder V9 conditionnel à la preuve
   de couverture des changements.

V5, V6 et la progression répondent directement au gel observé. V1 réduit
l'attente avant lecture des premiers points. L'accélération totale reste
une condition de recette à mesurer après ces lots.
