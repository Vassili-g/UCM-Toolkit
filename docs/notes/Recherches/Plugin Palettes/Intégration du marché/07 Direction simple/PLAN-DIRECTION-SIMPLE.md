# UCM Palettes : la direction simple

## 1. En-tête

**Objet.** Ce document remplace [la direction
globale](../06%20Direction%20globale/DIRECTION-GLOBALE.md) par un parcours en
trois onglets, Création, Vérification et Gestion, et par une écriture des
variables réduite à une palette et une décision à la fois. Il donne les écrans,
les règles d'écriture, les questions à trancher, les essais à faire dans Figma
et l'ordre des lots.

**Lecteur.** Le mainteneur, qui valide chaque question de la
[section 6](#6-les-questions-à-valider) ; puis l'agent qui implémente les lots
validés.

**Statut.** Ce document ne décide rien. La
[spécification](../../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md)
reste l'autorité sur le comportement du plugin, et [l'architecture
multi-marques](../../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)
sur la forme des variables. Une question validée modifie d'abord la
spécification.

**Les maquettes.**
[MAQUETTES-DIRECTION-SIMPLE.html](./MAQUETTES-DIRECTION-SIMPLE.html) s'ouvre
d'un double clic : sept écrans, M1 à M7, à 560 px de large. Chaque écran part
du plugin construit. Pour les régénérer, depuis la racine du dépôt :

```sh
npm run galerie --workspace ucm-palettes-plugin
node "docs/notes/Recherches/Plugin Palettes/Intégration du marché/07 Direction simple/generer-maquettes-direction-simple.mjs"
```

## 2. Le parcours

Le designer crée une palette, vérifie ses contrastes, puis l'implémente dans
Figma. Chaque étape a son onglet.

| Onglet | Portée | Ce que le designer y fait | Maquette |
|---|---|---|---|
| Création | La palette ouverte | Nommer, choisir la référence, régler, essayer sur l'interface de test | M1, M2 |
| Vérification | La palette ouverte, verdict de toutes | Lire le verdict, les messages et les garanties de contraste | M3, M4 |
| Gestion | Le fichier | Écrire chaque palette dans les tokens Figma, créer sa planche, suivre leur synchronisation ; voir les palettes que le fichier porte déjà | M5, M6, M7 |

Deux liens relient les onglets sans que le designer cherche : le pied de
Création mène à Vérification, et le pied de Vérification à Gestion. Un lien de
message de Vérification ouvre Création sur le réglage qu'il nomme (`[VER-15]`,
inchangé). « Modifier » d'une fiche de Gestion ouvre Création sur cette
palette.

## 3. Les écrans

### 3.1 Le fichier vide (M1)

Un encart au fond bleuté occupe l'onglet Création : une rampe d'exemple, le
titre « Créez votre première palette », une phrase et le bouton « Nouvelle
palette ». Le bouton ouvre la carte de création actuelle à la place de
l'encart. Aujourd'hui, l'onglet montre une ligne grise et la carte de création
déjà ouverte.

Quand les variables du fichier portent des palettes, une ligne sous l'encart
mène à Gestion.

### 3.2 Création (M2)

L'onglet actuel, sans la carte « Garanties de contraste ». Le pied garde le
bilan de la palette ; son bouton « Détails » devient « Vérifier » et ouvre
Vérification sur la même palette. Le volet des messages quitte Création.

### 3.3 Vérification (M3, M4)

De haut en bas :

1. une puce par palette, avec son verdict : ✓, ! ou ✗. Un clic choisit la
   palette ;
2. le verdict de la palette ouverte, sur son fond de sévérité : « 76 garanties
   tenues », « 1 point à vérifier » ;
3. ses messages, ceux du volet « Détails » actuel, contrastes à corriger en
   premier ;
4. la carte « Garanties de contraste », toujours ouverte ;
5. le pied : « Passer à Gestion », ou « Retour à Création » quand une garantie
   manque.

Aucun calcul nouveau : l'onglet réunit ce que la carte et le volet montrent
déjà.

### 3.4 Gestion (M5, M6, M7)

Deux listes, séparées par un filet et un titre.

**Palettes du plugin.** Une fiche par palette, celle de l'onglet Palettes
actuel, avec deux lignes de sortie à la place de ses boutons :

| Ligne | États | Geste |
|---|---|---|
| Tokens Figma | Pas encore écrits · À jour · À mettre à jour · Modifiés dans Figma · Introuvables | « Écrire dans les tokens », « Mettre à jour », ou la décision de M6 |
| Planche | Pas encore créée · À jour · À actualiser · Introuvable | « Créer la planche », « Actualiser », « Afficher » |

La pastille de l'en-tête donne l'état le plus urgent des deux lignes, dans
cet ordre : modifiée dans Figma, à mettre à jour, pas encore sur Figma,
synchronisée. Une palette est synchronisée quand ses tokens et sa planche
portent les couleurs que le plugin calcule aujourd'hui.

