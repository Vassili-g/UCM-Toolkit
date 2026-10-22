Formule à respecter pour tous les agents:
"Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better."


# Plan d'implémentation de UCM Architect

Lecteur : l'orchestrateur, la conversation principale de Claude Code. Aucun
agent ne lit ce plan. Un agent reçoit la fiche de son lot (§4.5), copiée telle
quelle dans son prompt.

Sources, de la plus forte à la plus faible :

1. La [maquette](../2%20Maquettes/MAQUETTE-ARCHITECT.html), version
   `6cf27974` : écrans, textes et comportements. En cas d'écart, elle l'emporte.
2. Les décisions du §2.
3. Le [document préparatoire](../1%20Conception/PREPARATION-ARCHITECT.md), la
   [grammaire des composants](../1%20Conception/GRAMMAIRE-DES-COMPOSANTS.md) et
   l'[aperçu de la génération](../1%20Conception/APERCU-GENERATION-TOKENS-COMPOSANT.md), pour une
   règle que la maquette ne montre pas. Les numéros C, T et G y renvoient.

## 1. Fin du plan

- UCM Architect remplace l'explorateur et Nomenclature, dans
  `packages/plugin-architect`.
- Chaque cadre de la maquette, hors section 3 et hors cadres d'étude `v-*`,
  existe en état de galerie de même identifiant. Le contrôle de fidélité (§4.10)
  ne relève aucun écart.
- `npm test`, `npm run typecheck` et `npm run build` passent.
- Le §9 rend au mainteneur les questions et les choix faits sans lui.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Plugin | UCM Architect remplace l'explorateur et Nomenclature. Il garde l'identifiant de manifeste de l'explorateur. Paquet `ucm-architect-plugin`, dossier `packages/plugin-architect` |
| Nom | « UCM Architect » partout : manifeste, barre du plugin, textes, galeries, guides, cartes, CI, scripts. « UCM Token Explorer », « UCM Nomenclature » et le nom de travail « UCM Token Architect » disparaissent du code et des documents vivants. Seuls les gardent les Archives, les notes de recherche passées, les journaux de version et les messages de commit. La clé de stockage `ESPACE_ARCHITECT` reste |
| Périmètre | Contrôles et corrections pour un fichier déclaré UCM. Ailleurs : navigation seule, et l'alerte de `t-hors`. Le sandbox relit la déclaration avant chaque contrôle et chaque écriture |
| Écriture | Seulement par `src/ecriture/` |
| Exactitude | Une correction n'est proposée que si une règle écrite la tire d'un fait lu, avec un seul candidat. Le reste devient une question, sans réponse cochée |
| Annulation | Une écriture sur des variables passe par le journal et l'Historique. Une écriture sur un composant se défait par Ctrl+Z, un point d'annulation par lot |
| Moteur de l'exporteur | Dans le socle, `plugin-socle/src/composant/`, lu par l'exporteur et par Architect. Les contrôles nouveaux, purs, vont dans le kit |
| Lecteurs du composant | Le moteur rend les points de l'export. La lecture de l'explorateur, étendue à tous les variants, rend le relevé que le kit juge |
| Concurrence | Une opération à la fois. Après une écriture ou un Ctrl+Z, le panneau se dit périmé jusqu'à Actualiser |
| Sélection | Changée au clic sur un constat, jamais ailleurs, par `src/ecriture/selection.ts` |
| Onglets | Tokens : Corrections, Questions, À faire dans Figma, Règles. Composant : les trois premiers. Chaque constat est dans un seul onglet. Structure, Intégrations, Relevés et Comparer disparaissent. Dépendants devient « Utilisée par » dans la fiche d'une variable. `integrations/profilUcm.ts` et `lireLaRecette` restent |
| Inspecteur | Remplacé par la fiche d'une variable, une feuille sur la barre latérale (`t-fiche`) |
| Fenêtres | Tokens 1360 × 800, barre latérale 640 px. Composant 520 × 760 panneau fermé, par défaut ; 1040 × 760 ouvert. Frontière tirable |
| Bouton du panneau | « Constats », icône du panneau, pastille du nombre dans la couleur du plus grave (`c-bouton-texte`) |
| Section Variants | Forme C par défaut, pour tout composant. Le lien Tableau croise deux properties |
| Alertes | Cinq types : Bloquant, À corriger, À vérifier, Information, Tenu. Couleur, icône et mot, liseré gauche. Même code pour les alertes, les cartes de constat, les puces de Variants et la pastille |
| Langage visuel | Vocabulaire des signaux dans le kit, styles et composants dans le socle. Valeurs : `2 Maquettes/architect.css`. Palettes et l'exporteur migrent hors de ce plan |
| Mots | Termes de Figma et d'UCM en anglais, tels que Figma et le modèle les nomment (CONTRIBUTING.md, Messages destinés au designer). Variant écrit `Severity=info, Variant=standard`. Aucun « · » dans les textes d'Architect. « Tableau des tokens ». Textes en français seulement |
| Recherche | Du texte dans le champ de l'arbre. Préfixes `terme:` et `vise:` pour les filtres qu'un mot ne dit pas |
| Thème | Sombre, quel que soit le thème de Figma. Fonds de la maquette |
| Préparation des tokens | Liste transmise par `figma.clientStorage` ; couleurs puis tailles ; intensité exacte s'il n'y en a qu'une, sinon une question ; axes et éléments par question. Le mot « plan » n'apparaît pas à l'écran |
| Règles reçues | Des questions, en tête de l'onglet Questions (`t-regle`) |
| Lien vers le fichier des tokens | Seulement si `figma.fileKey` a déjà été lu dans ce fichier. Le manifeste ne change pas ; voir §9 |
| Grammaire | `components/composant/famille/[élément]/[palette/style/taille/état]/rôle ou propriété` ; tailles d'icône dans `layout/icon` |
| Gestes du mainteneur | Il lance `test:ui`, les sondes et les recettes Figma, et migre les fichiers Figma réels. Aucun agent ne le fait à sa place |

