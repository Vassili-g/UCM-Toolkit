# Plan d'implémentation : la recette v8

## Objet et lecteur

Ce plan s'adresse à la conversation principale qui l'exécute,
l'orchestrateur, et aux agents auxquels elle confie chaque tâche. Il applique
le [dossier de la recette v8](./DOSSIER-RECETTE-V8.md), sections 4 à 6, et
ses décisions D1 à D4. Une question que le plan ne tranche pas arrête la
tâche, qui la rend à l'orchestrateur.

Le plan suit une règle : Poppy revient d'abord. La phase A ne contient que ce
qui mène à la réparation de Poppy dans Figma ; le reste du dossier attend la
phase B. Pour raccourcir ce chemin, le plan sépare deux lots du dossier :

- le lot 2 en **2a**, le regroupement pur, nécessaire à la reprise de Poppy,
  et **2b**, la ligne groupée de Gestion, qui ne l'est pas ;
- le lot 3b en **3b-socle**, la reprise groupée sous un identifiant donné,
  et **3b-geste**, « Modifier dans le plugin » sur une ligne groupée.

Le lot 3c n'a besoin que de 2a et du socle de 3b.

## Qui fait quoi

| Rôle | Modèle | Effort | Ce qu'il fait |
|---|---|---|---|
| Orchestrateur | Conversation principale | — | Lance les tâches, relit chaque diff contre son critère, écrit D3, conçoit les maquettes, commite |
| `executant` | Haiku | bas | Remplacement mécanique à résultat unique |
| `implementeur` | Sonnet | bas, moyen ou élevé selon la tâche | Une tâche par appel, sur une spécification fermée |
| `implementeur-exigeant` | Sonnet | élevé | Une tâche qui touche plusieurs lecteurs d'une même règle |
| `verificateur` | Haiku | bas | Les commandes de vérification, rendues en tableau |

L'effort se passe à chaque appel (`effort`), tel que la tâche le donne.
**Bas** : changement local, sans choix. **Moyen** : un module et ses tests
sur une spécification fermée. **Élevé** : plusieurs lecteurs d'une même
règle, ou un problème dont la solution n'est pas écrite.

Chaque appel reçoit : l'identifiant de la tâche, le chemin de ce plan et du
dossier, la section du dossier qui le concerne, la liste des fichiers et le
critère « Fini quand ». L'agent ne lit pas le dossier en entier : la section
citée suffit. Un agent qui doit toucher un fichier hors de sa liste s'arrête
et rend la question.

## Règles d'économie

- Deux agents au plus en même temps ; les vagues ci-dessous le respectent.
- Un `verificateur` par vague, pas un par tâche : l'`implementeur` lance
  lui-même les tests de son module, le `verificateur` lance la suite entière.
- L'orchestrateur relit le diff (`git diff -- <chemins>`), pas les fichiers
  entiers.
- Aucune tâche de quelques lignes n'est déléguée à un agent plus cher que
  `executant`.

## Règles de l'exécution

- Travailler sur `main`, sans branche. Commiter par chemins explicites avec
  `-- <chemins>`, jamais `git add -A` : d'autres sessions travaillent dans le
  dépôt.
- Avant chaque commit, comparer les fins de ligne au contenu de `HEAD` : les
  agents réécrivent parfois en CRLF un fichier en LF.
- Lancer `npm run test:ui --workspace ucm-palettes-plugin` avant chaque push.
- Avant un essai dans Figma, `npm run build --workspace ucm-palettes-plugin` :
  la galerie et `test:ui` ne reconstruisent que `ui.html`.
- Ne pas toucher : `docs/notes/Recherches/Direction artistique/*` et
  `docs/notes/Recherches/Archi Tokens Multi-marques/Collection usage/*`.

## Textes destinés au designer

Arrêtés ici ; aucun agent n'en écrit d'autres.

| Où | Français | Anglais |
|---|---|---|
| Carte d'un cadre orphelin, lot 3c | Reprendre depuis les variables | Restore from variables |
| Ligne groupée de Gestion, lot 2b | Soft et Vivid, Light et Dark ; Soft et Vivid ; Light et Dark | Soft and Vivid, Light and Dark ; Soft and Vivid ; Light and Dark |
| Barre de la palette, lot 4 | Annuler les modifications ; Rétablir | Revert changes ; Redo |
| Bouton de synchronisation, lot 6 | Synchroniser avec les tokens Figma | Sync with Figma tokens (D5) |

