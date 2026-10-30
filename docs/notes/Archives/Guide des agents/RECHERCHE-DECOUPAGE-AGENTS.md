# Découper le guide des agents

Ce document mesure `AGENTS.md`, relève ce que les outils d'agents chargent et
ce que d'autres dépôts ont fait, puis compare les organisations possibles. Le
plan qui en découle est dans [PLAN-DECOUPAGE-AGENTS.md](./PLAN-DECOUPAGE-AGENTS.md).

## 1. Le constat

### 1.1 Taille

`AGENTS.md` compte 1 969 lignes et 152 469 octets, soit environ 40 000 tokens.
Il en comptait 3 411 octets au premier commit qui l'a créé, et 248 commits
l'ont modifié depuis. Chaque chantier y ajoute ses invariants : le fichier est
devenu l'endroit où l'on écrit par défaut.

| Partie | Octets | Part |
|---|---:|---:|
| En-tête et « Avant de modifier » | 3 655 | 2 % |
| Carte du code | 42 523 | 28 % |
| Invariants de l'exporteur et du format (11 groupes) | 44 175 | 29 % |
| Moteur de couleur | 16 454 | 11 % |
| UCM Palettes : écriture, langue, interface | 24 446 | 16 % |
| Explorateur de tokens | 6 637 | 4 % |
| UCM Nomenclature | 5 446 | 4 % |
| Vérification, publication, limites | 8 939 | 6 % |

Dans la carte du code, UCM Palettes prend 16 603 octets, le kit 5 396, le
moteur de couleur 4 479 et l'exporteur 4 388.

### 1.2 Ce que cette taille coûte

- L'outil `Read` de Claude Code refuse le fichier entier : il dépasse la borne
  de 25 000 tokens d'une lecture. `CLAUDE.md` demande de commencer par lui, et
  un agent qui suit la consigne reçoit une erreur, puis lit des tranches.
- Codex concatène les `AGENTS.md` de la racine jusqu'au dossier de lancement
  et s'arrête à `project_doc_max_bytes`, 32 Kio par défaut. Il ne reçoit donc
  qu'une partie du fichier : environ l'en-tête et la carte du code jusqu'au
  moteur de couleur. Aucun invariant ne lui parvient. La documentation d'OpenAI
  dit que Codex « cesse d'ajouter des fichiers » à la limite ; elle ne dit pas
  si le fichier qui la franchit est tronqué ou omis. L'essai 3 de la
  section 5 le tranche.
- Les implémenteurs (`.claude/agents/implementeur.md`) lisent « la carte du
  code des paquets touchés et le groupe d'invariants du lot ». Ils doivent
  trouver ces tranches à la main, dans un fichier qu'ils ne peuvent pas ouvrir
  d'un coup.

### 1.3 Écarts relevés à la lecture

Le fichier est tenu à la main, et ses parties non testées ont dérivé :

- la carte de `docs/` cite `notes/modes-et-aides/`, `notes/produit/`,
  `notes/qualite/` et `notes/verification/`, qui n'existent plus ;
- l'invariant de `pluginsSepares.test.ts` parle de « deux plugins », la carte
  de « trois », et le test en sépare quatre ;
- « Avant de modifier » énumère onze groupes d'invariants, le document en a
  dix-sept ;
- le titre d'un test de `tests/inventaireInvariants.test.ts` annonce
  « quatorze domaines » et en vérifie dix-sept ;
- la carte de l'explorateur ne cite pas `src/espace.ts`, qu'un invariant cite.

Les 391 fichiers de `packages/*/src/` ont tous un commentaire d'en-tête. La
carte en décrit 294 à la main.

### 1.4 Ce qui tient le fichier aujourd'hui

Trois contrôles lisent `AGENTS.md`, et lui seul :

| Contrôle | Ce qu'il exige |
|---|---|
| `tests/inventaireInvariants.test.ts` | les dix-sept groupes, dans leur ordre, entre `## Invariants` et `## Vérification` ; chaque nom de `AUTORITES` présent dans cette section et dans le code ; la liste exacte des tests de `tests/` dans la carte |
| `tests/docLinks.test.ts` | au moins vingt renvois vers des ancres de `FORMAT.md` et de `SPEC.md`, et chaque ancre existe |
| `scripts/controle-style.mjs` | `AGENTS.md` figure parmi les documents d'autorité, que le contrôle de redite compare entre eux |

Huit liens entrants visent une ancre d'`AGENTS.md` (`CONTRIBUTING.md`,
`packages/couleur/README.md`, `packages/plugin-architect/SPEC.md` et deux
notes de recherche), et trois commentaires de code le citent par section.

Un découpage doit donc adapter ces contrôles avant de déplacer la première
ligne. Sans cela, ils échouent, ou ils restent verts sur un fichier vidé.

### 1.5 Ce qu'on ne gagnera pas

