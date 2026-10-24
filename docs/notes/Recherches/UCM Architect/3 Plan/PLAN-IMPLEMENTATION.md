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
| Écriture de Nomenclature (`plugin-architect/tests/loiDEcritureDesNoms.test.ts`) | Suit ses fichiers dans Architect, mêmes attendus | A0.2 |
| Écriture d'Architect | Hors de `src/ecriture/` : aucune écriture, aucun changement de sélection ou de vue, aucun import de `template/ecriture` | A0.2 |
| Import de variables | Seule `src/lecture.ts` importe ; B3 l'étend aux valeurs d'une library, B10 au catalogue | B3, B10 |
| Paquets séparés, manifestes, kit compilé (`tests/pluginsSepares.test.ts`, `tests/manifestsDesPlugins.test.ts`, `tests/kitCompileAJour.test.mjs`) | Trois plugins | A0.1, A0.2 |
| Textes écrits, loi des textes (`tests/textesEcrits.test.mjs`, `plugin-architect/tests/loiDesTextes.test.ts`) | Lisent les catalogues découpés `src/ui/textes/*.ts` | A1 |
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

- [x] (1a88f4d0) **K0 · Clés, sous-chemin, relevé et catalogue.** Vague 1 · note N2.
  Écrit : `kit/src/referentiel/produits.ts`, `kit/src/controles/` (index,
  `releve.ts`, `catalogue.ts`, `constat.ts`), `kit/package.json` (exports
  seulement), `kit/README.md` (porte nouvelle).
  Fait quand : `ESPACE_ARCHITECT` déclare les clés d'Ignorer, de la library
  choisie, du niveau de contraste, de la clé du fichier des tokens et des
  préparations ; `@ucm-kit/core/controles` exporte `ReleveDeComposant`,
  `CatalogueDeReference` et `Constat` (code, type d'alerte, layer, variant,
  faits lus) selon N2 ; `portesDocumentees` passe.
- [x] (5e479482) **K1 · Grammaire des composants.** Vague 1 · note G.
  Écrit : `kit/src/referentiel/{grammaire,architecture}.ts` et registres, leurs
  tests.
  Fait quand : positions facultatives reconnues ; registre propre à
  `components` ; cas nommés de la note G reconnus avec leurs positions ;
  `layout/icon/xl` reconnu, `layout/sizing/xl` refusé ; deux lectures rendent
  `ambigu` sans les axes, une avec ; le jugement d'une liaison reste à K3 et
  K5 ; tests de Nomenclature sans changement d'attendu.
- [x] (17880301) **K2 · Signaux du langage.** Vague 1.
  Écrit : `kit/src/referentiel/signaux.ts` ; définition de `scale/{cran}` dans
  `theme.ts` (« portée » → « scope ») ; vue illustrée régénérée.
  Lit : maquette, section 1 « Les signaux ».
  Fait quand : chaque signal a un identifiant, un sens, un libellé ; cinq types
  d'alerte ordonnés ; les gravités de Palettes et de l'exporteur ont chacune
  leur type ; `tests/vueIllustree.test.ts` passe.
- [x] (7799190c) **K9 · Produits et noms dans le kit.** Vague 1.
  Écrit : `kit/src/referentiel/produits.ts` (produit `architect` « UCM
  Architect », produit `explorateur` retiré), commentaires de
  `kit/src/protocoles/nommage.ts`, `generer-donnees-referentiel.ts` et sa sortie.
  Fait quand : aucun texte du kit ne nomme l'explorateur ni Nomenclature comme
  produit ; `vueIllustree` passe.
- [x] (e65e3a05, 30125a65, 21515da6 ; fusion bd68c35a) **K3 · Contrôles du composant.** Vague 2 · K0, K1, note T.
  Écrit : `kit/src/controles/{nommage,mapping,couche,oublis}.ts`.
  Fait quand : C7 à C11, C15 à C19 et C21, C20 et C61, C31 à C33, sur relevé et
  catalogue ; un test positif et un négatif par contrôle ; un token inutilisé
  et un frère jamais importé sont trouvés par le catalogue ; les relevés écrits
  à la main de Button et d'Alert rendent la table T ; aucun constat pour
  `alert/size/gap` sans axe de taille, un token partagé entre deux états, un
  rôle absent.
- [x] (80463431 ; fusion d743e2a4 ; avant = nom, 0ca22691) **K8 · Corrections exactes et questions.** Vague 2 · K3.
  Écrit : `kit/src/controles/corrections.ts`, ses tests, et ses lignes d'export dans `kit/src/controles/index.ts`.
  Maquette : `c-corrections`, `c-modele`, `c-questions`, `x-button-corr`.
  Fait quand : C22, C24, C25, C29 ; une correction seulement si chaque nom
  calculé existe au catalogue, avec un seul candidat et un seul layer
  destinataire ; sinon une question (C70, C76) ; `State=hover` lié au token du
  repos rend une question avec l'indice des autres variants `State=hover` ;
  chaque correction porte les faits à relire avant écriture (axes, règle,
  cible). Forme lue par B4 : `avant` et `aRelire.avant` valent le nom de la
  variable liée au champ, `null` sans liaison ; `apres.cle` est la clé de la
  variable cible ; `cible.layer` est l'id du layer, `cible.champ` le champ de
  Figma (`paddingLeft`, `fills`, `strokes`…), `cible.indice` l'indice de la
  peinture, `cible.plage` la plage d'un texte ; `aRelire.axes` les valeurs du
  variant.
- [x] (665cec7b, ce7a0c10 ; entrée du catalogue b6b6ed7f) **K5 · Full UCM, structure, scopes, modes.** Vague 3 · K3.
  Écrit : `kit/src/controles/{theme,structure}.ts`, leurs tests, et leurs lignes d'export dans `kit/src/controles/index.ts`.
  Lit : `docs/notes/Recherches/Plugin Architect/6 Contrôle de structure/RECHERCHE-CONTROLE-DE-STRUCTURE.md`, cas (a), (b), (c), (f) ; `kit/src/emplois/dossiers.ts`.
  Maquette : `t-structure`, `t-portees`.
  Fait quand : C59, C60, C63 ; cas (a), (b), (c), (f), sans alias en boucle ;
  scope attendu par chemin complet, tiré de `SUPPORT_DES_VARIABLES`
  (`surface/default` ≠ `surface/foreground`) ; correction exacte de la cible
  d'alias d'un mode, tirée de `TABLE_DES_DOSSIERS`, avec l'ancienne cible ;
  candidat absent ou multiple → question ; collections reconnues par la
  déclaration UCM, sans association manuelle ; un test positif et un négatif
  par règle.
- [x] (4f7540cb) **K4 · Contraste et accessibilité.** Vague 4 · K0, note N2.
  Écrit : `kit/src/controles/accessibilite.ts`.
  Maquette : `x-alert`, `x-button`.
  Fait quand : seuils du §2, sans arrondi ; un grand texte à 3,9:1 passe en AA
  et échoue en AAA ; fond composé des ancêtres et des opacités ; texte mixte
  par plage ; un fond indéterminé, un dégradé, une peinture superposée ou un
  mode illisible rendent une limite, jamais un verdict ; `State=disabled`
  exclu ; borne de combinaisons dite ; cible, anneau et 12 px en
  recommandations.
- [x] (b449d9a4) **K7 · Typographie et icônes.** Vague 4 · K0.
  Écrit : `kit/src/controles/typographie.ts`.
  Fait quand : C64 à C67, un test positif et un négatif par contrôle.
- [x] (4eea6b4e, 79529298) **K6 · Préparation des tokens.** Vague 5 · K1, note P.
  Écrit : `kit/src/controles/preparation.ts`, ses tests, et ses lignes d'export dans `kit/src/controles/index.ts`.
  Maquette : `g-preparer`, `g-creer`.
  Fait quand : du relevé, du catalogue et des réponses, la liste des variables,
  de leurs cibles et des tokens visés, avec leurs crans ; chaque entrée exacte
  ou une question ; une variable existante n'est réutilisée que si
  collection, type et alias de chaque mode égalent le choix, sinon question ;
  Alert rend les variables de l'aperçu ; `Frame 12` rend une question ; une
  taille se lie seulement si un seul token de `layout` a la valeur.

- [x] (9418f837 ; revue fa76117b) **K10 · Constats manquants du kit.** Codex · K3, K5.
  Écrit : `kit/src/controles/{nommage,structure}.ts` ou un fichier nouveau
  de `kit/src/controles/`, leurs tests, leurs lignes d'export dans
  `kit/src/controles/index.ts`.
  Fait quand : C12 et C13 (table T, A18 : `Variant=Outlined` et des tokens
  en `outline`) rendent une question sans correction précochée. B5 produit
  `nom-de-valeur` après le choix du designer (`cible.layer` = id du jeu de
  variants, `cible.champ` = propriété, `avant` = ancienne valeur,
  `apres.nom` = nouvelle) ; `controlerLeCatalogue` rend aussi les quatre constats que
  l'écran `t-structure` lit sous `faits.genre` : cible d'alias supprimée,
  library non activée, mode sans valeur, couleur sans alias (faits :
  `variable`, `cle`, `mode`, `library`, `voisine`, `cibleDeLaVoisine`,
  `valeur`, voir `packages/plugin-architect/src/ui/structure/lecture.ts`) ;
  un test positif et un négatif par constat.

- [x] (30885c1e) **K11 · Propagation depuis un variant modèle (C24).** `implementeur` · arbre partagé · K8, B5 (Q-74).
  Écrit : `kit/src/controles/propagation.ts`, son test, sa ligne d'export dans
  `kit/src/controles/index.ts` ; `plugin-architect/src/messages/corrections.ts`,
  `plugin-architect/src/sandbox/{corrections,analyse}.ts`,
  `plugin-architect/tests/corrections.test.ts`.
  Maquette : `c-modele`.
  Fait quand : `proposerLaPropagation(releve, catalogue, variant)` lit chaque
  liaison du variant modèle ; pour chaque autre variant, le layer de même
  chemin et le même champ ; nom visé = nom de la variable du modèle dont
  chaque segment d'axe prend la valeur de cet axe dans le variant visé ;
  correction seulement si ce nom existe au catalogue, avec un seul candidat,
  et que le champ n'y est pas déjà lié ; layer absent ou ambigu, nom absent →
  question sans réponse cochée ; constats `C24`, famille `liaisons`,
  `faits.modele` = nom du variant modèle, `faits.calque`, ids distincts de la
  correction de rôle tirée de C17 ; corrections à la forme de K8. Sandbox :
  `servir-de-modele { analyse, variant }` rend `modele-propose { analyse,
  variant, constats }`, retient leurs corrections dans l'analyse pour
  `appliquer-corrections` ; analyse périmée ou opération en cours → refus.
  Vérifie : tests du kit, `npm run test:paquet -- architect`, tests racine (seul `versionSuitLeContenu` peut échouer, lot V10).

- [x] (ebefa7c0) **K12 · Faits et groupes du contraste.** `implementeur` · arbre partagé · K4, B9, U7 (Q-77).
  Écrit : `kit/src/controles/accessibilite.ts`, ses tests, `plugin-architect/tests/accessibilite.test.ts`.
  Fait quand : C49 et C50 mesurés portent `premierPlan`, `fond` et `rapports`
  (texte JSON des modes mesurés) ; C49, C50 et C51 regroupés entre variants
  comme C52 ; `C50:sans-anneau` porte le layer racine de chaque variant.

### Piste V · versions

- [ ] **V · Lot de versions**, après chaque merge de Codex, par l'orchestrateur.
  Écrit : `packages/{kit,cli,adapter-typescript}/package.json`, leurs README,
  `README.md` racine, `package-lock.json`.
  Fait quand : tests racine verts, `versionSuitLeContenu`,
  `monorepoCoherent` et `pinDocumente` compris ; le corpus
  `docs/references/design-systems/ucm/` régénéré par
  `node docs/references/design-systems/_outils/ucm.mjs` (il date la version du kit).
  Fait : V1 (kit 0.12.0, après K2) ; V2 (0.12.1, après K0) ; V3 (0.12.2, après K1 et K9) ; V4 (0.12.3, avec K4) ; V5 (0.12.4, avec K7) ; V6 (0.12.5, après K3, `1c7c5e02`) ; V7 (0.12.6, après K6 et K8, `683d8e28`) ; V8 (0.12.7, après K5) ; V9 (0.12.8, après K10 et la revue, `104868cc`) ; V10 (0.12.9, après K11, `2cc85eac`) ; V11 (0.12.10, après K12) ; V12 (0.12.11, après O1).

