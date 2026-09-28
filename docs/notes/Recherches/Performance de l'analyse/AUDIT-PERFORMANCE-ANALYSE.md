# Audit de la performance de l’analyse

Les réductions d’appels aux maîtres et de chargements de pages sont présentes.
Elles ne suffisent pas à conclure que l’analyse est plus rapide dans Figma.
Les balayages des règles, les parcours répétés des variants et la lecture du
dépôt restent coûteux par construction. Leur poids relatif est **non vérifié**.

## Périmètre et preuves

Le verdict par tâche porte sur `2666c8c`, après lecture des commits `97095bb`,
`66190c6`, `da3384e`, `4e29033` et `2666c8c`. Les références de lignes des
sections 1 à 4 désignent cette révision, même si le fichier courant a changé.
La section 5 décrit les corrections du code courant et leurs vérifications.

Autorités consultées : [conception](./CONCEPTION-PERFORMANCE-ANALYSE.md),
sections 2, 4 et 5 ; [plan](./PLAN-IMPLEMENTATION-PERFORMANCE-ANALYSE.md) ;
[SPEC.md](../../../../packages/plugin-exporter/SPEC.md), section 7 ;
[AGENTS.md](../../../../AGENTS.md), groupes Composition et Écriture dans le
document ; [CONTRIBUTING.md](../../../../CONTRIBUTING.md).

Les chemins abrégés se lisent ainsi :

- `src/…`, `tests/…` et `README.md` sont dans
  [packages/plugin-exporter](../../../../packages/plugin-exporter/README.md) ;
- `sondes/…` est dans le dossier de ce rapport ;
- `AGENTS.md` et `ROADMAP.md` sont à la racine du dépôt.

Les constats de code sont distingués des reproductions. Des montages Figma
génériques et le routeur réel, transpillé en mémoire avec ses dépendances
simulées, ont reproduit les résultats cités. Aucun contrat commité n’a servi
de preuve. Les tests rouges proposés décrivent les assertions à ajouter ; ils
ne constituent pas une déclaration de réussite de la suite courante.

Figma n’était pas disponible. Aucune durée de ce rapport n’est une mesure
Figma. Les sondes S1, S2, S5 et S6, les gains réels et le rendu de l’interface
dans Figma restent **non vérifiés**. Les passages historiques annoncés comme
« vus rouges » et les 2 078 tests de L8.1 n’ont pas été rejoués pour ce rapport.

## 1. Verdict par tâche cochée

« Conforme » qualifie l’implémentation observable de la tâche. Il ne valide
pas une mesure Figma ni une exécution historique de tests.

### Trace et sondes

| Tâche | Verdict | Preuve et limite |
|---|---|---|
| L0.1 | Conforme à son commit, remplacée par L8 | `97095bb:src/contract/mesure.ts` contient les gardes et l’impression. Dans `2666c8c`, `src/contract/mesure.ts:62`, `:85`, `:108`, `:149` ouvrent, découpent, comptent et ferment ; l’impression appartient au routeur. |
| L0.2 | Conforme à son commit, retirée par L8 | `97095bb:package.json:8` définit les deux builds ; `src/build.d.ts:8` déclare la constante. Leur retrait est demandé par L8.2. L’absence de la chaîne dans un bundle historique n’est pas revérifiée. |
| L0.3 | Conforme aux points demandés | `src/contract/exportableNodes.ts:135` compte les parcours ; `src/contract/composedComponents.ts:283`, `:342`, `:350` comptent index et pages. Ces compteurs ne couvrent pas tous les parcours du plugin. |
| L0.4 | Conforme pour les scénarios présents | Tests du commit `97095bb`, puis `tests/mesure.test.ts:38`, `:53`, `:102` après L8. Les mutations historiques restent non vérifiées. |
| L0.5 | Écart | Les quatre sondes existent. S2 ne rejoue pas exactement le calcul de L2 : `sondes/S2-prechauffage.js:75`, `:77`, `:91`. Voir section 3. |
| L0.6 | Conforme pour l’accès à la trace ; écart sur l’annulation | `README.md:156` décrit le build courant et la copie. La promesse de `README.md:179` est fausse pour une annulation pendant le dépôt, voir B6. |

### Portée, index et respirations

