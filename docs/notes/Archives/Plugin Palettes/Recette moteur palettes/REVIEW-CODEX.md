# Revue des propositions du moteur de Palettes

## Verdicts

| Proposition | Verdict |
|---|---|
| K65 | **À reprendre** : K65 défait l'uniformité des fonds Soft choisie au banc, change des couleurs Vivid et déplace des échecs de contraste entre profils. |
| Alerte | **Sûre sous condition** : conserver le sens distinct du repère ≈, justifier le filtre de chroma et corriger la maquette avant de faire choisir le seuil. |
| Bosse σ 0,10 | **À reprendre** : elle fait perdre G7 à des palettes conformes, avec des réglages autorisés, et crée un creux dans le profil non porteur. |
| Message | **Sûr sous condition** : distinguer un plafond sRGB atteint d'une borne de recette, viser la saturation du porteur et ne pas promettre la disparition du saut. |

Les valeurs restent à choisir par le mainteneur. Cette revue ne modifie ni le
moteur, ni le plugin, ni les documents existants.

## Périmètre et preuves

La commande principale est `npx tsx review-codex.ts`, depuis `Mesures/`.
Les résultats détaillés sont dans
[REVIEW-CODEX-MESURES.json](./Mesures/REVIEW-CODEX-MESURES.json).
Les noms de clés cités ci-dessous désignent des sections de ce fichier.

`A` désigne les profils actuels sans bosse. `K65` remplace les profils communs
par ceux du candidat. `B10` ajoute la bosse aux profils actuels. `K65B10`
combine les deux changements. Le remplacement des profils simule une adoption
des nouveaux défauts ; une recette 11 déjà rangée ne le fait pas spontanément.

Le script compile en mémoire les fonctions du prototype de `mesurer-regles.ts`.
Il coupe le programme avant ses mesures et ses écritures. Les rampes sont
comparées aux hexadécimaux du paquet. Les contrastes et verdicts sont ensuite
comparés individuellement à `verifierPromesses`, dans son ordre. Cette
comparaison distingue une promesse disparue d'une promesse apparue.

Les jeux comprennent les 17 références Tailwind 500, les trois tours de 24
teintes, les cinq références saturées à une et deux intensités, les sept
palettes du mainteneur et les vingt palettes de la galerie. La recette du
mainteneur est lue par `classerRecette` : son format 10 devient 11 ; ses
réglages propres, son fond Dark et ses courbes restent ceux du fichier.

La galerie réelle force la part commune Soft à 0,45
(`packages/plugin-palettes/galerie/etats.cjs:203`). Elle est mesurée séparément
d'une simulation des mêmes palettes avec les défauts 0,85 et 0,95. Assimiler
ces deux jeux changerait les résultats de départ.

## Constats, du plus grave au moins grave

### 1. La bosse fait perdre une garantie tenue à une borne autorisée

**Confirmé. Soft et Vivid, Dark normal.** Le balayage de référence ne suffit
pas à établir que les garanties restent inchangées.

Les deux commandes historiques ont été exécutées :

```powershell
$env:MODE = 'produit'
npx tsx '../Recette CRITIQUE de qualité/Mesures/garanties-regles.ts'
npx tsx '../Recette CRITIQUE de qualité/Mesures/verifier-implementation.ts'
```

Depuis le dossier de cette revue, chacune donne 144 promesses manquées,
toutes G1. Le script ajouté rejoue les 72 teintes aux clartés 0,62 et 0,75,
les quatre couples de texte des boutons et les supports par défaut ou
Titanium. Il distingue aussi le jugement du produit du jugement du banc,
qui ajoute la carte aux garanties mesurées contre la page.

Sur ces références sans réglage, la bosse seule ne change aucun verdict.
Mais `bosseAuxBornesPermises` contient six pertes de G7. Chaque palette avait
zéro promesse manquée avant la bosse. La valeur essayée est une borne calculée
par `limiteDynamique`, avec le contrôle de l'ordre des nuances.

| Référence de départ | Profils | Réglage de luminosité | Profil qui perd G7 | Avant | Avec bosse |
|---|---|---|---|---:|---:|
| Purple `#A855F7` | Actuels | Soft −0,045 | Soft | 3,029966 | 2,995390 |
| Fuchsia `#D946EF` | Actuels | Soft −0,045 | Soft | 3,005836 | 2,951300 |
| Red `#EF4444` | K65 | Soft −0,055 | Soft | 3,008975 | 2,995720 |
| Fuchsia `#D946EF` | K65 | Soft −0,055 | Soft | 3,003657 | 2,970450 |
| Fuchsia `#D946EF` | K65 | Vivid −0,045 | Vivid | 3,049261 | 2,948750 |
| Pink `#EC4899` | K65 | Vivid −0,045 | Vivid | 3,038931 | 2,989561 |

