# Lot 15 : clôture locale et recette du mainteneur

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] **15.1 | gpt-6-luna | low** | **Claude Haiku | low** : exécuter agents:diff et dresser les autorités et chemins à relire ; signaler les liens vers le plan supprimé.
- [ ] **15.2 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : mettre à jour la spec Architect pour les comportements modifiés ; relire ses liens et exemples.
- [ ] **15.3 | gpt-6-luna | low** | **Claude Sonnet | low** : mettre à jour les invariants et cartes des modules ajoutés selon leur domicile ; vérifier chaque chemin.
- [x] **15.4 | gpt-6.1-sol | high** | **Claude Opus | high** : auditer acquisition et couverture des événements ; consigner les écarts avec leur test manquant. Résultat : huit écarts relevés par l'audit, dont trois doutes ; chacun a un test qui échoue sans sa correction, ou qui tranche le doute.
  - Péremption pendant une prélecture (écart 1). `ranger-library` et `ranger-niveau` périmaient l'analyse sans lever le jeton : un clic prenait la prélecture et affichait comme applicable un résultat calculé avec l'ancien réglage. `perimer` lève maintenant le jeton d'une prélecture dont l'analyse se périme en silence. `perimerApresUneEcriture` lève celui de toute prélecture, même avant qu'elle ouvre son analyse. Tests : deux cas de `paritesDeSession.test.ts`, prélecture arrêtée au sujet puis au catalogue, `ranger-niveau`, clic : analyse applicable, affichage égal à Actualiser. Altérations : sans la levée de `perimer`, 1 échec (« un événement qui annule la prélecture ») ; sans celle de `perimerApresUneEcriture`, 1 échec (arrêt au sujet) ; sans les deux, 2.
  - Nom de variable lu par le moteur (écart 2). `VariableNameResolver` lit le nom et la collection des variables de library hors du relevé, et les dépendances n'en gardaient que l'identifiant. `variablesDesDependances` ajoute aux dépendances `variablesLiees` : la variable et la collection de chaque alias des liaisons des maîtres locaux, des calques d'instances distantes et des styles, hors des variables locales, par `inventaires.ressources`. Ces lectures attendent la fin des imports ; le moteur lancé avec le catalogue ne les attend pas. `tests/outils/accesDuMoteur.ts` enregistre aussi les appels `getVariableByIdAsync`, `getVariableCollectionByIdAsync` et `getStyleByIdAsync` du moteur, et exige que le relevé ou les dépendances refassent chacun. Capture du Button : 14 appels hors couverture avant, 0 après. Monde fabriqué de `accesDuMoteur.test.ts` : une enveloppe de tailles dont un variant lie une variable de library ; sa lecture est couverte, et son renommage puis celui de sa collection, sans événement, rendent `nonReprise:different:dependances` avec un affichage égal à Actualiser. Altérations : `variablesDesDependances` sans effet, 2 échecs ; validation sur les dépendances sans leurs variables, 1. Coût sur la capture : `getVariableByIdAsync` passe de 614 à 617 appels au premier Analyser et de 600 à 617 au second ; 113 variables relues, dont les 14 du moteur.
  - Styles hors du jeu (doute 3). Aucun écart. Sur la capture, le moteur fait un seul `getStyleByIdAsync`, que les dépendances refont. Sur le monde fabriqué, le moteur ne lit ni le style de texte ni le style d'effet posés dans un maître.
  - Lecture anticipée des libraries encore en cours (doute 4). Confirmé : Analyser et Actualiser la reprenaient sans vérification, et une collection ajoutée pendant sa lecture leur échappait. `lireLesLibrariesAuClic` l'attend, puis la vérifie comme une lecture finie. Test : `lectureAnticipeeDesLibraries.test.ts`, liste changée pendant la lecture anticipée, catalogue sur la liste fraîche pour Analyser et Actualiser ; deux tests existants passent d'un inventaire à deux. Altération : l'ancienne reprise, 3 échecs. Coût : un inventaire des libraries de plus quand le clic tombe pendant la lecture anticipée.
  - Refus de variable en vol (doute 5). Confirmé : un refus rendu après `attendreLesImports` par une lecture partie avant restait rangé, et le moteur le recevait après les imports. `MemoireDeRessources` relit ce refus après les imports, comme un refus rangé avant l'appel. Test : `socle/tests/ressources.test.ts`. Altération : 1 échec.
  - Place rendue avant la fin de la prélecture (écart 6). Une demande lancée après `liberer` courait avec la prélecture, dont le `finally` vidait la garde des événements de la demande suivante. `prendreLaPlaceDUneEcriture` devient asynchrone : elle lève le jeton, attend la fin effective de la prélecture, puis prend la place ; ses six appelants l'attendent. Test : `paritesDeSession.test.ts`, écriture pendant la prélecture puis clic : la prélecture a fini avant la lecture du sujet du clic, le changement reçu pendant cette lecture périme l'analyse, l'analyse suivante égale Actualiser. Altération : l'ancienne libération, 2 échecs.
  - Prélecture sur un écran d'analyse périmée (écart 7). Aucune correction de code : `src/ui/application.ts` n'envoie aucun geste sur une analyse périmée (`analyseApplicable`, et la garde de `selectionner`), et remplacer l'analyse courante ne retire donc rien au designer. Test garde : `verrouDuProvisoire.test.ts`, aucune demande après `perime`. Altération : `selectionner` sans sa garde, 1 échec.
  - Annulation pendant le catalogue (écart 8). `chargerLesValeurs` lit `OptionsDeCatalogue.annulee` : après le jeton levé, aucune lecture par identifiant, aucun import ni aucune lecture de modes ne part. Sortie inchangée sans annulation. Test : `analyse.test.ts`, annulation pendant le chargement de 40 valeurs. Altération : sans `annulee`, 1 échec.
  - Rejeu de la capture du 27/10 à 12:35 (Analyser, Analyser, Actualiser, Analyser) : messages complets identiques avant et après (hachage `3adb2557a6211352`, génération normalisée, trace retirée), second et quatrième Analyser en `repriseDuReleve` et `repriseDuMoteur`. Reste hors couverture : la lecture de `id` sur deux sections ancêtres du jeu (`1140:1423`, `4:1205`), présente avant ces changements.
