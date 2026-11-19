# Sélection des tokens et sortie Style Dictionary dans UCM Exporter

Recherche proposée, non implémentée. Elle répond à une demande en deux temps :
aligner la bascule entre le mode Composant et le mode Tokens d'UCM Exporter sur
celle d'UCM Architect, puis donner au mode Tokens les fonctions du plugin
Supernova Figma Variables Sync, avec une conversion vers une forme que Style
Dictionary lit. La piste `P23` de
[pistes.json](../Evolutions%20globales/pistes.json) en porte la carte.

## En une page, pour le mainteneur

**Le problème.** Un repository consommateur veut remplacer sa chaîne Supernova
par UCM Exporter. Aujourd'hui, ses équipes choisissent dans Variables Sync les
collections et les modes envoyés, et un exporteur Supernova écrit des fichiers
que leur build Style Dictionary lit. UCM Exporter publie toutes les variables
locales du fichier dans un seul `tokens.json`, sans choix possible. Son
interface empile la carte du composant et celle des tokens sur une seule page,
là où Architect sépare ses deux modes par une bascule.

**Ce que la recherche recommande.**

1. Sortir la bascule d'Architect dans le socle, puis la poser dans l'en-tête de
   l'Exporter : une carte par mode, ouverture en Composant quand la sélection
   Figma porte un composant, en Tokens sinon. L'Exporter passe en thème sombre
   forcé, comme Architect.
