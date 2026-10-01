# Spécification de l'explorateur de tokens

UCM Token Explorer lit les variables d'un fichier Figma et explique leurs
valeurs : collections, groupes, alias, modes, consommateurs. Ce document
décrit ce que le plugin lit, comment il résout une chaîne et ce qu'il refuse
de conclure. Le [plan d'implémentation](../../docs/notes/Recherches/Plugin%20Explorateur%20Tokens/PLAN-IMPLEMENTATION.md)
porte l'historique des décisions ; les invariants vérifiés sont dans
[AGENTS.md](../../AGENTS.md#explorateur-de-tokens).

## Lecture seule

Le plugin n'écrit jamais dans le document. Il ne crée, ne supprime et ne
modifie aucun calque, aucune variable ni aucune collection. Il n'importe
aucune variable distante et ne range aucune donnée de plugin dans le fichier.

Le geste « Afficher dans Figma » change la page courante, la sélection et la
vue, sans toucher au document. `figma.clientStorage` reçoit la taille de la
fenêtre et les préférences : vue compacte, intégrations actives, associations
du profil et exceptions.

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
| Collection étendue | `isExtension`, `parentVariableCollectionId`, `variableOverrides`, `parentModeId` | Résolution à confirmer dans Figma, plan Enterprise |
| Calques et styles liés | `boundVariables`, peintures, effets, grilles, segments de texte, styles locaux | Réactions, valeurs par défaut des propriétés et calques masqués des instances non lus |
| Modes d'un calque | `resolvedVariableModes`, `explicitVariableModes` | Les modes par défaut d'équipe ne sont pas exposés |
| Valeur selon Figma | `resolveForConsumer` sur un calque existant | Aucune chaîne, la valeur seule |

Une cible que Figma ne rend pas reste « introuvable » ; une lecture qui lève
reste « refusée », avec son message. Ni l'une ni l'autre ne prouve une
suppression. Le relevé ne lit pas les bibliothèques par `figma.teamLibrary` :
ses listes ne donnent ni valeur ni chaîne.

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

Une colonne de la table impose son mode à sa famille ; les autres familles
suivent le contexte de la barre.

Le résultat est l'un des états suivants, chacun avec les étapes connues :

| État | Sens |
|---|---|
| `resolu` | La chaîne aboutit à une valeur du type de la variable de départ |
| `inaccessible` | Un alias vise une variable que le relevé n'a pas pu lire |
| `mode-absent` | Une variable n'a aucune valeur pour le mode retenu |
| `cycle` | Le chemin revient sur un couple variable–mode déjà parcouru |
| `type-incompatible` | Un alias vise un autre type, ou une valeur n'a pas le type déclaré |
| `non-pris-en-charge` | Une valeur que le plugin ne sait pas évaluer ; sa donnée source reste lisible |
| `interrompu` | La chaîne dépasse 10 000 étapes ; elle n'est pas déclarée cyclique |

Deux branches qui atteignent la même cible ne forment pas un cycle. Zéro,
`false`, la chaîne vide et l'alpha sont des valeurs comme les autres.

### Comparer deux contextes

La comparaison nomme la première étape où les chaînes visent des variables
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
autres familles au contexte de la barre. Les départs qui butent sur la même
cause forment un constat : un par ensemble de variables d'un cycle, un par
cible inaccessible. Chaque constat nomme la variable en cause et un geste ;
aucune réparation n'est faite.

Le rapport exporté (`ucm-explorateur/rapport`, version 1) garde le fichier, la
révision, le contexte, la portée, les chemins et les constats, avec les
identifiants Figma. Ce n'est ni un contrat ni un export de tokens.

## Consommateurs

L'analyse porte sur la sélection, la page courante ou le document, au choix
du designer. Seul le document charge les autres pages et lit les styles
locaux. Un calque atteint par deux chemins compte une fois ; le résultat
distingue le nombre de consommateurs du nombre de propriétés liées. Une
variable liée à un calque est rapprochée du token inspecté directement, ou par
sa chaîne résolue avec les modes du calque.

« Aucun trouvé dans le périmètre analysé » ne prouve pas qu'une variable est
inutilisée, et rien n'est proposé à la suppression.

Le contraste se juge sur une paire choisie, dans le contexte de la barre,
contre un seuil de 3, 4,5 ou 7. Seules deux couleurs opaques en sRGB se
jugent ; le calcul et la comparaison au seuil sont ceux de
`@ucm-kit/core/emplois`.

## Intégrations facultatives

| Intégration | Activation | Ce qu'elle ajoute |
|---|---|---|
| Contrats et `tokens.json` | Import de fichiers, en mémoire | Correspondance publiée, occurrences contractuelles, écarts avec l'export |
| Recette UCM Palettes | Interrupteur, rangé dans les préférences | Classement de la recette ; association explicite d'une variable à un cran ; emplois du cran |
| Profil d'architecture UCM | Interrupteur et association de chaque collection à une couche | Couches visées, valeurs directes, portées, cible attendue, calques hors des couches citées |

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

**Profil UCM.** Les couches et leurs cibles suivent l'architecture
multimarque : `components` vise `usage`, `usage` vise `theme`, `theme` vise
`brand` ou `color-utilities`, qui visent `primitives`. Les emplois, rangs et
supports viennent de `@ucm-kit/core/emplois`. Une collection sans couche
n'est pas contrôlée, et le designer peut ignorer un écart pour ce fichier.

## Relevés et simulation

Le relevé s'exporte en JSON (`ucm-explorateur/releve`, version 1) et se
réimporte pour comparaison. Deux variables se rapprochent par identifiant,
puis par clé publiée. Un nom égal ne fait qu'une proposition, que le designer
confirme. Un renommage reste un renommage.

Le graphe local montre les cibles et les dépendants de la variable
inspectée, déployés à la demande, au plus 200 nœuds au premier affichage. Ses
arêtes actives sont celles de la chaîne que la table résout.

## Interface

L'interface est en français et toujours sombre. Les modes Light, Dark ou
Jour des données ne changent que les valeurs et les pastilles. La fenêtre
s'ouvre à 1200 × 800 et descend jusqu'à 560 × 480 ; sous 900 px de large,
l'inspecteur passe au-dessus de la table et se ferme.
