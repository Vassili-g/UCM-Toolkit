# Plan d'implémentation : la recette v9

## Objet et lecteur

Ce plan s'adresse à la conversation principale qui l'exécute,
l'orchestrateur, et aux agents auxquels elle confie chaque tâche. Il
applique les décisions E1, E4 et E5 du [dossier](./DOSSIER-RECETTE-V9.md) :
le bandeau de vérification B4, l'accueil de Création A2a et Vérification
sans palette ouverte V3a. Les maquettes de référence sont
[MAQUETTE-AUCUNE-PALETTE-OUVERTE.html](../Recette%20v8/Maquettes/MAQUETTE-AUCUNE-PALETTE-OUVERTE.html)
(sections « A2a » et « V3a, version retenue ») et
[MAQUETTE-BANDEAU-DE-VERIFICATION.html](../Recette%20v8/Maquettes/MAQUETTE-BANDEAU-DE-VERIFICATION.html)
(section « B4 » et « Décision »). Aucune décision n'y reste ouverte.

## Qui fait quoi

| Rôle | Modèle | Ce qu'il fait |
|---|---|---|
| Orchestrateur | Conversation principale | Lance les vagues, relit chaque diff, commite par chemins explicites, construit et pousse |
| `implementeur` | Sonnet, effort moyen | Une tâche par appel, sur une spécification fermée |
| `implementeur-exigeant` | Sonnet, effort élevé | La tâche qui assemble plusieurs lecteurs d'une même règle (V3a) |
| `verificateur` | Haiku, effort bas | La suite complète et les captures, une fois à la fin |

Deux agents au plus en même temps. Deux tâches d'une même vague peuvent
toucher `ui/styles.css`, l'i18n, `galerie/etats.cjs` et
`tests/interface/interface.test.mjs` : chacune y ajoute ses propres blocs,
relit le fichier avant chaque modification et ne réécrit pas ceux de l'autre.

## Règles de l'exécution

- Travailler sur `main`. Commiter par chemins explicites avec `-- <chemins>`.
- Garder les fins de ligne d'origine ; vérifier avec `git diff --stat`.
- `npm run test:ui --workspace ucm-palettes-plugin` avant de pousser ;
  `npm run build --workspace ucm-palettes-plugin` avant un essai dans Figma.
- Le test `[REC-08] un fichier d'une version future ou cassé…` échoue parfois
  en suite complète et passe seul : le signaler, ne pas le corriger ici.

## Textes destinés au designer

| Où | Français | Anglais |
|---|---|---|
| Accueil de Création | Nouvelle palette (texte existant) ; Partez d'une couleur de référence. ; Vos palettes | New palette ; Start from a reference color. ; Your palettes |
| Bilan de Vérification | À corriger ; À vérifier ; Conformes | To fix ; To check ; Passing |
| Tout est conforme | Les N palettes tiennent leurs garanties, en Light et en Dark. ; Aucune palette trop proche d'une autre. | All N palettes keep their guarantees, in Light and Dark. ; No palette too close to another. |
| Paire trop proche | trop proche de Sky, ΔEok 0,04 | too close to Sky, ΔEok 0.04 |
| Pied B4, bouton | Vérifier (texte existant) | le texte anglais existant |

## Vague 1

- [x] **U1 · Le nuancier des palettes** · `implementeur`, moyen. Un
  composant partagé `ui/nuancierDesPalettes.ts`, que U2 et U3 emploient.
  - Une carte par palette, dans l'ordre de la recette : 60 × 80 px, trois
    aplats (la nuance 200, la nuance d'ancrage de la référence, la nuance
    800, en Light ; Vivid pour une palette à deux intensités ; les couleurs
    figées pour une palette figée), puis une bande blanche avec le nom,
    coupé avec points de suspension, nom entier en `title`. Sept cartes par
    rangée à 500 px.
  - Options : un état par carte (`rouge`, `ambre` ou aucun) qui pose un
    point de 6 px à droite du nom ; une carte `attenuee` (30 % d'opacité,
    désaturée, toujours cliquable) ; un rappel au clic avec l'identifiant.
  - Chaque carte est un `button` au nom accessible « Bleu », complété de
    l'état (« Bleu, à corriger ») ; navigation au clavier par Tab.
  - Fini quand : tests unitaires du rendu (ordre, aplats, point, atténuée,
    clic) ; typecheck et `npm test` du workspace passent.

