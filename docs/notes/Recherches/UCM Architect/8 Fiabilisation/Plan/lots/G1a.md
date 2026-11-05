# G1a. Calcul des noms sans le sandbox

Phase G. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase G
dans [README.md](../README.md), puis [RECHERCHE-ATTENTE-ANALYSE.md](../../RECHERCHE-ATTENTE-ANALYSE.md) en entier.

Agent : `implementeur-exigeant`. Dépend de : G0.

Fichiers : `src/nomenclature/session.ts`, `src/nomenclature/` (nouveau module de calcul pur), `packages/plugin-socle/src/inventaireDeNoms.ts`
en lecture, tests.

- [ ] G1.1 Séparez le calcul des noms (lexique, vocabulaire, renommages, collisions, questions, bilan) de la session. Son entrée est
  un inventaire sérialisable construit par le sandbox depuis une acquisition fraîche, avec protections, refus et règles du fichier.
  Sa sortie est le bilan actuel, dans son ordre complet.
- [ ] G1.2 Test de parité. Sur les fixtures et le rejeu, le bilan du calcul pur égale celui de la session actuelle après sérialisation,
  sous Node et dans QuickJS.

Fin : `npm run test:paquet -- architect` passe. La session du sandbox appelle le calcul pur, sans changement de résultat.

## Avancement

Pas commencé.
