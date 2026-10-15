# Plan d'implémentation de la recette critique de qualité

**Statut : relu par Codex, corrigé ; propositions PR1 à PR7 validées par le
mainteneur (PR3 précisée par lui). Prêt à exécuter.** Les décisions viennent de [DECISIONS.md](./DECISIONS.md), qui
fait foi. Les points que ce plan propose lui-même sont dans la section 4 ; le
mainteneur les valide avant la vague qui les emploie. La
[revue](./REVIEW-PLAN-IMPLEMENTATION.md) et la réponse à chacun de ses points
sont dans le même dossier.

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
`docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`,
et `SPEC` la [spécification des écrans](./SPEC-ECRANS-HARMONISATION.md).
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

## Point de reprise (15 octobre 2026)

- Poussé : vagues 0 à 2 (kit 0.6.0, cli 0.1.56, adapter 0.1.49 publiés), P1,
  et le travail de Codex sur S1, D3 et H5a
  ([REPRISE-CODEX-S1-D3-H5A.md](./REPRISE-CODEX-S1-D3-H5A.md)). La
  vérification de fin de vague 2 est verte : `npm test`, `npm run typecheck`,
  `npm run build` et les trois `test:ui` (Palettes 265, Exporter 39,
  explorateur 24).
- **Prochaine étape** : la vague 3 dans l'ordre P2, P6, P7, P3, P4, P5, P8 ;
  P2 et P6 sont faits.
- Question au mainteneur : une référence plus sombre que le bout sombre
  (stone-950) prend toute la dérive vers le clair (M4) ; test `todo` dans
  `packages/couleur/tests/desaturees.test.ts`.

## 3. Ordre des vagues

| Vague | Contenu | Dépend de |
|---|---|---|
| 0 | Préparation | — |
| 1 | Le kit : `ring`, table par thème, G7 contre la page et la carte | 0 |
| 2 | Le moteur : banc, courbe Dark, format 11, règle de chroma, dérive, alerte C6 | 1 terminée |
| 3 | Palettes hors Harmonisation : Vérification, libellés, listes, Configuration, Réglage global, Color shift | 2 |
| 4 | L'onglet Harmonisation, et les onglets indisponibles du socle | 3 |
| 5 | Documents : AGENTS.md, SPEC-PAL, architecture de référence | 4 |
| 6 | Vérification complète, publication du kit, recette Figma | 5 |

Chaque commit sur `main` laisse la suite verte. Le format 11 se définit et se
raccorde dans une seule tâche (M2).

## 4. Ce que le plan propose (à valider par le mainteneur)

DECISIONS.md, section 6, laisse quelques points au plan, et la revue en a
ajouté. Chacun porte un identifiant de la SPEC-PAL réservé en section 7.

**PR1. Le schéma du format 11 pour la règle de chroma.** Chaque profil a sa
part commune et son enveloppe, toutes deux obligatoires :

```ts
export interface BornesDeChroma { readonly a: number; readonly b: number; readonly jaunes: number }
export interface EnveloppeDeProfil { readonly p0: number; readonly light: BornesDeChroma; readonly dark: BornesDeChroma }
export interface ProfilDeRecette { readonly part: number; readonly enveloppe: EnveloppeDeProfil }
// Recette.profils: { soft: ProfilDeRecette; vivid: ProfilDeRecette }
```

`jaunes` est `k` : en Dark il vaut 0, ce qui donne `marge(H) = 1` sans cas
particulier dans le code. `p0` est rangé dans l'enveloppe et ne suit pas la
part commune : une palette qui a ses parts propres, ou une seule intensité,
ne change pas quand le designer règle la part commune. Valeurs par défaut :