**Déjà dans le fichier.** Les palettes lues dans les variables locales du
fichier et que le plugin n'a pas écrites. Leur fiche est en tirets, sans fond,
marquée « Variables du fichier » ; elle montre la rampe, la collection, le
chemin et le nombre de couleurs. Le plugin ne les modifie jamais.

La variante B (M7) remplace les fiches par un tableau : une ligne par palette,
une colonne par sortie.

**Les deux décisions (M6).** Elles se prennent dans la fiche, sans modale :

- avant une première écriture, la fiche dit combien de variables elle crée,
  dans quelle collection et sous quels noms, puis attend « Écrire » ;
- quand des couleurs écrites ont été changées à la main dans Figma, la fiche
  les liste, valeur de Figma et valeur du plugin côte à côte, et propose pour
  la palette entière « Remettre les couleurs du plugin » ou « Laisser les
  couleurs de Figma ».

## 4. L'écriture des tokens

Les règles tiennent en six points. Chacune reprend une règle de la direction
globale ou la simplifie.

1. **La forme.** Une palette s'écrit dans la collection `primitives`, à un
   seul mode, sous `colors/{palette}/{soft, vivid}/{light, dark}/{nuance}`, ou
   `colors/{palette}/{light, dark}/{nuance}` pour une palette à une intensité.
   C'est la forme de l'architecture (D5). Une palette à deux intensités et onze
   nuances crée 44 variables. Le plugin n'écrit ni `brand`, ni `theme`, ni
   `usage`.
2. **La propriété.** Le plugin reconnaît ses variables par identifiant, jamais
   par leur nom. Un suivi rangé sous la clé partagée `ucm_palettes/variables`
   garde, par palette, l'identifiant de chaque variable et la dernière couleur
   écrite. Il est versionné comme le suivi des cadres.
3. **L'état.** Trois lectures le donnent : la couleur que le plugin calcule, la
   dernière écrite, la couleur lue dans Figma. Figma différent de la dernière
   écrite donne « Modifiés dans Figma » ; sinon, le plugin différent de la
   dernière écrite donne « À mettre à jour » ; sinon « À jour ».
4. **La décision.** Le plugin n'écrase jamais une couleur changée dans Figma
   sans le choix du designer. Le choix porte sur la palette entière.
   « Laisser les couleurs de Figma » garde l'état « Modifiés dans Figma » : la
   recette ne reprend pas ces couleurs.
5. **L'écriture.** Elle part de la recette rangée, jamais de couleurs envoyées
   par l'interface, relit les variables au clic, et se clôt par un seul
   `commitUndo`. Une variable suivie qui a disparu se recrée. Rien ne se
   supprime : une palette supprimée laisse ses variables, que Gestion propose
   de retirer par un geste séparé, comme elle le fait pour un cadre.
6. **Un nom déjà pris.** Une variable du même nom, que le plugin n'a pas
   écrite, arrête l'écriture de cette palette avant toute création. La fiche
   nomme la variable et propose de renommer la palette.

**Les palettes du fichier.** Le plugin lit les variables locales de type
couleur et groupe celles dont le dernier segment du nom est un nombre et dont
le reste du chemin est le même. Un groupe d'au moins cinq variables est une
palette. La lecture ne suit pas les alias et n'ouvre aucune bibliothèque.

**Ce que le dépôt change.** L'invariant « aucun fichier de `src/` n'appelle
`figma.variables` » devient : seuls `src/ecriture/variables.ts`, qui écrit, et
`src/lectureDesVariables.ts`, qui lit, l'appellent. `code.ts` reçoit une porte
`ecrire-variables`. `loiDEcriture.test.ts` suit.

## 5. Ce que la direction écarte

| Écarté | Proposé par | Raison |
|---|---|---|
| Les marques, les destinations, l'écriture de `brand` et de `theme` | 03, 06 | Demande du mainteneur : pas de gestion complexe des marques. Le designer relie lui-même `primitives` à ses autres collections |
| Le jeu de départ | 01, 03, 06 | Demande du mainteneur |
| La revue en modale, les décisions valeur par valeur, l'adoption d'une retouche dans la recette | 03, 06 | Une décision par palette suffit quand le plugin n'écrit qu'une collection |
| La correction proposée et son critère de régularité | 06 | Elle servait les rampes reprises et les retouches adoptées, écartées ici |
| La vision simulée des statuts | 01, 03, 06 | Hors du parcours ; à reprendre à part |
| La couleur de la sélection | 03, 06 | Hors de la demande ; à reprendre à part |
| L'onglet Système et son écran d'ouverture | 06 | Remplacé par Gestion |

Reste gardé de ces propositions : deux sorties par palette et un état par
sortie (03), les trois onglets du parcours (02, 04), la propriété par
identifiant, la relecture au clic et l'écriture depuis la recette rangée (03).

## 6. Les questions à valider

Répondre par numéro : oui, non, ou une variante.

