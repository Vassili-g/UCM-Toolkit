# Plan d'implémentation du référentiel UCM

Ce plan crée `@ucm-kit/core/referentiel`, y range les définitions relevées par
l'[audit](./AUDIT-REFERENTIEL.md), puis branche chaque outil dessus. Le
[README](./README.md) donne le principe et les décisions du mainteneur.

Cocher une case quand son commit est fait, avec le hash entre parenthèses.

## Règles d'exécution

- Un lot par appel d'agent, deux agents au plus en même temps, sur des
  paquets différents.
- Le prompt d'un agent donne : le lot copié de ce plan, les fichiers à lire,
  les critères de fin. L'agent ne lit ni l'audit entier ni la recherche
  Architect : la ligne de l'audit qu'il traite est citée par son repère (C01,
  T06…), et l'agent lit seulement cette ligne.
- La conversation principale relit le diff, fait lancer les vérifications par
  un `verificateur`, contrôle les fins de ligne contre `HEAD` et commite par
  chemins explicites. Personne ne lance `test:ui` : le mainteneur teste
  l'interface dans Figma.
- Un lot ne change pas la forme d'un contrat ni de `tokens.json` publiés. Si
  un test doré de l'exporteur change, l'agent s'arrête et rend le diff.
- Le code et les documents qui le décrivent se commitent séparément
  (`CONTRIBUTING.md`, « Une règle, un domicile »).

| Agent | Modèle | Pour |
|---|---|---|
| Conversation principale | Opus | Forme des entrées, relecture, commits, textes destinés au designer |
| `implementeur` | Sonnet | Lot à périmètre connu et critères vérifiables |
| `implementeur-exigeant` | Sonnet, effort élevé | Lot qui change plusieurs lecteurs d'une même règle |
| `executant` | Petit modèle | Remplacement mécanique listé, numéro de version, renvoi |
| `verificateur` | Haiku | `npm test`, `typecheck`, `build`, contrôle de style |

### Exécution avec Codex

| Rôle du plan | Modèle Codex | Effort |
|---|---|---|
| Conversation principale | Modèle de la session | Relecture et décisions de forme |
| `implementeur`, `chercheur` | GPT-6.1 Sol | Moyen |
| `implementeur-exigeant` | GPT-6.1 Sol | Élevé |
| `executant`, `verificateur` | GPT-6 Luna | Faible pour l'exécution, moyen pour une correction |

Deux agents délégués au plus travaillent simultanément. Ils reçoivent un seul
lot et les sources utiles, sans l'historique de la conversation. La
conversation principale tient les cases et les commits.

## Ordre et données

Aucun nouvel export de tokens n'est requis pour démarrer. Les lots 2, 9 et 15
lisent l'instantané actuel, `donnees-vue-illustree.js`, dont les composants
portent encore `press` et `disable`. C'est la v1 de l'Architect qui permet de
mettre le fichier Figma à jour ; l'export suit le lot 19.

Ordre conseillé : lots 0, 1 et 2, puis la phase 2 (lots 14 à 19), puis les
lots 3 à 13.

## Lot 0 · Préparation

- [x] Commiter l'audit, ce plan et la suppression du dossier « Bouton plein
  basculable » · principale (cbfd4f6)

## Lot 1 · Le socle du référentiel

**Agent :** principale pour la forme des entrées, puis `implementeur`.
**Effort :** moyen.

La conversation principale écrit `packages/kit/src/referentiel/termes.ts` :

```ts
type Langues = { readonly fr: string; readonly en: string };
type Terme = {
  readonly id: string;
  readonly libelle: Langues;
  readonly definition: Langues;
  readonly toleres?: readonly string[];   // lus, jamais recommandés
};
type Registre = { readonly id: string; readonly extensible: boolean; readonly termes: readonly Terme[] };
```

Avec deux fonctions : le terme retenu d'un mot lu (retenu ou toléré), et le
libellé d'un terme dans une langue.

L'agent fait ensuite :

