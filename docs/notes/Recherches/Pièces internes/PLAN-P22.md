# Plan de P22 : pièces internes décrites en entier dans le contrat de l'hôte

Ce plan suit la piste P22 de `docs/notes/Recherches/Evolutions globales/pistes.json` et la [forme du contrat 15.0](./FORME-CONTRAT-15.md), arrêtée au commit 739a7712. La forme remplace les choix de format de la [recherche](./RECHERCHE-PIECES-INTERNES.md), de l'[étude du format](./ETUDE-FORMAT-DES-PIECES.md) et de l'[audit](./AUDIT-CONCEPTION-P22.md). Elle a passé le [stress test](./STRESS-TEST-CONTRAT-15.md), la [contre-expertise](./CONTRE-EXPERTISE-OPUS-15.md), la [confrontation](./CONFRONTATION-15.md), l'[étude de la règle des états](./ETUDE-REGLE-DES-ETATS.md) et la [mesure de la 14.0](./MESURE-14-CONTRE-15.md). Les numéros `F` et `D` renvoient à l'audit, les numéros `§` à la forme. Chaque case cochée porte le hash de son commit.

Les cases gardent le numéro de la première version du plan, que d'autres documents citent. Une case nouvelle prend le numéro libre suivant dans son étape.

## Règle du plan

- Aucune donnée d'un client n'entre dans un fichier suivi par Git. Les tests et les mocks emploient des noms inventés ; les captures et les scripts de rejeu restent dans `_local/p22/`.
- Aucun lot de code ne commence avant les cases de l'étape 0 et les lots du banc qu'il cite dans « Dépend de ».
- La forme fait référence. Un agent qui trouve une contradiction entre la forme et le code s'arrête et la rend à la conversation principale, qui tranche.
- Le moteur ne se teste sur aucun contrat commité. Les tests fabriquent leurs contrats depuis les cas inventés du banc.
- Aucun plugin ne contrôle la convention des états (§2.12). Architect signale seul une couleur de pièce du cas 3 (§2.7, case 8.2).
- Aucun agent ne fait de geste dans Figma. Les gestes du mainteneur sont les cases 1.2 et 1.3, le réexport des composants et la recette sur le Playground.
- Chaque défaut reçoit un test qui échoue sans sa correction, écrit dans le lot qui le corrige.
- Un texte destiné au designer s'écrit dans la conversation principale, avec la skill `rediger-diagnostics-ucm`. L'implémenteur pose `TODO(texte)` dans le catalogue et le signale.
- Personne ne lance `test:ui`, ni `npm test` à la racine. Un `verificateur` lance la vérification complète avant chaque commit.
- Un lot ne commence pas tant que le précédent dont il dépend n'est pas commité. La conversation principale relit le diff, lance `npm run agents:diff` et commite par chemins explicites.
- La 14.0 reste lisible jusqu'à la recette : la fenêtre du kit lit la 14.0 et la 15.0 (case 5.9).
- Les paquets se publient une seule fois, à la fin du plan (case 11.2).

## Économie de tokens

- Un lot par appel d'agent. Deux agents au plus en même temps, et jamais deux agents qui écrivent dans le même paquet.
- `implementeur` (Sonnet) par défaut. `implementeur-exigeant` quand le lot touche plusieurs lecteurs d'une même règle ; le plan le dit lot par lot. `executant` (Haiku) pour un remplacement listé. `verificateur` (Haiku) pour toute commande dont la sortie est longue.
- Le prompt d'un lot cite les sections de la forme à lire (par exemple §2.4 et §2.12), jamais le document entier, et la liste que rend `npm run agents:lire -- <chemins>`. L'agent ne lit ni les études, ni la confrontation, ni les journaux des laboratoires.
- La conversation principale écrit dans le prompt les cas de test et leurs attendus, tirés de la forme et du banc. L'agent ne les dérive pas lui-même.
- La conversation principale relit le diff et le rapport, jamais la transcription. Un `verificateur` relance les tests et rend un tableau.
- Deux lots d'une même étape aux fichiers disjoints peuvent tourner ensemble. La colonne « Dépend de » dit lesquels.
- Vérifier les quotas avant chaque étape. À l'arrêt, noter l'avancement dans `_local/p22/POINT-AVANCEMENT.txt`. Quand les quotas de Claude manquent, Codex peut reprendre un lot avec la skill `rediger-prompt-codex`, et sa case se coche avec son hash.

## Étape 0. Décisions du mainteneur

[DECISIONS-P22.md](./DECISIONS-P22.md) explique chaque décision en termes simples, avec la réponse recommandée et ce qu'elle change dans Figma.

- [x] 0.1 (mainteneur). Choix 1 de la recherche : bloc `pieces` à la racine, distinct de `composes`. L'audit confirme la recommandation A. (733c30ee)
- [x] 0.2 (mainteneur). Choix 3 : pièces à plat. L'audit confirme A, avec les renvois imbriqués de F7. (733c30ee)
- [x] 0.3 (mainteneur). Choix 6 précisé par D2 : une définition du token du composant (F13), jugement par emplacement (F14), cas sans instance (F15), Exporter sans dossier désigné (F17). Le choix 4 option A ne vaut plus pour les couleurs. (733c30ee)
- [x] 0.4 (mainteneur). Choix 5 : garder `.` et `_`. L'audit confirme la recommandation. (733c30ee)
- [x] 0.5 (mainteneur). Parité : `<Pièce>Props` facultative, « pièce non comparée » sinon, avec F27 à F29. (733c30ee)
- [x] 0.6 (mainteneur). D1 et Q1 : critère du wrapper et de la pièce (F1, F4). Option E de l'étude de D1. (d8a99844)
- [x] 0.7 (mainteneur). D5 et Q2 : définition d'une propriété pour l'obligation de règles (F33), entrée d'une pièce sans propriété. (d8a99844)
- [x] 0.8 (mainteneur). D4, Q3 et Q4 : renvoi complet, parties entières, variante citée par `nodeId` (F6). (733c30ee)
- [x] 0.9 (mainteneur). Q5 : dépendances rangées dans leur entrée, avec le comptage de F27. (11bc5902)
- [x] 0.10 (mainteneur). D6 et Q6 : contenu par défaut d'un `SLOT` de l'hôte, `SLOT` d'une pièce rempli par l'hôte (F12). (733c30ee)
- [x] 0.11 (mainteneur). D3 : couleur et glyphe qu'un hôte ou une pièce pose dans une dépendance (F19 à F21). (733c30ee)
- [x] 0.12 (mainteneur). D7 : pièce partagée (F5). (733c30ee)
- [x] 0.13 (mainteneur). D9 : noms tirés de la capture de Groupe (F41). Tranchée : noms inventés, historique purgé. (32df302d)
- [x] 0.14 (mainteneur). D10 : garder ou retirer l'essai R1 (F42). (733c30ee)
- [ ] 0.15 (attend P31). D8 : écriture de « Relier le composant » dans le maître ou dans l'instance (F32), après la maquette de P31 (case 2.1 de son plan).

