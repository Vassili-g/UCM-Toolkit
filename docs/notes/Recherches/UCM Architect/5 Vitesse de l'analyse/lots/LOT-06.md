# Lot 6 : faits ordinaires et acquisition commune

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] **6.1 | gpt-6.1-sol | medium** : inventorier les champs consommés par relevé, moteur, budget et surveillance dans les modules existants ; fixer leurs projections en tests.
- [ ] **6.2 | gpt-6.1-sol | high** : définir les faits ordinaires avec identité, topologie, provenance, champs acquis ou refusés et couverture ; aucun objet Figma dans les types.
- [ ] **6.3 | gpt-6-luna | medium** : centraliser une famille de propriétés de nœuds et ses refus ; comparer les deux lecteurs avant d'en ajouter une autre.
- [ ] **6.4 | gpt-6-luna | medium** : centraliser variables et collections promises ou refusées ; tests de collision, alias et ressource redevenue lisible.
- [ ] **6.5 | gpt-6-luna | medium** : centraliser styles et maîtres avec déduplication par identité ; comparer frontières d'instance et localisations.
- [ ] **6.6 | gpt-6.1-sol | high** : séparer inventaires locaux, règles par page et libraries par demande ; borner à huit requêtes indépendantes en vol.
- [ ] **6.7 | gpt-6-luna | medium** : faire consommer les faits de peinture au relevé et au moteur ; comparer fills, strokes et refus.
- [ ] **6.8 | gpt-6.1-sol | high** : projeter les segments de texte par consommateur et fusionner les plages adjacentes prouvées ; conserver deux lectures si nécessaire.
- [ ] **6.9 | gpt-6.1-sol | medium** : dériver l'inventaire de péremption de la topologie et écouter les pages autorisées avant lecture longue ; test de couverture inconnue.
- [ ] **6.10 | gpt-6-luna | low** : comparer dans le banc parcours natif indexé et parcours coopératif explicite ; ne fixer aucun gagnant avant Figma.

Prérequis : 4 et 5. Nature : extraction progressive à sortie identique.
Chemins nouveaux proposés : `packages/plugin-socle/src/composant/analyse/faits.ts`,
`acquisition.ts`, `ressources.ts`, `topologie.ts`.
Lecteurs à adapter : `packages/plugin-architect/src/releveDuComposant.ts`,
`lectureDuComposant.ts`, `lecture.ts`, `catalogue.ts`, `sandbox/analyse.ts`,
et `packages/plugin-socle/src/composant/contract/`.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : définir les faits sans objet Figma : identité,
  parent, ordre, type, frontières, champs acquis ou refusés, couverture et
  provenance. Séparer topologie et valeurs. Énumérer les champs consommés par
  chaque lecteur et diagnostic avant de déplacer leur acquisition. Garder les
  vues distinctes du relevé, du moteur, du budget et de la surveillance.
- **Portée initiale répartie dans les cases ci-dessus** : centraliser les lectures de propriétés et les
  promesses de variables, collections, styles et maîtres, refus compris.
  Garder un inventaire local complet pour collisions et candidats, un inventaire
  de règles par page et un inventaire de libraries par demande. Borner les
  requêtes indépendantes à huit appels en vol au départ ; les compléments
  suivent la découverte de dépendances et le choix de library.
- **Portée initiale répartie dans les cases ci-dessus** : faire consommer les faits communs au relevé et
  aux lecteurs de ressources du moteur, famille de champs par famille.
  Mutualiser fills/strokes et segments de texte. L'union des champs de segments
  exige une projection et fusion de plages adjacentes par consommateur ; garder
  deux lectures si leur équivalence ou leur refus n'est pas prouvé.
- **Portée initiale répartie dans les cases ci-dessus** : faire produire l'inventaire de péremption depuis
  la topologie commune. Comparer parcours natif indexé et parcours explicite
  coopératif dans le banc, sans présumer du plus rapide dans Figma. Écouter les
  pages autorisées avant les lectures longues ; garder toute couverture inconnue
  comme obligation de relecture.

Sortie : relevé profondément identique, compteurs de chaque lecture expliqués,
mêmes budgets et limites. Les projections pures ne rappellent pas Figma.
Contrôles : socle, Architect et exporteur. **Build Architect à chaque famille
intégrée testable.** Mettre à jour les cartes sans créer de document auxiliaire.
