# Qualité des palettes en interface : dossier

**Statut : recherche faite, maquettes à valider.** Les causes sont mesurées sur
la recette du mainteneur et sur un balayage de 72 teintes. Trois maquettes
montrent les solutions sur des composants ; le jugement visuel revient au
mainteneur. Quatorze décisions sont listées en section 6.

| Maquette | Sujet |
|---|---|
| [Qualité en interface](./Maquettes/MAQUETTE-QUALITE-EN-INTERFACE.html) | La règle de chroma : banc de composants, graphique par cran, notation à l'aveugle |
| [Rôles et crans](./Maquettes/MAQUETTE-ROLES-ET-CRANS.html) | Le fond teinté sur la page et sur la carte, la couleur, la forme et le nom du focus |
| [Onglet Comparer](./Maquettes/MAQUETTE-ONGLET-COMPARER.html) | Comparer un groupe, harmoniser la clarté et la couleur, écarter deux teintes |

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
| Enveloppe | `C = part × min(plafond(L, H), a × (1 − L), b × L)` : une borne qui ne dépend que de la clarté | Soft : part 0,85, a 0,6, b 0,38 ; Vivid : part 0,95, a 1,1, b 0,48 |
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

Sur le balayage, l'enveloppe ajoute 8 échecs aux 144 du moteur actuel avec la
table actuelle : G7, le focus 600 contre le fond 100, sur deux références
vertes, à 3,00:1 arrondi, sous le seuil de quelques millièmes. Les 144 échecs communs sont G1 en Dark inversé : le texte blanc sur
`solid/default` de références roses à 4,09:1. Ils existent déjà.

### 3.6 Recommandation

Adopter l'enveloppe. Elle rapproche le plus les quatre utilitaires, place Vivid
aussi près de Tailwind que le relevé et ne demande aucune table de données.
Elle donne un sens à chaque profil : Soft a des fonds calmes, proches de Radix,
et des textes colorés ; Vivid suit Tailwind.

Les valeurs de la section 3.4 deviennent le préréglage de la recette. Une
palette dont la part ou la luminosité s'écarte du préréglage affiche
« Personnalisé », avec un geste « Revenir au préréglage ». Le Color shift reste
disponible ; il cesse d'être le moyen de rattraper une teinte.

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
cran (section 4.3) les retire tous. Il reste les 8 échecs G7 de la section 3.5.

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

## 5. Sujet 3 : l'onglet Comparer

### 5.1 Les écarts mesurés dans la recette

| Grandeur | Avant | Après le geste | Cause |
|---|---|---|---|
| Clarté hors ◆ | 0,016 (Soft) à 0,047 (Dark Vivid) | 0,002 à 0,003, aucun échec | Color shift de luminosité de Vivid, luminosité de Soft sur Poppy |
| Chroma | ×2,6 à ×4,3 | ×1,7 à ×2,2 avec l'enveloppe et les parts communes, aucun échec | Parts propres, forme du plafond |
| Clarté sur ◆ | jusqu'à 0,065 en Dark Vivid | inchangée | Références ancrées à des crans différents |

[mesurer-teintes.ts](./Mesures/mesurer-teintes.ts) cherche les paires proches
sur trois rôles des deux thèmes, avec des seuils d'essai par famille : plein
0,10, texte 0,06, fond teinté 0,025 de distance Oklab.

| Paire | Rôle le plus proche | Distance, écart de teinte | Plus petite rotation |
|---|---|---|---|
| Orange · Poppy | Fond teinté, Dark | 0,019, 16,5° | Orange +9° (plus jaune) ou Poppy −16° (plus rose) |
| Orange · Terracota | Plein, Light | 0,079, 35,5° | Orange +16° |
| Terracota · Poppy | Texte du fond teinté, Dark | 0,047, 10,2° | Aucune avant la borne de ±30° |
| Terracota · Deep | Fond teinté, Light | 0,021, 100,3° | Aucune avant la borne de ±30° |

Terracota et Deep ont des fonds teintés presque gris : la teinte ne les sépare
pas, seule une chroma plus forte des fonds le ferait. Terracota et Poppy
restent deux rouges ; les distinguer revient à un choix de marque.

