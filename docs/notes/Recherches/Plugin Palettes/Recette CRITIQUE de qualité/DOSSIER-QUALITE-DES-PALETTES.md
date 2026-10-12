# Qualité des palettes en interface : dossier

**Statut : recherche faite, maquettes à valider.** Les causes sont mesurées sur
la recette du mainteneur et sur un balayage de 72 teintes. Trois maquettes
montrent les solutions sur des composants ; le jugement visuel revient au
mainteneur. Huit décisions sont listées en section 6, huit autres dans le dossier dédié au sujet 3.

| Maquette | Sujet |
|---|---|
| [Qualité en interface](./Maquettes/MAQUETTE-QUALITE-EN-INTERFACE.html) | La règle de chroma : banc de composants, graphique par cran, notation à l'aveugle |
| [Rôles et crans](./Maquettes/MAQUETTE-ROLES-ET-CRANS.html) | Le fond teinté sur la page et sur la carte, la couleur, la forme et le nom du focus |
| [Comparer, harmoniser, différencier](./Maquettes/MAQUETTE-COMPARER.html) | Dix briques et trois parcours, détaillés dans le [dossier dédié](./DOSSIER-COMPARER.md) |

La [préparation](./PREPARATION-CLAUDE-OPUS.md) et le
[relevé d'Untitled UI](./ANALYSE-UNTITLED-UI.md) ont servi de point de départ.
Leurs faits sur le code sont exacts ; ce dossier les chiffre et tranche entre
leurs hypothèses.

## 1. Les retours du mainteneur et ce que la mesure en dit

| Retour | Mesure | Section |
|---|---|---|
| Texte 700 de Soft fade sur une alerte | La chroma des textes Soft vaut 0,3 à 0,55 fois celle de Tailwind au même cran, aux réglages communs. | 3.3 |
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

**Soft manque de chroma dans ses textes.** Aux réglages communs, le cran 700
en Light :

| Palette | UCM Soft | Tailwind, teinte voisine | Rapport |
|---|---|---|---|
| Poppy | `#904D4C`, C 0,090 | `red-700` `#B91C1C`, C 0,190 | ×0,47 |
| Orange | `#765E45`, C 0,049 | `amber-700` `#B45309`, C 0,146 | ×0,34 |
| Grass | `#496E4C`, C 0,068 | `green-700` `#15803D`, C 0,137 | ×0,50 |
| Sky | `#476781`, C 0,056 | `sky-700` `#0369A1`, C 0,119 | ×0,47 |

**Vivid sature les clairs des verts.** Grass Vivid 100 et 200 valent
`#C6FFD5` et `#7FFFA8`, C 0,081 et 0,166 ; `green-100` et `green-200`
valent C 0,043 et 0,081. Aux réglages communs, les crans 50 et 100 de Poppy,
Orange et Sky Vivid restent à 0,01 de chroma de Tailwind. Dans la recette du
mainteneur, un Color shift de luminosité de −0,015 à −0,02 au bout clair de
Vivid fonce le cran 50 de Poppy, Orange et Sky. Orange Vivid 50 vaut ainsi
`#FFEECC`, L 0,95 et C 0,048, contre `amber-50` à L 0,99 et C 0,021.

**Les réglages propres compensent palette par palette.** Les parts Soft de
la recette valent 1,00 (Poppy), 0,92 (Orange), 0,65 (Sky) et 0,45 (Grass).
Aux réglages communs, la chroma des quatre utilitaires s'écarte de ×3,4 à
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
| Actuel, réglages communs | ×4,2 · ×3,4 | 0,060 · 0,016 | 0 |
| Deux zones | ×4,2 · ×3,4 | 0,026 · 0,016 | 0 |
| Enveloppe | ×1,7 · ×2,2 | 0,025 · 0,012 | 0 |
| Relevé Tailwind | ×3,1 · ×2,5 | 0,027 · 0,013 | 0 |

La distance à Tailwind est l'écart moyen de chroma en Light avec la rampe de
Tailwind la plus proche en teinte. Le texte 700 de Grass Soft passe de C 0,068
à 0,129 avec l'enveloppe ; son fond 100 passe de 0,044 à 0,026.

Sur le balayage, l'enveloppe ajoute 20 échecs aux 144 du moteur actuel avec la
table actuelle : G7, le focus 600 contre le fond 100, sur trois références
vert-jaune, entre 2,98:1 et 3,00:1. Les 144 échecs communs sont G1 en Dark
inversé : le texte blanc sur `solid/default` de références roses à 4,09:1. Ils
existent déjà.

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

### 3.6 Recommandation

Adopter l'enveloppe. Elle rapproche le plus les quatre utilitaires, place Vivid
aussi près de Tailwind que le relevé et ne demande aucune table de données.
Elle donne un sens à chaque profil : Soft a des fonds calmes, proches de Radix,
et des textes colorés ; Vivid suit Tailwind.

Les valeurs de la section 3.4 deviennent le préréglage de la recette, rangé
dans les réglages communs. Dans Création, la carte « Réglage global » résume
aujourd'hui « Aucun réglage » ; elle dira « Préréglage » ou « Personnalisé »
quand la saturation ou la luminosité d'un profil s'en écarte, avec un bouton
« Revenir au préréglage ». Le même geste, appliqué à plusieurs palettes, est
« Harmoniser » dans l'onglet Comparer (section 5.2). Les teintes et le Color
shift de teinte restent hors du préréglage : ce sont des choix de couleur.

Une recette existante doit rendre les mêmes couleurs après la mise à jour. La
règle se range donc dans la recette, et une recette au format 10 se lit avec la
part constante. Le designer passe à l'enveloppe par un geste qui montre l'avant
et l'après. Ce changement porte sur les rampes primitives : il sert les deux
périmètres, agnostique et UCM complet.

## 4. Sujet 2 : les crans des rôles

### 4.1 Le fond teinté et son support

En Light, la page et la carte diffèrent de 1,08:1 ; en Dark, de 1,10:1. Un fond
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
Avec l'enveloppe, la piste translucide laisse 150 échecs G7 en Dark inversé :
le focus 700 contre le fond posé sur la carte. Un focus Dark plus clair d'un
cran (section 4.4) les retire tous. Il reste 16 échecs G7 en Light, de même
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

Adopter la piste translucide, sur les crans 50, 100 et 200 en Light et 100, 200
et 300 en Dark. Conséquences :

- Palettes écrit trois couleurs alpha par profil et par thème, dans
  `primitives` à côté des crans. Le périmètre de Palettes reste les primitives.
- La recette porte le fond des cartes en plus de celui de la page. C'est la
  décision P9 encore ouverte de la collection d'usage ; cette piste la tranche
  en faveur d'un réglage.
- La table du kit marque ces trois variables comme translucides, et les
  garanties les jugent composées sur chaque support. `ucm check` compose de
  même avant de mesurer un contraste.
- Le dossier d'élévation proposait une page noire et des surfaces décalées
  d'un cran en Dark. Avec des fonds translucides, la page et la carte gardent
  leurs crans actuels.
- Dans Création, l'Aperçu porte le fond des cartes à côté de celui de la page,
  et dessine les fonds translucides posés sur l'un et l'autre.
- DTCG et les variables Figma portent l'alpha. Deux fonds translucides empilés
  s'additionnent : une alerte dans une alerte devient plus foncée.

### 4.4 Le focus

**Couleur.** En Light, 600 est le cran le plus clair qui tient 3:1 contre la
page : 500 échoue sur 422 à 576 des 576 rampes Light du balayage. En Dark, un
cran plus clair (700 normal, 800 inversé) tient partout et retire les échecs
de la section 4.2. Hors du kit Figma d'Untitled UI, aucun système relevé
n'emploie un pas pâle seul. Le halo d'Untitled UI,
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

Recommandé : `ring` dans chaque dossier, parce que le mainteneur relie un
composant dossier par dossier. Le renommage migre les liaisons Figma et les
références des contrats, comme le passage de `text` à `foreground`.

### 4.5 Le texte courant des alertes

Primer et Atlassian écrivent le corps de l'alerte en texte neutre, le titre et
l'icône en couleur ; Radix colore tout. La maquette de qualité bascule entre
les deux. Ce choix relève des composants : la palette ne change pas.

## 5. Sujet 3 : comparer, harmoniser, différencier

Le [dossier dédié](./DOSSIER-COMPARER.md) repense entièrement le sujet, à
partir de toutes les recherches d'interface antérieures. Ses conclusions :

- Harmoniser revient surtout à retirer ou aligner des réglages propres : un
  préréglage et un état « Personnalisée » empêchent une palette de s'écarter
  sans le dire.
- Différencier revient à tourner une teinte : la plus petite rotation qui
  sépare une paire se calcule et se propose d'un clic. Orange et Poppy se
  séparent avec +9° sur Orange ou −16° sur Poppy.
- Comparer demande une vue nouvelle. Trois parcours la placent : dans
  Création par une sélection multiple (recommandé), dans un onglet dédié, ou
  nulle part, avec une carte « Distinguer » seulement.
- Aucun groupe n'est rangé : une sélection éphémère, comme dans Figma, suffit
  à toutes les tâches.

Les mesures de la section 5 de la première version restent valables : hors
◆, l'écart de clarté passe de 0,016–0,047 à 0,002–0,003 au retour au
préréglage, sans garantie perdue.

## 6. Décisions

| # | Décision | Recommandation |
|---|---|---|
| Q1 | La règle de chroma | L'enveloppe |
| Q2 | Le sens de Soft et Vivid | Soft : fonds calmes, textes colorés (0,85, a 0,6) ; Vivid : Tailwind (0,95, a 1,1) |
| Q3 | Le préréglage et l'état personnalisé | Le préréglage de Q2, « Personnalisé » au-delà, un geste de retour ; les recettes au format 10 gardent la part constante |
| Q4 | Le texte courant des alertes | Choix de composant, hors Palettes |
| Q5 | Le fond teinté | Translucide, calculé contre la carte en Light et la page en Dark |
| Q6 | La couleur du focus | 600 en Light ; un cran plus clair en Dark |
| Q7 | La forme du focus | Anneau décalé de 2 px, ou halo et trait |
| Q8 | Le nom et la place du focus | `ring` dans chaque dossier |
| C1 à C8 | Comparer, harmoniser, différencier | Voir le [dossier dédié](./DOSSIER-COMPARER.md#11-décisions) |

## 7. Ce que chaque décision touche

| Décision | Fichiers et migrations |
|---|---|
| Q1 à Q3 | `packages/couleur/src/rampe.ts` (`cranVise`), `palette.ts`, `recette.ts` (format 11, règle et bornes par profil), `limites.ts`, `garantie.ts` ; interface des réglages communs ; tests de propriétés et de lecture du format 10 |
| Q5 | `packages/kit/src/emplois/dossiers.ts` et `garanties.ts` (fonds composés) ; recette (fond des cartes) ; écriture des primitives alpha dans Palettes ; `diagnostic-contrastes.mjs` de `ucm check` ; architecture de référence et vue illustrée |
| Q6, Q8 | `TABLE_DES_DOSSIERS`, `VARIABLES_DE_PALETTE`, `SUPPORT_DES_VARIABLES`, G7 ; liaisons Figma du fichier du mainteneur ; Playground et consommateurs qui lisent `page/focus` |
| C1 à C8 | Voir la section 10 du [dossier dédié](./DOSSIER-COMPARER.md) |

Le plan d'implémentation se rédige après les décisions, par lots, dans ce
dossier.

## 8. Limites

- Le jugement visuel n'est pas fait. Un contraste conforme ne vaut pas
  validation ; la maquette de qualité recueille les notes à l'aveugle.
- Les seuils de distance par rôle et la séparation visuelle d'un fond translucide sont des
  valeurs d'essai.
- Une seule recette réelle. Les palettes à une intensité et les palettes figées
  ne sont comparées que par leur rampe unique.
- Les témoins sont en sRGB. Tailwind 4 définit ses rampes en OKLCH, en partie
  hors sRGB ; ses valeurs sRGB voisines de la version 3 n'ont pas été relevées
  une à une.
- La rotation de teinte du calcul passe par le réglage de teinte de la carte,
  borné à ±30°, et déplace la référence. Un designer qui garde sa référence
  exacte n'a pas ce geste.
- Le rendu d'un fond translucide dans Figma, sur des calques empilés, reste à
  vérifier dans le fichier.

## 9. Reproduire

Depuis la racine de Toolkit :

```sh
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/calibrer-enveloppe.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/generer-donnees.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/verifier-garanties.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/mesurer-surfaces.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/mesurer-teintes.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/Mesures/generer-comparaison.ts"
```

`generer-donnees.ts` et `generer-comparaison.ts` récrivent les données des
maquettes. `capturer.mjs` photographie une maquette avec Playwright.
