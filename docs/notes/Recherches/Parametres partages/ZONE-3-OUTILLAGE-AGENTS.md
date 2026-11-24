# Zone 3 : l'outillage des agents

## Étapes

- [x] 1. Relire la recherche P27, les zones 1 et 2, `AGENTS.md`, `CLAUDE.md` et `CONTRIBUTING.md`
- [x] 2. Hooks et registre des documents, essayés avec des entrées fabriquées
- [x] 3. Hooks de style et de réponse face à `controle-style.mjs` et au bloc « Écrire »
- [x] 4. Domiciles, vérifications et `agents:diff`
- [x] 5. Définitions d'agents face à `CLAUDE.md`
- [x] 6. Skills face aux commandes et aux chemins réels
- [x] 7. Découverte des tests et règles « avant de terminer »
- [x] 8. Fiches, `parametres.json`, contrôle de style

## Synthèse

La zone compte 17 écarts : 9 importants, 8 mineurs, aucun bloquant. 8 cassent la Robustesse et 9 la Confiance.

Le registre des documents a deux juges qui ne se parlent pas. Le hook refuse un `.md` dans `_local/` que le test ignore (PP-301), et `Bash` ou `PowerShell` créent un `.md` sans passer par aucun hook (PP-302).

L'outillage n'a pas de domicile. `agents:domicile` sort en erreur sur 5 chemins d'outillage, `agents:diff` ne liste aucune vérification pour `scripts/` et `.claude/` (PP-303), et il omet la commande de test du paquet pour 69 fichiers sources (PP-304).

Trois contrôles se lisent verts sans rien contrôler : `verifier-conservation` rend « 0 entrées » (PP-305), 5 découvreurs de tests ne lancent qu'un suffixe (PP-308), et `test:ui`, interdit en six endroits, n'est gardé nulle part (PP-306).

Les listes de style ont trois bords qui divergent : le hook juge des fichiers que le test exclut (PP-307), les hooks de réponse appliquent 5 des 10 règles de fichier (PP-310), et `CLAUDE_CODE_SUBAGENT_MODEL` peut annuler les modèles des agents (PP-309).

## Méthode

Les scripts sont rangés hors du dépôt, dans le dossier `audit-p27-zone3` du brouillon de session. Ils importent les vraies fonctions des sources ou lancent les hooks en processus avec une entrée JSON fabriquée, sans copie. Une copie du dépôt réduit à trois scripts sert aux essais qui cassent un fichier (manifeste tronqué, fichier `.js`).

| Script | Ce qu'il fait | Résultat |
|---|---|---|
| `hook-doc-essais.mjs`, `norm.mjs` | 18 chemins passés à `hook-documents.mjs`, sous cinq écritures du même chemin (antislash, barres, relatif, `./`, lettre de lecteur en capitale) | `_local/` refusé, wildcards acceptés, 5 écritures d'un même chemin donnent le même verdict |
| `hook-rep.mjs` | 13 réponses fabriquées à `hook-reponse.mjs` | 3 refus, 10 passes dont tiret cadratin, capitales, opposition, offre de suite |
| `exclus.mjs` | refus et signaux de chaque entrée de `EXCLUS_DU_CONTROLE`, flèches de `AGENTS_A_CONVERTIR`, `hook-style.mjs` sur 3 fichiers exclus | 22 refus hors test, 3 fichiers refusés par le hook |
| `diff-outillage.mjs`, `diff-arch.mjs`, `verifs-paquet.mjs` | `agents:diff` sur 6 lots d'outillage et 3 fichiers de paquet | 0 vérification pour l'outillage, commandes manquantes pour des fichiers de paquet |
| `import-scan.mjs` | 1 158 imports de `packages/*/tests/*.test.*` vers `src/`, domaine de la source, commande du paquet du test | 69 sources dans 11 domaines sans la commande du paquet qui les teste |
| `tests-non-decouverts.mjs`, `tmp-tests` | fichiers de test suivis face au filtre de chaque `run-tests.cjs`, puis un `.test.mjs` rouge face au découvreur du socle | 0 orphelin aujourd'hui ; le `.test.mjs` rouge laisse la sortie à 0 |
| `refs-agents.mjs` | scripts npm, chemins, liens relatifs cités par 39 fichiers d'agents | 14 relevés, tous des exemples ou des scripts de paquet : 0 référence morte |
| `registre-mort.mjs` | motifs du registre sans document, dossiers de recherche sans motif | 1 motif sans document (`LICENSE*`), aucun dossier sans motif |
| `js-hook.mjs` | `fautesDuFichier` et `hook-style.mjs` sur `x.js` et `x.mjs` (copie) | `.js` jugé par la fonction, ignoré par le hook |
| `run-copie.mjs` | `hook-documents.mjs` copié avec un `domiciles.json` tronqué, sur 2 chemins | sortie 1 dans les deux cas |

Un agent `verificateur` a répondu à une question sur son modèle pour la fiche PP-309 : il tourne en Haiku. Aucune autre commande ne lui a été confiée. `test:ui` n'a pas été lancé.

