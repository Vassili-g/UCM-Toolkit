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

- [x] `VARIABLES_DE_PALETTE` : ajouter `surface/subtle` après
      `surface/pressed`, et `surface/divider` après `surface/border`.
- [x] `TABLE_DES_DOSSIERS`, Light normal : `surface/foreground` et
      `surface/border` passent de 800 à 700.
- [x] `TABLE_DES_DOSSIERS`, les quatre tables : `surface/subtle` vaut 50 en
      Light (normal et inversé) et 200 en Dark (normal et inversé).
      `surface/divider` vaut 300 en Light et 500 en Dark.
- [x] `SUPPORT_DES_VARIABLES` :
  - `solid/default`, `solid/hover`, `solid/pressed` : support `FOND`
    (`peint: ['background']`, `FRAME_FILL`, `SHAPE_FILL`). Supprimer la
    constante `SOLID` si plus rien ne la lit.
  - `TEXTE` : ajouter `STROKE_COLOR` aux portées. Toutes les variables
    `foreground` le lisent, neutre et `disabled/foreground` compris.
  - Nouveau support `FILET` : `peint: ['border']`, portées `STROKE_COLOR`,
    `FRAME_FILL`, `SHAPE_FILL`. Le donner à `page/divider` et
    `surface/divider`.
  - `surface/subtle` : `FOND`.
- [x] `theme.ts`, `TEXTES_DES_VARIABLES` :
  - `surface/subtle` : libellé « fond teinté léger » / « subtle tinted fill » ;
    définition « Fond teinté très léger, sans état. » / « Very light tinted
    background, with no state. ».
  - `surface/divider` : libellé « filet sur fond teinté » / « divider on tinted
    fill » ; définition « Trait de séparation sur un fond teinté. » /
    « Dividing line on a tinted background. ».
  - Corriger le commentaire de `libellesDesVariables` : le nombre de libellés
    passe de dix-sept à dix-neuf.
- [x] `TABLE_DES_DOSSIERS`, Dark inversé : `ring` passe de 700 à 800. Le
      Dark normal ne change pas : il n'est pas mesuré.
- [x] Le 50 devient requis. Les crans requis sont la réunion des crans de la
      table (`cransRequis`, `[REC-13]`) : `surface/subtle` y fait entrer le 50.
      Les deux préréglages le portent déjà. Une recette sans 50 est refusée
      (`crans-emplois`). Corriger le commentaire de `validerRecette` (« seul 50
      est facultatif ») et ajouter un test du refus.
- [x] Mettre à jour les tests du kit qui comptent les variables, lisent la table
      ou les portées. Ajouter un test par règle nouvelle : crans des deux
      variables dans les quatre tables, portées de `FILET`, `TEXTE` et des fonds
      de `solid`.

### Garanties de contraste

- [x] Garantie 3 : `surface/foreground` au seuil `texte` sur `surface/subtle`,
      `surface/default`, `surface/hover`, la page et la carte. Retirer
      `surface/pressed`.
- [x] Nouvelle garantie 8 : `surface/foreground` au seuil `nonTexte` sur
      `surface/pressed`. Le numéro 8 évite de renuméroter les garanties 1 à 7
      que les documents citent.
- [x] Garantie 4 : ajouter `surface/subtle` à ses fonds ; garder
      `surface/pressed`.
- [x] Nouvelle garantie 9 : `page/foreground` au seuil `texte` sur
      `surface/default`. Elle dit qu'un composant de la page reste lisible
      dans un fond teinté au repos.
- [x] `surface/divider` n'entre dans aucune garantie.
- [x] Mettre à jour le nombre de promesses par mode et par intensité partout où
      il est écrit (commentaires de `promesses.ts`, tests, hub).
- [x] `garantie.ts` (garantie des courbes) : vérifier qu'elle ne lit pas
      `surface/pressed` comme fond textuel. Ne rien changer d'autre.
- [x] Tests : la garantie 8 juge à 3:1 ; la garantie 9 juge
      `page/foreground` sur `surface/default` ; la garantie 3 ne contient plus
      l'appui ; `garantieJugeable` traite `surface/subtle`.
