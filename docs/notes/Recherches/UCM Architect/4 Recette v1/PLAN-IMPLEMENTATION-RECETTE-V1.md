# Plan d'implémentation de la recette v1 d'Architect

Ce plan met en œuvre les décisions de [ANALYSE-RECETTE-V1.md](./ANALYSE-RECETTE-V1.md),
montrées par [MAQUETTE-RECETTE-V1.html](./MAQUETTE-RECETTE-V1.html) (`c3033e49`).
La conversation principale orchestre : elle lance les lots, relit chaque diff,
fait relancer les vérifications et commite par chemins explicites. Aucun agent
ne commite, ne pousse ni ne publie.

Déjà fait : R-1, le stroke weight d'un layer sans contour (`abb69c96`) ; la
règle des chevrons (`6f97d5b6`).

## Décisions appliquées

| N° | Décision |
|---|---|
| R-2, R-10 | Un layer de composant ne se lie qu'aux tokens de son composant, dans la collection `components`, pour les couleurs et les tailles. La typographie est hors de la règle. |
| R-3 | Le panneau du mode Composant perd ses trois onglets. Un sommaire des éléments, en puces en haut, les remplace. |
| R-5, R-9 | Un signe est gris quand il montre, de la couleur de sa famille quand il informe. Les sept teintes de la planche sont validées. |
| R-6, R-7 | Les signes entrent dans le kit, comme données. Un objet de Figma garde le signe de Figma. |
| R-8 | Chaque carte de correction a son bouton Appliquer ; le pied porte « Appliquer tout ». |

## Lots

Chaque lot nomme son agent, d'après la table de `CLAUDE.md`. Au plus deux
agents à la fois. `V` relance les vérifications après chaque lot.

| Lot | Agent | Dépend de | Fichiers principaux | Fait |
|---|---|---|---|---|
| K1 | `implementeur-exigeant` | — | `packages/kit/src/controles/couche.ts`, `corrections.ts` | |
| K2 | `implementeur` | — | `packages/kit/src/referentiel/signes.ts` (nouveau), `referentiel/index.ts` | |
| E1 | `executant` | K1, K2 | `packages/kit/package.json` | |
| S1 | `implementeur-exigeant` | K2, E1 | `packages/plugin-socle/src/ui/Signe.ts` (nouveau), `langage.css` | |
| A1 | `implementeur` | — | `packages/plugin-architect/src/ui/panneau/elements.ts` (nouveau) | |
| A2 | `implementeur-exigeant` | S1 | `packages/plugin-architect/src/ui/vues/composant.ts`, `textes/composant.ts` | |
| A3 | `implementeur-exigeant` | S1, A1 | `packages/plugin-architect/src/ui/analyse/index.ts`, `composant/corps.ts`, `corrections/`, `questions/`, `ignores/` | |
| A4 | `implementeur` | K1, A3 | `packages/plugin-architect/src/ui/corrections/modele.ts`, `textes/corrections.ts` | |
| G1 | `implementeur` | A2, A3, A4 | `packages/plugin-architect/galerie/etats/*.cjs`, `SPEC.md`, `CARTE.md`, invariants | |
| V | `verificateur` | chaque lot | — | |

Ordre : K1 et K2 en parallèle, puis E1. Ensuite S1 et A1 en parallèle. Puis A2
et A3, puis A4, puis G1. Les plugins, l'exporteur et Palettes compris,
prennent les signes dans un plan suivant, après la recette Figma d'Architect.

## K1 · Un layer ne se lie qu'aux tokens de son composant

Agent : `implementeur-exigeant`. La règle a plusieurs lecteurs : C20, C29 et
la préparation.

