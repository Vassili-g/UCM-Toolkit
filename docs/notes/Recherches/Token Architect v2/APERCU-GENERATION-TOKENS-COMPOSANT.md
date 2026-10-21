# Aperçu : générer les tokens d'un composant

Ce document décrit ce que donnerait la fonction C28 du
[document préparatoire](./PREPARATION-TOKEN-ARCHITECT.md) (question Q6), pour
que le mainteneur décide de la construire ou non. Rien n'est construit.

## En bref

Aujourd'hui, pour Alert, le designer fait trois choses à la main :
1. Dans le fichier des tokens, il crée 36 variables.
2. Pour chacune, il choisit le token du thème qu'elle vise.
3. Dans le fichier des composants, il lie chaque calque à sa variable.

Avec la génération, le plugin prépare la liste des 36 variables : leur nom et
le token du thème que chacune vise. Il lit pour cela les variantes et les
calques du composant. Il pose une seule question par style : « Filled : quel
fond ? Plein, teinté ou aucun ? ». Le designer ouvre ensuite le fichier des
tokens et clique Créer. Après la publication de la bibliothèque, il revient au
composant et clique Lier.

Le plugin ne peut écrire que dans le fichier ouvert. La liste préparée passe
donc d'un fichier à l'autre par la mémoire du plugin, sur le poste du
designer.

## Sur quoi le plugin se base

La génération part d'un composant déjà dessiné : ses variants existent, et ses
calques sont peints, avec des couleurs en dur ou des tokens faux.

Décidé : le plugin ne fait aucune supposition. Il ne propose que ce qu'une
règle écrite tire d'un fait lu dans Figma, avec un seul résultat possible.
Tout le reste est une question, sans réponse cochée d'avance.

| Information | Règle | Exact quand | Question quand |
|---|---|---|---|
| Valeur de variante | Lue dans les propriétés du jeu : `Severity=Error`, `Variant=Filled` | Toujours | Jamais |
| Palette | Valeur de variante reconnue par un registre : `error` est une forme tolérée de `danger` | La valeur est dans un registre | La valeur est inconnue : `Severity=Brand` |
| Rôle d'un texte | La couleur d'un calque de texte donne `foreground` | Toujours | Jamais |
| Rôle du fond | Le fond du composant lui-même donne `background` | Le calque est la racine du variant | Le calque est un cadre imbriqué : voir « Élément » |
| Rôle d'une icône | La couleur d'un vecteur placé dans une instance d'icône donne `icon` | Le vecteur est dans une instance | Le vecteur est libre |
| Rôle d'un contour | Un contour donne `border` ; `ring` seulement si le calque s'appelle `ring` ou `focus-ring` | Le nom tranche | Un contour visible au seul variant `focus`, sous un autre nom |
| Élément | Le nom du calque, quand deux calques du même rôle ont des couleurs différentes | Le calque porte un nom donné par le designer : `title`, `message` | Le calque porte un nom par défaut de Figma : `Frame 12`, `Rectangle 3` |
| Dossier du thème | La réponse du designer, une par valeur de style | Le designer a répondu | Toujours posée, sans réponse cochée |
| Taille | Le champ donne la famille (marge et écart : `sizing` ; arrondi : `radius` ; épaisseur de contour : `stroke`), puis la valeur en pixels donne le token de cette famille qui a exactement cette valeur | Un seul token de la famille a la valeur | Aucun token, ou plusieurs, ont la valeur |

La couleur actuelle d'un calque n'intervient dans aucune proposition.

À l'étape « Lier », le plugin ne cherche plus rien. Le plan garde, pour chaque
variable, l'identifiant du calque qui l'a produite. Si le designer a modifié
le composant entre-temps, un calque disparu se retrouve par son nom et son
rôle, ou devient une question.

| Cas | Ce que fait le plugin |
|---|---|
| Rôle clair, palette reconnue, style répondu | Proposition marquée « Exact » |
| Valeur de variante inconnue des registres (`Severity=Brand`) | Question : quelle palette ? |
| Deux calques du même rôle, de couleurs différentes, aux noms vagues | Question : nommer les deux éléments |
| Forme décorative, dégradé, image, calque masqué | Ignorée, et listée dans l'aperçu |
| Composant pas encore peint | Les rôles se lisent encore ; les questions restent les mêmes |

## Le besoin

Un composant UCM lie ses couleurs à des variables de la collection
`components`, qui visent le thème. Le designer crée aujourd'hui ces variables
une à une, puis pose chaque alias. Pour Alert, le fichier de référence en
compte 36 :

