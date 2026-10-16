# Revue conceptuelle et fonctionnelle de l'architecture globale UCM

**Statut :** avis de revue. Les orientations recommandées ici restent à
arbitrer. Ce document ne modifie aucune décision du projet.

Lecteur : le mainteneur et les responsables design et développement, pour
choisir la direction du produit avant de préciser sa réalisation.

La revue porte sur la proposition, les pistes, le plan de recherche, les
résultats du sous-dossier `Recherches` et la présentation HTML. Elle prend
[CONCEPT.md](../../../../CONCEPT.md) comme point de comparaison et relit
l'[architecture multimarque](../Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html)
pour situer les règles proposées. Les mesures sont celles rapportées dans le
dossier. Les scripts, les détails d'API et les affirmations sur le marché ne
font pas l'objet d'une nouvelle vérification.

## 1. Avis d'ensemble

**La direction mérite d'être poursuivie, mais le découpage en produits est
plus avancé que la définition du travail collectif qu'il doit servir.** Le
dossier explique où ranger une règle et quel plugin écrit une donnée. Il
décrit moins précisément comment une équipe accepte un changement, le
transmet aux consommateurs et traite une divergence après publication.

La proposition apporte trois réponses utiles à des difficultés documentées :
réunir les définitions dispersées, distinguer les contrôles généraux des
conventions UCM, et fournir un lieu pour préparer l'architecture des tokens.
Ces réponses prolongent le principe d'un contrat partagé entre design et code.

Le risque principal est un déplacement de la promesse produit. UCM part du
besoin de rendre les décisions visuelles exploitables et leurs divergences
visibles. La recherche consacre désormais une grande part de son effort au
classement des tokens et à leur nomenclature. Une équipe pourrait obtenir un
fichier mieux nommé sans mieux comprendre ce qui est disponible dans le code.

Je recommande de présenter UCM comme **une méthode outillée pour convenir des
décisions visuelles, les publier et suivre leur mise en œuvre**, avec une
architecture de tokens recommandée. La conformité à cette architecture doit
rester un choix explicite. Sa valeur se mesure au travail évité et aux erreurs
d'usage prévenues.

Les priorités de la revue sont les suivantes.

| Priorité | Sujet | Risque pour l'équipe | Orientation recommandée |
|---|---|---|---|
| Avant de figer l'architecture | Promesse produit et public prioritaire | Construire un outil de normalisation sans prouver son utilité dans le travail quotidien | Choisir un premier parcours jusqu'à l'usage dans le code |
| Avant de figer l'architecture | Autorité et publication | Confondre une modification Figma avec une décision acceptée par les consommateurs | Distinguer travail, proposition, acceptation et adoption |
| Avant le bilan | Sens des constats | Faire corriger des différences intentionnelles ou afficher une confiance excessive | Séparer observation, écart à une règle adoptée et hypothèse |
| Avant toute génération ou migration | Responsabilité d'écriture | Renommer ou régénérer une donnée entretenue par un autre outil | Définir le périmètre possédé et le traitement des modifications manuelles |
| À éprouver par l'usage | Quatrième plugin | Ajouter des changements d'outil et des réglages à entretenir | Valider le rôle d'architecture, puis son installation séparée |
| À éprouver par l'usage | Nomenclature et couche de composants | Imposer plus de déclarations que le temps économisé | Mesurer le coût de maintenance sur un composant réel |

## 2. Les choix à conserver

### 2.1 Une source par responsabilité

La séparation entre décisions visuelles, comportement applicatif et contrôle
des relations reste le meilleur principe du projet. Elle donne au designer
une responsabilité identifiable sans lui demander de décrire le comportement
du code. Elle donne au développeur une base de travail publiée et relisible.

La distinction entre contrat normatif et échantillon indicatif doit également
rester visible dans la future architecture. Un exemple de maquette aide à
comprendre une intention ; il ne suffit pas à définir toutes les obligations
d'un composant.

### 2.2 Un référentiel commun

L'[inventaire du référentiel](./Recherches/R2-REFERENTIEL.md) établit une
dispersion réelle des termes et de leurs définitions. Les réunir réduit le
risque qu'un designer reçoive des recommandations différentes selon l'outil.
Le besoin existe indépendamment du choix d'un quatrième plugin.

Une même définition peut servir au contrôle, à la documentation et à l'aide
contextuelle. Ce partage doit porter sur le sens. Le texte présenté à un
designer débutant pourra demander un exemple que le contrôle n'emploie pas.

### 2.3 Une distinction entre outils généraux et profil UCM

La proposition conserve l'export et l'exploration sur des structures
existantes. Cette ouverture facilite l'adoption : une équipe peut tirer un
bénéfice d'UCM avant de modifier ses conventions.

Le profil recommandé peut être plus prescriptif. Un générateur a besoin de
choix définis pour produire un résultat prévisible. Le point à préciser est
ce qu'une équipe obtient avec chaque degré d'adoption.

### 2.4 Des mesures qui limitent la promesse automatique

Les [résultats de nomenclature](./Recherches/R3-NOMENCLATURE.md) montrent que
les ressemblances de valeurs ou de noms produisent beaucoup de rapprochements
inutiles. Le dossier reconnaît cette limite et conserve le jugement humain.
C'est un résultat de recherche à préserver dans le discours produit.