`CONTRIBUTING.md` rapporte une passe de réduction de la prose du dépôt qui n'a
rendu que 2,4 % de son volume. Les invariants portent chacun une règle, une
borne et une autorité. Le volume total baissera peu. Le gain attendu porte sur
ce qu'un agent lit pour une tâche donnée.

Trois parties peuvent quand même sortir sans perte :

- la carte du code, dérivable des commentaires d'en-tête ;
- « Publier les paquets », une procédure de travail que la règle d'en-tête du
  fichier range dans `CONTRIBUTING.md` ou dans une skill ;
- les entrées périmées de la section 1.3.

## 2. Ce que les outils chargent

| Fichier | Codex | Claude Code | Moment |
|---|---|---|---|
| `AGENTS.md` racine | oui | non par défaut quand un `CLAUDE.md` existe ; oui par `@AGENTS.md` | démarrage |
| `AGENTS.md` de sous-dossier | seulement si Codex est lancé dans ce dossier ou plus bas | à la lecture d'un fichier du dossier, si aucun `CLAUDE.md` n'existe au-dessus ou dans le dossier | Codex : démarrage ; Claude : à la demande |
| `CLAUDE.md` de sous-dossier | non | oui, à la première lecture ou écriture d'un fichier du dossier | à la demande |
| import `@chemin` | non documenté | oui, quatre niveaux | démarrage, sans économie de contexte |
| `.claude/rules/*.md` avec `paths:` | non | oui, quand un fichier correspondant est lu ou écrit | à la demande |
| `.agents/skills/` | oui | non lu | description au démarrage, corps à l'appel |
| `.claude/skills/` | non | oui | description au démarrage, corps à l'appel |

