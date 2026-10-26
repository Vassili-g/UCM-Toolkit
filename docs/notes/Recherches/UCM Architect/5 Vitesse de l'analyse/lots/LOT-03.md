# Lot 3 : premiers constats et protocole de fin

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **3.1 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : définir un message provisoire distinct de partielle ; tester génération, double envoi et rejet d'un message tardif.
- [x] **3.2 | gpt-6.1-sol | high** | **Claude Sonnet | high** : ordonner contrôles du kit, lecture des ignorés, provisoire puis moteur ; vérifier l'ordre final et la même sortie sans provisoire.
- [x] **3.3 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : interdire côté sandbox corrections, réponses, Ignorer et préparation applicable tant que le résultat est provisoire ; test d'écriture forgée.
- [x] **3.4 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : appliquer le même verrou dans l'interface et conserver identifiants, défilement et sections ouvertes au passage au final.
- [x] **3.5 | gpt-6-luna | low** | **Claude Sonnet | low** : afficher la mention de la maquette et masquer les sections tenues pendant le provisoire ; état de galerie dédié.
- [x] **3.6 | gpt-6-luna | medium** | **Claude Sonnet | medium** : retirer le provisoire après Annuler ; tester le rejet de tout final tardif.
- [x] **3.7 | gpt-6-luna | medium** | **Claude Sonnet | medium** : retirer le provisoire après arrêt du moteur ; tester l'état arrêté et ses actions interdites.
- [x] **3.8 | gpt-6-luna | medium** | **Claude Sonnet | medium** : publier les sorties finales partielles après lecture incomplète terminée ; tester couverture et corrections.
- [x] **3.9 | gpt-6-luna | medium** | **Claude Sonnet | medium** : conserver les constats consultables après péremption ; refuser un final tardif de même identité.
- [x] **3.10 | gpt-6-luna | low** | **Claude Sonnet | low** : ajouter les états de galerie des quatre fins et lancer le build Architect pour la vérification du mainteneur.

Prérequis : 2. Nature : protocole et écran nouveau.
Chemins : `packages/plugin-architect/src/sandbox/analyse.ts`,
`sandbox/corrections.ts`, `sandbox/questions.ts`, `sandbox/ignores.ts`,
`messages/analyse.ts`, `ui/composant/analyse.ts`, `ui/analyse/`,
`ui/panneau/`, `ui/application.ts`, `galerie/etats/`, tests associés.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : séparer publication provisoire et rétention des
  corrections finales. Exécuter les contrôles du kit avant le moteur, lire les
  ignorés avant le premier envoi et conserver l'ordre final de référence.
  Le provisoire porte une marque de protocole distincte de `partielle`.
  Sandbox et interface refusent correction, réponse, Ignorer, propagation et
  préparation applicable tant que la finalisation manque.
- **Portée initiale répartie dans les cases ci-dessus** : garder les identifiants, le défilement et les
  sections ouvertes entre provisoire et final. Afficher la mention de la
  maquette : « L'analyse des composants imbriqués est en cours. D'autres points
  peuvent s'ajouter. » Ne montrer aucune section tenue avant la fin.
  Après Annuler, retirer le provisoire et afficher l'état annulé existant.
  Après arrêt du moteur, retirer le provisoire et afficher l'état arrêté.
  Après lecture incomplète terminée, publier les sorties finales `partielle`.
  Après péremption, garder les constats consultables sous l'état périmé ;
  aucun final tardif de même identité ne les rend applicables.
- **Portée initiale répartie dans les cases ci-dessus** : ajouter les états de galerie de chacune de ces
  fins et des tests de protocole sans navigateur. Les tests couvrent aussi
  nouvelle génération, double envoi et demande d'écriture forgée pendant calcul.

Sortie : chaque fin du provisoire a son test ; seule une finalisation valide
retient les corrections. Contrôle : Architect. **Build Architect.** Le rendu
dans Chromium reste vérifié par le mainteneur ; aucun agent ne lance `test:ui`.