L'étude distingue aussi le système neuf du système existant. Cette distinction
doit organiser la suite des essais, car leurs besoins de correction et de
compatibilité diffèrent.

## 3. Préciser la promesse et la place du profil UCM

### 3.1 Une architecture globale encore centrée sur les tokens

Dans la [proposition](./ARCHITECTURE-GLOBALE-UCM.md), les couches de tokens,
leurs noms et leur déclaration structurent presque toutes les responsabilités
nouvelles. Les règles de construction des composants et l'usage par les agents
arrivent plus tard dans le plan de recherche.

Cette priorité peut convenir à un chantier de tokens. Elle ne suffit pas à
conclure sur l'architecture globale d'UCM. Le composant publié reste l'objet
qui relie une décision visuelle à une implémentation. Il devrait servir dès le
début à éprouver le référentiel et les contrôles proposés.

Exemple : une équipe ajoute un bouton de suppression. UCM doit l'aider à
choisir les tokens pertinents, à déclarer ses variantes et à comprendre ce que
le développeur doit adapter. L'uniformité des mots `error` et `danger` ne
répond qu'à une partie de ce travail.

**Orientation :** évaluer chaque fonction nouvelle par sa contribution à une
décision de l'équipe. Pour la nomenclature, la question utile est le nombre
d'ambiguïtés d'usage évitées. Pour la génération de `theme`, c'est le travail
de liaison et de vérification économisé.

### 3.2 Recommander une méthode tout en permettant une adoption partielle

Les quatre options des [pistes de réflexion](./PISTES-DE-REFLEXION.md),
section 12, mêlent deux choix : le degré d'opinion de la méthode et la capacité
des outils à lire d'autres structures. Ces choix peuvent être séparés.

Je recommande une méthode UCM explicite, accompagnée d'outils utilisables
séparément. L'offre pourrait se comprendre par les engagements suivants.

| Adoption | Ce que l'équipe obtient | Ce qu'elle doit fournir |
|---|---|---|
| Exploration et publication | Lecture des relations existantes, contrats et tokens publiables dans le périmètre pris en charge | Les sources design et leur association au dépôt |
| Conventions déclarées | Écarts aux conventions choisies et vocabulaire partagé | Une déclaration limitée aux parties qu'elle veut contrôler |
| Architecture UCM adoptée | Contrôles du profil et génération des parties déterminées par ses règles | Les choix de palettes, de rôles et de contextes nécessaires |

Ces degrés ne devraient pas devenir des étapes obligatoires. Une équipe peut
publier des contrats sans employer Palettes. Une autre peut adopter le profil
pour une bibliothèque neuve et conserver ses bibliothèques existantes.

La construction paramétrée de toute architecture serait une ambition bien
plus large. Déplacer une destination ou choisir un nom de collection ne
démontre pas la capacité à générer des règles de thème différentes. Il faut
borner cette promesse avant de présenter l'Architecte comme universel.

### 3.3 Choisir un premier public

Le dossier vise à la fois le mainteneur expert, le designer qui rejoint une
équipe, le développeur consommateur et l'agent. Leurs besoins ne sont pas
interchangeables.

Le premier public recommandé est l'équipe qui entretient déjà une bibliothèque
Figma et son code. Elle connaît le coût des écarts et peut juger si UCM le
réduit. Le parcours d'essai devrait porter sur un composant en évolution dans
cette bibliothèque, sans exiger une remise en ordre générale.

Le système neuf reste un second essai utile pour la génération. Il ne permet
pas, à lui seul, d'éprouver la migration ou la coexistence de conventions.

## 4. Revoir la notion de propriétaire

### 4.1 Une collection est un périmètre trop large pour attribuer l'écriture

Le principe « un écrivain par collection » simplifie la carte des produits.
Il devient difficile à tenir sur les structures décrites dans le dossier.
La collection `primitives` de l'architecture multimarque contient des couleurs,
mais aussi des espacements, des durées et de la typographie. Palettes ne
produit qu'une partie de ces données.

Le renommage crée une seconde difficulté. Une nomenclature globale pourrait
concerner des primitives entretenues par Palettes, alors que l'Architecte est
censé écrire seulement au-dessus de celles-ci. Une correction manuelle par le
designer doit aussi rester possible.

**Orientation :** attribuer la responsabilité à un ensemble de données et à
une opération. Palettes entretient les valeurs de ses palettes. L'Architecte
entretient les liaisons qu'il a générées et la déclaration. Une migration de
noms constitue un geste distinct, avec ses conséquences sur tous les usages.

Le principe utile devient l'absence de remplacement implicite du travail d'un
autre producteur. Il exige de préciser ce qui se passe après une modification
manuelle : la conserver, proposer une remise en conformité ou retirer la
donnée du périmètre généré. Le designer doit comprendre cette conséquence
avant une régénération.

### 4.2 Séparer responsabilité humaine et rôle de l'outil

