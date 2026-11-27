# Plan de P22 : pièces internes décrites en entier dans le contrat de l'hôte

Ce plan suit la piste P22 de `docs/notes/Recherches/Evolutions globales/pistes.json`, la [recherche](./RECHERCHE-PIECES-INTERNES.md), l'[étude du format](./ETUDE-FORMAT-DES-PIECES.md), la [critique](./CRITIQUE-PIECES-INTERNES.md) et l'[audit](./AUDIT-CONCEPTION-P22.md). Chaque case cochée porte le hash de son commit. Les numéros `F` et `D` renvoient à l'audit.

## Règle du plan

- Aucune donnée d'un client n'entre dans un fichier suivi par Git. Les tests et les mocks emploient des noms inventés ; les captures et les scripts de rejeu restent dans `_local/p22/`.
- Aucun lot de code ne commence avant les cases de l'étape 0 qu'il cite dans « Dépend de ».
- Aucun agent ne fait de geste dans Figma. Les seuls gestes du mainteneur sont l'essai du choix 6, le fichier de test et sa capture, l'essai R1 s'il est gardé, le réexport des composants et la recette sur le Playground.
- Chaque défaut reçoit un test qui échoue sans sa correction, écrit dans le lot qui le corrige.
- Un texte destiné au designer s'écrit dans la conversation principale, avec la skill `rediger-diagnostics-ucm`. L'implémenteur pose `TODO(texte)` dans le catalogue et le signale.
- Personne ne lance `test:ui`, ni `npm test` à la racine. Un `verificateur` lance la vérification complète avant chaque commit.
- Un lot ne commence pas tant que le précédent dont il dépend n'est pas commité. La conversation principale relit le diff, lance `npm run agents:diff` et commite par chemins explicites.
- Les paquets se publient une seule fois, à la fin du plan (case 11.2).

## Étape 0. Décisions du mainteneur

[DECISIONS-P22.md](./DECISIONS-P22.md) explique chaque décision en termes simples, avec la réponse recommandée et ce qu'elle change dans Figma.

- [ ] 0.1 (mainteneur). Choix 1 de la recherche : bloc `pieces` à la racine, distinct de `composes`. L'audit confirme la recommandation A.
- [ ] 0.2 (mainteneur). Choix 3 : pièces à plat. L'audit confirme A, avec les renvois imbriqués de F7.
- [ ] 0.3 (mainteneur). Choix 6 précisé par D2 : une définition du token du composant (F13), jugement par emplacement (F14), cas sans instance (F15), Exporter sans dossier désigné (F17). Le choix 4 option A ne vaut plus pour les couleurs.
- [ ] 0.4 (mainteneur). Choix 5 : garder `.` et `_`. L'audit confirme la recommandation.
- [ ] 0.5 (mainteneur). Parité : `<Pièce>Props` facultative, « pièce non comparée » sinon, avec F27 à F29.
- [ ] 0.6 (mainteneur). D1 et Q1 : critère du wrapper et de la pièce (F1, F4).
- [ ] 0.7 (mainteneur). D5 et Q2 : définition d'une propriété pour l'obligation de règles (F33), entrée d'une pièce sans propriété.
- [ ] 0.8 (mainteneur). D4, Q3 et Q4 : renvoi complet, parties entières, variante citée par `nodeId` (F6).
- [ ] 0.9 (mainteneur). Q5 : dépendances rangées dans leur entrée, avec le comptage de F27.
- [ ] 0.10 (mainteneur). D6 et Q6 : contenu par défaut d'un `SLOT` de l'hôte, `SLOT` d'une pièce rempli par l'hôte (F12).
- [ ] 0.11 (mainteneur). D3 : couleur et glyphe qu'un hôte ou une pièce pose dans une dépendance (F19 à F21).
- [ ] 0.12 (mainteneur). D7 : pièce partagée (F5).
- [x] 0.13 (mainteneur). D9 : noms tirés de la capture de Groupe (F41). Tranchée : noms inventés, historique purgé. (32df302d)
- [ ] 0.14 (mainteneur). D10 : garder ou retirer l'essai R1 (F42).
- [ ] 0.15 (attend P31). D8 : écriture de « Relier le composant » dans le maître ou dans l'instance (F32), après la maquette de P31 (case 2.1 de son plan).

## Étape 1. Essais, données et mesure