| # | Question | Recommandation | Autre option |
|---|---|---|---|
| S1 | Les onglets | Création, Vérification, Gestion. Le plugin s'ouvre sur Création dans un fichier sans palette, sur Gestion sinon | S'ouvrir toujours sur Création |
| S2 | Le fichier vide | L'encart de M1 ; la ligne vers Gestion seulement quand le fichier porte des palettes | Sans cette ligne |
| S3 | L'interface de test | Elle reste dans Création : elle sert à régler | La déplacer dans Vérification |
| S4 | Le pied de Création | Il garde le bilan ; « Vérifier » remplace « Détails » | Retirer le pied : le bilan ne se lit plus que dans Vérification |
| S5 | Le choix de la palette dans Vérification | Des puces avec verdict | La liste déroulante de Création, sans verdict des autres palettes |
| S6 | Le contenu de Vérification | Verdict, messages, garanties, dans cet ordre | Garanties d'abord |
| S7 | Écrire une palette qui manque des garanties | Permis : la fiche de Gestion montre « Soft ✗ » et le geste reste | Geste désactivé tant qu'une garantie manque |
| S8 | La forme de Gestion | Variante A, une fiche par palette | Variante B, un tableau |
| S9 | Les mots des états | Ceux de la section 3.4 ; « Tokens Figma » pour la ligne, « variables » dans le détail | « Variables Figma » partout |
| S10 | La forme des variables | Celle de l'architecture : `primitives`, un mode, `light` et `dark` dans le chemin | Une collection à deux modes Light et Dark, `{palette}/{soft, vivid}/{nuance}` : liable sans `theme`, mais hors de l'architecture |
| S11 | Des couleurs changées dans Figma | Deux choix pour la palette entière, sans reprise dans la recette | Un choix par couleur |
| S12 | Les palettes du fichier | La règle de la section 4 : dernier segment numérique, cinq variables au moins, variables locales | Trois variables au moins ; ou les styles de couleur en plus |
| S13 | « Reprendre dans le plugin » | Reporté au lot 5 : la fiche du fichier ne porte d'abord aucun geste | Dès le lot 4, en palette libre aux couleurs lues |
| S14 | Lier la planche aux tokens | Non : la planche garde ses couleurs écrites, et son état se lit dans Gestion | Les pastilles de la planche liées aux variables, quand elles existent : la planche suit alors les tokens sans redessin |

## 7. Les recherches

**Dans Figma, par le mainteneur.** Sept essais, tirés des seize de la direction
globale ; les autres portaient sur les marques et les alias.

| # | Essai | Décide |
|---|---|---|
| R1 | Créer par l'API une variable dont le nom existe déjà dans la collection : refus ou doublon | La règle 6 |
| R2 | Écrire 44 variables et la recette, puis Ctrl+Z : combien de pas | Le `commitUndo` unique de la règle 5 |
| R3 | La donnée de plugin partagée d'une variable après publication de la bibliothèque et copie du fichier | Le suivi de la règle 2 |
| R4 | Le temps de lecture de 500 variables locales par `getLocalVariablesAsync`, à l'ouverture de Gestion | Lire à l'ouverture ou au clic sur « Relire le fichier » |
| R5 | Une couleur changée à la main : la valeur relue diffère-t-elle de la valeur écrite au-delà de l'arrondi | Le seuil d'égalité de la règle 3 |
| R6 | Les caractères refusés dans un nom de variable, sur un nom de palette accentué ou à espace | Le nom écrit, et le message quand il est refusé |
| R7 | La règle de détection sur le fichier de la bibliothèque Intencial | S12 : ce qu'elle trouve, ce qu'elle manque |

**Dans le dépôt, par l'agent.**

- Le nom d'une palette vers un segment de chemin : reprendre `normalizeName`
  de `packages/kit/src/format/names.ts`, et dire ce que deux palettes au même
  segment donnent.
- Le seuil d'égalité de deux couleurs, entre l'hexa du moteur et les
  composantes flottantes de Figma.
- La règle de détection, écrite en fonction pure et essayée sur des jeux de
  noms : Tailwind, Material, la bibliothèque Intencial.

## 8. Les lots

| Lot | Contenu | Dépend de |
|---|---|---|
| 1 | Les trois onglets, sans écriture nouvelle : l'encart du fichier vide, Création sans les garanties, Vérification, et Gestion avec la seule ligne Planche | S1 à S9 |
| 2 | Les essais R1 à R7 et les trois recherches du dépôt | Aucun |
| 3 | L'écriture des tokens : suivi, états, première écriture, « Tout mettre à jour » | Lot 2, S10 |
| 4 | Les couleurs changées dans Figma, et les palettes du fichier en lecture seule | Lot 3, S11, S12 |
| 5 | À discuter : « Reprendre dans le plugin », la planche liée aux tokens | S13, S14 |

Le lot 1 se livre seul : il réorganise le plugin sans toucher à ce qu'il écrit.
