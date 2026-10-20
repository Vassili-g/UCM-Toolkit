# Plan d'implémentation de la fiabilité

Ce plan découpe le [plan de fiabilité](./PLAN-FIABILITE-KITS-ET-PLUGINS.md) en
tâches qu'un agent exécute sans voir la conversation. Le plan de fiabilité
porte le pourquoi, les exemples et les décisions D1 à D8 ; ce document porte le
qui et le comment. En cas de désaccord entre les deux, le plan de fiabilité
fait foi et la conversation principale corrige ce document.

Cocher une case quand la tâche est faite. Avant le commit, indiquer « non
commité » ; remplacer cette mention par le hash du commit qui la porte.

## Qui fait quoi

| Agent | Modèle | Reçoit | Ne reçoit jamais |
|---|---|---|---|
| Conversation principale | Opus | Conception d'une interface de code, texte destiné au designer, relecture des diffs, commits, numéros de version, publication finale, cases cochées | |
| `implementeur` | Sonnet | Une tâche dont les fichiers, la forme du code et les tests sont fixés ici ou par une tâche de conception | Une décision de conception, un texte d'écran à inventer |
| `implementeur-exigeant` | Sonnet | Une tâche qui touche plusieurs lecteurs d'une même règle, ou une sortie qui doit rester identique octet pour octet | Idem |
| `executant` | Haiku | Un changement mécanique à résultat unique : renommage listé, numéro de version, renvoi de documentation | Toute tâche qui demande de lire du code pour décider |
| `verificateur` | Haiku | Les commandes de vérification de la clôture de lot | Une correction |
| `Explore` | Sonnet | Un relevé en lecture seule sur plusieurs dossiers | Une modification |

Une tâche marquée **Conception** produit une note courte, rangée dans le
dossier `conception/` à côté de ce plan, avec les signatures exactes, les cas
limites et les tests attendus. La tâche d'implémentation qui suit reçoit cette
note en entrée.

## Ce que chaque agent reçoit dans son appel

La conversation principale copie dans le message de l'agent :

1. l'identifiant et le texte complet de la tâche ;
2. la section du plan de fiabilité citée par la tâche ;
3. la note de conception, s'il y en a une ;
4. les règles ci-dessous.

**Règles pour tous les agents.**

- Lire `AGENTS.md` (carte du code et invariants du domaine touché), puis la
  skill `.agents/skills/rediger-sans-tics-ia/SKILL.md` avant d'écrire un
  commentaire ou un texte.
- Une définition UCM se modifie dans `packages/kit/src/referentiel/` ou
  `packages/kit/src/emplois/`. Le kit n'importe jamais `ucm-couleur`,
  `ucm-plugin-socle` ni un plugin.
- Le périmètre agnostique reste le défaut : ne jamais transformer une
  collection libre, un groupe personnalisé ou un nom propre en erreur.
- Relire un fichier juste avant de l'éditer : une autre session peut le
  modifier. Ne toucher aucun fichier hors de la liste de la tâche sans le
  signaler dans le compte rendu.
- Garder les fins de ligne du fichier édité.
- Ne jamais lancer `test:ui`, ni une boucle d'attente, ni `git commit`, ni
  `git push`, ni une publication.
- N'écrire dans un fichier suivi aucun nom tiré de `_local/`.
- Un test qui prouve une correction doit échouer sans elle : retirer la
  correction, constater l'échec, la remettre, et citer le test rouge dans le
  compte rendu.
- Finir par `npm run typecheck` et les tests des paquets touchés. Rendre la
  liste des fichiers modifiés et le résultat des commandes.

## Clôture d'un lot

Chaque lot finit par ces quatre étapes, cochées sur sa ligne « Clôture ».

1. **Relecture** (conversation principale) : relire le diff complet de chaque
   tâche ; vérifier les fins de ligne contre `HEAD`.
2. **Vérification** (`verificateur`) : depuis la racine, `npm run typecheck`,
   puis `npm test` (kit, paquets et tests racine), puis
   `node scripts/controle-style.mjs` sur chaque document ou fichier de code
   modifié. Rendre un tableau commande, résultat, erreurs exactes.
3. **Commit** (conversation principale) : par chemins explicites, message au
   format du dépôt, puis `git push`.
4. **Numéro de version** (conversation principale), quand le lot change le
   contenu publiable d'un paquet (`packages/kit/src`, son README, la CLI,
   l'adaptateur) : monter le numéro du paquet, et les pins de la CLI et de
   l'adaptateur sur le kit, dans le commit du lot (modèle : `cc9c78fe`), sans
   publier. `tests/versionSuitLeContenu.test.mjs` exige un numéro monté, pas
   un numéro publié : la CI de `main` reste verte. Les numéros intermédiaires
   ne seront jamais publiés.

**Publication, une seule fois, à la fin du plan** (demande du mainteneur) :
publier les dernières versions dans l'ordre core, cli, adapter (skill
`.agents/skills/publier-paquets`), et constater chaque version par `npm view`. Le kit
0.9.11 a été publié au lot 8, avant cette demande ; la CLI 0.1.70 et
l'adaptateur 0.1.63 ne l'ont pas été, et les README les montrent jusqu'à la
publication finale.

Puis cocher le lot dans l'avancement du plan de fiabilité, avec son hash.

**Clôture commune des lots 2 à 7 et 9 à 14** (demande du mainteneur, pour
économiser) : Codex a laissé ces lots mêlés dans les mêmes fichiers, sans
commit. Ils se ferment ensemble : une relecture des diffs par échantillon,
une seule vérification complète, un seul commit, une seule montée de version
(kit 0.11.0, CLI 0.1.74, adaptateur 0.1.67 : le kit gagne les portes
`protocoles` et `nommage`), puis la publication finale.

## Avancement

- [x] Lot 8. La fabrication et la vérification (b805f6a5)
- [x] Lot 17. Les nouveaux noms des couches UCM (0ccbff70)
- [x] Lot 1. L'explorateur reconnaît le thème quelle que soit son écriture (42dd8719)
- [x] Lot 2. Une comparaison qui n'a pas pu se faire le dit (94d384cc)
- [x] Lot 3. Une couleur de composant vise le thème (94d384cc)
- [x] Lot 5. Palettes annonce ce qu'il écrit, sur un lot entier (94d384cc)
- [x] Lot 4. Les protections de Nomenclature tiennent et s'expliquent (94d384cc)
- [x] Lot 6. La grammaire décrit toutes les palettes du profil UCM (94d384cc)
- [x] Lot 14. La destination de Palettes en full UCM (94d384cc)
- [x] Lot 15. La CLI distingue une erreur de Git d'un changement (0ccbff70)
- [x] Lot 16. L'adaptateur TypeScript refuse un type incompatible (0ccbff70)
- [x] Lot 9. Les chemins de tokens et les axes dans le kit (94d384cc)
- [x] Lot 10. Les rôles de rendu dans le kit (94d384cc)
- [x] Lot 11. Les protocoles entre plugins dans le kit (94d384cc)
- [x] Lot 12. Le calcul du nommage dans le kit (94d384cc)
- [x] Lot 13. La grammaire du kit de règles Figma dans le référentiel (94d384cc)
- [x] Lot 7. Des lois entre produits (94d384cc)

Parallélisme : le mainteneur a demandé plusieurs agents en parallèle pour ce
plan, au-delà des deux de `CLAUDE.md`. Deux tâches ne tournent en même temps
que si leurs listes de fichiers sont disjointes ; les tests qu'elles lancent
peuvent alors voir le travail en cours de l'autre, et seule la vérification de
clôture, lancée sur un arbre stable, fait foi. Les lots 15 et 16 sont
indépendants de tout. Après T17.1, les tâches T17.2 à T17.5 tournent ensemble.

## Lot 8. La fabrication et la vérification

Plan de fiabilité, section « Lot 8 ».