La table des propriétaires de la proposition distingue déjà décision,
rangement, publication et contrôle. Elle doit aller plus loin sur la décision
collective. Ranger une nomenclature dans Figma désigne son lieu d'édition ;
cela n'établit pas que chaque designer peut modifier seul une convention
consommée par plusieurs équipes.

Une répartition proposée pour l'équipe serait la suivante.

| Décision | Responsable proposé | Accord nécessaire |
|---|---|---|
| Ajuster une intention visuelle | Responsable design du composant | Relecture des conséquences sur les usages concernés |
| Changer une convention de nommage publiée | Responsables design et développement du design system | Choix du terme et conditions de migration |
| Accepter une exception au profil | Responsable du design system | Motif, périmètre et conséquences sur les garanties |
| Adopter une nouvelle version dans une application | Responsable du dépôt consommateur | Adaptation de l'implémentation et vérifications de ce dépôt |

Une même personne peut cumuler ces rôles dans une petite équipe. Le produit
doit distinguer leurs décisions sans imposer une procédure d'approbation pour
chaque modification locale.

### 4.3 Le référentiel doit distinguer le sens, la convention et l'aide

Le référentiel proposé réunit vocabulaire, grammaires, garanties et conseils
d'implémentation. Ces contenus n'ont pas la même autorité.

Le sens d'un état interprété par UCM relève d'une règle du modèle. Le choix
entre un nom long et son abréviation relève d'une convention d'équipe. Un
exemple d'emploi relève de l'aide. Une déclaration locale doit pouvoir adapter
la convention sans modifier silencieusement le sens d'une règle.

Par exemple, une équipe peut préférer `pressed` à `press`. Elle ne peut pas
faire de l'état sélectionné et de l'appui deux états équivalents par un simple
remplacement de mots. Les limites d'une personnalisation doivent être connues
avant de proposer que la déclaration « étende ou remplace » le défaut.

Enfin, partager le référentiel ne suffit pas à obtenir le même jugement dans
tous les outils. Une équipe peut utiliser des versions différentes des plugins
et du kit. Le profil adopté doit rester identifiable, et son évolution doit
être présentée comme un changement de règles à examiner.

## 5. Définir le cycle d'un changement entre Figma et le code

### 5.1 Le lieu d'édition ne désigne pas la version acceptée

La [recherche sur la déclaration](./Recherches/R4-R6-DECLARATION-ET-BILAN.md)
recommande un original de travail dans Figma, publié avec les tokens. Ce choix
est cohérent avec le pilotage par le designer. Il laisse ouverte une question
fonctionnelle : quelle décision s'applique pendant une demande de fusion ?

Supposons qu'un designer remplace `press` par `pressed`. Le fichier Figma
porte déjà les nouveaux noms. Le dépôt utilise encore les anciens, et le
développeur refuse la publication tant que les usages ne sont pas migrés. Les
deux états ont alors une fonction légitime. Le produit doit indiquer lequel
correspond au travail en cours et lequel est accepté par le consommateur.

Le dossier prévoit la demande de fusion comme lieu d'accord. Il doit aussi
décrire le retour d'un désaccord : le designer corrige-t-il sa proposition,
diffère-t-il la migration, ou conserve-t-il un changement en préparation ?
Sans cette boucle, la revue arrive après l'application du changement à la
source, avec peu d'aide pour le reprendre.

**Orientation :** distinguer quatre situations dans le parcours, quelle que
soit leur représentation future : travail dans Figma, changement proposé,
version acceptée dans un dépôt, version adoptée par une application. Une
publication Figma et une adoption dans le code peuvent avancer séparément.

### 5.2 La cohérence de publication dépasse un fichier

Publier déclaration et tokens ensemble évite un décalage entre ces deux
éléments. Cela ne résout pas le décalage avec les contrats qui citent les tokens,
ni avec leurs implémentations.

Lors d'un renommage, le designer a besoin de comprendre quelles publications
doivent être coordonnées. Le développeur doit pouvoir distinguer un retrait
volontaire d'un nom encore nécessaire. Une table de renommage explique la
correspondance ; elle ne décide pas quand l'ancien nom peut disparaître.

Le modèle produit doit donc définir un changement cohérent du point de vue
du consommateur, même si sa publication se fait en plusieurs gestes. La
contrainte actuelle d'un fichier par export ne devrait pas déterminer à elle
seule cette unité de travail.

Avec plusieurs dépôts consommateurs, une publication unique peut être adoptée
à des moments différents. UCM peut limiter son premier périmètre à un dépôt,
mais cette limite doit être annoncée. Un état global « publié » ne suffit pas
à décrire plusieurs adoptions.

### 5.3 Le fichier de bibliothèque ne représente pas toute l'équipe

Les [essais sur les données partagées](./Recherches/R4-R8-R11-R13-QUESTIONS-COURTES.md)
constatent que la recette suit une duplication du fichier, mais ne se lit pas
depuis un fichier consommateur de la bibliothèque. La donnée placée sur une
collection reste un cas non essayé dans le dossier.

La déclaration proposée au niveau du fichier favorise donc le travail dans la
bibliothèque source. Le designer qui utilise ses composants dans une maquette
n'a pas nécessairement accès aux mêmes explications ni au même bilan.

