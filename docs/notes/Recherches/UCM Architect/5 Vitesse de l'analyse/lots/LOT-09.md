# Lot 9 : réutilisation avec invalidation large et rétention bornée

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **9.1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : séparer faits et requêtes retenus de l'état affiché ; test que réponses et cases ne reviennent pas d'une génération antérieure. Résultat : `session.ts` du socle (une entrée par sujet : sorties, requêtes avec leurs entrées, suivi), remplie par `analyser` à la fin d'une analyse complète, section « Session (9.1) ».
- [ ] **9.2 | gpt-6.1-sol | high** | **Claude Sonnet | high** : préparer une révision de travail et promouvoir seulement après lecture, calcul et identité valides ; tests de fins annulée, arrêtée et périmée.
- [ ] **9.3 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : retenir les invalidations et retenter les lectures refusées ou partielles ; test échec puis disponibilité.
- [ ] **9.4 | gpt-6.1-sol | high** | **Claude Opus | high** : valider ressources et ensembles avant réutilisation d'un sujet ; test de modification sans notification couvrante.
- [ ] **9.5 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : appliquer d'abord l'invalidation du sujet entier ; parité avec reconstruction après mutation locale et globale.
- [ ] **9.6 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : réutiliser seulement les requêtes pures dont les entrées revalidées sont égales ; compter celles qui ne rejouent pas.
- [ ] **9.7 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : reconstruire sur Actualiser et conserver après changement de library les seules requêtes indépendantes validées.
- [ ] **9.8 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : borner sujets, octets et arêtes ; protéger l'actif, évincer le moins récent et nettoyer les orphelins.
- [ ] **9.9 | gpt-6-luna | low** | **Claude Sonnet | low** : tester actif trop gros, fermeture de session, perte de suivi et absence de persistance clientStorage ; mesurer les maxima.

Prérequis : 8. Nature : mémoire validée entre demandes.
Chemins nouveaux proposés : `packages/plugin-socle/src/composant/analyse/session.ts`,
`revisions.ts`, `retention.ts`, et intégration `sandbox/analyse.ts`.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : séparer faits, requêtes et contributions de l'état
  affiché. Préparer une révision de travail ; promouvoir seulement après
  lecture, calcul et contrôle de l'identité. Conserver les invalidations
  après annulation, arrêt, péremption ou lecture partielle. Retenter les refus.
  Réutiliser un sujet seulement après validation de ses ressources et ensembles.
- **Portée initiale répartie dans les cases ci-dessus** : invalider d'abord le sujet entier pour tout
  changement pertinent. Réutiliser les requêtes pures si toutes les entrées
  revalidées sont identiques. Actualiser emprunte la reconstruction sans
  résultats antérieurs. Changement de library conserve seulement les requêtes
  indépendantes de son catalogue et dont les autres entrées sont validées.
- **Portée initiale répartie dans les cases ci-dessus** : borner sujets, octets estimés et arêtes par
  configuration interne testable ; mesurer leurs maxima. Protéger le sujet
  actif, évincer les moins récents, retirer ressources et arêtes orphelines.
  Un actif trop gros reste analysé entièrement sans rétention. Fermer la
  session retire écoutes et données ; aucune persistance `clientStorage`.

Sortie : deuxième analyse identique sans requête pure répétée après validation,
et parité avec Actualiser après tous les changements du corpus.
Éviction et perte de suivi reviennent au chemin complet. Contrôle : Architect
et socle. **Build Architect.** La rétention inclut les copies temporaires.

## Session (9.1)

`composant/analyse/session.ts` (socle) range une entrée par sujet, clé du jeu de variants. Le module est générique : il ne connaît ni type Figma ni type du kit. Une entrée a trois parties et rien d'autre :

- `sorties` : relevé, catalogue, résultat du moteur sans `pourLaPublication` (qui tient des nœuds Figma), règles lues, niveau, architecture UCM et ignorés rangés ;
- `requetes` : contrôles du kit, corrections proposées, projection (constats visibles et identifiants des constats ignorés), chacune avec le nom des sorties ou requêtes qu'elle a lues ;
- `suivi` : curseur du journal au début de la demande, inventaire (`noeuds`, `admis`, `parents`, `pages`) et couverture de l'acquisition.

`AnalyseCourante` reste l'état affiché d'une génération : identité, corrections fixées, constats, réponses, finalisée, périmée. Elle ne passe pas dans la session, qui ne reçoit ni réponse, ni case cochée, ni identité de génération. Les constats retenus sont ceux du kit, avant toute réponse : une réponse pose une correction dans `AnalyseCourante.corrections`, par une nouvelle table, sans toucher aux constats de la session.

`analyser` appelle `retenirEnSession` après le résultat final, seulement quand le statut est `complete` (la session reste vide après une fin partielle, annulée ou arrêtée). Une nouvelle analyse du même sujet remplace l'entrée. `sessionDesAnalyses()` expose la session aux tests ; `reinitialiserLAnalyse` la vide.

Limites : rien ne lit encore la session. La promotion sous conditions d'identité et de péremption (9.2), la validation (9.4) et la réutilisation (9.6) viennent après. Aujourd'hui, une analyse complète déjà périmée retient quand même son entrée, que rien ne lit.

Preuves : `session.test.ts` (socle : remplacement, ordre des sujets, oubli, forme de l'entrée) et `analyse.test.ts` (forme de l'entrée, fins partielle et annulée sans entrée, seconde analyse du même sujet sans correction fixée ni réponse). Altération : une analyse qui reprend les corrections de la précédente du même sujet fait échouer le dernier test.