Principes : le plus simple qui tient les critères ; déplacer par `git mv` avant
de réécrire ; une analyse partielle ou en échec ne dit jamais « aucun constat » ;
aucun geste manuel du designer inventé.

## 3. Lois qui changent

| Loi | Après | Lot |
|---|---|---|
| Document intact de l'exporteur (`plugin-exporter/tests/loiDuDocumentIntact.test.ts`) | Balaie aussi `plugin-socle/src/composant/` ; `template/ecriture.ts` reste la seule écriture ; importeurs permis : exporteur, puis Architect | S0, B7 |
| Lecture seule de l'explorateur (`tests/loiDeLectureSeule.test.ts`) | Remplacée par la loi d'écriture d'Architect | A0.2 |
| Écriture de Nomenclature (`plugin-nomenclature/tests/loiDEcriture.test.ts`) | Suit ses fichiers dans Architect, mêmes attendus | A0.2 |
| Écriture d'Architect | Hors de `src/ecriture/` : aucune écriture, aucun changement de sélection ou de vue, aucun import de `template/ecriture` | A0.2 |
| Import de variables | Seule `src/lecture.ts` importe des cibles d'alias ; B3 l'étend aux valeurs d'une library | B3 |
| Paquets séparés (`tests/pluginsSepares.test.ts`) | Trois plugins | A0.1, A0.2 |
| Vocabulaire de Figma | Nouvelle loi : les catalogues de textes d'Architect refusent les traductions listées (portée, calque, fond de cadre…) et le glyphe « · » | A1 |

## 4. Méthode

### 4.1 Pistes

Une piste = un paquet ou un dossier. Deux lots de pistes différentes n'écrivent
jamais le même fichier.

| Piste | Écrit seulement | Exécutant par défaut |
|---|---|---|
| K · kit | `packages/kit/**` | Codex, dans son clone ; sinon `implementeur` |
| S · socle | `packages/plugin-socle/**` ; `plugin-exporter` en S0 | `implementeur-exigeant` |
| B · sandbox d'Architect | `plugin-architect/src/**` hors `src/ui/`, ses tests hors `tests/interface/` | `implementeur` (Claude 2) |
| U · interface d'Architect | `plugin-architect/src/ui/**`, `galerie/**`, `tests/interface/**` | `implementeur-exigeant` (Claude 1) |
| O · orchestrateur | ce plan, `.agents/`, `CARTE.md`, `AGENTS.md`, invariants, docs, CI, `package-lock.json` | conversation principale |

### 4.2 Fichiers carrefours

| Carrefour | Parade |
|---|---|
| Version du kit (`packages/kit/package.json`), exigée dans le même commit par `tests/versionSuitLeContenu.test.mjs` | Tous les lots du kit dans la seule piste K, en série. Publication npm groupée aux jalons (O2) |
| Clés `ESPACE_ARCHITECT` (`kit/src/referentiel/produits.ts`), sous-chemins exportés du kit | K0 les déclare toutes d'un coup |
| Type du relevé du composant, contrat entre K et B | K0 le pose d'après la note N2 ; seule la piste K le change ensuite |
| `code.ts`, `messages.ts` d'Architect | A1 les découpe : `src/messages/<domaine>.ts`, `src/sandbox/<domaine>.ts`, une table d'aiguillage déjà remplie de tous les domaines de §7 N1, chacun en souche |
| `src/ui/textes.ts`, `src/ui/styles.css`, `galerie/etats.cjs`, `tests/interface/interface.test.mjs` | A1 les découpe de même : `src/ui/textes/<domaine>.ts`, `src/ui/styles/<domaine>.css`, `galerie/etats/<domaine>.cjs`, `tests/interface/<domaine>.test.mjs`, index déjà remplis |
| Socle lu en source par Architect | S0 et S1 passent avant les lots U ; un lot S ultérieur est « seul » |
| `.agents/domiciles.json`, cartes, guides, invariants, docs, CI | Piste O seule, aux synchronisations. Un lot qui crée un fichier sans domicile le dit dans son compte rendu ; il ne touche pas au registre |
| Ce plan | Écrit par l'orchestrateur seul. Codex ne le modifie pas |

Un lot qui découvre qu'il doit écrire hors de sa liste s'arrête et le dit.
L'orchestrateur découpe, ou sérialise.

### 4.3 Parallélisme

- Au plus deux agents Claude, Claude 1 sur U et Claude 2 sur B ou S, plus Codex
  sur K. Un lot marqué « seul » tourne sans autre agent Claude. Codex continue,
  dans son clone.
- **Codex travaille dans un clone à part**, chemin court (`A:\UCM-codex`, à
  cause des chemins longs de Windows), sur `main`, sans pousser. Le clone a
  pour remote `partage` le dépôt de l'arbre partagé, par son chemin local :
  rien n'est poussé sur GitHub avant J-F. Avant chaque lot, Codex lance
  `git pull --rebase partage main`. Il ne touche pas l'arbre partagé.