- [ ] 1.1 Le build de capture d'Architect oublie l'index des règles avant de capturer (F43).
  - Fichiers : `packages/plugin-architect/src/sandbox/capture.ts`, son test.
  - Test d'abord : une capture prise après une analyse contient les textes des pages des propriétaires rencontrés.
  - Fin : le rejeu de `_local/p22/scripts/exporter.ts` sur une nouvelle capture passe sans `REGLES`.
  - Commandes : `npm run test:paquet -- architect`.
  - Dépend de : rien. Agent : `implementeur`.
- [ ] 1.2 (mainteneur). Essai du choix 6 : poser des instances d'`Icon` avec règles dans `.sizeWrapperButton`, exporter Button, lire ce que le contrat publie pour la couleur des icônes. Il établit F19 à F21 sur Button : l'audit prévoit aucune couleur d'icône, aucune entrée `icons`, et l'avertissement « aucun calque de ce nom ». Capturer le Button modifié avec le build de 1.1, dans `_local/p22/`.
- [ ] 1.3 (mainteneur). Fournir le fichier de test de la recherche (§6) et sa capture : un hôte qui pose une pièce à au moins trois variantes et des booléens, dont une variante que l'hôte ne pose pas, et le bloc `.componentRules` de la pièce. Si le mainteneur l'accepte, le même fichier ajoute une pièce dans une pièce, une instance d'`Icon` repeinte dans la pièce, un `SLOT` de l'hôte dont le contenu par défaut est une pièce, et une pièce à axe unique.
- [ ] 1.4 (mainteneur). Essai R1 de la recherche, seulement si 0.14 le garde.
- [ ] 1.5 Protocole de mesure de la taille et du temps (F26).
  - Fichiers : script jetable dans `_local/p22/scripts/` ; mock aux noms inventés de même forme que `.Segment` (90 variantes, 4 axes, 3 booléens) dans `packages/plugin-exporter/tests/aides/`.
  - Mesure : taille sérialisée, temps d'analyse, temps de compaction, appels aux maîtres, pages chargées, sur la 14.0 et sur un contrat 15.0 simulé, pour Button, Groupe et le mock.
  - Fin : un tableau des chiffres et du protocole remis à la conversation principale, qui l'écrit au §7 de l'étude.
  - Dépend de : 1.1. Agent : `implementeur`.

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

- [ ] 3.1 Types et schéma de la 15.0.
  - Objectif : `Contract.pieces`, le type de l'entrée, `ChildStructure.piece`, le renvoi récursif dans `ContractVariant.pieces` (`slotPath`, `variant`, `values`, `view`, feuilles complètes selon 0.8, `pieces` imbriqués), `ContractSample.pieces`, `rendering.keyRoles` par entrée, la couleur fournie à une dépendance et le slot d'icône à `composes` selon 0.11.
  - Fichiers : `packages/kit/src/format/types.ts`, `packages/kit/schema/ucm-contract.schema.json` par `npm run schema`.
  - Tests d'abord : `packages/kit/tests/schema.test.ts` refuse le schéma périmé ; un contrat 15.0 fabriqué dans `packages/kit/tests/` est accepté, sans fixture dans `fixtures/contrats/` (F37).
  - Fin : le schéma régénéré est commité ; `npm run typecheck` passe.
  - Commandes : `npm run schema`, `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`.
  - Dépend de : 0.1, 0.2, 0.8, 0.10, 0.11. Agent : `implementeur`.
