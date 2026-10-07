# Plan d'implémentation : les commandes Light/Dark et Soft/Vivid

## Objet et lecteur

Ce plan s'adresse à l'agent qui écrira le code, seul, sans validation
intermédiaire. Il ordonne en tâches à cocher la révision que le mainteneur a
demandée après une première livraison. Il porte sur
`packages/plugin-palettes`.

La [maquette, section 4](../Texte%20des%20boutons/MAQUETTE-MODES-ET-AFFICHAGE.html)
montre la forme des choix. Les décisions ci-dessous l'emportent sur la
maquette et sur le [dossier](./DOSSIER-COMMANDES-D-AFFICHAGE.md) quand ils
diffèrent.

## Décisions du mainteneur

1. **Light/Dark dans le titre de la palette.** La bascule quitte la barre de la
   palette et rejoint la ligne du titre « Palette [nom] », calée à droite.
   Libellé « Aperçu », segments « Light » et « Dark », cerne de mise en avant
   de la maquette. Cette ligne de titre reste en haut du panneau pendant le
   défilement, dans Création comme dans Vérification. La barre de la palette
   redevient un bloc ordinaire, à sa place d'avant.
2. **« Les deux » ne reste que dans le Réglage global**, où il existait avant
   la révision. L'Interface de test revient à Soft et Vivid, un seul écran. Le
   Color shift garde Soft et Vivid, et la phase « Les deux dans le Color
   shift » est abandonnée.
3. **Une seule forme de choix pour toutes les cartes.** Chaque choix a un
   libellé puis des segments, avec les mêmes boutons et la même typographie
   partout. Il se place dans le corps de sa carte, sur une première rangée
   calée à droite. Aucun choix ne se place dans l'en-tête d'une carte.
4. **Carte repliée.** Le corps est caché, donc le choix aussi ; l'en-tête
   garde son résumé.
5. **Vérification.** La carte des garanties ne nomme plus le thème dans son
   en-tête. Elle garde la ligne de l'autre thème et ses deux liens.

Les choix concernés sont ceux qui désignent un profil, une vue ou un thème :

| Carte | Libellé | Segments |
|---|---|---|
| Titre de la palette, Création et Vérification | « Aperçu » | Light, Dark |
| Réglage global | « Régler » | Soft, Vivid, Les deux |
| Color shift | « Régler » | Soft, Vivid |
| Interface de test | « Vue » | Écran, États |
| Interface de test | « Afficher » | Soft, Vivid |
| Garanties de contraste | « Afficher » | Soft ✓ ou ✗ n, Vivid ✓ ou ✗ n |

Les segments de formulaire de `src/ui/champs.ts`, de la configuration et de
Gestion ne sont pas des choix d'affichage : ils ne changent pas.

## Ce qui ne change pas

- La recette reste au format 8. `tests/rangement.test.ts` et
  `tests/reglages.test.ts` restent verts sans modification.
- L'état du thème de `src/ui/paletteOuverte.ts` (commit 72a9691) reste tel
  quel : thème Light à l'ouverture, rangé nulle part, aucune demande au
  sandbox.
- Le Color shift garde sa case « Synchroniser Soft et Vivid ». Cochée, elle
  cache le choix « Régler ».
- La bascule Light/Dark de Gestion, qui choisit le thème des fiches, ne
  change pas.

## Avant de commencer

- [ ] Lire [AGENTS.md](../../../../../AGENTS.md) : la carte de
  `packages/plugin-palettes` et les invariants « Interface d'UCM Palettes ».
- [ ] Lire [CONTRIBUTING.md](../../../../../CONTRIBUTING.md), sections
  « Interface du plugin », « Les surfaces d'UCM Palettes » et « Tests ».
- [ ] Ouvrir la maquette, section 4, modèle A, aux deux tailles : la classe
  `.p-bascule` donne la forme d'un choix, `.p-bascule.mise-en-avant` le cerne
  de la bascule du thème.
- [ ] Charger la skill `rediger-sans-tics-ia` avant toute phrase de document
  ou de commentaire, et `rediger-diagnostics-ucm` avant tout texte affiché au
  designer.
- [ ] Dans `packages/plugin-palettes`, lancer `npm test` et
  `npm run test:ui` et noter les comptes de départ dans le point de reprise.

## Règles de travail

**Travail sur `main`, sans branche.** Commiter par chemins explicites, jamais
`git add -A`, et ne jamais lancer `git stash` ni `git checkout` sur un
fichier qu'on n'a pas écrit. Le dépôt est en fins de ligne LF.

