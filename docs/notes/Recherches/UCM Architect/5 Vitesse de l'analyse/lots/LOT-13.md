# Lot 13 : worker unique, transport par lots et repli

**Abandonné par le mainteneur.** Le chemin direct reste.

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] **13.1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : définir version, identité et numéros de lots du protocole ; seuls des faits ordinaires et tables de ressources traversent le pont.
- [ ] **13.2 | gpt-6-luna | medium** | **Claude Sonnet | medium** : borner la file à deux lots immuables et exiger un acquittement avant le troisième ; tests de saturation.
- [ ] **13.3 | gpt-6.1-sol | high** | **Claude Sonnet | high** : démarrer le worker depuis l'iframe et transmettre les requêtes prêtes pendant l'acquisition ; mesurer son démarrage.
- [ ] **13.4 | gpt-6.1-sol | high** | **Claude Sonnet | high** : finaliser les contrôles transversaux après fermeture des données requises ; aucune absence globale depuis un catalogue ouvert.
- [ ] **13.5 | gpt-6-luna | medium** | **Claude Sonnet | medium** : rejeter retards, doublons et anciennes générations ; assembler dans l'ordre de référence.
- [ ] **13.6 | gpt-6.1-sol | high** | **Claude Sonnet | high** : annuler aux points coopératifs ou terminer le worker ; replier sur le même calcul local après échec.
- [ ] **13.7 | gpt-6-luna | low** | **Claude Sonnet | low** : tester erreurs, réordonnancement et annulation du protocole sans navigateur ; compter copies et octets des trois contextes.
- [ ] **13.8 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : produire le build distribuable avec manifest et ressources du worker ; préparer la recette Figma du mainteneur.

Prérequis : 7 et 2. Nature : exécuteur alternatif des mêmes fonctions pures.
Chemins proposés : `packages/plugin-architect/src/analyse/worker.ts`,
`protocole.ts`, `transport.ts`, pont `src/ui/`, pilote `src/sandbox/`,
scripts de build et manifest réels.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : définir données ordinaires et tables de ressources
  partagées, version de protocole, identité d'analyse et numéro de lot.
  Le sandbox seul lit Figma et valide l'écriture. Un worker, au plus deux lots
  en attente, acquittement avant un troisième. Les lots publiés sont immuables.
  Un catalogue non clos n'autorise aucun diagnostic d'absence global.
- **Portée initiale répartie dans les cases ci-dessus** : démarrer depuis l'iframe et recouvrir acquisition
  et requêtes prêtes. Finaliser contrôles transversaux après fermeture des
  données requises. Rejeter retard, doublon et ancienne génération. Assembler
  dans l'ordre de référence. Annuler entre unités coopératives ou terminer le
  worker ; repli coopératif sur les mêmes fonctions si démarrage ou calcul échoue.
- **Portée initiale répartie dans les cases ci-dessus** : tester le protocole avec retards, erreurs,
  réordonnancement, files pleines et annulation, sans lancer `test:ui`.
  Compter démarrage, sérialisation, copies sandbox/iframe/worker, octets aller
  et retour, catalogue et intégration. Produire un build distribué testable.

Activation : démarrage réel validé par le mainteneur dans Figma et gain du
trajet complet à froid. Aucun seuil Node ou multiplicateur QuickJS/V8 ne
suffit. L'encodage binaire reste différé tant que copie/allocation ne domine
pas la trace. **Build Architect avec manifest et ressources du worker.**
