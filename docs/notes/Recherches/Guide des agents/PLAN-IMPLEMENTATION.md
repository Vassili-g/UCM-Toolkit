# Plan d'implémentation du guide des agents

Ce plan réunit le [plan du découpage](./PLAN-DECOUPAGE-AGENTS.md), la
[convention d'écriture](./CONVENTION-ECRITURE-AGENTS.md) et la
[critique](./CRITIQUE-DU-DECOUPAGE.md). Il réécrit de zéro, dans la convention,
chaque texte d'`AGENTS.md`, sans perte d'information. La section 6 consigne la
revue du plan et ce qu'elle a changé.

## 1. Décisions retenues

Le mainteneur a demandé l'implémentation. Les choix proposés du plan du
découpage sont retenus, sauf D3.

| Décision | Retenu |
|---|---|
| D1 | invariants dans `packages/<paquet>/invariants/` |
| D2 | `packages/<paquet>/CLAUDE.md` d'une ligne, `@AGENTS.md` |
| D3 | carte réécrite à la main dans la convention, un `CARTE.md` par paquet ; un test vérifie que chaque chemin cité existe. La génération depuis les en-têtes perdrait les descriptions écrites à la main |
| D4 | 32 Kio par chaîne d'`AGENTS.md` |
| D5 | `--diff` rappelle, sans bloquer |
| D6 | hook `PreToolUse` en plus du test |
| D7 | la spécification de Palettes reste dans son dossier |
| D8 | `* text=auto eol=lf` |
| D9 | marqueur `TODO(texte)`, refusé par un test |
| D10 | aucun agent ne lance `test:ui` sans demande explicite |

## 2. Principe

`AGENTS.md` reste entier et inchangé pendant toute la rédaction. Les nouveaux
fichiers s'écrivent à côté de lui, et rien ne les lit encore. La bascule
(lot 9) remplace `AGENTS.md` et adapte les contrôles en un seul commit.

Ce principe répond à deux faits. D'autres sessions modifient encore
`AGENTS.md` : `a3ea52ee` l'a changé après la clôture du plan de fiabilité. Et
une réécriture ne se vérifie que contre un état figé. Le script de
conservation tourne donc contre `HEAD` au moment de la bascule : une puce
ajoutée entre-temps par une autre session doit figurer dans les nouveaux
fichiers, sinon la bascule échoue.

## 3. Fichiers visés

```text
AGENTS.md                               index, au plus 200 lignes et 12 Kio
CARTE.md                                carte du dépôt hors paquets : docs/, scripts/, tests/, .agents/, .claude/, .github/
CLAUDE.md                               @AGENTS.md, puis la délégation
.agents/domiciles.json                  le manifeste
.agents/skills/rediger-pour-agents/     la convention d'écriture
.agents/skills/publier-paquets/         la procédure de publication
packages/<paquet>/AGENTS.md             rôle, frontière d'écriture, commandes, table des invariants ; au plus 6 Kio
packages/<paquet>/CLAUDE.md             @AGENTS.md
packages/<paquet>/CARTE.md              carte du paquet
packages/<paquet>/invariants/*.md       un fichier par groupe
scripts/agents-contexte.mjs             lire, domicile, diff
scripts/verifier-conservation.mjs       la garde mécanique de la réécriture
scripts/hook-documents.mjs              refus d'un document hors registre
tests/domiciles.test.ts                 le manifeste couvre packages/*/src/
tests/registreDesDocuments.test.ts      aucun Markdown hors registre
tests/finsDeLigne.test.mjs              aucun CRLF dans l'index
tests/cartes.test.ts                    chaque chemin d'une carte existe
```

### 3.1 Les groupes et leur fichier

| Groupe source dans `AGENTS.md` | Fichier |
|---|---|
| Portée et forme du contrat | `packages/plugin-exporter/invariants/portee-du-contrat.md` |
| Tokens et variables | `packages/plugin-exporter/invariants/tokens-et-variables.md` |
| Couleurs | `packages/plugin-exporter/invariants/couleurs.md` |
| Composition | `packages/plugin-exporter/invariants/composition.md` |
| Arbre des slots | `packages/plugin-exporter/invariants/arbre-des-slots.md` |
| Layout, dimensions et bornes | `packages/plugin-exporter/invariants/layout.md` |
| Grilles | `packages/plugin-exporter/invariants/grilles.md` |
| Diagnostics | `packages/plugin-exporter/invariants/diagnostics.md` |
| Échantillon de maquette | `packages/plugin-exporter/invariants/echantillon.md` |
| Écriture dans le document | `packages/plugin-exporter/invariants/ecriture-dans-le-document.md` |
| Vérification : moteur jugé sur ses sorties, schéma DTCG, Style Dictionary, `lois.ts` | `packages/plugin-exporter/invariants/tests-du-moteur.md` |
| Versionnage | `packages/kit/invariants/versionnage.md` |
| Vérification : corpus 12.0 et 11.0, forme d'origine des tokens | `packages/kit/invariants/corpus-de-test.md` |
| Avant de modifier : paragraphe du référentiel | `packages/kit/invariants/referentiel.md` |
| Moteur de couleur | `packages/couleur/invariants/moteur-de-couleur.md` |
| Écriture d'UCM Palettes | `packages/plugin-palettes/invariants/ecriture.md` |
| Langue d'UCM Palettes | `packages/plugin-palettes/invariants/langue.md` |
| Interface d'UCM Palettes | `packages/plugin-palettes/invariants/interface.md` |
| Explorateur de tokens | `packages/plugin-explorateur/invariants/explorateur.md` |
| UCM Nomenclature | `packages/plugin-nomenclature/invariants/nomenclature.md` |
| Publier les paquets | `.agents/skills/publier-paquets/SKILL.md` |
| Avant de modifier (reste), Vérification (commandes), frontière de recette, limites | `AGENTS.md` racine |

Chaque fichier d'invariants commence par `# <titre du groupe>`, le titre
source exact. L'ordre du manifeste suit l'ordre actuel des groupes.

### 3.2 Le manifeste

```json
{
  "version": 1,
  "domaines": [
    {
      "id": "exporter-layout",
      "titre": "Layout, dimensions et bornes",
      "fichier": "packages/plugin-exporter/invariants/layout.md",
      "chemins": ["packages/plugin-exporter/src/contract/layoutNodes.ts"],
      "specs": ["docs/format/FORMAT.md#3-layout"],
      "lies": ["packages/plugin-exporter/SPEC.md"],
      "verifications": ["npm run test:paquet -- exporter"]
    }
  ],
  "cartes": { "packages/plugin-exporter": "packages/plugin-exporter/CARTE.md" },
  "registre": ["AGENTS.md", "packages/*/invariants/*.md"]
}
```

Règle de résolution : pour un chemin, parmi les motifs qui correspondent, le
plus long en caractères désigne le domicile ; à longueur égale, le dernier
dans l'ordre du fichier. Chaque paquet a un motif `packages/<paquet>/src/**`
vers son domaine par défaut, et un motif de dossier ou de fichier l'emporte
sur lui quel que soit l'ordre des domaines. La première version suivait la
règle de `CODEOWNERS`, le dernier motif l'emporte : elle forçait à déplacer
des domaines dans la liste, et deux fichiers ne pouvaient pas rejoindre le
domaine qui les cite.

Les motifs initiaux se déduisent des citations : un fichier va au domaine
dont les invariants le citent le plus souvent, l'ordre du manifeste départage,
et un fichier jamais cité va au domaine par défaut de son paquet. Un paquet
sans groupe (`cli`, `adapter-typescript`, `plugin-socle`) a pour domaine par
défaut celui qui cite le plus ses fichiers.

## 4. Les lots

Profils : `implementeur` (Sonnet, effort moyen), `implementeur-exigeant`
(Sonnet, effort élevé), `executant` (Haiku), `verificateur` (Haiku),
`relecteur` (agent généraliste sur Sonnet, lecture seule), conversation
principale. Deux agents au plus en même temps.

### Lot 1. Fins de ligne (A2) : fait, `6cb3974a`, `3a79a220`

Profil : conversation principale. Une ligne, cinq fichiers, un test court.

- [x] `* text=auto eol=lf` en tête de `.gitattributes`.
- [x] `git add --renormalize` sur les cinq fichiers CRLF de l'index, commit seul.
- [x] `tests/finsDeLigne.test.mjs` : `git ls-files --eol`, refus de `i/crlf`.

Fin : `node scripts/run-tests.cjs` passe. Ce lot précède les autres, pour que
Git normalise ce que les agents écrivent.

### Lot 2. Le manifeste et `agents-contexte` : fait, `4f55e5de`

Profil : `implementeur`. Fichiers : `.agents/domiciles.json`,
`scripts/agents-contexte.mjs`, `tests/domiciles.test.ts`, `package.json`
(trois scripts).

- [x] Le manifeste de la section 3.2, avec les fichiers de la section 3.1.
- [x] `node scripts/agents-contexte.mjs lire <chemin…>` : liste triée, sans
  doublon : `AGENTS.md`, `AGENTS.md` et `CARTE.md` de chaque paquet touché,
  domicile de chaque chemin, ses `specs`.
- [x] `domicile <chemin>` : une ligne, le fichier.
- [x] `diff [--base <ref>]` : depuis `git diff --name-status <ref>` et les
  fichiers non suivis, quatre listes titrées : domiciles, documents liés,
  vérifications, fichiers Markdown qui citent un chemin supprimé ou renommé.
- [x] Scripts npm `agents:lire`, `agents:domicile`, `agents:diff`.
- [x] `tests/domiciles.test.ts` : chaque fichier suivi de `packages/*/src/` a un
  domicile ; chaque `fichier`, `specs` et `lies` existe une fois les lots 4
  à 7 faits (le test saute un fichier encore absent tant que
  `AGENTS.md` porte le groupe, et l'exige après la bascule) ; deux appels
  rendent la même sortie.

Fin : `npm run agents:domicile -- packages/couleur/src/rampe.ts` rend
`packages/couleur/invariants/moteur-de-couleur.md`.

### Lot 3. La garde de conservation : fait, `4f55e5de`

Profil : `implementeur-exigeant`. Fichier : `scripts/verifier-conservation.mjs`.

- [x] Entrée : un commit de référence et le manifeste. Le script lit
  `AGENTS.md` à ce commit et coupe ses groupes selon la section 3.1.
- [x] Pour chaque groupe, il relève les atomes : textes en code, nombres,
  identifiants de test entre crochets (`[UI-20]`), cibles de liens. Un chemin
  se compare par son dernier segment, puisque la convention raccourcit les
  chemins ; une cible de lien se compare par fichier et ancre.
- [x] Il exige que chaque atome du groupe source figure dans le fichier
  d'arrivée. Pour les parties sans groupe (en-tête, carte, vérification,
  limites), il exige leurs atomes dans la réunion des nouveaux fichiers.
- [x] Sortie : par fichier, les atomes manquants ; code de sortie non nul
  s'il en manque un.
- [x] Tests du script sur deux petits textes figés, dans `tests/`.

Fin : lancé sur le commit courant avec des fichiers d'arrivée vides, il
liste tous les atomes ; avec une copie exacte des groupes, il n'en liste aucun.

### Lot 4. La convention en skill : fait, `4f55e5de`

Profil : conversation principale.

- [x] `.agents/skills/rediger-pour-agents/SKILL.md` depuis la proposition,
  avec le gabarit, les raccourcis, la liste de garde et le relevé de la
  section 3 de ce plan.
- [x] Ajouter au gabarit l'en-tête d'un fichier d'invariants et d'un `CARTE.md`.

Fin : le contrôle de style passe sur la skill.

### Lots 5 à 7. La réécriture

Chaque lot réécrit des groupes de zéro, dans la convention, depuis
`AGENTS.md` au commit de départ. Il corrige au passage les écarts relevés par
la recherche (section 1.3) qui le concernent. Il ne change le sens d'aucune
règle : une règle qui lui paraît fausse se rend en question.

Fin de chaque lot : `verifier-conservation` ne liste aucun manque pour ses
fichiers, le contrôle de style passe, puis un `relecteur` compare chaque
groupe source à son fichier et liste les négations, conditions et bornes
perdues. La conversation principale corrige ou rend la question au
mainteneur.

| Lot | Profil | Groupes | Octets source |
|---|---|---|---:|
| 5a | `implementeur-exigeant` | exporteur : portée, tokens, couleurs, composition, arbre des slots | 19 544 |
| 5b | `implementeur-exigeant` | exporteur : layout, grilles, diagnostics, échantillon, écriture, tests du moteur | environ 26 500 |
| 6a | `implementeur-exigeant` | moteur de couleur ; kit : versionnage, corpus, référentiel | environ 20 000 |
| 6b | `implementeur-exigeant` | Palettes : écriture, langue, interface | 24 446 |
| 7a | `implementeur-exigeant` | explorateur, Nomenclature | 12 083 |
| 7b | `implementeur` | les dix cartes : neuf `CARTE.md` de paquet et `CARTE.md` racine ; `tests/cartes.test.ts` | 42 523 |

Le lot 7b garde chaque fichier que la carte actuelle décrit, et sa
description dans la convention. Il ajoute `src/espace.ts` à l'explorateur et
retire les quatre dossiers de `docs/notes/` absents.

### Lot 8. Les `AGENTS.md` de paquet et la publication

Profil : `implementeur`. Fichiers : neuf `packages/<paquet>/AGENTS.md`, neuf
`CLAUDE.md`, `.agents/skills/publier-paquets/SKILL.md`.

- [ ] Chaque `AGENTS.md` de paquet, dans la convention : rôle du paquet en une
  phrase, fichiers qui écrivent dans Figma ou dans le document, commandes de
  test et de build, table de ses fichiers d'invariants avec leurs motifs de
  chemins. Au plus 6 Kio.
- [ ] Chaque `CLAUDE.md` : `@AGENTS.md`.
- [ ] La skill de publication reprend « Publier les paquets » dans la
  convention, sans rien perdre.

### Lot 9. La bascule

Profils : conversation principale pour les textes, `implementeur-exigeant`
pour les contrôles. Un seul commit.

Conversation principale :

- [ ] Le nouveau `AGENTS.md` racine, de zéro, dans la convention : le produit
  en un paragraphe ; les skills à charger ; les invariants transversaux
  (référentiel en une ligne, plugins séparés, document intact, ordre des
  versions) ; la table de routage, entre deux marqueurs et écrite par
  `agents-contexte.mjs ecrire-index` ; la table « Où écrire » ; la consigne de
  doute ; les commandes ; la frontière de recette ; les limites ; le renvoi à
  la section « Travailler avec des agents ».
- [ ] `CLAUDE.md` : `@AGENTS.md` ; l'orchestrateur lance `agents:lire` avant
  de déléguer et `agents:diff` avant de commiter ; le prompt d'un
  implémenteur contient la note du lot et cette liste, rien d'autre.
- [ ] `CONTRIBUTING.md` : section « Travailler avec des agents » (A1, A3, D10,
  table des exigences selon la tâche) ; tables « Documentation » et « Une
  règle, un domicile » ; phrase de la convention dans « Rédiger un document ».
- [ ] `.claude/agents/implementeur.md`, `implementeur-exigeant.md`,
  `executant.md` : `git status` d'abord ; lire la liste du prompt ;
  `test:paquet` des paquets touchés ; pas de `test:ui` ; `agents:diff` avant
  de rendre ; aucun document créé.
- [ ] `docs/README.md` : table des autorités.

`implementeur-exigeant` :

- [ ] `tests/inventaireInvariants.test.ts` lit les fichiers et l'ordre des
  groupes dans le manifeste. Une entrée de `AUTORITES` qui est un chemin
  `packages/<paquet>/…` se trouve aussi sous sa forme courte : `<paquet>/…`
  partout, ou le reste du chemin dans un fichier de ce paquet. Aucune entrée
  n'est retirée. Le contrôle de la liste de `tests/` lit `CARTE.md` racine.
  Le titre « quatorze domaines » devient exact.
- [ ] `tests/docLinks.test.ts` résout les liens de référence et compte les
  ancres distinctes de `FORMAT.md` et de `SPEC.md` dans les fichiers
  d'invariants, au seuil de vingt.
- [ ] `scripts/controle-style.mjs` : fichiers d'invariants et `AGENTS.md` de
  paquet dans `AUTORITES`.
- [ ] `tests/registreDesDocuments.test.ts` et `scripts/hook-documents.mjs`,
  branché en `PreToolUse` sur `Write` dans `.claude/settings.json`.
- [ ] Un test borne `AGENTS.md` racine à 12 Kio et chaque chaîne
  racine-paquet à 32 Kio.
- [ ] Les liens entrants vers une ancre d'`AGENTS.md` et les commentaires de
  code qui citent une de ses sections visent leur nouveau fichier.

Fin : `verifier-conservation <HEAD>` ne liste aucun manque, et un
`verificateur` rend `npm test`, `npm run typecheck` et `npm run build` verts.

### Lot 10. Mesure

Profil : conversation principale.

- [ ] Additionner les octets que `agents:lire` rend pour les six tâches types
  du plan du découpage, et les consigner dans le README du dossier.
- [ ] Rendre au mainteneur les essais Codex et `/context`.

## 5. Ordre d'exécution

| Vague | Agents en parallèle | Après |
|---|---|---|
| 1 | lot 2 et lot 3 | lots 1 et 4 par la conversation principale, pendant ce temps |
| 2 | lots 5a et 5b | vague 1 commitée |
| 3 | relecteur de 5a et 5b ; lot 6a | |
| 4 | lot 6b ; relecteur de 6a | |
| 5 | lot 7a ; lot 7b | |
| 6 | relecteur de 6b, 7a et 7b ; lot 8 | |
| 7 | lot 9, contrôles | textes de la bascule par la conversation principale |
| 8 | `verificateur` | commit de la bascule |

Chaque vague se commite par chemins explicites, avec la vérification des
octets de fin de ligne tant que le lot 1 n'est pas commité.

## 6. Revue du plan

Relecture faite avant la première vague. Points relevés et changement apporté :

| Point | Changement |
|---|---|
| `AGENTS.md` change encore sous d'autres sessions ; un déplacement en place entrerait en conflit avec elles | rédaction à côté, bascule en un commit, conservation vérifiée contre `HEAD` à la bascule (section 2) |
| Une carte générée depuis les en-têtes perdrait les descriptions écrites à la main | D3 : carte réécrite dans la convention, chemins testés |
| `AUTORITES` cherche `packages/couleur/src/rampe.ts` en entier ; la convention l'écrit `src/rampe.ts` | le test accepte la forme courte selon une règle écrite (lot 9) ; aucune entrée retirée |
| `docLinks` ne lit pas les liens de référence, et compterait moins de vingt renvois | le test résout ces liens et compte 28 ancres distinctes aujourd'hui, au seuil de vingt |
| Comparer les chemins par leur dernier segment confond `fenetre.ts` de quatre paquets | la garde mécanique reste nécessaire, pas suffisante ; le relecteur couvre ce cas |
| Les agents écrivent parfois en CRLF | le lot 1 passe en premier |
| Un test de domiciles qui exige les fichiers d'arrivée échouerait avant la réécriture | il les saute tant que le groupe vit dans `AGENTS.md` |
| La relecture de chaque lot doublerait le nombre d'agents | un relecteur par vague, qui couvre un ou deux lots |
| Un rédacteur pourrait corriger une règle qu'il croit fausse | consigne : aucun changement de sens, une question à la place |
| `.claude/agents/` dit encore de lancer `test:ui` | corrigé au lot 9 (D10) |
| Pendant le lot 5a, le gabarit appliqué sans compacter a grossi les fichiers ; une passe de compaction sans perte s'arrête à 85–98 % des groupes de l'exporteur, déjà denses | cible ramenée à 90 % ; un pourquoi ne se retire que si la spec liée l'énonce. Le gain de lecture vient du découpage, la compaction n'y ajoute qu'environ 10 % |
| Le seuil de la partie B du plan du découpage n'est pas mesuré | le mainteneur a demandé l'implémentation ; les essais Codex restent utiles et passent au lot 10 |