- L'orchestrateur ajoute le clone comme remote `codex`. À chaque
  synchronisation, il lance `git fetch codex`, puis
  `git merge --no-edit codex/main`. Les fichiers sont disjoints : le merge
  passe sans conflit, sans stash ni rebase de l'arbre partagé.
- Synchronisation : avant un lot B ou U qui consomme un lot K, et à chaque
  jalon.
- L'orchestrateur pousse une seule fois, à J-F, après la recette du mainteneur
  (Q-1). Jusque-là, la CI ne tourne pas : les jalons la remplacent.

### 4.4 Niveau d'agent

| Sorte de travail | Qui |
|---|---|
| Note de conception, contrat de messages, texte absent de la maquette, revue de diff | orchestrateur (Opus) |
| Règle pure et ses tests dans le kit | Codex, ou `implementeur` |
| Sandbox, lecture, écriture | `implementeur` ; `implementeur-exigeant` si le lot touche une loi ou le journal |
| Écran à reproduire au pixel | `implementeur-exigeant` |
| Déplacement, renommage de chemins, cases du plan | `executant` (Haiku) |
| Vérification longue, contrôle de fidélité | `verificateur` (Haiku) |

### 4.5 Fiche de lot

Chaque lot du §6 est écrit sous cette forme. Le prompt d'un agent contient sa
fiche, la sortie de `npm run agents:lire -- <chemins de « Écrit »>` et la note
du §7 que la fiche cite. Rien d'autre.

```text
<id> · <titre>        Piste · Agent · Dépend de · Seul ?
Écrit : chemins que le lot crée ou modifie, et seulement eux.
Lit : fichiers et sections précis.
Maquette : identifiants de cadres ; symboles du script à chercher.
Fait quand : critères vérifiables.
Vérifie : commande du lot.
```

### 4.6 Lectures

- Un agent lit sa fiche, la sortie de `agents:lire` et les fichiers de « Lit ».
  Il ne lit ni ce plan, ni `AGENTS.md` racine, ni le document préparatoire, ni
  la maquette en entier. Codex lit `AGENTS.md` d'office : c'est un coût fixe,
  et la fiche n'y ajoute rien.
- La maquette se lit par recherche : `grep -n "<id>\|<SYMBOLE>"` dans
  `2 Maquettes/MAQUETTE-ARCHITECT.html`, puis les seules lignes trouvées.
  Une classe de style se cherche de même dans `2 Maquettes/architect.css`.
- Un lot d'écran capture ses cadres une fois, en début de lot, par
  `node "docs/notes/Recherches/UCM Architect/2 Maquettes/Mesures/capturer-cadres.mjs" <dossier> <id>…`,
  et lit les images. Pas d'autre capture pendant le lot.
- L'orchestrateur lit ce plan, les notes et les diffs. Il ne relit pas le code
  d'un lot dont la vérification est consignée (§4.8).

### 4.7 Vérifier

| Niveau | Quand | Commande | Qui |
|---|---|---|---|
| Lot | chaque lot | `npm run test:paquet -- <paquet>` du paquet écrit, ou les seuls fichiers de test du lot par `npx tsx --test <fichier>` ; `tsc` du paquet si un type exporté change | l'agent |
| Lot du kit | chaque lot K | tests du kit, puis tests racine `node scripts/run-tests.cjs` (version du kit) | Codex ou l'agent |
| Jalon | fin de vague | `npm test`, `npm run typecheck`, `npm run build`, contrôle de fidélité des cadres de la vague | un `verificateur`, une fois, arbre stable |
| Recette | J-F, et tout jalon que le mainteneur choisit | `npm run test:ui -w ucm-architect-plugin`, Figma | le mainteneur |

Jamais `npm test` dans un lot, jamais `test:ui` par un agent. Un lot d'écran
met à jour son état de galerie et son test d'interface sans les lancer.

### 4.8 État, commit, relais

- États, écrits par l'orchestrateur seul : `[ ]` libre, `[~ Claude 1]`,
  `[~ Claude 2]` ou `[~ Codex]` pris, `[x] (hash)` fait.
- Un lot = un commit vert, par chemins explicites. Message :
  `<id> · <titre>`, puis la ligne `Vérifié : <commandes lancées>`.
- Un lot tient en moins de 400 lignes de diff et de 10 fichiers. Au-delà, il se
  découpe avant de partir, ou se commite par étapes vertes `<id> (1/3)`.
- **Relais de Codex.** Codex ne laisse rien hors commit. Avant sa limite, il
  commite l'étape verte en cours, ou l'abandonne par `git restore` dans son
  clone. Le corps du commit d'une étape dit ce qui reste : `Reste : …`.
- **Reprise.** L'orchestrateur lit `git log codex/main` à chaque
  synchronisation et coche les lots faits. Un lot `[~ Codex]` sans commit, Codex
  arrêté, repart de zéro depuis sa fiche, avec un agent Claude. Un lot partiel
  repart de la ligne `Reste :`.
- **Confiance.** Un commit qui porte `Vérifié :` n'est pas revérifié avant le
  jalon. L'orchestrateur relit seulement les fichiers publics du lot : types et
  fonctions exportés, index. Le jalon couvre le reste.

