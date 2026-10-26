# Lot 4 : supprimer les coûts algorithmiques du kit

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] **4.1 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : indexer les variables du catalogue par clé puis nom, avec priorité et doublons inchangés ; test de collisions.
- [ ] **4.2 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : indexer collections et segments une seule fois par contenu immuable ; vérifier ordre et coût en opérations.
- [ ] **4.3 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : remplacer les recherches typographiques par fréquences de groupe et champ hors contribution courante ; test absence, null et exclusions.
- [ ] **4.4 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : produire seulement le préfixe de 5 000 combinaisons de modes, dans l'ordre global ; test de croissance en espace.
- [ ] **4.5 | gpt-6.1-sol | high** | **Claude Sonnet | high** : établir la cardinalité au-delà des entiers exacts et sa représentation ; isoler toute correction visible avec test rouge. Si la représentation change une sortie publiée, s'arrêter et rendre la question au mainteneur : le format publié ne change pas.
- [ ] **4.6 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : mémoriser la résolution d'alias par variable, contexte et profondeur restante ; comparer cycles, refus et diagnostics.
- [ ] **4.7 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : mutualiser les faits de fond et visibilité dont les modes, ancêtres et opacités sont explicites ; tester deux contextes différents.
- [ ] **4.8 | gpt-6-luna | low** | **Claude Haiku | low** : vérifier les versions, changelogs et pins de 4.1 à 4.7 ; corriger un écart isolé et relancer le contrôle de version, sans publication.

Prérequis : 0 et 2. Nature : transformations à sortie identique.
Chemins : `packages/kit/src/controles/catalogue.ts`, `typographie.ts`,
`accessibilite.ts`, leur résolution d'alias et tests voisins.
Chaque commit qui touche le kit porte sa propre montée de version.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : construire les index du catalogue une fois par
  contenu immuable. Respecter la priorité clé puis nom des variables et la
  première occurrence clé-ou-nom des collections. Préserver doublons, ordre et
  portée de recherche. Découper les segments une fois sans modifier les types
  publiés du catalogue ni conserver un index sur des tableaux modifiés.
- **Portée initiale répartie dans les cases ci-dessus** : remplacer les recherches d'autres sources par des
  fréquences par groupe et champ, contribution courante retirée. Garder
  `AUTRES_MINIMUM`, exclusions, identité des sources et distinction entre
  absence, `null` et valeur. Réutiliser le même calcul pour la future mise à jour
  par contribution.
- **Portée initiale répartie dans les cases ci-dessus** : produire paresseusement le préfixe des combinaisons
  de modes ; conserver la borne globale de 5 000 et son ordre entre variants.
  Calculer le reste sans produit cartésien matérialisé. Établir une cardinalité
  exacte au-delà de `Number.MAX_SAFE_INTEGER` et sa représentation de sortie
  avant modification ; préserver la sortie actuelle sur tout compte exact.
  Si un nouveau comportement visible est nécessaire au-delà, l'isoler comme
  correction documentée avec un test rouge, sans arrondi prétendu exact.
- **Portée initiale répartie dans les cases ci-dessus** : partager les résolutions par variable, contexte
  pertinent et profondeur restante. Garder cycles, refus et ordre de diagnostic.
  Mutualiser les faits de fond/visibilité dans l'accessibilité, en incluant
  modes, ancêtres et opacités dans le contexte. Différer une mutualisation dont
  les entrées ne sont pas encore explicitables.
- **Portée initiale répartie dans les cases ci-dessus** : après relecture des transformations, charger
  `publier-paquets` et appliquer la montée minimale du kit, son changelog et les
  pins exigés par `versionSuitLeContenu`. Exécuter les contrôles de version.
  La publication npm attend la clôture des lots.

Sortie : égalité profonde avec la référence, tests de croissance du nombre
d'opérations, espace proportionnel au préfixe retenu pour les modes.
Contrôles : kit, tests racine requis par ce paquet, puis Architect/exporteur.
**Build Architect avec kit reconstruit.** Aucun changement de format n'est prévu.
