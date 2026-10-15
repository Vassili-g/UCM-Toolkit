# La clarté selon la teinte

Ce document décrit une piste à l'essai : régler la clarté des tons clairs de
chaque palette d'après sa teinte, comme Tailwind. Il donne le mécanisme, les
mesures et les effets de bord sur le moteur et sur le plugin. Rien n'est décidé
ni implémenté. La [maquette](./Maquettes/MAQUETTE-MOTEUR.html) l'active par le
réglage « Clarté selon la teinte » de sa barre du haut.

## Le constat

Le mainteneur a jugé les 17 familles de Tailwind contre notre moteur : 57
« Moteur OK » sur 68. Les « Tailwind mieux » portent surtout sur les fonds de
Vivid en Light : rouges, roses et indigos trop pâles, jaunes, ambres, limes et
verts ternes, jaune « verdâtre ».

La chroma de ces fonds est proche de celle de Tailwind ; leur clarté ne l'est
pas. Tailwind place le cran 100 de ses jaunes, ambres, limes et verts de 0,01
à 0,02 au-dessus de la médiane de ses rampes, et celui de ses rouges, roses,
bleus et indigos d'autant en dessous. Notre courbe commune met tous les crans
100 à 0,95. Un jaune trop foncé paraît olive. Un rouge ou un indigo trop clair
n'a presque plus de chroma possible près du blanc, et paraît délavé.

## Le mécanisme

Le préréglage Tailwind lit déjà la dérive de teinte sur les deux rampes de
Tailwind voisines de la référence ([MOT-36], `prereglageTailwind`). Il y lit
aussi la dérive de clarté :

1. Pour chaque rampe du relevé `derives` de la recette, l'écart de clarté de
   chaque cran à la médiane des dix-sept rampes. Le relevé porte déjà la
   clarté de chaque cran (format 11) : aucune donnée nouvelle.
2. Les deux rampes voisines de la teinte de la référence, lues à sa clarté,
   prêtent leurs écarts, interpolés selon sa position angulaire.
3. Le Color shift de luminosité ([MOT-30]) porte le résultat, au bout clair :
   l'écart du cran 100 divisé par son poids vers le bout, borné à ±0,03, rangé
   au millième, et réduit si l'ordre des nuances l'exige ([DER-19]). Le cran
   200, essayé aussi, poussait l'indigo trop loin.
4. Le bout sombre reste à zéro. Une référence sans teinte, ou un gris pur, n'a
   pas de dérive de clarté.
5. Deux variantes pour la chroma. « La chroma suit » : le moteur tel qu'il est,
   où la borne de l'enveloppe se lit à la clarté décalée. « Chroma gardée » :
   la borne se lit à la clarté d'avant ce décalage, seul le plafond de l'écran
   suit la nouvelle clarté.

## Pourquoi garder la chroma

Assombrir un ton clair lui laisse plus de chroma. L'éclaircir lui en retire,
parce que la borne de l'enveloppe vers le blanc, `a × (1 − L)`, rétrécit avec
la clarté. Avec « la chroma suit », le jaune 100 tombe de 0,078 à 0,045 de
chroma, quand celui de Tailwind en a 0,069 à la même clarté. Le jaune, la lime
et le vert s'éclaircissent alors en blanchissant ; c'est le « trop clair » que
le mainteneur a relevé. Le rouge, le bleu et l'indigo, assombris, gagnent de la
chroma dans les deux variantes.

Le code de référence est `clarteSelonLaTeinte` et `avecClarteSelonLaTeinte`,
dans [mesurer-troisieme-passe.ts](./Mesures/mesurer-troisieme-passe.ts) ; ses
mesures sont dans `Mesures/MESURES-CLARTE-TEINTE.json`.

## Les mesures

