# Plan d'implémentation de la recette critique de qualité

**Statut : à relire avant exécution.** Les décisions viennent de
[DECISIONS.md](./DECISIONS.md), qui fait foi. Les points que ce plan propose
lui-même sont dans la section 4 ; le mainteneur les valide avant la vague
qui les emploie.

## 1. Objet et lecteur

Ce plan est donné à un orchestrateur (Claude Opus) qui ne code pas : il
distribue chaque tâche à un sous-agent, relit le résultat, fait lancer les
vérifications et commite. Chaque tâche dit l'agent qui la fait, les fichiers,
les valeurs exactes, les tests et le critère de fin. Un agent ne lit que le
bloc de sa tâche et les sections que ce bloc nomme ; il ne lit ni ce plan en
entier, ni les dossiers de recherche.

Les chemins sont relatifs à la racine du dépôt. `D/` désigne
`docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/`,
`PAL/` `packages/plugin-palettes/`, `SOC/` `packages/plugin-socle/`,
`SPEC-PAL` la spécification de Palettes,
`docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`.
Les numéros de ligne cités viennent d'une lecture du code : l'agent les
retrouve par la recherche du symbole, pas par le numéro.

## 2. Qui fait quoi, et l'économie de tokens

| Rôle | Agent | Modèle, effort | Ce qu'il reçoit |
|---|---|---|---|
| Orchestrateur | conversation principale | Opus | Ce plan. Il distribue, relit les diffs, tranche, commite |
| Remplacement listé, numéro de version, renvoi | `executant` | Haiku, bas | Le bloc de la tâche ; rien d'autre |
| Tâche dans un seul domaine, critères vérifiables | `implementeur` | Sonnet, moyen | Le bloc, les sections nommées d'AGENTS.md et de la SPEC |
| Tâche qui touche plusieurs lecteurs d'une même règle, ou un écran au pixel | `implementeur-exigeant` | Sonnet, haut | Idem |
| Une donnée externe à sourcer | `chercheur` | Sonnet | La question, une seule |
| Tests, typecheck, build, `test:ui`, scripts de mesure | `verificateur` | Haiku, bas | La liste des commandes ; il rend un tableau |

Règles d'économie, à tenir par l'orchestrateur :

1. **Le bloc suffit.** Le message à l'agent recopie le bloc de la tâche, la
   section 5 (règles communes) et rien d'autre. Ne pas joindre ce plan, ni
   DECISIONS.md en entier : le bloc cite la section utile.
2. **Le plus petit agent qui suffit.** Une tâche dont toutes les valeurs sont
   écrites ici et qui ne demande aucun choix va à `executant`. Une tâche
   marquée `implementeur-exigeant` n'est pas rétrogradée.
3. **Deux agents au plus en même temps**, et seulement sur des fichiers
   disjoints : la colonne « En parallèle avec » de chaque vague le dit. Sans
   mention, la tâche est seule.
4. **Vérifier au plus près.** Après chaque tâche, le `verificateur` lance les
   commandes de la ligne « Vérifier » du bloc, pas la suite complète. La
   suite complète tourne en fin de vague.
5. **Relire le diff, pas les fichiers.** L'orchestrateur lit `git diff --stat`
   puis le diff des fichiers nommés par le bloc. Un fichier modifié hors de la
   liste du bloc est refusé, sauf raison écrite par l'agent.
6. **Corriger soi-même ce qui est petit.** Une erreur de moins de dix lignes
   se corrige dans la conversation principale ; on ne relance pas un agent
   pour elle.
7. **Une question rend la main.** Un agent qui rencontre un choix non écrit
   s'arrête et rend la question ; l'orchestrateur tranche d'après
   DECISIONS.md, ou demande au mainteneur si DECISIONS.md ne répond pas.

## 3. Ordre des vagues

| Vague | Contenu | Dépend de |
|---|---|---|
| 0 | Préparation | — |
| 1 | Le kit : `ring`, table par thème, G7 contre la page et la carte | 0 |
| 2 | Le moteur : courbe Dark, format 11, règle de chroma, dérive, alerte C6 | 1 |
| 3 | Palettes hors Harmonisation : Vérification, libellés, listes, Configuration, Réglage global, Color shift | 2 |
| 4 | L'onglet Harmonisation | 3 |
| 5 | Documents : AGENTS.md, SPEC-PAL, architecture de référence | 4 |
| 6 | Vérification complète, publication du kit, recette Figma | 5 |

Rien n'est donné au mainteneur pour un essai dans Figma avant la fin de la
vague 2 : le format 11 se fixe en deux tâches (M2 et M4), et une recette
rangée entre les deux aurait une forme provisoire.

## 4. Ce que le plan propose (à valider par le mainteneur)

DECISIONS.md, section 6, laisse quatre points au plan. Les voici, avec ce
qu'ils changent. Chacun porte un identifiant de la SPEC-PAL réservé en
section 7.

**P1. Le schéma du format 11 pour la règle de chroma.** La part commune de
chaque profil reste `profils.<profil>.part` ; elle vaut `p₀`. Chaque profil
reçoit un champ facultatif `enveloppe`, avec les bornes de chaque thème :

```ts
export interface BornesDeChroma { readonly a: number; readonly b: number; readonly jaunes: number }
export interface ProfilDeRecette {
  readonly part: number;
  readonly enveloppe?: { readonly light: BornesDeChroma; readonly dark: BornesDeChroma };
}
// Recette.profils: { soft: ProfilDeRecette; vivid: ProfilDeRecette }
```

`jaunes` est `k`. En Dark il vaut 0, ce qui donne `marge(H) = 1` sans cas
particulier dans le code. Valeurs par défaut :