## Étape 1. Banc de test, essais et données

Le banc reprend sous une forme permanente les outils des laboratoires du stress test, de la contre-expertise et de la confrontation (`_local/p22/codex/`, `_local/p22/opus/`, `_local/p22/confrontation/`). Il se construit avant le moteur 15.0, pour que chaque lot du moteur ait ses tests écrits d'avance.

- [ ] 1.0 Note de conception du banc de test, [CONCEPTION-BANC-DE-TEST.md](./CONCEPTION-BANC-DE-TEST.md). Elle dit ce que devient chaque outil des laboratoires (validateur, lecteur de résolution, générateur à graine, mutations, assemblages adverses, cas, modèle de vérité de la convention, couverture de l'API de Figma, comparaison 14.0 et 15.0), où il vit dans le dépôt, qui le lit, et ce qui reste dans `_local/`. Conversation principale ; le mainteneur la valide. Les lots du banc s'écrivent ensuite ici, à partir de 1.7.
- [ ] 1.1 Le build de capture d'Architect oublie l'index des règles avant de capturer (F43).
  - Fichiers : `packages/plugin-architect/src/sandbox/capture.ts`, son test.
  - Test d'abord : une capture prise après une analyse contient les textes des pages des propriétaires rencontrés.
  - Fin : le rejeu de `_local/p22/scripts/exporter.ts` sur une nouvelle capture passe sans `REGLES`.
  - Commandes : `npm run test:paquet -- architect`.
  - Dépend de : rien. Agent : `implementeur`.
- [ ] 1.2 (mainteneur). Essai du choix 6 : poser des instances d'`Icon` avec règles dans `.sizeWrapperButton`, exporter Button, lire ce que le contrat publie pour la couleur des icônes. Il établit F19 à F21 sur Button (§2.8). Capturer le Button modifié avec le build de 1.1, dans `_local/p22/`.
- [ ] 1.3 (mainteneur). Construire dans le composant `StressTest` d'UCM-Playground les 19 constructions de la confrontation (section « Constructions à ajouter à `StressTest` »), avec les pièces `.Cellule`, `.Pastille` et `.Puce`, puis capturer `StressTest` avec le build de 1.1, dans `_local/p22/`. Cette capture remplace le fichier de test de la recherche.
- 1.4 Retirée : la case 0.14 ne garde pas l'essai R1.
- [ ] 1.5 Protocole de mesure de la taille et du temps (F26).
  - Fichiers : script jetable dans `_local/p22/scripts/` ; mock aux noms inventés de même forme que `.Segment` (90 variantes, 4 axes, 3 booléens) dans `packages/plugin-exporter/tests/aides/`.
  - Mesure : taille sérialisée en octets UTF-8, temps d'analyse, temps de compaction, appels aux maîtres, pages chargées, sur la 14.0 et sur un contrat 15.0 simulé, pour Button, Groupe et le mock.
  - Fin : un tableau des chiffres et du protocole remis à la conversation principale, qui l'écrit au §5.1 de la forme.
  - Dépend de : 1.1. Agent : `implementeur`.
- [ ] 1.6 (attend 1.3). Trancher la valeur imposée égale à celle de la variante citée (A22d, §7 de la forme) d'après la construction 13. Si Figma liste le champ dans `overrides`, la forme reçoit le champ que l'Exporter publie, et la case 5.12 s'ouvre. Sinon, la case 5.12 se retire. Conversation principale ; le mainteneur valide.

## Étape 2. Préalables sur le moteur 14.0

- [ ] 2.1 Figer le corpus 14.0 avant tout changement du moteur (F37).
  - Objectif : un corpus N-1 pour la fenêtre 14.0 et 15.0.
  - Fichiers : `packages/kit/fixtures/contrats/14.0/` (contrats produits par le moteur courant sur les captures du Playground de `_local/recettes/`, Button et Alert, et sur toute autre capture du Playground que le mainteneur fournit), son `README.md` avec les empreintes SHA-256.
  - Invariants respectés : `packages/kit/invariants/corpus-de-test.md` (jamais rafraîchi, jamais comparé au moteur, non publié).
  - Fin : le dossier existe, ses empreintes correspondent, aucun test ne le lit encore.
  - Dépend de : rien. Agent : `implementeur`.
- [ ] 2.2 Un cadre n'emprunte la visibilité d'une dépendance que si elle est son unique contenu (F22).
  - Fichiers : `packages/plugin-socle/src/composant/contract/extractLayout.ts`, `slotRelations.ts`, leurs tests dans `packages/plugin-exporter/tests/`.
  - Tests d'abord : un cadre « icône dépendance et label » ne porte aucune `visibilityProp` de l'icône ; un `SLOT` lié à une prop de l'hôte qui contient une pièce dont l'icône a sa propre prop ne produit pas le diagnostic « deux propriétés différentes » ; le cas « Action » de l'Alert garde sa visibilité.
  - Invariants : `packages/plugin-exporter/invariants/composition.md` (cadre de dépendance), à préciser.
  - Documents : FORMAT.md, « Cadre de dépendance ».
  - Commandes : `npm run test:paquet -- exporter`, `npm run test:paquet -- socle`.
  - Dépend de : 2.1. Agent : `implementeur`.
- [ ] 2.3 (attend P33). Un diagnostic sur un calque de pièce ou de wrapper sélectionne le nœud du maître et nomme la pièce à ouvrir ; une épaisseur de contour par côté a son propre texte ; deux occurrences d'un même calque de pièce se nomment par leur variante (F31, F44). Ce lot ne change pas le contrat : il se fait avant les décisions de l'étape 0, en trois sous-lots. Le mainteneur le fait attendre P33, qui décide quels diagnostics l'Exporter garde.
  - Dépend de : rien. Agent : `implementeur`, un sous-lot par appel. Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`, `npm run test:paquet -- architect`.
  - [ ] 2.3a Épaisseur par côté sans variable. Quand aucun côté de `strokeWeight` n'est relié et que les épaisseurs diffèrent selon les côtés, `signalerSansVariable` (`packages/plugin-socle/src/composant/contract/nodeBindings.ts`) reçoit ce texte au lieu de « aucune variable Figma n'est reliée » : « Layer « Cadre », stroke weight : les côtés ont des épaisseurs différentes, et aucun n'est relié à une variable. » ; « Le développeur n'aura pas ces épaisseurs. » ; « Reliez chaque côté dont l'épaisseur n'est pas nulle à une variable, puis réexportez. » Test d'abord : un calque aux épaisseurs `[1, 0, 1, 1]` sans liaison rend ce texte ; une épaisseur unique sans liaison garde l'ancien.
  - [ ] 2.3b Le maître nommé et sélectionné. `sujet` (`packages/plugin-socle/src/composant/contract/localisation.ts`) reconnaît un calque posé dans une instance (identifiant `I…;…`) et remonte à l'instance la plus proche. Si le champ signalé n'est pas surchargé dans cette instance (`InstanceNode.overrides`), le point vise le calque du maître (dernier segment de l'identifiant), et son titre nomme le composant : « Layer « Cadre » du composant « .Segment », stroke weight : … ». Les cibles identiques se fusionnent : neuf calques d'instances donnent les trois calques du maître. Si le champ est surchargé, le point garde l'instance, comme aujourd'hui. `montrerLesCalques` (`packages/plugin-exporter/src/code.ts`) change déjà de page. Tests d'abord : un calque d'instance non surchargé vise le maître et nomme le composant ; un calque surchargé vise l'instance ; un maître d'une library garde l'instance.
  - [ ] 2.3c Deux occurrences nommées par leur variante. Le conflit de contour d'`extractSlotTokens.ts` nomme les deux calques par le composant et la variante qui les posent, et non deux fois le même nom : « Layer « Cadre » du composant « .Segment » (Position=Last), stroke : le token {…} a une autre épaisseur ou un autre alignement que sur « Cadre » (Position=First). » L'impact et l'action restent ceux d'aujourd'hui. Test d'abord : deux instances d'un même maître à deux variantes produisent un titre qui cite les deux variantes.
  - Textes : rédigés ici par la conversation principale selon la skill `rediger-diagnostics-ucm`, validés par le mainteneur avant le lot.


## Étape 3. Format 15.0 dans le kit

- [ ] 3.1 Types et schéma de la 15.0 (§6.2).
  - Objectif : `Contract.pieces`, `PieceEntry`, `ChildStructure.piece`, `PieceReference` (`slotPath`, `nodeId`, `variant`, `values`, `view`, `tokens`, `strokes`, `pieces`), `ContractVariant.pieces`, `PieceSource` et `PropMeta.source`, `PieceSample` et `ContractSample.pieces`, `ContractDiagnostic.slotPath`, `ContractReferenceStructure` sans `sizes`. Le JSDoc de chaque champ porte la phrase « Absence » des tables du §2. Les commentaires qui citent le wrapper élu changent.
  - Fichiers : `packages/kit/src/format/types.ts`, `packages/kit/schema/ucm-contract.schema.json` par `npm run schema`.
  - Tests d'abord : `packages/kit/tests/schema.test.ts` refuse le schéma périmé ; un contrat 15.0 fabriqué par le banc est accepté, sans fixture dans `fixtures/contrats/` (F37).
  - Fin : le schéma régénéré est commité ; `npm run typecheck` passe.
  - Commandes : `npm run schema`, `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`.
  - Dépend de : lots du banc qui fabriquent les contrats. Agent : `implementeur`.
- [ ] 3.2 Une seule résolution d'occurrence dans le kit (§2.12, F9, F10, F25, F28).
  - Objectif : `variant-views.mjs` porte les neuf étapes du §2.12. `contratDeLaPiece` prête les catalogues, `rendering` et la version de lecture. Les sources se résolvent de propriétaire en propriétaire (§2.5). La sélection est unique ou non résolue, jamais choisie. Les écarts se lisent par identité de calque et s'appliquent à la variante atteinte selon la convention d'UCM. La pile refuse un cycle, et la borne de 12 niveaux vaut sur le chemin déplié. Les identifiants imbriqués se joignent avec un seul `I` (§2.4). La table de la boîte du slot (§2.3) y vit.
  - Fichiers : `packages/kit/src/lecteurs/variant-views.mjs`, son `index.d.mts`, tests du kit.
  - Tests d'abord : les cas et les assemblages du banc ; les tirages à graine du banc rendent 0 faux contre le modèle de vérité de la convention ; un renvoi sans `tokens` ne prend pas la couleur de la variante ; un axe exposé non réglé garde la variante citée ; deux frères de même nom laissent le renvoi non résolu.
  - Documents : FORMAT.md, section « Pièces internes » (§2.2 à §2.4 et §2.12), avec la phrase de la convention du §6.2.
  - Commandes : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`.
  - Dépend de : 3.1. Agent : `implementeur-exigeant` (le moteur, la validation, les contrastes et la parité lisent la même résolution).
- [ ] 3.3 Validation et lecteurs du kit (§2.13, §6.1).
  - Objectif : les 16 refus du §2.13, dont la clé répétée lue avant `JSON.parse` (point 13) et la perte regroupée dont le compte diffère (point 15) ; le graphe fait l'union des `composes` de l'hôte et de ses entrées, refuse un cycle de `pieces` et valide une source vers une dépendance contre son contrat public, avec un résultat incomplet si ce contrat manque ; `samples[].pieces` adressé par le `slotPath` d'un renvoi ; les axes de modes transitifs des dépendances de pièces ; le fond d'un contraste au chemin déplié ; la table des caractéristiques et les listes du contrôle du code reçoivent les champs nouveaux.
  - Fichiers : `validation-contrat.mjs`, `validation-echantillons.mjs`, `validation-graphe-contrats.mjs`, `modes-tokens.mjs`, `diagnostic-contrastes.mjs`, `caracteristiques.mjs`, `controle-du-code-listes.mjs`, `schema-contrat.mjs`, dans `packages/kit/src/lecteurs/`.
  - Tests d'abord : chaque mutation du banc est refusée ou admise comme la forme le dit ; les deux mutations que le contrat seul ne décide pas (identifiant hors instance, clé exposée prise par l'hôte) restent aux tests du moteur ; les entrées orphelines se comptent sur tout le contrat.
  - Commandes : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`.
  - Dépend de : 3.2. Agent : `implementeur-exigeant`.
- [ ] 3.4 Lecteurs de la CLI et aides (§6.1).
  - Objectif : `ligneDeDiagnostic` lit une perte regroupée avec son `slotPath` et la liste de ses variantes (§2.11) ; `ucm icons` lit `figmaName` dans `pieces.*.icons` ; le guide et `procedure.md` donnent l'ordre de lecture d'un hôte, puis de ses pièces, et la règle de l'occurrence ; les aides de la ligne « Aides de la CLI » du §6.1 suivent la forme.
  - Fichiers : `packages/cli/src/guide.mjs`, `packages/cli/src/icons.mjs`, `packages/cli/procedure.md`, `packages/cli/aides/`, `packages/kit/src/lecteurs/avertissements-export.mjs`.
  - Tests d'abord : une perte regroupée sur un contrat du banc s'affiche avec son adresse et « Dans N variantes. » ; `ucm icons` liste le glyphe d'une icône posée dans une pièce.
  - Commandes : `npm run test:paquet -- cli`, `npm run test --workspace @ucm-kit/core`.
  - Dépend de : 3.3. Agent : `implementeur`.

## Étape 4. Classification des imbriqués

- [ ] 4.1 Un seul prédicat de classification, lu par le socle et par Architect (0.6 option E, F1 à F4, F33).
  - Objectif : une instance non préfixée est une dépendance ; toute autre instance préfixée est une pièce ; le reste est du détail. Le tri du wrapper disparaît (`scoreWrapper`, sorte `wrapper-de-dimensions`). L'exposition remplit seulement l'API de l'hôte. Une propriété compte selon 0.7.
  - Fichiers : `packages/kit/src/referentiel/composition.ts`, `packages/plugin-socle/src/composant/contract/componentTree.ts` (`releverLesFaitsDUnImbrique`, `scoreWrapper`), `composedComponents.ts` (`estContracte`, `indexContractedNames`), `imbriques.ts`, `packages/plugin-architect/src/imbriquesDuReleve.ts`, `packages/kit/src/controles/nommage.ts` (`estUnePieceInterne`).
  - Invariants changés : `packages/kit/invariants/referentiel.md` si la règle y est citée ; en-tête de `composition.ts` selon 0.12.
  - Tests d'abord, sur des mocks aux noms inventés de la forme des captures : une pièce à axe de tailles exposée, une pièce posée trois fois par variant et une pièce non exposée deviennent toutes trois des pièces ; une pièce préfixée avec règles reste pièce ; une pièce à axe unique n'a pas de propriété ; le socle et Architect rendent la même sorte sur chaque mock.
  - Fin : `packages/kit/tests/composition.test.ts`, `packages/plugin-socle/tests/imbriquesParLeKit.test.ts`, `packages/plugin-architect/tests/releveDuComposant.test.ts` passent ; le rejeu de `sortes.ts` sur les captures rend une pièce pour `.sizeWrapperButton`, `.Ring` et `.Segment`.
  - Documents : FORMAT.md §3 et « Composition et dépendances », `packages/plugin-exporter/SPEC.md` (table « Quelles propriétés publiées reçoivent une règle »), `packages/plugin-architect/SPEC.md`.
  - Commandes : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- socle`, `npm run test:paquet -- architect`.
  - Dépend de : 0.6, 0.7, 0.12, 2.2. Agent : `implementeur-exigeant`.
