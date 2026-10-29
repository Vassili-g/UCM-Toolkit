# Plan d'implémentation : intégrité de la structure et règles uniques

Ce plan réunit deux chantiers.

- **Intégrité de la structure** ([CONCEPTION.md](./CONCEPTION.md)). Architect vérifie, en mode Tokens, la structure des tokens d'un fichier UCM contre ce que le kit prévoit, et corrige ce qui se corrige exactement : variables absentes, crans visés, scopes. Les décisions Q1 à Q13 sont tranchées (§6 de la conception).
- **Règles dupliquées** ([AUDIT-REGLES-DUPLIQUEES.md](../../Règles%20dupliquées/AUDIT-REGLES-DUPLIQUEES.md)). Chaque règle décidée à plusieurs endroits reçoit un propriétaire unique et une loi anticopie. Vingt-neuf fiches, D-01 à D-29, plus D-30 ajoutée ici.

Les deux chantiers se croisent dans `packages/kit/src/controles/theme.ts` et `structure.ts`. Le nouveau contrôle s'écrit sur les propriétaires uniques : les lots U1 et U9 passent avant les lots d'Architect qui en dépendent.

## 1. Décisions

### 1.1 Intégrité de la structure

Les décisions sont celles de CONCEPTION.md, section « Décisions ». Rappel de ce qui fixe le code :

| Id | Ce que le code fait |
|---|---|
| Q1 | Le contrôle tourne dans tout fichier déclaré UCM, sans autre réglage |
| Q2 | Il tourne dans `lire-structure`, en mode Tokens. Le mode Composant n'appelle pas le contrôle |
| Q3 | Architect crée des variables dans `theme`, en corrections cochables, avec journal et un seul point d'annulation |
| Q4 | Le sens (`normal` ou `inverse`) se déduit des variables de la palette quand elles votent toutes pour le même sens ; sinon, une question |
| Q5 | Les segments nouveaux du nom créé suivent l'écriture choisie dans Nomenclature (`EcritureChoisie`). Un dossier qui existe déjà dans Figma (`primary`, `surface`) garde son écriture : l'écrire autrement créerait un second dossier. Sans écriture choisie, aucune création : un constat sans correction |
| Q6 | Ignorer une variable pour une palette (l'Ignorer actuel, par identifiant de constat) ; ignorer un rôle dans tout le fichier (clé nouvelle) |
| Q7 | Le kit porte les cibles de `scale/0`, `scale/1000`, `page/foreground-main` et `solid/foreground` |
| Q8 | Le cran visé (B) entre dans le contrôle : correction quand le cran est exact, question sinon |
| Q9 | La préparation d'un composant dit qu'une cible prévue manque dans `theme` |
| Q10 | La ligne de réussite d'une création demande de publier la library |
| Q11 | `theme` signalé dans À faire dans Figma dans les deux cas : aucun mode reconnu Light ni Dark (un seul constat), ou l'un des deux manque |
| Q12 | `couche`, `valeur-directe` et `portee` passent dans le kit ; `src/integrations/` d'Architect disparaît |
| Q13 | Code neuf C82, avec un fait `genre` |
| Q-14 | Une correction de cran change une couleur visible : sa ligne arrive décochée. L'onglet Corrections a un bouton « Tout désélectionner » |

### 1.2 Règles dupliquées

Les questions Q-01 à Q-11 de l'audit étaient ouvertes. Le plan retient la recommandation de l'audit pour chacune. Le mainteneur peut en renverser une **avant le lot qui l'applique** : le lot est alors réécrit, les autres ne bougent pas.

| Question | Retenu | Lot |
|---|---|---|
| Q-01 | La reprise de session d'Architect recalcule les constats quand la version du kit a changé | U2 |
| Q-02 | `cleDuTheme` disparaît ; `variableDuThemeReconnue` reste seule | U1 |
| Q-03 | `État` et `Etat` sont tolérés comme axe d'états ; le contrat publie leur `stateModel` | U2 |
| Q-04 | `tiny` est une forme tolérée de `xs`, `huge` de `xl` ; `SIZE_VALUES` devient une projection du registre | U5 |
| Q-05 | La liste des champs de typographie va dans le référentiel du kit | U4 |
| Q-06 | La planche reçoit le calcul du contraste du kit à la génération ; les tests du navigateur gardent leur copie sous une loi qui la compare au kit | U6 |
| Q-07 | Le hub garde sa devinette par teinte (démonstration) ; les termes passent par le registre | U7 |
| Q-08 | Une seule fonction du kit juge une peinture visible, sur `{ visible?, opacity?, opacite? }` | U3 |
| Q-09 | Architect ne parcourt pas le sous-arbre d'un imbriqué ; seule la liste des motifs se partage | U7 |
| Q-10 | Un terme tapé dans Nomenclature se découpe en camel | U7 |
| Q-11 | Une loi racine, `tests/reglesUniques.test.ts`, porte une table de motifs refusés | U0 |

### 1.3 Fiche ajoutée : D-30, variable supprimée

Signalée par une session voisine. Une variable supprimée reste lisible par `getVariableByIdAsync` tant qu'un calque ou un alias la cite. Trois plugins décident chacun ce qu'est une variable supprimée :

| Copie | Règle |
|---|---|
| `packages/plugin-exporter/src/tokens/exportTokens.ts:1093` | la cible doit être dans `getLocalVariablesAsync`, puis `pathById` ; message propre (`:305-312`) |
| `packages/plugin-palettes/src/lectureDesVariables.ts:9-11` | liste locale seulement, exprès |
| `packages/plugin-architect/src/lecture.ts:358-363` | suit l'alias par `getVariableByIdAsync` : la variable supprimée entre au catalogue, `catalogueDuFichier` la marque `presente` |

**Divergence constatée** dans le fichier du mainteneur : 13 variables de `components` visent des variables supprimées. L'Exporter dit « elle cite une variable introuvable ». Architect ne dit rien, ni C63 `alias-supprime` en mode Tokens, ni C41 en mode Composant. Le kit a la bonne règle et reçoit un catalogue faussé.

Le contrôle d'intégrité lit le même catalogue : sans D-30, une jumelle qui vise une variable supprimée donnerait un préfixe de cible faux. Le lot U9 passe donc avant I5.

Portée. Palettes ne suit jamais un alias : sa liste locale répond à une autre question et reste. L'Exporter ne lit que les variables locales et dit « introuvable » dès qu'une cible n'y est pas ; il ne distingue pas une variable supprimée d'une variable de library. La règle commune est donc le juge, `controlerLesAliasesManquants` du kit, pas une définition de « supprimée » : Architect lui donne un catalogue sans variables supprimées (U9), l'Exporter lui donne un catalogue de ses variables locales (U10). Le mode Composant ne juge pas les alias du catalogue (`controlerLaStructureParEtapes` n'appelle pas `controlerLesAliasesManquants`) : le silence y reste, hors de ce plan.

Décisions sur D-30 :

- **Q-12.** L'Exporter juge une variable supprimée par `controlerLesAliasesManquants` du kit, après U9 (lot U10). Son texte au designer ne change pas. La règle n'a plus qu'un juge.
- **Q-13.** Le mot est « introuvable », dans les deux plugins. La phrase d'Architect « Cette variable vise une variable supprimée. » devient « Cette variable vise une variable introuvable. », dans le mode Tokens (U9.5) puis dans le panneau des ignorés (I7.4, après P0.2).

## 2. Règles d'exécution

- **Un sous-lot désigne son agent.** Les sous-lots consécutifs d'un même lot confiés au même agent partent dans **un seul appel** : l'agent relit son contexte à chaque appel. Le prompt contient la fiche du lot copiée telle quelle, la sortie de `npm run agents:lire -- <fichiers du lot>`, et rien d'autre.
- Au plus deux agents à la fois. Les vagues du §3 disent ce qui tourne ensemble.
- L'agent ne commite pas. La conversation principale relit le diff, fait relancer les vérifications par un `verificateur`, lance `npm run agents:diff`, puis commite par chemins explicites (`git commit -- <chemins>`). Elle coche le sous-lot avec le hash.
- `git status` avant chaque lot. Des sessions voisines modifient l'arbre : ne jamais ajouter un fichier qu'un autre lot ou une autre session a modifié.
- Un test nouveau échoue avant le code qui le fait passer. Tout bug corrigé reçoit un test de régression.
- Les textes destinés au designer sont fixés au §5 et validés par la maquette M1. L'agent les recopie mot pour mot.
- Aucun lot ne migre le fichier Figma du mainteneur, ses composants ou UCM-Playground. Ces gestes lui reviennent.
- Aucun fichier du mainteneur n'entre dans le dépôt. Les fixtures sont fabriquées, avec des noms de palettes génériques.
- **Version du kit.** `tests/versionSuitLeContenu.test.mjs` refuse un commit qui change `packages/kit/src/` sans monter la version. Chaque lot qui touche le kit finit donc par un sous-lot `executant` **avant** son commit : il monte `packages/kit/package.json` (le premier en mineure, `0.14.0`, parce que des constats changent ; correctif ensuite), monte d'un correctif `packages/cli/package.json` et `packages/adapter-typescript/package.json` et y aligne leur épingle exacte de `@ucm-kit/core`, lance `npm install` pour le verrou, puis `npm run schema` si `packages/kit/src/format/types.ts` a changé. Le `verificateur` du lot lance ensuite `npm test` à la racine. `npm run test:paquet` n'admet pas `kit` : les tests du kit se lancent par `npm test` dans `packages/kit`. Deux lots d'une même vague qui touchent le kit se commitent l'un après l'autre, chacun avec sa montée. Ce sous-lot vaut pour **chaque** lot qui touche le kit (I0 à I4, U1 à U6), même quand sa fiche ne l'écrit pas.
- `npm run test:ui` ne se lance jamais : le mainteneur teste l'interface. La galerie se construit par `npm run galerie:plugin -- architect`.

### Agents

| Agent | Modèle | Reçoit |
|---|---|---|
| conversation principale | Opus | maquettes, textes du designer, documents d'autorité, relecture des diffs, commits, publication |
| `implementeur-exigeant` | Sonnet | un lot qui touche plusieurs lecteurs d'une même règle, ou une interface au pixel près |
| `implementeur` | Sonnet | un lot au périmètre connu et aux critères vérifiables |
| `executant` | Haiku | une modification mécanique listée : version, remplacement, renvoi |
| `verificateur` | Haiku | tests, typecheck, build, galerie, `npm run vues`, rend un tableau |

## 3. Vagues

### 3.1 Quickwins

Un quickwin corrige un faux constat ou un silence prouvé, en peu de fichiers, sans changer le contrat publié ni attendre une maquette. Ils passent en premier, avant P0 : aucun ne lit la table des crans ni les fichiers du plan Règles manquantes. Chacun reprend des sous-lots du §4 tels quels ; la ligne de loi du même lot vient plus tard, dans son lot complet.

| Quickwin | Sous-lots | Impact | Effort |
|---|---|---|---|
| QW1 | U2.1 (D-01, D-19) | 57 faux constats C7, C17, C18, C32, C33 sur un jeu `Color=Error` | une fonction existe déjà (`corrections.ts:206`) : la déplacer, remplacer quatre copies |
| QW2 | U2.3 (D-04, D-18) et U3.1 (D-20), un seul appel : les deux touchent `accessibilite.ts` | contrôle de cible tactile perdu sur `Hovered`/`Press` ; corrections de couleur perdues sur `Colors` ; C50 sur des contours que le designer ne voit pas | trois prédicats, une dizaine d'appelants |
| QW4 | U9.0 à U9.5 (D-30, Q-13) | 13 alias vers des variables supprimées, silencieux en mode Tokens | une issue de lecture, six appelants |
| QW6 | U5.1 (D-28) | `ucm check` refuserait les contrats du même kit après une montée de version | une constante, un test |