Le mainteneur a validé ces libellés, anglais compris.

## Phase A. Poppy revient

Chemin critique : T1 et T2 en parallèle, puis T3, T4, D3, puis T5 et T6 en
parallèle, puis la vérification et l'essai dans Figma.

### Vague 1

- [x] **T1 · Lot 1** · `implementeur`, effort **bas**. « Annuler la
  reprise » quitte l'encart (D1).
  - Fichiers : `packages/plugin-palettes/src/ui/ongletCreation.ts`
    (`rendreLaReprise`), `src/i18n/fr.ts` et `src/i18n/en.ts`
    (`TEXTES_DE_LA_REPRISE.annuler`), l'inventaire des textes, la galerie et
    les tests de l'onglet.
  - Fini quand : le bouton, son texte dans les deux langues et son écouteur
    ont disparu ; l'encart garde titre, comparaison, choix « Recalculées ·
    Telles quelles » et phrase de la mise à jour ; aucun bouton de l'onglet
    Création n'appelle `confirmerLaSuppression()` sans confirmation ; les
    tests de l'onglet passent.
  - Commit : `fix(palettes): « Annuler la reprise » ne retire plus la palette`.

- [x] **T2 · Lot 3a, la mesure** · `implementeur`, effort **élevé**. Les
  réglages se reconstruisent-ils depuis les rampes ?
  - Fichiers : nouveau dossier `docs/notes/Recherches/Plugin Palettes/Recette v8/Mesures/`
    (script `mesurer-reconstruction.mjs`, résultats `RESULTATS.md`). Lecture
    seule du moteur `packages/couleur`. Aucun fichier du plugin.
  - Spécification : dossier, section 4, « 3a ». Trente palettes à deux
    intensités, réglages tirés avec une graine fixe (référence, Réglage
    global, Color shift, palette de base) ; le moteur calcule leurs rampes ;
    une recherche retrouve des réglages qui les reproduisent ; le script rend
    par palette l'écart maximal en hexa, et le total des palettes à écart nul.
  - Borne : un seul appel. Si la recherche n'aboutit pas dans l'appel,
    l'agent rend ce qu'il a mesuré et pourquoi : la reconstruction n'est
    alors pas montrée exacte, et D3 fige les couleurs.
  - Fini quand : `node <script>` rend le tableau, reproductible ; les
    résultats sont rangés.

### Vague 2, dès que T1 a rendu

- [x] **T3 · Lot 2a** · `implementeur`, effort **moyen**. Le regroupement
  pur des groupes d'une même palette (D2).
  - Fichiers : `packages/plugin-palettes/src/variables/detection.ts` et ses
    tests. Aucun fichier de l'interface.
  - Spécification : dossier, section 4, lot 2, premier paragraphe et table
    des trois formes. Une fonction pure, appelée après `palettesDuFichier`,
    rend pour chaque palette groupée sa racine, sa forme et ses groupes ; les
    groupes non regroupés passent inchangés.
  - Fini quand : les variables écrites par le plugin pour une palette à deux
    intensités, thèmes dans le chemin, donnent une seule palette ; trois
    groupes sur quatre en donnent trois ; deux groupes de nuances différentes
    ne se regroupent pas ; la casse et l'ordre des segments sont ignorés ;
    `SEUIL_DE_PALETTE` s'applique à chaque groupe.

L'orchestrateur relit et commite T1 dès son retour, sans attendre la vague :
le correctif empêche une autre perte.

### Vague 3, dès que T3 a rendu

