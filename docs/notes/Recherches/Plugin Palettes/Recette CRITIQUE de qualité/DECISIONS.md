# Décisions de la recette critique : la référence pour l'implémentation

Ce document fait foi pour l'implémentation. Les autres documents du dossier
mesurent, comparent ou racontent comment on est arrivé ici ; en cas d'écart
avec eux, ce document l'emporte, et l'écart est un défaut à corriger dans
l'autre document.

Toutes les décisions sont **arrêtées** : le mainteneur les a choisies au
banc visuel ou validées dans la [page de synthèse](./SYNTHESE.html). Le
[plan d'implémentation](./PLAN-IMPLEMENTATION.md) les découpe en tâches et
propose les points de la section 6.

## 1. Le rôle de chaque document

| Document | Rôle |
|---|---|
| Ce document | La référence : valeurs, statuts, code à porter |
| [SOLUTION-RAMPES.md](./SOLUTION-RAMPES.md), sections 3 et 4 | Le détail et les raisons des décisions des sujets 1 et 2 ; la liste des fichiers à toucher, dont « Le focus, fichier par fichier » |
| [DOSSIER-COMPARER.md](./DOSSIER-COMPARER.md), section 11, et [SPEC-ECRANS-HARMONISATION.md](./SPEC-ECRANS-HARMONISATION.md) | Les décisions du sujet 3 et la spécification de ses écrans |
| [ROBUSTESSE-DES-RAMPES.md](./ROBUSTESSE-DES-RAMPES.md) | Mesures sur toutes les teintes et notes du banc visuel ; ses sections 2 à 7 décrivent aussi des pistes écartées |
| [DOSSIER-QUALITE-DES-PALETTES.md](./DOSSIER-QUALITE-DES-PALETTES.md) | Premières mesures et pistes ; historique |
| Maquettes (`Maquettes/`) et bancs visuels | Illustrations et relevés de notes ; ils ne font pas foi, sauf la SPEC pour l'onglet Harmonisation |
| [PREPARATION-CLAUDE-OPUS.md](./PREPARATION-CLAUDE-OPUS.md), [ANALYSE-UNTITLED-UI.md](./ANALYSE-UNTITLED-UI.md), dossier d'élévation, ancien dossier d'harmonisation | Points de départ ; historique |
| `Mesures/` | Scripts de mesure ; `prototype.ts` et `variantes.ts` portent le code de référence de la règle |

## 2. Le moteur

### Q1 et Q2. La règle de chroma (arrêtée)

L'enveloppe par thème, élargie autour du jaune :

`C = min(part × plafond(L, H), p₀ × min(a × marge(H) × (1 − L), b × L))`

`marge(H) = 1 + k × exp(−½ × (écart angulaire entre H et 100°, divisé par 12°)²)`
en Light ; `marge(H) = 1` en Dark.

| Profil | p₀ (part par défaut) | Light : a, b | Dark : a, b | k (marge des jaunes) |
|---|---|---|---|---|
| Soft | 0,85 | 0,6 · 0,38 | 1,1 · 0,38 | 1 |
| Vivid, et intensité unique | 0,95 | 1,1 · 0,48 | 1,1 · 0,30 | 0,5 |

`k` = 1 et 0,5 sont les marges de +100 % et +50 % citées ailleurs.

`part` est la part de la palette après son Color shift de saturation ; en Dark,
elle garde la réduction des fonds du thème Dark (`facteurSombre`).

Code de référence : `Mesures/prototype.ts`, fonction `enveloppeAvecJaunes` ;
`Mesures/variantes.ts`, constante `REGLE_FINALE`. La chaîne des rampes est
celle de `rampesDuBanc`, identique à `rampesDe` hors règle de chroma.

À porter dans `packages/couleur` : `cranVise` (`rampe.ts`), les paramètres de
la règle par profil et par thème dans la recette (format 11), `palette.ts`,
`limites.ts`.

### Q3. Les valeurs par défaut et les recettes existantes (arrêtée)

Les valeurs du tableau ci-dessus sont les valeurs par défaut de la recette,
dans la Configuration. Une recette ancienne n'a pas à garder ses couleurs : le
mainteneur l'a dit à la revue du plan, ses recettes servent au réglage et ses
primitives peuvent être réécrites. Lue au format 11, elle prend les parts et
l'enveloppe par défaut ; le [plan](./PLAN-IMPLEMENTATION.md), PR4, dit le
détail.

### Q10. La dérive de teinte (arrêtée)

Le préréglage Tailwind choisit les deux rampes voisines de Tailwind d'après
leur teinte à la clarté de la référence, et lit sur elles la dérive à chaque
bout (`bouts.clair`, `bouts.sombre`), interpolée selon la teinte. Pire écart
à Tailwind : 38° avant, 12° après.

Code de référence : `Mesures/prototype.ts`, fonction `deriveAuxBouts`. À
porter dans `packages/couleur/src/tailwind.ts` (`deriveTailwind`,
`prereglageTailwind`) ; le relevé `derives` de la recette porte la teinte et
la clarté de chaque cran des rampes de Tailwind, et plus seulement les deux
bouts.

### La courbe Dark (arrêtée, avec Q5)

Le cran 50 de la courbe Dark par défaut passe de L 0,180 à L 0,145, dans les
deux préréglages (11 et 13 nuances, qui partagent ce cran). Le
réglage « Fond de la page » Dark vaut par défaut `#0A0A0A` (au lieu de
`#121212`) ; le Light garde `#F7F7F7`. Une recette existante garde sa courbe
et son fond jusqu'à un changement accepté par le designer. L'alerte de fond
hors courbe (`alertesDesFonds`) ne change pas : elle ne refuse qu'un fond Dark
plus clair que le cran 50.

## 3. La table des rôles

### Q5, Q6 et Q8. La table (arrêtées)

Une table par thème et par sens. Le sens vaut `normal` quand le texte des
boutons est blanc en Light ou noir en Dark, `inverse` sinon (`sensDuTheme`).

| Variable | Light normal | Light inversé | Dark normal | Dark inversé |
|---|---|---|---|---|
| `solid/default`, `hover`, `pressed` | 700, 800, 900 | 700, 600, 500 | 700, 800, 900 | 700, 600, 500 |
| `solid/foreground` | texte des boutons | texte des boutons | texte des boutons | texte des boutons |
| `surface/default`, `hover`, `pressed` | 100, 200, 300 | 100, 200, 300 | **300, 400, 500** | **300, 400, 500** |
| `surface/foreground`, `surface/border` | 800 | 900 | **950** | **950** |
| `page/foreground`, `page/border` | 700 | 800 | 700 | 800 |
| `page/divider` | 300 | 300 | 300 | 300 |
| `ring` (remplace `page/focus`) | 600 | 700 | 600 | 700 |

En gras, ce qui change par rapport à la table du kit d'aujourd'hui. Le Light
ne change pas ; le focus garde ses crans.

- **Q8** : `page/focus` devient `ring`, une variable à la racine de la
  palette, à côté des dossiers `solid`, `surface` et `page` (13 variables par
  palette, comme aujourd'hui).
- **Crans requis** : 100, 200, 300, 400, 500, 600, 700, 800, 900 et 950,
  déduits de la table. Le cran 50 reste dans les listes par défaut : la page
  du thème vise le neutre 50.
- **Le neutre** suit la même table.
- **`disabled/*`** ne change pas (200, 500, 500).

À porter : `packages/kit/src/emplois/dossiers.ts` et tous les lecteurs de la
table, listés dans la [solution](./SOLUTION-RAMPES.md), section 4.

### Q9. Les composants à surface (arrêtée)

Les rôles actuels suffisent. Alerte et badge discret : `surface/default` et
`surface/foreground` ; bouton teinté : les trois états de `surface` ; contour
discret : `page/divider` ; contour franc : `surface/border`. Le badge discret
suffit avec la table retenue.

### Q4. Le texte courant des alertes (arrêtée)

Choix des composants, coloré ou neutre ; la palette n'en dépend pas.

## 4. L'élévation et les garanties

### La page et la carte (arrêtées, avec Q5)

| Niveau | Light | Dark |
|---|---|---|
| Page, `elevation/page` | neutre 50 | neutre 50 (L 0,145) |
| Carte, `elevation/raised` | blanc | neutre 100 |

Le réglage « Fond de la page » doit valoir la couleur que `elevation/page`
affiche. Le chemin des tokens ne change pas : composants, `theme`,
`color-utilities` ou `color-brands`, `primitives`.

### G7. La garantie du focus (arrêtée)

G7 juge `ring` à 3:1 contre la page et contre la carte, et non plus contre
`surface/default`. La page est le pire cas en Light, la carte en Dark. Le
plugin doit donc connaître la couleur de la carte : déduite (blanche en
Light, neutre 100 en Dark) ou réglée (« Fond de la carte ») ; ce choix est
ouvert. Les autres garanties ne changent pas. Sur le balayage de 72 teintes,
la table et la règle retenues, avec G7 contre la page et la carte et le focus
à 600 ou 700, laissent 144 échecs, tous G1 et déjà présents aujourd'hui : le
texte blanc sur un plein où une référence est ancrée. Mesuré avec la page et
la carte du Titanium du mainteneur comme avec celles par défaut
(`#0A0A0A`, `#1C1C1C`) : `FILTRE="retenue au banc" npx tsx Mesures/garanties-regles.ts`,
résultat dans [GARANTIES-RETENUES.json](./Mesures/GARANTIES-RETENUES.json).

### Q7. La forme du focus (arrêtée)

L'anneau décalé partout : 2 px du fond, puis 2 px de trait au cran de `ring`.
Le plugin le dessine déjà (`ui/interfaceDeTest.ts`, `ui/specimens.ts`). Le
halo pâle est écarté : son rôle s'afficherait « AA ✗ ».

## 5. Le sujet 3 : comparer, harmoniser, différencier

C1 à C10 sont arrêtées : voir le [dossier Comparer](./DOSSIER-COMPARER.md),
section 11, et la [spécification des écrans](./SPEC-ECRANS-HARMONISATION.md).

C6, l'alerte des palettes trop proches, est adaptée au texte Dark 950 : elle
compare le plein dans les deux thèmes et le texte du fond teinté en Light
seulement, au seuil `palettesProches` de la recette, dans l'intensité Vivid
ou unique. Adaptation validée avec C6.

## 6. Ce que le plan d'implémentation doit concevoir

Le mainteneur n'a pas décidé ces points ; le plan les propose, il les
valide :

- Le schéma du format 11 de la recette : le nom et la place des paramètres de
  la règle (p₀, a, b, k par profil et par thème), et la lecture des formats
  anciens (Q3).
- Le format étendu du relevé `derives` (teinte et clarté de chaque cran des
  rampes de Tailwind) et sa migration.
- La couleur de la carte pour G7 : déduite du neutre et du blanc, ou un
  réglage « Fond de la carte », avec sa place dans la recette.
- L'ordre des lots et les tests de chaque lot.

## 7. Ce qui reste ouvert

- La couleur de la carte pour G7 : le plan propose de la déduire (section 6).
- L'ombre ou le contour de la carte en Dark.
- En Dark inversé, l'appui du fond teinté (500) a la couleur de l'appui du
  bouton plein ; seul le texte les distingue.
- Les seuils des constats de saturation et de luminosité de l'onglet
  Harmonisation, valeurs d'essai.
- La mise à jour de l'architecture de référence et de sa vue illustrée, qui
  décrivent encore l'état antérieur.
