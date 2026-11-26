# Prompt : audit de la conception de P22 et plan d'implémentation

Ce prompt s'adresse à un agent Opus qui travaille seul, sans l'historique de la conversation qui l'a écrit. Il trouve toutes les failles de la conception des pièces internes (P22) et écrit le plan le plus complet et le plus sûr pour la traiter.

## 1. Ta mission

Tu rends deux fichiers, dans `docs/notes/Recherches/Pièces internes/` :

1. `AUDIT-CONCEPTION-P22.md` : chaque faille de la conception, prouvée, classée, avec sa correction.
2. `PLAN-P22.md` : le plan d'implémentation, en cases à cocher, qui traite chaque faille et chaque critère de fin de P22.

Tu ne modifies aucun autre fichier suivi par Git, tu n'écris aucun code de produit, tu ne commites rien et tu ne pousses rien. La conversation principale relit tes deux fichiers, les intègre et commite.

## 2. Le sujet

Un composant UCM embarque souvent d'autres composants. `sorteDeLImbrique` (`packages/kit/src/referentiel/composition.ts`) classe chaque imbriqué dans cet ordre : dépendance (un composant qui a ses règles d'usage et son propre contrat), wrapper de dimensions, pièce interne (nom préfixé par `.` ou `_`), détail. Le contrat 14.0 parcourt une pièce comme un calque de l'hôte : il ne publie que l'état où chaque variant de l'hôte la pose. Les variantes de la pièce, ses propriétés et ce que chacune change disparaissent, et le développeur invente l'API de la pièce.

P22 règle ce qu'un hôte publie de chaque composant qu'il embarque, et qui possède chaque valeur. La section 7 de la recherche le découpe en douze sous-sujets, de S1 à S12.

Le cas de référence est le Button du dépôt UCM-Playground (`../UCM-Playground`, à côté du dépôt) :

- `.sizeWrapperButton` a trois axes de taille. Il porte le texte et les icônes. Il n'est pas publié dans la library Figma et n'a ni règles ni contrat. `sorteDeLImbrique` le classe wrapper de dimensions, avant le préfixe.
- `Button` pose `.sizeWrapperButton` dans chaque variant. Il a ses règles et son contrat.
- Le maître de `.sizeWrapperButton` peint un fond gris et des couleurs primitives sur le texte et les icônes. Ce sont des couleurs d'aperçu : chaque variant de Button les surcharge toutes.
- Le mainteneur va remplacer les icônes de la pièce par des instances du composant `Icon`, qui a ses règles et son contrat.

Un second composant de test prend le principe opposé, et la conception doit traiter les deux sans erreur, ainsi que tout autre cas que tu trouves :

- `Groupe` a 3 variantes (axe `Theme`), un booléen `AvecMilieu` et une propriété `SLOT` `Middle`. Il pose 15 instances de la pièce `.Segment`, dont une dans le `SLOT`.
- `.Segment` a 90 variantes (axes `Selected`, `Theme`, `State`, `Position`) et trois booléens. Les instances posées n'en montrent que 10. La pièce porte tous les axes qui comptent pour les combinaisons que l'hôte permet de créer.
- Aucune instance ne surcharge le fond de `.Segment` : les couleurs du maître de la pièce sont réelles, au contraire de celles de `.sizeWrapperButton`.
- Les icônes de `.Segment` sont des instances d'`Icon` (90 variantes, axes `fontSize`, `Background`, `Color`) : leur couleur vient d'un axe de variante, et non d'une surcharge.