- [x] **T8.1** (b805f6a5) · `implementeur` · Construire un plugin après le kit
  - Fichiers : `package.json` (racine), un script nouveau dans `scripts/`
    (`construire-plugin.mjs`), `AGENTS.md` (section des commandes),
    `CONTRIBUTING.md`.
  - Faire : ajouter les scripts racine `build:plugin`, `galerie:plugin` et
    `test:paquet`, qui prennent le nom court d'un paquet, lancent
    `npm run build --workspace @ucm-kit/core`, puis la commande du paquet
    (`build`, `galerie` ou `test`). `build:plugin` et `galerie:plugin`
    admettent les quatre plugins (`palettes`, `explorateur`, `nomenclature`,
    `exporter`) : le socle, le moteur, la CLI et l'adaptateur n'ont ni script
    `build` ni script `galerie` dans leur `package.json`. `test:paquet` admet
    les quatre plugins, `socle`, `couleur`, `cli` et `adapter`. Un nom inconnu
    sort en erreur avec la liste des noms admis par la commande. Documenter
    les trois commandes.
  - Tests : un test racine lance le script avec un nom inconnu et vérifie le
    message ; vérifier à la main qu'un `npm run build:plugin -- palettes`
    reconstruit le kit puis Palettes.
  - Fini quand : les trois commandes marchent et sont documentées.
- [x] **T8.2** (b805f6a5) · `implementeur` · Refuser un kit compilé périmé
  - Fichiers : `scripts/construire-plugin.mjs`, un module
    `scripts/empreinte-du-kit.mjs`, un test racine nouveau
    `tests/kitCompileAJour.test.mjs`, le script `build` de
    `packages/kit/package.json` et celui de chaque plugin dans son
    `package.json`.
  - Faire : calculer une empreinte (SHA-256) des entrées que `tsc` compile :
    les fichiers des dossiers que liste `include` de
    `packages/kit/tsconfig.build.json` (aujourd'hui `src/format`,
    `src/emplois`, `src/referentiel`), ce fichier et `tsconfig.base.json`
    racine, qu'il étend. Lire `include` dans le fichier (il contient des
    commentaires) plutôt que de recopier la liste : le lot 11 y ajoutera
    `src/protocoles`. `src/lecteurs` n'entre pas dans l'empreinte : il se
    publie tel quel et ne passe pas par `dist`. Écrire l'empreinte dans
    `packages/kit/dist/.empreinte` à la fin du build du kit ; le build d'un
    plugin compare l'empreinte des sources à celle de `dist` et s'arrête avec
    un message qui donne la commande `npm run build:plugin -- <nom>`.
    `paquetPublie.test.mjs` doit rester vert (`files` publie `dist`).
  - Tests : dans un répertoire temporaire, copier une source, la modifier, et
    vérifier le refus ; une empreinte égale laisse passer.
  - Fini quand : un build de plugin sur un kit périmé échoue avec le message.
- [x] **T8.3** (b805f6a5) · `executant` · La vérification standard inclut les tests racine
  - Fichiers : `.claude/agents/verificateur.md`.
  - Faire : ajouter à la liste des vérifications standard : « depuis la
    racine, `npm test` lance aussi les tests de `tests/` ; après une
    modification de `packages/kit/src`, ne jamais s'en tenir aux tests des
    paquets ».
  - Fini quand : la phrase est dans le fichier.
- [x] **T8.4** (b805f6a5) · `implementeur` · Contrôle d'unicité étendu
  - Fichiers : `tests/referentielUnique.test.ts`,
    `packages/plugin-explorateur/src/contraste.ts`,
    `packages/kit/src/referentiel/contraste.ts`,
    `packages/kit/src/referentiel/vocabulaire.ts`.
  - Faire : (1) le seuil AAA, écrit `7` dans le corps de `niveauxWcag`, est
    nommé dans `contraste.ts` du kit à côté de `SEUILS_PAR_USAGE` ; `SEUILS = [3, 4.5, 7]` de l'explorateur est dérivé des
    seuils du kit. (2) Le test d'unicité détecte aussi une union de types de
    littéraux et un objet dont les clés recopient une famille contrôlée. (3)
    La différence entre `SIZE_VALUES` (qui accepte `tiny` et `huge`) et
    `REGISTRE_TAILLES` est nommée dans `vocabulaire.ts` par une constante de
    compatibilité, et un test vérifie que `SIZE_VALUES` vaut
    `REGISTRE_TAILLES` plus cette compatibilité.
  - Tests : le test d'unicité échoue sur une union recopiée ajoutée à titre
    d'essai, puis l'essai est retiré.
  - Fini quand : tests verts, aucune liste de seuils écrite hors du kit.
- [x] **T8.5** (b805f6a5) · `implementeur` · Documents en retard sur le code (C12)
  - Fichiers : `packages/kit/README.md`, `packages/plugin-socle/README.md`,
    `packages/plugin-explorateur/SPEC.md`,
    `packages/kit/src/referentiel/produits.ts`,
    `packages/kit/src/referentiel/recommandations.ts`, un test racine nouveau
    `tests/portesDocumentees.test.mjs`.
  - Faire : le README du kit décrit chaque porte de `exports`, dont
    `referentiel` ; le README du socle cite ses modules de nommage ; la SPEC
    de l'explorateur décrit les sept collections de `COLLECTIONS` ; `PRODUITS`
    dit que Palettes lit les règles de nommage et range son suivi ; le
    commentaire de tête de `recommandations.ts` dit qu'aucun produit ne le
    consomme encore. Le test refuse une clé de `exports` absente du README.
  - Fini quand : le test passe.
- [x] **Clôture du lot 8** (relecture, vérification, commit b805f6a5). Kit
  0.9.11, CLI 0.1.70, adaptateur 0.1.63 : sans montée de version,
  `versionSuitLeContenu` laissait la CI de `main` rouge pendant tout le
  lot 17. Seul le kit 0.9.11 est publié ; la CLI et l'adaptateur attendent la
  publication finale. Le lot 17 garde la version mineure `0.10.0`.

## Lot 17. Les nouveaux noms des couches UCM

Plan de fiabilité, section « Lot 17 », décision D8.

- [x] **T17.0** (0ccbff70) · `Explore` · Relevé des anciens noms
  - Faire : lister chaque occurrence de `color-brands`, `color-utilities`,
    `data-color-brands`, `FAMILLES_COLOR_BRANDS`, `FAMILLES_COLOR_UTILITIES`,
    `FAMILLES_LAYOUTS` et des identifiants `familles-color-brands`,
    `familles-color-utilities`, `familles-layouts` dans `packages/`, `tests/`, `scripts/`, `docs/format/`, `docs/guides/`,
    `AGENTS.md`, `CONCEPT.md`, `README.md`, hors `dist/` et `node_modules/`.
    Pour `layouts`, ne relever que les occurrences qui désignent la collection,
    et lister à part celles qui désignent le champ `layouts` des contrats.
    Rendre un tableau fichier, ligne, sens (collection, champ de contrat,
    texte).
  - Fini quand : le tableau est rendu à la conversation principale, qui
    l'attache aux tâches suivantes.
- [x] **T17.1** (0ccbff70) · `implementeur-exigeant` · Le référentiel prend les nouveaux noms
  - Entrée : le tableau de T17.0.
  - Fichiers : `packages/kit/src/referentiel/architecture.ts`,
    `packages/kit/src/referentiel/normalisation.ts`, les tests du kit qui
    citent ces noms.
  - Faire : `COLLECTIONS` devient `['components', 'theme', 'brands',
    'utility', 'primitives', 'layout', 'typography']` ; suivre dans
    `CIBLES_DES_COLLECTIONS`, `CIBLES_DES_COULEURS_DE_COMPOSANT`,
    `COLLECTIONS_SANS_PORTEE`, `FORMES_DES_CHEMINS`, les registres de familles
    (renommés `FAMILLES_BRANDS`, `FAMILLES_UTILITY` et `FAMILLES_LAYOUT`,
    identifiants `familles-brands`, `familles-utility` et `familles-layout`) et
    `AXES_DES_COLLECTIONS` (collection `brands`, attribut `data-brands` ; seul
    `architectureReferentiel.test.ts` le lit). Ajouter une table exportée
    `FORMES_ANCIENNES_DES_COLLECTIONS` (`color-brands` vers `brands`,
    `color-utilities` vers `utility`, `layouts` vers `layout`) ;
    `collectionUcmReconnue` la consulte après la forme courante.
  - Tests : `collectionUcmReconnue` rend `brands` pour `Brands`, `brands`,
    `BRANDS`, `color-brands`, `Color Brands`, `ColorBrands` ; `utility` pour
    `Utility` et `color-utilities` ; `layout` pour `Layout` et `layouts`.
  - Fini quand : tests du kit verts.