- [x] Changer la version du kit (`packages/kit/package.json`), puis faire passer
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

- [x] Appliquer la règle par numéro de cran, pas par rang : une palette libre
      (`palette.crans`) peut avoir une autre liste.
- [x] Garder la teinte et la part de chroma de chaque cran : la chroma suit le
      plafond à la nouvelle clarté, à part égale.
- [x] Ne jamais toucher le cran qui porte la référence.
- [x] Le Dark ne change pas.
- [x] La référence de la simulation est
      `docs/notes/Recherches/SUJETS IMPORTANTS à trancher/Mesures/generer-donnees.ts`,
      fonction `cransCommuns` (poids `[1, 1, 1, 2/3, 1/3]`).
- [x] Les promesses et la limite dynamique se calculent sur les crans communs.
- [x] Tests : sur la configuration
      `Mesures/palettes-et-reglages.json` copiée dans les fixtures de `couleur`,
      l'écart de clarté entre palettes vaut 0,002 au plus sur le 50, le 100 et
      le 200 ; Ocean Vivid (réglage de luminosité −0,06) a son 50 à 0,975 ; le
      50 de Sun garde une chroma non nulle.
- [x] Mettre à jour les tests qui figent des couleurs claires. Ne pas assouplir
      un test de promesse : signaler tout échec nouveau dans le rendu.
- [x] Lecture : une recette du format 10 ou 11 sans 50 reçoit le 50, avec la
      luminosité que `luminositeAuNumero` donne sur sa grille, comme le 400, le
      500 et le 950 du format 10 (`[REC-13]`). Sans cela, le lot K la rend
      illisible. Test de régression.
- [x] `alertes.ts` : corriger le commentaire « Les crans facultatifs 50, 400 et
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

- [ ] Ne jamais corriger le cran qui porte la référence. La garantie échoue
      alors, et Palettes propose « Ajuster la référence » par le chemin qui
      existe pour une référence exacte.
- [ ] Ne jamais faire franchir au cran corrigé la clarté du cran voisin le plus
      foncé (Light) ou le plus clair (Dark).
- [ ] Le cran corrigé reste le même cran pour toutes les variables qui le
      visent : en Light normal, le 700 porte aussi `page/foreground`,
      `page/border` et `solid/default`.
- [ ] La limite dynamique lit les rampes corrigées.
- [ ] Tests, sur la configuration du mainteneur : Emerald Soft passe de 0,501 à
      0,493, Grass Soft à 0,494, Grass Vivid à 0,496, Emerald Vivid à 0,495, Sky
      Soft à 0,499 ; texte 700 sur le 200 ≥ 4,5 pour les 21 rampes.
- [ ] Test de balayage, teintes 108 à 249 par pas de 10, références au 600 :
      correction ≤ 0,011 en Soft et ≤ 0,008 en Vivid. Référence de mesure :
      `balayer()` dans `Mesures/generer-donnees.ts`.
- [ ] Test : une référence ancrée au 700 qui manque 4,5 n'est pas corrigée, et
      la garantie 3 manque pour cette palette.
- [ ] Tests, Dark inversé de la configuration du mainteneur : le 800 de Titanium,
      Terracota, Deep, Poppy Soft, Ocean, Iris et Irene Soft s'éclaircit de
      0,009 au plus et passe 4,5 sur le 300. Poppy Vivid et Irene Vivid ont leur
      référence au 800 Dark : elles ne sont pas corrigées et la garantie 9
      manque.
- [ ] Mesurer la plus forte correction du 800 Dark sur 360 teintes, références
      au 500, au 600 et au 700. Rendre le résultat dans le rendu du lot : le
      mainteneur a validé 0,009 au plus sur ses palettes.
- [ ] La règle vaut aussi pour le Light inversé et le Dark normal, qui ne sont
      pas mesurés : la garantie 9 y juge le 800 Light et le 700 Dark sur le
      fond teinté. Rendre, sur la configuration du mainteneur et sur 360
      teintes, la plus forte correction de ces deux sens. Ne pas les exclure de
      la règle sans le dire dans le rendu.

Fin : `npm run test:paquet -- couleur` passe ; `npm run typecheck` passe.