Les tables et les titres échappent à `controle-style.mjs` (`lignesDeProse`) : les citations en cellule de tableau de ce document ne sont pas jugées.

## Ce qui est tenu sans écart

- Les modèles de la table de `CLAUDE.md` (cinq agents en Sonnet, `executant` et `verificateur` en Haiku) égalent les `model:` des 7 définitions.
- Les 9 `packages/*/CLAUDE.md` valent `@AGENTS.md`.
- Chaque ancre de `specs`, chaque entrée de `lies` et chaque carte de `.agents/domiciles.json` existent (`domiciles.test.ts`, `cartes.test.ts`).
- Les scripts npm, chemins et liens relatifs cités par les guides, les skills et les agents existent (`refs-agents.mjs`).
- Le même chemin écrit de cinq façons donne le même verdict dans `hook-documents.mjs`, lettre de lecteur en capitale comprise.
- `.claude/settings.local.json` n'existe pas et rien ne le suit.

## Fiches

### PP-301 · Le hook refuse un Markdown dans `_local/` que le test ne voit pas

| | |
|---|---|
| Règle | un `.md` ne se crée que sous un motif du registre de `.agents/domiciles.json` |
| Endroits qui la disent | `scripts/hook-documents.mjs:42-61` (refus propre à `_local/`, remède `npm run sujet`) ; `tests/registreDesDocuments.test.ts` (ne voit pas les fichiers que Git ignore, donc `_local/`) ; `.gitignore` (`**/_local/`) ; `tests/styleMotifs.test.ts:136-139,159` (écrit des `.md` sous `tests/_local/` en comptant sur cette cécité) ; `CONTRIBUTING.md:663` (« jamais dans `_local/` », pour un sujet de recherche) ; `AGENTS.md:97` |
| Divergence prouvée | `hook-doc-essais.mjs` : `_local/essai-zone3.md` sort 2 avec le texte « Lancez `npm run sujet` » ; `tests/_local/x.md` et `packages/kit/_local/x.md` sortent 2 avec un autre texte (« Écrire dans le domicile… ») ; le test du registre ne reproche rien aux mêmes chemins. L'en-tête du test annonce « le même motif et le même message » : il y a trois messages. Aucun document ne dit ce que `_local/` accepte. Un `.txt` y passe (`hook-documents.mjs:42`) |
| Cas | un agent veut une note de reprise `_local/reprise/ETAT.md`. Le hook lui dit de créer un sujet de recherche, ce qui exige une piste `Pn` qu'il n'a pas. Il renomme en `.txt` ou contourne par `Bash` (PP-302). Rien dans le dépôt n'a dit laquelle des deux voies est permise |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | une fonction `verdictDuRegistre(manifeste, chemin)` exportée par `agents-contexte.mjs`, lue par le hook et par le test ; une clé `locaux` dans `.agents/domiciles.json` (motifs ignorés par Git et verdict pour un `.md`) ; un test de parité qui passe 20 chemins, `_local/` compris, au hook en processus et à la fonction, et compare le code de sortie |

### PP-302 · `Bash` et `PowerShell` créent un Markdown sans passer par aucun hook

| | |
|---|---|
| Règle | un agent ne crée aucun document hors registre ; chaque écriture rejoue le contrôle de style |
| Endroits qui la disent | `.claude/settings.json:9` (`PreToolUse` sur `Write`) et `:22` (`PostToolUse` sur `Write` et `Edit`) ; `scripts/hook-documents.mjs:37` (lit `tool_input.file_path`) ; `scripts/hook-style.mjs:5-9` (« à chaque écriture ») ; `CONTRIBUTING.md:556-557,599` ; `CARTE.md:53-55` ; `implementeur.md`, `implementeur-exigeant.md`, `executant.md` (« Ne crée aucun document ») |
| Divergence prouvée | `hook-documents.mjs` reçoit `{"tool_name":"Bash","tool_input":{"command":"cat > docs/guides/NOUVEAU-ZONE3.md …"}}` et sort 0 ; même résultat pour `{"tool_name":"PowerShell","tool_input":{"command":"Set-Content _local/x.md hello"}}`. Les définitions `implementeur`, `implementeur-exigeant` et `executant` donnent `Bash` et `PowerShell` à l'agent. Seul le test attrape un `.md` créé ainsi, et seulement hors `_local/` |
| Cas | un agent écrit un document par `cat > fichier <<EOF`. Ni le registre ni le style ne le voient avant `npm test`, qui échoue plus tard sur un tiret cadratin ou sur le registre, après que l'agent a rendu son rapport |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | un contrôle de l'état du dépôt à `Stop` et `SubagentStop`, indépendant de l'outil : `scripts/hook-etat.mjs` liste les `.md` nouveaux ou modifiés de `git status --porcelain`, applique `verdictDuRegistre` et `fautesDuFichier`, sort 2 avec la liste. Le test du registre appelle la même fonction `documentsHorsRegistre()` |

