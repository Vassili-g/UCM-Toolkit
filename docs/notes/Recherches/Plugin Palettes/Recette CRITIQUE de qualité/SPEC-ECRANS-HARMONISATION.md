# Spécification des écrans : Création, Configuration, Harmonisation

**Statut : spécification de reproduction, liée aux décisions C1 à C10 du
[dossier](./DOSSIER-COMPARER.md).** Ce document décrit chaque élément, chaque
mesure, chaque texte et chaque comportement de la
[maquette](./Maquettes/MAQUETTE-COMPARER.html), pour qu'un agent les
reproduise dans UCM Palettes au pixel près. Il dit aussi ce que la maquette ne
montre pas et que le plugin doit faire : clavier, thème Light du plugin,
anglais, recalcul des alertes.

Une décision que le mainteneur change dans le dossier l'emporte sur ce
document ; la section concernée se met alors à jour.

## 1. Sources et périmètre

| Source | Rôle |
|---|---|
| `Maquettes/MAQUETTE-COMPARER.html` | Implémentation de référence. Chaque section ci-dessous nomme la fonction qui dessine l'élément |
| `Maquettes/galerie/etats.js`, `galerie/socle.css` | États de la galerie du plugin, figés en thème sombre par `Mesures/extraire-galerie.mjs`. Les écrans proposés modifient leur DOM réel |
| `Maquettes/donnees-ensembles.js` | Données des écrans d'Harmonisation, produites par `Mesures/generer-ensembles.ts` avec le moteur du dépôt |
| `DOSSIER-COMPARER.md` | Raisons et décisions |

Les deux autres maquettes du dossier, `MAQUETTE-QUALITE-EN-INTERFACE.html` et
`MAQUETTE-ROLES-ET-CRANS.html`, sont des bancs de mesure : elles montrent ce
que le moteur produirait, pas des écrans du plugin. Leurs règles (enveloppe,
surfaces translucides, anneau de focus, `ring`) se reproduisent depuis
[DOSSIER-QUALITE-DES-PALETTES.md](./DOSSIER-QUALITE-DES-PALETTES.md) et ses
scripts de `Mesures/`.

Les classes citées sont celles du plugin (`packages/plugin-palettes/src/ui/styles.css`
et le socle) ; les classes nouvelles sont définies en section 9.

## 2. Conventions communes

- **Largeur** : la fenêtre du plugin fait 480 px. Chaque écran de la maquette
  est une iframe de 482 px, bordure comprise. Le contenu utile fait 449 px
  entre les marges du conteneur `main.container`.
- **Jetons** : toutes les couleurs d'interface viennent des variables du
  socle (`--fond`, `--fond-bloc`, `--fond-survol`, `--bordure`, `--texte`,
  `--texte-second`, `--texte-marque`, `--fond-marque`, `--bordure-marque`,
  `--fond-succes`, `--texte-succes`, `--fond-avertissement`,
  `--texte-avertissement`, `--fond-danger`, `--texte-danger`) et leurs
  espacements (`--espace-serre`, `--espace-controle`), hauteurs
  (`--hauteur-action` 32 px, `--hauteur-secondaire` 24 px), rayon (`--rayon`
  6 px) et corps (`--corps` 11 px). Elles changent avec le thème de Figma ; la
  maquette montre le thème sombre, le thème clair applique les mêmes règles
  avec les valeurs claires des variables.
- **Couleurs d'aperçu** : ce qui montre une palette (nuances, composants, roue)
  se peint sur le fond de page de la recette du thème choisi dans la bascule
  Light et Dark de l'onglet (`recette.fonds.light`, `recette.fonds.dark`),
  quel que soit le thème de Figma. Son encre vaut `#1E1E1E` sur l'aperçu Light
  et `#F2F2F2` sur l'aperçu Dark.
- **Nombres** : virgule décimale ; le signe moins est `−` (U+2212) ; un nombre
  positif réglé porte `+`. Teinte en degrés entiers (`+5°`, `−7°`, `0°` ; une
  valeur qui s'arrondit à 0 s'écrit `0°`, jamais `−0°`). Saturation en pour
  cent entier, une espace insécable (U+00A0), puis `%` (`56 %`). Luminosité
  écrite à trois décimales dont on retire un seul zéro final : `+0,015`,
  `−0,02` (de `−0,020`), `0,00` pour zéro.
- **Rôles** : la table `TABLE_DES_DOSSIERS` du kit, sens `normal` quand
  `texteDesBoutons[mode]` vaut `blanc` en Light ou `noir` en Dark, `inverse`
  sinon (`sensDuTheme`). `solid/foreground` vaut `#FFFFFF` pour `blanc` et
  `#000000` pour `noir`. Plein : `solid/default`
  (700) et `solid/foreground` ; fond teinté : `surface/default` (100) et
  `surface/foreground` (800 ou 900) ; contour : `page/border` et
  `page/foreground`.
- **Palette colorée** : référence de chroma OKLCH supérieure à 0,05. Les autres
  sont neutres : hors des paires, de la roue et des constats de saturation et
  de luminosité.

## 3. Création : Réglage global

Écrans de référence : section 1 de la maquette, fonctions `reglagePropose`,
`marquer`, `replier`. État de galerie : `reglages-reference-modifiee`.

### 3.1 Carte repliée

Le résumé (`.carte-resume`) prend l'un de ces textes :

| Cas | Texte |
|---|---|
| Aucun réglage dans aucun profil | `Par défaut` |
| Un ou plusieurs réglages | `Modifié : ` puis la liste des réglages, `<grandeur> de <profil>`, séparés par `, `, dans l'ordre teinte, saturation, luminosité, puis Soft avant Vivid. Exemple : `Modifié : teinte de Soft, luminosité de Vivid` |
| Palette à une intensité | `Modifié : teinte, luminosité` (sans profil) |