- [x] `referentiel/index.ts` republie `../emplois/index.ts` sans le recopier (bb0d564) ;
  `emplois` reste exporté tel quel
- [x] Sous-chemin `./referentiel` dans `packages/kit/package.json`, inclusion (bb0d564)
  dans `tsconfig.build.json`
- [x] `vocabulaire.ts` : registres des crans (onze, 50 à 950, C01), des modes (bb0d564)
  (C03), des profils et de l'intensité unique (C04, C05), des états avec
  `pressed` et `disabled` retenus, `press`, `disable`, `hovered`, `focused`
  tolérés (V01), des noms d'axe d'état (V03), de la priorité entre états
  (V04), des tailles (V02), des statuts, des rôles de peinture (V05)
- [x] La loi de pureté (`packages/couleur/tests/loiDePurete.test.ts`) lit aussi (bb0d564)
  `kit/src/referentiel`
- [x] Tests : `packages/kit/tests/referentiel.test.ts`, identifiants uniques (bb0d564),
  aucun toléré en double ni égal à un terme retenu, libellés non vides dans
  les deux langues
- [x] `paquetPublie.test.mjs` connaît le nouveau sous-chemin (bb0d564)

Fin : `npm run build --workspace @ucm-kit/core`, tests du kit et de
`couleur` verts.

## Lot 2 · L'architecture des collections

**Agent :** `implementeur`. **Effort :** moyen. **Dépend :** lot 1.

- [x] `architecture.ts` : les sept collections dans l'ordre de la vue (23ff165)
  (A01), les alias permis entre elles, repris de `CIBLES_DES_COUCHES` de
  `packages/plugin-explorateur/src/integrations/profilUcm.ts` et du texte de
  la vue (A02), les axes de modes marque et thème (A03), les portées vides
  des collections intermédiaires (A10), la destination par défaut
  `primitives`/`colors` (A11)
- [x] Les familles de chaque collection, en registres extensibles (23ff165) :
  `identity`, `primary`, `secondary` pour `color-brands` (A04) ; statuts,
  `neutral`, `elevation` pour `color-utilities` (A05) ; familles de
  `primitives`, `layouts`, `typography` (A06 à A08)
- [x] La forme des chemins de chaque collection, sauf `components` : une liste (23ff165)
  de positions, chacune liée à un registre (exemple :
  `color-brands.{famille}.{mode}.{cran}`)
- [x] La reconnaissance du neutre : une fonction, `trim` puis minuscules (T07, 23ff165)
- [x] Test : les chemins de `theme`, `color-brands`, `color-utilities` (23ff165),
  `primitives`, `layouts` et `typography` de l'instantané actuel suivent les
  formes déclarées ; `components` est exclu

Fin : tests du kit verts. Un chemin de l'instantané qui ne suit pas sa forme
est rendu à la conversation principale, qui le soumet au mainteneur.

## Lot 3 · Thème, contraste, produits, règles d'usage, recommandations

**Agent :** `implementeur`. **Effort :** moyen. **Dépend :** lot 1.

- [ ] `theme` : la règle `scale/{cran}` pour toutes les palettes (T10), les
  portées de chaque variable reprises de `SUPPORT_DES_VARIABLES` (T06), les
  textes `foreground-main` et `foreground-subtle` du neutre conservés
- [ ] Libellés et définitions de chaque variable de `theme`, en deux langues :
  la conversation principale fournit les textes, repris des catalogues de
  Palettes (`i18n/fr.ts:846`, `i18n/en.ts:844`) et relus
- [ ] `contraste` : seuils par usage, texte 4,5 (icône comprise, de la couleur
  du texte) et non-texte 3 (G03) ; niveaux AA et AAA déplacés de
  `packages/couleur/src/contraste.ts` (G04)
- [ ] `produits.ts` : chaque plugin et paquet, ce qu'il écrit et ce qu'il lit
  (P01 à P08) ; l'adresse `ucm_palettes`/`recette` déplacée de
  `packages/couleur/src/protocole.ts` (S01)
