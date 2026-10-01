# Plan d'implémentation : la direction simple d'UCM Palettes

## Objet et lecteur

Ce plan s'adresse à l'agent qui écrira le code, seul, sans validation
intermédiaire. Il ordonne en une liste de tâches tout ce que
[la direction simple](./PLAN-DIRECTION-SIMPLE.md) change dans
`packages/plugin-palettes` : trois onglets, Création, Vérification et Gestion,
l'écriture des palettes dans les variables de Figma, et la reprise des
palettes que le fichier porte déjà.

La direction dit **quoi** et ses [maquettes](./MAQUETTES-DIRECTION-SIMPLE.html)
montrent **à quoi ça ressemble**. Ce plan dit **dans quel ordre** et **par
quels fichiers**. Quand ils se contredisent, la direction l'emporte sur ce
plan, et la section 6 de la direction, « Ce qui est validé », sur ses autres
sections.

Le mainteneur valide à la toute fin, dans Figma, avec la recette de la
phase 10. Aucune case de ce plan n'attend sa réponse.

## Avant de commencer

- [ ] Lire [AGENTS.md](../../../../../../AGENTS.md), puis
  [CONTRIBUTING.md](../../../../../../CONTRIBUTING.md), sections « Interface du
  plugin » et « Tests », puis la direction simple en entier.
- [ ] Ouvrir les maquettes dans un navigateur. Chaque phase cite les siennes.
  Les règles préfixées `m-` de `generer-maquettes-direction-simple.mjs`
  donnent les valeurs de mise en page à reprendre dans `styles.css`, sous
  des noms de classe français sans préfixe.
- [ ] Charger la skill `rediger-sans-tics-ia` avant toute phrase de document
  ou de commentaire, et `rediger-diagnostics-ucm` avant tout texte affiché au
  designer.
- [ ] Lancer `npm test` et `npm run test:ui` dans `packages/plugin-palettes` :
  noter le compte de départ, 252 tests unitaires et 159 tests d'interface le
  jour où ce plan est écrit.

**Travail sur `main`.** Un commit par tâche ou par groupe de tâches qui ne se
livrent pas l'une sans l'autre, poussé aussitôt. Aucune branche.

**Fin d'une tâche.** Dans `packages/plugin-palettes` : `npm run typecheck`,
`npm test`, `npm run build`, puis `npm run test:ui` dès qu'un fichier de
`src/ui/` ou `styles.css` a changé. Un document modifié passe
`node scripts/controle-style.mjs <fichier>` et
`npx tsx --test tests/docLinks.test.ts`. Un invariant nouveau entre dans
AGENTS.md dans le même commit que le test qui le tient. Un écran nouveau
entre dans `galerie/etats.cjs` dans le même commit. Cocher la case ici.

**Regarder avant de conclure.** Après chaque tâche d'interface, capturer
l'état de galerie concerné en thème sombre, à 560 × 760 et à la taille
minimale, et le comparer à sa maquette. Le mainteneur travaille en thème
sombre.

**Un test par comportement.** Chaque tâche nomme ce que ses tests tiennent.
Un test nouveau est vu rouge une fois, sur le code d'avant ou par mutation.

**Ce que l'agent ne peut pas faire.** Les essais R1 à R10 de la direction se
font dans Figma. Le code se construit sur l'hypothèse écrite dans la tâche, et
la recette de la phase 10 dit au mainteneur quoi vérifier et ce qui change si
l'hypothèse est fausse.

## Arbitrages

| Point | Ce que ce plan retient |
|---|---|
| S14, la planche liée aux tokens | Non : la question reste ouverte et la recommandation s'applique. Aucune tâche ne lie une pastille à une variable |
| Noms internes des onglets | Aujourd'hui `palettes` désigne Création et `planche` désigne l'onglet Palettes. La phase 1 les renomme `creation`, `verification`, `gestion`, fichiers, identifiants DOM et tests compris, avant tout changement de comportement |
| Format de la recette | Le format 7 tient jusqu'à la phase 8. « Telles quelles » y ajoute des couleurs figées : format 8, sans conversion, comme le prévoit la réponse R2 du plan d'intégration de l'architecture. Une recette de format 7 est alors refusée |
| Où se range la destination | Dans le suivi des variables, clé partagée `ucm_palettes/variables`, jamais dans la recette : un export de recette reste indépendant du fichier |
| La ligne « Tokens » avant la phase 5 | Le bloc « Connexion à Figma » et les fiches n'affichent leur ligne des tokens qu'à la phase 5. Les phases 2 et 3 livrent un plugin utilisable, avec la seule ligne des planches |
| Bibliothèques distantes | Phase 9, la dernière avant la clôture : elle demande une permission au manifest et repose sur l'essai R10. Elle se retire seule si l'essai échoue |
| Textes | Chaque texte nouveau entre dans `src/i18n/fr.ts` et `src/i18n/en.ts` dans le même commit. Les mots français sont ceux des maquettes |
| Plugins séparés | Rien ne s'importe de `plugin-explorateur`. Ce qui sert aux deux va dans `packages/plugin-socle` ou `packages/couleur` |