### 4.9 Autonomie

- L'orchestrateur ne s'arrête pas pour demander. Devant un choix, il prend le
  plus simple, réversible, conforme à la maquette, et l'inscrit au §9.
- Il s'arrête seulement devant : une contradiction entre la maquette et une
  décision du §2 ; une publication qui casserait un consommateur ; un test
  racine rouge dont la cause est hors des pistes du plan.
- Textes : tous viennent de la maquette. Un texte absent, l'orchestrateur
  l'écrit (skill `rediger-diagnostics-ucm`), le donne au lot et l'inscrit au §9.
  Aucun `TODO(texte)`.
- Sondes : S-1 et S-2 (§7) partent au mainteneur au lancement, en un seul
  passage. Les lots qui en dépendent avancent sur l'hypothèse de leur fiche.
  Un écart devient une question du §9 et un lot de reprise.

### 4.10 Fidélité aux maquettes

- Un cadre = un état de galerie du même identifiant, avec les données de la
  maquette : fichier Intencial, Alert, Button, Tag.
- Les textes sont recopiés du script de la maquette, sans retouche.
- Les valeurs de style viennent de `2 Maquettes/architect.css` et des feuilles de
  galerie. Aucune valeur inventée.
- Les pastilles roses et les légendes de la maquette sont des annotations : elles
  ne s'implémentent pas.
- Contrôle : `plugin-explorateur/galerie/comparer-maquette.cjs`, étendu en U0
  aux paires d'identifiants de la maquette d'Architect. Tolérance 1 px sur une
  position ou une taille, aucune sur une police, une couleur ou un texte. Un
  `verificateur` le lance aux jalons ; chaque écart devient un lot de reprise.

## 5. Vagues

| Vague | Claude 1 | Claude 2 | Codex | Jalon |
|---|---|---|---|---|
| 0 | — | — | — | Notes N1, N2, T, G, E, P du §7 par l'orchestrateur ; sondes S-1 et S-2 au mainteneur |
| 1 | S0 seul, puis A0.1 seul, puis A0.2 seul | — | K0, K1, K2 | J0 : fusion verte |
| 2 | A1 seul, puis U0 | S1, puis S2 | K3, K8 | — |
| 3 | U1, U2, U3, U4 | B3, B6 | K5 | J1 : mode Tokens |
| 4 | U5, U6 | B1, B2 | K4, K7 | J2 : mode Composant, lecture |
| 5 | U7 | B4, B5, B7 | K6 | J3 : corrections et écriture |
| 6 | U8 | B8, B9 | — | J-F : fidélité complète, documents, §9, recette |

Une case libre se remplit du lot suivant de la piste dont les dépendances sont
faites. Codex, une fois K fini, prend des lots B dans son clone ; ses fichiers
restent disjoints de ceux de Claude 2.

## 6. Lots

### Piste K · kit

Chaque lot monte la version du kit et fait passer les tests racine. Les noms de
fichiers sont indicatifs ; la note du lot les fixe.