Deux questions de produit en découlent. L'Architecte sert-il d'abord au
mainteneur de la bibliothèque ? Si oui, comment un designer consommateur
retrouve-t-il les conventions applicables sans reconstituer la déclaration ?
L'accès à un dépôt constitue une option, mais son usage par ce designer reste
à éprouver.

Une duplication soulève une autre décision : la copie continue-t-elle à suivre
les conventions de la bibliothèque, ou devient-elle un système autonome ? La
présence des données dans les deux fichiers ne tranche pas cette relation.

**Orientation :** borner le premier bilan au fichier de bibliothèque analysé.
Prévoir une consultation des conventions pour les consommateurs comme besoin
distinct. La promesse d'un bilan de tout le design system demande une recherche
supplémentaire sur les bibliothèques réparties entre plusieurs fichiers.

## 6. Valider le rôle d'architecture avant le quatrième plugin

### 6.1 Le besoin fonctionnel est mieux établi que son installation séparée

Le dossier identifie un travail aujourd'hui manuel : déclarer des conventions,
construire les liaisons au-dessus des primitives et entretenir ces liaisons.
Un rôle d'architecture est justifié par ce travail.

L'argument en faveur d'un plugin séparé repose en partie sur les limites des
produits existants. L'explorateur est en lecture seule et l'exporteur reste
centré sur la publication. Ces limites expliquent le choix proposé, mais ne
prouvent pas que quatre installations simplifient le travail du designer.

Les [relevés de découpage](./Recherches/R1-R9-RELEVES-LOCAUX.md) n'incluent
pas encore l'observation du parcours. Le poids des produits ne mesure ni le
temps perdu à changer d'outil ni la difficulté à retrouver un constat.

**Orientation :** conserver l'Architecte comme rôle proposé. Décider son
installation séparée après un essai comparant le traitement d'un même
changement avec plusieurs outils et dans un espace commun. Le découpage
interne des responsabilités peut rester identique dans les deux cas.

### 6.2 L'Architecte cumule déjà plusieurs métiers

Le périmètre proposé comprend la nomenclature, le bilan global, la génération
de `theme`, les renommages, les descriptions et des pistes sur les composants,
les icônes et la typographie. Le critère « au-dessus des primitives » ne suffit
pas à ordonner ces fonctions pour l'utilisateur.

Deux orientations restent plausibles : un outil de maintenance d'une
architecture existante, ou un outil de construction selon le profil UCM. Le
premier doit prouver la qualité de son diagnostic et le coût de la correction.
Le second doit prouver le temps gagné sur les liaisons et leur entretien.

Le dossier ne mesure pas encore assez ces deux bénéfices pour choisir. Je
recommande de les comparer sur le remappage du mainteneur, puis de retenir un
geste principal pour la première version. Les autres fonctions devront aider
ce geste avant d'élargir le périmètre.

### 6.3 Répartir les constats selon la décision en cours

Une règle peut être commune et son résultat visible dans plusieurs outils.
Ce partage est utile quand chaque affichage répond à une décision différente.

| Lieu | Question du designer | Résultat attendu |
|---|---|---|
| Palettes | L'ajustement de cette palette respecte-t-il ses garanties ? | Conséquences de l'ajustement et réglage concerné |
| Architecte | Quelle partie de la bibliothèque demande une intervention ? | Causes regroupées, périmètre et action proposée |
| Exporteur | Que va changer cette publication pour le dépôt ? | Écarts pertinents sur ce qui part et dépendances concernées |
| Explorateur | Pourquoi cette variable prend-elle cette valeur ? | Chaîne explicative et contexte des modes |
| Rapport du dépôt | Cette proposition est-elle exploitable ici ? | Résultats des contrôles applicables à la version proposée |

L'exporteur devrait ainsi présenter les constats utiles à la publication, y
compris ceux issus du profil adopté. Le designer peut en consulter le détail
dans l'outil spécialisé. Il ne devrait pas découvrir en CI un écart déjà
constatable sur les mêmes données avant l'envoi.

Le retrait de l'onglet Intégrations est une décision acquise dans le dossier.
Je recommande de conditionner le retrait de chaque fonction à un parcours de
remplacement utilisable. La reprise des conventions et exceptions déjà saisies
fait partie de cette continuité d'usage.

## 7. Limiter la normalisation à ce que l'équipe veut réellement unifier

### 7.1 Une différence de terme peut exprimer une différence utile

La recherche initiale rapproche `error` et `danger`, notamment à partir de
leurs cibles communes. Ce rapprochement mérite un examen, mais il ne suffit
pas à établir un concept unique. Une erreur de saisie et une action
destructive peuvent partager une couleur tout en demandant des usages
différents.

La même prudence vaut pour `text` et `foreground` : le second peut couvrir
plusieurs types de contenu. Un terme commun ne devient souhaitable qu'après
avoir défini le concept et son périmètre.

**Orientation :** partir des distinctions d'usage que l'équipe veut conserver.
Les noms et les valeurs servent à retrouver des cas à examiner. Une décision
de synonymie doit porter sur un contexte défini, et pouvoir être révisée.

