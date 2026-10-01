# Suivi de l'implémentation de l'explorateur de tokens

Ce suivi porte l'état du [plan d'implémentation](./PLAN-IMPLEMENTATION.md) :
lots livrés, preuves, mesures et recette Figma restante. Il suffit pour
reprendre le travail sans l'historique de conversation.

## État

| Lot | État | Preuve principale |
|---|---|---|
| 0. État des lieux | Livré | `packages/plugin-explorateur/SPEC.md`, `tests/fixtures.ts`, limites ci-dessous |
| 1. Paquet, build, fenêtre | Livré | `npm run build --workspace ucm-explorateur-plugin` vert ; `tests/manifest.test.ts`, `tests/fenetre.test.ts` |
| 2. Relevé et messages | Livré | `tests/lecture.test.ts`, `tests/loiDeLectureSeule.test.ts` |
| 3. Arbre et navigation | Livré | `tests/groupes.test.ts` ; tests d'interface « groupe », « retour » |
| 4. Résolution et contextes | Livré, recette Figma restante | `tests/resolution.test.ts` |
| 5. Table, inspecteur, survol, copie | Livré | `tests/copie.test.ts` ; tests d'interface « copie », « survol », « HTML inerte » |
| 6. Comparaison et diagnostics | Livré | `tests/comparaison.test.ts`, `tests/annexes.test.ts` (rapport) |
| 7. Galerie, volume | Livré | 31 états aux deux tailles ; `npm run mesure` ; test « dix mille variables » |
| 8. Consommateurs et contrastes | Livré, recette Figma restante | `tests/consommateurs.test.ts`, `tests/annexes.test.ts` (contraste) |
| 9. Contrats et tokens | Livré | `tests/contrats.test.ts`, `tests/bundle.test.ts`, `packages/kit/tests/porteNavigateur.test.mjs` |
| 10. Palettes et profil UCM | Livré | `tests/integrationsUcm.test.ts` |
| 11. Graphe, relevés, simulation | Livré | `tests/explorationEtendue.test.ts` ; test d'interface « simulation » |
| 12. Livraison et recette Figma | Documentation livrée ; recette Figma non exécutée | Ce suivi, `README.md` du paquet, `AGENTS.md` |

**Prochaine tâche** : la recette Figma du lot 12, qui demande l'accès du
mainteneur. Préparer le fichier de recette, puis importer
`packages/plugin-explorateur/dist/manifest.json` dans Figma Desktop.

## Décisions prises pendant l'exécution

| Sujet | Décision |
|---|---|
| Nom | **UCM Token Explorer**, provisoire. Il ne s'écrit que dans `manifest.json`, `src/ui/textes.ts` et `src/ui/index.html` ; `tests/loiDesTextes.test.ts` le vérifie. Le paquet reste `ucm-explorateur-plugin` |
| Identifiant du plugin | Aucun dans le manifeste. Le README du paquet décrit l'attribution par `Plugins > Development > New plugin…` |
| Thème | `src/ui/roles.css` précède la feuille du socle ; `showUI` part avec `themeColors: false` |
| Lecture des contrats (lot 9) | Le kit publie `@ucm-kit/core/lecteurs/navigateur` en 0.4.0 : les lecteurs sans Node ni Ajv, sous les mêmes noms. L’explorateur y prend la fenêtre de version, `champsInvalidesDuContrat`, `sansEchantillon`, `nomFigmaDuVariant` et `indexerTokensDtcg`. `@ucm-kit/cli` passe en 0.1.53 et `@ucm-kit/adapter-typescript` en 0.1.46 pour épingler ce kit. Le JSON Schema reste hors du plugin : son lecteur charge le schéma depuis le disque |
| Chemin publié d'un token | `joinTokenPath` et `prefixeDeCollection` passent de l'exporteur à `packages/plugin-socle/src/cheminsDeTokens.ts` ; `plugin-exporter/src/variables.ts` les réexporte. Les tests de l'exporteur restent verts |
| Protocole de la recette | `ESPACE_PARTAGE` et `CLE_RECETTE` passent dans `packages/couleur/src/protocole.ts` ; `plugin-palettes/src/lecture.ts` les réexporte |
| Profil UCM | Couches et cibles d'après ARCHITECTURE-FINALE ; contrôles limités aux variables de couleur des collections associées |

## Limites de l'API relevées

