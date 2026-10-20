# Guide des agents

Ce dossier traite le découpage d'`AGENTS.md`. Le fichier pèse 152 469 octets.
Codex n'en reçoit qu'une partie, et l'outil `Read` de Claude Code refuse de
l'ouvrir d'un coup.

| Document | Contenu |
|---|---|
| [RECHERCHE-DECOUPAGE-AGENTS.md](./RECHERCHE-DECOUPAGE-AGENTS.md) | mesures du fichier, chargement par Codex et Claude Code, dépôts comparables, études sur la longueur du contexte, options |
| [PLAN-DECOUPAGE-AGENTS.md](./PLAN-DECOUPAGE-AGENTS.md) | partie A : règles de travail des agents ; partie B : découpage en onze lots ; partie C : lots aux fichiers disjoints ; dix décisions |
| [CONVENTION-ECRITURE-AGENTS.md](./CONVENTION-ECRITURE-AGENTS.md) | proposition de convention d'écriture compacte pour les fichiers d'agents, avec un exemple mesuré (−29 %) |
| [PLAN-IMPLEMENTATION.md](./PLAN-IMPLEMENTATION.md) | plan réuni, revue, lots 1 à 10 cochés avec leurs commits, résultat mesuré |
| [CRITIQUE-DU-DECOUPAGE.md](./CRITIQUE-DU-DECOUPAGE.md) | le plan confronté à la fin du plan de fiabilité : ce qu'il règle, ce qu'il ne règle pas, huit mesures qui manquent |

État : [plan d'implémentation](./PLAN-IMPLEMENTATION.md) fait, lots 1 à 10. `AGENTS.md` pèse 9 298 octets ; une tâche type lit 9 à 25 % de l'ancien fichier (section 7 du plan).

Prochain geste : le mainteneur mène les essais Codex et `/context` (section 5 de la
recherche), et tranche les deux ambiguïtés de la section 7 du plan
d'implémentation.