- [ ] 3.2 Une seule résolution d'occurrence dans le kit (F9, F10, F25, F28).
  - Objectif : `variant-views.mjs` rend la vue effective à partir du contrat, de l'entrée, du variant et du renvoi, déplie les pièces avec une pile d'occurrences, refuse un cycle avant le dépliage et applique la borne de profondeur au chemin déplié ; la table des champs de racine (F9) et la règle `values` contre `visibilityProp` (F10) y vivent.
  - Fichiers : `packages/kit/src/lecteurs/variant-views.mjs`, son `index.d.mts`, tests du kit.
  - Tests d'abord : renvoi vers une variante absente, entrée jamais atteinte, adresse hors de l'arbre de la pièce, cycle direct et indirect, catalogue partagé par deux entrées aux props différentes, effacement d'une feuille, pièce imbriquée remplacée, opacité et taille remplacées sur l'instance.
  - Documents : FORMAT.md, nouvelle section des pièces internes et table des champs de racine.
  - Commandes : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`.
  - Dépend de : 3.1. Agent : `implementeur-exigeant` (le moteur, les diagnostics et le dépliage lisent la même règle).
- [ ] 3.3 Validation et lecteurs du kit.
  - Fichiers : `validation-contrat.mjs`, `validation-echantillons.mjs`, `validation-graphe-contrats.mjs` (union des cibles, cycles de `pieces`), `diagnostic-contrastes.mjs` (fond au chemin déplié, `keyRoles` de l'entrée), `caracteristiques.mjs`, `schema-contrat.mjs`, dans `packages/kit/src/lecteurs/`.
  - Tests d'abord : les entrées orphelines se comptent sur tout le contrat ; un contraste se mesure contre le fond posé par l'hôte à la racine d'une pièce.
  - Commandes : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`.
  - Dépend de : 3.2. Agent : `implementeur-exigeant`.

## Étape 4. Classification des imbriqués