- [x] **T4 · Lot 3b-socle** · `implementeur-exigeant`, effort **élevé**. La
  reprise groupée sous un identifiant donné.
  - Fichiers : `packages/plugin-palettes/src/edition.ts`
    (`reprendreDuFichier`), `src/variables/reprise.ts` (`suiviDeLaReprise`,
    `origineDeLaReprise`), `src/ecriture/variables.ts`
    (`reprendreLaPalette`), `src/messages.ts`, tests.
  - Spécification : dossier, section 4, « 3b ». La source envoyée au sandbox
    désigne la racine et la forme ; le sandbox relit les groupes lui-même
    ([VAR-13]). `reprendreDuFichier` accepte un identifiant facultatif :
    absent, il en crée un, comme aujourd'hui ; présent, la palette prend cet
    identifiant. Le suivi range chaque variable sous sa clé du plan
    (`soft/light/600`…). Les couleurs passent par une seule fonction,
    `couleursDeLaReprise`, qui garde pour l'instant le comportement d'une
    reprise d'un groupe ; T5 la remplit.
  - Fini quand : une reprise des quatre groupes d'une palette du plugin rend
    une palette à deux intensités dont le suivi ne renomme rien à la mise à
    jour ; une reprise d'un seul groupe se comporte comme avant.

**Décision D3, par l'orchestrateur.** Il lit `RESULTATS.md` de T2, écrit la
décision et ses chiffres dans le dossier, section 4, « 3a », et commite la
mesure : `docs(recherches): la mesure de la reconstruction des réglages`.
Écart nul sur les trente palettes : T5 reconstruit. Sinon : T5 fige.

> Fait : écart nul sur les trente palettes, mais 2 à 40 s par
> palette et des cas non mesurés. Le mainteneur a choisi de figer d'abord ;
> la reconstruction devient la tâche T18 de la phase B.
> T9 fait : Poppy est revenue figée, sans réglages ; T18 passe en tête de la
> phase B.

### Vague 4, dès que T4 et D3 sont faits