| Profil | `part` | `enveloppe.p0` | `enveloppe.light` | `enveloppe.dark` |
|---|---|---|---|---|
| `soft` | 0,85 | 0,85 | a 0,6 · b 0,38 · jaunes 1 | a 1,1 · b 0,38 · jaunes 0 |
| `vivid` (sert aussi l'intensité unique) | 0,95 | 0,95 | a 1,1 · b 0,48 · jaunes 0,5 | a 1,1 · b 0,30 · jaunes 0 |

Les bornes ne paraissent nulle part dans l'interface. « Par défaut », sur la
carte des intensités de la Configuration, pose les parts et les enveloppes du
tableau.

**PR2. Le relevé `derives` au format 11.** Chaque rampe de Tailwind porte la
clarté et la teinte de chacun de ses crans :

```ts
export interface RampeDeDerive { readonly nom: string; readonly crans: readonly (readonly [L: number, H: number])[] }
// Recette.derives: readonly RampeDeDerive[]
```

**PR3. La carte pour G7 : déduite, et désignée à part.** Light : blanc
`#FFFFFF`. Dark : un cran, celui qui suit la page. Le mainteneur l'a précisé :
la carte dépend du fond que le designer règle. Elle prend la teinte et la
saturation du réglage « Fond de la page » Dark, à la clarté du cran suivant
celui dont la clarté est la plus proche de ce fond sur la courbe Dark. Avec
le fond par défaut `#0A0A0A`, au cran 50, la carte est au cran 100, environ
`#1C1C1C` ; un fond teinté donne une carte de même teinte. Aucun champ de
recette, aucun réglage. Dans les promesses, la carte est un fond distinct
de la page, avec sa propre désignation, sa case dans la réglette et sa clé
dans les limites.

**PR4. La lecture des recettes anciennes ne conserve pas les couleurs.** Le
mainteneur l'a dit : ses recettes servent au réglage, et ses primitives
peuvent être réécrites. Une recette au format 8, 9 ou 10 se lit au format 11
ainsi : les profils prennent les parts et les enveloppes par défaut de PR1 ;
les crans 400, 500 et 950 manquants s'ajoutent à la liste, leur clarté lue
par `luminositeAuNumero` sur l'ancienne grille ; le relevé `derives` devient
celui du paquet. Les courbes, les fonds, le texte des boutons, les seuils et
les palettes restent. Une lecture n'écrit rien ; la prochaine écriture range
le format 11. Une forme ancienne invalide (`crans` ou `courbes` absents, un
champ du format 11 dans une recette plus ancienne) se classe `illisible`.

**PR5. Le bouton « Configuration » dans l'explorateur.** C9 le prévoit dans
les trois plugins, mais l'explorateur n'a pas de configuration : le plan le
pose dans Exporter et Palettes seulement.

**PR6. Les palettes dans Harmonisation.**

- L'état de l'onglet range des identifiants (`Palette.id`), jamais des noms :
  `cochees`, `regler`, les paires, les zones et le point de départ de
  l'annulation. Une palette supprimée sort de l'état ; une palette importée
  ou synchronisée garde sa place si son identifiant existe encore. Sous deux
  palettes, l'onglet est indisponible et son état se vide.
- Une palette à une intensité se compare sur sa seule rampe, quelle que soit
  la bascule Soft et Vivid ; ses réglages agissent sur cette rampe.
- Une palette libre (sa propre liste de numéros) se coche, se compare sur
  ses nuances, se règle et paraît sur la roue comme les autres : ses numéros
  suivent les courbes communes, donc un même numéro a la même clarté dans
  toutes les palettes. Elle n'alimente pas `theme` : elle n'a ni bouton ni
  message. Sa colonne de la carte Comparaison dit « Palette libre : pas de
  composants », et elle n'entre pas dans l'alerte des palettes trop proches,
  qui juge ces rôles.
- Une palette figée se coche et se compare ; la carte Réglages dit « Palette
  figée : ses couleurs ne se règlent pas. » au lieu des réglettes, et son
  point de la roue ne se saisit pas.
- « Annuler les modifications » de la carte Réglages restaure, pour la seule
  palette choisie, ses réglages de teinte, de saturation et de luminosité
  tels qu'ils étaient à son premier réglage dans l'onglet depuis la dernière
  entrée. Le point de départ se renouvelle à chaque entrée dans l'onglet :
  un changement fait entre-temps dans Création n'est jamais défait. La
  recette restaurée se range par la frontière existante.
- Une paire qu'aucune teinte de la course ne sépare : « Comparer » choisit A
  à régler, et le constat dit « Aucune teinte de la course ne les sépare :
  changez la saturation ou la luminosité de l'une d'elles. »

**PR7. Le « par défaut » du Color shift.** Le défaut d'un bout de teinte est
la valeur du préréglage Tailwind de ce bout ; celui de la saturation et de la
luminosité est 0. La marque, le bouton « Par défaut », son état désactivé, le
résumé et « Tout par défaut » emploient la même valeur. Le résumé compare les
valeurs au préréglage courant, et non l'origine rangée (`origine: 'tailwind'`),
qui peut dater d'un relevé ancien.

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
`git diff --stat -- <chemins>` ne montre aucun fichier réécrit en entier, et
la suite du paquet touché est verte. Le push se fait en fin de vague, après
la suite complète et, si la vague touche Palettes, après `test:ui`.

## 6. Les vagues

### Vague 0 · Préparation

- [x] **V0.1 · État de départ** · orchestrateur. Fait à e0e1d97 : typecheck,
  build et les trois `test:ui` verts (Palettes 262, Exporter 39,
  explorateur 24) ; `npm test` rouge sur un seul test d'Exporter, qui lisait
  une sonde retirée par ce2623b, corrigé en 60a1d83 (1061 sur 1061).
  Identifiants de la section 7 libres.
  - `git status` : seuls `docs/notes/Recherches/README.md` et
    `docs/notes/Recherches/Architecture globale UCM/` peuvent être modifiés,
    et ne se commitent pas.
  - Le `verificateur` lance la suite complète et `test:ui` de Palettes ; tout
    est vert. Sinon, s'arrêter et le signaler au mainteneur.
  - Vérifier que les identifiants de la section 7 sont libres.
  - Fini quand : la suite est verte au commit de départ, et son résultat est
    noté dans le premier message de la vague 1.

### Vague 1 · Le kit et la table des rôles

Les tâches sont successives.

- [x] **R1 · `page/focus` devient `ring`** · `implementeur`, moyen. Fait en
  a53024a ; la bande de l'aperçu dit `ring`.
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
    `npm test`. Puis `git grep -n "page/focus" -- packages` ne rend rien.
  - Fini quand : les trois commandes passent et la recherche est vide.

- [x] **R2 · La planche dessine `ring` au niveau de la palette** · `implementeur`, moyen.
  Fait en 974615f ; la rangée porte un rôle et des exemples comme un dossier.
  - Identifiant réservé : `[PLA-30]`, dans la section de SPEC-PAL qui décrit
    la planche des variables.
  - `PAL/src/planche/modele.ts` : retirer `ring` de `VARIABLES_DU_DOSSIER.page` ;
    la planche montre une rangée `ring` au niveau de la palette, après les
    trois dossiers, avec la largeur d'anneau d'aujourd'hui (`LARGEUR_PAGE.anneau`).
    Lire le rendu de la planche pour placer la rangée comme les autres
    rangées de variables (même composant, même échantillon d'anneau).
  - Tests : `PAL/tests/modeleDePlanche.test.ts` ;
    `[PLA-30] ring est une rangée de la palette, hors du dossier page`. Le
    test vérifie le modèle : rang de la rangée, cellule, largeur d'anneau. Le
    rendu dans Figma se contrôle à la recette F4.
  - Vérifier : `npm test --workspace ucm-palettes-plugin`.
  - Fini quand : vert.

- [x] **R3 · Une table par thème et par sens** · `implementeur-exigeant`, haut.
  Fait en ae074b0, avec R4 : la table Dark seule faisait manquer G7 contre
  `surface/default` au cran 300. `cransRequis('dark', 'normal')` vaut
  `[300, 400, 500, 600, 700, 800, 900, 950]` ; la liste de 100 à 950 est la
  réunion des deux thèmes (M2).
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
  - `packages/couleur/src/recette.ts`, `validerRecette` : **la liste des crans
    requis ne change pas dans cette tâche.** Elle se calcule avec
    `cransRequis('light', sens)` pour chaque sens en usage, ce qui rend
    exactement la liste d'aujourd'hui. M2 l'étend aux deux thèmes avec la
    lecture des recettes anciennes.
  - `packages/couleur/src/alertes.ts`, `rangsDesVariables` : passe le thème.
  - Tests : `kit/tests/dossiers.test.ts` (tableau `ATTENDUS` par thème et
    sens ; `cransRequis('dark', 'normal')` vaut
    `[100, 200, 300, 400, 500, 600, 700, 800, 900, 950]`),
    `kit/tests/garanties.test.ts`, `couleur/tests/nuances.test.ts`,
    `PAL/tests/presentation.test.ts`, et ce que la suite signale. Aucune
    recette de test n'est réécrite.
  - Vérifier : `npm run build --workspace @ucm-kit/core`, `npm run typecheck`,
    `npm test`, `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert ; l'aperçu de Palettes en Dark peint les fonds teintés
    aux crans 300, 400, 500 et leur texte au 950 (test d'interface sur un
    état de galerie en Dark, qui lit les couleurs des variables affichées).

- [x] **R4 · G7 jugée contre la page et la carte** · `implementeur-exigeant`, haut.
  Fait en ae074b0. Vert #16A34A ne manquant plus rien, le témoin d'une
  palette en échec devient Bleu #1E6FD9 au texte noir en Light (G1).
  - Décision : DECISIONS.md, section 4, G7 ; proposition PR3. Identifiants
    réservés : `[MOT-37]` (la carte déduite, section des promesses du moteur
    de SPEC-PAL) et `[VER-21]` (G7 contre la page et la carte, section des
    promesses de Vérification).
  - Kit, `garanties.ts` : `FondDeGarantie` reçoit un troisième membre,
    `{ readonly fondDeLaCarte: true }` ; constante `FOND_DE_LA_CARTE` à côté
    de `FOND_DE_LA_PAGE`. G7 :
    `fonds: [FOND_DE_LA_PAGE, FOND_DE_LA_CARTE]`.
  - Moteur, `couleur/src/promesses.ts` :
    - fonction exportée `couleurDeLaCarte(recette, mode): Rgb8`. Light :
      `[255, 255, 255]`. Dark : lire le fond `recette.fonds.dark` en OKLCH ;
      trouver sur `recette.courbes.dark` le rang dont la clarté est la plus
      proche de la sienne ; prendre la clarté du rang suivant (le dernier rang
      s'il n'y en a pas) ; rendre la couleur de cette clarté avec la teinte et
      la chroma du fond, chroma réduite jusqu'à entrer dans le gamut, à 8 bits
      (`oklchVersLineaire`, `lineaireVersRgb8` ou les fonctions voisines de
      `rampe.ts`) ;
    - `contexteDe` ajoute `cartes` à côté de `fonds` ;
    - la désignation d'un fond extérieur à la palette distingue les deux :
      `{ nature: 'fond', fond: 'page' | 'carte', couleur }` ; `promessesDe`
      traite la branche `'fondDeLaCarte' in fond` avec `fond: 'carte'`.
  - `couleur/src/limites.ts`, `cleDe` : la clé d'une promesse inclut `fond`,
    pour qu'une promesse manquée contre la carte ne soit pas confondue avec
    celle tenue contre la page.
  - Lecteurs à étendre au nouveau fond :
    - `PAL/src/presentation.ts`, `fondDeLaPromesse` : la variable du fond vaut
      `'elevation/raised'` pour la carte ;
    - `PAL/src/ui/modeleDesGaranties.ts` : `colonneDuFond` (une colonne
      « Carte » après « Page ») et `caseDeLaReglette` (une case Carte) ;
    - `PAL/src/ui/garanties.ts` : la case Carte de la réglette, sa position,
      ses arcs, son libellé et son spécimen, sur le modèle de la case Page ;
    - `PAL/src/planche/modele.ts` ;
    - `PAL/src/i18n/fr.ts` et `en.ts` : `variableDuFond` ; libellé
      `'elevation/raised'` : « fond de la carte », « card background » ; le
      type `VariableLibellee` le reçoit ;
    - `packages/couleur/scripts/mesurer-ancrage.mjs`.
  - Tests :
    - `couleur/tests/promesses.test.ts` :
      `[MOT-37] la carte vaut le blanc en Light et le cran qui suit la page en Dark` :
      avec la recette par défaut, un gris (R = G = B) entre `#1A1A1A` et
      `#1E1E1E` ; avec un fond Dark bleuté `#0B1020`, la teinte OKLCH de la carte est
      celle du fond à 5° près ; avec un fond Dark à la clarté du cran 100, la
      carte est à la clarté du cran 200 ;
      `[VER-21] G7 tenue contre la page et manquée contre la carte`, qui
      vérifie les deux désignations distinctes ;
    - `couleur/tests/limites.test.ts` : avec la même paire de promesses, la
      limite dynamique ne borne pas le réglage par la promesse de la carte,
      manquée au départ ;
    - `kit/tests/garanties.test.ts` (G7 a deux fonds) ;
      `PAL/tests/modeleDesGaranties.test.ts` (case et colonne Carte),
      `presentation`, `textes`.
  - Vérifier : comme R3.
  - Fini quand : vert ; un état de galerie de Vérification montre la
    réglette de G7 avec ses deux cases, Page et Carte, et le test d'interface
    lit leurs libellés.

- [x] **R5 · Fin de vague** · `verificateur`, puis orchestrateur.
  - Suite complète et `test:ui` des trois plugins. Commits, push.
  - Fait : 2627 tests, typecheck, build, `test:ui` 264, 39 et 24 verts.
    Versions montées en a5e19bb (kit 0.6.0, cli 0.1.56, adapter 0.1.49) :
    le kit ne change plus après la vague 1, F2 n'a plus qu'à vérifier la
    publication. Le bilan de vingt palettes garde son jeu d'origine (52d9196) ;
    ses comptes suivent le moteur et se revoient en fin de vague 2.

### Vague 2 · Le moteur

Les tâches sont successives.

- [x] **M0 · Le banc lit les recettes par la migration** · `implementeur`, moyen.
  Fait : le filtre qui rend le fichier du commit est
  `FILTRE="retenue au banc (jaunes, fonds Dark 0,30) · retenue"` ; « retenue au
  banc » seul ajoute quatre tables. Les scripts du banc suivent aussi `ring`
  et le fond carte de G7.
  - Pourquoi : `D/Mesures/variantes.ts` valide `recette-mainteneur.json`
    (format 10) au chargement ; après M2, la validation exigerait le format
    11 et l'import échouerait. Les mesures historiques gardent leurs données.
  - `D/Mesures/variantes.ts`, fonction `valider` : lit la recette brute par
    `classerRecette` du paquet (lisible ou migrée) au lieu de
    `validerRecette`, puis, pour les mesures historiques, remet les parts
    communes de la recette brute (`profils.soft.part`, `profils.vivid.part`)
    à la place de celles de la migration. Une recette refusée lève une
    erreur qui cite les refus.
  - Même changement dans les autres scripts de `D/Mesures/` qui appellent
    `validerRecette` (`git grep -n validerRecette -- "D/Mesures"`), et dans
    `docs/notes/Recherches/Archi Tokens Multi-marques/generer-vue-illustree.ts`.
  - Les fichiers de `D/Mesures/references/` ne changent pas.
  - Vérifier : `FILTRE="retenue au banc (jaunes, fonds Dark 0,30) · retenue" npx tsx "D/Mesures/garanties-regles.ts"`
    rend le même `GARANTIES-RETENUES.json` qu'avant (diff vide), avant et
    après M2.
  - Fini quand : diff vide, et la commande repasse sans erreur après M2.

- [x] **M1 · La courbe Dark et le fond de page Dark** · `implementeur`, moyen.
  Fait en 18fa2a4.
  - Décision : DECISIONS.md, section 2, « La courbe Dark ».
  - `packages/couleur/src/nuances.ts` : le premier nombre de
    `ONZE.courbes.dark` passe de `0.18` à `0.145`. Le préréglage 13 réutilise
    cette courbe : ne rien changer d'autre.
  - `packages/couleur/src/recette.ts`, `recetteParDefaut` :
    `fonds.dark: '#0A0A0A'`. `fonds.light` reste `'#F7F7F7'`.
  - Ne change pas : `alertesDesFonds`, `TOLERANCE_FOND`, les courbes et
    fonds rangés d'une recette.
  - `packages/couleur/src/palette.ts`, `borneDesFonds` : lit le cran 50 de la
    courbe, ou celui du préréglage 11 s'il manque ; les deux donnent
    désormais 0,145. Aucun changement de code.
  - Tests : `couleur/tests/fondsSombres.test.ts` (la borne d'une recette
    neuve vaut `clarteBasse: 0.145`), `couleur/tests/nuances.test.ts`,
    `couleur/tests/recette.test.ts`, et ce que la suite signale dans
    `PAL/tests/` (Configuration : le défaut du fond Dark).
  - Vérifier : `npm test --workspace ucm-couleur`,
    `npm test --workspace ucm-palettes-plugin`.
  - Fini quand : vert ; `#0A0A0A` ne déclenche pas `alertesDesFonds` contre la
    courbe par défaut (test).

- [x] **M2 · Le format 11, en un lot** · `implementeur-exigeant`, haut.
  Fait. Les clartés ajoutées par la lecture s'arrondissent au millième. Des
  tests du moteur et du plugin, et la galerie (`recetteDeLaGalerie`), gardent
  la part Soft à 0,45 : ils racontent un Bleu porté par Vivid. À revoir en M6,
  quand le calcul des couleurs est refait.
  - Décisions : Q3 ; propositions PR1, PR2 et PR4. Identifiants réservés :
    `[REC-12]` (le format 11 et la lecture des formats 8 à 10) et `[REC-13]`
    (les crans requis des deux thèmes), section de la recette de SPEC-PAL.
  - Ce lot définit tout le format 11 et le raccorde en une fois : schéma,
    validation, crans requis, lecture des anciens formats, configuration.
    L'algorithme de la règle (M3) et celui de la dérive (M4) viennent après ;
    ce lot les laisse inchangés.
  - `packages/couleur/src/recette.ts` :
    - `FORMAT_RECETTE = 11`.
    - Les types de PR1 ; `Recette.profils` devient
      `{ soft: ProfilDeRecette; vivid: ProfilDeRecette }`. Constante exportée
      `PROFILS_PAR_DEFAUT` aux valeurs de PR1 ; `recetteParDefaut` la copie.
    - Le type `RampeDeDerive` de PR2 remplace `PaireDeDerive` pour
      `Recette.derives`. `RELEVE_TAILWIND` (dans `tailwind.ts`) prend cette
      forme : les 17 rampes colorées de Tailwind 3.4.17 (sans `slate`,
      `gray`, `zinc`, `neutral`, `stone`), chacune avec ses onze crans
      `[L, H]` du 50 au 950, L à 4 décimales, H à 2 décimales. Source :
      `D/Mesures/references/tailwind-3.4.17.json`, converti par
      `rgb8VersOklch(lireHexa(hexa))` du paquet ; l'agent génère le tableau
      par un script jetable et le colle, avec un commentaire qui nomme la
      source et la version.
    - `tailwind.ts` garde son algorithme dans ce lot : `deriveTailwind` lit,
      pour chaque rampe, la teinte de son premier et de son dernier cran, qui
      tiennent la place des anciennes teintes claire et sombre.
    - `validerRecette` : chaque profil a exactement `part` et `enveloppe` ;
      l'enveloppe a exactement `p0`, `light` et `dark`, chacun de ceux-ci
      exactement `a`, `b`, `jaunes`. `p0` dans `]0 ; 1]`, `a` et `b` dans
      `]0 ; 2]`, `jaunes` dans `[0 ; 2]`. Sinon refus de la nouvelle règle
      `'enveloppe'` sur le chemin fautif (`profils.soft.enveloppe.light.a`).
      `validerDerives` : refus `derives-nombre` (moins de deux rampes),
      `derives-noms` (nom vide ou en double), et nouveau refus `derives-crans`
      (une rampe de moins de deux crans, un L hors de `]0 ; 1[`, un H hors de
      `[0 ; 360[`, des L non strictement décroissants) ; `derives-teintes` et
      `derives-teintes-claires` disparaissent. Ajouter les règles nouvelles à
      `RegleRecette` et leurs messages dans `PAL/src/i18n/fr.ts` et `en.ts`,
      sur le modèle des messages de refus voisins.
    - Crans requis : la réunion de `cransRequis(mode, sens)` pour les deux
      thèmes, chacun dans son sens. Mettre à jour le commentaire qui dit
      « 50, 400 et 950 sont facultatifs » : seul 50 l'est.
    - `classerRecette` : une fonction par étape (`depuisLeFormat8`,
      `depuisLeFormat9`, `depuisLeFormat10`), chacune rendant le format
      suivant ; une recette 8 passe par 9 et 10. Avant toute transformation,
      la forme ancienne se vérifie : `crans` ou `courbes` absents, ou un champ
      du format 11 (`enveloppe`, une rampe de `derives` en objet) dans une
      recette plus ancienne, la classent `illisible`, sans exception levée.
      L'étape 10 vers 11 applique PR4 : `formatVersion: 11` ; `profils` =
      `PROFILS_PAR_DEFAUT` ; ajout des crans 400, 500 et 950 manquants, triés,
      avec dans `courbes.light` et `courbes.dark` la valeur
      `luminositeAuNumero(ancienneGrille, mode, numero)` au même rang ;
      `derives` = `RELEVE_TAILWIND` ; le reste tel quel.
  - `PAL/src/configuration.ts` :
    - `poserValeur` sur une part garde les autres champs du profil, dont
      `enveloppe` : `{ ...profil, part: valeur }` ;
    - `retablir(recette, 'parts')` pose `PROFILS_PAR_DEFAUT` ;
    - `estParDefaut` compare les parts et les enveloppes ;
    - `palettesModifiees` ne change pas : `p0` ne suit pas la part commune
      (PR1).
  - Témoins : trois fichiers `packages/couleur/tests/fixtures/recettes/format-8.json`,
    `format-9.json`, `format-10.json`, des recettes valides dans leur forme
    d'origine, jamais réécrites ensuite ; celle du format 10 a une liste sans
    400 ni 950. Les tests de recette qui fabriquaient une recette au format
    courant passent au format 11 ; ceux qui portent sur un ancien format
    lisent un témoin.
  - Tests, `couleur/tests/recette.test.ts` :
    `[REC-12] une recette 10 se lit en 11, aux profils et au relevé par défaut`,
    `[REC-12] une recette 8 passe par 9 et 10`,
    `[REC-12] une forme ancienne sans courbes est illisible, sans exception`,
    `[REC-12] une enveloppe dans une recette 10 la rend illisible`,
    `[REC-12] une enveloppe hors bornes est refusée`,
    `[REC-12] la lecture n'écrit rien, et ranger puis relire rend la même recette`,
    `[REC-13] la lecture ajoute 400 et 950 au témoin du format 10`,
    `[REC-13] une recette 11 sans 950 est refusée`, refus `derives-crans` ;
    le test qui fige « le format suivant » passe de 11 à 12.
    `PAL/tests/configuration.test.ts` : une saisie de part garde l'enveloppe ;
    « Par défaut » des intensités pose parts et enveloppes ; une recette
    migrée est « par défaut ». Les tests qui figent `soft 0.45` en recette
    par défaut passent à 0,85.
  - Vérifier : `npm run typecheck`, `npm test` (racine).
  - Fini quand : vert.

- [x] **M3 · La règle de chroma** · `implementeur-exigeant`, haut.
  Fait : `comparer-implementation.ts` ne trouve aucun écart sur 25 344
  couleurs. Les pistes de Réglage global prennent l'enveloppe Light. Trois
  tests V3a de la galerie restent rouges (Violet et Indigo presque identiques
  dans « tout conforme », Bleu trop proche de Marine) : ils se reprennent une
  fois, après M5, qui refait l'alerte des palettes proches.
  - Décision : DECISIONS.md, section 2, Q1 et Q2 ; proposition PR1.
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
      déplacer dans `conversions.ts` et le réexporter de `tailwind.ts`.
    - `cranFlottant` et `fabriquerCran` reçoivent le même dernier paramètre
      facultatif et le transmettent.
    - `ParametresRampe` reçoit `enveloppe?: Enveloppe` ; `fabriquerRampe` la
      passe à chaque cran. La part transmise garde Color shift et
      `facteurSombre` ; `p0` ne les prend pas. Sans enveloppe, le calcul est
      celui d'aujourd'hui : les tests qui fabriquent un cran sans recette ne
      changent pas.
  - `packages/couleur/src/palette.ts` : fonction exportée
    `enveloppeDe(recette, intensite, mode): Enveloppe`. Le profil vaut `soft`
    pour l'intensité Soft, `vivid` pour Vivid et pour l'intensité unique ;
    elle rend `{ p0, ...bornes du mode }` de ce profil.
    `parametresDesRampes(recette, palette)` rend déjà une fonction de
    `(intensite, mode)` : elle y ajoute `enveloppe: enveloppeDe(recette, intensite, mode)`.
    `partDeLaReference` ne change pas (le prototype garde `partsDe`).
  - Autres fabricants de crans, sur la même règle : `reconstruction.ts` (la
    copie flottante de `fabriquerRampe` et les appels de `fabriquerCran`),
    `garantie.ts` (`garantieDesCourbes` : l'enveloppe du profil et du thème
    jugés), `PAL/src/ui/derive/editeur.ts` et
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
    - `[MOT-35] les rampes suivent le prototype` : des hexadécimaux écrits
      dans le test, pour six palettes de la recette par défaut : `#3B82F6`,
      `#EAB308` et `#16A34A` à deux intensités ; `#B15152` à une intensité ;
      `#3B82F6` avec une teinte réglée à +8° et une luminosité à −0,02 ;
      `#EAB308` avec des parts propres 0,6 et 1. Deux thèmes chacune. Pour les
      obtenir, l'agent écrit un script jetable qui appelle
      `rampesDuBanc(recette, palette, REGLE_FINALE)` sur ces palettes et
      colle la sortie ; le script ne se commite pas.
  - Mesure de contrôle, après le lot : un script
    `D/Mesures/comparer-implementation.ts` (écrit par l'agent, commité)
    compare `rampesDe` du paquet et `rampesDuBanc` avec `REGLE_FINALE`, sur
    les palettes du balayage de `garanties-regles.ts` (72 teintes, deux
    clartés de référence, deux profils), recette par défaut du paquet, dans
    les quatre couples de texte des boutons. Attendu : aucun canal ne diffère
    de plus d'une unité.
  - Vérifier : `npm run typecheck`, `npm test --workspace ucm-couleur`,
    `npm test --workspace ucm-palettes-plugin`,
    `npx tsx "D/Mesures/comparer-implementation.ts"`.
  - Fini quand : vert et la comparaison est sans écart.

- [x] **M4 · La dérive de teinte aux deux bouts** · `implementeur`, moyen.
  Fait. Pire écart à Tailwind mesuré : 10,6° (amber, cran 700), sur les onze
  crans de chaque rampe relue depuis son cran 500. Question au mainteneur : une
  référence plus sombre que le bout sombre (stone-950) prend toute la dérive
  vers le clair, et sa 500 part à 81° pour 49° ; test `todo` dans
  `desaturees.test.ts`. Deux V3a de plus (Pourpre à la place de Cuivre),
  repris avec les autres après M5.
  - Décision : DECISIONS.md, section 2, Q10. Identifiant réservé :
    `[MOT-36]`, section du préréglage Tailwind de SPEC-PAL, qui remplace les
    règles de `[MOT-19]` sur la dérive totale (garder `[MOT-19]`, réécrire son
    texte, ne pas supprimer l'identifiant).
  - `packages/couleur/src/tailwind.ts` : `prereglageTailwind(reference, bouts, releve)`
    garde sa signature, son résultat `{ clair, sombre }` arrondi au centième
    et son cas sans teinte (`reference.C < CHROMA_SANS_TEINTE`). Son calcul
    devient celui de `deriveAuxBouts` du prototype : teinte de chaque rampe
    lue à la clarté de la référence (teintes dépliées, interpolation entre
    crans, bornée aux extrémités), choix des deux rampes voisines sur le
    cercle, dérive lue à `bouts.clair` et à `bouts.sombre`, interpolée selon
    la teinte. `deriveTailwind` disparaît, avec ses tests.
  - Lecteurs : `reconstruction.ts`, `PAL/src/edition.ts`,
    `packages/couleur/scripts/mesurer-*.mjs` (signature inchangée : rien à
    faire, sinon vérifier).
  - Tests : `couleur/tests/tailwind.test.ts` (réécrit :
    `[MOT-36] la dérive se lit aux deux bouts des rampes voisines`, avec les
    références de cran 500 de cinq rampes, dont `amber` et `yellow`, et les
    valeurs attendues obtenues par `deriveAuxBouts` du prototype, script
    jetable) ; `couleur/tests/vecteurs.test.ts` (valeurs figées à recalculer
    de la même façon) ; `PAL/tests/edition.test.ts`.
  - Vérifier : `npm run typecheck`, `npm test --workspace ucm-couleur`,
    `npm test --workspace ucm-palettes-plugin`.
  - Fini quand : vert ; un test vérifie que le pire écart de teinte à
    Tailwind, sur les 17 rampes relues avec leur propre cran 500 comme
    référence, ne dépasse pas 12,5°.

- [x] **M5 · L'alerte des palettes trop proches (C6)** · `implementeur-exigeant`, haut.
  Fait. Une palette libre ou figée, ou terne, n'entre pas dans l'alerte (PR6).
  Le rapport passe au format 5 (`[VER-16]`) : `distance` devient `proximite`.
  `[VER-11]` ne portait pas la règle des crans 500 à 700 et reste tel quel.
  Contrôle : 10 paires sur `verification-bilan-a-verifier` au lieu de 12 ;
  Lime/Vert et Lime/Feuille passent juste au-dessus du seuil (0,0566) avec la
  règle de chroma.
  - Décision : DECISIONS.md, section 5, C6 ; SPEC, sections 7.3 et 10,
    « Paires ». Identifiant réservé : `[VER-22]`, section des alertes de
    Vérification de SPEC-PAL ; il remplace la règle de `[VER-11]` sur les
    crans 500 à 700 (réécrire le texte de `[VER-11]`, ne pas supprimer
    l'identifiant).
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
      alerte, par distance croissante, avec les identifiants des deux
      palettes.
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
    comparent pas`, `[VER-22] presque identiques sous 0,01`,
    `[VER-22] une palette à une intensité se compare sur sa rampe`),
    `intensites.test.ts`, `nuances.test.ts`, `PAL/tests/analyse.test.ts`,
    `bilanDesPalettes.test.ts`, `paletteOuverte.test.ts`, `rapport.test.ts`,
    `presentation.test.ts`, `textes.test.ts` ;
    `tests/interface/interface.test.mjs` (les expressions qui attendent
    « ΔEok » attendent « trop proche de »).
  - Contrôle : sur la recette de l'état de galerie
    `verification-bilan-a-verifier`, le nombre de paires est rapporté et
    l'orchestrateur le compare aux 12 de DOSSIER-COMPARER.md, mesurées avec
    l'ancien moteur ; un écart s'explique par la règle de chroma, ou se
    signale.
  - Vérifier : `npm run typecheck`, `npm test --workspace ucm-couleur`,
    `npm test --workspace ucm-palettes-plugin`,
    `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert.

- [x] **M6 · Fin de vague : les garanties sur le moteur** · `implementeur`, puis `verificateur`, puis orchestrateur.
  Mesure faite : le paquet et le mode produit du banc comptent 144 promesses
  manquées, toutes G1 en Dark inversé ; G2 à G7 aucune. Reporté dans
  DECISIONS.md, section 4. Les états de bilan de la galerie suivent le moteur
  (e915511). Suite complète verte et push le 15 octobre, avec S1 et D3.
  - Protocole, écrit par l'`implementeur` :
    - `D/Mesures/garanties-regles.ts` reçoit un mode « produit » (variable
      d'environnement `MODE=produit`) qui ne juge que les garanties du
      produit : G1 à G6 contre leurs fonds de la table, la page étant le seul
      fond extérieur, et G7 contre la page et la carte. Les mesures
      supplémentaires du banc (les autres garanties contre la carte) restent
      dans le mode par défaut, compté à part.
    - `D/Mesures/verifier-implementation.ts` juge `verifierPromesses` du
      paquet sur exactement les mêmes entrées : les références, parts,
      dérives, courbes et quatre couples de texte des boutons du balayage,
      règle et table retenues, page et carte par défaut.
  - Le `verificateur` lance les deux et rend les comptes par garantie.
  - Fini quand : les deux comptes sont égaux garantie par garantie, et
    seule G1 échoue. L'orchestrateur écrit le compte obtenu dans
    DECISIONS.md, section 4, à la place de la mesure du banc.
  - Puis : suite complète, `test:ui` de Palettes, commits, push.

### Vague 3 · Palettes hors Harmonisation

Ordre suivi : P1, P2, P6 et P7 pendant que Codex fait S1 ; P3, P4 et P5,
qui touchent le socle et `socleLocalise.ts`, après l'intégration de S1, que
Codex a terminée.

Les tâches sont successives : plusieurs partagent `styles.css`, `i18n` et
`tests/interface/interface.test.mjs`.

- [x] **P1 · Le bilan de Vérification à 480 px** · `implementeur`, moyen.
  - SPEC, section 6, dernier point ; DOSSIER-COMPARER.md, section 12,
    « Le bilan à 480 px ».
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

- [x] **P2 · « Par défaut » remplace « Rétablir »** · `implementeur`, moyen.
  - C10 ; DOSSIER-COMPARER.md, section 12, « Deux sens de Rétablir » ;
    SPEC, sections 3.3 et 4.
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
    « Remettre par défaut » s'il y paraît. Les commentaires qui citent ces
    libellés (le contrat de `toutRetablir` dans `PAL/src/edition.ts`, par
    exemple) suivent.
  - Mettre à jour `build-galerie.cjs` (`chemins`), les tests d'interface et
    de textes qui cherchent ces libellés.
  - Vérifier : `npm test --workspace ucm-palettes-plugin`,
    `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert ; `git grep -n "Tout rétablir" -- packages` ne rend
    rien.

- [ ] **P3 · Les listes déroulantes du socle** · `implementeur`, moyen.
  - C10 ; SPEC, section 5, et les quatre dernières règles CSS de la section 9
    (`select`, `select.input`, `:hover`,
    `.champ-prereglage, .carte-choix select.input`). Identifiant réservé :
    `[UI-37]`, section de l'interface commune de SPEC-PAL.
  - `SOC/src/ui/socle.css` : `button, input, select { font: inherit; }` ;
    les règles `select.input` de la section 9. Le chevron prend la couleur
    `--texte-second` dans les deux thèmes : un masque CSS sur un fond
    `currentColor`, ou deux images selon le thème du socle. Ne pas coder
    `#b3b3b3` seul.
  - `PAL/src/ui/styles.css` : la règle des listes de 24 px, si elle ne vit
    pas mieux dans le socle (la règle suit la classe `.carte-choix`).
  - Ne change pas : la liste de la langue (32 px, pleine largeur).
  - Tests : `PAL/tests/interface/interface.test.mjs`,
    `[UI-37] une liste prend la police de l'interface et 24 px parmi des boutons`
    (« Teinte Tailwind » de Color shift : hauteur 24 px, corps 11 px).
    Lancer aussi `test:ui` d'Exporter et de l'explorateur, qui chargent le
    socle.
  - Vérifier : `npm test --workspace ucm-plugin-socle` et les trois `test:ui`.
  - Fini quand : vert.

- [ ] **P4 · Le bouton « Configuration » nommé** · `implementeur`, moyen.
  - C9 ; SPEC, section 4, premier point, et la règle
    `.icon-button.avec-libelle` de la section 9 ; proposition PR5.
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
  - Explorateur : rien (PR5).
  - Tests : `test:ui` de Palettes (`[ENT-21] le bouton d'en-tête dit
    Configuration`) et d'Exporter (son test qui prend `.icon-button` par
    position doit le trouver encore).
  - Vérifier : `npm test --workspace ucm-plugin-socle`, `test:ui` de
    Palettes et d'Exporter.
  - Fini quand : vert.

- [ ] **P5 · La Configuration en deux onglets** · `implementeur`, moyen.
  - C9 ; SPEC, section 4, points 2 à 5. Modèle :
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
  - Textes : SPEC, section 8, lignes « Onglets de la Configuration »,
    « Phrase Palettes », « Phrase Général ».
  - L'onglet actif se garde pendant la session ; chaque ouverture du panneau
    revient sur `Palettes`.
  - Galerie : l'état `configuration-de-la-recette` montre l'onglet Palettes ;
    ajouter `configuration-general`.
  - Tests d'interface : ceux qui cherchent « Réglages communs » ; nouveau
    `[ENT-20] la Configuration s'ouvre sur Palettes et range la langue dans Général`.
  - Vérifier : `npm test --workspace ucm-palettes-plugin`,
    `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert.

- [x] **P6 · Réglage global : la marque par défaut** · `implementeur-exigeant`, haut.
  - C8 ; SPEC, sections 2, 3.1 et 3.2 en entier, règles CSS de la section 9
    de `.reglette-defaut` à `.tete-des-reglages .btn`. Écran de référence :
    `D/Maquettes/MAQUETTE-COMPARER.html`, section 1, fonctions
    `reglagePropose`, `marquer`, `replier`, `voisine`, `eviter`.
    Identifiant réservé : `[UI-38]`, section de Création de SPEC-PAL.
  - Fichiers : `PAL/src/ui/derive/reglette.ts` (marque, libellé, bouts : des
    options de `createReglette`, pour que Color shift et Harmonisation les
    reprennent), `PAL/src/ui/reglagesDeLaPalette.ts` (« Tout par défaut »,
    valeurs par défaut, pastille, nom de l'autre profil dans
    `.fantome-du-profil`), `PAL/src/ui/ongletCreation.ts`
    (`resumeDesReglages`), `PAL/src/ui/styles.css`, `i18n` (section 8 :
    bouton, libellé, résumés, bouts, familles).
  - La classe `.pastille-reglee` existe déjà (`styles.css`) : la réemployer.
    `.bouton-discret:disabled` existe aussi.
  - Familles de teinte : constante dans un module sans DOM (par exemple
    `PAL/src/familles.ts`), testée seule :
    `[UI-38] 257° a pour voisines turquoise et violet`.
  - La saturation par défaut d'un profil est sa part commune, ou pour le
    profil qui porte la référence la saturation de la référence (SPEC,
    section 3.2, « Valeurs par défaut »).
  - Galerie : l'état `reglages-reference-modifiee` montre la carte ouverte
    avec une réglette modifiée ; ajouter `reglages-par-defaut` (rien de
    modifié, « Tout par défaut » inactif).
  - Contrôle visuel : capture de l'état contre l'écran de la maquette
    (SPEC, section 12, ancre `#r-reglage`) ; écarts admis : section 11.
  - Vérifier : `npm test --workspace ucm-palettes-plugin`,
    `npm run test:ui --workspace ucm-palettes-plugin`.
  - Fini quand : vert et capture conforme.

- [ ] **P7 · Color shift : la marque par défaut** · `implementeur`, moyen.
  - SPEC, section 3.3 ; proposition PR7. Reprend les options de réglette de
    P6. Identifiant réservé : `[DER-25]`, section de Color shift de SPEC-PAL.
  - Fichiers : `PAL/src/ui/derive/editeur.ts` (`depart` donne déjà la valeur
    par défaut de chaque grandeur : la marque la lit), `PAL/src/presentation.ts`
    (`colorShiftModifie` compare les valeurs au préréglage courant, et non
    l'origine rangée), `PAL/src/ui/ongletCreation.ts` (`resumeDeLaDerive`),
    `i18n`.
  - Tests : `[DER-25] après « Tout par défaut », chaque pouce est sur sa marque
    et chaque bouton est inactif` ; `[DER-25] une dérive d'origine Tailwind
    différente du préréglage courant compte comme modifiée`.
  - Galerie : l'état `color-shift-luminosite` montre les marques.
  - Vérifier : comme P6.
  - Fini quand : vert ; le résumé replié dit `Par défaut · synchronisé`
    quand rien n'est réglé.

- [ ] **P8 · Fin de vague** · `verificateur`, puis orchestrateur.
  - Suite complète, `test:ui` des trois plugins, commits, push.

### Vague 4 · L'onglet Harmonisation

Toutes les tâches suivent la SPEC, section 7, et la proposition PR6 ;
l'écran de référence est `D/Maquettes/MAQUETTE-COMPARER.html`, fonctions
nommées en tête de chaque sous-section. Les textes sont ceux de la section 8,
les règles CSS celles de la section 9. Le module de l'onglet est
`PAL/src/ui/ongletHarmonisation.ts`, ses cartes dans
`PAL/src/ui/harmonisation/` (un fichier par carte), son état sans DOM dans
`PAL/src/harmonisation.ts`. Les tâches sont successives : elles partagent
l'état, `styles.css`, `i18n`, `etats.cjs` et `interface.test.mjs`.

Identifiants réservés, section de l'onglet Harmonisation à créer dans
SPEC-PAL, après celle de Vérification : `[UI-39]` à `[UI-44]` pour H1 à H5
(H5 en prend deux) ; H6 prend `[VER-23]` ; S1 prend `[UI-45]`.

- [x] **S1 · Les onglets indisponibles du socle** · `implementeur`, moyen.
  - Reprise Codex à relire : [fichiers, résultats et points de raccordement](./REPRISE-CODEX-S1-D3-H5A.md#s1).
  - `SOC/src/ui/Onglets.ts` : chaque onglet peut être déclaré indisponible
    (`definirDisponible(id, disponible)`) ; un onglet indisponible porte
    `aria-disabled="true"` et `disabled`, se saute au clavier (flèches,
    Début, Fin) et refuse `selectionner`, au clic comme par programme. Quand
    l'onglet actif devient indisponible, le premier onglet disponible
    s'active. `PAL/src/ui/socleLocalise.ts` propage la fonction.
  - Tests : `SOC/tests/` (`[UI-45] un onglet indisponible ne s'active ni au
    clic, ni aux flèches, ni par programme`, et le repli) ; `test:ui` des
    trois plugins.
  - Fini quand : vert.

- [ ] **H0 · Les calculs de l'onglet** · `implementeur-exigeant`, haut.
  - SPEC, section 10 ; PR6. Code de référence :
    `D/Mesures/generer-ensembles.ts`, fonctions `distanceMin` et `tourner`
    (à ne pas porter tel quel : `tourner` refuse le retour à la couleur
    d'origine).
  - Le geste de teinte vit dans `PAL/src/edition.ts` (`reglerTeinte`). Son
    calcul de la palette réglée passe dans `packages/couleur/src/harmonisation.ts`,
    exporté par le paquet : `candidatDeTeinte(recette, palette, ecart)` rend
    la palette telle que le geste « décaler les deux profils de `ecart`
    degrés » la range, réglages nettoyés comme aujourd'hui. `reglerTeinte`
    l'appelle : le geste et le calcul des zones emploient la même fonction.
  - Trois coordonnées, nommées ainsi dans le code : l'écart commun (appliqué
    aux deux profils) ; la valeur du profil porteur ; la valeur du profil
    affiché, celle que la réglette montre. La course de l'écart commun est
    l'intersection des bornes des deux profils (chacun de −30° à +30°) et des
    limites des garanties ; une position hors course n'est pas calculée et se
    représente comme hors de la piste.
  - `zonesTropProches(recette, palette, autre)` : pour chaque degré entier
    de la course, le candidat de `palette`, `autre` immobile (ses rampes
    calculées une fois), la proximité de M5 ; rend les suites de degrés sous
    le seuil, en valeurs du profil affiché. Une palette a au plus 61
    candidats, chacun fait 4 rampes (deux profils, deux thèmes).
  - `sortieLaPlusProche(recette, palette, autre)` : le plus petit écart qui
    sort de toutes les zones dans la course, ou `null`.
  - `grisDeMemeClarte(couleur: Rgb8): Rgb8` : `Y = L³` (L d'OKLab), puis
    encodage sRGB de `Y` sur les trois canaux.
  - Tests `couleur/tests/harmonisation.test.ts` : la valeur courante d'une
    paire en alerte est dans une zone ; une paire éloignée n'a pas de zone ;
    deux profils déjà décalés différemment (Soft +25°, Vivid −20°) donnent la
    course de −10° à +5° ; le retour à l'écart 0 rend la palette d'origine ;
    la couleur d'un candidat égale celle de la palette après `reglerTeinte` ;
    une paire sans sortie rend `null` ; le gris d'un blanc est blanc, d'un
    noir est noir, et sa clarté OKLab égale celle de la couleur à 0,005 près.
  - Vérifier : `npm test --workspace ucm-couleur`,
    `npm test --workspace ucm-palettes-plugin`, `npm run typecheck`.
  - Fini quand : vert.

- [ ] **H1 · L'onglet, son état et son en-tête** · `implementeur-exigeant`, haut.
  - SPEC, sections 7.1 et 7.2 ; PR6 ; identifiant `[UI-39]`.
  - `PAL/src/ui/index.ts` : l'onglet `harmonisation` entre `verification` et
    `gestion` (liste des onglets, `PANNEAUX`, `travail.append`, inertie
    pendant un dessin) ; indisponible sous deux palettes, par S1 ; compteur
    sur le modèle de `lierLeCompteur` (`piedDeLaPalette.ts`), ton
    avertissement, nombre de `pairesTropProches`, absent à zéro.
  - `PAL/src/harmonisation.ts` : l'état de la section 7.1, en identifiants
    (PR6), et ses transitions sans DOM : cocher, décocher, cinquième refusée,
    `regler`, suppression, import et synchronisation, passage sous deux
    palettes.
  - En-tête, bascules, ligne fixe.
  - Tests : deux palettes de même nom se cochent séparément ; un renommage
    garde la sélection ; une suppression retire la palette de l'état.
  - Galerie : `harmonisation-arrivee` (écran H1 de la maquette, jeu
    « Fichier du mainteneur »).
  - Vérifier : `npm test --workspace ucm-palettes-plugin`, `test:ui`.
  - Fini quand : vert ; avec une palette, l'onglet est indisponible.

- [ ] **H2 · Cartes « Palettes trop proches » et « Vos palettes »** · `implementeur-exigeant`, haut.
  - SPEC, sections 7.4 et 7.5 ; PR6 (paire sans sortie) ;
    identifiant `[UI-40]`. Le bouton « Comparer » choisit `regler` par
    `sortieLaPlusProche` de H0 ; à égalité ou sans sortie, A.
  - Galerie : `harmonisation-paire` (écran H2).
  - Fini quand : vert ; capture conforme à H1 et H2 de la maquette.

- [ ] **H3 · Carte « Comparaison »** · `implementeur-exigeant`, haut.
  - SPEC, section 7.6 ; PR6 (intensité unique, palette libre sans
    composants) ; identifiant `[UI-41]`.
    Niveaux de gris par `grisDeMemeClarte`. Les rôles de chaque composant
    suivent la table du kit (`cranDeLaVariable`), jamais un cran écrit en
    dur.
  - Galerie : `harmonisation-niveaux-de-gris` (écran H5).
  - Fini quand : vert ; capture conforme à H4 et H5.

- [ ] **H4 · Carte « Réglages »** · `implementeur-exigeant`, haut.
  - SPEC, section 7.7 ; PR6 (palette figée, annulation) ; identifiant
    `[UI-42]`. Réemploie les réglettes et options de P6 ; la teinte passe par
    `candidatDeTeinte` (H0), saturation et luminosité par les gestes de
    Création. Les réglages se rangent par la frontière existante.
  - « Annuler les modifications » : point de départ propre à l'onglet, par
    identifiant de palette (PR6). Ne pas appeler
    `frontiere.annulerLesModifications`, dont la portée est la session du
    plugin (`ui/annulation.ts`).
  - Tests : modifier une palette dans Création, entrer dans Harmonisation,
    modifier deux palettes, annuler la première : le changement de Création
    et la seconde palette restent ; un refus de rangement restaure l'état
    visuel et le point de départ.
  - Galerie : `harmonisation-distinguee` (écran H3).
  - Fini quand : vert ; glisser la teinte hors de la zone éteint le constat
    et le compteur (test d'interface).

- [x] **H5a · Les matrices de vision des couleurs** · `chercheur`.
  - Reprise Codex à relire : [fichiers, résultats et points de raccordement](./REPRISE-CODEX-S1-D3-H5A.md#h5a).
  - Question : les matrices de simulation de la deutéranopie, de la
    protanopie et de la tritanopie de Machado, Oliveira et Fernandes (2009),
    sévérité 1,0, en RGB linéaire : valeurs exactes et source primaire (la
    page des auteurs ou l'article). Rendre les trois matrices 3 × 3 et l'URL.
  - Fini quand : trois matrices sourcées.

- [ ] **H5 · Carte « Roue des teintes », clavier** · `implementeur-exigeant`, haut.
  - SPEC, sections 7.8 et 7.9 ; identifiant `[UI-43]` (roue) et `[UI-44]`
    (clavier et accessibilité de l'onglet). Les matrices viennent de H5a,
    avec leur source en commentaire. Glisser un point passe par
    `candidatDeTeinte` ; le point d'une palette figée ne se saisit pas.
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

- [ ] **H7 · Revue au pixel et fin de vague** · `implementeur`, puis `verificateur`, puis orchestrateur.
  - Avant les captures, l'`implementeur` régénère les données de la maquette
    avec le moteur de la vague 2 et la recette des états de galerie :
    `npx tsx "D/Mesures/generer-ensembles.ts"`, puis vérifie que les couleurs
    d'un écran de la maquette et de l'état de galerie correspondant sont les
    mêmes. Sans cette étape, les deux témoins ne sont pas comparables.
  - SPEC, section 12 : capture de chaque écran H1 à H7 de la maquette et de
    l'état de galerie correspondant, à 480 px, mêmes données ; écarts admis
    de la section 11. Le `verificateur` rend un tableau des écarts ;
    l'orchestrateur corrige les petits, renvoie les autres à la tâche qui les
    a produits.
  - Suite complète, `test:ui` des trois plugins, commits, push.

### Vague 5 · Documents

| Tâche | En parallèle avec |
|---|---|
| D1 | D2 |
| D2 | D1 |
| D3 | seule |

- [ ] **D1 · AGENTS.md** · `implementeur`, moyen.
  - Sections : carte du code (`dossiers.ts`, `garanties.ts`, `recette.ts`,
    `rampe.ts`, `tailwind.ts`, `nuances.ts`, `garantie.ts`, `promesses.ts`,
    `limites.ts`, `alertes.ts`, `harmonisation.ts` du moteur ; l'onglet
    Harmonisation de Palettes ; les onglets indisponibles du socle) ;
    invariants « Moteur de couleur » : la table par thème et sens, les crans
    requis 100 à 950, G7 contre la page et la carte (la phrase
    « `elevation/raised` n'est jamais mesuré » est fausse désormais : la
    réécrire), le format 11 et la lecture des anciens formats, l'enveloppe,
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

- [x] **D3 · L'architecture de référence** · `implementeur`, moyen.
  - Reprise Codex à relire : [fichiers, résultats et points de raccordement](./REPRISE-CODEX-S1-D3-H5A.md#d3).
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
  - `D/DECISIONS.md` et `D/README.md` : statut « implémenté, recette Figma à
    faire », avec le dernier commit. Il devient « recetté » après F4.
    Mémoire de la conversation principale.

### Vague 6 · Vérification, publication, recette

- [ ] **F1 · Suite complète** · `verificateur`.
  - `npm test`, `npm run typecheck`, `npm run build`, `test:ui` des trois
    plugins. Fini quand : tout est vert.

- [ ] **F2 · Publier le kit** · `executant`.
  - Le kit ne dépend pas de la recette Figma : sa publication n'attend pas
    F4.
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
  - Ouvrir Palettes sur la recette existante : elle se lit au format 11, aux
    intensités par défaut (PR4) ; les couleurs suivent la règle retenue.
  - Parcourir Vérification (G7 contre la page et la carte, constats sans
    ΔEok), la planche (`ring` au niveau de la palette), Configuration (deux
    onglets), Réglage global et Color shift (marques), Harmonisation (paires,
    comparaison, réglages, roue).

## 7. Identifiants réservés

| Identifiant | Tâche | Objet |
|---|---|---|
| `[PLA-30]` | R2 | `ring` au niveau de la palette dans la planche |
| `[MOT-35]` | M3 | L'enveloppe de chroma |
| `[MOT-36]` | M4 | La dérive aux deux bouts |
| `[MOT-37]` | R4 | La carte déduite |
| `[REC-12]` | M2 | Le format 11 et la lecture des formats 8 à 10 |
| `[REC-13]` | M2 | Les crans requis des deux thèmes |
| `[VER-21]` | R4 | G7 contre la page et la carte |
| `[VER-22]` | M5 | L'alerte par rôle des palettes trop proches |
| `[VER-23]` | H6 | Le lien « Comparer » du bilan |
| `[ENT-20]` | P5 | La Configuration en deux onglets |
| `[ENT-21]` | P4 | Le bouton d'en-tête nommé |
| `[DER-25]` | P7 | Les marques par défaut de Color shift |
| `[UI-37]` | P3 | Les listes déroulantes |
| `[UI-38]` | P6 | Les marques par défaut de Réglage global |
| `[UI-39]` à `[UI-44]` | H1 à H5 | L'onglet Harmonisation (H5 en prend deux) |
| `[UI-45]` | S1 | Les onglets indisponibles |

Ils étaient libres à l'écriture du plan (les identifiants `[MOT-…]` allaient jusqu'à 34, les `[ENT-…]` jusqu'à 19).
Un identifiant pris entre temps se remplace par le suivant libre, dans ce
tableau d'abord.

## 8. Récapitulatif

| Vague | Tâches | Agents |
|---|---|---|
| 0 | V0.1 | verificateur |
| 1 | R1 à R5 | implementeur ×2, implementeur-exigeant ×2, verificateur |
| 2 | M0 à M6 | implementeur ×3, implementeur-exigeant ×3, verificateur |
| 3 | P1 à P8 | implementeur ×6, implementeur-exigeant ×1, verificateur |
| 4 | S1, H0 à H7 | implementeur-exigeant ×6, implementeur ×3, chercheur, verificateur |
| 5 | D1 à D4 | implementeur ×3 |
| 6 | F1 à F4 | verificateur ×2, executant, mainteneur |
