# Revue critique du plan de nomenclature

Le [plan examiné](./PLAN-IMPLEMENTATION.md) répond au bruit de Q1 et prépare
les choix de vocabulaire d'UCM. Ses principaux risques portent sur la
signification des remplacements et sur la qualité des preuves. Exécuter les
lots dans leur ordre actuel peut produire une liste de questions plus courte
sans retrouver davantage d'incohérences utiles.

**Recommandation : corriger la chaîne question–réponse–renommage, constituer un
jeu de référence indépendant, puis analyser le corpus.** La comparaison au
marché doit éclairer les décisions du mainteneur. Elle ne suffit pas à établir
qu'un remplacement conserve le sens dans un fichier.

Cette revue propose un ordre d'action. Elle ne modifie ni les décisions du
mainteneur ni les règles publiées du produit.

## 1. Portée et preuves de la revue

La revue confronte le plan à la [conception de la refonte](../3%20Refonte/CONCEPTION.md),
aux [recherches sur la nomenclature](../1%20Architecture%20globale/Recherches/R3-NOMENCLATURE.md),
au référentiel du kit, à la session d'Architect et aux outils du
[corpus de référence](../../../../references/design-systems/README.md).

Des modifications de N0 sont présentes dans l'arbre de travail, dont
`questions.ts`, `branches-paralleles.ts` et `termes-connus.ts`. Les constats
sur ces fichiers décrivent le code consulté, y compris ces modifications.
Ils ne constituent pas un verdict sur une version publiée. La revue laisse
ces fichiers intacts.

Les vérifications effectuées sont les suivantes :

- lecture du code de détection, de découpage, de remplacement et de réponse ;
- deux reproductions synthétiques contre les sources du kit, décrites en
  section 3 ;
- comptage des couches dans les quatorze `noms.json`, UCM compris ;
- vérification locale du SHA-256 des 156 entrées de `sources.json`, sans écart.

Les données privées de C2 n'ont pas été ouvertes. Les comptes et les sept
paires annoncés dans le plan restent des éléments à vérifier par sa recette
locale. La revue ne mesure ni la précision réelle sur C2 ni le comportement
du plugin dans Figma. Les sources du marché ont été examinées dans leurs
copies figées ; leur couverture fonctionnelle n'a pas été vérifiée auprès
de chaque éditeur.

## 2. Ce qu'il faut conserver

| Choix du plan | Intérêt pour la suite |
|---|---|
| Retirer le rapprochement par cible d'alias commune | Deux usages peuvent partager une primitive sans partager leur sens. Le plan traite une cause identifiée de faux positifs. |
| Chercher des correspondances entre branches | La répétition des sous-chemins apporte une preuve plus précise que la seule proximité des mots. |
| Figer les sources avec leur empreinte | Une décision peut être réexaminée sur les mêmes données. |
| Garder C2 et ses résultats détaillés en local | La recherche peut employer le fichier client sans l'ajouter au corpus public. |
| Raisonner par concept et rôle | Cette distinction est nécessaire pour comparer les noms qui ont plusieurs sens. |
| Borner les questions présentées | Le mainteneur peut traiter une sélection. Le rapport technique doit garder les questions écartées et leurs raisons. |
| Prévoir une seconde vague conditionnelle | Un manque identifié justifie mieux une collecte que l'ajout systématique de systèmes. |

Ces choix demandent surtout des critères de décision et de recette plus
précis. Une extension générale du périmètre produit n'est pas nécessaire.

## 3. Corrections bloquantes

### 3.1. La proximité morphologique ne prouve pas l'équivalence

**Cible :** « Sources de questions », « Tranché sans question », N0.2.

Le plan range la négation parmi les formes d'un même mot. `selected` et
`unselected` expriment pourtant deux états opposés. Les terminaisons et les
pluriels présentent aussi des ambiguïtés : `default` et `defaults` peuvent
nommer un état et un groupe de valeurs. Une proximité lexicale peut justifier
une inspection. Elle n'autorise pas, à elle seule, une règle de remplacement.

Le code consulté produit une question `paire:selected|unselected` avec l'indice
`negation`. Une règle personnalisée conservant `selected` à la place
d'`unselected` est acceptée par `indexerVocabulaire`. Sur deux noms synthétiques
sans collision, la normalisation produit ceci :

