# Nomenclature d'UCM : corpus des design systems et questions à trancher

Statut : plan réordonné d'après la [revue critique](./REVUE-CRITIQUE-PLAN-IMPLEMENTATION.md). Les lots A0 à A8 remplacent N2 à N6 ; N0 et N1 restent comme socle déjà livré.

## Pourquoi

La liste Q1 de questions sur C1 et C2 était inutilisable. Trois défauts du moteur l'expliquaient :

1. L'indice « même place » rapprochait deux variables différentes dont les alias visent la même cible (`badge / scale`).
2. Le lexique coupait tout segment à la casse (`ScaleWrap` donnait `scale`).
3. Rien ne distinguait un mot de nomenclature d'un nom propre à un composant.

Sur C2, les vrais écarts sont des noms qui diffèrent entre branches censées être identiques (le clair et le sombre, une collection de modes et sa cible). Le détail reste dans `_local/`, hors du dépôt.

La revue a montré que corriger le bruit ne suffit pas. Il faut garantir qu'une réponse produit le renommage attendu, qu'elle ne fusionne pas deux sens différents, et mesurer les cas manqués autant que le bruit.

## Deux fins distinctes

- **Dossier d'arbitrage** (objectif de cette passe) : méthode adoptée, jeu de référence annoté, décisions de termes prises par le mainteneur dans `decisions.json`.
- **Moteur livré** (passe suivante) : décisions intégrées au kit, renommages simulés et vérifiés, recette Figma.

## Règles retenues

- **Relation lexicale et équivalence sont deux choses.** Une faute, un pluriel ou une terminaison justifient une question, pas un remplacement. Une négation (`selected` / `unselected`, `active` / `inactive`) est une opposition : jamais une question de fusion.
- **Une question n'est posée que si sa réponse s'applique** au découpage employé par le renommage. Sinon elle disparaîtrait sans rien renommer.
- **Les noms propres à un composant ne donnent pas de question**, mais les états, rôles et propriétés d'un token de composant (`components/Badge/background/hover`) restent comparables.
- **Les comptes du marché sont des usages observés**, avec leur dénominateur. Ils éclairent une décision ; ils ne prouvent pas une synonymie.
- **C2 et ses dérivés restent locaux.** Les tests et documents commités n'emploient que des noms inventés.

## Socle déjà livré

### N0 · Détection corrigée

- [x] « Même place » supprimé ; indice `branches-paralleles` avec appariement un à un, recouvrement d'au moins 80 %, crans ignorés (`9e4c240`).
- [x] Découpage pour les questions gardé par le vocabulaire : morceaux de 3 lettres, un morceau exact, faute à une lettre avec la même initiale (`9e4c240`).
- [x] Négation retirée des fusions ; faute seulement vers un terme connu ; garde-fou d'applicabilité (`9e4c240`).
- [x] Mesure : C1 passe de 47 à 8 questions, C2 de 230 à 14, aucune hors sujet sur ces 14. Sur l'inventaire local de sept paires de C2, trois sont retrouvées ; les quatre autres sont manquées par opposition, par ex aequo, par double écart ou par renommage d'alias (`9e4c240`).

### N1 · Corpus de référence

- [x] `docs/references/design-systems/` : 13 systèmes, sources figées par SHA-256, extracteurs, UCM au même format (`c93b939`).

## Lots

- [x] **A0 · Méthode adoptée.** Les règles M01 à M13 sont tranchées dans `decisions.json` ; M08 et M09 sont refusées, ce qui ajoute deux corrections à A2 et A3.
- [x] **A1 · Jeu de référence annoté.** 17 paires de C2 classées : 10 équivalentes, 5 distinctes, 2 indéterminées, dans `_local/annotations-c2.json`.
- [x] **A6 · Décisions de termes.** Toutes les questions sont tranchées, T09 et T10 annulées (tirées d’un ancien export) ; voir `decisions.json`. L’architecture de référence est la [vue illustrée multimarques](../../Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html), pas l’export d’UCM-Playground.
- [x] **A2 · Même découpage pour les questions et le renommage.** (`f067a52`).
  - [x] `decouperSegment` coupe un bloc soudé comme les questions, en tranches du mot d’origine (`textsucccess` → `text` + `succcess`) ; un nom sans règle reste identique (`f067a52`).
  - [x] Test de session : la réponse à la faute renomme, l’annulation rend l’état initial (`f067a52`).
