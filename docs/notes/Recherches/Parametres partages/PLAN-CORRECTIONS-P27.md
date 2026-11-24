# Plan de corrections de P27

Ce plan corrige les écarts des trois rapports de P27 : le
[premier audit](./RECHERCHE-PARAMETRES-PARTAGES.md) (PP-01 à PP-24), la
[zone 1](./ZONE-1-REGLES-JUMELLES.md) (PP-101 à PP-112) et la
[zone 2](./ZONE-2-CHAINE-AGENT.md) (PP-201 à PP-215), puis, aux vagues 8 et 9,
ceux de la [zone 3](./ZONE-3-OUTILLAGE-AGENTS.md) (PP-301 à PP-317) et de la
[zone 4](./ZONE-4-COULEUR.md) (PP-401 à PP-410). La vague 10 pose les dernières gardes et
fusionne les inventaires `parametres*.json` en un seul `parametres.json`, lu par
un test racine. La vague 11 publie le kit, la CLI et l'adaptateur une seule
fois. Les lots 0.1 à 11.4 sont faits et publiés. Restent les cases 8.4 à 8.6
et 11.5 à 11.13, que le mainteneur valide.

Les lots se rangent par fichiers touchés. Un agent ouvre les fichiers de son lot,
et deux lots d'une même vague n'écrivent aucun fichier en commun.

## Vagues

Une vague commence quand la précédente est commitée. Les fichiers de la colonne
« Fichiers écrits » sont les seuls qu'un lot écrit.

| Vague | Lot | Agent | Fichiers écrits | Dépend de |
|---|---|---|---|---|
| 0 | 0.1 Verrou et plan | conversation principale | `.agents/skills/publier-paquets/SKILL.md`, ce plan, `pistes.json`, `INVENTAIRE-UCM.html` | rien |
| 1 | 1.1 Lecture des JSON du dépôt | `implementeur` | `packages/kit/src/format/configuration.ts`, `packages/kit/src/format/index.ts`, `packages/kit/src/lecteurs/configuration.mjs`, `packages/kit/src/lecteurs/controle-du-code.mjs`, `packages/kit/src/lecteurs/controle-du-code-listes.mjs`, `packages/kit/src/lecteurs/controle-repository.mjs`, `packages/kit/src/lecteurs/derogations.mjs`, `packages/kit/src/lecteurs/index.mjs`, `packages/kit/src/lecteurs/index.d.mts`, `packages/kit/tests/configuration.test.mjs`, `packages/kit/tests/derogations.test.mjs`, `packages/adapter-typescript/src/generation.mjs`, `packages/plugin-exporter/src/depot.ts`, `packages/plugin-exporter/tests/config.test.ts` | 0.1 |
| 1 | 1.2 Version du contrat dans les tests | `executant` | `packages/kit/tests/fenetre-de-lecture.test.mjs`, `packages/kit/tests/contrats-fabriques.mjs`, `packages/kit/tests/caracteristiques.test.mjs`, `packages/kit/tests/controleRepository.test.mjs`, `packages/kit/tests/diagnostic-architecture.test.mjs`, `packages/kit/tests/diagnostic-contrastes.test.mjs`, `packages/cli/tests/check.test.mjs`, `packages/cli/tests/verdictGit.test.mjs`, `tests/fabriquesDeFichiers.ts` | 0.1 |
| 1 | 1.3 Familles, rendu et nombres documentés | `implementeur` | `CONCEPT.md`, `docs/guides/POUR-LES-DESIGNERS.md`, `VALIDATIONS-MVP.md`, `docs/guides/LINTER-UCM.md`, `scripts/controle-style.mjs`, `tests/styleMotifs.test.ts`, `tests/copiesDocumentees.test.ts` (créé), `CARTE.md` (section `## tests/`), `packages/plugin-exporter/src/tokens/exportTokens.ts` (mot `export` de `UNITLESS_GROUPS` seulement) | 0.1 |
| 2 | 2.1 Casse, motif `{id}` et commandes du kit | `implementeur-exigeant` | `packages/kit/src/format/configuration.ts`, `packages/kit/src/lecteurs/implementation.mjs`, `packages/kit/src/lecteurs/controle-repository.mjs`, `packages/kit/src/lecteurs/controle-du-code.mjs`, `packages/kit/src/lecteurs/perimetre-rapport.mjs`, `packages/kit/src/lecteurs/verdict-bilan.mjs`, `packages/kit/src/lecteurs/derogations.mjs`, `packages/kit/src/lecteurs/index.mjs`, `packages/kit/src/lecteurs/index.d.mts`, `packages/kit/src/lecteurs/navigateur.mjs`, `packages/kit/src/lecteurs/navigateur.d.mts`, `packages/kit/src/modules/index.d.mts` (commentaires), `packages/kit/invariants/*.md` que `agents:diff` désigne, `packages/kit/CHANGELOG.md`, `packages/kit/tests/implementation.test.mjs`, `packages/kit/tests/controleRepository.test.mjs`, `packages/kit/tests/configuration.test.mjs`, `packages/kit/tests/verdict-bilan.test.mjs`, `packages/kit/tests/verdict-demande.test.mjs`, `packages/kit/tests/derogations.test.mjs`, `packages/kit/tests/perimetre-rapport.test.mjs`, `packages/kit/tests/prise-attendus.json`, `packages/adapter-typescript/src/parite.mjs`, `packages/adapter-typescript/src/index.d.mts`, `packages/adapter-typescript/tests/parite.test.mjs`, `packages/cli/src/rangs.mjs`, `packages/cli/tests/check.test.mjs` | 1.1, 1.2 |
| 2 | 2.2 Fichiers qu'`ucm init` écrit | `implementeur` | `packages/cli/src/fichiers-du-consommateur.mjs` (créé), `packages/cli/src/init.mjs`, `packages/cli/src/deroger.mjs`, `packages/cli/src/icons.mjs`, `packages/cli/CARTE.md`, `packages/cli/tests/cli.test.mjs`, `packages/cli/tests/recette.test.mjs`, `packages/cli/tests/deroger.test.mjs` | 1.1 |
| 2 | 2.3 Propriétés de `FORMAT.md` et autorités | `implementeur` | `docs/format/FORMAT.md`, `tests/inventaireInvariants.test.ts`, `packages/plugin-architect/invariants/explorateur.md` | 0.1 |
| 3 | 3.1 Textes des aides, de la procédure et de la recette | `executant` | `packages/cli/aides/` : `composant.md`, `typographie.md`, `position-absolue.md`, `contour-ring.md`, `grille.md`, `identifiants.md`, `resolution-token.md`, `ombre.md`, `opacite.md`, `rotation.md`, `attributs-natifs.md`, `chargement-feuilles.md`, `comptage-dependances.md`, `controles.md`, `focus-clavier.md`, `icone-composant.md`, `portee-mode.md` ; `packages/cli/procedure.md`, `docs/guides/RECETTE.md`, `tests/copiesDocumentees.test.ts` | 1.3 |
| 3 | 3.2 Questions des ancrages dans `ucm aides` | `implementeur` | `packages/cli/src/aides.mjs`, `packages/cli/tests/commande-aides.test.mjs` | 1.1 |
| 3 | 3.3 Seuils de contraste | `implementeur-exigeant` | `packages/kit/src/referentiel/contraste.ts`, `packages/kit/src/controles/accessibilite.ts`, `packages/kit/src/emplois/contraste.ts`, `packages/kit/src/emplois/index.ts`, `packages/kit/src/lecteurs/diagnostic-contrastes.mjs`, `packages/plugin-architect/src/ui/textes/nomenclature.ts`, `packages/plugin-architect/src/ui/ignores/modele.ts`, `packages/plugin-palettes/src/i18n/fr.ts`, `packages/plugin-palettes/src/i18n/en.ts`, `packages/plugin-palettes/src/planche/modele.ts`, `docs/inventaire/releves.ts`, les tests de `packages/kit/tests/`, `packages/plugin-architect/tests/` et `packages/plugin-palettes/tests/` qui lisent ces fichiers | 0.1 |
| 4 | 4.1 Le guide | `implementeur` | `packages/cli/src/guide.mjs`, `packages/cli/tests/guide.test.mjs` | 2.2, 3.1, 3.2 |
| 4 | 4.2 Couverture des aides | `implementeur` | `packages/cli/tests/aides.test.mjs`, `packages/kit/src/lecteurs/caracteristiques.mjs`, `packages/kit/tests/caracteristiques.test.mjs` | 3.1, 3.2 |
| 4 | 4.3 Noms, variants et validateur du kit | `implementeur-exigeant` | `packages/kit/src/format/names.ts`, `packages/kit/src/format/index.ts`, `packages/kit/src/referentiel/reference.ts`, `packages/kit/src/referentiel/index.ts`, `packages/kit/src/controles/structure.ts`, `packages/kit/src/lecteurs/variant-views.mjs`, `packages/kit/src/lecteurs/validation-contrat.mjs`, `packages/plugin-socle/src/composant/contract/componentTree.ts`, `docs/format/CHANGELOG-FORMAT.md`, `packages/kit/tests/names.test.ts`, `packages/kit/tests/reference.test.ts`, `packages/kit/tests/validation-contrats.test.mjs`, `packages/kit/tests/projectionEtFigma.test.ts` (créé), `packages/plugin-exporter/tests/componentTree.test.ts` | 1.1 |
| 5 | 5.1 Rapport précédent, `ucm rapport-github`, adresses des forges | `implementeur-exigeant` | `packages/kit/src/lecteurs/rapport-precedent.mjs` (créé), `packages/kit/src/lecteurs/index.mjs`, `packages/kit/src/lecteurs/index.d.mts`, `packages/kit/src/protocoles/forges.ts` (créé), `packages/kit/src/protocoles/index.ts`, `packages/kit/CARTE.md`, `packages/kit/tests/rapport-precedent.test.mjs` (créé), `packages/cli/src/rapport-github.mjs` (créé), `packages/cli/src/rapport-gitlab.mjs`, `packages/cli/src/ucm.mjs`, `packages/cli/src/init.mjs`, `packages/cli/src/fichiers-du-consommateur.mjs`, `packages/cli/README.md`, `packages/cli/CARTE.md`, `packages/cli/tests/rapport-github.test.mjs` (créé), `packages/cli/tests/gitlab.test.mjs`, `packages/cli/tests/cli.test.mjs`, `packages/plugin-exporter/src/forges/github.ts`, `packages/plugin-exporter/src/forges/gitlab.ts` | 2.1, 2.2 |
| 5 | 5.2 Règles et préparation d'Architect | `implementeur-exigeant` | `packages/plugin-socle/src/composant/contract/rulesModel.ts`, `packages/plugin-socle/src/composant/contract/mergeBooleanDescriptions.ts`, `packages/plugin-socle/src/composant/contract/mergePropDescriptions.ts`, `packages/plugin-socle/tests/cleDeRegle.test.ts` (créé), `packages/plugin-architect/src/regles.ts`, `packages/plugin-architect/src/sandbox/preparation.ts`, `packages/plugin-architect/src/preparations.ts`, `packages/plugin-architect/tests/regleEtPropriete.test.ts` (créé), `packages/plugin-architect/tests/preparationEtCasse.test.ts` (créé) | 0.1 |
| 5 | 5.3 Collisions de nom CSS | `implementeur-exigeant` | `packages/kit/src/nommage/chemins-publies.ts`, `packages/kit/tests/collisionsCss.test.ts` (créé), `packages/plugin-palettes/src/variables/noms.ts`, `packages/plugin-palettes/tests/nomsCss.test.ts` (créé), `packages/plugin-architect/src/ui/textes/nomenclature.ts`, `packages/plugin-architect/src/ui/nomenclature/aAppliquer.ts`, les tests d'Architect qui lisent ces deux fichiers | 3.3 |
| 6 | 6.1 Lecteurs de `tokens.json` et feuille CSS | `implementeur-exigeant` | `packages/kit/src/format/tokens.ts`, `packages/kit/src/format/references.ts`, `packages/kit/src/format/index.ts`, `packages/kit/src/controles/projection-dtcg.ts`, `packages/kit/src/lecteurs/comparaison-dtcg.mjs`, `packages/kit/src/lecteurs/tokens-dtcg.mjs`, `packages/kit/src/lecteurs/navigateur.mjs`, `packages/kit/src/lecteurs/navigateur.d.mts`, `packages/kit/src/lecteurs/index.mjs`, `packages/kit/src/lecteurs/index.d.mts`, `packages/kit/tests/references.test.ts`, `packages/kit/tests/projectionDtcg.test.ts`, `packages/kit/tests/comparaison-dtcg.test.mjs`, `packages/kit/tests/tokens-dtcg.test.mjs`, `packages/cli/src/tokens-css.mjs`, `packages/cli/src/tokens-references.mjs`, `packages/cli/src/conventions.mjs`, `packages/cli/tests/tokens-css.test.mjs`, `packages/cli/tests/tokens-references.test.mjs`, `packages/cli/tests/conventions.test.mjs`, `packages/plugin-exporter/src/tokens/exportTokens.ts`, `packages/plugin-exporter/tests/exportTokens.test.ts` | 4.3, 5.1 |
| 6 | 6.2 Défaut d'une prop `instance-swap` | `implementeur` | `packages/plugin-socle/src/composant/analyse/proprietesEtEtats.ts`, le fichier du socle qui l'appelle avec les définitions Figma, `packages/plugin-socle/tests/proprietesEtEtats.test.ts`, `packages/kit/src/format/types.ts` (commentaire), `packages/kit/schema/ucm-contract.schema.json` (régénéré), `docs/format/FORMAT.md`, `docs/format/CHANGELOG-FORMAT.md`, `packages/plugin-exporter/SPEC.md` | 2.3, 4.3 |
| 6 | 6.3 Plugins sombres | `implementeur` | `CONTRIBUTING.md`, `packages/plugin-palettes/src/code.ts`, `packages/plugin-exporter/src/code.ts`, `packages/plugin-socle/src/ui/socle.css`, `packages/plugin-socle/src/ui/langage.css`, les feuilles `.css` de `packages/plugin-palettes/src/` et `packages/plugin-exporter/src/` qui citent `figma-dark` ou `prefers-color-scheme`, `packages/plugin-exporter/tests/code.test.ts`, `tests/pluginsSombres.test.mjs` (créé), `CARTE.md` (section `## tests/`) | 0.1 |
| 7 | 7.1 Commandes documentées | `implementeur` | `packages/cli/src/ucm.mjs`, `packages/cli/src/init.mjs`, `packages/cli/README.md`, `packages/cli/tests/commandesDocumentees.test.mjs` (créé), `packages/cli/tests/cli.test.mjs` | 3.1, 5.1 |
| 7 | 7.2 Workspace, hub, Node et React | `implementeur` | `package.json`, `package-lock.json`, `packages/kit/package.json`, `packages/cli/package.json`, `packages/adapter-typescript/package.json`, `scripts/vues.mjs`, `scripts/construire-plugin.mjs`, `tests/monorepoCoherent.test.mjs`, `tests/kitCompileAJour.test.mjs`, `tests/referentielUnique.test.ts`, `docs/inventaire/releves.ts`, `docs/inventaire/sources.json`, `docs/inventaire/gabarit.html`, `docs/inventaire/generer-inventaire.ts`, `AGENTS.md`, `packages/hub/AGENTS.md`, `packages/adapter-typescript/src/usages.mjs`, `packages/adapter-typescript/tests/usages.test.mjs`, `packages/adapter-typescript/tests/usagesPromis.test.mjs`, `packages/adapter-typescript/CHANGELOG.md` | 2.2, 3.3 |
| 7 | 7.3 Chroma des gris, destinations, textes recopiés | `implementeur` | `packages/couleur/src/palette.ts`, `packages/couleur/src/alertes.ts`, `packages/couleur/tests/alertes.test.ts`, `packages/couleur/tests/palette.test.ts`, `packages/plugin-palettes/src/harmonisation.ts`, `packages/plugin-palettes/src/ordreDesPalettes.ts`, `packages/plugin-palettes/src/ui/harmonisation/carteRoue.ts`, `packages/plugin-palettes/src/ui/destination.ts`, les tests de Palettes qui lisent ces quatre fichiers, `packages/plugin-architect/src/ecriture/structure.ts`, `packages/plugin-architect/src/ui/textes/structure.ts`, `packages/plugin-architect/src/ui/textes/analyse.ts`, `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/index.ts`, `packages/kit/src/referentiel/signes.ts`, `packages/kit/src/referentiel/index.ts` | 5.3 |
| 8 | 8.1 Domiciles, cartes et définitions de l'outillage | `implementeur` | `.agents/domiciles.json`, `.agents/documents-fermes.json` (créé), `tests/domiciles.test.ts`, `tests/cartes.test.ts`, `tests/agentsDefinis.test.ts` (créé), `CARTE.md`, `AGENTS.md`, `CONTRIBUTING.md` (paragraphe « Ce que reçoit un implémenteur »), `.claude/agents/implementeur.md`, `.claude/agents/implementeur-exigeant.md`, `.claude/agents/executant.md`, `.agents/skills/archiver-un-sujet/SKILL.md` | vague 7 |
| 8 | 8.2 Contrôle de style, hooks de style et skills | `implementeur` | `scripts/controle-style.mjs`, `scripts/hook-style.mjs`, `scripts/hook-reponse.mjs`, `tests/styleMotifs.test.ts`, `tests/styleDocumentaire.test.ts`, `packages/plugin-palettes/CARTE.md`, `packages/couleur/invariants/moteur-de-couleur.md`, `.agents/skills/rediger-diagnostics-ucm/SKILL.md`, `.agents/skills/guide-composant/SKILL.md`, `.agents/skills/regler-le-linter/SKILL.md` | vague 7 |
| 8 | 8.3 Découvreurs de tests et conservation | `implementeur` | `scripts/verifier-conservation.mjs`, `tests/verifierConservation.test.mjs`, `.agents/skills/rediger-pour-agents/SKILL.md`, `packages/kit/scripts/run-tests.cjs`, `packages/cli/scripts/run-tests.cjs`, `packages/adapter-typescript/scripts/run-tests.cjs`, `packages/couleur/scripts/run-tests.cjs`, `packages/plugin-architect/scripts/run-tests.cjs`, `packages/plugin-exporter/scripts/run-tests.cjs`, `packages/plugin-palettes/scripts/run-tests.cjs`, `packages/plugin-socle/build/run-tests.cjs`, `tests/monorepoCoherent.test.mjs` | vague 7 |
| hors vague | 8.4 à 8.6 Droits des agents, après l'accord du mainteneur | `implementeur` | `scripts/hook-documents.mjs`, `scripts/hook-etat.mjs` (créé), `scripts/hook-commandes.mjs` (créé), `scripts/agents-contexte.mjs`, `.agents/domiciles.json`, `tests/registreDesDocuments.test.ts`, `tests/hooksDesAgents.test.mjs` (créé), `tests/agentsDefinis.test.ts`, `CARTE.md`, `CONTRIBUTING.md`, `.claude/settings.json`, `.claude/agents/verificateur.md`, `CLAUDE.md` | vague 8, et 8.5 |
| 9 | 9.1 Juges du contraste | `implementeur-exigeant` | `packages/kit/src/controles/accessibilite.ts`, `packages/kit/src/controles/index.ts`, `packages/kit/src/emplois/couleur.ts`, `packages/kit/src/emplois/index.ts`, `packages/kit/src/lecteurs/diagnostic-contrastes.mjs`, `packages/kit/tests/accessibilite.test.ts`, `packages/kit/tests/diagnostic-contrastes.test.mjs`, `packages/kit/tests/jugesDuContraste.test.ts` (créé), `packages/plugin-architect/src/contraste.ts`, `packages/plugin-architect/src/catalogue.ts`, `packages/plugin-architect/src/sandbox/preparation.ts`, les tests d'Architect qui lisent ces trois fichiers, `packages/plugin-exporter/invariants/diagnostics.md` | vague 8 |
| 9 | 9.2 Recette, référentiel et textes de Palettes | `implementeur-exigeant` | `packages/kit/src/referentiel/contraste.ts`, `packages/kit/src/referentiel/vocabulaire.ts`, `packages/kit/src/referentiel/natures.ts`, `packages/kit/src/referentiel/index.ts`, les tests de `packages/kit/tests/` qui lisent ces quatre fichiers, `packages/couleur/src/recette.ts`, `packages/couleur/src/nuances.ts`, `packages/couleur/src/index.ts`, `packages/couleur/tests/` (fichiers nouveaux `minimums.test.ts`, `fondsEtCrans.test.ts`, et ceux qui lisent `recette.ts`), `packages/plugin-palettes/src/i18n/fr.ts`, `packages/plugin-palettes/src/i18n/en.ts`, `packages/plugin-palettes/src/configuration.ts`, les tests de Palettes qui lisent ces trois fichiers | vague 8 |
| 9 | 9.3 Textes d'Architect et page de Palettes | `implementeur` | `packages/plugin-architect/src/ui/textes/structure.ts`, `packages/plugin-architect/src/ui/textes/preparation.ts`, le module d'Architect qui lit les données partagées de Palettes, les tests d'Architect qui lisent ces fichiers, `scripts/controle-style.mjs`, `tests/styleMotifs.test.ts` | vague 8 |
| 10 | 10.1 Lois de `reglesUniques` et phrases uniques | `implementeur` | `tests/reglesUniques.test.ts`, `tests/phrasesUniques.test.ts` (créé) | vague 9 |
| 10 | 10.2 Inventaire unique des paramètres | `implementeur` | `docs/notes/Recherches/Parametres partages/parametres.json`, les quatre `parametres-zone*.json` (supprimés), `tests/parametresPartages.test.ts` (créé), `CARTE.md` (section `## tests/`, lignes de 10.1 et 10.2) | vague 9 |
| 11 | 11.1 à 11.4 Versions, publication, clôture | `executant`, `verificateur`, conversation principale | `package.json` des trois paquets, pins et versions citées par la documentation, `.agents/skills/publier-paquets/SKILL.md`, `INVENTAIRE-UCM.html`, ce plan, `pistes.json` | vague 10 |