```text
theme/selected/fill     reste theme/selected/fill
theme/unselected/edge   devient theme/selected/edge
```

Dans la [session](../../../../../packages/plugin-architect/src/nomenclature/session.ts),
la réponse `garder` à une question de paire crée précisément un remplacement
du terme opposé. Le contrôle des collisions ne protège donc pas contre cette
perte de sens.

**Correction à inscrire :** distinguer relation lexicale et équivalence
adoptée. Une négation doit d'abord être traitée comme une opposition. Une
paire opposée ne doit pas rejoindre les choix de fusion sans preuve
supplémentaire sur les occurrences concernées. Une faute présumée ou un
pluriel inconnu reste une question tant que son sens n'est pas établi.

**Critère de fin :** les cas `selected/unselected`, `active/inactive`,
`checked/unchecked` et `default/defaults` conservent leurs distinctions
attendues. Les formes déjà adoptées dans les registres, comme
`hovered/hover`, continuent à suivre leur règle existante.

### 3.2. Le découpage des questions et celui des renommages divergent

**Cible :** « Découpage d'un segment », N0.3, N0.4 et N5.

Le [lexique](../../../../../packages/kit/src/referentiel/lexique.ts) prépare
les noms avec `decouperSegment`. Le détecteur emploie désormais
`decouperPourQuestions`. Le calcul des portées touchées et la normalisation
continuent à employer le découpage du lexique.

Reproduction sur un nom inventé `x/textsucccess/y`, accompagné de cinq noms
contenant `success` :

| Étape | Résultat observé |
|---|---|
| Découpage pour les questions | `text`, `succcess` |
| Découpage du lexique | `textsucccess` |
| Question | Corriger `succcess` en `success` |
| Ajout de cette règle au vocabulaire | Aucun conflit |
| Nouvelle détection | La question disparaît |
| `porteesTouchees` pour `succcess` | Aucune portée |
| Normalisation avec la règle | Aucun renommage |

Le nom reste inchangé alors que sa question est considérée comme couverte.
Une bonne précision des questions ne détecterait pas ce défaut.

**Correction à inscrire :** définir une représentation commune des
occurrences, de la détection jusqu'au renommage. Elle doit rattacher chaque
terme au segment d'origine et à la portion effectivement remplaçable. Un
adaptateur explicite peut relier deux découpages si leurs besoins diffèrent.
Le choix doit aussi couvrir la reconstitution du nom, la recherche des
portées et l'annulation d'une réponse.

**Critère de fin :** un test de session répond à cette question, constate le
renommage attendu, annule la réponse et retrouve exactement l'état initial.
Le recalcul partiel et le recalcul complet produisent les mêmes résultats.
Cette correction précède l'élargissement du vocabulaire en N5.

### 3.3. Une correspondance structurelle ne suffit pas à créer une règle globale

**Cible :** branches parallèles, analyse par concept et N0.1.

Deux branches peuvent employer des noms différents pour des usages voulus.
Un alias sémantique peut aussi porter un nom différent de sa primitive :
`button/background/default` peut légitimement référencer
`palette/blue/600`. Même à longueur de chemin égale, un alias et sa cible
peuvent appartenir à des couches distinctes.

Le plan réintroduit l'alias comme preuve dans « branches parallèles » sans
définir cette frontière. L'appariement un à un évite certains mélanges ; il
n'établit ni la synonymie ni le sens du renommage.

Le problème dépasse la détection. Les règles personnalisées du kit portent
des suites de mots, sans condition de collection, de rôle ou de branche.
Une réponse appuyée sur deux occurrences peut donc remplacer le même terme
dans d'autres usages du fichier. La distinction concept–rôle prévue en N2
ne protège pas l'application tant qu'elle reste dans les données de recherche.

**Correction à inscrire :** pour chaque candidat, conserver la portée de
la preuve et simuler tous les noms que sa réponse remplacerait. Une question
de fusion ne devient actionnable que si cette portée d'application est
justifiée. Si une règle limitée à une branche est nécessaire, prévoir son
modèle, son stockage et son import/export. À défaut, s'abstenir de créer une
règle globale pour ce candidat.

