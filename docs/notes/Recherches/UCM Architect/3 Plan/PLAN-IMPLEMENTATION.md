Formule à respecter pour tous les agents:
"Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better."


# Plan d'implémentation de UCM Architect

Lecteur : l'orchestrateur, la conversation principale de Claude Code. Aucun
agent ne lit ce plan. Un agent reçoit le socle commun (§4.5) et la fiche de son
lot, copiés tels quels dans son prompt.

Version 5. Elle intègre la revue d'Opus du 22 octobre et la revue de Codex
([REVUE-CODEX-DU-PLAN.md](./REVUE-CODEX-DU-PLAN.md), constats A1 à A17), et les
réponses du mainteneur aux questions Q-1 à Q-5.

Sources, de la plus forte à la plus faible :

1. La [maquette](../2%20Maquettes/MAQUETTE-ARCHITECT.html), version
   `6cf27974` : écrans, textes et comportements. Un écart entre la maquette et
   une décision du §2 arrête l'orchestrateur (§4.9).
2. Les décisions du §2.
3. Le [document préparatoire](../1%20Conception/PREPARATION-ARCHITECT.md), la
   [grammaire des composants](../1%20Conception/GRAMMAIRE-DES-COMPOSANTS.md) et
   l'[aperçu de la génération](../1%20Conception/APERCU-GENERATION-TOKENS-COMPOSANT.md), pour une
   règle que la maquette ne montre pas. Les numéros C, T et G y renvoient.

## 1. Fin du plan

- UCM Architect remplace l'explorateur et Nomenclature, dans
  `packages/plugin-architect`.
- Chaque cadre retenu au manifeste des cadres (§4.10) existe en état de galerie
  de même identifiant, et le comparateur ne relève aucun écart.
- `npm test`, `npm run typecheck` et `npm run build` passent ; le mainteneur a
  lancé `test:ui` et sa recette.
- Le commit final est poussé, la CI distante passe, puis le kit, la CLI et
  l'adaptateur sont publiés depuis ce commit.
- Le §9 rend au mainteneur les choix faits sans lui.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Plugin | UCM Architect remplace l'explorateur et Nomenclature. Il garde l'identifiant de manifeste de l'explorateur. Paquet `ucm-architect-plugin`, dossier `packages/plugin-architect` |
| Nom | « UCM Architect » partout : manifeste, barre, textes, galeries, guides, cartes, CI, scripts, produits du kit. « UCM Token Explorer », « UCM Nomenclature » et « UCM Token Architect » disparaissent du code et des documents vivants ; seuls les gardent les Archives, les notes de recherche passées, les journaux de version et les messages de commit. La clé `ESPACE_ARCHITECT` reste |
| Périmètre | Contrôles et corrections pour un fichier déclaré UCM. Ailleurs : navigation seule, sans renommage, et l'alerte de `t-hors` (M-10). Le sandbox relit la déclaration avant chaque contrôle et chaque écriture |
| Écriture | Seulement par `src/ecriture/` |
| Exactitude | Une correction n'est proposée que si une règle écrite la tire d'un fait lu, avec un seul candidat. Le reste devient une question, sans réponse cochée. Un survol lié au token du repos devient une question (M-15) |
| Annulation | Une écriture sur des variables passe par le journal et l'Historique. Une écriture sur un composant se défait par Ctrl+Z, un point d'annulation par lot |
| Échec partiel | Une écriture qui échoue est sautée ; les autres s'écrivent ; la ligne de réussite compte les sautées et dit pourquoi. Ctrl+Z défait le lot entier |
| Moteur de l'exporteur | Dans le socle, `plugin-socle/src/composant/`. Les contrôles nouveaux, purs, vont dans le kit |
| Lecteurs | Le moteur rend les points de l'export. La lecture de l'explorateur, étendue, rend le relevé du composant. Le catalogue des collections de référence est une donnée à part (note N2) |
| Analyse | Une opération à la fois. Chaque analyse a une identité : sujet (clé du jeu de variants) et génération. Une réponse d'une génération périmée est ignorée. Après une écriture, un Ctrl+Z ou une sélection extérieure d'un autre composant, le panneau se dit périmé jusqu'à Actualiser ou Analyser. Un clic sur un constat garde le sujet |
| Sélection | Changée au clic sur un constat, jamais ailleurs, par `src/ecriture/selection.ts` |
| Onglets | Tokens : Corrections, Questions, À faire dans Figma, Règles. Composant : les trois premiers. Intégrations, Relevés, Comparer et Diagnostics disparaissent. Dépendants devient « Utilisée par » dans la fiche. `integrations/profilUcm.ts` et `lireLaRecette` restent |
| Inspecteur | Remplacé par la fiche d'une variable (`t-fiche`) (M-3) |
| Fenêtres | Tokens 1360 × 800, barre latérale 640 px. Composant 520 × 760 panneau fermé, par défaut ; 1040 × 760 ouvert ; frontière tirable |
| Ouverture | Le plugin s'ouvre en mode Composant quand un composant est sélectionné, en mode Tokens sinon. La bascule change de mode |
| Bouton du panneau | « Constats », icône du panneau, pastille du nombre dans la couleur du plus grave (M-18) |
| Section Variants | Forme C pour tout composant ; le lien Tableau croise deux properties (M-14) |
| Alertes | Bloquant, À corriger, À vérifier, Information, Tenu : couleur, icône et mot, liseré gauche |
| Langage visuel | Vocabulaire des signaux dans le kit, styles et composants dans le socle. Valeurs : `2 Maquettes/architect.css`. Palettes et l'exporteur migrent hors de ce plan |
| Mots | Termes de Figma et d'UCM en anglais (CONTRIBUTING.md), même pour un Figma en français (M-17). Variant écrit `Severity=info, Variant=standard`. Aucun « · » dans les textes d'Architect. « Tableau des tokens ». Français seulement |
| Recherche | Du texte dans le champ de l'arbre ; préfixes `terme:` et `vise:` |
| Thème | Sombre, quel que soit le thème de Figma |
| Grammaire | `components/composant/famille/[élément]/[palette/style/taille/état]/rôle ou propriété`, reconnue par positions facultatives, pas par une liste de formes. `padding`, `gap`, `width`, `height`, `border-width` dans un registre propre à `components` (remplace G-8). Tailles d'icône dans `layout/icon` |
| Préparation des tokens | Couleurs puis tailles ; intensité exacte s'il n'y en a qu'une, sinon une question ; axes et éléments par question. Le mot « plan » n'apparaît pas à l'écran. Identité, destination et reprise : note P |
| Règles reçues | Des questions, en tête de l'onglet Questions (`t-regle`) |
| Lien vers le fichier des tokens | Seulement si `figma.fileKey` est servi ; voir la sonde S-4 |
| Accessibilité | Seuils WCAG : texte 4,5:1 en AA et 7:1 en AAA ; grand texte (≥ 24 px, ou ≥ 18,66 px en graisse ≥ 700) 3:1 en AA et 4,5:1 en AAA ; comparaison sans arrondi. Cible, anneau UCM et texte sous 12 px : des recommandations, car le dessin Figma ne prouve pas la cible réelle |
| Push et publication | Un seul push, à J-F, après la recette (Q-1). Puis CI distante, puis publication depuis ce commit |
| Gestes du mainteneur | Il lance `test:ui`, les sondes et les recettes, et migre les fichiers Figma réels |

