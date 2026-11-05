# G1c. Recalculs, simulations et projections dans le Worker

Phase G. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase G
dans [README.md](../README.md), puis [RECHERCHE-ATTENTE-ANALYSE.md](../../RECHERCHE-ATTENTE-ANALYSE.md) en entier.

Agent : `implementeur-exigeant`. Dépend de : G1b.

Fichiers : `src/nomenclature/`, client du Worker de G1b, tests.

- [x] G1.7 Les recalculs après une réponse, les simulations et les projections de Nomenclature passent par le Worker, avec la même
  voie de repli. Les résultats détaillés restent paginés.

Fin : `npm run test:paquet -- architect` passe. La parité couvre une réponse à une question et une simulation.

## Avancement

G1.7 est fait dans l'arbre de travail, sans commit. La vitesse du Worker dans Figma reste à mesurer (G5). La politique de contenu de Figma pour l'iframe reste inconnue ici.

- Ce qui passe par le Worker : le bilan, le recalcul après des règles écrites (réponse à une question, geste sur les règles, exclusion de collection, import), la préparation des écritures d'un geste (écritures, règles obtenues, refus du vocabulaire), les pages de `lignes`, les `termes`, la `fiche`, `noms-selection`, le `diagnostic`, les simulations, et la liste des renommages d'une sélection pour `appliquer`.
- Ce qui reste au sandbox : la lecture de Figma, le stockage des règles, l'écriture des règles, `appliquer` et `annuler-dernier` (relecture de chaque nom avant d'écrire), l'analyse du texte d'un import avec son contrôle de conflits (seul son recalcul passe par le Worker), `exporter`, et tout le calcul quand le Worker manque.
- Protocole. `calcul-des-noms` porte un `TravailDesNoms` à la place de l'entrée seule (`src/messages/calculDesNoms.ts`), de sorte `calculer`, `recalculer` (génération de base, règles), `adopter` (nouvelles règles, sans recalcul), `lire`, `simuler`, `preparer` ou `renommages`. `noms-calcules` porte un `ResultatDuTravail` de sorte `bilan`, `message`, `ecritures`, `refus`, `erreur`, `renommages` ou `perimee`. La demande, la génération et la révision de chaque réponse sont contrôlées comme en G1b. Le port (`distant.ts`) et le client (`calculDesNoms.ts`) attendent plusieurs requêtes à la fois, une par demande ; un nouveau calcul de bilan remplace seulement les calculs de bilan en attente.
- Le Worker garde l'état : `src/nomenclature/atelier.ts` `creerAtelier` tient le lexique, le résultat, les questions et la projection des deux dernières générations (la courante et celle qu'un calcul abandonné ou en cours a créée). Une génération disparue rend `perimee`. Le Worker jeté perd cet état, donc le sandbox calcule.
- Code partagé : `src/nomenclature/gestes.ts` reprend de `session.ts`, sans changer leur code, les écritures d'un geste et d'une réponse, le terme d'un effet et l'erreur de protocole, et ajoute l'essai sur le stockage, le début et la fin d'une simulation, la réponse à une lecture et les renommages d'une sélection. La session et l'atelier appellent les mêmes fonctions, donc ils répondent pareil. `calcul.ts` gagne `calculerLEtatDirect` et `menerSansCeder`.
- Session : elle garde `etat` (calcul du sandbox) ou `distant` (entrée seule). Chaque lecture, simulation, préparation, recalcul et liste de renommages essaie le Worker tant que `distant` est posé. Si le Worker se replie, rend `perimee`, rend une forme illisible ou un renommage que l'inventaire du sandbox ne confirme pas, `completerLEtat` refait le calcul de la génération par tranches, une fois pour toutes les demandes en attente, et la session reste sur cette voie jusqu'à la prochaine analyse. Le premier choix d'écriture écrit les groupes vus dans le sandbox, puis le Worker refait la projection (`adopter`). Une réponse qui arrive après un changement de génération reçoit `generation-perimee`, jamais une page de l'ancienne génération.
- Écritures : `appliquer` reçoit du Worker l'identifiant, l'ancien et le nouveau nom de chaque renommage, les vérifie contre l'inventaire qu'il a lu (identifiant présent, ancien nom identique), relit chaque objet avant d'écrire et compare la signature des règles comme avant.
- Journal : un bilan ou un recalcul par le Worker note les quatre phases `worker-*` et `calcul-des-noms` avec `voie: worker` ; une lecture, une simulation, une préparation ou une liste de renommages note `worker-calcul` avec `voie: worker`. Le calcul que le sandbox refait après un échec du Worker note le `repli` de cet échec.
- Mesures, rejeu de 2 415 variables avec règle d'écriture, médiane de 5 passages, écran et Worker sous Chromium, session sous Node sans pause entre tranches :

  | Demande | Worker (Chromium), aller-retour | Sandbox (Node) |
  |---|---|---|
  | Réponse à une question | 390 ms (préparation 8 ms, recalcul 384 ms) | 489 ms |
  | Simulation d'un terme | 73 ms | 70 ms |
  | Simulation d'une écriture | 107 ms | 101 ms |
  | Page de lignes | 1 ms | 1 ms |
  | Premier bilan | 691 ms | non mesuré |

  Dans le Worker, le calcul seul prend 4 ms (préparation), 344 ms (recalcul), 60 ms (terme) et 85 ms (écriture) ; le reste est le transfert et le rendu du message. Chromium et Node vont à la même vitesse ici : le gain attendu vient de l'écart entre un moteur de navigateur et QuickJS (0,8 s contre 30 s pour le calcul complet d'après RECHERCHE-ATTENTE-ANALYSE.md), qui se mesure dans Figma. G1b refaisait ce calcul complet à la première lecture ou au premier geste ; G1c le retire.
- Tests : `tests/nomenclatureCalculDistant.test.ts` (33 tests) compare le Worker et le sandbox sur une page de lignes, les termes, une fiche, la sélection, le diagnostic, cinq simulations (effet, écriture, conflit), trois réponses à une question (garder, distincts, plus tard), des gestes avec refus et erreur, l'exclusion d'une collection, un import, le premier choix d'écriture et `appliquer` ; il couvre le repli d'une lecture, d'un recalcul et d'une préparation, une génération disparue, un renommage non confirmé, une réponse qui arrive après une nouvelle analyse, le journal et l'atelier. `tests/calculDesNomsClient.test.ts` (12 tests) couvre les requêtes simultanées. `tests/interface/calculDesNoms.test.mjs` (5 tests dans Chromium) compare le Worker réel à l'atelier sous Node sur une page, une fiche, une simulation, une réponse à une question, un recalcul et les renommages. Sans le branchement de `confier`, dix tests de `nomenclatureCalculDistant.test.ts` échouent.
- Commandes : `npm run typecheck --workspace ucm-architect-plugin` rend 0 erreur. `npm run test:paquet -- architect` : 2 223 passent, 3 échouent hors de ce lot (`paritesDeSession` sur la requête `projection`, `questionsEtCartesDeStructure` sur un texte de fusion, `tokensStructure`), que d'autres agents modifient. `node --test tests/interface/calculDesNoms.test.mjs` passe (5 tests) après `npm run build:ui`.
- Reste : la mesure dans Figma (G5), les gestes d'import dont l'analyse du texte reste dans le sandbox, et le fait que les durées ci-dessus ne distinguent pas Chromium et Node.
