# UCM Palettes : étude du Color shift

## 1. En-tête

**Objet.** La carte « Hue shift » (« Dérive de teinte » en français) devient
« Color shift ». Elle règle la teinte, la saturation et la luminosité aux deux
bouts de la rampe, sans toucher la couleur de référence, et ses réglettes
s'arrêtent avant de faire manquer une garantie de contraste. La carte
« Teinte, saturation, luminosité » devient « Réglage global » : l'une déplace
toute la rampe, l'autre écarte les bouts autour de la référence. Les
avertissements tiennent sur une ligne fixe, pour qu'aucun ne déplace un
curseur pendant un geste.

**Lecteur.** Le mainteneur, designer et seul testeur, qui a validé les
décisions de la [section 10](#10-décisions) ; puis l'agent qui écrira le code
selon le [plan d'implémentation](./PLAN-IMPLEMENTATION.md). La
[section 8](#8-plan-daction) découpe le seul Color shift ; le plan
d'implémentation l'ordonne avec l'architecture des tokens et fait foi sur
l'ordre.

**Statut.** Ce document ne décide rien. La
[spécification](../RECHERCHE-PLUGIN-PALETTES.md) reste l'autorité sur le
comportement du plugin, en particulier sa [section 6.4](../RECHERCHE-PLUGIN-PALETTES.md#64-la-teinte-dun-cran)
et sa [section 12](../RECHERCHE-PLUGIN-PALETTES.md#12-léditeur-de-dérive). Les
décisions validées la modifient d'abord, au lot 0.

**Les fichiers.**

| Fichier | Rôle |
|---|---|
| [MAQUETTE-COLOR-SHIFT.html](./MAQUETTE-COLOR-SHIFT.html) | La maquette interactive, à ouvrir d'un double clic : six références, une ou deux intensités, deux mises en page des avertissements, thèmes de Figma, six essais, mesure du déplacement d'un curseur pendant un geste |
| [modele-color-shift.mjs](./modele-color-shift.mjs) | Le modèle candidat, sans DOM : rampe décalée, promesses, limite dynamique |
| [mesurer-color-shift.mjs](./mesurer-color-shift.mjs) | La mesure des limites sur six références, et un témoin qui compare le modèle à `verifierPromesses` |
| [generer-maquette-color-shift.mjs](./generer-maquette-color-shift.mjs) | Le générateur de la maquette, qui embarque le moteur du dépôt |

La maquette et la mesure calculent avec le même module. Pour les régénérer,
depuis la racine du dépôt :

```sh
node --import tsx "docs/notes/Recherches/Plugin Palettes/Color shift/mesurer-color-shift.mjs"
node --import tsx "docs/notes/Recherches/Plugin Palettes/Color shift/generer-maquette-color-shift.mjs"
```

## 2. La demande

1. Renommer « Hue shift » en « Color shift ».
2. Décaler la teinte, la saturation et la luminosité aux deux bouts, pour
   ajuster une palette avec plus de précision.
3. Garder la couleur de référence intacte.
4. Borner chaque réglage par une limite dynamique, pour qu'aucun geste de la
   carte ne fasse manquer une garantie de contraste.
5. Choisir d'un geste la grandeur réglée.
6. Distinguer la carte « Teinte, saturation, luminosité », globale, de la carte
   Color shift, qui règle le début et la fin de la palette.
7. Empêcher qu'un avertissement apparu au-dessus d'un curseur décale la mise
   en page pendant un geste : chaque avertissement tient sur une ligne, et son
   détail s'ouvre au clic.

## 3. L'existant

| | Teinte, saturation, luminosité | Hue shift |
|---|---|---|
| Ce qui bouge | Toute la rampe d'un profil, du même écart | La teinte des nuances, en proportion de leur distance à la référence |
| Grandeurs | Teinte ±30°, saturation 0 à 100 %, luminosité −0,05 à +0,02 | Teinte seule, ±90° à chaque bout |
| Référence | Un réglage du profil porteur la déplace, avec un avertissement | Fixe : `teinteA` rend sa teinte à sa clarté |
| Limite | Bornes fixes | Bornes fixes |
| Code | `ui/reglagesDeLaPalette.ts`, `reglerTeinte`, `reglerSaturation`, `reglerClarte` | `ui/derive/`, `reglerBout`, `teinteA` |

Les deux cartes sont repliables, l'une sous l'autre, avec des titres de même
forme. Le pied de la première dit « La dérive de teinte s'applique ensuite. »,
seul indice de leur ordre.

La dérive n'est lue que par le moteur de rampe (`rampe.ts`, `palette.ts`), la
recette (`recette.ts`), l'édition (`edition.ts`) et l'éditeur. La planche, le
rapport, les promesses et les alertes lisent les rampes : ils suivent sans
changement de code.

## 4. Le modèle proposé

### 4.1 Le poids d'une nuance

Chaque nuance a un poids par rapport au pivot de son profil : 0 à la clarté du
pivot, 1 au bout, linéaire entre les deux. C'est l'interpolation que `teinteA`
emploie déjà pour la teinte, bouts sans segment compris. Une nuance plus
claire que le pivot prend le décalage du bout clair, une nuance plus sombre
celui du bout sombre.

### 4.2 Trois grandeurs

| Grandeur | Réglage au bout | Effet sur une nuance de poids `w` | Bornes fixes |
|---|---|---|---|
| Teinte | Degrés signés | Teinte du pivot + `t × w`, comme aujourd'hui | ±90° |
| Saturation | Fraction signée de la part du profil | Part × (1 + `s × w`), bornée à [0, 1] | ±100 % |
| Luminosité | Décalage de clarté OKLCH | Clarté de la courbe + décalage global + `c × w` | ±0,15 |

La saturation est relative : −100 % rend le bout gris, et un profil de part
nulle le reste quel que soit le réglage. Synchronisés, Soft et Vivid prennent
le même pourcentage, et Soft reste sous Vivid.

La luminosité réglée au bout incline la courbe autour du pivot, là où le
réglage global la translate. La transformation est affine de chaque côté du
pivot : elle garde l'ordre des nuances tant que le bout ne dépasse pas le
pivot, et la limite de la [section 5](#5-les-limites-dynamiques) l'arrête
avant.

### 4.3 La référence reste fixe

Le poids vaut 0 à la clarté du pivot : aucun décalage ne s'y applique. Le cran
porteur garde de plus les octets exacts de la référence, par l'ancrage de
`rampesDe`. Le Color shift ne change donc ni la référence, ni la nuance qui
porte le ◆, ni le pivot de l'autre profil.

### 4.4 Les deux thèmes

Le poids se lit sur la clarté que la courbe vise, comme la teinte et le
facteur des fonds du thème Dark. « Nuances claires » désigne donc les nuances
claires des deux thèmes : 50 à 400 en Light, 600 à 950 en Dark. Éclaircir le
bout clair éclaircit aussi le texte du thème Dark. La maquette montre les deux
thèmes par la bascule de l'aperçu, et les limites jugent les deux.

### 4.5 La recette

La dérive rangée garde `clair`, `sombre` et `origine` pour la teinte, et gagne
deux objets facultatifs. Un objet absent vaut zéro.

```json
"derive": {
  "lien": true,
  "soft":  { "clair": -7.5, "sombre": 5.1, "origine": "tailwind", "saturation": { "clair": -0.4, "sombre": 0 }, "clarte": { "clair": 0, "sombre": 0.02 } },
  "vivid": { "clair": -7.5, "sombre": 5.1, "origine": "tailwind", "saturation": { "clair": -0.4, "sombre": 0 }, "clarte": { "clair": 0, "sombre": 0.02 } }
}
```

Ces objets entrent dans le format 7 que le [plan d'intégration de
l'architecture](../../Archi%20Tokens%20Multi-marques/PLAN-INTEGRATION-ARCHITECTURE.md#r2-le-format-de-la-recette)
ouvre déjà, sans conversion : une recette de format 6 est refusée. La
saturation se range au centième, la luminosité au millième. Le refus `derive-lien` compare aussi les deux nouveaux objets.
`origine` reste la mesure de la teinte seule : les préréglages « Tailwind » et
« Constante » ne règlent que la teinte.

## 5. Les limites dynamiques

### 5.1 La règle

Une valeur est permise quand chaque promesse tenue au début du geste reste
tenue, dans chaque mode et chaque intensité, et quand deux nuances voisines
gardent 0,01 de clarté d'écart. La limite est l'intervalle autour de la valeur
courante où cette règle tient. Chaque borne porte sa cause : la première
promesse qui manquerait au-delà, avec son contraste et son seuil, ou l'ordre
des nuances.

Une promesse déjà manquée au début du geste ne bloque pas la réglette. Le
designer peut la réparer par le Color shift, et une promesse réparée entre
dans la règle au geste suivant.

La limite est calculée sur l'état du début du geste. Pendant un glisser, elle
reste figée comme l'échelle du graphe ; elle se recalcule au relâchement. Une
limite se croise avec les autres : une luminosité posée en butée resserre la
teinte et la saturation du même bout.

### 5.2 Ce que la mesure a trouvé

Recette par défaut, deux intensités synchronisées, teinte Tailwind, saturation
et luminosité à zéro. Les cellules donnent la plage permise de la luminosité ;
la teinte et la saturation sont libres sur toute leur plage pour les six
références.

| Référence | Nuances claires | Nuances sombres | Première promesse touchée |
|---|---|---|---|
| Bleu `#1E6FD9` | −0,050 à +0,040 | −0,150 à +0,055 | `text 700 / surface 100` Soft Light ; `border-control 600 / surface 100` Vivid Dark |
| Vert `#16A34A` | −0,015 à +0,040 | −0,150 à +0,045 | `border-control 600 / surface-card 50` Vivid Light ; `text 700 / surface 100` Vivid Dark |
| Rouge `#DC2626` | −0,060 à +0,040 | −0,150 à +0,055 | `text 700 / surface 100` Soft Light, puis Vivid Dark |
| Jaune `#EAB308` | −0,055 à +0,045 | −0,150 à +0,060 | `text 700 / surface 100` Soft Light |
| Sauge `#A0B599` | −0,045 à +0,040 | −0,150 à +0,055 | `text 700 / surface 100` Vivid Light |
| Gris `#6B7280` | −0,045 à +0,040 | −0,150 à +0,055 | `text 700 / surface 100` Vivid Light ; `border-control 600 / surface 100` Soft Dark |

L'éclaircissement du bout clair s'arrête sur l'ordre des nuances : le 50, à
0,975, atteint le blanc. Les autres bornes tiennent à une promesse.

Limites croisées : une fois la luminosité du bout sombre posée à sa borne
haute, la teinte de Bleu ne descend plus sous 0°, celle de Jaune ne monte plus
au-dessus de −7°, celle de Sauge au-dessus de +8°, et la saturation de Rouge
et de Sauge se bloque dans un sens.

Une limite, deux bornes d'une grandeur à un bout, se calcule en 28 ms en
moyenne dans Node, par balayage au pas de la grandeur. La maquette recalcule
la grandeur de l'onglet ouvert au relâchement.

### 5.3 Ce que les limites ne couvrent pas

Les curseurs du Color shift s'arrêtent avant de casser une garantie. Les
autres réglages n'ont pas cette protection aujourd'hui : les curseurs du réglage global,
les courbes et les fonds des Réglages communs, les seuils, un changement de
référence, un import. L'un d'eux peut faire manquer une garantie alors que le
Color shift était dans sa plage sûre. L'essai 4 de la maquette le montre :
nuances sombres en butée, puis luminosité globale à −0,03, et deux garanties
du thème Dark manquent.

Le plugin ne ramène jamais une valeur rangée dans sa limite sans le geste du
designer : les couleurs changeraient sans qu'il le voie. La garantie manquée
s'affiche, comme aujourd'hui. La décision Q6 étend les limites aux curseurs
du réglage global ; les autres réglages restent sans limite.

## 6. L'interface du Color shift

### 6.1 Deux cartes distinctes

- Un titre de section « Ajuster la palette » précède les deux cartes, avec une
  phrase : le réglage global déplace toute la rampe, le Color shift écarte
  ensuite les nuances claires et sombres de la référence.
- La première carte s'appelle « Réglage global », sous-titrée « Teinte,
  saturation et luminosité de toute la rampe ». Son glyphe montre une rampe
  translatée.
- La seconde s'appelle « Color shift » dans les deux langues, sous-titrée
  « Nuances claires et sombres, autour de la référence ◆ ». Son glyphe montre
  deux bouts qui pivotent autour d'un losange.
- Le pied de la première devient « Le Color shift s'applique ensuite, autour
  de la référence. »
- Le résumé replié du Color shift donne chaque grandeur réglée, bout clair
  puis bout sombre, et la synchronisation.

### 6.2 Onglets et graphe

Trois onglets, Teinte, Saturation et Luminosité, portent chacun les deux
valeurs de leur grandeur et une pastille quand elle s'écarte de son point de
départ. L'onglet choisi règle le graphe actuel : l'ordonnée prend l'unité de
la grandeur, et chaque poignée glisse sur un rail dont la partie interdite est
hachurée. Sous le graphe, la rampe sans Color shift et la rampe avec, dans le
thème de l'aperçu. Deux réglettes peintes, une par bout, suivent le graphe.

L'éditeur actuel garde son graphe, son clavier et sa pile d'annulation. Un
seul graphe se calcule à la fois.

### 6.3 La réglette et la butée

- La piste est peinte par le moteur : la couleur que le bout prendrait pour
  chaque valeur.
- Au-delà de la limite, la piste est hachurée et le pouce s'arrête sur la
  borne.
- Sous les réglettes, une ligne fixe dit la plage sûre des deux bouts :
  « Plage sûre · nuances claires −0,050 à +0,040 · nuances sombres −0,150 à
  +0,055 ». Un glisser ou une saisie au-delà d'une borne pose la borne, et la
  même ligne nomme la cause : « Luminosité, nuances claires : limite atteinte
  à −0,050. Au-delà, text 700 / surface 100 (Soft, Light) tomberait à 4,44:1,
  sous 4,5:1. » Le texte trop long s'ouvre au clic, selon la
  [section 7](#7-des-avertissements-qui-ne-déplacent-rien).
- Le repère Tailwind reste sur la réglette de teinte, et son bouton ramène la
  valeur Tailwind. Les réglettes de saturation et de luminosité ont
  « Rétablir », qui ramène zéro.
- Au clavier, les flèches avancent d'un pas, Maj d'un grand pas, Origine et
  Fin vont aux bornes permises. `aria-valuemin` et `aria-valuemax` portent les
  bornes permises, et `aria-valuetext` la valeur et la plage sûre.

### 6.4 Cas limites

| Cas | Comportement proposé |
|---|---|
| Palette grise | Teinte et saturation se désactivent ; la luminosité reste réglable. La carte n'est plus désactivée en entier |
| Une intensité | Un seul profil ; ni synchronisation ni choix du profil |
| Profils déliés | Le profil réglé se choisit ; le graphe trace l'autre en tireté ; la limite ne juge que le profil réglé. Resynchroniser copie les trois grandeurs de Vivid |
| Référence hors de la rampe | Le bout sans segment masque sa poignée et ses réglettes, pour les trois grandeurs, comme aujourd'hui pour la teinte |
| Palette libre | Aucune promesse : la limite ne tient que l'ordre des nuances |
| Préréglage | « Tailwind » et « Constante » règlent la teinte seule ; « Tout rétablir » remet la teinte Tailwind, la saturation et la luminosité à zéro |

## 7. Des avertissements qui ne déplacent rien

### 7.1 Le mécanisme du clignotement

Pendant un glisser, `previsualiser` appelle `modifier`, qui relance `rendre`
(`ui/ongletPalettes.ts`) : seul le sélecteur de couleur réduit ce rendu à
l'aperçu. Chaque image repose donc les messages et leurs zones. Au-dessus des
curseurs de la carte globale et de l'éditeur de dérive, plusieurs éléments
changent de hauteur :

| Élément | Où | Ce qui change |
|---|---|---|
| `manqueDeLaReference`, `lienDAjustement`, `traceDeLAjustement` | Carte de la référence | Paraissent dès qu'une garantie manque, ou qu'un réglage du porteur pose une originale |
| `choixAutomatique` | Carte de la référence | Passe au texte plus long de `porteurFige` au premier réglage |
| Zones `messagesDeBase` et `messagesDApercu` | Sous la carte de la référence et sous l'aperçu | Une liste de constats, un paragraphe par message, qui s'allonge ou disparaît |
| `repereDeReference` | Aperçu | Une ligne qui peut passer sur deux |
| `.avertissement-des-reglages` | Carte globale, au-dessus des curseurs | Paraît ou disparaît selon le profil réglé |
| `.carte-resume` | En-tête de chaque carte repliable | `flex-wrap` fait passer le résumé sous le titre quand il s'allonge |

Près d'un seuil, un pixel de plus fait paraître un message, qui pousse la
carte vers le bas. Le curseur n'est plus sous le pointeur ; pour le graphe de
la dérive, qui lit l'ordonnée du pointeur dans le SVG, la valeur change avec
le décalage, et le message disparaît. L'interface clignote.

La maquette reproduit le cas sur Vert, qui manque déjà deux garanties sans
réglage : glisser la luminosité globale de 0 à +0,02 fait passer la liste de
deux à quatre messages. Le curseur saisi descend de 112 px pendant le geste.
Avec les règles ci-dessous, le même geste le laisse à 0 px.

### 7.2 Les règles

1. Chaque avertissement tient sur une ligne de 24 px, coupée par une ellipse.
   Cette ligne est présente même sans avertissement : elle dit alors l'état
   neutre, par exemple la plage sûre, ou « Ce réglage ne touche pas la couleur
   de référence ».
2. Le texte entier s'ouvre au clic du designer, dans une bulle posée
   par-dessus les cartes. L'ouvrir ou la fermer ne déplace aucun élément.
3. Le bilan des garanties et des alertes de la palette quitte le flux et
   passe dans un pied fixe de la fenêtre, d'une ligne : icône, compte, premier
   message. « Détails » ouvre un volet superposé qui liste chaque message avec
   son lien vers le réglage ; Échap le ferme. Le pied reste visible à toute
   position de défilement, pendant le réglage.
4. Les résumés d'en-tête tiennent sur une ligne, coupés par une ellipse, texte
   entier au survol et pour le lecteur d'écran.
5. Pendant un geste, aucun élément de la fenêtre ne change de hauteur. Un
   volet ouvert garde sa taille et fait défiler son contenu.
6. Les messages restent annoncés au lecteur d'écran par une région `polite`
   du pied, une fois à la fin du geste.

La direction globale de l'intégration du marché prévoit déjà ce pied, avec
« 32 garanties · 4 manquées » et « Vérifier » ([DIRECTION-GLOBALE.md](../Int%C3%A9gration%20du%20march%C3%A9/06%20Direction%20globale/DIRECTION-GLOBALE.md#42-longlet-palette)).
Les deux chantiers partagent le composant.

### 7.3 Le test

Un test d'interface Chromium saisit chaque curseur de la carte globale, une
poignée du graphe et une réglette du Color shift, sur une palette placée près
d'un seuil. Il relève `getBoundingClientRect().top` du contrôle au début du
geste et à chaque image, et échoue au premier pixel d'écart. La galerie ajoute
un état « avertissement long » à la taille minimale, 500 × 520.

## 8. Plan d'action

Chaque lot se termine par `npm test`, `npm run typecheck` et `npm run build`
verts. Un invariant nouveau entre dans AGENTS.md avec le test qui le tient,
dans le même commit.

| Lot | Contenu | Fichiers | Tests | Taille |
|---|---|---|---|---|
| 0 | Spécification : sections 6.4, 7, 12 et 13 selon les décisions de la section 10 | `RECHERCHE-PLUGIN-PALETTES.md` | Liens de la documentation | S |
| 1 | Stabilité de la mise en page, sur les cartes actuelles : lignes fixes, pied, volet, bulle, résumés sur une ligne. Ce lot corrige le clignotement d'aujourd'hui et ne dépend pas du Color shift | `ui/ongletPalettes.ts`, `ui/reglagesDeLaPalette.ts`, `ui/carte.ts`, `ui/constats.ts`, nouveaux `ui/ligneFixe.ts` et `ui/piedDeLaPalette.ts`, `ui/styles.css`, `i18n/en.ts`, `i18n/fr.ts`, `galerie/etats.cjs` | Test de déplacement de la section 7.3 ; loi des textes ; galerie à la taille minimale | M |
| 2 | Moteur : `Derive` porte teinte, saturation et luminosité ; `poidsA` extrait de `teinteA` ; `fabriquerRampe` applique les trois | `couleur/src/rampe.ts`, `palette.ts` | Propriétés : décalage nul au pivot, octets de la référence sous vingt mille tirages de décalages, ordre gardé sous la limite ; `teinteA` inchangé | M |
| 3 | Recette de format 7 : deux objets facultatifs, bornes, `derive-lien` étendu, migration de 6 à 7 sans changement d'octet | `couleur/src/recette.ts` | Validation, migration, classement « future » par un lecteur de format 6 | S |
| 4 | Limites : `limiteDuColorShift`, pure, avec sa cause ; script de mesure du temps, comme `mesurer-temps.mjs` | `couleur/src/limites.ts`, `couleur/scripts/mesurer-limites.mjs` | Propriété : toute valeur dans la limite garde les promesses tenues au départ ; une valeur juste au-delà en fait manquer une | M |
| 5 | Édition : `reglerDecalage(grandeur, bout)`, préréglage limité à la teinte, lien étendu, « Rétablir », libellés de l'écart d'un import | `plugin-palettes/src/edition.ts`, `importation.ts`, `presentation.ts` | `edition`, `rangement`, `importation` | S |
| 6 | Interface du Color shift : deux cartes distinctes, onglets de grandeur, graphe à trois unités, rails, réglette peinte à zones interdites, ligne de la plage sûre, textes anglais et français | `ui/derive/editeur.ts`, `graphe.ts`, `geometrie.ts`, nouvelle `ui/derive/reglette.ts`, `ui/ongletPalettes.ts`, `ui/reglagesDeLaPalette.ts`, `i18n/en.ts`, `i18n/fr.ts`, `ui/styles.css`, `galerie/etats.cjs` | Tests d'interface Chromium : onglets, glisser borné, clavier, annulation, butée annoncée, déplacement nul ; loi des textes ; galerie | L |
| 7 | Documentation et relecture : AGENTS.md (carte du code, invariants du moteur de couleur et de la mise en page), textes à valider, essais dans Figma | `AGENTS.md`, `TEXTES-A-VALIDER.md` | `inventaireInvariants`, `styleDocumentaire` | S |

Le lot 1 passe en premier : il corrige un défaut présent dans le plugin, et le
Color shift s'y appuie pour sa ligne de plage sûre. Les lots 2 à 4 ne changent
aucune couleur tant que les nouveaux champs sont absents : la recette par
défaut garde ses octets, et les vecteurs figés du moteur servent de témoin.

## 9. Risques

- **Luminosité et thème Dark.** Le bout clair règle aussi le texte du thème
  Dark. Un designer qui vise le 50 du thème Light peut être surpris ; la
  limite empêche la casse, pas la surprise. La bascule de l'aperçu doit rester
  visible pendant le réglage.
- **Coût des limites.** 28 ms par limite dans Node, sans optimisation.
  L'iframe de Figma peut être plus lente, et deux intensités déliées ou une
  recette à treize nuances allongent le balayage. Le lot 4 mesure ce coût
  dans Chromium, avec pour budget le calcul après le relâchement, sans
  rendu manqué.
- **Limites qui se resserrent seules.** Un réglage global ou une courbe
  commune change la plage sûre sans que le designer touche la carte. La plage
  affichée suit, mais une valeur rangée hors d'elle reste en place : il faut
  la montrer comme telle.
- **Messages moins visibles.** Un message qui tenait dans un paragraphe tient
  dans une ligne coupée. Le pied garde le compte et le premier message en
  vue ; le lot 1 vérifie à la taille minimale que le compte ne se coupe
  jamais.
- **Profils confondus.** Une saturation de −100 % aux deux bouts rapproche
  Soft et Vivid. L'alerte existante le signale ; la limite ne l'empêche pas.

## 10. Décisions

Toutes les questions sont tranchées.

| Question | Décision |
|---|---|
| Q1. Nom | « Color shift » en anglais et en français |
| Q2. Choix de la grandeur | Onglets et graphe |
| Q3. Libellés et lecture des bouts | « Nuances claires » et « Nuances sombres », poids lu sur la clarté |
| Q4. Unité de la saturation | Pourcentage de la saturation du profil, de −100 % à +100 % |
| Q5. Préréglage | Tailwind règle la teinte seule ; aucun préréglage pour la saturation et la luminosité |
| Q7. Palette grise | Luminosité réglable, teinte et saturation désactivées |
| Q8. Nom de la carte globale | « Réglage global », sous-titre « Teinte, saturation et luminosité de toute la rampe » |
| Q6. Limites du réglage global | Ses curseurs prennent la même limite, la même réglette hachurée et la même ligne de plage sûre. Les Réglages communs restent sans limite : ils touchent toutes les palettes à la fois |
| Q9. Mise en page des avertissements | Les règles de la section 7.2 |
| Q10. Glyphes | Les deux glyphes des cartes se gardent, et chaque carte titrée reçoit le sien, dans le même style |
