Formule à respecter pour tous les agents:
"Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better."


# Plan d'implémentation de la recette d'UCM Architect

Ce plan construit le troisième tour des
[maquettes](./Maquettes/MAQUETTE-RECETTE-ARCHITECT.html), décrit dans le
[dossier](./DOSSIER-RECETTE-ARCHITECT.md). Le mainteneur a validé les
décisions D1 à D13 et choisi le nom **UCM Nomenclature**. Une revue a relu le
plan avant son lancement ; la section « Revue du plan » dit ce qu'elle a
changé.

Cocher une case quand son commit est fait, avec le hash entre parenthèses.
Les cases se cochent dans un commit à part, après celui du lot.

## Décisions qui encadrent le plan

| Sujet | Décision |
|---|---|
| Écritures (D1) | Chaque écriture s'affiche par son spécimen, en police de code, dans une pastille grise ; le spécimen vit dans le kit à côté du libellé |
| Ligne d'un terme (D2) | Une ligne par règle : la référence dans une pastille grise, « remplace » et les variantes en gris ; un terme remplacé n'a plus sa ligne ni sa fiche, il se trouve par la recherche et se gère dans la fiche de sa référence ; aucune puce, sauf la pastille ambre « À trancher » d'une règle en attente |
| Tailles (D3) | La question des tailles disparaît ; une carte par taille, avec sa place dans la ligne de détail |
| Renommages (D4) | Deux colonnes Aujourd'hui \| Après l'application, empilées sous 520 px ; seuls les segments que la règle de la carte change sont colorés ; Conventions d'écriture, puis Vocabulaire, puis Collections ; « Afficher les N autres noms » montre tous les noms |
| Questions (D6) | Le tour 2 : la question est la proposition, un nom réel sur deux lignes, un seul bouton bordé, aucun bleu |
| Cartes d'écriture (D7) | « Écrire les groupes en `PascalCase` », le spécimen en pastille grise |
| Règles (D8) | Deux sections titrées, Conventions d'écriture et Vocabulaire, chacune avec sa phrase |
| Fiche (D9) | Identité, règle modifiable dans sa ligne, À renommer, Déjà employé ; ni poignée ni Fermer ; ✕ sur fond ; glissement de 280 ms |
| Langage visuel (D10) | Termes clés en semi-gras ; rouge et vert pour les seules conséquences ; pastille grise pour la forme de référence ; ambre pour ce qui attend une décision ; bleu pour l'action principale |
| Onglets (D11) | **Renommages · Questions · Règles** |
| Nom (D12) | **UCM Nomenclature** |
| Chevron (D13) | Un chevron SVG du socle, qui tourne, dans les quatre plugins |
| Compatibilité | Le renommage garde l'identifiant du manifeste, la constante `ESPACE_ARCHITECT` et sa valeur `ucm_architect` (les règles déjà posées dans les fichiers Figma y vivent), l'`id: 'architect'` du produit dans le kit et la clé `ucm-architect/tailleFenetre` |
| Logo | Architect n'a pas de logo dans `docs/marque/` ; le logo d'UCM Nomenclature est un travail de marque à part, hors de ce plan |
| Chromium | Aucun test Chromium lancé par les agents ; le mainteneur lance lui-même les tests d'interface |

## Règles d'exécution

- Un lot par appel d'agent. Deux agents au plus en même temps, sur des
  fichiers disjoints. Le tableau « Ordre » dit quels lots tournent ensemble.
- Chaque agent lit `.agents/skills/rediger-sans-tics-ia/SKILL.md` avant
  d'écrire un commentaire. Les textes destinés au designer sont fixés dans la
  section « Textes » : l'agent les recopie et n'en invente aucun ; un texte qui
  manque arrête le lot et remonte à la conversation principale.
- Chaque agent reçoit son lot, ses fichiers et ses commandes de fin. Il ne
  touche aucun autre fichier. Un contrat à changer hors de son lot l'arrête.
- La conversation principale relit chaque diff, fait relancer les commandes
  par un `verificateur`, puis commite par chemins explicites sur `main`, après
  avoir comparé les fins de ligne au fichier de `HEAD` (en Python, sur les
  octets).
- **Poussée.** L0, F1 et S1 se poussent après leur commit. À partir de K, le
  kit change sans nouveau numéro et le plugin ne compile plus jusqu'à P1 :
  rien n'est poussé avant K3, qui monte les versions et pousse la série.
  Ensuite, chaque lot se pousse après son commit.
- Un lot du plugin qui suit un changement du kit attend que la conversation
  principale ait lancé `npm run build --workspace @ucm-kit/core`.