Le texte se coupe par des points de suspension (règle actuelle de
`.carte-resume`) ; le plugin pose son attribut `title` sur le texte entier.
Aucun nombre. Carte repliée, le composant de carte retire son corps et ses
choix : « Régler » ne paraît que carte ouverte, comme aujourd'hui.

### 3.2 Carte ouverte

Le corps garde son ordre actuel et reçoit, en premier enfant de
`.reglages-de-la-palette`, une rangée `.tete-des-reglages` qui aligne à droite
un `button.bouton-discret` : `Tout par défaut`. Il remet aux valeurs par
défaut les trois réglettes du profil choisi dans « Régler », ou des deux
profils avec « Les deux ». Il est désactivé quand ces réglettes sont toutes à
leur valeur par défaut.

Chaque `.reglette.reglage-de-la-palette` reçoit la classe `avec-legende`
(13 px de marge basse) et, dans sa `.reglette-course` :

1. **La marque par défaut** : `span.reglette-defaut`, à `left: x0 %`, où
   `x0 = (défaut − min) / (max − min) × 100`, bornes de `aria-valuemin` et
   `aria-valuemax`. Elle précède le pouce dans le DOM : le pouce passe dessus.
   `title` : `Valeur par défaut : <défaut écrit selon la section 2>`.
2. **Le libellé** : `span.reglette-legende`, texte `par défaut`, à `left: x0 %`,
   centré, couleur `--texte`. Il paraît seulement quand le pouce s'écarte de
   la marque de plus de 4 points de pourcentage de la course.
3. **Les bouts de piste** : `span.reglette-bout.gauche` et
   `span.reglette-bout.droite`, couleur `--texte-second`. Textes :

   | Réglette | Gauche | Droite |
   |---|---|---|
   | Teinte | `plus ` + famille voisine en degrés décroissants | `plus ` + famille voisine en degrés croissants |
   | Saturation | `plus terne` | `plus vive` |
   | Luminosité | `plus foncée` | `plus claire` |

   Un bout dont la boîte, élargie de 6 px de chaque côté, chevauche celle du
   libellé `par défaut` prend `visibility: hidden` (fonction `eviter`, après
   la mise en page).
4. **Le repère de l'autre profil** (`.fantome-du-profil`) écrit le nom de cet
   autre profil, `Soft` quand Vivid est réglé et `Vivid` quand Soft l'est, au
   lieu de la lettre, en graisse 600. Ses règles d'affichage ne changent pas.

Le bouton de la réglette (`.bouton-discret` en bout de rangée) :

| État | Texte | Attributs |
|---|---|---|
| Valeur différente du défaut (écart de plus de 0,5 point de course) | `Par défaut` | `title` : `Revenir à la valeur par défaut, <défaut écrit>` ; `aria-label` : `Remettre la teinte par défaut` (ou `la saturation`, `la luminosité`) |
| Valeur par défaut | `Par défaut` | `disabled`, opacité 0,35, curseur par défaut ; même `aria-label` |

Une réglette modifiée ajoute après le texte de son `.field-label` un
`span.pastille-reglee` (6 px, `--bordure-marque`), avec 5 px de marge gauche.

**Familles de teinte** (fonction `voisine`) : centres OKLCH rose 0°, rouge
29°, orange 62°, jaune 100°, vert 145°, turquoise 195°, bleu 255°, violet
300°. La teinte de départ est l'absolu affiché à côté du champ (`257°`). La
famille voisine dans un sens est le centre le plus proche dans ce sens, à plus
de 10° de la teinte de départ. Pour 257° : `plus turquoise`, `plus violet`.

**Valeurs par défaut** : teinte 0° ; luminosité 0 ; saturation, la part
commune du profil dans la Configuration, ou pour le profil qui porte la
référence la saturation de la référence (`partsDe` sur la palette sans
`parts`, sans `reglages.part`, sans `reglages.clarte`).

### 3.3 Color shift

Fonction `colorShiftPropose`, état `color-shift-luminosite`.

- Résumé replié : `Par défaut · synchronisé`, ou `Modifié : <grandeurs> ·
  synchronisé` (grandeurs parmi teinte, saturation, luminosité). Sans
  synchronisation, `· synchronisé` disparaît.
- `Tout rétablir` de `.editeur-entete` devient `Tout par défaut`.
- Les réglettes des nuances claires et sombres reçoivent la marque, le libellé
  et les bouts de la section 3.2 ; défaut 0. Bouts selon l'onglet de grandeur
  actif : teinte, familles voisines de la teinte de la référence ; saturation,
  `plus terne` et `plus vive` ; luminosité, `plus foncée` et `plus claire`. La
  maquette montre l'onglet Luminosité.
- `Rétablir` de chaque réglette devient `Par défaut`, mêmes états.

## 4. Configuration

Fonctions `enteteLibellee`, `configuration` ; état
`configuration-de-la-recette`.

- **Bouton d'en-tête** (socle, `EnTete.ts`, pour les trois plugins) :
  `.icon-button.avec-libelle` ; l'engrenage de 12 px, puis le texte
  `Configuration` ; largeur automatique, 6 px entre icône et texte, 10 px de
  marge horizontale, corps 11 px graisse 600. `title` : `Ouvrir la
  configuration`.
- **Titre de page** : `Configuration` au lieu de `Réglages communs`. Le bouton
  `Retour aux palettes` ne change pas.
