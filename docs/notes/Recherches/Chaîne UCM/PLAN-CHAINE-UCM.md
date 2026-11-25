# Plan de P29 : la chaîne UCM dans l'inventaire

Ce plan suit la piste P29 de `docs/notes/Recherches/Evolutions globales/pistes.json` et la [recherche](./RECHERCHE-CHAINE-UCM.md). Chaque case cochée porte le hash de son commit.

## Règles du plan

- Le rendu de la maquette validée `_local/presentation-po/maquette-v16.html` ne change pas : disposition, tracé A*, écartement des traits, chevrons, survol, lectures, scénarios, jauges, étirement, police. Un sous-lot change les données ou leur source, jamais l'algorithme ni le style.
- Une porte au pixel garde chaque sous-lot qui touche le rendu (voir « La porte au pixel »). Un écart qui vient d'une donnée corrigée par le calcul est permis s'il figure dans le compte rendu, trait par trait et carte par carte. Tout autre écart arrête le sous-lot.
- Les textes rédigés de la maquette restent tels quels jusqu'à l'étape F, qui attend le mainteneur.
- Aucun nom de client n'entre dans le registre ni dans les pages : elles sont publiques.
- Aucun agent ne lance `test:ui`. Aucun implémenteur ne commite ni ne régénère les pages : l'orchestrateur lance `npm run vues`, relit le diff, fait vérifier et commite par chemins explicites.

## Décisions de l'orchestrateur

| Question de la recherche | Décision | Raison |
|---|---|---|
| Q1 | La carte UCM Implementer garde la description du compilateur. La pièce « Serveur MCP » cite P13. | Le mainteneur a décrit le module le 2026-11-25 : semi-algorithmique, semi-IA, il construit les composants quand le contrat change. Le plan de l'implémenteur dit la même chose ; le résumé de P8 est plus ancien. |
| Q3 | Le produit s'appelle « UCM Contract Exporter », dans `produits.ts` comme sur la carte. | C'est le nom public de la Figma Community, du README racine et de `CONCEPT.md`. |
| Q4 | Dans l'inventaire, la chaîne sort de la colonne et prend la largeur de la fenêtre, comme la page plein écran. | C'est le rendu validé. Une réduction à 68 % serait un écart. |
| Q5 | La porte `protocoles` va sous la puce « Architecture des tokens ». | Les 5 puces validées ne changent pas. |
| Police | La chaîne écrit avec la police de l'inventaire, `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, dans les deux pages. | Le mainteneur veut une seule police dans tout l'inventaire (2026-11-25). |

Q2 et les textes corrigés de E1 à E5, E8, E10 à E12, E14 et E15 attendent le mainteneur (étape F).

## La porte au pixel

Le script jetable `_local/presentation-po/comparer.mjs`, hors du dépôt, capture la maquette v16 et la page générée dans les mêmes conditions et compare les images pixel par pixel. La maquette de référence reçoit la police de l'inventaire à la place d'Inter.

| Paramètre | Valeurs |
|---|---|
| Fenêtres | 2560 × 1290, 1440 × 780 |
| États | Sans UCM, Aujourd'hui et Chaîne complète, chacun dans les lectures « Le flux » et « Les paquets » ; dans Chaîne complète, les quatre combinaisons des bascules d'Architect et d'Implementer ; trois cartes dépliées (UCM Palettes, Contrôle UCM, `@ucm-kit/core`) ; le survol de Contrôle UCM ; la puce « Règles de contrôle » |
| Sortie | une ligne par état qui diffère, avec le nombre de pixels et le chemin de l'image des différences ; rien quand tout concorde |

Le script lit seulement la page et la maquette. Un agent ne lit jamais les images ni les pages générées.

## Économie de tokens

- Un implémenteur reçoit la sortie d'`agents:lire` pour ses chemins, le texte de son sous-lot et les extraits de la recherche que le sous-lot cite. Il ne reçoit ni ce plan entier, ni la maquette, sauf A3.
- Les sous-lots de deux agents simultanés écrivent des fichiers disjoints. Les pages générées `CHAINE-UCM.html` et `INVENTAIRE-UCM.html` ne sont écrites que par l'orchestrateur, au commit.
- Un implémenteur lance seulement les tests de son sous-lot : `node --import tsx --test tests/chaine.test.ts`, `tests/inventaire.test.ts` ou `npm run test --workspace @ucm-kit/core`. Le `verificateur` lance la suite complète, une fois par étape.
- Une modification listée va à l'`executant`. La relecture d'un diff commence par `git diff --stat`.

