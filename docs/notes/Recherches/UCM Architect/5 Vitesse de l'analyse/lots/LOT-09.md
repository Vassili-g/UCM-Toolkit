# Lot 9 : réutilisation avec invalidation large et rétention bornée

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **9.1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : séparer faits et requêtes retenus de l'état affiché ; test que réponses et cases ne reviennent pas d'une génération antérieure. Résultat : `session.ts` du socle (une entrée par sujet : sorties, requêtes avec leurs entrées, suivi), remplie par `analyser` à la fin d'une analyse complète, section « Session (9.1) ».
- [x] **9.2 | gpt-6.1-sol | high** | **Claude Sonnet | high** : préparer une révision de travail et promouvoir seulement après lecture, calcul et identité valides ; tests de fins annulée, arrêtée et périmée. Résultat : `revisions.ts` du socle ; `analyser` ouvre une révision à l'identité connue et ne la promeut qu'à une fin `complete` valide, section « Révision de travail (9.2) ».
- [x] **9.3 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : retenir les invalidations et retenter les lectures refusées ou partielles ; test échec puis disponibilité. Résultat : marques d'invalidation dans la session, `invalidations.ts` du socle et `etatDeLEntree(sujet)` d'Architect, section « Invalidations retenues (9.3) ».
- [x] **9.4 | gpt-6.1-sol | high** | **Claude Opus | high** : valider ressources et ensembles avant réutilisation d'un sujet ; test de modification sans notification couvrante. Résultat : `validation.ts` du socle (`egalesExactement`), lecteur `dependances` et `validerLEntree` d'Architect ; une demande Analyser reprend le moteur retenu seulement sur `valide`, section « Validation avant réutilisation (9.4) ».
- [x] **9.5 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : appliquer d'abord l'invalidation du sujet entier ; parité avec reconstruction après mutation locale et globale. Résultat : maîtres locaux suivis et définitions de styles relues dans la validation (le refus `non-couvert` ne vise plus que le maître distant ou hors page écoutée, le maître qui contient des instances et le style illisible), tout refus ou invalidation jette l'entrée entière, banc `paritesDeSession.test.ts` ; section « Invalidation du sujet entier et parité (9.5) ».
- [x] **9.6 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : réutiliser seulement les requêtes pures dont les entrées revalidées sont égales ; compter celles qui ne rejouent pas. Résultat : `creerLesRequetes` (`sandbox/analyse.ts`) reprend `controles`, `corrections` ou `projection` d'une entrée `valide` quand toutes leurs entrées égalent les valeurs actuelles (`egalesExactement`) ; compteurs `requetesNonRejouees` et `requetesRejouees`, section « Requêtes pures (9.6) ».
- [x] **9.7 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : reconstruire sur Actualiser et conserver après changement de library les seules requêtes indépendantes validées. Résultat : Actualiser remplace l'entrée en entier (test) ; une écriture d'origine `configuration` n'invalide plus le sujet, et un catalogue d'une autre library n'empêche plus de reprendre le moteur ; section « Actualiser et library (9.7) ».
- [x] **9.8 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : borner sujets, octets et arêtes ; protéger l'actif, évincer le moins récent et nettoyer les orphelins. Résultat : `retention.ts` du socle (bornes, estimation plafonnée), éviction du moins récent dans `session.ts`, nœuds Figma des règles réduits à leur identifiant, journal rogné au curseur le plus ancien retenu ; section « Rétention (9.8) ».
- [x] **9.9 | gpt-6-luna | low** | **Claude Sonnet | low** : tester actif trop gros, fermeture de session, perte de suivi et absence de persistance clientStorage ; mesurer les maxima. Résultat : écoute `close` dans `code.ts` (écoutes retirées, `fermerLaSession`), quatre compteurs de maxima dans la trace, tests de perte de suivi, de rognage du journal et d'absence d'écriture `clientStorage`; section « Fermeture, pertes de suivi et maxima (9.9) ».

Prérequis : 8. Nature : mémoire validée entre demandes.
Chemins nouveaux proposés : `packages/plugin-socle/src/composant/analyse/session.ts`,
`revisions.ts`, `retention.ts`, et intégration `sandbox/analyse.ts`.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : séparer faits, requêtes et contributions de l'état
  affiché. Préparer une révision de travail ; promouvoir seulement après
  lecture, calcul et contrôle de l'identité. Conserver les invalidations
  après annulation, arrêt, péremption ou lecture partielle. Retenter les refus.
  Réutiliser un sujet seulement après validation de ses ressources et ensembles.