- [ ] 4.1 Un seul prédicat de classification, lu par le socle et par Architect (F1 à F4, F33).
  - Objectif : ordre dépendance non préfixée, wrapper élu selon 0.6, pièce, détail ; une pièce préfixée n'est jamais une dépendance ; une propriété compte selon 0.7.
  - Fichiers : `packages/kit/src/referentiel/composition.ts`, `packages/plugin-socle/src/composant/contract/componentTree.ts` (`releverLesFaitsDUnImbrique`, `scoreWrapper`), `composedComponents.ts` (`estContracte`, `indexContractedNames`), `imbriques.ts`, `packages/plugin-architect/src/imbriquesDuReleve.ts`, `packages/kit/src/controles/nommage.ts` (`estUnePieceInterne`).
  - Invariants changés : `packages/kit/invariants/referentiel.md` si la règle y est citée ; en-tête de `composition.ts` selon 0.12.
  - Tests d'abord, sur des mocks aux noms inventés de la forme des captures : un wrapper à axe de tailles posé une fois par variant reste wrapper ; une pièce à padding lié posée trois fois par variant devient pièce ; une pièce à rayon lié dans quelques variants devient pièce ; une pièce préfixée avec règles reste pièce ; une pièce à axe unique n'a pas de propriété ; le socle et Architect rendent la même sorte sur chaque mock.
  - Fin : `packages/kit/tests/composition.test.ts`, `packages/plugin-socle/tests/imbriquesParLeKit.test.ts`, `packages/plugin-architect/tests/releveDuComposant.test.ts` passent ; le rejeu de `sortes.ts` sur les deux captures rend `wrapper-de-dimensions` pour `.sizeWrapperButton` seul.
  - Documents : FORMAT.md §3 et « Composition et dépendances », `packages/plugin-exporter/SPEC.md` (table « Quelles propriétés publiées reçoivent une règle »), `packages/plugin-architect/SPEC.md`.
  - Commandes : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- socle`, `npm run test:paquet -- architect`.
  - Dépend de : 0.6, 0.7, 0.12, 2.2. Agent : `implementeur-exigeant`.
- [ ] 4.2 Un axe propagé du wrapper ne se signale plus comme une collision (F23).
  - Fichiers : `packages/plugin-socle/src/composant/contract/propertySurface.ts` et son diagnostic.
  - Test d'abord : un wrapper dont chaque instance suit la valeur d'axe de l'hôte ne produit pas « renommez l'une des deux ».
  - Textes : conversation principale.
  - Dépend de : 4.1. Agent : `implementeur`.

## Étape 5. Moteur du socle

- [ ] 5.1 Analyse de chaque pièce avec les ressources de l'hôte (F24, F42).
  - Objectif : `calculerLAnalyse` analyse l'hôte puis chaque pièce dans l'ordre de première rencontre ; l'index des règles, l'index des variables et la carte des maîtres se partagent ; la page de chaque pièce se charge par le chemin existant ; le budget d'Architect compte les variants des pièces, et une pièce coupée rend l'analyse `partielle`.
  - Fichiers : `packages/plugin-socle/src/composant/analyse/resultat.ts`, `contract/budget.ts`, `contract/exportComponent.ts`.
  - Tests d'abord : `packages/plugin-exporter/tests/budgetEtAnnulation.test.ts` reçoit une pièce dont les variants dépassent le budget ; une pièce rangée sur une autre page se lit après `loadAsync`.
  - Invariants : `packages/plugin-exporter/invariants/composition.md` (pages des maîtres seulement, `loadAllPagesAsync` refusé).
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 3.1, 4.1. Agent : `implementeur-exigeant`.
- [ ] 5.2 Arrêt aux pièces, slot `piece` et renvoi (F6 à F9, F11, F12).
  - Objectif : le parcours de l'hôte s'arrête à une instance de pièce et publie le slot `piece` ; les liaisons traversantes se relèvent avant l'arrêt et se rattachent par l'identifiant Figma de la propriété ; chaque slot `piece` de l'arbre publié reçoit un renvoi complet, y compris masqué par une propriété ; les renvois imbriqués se relèvent par comparaison à la variante posée par le maître intermédiaire ; le contenu par défaut d'un `SLOT` de l'hôte suit 0.10.
  - Fichiers : `contract/exportableNodes.ts`, `extractLayout.ts`, `structureTree.ts`, `extractVariantTokens.ts`, `propertyBindings.ts`, `extractSamples.ts`, dans `packages/plugin-socle/src/composant/`.
  - Tests d'abord : critique §5 (pièce `COMPONENT` seule, variante jamais posée, deux occurrences du même maître, suppression du dernier fill, pièce imbriquée remplacée, booléen local et propriété de l'hôte sur un calque intérieur, propriété exposée à deux niveaux, visibilité surchargée sans propriété, opacité ramenée à 100 %, taille remplacée), et une pièce masquée par une prop de l'hôte.
  - Invariants changés : `packages/plugin-exporter/invariants/portee-du-contrat.md` si 0.8 retient B ; `arbre-des-slots.md` pour le slot `piece`.
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 0.8, 0.10, 3.2, 5.1. Agent : `implementeur-exigeant`.
- [ ] 5.3 Compaction partagée et assemblage de `pieces` (F28).
  - Fichiers : `contract/compactVariants.ts` (tables reçues en paramètre, `nodeSuffix` calculé sur toutes les occurrences), `contract/elideNeutrals.ts` (`CATALOGUES_DE_VUES`), `contract/publication.ts`, `contract/colorKeys.ts` (clés décidées par composant).
  - Tests d'abord : une définition de liaison citée par l'hôte et par une pièce garde un `nodeSuffix` juste pour les deux ; une clé de la pièce ne s'allonge pas à cause d'une couleur de l'hôte.
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 5.2. Agent : `implementeur-exigeant`.
- [ ] 5.4 Couleurs selon le choix 6 précisé (F13 à F15, F17, F18).
  - Objectif : une fonction du kit dit si un token est du composant hôte ; le moteur juge chaque emplacement de pièce (chemin, champ, indice) sur tout le set ; réel publié, aperçu ignoré, cas 3 averti ; sans dossier désigné hors d'un fichier UCM, le moteur ne juge que la surcharge.
  - Fichiers : `packages/kit/src/controles/nommage.ts` (fonction partagée), `packages/plugin-socle/src/composant/contract/extractVariantTokens.ts` et un module de jugement, catalogue de textes.
  - Tests d'abord : un mock « wrapper » dont trois variantes portent des aperçus surchargés dans la seule variante posée ne produit aucun avertissement ; un mock « pièce » dont une couleur générique vit dans une variante non posée avertit une fois par emplacement ; une couleur liée au dossier de l'hôte se publie ; un fichier libre sans désignation n'avertit pas.
  - Textes : conversation principale.
  - Documents : FORMAT.md §2, `packages/plugin-exporter/invariants/couleurs.md`, `packages/plugin-exporter/SPEC.md`.
  - Commandes : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 0.3, 5.2. Agent : `implementeur-exigeant`.
- [ ] 5.4b (attend P31). L'Exporter lit la collection et le dossier des composants que le designer désigne dans Architect (`ESPACE_ARCHITECT`), quand P31 range cette désignation.
- [ ] 5.5 Couleur et glyphe posés dans une dépendance (F16, F19 à F21).
  - Objectif : selon 0.11, l'hôte ou la pièce publie la couleur qu'il pose sur chaque emplacement d'une dépendance, jugée par comparaison au maître du composant placé après échange ; une règle `@icons` peut viser le slot d'une dépendance et garde sa `runtimeProp` et son glyphe.
  - Fichiers : `contract/extractSlotTokens.ts`, `extractIconLayers.ts`, `mergeIconRules.ts`, `extractSamples.ts`, `composedComponents.ts`.
  - Tests d'abord : une icône échangée sans repeint ne publie aucune couleur ; une icône repeinte par un token de l'hôte publie ce token ; une surcharge héritée du maître de la pièce se lit malgré `overrides` vide ; une règle `@icons` sur une instance d'`Icon` garde `iconLeftName`.
  - Invariants changés : `packages/plugin-exporter/invariants/composition.md` (« Ses couleurs appartiennent à son contrat »), `echantillon.md`.
  - Documents : FORMAT.md, « La frontière avec la composition » et « Ce que le contrat ne dit pas d'une icône ».
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`.
  - Dépend de : 0.11, 5.2. Agent : `implementeur-exigeant`.