- **Lois de style.** Chaque plugin a une loi de styles (`tests/socle.test.ts`
  pour Architect, `tests/stylesUi.test.ts` pour les trois autres) :
  `classesSansRegle`, `reglesMortes`, `couleursHorsDesRoles`,
  `variablesAbsentesDuDecalque`, `ecartsDesMessages`. Une classe ajoutée sans
  règle, une règle laissée sans classe ou une couleur écrite hors de la section
  des rôles fait échouer `npm test`. Un lot qui retire un usage retire sa règle
  CSS dans le même lot (l'ambre `mark` des renommages, `.chevron`, `.puce`…).
- **Tests de l'écran.** Le dépôt n'a pas de DOM de test pour les plugins. La
  logique d'un écran (segments à colorer, ordre des sections, file de
  chargement des pages, choix d'une variante cherchée) va dans un module pur,
  testé comme `ui/listeDesTermes.ts` et `ui/selection.ts`. Le rendu se relit
  dans la galerie, que le mainteneur ouvre.
- Jusqu'à N1, le plugin garde son dossier `packages/plugin-architect/` et son
  paquet `ucm-architect-plugin` ; les commandes ci-dessous les emploient.

Commandes, par paquet :

| Paquet | Commandes |
|---|---|
| Kit | `npm test -w @ucm-kit/core`, `npm run typecheck -w @ucm-kit/core`, `npm run build -w @ucm-kit/core` |
| Socle | `npm test -w ucm-plugin-socle` |
| Plugin | `npm test -w ucm-architect-plugin`, `npm run typecheck -w ucm-architect-plugin`, `npm run build -w ucm-architect-plugin` |
| Autres plugins | `npm test` et `npm run typecheck` de `ucm-explorateur-plugin`, `ucm-palettes-plugin`, `ucm-exporter-plugin` |
| Racine | `npm test`, `npm run typecheck`, `npm run build` |

## Ordre

| Vague | Lots, en parallèle | Attend |
|---|---|---|
| 0 | L0 | — |
| 1 | F1 · S1 | L0 |
| 2 | K | F1 (le build du kit casserait le typage de F1) |
| 3 | P1 · S2 | K (P1), S1 (S2) |
| 4 | K3, puis publication | P1, S2 |
| 5 | P2 | K3 |
| 6 | P3 | P2 (fichiers communs) |
| 7 | P4 | P3 |
| 8 | P5 | P4 |
| 9 | P6 | P5 |
| 10 | P7 | P6 |
| 11 | G1 | P7 |
| 12 | N1 | G1 |
| 13 | V | N1 |

P4 à P7 partagent `ui/styles.css` et `ui/textes.ts` : ils passent l'un après
l'autre.

## Textes

Les textes nouveaux ou changés, tels que `ui/textes.ts` les portera. `n`, `m`
sont des nombres ; les accords au singulier suivent la règle déjà en place
(`nombreDeNoms`).

| Endroit | Texte |
|---|---|
| Onglets | `Renommages`, `Questions`, `Règles` ; noms pour les lecteurs d'écran : `Renommages, n noms`, `Questions, n questions` |
| Intertitres de Renommages | `Conventions d’écriture`, `Vocabulaire`, `Collections` |
| Légende des colonnes | `Aujourd’hui`, `Après l’application` |
| Tête d'une carte d'écriture | `Écrire les groupes en` + spécimen ; `Écrire les noms en` + spécimen |
| Détail d'une carte de terme | `n variables` ; `n variables · m changent aussi d’écriture` quand m > 0 |
| Détail d'une carte de taille | `Dans les noms · n variables` ; `Dans les groupes · n variables` |
| Bouton des autres noms | `Afficher les n autres noms` ; `Afficher l’autre nom` ; pendant le chargement, `Chargement des noms…` |
| Règles, section 1 | Titre `Conventions d’écriture` ; phrase `Comment s’écrivent les groupes, les noms et les collections.` |
| Règles, section 2 | Titre `Vocabulaire` ; phrase `Le terme de référence de chaque notion, et les variantes qu’il remplace.` |
| Ligne de règle | `remplace` ; règle en attente : `ou` et la pastille `À trancher` ; terme UCM écarté : `règle UCM non appliquée dans ce fichier` |
| Recherche d'une variante | `{variante} est remplacé par` + pastille de la référence |
| Question de paire | Titre `Remplacer {a} par {b} ?` ; détail `{indice} · n variables à renommer · {b} déjà dans m` ; boutons `Remplacer` (bordé), `Garder {a}`, `Termes différents`, `Autre terme…` (texte), `Plus tard` (texte, à droite) |
| Question de faute | Titre `Corriger {a} en {b} ?` ; détail `Une lettre d’écart · ` + détail actuel ; boutons `Corriger` (bordé), `C’est voulu` (texte) |
| Question de mots collés | Titre `Séparer {a} en {b} ?` ; détail `Mots collés · ` + détail actuel ; boutons `Séparer` (bordé), `C’est un seul mot` (texte) |
| Fiche | `Règle` ; `Formes fixées par UCM` ; `+ Terme` ; `n variables à renommer · m déjà écrites ainsi` ; `À renommer · n` ; `Voir dans Renommages` ; `Déjà employé · n` ; nom accessible du × d'un jeton : `Retirer {terme}` |
| Pied de la fiche | UCM : `Ne pas appliquer ce terme dans ce fichier` ; personnalisé : `Supprimer la règle` (texte rouge), `Proposer à UCM` (bordé) ; plus de `Fermer` |
| Nom du plugin | `UCM Nomenclature` ; fichier d'export `regles-ucm-nomenclature.json` |
| Message de l'Exporter | `… ou avec UCM Nomenclature` au lieu de `… ou avec UCM Architect` (`plugin-exporter/src/contract/semantics.ts:125`) |

La question de collection, l'en-tête `UCM · rôle` de la fiche et les autres
textes gardent leur rédaction actuelle ; seule leur mise en forme suit le
langage visuel.

## Lots

### L0 · Les tailles par catégorie, reprises de la copie de travail

Agent : `verificateur`, puis la conversation principale.

Une session précédente a laissé non commité le renommage des tailles par
catégorie (décisions T06 et S02) : `termePourCategorie`,
`identifiantParCategorie`, leurs lecteurs, leurs tests, et le passage à
kit 0.9.2, cli 0.1.61, adapter 0.1.54. Le diff de
`Plugin Palettes/Recette v10/PLAN-IMPLEMENTATION-RECETTE-V10.md` n'en fait pas
partie et reste hors du commit.

- [ ] Lancer les commandes du kit, puis les tests et le typage du plugin, puis
  `npm test` à la racine.
- [ ] Commiter, s'ils passent : `packages/kit/src/referentiel/{normalisation,termes,vocabulaire,vocabulaire-du-fichier}.ts`,
  `packages/kit/tests/{lexiqueReferentiel,vocabulaireDuFichier}.test.ts`,
  les `package.json` et `README.md` du kit, du cli et de l'adapter,
  `package-lock.json`, `README.md`, `docs/references/design-systems/ucm/sources.json`,
  `Plugin Architect/4 Nomenclature/PLAN-IMPLEMENTATION.md` ; ce plan aussi.
- [ ] Pousser. La publication attend K3 : 0.9.2 ne sera pas publié, le
  registre passera de 0.9.1 à 0.9.3.

### F1 · La frontière refuse une réponse mal formée (R11)

Agent : `implementeur`. Fichiers : `packages/plugin-architect/src/ui/frontiere.ts`,
`packages/plugin-architect/tests/frontiereUi.test.ts`.

- [ ] Dans `recevoirUneLecture` (`frontiere.ts:125-129`), refuser un message
  `termes` sans liste, `fiche` sans fiche, `lignes` sans lignes, **avant**
  `oublierUneLecture(message.demande)` : l'écho d'une demande ne doit pas
  consommer la lecture en attente.
- [ ] Un test par forme : l'écho (même `demande`, même `generation`, sans
  liste) est ignoré, puis la vraie réponse est affichée.