Le seuil est 3:1 contre la carte. La clarté OKLab visée ne change pas, mais
la luminance WCAG change avec la chroma. Les arrondis à huit bits comptent
aussi près du seuil.

Un autre exemple, `#A855F7` avec Vivid −0,05, passe de 3,020704 à 2,943821.
Sa recette est valide, mais cette valeur dépasse la borne actuelle −0,02
et manque déjà deux autres promesses. Il ne faut donc pas le présenter
comme le réglage accessible qui prouve la régression ; le tableau ci-dessus
donne les cas accessibles.

Décisions concernées : G7 de `DECISIONS.md`, section 4, et la conservation des
promesses tenues pendant un geste, `limites.ts:94`. **Correction possible :**
borner la bosse par les contrastes qu'elle dégrade, ou soumettre son application
aux recettes existantes à une vérification explicite. Faire appeler la même
fabrication par les limites protège les gestes futurs, mais ne répare pas une
recette déjà rangée dont les couleurs changent à l'ouverture.

### 2. K65 change Vivid et déplace les échecs derrière un total identique

**Confirmé. Les deux profils, les deux thèmes.** Le paramétrage de Vivid reste
identique, mais ses parts effectives et son ancrage changent.

Sur Tailwind 500, `red`, `indigo`, `fuchsia`, `pink` et `rose` passent de Soft à
Vivid. **50 des 187 couleurs Vivid Light et 35 des 187 couleurs Vivid Dark
changent d'octets.** Sur le tour de `#C59735`, sept références changent de
porteur ; 190 couleurs Vivid Light et 181 Vivid Dark changent sur 264.

Pour `#EF4444`, la part de référence vaut 0,836 :

| Mesure | Actuel | K65 |
|---|---|---|
| Porteur | Soft | Vivid |
| Parts effectives Soft / Vivid | 0,836 / 0,934 | 0,6175 / 0,836 |
| Cran de référence Light / Dark | 500 / 700 | 500 / 700 |

Le numéro du cran ne change pas : `ancrageDe` le choisit sur la clarté du
départ. Le ◆ et les octets exacts passent dans l'autre profil. Le profil
anciennement porteur retrouve une couleur calculée. L'aperçu, la planche et
les variables suivent ce changement.

Sur le balayage produit, K65 garde **144 échecs G1**, mais **70 promesses
Soft deviennent tenues et 70 promesses Vivid deviennent manquées**. Pour
`#E82D81`, H 0°, L 0,62, texte Dark blanc, le contraste du texte sur le plein
Vivid passe de **5,289282 à 4,098752**. Le simple total masque cette perte.
Preuve : `balayage.produit/K65.nouvelles` et `resolues`.

Les alertes de référence ne suivent pas directement le porteur :
`alertes.ts:112` compare la part de référence aux parts effectives. Sans parts
propres, le porteur prend cette part et les deux alertes restent absentes.
Des parts propres peuvent maintenir une alerte ; elles ne décident pas du
classement automatique.

Décisions concernées : Q1/Q2, `[MOT-17]` et `[ENT-11]`. **Correction possible :**
faire choisir explicitement l'effet sur le porteur et sur les références
ternes. Si Vivid doit rester identique, garder ses parts et son porteur dans
la comparaison ; changer les seuls défauts Soft ne le garantit pas.

### 3. K65 défait une partie de l'uniformité des fonds Soft

**Confirmé. Soft Light, 50 à 300.** La borne vers le blanc, hors marge jaune,
passe de 0,51 à 0,67925, soit +33,2 %. Les fonds des verts et des cyans
peuvent donc gagner de la chroma malgré la baisse de la part commune.

La mesure du banc a été rejouée avec `recetteAuxReglagesCommuns`, sur Poppy,
Orange, Grass et Sky. Elle retire les réglages que le banc retirait, puis
compare la chroma maximale à la minimale, à numéro égal.

| Cran Soft Light | Profils actuels | K65 |
|---|---:|---:|
| 50 | ×1,243 | ×2,383 |
| 100 | ×1,183 | ×2,061 |
| 200 | ×1,148 | ×2,163 |
| 300 | ×1,104 | ×1,996 |

Le niveau annoncé autour de ×1,2 est retrouvé avec les profils actuels.
K65 ramène l'écart près de ×2. Le ×4,2 historique concerne l'ancien moteur
avant enveloppe ; il ne désigne pas le témoin actuel.

Avec les réglages propres conservés, les rapports passent respectivement de
2,455 / 1,488 / 1,454 / 1,463 à 3,268 / 1,939 / 1,931 / 1,912.
Preuves : `uniformiteReglagesCommuns` et `uniformite`.

La perte de marge jaune n'entraîne pas une baisse uniforme. Au centre de la
marge, le produit des paramètres vaut presque la même chose :
0,85 × 0,6 × 2 = 1,02 ; 0,6175 × 1,1 × 1,5 = 1,018875.