**Critère de fin :** un terme synonyme dans une branche et distinct dans une
autre ne provoque aucun remplacement hors du périmètre validé. Les alias
entre couches restent des contre-exemples explicites.

### 3.4. Le protocole de mesure peut valider un moteur qui manque les bons cas

**Cible :** N0.4, N0.5, Q1 et les seuils de décision.

Juger les quarante premières questions mesure le bruit en tête de liste. Le
protocole ne mesure pas les incohérences absentes de cette liste. Un filtre
qui retire toutes les questions difficiles peut donc satisfaire le critère.
Si le moteur retourne moins de quarante questions, le plan ne précise pas
le dénominateur.

Le jeu synthétique reproduit les défauts connus de C2. L'employer aussi pour
régler tous les seuils favoriserait les structures déjà observées. Deux
fichiers, dont un export déjà normalisé, ne démontrent pas que le moteur
fonctionne sur d'autres grammaires de noms.

Il faut juger séparément :

1. la pertinence d'une question pour le mainteneur ;
2. la justesse de la réponse recommandée ;
3. les renommages réellement produits après cette réponse.

**Correction à inscrire :** constituer les annotations avant le réglage du
moteur, puis séparer développement et validation. Le mainteneur classe les
paires en équivalentes, distinctes ou indéterminées, avec leur contexte.
Les cas indéterminés restent comptés séparément. Un sous-ensemble tenu à
l'écart du réglage sert à la recette finale.

Pour C2, les sept paires annoncées dans le plan constituent un premier
inventaire local à vérifier. Le rapport doit indiquer combien sont retrouvées,
combien entrent dans le périmètre retenu et pourquoi les autres sont manquées.
Il ne faut pas présenter ce compte comme le rappel de toutes les erreurs du
fichier, puisque cet inventaire n'est pas démontré exhaustif.

**Critère de fin proposé :** garder l'exigence de moins de 10 % de questions
hors sujet, sur un effectif explicitement indiqué. Sur quarante questions,
cela impose au plus trois questions hors sujet. Ajouter la récupération de
tous les cas obligatoires du jeu de référence, aucun remplacement dangereux
sur les contre-exemples et un bilan des cas manqués par famille. Un moteur
sans question ne satisfait pas la recette par défaut.

## 4. Corrections nécessaires à la recherche de nomenclature

### 4.1. Définir le périmètre d'après le rôle des segments

**Cible :** « Couche analysée » et N2.

Le plan exclut la couche composant parce qu'elle contiendrait les noms
propres à ignorer. Cette assimilation retire aussi les états, les rôles et
les mesures présents dans les tokens de composants. Une identité de
composant et un mot de nomenclature peuvent appartenir au même chemin :

```text
components/Badge/background/hover
```

`Badge` peut rester opaque. `background` et `hover` restent comparables.
Leur présence dans un token de composant ne les transforme pas en noms propres.

L'[étude antérieure](../1%20Architecture%20globale/Recherches/R3-NOMENCLATURE.md)
relevait déjà que la variation des grammaires produit du bruit. Exclure une
couche entière réduit les observations sans résoudre la reconnaissance des
rôles. Le détecteur courant parcourt par ailleurs toutes les variables ;
le plan ne précise pas comment cette restriction de recherche le concerne.

**Action :** conserver la couche comme contexte et qualifier les occurrences
par rôle. Ignorer les identités de composant, de marque et de palette dans
les comparaisons lexicales. Comparer les états, rôles et propriétés lorsqu'ils
sont identifiés, y compris dans un token de composant. Ne pas ajouter de
lecture des composants Figma : le périmètre d'Architect reste celui des noms
de variables et de collections.

Un chemin insuffisamment compris reste non classé. Il ne reçoit pas un rôle
déduit de sa seule profondeur.

### 4.2. Traiter les couches inconnues avant tout vote

**Cible :** N1.3, N1.4, N2.1 et les règles de majorité.

Le comptage des fichiers présents donne :

| Groupe | Observation vérifiée |
|---|---|
| Corpus externe | 13 systèmes, 12 373 noms |
| Couche entièrement inconnue | 8 systèmes : Atlassian, MUI, Polaris, Radix, shadcn, Spectrum, Tailwind et Untitled UI |
| Au moins un nom sémantique renseigné | Carbon, Figma SDS, Fluent 2, Material 3 et Primer |
| UCM, extrait de C1 | 760 noms : 175 primitifs, 369 composants et 216 de couche inconnue ; aucun classé sémantique |

