# Recette v10 d'UCM Palettes

Les retours du mainteneur sur les onglets Création, Vérification
et Harmonisation. Chaque point donne la demande, ce que le code fait
aujourd'hui, ce que le dossier propose et la décision attendue. Les
maquettes sont dans [Maquettes/MAQUETTE-RECETTE-V10.html](./Maquettes/MAQUETTE-RECETTE-V10.html),
les mesures dans [MESURES-PAIRES.json](./MESURES-PAIRES.json).

## R1. Le nom des palettes se décale entre Création et Vérification

**Demande.** Le nom des cartes du nuancier se décale de quelques pixels quand
le designer passe de Création à Vérification. Le mainteneur demande si les deux
onglets emploient le même composant.

**Constat.** Les cartes sont le même composant :
[`nuancierDesPalettes.ts`](../../../../../packages/plugin-palettes/src/ui/nuancierDesPalettes.ts),
que l'accueil de Création et le bilan de Vérification appellent. Ce qui se
trouve au-dessus des cartes diffère :

| Onglet | Au-dessus du nuancier | Hauteur |
|---|---|---|
| Création | marge de 16 px, bouton « Nouvelle palette », consigne, intertitre « Vos palettes » | suit le contenu |
| Vérification | barre du sélecteur, puis `.bilan-entete` | 47 px posés à la main (`styles.css`, commit 5d7435d) |

Les deux piles tombent au même pixel parce que les 47 px ont été mesurés sur
l'accueil de Création. En galerie, le nuancier commence à 215 px dans les deux
onglets et le nom à 61 px du haut de sa carte. La mesure tient de 300 à 700 px de fenêtre, en français et en anglais, et à
400 px avec Inter, Arial, Segoe UI et Georgia.
Le décalage vu dans Figma n'est donc pas reproduit. Une hypothèse se vérifie
dans Figma : un build désynchronisé. `npm run galerie` ne reconstruit que
`dist/ui.html`, et laisse `dist/code.js` d'un état antérieur. Lancer
`npm run build` avant un essai dans Figma reconstruit les deux fichiers.

**Proposition.** Faire porter la zone au-dessus du nuancier par le composant
partagé : un « accueil du nuancier » à trois rangées (zone de tête, intertitre,
cartes). La hauteur de la zone de tête se déclare une fois. Création y pose son
bouton et sa consigne, Vérification ses onglets ou sa phrase. La constante de
47 px disparaît, et un test d'interface compare la position du premier nom dans
les deux onglets.

**État.** En attente de la décision D1.

**Décision D1.** Valider le composant partagé. Si le décalage reste visible
après `npm run build`, joindre une capture des deux onglets avec la largeur de
la fenêtre.

## R2. L'onglet Harmonisation devient « Comparaison »

**Demande.** Renommer l'onglet en « Comparaison ».

**Constat.** L'onglet contient déjà une carte « Comparaison » (« Les palettes
cochées, côte à côte »). Le renommage donnerait le même nom à l'onglet et à
l'une de ses cartes.

**Proposition.** Onglet « Comparaison » (anglais « Comparison »). La carte
devient « Côte à côte » (anglais « Side by side »), avec le même sous-titre.
Le compteur, la ligne fixe et les liens « Comparer » de Vérification gardent
leur texte. Les identifiants de code (`ongletHarmonisation`,
`harmonisation.ts`) changent dans un lot à part, ou restent : ils ne se voient
pas.

**État.** Implémenté, recette Figma à faire. Décision : onglet « Comparaison », carte « Aperçu » (anglais « Preview »), identifiants de code inchangés.

**Décision D2.** Valider les deux noms, et dire si le code suit le renommage.

## R3. L'alerte compare les fonds teintés au lieu du texte

**Demande.** Ne plus signaler « textes sur fond teinté trop proches ». Les
palettes doivent se distinguer par leurs fonds (`surface`) et leurs pleins
(`solid`). Une différence de teinte sur un texte se perçoit mal, parce que le
texte est petit.

**Constat.** `MESURES_DE_PROXIMITE`
([`alertes.ts`](../../../../../packages/couleur/src/alertes.ts)) compare trois
couleurs en Vivid : `solid/default` en Light et en Dark, `surface/foreground`
en Light. Une paire est trop proche quand la plus petite distance OKLab passe
sous `seuils.palettesProches`, 0,05 par défaut. Le texte porte la plupart des
alertes : 12 des 13 paires Tailwind et les 8 paires de la galerie.