- [ ] **K0 · Clés, sous-chemin et relevé.** Codex · vague 1.
  Écrit : `kit/src/referentiel/produits.ts`, `kit/src/controles/` (index,
  `releve.ts`, `constat.ts`), `kit/package.json`.
  Lit : §7 N2 ; `produits.ts`.
  Fait quand : `ESPACE_ARCHITECT` déclare les clés d'Ignorer, de la library
  choisie, du niveau de contraste, de la clé du fichier des tokens et de la
  préparation reçue ; `@ucm-kit/core/controles` exporte `ReleveDeComposant` et
  `Constat` (code, type d'alerte, layer, variant, faits lus) ; test de forme.
- [ ] **K1 · Grammaire des composants.** Codex · vague 1 · note G.
  Écrit : `kit/src/referentiel/grammaire.ts` et ses tests.
  Fait quand : les chemins de la section 2 de la grammaire sont reconnus avec
  leurs positions, ceux de la section 4 refusés ; `layout/icon/xl` reconnu,
  `layout/sizing/xl` refusé ; un chemin à deux lectures rend `ambigu` sans les
  axes, une seule lecture avec ; tests de Nomenclature sans changement
  d'attendu.
- [ ] **K2 · Signaux du langage.** Codex · vague 1.
  Écrit : `kit/src/referentiel/signaux.ts` ; la définition de `scale/{cran}` dans
  `kit/src/referentiel/theme.ts`, qui dit « portée » au lieu de « scope ».
  Lit : maquette, section 1 « Les signaux ».
  Fait quand : chaque signal a un identifiant, un sens et un libellé ; les cinq
  types d'alerte sont ordonnés ; les gravités de Palettes et de l'exporteur ont
  chacune leur type ; un test refuse un signal sans libellé.
- [ ] **K3 · Contrôles du composant.** Codex · vague 2 · K0, note T.
  Écrit : `kit/src/controles/{nommage,mapping,couche,oublis}.ts`.
  Fait quand : nommage C7 à C11, mapping C15 à C19 et C21, couche C20 et C61,
  oublis C31 à C33 ; un test positif et un négatif par contrôle ; un relevé
  écrit à la main de Button et d'Alert rend les constats de la table T ; aucun
  constat pour `alert/size/gap` sans axe de taille, un token partagé entre
  deux états, un rôle absent.
- [ ] **K8 · Corrections exactes et questions.** Codex · vague 2 · K3.
  Écrit : `kit/src/controles/corrections.ts`.
  Maquette : `c-corrections`, `c-modele`, `c-questions`, `x-button-corr`.
  Fait quand : token frère (C22), copie des liaisons d'un variant (C24),
  liaison par la grammaire (C25), couleurs et tailles (C29) ; une correction
  seulement si chaque nom calculé existe, avec un seul candidat et un seul
  layer destinataire ; sinon une question (C70, C76), sans réponse cochée ; un
  `State=hover` lié au token du repos rend une question avec l'indice des
  autres variants `State=hover`.
- [ ] **K5 · Full UCM, structure, scopes, modes.** Codex · vague 3 · K3.
  Écrit : `kit/src/controles/{theme,structure}.ts`.
  Maquette : `t-structure`, `t-portees`.
  Fait quand : C59, C60, C63 ; cas (a), (b), (c) et (f) de la recherche sur la
  structure, sans le cas des alias en boucle ; scope attendu par dossier
  (`surface` → Frame fill et Shape fill) ; cran attendu par mode, tiré de
  `TABLE_DES_DOSSIERS` ; un test positif et un négatif par règle.
- [ ] **K4 · Contraste et accessibilité.** Codex · vague 4 · K0.
  Écrit : `kit/src/controles/accessibilite.ts`.
  Maquette : `x-alert`, `x-button`.
  Fait quand : contraste des textes, icônes, strokes et anneaux sur fond uni,
  par variant et combinaison de modes (C49, C50) ; `State=disabled` exclu
  (C53) ; AA ou AAA ; grand corps à 3:1 ; borne de combinaisons dite ; cible
  sous 24 px et recommandation sous 44 px (C52) ; focus sans anneau (C36) ;
  anneau (C51) ; texte sous 12 px ; un dégradé rend une limite.
- [ ] **K7 · Typographie et icônes.** Codex · vague 4 · K0.
  Écrit : `kit/src/controles/typographie.ts`.
  Fait quand : C64 à C67, un test positif et un négatif par contrôle.
- [ ] **K6 · Préparation des tokens.** Codex · vague 5 · K1, note P.
  Écrit : `kit/src/controles/preparation.ts`.
  Maquette : `g-preparer`, `g-creer`.
  Fait quand : du relevé et des réponses, la liste des variables, de leurs
  cibles et des tokens du thème visés, avec leurs crans ; chaque entrée exacte
  ou une question ; Alert rend les variables de l'aperçu ; un layer `Frame 12`
  rend une question ; une taille se lie seulement si un seul token de `layout`
  a la valeur.

### Piste S · socle

- [ ] **S0 · Le moteur de l'exporteur dans le socle.** `implementeur-exigeant`
  · vague 1 · seul.
  Écrit : `plugin-exporter/src/{contract,template,variables.ts}` →
  `plugin-socle/src/composant/` par `git mv` ; le type `Annonce` sort de
  `messages.ts` d'abord ; chemins des tests, de `tests/lois.ts`, des invariants
  et de `SPEC.md` ; loi du document intact.
  Fait quand : `test:paquet -- exporter` et `-- socle` passent sans changement
  d'attendu ; `npm test` passe ; `build:plugin -- exporter` et `-- palettes`
  passent, bundles de même taille à 1 % près. L'orchestrateur range ensuite les
  routes de `domiciles.json`.
- [ ] **S1 · Langage visuel du socle.** `implementeur-exigeant` · vague 2 ·
  A0.2, K2.
  Écrit : `plugin-socle/src/ui/langage.css`, composants du socle, galerie du
  socle, loi des styles.
  Maquette : `s-planche` ; `2 Maquettes/architect.css`.
  Fait quand : chemin (groupe, variable, mis en avant, ajout, retrait, dans une
  phrase, lien), jeton, pastille, alerte des cinq types, gravité, ligne de
  réussite, deux colonnes, carte ciblée, puce de filtre, recherche active,
  pastille de compte, poignée ; les classes de Nomenclature reprises par
  `git mv` ; la planche reproduit `s-planche` ; la loi refuse, à l'essai, une
  classe du langage redéfinie dans un plugin.
- [ ] **S2 · Noms d'une library.** `implementeur` · vague 2 · K0.
  Écrit : `plugin-socle/src/bibliotheque.ts` et son test.
  Fait quand : nom, clé et type de chaque variable par library et collection
  (`figma.teamLibrary`) ; la library la plus liée est choisie ; à égalité ou
  sans liaison, aucune n'est choisie ; une library illisible est dite
  illisible.

### Piste A · fusion et squelette

- [ ] **A0.1 · Renommage.** `implementeur` · vague 1 · seul · S0.
  Écrit : dossier, paquet, manifeste (« UCM Architect », identifiant
  gardé, permission `teamlibrary`), `scripts/construire-plugin.mjs`, scripts et
  `package-lock.json` racine, `ci.yml`, `tests/pluginsSepares.test.ts`, tests
  racine qui importent l'explorateur, commandes de `CONTRIBUTING.md`, liens de
  `docs/` hors Archives.
  Fait quand : `npm test`, `npm run typecheck`, `build:plugin -- architect`
  passent ; `agents:diff` ne liste aucun chemin mort ; `git grep -n "UCM Token Explorer"`
  ne rend que des Archives, des notes de recherche passées, des journaux de
  version ; la barre de la galerie dit « UCM Architect ».
- [ ] **A0.2 · Nomenclature entre dans Architect.** `implementeur-exigeant` ·
  vague 1 · seul · A0.1.
  L'orchestrateur note ici le commit de repli avant de lancer : `……`.
  Écrit : `git mv` de Nomenclature : sandbox → `src/nomenclature/`,
  `ecriture.ts` → `src/ecriture/noms.ts`, interface → `src/ui/nomenclature/`,
  galerie et tests à côté ; invariants → `plugin-architect/invariants/` ;
  suppression de `packages/plugin-nomenclature` et de ses entrées ; tests
  racine `nomsDePalettes`, `loisEntreProduits`, `fabriquesDeFichiers`,
  `releveDeTest` sur les nouveaux chemins ; lois du §3.
  Fait quand : tests du sandbox et loi d'écriture de Nomenclature sans
  changement d'attendu ; la loi d'Architect refuse, à l'essai, une écriture et
  un import de `template/ecriture` hors de `src/ecriture/` ; `npm test` passe ;
  `git grep -n "UCM Nomenclature"` ne rend que des Archives, des notes de
  recherche passées, des journaux de version, et ne rend aucun texte d'écran.
- [ ] **A1 · Squelette des domaines.** `implementeur-exigeant` · vague 2 · seul
  · A0.2, note N1.
  Écrit : `src/code.ts` (table d'aiguillage), `src/messages/<domaine>.ts`
  (types complets de N1), `src/sandbox/<domaine>.ts` (souches qui répondent
  « non construit »), `src/ui/textes/<domaine>.ts`,
  `src/ui/styles/<domaine>.css`, `galerie/etats/<domaine>.cjs`,
  `tests/interface/<domaine>.test.mjs`, index ; tailles de fenêtre par mode ;
  retrait des vues Intégrations, Relevés, Comparer et Diagnostics, de leurs
  préférences et de leurs états ; loi du vocabulaire de Figma (§3).
  Fait quand : chaque domaine de N1 a ses fichiers ; ajouter un domaine ne
  touche qu'un index ; les tests de `profilUcm` et de `lireLaRecette` passent ;
  `build:plugin -- architect` passe ; la loi du vocabulaire refuse, à l'essai,
  « portée » dans un catalogue.

### Piste U · interface d'Architect

Agent : `implementeur-exigeant`. Chaque lot écrit seulement dans les fichiers de
son domaine, crée les états de galerie de ses cadres et leurs tests
d'interface, sans les lancer. Les données viennent de souches du sandbox ou des
fixtures de galerie quand le lot B n'est pas encore fait.

- [ ] **U0 · Contrôle de fidélité.** `implementeur` · vague 2 · A1.
  Écrit : `plugin-architect/galerie/comparer-maquette.cjs`.
  Fait quand : il prend une liste d'identifiants, ouvre l'état de galerie et le
  cadre de même nom, et imprime chaque écart selon §4.10.
- [ ] **U1 · Mode Tokens, Corrections.** Vague 3 · S1, A1.
  Maquette : `t-renommages` ; `fenetreTokens`, `MODES_AFFICHES`,
  `ARBRE_INTERFACE`, `LIGNES_INTERFACE`, `ciblerCarte`, `nomenclatureLaterale`.
  Fait quand : barre, arbre avec « replier les autres », modes affichés sur une
  ligne, tableau des tokens avec les renommages cochés (terme nouveau vert,
  cliquable), carte ciblée ouverte, filtre de l'arbre en puce, onglets, pied ;
  Appliquer n'écrit que les noms affichés ; les textes repris de l'explorateur
  disent « scope », jamais « portée » ; fidélité sans écart.
- [ ] **U2 · Recherche, fiche d'une variable.** Vague 3 · U1.
  Maquette : `t-questions`, `t-terme`, `t-fiche` ; `LIGNES_BACKGROND`,
  `LIGNES_BACKGROUND`, `FICHE_VARIABLE`, `ETAPE`.
  Fait quand : recherche en texte, préfixes `terme:` et `vise:` ; « Voir les N
  variables », « Filtrer le tableau des tokens », « Afficher ces N variables
  dans le tableau des tokens » écrivent dans le champ ; fiche : chaîne d'alias,
  « Renommage à appliquer », « Utilisée par » ; ligne choisie d'un fond
  uniforme ; fidélité sans écart.
- [ ] **U3 · À faire dans Figma et corrections de scopes.** Vague 3 · U1.
  Maquette : `t-structure`, `t-portees` ; `AFAIRE_TOKENS`, `LIGNE_SCOPE`,
  `SCOPE_AVANT`, `SCOPE_APRES`.
  Fait quand : constats avec leur type d'alerte, chemins dans une phrase ;
  cartes de modes et de scopes en Aujourd'hui et Après l'application ;
  fidélité sans écart.
- [ ] **U4 · Library, règles reçues, hors UCM.** Vague 3 · U1.
  Maquette : `t-bibliotheque`, `t-regle`, `t-hors` ; `REGLE_RECUE`.
  Fait quand : valeurs en attente en trait gris, onglets grisés, alerte avec
  « Ouvrir Intencial Tokens » seulement si la clé est connue ; règles reçues
  en questions sous leur intertitre ; alerte hors UCM ; fidélité sans écart.
- [ ] **U5 · Vue Composant et section Variants.** Vague 4 · S1, A1.
  Maquette : `c-avant`, `c-replie`, `c-bouton-texte`, `c-gros`, colonne gauche
  de `c-corrections` ; `variants`, `COMPOSANTS`, `fenetreComposant`, `barre`,
  `corrigerDansLaVue`.
  Fait quand : panneau fermé à l'ouverture ; bouton Constats et pastille ;
  frontière tirable ; aperçu en haut ; Variants forme C, « +N », Tableau ;
  liaisons changées en vert, cliquables ; fidélité sans écart.
- [ ] **U6 · Panneau des constats.** Vague 4 · U5.
  Maquette : `c-corrections`, `c-clic`, `c-modele`, `c-questions`,
  `c-tranchee`, `c-afaire`, `c-apres`, `c-ctrlz`, `e-*` ; `CORR_ALERT`,
  `AFAIRE_ALERT`, `Q_TITLE`, `Q_OUTLINE`, `Q_CONTOUR`, `CLIC`, `PERIME`.
  Fait quand : trois onglets, cartes du tour 3, alertes, ignorés, ligne de
  réussite, panneau périmé, états de l'analyse ; la sélection Figma dans
  l'aperçu ; fidélité sans écart.
- [ ] **U7 · Contraste et accessibilité.** Vague 5 · U6.
  Maquette : `x-alert`, `x-button`, `x-button-corr` ; `paire`.
- [ ] **U8 · Préparation et Configuration.** Vague 6 · U6.
  Maquette : `g-*`, `cf-reglages`, `cf-historique` ; `PREPARER`, `CREER`,
  `optionP`, `cibleP`, `SECTIONS_NOUVELLES`.
  Fait quand : chaque choix porte son terme UCM puis sa description ; Préparer
  inactif tant qu'une question reste ; fidélité sans écart.

### Piste B · sandbox d'Architect

Agent : `implementeur`, sauf mention. Chaque lot remplace la souche de son
domaine et garde les types de §7 N1.

- [ ] **B3 · Library en mode Tokens.** Vague 3 · S2 · hypothèse S-1.
  Fait quand : arbre depuis les noms ; valeurs d'un groupe importées à son
  ouverture, par lots de huit ; loi d'import étendue ; `figma.fileKey` lu et
  rangé sous sa clé quand il existe ; test sur doubles.
- [ ] **B6 · Journal étendu, scopes et modes.** `implementeur-exigeant` · vague
  3 · K5.
  Fait quand : le journal range et l'Historique annule les scopes et la
  création de variables, avec la relecture des renommages ; corrections de
  scopes et de modes écrites par le journal ; tests de l'Historique sans
  changement d'attendu ; un objet changé depuis est sauté.
- [ ] **B1 · Relevé du composant.** Vague 4 · K0.
  Écrit : `src/lectureDuComposant.ts`.
  Fait quand : tous les variants, propriétés de composant (C3), porteur réel
  d'une liaison, champ, indice de peinture ou plage de texte, variables
  atteintes ; la borne arrête le parcours et compte les layers non lus ; rend
  `ReleveDeComposant` ; test sur un jeu factice de six variants.
- [ ] **B2 · Analyse.** Vague 4 · B1, K3, S0.
  Fait quand : Analyser puis Actualiser lancent moteur et kit ; une seconde
  analyse pendant la première est refusée ; une erreur du moteur rend un
  constat Bloquant et rien d'autre ; une analyse partielle le dit ; la
  sélection ne change que par `src/ecriture/selection.ts`.
- [ ] **B4 · Écriture des liaisons.** `implementeur-exigeant` · vague 5 · note E.
  Écrit : `src/ecriture/liaisons.ts`.
  Fait quand : un test par sorte (nombre, fill de frame, stroke, texte) sur
  doubles ; un objet changé depuis l'aperçu est sauté et compté ; un fichier qui
  ne déclare plus UCM ne reçoit rien ; un lot = un point d'annulation.
- [ ] **B5 · Corrections, questions, Ignorer.** Vague 5 · B4, K8.
  Fait quand : corrections de K8 dans le lot Appliquer ; renommer une valeur
  de variante (C12), une valeur déjà présente devient une question ; Ignorer et
  « Ne plus proposer » rangés à la racine du document, sous leur clé ; un
  ignoré revient par « Ne plus ignorer » ; une limite de lecture ne s'ignore
  pas.
- [ ] **B7 · Règles de composant.** Vague 5 · B2.
  Fait quand : C43, C44, C45 ; C46 par `template/ecriture.ts` du socle,
  Architect dans les importeurs permis ; ajout et retrait d'une instance
  remplie refusés avec un motif.
- [ ] **B8 · Préparation, création, retour.** Vague 6 · K6, B6, B4.
  Fait quand : préparation rangée dans `figma.clientStorage` avec la clé et le
  nom du jeu de variants ; copie en texte ; dans le fichier des tokens, création
  des seules variables manquantes par le journal ; retour au composant
  seulement pour la même clé de jeu ; une variable pas encore publiée laisse sa
  ligne sans case ; règles reçues transmises par le même chemin (C13).
- [ ] **B9 · Branchement de l'accessibilité et de la typographie.** Vague 6 ·
  K4, K7, B2.
  Fait quand : constats de K4 et K7 dans l'analyse ; le niveau AA ou AAA vient
  de la Configuration.

### Piste O · orchestrateur

- [ ] **O0 · Notes de la vague 0** (§7) et envoi des sondes.
- [ ] **O1 · Documents, à chaque jalon** : routes de `domiciles.json`, carte,
  `AGENTS.md` et invariants d'Architect, `SPEC.md` de l'explorateur devenu
  celui d'Architect, README de ce dossier, ROADMAP ; selon `agents:diff`.
- [ ] **O2 · Publication du kit, à J-F, avant le push** (skill
  `publier-paquets`), avec le CLI et l'adaptateur si leurs dépendances
  changent.
- [ ] **O3 · Textes de l'explorateur et du kit qui traduisent un terme Figma**
  (`plugin-explorateur/src/ui/textes.ts` devenu celui d'Architect, définition
  de `scale` dans `kit/src/referentiel/theme.ts`) : confiés à U1 et K2.

## 7. Notes de conception

Écrites par l'orchestrateur en vague 0, dans ce fichier, sous ce titre. Elles
ne demandent pas de validation avant les lots ; le §9 les rend au mainteneur.

- **N1 · Domaines et messages.** La liste des domaines du squelette : arbre et
  tableau des tokens, recherche, fiche, library, nomenclature, structure et
  scopes, vue Composant, analyse, corrections, questions, ignorés,
  accessibilité, règles de composant, préparation, configuration. Pour chacun,
  les messages UI → sandbox et sandbox → UI, typés, tirés des cadres de la
  maquette.
- **N2 · Relevé du composant.** Le type sérialisable que B1 produit et que le
  kit juge : variants, propriétés, layers, liaisons (porteur, champ, indice),
  variables atteintes (collection, scopes, alias par mode), lectures manquées.
- **T · Table des constats attendus.** Pour Button et Alert, les constats
  attendus (code, chemin). Elle corrige la section 4 de la grammaire : un champ
  peint sans variable relève de C30 ; un rôle non peint ne donne aucun
  constat ; C59 attend K5.
- **G · Grammaire.** Reconnaissance des positions facultatives de
  `FORMES_DES_CHEMINS` ; levée des exclusions de `components` dans
  `grammaire.ts` ; forme `layout/icon/<taille>` ; segment à deux registres
  (`text`) lu par les axes, `ambigu` sans eux ; registre propre à `components`
  pour `padding`, `gap`, `width`, `height`, `border-width` ; termes de l'équipe.
- **E · Écriture des liaisons**, sur l'hypothèse de S-2 : champs couverts,
  ordre, relecture, objet changé depuis l'aperçu, échec partiel, annulation par
  Ctrl+Z.
- **P · Préparation.** Axes et éléments ; icône pilotée par une propriété
  d'échange d'instance ; intensité ; cibles d'une variable, un même chemin à
  deux alias devient une question ; tailles exactes dans chaque mode de
  `layout`.

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
  manifeste, puis lire `figma.fileKey`. Hypothèse : `undefined`, la clé
  n'est servie qu'à un plugin privé publié dans l'organisation. Si la clé est
  servie, B3 ajoute le drapeau au manifeste et le lien de `t-bibliotheque`
  marche.

## 8. Jalons

| Jalon | Contenu vérifié | Après |
|---|---|---|
| J0 | `npm test`, typecheck, build ; Nomenclature et l'explorateur ne vivent plus que dans Architect | vague 1 |
| J1 | Mode Tokens : fidélité de `t-*` | vague 3 |
| J2 | Mode Composant, lecture : fidélité de `c-avant` à `c-afaire`, `e-*` | vague 4 |
| J3 | Corrections, écriture, accessibilité : fidélité de `c-apres`, `c-ctrlz`, `x-*` | vague 5 |
| J-F | Fidélité de tous les cadres ; ni « UCM Token Explorer », ni « UCM Nomenclature », ni « Token Architect » dans le code ou un document vivant ; O1 ; §9 rendu ; recette du mainteneur, puis publication du kit (O2) et push : `test:ui`, renommage et annulation, analyse et correction de Button sur une copie, préparation d'Alert | vague 6 |

## 9. Questions de fin

Remplie pendant l'exécution. Une ligne par choix fait sans le mainteneur :
`Q-n · lot · question · choix appliqué · réversible : oui ou non`.

Tranchées par le mainteneur le 22 octobre :

- Q-1 · Un seul push, à J-F, après la recette. La CI ne tourne pas avant.
- Q-2 · Codex dans un clone à part, intégré par `git merge`. L'historique de
  `main` reçoit des commits de fusion.

À confirmer, déjà choisies par défaut :

- Q-3 · Les questions M de la maquette restées ouvertes, et le choix appliqué :
  la fiche d'une variable remplace l'inspecteur de l'explorateur (M-3) ; dans
  un fichier non déclaré UCM, aucun renommage, il faut déclarer d'abord
  (M-10) ; la section Variants prend la forme C partout (M-14) ; un survol lié
  au token du repos devient une question, pas une correction (M-15) ; les
  libellés de Figma restent en anglais même si le designer emploie Figma en
  français (M-17) ; le bouton du panneau s'appelle « Constats » (M-18).
- Q-4 · Lien vers le fichier des tokens : selon la sonde S-4.
- Q-5 · Les six notes de conception du §7 (domaines et messages, relevé du
  composant, constats attendus, grammaire, écriture des liaisons, préparation)
  fixent des règles que le code suit. L'orchestrateur les écrit en vague 0, et
  les lots les appliquent sans attendre une relecture du mainteneur. Il les
  relit à la fin, avec le reste du §9.

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