Règle. Une liaison de couleur ou de taille d'un layer du jeu vise une variable
de la collection de rôle `components` dont le premier segment est le
composant (`alert/...`). La typographie n'entre pas dans la règle :
`fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `fontFamily` et les
styles de texte restent jugés comme aujourd'hui.

1. **Nouveau constat.** Une liaison de couleur ou de taille qui vise une
   variable hors de `components` donne un constat À corriger, famille
   `liaisons` pour une couleur, `tailles` pour une taille. Prendre le premier
   code libre au-dessus de C67, après avoir vérifié dans
   `docs/notes/Recherches/UCM Architect/1 Conception/PREPARATION-ARCHITECT.md`
   qu'aucun constat prévu ne le porte. Faits : `token`, `couche`, `champ`,
   `calque`. Le placer dans `controlerCouches` (`couche.ts`). C20 garde son
   sens pour un token d'Alert qui renvoie à une couche non admise. Une
   variable d'un autre composant reste C19.
2. **C29 cherche dans les tokens du composant.** `corrigerValeurEnDur`
   (`corrections.ts`) ne cherche plus dans `layout`. Ses candidats sont les
   variables de `components` du composant dont le dernier segment est la
   propriété du champ, et dont la valeur résolue vaut la valeur lue :
   `strokeWeight` → `border-width`, `cornerRadius` et les coins → `radius`,
   `itemSpacing` → `gap`, `paddingLeft` et `paddingRight` → `padding-x` ou
   `padding-left` / `padding-right`, `paddingTop` et `paddingBottom` →
   `padding-y` ou `padding-top` / `padding-bottom`. Les registres du kit
   (`referentiel/`) font autorité pour ces noms : lire le registre des
   propriétés de taille de `components` avant d'écrire une table. Un segment
   d'axe du variant (taille, palette) filtre les candidats comme
   `corrigerLiaisonManquante` filtre les couleurs. Un candidat : correction.
   Plusieurs : question. Aucun : pas de correction, le constat reste, et la
   préparation propose de créer le token.
3. **La correction dit où elle lie.** `Correction.apres` reçoit `collection`
   (nom lu dans le catalogue) et, pour C29, `valeur`. Le type est dans
   `packages/kit/src/controles/constat.ts`. Champs optionnels : les autres
   corrections ne changent pas.
4. **La préparation** (`preparation.ts`) ne doit proposer aucune liaison
   directe vers `layout` ou `theme` pour un layer. Vérifier, corriger si elle
   le fait, et le tester.

Critères de fin : tests du kit pour chaque point (un lien direct vers `layout`
donne le nouveau constat ; une couleur liée à `theme` aussi ; `fontSize` lié à
`typography` ne donne rien ; C29 propose `alert/size/border-width` ; C29 sans
token exact ne propose rien ; deux candidats donnent une question). `npm run
test --workspace @ucm-kit/core` vert. Ne pas changer la version : E1 la
change. Le test racine `versionSuitLeContenu` échoue tant qu'E1 n'est pas
passé : c'est attendu. Ne rien commiter.

## K2 · Les signes dans le kit

Agent : `implementeur`.

Créer `packages/kit/src/referentiel/signes.ts` et l'exporter par
`@ucm-kit/core/referentiel`, comme `signaux.ts`.

- `FAMILLES_DE_SIGNES` : les treize familles de la planche, avec `id`,
  `libelle` et `teinte`, l'identifiant de la couleur de famille ou `null`.
  Teintes : `couleurs`, `tailles`, `texte`, `tokens`, `variants`, `regles`,
  `a11y`. Les sortes de proposition et la publication n'en ont pas.
- `SIGNES` : chaque signe avec `id`, `famille`, `libelle`, `sens`, `trace` et
  `mot`. `trace` est le contenu SVG sur une grille de 16, copié de la constante
  `FAMILLES` de `MAQUETTE-RECETTE-V1.html`. `mot` est le mot de repli d'un
  texte brut, en général le libellé. Un signe partagé (`prop-variant` pour
  `@prop`, `a-creer` pour la préparation) n'est écrit qu'une fois ; la famille
  qui le reprend le cite par `reprend`.
- `svgDuSigne(id, taille = 16)` : le SVG complet en texte, `viewBox="0 0 16
  16"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.4"`,
  `aria-hidden="true"`. Fonction pure.
- Un signe d'usage de couleur sans tracé (`usage-fill`, `usage-stroke`) a une
  `trace` vide : la tuile porte la couleur.

Critères de fin : test dans `packages/kit/tests/` : identifiants uniques,
chaque famille a au moins un signe, chaque `reprend` vise un signe existant, un
tracé n'emploie que `path`, `rect`, `circle` et `text`, `svgDuSigne` rend un SVG
qui s'analyse. Ligne dans `packages/kit/CARTE.md`. `npm run test --workspace
@ucm-kit/core` vert, hors `versionSuitLeContenu`. Ne rien commiter.

## E1 · Version du kit

Agent : `executant`. Passer `packages/kit/package.json` à la version mineure
suivante (`0.13.0`) : K1 ajoute un constat et K2 un module. Suivre
`packages/kit/invariants/versionnage.md` pour les autres fichiers qui portent
la version. Lancer `node scripts/run-tests.cjs` à la racine.

## S1 · La tuile des signes dans le socle

Agent : `implementeur-exigeant` : interface au pixel près, et loi des styles.

- `packages/plugin-socle/src/ui/Signe.ts` : `creerSigne(id, { taille: 14 | 16
  | 24, informe?: boolean, valeur?: string, clair?: boolean })`. Le SVG vient de
  `svgDuSigne` du kit. `informe` pose la couleur de la famille. `valeur` pose
  une couleur de token dans la tuile, avec l'encre lisible dessus (`clair`).
- `langage.css` : la tuile `.signe` et ses tailles (14 px : tracé 11 px ; 16 :
  12 ; 24 : 15), le gris par défaut, `.signe-informe` et les sept rôles de
  teinte entre les repères `roles:debut` et `roles:fin`, en sombre et en clair.
  Valeurs sombres : sarcelle `#34d1bf`, lavande `#a5b4fc`, blanc `#f4f4f5`,
  violet `#c084fc`, sable `#e2c08d`, rose `#f472b6`, et l'arc-en-ciel de la
  maquette pour `couleurs`. Choisir les valeurs claires avec un contraste de
  3:1 sur le fond clair. Les styles de `recette.css` font référence.