- [x] **T5 · Lot 3b, les couleurs** · selon D3 :
  - **Si D3 fige** · `implementeur-exigeant`, effort **élevé**. Le format 10.
    - Fichiers : `packages/couleur/src/recette.ts` (`FORMAT_RECETTE`, la
      validation de `figees`), ses tests, la spécification (section de la
      recette et de sa lecture), `packages/plugin-palettes/src/edition.ts`
      (`couleursDeLaReprise`, la lecture de `figees` aux lignes qui
      l'utilisent), `src/i18n/fr.ts` (règles de `figees`).
    - Spécification : dossier, section 4, paragraphe après « 3a ».
      `figees` prend la forme `{ soft, vivid }` sur une palette sans
      `intensites: 1` ; la forme d'une intensité ne change pas. Une recette 9
      se lit telle quelle ; un plugin plus ancien lit 10 comme `future`
      ([REC-03]).
    - Fini quand : une palette reprise à deux intensités garde les couleurs
      du fichier à l'hexa près ; la recette 9 des tests se lit sans
      changement ; les tests de `packages/couleur` et du plugin passent.
  - **Si D3 reconstruit** · `implementeur`, effort **moyen**. La
    reconstruction quitte le script de T2 pour un module testé du moteur,
    appelé par `couleursDeLaReprise`. Aucun changement de format.
    - Fini quand : la palette reprise rend les rampes du fichier à l'hexa
      près sur les palettes de la mesure.

- [x] **T6 · Lot 3c** · `implementeur`, effort **moyen**, en parallèle de T5.
  « Reprendre depuis les variables » sur la carte d'un cadre orphelin.
  - Fichiers : `packages/plugin-palettes/src/ui/ongletGestion.ts` (carte
    « Palette supprimée du plugin »), `src/i18n/fr.ts`, `src/i18n/en.ts`,
    l'inventaire des textes, la galerie, les tests de l'onglet ; un état de
    test qui reproduit Poppy : cadre orphelin, suivi `liaison: 'reprise'` à
    l'identifiant du cadre, quatre groupes `Poppy/<intensité>/<thème>`.
  - Spécification : dossier, section 4, « 3c ». Le geste ne s'affiche que si
    le suivi porte une liaison de reprise à l'identifiant du cadre et si ses
    variables sont encore dans le fichier. Il appelle la reprise groupée de
    T4 avec l'identifiant du cadre et le nom lu dans le chemin. Il n'écrit
    ni variable ni cadre.
  - Fini quand : sur l'état de test, le geste rend une palette sous
    l'identifiant du cadre ; la carte orpheline et les lignes « Déjà dans le
    fichier » de ses groupes disparaissent ; une palette créée par le plugin
    (liaison `destination`) ne montre pas le geste.

### Vague 5. Vérifier, livrer, essayer

- [x] **T7** · `verificateur`, effort **bas**. `npm test`, `npm run
  typecheck`, `npm run test:ui --workspace ucm-palettes-plugin`, puis `npm
  run build --workspace ucm-palettes-plugin`.
- [x] **T8** · Orchestrateur. Après T6, ajoute au test de l'état de Poppy la
  vérification que la palette reprise est « À jour » sans écriture, si T5 ne
  l'a pas couverte ; relit les diffs ; commite T4, T5 et T6 séparément ;
  pousse.
- [x] **T9 · Recette de Poppy, le mainteneur.** Recharger le plugin dans
  Figma, onglet Gestion, carte de Poppy, « Reprendre depuis les variables ».
  Attendu : Poppy revient sous son identifiant, à deux intensités, « À jour »,
  son cadre rattaché, plus aucune ligne « Déjà dans le fichier » pour elle.
  Le geste n'écrit rien dans les variables.

## Phase B. Le reste de la recette

Commence après T9, par la vague 6 bis. Les vagues gardent deux agents au
plus.

### Vague 6

- [x] **T10 · Lots 2b et 3b-geste** · `implementeur`, effort **moyen**. La
  ligne groupée de Gestion et « Modifier dans le plugin » sur elle.
  - Fichiers : `ui/ongletGestion.ts` (liste « Déjà dans le fichier »), i18n,
    galerie, tests.
  - Fini quand : une palette groupée tient une ligne qui montre sa racine et
    ce qu'elle regroupe ; « Modifier dans le plugin » sur cette ligne appelle
    la reprise groupée de T4 sans identifiant.

- [x] **T11 · Lot 4, la logique** · `implementeur-exigeant`, effort
  **élevé**. État d'ouverture, annulation, rétablissement, pile de la session.
  - Fichiers : `ui/frontiere.ts` et ses tests. Aucun changement du format.
  - Spécification : dossier, section 4, lot 4, points 1 à 4, en logique
    pure : l'état d'ouverture par palette, le premier vu dans la session ;
    « Annuler les modifications » range la recette avec la palette remise
    dans cet état, par le chemin d'un réglage, un refus [REC-10] restant un
    refus ; « Rétablir » jusqu'au réglage suivant ; la pile des recettes
    rangées, vidée par un rangement venu d'ailleurs.
  - Fini quand : après trois réglages, l'annulation rend la recette de
    l'ouverture ; « Rétablir » rend celle d'avant ; reculer après une
    suppression rend la palette sous son identifiant ; les autres palettes et
    les Réglages communs ne bougent pas.

### Vague 7

- [x] **T12 · Lot 4, l'interface** · `implementeur`, effort **moyen**.
  - Fichiers : `ui/barreDePalette.ts`, `ui/ongletCreation.ts`, i18n,
    galerie, tests de l'onglet.
  - Fini quand : la barre montre « Annuler les modifications » dès que la
    palette diffère de son état d'ouverture, loin de « Supprimer » ;
    « Rétablir » après le geste ; Ctrl+Z et Ctrl+Maj+Z hors d'un champ de
    saisie appellent la pile de T11.

- [x] **T13 · Lot 5** · `implementeur`, effort **moyen**. La progression à
  la place du bouton.
  - Fichiers : `ui/ongletGestion.ts` (`afficherDessin`, `zoneDuResultat`),
    `ui/styles.css`, galerie, `test:ui`.
  - Fini quand : `progressionDuDessin` a disparu ; le bouton de la palette en
    cours montre la progression, désactivé, de même largeur ; « Tout mettre à
    jour » porte « Palette 2 sur 5 » ; l'annonce reste dans une région
    `role="status"` masquée à l'œil ; `test:ui` mesure la position de la
    liste avant et pendant un dessin, sans écart.

### Vague 8

- [x] **T14 · Lot 6** · `executant`, effort **bas**. Le libellé `synchroniser` dans `i18n/fr.ts` et
  `i18n/en.ts`. Le `verificateur` de la vague 9 capture le bouton à la
  largeur minimale ; s'il déborde, l'orchestrateur décide du correctif dans
  `ui/connexion.ts`.
- [x] **T15 · Lot 7** · `executant`, effort **bas**. Un écart pris dans
  l'échelle d'espacement de `ui/styles.css` sous les pastilles `solid`,
  `surface` et `page` de l'aperçu (`ui/nuancier.ts`).

### Vague 9

- [x] **T16** · `verificateur`, effort **bas**. La suite de T7, plus la
  capture des états de Gestion et de Création
  (`scripts/capturer-etats.mjs`). L'orchestrateur relit, commite chaque lot,
  pousse.

### Vague 6 bis. Poppy retrouve ses réglages, en tête de la phase B

T9 a ramené Poppy figée, sans réglages. Le mainteneur veut retrouver ses
réglages : cette vague passe avant toutes les autres de la phase B. T18a
tourne en parallèle de T10.

- [ ] **T18a · Reconstruction, le moteur** · `implementeur-exigeant`,
  effort **élevé**. La recherche de `Mesures/mesurer-reconstruction.mjs`
  devient `packages/couleur/src/reconstruction.ts`, testée.
  - Entrée : la recette (ses Réglages communs), la liste des nuances et les
    couleurs figées, à une ou deux intensités. Sortie : les réglages trouvés,
    l'écart maximal en hexa et le nombre de couleurs qui diffèrent.
  - Elle ne fige pas l'interface : elle rend la main régulièrement, rapporte
    sa progression et s'arrête sur demande.
  - Fini quand : les palettes rapides de la mesure se reconstruisent à écart
    nul ; une couleur retouchée à la main donne un écart non nul, sans
    erreur ; la recherche d'une palette prend moins d'une minute.
- [ ] **T18b · Reconstruction, le geste** · `implementeur`, effort
  **moyen**, après T18a.
  - L'encart de reprise d'une palette figée porte « Retrouver les
    réglages ». Pendant la recherche, le bouton montre « Recherche des
    réglages… », désactivé.
  - Écart nul : la recette se range avec les réglages trouvés à la place des
    couleurs figées, par le chemin d'un réglage. La palette garde son
    identifiant, son nom et ses nuances, et reste « À jour » sans écriture.
    Texte : « Réglages retrouvés. Aucune couleur ne change. »
  - Écart non nul : « Réglages approchés : N couleurs changeraient. » et
    « Appliquer ces réglages ». La palette reste figée tant que le designer
    n'applique pas.
  - Aucun réglage trouvé : « Aucun réglage ne reproduit ces couleurs. »
  - La bascule « Recalculées » d'une palette figée à deux intensités garde
    ses deux intensités. Aujourd'hui elle rend une palette à une intensité,
    tirée de Soft.
  - Fini quand : sur l'état de Poppy figée de la galerie, le geste rend la
    palette réglée, « À jour » sans écriture ; les trois issues ont un test.

Anglais : « Recover settings », « Searching for settings… », « Settings
recovered. No color changes. », « Approximate settings: N colors would
change. », « Apply these settings », « No settings reproduce these colors. »

### Vague 10. Les maquettes

- [x] **T17 · Lots 8 et 9** · Orchestrateur. Deux pages HTML simples à côté
  du dossier, sans adaptation à la largeur. Chacune reproduit d'abord l'écran
  actuel tel que la galerie le rend, puis montre les propositions du dossier,
  section 4, lots 8 et 9. Le `verificateur` lance la capture de la galerie
  dont la maquette part. Les décisions qui en sortent appartiennent au
  mainteneur.

## Récapitulatif des appels

| Tâche | Agent | Effort | Phase |
|---|---|---|---|
| T1 | `implementeur` | bas | A |
| T2 | `implementeur` | élevé | A |
| T3 | `implementeur` | moyen | A |
| T4 | `implementeur-exigeant` | élevé | A |
| T5 | `implementeur-exigeant` (fige) ou `implementeur` (reconstruit) | élevé ou moyen | A |
| T6 | `implementeur` | moyen | A |
| T7 | `verificateur` | bas | A |
| T10 | `implementeur` | moyen | B |
| T11 | `implementeur-exigeant` | élevé | B |
| T12 | `implementeur` | moyen | B |
| T13 | `implementeur` | moyen | B |
| T14 | `executant` | bas | B |
| T15 | `executant` | bas | B |
| T16 | `verificateur` | bas | B |
| T18a | `implementeur-exigeant` | élevé | B |
| T18b | `implementeur` | moyen | B |

Phase A : six appels d'implémentation et un de vérification avant l'essai de
Poppy. D3, T8, T9 et T17 ne passent par aucun agent.