| Tâche | Verdict | Preuve et limite |
|---|---|---|
| L1.1 | Bug | La mémoire par id et le refus d’ouverture existent, `src/contract/porteeDAnalyse.ts:46`, `:78`. La portée refusée emprunte toutefois la respiration de la portée ouverte, `:109` ; B8. |
| L1.2 | Conforme aux remplacements ; réserve sur les nodes supprimés | La portée englobe l’export, `src/contract/exportComponent.ts:232`, avec fermeture dans `porteeDAnalyse.ts:65`. Les cinq sites utilisent `maitreDe` : `composedComponents.ts:402`, `:528`, `componentTree.ts:336`, `layoutNodes.ts:88`, `extractLayout.ts:209`. La protection de lecture du parent dans `instanceOwnerId` a disparu ; B5. |
| L1.3 | Conforme pour un document simulé stable | `tests/aides/parite.ts:22` réexporte sans mémoire de maîtres ; `tests/aides/figmaFaux.ts:62` appelle le banc. Le second passage conserve la mémoire de pages : ce banc ne prouve pas la parité de L2 à froid et à chaud. |
| L1.4 | Conforme | `tests/paritePerformance.test.ts:102` vérifie seize ids d’instance et un appel par id, sur huit variants. |
| L1.5 | Conforme pour les racines de composant utilisées | `src/contract/exportableNodes.ts:209` filtre les instances et remonte les ancêtres. Les cas de visibilité et le repli sont dans `tests/exportableNodes.test.ts:168` à `:199`. |
| L2.1 | Conforme | `src/contract/composedComponents.ts:120` pose le drapeau ; `:130` le restaure dans `finally`, sans attente. |
| L2.2 | Conforme dans sa borne textuelle | `tests/loiDuDocumentIntact.test.ts:211` contrôle les deux fichiers. La loi examine la première pose et la première restauration, pas le graphe d’appels. Les fonctions appelées dans ces blocs sont synchrones. |
| L2.3 | Bugs | L’index suit les pages des maîtres, mais ne parcourt que le premier maître de chaque propriétaire, `src/contract/composedComponents.ts:252`. La composition réadmet un distant homonyme, `:414`. Un parent illisible lève avant `pageDe`, `:252` ; B3, B4, B5. |
| L2.4 | Bugs | La file attend bien le calcul précédent, y compris après échec, `src/contract/composedComponents.ts:230`. Elle ne reprend pas les pages salies pendant le calcul courant. Un balayage en échec peut laisser une entrée propre, `:348`. Les écoutes ne sont pas retirées lors de l’oubli global, `:381` ; B1, B2, B9. |
| L2.5 | Conforme | Garde et priorité dans `src/contract/exportComponent.ts:320` ; `pagesReutilisees` dans `src/contract/composedComponents.ts:335`. |
| L2.6 | Écart de couverture | Les tests couvrent D1, D4, chargement, mémoire, refus d’abonnement et concurrence simple. `tests/composedComponents.test.ts:379` salit entre deux calculs ; `:455` lance deux appels sans retouche intermédiaire. Ils ne couvrent pas B1 à B5 et B9. |
| L2.7 | Conforme | `tests/loiDuDocumentIntact.test.ts:247` refuse `loadAllPagesAsync` dans le moteur. Aucun appel actif n’y a été trouvé. |
| L4.1 | Conforme au mécanisme ; écart sur la borne annoncée | Seuil de 30 ms dans `src/contract/porteeDAnalyse.ts:29`, vérifié en `:109`. `src/code.ts:637` rend la main puis vérifie l’annulation. Ce seuil n’est pas un délai maximal garanti. |
| L4.2 | Conforme aux trois sites demandés | Index `src/contract/composedComponents.ts:338`, tranches de composition `:658`, variants de structure `src/contract/extractStructure.ts:263`. |
| L4.3 | Écart de preuve | `tests/paritePerformance.test.ts:128`, `:163`, `:214` couvrent annulation, parité avec/sans respiration et absence d’effet hors portée. Les deux exports du test de parité utilisent les tranches de seize : il ne compare pas avec un relevé sans tranches. `tests/code.test.ts:214` couvre l’arrêt sans publication. |

### Mesure courante, interface et documents

| Tâche | Verdict | Preuve et limite |
|---|---|---|
| L8.1 | Écart de preuve, non vérifié | Le plan annonce une suite, un typecheck et un bundle sur `dc30dd0`. Le code ne prouve ni leur exécution historique ni le bundle réellement chargé par Figma. |
| L8.2 | Bug | Ouverture au clic et étape dépôt présentes, `src/code.ts:718`, `:794`. La fermeture dépend seulement de `analyseProduite`, `:844` : une annulation après le moteur envoie une trace ; B6. |
| L8.3 | Écarts | Boucles instrumentées et tokens sans barre. `src/code.ts:637` envoie avant de vérifier l’annulation ; B7. Les annonces précèdent `etape`, par exemple `src/contract/exportComponent.ts:298`. La clé `src/code.ts:660` autorise un message à chaque changement de compte, même dans le même point de pourcentage. |
| L8.4 | Conforme dans le code ; rendu Figma non vérifié | Barre de 3 px, `src/ui/styles.css:300` ; éléments masqués à l’assistance technique, `src/ui/components/CarteCommande.ts:87`, `:92` ; détail et copie, `src/ui/components/PiedDePage.ts:54`, `:85`. Les états existent dans `galerie/etats.cjs:639`, `:656`, `:660`. |
| L8.5 | Écart de couverture | `tests/mesure.test.ts:70`, `tests/paritePerformance.test.ts:189` et `tests/code.test.ts:251` couvrent le cas nominal. L’annulation de `tests/code.test.ts:279` intervient avant le contrat ; elle ne justifie pas de retirer la garde de trace pendant le réseau. |
| L7.1 | Conforme | Les modules figurent dans `AGENTS.md:70` et `:71`. La fragilité des trois résolutions a été retirée de la ROADMAP. |
| L7.2 | Écart partiel | D1 et D4 sont décrits dans `AGENTS.md:497` et `SPEC.md:408`. `ROADMAP.md:40` annonce encore une détection sur toutes les pages ; `src/contract/extractRules.ts:454` décrit encore l’ancien périmètre. Le critère de conteneur est dupliqué ; section 3. |
| L7.3 | Écart | Les commentaires ont changé, mais `src/code.ts:614` promet un arrêt après au plus le budget et un appel Figma. Les points de respiration ne garantissent pas cette borne. |