### PP-303 · L'outillage n'a pas de domicile, et `agents:diff` n'y demande aucune vérification

| | |
|---|---|
| Règle | avant de modifier on lit le domicile (`agents:lire`), avant de rendre on lance `agents:diff` et ses vérifications ; une règle tenue par le code a pour domicile le fichier que rend `agents:domicile` |
| Endroits qui la disent | `AGENTS.md:87` (ligne « Règle tenue par le code ») ; `AGENTS.md` « Avant de modifier » 1 et la dernière ligne du fichier ; `CONTRIBUTING.md:533` ; `scripts/hook-documents.mjs:58` (le message renvoie à `agents:domicile`) ; `tests/domiciles.test.ts` (ne tient que `packages/*/src/`) |
| Divergence prouvée | `agents:domicile` sort 1 pour `scripts/hook-documents.mjs`, `.claude/settings.json`, `tests/registreDesDocuments.test.ts`, `CONTRIBUTING.md` et `docs/notes/Recherches/Zzz/x.md`. `agents:lire` sur 8 chemins d'outillage écrit 8 fois « Aucun domicile » et ne rend que `AGENTS.md` et `CARTE.md`. `diff-outillage.mjs` : pour `scripts/hook-documents.mjs`, `.claude/settings.json`, `.claude/agents/verificateur.md`, `.agents/domiciles.json`, `scripts/controle-style.mjs` avec `tests/styleDocumentaire.test.ts`, et `CLAUDE.md`, les cinq listes de `agents:diff` sont vides, y compris « Vérifications » |
| Cas | un agent ajoute un sigle à `ACRONYMES` dans `scripts/controle-style.mjs`. `agents:diff` ne nomme ni `styleDocumentaire.test.ts`, ni `styleMotifs.test.ts`, ni `registreDesDocuments.test.ts`. L'implémenteur n'a pas le droit de lancer `npm test`, donc la CI les lance seule |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | un domaine `outillage-agents` dans `.agents/domiciles.json`, fichier `CONTRIBUTING.md`, ancre `#travailler-avec-des-agents`, chemins `scripts/controle-style.mjs`, `scripts/hook-*.mjs`, `scripts/agents-contexte.mjs`, `.claude/**`, `.agents/**`, `CLAUDE.md`, `tests/style*.test.ts`, `tests/registreDesDocuments.test.ts`, `tests/domiciles.test.ts`, `tests/cartes.test.ts`, et pour vérifications `npx tsx --test` sur ces six tests plus `node scripts/controle-style.mjs`. `domiciles.test.ts` étend sa première règle à tout fichier suivi de `scripts/`, `.claude/`, `.agents/` et `tests/` |

### PP-304 · `agents:diff` omet la commande de test du paquet qui teste le fichier

| | |
|---|---|
| Règle | « `npm run agents:diff` donne ces commandes » : les vérifications des paquets touchés |
| Endroits qui la disent | `CONTRIBUTING.md:533` ; `implementeur.md`, `implementeur-exigeant.md`, `executant.md` (section « Avant de rendre ») ; `.agents/domiciles.json` (clé `verifications` de chaque domaine) |
| Divergence prouvée | `import-scan.mjs` relève 1 158 imports d'un test de paquet vers une source. Pour 69 fichiers sources de 11 domaines, le domaine ne porte pas la commande du paquet du test. Exemples : 36 fichiers du domaine `nomenclature` dans Architect (dont `packages/plugin-architect/src/ecriture/noms.ts`) sans `npm run test:paquet -- architect` ; 19 fichiers du domaine `exporter-portee` dans le socle sans `npm run test:paquet -- socle` ; `packages/plugin-socle/src/bibliotheque.ts` (domaine `explorateur`) ; `packages/plugin-palettes/src/edition.ts` testé par `couleur`. `diff-arch.mjs` confirme : `agents:diff` sur `ecriture/noms.ts` rend `node scripts/run-tests.cjs` et `npm run test --workspace @ucm-kit/core`, pas les tests d'Architect. Limite : le relevé compte des imports, pas une intention ; une partie des liens inter-paquets peut être voulue |
| Cas | un agent corrige `packages/plugin-architect/src/ecriture/noms.ts`, lance les deux commandes de `agents:diff`, rend. `loiDEcritureDesNoms.test.ts` et quatre autres tests d'Architect qui importent ce fichier n'ont pas tourné |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | un test de `domiciles.test.ts` qui résout les imports `../src/…` de chaque test de paquet et exige la commande du paquet du test dans les `verifications` du domaine de la source, avec une table d'exceptions nommées ; ou une commande `agents-contexte ecrire-verifications` qui génère la clé comme `ecrire-index` génère les tables de domaines |

### PP-305 · `verifier-conservation --domaines <id>` rend vert sans rien lire

