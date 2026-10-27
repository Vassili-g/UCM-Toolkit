# Lot 8 : couverture des dépendances et Actualiser

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **8.1 | gpt-6.1-sol | high** | **Claude Opus | high** : établir la matrice de couverture des événements pour nœuds, héritage et pages ; tests de portée inconnue. Résultat : `plugin-socle/src/composant/analyse/couverture.ts`, test `plugin-socle/tests/couverture.test.ts`, section « Matrice de couverture (8.1) ».
- [x] **8.2 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : établir les relectures obligatoires de variables, collections, styles, maîtres, règles et libraries ; test de ressource externe modifiée. Résultat : `relecturesObligatoires` dans `couverture.ts`, section « Relectures obligatoires (8.2) ».
- [x] **8.3 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : vérifier la documentation Figma puis brancher seulement les événements dont la couverture est établie, dont stylechange si pertinent. Confier d'abord la lecture de la documentation Figma à un `chercheur`. Résultat : `stylechange` branché dans `code.ts` et `surChangementDeStyle` (`sandbox/analyse.ts`), `porteeDesChangementsDeStyle` dans `couverture.ts`, section « Événements branchés (8.3) ». Aucun autre événement.
- [x] **8.4 | gpt-6.1-sol | high** | **Claude Sonnet | high** : accumuler les changements après la première péremption et hors analyse active ; tests d'événement retardé et de série de mutations. Résultat : `plugin-socle/src/composant/analyse/journal.ts`, `surChangementDuDocument` et `surChangementDeStyle` de `sandbox/analyse.ts`, section « Journal des changements (8.4) ».
- [x] **8.5 | gpt-6-luna | medium** | **Claude Sonnet | medium** : conserver anciens parents et topologie des suppressions ; élargir l'invalidation si parent ou événement manque. Résultat : `AnciensParents` dans `porteeDuChangement` (`couverture.ts`), table d'anciens parents d'`analyse.ts`, section « Anciens parents (8.5) ».
- [x] **8.6 | gpt-6-luna | medium** | **Claude Sonnet | medium** : interrompre la couverture quand la page est quittée ou la file déborde ; test de retour sur page. Résultat : `signaler` et `couvertureDepuis` (`journal.ts`), `surInterruptionDePage` et `couvertureInterrompue` (`sandbox/analyse.ts`), section « Interruption de couverture (8.6) ».
- [x] **8.7 | gpt-6-luna | medium** | **Claude Sonnet | medium** : porter Analyser et Actualiser jusqu'au sandbox ; test qu'Actualiser contourne les résultats précédents. Résultat : `intention` de `DemandeDAnalyse`, `reutilisationPermise` (`sandbox/analyse.ts`), envoi par `barre.ts` et `application.ts`, section « Analyser et Actualiser (8.7) ».
- [x] **8.8 | gpt-6.1-sol | high** | **Claude Sonnet | high** : invalider après changement de configuration et écriture, distinguer imports et changements externes ; tests Ctrl+Z et refus. Résultat : `signalerUneEcriture` et `ecritureDepuis` (`journal.ts`), `perimerApresUneEcriture(contexte, origine)` et `ecritureDepuisLAnalyse` (`sandbox/analyse.ts`), `ranger-library` et `ranger-niveau` (`sandbox/configuration.ts`), section « Écritures, configuration et imports (8.8) ».
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
| `style` | `stylechange` | style local, sans page demandée ; un style distant, refusé ou d'origine inconnue se relit |
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

## Relectures obligatoires (8.2)

`relecturesObligatoires(ressources, pages)` lit les `Ressources` d'une acquisition et rend ce qu'une nouvelle demande doit relire avant toute réutilisation :

- toutes les variables, collections et styles, les variables de chaque collection de library et chaque inventaire demandé ;
- les maîtres distants, refusés, d'origine inconnue ou dont la page n'est pas écoutée.

Les autres maîtres, locaux et sur une page écoutée, sont rendus dans `maitresSuivis`. L'appelant les passe dans `SuivisDuSujet.maitres` : un changement sous l'un d'eux touche alors le sujet. Les règles de page suivent leur page, et leur maître suit la règle des maîtres.

Preuves, dans `couverture.test.ts` : une variable distante, un style, une library et un maître distant figurent dans les relectures alors qu'aucun événement n'a touché le sujet ; un maître local sur une page qui n'est plus écoutée repasse en relecture.