Les tâches non cochées M0, L2.8, L2.9, L3, M1, L5, L8.6 et L7.4 ne sont pas
tenues pour réalisées. L’absence de repli S6 est explicitement laissée ouverte
par L2.8 ; son besoin réel reste non vérifié.

## 2. Bugs classés par gravité

Les identifiants B1 à B10 servent à relier scénarios, tests et suivi. Les noms
A et B désignent des composants fabriqués pour le test, sans lien avec le
corpus de recette.

### Priorité 1 : données périmées ou règles attribuées au mauvais composant

**B10. La création peut documenter un autre composant que sa cible.**

- Scénario : lancer la création sur A, attendre la résolution des sources,
  puis sélectionner B avant le démarrage du moteur.
- Observé sur le routeur simulé : le modèle conserve le nom de A mais contient
  une valeur de propriété de B. Le composant capturé en
  `src/code.ts:1047` reste la cible de l’écriture ; le moteur appelé en
  `:1060` relit la sélection en `src/contract/exportComponent.ts:236`.
- Attendu : cible, contrat, modèle et page invalidée appartiennent tous à A.
  `src/code.ts:1075` invalide actuellement la page courante, qui peut avoir
  changé elle aussi.
- Test rouge proposé : différer la résolution des sources, sélectionner B,
  reprendre, puis vérifier que le modèle contient les valeurs de A. Rejouer
  avec B sur une autre page. Le test existant `tests/code.test.ts:1467` ne
  change la sélection qu’une fois l’écriture commencée.

Ce défaut appartient au chemin de création existant. Son introduction n’est
pas attribuée aux lots de performance.

**B1. Un balayage en échec peut rendre propre une ancienne entrée.**

- Scénario : indexer une page, modifier ses règles, émettre `nodechange`,
  faire lever son balayage, puis relancer l’analyse.
- Observé en mémoire : le premier recalcul lève ; le suivant rend les anciens
  noms. `src/contract/composedComponents.ts:348` pose `sale = false` avant
  l’affectation de `noms`, qui peut lever. L’entrée déjà rangée conserve son
  ancien ensemble ; la garde `:334` le réutilise.
- Attendu : l’entrée ne devient propre qu’après un balayage réussi.
- Test rouge proposé : faire lever une fois `findAllWithCriteria` après
  modification du texte, puis exiger les nouveaux noms à l’appel suivant.

**B2. Une page salie pendant un calcul reste dans son résultat.**

- Scénario : analyser des dépendances sur deux pages ; après lecture de la
  première, supprimer ses règles pendant le chargement de la seconde.
- Observé en mémoire : le premier résultat contient les deux dépendances ;
  l’appel suivant n’en contient plus qu’une. `nomsParPage` conserve la première
  lecture, `src/contract/composedComponents.ts:245`, `:265`. L’événement ne
  modifie que l’entrée de session, `:359` ; aucun contrôle ne précède `:284`.
- Attendu : reprendre le calcul ou l’arrêter avant de rendre un index périmé.
- Test rouge proposé : modifier la première page et appeler son écouteur
  pendant le `loadAsync` différé de la seconde. Exiger un résultat actualisé
  ou une annulation. Couvrir aussi une première page réutilisée du cache.

**B3. Un distant homonyme d’un local devient une dépendance contractée.**

- Scénario : le parent contient un maître local documenté et un maître de
  bibliothèque portant le même nom compacté.
- Observé en mémoire : deux entrées dans `composes`, au lieu de la seule
  occurrence locale. L’index écarte le distant en
  `src/contract/composedComponents.ts:261`, mais `contractedOwner` le réadmet
  par son nom en `:414`. Le test de frontière de `indexMasterInstances:546`
  a la même limite.