- [ ] Les autres messages et leur ordre de traitement ne changent pas.

Fin : commandes du plugin.

### S1 · Le chevron et la feuille du socle (D9, D13)

Agent : `implementeur-exigeant`. Fichiers : `packages/plugin-socle/src/ui/`
(nouveau `Chevron.ts`, `Feuille.ts`), `packages/plugin-socle/src/ui/socle.css`,
`packages/plugin-socle/tests/`, `AGENTS.md` (ligne `src/ui/` du socle dans la
carte du code). Modèle : `Maquettes/propose.css`, lignes 393-540 (feuille
`.feuille-voile.v2`, `.sortante`, keyframes) et 698-748 (chevron).

- [ ] `creerChevron()` rend un SVG de 12 × 12, `aria-hidden`, un trait de
  1,5 px en `currentColor` (`M3 4.5 6 7.5 9 4.5`), classe `chevron-svg`. Il
  pointe vers le bas. Il tourne de 180° sous `[aria-expanded="true"]` ou avec
  la classe `ouvert`, de −90° avec `suivant`, de 90° avec `retour`, en 150 ms,
  sans transition sous `prefers-reduced-motion`. `suivant` et `retour`
  l'emportent toujours sur `aria-expanded` : sélecteurs `svg.chevron-svg.suivant`
  et `svg.chevron-svg.retour`, déclarés après.
- [ ] La feuille perd sa poignée ; le ✕ garde son texte et prend un fond
  `--fond-bloc` de 24 × 24 px, `--fond-note` au survol ; le bouton retour
  emploie le chevron `retour` au lieu de `‹`, avec le même nom accessible.
- [ ] Entrée : voile de transparent à `--fond-voile` en 200 ms, feuille
  glissant de toute sa hauteur en 280 ms (`cubic-bezier(0.2, 0.8, 0.2, 1)`).
  Sous `prefers-reduced-motion`, un fondu de 120 ms.