## Phase 1 : la spécification et les noms

Maquettes : aucune. Cette phase ne change aucun comportement.

- [x] **P1.1** Spécification
  ([RECHERCHE-PLUGIN-PALETTES.md](../../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md)),
  section 13 : réécrire « Fenêtre et onglets » et « Écrans » pour les trois
  onglets, d'après les sections 2 et 3 de la direction. Garder les numéros
  `[UI-xx]`, `[VER-xx]` et `[PLA-xx]` qui restent vrais ; un comportement
  nouveau prend le numéro suivant de sa série. Créer une série `[VAR-xx]` pour
  l'écriture des variables, section 4 de la direction, et une section
  « Sortie 2 : les variables » à côté de « Sortie 1 : la planche ».
- [x] **P1.2** Spécification, section 14.3 : l'invariant « aucun fichier de
  `src/` n'appelle `figma.variables` » devient « seuls
  `src/ecriture/variables.ts` et `src/lectureDesVariables.ts` l'appellent ».
- [ ] **P1.3** Renommer, sans changer une ligne de comportement :
  `src/ui/ongletPalettes.ts` en `ongletCreation.ts`, `ongletPlanche.ts` en
  `ongletGestion.ts`, leurs fabriques et leurs types ; les identifiants
  d'onglet `palettes` et `planche` de `src/ui/index.ts` en `creation` et
  `gestion`, donc `#onglet-creation`, `#panneau-creation`, `#onglet-gestion`,
  `#panneau-gestion`. Remplacer ces identifiants dans
  `tests/interface/interface.test.mjs`, `galerie/etats.cjs`, `scripts/` et le
  générateur des maquettes. Mettre à jour la carte du code d'AGENTS.md.
  Les tests passent au même compte qu'au départ.

## Phase 2 : Création et Vérification

Maquettes : M1, M2, M8, M4.

L'état que les deux onglets partagent vit aujourd'hui dans
`ongletCreation.ts` : la recette affichée, la palette ouverte, l'état du geste
en cours. Vérification lit le même état. La phase l'extrait d'abord, puis
construit dessus.

- [ ] **P2.1** Créer `src/ui/paletteOuverte.ts` : la recette affichée,
  l'identifiant de la palette ouverte, l'analyse de cette palette, et une
  liste d'abonnés prévenus à chaque rendu complet. `ongletCreation.ts` y range
  ce qu'il gardait en variables locales et s'y abonne. Pur de tout DOM, donc
  testé par `tests/paletteOuverte.test.ts` : un abonné reçoit la palette
  ouverte après un changement de palette, après une saisie validée, et rien
  pendant un rendu d'aperçu (`apercuSeul`).
- [ ] **P2.2** Sortir la barre de `ongletCreation.ts` vers
  `src/ui/barreDePalette.ts` : la liste déroulante, « Nouvelle palette », le
  menu, la confirmation de suppression. Une seule instance : elle se déplace
  dans le panneau de l'onglet actif, Création ou Vérification, au changement
  d'onglet. Aucun élément ne se reconstruit. Depuis Vérification, « Nouvelle
  palette » passe d'abord à Création. Test d'interface : la barre garde sa
  palette et son état ouvert ou fermé d'un onglet à l'autre.
- [ ] **P2.3** Le verdict de chaque palette. `src/presentation.ts` reçoit
  `verdictDeLaPalette(analyse)` : `danger` dès qu'une garantie manque,
  `avertissement` dès qu'un message de sévérité alerte existe, `succes`
  sinon ; une palette libre est `succes`. `paletteOuverte.ts` garde un verdict
  par palette, recalculé à la fin d'un geste seulement, et mémorisé par le
  JSON de la palette et des réglages communs : aucune analyse des autres
  palettes pendant un glisser. `src/ui/selecteur.ts` pose le signe ✓, ! ou ✗
  à droite de chaque option et sur le bouton, avec un nom accessible qui dit
  le verdict en mots. Tests : la fonction pure, puis l'interface sur un
  fichier à trois palettes, et un glisser de la référence qui ne recalcule
  que la palette ouverte.
- [ ] **P2.4** `src/ui/carte.ts` : une carte titrée fixe garde son glyphe et
  son sous-titre. `src/ui/garanties.ts` prend une option qui la rend fixe,
  toujours ouverte, sans chevron ni résumé.
- [ ] **P2.5** Créer `src/ui/ongletVerification.ts`, abonné à
  `paletteOuverte.ts`. De haut en bas : la barre, le titre « Palette [nom] »,
  le verdict sur son fond de sévérité, la liste des messages par
  `listeDesMessages` de `constats.ts`, la carte des garanties fixe, le pied.
  Le pied dit « La palette tient ses garanties. » et « Passer à Gestion », ou
  « Corrigez la palette dans Création, ou écrivez-la telle quelle dans
  Gestion. » et « Retour à Création ». L'onglet ne se rend que visible, et à
  la fin d'un geste. Sans palette choisie : la barre et l'invitation
  actuelle. États de galerie : `verification-tenue`, `verification-manquee`,
  `verification-libre`.
