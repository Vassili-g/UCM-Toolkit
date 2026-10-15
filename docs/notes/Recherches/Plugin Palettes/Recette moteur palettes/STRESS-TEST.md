# Le moteur retenu : repasse et test de charge

Ce document rassemble les règles du moteur que le mainteneur a retenues, revoit
la façon dont elles agissent ensemble, liste ce qui peut casser et rend compte
d'un test de charge sur l'ensemble. Toutes les règles sont décidées ;
[PLAN-IMPLEMENTATION.md](./PLAN-IMPLEMENTATION.md) les porte dans le paquet.

## Les règles

| Règle | Valeur | Ce qu'elle change | État |
|---|---|---|---|
| Règle de Soft | celle d'aujourd'hui | Soft garde son enveloppe ; ses textes et ses pleins restent proches de ceux de Vivid | Validée à l'œil |
| Tons clairs de Soft, Light | × 0,7 | Les fonds Light de Soft (clarté au-dessus de 0,78, en entier au-dessus de 0,88) se calment | Validée à l'œil |
| Fonds de Soft, Dark | `profils.soft.enveloppe.dark.b` = 0,15 | Les tons foncés et moyens de Soft en Dark se calment ; Soft n'y dépasse plus Vivid | Validée à l'œil |
| Porteur de la référence | Vivid, toujours | Vivid garde la couleur exacte ; Soft en est une version plus calme, même sous une couleur terne | Décidée sur la [démo du porteur](./Maquettes/DEMO-PORTEUR.html) |
| Courbe de teinte de Vivid | marge des jaunes 0,5, retenue −0,2 à 195° (écart type 30°) | Calme les teal et cyan clairs de Vivid en Light | Validée à l'œil |
| Bosse autour de la référence | σ 0,10, gardée, hors fonds sauf autour d'une référence que Vivid pose dans les fonds | Les voisines de la référence la rejoignent, sans perdre de promesse | Validée à l'œil ; l'exception des fonds est décidée |
| Clarté selon la teinte | bout clair, cran 100, ±0,03, chroma gardée, gardée | Les tons clairs suivent la clarté de Tailwind selon la teinte, sans faire perdre de promesse | Validée à l'œil ; la garde est décidée |
| Alerte « Soft et Vivid se confondent » | les fonds seuls | Ne juge plus les pleins et les textes, que Soft et Vivid partagent | Décidée, avec sa définition |

Le détail et les mesures de chaque règle sont dans le [README](./README.md),
[CLARTE-SELON-LA-TEINTE.md](./CLARTE-SELON-LA-TEINTE.md), la
[maquette](./Maquettes/MAQUETTE-MOTEUR.html) et la
[démo du porteur](./Maquettes/DEMO-PORTEUR.html).

## Ce que la repasse a changé

### Vivid porte toujours la référence

Avec le seuil 0,78 proposé d'abord, une couleur un peu plus saturée pouvait
donner des palettes plus calmes : une référence de part 0,77 donnait Soft 0,77
et Vivid 0,86, sa voisine de part 0,79 donnait Soft 0,71 et Vivid 0,79. Le
mainteneur a retenu que Vivid porte toujours la référence :

- une couleur plus saturée donne toujours des palettes plus saturées, et la
  palette ne bascule plus quand le designer fait glisser sa saturation ; le
  plus grand saut entre deux références voisines passe de 0,165 à 0,036 ;
- une couleur terne donne un Vivid aussi terne qu'elle et un Soft environ 10 %
  plus calme ; le moteur n'invente pas de couleur ;
- les palettes d'un groupe ne s'harmonisent pas seules. Le designer les
  aligne avec l'onglet Comparer, « Référence exacte dans : Soft » et le
  curseur de saturation de Vivid ; la démo montre ces gestes.

La règle des « niveaux communs », où tous les Vivid montent à 0,95, a été
écartée : elle colore les gris (Ardoise, Sable) et ramène dans Soft les
couleurs de part 0,78 à 0,90, dont la couleur exacte ressortait de la rampe.

