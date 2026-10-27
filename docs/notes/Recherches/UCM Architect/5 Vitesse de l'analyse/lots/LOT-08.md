# Lot 8 : couverture des dépendances et Actualiser

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **8.1 | gpt-6.1-sol | high** | **Claude Opus | high** : établir la matrice de couverture des événements pour nœuds, héritage et pages ; tests de portée inconnue. Résultat : `plugin-socle/src/composant/analyse/couverture.ts`, test `plugin-socle/tests/couverture.test.ts`, section « Matrice de couverture (8.1) ».
- [ ] **8.2 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : établir les relectures obligatoires de variables, collections, styles, maîtres, règles et libraries ; test de ressource externe modifiée.
- [ ] **8.3 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : vérifier la documentation Figma puis brancher seulement les événements dont la couverture est établie, dont stylechange si pertinent. Confier d'abord la lecture de la documentation Figma à un `chercheur`.
- [ ] **8.4 | gpt-6.1-sol | high** | **Claude Sonnet | high** : accumuler les changements après la première péremption et hors analyse active ; tests d'événement retardé et de série de mutations.
- [ ] **8.5 | gpt-6-luna | medium** | **Claude Sonnet | medium** : conserver anciens parents et topologie des suppressions ; élargir l'invalidation si parent ou événement manque.
- [ ] **8.6 | gpt-6-luna | medium** | **Claude Sonnet | medium** : interrompre la couverture quand la page est quittée ou la file déborde ; test de retour sur page.
- [ ] **8.7 | gpt-6-luna | medium** | **Claude Sonnet | medium** : porter Analyser et Actualiser jusqu'au sandbox ; test qu'Actualiser contourne les résultats précédents.
- [ ] **8.8 | gpt-6.1-sol | high** | **Claude Sonnet | high** : invalider après changement de configuration et écriture, distinguer imports et changements externes ; tests Ctrl+Z et refus.
- [ ] **8.9 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : rendre inapplicable une génération modifiée pendant lecture ou calcul ; tester avant réception de l'événement. Trancher aussi ce que 3.9 a laissé : aujourd'hui `perimer()` (`sandbox/analyse.ts`) laisse finir le calcul en cours, et un clic sur Analyser juste après la péremption reçoit `occupe` jusqu'à sa fin. Lever le jeton de l'opération non finalisée relancerait tout de suite ; cela change le test « une analyse lente d'Alert puis la sélection de Button ».

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

## Matrice de couverture (8.1)

**Module.** `packages/plugin-socle/src/composant/analyse/couverture.ts`, sans objet Figma.

`MATRICE_DE_COUVERTURE` donne pour chaque entrée lue l'événement qui la couvre, ou la relecture et son motif :

| Entrée | Suivi | Condition ou motif |
|---|---|---|
| `noeud` | `nodechange` | page écoutée |
| `liaisons-de-variables` | relecture | `NodeChangeProperty` ne nomme ni `boundVariables` ni les modes explicites |
| `valeur-heritee` | `nodechange` | maître local, sur une page écoutée, inscrit dans les maîtres suivis |
| `page` | `nodechange` | page écoutée |
| `regles` | `nodechange` | instances de règles sur une page écoutée |
| `maitre` | `nodechange` | maître local, sur une page écoutée |
| `variable`, `collection` | relecture | aucun événement sans `documentchange`, qui exige `loadAllPagesAsync` |
| `style` | relecture | `stylechange` reste à vérifier (8.3) |
| `inventaire` | relecture | les listes locales n'ont pas d'événement |
| `library` | relecture | une library change hors du fichier |

`doitSeRelire(entree, { pageEcoutee, locale })` en tire la décision : une page non écoutée ou une ressource distante se relit.

`porteeDuChangement(changement, { noeuds, maitres })` classe un élément de `nodeChanges` :

- un identifiant de l'inventaire ou d'un maître suivi touche le sujet, quel que soit le type ;
- un nœud hors de l'inventaire touche le sujet quand un de ses ancêtres est suivi. C'est le cas d'un calque créé ou déplacé sous un variant : son identifiant n'est pas dans l'inventaire de péremption, et `surChangementDuDocument` le manque aujourd'hui ;
- portée inconnue : type de changement inconnu, nœud supprimé, ancêtres illisibles, suppression hors de l'inventaire quand un maître est suivi (l'ancien parent n'est pas connu avant 8.5) ;
- `porteeDesChangements` rend le sujet dès qu'un changement le touche, sinon la première portée inconnue.

**Branchement.** Aucun : 8.4 accumule les changements avec cette portée, 8.5 ajoute l'ancienne topologie des suppressions. Les maîtres suivis viennent des faits acquis (`maitreDe`).

**Preuves.** `couverture.test.ts`, 9 tests : relectures obligatoires, conditions de page et d'origine, calque créé sous un variant, changement sous un maître suivi, changement hors du sujet, quatre portées inconnues, série.