| Cran 100, Vivid Light | Bout clair | Clarté sans → avec (Tailwind) | Chroma sans → suit / gardée (Tailwind) |
|---|---|---|---|
| Jaune | +0,025 | 0,951 → 0,971 (0,973) | 0,078 → 0,045 / 0,066 (0,069) |
| Lime | +0,018 | 0,949 → 0,967 (0,967) | 0,056 → 0,039 / 0,057 (0,066) |
| Ambre | +0,012 | 0,950 → 0,961 (0,962) | 0,069 → 0,055 / 0,055 (0,058) |
| Vert | +0,012 | 0,951 → 0,961 (0,962) | 0,052 → 0,041 / 0,052 (0,043) |
| Rose | −0,011 | 0,949 → 0,941 (0,941) | 0,024 → 0,029 (0,030) |
| Rouge | −0,017 | 0,951 → 0,935 (0,936) | 0,023 → 0,031 (0,031) |
| Bleu | −0,021 | 0,951 → 0,931 (0,932) | 0,022 → 0,031 (0,032) |
| Indigo | −0,023 | 0,950 → 0,930 (0,930) | 0,022 → 0,032 (0,033) |
| Orange, émeraude, teal, sky, fuchsia | 0 à ±0,005 | inchangés | |

- **Garanties** : aucune promesse perdue, chroma suivie ou gardée, comparées
  une à une, sur Tailwind 500, les trois tours de teinte, les références
  saturées, la recette du mainteneur, la galerie et le balayage de 72 teintes
  (144 promesses manquées, comme sans la dérive).
- **Ordre des nuances** : il tient sur tous les jeux. Les deux palettes
  témoins de la galerie, Vert et Feuille, le rompaient déjà sans la dérive.
- **Crans de même numéro** : deux palettes n'ont plus la même clarté au même
  cran. Écart maximal entre les 17 familles, hors cran de la référence : 0,048
  au 50, 0,043 au 100, 0,034 au 200, 0,022 au 300, 0,011 au 400, 0,005 au 500,
  zéro à partir du 600. Il est nul aujourd'hui.
- **Bout sombre écarté** : éclaircir les tons foncés des jaunes et des verts,
  comme Tailwind (+0,05 aux crans 700 et 800), fait passer le texte blanc de
  leur plein Dark en sens inversé sous 4,5 (jaune 4,97 → 4,46). Le balayage
  passe alors de 144 à 157 promesses manquées. Le texte jaune et ambre du Light
  reste donc plus foncé que celui de Tailwind (L 0,42 contre 0,47).

## Effets de bord sur le moteur (`packages/couleur`)

| Endroit | Effet | À faire |
|---|---|---|
| `tailwind.ts`, `prereglageTailwind` | Il rend une dérive de teinte seule. | Rendre aussi `clarte: { clair, sombre: 0 }`, lue sur le même relevé ([MOT-36]). |
| Relevé `derives` de la recette | Il porte déjà la clarté de chaque cran. | Aucun changement de format. |
| `rampe.ts`, `clarteDuCran` | Il lit déjà `derive.clarte` ([MOT-30]). | Aucun. |
| `rampe.ts`, `cranVise` (chroma gardée) | La borne de l'enveloppe se lit aujourd'hui à la clarté fabriquée, décalages compris. | Lui passer la clarté d'avant la dérive de clarté du préréglage. Deux choix : toute la luminosité du Color shift garde la chroma, et un geste du designer change alors de comportement ; ou seule la part du préréglage la garde, et la recette doit la ranger à part de celle du designer. |
| Thème Dark | Le Color shift agit selon la clarté, dans les deux thèmes : en Dark, les crans clairs sont les textes 900 et 950. Au cran 950, le texte Dark du jaune et de la lime s'éclaircit (0,929 → 0,953), celui du rouge et de l'indigo s'assombrit (0,930 → 0,903 à 0,913). | Mesuré : aucune promesse perdue. |
| `palette.ts`, `ancrageDe` | La dérive vaut zéro au pivot : le cran de la référence et ses octets ne bougent pas ([MOT-17]). | Aucun. |
| `limites.ts`, `ordreTenu`, `limiteDynamique` | Les bornes du Color shift de luminosité partent désormais de la valeur du préréglage, non de zéro. Une valeur qui romprait l'ordre doit être réduite avant d'être rangée. | Borner le préréglage par `ordreTenu`, comme le fait le banc. |
| `reconstruction.ts`, `nommerLesDerives` (l. 905) et l'estimation (l. 827, 1009) | La reprise d'un fichier ne nomme une dérive `tailwind` que si elle n'a ni saturation ni luminosité. Une palette reprise avec la clarté du préréglage serait nommée `libre`. | Comparer aussi la luminosité au préréglage ; rejouer les cas de reconstruction. |
| `recette.ts`, champ `origine` | `origine` « ne mesure que la teinte » ([REC-12]). | Décider si `tailwind` couvre aussi la luminosité, ou ajouter une origine propre à la luminosité. |
| `garantie.ts`, garantie des courbes | Elle fabrique des crans sans Color shift : son verdict ignore déjà toute dérive. | Aucun ; à rappeler dans sa documentation. |
| `harmonisation.ts`, course, comparaison, zones | Elles lisent les rampes réelles : elles voient la nouvelle clarté. | Aucun. |
| `alertes.ts`, `palettes-proches` | Elle compare le plein Light et Dark et le texte Light, sur des crans que le bout clair ne touche presque pas. | Aucun : 13 paires sur Tailwind 500 et 8 sur la galerie, avec ou sans la dérive. |