- [ ] Sortie : `fermer()` appelle `onFermer` tout de suite, pose `fermee` et
  retire le piège du focus ; seul le retrait du DOM attend la fin du mouvement
  inverse (200 ms, `ease-in`), avec un minuteur de repli de 220 ms. Le focus
  revient à l'élément qui avait ouvert la feuille.
- [ ] Tests (faux DOM de `tests/feuille.test.ts`) : chevron (classe,
  `aria-hidden`), feuille sans poignée, retrait après le minuteur, retour du
  focus, une feuille ouverte pendant la sortie d'une autre (Architect le fait,
  `aAppliquer.ts:553`, `:587`, `feuilles.ts:619-631`, `:666`) : la nouvelle
  reste seule active.

Fin : commandes du socle, puis `npm test` d'Architect, de l'Explorateur, de
Palettes et de l'Exporter (leurs lois de style lisent `socle.css`).

### K · Le kit : spécimens, fin de la question des tailles, nom du plugin (D1, D3, D12)

Agent : `implementeur`. Fichiers : `packages/kit/src/referentiel/conventions.ts`,
`questions.ts`, `harmonisation.ts`, `produits.ts`, `normalisation.ts`,
`packages/kit/tests/normalisationReferentiel.test.ts`,
`packages/kit/tests/questionsReferentiel.test.ts`.

- [ ] Ajouter `specimen: { fr, en }` à chaque entrée de `CONVENTIONS` :
  `tiret` `minuscules-tirets` / `kebab-case` ; `bas` `minuscules_tirets_bas` /
  `snake_case` ; `espace` `Majuscule initiale` / `Sentence case` ; `camel`
  `camelCase` / `camelCase` ; `pascal` `PascalCase` / `PascalCase` ; `soude`
  `minusculessoudées` / `flatcase` ; `inchange` `inchangée` / `unchanged`.
  Un test dans `normalisationReferentiel.test.ts` : chaque convention a un
  spécimen dans les deux langues. Il n'y a pas de vue générée à refaire.
- [ ] Question des tailles : d'abord écrire le test du cas du dossier
  (`Radius/sm` et `Button/Size/Small/padding-y` dans le même fichier ne
  produisent aucune question) et le voir échouer ; puis retirer la détection
  `echelle` (`questions.ts:309-324`) et sa variante du type `Question`
  (`harmonisation.ts:66`), et les tests qui la fabriquaient.
- [ ] `produits.ts:74` : `libelle` du produit `UCM Nomenclature` en français
  et en anglais ; garder `id: 'architect'` et `ESPACE_ARCHITECT`.
  `normalisation.ts:38` : « comme le moteur d'UCM Nomenclature ». Aucun autre
  changement dans ces deux fichiers.

Fin : commandes du kit, puis `npm test` à la racine, où seul
`versionSuitLeContenu` est toléré rouge. Le typage du plugin casse jusqu'à P1 :
c'est attendu.

### P1 · La question des tailles quitte le plugin (D3)

Agent : `implementeur`. Fichiers : `src/messages.ts` (13, 58, 131),
`src/projection.ts` (330, 367), `src/session.ts` (140, 221, 281),
`src/regles.ts` (182, 386), `src/ui/questions.ts` (11, 113-127, 177, 238-241,
292), `src/ui/textes.ts` (183, 194, 205), `tests/messages.test.ts`,
`tests/projection.test.ts`, `tests/questions.test.ts`, `tests/session.test.ts`,
`tests/regles.test.ts`, `galerie/donnees.cjs` (57-58, 79, 89, 95).

- [ ] Retirer `QuestionVue` `echelle`, `Reponse` `echelle`, son contrôle dans
  `estReponse`, `case 'echelle'` de la projection et de la session,
  `carteDEchelle`, les textes `questionDEchelle`, `indiceDEchelle`,
  `garderCelleCi`, leurs tests et leurs données de galerie. Vérifier qu'aucun
  état de galerie ne se vide (`tests/socle.test.ts` les fait tourner).
- [ ] Une clé `plus-tard:echelle:…` est écartée à la lecture des règles et à
  l'import (`regles.ts`), pour qu'elle ne compte ni dans les mises de côté ni
  dans le plafond des questions (`session.ts:140`, `:281`). Un test compte
  `plusTard` après lecture d'une telle clé.

Fin : commandes du plugin, après le build du kit.

### S2 · Le chevron dans les trois autres plugins (D13)

Agent : `implementeur`. Fichiers : `packages/plugin-explorateur/src/ui/arbre.ts`,
`ui/textes.ts`, `ui/vues/composant.ts`, `tests/interface/interface.test.mjs` ;
`packages/plugin-palettes/src/ui/selecteur.ts`, `ui/styles.css` ;
`packages/plugin-exporter/src/ui/styles.css` ; les tests de ces plugins qui
lisent un glyphe.