- [ ] **P2.6** `src/ui/index.ts` : trois onglets, Création, Vérification,
  Gestion. Retirer de `ongletCreation.ts` la carte des garanties et tout ce
  qui la rendait. Le clic sur une garantie qui choisissait une rangée du
  nuancier (`[UI-13]`) agit maintenant depuis Vérification : il passe à
  Création et y choisit la rangée, ou reste dans Vérification si le nuancier
  n'y est pas ; choisir la seconde lecture si la première demande plus qu'un
  appel, et l'écrire dans la spécification.
- [ ] **P2.7** `src/ui/piedDeLaPalette.ts` : le volet et « Détails »
  disparaissent ; le bouton devient « Vérifier » et ouvre Vérification sur la
  palette ouverte. Le pied garde sa ligne, son ton et son annonce
  `aria-live`. Réécrire `[UI-18]` dans la spécification et l'invariant
  « Interface d'UCM Palettes » d'AGENTS.md, qui citait le volet.
- [ ] **P2.8** Les liens des messages. `src/presentation.ts` : ajouter la
  cible `saturation-palette`, qui ouvre la carte « Réglage global » et
  focalise la réglette de saturation ; `ciblesDeLAlerte` rend
  `['saturation-palette']` pour `profils-confondus`, dans tous les cas.
  `LIBELLES_DES_CIBLES` prend les verbes de la table de la section 3.3 de la
  direction. Un lien cliqué depuis Vérification passe à Création, déplie la
  carte et la focalise ; vers les Réglages communs, le retour ramène à
  Vérification et rend le focus au lien (`[VER-15]`). Relire chaque message
  d'alerte de `fr.ts` et de `en.ts` : il cite la carte que son lien ouvre.
- [ ] **P2.9** La ligne de mesure. Le constat d'une alerte ne porte plus
  `mesures` : la ligne « Écart le plus faible : … ΔEok » quitte l'interface.
  `src/rapport.ts` garde l'écart et le minimum dans le rapport exporté ; s'il
  les lisait dans le constat, lui donner sa propre écriture. Tests :
  `tests/textes.test.ts` et `tests/rapport.test.ts`.
- [ ] **P2.10** Le fichier vide (M1). Sans palette, Création montre un encart
  au fond bleuté, `color-mix` du rôle `--fond-marque` et du fond, une rampe
  d'exemple, « Créez votre première palette », une phrase et « Nouvelle
  palette ». Le bouton remplace l'encart par la carte de création actuelle ;
  « Annuler » y ramène. La ligne vers Gestion attend la phase 7. État de
  galerie `premier-lancement` réécrit.
- [ ] **P2.11** L'ouverture (S1). Au premier état reçu du sandbox, le plugin
  ouvre Gestion si la recette porte au moins une palette, Création sinon.
  Aucun état suivant ne change d'onglet. Test d'interface dans les deux cas.
- [ ] **P2.12** Réécrire les tests d'interface que la phase périme : ceux du
  volet, de « Détails », de la carte des garanties dans Création. Aucun test
  ne se supprime sans que son comportement soit tenu ailleurs. Les tests
  `[UI-20]`, aucun contrôle ne bouge pendant un geste, restent verts sans
  changement.

## Phase 3 : Gestion, ses deux vues et la page des planches

Maquettes : M9, M10, M15, sans la ligne « Tokens » ni les lignes « Tokens
Figma » des fiches.

- [ ] **P3.1** `src/ui/connexion.ts` : le bloc « Connexion à Figma », une
  carte grise sans fond. En-tête : le titre, « Synchronisé il y a … » et
  « Synchroniser », texte gris sans contour avec l'icône des deux flèches en
  cercle. « Synchroniser » envoie `lire-etat` avec `recherche: 'fichier'` et
  n'écrit rien ; l'heure est celle du dernier état reçu, écrite en durée
  relative et rafraîchie au rendu. Corps : la ligne « Planches », page et
  « Changer », puis le bilan, un compte par état. 20 px de plus que l'écart
  courant le séparent de la barre des palettes. L'ancien bouton
  « Actualiser » et « Chercher dans tout le fichier » disparaissent :
  « Synchroniser » fait les deux.
- [ ] **P3.2** Les deux vues. Une bascule « Vue complète · Vue condensée »
  dans la barre « Palettes du plugin · N », à gauche de la bascule des thèmes.
  La vue se range avec la langue dans `src/preferences.ts`, clé
  `ucm-palettes.vue`, complète par défaut.