- [x] **T17.2** (0ccbff70) · `implementeur` · Nomenclature propose le nouveau nom
  - Fichiers : `packages/kit/src/referentiel/lexique.ts` (`proposer`),
    `packages/kit/tests/lexiqueReferentiel.test.ts`,
    `packages/plugin-nomenclature/tests/`, `packages/plugin-nomenclature/galerie/donnees.cjs`
    et `etats.cjs`.
  - Constat vérifié : les collections ne sont pas des termes de
    registre. `collectionUcmReconnue` (T17.1) les reconnaît, et `proposer`
    (`lexique.ts`, branche `collections`) rend l'identifiant en minuscules
    sans appliquer la convention `collections`. Sous une convention PascalCase,
    une sonde sur `normaliserLeLexique` rend `Primitives` → `primitives`,
    `Theme` → `theme`, `Layouts` → `layouts`, `Components` → `components` :
    le fichier du mainteneur, déjà en PascalCase, se verrait proposer le retour
    aux minuscules.
  - Faire : `proposer` écrit l'identifiant reconnu selon la convention
    `collections` (mots de l'identifiant découpés par `decouperSegment`, puis
    `motsAvecCasse` et `assembler`, comme pour un segment) ; aucune
    proposition quand ce nom écrit égale le nom du fichier. Avec les termes
    UCM, Nomenclature propose alors `color-brands` en `Brands` sous PascalCase,
    en `brands` sous minuscules et tirets. Mettre à jour les données de
    galerie qui citent les anciens noms.
  - Tests : sous PascalCase, `Primitives`, `Brands`, `Theme` restent sans
    proposition, `color-brands` devient `Brands`, `Layouts` devient `Layout` ;
    sous minuscules et tirets, `Color Brands` devient `brands` (le test
    existant « les collections inconnues restent inchangées… » attend
    aujourd'hui `color-brands`, il suit) ; `Brands` ne déclenche aucune
    question de collection (`questions.ts`, type `collection`).
  - Fini quand : tests du kit et de Nomenclature verts.
- [x] **T17.3** (0ccbff70) · `implementeur` · L'explorateur relit les anciennes associations
  - Fichiers : `packages/plugin-explorateur/src/integrations/profilUcm.ts`
    (`coucheRangee`), `src/ui/textes.ts`, `README.md`, `SPEC.md`, la galerie,
    les tests.
  - Faire : `coucheRangee` lit `color-brands` comme `brands`,
    `color-utilities` comme `utility`, `layouts` comme `layout`, en plus de
    `brand`. Les textes et documents suivent.
  - Tests : une préférence rangée sous un ancien nom se relit sous le nouveau.
  - Fini quand : tests de l'explorateur verts.
- [x] **T17.4** (0ccbff70) · `implementeur` · La CLI et l'attribut des marques
  - Fichiers : `packages/cli/src/tokens-css.mjs` (`attributsDesAxes`), les
    tests de la CLI.
  - Constat vérifié : la CLI n'écrit aucun nom de couche.
    L'attribut d'un axe sans clé `modes` est `attributDeMode(axe)`
    (`packages/kit/src/format/names.ts`), soit `data-` suivi du nom de l'axe,
    lui-même tiré du nom de la collection. Une collection `Brands` donne déjà
    l'axe `brands` et l'attribut `data-brands` : il n'y a pas de défaut à
    changer. En revanche, une clé `modes.color-brands` qui ne nomme plus aucun
    axe donne l'erreur « aucun axe du fichier de tokens ne porte ce nom ».
  - Faire : dans `attributsDesAxes`, une clé `modes.color-brands` est lue
    comme `modes.brands`, avec une note qui demande de la renommer,
    **seulement** quand aucun axe ne s'appelle `color-brands` et qu'un axe
    s'appelle `brands` ; de même pour `color-utilities` et `layouts`. Un
    fichier de tokens qui porte encore l'axe `color-brands` garde sa clé telle
    quelle. Les correspondances viennent de `FORMES_ANCIENNES_DES_COLLECTIONS`
    du kit (T17.1).
  - Tests : un axe `brands` sans clé donne `data-brands` ; ancienne clé relue
    avec sa note ; ancienne clé et axe `color-brands` : aucune note, aucune
    erreur ; les deux clés à la fois : la clé nouvelle l'emporte, une note le
    dit.
  - Fini quand : tests de la CLI verts.
- [x] **T17.5** (0ccbff70) · `implementeur` · Exporteur et Palettes
  - Fichiers : les tests de `packages/plugin-exporter/tests/` et de
    `packages/plugin-palettes/tests/` qui citent les anciens noms, les
    galeries et README de ces deux plugins.
  - Faire : suivre les nouveaux noms dans les fixtures et documents. Ajouter à
    l'exporteur un test : des collections `Brands`, `Utility`, `Layout`
    donnent les chemins `brands.*`, `utility.*`, `layout.*` ; une collection
    `color-brands` donne toujours `color-brands.*` (le chemin suit le nom du
    fichier).
  - Fini quand : tests des deux plugins verts.
- [x] **T17.6** (0ccbff70) · `executant` · Documents
  - Entrée : le tableau de T17.0, colonne « texte ».
  - Fichiers : `CONCEPT.md`, `AGENTS.md`, `docs/format/FORMAT.md`,
    `docs/format/CHANGELOG-FORMAT.md`, `docs/guides/*.md`,
    `docs/notes/Recherches/Archi Tokens Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html`.
  - Faire : remplacer `color-brands` par `brands`, `color-utilities` par
    `utility`, `data-color-brands` par `data-brands`, et `layouts` par
    `layout` **seulement** aux lignes que T17.0 classe « collection ».
  - Constat vérifié : seul `AGENTS.md` cite une couche par son ancien nom
    (carte de l'explorateur, invariants du profil). `CONCEPT.md`,
    `README.md`, `docs/guides/` n'en citent aucune ; `docs/format/FORMAT.md`
    cite `{layouts.stroke.ring}`, un chemin de token d'exemple, qui reste.
    `VUE-ILLUSTREE-MULTIMARQUES.html` reste aussi : elle affiche l'instantané
    d'export du fichier du mainteneur, qui porte les anciens noms, et ses notes
    sont indexées par nom de collection ; elle suivra la migration du fichier
    et un nouvel instantané. `AGENTS.md` ne décrit pas encore la frontière
    d'écriture de Palettes : le lot 14 l'écrit avec le refus.
  - Fini quand : `git grep` des anciens noms ne rend plus que les formes
    anciennes du référentiel, les lecteurs de transition et les tests qui les
    vérifient.
- [x] **T17.7** (0ccbff70) · `implementeur` · Le corpus et les vues suivent le référentiel
  - Constat de T17.1 : `extraireNoms` (`docs/references/design-systems/_outils/ucm.mjs`)
    lève « Collection UCM inconnue : color-brands » sur l'instantané
    `donnees-vue-illustree.js`, qui vient d'un export du fichier Figma du
    mainteneur et garde les anciens noms tant que le fichier n'est pas migré ;
    `ucm/registres.json` fige les anciens identifiants de registre ;
    `donnees-referentiel.js` est périmé.
  - Faire : `extraireNoms` accepte une forme ancienne ; régénérer le corpus
    (`node docs/references/design-systems/_outils/ucm.mjs`) et
    `npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel.ts"`.
  - Fini quand : `tests/corpusUcm.test.ts` et `tests/vueIllustree.test.ts` verts.
- [x] **T17.8** (0ccbff70) · Conversation principale · README du kit
  - Faire : écrire dans `packages/kit/README.md` le paragraphe « Nouveaux noms
    des couches » : ce qu'un repository consommateur voit à l'export suivant
    (chemins, variables CSS, attribut `data-brands`) et ce qu'il doit suivre.
- [x] **T17.P** (0ccbff70) · `executant` · Montée de version mineure
  - Faire : kit `0.10.0`, CLI et adaptateur au numéro suivant, pins de la CLI
    et de l'adaptateur sur `0.10.0`, versions documentées (`README.md` racine,
    READMEs des trois paquets, `docs/references/design-systems/ucm/sources.json`),
    puis `npm install --package-lock-only --ignore-scripts`. Modèle : le
    commit `cc9c78fe`.
- [x] **Clôture du lot 17** (0ccbff70 ; kit 0.10.0, non publié)

## Lot 1. L'explorateur reconnaît le thème quelle que soit son écriture

Plan de fiabilité, section « Lot 1 », décision D6.

- [x] **T1.0** (0ccbff70, conception/lot-1.md) · Conversation principale · **Conception**
  - Fixer dans `conception/lot-1.md` : la signature de `termeReconnu`, celle
    de la fonction du kit qui reconnaît une variable du thème par la fin de son
    nom (nom proposé `variableDuThemeReconnue`, dans `kit/src/emplois/`, à côté
    de `VARIABLES_DE_PALETTE` dans `dossiers.ts`), ce qu'elles rendent pour un
    nom inconnu, et la façon dont l'explorateur obtient les termes
    personnalisés de Nomenclature (lecture de la donnée partagée racine
    `ucm_architect` par `lireReglesDeNommage` du socle, en attendant le lot 12).
- [x] **T1.1** (42dd8719) · `implementeur` · `termeReconnu` et la grammaire
  - Entrée : `conception/lot-1.md`.
  - Fichiers : `packages/kit/src/referentiel/termes.ts`,
    `packages/kit/src/referentiel/architecture.ts` (`cheminConforme`), les
    tests du kit.
  - Faire : selon la note. `termeRetenu` ne change pas.
  - Tests : ceux du plan de fiabilité, lot 1, deux premiers points.
  - Fini quand : tests du kit verts.
- [x] **T1.2** (42dd8719) · `implementeur` · La reconnaissance des variables du thème
  - Entrée : `conception/lot-1.md`.
  - Fichiers : `packages/kit/src/emplois/dossiers.ts` (la liste),
    `packages/kit/src/referentiel/theme.ts` (la reconnaissance : `emplois`
    n'importe pas `referentiel`, qui porte `decouperSegment`),
    `packages/plugin-explorateur/src/integrations/palettes.ts`,
    `packages/plugin-explorateur/src/integrations/profilUcm.ts`
    (`VARIABLES_DU_THEME`, `variableDuNom`, `nuanceAttendue`), les tests.
  - Faire : la liste des variables du thème est dérivée dans le kit ;
    `profilUcm.ts` ne la construit plus ; `variableDuNom` et `nuanceAttendue`
    appellent la fonction du kit. Le nom affiché reste celui du fichier. Au
    passage, les unions `'light' | 'dark'` et `'soft' | 'vivid'` de
    l'explorateur (`integrations/palettes.ts` : `Intensite`, `Theme` ;
    `profilUcm.ts` : `nuanceAttendue`) et `ModeDuTheme` du kit
    (`emplois/dossiers.ts`) dérivent de `MODES` et `PROFILS` du référentiel.
  - Tests : un thème renommé selon chaque convention de `CONVENTIONS` donne
    les mêmes constats de portée et de nuance que le thème en minuscules.
  - Fini quand : tests du kit et de l'explorateur verts.
- [x] **T1.3** (42dd8719) · `implementeur` · Les termes personnalisés dans l'explorateur
  - Entrée : `conception/lot-1.md`.
  - Fichiers : `packages/plugin-explorateur/src/lecture.ts` (relevé),
    `src/integrations/profilUcm.ts`, les tests.
  - Faire : le relevé porte les règles de nommage lues ; un mode `Jour` déclaré
    comme `light` est reconnu pour le contrôle de nuance.
  - Tests : mode `Jour` avec règle, puis sans règle (sans constat ici ; la
    limite affichée vient au lot 2).
  - Fini quand : tests verts ; l'explorateur n'écrit rien dans le document
    (`tests/` de l'explorateur sur la lecture seule verts).
- [x] **Clôture du lot 1** (42dd8719 ; kit 0.10.1, non publié)

## Lot 2. Une comparaison qui n'a pas pu se faire le dit

Plan de fiabilité, section « Lot 2 ». Sondes de Codex :
`%TEMP%/ucm-fiabilite-audit-20261020/sondes.mts` (noms `C02-courbe`,
`espace-ignore`, `unite-ignoree`, `duree-unite-ignoree`, `mode-non-lu`,
`theme-mode-inconnu`).

- [x] **T2.0** (0ccbff70, conception/lot-2.md) · Conversation principale · **Conception**
  - Fixer dans `conception/lot-2.md` : le type du résultat d'une comparaison
    (`egal`, `different`, `non-comparable` et sa cause), la signature du
    comparateur DTCG du kit (dans `packages/kit/src/lecteurs/`, réexporté par
    `navigateur.mjs`), la règle par `$type` (couleur avec espace, dimension et
    unités, durée et conversion `s`/`ms`, courbe, graisse, forme inconnue), le
    type du résultat d'un contrôle du profil (faits, différences, impossibles
    avec cause), et les textes d'écran.
  - Écrire les textes d'écran avec la skill `rediger-diagnostics-ucm`.
- [x] **T2.1** (42dd8719) · `implementeur` · Le comparateur DTCG du kit
  - Entrée : `conception/lot-2.md`.
  - Fichiers : un module nouveau dans `packages/kit/src/lecteurs/`,
    `navigateur.mjs`, `index.mjs` et leurs déclarations `.d.mts`, les tests du
    kit, `porteNavigateur.test.mjs`.
  - Tests : chaque règle de la note ; une forme inconnue rend `non-comparable`,
    jamais `egal`.
  - Fini quand : tests du kit verts.
- [x] **T2.2** (94d384cc) · `implementeur` · L'explorateur garde l'espace de couleur
  - Fichiers : `packages/plugin-explorateur/src/lecture.ts` (`Releve`,
    `PortDeLecture`), `src/modele.ts`, `src/contraste.ts`, les copies CSS, les
    tests.
  - Faire : le relevé porte le profil colorimétrique du document
    (`figma.root.documentColorProfile`, comme Palettes dans `hexaLu`) ; le
    contraste et les copies l'emploient.
  - Tests : mêmes canaux en sRGB et en Display P3.
  - Fini quand : tests verts.
- [x] **T2.3** (94d384cc ; un rôle inconnu est une limite, selon conception/lot-2.md) · `implementeur-exigeant` · Comparaisons et contrôles de l'explorateur
  - Entrée : `conception/lot-2.md`, résultats de T2.1 et T2.2.
  - Fichiers : `packages/plugin-explorateur/src/integrations/contrats.ts`
    (`valeurDtcg`, `memeValeur`, `ecartsAvecLExport`),
    `src/integrations/profilUcm.ts`, les tests.
  - Faire : `valeurDtcg` reçoit le `$type` ; la comparaison passe par le kit ;
    un mode sans valeur et un mode non associé donnent un contrôle impossible ;
    un rôle inconnu donne un constat d'information, sauf `identity`.
  - Tests : les six sondes de Codex deviennent des tests ; courbes identiques.
  - Fini quand : tests verts.
- [x] **T2.4** (94d384cc) · `implementeur` · L'écran de l'inspecteur
  - Entrée : textes de `conception/lot-2.md`.
  - Fichiers : `packages/plugin-explorateur/src/ui/vues/integrations.ts`
    (`sectionContratsDeLInspecteur`), `src/ui/textes.ts`, la galerie de
    l'explorateur et ses tests.
  - Faire : le texte d'égalité ne s'affiche que si chaque mode annoncé a été
    comparé ; chaque limite a son texte. Ajouter un état de galerie par limite.
  - Tests : le rendu réel de l'inspecteur dans chaque cas, pas seulement le
    modèle.
  - Fini quand : tests verts ; la conversation principale relit les états de
    galerie.
- [x] **T2.5** (94d384cc) · `implementeur` · Les déclarations des lecteurs suivent le code
  - Constat de T2.1 : `packages/kit/src/lecteurs/index.d.mts` déclare
    `porteLaTableDesEmplois`, `constatsDesEmplois`, `sectionEmplois` et
    `resumeTerminalEmplois`, qu'aucun module n'exporte plus ; `index.mjs`
    exporte `constatsDesContrastes`, `sectionContrastes` et
    `resumeTerminalContrastes`. `navigateur.d.mts` republie les mêmes noms.
  - Fichiers : `index.d.mts`, `navigateur.d.mts`, un test du kit qui compare les
    noms exportés de `index.mjs` et `navigateur.mjs` aux noms déclarés.
  - Fini quand : le test passe, et il échoue sur un nom déclaré sans export.
- [x] **T2.6** (94d384cc) · `implementeur` · L'affichage suit l'espace, et les documents suivent le code
  - Constat de T2.4 : en Display P3, le tableau et `texteDeValeur` affichent
    les canaux bruts comme un hexadécimal sRGB ; la section du profil de
    l'inspecteur n'affiche pas les limites de la variable ; la SPEC de
    l'explorateur et `AGENTS.md` ne décrivent ni l'espace ni les limites.
  - Faire : l'affichage passe par la conversion de la copie ; la section du
    profil de l'inspecteur montre les limites de la variable ; les deux
    documents décrivent l'état actuel.
  - Fini quand : tests, galerie et `inventaireInvariants` verts.
- [x] **Clôture du lot 2** (clôture commune, 94d384cc ; kit 0.11.0)

## Lot 3. Une couleur de composant vise le thème

Plan de fiabilité, section « Lot 3 ».

- [x] **T3.1** (94d384cc) · `implementeur` · Les cibles selon la nature
  - Fichiers : `packages/kit/src/referentiel/architecture.ts`,
    `packages/plugin-explorateur/src/integrations/profilUcm.ts`
    (`controlerLeProfil`, `CIBLES_DES_COUCHES`), les tests des deux paquets.
  - Faire : exporter `ciblesAdmises(collection, nature)` avec
    `nature` parmi `couleur`, `dimension`, `typographie` ; pour `components`
    et `couleur`, elle rend `CIBLES_DES_COULEURS_DE_COMPOSANT`.
    `controlerLeProfil` l'appelle pour les variables `COLOR`. Une cible sans
    couche associée rend un contrôle impossible (type du lot 2).
  - Tests : la fonction du kit pour les trois natures ; dans l'explorateur, une
    couleur de composant vers `theme` acceptée, vers `layout`, `typography` ou
    `primitives` signalée.
  - Fini quand : la sonde `C01` de Codex est un test qui passe.
- [x] **Clôture du lot 3** (clôture commune, 94d384cc ; kit 0.11.0)

## Lot 5. Palettes annonce ce qu'il écrit, sur un lot entier

Plan de fiabilité, section « Lot 5 », décision D2. Sondes de Codex :
`lot5-collision`, `collision-double-permissif`, `suivi-refuse`,
`destination-casse`.

- [x] **T5.0** (42dd8719) · Conversation principale · **Conception**
  - Fixer dans `conception/lot-5.md` : la forme du plan d'un lot entier
    (`planDuLot` : noms finaux, réservations, refus, créations, remplacements,
    renommages exécutés, par palette), où il vit (`packages/plugin-palettes/src/variables/`),
    comment `tokensDeLaPalette` (`gestion.ts`) et `ecrireLesVariables`
    (`ecriture/variables.ts`) le consomment, les trois listes de l'état des
    tokens (renommages exécutés, écarts laissés à Nomenclature, noms du plan),
    la stratégie de restauration de F06, et les textes de l'encart.
- [x] **T5.1** (94d384cc ; double permissif, 4 tests verts) · `implementeur` · Un double de Figma qui accepte les doublons
  - Fichiers : `packages/plugin-palettes/tests/figmaDeTest.ts`.
  - Faire : une option du `FauxFigma` qui accepte deux variables de même nom,
    comme le guide de Figma l'indique possible ; l'option par défaut ne change
    pas.
  - Fini quand : les tests existants passent inchangés.
- [x] **T5.2** (94d384cc) · `implementeur-exigeant` · Le plan du lot entier
  - Entrée : `conception/lot-5.md`.
  - Fichiers : ceux que la note désigne dans `packages/plugin-palettes/src/variables/`
    et `src/ecriture/variables.ts`, les tests.
  - Faire : `planDuLot` pur ; l'écriture le consomme et revalide l'inventaire
    avant la première mutation ; le contrôle des noms pris voit les créations
    des palettes précédentes du même geste.
  - Tests : `Ocean-Blue` et `OceanBlue` sous des groupes en PascalCase, dans les
    deux ordres, en destination et en reprise, avec le double permissif ; un
    occupant tiers.
  - Fini quand : le refus se produit avant toute création de la palette
    concernée, et l'annonce le dit.
- [x] **T5.3** (94d384cc) · `implementeur-exigeant` · Récupérer un rangement refusé (F06)
  - Entrée : `conception/lot-5.md`.
  - Fichiers : `packages/plugin-palettes/src/ecriture/variables.ts`, les tests.
  - Faire : la stratégie de la note : préparer les restaurations avant la
    première mutation ; si le rangement du suivi échoue, défaire et rendre une
    issue qui décrit ce qui reste ; toute mutation conservée est close par
    `commitUndo`.
  - Tests : refus injecté à la création, à une valeur, au marqueur d'une
    variable, au rangement du suivi, à une restauration.
  - Fini quand : aucune variable créée n'est laissée sans suivi ni issue qui la
    décrit.
- [x] **T5.4** (94d384cc) · `implementeur` · L'encart annonce les renommages exécutés
  - Entrée : textes de `conception/lot-5.md`.
  - Fichiers : `packages/plugin-palettes/src/variables/etat.ts`,
    `src/ui/ongletGestion.ts`, `src/i18n/fr.ts`, `src/i18n/en.ts`, la galerie
    et ses tests (`tests/textes.test.ts`, `tests/i18n.test.ts`).
  - Constat vérifié : les deux encarts d'une reprise
    (`encartDeLEcriture`, `encartDuRemplacement`) annoncent déjà ses
    renommages par `paragrapheDuRenommage` (`ongletGestion.ts`), quelle que
    soit la suite ; `aRenommer` n'est rempli que pour une reprise
    (`variables/etat.ts`). Ce qui manque : la ligne « Tokens Figma » d'une
    reprise (`ligneDesTokens`) ne nomme les renommages que si rien d'autre ne
    change, car elle choisit un seul écart (créations, puis couleurs, puis
    noms occupés, puis renommages).
  - Faire : la ligne d'une reprise nomme aussi les renommages quand d'autres
    écarts existent ; l'encart garde son paragraphe, et le nombre et l'exemple
    qu'il cite viennent du plan du lot (T5.2). Une destination n'annonce aucun
    renommage (D2).
  - Tests : une reprise, couleur changée et nom à rattraper : l'encart annonce,
    l'écriture renomme, l'état suivant est « à jour ». Une destination dans le
    même cas : aucune annonce de renommage, aucun renommage.
  - Fini quand : tests verts ; la conversation principale relit les états de
    galerie de l'encart.
- [x] **Clôture du lot 5** (clôture commune, 94d384cc)

## Lot 4. Les protections de Nomenclature tiennent et s'expliquent

Plan de fiabilité, section « Lot 4 », décision D4. Sondes de Codex :
`protection-lecture-refusee`, `suivi-futur`, `marque-ouverture`.

- [x] **T4.0** (42dd8719) · Conversation principale · **Conception et textes**
  - Fixer dans `conception/lot-4.md` : le résultat de lecture du suivi
    (absent, lu, refusé), la règle de suspension d'un renommage indécidable, et
    les textes d'explication, écrits avec la skill `rediger-diagnostics-ucm`.
  - Relire d'abord ce que l'interface de Nomenclature dit des variables
    protégées, dans chaque état de sa galerie. Constat vérifié : « À
    appliquer » montre le compte et une seule explication,
    `nomsProtegesExplication` (« Ouvrez UCM Palettes une fois dans ce
    fichier… », `ui/aAppliquer.ts`), juste quand la marque manque et fausse
    quand la marque est posée sans règles rangées ou que la lecture est
    refusée ; la Configuration écrit « palettes protégées » sans raison
    (`ui/configuration.ts`).
- [x] **T4.1** (94d384cc ; lecture, suspension, écriture et annulation ; 137 tests verts) · `implementeur-exigeant` · Une lecture refusée garde la protection
  - Entrée : `conception/lot-4.md`.
  - Fichiers : `packages/plugin-nomenclature/src/lectureFigma.ts`
    (`lecteurDeVariablesFigma`), `packages/plugin-socle/src/inventaireDeNoms.ts`,
    `packages/plugin-nomenclature/src/session.ts` et `ecriture.ts`, les tests.
  - Faire : un échec de lecture du suivi est distinct d'une absence ; le
    renommage des variables dont la protection est indécidable est suspendu et
    refusé au moment d'écrire.
  - Tests : reprise sans marqueur individuel, lecture racine refusée, puis
    rétablie.
  - Fini quand : tests verts.
- [x] **T4.2** (94d384cc) · `implementeur` · Nomenclature explique la protection
  - Entrée : textes de `conception/lot-4.md`.
  - Fichiers : `packages/plugin-nomenclature/src/ui/textes.ts` et les vues qui
    affichent le compte « protégés », la galerie et ses tests.
  - Faire : la raison et le geste s'affichent dans chaque cas (marque absente,
    marque sans règles rangées, lecture refusée) ; comptes et explications
    désignent la même cause.
  - Tests : un état de galerie et un test par cas ; marque absente, courante,
    invalide, future ; règles absentes, rangées, illisibles.
  - Fini quand : tests verts ; la conversation principale relit les états.