- [ ] 5.6 Règles d'usage des pièces dans le moteur (F34, F35).
  - Objectif : `extractRules` lit le bloc de la pièce sur sa page et le range dans l'entrée sous la forme d'`intent` ; une pièce à propriétés sans règles produit le point bloquant, avec un texte propre à la pièce ; l'analyse de l'hôte nomme les règles d'hôte qui documentent une prop de pièce.
  - Fichiers : `contract/extractRules.ts`, `contract/imbriques.ts`, `analyse/resultat.ts`, catalogue de textes.
  - Tests d'abord : `packages/plugin-socle/tests/reglesManquantes.test.ts` reçoit une pièce à propriétés sans bloc, un bloc de pièce sur une autre page, une règle d'hôte devenue orpheline.
  - Textes : conversation principale.
  - Commandes : `npm run test:paquet -- socle`, `npm run test:paquet -- architect`.
  - Dépend de : 4.1, 5.1. Agent : `implementeur`.
- [ ] 5.7 Identifiants, noms de slot et pièce sélectionnée seule (F29, F36).
  - Fichiers : `contract/slotNames.ts`, `contract/exportComponent.ts`, catalogue de textes.
  - Tests d'abord : deux pièces de même identifiant de code, ou une pièce et l'hôte, bloquent l'export en nommant les deux ; le slot d'une pièce ne commence pas par un tiret ; la sélection d'une pièce préfixée rend le refus prévu dans l'Exporter.
  - Textes : conversation principale.
  - Dépend de : 4.1. Agent : `implementeur`.