### La bosse rejoint les fonds autour d'une référence de fond

Le test de charge comptait 212 creux de chroma d'au moins 0,02 à côté de la
référence, presque tous en Dark, dans Vivid. Vivid porte désormais des
références foncées, qui tombent au cran 100 à 500 du Dark ; la bosse, tenue
hors de la zone des fonds, laissait leurs voisines calmes, et l'une d'elles
creusait la rampe. La bosse entre maintenant dans la zone des fonds à
proportion de la place qu'y tient la référence, pour Vivid et pour l'intensité
unique seulement : Soft garde ses fonds calmes, même quand le designer lui
confie la référence (sans cette limite, l'Indigo de la galerie, porté par Soft,
voyait ses fonds Dark passer de 0,05 à 0,12 de chroma).

Effet mesuré : les creux d'au moins 0,02 passent de 212 à 128, ceux de plus de
0,04 de 92 à 10, et ceux des références de clarté 0,30 à 0,50 disparaissent
dans Vivid. 24 promesses de plus sont tenues. Sur Tailwind 500 et la galerie,
les nuances changées gagnent au plus 0,01 de chroma, sauf le 500 Dark de
Marine (0,128 à 0,138).

### L'alerte sur les fonds

L'alerte d'aujourd'hui signale une palette quand Soft et Vivid se confondent
(écart sous 0,02) sur au moins trois nuances visées par les variables, hors des
fonds Dark atténués. Sur le moteur retenu, elle signalerait 13 des 14 palettes
Tailwind jugées, et 415 à 509 des 546 palettes du balayage :
`Mesures/mesurer-alerte-fonds.ts`.

| Nuance | Rôle | Écart Soft/Vivid médian, Tailwind | Sous 0,02, balayage |
|---|---|---|---|
| Light 100 | fond | 0,022 | 264 sur 546 |
| Light 200 | fond au survol | 0,046 | 98 |
| Light 300 | fond à l'appui | 0,065 | 38 |
| Dark 300 | fond | 0,030 | 177 |
| Dark 400 | fond au survol | 0,056 | 82 |
| Dark 500 | fond à l'appui | 0,064 à 0,069 | 36 à 59 |
| Light 700 à 900 | pleins et textes | 0,012 à 0,018 | 292 à 371 |

Définition proposée : l'alerte juge les fonds Light 200 et 300 et les fonds
Dark 300, 400 et 500, et signale une palette dont au moins trois de ces cinq
nuances se confondent. Le fond Light 100 n'y entre pas : l'écran ne laisse
presque pas de place entre deux couleurs aussi pâles, et il se confond sur la
moitié des palettes. Les fonds Dark y entrent : la borne de Soft à 0,15 les
sépare désormais, l'exemption des fonds atténués n'a plus lieu d'être. Les
palettes ternes restent sans alerte, comme aujourd'hui.

| Jeu | Palettes jugées | Signalées |
|---|---|---|
| Tailwind 500 | 14 | 0 ou 1 selon le texte des boutons |
| Galerie | 12 | 0 ou 1 |
| Balayage | 546 | 29 à 50 |

Le repère ≈ de l'aperçu et de la planche (`confusionsDe`) suit la même
définition, sinon il marque les pleins et les textes de presque toutes les
palettes.

## Comment les règles agissent ensemble