- [ ] `regles.ts` : les huit tags des règles d'usage (R01), déplacés de
  `packages/plugin-exporter/src/contract/rulesModel.ts`
- [ ] `recommandations.ts` : forme d'une recommandation (identifiant,
  déclencheur pris parmi les caractéristiques de contrat, règle en deux
  langues, paramètres, preuve) et deux entrées : l'anneau de focus (2 px de
  fond, puis 2 px de trait) et le bouton basculable (`surface` au repos,
  `solid` activé)

Fin : tests du kit verts ; `couleur` et l'exporteur republient les
constantes déplacées pour que leurs lecteurs actuels compilent encore.

## Lot 4 · Le moteur de couleur

**Agent :** `implementeur`. **Effort :** petit. **Dépend :** lots 1 et 3.

- [ ] `packages/couleur` lit crans, modes, profils, niveaux, seuils par défaut
  et adresse de la recette dans le référentiel ; ses types publics restent
  les mêmes
- [ ] Aucune liste `['light', 'dark']`, `['soft', 'vivid']` ni aucune liste de
  crans écrite dans `packages/couleur/src`

Fin : tests de `couleur` verts, dont `architecture.test.ts` ; aucune valeur
calculée ne change, puisque le lot déplace des constantes sans les modifier.

## Lot 5 · UCM Palettes

**Agent :** `implementeur-exigeant`. **Effort :** élevé. **Dépend :** lot 4.

- [ ] Les listes écrites en dur relevées par l'audit (C03, C04,
  `variables/detection.ts:127`, `harmonisation.ts:140`,
  `reglagesParDefaut.ts:80`, `ui/…`) lisent le référentiel
- [ ] La destination par défaut vient d'`architecture.ts`
- [ ] Les libellés des variables de `theme` viennent du référentiel ; les
  phrases d'interface restent dans `i18n`
- [ ] La reconnaissance du neutre passe par la fonction du référentiel

Fin : tests unitaires de Palettes, `textes.test.ts` et `npm run build
--workspace ucm-palettes-plugin` verts ; aucun texte affiché ne change.

## Lot 6 · UCM Token Explorer

**Agent :** `implementeur`. **Effort :** moyen. **Dépend :** lots 2 et 3.

- [ ] `COUCHES` et `CIBLES_DES_COUCHES` viennent d'`architecture.ts` ; le
  profil connaît les sept collections et ne contrôle encore que les couleurs
- [ ] La reconnaissance du neutre passe par la fonction du référentiel
- [ ] Les variables de `theme` s'affichent avec leur libellé

Fin : tests de l'explorateur et build verts.

## Lot 7 · UCM Contract Exporter

**Agent :** `implementeur-exigeant`. **Effort :** élevé. **Dépend :** lots 1 et 3.

- [ ] `STATE_SELECTORS`, `STATE_PRECEDENCE`, `STATE_AXIS_NAMES` et
  `SIZE_VALUES` viennent du référentiel
- [ ] Le message d'un état inconnu recommande `pressed` et `disabled`
- [ ] Un état toléré (`press`, `disable`) reste publié sous son nom Figma ;
  l'analyse avertit le designer que UCM recommande le terme retenu. Texte de
  l'avertissement écrit par la conversation principale
  (`rediger-diagnostics-ucm`)
- [ ] Les tags des règles d'usage viennent de `regles.ts`

Fin : tests de l'exporteur verts, tests dorés inchangés, build vert.

## Lot 8 · Lecteurs du kit et CLI

**Agent :** `implementeur`. **Effort :** petit. **Dépend :** lot 3.

- [ ] `diagnostic-contrastes.mjs` lit ses seuils par rôle dans le référentiel
  (G03)
- [ ] Le CLI ne recode aucune donnée du référentiel

Fin : tests du kit et du CLI verts, rapport de contrastes inchangé.

## Lot 9 · La vue illustrée suit le référentiel

**Agent :** `implementeur`. **Effort :** moyen. **Dépend :** lots 2 et 3.