| Référence Tailwind | Cran | Chroma actuelle | Chroma K65 |
|---|---:|---:|---:|
| Yellow | 100 | 0,051166 | 0,051166 |
| Yellow | 300 | 0,137613 | 0,106599 |
| Amber | 100 | 0,045945 | 0,043490 |
| Amber | 200 | 0,074394 | 0,067568 |
| Green | 100 | 0,025644 | 0,034600 |
| Cyan | 100 | 0,025301 | 0,034467 |

Décisions concernées : Q1/Q2 et la marge jaune choisie au second banc,
`ROBUSTESSE-DES-RAMPES.md`, sections 8 à 10. **Correction possible :** comparer
une séparation des profils qui conserve les bornes des fonds clairs ; faire
rejuger ces fonds et les textes séparément. K65 constitue une nouvelle
décision de couleur, même si son adoption ne demande que des paramètres.

### 4. La bosse laisse un creux artificiel dans le profil non porteur

**Confirmé. Soft Light et Dark pour le bleu électrique.**
`mesurer-regles.ts:174` ignore `rang === a` pour toutes les intensités.
L'ancrage exact n'est pourtant appliqué qu'au porteur, ligne 185.

Pour `#0013FF`, Vivid porte la référence. Avec les profils actuels et la bosse,
Soft Dark prend les chromas suivantes : 400 = **0,233410**, 500 = **0,159123**,
600 = **0,195739**. Le cran 500 est exclu du rehaussement sans contenir la
référence. Avec K65 : **0,134303 / 0,091114 / 0,141933**. Le creux subsiste.
En Light, le même défaut touche le cran 800 de Soft.

La maquette ne montre que le porteur dans sa section consacrée à la bosse
(`MAQUETTE-MOTEUR.html:455`). La métrique de saillie ne parcourt elle aussi
que ce porteur. Ces deux choix cachent le défaut.

**Correction possible :** exclure uniquement le couple intensité porteuse et
rang ancré ; mesurer ensuite les deux profils. Le rapport `rho` vient aussi
du seul porteur. Son application à un autre profil, surtout avec une dérive
non liée, demande une règle explicite avant validation visuelle.

### 5. Les fonds Dark reprennent de la chroma sans garder exactement leur contraste

**Confirmé pour la bosse.** Sur `#0013FF`, Vivid Dark, contre la carte par défaut :

| Cran | Chroma actuelle | Chroma avec bosse | Contraste actuel | Avec bosse |
|---|---:|---:|---:|---:|
| 300 | 0,093359 | 0,126659 | 1,379078 | 1,354160 |
| 400 | 0,113635 | 0,205988 | 1,809976 | 1,733105 |
| 500, référence | 0,308546 | 0,308546 | 2,058965 | 2,058965 |

La hausse de chroma au 400 est de 81 %. Elle revient sur la retenue des fonds
Vivid Dark choisie au banc. Le facteur sombre continue à borner la part, mais
la bosse peut dépasser l'enveloppe qui avait motivé ce choix.

**Infirmé : Soft ne reste pas toujours sous Vivid avec K65.** Sur le tour vif,
sept références ont un Soft Dark 600 plus chromatique, jusqu'à ×1,092326.
L'ancrage exact peut dépasser la rampe de l'autre profil. Des parts réglées
et des dérives non liées empêchent aussi une garantie universelle d'ordre.

**Confirmé sur le corpus : K65 conserve une séparation proche du relevé 1,39.**
Sur Tailwind 500, la médiane du Soft Dark 300 contre carte passe de 1,364878 à
1,370103 ; son minimum passe de 1,322820 à 1,353361. Pour les quatre
utilitaires réglés du mainteneur, la médiane passe de 1,404913 à 1,411748.
1,39 est un relevé du banc, pas un seuil garanti pour chaque couleur.

En Dark inversé, `surface/pressed` et `solid/pressed` visent tous deux 500.
Leur contraste mutuel reste exactement **1:1**, avec K65 comme avec la bosse,
dans une même intensité. Le point ouvert de `DECISIONS.md`, section 7, reste
donc entier.

**Correction possible :** faire juger les fonds 300, 400 et 500 des deux
profils, contre la carte et dans les deux sens du thème. La maquette actuelle
ne propose que les sens normaux.

### 6. La chaîne de mesure n'établit pas la compatibilité générale annoncée

**Infirmé comme affirmation générale ; confirmé sur les cas calculés essayés.**
Le contrôle initial de `mesurer-regles.ts:309` couvre 99 palettes, répétées
dans quatre couples de texte. Cinq palettes ont une intensité. Il ne contient
ni parts propres, ni saturation ou luminosité réglées, ni dérive non liée,
ni grille à 13 nuances, ni liste libre, ni palette figée.

