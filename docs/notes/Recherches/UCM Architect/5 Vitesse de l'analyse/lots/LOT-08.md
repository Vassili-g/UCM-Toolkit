# Lot 8 : couverture des dépendances et Actualiser

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] **8.1 | gpt-6.1-sol | high** : établir la matrice de couverture des événements pour nœuds, héritage et pages ; tests de portée inconnue.
- [ ] **8.2 | gpt-6.1-sol | medium** : établir les relectures obligatoires de variables, collections, styles, maîtres, règles et libraries ; test de ressource externe modifiée.
- [ ] **8.3 | gpt-6.1-sol | medium** : vérifier la documentation Figma puis brancher seulement les événements dont la couverture est établie, dont stylechange si pertinent.
- [ ] **8.4 | gpt-6.1-sol | high** : accumuler les changements après la première péremption et hors analyse active ; tests d'événement retardé et de série de mutations.
- [ ] **8.5 | gpt-6-luna | medium** : conserver anciens parents et topologie des suppressions ; élargir l'invalidation si parent ou événement manque.
- [ ] **8.6 | gpt-6-luna | medium** : interrompre la couverture quand la page est quittée ou la file déborde ; test de retour sur page.
- [ ] **8.7 | gpt-6-luna | medium** : porter Analyser et Actualiser jusqu'au sandbox ; test qu'Actualiser contourne les résultats précédents.
- [ ] **8.8 | gpt-6.1-sol | high** : invalider après changement de configuration et écriture, distinguer imports et changements externes ; tests Ctrl+Z et refus.
- [ ] **8.9 | gpt-6.1-sol | medium** : rendre inapplicable une génération modifiée pendant lecture ou calcul ; tester avant réception de l'événement.

Prérequis : 7. Nature : correction de fraîcheur, sans mémoire activée.
Chemins : `packages/plugin-architect/src/code.ts`, `sandbox/contexte.ts`,
`sandbox/analyse.ts`, `sandbox/configuration.ts`, `messages/analyse.ts`,
`ui/application.ts`, nouvelles fonctions de suivi dans `composant/analyse/`.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : définir et tester la matrice événement/couverture/
  relecture pour nœuds directs, valeurs héritées, variables, collections,
  styles, maîtres, règles de page, inventaires et library. Vérifier la
  documentation officielle Figma avant toute nouvelle utilisation d'événement.
  Ajouter `stylechange` seulement pour sa couverture établie. Ne pas charger
  toutes les pages. Toute entrée sans suivi démontré est relue par demande.
- **Portée initiale répartie dans les cases ci-dessus** : conserver changements, anciens parents et périodes
  de surveillance indépendamment de la notification unique `perime`.
  Accumuler après la première péremption et sans analyse active. Une suppression
  utilise l'ancienne topologie ; événement inconnu, parent absent ou file trop
  grande élargit l'invalidation. Quitter une page interrompt sa couverture.
- **Portée initiale répartie dans les cases ci-dessus** : porter l'intention Analyser/Actualiser jusqu'au
  sandbox. Invalider les dépendances après changement effectif de configuration,
  écriture, annulation ou rétablissement, sans relance automatique. Distinguer
  imports autorisés et changements externes concomitants. Un changement pendant
  lecture ou calcul rend la génération inapplicable.

Sortie : la matrice dispose de tests de retards, inconnus, sources externes,
configuration refusée et changement avant réception de son événement.
Une cession avant finalisation traite les événements reçus sans revendiquer
de barrière atomique. Contrôle : Architect/socle. **Build Architect.**