`npm run agents:lire -- docs/inventaire/generer-inventaire.ts docs/inventaire/gabarit.html docs/inventaire/page.js docs/inventaire/page.css docs/inventaire/sources.json docs/inventaire/releves.ts docs/inventaire/couverture.ts tests/inventaire.test.ts scripts/vues.mjs scripts/ouvrir-inventaire.mjs packages/kit/src/referentiel/produits.ts packages/kit/tests/referentiel-definitions.test.ts` rend : `AGENTS.md`, `CARTE.md`, `CONTRIBUTING.md`, `CONTRIBUTING.md#travailler-avec-des-agents`, `packages/kit/AGENTS.md`, `packages/kit/CARTE.md`, `packages/kit/invariants/referentiel.md`. Les fichiers de `docs/inventaire/` n'ont pas de domicile dans `.agents/domiciles.json` ; la ligne `docs/inventaire/` de `CARTE.md` les décrit.

## Ordre et parallélisme

| Vague | Sous-lots en parallèle | Fichiers disjoints |
|---|---|---|
| 1 | A1 (orchestrateur), puis A3 ; B1 en parallèle de A3 | A3 écrit `docs/inventaire/`, `scripts/vues.mjs`, `tests/inventaire.test.ts` ; B1 écrit `packages/kit/` |
| 2 | C1, puis C2 et C3 ; D1 en parallèle de C1 | C écrit `docs/inventaire/chaine/*.ts`, `docs/inventaire/releves.ts`, `tests/chaine.test.ts` ; D1 écrit `gabarit.html`, `page.js`, `page.css`, `generer-inventaire.ts`, `couverture.ts`, `tests/inventaire.test.ts`, `scripts/ouvrir-inventaire.mjs`, `CARTE.md` |
| 3 | D2 | après C2 et D1 |
| 4 | E1 | tout l'arbre |
| 5 | F1 (mainteneur), puis F2 | `docs/inventaire/chaine/briques.ts` |

## Étape A. Séparer les données du rendu

- [x] A1 (orchestrateur, 445b0acc). Écrire la porte au pixel `_local/presentation-po/comparer.mjs` et l'éprouver : la maquette contre elle-même ne rend aucune différence.
- [x] A3 (445b0acc) Sortir les données de la maquette et générer `CHAINE-UCM.html` à l'identique.
  - Agent : `implementeur-exigeant` (réécriture sans perte, interface au pixel près). Nature : déplacement de code à sortie identique.
  - Lit : `_local/presentation-po/maquette-v16.html` en entier, la section 5 de la recherche.
  - Écrit :
    - `docs/inventaire/chaine/briques.ts` : les constantes `ZONES`, `LEGENDES`, `NOEUDS`, `LIENS`, `KIT`, `MARQUES`, `GARANTIES` recopiées telles quelles, typées ;
    - `docs/inventaire/chaine/calculs.ts` : `donneesDeLaChaine()`, qui rend pour l'instant les constantes du registre sans les transformer ; c'est la seule entrée que lit le générateur ;
    - `docs/inventaire/chaine/rendu.js` : le script de la maquette sans ses données, exposé par `monterLaChaine(racine, donnees)`. Il écoute sur sa racine et non sur `document`, suit la taille de sa racine par un `ResizeObserver`, et préfixe ses identifiants par `chaine-` ;
    - `docs/inventaire/chaine/chaine.css` : le style de la maquette, chaque règle sous `.chaine`, avec la police de l'inventaire à la place d'Inter ;
    - `docs/inventaire/chaine/plein-ecran.html` : le gabarit de la page plein écran ;
    - `docs/inventaire/generer-inventaire.ts` : `genererChaine()`, qui écrit les logos en SVG en ligne par `svgDeMarque` ;
    - `docs/inventaire/sources.json`, `scripts/vues.mjs`, `tests/inventaire.test.ts` : la vue `CHAINE-UCM.html`, sa fraîcheur, et le refus de `src=`, `<link>` et `@import` dans cette page.
  - Critères de fin : la porte au pixel ne rend aucune différence sur `CHAINE-UCM.html`, générée par l'orchestrateur ; le diff de `rendu.js` contre le script de la maquette ne retire que les données et ne change que les écoutes, les identifiants et les logos ; `node --import tsx --test tests/inventaire.test.ts` passe.