## Effets de bord sur le plugin (`packages/plugin-palettes`)

| Endroit | Effet | À faire |
|---|---|---|
| `edition.ts`, `poserReference` (l. 60) | Quand la référence change, une dérive d'origine `tailwind` suit le nouveau préréglage de teinte. | Suivre aussi la luminosité du préréglage. |
| `presentation.ts`, `grandeursModifieesDuColorShift` et `departDuColorShift` ([DER-25]) | La marque « par défaut » et le résumé « Modifié » comparent la luminosité à son départ. | Le départ de la luminosité devient la valeur du préréglage, plus zéro. |
| Création, carte du Color shift | La réglette de luminosité n'est plus à zéro par défaut. « Par défaut » et « Tout par défaut » la ramènent au préréglage. | Textes et tests des réglettes. |
| Onglet Harmonisation, constat de luminosité (`harmonisation.ts`, l. 247) | Il lit le réglage de la carte (`reglages.clarte`), pas le Color shift. | Aucun : le préréglage ne le déclenche pas. |
| Onglet Harmonisation, comparaison | Deux palettes cochées n'ont plus la même clarté au même cran, jusqu'à 0,048 sur les crans clairs. | Le dire si la comparaison l'annonce comme un écart. |
| Recettes déjà rangées | Une palette garde la dérive rangée ; le préréglage ne s'applique qu'à la création, au changement de référence ou par « Par défaut ». | Décider d'une migration ou d'une adoption volontaire, comme pour les profils (Q3). |
| Palettes figées et libres | Elles ne calculent rien. | Aucun. |
| Palettes grises, palettes à une intensité, dérive non liée | Une palette grise n'a pas de préréglage. L'intensité unique lit la dérive de Vivid. Une luminosité réglée par le designer reste la sienne. | Aucun. |
| Planche, variables | Les couleurs changent : une planche existante devient périmée, les variables sont réécrites. | Aucun mécanisme nouveau. |
| Explorateur, `ucm check` | Ils lisent les valeurs exportées. | Aucun. |

## Les tests et la documentation

- **Tests à valeurs figées.** Les hexadécimaux attendus changent : ceux du
  préréglage Tailwind, de l'enveloppe et de la recette par défaut dans
  `packages/couleur/tests`. Il en va de même pour les tests du Color shift et
  de [DER-25] dans `packages/plugin-palettes/tests`.
- **Galerie.** Les décomptes de promesses de la galerie ne changent pas
  (mesuré).
- **Spécification.** Mettre à jour [MOT-36] (le préréglage lit la clarté),
  [MOT-30], [DER-25] (le départ de la luminosité), [REC-12] (l'origine) et Q10
  dans [DECISIONS.md](../Recette%20CRITIQUE%20de%20qualit%C3%A9/DECISIONS.md).

## Ce qui reste ouvert

- **Le texte des jaunes et des ambres** reste plus foncé que celui de
  Tailwind. Le corriger demande d'éclaircir leur plein, ce que le texte blanc en
  Dark interdit.
- **Le choix entre « la chroma suit » et « chroma gardée »**, au jugement à
  l'œil dans la maquette. La seconde rapproche le jaune, la lime et le vert de
  Tailwind ; elle change le moteur un peu plus.
- **La comparaison en Dark** prend la nuance de Tailwind de clarté la plus
  proche de notre courbe, faute de thème Dark chez Tailwind. Le « vert trop
  foncé » en Dark vient en partie de cet appariement : la nuance retenue est
  le 900 de Tailwind, à L 0,39, contre 0,33 pour notre fond 300.
- **Le relevé est celui de Tailwind 3.4.** Un autre relevé dans la recette
  donnerait une autre organisation des clartés.