| Rencontre | Ce qui se passe | Verdict |
|---|---|---|
| Vivid porteur et règle de Soft | Pour une part de 0,85 à 0,90, Soft (0,85) et Vivid ont presque la même part : leurs pleins et leurs textes se ressemblent, leurs fonds se séparent par les tons clairs × 0,7 et la borne Dark 0,15 | Voulu : Soft se distingue par ses fonds |
| Vivid porteur et couleur terne | Sous la part 0,85, Soft garde le rapport des parts communes (environ −10 %) ; à 0,85, il passe d'un coup à 0,85 | Saut de part mesuré dans S4 : au plus 0,018 d'écart de couleur sur le balayage de saturation |
| Vivid porteur et bosse | Une référence terne est rarement plus vive que sa rampe : la bosse ne s'y active pas. Une référence foncée tombe dans les fonds Dark : la bosse les rejoint | Réglé par l'exception des fonds |
| Bosse et tons clairs de Soft | La bosse ne touche que le profil porteur, Vivid ; les tons clairs ne baissent que dans Soft | Sans rencontre |
| Bosse et clarté selon la teinte | La bosse lit la clarté de la rampe après la dérive ; la clarté garde sa chroma | Mesuré ensemble, sans promesse perdue |
| Clarté selon la teinte et tons clairs de Soft | Le cran 100 s'éclaircit au plus de 0,03 ; × 0,7 s'applique ensuite à la chroma | Mesuré ensemble dans la maquette |
| Courbe de teinte et Soft | La courbe ne change que l'enveloppe Light de Vivid et de l'intensité unique ; Soft garde la sienne | Validé à l'œil |
| Borne Dark de Soft et texte des boutons | Avec le texte blanc en Dark, le plein de Soft (700) se calme aussi | Validé à l'œil ; aucune promesse perdue |
| Alerte et palettes ternes | Les palettes de part sous 0,85 restent sans alerte, comme aujourd'hui | À garder |
| Réglages du designer | Une saturation, un porteur ou des parts réglés passent avant la règle ; le Color shift et les limites suivent | C6 et C9 les comptent à part |

## Les problèmes possibles

### Ce que le test de charge vérifie

| N° | Risque | Contrôle |
|---|---|---|
| C0 | Le calcul échoue sur une référence ou un réglage | Aucune exception |
| C1 | Des octets invalides, ou deux calculs différents | Hexa valides, L et C finis, deux calculs identiques |
| C2 | L'ordre des clartés se rompt ([DER-19]) | Clarté décroissante en Light, croissante en Dark |
| C3 | La référence perd ses octets exacts ([MOT-17]) | Hexa de la référence au cran de l'ancrage, dans le profil porteur |
| C4 | Une palette figée change | Ses couleurs restent les siennes |
| C5 | Un creux de chroma dans une rampe | Aucune nuance sous 0,9 fois la moins vive de ses voisines |
| C6 | Soft plus vif que Vivid | Chroma de Soft au plus 1,02 fois celle de Vivid, hors cran de la référence |
| C7 | Un saut de teinte | Moins de 25° entre deux nuances voisines colorées |
| C8 | Une référence grise donne une rampe colorée | Rampes sans teinte pour une référence sans teinte |
| C9 | Une garantie de contraste perdue | Promesses comparées une à une au moteur d'aujourd'hui |
| C10 | La clarté du préréglage déborde, ou écrase celle du designer | Au plus ±0,03 ; une luminosité réglée par le designer reste |
| C11 | Le fond teinté Dark se confond avec la carte (Q5) | Contraste du fond 300 contre la carte au moins 1,1 |
| S4 | Deux références voisines donnent deux palettes éloignées | Plus grand écart (ΔEok) entre les palettes de deux références voisines |

### Ce qui se vérifie à l'implémentation, dans le plugin