- [ ] 4.2 Clés des props exposées (§2.5, F23).
  - Objectif : les props propres gardent leur clé ; les instances exposées se lisent dans l'ordre de l'arbre publié ; une clé déjà prise reçoit le préfixe du slot, puis le plus petit suffixe libre ; `source.prop` garde la clé publique. Le traitement de l'axe propagé du wrapper se retire, et les collisions réelles restent signalées.
  - Fichiers : `packages/plugin-socle/src/composant/contract/propertySurface.ts` et son diagnostic.
  - Tests d'abord : un hôte à axe `size` donne `size` et `sizewrapperbuttonSize` (A11) ; deux instances exposées du même set donnent `selected` et `segment2Selected` ; une instance exposée dans une partie des variants publie ses props et une perte L6 ; aucun « renommez l'une des deux » pour un axe exposé.
  - Textes : conversation principale.
  - Dépend de : 4.1. Agent : `implementeur`.

## Étape 5. Moteur du socle

- [ ] 5.1 Analyse de chaque pièce avec les ressources de l'hôte (F24, F42).
  - Objectif : `calculerLAnalyse` analyse l'hôte puis chaque pièce dans l'ordre de première rencontre, variantes non posées comprises ; l'index des règles, l'index des variables et la carte des maîtres se partagent ; la page de chaque pièce se charge par le chemin existant ; le budget d'Architect compte les variants des pièces, et une pièce coupée rend l'analyse `partielle`.
  - Fichiers : `packages/plugin-socle/src/composant/analyse/resultat.ts`, `contract/budget.ts`, `contract/exportComponent.ts`.
  - Tests d'abord : `packages/plugin-exporter/tests/budgetEtAnnulation.test.ts` reçoit une pièce dont les variants dépassent le budget ; une pièce rangée sur une autre page se lit après `loadAsync`.
  - Invariants : `packages/plugin-exporter/invariants/composition.md` (pages des maîtres seulement, `loadAllPagesAsync` refusé).
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 3.1, 4.1. Agent : `implementeur-exigeant`.
- [ ] 5.2 Arrêt aux pièces, slot `piece` et renvoi (§2.3, §2.4, §2.9, §2.10, F6 à F9, F11, F12).
  - Objectif : le parcours de l'hôte s'arrête à une instance de pièce et publie le slot `piece` avec les seuls champs de placement ; chaque slot `piece` publié reçoit un renvoi complet, masqué par une prop compris ; `values` porte les booléens et les échanges de l'API de la pièce, jamais les axes ; les liaisons d'une prop exposée passent à la variante de la pièce, avec l'identifiant joint ; les renvois imbriqués se relèvent contre la variante que le maître intermédiaire pose ; le contenu par défaut d'un `SLOT` de l'hôte reçoit ses renvois ; l'échantillon d'une occurrence ne garde que ses écarts.
  - Fichiers : `contract/exportableNodes.ts`, `extractLayout.ts`, `structureTree.ts`, `extractVariantTokens.ts`, `propertyBindings.ts`, `extractSamples.ts`, dans `packages/plugin-socle/src/composant/`.
  - Tests d'abord : les attentes manuscrites du banc ; la liste de la critique, §5 (pièce `COMPONENT` seule, variante jamais posée, deux occurrences du même maître, suppression du dernier fill, pièce imbriquée remplacée, booléen local et propriété de l'hôte sur un calque intérieur, propriété exposée à deux niveaux, visibilité surchargée sans propriété, opacité ramenée à 100 %, taille remplacée) ; une pièce masquée par une prop de l'hôte.
  - Invariants changés : `packages/plugin-exporter/invariants/portee-du-contrat.md` ; `arbre-des-slots.md` pour le slot `piece`.
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 0.8, 0.10, 3.2, 4.2, 5.1. Agent : `implementeur-exigeant`.
- [ ] 5.3 Compaction partagée, clés de couleur par entrée et assemblage de `pieces` (§2.4, F28).
  - Fichiers : `contract/compactVariants.ts` (tables reçues en paramètre, `nodeSuffix` calculé sur toutes les occurrences), `contract/elideNeutrals.ts` (`CATALOGUES_DE_VUES`), `contract/publication.ts`, `contract/colorKeys.ts` (clés décidées sur les variantes et les renvois de chaque pièce).
  - Tests d'abord : une définition de liaison citée par l'hôte et par une pièce garde un `nodeSuffix` juste pour les deux ; une clé de la pièce ne s'allonge pas à cause d'une couleur de l'hôte.
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 5.2. Agent : `implementeur-exigeant`.
- [ ] 5.4 Couleurs d'une pièce selon D2 (§2.7, F13 à F15, F17, F18).
  - Objectif : une fonction du kit dit si un token est du composant hôte ; le moteur juge chaque emplacement (chemin, champ, indice) sur toutes les variantes du set, avec les variantes que chaque occurrence atteint ; une couleur réelle se publie, une couleur d'aperçu ne se publie nulle part, une anomalie se publie sans diagnostic ; dans un fichier libre sans dossier désigné, seul le remplacement compte.
  - Fichiers : `packages/kit/src/controles/nommage.ts` (fonction partagée), `packages/plugin-socle/src/composant/contract/extractVariantTokens.ts` et un module de jugement.
  - Tests d'abord : trois variantes à aperçus remplacés par toutes les occurrences ne publient rien ; une variante atteinte sans repeint publie sa couleur (A21) ; une couleur liée au dossier de l'hôte se publie ; une anomalie se publie sans entrée dans `meta.diagnostics`.
  - Documents : FORMAT.md §2, `packages/plugin-exporter/invariants/couleurs.md`, `packages/plugin-exporter/SPEC.md`.
  - Commandes : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 0.3, 5.2. Agent : `implementeur-exigeant`.