- [ ] **P3.3** La fiche de la vue complète. Dans `ongletGestion.ts`, les
  boutons de la fiche laissent la place aux lignes de sortie de
  `src/ui/sorties.ts` : un nom, une pastille d'état, un détail, des gestes au
  bord droit. La phase ne pose que la ligne « Planche » : « Pas encore
  créée » et « Créer la planche », « À jour » et « Afficher », « À
  actualiser » avec « Actualiser » et « Afficher », « Introuvable ».
  « Modifier » rejoint la pastille dans l'en-tête. Les résultats « Soft ✓ ·
  Vivid ✓ » ouvrent Vérification sur la palette. La pastille de l'en-tête
  suit l'ordre d'urgence de la section 3.4 de la direction, écrit dans
  `src/presentation.ts` par `etatDeLaFiche(tokens, planche)` et testé.
- [ ] **P3.4** La vue condensée (M10) : un tableau, une ligne par palette,
  son nom, sa rampe en miniature, un état par sortie, aucun geste. Un clic ou
  Entrée sur une ligne passe à la vue complète et amène la fiche en vue. Le
  tableau a ses en-têtes de colonne et se lit au clavier.
- [ ] **P3.5** « Tout mettre à jour (N) » dans le bilan du bloc, en vue
  complète seulement : il remplace « Actualiser tout » et « Générer tout ».
  Il dessine les planches en retard ou absentes ; la confirmation au-delà de
  six palettes reste (`[PLA-24]`).
- [ ] **P3.6** La page des planches, dans le sandbox. `src/lecture.ts` :
  l'état de la planche porte la liste des pages du fichier, identifiant, nom
  et nombre de cadres possédés. `src/ecriture/planche.ts` reçoit
  `choisirLaPage(figma, demande)` : la demande nomme une page existante ou un
  nom de page à créer ; le sandbox range la page dans le suivi `planche`,
  puis déplace chaque cadre possédé vers elle, à la place que
  `placeDUnCadreNeuf` donne, après `loadAsync` de la page ; un seul
  `commitUndo`. Un cadre copié, que le plugin ne possède pas, ne bouge pas.
  `code.ts` reçoit la porte `choisir-page`, et AGENTS.md la compte parmi les
  portes d'écriture. Tests dans `tests/dessin.test.ts`, sur le double de
  `tests/figmaDeTest.ts` : page existante, page créée, nom déjà pris, cadre
  copié laissé, suivi d'une version plus récente refusé.
- [ ] **P3.7** La carte « Page des planches » (M15) : « Changer » l'ouvre à
  la place du bloc de la connexion ; « Enregistrer » ou « Annuler » rend le
  bloc et le focus à « Changer ». Une liste à choix unique : chaque page du
  fichier avec son nombre de planches, puis « Nouvelle page » et son champ.
  Aucune simulation. La carte est grise, sans fond ; la liste a un fond gris
  plus foncé. Passer par `src/ui/frontiere.ts` : une demande en vol à la fois,
  et un refus se lit dans la carte.
- [ ] **P3.8** États de galerie : `gestion-complete`, `gestion-condensee`,
  `gestion-page-des-planches`, et les états actuels de l'onglet Palettes
  réécrits. Réécrire les tests d'interface de l'onglet.

## Phase 4 : le modèle pur des variables

Aucune interface, aucun appel à Figma. Tout se teste dans Node.

- [ ] **P4.1** `src/variables/destination.ts` : le type `Destination`,
  `{ collection: { id } | { nom }, groupe, themes: 'chemin' | 'modes' }`, son
  défaut, `{ nom: 'primitives' }`, `colors`, `chemin`, et sa validation. Le
  groupe peut être vide.
- [ ] **P4.2** `src/variables/noms.ts` : le segment d'une palette, tiré de
  son nom. Reprendre `normalizeName` par `packages/plugin-socle`, comme
  `cheminsDeTokens.ts` le fait, puis retirer `.`, `{`, `}` et le `$` de tête,
  que Figma refuse. Deux palettes au même segment : la seconde prend son
  identifiant en suffixe, et la fiche le dit. Une palette sans nom prend son
  identifiant. Tests : accents, espaces, casse, collision.
- [ ] **P4.3** `src/variables/plan.ts` : `planDesVariables(recette, palette,
  destination)` rend la liste ordonnée de ce que la palette écrit, chaque
  entrée avec sa clé stable, `{intensité}/{thème}/{nuance}`, son nom de
  variable, son mode, `unique`, `light` ou `dark`, et sa couleur en hexa. Les
  couleurs viennent de `rampesDe` du moteur, jamais de l'interface. Thèmes
  dans le chemin : 44 entrées et autant de variables pour deux intensités et
  onze nuances. Thèmes en modes : 44 entrées pour 22 variables. Une palette à
  une intensité n'a pas de segment d'intensité. Une palette libre écrit ses
  seules nuances. Tests sur les quatre cas, et l'égalité avec les couleurs de
  l'aperçu.