- [x] B1 (445b0acc) Corriger ce que `produits.ts` déclare d'Architect et le nom de l'Exporter.
  - Agent : `implementeur`. Nature : correction d'un défaut (E9, Q3).
  - Lit : `packages/kit/invariants/referentiel.md`, `packages/kit/invariants/versionnage.md`.
  - Écrit : `packages/kit/src/referentiel/produits.ts` (Architect écrit `variables` et `composants` dans le document Figma ; libellé « UCM Contract Exporter »), `packages/kit/tests/referentiel-definitions.test.ts`, `packages/kit/package.json`, `packages/kit/CHANGELOG.md`.
  - Critères de fin : un test échoue avant la correction et passe après ; le compte rendu liste chaque lecteur du libellé changé ; `npm run test --workspace @ucm-kit/core` passe. L'orchestrateur lance ensuite les tests racine (`versionSuitLeContenu`) et publie par la skill `publier-paquets`.
- [x] A4 (vérificateur, 445b0acc). `npm run vues`, puis `node scripts/run-tests.cjs`.

## Étape C. Le registre et les calculs

- [x] C1 (b3604f29) Donner au registre la forme `Brique` de la recherche (section 4) et ses tests de structure, sans changer l'affichage.
  - Agent : `implementeur`. Nature : déplacement de code à sortie identique, plus des tests nouveaux.
  - Écrit : `docs/inventaire/chaine/briques.ts` (entrées `Brique`, `recoit` à la place de `LIENS`, `PUCES_DU_KIT`, `JAUGES`, `NOMBRES_ECRITS`), `docs/inventaire/chaine/calculs.ts` (conversion du registre vers la forme que lit `rendu.js`), `tests/chaine.test.ts`.
  - Dans ce sous-lot, `etat`, `auj`, `deps`, `teinte`, `MARQUES` et `KIT` restent déclarés.
  - Tests nouveaux, chacun éprouvé sur un registre fabriqué qui viole sa règle : une carte d'outil, de module, de paquet ou la note sans `produit` ni `piste` ; une piste citée absente de `pistes.json` ; un `recoit.de`, un `vers` ou un identifiant de `JAUGES` inconnu ; une carte qui sort de sa zone, largeur comprise ; une couche dont une collection manque à `COLLECTIONS`.
  - Critères de fin : `donneesDeLaChaine()` rend un objet identique à celui de A3, vérifié par un test qui compare les deux sérialisations ; `node --import tsx --test tests/chaine.test.ts` passe.
- [x] C2 (b3604f29) Calculer états, scénario « Aujourd'hui », dépendances, marques, traits et puces du kit, versions et nombres.
  - Agent : `implementeur`. Nature : correction d'un défaut, avec un test qui échoue sans la correction.
  - Écrit : `docs/inventaire/chaine/calculs.ts`, `docs/inventaire/chaine/briques.ts` (retrait des champs calculés), `docs/inventaire/releves.ts` (imports de `@ucm-kit/core/<porte>` par paquet ; une seule table des logos par produit), `tests/chaine.test.ts`. Les nombres se calculent dans `calculs.ts`, par import du référentiel, sans toucher `generer-inventaire.ts`.
  - Règles de calcul : une carte de produit est « Disponible » ; une carte à piste est « Disponible » si `roadmap()` range sa piste dans les terminées, « À venir » sinon ; une carte à pièces est « Disponible » si toutes ses pièces le sont, « À venir » si aucune ne l'est, « En partie » sinon ; « Aujourd'hui » active les cartes « Disponible » ; la porte `protocoles` va sous la puce « Architecture des tokens ».
  - Tests nouveaux : une carte « À venir » qui cite une piste terminée ; une piste terminée sans `produit` ni preuve ; une preuve absente du code ; un registre qui porte `etat`, `auj`, `deps`, `teinte`, `MARQUES` ou `KIT` ; un texte qui contient une version `x.y.z`, ou un nombre hors d'un trou `{{…}}` et hors de `NOMBRES_ECRITS` ; un nombre de `NOMBRES_ECRITS` absent de sa source ; une porte de `exports` du kit hors de toute puce, ou dans deux.
  - Critères de fin : la porte au pixel ne rend que les écarts listés au compte rendu, dont au moins les traits du kit vers `ucm-couleur` et `plugin-socle` (E6), les puces recalculées (E7) et le nombre de la zone du kit (E8) ; `node --import tsx --test tests/chaine.test.ts` passe.
