# Plan d'implémentation : les commandes Light/Dark et Soft/Vivid

## Objet et lecteur

Ce plan s'adresse à l'agent qui écrira le code, seul, sans validation
intermédiaire. Il ordonne en tâches à cocher ce que
[le dossier](./DOSSIER-COMMANDES-D-AFFICHAGE.md) a validé pour
`packages/plugin-palettes` :

1. un seul bouton Light/Dark, dans la barre de la palette, qui reste en haut
   du panneau pendant le défilement (modèle A) ;
2. les choix Soft, Vivid et Les deux dans les sections de réglage, chacun
   marqué « Régler » ou « Afficher ».

Le dossier dit **quoi**, et la
[maquette, section 4](../Texte%20des%20boutons/MAQUETTE-MODES-ET-AFFICHAGE.html)
montre le modèle A. Ce plan dit **dans quel ordre** et **par quels
fichiers**. Quand ils se contredisent, le dossier l'emporte.

Le mainteneur valide à la fin, dans Figma, avec la
[recette](#recette-du-mainteneur). Une seule case attend sa réponse : la
variante de la phase 4.

## Décision du mainteneur avant la phase 4

Le sens de « Les deux » dans le Color shift reste ouvert (section 4 du
dossier). Le mainteneur coche une case avant de lancer l'agent :

- [ ] **a. Un même réglage pour les deux profils.** « Les deux » remplace la
  case « Synchroniser Soft et Vivid » et pose `derive.lien`. Choisir Soft ou
  Vivid délie les profils.
- [ ] **b. Un écart commun.** « Les deux » déplace Soft et Vivid du même écart,
  comme dans le Réglage global, et chaque profil garde sa différence avec
  l'autre. La case « Synchroniser Soft et Vivid » reste.

Les deux variantes gardent le format 8 de la recette : `derive.lien` existe
déjà, et l'écart de b se calcule au moment du geste, sans champ nouveau.
Un écart rangé à part, ajouté au réglage de chaque profil, demanderait un
format 9 ; ce plan l'écarte.

**Avis :** b. Le mot « Les deux » garde alors le même effet dans le Réglage
global et dans le Color shift, et un choix de cible n'écrit rien dans la
recette. Avec a, cliquer sur Soft modifie la palette avant tout glisser.

**Sans case cochée,** l'agent livre les phases 1, 2, 3 et 5, puis s'arrête
avant la phase 4 et le note dans le [point de reprise](#point-de-reprise).

## Hypothèses du plan

Chaque hypothèse vient d'un point que le dossier ne tranche pas. La recette
dit au mainteneur quoi regarder, et ce tableau dit ce qui change si
l'hypothèse tombe.

| Hypothèse | Si le mainteneur la refuse |
|---|---|
| H1. Le thème reste Light à l'ouverture du plugin et ne se range nulle part, ni dans la recette ni dans `clientStorage` | Ranger le thème comme la langue, sous une clé `ucm-palettes.theme` de `src/preferences.ts` |
| H2. Le lien « Revenir au thème » ne reste que dans la carte des garanties ; la barre ne porte que Light et Dark | Ajouter le retour dans la barre, après la bascule, et mesurer la largeur à 500 px |
| H3. La carte des garanties garde deux choix, Soft et Vivid, marqués « Afficher » : chaque segment porte le résultat de son profil, et « Les deux » doublerait la liste | Ajouter « Les deux » : deux listes, une par profil |
| H4. Dans l'Interface de test, « Les deux » montre deux écrans, Soft puis Vivid, côte à côte quand la carte a la largeur de deux écrans de 270 px, empilés sinon | Montrer un seul écran avec une rangée de boutons par profil |
| H5. L'ordre des segments est Soft, Vivid, Les deux dans toutes les cartes. Le Réglage global passe de « Vivid, Soft, les deux » à cet ordre | Garder l'ordre du Réglage global partout |
| H6. La bascule Light/Dark de Gestion, qui choisit le thème des fiches, ne change pas | Lier Gestion au même état que la barre |

## Ce qui ne change pas

- La recette reste au format 8. Aucune clé n'y entre, et aucune réglette ne
  change de valeur rangée. `tests/rangement.test.ts` et
  `tests/reglages.test.ts` restent verts sans modification.
- Le thème montré ne modifie aucune palette et n'écrit rien dans Figma.
  Changer de thème n'envoie aucune demande au sandbox.
- Les planches, leurs empreintes et les variables écrites ne bougent pas.
- Les réglages propres à chaque thème restent dans les Réglages communs, en
  deux colonnes. Le texte des boutons s'y ajoutera par
  [son propre lot](../Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md),
  livrable avant ou après celui-ci.

## Avant de commencer

- [x] Lire [AGENTS.md](../../../../../AGENTS.md) : la carte de
  `packages/plugin-palettes`, puis les invariants « Langue d'UCM Palettes »
  et « Interface d'UCM Palettes ».
- [x] Lire [CONTRIBUTING.md](../../../../../CONTRIBUTING.md), sections
  « Interface du plugin », « Les surfaces d'UCM Palettes » et « Tests ».
- [x] Lire le [dossier](./DOSSIER-COMMANDES-D-AFFICHAGE.md) en entier, puis
  ouvrir la maquette section 4, modèle A, aux deux tailles.
- [x] Lire dans la
  [spécification](../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md)
  les entrées `[UI-09]`, `[UI-12]`, `[UI-14]`, `[UI-20]`, `[UI-23]`,
  `[VER-20]`, `[DER-12]` et `[DER-19]`.
- [x] Charger la skill `rediger-sans-tics-ia` avant toute phrase de document
  ou de commentaire, et `rediger-diagnostics-ucm` avant tout texte affiché au
  designer.
- [x] Dans `packages/plugin-palettes`, lancer `npm test` et
  `npm run test:ui`, et noter les deux comptes de départ dans le point de
  reprise. Une suite rouge au départ se signale au mainteneur avant toute
  tâche.

**Délégation.** Une session Claude Code qui conduit ce plan suit
[CLAUDE.md](../../../../../CLAUDE.md) : une tâche ou un groupe de tâches par
appel à `implementeur`, les commandes de vérification par `verificateur`, la
relecture du diff et le commit dans la conversation principale.

## Règles de travail

**Travail sur `main`, sans branche.** D'autres sessions modifient le même
arbre. Commiter par chemins explicites, jamais `git add -A`, et ne jamais
lancer `git stash` ni `git checkout` sur un fichier qu'on n'a pas écrit.

**Un commit par tâche,** ou par groupe de tâches qui ne se livrent pas l'une
sans l'autre ; le plan nomme ces groupes. Pousser aussitôt.

**Fin d'une tâche.** Dans `packages/plugin-palettes` : `npm run typecheck`,
`npm test`, `npm run build`, puis `npm run test:ui` dès qu'un fichier de
`src/ui/`, `src/i18n/` ou `styles.css` a changé. Un document modifié passe
`node scripts/controle-style.mjs <fichier>` et
`npx tsx --test tests/docLinks.test.ts` depuis la racine. Cocher la case ici.

**Un test par comportement.** Chaque tâche nomme ce que ses tests tiennent.
Voir chaque test nouveau rouge une fois, sur le code d'avant ou par mutation.

**Regarder avant de conclure.** Après chaque tâche d'interface, capturer
l'état de galerie concerné en thème sombre, à 600 × 720 et à 500 × 520, avec
`scripts/capturer-etats.mjs`, et le comparer au modèle A de la maquette. Le
mainteneur travaille en thème sombre.

## Point de reprise

À tenir à jour à chaque commit : tâches poussées, comptes de tests, écarts à
dire au mainteneur.

- Comptes de départ : 385 tests unitaires, 172 tests d'interface.
- Comptes actuels : 388 tests unitaires, 190 tests d'interface.
- Tâches poussées : P1.1 72a9691 ; P1.2 et P1.3 7300754 ; P2.1 à P2.3
  481098e ; P2.4 e20ca9a ; P3.1, P3.2, P3.4 et P3.5 8229b72 ; P3.3 fe0c7c3 ;
  P5.1, P5.2 et P5.5 454ac76 ; P5.3 f39b0ca, sans l'état `color-shift-les-deux`
  qui suit la phase 4. P5.4 est à moitié faite : voir la mesure ci-dessous.
- Mesure du glisser (`scripts/mesurer-glisser.mjs`), après la phase 3 : analyse
  0,95 ms, `pointermove` 3,4 ms en médiane, 5,3 ms au pire. La mesure d'avant
  P2.2 n'a pas été prise, faute d'un arbre construit à cet état : aucun écart
  ne se calcule. À reprendre après la phase 4.
- Défauts relevés sur les captures de galerie à 500 px, non attribués à ce lot
  faute de capture d'avant : l'icône ⓘ de l'encart d'invitation seule sur sa
  ligne dans `interface-de-test-les-deux`, le résumé du Color shift coupé
  (« Aucun réglage · synchroni… »), et la phrase « Référence dans Vivid… »
  coupée dans `reglages-profil-delie`.
- Le banc de galerie n'a pas de geste de défilement : `barre-fixe-defilee`
  donne le focus au dernier bouton de l'écran pour y descendre. Un vrai geste
  demanderait de toucher `plugin-socle`.
- Variante de la phase 4 : aucune case cochée, la phase 4 n'est pas faite.
  P5.1 laisse `[DER-12]` telle quelle et P5.5 laisse la section 4 du dossier
  telle quelle, jusqu'à la décision.
- Écarts à dire au mainteneur :
  1. Le Réglage global perd son cadre `bascule-de-base` et prend le style
     d'onglets `.bascule` : le fond de l'onglet actif est ainsi identique
     partout (test Y1.4).
  2. La vue « États » de l'Interface de test demande 420 px par écran au lieu
     de 270 : à 270 px, les spécimens se chevauchaient.
  3. L'Interface de test ne porte pas de ◆ sur le profil porteur, comme avant.
  4. Le Color shift écrit « Soft » et « Vivid », les noms du catalogue, au
     lieu de « soft » et « vivid ».
  5. La barre fixe porte un filet bas et une marge haute négative de 8 px.
     Avec la carte de création ouverte, le filet se trouve maintenant entre
     la barre et la carte.

## Phase 1 : le thème montré devient un état partagé

Aujourd'hui, `src/ui/nuancier.ts` porte le thème, son retour et sa bascule.
L'onglet Création l'expose par `theme`, et `src/ui/index.ts` le transmet à
Vérification. La phase range le thème dans `src/ui/paletteOuverte.ts`, que
les deux onglets lisent déjà.

- [x] **P1.1 L'état du thème.** Fichiers : `src/ui/paletteOuverte.ts`,
  `tests/paletteOuverte.test.ts`.
  - Ajouter à `PaletteOuverte` : `theme(): Mode`, `choisirLeTheme(mode)`,
    `montrerLeTheme(mode)`, `themeDAvant(): Mode | null`, `revenirAuTheme()`
    et `abonnerAuTheme(abonne): () => void`.
  - Le thème vaut `light` à la création de l'état (H1).
    `choisirLeTheme` efface le thème d'avant. `montrerLeTheme` le garde, et
    ne fait rien quand le thème demandé est déjà montré.
  - Un abonné au thème est prévenu une fois par changement effectif, jamais
    quand le thème ne change pas. Ouvrir une autre palette garde le thème.
  - Tests : thème initial, choisir, montrer puis revenir, montrer le même
    thème, nombre d'appels des abonnés, désabonnement, thème gardé à
    l'ouverture d'une autre palette.
  - Commit seul : rien ne lit encore cet état.

Les tâches P1.2 à P2.4 se livrent ensemble : entre elles, Création n'a plus de
bascule de thème. Commiter chaque tâche, mais ne pousser qu'après P2.4 et
`npm run test:ui` vert.

- [x] **P1.2 Le nuancier lit le thème.** Fichiers : `src/ui/nuancier.ts`.
  - `EntreesDuNuancier` reçoit `mode`. Retirer du nuancier l'état `mode`,
    `modeDAvant`, la bascule, le bouton de retour, `surMode`, `mode()`,
    `montrerLeTheme`, `choisirLeTheme`, `modeDAvant()` et `revenir`.
  - `tete` ne garde que le fond et sa pastille.
  - Garder `modeDuSelecteur` : un changement de thème pendant la saisie du
    fond ne détourne pas la valeur vers l'autre thème.
- [x] **P1.3 Création et Vérification lisent l'état.** Fichiers :
  `src/ui/ongletCreation.ts`, `src/ui/ongletVerification.ts`,
  `src/ui/index.ts`, `src/ui/configuration.ts` s'il lit le thème par
  l'onglet.
  - Création s'abonne au thème et se rend à chaque changement, comme
    `surMode` le faisait. Le Color shift, l'Interface de test, le repère de
    la référence et les pastilles proposées lisent `etat.theme()`.
  - Retirer `theme` de l'interface de l'onglet Création.
    `ouvrirLaPalette(id, mode)` appelle `etat.choisirLeTheme(mode)` : la
    fiche de Gestion ouvre toujours la palette dans son thème.
  - Retirer de `GestesDeLaVerification` les cinq gestes du thème. Vérification
    s'abonne au thème : actif et hors d'un geste, l'onglet se rend ; sinon il
    se marque en retard, comme pour un rendu de Création.

## Phase 2 : la barre fixe porte Light/Dark

- [x] **P2.1 La bascule dans la barre.** Fichiers :
  `src/ui/barreDePalette.ts`, `src/ui/styles.css`.
  - `createBarreDePalette` reçoit l'état partagé, ou deux gestes `theme()`
    et `choisirLeTheme(mode)`, et s'abonne au thème.
  - Poser une `.bascule` en fin de `.barre-gestes`, après le menu : rôle
    `group`, nom accessible `TEXTES.modesDeLApercu`, deux boutons
    `TEXTES.modeClair` et `TEXTES.modeSombre` avec `aria-pressed`. Un clic
    appelle `choisirLeTheme`.
  - La bascule se cache quand le menu se cache, c'est-à-dire sans palette
    ouverte. Une palette libre la garde, puisqu'elle a ses deux thèmes.
  - Aucun texte en dur : les clés existent déjà dans `src/i18n/`.
- [x] **P2.2 La barre reste en haut pendant le défilement.** Fichiers :
  `src/ui/barreDePalette.ts`, `src/ui/ongletCreation.ts`,
  `src/ui/ongletVerification.ts`, `src/ui/styles.css`.
  - Un élément `position: sticky` ne tient que dans les limites de son
    parent. Aujourd'hui la barre est placée dans `.choix-de-palette`, un bloc
    court. `placerDans` la place désormais en premier enfant de
    `.vue-de-la-palette`, qui contient toute la colonne. `.choix-de-palette`
    garde la carte de création et la note.
  - `.barre-de-palette` prend `position: sticky`, `top` à la hauteur de ce
    qui reste fixe au-dessus d'elle (lire `plugin-socle/src/ui/socle.css` :
    la règle `position: fixed` vers la ligne 489, et l'en-tête des onglets),
    un fond opaque `var(--fond)` et un `z-index` supérieur à celui des
    cartes.
  - À la position de départ, sans défilement, la barre, le filet et les
    15 px de chaque côté gardent leur place : les tests `[UI-06]` à 500 px
    passent sans changer leurs mesures.
  - La liste déroulante du sélecteur s'ouvre au-dessus des cartes quand la
    barre est collée en haut. La confirmation de suppression reste dans la
    barre.
  - La barre tient sur une ligne de 32 px à 500 px, en anglais et en
    français. Si la mesure échoue, rendre au mainteneur la largeur manquante
    sans réduire « Nouvelle palette » : ce choix lui revient.
- [x] **P2.3 La carte des garanties perd sa bascule.** Fichiers :
  `src/ui/garanties.ts`, `src/ui/ongletVerification.ts`.
  - Retirer les boutons de thème de l'en-tête. L'en-tête nomme le thème
    montré en texte, « Thème Light » ou « Thème Dark », comme `[UI-09]` le
    demande.
  - La ligne de l'autre thème garde ses deux liens : montrer ce thème, et
    « Revenir au thème » (H2). Ils appellent `montrerLeTheme` et
    `revenirAuTheme` de l'état partagé.
  - Retirer `choisirLeTheme` de `GestesDesGaranties`.
- [x] **P2.4 Les tests d'interface.** Fichier :
  `tests/interface/interface.test.mjs`.
  - Mettre à jour les vingt et une occurrences qui visent la bascule de
    l'aperçu ou celle des garanties (`.nuancier-tete .bascule`,
    « Thème Light » dans `.nuancier-tete`) : elles visent la barre.
  - Nouveaux tests, chacun vu rouge une fois :
    - `[UI-23]` la barre porte Light et Dark dans Création et dans
      Vérification. Choisir Dark dans Création montre Dark dans la carte des
      garanties, et l'inverse ;
    - `[UI-23]` à 600 × 720 et à 500 × 520, Interface de test dépliée et
      page défilée jusqu'à elle : le haut de la barre reste au haut de la
      zone visible, et choisir Dark peint `.essai-surface` du fond Dark de la
      recette sans changer `scrollY` ;
    - `[UI-23]` à 500 px, en français et en anglais : aucun défilement
      horizontal, et tous les éléments de la barre sur la même ligne ;
    - `[UI-23]` barre collée en haut, la liste du sélecteur ouverte : le point
      central de la liste appartient à la liste
      (`document.elementFromPoint`) ;
    - l'en-tête de l'aperçu et celui de la carte des garanties n'ont aucun
      bouton de thème ;
    - changer de thème n'envoie aucune demande au sandbox : l'enregistreur
      de messages reste vide après deux clics ;
    - `[VER-20]` le lien vers l'autre thème change le thème de la barre sans
      quitter Vérification, et « Revenir au thème » le rend ;
    - « Modifier » d'une fiche de Gestion en Dark ouvre Création en Dark, et
      la barre le montre.
  - Les tests `[UI-20]` restent verts sans changement.
  - Pousser P1.2 à P2.4 après `npm run test:ui` vert.

## Phase 3 : le choix du profil, commun aux cartes

- [x] **P3.1 Le composant.** Fichiers : `src/ui/choixDuProfil.ts` (nouveau),
  `src/i18n/fr.ts`, `src/i18n/en.ts`, `src/ui/styles.css`.
  - `createChoixDuProfil({ portee, options, surChoix })` rend un libellé
    puis une `.bascule` de segments. `portee` vaut `'regler'` ou
    `'afficher'` et choisit le libellé, « Régler » ou « Afficher ».
    `options` est une suite de `'soft'`, `'vivid'` et `'deux'`, rendue dans
    l'ordre Soft, Vivid, Les deux (H5).
  - Le composant expose `element`, `poser(valeur, porteur)` et `cacher(oui)`.
    `porteur` ajoute « ◆ » au segment du profil qui porte la référence, comme
    le Réglage global le fait aujourd'hui.
  - Textes : `TEXTES_DES_REGLAGES.regler` et `lesDeux` existent. Ajouter la
    clé « Afficher » aux deux catalogues ; `tests/i18n.test.ts` et
    `tests/loiDesTextes.test.ts` tiennent leur égalité.
- [x] **P3.2 Le Réglage global.** Fichier : `src/ui/reglagesDeLaPalette.ts`.
  - Remplacer les segments par le composant, portée « Régler », trois
    options. Le comportement de `poserSurLaCible` ne change pas.
  - Tests d'interface : l'ordre Soft, Vivid, Les deux, le libellé
    « Régler », le ◆ sur le porteur. Mettre à jour les tests qui comptaient
    sur l'ordre Vivid, Soft.
- [x] **P3.3 L'Interface de test.** Fichiers : `src/ui/interfaceDeTest.ts`,
  `src/ui/styles.css`, `src/i18n/fr.ts`, `src/i18n/en.ts`.
  - Remplacer `.bascule-du-profil-essaye` par le composant, portée
    « Afficher », trois options.
  - Avec « Les deux », la surface montre deux écrans, Soft puis Vivid, chacun
    titré du nom de son profil (H4). Une grille
    `repeat(auto-fit, minmax(270px, 1fr))` les place côte à côte ou les
    empile. La vue « États » suit la même règle.
  - Chaque écran garde ses propres gestes : un survol ou une case cochée dans
    l'écran Soft ne change pas l'écran Vivid.
  - Le résumé de la carte nomme les deux profils quand « Les deux » est
    choisi.
  - Changer de palette rouvre le choix sur le porteur, sauf quand « Les
    deux » est choisi : ce choix reste. Une palette à une intensité n'a pas de
    choix, comme aujourd'hui.
  - Tests d'interface : avec « Les deux », deux `.essai-surface`, chacune
    peinte du fond du thème, et le bouton principal de chacune à la couleur
    `solid` de sa rampe ; côte à côte à 1 000 px, empilés à 500 px, sans
    défilement horizontal ; Dark dans la barre repeint les deux.
- [x] **P3.4 La carte des garanties.** Fichier : `src/ui/garanties.ts`.
  - Remplacer la bascule des profils par le composant, portée « Afficher »,
    deux options (H3). Chaque segment garde son résultat, ✓ ou ✗ et un
    nombre, et son nom accessible.
  - Test d'interface : le libellé « Afficher » précède Soft et Vivid.
- [x] **P3.5 Le Color shift, sans « Les deux ».** Fichier :
  `src/ui/derive/editeur.ts`.
  - Remplacer `profils` par le composant, portée « Régler », options Soft et
    Vivid. Le nom accessible reste `TEXTES_DE_LA_DERIVE.profilRegle`.
  - La phase 4 ajoute « Les deux ». Livrée seule, cette tâche donne déjà à la
    carte le même libellé que les autres.

## Phase 4 : « Les deux » dans le Color shift

Suivre la variante que le mainteneur a cochée en tête du plan, et ignorer
l'autre.

### Variante a : « Les deux » pose le lien

- [ ] **P4a.1 Le choix remplace la case.** Fichiers :
  `src/ui/derive/editeur.ts`, `src/i18n/fr.ts`, `src/i18n/en.ts`.
  - Le composant reçoit les trois options. « Les deux » est pressé si et
    seulement si `derive.lien` est vrai. Retirer la case « Synchroniser Soft
    et Vivid » et sa clé de texte si plus rien ne la lit.
  - Choisir « Les deux » quand les deux Color shift diffèrent ouvre la
    confirmation qui existe déjà. Confirmer appelle `lierLesProfils(palette,
    true)` ; annuler garde le choix précédent et les deux profils intacts.
  - Choisir Soft ou Vivid quand le lien est posé appelle
    `lierLesProfils(palette, false)`, puis règle ce profil. Ce geste range la
    recette une fois, et Ctrl+Z le défait.
  - Une palette neuve ouvre sur « Les deux », puisque le lien est posé par
    défaut (`[DER-12]`).
- [ ] **P4a.2 Les tests.** Fichier : `tests/interface/interface.test.mjs`.
  - Une palette neuve montre « Les deux » pressé. Choisir Soft délie les
    profils et garde leurs valeurs égales. Rechoisir « Les deux » après un
    réglage de Soft demande confirmation, et l'annulation ne change rien.
    Ctrl+Z rend le lien.
  - Les tests qui cochaient la case visent le choix.

### Variante b : « Les deux » déplace les deux profils du même écart

- [ ] **P4b.1 L'écart commun.** Fichiers : `src/edition.ts`,
  `tests/reglageDeDerive.test.ts`.
  - `reglerDecalage`, `appliquerPrereglage` et `toutRetablir` acceptent la
    cible `'deux'`, du type `CibleDuReglage`.
  - Avec `'deux'`, l'écart se mesure depuis la valeur du profil porteur au
    bout réglé. Chaque profil prend sa propre valeur plus cet écart, rangée
    par `valeurRangee`. L'écart s'arrête quand l'un des deux profils atteint
    sa borne de `BORNES_DU_COLOR_SHIFT`, comme `poserSurLaCible` le fait pour
    le Réglage global.
  - La teinte se range dans `derive[profil][bout]`, la saturation et la
    luminosité par `avecLeDecalage` : appliquer l'écart par profil, avec le
    chemin de sa grandeur.
  - Le préréglage et « Tout rétablir » avec `'deux'` s'appliquent aux deux
    profils.
  - Tests : écart égal sur les deux profils pour chaque grandeur et chaque
    bout ; arrêt des deux sur la borne du premier ; un lien posé ne change
    rien au résultat ; arrondi des valeurs rangées.
- [ ] **P4b.2 La limite dynamique.** Fichiers : `src/ui/derive/editeur.ts`,
  `src/ui/calculDesLimites.ts` si la clé des limites y vit.
  - La clé des limites prend la cible au lieu du profil. Pour `'deux'`, la
    limite balaie la fonction qui applique l'écart commun : elle retient
    l'écart le plus serré des deux profils.
  - Test d'interface, sur le modèle de `[DER-19]` : glisser au-delà de la
    borne avec « Les deux » arrête la poignée sur la borne, et la ligne fixe
    nomme la cause.
- [ ] **P4b.3 Le choix dans l'éditeur.** Fichier : `src/ui/derive/editeur.ts`.
  - Le composant reçoit les trois options. Il s'ouvre sur le porteur, comme
    aujourd'hui. La case « Synchroniser Soft et Vivid » reste ; cochée, elle
    cache le choix, comme aujourd'hui.
  - Avec « Les deux », les poignées sont celles du porteur, et la courbe de
    l'autre profil suit le même écart pendant le glisser.
  - Test `[UI-20]` : glisser une poignée avec « Les deux » ne déplace pas le
    graphe d'un pixel.

## Phase 5 : documents, galerie et mesures

- [x] **P5.1 La spécification.** Fichier :
  [RECHERCHE-PLUGIN-PALETTES.md](../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md).
  - Récrire `[UI-23]` : la barre porte Light et Dark et reste en haut du
    panneau pendant le défilement.
  - Récrire `[UI-09]` et `[VER-20]` : la carte nomme le thème sans le
    choisir ; le lien vers l'autre thème et « Revenir au thème » restent.
  - Récrire `[UI-12]`, `[UI-14]` et l'entrée de la carte des garanties pour
    les libellés « Régler » et « Afficher » et l'ordre des segments.
  - Variante a : récrire `[DER-12]`. Variante b : ajouter `[DER-25]` pour
    l'écart commun.
  - Chercher « Thème Light » et « Light | Dark » dans les croquis en texte de
    l'onglet Création, et y déplacer la bascule dans la barre.
- [x] **P5.2 AGENTS.md.**
  - Carte du code : les lignes de `paletteOuverte.ts`, `barreDePalette.ts`,
    `nuancier.ts`, `garanties.ts`, `interfaceDeTest.ts` et `derive/`, et une
    ligne pour `choixDuProfil.ts`.
  - Invariant, dans « Interface d'UCM Palettes » : le thème montré ne se
    range nulle part et ne produit aucune demande au sandbox ; la barre de la
    palette reste en haut du panneau pendant le défilement. Nommer les tests
    de P2.4 qui le tiennent. Commiter avec ces tests s'ils ne sont pas encore
    poussés.
- [x] **P5.3 La galerie.** Fichiers : `galerie/etats.cjs`.
  - Ajouter trois états : `barre-fixe-defilee` (Création défilée jusqu'à
    l'Interface de test, en Dark), `interface-de-test-les-deux`, et pour la
    variante b `color-shift-les-deux`. Chacun porte son `quand` et son
    `regarder`.
  - Capturer ces états et les états existants de l'aperçu et de
    Vérification en thème sombre, aux deux tailles. Les comparer au modèle A.
- [ ] **P5.4 Les mesures.** Lancer `scripts/mesurer-glisser.mjs` avant P2.2
  et après la phase 4. Reporter les deux médianes dans le point de reprise.
  Un écart de plus de 10 % se signale au mainteneur.
- [x] **P5.5 Le dossier.** Fichiers :
  [DOSSIER-COMMANDES-D-AFFICHAGE.md](./DOSSIER-COMMANDES-D-AFFICHAGE.md) et
  [README.md](./README.md).
  - Statut : implémenté, en attente de la recette. Section 4 : la variante
    retenue. Section 5 : un renvoi vers ce plan.
  - Dans le README, remplacer « attend la décision de la phase 4 » par
    l'état livré.

## Recette du mainteneur

À faire dans Figma, avec le plugin construit, en thème sombre, aux deux
tailles de fenêtre.

| Essai | Résultat attendu | Hypothèse jugée |
|---|---|---|
| Ouvrir une palette, déplier l'Interface de test, défiler jusqu'à elle, choisir Dark dans la barre | L'écran passe en Dark sans remonter, la page ne bouge pas | Modèle A |
| Fermer et rouvrir le plugin | L'aperçu rouvre en Light | H1 |
| Dans Vérification, suivre le lien vers l'autre thème, puis revenir dans Création | Création montre ce thème ; le retour n'est offert que dans la carte des garanties | H2 |
| Lire les libellés de chaque carte | « Régler » sur le Réglage global et le Color shift, « Afficher » sur l'Interface de test et les garanties | Libellés du dossier |
| Choisir « Les deux » dans l'Interface de test, à 500 et à 600 px | Deux écrans lisibles, empilés ou côte à côte | H4 |
| Régler le Color shift avec « Les deux » | Variante a : les deux courbes se confondent. Variante b : les deux courbes bougent ensemble et gardent leur écart | Décision de la phase 4 |
| Comparer une recette exportée avant et après le lot, sans aucun réglage | Fichiers identiques | Format 8 intact |

## Fichiers touchés

| Fichier | Phases |
|---|---|
| `src/ui/paletteOuverte.ts`, `tests/paletteOuverte.test.ts` | 1 |
| `src/ui/nuancier.ts`, `src/ui/ongletCreation.ts`, `src/ui/ongletVerification.ts`, `src/ui/index.ts` | 1, 2 |
| `src/ui/barreDePalette.ts`, `src/ui/garanties.ts` | 2, 3 |
| `src/ui/choixDuProfil.ts` (nouveau), `src/ui/reglagesDeLaPalette.ts`, `src/ui/interfaceDeTest.ts` | 3 |
| `src/ui/derive/editeur.ts` | 3, 4 |
| `src/edition.ts`, `tests/reglageDeDerive.test.ts` | 4, variante b |
| `src/i18n/fr.ts`, `src/i18n/en.ts`, `src/ui/styles.css` | 2, 3, 4 |
| `tests/interface/interface.test.mjs` | 2, 3, 4 |
| `galerie/etats.cjs`, `AGENTS.md`, la spécification, le dossier et son README | 5 |

Les chemins sans préfixe sont relatifs à `packages/plugin-palettes`.