- **Portée initiale répartie dans les cases ci-dessus** : invalider d'abord le sujet entier pour tout
  changement pertinent. Réutiliser les requêtes pures si toutes les entrées
  revalidées sont identiques. Actualiser emprunte la reconstruction sans
  résultats antérieurs. Changement de library conserve seulement les requêtes
  indépendantes de son catalogue et dont les autres entrées sont validées.
- **Portée initiale répartie dans les cases ci-dessus** : borner sujets, octets estimés et arêtes par
  configuration interne testable ; mesurer leurs maxima. Protéger le sujet
  actif, évincer les moins récents, retirer ressources et arêtes orphelines.
  Un actif trop gros reste analysé entièrement sans rétention. Fermer la
  session retire écoutes et données ; aucune persistance `clientStorage`.

Sortie : deuxième analyse identique sans requête pure répétée après validation,
et parité avec Actualiser après tous les changements du corpus.
Éviction et perte de suivi reviennent au chemin complet. Contrôle : Architect
et socle. **Build Architect.** La rétention inclut les copies temporaires.

## Session (9.1)

`composant/analyse/session.ts` (socle) range une entrée par sujet, clé du jeu de variants. Le module est générique : il ne connaît ni type Figma ni type du kit. Une entrée a trois parties et rien d'autre :

- `sorties` : relevé, catalogue, résultat du moteur sans `pourLaPublication` (qui tient des nœuds Figma), règles lues, niveau, architecture UCM et ignorés rangés ;
- `requetes` : contrôles du kit, corrections proposées, projection (constats visibles et identifiants des constats ignorés), chacune avec le nom des sorties ou requêtes qu'elle a lues ;
- `suivi` : curseur du journal au début de la demande, inventaire (`noeuds`, `admis`, `parents`, `pages`) et couverture de l'acquisition.

`AnalyseCourante` reste l'état affiché d'une génération : identité, corrections fixées, constats, réponses, finalisée, périmée. Elle ne passe pas dans la session, qui ne reçoit ni réponse, ni case cochée, ni identité de génération. Les constats retenus sont ceux du kit, avant toute réponse : une réponse pose une correction dans `AnalyseCourante.corrections`, par une nouvelle table, sans toucher aux constats de la session.

`analyser` appelle `retenirEnSession` après le résultat final, seulement quand le statut est `complete` (la session reste vide après une fin partielle, annulée ou arrêtée). Une nouvelle analyse du même sujet remplace l'entrée. `sessionDesAnalyses()` expose la session aux tests ; `reinitialiserLAnalyse` la vide.

Limites : rien ne lit encore la session. La promotion sous conditions d'identité et de péremption (9.2), la validation (9.4) et la réutilisation (9.6) viennent après. Aujourd'hui, une analyse complète déjà périmée retient quand même son entrée, que rien ne lit.

Preuves : `session.test.ts` (socle : remplacement, ordre des sujets, oubli, forme de l'entrée) et `analyse.test.ts` (forme de l'entrée, fins partielle et annulée sans entrée, seconde analyse du même sujet sans correction fixée ni réponse). Altération : une analyse qui reprend les corrections de la précédente du même sujet fait échouer le dernier test.

## Révision de travail (9.2)

`revisions.ts` (socle, générique) ouvre une révision par sujet : `preparer` y range le contenu hors de la session, `promouvoir(valide)` le range dans la session ou jette la révision, `jeter` l'abandonne. Une révision close ne se rouvre pas.

`analyser` ouvre la révision quand l'identité est connue. `promouvoirLaRevision` la promeut après le résultat final, et seulement si :

- la fin est `complete` ;
- l'identité est encore la courante (même sujet, même génération) ;
- l'analyse n'est pas périmée : un changement de portée `sujet` ou `inconnue` l'a périmée à sa réception, et la génération rendue inapplicable à la cession (8.9) l'est aussi ;
- le journal ne montre depuis son curseur ni écriture ni interruption de page ni débordement (`ecritureDepuisLAnalyse`, `couvertureInterrompue`).

Sinon la révision est jetée, y compris dans `finally` pour une fin annulée, arrêtée ou une erreur, et l'entrée retenue avant reste telle quelle (les invalidations viennent avec 9.3). Une fin `partielle` reste affichable mais ne promeut rien.

Limite : un changement reçu après la promotion (le résultat final est parti, la promotion suit sans cession) ne la défait pas. L'entrée promue passe par la validation de la demande suivante (9.4).