- Attendu : décrire les calques du distant, conformément à D1 et
  `SPEC.md:414`. La concession de la conception sur les homonymes locaux
  n’autorise pas une dépendance de bibliothèque.
- Test rouge proposé : construire les deux propriétaires homonymes, exécuter
  index et composition, puis vérifier que le distant reste parcourable et
  reçoit le traitement d’un imbriqué sans règles.

### Priorité 2 : relevés incomplets, arrêts et retours périmés

**B4. Un seul maître est parcouru par propriétaire.**

- Scénario : deux variants d’une dépendance sont rencontrés. Seul le second
  porte une instance masquée d’une autre dépendance contractée. Cette instance
  est nécessaire au relevé des défauts du maître, même masquée.
- Observé en mémoire : inverser l’ordre des occurrences change l’index.
  `juges` dédoublonne le propriétaire en
  `src/contract/composedComponents.ts:252`, avant le parcours du maître en
  `:276`. `indexMasterInstances:522` parcourt pourtant chacun des maîtres
  retenus par la composition ; une frontière manquée devient un défaut interne.
- Attendu : juger un propriétaire une fois, mais parcourir tous ses maîtres
  distincts rencontrés.
- Test rouge proposé : deux maîtres du même propriétaire, une dépendance
  masquée seulement dans le second ; exiger le même index dans les deux ordres
  et l’absence de cette frontière dans les défauts internes.

**B5. Le parent d’un maître supprimé est lu avant la garde.**

- Scénario : la résolution rend un handle de maître dont la lecture de
  `parent` lève, par exemple après suppression.
- Observé en mémoire : l’index lève dans `componentOwner`, avant `pageDe`.
  Preuves : `src/contract/composedComponents.ts:252`, `:468`, contre la garde
  de `:311`. `src/contract/layoutNodes.ts:88` lit aussi le parent sans le
  `try` qui entourait cette lecture avant L1.
- Attendu : appliquer le traitement du maître inaccessible, avec son
  diagnostic existant, plutôt que propager l’erreur brute. Un échec de
  chargement de page doit en revanche continuer à arrêter l’analyse.
- Test rouge proposé : rendre un maître muni d’un getter `parent` qui lève ;
  vérifier index, composition et élection du layout. Le comportement exact
  des handles supprimés dans Figma reste non vérifié.

**B6. Une analyse annulée pendant le dépôt affiche quand même sa trace.**

- Scénario : le moteur finit, la lecture du dépôt attend, puis la sélection
  ou la destination change.
- Observé sur le routeur simulé : aucun verdict, mais un message `mesure`.
  Le contrôle après réseau est correct, `src/code.ts:800`. Cependant
  `analyseProduite` est déjà affectée en `:775` et suffit à fermer puis envoyer
  la trace en `:844`. L’interface l’accepte sans provenance,
  `src/ui/index.ts:221`.
- Attendu : jeter la trace annulée et conserver celle de l’analyse précédente.
- Test rouge proposé : différer `lireAvantEcriture`, changer sélection ou
  réglages, reprendre ; exiger zéro verdict, téléchargement et trace. Ajouter
  le même cas pendant la seconde lecture de configuration en `src/code.ts:782`.

**B7. Une respiration envoie un avancement après annulation.**

- Scénario : un changement de sélection a déjà posé l’annulation pendant une
  attente ; le moteur atteint ensuite une respiration.
- Observé sur le routeur simulé : un message `avancement` part avant l’arrêt.
  `src/code.ts:637` appelle `signalerAvancement` avant le contrôle différé.
  Le filtrage de `src/ui/index.ts:115` connaît opération et destination, pas
  l’identité de la sélection.
- Attendu : vérifier l’annulation avant l’envoi, puis de nouveau après avoir
  rendu la main.
- Test rouge proposé : poser l’annulation avant `respirer`, puis exiger
  l’absence de nouveaux messages de progression.

**B8. Une portée refusée emprunte l’annulation d’une autre portée.**

- Scénario : ouvrir A avec une respiration annulante ; ouvrir B sans
  respiration pendant A ; dans B, appeler `respirerSiBesoin` après le budget.
- Observé en mémoire : B appelle la respiration de A et reçoit son exception.
  Le compteur de refus désactive les maîtres mémorisés,
  `src/contract/porteeDAnalyse.ts:79`, mais pas la respiration en `:109`.
- Attendu : le corps refusé n’emprunte ni cache ni contexte d’annulation. Le
  refus doit rester isolé si A finit avant B et qu’une troisième portée arrive.
- Test rouge proposé : imbriquer les deux corps avec une horloge contrôlée,
  puis couvrir le chevauchement de leurs fins.

Le routeur interdit déjà la concurrence entre analyse et création. Ce défaut
du module de portée n’établit donc pas un incident accessible par ces deux
boutons ; `src/code.ts:711`, `:1038` et `tests/code.test.ts:1426` le bornent.

