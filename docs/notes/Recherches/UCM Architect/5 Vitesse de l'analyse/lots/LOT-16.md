# Lot 16 : chemin critique, reprise au clic et prélecture

[Sommaire des lots](./README.md).

État : validé par le mainteneur. Ordre retenu : 16.1, 16.2, puis la reprise (16.3 à 16.5) ; les cases conditionnelles attendent R16.1.

Ce lot vise la cible du mainteneur : 5 s du clic au rendu sur le Button (90 variants), mesuré à 14,2 s (build 9.9). Il couvre aussi le second clic sans changement (14,2 s, reprise refusée), Actualiser (16 s) et la sélection suivie d'une attente (18 s après 30 s). Les preuves sont dans les sections qui suivent les cases.

## Tâches à committer

Ordre : gain attendu sur le risque. Une case marquée « conditionnelle » attend le résultat de l'expérience qu'elle nomme. Les cases R16 sont des gestes du mainteneur dans Figma.

- [x] **16.1 | gpt-6-luna | low** | **Claude Haiku | low** : ajouter au build de mesure, par méthode d'API (`getVariableByIdAsync`, `importVariableByKeyAsync`, `getMainComponentAsync`, `getNodeByIdAsync`, `getStyleByIdAsync`, `teamLibrary.*`), le nombre d'appels, l'attente cumulée, l'attente maximale et le maximum en vol ; ajouter la durée réelle de chaque cession (moyenne, maximum) et l'histogramme des tranches synchrones (moins de 25, 25 à 50, plus de 50 ms) avec l'étape de la plus longue. Chemins : `plugin-socle/src/composant/contract/mesure.ts`, port mesuré de `lecture.ts`. Résultat : compteurs `api:<méthode>:appels|msAttente|msAttenteMax|enVolMax` (port de `lecture.ts`, `getNodeByIdAsync`, `getStyleByIdAsync`, `getMainComponentAsync`, `teamLibrary.*`), `msCessionMoyenne`, `msCessionMax`, `tranches<25|25a50|>50` et `etapePlusLongueTranche:<étape>` (valeur en ms) ; tests dans `plugin-exporter/tests/mesure.test.ts`.
- [x] **16.2 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : préparer un build d'expériences, jamais distribué, qui joue E1 à E6 (section « Expériences Figma ») sur le Button et écrit leurs résultats dans la console. E4 et E5 demandent des gestes du mainteneur ; aucune autre expérience n'écrit dans le fichier. Résultat : `sandbox/experiences.ts` et `ui/experiences.ts`, bannière `UCM_ARCHITECT_EXPERIENCES=true` sur les deux bundles ; `ucmExperience('E1'…'E6')`, `E4-fin`, `E5-fin` ; un objet JSON par expérience en console ; mode d'emploi dans la section « Build d'expériences » du README d'Architect ; tests dans `tests/experiences.test.ts`.
- [ ] **R16.1 | mainteneur | sans modèle** : lancer E1 à E6 avec le build 16.1, puis remettre leurs sorties et la trace d'un Actualiser sans changement.
- [x] **16.3 | gpt-6.1-sol | high** | **Claude Opus | high** : lever le refus `non-couvert:maitres-autres-instances`. `dependancesDeFigma` calcule la fermeture des maîtres atteints depuis le jeu (maîtres des instances imbriquées dans un maître local, récursivement, profondeur bornée) ; les maîtres locaux d'une page écoutée et leurs descendants vont dans `SuivisDuSujet.maitres` ; un maître distant suit 16.4. Preuve par enregistrement des accès : sur la capture et sur chaque cas de `paritesDeSession.test.ts`, chaque nœud que le moteur lit appartient à l'inventaire, à la fermeture suivie, à un maître distant relu ou à un nœud dont la lecture est comparée par `regles` ou `nomsDeLaPage`. Gain attendu au second clic sans changement : 6,5 à 9 s avec 16.4. Résultat : `dependancesDeFigma` ajoute à `DependancesDuMoteur.maitres` les maîtres des instances sous un maître local, sur `PROFONDEUR_DES_MAITRES` (8) niveaux, et compte `imbriqueesNonLues` ; la validation exige chaque maître de la fermeture couvert (`non-couvert:maitres`), compare les liaisons de ses nœuds jusqu'au résultat de E4, et refuse `non-couvert:maitres-autres-instances` seulement pour une fermeture incomplète. Sur le Button, ce refus disparaît et seul `non-couvert:maitres` reste (16.4) ; section « Fermeture des maîtres (16.3) ».
- [x] **16.4 | gpt-6.1-sol | high** | **Claude Opus | high** : lever le refus `non-couvert:maitres` d'un maître distant par la relecture et la comparaison exacte des champs que le moteur lit de ce maître (sur le Button : `id`, `name`, `remote`, `parent`, `componentPropertyDefinitions`). Le même enregistrement des accès que 16.3 fixe la liste des champs ; un champ lu hors liste refuse la reprise. Cas de parité : mise à jour de library acceptée, sans événement sur l'instance. E5 décide seulement du repli de détection. Résultat : `MaitreDeDependance.definition` relit d'un maître distant `CHAMPS_DU_MAITRE_DISTANT` (`name`, `remote`, `componentPropertyDefinitions`), son parent et son jeu ; `DependancesDuMoteur.calquesDesInstancesDistantes` relit chaque calque d'une instance de maître distant, dans le jeu et sous les maîtres locaux, par son parent et `CHAMPS_SOUS_UNE_INSTANCE` ; un maître distant ainsi relu couvre ses instances. Sur le Button, le second Analyser reprend le moteur ; section « Maîtres distants relus (16.4) ».
- [x] **16.5 | gpt-6.1-sol | high** | **Claude Sonnet | high** : sortir la vérification des libraries du chemin critique. Au clic, la vérification part en même temps que la validation et le relevé ; le résultat attend sa fin, sans l'attendre avant de commencer. Pendant une prélecture (16.16), relancer la lecture anticipée avant l'échéance que E6 mesure. Tests de `lectureAnticipeeDesLibraries.test.ts` adaptés. Résultat : aucun changement de source. Depuis 6.0, `analyser` lance `lecteurs.bibliotheques` (donc `lireLesLibrariesAuClic`, vérification comprise) au début de la phase `releve` et ne l'attend qu'au catalogue (`catalogueDeFigma`), qui lit la liste fraîche quand elle diffère. Elle n'était pas sur le chemin critique avant le relevé ; elle ne le devient qu'avec 16.15, quand la validation remplacera le relevé. Quatre tests ajoutés à `lectureAnticipeeDesLibraries.test.ts` : vérification lente sans retard du relevé et catalogue qui l'attend, liste changée, annulation pendant la vérification, trace (la phase `libraries` et `msVerificationDesLibraries` comptent la vérification, l'étape `catalogue-attente-libraries` reste courte). Altérations jouées : attendre `libraries` avant le relevé fait échouer 5 tests ; rendre la liste anticipée sans la vérifier en fait échouer 6. SPEC d'Architect complétée. Reste à 16.16 : relancer la lecture anticipée avant l'échéance de E6.
- [x] **16.6 | gpt-6.1-sol | high** | **Claude Sonnet | high** : créer une seule `MemoireDeRessources` par demande, passée par `InventairesDeLaDemande`, et la faire lire au relevé, aux dépendances et au moteur ; mémoriser `nomsDeLaPage` par page dans la demande. Compteurs avant et après sur la capture ; ordre des dépendances avant le moteur conservé. Gain attendu 0,3 à 0,6 s. Résultat : `creerInventairesDeLaDemande({ ressources })` crée la `MemoireDeRessources` de la demande (`analyser` lui donne les lectures du port mesuré, les champs `key`, `name`, `variableCollectionId` et `name`, `modes`, la coopération et la propagation de l'annulation) ; `InventairesDeLaDemande.ressources` la porte, et `nomsDeLaPage(page, lire)` mémorise les noms par page. Le relevé (`OptionsDuReleve.ressources`), `dependancesDeFigma` (`maitreDeLInstance`, `definitionDuStyle`, `decrireLeMaitre`) et le moteur (`maitreDe` et `styleDeLaPortee` par la portée, `VariableNameResolver` par `ResolverOptions.ressources`) la lisent ; sans elle, chacun garde sa mémoire. L'ordre relevé, catalogue, contrôles, dépendances, moteur ne change pas. Rejeu de la capture du 27/10 (appels natifs par méthode, avant puis après) : `getMainComponentAsync` 714 puis 318 (relevé 108, dépendances et début du moteur 210, suite du moteur 0 ; la trace compte 24 appels du moteur contre 312), `getVariableByIdAsync` 552 puis 364 (moteur 202 puis 14), `getVariableCollectionByIdAsync` 23 puis 17, `getStyleByIdAsync` 2 puis 1, soit 591 appels en moins ; `inventairesReutilises` 4 puis 5, `maitresReutilises` 576 puis 864. Lectures de propriétés 172 784 puis 171 280, 2 941 ms puis 2 772 ms estimés au banc (moteur 1 949 puis 1 853, dépendances 422 puis 348). Avec 188 lectures de variables à 0,3 à 0,9 ms, le gain estimé est de 0,23 à 0,34 s, sous la fourchette attendue ; la mesure dans Figma tranchera. Même sortie : 172 constats identiques (statut, constats, lecture, variants, provisoire), avec et sans mémoire partagée sur la capture ; même égalité sur les mondes fabriqués. Une mémoire ne survit pas à sa demande (`memoireDeRessourcesDeLaDemande.test.ts`) ; altérations jouées : moteur sans la mémoire, dépendances sans mémoire de noms, mémoire gardée entre demandes. Règle : un refus de variable ou de collection rangé avant le catalogue ne se transmet pas au moteur ; `oublierLesRefus`, appelé quand le catalogue est lu, l'efface et le moteur relit l'identifiant une fois (au plus une relecture par identifiant et par demande, puis mémorisée). Test : une variable de library refusée au relevé et rendue lisible par l'import est lue acquise par le moteur, sortie égale à l'ancien chemin ; sans l'appel, il échoue (1 lecture au lieu de 2). Refus de styles et de maîtres : transmis à toute la demande, l'import ne les change pas.
- [ ] **16.7 | gpt-6.1-sol | high** | **Claude Opus | high** : hors validation (première analyse, Actualiser, entrée absente ou non utilisable), ne plus lire `dependancesDeFigma` avant le moteur ; projeter les dépendances retenues depuis les faits que le moteur a lus dans la mémoire de 16.6. Sur le chemin de validation, garder la lecture fraîche avant le moteur. Test : les dépendances projetées égalent celles que `dependancesDeFigma` lit sur le même état, pour chaque cas de `paritesDeSession.test.ts`. Gain attendu 0,6 à 0,8 s par analyse sans reprise. Ordre : après 16.12 ; section « Lecture des dépendances et moteur (16.7) ».
- [ ] **16.8 | gpt-6.1-sol | high** | **Claude Sonnet | high** : conditionnelle à E2. Copier `valuesByMode`, `resolvedType` et `scopes` des variables que le relevé lit déjà par identifiant ; ne passer par `importVariableByKeyAsync` que pour une clé qu'aucune variable lue ne porte. Lire les cibles hors catalogue par lots bornés au lieu d'une boucle séquentielle. Parité du catalogue sur la capture et sur les cas « Catalogue » du contrat. Gain attendu 1,2 à 1,8 s.
- [x] **16.9 | gpt-6.1-sol | high** | **Claude Sonnet | high** : lancer `catalogue-valeurs` sans l'attendre, puis lire les dépendances et le moteur pendant ses appels ; les contrôles du kit commencent quand le catalogue est clos. Ordre des constats, phases annoncées et annulation inchangés. Gain attendu : l'attente restante du catalogue, au plus 2,3 s, à ne pas additionner avec 16.8 et 16.10. Résultat : `analyser` lance `lecteurs.catalogue` sans l'attendre, puis les dépendances (`dependancesEnCours`) et, une fois celles-ci lues, le moteur (`moteurEnCours`) ; les contrôles du kit commencent à la clôture du catalogue. Les dépendances précèdent le moteur (9.4) ; les lancer ensemble fait échouer `paritesDeSession.test.ts` (« un champ sans événement changé pendant le calcul du moteur »). Le moteur part avec le catalogue seulement si la demande ne peut pas valider d'entrée (Actualiser, sans lecteur de dépendances, ou `etatDeLEntree` ≠ `utilisable`) : sinon la validation (lot 9, 16.3, 16.4) peut le dispenser de tourner, et il part après elle comme avant ; les dépendances se lisent dans tous les cas pendant le catalogue. Lectures du moteur qui dépendent des imports : seulement `VariableNameResolver`, par `MemoireDeRessources.variable` et `.collection` (le grep du socle ne trouve aucun autre `getVariableByIdAsync`, `getVariableCollectionByIdAsync` ni `importVariableByKeyAsync` hors `ressources.ts`) ; ni les maîtres, ni les styles, ni les nœuds, ni la liste locale. Sur la capture du 27/10 : relevé 189 variables (183 importées par le catalogue, toutes déjà lues), moteur 14 lectures de variable, aucune lue par le relevé, aucune collection ; toutes lisibles sans import dans la capture, donc aucun refus à relire. Voie retenue, la plus simple qui reste exacte : `attendreLesImports(fin)` remplace `oublierLesRefus`, appelé au lancement du catalogue avec sa fin ; toute lecture de variable ou de collection qui n'a pas eu lieu attend `fin`, puis lit ; un refus rangé avant s'efface et suit la même règle ; une ressource acquise avant reste acquise. Une promesse par clé n'est pas exacte : un import peut aussi changer une variable lisible avant lui (risque de 16.8, E2). Conséquence : le moteur avance jusqu'à sa première lecture de variable (31,7 % de ses lectures, 45 % de son coût estimé au banc, 41 % de son temps sous Node) puis attend la clôture du catalogue. Phases : celles que le moteur annonce avant `imbriques` sont gardées et s'annoncent après elle, dans leur ordre ; le provisoire part quand les contrôles finissent, moteur fini ou non (il peut partir un peu plus tard que sur l'ancien ordre, les deux se partageant le fil). `finally` lève le jeton et attend ce qui reste en vol avant de rendre la place. Preuves : `tests/ordonnancementDuCatalogue.test.ts` (7 tests : dépendances puis moteur avancent pendant un catalogue lent et les contrôles attendent sa clôture, phases du moteur rejouées dans l'ordre, annulation pendant le catalogue et le moteur, erreur du moteur, entrée validable, Actualiser, variable de library lisible seulement après son import : lectures, états au moment de lire et messages égaux à l'ancien ordre) et `socle/tests/ressources.test.ts` ; `analyse.test.ts` adapté là où il lisait le moteur lancé après le provisoire (ordre des appels, annulation, forge pendant le provisoire, phases de la trace). Parité sur la capture du 27/10, avant (dernier commit) et après, Analyser, Analyser (reprise), Actualiser, Analyser : 172 constats, 105, 101, 105 et 101 messages, même hachage des messages complets (objets et ordre, génération normalisée), `df13b50b6bba1025` pour la reprise ; `paritesDeSession.test.ts` passe sans changement. Altérations jouées : lecture sans attente des imports (2 échecs), moteur toujours lancé en avance (1), phases du moteur non gardées (3), `finally` sans attente (1), moteur lancé avec les dépendances (1). Gain estimé : le moteur et les dépendances ont 2,2 à 3,2 s de travail à faire avant sa première lecture de variable (dépendances 348 ms estimés, part du moteur 830 ms sur 1 853, soit 41 à 45 % de ses 4,7 à 6,2 s), contre une attente restante du catalogue de 2,26 à 2,48 s : jusqu'à 1,8 à 2,3 s, à ne pas additionner avec 16.8 et 16.10 ; la mesure dans Figma tranchera.
- [ ] **16.10 | gpt-6-luna | low** | **Claude Sonnet | low** : conditionnelle à E1. Fixer la limite des imports en vol d'après la courbe mesurée ; garder `REQUETES_EN_VOL` pour les autres listes. Gain attendu 0 à 0,5 s après 16.8.
- [ ] **16.11 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : conditionnelle à E3. Ne compter dans le budget de `cederSiBesoin` que le temps écoulé depuis le dernier retour à la boucle d'événements (cession, ou attente d'API qui rend la main) ; porter `BUDGET_DE_CALCUL_MS` de 25 à 50 ms. Compteurs 16.1 avant et après ; plus longue tranche visée sous 100 ms. Gain attendu 0,8 à 1,3 s.
- [x] **16.12 | gpt-6.1-sol | high** | **Claude Sonnet | high** : étendre `champDuNoeud` à une mémoire de champs par demande, partagée par le relevé, les dépendances et le moteur ; y faire passer `name`, `parent`, `children`, `componentPropertyReferences`, `visible`, `dashPattern`, `layoutAlign`, `layoutGrow`, `fills`, `strokes`, `textStyleId`, et, pour 16.7, les champs que lisent les dépendances : `boundVariables`, `strokeWeight`, `remote`, `componentPropertyDefinitions`, `type`, `effectStyleId`. Sortie identique octet pour octet sur la capture ; compteurs de relectures avant et après. Gain attendu 0,6 à 1,4 s. Résultat : `InventairesDeLaDemande.champs` (`MemoireDeChamps`, `creerMemoireDeChamps` dans `inventaires.ts`) garde `noeud[champ]` par id de nœud et champ pour toute la demande, `figma.mixed` et `undefined` compris ; une lecture qui lève lève comme avant et n'y entre pas, un nœud sans id textuel se lit directement. `dansUnePorteeDAnalyse` la reprend des inventaires (`champDuNoeud` lit donc la mémoire de la demande ; sans inventaires, une mémoire de la portée, comme en 6.12), le relevé la reçoit par `OptionsDuReleve.champs` (`Lecteur.lire`) et `dependancesDeFigma` par `inventaires.champs`. `LecteurDeChamp` et `lectureNative` (`acquisition.ts`) nomment la lecture d'un champ : `lireUnChamp`, `copierLaMiseEnPage`, `lireLesPeintures` et `lireLesPeinturesParEtapes` la reçoivent, et `peinturesDuNoeud` passe `champDuNoeud`. Champs passés par la mémoire : relevé (`name`, `parent`, `children`, `visible`, `fills`, `strokes`, `strokeWeight` et le reste de `miseEnPage`, `textStyleId`, `componentPropertyReferences`, `componentPropertyDefinitions`, `boundVariables` par `liaisonsDuNoeudCooperatives`), dépendances (`type`, `textStyleId`, `effectStyleId`, `remote`, `parent`, `boundVariables`, `name`, `componentPropertyDefinitions` et les huit champs de `CHAMPS_SOUS_UNE_INSTANCE` d'un calque d'instance distante), moteur (`dashPattern` dans `unsupportedProperties.ts`, `children` dans `slotNames.ts`, `visible` et `componentPropertyReferences` dans `exportableNodes.ts`, `propertyBindings.ts`, `slotRelations.ts`, `extractLayout.ts` et `extractIconLayers.ts`, `parent` et `name` dans `propertyBindings.ts`, `slotRelations.ts`, `imbriques.ts`, `composedComponents.ts` et `layoutNodes.ts`, `remote` et `componentPropertyDefinitions` dans `imbriques.ts` et `composedComponents.ts`, `layoutAlign` et `layoutGrow` dans `flexLayout.ts`, `textStyleId` dans `extractVariantTypography.ts`, `effectStyleId` dans `effectStyles.ts`, `strokeWeight` dans `extractSlotTokens.ts`). Exception : `proprietaireDuCalque` (`composedComponents.ts`) lit `parent` en direct, parce que `accesDuMoteur.test.ts` y compte ce que le moteur lit hors des dépendances. Écritures : aucune pendant une demande (le moteur tourne avec `publier: false`, les écritures du plugin passent par `prendreLaPlaceDUneEcriture` et attendent la fin de l'analyse), et un changement du document pendant la demande périme déjà l'analyse (8.9). Les lectures de la validation (dépendances) et celles du moteur d'une même demande voient donc la même valeur ; c'est voulu pour 16.7, qui projette les dépendances depuis ce que le moteur a lu. Rejeu de la capture du 27/10 (4 demandes : Analyser, Analyser en reprise, Actualiser, Analyser) : messages complets, dans l'ordre, identiques octet pour octet à ceux d'avant (hachage `5ba762509ccaabf6`, 4 messages et 99 781 octets par demande). Lectures de propriétés au banc de la capture : 171 280 puis 176 375, mais 2 771 ms puis 2 017 ms estimés (754 ms de moins sur l'analyse entière) ; les lectures montent parce que chaque lecture mémorisée lit aussi `id`. Par étape : relevé 566 ms puis 567 (son travail ne change pas, il remplit la mémoire), dépendances 195 puis 246 (elles lisent maintenant ce que le moteur relisait), moteur 1 890 puis 1 141 ms (`structure.vues` 737 puis 531, `structure.couleurs` 382 puis 189, `wrapper` 210 puis 66, `structure.icones` 115 puis 64, `controle-theme` 42 puis 3). Les champs de la case coûtaient 1 736 ms estimées avant, 975 ms après. Reste hors mémoire : `name` du scan des règles (`nomLisible`, 124 ms, lu hors portée par `dependancesDeFigma`), `layoutSizingHorizontal` et `layoutSizingVertical`, `listSpacing`, `textTruncation`, `opacity`, et les champs lus une fois par le relevé et une fois par le moteur sur des nœuds que l'autre ne lit pas. Gain estimé : 0,75 s au coût du banc, dans le bas de la fourchette attendue (0,6 à 1,4 s) ; la mesure dans Figma tranchera. Tests : `tests/memoireDeChampsDeLaDemande.test.ts` (une demande lit une fois `boundVariables`, `fills`, `strokes`, `strokeWeight`, `textStyleId`, `componentPropertyReferences` et `visible` de ses calques pour le relevé, les dépendances et le moteur, sortie égale à celle sans mémoire de champs ; la demande suivante relit ; une seconde lecture des dépendances de la même demande ne relit aucun champ mémorisé), `socle/tests/champsDuNoeud.test.ts` (valeur de Figma rendue telle quelle, mixte et absence mémorisées, lecture qui lève non mémorisée, deux portées d'une même demande partagent la mémoire, les peintures partent de la lecture de la demande). Altérations jouées : moteur sans la mémoire de la demande (2 échecs), dépendances sans elle (3), relevé sans elle (2), mémoire gardée entre demandes (4). Oracle de l'exporteur : `projectionDesLecteurs.test.ts` place `id` avant les autres champs pour les nœuds dont il n'était pas le premier (COMPONENT_SET, TEXT, RECTANGLE, FRAME), parce que la mémoire lit `id` avant de lire le champ.
- [ ] **16.13 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : dans `calculerParEtapes`, lire l'horloge toutes les N étapes, N ajusté d'après la durée mesurée d'une étape pour tenir le budget ; sortie identique. Gain attendu 0,1 à 0,3 s.
- [ ] **R16.2 | mainteneur | sans modèle** : mesurer le Button avec 16.3 à 16.13, dix essais alternés avec le build 9.9 ; noter à part le premier essai après l'ouverture du plugin ; relever le second clic sans changement.
- [ ] **16.14 | gpt-6-luna | low** | **Claude Sonnet | low** : après décision du mainteneur (section « Geste du bouton »), faire reprendre par Actualiser les libraries anticipées après leur vérification, comme Analyser ; garder le geste du build L1 (clic : `analyser`, Maj+clic : `actualiser`) ou celui que le mainteneur retient. Tests `intentionDAnalyseDeLInterface.test.ts` et `lectureAnticipeeDesLibraries.test.ts` adaptés.
- [ ] **16.15 | gpt-6.1-sol | high** | **Claude Opus | high** : conditionnelle à E4. Valider une entrée sans relire tout le relevé : journal pour les nœuds, relecture par identifiant des variables liées et des cibles d'alias (nom, collection, clé, `valuesByMode`), relecture des liaisons seulement pour les propriétés que E4 montre non couvertes ; comparaison exacte découpée en tranches. Parité avec Actualiser sur tout le corpus « Sessions ». Cible : 0,3 à 1 s au second clic sans changement.
- [ ] **16.16 | gpt-6.1-sol | high** | **Claude Sonnet | high** : prélecture à la sélection, désactivée par défaut (section « Prélecture à la sélection ») : une analyse en mode discret, sans import, promue en session puis reprise au clic par la validation de 16.15 ; un clic pendant la prélecture la reprend au premier plan. Prérequis : 16.3 à 16.5 et 16.15.
- [ ] **R16.3 | mainteneur | sans modèle** : mesure A/B de la prélecture, protocole de la section « Prélecture à la sélection » ; décision d'activation par le mainteneur.
- [ ] **16.17 | gpt-6.1-sol | high** | **Claude Sonnet | high** : conditionnelle à E1 et E3. Lire les variants du relevé par groupes concurrents, assemblés par rang ; budget de layers, préfixe admis, ordre des manquées et progression inchangés. Gain attendu 0,3 à 1 s, non prouvé.

Prérequis : lots 6 à 9 ; L1 du lot 10, en cours dans `sandbox/analyse.ts`, passe avant 16.3, 16.9, 16.14 et 16.15. Nature : reprise validée sur un vrai composant UCM, puis réduction du chemin critique à sortie identique. Chemins : `packages/plugin-architect/src/sandbox/analyse.ts`, `sandbox/anticipation.ts`, `catalogue.ts`, `lecture.ts`, `releveDuComposant.ts`, `ui/barre.ts` ; `packages/plugin-socle/src/composant/analyse/` (`ressources.ts`, `inventaires.ts`, `limiteur.ts`, `invalidations.ts`), `composant/contract/` (`porteeDAnalyse.ts`, `composedComponents.ts`, `mesure.ts`). Aucune case ne touche le kit. Contrôles : socle, Architect et exporteur pour 16.6, 16.12 et 16.13. **Build Architect** pour 16.1, 16.2, R16.2 et R16.3.

16.3, 16.4, 16.7 et 16.15 prennent le profil Opus : un oubli de dépendance y rend un résultat périmé sans faire échouer un test existant, comme 9.4.

Le lot 13 (worker) reste le seul levier qui retire le calcul pur du fil principal : il est chiffré dans « Gains classés », sans case ici.

## Portée et preuves

### Sources et méthode

- Trace Figma du build 9.9, résumée par l'orchestrateur : 14,2 s, 15,0 s du clic au rendu. Mesures du build L1 relayées par l'orchestrateur : second clic, vérification des libraries, dispersion.
- Capture `capture-architect-2026-10-27-12-35-00.json` (dans `_local/vitesse-analyse/`), rejouée sur l'arbre de travail à `9d1fad6b` avec le double de `tests/outils/capture.ts`. Scripts jetables hors du dépôt : lectures croisées entre phases, appels d'API par phase, lectures distinctes, nœuds lus par le moteur hors du jeu, étapes des contrôles, reprise, égalité.
- Banc de coût de la capture, mesuré dans Figma : médiane 47 µs par propriété, `id` 0,3 µs, `getMainComponentAsync` 332 µs. Les trois captures donnent la même médiane (44 à 47 µs).
- Une durée sous Node n'est pas une durée Figma. Les contrôles du kit durent 1,72 s dans Figma et 124 ms sous Node (rejeu chaud) : environ 10 fois, cessions déduites. Les chiffres « Figma estimés » appliquent ce facteur 8 à 12 ou le banc de coût.
- Les lignes de code citées sont celles de `9d1fad6b`. `sandbox/analyse.ts` change en ce moment (L1) ; ses numéros peuvent bouger.

### Dispersion des mesures

Build L1, Button, trois essais : 19,2 s au premier après l'ouverture du plugin, puis 14,2 et 13,9 s.

| Part | Plage | Conséquence |
|---|---|---|
| Premier essai | 19,2 s ; relevé 5,5 s, 148 cessions = 1,78 s (12 ms chacune), plus longue tranche 94 ms | le premier accès coûte 5 s de plus ; la prélecture (16.16) l'absorbe avant le clic |
| Moteur | 4,7 à 6,2 s | un gain de moins de 1,5 s sur le moteur ne se voit pas sur un essai |
| Contrôles du kit | 1,6 à 2,8 s | même limite pour 16.13 |
| `catalogue-valeurs` | 2,26 à 2,48 s, 417 appels | part stable : son gain (16.8 à 16.10) se mesure sur peu d'essais |

R16.2 compte donc dix essais alternés et sépare le premier après l'ouverture. La cause du surcoût du premier essai n'est pas établie ; les compteurs par méthode de 16.1 la localiseront (premiers `getVariableByIdAsync` de variables distantes, premières lectures de nœuds, cessions plus longues).

### Décomposition des 14,2 s

| Part | Durée Figma | Source |
|---|---|---|
| Lectures de propriétés | 2,8 s (moteur 1,95, relevé 0,57, dépendances 0,28) | rejeu : 167 963 lectures pondérées par le banc |
| Cessions | 1,94 s (276 cessions, 7,0 ms chacune) | trace 9.9 |
| Attente des imports du catalogue | 2,3 s | trace : 2,36 s, 417 appels |
| Autres appels d'API (environ 1 150) | 0,5 à 1,5 s | rejeu (comptes) ; 0,3 à 0,9 ms par appel séquentiel, déduit de `index` (251 ms, 288 appels) et du banc |
| Calcul pur dans le sandbox | 3 à 4 s | sous Node 0,33 s hors lectures, facteur 8 à 12 |
| Sujet, règles, provisoire, projection | 0,3 s | trace |

Les phases se suivent sans recouvrement : sujet, libraries (en parallèle du relevé depuis 6.0), relevé, catalogue, contrôles, dépendances, moteur, règles, corrections, projection.

### Reprise du moteur au second clic

**Mesure.** Build L1, second clic sans changement : la validation tourne (dépendances 795 ms avant les contrôles), puis le moteur se rejoue (4,85 s) avec les dix requêtes ; total 14,2 s.

**Cause, établie par le rejeu.** Deux Analyser de suite sur la capture, page suivie : le second relance aussi le moteur et les dix requêtes. Le jeu compte 288 instances (les 758 de la capture incluent les maîtres et le reste de la page). Leurs maîtres :

| Maître | Distant | Instances dans le jeu | Instances imbriquées | Refus |
|---|---|---|---|---|
| `3:428` (jeu `.sizeWrapperButton`, `3:423`) | non | 90 | 6 | `non-couvert:maitres-autres-instances` (`sandbox/analyse.ts:472`) |
| `4:1257` (`arrow-left-long`) | oui | 90 | 0 | `non-couvert:maitres` (ligne 471) |
| `3:22` (`arrow-right-long`) | oui | 90 | 0 | `non-couvert:maitres` |
| `1140:1426` (jeu `.Ring`, `1140:1427`) | non | 18 | 0 | aucun |

Les deux refus tombent sur le Button. Couvrir les instances imbriquées seules ne suffit pas : 16.3 et 16.4 vont ensemble.

**Ce que le moteur lit hors du jeu.** Rejeu avec enregistrement des nœuds lus pendant le seul lecteur `moteur` : 1 189 nœuds, dont 649 dans le jeu et 540 hors du jeu.

| Nœuds hors du jeu | Nombre | Champs lus | Couverture proposée |
|---|---|---|---|
| Jeux des maîtres locaux `3:423` et `1140:1427` | 21 | champs de structure | journal : déjà suivis par 9.5 sur une page écoutée |
| Maîtres distants `4:1257` et `3:22` | 2 (le maître seul) | `id`, `name`, `remote`, `parent`, `componentPropertyDefinitions` | relecture et comparaison de ces champs (16.4), deux appels |
| Reste de la page `0:1` | 517 (498 textes, 11 cadres, 5 instances, 2 sections) | `name` (498), `characters` (5), `type` et `parent` (remontée) | `nomsDeLaPage` et le scan `regles`, déjà relus et comparés par les dépendances |

Sous les six instances imbriquées de `3:428`, le moteur ne lit aucun nœud hors de ces trois régions. Le refus de 9.5 venait de ce que la validation ne savait pas ce que `indexMasterInstances`, `scanComposedInstances` et `findWrapperReference` (`composedComponents.ts:527-640`, `componentTree.ts:410`) lisent sous ces instances. L'enregistrement des accès le dit.

**Trois façons de couvrir les imbriqués.**

| Option | Coût à la validation | Preuve | Retenue |
|---|---|---|---|
| Relire par les fonctions du moteur (`indexMasterInstances`, `scanComposedInstances`, `findWrapperReference`) et comparer leurs sorties | une part des étapes `composition` et `wrapper` du moteur, 0,3 à 0,5 s | égalité des sorties | non : coût du même ordre que la cible de 16.15 |
| Fermeture des maîtres atteints, suivie au journal ou relue | 6 `getMainComponentAsync` et deux maîtres distants relus sur le Button, moins de 20 ms estimées | enregistrement des accès sur la capture et le corpus de parité | oui (16.3, 16.4) |
| Refus maintenu | aucun | aucune reprise sur un composant UCM qui embarque une icône | non |

Limite de la fermeture : Figma ne notifie jamais `documentchange` « if an instance sublayer was updated by a change to a main component » ([cas particuliers](https://developers.figma.com/docs/plugins/api/properties/figma-on/#special-cases)). La fermeture suit donc le maître lui-même, jamais l'instance seule. Un maître local sur une page non écoutée garde le refus.

**Chiffre.** Avec 16.3 et 16.4, le second clic sans changement reprend le moteur (4,7 à 6,2 s) et, par L1, les familles de contrôles (1,6 à 2,8 s) et les corrections (0,27 s). Il paie encore relevé (3,4 s), catalogue (2,4 s), dépendances (0,8 s) et validation : environ 6,5 à 7 s au lieu de 14,2 s.

### Fermeture des maîtres (16.3)

- **Lecture.** `dependancesDeFigma` lit le maître de chaque instance du jeu, comme en 9.5. Chaque maître local lu rend les instances qu'il contient ; leurs maîtres forment le niveau suivant, sur `PROFONDEUR_DES_MAITRES` (8) niveaux. Un maître déjà lu ne se relit pas. Un maître atteint seulement sous un autre porte `instances: 0`. `imbriqueesNonLues` compte les instances dont le maître ne se lit pas et celles qui restent au-delà de la profondeur.
- **Liaisons relues jusqu'au résultat de E4.** `NodeChangeProperty` ne nomme pas `boundVariables`, et la matrice de couverture du socle range les liaisons dans `relecture`. `MaitreDeDependance.liaisons` porte donc les `boundVariables` de chaque nœud d'un maître local de la fermeture, dans l'ordre de `noeuds`, et la validation les compare exactement (`different:dependances`). L'enregistrement des accès n'a relevé aucun autre champ lu sur la fermeture sans événement démontré : les autres champs (`name`, `visible`, `type`, `parent`, `children`, mise en page, `componentPropertyDefinitions`, `variantProperties`) relèvent de `nodechange`.
- **Validation.** `maitresCouverts` exige chaque maître de la fermeture suivi par l'entrée et écouté par la demande, et un maître lu pour chaque instance du jeu ; sinon `non-couvert:maitres`. `non-couvert:maitres-autres-instances` ne vise plus que `imbriqueesNonLues > 0`. Les maîtres atteints passent par `maitresSuivisParLeJournal` : un maître local d'une page écoutée entre dans `SuivisDuSujet.maitres` avec ses descendants.
- **Enregistrement des accès** (`tests/outils/accesDuMoteur.ts`). Le moteur et `dependancesDeFigma` se rejouent chacun seul sur le double d'une capture, mémoire des pages vidée. Chaque couple nœud et champ lu par le moteur se range dans le jeu, la fermeture suivie, un maître distant, ou un couple que `dependancesDeFigma` lit aussi hors des deux premières régions. Dans la fermeture, un champ de liaison (`boundVariables`, `explicitVariableModes`, `resolvedVariableModes`) n'est couvert que si `dependancesDeFigma` le relit sur le même nœud. Ces derniers aboutissent tous dans une sortie comparée : scan des règles, noms de la page, page et origine d'un maître. `loadAsync`, `on` et `off` ne lisent aucune donnée et sont écartés.

| Rejeu | Jeu | Fermeture | Maître distant | Comparé | Hors couverture |
|---|---|---|---|---|---|
| Capture du Button (12:35) | 649 | 21 | 2 : `id`, `name`, `remote`, `parent`, `componentPropertyDefinitions` | 1 064 | 0 |
| Monde fabriqué de `accesDuMoteur.test.ts` : `Carte`, `Bouton`, `Icone`, `Point` locaux, `Fleche` distante | 7 | 13 | 1 : `name`, `parent`, `remote` | 5 | 0 |

- **Trace du Button**, rejeu de deux Analyser puis d'Actualiser. Avant : second Analyser `nonReprise:non-couvert:maitres` et `nonReprise:non-couvert:maitres-autres-instances`. Après : `nonReprise:non-couvert:maitres` seul, pour les deux icônes distantes (16.4). Les six instances sous `3:428` ont ces icônes pour maîtres, déjà lues au premier niveau.
- **Coût.** Sur le Button, `getMainComponentAsync` passe de 312 à 318 dans les dépendances, et leurs lectures de 7 769 à 7 802 : six appels de maître, six lectures qui les accompagnent et 21 lectures de `boundVariables`. Aucun maître local nouveau, donc aucun `nomsDeLaPage` de plus. Estimation Figma : 3 à 6 ms. Un maître local imbriqué ajoute un `findAll` de son jeu et un `nomsDeLaPage` de sa page.
- **Banc.** `paritesDeSession.test.ts`, maître local qui porte une instance : inchangé, repris ; calque du maître imbriqué avec son `nodechange`, maître de l'instance changé avec et sans événement, nom contracté avec et sans événement, maître imbriqué distant ou sur une page non écoutée, maître illisible, liaison d'un calque d'un maître local ou imbriqué changée sans événement : moteur relancé, affichage égal à Actualiser. Un événement sous le maître imbriqué reçu avant la lecture des dépendances périme l'analyse. Avec le vrai moteur, `accesDuMoteur.test.ts` : monde tout local, second Analyser `repriseDuMoteur`, affichage égal à Actualiser ; calque d'`Icone` muté avec son `nodechange`, moteur relancé, affichage égal à Actualiser.
- **Altérations.** `PROFONDEUR_DES_MAITRES` à 0 fait échouer sept tests : enregistrement des accès, deux tests du monde fabriqué, maître imbriqué inchangé, événement reçu avant les dépendances, trace et lecteur de Figma. Une validation qui ne juge que les maîtres des instances du jeu en fait échouer quatre : maître imbriqué distant et sur une page non écoutée au banc, test de `validationDeLEntree.test.ts`, monde fabriqué distant. Des liaisons non relues (`null` pour chaque nœud) en font échouer trois : les deux liaisons changées sans événement et le lecteur de Figma ; sur la capture du Button, 18 nœuds passent hors couverture.

Limites :

- Hors liaisons, un calque d'un maître local se juge au seul journal. Figma émet son `nodechange` sur une page écoutée ; sans événement, rien ne le relit. Le banc n'a donc pas de cas de peinture ou de nom muté sans événement.
- Si E4 montre qu'un changement de liaison émet un `nodechange`, la relecture des liaisons de la fermeture peut tomber avec celle du relevé (16.15).
- Le moteur lit aussi les calques des instances d'icône posées dans `3:428`. Une mise à jour de library les change sans événement ; 16.4 les relit.
- Sur le banc de parité, le moteur est un double qui ne lit pas Figma : l'enregistrement des accès porte sur la capture et sur le monde fabriqué, avec le vrai moteur.

### Maîtres distants relus (16.4)

- **Maître distant.** `decrireLeMaitre` relit `definitionDuMaitreDistant` : `CHAMPS_DU_MAITRE_DISTANT` (`name`, `remote`, `componentPropertyDefinitions`), le parent (identifiant et type) et, pour un variant, les mêmes champs de son jeu et son `defaultVariant`. Une valeur qui lève devient `{ illisible }`, `figma.mixed` devient `mixte`.
- **Calques des instances distantes.** Toute instance du jeu ou de la fermeture dont le maître est distant donne ses calques (`findAll`), sans doublon : identifiant, parent, `CHAMPS_SOUS_UNE_INSTANCE` (`type`, `name`, `visible`, `boundVariables`, `componentPropertyReferences`, `fills`, `strokes`, `strokeWeight`) et le maître lu d'un calque `INSTANCE`. Figma n'émet aucun `nodechange` quand une mise à jour de library les change.
- **Validation.** `maitresCouverts` tient pour couvert un maître `remote: true` dont la définition est lue ; la comparaison exacte des dépendances juge la définition et les calques (`different:dependances`). Un maître d'origine inconnue, sur une page non écoutée ou illisible garde `non-couvert:maitres`.
- **Enregistrement des accès, règle resserrée.** Sur un maître distant, et sur un nœud du jeu ou de la fermeture placé sous une instance dont le maître n'est pas suivi, chaque champ lu par le moteur doit être relu par `dependancesDeFigma` sur le même nœud. Les deux listes de champs viennent de ce relevé : 5 champs sur les deux maîtres distants du Button, 9 sur 186 calques (180 dans le jeu, 6 sous `3:428`). Le monde fabriqué a ajouté `parent`, lu sur un calque d'instance distante.

| Rejeu | Jeu | Fermeture | Maître distant | Comparé | Hors couverture |
|---|---|---|---|---|---|
| Capture du Button | 649 | 21 | 2 | 1 064 | 0 |
| Monde fabriqué, `Fleche` distante | 7 | 13 | 1 | 5 | 0 |

- **Trace et affichage du Button.** Rejeu de deux Analyser puis d'Actualiser : second Analyser `repriseDuMoteur`, affichage et corrections égaux à ceux d'Actualiser (99 617 caractères de messages comparés).
- **Coût.** Dépendances du Button : 7 795 lectures avant 16.4, 11 475 après, et `getMainComponentAsync` inchangé (318). Le banc de coût de la capture estime 281 ms avant et 422 ms après dans Figma, soit 140 ms de plus, contre 4,7 à 6,2 s de moteur repris au second clic sans changement.
- **Banc.** `paritesDeSession.test.ts` : maître de library inchangé et maître imbriqué de library inchangé, repris ; maître de library, maître imbriqué de library et calque d'une instance de library changés sans événement, moteur relancé et affichage égal à Actualiser ; trace `repriseDuMoteur=1` sur un maître distant. `validationDeLEntree.test.ts` : définition et calque changés donnent `different:dependances`, origine inconnue `non-couvert:maitres` ; le lecteur de Figma rend la définition et le calque relus. Avec le vrai moteur, `accesDuMoteur.test.ts` : `Fleche` distante reprise, puis son calque d'instance renommé sans événement, `nonReprise:different:dependances` et affichage égal à Actualiser.
- **Altérations.** Sans calques relus : quatre tests échouent (calque de library au banc, monde fabriqué, enregistrement des accès, lecteur de Figma), et 1 446 couples passent hors couverture sur le Button. Une définition vide : quatre tests échouent (maître et maître imbriqué de library au banc, enregistrement des accès, lecteur de Figma), et 4 couples (`name`, `componentPropertyDefinitions`) passent hors couverture.

Limites :

- Les deux listes de champs sont celles que le moteur lit sur la capture du Button et sur le monde fabriqué. Un composant dont le moteur lirait un autre champ sur un calque d'instance distante (texte, effets, mise en page) ne serait pas couvert : aucun contrôle ne le voit à l'exécution. L'enregistrement des accès, rejoué sur une nouvelle capture, le montre.
- Les 140 ms estimées viennent surtout de `fills` et `strokes` relus sur 186 calques. 16.6 et 16.12 peuvent les partager avec le moteur dans la mémoire de la demande.
- E5 reste à jouer : s'il montre un événement fiable après une mise à jour de library, la relecture peut se réduire au repli qu'il décrit.

### Lecture des dépendances et moteur (16.7)

- **Lire après le moteur rend une reprise fausse.** Prenons un champ que le moteur lit sans événement démontré : liaison d'un nœud de la fermeture, champ d'un maître distant, calque d'une instance distante, définition d'un style distant. S'il change pendant le calcul, une lecture faite après le moteur retient la valeur nouvelle, et le moteur a calculé sur l'ancienne. Au clic suivant, la lecture fraîche égale la valeur retenue et la validation reprend le moteur périmé. Lues avant le moteur, les dépendances retenues sont plus anciennes que lui, et la validation suivante refuse.
- **Ce que la mémoire de 16.6 projette.** Le scan des règles, les listes locales et les noms de page sont les valeurs que le moteur a consommées, mais ils sont déjà partagés avec lui. La mémoire ne porte aucun champ de nœud : liaisons, définition d'un maître distant, calques d'instances distantes et définition d'un style se relisent sur l'objet Figma au moment de la lecture.
- **16.12 rend la projection exacte.** Avec une mémoire de champs par demande partagée par le relevé, les dépendances et le moteur, une projection faite après le moteur rend, pour chaque champ qu'il a lu, la valeur qu'il a vue. Un champ qu'il n'a pas lu ne change pas son résultat. Champs à ajouter à cette mémoire : `boundVariables`, `componentPropertyReferences`, `strokeWeight`, `remote`, `componentPropertyDefinitions`, `type`, `textStyleId`, `effectStyleId`.
- **Mesure.** Sur le Button rejoué, au banc de coût de la capture, première analyse ou Actualiser : relevé 566 ms, dépendances 348 ms, moteur 1 814 ms. Sans lecteur de dépendances, le moteur passe à 1 986 ms : 172 ms de lectures partagées (scan, maîtres, noms de page) lui reviennent. Le gain plafonne donc à 176 ms au banc, 0,4 à 0,5 s dans Figma, au lieu des 0,6 à 0,8 s estimés. Plus de la moitié vient des calques d'instances distantes (`fills`, `strokes`) et des liaisons.
- **Garde.** `paritesDeSession.test.ts`, « un champ sans événement changé pendant le calcul du moteur » : le nom d'un maître distant change pendant le moteur, sans événement ; au clic suivant le moteur est relancé et l'affichage égale Actualiser. Des dépendances relues après le moteur font échouer ce test.

### Vérification des libraries

**Mesure.** `msVerificationDesLibraries` vaut 16 à 39 ms juste après la sélection, et 671 à 907 ms quand le clic suit la sélection de 30 s.

**Cause.** La vérification relit toute la liste (`lireLesLibraries`, `sandbox/anticipation.ts:86-89`) et compare une signature : un appel `getAvailableLibraryVariableCollectionsAsync`, puis un `getVariablesInLibraryCollectionAsync` par collection (8 appels sur le Button). Le code ne change pas avec l'attente ; seule la réponse de Figma change. Figma sert donc ces appels depuis une mémoire de courte durée, puis les redemande. La durée de cette mémoire n'est pas documentée ; E6 la mesure.

**Conséquences.**

- L'hypothèse de 6.0b (cache de session, rafraîchi au rechargement) ne tient que dans cette courte fenêtre. Au-delà, Figma relit : la vérification au clic garde donc son rôle de fraîcheur. 16.5 la garde.
- Sur la première analyse, la vérification court pendant le relevé (3,4 à 5,5 s) : ses 0,9 s ne sont pas sur le chemin critique.
- Sur une reprise rapide (16.15, cible 0,3 à 1 s), elle le devient. 16.5 la lance au clic en même temps que la validation, et la prélecture la rafraîchit avant l'échéance mesurée par E6.

### Chemin critique et parallélisme

Dépendances de données, lues dans `analyser` (`sandbox/analyse.ts`) :

| Phase | Lit |
|---|---|
| relevé | sujet |
| catalogue | relevé (clés des liaisons), libraries |
| contrôles du kit | relevé, catalogue, niveau |
| dépendances | sujet, inventaires de la demande |
| moteur | sujet, inventaires de la demande |
| corrections | relevé, catalogue, moteur, règles, contrôles |

Le moteur et les dépendances ne lisent ni le relevé ni le catalogue. Ils peuvent donc courir pendant les attentes du catalogue (16.9).

Les appels d'API asynchrones se recouvrent avec le travail du sandbox :

- depuis 6.0, la lecture des libraries (2 à 6 s selon LOT-06) court pendant le relevé ; le relevé reste à 3,2 s et le total passe de 21,3 à 17,7 s (`trace-button-6-0b.md`) ;
- dans la trace 9.9, le relevé cumule 5,8 s d'attente en 3,39 s : au moins deux appels en vol en même temps ;
- le catalogue cumule 19 s d'attente en 2,36 s, soit 8,05 appels en vol en moyenne. C'est la limite `REQUETES_EN_VOL = 8` (`plugin-socle/src/composant/analyse/limiteur.ts:11`). Le chiffre ne dit pas si Figma sert ces imports en parallèle ou en file : E1 tranche.

Le calcul pur ne se recouvre pas : le sandbox n'a qu'un fil. Les contrôles du kit pendant le moteur ne raccourcissent rien dans le sandbox. Seul un worker (lot 13) les fait tourner en même temps que le moteur.

Ordre de fraîcheur à garder : les dépendances retenues ne doivent pas être plus récentes que le moteur (LOT-09, 9.4). 16.6 et 16.7 le renforcent : relevé, dépendances et moteur lisent alors la même copie mémorisée.

### Lectures en double entre relevé, dépendances et moteur

Lectures de propriétés croisées, rejeu de la capture (première lecture d'un couple nœud et champ dans une phase, déjà lu dans une phase antérieure) :

| Déjà lu par | Relu par | Lectures | Figma estimé |
|---|---|---|---|
| relevé | moteur | 3 735 | 292 ms (`fills` 102, `boundVariables` 69, `strokes` 25, `name` 23) |
| dépendances | moteur | 1 487 | 116 ms (`getMainComponentAsync` 60, `name` 32, `effectStyleId` 16) |
| relevé | dépendances | 591 | 42 ms |

Sur toute l'analyse, 167 963 lectures coûtent 2,8 s estimées. Les 21 365 couples nœud et champ distincts en coûtent 1,4 s. Une mémoire de champs parfaite par demande rendrait donc au plus 1,4 s estimées. Plus grosses relectures restantes : `name` 260 ms, `getMainComponentAsync` 131, `fills` 127, `boundVariables` 98, `parent` 95, `componentPropertyReferences` 76, `children` 66, `visible` 49. En 6.12, la mesure a montré 4,2 s de gain pour 3,2 s estimées : l'estimation est prudente.

Appels d'API par phase, même rejeu :

| Méthode | Relevé | Catalogue | Dépendances | Moteur | Distincts |
|---|---|---|---|---|---|
| `getMainComponentAsync` | 108 | 0 | 312 | 288 | 288 instances |
| `getVariableByIdAsync` | 189 | 161 | 0 | 202 | 364 |
| `importVariableByKeyAsync` | 0 | 250 | 0 | 0 | 250 |
| `getNodeByIdAsync` | 270 | 0 | 0 | 0 | 270 |

Causes :

- le relevé crée sa mémoire (`plugin-architect/src/releveDuComposant.ts:208`), le moteur la sienne (`plugin-socle/src/composant/variables.ts:270`) : 188 des 202 `getVariableByIdAsync` du moteur relisent des variables du relevé ;
- `dependancesDeFigma` appelle `getMainComponentAsync` sur chaque instance hors de toute mémoire (`sandbox/analyse.ts:1070-1074`), puis le moteur relit les 288 maîtres dans `index` ;
- `decrireLeMaitre` appelle `nomsDeLaPage` pour chaque maître local (`sandbox/analyse.ts:1008`) : deux balayages de la page `0:1` pour le Button, plus celui du moteur (`composedComponents.ts:376`).

Une acquisition commune complète (lot 6) se réduit donc à deux mémoires par demande : ressources (16.6) et champs (16.12). Elle rapporte au plus 1,4 s de lectures et 0,3 à 0,6 s d'appels.

### Valeurs du catalogue

Les 417 appels de `catalogue-valeurs` se répartissent ainsi dans le rejeu : 250 `importVariableByKeyAsync`, 161 `getVariableByIdAsync`, 5 `getVariableCollectionByIdAsync`, 1 `clientStorage.getAsync`.

- Les imports passent par `importerLesValeurs` à 8 en vol (`lecture.ts:404`, `catalogue.ts:104`). Les cibles d'alias hors catalogue se lisent une par une dans une boucle `await` (`catalogue.ts:170-172`), en vagues successives jusqu'à `PROFONDEUR_D_ALIAS = 10` (`catalogue.ts:76`).
- Les 161 lectures par identifiant sont séquentielles. À 0,3 à 0,9 ms chacune, elles pèsent 0,05 à 0,15 s. Les 19 s d'attente cumulée viennent donc des imports : environ 76 ms par import, 8 en vol, soit 2,4 s.
- 183 des 250 clés importées sont celles de variables que le relevé a déjà lues par `getVariableByIdAsync`. Dans la capture, l'import rend la même variable (même identifiant) pour ces 183 clés. Le relevé ne garde de ces variables que `key`, `name` et `variableCollectionId` (`ChampDeVariableCopie`, `plugin-socle/src/composant/analyse/ressources.ts:72`).
- Aucun appel groupé ne rend les valeurs d'une library. `getVariablesInLibraryCollectionAsync` rend des descripteurs, et l'exemple de la documentation importe ensuite par clé ([documentation](https://developers.figma.com/docs/plugins/api/properties/figma-teamlibrary-getvariablesinlibrarycollectionasync/)). `getLocalVariablesAsync` ne couvre que les variables locales ; le Button n'en lie aucune (`locales` vide dans la capture). La documentation de l'import ne dit ni s'il passe par le réseau, ni s'il rend la copie du document ([documentation](https://developers.figma.com/docs/plugins/api/properties/figma-variables-importvariablebykeyasync/)) : E2 tranche.

Le catalogue lit ces valeurs pour les contrôles d'accessibilité et de thème, qui comparent des couleurs par mode, et pour les corrections, qui cherchent des candidats par valeur. Sans valeur, une variable reste `non-chargee` et le contraste ne se mesure pas (commentaire de `chargerLesValeurs`).

Risque de 16.8 : si l'import rend une version publiée non acceptée et la copie du document une version plus ancienne, les valeurs changent. E2 compare les deux dans l'état « à jour » et dans l'état « mise à jour en attente ». Sans égalité dans les deux états, 16.8 est écartée.

### Cessions

- Trace 9.9 : 276 cessions coûtent 1,94 s, soit 7,0 ms chacune ; plus longue tranche synchrone 44 ms ; 97 cessions du relevé coûtent 0,93 s (9,6 ms chacune, la lecture des libraries tourne pendant ce temps). Premier essai du build L1 : 12 ms par cession et 94 ms de plus longue tranche.
- `cederSiBesoin` cède dès que 25 ms se sont écoulées depuis la dernière cession (`porteeDAnalyse.ts:72`, `BUDGET_DE_CALCUL_MS = 25`, ligne 119). Ce temps inclut les attentes d'API. Une phase faite surtout d'attentes, comme le relevé (476 appels), cède donc sans avoir occupé le fil 25 ms.
- Le coût d'une cession ne baisse pas : `setTimeout(0)` rend la main à Figma, qui dessine. Seul le nombre de cessions se réduit.
- Budget à 50 ms : environ deux fois moins de cessions sur le calcul, soit 0,6 à 0,9 s. Ne plus compter les attentes d'API rendues à la boucle d'événements : la plupart des 97 cessions du relevé disparaissent, soit jusqu'à 0,9 s. Les deux gains se recouvrent : 0,8 à 1,3 s ensemble.
- Une tranche de 50 ms tient la réponse à une entrée sous 100 ms, seuil du modèle de réactivité de [web.dev](https://web.dev/articles/rail). La documentation de Figma confirme que le code du plugin tourne sur le fil principal ([How plugins run](https://developers.figma.com/docs/plugins/how-plugins-run/)) ; elle ne donne aucun budget.
- E3 vérifie qu'une attente d'API rend la main à la boucle d'événements. Sans cela, 16.11 ne garde que le budget de 50 ms.

### Contrôles du kit

Étapes de chaque famille sur le Button, sous Node, médiane de six passes alternées (horloge lue à chaque étape comme `calculerParEtapes`, puis sans horloge) ; durée Figma de la trace 9.9 :

| Famille | Étapes | Node avec horloge | Node sans horloge | Figma |
|---|---|---|---|---|
| nommage | 39 628 | 36 ms | 31 ms | 952 ms |
| oublis | 84 359 | 37 ms | 31 ms | 448 ms |
| thème | 3 672 | 29 ms | 28 ms | 310 ms |
| mapping | 10 765 | 15 ms | 12 ms | 150 ms |
| structure | 1 199 | 8 ms | 6 ms | 82 ms |
| couches | 4 704 | 4 ms | 2 ms | 59 ms |
| accessibilité | 1 291 | 3 ms | 3 ms | 36 ms |
| typographie | 396 | 0,6 ms | 0,4 ms | 11 ms |

- Une étape vide coûte 100 ns sous Node, 240 ns avec la lecture de l'horloge. Le pas à pas et l'horloge pèsent 10 à 20 % du nommage et des oublis sous Node : c'est la borne de 16.13.
- Le nommage dure 26 fois son temps Node dans Figma, les autres familles 10 à 15 fois. Le nommage calcule le premier les tokens du composant (`tokensDuComposant`, mémoire par catalogue), que mapping, oublis et corrections reprennent. Seul un profil dans Figma répartirait cet écart.
- Le lot 4 a retiré les coûts quadratiques connus. Le reste est du calcul linéaire sur 756 variables et 198 layers. Ces chiffres n'établissent aucun gain algorithmique à sortie identique ; aucune case ne le promet.
- L1 (lot 10, en cours) reprend une famille dont la projection est égale : gain sur les analyses suivantes, aucun sur la première.

### Moteur

| Étape | Figma (9.9) | Lectures estimées (rejeu 6.12) | Node chaud |
|---|---|---|---|
| `structure.vues` | 2 226 ms | 654 ms | 43 à 50 ms |
| `structure.couleurs` | 877 ms | 353 ms, plus 182 `getVariableByIdAsync` | 20 ms |
| `wrapper` | 428 ms | 189 ms (`pathFrom`, `aQuiAppartient`) | 8 à 12 ms |
| `structure.typographie-exacte` | 322 ms | 86 ms | 9 à 19 ms |
| `structure.icones` | 327 ms | 103 ms | 7 à 10 ms |
| `index` | 251 ms | 156 ms, dont 288 `getMainComponentAsync` | 2 à 4 ms |

- `structure.vues` : lectures 0,65 s, calcul 0,4 à 0,6 s (facteur 8 à 12), cessions environ 0,5 s ; le reste n'est pas expliqué. 16.12 vise ses relectures (`name`, `parent`, `children`, `visible`, dimensionnement), 16.11 ses cessions.
- `structure.couleurs` : ses 182 lectures de variables relisent presque toutes le relevé ; 16.6 les retire.
- `index` : ses 288 `getMainComponentAsync` relisent les dépendances ; 16.6 les retire.
- Calcul redondant entre variants : le calcul pur du moteur ne pèse que 125 ms sous Node, environ 1,2 s dans Figma. Partager des résultats entre variants proches relève du lot 12 et ne rendrait qu'une part de cette seconde, avec un risque de parité élevé. Aucune case ici.

### Dépendances du lot 9

- Coût : 0,78 s dans la trace 9.9 (étape `imbriques`), 795 ms au second clic du build L1. `lireLesDependancesEtValider` lit les dépendances, que la demande valide ou non (`sandbox/analyse.ts:1369-1383` et `1413`). Elles servent à la validation de la demande suivante et au suivi des maîtres (`suivreLesMaitres`, ligne 1380).
- Contenu lu : un balayage `findAll` du jeu (649 nœuds), 288 `getMainComponentAsync` séquentiels avec une cession possible entre chacun, la définition du style de texte, et pour chaque maître local un `findAll` de son jeu et un `nomsDeLaPage`.
- Tant que 16.3 et 16.4 manquent, la validation suivante refuse toujours sur le Button : ces 0,8 s sont perdues à chaque analyse, Actualiser compris.
- 16.7 les supprime hors validation. Le moteur lit déjà le scan des règles et les listes locales par les inventaires de la demande (6.6), les maîtres (288 appels) et la page des noms. Avec 16.6, la projection ne coûte aucun appel. Sur le chemin de validation, la lecture fraîche reste, réduite par 16.6 (maîtres et page déjà mémorisés dans la demande).

### Geste du bouton et coût d'une ré-analyse

**Constat.** À `9d1fad6b`, le bouton du mode Composant envoie `actualiser` dès qu'une analyse existe (`ui/barre.ts:96`), et `reutilisationPermise` ne vaut vrai que pour `analyser` (`sandbox/analyse.ts:1212`). Le build L1 envoie `analyser` au clic et `actualiser` au Maj+clic. Actualiser abandonne les libraries anticipées et les relit (`sandbox/analyse.ts:1227`) : 2 à 6 s selon LOT-06, parfois plus que le relevé, que le catalogue attend alors (`catalogue-attente-libraries`). C'est une explication possible de la seconde de plus d'Actualiser ; la trace de R16.1 la confirmera ou non.

**Proposition pour le geste (décision du mainteneur).**

- Le clic envoie `analyser`, comme le build L1. La validation 9.4 garantit l'égalité avec Actualiser sur tout le banc de parité (`paritesDeSession.test.ts`), et toute entrée non validée suit le chemin complet.
- La reconstruction forcée reste un geste distinct (Maj+clic dans le build L1, ou une action du panneau des constats). Elle sert de recours quand le designer doute du résultat.
- Actualiser reprend les libraries anticipées après leur vérification, comme Analyser (16.14). La vérification relit déjà la liste entière.

**Durées réalistes.**

| Situation | Aujourd'hui | Après 16.3 et 16.4 | Après 16.5 à 16.13 en plus | Après 16.15 |
|---|---|---|---|---|
| Second clic sans changement | 14,2 s (mesure L1) | 6,5 à 7 s | 3 à 4 s | 0,3 à 1 s |
| Second clic après une modification locale | 14,2 s | 14,2 s (invalidation du sujet entier, 9.5) | 7 à 9 s | 7 à 9 s |
| Actualiser | 16 s | 16 s | 7,5 à 9,5 s | 7,5 à 9,5 s |

- Sans changement, le plancher est la revalidation de ce qu'aucun événement ne couvre : 364 variables et cibles d'alias à relire par identifiant (0,1 à 0,3 s), la page des règles, les maîtres distants, la vérification des libraries (16.5) et la comparaison exacte. Celle-ci coûte 9 ms sous Node pour le relevé (660 Ko de JSON), le catalogue (182 Ko) et les dépendances (108 Ko), soit 70 à 110 ms dans Figma, en une tranche aujourd'hui. La cible de 250 ms (R11) demande E4 positive, des relectures par identifiant en parallèle et une vérification des libraries dans la fenêtre que E6 mesure.
- Après une modification locale, l'invalidation large relance le moteur. La cible de 500 ms de R11 reste hors de portée sans moteur incrémental, comme LOT-10 l'a établi. L1 à L3 rendent au plus les familles de contrôles inchangées.

**Relevé et liaisons.** `NodeChangeProperty` ne nomme pas `boundVariables` ([NodeChangeProperty](https://developers.figma.com/docs/plugins/api/NodeChangeProperty/)), et aucun type de `DocumentChange` ne vise les variables ([DocumentChange](https://developers.figma.com/docs/plugins/api/DocumentChange/)). Une liaison changée vers une variable de même valeur peut donc ne laisser aucune trace au journal. E4 le vérifie propriété par propriété. 16.15 relit seulement les liaisons des propriétés que E4 montre non couvertes.

### Prélecture à la sélection

**Mesure.** Le mainteneur a sélectionné le Button, attendu 30 s, puis cliqué : 18 s. Seule la liste des libraries est anticipée (6.0b), et sa vérification coûte alors 671 à 907 ms au lieu de 16 à 39 ms. L'attente n'a donc rien rapporté.

**Principe.** À la sélection d'un jeu, après 1 s sans autre sélection, lancer `analyser` avec une origine `prelecture`. Le résultat se promeut en session par la révision du lot 9. Au clic, la demande `analyser` valide l'entrée (16.15) et reprend tout. Un clic pendant la prélecture reprend son opération au premier plan, avec le budget normal.

**Gain perçu.** Le Button attendu 30 s : le clic ne coûte que la validation, 0,3 à 1 s après 16.15. Sans 16.3 et 16.4, la validation refuse sur le Button et la prélecture ne rend rien au clic : elle passe après ces cases. Elle absorbe aussi le surcoût du premier essai après l'ouverture (19,2 s contre 14 s).

**Coût pour Figma pendant le travail du designer.** Trace 9.9 : le sandbox occupe le fil environ 10 s sur 14,2 s, par tranches de 25 à 44 ms. En mode discret, la prélecture prend des tranches de 8 ms au plus et cède par `setTimeout` de 16 ms : le fil reste libre plus de 60 % du temps. Elle dure alors 20 à 30 s avec le moteur actuel, moins après 16.6 à 16.13. Elle ne fait aucun import (`importVariableByKeyAsync` abonne le fichier à la variable, commentaire de `importerLesValeurs`) : le clic importe les clés manquantes. Elle garde au plus deux appels en vol.

**Annulation et fraîcheur.** La prélecture lève son jeton à tout `selectionchange`, `currentpagechange`, `stylechange` ou `nodechange` reçu, et reprend après 1 s sans événement : c'est la simulation de l'inactivité. Le journal et la révision (lots 8 et 9) jugent sa promotion comme celle d'une analyse ordinaire. Une prélecture interrompue ne promeut rien.

| Condition de `lots/README.md` | Réponse | Preuve |
|---|---|---|
| Réévaluer après réduction du coût dominant et lots de fraîcheur et de mémoire | lots 8 et 9 finis ; 16.16 suit 16.3 à 16.5 et 16.15 | ordre des cases |
| Simulation idle | pause à chaque événement, reprise après 1 s de silence | test sur double avec horloge injectée |
| Annulation au changement de sélection | jeton levé par `surSelection` | test : sélection pendant la prélecture, aucune promotion |
| Ressources bornées | une seule prélecture, aucun import, deux appels en vol, rétention 9.8 | compteurs 16.1 dans la trace de prélecture |
| Parité | le clic après prélecture rend l'affichage d'Actualiser | cas ajoutés à `paritesDeSession.test.ts` |
| Mesure A/B sans ralentissement des interactions | R16.3 : script de gestes (déplacer, taper un texte, changer de page) avec et sans prélecture ; plus longue tranche et part du fil occupé relevées | trace 16.1 et appréciation du mainteneur |
| Gain réel sur le temps total | clic au rendu, prélecture finie et non finie | R16.3 |

### Expériences Figma

| Code | Question | Protocole | Décide |
|---|---|---|---|
| E1 | Figma sert-il les imports en parallèle ? | Importer les 250 clés du Button avec 1, 4, 8, 16 et 32 en vol, trois fois chacune ; relever la durée totale | 16.10, 16.17 |
| E2 | L'import rend-il la copie du document ? | Pour les 183 clés : comparer identifiant et `valuesByMode` de `getVariableByIdAsync` et de l'import, et leurs durées ; refaire avec une mise à jour de library publiée non acceptée | 16.8 |
| E3 | Une attente d'API rend-elle la main à l'interface ? | L'iframe envoie un message toutes les 16 ms ; le sandbox enchaîne 300 `getVariableByIdAsync` sans `setTimeout` et note les messages reçus pendant la boucle | 16.11, 16.17 |
| E4 | Quels changements de liaison émettent un `nodechange` ? | Écouter la page et journaliser les propriétés reçues pour : variable de padding remplacée par une variable de même valeur, variable de remplissage remplacée, liaison retirée, mode explicite changé sur un variant, variable renommée, valeur de variable changée | 16.15 |
| E5 | L'acceptation d'une mise à jour de library émet-elle un `nodechange` sur les instances ? | Republier l'icône d'un maître distant du Button, accepter la mise à jour, journaliser les événements de la page | 16.4 (repli) |
| E6 | Combien de temps Figma garde-t-il la réponse de `teamLibrary` ? | Relire la liste des libraries 0, 5, 10, 20, 30 et 60 s après une lecture, trois séries ; relever la durée de chaque relecture | 16.5, 16.16 |

### Gains classés

Les économies de passes qui visent la même attente ne s'additionnent pas (R12).

Second clic sans changement :

| Case | Gain | Niveau de preuve |
|---|---|---|
| 16.3 et 16.4 ensemble | 6,5 à 9 s (moteur, familles de contrôles, corrections repris) | mesure L1 du second clic ; cause et couverture établies par le rejeu |
| 16.15 | de 3 à 4 s vers 0,3 à 1 s | estimation ; conditionnelle à E4 |

Première analyse :

| Case | Gain | Niveau de preuve |
|---|---|---|
| 16.8, 16.9, 16.10 (catalogue, ensemble) | 1,5 à 2,3 s | trace (19 s cumulées sur 250 imports) et rejeu (183 clés déjà lues) ; conditionnel à E1 et E2 |
| 16.11 cessions | 0,8 à 1,3 s | trace (276 cessions, 1,94 s) ; conditionnel à E3 |
| 16.12 mémoire de champs | 0,6 à 1,4 s | rejeu et banc (1,4 s de relectures estimées) ; précédent 6.12 |
| 16.7 dépendances projetées | 0,6 à 0,8 s | trace (étape `imbriques` 0,78 et 0,795 s) |
| 16.6 mémoire de ressources | 0,3 à 0,6 s | rejeu (420 `getMainComponentAsync` et 188 `getVariableByIdAsync` en double) et banc |
| 16.17 relevé concurrent | 0,3 à 1 s | hypothèse, conditionnelle à E1 et E3 |
| 16.13 horloge | 0,1 à 0,3 s | Node seulement |
| lot 13, contrôles et corrections dans un worker | 1,2 à 1,7 s | trace (contrôles 1,6 à 2,8 s, corrections 0,27 s) et facteur Node ; démarrage et copie de 0,8 Mo non mesurés |

Estimation d'ensemble : 16.6 à 16.13 ramènent la première analyse vers 7,5 à 9,5 s ; le worker vers 6 à 8 s.

### Borne basse de la première analyse

| Part | Plancher | Calcul |
|---|---|---|
| Lectures de propriétés | 1,4 s | couples distincts du rejeu au coût du banc |
| Appels d'API | 0,3 à 0,9 s | environ 1 000 appels distincts à 0,3 à 0,9 ms ; imports manquants recouverts |
| Calcul pur dans le sandbox | 2,6 à 4 s | 0,33 s sous Node, facteur 8 à 12 ; 1,3 à 1,6 s de moins avec le worker |
| Cessions | 0,4 à 0,7 s | temps occupé divisé par 50 ms, 7 ms par cession |
| Sujet et projection | 0,2 s | trace |

Plancher sans worker : 4,9 à 7,2 s. Avec le worker : 3,6 à 5,6 s. La cible de 5 s est donc à la limite pour une première analyse, même après tous les leviers, et hors d'atteinte pour le premier essai après l'ouverture du plugin. Le chemin qui tient 5 s perçues passe par la reprise validée (16.3, 16.4, 16.15) et la prélecture (16.16) : le clic ne paie plus que la validation.

### Doutes et limites

- Le résumé de la trace 9.9 indique 24 `getMainComponentAsync` dans l'étape `imbriques`. Le rejeu en compte 312 sur le même code. L'écart vient peut-être du compteur, qui ne compte que les appels passés par la mémoire du moteur. La trace 16.1 le tranchera.
- La mesure de 18 s, 30 s après la sélection, reste dans la dispersion observée (13,9 à 19,2 s). Seule la vérification des libraries (0,9 s, hors chemin critique) en est expliquée.
- Le facteur 8 à 12 entre Node et Figma vient des contrôles du kit. Le moteur, qui lit Figma en calculant, peut s'en écarter.
- Le coût d'un appel d'API séquentiel (0,3 à 0,9 ms) est déduit de `index` et du banc, pas mesuré par méthode. 16.1 le mesure.
- L'enregistrement des accès de 16.3 prouve la couverture sur la capture et le corpus de parité. Un composant qui ferait lire au moteur une autre région du document la ferait échouer : la case garde un refus pour tout nœud lu hors des régions couvertes.
- Les gains de 16.3, 16.4 et 16.15 portent sur le second clic et la prélecture. Ils ne réduisent pas la première analyse.