L'extension compare 152 cas : aucun écart de couleur ni de contraste sur
les 151 cas calculés ; huit couleurs différentes sur huit pour la palette
figée témoin. `construire` ne traite pas `figees`, alors que `rampesDe`
les rend avant tout calcul (`palette.ts:366`). Les palettes figées ne doivent
recevoir ni enveloppe nouvelle, ni bosse.

Le contrôle original des promesses compare seulement leur **nombre total**.
Il ne compare ni leur identité ni leur contraste. L'expression « à l'octet
près » ne s'applique donc qu'aux hexadécimaux des cas choisis. Le déplacement
des 70 échecs avec K65 montre pourquoi cette distinction est nécessaire.

Le prototype fixe également `srgb` dans ses calculs. C'est cohérent avec les
recettes actuellement admises, mais ce n'est pas une preuve pour un autre
gamut. Son poids gaussien lit `v.Lc`, la clarté de courbe avant les réglages,
et non `v.L` ni la clarté exacte de la référence. Avec un Color shift de
luminosité ou deux profils décalés, « proche en clarté » ne décrit donc pas
la distance affichée.

**Correction possible :** garder le retour anticipé des palettes figées,
définir la coordonnée de la bosse sous réglage et comparer les promesses
par identité. Les essais à 13 nuances et en liste libre confirment la copie
du moteur sans bosse ; ils ne constituent pas un choix visuel de σ pour ces
espacements de nuances.

### 7. Z annule le réglage de part Soft

**Confirmé. Soft, les deux thèmes.** Dans `regleZones`,
`v.part × parts.vivid / parts.soft` annule la part Soft tant que celle-ci est
positive et que le Color shift ne sature pas à 1.

Avec `#0013FF`, des parts propres Soft 0,2 puis 0,9, Vivid 0,95, donnent
**les mêmes onze hexadécimaux Soft Light**. Une part Soft exactement nulle
donne au contraire une rampe grise. Preuve : `regleZ`.

Z préserve le décalage relatif de saturation avant écrêtage, mais ne préserve
pas le sens du réglage global de saturation Soft. Le passage de zéro à une
petite part positive est discontinu. Une intensité unique passe par la
règle Vivid ; les palettes figées restent mal traitées par le constructeur.

Décisions concernées : `[ENT-11]` et les gestes du Réglage global.
**Correction possible :** définir comment la part Soft module le rapport
par zone, y compris à zéro, avant de comparer Z aux candidats de paramètres.
D et K75 utilisent le moteur existant : ce défaut de Z ne les concerne pas.
Leurs valeurs restent à rejuger, notamment le porteur et les textes ; le
tableau du README ne démontre pas leur absence de régression sous réglage.

### 8. La maquette affiche une alerte absente des mesures

**Confirmé. Les deux thèmes, référence terne.** Dans Chromium, choisir
« A, actuelle » puis « Vert terne #7DB05F » affiche **11 nuances confondues
pour l'alerte actuelle et 10 pour la proposée**, donc deux alertes.
Le prototype donne **0 et 0**. La part de référence vaut 0,604, sous 0,85.

Les fonctions `confusionActuelle` et `confusionProposee`
(`MAQUETTE-MOTEUR.html:289`) omettent `aDesProfilsTernes`, présent dans les
deux fonctions du script de mesure. La page recalcule les alertes au lieu de
lire les résultats déjà produits. Elle compare aussi une chroma arrondie
au millième au seuil de 0,06, alors que le script utilise la valeur entière.

**Correction possible :** exporter les nuances jugées, les confusions et le
verdict ; les afficher sans réimplémenter leur calcul dans la maquette.
L'écart empêche de choisir le filtre à partir de cet exemple.

### 9. Le message ne peut pas promettre de supprimer le saut

**Confirmé pour l'action, infirmé pour une correction garantie.** La saturation
du porteur passe par `referenceReglee`, qui refabrique la référence depuis
son départ (`reglages.ts:23`). Elle fonctionne aussi à une intensité.

Mais elle réduit souvent la référence et ses voisines dans la même proportion.
Pour le jaune vif, la saillie Dark vaut 1,155 à part 1, 1,159 à part 0,8 et
1,154 à part 0,5. Pour l'orange vif en Light : 1,148, 1,149 et 1,153.
La référence devient moins chromatique ; le rapport de voisinage ne baisse
pas nécessairement. Preuve : `messageSaturation`.

La borne du prototype est `part × plafond`, parfois inférieure au plafond
sRGB. Attribuer tous les sauts à l'écran serait faux. La détection doit
distinguer la borne active, mesurer chaque voisin et utiliser la clarté et
la teinte réellement visées. Une référence hors de la courbe, un gris ou
une palette figée demandent un traitement distinct.