Fichiers écrits par plusieurs vagues, dans l'ordre :
`packages/kit/src/lecteurs/index.mjs` et `index.d.mts` (1.1, 2.1, 5.1, 6.1),
`packages/kit/src/format/index.ts` (1.1, 4.3, 6.1),
`packages/kit/src/format/configuration.ts` (1.1, 2.1),
`packages/kit/src/lecteurs/controle-repository.mjs` et `derogations.mjs` (1.1, 2.1),
`packages/cli/src/init.mjs` (2.2, 5.1, 7.1), `packages/cli/src/ucm.mjs` et
`packages/cli/README.md` (5.1, 7.1), `packages/cli/tests/cli.test.mjs` (2.2,
5.1, 7.1), `packages/cli/src/fichiers-du-consommateur.mjs` (2.2, 5.1),
`docs/format/FORMAT.md` (2.3, 6.2), `docs/format/CHANGELOG-FORMAT.md` (4.3,
6.2), `packages/plugin-architect/src/ui/textes/nomenclature.ts` (3.3, 5.3),
`docs/inventaire/releves.ts` (3.3, 7.2), `tests/copiesDocumentees.test.ts`
(1.3, 3.1), `CARTE.md` (1.3, 6.3, 8.1, 8.6, 10.2), `CONTRIBUTING.md` (6.3,
8.1, 8.6), `AGENTS.md` (7.2, 8.1), `.agents/domiciles.json` et
`tests/agentsDefinis.test.ts` (8.1, 8.6), `scripts/controle-style.mjs` et
`tests/styleMotifs.test.ts` (1.3, 8.2, 9.3), `tests/monorepoCoherent.test.mjs`
(7.2, 8.3), `packages/kit/src/referentiel/contraste.ts` (3.3, 9.2),
`packages/kit/src/controles/accessibilite.ts` et `diagnostic-contrastes.mjs`
(3.3, 9.1), `packages/plugin-palettes/src/i18n/fr.ts` et `en.ts` (3.3, 9.2),
`packages/plugin-architect/src/sandbox/preparation.ts` (5.2, 9.1),
`packages/plugin-architect/src/ui/textes/structure.ts` (7.3, 9.3). Le chemin de
`pistes.json` est `docs/notes/Recherches/Evolutions globales/pistes.json`.

