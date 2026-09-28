# UCM Palettes : plan d’ergonomie, sixième tour

## Résultat attendu

Le panneau s’ouvre à 850 × 720 et son contenu occupe la largeur gagnée.
L’onglet « Palettes » s’appelle « Création », l’onglet « Planches »
s’appelle « Palettes ». À l’ouverture, aucune palette n’est choisie :
l’onglet Création montre le sélecteur « Sélectionner une palette » et une
invitation à choisir une palette ou à en créer une. Glisser dans le
sélecteur de couleur suit le pointeur sans à-coup. « Ajuster la référence »
dit pourquoi il faut ajuster, et son panneau est refait d’après une
maquette validée. La carte Garanties de contraste est refaite d’après une
maquette validée : codes des rôles lisibles, badges sur une ligne, états
nommés une fois, sections distinctes, rangées plus compactes. Dans l’onglet
Palettes, les pastilles d’état et le geste global prennent les libellés et
les couleurs dictés. Dans la configuration, le code hexa prend la largeur
disponible et les intensités se choisissent par segments, comme le modèle.

Ce plan est destiné à l’agent qui réalisera les changements. Il reprend les
cases encore ouvertes du [cinquième plan](./PLAN-ERGONOMIE-PALETTES-V5.md),
dont les décisions restent valables quand ce document ne les remplace pas.
Le mainteneur fait lui-même les tests d’interface sous Chromium et la
recette dans Figma.

## Autorités

Lire dans cet ordre :