### Priorité 3 : durée de vie des écoutes

**B9. L’oubli global et certains échecs laissent des écoutes orphelines.**

- Scénario : indexer, appeler `oublierLIndexDuDocument`, puis réindexer la même
  page ; ou faire échouer son premier balayage après l’abonnement.
- Observé en mémoire pour le reset : deux écoutes restent enregistrées.
  `src/contract/composedComponents.ts:359` utilise une fonction anonyme ;
  `:381` remplace seulement la carte. Un premier scan qui lève après `:345`
  laisse aussi une écoute sans entrée rangée.
- Attendu : conserver le callback et le retirer quand l’entrée est abandonnée.
- Test rouge proposé : compter les abonnements actifs après reset et après
  échec initial ; exiger zéro, puis un après réindexation réussie.

Une écoute par page pendant la session est normale. L’oubli global sert aux
tests dans ce code. Ce constat ne prouve pas une accumulation à chaque
analyse ni la cause du ralentissement constaté dans Figma.

## 3. Écarts de conception et pistes écartées

### Le budget ne borne pas le délai d’arrêt

Les 30 ms de `src/contract/porteeDAnalyse.ts:29` sont un seuil observé aux
points de respiration. Entre ces points, le code peut parcourir un variant
entier, résoudre plusieurs maîtres ou construire leurs surfaces.
`src/contract/composedComponents.ts:246`, `:248`, `:684`, `:691` et
`src/contract/extractStructure.ts:189`, `:205`, `:269` montrent ces blocs.

Une annulation réseau attend aussi la fin de `lireAvantEcriture` en
`src/code.ts:799`, qui peut enchaîner plusieurs requêtes. La promesse de
`src/code.ts:614` et du résultat attendu du plan est donc trop forte. Tester
un budget expiré aux points existants ne prouve pas une latence maximale.

### La sonde S2 ne représente pas le calcul testé

`sondes/S2-prechauffage.js:76` relève toutes les instances, sans le filtre de
visibilité rendable du moteur. `:77` résout les maîtres séquentiellement ; le
moteur utilise `Promise.all` et la portée. `:91` respire systématiquement
avant une page. `:55` teste le marqueur sans sa normalisation Unicode ni sa
comparaison insensible à la casse.

Le seuil du battement existe, mais son résultat ne suffit pas à autoriser L3
pour un autre parcours. Un test de sonde doit comparer les pages et
propriétaires rencontrés à ceux du moteur sur les mêmes montages. La sonde
doit ensuite être exécutée dans Figma selon son protocole.

### Autorité du critère de règles et documentation

`AGENTS.md:497` désigne `rulesContainerOwner` comme critère unique. Dans la
révision auditée, `src/contract/composedComponents.ts:165` applique lui-même
le marqueur et la compaction au lieu d’appeler cette fonction. Le critère est
dupliqué, même si les cas simples rendent le même résultat.

`src/contract/extractRules.ts:454` décrit encore un index couvrant le document
entier. `ROADMAP.md:40` parle de toutes les pages. Ces textes doivent suivre
le périmètre de `SPEC.md:408`. L2.9 identifie déjà le diagnostic local devenu
imprécis quand les règles existent sur une autre page ; sa rédaction reste
soumise au choix du mainteneur.

### Points vérifiés sans bug établi

- **D1, règles sur une autre page :** l’absence de reconnaissance est voulue.
  Ce cas ne justifie pas de rétablir le balayage de tout le document.
- **Drapeau des instances invisibles :** les blocs de
  `src/contract/composedComponents.ts:120` et `src/template/sources.ts:93`
  restaurent leur valeur sans `await`. Aucun chevauchement asynchrone du
  drapeau n’a été trouvé. `extractRules` doit continuer à pouvoir lire les
  calques masqués qui portent la politique des icônes.
- **Promesse rejetée mémorisée :** `src/contract/porteeDAnalyse.ts:96`
  transforme le rejet en `null` avant stockage. Le `null` est gardé pour
  l’analyse, conformément à la conception ; la portée suivante retente.
  Une panne transitoire qui disparaîtrait entre deux appels n’est pas couverte
  par la preuve de parité statique.
- **Ids partagés entre variants :** aucune réutilisation réelle n’a été
  démontrée. Les déclarations locales de l’API Figma indiquent l’unicité des
  ids dans le document, `node_modules/@figma/plugin-typings/plugin-api.d.ts:419`.
  Des mocks attribuant le même id à deux instances distinctes ne suffisent
  pas à établir un bug Figma.
- **Création pendant analyse :** refusée avant l’appel au moteur par
  `src/code.ts:1038`. B10 porte sur un changement de sélection pendant la
  préparation d’une création, pas sur deux opérations simultanées.