La fréquence d'un terme dans les systèmes publics aide à choisir une forme
familière. Elle ne prouve ni son adéquation au produit ni l'intérêt de migrer
un vocabulaire déjà compris par l'équipe.

### 7.2 La grammaire doit accepter la diversité légitime des composants

Les mesures montrent qu'une profondeur identique ne désigne pas toujours le
même rôle. Elles justifient l'étude d'une grammaire déclarée. Elles ne
démontrent pas encore qu'une grammaire unique par collection suffit.

Un bouton interactif possède des états qu'une alerte statique n'a pas. Un
composant composé possède des parties internes. Une seule collection peut
donc contenir plusieurs formes de chemin justifiées par ces différences.

Une grammaire trop rigide conduirait à ajouter des segments artificiels ou à
multiplier les exceptions. Une grammaire très configurable pourrait demander
autant de travail que la documentation manuelle des noms.

**Orientation :** éprouver quelques familles de chemins avec des dimensions
facultatives. Le designer devrait pouvoir comprendre leurs exemples sans
devoir apprendre une notation abstraite. Le succès se mesure à la réduction
des ambiguïtés après déclaration, rapportée au temps nécessaire pour la tenir.

### 7.3 La boucle de jugement humain peut devenir le coût principal

Le dossier propose que le designer juge les paires candidates et mémorise les
refus. C'est préférable à un renommage automatique, mais la charge reste à
mesurer. Une longue liste de paires faibles peut rendre l'outil moins utile
qu'une convention écrite directement.

La boucle doit pouvoir traiter une famille d'écarts, différer une décision et
conserver une convention existante. Un refus de rapprochement n'est pas une
exception à une règle : c'est le rejet d'une hypothèse du détecteur. Ces deux
informations doivent rester distinctes.

Je donnerais la priorité au contrôle de conventions explicitement adoptées.
La découverte de synonymes deviendrait une aide facultative, justifiée par sa
précision mesurée après contextualisation.

## 8. Construire un bilan dont les conclusions sont compréhensibles

### 8.1 Une observation exacte ne constitue pas toujours un défaut

Le [catalogue du bilan](./Recherches/R4-R6-DECLARATION-ET-BILAN.md) qualifie
plusieurs relevés de justes. La présence du phénomène peut être certaine alors
que la nécessité de le corriger reste à établir.

| Observation | Ce qu'elle établit | Ce qu'elle ne permet pas de conclure seule |
|---|---|---|
| Plusieurs modes donnent la même valeur | La variable ne varie pas entre ces contextes observés | Que les modes sont inutiles pour la collection ou pour le système |
| Un nom contient `light` ou `dark` | Le contexte apparaît dans le chemin | Que le nom doit changer ; les primitives du profil multimarque distinguent elles-mêmes des jeux clair et sombre |
| Deux variables visent la même cible | Elles partagent cette dépendance | Qu'elles ont le même rôle ou doivent être fusionnées |
| Un mot change de profondeur | La forme des chemins varie | Qu'une partie de composant ou une dimension facultative est mal rangée |
| Deux marques partagent certaines valeurs | Ces valeurs sont communes dans le relevé | Qu'une marque a été copiée par erreur |

La qualification d'un défaut exige donc une règle adoptée ou un usage
incompatible établi. La description d'un fait peut rester utile sans demander
une correction.

### 8.2 Séparer gravité, certitude et décision de publication

Le dossier classe de nombreux résultats en information. Cette sévérité évite
de bloquer l'adoption, mais ne dit pas si le constat est certain, ni s'il
demande une action.

Le bilan devrait distinguer la certitude du résultat, sa conséquence et
l'obligation éventuelle de le traiter. Une suggestion de synonymie, un écart
certain à une convention et une référence inexploitable ne relèvent pas de la
même lecture, même s'ils apparaissent dans le même écran.

Les conventions facultatives peuvent rester non bloquantes conformément aux
contraintes du dossier. L'équipe a néanmoins besoin de suivre les écarts
qu'elle s'est engagée à corriger. Leur assignation ou leur revue peut relever
de son organisation sans devenir un blocage universel d'UCM.

### 8.3 Décrire la portée de chaque preuve

Une palette vérifiée selon sa recette ne prouve pas que les variables du
fichier correspondent encore à cette recette. Des variables conformes ne
prouvent pas que chaque composant les utilise correctement. Un contrat
exploitable ne prouve pas que l'application rend et fait fonctionner le
composant comme attendu.

Le bilan doit rendre ces limites visibles. Un résultat décrit les données
examinées, les contextes couverts et ce qui reste inconnu. Une partie non lue
ou modifiée depuis le relevé ne peut pas recevoir implicitement le même statut
qu'une partie vérifiée.

Le partage des règles entre Figma et le dépôt autorise un jugement comparable
sur les informations communes. Il ne garantit pas des rapports identiques :
les noms Figma, les données publiées et le code disponible diffèrent.

Cette borne concerne aussi la ligne « comportement et accessibilité » de la
table des propriétaires. Le développeur en a la responsabilité. Cette
attribution ne constitue pas une preuve apportée par l'adaptateur de parité.
La communication produit doit nommer les vérifications effectivement
réalisées avant d'annoncer une conformité.