2. Dans le mode Tokens, laisser cocher les collections et les modes. Une
   collection citée par un alias d'une collection cochée est ajoutée d'office,
   et le plugin dit pourquoi : les alias restent des références
   ([CONCEPT.md](../../../../CONCEPT.md#les-tokens-restent-des-références)). Le
   mode par défaut d'une collection reste toujours exporté.
3. Écrire à la racine de `tokens.json` une extension `com.ucm.selection` qui
   nomme ce qui est écarté. La forme des valeurs ne change pas, donc
   `TOKENS_FORMAT_VERSION` ne monte pas (classe 12 de
   [COMPATIBILITE.md](../../../format/COMPATIBILITE.md#les-douze-classes-de-changement)).
4. Placer la conversion dans le kit, et l'exposer par une commande de la CLI,
   `ucm tokens style-dictionary --out <dossier>`, sur le modèle de
   `ucm tokens css`. Le plugin continue de déposer un seul fichier.

**Les décisions à prendre.** La section [7](#7-questions-au-mainteneur) les
détaille, avec une recommandation pour chacune.

| Question | Recommandation |
|---|---|
| Q1. Forme de la bascule de l'Exporter | Reprendre le composant d'Architect, déplacé dans le socle |
| Q2. Taille de la fenêtre par mode | Une seule taille pour les deux modes |
| Q3. Thème sombre forcé dans l'Exporter | Oui |
| Q4. Où ranger le choix des collections et des modes | Sur le poste, par repository, et l'extension `com.ucm.selection` dans le fichier |
| Q5. Choix du mode de base d'une collection | Non dans la première version |
| Q6. Choix par groupe ou par variable | Non |
| Q7. Variables masquées de la publication | Exportées, comme aujourd'hui |
| Q8. Où vit la conversion Style Dictionary | Kit et CLI |
| Q9. Version de Style Dictionary visée | 5.7 et suivantes, puis 4 par une option si le consommateur l'exige |
| Q10. Reproduire l'arborescence de l'exporteur Supernova | Non, sauf si la configuration du consommateur l'exige |

## 1. La bascule entre Composant et Tokens

### 1.1 L'Exporter aujourd'hui

L'Exporter n'a pas de mode. `src/ui/index.ts` crée la carte du composant
(lignes 30 à 34) et celle des tokens (lignes 36 à 39), puis les range dans la
même page (ligne 170) : composant, ligne de repli local, tokens. La carte des
tokens reste masquée jusqu'au premier `settings` (ligne 45), puis suit le
réglage « Gérer les tokens » (lignes 201 à 203). Pendant une opération,
`occuper()` rend l'autre carte inerte (lignes 125 à 130).

L'en-tête (`src/ui/components/Header.ts`, lignes 26 à 71) porte le titre de
la page, le bouton Configuration, le bouton de retour et la pastille de
connexion. La Configuration est une seconde page, que `montrerConfiguration` du
socle échange avec la page de travail (`src/ui/index.ts`, lignes 72 à 89).

La fenêtre a une seule taille, 380 × 500 à l'ouverture et 320 × 320 au minimum,
rangée sous la clé `tailleFenetre` (`src/fenetre.ts`, lignes 10 à 15).
`src/code.ts` ouvre l'interface avec `themeColors: true` (lignes 82 à 86) :
l'Exporter suit le thème de Figma.

### 1.2 UCM Architect

La barre du haut d'Architect (`packages/plugin-architect/src/ui/barre.ts`,
lignes 38 à 52) porte la bascule : un groupe `role="group"` de deux boutons à
`aria-pressed`, « Tokens » puis « Composant »
(`src/ui/textes/commun.ts`, lignes 31 à 35). `src/ui/styles/commun.css`
(lignes 152 à 182) la dessine en deux segments, celui du mode affiché en aplat.

Chaque mode est une disposition de la fenêtre (`src/fenetre.ts`, lignes 5 à 38).
Le mode Tokens ouvre à 1360 × 800, le mode Composant à 500 × 760, et chacun
range sa taille sous sa propre clé. Le sandbox choisit le mode d'ouverture
avant d'afficher la fenêtre : Composant quand la sélection a un composant pour
sujet, Tokens sinon (`src/sandbox/commun.ts`, lignes 22 à 24 et 51 à 58). Un clic
sur la bascule envoie `changer-disposition`, et le sandbox pose la taille rangée
pour l'autre mode (lignes 124 à 129). Un changement de sélection ne change pas
de mode. La barre change de gestes avec le mode (`barre.ts`, lignes 105 à 140) :
Actualiser en Tokens, Analyser et Constats en Composant.
[SPEC.md d'Architect](../../../../packages/plugin-architect/SPEC.md#interface)
décrit ces deux dispositions. Architect s'ouvre avec `themeColors: false` et
reste sombre.

### 1.3 L'écart, écran par écran

| Écran | Exporter aujourd'hui | Architect | Exporter aligné |
|---|---|---|---|
| Ouverture | Une page, les deux cartes | Le mode que la sélection désigne | Composant si la sélection porte un composant, Tokens sinon |
| En-tête | Titre, Configuration, pastille | Produit, bascule, gestes du mode | Titre, bascule, Configuration, pastille |
| Mode Composant | Carte du composant en tête de page | Vue composant et panneau des constats | Carte du composant et ligne de repli local, seules |
| Mode Tokens | Carte des tokens sous celle du composant | Arbre, table, panneau latéral | Carte des tokens, puis la liste des collections (lot 5) |
| « Gérer les tokens » désactivé | La carte des tokens disparaît | Sans objet | La bascule disparaît, l'Exporter reste en Composant |
| Pendant une opération | L'autre carte est inerte | Analyser grisé pendant une analyse | La bascule reste active ; l'autre mode montre sa carte inerte |
| Changement de sélection | La carte du composant suit la sélection | Le mode ne change pas | Le mode ne change pas ; la carte du composant suit la sélection |
| Configuration | Page séparée, bouton de retour | Bouton à `aria-pressed` dans la barre | Inchangée : l'alignement porte sur la bascule |
| Thème | Celui de Figma | Toujours sombre | Toujours sombre |

Aligner change une borne de
[CONTRIBUTING.md](../../../../CONTRIBUTING.md#la-hiérarchie-de-linformation) :
« deux cartes, ou une seule quand la gestion des tokens est désactivée »
devient « une carte par mode ». La règle « un résultat ne survit pas à son
sujet » ne change pas. Passer d'un mode à l'autre ne change pas le sujet, donc
chaque carte garde son verdict.

### 1.4 La règle des onglets et du choix segmenté

Dans le dépôt, un onglet (`.onglets` du socle, `plugin-socle/src/ui/Onglets.ts`)
navigue entre deux vues, et un choix segmenté ne fait varier que l'affichage
d'une seule vue. La bascule d'Architect a le dessin d'un choix segmenté et
change de vue entière, fenêtre comprise. L'Exporter ne peut pas reprendre la
bascule d'Architect sans reprendre cet écart. La question Q1 le soumet au
mainteneur.

## 2. Ce que le mode Tokens publie et ce que les lecteurs supposent

### 2.1 `tokens.json`

`handleExportTokens` (`packages/plugin-exporter/src/tokens/exportTokens.ts`,
lignes 1182 à 1284) lit toutes les collections et toutes les variables locales,
puis écrit un arbre DTCG. La forme publiée est dans
[FORMAT.md](../../../format/FORMAT.md#partie-2--export-tokens), la lecture de
Figma dans
[SPEC.md de l'Exporter](../../../../packages/plugin-exporter/SPEC.md#partie-2--export-tokens).
Quatre règles de cette forme décident de ce qu'une sélection peut retirer.

- Un alias s'écrit en référence `"{cible}"`, jamais en valeur résolue.
- Un alias vers une variable que le fichier ne publie pas s'écrit
  `"$value": null`, et l'export avertit le designer (`ExportContext`,
  lignes 204 à 206).
- `$value` porte le mode par défaut. `$extensions["com.ucm.modes"]` porte chaque
  mode, et `com.ucm.axes` déclare à la racine les modes et le défaut de chaque
  axe.
- Le chemin d'un token commence par le préfixe de sa collection
  (`prefixeDeCollection`), et un contrat cite ce même chemin.

### 2.2 Les lecteurs et l'effet d'une sélection

| Lecteur | Ce qu'il suppose | Ce qu'une sélection casserait | Parade |
|---|---|---|---|
| `ucm check`, tokens absents (`packages/kit/src/lecteurs/diagnostic-tokens.mjs`) | Chaque référence d'un contrat existe dans `tokens.json` | Un contrat qui cite `components.button…` alors que la collection est écartée reçoit « Des contrats citent des tokens absents » | L'analyse du composant nomme ces tokens avant la publication (lot 7) ; le rapport nomme la collection écartée par `com.ucm.selection` |
| `ucm check`, architecture (`diagnostic-architecture.mjs`) | Le fichier contient les collections de l'architecture UCM | `primitives` écartée : chaque lien de `brands` et de `utility` vers `primitives` devient un constat | Le contrôle saute une collection que `com.ucm.selection` écarte |
| `ucm tokens css` (`packages/cli/src/tokens-css.mjs`) | Chaque clé `modes` de `ucm.config.json` nomme un axe du fichier (ligne 123) | Un axe écarté en entier fait sortir la commande en erreur ; un mode écarté disparaît de la feuille, et un `data-*` qui le vise ne rend plus rien | Le plugin refuse d'écarter une collection dont `ucm.config.json` déclare l'axe sous `modes`, et nomme la clé |
| Style Dictionary chez le consommateur | Chaque référence résout | Une référence `null` fait échouer le build | La fermeture des dépendances (2.3) |
| Analyse du composant (`lireAvantEcriture`, option `avecTokens`) | Les tokens du repository sont ceux du fichier | La consigne « fusionnez les tokens d'abord » ne voit pas qu'un token est écarté | La même liste qu'au lot 7 |
| Adaptateur TypeScript | Ne lit pas `tokens.json` | Rien | Aucune |

### 2.3 Garder un fichier cohérent

Trois règles suffisent pour qu'un fichier filtré reste lisible par tous les
lecteurs du tableau.

1. **La fermeture des dépendances.** Une collection est exportée quand le
   designer la coche, ou quand une variable exportée la cite par un alias, dans
   n'importe quel mode. Le plugin la coche d'office, la grise et dit quelle
   collection la cite. Supernova fait la même chose (section 3.1). Un fichier
   filtré ne contient donc aucun `null` de plus qu'un export complet.
2. **Le mode par défaut ne s'écarte pas.** `$value` porte ce mode, et
   `com.ucm.axes[axe].default` le nomme. Écarter un autre mode le retire de
   `com.ucm.modes` sur chaque feuille et de `com.ucm.axes[axe].modes`.
   Une collection dont il ne reste qu'un mode cesse d'être un axe, comme
   aujourd'hui, sauf si des collections étendues la surchargent.
3. **Le fichier dit ce qui manque.** `$extensions["com.ucm.selection"]`
   nomme, à la racine, les préfixes de collection écartés et les modes écartés
   par axe. Un lecteur distingue ainsi un token écarté d'un token absent de
   Figma, et le rapport nomme le geste : cocher la collection dans le mode
   Tokens.

Exemple de racine :

```json
"$extensions": {
  "com.ucm.formatVersion": 2,
  "com.ucm.axes": { "theme": { "modes": ["light", "dark"], "default": "light" } },
  "com.ucm.selection": { "collections": ["stress-test"], "modes": { "theme": ["high-contrast"] } }
}
```

Une collection étendue suit sa racine : la cocher coche sa racine et ses
parentes. Supernova applique la même règle (section 3.1).

## 3. Supernova Figma Variables Sync

Les sources ont été lues le `2026-11-19`. « Documenté » signifie qu'une page de
l'éditeur le dit ; « déduit » signifie que la phrase est une inférence de cette
recherche.

### 3.1 Le plugin

| Fonction | Ce que Supernova documente | Source |
|---|---|---|
| Destination | Le designer choisit un workspace, un design system et un dataset, puis pousse vers Supernova. La synchronisation part du plugin seulement. | [Figma Variables Sync][sn-sync] |
| Choix des collections | Le plugin coche toutes les collections du fichier ; le designer décoche celles qu'il ne veut pas pousser. | [Figma Variables Sync][sn-sync] |
| Dépendances | Le plugin pousse d'office les collections citées, pour garder les références entre collections. Une variable citée d'un autre fichier s'importe séparément. | [Figma Variables Sync][sn-sync] |
| Collections étendues | Cocher une collection étendue coche ses parentes jusqu'à la racine, même dans un fichier distant. La liste montre les liens de parenté et le nombre de valeurs surchargées. | [Figma Variables Sync][sn-sync], [Collections étendues][sn-mars-2026] |
| Choix des modes | Le designer choisit le mode importé en valeur de base et les modes importés en thèmes, sur les offres payantes. Par défaut, le premier mode donne la valeur de base, et chaque autre mode un thème. | [Figma Variables Sync][sn-sync], [Correspondance][sn-correspondance], [Configuration étendue][sn-juillet-2024] |
| Marques | Le designer choisit la marque qui reçoit les collections, quand le design system a plusieurs marques. | [Configuration étendue][sn-juillet-2024] |
| Ce qui est retenu | Le plugin suit les collections déjà poussées et les marque « Will be updated » quand elles changent. Une collection déjà poussée ne se retire pas, et un envoi reprend les changements de toutes les collections déjà poussées. | [Figma Variables Sync][sn-sync] |
| Correspondance | Une collection devient une propriété de token, un groupe un groupe, une variable un token avec sa valeur, sa description et sa syntaxe de code. | [Correspondance][sn-correspondance] |
| Types | `COLOR`, `FLOAT` et `STRING` s'importent ; `BOOLEAN` ne s'importe pas. Une variable à un seul scope reçoit un type précis (Corner radius donne Border radius) ; plusieurs scopes donnent un token générique. Ce typage par scope dépend d'un réglage du plugin. | [Correspondance][sn-correspondance] |
| Styles | Les styles ne passent pas par le plugin : Supernova les importe par le lien de la bibliothèque Figma. | [Collections étendues][sn-mars-2026] |
| Statut | Bêta publique, d'après la page de la Community. | [Plugin sur Figma Community][sn-community] |

Aucune page lue ne documente un choix par groupe ou par variable, un traitement
des variables masquées de la publication (`hiddenFromPublishing`), ni les unités
des `FLOAT`.

### 3.2 Les exporteurs et les pipelines

Le plugin n'écrit rien dans un repository. Un exporteur Supernova produit les
fichiers, et un pipeline les dépose.

- **Documenté.** L'exporteur Style Dictionary écrit des fichiers JSON, un par
  type de token par défaut (`fileStructure: separateByType`), sous `./base`.
  `exportThemesAs` vaut `separateFiles` par défaut, avec `applyDirectly`,
  `mergedTheme` et une forme imbriquée en options. Son nommage suit
  `tokenNameStyle` (`kebabCase`) et `tokenNameStructure` (`pathAndName`), avec
  des préfixes de type (`useTokenTypePrefixes: true`). `forceRemUnit` et
  `remBase` règlent les unités. Source :
  [config.json de l'exporteur][sn-sd-config],
  [README de l'exporteur][sn-sd-readme].
- **Documenté.** Le README actuel montre des tokens en `"value"`, sans `$`, et
  des alias `"{color.primitives.gold.400}"`. L'ancien dépôt montrait `"value"`,
  `"type"` et des alias en `.value`. Source : [README de l'exporteur][sn-sd-readme],
  [ancien dépôt][sn-sd-ancien].
- **Documenté.** Un pipeline se déclenche à la mise à jour de la source, à la
  publication d'une version, au changement de tête, ou à la main. Il ouvre une
  pull request sur GitHub, GitLab, Bitbucket ou Azure, depuis une branche
  `supernova/<exporteur>`, et ne pousse jamais sur la branche de production.
  Source : [Delivery pipelines][sn-pipelines].
- **Non lu.** Les pages Automation de learn.supernova.io ne rendaient que leur
  titre. Le plan qui ouvre les pipelines n'est pas établi : la page des offres
  lue ne porte pas de date.

### 3.3 Ce qui est déduit

- La sélection de Supernova porte sur ce qui entre dans Supernova. Le fichier
  écrit dans le repository dépend ensuite des réglages de l'exporteur et des
  thèmes. Le consommateur a donc deux réglages à reproduire : les collections et
  modes envoyés, et la forme des fichiers.
- La forme exacte d'un token dans la sortie de l'exporteur dépend de sa version
  (`value` seul, ou `value` et `type`). Elle se vérifie sur un fichier que la
  chaîne du consommateur a produit, pas sur la documentation.

### 3.4 Ce qu'UCM reprend

| Fonction de Supernova | Dans l'Exporter | Raison |
|---|---|---|
| Collections cochées d'office, décochables | Reprise | Un nouveau fichier exporte tout, comme aujourd'hui |
| Dépendances ajoutées d'office | Reprise | Les alias restent des références |
| Collection étendue avec ses parentes | Reprise | Même raison |
| Choix des modes exportés | Reprise, mode par défaut toujours exporté | `$value` porte le mode par défaut |
| Choix du mode de base | Question Q5 | Change `$value` et le défaut de l'axe |
| Choix de la marque | Sans objet | Une marque UCM est un mode d'une collection |
| Suivi des collections déjà envoyées | Le résumé de la carte et le diff de la demande de fusion | Le repository garde l'état publié |
| Destination | La demande de fusion existante | Une demande par artefact, jamais fusionnée par le plugin |
| Arborescence de l'exporteur | Question Q10 | Un format propre au fournisseur |

## 4. Style Dictionary

Les sources ont été lues le `2026-11-19`.

### 4.1 La forme attendue

| Version | Forme d'un token | Références | Valeurs DTCG 2025.10 en objet |
|---|---|---|---|
| 3 | `value`, catégorie tirée du chemin | `{a.b.value}` | Non lues |
| 4 | `$value`, `$type`, `$description` ; le format DTCG est détecté seul, `usesDtcg` est rarement nécessaire | `{a.b}` | Non lues : une couleur en objet sort `[object Object]` |
| 5 | Celle de la 4 | Un token entier seulement ; le suffixe `.value` et la référence à un groupe sont refusés | Couleur en 5.3.0, dimension en 5.4.0, durée en 5.7.0 |

Sources : [prise en charge DTCG][sd-dtcg], [configuration][sd-config],
[références][sd-references], [migration vers la 4][sd-migration-4],
[journal des versions][sd-changelog]. La migration vers la 4 renomme
`name/cti/kebab` en `name/kebab`. La version 5.8.0 est la plus récente au jour
de la lecture.

Le dépôt le prouve déjà sur sa propre sortie.
`packages/plugin-exporter/tests/styleDictionary.test.ts` construit le CSS d'un
export avec Style Dictionary 5.5.3 et un transform de durée ajouté.
[FORMAT.md](../../../format/FORMAT.md#partie-2--export-tokens) dit que la 4 écrit
`[object Object]` sans faire échouer le build. Depuis 5.7.0, `time/seconds` lit
aussi `duration` : le transform ajouté du test devient inutile au-delà de cette
version.

### 4.2 Modes et thèmes

- **Documenté.** Style Dictionary n'a pas de notion de mode. Sa configuration
  fusionne en profondeur les fichiers de `source`, `include` donne des valeurs
  écrasées par `source`, et `filter` choisit les tokens d'un fichier de sortie
  ([configuration][sd-config]).
- **Documenté.** Le module de résolution DTCG 2025.10 n'est pas implémenté :
  l'issue qui le suit reste ouverte ([issue 1590][sd-resolver]).
- **Documenté.** `@tokens-studio/sd-transforms` lit `$themes.json` et rend une
  combinaison de fichiers par thème avec `permutateThemes`
  ([sd-transforms][sd-transforms]).
- **Déduit.** Style Dictionary ignore `$extensions["com.ucm.modes"]` : un build
  sur `tokens.json` rend le mode par défaut de chaque collection. Un build par
  mode demande un fichier par mode.

### 4.3 Comparaison avec `tokens.json`

| Point | `tokens.json` d'UCM | Style Dictionary 5.7 et suivantes | Style Dictionary 4 |
|---|---|---|---|
| Clés | `$value`, `$type` | Lues | Lues |
| Références | `{a.b}` vers un token entier | Lues | Lues |
| Couleur | Objet `colorSpace`, `components`, `alpha` | Lue | Chaîne attendue |
| Dimension | Objet `value`, `unit: "px"` | Lue | Chaîne attendue |
| Durée | Objet `value`, `unit: "s"` | Lue | Chaîne attendue |
| `cubicBezier` | Tableau de quatre nombres | Lu par `cubicBezier/css` | Lu par `cubicBezier/css` |
| `boolean`, `string` | Hors du module DTCG | Passent tels quels | Passent tels quels |
| Modes | `com.ucm.modes` sur la feuille | Ignorés | Ignorés |
| Collections étendues | `com.ucm.extensions` | Ignorées | Ignorées |
| `$value: null` | Alias vers une variable non publiée | Échec du build | Échec du build |

### 4.4 Ce que la conversion fait

1. Écrire un fichier de base, avec chaque feuille qui ne porte aucun axe.
2. Écrire, pour chaque axe et chaque mode, un fichier avec les seules feuilles
   de cet axe, la valeur du mode en `$value`. Une feuille d'axe n'est pas dans
   la base : deux sources qui déclarent le même token produisent un avertissement
   de collision de Style Dictionary.
3. Garder chaque alias en référence. Style Dictionary fusionne les sources
   avant de résoudre, donc une référence d'un fichier de mode vers la base
   résout.
4. Laisser `$extensions` hors des fichiers produits.
5. Avec l'option de compatibilité 4, écrire les couleurs, dimensions et durées
   en chaînes CSS : la couleur sRGB opaque en hexadécimal, sinon `rgb()` ou
   `color(display-p3 …)`, la dimension en `8px`, la durée en `0.2s`. Le kit
   porte déjà ces conversions pour `ucm tokens css`.
6. Refuser le fichier, avec un message qui nomme le token, quand il porte un
   `$value: null`, un cycle ou une collection étendue. Les collections étendues
   restent expérimentales dans
   [FORMAT.md](../../../format/FORMAT.md#partie-2--export-tokens).

Exemple pour un axe `theme` à deux modes :

```text
style-dictionary/base.json
style-dictionary/theme/light.json
style-dictionary/theme/dark.json
```

La configuration Style Dictionary du consommateur déclare alors
`source: ["style-dictionary/base.json", "style-dictionary/theme/dark.json"]` pour
le build sombre. Deux axes, comme une marque et un thème, demandent une
combinaison de fichiers par build, que cette configuration énumère.

### 4.5 Où vit la conversion

Deux règles du produit tranchent. Seul l'Exporter est agnostique, et les autres
outils suivent l'architecture UCM. Un consommateur ne reçoit aucun script UCM à
lui : ce qui lui est livré passe par ce qu'`ucm init` écrit et par les paquets
publiés.

| Option | Ce qui change | Pour | Contre |
|---|---|---|---|
| A. Le plugin dépose aussi les fichiers convertis dans la demande | `src/depot.ts`, les deux forges, `ucm.config.json` (dossier de sortie) | Aucune commande à lancer chez le consommateur | La SPEC limite la demande des tokens au seul fichier `{tokens}`. GitHub écrit un fichier par appel à l'API Contents, donc plusieurs fichiers demandent l'API Git Data. Chaque correction de la conversion attend une publication sur la Community. Le diff de la demande double |
| B. Une fonction du kit et une commande `ucm tokens style-dictionary` | `packages/kit/src/`, `packages/cli/src/`, `ucm init` | Même chemin que `ucm tokens css`. Le consommateur reçoit la conversion par `npm`. Le test lance Style Dictionary dans le kit | Le consommateur ajoute la commande à ses scripts, comme pour `ucm tokens css` |
| C. Une fonction du kit seule | `packages/kit/src/` | Le moins de code | Le consommateur écrit le script qui l'appelle, ce que la règle refuse |
| D. Un job de CI qui convertit et commite | Le workflow qu'écrit `ucm init` | Fichiers à jour sans commande locale | Un job qui pousse sur la branche de la demande demande des droits d'écriture au jeton de CI |

**Recommandation : B.** La conversion ne lit que le format de `tokens.json`, pas
l'architecture UCM, comme `ucm tokens css`. Le plugin garde un seul artefact
par demande. `ucm init` ajoute à ses consignes la ligne qui demande de lancer
la commande avant le build Style Dictionary, comme elle le fait pour
`ucm tokens css` (`packages/cli/src/init.mjs`, ligne 371). La fonction du kit
reste pure : l'option A reste ouverte plus tard, sans réécrire la conversion.

## 5. Les lots

Les lots suivent l'ordre de la demande : l'alignement de l'affichage d'abord.
Chaque lot se termine par `npm run agents:diff`, `npm test`,
`npm run typecheck` et `npm run build`. Les tests d'interface se jouent dans
Chromium par le mainteneur.

| Lot | Contenu | Fichiers touchés | Tests | Critères de fin |
|---|---|---|---|---|
| 1 | La bascule d'Architect passe dans le socle | `packages/plugin-socle/src/ui/Bascule.ts` (créé), `socle.css`, `packages/plugin-architect/src/ui/barre.ts`, `styles/commun.css` | Un test du socle sur `aria-pressed` et le clic ; les tests de la barre d'Architect inchangés | `npm run fidelite --workspace ucm-architect-plugin` ne rend aucun nouvel écart ; `.bascule` n'est plus défini dans Architect |
| 2 | Deux modes dans l'Exporter | `packages/plugin-exporter/src/ui/index.ts`, `components/Header.ts`, `styles.css`, `src/code.ts`, `src/messages.ts`, `galerie/etats.cjs`, `SPEC.md` (Contexte technique), `CONTRIBUTING.md` (borne des cartes) | `galerie.test.ts` (un état par mode), un test du mode d'ouverture selon la sélection, un test de « Gérer les tokens » désactivé qui masque la bascule | La galerie montre un état Composant et un état Tokens ; une sélection vide ouvre en Tokens ; un composant sélectionné ouvre en Composant |
| 3 | Thème sombre forcé | `src/code.ts` (`themeColors: false`), `styles.css` | `stylesUi.test.ts` : chaque rôle de `langage.css` reçoit sa valeur sombre | La galerie claire et la galerie sombre rendent le même écran |
| 4 | Lecture des collections pour la sélection | `src/tokens/selection.ts` (créé), `exportTokens.ts`, `src/messages.ts` | La fermeture des dépendances sur `fichierDeVariables.ts` : alias direct, alias dans un mode seul, alias en chaîne, collection étendue, cible distante | Un message `collections` porte, par collection, son préfixe, ses modes, son défaut, et les collections qui la citent |
| 5 | Liste des collections et des modes dans le mode Tokens | `components/CarteTokens.ts`, un composant de liste, `src/config.ts` (rangement sur le poste), `galerie/etats.cjs` | Galerie : vingt collections, une dépendance grisée, un mode par défaut verrouillé ; `textesAffiches.test.ts` | Décocher une collection citée est impossible, et la ligne nomme la collection qui la cite ; le choix survit à la fermeture du plugin pour le même repository |
| 6 | Export filtré | `exportTokens.ts`, `src/config.ts` (clé de destination), `docs/format/FORMAT.md`, `packages/plugin-exporter/SPEC.md`, `docs/format/CHANGELOG-FORMAT.md`, `packages/kit/src/format/tokens.ts` (constante `com.ucm.selection`) | `exportTokens.test.ts`, `axesDeModes.test.ts`, `conformiteDtcg.test.ts`, `styleDictionary.test.ts` et `exportAccepteParLaCli.test.ts` sur un export filtré | Un export filtré ne porte aucun `null` de plus que l'export complet ; `com.ucm.axes` ne nomme que les modes exportés ; une publication refuse une analyse faite avec une autre sélection |
| 7 | Contrats et collections écartées | `src/prevol.ts`, `packages/plugin-socle/src/composant/` (relevé des références), `packages/kit/src/lecteurs/diagnostic-tokens.mjs`, `diagnostic-architecture.mjs` | Un composant qui cite un token d'une collection écartée reçoit un avertissement qui nomme la collection ; `ucm check` nomme la collection écartée | Le rapport de `ucm check` dit « collection non exportée » et le geste du mode Tokens |
| 8 | Conversion Style Dictionary | `packages/kit/src/format/` ou `lecteurs/` (fonction pure), `packages/cli/src/tokens-style-dictionary.mjs` (créé), `ucm.mjs`, `init.mjs`, `packages/cli/aides/` | Un test du kit qui construit chaque fichier produit avec Style Dictionary 5.8.0 épinglé, et 4 si l'option existe ; un test de la CLI sur un repository temporaire sans `package.json` | Aucun `[object Object]` dans le CSS construit ; un fichier par mode ; un `null` fait sortir la commande en 1 en nommant le token |
| 9 | Publication et recette | Versions du kit, de la CLI et de l'adaptateur (skill `publier-paquets`), `ROADMAP.md` | `npm test` à la racine, dont `versionSuitLeContenu` | Les paquets sont servis par le registre ; le repository consommateur construit ses feuilles depuis la sortie de la commande |

Le lot 7 touche `diagnostic-tokens.mjs` et `controle-repository.mjs`, que la
piste `P19` modifie aussi. Il se fait après elle.

## 6. Compatibilité du format publié

- **La forme des valeurs ne change pas.** Un fichier filtré contient moins de
  feuilles et moins de modes, chaque feuille gardant sa forme.
  `TOKENS_FORMAT_VERSION` reste à `2`.
- **`com.ucm.selection` est une extension facultative.** Elle relève de la
  classe 12 de
  [COMPATIBILITE.md](../../../format/COMPATIBILITE.md#les-douze-classes-de-changement).
  Un lecteur de valeurs l'ignore. L'entrée de
  [CHANGELOG-FORMAT.md](../../../format/CHANGELOG-FORMAT.md) la nomme avec sa
  classe.
- **Retirer une collection retire des chemins.** Pour un contrat déjà fusionné,
  l'effet est celui de la classe 5 : ses références ne résolvent plus. Le
  designer corrige en cochant la collection, et le lot 7 le lui dit avant la
  publication.
- **Retirer un mode change la feuille CSS.** `ucm tokens css` écrit moins de
  règles, et un attribut `data-*` qui visait le mode retiré ne rend plus rien.
  Le refus du lot 5 empêche d'écarter une collection dont
  `ucm.config.json` déclare l'axe.
- **La sortie Style Dictionary n'est pas un format publié.** Elle est une sortie
  de la CLI, documentée dans son aide, et versionnée par le semver du paquet
  (classe 6).

## 7. Questions au mainteneur

**Q1. La forme de la bascule de l'Exporter.**
(a) Reprendre la bascule d'Architect, déplacée dans le socle, avec l'écart de
la section 1.4. (b) Passer les deux plugins aux onglets du socle, ce qui change
aussi Architect. (c) Onglets dans l'Exporter seul.
Recommandation : (a). La demande est l'alignement sur Architect, et un seul
composant partagé empêche les deux plugins de diverger. La bascule change la
fenêtre entière, ce qui la distingue d'un onglet à l'intérieur d'une vue ; la
règle des onglets peut le dire en une phrase.

**Q2. La taille de la fenêtre par mode.**
(a) Une taille commune, comme aujourd'hui. (b) Une taille rangée par mode,
comme Architect.
Recommandation : (a). Les deux cartes de l'Exporter ont la même largeur utile.
La liste des collections du lot 5 peut faire préférer (b) ; la galerie à vingt
collections le dira.

**Q3. Le thème sombre forcé dans l'Exporter.**
(a) `themeColors: false` et les valeurs sombres de `langage.css`. (b) Garder le
thème de Figma.
Recommandation : (a), pour suivre la règle des plugins sombres.

**Q4. Où ranger le choix des collections et des modes.**
(a) Sur le poste (`figma.clientStorage`), par repository, en rangeant ce qui est
écarté : une nouvelle collection est donc exportée. (b) Dans `ucm.config.json`
du repository, que le plugin lit déjà au test de connexion ; le plugin ne
l'écrit pas, et un développeur le modifie par une demande. (c) Dans les données
du document Figma.
Recommandation : (a), avec `com.ucm.selection` dans le fichier, qui montre le
choix dans le diff de chaque demande. (c) contredit l'invariant
« L'analyse et la publication ne modifient jamais le document Figma ». Un plugin
publié ne lit pas la clé du fichier (`figma.fileKey` est réservé aux plugins
privés, [documentation de l'API][figma-filekey]) : un choix rangé par fichier
n'a pas de clé fiable, d'où le rangement par repository. (b) devient utile si
plusieurs designers exportent vers le même repository et doivent partager le
choix.

**Q5. Le choix du mode de base.**
(a) Le mode par défaut de Figma reste la base. (b) Le designer choisit le mode
de base, comme dans Supernova.
Recommandation : (a). (b) change `$value` et `com.ucm.axes[axe].default` sans
que le document Figma change, et deux designers obtiendraient deux fichiers
différents du même document. Changer le mode par défaut dans Figma est un geste
du designer, à confirmer par le mainteneur avant de l'écrire dans un message.

**Q6. Le choix par groupe ou par variable.**
Recommandation : non. Supernova ne le documente pas, et un groupe écarté
rouvre la question des alias à l'intérieur d'une collection.

**Q7. Les variables masquées de la publication (`hiddenFromPublishing`).**
(a) Exportées, comme aujourd'hui. (b) Écartées par défaut.
Recommandation : (a). Une primitive masquée de la bibliothèque reste la cible
des alias du thème, et l'écarter produirait des `null`.

**Q8. Où vit la conversion Style Dictionary.**
Recommandation : l'option B de la section 4.5. À confirmer : une commande de la
CLI qui ne lit que le format, sans l'architecture UCM, est compatible avec la
règle « seul l'Exporter est agnostique ».

**Q9. La version de Style Dictionary visée.**
(a) 5.7 et suivantes seulement. (b) Aussi la 4, par une option qui écrit des
chaînes. (c) Aussi la 3.
Recommandation : (a), puis (b) si le build du consommateur est en 4. La 3
demande d'autres clés et d'autres références, pour une version que la
documentation officielle classe ancienne.

**Q10. Reproduire l'arborescence de l'exporteur Supernova.**
(a) Non : la commande écrit sa propre arborescence (section 4.4), et le
consommateur change ses `source`. (b) Oui : un fichier par type, en `value`.
Recommandation : (a), après lecture de la configuration Style Dictionary du
consommateur et des réglages de son exporteur Supernova. Si cette configuration
dépend de l'arborescence Supernova à plusieurs endroits, (b) se rediscute.

## 8. Sources

Toutes lues le `2026-11-19`.

- Supernova, [Figma Variables Sync][sn-sync].
- Supernova, [How variables map to tokens][sn-correspondance].
- Supernova, [Extended Figma Variables Sync configuration][sn-juillet-2024].
- Supernova, [Figma extended collections and plugin updates][sn-mars-2026].
- Figma Community, [Supernova Figma Variables Sync][sn-community].
- Supernova, [Delivery pipelines][sn-pipelines].
- Supernova, [config.json de l'exporteur Style Dictionary][sn-sd-config] et [son README][sn-sd-readme].
- Supernova, [ancien dépôt de l'exporteur Style Dictionary][sn-sd-ancien].
- Style Dictionary, [prise en charge DTCG][sd-dtcg], [configuration][sd-config], [références][sd-references], [migration vers la 4][sd-migration-4].
- Style Dictionary, [journal des versions][sd-changelog] et [issue 1590 sur le module de résolution][sd-resolver].
- Tokens Studio, [sd-transforms][sd-transforms].
- Figma, [`figma.fileKey`][figma-filekey].

[sn-sync]: https://learn.supernova.io/latest/design-systems/import-design-system-data/connect-figma-variables/figma-variables-sync-z0FfeM44
[sn-correspondance]: https://learn.supernova.io/latest/design-systems/import-design-system-data/connect-figma-variables/how-variables-map-to-tokens-z7kbJWuR
[sn-juillet-2024]: https://learn.supernova.io/latest/releases/july-2024/extended-figma-variables-sync-configuration-c8TQqLGR
[sn-mars-2026]: https://learn.supernova.io/latest/releases/march-2026/figma-extended-collections-and-plugin-updates-UB5UfguR
[sn-community]: https://www.figma.com/community/plugin/1303357900761384370/supernova-figma-variables-sync
[sn-pipelines]: https://developers.supernova.io/latest/exporters/delivery-pipelines-BlKUaNI9
[sn-sd-config]: https://github.com/Supernova-Studio/exporters/blob/main/exporters/style-dictionary/config.json
[sn-sd-readme]: https://github.com/Supernova-Studio/exporters/blob/main/exporters/style-dictionary/README.md
[sn-sd-ancien]: https://github.com/Supernova-Studio/exporter-style-dictionary
[sd-dtcg]: https://styledictionary.com/info/dtcg/
[sd-config]: https://styledictionary.com/reference/config/
[sd-references]: https://styledictionary.com/reference/utils/references/
[sd-migration-4]: https://styledictionary.com/versions/v4/migration/
[sd-changelog]: https://raw.githubusercontent.com/style-dictionary/style-dictionary/main/CHANGELOG.md
[sd-resolver]: https://github.com/style-dictionary/style-dictionary/issues/1590
[sd-transforms]: https://github.com/tokens-studio/sd-transforms
[figma-filekey]: https://developers.figma.com/docs/plugins/api/figma/#filekey
