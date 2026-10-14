# Comparer, harmoniser, différencier : dossier

**Statut : proposition à valider.** Ce dossier repense la comparaison de
palettes à partir des recherches d'interface antérieures, du marché et des
retours du mainteneur sur trois versions précédentes. Création reste consacrée
à une seule palette et marque la valeur par défaut de chaque réglette. Le
panneau des réglages communs devient la Configuration, en deux onglets. Un
onglet Harmonisation compare des palettes, signale celles qui se ressemblent
trop et règle chacune avec les réglettes de Création. La
[maquette](./Maquettes/MAQUETTE-COMPARER.html) part des écrans réels de la
galerie, en thème sombre ; ses écrans d'Harmonisation répondent aux clics. La
[spécification des écrans](./SPEC-ECRANS-HARMONISATION.md) en décrit chaque
mesure, texte et comportement pour une reproduction au pixel près. Les
décisions C1 à C10 sont en section 11.

## 1. Le besoin

| Tâche | Question du designer | Ce qui la règle |
|---|---|---|
| Comparer | Mes palettes vont-elles ensemble, nuance par nuance et sur des composants ? | Une vue de plusieurs palettes côte à côte |
| Harmoniser | Comment donner une saturation et une clarté voisines à mes statuts ? | La saturation et la luminosité propres de chaque palette |
| Différencier | Deux statuts se ressemblent : laquelle déplacer, de combien, vers où ? | La teinte d'une des deux palettes |

La recette critique a établi les causes chiffrées. Avec les valeurs par
défaut, la clarté des quatre utilitaires tient à 0,002 près hors références ;
les différences de 0,016 à 0,047 viennent des luminosités propres. La
saturation varie de ×4,2 avec la part constante, de ×1,7 avec l'enveloppe.
Avec la table retenue, le fichier du mainteneur n'a plus de paire trop
proche : Terracota et Poppy ne se confondaient que par leur texte Dark 900, à
une distance de 0,047, et ce texte passe au cran 950.

Les trois tâches passent donc par les trois réglettes que Création connaît
déjà : teinte, saturation, luminosité. Seule la vue de plusieurs palettes est
nouvelle.

Les questions de la demande, et leur réponse :

| Question | Réponse |
|---|---|
| Combien de palettes harmoniser | Toutes sont listées ; 2 à 4 se cochent pour comparer et régler (section 8) |
| Quelle référence | Aucune palette : la courbe commune de la Configuration. Aux valeurs par défaut, deux crans de même numéro ont la même clarté ; « Par défaut » y ramène une palette |
| Quelle règle | Même clarté au même numéro ; saturation voisine par l'enveloppe ([solution](./SOLUTION-RAMPES.md), S1) |
| Luminosité seule, ou plus | Luminosité et saturation pour harmoniser ; la teinte pour différencier |
| Tons clairs et foncés séparément | Color shift règle la luminosité au bout clair et au bout sombre ; l'onglet aligne les nuances par numéro, et l'écart d'un bout s'y voit |
| « Plus rouge », « plus jaune » | Les deux bouts de la réglette de teinte se nomment d'après la famille voisine (section 6) |
| Un écart minimal entre palettes | Le seuil des couleurs proches de la recette, mesuré sur le plein et le texte ; sur la réglette de teinte, une zone hachurée le traduit en degrés (section 8) |

## 2. Ce que les recherches précédentes ont proposé