- [x] **15.5 | gpt-6.1-sol | high** | **Claude Opus | high** : auditer pureté, promotion, clés, ordre et limites ; consigner les écarts avec leur test manquant. Résultat : deux écarts corrigés, deux laissés tels quels.
  - Liaisons et modèles d'une prélecture annulée (écart 11). Une prélecture annulée remplaçait `retenirLesLiaisons` et `retenirLesModeles`, que la Configuration et l'écriture des règles lisent. Une prélecture discrète ne les pose plus qu'à sa promotion ou à sa prise par un clic. Tests : `paritesDeSession.test.ts`, prélecture annulée puis promue, et liaisons posées à la prise pendant le moteur. Altérations : retenue immédiate, 1 échec ; sans la pose à la promotion, 1 ; sans la pose à la prise, 1.
  - Maître lu hors de la mesure (écart 12). `prelireLeReleve` lit les maîtres par l'appel mesuré du moteur (`attendrePourLaMesure`, méthode `getMainComponentAsync`). Test : `accesDuMoteur.test.ts`, second Analyser repris : `api:getMainComponentAsync:appels` > 0. Altération : 1 échec.
  - Écarts 9 et 10 : laissés tels quels, comme l'audit le propose.
- [ ] **15.6 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : retirer l'ancien chemin de production après parité en gardant voie complète et comparateurs du banc.
- [ ] **15.7 | gpt-6-luna | low** | **Claude Haiku | low** : vérifier que la trace inclut suivi, rétention, copies et rendu ; créer une case distincte pour chaque compteur manquant.
- [ ] **15.8 | gpt-6-luna | low** | **Claude Haiku | low** : lancer une seule vérification complète sur arbre stable et consigner ses résultats ; créer une case distincte pour chaque défaillance à corriger. Le `verificateur` lance les commandes ; la conversation principale écrit les cases de défaillance.
- [ ] **15.9 | gpt-6-luna | low** | **Claude Haiku | low** : préparer les builds comparables et commandes de collecte dans le banc.
- [ ] **15.10 | gpt-6-luna | low** | **Claude Haiku | low** : remettre au mainteneur la liste des écrans à vérifier : progression, provisoire, fins, périmé, corrections, questions et Actualiser.
- [ ] **15.11 | gpt-6-luna | low** | **Claude Haiku | low** : vérifier les versions finales, changelogs et pins des paquets modifiés, puis préparer le push unique et les commandes de publication. Le push et la publication restent à la conversation principale.

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
- [ ] **R9b | mainteneur | sans modèle** : sur un texte dont des plages voisines portent des dégradés ou des images différents, puis identiques, comparer le relevé et les constats du build 6.7 (`6c3bd129`) à ceux du build 6.8 (`b7b5b3dc`). La case 6.8 suppose que Figma ne sépare jamais deux plages voisines dont les valeurs exposées sont égales ; un écart réfute cette fusion et rend sa seconde lecture au relevé.
- [ ] **R10 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : analyser les traces R1 à R5, séparer acquisition et calcul, puis proposer budgets et bornes de rétention avec leur dispersion.
- [ ] **R11 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : analyser R6 à R9 par scénario, comparer aux cibles proposées de 250 ms sans changement et 500 ms après modification locale sur le Button, relectures comprises.
- [ ] **R12 | gpt-6.1-sol | high** | **Claude Opus | high** : décider l'activation de chaque branche sur son gain net mesuré et la parité ; garder la branche désactivée sans preuve de gain. Ne pas additionner les économies de passes recouvrantes. Décision prise par la conversation principale.

La clôture locale demande la parité et les contrôles du lot 15. La validation
de performance demande en plus cette recette avec tous les mécanismes retenus
activés. Une branche sans gain reste désactivée ; une dépendance sans preuve
de fraîcheur reste relue.

Après le dernier commit du plan, y compris les cases de recette réalisées,
pousser l'ensemble des commits en une fois. Publier ensuite les seules
versions finales des paquets modifiés, kit d'abord, puis CLI et adaptateur si
leurs versions ont changé. Attendre chaque workflow et constater chaque
version par `npm view`, selon `publier-paquets`.