- **Onglets** : `createOnglets('Configuration', [...])` du socle, premier
  enfant de la pile, puis un `p.subtitle`, puis les panneaux.

  | Onglet | Texte de l'onglet | Phrase | Contenu |
  |---|---|---|---|
  | `palettes` (ouvert par défaut) | `Palettes` | `Les réglages par défaut de toutes les palettes du fichier.` | Le contenu actuel, sans le champ Langue |
  | `general` | `Général` | `Les réglages du plugin sur ce poste.` | Le champ Langue, inchangé |

- Les boutons `Rétablir` des cartes deviennent `Par défaut` ; leur nom
  accessible, `retablirLaCarte` dans `i18n`, devient `Remettre par défaut :
  <titre>`.
- L'onglet actif se garde pendant la session ; la réouverture du panneau revient
  sur `Palettes`.

## 5. Listes déroulantes

Règle du socle : `select` rejoint `button, input { font: inherit; }`. Toute
liste `select.input` perd sa flèche native (`appearance: none`), prend une
marge droite de 24 px et un chevron de 8 × 5 px à 9 px du bord droit, couleur
`--texte-second` (le SVG de la section 9 vaut `#b3b3b3`, la valeur sombre ; le
thème clair prend `#6b6b6b`, ou un masque CSS sur `currentColor`). Au survol,
fond `--fond-survol`.

Une liste posée parmi des boutons, dans `.carte-choix` ou avec la classe
`.champ-prereglage` (celle de « Teinte Tailwind »), mesure
`--hauteur-secondaire`, 24 px, largeur automatique. Une liste de formulaire (Langue) garde `--hauteur-action`, 32 px,
pleine largeur.

## 6. Vérification

État `verification-bilan-a-verifier`.

- Constat d'une palette trop proche (`procheDe` dans `i18n`) :
  `trop proche de <nom>`, ou `trop proche d'<nom>` quand le nom commence par
  une voyelle, accentuée ou non, un y ou un h ; plus de ΔEok.
- Son lien (`.bilan-verifier`) dit `Comparer` et ouvre Harmonisation avec la
  paire cochée, comme le bouton « Comparer » de la section 7.4.
- `.bilan-des-palettes { grid-template-columns: minmax(0, 1fr); }` : la ligne
  du bilan tient dans 449 px à 480 px de fenêtre.

## 7. Onglet Harmonisation

Fonctions `peindre`, `harmonisation` et les cartes `cartePaires`,
`carteListe`, `carteComparaison`, `carteReglages`, `carteRoue`.

### 7.1 État de l'onglet

| Champ | Valeur initiale | Rôle |
|---|---|---|
| `cochees` | `[]` | Noms des palettes cochées, dans l'ordre de cochage, 4 au plus |
| `regler` | première cochée, ou rien | Palette des réglettes de la carte Réglages |
| `mode` | `light` | Thème de l'aperçu |
| `intensite` | `vivid` | Intensité vue |
| `affichage` | `couleurs` | `couleurs` ou `gris`, pour la carte Comparaison |
| `roue` | repliée | Carte Roue des teintes ouverte ou non |
| décalages, saturations, luminosités | vides | Réglages faits depuis l'ouverture de l'onglet, par palette |
| `vision` | `Normale` | Vision choisie dans la carte Roue des teintes |
| `trop` | faux | Vrai après une tentative de cocher une cinquième palette, par sa case ou par un point de la roue ; redevient faux au prochain changement des cochées (case, « Comparer », « Tout décocher ») |

L'état vit le temps de la session du plugin ; il ne se range pas dans la
recette. Les réglages, eux, s'appliquent aux palettes comme dans Création.

### 7.2 Barre et en-tête

- **Onglet** : `Harmonisation`, inséré après `Vérification` et avant `Gestion`
  dans la `tablist` du plugin. Désactivé sous deux palettes. Compteur :
  `span.compteur-de-verification[data-ton="avertissement"]` portant le nombre
  de paires trop proches, absent à zéro.
- **Titre** : `div.tete-de-la-palette` en flex, 8 px d'écart ; `h2.titre-de-premier-rang`
  `Harmonisation` avec `margin-right: auto` ; puis deux bascules du socle sans
  libellé : `Soft | Vivid` (`intensite`) et `Light | Dark` (`mode`).
- **Ligne fixe** : `.ligne-fixe[data-ton="avertissement"]`, icône `!`, texte
  `<n> paire de palettes trop proches` ou `<n> paires de palettes trop
  proches` ; sans paire, `.ligne-fixe[data-ton="neutre"]`, icône `✓`, texte
  `Toutes vos palettes se distinguent`. Aucun bouton.

Les cartes suivent dans cet ordre : Palettes trop proches, Vos palettes,
Comparaison, Réglages, Roue des teintes. Elles prennent le composant de carte
repliable du plugin (`ui/carte.ts`) : `section.carte` (avec `carte-ouverte`,
`data-ouverte`, `data-avec-choix`), `.carte-tete.carte-tete-repliable`,
`button.carte-bascule` (`aria-expanded`) contenant `.carte-chevron`,
`.carte-intitule` (`h3.carte-titre`, `.carte-sous-titre`) et `.carte-resume`,
puis `.carte-choix` (carte ouverte seulement) et `.carte-corps`. Les bascules
sont celles du socle : `.choix-d-affichage`, `.choix-libelle` facultatif,
`.bascule[role=group]`, `button.bascule-option[aria-pressed]`.

Toutes les cartes se replient. À l'ouverture de l'onglet, toutes sont ouvertes
sauf la roue. Une carte repliée montre son résumé ; ouverte, ses choix.

### 7.3 Ce qui est trop proche

Une paire de palettes colorées est trop proche quand, pour l'intensité Vivid
(ou unique), la distance OKLab entre leurs `solid/default`, ou entre leurs
`surface/foreground`, passe sous `recette.seuils.palettesProches` (0,05) en
Light ou en Dark. Le constat retient le rôle et le thème de la plus petite
distance. `presque identiques` s'ajoute sous 0,01.

