# Plan du vocabulaire d'UCM Nomenclature

Ce plan corrige la liste « Vocabulaire » de l'onglet Règles, d'après l'export
du détail du vocabulaire (lien en bas de l'onglet, 0a98374) pris sur le
fichier Playground : 140 termes, 77 avec règle, 63 sans règle,
7 collections. Les chemins `src/…` partent de
`packages/plugin-nomenclature/`, les chemins `referentiel/…` de
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

- [ ] `NomLu` reçoit `palette?: string`, l'identifiant de palette qu'UCM
  Palettes écrit dans les données partagées de la variable.
- [ ] `naturesDesNoms(noms, options)` rend, pour chaque nom, la nature de
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
- [ ] Tests sur un extrait du Playground : Button, StressTest, Alert, TileLink
  composants ; ScaleWrap, UserInput, TilesGrid, Badge, TextColumns, Head,
  TileLinksWrap éléments ; les huit palettes ; `Icons`, `Base`, `Divider`,
  `primary`, `success`, `scale` sans nature ; un nom ordinaire sans nature.

### K2 · Les termes d'un segment (kit, après K1)

Agent : `implementeur-exigeant`. Fichiers : `referentiel/ecriture-des-mots.ts`,
`referentiel/termes-connus.ts`, `referentiel/lexique.ts`,
`referentiel/harmonisation.ts`, `referentiel/vocabulaire-du-fichier.ts`,
`referentiel/questions.ts`, leurs tests.

- [ ] `termesDuSegment(mots, nature)` rend les plages `[début, fin[` des mots
  de `decouperSegment` : une seule plage pour un segment qui a une nature ;
  sinon une plage par propriété composée (`TERMES_COMPOSES`, terme de
  plusieurs mots d'un registre), la plus longue d'abord ; sinon une plage
  par mot.
- [ ] `commencerLexique({ ordinaires })` calcule les natures dans `terminer`
  et ajoute au lexique `natures` (par nom), `termes` (plages par nom et par
  segment) et `occurrencesDesTermes` (clé jointe par des tirets vers ses
  occurrences, avec la longueur). `occurrences` par mot ne change pas.
- [ ] `index.remplacements(mots, categorie, frontieres?)` ne garde qu'un
  remplacement qui commence et finit sur une frontière de terme ; la
  normalisation passe les frontières. Une règle sur `wrap` ne touche plus
  `ScaleWrap` ; `radius` remplace toujours `Border-radius`, `bg` toujours
  `primaryBg`.
- [ ] `detecterParEtapes` saute un segment qui a une nature.
- [ ] `decouperPourQuestions` garde entière une taille (`5xl`).
- [ ] Tests : les 21 segments relevés, dont `lineheight` et `LineHeight` (un
  terme `line-height`), `TextColumns` (un terme, aucune règle `text`),
  `Text-color-Tag` (trois termes), `primaryBg` (deux termes).

### K3 · Les registres (kit, en parallèle de K1)

Agent : `implementeur`. Fichiers : `referentiel/vocabulaire.ts`, les tests du
référentiel, la vue illustrée (`generer-donnees-referentiel.ts`).

- [ ] `TAILLES_RETENUES` et `SIZE_VALUES` reçoivent `5xs` à `9xs` et `5xl` à
  `9xl`, dans l'ordre de l'échelle.
- [ ] `REGISTRE_COTES` (`x`, `y`, `top`, `right`, `bottom`, `left`, libellés
  bilingues), ajouté à `REGISTRES`.
- [ ] Vue illustrée régénérée ; `referentielUnique.test.ts` passe.

### K4 · La version du kit (après K1 à K3)

Agent : conversation principale. Changer la version de `@ucm-kit/core` (API
du lexique changée : version mineure), publier, mettre à jour la dépendance
du plugin.

### P1 · La liste lit les termes et leur nature (plugin, après K4)

Agent : `implementeur-exigeant`. Fichiers : `src/lecture.ts`,
`src/lectureFigma.ts`, `src/session.ts`, `src/projection.ts`,
`src/messages.ts`, leurs tests.

- [ ] La lecture passe l'identifiant de palette de chaque variable.
- [ ] `TermeDeListe` et `FicheVue` reçoivent `forme` (forme la plus fréquente
  dans le fichier) et `nature` (`composant`, `element`, `palette` ou `null`).
- [ ] `listeDesTermes` et `nomsEmployant` lisent `occurrencesDesTermes`. Un
  nom de collection n'a plus de ligne.
- [ ] Filtres `tous`, `avec-regle`, `sans-regle`, `composants` (composants et
  éléments), `palettes` ; `comptes` les cinq. Un nom ne compte jamais dans
  `sans-regle`. La recherche lit la clé et la forme.
- [ ] La fiche et ses exemples marquent le terme entier.
- [ ] Le détail du vocabulaire porte les natures et les termes de chaque nom.
- [ ] Test du Playground : `line`, `height` (31), `stress`, `wrap`,
  `components` disparaissent ; `StressTest` compte 66 noms une fois ;
  « Sans règle » ne contient ni Button ni Poppy.

### P2 · Traiter comme un terme (plugin, après P1)

Agent : `implementeur`. Fichiers : `src/regles.ts`, `src/session.ts`,
`src/messages.ts`, leurs tests.

- [ ] Règle `ordinaire:<clé>` dans `ESPACE_ARCHITECT` ;
  `ReglesDuFichier.ordinaires` ; export et import comme `voulus`.
- [ ] Gestes `traiter-comme-terme` et `traiter-comme-nom` ; ils relancent le
  calcul depuis l'inventaire.
- [ ] Tests : le nom revient dans le vocabulaire, puis redevient un nom.

### P3 · L'écran (plugin, après P2)

Agent : `implementeur`. Fichiers : `src/ui/listeDesTermes.ts`,
`src/ui/regles.ts`, `src/ui/feuilles.ts`, `src/ui/textes.ts`,
`src/ui/styles.css`, `galerie/`, leurs tests.

- [ ] Cinq filtres ; la ligne affiche la forme ; la pastille grise
  `pastille-indice` dit la nature et passe avant celle de l'origine.
- [ ] La fiche d'un nom : pastille grise, phrase de la maquette, lien
  « Traiter comme un terme ». La fiche d'un terme ordinaire dont la nature
  est repérée offre « Traiter comme un nom ».
- [ ] Galerie : la liste avec des noms, la fiche d'un composant.

### P4 · Un groupe protégé ne se coupe pas (plugin, pendant K2)

Agent : `implementeur-exigeant`. Fichiers : `src/session.ts`,
`tests/session.test.ts`.

- [ ] Test : `colors/Titanium/white` non protégé, à côté de
  `colors/Titanium/light/50` protégé, garde `colors/Titanium`.
- [ ] Si le test échoue : un segment de groupe partagé avec une variable
  protégée garde son écriture pour toutes les variables du même chemin
  parent.

### F · Fin

- [ ] `AGENTS.md`, section UCM Nomenclature : la nature d'un segment vient du
  kit, un nom n'entre dans aucune question.
- [ ] `npm test` à la racine, build du plugin, export du Playground relu.

## Ordre

K1 et K3 en parallèle, puis K2, K4, P1, P2, P3. P4 tourne pendant K2.