| Risque | À vérifier |
|---|---|
| Le porteur | `profilAutomatique` rend toujours Vivid : la règle, `partsDesProfils` et `profilPorteur` se simplifient. Dans la carte « Deux intensités », « Auto » vaut toujours Vivid ; ses textes (« Auto a choisi… ») sont à revoir |
| Les recettes existantes | Toute palette de part sous 0,90 sans porteur réglé voit sa couleur exacte passer de Soft à Vivid : variables, marque ◆, aperçu, planche. Migration, ou adoption volontaire par « Par défaut » (comme Q3) |
| L'alerte et le repère ≈ | La définition sur les fonds, pour `profilsConfondus` et `confusionsDe` ; leurs textes et leurs tests |
| Le format de la recette | Ranger les tons clairs de Soft (0,7), la courbe de teinte, la bosse et son exception ; lire les recettes rangées ; mettre à jour la validation et les valeurs par défaut |
| Le préréglage de clarté | `prereglageTailwind` rend la luminosité ; le champ `origine` ; la reprise d'un fichier (`reconstruction.ts`) ; la marque « par défaut » ([DER-25]) ; `poserReference` ([CLARTE-SELON-LA-TEINTE.md](./CLARTE-SELON-LA-TEINTE.md)) |
| La chroma gardée | `cranVise` lit la clarté d'avant la dérive du préréglage ; décider si toute la luminosité du Color shift garde la chroma, ou seule la part du préréglage |
| Les limites du Color shift | Elles partent de la valeur du préréglage ; la garde de la clarté et celle de la bosse doivent tourner aussi dans les limites calculées |
| L'onglet Comparer | Les constats de saturation lisent les parts : avec Vivid porteur, la part de Vivid est celle de la référence. Crans de même numéro de clartés différentes (jusqu'à 0,048) |
| Les tests à valeurs figées | Ceux du préréglage, de l'enveloppe, du porteur, de l'alerte, de la recette par défaut et du Color shift changent de valeurs |
| La performance | La bosse et la clarté gardées rejugent les promesses : environ 2 ms par palette, 3,5 ms avec la garde de la clarté, mesuré dans le banc |
| La spécification | [MOT-17], [MOT-30], [MOT-35], [MOT-36], [ENT-09], [ENT-11], [DER-25], [VER-11], [PLA-15], [REC-12], DECISIONS Q1, Q2 et Q10 |

## Le test de charge

`Mesures/stresser-moteur.ts` compile en mémoire la chaîne de
`mesurer-troisieme-passe.ts` et calcule chaque situation deux fois : avec le
moteur d'aujourd'hui et avec le moteur retenu. Résultats :
`Mesures/STRESS-TEST.json`. Les variables `SEUIL=0.78`, `CLARTE_GARDEE=0` et
`BOSSE_FONDS=0` rejouent les étapes écartées.

### Les situations (7 237 palettes)

- **S1, le balayage** : 2 002 références distinctes, teinte tous les 5°,
  clarté de 0,12 à 0,95, chroma 0,03, 0,08, 0,15 et au plafond de l'écran ;
  texte des boutons blanc dans les deux thèmes, puis blanc en Light et noir en
  Dark.
- **S2, les extrêmes** : 25 références (noir, blanc, gris, primaires du sRGB,
  bleu électrique, très sombres, très claires, fonds de page) × 16 réglages
  du designer, × les quatre combinaisons du texte des boutons, sur les grilles
  de 11 et de 13 nuances. Les réglages : préréglage Tailwind, dérive
  constante, dérive non liée, parts (0,9/0,95, 0/1, 0,2/0,3), saturation
  réglée (0,3 et 1), luminosité réglée (±0,08), Color shift de saturation
  (−1/+1) et de luminosité (±0,15), référence forcée dans Soft ou dans Vivid,
  une intensité.
- **S3** : listes libres, palettes figées, recette du mainteneur, galerie du
  plugin.
- **S4, la continuité** : saturation de 0,60 à 0,99 par pas de 0,005 sur
  quatre teintes ; teinte de 0 à 359° par pas de 1° à quatre couples de
  clarté et de chroma ; clarté de 0,15 à 0,95 par pas de 0,005 sur deux
  teintes.

### Les résultats

Écarts du moteur retenu que le moteur d'aujourd'hui n'a pas :

