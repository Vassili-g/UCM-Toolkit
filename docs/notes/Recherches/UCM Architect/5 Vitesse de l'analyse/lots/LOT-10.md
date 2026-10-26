# Lot 10 : graphe de requêtes et recalcul ciblé

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] **10.1 | gpt-6.1-sol | high** : définir clé de requête, session du document, version d'algorithme et révisions ; exclure la génération d'interface.
- [ ] **10.2 | gpt-6.1-sol | high** : enregistrer les dépendances réellement lues et remplacer les arêtes conditionnelles au recalcul ; test de branche changée.
- [ ] **10.3 | gpt-6-luna | medium** : suivre ensembles ordonnés, recherches vides et priorités ; tester le premier candidat apparu après absence.
- [ ] **10.4 | gpt-6.1-sol | high** : ajouter les arêtes inverses et valider à la demande ; égalité exacte arrête la propagation sans perdre diagnostics ni limites.
- [ ] **10.5 | gpt-6.1-sol | medium** : séparer rapport numérique, verdict AA/AAA et présentation des noms ; tester un changement de seuil seul.
- [ ] **10.6 | gpt-6.1-sol | high** : invalider par propriété, fonds, descendants et groupe typographique ; compter requêtes et arêtes visitées.
- [ ] **10.7 | gpt-6.1-sol | high** : traiter frontières, ordre, budget et couverture de modes ; repli large si portée inconnue ou coût fin supérieur à la reconstruction.
- [ ] **10.8 | gpt-6.1-sol | medium** : comparer après chaque ajout, suppression, déplacement, renommage, alias et mode à la reconstruction complète.
- [ ] **10.9 | gpt-6-luna | low** : ajouter les compteurs de propagation arrêtée, requêtes rejouées et arêtes visitées au banc de mutations.

Prérequis : 9. Nature : incrémentalité du calcul pur.
Chemins nouveaux proposés : `packages/plugin-socle/src/composant/analyse/requetes.ts`,
`dependances.ts`, et requêtes extraites au lot 7.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : donner aux requêtes une clé complète, une révision
  de dernière vérification et de dernier changement, et des dépendances lues
  pendant le calcul. Exclure la génération de la clé ; inclure session du
  document et version de l'algorithme. Remplacer les arêtes conditionnelles au
  recalcul. Suivre aussi ensembles ordonnés, recherches vides et priorités.
- **Portée initiale répartie dans les cases ci-dessus** : ajouter les dépendances inverses et la validation à
  la demande. Une sortie exactement égale conserve sa révision de changement et
  arrête la propagation. L'égalité inclut diagnostics et limites. Séparer
  rapport numérique, verdict AA/AAA et présentation des noms.
- **Portée initiale répartie dans les cases ci-dessus** : invalider par propriété et groupe depuis les faits
  modifiés. Inclure fonds et descendants, groupes typographiques, frontières,
  ordre, budget et couverture de modes. Revenir à l'invalidation large si la
  portée manque ou si le coût fin dépasse la reconstruction mesurée.
- **Portée initiale répartie dans les cases ci-dessus** : jouer des séquences de mutations déterministes
  et comparer après chaque mutation à la reconstruction complète sur les mêmes
  faits. Affirmer aussi le nombre de requêtes rejouées, d'arêtes visitées et de
  propagations arrêtées. L'insertion du premier candidat après absence doit
  invalider la réponse négative.

Sortie : mêmes sorties après ajout, suppression, déplacement, renommage,
changement d'alias ou de mode. Une modification locale épargne les requêtes
indépendantes ; une modification globale peut tout recalculer.
Contrôle : socle/Architect et exporteur si requêtes partagées. **Build Architect.**