| Glyphe | Où | Devient |
|---|---|---|
| `▸` `▾` | Explorateur, `arbre.ts:94`, `textes.ts:385-386`, `vues/composant.ts:322`, `:661-670` | Chevron, `aria-expanded` sur le bouton |
| `▴` | Explorateur, `toutReplier` | Chevron `ouvert` |
| `▾` | Palettes, `selecteur.ts:138` (liste déroulante) | Chevron |
| `content: '›'` qui tourne à l'ouverture | Palettes, `styles.css:2022` (`.palette-chevron`), `:2755` (`.carte-chevron`) ; Exporter, `styles.css:600` | Même dessin en `mask-image` sur `currentColor`, pointe en bas fermé, 180° ouvert ; adapter les règles de rotation existantes |
| `›` séparateur | Explorateur `miette` (`vues/composant.ts:246`), Palettes `connexion.ts:74` | Inchangé |

- [ ] Remplacer chaque glyphe selon le tableau. Toute classe nouvelle a sa
  règle et son usage (`reglesMortes`).
- [ ] Mettre à jour l'attendu de `interface.test.mjs:499`
  (`'▸Couleur18 false'` devient `'Couleur18 false'`) sans le lancer : il tourne
  dans Chromium, le mainteneur le lance.

Fin : commandes des trois autres plugins.

### K3 · Les versions, la publication

Agent : `executant`, puis la conversation principale.

- [ ] Kit 0.9.3, cli 0.1.62, adapter 0.1.55 : `package.json`, épingles de
  `@ucm-kit/core` dans le cli et l'adapter, `package-lock.json`
  (`npm install --package-lock-only`), et chaque version épinglée dans la
  documentation (`README.md` racine et des trois paquets,
  `docs/references/design-systems/ucm/sources.json`).
- [ ] Racine verte (`npm test`, `npm run typecheck`), `versionSuitLeContenu`
  compris ; commit, push de la série.
- [ ] Publier `@ucm-kit/core`, `@ucm-kit/cli`, `@ucm-kit/adapter-typescript`
  dans cet ordre, `gh run watch` entre chaque. Seule la dernière exécution
  finit verte (`pins-servis`) ; chaque paquet se constate par
  `npm view <paquet>@<version> version`.

### P2 · Les lignes avant → après et les comptes (D4, D7, D9, R5)

Agent : `implementeur-exigeant`. Fichiers : `src/messages.ts`,
`src/projection.ts`, `src/session.ts` ; les lecteurs de l'écran, juste assez
pour que le typage passe : `ui/aAppliquer.ts` (121-130, 324),
`ui/aTrancher.ts` (52-61), `ui/questions.ts` (40, 88, 119),
`ui/feuilles.ts` (116-120, 164, 415), `ui/ecriture.ts` (49-57) ; les tests
`projection`, `protocole`, `messages`, `questions`, `selection` ;
`galerie/donnees.cjs` (9-26, 50, 59, 134).

- [ ] `LigneVue` devient `{ id, ancien, nouveau, marques, aussi }` : les deux
  noms complets et les rangs des segments à colorer. Un nom qui ne change pas
  a `nouveau === ancien`. Un test tient qu'un renommage garde le nombre de
  segments.
- [ ] Les marques suivent la règle de la carte : pour un terme, le ou les
  segments où le terme a changé (`colors/Neutral/light/700` →
  `Color/Neutral/Light/700` marque le rang 0 seulement) ; pour une écriture,
  les segments de sa catégorie dont l'écriture change ; pour une collection,
  le rang 0. Pour un nom qui emploie déjà un terme (Déjà employé, exemples des
  questions), le segment du terme.
- [ ] Une question de paire, de faute ou de mots collés porte `effet:
  LigneVue | null` : un nom réel du terme remplacé et ce nom après le oui, le
  terme réécrit dans l'écriture de son segment (`Button/bg/hover` →
  `Button/background/hover`, `Card/Bg/hover` → `Card/Background/hover`).
- [ ] `GroupeVue` d'un terme porte `aussiDEcriture` : le nombre de ses
  renommages qui changent aussi d'écriture.
- [ ] `RegleVue` d'un terme porte `categorie: 'variables' | 'groupes' | null`
  quand sa forme dépend de la place (déduite de `categorieDuSegment`). Un test :
  `Radius/small` et `Button/Size/Sm/padding-y` donnent deux cartes UCM,
  `small → sm` dans les noms et `sm → small` dans les groupes.
- [ ] `FicheVue` porte `aRenommer: { nombre, exemples: LigneVue[] }` : les
  renommages dus à ce terme, trois au plus.
- [ ] L'écran lit les nouveaux champs sans changer de dessin (le dessin vient
  en P4 à P7) ; la galerie fabrique ses lignes à la nouvelle forme.

Fin : commandes du plugin.

### P3 · Une ligne par règle dans la liste des termes (D2)

