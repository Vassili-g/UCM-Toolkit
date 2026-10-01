# UCM Palettes : refonte de la carte « Intensités »

Cette recherche répond aux cases Z10.1 à Z10.3 du [sixième
plan](./PLAN-ERGONOMIE-PALETTES-V6.md#lot-z10--refonte-des-intensités). Elle
s’adresse à l’agent qui écrira le moteur et l’interface de Z10.5 et Z10.6. Elle
fixe un modèle, revu par un agent indépendant, et laisse à la maquette
`MAQUETTES-RECETTE-V6-2.html` les questions que la mesure ne tranche pas.

Le besoin est celui du [retour du
mainteneur](./PLAN-ERGONOMIE-PALETTES-V6.md#retours-du-mainteneur-suite-de-la-recette-v6).
Le designer règle la teinte, la saturation et la luminosité d’une palette,
pour Vivid, pour Soft ou pour les deux. Un réglage peut déplacer la référence,
et un avertissement le dit. La dérive de teinte s’applique ensuite.

## Ce que le moteur fait aujourd’hui

Relevé dans `packages/couleur/src` et `packages/plugin-palettes/src`, au
commit `3d844ee`.

| Fait | Source |
|---|---|
| Un cran d’un profil a pour clarté celle de la courbe commune, pour teinte `Ha` plus la dérive du profil à cette clarté, pour chroma la part du profil fois le plafond du gamut | `rampe.ts`, `fabriquerRampe`, `teinteA` |
| La référence est le pivot de la teinte des deux profils : aucun profil n’a de teinte propre hors de sa dérive | `rampe.ts`, `fabriquerPalette` |
| La saturation par profil existe : `parts`, d’origine `designer` ou `grise`, bornée pour que Soft ne dépasse pas Vivid. Des parts propres passent avant une palette de base | `recette.ts`, `PartsPropres` ; `palette.ts`, `partsDesProfils` |
| Le profil porteur garde les octets de la référence à son cran, choisi sur la courbe commune. Les autres crans du profil suivent le calcul commun, à leur part : une référence plus ou moins saturée que sa rampe y fait un cran à part (`[VER-10]`) | `palette.ts`, `rampesDe`, `ancrageDe`, `rangPorteur` |
| En Auto, le profil porteur se choisit en comparant la part de la référence aux parts **communes**, au millième. Il bascule à mi-chemin, 0,70 avec les parts par défaut. La part de la référence dépend de sa clarté et de sa teinte | `palette.ts`, `profilAutomatique` |
| Aucune luminosité par profil. La luminosité de la référence se règle par « Ajuster la référence », au pas de 0,01, `originale` gardée. Le panneau s’ouvre au pas qui mène de l’originale à la référence | `ajustement.ts`, `edition.ts`, `appliquerLAjustement` ; `ajustementDeLaReference.ts`, `pasALOuverture` |
| Changer la référence recalcule une dérive d’origine `tailwind`, retire `originale` et recalcule les parts grises | `edition.ts`, `changerReference`, `[ENT-01]` |
| Une palette à une intensité a pour part celle de sa référence, et n’a pas de carte Intensités | `palette.ts`, `partsDe` ; `[ENT-14]` |

## Outils étudiés

| Outil | Ce qu’il règle | Contrôles | Cibles liées |
|---|---|---|---|
| Photoshop, Teinte/Saturation | Une image, en entier (« Global ») ou par plage de couleurs | Teinte de −180 à +180 degrés, saturation et luminosité de −100 à +100 ; deux bandes de teintes, avant et après, sous les curseurs | La plage « Global » règle tout ; une plage de couleurs se règle seule |
| Lightroom, Mélangeur de couleurs | Teinte, saturation et luminance de huit plages de couleurs | Un curseur par plage et par grandeur ; l’outil de réglage ciblé : cliquer une couleur de l’image, puis glisser vers le haut ou le bas | Le mode « Tout » montre les trois grandeurs d’une plage ensemble |
| Figma, sélecteur de couleur | Une couleur | Hex, HSB, HSL, RGB, CSS ; teinte entière de 0 à 360, saturation et luminosité de 0 à 100 ; les flèches changent la valeur d’un champ | Aucune |
| tints.dev | Une gamme de onze nuances depuis une couleur de base | Décalage de teinte, décalage de saturation, luminosité minimale et maximale ; la base se place sur une nuance choisie | Une gamme, sans profils |
| ColorBox (Lyft) | Une gamme | Teinte, saturation et luminosité par un début, une fin et une courbe d’accélération ; une nuance peut être épinglée sur une couleur exacte, et la courbe se recalcule pour passer par elle | Une gamme, sans profils |
| Leonardo (Adobe) | Un thème de plusieurs gammes | Luminosité, contraste et saturation du thème, de 0 à 100 % ; des couleurs clés et des ratios de contraste visés par gamme | Les réglages du thème valent pour toutes ses gammes |
| Huetone | Une gamme en LCH ou OKLCH | Une courbe de clarté et une courbe de chroma par famille de teinte, point par point | Aucune |
| Radix Colors, palette personnalisée | Une échelle de douze pas | Trois entrées : accent, gris, fond ; aucun curseur | Aucune |
| uicolors.app | Une gamme Tailwind | Teinte, saturation et luminosité de chaque nuance, en offre payante | Aucune |

Sources : [Adobe, Teinte/Saturation](https://helpx.adobe.com/photoshop/desktop/adjust-color/color-corrections/apply-a-hue-or-saturation-adjustment.html) ;
[Julieanne Kost, Mélangeur de couleurs de Lightroom Classic](https://jkost.com/blog/2024/08/using-color-mixer-to-adjust-hue-saturation-and-luminance-in-lightroom-classic.html) ;
[Figma, modèles de couleur](https://help.figma.com/hc/en-us/articles/360043042113-Color-models-in-Figma-Design) ;
[forum Figma, flèches sur la teinte](https://forum.figma.com/t/pressing-up-arrow-key-in-colour-picker-for-hues-should-loop-past-360-back-to-0/26136) ;
[tints.dev](https://www.tints.dev/) ;
[ColorBox](https://colorbox.io/) et [documentation de l’algorithme](https://github.com/lyft/coloralgorithm/pull/8/files) ;
[Leonardo](https://leonardocolor.io/theme.html) ;
[Radix, palettes personnalisées](https://www.radix-ui.com/colors/docs/overview/custom-palettes) ;
[UI Colors](https://uicolors.app/generate).

Quatre constats en découlent pour la carte :

1. Photoshop, Lightroom, tints.dev et ColorBox règlent la teinte par un
   **décalage** depuis la couleur de départ. Figma, Radix et Huetone posent
   une valeur absolue, mais ils ne règlent pas une gamme depuis une référence.
2. ColorBox épingle une nuance sur une couleur exacte et fait passer la
   courbe par elle. C’est le rôle du profil porteur : la rampe passe par la
   référence. Aucun de ces outils ne laisse une nuance épinglée hors de sa
   courbe.
3. Photoshop, avec « Global » et les plages, et Lightroom, avec « Tout »,
   choisissent la cible avant les curseurs : un seul jeu de curseurs sert
   toutes les cibles. Aucun ne pose deux colonnes de curseurs côte à côte.
4. Photoshop peint la teinte sur deux bandes, avant et après. Figma peint la
   piste de la teinte. Une piste peinte sert de repère au designer ; un champ
   numérique porte la précision.

## Mesures

Le script [`mesurer-refonte-intensites.mjs`](./mesurer-refonte-intensites.mjs)
fabrique les rampes de chaque modèle par `fabriquerRampe`. Il juge les paires
de la table des emplois comme `verifierPromesses`. Avant toute mesure, il
vérifie que son jugement égale celui du moteur sur les palettes non réglées,
et que sa version du modèle C, à réglages nuls, rend les hexas du moteur.
Cinq références, recette par défaut, deux intensités, dérive Tailwind.

| Référence | Porteur | Nuance porteuse | Part | Garanties au départ |
|---|---|---|---|---|
| Bleu `#1E6FD9` | Vivid | 600 Light, 600 Dark | 0,894 | toutes tenues |
| Vert `#16A34A` | Vivid | 600 Light, 700 Dark | 0,965 | Vivid ✗ 2 |
| Rouge `#DC2626` | Vivid | 600 Light, 600 Dark | 0,914 | toutes tenues |
| Sauge `#A0B599` | Soft | 400 Light, 800 Dark | 0,198 | toutes tenues |
| Gris `#6B7280` | Soft | 600 Light, 600 Dark | 0,094 | toutes tenues, parts `grise` ; depuis la version 6 de la recette, Soft à 0,094 et Vivid à 0,198 ([palettes désaturées](../3 Palettes désaturées/PLAN-PALETTES-DESATUREES.md)) |

**E1, la référence tournée.** Tourner la teinte de la référence à clarté
égale fait perdre de la chroma quand la teinte d’arrivée a un plafond plus
bas. Bleu perd 6 % à −5°, 18 % à −10° et 32 % à −20° ; Vert perd 7 % à +5°
et 26 % à +20° ; Rouge 26 % à +20°. Sur ces cinq références, de −20° à +20°,
le profil porteur ne change pas. Sur une grille de 1 080 couleurs (36
teintes, 11 clartés, parts 0,5, 0,7 et 0,9), il change pour 189 d’entre
elles à +10° et 294 à +30°. La grille met une part sur trois au point de
bascule, 0,7, et surestime donc la fréquence.

**E2, la teinte du profil non porteur décalée.** De −20° à +20°, aucune
garantie ne se perd. Les contrastes se calculent sur les couleurs à 8 bits,
mais la garantie des courbes (`[ENT-10]`) les tient sur 360 teintes, et un
décalage de teinte ne quitte pas la courbe. L’écart moyen entre Soft et
Vivid, sur 500, 600 et 700 en Light, va de 0,079 à 0,139 ΔEok. Un décalage
peut rapprocher les deux profils : Bleu à +5° passe de 1 à 2 nuances
confondues. Sur le gris, aux parts `grise`, les deux profils restent
confondus sur 12 nuances à tout décalage.

**E3, la référence fixe dans un profil porteur décalé (modèle B).** La
rupture est la distance entre les octets de la référence et le cran que la
rampe décalée poserait à sa place.

| Référence | Sans décalage | 5° | 10° | 20° | Pas vers les deux voisines |
|---|---|---|---|---|---|
| Bleu | 0,035 | 0,050 | 0,057 | 0,083 | 0,117 et 0,056 |
| Vert | 0,044 | 0,053 | 0,065 | 0,088 | 0,044 et 0,132 |
| Rouge | 0,014 | 0,021 | 0,047 | 0,089 | 0,094 et 0,081 |

À 10°, la rupture égale le pas vers une voisine ; à 20°, elle le dépasse. Le
cran de la référence se lit alors comme une autre couleur dans sa rampe.

**E4, la luminosité d’une rampe, référence immobile (modèle B).** La
première mesure décalait la rampe sans déplacer la référence, ancrée sur la
courbe commune. La revue l’a relevé : elle ne décrit pas le modèle C. Elle
reste dans le script, sous E4, pour le modèle B.

**E4 bis, la luminosité d’un profil dans le modèle C.** La référence se
déplace avec la rampe du porteur ; courbe, pivot, bouts et ancrage du profil
se translatent ensemble. Garanties manquées du profil décalé, et nuances
voisines qui rendent le même hexa (≡) :

| Référence | −0,05 | −0,02 | +0,02 | +0,05 |
|---|---|---|---|---|
| Bleu | ✓ | ✓ | ✓ | ✓, 1 ≡ par profil |
| Vert, Vivid décalé | ✓ | ✓ | ✗ 4 | ✗ 7, 1 ≡ |
| Vert, Soft décalé | ✓ | ✓ | ✓ | ✗ 2, 1 ≡ |
| Rouge | ✓ | ✓ | ✓ | ✓, 1 ≡ par profil |
| Sauge | ✓ | ✓ | ✓ | Soft ✗ 2, Vivid ✗ 4, 1 ≡ |
| Gris | ✓ | ✓ | ✓ | ✓, 1 ≡ par profil |

À +0,05, la nuance 50 Light passe au-delà de 1, devient blanche et se
confond avec la 100, sur les cinq références. Jusqu’à +0,02, aucune nuance
ne se confond. Vert, qui manque deux garanties au départ, les répare à −0,02
et en manque quatre à +0,02.

Une variante ramène le décalage à zéro aux deux extrémités de chaque courbe,
sur 0,15 de clarté, pour garder le 50 dans [0, 1]. Elle perd plus de
garanties que la translation : Bleu ✗ 2 à −0,05, Sauge ✗ 6 et ✗ 8 à +0,05,
Gris ✗ 2 à −0,05. Resserrer les nuances claires fait tomber les contrastes
de `surface` et `border-decorative`.

**E5, la luminosité de la référence seule.** C’est « Ajuster la référence ».
Cinq pas changent souvent la nuance porteuse : Bleu passe de 600/600 à
700/500 à −0,05, Vert de 600/700 à 500/700 à +0,02.

**E6, la saturation du profil porteur écrite dans la référence.** Poser la
part de la référence à 0,6 ou moins fait passer le porteur de Vivid à Soft,
sur les cinq références : le classement automatique bascule à 0,70.

**E7, le coût.** Rampes réglées et jugement de 44 crans : 0,10 ms en
médiane, avec ou sans réglage. `[MOT-13]` accorde 5 ms.

## Réponses aux questions du plan

| Question | Réponse | Fondement |
|---|---|---|
| Espace des réglages | OKLCH, celui du moteur : teinte en degrés, saturation en part de chroma, luminosité en clarté. HSL déforme la clarté perçue d’une teinte à l’autre, et les garanties dépendent de la clarté | `[MOT-03]`, `[MOT-24]` |
| Décalages ou valeurs absolues | La teinte et la luminosité se rangent en décalages, comme dans Photoshop, Lightroom et tints.dev ; la saturation reste une part absolue, comme aujourd’hui. L’interface affiche aussi la valeur absolue qui en résulte | Constat 1 ; `parts` |
| Saturation et `parts` | La saturation d’un profil est sa part : la carte reprend `parts`, sans second champ. Elle reste active sur une palette de base, où des parts propres passent avant la base | `partsDesProfils` |
| Ce que déplace la luminosité | Toute la rampe du profil réglé, de −0,05 à +0,02 ; pour le profil porteur, la référence avec elle | E4 bis |
| « Les deux » | Un réglage lié, comme `derive.lien` : il déplace les deux profils du même écart et garde l’écart entre eux | `[DER-12]` |
| Le profil porteur | Un réglage de teinte ou de luminosité du porteur déplace la référence, `originale` gardée. La saturation du porteur ne la déplace pas. Le porteur se fige dès le premier réglage de la carte | E1, E3, E6, Q6.8 |
| Palette à une intensité | La carte existe, sans choix de profil. La teinte et la luminosité déplacent la rampe et la référence, comme pour un porteur ; la saturation est celle de la référence, qu’elle récrit (`[ENT-14]`) | Q6.9 |
| « Ajuster la référence » | Le raccourci de la luminosité du porteur : la modale propose la valeur qui répare, « Appliquer » la pose dans la carte (réponse R1) | E4 bis, E5 |
| Palettes grises, de base, libres ; parts communes ; « Profils confondus » | Gris : le moteur applique les réglages. L’interface désactive la teinte, comme la dérive, pour une palette dont aucune nuance calculée n’a de couleur (`[DER-15]`, [palettes désaturées](../3 Palettes désaturées/PLAN-PALETTES-DESATUREES.md), R4) ; une référence terne garde sa teinte. Libre : la carte existe, sans garanties. Les parts communes ne changent pas. « Profils confondus » mène à la saturation, à l’écart ou à la luminosité de la carte | `[ENT-09]`, `[ENT-11]`, `[VER-15]` |
| Version de la recette | Version 5 : un champ facultatif par palette. Une recette 4 se lit sans changer de couleur | Section 7.3 |

## Modèles candidats

**Modèle A, la référence seule.** Les trois contrôles règlent la référence,
et les deux profils la suivent ; la saturation par profil reste `parts`.
Aucun champ nouveau. Le modèle ne donne pas deux teintes aux deux profils :
il manque le premier besoin du retour. Écarté.

**Modèle B, des décalages propres, la référence fixe.** Chaque profil range
un décalage de teinte et de luminosité, appliqué à toute sa rampe. La
référence ne bouge jamais, et le cran porteur garde ses octets. E3 montre
qu’à 10° le cran de la référence s’écarte de sa rampe autant qu’une nuance
voisine. Le modèle contredit aussi le retour, qui veut que le réglage touche
la référence. Écarté.

**Modèle C, le profil porteur porte la référence.** Retenu, corrigé par la
revue.

- **Un champ.** `reglages?: { porteur, rotation?, ecart?, clarte?: { soft,
  vivid } }`. `porteur` fige le profil porteur ; `rotation` est la teinte
  du porteur depuis l’originale, dans [−30, 30] ; `ecart` est la teinte de
  Soft moins celle de Vivid, dans [−30, 30] ; `clarte` décale chaque profil,
  dans [−0,05, +0,02]. Les angles se rangent au centième, les clartés au
  millième (`[MOT-27]`). Une valeur absente vaut 0 ; un zéro rangé est
  refusé, comme `originale-identique`.
- **Le porteur figé.** Au premier réglage de la carte, `porteur` prend le
  profil que l’ancrage désigne. Il remplace alors le classement
  automatique, sans toucher aux parts. `base`, quand elle existe, lui est
  égale. Choisir l’autre profil sous « Référence exacte dans » fait tourner
  les deux profils de l’écart, et l’interface le dit avant d’agir.
- **La référence tirée de l’originale.** Une seule fonction écrit la
  référence : `reference = f(originale, rotation, clarte[porteur])`. Aucun
  geste ne l’écrit par enchaînement : un aller et retour de ±10° laisse
  sinon jusqu’à 0,026 ΔEok d’écart sur Vert, 0,075 à ±30° sur Rouge (mesure
  de la revue).
- **La translation.** Chaque profil fait glisser ensemble sa courbe, son
  pivot et ses bouts. Pivot du porteur : la clarté de la référence ; pivot
  de l’autre : la même, plus la différence de leurs décalages ; bouts du
  profil : `Lc + d` et `Ls + d`. La dérive par cran reste celle du profil
  non décalé. L’ancrage lit la courbe décalée du porteur. `facteurSombre`
  lit la clarté de la courbe commune.
- **L’ordre du calcul d’un cran.** La clarté de la courbe plus le décalage
  du profil ; la teinte de la référence, plus l’écart pour le profil non
  porteur ; puis la dérive, sur le pivot et les bouts translatés ; puis la
  part et le plafond.
- **La dérive Tailwind.** Le préréglage se calcule sur l’originale, pour
  qu’il ne bouge pas pendant les gestes de la carte. Un code saisi retire
  l’originale et le recalcule, comme `[ENT-01]` le dit.

Les gestes de la carte :

| Geste | Sur le porteur | Sur l’autre profil | Les deux |
|---|---|---|---|
| Teinte +δ | `rotation` +δ ; `ecart` compensé pour que l’autre ne bouge pas | `ecart` ±δ, du signe du profil | `rotation` +δ, `ecart` gardé |
| Saturation +δ | Part du porteur, bornée par l’autre | Part de l’autre, bornée par le porteur | Les deux parts, leur écart gardé |
| Luminosité +δ | `clarte[porteur]` +δ ; la référence suit | `clarte[autre]` +δ | Les deux, la référence suit |

« Revenir à l’originale » remet `rotation` et `clarte[porteur]` à zéro, et
récrit `ecart` pour que l’autre profil garde sa couleur.

Les effets :

| Sujet | Effet |
|---|---|
| `[MOT-17]` | Tenu : la rampe porteuse passe par la référence, ancrée sur la courbe décalée ; aucune rupture de teinte |
| Garanties | La teinte n’en change aucune hors de Vert (E1, E2) ; la luminosité les tient de −0,05 à 0, et en coûte à Vert à +0,02 (E4 bis). La carte Garanties les montre pendant le geste |
| Recette | Version 5, un champ facultatif par palette. Absent, les couleurs sont celles de la version 4 |
| Planche et tokens | Aucun nom ne change. Les cadres passent « À actualiser » par l’empreinte de leur modèle |
| Import et rapport | `reglages` entre dans les champs nommés d’un écart et dans le rapport, avec l’ancrage lu sur la courbe décalée |
| Réglages communs | La garantie des courbes (`[ENT-10]`) juge les courbes communes, qu’un décalage quitte, comme des parts propres. Le ◆ du tracé se place à la clarté de la référence |
| Interface | Un choix de cible, trois curseurs peints, trois champs, un avertissement quand la cible porte la référence |
| Coût | Inchangé, 0,10 ms (E7) |

## Revue du modèle

Un agent indépendant a relu le modèle contre le code (Z10.3). Chaque
conclusion ci-dessous a été vérifiée dans le code ou remesurée.

Retenu :

1. E4 mesurait le modèle B : le script ancrait la référence immobile sur la
   courbe commune (`rampesReglees`). Remesuré en E4 bis, le sens s’inverse
   sur Vert.
2. L’ancrage doit lire la courbe décalée du porteur ; pivot et bouts doivent
   se translater avec elle.
3. Le changement de porteur fait tourner les deux profils de l’écart, et les
   gestes de la carte le déclenchent : remesuré sur 1 080 couleurs. Le
   porteur se fige.
4. La référence se tire de l’originale par une seule fonction. « Ajuster la
   référence » s’ouvre aujourd’hui au pas qui mène de l’originale à la
   référence : après une rotation, il proposerait l’originale et défairait
   la rotation. Avec la réponse R1, la modale pose la luminosité du porteur
   dans la carte.
5. « Revenir à l’originale » doit remettre à zéro les réglages du porteur et
   garder la couleur de l’autre profil.
6. La saturation reste active sur une palette de base.
7. La dérive Tailwind se calcule sur l’originale pendant les gestes de la
   carte.
8. L’import, le rapport, le ◆ du tracé des courbes et `facteurSombre` suivent
   le modèle ; la migration n’écrit aucun zéro ; `choisirLesIntensites`,
   `passerEnLibre` et `revenirAuModele` replient `reglages`.
9. Les vecteurs de test et les mutations proposés entrent dans Z10.5 et
   Z10.8 : recette 4 migrée égale au JSON près de `formatVersion` ; pivot à
   la teinte de la référence pour tout décalage ; dérive par rang identique
   d’un profil décalé à un profil non décalé ; Rouge à clarté +0,05 ancré au
   600 Dark.

Écarté :

- Annuler le décalage de clarté aux extrémités des courbes pour garder le 50
  dans [0, 1] : E4 bis montre que cette variante perd plus de garanties que
  la translation. La borne haute passe à +0,02, où aucune nuance ne se
  confond.
- Exiger `base` pour tout réglage : une palette de base donne au porteur la
  part de la référence (`[ENT-11]`), ce qui changerait les couleurs au
  premier geste. Un champ `porteur` fige sans toucher aux parts.

Reste pour Z10.5 : une palette de version 4 déjà ajustée porte une
référence qui n’est pas `f(originale, 0, 0)`. La migration doit replier cet
ajustement dans `clarte[porteur]`, ou garder la référence rangée comme
point de départ. Replier l’ajustement dans `clarte[porteur]` déplacerait
aussi la rampe du porteur, et une recette 4 changerait de couleurs. Garder
la référence rangée comme point de départ de `f`, l’originale gardée pour
« Revenir à l’originale », ne change aucune couleur.

## Spécification du moteur (Z10.5)

Écrite après la validation de la maquette Z10.4, avant le moteur, puis
corrigée par une seconde revue indépendante dont les conclusions suivent.
Elle précise le modèle C là où la maquette le laissait ouvert.

### Le champ

Une palette porte `reglages`, facultatif :

| Clé | Sens | Bornes, arrondi |
|---|---|---|
| `teinte` | `{ soft?, vivid? }` : la teinte de chaque profil depuis le départ, en degrés | [−30, 30], au centième |
| `clarte` | `{ soft?, vivid? }` : le décalage de clarté OKLCH de chaque profil | [−0,05, +0,02], au millième |
| `part` | La part de chroma de la référence, à une intensité seulement | [0, 1], au millième |
| `porteur` | Le profil porteur figé, `soft` ou `vivid`, à deux intensités sans `base` | — |
| `depart` | Le départ d'une référence ajustée avant cette version : sa référence rangée | hexa, différent de `originale` |

Une palette à une intensité range sous `vivid`, comme sa dérive. Une teinte
ou une clarté nulle ne se range pas, ni un objet vide ; `part` peut valoir 0.
`reglages` contient au moins une teinte, une clarté ou `part`.

Le porteur `P` vaut `base`, sinon `reglages.porteur`, sinon le classement
automatique. À deux intensités sans `base`, `reglages` porte `porteur` : il
se fige au premier réglage. Un **réglage du porteur** est `teinte[P]`,
`clarte[P]` ou `part`.

### Le départ et la référence

Le départ `S` vaut `depart ?? originale` quand un réglage du porteur existe,
sinon la référence. Un réglage du porteur exige `originale` ; `depart`
n'existe qu'avec lui.

`referenceReglee(S, teinte, clarte, part)` rend les octets de la référence :
clarté `S.L + clarte`, teinte `S.H + teinte`, chroma `part × plafond` quand
`part` existe, sinon `min(S.C, plafond)`, comme `propositionDAjustement`.
Tout zéro rend `S`, octets compris. Les gestes tiennent `reference =
referenceReglee(S, teinte[P], clarte[P], part)` ; la validation ne le
recalcule pas, car les fonctions mathématiques de JavaScript ne rendent pas
les mêmes derniers chiffres dans tous les moteurs, et un écart d'un bit
rendrait la recette illisible. Des propriétés sur tirages le tiennent.
Avec un réglage du porteur, `originale` peut égaler la référence : un
réglage fin rend souvent les mêmes octets.

### Les rampes

Pour chaque profil `p`, `d_p` vaut `clarte[p]`, ou 0.

1. Le pivot de `p` a pour clarté `S.L` et pour teinte `S.H + teinte[p]`.
   Sans réglage du porteur, `S` est la référence : le pivot du porteur est
   celui d'aujourd'hui.
2. Un cran lit sa clarté commune `L`. Sa teinte vaut `teinteA(L, pivot de
   p, dérive de p, bouts)`, sa clarté fabriquée `L + d_p`, bornée à [0, 1],
   sa part celle de `partsDe`. `facteurSombre` lit `L`.
3. L'ancrage prend, sur la courbe commune, le rang le plus proche de `S.L`,
   puis y pose les octets de la référence. `S` ne bouge pas pendant les
   gestes : le ◆ garde sa nuance.
4. `pivotDe(recette, palette, intensité)` expose le pivot au graphe de la
   dérive ; l'alerte « hors de la rampe » compare `S.L` aux bouts.

Le préréglage Tailwind se calcule sur `S` : les gestes de la carte ne le
déplacent pas, et une palette ajustée en version 4 garde le sien. Avec
`base`, la part du porteur est celle de la référence réglée : une teinte ou
une luminosité change aussi sa saturation.

### Les gestes

Chaque geste suit le même ordre :

1. Il pose les nouvelles valeurs, bornées. « Les deux » déplace les deux
   profils du même écart et s'arrête quand l'un atteint sa borne. La
   saturation des deux intensités passe par `parts`, comme aujourd'hui.
2. Il normalise : zéros et objets vides retirés.
3. À deux intensités sans `base`, `porteur` prend le porteur d'avant le
   geste tant que `reglages` existe, et disparaît avec lui.
4. S'il crée le premier réglage du porteur : `originale` prend la
   référence d'avant quand elle manque, et `depart` la référence rangée
   quand `originale` existait déjà et diffère d'elle.
5. Il récrit la référence : `referenceReglee(S, ...)` avec un réglage du
   porteur ; sans lui, `S` redevient la référence, `depart` se retire, et
   `originale` aussi quand la référence l'égale.
6. `ajusterPartsGrises` suit, comme pour un code saisi.

« Ajuster la référence » (réponse R1) propose `clarte[P]` par pas de 0,01,
de −5 à +2 pas ; la modale s'ouvre au pas le plus proche de la clarté
rangée, et « Appliquer » passe par le geste de luminosité. Le ◆ ne change
plus de nuance : la ligne des nuances ne dit plus que la nuance visée.

« Revenir à l'originale » pose `reference = originale`, retire `originale`,
`depart` et les réglages du porteur, et garde ceux de l'autre profil, dont
la teinte se mesure depuis le même départ. La dérive Tailwind se recalcule
sur l'originale, comme en version 4.

Un code saisi (`changerReference`) retire `originale` et tout `reglages` : le
designer repart d'une couleur neuve.

`choisirLaBase` : un profil pose `base` et retire `reglages.porteur`, puis
récrit la référence avec les réglages du nouveau porteur ; l'interface
l'annonce avant d'agir. « Auto » retire `base` et, s'il reste des réglages,
fige le porteur d'avant : aucune couleur ne change.

Passer de deux intensités à une range les réglages du porteur sous `vivid`,
retire ceux de l'autre et `porteur`, garde `depart` et la dérive du
porteur : la référence ne change pas. Passer d'une à deux retire `part`,
récrit la référence sans elle, classe le porteur sur la nouvelle référence
et range sous lui les réglages. `passerEnLibre` passe d'abord à deux
intensités ; `revenirAuModele` replie comme un passage à une.

### La recette 5

`FORMAT_RECETTE` passe à 5. La migration de 4 à 5 ne change que
`formatVersion` : aucune palette ne reçoit `reglages`, et une recette 4
garde ses couleurs à l'octet. Règles nouvelles de `[REC-05]` :
`reglages-bornes`, `reglage-nul`, `reglages-intensites` (une clé qui ne
convient pas au nombre d'intensités), `porteur-base`, `porteur-manquant`,
`reglages-sans-originale`, `depart-sans-reglage` et `depart-identique`.

L'import compte `reglages` parmi les champs nommés d'un écart, et parmi
ceux qui changent les couleurs ; le rapport le porte, au format 3.

### Vecteurs et propriétés

- Une recette 4 migrée égale la recette lue, au JSON près de
  `formatVersion`, et ses rampes égalent celles d'avant à l'octet.
- Sans réglage, `rampesDe` rend les octets d'aujourd'hui (vecteurs figés).
- Pour tout réglage, à la clarté `S.L`, la teinte de chaque profil vaut
  celle de son pivot (propriété sur tirages).
- La teinte d'un cran d'un profil décalé en clarté égale celle du même
  profil sans décalage.
- Une référence proche du milieu de 500 et 600, décalée de +0,02 : le ◆
  reste au même rang, et un ancrage lu sur la clarté des octets le ferait
  changer.
- Un aller-retour de teinte de ±10° rend la référence d'avant à l'octet.
- `[MOT-13]` tenu, remesuré par `mesurer-temps.mjs`.

### Revue de la spécification

Retenu de la seconde revue : une teinte par profil au lieu d'une rotation
et d'un écart ; pivot et ancrage sur le départ ; l'invariant de la
référence tenu par les gestes et les propriétés, non par la validation ;
`part` à 0 permis ; aucun `porteur` sans autre réglage ni avec `base` ;
`ajusterPartsGrises` après chaque récriture ; un code saisi retire tout
`reglages` ; le préréglage Tailwind sur le départ ; l'import, le rapport,
le graphe de la dérive et l'alerte « hors de la rampe » suivent ; le
vecteur du ◆ pris près d'une frontière de nuances. Écarté : garder `part` à
deux intensités, qui ferait deux saturations de la référence.