Un filtre strict `couche === 'semantique'` retire donc huit systèmes sur
treize et tout C1. Assimiler les couches inconnues à la couche sémantique
mélange au contraire les niveaux. Le seuil de cinq systèmes pourrait être
atteint seulement par les cinq sources qui ont déjà une classification,
sans que ce résultat représente la couverture annoncée.

**Action :** produire une matrice système–famille–couche avant l'analyse des
termes. Distinguer couche déclarée, couche attribuée après lecture et couche
inconnue. Une source inconnue peut contribuer à un concept après examen de
ses occurrences. Elle ne vote pas automatiquement sur tous les concepts.

### 4.3. Enregistrer les concepts sur des occurrences contextualisées

**Cible :** « Analyse par concept » et `concepts.json`.

La formulation « un mot a un concept » est trop restrictive. `default` peut
désigner un état ou le cran central d'une intensité. `text` peut désigner un
contenu, un rôle de couleur ou une variante de bouton. `ring` peut désigner
une couleur ou une épaisseur. Une table globale mot–concept perd ces
distinctions.

Le [vocabulaire actuel](../../../../../packages/kit/src/referentiel/vocabulaire.ts)
contient des rapprochements comme `pressed/active/down` et
`foreground/fg/content`. Ces groupes sont des hypothèses de rapprochement.
Le rôle et les occurrences doivent confirmer leur emploi dans chaque source.

**Action :** définir chaque concept avec son sens, ses exclusions et les
occurrences qui l'attestent. Distinguer les relations suivantes dans les
données de recherche : variante orthographique, abréviation, équivalence
contextuelle, opposition et relation entre un terme général et un terme
particulier. Un même mot peut participer à plusieurs concepts.

La fréquence « trois systèmes ou vingt noms » peut aider à prioriser le
travail. Elle ne doit pas déterminer l'existence d'un concept. Un terme
rare nécessaire à UCM mérite une décision. Trois cents mots ne constituent
pas un critère de qualité. Conserver tous les éléments non classés dans les
données ; limiter seulement leur aperçu dans le rapport.

### 4.4. Séparer les niveaux de segmentation et conserver la reconstruction

**Cible :** N0.3 et N2.1.

Le plan traite ensemble la hiérarchie `/`, les séparateurs d'un segment, la
casse et les mots composés CSS. Le corpus ajoute des chemins en `.`, des noms
CSS plats et des clés camelCase. Ces formes ne portent pas la même information
structurelle. Un tiret dans un nom CSS ne permet pas de retrouver une
hiérarchie Figma.

La règle des trois lettres protège certains noms propres. Elle garde aussi
`onSurface` entier, comme le confirme le test actuel. Le plan cite ce cas
sans préciser ce qu'il doit produire. `Gray100` est lexicalement découpable,
mais une comparaison d'échelles doit conserver le rapport entre la famille
et son cran. `H1` et `2xl` demandent aussi une interprétation propre aux échelles.

**Action :** définir les résultats attendus pour chaque exemple de N0.4.
Conserver le chemin brut, les segments réellement présents et les unités
lexicales reconnues. Un composé CSS peut constituer une unité sémantique
tout en gardant les portions utiles à sa réécriture. Prévoir des composés
connus courts plutôt que d'abaisser globalement la longueur minimale.

Une segmentation ambiguë doit pouvoir rester non résolue. La reconstruction
sans règle de renommage doit conserver le nom d'origine, hors changement
d'écriture explicitement demandé.

### 4.5. Rendre la collecte comparable et traçable à l'occurrence

**Cible :** N1.2, N1.3 et `noms.json`.

Le format `{ nom, type, couche }` suffit à une liste de noms. Il manque des
informations pour prouver une équivalence sémantique. Les extractions
consultées présentent plusieurs limites :

- le type peut être lu, déduit de la valeur ou déduit du nom, sans distinction
  dans la sortie ;
- les noms sont dédupliqués par système, avec perte de leur provenance
  individuelle et de leurs contextes multiples ;