- [ ] `generer-vue-illustree.ts` lit le référentiel : table des rôles, liste
  des collections, libellés, recommandations ; les données du panneau
  restent celles de l'instantané, régénéré après le lot 19
- [ ] Le texte de la vue qui recopie une table du kit est remplacé par la
  table générée
- [ ] Un test échoue quand la vue générée diffère du fichier commité

Fin : la vue s'ouvre dans un navigateur ; test vert.

## Lot 10 · La planche du moteur

**Agent :** `implementeur`. **Effort :** moyen. **Dépend :** lots 3 et 4.

Une page générée qui montre comment le moteur fabrique ses palettes, à côté
de Tailwind 3.4 : peu de texte, des pastilles et des composants. Elle vit à
côté du moteur, dans `packages/couleur/planche/`, et un test la tient à jour.

Modèle : la section 1 de la
[maquette de la recette du moteur](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Plugin%20Palettes/Recette%20moteur%20palettes/Maquettes/MAQUETTE-MOTEUR.html#comparaison),
sans le formulaire d'avis ni les variantes de réglages.

- [ ] `planche/generer-planche.ts` importe `packages/couleur/src` et le
  référentiel, et écrit `planche/PLANCHE-DU-MOTEUR.html`, autonome (données
  dans la page, aucune ressource externe)
- [ ] Une ligne par famille chromatique de `planche/tailwind-3.4.17.json` : la
  rampe Tailwind, puis les rampes du moteur avec sa couleur 500 comme
  référence, Soft et Vivid, Light et Dark. En Dark, chaque cran de Tailwind
  est la nuance de sa rampe la plus proche de la courbe Dark
- [ ] Sous chaque rampe du moteur, les composants qui prennent leurs rôles
  dans la table du référentiel : badge et alerte sur `surface`, bouton
  `solid`, lien `page/foreground`, anneau `ring`, posés sur la carte et la page
- [ ] Commandes : profil, thème, texte des boutons du Dark (noir ou blanc) ;
  une phrase de légende par section, au plus
- [ ] `npm run planche --workspace ucm-couleur` régénère la page ;
  `tests/planche.test.ts` la génère en mémoire, la compare au fichier commité
  et donne la commande en cas d'écart
- [ ] Liens depuis `packages/couleur/README.md`,
  `packages/plugin-palettes/README.md` et `docs/README.md`

Fin : la page s'ouvre sans réseau, pèse moins de 1 Mo, et son test est vert.

## Lot 11 · Les garde-fous

**Agent :** `implementeur`. **Effort :** moyen. **Dépend :** lots 4 à 8 et 10.

- [ ] `tests/referentielUnique.test.ts` : hors de `packages/kit/src/referentiel`
  et `emplois`, aucune liste littérale de crans, de modes, de profils,
  d'états, de collections ni de tags dans `packages/*/src` ; le message
  d'échec nomme le module à importer. Les catalogues `i18n` sont lus aussi
- [ ] Un commentaire en tête de chaque fichier du référentiel : ce qu'il porte,
  et la suite d'une modification (tests, vue illustrée, version du kit)
- [ ] Les entrées d'`AGENTS.md` nécessaires à `inventaireInvariants.test.ts`

Fin : `npm test` vert.

## Lot 12 · Les documents

**Agent :** `implementeur`, avec `rediger-sans-tics-ia`. **Effort :** moyen.
**Dépend :** lot 11. Commit séparé du code.

- [ ] `AGENTS.md`, section « Avant de modifier » : une définition UCM se
  modifie dans `packages/kit/src/referentiel/`, puis les tests, la vue
  illustrée et la version du kit suivent ; un changement du moteur régénère
  la planche du moteur
- [ ] `AGENTS.md`, groupe « Moteur de couleur » : la prose qui recopie la table
  devient la règle, sa borne, le fichier et un lien
- [ ] Spécification de Palettes : les passages qui recopient la table ou les
  garanties renvoient au référentiel
- [ ] `CONCEPT.md` : une section courte sur le rôle des produits et les deux
  périmètres, qui renvoie à `produits.ts`
- [ ] `README.md` racine : la recette est au format 12 ; les rôles des outils
  renvoient à CONCEPT
- [ ] `docs/format/FORMAT.md`, section 4 : les états tolérés et l'avertissement
  de l'exporteur

Fin : `docLinks`, contrôle de style et `npm test` verts.

## Lot 13 · Vérification et publication

**Agent :** `verificateur`, puis principale. **Effort :** petit.

- [ ] `npm test`, `npm run typecheck`, `npm run build` · `verificateur`
- [ ] Version de `@ucm-kit/core` à 0.7.0, et du CLI s'il a changé ;
  publication · principale
- [ ] Push sur `main` · principale
- [ ] Recette Figma des trois plugins après `npm run build` · mainteneur

## Phase 2 · UCM Architect v1 : normaliser les noms

La v1 de l'Architect normalise les noms du fichier Figma selon une convention
que le designer choisit : casse et séparateur des mots. Le plugin détecte la
convention dominante du fichier et la propose par défaut. En option, il
remplace aussi les termes tolérés par les termes retenus du référentiel
(`press` en `pressed`, `disable` en `disabled`) : la convention sert tout
projet, le remplacement des termes est le périmètre « full UCM ».

Elle porte sur les noms des collections, des variables (groupes compris), des
propriétés de composant et des valeurs de variantes. Elle ne pose aucun alias
et n'écrit rien d'autre.

Rien ne se perd : aucun renommage ne s'applique sans être affiché et coché,
une collision bloque sa ligne, le lot s'annule en un seul geste, et la table
ancien nom vers nouveau nom se télécharge.

Cette phase dépend des lots 1 et 2 seulement. Elle peut passer avant les
lots 3 à 13 : c'est elle qui débloque la migration du fichier du mainteneur.

### Décisions du mainteneur

| Sujet | Décision |
|---|---|
| Casse | Au choix du designer, selon le projet |
| Mots d'un segment | Au choix parmi les conventions courantes ; le plugin détecte la convention dominante et la propose |
| Étendue | Tout : collections, variables, propriétés de composant, valeurs de variantes |
| Exigence | Normaliser tout le fichier sans rien perdre |

## Lot 14 · Cadrage de l'Architect

**Agent :** un `chercheur`, puis principale. **Effort :** moyen.

- [x] Recherche sur l'API Plugin de Figma · `chercheur` (47ac3d6) : renommer la valeur
  d'une variante et une propriété de composant ; ce que deviennent les
  instances du fichier, celles des fichiers qui utilisent la bibliothèque
  publiée, et leurs surcharges ; ce que devient une variable renommée dans
  un fichier consommateur ; un seul pas d'annulation pour un lot de
  renommages ; renommer une collection et une propriété de composant
  (`editComponentProperty`) ; le coût sur 800 variables et sur les
  ensembles de variantes de toutes les pages ; où ranger la convention
  choisie dans le document
- [x] Maquette de l'écran unique de la v1, dans le style des galeries (47ac3d6)
  existantes, en thème sombre, avec les mots d'un designer débutant : le
  choix de la convention, avec la convention dominante détectée et ses
  comptes ; la liste des renommages proposés, groupés par raison, une case
  par ligne ; un bouton pour appliquer · principale
- [x] Validation de la maquette · mainteneur (47ac3d6, structure validée)

## Lot 15 · Le moteur de normalisation

**Agent :** `implementeur`. **Effort :** moyen. **Dépend :** lots 1 et 2.

- [x] Un registre des conventions dans le référentiel (8d5b340) : casses (minuscules,
  majuscule initiale, camelCase, PascalCase, inchangée) et séparateurs des
  mots d'un segment (tiret, tiret bas, soudé, camelCase)
- [x] La découpe d'un segment en mots, quelle que soit sa forme d'origine (8d5b340)
  (`borderRadius`, `border-radius`, `border_radius`, `Border Radius`) ; un
  segment soudé (`fontsize`) reste un mot, sauf si le registre des termes le
  connaît
- [x] La détection de la convention dominante, par catégorie de nom (8d5b340)
  (collections, variables, propriétés, valeurs), avec ses comptes
- [x] `referentiel/normalisation.ts`, pur (8d5b340) : d'une liste de noms et d'une
  convention, il rend les renommages proposés, chacun avec l'ancien nom, le
  nouveau et sa raison (casse, séparateur, terme toléré) ; un nom déjà
  conforme n'est pas proposé
- [x] Deux noms qui aboutiraient au même nom ne sont pas proposés (8d5b340) ; la
  collision est rendue à part
- [x] Tests sur les chemins de `donnees-vue-illustree.js` (8d5b340) : les 60 segments
  `press` et 36 `disable` de `components` sont proposés en `pressed` et
  `disabled`

## Lot 16 · Le plugin et sa lecture

**Agent :** `implementeur-exigeant`. **Effort :** élevé. **Dépend :** lots 14
et 15.

- [ ] `packages/plugin-architect` sur le socle des plugins : manifeste, build,
  galerie, comme `plugin-explorateur`
- [ ] Lecture des collections, des variables locales, des propriétés et des
  valeurs de variantes des composants locaux, de toutes les pages, avec un
  avancement ; propositions par le moteur du lot 15
- [ ] `tests/pluginsSepares.test.ts` couvre le nouveau plugin ; `produits.ts`
  le décrit

## Lot 17 · L'écriture des renommages

**Agent :** `implementeur-exigeant`. **Effort :** élevé. **Dépend :** lot 16.

- [ ] Appliquer les renommages cochés : nom de la collection, de la variable,
  de la propriété de composant, valeur de la variante ; un seul pas
  d'annulation pour le lot
- [ ] Juste avant d'écrire, relire chaque nom : une ligne dont le nom a
  changé depuis la proposition n'est pas appliquée
- [ ] La convention choisie se range dans le document, pour que l'équipe la
  retrouve
- [ ] Une loi d'écriture, sur le modèle de `loiDeLectureSeule.test.ts` de
  l'explorateur : le plugin n'appelle que ces écritures
- [ ] Après application, téléchargement de la table ancien nom vers nouveau
  nom, en JSON, pour le dépôt de code

## Lot 18 · L'interface

**Agent :** `implementeur-exigeant`. **Effort :** élevé. **Dépend :** lot 17,
maquette validée.

- [ ] L'écran de la maquette, avec ses états de galerie
- [ ] Les textes affichés, écrits par la conversation principale

## Lot 19 · Vérification et recette

**Agent :** `verificateur`, puis mainteneur. **Effort :** petit.

- [ ] Tests, `typecheck` et build du plugin · `verificateur`
- [ ] Recette dans Figma sur une copie du fichier, puis sur le fichier ·
  mainteneur
- [ ] Export des tokens du fichier renommé ; régénérer
  `donnees-vue-illustree.js` et relancer les tests des lots 2 et 9

## Pistes après ce plan

| Piste | Contenu |
|---|---|
| Descriptions des variables | L'exporteur publie la description Figma de chaque variable en `$description` ; l'Architect écrit le libellé et la définition du référentiel dans la description des variables de `theme` |
| Recommandations pour les agents | `ucm guide` injecte une recommandation seulement quand le contrat emploie son déclencheur et ne fixe pas lui-même la valeur |
| Grammaire de `components` | À écrire quand les composants du fichier Figma passent par `theme` |
| État `selected` | Le reconnaître demande un sélecteur et une nouvelle version du format du contrat |
| Déclaration d'un design system | Les familles ajoutées par une équipe, publiées dans `$extensions["com.ucm.declaration"]` de `tokens.json` |
| UCM Architect, versions suivantes | Le bilan du fichier contre le référentiel, puis l'écriture des alias de `theme`, `color-brands` et `color-utilities` |
| Contrôle « full UCM » | `ucm check` confronte un `tokens.json` au référentiel, en option |