**Mesure.** [`Mesures/mesurer-paires.ts`](./Mesures/mesurer-paires.ts) compare
quatre jeux de couleurs sur les 17 familles Tailwind 3.4 (couleurs 500) et sur
les 20 palettes de la galerie, avec les réglages par défaut.

| Couleurs comparées | Seuil des fonds | Paires Tailwind (136) | Paires galerie (120) |
|---|---|---|---|
| Aujourd'hui : pleins Light et Dark, texte Light | sans objet | 13 | 8 |
| Pleins Light et Dark | sans objet | 9 | 4 |
| Pleins, plus fonds Light et Dark | 0,05 | 57 | 55 |
| Pleins, plus fonds Light et Dark | 0,010 | 10 | 6 |
| Pleins, plus fonds Light et Dark | 0,012 | 10 | 8 |
| Pleins, plus fonds Light et Dark | 0,015 | 11 | 11 |
| Pleins, plus fonds Light et Dark | 0,020 | 17 | 17 |

Les fonds pâles portent peu de chroma : au seuil des pleins, toutes les
familles voisines se confondent. Les fonds de red et de rose Tailwind sont à
0,006 en Light. Les fonds demandent donc leur propre seuil.

**Proposition.**

- Comparer `solid/default` en Light et en Dark au seuil `palettesProches`
  (0,05), et `surface/default` en Light et en Dark à un seuil propre aux
  fonds. Le mainteneur a retenu 20 % du seuil, soit 0,010. À 24 % (0,012), sa
  recette signalait Terracota et Poppy, dont les fonds Light (#F6E6E6 et
  #FCE2E1) sont à 0,0120 ; à 0,010, elle ne signale plus que Sun et Orange, par
  leurs pleins Light (0,037).
- Le rôle de proximité `texte` devient `fond`. Le constat dit « fonds teintés
  trop proches en Light » ou « boutons pleins trop proches en Dark ».
- Les zones hachurées, la roue, le bilan de Vérification et le compteur de
  l'onglet lisent `pairesTropProches` et `zonesTropProches` : ils suivent sans
  autre changement.

**État.** Implémenté, recette Figma à faire. Décision : pleins et fonds teintés, fonds à 20 % du seuil `palettesProches` (0,010 par défaut), sans champ de recette.

**Décision D3.** a) Valider les quatre couleurs comparées. b) Choisir le seuil
des fonds dans la maquette. c) Dire si ce seuil se règle dans la recette, comme
`palettesProches`. Ce réglage ajoute un champ `seuils.fondsProches`, donc un
format de recette et sa conversion. Sinon le seuil reste une constante du
moteur.

## R4. Un message qui paraît déplace la page

**Demande.** L'interface bouge quand le designer règle une valeur et qu'un
message paraît. Le mainteneur demande une maquette.

**Constat.** Trois éléments changent de hauteur au-dessus des réglettes, ou
dans leur carte, quand une paire se sépare ou se forme :

1. les constats sous la carte Comparaison paraissent, disparaissent ou changent
   de longueur (le constat ambre fait trois lignes à 400 px, la ligne verte une) ;
2. la rangée de la paire quitte la liste « Palettes trop proches » ;
3. « Annuler les modifications » paraît en tête des Réglages au premier
   changement et pousse les trois réglettes.

La règle [UI-20], appliquée en H7, fige la hauteur des cartes pendant un
glisser seulement : tout saute au relâcher, ou dès la saisie d'une valeur dans
un champ. Dans la maquette, au relâcher, la carte Réglages remonte de 31 px et
la réglette de teinte de 3 px. Chromium compense une partie de l'écart par
l'ancrage du défilement.

**Proposition (maquette, section 1).**

1. Un message change de ton à sa place. Le constat ambre devient la ligne verte
   « Indigo et Azur se distinguent maintenant. ». La rangée de la paire reste
   dans la liste avec une coche jusqu'à ce que le designer quitte l'onglet.
2. Une zone de messages ne rétrécit pas pendant la visite. La zone des constats
   et la liste des paires gardent leur plus grande hauteur depuis l'arrivée
   dans l'onglet. Elles se recalent quand le designer change d'onglet ou de
   palettes cochées.
3. « Annuler les modifications » reste affiché, inactif tant que la palette n'a
   pas changé, comme « Par défaut » sur chaque réglette.

Une zone peut encore grandir quand une nouvelle paire se forme. Ce cas reste
visible : il signale une information nouvelle.