### 8.4 Aider à traiter une cause

Un bilan de centaines de constats devrait présenter quelques interventions
compréhensibles : compléter une correspondance de marque, revoir une
convention de noms ou actualiser un relevé. Le nombre de variables touchées
sert à estimer la portée de chaque intervention.

L'équipe doit distinguer une dette connue d'un nouvel écart. Une exception
acceptée doit garder son motif et son périmètre. Un changement de convention
peut justifier sa relecture. Le dossier évoque déjà le regroupement par cause
et les exceptions ; ces mécanismes devraient faire partie du premier essai
du bilan.

## 9. Éprouver l'architecture sur le travail d'une équipe

Les scénarios suivants sont des propositions d'essai. Ils servent à juger le
découpage et les responsabilités, sans imposer encore une interface ou une
procédure de production.

### 9.1 Reprendre un système existant sans nettoyage préalable

Un designer et un développeur choisissent un composant déjà utilisé. Ils
déclarent seulement les conventions nécessaires pour le comprendre, examinent
quelques écarts et publient une modification utile.

Le parcours doit accepter des collections hors profil, des noms conservés et
des parties non déclarées. Le résultat attendu est un changement accepté dans
le dépôt avec une explication de ses conséquences.

**Critère de réussite :** l'équipe obtient ce résultat avant d'avoir classé
toute sa bibliothèque. Si elle doit régler la nomenclature de milliers de
tokens pour publier un composant, l'adoption partielle reste théorique.

### 9.2 Créer une petite bibliothèque selon UCM

Le designer choisit ses palettes, leur attribue des rôles et prépare un
composant dans deux thèmes. Les liaisons déterminées par le profil sont
générées. Le développeur implémente le contrat publié.

Le parcours permet de distinguer les décisions de design des tâches répétitives.
Le choix de la palette primaire appartient au designer. La pose des alias
correspondants peut être automatisée après ce choix.

**Critère de réussite :** un designer extérieur au projet peut expliquer ses
choix et retrouver le lieu d'une correction. Le nombre de questions initiales
et de changements d'outil se compare au travail manuel évité.

### 9.3 Modifier une palette après publication

Une palette déjà utilisée est ajustée. L'équipe doit distinguer les valeurs
modifiées, les garanties à réexaminer et les composants potentiellement
concernés. Elle prépare ensuite la publication vers le dépôt.

Cette modification peut conserver tous les noms et toutes les liaisons.
Elle éprouve donc un besoin que le contrôle de nomenclature ne couvre pas :
comprendre l'effet d'une évolution visuelle sur des usages existants.

**Critère de réussite :** le designer trouve la prochaine action pertinente
sans relancer tous les outils par précaution. Les usages non couverts par
l'analyse restent identifiables.

### 9.4 Renommer un terme publié avec un désaccord en revue

Le designer propose une convention, voit les usages concernés et prépare sa
publication. Le développeur diffère son adoption pour un consommateur. Le
designer doit pouvoir reprendre ou maintenir sa proposition sans perdre
l'état accepté.

L'essai inclut une exception légitime : deux termes semblables restent
distincts dans certains contextes. Il vérifie aussi la conservation des
liaisons entretenues par un générateur.

**Critère de réussite :** chaque participant peut identifier les noms
utilisables dans son périmètre et les tâches de migration restantes. La seule
réussite du renommage dans Figma ne valide pas ce parcours.

### 9.5 Ajouter une marque avec une exception

Le mainteneur ajoute une marque qui partage certains choix avec une marque
existante. Elle demande aussi une exception sur un composant en thème sombre.
Le bilan doit reconnaître les égalités volontaires et décrire ce que
l'exception change aux garanties applicables.

**Critère de réussite :** l'ajout n'exige pas de reprendre tous les composants.
L'équipe peut expliquer où se prend le choix de marque et où se vérifie son
effet. Cet essai justifie mieux les couches proposées qu'un simple décompte
des alias générés.

### 9.6 Accueillir un designer consommateur et un agent

Un nouveau designer utilise la bibliothèque depuis un autre fichier. Un agent
implémente un contrat depuis le dépôt, sans accès à Figma. Chacun doit pouvoir
retrouver le rôle d'un token, ses limites d'emploi et la convention applicable.

Le parcours compare une définition seule à une définition accompagnée d'un
exemple contextualisé. Il n'est pas nécessaire de transmettre toute la recette
de fabrication pour expliquer l'emploi d'une variable.

**Critère de réussite :** les participants choisissent correctement entre deux
tokens plausibles et savent reconnaître une information manquante. La présence
d'une description ou le nombre de pages générées ne suffisent pas à conclure.

## 10. Borner la génération et les extensions du périmètre

### 10.1 Générer `theme` peut apporter un gain, sous des préconditions explicites

L'architecture multimarque décrit `theme` comme une conséquence de choix pris
ailleurs. C'est un bon candidat à l'automatisation une fois le profil adopté,
les rôles attribués et les contextes définis.

La proposition doit distinguer la première génération de l'entretien.
L'entretien comprend l'ajout d'une marque, le changement d'une palette, les
modifications manuelles et le retrait d'un rôle encore utilisé. Le coût de ces
gestes peut dépasser celui de la première création.