Principes : le plus simple qui tient les critères ; déplacer par `git mv` avant
de réécrire ; une analyse partielle, annulée ou en échec ne dit jamais « aucun
constat » ; aucun geste manuel du designer inventé.

## 3. Lois qui changent

| Loi | Après | Lot |
|---|---|---|
| Document intact de l'exporteur (`plugin-exporter/tests/loiDuDocumentIntact.test.ts`) | Balaie aussi `plugin-socle/src/composant/` ; `template/ecriture.ts` reste la seule écriture ; importeurs permis : exporteur, puis Architect | S0, B7 |
| Lecture seule de l'explorateur (`tests/loiDeLectureSeule.test.ts`) | Remplacée par la loi d'écriture d'Architect | A0.2 |
| Écriture de Nomenclature (`plugin-nomenclature/tests/loiDEcriture.test.ts`) | Suit ses fichiers dans Architect, mêmes attendus | A0.2 |
| Écriture d'Architect | Hors de `src/ecriture/` : aucune écriture, aucun changement de sélection ou de vue, aucun import de `template/ecriture` | A0.2 |
| Import de variables | Seule `src/lecture.ts` importe ; B3 l'étend aux valeurs d'une library, B10 au catalogue | B3, B10 |
| Paquets séparés, manifestes, kit compilé (`tests/pluginsSepares.test.ts`, `tests/manifestsDesPlugins.test.ts`, `tests/kitCompileAJour.test.mjs`) | Trois plugins | A0.1, A0.2 |
| Textes écrits, loi des textes (`tests/textesEcrits.test.mjs`, `plugin-explorateur/tests/loiDesTextes.test.ts`) | Lisent les catalogues découpés `src/ui/textes/*.ts` | A1 |
| Vocabulaire de Figma | Nouvelle loi : les catalogues d'Architect refusent les traductions listées (portée, calque, fond de cadre…) et le glyphe « · », sauf une liste d'exceptions que les lots U vident | A1, U1 à U8 |

## 4. Méthode

### 4.1 Pistes

Une piste = un ensemble de fichiers. Deux lots de pistes différentes n'écrivent
jamais le même fichier, sauf les exceptions nommées dans une fiche.

| Piste | Écrit seulement | Exécutant par défaut |
|---|---|---|
| K · kit | `packages/kit/**` hors `package.json` ; la vue illustrée du référentiel (`docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel.ts` et sa sortie) quand un lot change `PRODUITS` ou une définition | Codex, dans son clone ; sinon `implementeur` |
| V · versions | `packages/{kit,cli,adapter-typescript}/package.json`, leurs README, le `README.md` racine (pins), `package-lock.json` | orchestrateur, à chaque synchronisation |
| S · socle | `packages/plugin-socle/**` ; `plugin-exporter` en S0 et S3 | `implementeur-exigeant` |
| B · sandbox | `plugin-architect/src/**` hors `src/ui/`, ses tests hors `tests/interface/` | `implementeur` (Claude 2) |
| U · interface | `plugin-architect/src/ui/**`, `galerie/**`, `tests/interface/**` | `implementeur-exigeant` (Claude 1) |
| X · autres plugins | textes de `plugin-exporter` et `plugin-palettes` qui nomment l'explorateur ou Nomenclature | `implementeur` |
| O · orchestrateur | ce plan, `.agents/`, cartes, guides, invariants, docs, CI | conversation principale |

### 4.2 Fichiers carrefours

| Carrefour | Parade |
|---|---|
| Versions du kit, de la CLI et de l'adaptateur, pins, lock (`tests/versionSuitLeContenu.test.mjs`, `tests/monorepoCoherent.test.mjs`, `tests/pinDocumente.test.mjs`) | Les lots K ne montent aucune version. Après chaque merge de Codex, l'orchestrateur commite un lot V : kit, CLI et adaptateur montés, pins, READMEs et lock à jour. Entre le commit d'un lot K et le lot V qui le suit, `versionSuitLeContenu` échoue : c'est le seul rouge admis, et il ne vit que dans le clone de Codex |
| Clés `ESPACE_ARCHITECT`, sous-chemins du kit, portes documentées (`tests/portesDocumentees.test.mjs`) | K0 les déclare toutes, avec `kit/README.md` |
| Contrat entre K et B : relevé et catalogue | K0 pose les types d'après N2 ; seule la piste K les change ensuite |
| Routes, cartes, guides, invariants, tests racine que vérifient `tests/domiciles.test.ts`, `tests/cartes.test.ts`, `tests/inventaireInvariants.test.ts`, `tests/docLinks.test.ts` | Un lot qui déplace ou crée des sources (S0, A0.1, A0.2, A1) les met à jour dans son propre commit. L'orchestrateur les écrit avant la vérification du lot ; la fiche les liste |
| `code.ts`, `messages.ts`, `src/ui/textes.ts`, `src/ui/styles.css`, `galerie/etats.cjs`, tests d'interface d'Architect | A1 les découpe par domaine de N1, avec des index déjà remplis ; un lot n'écrit que son domaine |
| Socle lu en source par Architect | S1 passe avant U1 et U5 ; un lot S qui modifie un fichier déjà importé par Architect est seul |
| Ce plan | Écrit par l'orchestrateur seul. Codex le lit, ne l'écrit pas |

Un lot qui découvre qu'il doit écrire hors de sa liste s'arrête et le dit.
L'orchestrateur découpe, ou sérialise.

### 4.3 Parallélisme et Codex

- Au plus deux agents Claude, Claude 1 sur U et Claude 2 sur B, S ou X, plus
  Codex sur K. Un lot « seul » tourne sans autre agent Claude ; Codex continue
  dans son clone.
- Claude 1 et Claude 2 écrivent le même paquet, `plugin-architect`. Un agent
  qui voit échouer un test sur un fichier de l'autre piste le dit dans son
  compte rendu, sans le corriger.
- **Codex** travaille dans un clone à part (`A:\UCM-codex`, chemin court à
  cause des chemins longs de Windows), sur `main`, sans pousser. Son remote
  `partage` pointe sur le dépôt de l'arbre partagé, par son chemin local.
  Avant chaque lot : `git status` propre, `git pull --rebase partage main`,
  puis lecture des états du §6 par
  `git show partage/main:"docs/notes/Recherches/UCM Architect/3 Plan/PLAN-IMPLEMENTATION.md"`.
  Il prend le premier lot K libre marqué « Codex » dont les dépendances sont
  `[x]`. Il ne prend jamais un lot marqué `[~ Claude …]`.
