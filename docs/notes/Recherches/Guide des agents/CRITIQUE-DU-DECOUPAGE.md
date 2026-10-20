# Ce que le découpage ne règle pas

Ce document confronte le [plan du découpage](./PLAN-DECOUPAGE-AGENTS.md) à une
session réelle : la fin du plan de fiabilité (lots 2 à 7 et 9 à 14, commit
`94d384cc`). Il dit ce que le plan aurait évité, ce qu'il n'aurait pas évité,
et les mesures qui manquent.

## 1. La session observée

Une conversation principale sur Opus, quatorze sous-agents, trois au plus en
même temps. Coût de chaque sous-agent, en tokens :

| Travail | Agent | Tokens |
|---|---|---:|
| Lot 5, réparation et fin de l'écriture de Palettes | `implementeur-exigeant` | 392 000 |
| Lot 12, nommage dans le kit | `implementeur-exigeant` | 312 000 |
| Lot 7, lois entre produits | `implementeur-exigeant` | 229 000 |
| Lot 13, kit de règles | `implementeur-exigeant` | 194 000 |
| Audit du travail laissé par Codex | `Explore` | 176 000 |
| Lot 11, porte `protocoles` | `implementeur-exigeant` | 145 000 |
| Huit autres agents | divers | 22 000 à 71 000 chacun |

`AGENTS.md` pèse environ 40 000 tokens. Un agent n'en lit qu'une partie : la
carte de son paquet et un ou deux groupes d'invariants. Sa lecture compte
donc pour une part modeste du coût d'un gros lot. Le reste va à la lecture du
code, aux tests relancés et aux comptes rendus.

## 2. Les problèmes, un par un

| Problème rencontré | Coût observé | Le plan le règle ? |
|---|---|---|
| P1. Un autre implémenteur a laissé sept lots mêlés, non commités, et une écriture de Palettes à moitié refaite (9 tests rouges) | un audit, une vérification complète, une réparation, une clôture commune | non |
| P2. Des fichiers carrefours : l'écriture de Palettes touchée par six lots, `architecture.ts` par trois | des lots en attente du lot 5, au plus deux agents utiles à la fois | non |
| P3. Des documents oubliés : la carte des tests d'`AGENTS.md`, le README du kit, des liens morts de notes de recherche vers des fichiers déplacés | cinq retouches de la conversation principale, deux échecs de `docLinks` | en partie : `--diff` rend les domiciles, mais une note de recherche qui lie un fichier source n'a pas de domicile |
| P4. Trois documents pour une tâche : plan de fiabilité, plan d'implémentation, note de conception | chaque agent lit les trois ; la conversation principale recopie aussi la tâche dans le prompt | non |
| P5. Des vérifications relancées par chaque agent : typecheck global, suites de plusieurs paquets, tests racine | `npm test` prend 173 secondes ; huit agents ont lancé au moins une suite complète de paquet | non |
| P6. Les mêmes exigences pour toutes les tâches : preuve du test rouge, état de galerie, textes en deux langues | des preuves rouges pour des déplacements de code à sortie identique | non |
| P7. Des textes d'écran écrits par un agent, sans note | trois textes de Palettes à faire valider après coup | non |
| P8. Des fins de ligne douteuses : un agent écrit par .NET, un comptage faux dans le shell | deux contrôles octet par octet, aucun défaut réel | non |
| P9. `AGENTS.md` illisible d'un coup par `Read` | des lectures en tranches | oui |
| P10. Le document à mettre à jour se cherche à la main | des oublis (P3) | oui, par le manifeste |

Le plan règle P9 et P10, et une part de P3. Il réduit aussi le coût de lecture
au démarrage de chaque agent. Il ne touche pas aux problèmes qui ont coûté le
plus dans cette session : P1, P2, P4 et P5.

Un risque s'ajoute. Les lots 2 à 7 du plan réécrivent `AGENTS.md`. Pendant la
session observée, six agents y ont ajouté une ligne. Mené en même temps qu'un
autre plan, le découpage produirait les conflits que la section 3 du plan
prévoit, et chaque conflit coûterait une relecture.

