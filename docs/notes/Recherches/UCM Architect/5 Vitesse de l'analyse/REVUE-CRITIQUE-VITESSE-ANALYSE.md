# Revue critique de la recherche sur la vitesse d'analyse

Le diagnostic justifie de mesurer Architect et de rendre sa progression
visible. Il ne permet pas encore de promettre une accélération drastique ni
la disparition du gel. Plusieurs leviers proposés peuvent changer les
constats, même avec un composant inchangé.

**Avis : commencer par la mesure et les cessions à l'horloge. Corriger la
conception du moteur réduit et des mémoires avant de les implémenter.**

Cette revue porte sur [RECHERCHE-VITESSE-ANALYSE.md](./RECHERCHE-VITESSE-ANALYSE.md),
confronté aux sources et aux tests du dépôt. Le
plan d'implémentation retiré et la
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

## Solution globale pour la première analyse à froid

### Objectif et périmètre

Minimiser le temps entre Analyser et l'affichage du résultat final, avec les
mêmes constats et les mêmes corrections. Mesurer aussi le temps d'ouverture
du plugin : déplacer un calcul avant le clic ne constitue pas un gain à
froid si ce calcul retarde l'ouverture.

Une analyse à froid commence sans résultat antérieur du composant, sans
catalogue déjà chargé par le plugin et sans worker déjà démarré. Le fichier
Figma est ouvert. Les caches internes de Figma ne sont pas maîtrisables ;
les essais avec réouverture de l'application forment une série distincte.

La mémoire créée pendant cette première analyse reste utile : un fait lu
ou calculé peut servir plusieurs contrôles. La réutilisation entre analyses
prolonge cette mémoire sans réduire le travail du premier appel. Son coût
d'enregistrement doit donc entrer dans la mesure à froid. L'interprétation
de Q3 est précisée dans la solution pour les analyses secondaires.

L'optimum absolu n'est pas établi sans trace du composant réel. L'architecture
ci-dessous vise à supprimer les répétitions connues et laisse mesurables les
choix dont le bénéfice dépend de Figma. Les lectures indispensables et le
volume du résultat imposent un coût minimal, même si le calcul pur devient
très rapide.

### Architecture proposée

| Partie | Responsabilité | Emplacement proposé |
|---|---|---|
| Acquisition | Lire Figma, ses dépendances et les refus de lecture ; produire des données ordinaires | Socle, appelé par le sandbox d'Architect et celui de l'exporteur |
| Représentation commune | Décrire les faits acquis, leurs identités et leur couverture ; indexer les relations | Modules internes du socle, sans référence à des objets Figma |
| Analyse pure | Calculer les faits dérivés, les diagnostics du moteur et la surface des règles | Modules partagés du socle ; contrôles métier existants dans le kit |
| Réutilisation | Retenir les faits et requêtes validés, leurs dépendances et leurs révisions ; borner leur durée de vie | Mécanisme interne du socle, alimenté par le suivi Figma et la configuration d'Architect |
| Exécution | Exécuter les calculs prêts dans un worker ; repli coopératif sur les mêmes fonctions | Worker d'Architect, relié au sandbox par l'iframe |
| Restitution | Rattacher les constats aux calques, retenir les corrections, afficher et appliquer les règles de péremption | Sandbox et interface d'Architect |
| Publication | Assembler le contrat, ses échantillons, sa compaction et sa sérialisation | Chemin de l'exporteur utilisant les mêmes faits et diagnostics |

Le worker est l'exécuteur visé pour les calculs lourds. Son activation doit
gagner sur une première exécution, démarrage et transferts compris. La même
analyse pure reste exécutable sans worker pour les petits sujets et comme
référence de parité. Un second moteur de règles serait une divergence à
maintenir : les deux exécuteurs appellent les mêmes fonctions.

### A. Acquérir chaque fait utile une fois

Construire un inventaire commun du sujet au lieu d'enchaîner un inventaire
de péremption, le parcours du relevé et les parcours du moteur. La cible
est une lecture par propriété demandée et par nœud pendant une analyse,
avec des compléments seulement lorsque de nouvelles dépendances sont
découvertes.

L'acquisition sépare la topologie des valeurs. La topologie porte les
parents, l'ordre des enfants, les types, les identifiants et les frontières.
Les valeurs sont acquises selon les besoins de l'analyse : peintures,
liaisons, modes, dimensions, texte, styles et propriétés des composants.
Les règles de filtrage travaillent ensuite sur ces données, sans relire
Figma à chaque passe.

Il faut conserver plusieurs vues de cette topologie. Le relevé s'arrête
aux instances imbriquées ; le moteur et le suivi de péremption ont d'autres
besoins. Le comptage du budget de
[budget.ts](../../../../../packages/plugin-socle/src/composant/contract/budget.ts)
n'est pas non plus identique au parcours du relevé. Partager l'acquisition
ne doit pas modifier les variants admis, les frontières ou le nombre de
calques non lus. Les descendants masqués nécessaires à un diagnostic ou à
la surveillance restent dans le périmètre.

Trois mutualisations sont nécessaires :

- une table des propriétés déjà lues par nœud, y compris les lectures
  illisibles ; chaque consommateur retrouve la cause et la localisation
  attendues ;
- une table des promesses par identifiant de variable, collection, style et
  maître d'instance ; plusieurs consommateurs attendent la même lecture ;
- un inventaire des règles par page nécessaire et un seul inventaire des
  libraries. Le moteur et `lireLesRegles` réutilisent les faits communs.

Les requêtes indépendantes partent par lots bornés. Huit appels simultanés
constituent le point de départ déjà employé par le dépôt ; la trace doit
justifier toute autre valeur. Le choix automatique de library dépend des
liaisons : ses valeurs ne sont chargées qu'une fois ce choix établi. Les
imports restent soumis aux règles actuelles du plugin.

Les variables locales sont indexées à partir de leur inventaire commun.
Ne pas supprimer l'inventaire nécessaire à la détection des collisions de
noms sous prétexte de ne charger que les variables liées. Les lectures de
valeurs et d'alias peuvent, elles, suivre leurs dépendances.

Pour le texte, demander une fois l'union des champs nécessaires à
`getStyledTextSegments`. Cette union peut produire des plages plus fines.
Chaque lecteur doit retrouver son découpage attendu par projection et
fusion des plages adjacentes équivalentes. Conserver deux appels tant que
la parité du découpage ou le traitement d'un champ illisible n'est pas
démontré.

