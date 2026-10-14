# Qualité des palettes en interface : dossier

**Statut : recherche faite, maquettes à valider.** La
[solution proposée](./SOLUTION-RAMPES.md) reprend le sujet après les notes à
l'aveugle et un relevé de neuf systèmes ; elle remplace les recommandations
Q1, Q2, Q5 et Q6 ci-dessous, ajoute Q9, et ce dossier garde les mesures et les pistes. Les causes sont mesurées sur
la recette du mainteneur et sur un balayage de 72 teintes. Trois maquettes
montrent les solutions sur des composants ; le jugement visuel revient au
mainteneur. Dix décisions sont listées en section 6, dix autres dans le dossier dédié au sujet 3. La règle de chroma est rouverte par le dossier [Robustesse des rampes](./ROBUSTESSE-DES-RAMPES.md).

| Maquette | Sujet |
|---|---|
| [Qualité en interface](./Maquettes/MAQUETTE-QUALITE-EN-INTERFACE.html) | La règle de chroma : banc de composants, graphique par cran, notation à l'aveugle |
| [Rôles et crans](./Maquettes/MAQUETTE-ROLES-ET-CRANS.html) | Le fond teinté sur la page et sur la carte, la couleur, la forme et le nom du focus |
| [Comparer et harmoniser](./Maquettes/MAQUETTE-COMPARER.html) | Valeurs par défaut dans Création, Configuration, onglet Harmonisation, sur les écrans réels du plugin ; détails dans le [dossier dédié](./DOSSIER-COMPARER.md) |