Le plugin recalcule toutes les paires à chaque réglage, pour toutes les
palettes ; la maquette ne recalcule que la paire de démonstration.

### 7.4 Carte « Palettes trop proches »

Paraît s'il existe une paire. Titre `Palettes trop proches` ; sous-titre
`Difficiles à distinguer dans vos composants` ; résumé `<n> paire` ou
`<n> paires`. Une rangée `.paire` par paire, par distance croissante :

1. `.paire-couleurs` sur le fond de page de l'aperçu du thème en cause : deux
   pastilles `i` de 26 × 22 px, texte `Aa` en 11 px graisse 600. Pour un plein,
   fond `solid/default`, encre `solid/foreground` ; pour un texte de fond
   teinté, fond `surface/default`, encre `surface/foreground`. Thème : celui du
   constat ; intensité : Vivid.
2. `.paire-texte` : `<b>A et B</b>`, puis le constat
   `<Boutons pleins | Textes sur fond teinté> trop proches, en <Light | Dark>`,
   suivi de ` · presque identiques` s'il y a lieu.
3. `button.bilan-verifier` : `Comparer`. Il coche A et B (et elles seules),
   passe `mode` au thème du constat, et met dans `regler` la palette qui sort
   de la zone trop proche par le plus petit déplacement depuis sa teinte
   actuelle ; à égalité, A. Il ne change ni l'intensité, ni l'affichage, ni
   les réglages, et remet `trop` à faux.

### 7.5 Carte « Vos palettes »

Titre `Vos palettes` ; sous-titre `Les nuances de 50 à <dernier cran>, en
<Light | Dark>` ; résumé `<n> palettes`. Corps :

- `p.ligne-secondaire.liste-aide` : `Cochez de 2 à 4 palettes pour les
  comparer et les régler.`
- Grille `.liste` : colonnes 14 px, 78 px, reste, 16 px ; 8 px entre colonnes,
  2 px entre rangées. Première rangée : deux cellules vides, `.numeros` (un
  `span` par cran, centré, 9 px, chiffres tabulaires, `--texte-second`), une
  cellule vide.
- Une rangée par palette, dans l'ordre de la recette, en `label.ligne-de-palette`
  (`display: contents`) : un `.fond-de-ligne` de 22 px sur toute la largeur,
  rayon 4 px ; `input.case-a-cocher` 12 × 12 px ; `.nom` en graisse 600, coupé
  par des points de suspension ; `.rampe-continue` de 14 px de haut, nuances
  sans espace, rayon 3 px aux deux bouts, dans le thème de l'aperçu et
  l'intensité vue ; `.signal` si la palette appartient à une paire trop
  proche : rond de 14 px, fond `--texte-avertissement`, texte `!` en `--fond`,
  10 px graisse 700, `title` `Trop proche de <autre>`, ou `Trop proche de X et Y`
  quand la palette appartient à plusieurs paires.
- Rangée cochée : `.fond-de-ligne` au fond `--fond-marque` à 22 %, cerné de
  `--fond-marque` à 60 %.
- Pied `.pied-de-carte` : à gauche `Aucune palette cochée`, `1 cochée, 4 au
  plus`, `<n> cochées, 4 au plus`, ou après une cinquième tentative `Quatre
  palettes au plus : décochez-en une.` ; à droite, dès une case cochée,
  `button.bouton-discret` `Tout décocher`.
- Cliquer une rangée ou sa case la coche ou la décoche. La cinquième ne se
  coche pas. Décocher la palette de `regler` y met la première cochée restante.
- La liste reste en couleurs en mode Niveaux de gris.

### 7.6 Carte « Comparaison »

Paraît dès deux palettes cochées. Titre `Comparaison` ; sous-titre `Les palettes
cochées, côte à côte` ; résumé `<n> palettes` ; choix : bascule `Couleurs |
Niveaux de gris` (`affichage`).

Corps :

1. `.surface` : fond de page de l'aperçu, 10 px de marge, rayon 6 px, encre
   d'aperçu.
   - `.nuances` : grille 70 px et reste, 8 px et 4 px d'écart, 10,5 px.
     Rangée des numéros (`.numeros`, opacité 0,7), puis par palette son nom en
     gras et sa `.rampe-continue` de 20 px. 12 px sous la grille.
   - `.composants` : une colonne par palette (`repeat(n, minmax(0, 1fr))`),
     écarts 7 px et 8 px, 10,5 px. Rangées : nom en gras 11 px ;
     bouton plein `Valider` (24 px, rayon 5 px, graisse 600, fond
     `solid/default`, encre `solid/foreground`) ; bouton à contour `Annuler`
     (bordure `page/border`, encre `page/foreground`) ; message
     `Message enregistré` (6 px 7 px de marge, rayon 5 px, fond
     `surface/default`, encre `surface/foreground`) ; lien `En savoir plus`
     (graisse 600, souligné à 2 px, `page/foreground`).
