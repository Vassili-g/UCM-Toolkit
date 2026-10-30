# Ajouter les règles manquantes d'une instance remplie

UCM Architect signale C45 quand l'instance de règles d'un composant ne documente pas une de ses propriétés. La correction ajoute les règles manquantes en conservant les textes et l'ordre des règles présentes. Elle reconstruit la section concernée hors de l'arbre, puis remplace l'ancienne à sa place. Les règles posées portent le marqueur `[À compléter]` : l'analyse suivante les signale par C44, « à rédiger ».

Le cas était hors du plan d'Architect (§10, C47, « sonde S-3 avant »). Le mainteneur lève la sonde : la recette se fait directement dans le plugin.

## 1. Décisions

| Id | Décision |
|---|---|
| D1 | Selon C1.2, une section du même tag est reconstruite hors de l'arbre avec les textes relus et les règles manquantes, puis remplace l'ancienne à son index dans `Sections-Wrapper`. Sans section du tag, la section neuve suit l'ordre `usage`, `prop`, `boolean`, `icons`. Aucune règle ne s'ajoute dans le slot d'une section déjà rangée : ce geste laisse une coquille qui fait lever tout parcours du conteneur (`plugin-exporter/SPEC.md`, « Comment l'écriture range une règle »). La mise en forme interne des textes ne se recopie pas. |
| D2 | Aucun retrait. Une règle qui vise une propriété absente (C45 `sans-propriete`) garde son constat sans correction. |
| D3 | Une valeur absente d'un axe déjà documenté compte : C45 gagne l'écart `sans-valeur`, une ligne par axe. |
| D4 | L'Exporter ne change pas. Son offre de création reste nulle quand le conteneur existe. |
| D5 | Le kit n'est pas touché : pas de nouvelle version. Tout vit dans le socle et dans Architect. |
| D6 | Pas de sonde S-3. L'essai du mainteneur sur Button (lot T1), placé dès que le bouton existe, vaut preuve. |

## 2. Ce que l'existant fait déjà

- `plugin-socle/src/composant/template/modele.ts` : `modeleDeRegles(nom, contrat)` rend le modèle complet. Une section par tag, dans l'ordre `usage`, `prop`, `boolean`, `icons`. Une règle `@prop` vise `axe.valeur`, une règle `@boolean` vise la clé. Un séparateur sépare deux axes.
- `plugin-socle/src/composant/template/ecriture.ts` : `creerLesRegles` vide le slot des sections, puis pose tout le modèle. `poserUneSection` remplit une section hors de l'arbre, puis la range par `appendChild` dans le slot du conteneur. Seul fichier du moteur qui écrit dans Figma.
- `plugin-socle/src/composant/contract/extractRules.ts` : une règle dont un calque lu porte le marqueur est écartée (`nEstPasRedigee`, ligne 562) et ne figure ni dans `propDescriptions` ni dans `booleanDescriptions`. Elle produit l'avertissement « contient encore [À compléter] », que le moteur rend en C44.
- `plugin-architect/src/regles.ts` : `constatsDeRegles` rend C43 (sans instance, correction `regles` / `creer`) et C45 par propriété (`sans-regle`, `sans-propriete`). `documentees` compare des noms de propriétés, jamais des valeurs. `retenirLesModeles` ne retient un modèle que pour C43.
- `plugin-architect/src/ecriture/regles.ts` : `ecrireLesRegles` saute `ajouter` et `retirer` avec le motif `instance-remplie`.
- `plugin-architect/src/ui/corrections/modele.ts` : une correction `regles` fait une carte de la section `regles`, de clé `regles:${correction.id}`, phrase `creerLesRegles`, méta `reglesMeta`.

Sans le lot S2, une règle ajoutée reste invisible pour C45 tant qu'elle est marquée : le constat et la correction reviendraient après l'ajout, et un second Appliquer poserait les règles en double.

## 3. Règles d'exécution

- Un lot par appel d'agent. Le prompt contient la fiche du lot, copiée telle quelle, et la sortie de `npm run agents:lire -- <chemins du lot>`. Rien d'autre.
- Au plus deux agents à la fois. Les vagues du §4 disent ce qui peut tourner ensemble.
- L'agent ne commite pas. La conversation principale relit le diff, coche le lot avec son hash, commite par chemins explicites (`git commit -- <chemins>`), sans pousser.
- Des sessions voisines modifient l'arbre. `git status` avant chaque lot ; ne jamais ajouter un fichier qu'un autre lot ou une autre session a modifié.
- Les textes destinés au designer sont fixés dans ce plan (§7). L'agent les recopie mot pour mot.
- Tout test nouveau échoue avant le code qui le fait passer.

## 4. Vagues

| Vague | Lots | Après |
|---|---|---|
| 1 | S1, S2 | – |
| 2 | S3, A1 | S1 ; A1 attend aussi S2 |
| 3 | A2, U1 | S3 et A1 ; U1 attend A1 seul |
| 4 | T0, puis **T1 : essai du mainteneur** | A2, U1 |
| 5 | C1 si T1 échoue | T1 |
| 6 | D1, V1, puis F1 | T1 tenu |

