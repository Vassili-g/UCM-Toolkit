# UCM Contract Exporter

Commence par lire [`AGENTS.md`](./AGENTS.md) : il donne l'ordre de lecture des
documents, la carte du code, les commandes et les invariants à ne jamais
casser. Ce fichier n'ajoute que les règles propres à Claude Code.

## Délégation aux sous-agents

Les quotas des comptes sont limités ; Opus coûte plus que Sonnet, et Sonnet
plus que Haiku. La conversation principale garde ce qui demande tout le
contexte, et délègue le reste aux agents de [`.claude/agents/`](./.claude/agents/)
sans attendre qu'on le lui demande.

| Travail | Qui |
|---|---|
| Synthèse, décision, direction, conception d'une maquette, texte destiné au designer | Conversation principale |
| Une question de recherche sourcée | `chercheur` (Sonnet), un par question, en parallèle |
| Un lot d'un plan d'implémentation validé | `implementeur` (Sonnet), un lot par appel |
| Une commande dont la sortie est longue : tests, build, `test:ui`, scripts de mesure et de vérification, contrôles de style | `verificateur` (Haiku) |
| Un balayage du code sur plusieurs dossiers | `Explore` (Sonnet, remplace l'agent intégré qui tournait sur Opus) |

Chaque agent relit son contexte à chaque tour : trois agents lancés en même
temps coûtent plus qu'une lecture ciblée. Avant d'en lancer un, la
conversation principale vérifie que le travail demande plus de quelques
lectures, et elle n'en lance pas plus de deux à la fois. `Explore` se
demande au niveau moyen ; « very thorough » se réserve à un inventaire que le
mainteneur a demandé.

La conversation principale reste responsable du résultat :

- elle donne à l'agent la question ou le lot, les fichiers concernés et les
  critères de fin, car il ne voit pas la conversation ;
- elle relit le diff d'un `implementeur` avant de le présenter, puis fait
  relancer les vérifications par un `verificateur` ;
- elle ne délègue pas une tâche de quelques lignes ou une seule commande
  courte : l'appel coûterait plus que le travail ;
- elle commite elle-même, par chemins explicites.

Quand une consigne demande de lire un document en entier pour en tirer une
décision, la conversation principale le lit ; un résumé d'agent ne le
remplace pas.