**Délégation.** Une session Claude Code qui conduit ce plan suit
[CLAUDE.md](../../../../../CLAUDE.md) : un groupe de tâches par appel à
`implementeur`, les vérifications longues par `verificateur`, la relecture du
diff et le commit dans la conversation principale.

**Fin d'une tâche.** Dans `packages/plugin-palettes` : `npm run typecheck`,
`npm test`, `npm run build`, puis `npm run test:ui` dès qu'un fichier de
`src/ui/`, `src/i18n/` ou `styles.css` a changé. Un document modifié passe
`node scripts/controle-style.mjs <fichier>` et
`npx tsx --test tests/docLinks.test.ts` depuis la racine.

**Un test par comportement,** vu rouge une fois par mutation temporaire du
code, puis le code restauré.

**Regarder avant de conclure.** Après chaque tâche d'interface, capturer les
états de galerie concernés en thème sombre, à 600 × 720 et à 500 × 520, lire
les images, et les comparer au modèle A de la maquette.

## Point de reprise

À tenir à jour à chaque commit.

- Première livraison, avant la révision : P1.1 72a9691, P1.2 et P1.3
  7300754, barre fixe 481098e, ses tests e20ca9a, choix du profil 8229b72,
  « Les deux » dans l'Interface de test fe0c7c3, documents 454ac76, galerie
  f39b0ca. Comptes : 388 tests unitaires, 190 tests d'interface.
- Comptes de départ de la révision : à noter.
- Mesure du glisser après la première livraison : `pointermove` 3,4 ms en
  médiane, 5,3 ms au pire.

## Phase R1 : retirer ce que la révision écarte

Les tâches R1 et R2 se livrent ensemble : entre elles, aucune bascule de
thème n'est visible. Commiter chaque tâche, et ne pousser qu'après R2.3 et
`npm run test:ui` vert.

- [ ] **R1.1 « Les deux » quitte l'Interface de test.** Fichiers :
  `src/ui/interfaceDeTest.ts`, `src/ui/styles.css`,
  `tests/interface/interface.test.mjs`, `galerie/etats.cjs`.
  - Le choix « Afficher » reprend les options Soft et Vivid. Retirer les deux
    écrans, `.essai-surfaces`, `.essai-surfaces-etats`, `.essai-profil`, leur
    titre et la grille ; une seule `.essai-surface` reste.
  - Le résumé de la carte ne nomme plus deux profils. Changer de palette
    rouvre le choix sur le porteur, comme avant fe0c7c3.
  - Retirer les six tests `[UI-14]` de fe0c7c3 qui portent sur « Les deux »,
    et l'état de galerie `interface-de-test-les-deux`. Garder le test du
    libellé « Afficher », réduit à Soft et Vivid.
- [ ] **R1.2 La barre de la palette redevient ordinaire.** Fichiers :
  `src/ui/barreDePalette.ts`, `src/ui/ongletCreation.ts`,
  `src/ui/ongletVerification.ts`, `src/ui/styles.css`.
  - Retirer de la barre la bascule du thème, son abonnement, et le second
    argument de `createBarreDePalette`.
  - Retirer `position: sticky`, `z-index`, la marge négative et le
    remplissage haut de `.barre-de-palette`. La barre retrouve sa place
    d'avant 481098e : dans `.choix-de-palette`, avec le filet et les 15 px
    sous ce bloc. Vérification retrouve son `.choix-de-palette`.
  - Le test `[UI-06]` « à 500 px, la liste prend la largeur libre » reprend
    son calcul d'avant e20ca9a, sans la bascule.

## Phase R2 : la ligne du titre porte le thème et reste en haut

- [ ] **R2.1 Le composant de choix.** Fichiers : `src/ui/choixDuProfil.ts`,
  renommé `src/ui/choix.ts`, `src/ui/styles.css`.
  - `createChoix({ libelle, nom, options, surChoix, miseEnAvant })` rend un
    `.choix` : un libellé `.choix-libelle`, puis une `.bascule` de segments
    `.bascule-option`. `options` est une suite de `{ valeur, texte }`. Le
    composant expose `element`, `poser(valeur, segmentDe?)` et `cacher(oui)`.
  - `createChoixDuProfil` s'écrit au-dessus de `createChoix` et garde son
    contrat : portée, ordre Soft, Vivid, Les deux, « ◆ » sur le porteur,
    segment propre aux garanties.
  - Le style suit `.p-bascule` de la maquette : libellé au texte second,
    segments sur un fond de bloc, segment pressé au fond de la page avec un
    cerne de bordure. Une seule règle CSS porte ce style pour tous les choix.
    `miseEnAvant` ajoute le cerne de la couleur de marque.