Sources : [agents.md](https://agents.md),
[Codex, AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Codex, skills](https://learn.chatgpt.com/docs/build-skills),
[Claude Code, mémoire](https://code.claude.com/docs/en/memory),
[Claude Code, grands dépôts](https://code.claude.com/docs/en/large-codebases),
[Claude Code, sous-agents](https://code.claude.com/docs/en/sub-agents).

Quatre conséquences pour ce dépôt :

- Un fichier racine court est le seul texte que les deux outils lisent
  toujours. Anthropic vise moins de 200 lignes par `CLAUDE.md` ; Codex
  plafonne la chaîne entière à 32 Kio.
- Codex ne charge pas un `AGENTS.md` de paquet quand il est lancé à la racine.
  Le chargement à la demande est une demande ouverte
  ([openai/codex#12115](https://github.com/openai/codex/issues/12115)). Le
  fichier racine doit donc nommer les fichiers à lire.
- Un sous-agent personnalisé de Claude Code reçoit la hiérarchie des
  `CLAUDE.md`, et les agents intégrés Explore et Plan ne la reçoivent pas. Le
  champ `omitClaudeMd` la retire. Un sous-agent ne voit pas la conversation :
  l'orchestrateur doit lui passer la liste des documents.
- Ni `CLAUDE.md` ni `AGENTS.md` ne contraignent l'agent. La documentation de
  Claude Code renvoie à un hook `PreToolUse` pour refuser une action.

Cursor (`.cursor/rules/*.mdc`, `globs`) et Copilot
(`.github/instructions/*.instructions.md`, `applyTo`) ont des règles par
chemin, que ni Codex ni Claude Code ne lisent. Tous deux lisent les
`AGENTS.md` imbriqués.

## 3. Ce que d'autres dépôts ont fait

| Dépôt | Organisation | Taille de la racine |
|---|---|---|
| [getsentry/sentry](https://raw.githubusercontent.com/getsentry/sentry/master/AGENTS.md) | racine routeur : une table « motif de chemin, fichier à lire » vers `src/AGENTS.md`, `tests/AGENTS.md`, `static/AGENTS.md` ; procédures dans `.agents/skills/` ; règle écrite « AGENTS.md est la source, ne rien ajouter à CLAUDE.md ni aux règles Cursor » | environ 130 lignes |
| [vercel/next.js](https://raw.githubusercontent.com/vercel/next.js/canary/AGENTS.md) | un fichier avec une carte du code ; les procédures longues dans `.agents/skills/<nom>/SKILL.md` | environ 440 lignes |
| [apache/airflow](https://raw.githubusercontent.com/apache/airflow/main/AGENTS.md) | un fichier, des skills, des renvois vers la documentation de référence ; une règle nomme le document à mettre à jour dans la même pull request | environ 200 lignes |
| [microsoft/vscode](https://raw.githubusercontent.com/microsoft/vscode/main/.github/copilot-instructions.md) | un fichier Copilot, un renvoi vers un fichier d'instructions par sujet | environ 160 lignes |

Les tailles sont lues sur la page rendue, pas comptées par `wc`.

Pour désigner le document à mettre à jour, la recherche n'a trouvé aucun
standard. Les mécanismes observés sont :

- une table « chemin de code, document lié » dans le fichier d'instructions
  ([Dosu](https://dosu.dev/blog/how-to-catch-documentation-drift-claude-code-github-actions)),
  jugée par un modèle, donc non reproductible, et que ses auteurs ont trouvée
  incomplète pour les dérives indirectes ;
- `CODEOWNERS`, déterministe : motifs à la façon de `.gitignore`, le dernier
  motif qui correspond l'emporte. Il désigne un relecteur, pas un document
  ([GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)) ;
- des linters de dérive qui vérifient les chemins et les scripts cités
  ([agents-lint](https://github.com/giacomo/agents-lint)).
  `tests/inventaireInvariants.test.ts` fait déjà mieux pour ce dépôt.

## 4. Ce que disent les mesures

| Source | Mesure |
|---|---|
| [Lost in the Middle](https://arxiv.org/abs/2307.03172) | la précision baisse quand l'information est au milieu d'un long contexte |
| [Chroma, Context Rot](https://www.trychroma.com/research/context-rot) | sur dix-huit modèles, la fiabilité baisse avec la longueur ; une entrée ciblée d'environ 300 tokens bat l'entrée complète d'environ 113 000 |
| [IFScale](https://arxiv.org/abs/2507.11538) | à 500 consignes, les meilleurs modèles en suivent 68 % ; les premières sont favorisées |
| [ETH Zurich, Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) | les fichiers de contexte augmentent le coût de plus de 20 % sans hausse générale du taux de réussite ; une vue d'ensemble du dépôt n'aide pas ; les consignes propres au projet sont suivies |
| [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) | une skill laissée au choix de l'agent n'est pas appelée dans 56 % des cas ; un index des documents écrit dans `AGENTS.md` atteint 100 % ; compressé de 40 à 8 Ko, il garde ce résultat |

La mesure de Vercel porte sur un seul framework et vient de son éditeur.
Aucune mesure ne porte sur un guide de 2 000 lignes en français.

Trois enseignements pour le découpage :

- l'index des documents doit être dans le fichier toujours chargé, et non dans
  une skill que l'agent pourrait ne pas appeler ;
- la carte du code, qui est une vue d'ensemble, peut quitter le contexte
  permanent et se lire à la demande ;
- les invariants sont des consignes propres au projet, celles que les agents
  suivent ; ils doivent arriver entiers à l'agent qui touche leur domaine.

## 5. Les organisations possibles

| Option | Principe | Codex lancé à la racine | Claude Code | Limite |
|---|---|---|---|---|
| A. Un `AGENTS.md` par paquet, qui contient carte et invariants | convention agents.md | lit la racine seule, qui doit renvoyer aux paquets | lit chaque fichier à la demande, par un `CLAUDE.md` de paquet qui importe `@AGENTS.md` | l'exporteur et Palettes dépassent 32 Kio chacun |
| B. Un dossier central `docs/agents/` | un fichier par domaine | lit ce que la racine désigne | lit ce que la racine désigne | aucun chargement automatique ; les documents s'éloignent du code |
| C. Racine routeur, `AGENTS.md` court par paquet, invariants et carte en fichiers à la demande dans le paquet | Sentry, avec un manifeste testé | lit la racine, puis les fichiers qu'elle désigne | lit le `AGENTS.md` du paquet à la demande, et les fichiers que l'orchestrateur passe | un fichier de plus par domaine |
| D. `.claude/rules/` à `paths:` | Claude seul | ne lit rien | charge la règle au contact du fichier | Codex ne voit plus les invariants |

L'option C est recommandée. Elle tient dans le budget de Codex : chaque chaîne,
de la racine au paquet, reste sous 20 Kio. Elle garde les documents à côté du
code. Elle donne à l'orchestrateur une liste calculée plutôt qu'un choix.

Le déterminisme ne vient pas du découpage. Il vient de trois mécanismes que le
plan ajoute, chacun tenu par un test :

1. un manifeste `.agents/domiciles.json` associe chaque motif de chemin à un
   seul fichier d'invariants, avec la règle de `CODEOWNERS` : le dernier motif
   qui correspond l'emporte. Un test exige que chaque fichier de
   `packages/*/src/` ait un domicile ;
2. une table fermée « nature de l'information, document » dans le fichier
   racine, qui finit par la consigne de ne rien écrire et de rendre la question
   quand aucune ligne ne convient ;
3. un registre des documents : un test refuse tout fichier Markdown suivi par
   Git hors des emplacements déclarés, et un hook `PreToolUse` refuse sa
   création au moment où un agent Claude l'écrit.

Essais que le mainteneur peut mener avant ou après le plan :

1. Dans Claude Code, lancer `/context` et lire « Memory files ».
2. Ouvrir un fichier de `packages/kit/`, puis relancer `/context`.
3. Lancer Codex à la racine, et lui demander de citer le dernier invariant
   qu'il a reçu. Cela dit si le fichier qui dépasse 32 Kio est tronqué ou
   omis.
4. Lancer Codex avec `--cd packages/plugin-palettes`, après le lot 4 du plan,
   et vérifier qu'il cite le `AGENTS.md` du paquet.