- [x] **T4.3** (94d384cc ; exception et risque documentés) · Conversation principale · L'exception de la marque dans `AGENTS.md`
  - Faire : écrire dans `AGENTS.md`, groupe « écriture dans le document »,
    l'exception de D4 et le risque d'une ancienne version de Palettes.
- [x] **T4.4** (94d384cc) · `implementeur` · Une annulation non vérifiée le dit
  - Constat de T4.2 : une annulation partielle dont des lignes sont sautées en
    `non-verifiee` affiche « … ont changé depuis le renommage », faux pour ces
    lignes, dans l'annonce et dans la Configuration.
  - Faire : un texte propre aux lignes non vérifiées, le même dans l'annonce et
    dans l'Historique ; `annonceDUneAnnulation` ne les compte plus dans
    `autres`.
  - Fini quand : tests et galerie de Nomenclature verts.
- [x] **Clôture du lot 4** (clôture commune, 94d384cc)

## Lot 6. La grammaire décrit toutes les palettes du profil UCM

Plan de fiabilité, section « Lot 6 », décisions D1 et D7. Sonde de Codex :
`matrice-grammaire`.

- [x] **T6.0** (42dd8719) · Conversation principale · **Conception**
  - Fixer dans `conception/lot-6.md` : le nom et la place des numéros de
    palette (`NUMEROS_DE_PALETTE` dans `vocabulaire.ts`), la forme des chemins
    de `primitives` selon que les thèmes sont en modes, et le type de la
    reconnaissance structurée (forme reconnue, rôle de chaque segment) dont
    `cheminConforme` dérive son booléen.