Les captures des deux composants sont dans `_local/p22/` (lis d'abord `_local/p22/LISEZMOI.md`). Elles se rejouent hors de Figma par `doubleDepuisCapture` (`packages/plugin-architect/tests/outils/capture.ts`) ; `_local/recettes/mesure-liaison.ts` montre comment rejouer l'analyse d'Architect sur une capture. Essaie aussi de rejouer l'export du contrat (`analyserLeComposant`, `packages/plugin-socle/src/composant/contract/exportComponent.ts`) sur le même double : si ça marche, chaque faille se prouve sur ces deux composants réels, et le contrat 14.0 que chacun publie aujourd'hui sert de point de départ. Si ça ne marche pas, dis pourquoi dans l'audit.

## 3. Ce que tu lis

Commence par `npm run agents:lire -- <chemins>` sur les chemins de code ci-dessous : la commande donne les guides et les invariants à lire. Lis ensuite en entier :

- `AGENTS.md` (bloc « Écrire »), `CONTRIBUTING.md` (sections « Travailler avec des agents », « Rédiger un document », « Interface du plugin »), `CONCEPT.md`.
- Les trois documents de P22 dans ce dossier : `RECHERCHE-PIECES-INTERNES.md`, `ETUDE-FORMAT-DES-PIECES.md`, `CRITIQUE-PIECES-INTERNES.md`. La critique liste déjà des défauts (C1 à C11) : vérifie chacun, ne le recopie pas.
- `docs/format/FORMAT.md` : sections « Tokens de variantes », « Layout » (wrapper de dimensions), « Composition et dépendances », l'échantillon et ses surcharges (« La frontière avec la composition »), les icônes (`@icons`, « Ce que le contrat ne dit pas d'une icône »). Puis `docs/format/COMPATIBILITE.md` et `docs/format/CHANGELOG-FORMAT.md`.
- `packages/plugin-exporter/SPEC.md` et ses invariants (`packages/plugin-exporter/invariants/`).
- La recherche de P31, `docs/notes/Recherches/Construction des composants/RECHERCHE-CONSTRUCTION-DES-COMPOSANTS.md`, sections 6 à 9 : la mesure qui montre qu'Architect ne juge aucune couleur peinte dans une instance, et l'expérience « Relier le composant » décidée pour le full UCM et l'agnostique.
- Le code : `packages/kit/src/referentiel/composition.ts` et `layers.ts` ; `packages/plugin-socle/src/composant/contract/` (au moins `imbriques.ts`, `componentTree.ts`, `exportableNodes.ts`, `composedComponents.ts`, `extractVariantTokens.ts`, `extractStructure.ts`, `structureTree.ts`, `extractSamples.ts`, `publication.ts`, `compactVariants.ts`, `elideNeutrals.ts`, `budget.ts`) ; `packages/plugin-socle/src/composant/analyse/` ; `packages/kit/src/format/types.ts` et `version.ts` ; `packages/kit/src/lecteurs/` (validation, vues) ; `packages/adapter-typescript/src/parite.mjs` ; dans Architect, `packages/kit/src/controles/` (`releve.ts`, `nommage.ts`, `corrections.ts`, `propagation.ts`, `mapping.ts`) et `packages/plugin-architect/SPEC.md`.
- Les contrats réels : `packages/kit/fixtures/contrats/13.0/Button.contract.json` et les `*.contract.json` du Playground.

## 4. Ce qui est décidé

Ne rouvre pas ces décisions. Signale seulement une faille qu'elles créeraient.

- Le préfixe décide du contrat, les propriétés décident des règles. Une pièce préfixée n'a jamais de contrat ; une pièce à propriétés a des règles, posées dans un bloc `.componentRules` à côté de son maître ; sans elles, l'export de l'hôte bloque ; « Créer les règles d'usage » couvre les pièces ; leurs règles vont dans l'entrée de la pièce, sous la forme du champ `intent`.
- `Icon` est un composant publié, avec règles et contrat : c'est une dépendance.
- Le format prend une version majeure (classe 2 de `COMPATIBILITE.md`).
- Une pièce partagée par plusieurs composants, ou venue d'une autre bibliothèque, sort du périmètre.
- Aucune supposition de mapping : une valeur que l'outil ne peut pas établir exactement devient une question ou un avertissement, jamais un choix silencieux.
- Les essais dans Figma et les migrations de fichiers Figma sont des gestes du mainteneur. Le plan ne confie aucun geste dans Figma à un agent, et n'en invente aucun que le mainteneur n'a pas accepté.
- Architect aura un mode agnostique (P31) : une règle de P22 qui touche Architect doit valoir dans un fichier déclaré UCM et dans un fichier libre.

## 5. Ce qui attend le mainteneur

Ce sont des recommandations, à éprouver comme le reste : les choix 1, 3, 4, 5 et 6 de la recherche, la recommandation sur la parité, et les questions Q1 à Q6 du §9 de l'étude. Le choix 6 est le plus récent. Il propose de partager les valeurs par nature : la structure, les propriétés, les variantes et les dimensions d'une pièce se lisent sur son maître ; ses couleurs se lisent sur chaque instance posée, et celles du maître sont des couleurs d'aperçu, jamais publiées. Pour une dépendance comme `Icon`, l'hôte publierait la couleur qu'il pose sur le slot de l'icône.

Faits établis dans le code, à vérifier toi-même :

- Une dépendance n'est pas parcourue : `extractVariantTokens` écarte tout ce qui vit sous elle (paramètre `composed`). Les surcharges que l'hôte pose dans une dépendance ne publient que `characters` et `visible`. La couleur que Button donne à une icône `Icon` sort donc du contrat sans avertissement.
- Le choix 4, option A, publierait les couleurs d'aperçu du maître comme les tokens propres de la pièce.
- C25 ne juge que les calques propres d'un variant : une couleur laissée en dur dans une instance n'est signalée par aucun constat d'Architect.

## 6. Ta méthode

Tu avances en cinq passes, dans l'ordre, et tu notes chaque passe dans l'audit.

