# Audit complet d'UCM Architect

Cet audit cherche ce qui peut abîmer les variables d'un fichier Figma ou le
`tokens.json` qui en sort, quand le designer n'a pas de copie de secours. Il
couvre le chemin d'écriture du sandbox, la frontière avec l'écran, le moteur du
kit qui calcule les nouveaux noms, et les deux voisins qu'un renommage touche :
UCM Palettes et l'export DTCG de l'Exporter.

Les chemins `src/…` partent du dossier du plugin. Les défauts marqués
« rejoué » ont été reproduits sur le code réel, session et kit compris, avec
un Figma factice ; les scripts sont hors du dépôt. Les autres sont lus dans le
code. `npm test` du plugin passe (260 tests) : aucun de ces défauts n'est
couvert par un test.

## Synthèse

| Code | Sévérité | Défaut | Preuve |
|---|---|---|---|
| AC1 | Haute | Un renommage crée deux variables que `tokens.json` confond ; l'export en perd une | rejoué |
| AC2 | Haute | Un renommage donne à une variable le nom du groupe d'une autre ; l'export en perd une | rejoué |
| AC3 | Haute | Une entrée du journal dépasse 100 kB dès que les noms ont des accents ; le lot n'est plus annulable par le plugin | rejoué |
| AC4 | Haute | Un journal écrit à moitié se mélange au précédent ; « Annuler » remet des noms du lot d'avant et laisse ceux du dernier | rejoué |
| AC5 | Moyenne | Un terme peut contenir `/` ; le renommage déplace la variable dans un autre groupe | rejoué |
| AC6 | Moyenne | Avec le séparateur « inchangé », un terme de deux mots colle les mots : `foo-bar-baz` devient `fooqux` | rejoué |
| AC7 | Moyenne | Les variables qu'UCM Palettes a reprises ne sont pas protégées ; Palettes remet son nom à la prochaine écriture | lu |
| AC8 | Moyenne | Aucun contrôle du nom final avant l'écriture : `.`, `{`, `}`, `$`, nom vide | lu |
| AC9 | Basse | « Annuler » efface le journal des renommages sautés ; ils ne se rattrapent plus | lu |
| AC10 | Basse | « Annuler » de la Configuration part sans confirmation et reste actif pendant la demande | lu |
| AC11 | Basse | Un geste avec un terme vide range une entrée `terme:` illisible dans le fichier | rejoué |
| AC12 | Basse | L'import remplace l'écriture du fichier et les termes de même nom, sans retour arrière | lu |
| AC13 | Basse | Le contrôle des doublons à l'écriture lit l'inventaire relu, pas les objets ouverts | lu |

Aucun défaut ne supprime une variable, une valeur ou un mode : le plugin ne
touche qu'au `name`, et `tests/loiDEcriture.test.ts` refuse toute autre
mutation. Les dommages possibles sont un token absent de `tokens.json` (AC1,
AC2), un groupe changé (AC5, AC6) et une annulation fausse ou impossible (AC3, AC4).
Le Ctrl+Z de Figma reste disponible tant que le fichier est ouvert : chaque
lot se termine par `commitUndo()`.

## Défauts

### AC1 · Doublon invisible pour Architect, réel pour `tokens.json`

`retirerLesDoublons` (`src/ecriture.ts:85`) et `cleDestination`
(`packages/kit/src/referentiel/lexique.ts:108`) comparent les noms exacts.
L'export construit le chemin d'un token par `normalizeName`
(`packages/kit/src/format/names.ts:3`) : minuscules, blancs en tirets, `/` en
`.`. Quand deux chemins sont égaux, il garde le premier et signale l'autre
(« Seul le premier est exporté », `exportTokens.ts:448`).

Rejeu : casse et séparateur « inchangés », terme `bg` remplacé par
`background`. `bg/primary` devient `background/primary` à côté de
`Background/primary`. Figma accepte les deux noms ; `normalizeName` rend
`background.primary` pour les deux. Même résultat avec `background /primary`.

Les collections ramenées à un nom UCM ne produisent pas ce cas dans les
essais : elles prennent toutes le même nom exact et le contrôle les bloque.