- **Trace laissée ouverte :** le `finally` ferme ou abandonne la trace sur
  les sorties ordinaires du moteur et du dépôt. Aucun cas reproductible de
  fuite de trace ouverte n’a été établi. B6 est une trace indûment envoyée.
- **Parité :** les tests comparent les octets hors date sur un document
  simulé stable. Ils ne garantissent pas une vue figée pendant des retouches
  du document ni pendant des erreurs intermittentes de l’API.

## 4. Optimisations classées par gain attendu

Ce classement est une hypothèse de travail issue des parcours. Le gain en
temps reste non vérifié. Sur un dépôt lent, le réseau peut passer au premier
rang ; sur un composant sans dépôt, ce coût est absent.

Notations : V variants, N descendants d’une racine, P pages examinées,
T textes rendus par une recherche native, K calques de nom pertinents,
h profondeur de remontée. Les nombres de nodes visités à l’intérieur de
l’implémentation native Figma ne sont pas connus.

### 1. Les règles de la page active

**Mécanisme et coût.** `src/contract/extractRules.ts:436` et `:444` font deux
`findAllWithCriteria` sur toute la page : textes, puis instances et composants.
Le JavaScript filtre T textes, remonte jusqu’à h ancêtres pour chacun des K
calques de nom, puis filtre le second résultat. Les lectures des conteneurs
ajoutent des fouilles de sous-arbres. Le drapeau reste à sa valeur normale :
les calques masqués d’instance peuvent participer à ces recherches.

`src/code.ts:437` lit les règles à la sélection ;
`src/contract/exportComponent.ts:242` les relit à l’analyse. À l’ouverture,
le parcours des sources terminé relance aussi le relevé de sélection,
`src/code.ts:1170`. L1 et L2 ne retirent aucun de ces deux balayages par appel.

**Mesure.** L’étape `regles` mesure l’appel du moteur, mais le compteur
`appelsFindAllWithCriteria` ne compte pas ces deux appels dans `2666c8c`.
Ajouter un compte et une durée propres au relevé, y compris hors analyse.

**Correctif proposé.** Partager un relevé de candidats par page et révision
de page, puis réutiliser les règles de la sélection tant qu’elles sont
valides. L5.2 reste conditionné à la mesure.

**Risque sur le contrat.** Élevé si les règles ou les calques masqués sont
écartés. Ne pas poser globalement `skipInvisibleInstanceChildren` autour de
`extractRules` : la politique d’icône peut changer.

### 2. Les parcours répétés des mêmes variants

**Mécanisme et coût.** Pour un export avec instances, index, composition et
relevé des imbriqués parcourent chacun les variants :
`src/contract/composedComponents.ts:246`, `:577` et
`src/contract/imbriques.ts:220`. Cela représente déjà trois séries de
`getAllNodes`, avant les élections et extractions supplémentaires.

`getAllNodes` appelle `findAll` avant de filtrer les descendants,
`src/contract/exportableNodes.ts:138`. Une dépendance élaguée peut donc avoir
déjà coûté un parcours natif. Le volume cumulé est la somme des N relus pour
chaque appel, pas le nombre de nodes distincts du composant.

La piste selon laquelle `contientUneInstanceRendue` ferait encore un
`getAllNodes` est réfutée : `src/contract/exportableNodes.ts:209` utilise un
filtre d’instances. Ce filtre peut toutefois être appelé sur plusieurs
variants avant de trouver la première instance rendue.

**Mesure.** `appelsGetAllNodes` et `nodesParcourus` révèlent les répétitions.
Ils comptent les descendants rendus par `findAll`, sans donner le temps propre
du parcours. Ajouter une attribution par étape ou une durée de parcours.

**Correctif proposé.** Un relevé brut par racine dans la portée, puis des
projections adaptées à chaque lecteur. Le découpage en tranches de
sous-arbres attend la vérification S5 prévue par L5.1.

**Risque sur le contrat.** Élevé si l’on mémorise une sortie déjà filtrée avec
un autre `composed`, si l’ordre change ou si des diagnostics disparaissent.
Conserver les comparaisons d’octets et de diagnostics, hors date.

### 3. La lecture du dépôt après le moteur

**Mécanisme et coût.** `src/depot.ts:491` lit la configuration, puis `:494`
l’artefact. Un contenu identique sur la base s’arrête après ces deux appels
au port de forge. Sinon, `exportsEnVol:428` liste les demandes et lit les
branches d’export l’une après l’autre.

Pour C demandes d’export de composants, le chemin sans retour anticipé
effectue 3 + C appels au port. Il ajoute un appel si les tokens sont sur la
base ; sinon deux appels et une lecture par demande d’export de tokens,
`src/depot.ts:475`. La pagination de `demandesOuvertes` peut multiplier les
requêtes HTTP : `src/forges/github.ts:139`, `src/forges/gitlab.ts:115`.

