# Plan d'implémentation du moteur retenu

**Statut : implémenté et poussé ; reste la recette dans Figma.** Les règles
et les décisions sont dans [STRESS-TEST.md](./STRESS-TEST.md), qui fait foi.

## 1. Objet et lecteur

Ce plan est donné à l'orchestrateur, la conversation principale : il distribue
chaque lot à un sous-agent, relit le diff, fait lancer les vérifications et
commite. Un agent ne lit que le bloc de son lot et ce que le bloc nomme.

Les chemins sont relatifs à la racine du dépôt. `R/` désigne
`docs/notes/Recherches/Plugin Palettes/Recette moteur palettes/`, `COU/`
`packages/couleur/`, `PAL/` `packages/plugin-palettes/`, et `SPEC-PAL` la
spécification de Palettes,
`docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`.

**La référence du calcul est le banc de recherche**, `R/Mesures/mesurer-troisieme-passe.ts` :
`construire` avec la variante du moteur retenu, `RETENU` dans
`R/Mesures/stresser-moteur.ts`. L'oracle `R/Mesures/ORACLE-PORTAGE.json` range
ses octets sur les 7 237 situations du test de charge, et
`ORACLE=verifier npx tsx stresser-moteur.ts`, lancé dans `R/Mesures/`, compare
le paquet à cet oracle. C'est le critère de fin du moteur : zéro écart
inattendu, zéro porteur différent.

## 2. Qui fait quoi, et l'économie de tokens

| Rôle | Agent | Ce qu'il reçoit |
|---|---|---|
| Orchestrateur | conversation principale | Ce plan. Il distribue, relit les diffs, tranche, commite |
| Lot dans un seul domaine, critères vérifiables | `implementeur` (Sonnet) | Le bloc du lot et la section 5 |
| Lot qui touche plusieurs lecteurs d'une même règle | `implementeur-exigeant` (Sonnet, effort haut) | Idem |
| Tests, typecheck, build, `test:ui`, oracle | `verificateur` (Haiku) | La liste des commandes ; il rend un tableau |

1. **Le bloc suffit.** Le message à l'agent recopie le bloc du lot et la
   section 5, rien d'autre.
2. **Un lot à la fois.** Les lots 1 à 5 touchent les mêmes fichiers du
   moteur ; seuls les lots 6 et 7 peuvent tourner ensemble.
3. **Vérifier au plus près.** Après chaque lot, le `verificateur` lance la
   ligne « Vérifier » du bloc ; la suite complète tourne au lot 9.
4. **Relire le diff.** L'orchestrateur lit `git diff --stat`, puis le diff des
   fichiers du bloc. Un fichier modifié hors du bloc est refusé, sauf raison
   écrite par l'agent.
5. **Corriger soi-même ce qui est petit**, moins de dix lignes.
6. **Une question rend la main.** Un agent qui rencontre un choix non écrit
   s'arrête et rend la question.

## 3. La todolist

Chaque case dit l'agent qui la fait. Le détail de chaque lot est dans la
section 4.

### Préparation · orchestrateur

- [x] Consigner les décisions dans [STRESS-TEST.md](./STRESS-TEST.md)
- [x] Ranger l'oracle `R/Mesures/ORACLE-PORTAGE.json` et son comparateur (`ORACLE=verifier`)
- [x] Écrire ce plan
- [x] Vérifier que la suite du moteur est verte au départ (333 tests)

### Lot 1 · Format 12 et profils · `implementeur`

- [x] `FORMAT_RECETTE` 12, `cyans` dans l'enveloppe, `clairs` par profil, bornes validées
- [x] `PROFILS_PAR_DEFAUT` : Soft Dark `b` 0,15, Soft `clairs` 0,7, Vivid Light `cyans` −0,2
- [x] Conversion des recettes 11 à la lecture
- [x] Tests de la recette ; commit e45ce83

### Lot 2 · Enveloppe, tons clairs, clarté de l'enveloppe · `implementeur`

- [x] `cranVise` lit `cyans` et `Lenveloppe`
- [x] `fabriquerRampe` applique `clairs` aux tons clairs du Light
- [x] Tests de l'enveloppe ; commit 0870571

### Lot 3 · Porteur et alerte · `implementeur`

- [x] `profilAutomatique` rend toujours Vivid
- [x] L'alerte et le repère ≈ jugent les fonds Light 200 et 300 et Dark 300 à 500
- [x] Tests du porteur et de l'alerte ; commit ea13779

### Lots 4 et 5 · Clarté selon la teinte, bosse gardée · `implementeur-exigeant`

