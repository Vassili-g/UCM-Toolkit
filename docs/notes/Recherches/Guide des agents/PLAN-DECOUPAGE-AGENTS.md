# Plan du découpage du guide des agents

Ce plan applique l'option C de la
[recherche](./RECHERCHE-DECOUPAGE-AGENTS.md#5-les-organisations-possibles).
Il reprend aussi les mesures de la [critique](./CRITIQUE-DU-DECOUPAGE.md#4-les-mesures-qui-manquent).
La critique montre que le découpage ne traite pas les problèmes qui ont le
plus coûté pendant le plan de fiabilité : les lots mêlés, les fichiers
carrefours, les trois documents par tâche et les suites de tests relancées par
chaque agent.

Le plan a donc trois parties :

- la partie A fixe les règles de travail des agents, sans toucher à la
  structure d'`AGENTS.md` ;
- la partie B découpe `AGENTS.md` ;
- la partie C outille le prochain plan de plusieurs lots.

La partie A attend les décisions D8 et D9, la partie B les décisions D1 à D7
(section 4). La section 5 dit ce que chaque lot rapporte, et l'étape après
laquelle la suite se décide.

## 1. Les buts et leurs critères

| But | Critère vérifiable |
|---|---|
| Un agent ne lit que ce que sa tâche demande | `npm run agents:contexte` rend, pour six tâches types, au plus 35 % des 152 469 octets actuels |
| Aucune information ne se perd | le script de conservation retrouve chaque puce d'invariant et chaque ligne de carte du commit de départ, une fois exactement ; aucune entrée de `AUTORITES` n'est retirée ; `docLinks` compte toujours au moins vingt ancres |
| Le document à mettre à jour se calcule | chaque fichier de `packages/*/src/` a un seul domicile dans le manifeste ; la même liste de chemins rend toujours la même liste de documents |
| Aucun document ne naît hors de sa place | un test refuse un fichier Markdown suivi par Git hors du registre ; un hook refuse sa création par un agent Claude |
| Codex et Claude Code lisent la même chose | chaque chaîne d'`AGENTS.md`, de la racine à un paquet, pèse au plus 32 Kio ; la racine nomme tous les fichiers à lire |
| Les vérifications se calculent | `agents:contexte -- --diff` rend les commandes de test des paquets touchés, tests racine compris quand le domaine les exige |
| Un agent ne part pas sur un arbre sale | un implémenteur s'arrête sur un `git status` qui porte du travail qu'aucune case du plan ne décrit |
| Aucun fichier suivi n'est en CRLF | un test lit `git ls-files --eol` et refuse `i/crlf` hors des exceptions déclarées |

## 2. L'organisation visée

```text
AGENTS.md                          index : produit, invariants transversaux, routage, « Où écrire », commandes, limites
CLAUDE.md                          @AGENTS.md, puis les règles de délégation
.agents/domiciles.json             le manifeste : domaines, motifs de chemins, fichiers, registre des documents
.agents/skills/publier-paquets/    la procédure de publication, sortie d'AGENTS.md
packages/<paquet>/AGENTS.md        rôle du paquet, frontière d'écriture, commandes, table de ses invariants
packages/<paquet>/CLAUDE.md        une ligne : @AGENTS.md, pour que Claude Code le charge au contact du paquet
packages/<paquet>/CARTE.md         la carte du paquet, générée ou découpée (décision D3)
packages/<paquet>/invariants/*.md  un fichier par groupe d'invariants actuel, lu à la demande
scripts/agents-contexte.mjs        les documents à lire pour des chemins, le domicile d'un chemin, le mode --diff
```

### 2.1 Où va chaque groupe

Chaque groupe part tel quel. Seuls les préfixes des liens relatifs changent.

| Groupe actuel | Fichier d'arrivée | Octets |
|---|---|---:|
| Portée et forme du contrat | `packages/plugin-exporter/invariants/portee-du-contrat.md` | 3 543 |
| Tokens et variables | `packages/plugin-exporter/invariants/tokens-et-variables.md` | 6 989 |
| Couleurs | `packages/plugin-exporter/invariants/couleurs.md` | 2 841 |
| Composition | `packages/plugin-exporter/invariants/composition.md` | 2 372 |
| Arbre des slots | `packages/plugin-exporter/invariants/arbre-des-slots.md` | 3 799 |
| Layout, dimensions et bornes | `packages/plugin-exporter/invariants/layout.md` | 7 220 |
| Grilles | `packages/plugin-exporter/invariants/grilles.md` | 1 463 |
| Diagnostics | `packages/plugin-exporter/invariants/diagnostics.md` | 8 923 |
| Échantillon de maquette | `packages/plugin-exporter/invariants/echantillon.md` | 4 466 |
| Écriture dans le document | `packages/plugin-exporter/invariants/ecriture-dans-le-document.md` | 1 886 |
| Versionnage | `packages/kit/invariants/versionnage.md` | 716 |
| Moteur de couleur | `packages/couleur/invariants/moteur-de-couleur.md` | 16 454 |
| Écriture d'UCM Palettes | `packages/plugin-palettes/invariants/ecriture.md` | 14 964 |
| Langue d'UCM Palettes | `packages/plugin-palettes/invariants/langue.md` | 1 520 |
| Interface d'UCM Palettes | `packages/plugin-palettes/invariants/interface.md` | 7 962 |
| Explorateur de tokens | `packages/plugin-architect/invariants/explorateur.md` | 6 637 |
| UCM Nomenclature | `packages/plugin-nomenclature/invariants/nomenclature.md` | 5 446 |
| Vérification : corpus N-1 et forme d'origine des tokens | `packages/kit/invariants/corpus-de-test.md` | environ 2 000 |
| Vérification : moteur jugé sur ses sorties, DTCG, `lois.ts` | `packages/plugin-exporter/invariants/tests-du-moteur.md` | environ 2 500 |
| Publier les paquets | `.agents/skills/publier-paquets/SKILL.md` | 1 342 |
| Référentiel, plugins séparés, frontière de recette, limites | `AGENTS.md` racine | environ 3 000 |

### 2.2 Ce que chaque tâche lira

Estimation : racine de 12 Kio, `AGENTS.md` de paquet de 5 Kio, groupes à leur
taille actuelle.

| Tâche type | Sans la carte | Avec la carte du paquet | Part des 152 469 octets |
|---|---:|---:|---:|
| Écriture des variables d'UCM Palettes | 32 Ko | 48 Ko | 21 à 32 % |
| Layout de l'exporteur | 24 Ko | 29 Ko | 16 à 19 % |
| Moteur de couleur | 33 Ko | 38 Ko | 22 à 25 % |
| UCM Nomenclature | 22 Ko | 24 Ko | 15 à 16 % |
| Explorateur de tokens | 23 Ko | 26 Ko | 15 à 17 % |
| Note de recherche, sans code | 12 Ko | 12 Ko | 8 % |

La carte d'UCM Palettes reste la plus lourde. La décision D3 la réduit.

### 2.3 La table « Où écrire » du fichier racine

L'agent la parcourt dans l'ordre et s'arrête à la première ligne qui convient.

| Information | Domicile |
|---|---|
| Forme d'un champ publié, sens de son absence | `docs/format/FORMAT.md` |
| Ce que l'exporteur lit dans Figma | `packages/plugin-exporter/SPEC.md` |
| Pourquoi d'un calcul ou d'un comportement de Palettes | la spécification de Palettes |
| Pourquoi d'une lecture de l'explorateur | `packages/plugin-architect/SPEC.md` |
| Règle tenue par le code : règle, borne, autorité, test | le fichier que rend `npm run agents:domicile -- <fichier autorité>` |
| Rôle d'un fichier source | son commentaire d'en-tête |
| Définition UCM : crans, modes, rôles, conventions | `packages/kit/src/referentiel/`, en code |
| Règle de travail : code, test, message, rédaction | `CONTRIBUTING.md` |
| Procédure qu'un agent exécute | une skill existante de `.agents/skills/` |
| Maturité, priorité, validation restante | `ROADMAP.md` |
| Recherche, plan, décision à prendre | le dossier existant de `docs/notes/Recherches/` qui traite le sujet |
| Aucune ligne ne convient | ne rien écrire ; rendre la question à l'orchestrateur ou au mainteneur |

Créer un nouveau document, une nouvelle skill ou un nouveau dossier de
recherche demande l'accord du mainteneur, qui l'ajoute au registre.

## 3. Les lots

Chaque lot se commite seul, par chemins explicites. Un lot qui déplace du texte
ne le réécrit pas : le message de commit nomme l'endroit d'arrivée, comme
l'exige `CONTRIBUTING.md`.

### Partie A. Les règles de travail des agents

Ces règles vont dans une section « Travailler avec des agents » de
`CONTRIBUTING.md`. `AGENTS.md` y renvoie en une ligne, parce que Codex ne lit
que la chaîne des `AGENTS.md`. Les définitions de `.claude/agents/` renvoient
à la même section et ne la recopient pas.

### Lot A1. Un lot commité avant le suivant (M1)

- [ ] Un implémenteur, Claude ou Codex, commence par `git status`. Il s'arrête
  et rend la question si l'arbre porte du travail qu'aucune case du plan ne
  décrit.
- [ ] Un lot ne commence pas tant que le précédent du même plan n'est pas
  commité, ou rendu comme non commencé.
- [ ] Ajouter cette étape en tête de « Avant d'écrire » dans
  `implementeur.md`, `implementeur-exigeant.md` et `executant.md`.

### Lot A2. Les fins de ligne fixées par Git (M7)

Aujourd'hui, `core.autocrlf` vaut `false`, `.gitattributes` ne fixe que quatre
motifs, et 5 des 1 715 fichiers suivis sont en CRLF dans l'index, tous dans
des notes de recherche. La normalisation ne touche donc que ces cinq fichiers.

- [ ] Placer `* text=auto eol=lf` en tête de `.gitattributes`. Les motifs
  existants restent dessous, et la ligne `-text` du schéma DTCG garde ses
  octets, puisqu'un motif plus bas l'emporte.
- [ ] `git add --renormalize .` dans un commit qui ne contient que cette
  normalisation.
- [ ] Écrire `tests/finsDeLigne.test.mjs` : il lit `git ls-files --eol` et
  refuse `i/crlf`. Le test lit l'index, pas l'arbre de travail : un fichier que
  Git normalise à l'ajout n'est pas une faute.
- [ ] Après ce lot, le contrôle octet par octet avant chaque commit n'a plus
  d'objet pour les fins de ligne.

### Lot A3. Vérifications et exigences selon la tâche (M4, M5, M6)

- [ ] Un implémenteur lance `npm run test:paquet -- <nom>` sur les paquets
  qu'il touche, et jamais `npm test` à la racine.
- [ ] Les tests racine se lancent quand la tâche touche `packages/kit/src/`,
  Palettes, Nomenclature ou le nommage du kit. Un changement du kit demande
  aussi `versionSuitLeContenu` et une montée de version.
- [ ] Un `verificateur` lance la vérification complète une fois, sur un arbre
  stable, avant le commit.
- [ ] La table des exigences selon la nature de la tâche entre dans
  `CONTRIBUTING.md`, section des tests. Le prompt de délégation nomme la
  nature, et l'agent applique la ligne qui lui correspond.
- [ ] Un texte d'écran absent de la note de conception s'écrit avec le
  marqueur `TODO(texte)` dans le catalogue, et le compte rendu le signale. La
  conversation principale écrit le texte et le fait valider. Un test des
  plugins à catalogue refuse `TODO(texte)` : le commit ne passe pas tant que
  le texte manque.
- [ ] Retirer `test:ui` du paragraphe « Avant de rendre » de
  `implementeur.md` et `implementeur-exigeant.md` (D10). Aucun agent ne le
  lance sans demande explicite du mainteneur, qui vérifie l'interface
  lui-même. Le compte rendu nomme les écrans que le lot change.

### Partie B. Le découpage

**Seuil.** Le lot 0 et le lot 1 partent avec la partie A. Les lots 2 à 10 ne
partent que si l'une de ces deux conditions est vraie après l'étape 1 de la
section 5 :

- l'essai 3 de la recherche montre que Codex ne reçoit aucun invariant, et
  Codex reste un implémenteur du dépôt ;
- les plages de lignes du lot 1 ne suffisent pas : un implémenteur lit encore
  des groupes qui ne concernent pas son lot, ou en manque un.

**Préalable.** La partie B se mène seule. Aucun autre plan ne modifie
`AGENTS.md` pendant les lots 2 à 7, qui se font d'une traite. Le plan de
fiabilité doit donc être clos avant le lot 2. Pendant la session de la
critique, six agents ont ajouté une ligne à `AGENTS.md`. Le script de
conservation signale une puce ajoutée après le commit de départ, puisqu'elle
ne figure dans aucun fichier.

### Lot 0. Corriger les écarts du fichier actuel

- [ ] Retirer les quatre dossiers `docs/notes/*` absents de la carte.
- [ ] Écrire « quatre plugins » dans l'invariant et dans la carte de
  `pluginsSepares.test.ts`.
- [ ] Remplacer l'énumération des groupes de « Avant de modifier » par un
  renvoi à la section des invariants.
- [ ] Corriger « quatorze » dans le titre du test des domaines.
- [ ] Ajouter `src/espace.ts` à la carte de l'explorateur.

Fin : `npm test` passe.

### Lot 1. Le manifeste et le script, sur le fichier actuel

- [ ] Écrire `.agents/domiciles.json` : pour chaque groupe, son identifiant,
  son titre, son fichier (d'abord `AGENTS.md` et le titre de section), ses
  motifs de chemins, ses spécifications, ses skills, ses documents liés
  (README, SPEC) et ses commandes de vérification.
- [ ] Écrire `scripts/agents-contexte.mjs`, sans dépendance :
  `agents:contexte -- <chemins…>` rend la liste triée des documents à lire, et
  la plage de lignes tant que le groupe vit dans `AGENTS.md` ;
  `agents:domicile -- <chemin>` rend un seul fichier.
- [ ] Le mode `--diff` lit `git diff --name-status HEAD` et rend quatre
  listes : les domiciles à relire, les documents liés, les commandes de
  vérification (lot A3), et les fichiers Markdown qui citent un chemin que le
  diff supprime ou renomme (M8). La dernière liste vient d'une recherche du
  chemin littéral : elle se répète à l'identique.
- [ ] Écrire `tests/domiciles.test.ts` : chaque fichier de `packages/*/src/`
  a un domicile, le dernier motif qui correspond l'emporte, chaque fichier et
  chaque titre déclaré existe, deux appels identiques rendent la même sortie.

Fin : l'orchestrateur peut déjà passer à un sous-agent la plage de lignes
utile, sans rien avoir déplacé.

### Lot 2. Les contrôles lisent plusieurs fichiers

- [ ] `tests/inventaireInvariants.test.ts` lit la liste des fichiers et
  l'ordre des groupes dans le manifeste. `AUTORITES` se cherche dans leur
  réunion. Aucune entrée n'est retirée.
- [ ] `tests/docLinks.test.ts` compte les ancres de spécification dans la
  même réunion, avec le même seuil de vingt.
- [ ] `scripts/controle-style.mjs` ajoute les fichiers d'invariants à ses
  documents d'autorité.
- [ ] Écrire `scripts/verifier-deplacement.mjs <commit>` : il relève chaque
  puce d'invariant et chaque ligne de carte au commit donné, normalise les
  espaces et les préfixes de liens relatifs, et exige que chacune figure une
  fois exactement dans les fichiers du manifeste.

Fin : tous les contrôles passent, le manifeste pointant encore vers
`AGENTS.md`.

### Lot 3. Déplacer les invariants, un paquet par commit

- [ ] Exporteur : dix groupes et `tests-du-moteur.md`.
- [ ] Kit : `versionnage.md` et `corpus-de-test.md`.
- [ ] Moteur de couleur.
- [ ] UCM Palettes : trois groupes.
- [ ] Explorateur.
- [ ] Nomenclature.

Pour chaque commit : le manifeste suit, `verifier-deplacement` rend zéro
manque, `npm test` passe.

### Lot 3a. La convention d'écriture des fichiers d'agents

- [ ] La [proposition de convention](./CONVENTION-ECRITURE-AGENTS.md) devient
  `.agents/skills/rediger-pour-agents/SKILL.md`, après relecture du
  mainteneur.
- [ ] `CONTRIBUTING.md`, section « Rédiger un document » : une phrase dit que
  les fichiers d'agents suivent cette skill, et que les autres documents
  gardent les règles de la section.
- [ ] `AGENTS.md` : avant d'écrire dans un fichier d'agent, charger la skill.
- [ ] Écrire `scripts/verifier-compaction.mjs` (section 7 de la convention).
- [ ] `tests/docLinks.test.ts` lit les liens de référence, que la convention
  admet.

Les lots 4 et 7 écrivent leurs fichiers neufs dans cette forme.

### Lot 4. Un `AGENTS.md` court par paquet

- [ ] Pour chaque paquet : rôle, fichiers qui écrivent dans Figma, commandes
  de test et de build, table de ses fichiers d'invariants avec les chemins qui
  les concernent. Au plus 6 Kio.
- [ ] Un `CLAUDE.md` d'une ligne, `@AGENTS.md`, à côté de chacun.
- [ ] Un test vérifie que la table de chaque paquet liste exactement les
  domaines que le manifeste lui donne.

### Lot 5. La carte du code

Selon la décision D3 :

- [ ] soit `scripts/generer-cartes.mjs` écrit `packages/<paquet>/CARTE.md`
  depuis la première phrase de chaque commentaire d'en-tête, et un test refuse
  une carte périmée ;
- [ ] soit la carte actuelle se découpe telle quelle par paquet.

Le contrôle de la liste de `tests/` suit le bloc qui la porte.

### Lot 6. Les règles de travail quittent le guide

- [ ] « Publier les paquets » devient `.agents/skills/publier-paquets/SKILL.md`,
  sans changer une phrase.
- [ ] Les commandes de vérification vont dans `CONTRIBUTING.md` ou dans les
  `AGENTS.md` de paquet, sans doublon.

### Lot 7. Le fichier racine devient l'index

- [ ] Écrire le nouveau `AGENTS.md`, au plus 200 lignes et 12 Kio : le produit
  en un paragraphe, les invariants transversaux, la table de routage, la table
  « Où écrire », la consigne de doute, les commandes, les limites.
- [ ] La table de routage est écrite entre deux marqueurs par
  `agents-contexte.mjs --ecrire-index`, et un test refuse une table qui
  diffère du manifeste.
- [ ] Un test borne la racine à 12 Kio et chaque chaîne racine-paquet à 32 Kio.

### Lot 7a. Compacter les invariants, un domaine par commit

- [ ] Réécrire chaque fichier de `packages/*/invariants/` selon la
  convention. Un commit par fichier, sans autre changement.
- [ ] Pour chaque commit : `verifier-compaction` passe, et `AUTORITES` ne perd
  aucune entrée.
- [ ] Un agent relit les paires avant-après du commit et liste les négations,
  conditions et bornes disparues. Le mainteneur relit seulement ces paires.

Fin : les invariants passent d'environ 97 Ko à 67 à 72 Ko, selon
l'estimation de la convention.

### Lot 8. Le registre des documents

- [ ] Le manifeste déclare les emplacements admis pour un fichier Markdown :
  fichiers racine nommés, `packages/*/{README,SPEC,AGENTS,CARTE}.md`,
  `packages/*/invariants/*.md`, `docs/format/`, `docs/guides/`,
  `docs/references/`, `docs/marque/`, les dossiers existants de
  `docs/notes/Recherches/`, `.agents/skills/*/`, `.claude/agents/`, les README
  de fixtures.
- [ ] `tests/registreDesDocuments.test.ts` refuse tout autre fichier suivi.
- [ ] `scripts/hook-documents.mjs`, branché en `PreToolUse` sur `Write`,
  refuse la création d'un `.md` hors du registre et donne la commande
  `agents:domicile`.

### Lot 9. Les lecteurs du guide

- [ ] `CLAUDE.md` importe `@AGENTS.md`. Avant de déléguer, l'orchestrateur
  lance `agents:contexte` sur les chemins du lot et colle la liste dans le
  prompt. Avant de commiter, il lance `agents:contexte -- --diff`.
- [ ] Une seule entrée par tâche (M3) : le prompt d'un implémenteur donne la
  note de conception du lot et la liste d'`agents:contexte`, rien d'autre. La
  note se suffit : le pourquoi en une phrase, les fichiers, les signatures,
  les textes, les tests. Le plan d'ensemble et le plan d'implémentation
  restent pour le mainteneur et la conversation principale.
- [ ] `.claude/agents/implementeur.md`, `implementeur-exigeant.md` et
  `executant.md` : lire les fichiers que le prompt liste ; avant de rendre,
  lancer `--diff` et mettre à jour ces domiciles seulement ; ne créer aucun
  document.
- [ ] `CONTRIBUTING.md` : les tables « Documentation » et « Une règle, un
  domicile ».
- [ ] `docs/README.md` : la table des autorités.
- [ ] Les huit liens entrants vers une ancre d'`AGENTS.md`, et les trois
  commentaires de code qui le citent.

### Lot 10. Mesure et recette

- [ ] Additionner une fois, à la main, les octets que `agents:contexte` rend
  pour les six tâches de la section 2.2. Aucun script durable.
- [ ] Le mainteneur mène les quatre essais de la section 5 de la recherche.

### Partie C. Le prochain plan de plusieurs lots (M2)

### Lot C1. Des lots aux fichiers disjoints

- [ ] Le gabarit de plan de `CONTRIBUTING.md` donne à chaque lot une ligne
  « Fichiers : » qui liste ce qu'il modifie.
- [ ] Un fichier que plusieurs lots modifient appartient à un seul lot. Les
  autres lots attendent ce lot ou lui confient leur changement.
- [ ] `scripts/lots-disjoints.mjs <plan> <lot> <lot>` lit ces lignes et
  refuse deux lots qui partagent un fichier. La conversation principale le
  lance avant de lancer deux agents en même temps.

## 4. Les décisions du mainteneur

| Décision | Choix proposé | Autre choix |
|---|---|---|
| D1. Place des invariants | dans chaque paquet, `packages/<paquet>/invariants/` | un dossier central `docs/agents/` |
| D2. Chargement par Claude Code | `CLAUDE.md` de paquet qui importe `@AGENTS.md` | seulement la liste que passe l'orchestrateur |
| D3. Carte du code | générée depuis les commentaires d'en-tête | découpée à la main par paquet |
| D4. Budget de Codex | 32 Kio par chaîne, sans réglage du poste | 64 Kio, par `project_doc_max_bytes` dans la configuration de chaque poste |
| D5. Code modifié sans son domicile | `--diff` le rappelle à l'agent, sans bloquer | un test de CI qui bloque, avec une étiquette d'exemption |
| D6. Hook sur la création d'un document | oui, en plus du test | le test seul |
| D7. Spécification de Palettes | reste dans son dossier de recherche ; le manifeste y renvoie | rejoint `packages/plugin-palettes/` pendant ce chantier |
| D8. Fins de ligne | `* text=auto eol=lf` et le test de l'index | garder les contrôles octet par octet à chaque commit |
| D9. Marqueur d'un texte d'écran manquant | `TODO(texte)`, convention que le contrôle de style admet déjà, refusé par un test | le marqueur `À ÉCRIRE` de la critique, que le contrôle des capitales refuserait sans ajout à `ACRONYMES` |
| D10. `test:ui` par un implémenteur | tranché : jamais sans demande explicite ; le mainteneur vérifie l'interface | |

## 5. Ce que le plan rapporte

| Lot | Problème réglé | Coût | Valeur |
|---|---|---|---|
| A1 | lots mêlés et non commités (P1 de la critique) | trois définitions d'agents, une section | haute |
| A2 | fins de ligne contrôlées à la main (P8) | une ligne, cinq fichiers, un test | haute |
| A3 | suites relancées par chaque agent, exigences uniformes, textes sans note (P5 à P7) | définitions d'agents, une table | haute |
| 0 | entrées périmées | cinq corrections | haute |
| 1 | domicile cherché à la main, documents oubliés (P3, P10) ; plages de lignes pour les sous-agents | un manifeste, un script, un test | haute |
| 2 à 7 | Codex sans invariants ; `Read` refuse le fichier ; lecture hors sujet | quatorze commits, une session dédiée | haute si Codex est privé d'invariants, moyenne sinon |
| 3a, 7a | volume lu par chaque agent : environ 30 % de moins sur les invariants | une skill, un script, dix-huit commits relus | moyenne |
| 8 | document créé hors de sa place | un test, un hook | moyenne |
| C1 | fichiers carrefours (P2) | une ligne par lot, un script | moyenne ; la règle seule suffit au premier plan |
| 10 | mesure | une addition | faible ; elle confirme seulement |

L'étude « Evaluating AGENTS.md » citée par la recherche mesure qu'un fichier de contexte
coûte plus de 20 % de tokens sans hausse générale du taux de réussite. Les
consignes propres au projet sont la part que les agents suivent. Les
invariants sont de cette nature. Le plan garde donc leur contenu entier, et ne
réduit que ce que chaque agent lit et la forme qu'il lit.

Ordre :

1. A1, A2, A3, lots 0 et 1, essai 3 de la recherche.
2. Décision du mainteneur sur le seuil de la partie B.
3. Si le seuil est atteint : lots 2 à 7, 3a et 7a, puis 8 et 9, d'une traite.
4. C1 au prochain plan de plusieurs lots.