## 3. Verdict

Le découpage reste utile. Il n'est pas la solution aux coûts de cette session.
Il faut le mener seul, quand aucun autre plan ne modifie `AGENTS.md`, et lui
ajouter les mesures de la section 4.

## 4. Les mesures qui manquent

### M1. Un lot fini est commité avant le suivant (P1)

- Règle de `CLAUDE.md` et du prompt de Codex : un implémenteur ne commence pas
  un lot tant que le précédent n'est pas commité, ou rendu comme non commencé.
- Deux implémenteurs ne travaillent jamais sur le même plan sans un commit
  entre eux. Le second commence par `git status` et s'arrête si l'arbre porte
  du travail qu'aucune case du plan ne décrit.

### M2. Un plan découpé par fichiers possédés (P2)

- Chaque tâche d'un plan liste ses fichiers. Avant de lancer deux agents, la
  conversation principale vérifie que leurs listes sont disjointes. Ce contrôle
  peut être un script qui lit le plan.
- Un fichier que plusieurs lots modifient est attribué à un seul lot. Les
  autres lots attendent ce lot ou passent par lui.

### M3. Une seule entrée par tâche (P4)

- La note de conception se suffit à elle-même : le pourquoi en une phrase, les
  fichiers, les signatures, les textes, les tests. L'agent ne lit qu'elle et le
  domicile que rend `agents:contexte`.
- Le plan de fiabilité et le plan d'implémentation restent pour le mainteneur
  et la conversation principale ; l'agent ne les lit pas.

### M4. Vérifier par paquet, une seule fois à la fin (P5)

- Un implémenteur lance `npm run test:paquet -- <nom>` sur les paquets qu'il
  touche, jamais `npm test` à la racine.
- La vérification complète se lance une fois, par un `verificateur`, sur un
  arbre stable, avant le commit.
- Les tests racine longs (`loisEntreProduits`, `nomsDePalettes`) ne se lancent
  que si la tâche touche Palettes, Nomenclature ou le nommage du kit.

### M5. Des exigences selon la nature de la tâche (P6)

| Nature de la tâche | Exigences |
|---|---|
| Déplacement de code à sortie identique | les tests existants passent sans changement d'attente ; pas de preuve rouge |
| Correction d'un défaut | un test qui échoue sans la correction |
| Texte ou écran nouveau | le texte vient de la note ; un état de galerie ; les deux langues si le plugin a un catalogue |

### M6. Aucun texte d'écran sans note (P7)

Un agent qui a besoin d'un texte absent de la note écrit un marqueur
`À ÉCRIRE` dans le catalogue et le signale dans son compte rendu. La
conversation principale écrit le texte et le fait valider.

### M7. Les fins de ligne fixées par Git (P8)

Ajouter `* text=auto eol=lf` en tête de `.gitattributes`. Git normalise alors
tout fichier texte à l'enregistrement, quel que soit l'outil qui l'a écrit.
Les règles d'octets actuelles restent en dessous. Un test vérifie qu'aucun
fichier suivi ne contient `\r\n` hors des exceptions déclarées.

### M8. Les notes de recherche ne lient pas un fichier source à l'aveugle (P3)

Une note qui lie un fichier de `packages/*/src/` casse quand le fichier
bouge. Deux choix : lier le domicile (le `AGENTS.md` ou le fichier
d'invariants du paquet) plutôt que le fichier, ou laisser `docLinks` le
signaler et corriger dans le commit qui déplace le fichier. Le second choix
est celui d'aujourd'hui ; le manifeste peut le rendre visible en listant les
notes qui citent un chemin du diff.

## 5. Ordre proposé

1. M1, M7 : deux règles et une ligne de `.gitattributes`, sans dépendance.
2. M4, M5, M6 : les définitions des agents (`.claude/agents/`) et `CLAUDE.md`.
3. Le plan du découpage, mené seul, avec M3 au lot 9 et M8 au lot 1.
4. M2 au prochain plan de plusieurs lots.
