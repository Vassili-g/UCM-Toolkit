# Réduire le coût de lecture et de recalcul d'UCM Architect

**Statut :** recherche et proposition d'implémentation. Les mesures portent sur
le moteur actuel avec des données synthétiques. Le plugin n'a pas été modifié.

Lecteur : le mainteneur qui doit corriger les blocages pendant l'analyse et le
choix d'une convention. La revue couvre la v1 construite dans
[`packages/plugin-nomenclature`](../../../../packages/plugin-nomenclature/). La
[conception de la refonte](./3%20Refonte/CONCEPTION.md) reste une proposition
distincte ; ses détecteurs de synonymes ne sont pas présents dans ce code.

## 1. Solution proposée

Conserver l'inventaire dans le sandbox, calculer la détection une fois par
inventaire, puis ne transmettre que les comptes et les lignes demandées par
l'interface. Une modification de convention doit réutiliser les segments déjà
découpés. Le rendu doit porter sur une page de résultats ou sur les lignes
visibles. Les traitements longs doivent céder la main entre des lots bornés en
temps.

La priorité porte sur le calcul et le rendu. Le changement de convention ne
relit déjà pas Figma. Sur le jeu synthétique de 8 000 variables, la détection
répétée prend environ les deux tiers du temps de calcul. La construction de
toutes les lignes produirait 56 000 éléments HTML, hors en-têtes et textes.
Les [mesures](#4-mesures-reproductibles) précisent les conditions et les limites.

Pour la première analyse, rendre le bilan des variables avant de terminer les
pages des composants. Un périmètre limité aux variables peut supprimer ce
parcours, si ce choix de produit est retenu. Une analyse exhaustive des
composants doit toujours visiter les pages concernées.

Cette proposition vise une réduction mesurable du délai et du blocage. Aucun
facteur d'accélération dans Figma n'est établi par cette recherche.

## 2. Ce que lit et affiche la v1

### Périmètre réel des tokens

Le plugin relève les noms des collections et des variables locales. Il exclut
les objets `remote` et les variables dont la collection n'est pas locale. Pour
une variable, les segments avant le dernier `/` constituent les groupes.

Il ne lit pas les valeurs par mode, les couleurs, les alias ni les styles
Figma pour cette analyse. Il ne dresse pas le catalogue des bibliothèques.
L'écran présente les écritures détectées, les renommages proposés et les
collisions. Il ne présente pas un explorateur de toutes les valeurs de tokens.
Ces distinctions délimitent les données nécessaires à l'optimisation.

La méthode de lecture des variables est adaptée : les deux appels globaux
asynchrones évitent une résolution par identifiant pour chaque variable.
L'API distingue les variables locales et les objets importables par clé.
Les variables existent hors des pages.
Sources : [API des variables](https://developers.figma.com/docs/plugins/api/figma-variables/),
[chargement dynamique](https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading/).

### Parcours d'une analyse

| Étape | Code actuel | Travail effectué |
|---|---|---|
| Déclenchement | [`ui/index.ts`](../../../../packages/plugin-nomenclature/src/ui/index.ts), bouton d'analyse | Masque les résultats et désactive les contrôles |
| Lecture des variables | [`lectureFigma.ts`](../../../../packages/plugin-nomenclature/src/lectureFigma.ts), `creerPortDeLecture` ; [`lecture.ts`](../../../../packages/plugin-nomenclature/src/lecture.ts), `lireInventaire` | Attend les collections puis les variables, filtre les objets locaux, relève les noms |
| Lecture des composants | Mêmes modules | Charge chaque page, appelle `findAllWithCriteria` pour `COMPONENT_SET` et `COMPONENT`, copie leurs propriétés et variantes |
| Inventaire logique | `lireInventaire` | Déduplique les propriétés héritées et regroupe les valeurs par propriétaire et axe ; conserve aussi les composants pour l'écriture |
| Calcul | [`analyse.ts`](https://github.com/Vassili-g/UCM-Toolkit/blob/c025995e72969860fd535191623706d5e407fb01/packages/plugin-architect/src/analyse.ts), `analyserInventaire` | Relève tous les noms, détecte les conventions, normalise les noms, retire les propositions en collision |
| Transmission | [`routage.ts`](https://github.com/Vassili-g/UCM-Toolkit/blob/c025995e72969860fd535191623706d5e407fb01/packages/plugin-architect/src/routage.ts), réponse `pret` | Envoie l'objet `Analyse`, inventaire et composants compris |
| Présentation | [`ui/presentation.ts`](https://github.com/Vassili-g/UCM-Toolkit/blob/c025995e72969860fd535191623706d5e407fb01/packages/plugin-architect/src/ui/presentation.ts) | Recrée des index et groupe les propositions par raison |
| Rendu | [`ui/vues.ts`](https://github.com/Vassili-g/UCM-Toolkit/blob/c025995e72969860fd535191623706d5e407fb01/packages/plugin-architect/src/ui/vues.ts) | Recrée toutes les options et toutes les lignes, y compris le détail des collisions repliées |

Le parcours des composants utilise déjà un filtre de type natif. Les pages
sont chargées successivement. Des pauses existent entre les pages et tous les
100 composants dans une partie de la construction de l'inventaire. Ces choix
évitent plusieurs lectures inutiles, mais laissent des phases synchrones
entières : recherche native, première projection des composants, variables,
détection, normalisation et rendu.

### Parcours d'un choix PascalCase

L'événement `input` du `select` déclenche `carte.lire()`, `occuper(true)` et
`frontiere.recalculer()`. Le sandbox réutilise `analyse.inventaire`, appelle
`analyserInventaire()` sur tout ce contenu, puis renvoie une nouvelle analyse
complète. L'interface reconstruit les listes avant de les réactiver.

La simple ouverture du menu n'a pas de gestionnaire de recalcul. Le code
explique un blocage après changement de valeur. Un blocage à l'ouverture seule
demande une trace dans Figma : traitement encore en cours, coût du document
HTML ou comportement du contrôle natif restent des hypothèses.

## 3. Constats de la revue

### Priorité 1 : calcul synchrone sur tout l'inventaire

`analyserInventaire()` redétecte les conventions à chaque choix. Cette détection
ne dépend que des noms de l'inventaire et de leurs catégories de segments.
Elle ne dépend pas du choix que le designer vient de faire.

Dans [`normalisation.ts`](../../../../packages/kit/src/referentiel/normalisation.ts),
`detecterLesConventions()` repart de tous les noms pour chaque catégorie. Il
redécoupe les segments pendant les essais de casse et de séparateur.
`normaliserLesNoms()` les redécoupe ensuite. L'option des termes UCM ajoute un
`flatMap` des registres et une recherche dans leurs termes pour chaque mot.

Le moteur s'exécute dans le sandbox du plugin, sur le thread principal de
Figma. Une fonction synchrone longue peut donc bloquer l'éditeur. L'interface
vit dans une iframe distincte ; cette séparation ne transforme pas le calcul
du sandbox en travail en arrière-plan.
Source : [modèle d'exécution Figma](https://developers.figma.com/docs/plugins/how-plugins-run/).

**Correction proposée :** conserver la détection dans la session, préparer les
segments une fois, indexer les formes tolérées du vocabulaire, puis recalculer
les portées concernées. Découper le travail restant en lots.

### Priorité 1 : rendu proportionnel à tous les renommages

`creerListe.afficher()` construit toutes les lignes avec `creerGroupe()` puis
remplace les enfants. Chaque ligne crée sept éléments HTML et un gestionnaire
d'événement. Les groupes sont ouverts. Les collisions repliées sont aussi
construites intégralement.

`occuper()` parcourt les cases pour les désactiver. `cochees()` recherche les
cases cochées dans le DOM. Une coche individuelle recompte les cases du groupe.
Ces coûts augmentent avec le nombre de propositions affichées, même si le
designer n'en voit qu'une dizaine.

Le changement de convention reconstruit les lignes et remet leurs cases à
zéro. Les `select` persistent, mais leurs options sont recréées. Le coût de ces
quelques options est secondaire face aux milliers de lignes ; leur stabilité
reste utile pour le focus et le menu natif.

**Correction proposée :** sélection par identifiant dans le modèle, compte
maintenu lors d'une coche, rendu paginé en première étape. Une virtualisation
peut ensuite conserver le défilement continu. Masquer une liste ou utiliser un
`DocumentFragment` conserve le coût de création de toutes ses lignes.

### Priorité 1 : copie quadratique des variantes regroupées

Dans `lireInventaire()`, chaque occurrence d'une valeur reconstruit
`componentIds` avec `[...precedents, nouvelId]`. Pour une valeur partagée par
`m` variantes, le code recopie `m × (m − 1) / 2` références antérieures.
Avec 12 000 variantes, cela représente 71 994 000 références recopiées pour
cette seule valeur. Une seconde propriété peut distinguer les variantes : le
cas ne suppose pas des combinaisons dupliquées.

**Correction proposée :** accumuler les identifiants dans un tableau mutable
privé au constructeur, avec `push`, puis publier l'entrée terminée. L'interface
du résultat peut rester en lecture seule. Les pauses placées tous les 100
composants ne retirent pas ces copies.

### Priorité 2 : messages plus volumineux que l'écran

La réponse `pret` transmet les adresses de mutation, les pages, les définitions
de composants et leurs variantes. Les fonctions de présentation utilisent les
entrées pour retrouver les noms et leur contexte. Elles n'utilisent pas le
tableau `inventaire.composants` pour construire cet écran.

Le coût réel de `figma.ui.postMessage()` reste à mesurer. L'envoi de ces données
est établi par le code ; la copie Node de la section suivante en donne seulement
un indicateur. La norme HTML décrit une sérialisation structurée pour ses
communications entre contextes. Elle ne spécifie pas l'implémentation interne
du pont Figma.
Source : [sérialisation structurée HTML](https://html.spec.whatwg.org/multipage/structured-data.html#safe-passing-of-structured-data).

**Correction proposée :** garder l'inventaire canonique dans le sandbox. Envoyer
un bilan, les comptes par groupe et une fenêtre de lignes. Une réponse doit
porter les identifiants de l'inventaire, du calcul et de la fenêtre demandée.

### Priorité 2 : les pages retardent les résultats des variables

La première réponse `pret` attend toutes les pages, même quand les variables
sont déjà relevées. Le coût comprend `page.loadAsync()` et une recherche
synchrone par page. La première projection de tous les composants se fait
avant les pauses par lots. `collections.find()` ajoute aussi une recherche
linéaire pour chaque variable.

**Correction proposée :** séparer le relevé des variables du relevé des
composants. Construire une `Map` des collections. Afficher un bilan provisoire
identifié comme incomplet pendant la lecture des pages. Garder l'application
désactivée tant que l'inventaire requis n'est pas complet.

Deux lectures globales de variables et collections peuvent être lancées avec
`Promise.all`, puis jointes après résolution. Ce changement supprime leur
sérialisation côté JavaScript. Le parallélisme interne de Figma et le gain
réel ne sont pas garantis.

### Priorité 3 : prévol et collisions à surveiller

La normalisation reconstruit toutes les destinations après chaque vague de
retrait pour collision. Son coût dépend du nombre de vagues. La borne
algorithmique est quadratique si ce nombre croît avec celui des noms ; les
jeux mesurés ici ne démontrent pas cette situation.

L'application prépare les objets de tous les composants, relit l'inventaire
complet, puis contrôle la sélection. Dans
[`ecriture.ts`](../../../../packages/plugin-nomenclature/src/ecriture.ts), plusieurs
`find`, `filter`, `some`, tris et comparaisons JSON sont répétés dans des
boucles. `routage.ts` vérifie aussi les identifiants sélectionnés par une
recherche dans toutes les propositions. Ces chemins peuvent ralentir un gros
remplacement. Ils ne causent pas le recalcul d'une convention.

**Correction proposée :** indexer les propositions et les composants par
identifiant et propriétaire. Préparer les objets utiles à la sélection et aux
contrôles de leurs portées. Conserver d'abord la relecture exhaustive avant
écriture ; la réduire demande une preuve distincte de couverture des
occupants et des variantes.

## 4. Mesures reproductibles

Le [script de mesure](./Mesures/mesurer-performances.ts) appelle les fonctions
réelles du plugin et du kit. Les
[résultats bruts](./Mesures/resultats-performances.json) contiennent le matériel,
la version de Node et la révision du dépôt. Les durées sont les médianes de
sept exécutions après deux échauffements. Les fixtures sont générées avant les
mesures.

Commandes depuis la racine du dépôt :

```sh
npm run build --workspace @ucm-kit/core
node --import tsx "docs/notes/Recherches/Plugin Architect/Mesures/mesurer-performances.ts"
```

Les noms de variables ont trois segments, des groupes répétés et une partie
numérique unique. Tous produisent un renommage vers les minuscules et tirets.
Les tailles JSON sont des octets UTF-8. Une projection complète contient les
groupes et toutes leurs lignes ; elle ne met pas encore en œuvre le fenêtrage.

| Variables | Détection (ms) | Normalisation avec termes (ms) | Analyse avec termes (ms) | Analyse sans termes (ms) |
|---|---:|---:|---:|---:|
| 800 | 32,6 | 19,0 | 49,0 | 39,1 |
| 8 000 | 314,0 | 162,9 | 486,1 | 389,4 |
| 32 000 | 1 238,1 | 661,6 | 1 941,0 | 1 601,9 |

Les termes désignent ici l'option `termesUcm`. La v1 ne l'active pas par défaut
sur un fichier sans choix enregistré. La détection répétée coûte aussi dans ce
cas : l'analyse sans termes atteint 389 ms pour 8 000 noms.

| Variables | Message actuel (Mo) | Projection complète (Mo) | Copie Node (ms) | Éléments HTML des lignes |
|---|---:|---:|---:|---:|
| 800 | 0,415 | 0,137 | 4,3 | 5 600 |
| 8 000 | 4,209 | 1,377 | 47,7 | 56 000 |
| 32 000 | 17,013 | 5,595 | 212,1 | 224 000 |

Un Mo représente ici un million d'octets. La seule projection complète réduit
la taille JSON d'environ 67 % sur ce jeu. Elle conserve un coût proportionnel
au nombre de lignes. Le fenêtrage proposé doit également borner ce nombre.
La copie Node figure dans une mesure séparée ; l'addition des médianes ne
constitue pas une mesure de bout en bout.

Le compte HTML est déduit du constructeur de ligne, sans exécution dans un
navigateur. Les durées de construction, de style, de layout et de peinture
restent inconnues. `structuredClone` sous Node mesure une copie locale,
distincte du transfert entre le sandbox et l'iframe.

Le jeu des variantes contient un set, `State=Default` pour toutes ses variantes
et une valeur `Size` distincte pour chacune. Les pauses sont remplacées par des
promesses résolues afin d'isoler le travail de construction. Ces pauses ne
mesurent donc ni les reprises de tâches Figma ni le chargement des pages.

| Variantes | Entrées logiques | Construction pure (ms) | Références antérieures recopiées pour `Default` |
|---|---:|---:|---:|
| 1 000 | 1 003 | 4,2 | 499 500 |
| 4 000 | 4 003 | 33,7 | 7 998 000 |
| 12 000 | 12 003 | 272,1 | 71 994 000 |

Les mesures établissent un coût de calcul synchrone et une amplification des
copies. Elles ne répartissent pas le temps d'attente du fichier réel entre les
API Figma, le calcul, le pont et le rendu. La trace de ces quatre phases reste
nécessaire avant d'annoncer le gain de la solution.

## 5. Méthodes issues de la recherche

### Lecture Figma : conserver l'API dédiée et borner les parcours

Les appels globaux de variables sont déjà le point de départ adapté. Un
parcours des calques n'est pas requis pour lire leurs noms. Pour les composants,
conserver `findAllWithCriteria` après chargement de la page. Remplacer cela par
un `findAll` JavaScript global ne constitue pas une amélioration établie.
Source : [recherche par critères Figma](https://developers.figma.com/docs/plugins/api/properties/nodes-findallwithcriteria/).

`figma.skipInvisibleInstanceChildren = true` peut accélérer le parcours des
descendants invisibles d'instances. Il modifie aussi les objets accessibles,
jusqu'à rendre certains identifiants introuvables. L'essayer sur le seul port
de lecture après comparaison des inventaires obtenus. Son intérêt pour une
recherche limitée aux maîtres et aux sets dépend du fichier ; les accélérations
annoncées par Figma ne sont pas des mesures d'Architect.
Source : [portée exacte de ce réglage](https://developers.figma.com/docs/plugins/api/properties/figma-skipinvisibleinstancechildren/).

`documentchange` exige `loadAllPagesAsync()` avec `dynamic-page`. Les types
documentés concernent les nœuds et les styles. Ils n'établissent pas un flux
exhaustif des changements de variables. Les événements d'une page peuvent aider
à invalider les composants déjà lus. Ils ne remplacent pas une relecture des
variables avant mutation.
Source : [événements Figma](https://developers.figma.com/docs/plugins/api/properties/figma-on/).

### Recherche exacte : indexer les mots et leurs occurrences

Le remplacement actuel porte sur les mots issus de `decouperSegment`, avec une
convention par segment. Construire, pour chaque inventaire, les index suivants :

| Index proposé | Usage |
|---|---|
| Identifiant vers entrée | Retrouver une cible et son contexte sans recherche linéaire |
| Texte de segment vers découpe | Réutiliser les frontières et les mots répétés |
| Catégorie effective vers identifiants | Trouver les noms touchés par une convention ; un changement des groupes touche les chemins de variables |
| Mot normalisé vers occurrences | Appliquer une règle de vocabulaire aux noms concernés ; conserver rang du segment et rang du mot |
| Catégorie et portée vers noms | Refaire les collisions avec tous les occupants de la portée |
| Propriétaire vers composants | Préparer et contrôler un ensemble de variantes sans filtrer tout l'inventaire |

L'index des formes tolérées doit être construit depuis le référentiel du kit.
Conserver son ordre de priorité et ses restrictions par catégorie. La clé de
cache d'une transformation comprend la catégorie effective, la convention,
l'option des termes UCM et la version du vocabulaire. La découpe brute peut
partager une entrée pour un texte identique. Borner ces caches à la session ou
à l'inventaire ; mesurer leur mémoire sur les fichiers aux noms tous distincts.

Pour un mot exact tel que `press`, la recherche retrouve les occurrences du
mot découpé, puis reconstruit le nom complet. Elle ne doit pas remplacer une
sous-chaîne à l'intérieur d'un autre mot. Une recherche de sous-chaîne destinée
au filtre de l'écran peut rester indépendante du moteur de renommage.

### Calcul incrémental : commencer par les portées indépendantes

Adapton décrit un calcul qui suit les dépendances et ne réévalue que les
résultats demandés. Ce principe justifie une séparation entre inventaire,
segments, règles, propositions et projection visible. Il ne donne pas de gain
chiffré transposable au plugin.
Source : Hammer, Phang, Hicks et Foster, *Adapton: Composable, Demand-Driven
Incremental Computation*, conférence Programming Language Design and
Implementation, 2014,
[page des auteurs et article](https://matthewhammer.org/adapton/),
[identifiant de publication 10.1145/2594291.2594324](https://doi.org/10.1145/2594291.2594324).

La première implémentation peut garder l'algorithme de collision existant et
l'appeler sur les portées touchées. Une portée conserve tous ses noms, y compris
les noms inchangés ou non renommables. Changer la convention des groupes peut
toucher plusieurs collections de variables. Changer une règle de vocabulaire
peut toucher plusieurs catégories.

Une étape ultérieure peut mettre à jour les destinations dans une file de
propagation. Lorsqu'une proposition est retirée, son nom d'origine redevient
occupant et peut bloquer une autre destination. Il faut propager ce retrait
jusqu'au point fixe. Les vagues de retrait et l'ordre des diagnostics doivent
rester déterministes. Comparer les propositions et les collisions au calcul
global avant de remplacer celui-ci.

### Recherche de nombreux motifs : Aho-Corasick reste conditionnel

L'article d'Aho et Corasick, *Efficient String Matching: An Aid to Bibliographic
Search*, Communications of the ACM 18(6), 333–340, 1975, décrit la recherche
simultanée de motifs. Référence :
[identifiant de publication 10.1145/360825.360855](https://doi.org/10.1145/360825.360855).
Les travaux de Kanda, Akabe et Oda sur les automates à double tableau étudient
les compromis de représentation et de vitesse :
[*Engineering faster double-array Aho-Corasick automata*](https://arxiv.org/abs/2207.13870),
publié dans Software: Practice and Experience, 53(6), 1332–1361, 2023,
[publication 10.1002/spe.3190](https://doi.org/10.1002/spe.3190).

Sur GitHub, le
[document de conception de `BurntSushi/aho-corasick`](https://github.com/BurntSushi/aho-corasick/blob/master/DESIGN.md)
explique les différences entre le premier motif détecté, la priorité de l'ordre
des motifs et le plus long motif. Ces choix changent le résultat d'un
remplacement lorsque les motifs se recouvrent. Cette implémentation Rust sert
de référence algorithmique ; elle n'est pas directement intégrable au bundle
TypeScript actuel.

Un automate peut devenir pertinent pour beaucoup de motifs de sous-chaînes
appliqués à un grand texte. Le vocabulaire actuel se cherche par mots exacts
dans des segments déjà découpés. Une `Map` de mots convient à cette opération.
Un automate ajouterait des règles de frontières, de priorité des motifs et de
recouvrement. Il ne résoudrait ni les collisions Figma ni le coût du DOM.
Retenir cette piste seulement si un benchmark du futur moteur de règles montre
que la recherche de motifs domine encore le temps.

### Rendu : pagination puis virtualisation selon le besoin

Le dépôt [TanStack Virtual](https://github.com/TanStack/virtual/blob/main/docs/introduction.md)
présente un virtualiseur indépendant du balisage et du framework. Son
[`virtual-core`](https://github.com/TanStack/virtual/blob/main/packages/virtual-core/src/index.ts)
expose les clés des lignes, une marge autour de la fenêtre visible et la mesure
des hauteurs. Le dépôt vanilla
[`clauderic/virtualized-list`](https://github.com/clauderic/virtualized-list)
donne un autre exemple de rendu limité à une fenêtre.

Pour Architect, une pagination de 50 à 100 lignes constitue une première
solution vérifiable sans ajouter de dépendance. Le modèle conserve toute la
sélection. « Tout cocher » agit sur les identifiants du groupe entier, y compris
les pages non montées. Une modification de convention doit invalider ou
réconcilier explicitement les choix dont la proposition a changé.

La virtualisation convient si le défilement continu est requis. Les noms longs
se replient aujourd'hui, particulièrement à la largeur minimale. Une hauteur
fixe serait donc incorrecte sans changement de présentation. Mesurer les lignes
variables et conserver le focus clavier, l'accès aux détails, les états de
groupes et les annonces accessibles. Un simple masquage CSS ne borne pas les
objets HTML construits.

[Tokens Studio](https://github.com/tokens-studio/figma-plugin) constitue un
précédent de gestion de tokens dans un plugin Figma. Son périmètre comprend la
définition, le stockage et l'application de tokens. Le dépôt consulté ne
constitue pas une preuve d'accélération du relevé des noms d'Architect. Aucun
chiffre de cette recherche ne lui est emprunté.

### Ordonnancement : céder la main et remplacer le calcul périmé

Le navigateur considère une tâche de plus de 50 ms comme longue. Découper une
boucle par budget de temps laisse passer les interactions et le rendu. Attendre
une promesse déjà résolue ne suffit pas à provoquer ce passage.
Source : [traitement des tâches longues](https://web.dev/articles/optimize-long-tasks).

Viser des lots de 5 à 8 ms pour le JavaScript que le plugin contrôle, puis
ajuster avec les traces. Dans l'iframe, détecter `scheduler.yield()` et prévoir
un repli par tâche temporisée. Dans le sandbox, utiliser le mécanisme de pause
éprouvé avec les API disponibles dans Figma. Ne pas supposer que l'API
`scheduler` du navigateur y existe.
Source : [ordonnancement de Chrome](https://developer.chrome.com/blog/use-scheduler-yield).

Les pauses ne préemptent pas un appel natif synchrone tel que
`findAllWithCriteria`. Son temps doit être mesuré séparément. Une progression
affichée juste avant une longue fonction ne garantit pas qu'elle sera peinte
avant le blocage.

La frontière actuelle refuse tout nouveau recalcul jusqu'à la réponse. Pour
laisser les conventions accessibles pendant le calcul, conserver la dernière
intention reçue et abandonner les générations précédentes aux frontières des
lots. Aucun ancien résultat ne doit réactiver Appliquer. La mutation garde une
exclusion propre ; elle ne se lance pas sur une génération incomplète.

### Worker : expérimentation après réduction du travail

Un worker peut exécuter le moteur pur depuis l'iframe. Il ne peut pas lire la
scène Figma ni construire les lignes de l'interface. Son démarrage et les
messages ajoutent des coûts ; réutiliser un seul worker si cette voie est
retenue.
Source : [workers dans la norme HTML](https://html.spec.whatwg.org/multipage/workers.html#workers).

Le manifest actuel interdit les domaines réseau. La disponibilité d'un worker
embarqué doit être éprouvée dans Figma web et desktop avec le bundle final et
sa politique de sécurité. Les sources consultées ne garantissent pas ce montage
dans toutes ces configurations. Un worker reste donc une option de calcul,
avec repli par lots. Le protocole et les caches proposés fonctionnent aussi
sans lui.

## 6. Architecture proposée pour l'implémentation

| Responsabilité | Données conservées | Sortie |
|---|---|---|
| Lecture sandbox | Instantané local, identifiants et contexte Figma ; composants seulement si requis | Inventaire identifié et état de complétude |
| Préparation du moteur | Segments, mots, détection, index de catégories et portées | Données réutilisables pour une génération de règles |
| Calcul | Conventions, vocabulaire, propositions, collisions | Bilan et catalogue des résultats, identifiés par génération |
| Présentation | Ordre stable, comptes et identifiants par groupe | Fenêtre de lignes demandée ; aucun composant Figma |
| Interface | Choix courants, sélection par identifiant, fenêtre visible, focus | Demandes de recalcul, de fenêtre et d'application |
| Application sandbox | Dernière analyse validée, sélection et document relu | Renommages constatés, refus et annulation |

Trois identités distinctes sont nécessaires : l'inventaire change après une
nouvelle lecture ; la génération change après une règle ; la demande de fenêtre
change au défilement ou au filtrage. Les contrôles existants `demande` et
`analyseId` sont une base, mais ne couvrent pas seuls ce protocole concurrent.

La première version peut garder le moteur dans le sandbox. La préparation et
les calculs doivent alors être divisés en lots. Déplacer seulement une fonction
synchrone entière dans un gestionnaire `async` conserve son blocage.

Pour un nouveau relevé, publier d'abord un résumé incomplet des variables.
Compléter avec les propriétés et valeurs des pages, puis produire la génération
applicable. Conserver les erreurs de lecture comme telles ; un résultat partiel
ne doit pas être présenté comme une analyse exhaustive.

## 7. Ordre de réalisation

| Lot | Changements proposés | Preuve attendue |
|---|---|---|
| Mesure initiale | Durées par phase et compteurs de travail, sans noms de tokens dans les traces | Trace du fichier réel séparant API, calcul, pont, rendu et temps bloqué |
| Réduction des copies | Accumulation des variantes, index des collections, index des propositions et propriétaires | Inventaires et résultats identiques ; croissance du regroupement mesurée sur les grands sets |
| Détection et segments réutilisés | Détection liée à l'inventaire ; segmentation et index du vocabulaire issus du kit | Aucun appel de détection lors d'un recalcul ; résultats identiques avec et sans termes UCM |
| Messages et listes bornés | Bilan et fenêtres ; sélection hors du DOM ; pagination ; options stables | Nombre de lignes et taille d'une réponse indépendants du total des propositions, hors comptes et métadonnées |
| Travail interruptible | Lots temporels, dernière intention conservée, réponses périmées ignorées | Plusieurs conventions successives donnent le dernier résultat ; annulation sans écriture |
| Recalcul par portée | Reprendre les portées touchées, avec leurs occupants | Même résultat que le calcul global, y compris collisions en cascade |
| Ajustement du premier affichage | Bilan des variables avant les pages ; périmètre configurable si retenu | Premier résultat visible mesuré ; état incomplet explicite |
| Options conditionnelles | Virtualisation continue, worker ou file de collisions | Ajouter seulement ce que la trace restante justifie |

La modification du moteur partagé se fait dans le kit. Elle demande les tests
du référentiel et le changement de version prévus par les règles du dépôt.
Les conventions et les termes ne doivent pas être recopiés dans le plugin.

## 8. Protocole de validation et objectifs

### Mesurer dans Figma

Relever séparément le premier lancement et les passages suivants dans le même
fichier. Le chargement des pages et les caches du client peuvent changer leur
coût. Relever Figma web et desktop, le matériel, la version du plugin et le
périmètre effectivement analysé.

| Mesure | Début et fin |
|---|---|
| Lecture des variables et collections | Autour de chaque appel API, puis autour de leur projection logique |
| Lecture des composants | Chargement, recherche native et projection mesurés séparément, par page |
| Calcul | Détection, préparation des segments, propositions et vagues de collisions séparées |
| Pont | Taille du message, durée synchrone de l'envoi et aller-retour avec accusé ; l'aller-retour comprend aussi l'attente des tâches |
| Rendu | Réception, projection, mise à jour du DOM et image suivante ; confirmer style, layout et peinture dans la trace du navigateur |
| Interaction | Pointer ou clavier jusqu'au retour visuel du contrôle et jusqu'au dernier résultat |
| Blocage | Plus longue tranche JavaScript et temps des appels natifs non préemptibles |
| Mémoire | Inventaire, caches, messages en vol et lignes montées ; contrôler la libération après plusieurs analyses |

Éviter de soustraire directement les horloges du sandbox et de l'iframe sans
alignement. Utiliser les durées locales et une mesure aller-retour pour le pont.
Un accusé de réception n'établit pas que l'écran est déjà peint.

Les objectifs suivants sont des seuils proposés pour la recette, à confirmer
sur la machine et le fichier de référence. Ils ne décrivent pas des gains déjà
obtenus.

| Cas | Objectif proposé |
|---|---|
| Changement de convention, 8 000 variables | Réduction d'au moins cinq fois du délai de bout en bout par rapport à la trace initiale ; résultat final au 95e percentile sous 200 ms |
| Réponse visuelle à une action | Sous 50 ms au 95e percentile ; conventions utilisables pendant un recalcul |
| Travail JavaScript contrôlé | Lots visés entre 5 et 8 ms ; identifier séparément tout appel natif de plus de 50 ms |
| Premier bilan des variables, 8 000 variables | Sous une seconde après le retour des API de variables, sans attendre les pages |
| Liste des renommages | Au plus 100 lignes de données montées avec la pagination initiale ; le total et la sélection restent globaux |
| Recalcul inchangé | Zéro appel de lecture Figma ; zéro nouvelle détection des conventions |

Exécuter au moins trente interactions par scénario après échauffement pour
relever médiane et 95e percentile. Conserver les résultats bruts. Compléter les
jeux de 800, 8 000 et 32 000 variables par le fichier réel qui provoque le
blocage, puis par un fichier riche en composants et pauvre en tokens.

### Préserver le résultat et l'écriture

Comparer le calcul optimisé au moteur global sur les noms Unicode, acronymes,
segments vides, noms soudés connus et catégories de groupes. Inclure les
conventions inhabituelles, les objets non renommables, les occupants inchangés,
les collisions de chemins complets, les axes ambigus et les sélections partielles.

Les tests d'interface doivent couvrir la sélection hors écran, les noms longs,
le clavier, le focus après changement de convention et les réponses arrivées
dans le désordre. Les galeries restent le support de relecture visuelle prévu
par le dépôt.

Le remplacement conserve les objets Figma existants et leurs identifiants.
Un alias de variable vise un identifiant. Renommer `name` conserve cette adresse ;
les chemins textuels des exports peuvent néanmoins changer.
Sources : [Variable](https://developers.figma.com/docs/plugins/api/Variable/),
[VariableAlias](https://developers.figma.com/docs/plugins/api/VariableAlias/).

La relecture avant écriture, les contrôles de collision, la validation des
combinaisons de variantes, le rapport d'échec partiel et la délimitation de
l'annulation doivent rester. Leurs limites sont décrites dans la
[recherche API de la v1](./2%20Architect%20v1/RECHERCHE-API-ARCHITECT.md).
Un cache de prévisualisation ne constitue pas une preuve de fraîcheur du
document au moment d'appliquer.

## Mesures de la refonte

Les scripts de [Mesures](./Mesures/) appellent le moteur du kit. Les tableaux
de la section 4 portent sur la v1 ; leur
[script d'origine](https://github.com/Vassili-g/UCM-Toolkit/blob/850e1c01a56052b8b0d78dba26873cb230e7d024/docs/notes/Recherches/Plugin%20Architect/Mesures/mesurer-performances.ts)
reste accessible dans Git.

Depuis la racine du dépôt :

```sh
npm run build --workspace @ucm-kit/core
node --import tsx "docs/notes/Recherches/Plugin Architect/Mesures/mesurer-performances.ts"
node --import tsx "docs/notes/Recherches/Plugin Architect/Mesures/mesurer-questions.ts" C1
node --import tsx "docs/notes/Recherches/Plugin Architect/Mesures/mesurer-questions.ts" C2
```

Le premier script écrit `resultats-performances.json`. Le second écrit sur la
sortie standard ; le [relevé conservé](./Mesures/resultats-questions-c1.json)
porte sur C1. Les résultats de C2 restent hors du dépôt.

### Durées du moteur

Les [résultats bruts](./Mesures/resultats-performances.json) indiquent Node
24.19.0, Windows x64 et un Intel Core i7-7820X à 3,60 GHz. Chaque durée est la
médiane de sept exécutions après deux échauffements.

| Noms | Préparation (ms) | Questions (ms) | Normalisation initiale (ms) | Recalcul d'écriture (ms) | Recalcul de terme (ms) |
|---|---|---|---|---|---|
| 800 | 30,850 | 14,581 | 3,775 | 6,614 | 1,153 |
| 8 000 | 286,219 | 135,144 | 49,967 | 69,390 | 7,945 |
| 32 000 | 1 189,725 | 520,637 | 213,916 | 292,655 | 41,732 |

Les noms synthétiques ont trois segments et huit portées. La préparation
comprend le découpage, les index et la détection des conventions.
La normalisation et les recalculs réutilisent le lexique préparé.
Le choix d'écriture passe les noms de variables en PascalCase.
La règle `outline` vers `outlined` touche une seule portée : 100, 1 000 ou
4 000 noms selon le jeu. Sa mesure comprend l'index du vocabulaire et la
recherche des portées touchées. Le script compare son résultat partiel au
résultat global sur ces portées, collisions comprises.

La détection des 32 000 noms prend 521 ms sur ce jeu sans question. La
préparation complète prend 1,19 s. Ces durées sous Node excluent les API Figma,
les attentes entre les étapes, le pont et le rendu. Elles ne mesurent pas la
plus longue tranche entre deux pauses.

### Questions sur C1

C1 est `UCM-Playground/src/tokens/tokens.json` : 760 variables réparties sur
huit racines de collection. Le relevé contient l'empreinte SHA-256 du fichier
et la révision du moteur.

La racine DTCG représente la collection et le reste du chemin représente le
nom de variable. Le script relève seulement l'alias direct de `$value`.
L'export a déjà normalisé les noms : leur casse et leurs séparateurs Figma ne
peuvent plus être mesurés.

| Détecteur | Questions |
|---|---|
| Terminaison | 0 |
| Pluriel | 0 |
| Abréviation | 0 |
| Synonymes | 1 |
| Même place | 42 |
| Faute | 1 |
| Mots collés | 0 |
| Échelle | 1 |
| Collection | 2 |
| Total | 47 |

Ces comptes portent sur les questions dédupliquées, toutes pistes comprises.
La priorité d'un indice détermine sa ligne de comptage quand plusieurs indices
concordent. Les règles UCM actives retirent leurs formes déjà remplacées.
Le détecteur « Même place » exclut les termes frères sous un même parent et
les mots contigus dans un nom.

Le seuil reste à 2. Le relevé élargit le plafond à vingt questions pour leur
relecture ; le moteur en retient dix par défaut. Les vingt premières, avec
leur score et leur proposition, sont dans le relevé C1. Le score compte les
noms distincts touchés et ajoute deux points par indice supplémentaire.
La première paire est `foreground` / `scale`, score 119 : sa fréquence ne
suffit pas à établir une synonymie. Le mainteneur doit juger ces propositions
avant de fixer le seuil.