- [ ] **P4.4** `src/variables/suivi.ts` : la forme rangée sous
  `ucm_palettes/variables`. `{ version, destination, confirmee, palettes:
  { [id]: { collection, modes: { light?, dark?, unique? }, variables:
  { [clé]: { id, ecrite } } , liaison: 'destination' | 'reprise' } } }`.
  Lecture tolérante et versionnée comme `lirePlanche` ; un suivi d'une
  version plus récente refuse toute écriture.
- [ ] **P4.5** `src/variables/etat.ts` : `etatDesTokens(plan, suivi, lues)`
  rend `jamais-ecrits`, `a-jour`, `a-mettre-a-jour`, `modifies` ou
  `introuvables`, par la règle 4 de la direction, avec la liste des entrées
  concernées : celles que Figma a changées, valeur de Figma et valeur du
  plugin, et celles que le plugin a changées. Deux couleurs sont égales quand
  leurs trois octets sRGB le sont, après arrondi des composantes de Figma :
  hypothèse de l'essai R5. Une palette dont la destination a changé depuis
  son écriture est `a-mettre-a-jour`. Tests : la table de la règle 4 ligne à
  ligne, une variable disparue, une destination changée.
- [ ] **P4.6** `src/variables/detection.ts` : `palettesDuFichier(variables)`
  groupe les variables de couleur dont le dernier segment est un nombre et
  dont le reste du chemin est le même ; cinq au moins font une palette ; les
  variables que le suivi possède sont écartées. Chaque palette rend sa
  collection, son chemin, ses nuances triées, ses couleurs par mode, et la
  nuance 600 ou la plus proche. Tests sur trois jeux de noms : Tailwind,
  Material, et les chemins de `intencial-library` si le dépôt voisin porte un
  `tokens.json`.

## Phase 5 : écrire les tokens

Maquettes : M9 en entier, M11.

- [ ] **P5.1** `src/lectureDesVariables.ts`, seul lecteur de
  `figma.variables` : les collections locales, nom, identifiant, modes et
  nombre de variables ; les variables locales de couleur avec leur valeur par
  mode, alias non suivis ; les variables du suivi relues par identifiant,
  groupées dans un seul `Promise.all`. `lire-etat` y ajoute `variables` :
  collections, état du suivi, variables lues. Hypothèse de l'essai R4 : la
  lecture se fait à chaque `lire-etat`. Si elle dépasse 300 ms sur le double
  chargé de 500 variables, ne la faire qu'à l'ouverture de Gestion et à
  « Synchroniser ».
- [ ] **P5.2** Étendre `tests/figmaDeTest.ts` : collections, modes,
  variables, `createVariableCollection`, `createVariable`, `addMode`,
  `renameMode`, `setValueForMode`, `getVariableByIdAsync`,
  `getLocalVariablesAsync`, `getLocalVariableCollectionsAsync`, données
  partagées sur une variable, refus d'un nom déjà pris et refus d'un mode de
  trop.
- [ ] **P5.3** `src/ecriture/variables.ts` : `ecrireLesVariables(figma,
  demande)`. La demande porte des identifiants de palette, l'empreinte lue de
  la recette, et pour chaque palette modifiée dans Figma le choix `remettre`.
  Dans l'ordre :
  1. relire la recette rangée et refuser si son empreinte diffère ;
  2. relire le suivi et les variables, recalculer le plan et l'état ;
  3. refuser une palette `modifies` sans choix `remettre`, sans rien écrire
     pour elle ;
  4. résoudre la collection : celle du suivi, sinon celle de la destination
     par identifiant, sinon une collection créée au nom donné. Une collection
     locale du même nom que le plugin n'a pas créée n'est jamais reprise sans
     que la destination la nomme par identifiant ;
  5. thèmes en modes : trouver ou créer les modes `Light` et `Dark` ; le
     premier mode d'une collection neuve se renomme `Light`. Un refus
     d'`addMode` arrête la palette avec le message de Figma replié ;
  6. avant toute création, chercher dans la collection une variable du même
     nom hors du suivi : s'il y en a une, arrêter la palette et la nommer
     (règle 7, essai R1) ;
  7. créer les variables qui manquent, portées vides, puis écrire chaque
     valeur. Thèmes dans le chemin et collection à plusieurs modes : écrire la
     même valeur dans tous les modes (essai R8) ;
  8. poser sur chaque variable la donnée partagée de sa palette et de sa clé,
     ranger le suivi, puis un seul `commitUndo`.
  Une erreur au milieu d'une palette retire les variables que cette écriture
  venait de créer pour elle ; les autres palettes continuent. Le résultat
  nomme, par palette, ce qui est créé, écrit, refusé et pourquoi.
- [ ] **P5.4** `src/ecriture/variables.ts` : `rangerLaDestination(figma,
  destination)`, qui valide, range dans le suivi et marque `confirmee`.
  `code.ts` : portes `ecrire-variables` et `ranger-destination`.
  `src/messages.ts` : les demandes et les réponses, numérotées. `tests/
  loiDEcriture.test.ts` : la loi `[ARC-13]` réécrite, les deux fichiers
  autorisés nommés, tout autre appel à `figma.variables` refusé. AGENTS.md :
  l'invariant, les portes, la carte du code.