**Mesure.** L’étape `depot` de L8 permet de séparer ce délai du moteur.
Aucun compteur de requêtes dédié n’existe dans cette révision.

**Correctif proposé.** Partager la liste des demandes au sein d’un pré-vol,
paralléliser les lectures indépendantes avec une limite et vérifier
l’annulation entre les requêtes. Mesurer avant de modifier leur ordonnance.

**Risque sur le contrat.** Le contenu généré ne doit pas changer. Le risque
porte sur les collisions et le verdict : conserver les contrôles ainsi que
la relecture précédant la publication, `src/depot.ts:562`.

### 4. La recherche des sources à l’ouverture

**Mécanisme et coût.** `src/template/sources.ts:137` examine d’abord la page
active, puis charge les autres jusqu’à la première source. Sans source, le
maximum est P − 1 appels `loadAsync` et un ou deux appels de recherche native
par page, `:99`, `:101`, `:150`.

Le parcours part dès `ui-ready`, `src/code.ts:1170`. Il peut donc charger des
pages que L2 aurait évitées. Mais il se suspend avant le chargement et avant
le balayage pendant une opération, `src/template/sources.ts:148`, `:154` et
`src/code.ts:527`. La proposition « il annule nécessairement le gain de L2
pendant toute analyse » est réfutée. Un chargement déjà en vol reste possible.

**Mesure.** Ni ses chargements ni ses recherches ne sont comptés par les
compteurs de L8. Instrumenter séparément ouverture, attente et recherche des
sources ; ne pas attribuer leur activité au moteur par un compteur global.

**Correctif proposé.** Exploiter d’abord le relevé de la page active ; éviter
sa relecture immédiate ; envisager une recherche du document à la demande
pour la création. Ce dernier choix touche l’offre affichée et doit être validé.

**Risque sur le contrat.** Faible si le moteur reste indépendant ; risque sur
la disponibilité et la cible de création. Couvrir B10 avant toute évolution.

### 5. Le balayage d’une grosse page de maîtres

**Mécanisme et coût.** Une page sale ou non écoutée coûte un chargement si
l’API est disponible et un `findAllWithCriteria` de textes,
`src/contract/composedComponents.ts:340`, `:142`. Le traitement JavaScript
filtre T textes puis remonte les K calques pertinents. Le coût de ces
remontées est de l’ordre de K × h. D4 écarte les sous-calques masqués
d’instance, mais ne rend pas petite une grande page visible.

**Mesure.** Comparer `pagesChargees`, `pagesBalayees`, `pagesReutilisees` et
`appelsFindAllWithCriteria`. `nodesParcourus` ne compte pas cette recherche.
Un compteur de textes examinés et une durée par page préciseraient le coût.

**Correctif proposé.** Fiabiliser d’abord l’invalidation B1 et B2. Une
invalidation plus fine que toute modification de la page ne se justifie
qu’après mesure et vérification des événements réellement reçus.

**Risque sur le contrat.** Élevé si une retouche de règle ne salit plus le
relevé. Le succès de `page.on` ne prouve pas les cas distants de la sonde S1.

### 6. Les défauts des maîtres et leurs surfaces publiques

**Mécanisme et coût.** `src/contract/composedComponents.ts:684` calcule un
relevé par maître distinct. `masterInstances:434` parcourt tous ses enfants,
puis `indexMasterInstances:527` résout les instances avant d’appliquer les
frontières. Le parcours n’est donc pas limité aux seules branches conservées.

Par propriétaire, `indexDependencyPropertySurfaces:479` relève le variant
représentatif puis cherche son wrapper, `:497`, `:498`. Ces deux fonctions
refont des parcours. L1 économise les résolutions de maîtres communes ; il
n’économise pas ces lectures d’arbre.

**Mesure.** `maitresReutilises` et `appelsGetMainComponentAsync` quantifient la
résolution. `appelsGetAllNodes` couvre une partie des surfaces, mais pas le
parcours par `children` de `masterInstances`. Ajouter un compteur de nodes
et de relevés de maîtres avant de conclure.

**Correctif proposé.** Mutualiser les relevés bruts dans la portée et éviter
les descentes inutiles une fois les frontières connues.

**Risque sur le contrat.** Élevé pour les échantillons de remplacement et les
propriétés héritées du wrapper. Les instances masquées des maîtres ont un
usage réel ; B4 montre pourquoi on ne peut pas simplement les supprimer.

## 5. État des corrections dans la révision courante

Les constats des sections 1 à 4 décrivent la révision auditée. Le tableau
ci-dessous donne leur état dans le code courant. Les tests utilisent des
documents simulés ; les évolutions L9 et les gains dans Figma restent hors
de cette vérification.

