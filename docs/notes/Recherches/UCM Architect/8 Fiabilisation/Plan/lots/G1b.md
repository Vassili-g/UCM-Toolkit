# G1b. Calcul des noms dans un Worker de l'interface

Phase G. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase G
dans [README.md](../README.md), puis [RECHERCHE-ATTENTE-ANALYSE.md](../../RECHERCHE-ATTENTE-ANALYSE.md) en entier.

Agent : `implementeur-exigeant`. Dépend de : G1a.

Fichiers : `src/ui/` (nouveau Worker et son client), `src/ui/index.ts`, `src/nomenclature/session.ts`, `scripts/build-ui.cjs`, galerie.

- [ ] G1.3 L'interface lance le calcul de G1a dans un Worker. Le sandbox envoie l'inventaire et garde la génération courante. Chaque
  réponse porte la demande, la génération et la révision de l'acquisition. Une nouvelle analyse invalide les réponses précédentes.
- [ ] G1.4 Le sandbox relit les objets avant toute écriture, comme aujourd'hui. Le Worker n'écrit rien.
- [ ] G1.5 Si le Worker ne démarre pas ou échoue, le calcul se fait dans le sandbox. Vérifiez le chargement du Worker dans la galerie
  avec la politique de contenu du plugin.
- [ ] G1.6 Le journal de G0 mesure transfert de l'inventaire, démarrage du Worker, calcul et retour.

Fin : `npm run test:paquet -- architect` passe. Un test compare le bilan du Worker et celui du sandbox sur le rejeu.

## Avancement

Pas commencé.
