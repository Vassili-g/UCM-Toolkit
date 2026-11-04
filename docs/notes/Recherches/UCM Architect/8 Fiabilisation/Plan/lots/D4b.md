# D4b. Relecture après Appliquer

Phase D. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase D
dans [README.md](../README.md).

Fichiers : `src/sandbox/structure.ts`, `src/ecriture/structure.ts`, `src/ui/structure/index.ts` et leurs tests.

- [ ] D4.2 Décrivez les données affectées par scopes, alias, modes, créations et renommages.
  Relisez tout le catalogue si cette liste ne prouve pas que les voisins et les candidats restent valides.
  Gardez la relecture avant écriture et l'invalidation après écriture, refus ou annulation.
- [ ] D4.3b Testez la parité avec une acquisition complète après chaque geste, puis création, renommage, alias modifié,
  écriture partielle, refus de lecture et Ctrl+Z. Une voie ciblée reste désactivée tant que sa parité n'est pas prouvée.

Fin : `npm run test:paquet -- architect` passe. Les tests couvrent le repli complet et l'absence de correction issue d'un catalogue périmé.

## Avancement

D4.2 et D4.3b faits (Claude, non commités, cases non cochées). Voie retenue : la relecture complète. Aucune voie ciblée n'est écrite.

Fichiers : `packages/plugin-architect/src/sandbox/structure.ts` et `packages/plugin-architect/tests/relectureApresAppliquer.test.ts` (nouveau, 16 tests).
`src/ecriture/structure.ts` et `src/ui/structure/index.ts` sont inchangés : l'écriture relit déjà chaque variable avant d'écrire, et l'interface
envoie déjà `lire-structure` à chaque `structure-appliquee`.

- D4.2. L'en-tête de `src/sandbox/structure.ts` décrit les données que chaque écriture affecte, d'après les contrôles du kit
  (`controles/integrite.ts`, `controles/structure.ts`) :
  - Scopes : la variable écrite et ses seuls constats. Aucun contrôle ne lit les scopes d'une autre variable.
  - Alias d'un mode : la valeur de la variable, donc son jugement de cran, les rampes que ses jumelles du groupe visent (le sens de la
    palette et l'alias des créations C82 en dépendent) et, pour C63 « alias supprimé », la voisine de même dernier segment.
  - Création : la liste des variables, donc les C82 « variable absente » du groupe, ses jumelles et les index du kit. Ces index sont
    mémorisés par catalogue sur la longueur de la liste : une variable ajoutée à un catalogue gardé n'y serait pas vue.
  - Renommage : le rôle reconnu et le groupe, les identifiants des constats C82 (ils portent le nom), les scopes attendus par C63, les
    candidats cherchés par nom et la clé d'Ignorer d'un constat.
  La liste ne prouve pas que les voisins et les candidats restent valides, hors le cas des scopes seuls, que le lot ne sépare pas des
  autres sortes. Après Appliquer, `lire-structure` relit donc tout Figma. Gardés : la relecture de chaque variable avant d'écrire
  (`ecriture/structure.ts`), la fermeture de la reprise par `appliquer-structure`, l'invalidation par `pendantUneEcriture` après une
  écriture, un refus ou une annulation, et l'oubli des corrections retenues.
- Deux corrections de fraîcheur dans `src/sandbox/structure.ts`, chacune avec un test qui échoue sans elle :
  - `appliquer-structure` oublie la lecture gardée avant d'appeler l'écriture, quelle que soit l'écriture. Avant, seul
    `pendantUneEcriture` la périmait : un accès qui n'appelle pas cette fonction laissait Ignorer refiltrer un catalogue d'avant l'écriture.
  - Une lecture dont une cible a été refusée n'est plus gardée pour Ignorer (`cataloguesAvecUnRefus`, rempli par `catalogueParLesLectures`).
    Avant, Ignorer refiltrait ce catalogue partiel même après la fin du refus. Le message de la lecture refusée n'a pas changé.
- D4.3b. `tests/relectureApresAppliquer.test.ts` joue chaque geste sur un fichier dont l'écriture et la lecture partagent les mêmes
  objets, puis compare le message `structure` de la relecture (`lire-structure` seul) à celui d'un Actualiser complet (`lire-releve`
  puis `lire-structure`) : constats, corrections et `aRelire`, ignorés, limites, dans l'ordre, par `deepEqual`. Chaque relecture compte
  une lecture des variables locales et une lecture par identifiant de chacune. Gestes : création, alias modifié, scope, renommage
  seul, renommage puis correction dans le même Appliquer, écriture partielle (une correction périmée, une écriture refusée, une
  création écrite), refus de lecture puis lecture permise, Ctrl+Z de l'Historique (le message retrouve celui d'avant l'écriture),
  Ctrl+Z de Figma. Le test « Ctrl+Z de Figma » consigne une limite de D4a : Ignorer refiltre la dernière lecture sans voir un Ctrl+Z
  ou un changement à la main, que seul l'Actualiser suivant relit. Aucune attente existante n'a changé.
- Absence de correction périmée : un second Appliquer des mêmes identifiants n'écrit rien (`correction-inconnue`) ; une demande
  refusée par une opération en cours n'écrit rien et garde la lecture gardée ; une écriture réussie, refusée ou qui lève oublie la
  lecture gardée ; une correction dont les scopes ont changé depuis la lecture saute en `fait-faux`, et la relecture la propose avec
  les scopes d'aujourd'hui.
- Commandes. `npm run build --workspace @ucm-kit/core` passe. `npx tsx --test tests/relectureApresAppliquer.test.ts` : 16 passent.
  `npm run test:paquet -- architect` : 1998 passent, 1 échoue (`tests/nomenclatureCheminsPublies.test.ts`, « dix mille variables et
  mille renommages », 529 ms sous charge ; 214 ms seul, il passe). `npm run typecheck` passe. `npm run stress:structure --workspace
  ucm-architect-plugin` : 28 cas, 17 tiennent, 11 écarts attendus (E-20, E-21, E-23, E-24), identique à l'arbre sans ce lot.
- Reste. Aucune voie ciblée : elle ne s'ouvrira qu'avec une preuve de parité pour le Ctrl+Z de Figma, que rien ne signale. Un
  Appliquer qui n'écrit que des renommages ne relit pas la structure, car `tokens/cochage.ts` (`ecrireLaStructure`) rentre sans envoyer
  `appliquer-structure` quand aucune case de structure n'est cochée : le panneau garde alors les noms d'avant jusqu'au prochain
  Actualiser. Le fichier est hors du lot. Une correction retenue avant un renommage garde sa variable par la clé ; l'écriture ne
  compare pas le nom, donc un scope calculé pour l'ancien rôle s'écrirait si le renommage change ce rôle. La lecture refusée envoie
  encore des constats « alias supprimé » pour la cible refusée : E11a (Lectures refusées) en est le lot.
