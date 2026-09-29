# UCM Palettes : plan d’ergonomie, sixième tour

## Résultat attendu

Le panneau s’ouvre à 770 × 720 et son contenu occupe la largeur gagnée.
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
3. les maquettes du lot Z3 (`MAQUETTES-RECETTE-V6.html`), toutes
   validées : Z3.1 forme A, Z3.2 G2, Z3.3 D1, Z3.4 M2, Z3.5 N2. Les règles
   `v6-` de `generer-maquettes-v6.mjs` sont les prototypes des règles CSS
   de Z5.2 et Z6.1, et `ajusterEnModale` celui de la modale ;
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
| Fenêtre | 770 × 720 par défaut, sur le [retour du mainteneur en cours de lot](#retour-du-mainteneur-lot-z1) : 850 px rendait tout trop grand. Le plus petit format reste 500 × 520. Une taille rangée à 600, 650 ou 750 × 720 s’ouvre à 770 × 720 ; toute autre taille rangée se garde |
| Largeur du contenu | Aucun bloc ne garde une largeur fixe pensée pour 750 px quand la place existe. Les largeurs fixes qui servent un alignement (colonnes de nuances, pastilles) se gardent. Le sélecteur de couleur garde 232 px pour « Choisir » ; « Ajuster » passe en modale (Z3.4, M2) |
| Onglets | Libellés « Création » et « Palettes ». Les identifiants (`palettes`, `planche`), les panneaux, les modules (`ongletPalettes.ts`, `ongletPlanche.ts`) et `data-geste` ne changent pas (Q6.1). AGENTS.md et CONTRIBUTING.md donnent la correspondance |
| Palette ouverte à l’ouverture | Aucune. Le sélecteur écrit « Sélectionner une palette ». Le menu de la palette (dupliquer, monter, descendre, supprimer) se cache. « Nouvelle palette » reste. La palette choisie dure jusqu’à la fermeture du plugin et ne se range pas |
| Invitation | Sous le sélecteur, sans palette choisie et avec des palettes : le titre « Choisissez une palette », puis « Sélectionnez une palette dans la liste pour la régler, ou créez-en une avec « Nouvelle palette ». » (disposition D1, texte a). Pas de bouton dans l’invitation : les gestes sont ceux de la barre. Sans palette, le panneau de création actuel, et son texte ne change pas (Z3.3, question 3, a) |
| Palette supprimée | La palette suivante s’ouvre, comme aujourd’hui (Q6.3) |
| Glisser dans le sélecteur de couleur | Un rendu par image au plus pendant un glisser. La fin du geste rend et range comme aujourd’hui. Si une image dépasse encore son budget, les parties lourdes (garanties, interface de test, messages) attendent la fin du geste ; l’aperçu suit le pointeur |
| Ajuster la référence | Forme A (Z3.1) : le panneau reste ouvert depuis la pastille de la référence, réorganisé. En tête, la phrase qui dit pourquoi, rédaction b : « La nuance 600 est exactement votre couleur. En Thème Light, elle est trop claire pour les bordures de champ et l’anneau de focus sur fond léger : 2,92:1 pour un minimum de 3:1. » Puis les deux témoins, les pas, une ligne pour la nuance visée et les annonces des pas, le code, les garanties avant et après en tableau, et le bilan par intensité. La luminosité se retire. Sous le code, avec une garantie manquée : « ✗ 2 garanties manquées en Thème Light » en couleur de danger, puis « Ajuster la référence » (lien b). Présentation M2 (Z3.4) : une modale centrée au-dessus du panneau, sur un voile assombri, 520 px de large au plus et 16 px de marge à la fenêtre (468 px à 500 px) ; elle tient dans la fenêtre et défile en elle-même si la hauteur manque. Le tableau a ses colonnes (garantie, thème, avant, après) à 770 px ; à 500 px, le thème et l’intensité passent en titre et chaque garantie tient sur une ligne. « Annuler », Échap, « Appliquer » et un clic sur le voile la referment ; le focus revient au lien, ou au code quand le lien disparaît (Y8.0). Le sélecteur de couleur perd son onglet « Ajuster » (Q6.6) : la modale s’ouvre par le lien et par l’action `ajuster-reference` des messages |
| Pastilles d’état | « À actualiser » et « Pas encore sur Figma » : fond et texte d’avertissement. « À jour » : fond de succès, texte de succès. « Cadre introuvable » et « Lecture impossible » gardent le danger |
| Libellés de l’onglet Palettes | « À actualiser » partout où « À mettre à jour » s’écrivait. « Actualiser tout (N palettes) » remplace « Mettre à jour (N palettes) », singulier gardé. « Générer tout (N palettes) » ne change pas |
| Code hexa | Il prend toute la largeur de sa colonne, dans la configuration et dans la création, qui gardent la même disposition (Q6.5) |
| Intensités dans la configuration | Segments `.bascule-de-base`, libellé « Intensités » au-dessus, comme « Modèle ». Libellés « Une · Deux » (Q6.2). Dessous, inchangés : l’aide, « Intensité : 0,89 » à une intensité, « Référence exacte dans » à deux. La création garde ses deux cartes |
| Garanties de contraste | Disposition G2 (Z3.2) : un encadré par groupe de minimum, son titre en bandeau ; les états nommés une fois en tête de colonne ; dans chaque case, le spécimen à gauche des numéros et du ratio, le badge sur la ligne du ratio ; les codes des rôles en 11 px sur fond ; la rangée choisie sur fond, marquée d’une barre de 3 px écartée du texte. Sous 700 px, disposition N2 (Z3.5) : chaque rangée garde le nom et ses trois états sur une ligne, les cases d’état passent à 92 px, le spécimen se pose au-dessus des numéros et du ratio, et le nom de chaque état se centre sur sa colonne ; aucun badge ne passe à la ligne, « ✗ 21,00 » et « AA ✗ » compris. Le contenu ne change pas : associations, états, ratios, niveaux WCAG, réglettes, liens des garanties en échec |

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
| Aucune palette à l’ouverture | Z2 | Z1.3 (textes de Z3.3 validés) |
| Maquettes à valider | Z3 | Second passage : Z3.4 et Z3.5 ; en parallèle de Z1 |
| Glisser du sélecteur de couleur | Z4 ; reprise Z4.5 à Z4.9 | Z0 ; en parallèle de Z1 |
| Ajuster la référence | Z5 | Z3.4 validée |
| Garanties de contraste | Z6 | Z3.5 validée, Z1.2 |
| Recette et clôture | Z7 | Lots finis |

Z3.4 et Z3.5 sont validées : Z4.5, Z5.2 et Z6.1 peuvent commencer. Une
autre session traduit l’interface (`src/i18n/`,
`localisation.ts`) et modifie sans les commiter `selecteur.ts`,
`couleur/selecteur.ts`, `ongletPalettes.ts`, `nuancier.ts`, `ajustement.ts`,
`garanties.ts`, `configuration.ts` et `textes.ts`. Z4.6 à Z6 touchent ces
fichiers : l’agent attend le commit de cette traduction, ou le confirme par
`git status`, avant d’y écrire. Il écrit alors ses textes par la voie que la
traduction a posée.

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
- [x] **Z0.3** (fait avec Z1 et Z2 ; `[UI-09]` et `[UI-15]` attendent leurs
  lots) Spécification : `[UI-01]` (770 × 720, anciens défauts),
  `[UI-02]` et `[UI-04]` (noms des onglets), `[UI-06]` (sélecteur sans
  palette), `[UI-11]` (code hexa, segments des intensités), `[UI-05]` et
  `[PLA-20]` (pastilles et libellés). Chaque mention d’un onglet relue une à
  une : « Palettes » désigne désormais l’ancien onglet Planches.
  `[UI-09]` et `[UI-15]` se récrivent avec leurs lots.
- [x] **Z0.4** CONTRIBUTING.md, « Les surfaces d’UCM Palettes » : noms des
  onglets, correspondance avec les modules, état sans palette. AGENTS.md :
  la carte du code dit `ongletPalettes.ts` « l’onglet Création » et
  `ongletPlanche.ts` « l’onglet Palettes ».
- [ ] **Z0.5** (N130 à N134 ; les textes de Z5 entrent avec leur lot)
  Inventaire des textes : « Création », « Palettes » (onglet),
  « Sélectionner une palette », « À actualiser », « Actualiser tout (N
  palettes) », dictés ; « À mettre à jour » et « Mettre à jour (N
  palettes) » marqués retirés. Les textes des maquettes entrent « À
  valider ».
- [x] **Z0.6** (fait : `sans-palette-choisie` et `pastilles-des-etats`,
  atteignables ; `ajuster-en-modale` attend Z5.2, `garanties-refaites` Z6.1)
  Déclarer dans `galerie/etats.cjs` les états de ce plan, chacun
  avec la case qui le rendra atteignable : onglet Création sans palette
  choisie, avec des palettes (Z2) ; panneau « Ajuster » refait (Z5) ;
  Garanties refaites (Z6) ; pastilles des cinq états (Z1.5).

Critère : l’agent place chaque élément de Z1 à partir de la spécification et
de CONTRIBUTING.md, sans relire ce plan.

## Lot Z1 : corrections directes

Fichiers : `fenetre.ts`, `styles.css`, `textes.ts`, `champs.ts`,
`ongletPalettes.ts`, `ongletPlanche.ts`, `plugin-socle/src/ui/socle.css`,
tests voisins et `tests/interface/interface.test.mjs`.

- [x] **Z1.1** Fenêtre à 770 × 720 par défaut ; 750 × 720 rejoint
  `ANCIENS_DEFAUTS`. Reprendre les tests de `fenetre.ts`, `PAR_DEFAUT` des
  tests d’interface et la taille par défaut de la galerie. `[UI-03]` se
  vérifie aux deux tailles.
  Fait à 770 × 720 : 850 × 720 a été construit, puis refusé par le
  mainteneur. Aucune version à 850 × 720 n’a atteint `dist/code.js` : aucune
  taille rangée à 850 ne se reprend.
- [x] **Z1.2** Chaque bloc listé en Z0.2 prend la largeur disponible, sauf
  les Garanties, qui attendent Z6. Vérifier à 500 × 520 que rien ne
  déborde et à 850 × 720 que rien ne reste à sa largeur de 750 px.
  Mesuré dans les deux galeries construites, 58 états chacune : aucun
  débordement horizontal à 500 ni à 770 px, et chaque carte de premier
  niveau suit la largeur du panneau. Seul le code hexa changeait (Z1.6).
- [x] **Z1.3** Onglets « Création » et « Palettes » : les deux libellés, les
  trois textes qui nomment un onglet, les commentaires qui en nomment un.
  Identifiants, panneaux et modules inchangés. Le test « la fenêtre s’ouvre
  sur l’onglet Palettes » vise l’onglet « Création ».
- [x] **Z1.4** « À actualiser » dans les quatre textes qui écrivaient « À
  mettre à jour » ; `genererLesPalettesPasAJour` rend « Actualiser tout (N
  palettes) ».
- [x] **Z1.5** Ajouter au socle `--fond-succes`, aux deux thèmes, sur
  `--figma-color-bg-success-tertiary` avec un repli de chaque thème.
  Mesurer le contraste de `--texte-succes` sur ce fond, 4,5:1 au moins aux
  deux thèmes, et le noter ici. Pastille « À jour » : fond de succès.
  Pastille « Pas encore sur Figma » : fond et texte d’avertissement. UCM
  Exporter ne pose pas le jeton : sa suite reste verte, et sa galerie ne
  change pas (preuve sur le DOM, pas sur les captures).
  Fait. Replis et décalque : `#e3f6e9` au thème clair, `#1d3a28` au thème
  sombre. `--texte-succes` n’y tient que 3,84:1 au clair : le vert du socle
  tient 4,33:1 sur du blanc au plus, aucun fond vert ne lui donne 4,5:1. La
  pastille mêle donc `--texte-succes` à 80 % avec `--texte` : 5,07:1 au
  clair, 8,54:1 au sombre. L’avertissement tient 4,59:1 et 7,03:1. Aucune
  feuille d’UCM Exporter ne lit `--fond-succes` ; sa suite reste verte.
  Le contraste réel se vérifie dans Figma, qui sert ses propres variables.
- [x] **Z1.6** Code hexa sur toute la largeur de sa colonne, dans la
  configuration et dans la création. La pastille garde sa taille ; le champ
  garde `tabular-nums`. Vérifier à 500 × 520 que la rangée du nom et de la
  référence tient.
- [x] **Z1.7** Intensités de la configuration en segments `.bascule-de-base`,
  « Une · Deux » (Q6.2). Le composant garde l’API de
  `createInterrupteurDesIntensites` (`poser`, `base`, `element`) ; renommer
  s’il ne s’agit plus d’un interrupteur. Les deux tests Y4.8 passent par les
  segments. Une palette libre n’a toujours pas ce choix.
  Fait : `createSegmentsDesIntensites`. Sous les segments, l’aide du choix
  pressé (N119), puis sa suite.
- [x] **Z1.8** Tests : taille par défaut et reprise de 750 × 720 ; libellés
  des onglets ; libellé du geste global au singulier et au pluriel ; fond de
  chaque pastille par sa couleur calculée, « À jour » distinct de
  `--fond-note` ; largeur du code hexa égale à celle de sa colonne, moins la
  pastille ; segments des intensités, `aria-pressed` et effet sur la palette.
  Fait, chaque test vu rouge sur une mutation de la ligne qu’il garde (dix
  mutations). Suite d’interface : 96 verts.

Critère : à 770 × 720, aucun bloc de Z0.2 ne laisse de marge vide à droite,
et l’onglet Palettes se lit aux libellés et couleurs dictés.

## Lot Z2 : aucune palette à l’ouverture

Après Z1.3 et la validation des textes de Z3.3.

- [x] **Z2.1** `ouverte()` sans repli sur la première palette. Sans palette
  choisie : le sélecteur porte « Sélectionner une palette », le menu de la
  palette se cache, la vue de la palette se cache, l’invitation paraît. Un
  `idOuvert` qui ne désigne plus aucune palette (import, autre session)
  ramène à cet état.
- [x] **Z2.2** L’invitation selon Z3.3, avec des palettes. Sans palette, le
  panneau de création actuel reste ; son texte suit Z3.3 s’il change.
- [x] **Z2.3** Vérifier sans palette choisie : Réglages communs (aperçu de
  la palette ouverte, fonds proposés, effet du contenu des planches),
  « Modifier » d’une fiche de l’onglet Palettes, création puis ouverture de
  la palette créée, suppression, import.
  Vérifié par les tests : les Réglages communs n’ont ni aperçu ni palette
  nommée, et l’effet du contenu des planches ne cite aucun cadre ;
  « Modifier » ouvre sa palette ; la création ouvre la palette créée ; la
  suppression ouvre la suivante ; un état relu sans la palette choisie
  ramène à l’invitation. Une duplication refusée puis rechargée y ramène
  aussi, la copie n’ayant jamais été rangée.
- [x] **Z2.4** Galerie : un geste `ouvrirLaPremierePalette` (clic sur
  `.selecteur-bouton`, puis sur la première option) ajouté à chaque état qui
  montrait une palette. Tests d’interface : `ouvrirSur` ouvre la première
  palette, sauf demande contraire. Aucun état ni test ne change de sujet.
  Fait : `avecLaPremierePalette` l’ajoute aux 55 états dont le premier état
  lu porte des palettes ; huit tests qui envoyaient eux-mêmes l’état
  l’appellent.
- [x] **Z2.5** Tests : ouverture sans palette choisie, avec le libellé du
  sélecteur et l’invitation ; choix d’une palette depuis l’invitation ;
  retour à l’état vide quand la palette ouverte disparaît ; Réglages
  communs sans palette.
  Fait : quatre tests, vus rouges sur sept mutations. Interface : 100 verts.

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

- [x] **Z3.1** Ajuster la référence. Montrer d’abord le parcours en place,
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
- [x] **Z3.2** Garanties de contraste. Montrer la carte en place à 850 px,
  une palette à deux intensités, une garantie choisie, une garantie en
  échec. Puis au moins deux dispositions qui répondent à chaque point du
  retour : codes des rôles (`text`, `on-solid`) à la taille du texte et
  distincts ; case d’état assez large pour que le badge ne passe jamais à
  la ligne, au ratio le plus long ; états nommés une fois par groupe, en
  tête de colonne ; rangée choisie marquée sans trait collé au texte ;
  groupes par minimum séparés ; rangée d’un seul état plus basse. Donner la
  hauteur de la carte dans chaque disposition, contre celle d’aujourd’hui.
- [x] **Z3.3** Onglet Création sans palette choisie : la disposition, le
  libellé du sélecteur, et trois rédactions de l’invitation avec des
  palettes. Sans palette, le panneau de création actuel, et une rédaction
  de remplacement si l’invitation change son texte.

Second passage dans le même fichier après les retours, jusqu’à validation.

Premier passage : les écrans sont le DOM de la galerie construite,
réorganisé dans Chromium, et chaque proposition est un prototype des règles
CSS que Z5 et Z6 écriront. Réponses du mainteneur, conservées [en fin de
plan](#retours-du-mainteneur-maquettes-du-lot-z3) : Z3.1 forme A, lien b,
phrase b « en forme de modal, pas pleine page » ; Z3.2 G2 à 850 px, mais
la version étroite est refusée ; Z3.3 D1, texte a, texte sans palette a ;
Q6.1 à Q6.5 comme recommandé. Second passage, dans le même fichier, et ses
réponses [en fin de plan](#retours-du-mainteneur-second-passage-du-lot-z3) :

- [x] **Z3.4** Ajuster la référence en modale. La forme A et la phrase b,
  dans le cas de Vert, en deux présentations : M1, le panneau d’aujourd’hui
  sous la pastille, à 232 px ; M2, une modale posée au-dessus du panneau,
  plus large, le fond assombri, que « Annuler », Échap et « Appliquer »
  referment en rendant le focus à la pastille. Pour chacune : la largeur, le
  nombre de lignes de la phrase et du tableau, ce que la modale laisse voir
  de la configuration. Si « modal » désignait autre chose que M2, le
  mainteneur le dit sur ces écrans.
  Produit, à 770 px et à 500 px, attend la réponse. M1 : 232 px, la phrase
  sur 6 lignes, chaque garantie sur deux, le panneau 89 px sous la fenêtre
  (289 px à 500 px) ; il couvre le code et l’aperçu. M2, recommandée :
  520 px, la phrase sur 3 lignes, le tableau en colonnes, tout dans la
  fenêtre, à 500 px aussi (468 px). Réponse : M2. L’onglet « Ajuster » du
  sélecteur se retire (Q6.6).
- [x] **Z3.5** Garanties à 500 px sans retour à la ligne. G2 à 500 px, où
  chaque rangée garde le nom et ses états sur une même ligne, en au moins
  deux dispositions : N1, le nom français sous le code, le spécimen réduit,
  des cases d’état plus étroites ; N2, le spécimen au-dessus des numéros et
  du ratio dans les cases étroites, comme G1. Vérifier au ratio le plus
  long (« ✗ 21:1 » et un badge AAA) et donner la hauteur de la carte.
  Produit, attend la réponse. À 500 px, aucun badge à la ligne en N1 ni en
  N2, avec « ✗ 21,00 » et « AAA » ou « AA ✗ » dans chaque case. Hauteur,
  Bleu avec un échec : aujourd’hui 1 284 px et quatre badges à la ligne ;
  N1 1 390 px, le nom écrasé (« border- / control ») ; N2, recommandée,
  1 248 px. G2 à 770 px : 978 px, aucun badge à la ligne. Réponse : N2.

Critère : le mainteneur valide ou corrige chaque maquette sans imaginer une
interaction.

## Lot Z4 : glisser du sélecteur de couleur

- [x] **Z4.1** Mesurer. Écrire `scripts/mesurer-glisser-couleur.mjs` sur le
  modèle de `mesurer-glisser.mjs` : dans Chromium, sur la galerie construite,
  cinquante mouvements dans la zone du sélecteur de la référence, puis dans
  le curseur de teinte, la durée médiane et maximale d’un `pointermove`, et
  le nombre de rendus par image. Même mesure pour un fond des Réglages
  communs. Reporter les chiffres ici.
  Mesuré à 770 × 720 dans Chromium, avant correction, médiane et pire d’un
  `pointermove`, quatre mouvements par image : référence, zone, 3,6 et
  8,6 ms ; teinte, 3,3 et 6,9 ms ; zone avec Dérive, Garanties et Interface
  de test dépliées, 8,0 et 19,2 ms ; fond des Réglages communs, 7,6 et
  13,9 ms. Chaque mouvement rendait tout l’onglet : 4 rendus par image
  synthétique. Un glisser réel de la souris de Playwright donne un
  mouvement par image (201 rendus pour 202 images) : Chromium aligne déjà
  la souris sur les images, et le retard vient du coût d’un rendu.
  JavaScript d’un rendu, cartes dépliées : analyse 0,59 ms, nuancier 0,46,
  garanties 1,04, dérive 0,54, interface de test 0,32, messages 0,05 ; le
  reste des 8 ms est la mise en page forcée.
- [x] **Z4.2** Un rendu par image au plus pendant un glisser : la dernière
  couleur reçue se rend à la prochaine image, la fin du geste rend et range
  aussitôt. Le sélecteur peint sa zone et son code à chaque événement.
- [x] **Z4.3** Remesurer. Si une image dépasse encore 16 ms, lister ce que le
  rendu coûte, partie par partie, et différer à la fin du geste ce qui ne
  suit pas le pointeur : garanties, interface de test, messages. Le
  nuancier suit le pointeur. Reporter les chiffres avant et après dans le
  message du commit.
  Aucune image ne dépassait 16 ms dans Chromium, mais les cartes dépliées
  en approchaient, et Figma est plus lent : garanties, messages,
  intensités, dérive et interface de test attendent la fin du geste
  quand même. Après : un `pointermove` coûte 0,2 ms (pire 2,7), l’image
  qui rend l’aperçu 1,4 ms (pire 2,3), cartes dépliées comprises ; le fond
  des Réglages communs, 6,1 ms (pire 7,6), le rendu des Réglages eux-mêmes.
  Un rendu par image. L’ordre des rangements ne change pas : le relâcher
  range une fois, après le dernier aperçu ; aucune revue n’a été demandée.
- [x] **Z4.4** Tests : pendant un glisser, un seul rendu par image ; la fin du
  geste range une seule fois, à la couleur du dernier mouvement ; Échap
  pendant un glisser se comporte comme aujourd’hui. Vus rouges sur
  mutation.
  Fait : trois tests, vus rouges sur six mutations. Une mutation de
  `valider` restait verte, le rangement relançant lui aussi un rendu
  complet : le garde-fou muté est le retour au rendu complet après
  l’aperçu seul.

Reprise après la recette du mainteneur : dans Figma, le glisser lag
toujours. La revue du lot relève quatre causes, lues dans le code et non
encore mesurées :

| Cause | Source |
|---|---|
| `mesurer-glisser-couleur.mjs` ne chronomètre que le JavaScript des rappels d’image, dans Chromium à pleine vitesse. Style, mise en page et peinture n’entrent pas dans ses chiffres, et Z4.3 n’a pas été constaté dans Figma | `scripts/mesurer-glisser-couleur.mjs`, `travail` |
| `rendreLApercu` programme un rendu complet 150 ms après chaque mouvement. Il part à chaque pause du pointeur, bouton enfoncé, et rend garanties, messages, dérive et interface de test en plein geste | `ongletPalettes.ts`, `DELAI_DU_RENDU_COMPLET`, `rendreLApercu` |
| Chaque image d’aperçu reconstruit la grille du nuancier, ses accolades et son détail, puis le bouton et toutes les options de la liste des palettes. Le sélecteur flotte au-dessus de l’aperçu avec une ombre floue de 32 px, sans calque propre, et ses repères bougent par `left` et `top` | `nuancier.ts`, `dessiner` ; `selecteur.ts`, `afficher` ; `styles.css`, `.selecteur-de-couleur`, `.selecteur-repere` |
| Un fond des Réglages communs valide la recette entière à chaque image, reconstruit l’aperçu compact et le tracé des courbes, et recalcule `garantieDesCourbes` (2 880 crans), dont le résultat ne dépend pas des fonds. `previsualiser` rend en plus l’onglet Création, caché. Z4.3 mesurait déjà 6,1 ms de JavaScript par image | `configuration.ts`, `proposer`, `rendreLesVues` ; `ongletPalettes.ts`, `previsualiser` |

- [ ] **Z4.5** Mesurer l’image entière. Étendre
  `mesurer-glisser-couleur.mjs` : durée de chaque image pendant un glisser
  réel, style, mise en page et peinture compris (entrées
  `long-animation-frame`, ou trace de performance de Chromium), sous un
  processeur ralenti ×4 et ×6 (`Emulation.setCPUThrottlingRate`). Trois
  cas : référence avec cartes repliées, référence avec Dérive, Garanties et
  Interface de test dépliées, fond des Réglages communs. Ajouter un
  glisser avec des pauses de 300 ms. Reporter les chiffres ici avant
  toute correction.
- [ ] **Z4.6** Aucun rendu complet avant la fin du geste. Retirer le
  délai de 150 ms. Le sélecteur signale au contrôle la fin d’un glisser
  qui n’enregistre rien (Échap, fermeture, pointeur perdu) ; le contrôle
  rend alors tout, sans ranger. Le relâcher range une fois, comme
  aujourd’hui.
- [ ] **Z4.7** Un aperçu sans reconstruction. Tant que les crans, les
  intensités, le thème et le modèle ne changent pas, le nuancier repeint
  ses pastilles en place (fond, encre, repère ◆, étiquettes) ; accolades
  et détail ne se refont que si leur entrée change. Pendant l’aperçu, la
  barre ne met à jour que la pastille du bouton de la liste. Le sélecteur
  de couleur prend son propre calque, et ses repères bougent par
  `transform`. Mesurer chaque changement : celui qui ne fait rien gagner
  se retire.
- [ ] **Z4.8** Le fond des Réglages communs. Pendant le glisser, seuls
  l’aperçu compact et l’aperçu de l’onglet suivent le pointeur. Tracé des
  courbes, `garantieDesCourbes` et rendu de l’onglet Création caché
  attendent la fin du geste. Une validation retirée de l’aperçu doit
  rester vraie par construction : `poserFond` ne rend qu’un hexa valide.
- [ ] **Z4.9** Remesurer les cas de Z4.5, sous ralentissement ×4 et ×6 :
  aucune image au-dessus de 16 ms, et aucun rendu complet pendant un
  glisser avec pauses. Tests : pause de 300 ms bouton enfoncé, aucun rendu
  complet ; Échap pendant un glisser, un rendu complet et aucun rangement ;
  nuancier repeint sans nouvel élément ; fond des Réglages, garantie des
  courbes calculée une fois par geste. Chacun vu rouge sur mutation.
  Reconstruire le plugin dans la copie partagée, puis confier la recette
  Figma au mainteneur. La case ne se ferme qu’après son retour.

Critère : dans Figma, la zone du sélecteur suit le pointeur, et l’aperçu
suit sans retard visible. Le mainteneur le constate ; une mesure dans
Chromium ne ferme pas le lot.

## Lot Z5 : ajuster la référence

Après la validation de Z3.1.

- [x] **Z5.1** Sous le code, « ✗ N garanties manquées en Thème X » en
  couleur de danger, puis « Ajuster la référence ». Les deux ne paraissent
  qu’avec une garantie manquée (Y8.0) ; avec des manques dans les deux
  thèmes, la ligne les compte ensemble.
  Fait avant Z3.4 : le texte est validé (lien b) et ne dépend pas de la
  présentation du panneau. Deux thèmes : « ✗ 3 garanties manquées en Thème
  Light et en Thème Dark », à valider (N135). Le lien décrit par cette
  ligne (`aria-describedby`). Tests vus rouges sur cinq mutations.
- [ ] **Z5.2** Le panneau selon la forme A, dans la modale M2 : titre
  « Ajuster la référence », la phrase b en tête, les deux témoins, les pas,
  une ligne pour la nuance visée et les annonces des pas, le code de la
  proposition, le tableau avant et après, le bilan par intensité, puis
  « Annuler » et « Appliquer ». Sans luminosité. Largeur, voile, focus et
  disposition à 500 px selon la [décision](#décisions), règles `.v6-voile`,
  `.v6-modale` et `.v6-aa*` du générateur à reprendre. Le reste de la
  page est `inert` pendant la modale, et Tab reste dans la modale. Le
  sélecteur de couleur perd son onglet « Ajuster » (Q6.6) : sa bascule
  d’onglets, `OngletDAjustement` et le choix d’onglet de
  `createPipette.ouvrir` se retirent ; le lien et l’action
  `ajuster-reference` ouvrent la modale. La phrase b ne couvre qu’un
  thème : pour une référence en échec dans les deux, l’agent propose
  plusieurs rédactions au mainteneur et attend son choix avant de
  l’écrire. L’état de galerie `ajuster-en-modale` (Z0.6)
  devient atteignable, à 770 et à 500 px. Les textes retirés sont marqués
  retirés dans l’inventaire. `[UI-15]` récrit.
- [ ] **Z5.3** Tests : ceux de `tests/ajustement.test.ts` et les tests
  d’interface d’« Ajuster » repris, en gardant ce que chacun protégeait :
  rien ne change avant « Appliquer », l’originale se garde et « Revenir à
  l’originale » la rend. S’y ajoutent : « Annuler », Échap et un clic sur
  le voile referment sans rien changer ; les trois gestes de fermeture et
  « Appliquer » rendent le focus au lien, ou au code quand le lien
  disparaît ; Tab ne sort pas de la modale ; à 500 px la modale tient dans
  la fenêtre ; la pastille n’ouvre plus que « Choisir ». Chacun vu rouge
  sur mutation.

Critère : un designer qui voit le lien sait, avant de cliquer, quelle
garantie manque et pourquoi la référence doit bouger.

## Lot Z6 : garanties de contraste

Après la validation de Z3.2 et Z1.2.

- [ ] **Z6.1** La carte selon G2 à 770 px et selon N2 (Z3.5) sous 700 px,
  à une et à deux intensités, aux deux thèmes de palette. Règles `.v6-g2`
  et `.v6-n2` du générateur à reprendre. L’état de galerie
  `garanties-refaites` (Z0.6) devient atteignable. `[UI-09]` récrit.
- [ ] **Z6.2** Vérifier à 500 × 520 et à 770 × 720, au ratio le plus long
  (« ✗ 21:1 » et un badge AAA), qu’aucun badge ne passe à la ligne.
- [ ] **Z6.3** Tests : badge sur la même ligne que son ratio, à 500 px et à
  770 px ; nom de chaque état écrit une fois par groupe ; code d’un rôle à
  la taille du texte courant ; rangée choisie et focus visibles ; une
  garantie en échec garde ses liens. Vus rouges sur mutation.

Critère : le designer distingue les groupes d’un regard, et la carte d’une
palette sans échec tient dans moins de hauteur qu’aujourd’hui.

## Lot Z7 : recette et clôture

- [x] **Z7.1** (ex-Y8.1) Reprendre les tests d’interface cassés, en gardant
  ce que chacun protégeait. Au mainteneur, sous Chromium.
  Fait par l’agent sous Chromium, lot par lot : 104 tests verts après Z5.1.
  Les tests que Z2 cassait ouvrent la première palette, comme le designer ;
  aucun ne change de sujet. Z5.2 et Z6 les reprendront pour leur part.
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
| Ouvrir le plugin sans taille rangée, puis avec 750 × 720 rangé | 770 × 720 dans les deux cas ; aucune marge vide à droite des cartes | Z1 |
| Lire la barre d’onglets | « Création » puis « Palettes » | Z1 |
| Ouvrir le plugin sur un fichier qui a des palettes | « Sélectionner une palette » et l’invitation ; aucune palette ouverte | Z2 |
| Ouvrir le plugin sur un fichier sans palette | Le panneau de création | Z2 |
| Glisser vite dans la zone du sélecteur de la référence, avec des pauses, cartes dépliées | La zone et l’aperçu suivent le pointeur sans à-coup ; une seule entrée dans l’historique de Figma | Z4 |
| Glisser dans le sélecteur d’un fond des Réglages communs | L’aperçu suit le pointeur sans à-coup | Z4 |
| Choisir une référence qui manque une garantie, puis « Ajuster la référence » | La ligne des garanties manquées et le lien ; la modale M2 ; Échap rend le focus au lien | Z5 |
| Lire les Garanties d’une palette à deux intensités | Codes lisibles, badges sur une ligne, groupes distincts | Z6 |
| Lire l’onglet Palettes avec un cadre de chaque état | « À actualiser » et « Pas encore sur Figma » en orange, « À jour » sur fond vert, « Actualiser tout (N palettes) » | Z1 |
| Ouvrir la configuration d’une palette | Code hexa sur toute sa colonne ; « Intensités » en segments, comme « Modèle » | Z1 |

La recette visuelle couvre 500 × 520 et 770 × 720, les deux thèmes de Figma,
les deux thèmes de palette, une et deux intensités, un nom long et plusieurs
garanties en échec.

## Questions au mainteneur

| Question | Ce qui en dépend | Recommandation | Réponse |
|---|---|---|---|
| **Q6.1** Les identifiants de code gardent-ils les anciens noms (`ongletPalettes.ts` pour l’onglet Création, `ongletPlanche.ts` pour l’onglet Palettes) ? | Z1.3, Z0.4 | Oui, avec la correspondance dans AGENTS.md et CONTRIBUTING.md. Renommer toucherait 94 tests et 63 états, et `palettes` changerait de sens | Recommandation retenue |
| **Q6.2** Libellés des segments des intensités : « Une · Deux » ou « Une intensité · Deux intensités » ? | Z1.7 | « Une · Deux », sous le libellé « Intensités », comme « Standard · Libre » sous « Modèle » | Recommandation retenue |
| **Q6.3** Après la suppression de la palette ouverte : la suivante s’ouvre, ou l’onglet revient sans palette ? | Z2.1 | La suivante, comme aujourd’hui | Recommandation retenue |
| **Q6.4** « Actualiser tout » génère aussi les palettes « Pas encore sur Figma ». Le libellé convient-il ? | Z1.4 | Oui : les deux états partagent désormais l’orange, et le geste les traite ensemble | Recommandation retenue |
| **Q6.5** Le code hexa prend-il aussi toute la largeur dans la carte de création ? | Z1.6 | Oui : la création et la configuration gardent la même disposition (décision Y2.1) | Recommandation retenue |
| **Q6.6** Avec la modale M2, l’onglet « Ajuster » du sélecteur de couleur se retire-t-il, ou ouvre-t-il la modale ? | Z5.2 | Le retirer : la pastille n’ouvre que « Choisir », la modale s’ouvre par le lien et par l’action des messages | Recommandation retenue |

## Hors périmètre

- Moteur, recette et format de la planche.
- Nombre de nuances, courbes et fonds des Réglages communs, hors largeur.
- Relecture des textes hors de ce plan.
- La taille de la fenêtre, suspendue par le mainteneur : le code ouvre à
  600 × 720 (`TAILLE_PAR_DEFAUT`), la décision Z1.1 et `[UI-01]` écrivent
  770 × 720. Aucun lot ne réaligne l’un sur l’autre, et les mesures
  gardent 770 et 500 px.

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

## Retour du mainteneur, lot Z1

Texte d’origine, après la construction du lot Z1 à 850 × 720.

```text
reviens sur la width d'avant, là tout est trop grand c'est moche. ajoute
juste 20px à la taille précédente
```

## Retours du mainteneur, maquettes du lot Z3

Texte d’origine, premier passage de `MAQUETTES-RECETTE-V6.html`. Sous
Z3.1, la ligne « b mais en forme de modal » suit la question 2 ; elle vise
la question 3, dont les écrans montraient la phrase dans la forme B.

```text
Question 1
A
Question 2
B
b mais en forme de modal, pas pleine page

Z3.2 · Garanties de contraste
Question 1
G2

Question 1 bis
G2 mais c'est pas terrible que ça passe à la ligne, ça fait vraiment fouilli

Z3.3 · Onglet Création sans palette choisie
Question 1
D1

Question 2
A

Question 3
A
Q6.1 à Q6.5
ok pour reco

Q6.1, Q6.3, Q6.4
ok reco
```

## Retours du mainteneur, second passage du lot Z3

Texte d’origine : la recette de Z4, puis les réponses au second passage de
`MAQUETTES-RECETTE-V6.html`. La question Q6.6 a reçu la recommandation.

```text
notamment le widget de color pick, il lag toujours.

pour la taille du plugin on laisse tomber pour le moment.

Z3.4 · Ajuster la référence
m2

Z3.5 · Garanties de contraste
Question 1
N2
```