```
components/alert/colors/{error|info|success|warning}/filled/{background|foreground|icon}
components/alert/colors/{error|info|success|warning}/outlined/{border|foreground|icon}
components/alert/colors/{error|info|success|warning}/standard/{background|foreground|icon}
```

Token Architect lirait la structure du composant et proposerait ces 36
variables, chacune avec son alias vers le thème.

## Ce que le plugin déduit, et ce qu'il demande

| Information | Source | Exemple pour Alert |
|---|---|---|
| Nom du composant | Nom du jeu de variants | `alert` |
| Axes qui changent les couleurs | Propriétés de variante dont les variants ont des couleurs différentes | `Severity`, `Variant` |
| Valeurs d'axe | Valeurs des propriétés, normalisées par le kit | `error`, `info`, `success`, `warning` ; `filled`, `outlined`, `standard` |
| Rôle de chaque calque peint | Champ peint : fond de cadre, fond de texte, contour, vecteur d'une icône | `background`, `foreground`, `border`, `icon` |
| Palette de chaque valeur | Valeur reconnue par le registre des statuts ou des palettes de marque | `error` donne la palette `danger` |
| Dossier du thème de chaque style | **Question** au designer, une par valeur de style | `filled` : plein (`solid`) ; `standard` : teinté (`surface`) ; `outlined` : aucun fond (`page`) |
| État | Axe d'état, s'il existe (`STATE_SELECTORS`) | Alert n'en a pas ; Button aurait `default`, `hover`, `pressed` |

Le dossier ne se déduit pas d'un nom : `outlined` peut poser son texte sur la
page ou sur une teinte. Le plugin pose donc une question par valeur de style.
Pour Alert, cela fait trois questions. Les 36 alias en découlent par la règle
du dossier : le premier plan prend le dossier du fond juste derrière lui.

| Variable générée | Alias proposé |
|---|---|
| `components/alert/colors/error/filled/background` | `theme/danger/solid/default` |
| `components/alert/colors/error/filled/foreground` | `theme/danger/solid/foreground` |
| `components/alert/colors/error/standard/background` | `theme/danger/surface/default` |
| `components/alert/colors/error/standard/foreground` | `theme/danger/surface/foreground` |
| `components/alert/colors/error/outlined/border` | `theme/danger/page/border` |
| `components/alert/colors/error/outlined/foreground` | `theme/danger/page/foreground` |

Les chemins du thème suivent la table des dossiers du kit
(`emplois/dossiers.ts`). Le plugin vérifie que chaque cible existe dans la
bibliothèque avant de la proposer.

## Le parcours

Le composant et les tokens vivent dans deux fichiers. Le parcours passe donc
par les deux.

| Étape | Fichier | Ce que fait le designer | Ce que fait le plugin |
|---|---|---|---|
| 1 | Composants | Sélectionne Alert, clique « Préparer les tokens » | Lit le composant, pose les trois questions, montre les 36 variables et leurs alias |
| 2 | Composants | Valide le plan | Range le plan dans `figma.clientStorage` |
| 3 | Tokens | Ouvre Token Architect | Annonce « Un plan attend : Alert, 36 variables » dans la barre latérale |
| 4 | Tokens | Relit l'aperçu, clique Créer | Crée les variables qui manquent, pose les alias, ouvre un point d'annulation |
| 5 | Tokens | Publie la bibliothèque dans Figma, comme après toute modification des tokens | Rien |
| 6 | Composants | Clique « Lier » | Lie chaque calque à sa variable ; les noms viennent de la structure, la correspondance est exacte |

`figma.clientStorage` appartient au plugin et à l'utilisateur, pas au
fichier : le plan préparé dans un fichier se relit dans l'autre, sans
copier-coller ni réseau. Il ne passe pas d'un poste à l'autre, ni d'un
designer à l'autre.

Esquisse de l'étape 1, dans la barre latérale du mode Composant :

```
Préparer les tokens d'Alert
───────────────────────────
3 questions

Variant = Filled : quel fond ?
  ( ) Plein   ( ) Teinté   ( ) Aucun

Variant = Standard : quel fond ?
  ( ) Plein   ( ) Teinté   ( ) Aucun

Variant = Outlined : quel fond ?
  ( ) Plein   ( ) Teinté   ( ) Aucun

36 variables à créer
  error / filled / background   danger · solid · default
  error / filled / foreground   danger · solid · foreground
  …
                      [ Préparer ]
```