- [x] **T6.1** (94d384cc) · `implementeur-exigeant` · Les numéros et les formes
  - Entrée : `conception/lot-6.md`.
  - Fichiers : `packages/kit/src/referentiel/vocabulaire.ts`,
    `architecture.ts`, `packages/couleur/src/nuances.ts` (`PREREGLAGES[13]`
    lit `1000` et `1050` du kit), les tests du kit et du moteur. Au passage,
    `IntensiteDuChemin` et `ThemeDuChemin`
    (`packages/plugin-palettes/src/variables/detection.ts`), `intensite` du
    suivi (`variables/suivi.ts`) et l'enregistrement `light`/`dark` de
    `packages/couleur/src/recette.ts` dérivent de `MODES` et `PROFILS` du
    référentiel. Puis `tests/referentielUnique.test.ts` cesse d'exclure les
    modes et les profils des unions et des objets ; ses exceptions restantes
    sont motivées.
  - Tests : la matrice de Codex (une et deux intensités, 11 et 13 nuances,
    thèmes dans le chemin et en modes) rend zéro refus et la bonne forme ;
    `color/Ocean/soft/50` en modes est reconnu comme intensité, pas comme
    mode ; une sortie vers un groupe libre n'est pas déclarée fautive.
  - Fini quand : tests du kit et du moteur verts.