| Profil | `part` | `enveloppe.light` | `enveloppe.dark` |
|---|---|---|---|
| `soft` | 0,85 | a 0,6 · b 0,38 · jaunes 1 | a 1,1 · b 0,38 · jaunes 0 |
| `vivid` (sert aussi l'intensité unique) | 0,95 | a 1,1 · b 0,48 · jaunes 0,5 | a 1,1 · b 0,30 · jaunes 0 |

Sans `enveloppe`, la chroma reste `part × plafond` : c'est la part constante
d'aujourd'hui. La migration du format 10 n'ajoute pas d'enveloppe et garde les
parts (Soft 0,45, Vivid 0,95) : les couleurs ne bougent pas (Q3). « Par
défaut », sur la carte des intensités de la Configuration, pose les parts et
les enveloppes du tableau. Les bornes ne paraissent nulle part dans
l'interface.

*Pourquoi ce schéma* : `p₀` lié à la part commune garde un seul réglage
d'intensité pour le designer ; l'absence d'enveloppe décrit exactement une
recette ancienne ; les bornes dans la recette permettent un recalage sans
nouveau format.

**P2. Le relevé `derives` au format 11.** Chaque rampe de Tailwind porte la
clarté et la teinte de chacun de ses crans :

```ts
export interface RampeDeDerive { readonly nom: string; readonly crans: readonly (readonly [L: number, H: number])[] }
// Recette.derives: readonly RampeDeDerive[]
```

La migration du format 10 remplace le relevé par celui du paquet : l'ancien
triplet ne contient pas les crans, et le relevé n'est pas un choix du
designer. Les dérives déjà rangées dans chaque palette ne changent pas ; seul
le préréglage, quand le designer le choisit à nouveau, donne la nouvelle
valeur.

**P3. La couleur de la carte pour G7 : déduite, sans réglage.** Light : blanc
`#FFFFFF`. Dark : le gris sans teinte à la clarté du cran 100 de la courbe
Dark de la recette, soit environ `#1C1C1C` avec la courbe par défaut. Aucun
champ de recette, aucun réglage « Fond de la carte » : un réglage de plus
n'aide pas un designer débutant, et la mesure donne le même résultat avec la
carte du Titanium et avec ce gris (144 échecs, tous G1).

**P4. Les crans requis d'une recette ancienne.** La table Dark exige 400, 500
et 950. Une recette au format 10 dont la liste en manque un ne doit pas
devenir illisible : la migration ajoute ces numéros à la liste et donne à
chaque courbe la clarté que `luminositeAuNumero` lit sur l'ancienne grille.
Palettes crée les variables manquantes à la prochaine écriture, comme pour
toute nuance ajoutée. Les préréglages 11 et 13 les ont déjà.

**P5. Le bouton « Configuration » dans l'explorateur.** C9 le prévoit dans les
trois plugins, mais l'explorateur n'a pas de configuration : le plan le pose
dans Exporter et Palettes seulement, et le socle le rend disponible pour un
futur écran de l'explorateur.

## 5. Règles communes, à recopier dans chaque message d'agent

- Branche `main`, pas de branche. L'agent ne commite pas, ne pousse pas.
- Avant d'écrire un commentaire ou un document : lire
  `.agents/skills/rediger-sans-tics-ia/SKILL.md`. Avant un texte destiné au
  designer : lire aussi `.agents/skills/rediger-diagnostics-ucm/SKILL.md`.
- Lire dans [AGENTS.md](../../../../../AGENTS.md) la carte du code des
  paquets touchés et le groupe d'invariants que le bloc nomme, pas le
  document entier ; reprendre le nommage et les habitudes du code voisin.
- Fins de ligne LF. Un fichier réécrit en CRLF est refusé ; vérifier par
  `git diff --stat` qu'aucun fichier n'apparaît modifié en entier.
- Le moteur reste pur : pas de `Date`, `Math.random`, `Intl` dans
  `packages/couleur/src` ni `packages/kit/src/emplois`
  (`couleur/tests/loiDePurete.test.ts`).
- Un identifiant de SPEC-PAL réservé par le bloc s'écrit dans SPEC-PAL, à la
  section que le bloc nomme, et dans le nom du test qui le vérifie
  (`test('[VER-22] …')`). Ne pas en créer d'autre.
- Un texte d'interface s'ajoute dans `PAL/src/i18n/fr.ts` et `en.ts`, même
  clé, même forme (`tests/i18n.test.ts`). Un libellé qu'un état de galerie
  clique et qui change se reporte dans la liste `chemins` de
  `PAL/galerie/build-galerie.cjs`.
- Une classe CSS nouvelle a sa règle, et une règle sa classe
  (`tests/stylesUi.test.ts`).
- `tests/inventaireInvariants.test.ts` (racine) compare AGENTS.md au code.
  S'il échoue parce qu'AGENTS.md nomme un symbole que la tâche renomme ou
  retire, corriger cette mention dans AGENTS.md, et rien d'autre : la
  réécriture d'AGENTS.md vient en vague 5.
- Ne jamais toucher `docs/notes/Recherches/README.md` ni
  `docs/notes/Recherches/Architecture globale UCM/` : ils appartiennent à une
  autre session.
- Rendre : la liste des fichiers modifiés, ce qui a été fait, les commandes
  lancées et leur résultat, les questions restées ouvertes.

### Commandes

| But | Commande |
|---|---|
| Construire le kit, avant tout test qui l'importe | `npm run build --workspace @ucm-kit/core` |
| Tests d'un paquet | `npm test --workspace <nom>` : `@ucm-kit/core`, `ucm-couleur`, `ucm-palettes-plugin`, `ucm-explorateur-plugin`, `ucm-exporter-plugin`, `ucm-plugin-socle` |
| Types de tout le dépôt | `npm run typecheck` |
| Interface de Palettes (Chromium) | `npm run test:ui --workspace ucm-palettes-plugin` |
| Interface d'Exporter et de l'explorateur | `npm run test:ui --workspace ucm-exporter-plugin`, `npm run test:ui --workspace ucm-explorateur-plugin` |
| Suite complète | `npm test`, `npm run typecheck`, `npm run build` |

`test:ui` ne reconstruit que `ui.html`. Avant tout essai dans Figma,
`npm run build --workspace ucm-palettes-plugin`.

### Commit, par l'orchestrateur

Un commit par tâche, par chemins explicites :
`git commit -m "<message>" -- <chemins>`, message en français au format des
commits voisins (`feat(couleur): …`, `fix(palettes): …`), terminé par la ligne
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Avant de commiter :
`git diff --stat -- <chemins>` ne montre aucun fichier réécrit en entier. Le
push se fait en fin de vague, après la suite complète et, si la vague touche
Palettes, après `test:ui`.

## 6. Les vagues

### Vague 0 · Préparation

- [ ] **V0.1 · État de départ** · orchestrateur.
  - `git status` : seuls `docs/notes/Recherches/README.md` et
    `docs/notes/Recherches/Architecture globale UCM/` peuvent être modifiés,
    et ne se commitent pas.
  - Le `verificateur` lance la suite complète et `test:ui` de Palettes ; tout
    est vert. Sinon, s'arrêter et le signaler au mainteneur.
  - Fini quand : la suite est verte au commit de départ, et son résultat est
    noté dans le premier message de la vague 1.

### Vague 1 · Le kit et la table des rôles

| Tâche | En parallèle avec |
|---|---|
| R1 | seule |
| R2 | seule (après R1) |
| R3 | seule |
| R4 | seule |

- [ ] **R1 · `page/focus` devient `ring`** · `implementeur`, moyen.
  - Décision : DECISIONS.md, section 3, Q8. La variable garde ses crans
    (600 en sens normal, 700 en sens inversé) ; elle est la 13e variable de
    la palette, à la racine, hors des dossiers `solid`, `surface` et `page`.
  - `packages/kit/src/emplois/dossiers.ts` : dans `VARIABLES_DE_PALETTE`,
    `'page/focus'` devient `'ring'`, à la même place (dernière) ; même
    remplacement dans les deux sens de `TABLE_DES_DOSSIERS`, dans
    `ETAT_DU_FOND.focus.anneau` et dans `SUPPORT_DES_VARIABLES` (valeur
    `ANNEAU` inchangée).
  - `packages/kit/src/emplois/garanties.ts` : G7, `premier: { variable: 'ring' }`.
    Ses fonds ne changent pas ici (R4).
  - Tous les littéraux `page/focus` des paquets : `couleur/src/garantie.ts`
    (`VARIABLES_GARANTIES`) ; `PAL/src/presentation.ts` (correspondance vers
    `anneauDeFocus`) ; `PAL/src/planche/modele.ts` (le `case`) ;
    `PAL/src/ui/interfaceDeTest.ts` ; `PAL/src/ui/garanties.ts` ;
    `PAL/src/i18n/fr.ts` et `en.ts` (clé `'page/focus'` des libellés, et le
    texte de la garantie des courbes qui choisit entre `page/foreground` et
    `page/focus`) ; `PAL/galerie/etats.cjs` ;
    `packages/plugin-explorateur/README.md`, `SPEC.md` ; les tests de
    `kit/tests/`, `couleur/tests/`, `PAL/tests/` (dont
    `tests/interface/interface.test.mjs`) et
    `plugin-explorateur/tests/integrationsUcm.test.ts`
    (`success/vivid/page/focus` devient `success/vivid/ring`).
  - La planche garde pour l'instant `ring` dans la colonne du dossier `page` :
    R2 la déplace.
  - Ne pas toucher : SPEC-PAL, `D/` (vague 5). Dans `AGENTS.md`, seulement
    les mentions de `page/focus` (règle commune sur l'inventaire).
  - Vérifier : `npm run build --workspace @ucm-kit/core`, `npm run typecheck`,
    `npm test`. Puis
    `git grep -n "page/focus" -- packages` ne rend rien.
  - Fini quand : les trois commandes passent et la recherche est vide.

- [ ] **R2 · La planche dessine `ring` au niveau de la palette** · `implementeur`, moyen.
  - Identifiant réservé : `[PLA-30]`, dans la section de SPEC-PAL qui décrit
    la planche des variables.
  - `PAL/src/planche/modele.ts` : retirer `ring` de `VARIABLES_DU_DOSSIER.page` ;
    la planche montre une rangée `ring` au niveau de la palette, après les
    trois dossiers, avec la largeur d'anneau d'aujourd'hui (`LARGEUR_PAGE.anneau`).
    Lire le rendu de la planche pour placer la rangée comme les autres
    rangées de variables (même composant, même échantillon d'anneau).
  - Tests : `PAL/tests/modeleDePlanche.test.ts` ; ajouter
    `[PLA-30] ring est une rangée de la palette, hors du dossier page`.
  - Vérifier : `npm test --workspace ucm-palettes-plugin`,
    `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert, et l'état de galerie de la planche montre `ring` sous
    les dossiers.

- [ ] **R3 · Une table par thème et par sens** · `implementeur-exigeant`, haut.
  - Décision : DECISIONS.md, section 3, tableau Q5 et Q6.
  - `packages/kit/src/emplois/dossiers.ts` :
    - `TABLE_DES_DOSSIERS` devient
      `Record<'light' | 'dark', Record<SensDuTheme, Record<VariableDePalette, number | 'texteDesBoutons'>>>`.
      Light normal et Light inversé : les valeurs d'aujourd'hui. Dark normal :
      celles du Light normal, sauf `surface/default` 300, `surface/hover` 400,
      `surface/pressed` 500, `surface/foreground` 950, `surface/border` 950.
      Dark inversé : celles du Light inversé, avec les mêmes cinq
      changements. Écrire les quatre tables en entier, sans calcul.
    - Nouvelles signatures, le thème avant le sens :
      `cranDeLaVariable(variable, mode, sens)`, `cransRequis(mode, sens)`,
      `variablePresente(variable, crans, mode, sens)`,
      `variablesDuCran(crans, rang, mode, sens, neutre)`. Exporter le type
      `ModeDuTheme = 'light' | 'dark'` s'il n'existe pas.
    - `CRANS_GLOBAUX` (disabled 200, 500, 500) ne dépend pas du thème.
  - `packages/kit/src/emplois/garanties.ts` : `garantieJugeable(garantie, crans, mode, sens)`.
  - Lecteurs : `npm run typecheck` les liste tous. Chaque appelant passe le
    thème qu'il connaît déjà (la plupart appellent `sensDuTheme(mode, …)`
    juste avant). Les appelants qui parcourent les deux sens
    (`PAL/src/presentation.ts`, motif `SENS.some`) parcourent les quatre
    couples thème et sens. Les scripts `.mjs` ne sont pas typés : chercher
    `cranDeLaVariable|cransRequis|variablePresente|variablesDuCran|TABLE_DES_DOSSIERS`
    dans `packages/couleur/scripts/` et les mettre à jour.
  - `packages/couleur/src/recette.ts`, `validerRecette` : les crans requis
    sont la réunion de `cransRequis(mode, sens)` pour les deux thèmes, chacun
    dans son sens. Mettre à jour le commentaire qui dit « 50, 400 et 950 sont
    facultatifs » : seul 50 l'est.
  - `packages/couleur/src/alertes.ts`, `rangsDesVariables` : passe le thème.
  - Tests : `kit/tests/dossiers.test.ts` (tableau `ATTENDUS` par thème et
    sens ; `cransRequis('dark', 'normal')` vaut
    `[100, 200, 300, 400, 500, 600, 700, 800, 900, 950]`),
    `kit/tests/garanties.test.ts`, `couleur/tests/recette.test.ts`,
    `couleur/tests/nuances.test.ts`, `PAL/tests/presentation.test.ts`, et ce
    que la suite signale. Une recette de test sans 400, 500 ou 950 est
    désormais refusée : lui ajouter ces crans, sauf si le test porte sur ce
    refus.
  - Ne pas faire ici : la migration des recettes anciennes (M2).
  - Vérifier : `npm run build --workspace @ucm-kit/core`, `npm run typecheck`,
    `npm test`, `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert ; l'aperçu de Palettes en Dark peint les fonds teintés
    aux crans 300, 400, 500 et leur texte au 950 (état de galerie d'un aperçu
    Dark, vérifié par une capture que l'agent décrit).

- [ ] **R4 · G7 jugée contre la page et la carte** · `implementeur-exigeant`, haut.
  - Décision : DECISIONS.md, section 4, G7 ; proposition P3. Identifiants
    réservés : `[MOT-37]` (la carte déduite, section des promesses du moteur
    de SPEC-PAL) et `[VER-21]` (G7 contre la page et la carte, section des
    promesses de Vérification).
  - Kit, `garanties.ts` : `FondDeGarantie` reçoit un troisième membre,
    `{ readonly fondDeLaCarte: true }` ; constante `FOND_DE_LA_CARTE` à côté
    de `FOND_DE_LA_PAGE`. G7 :
    `fonds: [FOND_DE_LA_PAGE, FOND_DE_LA_CARTE]`.
  - Moteur, `couleur/src/promesses.ts` : fonction exportée
    `couleurDeLaCarte(recette, mode): Rgb8`. Light : `[255, 255, 255]`.
    Dark : `fabriquerCran(luminositeAuNumero(recette, 'dark', 100), 0, 0, recette.gamut).couleur`
    (part 0 : un gris sans teinte). `contexteDe` ajoute `cartes` à côté de
    `fonds` ; `promessesDe` traite la branche `'fondDeLaCarte' in fond` comme
    celle de la page.
  - Lecteurs de `'fondDeLaPage' in fond`, à étendre au nouveau membre :
    `PAL/src/presentation.ts` (la variable du fond vaut `'elevation/raised'`
    pour la carte), `PAL/src/ui/modeleDesGaranties.ts` (`colonneDuFond` :
    une colonne « Carte » après « Page »), `PAL/src/planche/modele.ts`,
    `PAL/src/i18n/fr.ts` et `en.ts` (`variableDuFond` ; libellé
    `'elevation/raised'` : « fond de la carte », « card background » ; le type
    `VariableLibellee` le reçoit), `packages/couleur/scripts/mesurer-ancrage.mjs`.
  - Tests : `couleur/tests/promesses.test.ts`
    (`[MOT-37] la carte vaut le blanc en Light et un gris du cran 100 en Dark` :
    R = G = B, entre `#1A1A1A` et `#1E1E1E` avec la recette par défaut),
    `kit/tests/garanties.test.ts` (G7 a deux fonds, la page et la carte),
    `PAL/tests/modeleDesGaranties.test.ts`
    (`[VER-21] G7 se lit contre la page et la carte`), `presentation`,
    `textes`.
  - Vérifier : comme R3.
  - Fini quand : vert ; l'onglet Vérification de la galerie montre G7 contre
    « fond de la page » et « fond de la carte », et non plus contre le fond
    teinté.

- [ ] **R5 · Fin de vague** · `verificateur`, puis orchestrateur.
  - Suite complète et `test:ui` des trois plugins. Commit de chaque tâche,
    puis push.

### Vague 2 · Le moteur

| Tâche | En parallèle avec |
|---|---|
| M1 | R2 si la vague 1 n'est pas finie (fichiers disjoints) |
| M2 | seule |
| M3 | seule |
| M4 | seule |
| M5 | seule |

- [ ] **M1 · La courbe Dark et le fond de page Dark** · `implementeur`, moyen.
  - Décision : DECISIONS.md, section 2, « La courbe Dark ».
  - `packages/couleur/src/nuances.ts` : le premier nombre de
    `ONZE.courbes.dark` passe de `0.18` à `0.145`. Le préréglage 13 réutilise
    cette courbe : ne rien changer d'autre.
  - `packages/couleur/src/recette.ts`, `recetteParDefaut` :
    `fonds.dark: '#0A0A0A'`. `fonds.light` reste `'#F7F7F7'`.
  - Ne change pas : `alertesDesFonds`, `TOLERANCE_FOND`, les courbes et
    fonds d'une recette existante (aucune migration ne les touche).
  - `packages/couleur/src/palette.ts`, `borneDesFonds` : lit le cran 50 de la
    courbe ; une recette neuve y trouve 0,145. Le comportement suit, sans
    changement de code.
  - Tests : `couleur/tests/fondsSombres.test.ts` (la borne d'une recette
    neuve vaut `clarteBasse: 0.145` ; garder un cas d'une recette à 0,18),
    `couleur/tests/nuances.test.ts`, `couleur/tests/recette.test.ts`, et ce
    que la suite signale dans `PAL/tests/` (Configuration : le défaut du fond
    Dark).
  - Vérifier : `npm test --workspace ucm-couleur`,
    `npm test --workspace ucm-palettes-plugin`.
  - Fini quand : vert ; `#0A0A0A` ne déclenche pas `alertesDesFonds` contre la
    courbe par défaut (test).

- [ ] **M2 · Le format 11 : enveloppe, crans requis, migration** · `implementeur-exigeant`, haut.
  - Décisions : Q3 ; propositions P1 et P4. Identifiants réservés :
    `[REC-12]` (le format 11 et la migration du format 10) et `[REC-13]`
    (les crans requis ajoutés par la migration), section de la recette de
    SPEC-PAL.
  - `packages/couleur/src/recette.ts` :
    - `FORMAT_RECETTE = 11`.
    - Les types `BornesDeChroma` et `ProfilDeRecette` de P1 ;
      `Recette.profils` devient `{ soft: ProfilDeRecette; vivid: ProfilDeRecette }`.
    - Constante exportée `ENVELOPPES_PAR_DEFAUT` aux valeurs de P1 ;
      `recetteParDefaut` : `profils.soft = { part: 0.85, enveloppe: ENVELOPPES_PAR_DEFAUT.soft }`,
      `profils.vivid = { part: 0.95, enveloppe: ENVELOPPES_PAR_DEFAUT.vivid }`.
    - `validerRecette` : `profils.soft` et `profils.vivid` acceptent les clés
      `part` et `enveloppe` (facultative). Si `enveloppe` est présente, elle a
      exactement `light` et `dark`, chacun exactement `a`, `b`, `jaunes` ;
      `a` et `b` dans `]0 ; 2]`, `jaunes` dans `[0 ; 2]`. Sinon refus de la
      nouvelle règle `'enveloppe'` sur le chemin fautif
      (`profils.soft.enveloppe.light.a`). Ajouter `'enveloppe'` à
      `RegleRecette` et son message dans `PAL/src/i18n/fr.ts` et `en.ts`, sur
      le modèle des messages de refus voisins.
    - `classerRecette` : réécrire la chaîne en étapes successives, une
      fonction par format (`depuisLeFormat8`, `depuisLeFormat9`,
      `depuisLeFormat10`), chacune rendant le format suivant ; une recette 8
      passe par 9 et 10 avant 11. L'étape 10 vers 11 :
      1. pose `formatVersion: 11` ;
      2. garde `profils` tels quels, sans enveloppe ;
      3. ajoute à `crans` ceux de 400, 500 et 950 qui manquent, triés, et
         insère dans `courbes.light` et `courbes.dark` la valeur
         `luminositeAuNumero(ancienneGrille, mode, numero)` au même rang ;
      4. laisse `fonds`, `courbes` existantes, `derives` et `palettes`
         (M4 complète cette étape pour `derives`).
    - Une lecture n'écrit rien : la recette reste rangée au format 10 dans
      Figma jusqu'à la prochaine écriture, comme aujourd'hui.
  - `PAL/src/configuration.ts` : la carte des intensités (`parts` dans
    `CARTES_DES_REGLAGES`) compare aussi `enveloppe` à la recette par défaut
    dans `estParDefaut`, et « Par défaut » (`poserValeur`) pose `part` et
    `enveloppe` des deux profils. Une recette migrée n'est donc pas « par
    défaut » : son bouton est actif.
  - Tests, `couleur/tests/recette.test.ts` :
    `[REC-12] une recette 10 se lit en 11 sans enveloppe, parts gardées`,
    `[REC-12] une recette 8 passe par 9 et 10`,
    `[REC-12] une enveloppe hors bornes est refusée`,
    `[REC-13] la migration ajoute 400, 500 et 950 à une liste qui en manque`,
    et le test qui fige « le format suivant » passe de 11 à 12.
    `PAL/tests/configuration.test.ts` : « Par défaut » des intensités pose
    l'enveloppe. Mettre à jour les tests qui figent `soft 0.45`
    (`couleur/tests/base.test.ts` et voisins) en recette par défaut : 0,85.
    Une recette de test qui doit garder la part constante n'a pas
    d'enveloppe.
  - Ne pas faire ici : la règle de chroma elle-même (M3) ; avec ce lot seul,
    l'enveloppe est rangée mais pas encore lue.
  - Vérifier : `npm test --workspace ucm-couleur`,
    `npm test --workspace ucm-palettes-plugin`,
    `npm test --workspace ucm-explorateur-plugin`, `npm run typecheck`.
  - Fini quand : vert.

- [ ] **M3 · La règle de chroma** · `implementeur-exigeant`, haut.
  - Décision : DECISIONS.md, section 2, Q1 et Q2 ; proposition P1.
    Identifiant réservé : `[MOT-35]`, section de la fabrication des rampes de
    SPEC-PAL. Code de référence : `D/Mesures/prototype.ts`,
    `enveloppeAvecJaunes` et `rampesDuBanc` ; `D/Mesures/variantes.ts`,
    `REGLE_FINALE`.
  - `packages/couleur/src/rampe.ts` :
    - Type exporté
      `Enveloppe = { readonly p0: number; readonly a: number; readonly b: number; readonly jaunes: number }`.
    - `cranVise(L, H, part, gamut, enveloppe?)` :
      ```ts
      const C = part * plafond(L, H, gamut);
      if (!enveloppe) return { L, C, H };
      const ecart = Math.abs(ecartAngulaire(H, 100)); // en degrés, de 0 à 180
      const marge = 1 + enveloppe.jaunes * Math.exp(-0.5 * (ecart / 12) ** 2);
      return { L, H, C: Math.min(C, enveloppe.p0 * Math.min(enveloppe.a * marge * (1 - L), enveloppe.b * L)) };
      ```
      `ecartAngulaire` vit dans `tailwind.ts`, qui importe `rampe.ts` : le
      déplacer dans `conversions.ts` (ou y écrire une fonction locale) pour
      éviter l'import circulaire, et le réexporter de `tailwind.ts`.
    - `cranFlottant`, `fabriquerCran` reçoivent le même dernier paramètre
      facultatif et le transmettent.
    - `ParametresRampe` reçoit `enveloppes?: { light: Enveloppe; dark: Enveloppe }` ;
      `fabriquerRampe` passe `enveloppes?.[mode]`. La part transmise garde
      Color shift et `facteurSombre` ; `p0` ne les prend pas.
  - `packages/couleur/src/palette.ts` : fonction exportée
    `enveloppeDe(recette, intensite, mode): Enveloppe | undefined`. Le profil
    vaut `soft` pour l'intensité Soft, `vivid` pour Vivid et pour l'intensité
    unique ; sans `enveloppe` dans ce profil, `undefined` ; sinon
    `{ p0: recette.profils[profil].part, ...enveloppe[mode] }`.
    `parametresDesRampes` la passe pour les deux thèmes.
    `partDeLaReference` ne change pas (le prototype garde `partsDe`).
  - Autres fabricants de crans, à mettre sur la même règle :
    `reconstruction.ts` (la copie flottante de `fabriquerRampe` et les appels
    de `fabriquerCran`), `garantie.ts` (`garantieDesCourbes` : l'enveloppe du
    profil et du thème jugés), `PAL/src/ui/derive/editeur.ts` et
    `PAL/src/ui/reglagesDeLaPalette.ts` (les pistes peintes : l'enveloppe du
    profil réglé, dans le thème que la piste peint). `reglages.ts`,
    `ajustement.ts` et `contraste.ts` calculent la part de la référence : ne
    pas les changer ; si un test montre un écart, rendre la question.
  - `packages/couleur/tests/proprietes.test.ts` et `architecture.test.ts`
    copient la formule : leur copie prend l'enveloppe en paramètre.
  - Tests nouveaux, `couleur/tests/enveloppe.test.ts` :
    - `[MOT-35] sans enveloppe, la chroma reste part × plafond` (tirages,
      comme `proprietes.test.ts`) ;
    - `[MOT-35] la borne vers le blanc et la borne vers le noir` : quatre
      valeurs calculées à la main dans le test (Soft Light, L 0,97, H 250 ;
      même cran à H 100, marge 2 ; Vivid Dark, L 0,20, H 30 ; un cran où
      `part × plafond` est le plus petit) ;
    - `[MOT-35] la marge des jaunes ne joue pas en Dark` ;
    - `[MOT-35] les rampes de la recette par défaut suivent le prototype` :
      trois références (`#3B82F6`, `#EAB308`, `#16A34A`), deux intensités,
      deux thèmes ; les hexadécimaux attendus sont écrits dans le test. Pour
      les obtenir, l'agent écrit un script jetable dans son répertoire
      temporaire qui appelle `rampesDuBanc(recette, palette, REGLE_FINALE)`
      sur la recette par défaut du paquet, et colle la sortie. Le script ne
      se commite pas.
  - Mesure de contrôle, par le `verificateur` après le lot : un script
    `D/Mesures/comparer-implementation.ts` (écrit par l'agent, commité dans
    `D/Mesures/`) compare, sur le balayage de 72 teintes de
    `garanties-regles.ts`, `rampesDe` du paquet et `rampesDuBanc` avec
    `REGLE_FINALE`, recette par défaut du paquet. Attendu : aucun canal ne
    diffère de plus d'une unité.
  - Vérifier : `npm run typecheck`, `npm test --workspace ucm-couleur`,
    `npm test --workspace ucm-palettes-plugin`,
    `npx tsx "D/Mesures/comparer-implementation.ts"` (chemin entre
    guillemets).
  - Fini quand : vert et la comparaison est sans écart.

- [ ] **M4 · La dérive de teinte aux deux bouts** · `implementeur`, moyen.
  - Décision : DECISIONS.md, section 2, Q10 ; proposition P2. Identifiant
    réservé : `[MOT-36]`, section du préréglage Tailwind de SPEC-PAL, qui
    remplace les règles de `[MOT-19]` sur la dérive totale (garder
    `[MOT-19]`, réécrire son texte, ne pas supprimer l'identifiant).
  - `packages/couleur/src/tailwind.ts` :
    - Le type `RampeDeDerive` de P2 remplace `PaireDeDerive`.
    - `RELEVE_TAILWIND` : les 17 rampes colorées de Tailwind 3.4.17 (sans
      `slate`, `gray`, `zinc`, `neutral`, `stone`), chacune avec ses onze
      crans `[L, H]` du 50 au 950, L à 4 décimales, H à 2 décimales. Source :
      `D/Mesures/references/tailwind-3.4.17.json`, converti par
      `rgb8VersOklch(lireHexa(hexa))` du paquet. L'agent génère le tableau
      par un script jetable et le colle ; un commentaire nomme la source et
      la version.
    - `prereglageTailwind(reference, bouts, releve)` garde sa signature et
      son résultat `{ clair, sombre }` arrondi au centième, et son cas sans
      teinte (`reference.C < CHROMA_SANS_TEINTE`). Son calcul devient celui de
      `deriveAuxBouts` du prototype : teinte de chaque rampe lue à la clarté
      de la référence (teintes dépliées, interpolation entre crans, bornée
      aux extrémités), choix des deux rampes voisines sur le cercle, dérive
      lue à `bouts.clair` et à `bouts.sombre`, interpolée selon la teinte.
    - `deriveTailwind` disparaît, avec ses tests.
  - `packages/couleur/src/recette.ts` : `Recette.derives` prend
    `readonly RampeDeDerive[]` ; `recetteParDefaut` le copie de
    `RELEVE_TAILWIND`. `validerDerives` : refus `derives-nombre` (moins de
    deux rampes), `derives-noms` (nom vide ou en double), et nouveau refus
    `derives-crans` (une rampe de moins de deux crans, un L hors de `]0 ; 1[`,
    un H hors de `[0 ; 360[`, des L non strictement décroissants).
    `derives-teintes` et `derives-teintes-claires` disparaissent de
    `RegleRecette` et des messages `i18n`. L'étape `depuisLeFormat10` de M2
    remplace `derives` par `RELEVE_TAILWIND`.
  - Lecteurs : `reconstruction.ts` (passe `recette.derives`),
    `PAL/src/edition.ts`, `packages/couleur/scripts/mesurer-*.mjs`.
  - Tests : `couleur/tests/tailwind.test.ts` (réécrit :
    `[MOT-36] la dérive se lit aux deux bouts des rampes voisines`, avec les
    références de cran 500 de cinq rampes, dont `amber` et `yellow`, et les
    valeurs attendues obtenues par `deriveAuxBouts` du prototype, script
    jetable) ; `couleur/tests/vecteurs.test.ts` (valeurs figées à
    recalculer de la même façon) ; `couleur/tests/recette.test.ts`
    (`[REC-12] la migration remplace le relevé`, refus `derives-crans`) ;
    `PAL/tests/edition.test.ts`.
  - Vérifier : `npm run typecheck`, `npm test --workspace ucm-couleur`,
    `npm test --workspace ucm-palettes-plugin`.
  - Fini quand : vert ; un test vérifie que le pire écart de teinte à
    Tailwind, sur les 17 rampes relues avec leur propre cran 500 comme
    référence, ne dépasse pas 12,5°.

- [ ] **M5 · L'alerte des palettes trop proches (C6)** · `implementeur-exigeant`, haut.
  - Décision : DECISIONS.md, section 5, C6 ; SPEC-ECRANS-HARMONISATION.md,
    section 7.3 et section 10, « Paires ». Identifiant réservé : `[VER-22]`,
    section des alertes de Vérification de SPEC-PAL ; il remplace la règle de
    `[VER-11]` sur les crans 500 à 700 (réécrire le texte de `[VER-11]`, ne
    pas supprimer l'identifiant).
  - `packages/couleur/src/alertes.ts` :
    - `CRANS_PALETTES_PROCHES` et `distanceDePalettes` disparaissent.
    - Constante `CHROMA_DES_PALETTES_COLOREES = 0.05` : une palette est
      colorée quand la chroma OKLCH de sa référence la dépasse. Seules deux
      palettes colorées se comparent.
    - `proximiteDePalettes(recette, a, b)` rend
      `{ distance, role: 'plein' | 'texte', mode, presqueIdentiques } | null`.
      L'intensité lue est Vivid, ou l'unique intensité d'une palette qui n'en
      a qu'une. Distances (`distanceOk` sur les couleurs à 8 bits) : le cran
      de `solid/default` en Light, le même en Dark, le cran de
      `surface/foreground` en Light. Les crans viennent de
      `cranDeLaVariable(variable, mode, sensDuTheme(mode, recette.texteDesBoutons[mode]))`,
      lus dans la grille de chaque palette. `null` si une palette manque d'un
      de ces crans. Le résultat garde la plus petite distance, son rôle et
      son thème ; `presqueIdentiques` vaut vrai sous 0,01.
    - `alertesDeRecette` : l'alerte `palettes-proches` porte la proximité au
      lieu de la distance ; seuil inchangé, `recette.seuils.palettesProches`.
    - Fonction exportée `pairesTropProches(recette)` : toutes les paires en
      alerte, par distance croissante, pour l'onglet Harmonisation.
  - `PAL/src/analyse.ts` reconstruit aujourd'hui l'alerte seul : le faire
    lire `proximiteDePalettes`, pour une seule source.
  - Vérification, constat : `PAL/src/i18n/fr.ts`, `procheDe(nom)` rend
    `trop proche de <nom>`, ou `trop proche d'<nom>` quand le nom commence
    par une voyelle (accentuée ou non), un `y` ou un `h` ; plus de ΔEok. En
    anglais : `too close to <name>`. `PAL/src/ui/vueDuBilanDesPalettes.ts`
    (`texteDuConstat`) et `PAL/src/presentation.ts` suivent.
  - Tests : `couleur/tests/alertes.test.ts`
    (`[VER-22] le plein en Light et en Dark, le texte du fond en Light`,
    `[VER-22] le texte Dark n'entre pas`, `[VER-22] deux neutres ne se
    comparent pas`, `[VER-22] presque identiques sous 0,01`),
    `intensites.test.ts`, `nuances.test.ts`, `PAL/tests/analyse.test.ts`,
    `bilanDesPalettes.test.ts`, `paletteOuverte.test.ts`, `rapport.test.ts`,
    `presentation.test.ts`, `textes.test.ts` ;
    `tests/interface/interface.test.mjs` (les expressions qui attendent
    « ΔEok » attendent « trop proche de »).
  - Contrôle : sur `D/Mesures/references/recette-mainteneur.json`, aucune
    paire en alerte ; sur le jeu de la galerie (`PAL/galerie/etats.cjs`,
    recette de l'état `verification-bilan-a-verifier`), 12 paires (compte de
    DOSSIER-COMPARER.md). Un autre compte s'explique avant de finir.
  - Vérifier : `npm run typecheck`, `npm test --workspace ucm-couleur`,
    `npm test --workspace ucm-palettes-plugin`,
    `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert et comptes conformes.

- [ ] **M6 · Fin de vague** · `verificateur`, puis orchestrateur.
  - Suite complète, `test:ui` de Palettes, puis la mesure des garanties sur
    le moteur : script `D/Mesures/verifier-implementation.ts`, écrit par un
    `implementeur` (moyen) sur le modèle de `garanties-regles.ts`, qui juge
    `verifierPromesses` du paquet sur le balayage de 72 teintes, recette par
    défaut. Attendu : des échecs G1 seulement, de l'ordre des 144 mesurés ;
    tout échec G2 à G7 arrête la vague.
  - Commits, push.

### Vague 3 · Palettes hors Harmonisation

| Tâche | En parallèle avec |
|---|---|
| P1 | P2 |
| P2 | P1 |
| P3 | seule (socle partagé) |
| P4 | seule (socle partagé) |
| P5 | seule |
| P6 | seule |
| P7 | seule (après P6, même réglette) |

- [ ] **P1 · Le bilan de Vérification à 480 px** · `implementeur`, moyen.
  - SPEC-ECRANS-HARMONISATION.md, section 6, dernier point ;
    DOSSIER-COMPARER.md, section 12, « Le bilan à 480 px ».
  - `PAL/src/ui/styles.css` : `.bilan-des-palettes` reçoit
    `grid-template-columns: minmax(0, 1fr)`. `.nuancier-des-palettes` passe
    de `repeat(7, 60px)` à `repeat(7, minmax(0, 60px))`, et les cartes du
    nuancier (`.nuancier-carte`) prennent la largeur de leur colonne au lieu
    de 60 px fixes ; hauteur inchangée.
  - Test d'interface : à 480 px de large, sur l'état
    `verification-bilan-a-verifier`, le bord droit de chaque
    `.bilan-verifier` et du nuancier reste dans la fenêtre.
  - Vérifier : `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert ; « Vérifier » s'affiche entier à 480 px.

- [ ] **P2 · « Par défaut » remplace « Rétablir »** · `implementeur`, moyen.
  - C10 ; DOSSIER-COMPARER.md, section 12, « Deux sens de Rétablir » ;
    SPEC-ECRANS-HARMONISATION.md, sections 3.3 et 4.
  - `PAL/src/i18n/fr.ts` et `en.ts` :

    | Clé | Français | Anglais |
    |---|---|---|
    | `TEXTES_DES_REGLAGES.retablir` | Par défaut | Default |
    | `TEXTES_DES_REGLAGES.retablirLa(grandeur)` | `Remettre la ${grandeur} par défaut` (en minuscules) | `Reset ${grandeur} to default` |
    | `TEXTES_DE_LA_DERIVE.retablir` | Par défaut | Default |
    | `TEXTES_DE_LA_DERIVE.toutRetablir` | Tout par défaut | All to default |
    | `TEXTES_DE_CONFIGURATION.retablir` | Par défaut | Default |
    | `retablirLaCarte(titre)` | `Remettre par défaut : ${titre}` | `Reset to default: ${titre}` |

    `TEXTES.retablir` (la barre, après « Annuler les modifications ») ne
    change pas. `retablirAuBout` : garder le sens, remplacer « Rétablir » par
    « Remettre par défaut » s'il y paraît.
  - Mettre à jour `build-galerie.cjs` (`chemins`), les tests d'interface et
    de textes qui cherchent ces libellés.
  - Vérifier : `npm test --workspace ucm-palettes-plugin`,
    `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert ; `git grep -n "Tout rétablir" -- packages` ne rend
    rien.

- [ ] **P3 · Les listes déroulantes du socle** · `implementeur`, moyen.
  - C10 ; SPEC-ECRANS-HARMONISATION.md, section 5, et les quatre dernières
    règles CSS de la section 9 (`select`, `select.input`, `:hover`,
    `.champ-prereglage, .carte-choix select.input`). Identifiant réservé :
    `[UI-37]`, section de l'interface commune de SPEC-PAL.
  - `SOC/src/ui/socle.css` : `button, input, select { font: inherit; }` ;
    les règles `select.input` de la section 9. Le chevron prend la couleur
    `--texte-second` dans les deux thèmes : un masque CSS sur un fond
    `currentColor`, ou deux images selon le thème du socle. Ne pas coder
    `#b3b3b3` seul.
  - `PAL/src/ui/styles.css` : la règle des listes de 24 px, si elle ne vit
    pas mieux dans le socle (`.carte-choix` est une classe du socle ou de
    Palettes : la règle suit la classe).
  - Ne change pas : la liste de la langue (32 px, pleine largeur).
  - Tests : `PAL/tests/interface/interface.test.mjs`,
    `[UI-37] une liste prend la police de l'interface et 24 px parmi des boutons`
    (« Teinte Tailwind » de Color shift : hauteur 24 px, corps 11 px).
    Lancer aussi `test:ui` d'Exporter et de l'explorateur, qui chargent le
    socle.
  - Vérifier : `npm test --workspace ucm-plugin-socle` et les trois `test:ui`.
  - Fini quand : vert.

- [ ] **P4 · Le bouton « Configuration » nommé** · `implementeur`, moyen.
  - C9 ; SPEC-ECRANS-HARMONISATION.md, section 4, premier point, et la règle
    `.icon-button.avec-libelle` de la section 9 ; proposition P5.
    Identifiant réservé : `[ENT-21]`, section de l'en-tête de SPEC-PAL.
  - `SOC/src/ui/EnTete.ts`, `createSettingsButton` : reçoit un libellé
    visible facultatif ; présent, le bouton prend la classe `avec-libelle`,
    l'engrenage de 12 px puis le texte. `SOC/src/ui/socle.css` : les deux
    règles `.icon-button.avec-libelle`.
  - Palettes : `PAL/src/ui/socleLocalise.ts` lie aussi le texte visible ;
    `PAL/src/ui/index.ts` passe le libellé ; textes `Configuration` /
    `Settings`, `title` `Ouvrir la configuration` / `Open settings`.
  - Exporter : `packages/plugin-exporter/src/ui/components/Header.ts`, même
    libellé et `title` (textes de l'Exporter, en français seulement s'il n'a
    pas d'anglais).
  - Explorateur : rien (P5).
  - Tests : `test:ui` de Palettes (`[ENT-21] le bouton d'en-tête dit
    Configuration`) et d'Exporter (son test qui prend `.icon-button` par
    position doit le trouver encore).
  - Vérifier : `npm test --workspace ucm-plugin-socle`, `test:ui` de
    Palettes et d'Exporter.
  - Fini quand : vert.

- [ ] **P5 · La Configuration en deux onglets** · `implementeur`, moyen.
  - C9 ; SPEC-ECRANS-HARMONISATION.md, section 4, points 2 à 5. Modèle :
    `packages/plugin-exporter/src/ui/components/ConfigurationPage.ts`
    (`createOnglets`, `p.subtitle`, phrases par onglet). Identifiant
    réservé : `[ENT-20]`, section des réglages communs de SPEC-PAL ; mettre à
    jour le texte de `[ENT-12]` qui nomme « Réglages communs ».
  - `PAL/src/ui/index.ts` : le titre `TEXTES.titreConfiguration` devient
    `Configuration` (`Settings`) ; le panneau commence par
    `createOnglets('Configuration', [palettes, general])` de
    `socleLocalise.ts`, puis `p.subtitle` avec la phrase de l'onglet actif,
    puis les deux panneaux. Le champ Langue (`#langue-du-plugin`, sa
    préférence et son message d'erreur) passe dans le panneau `general` ;
    les cartes de `createConfiguration` dans le panneau `palettes`. Le
    panneau reste `inert` pendant un dessin, sauf la langue, comme
    aujourd'hui.
  - Textes : SPEC-ECRANS-HARMONISATION.md, section 8, lignes « Onglets de la
    Configuration », « Phrase Palettes », « Phrase Général ».
  - L'onglet actif se garde pendant la session ; chaque ouverture du panneau
    revient sur `Palettes`.
  - Galerie : l'état `configuration-de-la-recette` montre l'onglet Palettes ;
    ajouter `configuration-general`.
  - Tests d'interface : ceux qui cherchent « Réglages communs » ; nouveau
    `[ENT-20] la Configuration s'ouvre sur Palettes et range la langue dans Général`.
  - Vérifier : `npm test --workspace ucm-palettes-plugin`,
    `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert.

- [ ] **P6 · Réglage global : la marque par défaut** · `implementeur-exigeant`, haut.
  - C8 ; SPEC-ECRANS-HARMONISATION.md, sections 2, 3.1 et 3.2 en entier,
    règles CSS de la section 9 de `.reglette-defaut` à `.tete-des-reglages .btn`.
    Écran de référence : `D/Maquettes/MAQUETTE-COMPARER.html`, section 1,
    fonctions `reglagePropose`, `marquer`, `replier`, `voisine`, `eviter`.
    Identifiant réservé : `[UI-38]`, section de Création de SPEC-PAL.
  - Fichiers : `PAL/src/ui/derive/reglette.ts` (marque, libellé, bouts : des
    options de `createReglette`, pour que Color shift et Harmonisation les
    reprennent), `PAL/src/ui/reglagesDeLaPalette.ts` (« Tout par défaut »,
    valeurs par défaut, pastille, nom de l'autre profil dans
    `.fantome-du-profil`), `PAL/src/ui/ongletCreation.ts`
    (`resumeDesReglages`), `PAL/src/ui/styles.css`, `i18n` (section 8 : bouton,
    libellé, résumés, bouts, familles).
  - La classe `.pastille-reglee` existe déjà (`styles.css`) : la réemployer.
    `.bouton-discret:disabled` existe aussi.
  - Familles de teinte : constante dans un module sans DOM (par exemple
    `PAL/src/familles.ts`), testée seule :
    `[UI-38] 257° a pour voisines turquoise et violet`.
  - Galerie : l'état `reglages-reference-modifiee` montre la carte ouverte
    avec une réglette modifiée ; ajouter `reglages-par-defaut` (rien de
    modifié, « Tout par défaut » inactif).
  - Contrôle visuel : capture de l'état contre l'écran de la maquette
    (SPEC-ECRANS-HARMONISATION.md, section 12, ancre `#r-reglage`) ; écarts
    admis : section 11.
  - Vérifier : `npm test --workspace ucm-palettes-plugin`,
    `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert et capture conforme.

- [ ] **P7 · Color shift : la marque par défaut** · `implementeur`, moyen.
  - SPEC-ECRANS-HARMONISATION.md, section 3.3. Reprend les options de
    réglette de P6. Identifiant réservé : `[DER-25]`, section de Color shift
    de SPEC-PAL.
  - Fichiers : `PAL/src/ui/derive/editeur.ts`, `PAL/src/ui/ongletCreation.ts`
    (`resumeDeLaDerive`), `i18n`.
  - Galerie : l'état `color-shift-luminosite` montre les marques.
  - Vérifier : comme P6.
  - Fini quand : vert ; le résumé replié dit `Par défaut · synchronisé`
    quand rien n'est réglé.

- [ ] **P8 · Fin de vague** · `verificateur`, puis orchestrateur.
  - Suite complète, `test:ui` des trois plugins, commits, push.

### Vague 4 · L'onglet Harmonisation

Toutes les tâches suivent SPEC-ECRANS-HARMONISATION.md, section 7 ; l'écran
de référence est `D/Maquettes/MAQUETTE-COMPARER.html`, fonctions nommées en
tête de chaque sous-section. Les textes sont ceux de la section 8, les règles
CSS ceux de la section 9. Le module de l'onglet est
`PAL/src/ui/ongletHarmonisation.ts`, ses cartes dans
`PAL/src/ui/harmonisation/` (un fichier par carte), son état sans DOM dans
`PAL/src/harmonisation.ts`. Les tâches sont successives : elles partagent
l'état, `styles.css`, `i18n`, `etats.cjs` et `interface.test.mjs`.

Identifiants réservés, section de l'onglet Harmonisation à créer dans
SPEC-PAL, après celle de Vérification : `[UI-39]` à `[UI-44]` pour H1 à H5
(H5 en prend deux) ; H6 prend `[VER-23]`.

- [ ] **H0 · Les calculs de l'onglet** · `implementeur-exigeant`, haut.
  - SPEC-ECRANS-HARMONISATION.md, section 10. Code de référence :
    `D/Mesures/generer-ensembles.ts`, fonctions `distanceMin`, `tourner` et le
    calcul des zones.
  - `packages/couleur/src/harmonisation.ts`, exporté par le paquet :
    - `zonesTropProches(recette, palette, autre, intensite)` : pour chaque
      degré entier de −30 à +30 appliqué à la teinte de `palette` (réglée
      comme dans Création, `referenceReglee` depuis `departDe`, porteur figé),
      `autre` immobile, la proximité de M5 ; rend les suites de degrés sous
      le seuil, `{ debut, fin }[]`, en degrés de la réglette (décalage de la
      section 10).
    - `grisDeMemeClarte(couleur: Rgb8): Rgb8` : `Y = L³` (L d'OKLab), puis
      encodage sRGB de `Y` sur les trois canaux.
  - Tests `couleur/tests/harmonisation.test.ts` : une paire en alerte a une
    zone qui contient 0 ; une paire éloignée n'en a pas ; le gris d'un blanc
    est blanc, d'un noir est noir, et sa clarté OKLab égale celle de la
    couleur à 0,005 près.
  - Vérifier : `npm test --workspace ucm-couleur`, `npm run typecheck`.
  - Fini quand : vert ; 61 rampes par paire au plus (test sur un compteur).

- [ ] **H1 · L'onglet, son état et son en-tête** · `implementeur-exigeant`, haut.
  - SPEC, sections 7.1 et 7.2 ; identifiant `[UI-39]`.
  - `PAL/src/ui/index.ts` : l'onglet `harmonisation` entre `verification` et
    `gestion` (liste des onglets, `PANNEAUX`, `travail.append`, inertie
    pendant un dessin) ; désactivé sous deux palettes ; compteur sur le
    modèle de `lierLeCompteur` (`piedDeLaPalette.ts`), ton avertissement,
    nombre de `pairesTropProches`, absent à zéro.
  - `PAL/src/harmonisation.ts` : l'état de la section 7.1 et ses transitions
    (cocher, décocher, cinquième refusée, `regler`), sans DOM, testé seul.
  - En-tête, bascules, ligne fixe.
  - Galerie : `harmonisation-arrivee` (écran H1 de la maquette, jeu
    « Fichier du mainteneur »).
  - Vérifier : `npm test --workspace ucm-palettes-plugin`, `test:ui`.
  - Fini quand : vert ; l'onglet est désactivé avec une palette.

- [ ] **H2 · Cartes « Palettes trop proches » et « Vos palettes »** · `implementeur-exigeant`, haut.
  - SPEC, sections 7.4 et 7.5 ; identifiant `[UI-40]`. Le bouton « Comparer »
    choisit `regler` par le plus petit déplacement : `zonesTropProches` de
    H0.
  - Galerie : `harmonisation-paire` (écran H2).
  - Fini quand : vert ; capture conforme à H1 et H2 de la maquette.

- [ ] **H3 · Carte « Comparaison »** · `implementeur-exigeant`, haut.
  - SPEC, section 7.6 ; identifiant `[UI-41]`. Niveaux de gris par
    `grisDeMemeClarte`. Les rôles de chaque composant suivent la table du kit
    (`cranDeLaVariable`), jamais un cran écrit en dur.
  - Galerie : `harmonisation-niveaux-de-gris` (écran H5).
  - Fini quand : vert ; capture conforme à H4 et H5.

- [ ] **H4 · Carte « Réglages »** · `implementeur-exigeant`, haut.
  - SPEC, section 7.7 ; identifiant `[UI-42]`. Réemploie les réglettes et
    options de P6 ; les réglages s'appliquent à la palette par le même
    chemin que Création (même message au code du plugin, même historique
    d'annulation). « Annuler les modifications » ne défait que les réglages
    de la palette choisie faits depuis l'ouverture de l'onglet.
  - Galerie : `harmonisation-distinguee` (écran H3).
  - Fini quand : vert ; glisser la teinte hors de la zone éteint le constat
    et le compteur (test d'interface).

- [ ] **H5a · Les matrices de vision des couleurs** · `chercheur`.
  - Question : les matrices de simulation de la deutéranopie, de la
    protanopie et de la tritanopie de Machado, Oliveira et Fernandes (2009),
    sévérité 1,0, en RGB linéaire : valeurs exactes et source primaire (la
    page des auteurs ou l'article). Rendre les trois matrices 3 × 3 et l'URL.
  - Fini quand : trois matrices sourcées.

- [ ] **H5 · Carte « Roue des teintes », clavier** · `implementeur-exigeant`, haut.
  - SPEC, sections 7.8 et 7.9 ; identifiant `[UI-43]` (roue) et `[UI-44]`
    (clavier et accessibilité de l'onglet). Les matrices viennent de H5a,
    avec leur source en commentaire.
  - Galerie : `harmonisation-roue` (écran H6).
  - Fini quand : vert ; un point se règle au clavier (flèches ±1°, Maj
    ±10°), test d'interface.

- [ ] **H6 · Le lien « Comparer » de Vérification** · `implementeur`, moyen.
  - SPEC, section 6, deux premiers points ; identifiant `[VER-23]`, section
    du bilan de Vérification de SPEC-PAL.
  - `PAL/src/ui/vueDuBilanDesPalettes.ts` : sur une ligne de palette trop
    proche, `.bilan-verifier` dit `Comparer` et ouvre Harmonisation avec la
    paire cochée, comme le bouton de H2.
  - Galerie : `harmonisation-depuis-verification` (écran H7, jeu « Vingt
    palettes de la galerie »).
  - Fini quand : vert.

- [ ] **H7 · Revue au pixel et fin de vague** · `verificateur`, puis orchestrateur.
  - SPEC, section 12 : capture de chaque écran H1 à H7 de la maquette et de
    l'état de galerie correspondant, à 480 px, mêmes données ; écarts admis
    de la section 11. Le `verificateur` rend un tableau des écarts ;
    l'orchestrateur corrige les petits, renvoie les autres à la tâche qui les
    a produits.
  - Suite complète, `test:ui` de Palettes, commits, push.

### Vague 5 · Documents

| Tâche | En parallèle avec |
|---|---|
| D1 | D2 |
| D2 | D1 |
| D3 | seule |

- [ ] **D1 · AGENTS.md** · `implementeur`, moyen.
  - Sections : carte du code (`dossiers.ts`, `garanties.ts`, `recette.ts`,
    `rampe.ts`, `tailwind.ts`, `nuances.ts`, `garantie.ts`, `promesses.ts`,
    `alertes.ts`, `harmonisation.ts` du moteur ; l'onglet Harmonisation de
    Palettes) ; invariants « Moteur de couleur » : la table par thème et
    sens, les crans requis 100 à 950, G7 contre la page et la carte (la
    phrase « `elevation/raised` n'est jamais mesuré » est fausse
    désormais : la réécrire), le format 11 et sa migration, l'enveloppe,
    `ring` ; invariants « Interface d'UCM Palettes » : l'onglet
    Harmonisation, la Configuration à deux onglets.
  - `tests/inventaireInvariants.test.ts` (racine) compare AGENTS.md au
    code : il doit passer.
  - Vérifier : `npm test` (racine), contrôle de style de la skill de
    rédaction.
  - Fini quand : vert ; `git grep -n "page/focus\|format 10" -- AGENTS.md`
    ne rend que des mentions historiques explicites.

- [ ] **D2 · SPEC-PAL, relecture d'ensemble** · `implementeur`, moyen.
  - Chaque tâche a écrit ses identifiants. Ici : relire les sections
    touchées (recette, promesses, alertes, Création, Color shift,
    Configuration, Harmonisation, planche), retirer les phrases devenues
    fausses (« Réglages communs », « Rétablir » des réglettes, crans 500 à
    700 des palettes proches, ΔEok dans le constat, `page/focus`,
    `#121212` par défaut, part Soft 0,45 par défaut), vérifier que chaque
    identifiant réservé par ce plan existe une fois et qu'un test le cite.
  - Fini quand : la liste des identifiants de la section 7 de ce plan est
    entièrement trouvée, chacun dans SPEC-PAL et dans un nom de test.

- [ ] **D3 · L'architecture de référence** · `implementeur`, moyen.
  - Fichier :
    `docs/notes/Recherches/Archi Tokens Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md`.
    Son bandeau « Décisions à reporter » liste ce qui change ; la référence
    des valeurs est DECISIONS.md, sections 2 à 4, et SOLUTION-RAMPES.md, S3.
    `VUE-ILLUSTREE-MULTIMARQUES.html` est déjà à jour (décisions D13 et D15
    à D20) : s'y reporter pour la forme.
  - Reporter : la table par thème et sens, les crans requis, le cran 50 Dark
    à L 0,145 et la page `#0A0A0A`, `ring` à la racine de la palette, G7
    contre la page et la carte, la carte au blanc ou au neutre 100. Le chemin
    des tokens ne change pas. Retirer le bandeau une fois reporté.
  - Fini quand : plus aucune valeur contraire à DECISIONS.md dans le
    fichier.

- [ ] **D4 · Statuts** · orchestrateur.
  - `D/DECISIONS.md` et `D/README.md` : statut « implémenté », avec le
    dernier commit. Mémoire de la conversation principale.

### Vague 6 · Vérification, publication, recette

- [ ] **F1 · Suite complète** · `verificateur`.
  - `npm test`, `npm run typecheck`, `npm run build`, `test:ui` des trois
    plugins. Fini quand : tout est vert.

- [ ] **F2 · Publier le kit** · `executant`.
  - Modèle : le commit `65ba56f` (« chore: versions »). `@ucm-kit/core`
    passe de `0.5.0` à `0.6.0` (les signatures d'`emplois` changent) ;
    `@ucm-kit/cli` et `@ucm-kit/adapter-typescript` montent leur dernier
    chiffre et épinglent `0.6.0` ; reporter les versions dans les mêmes
    fichiers que ce commit (`README.md`, `docs/guides/RECETTE.md`,
    `package-lock.json` par `npm install`, READMEs des paquets).
  - Après le commit et le push par l'orchestrateur : AGENTS.md, « Publier les
    paquets », dans l'ordre core, cli, adapter, chaque exécution suivie par
    `gh run watch <id>` ; constater par `npm view <paquet>@<version> version`.
  - Fini quand : les trois versions sont servies.

- [ ] **F3 · Construire pour Figma** · `verificateur`.
  - `npm run build --workspace ucm-palettes-plugin` et
    `npm run build --workspace ucm-explorateur-plugin`.

- [ ] **F4 · Recette du mainteneur dans Figma** · mainteneur.
  - Ouvrir Palettes sur la recette existante : elle se lit au format 11,
    couleurs inchangées ; les intensités montrent « Par défaut » actif.
    Choisir « Par défaut » : les couleurs suivent la règle retenue.
  - Parcourir Vérification (G7 contre la page et la carte, constats sans
    ΔEok), Configuration (deux onglets), Réglage global et Color shift
    (marques), Harmonisation (paires, comparaison, réglages, roue).

## 7. Identifiants réservés

| Identifiant | Tâche | Objet |
|---|---|---|
| `[PLA-30]` | R2 | `ring` au niveau de la palette dans la planche |
| `[MOT-35]` | M3 | L'enveloppe de chroma |
| `[MOT-36]` | M4 | La dérive aux deux bouts |
| `[MOT-37]` | R4 | La carte déduite |
| `[REC-12]` | M2, M4 | Le format 11 et sa migration |
| `[REC-13]` | M2 | Les crans requis ajoutés par la migration |
| `[VER-21]` | R4 | G7 contre la page et la carte |
| `[VER-22]` | M5 | L'alerte par rôle des palettes trop proches |
| `[VER-23]` | H6 | Le lien « Comparer » du bilan |
| `[ENT-20]` | P5 | La Configuration en deux onglets |
| `[ENT-21]` | P4 | Le bouton d'en-tête nommé |
| `[DER-25]` | P7 | Les marques par défaut de Color shift |
| `[UI-37]` | P3 | Les listes déroulantes |
| `[UI-38]` | P6 | Les marques par défaut de Réglage global |
| `[UI-39]` à `[UI-44]` | H1 à H5 | L'onglet Harmonisation (H5 en prend deux) |

Avant la vague 1, l'orchestrateur vérifie dans SPEC-PAL et dans les tests
qu'aucun de ces identifiants n'existe encore (`git grep -n "\[MOT-35\]"`,
etc.) : ils étaient libres à l'écriture du plan. Un identifiant pris entre
temps se remplace par le suivant libre, dans ce tableau d'abord.

## 8. Récapitulatif

| Vague | Tâches | Agents |
|---|---|---|
| 0 | V0.1 | verificateur |
| 1 | R1 à R5 | implementeur ×2, implementeur-exigeant ×2, verificateur |
| 2 | M1 à M6 | implementeur ×2, implementeur-exigeant ×3, verificateur |
| 3 | P1 à P8 | implementeur ×6, implementeur-exigeant ×1, verificateur |
| 4 | H0 à H7 | implementeur-exigeant ×6, chercheur, implementeur, verificateur |
| 5 | D1 à D4 | implementeur ×3 |
| 6 | F1 à F4 | verificateur ×2, executant, mainteneur |
