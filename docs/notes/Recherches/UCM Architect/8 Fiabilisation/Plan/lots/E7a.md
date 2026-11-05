# E7a. Axes et valeurs

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E6, E1a.

Fichiers : `packages/kit/src/controles/nommage.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/kit/tests/stress/f5-variants/`. Lisez `PLAN-STRESS-F5-F6-VARIANTS-TYPO.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E7.1 Le nom de l'axe décide de son rôle, avant les termes d'un autre registre (Q-F5-2, N-36).
- [x] E7.2 Deux valeurs renommées dans deux axes donnent C7 sans question (Q-F5-4). Un seul axe encore ouvert donne une question. Les candidats ne comptent pas une valeur déjà
  présente (N-35).
- [ ] E7.3 Deux axes de style (Q-F5-3). Un constat À faire demande de les réunir en un seul axe (`Variant=Solid, Subtle, Outline`),
  sans fusion automatique. Les tokens du style `subtle` visent `surface/*` du thème, ceux du style `solid` visent `solid/*`, et un écart
  donne un constat.
- [ ] E7.4 Casse et forme (Q-F5-5, Q-F5-6, N-34, N-37). Le variant en toutes lettres correspond au token abrégé par la table de E1.1. C9
  reste pour une valeur inconnue. `Error` reçoit C8 vers `Danger`.
- [x] E7.7 Valeur à point ou à barre lue par E1.6 (Q-F5-10).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E7.1, E7.2 et E7.7 faites. E7.3 et E7.4 sont faites côté kit et harnais, sans les textes du designer. Pas de commit, pas de montée de version.

Fichiers :
- `packages/kit/src/controles/nommage.ts` :
  - E7.1 : une lecture ambiguë de `tokensDuComposant` se départage en gardant celle où le plus de segments sont des valeurs de l'axe de leur rôle. La grammaire reçoit pour chaque valeur d'axe aussi son segment de token (`segmentDeToken`).
  - E7.2 : deux axes ouverts (chacun a une valeur sans token) ne posent aucune question. Un candidat ne compte pas une valeur déjà présente, et un candidat unique présent dans deux familles donne C12 (N-35). `correspondAuxAutresAxes` compare par `memeValeurDAxe` (N-34).
  - E7.3 : C63 `deux-axes-de-style`, et C63 `style-et-dossier` pour un token `subtle` qui vise `solid` ou un token `solid` qui vise `surface`. Les autres dossiers (`disabled`, `ring`) ne se jugent pas.
  - E7.4 : C10 attend l'identifiant du terme (`sm`) dans le token, non plus le mot entier du dossier ; la palette passe par C8 (`error` vers `danger`) ; un variant qui écrit `S`, `sm`, `Middle` ou `Error` reçoit C10 ou C8 (`faits.cote = 'variant'`) avec une correction `nom-de-valeur` vers le mot entier, sans correction quand ce mot est déjà une valeur de l'axe ou que le jeu n'a pas d'identifiant ; la casse seule d'un terme connu ne donne plus de C9 (N-37) ; `memeValeurDAxe` accepte le segment que le token écrit pour la valeur (E7.7).
  - `segmentEcritPourLaValeur`, nouvelle : le token cible d'une correction ou d'une propagation s'écrit comme les tokens du composant écrivent la valeur.
- `packages/kit/src/controles/corrections.ts` (`corrigerAxe`, `corrigerEnsemble`) et `packages/kit/src/controles/propagation.ts` (`nomVise`) : ils cherchent le token cible par `segmentEcritPourLaValeur`. Sans cela, `Size=Medium` ne retrouvait pas `md`. `propagation.ts` n'est pas dans la liste du lot : le changement tient en une ligne et sans lui le harnais F3 et le plugin cassaient.
- Harnais F5 (`packages/kit/tests/stress/f5-variants/`) : variants en toutes lettres et tokens abrégés dans P0, les profils (`formeUcm`) et tous les opérateurs ; le modèle de référence (`cas.ts`) attend les C10 et C8 de variant, C10 vers l'identifiant, C8 de palette, aucune question à deux axes ouverts ; les cas jugent C7 à C13 et C31 à C33, et C63 seulement pour A3 et FP1 ; les corpus `axes-attestes.json` et `valeurs-attestees.json` passent à `attendu` (les booléens ont `role: null`) ; V4, V5, A3 (style), A4, Q2, FP1 à FP3 et trois couples sortent de `mesure`.
- Harnais F3 (`packages/kit/tests/stress/f3-composant/composantDeBase.ts`, `profils.ts`) : `Size` vaut `Small` et `Medium`, le token écrit `sm` et `md`.
- Tests : `packages/kit/tests/axes-et-valeurs-de-variant.test.ts` (18 tests). Sur les sources d'avant le lot, 14 des 16 premiers échouent et les deux tests de `segmentEcritPourLaValeur` échouent ; les 2 qui passent gardent des règles qui existaient (axe `Color` à sa place, styles qui visent leur dossier). Tests existants dont l'attente change avec la décision Q-F5-6 : `controles-composant.test.ts` (3), `controles-recette-figma.test.ts` (1), `valeurDAxeUnique.test.ts` (1), `candidatsDeLongueur.test.ts` (2, E6), `stressVariantsOperateurs.test.ts`, `stressTypographieOperateurs.test.ts`, `stressComposantBase.test.ts` et `stressComposantOperateursBis.test.ts`. Le `todo` de p18 (Q-F5-2) dans `stressTypographieOperateurs.test.ts` est retiré : il passe.
- Carte, invariants et SPEC : `packages/kit/CARTE.md` (candidatsDeLongueur, corrections, nommage, f5-variants), `packages/kit/invariants/referentiel.md` (deux puces), `packages/plugin-architect/SPEC.md` (paragraphe de C29).

Décisions prises :
- Le code de « deux axes de style » n'est pas dans le plan. Le kit n'a pas de code libre sans autre sens dans la table de conception (C14 y est « même axe nommé autrement d'un composant à l'autre »). C63, qui range déjà les constats de structure d'un token par `faits.genre`, porte les trois nouveaux genres (`taille-selon-le-mode` en E6, `deux-axes-de-style`, `style-et-dossier`).
- Seul le style est tranché pour deux axes du même rôle (Q-F5-3). Deux axes de taille, de palette ou d'état gardent leur cas `mesure` : le second reste muet.
- Un token qui écrit `s`, `m`, `l`, `middle` ou `extra-large` est inconnu du registre des tailles : il reste en C9 contre le variant (casse) et ne reçoit pas C10. Seuls les variants reçoivent la correction vers le mot entier, comme le dit Q-F5-6.
- La forme tolérée d'un état dans un variant (`hovered`) ne reçoit aucun constat : E1a a décidé qu'aucune écriture n'est décidée pour les états. Les 6 cas V4 correspondants restent `mesure` (Q-F5-5).
- Le dossier de Nomenclature (`Large` pour `lg`) ne s'applique plus au token d'un composant : C10 attend `sm`. La casse initiale d'un dossier majuscule est gardée (`Button/Size/Large` reçoit `Lg`).

Commandes :
- `npm run build --workspace @ucm-kit/core` passe.
- `npm run test --workspace @ucm-kit/core` : 1639 tests ; seul « 32 000 noms » dépasse son chrono sous charge, et il passe seul.
- `npm run typecheck` rend 0.
- `npm run test:paquet -- architect` : 2040 passent au second passage. Le premier avait 8 échecs : un chrono sous charge (« dix mille variables ») et sept cas du harnais F8 qui n'ont rien jugé pendant une reconstruction concurrente du kit.
- `npx tsx tests/stress/f5-variants/mesurer.ts` (3 min) : FP1 à FP4, A3, A4, V1 à V5, Q1 à Q3, M1, O2 et O5 n'ont aucun écart. Restent M4-1 (N-38), O1-2 (N-40) et O3-1 à O3-3 (E-33), qui relèvent de E7b, et 43 groupes en attente (S, I, M3, O6, I2, I3, V4 `Colours`, les 6 formes d'état dans un variant, 4 axes de taille, de palette ou d'état en double).
- `npm run stress:composant -- --operateur Z` : 119 cas, 0 écart.
- `npx tsx --test tests/referentielUnique.test.ts` (racine) : une liste `['default', 'hover']` dans `tests/referencesComposants.test.ts:180`, hors de ce lot (déjà relevée par E1a).

Reste :
- Textes du designer, à écrire avec `rediger-diagnostics-ucm` puis à poser dans `packages/plugin-architect/src/ui/textes/`. Quatre sont à faire. C63 `deux-axes-de-style` demande de réunir les axes en un seul (`Variant=Solid, Subtle, Outline`), sans fusion. C63 `style-et-dossier` dit que le token vise `solid` alors que son style est `subtle`, ou l'inverse. C10 et C8 d'un variant (`faits.cote = 'variant'`, faits `propriete`, `valeur`, `attendu`) ont besoin d'un texte propre, parce que celui de C8 et C10 lit `faits.token` et `faits.segment`, qui manquent ici ; la carte de correction `nom-de-valeur` existe déjà pour C12. La carte de C63 `taille-selon-le-mode` vient de E6.3. Ces constats s'affichent aujourd'hui avec le texte de repli.
- Écran : `packages/plugin-architect/src/ui/ignores/modele.ts` et `src/ui/corrections/` doivent ranger ces nouveaux constats (section, intertitre). Aucun état de galerie n'est ajouté.
- E7.7, proposition du constat de nom `1-5` et `small-medium` pour un token qui garde le point ou la barre : cette proposition relève de Nomenclature, hors des fichiers du lot.
- Q-F5-2 résiduel : une valeur de style renommée dont l'ancien segment est un terme de palette (couples V1+M1, V1+O1, V1+V1 et V1+I2 sur p18, A4+V1 sur P0 et p18) se lit comme une palette. Aucune règle écrite ne départage ce cas.
- Montée de version du kit en F2.