- [ ] C3 Vérifier chaque trait du flux par ce que sa source écrit et ce que sa cible lit, et calculer sa teinte.
  - Agent : `implementeur`. Nature : correction d'un défaut, avec un test qui échoue sans la correction.
  - Écrit : `docs/inventaire/chaine/briques.ts` (donnée de chaque `recoit`, `lit` et `ecrit` des modules, gestes et fichiers), `docs/inventaire/chaine/calculs.ts` (table des teintes), `tests/chaine.test.ts`.
  - Tests nouveaux : un trait dont la source n'écrit pas la donnée, ou dont la cible ne la lit pas, d'après `PRODUITS` pour un produit et d'après le registre pour le reste ; un mode d'outil dont la carte n'écrit pas la donnée de sa cible ; une donnée `aide` ou `hebergement` hors des trois traits nommés par la recherche (section 2).
  - Critères de fin : la porte au pixel ne rend aucun écart, ou le compte rendu nomme chaque trait dont la teinte change et pourquoi ; `node --import tsx --test tests/chaine.test.ts` passe.
- [ ] C4 (vérificateur). `npm run vues`, puis `node scripts/run-tests.cjs`.

## Étape D. L'inventaire

- [x] D1 (b3604f29) Remplacer la section 3 de l'inventaire par la chaîne, en pleine largeur, avec un lien vers la page plein écran.
  - Agent : `implementeur-exigeant` (interface au pixel près, style et script partagés). Nature : texte ou écran nouveau.
  - Écrit : `docs/inventaire/gabarit.html` (section `#chaine`, sommaire, retrait des huit étapes ; la phrase de l'étape « Variables à la main » rejoint la liste F1), `docs/inventaire/page.css` (retrait des règles du parcours, lignes 327 à 349 et 452 à 453 ; la section sort de la colonne), `docs/inventaire/page.js` (retrait du code des étapes, lignes 301 à 321 ; `.chaine` dans `HORS_ETIQUETTE`), `docs/inventaire/generer-inventaire.ts`, `docs/inventaire/couverture.ts` (univers « produits du kit »), `tests/inventaire.test.ts` (lien admis vers `CHAINE-UCM.html`), `scripts/ouvrir-inventaire.mjs` (écrit les deux pages), `CARTE.md`.
  - Ne touche pas `docs/inventaire/chaine/`.
  - Critères de fin : la porte au pixel, appliquée à la scène de la section 3, ne rend aucune différence avec `CHAINE-UCM.html` à largeur égale ; l'inventaire ne contient plus `class="parcours"` ni `etape-carte` ; aucune règle de `chaine.css` ne sort de `.chaine` ; un clic hors de la chaîne ne la redessine pas ; la page reste sous 1 Mo ; `node --import tsx --test tests/inventaire.test.ts` passe.
- [ ] D2 Calculer l'étiquette d'état des fiches d'outil de la section 2, relier chaque carte de produit à sa fiche, partager la taille de TypeScript.
  - Agent : `implementeur`. Nature : correction d'un défaut.
  - Écrit : `docs/inventaire/gabarit.html`, `docs/inventaire/generer-inventaire.ts`, `docs/inventaire/chaine/rendu.js` (lien d'une carte de produit vers `#outil-<id>`).
  - Critères de fin : le gabarit ne contient plus « livré » écrit à la main dans une fiche, ni « 23 Mo » ; la porte au pixel ne rend aucune différence ; `node --import tsx --test tests/inventaire.test.ts` passe.

## Étape E. Vérification

- [ ] E1 Lancer la vérification complète sur l'arbre stable et relire les documents que `npm run agents:diff` liste.
  - Agent : `verificateur` pour `npm test`, `npm run typecheck`, `npm run build` ; orchestrateur pour `npm run agents:diff` et la relecture.
  - Critères de fin : les trois commandes passent ; chaque document listé par `agents:diff` est à jour.

## Étape F. Les textes corrigés

- [ ] F1 (mainteneur). Répondre à Q2 et valider les textes corrigés de E1 à E5, E8, E10 à E12, E14 et E15, et la phrase de l'étape « Variables à la main » (E12).
- [ ] F2 Écrire dans le registre les textes validés en F1.
  - Agent : `executant`. Nature : modification listée.
  - Écrit : `docs/inventaire/chaine/briques.ts`.
  - Critères de fin : chaque texte du registre égale le texte validé ; `node scripts/controle-style.mjs` ne refuse rien ; la porte au pixel ne rend que les textes changés ; `node scripts/run-tests.cjs` passe.