- La planche de la galerie du socle montre chaque signe en gris et en couleur.

Critères de fin : test du socle qui crée chaque signe de `SIGNES` ; loi des
styles verte ; `npm run test:paquet -- socle` vert. Ne rien commiter.

## A1 · Le modèle des éléments du panneau

Agent : `implementeur`. Module pur, sans DOM.

`packages/plugin-architect/src/ui/panneau/elements.ts` range les constats
visibles par élément, dans cet ordre : `couleurs`, `tailles`, `texte`,
`tokens`, `variants`, `regles`, `a11y`.

- L'élément vient du champ quand le constat en porte un (`correction.cible.champ`
  ou `faits.champ`) : peinture → `couleurs` ; padding, gap, taille, rayon,
  épaisseur → `tailles` ; champ de texte → `texte`. Sinon de la famille du
  constat : `liaisons` → `couleurs`, `tailles` → `tailles`, `typographie` →
  `texte`, `tokens` et `export` → `tokens`, `variants` et `visibilite` →
  `variants`, `regles` → `regles`, `contraste` → `a11y`.
- Dans un élément : les corrections, puis les questions, puis les constats sans
  correction ni question, dans l'ordre des constats. Une carte de corrections
  (`cartesDeCorrections`) reste une carte.
- Les constats Bloquant sont rendus à part, pour l'en-tête de « Tout ».
- Un élément sans constat est tenu.
- Le nombre de points d'un élément compte ses constats visibles.

Critères de fin : test dans `packages/plugin-architect/tests/` sur les constats
d'Alert de la galerie (`galerie/etats/corrections.cjs`). Ne rien commiter.

## A2 · Les signes dans la vue Composant

Agent : `implementeur-exigeant`.

