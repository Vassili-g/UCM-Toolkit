# Plan d'implémentation : le thème en dossiers et le texte des boutons

## Objet et lecteur

Ce plan s'adresse à l'agent autonome qui l'exécute, l'orchestrateur, et aux
sous-agents auxquels il confie chaque tâche. Il réunit deux chantiers
validés par le mainteneur :

- **le texte des boutons** : blanc ou noir par thème, le thème inversé et sa
  courbe, le format 9 de la recette
  ([dossier](../Plugin%20Palettes/Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md),
  section 9 ; [TEXTE-DES-BOUTONS.html](../Plugin%20Palettes/Texte%20des%20boutons/TEXTE-DES-BOUTONS.html),
  sections 3 et 4) ;
- **le thème en dossiers** : la table du kit passe des huit emplois aux
  dossiers `solid`, `surface` et `page`, avec les changements P1 à P12 et I1
  à I13 de la
  [liste des changements du moteur](../Archi%20Tokens%20Multi-marques/Collection%20usage/CHANGEMENTS-DU-MOTEUR.md),
  validés dans
  [CHANGEMENTS-DU-MOTEUR.html](../Archi%20Tokens%20Multi-marques/Collection%20usage/CHANGEMENTS-DU-MOTEUR.html).

Il remplace le plan du texte des boutons
(`Plugin Palettes/Texte des boutons/PLAN-IMPLEMENTATION-TEXTE-DES-BOUTONS.md`),
écrit sur l'ancienne table : ce plan-ci pose le texte des boutons
directement sur la table en dossiers, pour ne pas écrire deux fois les
lecteurs de la table.

Aucune décision n'y reste ouverte. Une question que le plan ne tranche pas
arrête la tâche, qui la rend à l'orchestrateur ; l'orchestrateur la rend au
mainteneur s'il ne la trouve pas tranchée dans les sources ci-dessus.

## Qui fait quoi

| Agent | Modèle | Effort | Ce qu'il fait |
|---|---|---|---|
| Orchestrateur | Sonnet | élevé | La session que le mainteneur lance sur ce plan. Lance les tâches dans l'ordre, relit chaque diff contre la spécification, compare les captures aux maquettes, commite. N'écrit aucun texte destiné au designer qui ne soit dans ce plan |
| `executant` | Haiku | bas | Une modification mécanique à résultat unique : numéro de version, remplacement listé, renvoi de documentation |
| `implementeur` | Sonnet | moyen | Un module et ses tests sur une spécification fermée |
| `implementeur-exigeant` | Sonnet | élevé | Une tâche qui touche plusieurs lecteurs d'une même règle, ou une interface à reproduire au pixel près |
| `verificateur` | Haiku | bas | Les commandes de vérification, rendues en tableau |

L'effort d'un sous-agent vient de sa définition dans `.claude/agents/`, pas
de l'appel : T0.2 crée les deux définitions qui manquent. Aucune tâche ne
demande Opus. Les maquettes M1 à M3, seules pièces de conception qui
manquent, se font hors de ce plan (section « Porte des maquettes »).

Chaque appel d'agent reçoit : l'identifiant de la tâche, le chemin de ce plan,
les sections de spécification citées par la tâche, la liste des fichiers et
le critère « Fini quand ». Un agent qui doit toucher un fichier hors de sa
liste s'arrête et rend la question.

## Règles de l'exécution

- Travailler sur `main`, sans branche. Commiter par chemins explicites,
  jamais `git add -A` : d'autres sessions travaillent dans le dépôt.
- Ne pas toucher `docs/notes/Recherches/Direction artistique/*`. Les
  dossiers de recherche cités dans « Objet et lecteur » ne se modifient
  qu'à T10.4.
- Commiter à la fin de chaque lot, sauf quand un lot dit de commiter avec le
  suivant. Pousser seulement à T10.6, après `git pull --rebase` et
  `npm run test:ui --workspace ucm-palettes-plugin`.
- Messages de commit au format du dépôt : `feat(kit): …`, `feat(couleur): …`,
  `feat(palettes): …`, `feat(explorateur): …`, `docs(…): …`, terminés par
  la ligne `Co-Authored-By` que la session reçoit.
- Les textes de l'interface viennent des catalogues `src/i18n/` (invariant
  « Langue d'UCM Palettes » d'AGENTS.md). Les noms de variable, comme
  `solid/default`, sont des données de la table, pas des textes.
- Arrêt et retour au mainteneur dans quatre cas seulement :
  1. un critère reste rouge après trois essais ;
  2. un oracle chiffré de S8 diffère de plus de 0,01 ;
  3. la garantie des courbes manque sur une courbe par défaut d'un thème
     normal ;
  4. une maquette de la porte M manque au moment du lot qui la lit.

## Périmètre

