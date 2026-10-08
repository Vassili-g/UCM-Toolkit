# Spécification de l'explorateur de tokens

UCM Token Explorer lit les variables d'un fichier Figma et explique leurs
valeurs : collections, groupes, alias, modes, tokens d'un composant. Ce document
décrit ce que le plugin lit, comment il résout une chaîne et ce qu'il refuse
de conclure. Le [plan d'implémentation](../../docs/notes/Recherches/Plugin%20Explorateur%20Tokens/PLAN-IMPLEMENTATION.md)
porte l'historique des décisions ; les invariants vérifiés sont dans
[AGENTS.md](../../AGENTS.md#explorateur-de-tokens).

## Lecture seule

Le plugin ne crée, ne supprime et ne modifie aucun calque, aucune variable ni
aucune collection, et ne range aucune donnée de plugin dans le fichier.

Il fait un seul import : la variable de bibliothèque qu'un alias vise, quand
Figma ne la rend pas par son identifiant. L'alias est celui d'une variable du
fichier, ou d'une variable liée à un calque du composant lu. L'import abonne
le fichier à cette variable, sans créer de variable locale. Aucun composant
ni aucun style n'est importé.

Le plugin ne change ni la page courante, ni la sélection, ni la vue du
designer. L'aperçu d'un composant s'exporte en mémoire par `exportAsync`.
`figma.clientStorage` reçoit la taille de la fenêtre, une par disposition, et
les préférences : vue compacte, intégrations actives,
associations du profil, exceptions, et largeurs de l'arbre et des colonnes du
nom et du type.

La simulation remplace une valeur dans une copie du relevé, en mémoire.
Réinitialiser rend le relevé lu dans Figma lui-même.

## Architecture libre

Aucun nom de collection, de groupe ou de mode n'a de sens réservé. Une
collection unique, des alias internes, plusieurs axes de modes et des
valeurs directes sont des cas ordinaires. Un fichier sans recette ni contrat
est complet : l'interface n'affiche aucune alerte d'absence d'UCM.

L'arbre suit la distinction Figma entre collections et groupes. Un groupe
vient des segments `/` du nom Figma, et de rien d'autre :

| Nom Figma | Groupes |
|---|---|
| `card/header/fill` | `card`, puis `card/header` |
| `spacing.card` | aucun : le point ne crée pas de groupe |
| `a//b` | `a`, puis un segment vide affiché « (sans nom) » |

Un groupe s'identifie par sa collection et la liste de ses segments. Deux
collections homonymes, ou deux groupes homonymes dans deux collections,
restent distincts. Choisir une collection montre toutes ses variables ;
choisir un groupe montre ses variables et celles de ses descendants. Le
chevron replie l'arbre sans changer la table.

## Lecture

| Donnée | Lecture | Limite |
|---|---|---|
| Collections et variables locales | `getLocalVariableCollectionsAsync`, `getLocalVariablesAsync` | Un type de variable inconnu des typings est écarté |
| Cible d'un alias absente du lot local | `getVariableByIdAsync`, puis sa collection par `getVariableCollectionByIdAsync` | Au plus huit lectures en vol, une par identifiant |
| Cible de bibliothèque que cette lecture ne rend pas | `importVariableByKeyAsync`, avec la clé que porte l'identifiant `VariableID:<clé>/<node>` | Échoue quand la bibliothèque ne publie plus la clé, ou sans accès à la bibliothèque |
| Collection étendue | `isExtension`, `parentVariableCollectionId`, `variableOverrides`, `parentModeId` | Résolution à confirmer dans Figma, plan Enterprise |
| Calques du composant lu et styles de texte | `boundVariables`, peintures, effets, grilles, segments de texte | Réactions, valeurs par défaut des propriétés et calques masqués des instances non lus |
| Modes d'un calque | `resolvedVariableModes`, `explicitVariableModes` | Les modes par défaut d'équipe ne sont pas exposés |
| Valeur selon Figma | `resolveForConsumer` sur un calque existant | Aucune chaîne, la valeur seule |

Une cible que ni la lecture ni l'import ne rendent reste « introuvable » ;
elle reste « refusée », avec son message, quand la lecture a levé. Ni l'une
ni l'autre ne prouve une suppression. Le relevé ne lit pas les bibliothèques par `figma.teamLibrary` :
ses listes ne donnent ni valeur ni chaîne.

Figma numérote les modes par fichier : le mode d'une bibliothèque peut porter
l'identifiant d'un mode local. Quand plusieurs collections déclarent le même
identifiant, la collection locale le garde, et chaque collection distante le
reçoit préfixé du sien. Un calque porte ses modes sous les identifiants de
Figma : la [vue composant](#vue-composant) leur applique ce renommage avant de
résoudre.

Figma ne signale pas les changements de variables sans charger toutes les
pages (`documentchange`). Le relevé se relit au geste « Actualiser » ; le pied
de la fenêtre affiche l'heure et le numéro du relevé. Après un échec, la
donnée précédente reste affichée et l'échec s'annonce.

Chaque demande de l'interface porte un numéro. Une réponse d'une demande
remplacée est ignorée ; une annulation ne publie aucun résultat partiel.

## Résolution

Un contexte choisit au plus un mode par famille, c'est-à-dire une collection
et ses extensions. Pour chaque étape de la chaîne :

1. un calque réel impose son mode explicite ou hérité, quand la résolution
   part d'un calque ;
2. sinon, le contexte donne le mode de la famille ;
3. sinon, la collection prend son `defaultModeId`, jamais sa première
   colonne.

Un mode d'une collection n'est jamais rapproché par son nom d'un mode d'une
autre collection. Un mode d'extension lit la surcharge de l'extension, puis
remonte au mode parent de la base.

Le contexte actif est le contexte A de l'onglet Comparer. La table,
l'inspecteur et les diagnostics le suivent ; tant que le designer n'y choisit
rien, chaque famille prend son mode par défaut. Une colonne de la table impose
son mode à sa famille ; les autres familles suivent le contexte actif.

Le résultat est l'un des états suivants, chacun avec les étapes connues :

| État | Sens |
|---|---|
| `resolu` | La chaîne aboutit à une valeur du type de la variable de départ |
| `inaccessible` | Un alias vise une variable que le relevé n'a pu ni lire ni importer |
| `mode-absent` | Une variable n'a aucune valeur pour le mode retenu |
| `cycle` | Le chemin revient sur un couple variable–mode déjà parcouru |
| `type-incompatible` | Un alias vise un autre type, ou une valeur n'a pas le type déclaré |
| `non-pris-en-charge` | Une valeur que le plugin ne sait pas évaluer ; sa donnée source reste lisible |
| `interrompu` | La chaîne dépasse 10 000 étapes ; elle n'est pas déclarée cyclique |

Deux branches qui atteignent la même cible ne forment pas un cycle. Zéro,
`false`, la chaîne vide et l'alpha sont des valeurs comme les autres.

Un alias de couleur peut porter une opacité, que Figma range sous la forme
`{ color: <alias>, opacity }`, de 0 à 1. L'opacité multiplie l'alpha de la
couleur terminale ; plusieurs opacités sur une chaîne se multiplient. La
cellule et la chaîne affichent l'opacité à côté de la cible. Borne : la règle
de multiplication n'a pas été comparée à Figma sur une cible déjà
transparente ; la marque d'écart de la [vue composant](#vue-composant) donne
la valeur que Figma rend. Une forme voisine, clé en plus ou opacité hors de 0 à 1, reste
« non prise en charge ».

### Comparer deux contextes

L'onglet Comparer porte les sélecteurs de mode des deux contextes, un par
famille à plusieurs modes. La comparaison nomme la première étape où les chaînes visent des variables
différentes, et l'étape antérieure dont le mode a changé. Elle dit ensuite si
les valeurs terminales sont égales. Quand l'un des contextes n'aboutit pas,
aucune égalité n'est affirmée.

### Copier

| Commande | Texte copié |
|---|---|
| Valeur | Nombre sans unité, `true` ou `false`, texte tel quel, couleur en composantes |
| Hexadécimal | Huit bits par canal ; l'annonce dit quand la conversion arrondit |
| Composantes | `rgba(r, g, b, a)`, composantes de Figma |
| Chaîne | Une étape par ligne, puis la valeur ou le constat |
| Donnée source | La valeur rangée du premier mode, en JSON |
| Référence publiée | `{chemin}`, seulement avec un `tokens.json` importé qui le porte |

Un refus du presse-papiers laisse le texte dans une zone sélectionnable. Le
succès ne s'annonce qu'après une copie réussie.

## Diagnostics

Le diagnostic résout chaque variable dans chaque mode de sa collection, les
autres familles au contexte actif. Les départs qui butent sur la même
cause forment un constat : un par ensemble de variables d'un cycle, un par
cible inaccessible. Chaque constat nomme la variable en cause et un geste ;
aucune réparation n'est faite.

Le rapport exporté (`ucm-explorateur/rapport`, version 1) garde le fichier, la
révision, le contexte, la portée, les chemins et les constats, avec les
identifiants Figma. Ce n'est ni un contrat ni un export de tokens.

## Contraste

Le contraste se juge sur une paire choisie, dans le contexte actif,
contre un seuil de 3, 4,5 ou 7. Seules deux couleurs opaques en sRGB se
jugent ; le calcul et la comparaison au seuil sont ceux de
`@ucm-kit/core/emplois`.

## Vue composant

Le designer sélectionne un composant dans Figma. La vue affiche ce composant
et ses tokens, un composant à la fois, et suit la sélection. Elle indexe le
relevé des seules variables atteintes depuis ce composant : elle ne dépend pas
du relevé du fichier, et fonctionne dans un fichier sans variable locale.

| Sujet | Règle |
|---|---|
| Sujet lu | Le calque sélectionné s'il est `COMPONENT`, `INSTANCE` ou `COMPONENT_SET`, sinon son plus proche ancêtre de l'un de ces types. Hors de tout composant, la vue invite à en sélectionner un |
| Sélection multiple | Le premier calque décide du sujet ; le pied compte les autres |
| Jeu de variants | La lecture porte sur `defaultVariant`. Un variant prend le nom de son jeu, et l'en-tête propose de relire un autre variant |
| Frontière | Toute `INSTANCE` strictement sous le sujet, une icône comprise. Ses calques ne sont pas parcourus : la vue nomme le composant, compte ses instances et l'ouvre au clic |
| Surcharge du parent | Une liaison que le parent pose dans une instance frontière se lit sur le calque que `InstanceNode.overrides` désigne, pour les seuls champs surchargés. Elle se rattache au calque de l'instance |
| Ligne | Une par couple variable et chaîne de modes. Deux calques qui portent la même variable sous deux modes donnent deux lignes ; `×N` compte les calques |
| Style de texte | Un calque de texte qui porte un style donne une ligne par style. Les variables du style ne font pas de liaison du calque |
| Nature | Couleur, forme, espacement, taille, texte, d'après la propriété liée ; toute autre propriété va dans « Autre » |
| Portée | Un calque sélectionné sous le sujet déjà lu restreint la vue à ce calque et à ses descendants, sans relecture |
| Valeur sans token | Peinture unie visible, rayon, épaisseur d'un contour visible, écart et marges d'un auto-layout, taille d'un texte sans style, quand aucune variable ne lie la propriété |

Au-delà de 12 lignes dans la portée, chaque section s'ouvre repliée sur un
résumé : une pastille par couleur, les valeurs distinctes des nombres, les
noms des styles.

**Variables.** Une variable liée à un calque se lit par
`getVariableByIdAsync` et ne s'importe jamais. Les cibles de ses alias suivent
la règle de la section [Lecture](#lecture). Une variable que Figma ne rend pas
donne une ligne dont la chaîne s'arrête sur sa cause, sans valeur.

**Modes.** Chaque ligne se résout avec les modes du calque qui la porte,
explicites ou hérités. Un style de texte se résout avec ceux du premier calque
qui le porte.

**Écart avec Figma.** Le sandbox joint à chaque liaison la valeur de
`resolveForConsumer` sur son calque. Quand elle diffère de celle de la chaîne,
la ligne garde la valeur de la chaîne et porte une marque ; dépliée, elle
donne les deux. Une chaîne qui n'aboutit pas ne produit aucun écart.

**Volume.** Les calques se lisent par lots de 400, avec une pause entre deux
lots, et une nouvelle sélection annule la lecture en cours. Au-delà de 2 000
calques, la lecture s'arrête et le pied compte les calques non lus.

**Aperçu.** L'image du sujet s'exporte par `exportAsync`, large de 720 px au
plus, et arrive après la liste. Le survol d'une ligne entoure ses calques :
leur boîte vient d'`absoluteBoundingBox`, rapportée à `absoluteRenderBounds`
du sujet. Sans image, la zone disparaît ; sans boîte, le calque n'a pas de
cadre.

Aucune de ces lectures n'a été essayée dans Figma. La
[recette](../../docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Vue%20composant/RECETTE-VUE-COMPOSANT.md)
les reprend une à une.

## Intégrations facultatives

| Intégration | Activation | Ce qu'elle ajoute |
|---|---|---|
| Contrats et `tokens.json` | Import de fichiers, en mémoire | Correspondance publiée, occurrences contractuelles, écarts avec l'export |
| Recette UCM Palettes | Interrupteur, rangé dans les préférences | Classement de la recette ; association explicite d'une variable à un cran ; variables de dossier du cran |
| Profil d'architecture UCM | Interrupteur et association de chaque collection à une couche | Couches visées, valeurs directes, portées, nuance attendue |

Désactiver une intégration retire ses constats et ses sections de
l'inspecteur, sans changer la table ni la navigation.

**Contrats et tokens.** Un fichier dépasse 20 Mo, ou l'ensemble 50 Mo : il
est refusé, et les imports précédents restent. Un contrat se juge par
`@ucm-kit/core/lecteurs/navigateur`, comme `ucm check` le juge : la fenêtre de
versions du kit, puis `champsInvalidesDuContrat`, champ par champ. Le JSON
Schema n'est pas appliqué : son lecteur charge le schéma depuis le disque. Ses
références se relèvent hors de `samples` et `meta`, chacune avec son adresse,
ses variants et sa propriété. Une variable se rapproche d'un token par le
chemin qu'UCM Exporter publie (`joinTokenPath` du socle), jamais par sa
valeur ; deux variables qui donnent le même chemin rendent un rapprochement
ambigu. La comparaison avec l'export porte sur le type, puis sur l'alias ou
la valeur de chaque mode ; un écart peut venir d'un export antérieur.

**Recette UCM Palettes.** Le texte rangé sous `ucm_palettes/recette` se
classe par `classerRecette` d'`ucm-couleur`, sans migration. La recette ne
dit pas quelle variable porte quel cran : le designer associe une variable
de couleur à une palette, une intensité, un thème et un cran. Aucune
association ne se déduit d'une teinte ou d'une égalité de couleurs.
L'inspecteur liste alors les variables de `theme` que la table en dossiers
confie à ce cran (`variablesDuCran`, `@ucm-kit/core/emplois`), dans le sens du
thème associé, normal ou inversé selon `texteDesBoutons` de la recette. Le
neutre ajoute `page/foreground-main`, `page/foreground-subtle`, `scale/0`,
`scale/1000` et `disabled/*`. Un cran qu'aucune variable ne vise, comme 50,
400 ou 950, ne liste rien.

**Profil UCM.** Les cinq couches et leurs cibles suivent l'architecture
multimarque : `components` vise `theme`, `theme` vise `color-brands` ou
`color-utilities`, qui visent `primitives`. Une association rangée sous
`brand` se lit `color-brands` ; une couche `usage`, disparue, se lit sans
couche. Le profil contrôle quatre règles, en information :

| Règle | Écart relevé |
|---|---|
| `couche` | Un alias vise une couche que sa couche ne peut pas viser |
| `valeur-directe` | Une couleur hors de `primitives` n'est pas un alias |
| `portee` | Une variable de `primitives`, `color-brands` ou `color-utilities` porte une portée ; une variable de dossier de `theme` n'a pas les portées de sa ligne de la table |
| `nuance` | Une variable de dossier de `theme` ne vise pas, dans un mode `light` ou `dark`, le cran que la table donne dans le sens de ce mode |

Les variables de dossier (`solid/default`, `surface/border`, `page/focus`),
leurs crans et leurs portées viennent de `@ucm-kit/core/emplois` ; le sens du
mode vient de `texteDesBoutons` dans la recette associée. `scale/0`,
`scale/1000`, `elevation/*` ne visent aucun cran et ne se jugent pas par
nuance ; les deux premières ne portent aucune portée. Une collection sans
couche n'est pas contrôlée, et le designer peut ignorer un écart pour ce
fichier.

## Relevés et simulation

Le relevé s'exporte en JSON (`ucm-explorateur/releve`, version 1) et se
réimporte pour comparaison. Deux variables se rapprochent par identifiant,
puis par clé publiée. Un nom égal ne fait qu'une proposition, que le designer
confirme. Un renommage reste un renommage.

## Interface

L'interface est en français et toujours sombre. Les modes Light, Dark ou
Jour des données ne changent que les valeurs et les pastilles.

La fenêtre a deux dispositions, une par mode. La barre du haut porte le
produit et la bascule « Tokens » / « Composant », présente dans les deux. Le
sandbox choisit la disposition d'ouverture avant d'afficher la fenêtre : étroite
dans un fichier sans variable locale, large sinon. La bascule demande l'autre
disposition ; le sandbox donne alors à la fenêtre la taille rangée pour elle.
Chacune range sa taille sous sa propre clé.

| Disposition | Mode | Ouverture | Minimum | Contenu sous la barre |
|---|---|---|---|---|
| Large | Tokens | 1200 × 800 | 560 × 480 | Arbre, onglets et inspecteur ; Actualiser dans la barre |
| Étroite | Composant | 364 × 724 | 320 × 420 | La vue composant, sous une barre de 44 px |

La recherche est dans l'arbre, sous son titre, et porte sur toutes les
collections. Les onglets sont Variables, Comparer, Dépendants, Diagnostics,
Intégrations et Relevés.

Dans la disposition large, sous 900 px de large, l'inspecteur passe au-dessus
de la table et se ferme. Le dessin de la vue composant suit la
[maquette](../../docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Vue%20composant/MAQUETTE-VUE-COMPOSANT.html) ;
`npm run fidelite --workspace ucm-explorateur-plugin` mesure l'écart entre les
deux.

Une cellule de la table tient sur une ligne. Une valeur directe s'affiche
seule. Un alias s'affiche en bouton, avec la pastille de la couleur qu'il
rend, suivi de la valeur rendue ou du statut de la chaîne.

Une poignée règle la largeur de l'arbre et celle de chaque colonne de la
table : à la souris, ou par les flèches Gauche et Droite, 16 px par appui. Un
double clic rend la largeur par défaut.

| Largeur | Défaut | Bornes | Durée |
|---|---|---|---|
| Arbre | 220 px | 140 à 480 px, et 40 % de la fenêtre au plus | Préférences |
| Colonne du nom | 240 px | 120 à 640 px | Préférences |
| Colonne du type | 84 px | 60 à 200 px | Préférences |
| Colonne de valeur | 220 px, plus la place libre | 120 à 800 px | Jusqu'à la fermeture du plugin |

La largeur d'une colonne de valeur ne se range pas : un identifiant de mode
se répète d'un fichier à l'autre.