- [x] **U4 · Le bandeau B4** · `implementeur`, moyen. Dossier, section 2 et
  décision E1.
  - Fichiers : `ui/piedDeLaPalette.ts`, `ui/index.ts` ou le module qui
    construit les onglets, `ui/styles.css`, i18n, galerie, tests.
  - L'onglet Vérification porte un compteur : rouge, le nombre de
    garanties manquées ; ambre, le nombre d'alertes seules ; ✓ vert quand
    tout tient. Il suit la palette ouverte dans Création ; sans palette
    ouverte, rien.
  - Le pied de Création ne paraît qu'en cas de garantie manquée ou
    d'alerte : 40 px, fond de danger ou d'avertissement, filet de 2 px de
    la couleur pleine, icône en pastille pleine, compte en gras puis le
    premier constat, bouton « Vérifier ». Tout tenu : pas de pied.
  - La réserve en bas de page reste celle du pied, qu'il soit visible ou
    non : le contenu ne saute pas. L'annonce `.pied-annonce` reste. Le
    compteur garde la largeur des onglets à 500 px.
  - Le pied de l'onglet Vérification (`pied-de-la-verification`) ne change pas.
  - Fini quand : tests d'interface du compteur (trois états), du pied
    présent ou absent, de la position du contenu stable ; suite du
    workspace verte.

## Vague 2, après U1

- [x] **U2 · L'accueil de Création A2a** · `implementeur`, moyen.
  - Fichiers : `ui/ongletCreation.ts` (l'invitation « Choisissez une
    palette »), `ui/barreDePalette.ts` si la barre doit se masquer,
    styles, i18n, galerie, tests.
  - Quand la recette porte des palettes et qu'aucune n'est ouverte :
    la barre du sélecteur est masquée ; « Nouvelle palette » en bouton
    principal pleine largeur, 40 px ; « Partez d'une couleur de
    référence. » ; « Vos palettes » et son compte ; le nuancier U1, sans
    état. Un clic sur une carte ouvre la palette ; « Nouvelle palette »
    ouvre la création.
  - Le fichier sans palette (« Créez votre première palette ») ne change
    pas.
  - Fini quand : tests d'interface avec trois et vingt palettes (vingt
    cartes en trois rangées à 500 px, sans défilement horizontal), clic
    qui ouvre, bouton qui crée ; état de galerie à vingt palettes.

- [x] **U3 · Vérification sans palette ouverte V3a** ·
  `implementeur-exigeant`, élevé. Dossier, section 4, règles 1 à 7.
  - Fichiers : `ui/ongletVerification.ts`, un module du bilan des palettes
    s'il le faut, styles, i18n, galerie, tests.
  - Le bilan de chaque palette vient des lecteurs existants, sans
    nouveau calcul : les garanties manquées du modèle des garanties
    (`ui/modeleDesGaranties.ts`, `analyserPalette`) et les alertes de la
    palette (`alertesDePalette`) ; les paires trop proches viennent de
    `alertesDeRecette` (`palettes-proches`) et comptent dans « À vérifier ».
  - Les onglets du bilan en forme de bascule, l'onglet actif par défaut,
    les cartes atténuées, le détail en lignes avec « Vérifier » qui ouvre
    la vérification de la palette, l'état « tout est conforme » sans
    onglets : exactement les règles 1 à 7.
  - Le bilan se calcule à l'ouverture de l'onglet et à chaque recette lue,
    pas à chaque rendu. Mesurer le temps sur vingt palettes et le rendre.
  - Fini quand : tests d'interface des trois états de la maquette (à
    corriger actif, à vérifier choisi, tout conforme), du changement
    d'onglet, d'un onglet à zéro absent, du clic « Vérifier » ; état de
    galerie pour chacun.

## Vague 3

- [ ] **U5 · Vérifier et livrer** · `verificateur`, bas, puis
  orchestrateur. Typecheck, `npm test` du workspace et de la racine,
  `test:ui`, captures à 500 px des états U2, U3 et U4. L'orchestrateur
  relit les captures, commite chaque tâche, construit et pousse.

- [ ] **U6 · Les deux nuanciers au même pixel** · `implementeur`, moyen,
  après U5. Le nuancier de l'accueil de Création et celui de Vérification
  sans palette ouverte commencent à la même hauteur, pour que les cartes ne
  bougent pas quand le designer change d'onglet. Un écart fixe ne suffit
  pas : mesurer dans le navigateur le haut de la première carte des deux
  onglets avec la même recette, et régler l'espacement de Vérification
  pour un écart nul, dans l'état « tout est conforme » comme dans l'état à
  onglets, en français et en anglais. Un test d'interface compare les deux
  positions et échoue au premier pixel d'écart.

## Récapitulatif

| Tâche | Agent | Effort | Vague |
|---|---|---|---|
| U1 | `implementeur` | moyen | 1 |
| U4 | `implementeur` | moyen | 1 |
| U2 | `implementeur` | moyen | 2 |
| U3 | `implementeur-exigeant` | élevé | 2 |
| U5 | `verificateur` | bas | 3 |
| U6 | `implementeur` | moyen | 4 |
