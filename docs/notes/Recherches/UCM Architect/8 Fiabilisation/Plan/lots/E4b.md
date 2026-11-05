# E4b. Échecs, ignorés et alias à écrire

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E4a, E3d.

Fichiers : `packages/plugin-architect/src/sandbox/structure.ts`, `packages/plugin-architect/src/ecriture/structure.ts`,
`packages/plugin-architect/src/ui/structure/`, `packages/plugin-architect/src/ui/textes/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E4.2 Chaque motif de saut a un texte (E-24). Une lecture qui lève, un catalogue `null` ou un refus de Figma ne disent plus « Rien à
  régler » (E-23).
- [x] E4.3 Ignorer la proposition d'un constat de scopes range le constat sous Ignorés (E-21).
- [x] E4.5 La correction `alias-de-mode` part à l'écriture (E-28).

Fin : `npm run test:paquet -- architect` passe. Les régressions couvrent les cases de ce sous-lot. La galerie expose ses cartes et ses refus.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E4.2, motifs de saut (`motifDeSaut` de `packages/plugin-architect/src/ui/textes/structure.ts`) :
  - `occupe` : « Une autre écriture était en cours. Relancez Appliquer. »
  - `correction-inconnue` : « Cette correction ne correspond plus au fichier. Actualisez, puis recommencez. »
  - `non-pris-en-charge` : « Le plugin ne sait pas écrire cette correction. Faites-la dans la fenêtre Variables. »
  - `erreur` : « Figma a refusé l’écriture. Recommencez, ou faites-la dans la fenêtre Variables. »
- E4.2, lecture en échec, à la place de « Rien à régler dans la fenêtre Variables de Figma. » :
  - lecture qui lève : « Le plugin n’a pas pu lire les variables du fichier. Actualisez pour relancer la lecture. »
  - catalogue `null` : « Le plugin n’a pas pu lire la library de tokens. Vérifiez-la dans la Configuration, puis actualisez. »
  - refus de Figma : « Figma a refusé la lecture des variables. Actualisez pour relancer la lecture. »

## Avancement

Lecture S2 faite. `packages/plugin-architect/scripts/stress/f2-structure/chaine.ts` fournit les conteneurs de Constats mais pas `tokens.choix`. Le harnais sera modifié pour suivre le contrat courant du panneau. La coquille de production reste hors du lot. E4c est relu, son second constat de retrait ne relève pas de S2.

Le build du kit passe. Avant correction, les 28 cas du harnais lèvent dans `tokens.attente`, ajouté par G2 depuis la demande S2. Le double doit fournir aussi `attente` et `surAttente`. `packages/plugin-architect/tests/stressChaineStructure.test.ts` ajoute trois régressions P13 (lecture levée, catalogue absent, refus de Figma).

Prochaine action : `npx tsx --test packages/plugin-architect/tests/stressChaineStructure.test.ts`.

Les trois régressions échouent avant correction dans `tokens.attente`. `packages/plugin-architect/scripts/stress/f2-structure/chaine.ts` `lancerLaChaine` fournit maintenant le choix Tout et l'absence d'attente de structure et de noms. Le harnais et le nouveau test sont modifiés, non commités.

Prochaines actions : `npx tsx --test packages/plugin-architect/tests/stressChaineStructure.test.ts`, puis `npm run stress:structure --workspace ucm-architect-plugin`.

Les trois régressions passent. Le harnais retrouve P13, 3 cas sur 4 passent (D1-1, D1-2, D1-4). D1-3 garde les deux écarts de réglages déjà signalés par E4b. Le harnais complet compte 28 cas, 15 tiennent, 13 restent en écart et aucune exception. Les écarts P11, P14 et P9 restent hors de S2.

Prochaine action : `npx tsx --test packages/plugin-architect/tests/stressChaineStructure.test.ts` après retrait temporaire des trois membres du double, puis restauration et relance du même test.

Retrait vérifié, 3 échecs sur 3. La réparation est restaurée, 3 tests sur 3 passent.

Prochaines actions : `npm run typecheck --workspace ucm-architect-plugin`, `npm run test:paquet -- architect`, puis `npm run agents:diff`.

`npm run agents:diff` ne relève aucun chemin supprimé. Les documents d'Architect déjà relus pour S1 restent valables pour ce double ; `packages/kit/invariants/referentiel.md`, la règle C63 de `packages/kit/invariants/versionnage.md` et `packages/kit/README.md` sont relus pour les changements concurrents signalés. Aucune règle du produit ne change dans S2. Le diff du harnais est relu, `git diff --check` passe.

Le contrôle TypeScript échoue hors lot dans `packages/plugin-architect/tests/calculDesNomsClient.test.ts`, ligne 80, avec 3 accès à `never`. Les tests Architect tournent encore.

Prochaine action : `npm run typecheck --workspace ucm-architect-plugin` pour vérifier l'arbre concurrent une seconde fois.

La seconde vérification TypeScript reproduit les 3 erreurs hors lot. Les tests Architect rendent 2 208 tests, 2 204 réussites, 4 échecs hors lot. Les deux échecs déjà signalés en S1 restent présents. Deux autres apparaissent dans `packages/plugin-architect/tests/lectureAnticipeeDesLibraries.test.ts` et `packages/plugin-architect/tests/nomenclatureSession.test.ts`.

Prochaines actions : `npx tsx --test packages/plugin-architect/tests/lectureAnticipeeDesLibraries.test.ts`, puis `npx tsx --test packages/plugin-architect/tests/nomenclatureSession.test.ts`.

La lecture anticipée passe seule (21 tests sur 21). La session de Nomenclature reproduit son échec seule (26 réussites sur 27). Ces fichiers restent inchangés. Le harnais réparé, son test et ce lot sont prêts à commiter.

Fait, commit 9a5f32ab.

Prochaine action : `npm run build --workspace @ucm-kit/core`, puis `npm run stress:structure --workspace ucm-architect-plugin`.

E4.3 et E4.5 faites, non commitées. E4.2 reste ouverte : la lecture en échec est faite, mais cinq motifs de saut attendent leur texte. Rien n'est écrit dans le kit.

Fait :

- E4.2, lecture en échec. Le message `structure` porte `echec` (`messages/structure.ts`, type `EchecDeLecture`) : `lecture-levee` quand l'accès lève, `refus-de-figma` quand `getLocalVariablesAsync` lève (`RefusDeFigma` dans `sandbox/structure.ts` `catalogueParLesLectures`) ou quand un catalogue a été lu avec une variable refusée (`cataloguesAvecUnRefus`), `catalogue-absent` quand `Acces.catalogue` rend `null` sur un fichier UCM. `Acces.horsUcm` (rendu par `ACCES_DE_FIGMA` depuis `lireLaDeclaration`) distingue un fichier hors UCM, qui ne porte aucun échec. L'écran pose une alerte « À vérifier » en tête de l'onglet Constats (`ui/structure/index.ts`, `TEXTES.lectureDeStructureEchouee`) et `tokens.poserLaStructure` reçoit `partielle`, donc aucune catégorie ne se dit tenue.
- E4.2, motifs. `TEXTES.motifDeSaut` dit `occupe`, `correction-inconnue`, `non-pris-en-charge` et `erreur` avec les textes de la note. `ui/structure/corrections.ts` `appliquee` cite maintenant la variable de chaque ligne sautée (créations, crans, modes, scopes) ; une ligne que l'écran ne connaît plus dit son motif une fois.
- E4.3. Un constat de scopes sans correction (C63 `scopes`, C82 `scopes`) avait un genre inconnu de l'écran, donc aucune carte. `GROUPES` finit par `scopes` (nouveau groupe de À faire, qui reprend la catégorie Scopes) ; `lecture.ts` lit C63 `scopes` par son identifiant et son fait `scopes` ; la carte dit « Aujourd’hui, son scope est … » (ou « ses scopes sont … »), cite la variable et se range sous Ignorés comme les autres.
- E4.5. `ui/corrections/index.ts` envoie les lignes `alias-de-mode`. `sandbox/corrections.ts` les écrit par `ecrireLaStructure` (journal de structure, Historique, un point d'annulation) seulement quand leur constat est un C63, avec le nom lu en `nomsLus` ; tout autre `alias-de-mode` reste sauté `non-pris-en-charge`. `ui/corrections/modele.ts` donne à la carte un genre `alias` : « Lier <token> à <cible> », « En <mode> », le diff `brands/…` vers la variable du thème, aucun layer. Le résumé du lot dit « N correction(s) de structure ».

Décisions prises :

- E4.3 : la note dit « range le constat sous Ignorés », la table de couverture (E-21) et la propriété P11 du plan F2 disent « laisse son constat visible ». J'ai suivi la table et P11 : le constat reste visible avec sa phrase, et l'ignorer le range sous Ignorés par le geste existant. La carte n'a pas de bouton Ignorer en mode Tokens (menu réservé aux rôles absents) ; le geste n'est pas ajouté.
- E4.2 : un refus d'une seule variable (cible d'alias) compte comme `refus-de-figma` ; les constats lus restent affichés.
- E4.5 : « seulement les alias autorisés » devient : constat C63 et correction exacte du kit (une cible, sens établi). Un lot qui mêle liaisons et alias de mode pose deux points d'annulation, un par écriture.

Textes du designer absents de la note, à fournir :

- Motifs de saut sans phrase : `objet-change`, `fait-faux`, `cible-introuvable`, `non-ucm`, `journal-impossible`. Ils ne disent rien à l'écran tant que `TEXTES.motifDeSaut` ne les a pas. `RAISONS` de `sandbox/corrections.ts` n'a pas non plus `journal-impossible` (le mode Composant écrit maintenant des alias).
- Réglages illisibles (suite d'E-23, cas D1-3) : l'écran ne dit rien quand les réglages du fichier ne se lisent pas ; les ignorés réapparaissent et la création n'est plus proposée.
- Carte d'un constat de scopes sans proposition : le statut (le geste dans la fenêtre Variables). La phrase est composée de fragments existants ; le statut reste vide.
- Carte de l'alias de mode du mode Composant : phrase, ligne grise et résumé réemploient « Lier … à », « En … » et le mot « correction de structure » de la ligne de pied ; un texte propre au geste reste à écrire.

Tests : `tests/echecsIgnoresEtAliasDeStructure.test.ts` (24 tests). Chaque correction a été retirée une à une, et le test correspondant échoue (13 retraits). `tests/structure.test.ts`, `tests/structureLecture.test.ts` et `tests/tokensStructure.test.ts` suivent `GROUPES` et le catalogue null hors UCM.

Galerie : `t-lecture-impossible`, `t-lecture-library`, `t-lecture-refusee`, `t-motifs-de-saut`, `t-scopes-sans-proposition`, `c-alias-de-mode`, `c-alias-de-mode-ecrit` (140 états).

Commandes : `npm run typecheck --workspace ucm-architect-plugin` rend 0. `npm run test:paquet -- architect` : 2142 tests, 0 échec. `npm run galerie:plugin -- architect` construit 140 états, 0 situation sans écran. `npm run stress:structure` ne tient plus depuis la coquille à deux onglets (`tokens.choix` manque au faux panneau de `scripts/stress/f2-structure/chaine.ts`) ; son contrôle P13 lit maintenant `TEXTES.lectureDeStructureEchouee`. À réparer en E12.

Documents : `CARTE.md`, `SPEC.md` (intégrité de la structure) et `invariants/explorateur.md` d'Architect.

Reste : les cinq phrases de motif, la phrase des réglages illisibles, le statut de la carte de scopes ; relecture de la galerie par le mainteneur.

Textes posés par la conversation principale : les cinq motifs de saut manquants de E4.2 dans `TEXTES.motifDeSaut` (`src/ui/textes/structure.ts`), le statut de la carte de scopes (`reglerLesScopes`), et le statut du rôle en double, qui dit que les autres variables deviennent des alias de la gardée. Aucune confirmation n’est ajoutée avant une fusion : l’Historique la défait.
