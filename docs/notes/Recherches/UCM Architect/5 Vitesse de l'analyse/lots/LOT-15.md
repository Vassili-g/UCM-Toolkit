# Lot 15 : clôture locale et recette du mainteneur

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] **15.1 | gpt-6-luna | low** : exécuter agents:diff et dresser les autorités et chemins à relire ; signaler les liens vers le plan supprimé.
- [ ] **15.2 | gpt-6.1-sol | medium** : mettre à jour la spec Architect pour les comportements modifiés ; relire ses liens et exemples.
- [ ] **15.3 | gpt-6-luna | low** : mettre à jour les invariants et cartes des modules ajoutés selon leur domicile ; vérifier chaque chemin.
- [ ] **15.4 | gpt-6.1-sol | high** : auditer acquisition et couverture des événements ; consigner les écarts avec leur test manquant.
- [ ] **15.5 | gpt-6.1-sol | high** : auditer pureté, promotion, clés, ordre et limites ; consigner les écarts avec leur test manquant.
- [ ] **15.6 | gpt-6.1-sol | medium** : retirer l'ancien chemin de production après parité en gardant voie complète et comparateurs du banc.
- [ ] **15.7 | gpt-6-luna | low** : vérifier que la trace inclut suivi, rétention, copies et rendu ; créer une case distincte pour chaque compteur manquant.
- [ ] **15.8 | gpt-6-luna | low** : lancer une seule vérification complète sur arbre stable et consigner ses résultats ; créer une case distincte pour chaque défaillance à corriger.
- [ ] **15.9 | gpt-6-luna | low** : préparer les builds comparables et commandes de collecte dans le banc.
- [ ] **15.10 | gpt-6-luna | low** : remettre au mainteneur la liste des écrans à vérifier : progression, provisoire, fins, périmé, corrections, questions et Actualiser.
- [ ] **15.11 | gpt-6-luna | low** : vérifier les versions finales, changelogs et pins des paquets modifiés, puis préparer le push unique et les commandes de publication.

Prérequis : 11 et branches retenues. Nature : vérification et documentation.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : lancer `npm run agents:diff`, rendre la liste des
  autorités concernées et signaler les références au plan supprimé sans modifier
  la revue du mainteneur. Vérifier cartes et registre des modules ajoutés.
  Mettre à jour les documents existants qui décrivent désormais un comportement
  faux, selon leur domicile. Les nouvelles règles d'Architect vont dans sa spec
  et son invariant ; la forme publiée reste dans `FORMAT.md`.
- **Portée initiale répartie dans les cases ci-dessus** : relire acquisition, pureté, promotion, couverture
  des événements, clés de mémoire, ordre et limites. Retirer l'ancien chemin de
  production seulement après parité ; garder une voie complète sans réutilisation
  et les comparateurs du banc. Vérifier que la trace inclut suivi et rétention.
- **Portée initiale répartie dans les cases ci-dessus** : sur l'arbre stable, exécuter une seule fois
  `npm test`, `npm run typecheck`, `npm run build`, puis les contrôles demandés
  par `agents:diff` et non déjà couverts. `npm run vues` seulement si ses
  sources ont changé. Aucun `test:ui` sans demande explicite. Rejouer après
  correction uniquement les contrôles invalidés puis la frontière nécessaire.
- **Portée initiale répartie dans les cases ci-dessus** : préparer les builds Architect comparables et les
  commandes de collecte dans le banc existant, sans nouveau Markdown. Donner
  au mainteneur les écrans à vérifier : progression, provisoire, fins, périmé,
  corrections, questions et Actualiser. L'orchestrateur commite seulement les
  chemins relus de chaque tâche ; les changements initiaux restent préservés.

## Recette Figma, à effectuer par le mainteneur

Ces cases ne sont pas des prérequis aux preuves locales. Leur absence signifie
« performance runtime non validée ». Ne pas les cocher depuis les doubles.
Chaque case de recette est cochée dans un commit qui consigne son résultat ici ;
les traces brutes restent dans le banc existant. Le mainteneur réalise les
gestes Figma ; l'agent analyse ensuite les traces fournies.

- [ ] **R1 | mainteneur | sans modèle** : relever la référence sur le Button avec dix essais exploratoires à froid ; conserver build, poste, version de Figma, fichier, library, ordre des essais et état réseau.
- [ ] **R2 | mainteneur | sans modèle** : relever chaque candidat dans les mêmes conditions, en alternant les builds et en rouvrant le plugin pour chaque essai à froid.
- [ ] **R3 | mainteneur | sans modèle** : refaire au moins 30 essais du candidat retenu pour médiane et 95e percentile ; augmenter la série si les extrêmes restent instables et rapporter séparément les réouvertures complètes de Figma.
- [ ] **R4 | mainteneur | sans modèle** : mesurer ouverture plus analyse, clic au premier affichage, premiers constats et final ; relever le plus long bloc synchrone et la réponse à Annuler.
- [ ] **R5 | mainteneur | sans modèle** : relever attentes API indivisibles, lectures, calculs, copies et mémoire sur les mêmes essais ; comparer aux cibles proposées de 2 s en médiane, 4 s au 95e percentile et 250 ms de réactivité.
- [ ] **R6 | mainteneur | sans modèle** : comparer référence, réutilisation et Actualiser après un deuxième clic identique, une peinture locale et un changement de texte ou de nom.
- [ ] **R7 | mainteneur | sans modèle** : comparer les trois chemins après variable ou alias partagé, règle hors jeu, premier candidat ajouté, variant ou mode près d'une borne.
- [ ] **R8 | mainteneur | sans modèle** : comparer les trois chemins après AA/AAA, changement de library, correction puis Ctrl+Z, retour sur page et ressource redevenue lisible.
- [ ] **R9 | mainteneur | sans modèle** : éprouver éviction et perte de worker, puis une longue série sur un sujet et une alternance dépassant la rétention ; relever suivi entre clics et temps cumulé.
- [ ] **R10 | gpt-6.1-sol | medium** : analyser les traces R1 à R5, séparer acquisition et calcul, puis proposer budgets et bornes de rétention avec leur dispersion.
- [ ] **R11 | gpt-6.1-sol | medium** : analyser R6 à R9 par scénario, comparer aux cibles proposées de 250 ms sans changement et 500 ms après modification locale sur le Button, relectures comprises.
- [ ] **R12 | gpt-6.1-sol | high** : décider l'activation de chaque branche sur son gain net mesuré et la parité ; garder la branche désactivée sans preuve de gain. Ne pas additionner les économies de passes recouvrantes.

La clôture locale demande la parité et les contrôles du lot 15. La validation
de performance demande en plus cette recette avec tous les mécanismes retenus
activés. Une branche sans gain reste désactivée ; une dépendance sans preuve
de fraîcheur reste relue.

Après le dernier commit du plan, y compris les cases de recette réalisées,
pousser l'ensemble des commits en une fois. Publier ensuite les seules
versions finales des paquets modifiés, kit d'abord, puis CLI et adaptateur si
leurs versions ont changé. Attendre chaque workflow et constater chaque
version par `npm view`, selon `publier-paquets`.