Ordre : QW1 et QW4 ensemble, puis QW2 et QW6. Chaque quickwin qui touche `packages/kit/src/` finit par le sous-lot de version du §2 (le premier monte en mineure, `0.14.0`). Les lots U2, U3, U5 et U9 du §4 cochent alors ces sous-lots et ne gardent que le reste.

Non retenus : U2.2 (D-03) change le contrat publié ; U3.3 (D-08) touche `src/ui/ignores/modele.ts`, en cours dans le plan Règles manquantes ; I4 (Q9) écrit un texte que M1 doit d'abord valider ; I1 est le cœur du chantier.

### 3.2 Vagues

| Vague | Lots | Condition de départ |
|---|---|---|
| QW | QW1 et QW4, puis QW2 et QW6 | — |
| 0 | P0 | quickwins commités |
| 1 | U0, I0 | P0 |
| 2 | U1 ; M1 en parallèle (conversation principale) | U0 |
| 3 | I1, U2 | U1, I0 |
| 4 | I2, U3 | I1 ; U3 après U2 (`accessibilite.ts`) |
| 5 | I3 | I2 |
| 6 | I4, U4 | I3 ; U4 après U3 |
| 7 | I5, I6 | I4, U9 |
| 8 | I7, U5 | I5, M1 validée |
| 9 | I8, U6 | I6, I7, M1 validée |
| 10 | I9, U7 | I3 ; U7 après U6 |
| 11 | U8, U10 | U1 à U7, U9 |
| 12 | D | tous les lots de code |
| 13 | V, puis T | D |
| 14 | C si T trouve un écart, puis Z | T tenu |

## 4. Lots

### P0 · Préalables

Agent : conversation principale.