- [x] **A3 · Branches parallèles et formes, d’après les décisions.** (`620d0e6`).
  - [x] M08 : un mot connu face à un mot inconnu donne une question (`hover` / `survol`) (`620d0e6`).
  - [x] S06 : un singulier et un pluriel ne sont comparés que s’ils sont du même type, deux variables ou deux groupes (`620d0e6`) ; dans C2, `paper` et `action` sont aussi des groupes, leur paire reste donc posée.
  - [x] T01 et S04 : `foreground` et `text` ne sont jamais proposés comme le même mot (`8a08f82`) : `text` devient un rôle connu, deux rôles connus non synonymes ne se rapprochent pas.
  - [x] Remesurer C1 et C2 ; comparer les questions de C2 aux 17 paires annotées (`620d0e6`) : C2 donne 15 questions.
- [x] **A7 · Décisions dans les registres du kit.** Chaque changement renvoie à son identifiant de décision (`8a08f82`).
  - [x] États (S01, T02, T12, S05, C03) : `default` (tolère `rest`, `resting`, `normal`, `selected-false`, `unselected`), `hover` (`hovered`), `focus` (`focused`), `pressed` (`press`), `disabled` (`disable`), `selected` (`selected-true`) (`8a08f82`).
  - [x] Tailles (T06, S02) : dans le nom final des variables, `small` devient `sm`, `medium` devient `md`, `large` et `big` deviennent `lg`. Dans les dossiers, `sm` devient `small`, `md` devient `medium`, `lg` et `big` deviennent `large`. Les autres tailles (`xs`, `xl`, `2xl`…) gardent leur règle.
  - [x] Statuts (T03, C04 à C06) : `danger` tolère `error`, `critical`, `negative` ; `success` tolère `positive` ; `warning` tolère `caution`, `attention`, `notice` ; `info` tolère `information`, `informative` (`8a08f82`).
  - [x] Rôles (T01, T14, T15, C01, C08) : `text` et `inverse` ajoutés ; `background` tolère `bg` ; `ring` tolère `focus-ring` ; `divider` tolère `separator` (`8a08f82`).
  - [x] Propriétés (T04, T05, T07, T13) : `font-size`, `line-height`, `letter-spacing`, `font-weight`, `font-family` ; `radius` tolère `border-radius` ; `color` tolère `colors` et `colour` ; `size`, `icon`, `dimension` tolèrent leur pluriel (`8a08f82`).
  - [x] Hors registre, faute de portée par type : `stroke` → `border` (C02), `grey` → `neutral` (C07), `elevation` → `shadow` (C09) restent des questions au cas par cas (`8a08f82`) ; `negative` reste aussi une question, car il nomme un espacement négatif chez Atlassian.
  - [x] Simulation des renommages sur l’architecture de référence, tests, vues générées, version du kit (`c883ec7`) : 369 renommages sur l’instantané de la vue illustrée, dont 306 `colors` → `color`, 60 `press` → `pressed`, 48 `error` → `danger` ; kit 0.9.0.
- [ ] **Migration du fichier Figma** (mainteneur) : renommer avec Architect avant d’écrire avec Palettes, qui vise désormais `primitives/color`.
- [ ] **A4 · Corpus UCM et audit des extractions.**
  - [x] Corpus UCM tiré de l’instantané de la vue illustrée : 1 300 noms dans les sept collections, couches renseignées, types suivis par alias et par mode ; 24 valeurs absentes restent sans type. Les 24 registres du kit, architecture comprise, et les empreintes des entrées sont relevés dans `docs/references/design-systems/ucm/`.
  - [ ] Audit des extractions externes : provenance des occurrences, couches inconnues et réglages MUI.
- [ ] **A5 · Analyse par concept** sur occurrences annotées, si une décision reste à justifier.
- [ ] **A8 · Recette Figma** sur une copie et nouveau jugement de Q1, par le mainteneur.

## Format des décisions

`decisions.json`, commité, ne contient aucun nom de C2. Une entrée par question :

```json
{ "id": "T03", "donnees": "c93b939", "question": 1, "choix": "A",
  "portee": "partout | contexte | distinction", "raison": "…", "etat": "adopte | distinct | differe | a-examiner" }
```

Les annotations des paires de C2 vont dans `_local/annotations-c2.json`, au même format.