## P1. UCM Palettes

Agent : `implementeur`.

Fichiers : `packages/plugin-palettes/src/i18n/fr.ts`, `en.ts`,
`src/planche/modele.ts`, `src/presentation.ts`, `src/ui/garanties.ts`,
`src/ui/modeleDesGaranties.ts`, `src/ui/nuancier.ts`, tests du paquet.

- [ ] Libellés et textes des garanties 8 et 9 (fr et en), au format des
      garanties voisines : « Texte des fonds teintés à l'appui » / « Tinted fill
      text, pressed » ; « Texte de la page sur un fond teinté » / « Page text on
      a tinted fill ».
- [ ] Nombre de contrôles affiché : suivre le nouveau total de promesses.
- [ ] Les deux nouvelles variables apparaissent dans l'aperçu, la planche et le
      rapport. Le nuancier range `surface/subtle` avec les fonds teintés et
      `surface/divider` avec les contours.
- [ ] Les garanties 3 et 9 qui manquent sur une référence mènent à « Ajuster
      la référence ». Ajouter les tests.
- [ ] Avant de commiter, chercher dans `src/ui` les noms et valeurs des
      fixtures : aucune donnée de maquette ne doit y entrer.

Fin : `npm run test:paquet -- palettes` passe ; `npm run build:plugin -- palettes`
passe.

## A1. UCM Architect

Agent : `implementeur`.

Fichiers : `packages/plugin-architect/src/integrations/profilUcm.ts`, fixtures
de `packages/plugin-architect/tests/`, messages qui citent les portées.

- [x] Les constats `portee` suivent la nouvelle table : fonds de `solid` sans
      `STROKE_COLOR`, `foreground` avec, filets avec `FRAME_FILL` et
      `SHAPE_FILL`.
- [x] `surface/subtle` et `surface/divider` sont reconnus par
      `variableDuThemeReconnue`. Ajouter les tests.
- [x] Mettre à jour les fixtures qui donnent `STROKE_COLOR` aux fonds de
      `solid` ou qui comptent les variables de `theme`.
- [x] Dans les textes destinés au designer, écrire « scope » et non
      « portée ». Charger la skill `rediger-diagnostics-ucm` avant d'écrire un
      message.

Fin : `npm run test:paquet -- architect` passe ;
`npm run build:plugin -- architect` passe.

Fait : `7c9678d6`. Le code d'Architect lisait déjà la table du kit : seuls les tests changent.

## D1. Documents

Agent : `implementeur`.

- [ ] `npm run agents:diff`, puis relire chaque document listé.
- [ ] Spécification de Palettes
      (`docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`) :
      section 11.2, garanties 3, 4, 8 et 9 ; clarté commune et correction des
      textes par teinte, en regard de `[MOT-38]`.
- [ ] `packages/couleur/invariants/moteur-de-couleur.md` et les invariants du
      kit qui citent la table, les garanties ou les portées.
- [ ] `docs/format/FORMAT.md` et `docs/format/CHANGELOG-FORMAT.md` si la liste
      des variables de `theme` ou leurs portées font partie du format publié.
- [ ] Charger `rediger-sans-tics-ia` avant d'écrire. Lancer
      `node scripts/controle-style.mjs <fichiers>`.

Fin : `controle-style` conforme ; aucun document ne décrit l'ancienne table.

## V1. Vérification

Agent : `verificateur`.

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run vues`, puis le test de fraîcheur des vues.

Fin : un tableau des résultats. La conversation principale commite les vues
régénérées.

## R1. Publication

Agent : `executant`, avec la skill `publier-paquets`.

- [ ] Publier `@ucm-kit/core`, puis `@ucm-kit/cli` et
      `@ucm-kit/adapter-typescript` si la skill le demande.
- [ ] Pousser `main`.

Fin : les versions publiées répondent sur le registre.

## Après le plan

Le mainteneur ajoute `surface/subtle` et `surface/divider` à son fichier Figma,
règle les scopes, puis fait la recette dans Figma avec UCM Palettes et UCM
Architect. Avant, il lance `npm run build` : la galerie ne reconstruit que
`ui.html`.