- les clés du thème MUI sont traitées à côté de tokens CSS et DTCG ; elles
  comprennent aussi des réglages tels que `breakpoints.unit` ;
- l'extraction d'UCM lit les neuf `REGISTRES` de `vocabulaire.ts`, mais ne
  joint pas `REGISTRES_ARCHITECTURE`, pourtant employés par le moteur ;
- C1 dépend d'un dépôt voisin et les registres du kit compilé. Leur
  empreinte et leur révision ne figurent pas dans les sorties UCM.

Les SHA-256 vérifiés prouvent la conformité des fichiers locaux au manifeste.
Ils ne prouvent ni la couverture de l'extraction ni le classement des noms.

**Action :** garder une table d'occurrences avec source précise, chemin
d'origine, contexte et origine du type et de la couche. Les listes de noms
peuvent rester des vues dédupliquées. Enregistrer aussi les empreintes des
entrées UCM, la version de l'extracteur et la révision du kit réellement lue.
Pour MUI, documenter ce qui constitue un token comparable et ce qui reste un
réglage de thème. Une éventuelle régénération doit figer ses dépendances.

Vérifier les extracteurs sur des extraits connus de chaque forme de source :
alias CSS, type DTCG hérité, thème, nom composé et occurrence répétée. Toute
variation de compte doit être explicable avant une nouvelle analyse.

### 4.6. Employer la majorité comme indication descriptive

**Cible :** seuil de 70 %, cinq systèmes et trois systèmes par alternative.

Un accord de quatre systèmes sur cinq dépasse 70 %. Un changement de
classement ou l'ajout d'une source peut déplacer ce résultat. La précision
du pourcentage ne fournit pas une preuve de synonymie.

Le dénominateur « systèmes qui ont le concept » reste à définir. Un concept
absent d'un extrait n'est pas nécessairement absent du design system. Un
système peut aussi employer plusieurs formes selon ses rôles. Les systèmes
qui partagent des conventions peuvent enfin peser plusieurs fois dans le
vote ; leur indépendance demande un examen si le résultat en dépend.

**Action :** pour chaque concept, distinguer occurrence attestée, absence
vérifiée dans un périmètre couvert et couverture inconnue. Compter au plus
une contribution par système et par forme pertinente, en gardant les usages
multiples visibles. Comparer les résultats sur les seules sources de
classification certaine et sur l'ensemble annoté. Signaler les conclusions
qui changent selon ce choix.

Présenter les comptes comme des usages observés. Une recommandation doit
aussi considérer le sens, les conventions UCM et le coût de migration.
Conserver un terme UCM compatible avec une tendance du corpus peut rester
une décision de continuité. Cette décision ne valide pas le remplacement
automatique de toutes ses formes voisines.

### 4.7. Définir les preuves du rapprochement structurel

**Cible :** N0.1 et N0.5.

L'expression « branches de même structure » laisse ouverts le taux de
recouvrement requis, les profondeurs différentes, les branches incomplètes,
les égalités entre candidats et les écarts entre collections.

Le code en cours fixe notamment un recouvrement de 80 %, exige des
sous-chemins identiques et limite certains groupes à 12 branches ou
200 entrées. Il élimine aussi des rapprochements entre un terme connu et
un terme inconnu : le test `hover/survol` attend leur exclusion. Ce choix
peut contredire l'objectif de retrouver des écarts français–anglais sans
dictionnaire. Ces seuils et abstentions ne sont pas décrits dans le plan.

**Action :** préciser la preuve attendue : branches comparées, sous-chemins
communs, sous-chemins divergents, nombre d'appariements et alternatives
ambiguës. Conserver le motif d'abstention. Une limite de calcul doit compter
les groupes non examinés ; le résultat ne doit pas les confondre avec des
groupes sans incohérence.

Tester au minimum : deux noms opaques, un nom connu face à une traduction
inconnue, un écart unique, une branche incomplète, une profondeur différente,
des collections distinctes, un ex aequo et un alias entre couches. Ces cas
servent à choisir les seuils. Ils ne justifient pas tous un rapprochement.