`[VER-10]` précise actuellement qu'une référence plus vive que Vivid ne donne
pas de message. La proposition porte sur la rampe autour de la référence,
pas seulement sur les parts. Il faut définir ce nouveau constat sans
réactiver implicitement l'ancien, puis le rendre en français et en anglais.
Le seuil de déclenchement, la sévérité et le texte exact sont **non
vérifiables** : aucune implémentation de ce message n'est proposée.

## Vérifications complémentaires

### Parts ternes, recettes rangées et limites

| Point | Verdict et preuve |
|---|---|
| `min(1, p × v / s)` écraserait Vivid à 1 pour une référence terne | **Infirmé.** La branche exige `p < s`. Donc `p × v / s < v ≤ 1`. Avec K65, la valeur reste sous 0,95 avant arrondi, puis au plus 0,95 au millième. `palette.ts:104`. |
| Vivid reste identique quand le porteur reste Soft | **Infirmé.** Le rapport des parts communes change aussi la part de l'autre profil. Sur le tour doux, aucun porteur ne change, mais 258 couleurs Vivid Light et 249 Vivid Dark changent sur 264. |
| Les recettes 11 rangées prennent les nouveaux défauts | **Infirmé.** `classerRecette`, `recette.ts:903`, conserve leurs profils. La conversion des formats 8 à 10 prend les nouveaux défauts, ligne 880. |
| Le rétablissement des intensités suffit à adopter K65 dans une recette | **Confirmé pour ce geste volontaire.** `configuration.ts:182` remplace les profils entiers et l'intensité des fonds Dark. Il faut annoncer ce périmètre ; le geste conserve les parts propres des palettes. Aucune migration forcée n'est techniquement nécessaire si cette adoption volontaire est le choix retenu. |
| Les marques P6 indiquent toujours 0,6175 après mise à jour | **Infirmé.** `reglagesParDefaut.ts:73` calcule la saturation après rétablissement de la palette dans sa recette. Une recette 11 ancienne garde ses communes ; le porteur garde la part de sa référence de départ. La marque ne lit pas directement la constante du paquet. |
| Les bornes de saturation ne changent pas | **Infirmé.** Sur les 84 pistes mesurées, celle de Grass Soft, bout sombre, passe de `[−1 ; 0,50]` à `[−1 ; 1]` avec K65. `limites` dans le relevé. Les limites doivent se recalculer avec la recette et les rampes retenues. |
| L'ordre des nuances est inchangé par la bosse | **Confirmé pour les clartés visées de `[DER-19]`.** La bosse ne change pas `L` ; `ordreTenu` lit `clartesDe`, pas la chroma. La clarté relue après arrondi peut bouger légèrement. Le creux de chroma du constat 4 ne sera pas détecté par cette loi. |

Une bosse ajoutée sans paramètre de recette s'appliquerait aussi aux recettes
11 existantes. La stabilité des profils rangés ne protège donc pas leurs
couleurs contre ce changement de moteur. C'est une décision de compatibilité
distincte de l'adoption de K65.

### Alerte et repère ≈

- **Confirmé :** `confusionsDe`, `alertes.ts:70`, sert à l'aperçu et à la
  planche sur toute la liste. `[PLA-15]` demande ce relevé local. L'alerte
  agrège seulement des nuances utiles, au moins trois. Des ≈ sans alerte
  existent déjà par construction. Faire suivre tous les repères au filtre de
  l'alerte changerait cette décision ; ce n'est pas une correction obligatoire.
- **Confirmé :** le filtre proposé détecte encore des parts proches. Dans la
  galerie réelle, Rose et Indigo ont Soft 0,5, Vivid 0,55. Après adoption de
  K65, elles donnent respectivement **7 et 5** nuances jugées confondues,
  donc une alerte chacune. Elles portent **20 et 17** repères locaux.
- **Infirmé :** 0,06 n'est pas la chroma sous laquelle aucun réglage ne peut
  créer un écart de 0,02, contrairement au commentaire du script, ligne 234.
  À clarté et teinte égales, passer de C 0 à C 0,04 donne déjà ΔEok 0,04.
  Le seuil de 0,06 est un filtre de pertinence à faire choisir.
- **Pas de contradiction arithmétique établie** entre 0,06 et 0,05 : le premier
  juge la chroma d'une nuance Vivid ; `CHROMA_DES_PALETTES_COLOREES` juge celle
  de la référence pour comparer deux palettes. Ils portent sur des objets
  différents. Une palette peut donc participer à `palettes-proches` sans
  nuance retenue pour `profils-confondus` ; le texte doit permettre de
  comprendre les deux constats.

### Proximité et Harmonisation