Dans le périmètre : le kit (`packages/kit/src/emplois/`, le diagnostic des
couleurs d'`ucm check`), le moteur de couleur (`packages/couleur/`), UCM
Palettes (`packages/plugin-palettes/`), le profil UCM d'UCM Explorateur
(`packages/plugin-explorateur/src/integrations/`), les documents
d'autorité.

Hors périmètre :

- **UCM Palettes n'écrit que les palettes de `primitives`**, à l'endroit fixé
  par sa configuration. Il n'écrit ni `theme`, ni `color-brands`, ni
  `color-utilities` : ces collections se posent à la main dans Figma.
- Le fond des cartes, `elevation/raised` : le plugin n'a pas de réglage pour
  lui et ne mesure rien contre lui (P9).
- Le niveau d'élévation `overlay`, retiré de l'architecture.
- Le Playground : sa migration vers `theme` est un chantier du mainteneur.
- Le bouton plein basculable, dont l'état activé survolé n'a pas de
  variable : question ouverte, décrite dans
  [ARCHITECTURE-FINALE-MULTIMARQUES.md](../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md),
  section 10. Une décision prise pendant l'exécution arrête le plan, qui doit
  être relu avant de continuer.

## Spécification

### S1. Le sens d'un thème

| Thème | Texte des boutons | Sens |
|---|---|---|
| Light | blanc | normal |
| Light | noir | inversé |
| Dark | noir | normal |
| Dark | blanc | inversé |

Blanc vaut `#FFFFFF`, noir `#000000`. Par défaut : blanc en Light, noir en
Dark. Un thème est inversé quand son texte des boutons n'a pas la couleur de
sa page.

### S2. La table des dossiers

Treize variables par palette. `{p}` est le nom de la palette, suivi de son
intensité quand elle en a deux (`success/vivid`).

| Variable | Normal | Inversé |
|---|---|---|
| `solid/default` | 700 | 700 |
| `solid/hover` | 800 | 600 |
| `solid/pressed` | 900 | 500 |
| `solid/foreground` | le texte des boutons | le texte des boutons |
| `surface/default` | 100 | 100 |
| `surface/hover` | 200 | 200 |
| `surface/pressed` | 300 | 300 |
| `surface/foreground` | 800 | 900 |
| `surface/border` | 800 | 900 |
| `page/foreground` | 700 | 800 |
| `page/border` | 700 | 800 |
| `page/divider` | 300 | 300 |
| `page/focus` | 600 | 700 |

Le neutre ajoute, et ne change rien d'autre :

| Variable | Valeur |
|---|---|
| `page/foreground-main` | noir pur en Light, blanc pur en Dark, dans les deux sens |
| `page/foreground-subtle` | le cran de `page/foreground` : 700, 800 inversé |
| `scale/0` | blanc en Light, noir en Dark |
| `scale/1000` | noir en Light, blanc en Dark |
| `disabled/background` | 200 |
| `disabled/foreground` | 500 |
| `disabled/border` | 500 |

`elevation/page` et `elevation/raised` sont hors de toute palette : le kit
les nomme, sans cran.

**Crans requis** (P7) : 100, 200, 300, 600, 700, 800, 900 dans le sens
normal ; les mêmes plus 500 dans le sens inversé. 50, 400 et 950 sont
facultatifs : le plugin les calcule par défaut, une recette peut s'en
passer, aucune variable ni garantie ne les vise. Une variable dont le cran
manque n'est pas présente.

### S3. Les états (P5)

Trois états, `default`, `hover`, `pressed`, nomment les trois fonds de
`solid` et de `surface`. Le repos vise `default`, le survol `hover`,
l'appui `pressed`. Le focus garde le fond du repos et ajoute `page/focus`.
Un état sélectionné prend un autre dossier, au choix du designer : la table
ne lui donne pas de cible. Un composant désactivé prend `disabled/*`.

### S4. Ce que chaque variable peint (P8)

| Variables | Peint | Portées Figma |
|---|---|---|
| `solid/default`, `hover`, `pressed` | fond, contour | `FRAME_FILL`, `SHAPE_FILL`, `STROKE_COLOR` |
| `surface/default`, `hover`, `pressed`, `disabled/background`, `elevation/*` | fond | `FRAME_FILL`, `SHAPE_FILL` |
| `*/foreground`, `page/foreground-main`, `page/foreground-subtle`, `disabled/foreground` | texte, icône | `TEXT_FILL`, `SHAPE_FILL` |
| `*/border`, `page/divider`, `disabled/border` | contour | `STROKE_COLOR` |
| `page/focus` | anneau | `STROKE_COLOR` |
| `scale/*` | rien | aucune |

Les fonds de `solid` portent la portée du contour pour le bouton outlined
survolé, focalisé ou appuyé.

### S5. La courbe inversée

| Nuance | 500 | 600 | 700 | 800 |
|---|---|---|---|---|
| Dark normal | 0,49 | 0,58 | 0,67 | 0,76 |
| Dark inversé | 0,45 | 0,50 | 0,55 | 0,70 |
| Light normal | 0,67 | 0,585 | 0,50 | 0,42 |
| Light inversé | 0,745 | 0,69 | 0,61 | 0,42 |

Les autres nuances ne changent pas. Valeurs identiques pour les deux
préréglages.

Changer le texte des boutons d'un thème remplace ses nuances 500 à 800 par
les valeurs par défaut du sens d'arrivée, dans les deux directions. Les
autres nuances gardent leurs valeurs, réglées ou non. Le remplacement ne
porte que sur les numéros présents dans la liste. Une courbe qui ne reste
pas strictement monotone après remplacement est refusée, et la recette ne
change pas.

Une nuance 500 à 800 est **réglée** quand sa valeur diffère de la valeur
par défaut du sens courant. S'il en existe une, le plugin demande
confirmation avant de remplacer.

### S6. Le format 9 de la recette

- `FORMAT_RECETTE` passe à 9. La recette porte
  `texteDesBoutons: { light: 'blanc' | 'noir', dark: 'blanc' | 'noir' }`.
- Une recette au format 8 se lit : `classerRecette` lui ajoute
  `texteDesBoutons` par défaut, la passe au format 9 et la valide. Son état
  est `courante`. Une recette 8 qui porte déjà `texteDesBoutons` est refusée
  par la règle `forme`.
- Une version inférieure à 8 reste illisible ; une version supérieure à 9
  reste `future`.
- Aucune lecture n'écrit ([REC-04]) : la recette rangée passe au format 9 au
  prochain rangement que fait un geste du designer.
- Nouvelle règle de refus `texte-des-boutons` pour une valeur autre que
  `blanc` ou `noir`.
- La règle `crans-emplois` exige les crans requis pour le sens de chaque
  thème : une recette sans 500 reste lisible tant que ses deux thèmes sont
  normaux, décision du mainteneur. Jusqu'au lot 10, les crans requis du sens normal restent ceux de
  l'ancienne table (`CRANS_DES_EMPLOIS`, qui exige 400 et 950), dont les
  lecteurs vivent encore ; le sens inversé y ajoute 500. T10.1 passe aux
  crans requis de S2, où 50, 400 et 950 deviennent facultatifs.

### S7. Les garanties (P4, P6, P9)

Chaque garantie se juge dans la table du sens du thème, contre le **seul
fond de la page**, le réglage « Fond » du thème (P9). Les seuils viennent de
la recette : `texte` (4,5 par défaut) et `nonTexte` (3).

| N° | Premier membre | Contre | Seuil |
|---|---|---|---|
| G1 | `solid/foreground` | `solid/default`, `hover`, `pressed` | texte |
| G2 | `solid/default` | le fond de la page | nonTexte |
| G3 | `surface/foreground` | `surface/default`, `hover`, `pressed`, le fond de la page | texte |
| G4 | `surface/border` | les mêmes fonds | nonTexte |
| G5 | `page/foreground` | le fond de la page | texte |
| G6 | `page/border` | le fond de la page | nonTexte |
| G7 | `page/focus` | le fond de la page, `surface/default` de sa palette | nonTexte |

- `solid/foreground` vaut le blanc ou le noir purs, dans les deux sens (P6).
  Le fond de la page n'est plus le texte des boutons.
- G2 juge le bouton au repos dans les deux sens, décision du mainteneur.
  L'ancienne paire 14 jugeait le survol dans le thème normal ; au repos, la
  700 y tient à plus de 5:1 de la page.
- Chaque garantie se juge par palette ; aucune ne croise deux palettes.
- Les numéros G1 à G7 identifient les garanties dans ce plan et dans le
  code. L'interface et la planche n'en affichent aucun : une garantie s'y
  nomme par ses variables et son libellé.
- Une garantie dont un cran manque n'est pas jugeable, comme une paire
  aujourd'hui.
- Une référence qui ne porte pas le texte des boutons reste ancrée ; la
  garantie manquée se signale avec le lien « Ajuster la référence ».
- **La garantie des courbes** ([ENT-10]) lit, dans la table du sens de
  chaque mode, le cran de `page/foreground` au seuil `texte` et celui de
  `page/focus` au seuil `nonTexte`, contre le cran le plus clair de la
  liste, gris, comme aujourd'hui. Elle ajoute un contrôle : le cran de
  `solid/default` tient le seuil `texte` contre le texte des boutons du
  mode, pour toute teinte et les deux profils. `ManqueDeGarantie` gagne
  `contre: 'cranLeger' | 'texteDesBoutons'`.

### S8. Oracles chiffrés

Recette par défaut, préréglage Tailwind, profil Vivid, Dark avec texte
blanc :

| Référence | `solid/default` (700) | G1 sur `solid/default` | `solid/hover` (600) |
|---|---|---|---|
| `#2563EB` | `#2563EB`, ancré | 5,17:1 | `#154FE4` |
| `#16A34A` | `#11883D` | 4,55:1 | |
| `#D94635` | ancré sur la 700 | 4,31:1, G1 manquée | |

Sur les quatorze références de la recherche, à une et deux intensités, dans
les quatre thèmes :

- G1 n'échoue que sur la nuance où la référence est ancrée. En Light
  inversé, les références ancrées qui manquent G1 sont `#1E6FD9`,
  `#2563EB`, `#DC2626`, `#9333EA`, `#737373`, de 3,90 à 4,43:1 ; hors
  ancrage, le pire vaut 5,27:1.
- G2 à G6 n'échouent jamais.
- G7 n'échoue que sur `#16A34A`, dont l'anneau est la référence
  ancrée : 600 en Light, 700 en Light inversé.

Les références, les intensités et le protocole sont ceux de
[mesurer-dossiers.ts](../Archi%20Tokens%20Multi-marques/Collection%20usage/mesurer-dossiers.ts).

**La couverture.** Le mainteneur exige que n'importe quelle couleur passe.
[mesurer-couverture.ts](../Plugin%20Palettes/Texte%20des%20boutons/Mesures/mesurer-couverture.ts)
balaie 864 références de toutes teintes, chromas et clartés, en Vivid avec
le préréglage Tailwind. G1 hors nuance ancrée n'y manque jamais, dans les
quatre thèmes :

| Thème | Pire G1 hors ancrage |
|---|---|
| Light, texte blanc | 5,59:1 |
| Dark, texte noir | 5,93:1 |
| Light inversé, texte noir | 4,67:1 |
| Dark inversé, texte blanc | 4,50:1 |

Le Dark inversé tient au ras du seuil : la comparaison passe par
`atteintLeSeuil` du kit, jamais par une valeur arrondie. La garantie des
courbes « pour toute teinte » de S7 rend le même verdict : vide pour les
courbes par défaut.
Un écart de plus de 0,01 arrête la tâche : l'agent relance ce script et
`Mesures/generer-texte-des-boutons.ts` du dossier du texte des boutons, et
rend les valeurs sans corriger le test.

### S9. Les textes destinés au designer

Les sous-agents reprennent ces textes mot pour mot dans `src/i18n/fr.ts` et
`src/i18n/en.ts`. Les nombres se calculent depuis la recette ; ceux des
exemples sont les valeurs par défaut. Si `en.ts` emploie déjà un autre terme
pour le nom d'un écran (« Manage », « Shade lightness »), garder celui de
`en.ts`.

**Le lexique** (I1). Le libellé d'une variable, dans le détail d'une nuance,
les messages et les garanties :

| Variable | Français | Anglais |
|---|---|---|
| `solid/default` | bouton | button |
| `solid/hover` | bouton survolé | button, hovered |
| `solid/pressed` | bouton appuyé | button, pressed |
| `solid/foreground` | texte des boutons | button text |
| `surface/default` | fond teinté | tinted fill |
| `surface/hover` | fond teinté survolé | tinted fill, hovered |
| `surface/pressed` | fond teinté appuyé | tinted fill, pressed |
| `surface/foreground` | texte sur fond teinté | text on tinted fill |
| `surface/border` | contour sur fond teinté | border on tinted fill |
| `page/foreground` | texte coloré | colored text |
| `page/border` | contour | border |
| `page/divider` | filet | divider |
| `page/focus` | anneau de focus | focus ring |
| `page/foreground-main` | corps de texte | body text |
| `page/foreground-subtle` | texte secondaire | secondary text |
| `elevation/page` | fond de la page | page background |

**Les messages hors de l'aperçu** (I7) : le langage courant d'abord, puis
les variables.

| | Forme |
|---|---|
| Français | « {Libellé A}, sur le {libellé B} (`{A}` sur `{B}`) · {Palette}, thème {mode} » |
| Exemple | « Texte sur fond teinté, sur le fond teinté survolé (`surface/foreground` sur `surface/hover`) · Bleu, thème light » |
| Anglais | « {Label A}, on the {label B} (`{A}` on `{B}`) · {Palette}, {mode} theme » |

Dans l'aperçu, le nom de variable reste en premier et le libellé dessous
(S10).

**L'aperçu** (I12) :

| Clé proposée | Français | Anglais |
|---|---|---|
| rôle de `solid` | fond plein | solid fill |
| rôle de `surface` | fond teinté | tinted fill |
| rôle de `page` | sur la page | on the page |
| états | repos · survol · appui | rest · hover · pressed |
| texte et contour | texte · contour | text · border |
| texte et contour du neutre | texte secondaire · contour | secondary text · border |
| `solid/foreground` | texte des boutons | button text |
| `page/divider` | filet | divider |
| `page/focus` | anneau de focus | focus ring |
| note du neutre | corps de texte, noir ou blanc purs, hors de la rampe | body text, pure black or white, outside the ramp |

**Les fonds** (I10) :

| Clé actuelle | Français | Anglais |
|---|---|---|
| `fondDuMode` | Fond de la page, thème Light · Fond de la page, thème Dark | Page background, Light theme · Page background, Dark theme |
| `fondDuTheme` (détail) | Fond de la page | Page background |
| code affiché à côté | `elevation/page` | `elevation/page` |

**Le texte des boutons** (I9) :

| Clé proposée | Français | Anglais |
|---|---|---|
| libellé | Texte des boutons | Button text |
| code affiché à côté | `solid/foreground` | `solid/foreground` |
| segments | Blanc · Noir | White · Black |
| nom du groupe | Texte des boutons du thème {Light} | Button text, {Light} theme |
| effet Dark | Dark inversé. Les nuances 500 à 800 passent à 0,45 · 0,50 · 0,55 · 0,70. Le bouton reste la 700 ; son survol et son appui vont vers la page : 600, 500. | Dark inverted. Shades 500 to 800 move to 0.45 · 0.50 · 0.55 · 0.70. The button stays at 700; its hover and pressed states move toward the page: 600, 500. |
| effet Light | Light inversé. Les nuances 500 à 700 passent à 0,745 · 0,69 · 0,61. Le bouton reste la 700 ; son survol et son appui vont vers la page : 600, 500. | Light inverted. Shades 500 to 700 move to 0.745 · 0.69 · 0.61. The button stays at 700; its hover and pressed states move toward the page: 600, 500. |
| effet commun | Le texte coloré et les contours montent d'une nuance. Les variables de ce thème passeront « À actualiser » dans Gestion. | Colored text and borders move up one shade. This theme's variables will show "Needs update" in Manage. |
| confirmation | Vos luminosités des nuances 500 à 800 en {Dark} seront remplacées par celles de la courbe {inversée / normale}. Les autres nuances gardent vos valeurs. | Your {Dark} lightness values for shades 500 to 800 will be replaced by the {inverted / normal} curve. Other shades keep your values. |
| boutons | Remplacer · Annuler | Replace · Cancel |
| refus | Avec vos valeurs des nuances 400 et 900, la courbe {inversée} ne garde pas l'ordre des nuances. Rétablissez « Luminosité des nuances », puis changez le texte des boutons. | With your values for shades 400 and 900, the {inverted} curve breaks the order of the shades. Reset "Shade lightness", then change the button text. |
| étiquette de ligne | inversé | inverted |
| résumé de la carte des courbes | Courbe inversée : {Dark} | Inverted curve: {Dark} |
| garantie des courbes, quoi | La 700 en {Dark} ne porte pas le texte des boutons {blanc} à {4,5}:1 pour toutes les teintes : {4,12}:1 à {60}°. | Shade 700 in {Dark} does not carry the {white} button text at {4.5}:1 for every hue: {4.12}:1 at {60}°. |
| garantie des courbes, geste (blanc) | Baissez la luminosité de la 700 dans « Luminosité des nuances ». | Lower the lightness of 700 in "Shade lightness". |
| garantie des courbes, geste (noir) | Montez la luminosité de la 700 dans « Luminosité des nuances ». | Raise the lightness of 700 in "Shade lightness". |
| rapport | Texte des boutons : Light {blanc}, Dark {noir} | Button text: Light {white}, Dark {black} |

### S10. L'aperçu de l'onglet Création (I2, I3, I12)

La référence visuelle est la « deuxième version » de
[CHANGEMENTS-DU-MOTEUR.html](../Archi%20Tokens%20Multi-marques/Collection%20usage/CHANGEMENTS-DU-MOTEUR.html),
section « L'aperçu d'UCM Palettes », bloc `#pu-v2`. Ses fonctions
`lignesProposees`, `ordonne`, `etaler`, `bandes`, `rayure` et `specimen`
sont l'algorithme de référence ; les valeurs ci-dessous en sont tirées.

**Ce qui ne change pas** : `.nuancier-surface`, la grille des numéros et des
pastilles, la case tiretée en colonne 2, le repère ◆, l'indice ≈, le focus
tireté et l'anneau de la nuance choisie (`aria-selected`).

**Ce qui change** :

1. `--colonne-profil` passe de 34 à 56 px.
2. Le bloc `.accolades` est remplacé par `.bandes` : `display: grid ; gap:
   3px`. Une `.bande` par dossier, dans l'ordre `solid`, `surface`, `page`.
3. `.bande` : `display: grid ; align-items: center ; column-gap: 3px ;
   row-gap: 2px ; padding: 5px 0 4px ; border-radius: 4px`, la trame de
   colonnes de `.nuancier-grille`. Fond `rgba(30, 30, 30, 0.045)` quand
   l'encre de la surface est sombre, `rgba(237, 237, 237, 0.06)` quand elle
   est claire, selon le même test que `--encre-surface`.
4. **Le spécimen du dossier**, en colonne 1, lignes 1 et 2 de la bande :
   - conteneur `display: grid ; justify-items: center ; align-content:
     center ; gap: 1px` ;
   - `.specimen` : le nom du dossier, police de code 10 px, graisse 500,
     interligne 16 px, `padding: 0 4px`, contour 1 px plein, rayon 4 px ;
   - couleurs, dans l'intensité Vivid quand la palette en a deux, sinon
     l'unique, au thème affiché :

     | Dossier | Fond | Contour | Texte |
     |---|---|---|---|
     | `solid` | `solid/default` | `solid/default` | `solid/foreground` |
     | `surface` | `surface/default` | `surface/border` | `surface/foreground` |
     | `page` | transparent | `page/border` | `page/foreground` (`page/foreground-subtle` pour le neutre) |

   - dessous, le rôle (S9) en 9 px, interligne 11 px, encre seconde de la
     surface, sans retour à la ligne.
5. **La rayure**, qui remplace l'accolade, en ligne 1 de la bande, sous les
   colonnes des nuances qu'elle couvre : une petite pastille par nuance et
   par intensité, peinte de la couleur de cette nuance dans cette rangée.
   `display: grid ; column-gap: 3px ; row-gap: 1px`, une colonne par nuance
   couverte, une rangée par intensité, de 3 px quand la palette a deux
   intensités et de 5 px quand elle en a une. Chaque petite pastille :
   rayon 1 px, liseré intérieur `inset 0 0 0 1px` de `rgba(0, 0, 0, 0.14)`
   sur une surface claire ou `rgba(255, 255, 255, 0.16)` sur une surface
   sombre. Pour `solid/foreground`, une seule petite pastille en colonne 2,
   de la couleur du texte des boutons, haute de 7 px avec deux intensités et
   de 5 px avec une.
6. **Le libellé**, en ligne 2 : le code en police de code 10 px, graisse
   500, puis le nom français en 9 px, interligne 11 px, encre seconde, comme
   `.accolade-libelle` aujourd'hui. Le code est la fin du nom de variable :
   `default · hover · pressed`, `foreground · border`, `divider`, `focus`,
   `foreground`.
7. **Le contenu de chaque bande** :

   | Bande | Accolades, de gauche à droite dans le thème normal | Noms |
   |---|---|---|
   | `solid` | `foreground` (colonne 2) ; `default · hover · pressed` | texte des boutons ; repos · survol · appui |
   | `surface` | `default · hover · pressed` ; `foreground · border` | repos · survol · appui ; texte · contour |
   | `page` | `divider` ; `focus` ; `foreground · border` | filet ; anneau de focus ; texte · contour |

   Pour le neutre, `foreground-subtle · border`, « texte secondaire ·
   contour ». Sous la surface du neutre, une ligne `margin: 4px 0 0 ;
   font-size: 9px ; line-height: 11px`, encre seconde :
   `page/foreground-main · ` suivi de la note du neutre (S9).
8. **L'ordre des états** : dans une accolade de fonds, les codes et leurs
   noms suivent l'ordre des nuances, de gauche à droite. Dans le thème
   inversé, `solid` s'écrit `pressed · hover · default` et « appui · survol
   · repos », sous 500, 600, 700.
9. **La place du libellé** (`etaler`) : dans une bande, les accolades se
   trient par première colonne. L'espace libre entre deux accolades se
   partage, la moitié inférieure à gauche ; l'espace avant la première va à
   la première, celui après la dernière à la dernière. Un libellé qui a de
   l'espace des deux côtés s'étend du même nombre de colonnes de chaque côté
   et se centre ; sinon il s'étend du côté libre et s'aligne du côté de son
   accolade. Un libellé aligné à droite qui touche l'accolade suivante prend
   `padding-right: 12px`.
10. **Le thème affiché** (I3) : les crans suivent la table du sens du thème
    que la bascule « Aperçu » montre.

### S11. Le survol lié (I13)

| Geste | Ce qui se surligne |
|---|---|
| Survoler ou focaliser une pastille de la rampe | Chaque code de variable de ce cran, dans toutes les bandes, avec sa petite pastille ; la pastille du même cran dans l'autre intensité |
| Survoler une petite pastille d'une rayure | Comme la pastille de la rampe de ce cran |
| Survoler un code sous une rayure | Ses pastilles, dans chaque intensité, et ses petites pastilles ; pour `solid/foreground`, la case tiretée |
| Survoler un spécimen de dossier | Les pastilles des crans du dossier ; les autres pastilles de la rampe passent à `opacity: 0.3`, les autres bandes à `opacity: 0.45` |
| Choisir une pastille (clic, Entrée, Espace) | Comme le survol, tant qu'elle reste choisie ; un survol remplace ce surlignage le temps du survol, puis le choix revient |
| Changer le thème affiché ou le texte des boutons | Le surlignage suit la table du nouveau sens |

- Une nuance qu'aucune variable ne prend ne surligne rien.
- Signes, qui ne se confondent ni avec le focus tireté ni avec l'anneau de
  la nuance choisie :
  - pastille : `box-shadow: 0 0 0 1px <fond de la surface>, 0 0 0 3px #A94A1C` ;
  - petite pastille : `0 0 0 1px <fond>, 0 0 0 2px #A94A1C` ;
  - spécimen : comme la pastille ;
  - code : fond `#FFE58A`, texte `#1E1E1E`, rayon 2 px, dans les deux
    thèmes.
- Les bandes restent `aria-hidden` et hors de la tabulation. Au clavier, le
  focus d'une pastille surligne comme le survol, et le détail de la nuance
  choisie nomme ses variables (I5).
- Ni délai ni animation : le surlignage suit le pointeur et s'efface quand il
  quitte la cible.
- L'en-tête de `src/ui/nuancier.ts`, qui dit que « le survol signale
  seulement la cible », se réécrit selon cette section.

### S12. Le diagnostic des contrastes d'`ucm check` (P10)

`ucm check` vérifie que chaque propriété d'un composant a une variable, et
que ces variables existent dans les tokens Figma si l'option est activée.
Il ne juge plus l'usage des couleurs. Le diagnostic des emplois devient le
diagnostic des contrastes :

- Il garde : la lecture du premier alias de chaque couleur dans
  `tokens.json`, la résolution dans chaque combinaison des modes dont elle
  dépend (marque, thème), la règle du fond de la section 2 de
  [FORMAT.md](../../../format/FORMAT.md), le contraste à 8 bits, et une
  couleur hors sRGB ou translucide non jugée.
- Il perd : la collection `usage`, la table, les paires, les rangs, et les
  constats `support`, `paire`, `etat` et hors table.
- Il s'applique à tout `tokens.json`, sans nom de collection imposé.
- Il signale une couleur `foreground` ou `icon` sous 4,5:1, et `border` ou
  `ring` sous 3:1, contre son fond, avec la marque et le thème du contexte.
- Sévérité `info`, jamais `warning` ni `error`. Statut : « Cette information
  ne bloque pas la fusion. » Les autres messages suivent la skill
  `rediger-diagnostics-ucm`.
- Limite écrite dans son en-tête : le contrat ne dit pas si un texte est en
  grand corps, où le seuil descend à 3:1 ; un faux signal reste une
  information.

### S13. Le profil UCM d'UCM Explorateur (P11)

- Couches : `primitives`, `color-brands`, `color-utilities`, `theme`,
  `components`. `brand` devient `color-brands` ; `usage` disparaît.
- Cibles des alias : `components` vise `theme` ; `theme` vise `color-brands`
  ou `color-utilities` ; ces deux-là visent `primitives`.
- Une association rangée qui nomme `brand` se lit `color-brands` ; une qui
  nomme `usage` se lit sans couche.
- Portées : `primitives`, `color-brands` et `color-utilities` sans portée ;
  dans `theme`, chaque variable de dossier porte les portées de S4, et
  `scale/*` aucune.
- Nuance attendue : pour chaque variable de dossier de `theme`, dans chaque
  mode, le cran de S2 dans le sens du mode, lu dans la recette associée
  (`texteDesBoutons`). Le cran visé se lit à la fin du nom de la cible
  (`primary/light/700`). `identity` et `scale/*` ne se jugent pas.
- Les constats gardent la présentation actuelle du profil, comme des
  informations.

## Porte des maquettes

Trois écrans changent de forme sans maquette validée. Leurs lots ne
commencent que si la maquette existe et que le
[README de ce dossier](./README.md) la marque « validée » :

| Maquette | Écran | Changements | Lot |
|---|---|---|---|
| M1 | La carte des garanties, onglet Vérification | I4 : un éventail par texte vers ses fonds, une ligne par garantie, sans numéro, la page puis trois états | 8 |
| M2 | La planche dessinée dans Figma | I6 : une ligne par dossier, chaque variable nommée comme dans `theme`, trois états, les garanties sans numéro, les hexadécimaux et le repère de la référence conservés | 9 |
| M3 | L'Interface de test | I8 : survoler un élément montre la variable qui le peint ; la vue États suit `default`, `hover`, `pressed` | 9 |

Elles sont dans `Maquettes/` : `M1-CARTE-DES-GARANTIES.html`,
`M2-PLANCHE.html`, `M3-INTERFACE-DE-TEST.html`. Chacune montre l'écran
actuel, capturé dans la galerie ou rendu depuis le modèle de la planche,
puis la version proposée, construite avec les styles du plugin, et la liste
argumentée de ce qui change. La version proposée fait foi pour la forme ;
les styles qu'elle ne fixe pas restent ceux du plugin.

## Avant de commencer

- [x] **T0.1** · Orchestrateur. Lire dans [AGENTS.md](../../../../AGENTS.md)
  la carte de `packages/kit/src/emplois/`, `packages/kit/src/lecteurs/`,
  `packages/couleur/`, `packages/plugin-palettes/` et
  `packages/plugin-explorateur/`, puis les invariants « Diagnostics »,
  « Moteur de couleur », « Écriture d'UCM Palettes », « Langue d'UCM
  Palettes », « Interface d'UCM Palettes » et « Explorateur de tokens ».
- [x] **T0.2** · Orchestrateur. Dans `.claude/agents/`, créer
  `executant.md` et `implementeur-exigeant.md` en copiant `implementeur.md`,
  puis changer leur en-tête : `name`, une `description` d'une phrase,
  `model: haiku` et `effort: low` pour `executant`, `model: sonnet` et
  `effort: high` pour `implementeur-exigeant`. Le corps d'`executant`
  ajoute : « Tu ne fais que les modifications listées ; un choix à faire
  t'arrête. » Ajouter `effort: medium` à `implementeur.md`. Commit
  `chore(agents): les efforts de l'exécution`.
- [x] **T0.3** · `verificateur`. État de départ : `npm run typecheck`,
  `npm test`, `npm run test:ui --workspace ucm-palettes-plugin`. Fini
  quand : tableau rendu. Un échec de départ se note et ne s'attribue à aucun
  lot.

## Lot 1. La table des dossiers dans le kit

- [x] **T1.1** · `implementeur`. La table.
  - Fichiers : `packages/kit/src/emplois/dossiers.ts` (nouveau),
    `packages/kit/src/emplois/index.ts`,
    `packages/kit/tests/dossiers.test.ts` (nouveau).
  - Faire, d'après S1 à S4 :
    - `TexteDesBoutons`, `SensDuTheme`, `COULEUR_DU_TEXTE_DES_BOUTONS`,
      `TEXTE_DES_BOUTONS_PAR_DEFAUT`, `sensDuTheme(mode, texte)` ;
    - `DOSSIERS`, `ETATS`, `VARIABLES_DE_PALETTE` (les treize, dans l'ordre
      de S2), `VARIABLES_DU_NEUTRE`, `VARIABLES_GLOBALES` (`disabled/*`),
      `NIVEAUX_D_ELEVATION_DU_THEME` (`page`, `raised`) ;
    - `TABLE_DES_DOSSIERS[sens][variable]` : un cran, ou
      `'texteDesBoutons'` ;
    - `cranDeLaVariable(variable, sens)`, `cransRequis(sens)`,
      `variablePresente(variable, crans, sens)`,
      `variablesDuCran(crans, rang, sens, neutre)` ;
    - `ETAT_DU_FOND` (S3) et `SUPPORT_DES_VARIABLES` (S4).
  - L'ancienne table (`emplois.ts`, `paires.ts`, `rangs.ts`, `usages.ts`)
    reste en place et exportée jusqu'au lot 10.
  - Tests : les quatre combinaisons de S1 ; chaque ligne de S2 dans les deux
    sens ; `cransRequis` ; une variable absente quand son cran manque ;
    `variablesDuCran` sur la 700 en Light normal rend `solid/default`,
    `page/foreground` et `page/border`, et sur la 600 en sens inversé
    `solid/hover` ; les supports de S4.
  - Fini quand : `npm run typecheck` et `npm test --workspace @ucm-kit/core`
    passent.
- [x] **T1.2** · `implementeur`. Les garanties dans le kit.
  - Fichiers : `packages/kit/src/emplois/garanties.ts` (nouveau),
    `index.ts`, `packages/kit/tests/garanties.test.ts` (nouveau).
  - Faire : `GARANTIES`, G1 à G7 de S7, chacune avec son premier membre,
    ses fonds (`{ variable }` ou `{ fondDeLaPage: true }`) et son seuil
    (`texte` ou `nonTexte`) ; `garantieJugeable(garantie, crans, sens)`.
  - Tests : sept garanties ; G1 non jugeable sans 700 ; G2 jugeable sans
    400.
  - Fini quand : `npm test --workspace @ucm-kit/core` passe.
- [x] **T1.3** · `verificateur`. `npm run typecheck`, `npm test`. Fini quand :
  tableau rendu, tout vert.
- [x] **T1.4** · Orchestrateur. Relire le diff contre S1 à S4 et S7 ; commit
  `feat(kit): la table des dossiers solid, surface, page et ses garanties,
  dans les deux sens`.

## Lot 2. Le format 9 et la courbe inversée

- [x] **T2.1** · `implementeur`. Le format 9.
  - Fichiers : `packages/couleur/src/recette.ts`,
    `packages/couleur/tests/recette.test.ts`, `tests/base.test.ts`,
    `tests/nuances.test.ts`, les tests qui écrivent `formatVersion: 8` en
    dur dans `packages/plugin-palettes/tests/` (`importation.test.ts`,
    `lecture.test.ts`, `textes.test.ts`), et le commentaire « format 8 » de
    `packages/plugin-palettes/src/i18n/fr.ts`, ligne des règles de `figees`.
  - Faire : S6 ; commentaires de `FORMAT_RECETTE` et de `classerRecette`.
  - Tests : une recette 8 se lit, état `courante`, `texteDesBoutons` par
    défaut, format 9 ; une recette 8 qui porte `texteDesBoutons` est
    refusée ; 7 illisible ; 10 future ; `gris` refusé par
    `texte-des-boutons` ; une liste sans 500 acceptée en deux thèmes
    normaux, refusée par `crans-emplois` si un thème est inversé ;
    aller-retour d'une recette 9.
  - Fini quand : `npm test` passe dans `ucm-couleur`, `ucm-palettes-plugin`
    et `ucm-explorateur-plugin`.
- [x] **T2.2** · `implementeur`. La courbe inversée.
  - Fichiers : `packages/couleur/src/nuances.ts`, `src/recette.ts`
    (`recetteParDefaut` seulement), `src/index.ts`,
    `tests/nuances.test.ts`.
  - Faire, d'après S5 : `courbesParDefaut(nombre, texteDesBoutons)`, que
    `recetteParDefaut` emploie ; `nuancesReglees(recette, mode)` ;
    `recetteAvecTexteDesBoutons(recette, mode, texte)`, qui rend
    `{ recette, remplacees }` ou `{ refus: 'courbe-non-monotone' }`.
  - Tests : défaut des deux préréglages dans les quatre combinaisons ; Dark
    blanc puis noir rend la courbe de départ ; une 300 réglée reste ; une
    400 réglée à 0,47 en Dark fait refuser le passage au blanc ;
    `nuancesReglees` vide sur la recette par défaut.
  - Fini quand : `npm test --workspace ucm-couleur` passe.
- [x] **T2.3** · `verificateur`. `npm run typecheck`, `npm test`. Fini
  quand : tableau rendu, tout vert.
- [x] **T2.4** · Orchestrateur. Commit `feat(couleur): format 9 de la
  recette, texte des boutons par thème et courbe du thème inversé`.

## Lot 3. Les réglages du texte des boutons et du fond de la page

- [x] **T3.1** · `implementeur`. Le modèle des Réglages communs.
  - Fichiers : `packages/plugin-palettes/src/configuration.ts`,
    `tests/configuration.test.ts`, `tests/reglages.test.ts`.
  - Faire : un champ `{ texteDesBoutons: Mode }` dans le groupe `fonds`,
    posé par `recetteAvecTexteDesBoutons` ; « Rétablir » de « Couleurs de
    fond » remet les fonds, le texte des boutons par défaut et, pour chaque
    thème qui était inversé, les nuances 500 à 800 du sens normal ;
    « Rétablir » de « Luminosité des nuances » remet
    `courbesParDefaut(nombre, recette.texteDesBoutons)`.
  - Tests : les deux Rétablir dans les quatre combinaisons ; le refus de
    courbe non monotone laisse la recette intacte.
  - Fini quand : `npm test --workspace ucm-palettes-plugin` passe.
- [x] **T3.2** · `implementeur-exigeant`. Les cartes « Couleurs de fond »
  et « Luminosité des nuances ».
  - Fichiers : `packages/plugin-palettes/src/ui/configuration.ts`,
    `src/ui/styles.css`, `src/i18n/fr.ts`, `src/i18n/en.ts`.
  - Faire, d'après la maquette de
    [TEXTE-DES-BOUTONS.html](../Plugin%20Palettes/Texte%20des%20boutons/TEXTE-DES-BOUTONS.html),
    section 4, avec les textes de S9 :
    - le fond de chaque thème s'appelle « Fond de la page », avec le code
      `elevation/page` à côté (I10) ;
    - sous lui, le libellé « Texte des boutons », le code
      `solid/foreground`, puis les segments Blanc et Noir, une pastille de
      la couleur dans chaque segment ; le composant de segments est celui
      de `src/ui/champs.ts` ;
    - le message d'effet, `role="status"`, dès qu'un thème est inversé ;
    - la confirmation quand `nuancesReglees` n'est pas vide ; le refus
      dans la zone d'erreur de la carte ;
    - carte « Luminosité des nuances » : l'étiquette « inversé » sur la
      ligne du thème inversé ; les valeurs qui diffèrent du sens normal
      cerclées ; le résumé de S9 ;
    - l'aperçu en tête des Réglages communs suit le texte des boutons.
  - Fini quand : `npm run typecheck`, `npm test --workspace
    ucm-palettes-plugin` et `npm run galerie --workspace
    ucm-palettes-plugin` passent.
- [x] **T3.3** · `implementeur`. Galerie, tests Chromium et variables.
  - Fichiers : `packages/plugin-palettes/galerie/etats.cjs`,
    `tests/interface/interface.test.mjs`, et
    `tests/modeleDesVariables.test.ts` ou `tests/variables.test.ts`, celui
    qui teste la fraîcheur des variables dans Gestion.
  - Faire : un état de galerie par combinaison des Réglages communs, et un
    pour la confirmation d'une courbe réglée ; un test Chromium par
    combinaison, qui vérifie les segments pressés, le message d'effet,
    l'étiquette « inversé », les valeurs de la courbe et les libellés « Fond
    de la page » ; un test qui écrit les variables d'une palette, passe le
    Dark au texte blanc et vérifie que les variables Dark 500 à 800, et
    elles seules, passent « À actualiser ». Si ce dernier test demande du
    code dans `src/ecriture/`, s'arrêter et rendre le diagnostic.
  - Fini quand : `npm run test:ui --workspace ucm-palettes-plugin` passe.
- [x] **T3.4** · `verificateur`. `npm run typecheck`, `npm test`,
  `npm run test:ui --workspace ucm-palettes-plugin`. Fini quand : tableau
  rendu, tout vert.
- [x] **T3.5** · Orchestrateur. Ouvrir les états de T3.3 dans la galerie et
  les comparer à la maquette de la section 4 ; commit `feat(palettes): le
  texte des boutons se règle par thème, sous le fond de la page`.

## Lot 4. L'aperçu en bandes et le survol lié

- [x] **T4.1** · `implementeur-exigeant`. L'aperçu.
  - Fichiers : `packages/plugin-palettes/src/presentation.ts`
    (`accoladesDe` remplacée par les bandes), `src/ui/nuancier.ts`,
    `src/ui/styles.css`, `src/i18n/fr.ts`, `src/i18n/en.ts`,
    `tests/presentation.test.ts`.
  - Faire : S10 et S11, avec `TABLE_DES_DOSSIERS`, `variablesDuCran` et
    `sensDuTheme` du lot 1. La case tiretée prend le texte des boutons du
    thème affiché.
  - Tests : le contenu des bandes et la place des libellés pour une palette
    à une et à deux intensités, dans les quatre combinaisons ; l'ordre
    `pressed · hover · default` dans le sens inversé ; la bande du neutre ;
    les crans surlignés pour chaque geste de S11.
  - Fini quand : `npm run typecheck` et `npm test --workspace
    ucm-palettes-plugin` passent.
- [x] **T4.2** · `implementeur`. Le contrôle de fidélité.
  - Fichiers : `packages/plugin-palettes/galerie/comparer-maquette.cjs`
    (nouveau), `galerie/etats.cjs`.
  - Faire, sur le modèle de
    `packages/plugin-explorateur/galerie/comparer-maquette.cjs` : ouvrir
    l'aperçu dans la galerie et le bloc `#pu-v2` de la maquette, avec la
    même palette, le même thème et le même texte des boutons (une palette à
    deux intensités en Light normal ; une à une intensité en Dark inversé ;
    le neutre en Light). Comparer par `getComputedStyle`, sans tolérance :
    polices, tailles, graisses, interlignes, couleurs d'encre, fonds des
    bandes, rayons, `padding`, `gap`, hauteurs des rayures, largeur de la
    colonne de profil, textes des codes et des noms. Comparer par
    `getBoundingClientRect`, à 1 px près, l'alignement de chaque petite
    pastille sur la pastille de son cran, dans chaque page. Les couleurs des
    nuances ne se comparent pas : les palettes diffèrent. Imprimer chaque
    écart ; sortir en erreur s'il y en a un.
  - Fini quand : le script tourne et n'imprime aucun écart.
- [x] **T4.3** · `implementeur`. Galerie et tests Chromium.
  - Fichiers : `packages/plugin-palettes/galerie/etats.cjs`,
    `tests/interface/interface.test.mjs`.
  - Faire : les états de T4.2 ; un test Chromium par geste de S11, qui
    vérifie les classes posées, et un qui vérifie l'absence de défilement
    horizontal à 500 px en français et en anglais.
  - Fini quand : `npm run test:ui --workspace ucm-palettes-plugin` passe.
- [x] **T4.4** · `verificateur`. `npm run typecheck`, `npm test`,
  `npm run test:ui --workspace ucm-palettes-plugin`,
  `node packages/plugin-palettes/galerie/comparer-maquette.cjs`. Fini
  quand : tableau rendu, tout vert.
- [x] **T4.5** · Orchestrateur. Ouvrir les captures côte à côte rangées par
  T4.2 ; commit `feat(palettes): l'aperçu en bandes solid, surface, page,
  et le survol lié entre pastilles et variables`.

## Lot 5. Le diagnostic des contrastes d'`ucm check`

- [x] **T5.1** · `implementeur`. Le diagnostic.
  - Fichiers : `packages/kit/src/lecteurs/diagnostic-emplois.mjs`, renommé
    `diagnostic-contrastes.mjs` par `git mv`,
    `packages/kit/tests/diagnostic-emplois.test.mjs`, renommé
    `diagnostic-contrastes.test.mjs` par `git mv`,
    `src/lecteurs/controle-repository.mjs`, `src/lecteurs/index.mjs`,
    `src/lecteurs/navigateur.mjs`.
  - Faire : S12. Les exports deviennent `constatsDesContrastes`,
    `sectionContrastes` et `resumeTerminalContrastes` ;
    `porteLaTableDesEmplois` disparaît.
  - Tests : un contrat dont le texte tombe sous 4,5:1 dans un seul
    contexte de marque et de thème ; un anneau sous 3:1 ; un contrat
    conforme sans constat ; un `tokens.json` sans aucune collection nommée
    `usage` ni `theme` ; une couleur Display P3 et une translucide non
    jugées ; la sévérité `info` ; la section et le terminal ; le rapport
    d'un repository jouet.
  - Fini quand : `npm test --workspace @ucm-kit/core` et `npm test
    --workspace @ucm-kit/cli` passent.
- [x] **T5.2** · `executant`. Les renvois.
  - Fichiers : [FORMAT.md](../../../format/FORMAT.md), section 2 ;
    `AGENTS.md` (carte de `lecteurs/`, invariant des diagnostics) ;
    `docs/guides/RECETTE.md` ; `packages/cli/README.md` ;
    [PLAN-INTEGRATION-ARCHITECTURE.md](../Archi%20Tokens%20Multi-marques/PLAN-INTEGRATION-ARCHITECTURE.md),
    lot A4.
  - Faire : dans FORMAT.md, la dernière phrase du paragraphe « Le fond
    d'une couleur se lit sur ces chemins » devient : « Le contrat ne publie
    rien de plus pour cela : `ucm check` applique cette règle pour mesurer
    le contraste d'une couleur contre son fond. » Ailleurs, remplacer chaque
    mention du diagnostic des emplois par celle du diagnostic des
    contrastes, en reprenant les phrases de S12. Sous le titre du lot A4,
    ajouter : « Remplacé par le lot 5 du
    [plan du thème en dossiers](../Th%C3%A8me%20en%20dossiers%20et%20texte%20des%20boutons/PLAN-IMPLEMENTATION.md) :
    le diagnostic ne garde que la mesure des contrastes. »
  - Fini quand : `node scripts/controle-style.mjs <fichier>` rend « Style
    conforme » pour chaque fichier Markdown touché, et `npx vitest run
    tests/docLinks.test.ts` ne relève aucun lien de ces fichiers.
- [x] **T5.3** · `verificateur`. `npm run typecheck`, `npm test`. Fini
  quand : tableau rendu, tout vert.
- [x] **T5.4** · Orchestrateur. Commit `feat(kit): ucm check mesure les
  contrastes des composants, sans table ni collection imposée`.

## Lot 6. Le profil UCM d'UCM Explorateur

- [x] **T6.1** · `implementeur`. Le profil.
  - Fichiers : `packages/plugin-explorateur/src/integrations/profilUcm.ts`,
    `src/integrations/palettes.ts`, `src/preferences.ts`,
    `src/ui/textes.ts`, `src/ui/vues/integrations.ts`,
    `galerie/comparer-maquette.cjs` si son import casse, et leurs tests.
  - Faire : S13, avec `TABLE_DES_DOSSIERS`, `SUPPORT_DES_VARIABLES` et
    `sensDuTheme` du lot 1. Les textes qui nomment `brand` ou `usage`
    nomment `color-brands` ou disparaissent. Si le profil contrôle
    aujourd'hui les états d'un composant, ce contrôle suit S3 ; sinon il
    n'en ajoute pas.
  - Tests : un fichier à la forme du fichier remappé (`theme` aliasé vers
    `color-brands` et `color-utilities`) ne rend aucun constat ; un alias
    de `primary/solid/hover` vers la 700 en Light rend un constat de
    nuance ; en Dark inversé, la 600 est attendue ; une variable de dossier
    sans portée rend un constat ; une association rangée `brand` se lit
    `color-brands`.
  - Fini quand : `npm run typecheck` et `npm test --workspace
    ucm-explorateur-plugin` passent.
- [x] **T6.2** · `verificateur`. `npm run typecheck`, `npm test`,
  `npm run test:ui --workspace ucm-explorateur-plugin`. Fini quand :
  tableau rendu, tout vert.
- [x] **T6.3** · Orchestrateur. Commit `feat(explorateur): le profil UCM
  suit l'architecture en dossiers de theme`.

## Lot 7. Les garanties dans le moteur

**Porte** : M1 doit être validée. Sinon, l'orchestrateur s'arrête ici, rend
les lots 1 à 6 et la porte qui manque.

- [x] **T7.1** · `implementeur-exigeant`. Les garanties.
  - Fichiers : `packages/couleur/src/promesses.ts`, `garantie.ts`,
    `alertes.ts`, `index.ts`, leurs tests (`promesses.test.ts`,
    `alertes.test.ts`, le test de la garantie des courbes).
  - Faire, d'après S7 :
    - `verifierPromesses` juge G1 à G7 par palette, dans la table du sens de
      chaque mode ;
    - `Designation` gagne la nature `'texteDesBoutons'` ; `'fond'` ne
      désigne plus que le fond de la page ;
    - la garantie des courbes de S7 ;
    - `alertes.ts` lit les crans par `cranDeLaVariable`.
  - Tests : les oracles de S8 ; sept garanties ; aucun échec de G1 hors
    nuance ancrée sur les quatorze références dans les quatre
    combinaisons ; la garantie des courbes vide pour les courbes par défaut
    dans les quatre combinaisons.
  - Fini quand : `npm test --workspace ucm-couleur` passe. Les erreurs de
    type de `packages/plugin-palettes` se corrigent au lot 8 : les noter,
    ne pas les corriger ici.
- [x] **T7.2** · `verificateur`. `npm test --workspace ucm-couleur`,
  `npm run typecheck`, puis `npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/Collection usage/mesurer-dossiers.ts"`
  pour vérifier que le script tourne encore, sans commiter sa sortie ; enfin
  `npx tsx "docs/notes/Recherches/Plugin Palettes/Texte des boutons/Mesures/mesurer-couverture.ts"`,
  sans commiter sa sortie, comparée à la couverture de S8 : zéro échec hors ancrage
  dans chaque thème, et chaque pire à 0,01 près. Fini quand : tableau rendu,
  avec la liste des erreurs de type du plugin.
- [x] **T7.3** · Orchestrateur. Pas de commit : enchaîner le lot 8.

## Lot 8. Les lecteurs du plugin et la carte des garanties

- [x] **T8.1** · `implementeur-exigeant`. La carte des garanties et les
  messages.
  - Fichiers : `packages/plugin-palettes/src/ui/garanties.ts`,
    `src/ui/messagesDePalette.ts`, `src/ui/constats.ts`,
    `src/ui/piedDeLaPalette.ts`, `src/ui/styles.css`, `src/i18n/fr.ts`,
    `src/i18n/en.ts`, leurs tests.
  - Faire : la carte d'après M1 ; les messages d'après S9 (I7) ; la
    garantie des courbes avec les textes de S9 ; une garantie manquée sur
    la nuance ancrée propose « Ajuster la référence ».
  - Fini quand : `npm test --workspace ucm-palettes-plugin` passe pour ces
    fichiers.
- [x] **T8.2** · `implementeur-exigeant`. Les autres lecteurs.
  - Fichiers : `packages/plugin-palettes/src/presentation.ts`,
    `src/ui/nuancier.ts` (le détail d'une nuance), `src/ui/specimens.ts`,
    `src/ui/apercuCompact.ts`, `src/ui/ajustement.ts`,
    `src/ajustementDeLaReference.ts`, `src/rapport.ts`,
    `src/importation.ts`, `src/i18n/fr.ts`, `src/i18n/en.ts`, et leurs tests
    (`presentation.test.ts`, `apercuEtInterfaceDeTest.test.ts`,
    `ajustement.test.ts`, `rapport.test.ts`, `textes.test.ts`).
  - Faire :
    - chaque lecteur prend le sens du thème affiché et lit
      `TABLE_DES_DOSSIERS`, `variablesDuCran` et `GARANTIES` ; aucun ne
      relit l'ancienne table ;
    - le lexique de S9 remplace `NOM_DU_ROLE`, `NOM_DE_L_EMPLOI`,
      `NOM_DE_L_ETAT` et `ROLE_DANS_LA_PHRASE` (I1) ;
    - le détail d'une nuance liste les variables qu'elle porte dans le thème
      affiché, code puis libellé, et ses contrastes contre le fond de la
      page, le blanc et le noir (I5) ; la case du texte des boutons
      s'appelle `solid/foreground` ;
    - les spécimens peignent le texte des boutons en blanc ou noir purs ;
    - le rapport nomme les garanties par leurs variables et porte la ligne
      « Texte des boutons » de S9 ; l'import lit le format 9 (I11).
  - Si la planche ou l'Interface de test ne compilent plus, les adapter au
    minimum, sans changer leur dessin : leur refonte est au lot 9.
  - Fini quand : `npm run typecheck` et `npm test --workspace
    ucm-palettes-plugin` passent, `loiDesTextes.test.ts` et `i18n.test.ts`
    compris.
- [x] **T8.3** · `implementeur`. Galerie et tests Chromium.
  - Fichiers : `packages/plugin-palettes/galerie/etats.cjs`,
    `tests/interface/interface.test.mjs`.
  - Faire : les états de M1, dont la carte en Dark inversé avec G1 manquée
    sur `#D94635` ; un test Chromium qui vérifie les sept lignes, sans numéro, et le
    lien « Ajuster la référence ».
  - Fini quand : `npm run test:ui --workspace ucm-palettes-plugin` passe.
- [x] **T8.4** · `verificateur`. `npm run typecheck`, `npm test`,
  `npm run test:ui --workspace ucm-palettes-plugin`. Fini quand : tableau
  rendu, tout vert.
- [x] **T8.5** · Orchestrateur. Comparer la galerie à M1 ; commit des lots 7
  et 8 ensemble : `feat(couleur, palettes): les garanties de la
  table en dossiers, et le vocabulaire de theme dans le plugin`.

## Lot 9. La planche et l'Interface de test

**Porte** : M2 et M3 doivent être validées. Sinon, l'orchestrateur passe au
lot 10 sans retirer l'ancienne table (T10.1 attend) et rend la porte qui
manque.

- [x] **T9.1** · `implementeur`. La planche.
  - Fichiers : `packages/plugin-palettes/src/planche/modele.ts`,
    `src/planche/textes.ts`, `tests/modeleDePlanche.test.ts`,
    `tests/fraicheur.test.ts`.
  - Faire : la planche d'après M2, dans le sens de chaque mode (I6). Les
    textes de la planche restent en français (invariant « Langue d'UCM
    Palettes »).
  - Tests : le modèle dans les quatre combinaisons ; changer le texte des
    boutons du Dark change l'empreinte, donc la planche passe « À
    actualiser ».
  - Fini quand : `npm test --workspace ucm-palettes-plugin` passe.
- [x] **T9.2** · `implementeur`. L'Interface de test.
  - Fichiers : `packages/plugin-palettes/src/ui/interfaceDeTest.ts`,
    `src/ui/styles.css`, `src/i18n/fr.ts`, `src/i18n/en.ts`,
    `tests/apercuEtInterfaceDeTest.test.ts`.
  - Faire : l'écran d'après M3 (I8).
  - Fini quand : `npm test --workspace ucm-palettes-plugin` passe.
- [x] **T9.3** · `implementeur`. Galerie et tests Chromium des écrans de M2
  et M3. Fichiers : `galerie/etats.cjs`,
  `tests/interface/interface.test.mjs`. Fini quand : `npm run test:ui
  --workspace ucm-palettes-plugin` passe.
- [x] **T9.4** · `verificateur`. `npm run typecheck`, `npm test`,
  `npm run test:ui --workspace ucm-palettes-plugin`. Fini quand : tableau
  rendu, tout vert.
- [x] **T9.5** · Orchestrateur. Comparer la galerie à M2 et M3 ; commit
  `feat(palettes): la planche et l'Interface de test parlent en dossiers`.

## Lot 10. Le retrait de l'ancienne table, les documents, la publication

- [x] **T10.1** · `implementeur`. Le retrait de l'ancienne table.
  - Préalable : `git grep` ne trouve plus, hors de `packages/kit/src/emplois/`
    et de ses tests, aucun import de `EMPLOIS`, `TABLE_DES_EMPLOIS`,
    `CRANS_DES_EMPLOIS`, `PAIRES`, `RANGS`, `CIBLE_DE_L_ETAT`,
    `usagesDeLaPalette` ni des autres exports d'`emplois.ts`, `paires.ts`,
    `rangs.ts` et `usages.ts`, sauf dans `packages/couleur/scripts/`.
    Sinon, s'arrêter et rendre la liste.
  - Fichiers : ces quatre modules, `index.ts`, `packages/kit/tests/emplois.test.ts`,
    `packages/couleur/src/recette.ts`, `packages/couleur/tests/recette.test.ts`,
    `packages/couleur/scripts/mesurer-ancrage.mjs`,
    `mesurer-limites.mjs`.
  - Faire : retirer les quatre modules et leur test ; `contraste.ts` reste ;
    la règle `crans-emplois` de `packages/couleur/src/recette.ts` lit
    `cransRequis` (S2, P7) ; adapter les deux scripts de mesure à la
    nouvelle table, même forme de sortie.
  - Tests : dans `packages/couleur/tests/recette.test.ts`, une liste sans
    50, 400 ni 950 acceptée dans les quatre combinaisons, sans 500 refusée
    dès qu'un thème est inversé.
  - Fini quand : `npm run typecheck`, `npm test` et les deux scripts
    passent.
- [x] **T10.2** · `executant`. Les versions.
  - Fichiers : `packages/kit/package.json`, `packages/cli/package.json`,
    `packages/adapter-typescript/package.json`, les README qui citent ces
    versions, `package-lock.json`.
  - Faire : `@ucm-kit/core` 0.4.0 → 0.5.0 ; `@ucm-kit/cli` 0.1.53 →
    0.1.54 et `@ucm-kit/adapter-typescript` 0.1.46 → 0.1.47, chacun
    épinglant `@ucm-kit/core` 0.5.0 à l'exact ; `npm install`.
  - Fini quand : `npm run build` passe.
- [x] **T10.3** · `implementeur`. Les documents d'autorité (P12).
  - Fichiers : `AGENTS.md` (carte de `emplois/`, `nuances.ts`,
    `profilUcm.ts` ; invariants « Moteur de couleur », « Interface d'UCM
    Palettes », « Explorateur de tokens ») ;
    `docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`
    (`[REC-03]`, `[ENT-10]`, section 11.2) ;
    `docs/notes/Recherches/Archi Tokens Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md`,
    sections 4 et 5 ; la question du bouton plein basculable, en section 10,
    reste tant que le mainteneur ne l'a pas tranchée.
  - Faire : charger d'abord la skill `rediger-sans-tics-ia`. Écrire les
    faits de S1 à S7 là où le document décrit déjà la table, le format et
    les garanties : la table en dossiers et ses deux sens, les crans requis,
    le format 9 qui lit le format 8, `solid/foreground` blanc ou noir, les
    garanties contre le fond de la page, la garantie des courbes,
    le diagnostic des contrastes, le profil d'UCM Explorateur.
  - Fini quand : `node scripts/controle-style.mjs <fichier>` rend « Style
    conforme » pour chaque fichier, et chaque lien relatif ajouté mène à un
    fichier existant.
- [x] **T10.4** · `executant`. Les états des dossiers de recherche.
  - Fichiers : le README de ce dossier, celui de
    `Archi Tokens Multi-marques/Collection usage/` et celui de
    `Plugin Palettes/Texte des boutons/`.
  - Faire : chacun passe à l'état « implémenté » et renvoie à ce plan.
  - Fini quand : le contrôle de style passe sur les trois fichiers.
- [x] **T10.5** · `verificateur`. `npm run typecheck`, `npm test`,
  `npm run build`, `npm run test:ui --workspace ucm-palettes-plugin`,
  `npm run test:ui --workspace ucm-explorateur-plugin`,
  `node packages/plugin-palettes/galerie/comparer-maquette.cjs`, contrôle de
  style, `npx vitest run tests/docLinks.test.ts`. Fini quand : tableau
  rendu, tout vert hors des échecs notés à T0.3.
- [x] **T10.6** · Orchestrateur. Commits `refactor(kit): l'ancienne table
  des emplois se retire`, `chore: versions` et `docs: le thème en dossiers
  et le texte des boutons`. `git pull --rebase`, `test:ui`, puis push sur
  `main`.
- [x] **T10.7** · Orchestrateur. Publier `@ucm-kit/core`, puis
  `@ucm-kit/cli`, puis `@ucm-kit/adapter-typescript`, selon
  [AGENTS.md, « Publier les paquets »](../../../../AGENTS.md#publier-les-paquets),
  en attendant la fin de chaque exécution.
- [x] **T10.8** · Orchestrateur. Rendre au mainteneur : les commits, les
  portes franchies ou non, la recette Figma à faire (réglage du texte des
  boutons, planches, variables « À actualiser » dans Gestion, profil d'UCM
  Explorateur sur le fichier remappé, `ucm check` sur le Playground), et
  les écarts relevés pendant l'exécution.

## Suivi de l'exécution

Mis à jour par l'orchestrateur à chaque lot.

| Lot | État | Commit |
|---|---|---|
| Départ | T0.2 fait ; T0.3 remplacé par la vérification du lot 2 | f6acbd0 |
| 1. Table du kit | commité | c771604 |
| 2. Format 9 et courbe | commité | 7a1f29a |
| 3. Réglages | commité | 003f971 |
| 4. Aperçu | commité | cd4700c |
| 5. `ucm check` | commité | 22eb44f |
| 6. Explorateur | commité | 9c55ca6 |
| 7. Garanties | commité avec le lot 8 ; portes M1 à M3 validées | e1a8d73 |
| 8. Lecteurs et carte | commité | e1a8d73 |
| 9. Planche et Interface de test | commité | 6014870 |
| 10. Retrait et publication | poussé ; `@ucm-kit/core` 0.5.0, `@ucm-kit/cli` 0.1.54 et `@ucm-kit/adapter-typescript` 0.1.47 publiés | 684215b, 65ba56f, 3c05069 |

**Décisions prises pendant l'exécution**, dans le cadre du plan :

- Lot 2 : `intensites.test.ts` attendait le format 8 en dur ; il attend
  maintenant 9.
- Lot 3 : « Rétablir » de « Couleurs de fond » remet le texte des boutons
  sans confirmation : c'est un retour aux valeurs par défaut, et le plan ne
  demande de confirmation que pour les segments. Si ce retour rend une courbe
  non monotone, la carte affiche le refus de S9 et la recette ne change pas.
- Lot 3 : l'aperçu en tête des Réglages communs suit déjà la courbe inversée
  par ses rampes. Les trois boutons peints de la maquette du texte des
  boutons passent à T8.2, qui touche `apercuCompact.ts`.
- Lot 3 : `en.ts` dit « Update needed », le terme qu'il employait déjà, au
  lieu de « Needs update ».
- Lot 4 : le plugin reconnaît la palette du neutre à son nom, `neutral`, sans
  casse, comme UCM Explorateur et l'architecture.
- Lot 4 : les couleurs de surlignage s'écrivent en `rgb()` dans la feuille de
  style, que la loi `stylesUi` interdit d'hexadécimaux.
- Lot 4 : à la largeur minimale de la fenêtre, 500 px, un libellé qui ne
  tient pas dans sa plage passe à la ligne après un « · », au lieu de
  chevaucher son voisin ou de sortir de la bande. À la largeur de `#pu-v2`,
  le rendu ne change pas.
- Lot 4 : `comparer-maquette.cjs` accepte trois écarts nommés dans son
  en-tête : l'encre claire de la surface en Dark, que l'aperçu compact
  partage ; la note du neutre posée dans la surface ; le retour à la ligne
  des libellés. Le survol d'un spécimen allume aussi les petites pastilles
  des rayures, comme dans `#pu-v2`.
- Lot 5 : le test [A4] de `controleRepository.test.mjs`, qui attendait
  l'avertissement de la table des emplois, vérifie maintenant qu'une
  collection `usage` n'est plus jugée. `ROADMAP.md` a reçu la même mise à
  jour que les fichiers de T5.2.
- Lot 6 : `palettes.ts` d'UCM Explorateur lisait aussi l'ancienne table pour
  l'inspecteur ; il lit `variablesDuCran`.
- Lot 8 : la carte des garanties a son modèle sans DOM,
  `src/ui/modeleDesGaranties.ts`, testé à part ; une ligne porte
  `data-garantie` avec le numéro, qui n'est jamais affiché.
- Lot 8 : le rapport est un JSON sans langue. Il passe au format 4 : chaque
  promesse nomme sa garantie par ses variables, et le rapport porte le champ
  `texteDesBoutons`. La ligne « Texte des boutons » de S9 n'a pas d'écran où
  s'afficher ; l'import nomme le paramètre « Texte des boutons ».
- Lot 8 : l'interface tronque les contrastes à deux décimales : la G1 manquée
  de `#D94635` s'affiche 4,30:1 pour 4,3052, que S8 arrondit à 4,31.
- Lot 8 : dans la modale « Ajuster la référence », une garantie passe à la
  ligne entre ses deux variables, jamais dans un nom : la paire la plus longue,
  `surface/foreground` sur `surface/pressed`, ne tient pas dans la colonne.
- Lot 8 : l'aperçu compact ne peint ses trois boutons que dans les Réglages
  communs ; la fiche de Gestion et les cartes d'intensité ne changent pas.
- Lot 9 : M3 peint le focus du bouton plein et du bouton sans fond sur
  `hover`, et celui du bouton contour en plein ; S3 et la liste des
  changements de M3 disent que le focus garde le fond du repos. L'Interface de
  test suit S3 : le focus garde la forme du repos et ajoute `page/focus`.
- Lot 9 : la planche montre aussi, sous `surface/default`, les garanties de
  `surface/foreground` et `surface/border` contre la page, que M2 ne dessine
  pas : G3 et G4 les jugent, et leur échec compte dans le verdict du thème.
- Lot 9 : la galerie ne rend pas le dessin de la planche ; la planche se
  vérifie par les tests de son modèle, dans les quatre combinaisons.
- Lot 10 : `rangDuCranLeger` passe dans `dossiers.ts` ; il rend l'indice du
  plus petit numéro de la liste. `loiDePurete.test.ts` attend quatre modules
  dans `kit/src/emplois/` au lieu de cinq. L'alerte `fond-hors-courbe` dit « la
  nuance la plus claire » au lieu de « la nuance 50 ».
- Lot 10 : les notes de recherche qui liaient les modules retirés (`emplois.ts`,
  `paires.ts`, `rangs.ts`, `usages.ts`, `diagnostic-emplois.mjs` et leurs
  tests) gardent le nom sans le lien.
- Lot 10 : la publication exécute `npm test` en entier ; deux liens morts
  laissés par d'autres sessions (`ROADMAP.md` vers le bilan des propriétés
  visuelles, `Plugin Palettes/README.md` vers la maquette de la liste
  dépliable) la bloquaient. Ils gardent leur texte sans le lien.
- Lot 10 : les agents ont réécrit plusieurs fichiers en CRLF ; ils sont
  revenus en LF avant chaque commit, la planche par un commit à part.
- Lot 9 : `npm run galerie` et `test:ui` ne reconstruisent que `dist/ui.html`.
  Le mainteneur a vu un plugin vide dans Figma, `dist/code.js` datant d'avant
  le format 9 ; `npm run build` l'a réparé. Chaque lot se termine désormais par
  ce build.
- Lot 8 : l'état de galerie `garantie-en-echec` et ses voisins passent le texte
  des boutons du Light au noir : la 700 à 0,55 ne fait plus rien manquer avec
  les sept garanties.

**Écarts relevés, à reprendre plus loin :**

- `ARCHITECTURE-FINALE-MULTIMARQUES.md`, sections 1, 2 et 6, et les sections
  13 de `RECHERCHE-PLUGIN-PALETTES.md` décrivent encore l'ancienne forme
  (collections `brand` et `usage`, `on-solid`, `surface-card`, 400 et 950
  requis) : T10.3 ne citait que les sections 4, 5, 11.2 et les exigences
  nommées. À mettre à jour sur décision du mainteneur.
- `[VER-11]` a perdu le chiffre « 249 teintes », mesuré sur l'ancienne table ;
  il reste à remesurer.

- Jusqu'à T10.2, `versionSuitLeContenu.test.mjs` échoue : `@ucm-kit/core` et
  `@ucm-kit/cli` ont changé sans relever leur numéro.
- `docLinks.test.ts` relève aussi des liens morts laissés par d'autres
  sessions (Direction artistique, Commandes d'affichage, Liste dépliable,
  Diagnostics d'un composant réel), hors de ce plan.

- À relire par le mainteneur, textes que S9 ne fixe pas : `aideSeuilTexte` et
  `aideSeuilNonTexte` des Réglages communs ; la colonne « Garantie » et la
  phrase « trop claire pour « anneau de focus » (page/focus) » de la modale
  d'ajustement ; la butée du Color shift, en variables seules faute de place.
- L'alerte `fond-hors-courbe` dit encore « plus sombre que la nuance 50 » ;
  la 50 devient facultative au lot 10.

## Récapitulatif des appels

| Lot | `executant` (Haiku, bas) | `implementeur` (Sonnet, moyen) | `implementeur-exigeant` (Sonnet, élevé) | `verificateur` (Haiku, bas) |
|---|---|---|---|---|
| Départ | | | | T0.3 |
| 1. Table du kit | | T1.1, T1.2 | | T1.3 |
| 2. Format 9 et courbe | | T2.1, T2.2 | | T2.3 |
| 3. Réglages | | T3.1, T3.3 | T3.2 | T3.4 |
| 4. Aperçu | | T4.2, T4.3 | T4.1 | T4.4 |
| 5. `ucm check` | T5.2 | T5.1 | | T5.3 |
| 6. Explorateur | | T6.1 | | T6.2 |
| 7. Garanties | | | T7.1 | T7.2 |
| 8. Lecteurs et carte | | T8.3 | T8.1, T8.2 | T8.4 |
| 9. Planche et Interface de test | | T9.1, T9.2, T9.3 | | T9.4 |
| 10. Retrait et publication | T10.2, T10.4 | T10.1, T10.3 | | T10.5 |

Trois appels Haiku pour modifier, onze pour vérifier ; seize appels Sonnet
à effort moyen, cinq à effort élevé. Les lots 1 à 6 ne dépendent
d'aucune maquette à faire ; les lots 7 à 9 attendent M1 à M3.