- [ ] **P5.5** `tests/variables.test.ts`, sur le double : première écriture,
  réécriture sans doublon, variable disparue recréée, nom déjà pris, palette
  modifiée refusée sans choix, erreur au milieu, thèmes en modes, collection
  existante à deux modes, recette changée depuis la lecture, suivi futur, un
  seul `commitUndo`.
- [ ] **P5.6** `src/ui/frontiere.ts` : une écriture de variables suit les
  règles du dessin. Elle part après le rangement en vol, un refus l'abandonne,
  et rien ne s'écrit pendant un conflit.
- [ ] **P5.7** La ligne « Tokens Figma » des fiches, par `sorties.ts`, avec
  les cinq états et leur détail : « 44 variables », « 6 couleurs ont changé
  dans le plugin », « 44 variables à créer ». La ligne « Tokens » du bloc de
  la connexion : la collection, le groupe et « Changer ». Le bilan et « Tout
  mettre à jour » comptent les deux sorties.
- [ ] **P5.8** La première écriture (M11, bas). « Écrire dans les tokens »
  ouvre dans la fiche un encart : le nombre de variables, la collection, le
  premier et le dernier nom, « Annuler » et « Écrire N variables ». Tant que
  la destination n'est pas confirmée, le geste ouvre d'abord la carte de la
  destination. « Mettre à jour » écrit sans encart : il ne crée rien et
  n'écrase aucune valeur de Figma.
- [ ] **P5.9** La carte « Destination des tokens » (M11), ouverte à la place
  du bloc de la connexion. La collection en liste à choix unique : « Nouvelle
  collection » et son champ, puis chaque collection locale avec son nombre de
  variables. Le groupe et les thèmes sur une rangée. Aucun texte d'aide. La
  carte est grise, sans fond ; la liste et la simulation ont un fond gris
  plus foncé ; « Annuler » et « Enregistrer » au bord droit.
- [ ] **P5.10** La simulation de la carte : la forme du panneau des variables
  de Figma. Le nom de la collection, un groupe par rampe avec son compte, le
  premier groupe déplié sur ses trois premières nuances, couleur et hexa, puis
  « N autres nuances ». En modes, deux colonnes de valeur, Light et Dark. Elle
  se calcule par `planDesVariables` sur la première palette du plugin, et suit
  chaque choix sans rien ranger.
- [ ] **P5.11** « Tout mettre à jour » : une confirmation qui compte les
  variables créées, les couleurs écrites et les planches dessinées, puis les
  variables, puis les planches. Une palette `modifies` en est exclue et le
  bilan le dit.
- [ ] **P5.12** Une palette supprimée : sa carte, qui propose déjà de retirer
  le cadre, propose aussi « Supprimer les variables… », geste `danger`
  confirmé. Porte `retirer-variables` : le sandbox ne retire que les variables
  du suivi de cette palette, quand la recette ne la contient plus ; un seul
  `commitUndo`. Tests sur le modèle de `tests/retrait.test.ts`.
- [ ] **P5.13** États de galerie : `tokens-jamais-ecrits`, `tokens-a-jour`,
  `tokens-a-mettre-a-jour`, `tokens-introuvables`, `premiere-ecriture`,
  `destination-ouverte`, `destination-en-modes`, `nom-deja-pris`,
  `ecriture-partielle`, `palette-supprimee-avec-variables`. Tests d'interface
  pour chaque geste.

## Phase 6 : des couleurs changées dans Figma

Maquette : M12.

- [ ] **P6.1** L'état `modifies` dans la fiche : la ligne dit « Modifiés dans
  Figma » et le nombre de couleurs ; un encart d'avertissement liste chaque
  couleur, son nom de variable, la valeur de Figma et celle du plugin, six au
  plus puis « Et N autres ».
- [ ] **P6.2** « Remettre les couleurs du plugin » envoie `ecrire-variables`
  avec le choix `remettre`. « Laisser les couleurs de Figma » replie l'encart
  pour la session, sans rien ranger : l'état reste « Modifiés dans Figma ».
- [ ] **P6.3** Tests d'interface des deux choix, et état de galerie
  `tokens-modifies`.

## Phase 7 : les palettes du fichier

Maquette : M9, bas.

- [ ] **P7.1** `lire-etat` rend les palettes détectées par
  `palettesDuFichier`. La liste « Déjà dans le fichier · N », sous un filet :
  une fiche en tirets, sans fond, l'étiquette « Variables du fichier », la
  rampe du premier mode, le chemin, le nombre de couleurs et les modes. Le
  bouton « Modifier dans le plugin » est dans l'en-tête, au bord droit ; il
  reste inactif jusqu'à la phase 8.
