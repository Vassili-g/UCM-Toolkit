# Lot 12 : signatures par contrôle et factorisation des modes

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] **12.1 | gpt-6.1-sol | medium** : sélectionner un contrôle répétitif d'après les compteurs et enregistrer ses entrées exactes dans le banc.
- [ ] **12.2 | gpt-6.1-sol | high** : signer valeurs, liaisons, noms lus, modes, ancêtres, frontières et options ; le hash n'écarte pas la comparaison exacte.
- [ ] **12.3 | gpt-6.1-sol | medium** : partager le résultat relatif et rattacher séparément chaque occurrence ; test de localisations et corrections.
- [ ] **12.4 | gpt-6.1-sol | high** : factoriser les rapports de contraste par collections atteignables et branches d'alias ; reconstruire le préfixe logique admis.
- [ ] **12.5 | gpt-6.1-sol | medium** : tester hash constant, corpus répétitif et corpus distinct ; comparer sorties, mémoire et opérations.
- [ ] **12.6 | gpt-6-luna | low** : préparer le build candidat et les compteurs pour une mesure Figma par le mainteneur ; garder le calcul direct disponible.

Prérequis : 7 ; intégrer ensuite aux révisions du lot 10. Nature : partage
de résultats purs. Chemins : modules de requêtes, accessibilité/typographie,
correspondances d'occurrences et banc de mesures.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : choisir un contrôle répétitif identifié par les
  compteurs. Définir sa signature avec toutes ses dépendances : valeurs,
  liaisons, noms si lus, modes, ancêtres, frontières et options. Un hash indexe
  des candidats ; l'égalité exacte décide. Garder un résultat relatif partagé
  et un rattachement propre à chaque occurrence réelle.
- **Portée initiale répartie dans les cases ci-dessus** : factoriser les rapports de contraste par collections
  atteignables, y compris par branches possibles d'alias. Reconstruire tous les
  `rapports`, étiquettes, comptes et premier pire cas pour le préfixe logique
  admis. La borne de 5 000 et le coût de matérialisation restent explicites.
- **Portée initiale répartie dans les cases ci-dessus** : prouver la parité avec un hash constant, un corpus
  répétitif et un corpus où tout diffère. Mesurer signatures, réutilisations et
  mémoire ; prévoir calcul direct et borne de rétention.

Activation : gain net supérieur à la dispersion sur Figma, coût maîtrisé sur
corpus distinct. Sans mesure, conserver le chemin direct. **Build Architect
du candidat** pour la recette ; le partage reste désactivable dans le banc.