Je recommande de juger la génération sur un cycle comprenant une création,
une modification manuelle et une régénération. Le designer doit pouvoir
prévoir ce qui sera conservé et ce qui sera remplacé. Les exceptions qui
sortent du modèle doivent rester expliquées après ce cycle.

### 10.2 Une variable par propriété est un choix d'architecture à justifier

La règle d'une variable de `components` par propriété permet de changer une
liaison sans modifier le composant Figma. Le dossier en donne une raison
concrète avec les réglages et exceptions de marque.

Son coût mérite la même attention : davantage de variables à nommer, de
liaisons à entretenir et d'éléments à comprendre. Une propriété stable peut
recevoir une indirection dont l'équipe ne tire aucun bénéfice observable.

Cette règle est écrite dans l'architecture multimarque ; la revue ne propose
pas de l'abolir par défaut. Elle recommande de l'éprouver avant d'en faire une
exigence générale du profil. Le test doit comparer une modification de marque
réelle au travail de préparation et d'entretien qu'elle demande.

La composition doit également conserver sa frontière : les tokens internes
d'une dépendance restent sous la responsabilité de cette dépendance. La
génération de tokens du parent ne doit pas conduire l'équipe à décrire une
seconde fois les décisions du composant enfant.

### 10.3 La typographie doit éprouver la généralité du modèle

La couleur fournit l'essentiel des exemples et des règles. Une architecture
globale doit aussi être compréhensible avec un style de texte et une mesure
d'espacement, même si leurs générateurs restent hors du premier périmètre.

Le rôle d'un texte ne se réduit pas à l'ordre des segments de son nom. Une
échelle peut varier selon son contexte d'emploi. Le dossier devrait donc
éprouver la distinction entre décision, convention et contrôle sur un exemple
typographique, avant de choisir une grammaire par imitation d'un autre système.

Un générateur d'échelle demande ensuite sa propre justification : un besoin
fréquent, des choix explicites et des résultats utiles à vérifier. La présence
d'un générateur de palettes ne suffit pas à établir ce besoin.

### 10.4 Les icônes demandent une responsabilité indépendante du fournisseur

Le projet utilise Font Awesome comme cas concret. La responsabilité générale
à définir est le lien entre l'icône choisie dans le design, son nom publié et
le rendu disponible dans le dépôt.

Une comparaison de listes peut établir qu'un nom existe. Elle ne prouve pas
que le glyphe ou son style correspond à l'intention visuelle. Le bilan doit
conserver cette limite.

Je recommande de garder le jeu d'icônes comme dépendance déclarée du design
system. Le fournisseur et les moyens de synchronisation peuvent rester
extérieurs à UCM. La construction d'une bibliothèque d'icônes complète
élargirait le produit au-delà du besoin de contrôle actuellement décrit.

### 10.5 Les descriptions doivent expliquer l'usage sans créer une seconde règle

Publier les descriptions existantes et transmettre le sens des tokens aux
agents répond à un manque identifié. La génération de descriptions pose
toutefois une question de maintenance : une description conservée après un
changement de rôle peut devenir trompeuse.

Le designer doit pouvoir distinguer une définition issue du référentiel d'une
précision propre à sa bibliothèque. Le partage de la donnée de référence
n'interdit pas des textes adaptés aux lecteurs. Il évite que chaque texte
reformule indépendamment une obligation.

Les nombres de la recette n'ont à rejoindre le consommateur que s'ils servent
une décision identifiée. Le rôle d'une variable et ses limites d'emploi sont
prioritaires pour l'implémentation. Le sens du thème devient nécessaire si une
explication ou un contrôle dépend effectivement de ce choix.

## 11. Réorganiser les recherches autour des décisions risquées

### 11.1 Les résultats documentaires ne ferment pas encore les sujets produit

Le [plan de recherche](./PLAN-DE-RECHERCHE.md) distingue sources, mesures et
observations. Cette structure est utile. En revanche, les mentions « Fait »
dans le suivi et la présentation peuvent être lues comme une validation des
solutions.

Le référentiel dispose d'un inventaire, mais sa compréhension par un nouveau
designer reste à observer. La nomenclature dispose de mesures, mais le gain
d'une grammaire déclarée reste à éprouver. La déclaration dispose d'un lieu
possible, mais le traitement d'un désaccord entre design et développement
reste à définir.

Il serait plus clair de distinguer une recherche documentée, une hypothèse
éprouvée en situation et une décision retenue. La fin d'une recherche dépend
de la décision qu'elle permet de prendre.

### 11.2 Inverser certaines priorités

L'ordre proposé commence par le référentiel et le moteur de nomenclature,
puis précise l'Architecte. Cet ordre est commode pour la construction. Il
risque de formaliser beaucoup de données avant de vérifier leur usage.

Je recommande l'ordre de décision suivant.