| Jeu, dans sa recette indiquée | Paires actuelles | Avec K65 | Avec bosse seule | K65 et bosse |
|---|---:|---:|---:|---:|
| Tailwind 500 | 13 | 13 | 13 | 13 |
| Tour `#C59735` | 34 | 26 | 34 | 26 |
| Mainteneur, réglages conservés | 0 | 0 | 0 | 0 |
| Galerie réelle, Soft commun 0,45 | 10 | 9 | 10 | 9 |
| Galerie simulée avec défauts 0,85 / 0,95 | 8 | 9 | 8 | 9 |

**Confirmé sur ces jeux :** la bosse change des couleurs comparées, mais pas
le nombre de paires. Les distances et les zones de teinte peuvent changer
sans franchir le seuil. Les listes de paires avec leurs distances sont dans
`jeux.*.variantes.*.proches`.

**Infirmé pour les constats de saturation :** ils ne lisent pas les chromas
des crans. `plugin-palettes/src/harmonisation.ts:167` lit `partsDe`.
La bosse peut rendre une rampe plus chromatique sans modifier ce constat.
K65 peut le modifier par les parts. Les couleurs de Comparaison, les paires,
la course et les zones de teinte lisent les rampes réelles
(`couleur/src/harmonisation.ts:66`). Ils doivent recevoir la même bosse que
l'aperçu et la vérification.

## Qualité par profil et par thème

Ce tableau réunit les cinq jeux demandés : 17 Tailwind, 24 du tour `#C59735`,
cinq saturées, sept du mainteneur, vingt de la galerie réelle. Les trois
palettes à une intensité du mainteneur sont comptées séparément. Chaque vue
Soft ou Vivid contient donc **770 couleurs**. ΔC est la chroma après moins
la chroma avant ; ses extrêmes ne constituent pas une médiane.

| Vue | K65 seul : octets changés ; plage ΔC | Bosse seule : octets changés ; plage ΔC | Nuances et décisions touchées |
|---|---|---|---|
| Soft Light | 568/770 ; −0,079136 à +0,080478 | 69/770 ; 0 à +0,060353 | K65 : fonds 50 à 300 inégalement colorés, textes et ancrage ; Q1/Q2. Bosse : voisinage du porteur, creux au rang exclu dans le non-porteur. |
| Soft Dark | 605/770 ; −0,134730 à +0,081279 | 34/770 ; 0 à +0,103741 | K65 : ensemble de la courbe ; les hausses incluent l'adoption depuis la galerie à 0,45. Bosse : fonds 300 à 500 pour une référence moyenne ; Q1/Q2, Q5 et G7 sous réglage. |
| Vivid Light | 291/770 ; −0,032563 à +0,064456 | 26/770 ; 0 à +0,069965 | K65 : parts ternes et porteur, malgré l'enveloppe Vivid inchangée. Bosse : voisins des références saturées ; enveloppe dépassée. |
| Vivid Dark | 263/770 ; −0,032563 à +0,068519 | 65/770 ; −0,000096 à +0,092353 | K65 : parts et ancrage, échecs G1 déplacés. Bosse : fonds et voisins, G7 sous réglage. La très petite baisse de C vient de la relecture des octets arrondis. |

Le détail par numéro de nuance est dans `jeux.*.variantes.*.stats.*.parCran`.
Pour isoler les défauts 0,85 / 0,95 de l'effet propre à la galerie :

| Jeu | Vivid Light changé par K65 | Vivid Dark changé par K65 |
|---|---:|---:|
| Tailwind 500 | 50/187 | 35/187 |
| Tour `#C59735` | 190/264 | 181/264 |
| Cinq références saturées | 0/55 | 0/55 |
| Quatre utilitaires du mainteneur | 0/44 | 0/44 |
| Galerie réelle | 51/220 | 47/220 |

Les cinq références saturées à une intensité restent identiques sous K65.
La bosse en change **8/55** couleurs Light et **12/55** Dark, avec les mêmes
maxima ΔC que leur Vivid à deux intensités. Les trois palettes à une intensité
du mainteneur ne changent sous aucune de ces variantes.

## Erreurs et limites des mesures présentées