| Source | Proposition | Sort |
|---|---|---|
| [Proposition finale](../Intégration%20du%20marché/03%20Proposition%20finale/PROPOSITION-FINALE.md), piste 13 | « Comparer à » dans l'en-tête de l'aperçu : une seconde palette peinte sous la palette ouverte, ligne Δ par cran, pour la session. « Proches à dessein » range une paire voulue et tait l'alerte | Non implémentée ; la direction simple a retiré les marques qui portaient la portée de l'alerte |
| Même source, piste « Distinguer les statuts » | Une carte repliée : quatre spécimens de statut, choix d'une vision (Viénot 1999, Brettel 1997), paires sous le seuil dans cette vision, aucune alerte, car `[VER-08]` veut qu'une alerte mène au réglage qui la lève | Non implémentée ; l'onglet Système qui la portait a disparu |
| [Direction globale](../Intégration%20du%20marché/06%20Direction%20globale/DIRECTION-GLOBALE.md) | « Comparer à une autre palette » repliée dans l'onglet Vérifier | Abandonnée avec la direction globale, jugée trop complexe |
| [Plan d'harmonisation](../Harmonisation%20entre%20palettes/PLAN-RECHERCHE-HARMONISATION.md) | Quatre hypothèses : témoin dans Création (A), carte dans Vérification (B), vue de cohérence dans Gestion (C), réglage de groupe (D). Recommandait A, parce que l'écart naît pendant le réglage | Non tranchée |
| [Dossier d'harmonisation](../Harmonisation%20entre%20palettes/DOSSIER-HARMONISATION.md) | Comparer dans Vérification sans palette ouverte, groupe choisi à la volée, alignement de la luminosité seule par une modale | Décisions D1 à D7 en attente |
| Première version de ce dossier | Un onglet Comparer sur un groupe « Statuts » | Le groupe n'avait ni création ni règle : la maquette supposait un objet que le plugin ne connaît pas |
| Deuxième version | Ouvrir plusieurs palettes dans Création et les régler ensemble | Refusée par le mainteneur : Création doit rester à une palette ; vingt palettes en composants surchargent l'écran |
| Troisième version | Onglet Comparer après Création ; « Points à regarder » ; « Rétablir » sur n palettes ; « Écarter » par une modale qui propose une rotation de teinte ; écarts chiffrés et encart de légende dans Réglage global | Refusée par le mainteneur : textes techniques (ΔEok, rotation, écart), cases confondues avec le carré du texte sur plein, rétablissement de groupe dangereux, un seul bouton qui règle à la place du designer |

Six leçons :

1. **Chaque proposition a buté sur le groupe.** Un groupe nommé demande sa
   création, son renommage, sa survie à une suppression et une place dans la
   recette. Aucune n'a résolu ces règles à un coût acceptable.
2. **Une alerte mène au réglage qui la lève** (`[VER-08]`). Une différence
   qu'aucun réglage ne corrige est une information, pas une alerte.
3. **Le mainteneur a écarté la complexité** : la direction globale a cédé la
   place à la direction simple.
4. **Le designer règle lui-même.** Un bouton qui choisit une rotation, ou
   rétablit plusieurs palettes d'un coup, lui retire la main sur une couleur
   de marque. L'outil montre où aller ; la réglette reste dans sa main.
5. **L'écran parle la langue du designer.** ΔEok, rotation, part, écart aux
   valeurs communes : aucun de ces mots ne s'affiche. L'écran dit ce qui se
   ressemble, dans quel thème, et vers quelle couleur va une réglette.
6. **Chaque espace garde un seul sujet.** Une palette dans Création, plusieurs
   dans Harmonisation, les valeurs par défaut dans la Configuration.

## 3. Ce que le plugin fait aujourd'hui

| Mécanisme | Où | Ce qu'il fait | Ce que la refonte en fait |
|---|---|---|---|
| Sélecteur | Barre de Création et de Vérification | Ouvre une palette ; porte la marque de verdict | Inchangé |
| Nuancier | Création et Vérification sans palette ouverte | Trois aplats par palette ; un clic ouvre la palette | Inchangé ; Harmonisation a sa propre liste |
| Réglage global | Création, carte repliée | « Régler » Soft, Vivid ou les deux ; repère « S » de l'autre profil ; zones hachurées des limites ; « Rétablir » ; résumé « Réglé » | Marque par défaut, bouts de piste nommés (section 6) |
| Color shift | Création, carte repliée | Teinte, saturation et luminosité aux deux bouts ; « Tout rétablir » en tête ; point bleu sur une grandeur réglée | Même marque et mêmes bouts |
| « Annuler les modifications » | Barre de la palette | Défait les changements de la palette ouverte depuis son ouverture | Harmonisation a le sien, dans sa ligne fixe |
| Bilan | Vérification sans palette ouverte | Filtres À corriger, À vérifier, Conformes ; une ligne par message et son lien | Une paire trop proche y mène à Harmonisation |
| Alerte `palettes-proches` | Pied de Création, bilan de Vérification | ΔEok moyen des crans 500 à 700 en Light, Vivid contre Vivid ; le bilan affiche « trop proche de Azur, ΔEok 0,01 » | Mesurée sur le plein et le texte du fond teinté, dans les deux thèmes ; aucun ΔEok à l'écran |
| Réglages communs | Engrenage sans libellé | Langue, fonds, intensités, luminosité des nuances, seuils, planches | Configuration en deux onglets (section 7) |
| Compteur d'onglet | Onglet Vérification | Nombre de points à corriger, ou ✓ | Même compteur sur Harmonisation |

Le constat du bilan contredit une règle du plugin : `constatDAlerte`, dans
`i18n/fr.ts`, écrit qu'une proximité ne donne pas sa mesure en ΔEok et que le
rapport exporté la garde (`[VER-08]`). `procheDe`, quelques lignes plus bas,
l'affiche quand même.

## 4. Ce que fait le marché

Outils lus dans leur code ou leur documentation publique. Atmos, Supa Palette
et l'aide de Coolors n'ont pas pu être vérifiés au-delà de leurs pages
commerciales.

| Outil | Vue | Harmoniser | Différencier |
|---|---|---|---|
| [Huetone](https://github.com/ardov/huetone) | Grille teintes × crans ; graphiques L, C, H du cran choisi pour toutes les teintes | « Apply current luminance to column » : une action par colonne de cran | Contraste de la couleur choisie ; pas de vision des couleurs |
| [Harmonizer](https://github.com/evilmartians/harmonizer), plugin Figma | Grille niveaux × teintes ; L, contraste, C, H sur chaque cellule | L'en-tête d'une colonne fixe un contraste cible et un plafond de chroma pour toutes les teintes ; « Even chroma » prend le plus petit des maximums | Aucun |
| [Leonardo](https://leonardocolor.io/theme.html) | Rampes sur un fond commun ; roue avec un point par rampe | Curseurs de clarté, contraste et saturation sur tout le thème | Protanopie, deutéranopie, tritanopie avec un ΔE minimum affiché |
| [Adobe Color](https://blog.adobe.com/en/publish/2020/05/21/celebrate-global-accessibility-awareness-day-with-adobe-color) | Roue à cinq pastilles | Non documenté | Une ligne de conflit relie deux pastilles indiscernables pour une vision ; badge sans conflit |
| [Material](https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/blend/blend.ts) | Rôles des couleurs étendues | `Blend.harmonize` tourne la teinte vers la couleur source, de la moitié de l'écart et de 15° au plus ; chroma et ton gardés | Aucun |
| [Radix](https://www.radix-ui.com/colors/custom), [uicolors.app](https://uicolors.app/create) | Rampes et composants d'exemple | Non documenté | Aucun |

Constats :

1. **Le cran est l'unité de comparaison** : une colonne de la grille aligne la
   même nuance de toutes les teintes.
2. **Tous les outils règlent par curseurs, en direct.** Aucun ne propose de
   valeur dans une modale.
3. **Harmonizer aligne la chroma par un plafond commun**, le plus petit des
   maximums. C'est le principe de l'enveloppe de la recette critique.
4. **La différenciation passe par la roue** : lignes de conflit (Adobe Color),
   un point par rampe (Leonardo). Aucun outil ne signale deux teintes trop
   proches en vision normale, ni ne montre sur le curseur où elles le sont.

La refonte en retient la grille alignée par nuance, le réglage en direct, la
roue avec ses lignes de conflit. La zone hachurée « trop proche » sur la
réglette de teinte est propre à UCM : elle reprend les zones hachurées des
limites de contraste que Création affiche déjà.

## 5. Les principes retenus

1. **Création règle une palette**, à une ou deux intensités.
2. **Harmonisation est un onglet**, entre Vérification et Gestion. Il porte sur
   toutes les palettes du fichier, quelle que soit la palette ouverte dans
   Création.
3. **La vue d'ensemble d'abord, le détail à la demande.** Toutes les palettes
   sur une ligne de nuances ; comparaison et réglages pour 2 à 4 palettes
   cochées.
4. **Le designer règle lui-même**, une palette à la fois, avec les réglettes de
   Création. L'onglet ne règle rien à sa place.
5. **Une alerte montre ses deux couleurs** et dit, en mots, le rôle et le thème
   où elles se ressemblent.
6. **Un terme par concept** : « par défaut » pour la valeur que la
   Configuration donne à toutes les palettes, « trop proches » pour deux
   palettes à distinguer.
7. **Aucun objet nouveau.** Pas de groupe rangé : la sélection vit le temps de
   l'onglet.
8. **Les composants existants d'abord** : réglettes de Création, onglets et
   bouton du socle, ligne fixe, lignes du bilan, compteur d'onglet, case à
   cocher du socle. La maquette les reprend depuis la galerie.

## 6. Réglage global, dans Création

### Aujourd'hui

| Défaut | Effet |
|---|---|
| Le résumé dit « Réglé » | Carte repliée, rien ne dit ce qui a changé |
| Aucune réglette ne montre sa valeur par défaut | « Rétablir » ramène à une valeur que l'écran ne dit pas |
| « Rétablir » a le même poids sur une valeur intacte | Rien ne distingue les réglettes modifiées |
| Le repère « S » | Il marque l'autre profil ; rien ne le dit |

La troisième version ajoutait un trait d'écart, un résumé chiffré et un encart
de légende en pied de carte. Le mainteneur les a jugés inutiles ou obscurs ;
ils disparaissent.

### Proposé

- **Une marque blanche par réglette** : la valeur par défaut. Le libellé
  « par défaut » paraît dessous quand le pouce s'en éloigne ; sur la valeur par
  défaut, le pouce cache la marque et rien ne s'ajoute.
- **Des mots aux deux bouts de chaque piste** : « plus turquoise » et « plus
  violet » pour la teinte d'un bleu, nommés d'après la famille de teinte
  voisine ; « plus terne » et « plus vive » ; « plus foncée » et « plus
  claire ». Un bout que chevauche « par défaut » s'efface.
- **Un point bleu après le nom d'une réglette modifiée**, celui des onglets de
  grandeur de Color shift.
- **« Par défaut » ne s'active que sur une valeur modifiée** ; son survol dit
  « Revenir à la valeur par défaut », suivi de la valeur (section 12).
- **« Tout par défaut » en tête du corps de la carte**, à la place qu'occupe
  « Tout rétablir » dans Color shift. Il agit sur l'intensité choisie dans « Régler ».
- **Le repère dit « Soft »** (ou « Vivid ») au lieu de la lettre.
- **Le résumé** dit « Par défaut », ou « Modifié : » suivi des réglages et de
  leur intensité, sans chiffre : « Modifié : teinte de Soft, luminosité de
  Vivid ».

Color shift reçoit la même marque, les mêmes bouts et le même résumé.

La valeur par défaut de chaque réglette :

| Réglette | Valeur par défaut |
|---|---|
| Teinte | 0° : la teinte de la référence |
| Saturation | L'intensité de la Configuration pour ce profil ; pour le profil qui porte la référence, la saturation de la référence |
| Luminosité | 0 |

### Le libellé de la marque

| Libellé | Pour | Contre |
|---|---|---|
| **par défaut** (retenu) | Le mot de toutes les interfaces pour une valeur que le designer n'a pas choisie. Il relie la marque à la Configuration, qui règle les valeurs par défaut des palettes | Deux mots |
| défaut | Court | Se lit aussi « imperfection » |
| initial | Court, courant | Ambigu : la valeur à l'ouverture de la palette, ou à sa création ? |
| config. | Nomme la source | Abrégé, technique ; ne dit pas que la palette n'a rien réglé |
| standard | Court | Ne dit pas d'où vient la valeur |
| référence, départ, préréglage | | « Référence » désigne déjà la couleur de référence ; « départ » ne dit pas que la valeur est par défaut ; « préréglage » nomme déjà le choix de courbe de Color shift |

## 7. La Configuration

### Ce qu'elle est

Le panneau qui s'ouvre par l'engrenage, en haut à droite, et qui se ferme par
« Retour aux palettes ». Il s'appelle aujourd'hui « Réglages communs ». Il
porte la langue, puis les valeurs par défaut de toutes les palettes du
fichier : couleurs de fond et texte des boutons, intensités Soft et Vivid,
intensité des fonds du thème Dark, luminosité des nuances, contrastes
minimums, détection des couleurs proches, contenu des planches.

### Pourquoi elle ne se comprend pas

- L'engrenage n'a pas de libellé ; son nom n'apparaît qu'au survol.
- Le panneau ne dit pas à quoi il sert.
- Il s'ouvre sur la langue, préférence de ce poste, au milieu de valeurs
  partagées par les palettes du fichier.

### Proposé

La page de configuration de Contract Exporter sert de modèle : le titre
« Configuration », les onglets du socle (`createOnglets`), puis une phrase qui
dit ce que l'onglet règle.

- **Le bouton porte son nom** : engrenage et « Configuration ». Le bouton vient
  du socle (`EnTete.ts`) : Contract Exporter et l'explorateur le reçoivent
  aussi.
- **Onglet Palettes**, ouvert par défaut. Sa phrase : « Les réglages par défaut
  de toutes les palettes du fichier. » Puis les cartes actuelles, langue
  retirée.
- **Onglet Général** : la langue. Sa phrase reprend celle de Contract
  Exporter : « Les réglages du plugin sur ce poste. »

L'onglet Palettes passe en premier, alors que Contract Exporter ouvre sur
Général : dans UCM Palettes, l'onglet Général ne porte que la langue.

## 8. L'onglet Harmonisation

### Le nom

Les trois onglets actuels finissent en « -ion » ou presque : Création,
Vérification, Gestion.

| Nom | Pour | Contre |
|---|---|---|
| **Harmonisation** (retenu) | Dit le but : accorder les palettes entre elles. Comparer et distinguer en font partie. Tient dans la barre à 480 px, compteur compris | Le plus long des quatre onglets |
| Comparaison | Dit ce qu'on voit | Ne dit pas qu'on y règle |
| Cohésion | Court | Abstrait ; aucun outil du marché ne l'emploie |
| Distinction | Dit la différenciation | Oublie la saturation et la clarté |
| Coordination | | Évoque une organisation d'équipe |
| Juxtaposition | Exact pour la vue | Long, technique |

### De haut en bas

| Élément | Paraît | Contenu |
|---|---|---|
| Onglet | Toujours, dès deux palettes | « Harmonisation », entre Vérification et Gestion, avec le compteur des paires trop proches, de même facture que celui de Vérification |
| Ligne du titre | Toujours | « Harmonisation », la bascule Soft et Vivid, la bascule Light et Dark |
| Ligne fixe | Toujours | « 1 paire de palettes trop proches », ou « Toutes vos palettes se distinguent ». Un état, sans bouton |
| Carte « Palettes trop proches » | Une paire au moins | Une ligne par paire : les deux couleurs en cause dans le thème en cause, « Bleu et Azur » en gras, « Textes sur fond teinté trop proches, en Light », le lien « Comparer » |
| Carte « Vos palettes » | Toujours | « Cochez de 2 à 4 palettes pour les comparer et les régler. » Une ligne par palette : la case du socle à gauche du nom, ses onze nuances jointes, arrondies aux deux bouts, et un rond ambre « ! » si elle est trop proche d'une autre, de la facture du compteur de l'onglet. Les numéros se centrent sur leur nuance. La ligne cochée se surligne en bleu |
| Carte « Comparaison » | Deux palettes cochées | Sur le fond de page du thème : les nuances jointes, alignées par numéro, puis des composants rangés en colonnes (bouton plein, bouton à contour, message sur fond teinté, lien). Bascule Couleurs et Niveaux de gris. Sous le fond, les constats |
| Carte « Réglages » | Deux palettes cochées | « Régler » et le nom des palettes cochées, un point bleu après chaque palette modifiée ; « Annuler les modifications » pour la palette choisie, quand elle a changé ; les trois réglettes de Création |
| Carte « Roue des teintes » | Toujours, repliée | La teinte des boutons pleins sur le fond de page de l'aperçu, les familles de teinte autour, un arc ambre sur les teintes d'une paire trop proche, dont les points et les noms passent en ambre ; liste « Vision ». Glisser un point règle la teinte de sa palette, dans la course de −30° à +30° que la roue dessine pour la palette réglée, avec ses zones trop proches. Jusqu'à huit palettes colorées, toutes sont nommées ; au-delà, les cochées et celles des paires trop proches |

### Ce qui compte comme trop proche

Deux palettes colorées sont trop proches quand leur plein, en Light ou en
Dark, ou le texte de leur fond teinté, en Light, passe sous le seuil des
couleurs proches de la recette (0,05 en ΔEok), dans l'intensité Vivid ou
l'intensité unique. Les crans sont ceux de la table retenue
([solution](./SOLUTION-RAMPES.md), S2). Les neutres en sont exclus : un gris
n'a pas de teinte à confondre. Les fonds teintés en sont exclus aussi : pâles
par construction, ils se ressemblent presque tous. Le texte des fonds en Dark
l'est désormais pour la même raison : au cran 950, presque blanc, il se
ressemble d'une palette à l'autre.

| Jeu | Paires | Avec les fonds teintés | Plein, texte des deux thèmes | Plein, texte en Light (retenu) | Plein seul |
|---|---|---|---|---|---|
| Fichier du mainteneur, 6 palettes colorées | 15 | 5 | 3 | 0 | 0 |
| Galerie, 18 palettes colorées | 153 | 72 | 56 | 12 | 8 |

La galerie rassemble à dessein des quasi-doublons (Bleu et Azur, Vert et
Feuille, Violet et Pourpre). Compter le texte Dark 950 donnerait 56 alertes,
dont la plupart qu'aucun réglage de teinte ne sépare : des textes presque
blancs. Le texte Light ajoute 4 paires au plein, des teintes voisines aux
textes colorés (Lime et Vert, Jaune et Cuivre). La décision C6 compare donc le
plein dans les deux thèmes et le texte du fond teinté en Light.

### Les constats de la comparaison

| Constat | Condition | Ton |
|---|---|---|
| « Bleu et Azur : textes sur fond teinté trop proches en Light. Sortez la teinte de l'une d'elles de la zone hachurée, dans Réglages. » | Une paire cochée trop proche | Avertissement |
| « Ces palettes se distinguent, en Light et en Dark. » | Aucune paire cochée trop proche | Succès |
| « En Soft, Grass est la plus terne et Poppy la plus vive. » | Saturations des palettes cochées étalées de 0,20 ou plus | Information |
| « En Soft, Poppy est plus claire que les autres. » | Luminosités étalées de 0,01 ou plus | Information |

Chaque constat prend le fond et le texte de son ton : `--fond-succes` et
`--texte-succes`, `--fond-avertissement` et `--texte-avertissement`,
`--fond-danger` et `--texte-danger`. Le socle n'a pas de ton d'information :
la maquette mêle `--fond-marque` au fond de la carte et écrit en
`--texte-marque`. Les deux seuils d'information sont des valeurs d'essai.

### Régler

La carte Réglages reprend les réglettes de la carte Réglage global : les mêmes
valeurs, les mêmes limites hachurées, la même marque par défaut et les mêmes
bouts de piste. Elle y ajoute :

- **La zone trop proche**, sur la teinte : des hachures ambrées sur les
  valeurs où la palette réglée serait trop proche d'une autre ; leur survol
  nomme l'autre palette. Le champ de valeur se cerne d'ambre tant que le pouce
  y reste. Le calcul refait la rampe à chaque degré de −30° à +30° : 61 rampes
  par palette réglée et par paire en alerte.
- **Les points des autres palettes cochées**, sur la saturation et la
  luminosité : un point de leur couleur, à leur valeur. Le designer aligne une
  palette sur une autre en posant le pouce sur son point. La teinte n'en a
  pas : 0° y veut dire la teinte de chaque référence.

La teinte se décale sur les deux intensités ensemble, comme « Les deux » dans
Création : une palette garde ses deux intensités de même teinte. La
saturation et la luminosité se règlent sur l'intensité vue.

Les réglages valent pour la palette, comme dans Création : Gestion passe la
palette à « À mettre à jour ».

« Annuler les modifications » suit le modèle de Création, où le bouton paraît
sous le sélecteur de palette et ne vaut que pour la palette ouverte. Dans
Harmonisation, « Régler » tient lieu de sélecteur : le bouton paraît en tête
de la carte Réglages, en bouton secondaire compact, quand la palette choisie
a changé depuis l'ouverture de l'onglet, et il ne défait que ses réglages. La
ligne fixe reste un état, comme dans Création ; un bouton n'y a pas sa place.

Les paires en alerte de la galerie, avec la table retenue, et le plus petit
réglage de teinte qui les sépare :

| Paire | Thème et rôle | Réglage qui les sépare |
|---|---|---|
| Vert et Feuille | Dark, plein | 23° ; presque identiques |
| Bleu et Azur | Light, texte du fond teinté | 17° ; presque identiques |
| Bleu et Marine, Marine et Azur | Dark, plein | 12° |
| Violet et Pourpre | Dark, plein | 6° |
| Lime et Vert, Lime et Feuille | Light, texte du fond teinté | 10° |
| Jaune et Cuivre | Light, texte du fond teinté | 11° |
| Rouge et Cuivre | Light, texte du fond teinté | 5° |
| Cyan et Teal, Indigo et Azur, Bleu et Indigo | Light, texte du fond teinté | 1° à 2° |

Les douze paires sont dans `Maquettes/donnees-ensembles.js`.

### Le parcours

1. Le compteur de l'onglet signale une paire, visible depuis Création.
2. Dans Harmonisation, la carte « Palettes trop proches » montre les deux
   couleurs en cause. « Comparer » coche la paire, passe l'aperçu dans le
   thème en cause et choisit à régler la palette qu'un plus petit réglage
   sépare.
3. La Comparaison montre les deux palettes ; le constat dit de sortir une
   teinte de la zone hachurée.
4. Le designer glisse la teinte, dans le sens que disent les bouts de piste.
   Nuances, composants, constat et compteur suivent en direct.
5. Pour harmoniser, il coche jusqu'à quatre palettes, lit le constat de
   saturation ou de clarté, passe en niveaux de gris pour juger la clarté, et
   pose une palette sur le point d'une autre.

### Les entrées

- Le compteur de l'onglet.
- Dans Vérification, une palette trop proche d'une autre porte « Comparer » au
  lieu de « Vérifier », et son constat devient « trop proche d'Azur », sans
  ΔEok.

### Vingt palettes

La liste des vingt palettes de la galerie tient en 500 px, à 24 px par ligne.
Au-delà de huit palettes colorées, la roue ne nomme que les palettes cochées
et celles des paires trop proches ; le survol d'un point donne les autres. Les composants restent à quatre
palettes : à cinq, les colonnes passent sous 80 px et les libellés des
boutons se coupent.

## 9. États et cas limites

| Cas | Comportement |
|---|---|
| Moins de deux palettes | L'onglet est désactivé |
| Aucune paire trop proche | Pas de carte « Palettes trop proches » ; la ligne fixe dit « Toutes vos palettes se distinguent » |
| Moins de deux cases cochées | Pas de Comparaison ni de Réglages |
| Cinquième case | Elle ne se coche pas ; le pied de la liste dit « Quatre palettes au plus : décochez-en une » |
| Palette à une intensité | Sa rampe unique sous Soft et sous Vivid ; ses réglettes sans intensité |
| Palette grise | Hors de la roue et des paires ; sa teinte désactivée, comme dans Création |
| Palette figée | Comparée et cochable ; ses réglettes désactivées, comme dans Création |
| Paire presque identique | Le constat ajoute « presque identiques » ; la zone couvre presque toute la piste |
| Aucune teinte de la piste ne sépare la paire | La zone couvre toute la piste ; le constat dit de changer la référence de l'une dans Création |
| Référence ancrée ◆ | La teinte déplace la référence, comme dans Création |

## 10. Ce que chaque proposition touche

| Proposition | Fichiers |
|---|---|
| Marque par défaut et bouts de piste | `ui/derive/reglette.ts`, `ui/reglagesDeLaPalette.ts`, l'éditeur de Color shift, `i18n/fr.ts` et `i18n/en.ts` |
| Configuration | `ui/configuration.ts`, `createOnglets` et `EnTete.ts` du socle, `configuration.ts` pour les palettes qui ont leur propre valeur |
| Alerte par rôle, constat sans ΔEok | `analyse.ts`, `presentation.ts`, `ui/bilanDesPalettes.ts`, `procheDe` dans `i18n` ; le seuil reste `seuils.palettesProches` |
| Onglet Harmonisation | Nouveau module d'onglet, `navigation.ts`, réglettes de `ui/reglagesDeLaPalette.ts`, distance par degré de teinte dans `packages/couleur`, gris de même clarté, galerie et tests d'interface |
| Bilan à 480 px | `.bilan-des-palettes` dans `ui/styles.css` (section 12) |
| Recette | Aucun changement de format |

## 11. Décisions

| # | Décision | Proposition |
|---|---|---|
| C1 | Nom et place de l'onglet | « Harmonisation », entre Vérification et Gestion |
| C2 | Choisir les palettes | Carte « Vos palettes » : toutes les palettes, case du socle à gauche du nom, 2 à 4 cochées ; aucun groupe rangé |
| C3 | Comparer | Carte Comparaison : nuances jointes et alignées, composants en colonnes, Couleurs ou Niveaux de gris, constats en mots simples sur le fond de leur ton |
| C4 | Harmoniser | Carte Réglages : une palette cochée à la fois, réglettes de Création, points des autres palettes sur la saturation et la luminosité, « Annuler les modifications » pour la palette choisie |
| C5 | Distinguer | Carte « Palettes trop proches » ; zone hachurée sur la teinte ; mots aux bouts des pistes ; ni modale, ni réglage automatique |
| C6 | L'alerte | Le plein dans les deux thèmes, le texte du fond teinté en Light, seuil des couleurs proches de la recette ; le texte Dark 950, presque blanc, n'y entre plus ; compteur de l'onglet ; constat sans ΔEok, Vérification comprise |
| C7 | Roue des teintes | Repliée ; fond de page de l'aperçu ; familles de teinte autour ; arc ambre sur une paire trop proche ; un point se glisse pour régler la teinte ; vision des couleurs à la demande, sans alerte |
| C8 | Réglage global | Marque « par défaut », bouts de piste nommés, point bleu, « Par défaut » actif seulement sur une valeur modifiée, « Tout par défaut » en tête, résumé sans chiffre, aucun encart |
| C9 | Configuration | Nom « Configuration » ; bouton nommé dans les trois plugins ; onglets Palettes et Général ; une phrase sous les onglets |
| C10 | Libellés et listes | « Par défaut » et « Tout par défaut » remplacent « Rétablir » et « Tout rétablir » sur les réglettes et les cartes ; les listes prennent la police de l'interface, un chevron gris et 24 px parmi les boutons |

## 12. Défauts relevés dans le plugin actuel

**Le bilan à 480 px.** À 480 px de large, le lien de chaque ligne du bilan de Vérification sort de la
fenêtre : « Vérifier » s'affiche coupé (« Vérifi »). La grille
`.bilan-des-palettes` ne déclare aucune colonne. Sa colonne implicite prend la
largeur minimale de son plus large enfant, le nuancier : sept cartes de 60 px
et six écarts de 8 px, 468 px, prévus pour les 469 px d'une fenêtre de 500. À
480 px, le conteneur n'offre que 449 px. `grid-template-columns: minmax(0, 1fr)`
ramène les lignes à 449 px ; la maquette l'applique dans l'écran H7, mesure
faite. Le nuancier déborde encore de 19 px : ses cartes doivent pouvoir
rétrécir sous 500 px.

**Deux sens de « Rétablir ».** Sous le sélecteur de Création, « Rétablir »
refait ce qu'« Annuler les modifications » vient de défaire : c'est le sens de
Windows, macOS et Google Docs, où « Rétablir » est la commande inverse
d'« Annuler ». Sur les réglettes de Réglage global et de Color shift, et dans
les cartes de la Configuration, le même mot ramène la valeur par défaut. Les
deux sens se côtoient dans l'onglet Création.

| Réglette | Carte | Pour | Contre |
|---|---|---|---|
| **Par défaut** (retenu) | Tout par défaut | Mêmes mots que la marque : le bouton envoie le pouce sur la marque qui porte son nom. Le nom accessible des cartes de la Configuration dit déjà « Rétablir les valeurs par défaut » | Se lit d'abord comme un état ; le survol le précise : « Revenir à la valeur par défaut, 0 » |
| Réinitialiser | Tout réinitialiser | Le terme courant d'une remise à zéro | Treize lettres : la piste perd une vingtaine de pixels à 480 px |
| ↺ (icône) | Tout par défaut | Le plus compact ; la convention de Figma | Une icône seule se devine, et l'interface vise un designer débutant |
| Rétablir | Tout rétablir | Aucun changement ici ; « Rétablir » de la barre deviendrait « Refaire » | Contredit la convention des systèmes |

Les textes touchés sont dans `i18n/fr.ts` et `i18n/en.ts` : `retablir` et
`retablirLa` de Réglage global, `retablir` et `toutRetablir` de Color shift,
`retablir` des cartes de la Configuration. Celui de la barre ne change pas.

**Les listes déroulantes.** Le socle donne la police de l'interface aux
boutons et aux champs (`button, input { font: inherit; }`), pas aux listes. Un
`select` garde la police du système, 13,3 px au lieu de 11 px, et sa flèche
native : « Teinte Tailwind » de Color shift dépasse ses voisins. La
proposition ajoute `select` à cette règle, remplace la flèche native par un
chevron gris, et donne 24 px (`--hauteur-secondaire`) à une liste posée parmi
des boutons. La langue, champ de formulaire, garde les 32 px des autres
champs.

## 13. Limites

- Les écrans sont des états figés de la galerie, modifiés à la main : la
  maquette ne prouve ni le comportement au clavier ni les états de transition.
- Dans la maquette, seule la teinte de la paire montrée recalcule ses couleurs
  ; les autres réglettes bougent sans repeindre.
- Les zones trop proches sont calculées l'autre palette immobile. Si les deux
  bougent, la zone de la première se recalcule au relâcher de la seconde.
- Les seuils des constats d'information sont des valeurs d'essai.
- La simulation des visions des couleurs suppose une dichromatie complète.