- [ ] 5.4b (attend P31). L'Exporter lit la collection et le dossier des composants que le designer désigne dans Architect (`ESPACE_ARCHITECT`), quand P31 range cette désignation.
- [ ] 5.5 Couleur et glyphe posés dans une dépendance (§2.8, F16, F19 à F21).
  - Objectif : selon 0.11, le composant qui pose une icône dépendance publie la couleur qu'il lui donne, jugée contre le maître du composant placé après échange ; la règle `@icons` peut viser le slot d'une dépendance et garde `runtimeProp` et son glyphe ; une autre surcharge de peinture dans une dépendance reçoit une perte.
  - Fichiers : `contract/extractSlotTokens.ts`, `extractIconLayers.ts`, `mergeIconRules.ts`, `extractSamples.ts`, `composedComponents.ts`.
  - Tests d'abord : une icône échangée sans repeint ne publie aucune couleur ; une icône repeinte par un token de l'hôte publie ce token ; une surcharge héritée du maître de la pièce se lit malgré `overrides` vide ; une règle `@icons` sur une instance d'`Icon` garde `iconLeftName`.
  - Invariants changés : `packages/plugin-exporter/invariants/composition.md` (« Ses couleurs appartiennent à son contrat »), `echantillon.md`.
  - Documents : FORMAT.md, « La frontière avec la composition » et « Ce que le contrat ne dit pas d'une icône ».
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 0.11, 5.2. Agent : `implementeur-exigeant`.
- [ ] 5.6 Règles d'usage des pièces dans le moteur (§2.2, F34, F35).
  - Objectif : `extractRules` lit le bloc de la pièce sur sa page et le range dans l'entrée sous la forme d'`intent` ; une pièce à propriétés sans règles produit le point bloquant, avec un texte propre à la pièce ; l'analyse de l'hôte nomme les règles d'hôte qui documentent une prop de pièce.
  - Fichiers : `contract/extractRules.ts`, `contract/imbriques.ts`, `analyse/resultat.ts`, catalogue de textes.
  - Tests d'abord : `packages/plugin-socle/tests/reglesManquantes.test.ts` reçoit une pièce à propriétés sans bloc, un bloc de pièce sur une autre page, une règle d'hôte devenue orpheline.
  - Textes : conversation principale.
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- architect`.
  - Dépend de : 4.1, 5.1. Agent : `implementeur`.
- [ ] 5.7 Identifiants, noms de slot et pièce sélectionnée seule (§2.3, F29, F36).
  - Fichiers : `contract/slotNames.ts`, `contract/exportComponent.ts`, catalogue de textes.
  - Tests d'abord : deux pièces de même identifiant de code, ou une pièce et l'hôte, bloquent l'export en nommant les deux ; le slot d'une pièce prend le nom du calque sans préfixe ; la sélection d'une pièce préfixée rend le refus prévu dans l'Exporter.
  - Textes : conversation principale.
  - Dépend de : 4.1. Agent : `implementeur`.
- [ ] 5.10 Pertes de l'hôte, des pièces et des occurrences (§2.11).
  - Objectif : le moteur rassemble les pertes de chaque propriétaire, variantes non posées comprises ; une occurrence reçoit une perte seulement si sa valeur effective diffère de la variante citée ; les pertes de maître se regroupent par classe, avec `slotPath` et « Dans N variantes. » ; les deux pertes d'état seules restent (sélection non unique, appariement ambigu) ; les constats du contrat 14.0 autonome que la 15.0 rend faux ne se publient pas.
  - Fichiers : le module de diagnostics du moteur dans `packages/plugin-socle/src/composant/contract/`, catalogue de textes.
  - Tests d'abord : un mock aux noms inventés de 90 variantes sans largeur de contour publie une perte regroupée ; une occurrence qui garde la largeur de sa variante n'en reçoit aucune ; une perte qui dépend de la valeur reste par variante ; les constats du dessin (mode forcé efficace, `SLOT` rempli, instance exposée, échange vers une pièce) ont chacun leur perte.
  - Textes : conversation principale.
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 5.2, 5.4. Agent : `implementeur-exigeant`.
- [ ] 5.11 Données de rendu et couverture de l'API de Figma (§2.14), en quatre sous-lots, un par appel.
  - Tests d'abord : la table de couverture du banc ; chaque propriété classée « perte » dans la table produit sa perte sur un double qui la porte.
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 5.10. Agent : `implementeur`.
  - [ ] 5.11a Contours et ombres : chaque côté lié publié, perte nommant `strokeWeight` ou le côté pour une valeur non liée, sans largeur inventée ; couleur d'ombre absente, une perte par style.
  - [ ] 5.11b Modes forcés : perte de `explicitVariableModes` quand une variable liée sous le calque, dans une variante atteinte, appartient à la collection forcée ; aucune perte sans variable liée.
  - [ ] 5.11c Transformations et types de nœuds : `relativeTransform` en miroir ou cisaillé, `scaleFactor` différent de 1, proportions d'une contrainte `scale`, `TEXT_PATH`, `TRANSFORM_GROUP`.
  - [ ] 5.11d Effets, grilles et animations : bruit, texture, flou progressif, `layoutGrids`, `numberOfFixedChildren`, `transform3d`, `scene3d`, animations et réactions.
- [ ] 5.12 (attend 1.6). L'Exporter lit les champs que Figma dit surchargés pour une valeur imposée égale à celle de la variante citée. La case se détaille ou se retire après 1.6.
- [ ] 5.8 Lois et test d'ensemble du moteur (F40).
  - Fichiers : `packages/plugin-exporter/tests/lois.ts`, `packages/plugin-exporter/tests/piecesInternes.test.ts` (nouveau, attentes explicites).
  - Objectif : les lois vérifient sur chaque sortie les occurrences masquées, les effacements, la boîte prioritaire, la cardinalité des renvois, les chaînes d'identifiants, les pertes des variantes non posées et l'accord entre les constats du dessin et les pertes publiées (§2.13, dernier paragraphe).
  - Fin : chaque contrat du banc passe les lois ; une pièce à trois variantes dont l'hôte n'en pose qu'une publie les trois variantes et toutes ses propriétés (critère de fin 1) ; chaque occurrence renvoie à sa variante sans recopier sa description (critère de fin 2).
  - Commandes : `npm run test:paquet -- exporter`.
  - Dépend de : 5.2 à 5.7, 5.10, 5.11. Agent : `implementeur`.
- [ ] 5.9 Version 15.0, fenêtre et changelog (§6.3, F37 à F39).
  - Fichiers : `packages/kit/src/format/version.ts`, `packages/kit/src/lecteurs/version-contrat.mjs` (borne basse 14.0), retrait de `packages/kit/fixtures/contrats/13.0/` et du code qui ne lit que la 13.0, `tests/fenetre-de-lecture.test.mjs` sur le corpus de 2.1, `docs/format/CHANGELOG-FORMAT.md` (classes 2, 3 et 4 du §6.3), `docs/format/COMPATIBILITE.md` (ordre de sortie d'une majeure).
  - Invariants : `packages/kit/invariants/corpus-de-test.md`, `versionnage.md`.
  - Fin : un contrat 14.0 du corpus est lu, un contrat 13.0 rend `ancien`, un 16.0 rend `recent`.
  - Commandes : `npm run schema`, `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`.
  - Dépend de : 2.1, 3.3, 5.8. Agent : `implementeur`.

## Étape 6. Création des règles d'usage

- [ ] 6.1 « Créer les règles d'usage » pose le bloc de chaque pièce à propriétés à côté de son maître (F34).
  - Objectif : un bloc par pièce, sur sa page, avec `[À compléter]` par propriété, et le texte d'une règle `@prop` de l'hôte de même clé exacte repris.
  - Fichiers : `packages/plugin-socle/src/composant/template/` (`modele.ts`, `sources.ts`, `ecriture.ts`), Architect `regles.ts`, catalogues de textes.
  - Invariants changés : `packages/plugin-exporter/invariants/ecriture-dans-le-document.md` (« Ce que la création écrit se défait d'un geste » devient vrai pour plusieurs conteneurs, ou la création s'arrête à l'hôte et propose les pièces une à une).
  - Tests d'abord : sur `figmaFaux`, une pièce à propriétés reçoit son bloc sur sa page ; une pièce sans propriété n'en reçoit pas ; un texte d'hôte de même clé est repris.
  - Textes : conversation principale.
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- architect`, `npm run test:paquet -- exporter`.
  - Dépend de : 4.1, 5.6. Agent : `implementeur-exigeant` (l'Exporter et Architect créent tous deux les règles).

## Étape 7. Adaptateur

- [ ] 7.1 Parité des pièces (§2.8, F27, F29).
  - Objectif : les dépendances se comptent par occurrence dans chaque vue effective, pièces dépliées, au maximum entre variantes ; `<Pièce>Props` se compare quand elle existe, exportée ou non, sinon « pièce non comparée » ; un seul programme TypeScript pour toutes les pièces.
  - Fichiers : `packages/adapter-typescript/src/parite.mjs`, `packages/kit/src/lecteurs/diagnostic-parite.mjs`, tests.
  - Tests d'abord : une pièce répétée qui contient une dépendance compte deux occurrences ; une pièce sans interface rend « pièce non comparée ».
  - Commandes : `npm run test:paquet -- adapter`, `npm run test --workspace @ucm-kit/core`.
  - Dépend de : 0.5, 0.9, 3.2. Agent : `implementeur`.
- [ ] 7.2 Génération des types des pièces (§6.1, ligne « Génération des types »).
  - Objectif : les unions des enums de chaque entrée se nomment par l'identifiant de la pièce ; une clé préfixée d'instance exposée donne son propre membre de `<Hôte>Props`.
  - Fichiers : `packages/adapter-typescript/src/generation.mjs`, `types-variants.mjs`, tests.
  - Tests d'abord : un contrat du banc à deux instances exposées génère `selected` et `segment2Selected` ; une entrée à axe `Position` génère son union nommée par la pièce.
  - Commandes : `npm run test:paquet -- adapter`.
  - Dépend de : 3.1, 4.2. Agent : `implementeur`.

## Étape 8. Architect

- [ ] 8.1 Relevé des pièces (F30, F24).
  - Objectif : Architect lit le set de chaque pièce posée, avec l'hôte comme propriétaire des tokens, et compte ses variants dans le budget.
  - Fichiers : `packages/plugin-architect/src/imbriquesDuReleve.ts`, le relevé, `packages/kit/src/controles/releve.ts`.
  - Tests d'abord : l'analyse d'un hôte relève les calques du maître de sa pièce ; les C30 d'un calque de pièce restent après 4.1.
  - Commandes : `npm run test:paquet -- architect`, `npm run test --workspace @ucm-kit/core`.
  - Dépend de : 4.1, 5.1. Agent : `implementeur-exigeant`.
- [ ] 8.2 Couleurs d'aperçu non remplacées et couleurs du cas 3 (§2.7, F13 à F15, F30).
  - Objectif : un constat du kit par emplacement, avec la définition partagée de 5.4, dans un fichier UCM. Architect est le seul à signaler une anomalie.
  - Fichiers : `packages/kit/src/controles/` (nouveau code ou extension de C25, `codes.ts`), Architect, catalogues de textes.
  - Tests d'abord : `packages/kit/tests/controles-composant.test.ts` reçoit les mocks de 5.4 ; une pièce entièrement d'aperçu n'a aucun constat, une anomalie en a un par emplacement.
  - Textes : conversation principale.
  - Commandes : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- architect`.
  - Dépend de : 0.3, 5.4, 8.1. Agent : `implementeur-exigeant`.
- [ ] 8.3 Couleurs peintes dans une instance (F20, P-a de P31).
  - Objectif : une couleur laissée en dur ou liée hors du composant dans une instance de pièce ou de dépendance reçoit un constat, après comparaison au maître du composant placé. Le constat est commun avec P-a de P31 : le premier des deux plans qui l'implémente coche l'autre case avec le même hash.
  - Fichiers : `packages/kit/src/controles/corrections.ts`, `couche.ts`, tests.
  - Tests d'abord : une icône dont la liaison a sauté dans une pièce reçoit le constat ; une icône échangée sans repeint n'en reçoit aucun.
  - Commandes : `npm run test --workspace @ucm-kit/core`, `npm run test:paquet -- architect`.
  - Dépend de : 0.11, 8.1. Agent : `implementeur-exigeant`.
- [ ] 8.4 (attend P31). Les emplacements de pièce entrent dans « Relier le composant », et la liaison s'écrit selon 0.15.
- [ ] 8.5 (attend P31). Les constats de 8.2 et 8.3 valent dans un fichier libre, avec le dossier que le designer désigne.

## Étape 9. Documents

- [ ] 9.1 Relecture d'ensemble des documents que les lots ont changés : FORMAT.md, CHANGELOG-FORMAT.md, COMPATIBILITE.md, les deux SPEC, les invariants cités, les cartes des paquets touchés, et `CONCEPT.md` §2, dont la phrase « chaque composant qui l'embarque publie ce qu'elle dessine » gagne toutes les variantes et propriétés de la pièce. Conversation principale, avec la skill `relire-le-style` et `npm run agents:diff`.
- [ ] 9.2 Corriger `pistes.json` : le point « créer un contrat de fixture » vise un contrat fabriqué par un test du kit (F37). Conversation principale.
- [ ] 9.3 `docs/guides/POUR-LES-DESIGNERS.md`, chapitre « Préparer un composant », reçoit le texte de la convention des états (§6.2). Conversation principale, avec la skill `rediger-diagnostics-ucm`.

## Étape 10. Preuves sur les captures

- [ ] 10.1 Rejouer l'export 15.0 sur les captures de Button, de Groupe, de 1.2 et de `StressTest` (1.3), dans `_local/p22/`, et comparer aux exemples du §3 de la forme et aux attentes de chaque construction. Rendre les écarts à la conversation principale. Agent : `verificateur`.
- [ ] 10.2 Refaire la mesure de 1.5 sur le moteur 15.0, et la comparaison de la 14.0 et de la 15.0 sur les mêmes captures, puis les remettre à la conversation principale pour le §5.1 de la forme et pour MESURE-14-CONTRE-15.md. Agent : `implementeur`.
- [ ] 10.3 (mainteneur). Fixer les seuils de taille et de temps d'après 10.2.

## Étape 11. Sortie

- [ ] 11.1 Vérification complète sur un arbre stable : `npm run typecheck`, `npm run build`, `npm run schema` sans écart, tests du kit, tests racine, `npm run test:paquet` sur `socle`, `exporter`, `architect`, `cli` et `adapter` (critère de fin 3). Agent : `verificateur`.
- [ ] 11.2 Publier ensemble `@ucm-kit/core`, `@ucm-kit/cli` et `@ucm-kit/adapter-typescript`, kit d'abord, avec la skill `publier-paquets`. Conversation principale.
- [ ] 11.3 Construire les plugins Exporter et Architect par `npm run build:plugin -- exporter` et `npm run build:plugin -- architect`. Agent : `verificateur`.
- [ ] 11.4 (mainteneur). Réexporter les composants du Playground, dont Button avec `.Ring` et ses icônes `Icon`, et `StressTest`, avec le plugin construit en 11.3.
- [ ] 11.5 (mainteneur). Recette sur UCM-Playground selon `docs/guides/RECETTE.md` : monter la CLI épinglée, adapter le code aux props retirées, et vérifier que `ucm check` passe sur le Button réexporté (critère de fin 4).
- [ ] 11.6 Archiver le sujet avec la skill `archiver-un-sujet`. Conversation principale.

## Couverture

| Critère de fin de P22 | Cases |
|---|---|
| Un hôte qui embarque une pièce à 3 variantes publie les 3 variantes et toutes ses propriétés, même s'il n'en pose qu'une | 4.1, 5.1, 5.2, 5.8 |
| Chaque instance posée renvoie à sa variante sans recopier sa description | 3.1, 5.2, 5.8 |
| `npm run schema` régénère le schéma, et les tests passent avec la nouvelle version | 3.1, 5.9, 11.1 |
| Un réexport réel d'un composant avec une pièce interne passe `ucm check` | 0.6, 0.7, 4.1, 11.4, 11.5 |

| Section de la forme | Cases |
|---|---|
| §2.1 racine, §2.2 entrée | 3.1, 3.3, 5.3, 5.6 |
| §2.3 slot `piece` | 3.2, 5.2, 5.7 |
| §2.4 renvoi | 3.1, 3.2, 5.2, 5.3 |
| §2.5 props exposées | 3.2, 4.2, 7.2 |
| §2.6 dimensions | 3.1, 3.3 |
| §2.7 couleurs d'une pièce | 5.4, 8.2 |
| §2.8 icônes et dépendances | 5.5, 7.1, 1.2 |
| §2.9 contenu d'un `SLOT` | 5.2, 5.10 |
| §2.10 échantillon | 3.3, 5.2 |
| §2.11 pertes | 3.3, 3.4, 5.10 |
| §2.12 résolution | 3.2, 1.6, 5.12 |
| §2.13 refus | 3.3, 5.8 |
| §2.14 données de rendu | 5.11 |
| §6.2 documents | 3.2, 5.9, 9.3 |

| Faille bloquante | Cases |
|---|---|
| F1 | 0.6, 4.1 |
| F2 | 4.1 |
| F6 | 0.8, 3.1, 5.2 |
| F7 | 3.1, 3.2, 5.2 |
| F8 | 5.2 |
| F13 | 0.3, 5.4, 5.4b |
| F14 | 0.3, 5.4, 8.2 |
| F19 | 0.11, 5.5 |
| F20 | 5.5, 8.3 |
| F21 | 0.11, 5.5 |
| F22 | 2.2 |
| F30 | 8.1, 8.2 |
| F37 | 2.1, 5.9, 9.2 |