| Contrôle | Cas | Écarts nouveaux | Déjà présents aujourd'hui |
|---|---|---|---|
| C0 calcul | 7 237 | 0 | 0 |
| C1 octets valides, calcul déterministe | 7 237 | 0 | 0 |
| C2 ordre des clartés | 28 530 rampes | 0 | 128 |
| C3 référence exacte | 7 234 | 0 | 0 |
| C4 palette figée | 3 | 0 | 0 |
| C5 creux de chroma | 28 530 rampes | 680 | 1 374 |
| C6 Soft plus vif que Vivid | 12 852 | 548 | 2 127 |
| C7 saut de teinte | 28 530 rampes | 0 | 0 |
| C8 référence grise | 2 352 | 0 | 528 |
| C9 promesses | 7 234 palettes | 380 perdues, 406 gagnées | |
| C10 clarté du préréglage | 6 578 | 0 | |
| C11 fond Dark contre la carte | 14 265 | 0 | 552 |

| Continuité (S4) | Aujourd'hui | Moteur retenu |
|---|---|---|
| Saturation de 0,60 à 0,99, quatre teintes | 0,075 à 0,12 | 0,008 à 0,018 |
| Teinte de 0 à 359°, quatre couples | 0,042 à 0,076 | 0,019 à 0,036 |
| Clarté de 0,15 à 0,95, deux teintes | 0,085 | 0,085 à 0,087 |

### Ce que disent les écarts

- **C9, les promesses.** 336 des 380 promesses perdues suivent la référence
  qui passe de Soft à Vivid : la même promesse manque désormais dans Vivid au
  lieu de Soft, et 406 sont gagnées. Les 44 autres viennent de réglages du
  designer poussés à leurs bornes (Color shift de luminosité ±0,15,
  luminosité réglée +0,08) et d'une palette de la galerie.
- **C5, les creux.** 672 des 680 sont à côté de la référence ; 552 font moins
  de 0,02 de chroma, ce qui ne se voit pas. Des 128 creux d'au moins 0,02, 120
  bordent une référence presque noire (clarté sous 0,30) en Dark, où la chroma
  se voit à peine ; les 8 autres sont dans Soft, quand le designer lui confie
  une référence foncée.
- **C6, Soft plus vif que Vivid.** Les 548 cas viennent tous de réglages du
  designer qui traitent un profil seul (luminosité réglée du porteur,
  référence forcée dans Soft, saturation réglée à 1). Sur les palettes par
  défaut, Soft ne dépasse jamais Vivid ; aujourd'hui, il le dépasse dans
  2 127 cas.
- **C8, les références grises.** Une référence grise ne donne une rampe
  colorée qu'avec des parts ou une saturation réglées par le designer, comme
  aujourd'hui (528 cas). La teinte d'un gris étant indéfinie, cette rampe prend
  une teinte arbitraire : un défaut du moteur actuel, à traiter à part.
- **S4, la continuité.** Avec Vivid toujours porteur, il n'y a plus de seuil :
  deux références voisines donnent deux palettes voisines, trois à dix fois
  mieux qu'aujourd'hui sur la saturation. Selon la clarté, le saut reste celui
  d'aujourd'hui : la référence change de cran d'ancrage.

## Les décisions

1. **La bosse entre dans les fonds** autour d'une référence que Vivid ou
   l'intensité unique y pose ; jamais dans Soft.
2. **L'alerte** juge les fonds Light 200 et 300 et les fonds Dark 300 à 500, et
   signale une palette dont trois de ces cinq nuances se confondent ; le
   repère ≈ suit la même définition.
3. **Les recettes existantes sont converties** : à la lecture, une recette
   prend les nouvelles règles, et sa couleur exacte passe dans Vivid quand le
   designer n'a pas choisi le profil.
4. **Hors du moteur retenu**, comme défauts d'aujourd'hui à traiter à part :
   les références grises avec des parts réglées, et les 128 ruptures d'ordre
   déjà présentes sous des réglages extrêmes.

À l'implémentation, le paquet doit rendre, situation par situation, les octets
que le moteur retenu rend ici : `ORACLE=verifier npx tsx stresser-moteur.ts`
les compare à `Mesures/ORACLE-PORTAGE.json`, rangé avant l'implémentation.