- [ ] 5.8 Lois et test d'ensemble du moteur (F40).
  - Fichiers : `packages/plugin-exporter/tests/lois.ts` (critère C en loi, adresses par entrée), `packages/plugin-exporter/tests/piecesInternes.test.ts` (nouveau, attentes explicites), le banc de l'ancien chemin.
  - Fin : chaque contrat du banc passe les lois ; le mock du critère de fin 1 (pièce à trois variantes, l'hôte n'en pose qu'une) publie les trois variantes et toutes les propriétés ; chaque instance renvoie à sa variante sans recopier sa description (critère de fin 2).
  - Commandes : `npm run test:paquet -- exporter`.
  - Dépend de : 5.2 à 5.7. Agent : `implementeur`.
- [ ] 5.9 Version 15.0, fenêtre et changelog (F37 à F39).
  - Fichiers : `packages/kit/src/format/version.ts`, `packages/kit/src/lecteurs/version-contrat.mjs` (borne basse 14.0), retrait de `packages/kit/fixtures/contrats/13.0/` et du code qui ne lit que la 13.0, `tests/fenetre-de-lecture.test.mjs` sur le corpus de 2.1, `docs/format/CHANGELOG-FORMAT.md` (classes 2, 3 et 4, props retirées par cas), `docs/format/COMPATIBILITE.md` (ordre d'une majeure du contrat).
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

- [ ] 7.1 Parité des pièces (F27, F29).
  - Objectif : les dépendances se comptent par occurrence dans chaque vue effective, pièces dépliées ; `<Pièce>Props` se compare quand elle existe, exportée ou non, sinon « pièce non comparée » ; un seul programme TypeScript pour toutes les pièces.
  - Fichiers : `packages/adapter-typescript/src/parite.mjs`, `packages/kit/src/lecteurs/diagnostic-parite.mjs`, tests.
  - Tests d'abord : une pièce répétée qui contient une dépendance compte deux occurrences ; une pièce sans interface rend « pièce non comparée ».
  - Commandes : `npm run test:paquet -- adapter`, `npm run test --workspace @ucm-kit/core`.
  - Dépend de : 0.5, 0.9, 3.2. Agent : `implementeur`.

## Étape 8. Architect

- [ ] 8.1 Relevé des pièces (F30, F24).
  - Objectif : Architect lit le set de chaque pièce posée comme celui d'un wrapper, avec l'hôte comme propriétaire des tokens, et compte ses variants dans le budget.
  - Fichiers : `packages/plugin-architect/src/imbriquesDuReleve.ts`, le relevé, `packages/kit/src/controles/releve.ts`.
  - Tests d'abord : l'analyse d'un hôte relève les calques du maître de sa pièce ; les C30 d'un calque de pièce restent après 4.1.
  - Commandes : `npm run test:paquet -- architect`, `npm run test --workspace @ucm-kit/core`.
  - Dépend de : 4.1, 5.1. Agent : `implementeur-exigeant`.
- [ ] 8.2 Couleurs d'aperçu non surchargées et couleurs du cas 3 (F13 à F15, F30).
  - Objectif : un constat du kit par emplacement, avec la définition partagée de 5.4, dans un fichier UCM.
  - Fichiers : `packages/kit/src/controles/` (nouveau code ou extension de C25, `codes.ts`), Architect, catalogues de textes.
  - Tests d'abord : `packages/kit/tests/controles-composant.test.ts` reçoit les mocks de 5.4 ; le wrapper n'a aucun constat, la pièce en a un par emplacement générique.
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
- [ ] 9.2 Corriger `pistes.json` : le point « créer un contrat de fixture » vise un contrat fabriqué par un test du kit (F37), et la piste reçoit le champ `plan`. Conversation principale.

## Étape 10. Preuves sur les captures

- [ ] 10.1 Rejouer l'export 15.0 sur les captures de Button, de Groupe, de 1.2 et de 1.3, dans `_local/p22/`, et comparer à la liste d'attentes de l'audit (§6). Rendre les écarts à la conversation principale. Agent : `verificateur`.
- [ ] 10.2 Refaire la mesure de 1.5 sur le moteur 15.0 et la remettre à la conversation principale pour le §7 de l'étude. Agent : `implementeur`.
- [ ] 10.3 (mainteneur). Fixer les seuils de taille et de temps d'après 10.2.

## Étape 11. Sortie

- [ ] 11.1 Vérification complète sur un arbre stable : `npm run typecheck`, `npm run build`, `npm run schema` sans écart, tests du kit, tests racine, `npm run test:paquet` sur `socle`, `exporter`, `architect`, `cli` et `adapter` (critère de fin 3). Agent : `verificateur`.
- [ ] 11.2 Publier ensemble `@ucm-kit/core`, `@ucm-kit/cli` et `@ucm-kit/adapter-typescript`, kit d'abord, avec la skill `publier-paquets`. Conversation principale.
- [ ] 11.3 Construire les plugins Exporter et Architect par `npm run build:plugin -- exporter` et `npm run build:plugin -- architect`. Agent : `verificateur`.
- [ ] 11.4 (mainteneur). Réexporter les composants du Playground, dont Button avec `.Ring` et ses icônes `Icon`, avec le plugin construit en 11.3.
- [ ] 11.5 (mainteneur). Recette sur UCM-Playground selon `docs/guides/RECETTE.md` : monter la CLI épinglée, adapter le code aux props retirées, et vérifier que `ucm check` passe sur le Button réexporté (critère de fin 4).
- [ ] 11.6 Archiver le sujet avec la skill `archiver-un-sujet`. Conversation principale.

## Couverture

| Critère de fin de P22 | Cases |
|---|---|
| Un hôte qui embarque une pièce à 3 variantes publie les 3 variantes et toutes ses propriétés, même s'il n'en pose qu'une | 4.1, 5.1, 5.2, 5.8 |
| Chaque instance posée renvoie à sa variante sans recopier sa description | 3.1, 5.2, 5.8 |
| `npm run schema` régénère le schéma, et les tests passent avec la nouvelle version | 3.1, 5.9, 11.1 |
| Un réexport réel d'un composant avec une pièce interne passe `ucm check` | 0.6, 0.7, 4.1, 11.4, 11.5 |

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
