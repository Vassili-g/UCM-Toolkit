# Un explorateur de tokens Figma, avec intégrations UCM facultatives

Étude de produit, sans décision d'implémentation. Les outils concurrents n'ont pas été essayés
dans Figma. L'état du code ci-dessous inclut les modifications présentes dans
le workspace, sans présumer de leur publication.

La [maquette interactive](./MAQUETTE-EXPLORATEUR-TOKENS.html) s'ouvre directement
dans un navigateur. Elle utilise un jeu fictif, sans connexion à Figma.

Le [plan d'implémentation](./PLAN-IMPLEMENTATION.md) organise l'exécution par
lots, avec décisions par défaut, tâches à cocher et preuves de validation.

## 1. Le besoin

L'explorateur doit fonctionner sur toute architecture de tokens Figma, dans un
projet avec ou sans UCM, avec ou sans contrats. Aucun nom de collection, nombre
de couches, convention de nommage ou couple marque–thème n'est requis.

Un designer cherche pourquoi une propriété prend une valeur dans un contexte
donné. Il doit retrouver chaque alias, le mode retenu à chaque étape,
la valeur terminale et les consommateurs qui seraient touchés par un changement.

Le plugin proposé reprend la table de la [vue
multimarques](../Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html) :
collections à gauche, variables et modes en colonnes. Un inspecteur latéral
ajoute la chaîne, la provenance et les usages. Un graphe local peut compléter
la table lorsque plusieurs branches expliquent un résultat.

**Proposition : commencer par un explorateur en lecture seule.** Les corrections
restent dans les outils qui possèdent les données. Le plugin conserve les
références d'origine et ne crée pas de collection pour simuler un mode.

### Fonctionnement autonome et compléments

| Données disponibles | Fonctions accessibles |
|---|---|
| Variables Figma seules | Navigation, recherche, résolution, copie, comparaison des modes, diagnostics de références et dépendances entre variables |
| Variables et calques ou styles accessibles | Recherche des consommateurs et lecture du contexte effectif, sans contrat |
| Contrats UCM importés volontairement | Occurrences normatives dans les composants et leurs variants |
| Recette Palettes ou profil UCM activé | Emplois, rangs et règles d'architecture propres à UCM, selon les données vérifiées |

Les collections et leurs modes sont découverts depuis les données. Une
collection unique, des alias internes, des références entre collections, des
axes de densité ou de langue et des valeurs directes sont des cas ordinaires.
Couleurs, nombres, chaînes et booléens relèvent du socle. Les limites de types
ou d'accès sont affichées sur les seules données concernées.

Un projet sans contrats n'est pas incomplet. L'interface n'affiche aucune
alerte d'absence d'UCM et ne demande pas de créer un contrat pour naviguer.
Les contrôles UCM ne s'exécutent que lorsque leur profil est activé et leurs
données disponibles. Un nom tel que `usage` ne suffit pas à activer ce profil.

## 2. Ce qui existe

### Développer ou adopter un outil existant

**Recommandation : essayer Variable Visualizer avant de développer le plugin.**
L'éditeur documente déjà la visualisation des collections, des modes et des
alias, ainsi que le parcours des dépendances. Ce recouvrement justifie un
essai sur les fichiers réels avant d'investir dans un autre explorateur.
[Source : Variable Visualizer](https://www.variablevisualizer.com/).

La suffisance de l'outil reste à vérifier : la documentation ne prouve pas
que la table, l'arbre des groupes, le survol d'une chaîne complète ou la copie
de sa valeur terminale répondent au geste attendu. Tokens Studio mérite un
essai si le projet l'utilise déjà ; son adoption uniquement pour inspecter des
variables demanderait d'évaluer le coût de son workflow.

| Résultat de l'essai | Choix recommandé |
|---|---|
| Les parcours courants aboutissent sans contournement gênant | Utiliser l'existant ; conserver cette étude comme référence des besoins |
| Seules les lectures de contrats ou d'emplois UCM manquent | Étudier un complément UCM limité avant de refaire la navigation générale |
| Un manque récurrent touche la navigation, les modes ou les diagnostics sur plusieurs architectures | Prototyper ce parcours précis, puis comparer son usage avec l'existant |

Le coût à considérer comprend la résolution des modes hérités, les variables
distantes, les collections étendues, les évolutions de l'API et les essais sur
de grands fichiers. La maquette HTML ne mesure pas ce coût. Le choix d'une
interface sombre et d'un arbre familier est une préférence de conception ;
son gain doit être observé pendant l'essai.

Le protocole proposé tient en cinq tâches : afficher un groupe et ses
descendants, suivre cinq alias, copier la valeur terminale du contexte choisi,
comparer deux modes et examiner une cible distante inaccessible. Relever les
gestes, les ambiguïtés et les contournements sur un fichier sans UCM puis sur
le fichier multimarques. Décider du développement à partir des manques répétés.

Les fonctions ci-dessous sont documentées par les éditeurs. Une fonction non
mentionnée reste à vérifier ; son absence dans cette étude ne prouve pas son
absence du produit. Les offres et restrictions commerciales doivent être
revérifiées avant un choix d'outil.

| Solution | Fonctions documentées | Conséquence pour la proposition |
|---|---|---|
| [Figma, variables natives](https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables-and-collections) | Collections, valeurs et alias entre variables de même type | Garder une table familière et des noms identiques au fichier |
| [Variable Visualizer](https://www.variablevisualizer.com/) | Graphe des collections, modes et alias ; recherche, focus, copie des noms ; connexions en lot ; export ; fonctions de bibliothèques et simulation distante dans l'offre professionnelle | Concurrent direct. La navigation d'alias seule ne justifie pas un nouveau produit |
| [Tokens Studio, références](https://docs.tokens.studio/manage-tokens/token-values/references) | Références typées, recherche de cible, valeur référencée et valeur résolue au survol | Reprendre la distinction entre référence et résultat. Vérifier en essai la profondeur montrée au survol |
| [Tokens Studio, Graph Engine](https://tokens.studio/plugin-tools) | Éditeur de règles, transformations et conditions pour produire des tokens et des thèmes | Son graphe sert aussi à fabriquer les valeurs. Notre besoin initial est d'expliquer des variables Figma existantes |
| [Supernova, collections](https://learn.supernova.io/latest/design-systems/design-tokens/working-with-tokens/your-tokens-in-supernova-PAENjVFx) | Tokens importés de Figma, recherche, regroupement par fichier et collection, thèmes propres à chaque collection | Référence pour organiser un grand catalogue et distinguer sa provenance |
| [Supernova, documentation de tokens](https://learn.supernova.io/latest/documentation/documentation-blocks/tokens/design-tokens-tapjaLlB) | Blocs de tokens, rampes et grille d'accessibilité | Référence pour une lecture des palettes avec leurs usages, au-delà de la liste de valeurs |

[Variable Vision](https://www.figma.com/community/plugin/1333777469720187504/variable-vision)
est aussi un candidat à essayer pour la recherche de consommateurs. Sa fiche
Community n'a pas pu être consultée pendant cette recherche : ses fonctions
ne sont pas retenues comme établies dans la comparaison.

### Ce qui mérite un essai comparatif

Charger le même fichier dans Figma natif, Variable Visualizer et Tokens Studio.
Mesurer les gestes nécessaires pour retrouver une primitive à cinq alias,
expliquer une différence entre deux marques et retrouver les consommateurs
d'une variable distante. Vérifier le comportement d'un alias inaccessible,
la précision de la copie et le maintien du contexte après navigation.

L'utilité du socle doit être évaluée sur des projets sans UCM : rapidité de
navigation dans la table, explication des modes et précision des diagnostics.
Le rapprochement avec les emplois UCM et les contrats est un complément
facultatif. La recherche documentaire ne suffit pas à conclure que les
concurrents ne peuvent pas couvrir ces besoins.

## 3. Les acquis UCM et leur état réel

L'[architecture retenue](../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)
et son [plan d'intégration](../Archi%20Tokens%20Multi-marques/PLAN-INTEGRATION-ARCHITECTURE.md)
séparent les décisions des travaux encore ouverts. Certains constats initiaux
du plan décrivent un code antérieur ; pour l'état présent, lire les modules.

| Sujet | État constaté | Source et réemploi proposé |
|---|---|---|
| Six collections de couleur ; `brand` et `theme` indépendants | Architecture retenue ; écriture des variables encore ouverte dans le plan | [Architecture](../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md). Fournir un profil UCM facultatif ; conserver un explorateur générique pour les autres collections |
| Huit emplois, crans requis dont 400 et 950 | Présents dans le kit | [emplois.ts](../../../../packages/kit/src/emplois/emplois.ts). Montrer les emplois d'un cran sans recopier leur table dans le plugin |
| Quatre rangs, correspondance des états, dix-neuf paires | Présents dans le kit | [rangs.ts](../../../../packages/kit/src/emplois/rangs.ts), [paires.ts](../../../../packages/kit/src/emplois/paires.ts). Expliquer `active-hover`, le focus et les usages désactivés |
| Noms d'usage, cibles et supports de peinture | Présents dans le kit | [usages.ts](../../../../packages/kit/src/emplois/usages.ts). Distinguer fond, texte, icône, bordure et anneau |
| Recette Palettes et suivi des planches | Lecture et rangement présents | [lecture.ts](../../../../packages/plugin-palettes/src/lecture.ts) et [recette.ts](../../../../packages/plugin-palettes/src/ecriture/recette.ts). Données partagées `ucm_palettes`, clés `recette` et `planche` |
| Rôles et affectations de palettes aux marques dans les variables | Travaux ouverts du plan d'intégration | Ne pas présenter une correspondance recette–variable comme disponible. Prévoir une association explicite et vérifiable |
| Normalisation des chemins, collisions, alias | Présents dans l'exporteur | [variables.ts](../../../../packages/plugin-exporter/src/variables.ts) et [names.ts](../../../../packages/kit/src/format/names.ts). Réutiliser les fonctions publiques ; extraire les fonctions communes si nécessaire |
| Références des contrats et vues exactes des variants | Lecteurs présents | [references-token.mjs](../../../../packages/kit/src/lecteurs/references-token.mjs), [variant-views.mjs](../../../../packages/kit/src/lecteurs/variant-views.mjs). Exclure `samples` et `meta` du relevé normatif |
| Axes, modes et extensions de tokens publiés | Lecteur présent | [modes-tokens.mjs](../../../../packages/kit/src/lecteurs/modes-tokens.mjs). Respecter les axes déclarés, leur défaut et les surcharges |
| Diagnostic de respect des emplois dans `ucm check` | Lot encore ouvert dans le plan | Ne pas afficher ce contrôle comme livré. Partager son futur moteur avec l'explorateur plutôt que créer deux interprétations |

Les contrats sont portables : ils ne constituent pas un index des identifiants
de variables Figma. L'association aux variables doit passer par le chemin
normalisé, avec détection des collisions. Un chemin ambigu interdit de conclure
sur un consommateur.

## 4. Fonctions proposées et priorités

P0 constitue une première version autonome ; P1 étend les analyses génériques
et ajoute des intégrations facultatives ; P2 demande une validation d'usage
ou une étude technique. Ces priorités sont proposées.

| Priorité | Fonction | Comportement attendu et limite |
|---|---|---|
| P0 | Suivre l'alias direct | Clic sur la référence : ouvrir sa collection, son groupe et sa ligne. Conserver le contexte de modes ; un bouton Retour restitue la position précédente |
| P0 | Voir la chaîne au survol | Afficher chaque variable, collection, mode et valeur terminale. Même contenu au focus clavier et dans un panneau épinglé au clic |
| P0 | Copier la valeur terminale | Copier le résultat du contexte affiché. Séparer les commandes valeur, référence DTCG, nom Figma et chaîne. Désactiver la valeur si la résolution échoue |
| P0 | Rechercher et filtrer | Nom, collection, groupe, type, valeur, alias ou valeur directe, locale ou distante ; résultats dans toutes les collections |
| P0 | Parcourir l'arbre des groupes | Une collection affiche toutes ses variables ; un groupe affiche ses variables et celles de ses descendants. Chevron de repli indépendant de la sélection, compteur récursif et chemin visible |
| P0 | Inspecter les modes | Choix explicite par collection ; défaut nommé. Pour une sélection Figma, distinguer mode explicite et hérité ; afficher la provenance |
| P0 | Comparer deux contextes | Choix des modes par collection découverte : thème, densité, langue ou autre axe ; indiquer le premier alias différent et les valeurs terminales, même si elles sont égales |
| P0 | Diagnostiquer une chaîne | Cycle, cible inaccessible, mode absent, type incompatible, expression non prise en charge ; montrer l'étape en cause et l'action possible |
| P0 | Lire la provenance | Identifiant, clé publiée si accessible, collection, bibliothèque, description, portées et syntaxe de code |
| P0 | Actualiser le relevé | Afficher le périmètre et la fraîcheur ; invalider une résolution après changement. Recalcul explicite disponible |
| P1 | Remonter les dépendants | Alias directs et transitifs, puis calques et styles dans le périmètre analysé. « Aucun trouvé dans cette page » ne signifie pas « inutilisé » |
| P1 | Partir de la sélection | Voir les propriétés liées, leurs tokens et leurs modes effectifs ; rejoindre le calque trouvé dans Figma |
| P1 | Expliquer les couleurs UCM, facultatif | Palette, rôle affecté, intensité, thème, cran, emploi et rang. Afficher séparément ce qui vient d'une recette, d'un alias ou d'une association manuelle |
| P1 | Contrôler les paires | Fond et premier plan réels, contexte, ratio et seuil. Une valeur seule n'obtient pas de badge de conformité |
| P1 | Parcourir les contrats, facultatif | Importer des contrats et `tokens.json` ; trouver les composants, variants et emplacements normatifs qui citent le token |
| P1 | Comparer Figma et l'export | Valeur, alias, nom, mode et présence ; qualifier la fraîcheur du fichier importé avant de conclure à une divergence |
| P1 | Exporter un constat | Rapport JSON ou texte avec chaîne, contexte, périmètre et causes observées ; garder les alias dans les données exportées |
| P2 | Graphe local | Un token, ses ancêtres et ses dépendants ; déploiement progressif. Éviter de charger toutes les arêtes à l'ouverture |
| P2 | Simuler un remplacement | Calculer les consommateurs potentiellement touchés dans une copie en mémoire ; aucune écriture dans Figma |
| P2 | Règles d'architecture, facultatif | Profils explicitement activés, dont UCM : couches autorisées, emplois et portées ; aucune architecture imposée au socle |
| P2 | Comparer deux relevés | Repérer changement de cible, valeur ou mode ; utiliser les identifiants stables quand ils existent, pas seulement les noms |
| P2 | Bibliothèques multiples | Étendre la lecture aux données accessibles ; conserver une frontière visible pour les cibles non chargées |

### Sens exact de « valeur brute »

La valeur enregistrée sur un alias est une référence. La valeur demandée pour
copie est généralement la **valeur terminale résolue**. L'interface doit nommer
ces deux objets séparément.

Pour une couleur, proposer une représentation lisible et la donnée source :
Composantes rouge, vert, bleu avec alpha, ou espace de couleur et composantes lorsque disponibles.
Une conversion en hexadécimal à 8 bits peut arrondir ou perdre le gamut ; elle
doit être annoncée. Un nombre Figma sans unité reste un nombre : ne pas ajouter
`px` sans information de type. Conserver `false`, zéro et la chaîne vide.

### Sens exact de « fonction d'une couleur »

Dans le profil UCM, une primitive nommée `grass` n'est pas intrinsèquement une couleur de succès.
L'alias de `color-utilities` établit ce rôle. L'emploi `surface` ou `text`
vient ensuite de `usage`. Un contrat précise enfin la propriété peinte et
l'état du composant. Montrer ces niveaux séparément empêche d'inférer une
fonction depuis la teinte ou un nom de palette.

Sans ce profil, afficher les descriptions et les liaisons observées dans
Figma. La propriété d'un calque fournit un usage concret même sans contrat.
Ne pas attribuer un emploi de la table UCM à une architecture étrangère.

Un cran peut servir plusieurs emplois. Le cran 500 n'a pas d'emploi général
dans la table, mais `text-disabled` le vise dans les usages propres au neutre.
La recette, la liste de nuances et les alias réels restent nécessaires pour
expliquer une palette personnalisée.

### Navigation et thème de l'interface

La navigation reprend la distinction Figma entre collections et groupes de
variables. Les groupes peuvent être imbriqués par les segments `/` du nom
Figma. Un point dans un nom ne crée pas un groupe ; les chemins normalisés des
exports ne doivent pas remplacer les noms source pour construire l'arbre.
[Source : collections et groupes Figma](https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables-and-collections).

Le clic sur le libellé d'une collection affiche son contenu entier. Le clic
sur un groupe restreint la table à ce groupe et à tous ses descendants. Le
chevron agit uniquement sur le repli de l'arbre. Suivre un alias ouvre le
groupe de sa cible ; Retour restaure le filtre précédent. La recherche globale
annonce qu'elle porte sur toutes les collections.

**L'interface du plugin est exclusivement sombre.** Ce choix est indépendant
des modes des tokens : sélectionner Light ou Jour ne change que les valeurs
inspectées et les spécimens. La préférence claire du système ne modifie pas
les surfaces, les champs ou les panneaux de l'explorateur.

## 5. Faisabilité et points à éprouver

### Lecture Figma et résolution

L'[API des variables](https://developers.figma.com/docs/plugins/api/figma-variables/)
fournit les lectures asynchrones des collections et variables locales, ainsi
que la recherche par identifiant. Construire un index par identifiant et une
table des arêtes par mode ; résoudre les cibles à la demande et mémoriser les
lectures. Un cycle se détecte sur le chemin courant, sans confondre une cible
partagée avec un cycle.

La valeur dépend du consommateur et du mode de chaque collection traversée.
[`resolveForConsumer`](https://developers.figma.com/docs/plugins/api/properties/Variable-resolveforconsumer/)
donne une valeur résolue pour un calque existant, pas la chaîne explicative.
Comparer cette valeur au résolveur du plugin sur des fixtures Figma. Pour la
simulation hors sélection, demander un contexte par collection et montrer
tout défaut utilisé. Ne pas transposer un identifiant de mode entre collections.

Les [bibliothèques](https://developers.figma.com/docs/plugins/api/figma-teamlibrary/)
offrent des listes de collections et de variables publiées, sous réserve
d'accès. Cela ne garantit pas la lecture de toutes leurs valeurs et chaînes.
Ne pas importer une variable distante dans le document pour compléter une
analyse annoncée en lecture seule. Qualifier la cible « inaccessible » tant
que sa suppression n'est pas prouvée.

Les [types de variables Figma](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
incluent des cas de mouvement et des alias de couleur avec opacité. Les traiter
explicitement ou afficher « non pris en charge ». Ne pas réduire toutes les
valeurs à une couleur ou à un alias simple. Étudier aussi les collections
étendues avant de promettre une résolution identique à Figma.

### Réemploi sans dépendance entre plugins

Le socle UI et les sous-chemins `@ucm-kit/core/format` et
`@ucm-kit/core/emplois` sont les premiers points de réemploi. Les lecteurs
Node ne doivent pas être importés globalement dans le sandbox. Vérifier les
dépendances de chaque fonction ; déplacer les calculs purs communs dans un
module partageable avant de les exposer aux deux environnements.

Lire la recette partagée demande un schéma reconnu et sa validation. La clé
partagée ne constitue pas à elle seule une API stable entre plugins. Formaliser
ce protocole et l'association entre palettes et variables avant l'intégration.
Les plugins restent séparés, conformément aux règles du dépôt.

Les contrats arrivent d'abord par import local explicite. Afficher leur nom,
version et provenance. Un accès au repository ajouterait une connexion et des
autorisations ; il n'est pas requis pour valider le besoin.

### Coût et limites de l'analyse

Indexer les variables avant de parcourir les calques. L'analyse des usages
commence sur la sélection, puis sur une page, puis sur le document à la demande.
Prévoir progression, annulation, listes virtualisées et invalidation ciblée.
Ne pas lancer le produit cartésien de tous les modes à chaque survol.

Les contrastes portent sur une paire dans un contexte connu. Transparence,
fond indéterminé et couleur hors du périmètre du moteur donnent un résultat
non jugé. Réemployer l'arrondi et la comparaison du kit ; ne pas déduire une
conformité globale d'un seul ratio.

## 6. Ce que la maquette montre

Le sélecteur de projet propose un exemple sans UCM ni contrats et un exemple
UCM multimarques. Le premier contient des collections nommées librement,
des axes d'apparence et de densité, et les quatre types couleur, nombre,
chaîne et booléen. Le second contient les six collections, deux marques et
deux thèmes. Les valeurs illustrent les parcours ; elles ne sont ni exportées
du fichier Figma ni certifiées par le moteur de palettes.

| Parcours à essayer | Résultat visible |
|---|---|
| Choisir « Projet libre · sans UCM » | Navigation et comparaison accessibles ; dépendants visibles sans onglet UCM ni contrats |
| Cliquer sur `Interface`, puis `card`, puis `header` | La table passe du contenu entier de la collection au sous-arbre du groupe, puis à son sous-groupe |
| Replier un groupe par son chevron | Les descendants disparaissent de l'arbre ; le filtre de la table reste inchangé |
| Dans `Interface`, inspecter `card/gap` puis changer le mode de `Mesures` | Résolution d'un nombre selon Compact ou Confort ; aucune unité inventée |
| Dans `components`, cliquer sur l'alias du fond du bouton | Navigation vers `usage`, puis `theme`, `brand` et `primitives` ; Retour restaure le token précédent |
| Survoler ou donner le focus à une référence | Chaîne avec collection, mode et valeur terminale |
| Ouvrir un token par son nom | Inspecteur épinglé, copie de la valeur ou de la référence |
| Changer Marque ou Thème | Recalcul des chaînes et des valeurs, sans changement des données |
| Ouvrir Comparer | Deux contextes indépendants et premier embranchement différent |
| Ouvrir Usages UCM | Emplois et contrats illustratifs du token ; navigation vers les alias dépendants |
| Ouvrir Diagnostics | Cible inaccessible et cycle fictifs, avec navigation vers la chaîne concernée |
| Rechercher `grass` | Résultats dans toutes les collections du jeu |

La copie et la résolution sont effectives dans la maquette. Les liens aux
contrats sont des exemples affichés, sans chargement de fichiers. Le scan des
calques, la lecture de recette, les contrôles de contraste, le graphe, les
rapports et les accès aux bibliothèques restent à implémenter dans le produit.

## 7. Critères pour poursuivre

1. Sur une chaîne de cinq variables, retrouver la primitive et copier sa valeur
   dans le contexte choisi sans perdre le token de départ.
2. Expliquer une différence entre marques en identifiant la première cible
   différente, y compris lorsque les valeurs terminales sont identiques.
3. Arrêter un cycle et une résolution inaccessible sans afficher de fausse
   valeur ni conclure à une suppression.
4. Vérifier dans Figma les modes hérités, les bibliothèques distantes et les
   collections étendues avant de les annoncer comme pris en charge.
5. Importer un contrat et retrouver une occurrence normative précise ; rejeter
   un rapprochement ambigu entre nom Figma et chemin publié.
6. Faire relire le rôle, l'emploi et le rang par un designer sans qu'il ouvre
   la table TypeScript.
7. Mesurer ouverture, recherche et survol sur un fichier de 10 000 variables ;
   fixer ensuite les objectifs de temps avec les designers.

8. Rejouer les parcours du socle dans un fichier sans UCM et sans contrat,
   avec des noms libres, une collection unique puis plusieurs collections,
   des alias internes et des valeurs non colorimétriques. Aucun contrôle UCM
   ne doit s'activer implicitement.

Si l'essai comparatif justifie un développement, le premier prototype Figma
doit couvrir les manques observés sur plusieurs architectures sans UCM.
Évaluer séparément un parcours facultatif token de composant, emploi, palette.
La valeur du socle doit être démontrée avant les intégrations.