Esquisse de l'étape 4, dans la barre latérale du mode Tokens :

```
Plan en attente : Alert
───────────────────────
Collection components · 36 variables

Créées         34
Déjà présentes  2   (gardées telles quelles)

  alert/colors/error/filled/background   theme/danger/solid/default
  …
                 [ Annuler le plan ]  [ Créer ]
```

## Les variantes du parcours

| Transfert du plan | Avantage | Limite |
|---|---|---|
| `figma.clientStorage` (proposé) | Aucun geste entre les deux fichiers | Même designer, même poste |
| Copier un texte dans le mode Composant, le coller dans le mode Tokens | Passe d'un designer à l'autre | Un geste de plus |
| Lire le contrat publié par l'exporteur, depuis le mode Tokens | Le plan suit le contrat publié | Demande l'accès réseau et la configuration du repository ; le composant doit déjà être exporté |
| Composant et tokens dans le même fichier | Un seul passage | Ce n'est pas l'organisation du mainteneur |

## Ce qu'il faut avant de la construire

- **Une forme de chemin pour `components` dans le kit.** `FORMES_DES_CHEMINS`
  décrit les six autres collections et exclut `components`. Il faut décider
  l'ordre des segments : composant, famille (`colors`), axes, état, rôle.
  Ce prérequis sert aussi aux contrôles de nommage et de mapping en full UCM.
- **L'ordre des axes dans le chemin.** Alert met `Severity` avant `Variant`.
  Une règle est à choisir : l'ordre des propriétés dans Figma, ou un ordre fixe
  (palette d'abord, puis style, puis état).
- **Une écriture de variables dans le mode Tokens.** Nomenclature renomme
  seulement. Palettes crée déjà des variables et pose des alias : son écriture
  sert de modèle.
- **Le contrôle C24 (propagation) et le mapping par structure (C25)**, qui
  font l'étape 6.

## Coût et risques

| Sujet | Estimation |
|---|---|
| Forme des chemins de `components` dans le kit | Moyen ; sert aussi aux contrôles |
| Calcul du plan (pur, testé hors de Figma) | Moyen |
| Questions et aperçu dans les deux modes | Moyen ; reprend les écrans de Nomenclature |
| Écriture des variables et des alias | Moyen ; reprend l'écriture de Palettes |
| Mise à jour d'un composant déjà généré : valeur d'axe ajoutée, tokens devenus orphelins | Faible, si le plan ne crée que ce qui manque |

Risques :
- Une réponse fausse à une question produit des alias faux sur toute une
  valeur de style. L'aperçu et l'annulation les rattrapent avant et après la
  création.
- Un composant à beaucoup d'axes produit beaucoup de variables. Un Button à six
  palettes, trois styles et trois états en donne environ 200. Le plan doit
  montrer le nombre avant de préparer.
- Un nom généré peut entrer en conflit avec un token existant. Le plan garde
  l'existant et ne crée que ce qui manque.

## Avis

La génération supprime la tâche la plus longue de la création d'un composant :
taper les noms et poser les alias un par un. Elle produit des noms qui suivent
la structure du composant. La liaison de l'étape 6 devient alors exacte, sans
heuristique. Elle demande une question par valeur de style, et une question
par fait que les règles ne tranchent pas.

Elle dépend de la forme des chemins de `components` dans le kit, à décider de
toute façon pour les contrôles en full UCM. Elle viendrait après la
propagation (phase P3), dont elle reprend le modèle d'aperçu.

Recommandation : la construire, après P3, avec le transfert par
`figma.clientStorage`.

## Décisions

| # | Question | Réponse |
|---|---|---|
| G-1 | Construire la génération ? | Oui, après P3 |
| G-2 | Forme d'un chemin de `components` | Celle de [GRAMMAIRE-DES-COMPOSANTS.md](./GRAMMAIRE-DES-COMPOSANTS.md) |
| G-3 | Passage de la liste du fichier des composants au fichier des tokens | Par `figma.clientStorage`, avec le copier-coller en secours |
| G-4 | Générer aussi les dimensions ? | Oui, après les couleurs |

La liste des variables à créer se prépare dans le fichier des composants, qui
contient le composant. Les variables se créent dans le fichier des tokens : un
fichier ne peut pas modifier les variables d'une bibliothèque, et un plugin
n'écrit que dans le fichier ouvert.