- [x] **T6.2** (sans diff : planche et vue déjà à jour) · `executant` · Planche et vue
  - Faire : `npm run planche --workspace ucm-couleur`, puis
    `npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel.ts"` ;
    rendre la liste des fichiers changés.
- [x] **Clôture du lot 6** (clôture commune, 94d384cc ; kit 0.11.0)

## Lot 14. La destination de Palettes en full UCM

Plan de fiabilité, section « Lot 14 », décision D5. Sonde de Codex :
`destination-theme`.

- [x] **T14.0** (conception/lot-14.md, 94d384cc) · Conversation principale · **Conception**
  - Fixer dans `conception/lot-14.md` : la clé partagée de l'interrupteur full
    UCM (espace, nom, forme `{ version, … }`, classement absent, courant,
    illisible, futur), son déclarant dans le kit, sa place dans la
    Configuration de Nomenclature (onglet, libellé, phrase d'aide, au format de
    `createInterrupteur` comme l'exporteur), son entrée dans l'Historique de la
    Configuration, sa lecture par Palettes, et le message de refus écrit avec
    la skill `rediger-diagnostics-ucm`.
- [x] **T14.2** (94d384cc ; tests du protocole et des trois états de galerie verts) · `implementeur` · L'interrupteur full UCM de Nomenclature
  - Entrée : `conception/lot-14.md`.
  - Fichiers : ceux que la note désigne dans `packages/plugin-nomenclature/`
    (Configuration, textes, historique, protocole, galerie) et le kit.
  - Fini quand : tests et galerie de Nomenclature verts ; la conversation
    principale relit l'état de galerie.
- [x] **T14.1** (94d384cc ; 41 tests dédiés et 38 tests d’écriture verts) · `implementeur` · Refuser une couche interdite (après T14.2)
  - Fichiers : `packages/kit/src/referentiel/architecture.ts` (exporter la
    liste des couches où Palettes n'écrit pas : `theme`, `brands`, `utility`),
    `packages/plugin-palettes/src/variables/destination.ts`
    (`validerLaDestination`), `src/ecriture/variables.ts`
    (`rangerLaDestination`, `ecrireLesVariables`), `src/i18n/fr.ts`,
    `src/i18n/en.ts`, les tests, et `AGENTS.md` (invariants de Palettes : la
    frontière « jamais dans `theme`, `brands` ni `utility` » en full UCM, que
    le fichier ne décrit pas encore).
  - Faire : quand l'interrupteur full UCM est activé et que
    `collectionUcmReconnue` reconnaît la collection visée comme
    une couche interdite, le rangement et l'écriture refusent avant toute
    mutation. Une collection non reconnue reste admise.
  - Tests : une collection par couche ; une collection libre ; le refus avant
    mutation.
  - Fini quand : tests verts.
- [x] **Clôture du lot 14** (clôture commune, 94d384cc ; kit 0.11.0). Les trois états
  de galerie de Nomenclature sont testés dans le DOM ; leur relecture visuelle
  reste à faire.

## Lot 15. La CLI distingue une erreur de Git d'un changement

Plan de fiabilité, section « Lot 15 ». Sonde de Codex : `diff-echec128`.

- [x] **T15.1** (0ccbff70) · `implementeur` · Lire le statut de `git diff --quiet`
  - Fichiers : `packages/cli/src/check.mjs` (`releveDuDiff`), les tests de la
    CLI.
  - Faire : le premier appel (`git diff --name-only`) traite déjà tout échec
    comme une erreur de relevé ; seul le second (`git diff --quiet`) change.
    Pour lui, seul le statut 1 vaut « différence » ; tout autre statut et un
    échec de lancement rendent un échec de relevé, affiché par le message
    terminal existant.
  - Tests : statuts 0, 1, 128 et erreur de lancement, sur chacun des deux
    appels à Git.
  - Fini quand : tests de la CLI verts.
- [x] **Clôture du lot 15** (0ccbff70 ; CLI 0.1.71, non publiée)

## Lot 16. L'adaptateur TypeScript refuse un type incompatible

Plan de fiabilité, section « Lot 16 ». Sonde de Codex : `enum-nombre`.

- [x] **T16.1** (0ccbff70) · `implementeur` · Trois cas de parité
  - Fichiers : `packages/adapter-typescript/src/parite.mjs`
    (`ecartsDeParite`), les tests de l'adaptateur.
  - Faire : type incompatible (écart), type plus large et compatible
    (accepté), analyse impossible (limite affichée).
  - Tests : enum contre `number`, `boolean`, `string`, union plus large, alias
    non résolu.
  - Fini quand : tests de l'adaptateur verts.
- [x] **T16.2** (0ccbff70) · `implementeur` · Le kit explique les deux cas
  - Constat de T16.1 : `detailsDeLEcart` (`kit/src/lecteurs/diagnostic-parite.mjs`)
    écrit « vaut oui ou non dans Figma » pour tout type incorrect, faux pour
    un enum ; la limite `typesNonAnalyses` ne s'affiche nulle part.
  - Fichiers : `packages/kit/src/lecteurs/diagnostic-parite.mjs`,
    `controle-repository.mjs`, leurs tests.
  - Faire : un texte par `attendu` (`boolean`, `enum`, autre) ; la limite
    s'ajoute à la ligne de terminal de l'état du code, là où
    `implementationNonLue` se dit (« …, sauf `tone` : type non résolu par
    l'adaptateur »), sans avertissement ni compte.
  - Fini quand : tests du kit, de l'adaptateur et de la CLI verts.
- [x] **Clôture du lot 16** (0ccbff70 ; adaptateur 0.1.64, non publié)

## Lot 9. Les chemins de tokens et les axes dans le kit

Plan de fiabilité, sections « Le principe des lots 9 à 13 » et « Lot 9 ».

- [x] **T9.1** (94d384cc ; 35 tests des chemins et comparaisons verts) · `implementeur-exigeant` · Les chemins dans `core/format`
  - Fichiers : `packages/kit/src/format/names.ts` (ou un module nouveau publié
    par `format/index.ts`), `packages/plugin-socle/src/cheminsDeTokens.ts`
    (réexport temporaire), et les clients relevés : `plugin-exporter/src/variables.ts`
    (qui réexporte `joinTokenPath` et `prefixeDeCollection` pour ses tests),
    `plugin-explorateur/src/integrations/contrats.ts` et
    `plugin-explorateur/tests/contrats.test.ts`,
    `plugin-palettes/src/variables/noms.ts` (`cheminCitable`),
    `plugin-socle/src/cheminsPublies.ts`, `plugin-socle/README.md`.
    Nomenclature n'importe pas ce module directement.
  - Faire : déplacer `cheminCitable`, `prefixeDeCollection`, `joinTokenPath` ;
    migrer chaque client ; retirer le réexport.
  - Tests : les tests existants passent sans changement d'attente.
  - Fini quand : `git grep cheminsDeTokens` ne rend plus rien hors de
    l'historique.
- [x] **T9.2** (conception/lot-9.md, 94d384cc) · Conversation principale · **Conception** des axes
  - Fixer dans `conception/lot-9.md` la fonction unique des axes et de leurs
    collisions, sur un inventaire portable, à partir de `axesDesCollections`
    (`plugin-exporter/src/tokens/exportTokens.ts`), que le socle reproduit
    sans l'importer par `axesPrevus` et `axesDeLExport`
    (`plugin-socle/src/cheminsPublies.ts`), et de leurs différences relevées
    par `tests/axesDeModes.test.ts`.
- [x] **T9.3** (94d384cc) · `implementeur-exigeant` · Une seule décision des axes
  - Entrée : `conception/lot-9.md`.
  - Fichiers : le kit, `cheminsPublies.ts`, `exportTokens.ts`,
    `tests/axesDeModes.test.ts`.
  - Tests : les sorties de l'exporteur identiques octet pour octet sur ses
    tests ; `axesDeModes.test.ts` teste la fonction unique.
  - Fini quand : une seule implémentation.
- [x] **Clôture du lot 9** (clôture commune, 94d384cc ; kit 0.11.0)

## Lot 10. Les rôles de rendu dans le kit

Plan de fiabilité, section « Lot 10 ».

- [x] **T10.1** (94d384cc) · `implementeur-exigeant` · La table des rôles
  - Fichiers : un module nouveau dans `packages/kit/src/format/`,
    `packages/plugin-exporter/src/contract/semantics.ts`
    (`defaultRenderingSemantics`, `renderableRoles`, `roleKind`),
    `packages/kit/src/lecteurs/diagnostic-contrastes.mjs`
    (`ROLES_DE_PEINTURE`, `ROLES_DE_CONTOUR`), les tests.
  - Faire : la table (identifiant, nature, propriétés CSS, repli) vit dans le
    kit ; l'exporteur et le diagnostic en dérivent ; un contrat ancien se lit
    avec la table qu'il porte.
  - Tests : contrats des tests de l'exporteur identiques octet pour octet ; un
    rôle sans nature fait échouer un test.
  - Fini quand : aucune liste de rôles hors de la table.
- [x] **Clôture du lot 10** (clôture commune, 94d384cc ; kit 0.11.0)

## Lot 11. Les protocoles entre plugins dans le kit

Plan de fiabilité, section « Lot 11 », et section « Les données partagées, par
adresse » de la revue de Codex.

- [x] **T11.0** (conception/lot-11.md, 94d384cc) · Conversation principale · **Conception**
  - Fixer dans `conception/lot-11.md` : l'arborescence de
    `packages/kit/src/protocoles/` (modules `palettes`, `nommage`,
    `regles-usage`, `index.ts`), l'entrée `./protocoles` de `exports`, le type
    commun du classement d'un contenu lu (absent, illisible, refusé, ancien,
    courant, futur), et pour la recette la frontière entre le lecteur du kit et
    les migrations qui restent dans `ucm-couleur`.
- [x] **T11.1** (94d384cc) · `implementeur` · La porte et le classement
  - Entrée : `conception/lot-11.md`.
  - Fichiers : `packages/kit/src/protocoles/`, `packages/kit/package.json`,
    `packages/kit/tests/paquetPublie.test.mjs`, `porteNavigateur.test.mjs`,
    `packages/kit/README.md`, `packages/kit/src/referentiel/produits.ts`.
  - Fini quand : la porte s'importe dans Node et dans la porte navigateur.
- [x] **T11.2** (94d384cc) · `implementeur-exigeant` · Suivi et marque
  - Fichiers : le module `palettes`, `packages/plugin-palettes/src/variables/suivi.ts`
    (`lireLeSuivi`), `src/ecriture/marque.ts`,
    `packages/plugin-socle/src/inventaireDeNoms.ts`
    (`variablesSuiviesParPalettes`, `marqueDeNommageLue`), les tests.
  - Faire : deux lecteurs nommés du suivi (lecture complète, relevé
    conservateur), jamais fusionnés ; la marque et son lecteur ; aucune lecture
    n'écrit.
  - Tests : octets du producteur lus par chaque lecteur ; absence, JSON
    invalide, lecture refusée, versions ancienne, courante, future.
  - Fini quand : tests verts, sorties de Palettes identiques.
- [x] **T11.3** (94d384cc ; `PREMIER_FORMAT_LISIBLE` n'existe plus que dans le kit) · `implementeur-exigeant` · La recette
  - Entrée : `conception/lot-11.md`.
  - Fichiers : le module `palettes`, `packages/couleur/src/recette.ts`
    (`classerRecette`), l'explorateur et Palettes qui la lisent, les tests.
  - Faire : le modèle d'échange et le classement passent dans le kit ; les
    migrations qui calculent restent dans `ucm-couleur` au-dessus du lecteur.
  - Tests : les tests de la recette passent sans changement d'attente.
  - Fini quand : `ucm-couleur` ne porte plus que le calcul et ses migrations.
- [x] **Clôture du lot 11** (clôture commune, 94d384cc ; kit 0.11.0)

## Lot 12. Le calcul du nommage dans le kit

Plan de fiabilité, section « Lot 12 ».

- [x] **T12.0** (conception/lot-12.md, 94d384cc) · Conversation principale · **Conception**
  - Fixer dans `conception/lot-12.md` : ce qui passe dans le module `nommage`
    (forme des règles, constructeurs de clés, lecture versionnée) et dans le
    kit (inventaire portable, `estProtegee`, `palettesLibres`,
    `nomsSelonLesRegles`), et ce qui reste au socle (`inventaireDeLectures`,
    ports de lecture).
- [x] **T12.1** (94d384cc) · `implementeur-exigeant` · Le protocole des règles
  - Fichiers : le module `nommage`, `packages/plugin-socle/src/reglesDeNommage.ts`,
    `packages/plugin-nomenclature/src/regles.ts` (`cleTerme`, `cleEcart`,
    `cleOrdinaire`), `packages/plugin-nomenclature/src/projection.ts`
    (`cleDeTerme`, `estTerme`, et les clés `terme:` qu'il compose : mots en
    minuscules joints par `-`, là où `cleTerme` les joint par une espace ; la
    note T12.0 dit si ce sont les mêmes clés), les tests.
  - Faire : une seule définition des préfixes `terme:`, `ecart:`,
    `ordinaire:`, employée par Nomenclature pour écrire et par le kit pour
    lire ; une entrée de version future est classée, jamais ignorée en silence.
  - Tests : octets sérialisés par Nomenclature lus par le kit.
- [x] **T12.2** (94d384cc ; Nomenclature refuse aussi l'annulation et les gestes sur les règles quand une entrée est future ; texte en français seulement, Nomenclature n'a pas de catalogue anglais) · `implementeur-exigeant` · Le calcul
  - Fichiers : le kit, `packages/plugin-socle/src/nomsSelonLesRegles.ts`,
    `inventaireDeNoms.ts`, `packages/plugin-palettes/src/variables/nommeur.ts`,
    `packages/plugin-nomenclature/src/session.ts`, `ecriture.ts`, l'explorateur
    (lecture de T1.3).
  - Tests : idempotence, remplacements personnalisés, exclusions, collisions,
    protection ; `tests/nomsDePalettes.test.ts` et
    `packages/plugin-nomenclature/tests/nomsDePalettes.test.ts` sans changement
    d'attente.
  - Fini quand : Palettes et Nomenclature appellent la même fonction du kit.
- [x] **Clôture du lot 12** (clôture commune, 94d384cc ; kit 0.11.0)

## Lot 13. La grammaire du kit de règles Figma dans le référentiel

Plan de fiabilité, section « Lot 13 ».

- [x] **T13.0** (conception/lot-13.md, 94d384cc) · Conversation principale · **Conception**
  - Fixer dans `conception/lot-13.md` : la grammaire des maîtres (noms,
    calques, tags requis, marqueur), la forme du relevé portable, la signature
    du validateur et le numéro de compatibilité du modèle.
- [x] **T13.1** (94d384cc ; le numéro de version du kit est retiré à la demande du mainteneur, au commit qui suit a021ea16) · `implementeur-exigeant` · Grammaire et validateur
  - Fichiers : `packages/kit/src/referentiel/` (module nouveau
    `kit-de-regles.ts` ; le kit de règles ne range aucune donnée partagée et
    n'a pas de module dans `protocoles`),
    `packages/plugin-exporter/src/contract/extractRules.ts`,
    `src/template/modele.ts`, `src/template/sources.ts`,
    `src/contract/parsers.ts` (`isDisabledStateValue` si `modele.ts` en a
    besoin), les tests.
  - Faire : les formes compactées sont dérivées ; `template/modele.ts` ne
    dépend plus que du kit ; une instance remplie n'est jamais modifiée.
  - Tests : chaque tag et calque ; instance vierge et remplie ; sorties de
    l'exporteur identiques.
- [x] **T13.2** (94d384cc) · `implementeur` · Le guide tenu par un test
  - Fichiers : `docs/guides/KIT-DE-REGLES.md`, un test racine.
  - Faire : le test compare la liste des calques et tags du guide à la
    grammaire.
- [x] **Clôture du lot 13** (clôture commune, 94d384cc ; kit 0.11.0)

## Lot 7. Des lois entre produits

Plan de fiabilité, section « Lot 7 ».

- [x] **T7.0** (conception/lot-7.md, 94d384cc) · Conversation principale · **Conception**
  - Fixer dans `conception/lot-7.md` : la matrice (conventions, formes,
    liaisons), les fabriques de fichiers de test, et pour la loi 3 la fonction
    pure d'annonce que chaque écran de Palettes appelle (à extraire si elle
    n'existe pas).
- [x] **T7.1** (94d384cc ; diagonale de trois formes et une quatrième pour la conversion, toutes les lois vertes ; elles ont révélé qu'une conversion aux thèmes en modes gardait les noms bruts, corrigé dans `nommerLePlan`) · `implementeur-exigeant` · Les lois
  - Entrée : `conception/lot-7.md`.
  - Fichiers : `tests/loisEntreProduits.test.ts`, les extractions de
    fonctions d'annonce dans `packages/plugin-palettes/src/ui/` désignées par
    la note.
  - Faire : les huit lois du plan de fiabilité, sur le double de Figma qui
    accepte les doublons.
  - Fini quand : la suite passe.
- [x] **T7.2** (94d384cc ; défauts reproduits à la main : 170a6d79 → loi 1 sur la reprise, c93bff20 → loi 3 conversion, 7c673dac → loi 4 nom pris en reprise) · `implementeur` · Preuve par les mutants
  - Faire : retirer une à une les corrections de 170a6d79, c93bff20 et
    7c673dac dans une copie de travail ; relever la loi qui échoue pour
    chacune ; tout remettre. Rendre le tableau correction, loi rouge, message.
  - Fini quand : chaque correction retirée fait échouer une loi nommée.
- [x] **Clôture du lot 7** (clôture commune, 94d384cc)