2. `.constats` sous la surface, 8 px au-dessus, 4 px entre eux. Chaque
   `.constat` : grille 14 px et reste, 6 px d'écart, 6 px 8 px de marge, rayon
   `--rayon`, 11 px ; icône en graisse 700. Tons :

   | Ton | Fond | Texte | Icône |
   |---|---|---|---|
   | `succes` | `--fond-succes` | `--texte-succes` | `✓` |
   | `info` | `--fond-marque` mêlé à 18 % à `--fond` | `--texte-marque` | `i` |
   | `avertissement` | `--fond-avertissement` | `--texte-avertissement` | `!` |
   | `danger` | `--fond-danger` | `--texte-danger` | `×` |

   Constats, dans cet ordre :

   | Condition | Ton | Texte |
   |---|---|---|
   | Une paire cochée trop proche (une ligne par paire) | avertissement | `<b>A et B</b> : <boutons pleins | textes sur fond teinté> trop proches en <Light | Dark>. Sortez la teinte de l'une d'elles de la zone hachurée, dans Réglages.` |
   | Aucune paire cochée trop proche | succès | `Ces palettes se distinguent, en Light et en Dark.` |
   | Parmi les cochées colorées, saturation de l'intensité vue étalée de 0,20 ou plus | info | `En <Soft | Vivid>, <b>X</b> est la plus terne et <b>Y</b> la plus vive.` |
   | Parmi les cochées colorées, luminosités de l'intensité vue étalées de 0,01 ou plus | info | `En <Soft | Vivid>, <b>Z</b> est plus claire que les autres.` (Z la plus haute si elle est positive) ou `… plus foncée que les autres.` (la plus basse sinon) |

Les constats lisent les valeurs courantes, réglages faits dans l'onglet
compris.

En Niveaux de gris, chaque couleur de la `.surface` (nuances et composants)
devient le gris de même clarté OKLab : `Y = L³`, puis encodage sRGB de `Y`
sur les trois canaux (fonction `gris`). Le texte des boutons pleins reste
`#FFFFFF` ou `#000000`. Les pastilles des paires, la liste, la roue et les
constats gardent leurs couleurs.

### 7.7 Carte « Réglages »

Paraît dès deux palettes cochées. Titre `Réglages` ; sous-titre `Teinte,
saturation et luminosité de chaque palette` ; résumé, selon la palette de
`regler` : `une intensité` pour une palette à une intensité, sinon `Soft` ou
`Vivid` ; choix : libellé `Régler` et une bascule des noms cochés, dans
l'ordre de cochage.

Une palette est modifiée quand une de ses valeurs diffère de celle de
l'ouverture de l'onglet : teinte de 0,5° ou plus, saturation de 0,005 ou plus,
luminosité de 0,0005 ou plus. Une valeur ramenée à son point de départ n'est
plus une modification. Le nom d'une palette modifiée, dans « Régler », est
suivi d'un `span.pastille-reglee` en ligne, 3 px à gauche.

Corps `.reglages-de-la-palette.reglages-harmonie` (grille) :

1. Si la palette de `regler` a changé depuis l'ouverture de l'onglet :
   `.tete-des-reglages` avec, à gauche, `button.btn.btn-secondary.btn-compact`
   `Annuler les modifications`. Il défait les réglages de cette palette faits
   dans l'onglet, et d'elle seule.
2. Trois réglettes de Création (`.reglette.reglage-de-la-palette.avec-legende`),
   marques, libellé, bouts et bouton de la section 3.2 :

   | Réglette | Bornes | Valeur | Défaut | Ajouts |
   |---|---|---|---|---|
   | Teinte | −30 à +30 | teinte rangée de l'intensité vue plus le décalage | 0 | `.absolu-du-reglage` : la teinte absolue que Création affiche, celle de la référence réglée, arrondie (`29°`) ; zones trop proches |
   | Saturation | 0 à 1 | part de l'intensité vue | part par défaut | points des autres palettes cochées |
   | Luminosité | bornes sûres de la carte Réglage global (la maquette prend −0,06 à +0,06) | décalage de clarté de l'intensité vue | 0 | points des autres palettes cochées |

   - **Piste** : neuf arrêts calculés comme dans Création (la maquette les
     approche en OKLCH depuis le cran 600 Light : teinte décalée de −30° à
     +30°, chroma de 0 à `C × 1 / part`, clarté décalée de −0,06 à +0,06).
   - **Zones trop proches** : `span.reglette-proche`, hachures à 135° de
     `--texte-avertissement` (1,5 px de trait, 3 px de vide), filets de 2 px aux
     deux bords, de 12 px de haut à 5 px du haut, `title` `Trop proche de
     <autre>`, de `début − 0,5°` à `fin + 0,5°`, bornée à la course. Le champ
     de valeur prend un cerne `--texte-avertissement` de 1 px tant que la valeur
     est dans `[début − 0,5 ; fin + 0,5]`. Les bouts de teinte se calculent sur
     la teinte absolue affichée.
   - **Points des autres palettes** : `span.marque-palette`, rond de 9 px à
     9 px au-dessus de la course, de la couleur du cran 600 Light de la palette,
     cerné de 1,5 px de `--fond`, avec un trait de 2 × 7 px `--texte-second`
     vers la piste ; `title` `<nom> : <valeur>`. Les valeurs sont les valeurs
     courantes, réglages faits dans l'onglet compris. La teinte n'en a pas.
3. **Teinte** : un réglage décale la teinte des deux intensités du même
   nombre de degrés ; saturation et luminosité ne touchent que l'intensité vue.
4. **Pointeur** : appuyer n'importe où sur la piste y place la valeur, puis
   la valeur suit le pointeur jusqu'au relâcher, comme dans Création ; arrondie
   au degré, au centième de part, au millième de clarté. La réglette agit sur
   la palette de `regler`. Tout se repeint pendant le glisser : nuances,
   composants, constats, compteur, liste, roue.
5. **Champ de valeur** : saisie et validation comme le champ de la carte
   Réglage global.

### 7.8 Carte « Roue des teintes »

Repliée par défaut. Résumé, carte repliée seulement : `Vision ` suivi de la
vision choisie en minuscules (`Vision normale`, `Vision deutéranopie`). Titre
`Roue des teintes` ; sous-titre `Glissez un point pour régler la teinte de sa
palette` ; choix : libellé `Vision` et `select.input` de 24 px : `Normale`,
`Deutéranopie`, `Protanopie`, `Tritanopie`.