`packages/plugin-architect/src/ui/vues/composant.ts` remplace les glyphes de
`TEXTES.composant.glyphes` (◇ # ◜ ↔ ⤢ ─ Aa A • ?) par `creerSigne`, en gris,
16 px : titre `component`, composant imbriqué `instance` (14 px), couleur par
usage avec la valeur dans la tuile (`usage-fill`, `usage-texte`,
`usage-icone`, `usage-stroke`, `usage-effet`), nombres par champ (`padding`,
`padding-x` quand le token lie left et right, `padding-y` pour top et bottom,
un côté seul sinon ; `gap`, `width`, `height`, `taille-icone`, `radius`,
`stroke-weight`, `opacity`), style de texte `text-style`. Les glyphes `miette`
et `ecart` restent. Un test du socle refuse dans `packages/plugin-*/src/ui` les anciens
caractères de sorte ◜ ⤢ ─ hors des commentaires.

Critères de fin : `npm run test:paquet -- architect` vert. Le cadre 5a de la
maquette fait référence pour la colonne de gauche. Ne rien commiter.

## A3 · Le panneau sans onglets

Agent : `implementeur-exigeant`.

- `src/ui/analyse/index.ts` retire les trois onglets. En haut : le résumé, puis
  le sommaire des éléments en puces qui passent à la ligne. « Tout » d'abord,
  puis une puce par élément qui a des points : signe 14 px en couleur, nom,
  nombre, l'icône Bloquant si l'élément en porte un. Une puce choisie ne montre
  que son élément. `etat.panneau.onglet` devient l'élément choisi, `tout` par
  défaut.
- Sous « Tout » : les constats Bloquant en tête, hors des sections, puis une
  section par élément, puis les éléments tenus.
- La bande d'une section : fond de bloc, signe 24 px en couleur, titre, nombre
  de points, chevron. Repliable. Une section tenue : signe gris, titre, la
  coche seule.
- Les cartes de Corrections, Questions et À faire dans Figma gardent leur forme
  et leur code (`corrections/`, `questions/`, `ignores/`). Seul leur
  rangement change, par le modèle d'A1.
- Chaque carte de correction a son bouton Appliquer : il écrit les lignes
  cochées de cette carte seule. Le pied porte « Appliquer tout » : il écrit
  toutes les corrections cochées, visibles ou non, et son résumé le dit.
- `src/ui/composant/corps.ts` masque et rend aujourd'hui `.onglets` et
  `#panneau-*` autour de la préparation : remplacer ces sélecteurs par le
  sommaire et la liste.

Critères de fin : tests de modèle et de rendu du panneau verts. Les cadres 2b,
2c et 5a de la maquette font référence. `npm run test:paquet -- architect`
vert. Ne pas lancer `test:ui`. Ne rien commiter.

## A4 · La carte de taille

Agent : `implementeur`.

`src/ui/corrections/modele.ts` (genre `tailles`) et `textes/corrections.ts` :

- titre : « Lier le stroke weight de container », le champ et le layer, sans
  « à ses tokens de taille » ;
- une ligne par layer, avec le nombre de variants (`container ×8`) ;
- à gauche, la valeur lue en dur (`1 px en dur`) ;
- à droite, le token, et sous lui sa collection, sa valeur et « existe », lus
  dans `Correction.apres` (K1).

Critères de fin : test du modèle ; la carte 1b de la maquette fait référence.
Ne rien commiter.

## G1 · Galerie et documents

Agent : `implementeur`.

Mettre à jour les états de la galerie qui montrent les onglets du panneau
(`galerie/etats/corrections.cjs`, `questions.cjs`, `ignores.cjs`,
`analyse.cjs`) et le manifeste `galerie/cadres.json` : un cadre qui compare
l'ancienne maquette déclare son écart. Mettre à jour `SPEC.md`, `README.md`,
`CARTE.md` et les invariants que `npm run agents:diff` liste. Critères de fin :
`npm run galerie:plugin -- architect` sans situation sans écran ;
`npm run test:paquet -- architect` vert. Ne rien commiter.

## Revue du plan

Relu avant le lancement, avec quatre corrections :

1. K1 et K2 changeaient tous deux la version du kit. Un seul lot, E1, la change
   après eux.
2. A3 touchait `corrections/modele.ts`, que A4 réécrit. A4 passe après A3.
3. Le test qui refuse les anciens glyphes échouait tant qu'Architect les
   gardait. Il entre dans A2, qui les retire.
4. La règle de K1 avait trois lecteurs (C20, C29, préparation). K1 passe à
   `implementeur-exigeant` et vérifie la préparation.

Reste ouvert : le nom du nouveau code de K1, à vérifier dans la conception, et
la publication du kit, que le mainteneur décide avec le push.