| Constat | État courant et preuve |
|---|---|
| B1 | L’entrée devient propre après réussite ; l’échec la salit dans `nomsGardesDeLaPage`. Couvert par `tests/composedComponents.test.ts`. |
| B2 | Reprise bornée à deux essais et contrôle des entrées consultées dans `indexContractedNames`. Un reset invalide le calcul. Le routeur traite `IndexModifie` comme un arrêt, avec une consigne de relance, sans contrat ni trace. Tests dans `tests/composedComponents.test.ts` et `tests/code.test.ts`. |
| B3 | Composition, défauts de maîtres et relevé des imbriqués utilisent `estContracte`. Le distant homonyme garde son diagnostic ; `tests/imbriques.test.ts` vérifie le relevé et ses ids d’instance. |
| B4 | `calculerLIndex` distingue les ids des maîtres des propriétaires déjà jugés. Couvert par `tests/composedComponents.test.ts`. |
| B5 | Les lectures du parent sont protégées dans `componentOwner`, `instanceOwnerId` et `porteurDuMaitre`. Un maître illisible laisse le variant sans wrapper avec son diagnostic ; ses propriétés restent sans porteur. Tests dans `tests/layoutNodes.test.ts` et `tests/imbriques.test.ts`. |
| B6 | Le routeur écarte le contrat produit lors d’une annulation. Les tests diffèrent la lecture du dépôt et celle de la configuration : aucun verdict, téléchargement ou nouvelle trace ne sort. La trace précédente est conservée. |
| B7 | `respirer` vérifie l’annulation avant l’avancement, puis après avoir rendu la main. `tests/code.test.ts` vérifie l’absence de progression après une annulation déjà reçue. |
| B8 | Le compteur global de refus persiste jusqu’à la fin des corps refusés et inhibe les respirations. Couvert par `tests/porteeDAnalyse.test.ts`. |
| B9 | Retrait des écoutes dans `oublierLIndexDuDocument` et à l’échec initial. Couvert par `tests/composedComponents.test.ts`. |
| B10 | La création transmet explicitement le composant et sa page à l’export, puis invalide cette page et y revient pour montrer les règles. Les tests du routeur changent la sélection et la page pendant la résolution. `tests/exportComponent.test.ts` vérifie que le moteur conserve les règles de la page capturée. |
| Critère du conteneur | Le balayage de page dans `composedComponents.ts` appelle `rulesContainerOwner`. |

**Sonde S2.** La source importe désormais `indexContractedNames` et la portée
du moteur. Elle ne recopie plus les critères de visibilité, de marqueur ou de
résolution. Construire le script autonome avec
`npm run sonde:s2 --workspace ucm-exporter-plugin`, puis coller
`packages/plugin-exporter/dist/S2-prechauffage.js` dans la console Figma.
`tests/sondePerformance.test.ts` compare les dépendances de la sonde à celles
du moteur sur un document contenant un calque masqué et un distant homonyme.
Il vérifie aussi le retrait des écoutes après la mesure.

**Vérifications.** `npm test`, `npm run typecheck` et `npm run build` passent.
Le test de S2 et la construction de son script passent également. La borne
d’annulation est corrigée dans le code et le plan ; la ROADMAP décrit les
pages des maîtres locaux. Aucune mesure de durée dans Figma n’a été réalisée.

**Budget courant.** `src/contract/porteeDAnalyse.ts:28` vaut désormais 200 ms.
Les 30 ms du verdict L4 décrivent donc seulement la révision auditée. Cette
valeur reste un seuil entre points de respiration, sans garantie de délai
maximal. Les nouveaux compteurs de silence et de respiration n’établissent
pas à eux seuls une accélération ; toute durée rapportée depuis Figma doit
être accompagnée de sa trace et de son protocole.

## 6. Mesures et optimisations restantes

1. **Compléter l’attribution des coûts.** Compter séparément les règles, les
   sources, les parcours de maîtres et le réseau. `msGetAllNodes` mesure déjà
   la durée cumulée des parcours ; ce compteur ne couvre pas ces autres coûts.
2. **Exécuter les sondes dans Figma.** S1 et S6 restent nécessaires pour
   valider les hypothèses sur les événements et les pages. La nouvelle S2
   doit être jouée à froid avant de décider le préchauffage.
3. **Mesurer les coûts dominants avant L3 ou L5.** Relever à froid, à chaud et
   après retouche les étapes et compteurs sur le même corpus jetable. Choisir
   l’optimisation d’après ces traces, puis comparer les contrats générés hors
   date.

Le constat du mainteneur est compatible avec le code : L1 réduit des appels
répétés, L2 limite les pages de l’index, L4 ajoute des occasions de rendre la
main et L8 expose la mesure. Aucun de ces lots ne supprime les deux balayages
des règles, les multiples relevés de variants ou la lecture du dépôt. La
cause dominante de l’absence de gain perçu reste non vérifiée.