Agent : `implementeur`. Fichiers : `src/messages.ts`, `src/projection.ts`,
`src/session.ts`, `tests/projection.test.ts`, `tests/protocole.test.ts`,
`galerie/donnees.cjs`.

- [ ] `listeDesTermes` ne garde plus un terme remplacé (statut `regle` avec
  `avec`) ; la référence le porte dans `remplace`.
- [ ] La recherche trouve une référence par son mot ou par l'une de ses
  variantes ; la ligne porte alors `trouve: string | null`, la variante
  cherchée. Chercher `colors` rend la ligne `color` avec `trouve: 'colors'`.
- [ ] Les comptes des filtres suivent la nouvelle liste. Un test par point.

Fin : commandes du plugin.

### P4 · Renommages : le langage visuel et les deux colonnes (D4, D7, D10, D13)

Agent : `implementeur-exigeant`. Fichiers : `src/ui/aAppliquer.ts`, un module
pur nouveau pour la logique de la ligne et de la file de chargement (par
exemple `src/ui/lignes.ts`) et son test, `src/ui/styles.css`,
`src/ui/textes.ts`. Modèle : cadres `appliquer-t3` et `appliquer-t3-360` de la
maquette, bloc « Tour 3 » de `propose.css`.

- [ ] Les règles communes dans `styles.css` : `.jeton` (retiré, retenu,
  neutre, variante, petit), `.seg-ancien` (rouge, barré, 600),
  `.seg-nouveau` (vert, 600), `.mot-cite` et `.variante` (600). L'ambre
  (`mark`) quitte les renommages ; sa règle part si plus rien ne l'emploie.
- [ ] Une ligne dépliée : case, nom actuel, nom après ; légende
  `Aujourd’hui | Après l’application` ; sous 520 px de fenêtre, l'après sous
  l'avant précédé de `→`, sans légende. Seuls les segments de `marques` sont
  colorés.
- [ ] Têtes : terme et collection en jetons rouge → vert ; écriture
  `Écrire les groupes en` + spécimen en pastille grise. Détail selon la
  section « Textes ».
- [ ] Ordre des sections : Conventions d'écriture, Vocabulaire, Collections.
- [ ] `Afficher les n autres noms` demande les pages l'une après l'autre
  jusqu'au total, sans nouveau clic, et s'arrête si la génération change ; le
  bouton laisse place à `Chargement des noms…`, puis disparaît.
- [ ] Le chevron du socle dans la tête de chaque carte, avec `aria-expanded`.
- [ ] Tests du module pur : segments marqués, ordre des sections, file de
  chargement (arrêt au total et au changement de génération).

Fin : commandes du plugin, `npm run galerie -w ucm-architect-plugin`.

### P5 · Questions : les cartes du tour 2 (D6)

Agent : `implementeur-exigeant`. Fichiers : `src/ui/questions.ts`,
`src/ui/aTrancher.ts`, `src/ui/styles.css`, `src/ui/textes.ts`,
`tests/questions.test.ts`. Modèle : cadre `trancher-t2` de la maquette
(fonction `questionT2`).

- [ ] Titre = la proposition, seule ligne en 600 ; détail gris dessous ;
  `effet` sur deux lignes dans un bloc `--fond-bloc` ; un bouton bordé, les
  autres réponses en texte, `Plus tard` à droite ; aucun bleu ; une pastille
  UCM après le titre quand le terme gardé est UCM.
- [ ] La question de collection garde son contenu, avec le même dessin de
  pied.
- [ ] La section repliée « Plus tard » prend le chevron du socle.
- [ ] Les règles CSS du face à face et du bouton bleu partent avec leur usage.

Fin : commandes du plugin, galerie.

### P6 · Règles : deux sections et une ligne par règle (D1, D2, D8)

Agent : `implementeur`. Fichiers : `src/ui/regles.ts`,
`src/ui/listeDesTermes.ts`, `src/ui/ecriture.ts`,
`src/ui/premierLancement.ts`, `src/ui/styles.css`, `src/ui/textes.ts`,
`tests/listeDesTermes.test.ts`. Modèle : cadres `regles-t3` et
`regles-t3-recherche`.

- [ ] Deux sections titrées (titre 15 px, phrase grise, filet entre elles) ;
  Modifier à droite du titre de la première.
- [ ] Chaque écriture par son spécimen en pastille grise, avec l'exemple
  réel à droite, la partie concernée en clair et en 600. Le spécimen remplace
  le libellé dans la feuille de l'écriture et au premier lancement ; le
  libellé reste le nom accessible.
- [ ] Ligne d'un terme : référence en pastille grise, `remplace`, variantes
  en gris séparées par des virgules ; règle en attente : terme, `ou`, terme,
  pastille `À trancher` à la place de l'origine ; terme écarté : texte gris ;
  terme sans règle : le mot seul. Plus de puce. Chevron `suivant` à droite.
- [ ] Recherche d'une variante (`trouve`) : la variante passe en blanc dans la
  ligne, et la phrase `{variante} est remplacé par` + pastille sous la
  recherche.
