# Lot 7 : diagnostics finalisés et publication séparée

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] **7.1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : relever dans la table des sites diagnostics, faits lus, contexte et consommateurs, y compris après structure et compaction.
- [ ] **7.2 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : classer les calculs requis par diagnostic, correction, règle ou publication ; vérifier C42 et l'arbre exact encore nécessaire.
- [ ] **7.3 | gpt-6.1-sol | high** | **Claude Sonnet | high** : extraire une première famille de requêtes pures et déclarer ses dépendances ; comparer tous ses diagnostics ordonnés.
- [ ] **7.4 | gpt-6.1-sol | high** | **Claude Sonnet | high** : produire le résultat interne finalisé avec parties, localisations, props, états, imbrications, modèles et couverture ; test de parité complet.
- [ ] **7.5 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : assembler contrat et échantillons exporteur depuis ce résultat ; comparer hors date avec l'ancien chemin.
- [ ] **7.6 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : déplacer compaction et sérialisation après le calcul commun ; garder diagnostics tardifs et contrat ordonné.
- [ ] **7.7 | gpt-6.1-sol | high** | **Claude Sonnet | high** : brancher Architect sur surface et règles sans JSON.parse du contrat ; comparer corrections, questions et modèles.
- [ ] **7.8 | gpt-6-luna | low** | **Claude Sonnet | low** : retirer l'ancien chemin de production après parité ; garder le comparateur et exécuter les builds Architect et exporteur.

Prérequis : 6. Nature : extraction à sortie identique.
Chemins : `packages/plugin-socle/src/composant/contract/exportComponent.ts`,
`extractStructure.ts`, extracteurs appelés, `extractRules.ts`, `imbriques.ts`,
`template/modele.ts`, nouveaux modules de `composant/analyse/`,
`packages/plugin-architect/src/constatsDuMoteur.ts`, `regles.ts`, `sandbox/analyse.ts`.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : établir dans cette checklist la table des sites
  d'émission : diagnostics, faits, contexte et consommateurs. Inclure les sites
  après `structure`, après compaction et la traduction C42 par défaut.
  Classer chaque calcul comme requis par un diagnostic, une correction, les
  règles ou la seule publication ; ne pas retirer d'arbre exact encore requis.
- **Portée initiale répartie dans les cases ci-dessus** : extraire des requêtes pures à dépendances explicites
  et un résultat interne contenant diagnostics finalisés, parties/localisations,
  `props`, `stateModel`, imbrications, modèles, couverture et dépendances lues.
  Leur résultat reste indépendant de la génération de l'interface. Des appels
  explicites suffisent ; aucun ordonnanceur général n'est requis ici.
- **Portée initiale répartie dans les cases ci-dessus** : faire assembler à l'exporteur son contrat, ses
  échantillons, sa compaction et sa sérialisation après le même calcul.
  Faire consommer directement la surface et les règles à Architect ; retirer
  son `JSON.parse(content)` sans fabriquer de faux `ComponentExport`.
  Garder l'ancien chemin dans le banc jusqu'à parité de tous les extracteurs.

Sortie : Architect évite les sorties sans consommateur et conserve les
diagnostics tardifs ; l'exporteur produit le même contrat hors date.
Contrôles : socle/exporteur/Architect. **Build Architect et exporteur.**