Corps : un SVG de 420 × 256 px, `.plaque` (rayon 8 px, centré, 2 px de marge
haute), sur le fond de page de l'aperçu. Repère : centre (210, 128), rayon 70.
Un angle de teinte H se place à `(210 + 70 cos(H − 90°), 128 + 70 sin(H − 90°))`,
H = 0° en haut, sens horaire.

Dans l'ordre de dessin :

1. Cercle : sans fond, trait de 1 px `#D9D9D9` sur aperçu Light, `#3A3A3A`
   sur aperçu Dark.
2. Familles : les huit noms de la section 3.2 à rayon 116, centrés, ligne de
   base 3 px sous le point, 9,5 px graisse 400, `#9A9A9A` (Light) ou
   `#7A7A7A` (Dark).
3. Palette de `regler`, si elle est colorée : sa course, arc de la teinte
   affichée moins `(t + 30)` à la teinte affichée plus `(30 − t)`, trait de
   12 px de l'encre d'aperçu à 12 % d'opacité ; ses zones trop proches sur cet
   arc, bornées à −30° et +30°, trait de 12 px ambre, opacité 0,9, tirets de
   2 px et vides de 2 px.
4. Paires trop proches : un arc des deux teintes, élargi de 14° de chaque
   côté, trait de 10 px à bouts ronds, ambre `#C77A00` (Light) ou `#F3B53F`
   (Dark), opacité 0,5 ; `title` `A et B : trop proches`.
5. Points : un par palette colorée, à la teinte OKLCH de son cran 700 dans
   l'intensité et le thème vus ; rayon 5 px, 7 px si cochée ; remplissage
   `solid/default` ; contour ambre de 2 px dans une paire trop proche, de
   l'encre d'aperçu de 2 px si cochée, du fond de 1 px sinon ; `title` le nom ;
   curseur `grab`.
6. Noms, posés dans l'ordre des palettes de la recette : à 11 px du point, à droite si le point est à droite du centre (ancre
   début), à gauche sinon (ancre fin), 9,5 px graisse 600, ambre pour une
   paire trop proche, encre sinon. Jusqu'à huit palettes colorées, toutes ;
   au-delà, les cochées et celles des paires trop proches. Un nom à moins de
   11 px d'un nom déjà posé du même côté descend de 11 px, autant de fois que
   nécessaire.

Glisser un point : à l'appui, la palette passe dans `regler`, se coche si
elle ne l'est pas, et l'onglet se repeint. Sans place pour une cinquième
palette, rien ne se saisit et `trop` passe à vrai. L'angle du pointeur autour du centre donne une teinte ; la teinte
réglée devient la teinte rangée plus l'écart le plus court entre cette teinte
et celle du point à décalage nul, arrondie au degré et bornée à −30°, +30°. La
réglette de teinte et tout l'onglet suivent.

La vision choisie repeint les points par une simulation de dichromatie
(Viénot, Brettel et Mollon 1999, ou Machado 2009 à sévérité 1) ; elle ne lève
ni n'éteint aucune alerte. La maquette ne la simule pas.

### 7.9 Clavier et accessibilité

La maquette ne les montre pas ; le plugin les doit.

- Onglets : motif WAI-ARIA du socle (`createOnglets`).
- Réglettes : comportement de `ui/derive/reglette.ts` (flèches d'un pas,
  Maj et flèche ou Page précédente et suivante d'un grand pas, Début et Fin aux
  bornes permises) ; `aria-valuetext` dit la valeur et, dans une zone,
  `trop proche de <autre>`.
- Points de la roue : `role="slider"`, focalisables, flèches ±1°, Maj ±10°,
  `aria-label` `Teinte de <nom>`.
- Rangées de « Vos palettes » : la case porte le nom accessible de la palette ;
  la rangée entière est son `label`.
- Bascules : `aria-pressed`. Constats : `role="status"` sur la liste.

## 8. Textes

| Clé proposée | Français | Anglais |
|---|---|---|
| Bouton de réglette | Par défaut | Default |
| Bouton de carte | Tout par défaut | All to default |
| Libellé de la marque | par défaut | default |
| Résumé sans réglage | Par défaut | Default |
| Résumé modifié | Modifié : {liste} | Changed: {list} |
| Bouts | plus {famille} · plus terne · plus vive · plus foncée · plus claire | more {family} · duller · more vivid · darker · lighter |
| Familles | rose, rouge, orange, jaune, vert, turquoise, bleu, violet | pink, red, orange, yellow, green, turquoise, blue, purple |
| Bouton d'en-tête | Configuration | Settings |
| Onglets de la Configuration | Palettes · Général | Palettes · General |
| Phrase Palettes | Les réglages par défaut de toutes les palettes du fichier. | Default settings for every palette in this file. |
| Phrase Général | Les réglages du plugin sur ce poste. | Plugin settings on this computer. |
| Onglet | Harmonisation | Harmony |
| Ligne fixe | {n} paire(s) de palettes trop proches · Toutes vos palettes se distinguent | {n} pair(s) of palettes too close · All your palettes are distinct |
| Carte paires | Palettes trop proches · Difficiles à distinguer dans vos composants · Comparer | Palettes too close · Hard to tell apart in your components · Compare |
| Constat de paire | {Boutons pleins / Textes sur fond teinté} trop proches, en {thème} · presque identiques | {Filled buttons / Text on tinted background} too close, in {theme} · nearly identical |
| Carte liste | Vos palettes · Les nuances de 50 à {n}, en {thème} · Cochez de 2 à 4 palettes pour les comparer et les régler. · Tout décocher | Your palettes · Shades 50 to {n}, in {theme} · Check 2 to 4 palettes to compare and adjust them. · Uncheck all |
| Pied de liste | Aucune palette cochée · {n} cochée(s), 4 au plus · Quatre palettes au plus : décochez-en une. | No palette checked · {n} checked, 4 at most · Four palettes at most: uncheck one. |
| Carte Comparaison | Comparaison · Les palettes cochées, côte à côte · Couleurs · Niveaux de gris | Comparison · Checked palettes, side by side · Colors · Grayscale |
| Composants | Valider · Annuler · Message enregistré · En savoir plus | Confirm · Cancel · Message saved · Learn more |
| Constats | voir 7.6 | Translate with the same structure |
| Carte Réglages | Réglages · Teinte, saturation et luminosité de chaque palette · Régler · Annuler les modifications | Adjustments · Hue, saturation and lightness of each palette · Adjust · Undo changes |
| Carte roue | Roue des teintes · Glissez un point pour régler la teinte de sa palette · Vision · Normale, Deutéranopie, Protanopie, Tritanopie | Hue wheel · Drag a dot to adjust its palette's hue · Vision · Normal, Deuteranopia, Protanopia, Tritanopia |
| Vérification | trop proche de {nom} · Comparer | too close to {name} · Compare |