- [ ] **P0.1** La publication du plan des crans clairs (lot R1 de [SUJETS IMPORTANTS à trancher/PLAN-IMPLEMENTATION.md](../../SUJETS%20IMPORTANTS%20à%20trancher/PLAN-IMPLEMENTATION.md)) est faite. Le kit ne doit pas changer de table pendant les lots I.
- [ ] **P0.2** Le plan [Règles manquantes](../7%20Règles%20manquantes/PLAN-IMPLEMENTATION-REGLES-MANQUANTES.md) est commité : il modifie `src/ui/ignores/modele.ts`, `src/ui/textes/ignores.ts` et `src/ui/corrections/`, que I7 et I8 touchent aussi.
- [ ] **P0.3** `git status` propre sur les chemins de la vague 1. Noter ici la version du kit de départ (0.13.36 à l'écriture du plan ; 0.14.2 après les quickwins).

---

### U0 · Loi racine des règles uniques (Q-11)

Fichiers : `tests/reglesUniques.test.ts` (nouveau).

- [x] **U0.1** (509c0445) · `implementeur` · Écrire `tests/reglesUniques.test.ts` sur le modèle de `tests/referentielUnique.test.ts`.
  - Une table `REGLES` exportée par le fichier de test. Chaque entrée : `fiche` (`'D-02'`…), `motif` (`RegExp`), `dossiers` (globs balayés, par défaut `packages/*/src/**`), `proprietaires` (fichiers où le motif est admis), `exceptions` (`{ fichier, raison }[]`).
  - Balayage hors `dist/`, `node_modules/`, `_local/`. Un échec liste `fichier:ligne`, la fiche et la raison de la règle.
  - Une fonction `chercherLesCopies(texte, regle)` exportée et testée seule : un texte qui contient le motif rend une occurrence ; le même texte dans un fichier propriétaire n'en rend aucune.
  - Lignes initiales, qui doivent passer sur l'arbre actuel (D-02, correctif commité) : `VARIABLES_DU_THEME` suivi de `.find(`, `.sort(` ou `.endsWith(` hors de `packages/kit/src/referentiel/theme.ts` et `packages/kit/src/emplois/dossiers.ts` ; ``endsWith(`/${`` dans `packages/kit/src/controles/`.
- [x] **U0.2** (509c0445) · `verificateur` · `npm test` à la racine. Critère : `reglesUniques` passe, aucun autre test ne change.

---

### I0 · Cibles du neutre et sens d'une palette (Q4, Q7)

Fichiers : `packages/kit/src/emplois/dossiers.ts`, `packages/kit/src/emplois/index.ts`, `packages/kit/tests/ciblesDuTheme.test.ts` (nouveau).

- [x] **I0.1** (e2d7f5a8) · `implementeur` · Tests rouges, puis ajouts à `dossiers.ts`, sans changer `cranDeLaVariable` ni `TABLE_DES_DOSSIERS` :

  ```ts
  /** Les couleurs absolues de `utility/neutral`, par l'identifiant du registre `REGISTRE_COULEURS_ABSOLUES`. */
  export type CouleurAbsolue = 'white' | 'black';

  /** Les variables du neutre qui visent une couleur absolue, par mode. */
  export const CIBLES_ABSOLUES_DU_NEUTRE = {
    'scale/0': { light: 'white', dark: 'black' },
    'scale/1000': { light: 'black', dark: 'white' },
    'page/foreground-main': { light: 'black', dark: 'white' },
  } as const;

  /** Le texte des boutons qu'un sens donne : l'inverse de `sensDuTheme`. */
  export function texteDesBoutonsDuSens(mode: ModeDuTheme, sens: SensDuTheme): TexteDesBoutons;

  /** Ce qu'une variable du thème vise : un cran de sa rampe, ou une couleur absolue du neutre. */
  export type CibleDeVariable = { readonly cran: number } | { readonly absolue: CouleurAbsolue };
  export function cibleDeLaVariable(variable: VariableDuTheme, mode: ModeDuTheme, sens: SensDuTheme): CibleDeVariable | undefined;
  ```

  `cibleDeLaVariable` rend `{ cran }` quand `cranDeLaVariable` rend un nombre ; `{ absolue: 'white' }` ou `{ absolue: 'black' }` pour `solid/foreground` selon `texteDesBoutonsDuSens` (`blanc` → `white`) ; la valeur de `CIBLES_ABSOLUES_DU_NEUTRE` pour les trois variables du neutre ; `undefined` pour `elevation/*`.

  Tests :
  1. `texteDesBoutonsDuSens('light', 'normal')` vaut `blanc`, `('dark', 'normal')` vaut `noir`, et l'inverse en sens `inverse` ;
  2. pour chaque mode et chaque sens, `sensDuTheme(mode, texteDesBoutonsDuSens(mode, sens)) === sens` ;
  3. `cibleDeLaVariable` sur chaque variable de `VARIABLES_DU_THEME`, chaque mode, chaque sens : jamais `undefined` hors `elevation/*` ;
  4. les clés `white` et `black` égalent les identifiants de `REGISTRE_COULEURS_ABSOLUES`.
- [x] **I0.2** (e2d7f5a8) · `implementeur` (même appel) · Ajouter la déduction du sens (Q4) :

  ```ts
  export type SensDeduit = SensDuTheme | 'ambigu' | 'inconnu';
  /**
   * Le sens d'une palette dans un mode, d'après ce que visent ses variables. Une variable dont le cran diffère entre les deux
   * tables vote pour le sens dont la table donne son cran ; une variable qui ne correspond à aucune table ne vote pas.
   * `solid/foreground` vote par sa couleur absolue. Un vote au moins et tous d'accord : ce sens. Des votes contraires : `ambigu`.
   */
  export function sensDeLaPalette(
    mode: ModeDuTheme,
    vise: Partial<Record<VariableDePalette, CibleDeVariable>>,
  ): SensDeduit;
  ```

  Tests, sur les valeurs relevées dans le fichier du mainteneur :
  1. Light : `solid/hover` 800, `page/foreground` 700, `ring` 600, `solid/foreground` white → `normal` ;
  2. Dark : `solid/hover` 600, `page/foreground` 800, `ring` 700, `solid/foreground` white → `inverse` (`ring` 700 ne vote pas) ;
  3. `solid/hover` 800 et `page/foreground` 800 en Light → `ambigu` ;
  4. seulement `surface/default` et `surface/subtle` → `inconnu`.
- [x] **I0.3** (e2d7f5a8) · `executant` · Exporter les nouveaux noms par `packages/kit/src/emplois/index.ts` s'il ne réexporte pas tout `dossiers.ts`.
- [x] **I0.4** (e2d7f5a8) · `verificateur` · `npm test` dans `packages/kit`, puis `npm run typecheck`.

---

### U1 · Chemins et noms du thème (D-02, D-17, D-23 côté kit, Q-02)

Fichiers : `packages/kit/src/referentiel/reconnaissance.ts`, `packages/kit/src/referentiel/index.ts`, `packages/kit/src/controles/{theme,structure,mapping,accessibilite,index}.ts`, `packages/plugin-architect/src/catalogue.ts`, `packages/kit/tests/formeDuChemin.test.ts` (nouveau), `packages/kit/tests/themeReconnu.test.ts`, `tests/reglesUniques.test.ts`.

- [x] **U1.1** (36c7b1ab) · `implementeur-exigeant` · Ajouter à `reconnaissance.ts` et exporter par le référentiel :

  ```ts
  /** La forme de chemin d'un nom : chaque segment passe par `formeReconnue`, les segments se rejoignent par `/`. */
  export function formeDuChemin(nom: string | readonly string[]): string;
  ```

  Tests : `Primary/Solid/Default` et `primary/solid/default` ont la même forme ; un tableau de segments donne la même forme que le nom joint ; un nom d'un segment.
- [x] **U1.2** (36c7b1ab) · `implementeur-exigeant` (même appel) · Remplacer les copies de D-17, sortie identique : `signatureDeCible` (`mapping.ts`), les deux signatures de `structure.ts` (dans `controlerLesValeursVides` et `signatureSansPalette`), `formeDuNom` et `formeDuNomRemplace` (`theme.ts`). `remplacerSegment` garde sa recherche par forme. Les tests existants passent sans retouche.
- [x] **U1.3** (36c7b1ab) · `implementeur-exigeant` (même appel) · Q-02 : retirer `cleDuTheme` de `theme.ts` et de l'export du kit. Chaque appelant passe à `variableDuThemeReconnue` : `theme.ts`, `structure.ts`, `accessibilite.ts` (rôle du fond mesuré), Architect `src/catalogue.ts` (fonds de la page et de la carte). `grep -rn cleDuTheme packages` ne rend plus rien hors `dist/`.
- [x] **U1.4** (36c7b1ab) · `implementeur-exigeant` (même appel) · D-23 côté kit : `modeUcmDepuisNom` de `theme.ts` disparaît au profit de `modeDuThemeReconnu` (sans index : sortie identique).
- [x] **U1.5** (36c7b1ab) · `implementeur` · Lignes de la loi racine : `cleDuTheme` refusé partout ; `.map(formeReconnue).join('/')` refusé hors `reconnaissance.ts` ; `mode.name.trim().toLowerCase()` et `mode.nom.trim().toLowerCase()` refusés dans `packages/*/src/`, avec trois exceptions nommées, `packages/plugin-palettes/src/ecriture/variables.ts`, `packages/plugin-palettes/src/variables/lot.ts` et `packages/plugin-palettes/src/variables/detection.ts`, raison « levée par U7 ».
- [x] **U1.6** (36c7b1ab) · `executant` · Montée de version (§2).
- [x] **U1.7** (36c7b1ab) · `verificateur` · `npm test` dans `packages/kit`, `npm run test:paquet -- architect`, `npm test` racine, `npm run typecheck`.

---

### M1 · Maquette du mode Tokens

Agent : conversation principale. Vague 2, en parallèle de U1.

- [x] **M1.1** Figer l'état sombre de la galerie `packages/plugin-architect/galerie/etats/structure.cjs` et modifier son DOM ([Maquettes sur la galerie réelle]). Reprendre les cartes de modes et de scopes déjà construites à leur largeur (barre latérale de 640 px). Montrer :
  - onglet Corrections : intertitres « Variables manquantes » (une carte par rôle, ses lignes par palette, colonnes Aujourd'hui / Après l'application) et « Crans » (une carte par rôle et par mode), puis Modes et Scopes ;
  - onglet À faire dans Figma : intertitres « Variables manquantes », « Couches », « Modes », « Types », « Rangement » ;
  - le menu Ignorer d'une carte de variable manquante : « Pour cette palette » et « Dans tout le fichier » ;
  - le pied et la ligne de réussite après une création, avec la phrase de Q10 ;
  - le bouton « Tout désélectionner » de l'onglet Corrections (Q-14), et des cartes de crans dont les lignes arrivent décochées ;
  - la feuille de préparation du mode Composant avec la raison de Q9.
- [x] **M1.2** Textes du §5 posés mot pour mot. Lancer le contrôle de style des maquettes ([Maquettes en phrases simples]) et `galerie/comparer-maquette.cjs`.
- [x] **M1.3** ([MAQUETTE-INTEGRITE.html](./MAQUETTE-INTEGRITE.html), e6d56203). Validée par le mainteneur, avec les recommandations de M-1 à M-4 : « Tout désélectionner » en tête de l'onglet ; un menu à deux choix sous Ignorer ; une carte de crans par rôle et par mode ; pas d'exemple en Pascal. Pour la préparation (Q9), le contenu est validé, pas la mise en page du cadre 4 : I4.2 suit la ligne existante de la feuille. Terminer la maquette par un tableau de questions. **Validation du mainteneur** : I7 et I8 ne partent pas avant.
- [x] **M1.4** Aucun texte changé. Reporter au §5 les textes changés pendant la validation.

---

### I1 · Variables absentes du thème (A) et création exacte

Fichiers : `packages/kit/src/controles/constat.ts`, `packages/kit/src/controles/integrite.ts` (nouveau), `packages/kit/src/controles/index.ts`, `packages/kit/tests/integrite.absentes.test.ts` (nouveau), `packages/kit/tests/fixtures/catalogueDeStructure.ts` (nouveau).

- [x] **I1.1** (77c6cc8e) · `implementeur-exigeant` · Étendre `Correction` (lue par le sandbox, l'écriture et l'interface d'Architect) :

  ```ts
  /** Ce qu'une correction `variable` crée : une couleur de `theme`, un alias par mode, ses scopes. */
  export interface CreationDeVariable {
    readonly collection: string;   // clé de la collection theme
    readonly nom: string;          // nom complet de la variable à créer, sans la collection
    readonly type: 'COLOR';
    readonly scopes: readonly string[];
    /** Par identifiant de mode de `theme` : la variable visée. */
    readonly alias: Readonly<Record<string, { readonly cle: string; readonly nom: string }>>;
  }
  // dans Correction :
  creation?: CreationDeVariable;
  ```

  Une correction `sorte: 'variable'` porte `creation`, `cible: {}`, `avant: null`, `apres: { nom, collection }`.

  `VariableDuCatalogue` (`controles/catalogue.ts`) gagne `distante?: true`. `catalogueDuFichier` d'Architect le pose pour une variable `remote`.
- [x] **I1.2** (77c6cc8e) · `implementeur-exigeant` (même appel) · Fixture `catalogueDeStructure.ts`, fabriquée, toutes variables locales :
  - collections : `theme` (modes `light`, `dark`), `brands` (deux modes de marque), `utility` (un mode), `primitives` (un mode) ;
  - `brands` : `primary/<light|dark>/<cran>` et `secondary/<light|dark>/<cran>`, onze crans de 50 à 950 ;
  - `utility` : `neutral/<light|dark>/<cran>`, `neutral/<light|dark>/white`, `neutral/<light|dark>/black`, `elevation/<light|dark>/page`, `elevation/<light|dark>/raised`, et `<statut>/<soft|vivid>/<light|dark>/<cran>` pour `success`, `warning`, `danger`, `info` ;
  - `theme`, groupes `primary`, `secondary`, `neutral`, `success/soft`, `success/vivid`, `warning/soft`, `warning/vivid`, `danger/soft`, `danger/vivid`, `info/soft`, `info/vivid`. Chaque groupe porte les 15 variables de palette sauf `surface/subtle` et `surface/divider`. `neutral` porte en plus `page/foreground-main`, `page/foreground-subtle`, `scale/0`, `scale/1000`, et **pas** `page/foreground` (comme le fichier du mainteneur). `theme` porte aussi `disabled/background`, `disabled/foreground`, `disabled/border`, `elevation/page`, `elevation/raised` ;
  - crans visés : ceux du tableau de I2, colonne « Lu », pour les variables qu'il cite ; la table `normal` en Light et `inverse` en Dark pour les autres ; `solid/foreground` vise `white` dans les deux modes ;
  - une fonction `avecEcriture(casse, separateur)` rend une `EcritureChoisie` dont `groupes` et `variables` portent cette convention. Casses admises : `PascalCase`, `camelCase`, `initiale`, `inchangee` ; séparateurs : `tiret`, `tiret-bas`, `espace`, `soude`, `camelCase`, `inchange` (`referentiel/conventions.ts`).
- [x] **I1.3** (77c6cc8e) · `implementeur-exigeant` (même appel) · `integrite.ts` :

  ```ts
  export interface OptionsDIntegrite {
    /** L'écriture choisie dans Nomenclature ; sans elle, aucune correction `variable`. */
    readonly ecriture?: EcritureChoisie | null;
    /** Les rôles que le fichier ignore partout (Q6) : aucun constat ne les cite. */
    readonly rolesIgnores?: readonly VariableDuTheme[];
  }
  /** Les contrôles d'intégrité UCM du catalogue, sans composant. Rend [] hors collection `theme` lue. */
  export function controlerLIntegriteUcm(catalogue: CatalogueDeReference, options?: OptionsDIntegrite): Constat[];
  ```

  Calcul, dans cet ordre :
  1. **Groupes.** Pour chaque variable `presente` de la collection de rôle `theme`, `variableDuThemeReconnue(nom)` donne `v`. Si `v` est une variable de palette, le préfixe du groupe est le nom privé des segments de `v`. Un groupe est un préfixe qui porte au moins une variable de palette. Aucun nom de palette n'est supposé.
  2. **Attendues.** Un groupe attend `VARIABLES_DE_PALETTE`, plus `VARIABLES_DU_NEUTRE` si son préfixe est reconnu `neutral` (`termeReconnu` du registre du neutre). Le kit attend toutes les variables de palette dans `neutral`, `page/foreground` comprise (`referentiel/architecture.ts:174` et `:231`) : le contrôle l'attend aussi. `theme` attend une fois `VARIABLES_GLOBALES` et `elevation/page`, `elevation/raised`, sans groupe.
  3. **Rôles ignorés** : retirés des attendues.
  4. **Cible par mode** d'une variable `v` absente d'un groupe, pour chaque mode de `theme` reconnu par `modeDuThemeReconnu` :
     - les jumelles sont les variables du groupe avec un alias dans ce mode vers une variable de rôle `brands` ou `utility`, dont le segment de mode correspond au mode (une cible de l'autre branche relève de C60 et n'est pas une jumelle), et qui n'est pas distante. Leur préfixe de cible est le nom de la cible privé du dernier segment. Plusieurs préfixes : pas de correction, fait `raison: 'prefixes-multiples'`. Aucune jumelle : fait `raison: 'sans-jumelle'` ;
     - le sens vient de `sensDeLaPalette` sur les cibles des jumelles. Si `cibleDeLaVariable(v, mode, 'normal')` et `(…, 'inverse')` diffèrent et que le sens n'est ni `normal` ni `inverse` : pas de correction, fait `raison: 'sens-inconnu'` ;
     - une cible `{ cran }` se cherche sous le préfixe, dernier segment égal au cran. Absente : constat `cran-absent`, sans correction, faits `rampe` (le préfixe) et `cran` ;
     - une cible `{ absolue }` se cherche dans `utility` : chemin reconnu `[neutral, <mode>, <absolue>]` par `formeDuChemin`. `disabled/*` : `[neutral, <mode>, <cran>]` par `cranDeLaVariable`. `elevation/<niveau>` : `[elevation, <mode>, <niveau>]`. Une seule variable doit répondre, sinon pas de correction. Une cible distante (variable de library) ne donne jamais de correction : l'écriture ne la trouverait pas parmi les variables locales. Fait `raison: 'cible-de-library'`.
  5. **Nom créé (Q5).** Sans `options.ecriture`, pas de correction, fait `raison: 'sans-ecriture'`. Sinon : les segments du préfixe du groupe tels qu'écrits dans le fichier (pour `disabled/*` et `elevation/*`, qui n'ont pas de groupe, le préfixe est vide) ; le segment du dossier (`surface`, `disabled`, `elevation`) tel qu'une variable du même préfixe l'écrit déjà, sinon l'identifiant du kit écrit selon `ecriture.groupes` ; le dernier segment, l'identifiant du kit écrit selon `ecriture.variables`. L'écriture découpe par `decouperSegment`, met la casse par `motsAvecCasse`, assemble par `assembler` (`referentiel/ecriture-des-mots.ts`).
  6. **Constat.** `code: 'C82'`, `type: 'corriger'`, `famille: 'liaisons'`, `id: 'C82:variable-absente:<clé de theme>:<préfixe>/<v>'`. Un constat `cran-absent` a pour identifiant `C82:cran-absent:<préfixe de la rampe>/<cran>`, un seul par rampe et par cran, avec en fait la liste des variables qui l'attendent. Faits : `genre: 'variable-absente'`, `variable: v`, `groupe`, `nom` (si calculé), `cran:<nom du mode>` pour chaque mode, `raison` quand il n'y a pas de correction. Avec une cible dans chaque mode, une écriture et un nom : la correction `variable`, `creation.scopes` venant de `SUPPORT_DES_VARIABLES[v].portees`.
  7. **Silence** : une marque de `brands` sans groupe dans `theme`, un statut avec un seul profil, un préfixe dont aucune variable n'est reconnue.

  Tests (`integrite.absentes.test.ts`) :
  1. la fixture rend 23 constats `variable-absente`, chacun avec une correction : 22 pour `surface/subtle` et `surface/divider`, un pour `neutral/page/foreground` ;
  2. `primary/surface/subtle` vise `…/light/50` en light et `…/dark/100` en dark ; `surface/divider` vise 300 et 500 ; `neutral` vise `utility/neutral/…` ;
  3. scopes : `FRAME_FILL`, `SHAPE_FILL` pour `subtle` ; plus `STROKE_COLOR` pour `divider` ;
  4. `avecEcriture('PascalCase', 'soude')`, groupe écrit `Primary/Surface/…` : le nom créé est `Primary/Surface/Subtle`. Groupe `primary/surface/…` avec la même écriture : `primary/surface/Subtle` (les dossiers existants gardent leur écriture) ;
  5. sans écriture : 23 constats, aucun avec correction, fait `raison: 'sans-ecriture'` ;
  6. un groupe dont deux jumelles visent deux rampes : `prefixes-multiples`, pas de correction ;
  7. la rampe `brands/primary/light` sans cran 50 : constat `cran-absent`, faits `rampe` et `cran` ;
  8. `rolesIgnores: ['surface/divider']` : 12 constats ;
  11. une jumelle qui vise `…/dark/…` dans le mode light est écartée : le préfixe vient des autres jumelles ;
  12. une rampe de `brands` distante : constat sans correction, `raison: 'cible-de-library'`.
  9. un groupe `tertiary` sans aucun alias : `sans-jumelle` ;
  10. un catalogue de 3 700 variables : le contrôle prend moins de 150 ms sous Node (mesure, pas de limite stricte en CI si la machine varie : un `console.log` du temps et une borne à 1 s).
- [x] **I1.4** (77c6cc8e) · `executant` · Exporter `controlerLIntegriteUcm`, `OptionsDIntegrite` et `CreationDeVariable` par `packages/kit/src/controles/index.ts`.
- [x] **I1.5** (77c6cc8e) · `verificateur` · `npm test` dans `packages/kit`, `npm run typecheck`.

  Fait : une jumelle est une variable dont la cible finit par un cran (`solid/foreground`, qui vise `white`, n'en est pas une). Un cran absent de la rampe remplace le constat `variable-absente` par le constat de rampe. Raisons ajoutées : `cible-introuvable`, `cible-ambigue`, `mode-sans-cible`. Le nom créé garde la collection que le fichier redit (`theme/primary/surface/subtle`). 70 ms pour 3 726 variables.

---

### U2 · Termes des axes du composant (D-01, D-03, D-04, D-18, D-19, Q-01, Q-03)

Fichiers : `packages/kit/src/controles/{nommage,mapping,oublis,corrections,accessibilite,preparation,structure}.ts`, `packages/kit/src/referentiel/{vocabulaire,architecture}.ts`, `packages/plugin-socle/src/composant/analyse/proprietesEtEtats.ts`, `packages/plugin-architect/src/sandbox/projectionsDesControles.ts`, tests listés.

- [x] **U2.1** (68695799) · `implementeur-exigeant` · D-01 et D-19. Dans `nommage.ts`, à côté de `segmentDAxe` :

  ```ts
  export function registreDeLAxe(axe: AxeDuComposant): Registre | undefined;
  /** Égalité de forme, puis même terme reconnu des deux côtés ; deux valeurs inconnues ne sont pas égales. */
  export function memeValeurDAxe(axe: AxeDuComposant, segment: string, valeur: string): boolean;
  /** Un token appartient au jeu quand son premier segment a la forme du nom du jeu. */
  export function estDuComposant(nom: string, jeu: string): boolean;
  ```

  `memeValeurDAxe` reprend le corps de `corrections.ts:206`. Remplacer les copies : `mapping.ts:27`, `oublis.ts:9`, la comparaison en ligne de `nommage.ts:226-228`, `corrections.ts:206`. `estDuComposant` remplace `nommage.ts:136-153`, `corrections.ts:109`, `mapping.ts:215`, `preparation.ts:124`. Test `packages/kit/tests/valeurDAxeUnique.test.ts`, table de l'audit : palette `Danger`/`Error` vrai ; état `Pressed`/`press` vrai ; état `Zorglub`/`Bidule` faux ; taille `Big`/`Huge` faux. Test de régression : un jeu `Color=Error` lié à `Color/Danger/…` ne rend plus de C7, C17, C18, C32 ni C33.

  Fait : `preparation.ts:124` reste, l'audit l'avait listé à tort (la ligne écrit des noms, elle ne teste pas une appartenance). Une cinquième copie, dans la couverture de C12 et C13, passe aussi par `memeValeurDAxe`.
- [x] **U2.2** (a31fd850) · `implementeur-exigeant` (même appel) · D-03, Q-03. Dans `vocabulaire.ts` : `etat` devient une forme tolérée de `REGISTRE_AXES_ETAT` ; `export function estLAxeDEtats(nom: string): boolean` par `termeReconnu` ; `STATE_AXIS_NAMES` devient `[id, ...toleres]` du registre. `AXE_D_ETAT` de `accessibilite.ts` disparaît, et `corrections.ts:444` (`formeReconnue(propriete.nom) === 'state'`) appelle aussi `estLAxeDEtats`. `axeDePropriete` (`nommage.ts`) et `isStateProperty` (socle) appellent `estLAxeDEtats`. Tests : `State`, `States`, `Status`, `État`, `Etat` sont l'axe d'états pour les trois lecteurs ; un test du socle : un jeu `État=Défaut|Survol` publie un `stateModel`.
- [x] **U2.3** (33073fcb) · `implementeur-exigeant` (même appel) · D-04 et D-18. Ajouter à `nommage.ts` `export function etatReconnu(valeur: string): string | undefined` (`termeReconnu(REGISTRE_ETATS, valeur)?.id`). `estInteractif` et `etatDuVariant` l'appellent ; `corrections.ts:277`, `:450` et `:454` aussi, à la place de leurs littéraux `'hover'` et `'default'`. Ajouter `export function estLaFamilleCouleur(segment: string): boolean` à `architecture.ts` (`termeReconnu(FAMILLES_PRIMITIVES, segment)?.id === 'color'`) ; `corrections.ts:110` et `structure.ts:102` l'appellent. Tests : un bouton `Default`/`Hovered`/`Press` reçoit le contrôle de cible tactile ; `Button/Colors/Primary/background` reçoit des corrections de couleur.
- [x] **U2.4** (a31fd850) · `implementeur` · Q-01. Lire `packages/plugin-architect/src/sandbox/projectionsDesControles.ts` et son test. Si une session reprise garde des constats calculés par une autre version du kit, ranger la version du kit avec la session et recalculer quand elle diffère. Test : une session rangée avec une version antérieure recalcule ses constats. Si la reprise recalcule déjà, l'écrire dans le rapport et ne rien changer.
- [x] **U2.5** (a31fd850) · `implementeur` · Lignes de la loi racine : D-01 (`axe === 'etat' ? REGISTRE_` et `termeReconnu(REGISTRE_TAILLES` hors `nommage.ts` ; `termeReconnu(REGISTRE_ETATS` hors `nommage.ts`, exception nommée `preparation.ts`, raison « lit un état, pas une valeur d'axe ») ; D-03 (une expression régulière qui cite `state` ou `etat` comme nom d'axe, `STATE_AXIS_NAMES.includes`, `=== 'state'`, hors `vocabulaire.ts`) ; D-04 (`ETATS` importé de `emplois/dossiers.js` dans `controles/` hors `theme.ts`, `preparation.ts`, `structure.ts`, `integrite.ts` ; `formeReconnue(…) === '<état>'` pour les seuls littéraux `'default'`, `'hover'`, `'pressed'`, `'focus'`, `'disabled'`, dans `controles/`) ; D-18 (`formeReconnue(…) === 'color'` dans `controles/`) ; D-19 (`formeReconnue(variable.nom.split('/')[0])` hors `nommage.ts`). Lancer la loi sur l'arbre : chaque occurrence restante est corrigée ou nommée en exception avec sa raison.
- [x] **U2.6** (a31fd850) · `executant` · Montée de version (§2).
- [x] **U2.7** (a31fd850) · `verificateur` · `npm test` dans `packages/kit`, `npm run test:paquet -- socle`, `-- architect`, `-- exporter`, `npm test` racine, `npm run typecheck`.

  Fait : `estLAxeDEtats` est dans `referentiel/reconnaissance.ts` (cycle d'import depuis `vocabulaire.ts`). Les tolérés sont `etat` et `état`. Un jeu `État=…` publie `stateModel`, clé `état`. Q-01 : la session d'Architect vit en mémoire, jamais rangée ; rien à changer. Restent pour le lot D : FORMAT.md (lignes 91, 99, 347, 902) et `portee-du-contrat.md` ligne 12. À décider : les valeurs d'état en français (`Défaut`, `Survol`) ne sont pas des termes du registre ; Nomenclature propose désormais `État` → `State`.

---

### I2 · Cran visé (B, Q8)

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/tests/integrite.crans.test.ts` (nouveau), la fixture.

- [ ] **I2.1** · `implementeur-exigeant` · Pour chaque variable `presente` d'un groupe, de rôle reconnu `v`, et chaque mode reconnu, avec un alias vers `brands` ou `utility` :
  1. si le segment de mode de la cible ne correspond pas au mode, ne rien faire : C60 traite ce cas ;
  2. le sens du groupe dans ce mode vient de `sensDeLaPalette` sur les cibles de **toutes** ses variables ;
  3. la cible attendue est `cibleDeLaVariable(v, mode, sens)`. Si le sens est connu, ou si les deux sens donnent la même cible, et que la cible lue diffère : constat `genre: 'cran'`, `id: 'C82:cran:<clé de la variable>:<id du mode>'`, `type: 'corriger'`. La correction est `sorte: 'alias-de-mode'`, `cible: { variable, mode }`, `apres` = la variable du même préfixe au cran attendu (ou la couleur absolue de `utility`). Faits : `variable` (nom), `mode`, `avant` (cran ou absolue lus), `attendu`. Si la variable attendue n'existe pas : le constat `cran-absent` de la rampe (identifiant de I1, dédoublonné). Une cible distante : constat `cran` sans correction ;
  4. sens `ambigu` ou `inconnu`, cible dépendante du sens, cran lu dans aucune des deux tables : constat `cran` avec une question, candidats = les variables des deux cibles qui existent, indice « UCM ne sait pas si cette palette met un texte blanc ou noir sur ses boutons. » ;
  5. cran lu dans l'une des deux tables, sens inconnu : silence.

  La même règle couvre `disabled/*` (`cranDeLaVariable`), les trois variables du neutre (`CIBLES_ABSOLUES_DU_NEUTRE`) et `solid/foreground`.

  Tests, sur la fixture (crans relevés dans le fichier du mainteneur) :

  | Variable | Lu | Attendu |
  |---|---|---|
  | `*/surface/default` en dark | 300 | 200 |
  | `*/surface/hover` en dark | 400 | 300 |
  | `*/surface/pressed` en dark | 500 | 400 |
  | `primary/surface/foreground` en light | 800 | 700 (sens `normal`) |
  | `primary/ring` en dark | 700 | 800 (sens `inverse`) |
  | `disabled/background` en light | `neutral/100` | `neutral/200` |

  Plus : un groupe aux votes contraires rend une question à deux candidats ; un alias vers la mauvaise branche de mode ne rend pas de C82 (C60 le rend).
- [ ] **I2.2** · `verificateur` · `npm test` dans `packages/kit`, `npm run typecheck`.

---

### U3 · Peinture et couleur Figma (D-20, D-24, D-08, Q-08)

Fichiers : `packages/kit/src/controles/{releve,accessibilite,preparation}.ts`, `packages/kit/src/emplois/{contraste,couleur}.ts` (`couleur.ts` nouveau), `packages/kit/src/lecteurs/diagnostic-contrastes.mjs`, `packages/couleur/src/contraste.ts`, `packages/plugin-architect/src/{releveDuComposant,lectureDuComposant,modele,contraste}.ts`, `packages/plugin-architect/src/ui/ignores/modele.ts`, `packages/plugin-socle/src/composant/contract/extractSlotTokens.ts`, `packages/plugin-palettes/src/{variables/releve,lecture,i18n/nombres}.ts`.

- [x] **U3.1** (33073fcb) · `implementeur-exigeant` · D-20, Q-08. Dans `controles/releve.ts` :

  ```ts
  /** Une peinture se voit quand elle n'est pas masquée et que son opacité n'est pas nulle. */
  export function peintureVisible(p: { readonly visible?: boolean; readonly opacity?: number; readonly opacite?: number }): boolean;
  ```

  Appelants : `aUnePeintureVisible` (`accessibilite.ts:192`), `releveDuComposant.ts:109` et `:171`, `lectureDuComposant.ts:158`, `extractSlotTokens.ts:158`. Le fond de la page (`catalogue.ts:331`) répond à une autre question (l'opacité devient l'alpha) et reste. Vérifier que le socle importe déjà `@ucm-kit/core` ; sinon, écrire le blocage dans le rapport. Test : un contour `SOLID` visible d'opacité 0 ne produit plus de C50.

  Fait : `estLaFamilleCouleur` est dans `controles/nommage.ts`, pas dans `architecture.ts` (cycle d'import). `estInteractif` exclut `default` et `disabled` : `focus` et `selected` rendent un jeu interactif. Le relevé d'Architect marque `visible: false` une peinture d'opacité nulle ; `anneauxDuVariant` suit aussi la règle.
- [ ] **U3.2** · `implementeur-exigeant` (même appel) · D-24. `emplois/couleur.ts` : `versRgb8(c)` (borné à 0..255) et `hexaDeFigma(c, { alpha?: boolean })`, en majuscules. Remplacer `accessibilite.ts:581` et `:625`, `preparation.ts:93`, Architect `modele.ts:177`, Palettes `variables/releve.ts:44` et `:52`, Palettes `lecture.ts:352`. Mettre à jour les tests et les états de galerie qui attendaient un hexa en minuscules. Test : une composante à 1,002 rend `FF`.
- [ ] **U3.3** · `implementeur-exigeant` (même appel) · D-08. `emplois/contraste.ts` : `contrasteTronque(x, decimales = 2): number` et `ecrireContraste(x, separateur = ','): string`, par `aDixDecimales`. `ucm-couleur` garde ses noms en réexport. Remplacer `ratioAffiche` (Architect `contraste.ts:30`), `contrasteEcrit` (`diagnostic-contrastes.mjs:204`), `sansArrondi` (`accessibilite.ts:629`), `rapportEnTexte` (Architect `ui/ignores/modele.ts:160`), `contraste` (Palettes `i18n/nombres.ts:15`). Test : 4,499999999999 s'écrit `4,50` partout ; le fait `rapport` d'un constat vaut le nombre que Palettes affiche.
- [ ] **U3.4** · `implementeur` · Lignes de la loi racine : D-20 (`.visible !== false && ` suivi de `opacity` hors `releve.ts`, exception nommée `packages/plugin-palettes/src/lecture.ts`, raison « juge une peinture opaque, autre question ») ; D-24 (`Math.round(` … `* 255)` hors `emplois/couleur.ts` et `packages/couleur/src/conversions.ts`, exceptions nommées `packages/plugin-architect/src/contraste.ts` et `src/ui/valeurs.ts`, raison « composantes contrôlées avant, sans hexa ») ; D-08 (`aDixDecimales(…).split('.')`, `aDixDecimales(…).replace(`, `Math.floor(` … `* 100) / 100` hors `emplois/contraste.ts`).
- [ ] **U3.5** · `executant` · Montée de version (§2).
- [ ] **U3.6** · `verificateur` · `npm test` dans `packages/kit`, `npm run test:paquet -- couleur`, `-- architect`, `-- palettes`, `-- socle`, `npm test` racine, `npm run typecheck`.

---

### I3 · Couches, valeurs directes, scopes, modes, type, rangement (C à G, Q11, Q12)

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/tests/integrite.structure.test.ts` (nouveau). Lecture seule : `packages/plugin-architect/src/integrations/profilUcm.ts` et `packages/plugin-architect/tests/integrationsUcm.test.ts`.

- [ ] **I3.1** · `implementeur-exigeant` · Lire les règles `couche`, `valeur-directe` et `portee` de `profilUcm.ts` et leurs cas de test. Les porter dans `controlerLIntegriteUcm`, par collection reconnue :
  - **C, `genre: 'couche'`.** Une couleur dont l'alias vise une collection hors de `ciblesAdmises(collection, 'couleur')`. `type: 'corriger'`, sans correction. Une variable de `components` qui vise `brands` est jugée ici aussi : en mode Tokens, C63 ne la voit pas (`controlerLesContournements` ne tourne qu'avec un composant) ;
  - **valeur directe, `genre: 'valeur-directe'`.** Une couleur sans alias hors de `primitives` et de `components` (C63 traite `components`). Sans correction ;
  - **D, `genre: 'scopes'`.** Une variable de `COLLECTIONS_SANS_PORTEE` qui porte des scopes. Correction `sorte: 'scope'`, `apres.nom: ''` (ensemble vide). `ALL_SCOPES` compte comme un scope posé ;
  - **E, Q11, `genre: 'mode-du-theme'`.** `theme` sans mode reconnu `light`, ou sans mode reconnu `dark` (`modeDuThemeReconnu`). Fait `manque` : `light`, `dark`, ou `les-deux` quand aucun n'est reconnu (un seul constat dans ce cas). Sans correction ;
  - **F, `genre: 'type'`.** Une variable de `theme` reconnue dont le type n'est pas `COLOR`. Sans correction ;
  - **G, `genre: 'mal-rangee'`.** Une variable reconnue comme variable de palette à deux segments au moins (`surface/default`) dans `brands`, `utility`, `primitives`, `layout` ou `typography`. Fait `collection`. Sans correction.

  Tous rendent `code: 'C82'`. Les identifiants suivent le schéma de I1 : `C82:<genre>:<clé de la variable>`, plus `:<id du mode>` pour un fait par mode ; `C82:mode-du-theme:<clé de theme>:<manque>` pour E. Les limites du profil (`role-inconnu`, `cible-sans-couche`…) ne se portent pas : Nomenclature juge déjà les noms.

  Tests : un cas par genre, et chaque cas de `integrationsUcm.test.ts` pour `couche`, `valeur-directe` et `portee` rend le même verdict.
- [ ] **I3.2** · `verificateur` · `npm test` dans `packages/kit`, `npm run typecheck`.

---

### U9 · Variable supprimée (D-30)

Fichiers : `packages/plugin-architect/src/lecture.ts`, ses appelants `src/lectureDuComposant.ts`, `src/preparations.ts`, `src/sandbox/analyse.ts`, `src/sandbox/preparation.ts`, `src/sandbox/structure.ts`, `src/catalogue.ts`, `src/ui/textes/structure.ts`, tests listés. Palettes et l'Exporter ne changent pas ici.

- [x] **U9.0** (1596dd1a) · `verificateur` · Avant tout code : `node packages/plugin-architect/scripts/mesurer.mjs`, temps rangés comme référence.
- [x] **U9.1** (1596dd1a) · `implementeur-exigeant` · Dans `lecture.ts`, à côté de `lireLesVariables` :

  ```ts
  /** Une variable est supprimée quand elle n'est pas distante et que son identifiant n'est pas parmi les variables locales. */
  export function estSupprimee(variable: { readonly id: string; readonly remote?: boolean }, idsLocaux: ReadonlySet<string>): boolean;
  ```

  `lireLesVariables` reçoit un paramètre nouveau, `idsLocaux: () => Promise<ReadonlySet<string>>`, appelé au plus une fois par lecture et seulement quand une variable lue par `getVariableByIdAsync` n'est pas distante. Les six appelants le fournissent : `sandbox/structure.ts` (`ACCES_DE_FIGMA.catalogue`) passe l'ensemble des `locales` qu'il vient de lire ; `lireLeReleve` (`lecture.ts:471`) passe celles qu'il a déjà ; les autres lisent `getLocalVariablesAsync` à la demande.
- [x] **U9.2** (1596dd1a) · `implementeur-exigeant` (même appel) · Une variable lue et supprimée selon U9.1 va dans `manquees` avec l'issue nouvelle `supprimee` (à côté de `introuvable` et `refusee`), jamais dans `variables`. Cela vaut pour une cible d'alias comme pour une variable liée à un layer. `catalogueDuFichier` ne la marque donc jamais `presente`, et `controlerLesAliasesManquants` du kit rend C63 `alias-supprime` en mode Tokens.
- [x] **U9.3** (1596dd1a) · `implementeur-exigeant` (même appel) · Tests de régression : un port double où `getVariableByIdAsync` rend une variable `remote: false` absente de `getLocalVariablesAsync` ; la lecture la range en `manquees` (`supprimee`) ; `lire-structure` rend C63 `alias-supprime`. Témoin : une cible `remote: true` reste valide. Un test compte les appels à `getLocalVariablesAsync` en mode Tokens : un seul par lecture.
- [x] **U9.4** (1596dd1a) · `verificateur` · `npm run test:paquet -- architect`, `npm run typecheck`. Puis `node packages/plugin-architect/scripts/mesurer.mjs`, comparé à la mesure de référence de U9.0. L'écart va dans le rapport.
- [x] **U9.5** (1596dd1a) · `executant` · Q-13, mode Tokens seulement : dans `packages/plugin-architect/src/ui/textes/structure.ts`, `aliasSupprime` devient « Cette variable vise une variable introuvable. » et `viseUneVariableSupprimee` devient « vise une variable introuvable ». Mettre à jour les tests et les états de galerie qui citent l'ancien texte. Les textes des ignorés (`ui/textes/ignores.ts`, `ui/ignores/modele.ts`) attendent I7.4.

Fait : cinq appelants, pas six (`preparations.ts` a un homonyme sans rapport). `idsLocaux` est le quatrième paramètre, obligatoire. Reste hors du lot : le relevé riche du mode Composant (`releveDuComposant.ts`) lit ses liaisons sans passer par `lireLesVariables` ; une liaison vers une variable supprimée y reste lue comme une variable ordinaire.

---

### U10 · L'Exporter juge par le kit (Q-12)

Fichiers : `packages/plugin-exporter/src/tokens/exportTokens.ts`, tests de l'exporteur. Condition : U9.

- [ ] **U10.1** · `implementeur-exigeant` · L'Exporter construit un `CatalogueDeReference` de ses seules variables locales (`getLocalVariablesAsync`), avec leurs alias et l'état `presente`, et appelle `controlerLesAliasesManquants` du kit, exportée pour l'occasion. Une cible absente de ce catalogue, supprimée ou de library, donne `alias-supprime` comme le test local d'aujourd'hui. Le kit rend un constat par mode : l'Exporter les regroupe par variable pour garder un seul diagnostic. Chaque constat `alias-supprime` produit le diagnostic actuel (`exportTokens.ts:305-312`), texte inchangé, et la même valeur `$value: null`. Le test local de l'Exporter disparaît. Lire d'abord `packages/plugin-exporter/SPEC.md` et ses invariants : si un invariant fixe ce test local, le citer dans le rapport.
- [ ] **U10.2** · `implementeur-exigeant` (même appel) · Tests : sortie identique de l'export sur les fixtures existantes ; un alias vers une variable supprimée donne le même diagnostic qu'avant ; le test local d'appartenance à `pathById` qui produisait ce diagnostic n'existe plus.
- [ ] **U10.3** · `verificateur` · `npm run test:paquet -- exporter`, `npm run typecheck`, `npm run build:plugin -- exporter`.

---

### I4 · Préparation : cible prévue absente du thème (Q9)

Fichiers : `packages/kit/src/controles/preparation.ts`, `packages/kit/tests/preparation.test.ts`, `packages/plugin-architect/src/ui/textes/preparation.ts`, la feuille de préparation d'Architect (`src/ui/` ; domicile par `npm run agents:domicile`), `packages/plugin-architect/tests/preparation.test.ts`.

- [ ] **I4.1** · `implementeur` · `CouleurSansCible` gagne `raison: 'sans-regle' | 'absente-du-theme'` et `cible?: string`. Autour de `preparation.ts:330` : quand la variable calculée est dans `VARIABLES_DU_THEME` et que `themeAvec(cible)` ne rend rien, la couleur entre dans `couleursSansCible` avec `raison: 'absente-du-theme'` et `cible` ; les autres reçoivent `sans-regle`. Test : un composant dont une couleur vise `theme/primary/surface/subtle`, absente, rend `absente-du-theme` et le nom.
- [ ] **I4.2** · `implementeur` (même appel) · La feuille de préparation montre, pour `absente-du-theme`, les deux phrases du §5.6 à la place de la phrase « aucun token du thème ne vaut … : reste en dur » (`preparationCouleurEnDur`), dans la même ligne et la même mise en forme que cette phrase. Le cadre 4 de la maquette ne fixe que le contenu. Test d'interface sur le modèle des tests voisins de la préparation.
- [ ] **I4.3** · `verificateur` · `npm test` dans `packages/kit`, `npm run test:paquet -- architect`, `npm run typecheck`.

---

### U4 · Champs de typographie (D-07, Q-05)

Fichiers : `packages/kit/src/referentiel/` (domicile par `agents:domicile`), `packages/kit/src/controles/{couche,propagation,typographie}.ts`, `packages/plugin-architect/src/{composant,consommateurs}.ts`.

- [ ] **U4.1** · `implementeur-exigeant` · Ajouter au référentiel `CHAMPS_DE_TYPOGRAPHIE` (les huit champs Figma liables d'un texte que liste `POLICES` d'Architect, `composant.ts:87`) et `natureDuChamp(champ: string, type: string): 'couleur' | 'typographie' | 'dimension'`. Remplacer `natureDeLaLiaison` et `estUneProprieteDeTexte` (`couche.ts`), `sorteDeLaLiaison` (`propagation.ts:84`), `CHAMPS_DE_TYPOGRAPHIE` de `typographie.ts:17`, `POLICES`, `CHAMPS_DE_TEXTE` (`consommateurs.ts:126`). Pour `typographie.ts`, qui n'a que six champs : vérifier que l'ajout de `paragraphSpacing` et `paragraphIndent` ne change pas ses sorties sur les tests existants ; sinon, garder une sous-liste dérivée de la liste du référentiel et le noter. Les lecteurs `.mjs` du contrat ne changent pas. Tests : `lineHeight` est de nature `typographie` ; `textRangeFills` n'est pas de la typographie ; C80 sur une liaison `lineHeight` change de nature (test de régression).
- [ ] **U4.2** · `implementeur` · Ligne de la loi racine : une expression régulière qui contient `font` et `text`, et une liste littérale contenant `'letterSpacing'`, refusées dans `packages/*/src/` hors du propriétaire et de `packages/plugin-socle/src/` (le socle porte le contrat).
- [ ] **U4.3** · `verificateur` · `npm test` dans `packages/kit`, `npm run test:paquet -- architect`, `npm run typecheck`.

---

### I5 · Architect : lecture de la structure

Fichiers : `packages/plugin-architect/src/sandbox/structure.ts`, `packages/plugin-architect/src/ecriture/ignores.ts`, `packages/plugin-architect/tests/structure.test.ts`.

- [ ] **I5.1** · `implementeur` · Dans `traiterAvec` :
  - `Acces` gagne `reglages(contexte): Promise<{ ecriture: EcritureChoisie | null; cles: readonly string[] }>`. Celui de Figma lit l'écriture par `lireEcriture` (clé `CLE_ECRITURE` de `ESPACE_ARCHITECT`, comme `nomenclature/projection.ts`) et la liste des ignorés par `lireLesIgnores` ;
  - les constats deviennent `[...controlerLeCatalogue(catalogue), ...controlerLIntegriteUcm(catalogue, { ecriture, rolesIgnores })]`, sans doublon d'identifiant ;
  - les rôles ignorés viennent des clés préfixées de I7 (`rolesIgnoresDe(cles)`), écrite ici comme fonction vide qui rend `[]` jusqu'à I7 ;
  - `separerLesIgnores` s'applique aux constats de structure : un constat ignoré par identifiant disparaît de la réponse ;
  - `estDeStructure` accepte `variable`.

  Tests (doubles d'`Acces`) : un catalogue sans `surface/subtle` rend un C82 et sa correction ; sans écriture, le C82 est sans correction ; un constat ignoré par identifiant n'est pas envoyé ; une correction `variable` retenue part à l'écriture, une sorte inconnue reste `non-pris-en-charge`.
- [ ] **I5.2** · `verificateur` · `npm run test:paquet -- architect`, `npm run typecheck`.

---

### I6 · Architect : créer dans `theme` (Q3)

Fichiers : `packages/plugin-architect/src/ecriture/{structure,variables}.ts`, `packages/plugin-architect/tests/creationDansLeTheme.test.ts` (nouveau), `packages/plugin-architect/tests/loiDEcriture.test.ts`.

- [ ] **I6.1** · `implementeur-exigeant` · Extraire de `creerLesVariables` une fonction exportée, sans changer la préparation :

  ```ts
  /** Crée une couleur aliasée par mode et pose ses scopes ; rend la variable créée. */
  export function creerUneVariableAliasee(
    api: Pick<ApiDeVariables, 'variables'>, collection: CollectionEcrivable, nom: string,
    alias: Readonly<Record<string, VariableCreable>>, scopes?: readonly string[],
  ): VariableCreable;
  ```

  `creerLesVariables` l'appelle. Les tests de la préparation passent sans retouche.
- [ ] **I6.2** · `implementeur-exigeant` (même appel) · Dans `ecriture/structure.ts`, le filtre de `ecrireLaStructure` (`:153`) admet `variable`, et `planifier` traite `sorte: 'variable'` avant son contrôle de `cible.variable` (`:123`), qu'une création n'a pas :
  - relire : la collection de `creation.collection` existe, est locale et de rôle `theme` (`collectionUcmReconnue`), sinon `objet-change` ;
  - une variable de même nom existe dans cette collection : mêmes alias dans chaque mode et type `COLOR` → motif nouveau `deja-la` ; autre chose → motif nouveau `existe-divergente`. Aucune écriture dans les deux cas ;
  - chaque cible d'alias existe parmi les variables lisibles, sinon `cible-introuvable` ;
  - écrire par `creerUneVariableAliasee`, scopes de `creation.scopes` ; ligne de journal `{ sorte: 'creation', variable, nom, collection }`.

  `apres.nom === ''` sur une correction `scope` pose un ensemble vide (cas D de I3). `ApiDeStructure` gagne `createVariable`, `createVariableAlias` et la lecture des collections. `creerUneVariableAliasee` prend un type minimal commun aux deux appelants (`id`, `name`, `setValueForMode`, `scopes` écrivable), pas `VariableCreable` ni `VariableEcrivable` entiers. Le lot reste un seul point d'annulation pour les scopes, les alias et les créations. `annulerLeDernierLotDeStructure` défait déjà `creation` avec la garde des usages.
- [ ] **I6.3** · `implementeur-exigeant` (même appel) · Tests `creationDansLeTheme.test.ts` : deux corrections créent deux variables, alias par mode et scopes justes ; un second Appliquer saute en `deja-la` ; une variable de même nom et d'autre alias saute en `existe-divergente` ; une cible supprimée entre lecture et écriture saute en `cible-introuvable` ; l'Historique défait les créations ; une variable créée puis liée à un layer n'est pas supprimée par l'annulation (`usage-ajoute`). `loiDEcriture.test.ts` admet `createVariable` dans `creerUneVariableAliasee` seulement.
- [ ] **I6.4** · `verificateur` · `npm run test:paquet -- architect`, `npm run typecheck`, `npm run build:plugin -- architect`.

---

### U5 · Format et contrat (D-05, D-06, D-13, D-28, D-29, Q-04)

Fichiers : `packages/kit/src/format/{names,version,tokens}.ts`, `packages/kit/src/lecteurs/{version-contrat,modes-tokens,typography-token-types}.mjs`, `packages/kit/src/referentiel/vocabulaire.ts`, `packages/kit/tests/version-contrat.test.mjs`, `packages/plugin-exporter/src/tokens/exportTokens.ts`, `packages/cli/src/{tokens-css,init}.mjs`, `packages/adapter-typescript/src/generation.mjs`, `tests/referentielUnique.test.ts`.

- [x] **U5.1** (22032e53) · `implementeur` · D-28 : `VERSION_CONTRAT_MAXIMALE` vaut `CONTRACT_VERSION`, importé de `format/version.ts` ; `VERSION_CONTRAT_MINIMALE` se déclare à côté. Test : égalité des deux ; le littéral `"14.0"` du test disparaît.
- [ ] **U5.2** · `implementeur` (même appel) · D-29 : `format/tokens.ts` exporte `EXTENSION_MODES_TOKENS = 'com.ucm.modes'`, `EXTENSION_SURCHARGES_TOKENS = 'com.ucm.extensions'`, `MODE_DE_BASE = 'base'`. Remplacer les littéraux de `exportTokens.ts:365-368` et `:792-795`, `modes-tokens.mjs:22-25` et `:56-70`, `typography-token-types.mjs:47-49`, `tokens-css.mjs:246-248`, `:295`, `:353-396`, `init.mjs:374`. Sortie identique : les tests du CLI et de l'exporteur passent sans retouche.
- [ ] **U5.3** · `implementeur` (même appel) · D-05 : `estUneValeurDesactivee` devient `termeReconnu(REGISTRE_ETATS, valeur)?.id === 'disabled'`. Lire d'abord `packages/kit/invariants/` : si `format/` ne peut pas importer `referentiel/`, s'arrêter et le dire. Test d'égalité sur les termes et tolérés du registre. D-06, Q-04 : `tiny` toléré de `xs`, `huge` toléré de `xl` dans `REGISTRE_TAILLES` ; `SIZE_VALUES` devient la projection du registre ; `tests/referentielUnique.test.ts` vérifie cette projection. Le contrat d'un axe `Size=Tiny|Huge` reste `size`.
- [ ] **U5.4** · `implementeur` · D-13 : `pascal` de `generation.mjs` disparaît au profit de `codeIdentifier`. Tests : une prop `libellé` donne un type qui contient `Libelle` ; noter dans le rapport le nom rendu pour une prop `2xl`, que la conversation principale juge avant commit. L'adaptateur monte en mineure.
- [ ] **U5.5** · `implementeur` · Lignes de la loi racine : D-29 (littéraux `'com.ucm.` et `"com.ucm.` hors `format/tokens.ts`) ; D-13 (une fonction `pascal`, ou `toUpperCase()` après `[^a-zA-Z0-9]`, dans `packages/adapter-typescript/src/` et `packages/cli/src/`).
- [ ] **U5.6** · `verificateur` · `npm test` dans `packages/kit`, `npm run test:paquet -- cli`, `-- adapter`, `-- exporter`, `npm test` racine, `npm run typecheck`, `npm run build`.

---

### I7 · Ignorer une variable ou un rôle (Q6)

Fichiers : `packages/plugin-architect/src/ecriture/ignores.ts`, `packages/plugin-architect/src/sandbox/` (domaine des ignorés), `packages/plugin-architect/src/messages/`, `packages/plugin-architect/src/ui/ignores/`, `packages/plugin-architect/src/ui/structure/{corrections,aFaire}.ts`, `packages/plugin-architect/src/ui/textes/{structure,ignores}.ts`, tests voisins. Condition : M1 validée, P0.2 tenu.

- [ ] **I7.1** · `implementeur` · Dans `ecriture/ignores.ts`, à côté de `cleDeLaProposition` :

  ```ts
  const PREFIXE_DU_ROLE = 'role-ucm:';
  export const cleDUnRoleIgnore = (role: VariableDuTheme): string => `${PREFIXE_DU_ROLE}${role}`;
  export function rolesIgnoresDe(cles: readonly string[]): VariableDuTheme[];   // remplace la fonction vide de I5
  export function ignorerUnRole(api: PortDIgnores, role: VariableDuTheme): ResultatDIgnorer;
  export function retablirUnRole(api: PortDIgnores, role: VariableDuTheme): ResultatDIgnorer;
  ```

  `constatsIgnores` écarte aussi ces clés. Messages nouveaux sur le modèle de l'Ignorer actuel : `ignorer-role` et `retablir-role`. Après l'écriture, la structure se relit (`lire-structure`).
- [ ] **I7.2** · `implementeur` (même appel) · L'Ignorer actuel (`sandbox/ignores.ts:35-45`) cherche le constat dans l'analyse d'un composant ; un C82 n'y est pas. Le domaine `structure` gagne ses messages `ignorer-constat-de-structure` et `retablir-constat-de-structure`, qui retrouvent le constat parmi ceux du dernier `structure` envoyé, appellent `ignorerUnConstat`, puis relisent la structure. Interface, selon M1 : le menu Ignorer d'une carte C82 `variable-absente` offre « Pour cette palette » (ce message) et « Dans tout le fichier » (`ignorer-role`). Le panneau des ignorés liste un rôle ignoré avec la phrase du §5.5 et Rétablir. Textes du §5.5 mot pour mot.
- [ ] **I7.3** · `implementeur` (même appel) · Tests : un rôle ignoré ne produit plus de constat à la lecture suivante ; Rétablir le fait revenir ; une variable ignorée pour une palette laisse les autres palettes ; un fichier non UCM refuse en `non-ucm`.
- [ ] **I7.4** · `executant` · Q-13 dans les ignorés : « vise une variable supprimée » devient « vise une variable introuvable » dans `ui/textes/ignores.ts` et `ui/ignores/modele.ts`. Tests et galerie suivent.
- [ ] **I7.5** · `verificateur` · `npm run test:paquet -- architect`, `npm run typecheck`.

---

### I8 · Interface du mode Tokens

Fichiers : `packages/plugin-architect/src/ui/structure/{lecture,corrections,aFaire,index}.ts`, `packages/plugin-architect/src/ui/nomenclature/` (liste des renommages et son état de sélection), `packages/plugin-architect/src/ui/textes/structure.ts`, `packages/plugin-architect/src/ui/styles/` (si M1 l'exige), `packages/plugin-architect/galerie/etats/structure.cjs`, `packages/plugin-architect/galerie/fixtures/`. Condition : M1 validée.

- [ ] **I8.1** · `implementeur-exigeant` · `lecture.ts` :
  - `lireLesCorrections` rend aussi `variables: CarteDeVariables[]` (une carte par rôle : identifiant du kit, crans par mode, scopes, lignes par palette avec le nom créé et les cibles par mode) et `crans: CarteDeCrans[]` (une carte par rôle et par mode : cran lu, cran attendu, lignes par palette) ;
  - `lireLesConstats` lit les genres C82 sans correction. `GroupeDeConstat` gagne `manquantes`, `types`, `rangement` ; `couche` et `valeur-directe` vont dans `couches`, `mode-du-theme` dans `modes`. L'ordre de `GROUPES` suit M1 ;
  - un C82 avec question (sens inconnu) devient une carte de À faire avec ses deux candidats en faits, comme les autres constats à question de structure.
- [ ] **I8.2** · `implementeur-exigeant` (même appel) · `corrections.ts` et `aFaire.ts` posent les cartes de M1, à la largeur et dans la forme des cartes de modes et de scopes. Les lignes de variables manquantes et de scopes arrivent cochées ; les lignes de crans arrivent décochées (Q-14). Un bouton « Tout désélectionner », posé par la coquille de l'onglet (`ui/structure/index.ts`), appelle une méthode `toutDecocher()` ajoutée à la liste de structure et à celle des renommages de Nomenclature ; chacune se recompte et son pied suit. Le pied dit « de structure ». Après une application qui a créé au moins une variable, la ligne de réussite ajoute la phrase de Q10 (§5.4). Textes du §5 mot pour mot.
- [ ] **I8.3** · `implementeur` · Galerie : états nouveaux dans `structure.cjs`, fixtures tirées de la fixture du kit (I1.2) : variables manquantes (22 lignes), crans, sans écriture choisie, sens inconnu, rôle ignoré, après application avec création. Chaque état est atteignable hors de Figma.
- [ ] **I8.4** · `verificateur` · `npm run galerie:plugin -- architect`, `node packages/plugin-architect/galerie/comparer-maquette.cjs` contre M1, `npm run test:paquet -- architect`, `npm run typecheck`. Pas de `test:ui`.
- [ ] **I8.5** · conversation principale · Relire les captures de la galerie contre M1, au pixel. Écarts → retour à I8.2.

---

### U6 · Copies identiques du kit (D-09, D-10, D-11, D-27, Q-06)

Fichiers : `packages/kit/src/emplois/{garanties,contraste,dossiers}.ts`, `packages/kit/src/controles/theme.ts`, `packages/plugin-palettes/src/{ui/modeleDesGaranties,ui/nuancier,planche/modele,presentation}.ts`, `packages/hub/src/{modele/modele,vues/page}.ts`, `packages/couleur/planche/{page.js,generer-planche.ts}`, tests de Palettes cités.

- [ ] **U6.1** · `implementeur` · D-11 : `etatDuFond(fond: FondDeGarantie): Etat | 'page' | 'carte'` dans `emplois/garanties.ts` ; remplace `colonneDuFond` (`modeleDesGaranties.ts:24`), `fondsGardes` (hub `modele.ts:258`), l'expression de `estFondDeSurface` (`theme.ts:93`).
- [ ] **U6.2** · `implementeur` (même appel) · D-10 : `encreLisible(fond: Rgb8): 'noir' | 'blanc'` dans `emplois/contraste.ts`, noir à égalité. Remplace `encreSur` du hub (`page.ts:127`), `planche/modele.ts:204`, la pastille de `nuancier.ts:827`. `nuancier.ts:113` reste (autre question).
- [ ] **U6.3** · `implementeur` (même appel) · D-27 : `variablesDuDossier(dossier): readonly VariableDePalette[]` dans `emplois/dossiers.ts` ; remplace les littéraux de `planche/modele.ts:361-363` et `presentation.ts:285-292`.
- [ ] **U6.4** · `implementeur` · D-09, Q-06 : `generer-planche.ts` injecte dans la page le corps de `contraste` et d'`encreLisible` du kit (texte de la fonction compilée), à la place des copies de `page.js:6-19`. Les tests du navigateur de Palettes (`interface.test.mjs:263`, `:5497`, `roueDesTeintes.test.ts:98`) gardent leur copie ; un test compare chaque copie au kit sur une grille de couleurs.
- [ ] **U6.5** · `implementeur` · Lignes de la loi racine : D-11 (`endsWith('/hover')`, `endsWith('/pressed')`) ; D-10 (`contraste(…, [0, 0, 0]) >= contraste(…, [255, 255, 255])` et l'inverse) ; D-27 (`'solid/default', 'solid/hover'` et `'page/foreground', 'page/border'` hors domiciles) ; D-09 (`0.2126` hors `emplois/contraste.ts`, exceptions nommées pour les copies de test de U6.4).
- [ ] **U6.6** · `verificateur` · `npm run vues`, puis `npm test` dans `packages/kit`, `npm run test:paquet -- palettes`, `-- hub`, `-- couleur`, `npm run typecheck`.

---

### I9 · Retrait du profil sans écran (Q12)

Fichiers : `packages/plugin-architect/src/integrations/` (supprimé), `packages/plugin-architect/tests/{integrationsUcm.test.ts,fixturesDesLimites.ts,loiDEcriture.test.ts}`.

- [ ] **I9.1** · `implementeur` · Vérifier par `grep` qu'aucun fichier de `src/` n'importe `integrations/profilUcm.ts` ni `integrations/palettes.ts`. Si un import existe, s'arrêter et le dire. Sinon : supprimer le dossier `src/integrations/` et `tests/integrationsUcm.test.ts` ; retirer l'import de type de `tests/fixturesDesLimites.ts` (remplacer le type par sa forme locale si un test l'utilise encore) ; retirer de `loiDEcriture.test.ts` l'assertion sur le balayage de `src/integrations/`. D-26 (`estIdentite`) disparaît avec le fichier.
- [ ] **I9.2** · `verificateur` · `npm run test:paquet -- architect`, `npm run typecheck`, `npm run build:plugin -- architect`.

---

### U7 · Plugins et hub (D-12, D-14, D-15, D-21, D-22, D-23, D-25, Q-07, Q-09, Q-10)

Fichiers : `packages/plugin-socle/src/composant/contract/nodeBindings.ts`, `packages/plugin-architect/src/imbriquesDuReleve.ts`, `packages/plugin-architect/tests/imbriquesParLeKit.test.ts`, `packages/plugin-palettes/src/{ecriture/variables,variables/*}.ts`, `packages/plugin-architect/src/nomenclature/session.ts`, `packages/couleur/src/` (gris), `packages/hub/src/{modele/modele,vues/page}.ts`, `packages/couleur/planche/generer-planche.ts`.

- [ ] **U7.1** · `implementeur` · D-21, Q-09 : `DIMENSIONS_DE_LAYOUT` exportée de `nodeBindings.ts` ; `imbriquesDuReleve.ts:26` l'importe ; le comptage reste double (écart documenté dans l'en-tête). `imbriquesParLeKit.test.ts` refuse `BINDING_PATTERNS.gap, BINDING_PATTERNS.paddingX` hors `nodeBindings.ts`.
- [ ] **U7.2** · `implementeur` · D-22 : `memeNomFigma(a, b)` dans `packages/plugin-palettes/src/variables/` ; remplace les huit comparaisons `toLowerCase()` de la fiche. D-23 côté Palettes : `ecriture/variables.ts:107` et `variables/lot.ts:169` passent à `modeDuThemeReconnu` (avec l'index du vocabulaire du fichier s'il est à portée, sans sinon) ; retirer les deux exceptions posées en U1.5. Ligne de loi D-22 dans `tests/reglesUniques.test.ts`.
- [ ] **U7.3** · `implementeur` · D-25, Q-10 : `motsDe` de `session.ts:92` découpe par `decouperSegment` (en minuscules) ; `motsDuTermeUcm` retrouve un terme par `termeReconnu` sur `REGISTRES`. Test : `foregroundMain` donne deux mots, et `employe` rend vrai sur un lexique qui contient `foreground main`. Ligne de loi : `.split(/[\s-]+/` refusé dans `src/nomenclature/`.
- [ ] **U7.4** · `implementeur` · Hub et planche. D-12 : `estReferenceGrise(reference: Rgb8): boolean` dans `ucm-couleur`, seuil de chroma 0,05 ; `familleTailwindProche` et `modele.ts:112` l'appellent ; `FAMILLES_GRISES` exportée une fois, importée par le hub et `generer-planche.ts`. D-14, Q-07 : les termes de statut passent par `REGISTRE_STATUTS`, les teintes restent au hub. D-15 : les libellés d'états du hub viennent de `libelle.fr` de `REGISTRE_ETATS`. Lignes de loi : `.C < 0.0` dans `packages/hub/src/` et `packages/plugin-*/src/` ; les libellés dans `referentielUnique.test.ts`.
- [ ] **U7.5** · `verificateur` · `npm run vues`, `npm run test:paquet -- socle`, `-- architect`, `-- palettes`, `-- hub`, `-- couleur`, `npm run typecheck`.

---

### U8 · Tests qui recopient des règles (D-16)

Fichiers : `tests/{loisEntreProduits.test.ts,fabriquesDeFichiers.ts,nomsDePalettes.test.ts,referentielUnique.test.ts}`, `packages/couleur/tests/*`, `packages/couleur/scripts/mesurer-temps.mjs`.

- [ ] **U8.1** · `implementeur` · `tests/loisEntreProduits.test.ts` (`:51`, `:99`, `:206-208`, `:260`, `:297`, `:402`) compare par `formeReconnue` au lieu de `toLowerCase()`. Ajouter une fixture en camel (`foregroundMain`) qui passe.
- [ ] **U8.2** · `executant` · Remplacer les littéraux par les imports, liste fermée : les cinq variables de `fabriquesDeFichiers.ts:194` par `VARIABLES_DU_THEME` ; les onze crans de `nomsDePalettes.test.ts:32`, des tests de `packages/couleur/tests/` (`architecture`, `enveloppe`, `proprietes`, `rampe`, `recette`, `vecteurs`) et de `mesurer-temps.mjs:22` par `CRANS` ; `ETATS` de `referentielUnique.test.ts:23` par l'import ; `COULEUR_DU_TEXTE_DES_BOUTONS` de `promesses.test.ts:177` par l'import ; les copies d'`ecrireHexa` de `base.test.ts:177`, `ancrage.test.ts:134`, `intensites.test.ts:62`, `reconstruction.test.ts:68` par l'import. Rien d'autre.
- [ ] **U8.3** · `implementeur` · `tests/referentielUnique.test.ts` balaie aussi `tests/` racine, avec une liste d'exceptions nommées (le détecteur lui-même).
- [ ] **U8.4** · `verificateur` · `npm test`, `npm run typecheck`.

---

### D · Documents

Agent : conversation principale pour chaque phrase d'autorité (skills `rediger-pour-agents` et `rediger-sans-tics-ia`) ; `executant` pour les renvois.

- [ ] **D1** · conversation principale · Architect : `packages/plugin-architect/SPEC.md` (lignes « Créer » et tableau des écritures : création dans `theme` depuis le mode Tokens ; retrait de « Modules sans écran » ; C82 et ses genres) ; `invariants/explorateur.md` (l'invariant « ne crée que les variables manquantes de `components` » gagne la création de structure dans `theme`, avec son autorité `src/ecriture/structure.ts` et son test `tests/creationDansLeTheme.test.ts`) ; `CARTE.md` (dossier `integrations/` retiré).
- [ ] **D2** · conversation principale · Kit : l'invariant du domicile de `controles/` décrit `controlerLIntegriteUcm` et sa séparation de `controlerLeCatalogue` ; `CARTE.md` du kit (`integrite.ts`, `emplois/couleur.ts`) ; `invariants/referentiel.md` si un propriétaire nouveau y entre.
- [ ] **D3** · conversation principale · Règles dupliquées : les quatre passages de « Documents en contradiction » (FORMAT.md:91 et ses deux voisins pour `État` ; FORMAT.md:183 et `couleurs.md:10` sont tenus par U3 ; `tokens-et-variables.md:7` est tenu par U5). Une entrée de `docs/format/CHANGELOG-FORMAT.md` si l'axe `État` change le contrat publié. `README.md` du dossier : questions marquées retenues, renvoi vers ce plan. Socle et exporteur : invariant de la variable supprimée (U9).
- [ ] **D4** · `executant` · Renvois listés par `npm run agents:diff` : chemins supprimés ou renommés (`integrations/`, `cleDuTheme`, `pascal`).
- [ ] **D5** · conversation principale · CONCEPTION.md : en tête, « implémenté », avec le renvoi à ce plan. ROADMAP.md si une ligne cite ce travail.

---

### V · Vérification complète

- [ ] **V1** · `verificateur` · `npm test`, `npm run typecheck`, `npm run build`, `npm run vues` (rien ne doit changer après), `npm run agents:diff`.
- [ ] **V2** · conversation principale · Relire le tableau, et les documents que `agents:diff` liste.

### T · Recette du mainteneur dans Figma

Agent : le mainteneur. Préparation par la conversation principale : `npm run build:plugin -- architect`, puis `npm run build` ([Build désynchronisé de Palettes] : la galerie ne reconstruit que `ui.html`).

- [ ] **T1** Mode Tokens sur le fichier des tokens : 23 lignes cochées sous « Variables manquantes » (`surface/subtle`, `surface/divider`, `neutral/page/foreground`) ; cartes « Crans » conformes au tableau de I2, décochées ; « Tout désélectionner » décoche tout ; Appliquer ; les variables existent avec leurs alias et leurs scopes ; la ligne de réussite demande de publier ; l'Historique défait le lot.
- [ ] **T2** Ignorer `surface/divider` dans tout le fichier, puis Rétablir.
- [ ] **T3** Mode Composant : la préparation d'un composant qui vise une variable absente montre la phrase de Q9.
- [ ] **T4** Les 13 variables de `components` qui visent des variables supprimées : C63 « vise une variable introuvable » en mode Tokens (U9). Le mode Composant reste silencieux sur ce cas (§1.3). L'Exporter garde son diagnostic (U10).
- [ ] **T5** Non-régression de l'audit : un jeu `Color=Error` lié à `Color/Danger/…` sans faux constat ; un axe `Status` lu comme axe d'états ; un contour d'opacité nulle sans C50.

### C · Correction après la recette

- [ ] **C1** · agent du lot fautif · Un sous-lot par écart, avec son test de régression. Retour à T pour le seul point touché.

### Z · Publication et fin

- [ ] **Z1** · conversation principale · Skill `publier-paquets` : `@ucm-kit/core`, `@ucm-kit/adapter-typescript` (U5), `@ucm-kit/cli` si U5 l'a touché.
- [ ] **Z2** · conversation principale · Chaque sous-lot coché porte son hash. Pousser sur `main`.

## 5. Textes destinés au designer

À valider par M1. Une phrase, un fait. Les noms gardent l'écriture de Figma et d'UCM : `theme`, `brands`, `Light`, `Dark`, `Frame fill`. On écrit « scope », jamais « portée ».

### 5.1 Corrections, variables manquantes

| Clé | Texte |
|---|---|
| `groupeVariablesManquantes` | Variables manquantes |
| `creerDansPalettes(role, n)` | Créer `{role}` dans {n} palette(s) de theme |
| `prevueDansChaquePalette` | UCM prévoit cette variable dans chaque palette. |
| `viseLesCrans(light, dark)` | En Light elle vise le cran {light}, en Dark le cran {dark}. |
| `viseLesCouleurs(light, dark)` | En Light elle vise {light}, en Dark {dark}. |
| `absente` | absente |
| `scopesDeLaVariable` | Scopes : {liste} |

### 5.2 Corrections, crans

| Clé | Texte |
|---|---|
| `groupeCrans` | Crans |
| `viserLeCran(cran, role, mode)` | Viser le cran {cran} pour `{role}` en {mode} |
| `attendLeCranAujourdhui(mode, attendu, lu)` | En {mode}, UCM attend le cran {attendu}. Aujourd'hui elle vise le cran {lu}. |
| `changeLaCouleur` | Cette correction change la couleur affichée. |
| `toutDeselectionner` | Tout désélectionner |

### 5.3 À faire dans Figma

| Genre | Phrase | Où le régler |
|---|---|---|
| `variable-absente`, `sans-jumelle` | Cette palette n'a pas `{role}`. Aucune de ses variables n'a d'alias vers brands ou utility. | Créez `{role}` dans la fenêtre Variables |
| `variable-absente`, `sans-ecriture` | Cette palette n'a pas `{role}`. | Choisissez l'écriture des noms dans Nomenclature. Architect pourra alors la créer |
| `variable-absente`, `prefixes-multiples` | Cette palette n'a pas `{role}`. Ses variables visent plusieurs rampes. | Créez `{role}` dans la fenêtre Variables |
| `cran-absent` | La rampe `{rampe}` n'a pas le cran {cran}. | Ajoutez ce cran avec UCM Palettes |
| `cran` avec question | UCM ne sait pas si cette palette met un texte blanc ou noir sur ses boutons. | Choisissez la cible dans la fenêtre Variables |
| `couche` | Cette couleur vise {collection}. UCM attend {attendues}. | Choisissez une cible dans {attendues} dans la fenêtre Variables |
| `valeur-directe` | Cette couleur n'est pas un alias. | Liez-la à une couleur de {attendues} dans la fenêtre Variables |
| `mode-du-theme` | La collection theme n'a pas de mode {mode}. | Ajoutez un mode {mode} à theme dans la fenêtre Variables |
| `mode-du-theme`, `les-deux` | La collection theme n'a ni mode Light ni mode Dark. | Nommez ses modes Light et Dark dans la fenêtre Variables |
| `type` | Cette variable du thème n'est pas une couleur. | Recréez-la en couleur dans la fenêtre Variables |
| `mal-rangee` | Cette variable du thème est rangée dans {collection}. | Déplacez-la dans theme dans la fenêtre Variables |

Intertitres : « Variables manquantes », « Couches », « Modes », « Types », « Rangement ».

### 5.4 Application

| Clé | Texte |
|---|---|
| pied | Appliquer écrit {n} correction(s) de structure |
| réussite | {n} correction(s) écrite(s). |
| réussite avec création (Q10) | Publiez la library pour voir ces variables dans les fichiers de composants. |

### 5.5 Ignorer

| Clé | Texte |
|---|---|
| `ignorerPourLaPalette` | Pour cette palette |
| `ignorerDansLeFichier` | Dans tout le fichier |
| `roleIgnore(role)` | `{role}` : ignorée dans tout le fichier. |

### 5.6 Préparation d'un composant (Q9)

| Clé | Texte |
|---|---|
| `absenteDuTheme(nom)` | `{nom}` manque dans le thème. |
| `creerDepuisTokens` | Créez-la depuis le mode Tokens. |

## 6. Questions ouvertes

Aucune. Q-12, Q-13 et Q-14 sont tranchées au §1.