### AC2 · Variable et groupe de même nom

Aucun contrôle ne compare le nom final d'une variable aux groupes des autres.
L'export refuse un token dont le nom est le groupe d'un autre
(`exportTokens.ts:434` et `:458`).

Rejeu : terme `colors` remplacé par `color`. `colors` devient `color` à côté
de `color/primary`. Architect applique ; l'export suivant perd un des deux
tokens.

### AC3 · Taille du journal mesurée en caractères

`preparerJournal` (`src/regles.ts:294`) borne chaque entrée à 90 000 unités
JavaScript. Figma borne une entrée à 100 kB, espace et clé compris, ce qu'une
mesure tierce situe à 102 400 octets UTF-8. Un `é` compte une unité et deux
octets.

Rejeu sur 3 000 renommages : 89 914 octets en ASCII, 142 208 avec des `é`,
194 528 avec des idéogrammes. Un seul renommage de deux noms de 30 000
caractères dépasse aussi la limite, et `preparerJournal` ne coupe pas à
l'intérieur d'un renommage. L'exception est rattrapée dans
`appliquerLesRenommages` (`src/ecriture.ts:216`) : le lot est écrit dans
Figma et répond `annulable: false`.

### AC4 · Journal mélangé après une écriture interrompue

Le journal se range en entrées `journal:0` à `journal:n`. L'en-tête porte
l'heure et le nombre d'entrées ; les autres entrées ne portent rien qui les
rattache à cet en-tête. `lireJournal` (`src/regles.ts:138`) accepte donc un
en-tête neuf suivi d'entrées du lot précédent.

Rejeu : lot 1 sur quatre entrées, lot 2 sur quatre entrées dont l'écriture de
`journal:1` échoue (le cas AC3 suffit à la provoquer). Le journal relu compte
149 renommages : 47 du lot 2, 102 du lot 1. « Annuler » répond `applique` :
il remet 102 noms du lot 1, que le designer n'a pas demandé d'annuler, laisse
103 variables du lot 2 renommées, puis efface le journal. Rien n'avertit le
designer.

### AC5 · Un `/` dans un terme change la hiérarchie

`estMot` (`src/regles.ts:66`) refuse le blanc et le texte vide, pas `/`. Le
geste `remplacer-par` et l'import l'acceptent.

Rejeu : terme gardé `a/b` qui remplace `quux`. `text/quux` devient `text/a/b`,
et la variable change de groupe. Un `/` dans une forme remplacée n'a pas
d'effet.

### AC6 · Séparateur perdu quand le nombre de mots change

`assembler` (`packages/kit/src/referentiel/ecriture-des-mots.ts:55`) colle
les mots quand le séparateur est « inchangé » et que le remplacement change
leur nombre.

Rejeu : terme `qux` qui remplace `bar baz`. `text/foo-bar-baz`,
`text/foo bar baz` et `text/foo_bar_baz` deviennent `text/fooqux` ;
`foo-qux-x` devient `foobarbazx` dans l'autre sens. En camelCase, `fooBarBaz`
devient `fooQux`, correct. Le nouveau nom s'affiche avant l'application et
le journal garde l'ancien : le dommage est un nom illisible, pas une perte.

### AC7 · Variables reprises par Palettes

Architect protège une variable dont la donnée partagée `palette` n'est pas
vide (`src/lectureFigma.ts:20`). Palettes ne pose cette donnée que sur les
variables qu'il crée (`plugin-palettes/src/ecriture/variables.ts:203` pour
une reprise). Les variables d'origine d'une palette reprise sont suivies par
identifiant dans la donnée `variables` de la racine, sans marque sur la
variable.

Conséquence lue dans le code : Architect les renomme ; à sa prochaine
écriture, Palettes les retrouve par identifiant et leur remet le nom de son
plan (`variables.ts:191`). Rien n'est perdu, mais le renommage ne tient pas,
et l'invariant d'`AGENTS.md` (« une variable qu'UCM Palettes a écrite n'est
jamais renommée ») n'est tenu que pour les variables créées.

### AC8 · Nom final non contrôlé