- [ ] Les filtres et la recherche restent à leur place.

Fin : commandes du plugin, galerie.

### P7 · La fiche d'un terme (D9)

Agent : `implementeur-exigeant`. Fichiers : `src/ui/feuilles.ts`,
`src/ui/etat.ts` (nouvel événement « ouvrir une carte »), `src/ui/aAppliquer.ts`
(ouvrir et déplier une carte par sa clé), `src/ui/index.ts` si le câblage y
passe, `src/ui/styles.css`, `src/ui/textes.ts`, `tests/feuilles.test.ts`,
`tests/etat.test.ts`. Modèle : cadres `fiche-t3-ucm` et `fiche-t3-perso`
(fonction `ficheT3`).

- [ ] En-tête : le terme en police de code, l'origine à côté (`UCM · rôle`,
  `Personnalisé`), le ✕ du socle.
- [ ] Bloc gris `Règle` : référence en pastille grise, `remplace`, chaque
  terme remplacé en jeton bordé avec son nombre et un × (sauf une forme UCM),
  `+ Terme` ; `Formes fixées par UCM` quand toutes le sont ; la ligne des
  nombres.
- [ ] `À renommer · n` : deux colonnes et leur légende, segments colorés
  (`aRenommer`), et `Voir dans Renommages`, qui ouvre l'onglet et déplie la
  carte du terme ; si la carte n'est pas dans le bilan, l'onglet s'ouvre
  seulement.
- [ ] `Déjà employé · n` : le terme en blanc et en 600, sans couleur.
- [ ] Pied selon la section « Textes » ; plus de Fermer. La feuille de
  l'écriture garde Annuler, la confirmation garde Retour.
- [ ] Un terme sans règle : la preuve, puis Remplacer par… et Remplace
  d'autres termes… en pied. Un terme en attente : sa question, comme
  aujourd'hui. Un terme remplacé n'a plus de fiche (P3) : le code qui la
  dessinait part, avec ses règles CSS.

Fin : commandes du plugin, galerie.

### G1 · Les onglets et la galerie (D11)

Agent : `implementeur`. Fichiers : `src/ui/textes.ts`, `src/ui/coquille.ts`,
`src/ui/premierLancement.ts`, `tests/`, `galerie/etats.cjs`,
`galerie/donnees.cjs`.

- [ ] Onglets `Renommages`, `Questions`, `Règles`, et leurs noms pour les
  lecteurs d'écran. Chaque texte qui cite l'onglet par son ancien nom prend le
  nouveau. La pastille `À trancher` d'une règle en attente ne change pas.
- [ ] États de galerie : Renommages déplié, Règles avec une recherche de
  variante, fiche UCM et personnalisée, questions. Chaque état est déjà rendu
  à 640 × 720 et à 360 × 420 (`galerie/build-galerie.cjs`). Les états de
  Règles atteignent `data-galerie="pret"` (F1).

Fin : commandes du plugin, `npm run galerie -w ucm-architect-plugin`.

### N1 · UCM Nomenclature (D12)

Agent : `implementeur`.

- [ ] `git mv packages/plugin-architect packages/plugin-nomenclature`, puis
  vérifier qu'aucun dossier `packages/plugin-architect/` ne reste (`dist`,
  `node_modules` ignorés) : `tests/monorepoCoherent.test.mjs` lit tout
  sous-dossier de `packages/`. Paquet `ucm-nomenclature-plugin` ; script
  `build` de la racine ; `npm install --package-lock-only`, et le diff du
  lock se limite aux entrées renommées.
- [ ] `manifest.json` : `"name": "UCM Nomenclature"`, même `id`.
- [ ] Le nom dans le plugin : `ui/index.html:6`, `scripts/run-tests.cjs:4`,
  `ui/textes.ts` (19, 25, 71, 86), commentaires de `galerie/etats.cjs:2`,
  `ui/styles.css:2`, `ui/index.ts:1`, `ui/coquille.ts:2` ; le fichier
  d'export `regles-ucm-nomenclature.json` et l'état de galerie qui l'importe
  (`galerie/etats.cjs:105`).
- [ ] Garder `ESPACE_ARCHITECT`, sa valeur et la clé
  `ucm-architect/tailleFenetre` (`src/fenetre.ts:3`), avec un commentaire qui
  dit pourquoi.