| Élément | Verdict | Correction à apporter |
|---|---|---|
| « Les garanties ne changent » dans le README et la maquette | **Infirmé au sens général.** Le total du balayage reste 144 ; K65 déplace 70 échecs et la bosse en crée sur des réglages autorisés. | Comparer les promesses par référence, thème, profil, garantie et fond. Borner l'affirmation au corpus réellement mesuré. |
| « Soft = Vivid × 0,65 » | **Infirmé comme identité des rampes.** Les parts effectives, les ancrages et les réglages propres empêchent cette égalité. | Présenter le rapport des paramètres par défaut et afficher les rapports effectivement produits. |
| Références ternes « identiques » dans le README | **Infirmé.** Les parts sont proportionnelles et les enveloppes distinctes. Une petite distance n'est pas une égalité d'octets. | Employer le critère mesuré, avec son seuil. |
| Frontière `loinDeLaPage < 0,35` | **Infirmée comme séparation sémantique fonds/textes.** Elle classe 400 et 500 Dark parmi les textes, alors que ce sont deux fonds `surface`. Elle y classe aussi les états pleins. | Mesurer les rôles de la table du kit, en séparant fond, plein et texte. |
| Rapport « Textes Soft / Tailwind » | **Mesure calculée, interprétation trop large.** Le script compare `surface/foreground` au même numéro Tailwind : 800 Light et 950 Dark par défaut. Tailwind 950 est une couleur sombre ; UCM Dark 950 est un texte clair. | Séparer les thèmes et comparer des rôles ou des clartés comparables. |
| Tailwind 3.4 comme unique témoin | **Insuffisant pour conclure sur Tailwind 4.** Sur le relevé CSS local de Tailwind 4, le ratio médian du texte Soft Light passe de 0,719 à 0,572 avec K65 ; en Dark, de 0,507 à 0,356, avec la réserve de rôle ci-dessus. | Nommer la version, conserver le témoin 3.4 pour la continuité et ajouter le témoin 4. Source locale : `Collecte/Composants/sources/tailwind-theme.css.txt`. |
| Saillie `C / max(voisines)` | **Correcte pour un pic au-dessus des deux voisins ; insuffisante pour un saut.** Un seul voisin proche masque l'autre côté. Les extrémités sont exclues de la saillie globale, mais possibles pour celle de référence. | Donner les deux rapports latéraux, les distances ΔEok et les écarts de clarté ; mesurer aussi le non-porteur. |
| Interprétation perceptuelle de la saillie | **Non vérifiable par ce seul ratio.** Il ignore teinte, luminosité, pas de la grille et rôle de la nuance. | Ne pas en déduire seul un classement visuel entre UCM, Tailwind et Radix. |
| Alerte du Vert terne dans la maquette | **Infirmée par le script : 11/10 affichés contre 0/0 calculés.** | Partager les données de verdict, sans seconde implémentation. |
| Choix simultané K65 et bosse dans la maquette | **Non représenté.** La section 1 lit `règle·B0`, la section 2 toujours `A·bosse`, lignes 404 et 455. | Montrer le couple recommandé, les deux profils et les quatre sens de thème. |
| Précision du graphe | **Arrondie avant calcul du ratio affiché.** Le bleu électrique Dark affiche 1,35 quand le tableau annonce 1,34 pour le maximum calculé sans cet arrondi. | Calculer sur les valeurs entières puis arrondir uniquement le libellé. |
| Comparaison générale des variantes D, K75 et Z | **Non établie sous tous les réglages.** D et K75 changent les parts communes ; Z annule la part Soft. | Ne pas considérer leur total de garanties sur les références par défaut comme une validation d'intégration. |

La maquette a été ouverte dans Chromium à 1440 × 1000. Les cinq règles ont
été parcourues en Light et Dark, puis les quatre variantes de bosse.
Aucune erreur JavaScript ni aucun débordement horizontal n'a été relevé à
cette taille. La capture a été examinée. Le navigateur intégré a échoué
deux fois avec `sandboxPolicy` manquant ; Chromium local a servi de repli.
Cette lecture ne remplace pas le jugement visuel du mainteneur.

## Lecteurs et tests à prendre en compte

| Lecteur | Effet du changement |
|---|---|
| `plugin-palettes/src/analyse.ts:77` | Centralise rampes, promesses et confusions. Toute divergence entre ces calculs devient visible dans les onglets. |
| Aperçu et planche, `planche/modele.ts:313` | Couleurs, ◆, ≈ et garanties suivent l'analyse. L'empreinte porte le modèle dessiné, ligne 679 : une couleur changée rend une ancienne planche périmée. |
| Variables, `variables/plan.ts:84` et `:144` | Les valeurs viennent de `rampesDe`. Les chemins et les crans restent identiques ; les écritures proposées peuvent remplacer de nombreuses couleurs. |
| Harmonisation, `couleur/src/harmonisation.ts:66` | Les courses et zones jugent les palettes candidates et leurs promesses. Les couleurs avec bosse doivent y être les mêmes que dans Vérification. |
| Garantie des courbes, `couleur/src/garantie.ts:73` | Appelle `fabriquerCran`, sans référence ni bosse. Son verdict ne prouve pas la conformité d'une palette avec bosse. |
| Reconstruction, `couleur/src/reconstruction.ts:327` | L'estimation locale appelle `cranVise` ; l'évaluation finale appelle `rampesDe`, ligne 1043. Une bosse ajoutée au second change le problème que la première cherche à résoudre. Rejouer les cas de reconstruction ; leur convergence avec bosse n'a pas été mesurée ici. |
| Pistes du Réglage global, `ui/reglagesDeLaPalette.ts:304` | Peignent un cran avec enveloppe, sans le voisinage d'une référence. Vérifier ce qu'elles promettent visuellement si une bosse est ajoutée ailleurs. |
| Référence réglée et ajustement, `reglages.ts:23`, `ajustement.ts:24` | Fabriquent la référence sans enveloppe. Ne pas leur appliquer une bosse destinée aux voisines. |
| Explorateur, `integrations/palettes.ts:36` | Lit la recette et les associations de rôles. Il ne recalcule pas les rampes ; il verra les couleurs réellement écrites dans les variables. Le classement des anciens formats suit néanmoins les nouveaux défauts du moteur partagé. |
| `ucm check`, `diagnostic-contrastes.mjs:1` | Mesure les valeurs publiées dans `tokens.json`, sans lire les profils Palettes. Son diagnostic peut changer après réexport des couleurs ; aucun nouveau schéma de contrat ne découle de K65 seul. |
| Catalogues `i18n/fr.ts:1072`, `en.ts:1070`, notes `:1587` / `:1589` | Préciser le périmètre de l'alerte et conserver le sens local de ≈. Un nouveau message exige les deux catalogues, son action et le rapport. |