- **Synchronisation**, seulement quand aucun agent Claude n'a de lot ouvert :
  `git -C A:\UCM-codex status` (un clone sale = lot interrompu), `git fetch
  codex`, `git merge --no-edit codex/main`, lot V, reconstruction du kit
  (`npm run build -w @ucm-kit/core`), cases cochées. Les commits de Codex déjà
  fusionnés gardent leur hash : le `pull --rebase` suivant ne les rejoue pas.
- Synchroniser avant un lot B ou U qui consomme un lot K, et à chaque jalon.
- Un lot K repris par Claude passe `[~ Claude 2]` : Codex ne le prend plus.

### 4.4 Niveau d'agent

| Sorte de travail | Qui |
|---|---|
| Note, fiche exécutable, texte absent de la maquette, revue de diff, lot V | orchestrateur (Opus) |
| Règle pure et ses tests dans le kit | Codex, ou `implementeur` |
| Sandbox, lecture, écriture | `implementeur` ; `implementeur-exigeant` si le lot touche une loi ou le journal |
| Écran au pixel, comparateur | `implementeur-exigeant` |
| Déplacement, renommage de chemins, cases du plan | `executant` (Haiku) |
| Vérification de jalon | `verificateur` (Haiku) |

### 4.5 Prompt d'un agent

Le prompt contient, dans cet ordre : le socle commun ci-dessous, la fiche du
lot, la note du §7 qu'elle cite, la sortie de
`npm run agents:lire -- <chemins de « Écrit »>`. Rien d'autre. En vague 0,
l'orchestrateur complète chaque fiche : « Écrit » fermé, « Lit », « Vérifie »,
« Nature ». Les défauts par piste du §6 valent quand un champ manque.

Socle commun, joint à chaque prompt :

```text
- Écris seulement les chemins de « Écrit ». Un besoin hors liste : arrête-toi et dis-le.
- Lance `git status` avant de commencer ; un fichier du lot déjà modifié sans raison : arrête-toi.
- Écriture dans Figma : seulement par `src/ecriture/`. Une opération à la fois ; chaque message porte le sujet et la génération de l'analyse ; une réponse périmée est ignorée.
- Textes : recopiés de la maquette, mot pour mot. Termes de Figma et d'UCM en anglais. Pas de « · ».
- Ne lance ni `npm test`, ni `test:ui`. Lance la commande de « Vérifie ».
- Mets à jour les documents que `npm run agents:diff` liste, et eux seuls ; ne crée aucun document.
- Compte rendu : fichiers écrits, commande lancée et résultat, échecs dus à une autre piste, écrans changés, texte absent de la maquette.
```

Gabarit d'une fiche :

```text
<id> · <titre>        Piste · Agent · Nature · Dépend de · Seul ?
Écrit : chemins créés ou modifiés, et seulement eux.
Lit : fichiers et sections.
Maquette : identifiants de cadres ; symboles du script.
Fait quand : critères vérifiables.
Vérifie : commande du lot.
```

Natures, selon `CONTRIBUTING.md` : déplacement à sortie identique ; correction
d'un défaut ; code ou écran nouveau.

### 4.6 Lectures

- Un agent lit la sortie de `agents:lire`, invariants et `AGENTS.md` racine
  compris (coût fixe), puis les fichiers de « Lit ». Il ne lit ni ce plan, ni
  le document préparatoire, ni la maquette en entier.
- La maquette se lit par `grep -n "<id>\|<SYMBOLE>"` dans
  `2 Maquettes/MAQUETTE-ARCHITECT.html`, puis les seules lignes trouvées. Une
  classe se cherche de même dans `2 Maquettes/architect.css`.
- Un lot d'écran capture ses cadres une fois, en début de lot :
  `node "docs/notes/Recherches/UCM Architect/2 Maquettes/Mesures/capturer-cadres.mjs" <dossier> <id>…`.
- L'orchestrateur lit ce plan, les notes et les diffs.

### 4.7 Vérifier

| Niveau | Quand | Commande | Qui |
|---|---|---|---|
| Lot | chaque lot | « Vérifie » de la fiche : `npm run test:paquet -- <paquet>` ou les fichiers de test du lot par `npx tsx --test <fichier>` ; `tsc` du paquet si un type exporté change | l'agent |
| Lot d'écran | chaque lot U | en plus, le comparateur d'U0 sur les cadres du lot | l'agent |
| Lot du kit | chaque lot K | tests du kit, puis tests racine `node scripts/run-tests.cjs` ; seul `versionSuitLeContenu` peut échouer | Codex ou l'agent |
| Lot qui touche Nomenclature ou ses écritures | A0.2, B6, B8 | en plus, les tests racine | l'agent |
| Jalon | fin de vague | `npm test`, `npm run typecheck`, `npm run build`, comparateur sur les cadres de la vague | un `verificateur`, une fois |
| Recette | J-F | `npm run test:ui -w ucm-architect-plugin`, Figma | le mainteneur |

Jamais `npm test` dans un lot, jamais `test:ui` par un agent. Un jalon dit, pour
chaque cadre, s'il est vérifié sur des fixtures ou sur l'analyse branchée.

### 4.8 État, commit, relais

- États, écrits par l'orchestrateur : `[ ]` libre, `[~ Claude 1]`,
  `[~ Claude 2]`, `[~ Codex]` pris, `[x] (hash)` fait.
- Un lot = un commit vert, par chemins explicites. Message : `<id> · <titre>`,
  puis la ligne `Vérifié : <commandes lancées>`.
- Un lot tient en 400 lignes changées et 10 fichiers, renommages purs exclus
  (`git diff -M --stat`). Au-delà, il se commite par étapes vertes nommées
  dans sa fiche, `<id> (1/n)`.
- **Relais de Codex.** Codex ne laisse rien hors commit. Avant sa limite, il
  commite l'étape verte en cours avec une ligne `Reste : …`, ou l'abandonne par
  `git restore` dans son clone.
- **Reprise.** À chaque synchronisation, l'orchestrateur lit
  `git log codex/main` et coche. Un lot `[~ Codex]` sans commit, Codex arrêté,
  repart de zéro chez Claude. Un lot partiel repart de sa ligne `Reste :`.
- **Revue.** L'orchestrateur relit chaque diff par `git diff --stat`, puis les
  fichiers publics (types et fonctions exportés, index) et les lois. Il ne
  relance pas une vérification consignée par `Vérifié :` avant le jalon.

### 4.9 Autonomie

- L'orchestrateur ne s'arrête pas pour demander. Devant un choix, il prend le
  plus simple, réversible, conforme à la maquette, et l'inscrit au §9.
- Il s'arrête seulement devant : un écart entre la maquette et une décision du
  §2 ; une publication qui casserait un consommateur ; un test racine rouge
  dont la cause est hors des pistes du plan. Un rouge que le plan provoque
  (versions entre K et V) ne l'arrête pas.
