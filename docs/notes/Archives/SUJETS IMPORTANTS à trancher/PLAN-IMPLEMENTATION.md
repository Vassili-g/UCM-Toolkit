# Plan d'implémentation : crans clairs, texte de surface, variables et scopes

Ce plan applique les décisions prises dans le [README](./README.md), section
« Décisions ». Chaque lot part à un agent seul. L'agent ne voit pas la
conversation : son prompt contient la note du lot, la sortie de
`npm run agents:lire -- <fichiers du lot>` et les critères de fin.

## Périmètre

Dans le plan :

| Décision | Effet |
|---|---|
| Clarté commune des crans clairs, courbe actuelle | Moteur |
| Texte et contour de `surface` à 700 en Light normal | Kit |
| Correction du 700 par teinte au survol ; référence au 700 : « Ajuster la référence » | Moteur, Palettes |
| Noms actuels, plus `surface/subtle` et `surface/divider` | Kit, Palettes, Architect |
| Crans des deux variables : 50 et 300 en Light, 200 et 500 en Dark | Kit |
| `surface/subtle` dans les garanties 3 et 4 ; `surface/divider` sans garantie | Kit |
| Appui de `surface` jugé à 3:1, demandé par le mainteneur | Kit |
| Garantie 1 inchangée | Aucun |
| Scopes : fonds sans `STROKE_COLOR`, `foreground` avec, filets avec `FRAME_FILL` et `SHAPE_FILL` | Kit, Architect |
| Table Dark de `surface` inchangée | Aucun |
| `ring` au 800 en Dark inversé | Kit |
| Texte de `page` jugé sur le fond teinté au repos ; le moteur éclaircit le 800 Dark des seules teintes qui échouent | Kit, moteur, Palettes |

Hors du plan, encore en discussion : le survol et l'appui du bouton texte en
Dark (texte de `page` sur `surface/hover` et `surface/pressed`), le Light
inversé et le Dark normal. Le survol sur `surface/subtle` est écarté : chaque
état garde la variable de son nom. La migration du fichier Figma revient au
mainteneur.

## Règles de chaque lot

- Lire d'abord la sortie de `npm run agents:lire -- <fichiers du lot>`.
- Ajouter un test de régression pour chaque règle nouvelle.
- Ne pas lancer `test:ui`. Le mainteneur teste l'interface.
- L'agent ne commite pas. Il rend : le diff résumé, les tests lancés et leur
  résultat, les écarts au lot.