| | |
|---|---|
| Règle | une réécriture d'un fichier d'agent ne perd aucun nom en code, nombre, identifiant ni cible de lien ; la vérification est « bloquante » |
| Endroits qui la disent | `.agents/skills/rediger-pour-agents/SKILL.md:134` (« Bloquant ») ; `CARTE.md:64` ; en-tête de `scripts/verifier-conservation.mjs` (lit `AGENTS.md` à `--ref`, groupes `###` sous `## Invariants`) ; `git show HEAD:AGENTS.md` ne contient plus qu'un titre `###` et aucun `## Invariants` |
| Divergence prouvée | `node scripts/verifier-conservation.mjs --domaines referentiel` écrit « OK : 0 entrées, 0 non écrites, 0 atomes manquants, 0 erreurs » et sort 0 ; même résultat pour `exporter-layout`. Seul un domaine inconnu sort 2. Avec `--strict`, la seule entrée est la partie hors groupe |
| Cas | un agent compacte `packages/couleur/invariants/moteur-de-couleur.md` et applique l'étape 7.1 de la skill. La vérification est verte, une borne a disparu, le relecteur croit la conservation prouvée |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | le script sort 2 quand `--domaines` désigne un domaine sans groupe source ; une option `--source <fichier>@<ref>` compare le fichier d'arrivée à sa version précédente ; la skill donne alors la commande exacte ; un cas de `tests/verifierConservation.test.mjs` fait échouer « domaine sans groupe » |

### PP-306 · `test:ui` est interdit en six endroits et gardé nulle part