| Ordre | Recherche prioritaire | Preuve recherchée | Conséquence possible |
|---|---|---|---|
| 1 | Un changement réel de composant, depuis Figma jusqu'à son adoption | Les points de désaccord, les informations perdues et les reprises manuelles | Définir le cycle de publication et les rôles de l'équipe |
| 2 | Reprise limitée d'un existant et création selon le profil | Le temps de déclaration et le premier résultat utile | Choisir le public initial et la promesse d'adoption partielle |
| 3 | Bilan sur quelques causes connues, avec des différences volontaires | La compréhension des constats et les actions réellement utiles | Retirer les contrôles bruyants ou les reclasser en observations |
| 4 | Génération puis entretien de `theme` | Le travail évité, les choix restants et le traitement des modifications manuelles | Borner le geste principal de l'Architecte |
| 5 | Renommage avec publication différée ou refusée | La continuité des usages et la reprise d'une proposition | Fixer les conditions de migration avant d'automatiser le geste |
| 6 | Comparaison des découpages en produits sur ces parcours | Les erreurs d'orientation et les changements d'outil sans valeur | Choisir le quatrième plugin ou un autre regroupement |

La clarification des définitions déjà utilisées peut avancer pendant ces
essais. En revanche, un catalogue exhaustif, une nomenclature complète et un
générateur universel devraient attendre les résultats qui justifient leur
contenu.

### 11.3 Mesurer le travail de l'équipe

Les mesures actuelles comptent surtout les feuilles, les occurrences et les
candidats. Elles décrivent le corpus. Pour choisir un produit, il faut aussi
mesurer le travail demandé à ses utilisateurs.

Les prochains essais devraient relever :

- le temps jusqu'à un premier changement accepté dans le dépôt ;
- le temps de déclaration puis d'entretien des conventions ;
- la part des constats conduisant à une action jugée utile ;
- les erreurs connues non retrouvées par le bilan ;
- les changements d'outil et les informations ressaisies ;
- la capacité d'un nouvel arrivant à choisir le bon token et à expliquer son
  choix.

Un petit essai manuel peut suffire à invalider une organisation coûteuse.
L'observation d'une équipe pilote ne démontrera pas une utilité générale,
mais elle donnera une base plus pertinente qu'un seul inventaire de fonctions.

### 11.4 Réduire la charge de lecture du dossier

La proposition, son complément « 9 bis », les pistes, le suivi et la
présentation exposent parfois le même sujet avec des degrés de certitude
différents. Le mainteneur doit reconstituer lui-même la conclusion à retenir.

Je recommande de donner à chaque document un rôle stable :

| Document | Rôle conseillé |
|---|---|
| Proposition d'architecture | La cible actuellement recommandée, ses raisons et ses limites |
| Pistes de réflexion | Les alternatives encore crédibles et les conditions de leur choix |
| Plan de recherche | Les décisions à préparer, les essais et leurs critères d'arrêt |
| Résultats de recherche | Les observations et la portée exacte de leurs conclusions |
| Suivi | Les travaux restants et le prochain geste |
| Présentation HTML | Une lecture abrégée de la proposition, avec les mêmes statuts |

Les questions sur les mots, le bilinguisme ou le nom du plugin devraient
suivre les arbitrages sur le public, l'autorité et le parcours. Leur coexistence
dans une même liste donne actuellement une importance comparable à des choix
dont les conséquences diffèrent fortement.

## 12. Les arbitrages à prendre

La suite de la recherche gagnerait à produire une réponse explicite aux
arbitrages ci-dessous. La colonne de droite est l'avis de cette revue.

| Arbitrage | Recommandation |
|---|---|
| Quelle promesse centrale ? | Des décisions visuelles publiées, compréhensibles et suivies jusqu'à leur mise en œuvre ; la nomenclature y contribue |
| Quel premier public ? | Une équipe qui maintient une bibliothèque Figma et son code, avec un parcours limité à un changement réel |
| Quelle place pour UCM comme méthode ? | Une architecture recommandée et une adoption partielle explicitement prise en charge |
| Quel propriétaire pour une donnée ? | Un responsable humain et un périmètre d'entretien défini par opération ; revoir l'exclusivité par collection |
| Quelle version fait foi ? | Le travail Figma pour la préparation, la version acceptée pour chaque dépôt consommateur, avec un état de proposition identifiable |
| Quel premier périmètre du bilan ? | Le fichier de bibliothèque analysé, les règles adoptées et une couverture annoncée |
| Quel rôle pour l'Architecte ? | Préparer et entretenir les conventions et liaisons ; choisir son geste principal par un essai de travail réel |
| Quatre plugins ? | Hypothèse à conserver jusqu'à la comparaison des parcours |
| Quel premier investissement dans les noms ? | Contrôler les conventions adoptées ; garder la découverte de synonymes comme aide facultative |
| Quand automatiser les renommages ? | Après un essai de migration jusqu'au code, incluant un refus ou une adoption différée |
| Que reporter ? | La génération de toute architecture, les générateurs supplémentaires et l'extension du bilan à plusieurs fichiers sans preuve d'usage |

Le prochain livrable utile serait une proposition resserrée autour d'un
changement réel de composant. Elle préciserait les décisions de chaque rôle,
les états de publication et le résultat attendu pour le consommateur. Les
choix de référentiel, de bilan et de découpage pourraient alors être évalués
contre ce parcours commun.