### 5.2 Réponses aux questions du mainteneur

| Question | Réponse proposée |
|---|---|
| Combien de palettes à la fois | Deux ou plus, sans limite ; le groupe par défaut réunit les palettes à deux intensités. |
| Quelle référence | Les courbes et les parts de la recette ; une palette modèle en second choix. Recopier une palette qui a éclairci son bout sombre coûte des garanties aux autres (dossier d'harmonisation). |
| Selon quelle règle | Retirer les réglages propres plutôt que chercher des valeurs : la recherche ne fait pas mieux sous les garanties. |
| La luminosité seulement | Clarté et couleur, en deux gestes. L'enveloppe rend la couleur alignable par une part commune. La teinte ne s'aligne pas : elle s'écarte. |
| Tons clairs ou foncés séparément | Oui, par « fonds » et « accents ». Le Color shift d'un bout agit sur une clarté : le bout clair porte les fonds en Light et les textes en Dark. L'écran l'affiche avant d'appliquer. |
| Comparer les teintes | Une roue des teintes du groupe et la liste des paires sous les seuils, rôle par rôle. |
| Écarter les teintes | Un bouton par sens, nommé par le secteur visé (« plus jaune », « plus rose ») et chiffré par la plus petite rotation qui atteint les seuils. |
| N crans identiques au minimum | Remplacé par des rôles nommés : un seuil sur des crans peu employés serait tenu alors que deux badges se confondent. |
| Rester dans la comparaison ou passer en Création | Rester pour une rotation simple, avec l'aperçu ; ouvrir Création pour les courbes, le groupe gardé au retour. |

### 5.3 Rapport au dossier d'harmonisation

Le [dossier d'harmonisation](../Harmonisation%20entre%20palettes/DOSSIER-HARMONISATION.md)
reste valable pour la clarté : ses mesures sont reproduites ici. L'onglet
dédié remplace sa décision D1 (comparer dans Vérification). D4 change :
l'enveloppe rend la couleur alignable. D2, D3, D5 à D7 se reportent sur Q10 à
Q14.

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
| Q9 | Où comparer | Un onglet Comparer, après Création |
| Q10 | Combien de palettes | Deux ou plus ; par défaut, les palettes à deux intensités |
| Q11 | Ce qui s'aligne | Clarté et couleur, en deux gestes |
| Q12 | La cible | La recette ; une palette modèle en second |
| Q13 | La zone | Toute la rampe ; fonds ou accents au choix, couplage affiché |
| Q14 | Les seuils | 0,02 de clarté, ×2 de chroma, 0,10 · 0,06 · 0,025 de distance, à fixer sur les maquettes |

## 7. Ce que chaque décision touche

| Décision | Fichiers et migrations |
|---|---|
| Q1 à Q3 | `packages/couleur/src/rampe.ts` (`cranVise`), `palette.ts`, `recette.ts` (format 11, règle et bornes par profil), `limites.ts`, `garantie.ts` ; interface des réglages communs ; tests de propriétés et de lecture du format 10 |
| Q5 | `packages/kit/src/emplois/dossiers.ts` et `garanties.ts` (fonds composés) ; recette (fond des cartes) ; écriture des primitives alpha dans Palettes ; `diagnostic-contrastes.mjs` de `ucm check` ; architecture de référence et vue illustrée |
| Q6, Q8 | `TABLE_DES_DOSSIERS`, `VARIABLES_DE_PALETTE`, `SUPPORT_DES_VARIABLES`, G7 ; liaisons Figma du fichier du mainteneur ; Playground et consommateurs qui lisent `page/focus` |
| Q9 à Q14 | Modèle pur du groupe dans `packages/couleur` (écarts, paires, rotations), gestes dans `edition.ts`, nouvel onglet, textes en deux langues, galerie et tests d'interface |

Le plan d'implémentation se rédige après les décisions, par lots, dans ce
dossier.

## 8. Limites

- Le jugement visuel n'est pas fait. Un contraste conforme ne vaut pas
  validation ; la maquette de qualité recueille les notes à l'aveugle.
- Les seuils de Q14 et la séparation visuelle d'un fond translucide sont des
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