| | |
|---|---|
| Règle | aucun agent ne lance `test:ui` sans demande explicite du mainteneur |
| Endroits qui la disent | `CLAUDE.md:18` (le `verificateur` le lance « sur demande du mainteneur ») ; `CONTRIBUTING.md:536` ; `implementeur.md:50`, `implementeur-exigeant.md:50`, `executant.md:51` (« Jamais … `test:ui` ») ; `.claude/agents/verificateur.md:3` (la description le range parmi les commandes à lancer « d'office ») ; `CONTRIBUTING.md:501-503` (les trois commandes en bloc de code) |
| Divergence prouvée | les trois implémenteurs portent l'interdiction, le `verificateur` non : c'est l'agent dont le travail est de lancer des commandes. `.claude/settings.json` n'a ni `permissions` ni hook qui lise `tool_input.command` |
| Cas | l'orchestrateur confie « les vérifications du lot » au `verificateur`. Il lit les trois commandes de `CONTRIBUTING.md`, lance Chromium et reconstruit l'interface de chaque plugin, un geste que le mainteneur réserve à lui-même |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | un hook `PreToolUse` sur `Bash` et `PowerShell` qui sort 2 pour toute commande contenant un nom de la clé `interdits` de `.agents/domiciles.json` (`test:ui`, `galerie:captures`), sauf si le fichier `_local/autorise-test-ui` existe ; un test qui exige que chaque nom interdit figure encore dans un `package.json` de paquet. La CI lance ces scripts hors des agents |

### PP-307 · Le hook de style juge des fichiers que le test exclut, et deux exceptions n'ont plus de raison

| | |
|---|---|
| Règle | `EXCLUS_DU_CONTROLE` laisse un fichier hors du contrôle ; `AGENTS_A_CONVERTIR` garde la flèche en signal « quand une autre session modifie le fichier » ; la flèche est un refus dans un fichier d'agent |
| Endroits qui la disent | `scripts/controle-style.mjs:182` et `:722` ; `scripts/hook-style.mjs` (n'appelle pas `estExclu`) ; `CONTRIBUTING.md:599` ; `rediger-pour-agents/SKILL.md` §6 et §2 (« Pas de flèche `→` en prose ») ; `tests/styleMotifs.test.ts` (tient les deux listes) |
| Divergence prouvée | `exclus.mjs` : les 5 entrées d'`EXCLUS_DU_CONTROLE` portent 22 refus que `node scripts/controle-style.mjs` ne rend pas (« Style conforme »). `hook-style.mjs` sort 2 sur `packages/plugin-palettes/CARTE.md` (ligne 96), sur `packages/plugin-palettes/src/i18n/fr.ts` (3 passages dont `NFD`, que la règle écrite demande d'ajouter à `ACRONYMES`) et sur `CONVENTION-ECRITURE-AGENTS.md` (archive). Les raisons « fichier en cours de modification par une autre session » ne tiennent plus : l'arbre est propre et le dernier commit de la carte est `d8703d6c`. `packages/couleur/invariants/moteur-de-couleur.md` garde 23 flèches en signal ; `packages/plugin-palettes/CARTE.md` figure dans `AGENTS_A_CONVERTIR` avec 0 flèche |
| Cas | un lot de Palettes exige de mettre à jour `packages/plugin-palettes/CARTE.md` (« mettre à jour les domiciles et documents listés »). Le hook sort 2 sur une ligne que l'agent n'a pas écrite. Il réécrit une phrase hors lot ou rend un fichier que le hook dit fautif, alors que le test est vert |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | vider les deux listes : réécrire « en résumé » de la carte, ajouter `NFD` à `ACRONYMES`, convertir les flèches de `moteur-de-couleur.md`. Un test refuse une exception morte : chaque entrée de `EXCLUS_DU_CONTROLE` doit produire au moins un refus, chaque entrée d'`AGENTS_A_CONVERTIR` au moins une flèche |

### PP-308 · Cinq découvreurs de tests ne lancent qu'un suffixe, contre la règle écrite pour tous

| | |
|---|---|
| Règle | chaque paquet découvre `tests/*.test.ts` et `tests/*.test.mjs` |
| Endroits qui la disent | `AGENTS.md:115` ; `CONTRIBUTING.md:469-473` ; `scripts/run-tests.cjs` (en-tête : un test non exécuté « ne peut pas échouer », la maladie que le dépôt poursuit) ; `packages/adapter-typescript/scripts/run-tests.cjs:8` (`.test.mjs` seul) ; `plugin-architect`, `plugin-exporter`, `plugin-palettes` et `plugin-socle` (`extensions: ['.test.ts']`) ; `cli`, `kit`, `couleur`, `hub` lisent les deux |
| Divergence prouvée | `tmp-tests` : `lancerLesTests({ extensions: ['.test.ts'] })` sur un dossier avec `vert.test.ts` et un `rouge.test.mjs` qui lève une erreur écrit « pass 1, fail 0 » et sort 0. `tests-non-decouverts.mjs` : aucun fichier de test suivi n'échappe aujourd'hui à son paquet ; les 20 `.test.mjs` de `tests/interface/` et le `cascade.test.mjs` sont voulus (`test:ui`, `cascade`) |
| Cas | un contributeur écrit `tests/nouveau.test.mjs` dans Palettes, à la manière du kit. `npm run test:paquet -- palettes` reste vert, la CI aussi, tant que personne n'ouvre le fichier |
| Promesse | Robustesse |
| Gravité | important (latent, 0 test perdu aujourd'hui) |
| Garde proposée | un découvreur unique : les neuf `run-tests.cjs` appellent `lancerLesTests({ extensions: ['.test.ts', '.test.mjs'] })` du socle ; un test racine liste les `*.test.*` suivis directement sous `packages/*/tests/` et exige que chacun soit découvert, avec une exception nommée par dossier (`interface/`, `cascade/`) |

### PP-309 · `CLAUDE_CODE_SUBAGENT_MODEL` peut annuler les modèles des définitions d'agents

| | |
|---|---|
| Règle | `executant` et `verificateur` tournent en Haiku, les autres agents en Sonnet ; le coût suit Opus > Sonnet > Haiku |
| Endroits qui la disent | `CLAUDE.md:11-19` (table) ; `.claude/agents/*.md` (champ `model:`) ; `.claude/settings.json:4` (`"CLAUDE_CODE_SUBAGENT_MODEL": "sonnet"`) ; aucun document ne cite cette variable (`git grep`) |
| Divergence prouvée | deux sources fixent le modèle d'un sous-agent. La documentation de Claude Code donne à la variable priorité sur le champ `model:` de l'agent ; je n'ai pas pu le vérifier ici. Un `verificateur` lancé dans cette session a répondu « Haiku 5.5 » : dans ce harnais, la définition l'emporte. Le dépôt ne fige pas la version de l'outil qui lira ce fichier |
| Cas | sous un client où la variable prime, chaque `verificateur` et chaque `executant` tourne en Sonnet. Le quota se consomme plus vite que la table de `CLAUDE.md` ne le dit, et rien ne l'affiche |
| Promesse | Confiance |
| Gravité | important (à confirmer sur le client du mainteneur) |
| Garde proposée | `tests/agentsDefinis.test.ts` : la table de `CLAUDE.md` (agent, modèle) égale les `model:` des définitions, chaque ligne de la table a son fichier, et `.claude/settings.json` ne définit pas `CLAUDE_CODE_SUBAGENT_MODEL` |

### PP-310 · Les hooks de réponse appliquent la moitié des règles que « Écrire » dit valoir pour tout texte

| | |
|---|---|
| Règle | les règles d'écriture valent pour toute réponse et tout rapport d'agent ; « s'arrêter … sans résumé final ni offre de suite » ; les trois moments de contrôle ne jugent pas autrement |
| Endroits qui la disent | `AGENTS.md:7-21` ; `CONTRIBUTING.md:599` (« les motifs refusés partout ») ; en-tête de `scripts/controle-style.mjs` (« pour qu'aucun moment ne juge autrement ») ; `scripts/hook-reponse.mjs` (5 motifs de `MOTIFS_DE_REFUS_PARTOUT`, `stop_hook_active` coupe la boucle) |
| Divergence prouvée | `hook-rep.mjs` : sortie 2 pour « Bonne nouvelle », « afin de », « En résumé ». Sortie 0 pour un tiret cadratin en incise, un mot `TRÈS` en capitales, « Ce n'est pas un test, c'est une barrière », « robuste et élégante », « le 12 mars 2026 », « Souhaitez-vous que je poursuive ? », « Pour conclure, ». Un fichier refuse les cinq premiers cas. Une seconde réponse avec `stop_hook_active` à `true` passe même avec « Bonne nouvelle ». Aucun motif ne vise l'offre de suite |
| Cas | un sous-agent rend un rapport avec trois tirets cadratins et une offre de suite. Le hook se tait, le mainteneur les relève à la main, ce que le bloc « Écrire » devait supprimer |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | une table `REGLES_ECRIRE` dans `controle-style.mjs`, une entrée par puce du bloc « Écrire », avec son moyen (`motif` ou `relecture`) et ses portées (`fichier`, `reponse`) ; un test qui compare le nombre d'entrées au nombre de puces de `AGENTS.md` ; `hook-reponse.mjs` applique toute règle à portée `reponse`, et un motif `offre-de-suite` s'ajoute (« souhaitez-vous », « si vous voulez, je peux », « je reste à disposition ») |

### PP-311 · « Un mot en gras par section » contre le gabarit d'invariant en gras

| | |
|---|---|
| Règle | « le gras à un mot par section au plus » |
| Endroits qui la disent | `AGENTS.md:18` ; `.agents/skills/rediger-pour-agents/SKILL.md:35` (« Titre en gras : phrase complète ») et le gabarit `- **<Règle …>**` ; la skill n'assouplit que « fragments et symboles » |
| Divergence prouvée | par section, plus d'un gras : `AGENTS.md` en a 2 sections (3 gras dans « La frontière de recette »), `CLAUDE.md` 5 dans « Délégation aux sous-agents », `publier-paquets/SKILL.md` 7, `packages/kit/invariants/versionnage.md` 24, `packages/couleur/invariants/moteur-de-couleur.md` 30. `controle-style.mjs` n'a aucune règle sur le gras |
| Cas | un agent écrit un invariant comme le gabarit l'exige, le relecteur applique `AGENTS.md` et demande de retirer les gras |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | la skill exempte nommément le titre de puce d'un invariant ; un signal `gras-multiple` entre dans `NIVEAUX_DES_SIGNAUX` pour les documents hors invariants |

### PP-312 · `CARTE.md` oublie deux skills, sept définitions d'agents et un hook

| | |
|---|---|
| Règle | `CARTE.md` décrit les fichiers de `scripts/`, de `.agents/skills/` et de `.claude/` |
| Endroits qui la disent | `CARTE.md:39-46` (6 skills sur 8) ; `CARTE.md:66-67` (`.claude/` ne liste que `settings.json`) ; `tests/cartes.test.ts` (vérifie que chaque entrée existe, et compare seulement la section `tests/` dans l'autre sens) |
| Divergence prouvée | manquent `archiver-un-sujet/` et `regler-le-linter/` ; manquent les 7 fichiers de `.claude/agents/` ; la ligne de `.claude/` écrit « hook d'écriture sur Write et Edit, hook de réponse sur Stop et SubagentStop » et ne cite pas `PreToolUse` de `hook-documents.mjs` |
| Cas | `agents:lire` rend `CARTE.md` pour un chemin hors paquet. L'agent n'y trouve pas `regler-le-linter` et ne la charge que si `AGENTS.md` la lui désigne |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | `cartes.test.ts` exige, pour `scripts/`, `.agents/skills/` et `.claude/agents/`, que chaque fichier ou dossier suivi figure dans la carte |

### PP-313 · Le registre accepte une nouvelle skill ou un nouveau document sans l'accord que `AGENTS.md` exige

| | |
|---|---|
| Règle | « un nouveau document, une nouvelle skill ou un nouveau dossier de recherche demande l'accord du mainteneur, qui l'ajoute au registre » |
| Endroits qui la disent | `AGENTS.md:97` ; `CONTRIBUTING.md:663` et le message du hook (l'agent lance `npm run sujet`, qui écrit lui-même le motif) ; `implementeur.md` et ses deux jumeaux (« Ne crée aucun document ») ; registre : `.agents/skills/*/**`, `.claude/agents/*.md`, `docs/guides/**`, `docs/notes/Archives/**`, `docs/notes/Recherches/<dossier>/**`, et `LICENSE*` (aucun document) |
| Divergence prouvée | `hook-doc-essais.mjs` : `.agents/skills/nouvelle/SKILL.md`, `.claude/agents/nouveau.md`, `docs/notes/Archives/Nouveau/x.md` et `docs/notes/Recherches/Parametres partages/ZONE-9.md` sortent 0. La skill `archiver-un-sujet` écrit que `docs/notes/Archives/` ne reçoit plus de dossier |
| Cas | un implémenteur ajoute une skill sous `.agents/skills/<nom>/`. Le hook et le test acceptent, le dépôt gagne une procédure sans accord |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | `AGENTS.md` dit qui ajoute quoi (l'agent lance `npm run sujet`, le mainteneur autorise le reste) ; un fichier `documents-fermes.json` liste les documents des motifs fermés (`Archives/**`, `.agents/skills/*/SKILL.md`, `.claude/agents/*.md`) et un test refuse tout fichier suivi qui n'y figure pas, de sorte qu'un ajout se voie au diff |

### PP-314 · Le prompt d'un implémenteur est décrit de trois façons, et trois définitions sont des copies

| | |
|---|---|
| Règle | ce que contient le prompt d'un implémenteur |
| Endroits qui la disent | `CLAUDE.md:22` (« la note de conception du lot, la nature de la tâche et la sortie de `agents:lire`, rien d'autre », puis « donner aussi les fichiers concernés et les critères de fin ») ; `CONTRIBUTING.md:521-524` (le plan d'implémentation reste à l'orchestrateur) ; `implementeur.md:7-9` (« te donne le lot, le plan qui le décrit, les fichiers concernés et les critères ») |
| Divergence prouvée | `CLAUDE.md` se contredit dans le même point. L'agent attend un plan que `CONTRIBUTING.md` retient. `implementeur.md`, `implementeur-exigeant.md` (10 lignes de différence) et `executant.md` (12) comptent 63 à 64 lignes chacun : trois copies des sections « Avant d'écrire », « Pendant », « Avant de rendre » et « Ce que tu rends » |
| Cas | l'orchestrateur suit `CONTRIBUTING.md` et omet le plan ; l'implémenteur, qui l'attend, le demande ou lit le dépôt entier pour le retrouver. Ou l'orchestrateur colle le plan pour le satisfaire, ce que `CONTRIBUTING.md` écarte |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | un seul texte du prompt, dans `CONTRIBUTING.md`, que `CLAUDE.md` et les définitions citent par lien ; `tests/agentsDefinis.test.ts` compare mot à mot les sections communes des trois définitions |

### PP-315 · Le hook de style recopie la liste d'extensions de `controle-style.mjs`

| | |
|---|---|
| Règle | le contrôle juge `.md`, `.ts`, `.tsx`, `.mjs`, `.cjs` et `.html` |
| Endroits qui la disent | `scripts/controle-style.mjs:209` (`EXTENSIONS_CONTROLEES`) et `:701` (`fautesDuFichier` accepte aussi `.js`) ; `scripts/hook-style.mjs:44` (copie littérale) |
| Divergence prouvée | `js-hook.mjs` : `fautesDuFichier('x.js', …)` rend `afin-de`, `EXTENSIONS_CONTROLEES.test('x.js')` rend `false`, `hook-style.mjs` sort 0 sur `x.js` et 2 sur `x.mjs`. Git suit 41 fichiers `.js`, dont `docs/inventaire/page.js` ; aucun n'est jugé |
| Cas | un agent écrit un commentaire à tic dans un `.js`. Ni le hook ni le test ne le voient, alors que la fonction de jugement sait le faire |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | `hook-style.mjs` importe `EXTENSIONS_CONTROLEES` ; une fonction `estJugeable(chemin)` exportée sert au hook, au test et à la CLI ; la décision sur `.js` s'écrit une fois |

### PP-316 · Un manifeste illisible désactive le hook des documents sans bruit

| | |
|---|---|
| Règle | le hook refuse la création d'un `.md` hors registre |
| Endroits qui la disent | `scripts/hook-documents.mjs:45` (`chargerManifeste`, `JSON.parse` sans `try`) ; `.claude/settings.json:9-18` (aucune consigne de repli) ; `tests/registreDesDocuments.test.ts` (échoue sur un manifeste cassé, mais à `npm test`) |
| Divergence prouvée | `run-copie.mjs` : une copie du hook avec un `domiciles.json` tronqué sort 1 (`SyntaxError: Unexpected end of JSON input`) pour `docs/n-importe-quoi.md` comme pour `_local/x.md`. Un code 1 n'est pas bloquant dans Claude Code : l'écriture passe |
| Cas | une virgule en trop dans `domiciles.json`, laissée par une édition manuelle ou par `npm run sujet`. Jusqu'au prochain `npm test`, tout `.md` se crée |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | les trois hooks entourent leur corps d'un `try` qui rend `permissionDecision: "ask"` avec le message d'erreur (`PreToolUse`) ou sort 2 (`PostToolUse`, `Stop`) ; un cas de test avec un manifeste cassé exige cette sortie |

### PP-317 · Des consignes de skills renvoient à ce qui n'existe plus ou ne disent rien

| | |
|---|---|
| Règle | une skill cite des documents, des commandes et des gestes qui existent |
| Endroits qui la disent | `.agents/skills/rediger-diagnostics-ucm/SKILL.md:7-8` (« `CONTRIBUTING.md` de l'exporteur », lien vers le `CONTRIBUTING.md` racine) ; `guide-composant/SKILL.md:82` (« …langue du système.- La prose du JSON… », deux puces collées) ; `regler-le-linter/SKILL.md:10` (« Lancer le juge sur les fixtures », sans commande) ; `archiver-un-sujet/SKILL.md` étape 4 (retire le motif du dossier vide, ne dit pas de supprimer le dossier) |
| Divergence prouvée | `packages/plugin-exporter/CONTRIBUTING.md` n'existe pas ; le lien résout vers la racine, le libellé reste faux. La puce collée est lisible dans le fichier. `dossiersDeRecherche.test.ts` lit les dossiers sur le disque et exige un motif par dossier : lecture du code, non essayé, un dossier vide laissé après l'archivage ferait échouer le test en local |
| Cas | un agent exécute `regler-le-linter`, ne sait pas quelle commande mesure les constats avant et après, et en invente une |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | une règle `puce-collee` de `controle-style.mjs` (`[.!?]- ` en milieu de ligne) ; `archiver-un-sujet` ajoute « supprimer le dossier vide » ; `regler-le-linter` nomme la commande de mesure ; le libellé d'un lien ne se contrôle pas par test, la relecture le garde |

## Questions au mainteneur

- PP-301, `.md` dans `_local/`. Options : (a) le registre accepte `_local/**` pour un `.md`, le test l'ignore déjà par Git, et un test de parité garde le hook et le test d'accord ; (b) le hook continue de refuser, le message dit « une note de travail s'écrit en `.txt` » et `CONTRIBUTING.md` énonce la règle. Recommandation : (a), parce que `_local/` n'entre jamais dans le dépôt et que l'agent contourne déjà le refus.
- PP-302, création par `Bash`. Options : (a) un contrôle de l'état du dépôt à la fin de chaque tour, indépendant de l'outil ; (b) un hook `PreToolUse` sur `Bash` et `PowerShell` qui demande confirmation quand la commande écrit un `.md`. Recommandation : (a), un motif de ligne de commande se contourne, l'état du dépôt non.
- PP-303, domaine de l'outillage. Options : (a) un domaine `outillage-agents` dans `.agents/domiciles.json` ; (b) un `CLAUDE.md` et un `AGENTS.md` sous `scripts/` et `.claude/`. Recommandation : (a), sans nouveau document, donc sans accord de registre.
- PP-304, vérifications par import. Options : (a) un test refuse un domaine qui omet la commande du paquet d'un test qui importe sa source ; (b) une commande génère la clé `verifications`. Recommandation : (a) d'abord, puis (b) si les exceptions dépassent une dizaine.
- PP-305, `verifier-conservation`. Options : (a) le script échoue sur un domaine sans groupe source et compare à la version précédente du fichier ; (b) la skill retire l'étape 7.1. Recommandation : (a), la conservation reste une garde utile pour les compactions à venir.
- PP-306, `test:ui`. Options : (a) un hook refuse la commande sauf fichier `_local/autorise-test-ui` ; (b) la consigne reste écrite et la description du `verificateur` retire `test:ui`. Recommandation : (a) avec (b), parce que la règle est dite six fois et que l'agent qui lance des commandes n'en porte aucune.
- PP-307, exceptions du contrôle de style. Options : (a) vider `EXCLUS_DU_CONTROLE` et `AGENTS_A_CONVERTIR` en corrigeant les trois fichiers ; (b) le hook consulte `estExclu` comme le test. Recommandation : (a), puis un test d'exception morte ; (b) laisserait deux règles pour un même fichier.
- PP-308, découvreurs de tests. Options : (a) les neuf scripts appellent le découvreur du socle avec les deux suffixes ; (b) un test racine vérifie chaque fichier de test suivi. Recommandation : (a) et (b), le premier évite la panne, le second la détecte si un dixième paquet arrive.
- PP-309, modèle des sous-agents. Options : (a) retirer `CLAUDE_CODE_SUBAGENT_MODEL` de `.claude/settings.json` et laisser les définitions fixer le modèle ; (b) le garder et corriger la table de `CLAUDE.md`. Recommandation : (a), après un essai sur ton client. Lancer un `verificateur` et lui demander son modèle. Une réponse Sonnet prouve que la variable prime et que la table est fausse.
- PP-310, règles de réponse. Options : (a) `hook-reponse.mjs` applique tiret cadratin, datation, intensificateur et opposition, et ajoute un motif d'offre de suite ; (b) `AGENTS.md` dit que ces règles ne valent que pour les fichiers. Recommandation : (a), parce que le bloc « Écrire » promet l'inverse.
- PP-311, gras. Options : (a) la skill exempte le titre de puce d'un invariant ; (b) `AGENTS.md` assouplit la règle pour tous les fichiers d'agents. Recommandation : (a), qui garde la règle pour les documents de prose.
- PP-313, ajout au registre. Options : (a) un fichier `documents-fermes.json` et un test, pour que tout ajout sous un motif large se voie au diff ; (b) la règle d'`AGENTS.md` se reformule pour dire que les motifs larges valent accord. Recommandation : (b) si les agents doivent écrire librement dans leurs dossiers (cette zone en est un exemple), sinon (a).
- `parametres.json` (entrées de la zone 3). Options : (a) l'inventaire entre dans le test racine envisagé pour `parametres.json`, avec une entrée au registre ; (b) il reste documentaire. Recommandation : (a), après la correction des écarts importants.
