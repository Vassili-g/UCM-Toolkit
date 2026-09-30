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

Suite de la recette (lots Z8 à Z10) : le graphe de la dérive de teinte, la
réglette des garanties et le tracé des courbes gardent la taille de leurs
textes et de leurs traits quand la fenêtre change de largeur ; seules leurs
colonnes s’étirent, comme l’aperçu des rôles. La poignée de
redimensionnement suit le pointeur dans les deux sens, ne lâche pas en
plein geste et ne bouge plus la fenêtre une fois relâchée. La carte
« Intensités » est repensée d’après une recherche et une maquette validée :
teinte, saturation et luminosité se règlent pour Vivid, Soft ou les deux,
jusqu’à la référence, et la dérive de teinte s’applique par-dessus.

Ce plan est destiné à l’agent qui réalisera les changements. Il reprend les
cases encore ouvertes du [cinquième plan](./PLAN-ERGONOMIE-PALETTES-V5.md),
dont les décisions restent valables quand ce document ne les remplace pas.
Le mainteneur fait lui-même les tests d’interface sous Chromium et la
recette dans Figma.

## Autorités

Lire dans cet ordre :

1. les [retours du mainteneur](#retours-du-mainteneur-round-6) et ceux de
   la [suite de la recette](#retours-du-mainteneur-suite-de-la-recette-v6),
   conservés sans modification ;
2. les décisions ci-dessous et les [réponses aux
   questions](#questions-au-mainteneur), une fois données ;
3. les maquettes du lot Z3 (`MAQUETTES-RECETTE-V6.html`), toutes
   validées : Z3.1 forme A, Z3.2 G2, Z3.3 D1, Z3.4 M2, Z3.5 N2. Les règles
   `v6-` de `generer-maquettes-v6.mjs` sont les prototypes des règles CSS
   de Z5.2 et Z6.1, et `ajusterEnModale` celui de la modale ; puis la
   maquette du lot Z10 (`MAQUETTES-RECETTE-V6-2.html`), une fois validée ;
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

Faits des lots Z8 à Z10, relevés au commit `4531729`, avant la traduction
en cours dans la copie partagée :

| Fait | Source | Conséquence |
|---|---|---|
| Le graphe de dérive a un viewBox fixe de 396 × 208 unités, affiché en `width: 100%; height: auto`. Graduations en 9 px, lettres des poignées en 8 px, traits de 1 à 2 unités, cases de 16 unités : tout grandit avec la colonne | `derive/graphe.ts`, `CADRE`, `HAUTEUR_TOTALE` ; `styles.css`, `.derive-graphe` | Le graphe se dessine à la largeur mesurée, une unité pour un pixel |
| La géométrie de la dérive est pure et prend son `Cadre` en paramètre. Le glisser d’une poignée convertit l’ordonnée par `HAUTEUR_TOTALE` sur la hauteur affichée | `derive/geometrie.ts`, `derive/editeur.ts` | Une largeur variable ne touche pas la géométrie ; une hauteur fixe garde la conversion exacte |
| La réglette des garanties : viewBox `-46 0 (n × 40,5 + 46) 92`, cases de 37 unités au pas de 40,5, numéros en 9,5 px, arcs de 1,4 à 1,8 unité, même règle `width: 100%; height: auto` | `garanties.ts`, `CASE`, `PAS`, `ON_SOLID` ; `.reglette-svg` | Même défaut, dans un fichier que Z6.1 récrit |
| Le tracé des courbes des Réglages communs suit la même règle. Le retour ne le cite pas | `traceDesCourbes.ts`, `.trace-courbes` | Les trois graphes suivent une seule règle |
| L’aperçu des rôles (`on-solid`, `surface-card`, `border-decorative`) est en HTML : ses cases s’étirent, ses textes et ses bordures gardent leur taille. Aucun `ResizeObserver` dans `src/ui` | `specimens.ts`, `styles.css`, `grep` | C’est le comportement demandé ; la mesure de largeur est à poser |
| La poignée du socle envoie un `resize` à chaque `pointermove`, sans limite par image. Elle ne s’arrête que sur `pointerup` ou `pointercancel` reçus par elle, et ne lit jamais `buttons` : un relâcher perdu la laisse attachée, et un mouvement sans bouton redimensionne encore | `plugin-socle/src/ui/ResizeGrip.ts` | Cause probable de « ça redimensionne tout seul », à constater (Z9.1) |
| Pour agrandir, le pointeur sort de l’iframe avant que Figma ne l’élargisse : les mouvements n’arrivent plus que par la capture du pointeur | `ResizeGrip.ts`, `setPointerCapture` | Cause possible de « on n’arrive pas à agrandir », à constater (Z9.1) |
| À chaque `resize`, le sandbox appelle `figma.ui.resize` puis attend `rangerTaille` : une écriture de `clientStorage` par mouvement | `plugin-palettes/src/code.ts`, `plugin-exporter/src/code.ts`, `traiterMessage` | Ranger une fois, à la fin du geste |
| UCM Exporter pose la même poignée et reçoit le même message (`messages.ts`) | `plugin-exporter/src/ui/index.ts` | Une correction du socle vaut pour les deux plugins ; la suite et la galerie d’Exporter restent vertes |
| La carte « Intensités » ne paraît qu’à deux intensités. Elle règle une part de chroma par profil, de 0 à 1, par curseur et champ ; Soft ne dépasse jamais Vivid ; un repère situe la part de la référence ; dessous, l’origine des parts, « Reprendre les réglages communs » et les alertes qui comparent les profils | `intensites.ts`, `[ENT-09]`, `[ENT-11]`, `[UI-12]`, `[VER-10]`, `[VER-11]` | La saturation par profil existe déjà : la refonte la reprend au lieu d’en ajouter une seconde |
| Une palette range `reference`, `derive` (une par profil, et `lien`), `parts`, `base`, `crans`, `originale`, `intensites`. Aucun champ de teinte ni de luminosité par profil. `FORMAT_RECETTE` vaut 4 | `packages/couleur/src/recette.ts` | Régler la teinte ou la luminosité d’un seul profil demande un champ nouveau : moteur, validation, recette en version 5 |
| La référence garde ses octets dans son profil porteur (`[MOT-17]`). La teinte d’un cran part de celle de la référence, puis la dérive s’y ajoute (section 6.4) | Spécification | Décaler le profil porteur déplace la référence ; décaler l’autre profil ne la touche pas |
| « Ajuster la référence » règle déjà la luminosité OKLCH de la référence, par pas de 0,01, et garde `originale` avec « Revenir à l’originale » | `[UI-15]`, `ajustement.ts`, `ajustementDeLaReference.ts` | La refonte et la modale de Z5 écrivent le même champ : elles partagent `originale` et ne se contredisent pas |
| « Intensités » nomme aussi les segments « Une · Deux » de la configuration (Z1.7) | `champs.ts`, `[UI-11]` | Renommer la carte lève l’homonymie |

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
| Ajuster la référence | Forme A (Z3.1) : le panneau reste ouvert depuis la pastille de la référence, réorganisé. En tête, la phrase qui dit pourquoi, rédaction a du lot Z10 : « La palette utilise votre couleur telle quelle. En Thème Light, elle est trop claire pour les bordures de champ. » Avec des manques dans les deux thèmes : « La palette utilise votre couleur telle quelle. En Thème Light, elle est trop claire pour le texte coloré. En Thème Dark, elle est trop sombre pour les bordures de champ. » Les ratios restent dans le tableau. Puis les deux témoins, les pas, une ligne pour la nuance visée et les annonces des pas, le code, les garanties avant et après en tableau, et le bilan par intensité. La luminosité se retire. Sous le code, avec une garantie manquée : « ✗ 2 garanties manquées en Thème Light » en couleur de danger, puis « Ajuster la référence » (lien b). Présentation M2 (Z3.4) : une modale centrée au-dessus du panneau, sur un voile assombri, 520 px de large au plus et 16 px de marge à la fenêtre (468 px à 500 px) ; elle tient dans la fenêtre et défile en elle-même si la hauteur manque. Le tableau a ses colonnes (garantie, thème, avant, après) à 770 px ; à 500 px, le thème et l’intensité passent en titre et chaque garantie tient sur une ligne. « Annuler », Échap, « Appliquer » et un clic sur le voile la referment ; le focus revient au lien, ou au code quand le lien disparaît (Y8.0). Le sélecteur de couleur perd son onglet « Ajuster » (Q6.6) : la modale s’ouvre par le lien et par l’action `ajuster-reference` des messages |
| Pastilles d’état | « À actualiser » et « Pas encore sur Figma » : fond et texte d’avertissement. « À jour » : fond de succès, texte de succès. « Cadre introuvable » et « Lecture impossible » gardent le danger |
| Libellés de l’onglet Palettes | « À actualiser » partout où « À mettre à jour » s’écrivait. « Actualiser tout (N palettes) » remplace « Mettre à jour (N palettes) », singulier gardé. « Générer tout (N palettes) » ne change pas |
| Code hexa | Il prend toute la largeur de sa colonne, dans la configuration et dans la création, qui gardent la même disposition (Q6.5) |
| Intensités dans la configuration | Segments `.bascule-de-base`, libellé « Intensités » au-dessus, comme « Modèle ». Libellés « Une · Deux » (Q6.2). Dessous, inchangés : l’aide, « Intensité : 0,89 » à une intensité, « Référence exacte dans » à deux. La création garde ses deux cartes |
| Garanties de contraste | Disposition G2 (Z3.2) : un encadré par groupe de minimum, son titre en bandeau ; les états nommés une fois en tête de colonne ; dans chaque case, le spécimen à gauche des numéros et du ratio, le badge sur la ligne du ratio ; les codes des rôles en 11 px sur fond ; la rangée choisie sur fond, marquée d’une barre de 3 px écartée du texte. Sous 700 px, disposition N2 (Z3.5) : chaque rangée garde le nom et ses trois états sur une ligne, les cases d’état passent à 92 px, le spécimen se pose au-dessus des numéros et du ratio, et le nom de chaque état se centre sur sa colonne ; aucun badge ne passe à la ligne, « ✗ 21,00 » et « AA ✗ » compris. Le contenu ne change pas : associations, états, ratios, niveaux WCAG, réglettes, liens des garanties en échec |
| Graphes | Le graphe de la dérive, la réglette des garanties et le tracé des courbes se dessinent à la largeur mesurée de leur colonne, une unité du viewBox pour un pixel, à la hauteur qu’ils ont aujourd’hui dans la fenêtre minimale. Textes, traits, poignées, pivot et hauteurs de case restent en pixels fixes, aux tailles relevées à 500 px (Z8.1) ; seules les colonnes des crans s’étirent. Un redessin par image au plus quand la largeur change, aucun quand la carte est repliée |
| Redimensionnement de la fenêtre | Correction dans le socle, pour les deux plugins, après constat (Z9.1) : un message par image au plus ; arrêt du geste sur tout signe de fin (bouton relâché, capture perdue, mouvement sans bouton) ; taille rangée une fois, à la fin du geste. La taille par défaut reste suspendue ([hors périmètre](#hors-périmètre)) |
| Refonte des intensités | La carte « Intensités » devient la carte qui règle teinte, saturation et luminosité par profil : Vivid, Soft, ou les deux ensemble, chaque profil pouvant garder ses propres réglages. Un réglage qui déplace la référence le dit par un avertissement. La dérive de teinte s’applique après ces réglages. Le modèle, les contrôles et les textes se décident en Z10.1 à Z10.4 : recherche, mesure, revue indépendante, maquette validée. Rien ne s’implémente avant la validation |
| Nom de la section | Recommandation, à confirmer sur la maquette (Q6.7) : « Teinte, saturation, luminosité », en anglais « Hue, saturation, lightness ». Il nomme les trois contrôles, comme « Dérive de teinte » nomme le sien. « Réglages globaux » est écarté : trop proche de « Réglages communs », qui valent pour toutes les palettes. « Value » est écarté : le moteur règle la clarté OKLCH, pas la valeur de HSV |

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
| Graphes à taille fixe | Z8 | Z8.1, Z8.2 et Z8.4 tout de suite ; Z8.3 après Z6.1, qui récrit `garanties.ts` |
| Redimensionnement de la fenêtre | Z9 | Aucune ; en parallèle |
| Refonte des intensités | Z10 | Z10.1 à Z10.4 tout de suite ; Z10.5 et la suite après la validation de Z10.4 |
| Recette et clôture | Z7 | Lots finis, Z8 à Z10 compris |

Z3.4 et Z3.5 sont validées : Z4.5, Z5.2 et Z6.1 peuvent commencer. Une
autre session traduit l’interface (`src/i18n/`,
`localisation.ts`) et modifie sans les commiter `selecteur.ts`,
`couleur/selecteur.ts`, `ongletPalettes.ts`, `nuancier.ts`, `ajustement.ts`,
`garanties.ts`, `configuration.ts` et `textes.ts`. Z4.6 à Z6 touchent ces
fichiers : l’agent attend le commit de cette traduction, ou le confirme par
`git status`, avant d’y écrire. Il écrit alors ses textes par la voie que la
traduction a posée. La même règle vaut pour Z8 à Z10, qui touchent aussi
`derive/graphe.ts`, `derive/editeur.ts`, `intensites.ts`, `index.ts` et
`code.ts`, modifiés par la même traduction. Les textes nouveaux s’écrivent
en français et en anglais : l’interface s’ouvre en anglais (`[UI-16]`).

Pour l’agent autonome, l’ordre de travail est : Z4.5 à Z4.9, Z5.2 et Z5.3,
Z6, Z9, Z8, puis Z10.1 à Z10.4. Il s’arrête à trois points, et à ceux-là
seulement : une recette Figma à confier au mainteneur (Z4.9, Z9.5, Z7) ; un
texte ou une maquette à valider (Z5.2 à deux thèmes, Z10.4) ; une question
de Z9.2 dont la correction n’est pas mesurable dans Chromium. À chaque
arrêt, il reconstruit le plugin dans la copie partagée si la recette le
demande, donne le lien ou le fichier, et poursuit sur un lot qui n’en
dépend pas.

Aucun lot ne touche au moteur ni à la recette, sauf Z10 : son modèle passe
par un agent de revue avant d’être écrit (Z10.3), et les conclusions de la
revue se vérifient dans le code. Hors de Z10, `FORMAT_RECETTE` reste 4. Z9
touche au socle, que UCM Exporter partage : la suite et la galerie
d’Exporter restent vertes, preuve sur le DOM. Z4 touche au rendu de l’onglet :
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
- [x] **Z0.5** (N130 à N148 ; Z5 et Z10 faits)
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

- [x] **Z4.5** Mesurer l’image entière. Étendre
  `mesurer-glisser-couleur.mjs` : durée de chaque image pendant un glisser
  réel, style, mise en page et peinture compris (entrées
  `long-animation-frame`, ou trace de performance de Chromium), sous un
  processeur ralenti ×4 et ×6 (`Emulation.setCPUThrottlingRate`). Trois
  cas : référence avec cartes repliées, référence avec Dérive, Garanties et
  Interface de test dépliées, fond des Réglages communs. Ajouter un
  glisser avec des pauses de 300 ms. Reporter les chiffres ici avant
  toute correction.
  Fait, à 770 px, sur la galerie construite, avant correction. Sans
  ralentissement, aucune image ne dépasse 16,8 ms. Images de plus de 20 ms
  sur un glisser de deux cents pas : ×4, 7 sur 448 (référence, cartes
  repliées), 64 sur 514 (cartes dépliées), 245 sur 476 (fond des Réglages
  communs) ; ×6, 238 sur 498, 219 sur 438, 223 sur 471, la pire à 150 ms.
  Fil principal par image à ×6 : 22 ms (script 8, style 1,5, mise en page
  5,2), 28 ms cartes dépliées, 40 ms pour un fond. Avec cinq pauses de
  300 ms, bouton enfoncé, cinq rendus complets de la carte Garanties avant
  le relâcher, une image de 83 ms à ×4. Profil du JavaScript d'un rendu
  d'aperçu : nuancier rebâti 37 %, analyse 31 %, liste des palettes rebâtie
  23 %. Pour un fond : `garantieDesCourbes` 58 %, rendu de l'onglet caché
  22 %. Cartes dépliées, chaque image repeint tout le calque racine, 755 ×
  3 080 px : la peinture double.
- [x] **Z4.6** Aucun rendu complet avant la fin du geste. Retirer le
  délai de 150 ms. Le sélecteur signale au contrôle la fin d’un glisser
  qui n’enregistre rien (Échap, fermeture, pointeur perdu) ; le contrôle
  rend alors tout, sans ranger. Le relâcher range une fois, comme
  aujourd’hui.
  Fait, après une revue indépendante, dont six corrections sont retenues.
  L'abandon qui suit un clic hors du sélecteur attend la fin de ce clic,
  sans quoi le rendu rebâtirait l'élément visé et le clic se perdrait.
  La couleur en attente passe avant l'abandon. Changer de contrôle clôt
  aussi la séquence. Une réponse de
  rangement en plein aperçu ne rend que le refus. Le retour des Réglages
  rend l'onglet s'il est resté en aperçu. `pointercancel` garde son
  comportement : il finit le geste et range. « Pointeur perdu » désigne
  `lostpointercapture` sans relâcher, qui arrête le geste sans ranger.
- [x] **Z4.7** Un aperçu sans reconstruction. Tant que les crans, les
  intensités, le thème et le modèle ne changent pas, le nuancier repeint
  ses pastilles en place (fond, encre, repère ◆, étiquettes) ; accolades
  et détail ne se refont que si leur entrée change. Pendant l’aperçu, la
  barre ne met à jour que la pastille du bouton de la liste. Le sélecteur
  de couleur prend son propre calque, et ses repères bougent par
  `transform`. Mesurer chaque changement : celui qui ne fait rien gagner
  se retire.
  Fait. Gardés : la grille du nuancier se rebâtit seulement quand thème,
  crans, intensités ou modèle changent, sinon ses pastilles se repeignent ;
  les accolades suivent les crans ; la liste des palettes repeint pastilles
  et noms en place ; `i18n.lier` garde le nœud de texte d'un élément et
  n'écrit que ce qui change. À ×4, les images de plus de 20 ms passent de 7
  à 0 et de 64 à 1. Chaque carte isole sa peinture (`isolation: isolate`),
  que Blink réutilise quand elle ne change pas : à ×6 cartes dépliées,
  181 images lentes deviennent 12. Retirés, faute de gain mesuré : le calque
  propre du sélecteur et ses repères par `transform` (174 contre 181 images
  lentes, dans le bruit). Le rendu de la barre en aperçu se réduit au
  repeint en place de la liste, sans cas particulier.
- [x] **Z4.8** Le fond des Réglages communs. Pendant le glisser, seuls
  l’aperçu compact et l’aperçu de l’onglet suivent le pointeur. Tracé des
  courbes, `garantieDesCourbes` et rendu de l’onglet Création caché
  attendent la fin du geste. Une validation retirée de l’aperçu doit
  rester vraie par construction : `poserFond` ne rend qu’un hexa valide.
  Fait. « L'aperçu de l'onglet » ne suit pas : l'onglet Création est caché
  derrière les Réglages, il garde la recette et se rend au retour.
  `validerRecette` ne se saute que pour une recette déjà acceptée, et
  `poserFond` n'en change qu'un fond. La garantie des courbes se mémorise
  dans l'interface par la clé des champs qu'elle lit : crans, courbes,
  gamut, deux seuils et deux parts. Un geste sur un fond ne la recalcule
  donc jamais.
- [ ] **Z4.9** Remesurer les cas de Z4.5, sous ralentissement ×4 et ×6 :
  aucune image au-dessus de 16 ms, et aucun rendu complet pendant un
  glisser avec pauses. Tests : pause de 300 ms bouton enfoncé, aucun rendu
  complet ; Échap pendant un glisser, un rendu complet et aucun rangement ;
  nuancier repeint sans nouvel élément ; fond des Réglages, garantie des
  courbes calculée une fois par geste. Chacun vu rouge sur mutation.
  Reconstruire le plugin dans la copie partagée, puis confier la recette
  Figma au mainteneur. La case ne se ferme qu’après son retour.
  Retour du mainteneur après le build de Z5 : dans Figma, le glisser ne
  sélectionnait plus de couleur. La règle « un mouvement sans bouton finit
  le geste », retenue de la revue, est retirée (9400091) ; Chromium ne
  reproduisait pas la panne. Un test tient le contraire : un mouvement donné
  sans bouton prolonge le glisser.
  Remesuré, à 770 px. Images de plus de 20 ms : ×4, 0 sur 381, 1 sur 383,
  0 sur 347 pour un fond ; ×6, 7 sur 441, 6 sur 453, 1 sur 415. Fil
  principal par image à ×6 : 13,7 ms, 13,7 ms et 14,0 ms. Pauses de
  300 ms : aucun rendu complet. Les quelques images lentes à ×6 restent :
  le JavaScript d'un aperçu y coûte 5,5 ms, l'analyse de la palette en
  tête. Tests : sept nouveaux, onze mutations vues rouges. Plugin
  reconstruit dans la copie partagée. Reste la recette Figma du mainteneur.

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
- [x] **Z5.2** Le panneau selon la forme A, dans la modale M2 : titre
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
  `ajuster-reference` ouvrent la modale. La phrase en tête est celle de
  la [décision](#décisions), rédaction a, validée à l’écrit : une idée
  par phrase, le rôle nommé sans ratio. Elle remplace la phrase b du
  premier passage, y compris pour un seul thème. Le rôle nommé est le
  premier rôle manqué du thème. Avec la recette par défaut, aucune de
  10 000 couleurs essayées ne manque de garantie dans les deux thèmes :
  le cas naît d’un minimum relevé dans les Réglages communs. L’état de galerie `ajuster-en-modale` (Z0.6)
  devient atteignable, à 770 et à 500 px. Les textes retirés sont marqués
  retirés dans l’inventaire. `[UI-15]` récrit.
  Fait. `ajustement.ts` rend la modale, posée sur `body` hors de `#app`,
  qui devient inerte ; Tab boucle dans la modale, Échap s'écoute sur le
  document, pour le cas où un clic dans la modale a rendu le focus au
  corps de la page. La colonne Thème écrit « Light · Vivid » sous son
  en-tête, comme la maquette ; « Thème Light · Vivid » devient le titre de
  groupe sous 552 px. Mesuré dans la galerie : 520 × 468 px à 770 px,
  aucune garantie sur deux lignes ; à 500 px, 453 px de large (la barre de
  défilement prend 15 px), 466 px de haut, tout dans la fenêtre. Textes
  nouveaux N136 à N139 ; retirés : la luminosité, la limite d'un pas,
  `nuanceVisee`, `annonceDuPas`, `garantieAvantApres` et les trois
  textes des onglets du sélecteur, marqués retirés (N140). `[UI-15]`
  récrit, `[UI-13]` et `[UI-11]` n'ont plus d'onglet « Ajuster ».
- [x] **Z5.3** Tests : ceux de `tests/ajustement.test.ts` et les tests
  d’interface d’« Ajuster » repris, en gardant ce que chacun protégeait :
  rien ne change avant « Appliquer », l’originale se garde et « Revenir à
  l’originale » la rend. S’y ajoutent : « Annuler », Échap et un clic sur
  le voile referment sans rien changer ; les trois gestes de fermeture et
  « Appliquer » rendent le focus au lien, ou au code quand le lien
  disparaît ; Tab ne sort pas de la modale ; à 500 px la modale tient dans
  la fenêtre ; la pastille n’ouvre plus que « Choisir ». Chacun vu rouge
  sur mutation.
  Fait. `tests/ajustement.test.ts` porte sur les calculs, que la modale
  ne change pas : il reste tel quel. Six tests d'interface, douze
  mutations vues rouges. Deux mutations vues vertes au premier passage ont
  corrigé le code et un test : `max-width: 100%` ne protégeait rien, la
  modale rétrécissant en élément flex, et la règle est retirée ; le titre
  de groupe se lisait sans être visible, et le test vérifie désormais sa
  visibilité.

Critère : un designer qui voit le lien sait, avant de cliquer, quelle
garantie manque et pourquoi la référence doit bouger.

## Lot Z6 : garanties de contraste

Après la validation de Z3.2 et Z1.2.

- [x] **Z6.1** La carte selon G2 à 770 px et selon N2 (Z3.5) sous 700 px,
  à une et à deux intensités, aux deux thèmes de palette. Règles `.v6-g2`
  et `.v6-n2` du générateur à reprendre. L’état de galerie
  `garanties-refaites` (Z0.6) devient atteignable. `[UI-09]` récrit.
  Fait. Les colonnes G2 font 150 px, et non 146 : au pire contenu, le
  spécimen, l'écart et « ✗ 21,00 AA ✗ » prennent 150 px, et le résultat
  débordait de 4 px sur la colonne voisine. La relation n'imbrique plus un
  paragraphe dans un autre : « fond » passait à la ligne. Hauteur de la
  carte ouverte, avant puis après : sans échec, 1 253 → 893 px à 770 px et
  1 218 → 1 165 px à 500 px ; avec un échec, 1 299 → 961 px et 1 288 →
  1 233 px. Badges à la ligne : 3 ou 4 avant, 0 après.
- [x] **Z6.2** Vérifier à 500 × 520 et à 770 × 720, au ratio le plus long
  (« ✗ 21:1 » et un badge AAA), qu’aucun badge ne passe à la ligne.
  Fait par un test, « ✗ 21,00 » et « AA ✗ », plus large que « AAA », dans
  chaque case : aucun badge à la ligne, aucun résultat hors de sa case.
- [x] **Z6.3** Tests : badge sur la même ligne que son ratio, à 500 px et à
  770 px ; nom de chaque état écrit une fois par groupe ; code d’un rôle à
  la taille du texte courant ; rangée choisie et focus visibles ; une
  garantie en échec garde ses liens. Vus rouges sur mutation.
  Fait : trois tests, dix mutations vues rouges. Deux mutations sont
  d'abord restées vertes, les cases de 64 px et de 146 px : `nowrap` y
  gardait le badge sur la ligne en débordant. Le test vérifie désormais que
  chaque résultat tient dans sa case.

Critère : le designer distingue les groupes d’un regard, et la carte d’une
palette sans échec tient dans moins de hauteur qu’aujourd’hui.

## Lot Z8 : graphes à taille fixe

Fichiers : `derive/graphe.ts`, `derive/editeur.ts`, `garanties.ts`,
`traceDesCourbes.ts`, `styles.css`, tests voisins,
`tests/interface/interface.test.mjs` et `galerie/etats.cjs`.

Le mainteneur juge le graphe de la dérive et la réglette des garanties
« très beaux » à 500 px de large, et moins beaux dès qu’ils grandissent
([précision d’après-recette](#précisions-du-mainteneur-après-la-suite-de-la-recette)).
Le rendu à 500 px est donc la référence visuelle de ce lot, pas seulement
celle des tailles : à 770 et à 1 000 px, une capture de chaque graphe se
compare à celle de 500 px, et seul l’écart entre les colonnes change.

- [x] **Z8.1** Constater. Dans la galerie construite, à 500, 770 et 1 000 px
  de large : pour le graphe de la dérive déplié, la réglette des garanties
  et le tracé des courbes, la largeur et la hauteur affichées, la hauteur
  rendue d’une graduation, d’un numéro et d’une lettre de poignée,
  l’épaisseur rendue d’un trait. Reporter les chiffres ici. Ceux de 500 px
  sont la cible, à toutes les largeurs.
  Constaté, 500, 770 puis 1 000 px. Dérive : 451, 721, 951 px de large pour
  237, 379, 500 px de haut ; graduation 12, 20, 26 px ; lettre de poignée 11,
  18, 24 px ; trait 2,3, 3,6, 4,8 px. Réglette : 84, 135, 178 px de haut ;
  numéro 10, 16, 22 px ; arc 1,6, 2,6, 3,5 px ; case 20, 32, 43 px. Tracé des
  courbes : 115, 188, 251 px de haut ; losange 13, 21, 28 px ; trait 1,4,
  2,4, 3,1 px. Les trois graphes grandissent : Z8.4 s'applique.
- [x] **Z8.2** Le graphe de la dérive. Un `ResizeObserver` sur sa colonne ;
  à chaque largeur nouvelle, au plus une fois par image, le `Cadre` prend la
  largeur mesurée et le graphe se redessine, viewBox `0 0 largeur
  HAUTEUR_TOTALE`, largeur et hauteur de l’élément en pixels.
  `HAUTEUR_TOTALE` et les ordonnées ne changent pas. Les tailles de texte et
  de trait sont celles de 500 px, écrites en pixels dans `styles.css`. Un
  changement de largeur pendant le glisser d’une poignée redessine sans
  perdre la poignée, l’échelle figée ni le focus. Carte repliée : aucun
  redessin, la largeur se relit à l’ouverture. Avant la première mesure
  (tests sans mise en page), la largeur reste 396. `[DER-16]` se vérifie à
  500 px : 24 px par cran au moins. `[DER-01]` et `[DER-16]` récrits.
  Fait, avec un écart à la lettre du plan : une unité du viewBox ne vaut pas
  un pixel, elle vaut l'échelle que le graphe a dans la fenêtre minimale
  (451 px pour 396 unités). Le graphe garde cette échelle à toute largeur ;
  seule la largeur de son viewBox suit la colonne. Le rendu de 500 px, jugé
  juste par le mainteneur, se retrouve donc à l'identique, sans récrire les
  tailles en pixels dans `styles.css` ; une unité pour un pixel l'aurait
  réduit de 12 %. La mesure passe par `src/ui/largeur.ts` : le graphe se
  redessine dans le rappel du `ResizeObserver`, rendu une fois par image au
  plus, avant la peinture. Une première version attendait l'image suivante :
  le dessin fait avant toute mesure se peignait une image, et un test de
  glisser saisissait la poignée à son ancienne place une fois sur deux. L'éditeur redessine et rend le focus
  à sa poignée ; la capture du glisser tient sur le SVG, l'échelle figée
  reste. 36 px par cran à 500 px.
- [x] **Z8.3** La réglette des garanties, après Z6.1. Même règle : le pas
  des cases se calcule sur la largeur mesurée, moins la case `on-solid` ;
  les cases gardent leur écart et leurs 22 px de haut, les numéros, les
  arcs et `on-solid` leur taille. `[UI-09]` le dit.
  Fait, même règle : 451 px pour 491,5 unités, les cases à 20 px de haut
  comme à 500 px, et non 22.
- [x] **Z8.4** Le tracé des courbes : même règle, si Z8.1 constate que ses
  traits grandissent avec la largeur. Sinon, la raison s’écrit ici.
  Fait : ses traits grandissaient (Z8.1). Onze nuances sur 421 px, et
  `geometrieDesCourbes` prend la largeur mesurée.
- [x] **Z8.5** Tests : à 500 et à 1 000 px, la même hauteur rendue d’une
  graduation, d’un numéro et d’une lettre de poignée, et la même épaisseur
  de trait, à 0,5 px près ; la même hauteur de graphe et de réglette ; des
  colonnes qui suivent la largeur, rampe et bande alignées sur elles ; une
  poignée glissée à 1 000 px atteint l’angle visé ; aucun redessin carte
  repliée. Chacun vu rouge sur une mutation (par exemple `height: auto`
  rétabli). Galerie : les états de la dérive et des garanties capturés à 500
  et à 770 px, la preuve sur le DOM.
  Fait : quatre tests, sept mutations. Au premier passage, cinq sont restées
  vertes. Un viewBox qui ne suit plus la largeur se réduit en
  proportion et se centre à hauteur fixe : les tailles restaient justes, et les colonnes ne
  s'étiraient plus. Les tests mesurent désormais l'étendue du dessin, sa
  place dans le cadre et la continuité de la bande ; six mutations sont
  vues rouges. La septième retire la hauteur posée en pixels : elle ne se
  voit qu'avant la première mesure, puisque le viewBox qui suit la largeur
  garde la proportion, et elle reste pour cette première image. Les
  preuves de galerie sont les mesures de Z8.1 refaites : à 500, 770 et
  1 000 px, les mêmes tailles.

Critère : à 500 comme à 1 000 px, les textes et les traits des trois
graphes ont la même taille ; seules leurs colonnes et contenus s’élargissent et s'étirent, pas les typos ni les stroke.

## Lot Z9 : redimensionnement de la fenêtre

Fichiers : `plugin-socle/src/ui/ResizeGrip.ts`, `plugin-palettes/src/code.ts`
et `messages.ts`, `plugin-exporter/src/code.ts` et `messages.ts`, tests des
trois paquets, un script de mesure.

Lot suspendu : le mainteneur rapporte qu’un autre agent
semble avoir corrigé le redimensionnement ([précision
d’après-recette](#précisions-du-mainteneur-après-la-suite-de-la-recette)).
Au commit `3d844ee`, aucun commit ne touche `ResizeGrip.ts` depuis
`56e00df`, et l’arbre de travail ne le modifie pas. Avant de reprendre Z9,
l’agent retrouve cette correction dans `git log`. Si elle est dans le
dépôt, il la vérifie contre Z9.4, sinon il regarde ce qu'il en est lui même dans le code.

Le retour décrit trois symptômes : la fenêtre « perd le focus », elle « se
redimensionne toute seule », elle se rétrécit mais s’agrandit mal. Les
[faits](#faits-qui-fondent-les-décisions) donnent une cause lisible pour
chacun ; aucune n’est encore constatée. « Ça perd le focus » se lit d’abord
comme la poignée qui lâche le pointeur en plein geste ; Z9.1 vérifie aussi
que le focus du clavier ne change pas.

- [ ] **Z9.1** Constater. Écrire `scripts/mesurer-redimensionnement.mjs` :
  dans Chromium, une page hôte embarque l’interface construite dans une
  iframe et répond au message `resize` comme Figma, en redimensionnant
  l’iframe après un délai réglable (0, 16 et 50 ms). Au pointeur réel de
  Playwright : agrandir vite de 200 px ; rétrécir vite ; relâcher le bouton
  hors de l’iframe, puis la survoler sans bouton ; reprendre la poignée. Pour
  chacun, relever les messages par image, la taille finale contre la
  position du relâcher, les messages envoyés après le relâcher, l’élément
  focalisé avant et après. Compter les appels à `rangerTaille` par geste
  dans un test du sandbox. Reporter les chiffres ici, et dire quelles causes
  se confirment, avant toute correction.
- [ ] **Z9.2** La poignée. Au plus un message par image, à la dernière
  position reçue. Le geste finit sur `pointerup`, `pointercancel`,
  `lostpointercapture`, et sur tout mouvement dont `buttons` vaut 0 : les
  écouteurs se retirent et un dernier message part, à la position finale,
  marqué fin de geste. La poignée ne prend pas le focus. Si Z9.1 montre que
  les mouvements hors de l’iframe n’arrivent pas, noter la cause ici et
  proposer au mainteneur deux corrections, mesurées, avant d’en écrire une.
- [ ] **Z9.3** Le sandbox, dans les deux plugins. `figma.ui.resize` à chaque
  demande, sauf celle égale à la taille en cours ; `rangerTaille` une seule
  fois, sur la fin du geste. `DemandeDeTaille` et les deux `messages.ts`
  gagnent un champ facultatif de fin ; un message sans lui reste compris.
  Rien ne change dans les bornes ni dans la taille par défaut.
- [ ] **Z9.4** Tests : un message par image au plus pendant un glisser ;
  plus aucun message après un relâcher, même perdu (mouvement sans bouton,
  capture perdue) ; une seule écriture du rangement par geste, à la taille
  finale ; la taille reste bornée au minimum. Chacun vu rouge sur mutation.
  Remesurer Z9.1 ; chiffres avant et après dans le message du commit. Suites
  et galeries de Palettes et d’Exporter vertes.
- [ ] **Z9.5** Reconstruire les deux plugins dans la copie partagée, puis
  confier la recette Figma au mainteneur. La case ne se ferme qu’après son
  retour.

Critère : dans Figma, la fenêtre suit le pointeur quand on l’agrandit comme
quand on la rétrécit, et ne bouge plus après le relâcher. Le mainteneur le
constate ; une mesure dans Chromium ne ferme pas le lot.

## Lot Z10 : refonte des intensités

Le retour demande de repenser la section entière. Ce lot fixe le besoin et
les contraintes ; le modèle, les contrôles et les textes se décident en
Z10.1 à Z10.4. L’agent s’arrête après Z10.4 jusqu’à la validation de la
maquette, et n’écrit ni moteur ni interface avant.

Le besoin, tel que le retour le dicte :

- régler la teinte, la saturation et la luminosité d’une palette, avec un
  contrôle précis pour chacune ;
- pour Vivid, pour Soft ou pour les deux, chaque profil pouvant garder ses
  propres réglages : deux profils aux teintes légèrement différentes, réglés
  ensemble ;
- un réglage peut toucher la référence, et un petit avertissement le dit ;
  c’est aussi la voie pour affiner la référence ;
- la dérive de teinte s’applique ensuite, et l’emporte ;
- la section change de nom (Q6.7).

Les questions de conception, auxquelles Z10.1 et Z10.2 répondent :

| Question | Ce qui la pose |
|---|---|
| Espace des réglages : OKLCH, celui du moteur (teinte en degrés, chroma, clarté), ou HSL | Le moteur fabrique les crans en OKLCH ; HSL déforme la clarté perçue d’une teinte à l’autre |
| Décalages relatifs à la référence ou valeurs absolues | Deux profils décalés de quelques degrés, ou deux teintes posées |
| La saturation reprend-elle la part de chroma de chaque profil (`parts`), ou s’y ajoute-t-elle | La carte actuelle règle déjà cette part ; `[ENT-09]` et `[ENT-11]` la calculent aussi |
| Ce que déplace la luminosité : la référence seule, dont le cran porteur peut changer, ou toute la rampe du profil, hors des courbes communes | Les courbes de clarté sont communes à la recette ; les garanties en dépendent |
| « Les deux » : un réglage lié, comme la synchronisation de la dérive (`derive.lien`), qui garde les valeurs propres de chaque profil quand on le délie | `[DER-12]` |
| Un réglage du profil porteur récrit-il `reference`, avec `originale` comme « Ajuster la référence », ou se range-t-il à part, la référence rangée sortant alors de sa rampe | `[MOT-17]`, `[UI-15]`, Q6.8 |
| Une palette à une intensité a-t-elle la section, sans choix de profil | `[ENT-14]` : elle n’a pas de carte Intensités aujourd’hui ; Q6.9 |
| Coexistence avec « Ajuster la référence » (Z5) et « Revenir à l’originale » | Les deux gestes écrivent la référence |
| Ce que deviennent les palettes grises, la palette de base, les palettes libres, les parts communes des Réglages communs et l’alerte « Profils confondus » | `[ENT-09]`, `[ENT-11]`, W6, section 8.3, `[VER-10]` |
| Version 5 de la recette et lecture des recettes 4 ; planche et tokens | Section 7.3 |

- [x] **Z10.1** Recherche. Relire la spécification (sections 6.3 à 6.5, 7,
  8.1, 8.3, 12, `[UI-12]`, `[UI-15]`), la [revue
  d’ergonomie](./REVUE-ERGONOMIE-PLUGIN-PALETTES.md), la [revue
  critique](./REVUE-CRITIQUE-PLUGIN-PALETTES.md), les [décisions de
  rédaction](./DECISIONS-REDACTION-PALETTES.md), la
  [conception W6 et W7](./CONCEPTION-NUANCES-ET-FORMAT-3.md) et les plans V2
  à V6 pour ce qui touche aux intensités et à la référence. Étudier au moins
  six outils qui règlent teinte, saturation et luminosité d’une couleur ou
  d’une gamme : Teinte/Saturation de Photoshop, le panneau Teinte,
  saturation, luminance de Lightroom, le sélecteur de Figma, et des outils de palettes (Leonardo
  d’Adobe, Huetone, Colorbox, Radix Colors, uicolors, Atmos ou d’autres) :
  ce qu’ils montrent, la précision des contrôles (piste peinte, champ, pas
  au clavier, remise à zéro), le réglage de plusieurs cibles liées, les
  avertissements. Rédiger `RECHERCHE-REFONTE-INTENSITES.md` dans ce
  dossier : constats sourcés, réponse argumentée à chaque question
  ci-dessus, deux ou trois modèles candidats avec leurs effets sur
  `[MOT-17]`, les garanties, la recette et l’interface.
  Fait : [RECHERCHE-REFONTE-INTENSITES.md](./RECHERCHE-REFONTE-INTENSITES.md),
  neuf outils. Modèle C retenu : régler le profil porteur déplace la
  référence, régler l’autre ne la touche pas.
- [x] **Z10.2** Mesurer avant de choisir. Pour `#1E6FD9`, `#16A34A`,
  `#DC2626`, `#A0B599` et une référence grise, calculer par le moteur
  l’effet de chaque modèle candidat aux bornes de ses contrôles : rampes,
  cran porteur, garanties manquées, profils confondus, temps de calcul
  contre `[MOT-13]`. Reporter dans la recherche, et retenir un modèle.
  Fait par `mesurer-refonte-intensites.mjs`, témoin contre le moteur. Garder
  la référence fixe fait rompre son cran à 10° de teinte ; écrire la
  saturation dans la référence fait basculer le porteur sous 0,70 ; au-delà
  de +0,02 de luminosité, la nuance 50 blanchit. Coût : 0,10 ms.
- [x] **Z10.3** Revue indépendante du modèle retenu, par un agent de revue :
  champs de la recette, validation, migration de la version 4, `[MOT-17]`,
  ordre des réglages puis de la dérive, vecteurs de test de la section 6.8,
  effets sur la planche et les tokens. Ses conclusions se vérifient dans le
  code et s’écrivent sous cette case ; le modèle se corrige avant la
  maquette.
  Faite. Conclusions vérifiées et reportées dans la [revue du
  modèle](./RECHERCHE-REFONTE-INTENSITES.md#revue-du-modèle) : la première
  mesure de la luminosité décrivait le modèle B, et le sens s’inverse sur
  Vert une fois refaite ; le porteur se fige ; la référence se tire de
  l’originale par une seule fonction ; courbe, pivot, bouts et ancrage se
  translatent. Deux corrections écartées, avec leur raison.
- [x] **Z10.4** Maquettes. `MAQUETTES-RECETTE-V6-2.html`, écrit par
  `generer-maquettes-v6-2.mjs` sur le modèle de `generer-maquettes-v6.mjs`,
  selon les règles du lot Z3 : une question par bloc, écrans lettrés
  au-dessus des choix, la disposition en place d’abord, une recommandation
  ensuite, textes courts, plusieurs rédactions côte à côte, couleurs et
  ratios calculés par le moteur, écrans à 770 et à 500 px. Les questions :
  1. le nom de la section, en français et en anglais, au moins quatre
     rédactions, dont la recommandation (Q6.7) ;
  2. la disposition des contrôles, en au moins trois formes : A, les
     segments « Vivid · Soft · Les deux » au-dessus de trois curseurs ; B,
     deux colonnes Vivid et Soft côte à côte, liées par un lien comme la
     dérive ; C, une forme que la recherche propose. Pour chacune : les
     pistes peintes (teinte, saturation, luminosité), le champ, le pas au
     clavier, la remise à zéro, et ce que la carte repliée résume ;
  3. l’avertissement quand la référence bouge : où, et à quel moment (avant
     le premier geste, pendant, après), en plusieurs rédactions ;
  4. la palette à une intensité (Q6.9) ;
  5. la coexistence avec « Ajuster la référence » et « Revenir à
     l’originale » ;
  6. chaque question du modèle que la recherche laisse ouverte, avec sa
     recommandation.
  Donner le fichier au mainteneur et s’arrêter. Second passage dans le même
  fichier après ses retours, jusqu’à validation ; ses réponses se
  conservent en fin de plan.
  Validée ([réponses](#retours-du-mainteneur-maquettes-du-lot-z10)) : nom
  « Teinte, saturation, luminosité » (a), disposition A, avertissement
  avant le geste et ligne « Ajustée depuis » après (W1 et W3), carte pour
  une intensité, « Ajuster la référence » devient le raccourci de la
  luminosité du porteur (R1), luminosité de −0,05 à +0,02, dérive Tailwind
  calculée sur l’originale, porteur figé au premier réglage.
  Avertissement, validé à l’écrit : avant le geste, dès que la cible porte
  la référence, « Attention : ce réglage va modifier votre couleur de
  référence. » ; après le geste, à sa place, « Attention, votre couleur de
  référence a été modifiée. ». Les deux s’écrivent en anglais par la voie
  de la traduction (Z10.6).
- [x] **Z10.5** Après validation : le moteur (`packages/couleur`). Champs de
  la palette, validation et refus nommés, `FORMAT_RECETTE` 5 et lecture des
  recettes 4, section 6.4 (réglages puis dérive), vecteurs de test,
  `[MOT-13]` tenu. Tests vus rouges sur mutation.
  Spécification écrite et revue avant le moteur : [Spécification du
  moteur (Z10.5)](./RECHERCHE-REFONTE-INTENSITES.md#spécification-du-moteur-z105).
  La revue a simplifié le modèle : une teinte par profil au lieu d'une
  rotation et d'un écart, le pivot et l'ancrage sur le départ, l'invariant
  de la référence tenu par les gestes plutôt que par la validation.
  Fait : `reglages` et ses huit refus, `FORMAT_RECETTE` 5, migration de 4
  sans autre changement, `referenceReglee`, `pivotDe`, `departDe`,
  `decalageDe`, porteur figé, ancrage et alerte « hors de la rampe » lus sur
  le départ. Neuf tests, sept mutations vues rouges. Une mutation est restée
  verte au premier passage : le retour anticipé de `referenceReglee` sur un
  réglage nul. Le test tirait ses départs par `fabriquerCran`, qui les
  refabrique à l'identique ; 336 couleurs sur 636 056 changent pourtant
  d'octets à la refabrication, toutes très sombres (`#000012` donne
  `#00010F`), et le test les porte désormais. `[MOT-13]` : `rampesDe` d'une
  palette de 44 crans coûte 0,36 ms avec réglages, 0,09 ms sans, médiane de
  cent calculs à dérive neuve. `scripts/mesurer-temps.mjs` ne tourne plus
  depuis que `boutsDe` prend la recette : la mesure est passée par un script
  temporaire. La version 6 de la recette retire ensuite les parts `grise` et
  `seuils.chromaGrise` : le [plan des palettes désaturées](./PLAN-PALETTES-DESATUREES.md)
  en porte la migration (G3.1).
- [x] **Z10.6** L’interface, selon la maquette. La carte remplace celle des
  intensités ; le module se renomme s’il ne dit plus ce qu’il fait, et
  AGENTS.md suit. Prévisualiser pendant le geste, ranger à la fin, Échap
  rend la valeur d’avant, un rendu par image au plus (Z4). Les messages qui
  menaient aux intensités (`[VER-15]`) mènent aux contrôles de la nouvelle
  carte. Textes en français et en anglais, par la voie de la traduction,
  inscrits à l’inventaire « À valider ».
  Fait : `intensites.ts` devient `reglagesDeLaPalette.ts`. La carte paraît
  pour toute palette, une intensité comprise, sans segments pour celle-ci ;
  la modale « Ajuster la référence » pose la luminosité du porteur (R1) et
  répare Vert en deux pas au lieu d'un, puisque la rampe se translate avec la
  référence. Gardés de l'ancienne carte : le repère de la saturation de la
  référence (`[VER-10]`), l'origine des parts et le retour aux réglages
  communs. Ajouté hors maquette : la teinte désactivée pour une couleur
  presque grise, comme la dérive (`[DER-15]`), et le nom accessible réduit
  à la grandeur pour une palette à une intensité. Le lien des messages vers
  la carte prend son nom (N147), et une promesse manquée d'une palette à une
  intensité y mène aussi. Textes N141 à N148 ; les textes de l'ancienne carte
  sont retirés des deux catalogues.
- [x] **Z10.7** Documents : spécification (sections 6.4, 7.1 à 7.3, 8.1,
  `[ENT-09]`, `[ENT-11]`, `[ENT-14]`, `[MOT-16]`, `[MOT-17]`, `[UI-12]`,
  `[UI-15]`, section 12), CONTRIBUTING.md. Galerie : états à une et à deux
  intensités, profils déliés, réglage du profil porteur avec
  l’avertissement.
  Fait : `[MOT-29]` et `[ENT-15]` nouveaux ; 6.4, `[MOT-17]`, 6.5, 7.1,
  `[REC-05]`, `[ENT-11]`, `[ENT-14]`, `[VER-10]`, `[VER-15]`, `[DER-02]`,
  `[UI-12]`, `[UI-15]`, l'écran de l'onglet et la table des états récrits ;
  AGENTS.md (carte du code, trois invariants du moteur) et CONTRIBUTING.md.
  Galerie : quatre états nouveaux, `reglages-une-intensite`,
  `reglages-profil-delie`, `reglages-avant-le-porteur` et
  `reglages-reference-modifiee`, atteints dans les deux langues et
  vérifiés sur le DOM à 770 et à 500 px ; `ajustement-ouvert` passe à deux
  pas.
- [x] **Z10.8** Tests : un profil délié réglé ne touche pas l’autre ; « Les
  deux » règle les deux ; un réglage du profil porteur déplace la référence
  et montre l’avertissement ; la dérive s’applique après ; Échap rend l’état
  d’avant ; une recette 4 se lit ; une recette exportée puis relue est
  égale. Chacun vu rouge sur mutation.
  Fait : dix tests des gestes, dont une propriété sur 480 suites de gestes
  tirées (la référence égale `referenceReglee` du départ, la recette se
  valide), et trois tests d'interface nouveaux ; six tests d'interface de
  l'ancienne carte repris en gardant ce qu'ils protégeaient. Treize
  mutations vues rouges. Une mutation est restée verte au premier passage :
  l'avertissement jamais montré, que le test lisait par son texte ; il
  vérifie désormais sa visibilité. Interface : 131 verts.

Critère : un designer décale la teinte de Soft seule sans toucher Vivid,
affine la référence depuis la carte, et sait avant le geste que la
référence va bouger.

## Lot Z7 : recette et clôture

- [x] **Z7.1** (ex-Y8.1) Reprendre les tests d’interface cassés, en gardant
  ce que chacun protégeait. Au mainteneur, sous Chromium.
  Fait par l’agent sous Chromium, lot par lot : 104 tests verts après Z5.1.
  Les tests que Z2 cassait ouvrent la première palette, comme le designer ;
  aucun ne change de sujet. Z5.2 et Z6 les reprendront pour leur part.
- [ ] **Z7.2** Mettre à jour AGENTS.md si la carte du code change, la
  spécification et les liens des plans. Marquer les cases ouvertes du
  cinquième plan comme reprises ici.
  Z10 fait pour sa part (Z10.7). Restent les liens des plans et les cases du
  cinquième plan.
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
| Élargir puis rétrécir la fenêtre, Dérive et Garanties dépliées, Réglages communs ouverts ensuite | Textes et traits des trois graphes gardent leur taille ; seules les colonnes s’élargissent | Z8 |
| Agrandir puis rétrécir la fenêtre par la poignée, vite, et relâcher hors du plugin ; même geste dans UCM Exporter | La fenêtre suit dans les deux sens et ne bouge plus après le relâcher | Z9 |
| Décaler la teinte de Soft seule, puis des deux profils, puis régler la luminosité du profil porteur | Vivid ne bouge pas au premier geste ; l’avertissement précède le déplacement de la référence ; la dérive s’applique par-dessus ; « Revenir à l’originale » rend la référence | Z10 |

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
| **Q6.7** Le nom de la section qui remplace « Intensités » | Z10.4, Z10.6 | « Teinte, saturation, luminosité » (« Hue, saturation, lightness ») : il nomme les trois contrôles. « Réglages globaux » se confond avec « Réglages communs » | Recommandation retenue (Z10.4, nom a) |
| **Q6.8** Un réglage du profil porteur récrit-il la référence, `originale` gardée comme pour « Ajuster la référence » ? | Z10.2, Z10.5 | Oui, si Z10.2 ne montre pas mieux : la référence reste exacte dans sa rampe (`[MOT-17]`), et « Revenir à l’originale » défait tout | Oui, porteur figé ; « Revenir à l’originale » remet à zéro teinte et luminosité du porteur, l’autre profil garde sa couleur (Z10.4, R1) |
| **Q6.9** Une palette à une intensité a-t-elle la section, sans choix de profil ? | Z10.4, Z10.6 | Oui : c’est là qu’affiner la référence sert le plus, et la carte actuelle lui manque | Recommandation retenue (Z10.4, question 4) |

## Hors périmètre

- Moteur et recette, sauf le lot Z10 ; format de la planche.
- Nombre de nuances, courbes et fonds des Réglages communs, hors largeur.
- Relecture des textes hors de ce plan.
- La taille de la fenêtre, suspendue par le mainteneur : le code ouvre à
  600 × 720 (`TAILLE_PAR_DEFAUT`), la décision Z1.1 et `[UI-01]` écrivent
  770 × 720. Aucun lot ne réaligne l’un sur l’autre, et les mesures
  gardent 770 et 500 px. Le comportement de la poignée (Z9) n’en fait pas
  partie.

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

## Retours du mainteneur, suite de la recette V6

Texte d’origine (`recette-v6-2.pdf`), à l’origine des lots Z8 à Z10.

```text
Suite recette v6 :

Graphique de dérive de teinte

quand on modifie la width du plugin, le graphique s’étire de façon
proportionnelle et devient donc énorme ou tout petit

Il faudrait plutôt qu’il réagisse comme la visualisation des palettes
(avec les on-solid, surface-card, border-decorative etc) où les éléments
restent à la même taille mais s’étirent, s’adaptent, etc

Graphique garanties de contraste :

même retour que pour le graphique de dérive de teinte, ça se redimensionne
en scale alors que ça devrait se redimensionner en mode responsive avec
typos et stroke en taille fixe

Redimensionnement de la fenetre :

ça fonctionne très mal quand on redimensionne la fenètre manuellement, ça
perd le focus, ça redimensionne tout seul, on arrive pas trop à agrandir la
fenêtre, juste à la rétrécir etc

Refonte de la section “intensités”

Je me rend compte qu’on peut faire beaucoup mieux pour cette section, il
faut repenser entièrement la logique de la section pour que l’interface
soit vraiment très bien pensée dans le workflow UX

Features globales :

Renommer la section en un titre du genre “Hue Saturation Value” ou “Global
tweaks” ou un truc du genre, à réfléchir (par toi)

L’idée de cette section serait de pouvoir tweaker la hue, saturation ou
luminosité des palettes, en affectant la couleur de référence (avec un
petit warning quand même) et avec le choix de faire ces réglages sur la
palette vivid, soft ou les deux

Ca permettrait d’avoir deux palettes qui ont des teintes globalement
légèrement différentes tout en travaillant les deux en même temps. et ça
permettrait aussi de tweaker la couleur de référence plus finement

Au niveau des contrôles il faudrait :

sélecteur palette vivid / soft / les deux, en sachant qu’on peut faire des
réglages indépendant sur l’une ou l’autre

sélecteur de hue précis

sélecteur de luminosité précis

sélecteur de saturation précis

Les modifications faites ensuite sur le color drift prennent le dessus,
bien sur

Pour cette refonte il faut faire une passe de recherche pour trouver les
meilleures solutions d’un point de vue UX/UI, peut être en relisant les
docs de recherche aussi

Puis il faut faire une maquette claude qui sera validée par le user
```

## Retours du mainteneur, maquettes du lot Z10

Texte d’origine, réponses à `MAQUETTES-RECETTE-V6-2.html`.

```text
Z10.4 · Refonte des intensités
Question 1
A
Question 2
A

Question 3
OK mais revoir le wording "◆ Vivid porte votre couleur de référence : la
teinte et la luminosité la déplacent aussi." c'est pas compréhensible.
plutôt un truc du genre : "Attention, votre couleur de référence a été
modifiée" (c'était le point Question 3 bis)
Question 4
Oui ok
Question 5
R1 ok
Question 6
ok pour tout

Z5.2 · Ajuster la référence
Question 1
ta rédaction est trop alembiquée, personne n'écrit comme ça en français,
regarde comment rédiger des phrases simples sur internet et recommence ta
proposition (à l'écrit uniquement, pas de maquette)
```

## Retours du mainteneur, textes du lot Z10 et de Z5.2

Texte d’origine, réponse aux rédactions proposées à l’écrit. « A » vise la
rédaction a de Z5.2 ; « ta question » demandait si la phrase à un seul
thème se récrit comme elle.

```text
« Attention : ce réglage va modifier votre couleur de référence. » +
« Attention, votre couleur de référence a été modifiée. »

ok pour A et oui pour ta question. modifie le plan et c'est tout
```

## Précisions du mainteneur après la suite de la recette

Texte d’origine, reçu pendant Z10.1.

```text
pour les graph "hue shift" et "contrast guarantees", ils sont très beau
quand le plugin fait 500px de width. Quand la taille augmente et qu'ils
scalent, ils deviennent moins beau. Peut être à ajouter dans le plan pour
référence.

Aussi, un autre agent semble avoir fixé le problème du resize qui
fonctionne mal donc c'est peut être pas la peine de traiter ça.
```