## Événements branchés (8.3)

Faits vérifiés sur developers.figma.com :

- `figma.on('stylechange')` fonctionne sans `loadAllPagesAsync` ; la page [migrating-to-dynamic-loading](https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading/) le recommande.
- `StyleChangeEvent { styleChanges }` ([StyleChangeEvent](https://developers.figma.com/docs/plugins/api/figma/#stylechangeevent)). Les types sont `STYLE_CREATE`, `STYLE_DELETE` (`style` vaut `null`) et `STYLE_PROPERTY_CHANGE { properties }` ([StyleChange](https://developers.figma.com/docs/plugins/api/StyleChange)). `StyleChangeProperty` compte 21 propriétés (`name`, `type`, `paint`, `effects`, `fontSize`, `lineHeight`…), aucune pour une variable liée au style.
- `BaseDocumentChange.id` donne l'identifiant du style ([DocumentChange](https://developers.figma.com/docs/plugins/api/DocumentChange)).
- Rien ne dit qu'un style distant (library) émet l'événement.
- `documentchange` exige `loadAllPagesAsync` : interdit ici. Aucun événement de variable ni de collection n'existe. `NodeChangeProperty` ne nomme pas `boundVariables`.
- `documentchange` n'est pas appelé quand un sous-calque d'instance change par son maître, ni quand un nœud change par son style : une valeur héritée passe par le maître, un nœud stylé par son style.
- Les rappels `.on` sont asynchrones et groupés.

Branché :

- `code.ts` s'abonne à `stylechange` et passe `styleChanges` à `surChangementDeStyle`.
- `porteeDesChangementsDeStyle(changements, stylesSuivis)` : un `STYLE_PROPERTY_CHANGE` ou un `STYLE_DELETE` d'un style suivi touche le sujet. Un `STYLE_CREATE` est de portée inconnue, car un style créé peut changer une recherche par nom que rien ne suit. Un type inconnu l'est aussi. `stylesSuivis` vaut `null` quand l'appelant ne sait pas quels styles il a lus : tout changement l'est alors.
- `relecturesObligatoires` sépare `styles` (distants, refusés, d'origine inconnue : à relire) et `stylesSuivis` (locaux acquis). Une acquisition réelle marque aujourd'hui l'origine d'un style `inconnue` : ses styles restent donc en relecture.
- Architect ne sait pas quels styles ses lecteurs ont lus : le relevé, le moteur et les effets les chargent chacun, sans les exposer. Il passe `null` : tout changement de style d'un type connu périme l'analyse courante, cause `document`. Un changement reçu avant l'inventaire est gardé avec les nœuds (`changementsDeStyleRecus`) et rejoué à l'inventaire.

Reste en relecture : variables, collections, liaisons de variables, inventaires, libraries, styles distants. Un style lié à une variable qui change n'émet rien.

Preuves : `couverture.test.ts` (style suivi modifié ou supprimé, création, type futur, styles inconnus, style distant en relecture) et `peremptionDeLAnalyse.test.ts` (péremption, changement gardé avant l'inventaire puis rejoué, aucune analyse courante). Le cas « un style non lu ne périme pas l'analyse » n'est pas prouvé : il suppose de connaître les styles lus, ce qu'Architect ne peut pas encore.

Essais Figma utiles à la recette :

- lier ou délier une variable sur un calque du jeu : voir si `nodechange` s'émet et ce qu'il nomme ;
- modifier le maître d'une instance du jeu depuis une autre page : l'analyse doit se périmer ou se relire ;
- modifier un style de library publié : vérifier qu'aucun `stylechange` n'arrive dans le fichier consommateur ;
- modifier un style local de texte et un style d'effet utilisés par le jeu : l'analyse se périme.

## Journal des changements (8.4)

`creerLeJournal({ borne })` (`journal.ts`) tient la liste ordonnée des changements reçus, nœuds et styles. Une entrée garde `nature`, `type`, `id`, `properties`, `revision` et `parent`, l'identifiant du parent lu à la réception (`null` pour un style, un nœud supprimé ou un parent illisible). Aucun objet Figma n'y entre.

- `marquer()` rend le curseur courant et `depuis(curseur)` les entrées postérieures : le lot 9 lit par là.
- `oublierAvant(curseur)` retire les entrées que plus aucun curseur ne lit. Architect ne l'appelle pas encore : le lot 9 dit quel curseur il retient.
- Au-delà de la borne (5000 côté Architect), les changements suivants ne sont plus gardés et `debordeDepuis(curseur)` le dit. Le lot 8.6 en tirera l'interruption de la couverture.

Branchement dans `sandbox/analyse.ts` :

- Le journal s'ouvre à la première demande d'analyse. Il inscrit tout changement reçu ensuite, sans analyse courante, après la péremption ou entre deux analyses. `reinitialiserLAnalyse` le ferme, pour les tests.
- L'analyse courante retient `curseur`, pris quand l'écoute de la demande s'ouvre (`curseurDeLAnalyse`).
- La péremption passe par `porteeDesChangements(changements, { noeuds, maitres: ∅ })` : un identifiant de l'inventaire, un calque créé ou déplacé sous l'un d'eux, ou une portée inconnue périme. Cela corrige le manque connu de 8.1 : un calque créé sous un variant a un identifiant hors inventaire.
- Avant l'inventaire, les changements restent en mémoire (`changementsEnAttente`, avec leurs nœuds) et se rejouent à l'inventaire. Le journal seul ne suffirait pas : il garde le parent direct, pas la chaîne d'ancêtres que la décision lit.
- `code.ts` passe les `nodeChanges` entiers (type, id, nœud, propriétés). Les tests qui passent un identifiant seul le font lire comme un changement de propriété d'un nœud sans parent.

Preuves : `journal.test.ts` (ordre, curseurs, entrée sans objet Figma, parent illisible, débordement, oubli) et `peremptionDeLAnalyse.test.ts` (calque sous un variant, portée inconnue, événement retardé, série de mutations après la péremption, journal qui survit à l'analyse suivante).

## Anciens parents (8.5)

Une suppression ne donne plus son parent, et un déplacement hors du jeu ne donne que le nouveau. `porteeDuChangement(changement, suivis, anciens?)` reçoit un résolveur `AnciensParents { parentDe(id), deborde }` : `parentDe` rend le parent connu, `null` pour un nœud apparu depuis le curseur sans parent lisible, `undefined` pour un nœud jamais vu.

- `DELETE` : en remontant les anciens parents, un ancêtre suivi touche le sujet ; un nœud (ou un ancêtre) apparu sans parent connu est de portée inconnue (`ancien-parent-inconnu`) ; sinon hors sujet, ou inconnue si un maître est suivi comme avant.
- Déplacement (`PROPERTY_CHANGE` avec `parent`) hors du sujet : même remontée depuis l'ancien parent.
- Journal débordé depuis le curseur de l'analyse : toute portée hors identifiant suivi est inconnue (`journal-deborde`).

Architect : la table couvre l'inventaire (variants → jeu, lus avec la topologie, `SujetAAnalyser.parents`) puis les parents que le journal a vus depuis le curseur de l'analyse, le dernier lisible l'emportant. La décision précède l'inscription du lot au journal, pour lire les parents d'avant. Le rejeu des changements d'avant l'inventaire n'a que la topologie. Chaque demande d'analyse appelle `oublierAvant(curseur de l'analyse précédente)` : le journal garde ce que les deux dernières analyses lisent.

Limite : les descendants de l'inventaire n'ont que leur identifiant, sans parent lu. Leur suppression périme par l'identifiant ; un calque apparu après l'analyse se situe par le journal.

Preuves : `couverture.test.ts` (suppression, déplacement, ailleurs, ancien parent inconnu avec maître suivi, débordement) et `peremptionDeLAnalyse.test.ts` (mêmes cas dans Architect, débordement à 5000, oubli).

## Interruption de couverture (8.6)

Une page qui n'est plus écoutée n'envoie rien, et son retour ne rend pas ce qui a été manqué. `creerLeSuivi` reçoit un rappel `surInterruption(page, raison)`, appelé à chaque `page.off` (`page-quittee`) et à chaque `page.on` qui lève (`page-non-ecoutee`). `code.ts` le branche sur `surInterruptionDePage`, qui inscrit une entrée `interruption` au journal.

- `couvertureDepuis(curseur, pages)` rend `continue`, ou `interrompue` avec ses raisons : interruption d'une de ces pages après le curseur, ou `journal-deborde` (une perte à la borne, ou une interruption perdue, interrompt tout curseur antérieur).
- L'analyse courante retient ses pages (celle du sujet, la page courante à l'ouverture). `couvertureInterrompue(identite)` lit le journal depuis son curseur ; `analyseARelire` l'inclut. L'analyse se périme (cause `document`) quand une de ses pages cesse d'être écoutée.
- Aucune mémoire de résultat : le lot 9 lira `couvertureDepuis` avec le curseur et les pages qu'il retient.

Limite : un `page.on` qui lève est signalé à chaque tentative, donc une page jamais chargée ajoute une interruption par demande d'analyse.

Preuves : `journal.test.ts` (pages voulues, débordement) et `peremptionDeLAnalyse.test.ts` (retour sur la page A après une analyse sur B, page restée écoutée, débordement).

## Analyser et Actualiser (8.7)

Le message `analyser` porte `intention: 'analyser' | 'actualiser'` ; absente, elle vaut `analyser`. Le bouton du mode Composant est le même sous les deux noms : `barre.ts` envoie `actualiser` quand une analyse existe et ne calcule plus (périmée comprise), `analyser` sinon. `app.analyser(intention)` la range dans le message.

Le sandbox lit l'intention par `intentionDe` et décide par `reutilisationPermise(demande)`, le point que le lot 9 lira. Aujourd'hui, la seule mémoire entre demandes est la lecture des libraries anticipée à la sélection : une demande `actualiser` l'abandonne (`abandonnerLesLibrariesAnticipees`) avant tout et relit. Les inventaires de la demande, les mémoires de `ressources.ts` et les autres résultats meurent déjà avec la demande. Aucune mémoire n'est créée.

Limite : une sélection suivante relance l'anticipation, que la prochaine demande `analyser` reprend.

Preuves : `lectureAnticipeeDesLibraries.test.ts` (Analyser reprend la lecture finie ou en cours, Actualiser relit sans compteur de reprise ; défaut `analyser`) et `intentionDAnalyseDeLInterface.test.ts` (le bouton envoie `analyser`, puis `actualiser` après une analyse ou une péremption). Altération : sans l'abandon, le premier test échoue.

## Écritures, configuration et imports (8.8)

Le journal reçoit une entrée `ecriture` (origine `ecriture` ou `configuration`), sans identifiant de nœud : sa portée est le sujet entier. `perimerApresUneEcriture` l'inscrit avant de périmer, même sans analyse courante, et `ecritureDepuisLAnalyse` / `analyseARelire` disent qu'une écriture suit le curseur de l'analyse. Un journal débordé suppose une écriture. L'événement Figma de l'écriture, en retard ou absent, n'y change rien. La cause du message `perime` reste `ecriture`.

- Configuration : `ranger-library` périme seulement si l'écriture a réussi et que la library diffère de la rangée ; `ranger-niveau` seulement si `setAsync` a réussi et que le niveau diffère. Valeur identique, refus d'écriture ou stockage qui lève ne changent rien. Avant 8.8, aucun des deux ne périmait.
- Ctrl+Z : il arrive comme un changement ordinaire. Après une correction, l'écriture périme ; une analyse faite ensuite a un curseur postérieur à l'écriture, et l'annulation qui suit s'inscrit et la périme.
- Imports : l'analyse n'importe que des variables (`importVariableByKeyAsync`), et Figma n'émet ni `nodechange` ni `stylechange` pour elles. Il n'y a rien à exempter ; `enregistrerLesImports` ne sert qu'à la capture. L'analyse n'importe aucun style. Un `STYLE_CREATE` reste donc un changement externe qui périme (8.3). Un changement externe d'un nœud du sujet pendant l'analyse la périme, comme avant.

Limite : l'inscription ne distingue pas une écriture sans effet (une correction dont toutes les lignes sont sautées n'appelle pas `perimerApresUneEcriture`, `ecrit` étant faux).

Preuves : `peremptionDeLAnalyse.test.ts` (entrée `ecriture` postérieure au curseur, sans analyse, Ctrl+Z, import et changement externe), `configuration.test.ts` (effective, identique, refus), `journal.test.ts` du socle. Altérations : sans le test d'égalité de la library ou sans l'inscription au journal, les tests échouent.