## 9. CSS des éléments nouveaux

Repris tel quel de la maquette ; les sélecteurs `.selects-proposes` et
`.harmonisation` deviennent des règles du socle et de l'onglet.

```css
.reglette-defaut { position: absolute; top: 3px; bottom: 3px; width: 2px; margin-left: -1px; border-radius: 1px; background: var(--texte); pointer-events: none; }
.reglette-legende, .reglette-bout { position: absolute; top: 24px; font-size: 9.5px; line-height: 1; color: var(--texte-second); white-space: nowrap; pointer-events: none; }
.reglette-legende { transform: translateX(-50%); color: var(--texte); }
.reglette-bout.gauche { left: -7px; } .reglette-bout.droite { right: -7px; }
.reglette.avec-legende { padding-bottom: 13px; }
.reglette .bouton-discret[disabled] { opacity: .35; cursor: default; }
.reglette .field-label .pastille-reglee { display: inline-block; margin-left: 5px; vertical-align: middle; }
.fantome-du-profil { font-weight: 600; }
.tete-des-reglages { display: flex; justify-content: flex-end; }
.tete-des-reglages .btn { margin-right: auto; }
.reglette-proche { position: absolute; top: 5px; height: 12px; background: repeating-linear-gradient(135deg, var(--texte-avertissement) 0 1.5px, transparent 1.5px 4.5px); box-shadow: inset 2px 0 var(--texte-avertissement), inset -2px 0 var(--texte-avertissement); pointer-events: none; }
.champ-nombre.champ-proche { box-shadow: inset 0 0 0 1px var(--texte-avertissement); }
.marque-palette { position: absolute; top: -9px; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; box-shadow: 0 0 0 1.5px var(--fond); pointer-events: auto; }
.marque-palette::after { position: absolute; top: 9px; left: 3.5px; width: 2px; height: 7px; background: var(--texte-second); content: ''; }
.icon-button.avec-libelle { width: auto; gap: 6px; padding: 0 10px; white-space: nowrap; font: inherit; font-size: var(--corps); font-weight: 600; color: var(--texte); }
.icon-button.avec-libelle svg { display: inline-block; flex: none; width: 12px; height: 12px; fill: currentColor; }
.harmonisation .tete-de-la-palette { display: flex; align-items: center; gap: 8px; }
.harmonisation .tete-de-la-palette h2 { margin-right: auto; }
.paires { display: grid; }
.paire { display: grid; grid-template-columns: 62px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--bordure); }
.paire:last-child { border-bottom: 0; }
.paire-couleurs { display: flex; gap: 3px; padding: 3px; border-radius: 5px; }
.paire-couleurs i { display: grid; place-items: center; width: 26px; height: 22px; border-radius: 4px; font: 600 11px Inter, sans-serif; font-style: normal; }
.paire-texte { display: grid; min-width: 0; font-size: 11px; line-height: 1.35; }
.paire-texte b, .paire-texte span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.paire-texte span { color: var(--texte-second); }
.liste-aide { margin: 0 0 6px; }
.liste { display: grid; grid-template-columns: 14px 78px minmax(0, 1fr) 16px; column-gap: 8px; row-gap: 2px; align-items: center; font-size: 11px; }
.numeros { display: flex; }
.numeros span { flex: 1; font-size: 9px; color: var(--texte-second); text-align: center; font-variant-numeric: tabular-nums; }
.rampe-continue { display: flex; height: 14px; }
.rampe-continue i { flex: 1; }
.rampe-continue i:first-child { border-radius: 3px 0 0 3px; }
.rampe-continue i:last-child { border-radius: 0 3px 3px 0; }
.liste .ligne-de-palette { display: contents; cursor: pointer; }
.liste .fond-de-ligne { grid-column: 1 / -1; height: 22px; border-radius: 4px; }
.liste .ligne-de-palette[data-cochee="true"] .fond-de-ligne { background: color-mix(in srgb, var(--fond-marque) 22%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fond-marque) 60%, transparent); }
.liste input { margin: 0 0 0 2px; width: 12px; height: 12px; cursor: pointer; }
.liste .nom { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.liste .signal { display: grid; place-items: center; width: 14px; height: 14px; border-radius: 50%; background: var(--texte-avertissement); color: var(--fond); font-size: 10px; font-weight: 700; line-height: 1; }
.pied-de-carte { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 8px; }
.surface { padding: 10px; border-radius: 6px; }
.nuances { display: grid; grid-template-columns: 70px minmax(0, 1fr); column-gap: 8px; row-gap: 4px; align-items: center; font-size: 10.5px; margin-bottom: 12px; }
.nuances .numeros span { color: inherit; opacity: .7; }
.nuances b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nuances .rampe-continue { height: 20px; }
.composants { display: grid; gap: 7px 8px; align-items: center; font-size: 10.5px; }
.composants b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.composants .btn-c { display: grid; place-items: center; height: 24px; border-radius: 5px; font-weight: 600; border: 1px solid transparent; }
.composants .message { padding: 6px 7px; border-radius: 5px; line-height: 1.3; }
.composants .lien { font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
.constats { display: grid; gap: 4px; margin-top: 8px; }
.constat { display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 6px; padding: 6px 8px; border-radius: var(--rayon); font-size: 11px; line-height: 1.4; }
.constat i { font-style: normal; font-weight: 700; text-align: center; }
.constat[data-ton="succes"] { background: var(--fond-succes); color: var(--texte-succes); }
.constat[data-ton="info"] { background: color-mix(in srgb, var(--fond-marque) 18%, var(--fond)); color: var(--texte-marque); }
.constat[data-ton="avertissement"] { background: var(--fond-avertissement); color: var(--texte-avertissement); }
.constat[data-ton="danger"] { background: var(--fond-danger); color: var(--texte-danger); }
.reglages-harmonie { display: grid; }
.plaque { margin: 2px auto 0; border-radius: 8px; }
.roue text { font: 600 9.5px Inter, sans-serif; }
select { font: inherit; }
select.input { appearance: none; -webkit-appearance: none; padding: 0 24px 0 var(--espace-controle); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23b3b3b3'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 9px center; cursor: pointer; }
select.input:hover { background-color: var(--fond-survol); }
.champ-prereglage, .carte-choix select.input { width: auto; height: var(--hauteur-secondaire); }
.bilan-des-palettes { grid-template-columns: minmax(0, 1fr); }
```