**État.** Implémenté, recette Figma à faire.

**Décision D4.** Valider les trois règles, et dire si elles valent aussi pour
la carte Réglages de Création, où « Annuler les modifications » paraît de la
même façon.

## R5. Les zones hachurées ne paraissent qu'au relâcher

**Demande.** Pendant le glisser d'une réglette, les zones hachurées doivent
paraître quand le curseur entre dans une zone trop proche.

**Constat.** Deux règles du code se combinent :

- `zonesTropProches`
  ([`harmonisation.ts`](../../../../../packages/couleur/src/harmonisation.ts))
  rend une liste vide si la paire est séparée à la position actuelle ;
- la carte Réglages
  ([`carteReglages.ts`](../../../../../packages/plugin-palettes/src/ui/harmonisation/carteReglages.ts))
  garde pendant un glisser la course et les zones calculées à son départ.

Un glisser qui part d'une position séparée garde donc une liste vide jusqu'au
relâcher. La roue suit la même règle pour sa zone en tirets.

**Proposition.** `zonesTropProches` calcule les zones d'une paire quelle que
soit la position de départ. Les zones du départ restent justes pendant le
glisser, parce que les autres palettes ne bougent pas. La réglette montre donc
les zones avant que le curseur y entre. Le calcul coûte un balayage de la
course par palette cochée au lieu d'aucun : `positionsDeLaPaire` refait
aujourd'hui `balayerLaCourse` pour chaque paire, un balayage par palette suffit.

**État.** Implémenté, recette Figma à faire.

**Décision D5.** Valider l'affichage des zones dès l'arrivée sur une palette,
même quand aucune paire n'est trop proche.

## R6. La roue des teintes est trop petite

**Demande.** La roue est juste dans son principe, mais trop petite : les
teintes se distinguent mal et les noms se chevauchent. Le mainteneur demande
une maquette.

**Constat.** La roue est un SVG de taille fixe, 420 × 256 px
([`roueDesTeintes.ts`](../../../../../packages/plugin-palettes/src/roueDesTeintes.ts)),
avec un cercle de 140 px tracé d'un trait gris et des noms à 9,5 px. À 400 px
de fenêtre, la carte est plus étroite que le dessin. Le SVG déborde à droite et
la page défile de côté : la capture pleine page de la galerie mesure 437 px de
large. Les huit noms de familles (rose, rouge, orange…) se posent dans la même
couronne que les noms des palettes.

**Proposition (maquette, section 2).**

1. Le dessin prend la largeur de la carte et la suit quand la fenêtre change.
   À 400 px, le cercle passe de 140 à 196 px.
2. Le cercle devient un anneau de 16 px peint à la teinte de chaque degré
   (OKLCH, clarté 0,78, chroma 0,12). Les noms de familles disparaissent.
3. Les noms des palettes passent à 11 px et se rangent en deux colonnes alignées
   sur les bords, 13 px au moins entre deux noms, chacun relié à son point.
4. L'arc ambre d'une paire passe à l'extérieur de l'anneau. La course et la
   zone hachurée de la palette à régler passent à l'intérieur.

**État.** Implémenté, recette Figma à faire. Décision : les noms de familles disparaissent de la roue.

**Décision D6.** Valider la roue. Dire si les noms de familles doivent rester,
par exemple en infobulle sur l'anneau.

## Lots, une fois les décisions prises

| Lot | Contenu | Dépend de |
|---|---|---|
| L1 | Accueil du nuancier partagé, suppression des 47 px, test de position | D1 |
| L2 | Renommage de l'onglet et de la carte, textes fr et en, galerie, spécification | D2 |
| L3 | Moteur : couleurs comparées, rôle `fond`, seuil des fonds, zones calculées quel que soit le départ, un balayage par palette | D3, D5 |
| L4 | Messages à hauteur tenue, « Annuler les modifications » toujours affiché | D4 |
| L5 | Roue à la largeur de la carte, anneau, noms en colonnes | D6 |
| L6 | Spécification ([UI-20], [UI-40] à [UI-43], [VER-22] dans `RECHERCHE-PLUGIN-PALETTES.md`), AGENTS.md, galerie, `npm test`, typecheck, build | L1 à L5 |

L2, L4 et L6 touchent `fr.ts`, `en.ts`, `ongletCreation.ts` et
`RECHERCHE-PLUGIN-PALETTES.md`. Avant de les lancer, vérifier qu'aucune autre
session n'y a de modification non commitée.