T1 arrive au plus tôt : le bouton n'existe dans le plugin qu'avec A2, l'écriture, et U1, la carte. Aucun document n'est retouché avant T1, puisque l'essai peut changer le geste d'écriture.

## 5. Lots

### S1 · Différence entre le modèle et l'instance

Agent : `implementeur` (Sonnet). Fichiers : `packages/plugin-socle/src/composant/template/modele.ts`, `packages/plugin-socle/tests/reglesManquantes.test.ts` (nouveau).

- [x] **S1.1** (cabb1ea2) Écrire les tests rouges de `reglesManquantes`, décrits en S1.3. Le fichier de test suit la forme des tests voisins de `packages/plugin-socle/tests/`, découverts par `build/run-tests.cjs`.
- [x] **S1.2** (cabb1ea2) Ajouter à `modele.ts`, sans toucher aux fonctions existantes :

  ```ts
  /** Compacte une cible de règle pour la comparer : sans espaces, en minuscules. */
  export function cibleCompacte(cible: string): string;

  /**
   * Le modèle réduit aux règles que l'instance ne porte pas encore.
   * `presentes` : les cibles déjà posées, rédigées ou non, compactées par `cibleCompacte`.
   */
  export function reglesManquantes(modele: ModeleDeRegles, presentes: ReadonlySet<string>): ModeleDeRegles;
  ```

  Règles de calcul :
  - seules les règles `prop` et `boolean` qui ont une `cible` sont comparées ; `usage` et `icons` ne sont jamais rendues ;
  - une règle est manquante quand `cibleCompacte(element.cible)` n'est pas dans `presentes` ;
  - une section sans règle manquante disparaît ;
  - dans la section `prop`, les règles gardent l'ordre du modèle, et un séparateur se pose seulement entre deux règles manquantes d'axes différents. L'axe d'une cible est ce qui précède son dernier point ;
  - `nom` est celui du modèle reçu.

  `cibleCompacte` retire tous les espaces et passe en minuscules. Ne pas importer `nomCompacte` du kit : le point doit rester.
- [x] **S1.3** (cabb1ea2) Tests, sur un modèle construit par `modeleDeRegles('Button', contrat)` avec `props: { size: enum [sm, md], disabled: boolean }` et `stateModel: { axis: 'state', states: { default, hover, focus } }` :
  1. `presentes` vide : rend toutes les sections `prop` et `boolean`, sans `usage` ni `icons` ;
  2. tout présent : `sections` vide ;
  3. `size.sm`, `size.md`, `state.default`, `disabled` présents : une section `prop` qui porte `state.hover` puis `state.focus`, sans séparateur ;
  4. `size.md` et `state.default` présents : `size.sm`, un séparateur, `state.hover`, `state.focus` ;
  5. `presentes` contient `State.Hover` compacté, et `state.hover` n'est pas rendu ;
  6. `disabled` absent, le reste présent : une seule section `boolean`.
- [x] **S1.4** (cabb1ea2) `npm run test:paquet -- socle` passe. `npm run typecheck` passe.

Fait quand : les six tests passent et aucune fonction existante de `modele.ts` n'a changé.

### S2 · Lire les cibles des règles non rédigées

Agent : `implementeur` (Sonnet). Fichiers : `packages/plugin-socle/src/composant/contract/extractRules.ts`, le type de son résultat, un test du socle voisin des tests existants d'`extractRules`.

- [x] **S2.1** (cabb1ea2) Trouver le type du résultat d'`extractRules` (champ `propDescriptions`, ligne 604) et y ajouter :

  ```ts
  /**
   * Les cibles des règles `@prop` et `@boolean` encore marquées « [À compléter] » :
   * présentes dans l'instance, absentes du contrat. Texte du calque `prop`, tel qu'écrit.
   */
  ciblesNonRedigees: string[];
  ```

  Le résultat vide (ligne 505) le porte à `[]`.
- [x] **S2.2** (cabb1ea2) Dans la boucle, à la branche `nEstPasRedigee` (ligne 562), avant `continue` : quand `tag` vaut `prop` ou `boolean`, lire `textOfLayer(instance, CALQUES_DU_KIT_DE_REGLES.cible)`. Si le texte n'est pas vide après `trim()` et ne porte pas le marqueur (`porteLeMarqueur`), l'ajouter à `ciblesNonRedigees`. Rien d'autre ne change : l'avertissement C44, `entries`, `propDescriptions` et `booleanDescriptions` restent identiques.
- [x] **S2.3** (cabb1ea2) Test : une instance de règles avec une règle `@prop` rédigée (`size.sm`), une règle `@prop` marquée de cible `state.hover`, une règle `@boolean` marquée de cible `disabled`, une règle `@usage` marquée. Attendu : `ciblesNonRedigees` vaut `['state.hover', 'disabled']`, `propDescriptions` ne contient que `size`, l'avertissement du marqueur est toujours rendu. Reprendre les doubles de nodes des tests existants d'`extractRules`.
- [x] **S2.4** (cabb1ea2) `npm run test:paquet -- socle`, `npm run test:paquet -- exporter`, `npm run test:paquet -- architect` et `npm run typecheck` passent. Un test qui compare le résultat entier d'`extractRules` reçoit `ciblesNonRedigees: []`, et rien d'autre ne change.