- La conversation principale relit le diff, fait lancer `npm test` par un
  `verificateur`, commite par chemins explicites sur `main` et coche le lot avec
  son commit. Un échec qui revient à un lot suivant (fixture de Palettes, du hub
  ou d'Architect) se note dans ce lot, sans être corrigé avant lui.

## Ordre

```
K → C1 → C2 → P1 ┐
            A1 ──┤→ D1 → V1 → R1
```

P1 et A1 peuvent partir ensemble après C2. Au plus deux agents à la fois.

## K. Variables, crans, scopes et garanties dans le kit

Agent : `implementeur-exigeant` (plusieurs lecteurs de `TABLE_DES_DOSSIERS` et
de `GARANTIES`). Un seul lot, une seule version du kit : la garantie 3 lit
`surface/subtle`, que la table crée.

Fichiers : `packages/kit/src/emplois/dossiers.ts`,
`packages/kit/src/referentiel/theme.ts`, `packages/kit/src/emplois/garanties.ts`,
`packages/kit/src/controles/accessibilite.ts`, `packages/couleur/src/promesses.ts`,
`packages/couleur/src/jugement.ts`, `packages/couleur/src/garantie.ts`,
`packages/couleur/src/recette.ts` (commentaire des crans requis),
`packages/hub/src/modele/modele.ts`, leurs tests, `tests/` à la racine.

### Variables, crans et scopes

- [x] (071c20b2) `VARIABLES_DE_PALETTE` : ajouter `surface/subtle` après
      `surface/pressed`, et `surface/divider` après `surface/border`.
- [x] (071c20b2) `TABLE_DES_DOSSIERS`, Light normal : `surface/foreground` et
      `surface/border` passent de 800 à 700.
- [x] (071c20b2) `TABLE_DES_DOSSIERS`, les quatre tables : `surface/subtle` vaut 50 en
      Light (normal et inversé) et 200 en Dark (normal et inversé).
      `surface/divider` vaut 300 en Light et 500 en Dark.
- [x] (071c20b2) `SUPPORT_DES_VARIABLES` :
  - `solid/default`, `solid/hover`, `solid/pressed` : support `FOND`
    (`peint: ['background']`, `FRAME_FILL`, `SHAPE_FILL`). Supprimer la
    constante `SOLID` si plus rien ne la lit.
  - `TEXTE` : ajouter `STROKE_COLOR` aux portées. Toutes les variables
    `foreground` le lisent, neutre et `disabled/foreground` compris.
  - Nouveau support `FILET` : `peint: ['border']`, portées `STROKE_COLOR`,
    `FRAME_FILL`, `SHAPE_FILL`. Le donner à `page/divider` et
    `surface/divider`.
  - `surface/subtle` : `FOND`.
- [x] (071c20b2) `theme.ts`, `TEXTES_DES_VARIABLES` :
  - `surface/subtle` : libellé « fond teinté léger » / « subtle tinted fill » ;
    définition « Fond teinté très léger, sans état. » / « Very light tinted
    background, with no state. ».
  - `surface/divider` : libellé « filet sur fond teinté » / « divider on tinted
    fill » ; définition « Trait de séparation sur un fond teinté. » /
    « Dividing line on a tinted background. ».
  - Corriger le commentaire de `libellesDesVariables` : le nombre de libellés
    passe de dix-sept à dix-neuf.
- [x] (071c20b2) `TABLE_DES_DOSSIERS`, Dark inversé : `ring` passe de 700 à 800. Le
      Dark normal ne change pas : il n'est pas mesuré.
- [x] (071c20b2) Le 50 devient requis. Les crans requis sont la réunion des crans de la
      table (`cransRequis`, `[REC-13]`) : `surface/subtle` y fait entrer le 50.
      Les deux préréglages le portent déjà. Une recette sans 50 est refusée
      (`crans-emplois`). Corriger le commentaire de `validerRecette` (« seul 50
      est facultatif ») et ajouter un test du refus.
- [x] (071c20b2) Mettre à jour les tests du kit qui comptent les variables, lisent la table
      ou les portées. Ajouter un test par règle nouvelle : crans des deux
      variables dans les quatre tables, portées de `FILET`, `TEXTE` et des fonds
      de `solid`.

### Garanties de contraste

- [x] (071c20b2) Garantie 3 : `surface/foreground` au seuil `texte` sur `surface/subtle`,
      `surface/default`, `surface/hover`, la page et la carte. Retirer
      `surface/pressed`.
- [x] (071c20b2) Nouvelle garantie 8 : `surface/foreground` au seuil `nonTexte` sur
      `surface/pressed`. Le numéro 8 évite de renuméroter les garanties 1 à 7
      que les documents citent.
- [x] (071c20b2) Garantie 4 : ajouter `surface/subtle` à ses fonds ; garder
      `surface/pressed`.
- [x] (071c20b2) Nouvelle garantie 9 : `page/foreground` au seuil `texte` sur
      `surface/default`. Elle dit qu'un composant de la page reste lisible
      dans un fond teinté au repos.
- [x] (071c20b2) `surface/divider` n'entre dans aucune garantie.
- [x] (071c20b2) Mettre à jour le nombre de promesses par mode et par intensité partout où
      il est écrit (commentaires de `promesses.ts`, tests, hub).
- [x] (071c20b2) `garantie.ts` (garantie des courbes) : vérifier qu'elle ne lit pas
      `surface/pressed` comme fond textuel. Ne rien changer d'autre.
- [x] (071c20b2) Tests : la garantie 8 juge à 3:1 ; la garantie 9 juge
      `page/foreground` sur `surface/default` ; la garantie 3 ne contient plus
      l'appui ; `garantieJugeable` traite `surface/subtle`.
- [x] (071c20b2) Changer la version du kit (`packages/kit/package.json`), puis faire passer
      `tests/` à la racine (`versionSuitLeContenu`).

Fin : `node packages/kit/scripts/run-tests.cjs`, les tests racine,
`npm run test:paquet -- couleur` et `npm run test:paquet -- hub` passent ;
`npm run typecheck` passe.

Fait : `071c20b2`, kit 0.13.34. Restent rouges, pour les lots suivants : le
relevé figé des rampes et les tests qui figent des hexa (les gardes de
`rampesDe` lisent les nouvelles garanties : C1, C2, puis régénération en V1) ;
G9 en Dark et G3 au survol sur trois références (C2) ; les vues, le corpus des
registres et les pins de la CLI et de l'adaptateur (V1, R1) ; Palettes (P1) ;
Architect (A1).

## C1. Clarté commune des crans clairs

Agent : `implementeur-exigeant` (moteur, promesses et limites dynamiques).

Fichiers : `packages/couleur/src/rampe.ts` (`clarteDuCran`, fabrication des
crans), `packages/couleur/src/palette.ts` (`decalageDe`,
`clarteSelonLaTeinte`, `clarteSelonLaTeinteGardee`), tests de `couleur`.

Règle, mode Light seulement :

| Cran | Clarté |
|---|---|
| 50, 100, 200 | La valeur de la courbe, sans le réglage de luminosité de la carte ni le décalage selon la teinte |
| 300 | Deux tiers de l'écart à la courbe corrigé |
| 400 | Un tiers de l'écart à la courbe corrigé |
| 500 et au-delà | Inchangé |

- [x] (45c110aa) Appliquer la règle par numéro de cran, pas par rang : une palette libre
      (`palette.crans`) peut avoir une autre liste.
- [x] (45c110aa) Garder la teinte et la part de chroma de chaque cran : la chroma suit le
      plafond à la nouvelle clarté, à part égale.
- [x] (45c110aa) Ne jamais toucher le cran qui porte la référence.
- [x] (45c110aa) Le Dark ne change pas.
- [x] (45c110aa) La référence de la simulation est
      `docs/notes/Recherches/SUJETS IMPORTANTS à trancher/Mesures/generer-donnees.ts`,
      fonction `cransCommuns` (poids `[1, 1, 1, 2/3, 1/3]`).
- [x] (45c110aa) Les promesses et la limite dynamique se calculent sur les crans communs.
- [x] (45c110aa) Tests : sur la configuration
      `Mesures/palettes-et-reglages.json` copiée dans les fixtures de `couleur`,
      l'écart de clarté entre palettes vaut 0,002 au plus sur le 50, le 100 et
      le 200 ; Ocean Vivid (réglage de luminosité −0,06) a son 50 à 0,975 ; le
      50 de Sun garde une chroma non nulle.
- [x] (45c110aa) Mettre à jour les tests qui figent des couleurs claires. Ne pas assouplir
      un test de promesse : signaler tout échec nouveau dans le rendu.
- [x] (45c110aa) Lecture : une recette du format 10 ou 11 sans 50 reçoit le 50, avec la
      luminosité que `luminositeAuNumero` donne sur sa grille, comme le 400, le
      500 et le 950 du format 10 (`[REC-13]`). Sans cela, le lot K la rend
      illisible. Test de régression.
- [x] (45c110aa) `alertes.ts` : corriger le commentaire « Les crans facultatifs 50, 400 et
      950 n'y sont pas », faux depuis K.

Fin : `npm run test:paquet -- couleur` passe ; `npm run typecheck` passe.

Fait : `45c110aa`. La chroma suit `cransCommuns` : la part que les réglages
donnaient au cran, enveloppe comprise, fois le plafond à la nouvelle clarté.
Le 50 s'ajoute à toute recette lue, format courant compris. Restent rouges
pour C2 : G9 en Dark, G3 au survol (`#16A34A`, `#06B6D4` Soft), `[ENT-14]`,
`[DER-20]` ; pour V1 : relevé figé et planche.

À trancher par le mainteneur, effet de C1 : les fonds Light se rapprochent
entre palettes, et l'alerte « palettes proches » dit « presque identiques »
de `#1E6FD9` et `#3B82F6` (distance 0,002 à 0,003, seuil 0,01). Le 300 Light
confond plus vite Soft et Vivid. La luminosité du bout clair n'a plus de
limite dynamique sur Bleu, Rouge, Jaune et Sauge.

## C2. Correction des textes par teinte

Agent : `implementeur-exigeant`.

Fichiers : `packages/couleur/src/palette.ts` ou un nouveau module du moteur,
`packages/couleur/src/promesses.ts`, `packages/couleur/src/limites.ts`, tests de
`couleur`.

Règle : après le calcul des rampes, pour chaque mode, sens du texte des boutons
et intensité, deux crans de texte de la table doivent tenir le seuil `texte` :

- le cran de `surface/foreground` sur `surface/subtle`, `surface/default` et
  `surface/hover` (garantie 3) ;
- le cran de `page/foreground` sur `surface/default` (garantie 9).

S'il échoue, le moteur l'éloigne de ces fonds par pas de 0,001 de clarté OKLCH,
part de chroma et teinte gardées, jusqu'au seuil : plus foncé en Light, plus
clair en Dark.

- [x] (c388e9a3) Ne jamais corriger le cran qui porte la référence. La garantie échoue
      alors, et Palettes propose « Ajuster la référence » par le chemin qui
      existe pour une référence exacte.
- [x] (c388e9a3) Ne jamais faire franchir au cran corrigé la clarté du cran voisin le plus
      foncé (Light) ou le plus clair (Dark).
- [x] (c388e9a3) Le cran corrigé reste le même cran pour toutes les variables qui le
      visent : en Light normal, le 700 porte aussi `page/foreground`,
      `page/border` et `solid/default`.
- [x] (c388e9a3) La limite dynamique lit les rampes corrigées.
- [x] (c388e9a3) Tests, sur la configuration du mainteneur : Emerald Soft passe de 0,501 à
      0,493, Grass Soft à 0,494, Grass Vivid à 0,496, Emerald Vivid à 0,495, Sky
      Soft à 0,499 ; texte 700 sur le 200 ≥ 4,5 pour les 21 rampes.
- [x] (c388e9a3) Test de balayage, teintes 108 à 249 par pas de 10, références au 600 :
      correction ≤ 0,011 en Soft et ≤ 0,008 en Vivid. Référence de mesure :
      `balayer()` dans `Mesures/generer-donnees.ts`.
- [x] (c388e9a3) Test : une référence ancrée au 700 qui manque 4,5 n'est pas corrigée, et
      la garantie 3 manque pour cette palette.
- [x] (c388e9a3) Tests, Dark inversé de la configuration du mainteneur : le 800 de Titanium,
      Terracota, Deep, Poppy Soft, Ocean, Iris et Irene Soft s'éclaircit de
      0,009 au plus et passe 4,5 sur le 300. Poppy Vivid et Irene Vivid ont leur
      référence au 800 Dark : elles ne sont pas corrigées et la garantie 9
      manque.
- [x] (c388e9a3) Mesurer la plus forte correction du 800 Dark sur 360 teintes, références
      au 500, au 600 et au 700. Rendre le résultat dans le rendu du lot : le
      mainteneur a validé 0,009 au plus sur ses palettes.
- [x] (c388e9a3) La règle vaut aussi pour le Light inversé et le Dark normal, qui ne sont
      pas mesurés : la garantie 9 y juge le 800 Light et le 700 Dark sur le
      fond teinté. Rendre, sur la configuration du mainteneur et sur 360
      teintes, la plus forte correction de ces deux sens. Ne pas les exclure de
      la règle sans le dire dans le rendu.

Fin : `npm run test:paquet -- couleur` passe ; `npm run typecheck` passe.

Fait : `c388e9a3`. Mesures : Light normal 0,011 au plus sur 360 teintes ;
Dark inversé 0,009 sur tes palettes, 0,019 sur 360 teintes ; Light inversé
aucune correction. Dark normal, le Dark par défaut : 83 % des rampes
corrigées, 0,024 en médiane, 0,049 au plus, et les Vivid dont la référence
tombe au 700 manquent la garantie 9. La maquette, section 11, compare la
correction et un 700 de courbe relevé à 0,70 : à trancher par le mainteneur.
`reconstruction.ts` lit les crans de texte corrigés, sinon la reconstruction
dépasse son budget.

## P1. UCM Palettes

Agent : `implementeur`.

Fichiers : `packages/plugin-palettes/src/i18n/fr.ts`, `en.ts`,
`src/planche/modele.ts`, `src/presentation.ts`, `src/ui/garanties.ts`,
`src/ui/modeleDesGaranties.ts`, `src/ui/nuancier.ts`, tests du paquet.

- [x] (0cd805b3) Libellés et textes des garanties 8 et 9 (fr et en), au format des
      garanties voisines : « Texte des fonds teintés à l'appui » / « Tinted fill
      text, pressed » ; « Texte de la page sur un fond teinté » / « Page text on
      a tinted fill ».
- [x] (0cd805b3) Nombre de contrôles affiché : suivre le nouveau total de promesses.
- [x] (0cd805b3) Les deux nouvelles variables apparaissent dans l'aperçu, la planche et le
      rapport. Le nuancier range `surface/subtle` avec les fonds teintés et
      `surface/divider` avec les contours.
- [x] (0cd805b3) Les garanties 3 et 9 qui manquent sur une référence mènent à « Ajuster
      la référence ». Ajouter les tests.
- [x] (0cd805b3) Avant de commiter, chercher dans `src/ui` les noms et valeurs des
      fixtures : aucune donnée de maquette ne doit y entrer.

Fin : `npm run test:paquet -- palettes` passe ; `npm run build:plugin -- palettes`
passe.

Fait : `0cd805b3`. `surface/divider` partage l'accolade des fonds teintés : il vise
toujours le cran de `surface/pressed`. La carte des garanties passe à six
colonnes. Le bouton contour de l'interface de test garde `page/border`. Ouvert :
une référence posée sur le cran du texte en Dark ne se répare pas par
« Ajuster la référence » (voir la section 11 de la maquette, ancrage déplacé).
`tests/interface/interface.test.mjs`, d'une autre session, attend encore cinq
colonnes et sept lignes.

## A1. UCM Architect

Agent : `implementeur`.

Fichiers : `packages/plugin-architect/src/integrations/profilUcm.ts`, fixtures
de `packages/plugin-architect/tests/`, messages qui citent les portées.

- [x] (7c9678d6) Les constats `portee` suivent la nouvelle table : fonds de `solid` sans
      `STROKE_COLOR`, `foreground` avec, filets avec `FRAME_FILL` et
      `SHAPE_FILL`.
- [x] (7c9678d6) `surface/subtle` et `surface/divider` sont reconnus par
      `variableDuThemeReconnue`. Ajouter les tests.
- [x] (7c9678d6) Mettre à jour les fixtures qui donnent `STROKE_COLOR` aux fonds de
      `solid` ou qui comptent les variables de `theme`.
- [x] (7c9678d6) Dans les textes destinés au designer, écrire « scope » et non
      « portée ». Charger la skill `rediger-diagnostics-ucm` avant d'écrire un
      message.

Fin : `npm run test:paquet -- architect` passe ;
`npm run build:plugin -- architect` passe.

Fait : `7c9678d6`. Le code d'Architect lisait déjà la table du kit : seuls les tests changent.

## D1. Documents

Agent : `implementeur`.

- [x] (5d1567fa) `npm run agents:diff`, puis relire chaque document listé.
- [x] (5d1567fa) Spécification de Palettes
      (`docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`) :
      section 11.2, garanties 3, 4, 8 et 9 ; clarté commune et correction des
      textes par teinte, en regard de `[MOT-38]`.
- [x] (5d1567fa) `packages/couleur/invariants/moteur-de-couleur.md` et les invariants du
      kit qui citent la table, les garanties ou les portées.
- [x] (5d1567fa) `docs/format/FORMAT.md` et `docs/format/CHANGELOG-FORMAT.md` si la liste
      des variables de `theme` ou leurs portées font partie du format publié.
- [x] (5d1567fa) Charger `rediger-sans-tics-ia` avant d'écrire. Lancer
      `node scripts/controle-style.mjs <fichiers>`.

Fin : `controle-style` conforme ; aucun document ne décrit l'ancienne table.

Fait : `5d1567fa`, et la part de Palettes dans le commit de P1.

## Piste A : le survol du bouton texte en Dark

Décision du mainteneur, 29 octobre, sur la section 11 de la maquette. En Dark,
le texte de la page posé sur `surface/hover` (400) restait à 3,4:1 environ pour
toutes les palettes. Le câblage des composants ne change pas : la table et le
moteur changent.

- Table Dark de `surface`, normal et inversé : repos 200, survol 300, appui 400.
  `surface/subtle` passe au 100 en Dark. `surface/divider` garde 500.
- La garantie 9 juge `page/foreground` sur `surface/default` et sur
  `surface/hover`.
- Dark normal : une référence posée sur le cran de `page/foreground` (700) qui
  manque la garantie 9 glisse au cran plus sombre (600), couleur exacte gardée.
  Le 700 libéré se corrige par teinte (C2). Le 400 et le 500 se relèvent d'un
  tiers et de deux tiers de leur écart à un espacement régulier entre le 300 et
  la référence. Mesure : `Mesures/mesurer-ancrage-deplace.ts`.
- Dark inversé : rien de plus. Une référence posée sur le 800 garde sa place, et
  la garantie 9 manque pour elle (Poppy Vivid, Irene Vivid). Avec un texte de
  boutons blanc, aucun cran ne la porte sans casser la garantie 1.

```
K2 → C3 → P2 → D2 → V1 → R1
```

### K2. Table et garantie 9 dans le kit

Agent : `implementeur-exigeant`.

- [x] (d644ef7a) `TABLE_DES_DOSSIERS`, Dark normal et inversé : `surface/default` 200,
      `surface/hover` 300, `surface/pressed` 400, `surface/subtle` 100.
- [x] (d644ef7a) Garantie 9 : fonds `surface/default` et `surface/hover`.
- [x] (d644ef7a) Tests du kit, de `couleur` et du hub qui lisent la table Dark ou la
      garantie 9 ; version du kit ; tests racine.

### C3. Ancrage déplacé en Dark normal

Agent : `implementeur-exigeant`.

- [x] (d644ef7a) Dans l'ancrage du moteur, en Dark normal seulement : la règle de la
      piste A, avec la formule de `Mesures/ancrage-deplace.ts`.
- [x] (d644ef7a) Tests : Poppy Vivid et Irene Vivid passent la garantie 9 en Dark normal
      (texte 700 à 0,704 et 0,710, 4,51:1 sur le 300) ; leur référence reste
      au 800 en Dark inversé et la garantie 9 y manque ; sur 360 teintes,
      l'ordre des nuances tient et aucun texte ne reste sous 4,5:1.

Fait (K2 et C3) : `d644ef7a`, kit 0.13.35. Décisions du mainteneur sur les
points ouverts : le cran de la référence en Dark peut changer d'un cran pendant
un geste de Color shift ; l'ordre des nuances reste jugé avant le glissement ;
la reconstruction de la palette 28 reçoit un budget de 120 s.

### P2. Palettes

Agent : `implementeur`.

- [x] (80d62c58) Tests qui figent la table Dark de `surface` ou les couleurs du Dark.
- [x] (80d62c58) L'écran qui dit où se pose la référence montre le cran déplacé.

### D2. Documents

Agent : `implementeur`.

- [x] (80d62c58) Spécification de Palettes, invariants du moteur et du kit, README du
      dossier, section « Décisions ».

Fait (P2 et D2) : `80d62c58`. La spécification reçoit `[MOT-42]`.

## X1. Palettes trop proches : toute la rampe, pondérée

Décision du mainteneur, 29 octobre. Depuis la clarté commune et la piste A, les
fonds teintés clairs du Light et sombres du Dark se rapprochent d'une palette à
l'autre, et l'alerte sonnait pour eux seuls (Terracota et Poppy, Sky et Ocean).
Mesure : `Mesures/mesurer-proximite-ponderee.ts`.

Agent : `implementeur-exigeant`.

- [x] (97f1f3f5) La proximité de deux palettes compare toute la rampe, Vivid ou l'unique
      intensité, en Light et en Dark : pour chaque cran, la distance OKLab sur le
      seuil `palettesProches`. Le score est la moyenne pondérée de ces rapports,
      avec les poids « cloche douce », les mêmes dans les deux thèmes : 50 : 0,1 ;
      100 : 0,1 ; 200 : 0,2 ; 300 : 0,5 ; 400 à 700 : 1 ; 800 : 0,6 ; 900 : 0,3 ;
      950 : 0,2. Trop proches sous 1, presque identiques sous 0,2.
- [x] (97f1f3f5) Deux palettes ne sont jamais trop proches quand l'une est nettement plus
      terne : la chroma moyenne de ses crans 400 à 700, Light et Dark, vaut 75 %
      ou moins de celle de l'autre.
- [x] (97f1f3f5) Le rôle « fond » et sa part de seuil disparaissent. Le message de Palettes
      devient « Rampes trop proches » ; le bouton Comparer reste.
- [x] (97f1f3f5) Tests : sur la configuration du mainteneur, aucune paire ne sonne ;
      Terracota et Poppy sont distinctes par le critère de chroma ; une paire
      fabriquée de même teinte et de même saturation sonne.
- [x] (97f1f3f5) Spécification `[VER-22]`, invariant du moteur.

## V1. Vérification

Agent : `verificateur`.

- [x] (cebd66a1, workflow 41036066317) `npm test` complet : paquets puis contrôles racine
- [x] (8a5be127) `npm run typecheck`
- [x] (8a5be127) `npm run build`
- [x] (8a5be127) `npm run vues`, puis le test de fraîcheur des vues.

Fin : un tableau des résultats. La conversation principale commite les vues
régénérées.

Fait : les suites des paquets ne manquent initialement que les vues périmées ; les tests de fraîcheur passent après régénération. Les contrôles racine sont ensuite joués : renvois, ancre de spec et exception de validation du protocole corrigés en cebd66a1, 22 contrôles ciblés verts. Typecheck et build globaux : codes 0. Les attentes du bilan de galerie suivent le modèle pur ; la suite UI reste au mainteneur.

## T1. Recette du mainteneur dans Figma

Recette reportée à la demande du mainteneur. Les cases restent ouvertes ; ce report autorise la clôture et R1 sans présumer leur réussite.

- [ ] Recharger les builds de Palettes et d'Architect. Vérifier les variables, les alias et les scopes avec T1 à T5 du [plan Intégrité de la structure](../UCM%20Architect/8%20Intégrité%20de%20la%20structure/PLAN-IMPLEMENTATION.md#t--recette-du-mainteneur-dans-figma).
- [ ] X1 : aucune paire de la configuration du mainteneur ne déclenche l'alerte ; deux palettes synthétiques identiques déclenchent « Rampes trop proches » ; « Comparer » ouvre la paire attendue.
- [ ] Rendre les étapes tenues et les écarts observés. Corriger les écarts avant les vérifications finales et R1.

## R1. Publication

Agent : `executant`, avec la skill `publier-paquets`.

- [x] (cebd66a1, 93b3b66a) Publier `@ucm-kit/core`, puis `@ucm-kit/cli` et `@ucm-kit/adapter-typescript`.
- [x] (93b3b66a) Pousser `main` et le relevé final des plans.

Versions confirmées sur npm : noyau 0.14.10, CLI 0.1.143, adaptateur 0.2.1. Le [workflow final](https://github.com/Vassili-g/UCM-Toolkit/actions/runs/41040530001) a passé les tests, l'installation depuis npm et le contrôle de tous les pins. La recette Figma reste reportée à la demande du mainteneur ; sa réussite n'est pas présumée. Les versions existantes ont été conservées et le noyau déjà servi n'a pas été republié.

Fin : les trois versions publiées répondent sur le registre.

La recette T1 est reportée. Les builds complets sont prêts sur cebd66a1 ; après
une correction, `npm run build` les reconstruit avant l'essai. La galerie ne
reconstruit que `ui.html`.

## Référence ajustée en Dark inversé

Décision du mainteneur, sur le cas des textes de boutons blancs en Dark. Un
Dark inversé donne à `page/foreground` le 800 (`TABLE_DES_DOSSIERS.dark.inverse`).
Quand la référence exacte se pose sur ce cran et manque la garantie 9
(Poppy Vivid, `#EF4733`, 4,03 et 3,39 ; Irene Vivid, `#DA51C2`, 4,28 et 3,59),
le moteur ne la corrige pas aujourd'hui et Palettes répond « Ajuster la
référence », qui éclaircit aussi le Light. Le mainteneur refuse de passer le
texte des boutons au noir et d'éclaircir sa couleur de marque en Light.

Ce plan remplace la ligne « Dark inversé : rien de plus » de la piste A.

### Périmètre

| Décision | Effet |
|---|---|
| Dark inversé : un cran de texte qui porte la référence exacte et manque le seuil est corrigé comme les autres textes (pas de 0,001 de clarté OKLCH, teinte et part de chroma gardées, sans passer la clarté du voisin plus clair) | Moteur |
| Le ◆ reste sur le cran corrigé ; la référence n'est plus exacte en Dark dans ce cas | Moteur, Palettes |
| Dark normal : ancrage déplacé inchangé (la référence glisse au 600, couleur exacte) | Aucun |
| Light, normal et inversé : un cran de texte qui porte la référence reste non corrigé ; « Ajuster la référence » reste la réponse | Aucun |
| Palettes montre la mention « ajustée pour rester lisible » et la couleur choisie à côté, sans l'écart appliqué ; le message de garantie manquée disparaît parce que la garantie passe | Palettes |
| Palette figée, palette libre | Aucun, sauf la reconstruction des réglages d'une palette figée (E2) |

Le kit ne change pas : la table et les garanties restent celles du kit, la règle
vit dans `ucm-couleur` (paquet privé, lu en source). Aucune version à monter,
aucune publication. Les tests racine (`node scripts/run-tests.cjs`) se lancent
parce que Palettes change.

### Mesure de départ

Simulation faite sur la configuration du mainteneur, en appelant
`corrigerLesTextes(recette, 'dark', rampesSansCorrection(...)[i].dark)` sans
`rangDeLaReference` : Poppy Vivid 800 `#EF4733` vers `#F17562` (ΔL +0,066,
ΔEok 0,084), Irene Vivid 800 `#DA51C2` vers `#E96AD1` (ΔL +0,056, ΔEok 0,058).
Chacune passe de 2 garanties manquées à 0. Les dix autres palettes gardent
leurs octets. La simulation ne rejoue pas la garde de la bosse de chroma de
`rampesDe` : E1 compare le moteur réel à ces valeurs.

### Règles de chaque lot

Les règles du début de ce plan valent. En plus :

- `git status` avant de commencer. Les fichiers d'Architect modifiés par une
  autre session ne sont pas à ce plan et ne se touchent pas.
- Ne pas lancer `test:ui`. Un test d'interface s'écrit et se nomme dans le
  rendu ; le mainteneur le lance.
- Aucune migration de fichier Figma ni de Playground n'entre dans le plan.
- Un texte destiné au designer se pose tel que la note du lot l'écrit, après
  validation du mainteneur (question 1). Charger `rediger-diagnostics-ucm`,
  puis `rediger-sans-tics-ia`.

### Ordre

```
M1 → E1 → P1 ┐
       └→ E2 ┤→ D1 → V1 → T1
```

P1 et E2 partent ensemble après E1. Au plus deux agents à la fois. M1 est un
point d'arrêt : si une de ses sorties dépasse un critère, E1 ne commence pas.

### M1. Mesure sur 360 teintes

Agent : `implementeur` écrit le script ; un `verificateur` le lance (sortie
longue). La conversation principale lit les chiffres et décide de la suite.

Fichier : `docs/notes/Archives/SUJETS IMPORTANTS à trancher/Mesures/mesurer-reference-ajustee.ts`,
à côté de `mesurer-ancrage-deplace.ts`, dont il reprend l'en-tête, le
chargement de `palettes-et-reglages.json` et la recette en Dark inversé. Le
registre de `.agents/domiciles.json` ne refuse que les Markdown : un `.ts` de
mesure y est permis. Lancement depuis ce dossier :
`npx tsx mesurer-reference-ajustee.ts`.

Le script simule la règle hors du moteur, comme `ancrage-deplace.ts` avant C3 :
la rampe Dark de `rampesSansCorrection`, puis `corrigerLesTextes` sans
`rangDeLaReference`, puis `jugerLesRampes` sur la rampe obtenue.

- [x] Configuration du mainteneur, Dark inversé : pour chaque palette et chaque
      intensité, le cran de texte (800 et 950) avant et après (hexa, ΔL, ΔEok),
      les garanties G1 à G9 manquées avant et après, et la liste des rampes dont
      un octet change. Attendu : Poppy Vivid et Irene Vivid seulement, aux
      valeurs de la mesure de départ.
- [x] Balayage : 360 teintes (pas de 1°), base Soft et Vivid, référence posée
      sur chaque cran de texte du Dark inversé (800 et 950). La clarté de la
      référence parcourt l'intervalle que `rangPorteur` rattache à ce cran, par
      pas de 0,02, lu sur `recette.courbes.dark`. Une référence hors de cet
      intervalle ne porte pas le cran.
- [x] Sorties du balayage : nombre de rampes dans la tranche (référence sur un
      cran de texte qui manque le seuil) ; plus forte correction en ΔL, en
      médiane et au maximum ; nombre de crans qui butent sur le voisin
      (`etat === 'voisin'`, garantie encore manquée) ; ordre des nuances (clartés
      strictement croissantes et plus petit écart entre le cran corrigé et son
      voisin plus clair, à comparer à `ECART_MINIMAL_DES_CLARTES`) ; garanties
      G1 à G9 qui manquent après et tenaient avant, dont G1 (`solid/default`
      contre le texte des boutons), G5, G6 et le ring au 800 (G7).
- [x] Une ligne qui montre que le Light et le Dark normal ne sont pas touchés
      (même rampe avant et après).

Critères pour passer à E1 :

- aucune garantie G1 à G9 ne manque après et tenait avant ;
- l'ordre des nuances tient partout ;
- l'écart entre le cran corrigé et son voisin plus clair reste au moins
  `ECART_MINIMAL_DES_CLARTES`, ou la question 3 est tranchée ;
- la plus forte correction est rendue au mainteneur, avec les teintes qui la
  causent.

Fin : le script s'exécute sans erreur ; les chiffres sont dans le rendu, puis
recopiés dans ce plan à la ligne « Fait de M1 », en fin de section.

### E1. Moteur

Agent : `implementeur-exigeant` (la règle a plusieurs lecteurs : promesses,
alertes, limites, ancrage, tests figés).

Fichiers : `packages/couleur/src/palette.ts`, `packages/couleur/src/textes.ts`
(en-tête), `packages/couleur/src/ancrageDeplace.ts` (en-tête),
`packages/couleur/src/promesses.ts` et `packages/couleur/src/limites.ts`
(commentaires), `packages/couleur/tests/textes.test.ts`,
`ancrageDeplace.test.ts`, `promesses.test.ts`, `ancrage.test.ts`,
`limites.test.ts`, `alertes.test.ts`, `packages/couleur/CARTE.md`.

Note de conception :

- `palette.ts` appelle aujourd'hui `corrigerLesTextes(..., ancrage.rangs[mode])`
  pour les deux modes (`rampeDeLIntensitePorteuse`, par `Correction`). La
  nouvelle règle change cet argument en Dark inversé seulement : `undefined`, donc
  aucun cran n'est protégé. Light, Dark normal, palette libre et palette figée
  gardent l'argument actuel. En Dark normal, la référence qui échoue glisse
  (`deplacerLaReference`) et le rang protégé reste celui de la grille.
- La règle s'écrit en un seul endroit de `palette.ts`, par une fonction
  exportée (`rangDeLaReferenceGardee(recette, mode, ancrage)` ou nom voisin).
  Elle lit `sensDuTheme`, comme chaque lecteur de la table. Les tests de
  `textes.test.ts` l'appellent au lieu de recopier la condition.
- `textes.ts` ne change pas de comportement. `EtatDeLaCorrection` ne reçoit pas
  de nouvel état : la fonction ignore si le cran porte la référence, c'est
  l'appelant qui le lui dit. L'état `reference` ne se rend plus qu'en Light et
  en Dark normal.
- Les vues lisent une fonction de `palette.ts`,
  `referenceAjustee(recette, palette, rampes = rampesDe(recette, palette))`, qui
  rend `undefined` ou `{ intensite, mode: 'dark', rang, numero, avant, apres, ecart }` :
  `avant` la référence (octets), `apres` le cran de la rampe corrigée à
  `ancrageDe(...).rangs.dark`, `ecart` la différence de clarté OKLCH arrondie à
  0,001. Elle rend `undefined` quand les octets du cran sont ceux de la
  référence : en Light, en Dark normal (la référence glissée est exacte), pour
  une palette figée ou libre et pour une référence qui tenait déjà.
- `ancrageDe` et `ancrage.crans.dark` ne changent pas : le ◆ reste au 800.
  `clartesDe` ne change pas : l'ordre des nuances se juge sur la clarté
  fabriquée, avant la correction.

- [x] `palette.ts` : la fonction de la règle, son appel dans `Correction`,
      `referenceAjustee`. Mettre à jour les commentaires de `ancrageDe`, de
      `rampesDe` et de `rampesSansCorrection`.
- [x] Tests à inverser. `textes.test.ts`, « Dark inversé, configuration du
      mainteneur » (neuf rampes corrigées de 0,009 au plus, deux références
      intactes) devient onze rampes corrigées : Poppy Vivid +0,066 vers
      `#F17562`, Irene Vivid +0,056 vers `#E96AD1`, plus aucun état `reference`
      en Dark inversé, G9 tenue. Son assistant `corrections()` passe le rang par
      la fonction de la règle. `ancrageDeplace.test.ts`, « Dark inversé … gardent
      leur référence au 800, et la garantie 9 manque » devient : le 800
      s'éclaircit, `ancrageDe(...).crans.dark` vaut 800, G9 tenue.
      `promesses.test.ts`, « oracles S8 » (quatre combinaisons) : l'assertion
      « hors ancrage » reste vraie ; ajouter que G9 ne manque plus en Dark
      inversé sur les références au 800.
- [x] Tests nouveaux : `referenceAjustee` (Poppy Vivid et Irene Vivid : valeurs ;
      les dix autres, Dark normal, Light : `undefined`) ; sur la configuration
      du mainteneur en Dark inversé, `rampesDe` garde les octets exacts de la
      référence au cran du ◆ pour toute palette sauf Poppy et Irene ; une
      référence au 700 Light qui manque G3 reste non corrigée (test existant, à
      garder) ; 360 teintes, référence sur le 800 Dark, bornes de M1 (plus forte
      correction, ordre, aucune garantie nouvellement manquée) ; Dark normal
      inchangé (les tests de `ancrageDeplace.test.ts` passent sans changement
      d'attente).
- [x] Alertes : sur la configuration du mainteneur, la liste des alertes
      (`profils-confondus`, `palettes-proches`) est celle d'avant ; sinon, le
      rendu la donne et rien n'est corrigé dans ce lot.
- [x] `limites.test.ts` : pour Poppy Vivid en Dark inversé, la limite de
      luminosité se calcule et G9 est tenue au départ.
- [x] Comparer le moteur réel à la simulation de M1 sur les deux références
      (écart d'octets nul) ; sinon l'écart vient de la garde de la bosse, et le
      rendu le dit.
- [x] En-têtes : `textes.ts` (« Le cran de la référence ne change jamais »
      devient « sauf là où l'appelant ne le protège pas ») et `ancrageDeplace.ts`
      (« garde sa place et la garantie 9 manque » devient la règle nouvelle).
      `CARTE.md` : lignes de `palette.ts` (`referenceAjustee`) et de `textes.ts`.

Fin : `npm run test:paquet -- couleur` passe ; `npm run typecheck` passe. Le
rendu liste chaque test dont l'attente a changé.

### E2. Reconstruction d'une palette figée

Agent : `implementeur-exigeant`.

Fichiers : `packages/couleur/src/reconstruction.ts`,
`packages/couleur/tests/reconstruction.test.ts`.

La reconstruction cherche la référence parmi les hexas égaux en Light et en
Dark dans une même intensité (`candidats`). Poppy Vivid et Irene Vivid, figées
depuis un Dark inversé, ont un 800 Dark différent de leur référence : aucun
candidat ne se présente, et la fonction rend `null` ou retient un mauvais
ancrage. Les autres lecteurs de rampes n'ont pas cette hypothèse : `rampesDe`
est leur seule source.

- [x] Ajouter à `candidats` le couple (rang Light, rang Dark du cran de texte) du
      Dark inversé quand le hexa Light est la référence connue (`c.reference`) et
      que le cran Dark garde la teinte à 1° près et une clarté au moins égale.
      Ne pas ancrer ce cran Dark dans `Candidat.ancres` : il n'est pas exact, et
      `c.textes.dark` le lit déjà à sa clarté observée. Le critère exact se
      choisit avec les deux cas des tests ; il n'ajoute aucun candidat aux autres
      palettes, donc la durée de la recherche ne change pas.
- [x] `rangsOk` accepte ce rang Dark pour ce candidat.
- [x] Tests : figer Poppy Vivid et Irene Vivid depuis `rampesDe` en Dark inversé
      (rampes réelles de E1), reconstruire, retrouver la référence d'origine,
      écart nul. Une palette figée sans référence connue garde son comportement
      actuel : le test le fixe.
- [x] En-tête du fichier : « les octets exacts de la référence … des deux
      thèmes » reçoit l'exception du Dark inversé.

Fin : `npm run test:paquet -- couleur` passe, `reconstruction.test.ts` compris,
dans son budget de temps actuel ; `npm run typecheck` passe.

### P1. UCM Palettes

Agent : `implementeur`. Dépend de E1 et de la question 1.

Fichiers : `packages/plugin-palettes/src/analyse.ts`, `src/i18n/fr.ts`,
`src/i18n/en.ts`, `src/ui/nuancier.ts`, `src/ui/ongletCreation.ts`,
`src/ui/garanties.ts`, `src/ui/apercuCompact.ts`, `src/ui/ongletGestion.ts` (si
la question 1 la retient), `src/planche/modele.ts`, `src/ui/styles.css` si une
ligne se pose, `galerie/etats.cjs`, tests `analyse.test.ts`,
`modeleDePlanche.test.ts`, `presentation.test.ts`, `i18n.test.ts`,
`textes.test.ts`, `tests/interface/interface.test.mjs` (écrit, non lancé),
`CARTE.md` si une ligne change.

Note de conception :

- `AnalyseDePalette` reçoit `referenceAjustee` (E1), calculée sur les rampes
  qu'`analyserPalette` a déjà. Aucune vue ne recalcule l'écart.
- Le ◆ ne bouge pas : toutes les vues le posent déjà par `analyse.ancrage`.
  Seuls les textes et la couleur affichée changent. Les lieux du ◆ à relire :
  `nuancier.ts` (pastille, étiquette d'accessibilité, détail « ◆ Votre couleur de
  référence exacte »), `garanties.ts` (réglette), `apercuCompact.ts`,
  `planche/modele.ts` (pastille, `noteDuRepere`, ligne de tête
  `enTeteDeLaReference`), `ongletGestion.ts` (ligne de la fiche).
- La mention ne s'affiche que dans le thème Dark, et seulement quand
  `referenceAjustee` existe. La couleur choisie est le hexa de la référence de
  la palette ; le cran garde son hexa corrigé. L'écart appliqué ne s'affiche
  pas (décision du mainteneur, question 1).
- La ligne de Création (`repereDeReference`) occupe déjà une ligne qui garde sa
  place ([UI-20]) : la mention n'ajoute pas de hauteur à l'onglet, avec ou sans
  mention. Test d'interface écrit pour ce point.
- Le message « garantie manquée » de Vérification disparaît sans code : la
  garantie 9 est tenue. Aucune ligne n'entre dans le groupe de messages, parce
  qu'un constat sans geste ne s'y écrit pas (`rediger-diagnostics-ucm`).

Textes retenus (question 1) :

| Lieu | fr | en |
|---|---|---|
| Détail de la nuance, Dark | `◆ Votre couleur de référence, ajustée pour rester lisible.` puis `Couleur choisie : #EF4733.` | `◆ Your reference colour, adjusted to stay readable.` then `Chosen colour: #EF4733.` |
| Étiquette du ◆ (lecture d'écran) | `Référence ajustée` | `Adjusted reference` |
| Note de la planche, section Dark | `◆ : la couleur de référence, ajustée pour rester lisible. Couleur choisie : #EF4733.` | `◆: the reference colour, adjusted to stay readable. Chosen colour: #EF4733.` |

Les textes passent `node scripts/controle-style.mjs` et
`tests/loiDesTextes.test.ts`.

- [x] `analyse.ts` : champ `referenceAjustee`. Test.
- [x] Textes fr et en : une fonction qui prend `referenceAjustee` et rend la
      mention ; `noteDuRepere` garde son texte quand rien n'est ajusté.
- [x] Création : détail de la nuance. La ligne « ◆ Référence : Vivid nuance 800 » ne change pas :
      le ◆ reste au 800 et aucun texte validé ne la touche. Vérification :
      réglette et aperçu. Planche : note et pastille du Dark. Gestion : ligne de
      la fiche, seulement si la question 1 la retient.
- [x] `planche/modele.ts` : l'empreinte du cadre change pour les seules palettes
      ajustées en Dark inversé ; `modeleDePlanche.test.ts` le fixe.
- [x] Galerie : un état « Référence ajustée en Dark » (recette du mainteneur en
      Dark inversé, Poppy ouverte, thème Dark). `regarder` dit : ◆ au 800, mention
      et couleur choisie, aucune garantie manquée. Les états existants qui
      montrent Poppy ou un Dark inversé sont relus.
- [x] Avant de commiter, chercher dans `src/ui` les noms et valeurs des fixtures
      (`Poppy`, `#EF4733`, `#F17562`) : aucune donnée de maquette n'y entre.

Fin : `npm run test:paquet -- palettes` passe ; `npm run build:plugin -- palettes`
passe. Le rendu nomme les écrans que le lot change : Création (détail et ligne),
Vérification (réglette), planche.

### D1. Documents

Agent : `implementeur`.

- [x] `npm run agents:diff`, puis relire chaque document listé.
- [x] Spécification de Palettes
      (`docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`) :
      `[MOT-41]` (le cran de la référence ne se corrige pas, sauf en Dark
      inversé), `[MOT-42]` (la dernière phrase écarte le Dark inversé), `[MOT-17]`
      (octets exacts, exception du Dark inversé), le paragraphe de la section 11
      sur G3 et G9 (« En Dark inversé, une référence au 800 manque G9 »), et la
      note `[PLA-11]` de la planche. `[MOT-41]` porte la règle ; un `[MOT-43]` ne
      s'ouvre que si l'implémenteur la sépare. `[UI-20]` si la ligne de Création
      change, et `[VER-16]` si la question 2 ajoute un champ au rapport.
- [x] README de ce dossier, tableau « Prises » : la ligne « Une référence au 800
      en Dark inversé (Poppy Vivid, Irene Vivid) » dit que le moteur corrige le
      cran, que le ◆ reste au 800 et que Palettes montre l'ajustement.
- [x] `packages/couleur/invariants/moteur-de-couleur.md`, trois puces : les
      octets exacts de la référence (Borne : Dark inversé) ; la correction des
      textes (« Le cran qui porte la référence ne se corrige jamais » reçoit les
      deux exceptions : le glissement en Dark normal, la correction en Dark
      inversé) ; le glissement en Dark normal (la Borne « une référence posée sur
      le 800 d'un Dark inversé garde sa place et G9 manque » est retirée).
      Ajouter `referenceAjustee` à l'autorité et le test qui la tient.
- [x] `packages/plugin-palettes/invariants/interface.md` si la ligne de Création
      change (invariant [UI-20]) ; `docs/format/FORMAT.md` et `SPEC.md` : aucun
      changement attendu, le dire dans le rendu.
- [x] Charger `rediger-pour-agents` pour les invariants et les cartes, puis
      lancer `node scripts/verifier-conservation.mjs --domaines <id>` et
      `node scripts/controle-style.mjs <fichiers>`.

Fin : `controle-style` conforme ; aucun document ne décrit l'ancien Dark inversé.

### V1. Vérification

Agent : `verificateur`.

- [ ] `npm test` complet : paquets puis contrôles racine
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run vues`, puis le test de fraîcheur des vues. Aucun changement n'est
      attendu : le hub et la planche du moteur lisent la recette par défaut
      (Dark normal). Un changement de vue se note et se lit avant de commiter.
- [ ] `npm run agents:diff`

Fin : un tableau des résultats. La conversation principale relit le diff,
commite par chemins explicites sur `main` et coche les lots avec leur commit.

### T1. Recette du mainteneur dans Figma

Les cases restent ouvertes tant que le mainteneur ne les a pas jouées.

- [ ] `npm run build`, puis recharger Palettes.
- [ ] Poppy Vivid et Irene Vivid en Dark inversé : le ◆ est au 800, le code du
      cran est `#F17562` et `#E96AD1`, la mention et la couleur choisie
      paraissent, aucune garantie n'est manquée. Le Light est inchangé.
- [ ] Une palette qui tenait déjà la garantie 9 en Dark inversé garde sa
      référence exacte, sans mention.
- [ ] Attendu après la mise à jour : la planche de Poppy et d'Irene devient
      périmée et leurs tokens passent à « à mettre à jour », parce que le 800
      Dark change. Les autres palettes restent à jour.
- [ ] Une palette figée reprise du fichier garde sa référence (E2).

Fait de M1 (`Mesures/mesurer-reference-ajustee.ts`) : sur la
configuration du mainteneur, seules Poppy Vivid (`#F17562`, ΔL +0,066) et Irene
Vivid (`#E96AD1`, ΔL +0,056) changent, de deux garanties manquées à zéro. Sur
360 teintes, 2 483 rampes ont leur référence sur le 800 Dark inversé et manquent
le seuil ; correction médiane 0,034, maximale 0,088 (teintes 326 à 331, Soft,
référence à 0,64) ; aucun cran ne bute sur son voisin, l'ordre tient, le plus
petit écart au voisin plus clair vaut 0,121 ; aucune garantie ne se met à
manquer. Le 950 ne se présente pas. Light et Dark normal intacts.

### Questions tranchées

| N° | Question | Bloque | Réponse du mainteneur |
|---|---|---|---|
| 1 | Les textes et les lieux de la mention valent-ils : détail de la nuance, ligne de Création, réglette de Vérification, note de la planche ? « Couleur d'origine » porte déjà un autre sens (l'originale d'« Ajuster la référence », `originaleRetiree`) : garder ce terme ou en prendre un autre, par exemple « couleur choisie » ? La fiche de Gestion montre-t-elle aussi la mention ? | P1 | « Couleur choisie », sans l'écart appliqué ; Gestion sans mention |
| 2 | Le rapport JSON porte-t-il l'ajustement ? Aujourd'hui `reference` y est la couleur choisie et le cran Dark en donne une autre. Un champ ajouté monterait `FORMAT_DU_RAPPORT` à 6 (`[VER-16]`). | P1, D1 | Aucun champ ; le rapport montre les deux hexas |
| 3 | Si M1 trouve un cran corrigé à moins de 0,01 de clarté de son voisin plus clair, la correction est-elle bornée par cet écart (la garantie peut alors rester manquée) ou franchit-elle seulement le voisin comme aujourd'hui ? | E1 | Sans objet : M1 trouve 0,121 au plus près, aucune borne nouvelle |
| 4 | La règle s'applique à tout cran de texte du Dark inversé, le 800 (`page/foreground`) et le 950 (`surface/foreground`), parce que la décision parle d'« un cran de texte ». Confirmer le 950 ; M1 dit s'il se présente. | E1 | Les deux crans |
| 5 | Une mention sans geste n'a pas de canal dans Vérification (`rediger-diagnostics-ucm`). La décision demande pourtant la mention : confirmer qu'elle reste une étiquette près du ◆ et que Vérification n'ajoute ni message ni lien. | P1 | Étiquette seule |
