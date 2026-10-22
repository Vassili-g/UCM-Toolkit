# Plan du vocabulaire d'UCM Nomenclature

Ce plan corrige la liste « Vocabulaire » de l'onglet Règles, d'après l'export
du détail du vocabulaire (lien en bas de l'onglet, 0a98374) pris sur le
fichier Playground : 140 termes, 77 avec règle, 63 sans règle,
7 collections. Les chemins `src/…` partent de
`packages/plugin-architect/`, les chemins `referentiel/…` de
`packages/kit/src/`.

## La cause commune

Le kit découpe un segment de deux façons.

| Fonction | Rôle | `StressTest` | `lineheight` | `Padding-x` |
|---|---|---|---|---|
| `decouperSegment` (`referentiel/ecriture-des-mots.ts`) | mots à réécrire selon la casse et le séparateur | `Stress`, `Test` | `line`, `height` | `Padding`, `x` |
| `decouperPourQuestions` (`referentiel/termes-connus.ts`) | termes que les questions comparent | `StressTest` | `line-height` | `Padding`, `x` |

Le second découpage ne coupe une casse ou un bloc soudé que si chaque morceau
est un terme connu, et garde entière une propriété de `TERMES_COMPOSES`. La
liste du vocabulaire lit pourtant le premier : `listeDesTermes`
(`src/projection.ts`) parcourt `lexique.occurrences`, indexé mot par mot par
`commencerLexique` (`referentiel/lexique.ts`). Chaque mot d'écriture devient
une ligne. La liste montre donc `line-height` (31, règle UCM) et aussi `line`
(31) et `height` (35), qui comptent les mêmes noms.

Le renommage lit le même découpage en mots. Une règle sur `wrap` changerait
`ScaleWrap` en remplaçant un mot à l'intérieur d'un nom.

## Les 63 termes sans règle

| Classe | Termes | Verdict |
|---|---|---|
| Morceau d'une propriété composée | `font`, `line`, `letter`, `spacing`, `weight`, `family`, `max` | erreur : le terme est `font-size`, `line-height`, `letter-spacing`, `font-weight`, `font-family`, `max-width` |
| Morceau d'un nom coupé à la casse | `stress`, `test`, `wrap`, `links`, `tiles`, `grid`, `user`, `input`, `columns` | erreur : les termes sont `StressTest`, `TileLink`, `TileLinksWrap`, `ScaleWrap`, `TilesGrid`, `UserInput`, `TextColumns` |
| Nom de collection | `brands`, `components`, `layouts`, `primitives`, `theme`, `typography`, `utilities` | erreur : la ligne « Collections » des conventions les couvre déjà |
| Nom de palette | `titanium`, `terracota`, `poppy`, `grass`, `orange`, `sky`, `sun`, `deep` | légitime, sans pastille |
| Nom de composant | `button`, `alert` | légitime, sans pastille |
| Nom d'élément d'un composant | `head`, `badge` | légitime, sans pastille |
| Valeur de variante | `contained`, `outlined`, `standard`, `outline` | légitime |
| Propriété | `padding`, `gap`, `height` (4 sur 35), `width` (1 sur 5) | légitime |
| Côté, axe, partie | `x`, `y`, `top`, `bottom`, `left`, `right`, `col`, `rows`, `main`, `subtle`, `tag` | légitime ; `col`, `rows` et `columns` méritent une question |
| Taille hors du registre | `5xs`, `5xl`, `6xl`, `7xl`, `8xl`, `9xl` | lacune : `REGISTRE_TAILLES` s'arrête à `4xs` et `4xl` |
| Mot d'une feuille | `tile`, `link`, `description` | légitime |

Les mêmes coupes faussent des termes avec règle : `size` compte 31 noms
`fontsize`, `border` 9 noms `Border-radius` et `Border-width`, `scale` 22 noms
`ScaleWrap`, `text` 5 noms `TextColumns`.

Réponses aux cinq questions du retour :

1. Noms de composants : oui, à détecter. Aujourd'hui le kit n'a aucune notion
   de nom propre. Le plugin ne lit pas les composants Figma ; la position
   suffit : rang 0 de la collection reconnue `components`.
2. Noms de palettes : oui, à détecter. Le segment dont toutes les variables
   descendantes finissent par un cran, avec ou sans mode et profil entre les
   deux, nomme une palette. Les variables suivies par Palettes le confirment.
3. `StressTest` : erreur de `decouperSegment`, corrigée par le lot V1.
4. `height` tiré de `lineheight` : erreur, 31 des 35 noms ; corrigée par V1.
5. `wrap` tiré de `TileLinksWrap` : erreur, et de `ScaleWrap` aussi ;
   corrigée par V1.

## Un défaut de renommage relevé dans l'export

`colors/Titanium/white` et `colors/Titanium/black` deviennent
`Color/Titanium/white` et `Color/Titanium/black`. Les 22 crans voisins,
protégés par Palettes, gardent `colors/Titanium/…`. Le groupe se coupe en
deux dossiers. À revérifier sur un build qui contient le lot S du
[plan de fiabilité](./PLAN-FIABILITE.md), qui étend la protection au suivi de
Palettes. S'il persiste, le lot V5 le corrige.

## Décisions

- **DV1, forme affichée d'un terme sans règle.** La forme la plus fréquente
  dans le fichier (`StressTest`, `lineheight`, `Outlined`). La clé
  `stress-test` reste interne. Un terme avec règle montre son terme de
  référence.
- **DV2, place des noms.** Forme A de la
  [maquette](./Maquettes/vocabulaire/MAQUETTE-VOCABULAIRE.html) : une seule
  liste, une pastille grise « Composant », « Élément » ou « Palette », deux
  filtres de plus, « Composants » (composants et éléments) et « Palettes ». Un
  nom ne compte jamais dans « Sans règle ». La fiche d'un nom suit la
  maquette : pastille grise, phrase, lien « Traiter comme un terme ».
- **DV3.** `REGISTRE_TAILLES` reçoit `5xs` à `9xs` et `5xl` à `9xl`. Un
  registre des côtés et des axes reçoit `x`, `y`, `top`, `right`, `bottom`,
  `left`.

Le plugin ne lit pas les contrats publiés pour repérer les composants. Son
manifeste n'ouvre aucun domaine réseau, et `socle.test.ts` le vérifie ; un
dépôt privé demanderait un jeton. La règle de position trouve les quatre
composants du Playground sans réseau.

## Revue du plan

La première version des lots (ee2aa3e) a été relue contre le code. Cinq
points changent l'implémentation.

1. Garder entier tout bloc à la casse dont un morceau est inconnu ferait
   régresser le renommage d'un nom en camelCase : `primaryBg` resterait un
   seul terme et `bg` ne deviendrait plus `background`. Un segment reste donc
   entier seulement quand il est un nom (composant, élément, palette). Une
   propriété composée se groupe. Les autres mots restent ceux d'aujourd'hui.
2. La nature d'un segment dépend de sa place et de tous les noms du fichier,
   car un mot employé ailleurs n'est pas un nom. Le lexique la calcule dans
   `terminer`, après avoir reçu tous les noms.
3. Les questions excluent les segments qui ont une nature. Elles gardent
   `decouperPourQuestions`, dont les clés des propriétés composées
   (`line-height`) sont déjà celles de la liste.
4. Le repérage des palettes par la forme attraperait `primary/light/500` et
   `success/vivid/light/400`. Un mot du référentiel n'a jamais de nature, ce
   qui les écarte.
5. « Traiter comme un terme » change les natures, donc le lexique : le geste
   relance le calcul depuis l'inventaire, comme `configurer`, et non depuis
   les règles seules.

## Lots

Chaque lot passe `tsc`, les tests du paquet touché, puis `npm test` à la
racine et le build du plugin. Les tests emploient les noms du Playground déjà
présents dans le dépôt. Un texte destiné au designer se rédige avec la skill
`rediger-diagnostics-ucm`. La conversation principale relit chaque diff,
commite par chemins explicites et coche ici avec le hash.

### K1 · La nature d'un segment (kit)

Agent : `implementeur-exigeant`. Fichiers : `referentiel/natures.ts` (nouveau),
`referentiel/harmonisation.ts` (`NomLu.palette`), `referentiel/index.ts`,
`tests/naturesReferentiel.test.ts` (nouveau).

- [x] `NomLu` reçoit `palette?: string`, l'identifiant de palette qu'UCM
  Palettes écrit dans les données partagées de la variable.
- [x] `naturesDesNoms(noms, options)` rend, pour chaque nom, la nature de
  chaque segment : `composant`, `element`, `palette` ou `null`.
  - `composant` : rang 0, dans la collection dont le nom est reconnu
    `components` (la portée d'une variable est l'identifiant du nom de sa
    collection), ou suivi d'un groupe de propriétés.
  - `element` : rang suivant, suivi d'un groupe de propriétés.
  - Groupe de propriétés : une forme des termes `color` et `size` de
    `REGISTRE_GROUPES` (`Colors`, `Sizes`).
  - `palette` : segment qui précède les modes, profils et crans d'une
    variable dont le dernier segment est un cran de `CRANS`, `white` ou
    `black`, quand ce segment porte au moins 5 crans différents, le seuil
    `SEUIL_DE_PALETTE` d'UCM Palettes. Les variables qui portent un
    identifiant de palette désignent la leur sans seuil.
  - Aucune nature pour un mot connu du référentiel ou pour son pluriel
    (`termeOuFormeConnu`, sans les fautes à une lettre près),
    pour un mot employé aussi à une place sans nature, ni pour une clé de
    `options.ordinaires`.
- [x] Tests sur un extrait du Playground : Button, StressTest, Alert, TileLink
  composants ; ScaleWrap, UserInput, TilesGrid, Badge, TextColumns, Head,
  TileLinksWrap éléments ; les huit palettes ; `Icons`, `Base`, `Divider`,
  `primary`, `success`, `scale` sans nature ; un nom ordinaire sans nature.
  Fait en 14640ef. Le dernier segment d'une variable n'a jamais de nature.
  `button` reste un nom possible, bien que l'abréviation `btn` le fasse
  connaître.

### K2 · Les termes d'un segment (kit, après K1)

Agent : `implementeur-exigeant`. Fichiers : `referentiel/ecriture-des-mots.ts`,
`referentiel/termes-connus.ts`, `referentiel/lexique.ts`,
`referentiel/harmonisation.ts`, `referentiel/vocabulaire-du-fichier.ts`,
`referentiel/questions.ts`, leurs tests.

- [x] `termesDuSegment(mots, nature)` rend les plages `[début, fin[` des mots
  de `decouperSegment` : une seule plage pour un segment qui a une nature ;
  sinon une plage par propriété composée (`TERMES_COMPOSES`, terme de
  plusieurs mots d'un registre), la plus longue d'abord ; sinon une plage
  par mot.
- [x] `commencerLexique({ ordinaires })` calcule les natures dans `terminer`
  et ajoute au lexique `natures` (par nom), `termes` (plages par nom et par
  segment) et `occurrencesDesTermes` (clé jointe par des tirets vers ses
  occurrences, avec la longueur). `occurrences` par mot ne change pas.
- [x] `index.remplacements(mots, categorie, frontieres?)` ne garde qu'un
  remplacement qui commence et finit sur une frontière de terme ; la
  normalisation passe les frontières. Une règle sur `wrap` ne touche plus
  `ScaleWrap` ; `radius` remplace toujours `Border-radius`, `bg` toujours
  `primaryBg`.
- [x] `detecterParEtapes` saute un segment qui a une nature.
- [x] `decouperPourQuestions` garde entière une taille (`5xl`).
- [x] Tests : les 21 segments relevés, dont `lineheight` et `LineHeight` (un
  terme `line-height`), `TextColumns` (un terme, aucune règle `text`),
  `Text-color-Tag` (trois termes), `primaryBg` (deux termes).
  Fait en 043f949b. `foreground-main` et `foreground-subtle`, valeurs du
  thème UCM, restent un seul terme.

### K3 · Les registres (kit, en parallèle de K1)

Agent : `implementeur`. Fichiers : `referentiel/vocabulaire.ts`, les tests du
référentiel, la vue illustrée (`generer-donnees-referentiel.ts`).

- [x] `TAILLES_RETENUES` et `SIZE_VALUES` reçoivent `5xs` à `9xs` et `5xl` à
  `9xl`, dans l'ordre de l'échelle.
- [x] `REGISTRE_COTES` (`x`, `y`, `top`, `right`, `bottom`, `left`, libellés
  bilingues), ajouté à `REGISTRES`.
- [x] `referentielUnique.test.ts` passe. La vue illustrée ne montre ni les
  tailles ni ces registres : rien à régénérer. Fait en 1a10884.

### K4 · La version du kit (après K1 à K3)

Agent : conversation principale. Les champs ajoutés au lexique ne retirent
rien : version de correctif.

- [x] Kit 0.9.5, cli 0.1.64, adapter 0.1.57, corpus UCM régénéré pour les
  nouveaux registres (a0a93bcd) ; les trois paquets sont publiés.

### P1 · La liste lit les termes et leur nature (plugin, après K4)

Agent : `implementeur-exigeant`. Fichiers : `src/lecture.ts`,
`src/lectureFigma.ts`, `src/session.ts`, `src/projection.ts`,
`src/messages.ts`, leurs tests.

- [x] La lecture passe l'identifiant de palette de chaque variable.
- [x] `TermeDeListe` et `FicheVue` reçoivent `forme` (forme la plus fréquente
  dans le fichier) et `nature` (`composant`, `element`, `palette` ou `null`).
- [x] `listeDesTermes` et `nomsEmployant` lisent `occurrencesDesTermes`. Un
  nom de collection n'a plus de ligne.
- [x] Filtres `tous`, `avec-regle`, `sans-regle`, `composants` (composants et
  éléments), `palettes` ; `comptes` les cinq. Un nom ne compte jamais dans
  `sans-regle`. La recherche lit la clé et la forme.
- [x] La fiche et ses exemples marquent le terme entier.
- [x] Le détail du vocabulaire porte les natures et les termes de chaque nom.
- [x] Test du Playground : `line`, `height` (31), `stress`, `wrap`,
  `components` disparaissent ; `StressTest` compte 66 noms une fois ;
  « Sans règle » ne contient ni Button ni Poppy.
  Fait en f0c822a2. Un terme de plusieurs mots qu'une règle du fichier ajoute
  (`extra-small`) se cherche encore dans les mots, faute d'être dans le
  lexique.

### P2 · Traiter comme un terme (plugin, après P1)

Agent : `implementeur`. Fichiers : `src/regles.ts`, `src/session.ts`,
`src/messages.ts`, leurs tests.

- [x] Règle `ordinaire:<clé>` dans `ESPACE_ARCHITECT` ;
  `ReglesDuFichier.ordinaires` ; export et import comme `voulus`.
- [x] Gestes `traiter-comme-terme` et `traiter-comme-nom` ; ils relancent le
  calcul depuis l'inventaire.
- [x] Tests : le nom revient dans le vocabulaire, puis redevient un nom.
  Fait en a997feab. Le premier essai coupait `StressTest` en `stress` et
  `test` une fois traité comme un terme ; le kit garde désormais le segment
  entier (47b3c12e).

### P3 · L'écran (plugin, après P2)

Agent : `implementeur`. Fichiers : `src/ui/listeDesTermes.ts`,
`src/ui/regles.ts`, `src/ui/feuilles.ts`, `src/ui/textes.ts`,
`src/ui/styles.css`, `galerie/`, leurs tests.

- [x] Cinq filtres ; la ligne affiche la forme ; la pastille grise
  `pastille-indice` dit la nature et passe avant celle de l'origine.
- [x] La fiche d'un nom : pastille grise, phrase de la maquette, lien
  « Traiter comme un terme ». La fiche d'un terme ordinaire dont la nature
  est repérée offre « Traiter comme un nom ».
- [x] Galerie : la liste avec des noms, la fiche d'un composant.
  Fait en 61c1c868, états de galerie `regles-noms` et `feuille-composant`.
  Les étapes « Remplacer par… » et « Remplace d’autres termes… » titrent
  encore avec la clé (`button`) et non la forme.

### P4 · Un groupe protégé ne se coupe pas (kit, pendant K1)

Agent : `implementeur-exigeant`. Le calcul des renommages reçoit déjà les noms
non renommables : la règle vit dans `normaliserParEtapes`
(`referentiel/lexique.ts`), testée dans `tests/lexiqueReferentiel.test.ts`.

- [x] Test : `colors/Titanium/white` non protégé, à côté de
  `colors/Titanium/light/50` protégé, garde `colors/Titanium`.
- [x] Si le test échoue : un segment de groupe partagé avec une variable
  protégée garde son écriture pour toutes les variables du même chemin
  parent. Le test échouait ; corrigé en a165887.

### F · Fin

- [x] `AGENTS.md`, section UCM Nomenclature : la nature d'un segment vient du
  kit, un nom n'entre dans aucune question (4b8b4b6d).
- [x] `npm test` à la racine (dix paquets, aucun échec), build du plugin ;
  kit 0.9.6, cli 0.1.65, adapter 0.1.58 (3ccd4888).
- [ ] Recette dans Figma par le mainteneur : relancer l'analyse du
  Playground, relire la liste et refaire l'export du détail du vocabulaire.

## Ordre

K1 et K3 en parallèle, P4 pendant K1, puis K2, K4, P1, P2, P3.

## Tour 2

Retour du mainteneur après la première implémentation.

- [x] Sur UCM, un composant est seulement un nom à la racine de la
  collection `components` ou d'un dossier `components`. La nature `element`
  disparaît ; ScaleWrap, UserInput ou TilesGrid sont des noms de groupe. Un
  bloc en camelCase dont un mot est inconnu reste un seul terme, pour que
  `wrap` ne ressorte pas de `TileLinksWrap`. Fait en 6714152e, kit 0.9.7
  (d9022034). Conséquence : une règle personnalisée sur un mot inconnu ne
  s'applique plus à l'intérieur d'un tel bloc.
Décisions du tour 2 : forme A de la
[maquette du tour 2](./Maquettes/vocabulaire-2/MAQUETTE-VOCABULAIRE-2.html),
sections par type, avec la section Palettes visible comme les autres ; la
fiche proposée ; le terme écrit selon la convention du projet.

### T-S · Le sandbox du tour 2 (plugin)

Agent : `implementeur-exigeant` (protocole entre le sandbox et l'écran).
Fichiers : `src/messages.ts`, `src/projection.ts`, `src/session.ts` (lecture
`termes`), `src/ui/frontiere.ts` (la demande seulement), leurs tests.

- [x] Écriture : la `forme` d'un terme avec règle est son terme de référence
  écrit dans la convention de la catégorie qui l'emploie le plus
  (`entree.ecriture.groupes` ou `.variables` ; `Color` pour un dossier en
  PascalCase, `line-height` pour une variable). `remplace` porte les formes du
  fichier de chaque variante (`Colors`, `colors`).
- [x] Type d'un terme : `a-trancher`, `remplace` (règle avec des variantes
  dans le fichier), `conforme` (règle sans variante), `sans-regle` (y compris
  une règle UCM écartée), `composant`, `palette` (la nature passe avant la
  règle).
- [x] Demande `termes` : `recherche`, `types` (vide = tous), `origines`
  (`ucm`, `personnalise` ; vide = toutes ; ne filtre que `remplace` et
  `conforme`), `tri` (`alpha` ou `nombre`), `section` (un type ou `null`),
  `debut`.
- [x] Réponse : les sections non vides dans l'ordre des types, chacune avec
  son total et ses cinq premières lignes ; avec `section`, une page de
  cinquante lignes de ce seul type. `comptes` par type et par origine, sans
  tenir compte des filtres.
- [x] Tri `alpha` : sur la forme affichée, sans tenir compte des majuscules,
  les nombres par valeur, les tailles dans l'ordre de `REGISTRE_TAILLES`. Tri
  `nombre` : nombre de noms décroissant, puis `alpha`. Pas d'`Intl` : le
  sandbox de Figma ne le garantit pas.
- [x] Tests sur l'extrait du Playground.
  Fait en 559dbc61 ; le kit exporte les fonctions d'écriture (ee39eda7). Un
  terme réglé compte aussi les noms de ses variantes ; un nom garde sa forme
  du fichier ; les tailles se trient entre elles, après les autres termes.

### T-U · L'écran du tour 2 (plugin, après T-S)

Agent : `implementeur-exigeant` (reproduire la maquette). Fichiers :
`src/ui/regles.ts`, `src/ui/listeDesTermes.ts`, `src/ui/feuilles.ts`,
`src/ui/textes.ts`, `src/ui/styles.css`, `src/ui/icones.ts` (nouveau),
`galerie/`, leurs tests.

- [x] Une section par type, repliable, ouverte par défaut, palettes
  comprises ; une icône grise par type, ambre pour « À trancher » ;
  « Afficher les N autres » demande la page de la section.
- [x] Barre : « Filtrer » ouvre un menu de cases à cocher (types, origine de
  la règle) ; les filtres actifs en jetons retirables ; la recherche ; le
  tri.
- [x] La ligne affiche la `forme` ; une règle garde son jeton gris et sa
  pastille d'origine.
- [x] Fiche : la définition sous le nom, dans l'en-tête ; dans le bloc de la
  règle, le jeton du terme prend le fond de la page et une bordure.
- [x] Galerie : la vue en sections, le menu ouvert, la fiche d'un cran UCM.
  Fait en c0c4e7fe (fiche) et 93c19449 (sections, menu, tri, galerie). Le
  titre de la fiche écrit la forme, comme la ligne.

### T-F · Fin

- [x] `npm test` à la racine, build du plugin, galerie ; plan coché.
  Dix paquets, aucun échec ; kit 0.9.8, cli 0.1.67, adapter 0.1.60
  (d032c79f), montée commune avec le plan des noms de palettes.