- [x] Clarté selon la teinte calculée à la lecture, ajoutée au Color shift, chroma gardée
- [x] Garde de la clarté : ordre des nuances et promesses
- [x] Bosse de chroma autour de la référence, ouverte aux fonds quand Vivid porte, gardée
- [x] Jugement des promesses sans cycle d'import, cache par recette et par palette
- [x] Oracle : 7 046 situations identiques à l'octet, 0 écart inattendu, 0 porteur différent ; commit d223d51

### Lot 6 · Reprise d'un fichier · `implementeur-exigeant`

- [x] `rampeFlottante` suit `clairs`, `cyans`, la clarté selon la teinte et l'enveloppe gardée
- [x] La luminosité rangée par la reprise est celle du designer, sans le décalage du préréglage
- [x] Les tests de reprise passent ; une reprise dont la liste est celle de la recette rend une palette commune ; commit da0b4b8

### Lot 7 · Plugin Palettes · orchestrateur et `verificateur`

- [x] Tests à valeurs figées du plugin mis à jour par les lots 1 à 5
- [x] Texte de l'alerte : « fonds teintés » au lieu de « nuances » ; commit 07c4031
- [x] `test:ui` de Palettes : 309 sur 309, la butée d'une réglette redessine la plage sûre ; commit e6ab36c

### Lot 8 · Spécification et AGENTS.md · `implementeur`

- [x] SPEC-PAL : `[MOT-35]`, `[ENT-11]`, `[VER-11]`, `[PLA-15]`, `[REC-14]`, `[MOT-38]`, `[MOT-39]`
- [x] AGENTS.md, groupe « Moteur de couleur »
- [x] `R/README.md` dit ce qui est implémenté ; commit 07c4031, lancé en parallèle du lot 6

### Lot 9 · Fin · orchestrateur et `verificateur`

- [x] `npm test` (2 777), `npm run typecheck`, `npm run build`, `test:ui`, oracle (0 écart inattendu)
- [x] Commit des derniers lots et du dossier de recherche, push sur `main`

## 4. Les lots

### Lot 1 · Format 12 et profils

**Agent** `implementeur`. **Invariants** AGENTS.md, « Moteur de couleur »,
entrées sur la recette au format 11 et sur l'enveloppe.

1. `FORMAT_RECETTE` passe à 12.
2. L'enveloppe d'un thème gagne `cyans` : l'amplitude d'une seconde bosse de
   la marge, centrée à 195°, d'écart type 30°. Le type `Enveloppe`
   (`COU/src/rampe.ts`) et l'enveloppe par thème de la recette la portent. La
   règle `enveloppe` la refuse hors de `[−1 ; 1]`. Ce lot ne change pas
   encore le calcul (lot 2).
3. Chaque profil gagne `clairs` : le facteur de chroma des tons clairs du
   thème Light, dans `]0 ; 1]`, refusé hors de cet intervalle par la règle
   `enveloppe`.
4. `PROFILS_PAR_DEFAUT` :
   - Soft : `part` 0,85, `clairs` 0,7, `p0` 0,85,
     Light `{ a 0,6, b 0,38, jaunes 1, cyans 0 }`,
     Dark `{ a 1,1, b 0,15, jaunes 0, cyans 0 }` ;
   - Vivid : `part` 0,95, `clairs` 1, `p0` 0,95,
     Light `{ a 1,1, b 0,48, jaunes 0,5, cyans −0,2 }`,
     Dark `{ a 1,1, b 0,3, jaunes 0, cyans 0 }`.
5. `classerRecette` lit le format 11 en format 12, une étape de plus, et la
   classe `courante`. La recette est convertie (décision 3) : une enveloppe
   égale à celle du format 11 par défaut (les valeurs d'aujourd'hui) prend
   l'enveloppe et le `clairs` du format 12 par défaut. Une enveloppe qui en
   diffère garde ses valeurs et reçoit `cyans` 0 et `clairs` 1. Les parts ne
   changent pas. Une recette 11 qui porte déjà `cyans` ou `clairs` est refusée
   par la règle `forme`.
6. `copierLesProfils` copie les nouveaux champs.
7. Tests (`COU/tests/recette.test.ts`) : lecture d'une recette 11 par défaut
   (nouvelles valeurs), d'une recette 11 à l'enveloppe modifiée (valeurs
   gardées, champs neutres), refus des bornes, refus d'un format 11 qui porte
   un champ du format 12, aller-retour du format 12.