Le modèle `NomLu` ne porte que l'alias du premier mode. L'adaptateur DTCG de
mesure ne relève qu'un alias direct de `$value`. Le rapport doit exposer ces
bornes. Les thèmes encodés dans les chemins et les modes natifs Figma ne
constituent pas les mêmes données d'entrée.

## 5. Mesures, confidentialité et décisions

### 5.1. Donner aux mesures un état d'entrée reproductible

Le script de mesure importe le kit compilé, enregistre `HEAD` et l'empreinte
du fichier de tokens. Des sources modifiées ou un build périmé peuvent donc
produire un résultat que ces deux références ne suffisent pas à reproduire.
Le résultat C1 conservé dans le dossier de mesures contient encore l'ancien
indice `meme-place`. Il ne mesure pas le détecteur en cours.

**Action :** relever la révision et l'état des sources effectivement
exécutées, les empreintes du moteur et de ses données, les options de calcul
et les limites de l'adaptateur. Passer explicitement les seuils à la mesure
plutôt que d'imprimer une constante indépendante des options utilisées.
Employer un chemin local explicite pour C2 ; son raccourci actuel vise encore
l'ancien emplacement du fichier client.

Ajouter aux mesures de pertinence le temps total, la mémoire et la durée
maximale entre deux interruptions du générateur. Les branches répétées et
les noms profonds doivent rejoindre les jeux de performance. Le budget
existant de 32 000 noms en moins d'une seconde sous Node reste à éprouver
avec le nouveau détecteur. La session vise des tranches de huit millisecondes ;
une médiane totale ne vérifie pas cette contrainte.

### 5.2. Contrôler les sorties privées avant leur diffusion

Le rangement dans `_local/` protège les fichiers correspondants contre un
ajout ordinaire à Git. Il ne couvre pas une redirection de sortie standard,
un rapport copié ailleurs, une capture ou les données d'une page publiée.
Un contrôle par segments distinctifs peut repérer une fuite ; il ne prouve
pas l'absence de toute dérivation de C2.

Le garde-fou N1.5 saute lorsque C2 manque. Son résultat doit alors être
« non vérifié ». Une CI publique peut vérifier des chemins et des formes de
sortie autorisés sans détenir le fichier client. Le contrôle de contenu privé
reste local. Il doit couvrir les sorties ajoutées ou préparées pour diffusion,
y compris celles qui ne sont pas encore suivies par Git.

**Action :** distinguer explicitement les artefacts publics et privés.
Produire les résultats détaillés de C2 dans `_local/` par défaut. Employer
des exemples synthétiques indépendants dans les tests et les documents.
Éviter d'ouvrir C2 sur un service externe pour la seule commodité de la
collecte de réponses. Si une page privée est retenue, préciser son contrôle
d'accès et les données qu'elle reçoit avant d'y transférer ces exemples.

### 5.3. Faire des réponses un artefact indépendant de la page

N3 engage une page publiée, sa base et la conservation des réponses sans
définir leur format ni leur restitution. La section de méthode arrive aussi
après la collecte et l'analyse qu'elle est censée valider.

**Action :** adopter la méthode avant de finaliser les annotations. Définir
un fichier de décisions versionné, indépendant du support de consultation.
Chaque décision conserve :

- un identifiant stable de concept ou de question ;
- les versions des données et de la question examinées ;
- le choix, sa portée et la raison utile à l'implémentation ;
- les formes concernées, les exceptions et l'effet simulé ;
- un état : à examiner, adopté, distinct, différé ou remplacé par une autre
  décision.

Une modification des preuves doit permettre de repérer les décisions à
réexaminer. La page peut devenir une vue de cet artefact. Une première
consultation locale peut suffire si les questions sont peu nombreuses.

Le plafond de vingt-cinq reste un plafond d'affichage. Garder la liste
complète des décisions candidates et la raison de leur classement. L'effet
dans UCM, le risque de perte de sens, les dépendances entre décisions et le
nombre de variables touchées doivent guider la priorité. Un gros groupe C2
ne doit pas imposer une convention générale peu utile à UCM.

Pour chaque question, autoriser une équivalence limitée à un contexte et
une conservation de la distinction. Si plusieurs réponses dépendent d'une
même décision de grammaire ou d'échelle, présenter cette décision d'abord.

### 5.4. Prévoir l'intégration et la migration avant de demander les choix