### Piste S · socle

Défauts : `implementeur-exigeant` · Vérifie : `npm run test:paquet -- socle`.

- [x] (606e65f7) **S0 · Le moteur de l'exporteur dans le socle.** Vague 1 · seul ·
  déplacement à sortie identique.
  Lit : `plugin-exporter/CARTE.md`, `plugin-exporter/AGENTS.md`, `loiDuDocumentIntact.test.ts`, `tests/lois.ts`.
  Vérifie : `npm run test:paquet -- exporter`, `-- socle`, `npm run build:plugin -- exporter`, `-- palettes` ; `npm test` par un `verificateur` à la fin.
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
- [x] (277a96df) **S1 · Langage visuel du socle.** Vague 2 · A1, K2.
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
- [x] (5a0129ec) **S2 · Noms d'une library.** `implementeur` · vague 2 · K0.
  Écrit : `plugin-socle/src/bibliotheque.ts` et son test.
  Fait quand : nom, clé et type de chaque variable par library et collection ;
  la plus liée est choisie ; à égalité ou sans liaison, aucune ; une library
  illisible est dite illisible.
- [x] (873c9b22) **S3 · Budget et annulation du moteur.** Vague 4 · seul · B1 en cours de
  conception (note N2).
  Écrit : `plugin-socle/src/composant/` (option de budget et jeton
  d'annulation, sans effet pour l'exporteur), tests de l'exporteur.
  Fait quand : l'exporteur garde ses attendus ; un budget dépassé arrête les
  lectures de variants ; une annulation rend « annulée », pas Bloquant ; le
  nombre de layers non lus est exact ou dit inconnu.

### Piste A · fusion et squelette

- [x] (e2b04108) **A0.1 · Renommage.** `implementeur` · vague 1 · seul · S0 ·
  déplacement.
  Lit : `plugin-architect/CARTE.md`, `tests/pluginsSepares.test.ts`, `tests/manifestsDesPlugins.test.ts`, `scripts/construire-plugin.mjs`.
  Vérifie : `npm run test:paquet -- architect`, `npm run build:plugin -- architect`, tests racine ; `npm test` et `typecheck` par un `verificateur`.
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
- [x] (b0fd52c8) **A0.2 · Nomenclature entre dans Architect.** `implementeur-exigeant` ·
  vague 1 · seul · A0.1 · déplacement.
  Lit : `plugin-architect/CARTE.md`, ses invariants, `tests/loiDEcriture.test.ts`, `tests/loiDeLectureSeule.test.ts`.
  Vérifie : `npm run test:paquet -- architect`, tests racine ; `npm test` par un `verificateur`.
  L'orchestrateur note ici le commit de repli avant de lancer : `e2b04108`.
  Écrit : `git mv` : sandbox → `src/nomenclature/`, `ecriture.ts` →
  `src/ecriture/noms.ts`, interface → `src/ui/nomenclature/`, galerie et tests
  à côté, invariants → `plugin-architect/invariants/` ; suppression de
  `packages/plugin-architect` et de ses entrées ; tests racine
  `nomsDePalettes`, `loisEntreProduits`, `fabriquesDeFichiers`, `releveDeTest`
  sur les nouveaux chemins ; lois du §3 ; par l'orchestrateur : routes, carte,
  invariants, `package-lock.json`.
  Étapes : (1/3) sandbox et écriture ; (2/3) interface, galerie, tests ;
  (3/3) suppression du paquet, lois, tests racine.
  Fait quand : tests du sandbox et loi d'écriture de Nomenclature sans
  changement d'attendu ; la loi d'Architect refuse, à l'essai, une écriture et
  un import de `template/ecriture` hors de `src/ecriture/` ; `npm test` passe.
- [x] (c2dc6c87) **A1 · Squelette des domaines.** `implementeur-exigeant` · vague 2 · seul
  · A0.2, note N1 · code nouveau.
  Lit : N1, `src/code.ts`, `src/messages.ts`, `src/ui/textes.ts`, `src/ui/index.ts`, `galerie/etats.cjs`.
  Vérifie : `npm run test:paquet -- architect`, `npm run build:plugin -- architect`, tests racine.
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

Défauts : `implementeur-exigeant` · écran nouveau · Écrit : pour chaque
domaine du lot (N1), `src/ui/<d>/**`, `src/ui/textes/<d>.ts`,
`src/ui/styles/<d>.css`, `galerie/etats/<d>.cjs`, `tests/interface/<d>.test.mjs`,
et l'entrée de ses cadres dans `galerie/cadres.json` · Lit : la note N1, les
cadres du lot par `grep` (§4.6), les vues de l'explorateur ou de Nomenclature
qu'il reprend · Vérifie : `npm run test:paquet -- architect` et
`node galerie/comparer-maquette.cjs <cadres du lot>`. Chaque lot crée les états de galerie et
les tests d'interface de ses cadres, sans `test:ui`, et retire ses mots de la
liste d'exceptions de la loi du vocabulaire. Les données viennent des fixtures
de galerie quand le lot B n'est pas fait.

- [x] (162cb94a) **U0 · Manifeste des cadres et comparateur.** Vague 2 · A1 (exempté de
  S1 : outil).
  Écrit : `plugin-architect/galerie/cadres.json`,
  `plugin-architect/galerie/comparer-maquette.cjs`.
  Fait quand : règles du §4.10 ; à l'essai, une police changée et un élément
  retiré font échouer la comparaison ; un cadre manquant aussi.
- [x] (9d3fb0f9, 6e58255e) **U1 · Mode Tokens, Corrections.** Vague 3 · S1, A1.
  Domaines : `commun` (barre), `arbre`, `nomenclature`.
  Maquette : `t-renommages` ; `fenetreTokens`, `MODES_AFFICHES`,
  `ARBRE_INTERFACE`, `LIGNES_INTERFACE`, `ciblerCarte`, `nomenclatureLaterale`.
  Fait quand : barre, arbre et « replier les autres », modes sur une ligne,
  tableau des tokens avec renommages cochés (terme vert cliquable), carte
  ciblée ouverte, puce du filtre de l'arbre, onglets, pied ; Appliquer n'écrit
  que les noms affichés (M-11) ; les textes repris de l'explorateur disent
  « scope » ; comparateur sans écart.
- [x] (a35cc6b9) **U2 · Recherche, fiche d'une variable.** Vague 3 · U1.
  Domaines : `recherche`, `fiche`.
  Maquette : `t-questions`, `t-terme`, `t-fiche` ; `LIGNES_BACKGROND`,
  `LIGNES_BACKGROUND`, `FICHE_VARIABLE`, `ETAPE`.
  Fait quand : recherche en texte, préfixes `terme:` et `vise:` ; les trois
  liens écrivent dans le champ ; fiche : chaîne d'alias, « Renommage à
  appliquer », « Utilisée par » ; ligne choisie d'un fond uniforme ;
  comparateur sans écart.
- [x] (8161d108) **U3 · À faire dans Figma, modes et scopes.** Vague 3 · U1.
  Domaines : `structure`.
  Maquette : `t-structure`, `t-portees` ; `AFAIRE_TOKENS`, `LIGNE_SCOPE`.
  Fait quand : constats typés, chemins dans une phrase ; cartes de modes et de
  scopes en Aujourd'hui et Après l'application ; comparateur sans écart.
- [x] (3b33f0c6) **U4 · Library, règles reçues, hors UCM.** (`t-hors` passe à U5 ; reprises Q-61, Q-63 et pastilles de À faire dans Figma) Vague 3 · U1.
  Domaines : `bibliotheque`, `nomenclature` (t-regle), `commun` (t-hors).
  Maquette : `t-bibliotheque`, `t-regle`, `t-hors` ; `REGLE_RECUE`.
  Fait quand : valeurs en attente en trait gris, onglets grisés, « Ouvrir
  Intencial Tokens » seulement si la clé est connue ; règles reçues en
  questions ; alerte hors UCM ; comparateur sans écart.
- [x] (3b33f0c6) **U5 · Vue Composant et section Variants.** (avec `t-hors`, Q-64) Vague 4 · S1, A1.
  Domaines : `commun` (barre, bouton Constats), `composant`.
  Maquette : `c-avant`, `c-replie`, `c-bouton-texte`, `c-gros`, colonne gauche
  de `c-corrections` ; `variants`, `COMPOSANTS`, `fenetreComposant`, `barre`,
  `corrigerDansLaVue`.
  Fait quand : panneau fermé à l'ouverture ; bouton Constats et pastille ;
  frontière tirable ; aperçu en haut ; Variants forme C, « +N », Tableau ;
  liaisons changées en vert, cliquables ; ouverture dans le mode du fichier et
  bascule ; comparateur sans écart.
- [x] (8668abc8, 1cb279bf) **U6 · Panneau des constats.** (1/2 : analyse, Corrections, clic, modèle, après, Ctrl+Z, e-* ; 2/2 : Questions, tranchée, À faire, Ignorés) Vague 4 · U5.
  Domaines : `analyse`, `corrections`, `questions`, `ignores`.
  Maquette : `c-corrections`, `c-clic`, `c-modele`, `c-questions`,
  `c-tranchee`, `c-afaire`, `c-apres`, `c-ctrlz`, `e-*` ; `CORR_ALERT`,
  `AFAIRE_ALERT`, `Q_TITLE`, `Q_OUTLINE`, `Q_CONTOUR`, `CLIC`, `PERIME`.
  Fait quand : trois onglets, cartes du tour 3, alertes, ignorés, ligne de
  réussite avec les sautées, panneau périmé, états de l'analyse dont
  « annulée » ; sélection Figma dans l'aperçu ; comparateur sans écart.
  (2/2) en plus : les dix tests d'interface rouges sur `8668abc8` (onglets
  Réglages et Historique comptés sous `.panneau-lateral .onglets`, `resize`
  lu avant son arrivée dans `composant.test.mjs`) ; `DEMANDES_PERMISES` et
  `MESSAGES_DU_SANDBOX` de `tests/interface/aide.mjs` (Q-75).
- [x] (4655b80c) **U7 · Contraste et accessibilité.** (avec six tests d'interface rouges d'`arbre` et `fiche`) Vague 5 · U6.
  Domaines : `accessibilite`, `questions` (x-button-corr).
  Maquette : `x-alert`, `x-button`, `x-button-corr` ; `paire`.
  Fait quand : paire mesurée, rapport et seuil, autres modes, limites ;
  questions d'état ; comparateur sans écart ; le bouton « Copier ses
  liaisons aux autres variants » de la section Variants envoie
  `servir-de-modele` (K11) et range les constats de `modele-propose` dans
  l'analyse (Q-74).
- [~ Claude 1] (1/2 : 286f30ba…ae468d26 ; 2/2 : 584826b7, 1f2c39d3 ; reste le bouton Préparer, Q-81) **U8 · Préparation et Configuration.** (1/2 : préparation dans le mode Composant, sept cadres `g-*` ; 2/2 : création dans le fichier des tokens, Configuration, Historique) Vague 6 · U6 (1/2) commité dans `partage/main`. Codex, dans son clone, pendant qu'U6 (2/2) et U7 tournent dans l'arbre partagé ; arrêté par sa limite le 23 octobre pendant (2/2), repris par Claude depuis son diff non commité (Q-78).
  Écrit : toute la piste U d'Architect : `src/ui/**`, `galerie/**` (dont `build-galerie.cjs`), `scripts/build-ui.cjs`, `tests/interface/**`, `tests/galerie.test.ts`, `tests/loiDuVocabulaire.test.ts`, et les documents du paquet (`CARTE.md`, `README.md`, `SPEC.md`, invariants). Les fichiers communs avec U6 et U7 reçoivent des ajouts courts, sans reformatage. Arrêt seulement pour un besoin dans `src/sandbox/`, `src/messages/`, `src/ecriture/`, le kit ou le socle.
  Textes hors maquette à écrire (skill `rediger-diagnostics-ucm`) : les codes de B8 (`MotifDeRefusDePreparation`, `MotifDeRefusDeLiaison`, `MotifDeRefusDeCreation`, `MotifDEchecDeCreation`, `MotifDeTexteRefuse`, `structure-annulee` : `journal`, `refus`, motifs des lignes sautées), Q-71 et Q-73.
  Domaines : `preparation`, `configuration`.
  Maquette : `g-*`, `cf-reglages`, `cf-historique` ; `PREPARER`, `CREER`,
  `optionP`, `cibleP`, `SECTIONS_NOUVELLES`.
  Fait quand : chaque choix porte son terme UCM puis sa description ; Préparer
  inactif tant qu'une question reste ; préparation reçue lue et validée ;
  comparateur sans écart.