Comparer deux façons d'acquérir la topologie sur les mêmes sujets : parcours
natif suivi d'une indexation, ou parcours explicite qui peut céder la main.
Ne pas imposer `children` comme plus rapide que `findAll`. Le choix doit
réduire le temps total tout en respectant la borne de réactivité.

### B. Produire des diagnostics sans construire un contrat complet

Décomposer le moteur selon les informations qu'un contrôle demande. Une
fonction calcule un fait et rend ses diagnostics localisés ; elle réutilise
les faits déjà calculés dans la session. Des dépendances explicites entre
fonctions suffisent au départ, sans construire un ordonnanceur général.

Le principe vient des requêtes à la demande des compilateurs. Son
application à froid réutilise les résultats pendant la demande courante.
Leur conservation entre demandes ajoute la validation décrite plus loin,
sans changer les fonctions de calcul.
[Référence : requêtes de rustc](https://rustc-dev-guide.rust-lang.org/query.html).

Avant d'extraire ces fonctions, établir la table suivante pour chaque
diagnostic du moteur : lieu d'émission, faits lus, contexte nécessaire et
consommateurs du résultat. Inclure les diagnostics traduits par défaut en
C42, ainsi que les points bloquants finalisés après `structure`. Les six
codes explicites de la table d'Architect ne bornent pas cette liste.

La sortie interne destinée à Architect contient :

- les diagnostics finalisés avec leurs parties et localisations ;
- `props`, `stateModel` et les informations d'imbrication utiles aux règles ;
- les données nécessaires aux corrections et au modèle de règles ;
- la couverture de lecture et les dépendances effectivement acquises.

Architect ne demande ni exemples ni contrat JSON. Les calculs de structure
qui prouvent un diagnostic restent exécutés. Seule la construction d'une
représentation sans consommateur dans cette analyse est supprimée. Si un
diagnostic exige encore un arbre exact, cet arbre reste calculé jusqu'à
l'extraction d'une vérification équivalente plus petite.

L'exporteur utilise ces mêmes fonctions avant de produire le contrat.
Conserver son chemin actuel comme référence durant la migration ; le
remplacer morceau par morceau après parité. La forme publiée ne change pas.

### C. Réduire le coût des contrôles dès la première exécution

Les postes ci-dessous sont observables dans le code ; leur durée dans
Figma reste à mesurer.

| Poste actuel | Transformation proposée | Condition de parité |
|---|---|---|
| [Catalogue](../../../../../packages/kit/src/controles/catalogue.ts) : recherches par `find` répétées | Index construits une fois par clé, nom et collection ; segments de noms découpés une fois | Même priorité de recherche, même ordre en cas de doublon ou de collision |
| [Typographie](../../../../../packages/kit/src/controles/typographie.ts) : recherche des autres sources pour chaque source | Tables de fréquences par groupe et champ ; retirer la contribution de la source examinée | Même `AUTRES_MINIMUM`, mêmes exclusions et distinction entre absence, `null` et valeur |
| [Accessibilité](../../../../../packages/kit/src/controles/accessibilite.ts) : produit cartésien construit avant `slice` | Itérateur des combinaisons dans l'ordre actuel, arrêté à la borne ; compte du reste sans matérialisation | Même ordre des modes effectifs, mêmes 5 000 combinaisons logiques admises et mêmes limites |
| Résolution des alias répétée pour plusieurs cibles | Mémoire par variable et contexte de modes pertinent ; partage des chaînes communes | Même traitement des cycles, de la profondeur restante et des valeurs illisibles |
| Peintures et ancêtres relus pour chaque contraste | Faits de visibilité et de fond calculés une fois par contexte nécessaire | Même composition des opacités et mêmes limites sur les peintures non prises en charge |

Dans l'accessibilité, calculer la cardinalité restante à partir des nombres
de modes. Une collection sans mode conserve le comportement actuel. Une
cardinalité dépassant les entiers représentables exactement demande un
traitement explicite ; elle ne doit jamais devenir un compte approximatif
présenté comme exact.

Le gain sur la typographie vient d'un passage par groupe au lieu de
reconstruire la liste des autres sources pour chaque élément. Il concerne
ce calcul d'unanimité, pas la complexité de l'analyse entière.

### D. Partager les calculs équivalents entre variants et modes

Une signature est définie par calcul. Elle contient les seuls faits dont
ce calcul dépend, mais tous ces faits : valeurs, liaisons, contexte de
modes, ancêtres utiles, frontières et options du contrôle. Un hash retrouve
des candidats ; une égalité exacte confirme le partage. C'est une
application du partage de valeurs structurellement égales.
[Référence : hash-consing](https://gallium.inria.fr/ml2006/accepted/5.html).

Le résultat partagé décrit un constat relatif à la structure analysée.
Chaque occurrence conserve sa correspondance vers les identifiants Figma,
les noms et les plages de texte. Un contrôle qui dépend du nom inclut ce
nom dans sa signature. Les corrections sont rattachées aux cibles réelles,
avec leurs propres valeurs à relire avant écriture.

Exemple conditionnel : 90 variants peuvent présenter six configurations
distinctes pour un contrôle. Ce contrôle calcule six résultats, puis les
rattache aux 90 occurrences. Les 90 variants restent acquis pour prouver
l'équivalence ; leur nom d'axe ne suffit pas à la supposer.

Pour un contraste, déterminer les collections qui peuvent influencer la
cible et son fond à travers leurs alias. Les combinaisons logiques qui
diffèrent seulement sur les autres collections partagent le calcul du
rapport. Les collections atteintes par une branche d'alias possible font
partie de cette dépendance, même si le mode courant ne les utilise pas.

Le résultat actuel porte `rapports`, les noms des modes, le compte des
échecs et le premier pire cas dans l'ordre de parcours. La factorisation
doit reconstruire ces informations pour les combinaisons admises par la
borne existante. Elle réduit les calculs de couleur ; elle n'autorise ni
la suppression de ces informations ni une nouvelle couverture silencieuse.
Le coût de matérialisation de ces sorties peut donc rester proportionnel
au nombre de combinaisons retenues.

Mesurer le coût des signatures et leur taux de réutilisation. Sur un sujet
où tout diffère, limiter leur mémoire et garder le calcul direct si le
partage ralentit l'exécution. Les doublons de structure, de typographie et
de contraste se jugent séparément.

### E. Recouvrir les lectures et le calcul avec un worker

Le sandbox reste le seul lecteur de Figma. Il transmet au worker des lots
de faits ordinaires, sans objet Figma, fonction ni promesse. Le worker
calcule sur ces faits et renvoie des diagnostics et des propositions ; le
sandbox conserve l'autorité d'écriture et les vérifications avant
application. Figma décrit les workers comme adaptés aux calculs qui n'ont
pas besoin d'accéder au document.
[Référence : Frozen Plugins](https://developers.figma.com/docs/plugins/frozen-plugins/).

Le déroulement proposé est le suivant :

1. Capturer la demande et commencer l'acquisition. Lancer le worker dès que
   l'interface peut le créer ; compter son démarrage dans la durée à froid.
2. Transmettre un premier lot dont les faits sont stables. Les tables de
   ressources sont envoyées une fois, puis complétées par des ajouts numérotés.
3. Continuer les lectures pendant que le worker traite les calculs dont les
   dépendances sont disponibles. Attendre explicitement les données qui
   manquent ; un catalogue incomplet ne prouve pas l'absence d'un token.
4. Fermer le relevé et le catalogue. Exécuter les contrôles entre variants,
   les recherches de candidats et les agrégations qui exigent leur totalité.
5. Finaliser les diagnostics, retenir les corrections dans le sandbox et
   publier le résultat final. Les constats provisoires suivent le point 8.

Le recouvrement ne concerne que les calculs indépendants des données encore
à lire. Une copie, un tri ou une résolution qui reste synchrone dans le
sandbox continue de compter dans son temps de blocage.

Prévoir un worker et deux lots au plus en attente au départ. Le producteur
attend l'acquittement d'un lot consommé avant d'en ajouter un troisième.
Mesurer la taille des lots en octets et leur temps de copie ; choisir leur
taille par essais.
La mémoire temporaire du transport reste ainsi bornée. Les faits utiles aux
contrôles globaux restent conservés jusqu'à leur dernière utilisation.

Commencer par un protocole de données ordinaires avec des tables communes
pour les chaînes répétées. Un encodage binaire ne sera retenu que si copie
et allocation dominent encore après cette réduction. La frontière Figma
accepte `Uint8Array`, mais ne garantit pas un transfert sans copie. Les
capacités entre l'iframe et son worker ne s'appliquent pas automatiquement
à la frontière du sandbox.
[Référence : messages de l'interface Figma](https://developers.figma.com/docs/plugins/creating-ui/).

Chaque message porte l'identité de l'analyse, une version du protocole et
un numéro de lot. Un résultat tardif, dupliqué ou appartenant à une autre
génération est rejeté. L'ordre de réception ne détermine jamais celui des
constats : l'assemblage reproduit l'ordre de la référence et ses règles
d'agrégation.

Tester le démarrage du worker dans le plugin distribué, avec le manifest
et le build réels. Si ce démarrage échoue, exécuter les mêmes fonctions par
tranches dans le sandbox. Le seuil de choix entre ces deux exécuteurs vient
du temps total à froid, pas des seuls temps de calcul sous Node.

### F. Borner les blocages et la durée de vie des données

L'acquisition et le repli sans worker consultent une horloge entre des
unités de travail courtes. Un budget initial proposé de 25 ms se compare à
16 et 50 ms sur les mêmes fixtures. Choisir le meilleur temps total qui
respecte la cible de réactivité, coût réel de `setTimeout` compris. Un appel
Figma indivisible peut dépasser le budget ; sa durée est relevée séparément.

Le budget traverse les variants. Une seule portée gère les cessions et
l'annulation. Après une cession, relire le jeton avant de commencer un
nouveau lot. Le worker doit lui aussi céder entre ses lots ou être arrêté
à l'annulation ; un message d'annulation seul ne coupe pas son calcul
synchrone en cours.

Les lots transmis ne sont plus modifiés. Les ajouts de ressources sont
versionnés. L'écoute des changements commence avant les lectures longues ;
un changement pertinent observé pendant l'acquisition ou le calcul rend le
résultat périmé et interdit de le présenter comme applicable. Les imports autorisés
du plugin doivent être distingués des modifications du sujet, sans masquer
un changement externe concomitant.

Le terme de relevé commun ne promet pas une lecture atomique de Figma.
Une lecture décrit les valeurs accessibles au plugin à cet instant. Un
changement non observable survenu ensuite garde cette limite, même à froid.
Les faits nécessaires à une écriture sont relus au moment de l'appliquer.
Une nouvelle demande valide les entrées réutilisées selon la stratégie
ci-dessous ; Actualiser impose leur réacquisition.

Libérer après son dernier consommateur toute vue dérivée exclue de la
mémoire entre analyses. Conserver jusqu'au résultat les faits requis par
les corrections et leur relecture. La rétention pour les demandes suivantes
est bornée séparément. La trace mesure le maximum de mémoire retenue, les
octets transférés et les files d'attente, en plus de la durée.

### Techniques conditionnelles pour cet objectif

| Technique | Place dans la solution à froid |
|---|---|
| Mémoire entre analyses et propagation incrémentale | Prolongement décrit ci-dessous ; aucun gain revendiqué sur la première analyse et coût de rétention inclus dans sa mesure |
| Diagrammes de décision pour les modes | À comparer à la factorisation par dépendances si le calcul des modes domine encore ; coût de construction et cas exponentiels à mesurer |
| WebAssembly | À comparer au worker JavaScript pour un noyau pur encore dominant, avec compilation, chargement et conversions inclus |
| Plusieurs workers | À essayer seulement après un worker ; les lectures Figma restent dans le sandbox et les données partagées coûtent à distribuer |
| Prélecture avant le clic | Évaluer sur le temps ouverture plus analyse ; ne pas déplacer le coût hors du chronomètre |
| Échantillonnage de variants | Écarté de cette solution : il ne prouve pas les mêmes constats |

Les diagrammes de décision peuvent partager des branches identiques, mais
leur taille peut rester exponentielle. Leur intérêt pour les modes UCM est
une hypothèse, pas un gain établi.
[Référence : Bryant](https://www.cs.cmu.edu/~bryant/pubdir/ieeetc86.pdf).

## Solution globale pour les analyses secondaires

### Objectif et cas à distinguer

Une analyse secondaire réutilise une session du plugin encore ouverte.
Elle peut retrouver le même composant, un composant modifié ou un autre
composant qui partage des ressources. La fermeture du plugin termine cette
mémoire. Une persistance dans `clientStorage` demanderait une validation
du fichier et des ressources au redémarrage ; elle sort de cette proposition.

L'objectif est de ramener le travail à la validation des entrées, aux
calculs affectés et à la restitution. Rejouer le relevé entier, tous les
contrôles et tous les transferts après chaque changement annulerait une
grande partie du bénéfice. L'absence de changement doit surtout supprimer
le calcul pur répété ; elle ne supprime pas les relectures obligatoires.

| Demande | Travail attendu |
|---|---|
| Même sujet, entrées validées identiques | Réutiliser les requêtes, actualiser la présentation et rattacher les corrections à la nouvelle identité |
| Modification locale | Relire les faits affectés, vérifier les dépendances non surveillables, recalculer les requêtes dépendantes |
| Modification d'une ressource partagée | Actualiser cette ressource et ses consommateurs ; accepter un recalcul large si elle intervient partout |
| Retour sur un sujet conservé | Vérifier la continuité du suivi ; relire les données dont la surveillance a été interrompue |
| Nouveau sujet | Acquérir sa topologie et ses propriétés ; réutiliser les ressources communes validées et les calculs équivalents |
| Actualiser | Réacquérir les entrées du périmètre demandé et recalculer ses requêtes sans résultat d'une demande précédente |

La proposition distingue donc Analyser, qui autorise la réutilisation, et
Actualiser, qui force la relecture. Le protocole devra porter cette
intention jusqu'au sandbox. Actualiser conserve le même moteur, les limites
de lecture et les mutualisations internes à la demande. Il peut garder le
worker démarré ; il ne constitue pas un essai à froid.

### G. Conserver des faits et des requêtes avec leurs dépendances

Retenir trois niveaux, séparés de l'état affiché :

- les faits acquis : propriétés de nœuds, ressources et inventaires,
  accompagnés de leur couverture de lecture et de validation ;
- les résultats de requêtes pures : valeur, diagnostics relatifs,
  dépendances réellement lues et version de l'algorithme ;
- les contributions aux résultats du sujet : correspondances vers les
  occurrences Figma, agrégats et ordre de restitution.

Une clé de requête comprend son type, ses arguments et tout contexte qui
influence son résultat. Une propriété de configuration peut être une
entrée suivie plutôt qu'une partie de la clé. La génération de l'analyse
ne figure pas dans ces clés : elle identifie une demande, pas le contenu
réutilisable. La session du document et la version des règles empêchent
toute réutilisation dans un contexte incompatible.

À chaque requête, conserver la révision de sa dernière vérification et
celle du dernier changement de sa sortie. Si une entrée change, vérifier
ses consommateurs à la demande. Recalculer ceux dont une dépendance a
changé. Si la nouvelle sortie est exactement égale à l'ancienne, garder
sa révision de changement : les consommateurs suivants peuvent réutiliser
leur résultat. Ce mécanisme reprend la validation et l'arrêt de propagation
sur égalité de Salsa ; il ne nécessite pas d'intégrer sa bibliothèque Rust.
[Référence : algorithme de Salsa](https://salsa-rs.github.io/salsa/reference/algorithm.html).

L'égalité porte sur toute la sortie observée par le consommateur, y compris
les limites et diagnostics. Séparer un rapport numérique de contraste de
son verdict AA/AAA évite de recalculer la couleur après un changement de
seuil. Un renommage peut conserver le rapport mais change les chemins et
les textes de restitution : ces dépendances doivent rester distinctes.

Les dépendances conditionnelles sont remplacées à chaque recalcul. Un alias
qui change de cible retire son ancienne arête et ajoute la nouvelle. Les
cycles et les refus gardent les règles de résolution à froid. Un graphe
inverse retrouve les consommateurs sans parcourir toutes les requêtes ;
son entretien fait partie du coût mesuré.

Conserver aussi les dépendances sur des ensembles : liste ordonnée des
enfants, inventaire des règles de la page, variables candidates par nom ou
collection. « Aucun token trouvé » dépend de l'ensemble recherché. Une
variable créée après l'analyse peut changer ce résultat sans toucher aucun
identifiant déjà mémorisé. Le même raisonnement vaut pour une nouvelle règle
d'usage ou une collision de noms.

Les signatures de la section D restent utiles entre composants. Les
mettre à jour depuis les faits modifiés et leurs parents utiles ; recalculer
une empreinte complète du sujet à chaque demande réintroduirait un parcours
global. Une empreinte de données déjà mémorisées ne valide jamais l'état
actuel de Figma. Le hash reste un index, suivi d'une égalité exacte.

### H. Valider les entrées sans supposer un journal Figma exhaustif

Le suivi actuel réduit les événements aux identifiants de nœuds. Il faut
conserver aussi leur type, les propriétés annoncées et la page surveillée.
Figma distingue création, suppression et changement de propriétés ; la
création ou suppression d'un sous-arbre peut ne signaler que sa racine.
[Référence : événements de page](https://developers.figma.com/docs/plugins/api/properties/PageNode-on/).

Le suivi incrémental exige une table des dépendances observables. Pour
chacune, préciser l'événement utilisable, sa couverture et le repli de
lecture. Un événement sans correspondance connue invalide le périmètre
potentiellement concerné. Une suppression utilise l'ancienne topologie ;
une création ou un déplacement demande la nouvelle. Si l'ancien parent
manque, élargir l'invalidation au sujet ou à l'inventaire de page.

La présence d'une écoute de nœuds ne suffit pas pour toutes les valeurs
résolues. Figma documente notamment des absences de `documentchange` pour
les répercussions d'un maître sur une sous-couche d'instance et celles d'un
style sur un nœud. La référence de `nodechange` ne donne pas une garantie
plus forte sur ces répercussions. La proposition suit donc aussi les
sources de ces valeurs, ou les relit.
[Référence : cas particuliers des événements](https://developers.figma.com/docs/plugins/api/properties/figma-on/#special-cases).

Ajouter `stylechange` pour les dépendances de styles que cet événement
couvre. Conserver les écoutes de pages autorisées ; charger toutes les
pages pour obtenir `documentchange` contredirait la stratégie d'accès du
plugin. Les variables ne disposent pas d'un événement de modification dans
les interfaces citées. Leur revalidation reste nécessaire.
[Référence : événements sans chargement global](https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading/#listening-to-document-change-events).

Un compteur de révision interne ne dispense pas de cette validation. À
chaque demande, vérifier les entrées Figma avant de consulter les résultats
mémorisés, même si aucun événement n'a fait avancer ce compteur.

| Catégorie d'entrée | Validation avant réutilisation |
|---|---|
| Propriété directe dont le suivi est établi | Surveillance continue et traitement des invalidations ; relecture si couverture ou fraîcheur de l'événement insuffisante |
| Valeur héritée ou résolue : mode, style, maître, disposition | Suivre les sources et les effets dérivés documentés ; relire les valeurs résolues lorsque cette couverture manque |
| Variables, collections, contenu de library, maître hors page suivie | Relire les champs consommés et comparer leur contenu ; l'identifiant seul ne constitue pas une révision |
| Ensemble de candidats ou recherche d'absence | Revalider l'inventaire et son ordre avant de conserver une réponse négative ou un choix prioritaire |
| Lecture ayant échoué ou ressource inaccessible | Réessayer dans la nouvelle demande ; une ancienne erreur ne prouve ni l'absence ni une valeur actuelle |
| Écoute interrompue, événement inconnu, état perdu | Invalider la couverture concernée et relire ; réacquérir tout le sujet si la portée ne peut pas être déterminée |

Relire les ressources non surveillables une fois par demande, avec les lots
bornés de l'acquisition à froid. Une valeur identique conserve sa révision
et évite les calculs en aval. Les inventaires nécessaires aux recherches
restent complets ; les valeurs suivent les besoins des contrôles. Une clé
de library stable ne prouve pas que son contenu est inchangé. Une mise à
jour distante non encore exposée par Figma garde la limite de l'API.

Les événements arrivent de façon asynchrone. Avant de valider une demande,
céder la main et traiter les changements reçus ; cette cession n'est pas
une barrière de synchronisation garantie par Figma. Si l'absence d'événement
est la seule justification disponible pour une valeur, la voie retenue par
défaut relit cette valeur. Un délai d'expiration du cache ne remplace pas ce
contrôle.
La recette doit inclure une modification juste avant le clic, dont
l'événement n'est pas encore reçu. Aucun état global atomique du fichier
n'est revendiqué, à chaud comme à froid.

Dans [contexte.ts](../../../../../packages/plugin-architect/src/sandbox/contexte.ts),
une page quitte le suivi quand elle n'est plus ni courante ni celle du
sujet. Retenir des résultats de plusieurs jeux exige donc de retenir aussi
les périodes de couverture. Revenir sur une page après une interruption
force la validation de ses données, même si le sujet est encore en mémoire.
Le changement de sélection périme l'identité affichée ; il ne prouve pas
à lui seul que les faits du sujet précédent ont changé.

### I. Invalider à la bonne granularité

Le point de départ peut être une invalidation par sujet. Affiner ensuite
vers les propriétés, les groupes et les requêtes lorsque la table de
dépendances est prouvée. Une invalidation trop large coûte du temps ; une
invalidation trop étroite change les diagnostics.

| Changement | Données et calculs à invalider |
|---|---|
| Peinture, opacité, visibilité, dimensions ou texte | Champs concernés, valeurs dérivées et consommateurs ; inclure les descendants dépendant du fond ou de la visibilité, les effets de disposition et les groupes typographiques touchés |
| Nom, axes, ordre ou parent | Chemins, rattachements, appartenance aux groupes, choix prioritaires et diagnostics qui lisent ces données |
| Ajout ou suppression de variant, changement du nombre de calques | Topologie, budget, variants admis et contrôles transversaux ; une nouvelle admission peut modifier toutes les étapes suivantes |
| Variable, alias, mode ou collection | Résolutions dépendantes, index de noms et candidats concernés, puis contrôles associés ; réviser aussi la couverture des modes si elle change |
| Style ou maître imbriqué | Sources concernées, occurrences dépendantes et faits résolus que Figma ne signale pas directement |
| Règle d'usage hors du jeu | Inventaire de règles de la page, diagnostics du moteur, surface et modèle des règles concernés |
| Choix de library | Catalogue, candidats, corrections et requêtes qui en dépendent ; conserver seulement les requêtes indépendantes dont les autres entrées sont validées |
| Niveau AA/AAA | Seuils, verdicts, agrégats et propositions dépendants ; conserver les rapports numériques indépendants du niveau |
| Ignorés, réponses et choix de présentation | Projection des constats et état des corrections ; ne pas relancer une analyse de géométrie sans dépendance réelle |
| Écriture du plugin, annulation ou rétablissement Figma | Entrées réellement touchées et effets dérivés ; relire après écriture, sans prendre la valeur prévue comme preuve de la valeur obtenue |

Le choix de library et le niveau passent par
[configuration.ts](../../../../../packages/plugin-architect/src/sandbox/configuration.ts).
Leur changement effectif doit invalider les dépendances même sans événement
Figma. Une demande de configuration qui échoue ne change pas l'entrée.
Q3 peut ainsi conserver les calculs indépendants du catalogue ; elle ne
justifie jamais de réutiliser toutes les sorties d'un ancien catalogue.

Séparer la notification de péremption et l'enregistrement des changements.
[perimer](../../../../../packages/plugin-architect/src/sandbox/analyse.ts)
n'envoie qu'une notification. Le suivi incrémental doit néanmoins accumuler
tous les événements suivants, y compris quand aucune analyse n'est active.
Un ensemble de champs à relire peut fusionner les répétitions. En cas de
dépassement de sa borne, remplacer le détail par une invalidation plus large.

Les écoutes enregistrent ces invalidations sans lancer d'analyse. Les
recalculs partent au geste Analyser ou Actualiser, conformément au
[comportement du panneau](../../../../../packages/plugin-architect/invariants/explorateur.md).
Conserver le verrou entre analyse et écriture. Une modification externe
pertinente et observée pendant le calcul périme la génération ; elle
n'entraîne pas une boucle automatique de relances.

### J. Mettre à jour les agrégats et les constats par contribution

Une modification locale peut affecter un résultat collectif. Conserver
l'origine des contributions pour pouvoir les retirer, les remplacer et
recalculer les seuls groupes touchés.

- Typographie : retirer les fréquences de l'ancienne source puis ajouter
  celles de la nouvelle. Un changement de groupe touche l'ancien et le
  nouveau groupe. Le franchissement de `AUTRES_MINIMUM` ou la perte de
  l'unanimité peut modifier les constats de tous leurs membres.
- Accessibilité : remplacer les rapports et limites affectés, puis mettre
  à jour les comptes et le pire cas avec l'ordre de départage existant.
  Supprimer l'ancien pire rapport doit faire remonter le suivant. Un simple
  minimum comparé au résultat précédent ne suffit pas.
- Diagnostics : conserver la provenance de chaque contribution. Le retrait
  d'un variant ne supprime pas un constat encore produit par un autre.
  Reconstruire les localisations, questions et corrections concernées en
  conservant les identifiants définis par le produit.

La borne globale des 5 000 combinaisons constitue elle-même une dépendance.
Un ajout de mode ou un changement d'ordre des variants peut déplacer son
préfixe admis. Recalculer alors ce plan de couverture avant de réutiliser
les rapports ; compter correctement les combinaisons devenues exclues ou
nouvellement admises. Le budget de calques impose le même raisonnement sur
la liste des variants lus.

Ces agrégats sont des vues maintenues à partir des faits. Leur reconstruction
complète utilise les mêmes fonctions et sert de référence. Si la mise à
jour d'un groupe coûte autant que sa reconstruction, reconstruire ce groupe.
Une modification de ressource commune à tous les variants peut légitimement
coûter presque autant qu'une analyse entière.

### K. Garder le worker et transmettre seulement les différences utiles

Lorsque le worker a été retenu, le conserver dans la session avec les faits
et requêtes utiles. La demande suivante lui transmet les ajouts, remplacements
et suppressions validés. Une nouvelle copie de tout le relevé et du catalogue
ferait perdre une partie du gain incrémental. Les données de la révision en
cours restent immuables ; les différences préparent la suivante.

Le protocole ajoute à l'identité d'analyse une identité de worker, une
révision de base et une révision cible. Le worker acquitte l'application
des différences à la révision en préparation avant de calculer sur la cible.
Le sandbox confirme ensuite sa promotion, ou demande son abandon. Si le
worker a perdu la dernière base validée, resynchroniser avant la demande
suivante. Une éviction ou un redémarrage exige aussi la retransmission des
données nécessaires. Les messages d'une ancienne instance du worker sont
rejetés. La borne de lots et l'annulation de la section E restent applicables.

Le sandbox reste propriétaire de la validation et des corrections. Le
worker ne déduit pas la fraîcheur du document de sa seule mémoire. Si le
calcul incrémental est minime, comparer son aller-retour au même calcul
coopératif local. Compter toute copie nécessaire à ce changement d'exécuteur ;
ne pas maintenir deux graphes complets pour économiser quelques calculs.

Pour la restitution, commencer par assembler un résultat final dans l'ordre
de référence. Si le rendu ou le transfert domine ensuite, transmettre des
remplacements et suppressions par identifiant de constat, avec identité de
base. Une base différente impose un résultat entier. Appliquer l'ensemble
final atomiquement côté interface ; un mélange de constats de deux révisions
ne devient jamais un résultat applicable. Même en cas de réutilisation totale,
les corrections sont rattachées à la nouvelle identité côté sandbox.

Relire les ignorés avant la projection finale. Les réponses aux questions
et les cases cochées appartiennent à l'analyse courante ; la mémoire des
faits ne les restaure pas implicitement sur une nouvelle génération. Leur
éventuelle conservation doit suivre les règles du produit et revalider
les candidats concernés.

### L. Publier une révision validée et borner la rétention

Chaque demande prépare une révision de travail à partir des dernières
données retenues. La révision est un compteur du plugin, pas une version
globale fournie par Figma. La génération identifie la demande pour
l'interface ; les révisions de contenu servent aux dépendances.

Promouvoir les nouvelles données seulement après validation des lectures,
des contrôles et de l'identité courante. Une génération annulée, arrêtée ou
périmée ne remplace pas la référence. Conserver ses invalidations pour la
prochaine demande. La première version ne récupère pas ses calculs partiels :
cette réutilisation supplémentaire demanderait une preuve par sous-requête.

Une analyse terminée `partielle` reste affichable selon les règles du
produit. Elle ne sert pas de référence complète. Les lectures manquées sont
retentées ; les budgets et leur couverture sont recalculés. Une référence
antérieure peut rester en mémoire, mais seules ses entrées revalidées sont
réutilisables. Une absence liée à un budget ne devient jamais une preuve
d'absence dans Figma.

Borner la mémoire en octets estimés, en nombre de sujets et en volume
d'arêtes. Mesurer le pic réel dans Figma, y compris les copies du sandbox,
de l'iframe, du worker et la révision en préparation. Protéger le sujet
actif puis évincer les sujets les moins récemment utilisés. Les ressources
partagées restent tant qu'un sujet retenu les référence ; nettoyer les
arêtes inverses et les signatures sans propriétaire. Si le sujet actif
dépasse le budget de rétention, renoncer à sa mise en cache, sans réduire
la couverture de son analyse.

Choisir les bornes sur le corpus de recette. Un délai d'inactivité peut
libérer des données, jamais certifier leur fraîcheur. Une éviction ne change
que le coût de la prochaine demande : elle emprunte le même chemin de lecture
et de calcul qu'une première analyse.

## Cohérence des choix et ordre de priorité

| Choix | Articulation retenue |
|---|---|
| Analyse à froid et analyses secondaires | Même acquisition et mêmes fonctions ; la première remplit les tables, les suivantes revalident leurs entrées |
| Mémoire dans une demande et entre demandes | Même résultat pur ; la seconde ajoute une preuve de validité des dépendances et une borne de rétention |
| Q3 et changement de library | Préserver les calculs indépendants ; invalider le catalogue et ses consommateurs |
| Worker et incrémentalité | Deux choix indépendants : le graphe fonctionne sans worker, le worker peut servir une analyse complète |
| Partage entre variants et mises à jour locales | Un calcul partagé, plusieurs provenances ; changer une occurrence ne modifie pas la valeur commune en place |
| Conservation et libération | Retenir seulement les données choisies pour la session ; libérer les autres après leur dernier consommateur |
| Résultats provisoires et corrections | Affichage possible selon le point 8 ; autorité du sandbox et validation finale inchangées |
| Actualiser et référence à froid | Actualiser contourne les résultats précédents ; seule une nouvelle session mesure aussi les démarrages |

L'ordre proposé est de réduire d'abord le travail de chaque analyse, puis
d'éviter sa répétition. La validation des dépendances précède toute mémoire
entre demandes. L'invalidation fine et les agrégats maintenus viennent après
la parité d'une invalidation plus large. Les signatures complexes, le
transport différentiel et le choix dynamique d'exécuteur restent soumis à
leur gain net.

La solution à froid doit être mesurée avec le suivi et la rétention destinés
aux analyses suivantes activés. Si l'entretien du graphe dégrade sensiblement
la première analyse, réduire sa granularité ou différer les structures
secondaires. Compter alors ce travail dans la demande qui le paie ; il ne
disparaît pas du bilan de la session.

## Mise en œuvre proposée et preuves

Ces étapes précisent les cibles de la revue. Elles ne modifient pas les
décisions ni les cases du plan d'implémentation voisin. Leur implémentation
devra aussi mettre à jour la spécification et les invariants concernés.

| Étape | Livrable | Preuve avant de poursuivre |
|---|---|---|
| 1. Référence et mesure | Trace de l'analyse actuelle, compteurs de lectures, durée des tranches et réception du résultat | Sorties de référence reproductibles ; coût de la mesure identifié |
| 2. Coûts algorithmiques | Itérateur des modes, index du catalogue, fréquences de typographie | Égalité profonde des sorties ; tests de croissance du nombre d'opérations |
| 3. Acquisition commune | Tables de faits, ressources et topologie ; anciens lecteurs adaptés à ces données | Même relevé, mêmes frontières, mêmes budgets et mêmes lectures manquées |
| 4. Analyse pure à la demande | Diagnostics partagés, surface des règles, séparation de la publication | Parité Architect et exporteur, y compris diagnostics après `structure` et modèles de corrections |
| 5. Exécution dans le worker | Protocole par lots, recouvrement, annulation, repli sur les mêmes fonctions | Résultats identiques ; gain à froid après démarrage et transport ; mémoire bornée |
| 6. Partage des calculs | Signatures par contrôle et factorisation des modes | Parité avec et sans partage ; gain mesuré sur sujets répétitifs et coût maîtrisé sur sujets distincts |
| 7. Restitution et recette | Progression réelle, résultat provisoire, mesure jusqu'au rendu final | Cas de fin du point 8, réactivité et temps total validés dans Figma |
| 8. Validation entre demandes | Matrice de couverture des événements, relectures, Actualiser forcé, mémoire bornée avec invalidation large | Parité après changement externe, interruption du suivi, erreur de lecture et écriture du plugin |
| 9. Recalcul ciblé | Révisions par fait et requête, dépendances inverses et sur ensembles, arrêt de propagation sur égalité | Même résultat qu'une reconstruction complète après chaque mutation ; travail limité aux dépendances affectées |
| 10. Contributions et échanges différentiels | Agrégats par groupe, worker conservé, ajouts et suppressions versionnés | Parité après retrait du pire cas, changement de couverture, éviction et redémarrage du worker |
| 11. Recette de session | Séries à froid puis analyses secondaires, mémoire mesurée avec tous les mécanismes actifs | Gains nets par scénario, sans perte de couverture ni régression masquée de la première analyse |

Les cessions et Annuler s'ajoutent dès les premières étapes ; les recettes
les vérifient sur chaque architecture retenue. Les premiers constats
restent un objectif secondaire : leur affichage ne doit pas ralentir
sensiblement le résultat final par des transferts ou rendus répétés.

Les étapes 5 et 6 sont conditionnelles à leur mesure ; leur rejet ne bloque
pas l'étape 8. En revanche, les faits communs, les requêtes pures et leur
parité sont nécessaires au recalcul ciblé. L'étape 10 peut maintenir les
agrégats sans worker et n'ajoute le transport différentiel que s'il sert.

Les tests hors Figma comparent les constats ordonnés, leurs identifiants,
faits, localisations, corrections, questions, modèles de règles et lectures
manquées. L'exporteur compare aussi le contrat hors date d'export. Toute
différence de comportement exige un défaut identifié et son test dédié.

Les fixtures couvrent les modes dont le produit dépasse largement 5 000,
le budget épuisé avant le dernier variant, les collisions de noms et les
alias illisibles. Elles couvrent aussi les textes mixtes, les frontières
d'instance, les calques masqués, un gros premier variant et les diagnostics
émis après `structure`. Un faux hash constant doit prouver que le partage
ne confond pas deux entrées différentes. Les essais du protocole simulent
les lots retardés, les erreurs de worker et l'annulation.

Pour l'incrémentalité, appliquer des séquences de mutations à des faits
contrôlés. Après chaque étape, comparer l'analyse incrémentale à une analyse
complète sans mémoire sur ces mêmes faits. Couvrir les ajouts, suppressions,
déplacements, renommages, changements d'alias et de modes. Inclure la
création d'un premier candidat après une recherche vide, les changements
de groupe typographique, la suppression du pire contraste et le déplacement
de la borne des 5 000 combinaisons. Comparer aussi corrections, ignorés,
questions, ordre et couverture, pas seulement le nombre de constats.

Tester séparément l'acquisition et le suivi : événement retardé, inconnu ou
racine unique d'un sous-arbre ; écriture suivie de Ctrl+Z ; changement de
configuration ; page quittée puis retrouvée ; échec de lecture devenu
lisible. Une modification pendant une analyse annulée doit rester à relire
à la demande suivante. Une révision de base absente du worker doit déclencher
une resynchronisation. Les tests de faits purs ne prouvent pas que les
notifications réelles de Figma couvrent ces cas.

Ces changements toucheraient le kit, le socle, Architect et l'exporteur.
L'implémentation devra suivre leurs commandes de test et la règle de version
du kit. Les tests de complexité comptent des opérations ; les temps réels
restent mesurés dans le banc et dans Figma, sans seuil chronométrique fragile
dans les tests unitaires.

## Recette de la première analyse à froid

Comparer chaque candidat au build de référence sur le même poste, la même
version de Figma, le même fichier et la même library. Alterner l'ordre des
builds et rouvrir le plugin pour chaque essai. Conserver les traces brutes,
les tailles des données et l'état des accès réseau. Ne pas lancer une
analyse préalable pour préparer le worker ou le catalogue.

| Mesure | Critère proposé |
|---|---|
| Temps complet du Button | Cible de 2 s en médiane et 4 s au 95e percentile, à confronter à la référence ; aucune promesse avant mesure |
| Ouverture du plugin | Mesurée séparément, puis ajoutée au temps de première analyse pour révéler tout déplacement de coût |
| Réactivité | Cible d'au plus 250 ms sans traitement d'une interaction ou d'Annuler ; distinguer calcul et attente d'API |
| Premiers constats | Délai du clic au rendu ; aucune conclusion de conformité avant fermeture de l'analyse |
| Travail acquis | Nombre de lectures par API, propriétés relues, inventaires et ressources distinctes ; expliquer les répétitions restantes |
| Travail calculé | Nombre de combinaisons matérialisées, résolutions, signatures et résultats réutilisés |
| Transport et mémoire | Temps de démarrage du worker, octets copiés, durée de copie, maximum de lots et de faits retenus |

Les seuils de durée et de réactivité sont des objectifs proposés. Une
attente d'API qui laisse Figma répondre ne constitue pas un gel ; une barre
qui reste au même pourcentage ne mesure pas à elle seule la réactivité.
Les acquittements de réception et de rendu suivent le point 7.

Dix exécutions donnent une médiane et une dispersion initiales. Elles ne
stabilisent pas un 95e percentile. Prévoir au moins 30 exécutions pour la
recette finale et augmenter la série si les valeurs extrêmes restent
instables. Les réouvertures complètes de Figma sont rapportées séparément.

Mesurer l'acquisition seule dans Figma. Sur les faits enregistrés, comparer
l'analyse pure sans worker, le trajet avec worker puis le trajet avec
partage. Ces essais isolent les coûts sans servir de mesure à froid du
produit complet. Dans Figma, conserver une optimisation si son gain dépasse
la dispersion et si les sorties restent identiques. Les gains de plusieurs
techniques ne s'additionnent pas lorsqu'elles retirent le même travail.

Le critère de fin est un résultat complet plus rapide dès la première
analyse, avec les mêmes limites explicites, une annulation réactive et un
coût d'ouverture mesuré. Si les lectures indispensables de Figma dépassent
à elles seules la cible, la trace doit le montrer avant toute extension
vers WebAssembly ou plusieurs workers.

## Recette des analyses secondaires

Pour chaque essai, partir d'une première analyse terminée puis appliquer
une mutation définie. Mesurer du clic au rendu final, en incluant validation,
transport et reconstitution des corrections. Éprouver aussi les séries de
modifications successives : elles révèlent les invalidations perdues et la
croissance de mémoire qu'un simple deuxième clic ne montre pas.

Comparer trois chemins : le build de référence, le nouveau moteur avec
réutilisation, puis ce même moteur avec Actualiser forcé. Pour une mutation,
recréer le même état initial avant chaque candidat ; Actualiser peut lui-même
réchauffer les ressources. Garder la première analyse séparée et rapporter
aussi le temps cumulé de la session. Reprendre le protocole de répétition et
de dispersion de la recette à froid.

| Scénario | Preuve fonctionnelle et travail attendu |
|---|---|
| Deuxième analyse sans changement | Même résultat ; aucune réexécution de requête pure dont les entrées ont été validées identiques ; relectures obligatoires comptées |
| Une peinture dans un variant | Relecture des champs touchés et des dépendances non surveillables ; calcul limité aux consommateurs et agrégats affectés |
| Texte ou nom changé | Mise à jour des plages, chemins, groupes et localisations concernés ; aucune ancienne correction attachée à une nouvelle cible |
| Variable partagée ou alias changé | Tous les consommateurs concernés réévalués, y compris dans les autres sujets conservés lorsqu'ils sont redemandés |
| Règle ajoutée hors du jeu, token créé après une recherche vide | Inventaires revalidés ; nouveau diagnostic ou candidat présent comme avec Actualiser |
| Variant ou mode ajouté près d'une borne | Même préfixe admis, mêmes limites et mêmes comptes que la reconstruction complète |
| AA vers AAA ou changement de library | Réutilisation des seules sorties indépendantes ; nouveaux verdicts et nouvelles corrections |
| Plusieurs changements après la première péremption | Tous les changements pris en compte ; la notification unique n'efface aucune invalidation |
| Retour sur une page, éviction, worker perdu | Revalidation ou reconstruction nécessaire ; résultat identique après récupération |
| Correction, Ctrl+Z puis nouvelle analyse | Résultat de l'état effectivement lu, sans réutilisation de la valeur prévue par l'écriture |
| Lecture échouée puis rétablie | Nouvelle lecture ; disparition de la limite seulement si les données sont redevenues disponibles |
| Actualiser sans changement | Acquisition et calcul sans résultats antérieurs ; mêmes sorties que la voie incrémentale |

Viser, sur le Button de référence, une médiane inférieure à 250 ms sans
modification et à 500 ms après une modification locale. Ces cibles proposées
incluent les relectures obligatoires. Mesurer le 95e percentile sans promettre
ces durées pour une attente de library ou une modification globale. Si la
seule validation dépasse la cible, documenter ce plancher au lieu de supprimer
une lecture nécessaire. Le rapport de vitesse se calcule sur chaque scénario
mesuré, sans facteur d'accélération annoncé à l'avance.

La trace sépare les lectures de validation, les faits modifiés, les arêtes
de dépendance visitées, les requêtes réexécutées et les propagations arrêtées
par égalité. Ajouter les groupes reconstruits, les octets transférés et le
temps d'assemblage puis de rendu. Zéro contrôle rejoué ne signifie pas zéro
coût : la validation du graphe et la restitution peuvent encore dominer.

Comparer une longue séquence sur un même sujet à une alternance dépassant
la capacité de rétention. Vérifier que le volume retenu se stabilise après
éviction et que les écoutes sont retirées à la fermeture du plugin. Mesurer
le coût du suivi entre les clics, même sans recalcul automatique. Si une
invalidation touche presque tout le sujet, comparer son traitement fin à
une reconstruction ; retenir un seuil mesuré pour ce repli.

La parité sur faits capturés prouve le calcul. Dans Figma, vérifier en plus
les changements indirects, les notifications retardées et la couverture
des ressources externes. Tout cas sans suivi démontré conserve sa relecture.
Les gains retenus doivent dépasser la dispersion et préserver les critères
de première analyse avec la mémoire de session activée.