Fait quand : le contrat publié par l'Exporter ne change pour aucune fixture.

### S3 · Écrire les règles manquantes dans une instance remplie

Agent : `implementeur` (Sonnet). Après S1. Fichiers : `packages/plugin-socle/src/composant/template/ecriture.ts`, `packages/plugin-socle/tests/ajoutDesRegles.test.ts` (nouveau).

Lire d'abord l'en-tête d'`ecriture.ts` et la section « Comment l'écriture range une règle » de `packages/plugin-exporter/SPEC.md`. Les trois règles d'écriture s'appliquent sans exception.

- [x] **S3.1** (cabb1ea2) Ajouter et exporter :

  ```ts
  /**
   * Pose les règles manquantes dans un conteneur déjà rempli : une section neuve
   * par tag, rangée juste après la dernière section existante du même tag.
   * Ne vide rien, n'écrit pas `component-name`, ne déplace pas le conteneur.
   */
  export async function ajouterLesRegles(
    conteneur: InstanceNode,
    manquantes: ModeleDeRegles,
    sources: SourcesDeCreation,
    annoncer: Annonce,
  ): Promise<ResultatDeCreation>;
  ```

- [x] **S3.2** (cabb1ea2) Extraire de `poserUneSection` la construction hors de l'arbre (création de l'instance de section, `viderLeSlot` de ses règles, `poserUnElement` pour chaque élément) dans une fonction privée `remplirUneSection(section, sources, enAttente): Promise<InstanceNode>`. `poserUneSection` l'appelle, puis range comme avant. `creerLesRegles` ne change pas de comportement.
- [x] **S3.3** (cabb1ea2) `ajouterLesRegles` :
  1. annonce `Vérification des polices…`, puis charge les polices du maître et des variantes, comme `creerLesRegles` ;
  2. pour chaque section de `manquantes`, annonce `Règles ajoutées : n sur total…`, remplit la section par `remplirUneSection`, puis calcule sa place dans `(await slotFrais(conteneur, SLOT_DES_SECTIONS)).children` : l'index qui suit la dernière section dont `await enfant.getMainComponentAsync()` a l'id de `sources.sections.get(tag)`. Sans section de ce tag, l'index qui suit la dernière section d'un tag placé avant dans l'ordre `usage`, `prop`, `boolean`, `icons`. Sans aucune des deux, 0 ;
  3. range par `insertChild(index, instance)` sur le slot retrouvé juste avant, retire l'instance de `enAttente`, puis pose `layoutSizingHorizontal = 'FILL'` sur la section rangée, retrouvée par son index dans le slot relu ;
  4. rend `{ conteneur, regles: nombreDeRegles(manquantes) }`.
- [x] **S3.4** (cabb1ea2) En cas d'erreur : retirer chaque node de `enAttente`, plus chaque section déjà rangée par cet appel, retrouvée par son id (`figma.getNodeByIdAsync`). Ne jamais supprimer le conteneur. Lever `Error` dont le message garde la cause, suivie de ` Les règles déjà rédigées n’ont pas été touchées.`
- [x] **S3.5** (cabb1ea2) Tests, avec des doubles de Figma qui tracent les appels (`appendChild`, `insertChild`, `remove`, écriture de `characters`). S'inspirer de `packages/plugin-architect/tests/ecritureDesRegles.test.ts` et des doubles existants du socle :
  1. conteneur avec sections `usage`, `prop`, `icons` ; ajout d'une section `prop` à deux règles : rangée à l'index 2, aucun `remove` sur le conteneur ni sur ses sections d'avant, `component-name` jamais écrit ;
  2. ajout d'une section `boolean` absente du conteneur : rangée après la section `prop` ;
  3. une erreur pendant la deuxième section : la première, déjà rangée, est retirée ; le conteneur reste ; le message porte la phrase de S3.4 ;
  4. `creerLesRegles` : les tests existants passent sans changement.
- [x] **S3.6** (cabb1ea2) `npm run test:paquet -- socle`, `npm run test:paquet -- exporter` (dont `loiDuDocumentIntact.test.ts`) et `npm run typecheck` passent.

Fait quand : l'écriture ne range une règle que dans une section hors de l'arbre, et ne range une section que dans le slot du conteneur.

### A1 · C45 par valeur et correction `ajouter`

Agent : `implementeur` (Sonnet). Après S1 et S2. Fichiers : `packages/plugin-architect/src/regles.ts`, `packages/plugin-architect/tests/regles.test.ts`, le fichier où se construit le relevé passé à `constatsDeRegles` s'il n'est pas `regles.ts`.