- [ ] Tests de la racine : `tests/pluginsSepares.test.ts:22`,
  `tests/inventaireInvariants.test.ts:43` (le titre de domaine suit la section
  d'`AGENTS.md`).
- [ ] L'Exporter : `plugin-exporter/src/contract/semantics.ts:125` et les
  attendus de `plugin-exporter/tests/semantics.test.ts` (37, 38, 64, 65).
- [ ] Documentation : `AGENTS.md` (ligne 371 de la carte du code, section
  `### UCM Architect` et son corps), `README.md` (14, 21, 143 : le chemin du
  manifeste à importer dans Figma), `CONCEPT.md:87`. Les liens relatifs des
  notes vers `packages/plugin-architect/` prennent la nouvelle cible, texte
  inchangé : `Plugin Architect/README.md:8`,
  `Plugin Architect/OPTIMISATION-LECTURE-ET-AFFICHAGE.md` (8, 60, 61, 193),
  `4 Nomenclature/REVUE-CRITIQUE-PLAN-IMPLEMENTATION.md:82`,
  `5 Recette/DOSSIER-RECETTE-ARCHITECT.md` (172, 210, 214, 543),
  `5 Recette/Mesures/extraire-galerie.mjs` (4, 11). Les notes gardent leur
  nom ; `Plugin Architect/README.md` dit le nouveau nom en tête.
- [ ] `git grep -n "ucm-architect-plugin\|packages/plugin-architect\|UCM Architect"`
  ne rend plus que des notes historiques et les clés gardées.

Fin : commandes de la racine (`tests/docLinks.test.ts` compris).

### V · Vérification et recette

Agent : `verificateur`, puis la conversation principale, puis le mainteneur.

- [ ] Racine : `npm test`, `npm run typecheck`, `npm run build` ;
  `npm run build -w ucm-nomenclature-plugin` pour que `dist/` soit à jour
  avant Figma ; `npm run galerie -w ucm-nomenclature-plugin`.
- [ ] Le dossier et son README disent la recette faite ; la mémoire du projet
  suit ; les cases de ce plan portent leur hash.
- [ ] Note de recette au mainteneur : réimporter le plugin depuis
  `packages/plugin-nomenclature/dist/manifest.json` (même `id`, les règles
  des fichiers sont gardées) ; s'il a répondu à l'ancienne question des
  tailles, supprimer dans Règles les termes personnalisés `sm`, `md`, `lg` ou
  `small`, `medium`, `large` qu'elle a créés ; lancer les tests d'interface de
  l'Explorateur (attendu changé en S2).
- [ ] Recette Figma par le mainteneur.

## Revue du plan

Une revue a relu le premier jet sur le code. Ce qu'elle a changé :

- **Ordre.** Retirer la question des tailles du kit casse le typage du plugin
  jusqu'à P1, et la CI lance le typage par `npm run build`. K1 et K2 sont
  fusionnés en K ; F1 passe avant K pour ne pas subir son build ; P1 passe
  avant K3, qui pousse la série. La publication de 0.9.2 à L0 disparaît : une
  seule publication, en 0.9.3.
- **Lecteurs oubliés.** P2 ajoute `ui/aTrancher.ts`, les tests `questions` et
  `selection`, `galerie/donnees.cjs`, et retire `ui/regles.ts`, qui ne lit pas
  `LigneVue`. P1 ajoute `src/regles.ts` et son test : une clé
  `plus-tard:echelle:…` doit être écartée à la lecture, sinon elle gonfle les
  mises de côté et le plafond des questions.
- **Renommage.** N1 liste ce qui aurait cassé `npm test` : `pluginsSepares`,
  `inventaireInvariants`, les liens relatifs des notes (`docLinks`), le
  dossier resté sur le disque, le message de l'Exporter et ses tests. Il
  retire les fichiers qui ne nomment pas le plugin et la montée du cli, sans
  objet. Le chemin du manifeste change : le mainteneur réimporte le plugin.
- **Kit.** K nomme `produits.ts:74` (le libellé publié du produit) et
  `normalisation.ts:38`, et le test de `CONVENTIONS`
  (`normalisationReferentiel.test.ts`) ; il écrit d'abord le test des tailles
  qui échoue.
- **Tests de l'écran.** Le dépôt n'a pas de DOM de test : la logique va dans
  des modules purs, le rendu se relit dans la galerie. Les lois de style des
  quatre plugins sont rappelées, et chaque lot retire les règles CSS dont il
  retire l'usage.
- **Socle.** S1 lance aussi les tests des quatre plugins, précise la sortie
  animée (`onFermer` tout de suite, retrait différé avec minuteur, deux
  feuilles qui se suivent) et la priorité de `suivant` sur `aria-expanded`.
- **Autres plugins.** S2 reçoit le tableau des glyphes : les séparateurs
  `miette` et `connexion.ts:74` restent, l'attendu Chromium de l'Explorateur
  change sans être lancé.
- **Fiche.** P7 ajoute `etat.ts`, `aAppliquer.ts` et `tests/etat.test.ts` pour
  « Voir dans Renommages » ; un terme remplacé n'a plus de fiche.
- **F1.** La garde passe avant `oublierUneLecture`, sinon l'écho consomme la
  lecture attendue.
- **Textes.** « Dans les groupes » plutôt que « Dans les dossiers » : le mot
  du reste de l'écran (« Écrire les groupes en… », Règles).