Les spécifications à relire sont `[MOT-17]` (porteur), `[MOT-35]`
(enveloppe), `[ENT-11]` (parts), `[VER-10]` et `[VER-11]` (messages),
`[PLA-15]` (repère), `[DER-19]` (limites) et `[REC-12]` (lecture des formats).
`AGENTS.md:1041` décrit encore les anciens crans facultatifs ; `:1049` exclut
encore la carte et `:1061` annonce le format 10. Ces passages sont déjà en
retard sur `DECISIONS.md` et sur le code. Ils ne justifient pas d'annuler les
décisions récentes.

### Tests dont le résultat change

`node review-tests.cjs` compile les sources en mémoire, d'abord telles
quelles, puis avec les seules constantes K65. Il rejoue les fonctions des
tests purs ; il ne modifie pas les fichiers et ne remplace pas une exécution
de toute la suite du dépôt. Les trois fichiers choisis ne demandent aucun
hook du lanceur de tests.

**118 assertions de test passent avec les défauts actuels ; huit tests
échouent avec K65.** Les noms et les erreurs sont dans
[REVIEW-CODEX-TESTS.json](./Mesures/REVIEW-CODEX-TESTS.json).

| Fichier | Tests qui échouent avec K65 |
|---|---|
| `couleur/tests/recette.test.ts:177` | `[REC-12] la recette par défaut porte les profils et le relevé du paquet, en copies` : valeurs Soft explicites. |
| `couleur/tests/enveloppe.test.ts:65` | `[MOT-35] la marge des jaunes ne joue pas en Dark` : le nom reste vrai, mais les chromas numériques attendues changent. |
| `couleur/tests/enveloppe.test.ts:168` | Les cinq témoins `bleu`, `jaune`, `vert`, `reglee`, `propres` ne rendent plus les hexadécimaux figés. Le témoin `unique` passe. |
| `plugin-palettes/tests/configuration.test.ts:134` | Le test des parts par défaut 0,85 / 0,95 et de la conservation de l'enveloppe attend encore 0,85 pour Soft et son `p0`. |

Pour la bosse et l'alerte, aucune implémentation complète n'est proposée :
une liste exhaustive de tests rouges serait spéculative. Les tests
`ancrage.test.ts`, `base.test.ts`, `intensites.test.ts`, `limites.test.ts`,
`fondsSombres.test.ts`, `alertes.test.ts`, `reconstruction.test.ts`, ainsi que
les tests du bilan, de la planche, des variables et d'Harmonisation sont les
contrôles concernés. Les contre-exemples de cette revue doivent devenir des
tests avant toute modification de leurs valeurs attendues.

## Scripts ajoutés et relance

Depuis ce dossier :

```powershell
Set-Location -LiteralPath './Mesures'
npx tsx review-codex.ts
node review-tests.cjs
node review-maquette.cjs
```

- [review-codex.ts](./Mesures/review-codex.ts) produit
  `REVIEW-CODEX-MESURES.json` : équivalence, jeux de palettes, balayages,
  limites, contre-exemples, uniformité et comparaison au relevé Tailwind 4.
- [review-tests.cjs](./Mesures/review-tests.cjs) produit
  `REVIEW-CODEX-TESTS.json` : comparaison des 118 tests purs avec les défauts
  actuels et K65 compilés en mémoire.
- [review-maquette.cjs](./Mesures/review-maquette.cjs) parcourt la maquette
  dans Chromium et imprime les textes observés. Sa capture est placée dans
  le dossier temporaire du poste, au chemin imprimé par la commande.

Les fichiers existants de mesures n'ont pas été régénérés. Les empreintes
des sources principales lues sont consignées dans le relevé. Aucun commit
n'a été créé.