- [x] **A1.1** (cabb1ea2) `ReleveDesRegles` gagne :

  ```ts
  /** Les cibles des règles déjà posées, rédigées ou non, compactées par `cibleCompacte`. */
  readonly presentes: readonly string[];
  /** Les règles que le modèle pose et que l'instance ne porte pas. Vide sans instance. */
  readonly manquantes: ModeleDeRegles;
  ```

  `lireLesRegles` les remplit : `presentes` est l'union de `axe.valeur` pour chaque entrée de `lues.propDescriptions` (clé, puis chaque clé de valeur), des clés de `lues.booleanDescriptions` et de `lues.ciblesNonRedigees`, chacune passée par `cibleCompacte`. `manquantes` vaut `reglesManquantes(modele, new Set(presentes))` quand l'instance est présente, sinon `{ nom: composant.name, sections: [] }`. `documentees` inclut aussi les axes ou clés tirés de `ciblesNonRedigees` (ce qui précède le dernier point pour une cible `@prop`, la cible entière pour `@boolean`).
- [x] **A1.2** (cabb1ea2) `constatsDeRegles`, instance présente :
  - pour chaque axe d'une section `prop` de `manquantes` dont l'axe figure dans `documentees` : un constat `regles:C45:sans-valeur:<axe>`, code `C45`, type `corriger`, famille `regles`, `faits: { composant, propriete: axe, valeurs: 'focus, pressed', ecart: 'sans-valeur' }`. Les valeurs sont celles des cibles manquantes, dans l'ordre du modèle, jointes par `', '` ;
  - les constats `sans-regle` et `sans-propriete` ne changent pas ;
  - chaque constat `sans-regle` et `sans-valeur` porte une correction :

    ```ts
    {
      id: `regles:ajouter:${composant.id}:${propriete}`,
      sorte: 'regles',
      cible: { layer: composant.id },
      avant: null,
      apres: { nom: 'ajouter' },
      aRelire: { regle: 'regles', avant: null },
    }
    ```

    et ses faits gagnent `regles: <nombre de règles manquantes de cette propriété>`.
- [x] **A1.3** (cabb1ea2) `retenirLesModeles` retient aussi, pour chaque correction `ajouter`, le modèle réduit à la propriété de la correction : les sections de `manquantes` filtrées aux règles dont la cible est la propriété (`@boolean`) ou commence par `propriete.` (`@prop`), séparateurs retirés. L'identifiant est celui de la correction. Le modèle de C43 reste retenu comme avant.
- [x] **A1.4** (cabb1ea2) Tests dans `regles.test.ts` :
  1. instance présente, `state` absent de `documentees` : C45 `sans-regle` avec correction `regles:ajouter:<id>:state`, `faits.regles` = nombre de valeurs de l'axe ;
  2. `state.default` documenté, `state.hover` et `state.focus` absents : un C45 `sans-valeur`, `faits.valeurs = 'hover, focus'`, avec correction ;
  3. `state.hover` présent seulement dans `ciblesNonRedigees` : pas de C45 pour `hover` ;
  4. tout documenté : aucun C45 ;
  5. `sans-propriete` : aucune correction ;
  6. sans instance : C43 seul, comme avant ;
  7. `retenirLesModeles` rend le modèle réduit sous l'identifiant de chaque correction `ajouter`.
- [x] **A1.5** (cabb1ea2) `npm run test:paquet -- architect` et `npm run typecheck` passent. Les autres tests d'Architect qui construisent un `ReleveDesRegles` reçoivent les deux champs.

Fait quand : après un ajout, une règle marquée ne relance ni C45 ni sa correction.

### A2 · Écrire les corrections `ajouter`

Agent : `implementeur` (Sonnet). Après S3 et A1. Fichiers : `packages/plugin-architect/src/ecriture/regles.ts`, `packages/plugin-architect/tests/ecritureDesRegles.test.ts`.