`executer` (`src/ecriture.ts:156`) écrit `nouveauNom` sans le contrôler. La
REST API de Figma refuse `.`, `{` et `}` dans un nom de variable, et une
réponse de l'équipe Figma sur le forum y ajoute `$`. Le kit ne produit pas
ces caractères dans les essais, et aucun nom vide n'est sorti (S5). Le défaut
est l'absence de garde : si une règle importée les introduit, l'écriture
lève une exception au milieu du lot. Le lot devient `partiel`, journalisé.

### AC9 · Annulation qui oublie les renommages sautés

`annulerLeDernierRenommage` (`src/ecriture.ts:230`) ne garde dans le journal
que les renommages restants après une exception. Un renommage sauté pour
collision ou parce que le fichier a changé disparaît du journal : son ancien
nom n'est plus écrit nulle part.

### AC10 · « Annuler » de la Configuration

Le bouton (`src/ui/configuration.ts:141`) part au premier clic et reste
actif. Le journal peut dater de plusieurs jours ; l'écran montre le nombre et
l'heure. Une seconde demande trouve le journal vide et répond par un refus,
sans dommage.

### AC11 · Entrée `terme:` vide

`remplacer-par` avec `par` blanc, ou `remplace-termes` avec un terme vide,
range `terme:` et `{"terme":[],"remplace":[["quux"]]}`. La lecture l'ignore ;
l'entrée reste dans le fichier.

### AC12 · Import qui remplace sans retour

`importerLesRegles` (`src/regles.ts:402`) valide tout l'export avant
d'écrire, et un fichier invalide ne touche à rien. Un export valide remplace
l'écriture du fichier et chaque terme de même nom, sans `reponse:` qui
permettrait de revenir en arrière.

### AC13 · Fenêtre entre relecture et écriture

`appliquer` relit l'inventaire, puis ouvre la session d'écriture par une
seconde lecture asynchrone. Une variable créée dans cet intervalle avec le nom
visé n'entre pas dans le contrôle des doublons. Le nom ancien, lui, est
comparé sur l'objet ouvert.

## Ce qui tient

- Seul le `name` change, et seul `src/ecriture.ts` l'écrit ; la loi
  d'écriture le teste.
- Chaque renommage vise un identifiant Figma, jamais un rang ou une page.
  `appliquer` refuse une génération périmée et des règles changées depuis le
  bilan (`src/session.ts:516`).
- Avant d'écrire, chaque objet est relu : nom, collection, `remote`,
  protection. Un objet changé est sauté.
- Deux variables qui visent le même nom exact sont bloquées, dans le kit puis
  à l'écriture. Les chaînes et les cycles passent par un nom provisoire
  `~ucm` (`src/ecriture.ts:109`).
- Une exception en cours de lot laisse un état relu sur les objets, et le
  journal dit ce qui a vraiment changé.
- L'import valide tout l'export avant d'écrire ; un import illisible ne
  touche aucune règle.
- La frontière ne laisse qu'un calcul en vol ; le pied d'Appliquer et les
  feuilles se désactivent pendant l'attente.
- Le moteur est stable sur les essais : une seconde analyse après
  application ne propose aucun renommage.
- Palettes suit ses collections par identifiant ; renommer une collection ne
  lui en fait pas créer une autre.

## À trancher dans Figma

La documentation de Figma ne dit pas ce que l'API fait dans ces cas. Un essai
dans un fichier de test, chaque affectation dans un `try`, puis relecture du
nom :

1. `"a.b"`, `"a{b}"`, `"a$b"` : exception ou nom nettoyé ?
2. Deux variables `Color` et `color` dans une collection : refus ou doublon ?
3. `color` et `color/primary` dans une collection, dans les deux ordres.
4. `" a / b "`, `"/a"`, `"a/"`, `"a//b"` : le nom relu est-il celui écrit ?
5. `setSharedPluginData` à 102 400 puis 102 401 octets, en ASCII puis en
   accents : la limite se compte-t-elle en octets ?
6. Ctrl+Z après un lot : la donnée partagée du journal revient-elle avec les
   noms ?

Les réponses 1 à 4 décident si AC8 et AC1 lèvent une exception dans Figma ou
produisent un doublon silencieux. La réponse 5 fixe la borne de AC3.