- [ ] **R2.2 Le titre de la palette.** Fichiers : `src/ui/ongletCreation.ts`,
  `src/ui/ongletVerification.ts`, `src/ui/basculeDuTheme.ts` (nouveau),
  `src/ui/styles.css`, `src/i18n/fr.ts`, `src/i18n/en.ts`.
  - `createBasculeDuTheme(etat)` rend un `createChoix` au libellé « Aperçu »,
    segments « Light » et « Dark », `miseEnAvant`, nom accessible
    `TEXTES.modesDeLApercu`. Un clic appelle `etat.choisirLeTheme`, et la
    bascule s'abonne au thème. Ajouter les clés qui manquent aux deux
    catalogues ; `tests/i18n.test.ts` et `tests/loiDesTextes.test.ts` tiennent
    leur égalité.
  - Création : `.tete-de-la-palette` porte le titre puis la bascule, calée à
    droite. Le titre garde son ellipse. Vérification : une ligne de même
    classe porte son titre « Palette [nom] » et sa propre bascule.
  - `.tete-de-la-palette` prend `position: sticky`, `top: 0`, un fond opaque
    `var(--fond)` et un `z-index` supérieur à celui des cartes, inférieur à
    celui de la liste du sélecteur, du menu « … », du pied et de la modale. Un
    élément collant ne tient que dans son parent : la ligne doit être un
    enfant direct de `.vue-de-la-palette`. Au repos, sans défilement, la page
    ne bouge pas.
  - La ligne tient sur une ligne à 500 px, en français et en anglais.
- [ ] **R2.3 Les tests du thème.** Fichier :
  `tests/interface/interface.test.mjs`.
  - Les tests de e20ca9a qui visent `.barre-gestes .bascule` visent la ligne
    du titre. Le test de la barre collée et celui de la liste du sélecteur
    visent la ligne du titre collée : la liste ouverte depuis la barre, page
    défilée de quelques pixels, reste au-dessus de la ligne du titre
    (`document.elementFromPoint`).
  - Nouveau test : la barre de la palette n'a aucun bouton de thème et n'est
    pas collante (`position` calculée `static`).
  - Le test « changer de thème n'envoie aucune demande au sandbox » et le
    test `[VER-20]` restent, sur la nouvelle bascule.
  - Pousser R1.1 à R2.3 après `npm run test:ui` vert.

## Phase R3 : une seule forme et une seule place pour les choix

Chaque carte reçoit en tête de son corps une `.rangee-des-choix` :
`display: flex`, `justify-content: flex-end`, `flex-wrap: wrap`, un écart
commun. Elle contient le ou les choix de la carte, et se cache quand tous ses
choix sont cachés.

- [ ] **R3.1 Réglage global.** Fichier : `src/ui/reglagesDeLaPalette.ts`.
  Le choix « Régler » passe dans la rangée, première enfant du corps.
  `poserSurLaCible` ne change pas.
- [ ] **R3.2 Color shift.** Fichier : `src/ui/derive/editeur.ts`.
  Le choix « Régler » quitte `.editeur-entete` pour la rangée, au-dessus de
  l'aide. Le préréglage, la case « Synchroniser Soft et Vivid » et « Tout
  rétablir » restent dans `.editeur-entete`. La case cochée cache le choix,
  donc la rangée.
- [ ] **R3.3 Interface de test.** Fichiers : `src/ui/interfaceDeTest.ts`,
  `src/i18n/fr.ts`, `src/i18n/en.ts`.
  La bascule Écran/États devient un `createChoix` au libellé « Vue »
  (« View »), avec le nom accessible actuel
  `TEXTES_DE_L_INTERFACE_DE_TEST.vue`. La rangée porte « Vue » puis
  « Afficher ». Une palette à une intensité ne garde que « Vue ».
- [ ] **R3.4 Garanties.** Fichier : `src/ui/garanties.ts`.
  Le choix « Afficher » passe dans la rangée. Retirer le résumé « Thème
  Light » ou « Thème Dark » de l'en-tête. La ligne de l'autre thème garde ses
  deux liens.
- [ ] **R3.5 Les tests de la forme.** Fichier :
  `tests/interface/interface.test.mjs`.
  - Un test par onglet, Réglage global, Color shift et Interface de test
    dépliés, puis Vérification : chaque `.choix` est dans une
    `.rangee-des-choix`, première enfant du corps de sa carte. Le bord droit
    du dernier choix est au bord droit du contenu du corps, à 1 px près.
  - Tous les `.choix` visibles, ligne du titre comprise, ont la même hauteur
    de segment, la même taille et la même graisse de police de segment et de
    libellé, et le libellé précède les segments.
  - Aucun en-tête de carte ne contient de `.choix`.
  - Une carte repliée cache son choix et montre son résumé.
  - À 500 px, en français et en anglais : aucun défilement horizontal, et
    chaque rangée tient dans son corps.