N4 et N5 sont hors de la passe alors qu'ils sont nécessaires pour éprouver
l'effet des décisions. Le plan doit distinguer deux fins : un dossier prêt
à être arbitré et un moteur livré avec les décisions adoptées. La première
peut être l'objectif de cette passe. Elle ne démontre pas la seconde.

Le type [Terme](../../../../../packages/kit/src/referentiel/termes.ts) ne
prévoit pas de champ de source. N4 annonce pourtant des décisions « avec
leurs sources ». Choisir où rattacher ces preuves sans recopier un second
référentiel de termes dans les outils de recherche. Les définitions actives
restent dans `packages/kit/src/referentiel/`.

Un renommage conserve l'identifiant Figma, mais change le chemin publié du
token. La [politique de compatibilité](../../../../format/COMPATIBILITE.md)
classe ce cas séparément d'un changement de schéma. L'impact peut atteindre
les références des contrats, le CSS généré et le code consommateur.

**Action :** joindre à chaque changement de terme canonique un relevé des
consommateurs concernés et une simulation avant/après. Reprendre les
obligations du dépôt sur la version du kit, les vues générées et les
vérifications. Une évolution de vocabulaire ne justifie pas, à elle seule,
un nouveau numéro de format du contrat. Si le modèle des règles ou leur
portée change, traiter aussi la lecture des réponses déjà enregistrées,
leurs identifiants stables, leur annulation et leur import/export.

La recette finale sur copie Figma doit couvrir les effets des réponses,
la protection des variables Palettes, les collisions, l'annulation et un
export des tokens après renommage. La préservation des liaisons Figma et la
résolution des références publiées demandent deux vérifications distinctes.

## 6. Ordre d'action recommandé

Les lots ci-dessous réorganisent les travaux N0 à N6. Ils évitent de refaire
les éléments de N1 déjà présents : dossier de référence, manifeste,
extracteurs, données et renvois documentaires. Leur présence doit être
reconnue dans le suivi ; leur conformité se juge par leurs critères de fin.

| Lot | Travail et responsable | Dépend de | Preuve de fin |
|---|---|---|---|
| A0 | Le mainteneur fixe les deux objectifs : qualité de détection et décisions de nomenclature. Il adopte les catégories de jugement et le périmètre des sorties privées. | Cette revue | Une fiche de cadrage courte précise les résultats attendus et les décisions encore ouvertes. |
| A1 | Le mainteneur annote un jeu de référence ; le contributeur prépare les entrées synthétiques et les adaptateurs de mesure. | A0 | Cas positifs, distinctions voulues et cas indéterminés ; partie de validation tenue à l'écart ; mesure initiale reproductible. |
| A2 | Le contributeur corrige le lien entre occurrences, questions, réponses et renommages. Il empêche la fusion des oppositions non justifiées. | A1 | Reproductions de la section 3 corrigées ; tests de session et d'annulation ; recalcul partiel égal au complet. |
| A3 | Le contributeur reprend les branches parallèles et leur score de confiance, avec raisons d'abstention. | A2 | Résultats sur le jeu de validation, paires C2 examinées localement, contre-exemples préservés et budgets de calcul vérifiés. |
| A4 | Le contributeur audite les extractions existantes et ajoute la provenance et la matrice de couverture. | A0 ; travail indépendant d'A2–A3 | Noms reliés aux sources ; couches inconnues visibles ; registres UCM couverts ; cas connus de chaque extracteur vérifiés. |
| A5 | Le mainteneur et le contributeur annotent les concepts utiles, leurs rôles et les formes du corpus. Ils calculent ensuite les usages observés. | A4 ; exemples d'A1 | Comparaison par concept, dénominateurs explicites, exclusions documentées et résultats sensibles au classement signalés. |
| A6 | Le contributeur prépare les décisions et leur effet simulé. Le mainteneur arbitre une première sélection. | A3 et A5 | Questions indépendantes du support, réponses exportables et portée de chaque remplacement connue. |
| A7 | Le contributeur intègre les décisions adoptées au kit et vérifie leurs consommateurs. | A6 | Tests, versions et vues conformes ; aucune définition active dupliquée ; impact des chemins publiés traité. |
| A8 | Le mainteneur réalise la recette Figma sur une copie et juge Q1. | A7 | Effets observés conformes aux simulations, retour arrière vérifié et bilan des écarts restants. |

