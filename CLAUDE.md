# UCM Toolkit

@AGENTS.md

Le guide d'un paquet se charge à la lecture d'un de ses fichiers, par son `CLAUDE.md` (`@AGENTS.md`).

## Délégation aux sous-agents

Quotas limités ; coût : Opus > Sonnet > Haiku. La conversation principale garde ce qui demande tout le contexte, et délègue le reste aux agents de [`.claude/agents/`](./.claude/agents/) sans attendre qu'on le lui demande.

| Travail | Qui |
|---|---|
| Synthèse, décision, direction, conception d'une maquette, texte destiné au designer | conversation principale |
| Une question de recherche sourcée | `chercheur` (Sonnet), un par question, en parallèle |
| Les fiches d'un composant pour un guide (skill `guide-composant`, étape 4) | `releveur` (Sonnet), deux au plus, chacun avec la moitié des systèmes |
| Un lot d'un plan d'implémentation validé | `implementeur` (Sonnet), un lot par appel ; `implementeur-exigeant` si le lot touche plusieurs lecteurs d'une même règle, une interface au pixel près ou une réécriture sans perte |
| Une modification mécanique listée par un plan | `executant` (Haiku) |
| Une commande dont la sortie est longue : tests, build, scripts de mesure et de vérification, contrôles de style ; `test:ui` seulement si le mainteneur a créé `_local/autorise-test-ui` | `verificateur` (Haiku) |
| Un balayage du code sur plusieurs dossiers | `Explore` (Sonnet, remplace l'agent intégré qui tournait sur Opus) |

- **Chaque agent relit son contexte à chaque tour : trois agents lancés en même temps coûtent plus qu'une lecture ciblée.** Avant d'en lancer un, vérifier que le travail demande plus de quelques lectures. Au plus deux à la fois. `Explore` au niveau moyen ; « very thorough » seulement pour un inventaire que le mainteneur a demandé.
- **Le prompt d'un implémenteur suit [CONTRIBUTING.md, Travailler avec des agents](./CONTRIBUTING.md#travailler-avec-des-agents).** Le plan d'ensemble reste ici.
- **La conversation principale reste responsable du résultat.** Elle relit le diff d'un implémenteur avant de le présenter, puis fait relancer les vérifications par un `verificateur`. Avant de commiter : `npm run agents:diff`. Elle commite elle-même, par chemins explicites.
- **Pas de délégation pour quelques lignes ou une seule commande courte** : l'appel coûterait plus que le travail.
- **Une consigne qui demande de lire un document en entier pour décider : la conversation principale le lit.** Un résumé d'agent ne le remplace pas.

Règles de travail communes à tous les agents : [CONTRIBUTING.md, Travailler avec des agents](./CONTRIBUTING.md#travailler-avec-des-agents).