- [x] **A2.1** (cabb1ea2) `PortDEcritureDesRegles` gagne `ajouter: typeof ajouterLesRegles` et `conteneur(composant: Composant): Promise<InstanceNode | null>`, l'instance de règles qui écrit le nom du composant. Dans `PORT_DE_FIGMA`, la retrouver par le relevé d'`extractRules` si le résultat la porte ; sinon parcourir les instances de la page du composant dont le maître est `.componentRules` et dont le calque `component-name` vaut le nom du composant, comparé par `nomCompacte`. Lire `extractRules.ts` avant de choisir.
- [x] **A2.2** (cabb1ea2) `ecrireLesRegles` traite `ajouter` :
  - regrouper les corrections `ajouter` cochées par `cible.layer`. Un composant donne un seul appel d'écriture ;
  - relire le composant (`objet-change` s'il manque) et le relevé. Sans conteneur : chaque correction du groupe saute `objet-change` ;
  - relire l'instance par `extractRules`, recalculer `presentes` comme A1.1, fusionner les modèles retenus du groupe dans l'ordre `prop`, `boolean`, puis appliquer `reglesManquantes` sur la fusion. Une correction dont toutes les règles sont déjà présentes saute `objet-change`. Un modèle absent de `modeles` saute `objet-change` ;
  - `resoudre` sans sources : `erreur` pour chaque correction du groupe ;
  - appeler `port.ajouter(conteneur, fusion, sources, annoncer)`, puis mettre dans `ecrites` chaque correction du groupe qui avait une règle à poser ; une erreur levée saute tout le groupe en `erreur`.
  - `retirer` saute toujours `instance-remplie`. `creer` ne change pas.
- [x] **A2.3** (cabb1ea2) Mettre à jour l'en-tête du fichier : retirer « Une instance déjà remplie n'est jamais complétée ni allégée, faute de sonde… », écrire que `ajouter` pose les règles manquantes par `ajouterLesRegles` et que `retirer` reste refusé (`instance-remplie`).
- [x] **A2.4** (cabb1ea2) Tests :
  1. remplacer le test « ajout et retrait sur une instance remplie » : `retirer` saute `instance-remplie` ; `ajouter` appelle `port.ajouter` une fois et rend `ecrites: ['a']` ;
  2. deux corrections `ajouter` du même composant : un seul appel à `port.ajouter`, modèle fusionné, les deux dans `ecrites` ;
  3. second passage, relevé qui porte déjà toutes les cibles : `port.ajouter` jamais appelé, saut `objet-change` ;
  4. sans conteneur : `objet-change` ;
  5. `port.ajouter` lève : `erreur` pour tout le groupe.
- [x] **A2.5** (cabb1ea2) `npm run test:paquet -- architect` passe, `tests/loiDEcriture.test.ts` compris.

Fait quand : deux clics successifs sur Appliquer ne posent jamais une règle deux fois.

### U1 · Carte et textes

Agent : `implementeur` (Sonnet). Après A1. Fichiers : `packages/plugin-architect/src/ui/corrections/modele.ts`, `packages/plugin-architect/src/ui/textes/corrections.ts`, `packages/plugin-architect/src/ui/textes/ignores.ts`, `packages/plugin-architect/src/ui/ignores/modele.ts`, un test d'interface voisin (`tests/interface/corrections.test.mjs` ou le test de modèle des cartes).

- [x] **U1.1** (cabb1ea2) `genreDe` : une correction `regles` dont `apres.nom` vaut `ajouter` prend la clé `regles:ajouter:${correction.cible.layer}`. Toutes les propriétés d'un composant forment ainsi une carte, une ligne par correction, chacune cochable.
- [x] **U1.2** (cabb1ea2) `carteDe`, genre `regles` : quand la première correction est `ajouter`, la phrase est `T.ajouterLesRegles(contexte.composant)` et la méta `T.reglesAjouteesMeta(total)`, où `total` est la somme des `faits.regles` des constats de la carte. Chaque ligne nomme sa propriété : `faits.propriete` seul pour `sans-regle`, `T.valeursDeLaPropriete(propriete, valeurs)` pour `sans-valeur`. Lire comment `index.ts` rend les lignes d'une carte `regles` avant de choisir le champ de `LigneDeCarte` à remplir.
- [x] **U1.3** (cabb1ea2) Ajouter dans `textes/corrections.ts` les textes du §7.1, dans `textes/ignores.ts` ceux du §7.2. `ignores/modele.ts`, cas `C45` : l'écart `sans-valeur` rend `T.valeursSansRegle(...)` avec `T.valeursSansRegleStatut(...)`.
- [x] **U1.4** (cabb1ea2) Test : un panneau avec un C45 `sans-regle` (`disabled`) et un C45 `sans-valeur` (`state`, `hover, focus`) du même composant donne une carte de la section `regles`, deux lignes, phrase et méta du §7.1.
- [x] **U1.5** (cabb1ea2) `npm run test:paquet -- architect` passe. Ne pas lancer `test:ui` : le mainteneur teste l'interface.

Fait quand : la carte ne montre aucun texte absent du §7.

### T0 · Construire pour l'essai

Agent : `verificateur` (Haiku). Après A2 et U1.

- [x] **T0.1** (cebd66a1) `npm run test:paquet -- socle`, `npm run test:paquet -- architect`, `npm run test:paquet -- exporter`, puis `npm run build:plugin -- architect` et `npm run build:plugin -- exporter`. Rendre un tableau : commande, résultat, premières lignes de chaque échec.
- [x] **T0.2** (cabb1ea2) Conversation principale : relire les diffs de S1 à U1, commiter par chemins explicites, puis prévenir le mainteneur que T1 est prêt.

### T1 · Essai du mainteneur dans Figma

Le mainteneur, dès T0 tenu. Fichier de test : Button, qui a déjà son instance de règles sans règle pour `state`.

- [ ] **T1.1** Recharger UCM Architect. Analyser Button. La carte « Ajouter les règles manquantes de Button » liste `state`. Appliquer.
- [ ] **T1.2** Dans Figma : la section `@prop` reconstruite occupe la place de l'ancienne. Les règles déjà présentes gardent leurs cibles, leurs descriptions et leur ordre ; les règles ajoutées visent `state.<valeur>` et portent `[À compléter]`. Une valeur manquante suit les autres valeurs du même axe ; un axe absent s'ajoute à la fin, précédé d'un divider. La mise en forme interne (gras, lien) ne se recopie pas.
- [ ] **T1.3** Ctrl+Z défait l'ajout d'un coup. Ctrl+Shift+Z le refait.
- [ ] **T1.4** Actualiser : plus de C45 sur `state`. C44 signale les règles à rédiger.
- [ ] **T1.5** Supprimer une des règles ajoutées, actualiser : C45 `sans-valeur` nomme cette seule valeur. Appliquer : une seule règle ajoutée.
- [ ] **T1.6** Sans fermer Figma, ouvrir l'Exporter et analyser Button : aucune erreur « The node … does not exist ».
- [ ] **T1.7** Rédiger une règle ajoutée, actualiser dans Architect : C44 compte une règle de moins.
- [ ] **T1.8** Rendre le résultat : étapes tenues, et pour chaque échec le message affiché ou une capture.

### C1 · Correction après l'essai

**Retour du mainteneur (29/10, T1).** L'ajout fonctionne et les règles se lisent. Le geste ne convient pas : une section `@prop` neuve après la section `@prop` existante sépare des règles qui vont ensemble. Les règles ajoutées entrent dans la section du même tag quand elle existe. Les règles d'un même axe restent réunies, et un divider sépare deux axes :

```
@prop
- variant.1
- variant.2
-- divider
- color.1
- color.2
```

Une section entière ne se crée que si aucune section de ce tag n'existe. D1 change : « section neuve » devient « section du même tag, reconstruite ».

**Fiche C1.1 · Compléter la section existante** (agent : `implementeur-exigeant`, lot fautif S3). Fichiers : `packages/plugin-socle/src/composant/template/ecriture.ts`, `packages/plugin-socle/tests/ajoutDesRegles.test.ts`.

Une règle ne se range jamais dans le slot d'une section déjà rangée : la coquille de « Comment l'écriture range une règle » reste interdite. La section se complète sur une copie hors de l'arbre :

- [ ] **C1.1.1** (remplacé par C1.2) Section du tag présente dans le slot du conteneur (`placeDeLaSection` la trouve déjà) : `copie = section.clone()`, puis sortir la copie de l'arbre du conteneur (`figma.currentPage.appendChild(copie)` si `clone()` l'a laissée dans le slot) et l'ajouter à `enAttente`.
- [ ] **C1.1.2** (remplacé par C1.2) Dans le slot `Rules-Wrapper` de la copie, relu juste avant chaque écriture, insérer les éléments manquants de ce tag. Section `prop` : une valeur d'un axe déjà présent va juste après la dernière règle de cet axe, sans divider ; un axe absent va à la fin, précédé d'un divider (`sources.separateur`) si la section porte déjà une règle ; deux axes absents gardent l'ordre du modèle, un divider entre eux. L'axe d'une règle existante se lit sur son calque de cible (`CALQUES_DU_KIT_DE_REGLES.cible`), compacté par `cibleCompacte`, ce qui précède le dernier point. Section `boolean` : les règles manquantes vont à la fin, dans l'ordre du modèle, sans divider. `FILL` sur chaque règle posée.
- [ ] **C1.1.3** (remplacé par C1.2) Ranger la copie dans le slot du conteneur par `insertChild` à l'index de l'ancienne section, relu, puis retirer l'ancienne section, retrouvée juste avant par son index (`index + 1`) et le maître de son tag. `FILL` sur la copie rangée. L'ancienne section n'est retirée qu'une fois la copie rangée.
- [ ] **C1.1.4** (remplacé par C1.2) Erreur avant le retrait de l'ancienne section : retirer la copie et ce qui reste dans `enAttente` ; l'ancienne section et ses règles restent intactes. Le message garde la phrase de S3.4.
- [ ] **C1.1.5** (remplacé par C1.2) Section du tag absente : comportement de S3, inchangé (section neuve, rangée après la dernière section d'un tag placé avant).
- [ ] **C1.1.6** (remplacé par C1.2) Tests, doubles qui tracent `clone`, `appendChild`, `insertChild`, `remove` :
  1. section `prop` avec `size.sm`, `size.md` ; manquent `state.default`, `state.hover` : la copie porte `size.sm`, `size.md`, divider, `state.default`, `state.hover` ; elle est rangée à l'index de l'ancienne, qui est retirée ; aucune insertion dans le slot de l'ancienne section ;
  2. section `prop` avec `state.default`, divider, `size.sm` ; manque `state.hover` : la copie porte `state.default`, `state.hover`, divider, `size.sm` ;
  3. section `boolean` existante : la règle manquante va à la fin ;
  4. section `boolean` absente : section neuve, comme S3 ;
  5. erreur pendant le remplissage de la copie : l'ancienne section n'a reçu aucun `remove`, la copie est retirée ;
  6. les règles déjà écrites de l'ancienne section gardent leur texte dans la copie (le double de `clone` copie les textes).
- [ ] **C1.1.7** (remplacé par C1.2) `npm run test:paquet -- socle`, `-- exporter`, `-- architect`, `npm run typecheck`, puis `npm run build:plugin -- architect` et `-- exporter`.

**Retour du mainteneur (29/10, T1 du correctif C1.1).** La section complétée s'affiche avec les règles et le texte du designer, mais Architect déclare `color`, `variant` et `size` sans règle. Le rapport (`6 Recette v2/ucm-architect-rapport-Button-2026-10-29-14-31-20.json`) montre que chaque règle de la copie lève « The node … I1282:1794;713:1220 does not exist » quand on lit son parent : `1282:1794` est l'id de la copie posée sur la page. Une section déjà remplie de règles, copiée puis rangée dans le slot du conteneur, garde des chemins morts. Le clone est abandonné.

**Fiche C1.2 · Reconstruire la section au lieu de la copier** (agent : `implementeur-exigeant`). Fichiers : `packages/plugin-socle/src/composant/template/ecriture.ts`, `packages/plugin-socle/src/composant/template/modele.ts` (type `ElementDeModele`), `packages/plugin-socle/tests/ajoutDesRegles.test.ts`.

- [x] **C1.2.1** (cabb1ea2) Retirer le geste de C1.1 (`clone()`, déplacement de la copie sur la page).
- [x] **C1.2.2** (cabb1ea2) Section du tag présente : relire ses enfants dans l'ordre, avant toute écriture. Pour chaque règle, garder son tag, le texte de son calque de cible et celui de son calque de description, tels qu'écrits, marqueur compris ; pour un divider, garder sa place.
- [x] **C1.2.3** (cabb1ea2) Construire un `SectionDeModele` : les règles relues, puis les règles manquantes à leur place selon la règle de C1.1.2 (valeur d'un axe présent après la dernière règle de cet axe, axe absent à la fin précédé d'un divider, `boolean` à la fin). Une règle relue porte son texte (`ElementDeModele` gagne un texte facultatif) ; `poserUnElement` l'écrit à la place du marqueur, avec la relecture de chaque écriture que demande l'en-tête d'`ecriture.ts`.
- [x] **C1.2.4** (cabb1ea2) Remplir cette section neuve hors de l'arbre par `remplirUneSection`, la ranger par `insertChild` à l'index de l'ancienne, relu, puis retirer l'ancienne, retrouvée juste avant par son index et le maître de son tag. C'est le geste de la création, mesuré dans Figma.
- [x] **C1.2.5** (cabb1ea2) Erreur avant le retrait de l'ancienne : retirer la section neuve et `enAttente` ; l'ancienne reste intacte.
- [x] **C1.2.6** (cabb1ea2) Tests : les cas de C1.1.6, plus : le texte de cible et de description de chaque règle relue se retrouve à l'identique dans la section neuve ; aucun `clone` n'est appelé ; aucune règle n'est rangée dans le slot d'une section déjà rangée.
- [x] **C1.2.7** (cebd66a1) `npm run test:paquet -- socle`, `-- exporter`, `-- architect`, `npm run typecheck`, `npm run build:plugin -- architect` et `-- exporter`.

Limite acceptée par le mainteneur : une mise en forme à l'intérieur d'un texte de règle (gras, lien) ne se recopie pas.

Puis T1 se rejoue sur les étapes 2, 3, 5 et 6 (section complétée, Ctrl+Z d'un coup, une seule règle ajoutée, Exporter sans erreur).

Seulement si T1 échoue. La conversation principale lit le retour, cherche la cause et écrit la fiche du correctif dans ce plan. Puis elle confie le correctif à l'agent du lot fautif : S3 pour un geste d'écriture, A1 ou A2 pour un constat ou un double, U1 pour la carte. T0 et T1 se rejouent ensuite sur les étapes en échec.

Repli prévu si T1.6 lève, c'est-à-dire si `insertChild` laisse une coquille : ranger la section neuve par `appendChild`, à la fin du slot, le seul geste déjà mesuré. La décision D1 et l'attendu T1.2 devront alors décrire cette position.

### D1 · Documents

Agent : `executant` (Haiku). Après T1 tenu. Remplacements exacts, rien d'autre.

- [x] **D1.1** (52869579) `packages/plugin-architect/invariants/explorateur.md` décrit l'ajout selon C1.2 : section du tag reconstruite à sa place, textes conservés sans leur mise en forme interne ; sans section du tag, insertion dans l'ordre des tags ; second passage sans ajout ; `retirer` saute `instance-remplie` (`src/ecriture/regles.ts`).
- [x] **D1.2** (52869579) `packages/plugin-exporter/invariants/ecriture-dans-le-document.md` : rien à changer, vérifier seulement que la phrase sur `ecriture.ts` reste vraie.
- [x] **D1.3** (52869579) `docs/notes/Recherches/UCM Architect/3 Plan/PLAN-IMPLEMENTATION.md`, §10 : supprimer la ligne « C47 : compléter une instance de règles remplie ». Au §7, remplacer « **S-3 · Slot rempli**, hors de ce plan : avant C47. » par « **S-3 · Slot rempli** : levée par le mainteneur le 29/10, voir `7 Règles manquantes/`. ».
- [x] **D1.4** (52869579) `packages/plugin-architect/SPEC.md` : chercher le passage qui décrit C43 et C45. Ajouter, après lui, le paragraphe du §7.3.
- [x] **D1.5** (52869579) `npm run agents:diff` : rendre la liste des documents signalés, sans les modifier.

Fait : D1 suit C1.2. Une section présente est reconstruite à sa place avec les textes relus ; la mise en forme interne ne se recopie pas. Le paragraphe de la spec décrit cette écriture.

### V1 · Vérifications

Agent : `verificateur` (Haiku). Après D1.

- [x] **V1.1** (cebd66a1 ; suite complète du workflow 41036066317 réussie) `npm run test:paquet -- socle`, `-- exporter`, `-- architect`, `npm test`, `npm run typecheck`, `npm run build:plugin -- architect`, `npm run build:plugin -- exporter`. Rendre un tableau : commande, résultat, premières lignes de chaque échec.

Les preuves locales et distantes sur cebd66a1 sont acquises. Après une correction issue de T1, reprendre les tests du paquet corrigé, puis `npm test`, `npm run typecheck` et les builds des plugins en toute fin. Aucun `npm run test:ui` par l'agent.

### F1 · Relecture et commit

Conversation principale.

- [x] **F1.1** (cabb1ea2) Relire le diff de chaque lot ; vérifier qu'aucun texte hors du §7 n'apparaît dans l'interface.
- [x] **F1.2** (52869579) `npm run agents:diff`, relire les documents listés.
- [x] **F1.3** (cebd66a1) Commits par chemins explicites, un par lot ou par paire de lots d'une même vague. Le push de cebd66a1 a déjà eu lieu. Aucun autre push avant la fin du plan ; la recette v2 reste à rejouer par le mainteneur.

## 6. Estimation

Complexité d'ensemble : moyenne. Quatre lots sont petits ou mécaniques. La difficulté tient à S3, A1 et A2, et au geste d'écriture que seul T1 prouve.

| Lot | Complexité | Durée de l'agent | Risque principal |
|---|---|---|---|
| S1 | faible : une fonction pure, six tests | 10 à 15 min | aucun |
| S2 | faible : un champ ajouté | 10 à 15 min | doubles de nodes d'`extractRules` à reprendre |
| S3 | moyenne à forte : écriture Figma | 25 à 40 min | les doubles du socle ne servent peut-être ni `insertChild` ni `getMainComponentAsync` |
| A1 | moyenne : constats, relevé, modèles retenus | 25 à 35 min | les tests qui construisent un `ReleveDesRegles` à compléter |
| A2 | moyenne : regroupement, relecture, port | 25 à 35 min | retrouver le conteneur du composant |
| U1 | faible à moyenne : carte et textes | 15 à 25 min | le rendu des lignes d'une carte `regles` |
| T0 | vérifications et build | 10 à 15 min | – |
| D1, V1, F1 | mécanique | 30 min en tout | – |

Les durées incluent la relecture du diff par la conversation principale. Avec deux agents à la fois :

- **jusqu'à T1 : environ 2 h** (vague 1 : 15 min, vague 2 : 40 min, vague 3 : 35 min, T0 et commits : 25 min) ;
- **T1 : 15 à 20 min** pour le mainteneur ;
- **après un T1 tenu : 30 à 40 min**. Si T1 échoue, C1 ajoute 30 min à 1 h, plus un second essai.

Au total : 2 h 45 à 4 h selon le résultat de T1.

## 7. Textes

### 7.1 Carte de correction (`textes/corrections.ts`)

```ts
ajouterLesRegles: (composant: string): string => `Ajouter les règles manquantes ${de(composant)}`,
reglesAjouteesMeta: (regles: number): string => `${regles} règle${pluriel(regles)} marquée${pluriel(regles)} [À compléter]. Rédigez-les ensuite dans Figma.`,
valeursDeLaPropriete: (propriete: string, valeurs: string): string => `${propriete} : ${valeurs}`,
aucuneRegle: 'aucune règle',
```

La colonne « Aujourd'hui » d'une ligne d'ajout montre `aucuneRegle` en puce neutre, pas en chemin (choix du mainteneur, 29/10, après T1).

### 7.2 Constat C45 par valeur (`textes/ignores.ts`)

```ts
valeursSansRegle: (propriete: string, valeurs: string): string => (valeurs.includes(',')
  ? `Les valeurs ${valeurs} de \`${propriete}\` n’ont pas de règle.`
  : `La valeur ${valeurs} de \`${propriete}\` n’a pas de règle.`),
valeursSansRegleStatut: (valeurs: string): string => (valeurs.includes(',') ? 'Ajoutez leurs règles @prop' : 'Ajoutez sa règle @prop'),
```

### 7.3 Paragraphe de `SPEC.md`

La [spécification d'Architect](../../../../../packages/plugin-architect/SPEC.md#analyse-et-corrections)
décrit C43, C45, l'ajout dans une section reconstruite et la conservation des
textes sans leur mise en forme interne (C1.2).