**Vérifier** `npm test --workspace ucm-couleur`, `npm run typecheck`.
**Fin** : la suite du paquet est verte ; les tests à valeurs figées que la
borne Dark de Soft change sont mis à jour, chaque nouvelle valeur justifiée
par la borne 0,15.

### Lot 2 · Enveloppe, tons clairs, clarté de l'enveloppe

**Agent** `implementeur`. **Invariants** « Moteur de couleur », entrée sur
l'enveloppe. **Référence** `vise` et la boucle `parMode` de `construire`,
`R/Mesures/mesurer-troisieme-passe.ts`.

1. `cranVise` : `marge(H) = 1 + jaunes × g(H, 100°, 12°) + cyans × g(H, 195°, 30°)`,
   `g` la cloche de Gauss sur l'écart angulaire. Un paramètre facultatif
   `Lenveloppe` (absent : `L`) : le plafond de l'écran se lit à `L`, la borne
   de l'enveloppe à `Lenveloppe`.
2. `ParametresRampe` gagne `clairs` (absent : 1) et `decalageDeClarteGarde`
   (absent : 0, rempli au lot 4). `fabriquerRampe`, pour chaque cran de
   clarté de courbe `Lc` :
   - la clarté fabriquée ne change pas (`clarteDuCran`) ;
   - `Lenveloppe` vaut la clarté fabriquée moins `decalageDeClarteGarde × poids`
     quand le bout est `clair`, la clarté fabriquée sinon ;
   - après l'enveloppe, la chroma est multipliée par
     `1 − (1 − clairs) × t`, avec `t = 1 − lisse((0,88 − Lc) ÷ 0,10)` et
     `lisse(x) = x² (3 − 2x)` sur `x` borné à `[0 ; 1]` : effet entier
     au-dessus de 0,88, nul sous 0,78.