- [ ] **P7.2** La vue condensée reçoit une ligne par palette du fichier.
- [ ] **P7.3** Le fichier vide (M1) : la ligne « Ce fichier porte déjà N
  palettes dans ses variables. Les voir dans Gestion » paraît sous l'encart
  quand N vaut au moins 1.
- [ ] **P7.4** États de galerie `palettes-du-fichier`, `fichier-vide-avec-
  variables`, et leurs tests d'interface.

## Phase 8 : « Modifier dans le plugin »

Maquettes : M13, M14.

Une palette du fichier a une rampe par mode, pas d'intensités. Reprise, elle
devient une palette du plugin à une intensité, et ses variables d'origine
restent ses tokens.

- [ ] **P8.1** `packages/couleur` : le format 8 de la recette. Une palette
  peut porter `figees`, les couleurs d'une rampe par thème et par nuance ;
  `rampesDe` les rend telles quelles. Une palette figée est libre : ni rôles,
  ni garanties, ni réglage global, ni Color shift. `validerRecette` refuse une
  couleur figée hors de la liste des nuances de la palette. Le format 7 est
  refusé, sans conversion. Spécification, section 7, et `FORMAT_RECETTE`.
  Vérifier ce que `packages/plugin-explorateur/src/integrations/` lit de la
  recette, et lui faire accepter le format 8. Tests du moteur et des deux
  plugins.
- [ ] **P8.2** `src/edition.ts` : `reprendreDuFichier(recette, id,
  paletteDuFichier, mode)`. Mode `recalculees` : une palette à une intensité,
  au nom du dernier segment de chemin non numérique, à la référence de la
  nuance 600 ou de la plus proche ; libre, avec les nuances lues, quand elles
  ne sont pas celles de la recette. Mode `telles-quelles` : la même, figée
  aux couleurs lues. Tests.
- [ ] **P8.3** La liaison. Le suivi de la palette prend `liaison:
  'reprise'` : ses clés pointent les variables d'origine, par identifiant. Le
  thème Light vise le premier mode de la collection, ou le mode dont le nom
  contient « light », sans casse ; le thème Dark vise le mode dont le nom
  contient « dark », et ne s'écrit pas s'il n'existe pas. `ecrite` prend la
  couleur lue : une palette reprise « telle quelle » est « À jour » sans
  écriture. `planDesVariables` rend, pour une liaison de reprise, les seules
  entrées que le suivi pointe, et l'écriture ne crée, ne renomme ni ne
  déplace aucune variable. Porte `reprendre-palette`, qui range la recette et
  le suivi ensemble, sous un seul `commitUndo`.
- [ ] **P8.4** Le geste (M13). « Modifier dans le plugin » reprend en mode
  `recalculees`, ouvre Création sur la palette et y pose un encart sous le
  titre : les deux rampes, « Fichier » et « Plugin », la bascule
  « Recalculées · Telles quelles », le nombre de couleurs qui changeront, et
  « Annuler la reprise », qui supprime la palette et son suivi. L'encart
  reste tant que les tokens de la palette ne sont pas « À jour ».
- [ ] **P8.5** Gestion (M14). La palette quitte « Déjà dans le fichier ». Sa
  ligne des tokens dit la collection et le chemin d'origine. « Mettre à
  jour » ouvre l'encart de remplacement : les couleurs qui changent, « Et N
  autres », la phrase « Les variables gardent leur nom et leurs liaisons. »,
  « Annuler » et « Remplacer N couleurs ».