Preuves : `analyse.test.ts` (complète promue ; annulée, arrêtée, partielle, périmée pendant le calcul, inapplicable à la cession, écriture, passage à un autre sujet : entrée d'avant intacte) et `revisions.test.ts` du socle. Altérations : une promotion toujours vraie fait échouer les tests de péremption, d'inapplicable et d'écriture ; sans le test de fin `complete` et d'identité, ceux de fin partielle et de changement de sujet échouent.

## Invalidations retenues (9.3)

`etatDeLEntree(sujet)` (`sandbox/analyse.ts`) est la fonction unique que 9.4 consultera avant la validation. Elle rend :

- `absent` : aucune entrée ;
- `invalide` avec ses raisons : le journal a touché le sujet depuis le curseur de l'entrée ;
- `a-relire` avec ses raisons : une lecture refusée ou une couverture incomplète rend l'entrée irréutilisable ;
- `utilisable` sinon. Ce n'est pas encore une validation : les ressources sans événement se revalident en 9.4.

`invalide` l'emporte sur `a-relire` quand les deux s'appliquent.

- **Invalidation** : `raisonsDInvalidation` (socle) rejoue les entrées du journal depuis un curseur, dans l'ordre. Raisons : `sujet-touche`, `portee-inconnue`, `style` (tout changement de style), `ecriture`, `page-interrompue` (pages du suivi), `journal-deborde`. Les anciens parents viennent de la topologie retenue puis des parents vus par le journal avant chaque entrée. Les ancêtres d'un nœud se reconstruisent par les identifiants de parent du journal.
- **Marque** : `analyser` évalue tous les sujets retenus à l'ouverture de chaque demande, avant que le journal oublie ses vieilles entrées, et pose les raisons sur la session (`invalider`) en avançant le point évalué (`avancerLEvaluation`). La marque reste après une demande annulée, arrêtée ou périmée ; seule la promotion d'une nouvelle entrée la lève. Aucune relecture de Figma. `etatDeLEntree` évalue aussi ce qui est arrivé depuis.
- **À relire** : `releve-incomplet` (lecture manquée), `catalogue-inaccessible`, `moteur-partiel`, `couverture-incomplete` (inconnue comprise) et `lecture-refusee:<lecteur>` pour les lecteurs `regles`, `niveau` et `ignores` dont l'erreur est remplacée par une valeur par défaut. Ces derniers sont rangés dans `sorties.lecturesRefusees`. Une fin partielle n'est jamais promue (9.2) : une lecture manquée du relevé ne laisse donc pas d'entrée, la demande suivante relit.

Limites : les maîtres hors de l'inventaire et les ressources sans événement ne se jugent pas ici (9.4). Les raisons `a-relire` ne se calculent pas sur l'état de la session mais sur le contenu de l'entrée.

Preuves : `analyse.test.ts` (état absent et utilisable ; invalidation puis demande annulée, arrêtée et périmée toujours invalide, jusqu'à la promotion suivante ; écriture, style, calque créé, type inconnu, nœud d'une autre page ; lecture refusée puis disponible ; couverture inconnue), `invalidations.test.ts` et `session.test.ts` du socle. Altérations : sans la pose des raisons sur la session, les deux premiers tests d'invalidation échouent ; sans l'inscription du refus des règles, le test de la lecture refusée échoue.

## Validation avant réutilisation (9.4)

`validerLEntree(sujet, identite, relues, relireLesRegles)` (`sandbox/analyse.ts`) décide si une demande Analyser reprend le résultat du moteur d'une entrée. Elle rend `null` quand l'entrée n'est pas `utilisable` (`etatDeLEntree`), `valide` avec le moteur retenu et les règles relues, ou `invalide` avec ses raisons (`RaisonDeNonReprise`). Seul `valide` saute le moteur. Les raisons d'`invalide` deviennent une marque d'invalidation (9.3), et le chemin complet suit avec le relevé, le catalogue et les dépendances déjà lus.

- **Ordre.** Le relevé et le catalogue sont lus comme avant. Le lecteur `dependances` lit ensuite, avant le moteur, ce que le moteur lit hors d'eux. Un changement arrivé après cette lecture diffère de ce que l'entrée retient, et la validation suivante le voit.
- **Conditions.** Entrée `utilisable` : journal sans changement de portée `sujet` ou `inconnue`, sans style, écriture, interruption ni débordement, couverture complète, aucune lecture refusée. Écoute de la demande complète et non interrompue (`analyseARelire` faux, `couverture-de-la-demande` sinon). Jeu posé sur une page (`page-des-regles` sinon), que l'entrée écoutait (`page-non-suivie` sinon). Aucune instance dont le maître échappe au journal (`non-couvert:maitres`) ni style qui ne se lit pas (`non-couvert:styles`), conditions de 9.5. Relevé, catalogue et dépendances relus égaux aux sorties retenues. Enfin les règles d'usage, relues sur le moteur retenu, égales à celles de l'entrée.
- **Égalité.** `egalesExactement` (`validation.ts` du socle) compare sans normaliser : ordre des listes, des clés d'objet, des `Map` et des `Set`, `Object.is` pour les primitives (`NaN` égale `NaN`, `0` diffère de `-0`), clé à `undefined` différente d'une clé absente. Un objet qui n'est pas simple n'égale que lui-même. Le scan des règles passe donc avec ses nœuds réduits à leur identifiant.
- **Reste du chemin.** Contrôles du kit, corrections et projection se rejouent sur les sorties relues, égales aux retenues : le message `analyse`, les corrections retenues et les modèles de règles sont ceux d'une analyse complète. 9.6 décide de leur réutilisation.
- **Actualiser** ne lit aucune entrée et ne valide rien. Sans lecteur `dependances` (doubles de test), aucune validation non plus.

Hypothèse de couverture vérifiée contre `plugin-socle/src/composant/contract/`, `analyse/resultat.ts` et `variables.ts`. Le moteur tourne avec `publier: false` : échantillons, `figma.root.name` et `fileKey` ne sont pas lus.

| Lecture du moteur | Condition qui la couvre |
|---|---|
| Nœuds du jeu : `componentPropertyDefinitions`, enfants, variants, `defaultVariant`, champs de mise en page, peintures, segments, effets sans style | journal (`nodechange` sur l'inventaire, calque créé ou déplacé, anciens parents) et relevé relu |
| Liaisons de variables des nœuds (`boundVariables`, peintures, effets, grilles, segments) | relevé relu : `liaisons`, avec identifiant, clé, nom, collection et origine de la variable. `NodeChangeProperty` ne nomme pas `boundVariables` |
| Nom et collection d'une variable liée distante, lus par identifiant | relevé relu (nom et collection de chaque liaison) |
| Index des variables et collections locales (`getLocalVariablesAsync`, `getLocalVariableCollectionsAsync` : identifiant, nom, collection) | dépendances relues, ordre compris. Le catalogue ne suffit pas : une library choisie le remplace, et le catalogue du fichier écarte une variable illisible |
| Valeurs des variables, libraries | non lues par le moteur ; le catalogue relu les couvre pour les contrôles du kit |
| Scan des règles de la page du jeu (`extractRules`) | dépendances relues. Le journal ne le couvre pas : un changement hors de l'inventaire est hors du sujet |
| Page des règles : `pageDuNoeud(jeu, figma.currentPage)` | refus `page-des-regles` quand le jeu n'a pas de page et que le moteur lirait la page courante |
| Styles de texte (`textStyleId`, définition, variables liées) et d'effet (`effectStyleId`) | dépendances relues (9.5) : la définition de chaque style que le jeu cite (`PROPRIETES_DE_STYLE`), locale ou distante, se relit par identifiant et se compare exactement. Un style local est aussi couvert par `stylechange` (raison `style`). Refus `non-couvert:styles` pour un style qui ne se lit pas : `textStyleId` qui n'est pas une chaîne, style introuvable ou refusé |
| Maîtres d'instance (`getMainComponentAsync`), leur jeu et ses propriétés, leur contenu | journal (9.5) pour un maître local sur une page que l'entrée et la demande écoutent : le maître (son jeu, pour un variant) et tous ses descendants sont dans `SuivisDuSujet.maitres` ; depuis 16.3, leurs liaisons sont relues jusqu'au résultat de E4. Depuis 16.4, un maître distant se relit (`MaitreDeDependance.definition` : `CHAMPS_DU_MAITRE_DISTANT`, parent, jeu), avec les calques de ses instances (`DependancesDuMoteur.calquesDesInstancesDistantes`), et se compare exactement : une mise à jour de library change son contenu sans événement démontré. Refus `non-couvert:maitres` pour un maître d'origine inconnue, sur une page non écoutée, ou qui ne se lit pas |
| Noms contractés (`indexContractedNames` : `nomsDeLaPage` de la page de chaque maître local) | dépendances relues (9.5) : `MaitreDeDependance.nomsDeLaPage`, rendu par la même fonction que le moteur, comparé exactement |
| Maîtres, page et instances que le moteur lit à travers les instances sous un maître (`indexMasterInstances`, `scanComposedInstances` du variant par défaut, `findWrapperReference`) | depuis 16.3, fermeture des maîtres dans `dependancesDeFigma` : le maître de chaque instance sous un maître local entre dans `DependancesDuMoteur.maitres`, niveau par niveau (`PROFONDEUR_DES_MAITRES`), et se juge comme un maître du jeu (journal, relecture d'un maître distant depuis 16.4, ou refus `non-couvert:maitres`). Liaisons relues jusqu'au résultat de E4 : `MaitreDeDependance.liaisons` (`boundVariables` de chaque nœud d'un maître local, du jeu ou atteint) se compare exactement. Refus `non-couvert:maitres-autres-instances` pour une instance dont le maître ne se lit pas ou au-delà de la profondeur |
| Règles d'usage d'Architect (`lireLesRegles` : scan, surface du moteur, clés déclarées du jeu) | relues sur le moteur retenu et comparées |

Écart avec l'hypothèse de la note de conception : les maîtres ne sont pas revalidés par le relevé, les variables locales pas toujours par le catalogue, les styles distants par aucun événement, et les règles de la page par aucun `nodechange` suivi. Les deux premiers et les règles se relisent dans les dépendances ; maîtres et styles refusaient la réutilisation en 9.4 ; 9.5 les couvre quand elle le démontre.

Limites : en 9.4, un jeu qui portait une instance ou un style ne reprenait jamais le moteur (9.5 lève ce refus pour un maître local suivi et un style lisible). Les lectures d'une demande ne sont pas atomiques : une variable renommée entre la lecture des dépendances et celle du moteur donne un moteur plus récent que les dépendances retenues, et la validation suivante refuse. Le scan des règles retenu dans `sorties.moteur.rules` garde ses nœuds Figma (`conteneurVierge`, `maitreLocal`, `instanceSource`) ; la validation ne le lit pas.

Preuves : `validationDeLEntree.test.ts` (rien ne change : `valide`, moteur appelé une fois, affichage égal à Actualiser par `JSON.stringify` ; valeur ou nom de variable, liaison, ordre des calques, maître distant, style, scan des règles, variable locale, règles d'usage, dépendances illisibles, jeu sans page ou déplacé : `invalide`, moteur relancé, affichage égal à Actualiser ; Actualiser et lecteur absent sans validation ; lecteur de Figma) et `validation.test.ts` du socle. Altérations : un comparateur qui ignore l'ordre fait échouer quatre tests du socle et celui de l'ordre des calques ; une validation qui saute le catalogue fait échouer les deux tests de variable ; une validation sans conditions en fait échouer neuf.

## Invalidation du sujet entier et parité (9.5)

**Invalidation entière.** Une entrée qui n'est pas `valide` ne sert pour rien : ni le résultat du moteur, ni les contrôles, ni les corrections, ni la projection. Elle reste dans la session avec sa marque (9.3) jusqu'à ce que la promotion de la demande complète la remplace en entier. Aucune réutilisation partielle avant 9.6.

**Styles.** `dependancesDeFigma` lit par identifiant la définition de chaque style que le jeu cite (`StyleDeDependance.definition`, les propriétés de `PROPRIETES_DE_STYLE` en valeurs simples) et la validation la compare exactement avec les dépendances retenues. Un style local reste aussi couvert par `stylechange` (tout changement de style invalide le sujet au journal). Un style qui ne se lit pas (`textStyleId` mixte, style introuvable ou refusé) garde le refus `non-couvert:styles`.

**Maîtres.** `dependancesDeFigma` lit le maître de chaque instance du jeu (`MaitreDeDependance` : identifiant, nombre d'instances, `remote`, page, et pour un maître local son nœud racine, jeu de variants pour un variant, avec tous ses descendants). `relecturesObligatoires(...).maitresSuivis` (8.2) désigne les maîtres locaux d'une page écoutée ; leurs identifiants et ceux de leurs descendants vont dans `SuivisDuSujet.maitres`, à la péremption (`jugerLesNoeuds`), dans le suivi retenu de l'entrée et dans `raisonsDInvalidation`. `suivreLesMaitres` rejuge le journal depuis le curseur de la demande dès les dépendances lues, parce qu'un événement reçu avant elles visait un maître encore inconnu. La validation exige que chaque instance ait un maître que l'entrée suivait et que la demande écoute encore ; sinon `non-couvert:maitres`. Un maître distant, d'origine inconnue ou hors des pages écoutées garde ce refus : le contenu d'un composant de library peut changer par une mise à jour sans événement démontré.

**Ce que le moteur lit hors du maître.** Pour les composants imbriqués, `indexContractedNames` lit les noms de composant écrits sur la page de chaque maître local (`nomsDeLaPage`), puis, pour un maître contracté, les instances qu'il contient et leurs maîtres, que `indexMasterInstances`, `scanComposedInstances` et `findWrapperReference` parcourent de même. Les noms de la page se relisent : `dependancesDeFigma` appelle `nomsDeLaPage`, la fonction du moteur, et la validation compare la liste (ordre compris) avec celle de l'entrée. Les instances sous un maître et leurs maîtres ne se relisent pas sans recopier cette logique : dès qu'un maître local contient une instance (`MaitreDeDependance.instancesImbriquees`), la validation refuse (`non-couvert:maitres-autres-instances`). Le moteur ne lit pas les autres instances du même maître, ailleurs dans le document.

**Limites.** Un maître suivi rend plus large aussi la suppression d'un nœud jamais vu : sa portée est inconnue (`parent-de-suppression-inconnu`) et invalide l'entrée.

Preuves : `paritesDeSession.test.ts` rejoue une fixture unique (instance d'un maître local, style de texte, variables liées, catalogue, dépendances lues par `dependancesDeFigma` sur un faux graphe de nœuds). Chaque mutation est suivie d'Analyser puis d'Actualiser sur le même état, affichage comparé par `JSON.stringify` et `deepEqual` (constats, corrections, modèles, relevé du message, ordre compris), et les reprises se comptent par les appels du moteur. Mutations locales (peinture, texte, nom, ajout, suppression d'un calque), globales (valeur de variable, alias, style local, style distant sans événement, maître local, maître de library, library choisie, niveau AA vers AAA), aucune mutation, un changement d'un autre composant, un style distant et un maître local inchangés (reprise), un nom de composant écrit sur la page du maître et un maître qui contient une instance (pas de reprise, sans événement sur le sujet), plusieurs mutations avant un Analyser, et une série de douze Analyser enchaînés comparés chacun à une reconstruction depuis un état neuf. Les cas non couverts relancent le moteur et remplacent entrée, moteur et contrôles. `validationDeLEntree.test.ts` couvre les conditions (maître distant ou sur une autre page, instance sans maître lu, style illisible ou changé) et la forme lue par `dependancesDeFigma`, `invalidations.test.ts` du socle le maître suivi.

Altérations vérifiées : sans `suivi.maitres` dans `raisonsDInvalidation`, les tests du maître local et de la série échouent ; une définition de style qui ne relit rien fait échouer le cas du style distant et le test de `dependancesDeFigma` ; sans `suivreLesMaitres`, le test de l'événement reçu avant les dépendances échoue ; des noms de page non relus font échouer le cas du nom de composant et le test de `dependancesDeFigma` ; sans le refus des instances sous le maître, le cas du maître qui contient une instance et son test de validation échouent.

## Requêtes pures (9.6)

`creerLesRequetes(entree, actuelles)` (`sandbox/analyse.ts`) rend la fonction par laquelle `analyser` passe `controles`, `corrections` et `projection`. Une requête est reprise de l'entrée quand l'entrée de session est `valide` à cette demande et que chacune de ses entrées égale (`egalesExactement`) la valeur actuelle ; sinon elle se rejoue. Aucune reprise après une validation `invalide`, un état `a-relire`, ni pour Actualiser : `entree` vaut alors `null`.

| Requête | Entrées comparées |
|---|---|
| `controles` | `releve`, `catalogue`, `niveau`, `architectureUcm` |
| `corrections` | `releve`, `catalogue`, `moteur`, `regles`, `controles` |
| `projection` | `corrections`, `ignores` |

- **Résultat amont.** Un résultat de requête s'inscrit dans les valeurs actuelles, repris ou recalculé. Une requête rejouée dont le résultat reste égal à celui de l'entrée ne rejoue pas celles qui la lisent : le niveau AAA seul rejoue les contrôles ; sur la fixture, leur résultat est égal, et corrections et projection se reprennent.
- **Relevé et catalogue.** Ils sont frais, mais la validation (9.4) les a déjà comparés aux retenus : leur comparaison ici est celle d'une paire déjà jugée égale. `moteur` est l'objet retenu, `regles` la relecture égale.
- **Ordre des étapes.** Les contrôles précèdent le moteur et sortent en provisoire, alors que la validation vient après la lecture des dépendances. Quand l'entrée est `utilisable` (`etatDeLEntree`), les dépendances et la validation passent avant les contrôles, et le provisoire part avec les contrôles retenus. Sans entrée utilisable, l'ordre est celui d'avant (provisoire, puis dépendances) : le premier affichage n'attend pas.
- **Entrées cachées.** Aucune trouvée : les contrôles et les corrections du kit ne lisent ni `Date`, ni état de module, ni ordre d'une `Map` remplie ailleurs ; leurs mémoires sont des `WeakMap` par catalogue ou relevé (accélération sans effet sur le résultat). Les ignorés rangés sont une entrée de `projection`, lue une fois par demande. `constatsDeRegles` et `constatsDuMoteur`, qui nourrissent les corrections, ne lisent que `regles`, `moteur` et les identifiants de variants du `releve`.
- **Mesure.** Chaque requête compte une fois : `requetesNonRejouees` si reprise, `requetesRejouees` sinon (trois par analyse).

Limites : le résultat repris est l'objet de l'entrée, partagé avec la génération précédente ; rien ne le modifie après le calcul. Les entrées sont des listes écrites une fois, `ENTREES_DES_REQUETES` : une requête qui lirait une donnée nouvelle doit l'y ajouter, sans quoi elle serait reprise à tort.

Preuves : `paritesDeSession.test.ts` (Analyser deux fois : 3 reprises, affichage égal à Actualiser, qui n'en reprend aucune ; niveau AA vers AAA : 1 rejouée, 2 reprises ; ignorés changés : projection seule rejouée ; valeur de variable : 3 rejouées) et la série des parités de 9.5, inchangée. Altérations : sans `niveau` dans les entrées de `controles`, le test du niveau échoue ; sans `ignores` dans celles de `projection`, le test des ignorés échoue.

## Actualiser et library (9.7)

**Actualiser.** Il ne lit aucune entrée (`reutilisationPermise` faux) et sa fin `complete` promeut une reconstruction qui remplace l'entrée. Le test garde les objets de l'entrée précédente (sorties et résultats de requêtes) et vérifie qu'aucun ne figure dans la nouvelle.

**Library.** Le moteur ne lit ni le catalogue ni la library choisie : `lireLaLibraryRangee` n'est lue que par le lecteur `catalogue` d'Architect (et la préparation), et rien du moteur (`exportComponent.ts`, `porteeDAnalyse.ts`) ne lit ce réglage. Deux changements :
- `raisonsDInvalidation` ne pose plus `ecriture` pour une écriture d'origine `configuration` (`ranger-library`, `ranger-niveau`). Le niveau est une entrée comparée de `controles`, la library un champ du catalogue. Toute autre écriture invalide le sujet entier.
- La validation (9.4) ne compare plus le catalogue quand sa `library` diffère de celle de l'entrée : tout le catalogue change alors par construction. Si la library est la même, la comparaison reste exacte.

Effet : le moteur et les règles se reprennent. `controles` et `corrections` lisent le catalogue et se rejouent ; `projection` se reprend si les corrections rendent le même résultat. Le gain réel est le moteur, la partie coûteuse.

Limites : un niveau changé par `ranger-niveau` suit le même chemin et se rejoue par comparaison. Une analyse en cours au moment du réglage reste périmée (`perimerApresUneEcriture`) et ne promeut rien.

Preuves : `paritesDeSession.test.ts` (Actualiser après des reprises ; library choisie avec écriture de configuration : moteur repris, au moins deux requêtes rejouées, affichage égal à Actualiser ; écriture ordinaire : tout se rejoue) et `invalidations.test.ts` du socle. Altérations : une écriture de configuration qui invalide, ou un catalogue toujours comparé, fait échouer trois tests de parité.

## Rétention (9.8)

**Bornes** (`BORNES_DE_RETENTION`, `retention.ts`), pour la session entière : 8 sujets, 48 Mio estimés, 20 000 arêtes. Une page de composants se parcourt en une séance, et le plus ancien de huit est le moins susceptible de revenir. Un catalogue de quelques milliers de variables et un relevé de plusieurs centaines de calques pèsent quelques Mio ; 48 Mio laissent huit sujets sans qu'un seul épuise la borne. Une entrée porte quelques centaines d'arêtes (entrées des requêtes, plus collections et variables locales, styles et maîtres des dépendances). Les tests les abaissent par `fixerLesBornesDeRetention`.

**Estimation.** `estimerLesOctets` parcourt la valeur sans la sérialiser (2 octets par caractère, 8 par nombre, 4 par booléen, 8 de structure plus clés et éléments), compte une fois un objet revu, et s'arrête au plafond : son coût ne dépasse pas la borne.

**Règles.** À la promotion, `retenir` évince les sujets les moins récents (rang) jusqu'à tenir les trois bornes, jamais le sujet rangé. Un sujet qui dépasse seul une borne rend `null` : l'analyse a déjà tout affiché, rien n'est retenu et l'entrée précédente du sujet est retirée avec sa marque. Un sujet évincé perd entrée, marque et point d'évaluation ; rien d'autre ne le référence.

**Journal.** `oublierAvant` reçoit le plus ancien de `courante.curseur` (l'analyse affichée, dont les écritures et interruptions se jugent encore) et du point d'évaluation de chaque entrée retenue, au lieu du seul curseur de l'analyse précédente. Chaque demande avance ces points avant de rogner, ils valent donc le dernier marquage ; le gain vient surtout d'une session sans analyse affichée.

**Nœuds Figma.** `sorties.moteur.rules.releve` ne garde que les identifiants de `conteneurVierge`, `maitreLocal` et `instanceSource` (`MoteurRetenu`). Aucune requête reprise ne les lit : `controles`, `corrections` et `projection` lisent `warnings`, `parties`, `localisations`, `props`, `stateModel` et `imbriques`, et les règles se relisent sur la page. Pas de relecture d'un nœud, ni de refus de reprise. `RelireLesRegles` et `Lecteurs.regles` prennent `SurfaceDuMoteurRetenu`, que le résultat interne et le résultat retenu satisfont tous deux.

Limites : l'estimation est approximative (pas de taille d'objet réelle du moteur JavaScript). Aucun test n'observe le journal rogné, qui n'est pas exporté. Aucune persistance : fermer le plugin retire la session.

Preuves : `retention.test.ts` du socle (estimation, éviction par sujets, octets, arêtes, marque retirée, sujet seul trop gros), `paritesDeSession.test.ts` (éviction et marque dans l'analyse, sujet trop gros affiché en entier mais non retenu, forme de l'entrée parcourue sans nœud ni fonction). Altérations : éviction du plus récent, et rules.releve non réduit, font échouer ces tests.

## Fermeture, pertes de suivi et maxima (9.9)

**Fermeture.** `code.ts` écoute `close` : il retire `selectionchange`, `stylechange` et `currentpagechange`, appelle `suivi.fermer()` (retire les `nodechange` de chaque page écoutée, sans les signaler comme interruptions), abandonne les libraries anticipées et appelle `fermerLaSession()` (lève le jeton de l'opération, vide analyse courante, journal et session). Sans analyse courante, une analyse en cours ne promeut rien.

**Pertes de suivi.** Page non écoutée, journal débordé et page quittée ramènent chacune la demande suivante au chemin complet (moteur relancé) ; le cas `page-non-suivie` avait déjà son test (`validationDeLEntree.test.ts`). L'actif trop gros est testé en 9.8, avec l'analyse suivante du même sujet en chemin complet.

**Journal.** Le rognage est observé par `journalDesChangements().depuis(0)` : deux changements sans rapport restent à la deuxième demande et disparaissent à la troisième.

**Persistance.** Aucune analyse, Analyser ou Actualiser, n'appelle `clientStorage.setAsync`. Limite : le test utilise les lecteurs de la fixture, donc il ne couvre pas le lecteur du niveau, qui ne fait que lire.

**Maxima.** La trace compte `sujetsRetenus`, `octetsRetenus`, `aretesRetenues` (session après promotion) et `entreesDuJournal`, par `retenirLeMaximum`. La promotion précède désormais l'envoi du résultat, pour que la trace, fermée à l'envoi, les porte.

Altérations : sans rognage du journal, le test du journal échoue ; sans vidage de la session à la fermeture, le test de fermeture échoue.

## Geste de la reprise (correctif après recette)

La recette du mainteneur a montré que la reprise n'était jamais atteinte. Depuis 8.7, le bouton du mode Composant envoyait `actualiser` dès qu'une analyse existait, et seule `analyser` permet la reprise. Un clic sur Actualiser d'un Button déjà analysé, sans changement, prenait donc 16 s.

Décision du mainteneur : le clic envoie `analyser`, donc la reprise validée. Maj+clic envoie `actualiser`, la reconstruction complète, et l'infobulle l'annonce. Test : `tests/intentionDAnalyseDeLInterface.test.ts`.

Même atteinte, la reprise relit le relevé, les valeurs du catalogue et les dépendances (9.4) : environ 6 à 7 s sur le Button. Le lot 16 étudie ce qui la rapproche de la cible de 250 ms.