1. les [retours du mainteneur](#retours-du-mainteneur-round-6), conservés
   sans modification ;
2. les décisions ci-dessous et les [réponses aux
   questions](#questions-au-mainteneur), une fois données ;
3. les maquettes du lot Z3 (`MAQUETTES-RECETTE-V6.html`), une fois
   validées ;
4. le [cinquième plan](./PLAN-ERGONOMIE-PALETTES-V5.md), les [décisions de
   rédaction](./DECISIONS-REDACTION-PALETTES.md) et
   l’[inventaire des textes](./INVENTAIRE-TEXTES-ET-PROPOSITIONS.md) ;
5. la [spécification](./RECHERCHE-PLUGIN-PALETTES.md),
   [AGENTS.md](../../../../AGENTS.md) et
   [CONTRIBUTING.md](../../../../CONTRIBUTING.md).

## Faits qui fondent les décisions

Relevés dans le code au commit `68667f6`. Les chemins sont
relatifs à `packages/plugin-palettes/`.

| Fait | Source | Conséquence |
|---|---|---|
| La fenêtre s’ouvre à 750 × 720, au plus petit à 500 × 520. Une taille rangée à 600 × 720 ou 650 × 720 s’ouvre au défaut | `src/fenetre.ts`, `TAILLE_PAR_DEFAUT`, `ANCIENS_DEFAUTS` | 850 × 720, et 750 × 720 rejoint les anciens défauts |
| Ni `styles.css` ni `socle.css` ne posent de `max-width`. Les largeurs fixes sont : la première colonne d’une garantie (140 px), une case d’état de garantie (64 px), le code hexa (88 px), le sélecteur de couleur (232 px), le graphe de dérive (viewBox de 396 unités) | `styles.css`, `couleur/selecteur.ts`, `derive/graphe.ts` | « Le contenu s’adapte » se mesure bloc par bloc à 850 px : un bloc qui garde sa largeur de 750 px est une largeur fixe à revoir |
| Les onglets ont pour libellés `TEXTES.ongletPalettes` (« Palettes ») et `TEXTES.ongletPlanche` (« Planches »), pour identifiants `palettes` et `planche`, pour panneaux `#panneau-palettes` et `#panneau-planche`. Les tests et la galerie visent les panneaux par ces identifiants | `src/ui/index.ts`, `textes.ts`, `tests/interface/interface.test.mjs`, `galerie/etats.cjs` | Changer les libellés seuls ne touche aucun sélecteur de test ; changer les identifiants touche les 94 tests d’interface et les 63 états de galerie |
| Trois textes affichés nomment un onglet : `plancheSansPalette` (« dans l’onglet « Palettes » »), deux gestes « Actualisez l’onglet Planche(s) ». CONTRIBUTING.md nomme les onglets 4 fois, la spécification 16 fois | `textes.ts`, `grep` | Ces textes suivent le renommage ; « Palettes » change de sens, chaque occurrence se relit une à une |
| `ouverte()` rend la palette `idOuvert` ou, à défaut, `recette.palettes[0]`. `idOuvert` vaut `''` au chargement : la première palette s’ouvre d’elle-même | `ongletPalettes.ts`, `ouverte()` | Supprimer ce repli suffit à ouvrir l’onglet sans palette |
| Le sélecteur écrit le nom de la palette ouverte, ou une chaîne vide s’il n’y en a pas | `selecteur.ts`, `afficher` | Sans palette, le bouton doit porter « Sélectionner une palette » |
| `ouvrirSur` attend `.titre-de-premier-rang`, qui n’existe qu’avec une palette ouverte. Les états de galerie déclarent des messages et des clics (`{ clic: … }`) sans jamais choisir de palette | `tests/interface/interface.test.mjs`, `galerie/etats.cjs` | Sans repli, la plupart des tests et des états n’ouvrent plus de palette : il leur faut un geste « ouvrir la première palette » |
| Les Réglages communs lisent `ouverte()` pour l’aperçu de la palette ouverte et les fonds proposés ; le type admet `null` | `configuration.ts` | Le cas sans palette existe déjà ; il devient le cas courant et se vérifie |
| Chaque `pointermove` du sélecteur de couleur appelle `saisir(hexa, false)`, puis `modifier`, puis `rendre()` : analyse de la palette, nuancier, garanties, messages, dérive ouverte et interface de test, de façon synchrone. Aucun `requestAnimationFrame` dans `src/` | `couleur/selecteur.ts`, `ongletPalettes.ts` | Le coût d’un mouvement est celui d’un rendu complet de l’onglet, autant de fois que le navigateur émet d’événements |
| `[DER-13]` exige qu’un changement se lise dans l’aperçu en moins d’une image. `scripts/mesurer-glisser.mjs` mesure la poignée de la dérive, pas le sélecteur de couleur | Spécification, `scripts/` | Mesurer le glisser du sélecteur avant de corriger, avec un script voisin |
| « Ajuster la référence » paraît sous le code dès qu’une garantie est manquée (Y8.0). Il ouvre l’onglet « Ajuster » du sélecteur de couleur, large de 232 px : deux témoins, la piste des pas, la luminosité, les annonces des pas, le code, la nuance visée, un bilan par profil, puis une ligne par garantie de la forme « `text` sur fond · Thème Light · Vivid : 3,9:1 → 4,6:1 » | `ajustement.ts`, `TEXTES_DE_L_AJUSTEMENT`, `[UI-15]` | Aucun texte ne dit pourquoi ajuster. Tout le panneau tient dans 232 px |
| La palette garde les octets de la référence à son cran (`[MOT-17]`). Une garantie qui porte sur ce cran ne se répare qu’en déplaçant la référence | Spécification, `[MOT-17]`, `[UI-15]` | L’explication existe dans la spécification ; elle n’atteint pas le designer |
| Pastilles d’état d’une fiche : « À mettre à jour » sur `--fond-avertissement` ; « À jour » sur `--fond-note` en `--texte-succes` ; « Pas encore sur Figma » sur `--fond-note`, gris. Le socle définit `--fond-avertissement` et `--texte-succes`, pas de fond de succès | `styles.css`, `.pastille-d-etat`, `plugin-socle/src/ui/socle.css` | Un fond vert demande un jeton `--fond-succes` dans le socle, que UCM Exporter partage |
| « À mettre à jour » s’écrit dans quatre textes : la pastille, et les trois effets annoncés d’un réglage (contenu des planches, réglage commun, import) | `textes.ts`, `perimee`, `effet`, lignes 219 et 1017 | Les quatre passent à « À actualiser » |
| « Mettre à jour (N palettes) » génère les palettes dont l’état est dans `A_GENERER`, cadres jamais générés compris | `ongletPlanche.ts`, `pasAJour` | « Actualiser tout » générera aussi des palettes jamais générées (Q6.4) |
| Le code hexa de la configuration et de la création mesure 88 px, fixe (`.champ-ligne .champ-hexa`, `.champ-creation`) | `styles.css` | La colonne de la référence peut prendre la largeur de sa moitié de rangée |
| Dans la configuration, le modèle se choisit par segments `.bascule.bascule-de-base` (« Standard · Libre ») ; les intensités, par l’interrupteur « Deux intensités » posé en Y8.6 | `champs.ts`, `createChoixDuModele`, `createInterrupteurDesIntensites` | Le retour défait Y8.6 : des segments comme le modèle |
| Garanties : `.code-du-role` en 10 px à chasse fixe, à côté d’un texte courant de 11 px ; une case d’état fait 64 px de large et porte « ✓ 4,52:1 » puis le badge ; le nom de l’état s’écrit sous chaque case ; la rangée choisie prend `--fond-survol` et une ombre intérieure de 2 px à gauche ; les groupes par minimum ne se distinguent que par un titre en gras | `styles.css`, `.garantie*`, `garanties.ts` | Chaque point du retour a sa cause dans une règle ; le retour parle d’un trait à droite, que le code ne pose pas : Z0.1 le constate |

## Décisions

| Sujet | Décision |
|---|---|
| Fenêtre | 850 × 720 par défaut. Le plus petit format reste 500 × 520. Une taille rangée à 600, 650 ou 750 × 720 s’ouvre à 850 × 720 ; toute autre taille rangée se garde |
| Largeur du contenu | Aucun bloc ne garde une largeur fixe pensée pour 750 px quand la place existe. Les largeurs fixes qui servent un alignement (colonnes de nuances, pastilles) se gardent. Le sélecteur de couleur garde 232 px, sauf si la maquette Z3.1 en décide autrement pour « Ajuster » |
| Onglets | Libellés « Création » et « Palettes ». Les identifiants (`palettes`, `planche`), les panneaux, les modules (`ongletPalettes.ts`, `ongletPlanche.ts`) et `data-geste` ne changent pas (Q6.1). AGENTS.md et CONTRIBUTING.md donnent la correspondance |
| Palette ouverte à l’ouverture | Aucune. Le sélecteur écrit « Sélectionner une palette ». Le menu de la palette (dupliquer, monter, descendre, supprimer) se cache. « Nouvelle palette » reste. La palette choisie dure jusqu’à la fermeture du plugin et ne se range pas |
| Invitation | Sous le sélecteur, sans palette choisie : avec des palettes, une phrase qui invite à en choisir une dans la liste ou à en créer une, et le bouton « Nouvelle palette » ; sans palette, le panneau de création actuel. Textes à valider en Z3.3 |
| Palette supprimée | La palette suivante s’ouvre, comme aujourd’hui (Q6.3) |
| Glisser dans le sélecteur de couleur | Un rendu par image au plus pendant un glisser. La fin du geste rend et range comme aujourd’hui. Si une image dépasse encore son budget, les parties lourdes (garanties, interface de test, messages) attendent la fin du geste ; l’aperçu suit le pointeur |
| Ajuster la référence | Workflow refait d’après la maquette Z3.1 : dire pourquoi avant de proposer le geste, moins de texte, textes rangés par ce que le designer décide |
| Pastilles d’état | « À actualiser » et « Pas encore sur Figma » : fond et texte d’avertissement. « À jour » : fond de succès, texte de succès. « Cadre introuvable » et « Lecture impossible » gardent le danger |
| Libellés de l’onglet Palettes | « À actualiser » partout où « À mettre à jour » s’écrivait. « Actualiser tout (N palettes) » remplace « Mettre à jour (N palettes) », singulier gardé. « Générer tout (N palettes) » ne change pas |
| Code hexa | Il prend toute la largeur de sa colonne, dans la configuration et dans la création, qui gardent la même disposition (Q6.5) |
| Intensités dans la configuration | Segments `.bascule-de-base`, libellé « Intensités » au-dessus, comme « Modèle ». Libellés des segments à valider (Q6.2). Dessous, inchangés : l’aide, « Intensité : 0,89 » à une intensité, « Référence exacte dans » à deux. La création garde ses deux cartes |
| Garanties de contraste | Mise en page refaite d’après la maquette Z3.2. Le contenu ne change pas : associations, états, ratios, niveaux WCAG, réglettes, liens des garanties en échec |

## Reprise du cinquième plan

| Case du cinquième plan | Sort |
|---|---|
| Y8.1, tests d’interface cassés par Y1 à Y7 | Reprise en Z7.1, avec ceux que ce plan casse |
| Y8.3, Ctrl+Z après « Supprimer définitivement » | Reprise en Z7.3 |
| Y8.4, recette dans Figma | Reprise en Z7.4, avec la recette ci-dessous |
| Y8.5, temps et calques d’une génération de douze palettes | Reprise en Z7.5 |
| Y8.6, interrupteur « Deux intensités » dans la configuration | Remplacé par des segments (Z1.7) |

Les cases faites du cinquième plan restent acquises. Leur comportement se
conserve quand un lot déplace l’élément qui le porte : « Ajuster la
référence » seulement avec une garantie manquée (Y8.0), focus rendu au code
quand le lien disparaît, style unique des onglets actifs (Y1.4), gestes
compacts des fiches (Y1.6).

## Ordre d’exécution

| Étape | Lots | Dépendance |
|---|---|---|
| Constats, règles et documents | Z0 | Relecture de ce plan |
| Corrections directes | Z1 | Z0 |
| Aucune palette à l’ouverture | Z2 | Z1.3 ; textes de Z3.3 validés |
| Maquettes à valider | Z3 | Z0.1 ; en parallèle de Z1 |
| Glisser du sélecteur de couleur | Z4 | Z0 ; en parallèle de Z1 |
| Ajuster la référence | Z5 | Z3.1 validée |
| Garanties de contraste | Z6 | Z3.2 validée, Z1.2 |
| Recette et clôture | Z7 | Lots finis |

Aucun lot ne touche au moteur ni à la recette : `FORMAT_RECETTE` reste 4,
et la revue indépendante n’est pas requise. Z4 touche au rendu de l’onglet :
si sa correction change l’ordre des rendus ou des rangements, faire relire
le changement par un agent de revue avant de l’écrire. Chaque lot suit les
règles de code, de test et de relecture de CONTRIBUTING.md, met à jour la
documentation qu’il touche, et ajoute ses textes à l’inventaire à partir de
N130, « À valider ». Chaque test nouveau est vu rouge sur une mutation de
ce qu’il protège, et le message du commit le dit. Une capture ne prouve ni
une interaction ni une sauvegarde.

## Lot Z0 : constats, règles et documents

- [x] **Z0.1** Construire la galerie et capturer à 850 × 720, au thème
  sombre de Figma, la carte Garanties d’une palette à deux intensités avec
  une garantie choisie et plusieurs états (`hover`, `active`). Constater le
  trait que le retour décrit « à droite » : le code ne pose qu’une ombre de
  2 px à gauche de la rangée choisie. Noter ce qui produit le trait dans ce
  plan, sous cette case.
  Constat, état `garantie-en-echec` de la galerie, à 850 px : le trait est
  l’ombre `inset 2px 0 0 var(--texte)` de `.garantie[aria-pressed='true']`,
  à gauche, à 4 px du code du rôle. Aucun élément de la carte ne porte de
  bord droit, hors le cadre des spécimens. Un clic ne pose pas d’anneau de
  focus (`:focus-visible` faux). La carte ouverte mesure 1 310 px, et
  1 264 px pour une palette sans échec. Quatre ratios sur seize passent leur
  badge à la ligne dans les cases de 64 px, à 850 px comme à 500 px : les
  trois AAA et « AA ✗ ».
- [x] **Z0.2** Mesurer à 850 × 720, dans la galerie, la largeur de chaque
  carte et de chaque bloc de l’onglet Création, des Réglages communs et de
  l’onglet Palettes, contre la largeur disponible. Lister ici les blocs qui
  gardent leur largeur de 750 px, avec la règle CSS qui les fixe.
  Constat, états `garanties-respectees`, `configuration-de-la-recette` et
  `planche-perimee`, à 750 puis 850 px : chaque carte suit la largeur du
  panneau (801 px à 850). Les blocs qui ne grandissent pas sont des
  contrôles à leur largeur naturelle (segments, boutons, titres, pastilles
  d’état), plus quatre largeurs fixes : la colonne du nom d’une garantie
  (`.garantie`, 140 px, lot Z6), la case d’un état de garantie
  (`.garantie-etat`, 64 px, lot Z6), le code hexa (`.champ-ligne
  .champ-hexa`, 88 px, Z1.6) et le sélecteur de couleur (232 px, décision
  Z3.1). Z1.2 n’a donc rien à élargir hors de Z1.6 et Z6.
- [ ] **Z0.3** Spécification : `[UI-01]` (850 × 720, anciens défauts),
  `[UI-02]` et `[UI-04]` (noms des onglets), `[UI-06]` (sélecteur sans
  palette), `[UI-11]` (code hexa, segments des intensités), `[UI-05]` et
  `[PLA-20]` (pastilles et libellés). Chaque mention d’un onglet relue une à
  une : « Palettes » désigne désormais l’ancien onglet Planches.
  `[UI-09]` et `[UI-15]` se récrivent avec leurs lots.
- [ ] **Z0.4** CONTRIBUTING.md, « Les surfaces d’UCM Palettes » : noms des
  onglets, correspondance avec les modules, état sans palette. AGENTS.md :
  la carte du code dit `ongletPalettes.ts` « l’onglet Création » et
  `ongletPlanche.ts` « l’onglet Palettes ».
- [ ] **Z0.5** Inventaire des textes : « Création », « Palettes » (onglet),
  « Sélectionner une palette », « À actualiser », « Actualiser tout (N
  palettes) », dictés ; « À mettre à jour » et « Mettre à jour (N
  palettes) » marqués retirés. Les textes des maquettes entrent « À
  valider ».
- [ ] **Z0.6** Déclarer dans `galerie/etats.cjs` les états de ce plan, chacun
  avec la case qui le rendra atteignable : onglet Création sans palette
  choisie, avec des palettes (Z2) ; panneau « Ajuster » refait (Z5) ;
  Garanties refaites (Z6) ; pastilles des cinq états (Z1.5).

Critère : l’agent place chaque élément de Z1 à partir de la spécification et
de CONTRIBUTING.md, sans relire ce plan.

## Lot Z1 : corrections directes

Fichiers : `fenetre.ts`, `styles.css`, `textes.ts`, `champs.ts`,
`ongletPalettes.ts`, `ongletPlanche.ts`, `plugin-socle/src/ui/socle.css`,
tests voisins et `tests/interface/interface.test.mjs`.

- [ ] **Z1.1** Fenêtre à 850 × 720 par défaut ; 750 × 720 rejoint
  `ANCIENS_DEFAUTS`. Reprendre les tests de `fenetre.ts`, `PAR_DEFAUT` des
  tests d’interface et la taille par défaut de la galerie. `[UI-03]` se
  vérifie aux deux tailles.
- [ ] **Z1.2** Chaque bloc listé en Z0.2 prend la largeur disponible, sauf
  les Garanties, qui attendent Z6. Vérifier à 500 × 520 que rien ne
  déborde et à 850 × 720 que rien ne reste à sa largeur de 750 px.
- [ ] **Z1.3** Onglets « Création » et « Palettes » : les deux libellés, les
  trois textes qui nomment un onglet, les commentaires qui en nomment un.
  Identifiants, panneaux et modules inchangés. Le test « la fenêtre s’ouvre
  sur l’onglet Palettes » vise l’onglet « Création ».
- [ ] **Z1.4** « À actualiser » dans les quatre textes qui écrivaient « À
  mettre à jour » ; `genererLesPalettesPasAJour` rend « Actualiser tout (N
  palettes) ».
- [ ] **Z1.5** Ajouter au socle `--fond-succes`, aux deux thèmes, sur
  `--figma-color-bg-success-tertiary` avec un repli de chaque thème.
  Mesurer le contraste de `--texte-succes` sur ce fond, 4,5:1 au moins aux
  deux thèmes, et le noter ici. Pastille « À jour » : fond de succès.
  Pastille « Pas encore sur Figma » : fond et texte d’avertissement. UCM
  Exporter ne pose pas le jeton : sa suite reste verte, et sa galerie ne
  change pas (preuve sur le DOM, pas sur les captures).
- [ ] **Z1.6** Code hexa sur toute la largeur de sa colonne, dans la
  configuration et dans la création. La pastille garde sa taille ; le champ
  garde `tabular-nums`. Vérifier à 500 × 520 que la rangée du nom et de la
  référence tient.
- [ ] **Z1.7** Intensités de la configuration en segments `.bascule-de-base`,
  selon la réponse à Q6.2. Le composant garde l’API de
  `createInterrupteurDesIntensites` (`poser`, `base`, `element`) ; renommer
  s’il ne s’agit plus d’un interrupteur. Les deux tests Y4.8 passent par les
  segments. Une palette libre n’a toujours pas ce choix.
- [ ] **Z1.8** Tests : taille par défaut et reprise de 750 × 720 ; libellés
  des onglets ; libellé du geste global au singulier et au pluriel ; fond de
  chaque pastille par sa couleur calculée, « À jour » distinct de
  `--fond-note` ; largeur du code hexa égale à celle de sa colonne, moins la
  pastille ; segments des intensités, `aria-pressed` et effet sur la palette.

Critère : à 850 × 720, aucun bloc de Z0.2 ne laisse de marge vide à droite,
et l’onglet Palettes se lit aux libellés et couleurs dictés.

## Lot Z2 : aucune palette à l’ouverture

Après Z1.3 et la validation des textes de Z3.3.

- [ ] **Z2.1** `ouverte()` sans repli sur la première palette. Sans palette
  choisie : le sélecteur porte « Sélectionner une palette », le menu de la
  palette se cache, la vue de la palette se cache, l’invitation paraît. Un
  `idOuvert` qui ne désigne plus aucune palette (import, autre session)
  ramène à cet état.
- [ ] **Z2.2** L’invitation selon Z3.3, avec des palettes. Sans palette, le
  panneau de création actuel reste ; son texte suit Z3.3 s’il change.
- [ ] **Z2.3** Vérifier sans palette choisie : Réglages communs (aperçu de
  la palette ouverte, fonds proposés, effet du contenu des planches),
  « Modifier » d’une fiche de l’onglet Palettes, création puis ouverture de
  la palette créée, suppression, import.
- [ ] **Z2.4** Galerie : un geste `ouvrirLaPremierePalette` (clic sur
  `.selecteur-bouton`, puis sur la première option) ajouté à chaque état qui
  montrait une palette. Tests d’interface : `ouvrirSur` ouvre la première
  palette, sauf demande contraire. Aucun état ni test ne change de sujet.
- [ ] **Z2.5** Tests : ouverture sans palette choisie, avec le libellé du
  sélecteur et l’invitation ; choix d’une palette depuis l’invitation ;
  retour à l’état vide quand la palette ouverte disparaît ; Réglages
  communs sans palette.

Critère : à chaque ouverture du plugin, l’onglet Création attend un choix,
et deux gestes mènent à une palette.

## Lot Z3 : maquettes à valider

Produites dans `MAQUETTES-RECETTE-V6.html`, que `generer-maquettes-v6.mjs`
écrit sur le modèle de `generer-maquettes-v5.mjs` : panneau à 850 px, thème
sombre de Figma, couleurs et ratios calculés par le moteur pour `#1E6FD9`,
`#16A34A`, `#DC2626` et `#A0B599`. Chaque question a son bloc, ses écrans
lettrés au-dessus de ses choix, la disposition en place d’abord, une
recommandation ensuite. Textes courts, une ligne par légende. Chaque texte
proposé au designer l’est en plusieurs rédactions côte à côte.

- [ ] **Z3.1** Ajuster la référence. Montrer d’abord le parcours en place,
  du lien au panneau, avec une référence qui manque deux garanties dans un
  thème. Puis au moins trois formes :
  A, le panneau dans le sélecteur, réorganisé : une phrase qui dit pourquoi
  en tête, les garanties avant et après en tableau, les annonces des pas
  regroupées ;
  B, un panneau pleine largeur sous la rangée de la référence, dans la
  carte de configuration ;
  C, le geste porté par la garantie manquée, dans la carte Garanties, avec
  la proposition qui la répare.
  Pour chacune : le texte du lien et la phrase qui explique (plusieurs
  rédactions, fondées sur `[MOT-17]`), ce qui se retire, ce qui reste,
  l’état après « Appliquer ». Recommander une forme.
- [ ] **Z3.2** Garanties de contraste. Montrer la carte en place à 850 px,
  une palette à deux intensités, une garantie choisie, une garantie en
  échec. Puis au moins deux dispositions qui répondent à chaque point du
  retour : codes des rôles (`text`, `on-solid`) à la taille du texte et
  distincts ; case d’état assez large pour que le badge ne passe jamais à
  la ligne, au ratio le plus long ; états nommés une fois par groupe, en
  tête de colonne ; rangée choisie marquée sans trait collé au texte ;
  groupes par minimum séparés ; rangée d’un seul état plus basse. Donner la
  hauteur de la carte dans chaque disposition, contre celle d’aujourd’hui.
- [ ] **Z3.3** Onglet Création sans palette choisie : la disposition, le
  libellé du sélecteur, et trois rédactions de l’invitation avec des
  palettes. Sans palette, le panneau de création actuel, et une rédaction
  de remplacement si l’invitation change son texte.

Second passage dans le même fichier après les retours, jusqu’à validation.

Premier passage produit : les écrans sont le DOM de la
galerie construite, réorganisé dans Chromium, et chaque proposition est un
prototype des règles CSS que Z5 et Z6 écriront. Recommandations soumises :
Z3.1 forme B, lien b, explication b ; Z3.2 disposition G2 (968 px contre
1 310, 900 contre 1 264 sans échec, aucun badge à la ligne) ; Z3.3
disposition D1, invitation a, texte sans palette inchangé ; Q6.1 à Q6.5
comme recommandé. Les cases Z3 se cochent à la validation.

Critère : le mainteneur valide ou corrige chaque maquette sans imaginer une
interaction.

## Lot Z4 : glisser du sélecteur de couleur

- [ ] **Z4.1** Mesurer. Écrire `scripts/mesurer-glisser-couleur.mjs` sur le
  modèle de `mesurer-glisser.mjs` : dans Chromium, sur la galerie construite,
  cinquante mouvements dans la zone du sélecteur de la référence, puis dans
  le curseur de teinte, la durée médiane et maximale d’un `pointermove`, et
  le nombre de rendus par image. Même mesure pour un fond des Réglages
  communs. Reporter les chiffres ici.
- [ ] **Z4.2** Un rendu par image au plus pendant un glisser : la dernière
  couleur reçue se rend à la prochaine image, la fin du geste rend et range
  aussitôt. Le sélecteur peint sa zone et son code à chaque événement.
- [ ] **Z4.3** Remesurer. Si une image dépasse encore 16 ms, lister ce que le
  rendu coûte, partie par partie, et différer à la fin du geste ce qui ne
  suit pas le pointeur : garanties, interface de test, messages. Le
  nuancier suit le pointeur. Reporter les chiffres avant et après dans le
  message du commit.
- [ ] **Z4.4** Tests : pendant un glisser, un seul rendu par image ; la fin du
  geste range une seule fois, à la couleur du dernier mouvement ; Échap
  pendant un glisser se comporte comme aujourd’hui. Vus rouges sur
  mutation.

Critère : dans Figma, la zone du sélecteur suit le pointeur, et l’aperçu
suit sans retard visible.

## Lot Z5 : ajuster la référence

Après la validation de Z3.1.

- [ ] **Z5.1** Le lien et son explication selon Z3.1. Le lien ne paraît
  toujours qu’avec une garantie manquée (Y8.0).
- [ ] **Z5.2** Le panneau selon Z3.1 ; les textes retirés marqués retirés
  dans l’inventaire. `[UI-15]` récrit.
- [ ] **Z5.3** Tests : ceux de `tests/ajustement.test.ts` et les tests
  d’interface d’« Ajuster » repris, en gardant ce que chacun protégeait :
  rien ne change avant « Appliquer », « Annuler » et Échap rendent le focus,
  l’originale se garde et « Revenir à l’originale » la rend.

Critère : un designer qui voit le lien sait, avant de cliquer, quelle
garantie manque et pourquoi la référence doit bouger.

## Lot Z6 : garanties de contraste

Après la validation de Z3.2 et Z1.2.

- [ ] **Z6.1** La carte selon Z3.2, à une et à deux intensités, aux deux
  thèmes de palette. `[UI-09]` récrit.
- [ ] **Z6.2** Vérifier à 500 × 520 et à 850 × 720, au ratio le plus long
  (« ✗ 21:1 » et un badge AAA), qu’aucun badge ne passe à la ligne.
- [ ] **Z6.3** Tests : badge sur la même ligne que son ratio, à 500 px et à
  850 px ; nom de chaque état écrit une fois par groupe ; code d’un rôle à
  la taille du texte courant ; rangée choisie et focus visibles ; une
  garantie en échec garde ses liens. Vus rouges sur mutation.

Critère : le designer distingue les groupes d’un regard, et la carte d’une
palette sans échec tient dans moins de hauteur qu’aujourd’hui.

## Lot Z7 : recette et clôture

- [ ] **Z7.1** (ex-Y8.1) Reprendre les tests d’interface cassés, en gardant
  ce que chacun protégeait. Au mainteneur, sous Chromium.
- [ ] **Z7.2** Mettre à jour AGENTS.md si la carte du code change, la
  spécification et les liens des plans. Marquer les cases ouvertes du
  cinquième plan comme reprises ici.
- [ ] **Z7.3** (ex-Y8.3) Constater dans Figma qu’un seul Ctrl+Z après
  « Supprimer définitivement » rend le cadre et son suivi. Au mainteneur.
- [ ] **Z7.4** (ex-Y8.4) Construire code et interface dans la copie
  partagée, recharger le plugin, puis exécuter la recette ci-dessous. Au
  mainteneur.
- [ ] **Z7.5** (ex-Y8.5) Mesurer dans Figma le temps et le nombre de calques
  d’une génération de douze palettes ; appliquer `[PLA-24]`. Au mainteneur.

Critère de clôture : contrôles du dépôt, typecheck, build, tests d’interface
de Palettes verts, et recette Figma terminée.

## Recette mainteneur

| Scénario | Résultat observable | Lots |
|---|---|---|
| Ouvrir le plugin sans taille rangée, puis avec 750 × 720 rangé | 850 × 720 dans les deux cas ; aucune marge vide à droite des cartes | Z1 |
| Lire la barre d’onglets | « Création » puis « Palettes » | Z1 |
| Ouvrir le plugin sur un fichier qui a des palettes | « Sélectionner une palette » et l’invitation ; aucune palette ouverte | Z2 |
| Ouvrir le plugin sur un fichier sans palette | Le panneau de création | Z2 |
| Glisser vite dans la zone du sélecteur de la référence | La zone et l’aperçu suivent le pointeur ; une seule entrée dans l’historique de Figma | Z4 |
| Choisir une référence qui manque une garantie | Le lien et son explication ; le panneau validé en Z3.1 | Z5 |
| Lire les Garanties d’une palette à deux intensités | Codes lisibles, badges sur une ligne, groupes distincts | Z6 |
| Lire l’onglet Palettes avec un cadre de chaque état | « À actualiser » et « Pas encore sur Figma » en orange, « À jour » sur fond vert, « Actualiser tout (N palettes) » | Z1 |
| Ouvrir la configuration d’une palette | Code hexa sur toute sa colonne ; « Intensités » en segments, comme « Modèle » | Z1 |

La recette visuelle couvre 500 × 520 et 850 × 720, les deux thèmes de Figma,
les deux thèmes de palette, une et deux intensités, un nom long et plusieurs
garanties en échec.

## Questions au mainteneur

| Question | Ce qui en dépend | Recommandation |
|---|---|---|
| **Q6.1** Les identifiants de code gardent-ils les anciens noms (`ongletPalettes.ts` pour l’onglet Création, `ongletPlanche.ts` pour l’onglet Palettes) ? | Z1.3, Z0.4 | Oui, avec la correspondance dans AGENTS.md et CONTRIBUTING.md. Renommer toucherait 94 tests et 63 états, et `palettes` changerait de sens |
| **Q6.2** Libellés des segments des intensités : « Une · Deux » ou « Une intensité · Deux intensités » ? | Z1.7 | « Une · Deux », sous le libellé « Intensités », comme « Standard · Libre » sous « Modèle » |
| **Q6.3** Après la suppression de la palette ouverte : la suivante s’ouvre, ou l’onglet revient sans palette ? | Z2.1 | La suivante, comme aujourd’hui |
| **Q6.4** « Actualiser tout » génère aussi les palettes « Pas encore sur Figma ». Le libellé convient-il ? | Z1.4 | Oui : les deux états partagent désormais l’orange, et le geste les traite ensemble |
| **Q6.5** Le code hexa prend-il aussi toute la largeur dans la carte de création ? | Z1.6 | Oui : la création et la configuration gardent la même disposition (décision Y2.1) |

## Hors périmètre

- Moteur, recette et format de la planche.
- Nombre de nuances, courbes et fonds des Réglages communs, hors largeur.
- Relecture des textes hors de ce plan.

## Retours du mainteneur, round 6

Texte d’origine, indentation rétablie d’après la structure des sujets.

```text
Retours round 6 :

Général :
  aggrandi le plugin de 100px en largeur et fait en sorte que le
  contenu s'adapte à la largeur
  Renomme l'onglet "Palettes" en "Création" et l'onglet "Planches" en
  "Palettes"
  Par défaut, l'onglet "Création" n'a aucune palette de sélectionnée, il
  est donc quasiment vide et le dropdown affiche "sélectionner une
  palette"
    On affiche un message CTA/onboarding simple qui invite à
    sélectionner une teinte existante (si pertinent) ou à en créer une
    nouvelle
  Quand on drag une couleur dans le widget color picker ça lag, c'est
  pas du tout fluide
  Revoir tout le workflow "ajuster la référence"
    on comprend pas pourquoi il faut "Ajuster la référence", c'est pas
    expliqué
    le menu d'ajustement a trop de texte, et n'est pas assez bien
    organisé, on ne comprend pas. Les textes sont mal gérés aussi.
    nécessite une nouvelle maquette claude à valider

Onglet "Planches" (Palettes)
  Changer wording "à mettre à jour" en "à actualiser"
  mettre le tag "Pas encore sur figma" en warning orange
  mettre le tag "à jour" avec un fond vert pour faire comme les autres
  tags de couleur
  Changer wording action "Mettre à jour (2 palettes)" en "Actualiser
  tout (2 palettes)

Zone de configuration de la palette :
  Faire en sorte que la zone d'input hexa prenne toute la width dispo
  Intensités :
    mettre le même widget de switch à bascule que le modèle

Zone Garanties de contraste
  il faut revoir tout le layout car il y'a des soucis :
    les libélés "text", "on-solid" etc sont un peu trop petit par rapport
    au reste du texte et on distingue mal leur singularité
    à plusieurs endroits les tags "AAA" passent à la ligne et c'est
    moche, ça casse le layout
    les mentions "default" "hover" "active" etc pourraient être mieux
    affichées, c'est pas très propre là
    quand on clique sur une tile, le border right qui est affiché est pas
    terrible, c'est trop proche du texte et ça pourrait être plus joli
    Les éléments affichés pourraient être mieux organisés d'un point
    de vu global car on ne distingue même pas spécialement les
    différentes sections. Et tout prend beaucoup de place pour
    certaines nuances
```