Typings installés : `@figma/plugin-typings` 1.138.0.

| Limite | Source | Comportement prévu |
|---|---|---|
| Aucun événement de changement de variable sans `loadAllPagesAsync` | `PluginAPI.on('documentchange')`, plugin-api.d.ts | Bouton Actualiser, heure et numéro du relevé au pied |
| `figma.teamLibrary` ne donne ni valeur ni chaîne | `TeamLibraryAPI`, plugin-api.d.ts ; [documentation Figma](https://developers.figma.com/docs/plugins/api/figma-teamlibrary/) | Non lu ; une cible non chargée reste inaccessible |
| `resolveForConsumer` rend une valeur, pas une chaîne | `Variable.resolveForConsumer`, plugin-api.d.ts | Comparaison au résolveur sur un calque sélectionné |
| Une collection étendue porte ses surcharges et `parentModeId` | `ExtendedVariableCollection`, plugin-api.d.ts | Résolution par surcharge puis mode parent ; à confirmer dans Figma |
| Les modes d'équipe ne figurent pas dans `explicitVariableModes` | `ExplicitVariableModesMixin`, plugin-api.d.ts | Le mode hérité se lit dans `resolvedVariableModes` |
| Une variable liée à un calque sans être visée par un alias local n'est pas dans le relevé | Choix du relevé | Elle s'affiche « Variable » suivie de son identifiant |
| L'alias avec opacité n'existe pas dans `VariableValue` | `VariableValue`, plugin-api.d.ts | Une forme inconnue reste « non prise en charge », source lisible |

## Commandes exécutées

| Commande | Résultat |
|---|---|
| `npm test` (ligne de base, avant tout changement) | 7 échecs préexistants : 1 dans `ucm-couleur`, 6 dans `ucm-palettes-plugin`, sur des textes modifiés dans la copie de travail |
| `npm test` (après intégration) | 2 307 tests, 6 échecs : les 6 de la ligne de base dans `ucm-palettes-plugin` ; l'échec de `ucm-couleur` ne se reproduit plus |
| `npm run test --workspace ucm-explorateur-plugin` | 106 tests, 0 échec |
| `npm run typecheck` | Vert |
| `npm run build` | Vert, trois plugins |
| `npm run test:ui --workspace ucm-explorateur-plugin` | 12 tests, 0 échec, clavier compris |
| `npm run test:ui --workspace ucm-exporter-plugin` | 24 tests, 0 échec |
| `npm run test:ui --workspace ucm-palettes-plugin` | 158 tests, 31 échecs. Rejoués avec `src/lecture.ts` d’UCM Palettes remis à son état commité : les 31 mêmes échecs. Ils précèdent ce chantier |
| `npm run galerie --workspace ucm-explorateur-plugin` | 31 états atteignables × 3 modes, aux deux tailles ; chaque page jouée sans erreur dans Chromium, en thème sombre, clair et sans variable servie ; captures relues à 1200 × 800 et 560 × 480 |
| `npx tsx --test tests/pluginsSepares.test.ts` | 6 paires vertes |
| `npx tsx --test tests/docLinks.test.ts` | Vert |
| `git diff --check` | Vert |
| CI du commit `58dfae8` | Verte au troisième passage. Les deux premiers ont échoué sur deux puis trois tests de minutage d’UCM Palettes, différents d’un passage à l’autre ; le même commit, dans un worktree propre, passe 158 sur 158 deux fois de suite |
| `node scripts/controle-style.mjs` sur chaque document modifié | Conforme |


## Mesures

`npm run mesure --workspace ucm-explorateur-plugin`, 10 000 variables sur
20 collections et quatre modes, dix répétitions après échauffement :

| Phase | Médiane | Budget du plan |
|---|---|---|
| Indexation | 10,0 ms | |
| Arbres des groupes | 19,5 ms | |
| Résolution froide des 10 000 variables | 96,5 ms | |
| Résolution mémorisée des 10 000 variables | 2,5 ms | 100 ms |
| Recherche globale, noms et valeurs | 9,4 ms | 200 ms |
| Diagnostics, 40 000 résolutions | 392,7 ms | |
| Premier rendu de la table dans Chromium, transport compris | 327,7 ms | |

Mémoire retenue par l'index et un résolveur rempli : 13,6 Mo. La table monte
18 lignes sur 10 000. Les diagnostics bloquent l'interface environ 0,4 s à
l'ouverture de l'onglet sur ce volume : à étaler entre les images si les
designers le remarquent.

## Matrice de validation

| Fait à prouver | Test |
|---|---|
| Architecture libre | `groupes.test.ts` « un point, une espace… » ; interface « un groupe montre ses descendants » |
| Plusieurs axes | `resolution.test.ts` « deux axes indépendants » |
| Aucun UCM | `comparaison.test.ts` « aucun constat ne dépend d'un nom » ; `integrationsUcm.test.ts` « sans association… » ; `loiDeLectureSeule.test.ts` « aucune règle ne dépend d'un nom de collection réservé » |
| Groupe parent | `groupes.test.ts` « un groupe parent contient ses descendants… » |
| Identités distinctes | `groupes.test.ts` « deux collections homonymes… » |
| Retour | interface « … suivre un alias puis Retour restaure groupe, token et défilement » |
| Modes locaux | `resolution.test.ts` « le contexte d'une colonne… », « une chaîne traverse cinq collections » |
| Valeurs particulières | `resolution.test.ts` « zéro, faux, chaîne vide et alpha… » ; `copie.test.ts` ; interface « zéro, faux et le texte vide se copient exactement » |
| Cycle contextualisé | `resolution.test.ts` « un cycle actif dans un seul mode » ; `comparaison.test.ts` « un cycle produit un constat groupé… » |
| Chaîne partagée | `resolution.test.ts` « deux branches… » ; `lecture.test.ts` « … une seule fois chacune » |
| Distante inaccessible | `resolution.test.ts` « une cible inaccessible… » ; `lecture.test.ts` « introuvable… refusée » |
| Comparaison | `comparaison.test.ts` « deux marques… », « deux densités… » |
| Réponse périmée | interface « une réponse d'une lecture remplacée… » |
| Grand relevé | interface « dix mille variables » ; `lecture.test.ts` « une annulation rend la main… » ; `consommateurs.test.ts` « une analyse annulée… » |
| Thème fixe | interface « les surfaces restent sombres… » ; `stylesUi.test.ts` |
| Entrées externes | interface « un nom qui contient du HTML… », « importer un tokens.json… » ; `contrats.test.ts` « un import trop grand… » ; `explorationEtendue.test.ts` « un relevé importé invalide… » |
| Contrat facultatif | interface « importer un tokens.json… le retirer rend l'inspecteur du socle » |
| Mutation | `loiDeLectureSeule.test.ts` ; doubles de `figmaDeTest.ts` dans `lecture.test.ts` et `consommateurs.test.ts` ; interface, relevé des demandes envoyées |
| Simulation | `explorationEtendue.test.ts` « une simulation valide… », « …refuse un autre type, une cible inconnue et un cycle » ; interface « une simulation s'annonce… » |

Les fixtures sont toutes artificielles, construites par `tests/fixtures.ts`.
Aucune capture d'un fichier Figma réel n'est commitée.

## Recette Figma restante

Aucun de ces points n'est vérifié : l'agent n'a pas accès à Figma.

1. Importer le manifeste ; attribuer un identifiant si Figma le demande.
2. Sur un fichier de recette dédié, vérifier une chaîne locale, puis les modes
   hérités d'un calque, par l'onglet Calques et « Comparer avec Figma ».
3. Changer de sélection pendant une analyse, puis actualiser.
4. Lire une référence distante accessible, puis la rendre inaccessible.
5. Vérifier un groupe profond, une collection étendue si le plan le permet,
   et « Afficher dans Figma » sur un calque existant puis supprimé.
6. Consigner chaque divergence entre le résolveur et `resolveForConsumer`,
   avec le calque et le contexte.
7. Vérifier que l'historique du fichier ne montre aucune modification après
   lecture, navigation, comparaison, copie et simulation.

## Reprendre après un échec

| Échec | Reprise |
|---|---|
| `test:ui` ne trouve pas `dist/galerie-fixtures.cjs` | `npm run galerie --workspace ucm-explorateur-plugin` |
| Chromium absent | `npx playwright install chromium` |
| `galerie:captures` ne trouve pas Chrome | Renseigner `UCM_CHROME` avec le chemin de l'exécutable |
| Un test d'UCM Palettes échoue sur un texte | Vérifier d'abord la ligne de base : six échecs y étaient déjà, dans des fichiers modifiés hors de ce chantier |
