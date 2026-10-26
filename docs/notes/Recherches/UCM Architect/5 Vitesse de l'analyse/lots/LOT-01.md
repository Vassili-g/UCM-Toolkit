# Lot 1 : mesures du clic au rendu et progression

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **1.1 | gpt-6.1-sol | medium** : ouvrir la trace avant la résolution du sujet et la fermer sur chaque fin ; horloge injectée et test d'annulation.
- [x] **1.2 | gpt-6.1-sol | medium** : séparer dans la trace sujet, relevé, catalogue, moteur, règles, contrôles, corrections et projection ; vérifier les étapes imbriquées.
- [x] **1.3 | gpt-6-luna | low** : compter appels API, attentes, cessions, tranches synchrones et taille de sortie dans les ports instrumentés ; test avec horloge simulée.
- [x] **1.4 | gpt-6.1-sol | medium** : corréler clic, réception, premier affichage, premiers constats et final par identité de demande ; ignorer les acquittements tardifs.
- [ ] **1.5 | gpt-6.1-sol | medium** : transmettre phase, compte et progression monotone ; publier une phase nouvelle au même pourcentage et réserver 100 % au final.
- [ ] **1.6 | gpt-6-luna | low** : brancher les textes de progression prévus par la maquette, puis couvrir les phases par tests sans navigateur.
- [ ] **1.7 | gpt-6-luna | low** : créer les états de galerie avec compte, sans compte, annulé et périmé ; vérifier les écrans indiqués par la galerie.
- [ ] **1.8 | gpt-6.1-sol | medium** : relier les traces au banc de mesure Architect et documenter leur activation dans le README existant ; comparer mesure active et inactive.

Prérequis : 0. Nature : instrumentation et écran nouveau.
Chemins : `packages/plugin-socle/src/composant/contract/mesure.ts`,
`packages/plugin-architect/src/sandbox/analyse.ts`, `messages/analyse.ts`,
`ui/composant/analyse.ts`, `ui/analyse/`, `ui/textes/`, `ui/styles/`,
`galerie/etats/`, `scripts/mesurer.mjs`, et tests voisins.

## Portée et preuves conservées

- **Acquis localement, non commité** : ouvrir une mesure d'Architect avant la résolution
  du sujet, sans réinitialisation par les étapes du moteur. Séparer sujet,
  relevé, catalogue, moteur, règles, contrôles, corrections et projection.
  Compter propriétés/API, attentes, vraies cessions, tranches synchrones et
  taille des sorties. Instrumenter les cessions actuelles avant de les changer.
  Clore aussi les mesures annulées, arrêtées et périmées sans fuite de portée.
- **Acquis localement, non commité** : corréler clic, réception et rendu par identifiant
  de demande puis identité d'analyse. Les durées de chaque contexte utilisent
  sa propre horloge ; les acquittements permettent les mesures aller-retour.
  Distinguer premier affichage, premiers constats et résultat final. La mesure
  reste facultative et ne change aucun constat.
- **Acquis localement, non commité** : transmettre phase, compte et progression monotone.
  Publier tout changement de phase même au même pourcentage, puis toute fin.
  Réserver 100 % au résultat final ; omettre le temps restant sans estimation
  établie. Reprendre les annonces du moteur et les textes de la maquette :
  « Lecture des variants : n sur N », « Lecture de la library »,
  « Lecture des composants imbriqués », « Lecture de la structure »,
  « Vérification des règles », « Annuler ».
- **Acquis localement, non commité** : ajouter les états de galerie de la progression,
  sans attente, avec compte, après annulation et après péremption. Charger
  `rediger-diagnostics-ucm` avant toute écriture des catalogues. Soumettre les
  textes manquants à l'orchestrateur avant clôture du lot.

Les textes reprennent ceux de la maquette ; aucun texte manquant n'est proposé.

Preuves : `analyse.test.ts` compare les sorties avec et sans mesure, vérifie
le temps du sujet à horloge simulée, la conservation des étapes du moteur,
les fins annulée, arrêtée et périmée et la fermeture de la trace.
`identitesEtPage.test.ts` refuse une demande remplacée, une génération
ancienne et un progrès tardif ; les acquittements utilisent une horloge
locale injectée et ignorent un rendu remplacé. Le test de progression couvre
le compte, les phases à fraction égale, la monotonie et le final à 100 %.
`mesure.test.ts` sépare appel API, attente, cession et appel synchrone ; une
réponse tardive ne compte jamais dans la trace suivante. Les phases agrégées
d'Architect sont distinctes des étapes internes du moteur. Les états de
galerie couvrent la lecture avec compte, la library sans compte, la structure,
les règles, l'annulation et la péremption.

Bornes des mesures : les accès explicites aux champs du relevé et les ports
variables, nœuds et styles sont comptés, en plus des compteurs du moteur ;
ce n'est pas un décompte exhaustif de toute l'API Figma. Les attentes
imbriquées se cumulent et ne représentent pas le temps mural. Les tranches
synchrones mesurées sont les appels de contrôles, corrections et projection
du pilote. La taille de sortie est la longueur du JSON en unités UTF-16.
Deux frames donnent une occasion de peinture, sans mesure du compositeur.
Les cessions instrumentées sont celles du relevé et du moteur ; aucune pause
n'est ajoutée. `README.md` décrit l'activation facultative et `--traces`.
Contrôle ciblé : 81 tests passent, dont les lois d'écriture et la lecture des
variables. `npm run build:plugin -- architect` produit le plugin livrable.
La recette Figma et la relecture du rendu
Chromium restent à faire par le mainteneur ; aucun `test:ui` n'est lancé.

Sortie : phases et fins non retenues par le filtrage ; messages d'une ancienne
demande ignorés ; traces comparables avec mesure activée et désactivée.
Contrôle ciblé : tests Architect, mesure exporteur. **Build livrable :
`npm run build:plugin -- architect`.** Le mainteneur peut relever la référence
Figma dès ce point ; les lots suivants continuent sans attendre ses mesures.