Lots par agent : `executant` 2 (1.2, 3.1), plus la montée de 11.1 ;
`implementeur` 18 (dont 8.6, qui attend l'accord du mainteneur) ;
`implementeur-exigeant` 9 (2.1, 3.3, 4.3, 5.1, 5.2, 5.3, 6.1, 9.1, 9.2) ;
`verificateur` à chaque point de synchronisation et en 11.2.

## Règles d'exécution

| Travail | Agent |
|---|---|
| Relecture des diffs, commits, textes pour le mainteneur et le designer, fichiers d'agents hors note, publication, cases | conversation principale |
| Texte donné mot pour mot, remplacement listé, versions et pins | `executant` |
| Lot de code à périmètre fixé | `implementeur` |
| Lot qui touche plusieurs lecteurs d'une même règle | `implementeur-exigeant` |
| `npm run agents:diff`, `npm run build`, `npm run vues`, `npm test`, `npm run typecheck` | `verificateur` |

- Le prompt d'un lot contient, et rien d'autre : la note du lot, sa ligne « Fichiers écrits » de la table, la nature de la tâche et la sortie de `npm run agents:lire -- <fichiers écrits du lot>`.
- L'agent lance `git status` d'abord. Un fichier de son lot modifié hors de ce plan l'arrête, et il rend la question. Un fichier hors du lot, modifié par une autre session, ne l'arrête pas.
- L'agent lance seulement les tests des paquets qu'il touche, puis `npm run typecheck` : `npm run test --workspace @ucm-kit/core` pour le kit, `npm run test:paquet -- <nom>` pour `cli`, `adapter`, `socle`, `couleur`, `palettes`, `architect`, `exporter`, et `npx tsx --test tests/<fichier>` pour un test racine qu'il écrit. Un lot qui touche `packages/kit/src/` lance aussi `node scripts/run-tests.cjs` à la racine.
- Échecs admis dans le compte rendu d'un agent, et seulement eux : `tests/versionSuitLeContenu.test.mjs`, `packages/kit/tests/apiPublique.test.mjs` à partir du lot 2.1, et le test de fraîcheur de `tests/inventaire.test.ts` (« La vue n'est plus à jour »). Tout autre échec est un défaut du lot.
- Avant de rendre, l'agent lance `npm run agents:diff`, met à jour les documents qu'il liste parmi ses fichiers écrits, et nomme les autres dans son compte rendu.
- Aucun agent ne lance `npm run vues`, `npm test` à la racine, ni `test:ui`. Aucun agent ne commite. Le compte rendu nomme chaque écran de plugin que le lot change.
- Un défaut corrigé reçoit un test qui échoue sans la correction. Les identifiants de cas (`J1`, `K4`…) renvoient à la section [Cas de test](#cas-de-test) et nomment le test.

### Point de synchronisation

À la fin de chaque vague, la conversation principale :

1. relit le diff de chaque lot contre sa note ;
2. fait lancer par un `verificateur`, sur l'arbre stable, dans cet ordre : `npm run agents:diff`, `npm run build`, `npm run vues`, `npm test`, `npm run typecheck` ;
3. relit les documents que `agents:diff` liste ;
4. commite chaque lot par chemins explicites, avec `INVENTAIRE-UCM.html` dans le dernier commit de la vague et la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ;
5. coche les cases de la vague avec leur hash, fait relancer `npm run vues` (le plan est une source de l'inventaire), commite le plan et `INVENTAIRE-UCM.html` (`docs(recherches): P27, cases de la vague <n>`), puis pousse.

### Tests qui échouent légitimement

| Test | De | Jusqu'à | Pourquoi |
|---|---|---|---|
| `tests/versionSuitLeContenu.test.mjs` | commit de 1.1 | commit de 11.1 | le contenu publiable du kit, de l'adaptateur puis de la CLI change sans montée ; une seule montée, en 11.1 |
| `packages/kit/tests/apiPublique.test.mjs` | commit de 2.1 | commit de 11.1 | 2.1 change le résultat de `lireConfiguration` et le message de `preparerControle`, et écrit l'entrée `## 0.18.0` du journal ; le numéro monte en 11.1 |
| Fraîcheur de `tests/inventaire.test.ts` | chaque modification | `npm run vues` du point de synchronisation | `docs/inventaire/sources.json` déclare les sources, les aides et les plans |
| `scripts/pins-servis.mjs` dans `publish.yml` | publication du kit | publication de l'adaptateur | les documents épinglent les trois versions, servies une par une |

## Décisions

Le mainteneur a validé toutes les recommandations des trois rapports, avec ces
précisions.

- PP-01 : la promesse se retire. PP-02 : les textes suivent `FAMILLES` du linter, plus la parité. PP-03 : le repli du workflow épingle la version. PP-04 : `SEUILS_D_ACCESSIBILITE` dérive du référentiel. PP-06 : la constante reste écrite, un test la garde. PP-08 : un test exige chaque propriété du schéma dans `FORMAT.md`. PP-11 : une seule lecture sans BOM dans le kit, employée partout. PP-12 : « présente sous une autre casse » bloque partout. PP-20 : chaque sens de « famille » se qualifie. PP-21 : le hub sort du workspace, de `npm run vues` et de l'inventaire. PP-23 : `engines` passe à `>=22`. `parametres.json` devient la donnée d'un test racine, après les corrections. Les mineurs suivent leur garde proposée.
- Zone 1 : option (a) partout. PP-106 reçoit une entrée de `CHANGELOG-FORMAT.md`. PP-109 crée `ucm rapport-github`. PP-112 : tous les plugins UCM sont sombres ; la règle s'écrit dans son domicile et s'applique à Palettes et à l'Exporter. Les trois points « à vérifier en recette Figma » deviennent des cases `(mainteneur)`.
- Zone 2 : PP-201, test de couverture des aides. PP-202, les réglages de slot ne lient pas le code. PP-205, le validateur suit le schéma. PP-206, l'écriture garde le décalage de `center`. PP-207, une seule procédure ; l'interdiction d'ouvrir l'ancien code reste à `consommer-contrat`. PP-208, seule une section répond à un ancrage, et `ucm aides` signale une réponse en tête. PP-210, `RECETTE.md` adopte `consommer-contrat` avec une grille de jugement.
- PP-204 : l'aide prévient que le `default` d'un `instance-swap` publié jusqu'ici est un identifiant Figma, et l'Exporter publie désormais le nom du composant.
- Interface : aucun agent ne lance `test:ui`. Le mainteneur fait la recette visuelle de chaque plugin touché (11.10 à 11.12).
- PP-111 : `layOuts` et `TypoGraphy` étaient des entrées d'essai de l'audit. La garde de la zone 1 s'applique sans exception, et une divergence réelle se corrige selon la forme Figma, celle que voit Architect.
- Zone 3 : les recommandations du rapport. Un changement de `.claude/settings.json`, de `.claude/settings.local.json`, de `CLAUDE.md`, ou d'un hook ou d'une définition d'agent qui change ce qu'un agent a le droit de faire, attend l'accord du mainteneur sur le diff exact (cases 8.4 à 8.6). Aucun autre lot n'en dépend. PP-309 commence par un essai du mainteneur sur son poste.
- Zone 4 : PP-401 est écarté, Display P3 étant hors du périmètre d'UCM. PP-402 (a), PP-403 (a), PP-404 (a), PP-405 (a) puis (b), PP-406 (a), PP-407 (a), PP-408 (b), PP-410 (a). PP-409 suit sa garde proposée. Les textes du designer sont donnés mot pour mot, en français simple.

### Choix du plan, à relire par le mainteneur

Ces choix ne viennent d'aucune décision écrite.

- PP-204 garde la version 14.0 du contrat. Le changement relève de la classe 4 de `COMPATIBILITE.md`, appliquée à une valeur : le champ garde son nom, son type et sa place. UCM-Playground porte 4 contrats 13.0, et les fixtures du kit aucun contrat 14.0 : aucun corpus 14.0 n'est diffusé, et la clause du prototype s'applique. L'aide reconnaît l'ancienne forme à ses deux nombres séparés par `:`. Si un repository consommateur a déjà fusionné un contrat 14.0 avec un `default` d'`instance-swap`, le changement monte la majeure (15.0) au lieu de rester en 14.0.
- Un `default` d'`instance-swap` qui ne se résout pas dans le fichier Figma n'est pas publié. L'absence dit « aucun défaut publié » (`FORMAT.md`).
- Les messages du kit écrivent `npx @ucm-kit/cli <commande>`, qui ne résout jamais un paquet étranger. Les aides et la procédure écrivent `ucm <commande>`, et le guide imprime en tête la commande épinglée.
- Une implémentation présente sous une autre casse bloque, sous Windows comme sous Linux, toute demande qui juge le code du composant. Une demande de contrats seuls reste verte.
- PP-109 aligne GitLab sur la règle du workflow GitHub : un rapport est une note du compte qui commence par le marqueur, la plus récente l'emporte, et le marqueur sans objet compte dans les deux premières lignes.
- PP-20 n'écrit rien dans `referentiel/lexique.ts`, qui prépare les noms d'un fichier Figma et ne porte aucun glossaire. Le complément se lit dans les textes, et un signal de `controle-style.mjs` le garde dans les guides.
- PP-21 laisse `packages/hub` sur le disque, hors du workspace. Les six palettes de démonstration passent dans `docs/inventaire/releves.ts`.
- PP-206 : `scale` s'écrit comme `stretch`. Le contrat ne publie pas la proportion que Figma garde au redimensionnement, et ce manque se rapporte au développeur.
- PP-203 : `paragraphSpacing` s'écrit `margin-block-end` sur chaque paragraphe sauf le dernier.
- PP-313 : option (a). Les motifs fermés (`docs/notes/Archives/**`, `.agents/skills/*/SKILL.md`, `.claude/agents/*.md`) listent leurs fichiers dans `.agents/documents-fermes.json`, et un dossier de recherche reste libre par `npm run sujet`.
- PP-302 : `hook-etat.mjs` ne refuse qu'une fois par tour. Un `.md` qu'une autre session modifie peut y figurer, et le second arrêt, `stop_hook_active` à vrai, passe.
- PP-315 : `.js` reste hors du contrôle, et `estJugeable` le dit une seule fois.
- PP-402 : un minimum admis va du seuil AA du référentiel (4,5 pour le texte, 3 pour les éléments graphiques) à 21. Une recette importée sous ce seuil est refusée avec le message de la règle.
- PP-405 : `ucm check` compose une couleur translucide sur son fond, et écrit une ligne « non vérifiée » pour une couleur Display P3, une valeur hors des limites ou une chaîne d'alias trop longue.
- PP-410 : seules les phrases de couleur d'Architect passent à « nuance ». « crans de l'échelle », qui parle des tailles, reste.
- Versions : kit 0.18.0, parce que `lireConfiguration` refuse un motif sans `{id}` et que `preparerControle` change sa commande de dérogation (deux ruptures de la prise) ; CLI 0.4.0, pour la nouvelle commande, le nouveau blocage de casse et les workflows générés ; adaptateur 0.3.0, parce que l'interface attendue suit `{id}`, que `engines` monte et que la liste sans unité suit React 19. Le format ne monte pas : `CONTRACT_VERSION` reste 14.0 et `TOKENS_FORMAT_VERSION` reste 2.

## Vague 0

- [x] 0.1 Conversation principale. Commiter ce plan, `pistes.json` et `INVENTAIRE-UCM.html` régénéré par `npm run vues`. Ajouter à `.agents/skills/publier-paquets/SKILL.md`, après le titre, la puce suivante, en chargeant `rediger-pour-agents`. Commit : `1b077cd4`.
  - « **Verrou P27.** Ne publier ni `@ucm-kit/core`, ni `@ucm-kit/cli`, ni `@ucm-kit/adapter-typescript` tant que cette puce existe : `main` porte un travail de P27 non publié (`docs/notes/Recherches/Parametres partages/PLAN-CORRECTIONS-P27.md`). Rendre la question au mainteneur. La case 11.3 du plan la retire. »

## Vague 1

- [x] 1.1 `implementeur`. Lecture des JSON du dépôt (PP-11, PP-10 pour le kit). Commit : `1e99663f`.
- [x] 1.2 `executant`. Version du contrat dans les tests (PP-06, PP-07). Commit : `ed5b2441`.
- [x] 1.3 `implementeur`. Familles, rendu et nombres documentés (PP-01, PP-02, PP-07, PP-09, PP-20). Commit : `74f61db1`.

### Lot 1.1. Lecture des JSON du dépôt

Nature : déplacement de code à sortie identique, plus la correction de trois
lectures sans retrait du BOM (les deux autres, `init.mjs` et `deroger.mjs`, vont
au lot 2.2).

À lire : `packages/kit/src/lecteurs/controle-du-code.mjs:55-65`, `:570-640` ;
`packages/kit/src/lecteurs/controle-repository.mjs:100-115`, `:1180-1240`,
`:1295-1305`, `:1355-1365`, `:470-505` ; `packages/kit/src/lecteurs/configuration.mjs:20-35` ;
`packages/kit/src/lecteurs/derogations.mjs:1-20`, `:80-95` ;
`packages/kit/src/lecteurs/controle-du-code-listes.mjs:305-315` ;
`packages/adapter-typescript/src/generation.mjs:78-86` ;
`packages/plugin-exporter/src/depot.ts:140-150`.

- Dans `packages/kit/src/format/configuration.ts`, ajouter `jsonSansBom(texte: string): unknown`, qui retire un BOM de tête puis appelle `JSON.parse`, et l'exporter par `packages/kit/src/format/index.ts`. Le module reste sans `node:`.
- Dans `packages/kit/src/lecteurs/configuration.mjs`, ajouter `lireJsonDuDepot(chemin)`, qui lit le fichier en UTF-8 et rend `jsonSansBom(texte)`. Elle lève comme `readFileSync` et `JSON.parse`. L'exporter par `lecteurs/index.mjs` et déclarer dans `index.d.mts` : `/** Un JSON du repository, BOM de tête retiré ; lève comme readFileSync et JSON.parse. */ export function lireJsonDuDepot(chemin: string): unknown;`.
- Remplacer par `lireJsonDuDepot` chaque `JSON.parse(readFileSync(…).replace(/^﻿/, ""))` et chaque `retirerBom` de ces fichiers : `configuration.mjs:29`, `controle-du-code.mjs:578` et `:633`, `controle-repository.mjs:110`, `:1300` et `:1361`, `generation.mjs:82`. `controle-du-code.mjs:406` relève un texte de code, pas un JSON : il garde un retrait de BOM, écrit par `jsonSansBom` ou par une fonction `sansBom` exportée à côté de lui dans `format/configuration.ts`.
- `depot.ts:145` appelle `jsonSansBom` au lieu de son propre retrait.
- Les deux lectures identiques de `.ucm/derogations.json` (`controle-du-code.mjs:587-596` et `controle-repository.mjs:1190-1200`) deviennent un appel à une seule fonction `lireDerogationsDuDepot(racine)` de `derogations.mjs`, qui rend ce que les deux rendaient.
- PP-10 : `controle-du-code-listes.mjs:313`, `controle-repository.mjs:475` et `:502` écrivent le chemin par `CHEMIN_DES_DEROGATIONS`. Le texte rendu ne change pas.
- Tests : J1 à J8.
- Fin : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- adapter`, `npm run test:paquet -- exporter` et `npm run typecheck` passent, hors des échecs admis. `grep -rn "uFEFF\|0xfeff" packages/kit/src packages/adapter-typescript/src packages/plugin-exporter/src` ne rend que `format/configuration.ts`.

### Lot 1.2. Version du contrat dans les tests

Nature : remplacement listé. Rien d'autre ne change.

- Dans chacune de ces lignes, remplacer le littéral `"14.0"` par `CONTRACT_VERSION`, et ajouter en tête du fichier `import { CONTRACT_VERSION } from "@ucm-kit/core/format";` s'il n'y est pas : `packages/cli/tests/check.test.mjs:19`, `packages/cli/tests/verdictGit.test.mjs:23`, `packages/kit/tests/caracteristiques.test.mjs:20`, `packages/kit/tests/contrats-fabriques.mjs:100`, `packages/kit/tests/controleRepository.test.mjs:37`, `packages/kit/tests/diagnostic-architecture.test.mjs:165`, `packages/kit/tests/diagnostic-contrastes.test.mjs:73`, `:152` et `:212`. Un fichier qui importe déjà de `@ucm-kit/core/format` reçoit le nom dans l'import existant.
- Dans `tests/fabriquesDeFichiers.ts:71`, remplacer `version: 1` par `version: VERSION_DES_REGLES`, importé de `../packages/kit/src/protocoles/nommage` (le fichier importe déjà du kit de cette façon ; sinon, suivre la forme de ses autres imports).
- À la fin de `packages/kit/tests/fenetre-de-lecture.test.mjs`, ajouter ce test, et `VERSION_CONTRAT_MAXIMALE` à l'import de `version-contrat.mjs` (ou de la porte que le fichier importe déjà), `CONTRACT_VERSION` à un import de `@ucm-kit/core/format` :

```js
test("la borne basse de la fenêtre est la version qui précède CONTRACT_VERSION dans CHANGELOG-FORMAT.md", () => {
  const ici = dirname(fileURLToPath(import.meta.url));
  const journal = readFileSync(join(ici, "..", "..", "..", "docs", "format", "CHANGELOG-FORMAT.md"), "utf8");
  const versions = [...journal.matchAll(/^## (\d+\.\d+)\s*$/gm)].map((m) => m[1]);
  const rang = versions.indexOf(CONTRACT_VERSION);
  assert.ok(rang > 0, `CHANGELOG-FORMAT.md n'a pas de section « ## ${CONTRACT_VERSION} » précédée d'une autre.`);
  assert.equal(VERSION_CONTRAT_MAXIMALE, CONTRACT_VERSION);
  assert.equal(VERSION_CONTRAT_MINIMALE, versions[rang - 1],
    `VERSION_CONTRAT_MINIMALE doit valoir ${versions[rang - 1]}, la version qui précède ${CONTRACT_VERSION} dans CHANGELOG-FORMAT.md.`);
});
```

- Fin : `npm run test --workspace @ucm-kit/core`, `npm run test:paquet -- cli`, `node scripts/run-tests.cjs` et `npm run typecheck` passent, hors des échecs admis. Les neuf lignes ne portent plus `"14.0"`.

### Lot 1.3. Familles, rendu et nombres documentés

Nature : textes donnés, un signal de style et un test racine nouveau.

Textes, à écrire tels quels :

- `CONCEPT.md:134-135`, remplacer « Un écart du code bloque la fusion sur quatre familles : couleurs et tokens, dimensions et espacements, typographie, structure et ordre. » par « Un écart du code bloque la fusion sur quatre familles de propriétés CSS, `couleur`, `dimension`, `typographie` et `effet`, et sur la parité de l'API avec le contrat. »
- `docs/guides/POUR-LES-DESIGNERS.md:218-219`, remplacer « Un écart du code bloque sur quatre familles : les couleurs et les tokens, les dimensions et les espacements, la typographie, la structure et l'ordre. » par « Un écart du code bloque sur quatre familles de propriétés CSS, `couleur`, `dimension`, `typographie` et `effet` (opacité, ombres, flous), et sur la parité de l'API : les props et les variants que le contrat publie. »
- `docs/guides/POUR-LES-DESIGNERS.md:223-225`, remplacer « La mesure automatique du rendu bloque. Votre validation visuelle ne bloque jamais : un rendu que vous validez devient la capture de référence, et un changement du code seul qui modifie cette capture bloque. » par « Aucun contrôle ne mesure le rendu : relisez le rendu du composant dans la demande du développeur (VALIDATIONS-MVP.md). Votre validation visuelle ne bloque jamais. », où « VALIDATIONS-MVP.md » est un lien Markdown vers `../../VALIDATIONS-MVP.md`.
- `VALIDATIONS-MVP.md:164`, remplacer « comme tout écart du code sur quatre familles, » par « comme tout écart du code sur les quatre familles de propriétés CSS `couleur`, `dimension`, `typographie` et `effet`, ».
- `docs/guides/LINTER-UCM.md:30`, remplacer « Les listes (familles, propriétés, valeurs neutres) » par « Les listes (familles de propriétés, propriétés, valeurs neutres) ».

Signal de style (PP-20). Dans `scripts/controle-style.mjs`, ajouter le motif
`famille-sans-complement` à `NIVEAUX_DES_SIGNAUX`, au niveau `{ agent: null,
html: null, autre: 'signal' }`, et le relever comme les autres signaux : le mot
« famille » ou « familles » qui n'est suivi ni de « de », « d' », « d’ », « du »,
« des », ni d'un code entre accents graves, et qui n'est pas lui-même dans un
code. Message, entre guillemets : « Dire de quelle famille il s'agit, famille
de propriétés, famille de constats, famille de teinte ou famille de police. »
`tests/styleMotifs.test.ts` reçoit les cas D5 et D6.

Test racine `tests/copiesDocumentees.test.ts`, créé. Il définit en tête
`const lire = (chemin: string) => readFileSync(join(RACINE, chemin), 'utf8');`,
que le lot 3.1 réemploie. Cas D1 à D6. La table de D4 tient une ligne par
copie : document, motif, valeur calculée par import.

| Document | Copie | Source |
|---|---|---|
| `docs/format/FORMAT.md`, `packages/plugin-exporter/invariants/arbre-des-slots.md` | « 12 niveaux » | `MAX_STRUCTURE_DEPTH`, `packages/plugin-socle/src/composant/contract/structureTree.ts` |
| `docs/format/FORMAT.md` | groupes sans unité (`opacity`, `fontweight`, `z-index`, `aspect-ratio`), comparés sans tiret | `UNITLESS_GROUPS`, `packages/plugin-exporter/src/tokens/exportTokens.ts` (ajouter `export`) |
| `packages/plugin-architect/SPEC.md` | « 2 000 layers » | `BUDGET_DE_LAYERS_PAR_DEFAUT`, `packages/plugin-socle/src/composant/contract/budget.ts` |
| `AGENTS.md`, `docs/guides/RECETTE.md` | « huit fichiers » | le nombre de fichiers que `node packages/cli/src/ucm.mjs init --forge github` écrit dans un dossier temporaire, gabarits exclus |
| `docs/guides/RECETTE.md` | `"contractVersion": "14.0"` du critère 4 | `CONTRACT_VERSION` |
| `docs/inventaire/releves.ts` | `CODES_DE_LA_VUE_TOKENS` | la constante d'Architect qui range ces codes dans la section Tokens ; sans constante, retirer la ligne et le dire au compte rendu |

Le nombre « huit » se compare en lettres : la table porte une fonction qui écrit
un entier de 1 à 12 en lettres.

- Ajouter la ligne `- copiesDocumentees.test.ts : copies du code dans la documentation (familles, rendu, version du contrat, nombres)` à la section `## tests/` de `CARTE.md`, à son rang alphabétique.
- Fin : `npx tsx --test tests/copiesDocumentees.test.ts tests/styleMotifs.test.ts tests/styleDocumentaire.test.ts tests/cartes.test.ts`, `npm run test:paquet -- exporter` et `npm run typecheck` passent. `node scripts/controle-style.mjs CONCEPT.md docs/guides/POUR-LES-DESIGNERS.md` ne rend aucun refus.

## Vague 2

- [x] 2.1 `implementeur-exigeant`. Casse, motif `{id}` et commandes du kit (PP-12, PP-104, PP-22, PP-209). Commit : `2e4b8b56`.
- [x] 2.2 `implementeur`. Fichiers qu'`ucm init` écrit (PP-03, PP-10, PP-11, PP-14, PP-22, PP-23, PP-24). Commit : `e17ab137`.
- [x] 2.3 `implementeur`. Propriétés de `FORMAT.md` et autorités des invariants (PP-08, PP-16). Commit : `61fdeff4`.

### Lot 2.1. Casse, motif `{id}` et commandes du kit

Nature : correction de trois défauts et rupture de la prise, décidée par le
mainteneur.

À lire : `packages/kit/src/lecteurs/implementation.mjs` (75 lignes) ;
`packages/kit/src/lecteurs/controle-repository.mjs:60-80`, `:150-170`,
`:315-325`, `:1005-1030`, `:1410-1420` ; `packages/kit/src/lecteurs/verdict-bilan.mjs:125-215` ;
`packages/kit/src/format/configuration.ts:35-50`, `:110-135` ;
`packages/cli/src/init.mjs:118-130` (le refus de `{id}` qu'`init` applique
déjà) ; `packages/adapter-typescript/src/parite.mjs:10-20`, `:300-330` ;
`packages/kit/src/lecteurs/index.d.mts:400-420`, `:530-540`, `:990-995` ;
`packages/kit/src/lecteurs/derogations.mjs:150-170` ; `packages/kit/CHANGELOG.md`
(les deux dernières versions, pour la forme).

Casse (PP-12) :

- `implementation.mjs` gagne `etatDeLImplementation(cheminContrat, { motif, lister })`. `lister(dossier)` rend les noms d'un dossier (défaut `readdirSync`, tableau vide si le dossier manque). L'état vaut `{ presente: true }` quand le nom exact figure dans le dossier, `{ presente: false, autreCasse: "<nom trouvé>" }` quand seul un nom égal sans la casse y figure, `{ presente: false }` sinon. `existsSync`, qui ignore la casse sous Windows et macOS, disparaît de ce module.
- `implementationPresente` rend `etatDeLImplementation(…).presente`, signature inchangée. Ses lecteurs (`controle-repository.mjs`, `controle-du-code.mjs`, `perimetre-rapport.mjs`, `packages/cli/src/rangs.mjs`) rendent donc le même verdict sur tout système.
- Une implémentation `autreCasse` bloque toute demande qui juge le code du composant, et ne bloque pas une demande de contrats seuls. Porter le blocage par l'état `code-non-verifie` avec une raison `autre-casse` si `verdict-bilan.mjs` sait porter cette raison ; sinon par un état nouveau `implementation-autre-casse`, rangé juste après `code-non-verifie` dans `ETATS_DE_COMPOSANT`, dans `TEXTES_DES_ETATS`, dans `EtatDeComposant` de `index.d.mts` et dans `navigateur.d.mts`.
- Textes : phrase « fichier d'implémentation sous une autre casse » ; raison « Le fichier d'implémentation existe sous une autre casse que celle du motif. Windows le trouve, la CI sous Linux non. Le développeur le renomme. » ; ligne du rapport « `<trouvé>` existe, mais le motif attend `<attendu>`. Renommez le fichier. »

Motif `{id}` (PP-104, PP-22) :

- `champsInvalidesDeLaConfiguration` rend `implementation` pour un motif écrit sans `{id}`, comme `init.mjs:125`.
- `nomInterfaceAttendue(fichier, identifiant)` nomme l'interface `<identifiant>Props`. Sans second argument, l'identifiant reste le nom de base du fichier. Le relevé de l'API (`parite.mjs:305-330`) reçoit l'identifiant de chaque fichier et cherche la fonction du composant sous ce nom. `controle-repository.mjs:161` passe `identifiantDuContrat(chemin)`.
- Dans `index.d.mts`, `AdaptateurDImplementation` déclare la nouvelle signature et `cheminGabarits?: string` (« Le dossier des gabarits qu'`ucm init` copie dans `.ucm/gabarits/` ; absent quand l'adaptateur n'en publie aucun. »). `packages/adapter-typescript/src/index.d.mts` déclare `nomInterfaceAttendue(fichierComposant: string, identifiant?: string): string`.

Commandes (PP-209) :

- `derogations.mjs:163` écrit `npx @ucm-kit/cli deroger …` ; `controle-repository.mjs:320` écrit `` lancez `npx @ucm-kit/cli check` en local ``. Les commentaires `index.d.mts:534`, `:993` et `packages/kit/src/modules/index.d.mts:186` suivent. `grep -rn "npx ucm" packages/kit/src` ne rend plus rien.

Journal. Écrire en tête de `packages/kit/CHANGELOG.md`, dans la forme des
entrées existantes, le titre `## 0.18.0`, puis `### rupture` et ces deux
lignes, plus une troisième si `prise-attendus.json` change pour la casse :

- « `lireConfiguration` refuse un motif `implementation` sans `{id}`. Geste dans un module : écrire `{id}` dans le motif de `ucm.config.json`, par exemple `{dir}/{id}/index.tsx`. Décidé par le mainteneur (P27, PP-104). »
- « `preparerControle` écrit la commande de dérogation `npx @ucm-kit/cli deroger …` au lieu de `npx ucm deroger …`. Geste dans un module : aucun, le message s'affiche tel quel. Décidé par le mainteneur (P27, PP-209). »

Recopier dans `packages/kit/tests/prise-attendus.json` les résultats que
`apiPublique.test.mjs` affiche. Le test reste rouge jusqu'à 11.1, échec admis.

- Tests : K1 à K8.
- Fin : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- adapter`, `npm run test:paquet -- cli` et `npm run typecheck` passent, hors des échecs admis.

### Lot 2.2. Fichiers qu'`ucm init` écrit

Nature : correction de défauts et déplacement de constantes. Ce lot n'écrit pas
`guide.mjs` : le lot 4.1 y importe les constantes.

À lire : `packages/cli/src/init.mjs:120-145`, `:175-300`, `:315-345`,
`:350-415`, `:455-540`, `:600-690` ; `packages/cli/src/guide.mjs:44-57` ;
`packages/cli/src/deroger.mjs:50-100` ; `packages/cli/src/icons.mjs:15-30` ;
`packages/cli/src/rapport-gitlab.mjs:95-110`.

- `packages/cli/src/fichiers-du-consommateur.mjs`, créé, en-tête « Les chemins et les noms qu'`ucm init` écrit chez le consommateur, et que la CLI relit. » Il exporte, avec les valeurs qu'`init.mjs` écrit aujourd'hui : `RAPPORT_CI` (`ci-report.md`), `FEUILLE_DES_TOKENS` (`src/generated/tokens.css`), `WORKFLOW_GITHUB`, `CI_GITLAB` (`.gitlab/ucm.gitlab-ci.yml`), `CI_GITLAB_RACINE` (`.gitlab-ci.yml`), `RELAIS_D_AGENT` (les deux chemins de `SKILL.md`), `FICHIERS_EPINGLES` (`[...RELAIS_D_AGENT, WORKFLOW_GITHUB, CI_GITLAB]`), `CONVENTIONS`, `ARTEFACT_DU_RAPPORT` (`ucm-rapport`), les noms de job (`contrats`, `ucm` et le job qui publie la note GitLab), `VARIABLE_DU_JETON_GITLAB` (`UCM_GITLAB_TOKEN`) et `VERSION_DE_NODE` (`22`). `init.mjs` les emploie partout où il écrivait le littéral.
- PP-03 : `init.mjs:399` écrit `npx --yes @ucm-kit/cli@${version} "$@"`, et `:678` `npx --yes @ucm-kit/cli@${version} rapport-gitlab …`, avec la version que rend `versionDuPaquet()`.
- PP-11 : `init.mjs:357` et `:378`, `deroger.mjs:58` et `icons.mjs:23` lisent par `lireJsonDuDepot` (`@ucm-kit/core/lecteurs`).
- PP-14 : les filets `init.mjs:511` et `:671` prennent leur phrase d'une seule constante du module, écrite « réexporter ».
- PP-22 : l'exemple de tête `init.mjs:320` remplace « Gabarit : `.ucm/gabarits/composant.tsx`. » par « Composant de référence : `src/components/Button/Button.tsx`. ».
- PP-24 : `.gitattributes` écrit `<chemin de tokens écrit dans ucm.config.json> text eol=lf` au lieu de `tokens.json text eol=lf`. Après l'écriture, si `<racine>/node_modules/@ucm-kit/core/schema/ucm-contract.schema.json` manque, `init` écrit dans sa sortie, sans changer son code : « L'éditeur ne valide aucun contrat tant que node_modules/@ucm-kit/core/schema/ucm-contract.schema.json manque : installez @ucm-kit/cli en devDependency. »
- Dans `packages/cli/tests/cli.test.mjs` et `recette.test.mjs`, les noms recopiés (`ucm-rapport`, `contrats`, `ucm`, `UCM_GITLAB_TOKEN`, `ci-report.md`) s'importent du module.
- Une ligne `- src/fichiers-du-consommateur.mjs : chemins et noms qu'ucm init écrit chez le consommateur` dans `packages/cli/CARTE.md`.
- Tests : I1 à I8.
- Fin : `npm run test:paquet -- cli` et `npm run typecheck` passent, hors des échecs admis.

### Lot 2.3. Propriétés de `FORMAT.md` et autorités des invariants

Nature : documentation du format et réécriture de deux gardes.

À lire : `packages/kit/src/format/types.ts` (commentaires des 19 propriétés) ;
`docs/format/FORMAT.md:100-130` et la section de chaque propriété ;
`tests/inventaireInvariants.test.ts:55-70`, `:245-280`, `:430-530`.

- `FORMAT.md` décrit les 19 propriétés absentes : `componentKey`, `contractPath`, `nodeName`, `variantName`, `preferredValues`, `key`, `settings`, `stretchChildOnInsert`, `displayEmptyByDefault`, `minChildren`, `maxChildren`, `allowPreferredValuesOnly`, `horizontal`, `vertical`, `topLeft`, `topRight`, `bottomRight`, `bottomLeft`, `nodeSuffix`. Chacune reçoit sa forme et le sens de son absence, d'après le commentaire de `types.ts`, dans la section qui décrit déjà son objet parent. Les réglages d'un slot portent cette phrase : « Les `settings` d'un slot et les `preferredValues` d'un `slot` ou d'un `instance-swap` rapportent les réglages de la maquette. Ils ne lient pas le code : aucune borne ni liste ne s'impose à l'exécution. »
- PP-08 : un test de `tests/inventaireInvariants.test.ts` lit chaque nom de `properties` du schéma (`packages/kit/schema/ucm-contract.schema.json`, définitions comprises, `$ref` décodés par `decodeURIComponent`) et exige qu'il figure entre accents graves dans `FORMAT.md`. Une table `PROPRIETES_SANS_SECTION` nomme les exceptions avec leur raison. `AUTORITES_FORMAT` reste.
- PP-16 : le test des autorités relit chaque phrase « Autorité : » de `packages/*/invariants/*.md`, et exige que chaque symbole cité après un chemin existe dans ce fichier. La liste manuelle `AUTORITES` disparaît. Une aide de test citée comme autorité se range dans une table d'exceptions avec sa raison.
- `packages/plugin-architect/invariants/explorateur.md:46` cite `rolesAdmisDuLayer` à la place de `rolesAdmis`. Une autre phrase que le nouveau test refuse se range dans la table d'exceptions et se nomme au compte rendu, sans écrire dans un autre fichier d'invariants.
- Tests : F1 à F3.
- Fin : `npx tsx --test tests/inventaireInvariants.test.ts tests/docLinks.test.ts tests/styleDocumentaire.test.ts` et `npm run typecheck` passent.

## Vague 3

- [x] 3.1 `executant`. Textes des aides, de la procédure et de la recette (PP-202, PP-203, PP-204, PP-206, PP-207, PP-208, PP-209, PP-210, PP-212, PP-213, PP-215). Commit : `7a233f43`.
- [x] 3.2 `implementeur`. Questions des ancrages dans `ucm aides` (PP-208). Commit : `da8a121a`.
- [x] 3.3 `implementeur-exigeant`. Seuils de contraste (PP-04, PP-05). Commit : `3aab2611`.

### Lot 3.1. Textes des aides, de la procédure et de la recette

Nature : texte donné mot pour mot. Chaque remplacement cite le texte actuel ;
un texte actuel introuvable arrête le lot, et l'agent rend la question.

`packages/cli/aides/composant.md`, section Sens :

- Remplacer « Un `default` publié s'applique tel quel ; son absence laisse le choix au développeur. » par « Un `default` publié s'applique tel quel, sauf celui d'une prop `instance-swap`, qui nomme le composant choisi par défaut. Un `default` d'`instance-swap` en forme d'identifiant Figma, deux nombres séparés par `:` comme `12:345`, ne se recopie jamais : le composant par défaut se demande au développeur. L'absence d'un `default` laisse le choix au développeur. »
- Remplacer « Une prop `slot` reçoit une API explicite, sans sémantique que le contrat ne publie pas. » par « Une prop `slot` reçoit une API explicite, sans sémantique que le contrat ne publie pas. Son `default` rapporte la maquette et ne se recopie pas. Les `settings` d'un slot (`minChildren`, `maxChildren`, `allowPreferredValuesOnly`, `stretchChildOnInsert`, `displayEmptyByDefault`) et les `preferredValues` d'un `slot` ou d'un `instance-swap` rapportent les réglages de la maquette : ils ne lient pas le code, et aucune borne ni liste ne s'impose à l'exécution. Le `type` et la `key` d'une valeur préférée identifient un composant Figma. »

`packages/cli/aides/typographie.md`, section Écriture par défaut, ajouter à la
fin du paragraphe : « `paragraphIndent` donne `text-indent`, et
`paragraphSpacing` l'espace entre deux paragraphes du même texte, en
`margin-block-end` sur chaque paragraphe sauf le dernier. »

`packages/cli/aides/position-absolue.md`, section Écriture par défaut, remplacer
tout le paragraphe par : « `position: absolute` sur le slot et `position:
relative` sur son conteneur. Chaque clé d'`inset` devient la propriété du même
nom, sauf sur l'axe d'une accroche `center` ou `scale`. Une accroche `center`
centre le slot et garde son décalage : sur l'axe horizontal, `inset-inline: 0`,
`margin-inline: auto` et un `translate` horizontal de la moitié de `left` moins
`right` ; sur l'axe vertical, `inset-block: 0`, `margin-block: auto` et un
`translate` vertical de la moitié de `top` moins `bottom`, avec une taille autre
que `auto`. Un slot centré à 10 px du bord gauche et à 30 px du bord droit se
décale de 10 px vers la gauche. Une accroche `scale` s'écrit comme `stretch`,
ses deux côtés tels quels. Le contrat ne publie pas la proportion que Figma
garde au redimensionnement, et ce manque se rapporte au développeur. »

`packages/cli/aides/contour-ring.md` :

- Sens, remplacer « Sa nature et ses tokens viennent de `rendering.roles.ring` ; » par « Sa nature vient de `rendering.roles.ring` ; sa couleur et sa largeur viennent de `variants[].strokes[clé]`, et ses cibles de `paintPlacements.strokes[clé]` de la vue exacte ; ».
- Preuve, remplacer tout le texte par « Relecture contre la vue exacte. La comparaison visuelle au focus clavier revient au développeur ou au designer, après l'écriture du composant. »

Preuves, remplacer tout le texte de la section :

- `ombre.md` : « Relecture de chaque usage contre la vue exacte. La comparaison visuelle à la maquette revient au développeur ou au designer, après l'écriture du composant. »
- `opacite.md` : « Relecture de chaque opacité contre la vue exacte. La comparaison visuelle à la maquette revient au développeur ou au designer, après l'écriture du composant. »
- `rotation.md` : « Relecture contre la vue exacte. La comparaison visuelle à la maquette revient au développeur ou au designer, après l'écriture du composant. »

`packages/cli/aides/grille.md` :

- Sens, remplacer « Chaque enfant se place par `columnStart`, `rowStart`, `columnSpan`, `rowSpan` et `justifySelf`. » par « Chaque enfant se place par `columnStart`, `rowStart`, `columnSpan`, `rowSpan`, `justifySelf` et `alignSelf`. `rowGap` et `columnGap` espacent les rangées et les colonnes. »
- Écriture, remplacer « `grid-row` de même, et `justify-self`. » par « `grid-row` de même, `justify-self` et `align-self`. »

`packages/cli/aides/identifiants.md`, section Sens, ajouter à la fin : « `name`
garde le nom Figma exact. L'identifiant de code vient de `codeIdentifier`, et le
guide l'imprime dans « Contexte du contrat » : il nomme le fichier du contrat.
Avec l'adaptateur TypeScript, l'interface attendue est `<identifiant>Props`. »

`packages/cli/aides/resolution-token.md:24` et `:32` : `npx ucm tokens
references` devient `ucm tokens references`.

Une section `## Question` après la section Sens de chaque ancrage, avec ce
texte :

| Aide | Question |
|---|---|
| `attributs-natifs.md` | Comment le repository retire-t-il de la surface native un attribut qui porte le nom d'une prop du contrat ? |
| `chargement-feuilles.md` | Où la feuille des tokens se charge-t-elle, et quelle commande la génère ? |
| `comptage-dependances.md` | Sous quelle forme une occurrence de dépendance s'écrit-elle pour que le contrôle de parité la compte ? |
| `controles.md` | Quelle commande de types ou de syntaxe lancer sur le composant, en plus d'`ucm check` ? |
| `focus-clavier.md` | Comment le repository distingue-t-il le focus clavier du clic ? |
| `icone-composant.md` | Quel composant du repository reçoit un nom d'icône et une taille, et où vit-il ? |
| `identifiants.md` | Quels noms portent le point d'entrée du composant et sa surface de propriétés ? |
| `portee-mode.md` | Comment le repository pose-t-il l'attribut d'un mode sur un contenu rendu hors de l'arbre de son déclencheur ? |

`packages/cli/procedure.md` :

- Section « Ordre de travail », avant la liste, ajouter le paragraphe : « Un composant qui existe déjà se modifie à partir de son code : ne changer que ce que le contrat décrit, et garder le comportement, les événements et l'accessibilité. »
- Section « Ce qui ne se décide pas seul », remplacer « Un ancrage sans réponse dans les conventions devient une question au développeur, » par « Un ancrage sans section `## <ancrage>` dans les conventions devient une question au développeur, » et ajouter à la fin de la puce « Le texte de tête ne répond à aucun ancrage. »
- Section « Ce qui ne se fait pas », remplacer la puce « Ouvrir une ancienne implémentation du composant, ou un composant voisin pris comme modèle hors du gabarit que les conventions désignent. » par « Ouvrir un composant voisin pris comme modèle hors du gabarit que les conventions désignent. ».
- Dans la puce des dérogations, `npx ucm deroger` devient `ucm deroger`.

`docs/guides/RECETTE.md` :

- Ligne 275, le chemin `components/Button/Button.contract.json` prend le dossier `components` que l'étape 3 écrit dans `ucm.config.json`, celui de la ligne 310 (`src/components/…`).
- Étape 6, remplacer le premier paragraphe (« Le contrat est arrivé, … dans son propre fichier. ») par : « Le contrat est arrivé, le code n'existe pas encore. L'agent reconstruit le composant à froid en suivant la skill `consommer-contrat`, et elle seule : chemin absent avant de commencer, aucune implémentation antérieure ni capture Figma, sources supplémentaires limitées aux types générés et aux points d'intégration que les conventions nomment, compte rendu des manques. », où `` `consommer-contrat` `` est un lien Markdown vers `../../.agents/skills/consommer-contrat/SKILL.md`.
- Remplacer « Ajoutez le composant à `src/App.tsx` pour le voir à l'écran, et comparez son rendu à la maquette Figma, variante par variante. » par le texte et la table qui suivent.

> Ajoutez le composant à `src/App.tsx`. Vous comparez son rendu à la maquette Figma, variante par variante, et rangez chaque écart dans une ligne de cette grille.
>
> | Écart | Ce qu'il dit | Geste |
> |---|---|---|
> | donnée transcrite à tort | le contrat publie la valeur, et le code en rend une autre | défaut de l'agent ou de l'aide qui la décrit ; corriger l'aide |
> | donnée inventée | le code rend une valeur que le contrat ne publie pas | défaut de l'agent ; son compte rendu devait la signaler |
> | donnée manquante au contrat | la maquette montre une valeur que le contrat ne publie pas | défaut du contrat ; le compte rendu de l'agent la nomme |
>
> Un écart que le compte rendu de l'agent annonçait ne compte pas contre l'agent.

À la fin de `tests/copiesDocumentees.test.ts`, ajouter :

```ts
test('l’étape 6 de la recette suit la skill consommer-contrat et sa grille', () => {
  const recette = lire('docs/guides/RECETTE.md');
  const debut = recette.indexOf('## Étape 6');
  const etape = recette.slice(debut, recette.indexOf('\n## ', debut + 1));
  assert.match(etape, /\.agents\/skills\/consommer-contrat\/SKILL\.md/);
  for (const ligne of ['donnée transcrite à tort', 'donnée inventée', 'donnée manquante au contrat']) assert.ok(etape.includes(ligne), ligne);
});
```

- Fin : `npm run test:paquet -- cli`, `npx tsx --test tests/copiesDocumentees.test.ts tests/docLinks.test.ts tests/styleDocumentaire.test.ts` et `node --test tests/ecrituresDesAidesJugees.test.mjs` passent. `grep -rn "npx ucm" packages/cli/aides packages/cli/procedure.md` ne rend rien.

### Lot 3.2. Questions des ancrages dans `ucm aides`

Nature : code nouveau, sur des aides fabriquées dans le test. Le lot 3.1 écrit
les questions en même temps, et le lot 4.2 vérifie qu'elles y sont.

À lire : `packages/cli/src/aides.mjs` (200 lignes environ) ;
`packages/cli/src/conventions.mjs:1-60` (texte de tête, lignes `Contrôle :`).

- `lireAide` rend aussi `question`, le texte de la section `## Question` (`""` si absente).
- `ucm aides` sans argument : l'origine d'un ancrage sans section, dans des conventions dont le texte de tête n'est pas vide, s'écrit « ancrage sans réponse ; le texte de tête ne répond pas ».
- `ucm aides` signale, parmi les anomalies des conventions, un texte de tête qui porte une ligne `Contrôle :` sans section `## controles` : « Le texte de tête nomme `<commande>` par « Contrôle : », mais la question `controles` attend une section `## controles`. » Le code de sortie ne change pas.
- `--personnaliser` d'un ancrage écrit la question dans le commentaire du gabarit : `<!-- <question> Écrire ici la réponse du repository. -->`.
- Tests : Q1 à Q4, dans `packages/cli/tests/commande-aides.test.mjs`.
- Fin : `npm run test:paquet -- cli` et `npm run typecheck` passent, hors des échecs admis.

### Lot 3.3. Seuils de contraste

Nature : une règle et ses six lecteurs.

À lire : `packages/kit/src/referentiel/contraste.ts` (34 lignes) ;
`packages/kit/src/controles/accessibilite.ts:80-95` et les lecteurs de
`SEUILS_D_ACCESSIBILITE` ; `packages/kit/src/emplois/contraste.ts:70-90` ;
`packages/kit/src/lecteurs/diagnostic-contrastes.mjs:205-240` ;
`packages/plugin-architect/src/ui/textes/nomenclature.ts:105-115` ;
`packages/plugin-architect/src/ui/ignores/modele.ts:160-170` ;
`packages/plugin-palettes/src/i18n/fr.ts:490-500`, `:1788-1796`, et les mêmes
lignes de `en.ts` ; `packages/plugin-palettes/src/planche/modele.ts:270-280` ;
`docs/inventaire/releves.ts:205-216`.

- `referentiel/contraste.ts` gagne `SEUIL_GRAND_TEXTE_AA = 3` (WCAG 1.4.3, grand corps). `SEUILS_D_ACCESSIBILITE` se construit depuis le référentiel : `texte.AA = SEUILS_PAR_USAGE.texte`, `texte.AAA = SEUIL_TEXTE_AAA`, `grandTexte.AA = SEUIL_GRAND_TEXTE_AA`, `grandTexte.AAA = SEUILS_PAR_USAGE.texte`, `nonTexte = SEUILS_PAR_USAGE.nonTexte`. Les valeurs ne changent pas.
- `emplois/contraste.ts` exporte `ecrireSeuil(seuil, { separateur = ',', rapport = true } = {})` : le nombre avec toutes ses décimales, sans arrondi, le séparateur donné, puis `:1` si `rapport`. Elle remplace `seuilEcrit` de `diagnostic-contrastes.mjs:211`, `seuilEnTexte` d'`ignores/modele.ts:167` et `seuilEcrit` de `fr.ts:496` (`{ rapport: false }`) et d'`en.ts:496` (`{ separateur: '.', rapport: false }`). Palettes cesse d'arrondir un seuil à une décimale.
- Les textes interpolent le seuil du référentiel au lieu de l'écrire : `diagnostic-contrastes.mjs:234`, `nomenclature.ts:111`, `fr.ts:1793` et `en.ts:1794` (« AA dès … AAA dès … »), `releves.ts:213`. `planche/modele.ts:277` compare à `SEUILS_PAR_USAGE.texte`.
- Tests : S1 à S6.
- Fin : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- architect`, `npm run test:paquet -- palettes` et `npm run typecheck` passent, hors des échecs admis. `grep -rn "4,5:1\|4\.5\b\|3:1" packages/kit/src packages/plugin-architect/src packages/plugin-palettes/src` ne rend que `referentiel/contraste.ts` et des commentaires. Le compte rendu nomme les écrans de Palettes et d'Architect dont le texte change.

## Vague 4

- [x] 4.1 `implementeur`. Le guide (PP-10, PP-11, PP-204, PP-206, PP-207, PP-208, PP-209, PP-214, PP-215). Commit : `0c105f31`.
- [x] 4.2 `implementeur`. Couverture des aides (PP-201, PP-203, PP-211, PP-212, PP-213). Commit : `a7f94f71`.
- [x] 4.3 `implementeur-exigeant`. Noms, variants et validateur du kit (PP-19, PP-106, PP-110, PP-111, PP-205). Commit : `c926adfe`.

### Lot 4.1. Le guide

Nature : corrections du guide et tests des textes écrits en 3.1.

À lire : `packages/cli/src/guide.mjs` (en entier) ;
`packages/cli/src/fichiers-du-consommateur.mjs` ; `packages/cli/src/aides.mjs:25-50`
(`lireAide`, `question`) ; `packages/kit/src/lecteurs/variant-views.mjs:110-126` ;
`packages/kit/src/format/names.ts:10-20` (`codeIdentifier`).

- PP-10 : `FICHIERS_EPINGLES` (`guide.mjs:47-52`) s'importe de `fichiers-du-consommateur.mjs`.
- PP-11 : `lireJson` (`guide.mjs:57`) devient `lireJsonDuDepot`.
- PP-208 : un ancrage sans section s'imprime sous « Non tranché » avec sa question, dans la forme `- **<aide>** : <question>`. Le sens ne s'y recopie plus.
- PP-209 : le guide s'ouvre sur la ligne « Commande `ucm` de ce repository : `npx --yes @ucm-kit/cli@<version>`. Chaque `ucm …` de ce guide s'écrit avec elle. », la version étant celle de la CLI qui imprime le guide.
- PP-214 : chaque diagnostic d'export s'imprime avec sa combinaison et son champ quand il les porte, dans la forme du bloc ci-dessous, chaque parenthèse seulement si sa donnée existe. Le guide lit `contrat.meta.diagnostics` lui-même, sans changer `variant-views.mjs`.

```text
- <message> (variant « <variantName> », champ `<property>`, `<contractPath>`)
```

- PP-215 : « Contexte du contrat » ajoute la ligne « Nom Figma « <name> », identifiant de code `<codeIdentifier(name)>`. »
- Tests : G1 à G9.
- Fin : `npm run test:paquet -- cli` et `npm run typecheck` passent, hors des échecs admis.

### Lot 4.2. Couverture des aides

Nature : réécriture d'une garde, sans changer les aides.

À lire : `packages/cli/tests/aides.test.mjs` (en entier) ;
`packages/kit/src/lecteurs/caracteristiques.mjs:1-20`, `:55-110`, `:190-320` ;
`packages/kit/tests/caracteristiques.test.mjs:1-40`.

- PP-211 : le parcours du schéma décode chaque `$ref` par `decodeURIComponent` ; les 12 couples des définitions `SidedRefs<…>` entrent dans `CHAMPS` ; un test exige que chaque définition du schéma soit visitée.
- PP-201 : un test lit chaque aide (`lireAide`) et exige, pour chaque couple de `CHAMPS`, que la propriété figure entre accents graves (nom, forme CSS ou toutes ses valeurs d'énumération) dans une aide dont `quand` vaut la caractéristique du couple. Une table `EN_PROSE` nomme les exceptions, chacune avec la phrase que le test retrouve dans l'aide. Les 15 couples sans effet de rendu passent dans `SANS_AIDE`, avec une raison : `ContractMeta.contractVersion` (« version du format »), `ContractDiagnostic.code`, `.variantName`, `.property`, `.contractPath` (« diagnostic d'export, imprimé par le guide »), les 4 descriptions de props et d'états et `Contract.intent` avec ses 4 clés (« documentation »), `PropertyBindingDefinition.nodeSuffix` (« identité Figma »). L'en-tête de `caracteristiques.mjs:10-13` dit alors vrai.
- PP-203, PP-212 : la garde exige chaque clé de `TypographyTokens` dans `typographie.md`, et les cibles du `ring` dans `contour-ring.md`.
- PP-208 : un test exige une section `## Question` non vide dans chaque aide sans écriture par défaut.
- PP-213 : le cas `fabrique/grille-seule` entre dans `caracteristiques.test.mjs`. Un contrat dont la seule disposition est une grille relève `grille`, et l'aide `grille` cite `alignSelf`.
- Un couple que les textes de 3.1 ne couvrent pas arrête le lot : l'agent le nomme et n'écrit aucune aide.
- Tests : A1 à A6.
- Fin : `npm run test:paquet -- cli`, `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs` et `npm run typecheck` passent, hors des échecs admis.

### Lot 4.3. Noms, variants et validateur du kit

Nature : correction de défauts, une règle et ses lecteurs, et un changement des
chemins publiés.

À lire : `packages/kit/src/format/names.ts` (en entier) ;
`packages/kit/src/referentiel/reference.ts:80-100` ;
`packages/kit/src/controles/structure.ts:450-465` ;
`packages/kit/src/lecteurs/variant-views.mjs:75-100` ;
`packages/kit/src/lecteurs/validation-contrat.mjs:880-905`, `:1125-1140`,
`:1320-1340` ; `packages/plugin-socle/src/composant/contract/componentTree.ts:525-539` ;
`packages/kit/src/controles/projection-dtcg.ts:140-150` ;
`packages/kit/src/lecteurs/diagnostic-architecture.mjs:100-110` ;
`docs/format/CHANGELOG-FORMAT.md:228-280` et `:280-300` ;
`docs/format/COMPATIBILITE.md`, section des douze classes.

- PP-106 : `normalizeName` applique `normalize('NFC')` avant tout autre traitement. Entrée de `CHANGELOG-FORMAT.md`, dans la section `## tokens.json`, titre `### Forme Unicode des chemins` : « Classe 5. Un nom Figma en forme décomposée (`NFD`) publie le même chemin que sa forme composée (`NFC`) : `normalizeName` compose avant de normaliser. Un `tokens.json` qui portait un chemin décomposé publie au prochain export le chemin composé, et une référence écrite au clavier le retrouve. `TOKENS_FORMAT_VERSION` ne monte pas, et le nom CSS ne change pas. »
- PP-110 : `nomFigmaReconstruit(axes, etiquettes, valeurs)` dans `names.ts`, exportée par `format/index.ts`, rend `Axe=Valeur, Axe=Valeur`. `componentTree.ts:531-535` et `nomFigmaDuVariant` de `variant-views.mjs` l'appellent. Une étiquette vide suit la règle de `variant-views.mjs` (`estTexte`). `nomFigmaDuVariant11` (`validation-contrat.mjs:1326-1339`), que rien n'appelle, disparaît.
- PP-19 : `segmentDeNombre(nombre)` et `nombreDuSegment(segment)` côte à côte dans `referentiel/reference.ts`, exportées par `referentiel/index.ts`. `nom` (`reference.ts:90`) écrit par la première, `nombre` (`structure.ts:456-460`) lit par la seconde.
- PP-205 : `validation-contrat.mjs:887-899` accepte un `default` et des `preferredValues` absents, refuse `null`, comme le schéma.
- PP-111 : `packages/kit/tests/projectionEtFigma.test.ts`, créé. Il passe la fixture `tokensDeLiens` (celle de `packages/kit/tests/`, que `grep -rln tokensDeLiens packages/kit/tests` trouve) par `controlerLIntegriteUcm` et `controlerLeCatalogue`, sous ses noms Figma puis après `normalizeName` et `catalogueDepuisTokens`, et exige les mêmes constats, sans exception. Liste de renommages : les segments `onSolid`, `textOnSolid`, `BgSurface`, `primaryStrong`, `cornerRadiusXl`, `bgCanvasAlt`, puis les mêmes en minuscules. Une divergence réelle se corrige selon la forme Figma, celle que voit Architect, avec son cas dans ce test. Si `tokens.json` ne garde pas l'information qui la corrigerait, le lot s'arrête et l'agent rend la question.
- Tests : N1 à N6.
- Fin : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- socle`, `npm run test:paquet -- exporter` et `npm run typecheck` passent, hors des échecs admis.

## Vague 5

- [x] 5.1 `implementeur-exigeant`. Rapport précédent, `ucm rapport-github` et adresses des forges (PP-109, PP-10, PP-104 pour le README). Commit : `8746610b`.
- [x] 5.2 `implementeur-exigeant`. Règles et préparation d'Architect (PP-101, PP-102). Commit : `59374983`.
- [x] 5.3 `implementeur-exigeant`. Collisions de nom CSS (PP-103). Commit : `2d531e3a`.

### Lot 5.1. Rapport précédent, `ucm rapport-github` et adresses des forges

Nature : code nouveau, et une règle lue par deux forges.

À lire : `packages/cli/src/rapport-gitlab.mjs` (en entier) ;
`packages/cli/tests/gitlab.test.mjs:1-120` ; `packages/cli/src/init.mjs:500-580`
(le job GitHub et son étape `gh api`) ; `packages/cli/src/ucm.mjs:40-140`,
`:170-185` ; `packages/kit/src/lecteurs/controle-repository.mjs:205-225`
(`MARQUEUR_RAPPORT`, `MARQUEUR_SANS_OBJET`) ; `packages/kit/src/protocoles/index.ts` ;
`packages/plugin-exporter/src/forges/github.ts:1-30`, `gitlab.ts:1-20`.

- `packages/kit/src/lecteurs/rapport-precedent.mjs`, créé, exporté par `lecteurs/index.mjs` et déclaré dans `index.d.mts` : `rapportPrecedent(notes, compte)` reçoit `[{ id, auteur, corps, systeme }]` dans l'ordre de création et rend l'`id` de la plus récente note de `compte`, non `systeme`, dont `corps` commence par `MARQUEUR_RAPPORT`, ou `null`. `rapportSansObjet(rapport)` vaut vrai quand `MARQUEUR_SANS_OBJET` figure dans les deux premières lignes.
- `packages/kit/src/protocoles/forges.ts`, créé, exporté par `protocoles/index.ts` : `API_GITHUB = 'https://api.github.com'` et `API_GITLAB = 'https://gitlab.com/api/v4'`. `forges/github.ts`, `forges/gitlab.ts:15` et `rapport-gitlab.mjs:33` les importent.
- `packages/cli/src/rapport-github.mjs`, créé : `ucm rapport-github --depot <propriétaire/nom> --demande <numéro> --fichier <chemin> [--api <url>]`, jeton dans `GITHUB_TOKEN`. Il lit le compte (`GET /user` ; un 403 donne `github-actions[bot]`), lit toutes les pages de commentaires, choisit par `rapportPrecedent`, puis remplace (`PATCH`), crée (`POST`) si le rapport n'est pas sans objet, ou écrit « Cette demande de fusion ne touche aucun fichier suivi par UCM : aucun commentaire n'est créé. ». `requete` s'injecte comme dans `rapport-gitlab.mjs`, et les codes de sortie suivent les siens.
- `rapport-gitlab.mjs` lit toutes les pages, puis choisit par `rapportPrecedent` et `rapportSansObjet`. Son jeton se nomme par `VARIABLE_DU_JETON_GITLAB`.
- `ucm.mjs` : `COMMANDES` gagne `rapport-github` ; la ligne 178 lit `NOM_CONFIGURATION`.
- `init.mjs` : l'étape `gh api … --jq` du workflow GitHub devient `npx --yes @ucm-kit/cli@${version} rapport-github --depot "$GITHUB_REPOSITORY" --demande "$NUMERO" --fichier ${RAPPORT_CI}`, avec `GITHUB_TOKEN` dans `env`. Ses commentaires sur le jq disparaissent.
- `packages/cli/README.md` : une section pour `ucm rapport-github`, sur le modèle de `rapport-gitlab`, et la phrase « `implementation` must contain `{id}`: `ucm check` refuses a configuration without it. » dans la section de `ucm.config.json`.
- Lignes de carte : `packages/kit/CARTE.md` (`rapport-precedent.mjs`, `protocoles/forges.ts`), `packages/cli/CARTE.md` (`rapport-github.mjs`).
- Tests : R1 à R10.
- Fin : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- cli`, `npm run test:paquet -- exporter` et `npm run typecheck` passent, hors des échecs admis.

### Lot 5.2. Règles et préparation d'Architect

Nature : deux règles jumelles alignées, avec leurs tests de parité.

À lire : `packages/plugin-socle/src/composant/contract/rulesModel.ts:100-210` ;
`mergeBooleanDescriptions.ts` (en entier) ; `mergePropDescriptions.ts:60-80` ;
`packages/plugin-architect/src/regles.ts:150-220` ;
`packages/kit/src/referentiel/kit-de-regles.ts:70-80` ;
`packages/plugin-architect/src/sandbox/preparation.ts:85-100` ;
`packages/plugin-architect/src/preparations.ts:270-290` ;
`packages/kit/src/controles/nommage.ts:295-305` ;
`packages/kit/src/referentiel/reconnaissance.ts:28-50`.

- PP-101 : `cleDeRegle(texte)` exportée par `rulesModel.ts` rend la clé que l'Exporter compare (`normalizePropKey` du texte nettoyé). `rulesModel.ts`, `mergeBooleanDescriptions.ts` et `mergePropDescriptions.ts` la lisent. Architect l'importe (`ucm-plugin-socle/src/composant/contract/rulesModel`) et rattache une règle à sa propriété par égalité de `cleDeRegle`. Quand `nomCompacte` les rapproche et que `cleDeRegle` les sépare, Architect rend le C45 `regle-renommee` existant (`regles.ts:198`).
- PP-102 : le filtre de `sandbox/preparation.ts:91-96` lit `estDuComposant(cheminDeLaVariable(variable.nom, collection).join('/'), releve.jeu.nom)` ; `preparations.ts:282` cherche la variable publiée par `formeDuChemin`.
- Tests : P1 et P2.
- Fin : `npm run test:paquet -- socle`, `npm run test:paquet -- architect`, `npm run test:paquet -- exporter` et `npm run typecheck` passent, hors des échecs admis. Le compte rendu nomme les écrans d'Architect qui changent.

### Lot 5.3. Collisions de nom CSS

Nature : une règle et ses trois lecteurs.

À lire : `packages/kit/src/nommage/chemins-publies.ts` (en entier) ;
`packages/kit/src/lecteurs/tokens-dtcg.mjs` (`nomsCssDesTokens`) ;
`packages/kit/src/format/names.ts:40-80` (`tokenCssVariable`) ;
`packages/plugin-palettes/src/variables/noms.ts` (56 lignes) ;
`packages/plugin-architect/src/ui/textes/nomenclature.ts:260-275` ;
`packages/plugin-architect/src/ui/nomenclature/aAppliquer.ts:700-715`.

- `chemins-publies.ts` gagne le motif `meme-nom-css` : deux chemins publiés distincts au même `tokenCssVariable`. `cheminsEnConflit` et `pairesDejaEnConflit` le rendent comme les quatre autres.
- `segmentsDesPalettes` dédoublonne par le nom CSS du segment au lieu de `toLowerCase()`.
- Architect reçoit dans `TEXTES` de `nomenclature.ts`, à côté de `axeEtExtensions`, l'entrée du bloc ci-dessous, telle quelle. La table de `aAppliquer.ts:709` gagne `'meme-nom-css': TEXTES.memeNomCss`. Si la galerie d'Architect montre un renommage bloqué par `meme-axe`, elle reçoit le même état pour `meme-nom-css`.

```ts
  memeNomCss: (apres: string, autre: string): string => `\`${apres}\` et \`${autre}\` donneraient la même variable CSS dans le code : la feuille des tokens ne pourrait plus être générée. Renommez l’une des deux dans Figma.`,
```

- Tests : C1 à C4.
- Fin : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- palettes`, `npm run test:paquet -- architect` et `npm run typecheck` passent, hors des échecs admis. Le compte rendu nomme les écrans de Nomenclature qui changent.

## Vague 6

- [x] 6.1 `implementeur-exigeant`. Lecteurs de `tokens.json` et feuille CSS (PP-105, PP-107, PP-108, PP-11 pour la CLI). Commit : `91bfdf13`.
- [x] 6.2 `implementeur`. Défaut d'une prop `instance-swap` (PP-204, Exporter). Commit : `1c8f3cc7`.
- [x] 6.3 `implementeur`. Plugins sombres (PP-112). Commit : `df370fa5`.

### Lot 6.1. Lecteurs de `tokens.json` et feuille CSS

Nature : trois règles, chacune lue par plusieurs lecteurs.

À lire : `packages/kit/src/format/references.ts` (59 lignes) ;
`packages/kit/src/format/tokens.ts` (forme des valeurs) ;
`docs/format/FORMAT.md:1600-1625` ; `packages/kit/src/controles/projection-dtcg.ts:35-110` ;
`packages/kit/src/lecteurs/comparaison-dtcg.mjs:35-80` ;
`packages/kit/src/lecteurs/tokens-dtcg.mjs:95-110` et `nomsCssDesTokens` ;
`packages/cli/src/tokens-css.mjs:60-80`, `:310-330`, `:510-520`, `:610-620` ;
`packages/cli/src/tokens-references.mjs:20-30`, `:175-182` ;
`packages/cli/src/conventions.mjs:130-140` ;
`packages/plugin-exporter/src/tokens/exportTokens.ts:790-835` ;
`packages/kit/src/lecteurs/navigateur.mjs`.

- PP-108 : `references.ts` exporte, à côté de `TOKEN_REFERENCE`, `REFERENCE_DE_PREMIER_NIVEAU` (`{marque}`, sans point) et `referencesDansUnTexte()`, une expression globale construite sur la même source. `cheminDeReference` (`tokens-dtcg.mjs:102-106`), `ALIAS_ENTIER` (`projection-dtcg.ts:40`), `REFERENCE_DANS_UN_TEXTE` (`tokens-references.mjs:24`) et l'expression de `conventions.mjs:137` en dérivent. Une chaîne reçoit la même réponse partout.
- PP-107 : `valeurDuToken(type, valeur)` dans `format/tokens.ts`, exportée par `format/index.ts`, lit une valeur `dimension` ou `color` dans la seule forme de `FORMAT.md` et rend `{ valeur }` ou `{ refus }`. `projection-dtcg.ts` compte toute autre forme dans `valeursSautees` ; `comparaison-dtcg.mjs` la rend « non comparable » ; `litteral` de `tokens-css.mjs:64-76` refuse la feuille avec le refus rendu.
- PP-105 : `refusDesNomsCss(chemins)` dans `tokens-dtcg.mjs`, exportée par `lecteurs/index.mjs` et `navigateur.mjs` avec leurs déclarations, rend les trois refus de la feuille, un nom CSS vide, un préfixe réservé et deux chemins au même nom. `constatsDeNomsCss` de `exportTokens.ts:796-833` et le refus de `tokens-css.mjs:315-327` l'appellent.
- PP-11 : `tokens-css.mjs:514`, `:614` et `tokens-references.mjs:179` lisent par `lireJsonDuDepot`.
- Tests : T1 à T4.
- Fin : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- cli`, `npm run test:paquet -- exporter` et `npm run typecheck` passent, hors des échecs admis.

### Lot 6.2. Défaut d'une prop `instance-swap`

Nature : changement de ce que l'Exporter publie, décidé par le mainteneur.

À lire : `packages/plugin-socle/src/composant/analyse/proprietesEtEtats.ts:280-340`
et son appelant (`grep -rn "proprietesEtEtats" packages/plugin-socle/src`) ;
`packages/plugin-socle/src/composant/contract/propertyBindings.ts:25-45` (le nom
du composant propriétaire) ; `packages/kit/src/format/types.ts:60-80` ;
`docs/format/FORMAT.md:112-125`, `:1185-1205` ;
`docs/format/CHANGELOG-FORMAT.md:228-280` ;
`docs/format/COMPATIBILITE.md`, classe 4 et son application à `@default`.

- Le `defaultValue` d'une INSTANCE_SWAP est l'identifiant d'un composant. L'appelant le résout par `figma.getNodeByIdAsync` avant l'analyse et passe le nom : celui du component set parent, ou celui du composant s'il n'en a pas, la règle de `propertyBindings.ts:41`. Un identifiant qui ne se résout pas ne publie aucun `default`. `proprietesEtEtats.ts` reste synchrone.
- `types.ts:72` : « Nom du composant choisi par défaut : celui de son component set, ou le sien s'il n'appartient à aucun. » Puis `npm run schema`.
- `FORMAT.md` : la ligne `string, icon, instance-swap, slot` de la table des sources du `default` se coupe en deux. `string, icon, slot` garde sa source, et `instance-swap` reçoit « le nom du composant que désigne le `defaultValue` Figma, s'il se résout » avec « oui » pour l'absence. Après « Un `default` publié s'applique tel quel ; son absence laisse le choix au développeur. », ajouter « Le `default` d'une prop `instance-swap` nomme un composant, jamais un identifiant Figma. »
- `CHANGELOG-FORMAT.md`, section `## 14.0`, entrée `### Défaut d'une prop instance-swap` : « Classe 4, appliquée à une valeur. Le `default` d'une prop `instance-swap` porte le nom du composant choisi par défaut, celui de son component set s'il en a un. Il portait l'identifiant du composant dans Figma, comme `12:345`, qu'aucun code ne sait rendre. Le champ garde son nom, son type et sa place. La version reste 14.0 : aucun contrat 14.0 n'était diffusé, ni dans UCM-Playground ni dans les fixtures du kit, et le corpus se réexporte avant usage. Un lecteur reconnaît l'ancienne forme à ses deux nombres séparés par `:`. »
- `packages/plugin-exporter/SPEC.md`, dans la section qui décrit la lecture des component properties : « Le `defaultValue` d'une `INSTANCE_SWAP` est l'identifiant d'un composant. L'export publie son nom, résolu par `getNodeByIdAsync`, et ne publie aucun défaut s'il ne se résout pas. »
- Tests : E1 à E5.
- Fin : `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`, `npm run test --workspace @ucm-kit/core` (dont `schema.test.ts`), `npx tsx --test tests/docLinks.test.ts` et `npm run typecheck` passent, hors des échecs admis.

### Lot 6.3. Plugins sombres

Nature : règle écrite et appliquée à deux plugins. Interface changée.

À lire : `packages/plugin-socle/src/ui/socle.css:55-140`, `:405-415` ;
`packages/plugin-socle/src/ui/langage.css:75-95` ;
`packages/plugin-architect/src/ui/styles/commun.css:1-30` (le modèle) ;
`packages/plugin-architect/src/code.ts:28` ; `packages/plugin-palettes/src/code.ts:30-40` ;
`packages/plugin-exporter/src/code.ts:78-88` ; `CONTRIBUTING.md:234-245`.

- `CONTRIBUTING.md`, section « Interface du plugin », après son premier paragraphe : « **Thème.** Tous les plugins UCM sont sombres. `figma.showUI` reçoit `themeColors: false`, et l'interface garde ses couleurs sombres quel que soit le thème de Figma. `tests/pluginsSombres.test.mjs` tient la règle. »
- `themeColors: false` dans `plugin-palettes/src/code.ts:36` et `plugin-exporter/src/code.ts:83`.
- `socle.css` : le bloc `:root` prend les valeurs du bloc `.figma-dark` et `color-scheme: dark` ; le bloc `.figma-dark` et les valeurs claires disparaissent ; la règle `.figma-dark select.input` devient la règle de `select.input`. `langage.css:82` suit la même forme. Une feuille de Palettes ou de l'Exporter qui garde une valeur claire passe à la valeur sombre du socle.
- `tests/pluginsSombres.test.mjs`, créé : chaque `packages/plugin-*/src/code.ts` appelle `figma.showUI` avec `themeColors: false`, et `socle.css` ne déclare ni `.figma-dark` ni de bloc clair. Ligne `- pluginsSombres.test.mjs : les trois plugins sont sombres` dans la section `## tests/` de `CARTE.md`.
- Tests : H1 et H2.
- Fin : `npm run test:paquet -- palettes`, `npm run test:paquet -- exporter`, `npm run test:paquet -- architect`, `npx tsx --test tests/cartes.test.ts`, `node --test tests/pluginsSombres.test.mjs` et `npm run typecheck` passent, hors des échecs admis. Le compte rendu nomme les écrans de Palettes et de l'Exporter qui changent.

## Vague 7

- [x] 7.1 `implementeur`. Commandes documentées (PP-17, PP-209). Commit : `5648ffcb`.
- [x] 7.2 `implementeur`. Workspace, hub, Node et React (PP-18, PP-21, PP-23). Commit : `054edac6`.
- [x] 7.3 `implementeur`. Chroma des gris, destinations et textes recopiés (PP-13, PP-14, PP-15). Commit : `ba5fa822`.

### Lot 7.1. Commandes documentées

Nature : une garde nouvelle et la correction d'une sous-commande.

À lire : `packages/cli/src/ucm.mjs:40-260` ; `packages/cli/src/init.mjs:135-145` ;
`packages/cli/README.md:60-90`.

- L'usage d'`init` vient de `COMMANDES` seul : `ucm.mjs:51` et `:199` le lisent. `init.mjs:141` exporte `FORGES = ["github", "gitlab"]`, que `ucm.mjs` emploie.
- `ucm tokens <faute>` sort en 2 avec le message d'`ucm tokens` sans sous-commande, qui nomme `css` et `references`.
- `packages/cli/tests/commandesDocumentees.test.mjs`, créé. Il relève chaque `ucm <commande>[ <sous-commande>][ --option…]` entre accents graves ou dans un bloc de code de `packages/cli/README.md`, `packages/cli/procedure.md`, `packages/cli/aides/*.md`, `.agents/skills/consommer-contrat/SKILL.md`, `.agents/skills/regler-le-linter/SKILL.md` et des fichiers qu'`ucm init` écrit dans un dossier temporaire, et exige que la commande et chaque option existent dans `COMMANDES`. Il refuse `npx ucm` dans les aides, la procédure et `packages/kit/src/**`. Il exige que le bloc d'usage d'`init` du README égale l'usage de `COMMANDES`.
- Tests : M1 à M4.
- Fin : `npm run test:paquet -- cli` et `npm run typecheck` passent, hors des échecs admis.

### Lot 7.2. Workspace, hub, Node et React

Nature : manifestes, inventaire et une liste recopiée. Les fichiers d'agents
reçoivent le texte donné.

À lire : `package.json` ; `scripts/vues.mjs:30-50` ; `scripts/construire-plugin.mjs:25-40` ;
`tests/monorepoCoherent.test.mjs` ; `tests/kitCompileAJour.test.mjs:85-100` ;
`tests/referentielUnique.test.ts:110-130` ; `docs/inventaire/releves.ts:40-60`,
`:220-250`, `:280-290`, `:785-810` ; `packages/hub/src/modele/modele.ts:430-460` ;
`docs/inventaire/gabarit.html:175-185`, `:345-352` ;
`docs/inventaire/generer-inventaire.ts:105-115` ; `docs/inventaire/sources.json` ;
`packages/adapter-typescript/src/usages.mjs:15-35` ; `.github/workflows/ci.yml`,
`publish.yml` (lignes `node-version`).

PP-21, le hub :

- `workspaces` de `package.json` liste les huit paquets restants par leur chemin, sans `packages/hub`. `npm install` met `package-lock.json` à jour.
- `scripts/vues.mjs:40-41` et `scripts/construire-plugin.mjs:33` ne nomment plus le hub ; le message attendu de `tests/kitCompileAJour.test.mjs:94` suit.
- `PALETTES_DE_DEMONSTRATION` et `recetteDeDemonstration` passent de `packages/hub/src/modele/modele.ts:437-460` à `docs/inventaire/releves.ts`, avec leurs imports de `ucm-couleur`. L'inventaire ne lit plus rien du hub : ni l'import de `releves.ts:50`, ni l'entrée de `releves.ts:285`, ni le contrôle du sommaire de `releves.ts:804`, ni la ligne de `sources.json:17`, ni la ligne « Hub UCM » de `gabarit.html:182`. Les phrases qui le nomment deviennent : `gabarit.html:181` « Lu par Palettes et Architect. » ; `gabarit.html:350` « pour six palettes de démonstration au préréglage Tailwind » ; `generer-inventaire.ts:113` « Le jeu d'icônes que les trois plugins dessinent dans leur interface ».
- `tests/referentielUnique.test.ts` ne parcourt plus `packages/hub/` et perd l'exception de la ligne 121.
- `tests/monorepoCoherent.test.mjs` refuse un import de `packages/hub` ou d'`ucm-hub` hors de `packages/hub/`.
- `AGENTS.md`, première phrase : retirer « le Hub UCM et » ; dans la ligne `hub` de la table de routage, la première cellule devient `` `hub`, hors du workspace `` et les deux liens restent. `packages/hub/AGENTS.md`, après le titre : « Hors du workspace. `npm test`, `npm run vues` et l'inventaire ne le lisent pas, et aucun paquet ne l'importe. »

PP-23, Node :

- `engines.node` vaut `>=22` dans `packages/kit`, `packages/cli` et `packages/adapter-typescript`.
- `tests/monorepoCoherent.test.mjs` exige que la majeure d'`engines` égale `node-version` de `ci.yml` et de `publish.yml`, et `VERSION_DE_NODE` de `packages/cli/src/fichiers-du-consommateur.mjs`.

PP-18, React :

- `react-dom` entre en `devDependencies` de l'adaptateur à la dernière version 19 exacte (`npm view react-dom@19 version`).
- Un test de `usages.test.mjs` lit la liste des propriétés sans unité dans le `react-dom` installé (`unitlessNumbers` de `cjs/react-dom-client.development.js`, ou le fichier qui la porte) et la compare à `PROPRIETES_SANS_UNITE_DE_REACT`. Si elles diffèrent, la liste suit React 19, son commentaire cite la version, et `packages/adapter-typescript/CHANGELOG.md` reçoit sous `## 0.3.0` une entrée `rupture` qui nomme `lecteurDuCode`, les propriétés ajoutées ou retirées, le geste « aucun, le relevé suit React 19 » et « Décidé par le mainteneur (P27, PP-18) ». `usagesPromis.test.mjs` reçoit les résultats qu'il affiche.

- Tests : W1 à W3.
- Fin : `npm install` sans erreur, `node scripts/run-tests.cjs`, `npm run test:paquet -- adapter`, `npm run test:paquet -- cli`, `npm run typecheck` et `node scripts/vues.mjs --verifier` s'il existe passent, hors des échecs admis. `git ls-files packages/hub` reste inchangé.

### Lot 7.3. Chroma des gris, destinations et textes recopiés

Nature : une constante et ses lecteurs, deux littéraux, deux textes partagés.

À lire : `packages/couleur/src/palette.ts:130-145` ; `packages/couleur/src/alertes.ts:125-135`,
`:195-205` ; `packages/plugin-palettes/src/harmonisation.ts:265-270` ;
`packages/plugin-palettes/src/ordreDesPalettes.ts:15-25` ;
`packages/plugin-palettes/src/ui/harmonisation/carteRoue.ts:120-130` ;
`packages/plugin-palettes/src/ui/destination.ts:235-242` ;
`packages/kit/src/referentiel/architecture.ts:45-60` ;
`packages/plugin-architect/src/ecriture/structure.ts:168-178` ;
`packages/kit/src/controles/integrite.ts:448-455` ; `packages/kit/src/referentiel/signes.ts:425-432` ;
`packages/plugin-architect/src/ui/textes/structure.ts:60-66`, `analyse.ts:65-72`.

- PP-13 : `CHROMA_DES_PALETTES_COLOREES` disparaît. `palette.ts` exporte `estColoree(reference)`, qui vaut `!estReferenceGrise(reference)`. `alertes.ts:131` et `:202`, `harmonisation.ts:268`, `ordreDesPalettes.ts:22` et `carteRoue.ts:125` l'appellent. Une chroma de 0,05 exactement est colorée.
- PP-15 : `destination.ts:240` lit `DESTINATION_DES_PALETTES.collection` ; `ecriture/structure.ts:175` lit les noms de `brands` et d'`utility` dans la constante du référentiel qui les porte.
- PP-14 : `integrite.ts:452` lit une constante exportée `INDICE_CRAN_SANS_SENS` (« UCM ne sait pas si cette palette met un texte blanc ou noir sur ses boutons. »), par `controles/index.ts` ; `textes/structure.ts:64` l'importe. La phrase « Le composant a changé depuis l'analyse. » de `signes.ts:430` sort dans une constante exportée par `referentiel/index.ts`, que `textes/analyse.ts:69` importe. Le texte affiché ne change pas.
- Tests : U1 à U3.
- Fin : `npm run test:paquet -- couleur`, `npm run test:paquet -- palettes`, `npm run test:paquet -- architect`, `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs` et `npm run typecheck` passent, hors des échecs admis. Le compte rendu nomme les écrans de Palettes dont le classement d'une palette de chroma 0,05 change.

## Vague 8. Zone 3

Écarts PP-301 à PP-317 de [ZONE-3-OUTILLAGE-AGENTS.md](./ZONE-3-OUTILLAGE-AGENTS.md).
Les lots 8.1 à 8.3 ne touchent aucun droit d'un agent. Les cases 8.4 à 8.6
attendent l'accord du mainteneur, hors des vagues : aucun autre lot n'en dépend.

- [x] 8.1 `implementeur`. Domiciles, cartes et définitions de l'outillage (PP-303, PP-304, PP-312, PP-313, PP-314 hors `CLAUDE.md`, PP-317 pour `archiver-un-sujet`). Commit : `d35bbb12`.
- [x] 8.2 `implementeur`. Contrôle de style, hooks de style et skills (PP-307, PP-310, PP-311 signal, PP-315, PP-316 pour deux hooks, PP-317). Commit : `d553d1c3`.
- [x] 8.3 `implementeur`. Découvreurs de tests et conservation (PP-305, PP-308, PP-311 pour la skill). Commit : `a5d6c5e9`.
- [x] 8.4 (mainteneur). Essai de PP-309 : lancer un `verificateur` sur ton poste et lui demander son modèle. Une réponse Sonnet prouve que `CLAUDE_CODE_SUBAGENT_MODEL` prime sur le `model:` des définitions.
  - Essai d'un agent, avec la variable posée à `sonnet` par `.claude/settings.json` : le `verificateur` répond `claude-haiku-5-5`. Dans ce harnais, le `model:` de la définition prime. Rejoué depuis le panneau de l'éditeur du mainteneur, avec la variable posée à `sonnet` par `.claude/settings.json`, un `verificateur` répond `claude-haiku-5-5` : le `model:` des définitions l'emporte, et la variable ne sert à rien.
- [x] 8.5 (mainteneur). Valider le diff de la [note 8.6](#lot-86-droits-des-agents), après 8.4. Une partie refusée se retire de la note avant 8.6.
  - Le mainteneur valide les cinq parties de la note : registre `locaux` et `interdits` avec le hook des documents, `hook-etat.mjs`, `hook-commandes.mjs` avec la définition du `verificateur` et `CLAUDE.md`, retrait de la variable `CLAUDE_CODE_SUBAGENT_MODEL`, renvoi de `CLAUDE.md` vers `CONTRIBUTING.md`.
- [ ] 8.6 `implementeur`. Droits des agents (PP-301, PP-302, PP-306, PP-309, PP-314 pour `CLAUDE.md`, PP-316 pour le hook des documents), après 8.5 et le commit de la vague 8.

### Lot 8.1. Domiciles, cartes et définitions de l'outillage

Nature : données de routage, gardes nouvelles, textes d'agents donnés. Charger
`rediger-pour-agents` avant d'écrire `AGENTS.md`, `CARTE.md`, une définition ou
une skill.

À lire : `.agents/domiciles.json` (forme d'un domaine, clés `registre`,
`verifications`) ; `tests/domiciles.test.ts` ; `tests/cartes.test.ts` ;
`CARTE.md:35-70` ; `scripts/agents-contexte.mjs:40-80` (`correspond`,
`domaineDe`) ; `CONTRIBUTING.md:512-560` ; `.claude/agents/implementeur.md:1-15` ;
`.agents/skills/archiver-un-sujet/SKILL.md` ; `AGENTS.md:95-100`.

- PP-303 : un domaine `outillage-agents` dans `.agents/domiciles.json`. Fichier `CONTRIBUTING.md`, ancre `#travailler-avec-des-agents`. Chemins `scripts/**`, `.claude/**`, `.agents/**`, `CLAUDE.md`, `tests/**` ; un motif plus long d'un autre domaine l'emporte. Vérifications : `npx tsx --test tests/styleDocumentaire.test.ts tests/styleMotifs.test.ts tests/registreDesDocuments.test.ts tests/domiciles.test.ts tests/cartes.test.ts tests/agentsDefinis.test.ts` et `node scripts/controle-style.mjs`. `tests/domiciles.test.ts` étend sa première règle à tout fichier suivi de `scripts/`, `.claude/`, `.agents/` et `tests/`.
- PP-304 : un test de `tests/domiciles.test.ts` résout les imports `../src/…` de chaque `packages/*/tests/*.test.*` et exige la commande du paquet du test (`npm run test:paquet -- <nom>`, ou `npm run test --workspace @ucm-kit/core` pour le kit) dans les `verifications` du domaine de la source. Ajouter les commandes qui manquent aux domaines. Une table `LIENS_ADMIS` nomme chaque exception avec sa raison. Au-delà de dix exceptions, le lot s'arrête et l'agent rend la liste.
- PP-312 : `tests/cartes.test.ts` exige que chaque fichier ou dossier suivi de `scripts/`, `.agents/skills/` et `.claude/agents/` figure dans `CARTE.md`. `CARTE.md` reçoit `archiver-un-sujet/`, `regler-le-linter/`, les 7 définitions de `.claude/agents/`, et sa ligne de `.claude/settings.json` cite le hook `PreToolUse` de `hook-documents.mjs`.
- PP-313 : `.agents/documents-fermes.json`, créé, liste les fichiers suivis sous `docs/notes/Archives/**`, `.agents/skills/*/SKILL.md` et `.claude/agents/*.md`. Un test de `tests/domiciles.test.ts` refuse un fichier suivi sous ces motifs qui n'y figure pas. `AGENTS.md`, remplacer « Un nouveau document, une nouvelle skill ou un nouveau dossier de recherche demande l'accord du mainteneur, qui l'ajoute au registre de `.agents/domiciles.json`. » par « Un agent crée un dossier de recherche par `npm run sujet`. Une skill, une définition d'agent, une archive ou un document hors des motifs du registre demande l'accord du mainteneur, qui l'ajoute au registre de `.agents/domiciles.json` ou à `.agents/documents-fermes.json`. »
- PP-317 et PP-313 : `archiver-un-sujet/SKILL.md`, étape 4, ajouter « Supprimer le dossier vide : `tests/dossiersDeRecherche.test.ts` refuse un dossier sans motif. Ajouter les fichiers archivés à `.agents/documents-fermes.json`. »
- PP-314 : `CONTRIBUTING.md`, remplacer le paragraphe « **Ce que reçoit un implémenteur.** … » par « **Ce que reçoit un implémenteur.** L'orchestrateur lance `npm run agents:lire -- <chemins du lot>` et colle la liste dans le prompt, avec la note de conception du lot, la nature de la tâche, les fichiers que le lot écrit et ses critères de fin. Le plan d'ensemble reste au mainteneur et à l'orchestrateur. » Dans les trois définitions, remplacer « L'agent principal te donne le lot, le plan qui le décrit, les fichiers concernés et les critères qui disent qu'il est fini. » par « L'agent principal te donne la note du lot, la nature de la tâche, les fichiers que le lot écrit, ses critères de fin et la sortie de `npm run agents:lire`, comme le dit `CONTRIBUTING.md`, section « Travailler avec des agents ». »
- `tests/agentsDefinis.test.ts`, créé : la table de `CLAUDE.md` (agent, modèle) égale le `model:` de chaque définition, et chaque agent de la table a son fichier ; le corps de `implementeur.md` égale celui de `implementeur-exigeant.md`, et celui d'`executant.md` aux lignes propres près, nommées dans le test. Ligne `- agentsDefinis.test.ts : modèles et corps communs des définitions d'agents` dans la section `## tests/` de `CARTE.md`.
- Tests : O1 à O5.
- Fin : `npx tsx --test tests/domiciles.test.ts tests/cartes.test.ts tests/agentsDefinis.test.ts tests/registreDesDocuments.test.ts tests/docLinks.test.ts tests/styleDocumentaire.test.ts` passent ; `npm run agents:domicile -- scripts/hook-documents.mjs` rend `outillage-agents`.

### Lot 8.2. Contrôle de style, hooks de style et skills

Nature : gardes de style et corrections de texte d'agents. Charger
`rediger-pour-agents` avant d'écrire une carte, un invariant ou une skill.

À lire : `scripts/controle-style.mjs:1-60`, `:160-215`, `:690-760` ;
`scripts/hook-style.mjs` ; `scripts/hook-reponse.mjs` ;
`tests/styleMotifs.test.ts` ; `AGENTS.md:7-21` (bloc « Écrire ») ;
`packages/plugin-palettes/CARTE.md:90-100` ;
`packages/couleur/invariants/moteur-de-couleur.md`.

- PP-307 : ajouter `NFD` et `NFC` à `ACRONYMES`. Réécrire « en résumé » de `packages/plugin-palettes/CARTE.md:95`. Convertir les flèches de `moteur-de-couleur.md` en verbes (« renvoie à », « devient », « donne »). Retirer de `EXCLUS_DU_CONTROLE` et d'`AGENTS_A_CONVERTIR` chaque entrée qui ne produit plus de refus ni de flèche. Une entrée de `packages/plugin-palettes/src/i18n/fr.ts` qui garde un refus après l'ajout des sigles reste, et l'agent la nomme sans réécrire un texte du designer. Un test de `tests/styleMotifs.test.ts` exige que chaque entrée restante d'`EXCLUS_DU_CONTROLE` produise au moins un refus, et chaque entrée d'`AGENTS_A_CONVERTIR` au moins une flèche.
- PP-310 : une table `REGLES_ECRIRE` dans `controle-style.mjs`, une entrée par puce du bloc « Écrire » d'`AGENTS.md`, avec `regle`, `moyen` (`motif` ou `relecture`) et `portees` (`fichier`, `reponse`). Un test compare son nombre d'entrées au nombre de puces du bloc. `hook-reponse.mjs` applique les motifs à portée `reponse` : ceux de `MOTIFS_DE_REFUS_PARTOUT`, le tiret cadratin en incise, la datation, les intensificateurs, l'opposition, et un motif `offre-de-suite` (« souhaitez-vous », « si vous voulez, je peux », « je reste à disposition »).
- PP-311 : un signal `gras-multiple` dans `NIVEAUX_DES_SIGNAUX`, au niveau `{ agent: null, html: null, autre: 'signal' }`, relève plus d'un passage en gras dans une section `##`.
- PP-315 : `controle-style.mjs` exporte `estJugeable(chemin)`, lue par `fautesDuFichier`, par le contrôle du dépôt et par `hook-style.mjs`, qui ne recopie plus la liste des extensions. `.js` reste hors du contrôle.
- PP-316 : `hook-style.mjs` et `hook-reponse.mjs` entourent leur corps d'un `try` ; une erreur sort 2 avec « Le contrôle de style n'a pas pu s'exécuter : <message>. »
- PP-317 : une règle de refus `puce-collee` (`[.!?]- ` au milieu d'une ligne). `guide-composant/SKILL.md:82` sépare ses deux puces collées. `rediger-diagnostics-ucm/SKILL.md:7-8` nomme « le `CONTRIBUTING.md` racine, section « Messages destinés au designer » » au lieu du « `CONTRIBUTING.md` de l'exporteur ». `regler-le-linter/SKILL.md:10` devient « **Mesurer.** Avant et après le changement, lancer `npx tsx --test packages/kit/tests/apiPublique.test.mjs`, qui affiche le résultat de l'exemple généré depuis les listes. Compter les constats ajoutés ou retirés entre les deux affichages. Le nombre entre au journal. »
- Tests : S7 à S12.
- Fin : `npx tsx --test tests/styleMotifs.test.ts tests/styleDocumentaire.test.ts tests/docLinks.test.ts` et `node scripts/controle-style.mjs` passent.

### Lot 8.3. Découvreurs de tests et conservation

Nature : correction de deux gardes qui rendaient vert sans rien contrôler.

À lire : `scripts/verifier-conservation.mjs` ; `tests/verifierConservation.test.mjs` ;
`.agents/skills/rediger-pour-agents/SKILL.md:25-40`, `:123-137` ;
`packages/plugin-socle/build/run-tests.cjs` (`lancerLesTests`) ; les huit autres
`run-tests.cjs` ; `tests/monorepoCoherent.test.mjs`.

- PP-305 : `verifier-conservation.mjs` sort 2 quand `--domaines` désigne un domaine sans groupe source, avec « Le domaine <id> n'a aucun groupe source à comparer. Lancez --source <fichier>@<ref>. ». L'option `--source <fichier>@<ref>` compare le fichier d'arrivée à sa version de `<ref>`, par les mêmes atomes. La skill, étape 7.1, devient « `node scripts/verifier-conservation.mjs --source <fichier>@HEAD` : aucun manque de nom en code, nombre, identifiant ou cible de lien. Bloquant. » Un cas de `tests/verifierConservation.test.mjs` fait échouer « domaine sans groupe ».
- PP-311 : dans la skill, section 2, après « Titre en gras : phrase complète. », ajouter « Le titre de puce d'un invariant est le seul gras admis en plus du mot de section que permet `AGENTS.md`. »
- PP-308 : les huit découvreurs du workspace (`hub` exclu) lancent `tests/*.test.ts` et `tests/*.test.mjs`, directement sous `tests/` et sans descendre dans `tests/interface/` ni `tests/cascade/`. `tests/monorepoCoherent.test.mjs` liste les `*.test.*` suivis directement sous `packages/*/tests/` et exige que le découvreur de leur paquet nomme leur suffixe.
- Tests : S13 à S15.
- Fin : `npx tsx --test tests/verifierConservation.test.mjs`, `node --test tests/monorepoCoherent.test.mjs` et `npm run test:paquet -- <nom>` pour chaque paquet passent, sans test de plus en échec. Le compte rendu nomme chaque fichier `.test.mjs` que le découvreur lance désormais.

### Lot 8.6. Droits des agents

Nature : règles qui changent ce qu'un agent peut faire. Ce diff attend la case
8.5. Il s'applique tel quel, et une partie que le mainteneur refuse disparaît
de la note avant le lot. Le lot s'exécute seul, après le commit de la vague 8.

À lire : `scripts/hook-documents.mjs` ; `scripts/agents-contexte.mjs:20-80` ;
`tests/registreDesDocuments.test.ts` ; `scripts/hook-reponse.mjs:40-70` (lecture
de l'entrée, `stop_hook_active`) ; `scripts/controle-style.mjs` (`fautesDuFichier`).

PP-301, le registre :

- `agents-contexte.mjs` exporte `verdictDuRegistre(manifeste, chemin)` (`accepte` ou un refus avec son message) et `documentsHorsRegistre(racine)`. `.agents/domiciles.json` gagne la clé `"locaux": ["_local/**", "**/_local/**"]` : un `.md` y est accepté. `hook-documents.mjs` et `tests/registreDesDocuments.test.ts` lisent ces deux fonctions, et le hook perd son refus propre à `_local/`.
- `CONTRIBUTING.md`, section « Sujets de recherche et plans », après la table : « Une note de travail `.md` peut vivre dans `_local/`, que Git ignore. Un sujet de recherche n'y vit jamais. »

PP-316, le hook des documents : son corps passe dans un `try`. Une erreur
écrit sur la sortie standard, et sort 0 :

```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Le registre des documents est illisible : <message>. Confirmez la création à la main."}}
```

PP-302, l'état du dépôt : `scripts/hook-etat.mjs`, créé, branché sur `Stop` et
`SubagentStop`. Il sort 0 si `stop_hook_active` vaut vrai. Sinon il lit
`git status --porcelain`, garde les `.md` nouveaux ou modifiés, et sort 2 avec
la liste de ceux que `verdictDuRegistre` refuse ou que `fautesDuFichier` refuse :
« Ces documents enfreignent le registre ou le style : <liste>. Corrigez-les,
ou dites qu'une autre session les écrit. »

PP-306, `test:ui` : `.agents/domiciles.json` gagne `"interdits": ["test:ui",
"galerie:captures"]`. `scripts/hook-commandes.mjs`, créé, branché en
`PreToolUse` sur `Bash` et `PowerShell`, sort 2 quand `tool_input.command`
contient un de ces noms et que `_local/autorise-test-ui` n'existe pas : « `<nom>`
est réservé au mainteneur. Il crée `_local/autorise-test-ui` pour l'autoriser. »
Une erreur interne rend `ask`, comme le hook des documents.

`.claude/settings.json` devient, en entier :

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/hook-documents.mjs\"", "timeout": 30, "statusMessage": "Registre des documents" }
        ]
      },
      {
        "matcher": "Bash|PowerShell",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/hook-commandes.mjs\"", "timeout": 30, "statusMessage": "Commandes réservées" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/hook-style.mjs\"", "timeout": 30, "statusMessage": "Contrôle de style" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/hook-reponse.mjs\"", "timeout": 30, "statusMessage": "Style de la réponse" },
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/hook-etat.mjs\"", "timeout": 30, "statusMessage": "État des documents" }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/hook-reponse.mjs\"", "timeout": 30, "statusMessage": "Style du rapport" },
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/hook-etat.mjs\"", "timeout": 30, "statusMessage": "État des documents" }
        ]
      }
    ]
  }
}
```

Le bloc `env` et sa variable `CLAUDE_CODE_SUBAGENT_MODEL` disparaissent
(PP-309). Si l'essai 8.4 rend Haiku et que le mainteneur garde la variable, le
bloc `"env": { "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet" }` reste en tête, et
`tests/agentsDefinis.test.ts` ne reçoit pas l'assertion qui suit.

`tests/agentsDefinis.test.ts` reçoit l'assertion : `.claude/settings.json` ne
définit pas `CLAUDE_CODE_SUBAGENT_MODEL`.

`.claude/agents/verificateur.md`, champ `description` : retirer « test:ui, » de
la liste entre parenthèses, et ajouter à la fin « Ne lance `test:ui` que si
`_local/autorise-test-ui` existe. »

`CLAUDE.md`, deux lignes :

```diff
-| Une commande dont la sortie est longue : tests, build, `test:ui` sur demande du mainteneur, scripts de mesure et de vérification, contrôles de style | `verificateur` (Haiku) |
+| Une commande dont la sortie est longue : tests, build, scripts de mesure et de vérification, contrôles de style ; `test:ui` seulement si le mainteneur a créé `_local/autorise-test-ui` | `verificateur` (Haiku) |
-- **Le prompt d'un implémenteur contient la note de conception du lot, la nature de la tâche et la sortie de `npm run agents:lire -- <chemins du lot>`, rien d'autre.** L'agent ne voit pas la conversation : donner aussi les fichiers concernés et les critères de fin. Le plan d'ensemble reste ici.
+- **Le prompt d'un implémenteur suit [CONTRIBUTING.md, Travailler avec des agents](./CONTRIBUTING.md#travailler-avec-des-agents).** Le plan d'ensemble reste ici.
```

- `tests/hooksDesAgents.test.mjs`, créé, lance les hooks en processus avec une entrée fabriquée. Lignes de `CARTE.md` : `hook-etat.mjs`, `hook-commandes.mjs` et le test.
- Tests : H3 à H8.
- Fin : `npx tsx --test tests/registreDesDocuments.test.ts tests/agentsDefinis.test.ts tests/cartes.test.ts tests/domiciles.test.ts` et `node --test tests/hooksDesAgents.test.mjs` passent.

## Vague 9. Zone 4

Écarts PP-401 à PP-410 de [ZONE-4-COULEUR.md](./ZONE-4-COULEUR.md). Les lots 3.3 et
7.3 ont déjà écrit les seuils et la chroma des gris. PP-401 est écarté : Display
P3 est hors du périmètre d'UCM.

- [x] 9.1 `implementeur-exigeant`. Juges du contraste (PP-404, PP-405, PP-409, PP-408 pour la préparation, phrase de limite de PP-401). Commit : `3b0d5d3c`.
- [x] 9.2 `implementeur-exigeant`. Recette, référentiel et textes de Palettes (PP-402, PP-403, PP-406 pour le test, PP-407, PP-408, PP-410 pour Palettes). Commit : `0e0a1804`.
- [x] 9.3 `implementeur`. Textes d'Architect et page de Palettes (PP-406 pour Architect, PP-410 pour Architect). Commit : `3b0d5d3c`.

### Lot 9.1. Juges du contraste

Nature : une règle et ses lecteurs ; textes du rapport donnés.

À lire : `packages/kit/src/controles/accessibilite.ts:110-120`, `:415-430`,
`:480-495`, `:855-870`, `:920-930` ; `packages/kit/src/emplois/couleur.ts` ;
`packages/kit/src/format/roles-de-rendu.ts:35-45` ; `packages/kit/src/referentiel/contraste.ts`
(`SEUILS_PAR_ROLE`) ; `packages/kit/src/lecteurs/diagnostic-contrastes.mjs:25-90` ;
`packages/plugin-architect/src/contraste.ts:25-45` ; `packages/plugin-architect/src/catalogue.ts:115-125` ;
`packages/plugin-architect/src/sandbox/preparation.ts:138-150` ;
`packages/plugin-exporter/invariants/diagnostics.md:5`.

- PP-404 : C49 lit le seuil d'une icône dans `SEUILS_PAR_ROLE.icon` (4,5) au lieu du seuil `nonTexte` (`accessibilite.ts:863-864`). L'explorateur d'Architect suit, s'il juge une icône.
- PP-405 : `composer` (`accessibilite.ts:488`) et une tolérance `dansLeGamut(composante)` passent dans `emplois/couleur.ts`, exportées par `emplois/index.ts`. C49, l'explorateur et `diagnostic-contrastes.mjs` les lisent. `ucm check` compose une couleur translucide sur son fond, et refuse comme C49 une composante hors de la tolérance au lieu de la borner.
- PP-409 : `PROFONDEUR_D_ALIAS = 10` exportée par `controles/index.ts`, lue par `couleurDeLiaison` (`accessibilite.ts:423`), `catalogue.ts:119`, `sandbox/preparation.ts:142` et `diagnostic-contrastes.mjs:75`, qui s'arrête à la même profondeur.
- PP-408 : l'aperçu de `sandbox/preparation.ts:146` reconnaît le mode Light par `modeDuThemeReconnu`.
- Lignes du rapport d'`ucm check`, à écrire telles quelles, une par couleur écartée : « Couleur non vérifiée : `<chemin>`, <cause>. », la cause valant « couleur Display P3, hors du périmètre d'UCM », « valeur hors des limites d'une couleur » ou « plus de 10 alias à suivre » (le nombre vient de `PROFONDEUR_D_ALIAS`).
- `packages/plugin-exporter/invariants/diagnostics.md:5`, remplacer « couleur hors de sRGB ou translucide : non jugée. » par « couleur translucide composée sur son fond ; couleur Display P3, hors du périmètre d'UCM, composante hors de la tolérance de `dansLeGamut` ou chaîne de plus de `PROFONDEUR_D_ALIAS` alias : une ligne « Couleur non vérifiée ». » Cette phrase est la seule qui dit la limite de Display P3.
- `packages/kit/tests/jugesDuContraste.test.ts`, créé : les cas Z1 à Z4 passent la même paire à C49 et à `constatsDesContrastes`.
- Tests : Z1 à Z5.
- Fin : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`, `npm run test:paquet -- architect`, `npm run test:paquet -- cli` et `npm run typecheck` passent, hors des échecs admis. Le compte rendu nomme les écrans d'Architect dont un constat change.