La [préparation](./PREPARATION-CLAUDE-OPUS.md) et le
[relevé d'Untitled UI](./ANALYSE-UNTITLED-UI.md) ont servi de point de départ.
Leurs faits sur le code sont exacts ; ce dossier les chiffre et tranche entre
leurs hypothèses.

## 1. Les retours du mainteneur et ce que la mesure en dit

| Retour | Mesure | Section |
|---|---|---|
| Texte 700 de Soft fade sur une alerte | La chroma des textes Soft vaut 0,3 à 0,55 fois celle de Tailwind au même cran, aux valeurs par défaut. | 3.3 |
| Vivid trop saturé et criard | Vivid suit Tailwind, sauf les crans clairs des verts (deux fois plus de chroma) et les crans clairs foncés par le Color shift de luminosité du mainteneur. | 3.3 |
| `surface/default` trop foncé, le 50 préféré | Le cran 100 vaut 1,16:1 sur la carte blanche ; le 50 vaut 1,075:1 sur la carte mais 1,005:1 sur la page. | 4.1 |
| En Dark, un badge sur une carte ne se voit pas | `surface/default` vaut 1,004:1 sur la carte, médiane du balayage : toutes les palettes, pas seulement le neutre. | 4.1 |
| Focus trop foncé | En Light, un cran plus clair que 600 manque 3:1 sur 422 à 576 des 576 rampes Light du balayage. La couleur reste ; la forme change l'impression. | 4.4 |
| Focus introuvable en reliant un bouton `solid` | Le rangement suit la règle « couleur juste derrière le texte », que l'anneau ne porte pas. | 4.4 |
| Des crans « identiques » ne le sont pas | Hors références, l'écart de clarté vient des réglages propres (0,016 à 0,047) ; la chroma s'écarte de ×2,6 à ×4,3 dans la recette, et de ×3,4 à ×4,2 aux réglages communs. | 5.1 |

## 2. Sources et méthode

- **Recette** : [recette-mainteneur.json](./Mesures/references/recette-mainteneur.json),
  copie de l'export `palettes-et-reglages-poppy-reparee.json`, format 10, six
  palettes colorées et Titanium. Les supports viennent de Titanium : page au
  cran 50 (`#F6F7F8`, `#111213`), carte blanche en Light et au cran 100 en Dark
  (`#1A1C1F`), comme dans les [tokens réels](../../Archi%20Tokens%20Multi-marques/Elevation%20et%20surfaces/tokens-source.json).
- **Témoins** : [Tailwind 3.4.17](./Mesures/references/tailwind-3.4.17.json),
  dont les rampes sont celles d'Untitled UI, et
  [Radix Colors 3.0.0](./Mesures/references/radix-colors-3.0.0.json).
  Les composants de six systèmes sont relevés dans
  [RELEVE-STATUTS-ET-FOCUS.md](./Collecte/RELEVE-STATUTS-ET-FOCUS.md).
- **Banc** : [prototype.ts](./Mesures/prototype.ts) refait la chaîne de
  `rampesDe` (courbe, pivot, Color shift, décalage, fonds du thème Dark,
  ancrage) avec une règle de chroma interchangeable. Avec la part constante, il
  rend les mêmes octets que le moteur.
- **Garanties** : les sept garanties du kit, la page et la carte comme fonds
  de page, seuils 4,5:1 et 3:1. Le balayage prend 72 teintes, deux clartés de
  référence (0,62 et 0,75) et les quatre combinaisons du texte des boutons :
  50 688 couples par configuration.

## 3. Sujet 1 : la qualité des palettes en interface

### 3.1 Ce que le moteur fait

`cranVise` fabrique chaque cran à `C = part × plafond(L, H)`, une part
constante du plafond sRGB par profil : Soft 0,45, Vivid 0,95. Le plafond
n'a pas la même forme selon la teinte. Le vert, le cyan et le jaune
atteignent leur chroma maximale près du blanc ; le bleu et le violet près du
noir.

### 3.2 Ce que font Tailwind et Radix

[calibrer-enveloppe.ts](./Mesures/calibrer-enveloppe.ts) relit chaque cran des
dix-sept rampes colorées de Tailwind et de douze rampes de Radix.

| Système | Part du plafond relevée | Exceptions |
|---|---|---|
| Tailwind 3.4.17 | 0,92 en moyenne ; 0,90 à 1,00 sur presque tout le cercle | Crans 50 à 300 de lime, green, emerald, teal : 0,59 à 0,81. Crans 700 à 950 de blue et indigo : 0,46 à 0,76 |
| Radix, clair | Textes (pas 11) : 0,83 à 1,00, violet 0,55 | Fonds (pas 2 à 5) : chroma presque constante, 0,02 vers L = 0,96, quelle que soit la teinte, sauf l'ambre |
| Radix, sombre | Textes : 0,64 à 1,00 | Fonds (pas 3 à 5) : 0,41 à 1,00 selon la teinte |

La courbe de clarté médiane de Tailwind vaut celle d'UCM à 0,015 près de 50
à 700 ; elle est plus claire de 0,03 et 0,06 aux crans 800 et 900. Les deux systèmes donnent aux textes 85 à 100 % du plafond. Ils
retiennent la chroma là où le gamut s'ouvre : les clairs des verts, les foncés
des bleus.

### 3.3 Les trois causes du rendu

Mesures de [generer-donnees.ts](./Mesures/generer-donnees.ts), dans
[MESURES-VARIANTES.json](./Mesures/MESURES-VARIANTES.json).

**Soft manque de chroma dans ses textes.** Aux valeurs par défaut, le cran 700
en Light :

| Palette | UCM Soft | Tailwind, teinte voisine | Rapport |
|---|---|---|---|
| Poppy | `#904D4C`, C 0,090 | `red-700` `#B91C1C`, C 0,190 | ×0,47 |
| Orange | `#765E45`, C 0,049 | `amber-700` `#B45309`, C 0,146 | ×0,34 |
| Grass | `#496E4C`, C 0,068 | `green-700` `#15803D`, C 0,137 | ×0,50 |
| Sky | `#476781`, C 0,056 | `sky-700` `#0369A1`, C 0,119 | ×0,47 |

**Vivid sature les clairs des verts.** Grass Vivid 100 et 200 valent
`#C6FFD5` et `#7FFFA8`, C 0,081 et 0,166 ; `green-100` et `green-200`
valent C 0,043 et 0,081. Aux valeurs par défaut, les crans 50 et 100 de Poppy,
Orange et Sky Vivid restent à 0,01 de chroma de Tailwind. Dans la recette du
mainteneur, un Color shift de luminosité de −0,015 à −0,02 au bout clair de
Vivid fonce le cran 50 de Poppy, Orange et Sky. Orange Vivid 50 vaut ainsi
`#FFEECC`, L 0,95 et C 0,048, contre `amber-50` à L 0,99 et C 0,021.

**Les réglages propres compensent palette par palette.** Les parts Soft de
la recette valent 1,00 (Poppy), 0,92 (Orange), 0,65 (Sky) et 0,45 (Grass).
Aux valeurs par défaut, la chroma des quatre utilitaires s'écarte de ×3,4 à
×4,2 à un même cran. Une part commune ne la rapproche pas, parce que le
plafond change avec la teinte.

Deux faits relèvent de la couleur choisie. Le plein Orange 700 est brun
(`#885714` en Soft) : sa dérive de teinte libre vaut −1° au bout sombre, quand
le préréglage Tailwind de l'ambre en donne −37°. L'alerte jugée par le
mainteneur employait le fond 50 et le texte 700 ; la table du thème vise 100
et 800.

### 3.4 Trois règles candidates

| Règle | Formule | Réglages proposés |
|---|---|---|
| Deux zones | Une part pour les fonds, une pour les accents, raccordées entre L 0,86 et 0,70 en Light, entre 0,33 et 0,45 en Dark | Soft 0,45 · 0,85 ; Vivid 0,75 · 0,95 |
| Enveloppe | `C = min(part × plafond(L, H), p₀ × min(a × (1 − L), b × L))` : la part donne la chroma, une borne qui ne dépend que de la clarté la plafonne | Parts communes p₀ : Soft 0,85, Vivid 0,95 ; Soft a 0,6, b 0,38 ; Vivid et intensité unique a 1,1, b 0,48 |
| Relevé Tailwind | La part de chaque cran suit celle de Tailwind à cette clarté et cette teinte, interpolée sur le cercle comme `deriveTailwind` | Soft : fonds 0,5, accents 0,9 ; Vivid : 1 et 1 |

Les trois règles gardent la courbe de clarté, les teintes, le Color shift et
l'ancrage exact de la référence.

### 3.5 Résultats

Sur les quatre utilitaires, en Light. Rapport de chroma : la plus forte sur la
plus faible à un même cran, fonds 50 à 300 et textes 700 à 950. Les vues Dark
donnent les mêmes ordres de grandeur.

| Règle | Rapport de chroma, Soft · Vivid | Distance à Tailwind, Soft · Vivid | Échecs de garantie |
|---|---|---|---|
| Actuel, recette du mainteneur | ×3,9 · ×2,9 | 0,029 · 0,017 | 0 |
| Actuel, valeurs par défaut | ×4,2 · ×3,4 | 0,060 · 0,016 | 0 |
| Deux zones | ×4,2 · ×3,4 | 0,026 · 0,016 | 0 |
| Enveloppe | ×1,7 · ×2,2 | 0,025 · 0,012 | 0 |
| Relevé Tailwind | ×3,1 · ×2,5 | 0,027 · 0,013 | 0 |

La distance à Tailwind est l'écart moyen de chroma en Light avec la rampe de
Tailwind la plus proche en teinte. Le texte 700 de Grass Soft passe de C 0,068
à 0,129 avec l'enveloppe ; son fond 100 passe de 0,044 à 0,026.

Sur le balayage, l'enveloppe ajoute 20 échecs aux 144 du moteur actuel avec la
table actuelle : G7, le focus 600 contre le fond 100, sur cinq références
vert-jaune, entre 2,98:1 et 3,00:1. Les 144 échecs communs sont G1 en Dark
inversé : le texte blanc sur le plein 700, où une référence de clarté 0,62 est ancrée et garde ses octets, de 3,40:1 à 4,21:1. Ils existent déjà, et l'architecture les
prévoit.

[mesurer-repasse.ts](./Mesures/mesurer-repasse.ts) ajoute trois contrôles :

- **Palettes ternes.** Le moteur garde sa logique des parts : une référence
  terne garde une part basse. Titanium, Terracota et Deep, à une intensité,
  gardent leur chroma au cran 100 et au cran 700. Une première formule, qui
  multipliait la borne par la part, retirait 27 % de chroma au 700 de Deep ;
  la formule du tableau 3.4 la plafonne sans la réduire.
- **Hors échantillon.** Calibrée sur neuf rampes de Tailwind et jugée sur les
  huit autres, l'enveloppe fait jeu égal avec la part constante : écart moyen
  de chroma 0,008 contre 0,009. Tailwind suit presque une part constante.
  L'enveloppe apporte l'accord entre teintes, pas une copie de Tailwind.
- **La teinte d'Orange.** Le plein 700 d'Orange Soft est brun parce que sa
  dérive de teinte vaut −1° au bout sombre. Avec le préréglage Tailwind de sa
  teinte (+10° au bout clair, −27,5° au bout sombre), il passe de `#85581F`
  (teinte 69°, C 0,093) à `#91501F` (54°, C 0,107) ; `amber-700` vaut 49° et
  C 0,146. Ce réglage de la palette est déjà possible dans le plugin.

### 3.6 Les notes à l'aveugle du mainteneur

Trois combinaisons notées, toutes sur carte : le mainteneur précise que ces
composants se posent toujours sur une carte, et ne note pas la page. Dark
Vivid ressemble à Dark Soft, avec les mêmes remarques ; il n'est pas noté.
Notes de 1 à 5 : fond discret, texte coloré, lisibilité, séparation du
support, statuts distincts, cohérence du groupe.

| Règle | Light Soft | Light Vivid | Dark Soft |
|---|---|---|---|
| Actuel, réglé à la main | 4 · 5 · 5 · 5 · 5 · 5 | 2 · 4 · 5 · 5 · 5 · 4 | 2 · 3 · 5 · 2 · 5 · 1 |
| Actuel, valeurs par défaut | non noté | 3 · 5 · 5 · 5 · 5 · 4 | 2 · 1 · 4 · 1 · 5 · 5 |
| Enveloppe | 4 · 4 · 5 · 5 · 5 · 5 | 3 · 5 · 5 · 5 · 5 · 4 | 2 · 2 · 5 · 1 · 5 · 5 |
| Deux zones | 4 · 1 · 5 · 5 · 5 · 2 | 4 · 2 · 5 · 5 · 5 · 4 | 2 · 2 · 5 · 1 · 5 · 1 |
| Relevé Tailwind | 4 · 1 · 5 · 5 · 5 · 2 | 4 · 5 · 5 · 5 · 5 · 3 | 2 · 3 · 5 · 1 · 5 · 2 |

Mesures des textes 800 et des fonds 100 de Soft en Light, sur les quatre
utilitaires :

| Règle | Chroma des textes | Chroma des fonds |
|---|---|---|
| Actuel, réglé à la main | 0,058 à 0,175 | 0,017 à 0,044 |
| Actuel, valeurs par défaut | 0,042 à 0,076 | 0,011 à 0,044 |
| Enveloppe | 0,079 à 0,136 | 0,022 à 0,026 |
| Deux zones | 0,079 à 0,144 | 0,011 à 0,044 |
| Relevé Tailwind | 0,074 à 0,133 | 0,013 à 0,034 |

1. **L'enveloppe ne descend jamais sous 4 en cohérence** et la tient à 5 en
   Light Soft et en Dark Soft. Aucune autre règle notée sur les trois
   combinaisons ne fait de même.
2. **« Actuel, réglé à la main » gagne en Light Soft et perd en Dark** : ses
   parts propres (Soft 0,92 pour Orange, 1,00 pour Poppy, 0,65 pour Sky)
   colorent les textes Light, mais rompent la cohérence en Dark (1).
3. **Enveloppe et Deux zones ont les mêmes textes** en Light Soft, à la chroma
   près, et reçoivent 4 et 1. Leurs pleins 700 diffèrent de 0,010 de chroma au
   plus ; leurs fonds 100 diffèrent nettement, uniformes avec l'enveloppe,
   inégaux avec Deux zones. Les notes de texte et de cohérence suivent les
   fonds.
4. **En Light Vivid, l'enveloppe rend les valeurs par défaut actuelles**, sauf
   sur les crans clairs des verts : Grass 100 et 200 passent de C 0,081 et
   0,166 à 0,052 et 0,099. Les notes restent identiques.
5. **En Dark, la séparation du support vaut 1 ou 2 pour toutes les règles** :
   la cause est commune, et la section 4.1 la mesure.

Le texte coloré reste faible en Dark Soft avec l'enveloppe (2). La borne
`a = 0,6` de Soft limite la chroma des textes clairs. La
[solution](./SOLUTION-RAMPES.md) (S1) la porte à 1,1 en Dark : la chroma des
textes 900 de Soft monte jusqu'à 0,141. Ce réglage est mesuré, pas encore noté
à l'aveugle ; en Light, la borne ne change pas, et les notes ci-dessus valent.

### 3.7 Recommandation

La [solution proposée](./SOLUTION-RAMPES.md) (S1) précise cette
recommandation : l'enveloppe prend des bornes par thème, parce qu'en Dark les
crans clairs sont des textes. Le reste de cette section vaut toujours.

Adopter l'enveloppe. Elle rapproche le plus les quatre utilitaires, place Vivid
aussi près de Tailwind que le relevé et ne demande aucune table de données.
Elle donne un sens à chaque profil : Soft a des fonds calmes, proches de Radix,
et des textes colorés ; Vivid suit Tailwind.

Les valeurs de la section 3.4, avec la borne Dark de S1, deviennent les
valeurs par défaut de la recette, rangées dans la Configuration. Dans Création, chaque réglette de la
carte « Réglage global » marque sa valeur par défaut, et le bouton « Par défaut »
y ramène (section 5, décision C10). Les teintes et le Color shift de teinte n'ont pas d'autre valeur
par défaut que zéro : ce sont des choix de couleur.

Une recette existante doit rendre les mêmes couleurs après la mise à jour. La
règle se range donc dans la recette, et une recette au format 10 se lit avec la
part constante. Dans la Configuration, sa carte des intensités se marque
alors comme modifiée ; son bouton « Par défaut » la fait passer à l'enveloppe,
quand le designer le décide, et l'Aperçu de Création montre le résultat. Ce changement porte sur les rampes primitives : il sert les deux
périmètres, agnostique et UCM complet.

## 4. Sujet 2 : les crans des rôles

### 4.1 Le fond teinté et son support

Les composants teintés se posent toujours sur une carte, précise le
mainteneur. Le fond teinté se juge donc contre la carte.

En Light, la page et la carte diffèrent de 1,07:1 ; en Dark, de 1,10:1. Un fond
opaque ne garde donc pas le même écart avec les deux supports. Médianes du
balayage, contraste du fond au repos contre son support :

| Fond | Light, page | Light, carte | Dark, page | Dark, carte |
|---|---|---|---|---|
| Opaque 100, la table actuelle | 1,08 | 1,16 | 1,09 | 1,00 |
| Opaque 50 en Light | 1,005 | 1,07 | | |
| Opaque 200 en Dark | | | 1,26 | 1,15 |
| Translucide | 1,07 | 1,07 | 1,09 | 1,11 |

Le cran 50 que le mainteneur préfère disparaît sur la page. Le cran 100 Dark
disparaît sur la carte, pour toutes les palettes : le
[dossier d'élévation](../../Archi%20Tokens%20Multi-marques/Elevation%20et%20surfaces/README.md)
ne l'avait mesuré que sur le neutre.

La cause est structurelle. En Dark, la page est le cran 50 du neutre
(`#111213`) et la carte son cran 100 (`#1A1C1F`). Toutes les rampes partagent
la clarté de chaque cran : un fond teinté 100 a la clarté de la carte, et
seule sa chroma l'en distingue, réduite à 30 % par l'intensité des fonds du
thème Dark. Contraste mesuré contre la carte : 1,00 à 1,02 pour les cinq
règles. En Light, la carte est blanche, hors de toute rampe, et le fond 100
s'en détache (1,11 à 1,17).

La carte elle-même se distingue mal de la page en Dark : 1,10:1, ΔEok 0,044.
Le mainteneur le note 1 ou 2 pour toutes les règles. Mesures sur l'enveloppe
Soft, carte au neutre 100, 200 ou au-delà :

| Carte Dark | Carte contre page | Fond 200 contre carte | Fond 300 contre carte |
|---|---|---|---|
| Neutre 100, `#1A1C1F` (actuelle) | 1,10 | 1,13 à 1,16 | 1,34 à 1,43 |
| `#212225` | 1,18 | 1,05 à 1,08 | 1,25 à 1,33 |
| Neutre 200, `#25282E` | 1,25 | 1,00 à 1,03 | 1,19 à 1,27 |

Le fond teinté doit se tenir un cran au-dessus de la carte qui le porte.

### 4.2 Trois pistes

**Opaque, crans déplacés.** Surfaces 50/100/200 en Light, 200/300/400 en Dark.
La piste Dark ajoute 552 échecs G3 et 182 G7 : le texte doit passer à 950 et le
focus à 800, comme le proposait le dossier d'élévation. Le fond 50 reste
invisible sur la page.

**Opaque avec contour.** Le badge d'Untitled UI pose un contour 200 autour du
fond 50, Tremor un anneau à 20 ou 30 %. Le contour dessine la forme sur tout
support ; il ajoute une variable et un trait à chaque composant teinté.

**Translucide.** Le fond est la couleur d'alpha minimal qui redonne exactement
le cran sur le support le plus éloigné du texte : la carte blanche en Light, la
page en Dark. C'est la méthode des échelles alpha de Radix ; Primer et Tremor
posent aussi des fonds translucides en Dark. Posé sur l'autre support, le fond
garde son écart. Les alphas valent 0,04 à 0,11 en Light (cran 50), 0,06 à 0,11
en Dark (cran 100). Le texte de surface tient 4,5:1 sur les trois états et les
deux supports dans tout le balayage, et au moins 7,0:1 au repos dans la
recette. Calculé contre la page grise en Light, l'alpha monte jusqu'à 0,89 :
le support de calcul compte.

[mesurer-surfaces.ts](./Mesures/mesurer-surfaces.ts) et
[verifier-garanties.ts](./Mesures/verifier-garanties.ts) donnent les mesures.
Avec l'enveloppe, la piste translucide laisse 144 échecs G7 en Dark inversé :
le focus 700 contre le fond posé sur la carte. Le focus Dark 800
(section 4.4) les retire tous. Il reste 16 échecs G7 en Light, de même
nature que ceux de la section 3.5.

**Le texte à 700.** Avec les fonds Light 50, 100 et 200, un texte constant au
cran 700 tient 4,5:1 au repos et au survol, mais échoue sur l'appui (200) posé
sur la page pour 464 des 576 rampes Light normales du balayage. Le texte reste donc à 800 ;
l'enveloppe double sa chroma (Grass Soft 800 : C 0,058 à 0,109). Un composant
sans appui, comme une alerte ou un badge, pourrait employer 700 ; il faudrait
une variable de plus.

**Le plein à 600.** Untitled UI pose ses boutons au cran 600. Dans UCM, le
texte blanc y manque 4,5:1 sur 528 des 1 728 couples Light du balayage : le
plein reste à 700.

### 4.3 Recommandation pour les fonds

Le modèle des niveaux de la [solution proposée](./SOLUTION-RAMPES.md) (S2,
S3) répond à cette section : fonds 50, 100 et 200 en Light ; 200, 300 et 400 en
Dark, sur la carte au neutre 100 ; texte Dark 900 ou 950 ; page Dark abaissée.
Les options mesurées avant lui (carte Dark au neutre 200, texte 800, fonds
translucides) y sont chiffrées, avec leurs échecs en plus du modèle.

La piste translucide servait un fond posé tantôt sur la page, tantôt sur la
carte. Les composants teintés se posent toujours sur une carte : un fond
opaque, choisi contre la carte, suffit.

### 4.4 Le focus

**Couleur.** En Light, 600 est le cran le plus clair qui tient 3:1 contre la
page : 500 échoue sur 422 à 576 des 576 rampes Light du balayage. En Dark, le
focus garde aussi le cran d'aujourd'hui (600 en sens normal, 700 en sens
inversé) : jugé contre la page et la carte (décision G7), c'est le plus discret
qui tient 3:1 ([mesurer-anneau.ts](./Mesures/mesurer-anneau.ts)). Le cran 800
ne servait qu'à un focus collé au fond teinté. Le halo pâle collé est pourtant répandu (Bootstrap, Flowbite,
shadcn/ui, Ant Design, le kit Figma d'Untitled UI) ; aucun n'atteint 3:1
contre la page ([robustesse](./ROBUSTESSE-DES-RAMPES.md), section 6).

Le bleu du Simple Design System de Figma, `#006AFF`, n'est pas plus clair que
le 600 d'UCM : L 0,571 contre 0,584 à 0,594 pour les palettes colorées du
mainteneur. Il paraît clair parce qu'il est très saturé (C 0,236, deux fois le 600 de
Sky, le bleu du mainteneur : 0,120 à 0,124) et séparé du bouton par 2 px de
fond. Sept des
dix systèmes relevés donnent d'ailleurs à tous les focus une seule couleur,
un bleu franc le plus souvent ([relevé](./Collecte/RELEVE-STATUTS-ET-FOCUS.md)).
UCM le permet sans toucher au moteur : les composants visent alors le `ring`
d'une seule palette, celle de la marque. Le halo d'Untitled UI,
`#F4EBFF` sur 4 px, vaut 1,16:1 sur blanc : il manque le critère 1.4.11.

**Forme.** Un trait de 2 px collé à un plein 700 se lit comme une bordure
épaisse. L'anneau décalé (2 px de support, puis 2 px de trait) est la forme de
Simple Design System de Figma, de Radix, de Spectrum et d'Untitled UI React. La forme « halo et trait »
remplit l'écart du cran 100 : elle donne l'aspect du kit d'Untitled UI, et son
trait extérieur tient 3:1. La forme se règle dans les composants.

**Nom et place.** Le contrat nomme ce rôle `ring` (`SUPPORT_DES_VARIABLES`).
Trois rangements :

| Rangement | Variables par palette | Effet |
|---|---|---|
| `page/focus`, aujourd'hui | 13 | Le focus d'un bouton plein se cherche dans `page`. |
| `solid/ring`, `surface/ring`, `page/ring` | 15 | Chaque dossier relie seul son composant ; les trois alias visent le même cran. |
| `ring` à la racine de la palette | 13 | Un seul nom, en tête de la palette, hors des dossiers. |

Recommandé : `ring` à la racine de la palette. Les trois `ring` d'un
rangement par dossier vaudraient le même cran ; la variable unique, à côté des
trois dossiers, se trouve en ouvrant la palette, sans redondance
([robustesse](./ROBUSTESSE-DES-RAMPES.md), section 7). Le renommage migre les
liaisons Figma et les références des contrats, comme le passage de `text` à
`foreground`.

### 4.5 Le texte courant des alertes

Primer et Atlassian écrivent le corps de l'alerte en texte neutre, le titre et
l'icône en couleur ; Radix colore tout. La maquette de qualité bascule entre
les deux. Ce choix relève des composants : la palette ne change pas.

## 5. Sujet 3 : comparer, harmoniser, différencier

Le [dossier dédié](./DOSSIER-COMPARER.md) repense le sujet à partir de toutes
les recherches d'interface antérieures et des retours du mainteneur. Ses
conclusions :

- Création reste consacrée à une seule palette. Chaque réglette de Réglage
  global et de Color shift marque sa valeur par défaut et nomme ses deux bouts.
- Les réglages communs deviennent la Configuration, en deux onglets : Palettes,
  pour les valeurs par défaut des palettes, et Général, pour la langue.
- Un onglet Harmonisation, entre Vérification et Gestion, liste toutes les
  palettes, compare 2 à 4 palettes cochées et règle chacune avec les réglettes
  de Création. Une zone hachurée montre, sur la teinte, les valeurs trop
  proches d'une autre palette.
- Aucun groupe n'est rangé, et aucun bouton ne règle à la place du designer.

Les mesures de la première version restent valables : hors ◆, la différence
de clarté passe de 0,016–0,047 à 0,002–0,003 quand les palettes reviennent à
leurs valeurs par défaut, sans garantie perdue.

## 6. Décisions

| # | Décision | Recommandation |
|---|---|---|
| Q1 | La règle de chroma | L'enveloppe par thème (S1), retenue au banc visuel pour sa cohérence, élargie autour du jaune (+100 % en Soft, +50 % en Vivid), fonds Dark de Vivid bornés à 0,30 ([robustesse](./ROBUSTESSE-DES-RAMPES.md), section 10) |
| Q2 | Le sens de Soft et Vivid | Soft : fonds calmes, textes colorés (0,85 ; a 0,6 en Light, 1,1 en Dark) ; Vivid : Tailwind (0,95, a 1,1) |
| Q3 | Les valeurs par défaut | Celles de Q2, dans la Configuration ; chaque réglette de Création les marque, « Par défaut » y ramène ; une recette au format 10 garde la part constante, et « Par défaut » sur sa carte des intensités la fait passer à l'enveloppe |
| Q4 | Le texte courant des alertes | Choix de composant, hors Palettes |
| Q5 | Le fond teinté et les niveaux | Le modèle des niveaux ([solution](./SOLUTION-RAMPES.md), S2 et S3), au cran retenu par le banc visuel : fonds 100, 200, 300 en Light ; 300, 400, 500 en Dark, texte et contour 950 ; page Dark au cran 50 abaissé à L 0,145, fond de page `#0A0A0A` par défaut |
| Q6 | La couleur du focus | Inchangée : 600 en sens normal, 700 en sens inversé, dans les deux thèmes ; le cran le plus discret qui tient 3:1 contre la page et la carte. Un focus unique, à la façon de Figma, reste un choix des composants. Décidé : G7 juge le focus contre la page et la carte, comme le W3C, et non contre le fond teinté |
| Q7 | La forme du focus | À choisir : anneau décalé partout, ou halo sur les champs (un rôle validé sans contraste, le curseur portant le focus) et anneau sur les boutons. Le halo pâle sur les boutons sort du principe du plugin : son rôle s'afficherait « AA ✗ ». Les variantes à liseré ont été écartées au banc ([robustesse](./ROBUSTESSE-DES-RAMPES.md), section 10) |
| Q8 | Le nom et la place du focus | `ring` à la racine de la palette |
| Q9 | Les composants à surface | Les rôles actuels suffisent ; un badge bordé discrètement prend `page/divider` ([solution](./SOLUTION-RAMPES.md), S5) |
| Q10 | La dérive de teinte | Le préréglage Tailwind lit la dérive aux deux bouts des rampes voisines, choisies à la clarté de la référence ([robustesse](./ROBUSTESSE-DES-RAMPES.md), section 4) |
| C1 à C10 | Comparer, harmoniser, différencier | Voir le [dossier dédié](./DOSSIER-COMPARER.md#11-décisions) |

## 7. Ce que chaque décision touche

| Décision | Fichiers et migrations |
|---|---|
| Q1 à Q3 | `packages/couleur/src/rampe.ts` (`cranVise`), `palette.ts`, `recette.ts` (format 11, règle et bornes par profil), `limites.ts`, `garantie.ts` ; interface de la Configuration ; tests de propriétés et de lecture du format 10 |
| Q5 | La table par thème et ses lecteurs dans le kit, le moteur, Palettes et l'explorateur ; la courbe Dark et le fond de page par défaut ; Aperçu de Création ; architecture de référence et vue illustrée (liste complète dans la [solution](./SOLUTION-RAMPES.md), section 4) |
| Q6, Q8 | `TABLE_DES_DOSSIERS`, `VARIABLES_DE_PALETTE`, `SUPPORT_DES_VARIABLES`, G7 ; liaisons Figma du fichier du mainteneur ; Playground et consommateurs qui lisent `page/focus` |
| C1 à C10 | Voir la section 10 du [dossier dédié](./DOSSIER-COMPARER.md) |

Le plan d'implémentation se rédige après les décisions, par lots, dans ce
dossier.

## 8. Limites

- Le jugement visuel porte sur trois combinaisons, toutes sur carte, avec une
  borne unique (section 3.6). Un contraste conforme ne vaut pas validation.
- Les seuils de distance par rôle sont des valeurs d'essai.
- Une seule recette réelle. Les palettes à une intensité et les palettes figées
  ne sont comparées que par leur rampe unique.
- Les témoins sont en sRGB. Tailwind 4 définit ses rampes en OKLCH, en partie
  hors sRGB ; ses valeurs sRGB voisines de la version 3 n'ont pas été relevées
  une à une.
- La rotation de teinte du calcul passe par le réglage de teinte de la carte,
  borné à ±30°, et déplace la référence. Un designer qui garde sa référence
  exacte n'a pas ce geste.
- La séparation de la carte Dark n'est pas tranchée : elle relève de
  l'élévation du thème (section 4.3).

## 9. Reproduire

Depuis la racine de Toolkit :

```sh
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/calibrer-enveloppe.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/generer-donnees.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/verifier-garanties.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/mesurer-surfaces.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/mesurer-teintes.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/generer-ensembles.ts"
node "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/extraire-galerie.mjs"
```

`generer-donnees.ts` et `generer-ensembles.ts` récrivent les données des
maquettes. `extraire-galerie.mjs` fige les écrans sombres de la galerie, après
`npm run galerie --workspace ucm-palettes-plugin`. `capturer.mjs` photographie
une maquette avec Playwright.