A4 peut avancer pendant la correction du moteur. A5 n'exige pas la
classification de tous les mots du corpus : commencer par les concepts qui
conditionnent les décisions UCM. Étendre à un système supplémentaire seulement
si une cellule de couverture manque ou si une décision reste sensible à un
usage insuffisamment documenté.

La page publiée de N3 devient un choix de consultation après A5. Sa construction
ne doit pas retarder le jugement du moteur ni déterminer le format des réponses.

## 7. Matrice minimale de recette

Les exemples suivants sont des cas synthétiques ou des formes déjà publiques.
Ils définissent les comportements à juger avant de fixer les seuils.

| Famille | Cas à exercer | Résultat attendu |
|---|---|---|
| Opposition | `selected/unselected`, `active/inactive` | Distinction conservée sans fusion fondée sur la seule morphologie. |
| Forme adoptée | `hovered/hover`, `press/pressed` | Application de la règle du registre avec effet visible. |
| Faute dans un bloc | `textsucccess` face à `success` | Réponse applicable au nom, puis annulation exacte ; aucune disparition sans effet. |
| Mot composé | `LineHeight`, `line-height`, `lineheight` | Même concept reconnu, écriture finale soumise à la convention choisie. |
| Nom propre | `ScaleWrap` | Aucun rapprochement fondé sur son seul découpage en mots plausibles. |
| Composition courte | `onSurface`, `URLBase`, `H1`, `2xl` | Résultat lexical et rôle attendus explicités ; identité et échelle préservées. |
| Synonymie locale | Même mot dans deux rôles différents | Aucun remplacement global déduit d'une seule branche. |
| Branches | Traduction inconnue face à un mot connu | Candidat ou abstention expliquée, sans exclusion dictée seulement par le dictionnaire. |
| Correspondance ambiguë | Trois partenaires possibles, même support | Aucune fusion arbitraire ; ambiguïté comptée. |
| Alias | Alias sémantique vers primitive, deux usages vers une cible commune | Noms distincts conservés quand les couches ou les rôles diffèrent. |
| Portée | Branche incomplète, collections différentes, modes natifs | Limites exposées ; aucun résultat présenté comme couvrant une entrée non lue. |
| Réponse persistée | Répondre, recalculer, importer, annuler | Décision retrouvée, application identique et état initial restaurable. |
| Conflit | Remplacement vers un nom existant ou une variable protégée | Refus ou exclusion conformément aux invariants d'Architect. |
| Calcul | 32 000 noms, branches répétées, noms profonds | Durée, mémoire, interruptions et groupes écartés mesurés. |
| Recherche | Source sans couche, type déduit du nom, occurrence répétée | Provenance conservée ; contribution au concept justifiée ou inconnue. |

## 8. Changements à reporter dans le plan source

- Remplacer « tranché sans question » par une séparation entre règle déjà
  adoptée, recommandation de continuité et nouvelle équivalence à examiner.
- Retirer la négation des preuves suffisantes à une fusion.
- Ajouter à N0 le contrat commun des occurrences et le test d'une réponse
  jusqu'au renommage, avec annulation.
- Définir le rôle des segments comme unité de comparaison ; conserver la
  couche du token comme contexte.
- Faire précéder les seuils du corpus d'une matrice de couverture et d'une
  annotation traçable des concepts.
- Remplacer l'objectif de trois cents mots par la couverture des décisions
  UCM nécessaires ; garder l'inventaire complet des non-classés.
- Compléter la précision en tête de liste par les cas obligatoires, les
  erreurs de recommandation et les cas manqués.
- Définir les preuves, ambiguïtés et limites des branches parallèles, puis
  mesurer leurs coûts sur des structures répétitives.
- Définir les décisions dans un artefact versionné avant de choisir le
  support de consultation.
- Faire adopter la méthode avant la collecte finale des réponses.
- Donner un critère de fin au dossier d'arbitrage et un autre à la livraison
  du moteur, incluant intégration, compatibilité et recette Figma.
- Mettre le suivi N1 en accord avec les fichiers déjà présents, sans confondre
  leur existence et leur validation.
