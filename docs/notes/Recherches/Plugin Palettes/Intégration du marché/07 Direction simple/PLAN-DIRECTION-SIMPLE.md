# UCM Palettes : la direction simple

## 1. En-tête

**Objet.** Ce document remplace [la direction
globale](../06%20Direction%20globale/DIRECTION-GLOBALE.md) par un parcours en
trois onglets, Création, Vérification et Gestion, et par une écriture des
variables réduite à une palette et une décision à la fois. Il donne les écrans,
les règles d'écriture, ce que le mainteneur a validé, les questions qui
restent, les essais à faire dans Figma et l'ordre des lots.

**Lecteur.** Le mainteneur, qui répond aux questions de la
[section 7](#7-les-questions-qui-restent) ; puis l'agent qui implémente les
lots.

**Statut.** Les points de la [section 6](#6-ce-qui-est-validé) sont validés ;
le reste ne décide rien. La
[spécification](../../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md)
reste l'autorité sur le comportement du plugin, et [l'architecture
multi-marques](../../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)
sur la forme des variables. Un lot modifie d'abord la spécification.

**Les maquettes.**
[MAQUETTES-DIRECTION-SIMPLE.html](./MAQUETTES-DIRECTION-SIMPLE.html) s'ouvre
d'un double clic, en thème sombre, à 560 px de large : cinq écrans à valider,
M9, M11, M15, M13 et M14, puis six écrans validés, M8, M10, M12, M1, M2 et M4.
Les écrans M3, M5, M6 et M7 du premier passage sont remplacés. Chaque écran part du plugin construit. Pour
les régénérer, depuis la racine du dépôt :

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
| Vérification | La palette ouverte, verdict de toutes | Lire le verdict, les messages et les garanties de contraste | M8, M4 |
| Gestion | Le fichier | Écrire chaque palette dans les tokens Figma, créer sa planche, suivre leur synchronisation ; voir les palettes que le fichier porte déjà | M9 à M12 |

Le plugin s'ouvre sur Création dans un fichier sans palette, sur Gestion
sinon. Le pied de Création mène à Vérification, et le pied de Vérification à
Gestion. Un lien de message de Vérification ouvre Création sur le réglage
qu'il nomme (`[VER-15]`, inchangé). « Modifier » d'une fiche de Gestion ouvre
Création sur cette palette.

## 3. Les écrans

### 3.1 Le fichier vide (M1)

Un encart au fond bleuté occupe l'onglet Création : une rampe d'exemple, le
titre « Créez votre première palette », une phrase et le bouton « Nouvelle
palette ». Le bouton ouvre la carte de création actuelle à la place de
l'encart. Quand les variables du fichier portent des palettes, une ligne sous
l'encart mène à Gestion.

### 3.2 Création (M2)

L'onglet actuel, sans la carte « Garanties de contraste ». L'interface de test
reste. Le pied garde le bilan de la palette ; son bouton « Détails » devient
« Vérifier » et ouvre Vérification sur la même palette. Le volet des messages
quitte Création.

### 3.3 Vérification (M8, M4)

De haut en bas :

1. la barre de Création : la liste déroulante, « Nouvelle palette » et le
   menu. Chaque option de la liste porte le verdict de sa palette, ✓, ! ou ✗,
   et le bouton porte celui de la palette ouverte ;
2. le verdict de la palette ouverte, sur son fond de sévérité : « 76 garanties
   tenues », « 1 point à vérifier » ;
3. ses messages, ceux du volet « Détails » actuel, contrastes à corriger en
   premier ;
4. la carte « Garanties de contraste », toujours ouverte ;
5. le pied : « Passer à Gestion », ou « Retour à Création » quand une garantie
   manque.

Un point à vérifier ne donne plus sa ligne de mesure, « Écart le plus faible :
0,010 ΔEok, pour un minimum de 0,02 ΔEok » : il garde où, quoi, le geste et le
lien. Le rapport exporté garde la mesure.

Le lien d'un message nomme le geste et ouvre la carte où ce geste se fait,
dépliée. Le message cite la même carte que son lien.

| Le lien ouvre | Libellé |
|---|---|
| Création, « Réglage global », pour des profils presque identiques | Ajuster la saturation |
| Création, « Réglage global », pour un contraste | Ajuster le réglage global |
| Création, « Color shift » | Ajuster le Color shift |
| Création, le champ de la référence | Changer la couleur de référence |
| La modale « Ajuster la référence » | Ajuster la référence |
| Réglages communs, « Luminosité des nuances » | Ajuster la luminosité des nuances |
| Réglages communs, « Couleurs de fond » | Changer les couleurs de fond |
| Réglages communs, « Intensités communes » | Ajuster les intensités communes |

Aujourd'hui, l'alerte des profils presque identiques dit « Réglage global »
et son lien ouvre « Intensités communes » : le lien passe à « Réglage
global ».

### 3.4 Gestion (M9 à M12)

**La connexion à Figma (M9).** Un bloc gris, sans fond, ouvre l'onglet dans
les deux vues. Il porte ce qui relie le plugin au fichier :

- « Synchroniser », qui relit le fichier et rafraîchit les états, sans rien
  écrire, et la date de la dernière synchronisation ;
- la destination des tokens, collection et groupe, et « Changer » ;
- la page des planches, et « Changer » ;
- le bilan des palettes, un compte par état, et « Tout mettre à jour », qui
  écrit les tokens et les planches en retard après une confirmation. La vue
  condensée ne porte pas ce bouton.

**Deux vues.** Une bascule « Vue complète · Vue condensée » sous le bloc. La
vue complète est celle de l'ouverture.

**La vue complète (M9).** Deux listes, séparées par un filet et un titre.

Les palettes du plugin : une fiche par palette, celle de l'onglet Palettes
actuel, avec deux lignes de sortie à la place de ses boutons.

| Ligne | États | Geste |
|---|---|---|
| Tokens Figma | Pas encore écrits · À jour · À mettre à jour · Modifiés dans Figma · Introuvables | « Écrire dans les tokens », « Mettre à jour », ou la décision de M12 |
| Planche | Pas encore créée · À jour · À actualiser · Introuvable | « Créer la planche », « Actualiser », « Afficher » |

La pastille de l'en-tête donne l'état le plus urgent des deux lignes, dans
cet ordre : modifiée dans Figma, à mettre à jour, pas encore sur Figma,
synchronisée. Une palette est synchronisée quand ses tokens et sa planche
portent les couleurs que le plugin calcule aujourd'hui. Une palette qui manque
des garanties s'écrit comme une autre : sa fiche montre « Soft ✗ ».

Déjà dans le fichier : les palettes lues dans les variables locales et que le
plugin n'a pas écrites. Leur fiche est en tirets, sans fond, marquée
« Variables du fichier » ; elle montre la rampe, la collection, le chemin et
le nombre de couleurs, et porte « Modifier dans le plugin » dans son en-tête,
au bord droit.

Une palette d'une bibliothèque distante est marquée « Bibliothèque ». Son
chemin nomme la collection et son nombre de variables : deux collections du
même nom se distinguent ainsi. Le plugin ne peut pas écrire dans une
bibliothèque ; le geste devient « Copier dans le plugin ».

**La vue condensée (M10).** Un tableau : une ligne par palette, avec son nom,
sa rampe en miniature, l'état de ses tokens et l'état de sa planche. Aucun
geste. Une palette du fichier est une ligne du même tableau.

**La destination (M11).** « Changer », sur la ligne des tokens, ouvre la carte
« Destination des tokens » à la place du bloc de la connexion ; « Enregistrer »
ou « Annuler » rend le bloc.

| Champ | Choix | Défaut |
|---|---|---|
| Collection | Une liste : une nouvelle collection dont le designer donne le nom, puis chaque collection locale avec son nombre de variables. Les collections de bibliothèque paraissent en lecture seule, avec leur compte | Une nouvelle collection `primitives` |
| Groupe | Le dossier des palettes dans la collection ; vide, les palettes sont à la racine | `colors` |
| Thèmes Light et Dark | Dans le chemin, ou en modes de la collection | Dans le chemin |

Sous les trois champs, sans texte d'aide, une simulation montre la collection
comme le panneau des variables de Figma l'affichera : son nom, les premiers et
les derniers chemins avec leur couleur, le nombre de variables et de modes.
Elle suit chaque choix. La destination vaut pour toutes les palettes du plugin
et se range dans le fichier. Tant qu'elle
n'a pas été confirmée une fois, « Écrire dans les tokens » ouvre la carte
avant d'écrire.

**La page des planches (M15).** Aujourd'hui, le plugin crée une page
« Palettes » au premier dessin. « Changer », sur la ligne des planches, ouvre
à la place du bloc une carte « Page des planches » : une page du fichier, ou
une nouvelle. Sa simulation montre la page choisie parmi celles du fichier et
ce que le choix déplace.

**« Modifier dans le plugin » (M13, M14).** Le geste crée une palette du
plugin au nom de celle du fichier, avec sa nuance 600 pour référence, et ouvre
Création dessus. Un encart y compare la rampe du fichier à celle que le plugin
calcule, et laisse choisir « Recalculées », avec rôles et garanties, ou
« Telles quelles », en palette libre. Rien ne s'écrit à ce stade. Dans
Gestion, la palette rejoint celles du plugin ; ses tokens sont ses variables
d'origine, à leur place, et « Mettre à jour » liste les couleurs qui changent
avant de les remplacer.

**Les deux décisions (M11, M12).** Elles se prennent dans la fiche, sans
modale :

- avant une première écriture, la fiche dit combien de variables elle crée,
  dans quelle collection et sous quels noms, puis attend « Écrire » ;
- quand des couleurs écrites ont été changées à la main dans Figma, la fiche
  les liste, valeur de Figma et valeur du plugin côte à côte, et propose pour
  la palette entière « Remettre les couleurs du plugin » ou « Laisser les
  couleurs de Figma ».

## 4. L'écriture des tokens

1. **La forme.** Avec la destination par défaut, une palette s'écrit dans la
   collection `primitives`, à un seul mode, sous
   `colors/{palette}/{soft, vivid}/{light, dark}/{nuance}`, ou
   `colors/{palette}/{light, dark}/{nuance}` pour une palette à une intensité.
   C'est la forme de l'architecture (D5). Une palette à deux intensités et onze
   nuances crée 44 variables. Avec les thèmes en modes, le chemin perd son
   segment `light` ou `dark`, la collection porte les modes Light et Dark, et
   la même palette crée 22 variables. Le plugin n'écrit ni `brand`, ni
   `theme`, ni `usage`.
2. **La destination.** Elle se range dans le suivi. La changer ne déplace
   aucune variable : les palettes déjà écrites gardent les leurs, que Gestion
   montre « À mettre à jour » vers la nouvelle destination, et les anciennes
   variables restent dans le fichier.
3. **La propriété.** Le plugin reconnaît ses variables par identifiant, jamais
   par leur nom. Un suivi rangé sous la clé partagée `ucm_palettes/variables`
   garde, par palette, l'identifiant de chaque variable et la dernière couleur
   écrite. Il est versionné comme le suivi des cadres.
4. **L'état.** Trois lectures le donnent : la couleur que le plugin calcule, la
   dernière écrite, la couleur lue dans Figma. Figma différent de la dernière
   écrite donne « Modifiés dans Figma » ; sinon, le plugin différent de la
   dernière écrite donne « À mettre à jour » ; sinon « À jour ».
5. **La décision.** Le plugin n'écrase jamais une couleur changée dans Figma
   sans le choix du designer. Le choix porte sur la palette entière.
   « Laisser les couleurs de Figma » garde l'état « Modifiés dans Figma » : la
   recette ne reprend pas ces couleurs.
6. **L'écriture.** Elle part de la recette rangée, jamais de couleurs envoyées
   par l'interface, relit les variables au clic, et se clôt par un seul
   `commitUndo`. Une variable suivie qui a disparu se recrée. Rien ne se
   supprime : une palette supprimée laisse ses variables, que Gestion propose
   de retirer par un geste séparé, comme elle le fait pour un cadre.
7. **Un nom déjà pris.** Une variable du même nom, que le plugin n'a pas
   écrite, arrête l'écriture de cette palette avant toute création. La fiche
   nomme la variable et propose de renommer la palette ou de changer de
   groupe.

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
| Les marques, les destinations par palette, l'écriture de `brand` et de `theme` | 03, 06 | Demande du mainteneur : pas de gestion complexe des marques. Le designer relie lui-même ses palettes à ses autres collections |
| Le jeu de départ | 01, 03, 06 | Demande du mainteneur |
| La revue en modale, les décisions valeur par valeur, l'adoption d'une retouche dans la recette | 03, 06 | Une décision par palette suffit quand le plugin n'écrit qu'une collection |
| La correction proposée et son critère de régularité | 06 | Elle servait les rampes reprises et les retouches adoptées, écartées ici |
| La vision simulée des statuts | 01, 03, 06 | Hors du parcours ; à reprendre à part |
| La couleur de la sélection | 03, 06 | Hors de la demande ; à reprendre à part |
| L'onglet Système et son écran d'ouverture | 06 | Remplacé par Gestion |

Reste gardé de ces propositions : deux sorties par palette et un état par
sortie (03), les trois onglets du parcours (02, 04), la propriété par
identifiant, la relecture au clic et l'écriture depuis la recette rangée (03).

## 6. Ce qui est validé

Réponses du mainteneur au premier passage des maquettes.

| # | Point | Décision |
|---|---|---|
| S1 | Les onglets | Création, Vérification, Gestion. Ouverture sur Création dans un fichier sans palette, sur Gestion sinon |
| S2 | Le fichier vide | L'encart de M1 ; la ligne vers Gestion quand le fichier porte des palettes |
| S3 | L'interface de test | Elle reste dans Création |
| S4 | Le pied de Création | Il garde le bilan ; « Vérifier » remplace « Détails » |
| S5 | Le choix de la palette dans Vérification | La liste déroulante de Création, avec « Nouvelle palette » et le menu ; un verdict par option, à droite. Les puces sont écartées |
| S6 | Le contenu de Vérification | Verdict, messages, garanties, dans cet ordre ; la ligne de mesure d'un point à vérifier est retirée partout ; le lien d'un message nomme le geste et ouvre la carte où il se fait |
| S7 | Écrire une palette qui manque des garanties | Permis |
| S8 | La forme de Gestion | Les deux vues, par une bascule « Vue complète · Vue condensée » ; la complète à l'ouverture ; la condensée ne montre que les états |
| S9 | Les mots des états | Ceux de la section 3.4 ; « Tokens Figma » pour la ligne, « variables » dans le détail |
| S10 | Les thèmes Light et Dark dans les variables | Un choix de la destination, « Dans le chemin » par défaut |
| S11 | Des couleurs changées dans Figma | Deux choix pour la palette entière, sans reprise dans la recette |
| S12 | Les palettes du fichier | Dernier segment numérique, cinq variables au moins, variables locales |
| S13 | Le geste d'une palette du fichier | Il se nomme « Modifier dans le plugin » |
| S15 | Où les variables s'écrivent | Une destination pour le fichier, réglée dans Gestion : collection, groupe, thèmes |
| S16 | « Tout mettre à jour » dans la vue condensée | Absent |
| S17 | Les libellés des liens de message | Ceux de la table de la section 3.3 |
| S18 | Le bloc « Connexion à Figma » | Synchronisation, destination des tokens, page des planches, bilan et « Tout mettre à jour » ; gris, sans fond |
| S19 | « Synchroniser » | Il relit le fichier sans écrire ; « Tout mettre à jour » écrit |
| S20 | La carte de la destination | Trois champs et la simulation ; elle s'ouvre à la place du bloc de la connexion |

## 7. Les questions qui restent

Répondre par numéro : oui, non, ou une variante.

| # | Question | Recommandation | Autre option |
|---|---|---|---|
| S13 | Ce que fait « Modifier dans le plugin » (M13, M14) | Création s'ouvre sur une palette neuve au nom de celle du fichier ; un encart compare les deux rampes et laisse choisir « Recalculées » ou « Telles quelles » ; les variables d'origine restent à leur place et se remplacent par « Mettre à jour » | Sans le choix : toujours recalculées, ou toujours telles quelles |
| S14 | Lier la planche aux tokens | Non : la planche garde ses couleurs écrites, et son état se lit dans Gestion | Les pastilles de la planche liées aux variables, quand elles existent |
| S21 | La page des planches (M15) | Une page choisie dans Gestion, « Palettes » par défaut. Changer de page y déplace les planches déjà créées | Les planches déjà créées restent où elles sont ; seules les nouvelles vont sur la page choisie |
| S22 | Les collections de bibliothèque distante (M9, M11) | Leurs palettes paraissent dans « Déjà dans le fichier », marquées « Bibliothèque », avec « Copier dans le plugin » ; elles ne sont jamais une destination. Deux collections du même nom se distinguent par leur nombre de variables | Les taire : le plugin ne montre que les variables locales |

## 8. Les recherches

**Dans Figma, par le mainteneur.**

| # | Essai | Décide |
|---|---|---|
| R1 | Créer par l'API une variable dont le nom existe déjà dans la collection : refus ou doublon | La règle 7 |
| R2 | Écrire 44 variables et la recette, puis Ctrl+Z : combien de pas | Le `commitUndo` unique de la règle 6 |
| R3 | La donnée de plugin partagée d'une variable après publication de la bibliothèque et copie du fichier | Le suivi de la règle 3 |
| R4 | Le temps de lecture de 500 variables locales par `getLocalVariablesAsync`, à l'ouverture de Gestion | Lire à l'ouverture ou au seul clic sur « Synchroniser » |
| R5 | Une couleur changée à la main : la valeur relue diffère-t-elle de la valeur écrite au-delà de l'arrondi | Le seuil d'égalité de la règle 4 |
| R6 | Les caractères refusés dans un nom de variable, sur un nom de palette accentué ou à espace | Le nom écrit, et le message quand il est refusé |
| R7 | La règle de détection sur le fichier de la bibliothèque Intencial | Ce qu'elle trouve, ce qu'elle manque |
| R8 | Écrire dans une collection existante qui porte déjà plusieurs modes, thèmes dans le chemin : la valeur des autres modes | La règle 1 pour une collection choisie dans la liste |
| R10 | Lire les collections de bibliothèque : `teamLibrary` demande une permission au manifest et ne donne que les collections activées ; le plugin lit-il sans elle les variables distantes que le fichier emploie | S22 : ce que Gestion peut montrer des deux « primitive base », 6 et 323 variables |
| R9 | Ajouter les modes Light et Dark à une collection, selon l'offre Figma du fichier | Le message quand l'offre refuse un second mode |

**Dans le dépôt, par l'agent.**

- Le nom d'une palette vers un segment de chemin : reprendre `normalizeName`
  de `packages/kit/src/format/names.ts`, et dire ce que deux palettes au même
  segment donnent.
- Le seuil d'égalité de deux couleurs, entre l'hexa du moteur et les
  composantes flottantes de Figma.
- La règle de détection, écrite en fonction pure et essayée sur des jeux de
  noms : Tailwind, Material, la bibliothèque Intencial.

## 9. Les lots

| Lot | Contenu | Dépend de |
|---|---|---|
| 1 | Les trois onglets, sans écriture nouvelle : l'encart du fichier vide, Création sans les garanties, Vérification avec les verdicts dans la liste, les messages simplifiés et leurs liens, Gestion en deux vues avec le bloc de la connexion, la page des planches et la seule ligne Planche | Validé ; S21 |
| 2 | Les essais R1 à R9 et les trois recherches du dépôt | Aucun |
| 3 | L'écriture des tokens : destination et simulation, suivi, états, première écriture, « Tout mettre à jour » | Lot 2 |
| 4 | Les couleurs changées dans Figma, et les palettes du fichier en lecture seule | Lot 3 |
| 5 | « Modifier dans le plugin », les palettes de bibliothèque, et la planche liée aux tokens si elle est retenue | S13, S14, S22, R10 |

Le lot 1 se livre seul : il réorganise le plugin sans toucher à ce qu'il écrit.