## 10. Calculs du moteur

- **Distance** : OKLab euclidienne entre deux couleurs à 8 bits
  (`rgb8VersOklch`, `oklchVersOklab`).
- **Paires** : pour chaque couple de palettes colorées, la plus petite distance
  sur `solid/default` et `surface/foreground`, Vivid ou unique, Light et Dark
  (`distanceMin` de `Mesures/generer-ensembles.ts`).
- **Zones trop proches** : pour la palette réglée et chaque palette avec
  laquelle elle forme une paire en alerte, la distance à chaque degré entier
  de −30° à +30° de sa teinte, l'autre palette immobile ; la teinte se règle
  comme dans Création (`referenceReglee` depuis `departDe`, porteur figé).
  Soit 61 rampes par paire. Une zone est une suite de degrés sous le seuil.
  Les degrés se lisent sur la valeur du profil porteur et se décalent de
  `teinte rangée de l'intensité vue − teinte rangée du porteur` pour la
  réglette.
- **Recalcul** : au relâcher d'une réglette ou d'un point, toutes les paires
  et les zones de la palette réglée se recalculent ; pendant le glisser, la
  palette réglée seule.

## 11. Ce que la maquette simplifie

| Maquette | Plugin |
|---|---|
| Seule la teinte de la paire de démonstration recalcule ses couleurs ; les autres réglettes et points bougent sans repeindre | Chaque réglage recalcule les rampes de la palette |
| Paires et zones précalculées pour les paires en alerte | Recalcul selon la section 10 |
| Bornes de luminosité −0,06, +0,06, sans hachures de limites | Bornes et hachures de la carte Réglage global |
| Pistes approchées en OKLCH | Pistes peintes par le moteur, comme dans Création |
| Vision des couleurs sans effet sur les points ; elle change le résumé | Simulation de la section 7.8 |
| L'alerte de la paire de démonstration suit le premier de ses deux membres réglés ; un degré absent prend le voisin à ±3° | Recalcul de chaque paire |
| Les zones restent affichées une fois la paire distinguée | Les zones suivent le recalcul |
| L'onglet ne se désactive pas : les deux jeux ont plus de deux palettes | Section 7.2 |
| Champs de valeur sans saisie | Section 7.7 |
| Teinte absolue et pistes lues sur le cran 600 Light ; piste de saturation à `C × x / part`, ou `0,3 × x` sous une part de 0,01 ; chroma réduite de ×0,9 jusqu'à 24 fois hors gamut | Teinte de la référence réglée ; pistes du moteur |
| Dans l'état de la galerie, la saturation de Vivid vaut sa valeur par défaut | Valeur par défaut calculée selon la section 3.2 |
| « Tout par défaut » jamais désactivé dans l'écran figé | Section 3.2 |
| Seule la roue se replie | Section 7.2 |
| Thème sombre de Figma seul | Deux thèmes, par les variables du socle |
| Pas de clavier | Section 7.9 |

## 12. Vérifier une reproduction

1. Construire la galerie du plugin avec un état par écran H1 à H7, aux mêmes
   données que `donnees-ensembles.js` (jeu « Fichier du mainteneur » ; jeu
   « Vingt palettes de la galerie » pour H7), à 480 px.
2. Capturer chaque écran de la maquette :
   `ANCRE="#r-harmonisation-1 .cadre:nth-child(2) iframe" LARGEUR=2700 node Mesures/capturer.mjs Maquettes/MAQUETTE-COMPARER.html sortie.png`
   (H2 ici ; `.cadre:nth-child(n)` pour les autres, `#r-reglage`,
   `#r-configuration`, `#r-listes` pour les sections 1, 2 et 4).
3. Comparer au pixel les deux captures, aux mêmes données et au même état.
   Les écarts admis sont ceux de la section 11.