### Piste B · sandbox d'Architect

Défauts : `implementeur` · code nouveau · Écrit : pour chaque domaine du lot
(N1), `src/sandbox/<d>.ts` et `tests/<d>.test.ts`, plus les fichiers que la
fiche nomme · Lit : N1, la note citée, les types de `@ucm-kit/core/controles`
· Vérifie : `npm run test:paquet -- architect`.
Chaque lot remplace la souche de son domaine et garde les types de N1.

- [x] (2300bcda) **B3 · Library en mode Tokens.** Vague 3 · S2 · hypothèses S-1, S-4.
  Domaines : `bibliotheque`. Écrit en plus : `src/lecture.ts`, `tests/loiDImport.test.ts`, `manifest.json` si S-4 sert la clé.
  Fait quand : arbre depuis les noms ; valeurs d'un groupe importées à son
  ouverture, par lots de huit ; loi d'import étendue ; `figma.fileKey` rangé
  sous sa clé quand il est servi.
- [x] (cd9a3a4d) **B6 · Journal étendu, scopes et modes.** `implementeur-exigeant` · vague
  3 · K5 fusionné.
  Domaines : `structure`. Écrit en plus : `src/ecriture/structure.ts`, `src/ecriture/journal.ts` (extrait du journal de `src/ecriture/noms.ts`, sans changer ses attendus), leurs tests.
  Fait quand : le journal range et l'Historique annule trois sortes nouvelles :
  scopes, cible d'alias par mode (`setValueForMode`, ancienne valeur gardée),
  création de variables ; une variable créée qui a gagné un usage accessible
  (alias, layer liée du fichier) n'est pas supprimée, et la limite des usages
  d'autres fichiers est dite ; un objet changé depuis est sauté ; tests de
  l'Historique sans changement d'attendu.