### Lot 9.2. Recette, référentiel et textes de Palettes

Nature : bornes et listes partagées entre le moteur et le référentiel ; textes
du designer donnés.

À lire : `packages/couleur/src/recette.ts:225-260`, `:450-480`, `:770-790` ;
`packages/couleur/src/nuances.ts:30-50` ; `packages/kit/src/referentiel/contraste.ts` ;
`packages/kit/src/referentiel/vocabulaire.ts:1-30`, `:110-125` ;
`packages/kit/src/referentiel/natures.ts:100-175` ; `packages/kit/src/emplois/dossiers.ts:40-80` ;
`packages/plugin-palettes/src/configuration.ts:65-80` ;
`packages/plugin-palettes/src/i18n/fr.ts:318-330`, `:410-415`, `:505-516`, `:1265-1270`,
`:1415-1420`, et les mêmes lignes d'`en.ts`.

- PP-402 : `MINIMUMS_ADMIS` dans `referentiel/contraste.ts`, `{ texte: { min: SEUILS_PAR_USAGE.texte, max: 21 }, nonTexte: { min: SEUILS_PAR_USAGE.nonTexte, max: 21 } }`. La règle `seuils-positifs` de `recette.ts:784` refuse une valeur hors de ces bornes ; le champ de `configuration.ts:72` les prend pour bornes de saisie. Un test exige que C49, `constatsDesContrastes` et `verifierPromesses` rendent le même verdict sur une paire de texte au minimum par défaut.
- PP-403 : `packages/couleur/tests/minimums.test.ts`, créé, fabrique une palette au minimum texte par défaut puis à 7, compare les rampes, et exige alors un texte `aideMinimums` qui dit que le minimum du texte déplace les nuances.
- PP-406 : dans `packages/couleur/tests/fondsEtCrans.test.ts`, créé, `recetteParDefaut().fonds` égale le cran 50 d'une palette grise pure fabriquée par le moteur en Light, et la carte Dark égale son 100.
- PP-407 : les numéros admis vivent dans `referentiel/vocabulaire.ts`. `BORNES_DES_CRANS_LIBRES` y passe (`recette.ts:457` l'importe), et `NUMEROS_DE_PALETTE` reconnaît tout multiple de 50 de 50 à 1050. `natures.ts` garde la nature `palette` d'un segment que la marque `palette` déclare. Un test de `fondsEtCrans.test.ts` passe à `naturesDesNoms` une palette de chaque liste que `validerRecette` accepte (dont `50, 150, …, 1050`) et exige la nature `palette`.
- PP-408 : `vocabulaire.ts:120-121` libelle les modes `Light` et `Dark` en français aussi. Un test exige que chaque libellé du registre soit reconnu par `modeDuThemeReconnu`.
- PP-410 : `nuances.ts` exporte `CRANS_DU_TEXTE_DES_BOUTONS`, par `packages/couleur/src/index.ts`. `fr.ts:412` et `en.ts:412` interpolent les nuances du bouton depuis `TABLE_DES_DOSSIERS` (sens inverse : `solid/default`, puis `solid/hover` et `solid/pressed`) ; `fr.ts:414` et `en.ts:414` interpolent la première et la dernière de `CRANS_DU_TEXTE_DES_BOUTONS`. Les textes affichés ne changent pas.

Textes de Palettes, à écrire tels quels :

| Clé | Français | Anglais |
|---|---|---|
| `aideMinimums` | Le minimum du texte déplace les nuances de texte jusqu’à ce qu’elles l’atteignent. Le minimum des éléments graphiques ne change que le résultat des garanties. Aucun minimum ne descend sous le niveau AA. | The text minimum moves text shades until they reach it. The graphics minimum only changes guarantee results. No minimum goes below the AA level. |
| ligne `nature.minimums` de l'import (`fr.ts:1418`, `en.ts:1419`) | Contrastes minimums : les garanties peuvent changer, et un autre minimum du texte change les nuances de texte. | Minimum contrast: guarantees may change, and a different text minimum changes text shades. |
| `'seuils-positifs'` | `` `${champ} : ${valeur}. Saisissez un nombre entre ${a} pour le texte, ou ${b} pour les éléments graphiques, et 21.` `` | `` `${champ}: ${valeur}. Enter a number between ${a} for text, or ${b} for graphics, and 21.` `` |
| lieu d'une garantie manquée (`fr.ts:507`, `:515` ; `en.ts:507`, `:515`) | `profil ${manque.profil}` devient `intensité ${manque.profil}` | `profile ${manque.profil}` devient `intensity ${manque.profil}` |

`${a}` et `${b}` s'écrivent par `ecrireSeuil(MINIMUMS_ADMIS.texte.min, { rapport: false })` et la même chose pour
`nonTexte` (`{ separateur: '.', rapport: false }` en anglais).

- Tests : Y1 à Y7.
- Fin : `npm run test:paquet -- couleur`, `npm run test:paquet -- palettes`, `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs` et `npm run typecheck` passent, hors des échecs admis. Le compte rendu nomme les écrans de Palettes qui changent.

### Lot 9.3. Textes d'Architect et page de Palettes

Nature : textes du designer donnés, une information nouvelle, un signal de style.

À lire : `packages/plugin-architect/src/ui/textes/structure.ts:30-150` ;
`packages/plugin-architect/src/ui/textes/preparation.ts:1-55` ;
`packages/kit/src/referentiel/produits.ts:10-22` (`CLES_PARTAGEES_DE_PALETTES`) ;
`packages/kit/src/referentiel/reference.ts:70-80` (`CIBLES_DE_L_ELEVATION`) ;
`scripts/controle-style.mjs` (`NIVEAUX_DES_SIGNAUX`).

PP-410, à écrire tels quels. Le nom des clés ne change pas, et
`structure.ts:58` (« crans de l’échelle », des tailles) reste.

| Fichier et ligne | Texte actuel | Texte nouveau |
|---|---|---|
| `preparation.ts:5` | `` `cran ${cran}` `` | `` `nuance ${cran}` `` |
| `preparation.ts:16` | Le cran dit quelle nuance de la palette le token reçoit. | La nuance dit quelle couleur de la palette le token reçoit. |
| `structure.ts:33` | `'Crans'` | `'Nuances'` |
| `structure.ts:37` | ' Le cran visé est dans une library.' | ' La nuance visée est dans une library.' |
| `structure.ts:42` | ne vise aucun cran de la palette | ne vise aucune nuance de la palette |
| `structure.ts:43` | `'les crans' : 'le cran'` | `'les nuances' : 'la nuance'` |
| `structure.ts:47` | Choisissez le cran de votre couleur de charte | Choisissez la nuance de votre couleur de charte |
| `structure.ts:63` | n’a pas le cran | n’a pas la nuance |
| `structure.ts:109` | Ajoutez ce cran avec UCM Palettes | Ajoutez cette nuance avec UCM Palettes |
| `structure.ts:135` | UCM attend le cran | UCM attend la nuance |
| `structure.ts:139` | elle vise le cran …, en Dark le cran … | elle vise la nuance …, en Dark la nuance … |
| `structure.ts:141`, `:146` | `'le cran '` | `'la nuance '` |
| `structure.ts:148` | `` `le cran ${valeur}` `` | `` `la nuance ${valeur}` `` |

- PP-410 : un signal `cran-face-au-designer` dans `NIVEAUX_DES_SIGNAUX`, sur le mot « cran » ou « crans » dans une chaîne de `packages/plugin-palettes/src/i18n/fr.ts` ou de `packages/plugin-architect/src/ui/textes/`, sauf « crans de l’échelle ». Deux cas dans `tests/styleMotifs.test.ts`.
- PP-406 : Architect lit le fond de la page dans la recette de Palettes (`CLES_PARTAGEES_DE_PALETTES`) et la valeur de `elevation/page` dans le mode Light du fichier. Quand les deux diffèrent, la vue Structure montre une information, sans geste, avec ce texte : « La page de ce fichier (elevation/page) n’a pas la couleur du fond réglé dans UCM Palettes. Palettes et Architect ne vérifient donc pas les contrastes contre la même page. » Sans recette lue, rien ne s'affiche.
- Tests : X1 à X3.
- Fin : `npm run test:paquet -- architect`, `npx tsx --test tests/styleMotifs.test.ts tests/styleDocumentaire.test.ts` et `npm run typecheck` passent, hors des échecs admis. Le compte rendu nomme les écrans d'Architect qui changent.

## Vague 10. Dernières gardes et inventaire unique

- [x] 10.1 `implementeur`. Lois de `reglesUniques` et phrases uniques (PP-04, PP-05, PP-10, PP-11, PP-13, PP-14, PP-15, PP-21, PP-108). Commit : `6c5021d0`.
- [x] 10.2 `implementeur`. Inventaire unique des paramètres. Commit : `a275fda7`.

### Lot 10.1. Lois de `reglesUniques` et phrases uniques

Nature : gardes nouvelles sur un code déjà corrigé. Une loi qui trouve un écart
arrête le lot, et l'agent le nomme sans corriger le code.

À lire : `tests/reglesUniques.test.ts` (forme d'une loi, lignes 1-110).

Lois à ajouter, chacune avec sa fiche P27 et son propriétaire :

| Écart | Refuse, dans `packages/*/src/**` | Hors de |
|---|---|---|
| PP-04 | `4.5`, `4,5:1`, `3:1`, `7:1` dans du code | `packages/kit/src/referentiel/contraste.ts` |
| PP-05 | `.replace('.', ',')` ou `.replace(".", ",")` appliqué à un seuil | `packages/kit/src/emplois/contraste.ts` |
| PP-10 | les littéraux `ci-report.md`, `src/generated/tokens.css`, `.ucm/derogations.json`, `ucm.config.json`, `UCM_GITLAB_TOKEN`, `https://api.github.com`, `https://gitlab.com/api/v4` | `packages/cli/src/fichiers-du-consommateur.mjs`, `packages/kit/src/lecteurs/derogations.mjs`, `packages/kit/src/format/configuration.ts`, `packages/kit/src/protocoles/forges.ts` |
| PP-11 | `JSON.parse(readFileSync(` | `packages/kit/src/lecteurs/configuration.mjs` ; exceptions nommées : lecture du `package.json` de la CLI elle-même (`aides.mjs`, `init.mjs` `versionDuPaquet`), `packages/kit/src/lecteurs/schema-contrat.mjs` |
| PP-13 | le nom `CHROMA_DES_PALETTES_COLOREES` | aucun |
| PP-15 | `'primitives'`, `'brands'`, `'utility'` en littéral de nom de collection | `packages/kit/src/referentiel/` ; exceptions nommées avec leur raison |
| PP-108 | une expression qui commence par `/\{[^{}` | `packages/kit/src/format/references.ts` |
| PP-409 | une profondeur d'alias écrite en nombre (`> 10`, `= 10`) | `packages/kit/src/emplois/couleur.ts`, propriétaire de `PROFONDEUR_D_ALIAS` depuis 9.1 : la porte navigateur interdit à `diagnostic-contrastes.mjs` d'importer `controles` |

- PP-21 : `hub` sort de `DOSSIERS_HORS_SOCLE` (`reglesUniques.test.ts:33`) et de la ligne 97.
- PP-14 : `tests/phrasesUniques.test.ts`, créé. Il relève les littéraux de chaîne de huit mots ou plus dans `packages/*/src/**`, hors commentaires et hors `packages/hub/`, et refuse une phrase écrite dans deux paquets. Une table `EXCEPTIONS` nomme chaque phrase admise avec sa raison. Sa ligne de `CARTE.md` revient au lot 10.2, que l'agent nomme au compte rendu.
- Fin : `npx tsx --test tests/reglesUniques.test.ts tests/phrasesUniques.test.ts` et `npm run typecheck` passent.

### Lot 10.2. Inventaire unique des paramètres

Nature : fusion de données et garde nouvelle.

À lire : les en-têtes et deux entrées de chacun des fichiers
`docs/notes/Recherches/Parametres partages/parametres*.json` ; la
[table des réponses](#réponses-aux-écarts) de ce plan, que le prompt colle.

- `parametres.json` reçoit les entrées de `parametres-zone1.json` à `parametres-zone4.json`, à la suite, dans la même forme. Un `id` déjà pris reçoit le suffixe `-zone<n>`. Sa `description` dit qu'il porte les quatre inventaires de P27. Les quatre fichiers de zone sont supprimés.
- Pour chaque entrée dont l'écart est corrigé selon la table, `garde` nomme le test qui la tient (`{ "test": "<chemin>", "nature": "<nature existante>" }`) et `ecart` disparaît. Une entrée d'écart resté ouvert garde son `ecart`.
- `tests/parametresPartages.test.ts`, créé, lit `parametres.json`. Chaque `source.fichier` existe et contient `source.symbole`. Chaque `garde.test` existe. Une entrée qui a des copies a une `garde`, ou un `ecart` nommé dans la constante `ECARTS_OUVERTS` du test, avec sa raison. `ECARTS_OUVERTS` porte les écarts écartés de la [table des réponses](#réponses-aux-écarts), chacun avec sa raison, et ceux de 8.6 tant que les cases 8.4 à 8.6 ne sont pas cochées.
- `CARTE.md`, section `## tests/` : `- parametresPartages.test.ts : chaque paramètre partagé de P27 a une source, une garde ou un écart ouvert` et `- phrasesUniques.test.ts : une phrase de huit mots ou plus vit dans un seul paquet`.
- Fin : `npx tsx --test tests/parametresPartages.test.ts tests/cartes.test.ts tests/registreDesDocuments.test.ts tests/docLinks.test.ts` passent.

## Vague 11. Publication et recette

- [x] 11.1 `executant`. Monter `@ucm-kit/core` à 0.18.0, `@ucm-kit/cli` à 0.4.0 et `@ucm-kit/adapter-typescript` à 0.3.0 ; épingler `@ucm-kit/core` 0.18.0 dans la CLI et l'adaptateur ; donner au titre `## 0.18.0` du journal du kit et `## 0.3.0` de celui de l'adaptateur leur place ; mettre à jour chaque version citée par la documentation que `tests/pinDocumente.test.mjs` et `npm run agents:diff` désignent, selon `publier-paquets`. Commit : `bbf23390`.
- [x] 11.2 `verificateur`. `npm run agents:diff`, `npm run build`, `npm run vues`, `npm test`, `npm run typecheck`. Tout passe, `versionSuitLeContenu` et `apiPublique` compris. Commit : `bbf23390`.
- [x] 11.3 Conversation principale. Relire le diff de 11.1. Retirer la puce « Verrou P27 » de `publier-paquets` dans le même commit. Commiter par chemins explicites, pousser, puis publier le kit, la CLI et l'adaptateur, dans cet ordre, selon `publier-paquets`. Constater chaque version par `npm view <paquet>@<version> version`. Commit : `bbf23390`.
- [x] 11.4 Conversation principale. Cocher les cases, `npm run vues`, commiter, pousser. Remettre au mainteneur les versions publiées et les cases suivantes. Publiés : core 0.18.0, cli 0.4.0, adapter-typescript 0.3.0.
- [ ] 11.5 (mainteneur). Dans UCM-Playground, épingler `@ucm-kit/cli` 0.4.0 et `@ucm-kit/adapter-typescript` 0.3.0, et remplacer l'étape `gh api … --jq` du workflow par la ligne `rapport-github` qu'`ucm init` écrit désormais.
- [ ] 11.6 (mainteneur). Après `npm run build:plugin -- exporter`, réexporter depuis Figma les contrats qui portent une prop `instance-swap`, et vérifier que leur `default` nomme un composant.
- [ ] 11.7 (mainteneur). Recette Figma de PP-102 : une collection refuse-t-elle un nom qui ne diffère que par la casse, comme `memeNomFigma` l'affirme (`plugin-palettes/src/variables/noms.ts:10`) ? Si Figma l'accepte, la préparation d'Architect créerait un doublon : rendre la question.
- [ ] 11.8 (mainteneur). Recette Figma de PP-105 : Figma accepte-t-il un nom de collection et de variable fait seulement de symboles ? Si oui, vérifier que l'export avertit du nom CSS vide.
- [ ] 11.9 (mainteneur). Recette Figma de PP-106 : Figma garde-t-il tel quel un nom de variable collé en forme décomposée ? Si oui, vérifier que `tokens.json` publie le chemin composé.
- [ ] 11.10 (mainteneur). Recette visuelle de Palettes : thème sombre (6.3), seuils écrits (3.3), destination et palettes de chroma 0,05 (7.3), dédoublonnage des noms (5.3), bornes des contrastes minimums et leurs textes (9.2), intensité dans le lieu d'une garantie manquée (9.2).
- [ ] 11.11 (mainteneur). Recette visuelle de l'Exporter : thème sombre (6.3).
- [ ] 11.12 (mainteneur). Recette visuelle d'Architect : seuils écrits (3.3), C45 « règle renommée » (5.2), renommage refusé pour même variable CSS (5.3), textes partagés (7.3), C49 d'une icône sous 4,5:1 (9.1), « nuance » au lieu de « cran » et information de la page (9.3).
- [ ] 11.13 (mainteneur). Recette Figma de PP-405 : Figma range-t-il une variable de couleur avec une composante un peu au-delà de 1 ou sous 0, après un collage ou une conversion d'espace ? Si oui, vérifier qu'Architect et `ucm check` la disent non vérifiée de la même façon.

## Cas de test

Chaque cas nomme un test du lot. Les contrats viennent des fixtures du kit ou de
`contrat140()` (`packages/kit/tests/contrats-fabriques.mjs`), jamais d'un
`*.contract.json` écrit à la main.

### Lecture des JSON (1.1)

| Cas | Situation | Attendu |
|---|---|---|
| J1 | `lireJsonDuDepot` sur un JSON précédé d'un BOM | l'objet lu |
| J2 | le même JSON sans BOM | le même objet |
| J3 | fichier absent | lève `ENOENT`, comme `readFileSync` |
| J4 | JSON invalide | lève `SyntaxError` |
| J5 | `jsonSansBom` sur un texte avec BOM | l'objet lu |
| J6 | `.ucm/derogations.json` avec BOM | `controle-du-code` et `controle-repository` appliquent les mêmes dérogations, par `lireDerogationsDuDepot` |
| J7 | `ucm.config.json` avec BOM lu par l'Exporter | configuration lue |
| J8 | messages de dérogation de `controle-du-code-listes.mjs` et `controle-repository.mjs` | texte inchangé, chemin tiré de `CHEMIN_DES_DEROGATIONS` |

### Version du contrat (1.2)

| Cas | Situation | Attendu |
|---|---|---|
| V1 | titres `## nn.0` de `CHANGELOG-FORMAT.md` | `VERSION_CONTRAT_MINIMALE` = titre qui précède `CONTRACT_VERSION` |
| V2 | `VERSION_CONTRAT_MAXIMALE` | = `CONTRACT_VERSION` |
| V3 | les neuf lignes listées | aucun `"14.0"` littéral |

### Copies documentées (1.3)

| Cas | Situation | Attendu |
|---|---|---|
| D1 | phrase « familles de propriétés » de `CONCEPT.md`, `POUR-LES-DESIGNERS.md`, `VALIDATIONS-MVP.md` | chaque `famille` de `FAMILLES` entre accents graves, et le mot « parité » |
| D2 | `POUR-LES-DESIGNERS.md` | ni « mesure automatique du rendu », ni « capture de référence » |
| D3 | `CHANGELOG-FORMAT.md` | « La version courante est la `<CONTRACT_VERSION>` » et une section `## <CONTRACT_VERSION>` |
| D4 | table des nombres | chaque copie égale sa source |
| D5 | « sur quatre familles : » dans un guide | signal `famille-sans-complement` |
| D6 | « quatre familles de propriétés » | aucun signal |

### Casse, motif et commandes du kit (2.1)

| Cas | Situation | Attendu |
|---|---|---|
| K1 | `button.tsx` pour `Button.contract.json`, motif `{dir}/{id}.tsx`, `lister` fabriqué | `autreCasse: "button.tsx"` ; une demande de code bloque, une demande de contrats seuls passe |
| K2 | le même cas, `existe` insensible à la casse puis sensible | même état, même verdict |
| K3 | `Button.tsx` présent ; aucun fichier | `presente: true` ; `pas-encore-d-implementation` |
| K4 | configuration `{dir}/index.tsx` | `champsInvalidesDeLaConfiguration` rend `implementation` |
| K5 | motif `{dir}/{id}/index.tsx`, contrat `Button` | interface attendue `ButtonProps`, fonction cherchée `Button` |
| K6 | motif `{dir}/{id}.component.tsx` | interface attendue `ButtonProps` |
| K7 | constat dérogeable ; rapport tronqué | `npx @ucm-kit/cli deroger …` ; `npx @ucm-kit/cli check` ; aucun `npx ucm` dans `packages/kit/src` |
| K8 | `adaptateurTypeScript` | `cheminGabarits` absent ; `nomInterfaceAttendue("x/index.tsx", "Button")` = `ButtonProps` |

### `ucm init` (2.2)

| Cas | Situation | Attendu |
|---|---|---|
| I1 | init GitHub et GitLab, avec et sans `package.json` | chaque ligne `npx` des fichiers écrits porte `@ucm-kit/cli@<version>` |
| I2 | `ucm init --tokens design` | `.gitattributes` porte `design/tokens.json text eol=lf` |
| I3 | sans `node_modules/@ucm-kit/core/schema/…` ; avec | la ligne d'avertissement ; aucune ligne |
| I4 | `package.json` avec BOM | les rappels de pin et de script s'impriment |
| I5 | `tokens.json` avec BOM | les axes se lisent |
| I6 | `ucm deroger` sur un contrat avec BOM | l'entrée s'écrit |
| I7 | filets GitHub et GitLab | la même phrase, « réexporter » |
| I8 | exemple de tête des conventions | aucun `.ucm/gabarits/` |

### `FORMAT.md` et autorités (2.3)

| Cas | Situation | Attendu |
|---|---|---|
| F1 | chaque propriété du schéma, `$ref` décodés | citée dans `FORMAT.md` ou exception nommée |
| F2 | chaque phrase « Autorité : » des invariants | chaque symbole existe dans son fichier ou exception nommée |
| F3 | `explorateur.md` | cite `rolesAdmisDuLayer` |

### Questions des ancrages (3.2)

| Cas | Situation | Attendu |
|---|---|---|
| Q1 | aide fabriquée avec `## Question` | `lireAide(…).question` |
| Q2 | tête avec `Contrôle : \`npx tsc --noEmit\``, sans `## controles` | l'anomalie, code de sortie inchangé |
| Q3 | ancrage sans section, tête non vide | origine « ancrage sans réponse ; le texte de tête ne répond pas » |
| Q4 | `--personnaliser` d'un ancrage | la question dans le commentaire du gabarit |

### Seuils (3.3)

| Cas | Situation | Attendu |
|---|---|---|
| S1 | `SEUILS_D_ACCESSIBILITE` | chaque valeur égale sa source du référentiel |
| S2 | C49 à C52 sur les fixtures | constats inchangés |
| S3 | `ecrireSeuil(4.5)`, `ecrireSeuil(4.25)` | `4,5:1`, `4,25:1` |
| S4 | `ecrireSeuil(4.5, { separateur: '.', rapport: false })` | `4.5` |
| S5 | légende de Palettes, texte de Nomenclature, résumé du rapport | seuils interpolés, texte inchangé à seuils égaux |
| S6 | planche, couleur seconde | comparée à `SEUILS_PAR_USAGE.texte` |

### Guide (4.1)

| Cas | Situation | Attendu |
|---|---|---|
| G1 | contrat fabriqué avec une prop `instance-swap` | l'aide `composant` dit qu'un `default` en forme `12:345` ne se recopie pas |
| G2 | accroche `center` décentrée | l'écriture de `position-absolue` cite `left`, `right` et `translate` |
| G3 | tout contrat | la procédure dit « se modifie à partir de son code » et ne dit pas « Ouvrir une ancienne implémentation » |
| G4 | tête avec `Contrôle :`, sans `## controles` | `controles` sous « Non tranché », avec sa question |
| G5 | tout contrat | la ligne de tête `npx --yes @ucm-kit/cli@<version>` |
| G6 | diagnostic avec `variantName` et `property` | la ligne cite le variant et le champ |
| G7 | contrat nommé `Icon / Button` | « identifiant de code `IconButton` », la valeur que rend `codeIdentifier` |
| G8 | contrat avec BOM | guide imprimé |
| G9 | `FICHIERS_EPINGLES` | égal à celui de `fichiers-du-consommateur.mjs` |

### Couverture des aides (4.2)

| Cas | Situation | Attendu |
|---|---|---|
| A1 | chaque couple de `CHAMPS` | nommé par une aide de sa caractéristique, ou dans `EN_PROSE` avec sa phrase retrouvée |
| A2 | les 15 couples sans effet de rendu | dans `SANS_AIDE`, avec leur raison |
| A3 | parcours du schéma | `$ref` décodés, 12 couples `SidedRefs` dans `CHAMPS`, chaque définition visitée |
| A4 | contrat fabriqué à grille seule | `grille` relevée, l'aide cite `alignSelf` |
| A5 | chaque ancrage du catalogue | une section `## Question` non vide |
| A6 | clés de `TypographyTokens` | toutes citées dans `typographie.md` |

### Noms, variants et validateur (4.3)

| Cas | Situation | Attendu |
|---|---|---|
| N1 | `Café` composé et décomposé | `normalizeName` égaux |
| N2 | mêmes axes et valeurs, étiquette vide comprise | même nom par le socle et par le kit |
| N3 | `validation-contrat.mjs` | plus de `nomFigmaDuVariant11` |
| N4 | `0`, `0.5`, `1.25`, `10` | `nombreDuSegment(segmentDeNombre(n)) === n` ; `segmentDeNombre(0.5)` = `0,5` |
| N5 | chaque exemple minimal du schéma (propriétés requises seules) | aucun refus de `champsInvalidesDuContrat` ; `default: null` refusé |
| N6 | fixture `tokensDeLiens`, noms Figma puis exportés, sur la liste de renommages | mêmes constats |

### Rapport précédent et forges (5.1)

| Cas | Situation | Attendu |
|---|---|---|
| R1 | 4 notes du même compte : deux rapports, une note qui cite le marqueur en fin de texte | l'`id` du rapport le plus récent |
| R2 | marqueur sans objet en ligne 4 | pas sans objet, pour les deux forges |
| R3 | `ucm rapport-github`, rapport existant | `PATCH`, sortie 0 |
| R4 | aucun rapport, rapport utile | `POST` |
| R5 | aucun rapport, sans objet | rien, le message, sortie 0 |
| R6 | `GET /user` en 403 | compte `github-actions[bot]` |
| R7 | commentaires sur deux pages | le rapport de la seconde page trouvé |
| R8 | GitLab, deux rapports sur deux pages | le plus récent remplacé |
| R9 | workflow GitHub généré | appelle `rapport-github` épinglé, sans `jq` |
| R10 | Exporter et CLI | adresses tirées de `protocoles/forges.ts` |

### Architect et Exporter (5.2)

| Cas | Situation | Attendu |
|---|---|---|
| P1 | (`Icon Left`, `iconleft`), (`Icon Left`, `ICONLEFT`), (`Icon Left`, `Icon_Left`), (`Show Label`, `show_label`), (`Leading Icon`, `leadingicon`) ; puis (`Icon Left`, `iconLeft`) | l'Exporter avertit et Architect rend le C45 `regle-renommee` ; puis ni l'un ni l'autre |
| P2 | library avec `Button/color/background`, `IconButton/color/background`, `Text Field/color/border`, `components/Badge/color/background` | chaque variable chargée par la préparation ; la liaison trouve la variable publiée |

### Collisions CSS (5.3)

| Cas | Situation | Attendu |
|---|---|---|
| C1 | `button/background hover` renommé `button/bg hover` à côté de `button/bg/hover` ; `button/gap_2` à côté de `button/gap/2` ; `card/radius 0,5` à côté de `card/radius/0.5` | motif `meme-nom-css` |
| C2 | palettes `Café` et `Cafe`, `Sky Blue` et `Sky_Blue`, `Été` et `Ete`, `Café` composé et décomposé | dédoublonnées |
| C3 | renommage sans conflit | index accepté par `nomsCssDesTokens`, sans collision |
| C4 | renommage bloqué par `meme-nom-css` dans Nomenclature | le texte `memeNomCss` |

### Lecteurs de `tokens.json` (6.1)

| Cas | Situation | Attendu |
|---|---|---|
| T1 | `{a b.c}`, `{a.b }`, `{$a.b}`, ``{a.`b}``, `{a.b$}`, `{marque}`, `{a.b}` | même réponse par `isTokenReference`, la projection, l'index du kit et `tokens references` |
| T2 | `"16px"`, `"1rem"`, `16`, `{ "value": 1, "unit": "rem" }`, couleur sans `alpha`, `"#ff0000"`, `"#f00"`, forme de `FORMAT.md` | seule la forme de `FORMAT.md` se lit ; la projection compte les autres dans `valeursSautees` |
| T3 | chemin `✦.🙂` ; préfixe réservé ; deux chemins au même nom | même refus par l'Exporter et par `ucm tokens css` |
| T4 | `tokens.json` et contrat avec BOM | `tokens css` et `tokens references` les lisent |

### Défaut d'`instance-swap` (6.2)

| Cas | Situation | Attendu |
|---|---|---|
| E1 | défaut qui désigne un variant d'un component set | `default` = nom du set |
| E2 | défaut qui désigne un composant seul | `default` = son nom |
| E3 | identifiant qui ne se résout pas | aucun `default` |
| E4 | contrat 14.0 avec `default` nommé | valide |
| E5 | `schema.test.ts` | schéma à jour |

### Plugins sombres (6.3)

| Cas | Situation | Attendu |
|---|---|---|
| H1 | les trois `code.ts` | `themeColors: false` |
| H2 | `socle.css` | `:root` sombre, ni `.figma-dark` ni bloc clair |

### Commandes documentées (7.1)

| Cas | Situation | Attendu |
|---|---|---|
| M1 | chaque `ucm …` des documents relevés | commande et options présentes dans `COMMANDES` |
| M2 | aides, procédure, `packages/kit/src` | aucun `npx ucm` |
| M3 | `ucm tokens faute` | sortie 2, message qui nomme `css` et `references` |
| M4 | usage d'`init` | une source, `COMMANDES` ; le README l'égale |

### Monorepo (7.2)

| Cas | Situation | Attendu |
|---|---|---|
| W1 | `workspaces`, imports | sans `packages/hub` ; aucun import du hub hors de son dossier |
| W2 | `engines` des trois paquets | `>=22`, égal à `ci.yml`, `publish.yml` et `VERSION_DE_NODE` |
| W3 | `PROPRIETES_SANS_UNITE_DE_REACT` | égale à la liste du `react-dom` installé |

### Couleur et textes (7.3)

| Cas | Situation | Attendu |
|---|---|---|
| U1 | référence de chroma 0,05 ; 0,0499 | colorée ; grise |
| U2 | destination neuve de Palettes | `DESTINATION_DES_PALETTES.collection` |
| U3 | `cranSansSens` d'Architect, texte « analyse périmée » | identiques aux constantes du kit |

### Outillage des agents (8.1 à 8.3)

| Cas | Situation | Attendu |
|---|---|---|
| O1 | `npm run agents:domicile -- scripts/hook-documents.mjs`, `.claude/settings.json`, `CLAUDE.md` | `outillage-agents` |
| O2 | test de paquet qui importe `../src/x` d'un autre domaine | la commande de son paquet dans les vérifications du domaine de `x`, ou une entrée de `LIENS_ADMIS` |
| O3 | un fichier de `.claude/agents/` absent de `CARTE.md` | refus nommé |
| O4 | `.agents/skills/nouvelle/SKILL.md` suivi, absent de `documents-fermes.json` | refus nommé |
| O5 | table de `CLAUDE.md` contre les `model:` ; corps des trois définitions | égaux, aux lignes propres d'`executant` près |
| S7 | entrée d'`EXCLUS_DU_CONTROLE` sans refus ; entrée d'`AGENTS_A_CONVERTIR` sans flèche | refus de l'exception morte |
| S8 | nombre d'entrées de `REGLES_ECRIRE` | égal au nombre de puces du bloc « Écrire » |
| S9 | réponse avec un tiret cadratin en incise ; « Souhaitez-vous que je poursuive ? » | `hook-reponse.mjs` sort 2 |
| S10 | `estJugeable('x.js')`, `estJugeable('x.mjs')` | faux, vrai ; le hook rend le même verdict |
| S11 | manifeste ou script en erreur dans `hook-style.mjs` | sortie 2, message « n'a pas pu s'exécuter » |
| S12 | « système.- La prose » ; deux gras dans une section | refus `puce-collee` ; signal `gras-multiple` |
| S13 | `verifier-conservation --domaines referentiel` | sortie 2, message du domaine sans groupe |
| S14 | `--source <fichier>@HEAD` sur un fichier qui perd un nom en code | le manque nommé, sortie 2 |
| S15 | `tests/nouveau.test.mjs` sous Palettes | découvert ; un fichier de `tests/interface/` ne l'est pas |

### Droits des agents (8.6)

| Cas | Situation | Attendu |
|---|---|---|
| H3 | 20 chemins, `_local/` compris, au hook en processus et à `verdictDuRegistre` | même verdict |
| H4 | `domiciles.json` tronqué | le hook des documents rend `ask` |
| H5 | `npm run test:ui` sans `_local/autorise-test-ui` ; avec | sortie 2 ; sortie 0 |
| H6 | chaque nom de `interdits` | présent dans un `package.json` de paquet |
| H7 | `.md` hors registre créé par `Bash`, puis arrêt ; second arrêt avec `stop_hook_active` | sortie 2 avec la liste ; sortie 0 |
| H8 | `.claude/settings.json` | sans `CLAUDE_CODE_SUBAGENT_MODEL` (si 8.5 l'a validé) |

### Couleur (9.1 à 9.3)

| Cas | Situation | Attendu |
|---|---|---|
| Z1 | icône `#8A8A8A` sur blanc, 3,45:1 | C49 et `ucm check` rendent le même manque sous 4,5:1 |
| Z2 | texte noir d'alpha 0,40 sur blanc | C49 et `ucm check` jugent la couleur composée, 2,84:1 |
| Z3 | fond de composante 1,0000001 ; composante −1e-7 | même verdict des deux juges, selon `dansLeGamut` |
| Z4 | chaînes de 10, 11 et 20 alias | lues à 10 ; au-delà, C49 rend `mode-illisible` et `ucm check` « plus de 10 alias à suivre » |
| Z5 | couleur `display-p3` dans `tokens.json` | ligne « couleur Display P3, hors du périmètre d'UCM » |
| Y1 | minimum texte 3, 0,5, 30 dans une recette | refus `seuils-positifs` |
| Y2 | paire de texte au minimum par défaut | même verdict par C49, `constatsDesContrastes` et `verifierPromesses` |
| Y3 | minimum texte 4,5 puis 7 | des nuances de texte changent ; `aideMinimums` le dit |
| Y4 | fonds de `recetteParDefaut()` | cran 50 Light et carte Dark 100 d'une grise pure |
| Y5 | listes acceptées par `validerRecette`, dont `50, 150, …, 1050` | nature `palette` partout |
| Y6 | libellés du registre des modes | reconnus par `modeDuThemeReconnu` |
| Y7 | textes interpolés des nuances du bouton | identiques aux textes actuels à table égale |
| X1 | « le cran 700 » dans une chaîne d'Architect ; « crans de l’échelle » | signal ; aucun signal |
| X2 | fond de la recette `#F7F7F7`, `elevation/page` `#EBEBEB` | l'information de la page |
| X3 | sans recette de Palettes lue | aucune information |

## Réponses aux écarts

| Écart | Réponse |
|---|---|
| PP-01 | 1.3 : les deux phrases retirées, renvoi à `VALIDATIONS-MVP.md`, cas D2. La table des contrôles bloquants que proposait la garde est écartée : le guide ne promet plus aucun contrôle que le kit n'a pas |
| PP-02 | 1.3, cas D1 |
| PP-03 | 2.2, cas I1 |
| PP-04 | 3.3, cas S1, S5, S6 ; loi 10.1 |
| PP-05 | 3.3, cas S3, S4 ; loi 10.1 |
| PP-06 | 1.2, cas V1, V2 |
| PP-07 | 1.2 (fabriques, cas V3) ; 1.3 (phrase du changelog et `RECETTE.md`, cas D3, D4) |
| PP-08 | 2.3, cas F1 |
| PP-09 | 1.3, cas D4 |
| PP-10 | 1.1 (messages du kit), 2.2 (constantes d'`init`), 4.1 (`FICHIERS_EPINGLES`), 5.1 (`ucm.mjs:178`, adresses des forges, jeton GitLab) ; loi 10.1 |
| PP-11 | 1.1 (kit, adaptateur, Exporter), 2.2 (`init`, `deroger`, `icons`), 4.1 (`guide`), 6.1 (`tokens-css`, `tokens-references`) ; loi 10.1 |
| PP-12 | 2.1, cas K1 à K3. `check.mjs:144` et `depot.ts:168` restent : ils comparent sans la casse une extension que le code écrit lui-même, et aucun verdict n'en dépend |
| PP-13 | 7.3, cas U1 ; loi 10.1 |
| PP-14 | 2.2 (filets d'`init`), 7.3 (Architect importe le kit, cas U3), 10.1 (test des phrases) |
| PP-15 | 7.3, cas U2 ; loi 10.1 |
| PP-16 | 2.3, cas F2, F3 |
| PP-17 | 7.1, cas M1, M3, M4. Les codes de sortie 0, 1, 2 restent sans constante : aucun lecteur hors de la CLI, aucune garde proposée |
| PP-18 | 7.2, cas W3 |
| PP-19 | 4.3, cas N4 |
| PP-20 | 1.3 (« famille » qualifiée, signal, cas D5, D6). `referentiel/lexique.ts` écarté, parce qu'il prépare les noms Figma sans porter de glossaire. « état », « cran », « rang » et « export » écartés : le rapport ne propose aucune garde et ne relève aucun cas d'erreur |
| PP-21 | 7.2, cas W1 ; exceptions de `reglesUniques` en 10.1 |
| PP-22 | 2.1 (`cheminGabarits` dans `AdaptateurDImplementation`, cas K8), 2.2 (exemple de tête, cas I8) |
| PP-23 | 7.2, cas W2 |
| PP-24 | 2.2, cas I2, I3 |
| PP-101 | 5.2, cas P1 |
| PP-102 | 5.2, cas P2 ; recette 11.7 |
| PP-103 | 5.3, cas C1 à C4 |
| PP-104 | 2.1, cas K4 à K6 ; README en 5.1 |
| PP-105 | 6.1, cas T3 ; recette 11.8 |
| PP-106 | 4.3, cas N1, entrée de `CHANGELOG-FORMAT.md` ; recette 11.9 |
| PP-107 | 6.1, cas T2 |
| PP-108 | 6.1, cas T1 ; loi 10.1 |
| PP-109 | 5.1, cas R1 à R9 |
| PP-110 | 4.3, cas N2, N3 |
| PP-111 | 4.3, cas N6 ; une divergence réelle se corrige selon la forme Figma |
| PP-112 | 6.3, cas H1, H2 ; recettes 11.10, 11.11 |
| PP-201 | 4.2, cas A1, A2 |
| PP-202 | 3.1 (`composant.md`), 2.3 (`FORMAT.md`) ; garde par 4.2 |
| PP-203 | 3.1 (`typographie.md`) ; cas A6 |
| PP-204 | 3.1 (aide), 4.1 (cas G1), 6.2 (Exporter, cas E1 à E5) ; réexport 11.6 |
| PP-205 | 4.3, cas N5 |
| PP-206 | 3.1, cas G2 |
| PP-207 | 3.1, cas G3 |
| PP-208 | 3.1 (questions), 3.2 (`ucm aides`, cas Q1 à Q4), 4.1 (« Non tranché », cas G4), 4.2 (cas A5) |
| PP-209 | 2.1 (messages du kit, cas K7), 3.1 (aides et procédure), 4.1 (ligne de tête, cas G5), 7.1 (garde, cas M2) |
| PP-210 | 3.1 (étape 6 et grille, test de `copiesDocumentees.test.ts`) ; preuves des aides `ombre`, `opacite`, `rotation`, `contour-ring` |
| PP-211 | 4.2, cas A3 |
| PP-212 | 3.1 ; garde par 4.2 |
| PP-213 | 3.1 ; cas A4 |
| PP-214 | 4.1, cas G6 |
| PP-215 | 3.1 (`identifiants.md`), 4.1 (cas G7) |
| `parametres.json` | 10.2 |
| PP-301 | 8.6 (`verdictDuRegistre`, clé `locaux`, cas H3), après 8.5 |
| PP-302 | 8.6 (`hook-etat.mjs`, cas H7), après 8.5 |
| PP-303 | 8.1, cas O1 |
| PP-304 | 8.1, cas O2 |
| PP-305 | 8.3, cas S13, S14 |
| PP-306 | 8.6 (`hook-commandes.mjs`, `verificateur.md`, `CLAUDE.md`, cas H5, H6), après 8.5 |
| PP-307 | 8.2, cas S7 |
| PP-308 | 8.3, cas S15 |
| PP-309 | essai 8.4, puis 8.6 (cas H8) ; la table des modèles est gardée dès 8.1 (cas O5) |
| PP-310 | 8.2, cas S8, S9 |
| PP-311 | 8.2 (signal, cas S12), 8.3 (exemption dans la skill) |
| PP-312 | 8.1, cas O3 |
| PP-313 | 8.1, option (a), cas O4 |
| PP-314 | 8.1 (`CONTRIBUTING.md`, définitions, cas O5), 8.6 (`CLAUDE.md`) |
| PP-315 | 8.2, cas S10 |
| PP-316 | 8.2 (hooks de style, cas S11), 8.6 (hook des documents, cas H4) |
| PP-317 | 8.1 (`archiver-un-sujet`), 8.2 (`puce-collee`, trois skills, cas S12). Le libellé d'un lien reste à la relecture, aucun test ne le juge |
| PP-401 | écarté : Display P3 hors du périmètre d'UCM, décision du mainteneur. 9.1 écrit la limite dans `diagnostics.md` et la ligne du rapport (cas Z5) |
| PP-402 | 9.2, cas Y1, Y2 |
| PP-403 | 9.2, cas Y3 |
| PP-404 | 9.1, cas Z1 |
| PP-405 | 9.1, cas Z2, Z3 ; recette 11.13 |
| PP-406 | 9.2 (test, cas Y4), 9.3 (information d'Architect, cas X2, X3) |
| PP-407 | 9.2, cas Y5 |
| PP-408 | 9.2 (libellés, cas Y6), 9.1 (aperçu de la préparation) |
| PP-409 | 9.1, cas Z4 ; loi 10.1 |
| PP-410 | 9.2 (Palettes, cas Y7), 9.3 (Architect, signal, cas X1). `referentiel/lexique.ts` écarté, comme pour PP-20 |

## Vérifications et clôture

- Chaque lot prouve qu'il ne casse rien par les tests de ses paquets ([Règles d'exécution](#règles-dexécution)), et chaque vague par la vérification complète du point de synchronisation.
- Une publication se constate par `npm view <paquet>@<version> version`.
- P27 est close côté toolkit quand les cases 0.1 à 11.4 portent leur hash, 8.4 à 8.6 exceptées. Elle est livrée quand les cases `(mainteneur)` 8.4, 8.5 et 11.5 à 11.13 sont cochées et que 8.6 porte son hash.