1. Carte. Reprends S1 à S12 et ajoute chaque sous-sujet que tu trouves. Pour chacun, dis ce qu'il lit, ce qu'il écrit, qui le possède et ce qui peut se perdre.
2. Grille. Croise chaque sous-sujet avec chacun de ces angles : forme du contrat ; extraction de l'Exporter ; types, schéma et version du kit ; lecteurs, validation et `ucm check` ; parité de l'adaptateur ; analyse et corrections d'Architect, en full UCM et en agnostique ; interface et textes au designer ; compatibilité, migration et réexport ; budget et performance ; preuves et tests ; documents et invariants à changer. Une case vide se justifie ou devient une faille.
3. Preuve par le code. Chaque affirmation cite un fichier et une ligne. Reproduis le comportement actuel quand c'est possible : un script jetable dans ton répertoire temporaire, ou `node --import tsx` sur les fonctions et les fixtures existantes, sans modifier aucun fichier suivi. Lance les tests ciblés que la critique cite. Ne lance jamais `test:ui`.
4. Cas limites. Traite d'abord Button et Groupe sur leurs captures, puis au moins ceux-ci, et ajoute les tiens : pièce dans une pièce ; wrapper préfixé à propriétés ; pièce sans propriété ; dépendance posée dans une pièce ou dans un wrapper (`Icon` dans `.sizeWrapperButton`) ; instance qui ne surcharge pas une couleur d'aperçu ; couleur d'aperçu liée à une primitive ou écrite en dur ; échange d'instance (`INSTANCE_SWAP`) d'une icône vers une autre dépendance ; variant de l'hôte qui masque la pièce ; deux instances de la même pièce dans un variant ; booléen de la pièce lié à une prop de l'hôte ; propriété `SLOT` de la pièce remplie par l'hôte ; remplacement vide ; pièce rangée sur une autre page ; cycle d'imbrication ; budget dépassé ; contrat 14.0 réexporté en 15.0 ; lecteur 14.0 face à un contrat 15.0.
5. Saturation. Relis la carte et l'audit en cherchant ce qui manque. Arrête quand une passe n'ajoute aucune faille qui change le plan.

Tu peux lancer au plus deux sous-agents à la fois, sur Haiku seulement, pour une lecture longue ou une commande à la sortie longue. Tu gardes toi-même la synthèse et chaque décision de l'audit.

## 7. Ce que contient l'audit

Une entrée par faille, numérotée `F1`, `F2`… Chaque entrée donne :

- le sous-sujet et l'angle ;
- l'énoncé, en une phrase ;
- la preuve : fichier et ligne, ou la reproduction et sa sortie ;
- la gravité : bloquante (le contrat perd ou fausse une information, ou un lecteur casse), importante (un cas réel mal traité), mineure ;
- la correction proposée ;
- la décision du mainteneur qu'elle demande, s'il en faut une, avec deux ou trois options, leur conséquence et ta recommandation.

L'audit finit par la liste des décisions à demander au mainteneur, de la plus structurante à la moins structurante, et par ce que tu n'as pas pu vérifier.

## 8. Ce que contient le plan

Le plan suit la forme des plans du dépôt (`docs/notes/Recherches/Construction des composants/PLAN-P31.md`, `docs/notes/Recherches/Recreation des composants/PLAN-P30.md`) : un titre, une « Règle du plan », des étapes, des cases `- [ ] n.n` marquées `(mainteneur)` ou `(attend Pn)` quand il le faut.

- Étape 0 : une case par décision du mainteneur, qui renvoie à l'audit.
- Les essais dans Figma, marqués `(mainteneur)`, avec le geste exact et ce qu'il établit.
- Les lots d'implémentation. Chaque lot dit son objectif, les fichiers qu'il écrit, les invariants qu'il respecte ou change, les tests qu'il ajoute (un test qui échoue d'abord pour chaque défaut), ses critères de fin vérifiables, les commandes de vérification, les documents à mettre à jour (`FORMAT.md`, `CHANGELOG-FORMAT.md`, `COMPATIBILITE.md`, les SPEC, `CONCEPT.md`, les invariants, les cartes), ses dépendances à d'autres lots, et l'agent qui le fait (`implementeur`, ou `implementeur-exigeant` quand il touche plusieurs lecteurs d'une même règle).
- Les lots d'Architect : relevé des pièces, couleurs d'aperçu non surchargées, couleurs peintes dans une instance, cohérence avec l'expérience « Relier le composant » de P31.
- Les contrats de fixture, la sortie coordonnée du kit, de la CLI et de l'adaptateur (skill `publier-paquets`, une seule publication à la fin du plan), et le réexport des composants que le mainteneur fait.

Le plan est sûr quand :

- chaque critère de fin de P22 dans `docs/notes/Recherches/Evolutions globales/pistes.json` a sa case ;
- chaque faille bloquante a une case ou une décision ;
- chaque case se vérifie par un test, une commande ou un geste nommé du mainteneur ;
- aucun lot de code ne commence avant les décisions qu'il suppose ;
- aucune case ne dépend d'un geste dans Figma que le mainteneur n'a pas accepté.

## 9. Règles d'écriture

- Écris en français, selon le bloc « Écrire » d'`AGENTS.md` : une phrase par fait, le chemin plutôt que l'adjectif, ni résumé final ni offre de suite.
- Lance `node scripts/controle-style.mjs <fichier>` sur chacun de tes deux fichiers jusqu'à « Style conforme ».
- N'écris aucune donnée d'un client : seuls le Playground, les fixtures et des composants inventés servent d'exemples.

## 10. Ton compte rendu

À la fin, rends en quelques lignes : les deux chemins écrits, le nombre de failles par gravité, les décisions demandées au mainteneur, et ce que tu n'as pas pu vérifier.