- [x] (2ff5fcf1) **B10 · Catalogue de référence.** Vague 4 · S2, K0 · hypothèse S-1.
  Écrit : `src/catalogue.ts`, `tests/catalogue.test.ts`, `src/lecture.ts` (loi d'import étendue), `tests/loiDImport.test.ts`.
  Fait quand : pour une analyse en mode Composant, les collections `theme`,
  `layout` et `components` de la library choisie sont lues : noms d'abord,
  valeurs importées par clé à la demande des contrôles ; chaque entrée est
  présente, absente, non chargée ou inaccessible ; un token hors de l'arbre
  ouvert est trouvé.
- [x] (bb6a148f) **B1 · Relevé du composant.** Vague 4 · K0, S3.
  Écrit : `src/lectureDuComposant.ts` et ses tests.
  Fait quand : relevé de N2 complet (tous les variants, propriétés, porteur
  réel, champ, indice, plage, peintures directes, opacités, fonds des
  ancêtres, propriétés de texte par plage, dimensions, styles, modes
  effectifs, espace de couleur) ; budget commun avec S3 ; test sur un jeu
  factice de six variants.
- [x] (10420876) **B2 · Analyse.** Vague 4 · B1, B10, K3, S3.
  Domaines : `analyse`, `commun` (sélection, périmé).
  Fait quand : Analyser puis Actualiser lancent moteur et kit ; identité de
  l'analyse (sujet, génération) dans chaque message ; seconde analyse
  refusée ; sélection extérieure d'un autre composant et Ctrl+Z rendent le
  panneau périmé, sans réanalyse ; une erreur du moteur rend un Bloquant et
  rien d'autre ; une annulation rend « annulée » ; tests : analyse lente
  d'Alert puis sélection de Button, clic sur un constat, Ctrl+Z puis
  Actualiser. Le moteur s'appelle par `analyserLeComposant` (S3) ; un
  résultat `partielle` ne sert qu'aux constats du panneau, jamais à un contrat
  écrit (son `coverage` se dit complet).
- [x] (5dad6d5d) **B9 · Branchement de l'accessibilité et de la typographie.** Vague 5 ·
  K4, K7, B2.
  Domaines : `accessibilite`, `configuration` (niveau, et library rangée : Q-43).
  Fait quand : constats de K4 et K7 dans l'analyse ; niveau AA ou AAA lu dans la
  Configuration.
  Note : le catalogue (B10) n'a pas les noms de modes d'une collection de
  library ni la clé des cibles d'alias (Q-28) ; B9 les ajoute dans
  `src/catalogue.ts` si le contraste par mode en a besoin.
- [x] (f8572ddd) **B4 · Écriture des liaisons.** `implementeur-exigeant` · vague 5 · B2,
  K8, note E · hypothèse S-2.
  Domaines : `corrections`.
  Écrit : `src/ecriture/liaisons.ts` et ses tests.
  Fait quand : un test par sorte (nombre, fill de frame, stroke, texte) sur
  doubles ; avant chaque écriture, les faits de la correction sont relus ; un
  objet changé ou un fait faux est sauté et compté ; un fichier qui ne déclare
  plus UCM ne reçoit rien ; un lot = un point d'annulation.
- [x] (adb633a3) **B5 · Corrections, questions, Ignorer.** Vague 5 · B4, K8.
  Domaines : `corrections`, `questions`, `ignores`. Écrit en plus : `src/ecriture/noms-de-valeurs.ts`, `src/ecriture/ignores.ts`, leurs tests.
  Fait quand : corrections de K8 dans le lot Appliquer ; renommer une valeur
  de variante (C12), une valeur déjà présente → question ; Ignorer et « Ne plus
  proposer » rangés à la racine du document ; « Ne plus ignorer » rend le
  constat ; une limite de lecture ne s'ignore pas.
- [x] (3ba33dce) **B7 · Règles de composant.** Vague 5 · B2.
  Domaines : `regles`. Écrit en plus : `src/ecriture/regles.ts` (appelle `template/ecriture.ts`), son test.
  Écrit : en plus, les importeurs permis de
  `plugin-exporter/tests/loiDuDocumentIntact.test.ts`.
  Fait quand : C43, C44, C45 ; C46 par `template/ecriture.ts` ; ajout et
  retrait d'une instance remplie refusés avec un motif.
- [x] (107b605c) **B8 · Préparation, création, retour.** (avec l'annulation de la structure par l'Historique et le message `regles-recues`, Q-71) Vague 6 · K6, B6, B4, note P.
  `implementeur-exigeant` (journal). Domaines : `preparation`, `configuration`. Écrit en plus : `src/ecriture/variables.ts`, `src/preparations.ts` (clientStorage), leurs tests.
  Fait quand : règles de la note P (identité, destination, versions du texte
  échangé, états par entrée, reprise sans doublon) ; création des seules
  variables manquantes par le journal ; existant divergent → question ;
  retour au composant seulement pour la même clé de jeu ; une variable pas
  encore publiée laisse sa ligne sans case ; règles reçues par le même
  chemin (C13) ; tests : deux fichiers homonymes, deux préparations, une
  création interrompue, un texte incompatible.

- [x] (ca0cd12a…d7c1024c ; fusion 9fa428bb) **B11 · Modules sans lecteur.** Codex · retrait · aucune dépendance (Q-21).
  Écrit : suppression de `src/{comparaison,releves,simulation,rapport}.ts` et
  `src/integrations/contrats.ts`, de leurs tests propres
  (`tests/{comparaison,annexes,contrats}.test.ts`) et des seuls cas qui les
  importent dans `tests/{copie,explorationEtendue,integrationsUcm}.test.ts` ;
  dans les tests de loi (`tests/loiDEcriture.test.ts` et tout autre), le
  seul nom d'un fichier retiré dans une liste de fichiers, sans changer la
  règle ; leurs lignes de `CARTE.md`, des invariants et du `SPEC.md` du paquet.
  Fait quand : aucun fichier de `src/` ne les importe avant le retrait (sinon
  le module reste et le compte rendu le dit) ; `profilUcm.ts` et
  `lireLaRecette` restent ; `agents:diff` ne liste aucun chemin mort.
  Vérifie : `npm run test:paquet -- architect`, `npm run build:plugin -- architect`, tests racine.

### Piste X · autres plugins

- [x] (221ad69b) **X1 · Textes de l'exporteur et de Palettes.** `implementeur` · vague 2 ·
  A0.2.
  Écrit : `plugin-socle/src/composant/contract/semantics.ts` (texte de l'exporteur, après S0) et
  les catalogues de Palettes, en français et en anglais, qui nomment « UCM
  Nomenclature » ou l'explorateur.
  Fait quand : ils disent « UCM Architect » ; `test:paquet -- exporter` et
  `-- palettes` passent.

### Piste O · orchestrateur

- [x] (f32079e8) **O0 · Vague 0** : notes du §7, fiches exécutables, sondes envoyées.
- [~ orchestrateur] (ROADMAP 9522c12b ; anciens noms e91a846c) **O1 · Documents de jalon** : cohérence générale de `agents:diff`,
  `SPEC.md` de l'explorateur devenu celui d'Architect, README de ce dossier,
  ROADMAP.
- [ ] **O2 · Fin** (skill `publier-paquets`) : recette locale, commit final,
  push unique, CI distante verte, puis publication du kit, puis de la CLI et
  de l'adaptateur, depuis le commit poussé ; versions servies contrôlées.

## 7. Notes de conception

Écrites par l'orchestrateur en vague 0, dans ce fichier, sous ce titre. Les
choix tranchés par le mainteneur y entrent tels quels.

Écrites le 22 octobre (vague 0). Elles partent sans validation (Q-5).

### N1 · Domaines et messages

**Fichiers d'un domaine `<d>`**, créés par A1 avec des index déjà remplis :

| Rôle | Chemin, dans `packages/plugin-architect/` |
|---|---|
| Messages | `src/messages/<d>.ts` : `DemandeDe<D>` (UI → sandbox) et `MessageDe<D>` (sandbox → UI) ; `src/messages/index.ts` les réunit en `UiRequest` et `PluginMessage` |
| Sandbox | `src/sandbox/<d>.ts` : `traiter(demande, contexte)` ; `code.ts` aiguille par une table `type → domaine` |
| Interface | `src/ui/<d>/` (vues), `src/ui/textes/<d>.ts`, `src/ui/styles/<d>.css` |
| Galerie et tests | `galerie/etats/<d>.cjs`, `tests/interface/<d>.test.mjs` ; tests unitaires `tests/<d>.test.ts` |

**Identité d'analyse.** `IdentiteDAnalyse = { sujet: string; generation: number }`.
`sujet` est la clé du jeu de variants (`key` du `COMPONENT_SET`, ou du
`COMPONENT` seul). Le sandbox incrémente `generation` à chaque `analyser`.
Chaque message des domaines `analyse`, `corrections`, `questions`, `ignores`,
`preparation` (côté composant) porte `analyse: IdentiteDAnalyse` ; l'interface
ignore un message dont l'identité diffère de la sienne. Une seule opération à
la fois : une demande reçue pendant une opération rend `occupe { analyse }`.

| Domaine | Id | UI → sandbox | Sandbox → UI | Cadres |
|---|---|---|---|---|
| Commun | `commun` | `lire-preferences`, `ranger-preferences`, `changer-disposition`, taille (existants) | `preferences`, `disposition`, `selection { sujet, ignores, origine: 'plugin' \| 'figma' }`, `declaration { architecture: ArchitectureDuFichier }` (à l'ouverture et à chaque changement) | tous |
| Arbre et tableau des tokens | `arbre` | `lire-releve`, `annuler` (existants) | `progression`, `releve`, `lecture-echouee`, `annulation` (existants) | t-renommages |
| Recherche | `recherche` | aucun : filtre de l'interface sur le relevé | aucun | t-questions, t-terme |
| Fiche | `fiche` | aucun : calculée du relevé et du résultat de Nomenclature | aucun | t-fiche |
| Library | `bibliotheque` | `lire-bibliotheque { demande }`, `lire-valeurs { demande, cles: string[] }` | `bibliotheque { demande, library: { nom, cle } \| null, collections: { nom, cle, variables: { nom, cle, type }[] }[], cleDuFichierDesTokens: string \| null }`, `valeurs { demande, valeurs }`, `bibliotheque-illisible { demande, motif }` | t-bibliotheque |
| Nomenclature | `nomenclature` | messages de Nomenclature, gardés par A0.2 | idem | t-renommages, t-questions, t-terme, t-regle |
| Structure et scopes | `structure` | `lire-structure { demande }`, `appliquer-structure { demande, ids: string[] }` | `structure { demande, constats: Constat[], corrections: Correction[] }`, `structure-appliquee { demande, ecrites: number, sautees: { id, motif }[] }` | t-structure, t-portees |
| Vue Composant | `composant` | `lire-composant` (existant) | `composant`, `apercu-du-composant` (existants) | c-avant, c-replie, c-bouton-texte, c-gros |
| Analyse | `analyse` | `analyser {}`, `annuler-analyse { analyse }` | `analyse-commencee { analyse }`, `analyse-en-cours { analyse, variantsLus, variantsTotal }`, `analyse { analyse, statut: 'complete' \| 'partielle' \| 'annulee' \| 'arretee', constats: Constat[], lecture, variants }`, `perime { analyse, cause: 'ecriture' \| 'document' \| 'selection' }`, `occupe { analyse }` | e-vide, e-cours, e-aucun, e-partiel, e-echec, e-biblio, e-hors |
| Corrections | `corrections` | `appliquer-corrections { analyse, ids }`, `selectionner { analyse, layers: string[] }` | `corrections-appliquees { analyse, ecrites, sautees: { id, motif }[], resume }` | c-corrections, c-clic, c-modele, c-apres, c-ctrlz, e-ecriture |
| Questions | `questions` | `repondre { analyse, question, reponse }`, `annuler-reponse { analyse, question }` | `question-repondue { analyse, question, correction: Correction \| null }` | c-questions, c-tranchee, x-button-corr |
| Ignorés | `ignores` | `ignorer { analyse, constat, portee: 'constat' \| 'proposition' }`, `ne-plus-ignorer { analyse, constat }` | `ignores { analyse, constats: string[] }` | c-afaire, c-clic |
| Accessibilité | `accessibilite` | aucun : constats de l'analyse | aucun | x-alert, x-button |
| Règles de composant | `regles` | aucun : leurs corrections passent par `appliquer-corrections` | aucun | c-corrections (Règles d'usage) |
| Préparation | `preparation` | `preparer { analyse, reponses }`, `lire-preparations {}`, `lire-texte { texte }`, `creer-variables { preparation }`, `abandonner-preparation { preparation }`, `copier-preparation { preparation }` | `preparations { preparations: Preparation[] }`, `preparation-texte { texte }`, `texte-refuse { motif }`, `variables-creees { preparation, creees, gardees, sautees }` | g-* |
| Configuration | `configuration` | `lire-configuration {}`, `ranger-library { cle }`, `ranger-niveau { niveau: 'AA' \| 'AAA' }` ; Historique de Nomenclature | `configuration { library: { cle, nom, liaisons } \| null, candidates: { cle, nom, liaisons }[], niveau }` | cf-reglages, cf-historique |

Les noms et champs des messages existants de l'explorateur et de Nomenclature
ne changent pas ; ils passent dans les fichiers de leur domaine.

**Sélection.** Seul `selectionner`, envoyé au clic sur un constat, change la
sélection, par `src/ecriture/selection.ts`. Le sandbox retient les layers
qu'il a sélectionnés ; le `selectionchange` qui suit porte `origine:
'plugin'` et ne rend pas le panneau périmé.

**Panneau périmé.** Le sandbox envoie `perime` après sa propre écriture
(`ecriture`), sur un `documentchange` qui touche un nœud du jeu analysé
(`document` : un Ctrl+Z en est un), et sur une sélection Figma d'un autre jeu
de variants (`selection`). L'interface garde les constats, affiche l'alerte
`PERIME` et ne relance rien avant Actualiser ou Analyser.

**Ouverture.** Le sandbox envoie `disposition: 'composant'` quand la sélection
a un sujet, `'tokens'` sinon. Fenêtres : §2.

### N2 · Relevé et catalogue

Types publiés par `@ucm-kit/core/controles` (K0), sérialisables, sans Figma.

```ts
interface ReleveDeComposant {
  version: 1;
  jeu: { cle: string; id: string; nom: string };
  proprietes: { nom: string; type: 'VARIANT' | 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP'; valeurs?: string[]; defaut: string | boolean }[];
  variants: VariantLu[];
  lecture: { layersLus: number; layersNonLus: number | 'inconnu'; variantsNonLus: string[]; manquees: { layer?: string; champ?: string; motif: string }[] };
  espaceDeCouleur: 'srgb' | 'display-p3';
}
interface VariantLu { id: string; nom: string; valeurs: Record<string, string>; layers: LayerLu[]; modesEffectifs: Record<string, string> }
interface LayerLu {
  id: string; nom: string; type: string; parent: string | null; visible: boolean; opacite: number;
  dimensions: { x: number; y: number; largeur: number; hauteur: number };
  peintures: PeintureLue[];                 // fills et strokes directs
  strokeWeight?: number;
  liaisons: LiaisonLue[];
  valeursEnDur: { champ: string; valeur: number }[]; // champs numériques sans variable
  texte?: { style: string | null; plages: { debut: number; fin: number; fontSize: number; fontWeight: number; peintures: PeintureLue[]; liaisons: LiaisonLue[] }[] };
  instanceDe?: { cle: string; nom: string; distante: boolean; pilotee: string | null }; // pilotee : propriété INSTANCE_SWAP
}
interface PeintureLue { champ: 'fills' | 'strokes'; indice: number; type: string; visible: boolean; opacite: number; blendMode: string; couleur?: { r: number; g: number; b: number; a: number } }
interface LiaisonLue { champ: string; indice?: number; plage?: { debut: number; fin: number }; porteur: string; variable: { id: string; cle: string; nom: string; collection: string; distante: boolean } }
```

- `porteur` est le layer qui porte la liaison (le calque de l'instance quand
  une surcharge la pose). `parent` chaîne les layers jusqu'à la racine du
  variant : le kit compose les fonds des ancêtres et leurs opacités ; un fond
  hors du variant n'est pas lu, et le contraste rend une limite.
- `layersNonLus` vaut `'inconnu'` quand la lecture s'arrête avant d'avoir
  compté. Une lecture manquée n'est jamais un constat.

```ts
interface CatalogueDeReference {
  version: 1;
  library: { nom: string; cle: string } | null;      // null : variables locales
  collections: { cle: string; nom: string; role: Collection | null; modes: { id: string; nom: string }[]; etat: 'lue' | 'inaccessible' }[];
  variables: { cle: string; nom: string; collection: string; type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'; etat: 'presente' | 'non-chargee' | 'inaccessible'; scopes?: string[]; valeurs?: Record<string, { alias: string } | { valeur: unknown }> }[];
}
```

- `role` vient de la déclaration UCM et du nom de la collection
  (`COLLECTIONS`, `FORMES_ANCIENNES_DES_COLLECTIONS`), jamais d'une association
  manuelle.
- Une recherche par nom ou par clé rend l'entrée, ou `absente`. La jointure
  entre une liaison et le catalogue se fait par `cle`.
- `non-chargee` : nom connu, valeurs pas encore importées ; un contrôle qui
  a besoin des valeurs rend une limite tant qu'elles manquent.

```ts
interface Constat {
  id: string;                         // stable : code, variants, layers, champ
  code: `C${number}`;
  type: TypeDAlerte;                  // de K2 : 'bloquant' | 'corriger' | 'verifier' | 'info' | 'tenu'
  famille: 'liaisons' | 'tailles' | 'tokens' | 'variants' | 'contraste' | 'typographie' | 'regles' | 'visibilite' | 'export';
  variants: string[]; layers: string[];
  faits: Record<string, string | number>;
  correction?: Correction; question?: Question; limite?: true;
}
interface Correction { id: string; sorte: 'liaison' | 'nom-de-valeur' | 'regles' | 'scope' | 'alias-de-mode' | 'variable';
  cible: { layer?: string; champ?: string; indice?: number; plage?: { debut: number; fin: number }; variable?: string; mode?: string };
  avant: string | null; apres: { cle?: string; nom: string };
  aRelire: { axes?: Record<string, string>; regle: string; avant: string | null } }
interface Question { id: string; candidats: { cle?: string; nom: string }[]; indice?: string } // aucun candidat coché
```

| Contrôles | Relevé | Catalogue | Lecteur |
|---|---|---|---|
| C7 à C11, C31 à C33 | `proprietes`, `variants[].valeurs` | noms de `components/<composant>/…` | B1, B10 |
| C15 à C19, C21, C22, C24, C25 | `liaisons` (champ, porteur, nom), valeurs du variant | noms, `scopes` | B1, B10 |
| C20, C61 | `liaisons[].variable.collection` | `role` des collections | B1, B10 |
| C29 | `valeursEnDur`, `dimensions` | valeurs de `layout` | B1, B10 |
| C59, C60, C63 | `liaisons`, `peintures`, `parent` | noms du thème, `scopes` | B1, B10 |
| C49 à C53 | `peintures`, `opacite`, `parent`, `texte.plages`, `modesEffectifs`, `dimensions`, `strokeWeight` | `valeurs` par mode des variables liées, importées à la demande | B1, B10 |
| C64 à C67 | `texte.style`, `texte.plages`, `instanceDe`, `dimensions` | `layout/icon`, `typography` | B1, B10 |
| C30, C34, C35, C41, C42, C44 | rendus par le moteur de l'exporteur (S0), traduits en `Constat` par B2 | — | moteur |

Budget : B1 et S3 partagent une borne, 2 000 layers par défaut, nommée dans le
socle.

### T · Table des constats attendus

Corrige la section 4 de la grammaire : un champ peint sans variable relève de
C30 ; un rôle non peint ne donne aucun constat ; C59 attend K5. Les relevés
écrits à la main de K3 reproduisent ces cas. Relue par le mainteneur à la fin.

**Alert**, fichier Intencial, 11 variants (Severity × Variant, sans
`Severity=warning, Variant=filled`), tokens sous `colors/` :

| # | Code | Où | Type | Onglet, forme |
|---|---|---|---|---|
| A1 | C15, C22 | `Severity=success, Variant=standard`, layers icon et container liés à `colors/info/standard/{icon,background}` | À corriger | Corrections : `info → success` |
| A2 | C59 | `Variant=outlined`, layer message, lié à un foreground de `surface` sans fond teinté | À corriger | Corrections : tokens sans fond (K5) |
| A3 | C29 | tous les variants, padding sans variable | À corriger | Corrections : tokens de taille |
| A4 | C43, C46 | aucune instance de règles | À corriger | Corrections : créer l'instance, 3 règles |
| A5 | C8 | 36 tokens rangés sous `colors`, forme tolérée de `color` | À corriger | À faire dans Figma, fichier des tokens |
| A6 | C20 | `alert/size/gap` vise une primitive | À corriger | À faire dans Figma |
| A7 | C41 | `Severity=info, Variant=filled`, container, `colors/info/filled/border` absente de la library | Bloquant | À faire dans Figma |
| A8 | C32 | 3 tokens `warning/filled` sans variant | À vérifier | À faire dans Figma |
| A9 | C31 | `Severity=warning, Variant=filled` absent | À vérifier | À faire dans Figma |
| A10 | C21 | icon de `Severity=info, Variant=filled`, couleur que les 10 autres n'emploient pas | À vérifier | À faire dans Figma |
| A11 | C49 | message de `Severity=warning, Variant=standard`, 3,9:1 en Dark | À corriger | À faire dans Figma |
| A12 | C50 | stroke de `Variant=outlined` sur la page, 2,4:1 | À corriger | À faire dans Figma |
| A13 | C49, limite | fill dégradé de `Severity=error, Variant=filled` | Information | À faire dans Figma |
| A14 | C64 | message de `Severity=success, Variant=standard` sans le text style des autres | À vérifier | À faire dans Figma |
| A15 | C66 | icon de `Severity=info, Variant=filled` hors de la library d'icônes | À vérifier | À faire dans Figma |
| A16 | C35 | icon-close masqué sans propriété (moteur) | À vérifier | À faire dans Figma |
| A17 | C25, C70 | title sans variable : `…/title` et `…/foreground` conviennent | — | Questions |
| A18 | C12, C13 | `Variant=Outlined`, tokens en `outline` | — | Questions |
| A19 | C30 | stroke en dur de `Variant=outlined`, aucun token `border` | — | Questions : préparer les tokens |

Aucun constat : `alert/size/gap` sans axe de taille (règle 1) ; un token
partagé entre deux états ; un rôle absent d'une combinaison (règle 3).

**Button**, 216 variants (Style, Palette, State, Size) :

| # | Code | Où | Type | Onglet, forme |
|---|---|---|---|---|
| B1 | C16, M-15 | `State=hover`, container lié au token du repos ; 46 des 54 `State=hover` emploient un token hover | — | Questions, indice |
| B2 | C60 | `Style=text, State=hover`, label vise `page` alors que le survol passe sur `surface` | — | Questions |
| B3 | C50 | anneau de `Palette=secondary, Style=outlined, State=focus`, 2,1:1 | À corriger | À faire dans Figma |
| B4 | C36 | `Palette=primary, Style=text, State=focus` sans anneau visible | À corriger | À faire dans Figma |
| B5 | C51 | anneau à 1 px de stroke weight | À vérifier, recommandation | À faire dans Figma |
| B6 | C52 | `Size=small`, 20 × 20 px | À corriger | À faire dans Figma |
| B7 | C52 | `Size=medium`, 36 px de haut, 44 px recommandés | À vérifier, recommandation | À faire dans Figma |
| B8 | §2, 12 px | label de `Size=small` à 11 px | À vérifier, recommandation | À faire dans Figma |
| B9 | C53 | 54 variants `State=disabled` non mesurés | Information | À faire dans Figma |
| B10 | C10 | `button/size/medium`, forme tolérée de `md` | À corriger | À faire dans Figma, fichier des tokens |
| B11 | C20 | `button/size/medium/padding-x` vise `primitives.dimension.14` | À corriger | À faire dans Figma |
| B12 | C21 | `button/color/primary/text/focus/foreground` vise `surface`, les cinq autres palettes `page` | — | Questions : régularité, pas une règle écrite |

### G · Grammaire

- `PositionDeChemin` reçoit `facultative?: true`. Une forme de n positions
  dont f facultatives reconnaît un chemin de n − k segments (k ≤ f). Parmi les
  lectures possibles, la première garde le plus de positions, puis les plus à
  gauche.
- Un segment ne prend une position extensible à nom propre (composant,
  élément) que si aucune position suivante ne le reconnaît par son registre.
- Deux formes pour `components`, sans le préfixe de collection :
  `components:color` = composant, `color`, élément?, palette?, style?, taille?,
  état?, rôle ; `components:size` = composant, `size`, élément?, taille?,
  état?, propriété. Registres : composant et élément extensibles, à nom
  propre ; famille `FAMILLES_COMPOSANT` (`color`, `size`) ; palette =
  `REGISTRE_STATUTS`, `FAMILLES_BRANDS` et `neutral` ; style extensible, nourri
  des termes de l'équipe (`vocabulaire-du-fichier.ts`) et des valeurs d'axe ;
  taille `REGISTRE_TAILLES` ; état `REGISTRE_ETATS` ; rôle `REGISTRE_ROLES`.
- Registre propre à `components` (remplace G-8) : `REGISTRE_PROPRIETES_COMPOSANT`
  = `padding`, `gap`, `width`, `height`, `border-width`, `radius`,
  `icon-size`, et les combinaisons avec `REGISTRE_COTES` (`padding-x`,
  `padding-top`, `gap-y`…). Les registres que Nomenclature lit pour les autres
  collections n'en reçoivent rien.
- `grammaire.ts` et `architecture.ts` lèvent l'exclusion de `components` :
  `IdentifiantDeForme`, `FORMES_DES_CHEMINS`, `formesReconnues` et
  `reconnaitreLeChemin` l'admettent ; `collection-sans-grammaire` disparaît.
- `layout` : `icon` entre dans `FAMILLES_LAYOUT`, avec la forme `layout/icon/<taille>`
  (`REGISTRE_TAILLES`) ; `sizing` n'admet qu'une valeur numérique (`3,5`, `14`)
  ou `none`, `full`.
- Les axes du composant : `reconnaitreLeChemin('components', segments,
  { themes, axes })`, avec `axes?: { palette?: string[]; style?: string[];
  taille?: string[]; etat?: string[] }`, valeurs normalisées. Deux lectures
  sans axes rendent `{ conforme: false, raison: 'ambigu', lectures }` ; les
  axes en gardent une.
- Cas nommés, tests de K1 :

| Chemin | Lecture attendue |
|---|---|
| `button/color/primary/contained/hover/background` | composant, famille, palette, style, état, rôle |
| `button/size/md/padding-x` | composant, famille, taille, propriété |
| `button/size/medium/padding-x` | idem ; `medium` forme tolérée de `md` |
| `alert/color/danger/standard/foreground` | composant, famille, palette, style, rôle |
| `alert/size/gap` | composant, famille, propriété |
| `tilelink/color/info/hover/foreground` | composant, famille, palette, état, rôle |
| `stresstest/color/head/info/foreground` | composant, famille, élément, palette, rôle |
| `stresstest/info/head/color/text` | refusé : `aucune-forme` |
| `button/color/text/foreground` | `ambigu` sans axes (style `text` ou élément `text`) ; style avec `axes.style` ∋ `text` ; élément sinon |
| `layout/icon/xl` | reconnu |
| `layout/sizing/xl` | refusé |
| `layout/sizing/3,5` | reconnu |

Le jugement d'une liaison (section 4 de la grammaire) reste à K3 et K5.

### E · Écriture des liaisons

Hypothèse : S-2 confirme les quatre écritures et le Ctrl+Z.

- `src/ecriture/liaisons.ts`, appelé par le domaine `corrections`.
- Champ numérique (`paddingLeft`, `itemSpacing`, `cornerRadius`,
  `strokeWeight`, `width`, `height`…) : `node.setBoundVariable(champ,
  variable)`. Fill ou stroke : `figma.variables.setBoundVariableForPaint(paint,
  'color', variable)`, puis copie du tableau, remplacement à l'indice et
  réaffectation de `fills` ou `strokes`. Texte : `setRangeFills(debut, fin,
  [paint lié])`.
- Une variable de library s'importe par `importVariableByKeyAsync(cle)`, une
  fois par lot.
- Ordre : la déclaration UCM est relue une fois au début du lot ; un fichier
  qui ne déclare plus UCM ne reçoit rien. Puis, correction par correction :
  le layer existe ; les valeurs du variant égalent `aRelire.axes` ; la
  liaison du champ égale `aRelire.avant` ; la peinture de l'indice existe et
  est unie ; la cible s'importe. Un écart saute la correction avec un motif :
  `objet-change`, `fait-faux`, `cible-introuvable` ou `erreur` (une écriture
  de Figma qui lève). Les autres s'écrivent.
- Annulation : aucun `commitUndo` entre deux écritures ; un `figma.commitUndo()`
  après le lot. Un Ctrl+Z défait le lot entier.
- Puis `corrections-appliquees` et `perime { cause: 'ecriture' }`. La
  sélection ne change pas.

### P · Préparation

- **Entrées** : le relevé (B1), le catalogue (`theme`, `layout`,
  `components`) et les réponses.
- **Axes** : palette reconnue par registre ; état par `REGISTRE_ETATS` ;
  chaque valeur de style pose une question de dossier (`solid`, `surface`,
  `page`) ; un axe inconnu pose « un token par valeur ? ».
- **Éléments** : deux layers du même rôle dans un variant, ou un nom par défaut
  de Figma (`Frame 12`), posent une question de nom.
- **Icône** : un vecteur dans une instance donne le rôle `icon` ; l'instance
  pilotée par une propriété `INSTANCE_SWAP` est l'icône du composant ; sinon
  une question.
- **Intensité** : exacte si le thème n'a que `soft` ou que `vivid` pour un
  statut ; sinon une question, une seule pour tous les statuts.
- **Cibles** : couleur → chemin du thème par `TABLE_DES_DOSSIERS` (dossier
  répondu, état de l'axe, rôle) ; `disabled` → `theme/disabled/*`. Une cible
  absente du catalogue devient une question.
- **Tailles** : le champ donne la famille (`padding`, `gap` → `sizing` ;
  `cornerRadius` → `radius` ; `strokeWeight` → `stroke` ; taille d'icône →
  `layout/icon`) ; la valeur en pixels donne le seul token de la famille qui
  la vaut, sinon une question.
- **Identifiant** : `prep-<horodatage>-<aléa>`, créé par Préparer.
- **Source** : `{ fichier: figma.root.name, cleDuFichier: figma.fileKey ?? null,
  jeu: { cle, nom } }`.
- **Destination** : la collection `components` locale du fichier ouvert,
  reconnue par la déclaration UCM ; refusée si `theme` manque (g-sans-cibles) ;
  une question si deux collections conviennent.
- **Texte échangé** : JSON `{ "format": "ucm-preparation", "version": 1, "id",
  "source", "creeLe", "variables": [{ "nom", "type", "cibles": { "<mode>":
  "<nom>" }, "layers": [{ "id", "variant", "champ" }] }], "regles": [{
  "ancien", "nouveau", "composant" }] }`. Validation : `format`, puis `version`
  (supérieure : refus « future »), puis chaque champ. Les règles reçues (C13)
  passent par le même texte.
- **Rangement** : une liste dans `figma.clientStorage`, sous la clé du kit
  `CLE_DES_PREPARATIONS` ; lecture, modification, réécriture, sans verrou ;
  le dernier écrit l'emporte. Une préparation se retrouve par son `id`.
- **États par entrée** : `a-creer`, `existe-identique` (gardée),
  `existe-divergente` (question), `creee`, `echec`. Une création interrompue
  se reprend : une entrée déjà créée et identique passe `existe-identique`,
  sans doublon.
- **Retour** : dans le fichier des composants, seulement si `source.jeu.cle`
  égale la clé du sujet (sinon g-autre). Une variable créée mais pas publiée
  laisse sa ligne sans case.

### M · Manifeste des cadres

U0 l'écrit dans `galerie/cadres.json`. Sorte : `fenetre` (fenêtre entière) ou
`seul` (extrait de barre latérale, `cadreSeul`). Lot : celui qui le rend
fidèle ; le jalon dit s'il est branché.

| Cadre | Taille | Sorte | Lot |
|---|---|---|---|
| t-renommages | 1360 × 900 | fenetre | U1 |
| t-questions, t-terme, t-fiche | 1360 × 800 | fenetre | U2 |
| t-structure | 1360 × 800 | fenetre | U3 |
| t-portees | 640 × 700 | seul | U3 |
| t-bibliotheque, t-regle, t-hors | 1360 × 800 | fenetre | U4 |
| c-avant | 1040 × 760 | fenetre | U5 |
| c-bouton-texte | 520 × 170 | fenetre | U5 |
| c-gros, c-replie | 520 × 760 | fenetre | U5 |
| c-corrections | 1040 × 800 | fenetre | U6 |
| c-clic, c-modele, c-questions, c-tranchee, c-afaire, c-apres | 1040 × 760 | fenetre | U6 |
| c-ctrlz | 1040 × 520 | fenetre | U6 |
| e-vide, e-cours, e-aucun, e-echec, e-ecriture, e-hors, e-biblio | 1040 × 520 | fenetre | U6 |
| e-partiel | 1040 × 760 | fenetre | U6 |
| x-alert | 1040 × 760 | fenetre | U7 |
| x-button | 640 × 760 | seul | U7 |
| x-button-corr | 640 × 560 | seul | U7 |
| g-entree | 1040 × 560 | fenetre | U8 |
| g-preparer | 1040 × 1000 | fenetre | U8 |
| g-pret | 1040 × 520 | fenetre | U8 |
| g-lier | 1040 × 640 | fenetre | U8 |
| g-creer, cf-reglages, cf-historique | 1360 × 800 | fenetre | U8 |
| g-cree | 1360 × 560 | fenetre | U8 |
| g-sans-cibles, g-autre, g-coller | 640 × 300 | seul | U8 |

43 cadres. `s-planche` (640 × 1900) va à la galerie du socle (S1).

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
| J0 | `npm test`, typecheck, build ; Nomenclature et l'explorateur ne vivent plus que dans Architect | vague 1 ; fait sur `b0fd52c8` |
| J1 | Mode Tokens : `t-*` au comparateur ; modes et scopes branchés | vague 3 |
| J2 | Mode Composant, lecture : `c-avant`, `c-replie`, `c-bouton-texte`, `c-gros`, `c-corrections` à `c-afaire`, `e-*`, branchés sur l'analyse | vague 4 |
| J3 | Corrections, écriture, accessibilité branchée : `c-apres`, `c-ctrlz`, `x-*` | vague 5 |
| J-F | Tous les cadres du manifeste ; ni « UCM Token Explorer », ni « UCM Nomenclature », ni « Token Architect » dans le code ou un document vivant ; O1 ; §9 rendu ; recette du mainteneur (`test:ui`, renommage et annulation, analyse et correction de Button sur une copie, préparation d'Alert) ; puis O2 | vague 6 |

## 9. Questions de fin

**Relais du 22 octobre au soir.** Session de l'orchestrateur et Codex
arrêtés par leur limite. Fait et commité : O0, S0, A0.1, A0.2 (J0 vert),
A1, U0, S1, S2, S3, X1, B1, B3, B10, K0, K1, K2, K4, K7, K9, V1 à V5. Ouverts
au moment de l'arrêt, non commités dans l'arbre partagé : aucun (U1 commité en partie, voir sa ligne) ; la reprise relit `git status`, garde ce
qui passe les vérifications de leur fiche, ou repart de la fiche. K3 : voir
sa ligne. Prochains lots : finir K3, fusionner Codex (lot V5), puis K8, K5,
B2, U2 à U4, B6.

**Relais du 23 octobre.** U6 et B8, interrompus vers 9 h 30 avec du travail
non commité dans l'arbre, repartent de cet arbre : U6 en deux étapes (1/2 :
analyse, Corrections, clic, modèle, après, Ctrl+Z, `e-*` ; 2/2 : Questions,
tranchée, À faire, Ignorés), B8 en un lot. Restent ensuite U7, U8, O1, le
jalon J-F et O2.

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

Choix faits sans le mainteneur :

- Q-6 · O0 · Chemins d'un domaine · N1 fixe les fichiers de chaque domaine ;
  les champs « Écrit » des lots U et B s'y ramènent · réversible : oui.
- Q-7 · K2 · Nom du type « Information » · `TypeDAlerte` vaut `info`, comme
  le kit de Codex ; N2 le suit · réversible : oui.
- Q-8 · K2 · Porte des signaux · réexportés par `referentiel/theme.ts`, car
  `referentiel/index.ts` n'était pas dans « Écrit » · réversible : oui.
- Q-9 · V · Numéros entre deux publications · kit 0.12.0 au premier lot V,
  puis un patch par lot V ; aucun numéro n'est publié avant O2 · réversible :
  oui, tant que rien n'est publié.
- Q-10 · S0 · Étapes · un seul commit vert au lieu de deux : les fichiers
  déplacés sont des renommages purs · réversible : oui.
- Q-11 · S0 · Incident · le commit `fa2837f5` (§9) a pris par erreur les
  renommages de S0 indexés par l'agent ; il n'est pas vert seul, `606e65f7`
  le complète ; l'historique n'est pas réécrit, Codex l'avait tiré.
  L'orchestrateur commite désormais par `git commit -- <chemins>` · réversible : non.
- Q-12 · S0 · Hors liste · l'agent a corrigé les chemins de
  `scripts/mesurer-export.cjs`, `sondes/S2-prechauffage.js` et
  `galerie/etats.cjs` de l'exporteur ; l'option de comparaison à une révision
  antérieure de `mesurer-export.cjs` ne trouve plus le moteur avant `606e65f7`
  · réversible : oui.
- Q-13 · A0.1 · Logos · `docs/marque/{cartes,logos}/ucm-token-explorer.svg`
  gardent leur nom de fichier et le texte visible « Token Explorer » ; seul
  leur `<title>` dit « UCM Architect ». Dessiner la carte d'Architect est un
  choix de marque laissé au mainteneur · réversible : oui.
- Q-14 · A0.1 · Permission · `tests/manifest.test.ts` du paquet attend
  `["teamlibrary"]` au lieu d'aucune permission · réversible : oui.
- Q-15 · A0.1 · Identifiants internes · l'id de domaine `explorateur` de
  `domiciles.json`, les noms de galerie `explorateur-large` et
  `explorateur-etroit` et les noms de code restent ; seuls le produit et les
  chemins changent · réversible : oui.
- Q-16 · A0.2 · Tests de Nomenclature · à plat dans `tests/`, préfixés
  `nomenclature` (le découvreur ne descend pas dans un sous-dossier) ;
  `tests/interface/nomenclature.test.mjs` n'est pas lancé avant A1 ; le test
  « manifeste sans permissions » de Nomenclature est retiré, `manifest.test.ts`
  couvre le manifeste · réversible : oui.
- Q-17 · A0.2 · Hors liste · l'orchestrateur corrige l'invariant de Palettes
  (`invariants/ecriture.md`, « trois plugins ») et abaisse à 9 le minimum de
  cartes de `tests/cartes.test.ts` · réversible : oui.
- Q-18 · A1 · Panneau périmé · le sandbox écoute `nodechange` de la page
  courante (et `currentpagechange`), pas `documentchange`, qui demande
  `loadAllPagesAsync` hors de `src/ecriture/` ; un jeu de variants vit sur
  une page, le Ctrl+Z reste vu · réversible : oui.
- Q-19 · A1 · Taille de fenêtre · les clés `ucm-explorateur/tailleFenetre*`
  restent : un designer qui a rangé une taille ne voit pas les nouveaux
  défauts tant qu'il ne redimensionne pas · réversible : oui.
- Q-20 · A1 · Collisions de messages · `noms-analyser`, `noms-repondre`,
  `noms-selection` pour Nomenclature · réversible : oui.
- Q-21 · A1 · Modules sans lecteur · `comparaison.ts`, `releves.ts`,
  `simulation.ts`, `rapport.ts` et `integrations/contrats.ts` restent, avec
  leurs tests, sans écran ; O1 les retire si rien ne les reprend · réversible : oui.
- Q-22 · A1 · Contexte de modes · sans Comparer, chaque collection prend son
  mode par défaut dans la table ; les modes affichés de `t-renommages`
  (U1) rendront le choix · réversible : oui.
- Q-23 · A1 · Classes de Nomenclature · `pastille`, `pied`, `corps`, `lien`,
  `recherche`, `zone-hors-champ` deviennent `noms-*` ; Nomenclature passe au
  thème sombre · réversible : oui.
- Q-24 · S2 · Types de la library · `bibliotheque.ts` a ses propres types
  sérialisables, pas `CatalogueDeReference` (nom, clé, type seuls) ; route
  vers le domaine d'Architect · réversible : oui.
- Q-25 · X1 · Portée · le seul texte affiché était le message de
  l'exporteur (`semantics.ts`) ; le reste était des commentaires ; les
  identifiants (`ecartsLaissesANomenclature`) restent · réversible : oui.
- Q-26 · B3 · Clé du fichier des tokens · B3 range `figma.fileKey` du
  fichier ouvert ; dans le fichier des composants, c'est la clé de ce
  fichier, pas celle des tokens. Sans effet tant que S-4 dit `undefined`.
  Si S-4 sert la clé : lot de reprise, la clé se range par library dans
  `figma.clientStorage` quand Architect s'ouvre dans le fichier des tokens ·
  réversible : oui. Question au mainteneur.
- Q-27 · B3 · Library sans liaison · avec plusieurs libraries et aucune
  liaison connue, `bibliotheque` rend `library: null` ; le choix passe par la
  Configuration (`e-biblio`, `cf-reglages`) ; `library.cle` porte le nom de
  la library, l'API n'en donne pas de clé · réversible : oui.
- Q-28 · B10 · Catalogue d'une library · une valeur d'alias porte
  l'identifiant de sa cible (pas sa clé) ; une collection de library a
  `modes: []`, les noms de modes ne se lisant qu'à l'import. B9 (contraste
  par mode) ajoute la lecture des modes s'il en a besoin · réversible : oui.
- Q-29 · S1 · Planche · elle omet « Section Variants » et « Mesure de
  contraste » de `s-planche` : ce sont des composants d'Architect (U5, U7),
  pas des signaux du socle · réversible : oui.
- Q-30 · S1 · Thème clair des `--ton-*` · la maquette ne donne que le sombre ;
  valeurs claires choisies (`#c62828`, `#b45309`, `#8a6500`, `#0b6bcb`,
  `#167a3e`) ; Palettes et l'exporteur ne chargent pas encore `langage.css`
  · réversible : oui.
- Q-31 · S1 · Loi des styles · « redéfinir » = un sélecteur sans
  combinateur qui nomme une classe du langage ; un sélecteur à ancêtre la
  place sans la redessiner ; la loi est appelée par le test du socle, qui
  lit les feuilles des trois plugins · réversible : oui.
- Q-32 · S3 · « Seul » · S3 tourne en parallèle d'U1 : la raison de
  « seul » (un fichier du socle déjà importé par Architect) ne vaut pas
  encore, Architect n'importe pas `composant/` avant B2 · réversible : oui.
- Q-33 · S3 · Deux entrées du moteur · `analyserLeComposant` (budget,
  jeton, résultat complete, partielle ou annulee) à côté de
  `handleExportComponent`, inchangé ; un contrat partiel ne s'écrit jamais
  · réversible : oui.
- Q-34 · K4 · Reprise · K4 est pris par Claude dans l'arbre partagé pour
  avancer B9 et U7 pendant que Codex fait K3, K8 et K5 ; son commit porte
  son lot V · réversible : oui.
- Q-35 · K4 · Faits rendus · C52 À corriger sous 24 px, À vérifier sous
  44 px ; le texte sous 12 px porte le code C49 (id `C49:taille`) ; une
  absence d'anneau est `C50:sans-anneau`, À corriger ; borne de 5 000
  combinaisons variants × modes · réversible : oui.
- Q-36 · V · Verrou de dépendances · une autre session modifie
  `package-lock.json` ; l'orchestrateur n'y commite que ses numéros, par un
  blob tiré de `HEAD` (`git update-index --cacheinfo`) · réversible : oui.
- Q-37 · K7 · Régularité · un style ou une liaison « attendus » demandent
  au moins deux autres variants unanimes ; une icône est un layer dont le nom
  contient « icon », ou piloté par une propriété INSTANCE_SWAP ; constats
  groupés par cause · réversible : oui.
- Q-38 · U1 · Comparateur « sans écart » hors d'atteinte · la maquette
  monte des galeries figées aux chiffres contradictoires (pied « 17
  variables, 3 collections » contre 1 072 dans l'arbre, 10 lignes pour 66
  variables, ordre de l'arbre, `hovered` et `hover`) ; 37 écarts de couleur
  viennent du décalque de thème de la galerie. Question au mainteneur :
  corriger les données de la maquette, ou borner le comparateur aux
  sélecteurs du manifeste et aux textes de la barre latérale. U2 à U8
  attendent cette réponse pour leur critère de fidélité · réversible : oui.
  Tranchée par l'orchestrateur le 23 octobre, le mainteneur ayant demandé de
  continuer sans arrêt : les écarts de style sont des défauts à corriger
  (la barre latérale prend les couleurs de la maquette, pas celles de
  l'explorateur) ; le contenu de la barre latérale suit la maquette ; les
  données contradictoires de l'arbre et du tableau sont bornées par deux
  champs du manifeste, `zonesDeDonnees` (styles seuls) et `ecartsDeclares`
  (texte et raison), que le comparateur compte à chaque passage. Chaque lot U
  déclare les siens et les justifie dans son compte rendu · réversible : oui.
- Q-39 · U1 · Pied et compte · « Appliquer renomme 24 variables et 1
  collection de Interface. » et un compte de 25 (la collection est un
  renommage) ; la maquette dit 24 · réversible : oui.
- Q-40 · B2 · Codes du moteur · le moteur ne porte aucun code : la table de
  `constatsDuMoteur.ts` reconnaît ses points par leur famille et des mots de
  leur titre (« variable introuvable », « masqué », « pilote ») ; une
  reformulation du moteur peut changer le code rendu. Un point inconnu devient
  C42, famille `export`, À vérifier ; un point `danger` est Bloquant. Reprise
  possible : un code porté par chaque point du moteur, dans le socle
  · réversible : oui.
- Q-41 · B2 · Arrêt · l'analyse arrêtée (erreur du moteur, aucune sélection)
  rend un seul Bloquant de code C42, famille `export` ; texte écrit hors
  maquette : « Aucun composant n’est sélectionné. » · réversible : oui.
- Q-42 · B2 · Progression · un seul `analyse-en-cours`, après le relevé : B1
  n'a pas de rappel par variant · réversible : oui.
- Q-43 · B9 · Library rangée · aucun lot ne branchait `ranger-library` ; B9
  prend tout le domaine `configuration` : niveau dans `figma.clientStorage`
  (préférence du designer), library dans les données partagées de la racine
  du document (choix de l'équipe), par `src/ecriture/configuration.ts`
  · réversible : oui.
- Q-44 · U1 · État `t-renommages` · la maquette montre à la fois une carte en
  « Chargement des noms… » et un pied qui compte déjà ; le code dit
  « Chargement… » au pied tant qu'une carte charge. L'état de galerie suit la
  géométrie de la maquette : lecture incomplète, Appliquer inactif, pastille
  de Corrections à 87 ; le pied et les pastilles sont des écarts déclarés.
  La pastille « 3 » de À faire dans Figma attend U3, qui retire la
  déclaration ; à valider à la recette · réversible : oui.
- Q-45 · U1 · Couleurs de la barre latérale · rôles `--laterale-*` sous
  `.panneau-lateral` seul, aux valeurs de la maquette (texte #ffffff et
  #b3b3b3, marque #0d99ff, fonds #2c2c2c, #383838, #4d4d4d…) ; l'arbre et le
  tableau gardent celles de l'explorateur · réversible : oui.
- Q-46 · B4 · Ordre · B4 part avant K8, sur des `Correction` écrites à la
  main : le type est fixé depuis K0 (N2), K8 ne fait que les produire. B4
  prend aussi `src/ecriture/selection.ts` (`selectionner`), qu'aucun lot ne
  nommait · réversible : oui.
- Q-47 · B7 · C45 · lu seulement sur une analyse complète du moteur ; comparé
  par propriété (axe ou booléenne), jamais par valeur (la complétude est
  C47, hors du plan) ; un constat par écart. Le meta de la maquette « 3
  règles » compte les propriétés ; `faits.regles` porte le nombre réel de
  règles du modèle · réversible : oui.
- Q-48 · B4 · Hors UCM · `ecrireLeLot` n'écrit rien, ni liaison ni instance
  de règles, dans un fichier qui ne déclare plus UCM (l'agent laissait passer
  les règles ; corrigé par l'orchestrateur, §2 Périmètre) · réversible : oui.
- Q-49 · B4 · Textes · `resume` suit la maquette (« 8 layers liés, 1 instance
  de règles créée ») ; écrits hors maquette : « Aucune correction écrite »,
  « N corrections sautées : 2 car <raison>… » et une raison par motif (« le
  composant a changé depuis l’analyse », « ce que l’analyse avait lu n’est
  plus vrai », « la variable cible est introuvable », « le fichier ne déclare
  plus UCM », « l’instance de règles contient déjà des règles », « Figma a
  refusé l’écriture », « l’analyse est périmée », « ce genre de correction
  n’est pas encore pris en charge ») · réversible : oui.
- Q-50 · B4 · Cause du `perime` · Figma peut émettre `nodechange` avant le
  `perime ecriture` du plugin ; la cause rendue est alors `document`. À voir
  à la recette · réversible : oui.
- Q-51 · K6 · Reprise · K6 ne dépend que de K1 et de la note P ; Claude 2 le
  prend dans l'arbre partagé pendant que Codex fait K8 puis K5 ; son commit
  porte son lot V · réversible : oui.
- Q-52 · K8 · Forme de `avant` · Codex y mettait la clé de la variable liée ;
  l'orchestrateur la remplace par son nom, que B4 relit (`0ca22691`) ; un
  renommage entre l'analyse et l'écriture saute donc `fait-faux`
  · réversible : oui.
- Q-53 · K6 · Choix de la préparation · crans lus dans le sens `normal` ; un
  seul alias pour tous les modes de `components` ; `Size` absent des noms de
  couleur, état absent des noms de taille ; rôle : contour → border, texte →
  foreground, vecteur dans une instance → icon, sinon background ; l'état ne
  joue que pour le fond ; `focus` et `selected` sans variable de thème → question ;
  padding gauche et droit égaux → `padding-x` ; valeur 0 et rayons par coin
  ignorés. Les libellés des questions restent à B8 et U8 · réversible : oui.
- Q-54 · U2 · Copies de l'inspecteur · Nom Figma, Valeur, Hexadécimal, le
  contraste d'une paire et les sections d'intégrations disparaissent avec
  l'inspecteur ; la fiche de la maquette n'a pas de bouton de copie.
  `app.copier` reste sans appelant ; O1 le retire si rien ne le reprend.
  Question au mainteneur · réversible : oui.
- Q-55 · U2 · Recherche et fiche · « Utilisée par » liste 10 variables puis
  « Et N autres. » (hors maquette) ; note du tableau pour `vise:` : « N
  variables visent X » (hors maquette) ; texte de la faute de Questions :
  « Une lettre d'écart. background est employé dans 40 variables. » ; les
  feuilles couvrent la barre latérale seule ; `fiche.css` répète des règles
  de `nomenclature.css` (fusion en O1) · réversible : oui.
- Q-56 · K5 · Deux entrées · `controlerLeCatalogue(catalogue)` (scopes C63,
  échelles, alias de mode C60) sert le mode Tokens sans composant ;
  `controlerLeTheme` et `controlerLaStructure` ne gardent que ce qui lit un
  composant. Une correction de scope porte `avant` = scopes lus joints par
  virgule, `apres.nom` = scopes attendus triés joints par virgule,
  `cible.variable` = clé de la variable · réversible : oui.
- Q-57 · B6 · Exécutant · Codex, dans son clone, sur des fichiers disjoints
  de B5 (Claude 2) ; il tire `partage/main` avant de commencer
  · réversible : oui.
- Q-58 · B5 · Ignorés dans le protocole · le message `analyse` porte tous
  les constats, ignorés compris ; chaque analyse lue envoie `ignores` (liste
  vide comprise) ; l'interface (U6) sépare les deux. « Ne plus proposer »
  range `proposition:<id du constat>` : le constat reste, sans sa correction
  · réversible : oui.
- Q-59 · B5 · Corrections nées d'une réponse · `cible` et `axes` relus dans le
  relevé retenu (par `faits.token`, sinon `faits.champ` et `faits.indice`) ;
  une réponse désigne un candidat par sa clé, sinon par son nom. Forme de
  `nom-de-valeur` : `cible.layer` = jeu de variants, `cible.champ` =
  propriété, `avant` = ancienne valeur, `apres.nom` = nouvelle ; les noms de
  valeurs s'écrivent en dernier dans le lot. Aucun contrôle du kit ne produit
  encore C12 · réversible : oui.
- Q-60 · B5 · Texte hors maquette · « N valeurs de variante renommées » dans
  la ligne de réussite · réversible : oui.
- Q-61 · U3 · Emplacement d'un groupe dans le tableau · la maquette écrit le
  parent seul (`theme`) ; U4 suit la maquette · réversible : oui.
- Q-62 · U3 · Virgule d'un chemin en phrase · la maquette range la virgule
  dans la puce (artefact de son motif) ; le plugin la garde dans la phrase ;
  écart déclaré · réversible : oui.
- Q-63 · U3 · Cadres `seul` · la galerie montrait toujours la fenêtre
  entière ; U4 lui apprend à rendre la barre latérale seule, pour comparer
  t-portees, x-button, x-button-corr, g-sans-cibles, g-autre, g-coller en
  position · réversible : oui.
- Q-64 · U4, U5 · Parallèle · U4 (mode Tokens) et U5 (mode Composant)
  tournent ensemble ; `t-hors` passe à U5, qui possède le domaine `commun` ;
  les fichiers d'aiguillage partagés ne reçoivent que des retouches courtes
  · réversible : oui.
- Q-65 · U3 · Textes hors maquette · « Rien à régler dans la fenêtre
  Variables de Figma. », « N corrections écrites, M sautées. », « Aucune
  correction de modes ou de scopes cochée. » ; cartes de structure repliées
  par défaut ; pas de confirmation avant Appliquer · réversible : oui.
- Q-66 · U3 · Constats sans producteur · l'écran lit quatre constats de
  structure que le kit ne rend pas encore (cible supprimée, library non
  activée, mode sans valeur, couleur sans alias) : lot K10 · réversible : oui.
- Q-67 · U4 · Carte « faute » de t-regle · U2 a ajouté le lien « Voir les 2
  variables » que la maquette de t-regle n'a pas (elle l'a dans t-questions) ;
  19 textes décalés de 8 px sont des écarts déclarés. Question au mainteneur :
  corriger la maquette · réversible : oui.
- Q-68 · U4 · Library · noms de modes inconnus avant import (Q-28) :
  `Valeur` pour un mode seul, `Mode N` sinon ; règles reçues lues par un
  message d'interface `regles-recues` jusqu'à B8 ; au plus 100 variables
  importées par groupe ouvert · réversible : oui.
- Q-69 · U5 · Vue Composant · la section Variants n'apparaît qu'après une
  analyse ; une puce compte les constats dont un variant porte la valeur, au
  type du plus grave ; Tableau sans maquette (deux menus et une grille) ;
  hors UCM = déclaration `absente` ou `libre` ; « calque » → « layer »,
  « Contour » → « Stroke » · réversible : oui.
- Q-70 · B6, K10 · Échange · Codex n'avait pas commencé B6 ; Claude 2 le
  prend dans l'arbre partagé, Codex prend K10 · réversible : oui.
- Q-71 · B6 · Journal de structure · une famille de clés à part
  (`journal-structure:<lot>:<rang>`), un seul lot de structure à la fois (le
  suivant remplace le précédent) ; lignes par identifiant Figma ; l'usage
  d'une variable créée se cherche dans tout le fichier
  (`loadAllPagesAsync`), un parcours qui échoue saute `usage-illisible`.
  L'annulation n'avait pas de message : B8 la branche à l'Historique ; les
  motifs `usage-ajoute`, `journal-impossible`, `occupe`, `usage-illisible`
  n'ont pas de texte avant U8 · réversible : oui.
- Q-72 · K10, B5 · C12 avec un seul style candidat · aucun registre ne relie
  deux styles libres ; la proposition reste une question et B5 ne crée
  `nom-de-valeur` qu'après la réponse du designer · réversible : oui.
- Q-73 · B8 · Couches et motifs · les couches du catalogue (`COUCHE_DES_*` de
  `src/preparations.ts`) se tirent du kit, la loi d'écriture refusant un nom
  de collection en dur ; l'annulation de structure rend `journal: 'absent' |
  'illisible'` et `refus: 'occupe' | 'hors-ucm'`, pas `journal-impossible`,
  qui reste un motif de l'écriture ; U8 écrit leurs phrases. `preparer` prend
  `ranger: true` pour ranger la préparation ; deux messages s'ajoutent à N1 :
  `plan-de-preparation` et `liaisons-preparees` (`lier-preparation`)
  · réversible : oui.
- Q-74 · U6, K11 · C24 · le C24 de la conception (propagation depuis un
  variant modèle, carte `c-modele`) n'avait pas de producteur : le code C24
  du kit sert à une correction de rôle tirée de C17. K11 ajoute la
  propagation sous le même code, avec `faits.modele` ; la correction de rôle
  garde son code. Question au mainteneur : donner un code propre à la
  correction de rôle · réversible : oui.
- Q-75 · U6 · Textes hors maquette : « Constats du composant », « Analyse
  partielle : N variants lus sur M. », « L’analyse a été annulée. »,
  « Cliquez Actualiser pour la relancer. », « Aucun constat n’a été
  rendu. », « Noms de valeurs », « Aucune correction à proposer. », « Aucune
  correction cochée. », « Renommer la valeur … en … », « Lier … à », « Ne
  plus proposer pour ce layer », « Écriture en cours. », « non lu » sur une
  puce de Variants. Le panneau demande la Configuration à chaque ouverture,
  pour savoir si la library est choisie. Dix tests d'interface étaient déjà
  rouges avant U6 (onglets de la Configuration, `resize`) : U6 (2/2) les
  répare · réversible : oui.
- Q-76 · U6 · Questions et À faire dans Figma · intertitres d'À faire par
  famille du constat (liaisons, tailles, tokens et règles sous « Tokens »,
  export sous « Visibilité ») ; « Plus tard » est local, la carte passe en fin
  de liste jusqu'à l'analyse suivante, comme dans Nomenclature ; les boutons
  « Autre token… », « Préparer une règle outline → outlined » et « Garder
  Outlined » de la maquette et sa question « Préparer les tokens du stroke »
  n'ont pas de demande : déclarés au comparateur, la réponse se limite aux
  candidats du moteur (Q-59) ; une proposition retirée (« Ne plus proposer »)
  laisse son constat dans À faire dans Figma ; la pastille de `c-afaire` dit
  23 en rouge contre 19 en orange dans la maquette, car le constat Bloquant
  du moteur compte ; phrases par code d'À faire dans Figma écrites hors
  maquette (C20, C31 à C33, C49, C50, C64, C66). Question au mainteneur :
  faut-il les trois boutons · réversible : oui.
- Q-77 · U7, K12 · Contraste · le kit ne rendait ni la paire de couleurs ni
  les rapports des autres modes, émettait C49 à C51 par variant, et
  `C50:sans-anneau` sans layer : K12 les ajoute ; `rapports` est un texte
  JSON, `Constat.faits` n'acceptant que des scalaires. U7 écrit hors
  maquette « N sous le seuil », la borne des combinaisons, C53 (« WCAG ne
  lui demande pas de contraste »), « Lié aujourd’hui au token du repos. » ;
  la note longue de la section s'affiche quand elle contient une limite ; le
  bouton du modèle est inactif sur une analyse périmée, la maquette le garde
  actif. « C’est voulu » de `x-button-corr` n'a pas de demande (comme Q-76).
  C16 reste une question par variant · réversible : oui.
- Q-78 · U8 · Push avant J-F · à la demande du mainteneur, Codex a poussé
  `origin/main` le 23 octobre (U8 1/2 compris), après avoir rejoué les
  commits sur `origin/main` : les hashes de U8 (1/2) et des deux correctifs
  d'Architect (`cc678b6d`, `4ab2ac80`) sont ceux du rejeu. Q-1 (un seul push
  à J-F) ne tient donc plus ; la publication npm reste à O2 · réversible : non.
- Q-79 · recette, K · C20 · relevé par le mainteneur dans Figma : un layer
  lié à `TileLink/Size/width` (collection `components`) recevait « vise la
  collection Components, que ce composant ne lie pas ». C20 appliquait à la
  variable liée la règle des cibles de `components` ; il juge maintenant la
  cible de ses alias. La carte nomme la cible et le geste ; le lieu ne
  répète plus le variant quand le layer est sa racine. Kit 0.12.12
  (`4d361777`). C20 et C61 sortent encore ensemble sur une couleur primitive,
  et C61 n'a pas de phrase dans À faire dans Figma · réversible : oui.
- Q-80 · U8 · Textes hors maquette : « Le fichier n’a pas gardé le journal :
  l’Historique ne peut pas défaire cette création. », « existe déjà, ne vise
  pas », « Garder », « Remplacer », « Collection components », « N variables
  restent à régler. », « N existent déjà. », « Les corrections d’un
  composant se défont par Ctrl+Z dans Figma. ». Deux textes de la maquette
  changent : `aideArchitecture` (cf-reglages) et `phraseHistorique`
  (« Annulez la dernière écriture de chaque sorte sur les variables. »).
  L'alerte compte les variables non créées (16), la feuille les `a-creer`
  et `echec` (15), comme la maquette · réversible : oui.
- Q-81 · U8 · Bouton « Préparer les tokens » · U8 (1/2) le montrait sur un
  C16 sans correction, factice dans la galerie, et réécrivait la carte en
  cherchant son texte dans le DOM ; neuf cadres Composant échouaient. Le
  sandbox ajoute `sansTokens` au message `analyse` (aucune variable
  `components/<jeu>/…` au catalogue), règle de la maquette (« Composant sans
  tokens ») · réversible : oui.
- Q-82 · U8 · Historique · aucun message ne relit le journal de structure :
  la section « Dernière création » ne vit que pendant la session, et les
  « Derniers scopes » de cf-historique sont des écarts déclarés. Après
  l'annulation d'une création, la préparation rangée reste `creee` et
  l'alerte ne revient pas. Question au mainteneur : un message qui relit le
  journal, et la remise des états à `a-creer` · réversible : oui.
- Q-84 · U8 · Feuille de préparation sur les données du plan (Codex y
  avait recopié les données de Tag de la maquette). Restent, à voir à la
  recette : une question répondue sort du plan, son bloc disparaît et le
  compte « N questions restent » se trompe ; une question `cible:` sans
  candidat ne peut pas se répondre (pas de saisie libre) ; un aperçu de choix
  reste vide tant qu'une autre question retient la variable ;
  `preparation.css` garde des décalages tenus par des valeurs de Tag ;
  Q-54 (`app.copier` sans appelant) et Q-55 (18 règles de `fiche.css`
  répétées à l'identique plus loin dans `nomenclature.css`) reportés
  · réversible : oui.
- Q-83 · U8 · Tests d'interface de la préparation et de la Configuration
  écrits, lancés seulement par `test:ui` (recette du mainteneur)
  · réversible : oui.
- Q-85 · recette, K, B, U · Constats d'Alert et de Button relevés par le
  mainteneur dans Figma le 24 octobre. Causes et choix :
  (1) une surcharge posée dans une instance (`.sizeWrapperButton`,
  `circle-info`) se rattachait au layer de l'instance, qui attendait un rôle
  `background` : 90 C17 sur Button. Le relevé garde le calque intérieur
  (`LiaisonLue.surcharge`), une liaison par calque ; C17 en tire le rôle, une
  icône admet `icon` ou `foreground`, la correction vise ce calque ; les
  contrôles qui associent une liaison aux peintures du layer ne lisent plus
  que `liaisonsPropres` ;
  (2) C15 et C17 restaient à côté de C22 et C24, sans phrase : la source cède
  la place à sa dérivée ;
  (3) une question sans candidat n'allait nulle part : elle reste dans À faire
  dans Figma ;
  (4) phrases et gestes écrits hors maquette pour C7 à C10, C15 à C19, C21,
  C22, C24, C25, C29, C43, C45, C59, C60, C63, C65, C66 et C67 ; C8, C9 et
  C10 groupés par segment (12 cartes C10 de Button deviennent 3) ;
  (5) `.Ring` n'était pas reconnu comme anneau (« State=Focus n'a pas
  d'anneau visible ») : un point ou un tiret bas en tête est admis ;
  (6) le catalogue d'une library ne suivait pas les alias jusqu'aux primitives
  (« couleur que le plugin ne sait pas lire » sur tout fill d'Alert) : les
  cibles hors catalogue se lisent par identifiant, sinon par clé ;
  (7) C61 doublait C20 sur une couleur primitive : il n'est plus émis.
  Kit 0.12.13, CLI 0.1.89, adaptateur 0.1.82. Reste au designer : « Size/* »
  d'Alert et les `Color/Warning/Contained/{Focus,Pressed}/*` de Button sont
  vraiment non liés (les layers visent `alert/sizes/*` et
  `button/colors/warning/…`, d'après le contrat exporté) ; aucun constat ne
  nomme encore une liaison à une variable absente du catalogue
  · réversible : oui.

### Revue des lots réalisés

Le [journal de revue](./REVUE-BUGS-IMPLEMENTATION.md) classe les neuf défauts,
leurs reproductions et leurs commits. La revue corrige les points suivants :

| Lots | Corrections |
|---|---|
| K10, B5 | C12/C13 ignorent une valeur déjà couverte ; un candidat de style sans règle sémantique reste une question. Une réponse explicite produit `nom-de-valeur` (`fa76117b`, `a3124ae6`). |
| K3, K8, B5 | C22/C24 et les réponses ciblent le champ, l'indice et la plage du constat (`22d4f13a`). |
| K8, B4 | La relecture de C24/C29 porte toutes les valeurs du variant, même sur un axe inconnu ; C25 ne vise qu'une peinture `SOLID` (`afc044dd`, `c7b1709a`). |
| K5, B2, B5 | L'analyse UCM exécute C59 et les contrôles de structure du composant ; C59 relit le nom de la variable et cible la bonne liaison (`41ea4116`, `c933ccff`). |
| K6 | Deux layers homonymes du même rôle reçoivent des questions de nom distinctes (`1c2cacde`). |
| K5, B6 | Le catalogue du test de structure renseigne son mode pour isoler le constat de scope (`47c9ee40`). L'annulation d'une variable créée conserve la variable et le journal si la lecture des segments d'un texte échoue (`14d17ce7`). |

Vérification sur le clone de revue : build du kit et d'Architect ; kit 924/924,
Architect 940/940 ; tests racine 466/467, seul `versionSuitLeContenu` reste
rouge jusqu'au lot V. La validation dans Figma reste au jalon J-F.

La nouvelle repasse de la [revue](./REVUE-BUGS-IMPLEMENTATION.md) confirme R01
sur B6. Sur l'arbre partagé, le kit passe 924/924 et les tests racine 467/467.
Architect passe 937/941 : quatre échecs et sept erreurs de build proviennent
des travaux locaux U6 et B8 encore ouverts. La validation de l'annulation
dans Figma reste à faire.

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

## 11. Lots de fiabilité

Source : les deux notes du dossier `UCM Architect/Debug`, écrites le 24
octobre, hors du dépôt commité : bugs 1 à 11 de
`BUGS-ANALYSE-COMPOSANTS-TOKENS.md` et lots 2 à 4 de
`OPTIMISATION-ANALYSE-90-VARIANTS.md`.
Demandés par le mainteneur après la recette d'Alert et de Button (Q-85).
Chaque lot reçoit un test qui échoue avant lui. L'orchestrateur relit chaque
diff, lance le lot V après les lots du kit, puis commite par chemins.

Agents : `implementeur-exigeant` quand le lot change une règle lue par
plusieurs contrôles, `implementeur` sinon ; deux au plus en même temps, sur
des fichiers disjoints.

| Vague | Lot | Agent | Fichiers |
|---|---|---|---|
| 1 | F1, F6 | exigeant, implementeur | kit `releve.ts`, `typographie.ts`, `preparation.ts`, `accessibilite.ts` ; Architect `releveDuComposant.ts`, `sandbox/analyse.ts`, `ui/analyse/` ‖ `ui/composant/analyse.ts`, `ui/composant/variants.ts` |
| 2 | F2, F4 | implementeur, implementeur | kit `accessibilite.ts`, `typographie.ts` ‖ Architect `constatsDuMoteur.ts`, `sandbox/analyse.ts` (sujet, page) |
| 3 | F3, F5 | implementeur, implementeur | kit `mapping.ts` ‖ Architect `code.ts` |
| 4 | F7 | implementeur | kit `corrections.ts` ; Architect `catalogue.ts`, `sandbox/analyse.ts` (catalogue), `releveDuComposant.ts` |

- [ ] **F1 · Une lecture manquée ne devient jamais un constat** (bugs 1, 3,
  4). Une liaison dont la variable ne se lit pas reste au relevé, marquée
  illisible : C66, C25, la préparation et le contraste la voient liée, et le
  contraste rend une limite. Un layer dont la boîte ne se lit pas ne donne
  pas de C52. Une lecture manquée rend l'analyse `partielle`, avec son titre
  propre, jamais « Tenu ».
- [ ] **F2 · Un layer sous un parent masqué est masqué** (bug 2). Une seule
  règle du kit, la visibilité dans le variant par la chaîne des parents, pour
  le texte minimal, l'anneau, le contraste et la typographie.
- [ ] **F3 · C21 compare les alias de tous les modes** (bug 5). La signature
  d'un token réunit les cibles de chaque mode, dans un ordre fixe.
- [ ] **F4 · Identités et page du sujet** (bugs 6, 7, 9). Un point du moteur
  a un identifiant tiré de son code et de son contenu, pas de son rang. Le
  moteur reçoit la page du maître. La sélection d'un composant imbriqué, ou
  de tout autre sujet que le jeu et ses variants, périme l'analyse.
- [ ] **F5 · Le maître d'une autre page se surveille** (bug 8). Le sandbox
  suit aussi la page du sujet analysé quand ce n'est pas la page courante.
- [ ] **F6 · Le panneau garde sa péremption ; le tableau compte par
  identifiant** (bugs 10, 11). Le message `analyse` d'une analyse déjà
  périmée la laisse périmée. La cellule du tableau croisé compte les
  constats qui nomment le variant par son identifiant ou par son nom.
- [ ] **F7 · Analyse plus rapide, sorties identiques** (optimisation, lots 2
  à 4). Index des layers, des variants et des variables pour
  `proposerLesCorrections` ; un seul inventaire des libraries par analyse ;
  lecture des variables liées par lots bornés, une promesse par identifiant.
  Critère : constats, corrections et questions égaux en profondeur sur les
  fixtures, avant et après.

Hors de ces lots : le lot 1 (trace) et le lot 5 (relevé partagé avec le
moteur) de l'optimisation attendent une mesure dans Figma ; le cas « plusieurs
collections reconnues comme `theme` » est une question au mainteneur (Q-86).
