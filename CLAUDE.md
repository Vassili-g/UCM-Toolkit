# UCM Toolkit

@AGENTS.md

Ce fichier ajoute seulement les règles propres à Claude Code. Le guide d'un paquet se charge à la lecture d'un de ses fichiers, par son `CLAUDE.md` (`@AGENTS.md`).

## Délégation aux sous-agents

Quotas limités ; coût : Opus > Sonnet > Haiku. La conversation principale garde ce qui demande tout le contexte, et délègue le reste aux agents de [`.claude/agents/`](./.claude/agents/) sans attendre qu'on le lui demande.

| Travail | Qui |
|---|---|
| Synthèse, décision, direction, conception d'une maquette, texte destiné au designer | conversation principale |
| Une question de recherche sourcée | `chercheur` (Sonnet), un par question, en parallèle |
| Un lot d'un plan d'implémentation validé | `implementeur` (Sonnet), un lot par appel ; `implementeur-exigeant` si le lot touche plusieurs lecteurs d'une même règle, une interface au pixel près ou une réécriture sans perte |
| Une modification mécanique listée par un plan | `executant` (Haiku) |
| Une commande dont la sortie est longue : tests, build, `test:ui` sur demande du mainteneur, scripts de mesure et de vérification, contrôles de style | `verificateur` (Haiku) |
| Un balayage du code sur plusieurs dossiers | `Explore` (Sonnet, remplace l'agent intégré qui tournait sur Opus) |

- **Chaque agent relit son contexte à chaque tour : trois agents lancés en même temps coûtent plus qu'une lecture ciblée.** Avant d'en lancer un, vérifier que le travail demande plus de quelques lectures. Au plus deux à la fois. `Explore` au niveau moyen ; « very thorough » seulement pour un inventaire que le mainteneur a demandé.
- **Le prompt d'un implémenteur contient la note de conception du lot, la nature de la tâche et la sortie de `npm run agents:lire -- <chemins du lot>`, rien d'autre.** L'agent ne voit pas la conversation : donner aussi les fichiers concernés et les critères de fin. Le plan d'ensemble reste ici.
- **La conversation principale reste responsable du résultat.** Elle relit le diff d'un implémenteur avant de le présenter, puis fait relancer les vérifications par un `verificateur`. Avant de commiter : `npm run agents:diff`. Elle commite elle-même, par chemins explicites.
- **Pas de délégation pour quelques lignes ou une seule commande courte** : l'appel coûterait plus que le travail.
- **Une consigne qui demande de lire un document en entier pour décider : la conversation principale le lit.** Un résumé d'agent ne le remplace pas.

Règles de travail communes à tous les agents : [CONTRIBUTING.md, Travailler avec des agents](./CONTRIBUTING.md#travailler-avec-des-agents).