- Textes : tous viennent de la maquette. Un texte absent, l'orchestrateur
  l'écrit (skill `rediger-diagnostics-ucm`), le donne au lot et l'inscrit au §9.
- Sondes : S-1, S-2 et S-4 (§7) partent au mainteneur au lancement, en un seul
  passage. Les lots avancent sur l'hypothèse de leur fiche ; un écart devient
  une question du §9 et un lot de reprise.

### 4.10 Fidélité aux maquettes

- Un cadre retenu = un état de galerie du même identifiant, avec les données de
  la maquette (fichier Intencial, Alert, Button, Tag, Input), à la taille du
  cadre : fenêtre entière, ou extrait de barre latérale pour un cadre
  `cadreSeul`.
- Textes recopiés ; valeurs de style de `2 Maquettes/architect.css` et des
  feuilles de galerie ; pastilles roses et légendes jamais implémentées.
- **Manifeste des cadres** : U0 l'écrit dans `galerie/cadres.json` (cadre, lot,
  taille, sorte). Retenus : `t-*`, `c-*` sauf `c-bouton-icone`, `x-*`, `g-*`,
  `cf-*`, `e-*`. Exclus : `a-*` (l'existant), `v-*` (étude), `c-bouton-icone`
  (variante écartée par M-18). `s-planche` va à la galerie du socle (S1).
- **Comparateur** (U0) : apparie les éléments de même texte visible et ceux
  des sélecteurs listés par cadre ; ignore `.repere`, `.repere-n` et les
  légendes ; 1 px de tolérance sur une position ou une taille, aucune sur une
  police, une couleur ou un texte ; sort en échec sur un écart, un cadre
  manquant ou un sélecteur obligatoire vide.

### 4.11 Écarts assumés aux règles du dépôt

| Règle | Écart | Raison |
|---|---|---|
| Un texte absent porte `TODO(texte)` et attend la validation du mainteneur | L'orchestrateur l'écrit ; le §9 le rend | autonomie |
| Un lot attend le commit du précédent | Deux lots de pistes disjointes en parallèle | vitesse |
| Les tests racine verts à chaque commit | `versionSuitLeContenu` rouge dans le clone de Codex jusqu'au lot V | carrefour des versions |
| Une note est validée avant ses lots | Les notes partent sans validation, le §9 les rend (Q-5) | autonomie |

## 5. Vagues

| Vague | Claude 1 | Claude 2 | Codex | Jalon |
|---|---|---|---|---|
| 0 | — | — | — | Notes N1, N2, T, G, E, P, M ; fiches exécutables ; sondes S-1, S-2, S-4 au mainteneur |
| 1 | S0 seul, puis A0.1 seul, puis A0.2 seul | — | K0, K1, K2, K9 | J0 : fusion verte |
| 2 | A1 seul, puis U0 | S1, puis S2, puis X1 | K3, K8 | — |
| 3 | U1, U2, U3, U4 | B3, puis B6 après K5 | K5 | J1 : mode Tokens |
| 4 | U5, U6 | S3 seul, puis B10, B1, B2 | K4, K7 | J2 : mode Composant, lecture |
| 5 | U7 | B9, B4, B5, B7 | K6 | J3 : corrections, écriture, accessibilité branchée |
| 6 | U8 | B8 | — | J-F |

Une case libre se remplit du lot suivant de la piste dont les dépendances sont
faites. Codex, une fois K fini, prend des lots B dans son clone, sur des
fichiers disjoints de ceux de Claude 2.

## 6. Lots

### Piste K · kit

Défauts : Codex · nature « code nouveau » · Vérifie : tests du kit et tests
racine (§4.7). Aucun lot K ne monte de version (lot V).

- [ ] **K0 · Clés, sous-chemin, relevé et catalogue.** Vague 1 · note N2.
  Écrit : `kit/src/referentiel/produits.ts`, `kit/src/controles/` (index,
  `releve.ts`, `catalogue.ts`, `constat.ts`), `kit/package.json` (exports
  seulement), `kit/README.md` (porte nouvelle).
  Fait quand : `ESPACE_ARCHITECT` déclare les clés d'Ignorer, de la library
  choisie, du niveau de contraste, de la clé du fichier des tokens et des
  préparations ; `@ucm-kit/core/controles` exporte `ReleveDeComposant`,
  `CatalogueDeReference` et `Constat` (code, type d'alerte, layer, variant,
  faits lus) selon N2 ; `portesDocumentees` passe.
- [ ] **K1 · Grammaire des composants.** Vague 1 · note G.
  Écrit : `kit/src/referentiel/{grammaire,architecture}.ts` et registres, leurs
  tests.
  Fait quand : positions facultatives reconnues ; registre propre à
  `components` ; cas nommés de la note G reconnus avec leurs positions ;
  `layout/icon/xl` reconnu, `layout/sizing/xl` refusé ; deux lectures rendent
  `ambigu` sans les axes, une avec ; le jugement d'une liaison reste à K3 et
  K5 ; tests de Nomenclature sans changement d'attendu.
- [ ] **K2 · Signaux du langage.** Vague 1.
  Écrit : `kit/src/referentiel/signaux.ts` ; définition de `scale/{cran}` dans
  `theme.ts` (« portée » → « scope ») ; vue illustrée régénérée.
  Lit : maquette, section 1 « Les signaux ».
  Fait quand : chaque signal a un identifiant, un sens, un libellé ; cinq types
  d'alerte ordonnés ; les gravités de Palettes et de l'exporteur ont chacune
  leur type ; `tests/vueIllustree.test.ts` passe.
- [ ] **K9 · Produits et noms dans le kit.** Vague 1.
  Écrit : `kit/src/referentiel/produits.ts` (produit `architect` « UCM
  Architect », produit `explorateur` retiré), commentaires de
  `kit/src/protocoles/nommage.ts`, `generer-donnees-referentiel.ts` et sa sortie.
  Fait quand : aucun texte du kit ne nomme l'explorateur ni Nomenclature comme
  produit ; `vueIllustree` passe.
- [ ] **K3 · Contrôles du composant.** Vague 2 · K0, K1, note T.
  Écrit : `kit/src/controles/{nommage,mapping,couche,oublis}.ts`.
  Fait quand : C7 à C11, C15 à C19 et C21, C20 et C61, C31 à C33, sur relevé et
  catalogue ; un test positif et un négatif par contrôle ; un token inutilisé
  et un frère jamais importé sont trouvés par le catalogue ; les relevés écrits
  à la main de Button et d'Alert rendent la table T ; aucun constat pour
  `alert/size/gap` sans axe de taille, un token partagé entre deux états, un
  rôle absent.
- [ ] **K8 · Corrections exactes et questions.** Vague 2 · K3.
  Écrit : `kit/src/controles/corrections.ts`.
  Maquette : `c-corrections`, `c-modele`, `c-questions`, `x-button-corr`.
  Fait quand : C22, C24, C25, C29 ; une correction seulement si chaque nom
  calculé existe au catalogue, avec un seul candidat et un seul layer
  destinataire ; sinon une question (C70, C76) ; `State=hover` lié au token du
  repos rend une question avec l'indice des autres variants `State=hover` ;
  chaque correction porte les faits à relire avant écriture (axes, règle,
  cible).
- [ ] **K5 · Full UCM, structure, scopes, modes.** Vague 3 · K3.
  Écrit : `kit/src/controles/{theme,structure}.ts`.
  Lit : `docs/notes/Recherches/Plugin Architect/6 Contrôle de structure/RECHERCHE-CONTROLE-DE-STRUCTURE.md`, cas (a), (b), (c), (f) ; `kit/src/emplois/dossiers.ts`.
  Maquette : `t-structure`, `t-portees`.
  Fait quand : C59, C60, C63 ; cas (a), (b), (c), (f), sans alias en boucle ;
  scope attendu par chemin complet, tiré de `SUPPORT_DES_VARIABLES`
  (`surface/default` ≠ `surface/foreground`) ; correction exacte de la cible
  d'alias d'un mode, tirée de `TABLE_DES_DOSSIERS`, avec l'ancienne cible ;
  candidat absent ou multiple → question ; collections reconnues par la
  déclaration UCM, sans association manuelle ; un test positif et un négatif
  par règle.
- [ ] **K4 · Contraste et accessibilité.** Vague 4 · K0, note N2.
  Écrit : `kit/src/controles/accessibilite.ts`.
  Maquette : `x-alert`, `x-button`.
  Fait quand : seuils du §2, sans arrondi ; un grand texte à 3,9:1 passe en AA
  et échoue en AAA ; fond composé des ancêtres et des opacités ; texte mixte
  par plage ; un fond indéterminé, un dégradé, une peinture superposée ou un
  mode illisible rendent une limite, jamais un verdict ; `State=disabled`
  exclu ; borne de combinaisons dite ; cible, anneau et 12 px en
  recommandations.
- [ ] **K7 · Typographie et icônes.** Vague 4 · K0.
  Écrit : `kit/src/controles/typographie.ts`.
  Fait quand : C64 à C67, un test positif et un négatif par contrôle.
- [ ] **K6 · Préparation des tokens.** Vague 5 · K1, note P.
  Écrit : `kit/src/controles/preparation.ts`.
  Maquette : `g-preparer`, `g-creer`.
  Fait quand : du relevé, du catalogue et des réponses, la liste des variables,
  de leurs cibles et des tokens visés, avec leurs crans ; chaque entrée exacte
  ou une question ; une variable existante n'est réutilisée que si
  collection, type et alias de chaque mode égalent le choix, sinon question ;
  Alert rend les variables de l'aperçu ; `Frame 12` rend une question ; une
  taille se lie seulement si un seul token de `layout` a la valeur.

### Piste V · versions

- [ ] **V · Lot de versions**, après chaque merge de Codex, par l'orchestrateur.
  Écrit : `packages/{kit,cli,adapter-typescript}/package.json`, leurs README,
  `README.md` racine, `package-lock.json`.
  Fait quand : tests racine verts, `versionSuitLeContenu`,
  `monorepoCoherent` et `pinDocumente` compris.

### Piste S · socle

Défauts : `implementeur-exigeant` · Vérifie : `npm run test:paquet -- socle`.

- [ ] **S0 · Le moteur de l'exporteur dans le socle.** Vague 1 · seul ·
  déplacement à sortie identique.
  Écrit : `plugin-exporter/src/{contract,template,variables.ts}` →
  `plugin-socle/src/composant/` par `git mv`, après la sortie du type `Annonce`
  de `messages.ts` ; tests, `tests/lois.ts`, invariants, `SPEC.md` de
  l'exporteur ; loi du document intact ; par l'orchestrateur avant la
  vérification : routes de `domiciles.json` (sinon `plugin-socle/src/**` tombe
  dans le domaine de l'interface de Palettes), carte et autorités des
  invariants (`inventaireInvariants`).
  Étapes : (1/2) `Annonce` et `git mv` ; (2/2) chemins des tests et documents.
  Fait quand : `test:paquet -- exporter` et `-- socle` sans changement
  d'attendu ; `npm test` passe ; `build:plugin -- exporter` et `-- palettes`
  passent, bundles à 1 % près.
- [ ] **S1 · Langage visuel du socle.** Vague 2 · A1, K2.
  Écrit : `plugin-socle/src/ui/langage.css`, composants du socle, galerie du
  socle, loi des styles ; et, par exception, les règles reprises de
  `plugin-architect/src/ui/nomenclature/` (aucun lot U ouvert).
  Maquette : `s-planche` ; `2 Maquettes/architect.css`.
  Fait quand : chemin (groupe, variable, mis en avant, ajout, retrait, dans une
  phrase, lien), jeton, pastille, alerte des cinq types, gravité, ligne de
  réussite, deux colonnes, carte ciblée, puce de filtre, recherche active,
  pastille de compte, poignée ; les règles de Nomenclature déplacées, non
  copiées ; la planche reproduit `s-planche` ; la loi refuse, à l'essai, une
  classe du langage redéfinie dans un plugin ; Palettes et l'exporteur sans
  changement visible.
- [ ] **S2 · Noms d'une library.** `implementeur` · vague 2 · K0.
  Écrit : `plugin-socle/src/bibliotheque.ts` et son test.
  Fait quand : nom, clé et type de chaque variable par library et collection ;
  la plus liée est choisie ; à égalité ou sans liaison, aucune ; une library
  illisible est dite illisible.
- [ ] **S3 · Budget et annulation du moteur.** Vague 4 · seul · B1 en cours de
  conception (note N2).
  Écrit : `plugin-socle/src/composant/` (option de budget et jeton
  d'annulation, sans effet pour l'exporteur), tests de l'exporteur.
  Fait quand : l'exporteur garde ses attendus ; un budget dépassé arrête les
  lectures de variants ; une annulation rend « annulée », pas Bloquant ; le
  nombre de layers non lus est exact ou dit inconnu.

### Piste A · fusion et squelette

- [ ] **A0.1 · Renommage.** `implementeur` · vague 1 · seul · S0 ·
  déplacement.
  Écrit : dossier, paquet, manifeste (« UCM Architect », identifiant gardé,
  permission `teamlibrary`), `scripts/construire-plugin.mjs`, scripts racine,
  `ci.yml`, `pluginsSepares`, `manifestsDesPlugins`, `kitCompileAJour`, tests
  racine qui importent l'explorateur, commandes de `CONTRIBUTING.md`, liens de
  `docs/` hors Archives ; par l'orchestrateur : routes, carte, `AGENTS.md`,
  liens de `kit/AGENTS.md` et `plugin-socle/AGENTS.md`, `package-lock.json`.
  Fait quand : `npm test`, `npm run typecheck`, `build:plugin -- architect`
  passent ; `agents:diff` ne liste aucun chemin mort ; « UCM Token Explorer »
  ne reste que dans les Archives, les notes passées, les journaux de version ;
  la barre de la galerie dit « UCM Architect ».
- [ ] **A0.2 · Nomenclature entre dans Architect.** `implementeur-exigeant` ·
  vague 1 · seul · A0.1 · déplacement.
  L'orchestrateur note ici le commit de repli avant de lancer : `……`.
  Écrit : `git mv` : sandbox → `src/nomenclature/`, `ecriture.ts` →
  `src/ecriture/noms.ts`, interface → `src/ui/nomenclature/`, galerie et tests
  à côté, invariants → `plugin-architect/invariants/` ; suppression de
  `packages/plugin-nomenclature` et de ses entrées ; tests racine
  `nomsDePalettes`, `loisEntreProduits`, `fabriquesDeFichiers`, `releveDeTest`
  sur les nouveaux chemins ; lois du §3 ; par l'orchestrateur : routes, carte,
  invariants, `package-lock.json`.
  Étapes : (1/3) sandbox et écriture ; (2/3) interface, galerie, tests ;
  (3/3) suppression du paquet, lois, tests racine.
  Fait quand : tests du sandbox et loi d'écriture de Nomenclature sans
  changement d'attendu ; la loi d'Architect refuse, à l'essai, une écriture et
  un import de `template/ecriture` hors de `src/ecriture/` ; `npm test` passe.
- [ ] **A1 · Squelette des domaines.** `implementeur-exigeant` · vague 2 · seul
  · A0.2, note N1 · code nouveau.
  Écrit : `src/code.ts` (aiguillage), `src/messages/<domaine>.ts` (types
  complets de N1), `src/sandbox/<domaine>.ts` (souches « non construit »),
  `src/ui/textes/<domaine>.ts`, `src/ui/styles/<domaine>.css`,
  `galerie/etats/<domaine>.cjs`, `tests/interface/<domaine>.test.mjs`, index ;
  script `test:ui` qui découvre tous les `tests/interface/*.test.mjs` ;
  `tests/textesEcrits.test.mjs` et `loiDesTextes` sur les catalogues
  découpés ; loi du vocabulaire avec sa liste d'exceptions ; tailles de
  fenêtre et mode d'ouverture ; retrait d'Intégrations, Relevés, Comparer,
  Diagnostics, de leurs préférences et états ; abonnement aux changements du
  document pour le panneau périmé ; par l'orchestrateur : routes et carte.
  Étapes : (1/3) messages, aiguillage, souches ; (2/3) textes, styles,
  galerie, tests d'interface, `test:ui` ; (3/3) retrait des vues, lois.
  Fait quand : chaque domaine de N1 a ses fichiers ; ajouter un domaine ne
  touche qu'un index ; `profilUcm` et `lireLaRecette` passent ;
  `build:plugin -- architect` passe ; la loi du vocabulaire refuse, à l'essai,
  « portée » hors de sa liste d'exceptions.

### Piste U · interface d'Architect

Défauts : `implementeur-exigeant` · écran nouveau · Écrit : les fichiers
d'interface du domaine (§4.2) · Vérifie : `npm run test:paquet -- architect` et
le comparateur sur les cadres du lot. Chaque lot crée les états de galerie et
les tests d'interface de ses cadres, sans `test:ui`, et retire ses mots de la
liste d'exceptions de la loi du vocabulaire. Les données viennent des fixtures
de galerie quand le lot B n'est pas fait.

- [ ] **U0 · Manifeste des cadres et comparateur.** Vague 2 · A1 (exempté de
  S1 : outil).
  Écrit : `plugin-architect/galerie/cadres.json`,
  `plugin-architect/galerie/comparer-maquette.cjs`.
  Fait quand : règles du §4.10 ; à l'essai, une police changée et un élément
  retiré font échouer la comparaison ; un cadre manquant aussi.
- [ ] **U1 · Mode Tokens, Corrections.** Vague 3 · S1, A1.
  Maquette : `t-renommages` ; `fenetreTokens`, `MODES_AFFICHES`,
  `ARBRE_INTERFACE`, `LIGNES_INTERFACE`, `ciblerCarte`, `nomenclatureLaterale`.
  Fait quand : barre, arbre et « replier les autres », modes sur une ligne,
  tableau des tokens avec renommages cochés (terme vert cliquable), carte
  ciblée ouverte, puce du filtre de l'arbre, onglets, pied ; Appliquer n'écrit
  que les noms affichés (M-11) ; les textes repris de l'explorateur disent
  « scope » ; comparateur sans écart.
- [ ] **U2 · Recherche, fiche d'une variable.** Vague 3 · U1.
  Maquette : `t-questions`, `t-terme`, `t-fiche` ; `LIGNES_BACKGROND`,
  `LIGNES_BACKGROUND`, `FICHE_VARIABLE`, `ETAPE`.
  Fait quand : recherche en texte, préfixes `terme:` et `vise:` ; les trois
  liens écrivent dans le champ ; fiche : chaîne d'alias, « Renommage à
  appliquer », « Utilisée par » ; ligne choisie d'un fond uniforme ;
  comparateur sans écart.
- [ ] **U3 · À faire dans Figma, modes et scopes.** Vague 3 · U1.
  Maquette : `t-structure`, `t-portees` ; `AFAIRE_TOKENS`, `LIGNE_SCOPE`.
  Fait quand : constats typés, chemins dans une phrase ; cartes de modes et de
  scopes en Aujourd'hui et Après l'application ; comparateur sans écart.
- [ ] **U4 · Library, règles reçues, hors UCM.** Vague 3 · U1.
  Maquette : `t-bibliotheque`, `t-regle`, `t-hors` ; `REGLE_RECUE`.
  Fait quand : valeurs en attente en trait gris, onglets grisés, « Ouvrir
  Intencial Tokens » seulement si la clé est connue ; règles reçues en
  questions ; alerte hors UCM ; comparateur sans écart.
- [ ] **U5 · Vue Composant et section Variants.** Vague 4 · S1, A1.
  Maquette : `c-avant`, `c-replie`, `c-bouton-texte`, `c-gros`, colonne gauche
  de `c-corrections` ; `variants`, `COMPOSANTS`, `fenetreComposant`, `barre`,
  `corrigerDansLaVue`.
  Fait quand : panneau fermé à l'ouverture ; bouton Constats et pastille ;
  frontière tirable ; aperçu en haut ; Variants forme C, « +N », Tableau ;
  liaisons changées en vert, cliquables ; ouverture dans le mode du fichier et
  bascule ; comparateur sans écart.
- [ ] **U6 · Panneau des constats.** Vague 4 · U5.
  Maquette : `c-corrections`, `c-clic`, `c-modele`, `c-questions`,
  `c-tranchee`, `c-afaire`, `c-apres`, `c-ctrlz`, `e-*` ; `CORR_ALERT`,
  `AFAIRE_ALERT`, `Q_TITLE`, `Q_OUTLINE`, `Q_CONTOUR`, `CLIC`, `PERIME`.
  Fait quand : trois onglets, cartes du tour 3, alertes, ignorés, ligne de
  réussite avec les sautées, panneau périmé, états de l'analyse dont
  « annulée » ; sélection Figma dans l'aperçu ; comparateur sans écart.
- [ ] **U7 · Contraste et accessibilité.** Vague 5 · U6.
  Maquette : `x-alert`, `x-button`, `x-button-corr` ; `paire`.
  Fait quand : paire mesurée, rapport et seuil, autres modes, limites ;
  questions d'état ; comparateur sans écart.
- [ ] **U8 · Préparation et Configuration.** Vague 6 · U6.
  Maquette : `g-*`, `cf-reglages`, `cf-historique` ; `PREPARER`, `CREER`,
  `optionP`, `cibleP`, `SECTIONS_NOUVELLES`.
  Fait quand : chaque choix porte son terme UCM puis sa description ; Préparer
  inactif tant qu'une question reste ; préparation reçue lue et validée ;
  comparateur sans écart.

### Piste B · sandbox d'Architect

Défauts : `implementeur` · code nouveau · Écrit : les fichiers sandbox du
domaine (§4.2) et ses tests · Vérifie : `npm run test:paquet -- architect`.
Chaque lot remplace la souche de son domaine et garde les types de N1.

- [ ] **B3 · Library en mode Tokens.** Vague 3 · S2 · hypothèses S-1, S-4.
  Fait quand : arbre depuis les noms ; valeurs d'un groupe importées à son
  ouverture, par lots de huit ; loi d'import étendue ; `figma.fileKey` rangé
  sous sa clé quand il est servi.
- [ ] **B6 · Journal étendu, scopes et modes.** `implementeur-exigeant` · vague
  3 · K5 fusionné.
  Fait quand : le journal range et l'Historique annule trois sortes nouvelles :
  scopes, cible d'alias par mode (`setValueForMode`, ancienne valeur gardée),
  création de variables ; une variable créée qui a gagné un usage accessible
  (alias, layer liée du fichier) n'est pas supprimée, et la limite des usages
  d'autres fichiers est dite ; un objet changé depuis est sauté ; tests de
  l'Historique sans changement d'attendu.
- [ ] **B10 · Catalogue de référence.** Vague 4 · S2, K0 · hypothèse S-1.
  Fait quand : pour une analyse en mode Composant, les collections `theme`,
  `layout` et `components` de la library choisie sont lues : noms d'abord,
  valeurs importées par clé à la demande des contrôles ; chaque entrée est
  présente, absente, non chargée ou inaccessible ; un token hors de l'arbre
  ouvert est trouvé.
- [ ] **B1 · Relevé du composant.** Vague 4 · K0, S3.
  Écrit : `src/lectureDuComposant.ts` et ses tests.
  Fait quand : relevé de N2 complet (tous les variants, propriétés, porteur
  réel, champ, indice, plage, peintures directes, opacités, fonds des
  ancêtres, propriétés de texte par plage, dimensions, styles, modes
  effectifs, espace de couleur) ; budget commun avec S3 ; test sur un jeu
  factice de six variants.
- [ ] **B2 · Analyse.** Vague 4 · B1, B10, K3, S3.
  Fait quand : Analyser puis Actualiser lancent moteur et kit ; identité de
  l'analyse (sujet, génération) dans chaque message ; seconde analyse
  refusée ; sélection extérieure d'un autre composant et Ctrl+Z rendent le
  panneau périmé, sans réanalyse ; une erreur du moteur rend un Bloquant et
  rien d'autre ; une annulation rend « annulée » ; tests : analyse lente
  d'Alert puis sélection de Button, clic sur un constat, Ctrl+Z puis
  Actualiser.
- [ ] **B9 · Branchement de l'accessibilité et de la typographie.** Vague 5 ·
  K4, K7, B2.
  Fait quand : constats de K4 et K7 dans l'analyse ; niveau AA ou AAA lu dans la
  Configuration.
- [ ] **B4 · Écriture des liaisons.** `implementeur-exigeant` · vague 5 · B2,
  K8, note E · hypothèse S-2.
  Écrit : `src/ecriture/liaisons.ts` et ses tests.
  Fait quand : un test par sorte (nombre, fill de frame, stroke, texte) sur
  doubles ; avant chaque écriture, les faits de la correction sont relus ; un
  objet changé ou un fait faux est sauté et compté ; un fichier qui ne déclare
  plus UCM ne reçoit rien ; un lot = un point d'annulation.
- [ ] **B5 · Corrections, questions, Ignorer.** Vague 5 · B4, K8.
  Fait quand : corrections de K8 dans le lot Appliquer ; renommer une valeur
  de variante (C12), une valeur déjà présente → question ; Ignorer et « Ne plus
  proposer » rangés à la racine du document ; « Ne plus ignorer » rend le
  constat ; une limite de lecture ne s'ignore pas.
- [ ] **B7 · Règles de composant.** Vague 5 · B2.
  Écrit : en plus, les importeurs permis de
  `plugin-exporter/tests/loiDuDocumentIntact.test.ts`.
  Fait quand : C43, C44, C45 ; C46 par `template/ecriture.ts` ; ajout et
  retrait d'une instance remplie refusés avec un motif.
- [ ] **B8 · Préparation, création, retour.** Vague 6 · K6, B6, B4, note P.
  Fait quand : règles de la note P (identité, destination, versions du texte
  échangé, états par entrée, reprise sans doublon) ; création des seules
  variables manquantes par le journal ; existant divergent → question ;
  retour au composant seulement pour la même clé de jeu ; une variable pas
  encore publiée laisse sa ligne sans case ; règles reçues par le même
  chemin (C13) ; tests : deux fichiers homonymes, deux préparations, une
  création interrompue, un texte incompatible.

### Piste X · autres plugins

- [ ] **X1 · Textes de l'exporteur et de Palettes.** `implementeur` · vague 2 ·
  A0.2.
  Écrit : `plugin-socle/src/composant/contract/semantics.ts` (texte de l'exporteur, après S0) et
  les catalogues de Palettes, en français et en anglais, qui nomment « UCM
  Nomenclature » ou l'explorateur.
  Fait quand : ils disent « UCM Architect » ; `test:paquet -- exporter` et
  `-- palettes` passent.

### Piste O · orchestrateur

- [ ] **O0 · Vague 0** : notes du §7, fiches exécutables, sondes envoyées.
- [ ] **O1 · Documents de jalon** : cohérence générale de `agents:diff`,
  `SPEC.md` de l'explorateur devenu celui d'Architect, README de ce dossier,
  ROADMAP.
- [ ] **O2 · Fin** (skill `publier-paquets`) : recette locale, commit final,
  push unique, CI distante verte, puis publication du kit, puis de la CLI et
  de l'adaptateur, depuis le commit poussé ; versions servies contrôlées.

## 7. Notes de conception

Écrites par l'orchestrateur en vague 0, dans ce fichier, sous ce titre. Les
choix tranchés par le mainteneur y entrent tels quels.

- **N1 · Domaines et messages.** Domaines : arbre et tableau des tokens,
  recherche, fiche, library, nomenclature, structure et scopes, vue Composant,
  analyse, corrections, questions, ignorés, accessibilité, règles de
  composant, préparation, configuration. Pour chacun, les messages UI →
  sandbox et sandbox → UI, typés, tirés des cadres ; identité d'analyse dans
  chaque message de résultat ; politique de sélection et de panneau périmé.
- **N2 · Relevé et catalogue.** Le relevé du composant (variants, propriétés,
  layers, liaisons avec porteur, champ, indice et plage ; peintures directes,
  opacités, fonds des ancêtres, texte par plage, dimensions, styles, modes
  effectifs, espace de couleur ; lectures manquées ; layers non lus, exact ou
  inconnu). Le catalogue de référence (collections, variables, alias par mode,
  scopes ; présente, absente, non chargée, inaccessible ; jointure par clé).
  Une table contrôle → données → lecteur.
- **T · Table des constats attendus.** Button et Alert : code et chemin de
  chaque constat attendu. Corrige la section 4 de la grammaire : un champ peint
  sans variable relève de C30 ; un rôle non peint ne donne aucun constat ; C59
  attend K5. Relue par le mainteneur à la fin.
- **G · Grammaire.** Positions facultatives de `FORMES_DES_CHEMINS` ; levée des
  exclusions de `components` (`grammaire.ts`, `architecture.ts`) ; forme
  `layout/icon/<taille>` ; segment à deux registres (`text`) lu par les axes,
  `ambigu` sans eux ; registre propre à `components` ; termes de l'équipe ;
  liste des cas nommés de K1, sans le tableau de la section 4 qui juge des
  liaisons.
- **E · Écriture des liaisons**, sur l'hypothèse de S-2 : champs, ordre,
  relecture des faits, objet changé, échec partiel (sauté et compté), Ctrl+Z.
- **P · Préparation.** Axes et éléments ; icône pilotée par une propriété
  d'échange d'instance, sinon question ; intensité ; cibles d'une variable ;
  tailles exactes ; identifiant de préparation ; source (fichier, clé et nom du
  jeu) ; destination (collection `components` du fichier ouvert, refusée si
  `theme` manque, choisie si deux collections conviennent) ; schéma versionné
  du texte échangé et sa validation ; états par entrée ; reprise sans
  doublon ; aucune hypothèse de verrou dans `figma.clientStorage`.
- **M · Manifeste des cadres** : la liste d'U0, reprise du §4.10.

Sondes, lancées par le mainteneur au lancement :

- **S-1 · Import d'une variable de library.** Effet de
  `importVariableByKeyAsync` sur le fichier ; temps pour 200 variables.
  Hypothèse : la variable importée reste invisible dans Variables et ne marque
  pas le fichier modifié.
- **S-2 · Écrire une liaison.** `setBoundVariable` sur un champ numérique ;
  `setBoundVariableForPaint` puis réaffectation de `fills` et `strokes` ;
  `setRangeFills` ; un Ctrl+Z après `figma.commitUndo` défait-il le lot ?
  Hypothèse : oui pour les quatre.
- **S-4 · Clé du fichier dans un plugin en développement.** Ajouter
  `"enablePrivatePluginApi": true` au manifeste d'un plugin chargé depuis son
  manifeste, puis lire `figma.fileKey`. Hypothèse : `undefined`. Si la clé est
  servie, B3 ajoute le drapeau au manifeste et le lien de `t-bibliotheque`
  marche.
- **S-3 · Slot rempli**, hors de ce plan : avant C47.

## 8. Jalons

| Jalon | Contenu vérifié | Après |
|---|---|---|
| J0 | `npm test`, typecheck, build ; Nomenclature et l'explorateur ne vivent plus que dans Architect | vague 1 |
| J1 | Mode Tokens : `t-*` au comparateur ; modes et scopes branchés | vague 3 |
| J2 | Mode Composant, lecture : `c-avant`, `c-replie`, `c-bouton-texte`, `c-gros`, `c-corrections` à `c-afaire`, `e-*`, branchés sur l'analyse | vague 4 |
| J3 | Corrections, écriture, accessibilité branchée : `c-apres`, `c-ctrlz`, `x-*` | vague 5 |
| J-F | Tous les cadres du manifeste ; ni « UCM Token Explorer », ni « UCM Nomenclature », ni « Token Architect » dans le code ou un document vivant ; O1 ; §9 rendu ; recette du mainteneur (`test:ui`, renommage et annulation, analyse et correction de Button sur une copie, préparation d'Alert) ; puis O2 | vague 6 |

## 9. Questions de fin

Remplie pendant l'exécution. Une ligne par choix fait sans le mainteneur :
`Q-n · lot · question · choix appliqué · réversible : oui ou non`.

Tranchées par le mainteneur le 22 octobre :

- Q-1 · Un seul push, à J-F, après la recette.
- Q-2 · Codex dans un clone à part, intégré par `git merge` ; l'historique
  reçoit des commits de fusion.
- Q-3 · M-3, M-10, M-14, M-15, M-17, M-18 : les choix proposés (§2).
- Q-5 · Les notes partent sans validation, avec ces choix tranchés : positions
  facultatives (G) ; registre propre à `components` (G, remplace G-8) ; échec
  partiel sauté et compté (E) ; table T relue à la fin.

Ouverte :

- Q-4 · Lien vers le fichier des tokens : selon la sonde S-4, ou une
  publication privée des plugins UCM dans l'organisation.

## 10. Hors du plan

| Fonction | Raison |
|---|---|
| Migration de Palettes et de l'exporteur au langage visuel commun | Lots à part, après la recette |
| C6, C73 : analyse d'une page entière et rapport | Après la recette d'un composant |
| C14 : même axe nommé autrement dans deux composants | Demande de lire plusieurs composants |
| C23, C37, C54, C56 à C58, C72, C77, C79 | Utilité faible ou partielle |
| C55 : interlignage | Utilité faible |
| C26 : mapping par valeur | Contraire à la règle d'exactitude, sauf les tailles exactes de K6 |
| C30, C41 dans le kit | Déjà rendus par le moteur de l'exporteur |
| C39, C40 | Hors de Figma, ou demande le réseau |
| C47 : compléter une instance de règles remplie | B7 prépare le code ; sonde S-3 avant |
| C48 : rédaction par IA | Réseau |
| T3, T4, T8 à T11, T13 | Utilité faible, doublon de Palettes, ou seulement si la recette montre une lenteur |
| G8 : fusion de l'exporteur | Écartée |
| Thème clair | Décision : sombre seulement |