- [ ] **P8.6** États de galerie `reprise-recalculee`, `reprise-telle-quelle`,
  `reprise-dans-gestion`, tests d'interface, et les tests de `variables.
  test.ts` pour la liaison de reprise : une collection à un mode, à deux
  modes Light et Dark, à deux modes sans nom reconnu.

## Phase 9 : les bibliothèques distantes

Maquettes : M9, fiche « Bibliothèque » ; M11, lignes en lecture seule.

Hypothèse de l'essai R10 : `figma.teamLibrary` liste les collections de
bibliothèque activées et leurs variables, nom, clé et type, sans leurs
valeurs ; une valeur ne se lit qu'après `importVariableByKeyAsync`, qui ajoute
la variable au fichier.

- [ ] **P9.1** Manifest : la permission `teamlibrary`.
  `src/lectureDesVariables.ts` : les collections de bibliothèque, nom, clé et
  nombre de variables, et leurs palettes détectées sur les seuls noms.
  `tests/manifest.test.ts` suit, et AGENTS.md dit que le manifest déclare
  cette permission.
- [ ] **P9.2** La carte de la destination liste ces collections après les
  locales, grisées, non choisissables, avec « Bibliothèque », leur nombre de
  variables et « lecture seule ». Deux collections du même nom se
  distinguent par leur compte.
- [ ] **P9.3** « Déjà dans le fichier » montre leurs palettes, étiquette
  « Bibliothèque », chemin précédé du nom de la collection et de son nombre de
  variables. La rampe n'a pas de couleurs avant la copie : la fiche montre
  des pastilles vides et « Couleurs lues à la copie ».
- [ ] **P9.4** « Copier dans le plugin » : porte `copier-palette`. Le sandbox
  importe les variables de cette seule palette, lit leurs couleurs, puis
  reprend par `reprendreDuFichier` en mode `recalculees`, avec une liaison
  `destination` : la copie s'écrira dans la destination des tokens, jamais
  dans la bibliothèque. La confirmation dit que N variables de la
  bibliothèque sont ajoutées au fichier.
- [ ] **P9.5** Tests sur le double, états de galerie `bibliotheques`,
  `copie-de-bibliotheque`. Si `teamLibrary` manque au double ou lève, la
  lecture rend une liste vide et un constat, et le reste de Gestion
  fonctionne.

## Phase 10 : la clôture

- [ ] **P10.1** Spécification relue contre le code, section par section.
  AGENTS.md : carte du code, invariants « Écriture d'UCM Palettes » et
  « Interface d'UCM Palettes », portes de `code.ts`.
  `tests/inventaireInvariants.test.ts` passe.
- [ ] **P10.2** `packages/plugin-palettes/README.md` : les trois onglets, les
  deux sorties, la destination, ce que le plugin n'écrit jamais.
- [ ] **P10.3** Relecture des textes par la skill `rediger-diagnostics-ucm`,
  dans les deux langues ; `tests/i18n.test.ts` et `tests/loiDesTextes.test.ts`
  passent.
- [ ] **P10.4** Galerie capturée en thème sombre aux deux tailles ; chaque
  état nouveau comparé à sa maquette. `tests/stylesUi.test.ts` : aucune règle
  sans classe, aucune classe sans règle, aucune couleur en dur.
- [ ] **P10.5** Mesures : `scripts/mesurer-glisser-couleur.mjs` et
  `scripts/mesurer-glisser.mjs` relancés, cartes dépliées, sur un fichier à
  douze palettes ; les chiffres entrent dans le message du commit. Le verdict
  des autres palettes ne coûte rien pendant un glisser.
- [ ] **P10.6** `npm test` à la racine, `npm run typecheck`, `npm run build`
  et `npm run test:ui` dans le plugin, tous verts.
- [ ] **P10.7** Mettre à jour le README du dossier, le statut de la direction
  simple, et la mémoire du projet.
- [ ] **P10.8** Écrire `RECETTE-DIRECTION-SIMPLE.md` à côté de ce plan, pour
  le mainteneur : un parcours pas à pas dans Figma qui traverse chaque écran,
  puis les essais R1 à R10. Chaque essai donne le geste, le résultat que le
  code suppose, et le fichier à changer si Figma répond autrement :

  | Essai | Hypothèse du code | Si elle est fausse |
  |---|---|---|
  | R1 | Figma refuse ou double un nom déjà pris ; le plugin cherche le nom avant de créer | Rien : la recherche préalable couvre les deux cas |
  | R2 | Un `commitUndo` donne un pas d'annulation pour une écriture | `ecriture/variables.ts`, étape 8 |
  | R3 | La donnée partagée d'une variable survit à la publication et à la copie | `variables/suivi.ts` : le suivi par identifiant suffit, la donnée ne sert que de repère |
  | R4 | La lecture de 500 variables tient sous 300 ms | `lectureDesVariables.ts` : lire à l'ouverture de Gestion seulement |
  | R5 | Une couleur relue égale la couleur écrite à l'octet | `variables/etat.ts` : le seuil d'égalité |
  | R6 | Le segment normalisé est accepté par Figma | `variables/noms.ts` : les caractères retirés |
  | R7 | La règle de détection trouve les palettes de la bibliothèque Intencial | `variables/detection.ts` : le seuil de cinq, la forme du dernier segment |
  | R8 | Écrire la même valeur dans tous les modes d'une collection existante est le comportement attendu | `ecriture/variables.ts`, étape 7 |
  | R9 | Le refus d'un second mode arrive par une erreur d'`addMode` | Le message de la fiche |
  | R10 | `teamLibrary` liste sans valeurs ; l'import ajoute la variable au fichier | La phase 9 se retire, ou la fiche montre ses couleurs dès la liste |

- [ ] **P10.9** Dernier message au mainteneur : ce qui est livré, ce qui
  s'écarte de la direction et pourquoi, le lien vers la recette, et la
  question S14 restée ouverte.

## Ce que l'agent ne fait pas

- Il n'écrit ni `brand`, ni `theme`, ni `usage`, ni alias.
- Il ne crée ni marque, ni destination par palette, ni jeu de départ, ni revue
  en modale.
- Il ne lie aucune pastille de planche à une variable.
- Il ne supprime ni ne renomme une variable hors du geste « Supprimer les
  variables… » d'une palette supprimée.
- Il ne publie aucun paquet : `packages/kit` ne change pas. Si une tâche
  exige d'y toucher, il s'arrête sur cette tâche, l'écrit dans le message
  final et continue les autres.