## Phase R4 : documents, galerie et mesures

- [ ] **R4.1 La spécification.**
  [RECHERCHE-PLUGIN-PALETTES.md](../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md) :
  récrire `[UI-23]` pour la ligne du titre collée qui porte « Aperçu
  Light/Dark », `[UI-09]` et `[VER-20]` pour la carte qui ne nomme plus le
  thème, `[UI-12]` et `[UI-14]` pour la rangée des choix et l'Interface de
  test sans « Les deux », `[UI-04]` et les croquis de Création et de
  Vérification.
- [ ] **R4.2 AGENTS.md et CONTRIBUTING.md.** Carte du code :
  `barreDePalette.ts`, `choix.ts`, `basculeDuTheme.ts`, `interfaceDeTest.ts`,
  `garanties.ts`, `ongletCreation.ts`, `ongletVerification.ts`. Invariant de
  « Interface d'UCM Palettes » : la ligne du titre porte le thème et reste en
  haut ; chaque choix d'affichage est un `createChoix`, dans la rangée en tête
  du corps de sa carte. Nommer les tests de R2.3 et R3.5. Dans
  CONTRIBUTING.md, la section des surfaces d'UCM Palettes suit les mêmes
  règles.
- [ ] **R4.3 La galerie.** Fichier : `galerie/etats.cjs`. L'état
  `barre-fixe-defilee` devient `titre-fixe-defile`. Les `regarder` des états
  de l'aperçu, du Réglage global, du Color shift, de l'Interface de test et
  des garanties disent la rangée calée à droite et le libellé de chaque
  choix. Capturer ces états en thème sombre aux deux tailles, les lire, les
  comparer au modèle A.
- [ ] **R4.4 La mesure.** Lancer `scripts/mesurer-glisser.mjs` et reporter la
  médiane dans le point de reprise. Un écart de plus de 10 % avec 3,4 ms se
  signale au mainteneur.
- [ ] **R4.5 Le dossier.**
  [DOSSIER-COMMANDES-D-AFFICHAGE.md](./DOSSIER-COMMANDES-D-AFFICHAGE.md) et
  [README.md](./README.md) : statut implémenté, en attente de la recette ;
  les décisions du mainteneur ; la question « Les deux dans le Color shift »
  close.

## Recette du mainteneur

À faire dans Figma, avec le plugin construit, en thème sombre, aux deux
tailles de fenêtre.

| Essai | Résultat attendu |
|---|---|
| Ouvrir une palette, déplier l'Interface de test, défiler jusqu'à elle, choisir Dark dans la ligne du titre | L'écran passe en Dark, la page ne bouge pas, le titre reste en haut |
| Défiler en haut de Création | La barre de la palette défile avec la page |
| Ouvrir la liste des palettes, page légèrement défilée | La liste passe au-dessus du titre et des cartes |
| Parcourir Réglage global, Color shift, Interface de test et Garanties | Chaque choix est en haut du corps, calé à droite, avec la même forme |
| Replier une carte | Le choix disparaît, le résumé reste |
| Dans Vérification, suivre le lien vers l'autre thème, puis revenir | La bascule du titre suit, « Revenir au thème » le rend |
| Comparer une recette exportée avant et après le lot, sans réglage | Fichiers identiques |

## Fichiers touchés

| Fichier | Phases |
|---|---|
| `src/ui/interfaceDeTest.ts` | R1, R3 |
| `src/ui/barreDePalette.ts` | R1 |
| `src/ui/ongletCreation.ts`, `src/ui/ongletVerification.ts` | R1, R2 |
| `src/ui/choix.ts`, `src/ui/basculeDuTheme.ts` (nouveaux) | R2 |
| `src/ui/reglagesDeLaPalette.ts`, `src/ui/derive/editeur.ts`, `src/ui/garanties.ts` | R3 |
| `src/i18n/fr.ts`, `src/i18n/en.ts`, `src/ui/styles.css` | R1, R2, R3 |
| `tests/interface/interface.test.mjs`, `galerie/etats.cjs` | R1 à R4 |
| `AGENTS.md`, `CONTRIBUTING.md`, la spécification, le dossier et son README | R4 |

Les chemins sans préfixe sont relatifs à `packages/plugin-palettes`.