3. `parametresDesRampes` (`COU/src/palette.ts`) passe `clairs` du profil
   (Soft lit `soft`, Vivid et l'unique `vivid`) en thème Light seulement, 1 en
   Dark ; `enveloppeDe` rend `cyans`.
4. `fabriquerCran`, la garantie des courbes et l'ajustement lisent `cranVise` :
   ils voient `cyans` sans autre changement. Ils ne lisent pas `clairs`.
5. Tests (`COU/tests/enveloppe.test.ts`) : la marge à 195° vaut `1 + cyans`
   (à `jaunes` près), `clairs` n'agit pas sous 0,78 et agit en entier
   au-dessus de 0,88, `Lenveloppe` absent rend les octets d'aujourd'hui.

**Vérifier** `npm test --workspace ucm-couleur`, `npm run typecheck`.

### Lot 3 · Porteur et alerte

**Agent** `implementeur`. **Invariants** « Moteur de couleur », entrées sur
le profil porteur et sur les fonds du thème Dark.

1. `profilAutomatique` rend toujours `vivid` (décision du mainteneur, démo
   `R/Maquettes/DEMO-PORTEUR.html`). Sa documentation dit pourquoi : plus la
   couleur est saturée, plus ses palettes le sont, sans bascule. Une palette
   de base, `reglages.porteur` et une palette figée passent toujours avant.
   `partsDesProfils` ne change pas.
2. `profilsConfondus` (`COU/src/alertes.ts`) juge les seules nuances des fonds :
   en Light, celles de `surface/hover` et `surface/pressed` ; en Dark, celles
   de `surface/default`, `surface/hover` et `surface/pressed`, lues dans la
   table du sens de chaque thème (`TABLE_DES_DOSSIERS`, `sensDuTheme`). Elle
   signale une palette dont au moins trois de ces nuances se confondent.
   L'exemption des fonds Dark atténués disparaît, celle des profils ternes
   reste.
3. `confusionsDe`, le repère ≈, suit la même liste de nuances.
4. Tests : `base.test.ts` et `desaturees.test.ts` suivent le porteur ;
   l'alerte et `confusionsDe` ont un test par thème, un cas signalé, un cas
   tenu (le pleins et les textes confondus ne déclenchent rien), et le cas
   d'une palette terne.

**Vérifier** `npm test --workspace ucm-couleur`, `npm run typecheck`.

### Lot 4 · Clarté selon la teinte, gardée

**Agent** `implementeur-exigeant`. **Invariants** « Moteur de couleur »,
entrées sur la pureté, l'ancrage, le Color shift et la limite dynamique.
**Référence** `clarteSelonLaTeinte`, `avecClarteSelonLaTeinte`,
`teinteALaClarte` et la garde `clarteGarde` de `construire`, dans
`R/Mesures/mesurer-troisieme-passe.ts`.

1. `clarteSelonLaTeinte(recette, palette)` dans `COU/src/tailwind.ts` : le
   décalage du bout clair lu sur le relevé `derives` de la recette, comme dans
   le banc (écart de clarté du cran 100 à la médiane des rampes, interpolé
   entre les deux rampes voisines de la teinte du départ, divisé par le poids,
   borné à ±0,03, rangé au millième). Nul pour une référence grise ou sans
   teinte, et quand la liste n'a pas de cran 100. Le bout sombre vaut 0.
2. Le décalage ne se range jamais : il se calcule à la lecture, comme les
   parts. Il s'**ajoute** à la luminosité du Color shift des deux profils
   (`derive.clarte.clair`), qu'elle soit rangée ou non. Le banc le remplaçait
   quand une luminosité était rangée : l'oracle compte ces cas comme écarts
   attendus. Une palette figée ou libre n'en a pas.
3. La chroma reste gardée : `parametresDesRampes` passe ce décalage dans
   `decalageDeClarteGarde` (lot 2), l'enveloppe se lit sans lui.
4. La garde : la fraction `t ∈ [0 ; 1]` du décalage la plus grande qui garde
   l'ordre des nuances (`ordreTenu`) et ne fait manquer aucune promesse tenue
   sans le décalage (`t = 0`), cherchée par douze dichotomies quand `t = 1`
   échoue, comme dans le banc. Le décalage appliqué vaut
   `arrondir(décalage × t, 3)`. Les promesses se jugent sur la chaîne entière,
   bosse du lot 5 comprise.
5. `rampesDe` et `clartesDe` lisent la même fraction gardée. Aucun cycle
   d'import : le jugement des promesses sur des rampes données sort de
   `promesses.ts` dans une fonction qui ne lit pas `rampesDe` ;
   `verifierPromesses` l'appelle avec `rampesDe`.
6. Un cache par recette et par palette (`WeakMap`, objets immuables) rend le
   même résultat sans recalcul ; la loi de pureté le tient.
7. Tests : le décalage du jaune, de l'indigo et d'un gris ; la luminosité
   rangée s'ajoute ; la garde réduit le décalage d'une référence verte foncée
   (le banc en trouve parmi les références du balayage dont la promesse G1
   inversée tombe de 4,55 à 4,48) ; `clartesDe` et `rampesDe` concordent ;
   l'ancrage garde ses octets.

**Vérifier** `npm test --workspace ucm-couleur`, `npm run typecheck`.

### Lot 5 · Bosse gardée

**Agent** `implementeur-exigeant`. **Invariants** « Moteur de couleur »,
entrée sur l'ancrage. **Référence** le bloc `if (v.bosse)` de `construire`,
avec `horsFonds: 'saufReference'`.

1. Dans l'intensité porteuse, mode par mode, avant d'ancrer la référence :
   `rho = C(référence) ÷ C0(cran de l'ancrage)`, où `C0` est la chroma visée
   avant la bosse. Rien quand `rho ≤ 1`.
2. Pour chaque autre cran : `w = (1 − fond) × exp(−½ ((L − Lréf) ÷ 0,10)²)`,
   `L` la clarté fabriquée, `Lréf` celle de la référence ;
   `C = max(C0, min(part × plafond(L, H), C(référence), C0 × (1 + (rho − 1) × w)))`.
3. `fond = zone(Lc) × (1 − ouverte)`, `Lc` la clarté de courbe : en Light,
   `zone = 1 − lisse((0,88 − Lc) ÷ 0,10)` ; en Dark,
   `zone = 1 − lisse((Lc − 0,5) ÷ 0,06)`. `ouverte` vaut `zone` au cran de
   l'ancrage quand le porteur est Vivid ou l'intensité unique, 0 quand c'est
   Soft.
4. La garde : la chroma vaut `C0 + (C − C0) × force` ; `force = 1` si aucune
   promesse tenue sans la bosse ne manque, dans ce mode et cette intensité,
   sinon la plus grande force qui le garde, par quatorze dichotomies.
5. Mesurer le temps de `rampesDe` sur les palettes de la galerie et le
   rendre : le banc mesure environ 3,5 ms par palette sans cache.

**Vérifier** `npm test --workspace ucm-couleur`, `npm run typecheck`, puis
l'oracle : dans `R/Mesures/`, `ORACLE=verifier npx tsx stresser-moteur.ts`.
**Fin** : zéro écart inattendu, zéro porteur différent. Un écart restant se
rend avec sa situation ; l'orchestrateur tranche.

### Lot 6 · Reprise d'un fichier

**Agent** `implementeur-exigeant`. **Invariants** « Moteur de couleur »,
exception bornée de `reconstruction.ts`.

1. `rampeFlottante` (`COU/src/reconstruction.ts`) reproduit le calcul du
   moteur hors de la bosse : `clairs`, `cyans` (par `enveloppeDe`), la clarté
   selon la teinte ajoutée au bout clair et lue hors de l'enveloppe. La
   luminosité estimée qu'elle range est celle du designer : le décalage du
   préréglage se retire avant de ranger `derive.clarte`.
2. Le porteur des palettes reprises suit `profilAutomatique`.
3. Les tests de reconstruction passent sans élargir leurs tolérances ; un cas
   qui échoue se rend avec son écart.

**Vérifier** `npm test --workspace ucm-couleur`.

### Lot 7 · Plugin Palettes

**Agent** `implementeur`. **Invariants** « Interface d'UCM Palettes ».
Peut tourner avec le lot 6.

1. Mettre à jour les tests à valeurs figées de `PAL/tests/` que les nouvelles
   règles changent ; chaque valeur changée suit une règle nommée dans le
   commentaire du commit, pas dans le test.
2. Le texte de l'alerte « profils confondus » (`PAL/src/i18n/fr.ts` et `en.ts`)
   dit « fonds » au lieu de « nuances » ; même clé, même forme.
3. Le texte « Auto a choisi… » reste : il nomme Vivid.

**Vérifier** `npm run build --workspace @ucm-kit/core`,
`npm test --workspace ucm-palettes-plugin`,
`npm run test:ui --workspace ucm-palettes-plugin`.

### Lot 8 · Spécification et AGENTS.md

**Agent** `implementeur`. Lire `.agents/skills/rediger-sans-tics-ia/SKILL.md`.

1. SPEC-PAL : `[MOT-35]` (cyans, tons clairs), `[ENT-11]` (Vivid porte
   toujours), `[VER-11]` et `[PLA-15]` (les fonds), un `[REC-14]` pour le
   format 12 et sa conversion, un `[MOT-38]` pour la clarté selon la teinte,
   un `[MOT-39]` pour la bosse gardée. Les tests du lot qui les vérifie
   prennent l'identifiant dans leur nom.
2. AGENTS.md, groupe « Moteur de couleur » : les mêmes règles, leur autorité
   et le test qui les tient.
3. `R/README.md` : la section « Suite » dit ce qui est implémenté.

**Vérifier** `npm test` (dont `tests/inventaireInvariants.test.ts`), le
contrôle de style.

### Lot 9 · Suite complète, commit, push

Le `verificateur` lance `npm test`, `npm run typecheck`, `npm run build`,
`npm run test:ui --workspace ucm-palettes-plugin` et l'oracle. L'orchestrateur
commite lot par lot, par chemins explicites, et pousse sur `main`.

## 5. Règles communes, à recopier dans chaque message d'agent

- Branche `main`. L'agent ne commite pas et ne pousse pas.
- Avant d'écrire un commentaire ou un document : lire
  `.agents/skills/rediger-sans-tics-ia/SKILL.md`. Un commentaire ne dit qu'un
  fait absent du code.
- Lire dans `AGENTS.md` la carte du code du paquet touché et le groupe
  d'invariants nommé par le bloc, pas le document entier ; reprendre le
  nommage et les habitudes du code voisin.
- Fins de ligne LF : `git diff --stat` ne doit montrer aucun fichier réécrit
  en entier.
- Le moteur reste pur : ni `Date`, ni `Math.random`, ni `Intl` dans
  `packages/couleur/src` (`COU/tests/loiDePurete.test.ts`).
- Ne pas toucher `docs/notes/Recherches/README.md`, ni
  `docs/notes/Recherches/Architecture globale UCM/`, ni les fichiers de
  `R/Mesures/` et `R/Maquettes/`.
- Un test qui échoue pour une raison étrangère au lot se signale, sans être
  corrigé ni désactivé.
- Rendre : les fichiers modifiés, ce qui a été fait, les commandes lancées et
  leur résultat, les questions ouvertes.

| But | Commande |
|---|---|
| Construire le kit | `npm run build --workspace @ucm-kit/core` |
| Tests du moteur | `npm test --workspace ucm-couleur` |
| Tests du plugin | `npm test --workspace ucm-palettes-plugin` |
| Types | `npm run typecheck` |
| Interface de Palettes | `npm run test:ui --workspace ucm-palettes-plugin` |
| Oracle, dans `R/Mesures/` | `ORACLE=verifier npx tsx stresser-moteur.ts` |
