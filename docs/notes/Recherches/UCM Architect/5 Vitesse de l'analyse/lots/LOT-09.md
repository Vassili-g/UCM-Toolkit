# Lot 9 : réutilisation avec invalidation large et rétention bornée

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **9.1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : séparer faits et requêtes retenus de l'état affiché ; test que réponses et cases ne reviennent pas d'une génération antérieure. Résultat : `session.ts` du socle (une entrée par sujet : sorties, requêtes avec leurs entrées, suivi), remplie par `analyser` à la fin d'une analyse complète, section « Session (9.1) ».
- [x] **9.2 | gpt-6.1-sol | high** | **Claude Sonnet | high** : préparer une révision de travail et promouvoir seulement après lecture, calcul et identité valides ; tests de fins annulée, arrêtée et périmée. Résultat : `revisions.ts` du socle ; `analyser` ouvre une révision à l'identité connue et ne la promeut qu'à une fin `complete` valide, section « Révision de travail (9.2) ».
- [x] **9.3 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : retenir les invalidations et retenter les lectures refusées ou partielles ; test échec puis disponibilité. Résultat : marques d'invalidation dans la session, `invalidations.ts` du socle et `etatDeLEntree(sujet)` d'Architect, section « Invalidations retenues (9.3) ».
- [x] **9.4 | gpt-6.1-sol | high** | **Claude Opus | high** : valider ressources et ensembles avant réutilisation d'un sujet ; test de modification sans notification couvrante. Résultat : `validation.ts` du socle (`egalesExactement`), lecteur `dependances` et `validerLEntree` d'Architect ; une demande Analyser reprend le moteur retenu seulement sur `valide`, section « Validation avant réutilisation (9.4) ».
- [ ] **9.5 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : appliquer d'abord l'invalidation du sujet entier ; parité avec reconstruction après mutation locale et globale.
- [ ] **9.6 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : réutiliser seulement les requêtes pures dont les entrées revalidées sont égales ; compter celles qui ne rejouent pas.
- [ ] **9.7 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : reconstruire sur Actualiser et conserver après changement de library les seules requêtes indépendantes validées.
- [ ] **9.8 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : borner sujets, octets et arêtes ; protéger l'actif, évincer le moins récent et nettoyer les orphelins.
- [ ] **9.9 | gpt-6-luna | low** | **Claude Sonnet | low** : tester actif trop gros, fermeture de session, perte de suivi et absence de persistance clientStorage ; mesurer les maxima.

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
- **Conditions.** Entrée `utilisable` : journal sans changement de portée `sujet` ou `inconnue`, sans style, écriture, interruption ni débordement, couverture complète, aucune lecture refusée. Écoute de la demande complète et non interrompue (`analyseARelire` faux, `couverture-de-la-demande` sinon). Jeu posé sur une page (`page-des-regles` sinon), que l'entrée écoutait (`page-non-suivie` sinon). Ni instance (`non-couvert:maitres`) ni style de texte ou d'effet (`non-couvert:styles`). Relevé, catalogue et dépendances relus égaux aux sorties retenues. Enfin les règles d'usage, relues sur le moteur retenu, égales à celles de l'entrée.
- **Égalité.** `egalesExactement` (`validation.ts` du socle) compare sans normaliser : ordre des listes, des clés d'objet, des `Map` et des `Set`, `Object.is` pour les primitives (`NaN` égale `NaN`, `0` diffère de `-0`), clé à `undefined` différente d'une clé absente. Un objet qui n'est pas simple n'égale que lui-même. Le scan des règles passe donc avec ses nœuds réduits à leur identifiant.
- **Reste du chemin.** Contrôles du kit, corrections et projection se rejouent sur les sorties relues, égales aux retenues : le message `analyse`, les corrections retenues et les modèles de règles sont ceux d'une analyse complète. 9.6 décidera de leur réutilisation.
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
| Styles de texte (`textStyleId`, définition, variables liées) et d'effet (`effectStyleId`) | aucune : `stylechange` couvre les propriétés d'un style local, pas un style de library ni une variable liée au style. Refus `non-couvert:styles` dès qu'un nœud du jeu en porte un, ou un `textStyleId` qui n'est pas une chaîne |
| Maîtres d'instance (`getMainComponentAsync`), leur jeu et ses propriétés, leur contenu, le wrapper, les noms contractés d'autres pages (`indexContractedNames` charge ces pages) | aucune : le relevé ne lit du maître que clé, nom, origine et pilotage. Refus `non-couvert:maitres` dès que le relevé ou les dépendances comptent une instance |
| Règles d'usage d'Architect (`lireLesRegles` : scan, surface du moteur, clés déclarées du jeu) | relues sur le moteur retenu et comparées |

Écart avec l'hypothèse de la note de conception : les maîtres ne sont pas revalidés par le relevé, les variables locales pas toujours par le catalogue, les styles distants par aucun événement, et les règles de la page par aucun `nodechange` suivi. Les deux premiers et les règles se relisent dans les dépendances ; maîtres et styles refusent la réutilisation.

Limites : un jeu qui porte une instance ou un style ne reprend jamais le moteur. Les lectures d'une demande ne sont pas atomiques : une variable renommée entre la lecture des dépendances et celle du moteur donne un moteur plus récent que les dépendances retenues, et la validation suivante refuse. Le scan des règles retenu dans `sorties.moteur.rules` garde ses nœuds Figma (`conteneurVierge`, `maitreLocal`, `instanceSource`) ; la validation ne le lit pas.

Preuves : `validationDeLEntree.test.ts` (rien ne change : `valide`, moteur appelé une fois, affichage égal à Actualiser par `JSON.stringify` ; valeur ou nom de variable, liaison, ordre des calques, maître distant, style, scan des règles, variable locale, règles d'usage, dépendances illisibles, jeu sans page ou déplacé : `invalide`, moteur relancé, affichage égal à Actualiser ; Actualiser et lecteur absent sans validation ; lecteur de Figma) et `validation.test.ts` du socle. Altérations : un comparateur qui ignore l'ordre fait échouer quatre tests du socle et celui de l'ordre des calques ; une validation qui saute le catalogue fait échouer les deux tests de variable ; une validation sans conditions en fait échouer neuf.
