# UCM Palettes : palettes désaturées et grises

## Résultat attendu

La couleur de référence se fond dans sa rampe : le profil qui la porte prend
sa saturation, qu’elle soit terne ou vive, et les garanties de contraste
restent tenues. Une référence peu saturée donne une palette peu saturée :
Vivid reste plus vif que Soft, dans le rapport des intensités communes, sans
devenir une couleur franche. Une couleur n’est un gris pur que si R, G et B
ne diffèrent pas de plus d’une unité ; sinon sa teinte est gardée, et un
presque noir teinté ne donne plus de rampe vive. La dérive de teinte et la teinte de la carte « Teinte,
saturation, luminosité » restent réglables tant qu’une nuance de la palette a
une couleur. Elles ne se désactivent que pour un gris neutre, dont toutes les
nuances sont grises : les deux profils sont alors identiques. Un geste de la
carte ne verrouille jamais une teinte qui reste appliquée. Le message
« presque gris » disparaît de la liste des points à vérifier. Une référence
plus claire ou plus sombre que toutes les nuances ne produit plus de point à
vérifier qui contredit l’éditeur de dérive.

Ce plan est destiné à l’agent qui réalisera les changements. Il s’articule
avec le [lot Z10 du sixième plan](../2 Ergonomie/PLAN-ERGONOMIE-PALETTES-V6.md#lot-z10--refonte-des-intensités),
dont le moteur (Z10.5) s’écrit dans une autre session. Le mainteneur fait
lui-même la recette dans Figma. Les exemples des questions Q1 à Q5 sont dans
[MAQUETTES-PALETTES-DESATUREES.html](./MAQUETTES-PALETTES-DESATUREES.html).

## Autorités

1. le [signalement du mainteneur](#signalement-du-mainteneur), conservé
   sans modification ;
2. les [réponses aux questions](#questions-au-mainteneur) et les [retours sur
   la maquette](#retours-du-mainteneur-maquette-des-palettes-désaturées),
   conservés sans modification ;
3. la [spécification](../1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md), en particulier
   `[MOT-17]`, `[MOT-18]`, `[ENT-09]`, `[ENT-11]`, `[DER-14]`, `[DER-15]`,
   `[VER-10]` et la table 11.3 ;
4. la [recherche sur les intensités](../2 Ergonomie/RECHERCHE-REFONTE-INTENSITES.md) et
   le [sixième plan](../2 Ergonomie/PLAN-ERGONOMIE-PALETTES-V6.md) ;
5. [AGENTS.md](../../../../../AGENTS.md) et
   [CONTRIBUTING.md](../../../../../CONTRIBUTING.md).

## Audit

Relevé dans le code au commit `98521f2`, recette par défaut (parts communes
Soft 0,45 et Vivid 0,95, seuil de gris 0,03, onze nuances). Revu au commit
`5752952`, sur le moteur de Z10.5 que l’arbre partagé porte sans commit :
sans réglage, il rend les mêmes octets pour `#897288`, `#7C717B` et
`#060605`. Les couleurs par défaut ne changent donc pas. La carte « Teinte,
saturation, luminosité » change en revanche ce que le designer peut faire de
C1, C3 et C6 : C7 le mesure, par les gestes de `edition.ts` appelés tels
quels. Les mesures viennent du moteur (`packages/couleur/src`).
[generer-maquettes-palettes-desaturees.mjs](./generer-maquettes-palettes-desaturees.mjs)
refait celles de C2 à C6.

### C1. Soft ne prend pas l’intensité de la référence qu’il porte

En Auto, `partsDesProfils` (`palette.ts`) rend les parts **communes** dès
que la palette n’a ni parts propres ni base forcée. `profilAutomatique`
choisit le profil porteur dont la part commune est la plus proche de celle de
la référence, et `rampesDe` y colle les octets de la référence à son cran.
Les autres crans restent à la part commune.

| Référence | Chroma | Part | Porteur | Part de Soft | Soft autour du 600 |
|---|---|---|---|---|---|
| `#897288` | 0,043 | 0,160 | Soft, 600 | 0,45 | 500 `#C174C3` C 0,141 ; **600 `#897288` C 0,043** ; 700 `#834C80` C 0,103 |

La référence est trois fois moins saturée que ses deux voisines. C’est le cas
que le mainteneur signale. L’alerte `reference-plus-terne` le constate, mais
le réglage par défaut le produit. La base forcée (`[ENT-11]`) fait déjà ce
qui manque : le profil forcé prend la part de la référence. Le classement
automatique ne le fait pas.

### C2. Le seuil de 0,03 désactive une teinte fiable

`estPresqueGrise` compare la chroma de la référence à `seuils.chromaGrise`,
0,03 par défaut. Sous ce seuil, `prereglageTailwind` rend une dérive nulle,
`ajusterPartsGrises` pose des parts égales d’origine `grise`, et l’éditeur de
dérive se désactive (`[DER-15]`).

Mesure de la fiabilité de la teinte : pour une chroma visée, l’écart de
teinte entre une couleur à 8 bits et ses voisines à un octet près, sur
24 teintes et 4 clartés.

| Chroma | Écart médian | Écart maximal |
|---|---|---|
| 0,003 | 36° | 146° |
| 0,005 | 19° | 36° |
| 0,008 | 12° | 19° |
| 0,010 | 9° | 14° |
| 0,020 | 4° | 6° |
| 0,030 | 3° | 4° |

`#7C717B`, chroma 0,020, a une teinte connue à 6° près. La dérive totale du
relevé Tailwind atteint 50° selon la teinte. Le seuil actuel désactive donc la dérive sur des références
dont la teinte est mesurable. Sous 0,005, la teinte ne se lit plus : un octet
la déplace de plus de 20°.

### C3. Les parts grises rendent Soft et Vivid identiques

Sous le seuil, les deux profils prennent la part de la référence. Pour
`#7C717B`, Soft et Vivid valent 0,078 : la seule nuance qui diffère est le
600, où Soft porte la référence. Le mainteneur attend deux profils distincts
tant qu’une nuance a de la couleur.

La spécification justifie ces parts (`[MOT-18]`) : sans elles, `#6B7280`
produirait `#0E44F7` en `vivid.700`. La mesure le confirme : laisser Vivid à
0,95 donne `#1743F7` au 700, un bleu franc tiré d’un gris bleuté. La règle
de remplacement doit donc garder Vivid proche de la référence.

### C4. Trois règles candidates

Chaque ligne donne les nuances 100, 300, 500, 600, 700 et 900 en Light,
dérive Tailwind appliquée sauf pour la règle actuelle sous le seuil, et
l’écart ΔEok entre Soft et Vivid au 600. « Bornes » : le porteur prend la
part de la référence, l’autre profil garde sa part commune. « Proportion » :
sous la part commune de Soft, Soft prend la part de la référence et Vivid
garde le rapport des parts communes, 0,95 / 0,45.

| Référence | Règle | Soft, Vivid | Vivid 100 à 900 | ΔEok 600 |
|---|---|---|---|---|
| `#897288`, part 0,160 | actuelle | 0,45 ; 0,95 | `#FBE7FE` `#F6AFFD` `#E923F2` `#C41CC7` `#A0149E` `#5E0759` | 0,135 |
| | bornes | 0,160 ; 0,95 | idem | 0,213 |
| | proportion | 0,160 ; 0,338 | `#F3ECF4` `#DCC3DE` `#B77EB8` `#996898` `#7C5379` `#482E44` | 0,049 |
| `#7C717B`, part 0,078 | actuelle | 0,078 ; 0,078 | identique à Soft | 0 |
| | bornes | 0,078 ; 0,95 | `#FCE6FE` `#F7AEFD` `#EA23F0` `#C51BC5` `#A1149C` `#5F0758` | 0,236 |
| | proportion | 0,078 ; 0,165 | `#F1EDF1` `#D4C7D5` `#A78BA6` `#8B7389` `#705C6E` `#40333E` | 0,024 |
| `#6B7280`, part 0,094 | bornes | 0,094 ; 0,95 | `#E5EFFE` `#B0CEFD` `#5C91FA` `#356FF9` `#1743F7` `#130EA5` | 0,194 |
| | proportion | 0,094 ; 0,199 | `#ECEFF2` `#C6CDD6` `#8A96AB` `#6E7C97` `#546384` `#2E3750` | 0,023 |
| `#78716C`, part 0,088 | proportion | 0,088 ; 0,185 | `#F1EEE9` `#D6CABD` `#A39284` `#88786D` `#6E6057` `#3F3630` | 0,014 |
| `#7F7F80`, part 0,006 | proportion | 0,006 ; 0,014 | `#EEEEEF` `#CCCCCD` `#959597` `#7B7B7E` `#636365` `#383839` | 0,004 |

Avec Soft à la part de la référence, les nuances Soft de `#897288` deviennent
`#F1EDF1` `#D4C8D4` `#A68BA6` `#8A7389` `#6F5C6E` `#40333E` : la référence
s’y insère sans rupture.

« Bornes » produit un Vivid saturé depuis un gris, ce que `[MOT-18]` voulait
éviter. « Proportion » garde une palette désaturée et deux profils distincts.
Elle est continue avec la règle actuelle : à une part de 0,45, Vivid vaut
0,95 dans les deux règles. Une référence colorée au-dessus de 0,45 ne change
pas. Sur une palette désaturée, l’écart des profils passe sous le seuil de
« Profils confondus », 0,02, sur la plupart des nuances : 10 sur 11 pour
`#78716C`, 7 sur 11 pour `#7C717B`, et le moteur sonne. La dernière colonne
du tableau compare des rampes sans ancrage ; au 600, Soft porte la référence,
ce qui porte l’écart à 0,034. La question Q3 le traite.

### C5. La part s’amplifie aux clartés extrêmes

`partDeChroma` divise la chroma de la référence par le plafond à **sa**
clarté. Près du noir et du blanc, ce plafond est minuscule : la part d’un
presque noir est forte, puis elle s’applique à des clartés où le plafond est
grand.

| Référence | Clarté | Chroma | Part | Part à la clarté bornée | Soft 100 aujourd’hui |
|---|---|---|---|---|---|
| `#060605` | 0,121 | 0,003 | 0,120 | 0,054 | `#F0F0DE`, C 0,024 |
| `#FAFAF5` | 0,984 | 0,007 | 0,093 | 0,063 | `#F0EFE2` |

Un presque noir `#060605`, dont la teinte vient d’un octet de bleu en moins,
donne des nuances claires crème. Mesurer la part à la clarté bornée à
l’étendue de la liste (0,27 à 0,975) la ramène de 0,120 à 0,054. Sous la chroma de
0,005, la teinte n’a de toute façon pas de sens (C2).

### C6. Le message « hors de la rampe » contredit l’éditeur

Pour `#060605`, deux alertes sortent : `couleur-presque-grise`, placée sous
la carte de la couleur de base, et `reference-hors-rampe`, placée sous la
carte de la dérive parce que sa première cible est `derive`
(`ciblesDeLAlerte`, `carteDuMessage`). Cette zone est entre la carte de la
dérive et les garanties : l’emplacement est celui prévu. Le contenu est
faux :

- le message dit « Vous pouvez régler la teinte d’un seul côté » et « Utilisez
  le réglage encore disponible », alors que l’éditeur est désactivé pour
  cette référence presque grise ;
- pour une référence colorée hors de la rampe, l’éditeur affiche déjà la note
  `sansSegmentClair` ou `sansSegmentSombre` (`[DER-14]`,
  `ui/derive/editeur.ts`) : le point à vérifier la répète ;
- l’alerte juge sur l’étendue de la liste (`etendueDe`), la note sur les bouts
  de la dérive, aux numéros 50 et 950 (`boutsDe`). À treize nuances,
  l’étendue descend à 0,165 : une référence à 0,2 montre la note sans
  l’alerte ;
- le message décrit une limite de l’éditeur, pas un défaut de la palette. Ce
  qui touche la palette n’est pas dit : `#060605`, clarté 0,121, remplace le
  950 prévu à 0,27 en Light, et le 50 prévu à 0,18 en Dark, plus sombre que
  le fond `#121212`.

### C7. Ce que la recette V6 change

La [spécification du moteur de Z10.5](../2 Ergonomie/RECHERCHE-REFONTE-INTENSITES.md#spécification-du-moteur-z105)
ajoute `reglages` à une palette : une teinte et une clarté par profil, la
part de la référence à une intensité, le porteur figé, le départ. Relevé dans
cette spécification et dans le code en cours :

- **Aucune couleur par défaut ne change.** « Sans réglage, `rampesDe` rend
  les octets d’aujourd’hui » ; la mesure le confirme. C1 à C6 restent.
- **Le seuil désactive désormais deux contrôles.** La carte « Teinte,
  saturation, luminosité » (`ui/reglagesDeLaPalette.ts`) désactive sa piste
  de teinte pour une référence presque grise, comme l’éditeur de dérive. La
  [recherche](../2 Ergonomie/RECHERCHE-REFONTE-INTENSITES.md#réponses-aux-questions-du-plan)
  l’a décidé (« Gris : l’interface désactive la teinte »). La maquette Z10.4
  ne montrait aucune palette grise : le mainteneur n’a pas validé ce point.
- **C1 se répare à la main.** À deux intensités, la saturation d’un profil
  pose des parts du designer (`reglerSaturation`) sans déplacer la
  référence. Soft à 16 % sur `#897288` donne la rampe Soft de R1, et les
  alertes `profils-confondus` et `reference-plus-terne` se taisent. Vivid
  garde 0,95. Le défaut reste celui de C1 : R1 le corrige sans geste.
- **C3 se répare à moitié.** Sur `#7C717B`, Vivid à 16,5 % sépare les deux
  profils et donne les intensités de R1. La teinte, son « Rétablir » et
  l’éditeur de dérive restent verrouillés, et la dérive rangée reste 0° :
  Vivid n’a pas la dérive Tailwind que R1 lui donne. `profils-confondus`
  sonne (7 nuances sur 11 sous 0,02).
- **« Les deux » ne sépare pas des parts grises.** Le curseur déplace les deux
  parts du même écart : depuis 0,078 et 0,078, il donne 0,2 et 0,2, et
  `reference-plus-terne` s’ajoute. Il ne garde pas non plus un rapport entre
  les parts, celui de R1.
- **L’alerte « presque grise » devient fausse.** Elle dit que « les deux
  profils reprennent son intensité », alors que les parts du designer, 0,078
  et 0,165, ne sont plus égales. Le texte ne regarde pas `parts.origine`.
- **À une intensité, la saturation fait passer le seuil en plein geste.** La
  part de la référence (`reglages.part`) récrit ses octets. `#897288`
  tournée de +10°, puis descendue à 8 %, devient `#83767F`, chroma 0,021 :
  la piste de teinte, son « Rétablir » et l’éditeur de dérive se
  verrouillent. Les +10° et la dérive Tailwind, calculée sur le départ,
  restent pourtant appliqués. Le designer ne peut plus les voir ni les
  remettre à zéro, sauf à remonter la saturation. `[DER-15]` supposait
  qu’une teinte verrouillée ne se voyait pas.
- **Monter la saturation d’un gris neutre invente une teinte.** Sous le
  seuil, la piste de teinte est verrouillée, mais la saturation reste libre.
  Vivid à 30 % sur `#808080` donne une rampe rose : sa teinte vaut 0°, faute
  de chroma. `#7F7F80` donne du violet, `#060605` de l’olive : leur teinte
  tient à un octet. « Les deux » à 30 % laisse `#808080` gris au 600, au
  milieu d’une rampe Soft rose.
- **À deux intensités, le seuil ne se passe qu’au sélecteur de couleur.** La
  saturation n’y déplace pas la référence, et la teinte comme la clarté
  gardent sa chroma, sauf aux clartés extrêmes où `referenceReglee` la borne
  au plafond. Au sélecteur, Vivid saute de 0,95 à la part de la référence en
  passant 0,03. R1 n’a pas de seuil, donc pas de saut (maquette, Q1 bis).
- **L’alerte « hors de la rampe » lit le départ** (`departDe`) au lieu de la
  référence. La contradiction de C6 reste. « Ajuster la référence » devient
  le raccourci de la luminosité du porteur, bornée à +0,02 : il ne peut pas
  ramener `#060605` dans l’étendue, qui demande +0,15.
- **Le porteur peut être figé** (`reglages.porteur`), en plus de `base`. R1
  vise le porteur quel qu’il soit : Vivid figé sous 0,45 suit la règle de Vivid
  forcé.
- **Une palette à une intensité range sa part** (`reglages.part`), mesurée à
  la clarté de la référence par `referenceReglee`. R3 mesurerait la part de
  la rampe à la clarté bornée : les deux valeurs diffèrent pour une référence
  hors de l’étendue. La revue G0 tranche laquelle le curseur montre.
- **La version 5 de la recette** vient de Z10.5, qui ne touche ni aux parts
  `grise` ni au seuil. La spécification écarte les parts à deux intensités
  dans `reglages` : Q2 n’est donc pas traitée par Z10.5.

### C8. Mesures après les réponses Q1 à Q5

Faites par [generer-maquettes-palettes-desaturees.mjs](./generer-maquettes-palettes-desaturees.mjs),
au commit `d357774`, moteur de Z10.5 à Z10.8 commité.

**Q2, le porteur à la saturation de la référence.** Sur 240 références entre
0,45 et 0,95 (12 teintes, 4 clartés, 5 saturations) : garanties manquées,
0 avant et 0 après. L’écart entre la référence et la nuance que le calcul
aurait mise à sa place tombe de 0,089 à 0,041 ΔEok au pire. En contrepartie,
les deux rampes changent d’un coup quand la référence passe de Soft à Vivid,
à 0,70 : le porteur prend la saturation, l’autre profil revient à sa part
commune (Q2 bis).

**Q5, les gris de Tailwind comme étalon.** Chroma des nuances Soft 100, 300,
500, 700 et 900, depuis des références de Tailwind, part mesurée à la clarté
bornée (R3), comparée à la famille Tailwind :

| Référence | Tailwind | Aujourd’hui | Part à la clarté bornée |
|---|---|---|---|
| slate-950 `#020617` | 0,007 · 0,020 · 0,041 · 0,039 · 0,040 | 0,010 · 0,036 · 0,080 · 0,129 · 0,108 | 0,005 · 0,016 · 0,038 · 0,061 · 0,052 |
| slate-50 `#F8FAFC` | idem | 0,011 · 0,035 · 0,078 · 0,058 · 0,040 | 0,007 · 0,022 · 0,050 · 0,038 · 0,026 |
| gray-50 `#F9FAFB` | 0,003 · 0,009 · 0,023 · 0,031 · 0,032 | 0,005 · 0,019 · 0,040 · 0,030 · 0,020 | 0,003 · 0,011 · 0,024 · 0,018 · 0,012 |
| stone-950 `#0C0A09` | 0,001 · 0,004 · 0,012 · 0,009 · 0,006 | 0,003 · 0,010 · 0,019 · 0,014 · 0,009 | 0,002 · 0,005 · 0,010 · 0,008 · 0,005 |

Depuis un 500, toutes les règles retrouvent la famille. Le seuil de 0,005
recommandé d’abord annulait slate-50, gray-50, zinc-950 et stone-950, que la
part à la clarté bornée reproduit. Le défaut de `#060605` tient à sa teinte,
pas à sa chroma. Écart de teinte maximal entre une référence et ses six
voisines à une unité RGB : `#060605`, `#7F7F80`, `#FAFAF9` et `#F4F4F5`
ont un voisin gris pur, donc ±180° ; zinc-950 ±39°, stone-950 ±36°, slate-50
±28°, `#FAFAF5` ±11°, les 500 de Tailwind ±10° au plus. Un plafond « jamais
plus coloré que la référence » a été écarté : depuis slate-50, il donne 0,003
au 500, contre 0,041 chez Tailwind.

## Décisions proposées

Chaque règle se valide par les [questions](#questions-au-mainteneur) avant
le moteur.

- **R1, le porteur prend la saturation de la référence** (réponses Q1 et
  Q2). On note `p` la part de la référence, `s` et `v` les parts communes
  de Soft et de Vivid. Le profil porteur prend toujours `p`, en Auto comme
  avec une base forcée ou un porteur figé. Quand `p < s`, l’autre garde le
  rapport des parts communes : Soft porteur donne Vivid à
  `min(1, p × v / s)`, Vivid porteur donne Soft à `p × s / v`. Au-dessus,
  l’autre garde sa part commune, bornée pour que Soft ne dépasse pas Vivid
  (`[ENT-11]`). Des parts du designer passent toujours avant. Ces parts se
  calculent à la lecture et ne se rangent pas. Les parts communes des
  Réglages communs deviennent la saturation par défaut du profil qui ne
  porte pas la référence, et la frontière du classement automatique.
- **R2, le gris pur** (réponse Q5 bis). Une référence dont R, G
  et B ne diffèrent pas de plus d’une unité a une part nulle : toutes ses
  nuances sont des gris purs, dans les deux profils et les deux modes. Un de
  ses voisins à une unité est déjà un gris pur : sa teinte ne dit rien de
  l’intention du designer (C8). La référence garde ses octets à son cran
  (`[MOT-17]`). Toute autre référence garde sa teinte.
- **R3, la part à la clarté bornée.** La part de la référence se mesure au
  plafond de sa teinte, à sa clarté bornée à l’étendue de la liste de la
  palette. Une référence dans l’étendue garde sa part.
- **R4, la dérive.** Le préréglage Tailwind se calcule pour toute référence
  de part non nulle. L’éditeur de dérive se désactive seulement quand aucune
  nuance calculée, hors du cran de la référence, n’a de couleur : trois
  octets égaux dans chaque intensité et chaque mode. C’est la condition que
  le mainteneur donne. La piste de teinte de la carte suit la même
  condition. Lue sur les nuances calculées, elle déverrouille la teinte dès
  qu’une saturation du designer colore la rampe d’un gris neutre : le
  designer choisit alors la teinte que l’octet imposait (C7).
- **R5, les parts `grise` disparaissent.** R1 et R2 les remplacent. La
  version 6 de la recette ne les accepte plus ; la lecture d’une recette 4
  ou 5 les retire (G3.1). `ajusterPartsGrises` disparaît, et ses appelants
  (`edition.ts`, `configuration.ts`) avec lui.
- **R6, les alertes.** `couleur-presque-grise` quitte la table 11.3 : une note
  dans la carte de la dérive dit pourquoi elle est désactivée. Son texte
  actuel est de toute façon faux dès que le designer règle les parts (C7).
  `reference-plus-terne` et `reference-plus-vive` ne sonnent plus que pour
  des parts du designer : R1 donne au porteur la part de la référence.
  `reference-hors-rampe` quitte la liste des points à vérifier : la note de
  `[DER-14]` dit la limite de l’éditeur, et elle se tait quand l’éditeur est
  désactivé. Aucune notice ne la remplace (réponse Q4) : une palette peut
  partir de `#000000` ou de `#FFFFFF`.
- **R7, le réglage « Gris » disparaît.** R2 ne lit plus de seuil de chroma :
  `seuils.chromaGrise` quitte la recette et les Réglages communs. La lecture
  d’une recette antérieure retire le champ ; aucune couleur n’en dépend plus.

## Questions au mainteneur

| # | Question | Recommandation | Réponse |
|---|---|---|---|
| Q1 | Sous la part commune de Soft : « Proportion » (Vivid garde le rapport des parts communes) ou « Bornes » (Vivid garde 0,95) | Proportion. Bornes tire un bleu franc de `#6B7280` et un magenta de `#7C717B`. La carte Z10 obtient déjà ces intensités à la main (maquette, Q1 ter), sans la dérive ; R1 les donne par défaut, avec elle | C, Proportion. Q1 bis (le glisser) : « très bien » |
| Q2 | Au-dessus de 0,45, le profil porteur en Auto doit-il aussi prendre la part de la référence ? Aujourd’hui `#559765`, part 0,60, est portée par Soft à 0,45 : l’écart atteint 0,25 à 0,70 | Non, pas dans ce plan. Tous les Soft d’un fichier gardent la même intensité, et le curseur de saturation de la carte Z10 règle Soft en un geste. À rediscuter après la recette de Z10 | Oui, aligner. « Le plus important c’est que la couleur de référence soit bien intégrée dans la palette et que les checks de contrastes soient OK. » Mesuré : 0 garantie perdue (C8). R1 étendue |
| Q2 bis | Le saut des deux rampes quand la référence passe de Soft à Vivid, à 0,70 : l’accepter, ou fixer le porteur à la création de la palette | L’accepter : il n’arrive qu’en passant 0,70, et « Référence exacte dans » l’évite | a, l’accepter |
| Q3 | « Profils confondus » sur une palette désaturée : sous R1, le moteur sonne pour `#78716C` (10 nuances sur 11 sous 0,02) et `#7C717B` (7 sur 11) | Se taire quand R1 s’applique, comme pour les parts `grise` aujourd’hui : les profils sont proches par construction. Sonner pour un gris neutre n’a pas de sens non plus | a, se taire |
| Q4 | Référence hors de l’étendue : aucun message, ou une notice qui dit que la nuance prévue est remplacée par une couleur plus sombre ou plus claire | Une notice, seulement quand l’écart de clarté dépasse la tolérance du fond, 0,005 (`[ENT-06]`). Son geste est de choisir une couleur plus claire ou plus sombre : « Ajuster la référence » ne monte que de 0,02 | Aucun message : « on a le droit de faire une palette avec un #000 ou un #fff » |
| Q5 | Seuil du gris neutre : 0,005, un autre nombre, ou aucun seuil (la part de `#060605` corrigée par R3 garde une teinte crème pâle) | 0,005 | Non comprise au premier passage. Au second : garder la teinte, gris pur seulement si l’on choisit du gris pur, sans vert dans les clairs d’un noir neutre ; « tu proposes quoi ? » |
| Q5 bis | Gris pur si R, G et B diffèrent d’une unité au plus, ou de deux | Une unité (R2) : `#060605` et `#7F7F80` deviennent gris, les gris de Tailwind gardent leur teinte (C8) | A, une unité |

## Ordre d’exécution

G0, puis G1 jusqu’à validation. G2 à G5 attendent que Z10.5 et Z10.6 soient
commités : ils touchent les mêmes fichiers (`palette.ts`, `recette.ts`,
`edition.ts`, `ongletPalettes.ts`, `reglagesDeLaPalette.ts`). La version de
la recette se décide en G3.1. G6 et G7 ferment le plan. G8 vient de la
revue G0, faite après G6 : ses trois premières cases attendent le
mainteneur, et G7 les suit.

## Lot G0 : revue indépendante

- [x] **G0.1** Un agent de revue relit ce plan, le code de
  `packages/couleur/src` (`palette.ts`, `rampe.ts`, `tailwind.ts`,
  `alertes.ts`, `recette.ts`, `contraste.ts`) et la recherche sur les
  intensités. Points à examiner : la continuité de R1 aux bornes, R1 avec une
  base forcée Vivid, R3 sur les vecteurs de la section 6.8 et les références
  colorées très sombres, R4 et le coût de `[MOT-13]`, la migration de la
  version 4, l’effet sur la planche et les tokens des palettes existantes.
  Côté carte Z10 : « Les deux » ajoute un écart aux parts de R1 au lieu de
  garder leur rapport ; la teinte de départ d’un gris neutre que le designer
  sature ; la part d’une palette à une intensité hors de l’étendue (R3).
  Ses conclusions se vérifient dans le code et s’écrivent sous cette case,
  retenues ou rejetées avec leur raison.
  Faite après G2 à G6, sur le code du commit `fac7af4` : la revue a mesuré
  le moteur avant et après, par des scripts hors du dépôt. Conclusions
  vérifiées dans le code :
  1. Retenue, à décider (G8.1). Avec Vivid porteur, forcé ou figé, Soft
     saute de `p × s / v` à `s` quand `p` passe `s` : `#7E5DB2` donne Soft
     0,212 et Vivid 0,448, `#7E5DB3` donne 0,45 et 0,451, et « Profils
     confondus » sonne. R1 écrit ce saut, et `partsDesProfils` l’applique.
     Le test de continuité ne couvre que Soft porteur, continu à 0,45.
  2. Retenue, à décider (G8.2). À une intensité, le curseur de saturation
     montre la part de R3, et `referenceReglee` applique la part à la clarté
     de la référence. Hors de l’étendue, poser la valeur affichée change la
     référence : `#1A0000` montre 0,506 et devient `#120503`, et la rampe
     tombe à 0,287 sous un curseur qui montre 0,506.
  3. Retenue, à décider (G8.3). Un gris neutre saturé déverrouille la teinte,
     mais à ±30° d’une teinte lue sur ses octets : 0° pour `#808080`,
     `#000000` et `#FFFFFF`, 286° pour `#7F7F80`, 107° pour `#060605`.
     Depuis `#808080`, aucun bleu ni vert. R4 et G7.2 promettent que le
     designer choisit la teinte.
  4. Retenue, sans code. R3 tient les vecteurs de la section 6.8 et
     l’ancrage de 12 000 palettes tirées. Une garantie sur 16 000 se perd,
     `#C24AEB`, 4,498 au lieu de 4,5, et deux se regagnent. Hors de
     l’étendue, des références colorées perdent de la part et changent de
     porteur : `#1A0000`, `#000012` et `#FFFDE0` passent de 1 à 0,51, 0,36
     et 0,49, et de Vivid à Soft. 25 palettes sur 12 000 changent de porteur.
     G7.1 le fait constater.
  5. Retenue, sans code. Les couleurs changent pour 1 993 palettes Auto à
     deux intensités sur 2 000 : presque tous les cadres existants passent
     « À actualiser », sans annonce. C’est la conséquence de la réponse Q2 ;
     G7.1 le fait constater.
  6. Retenue et corrigée. Une recette 5 au seuil de gris ou aux parts
     `grise` mal formés se lisait migrée. `MIGRATIONS[5]` ne retire plus
     que des nombres, et `recette.test.ts` tient qu’une telle recette reste
     illisible. La version 6 est justifiée : `fbb2662` rangeait déjà la 5.
  7. Retenue et corrigée. Vivid de `#6B7280` vaut 0,198, et non 0,199, dans
     la recherche sur les intensités. La table C4 reste une mesure datée.
  8. Retenue, à faire (G8.4). L’état `alertes-seules` garde son identifiant,
     mais plus aucun état ne montre une notice repliée sous les curseurs.
  9. Rejetée. Soft porteur est continu à `s`, Soft ne dépasse jamais Vivid
     sur 12 000 palettes, et le saut à 0,70 est celui que Q2 bis accepte.
  10. Rejetée. R4 et `[MOT-13]` tiennent : la dérive Tailwind n’est nulle
      que pour un gris pur, et une analyse coûte de 0,20 à 0,53 ms.
  11. Rejetée. « Les deux » garde l’écart des parts, comme la
      spécification de Z10 l’écrit. Ses limites vont à G7.2.
  12. Retenue et corrigée. Le compte du seuil « Profils confondus »
      comptait les palettes à une intensité ; `configuration.test.ts` le
      tient.

## Lot G1 : maquette et textes à valider

- [x] **G1.1** Script `mesurer-palettes-desaturees.mjs` dans ce dossier, qui
  refait les mesures C2 à C5 par le moteur, sur `#897288`, `#7C717B`,
  `#6B7280`, `#78716C`, `#A0B599`, `#7F7F80`, `#060605`, `#FAFAF5`, et sur
  `#1E6FD9`, `#16A34A`, `#DC2626` pour montrer qu’une référence colorée ne
  change pas.
  Fait : [mesurer-palettes-desaturees.mjs](./mesurer-palettes-desaturees.mjs)
  crée chaque palette par `nouvellePalette`, comme l’onglet Création, et
  écrit en fin de sortie les quatre rampes de chaque référence. Comparer sa
  sortie avant et après G2 montre les couleurs qui bougent. Sur le moteur de
  Z10.5, il retrouve les chiffres de C1 à C5, sauf l’écart médian à 0,008 :
  11° au lieu de 12°.
- [x] **G1.2** Maquette [MAQUETTES-PALETTES-DESATUREES.html](./MAQUETTES-PALETTES-DESATUREES.html), selon les
  règles du lot Z3 : une question par bloc, écrans lettrés au-dessus des
  choix, couleurs calculées par le moteur, écrans à 770 et à 500 px. Blocs :
  Q1 (les deux rampes de chaque référence sous chaque règle), Q3, Q4, Q5,
  la carte de la dérive d’un gris neutre, la ligne d’origine des intensités.
  Premier passage fait, par
  [generer-maquettes-palettes-desaturees.mjs](./generer-maquettes-palettes-desaturees.mjs) :
  Q1, Q1 ter (les gestes de la carte Z10, gris neutre saturé compris), Q1 bis
  (le glisser), Q2 à Q5, rampes du moteur actuel. Les textes de G1.3 ont été
  validés sans écran : T3 et T5 ne laissent aucun texte, et T1, T2, T4
  remplacent des lignes en place.
- [x] **G1.3** Textes, chacun en plusieurs rédactions rendues en entier, à
  valider mot à mot avant le code. Les saturations s’écrivent en pour cent,
  comme dans la carte « Teinte, saturation, luminosité ». Propositions
  écrites après les réponses Q1 à Q5 :

  T1, note sous l’éditeur de dérive et sous la piste de teinte de la carte,
  quand toutes les nuances sont grises (remplace `grisDesactive`) :
  - a. « Toutes les nuances de cette palette sont grises. La teinte ne se règle pas. »
  - b. « Votre couleur de référence est un gris pur. Ses nuances n’ont pas de teinte à régler. »
  - c. « Cette palette est entièrement grise. Il n’y a pas de teinte à régler. »

  T2, résumé de la carte de la dérive repliée (remplace « Désactivée pour une
  couleur presque grise ») :
  - a. « Désactivée pour une palette grise »
  - b. « Désactivée : aucune teinte »

  T3, ligne d’origine des saturations, sans réglage du designer (remplace les
  lignes `grise`, base forcée et réglages communs de `origineDesParts`) :
  - a. « Soft prend la saturation de votre couleur de référence, 16 %. Vivid garde celle des réglages communs, 95 %. »
  - b. « Votre couleur de référence est dans Soft. Soft prend sa saturation, 16 %. Vivid garde 95 %. »
  - Sous la saturation commune de Soft, a : « Soft prend la saturation de votre couleur de référence, 8 %. Vivid reste plus saturé dans la même proportion, à 17 %. »
  - Sous la saturation commune de Soft, b : « Votre couleur de référence est dans Soft. Soft prend sa saturation, 8 %. Vivid garde le même rapport, à 17 %. »

  T4, ligne d’origine d’une palette grise :
  - a. « Votre couleur de référence est un gris pur. Soft et Vivid sont gris. »
  - b. « Soft et Vivid sont gris, comme votre couleur de référence. »

  T5, aide des saturations communes dans les Réglages communs (remplace
  `aideParts`) :
  - a. « Le profil qui porte votre couleur de référence prend sa saturation. L’autre profil prend la valeur réglée ici. »
  - b. « Chaque palette place sa couleur de référence dans Soft ou dans Vivid, et ce profil prend sa saturation. L’autre profil prend la valeur réglée ici. »

  Le réglage « Gris » et sa mention dans le résumé des écarts se retirent,
  sans texte nouveau. L’anglais suit par la voie de la traduction. Les
  textes validés entrent à
  l’[inventaire](../Textes et langues/INVENTAIRE-TEXTES-ET-PROPOSITIONS.md).

  Validés : T1 c, T2 a, T4 a. T3 : aucune ligne quand la
  palette n’a ni parts du designer ni gris pur, base forcée comprise. Une
  réécriture plus simple a été proposée, puis écartée : « on n’a pas besoin
  de phrase pour ce cas ». T5 : aucun texte, `aideParts` se retire.
- [x] **G1.4** Donner la maquette au mainteneur et s’arrêter. Ses réponses
  se conservent en fin de plan, et les décisions R1 à R7 se corrigent avant
  G2. Premier passage répondu : Q1 (C), Q3 (a), Q4 (aucun message). Second
  passage répondu : Q2 (aligner), Q5 (garder la teinte, proposer un seuil).
  Troisième passage répondu : Q2 bis (a) et Q5 bis (A). Maquette validée ;
  les règles R1 à R7 en tiennent compte.

## Lot G2 : moteur

- [x] **G2.1** `partDeLaReference` mesure à la clarté bornée (R3) et rend 0
  pour un gris pur (R2). `partDeChroma` reste la mesure brute d’une couleur :
  vérifier chacun de ses appelants et choisir la bonne des deux.
  Fait : l’analyse, les alertes et le classement lisent `partDeLaReference` ;
  `partDeChroma` ne sert plus qu’aux mesures d’une couleur quelconque.
- [x] **G2.2** `partsDesProfils` applique R1 à tout porteur : Auto, base
  forcée, porteur figé. `estPresqueGrise` devient `estGrisPur`, la condition
  de R2 ; `profilAutomatique` n’en a plus besoin, puisqu’une part nulle
  donne déjà Soft.
- [x] **G2.3** `prereglageTailwind` ne rend une dérive nulle que pour une
  part nulle (R4, `[MOT-18]`). Une fonction du moteur dit si une palette est
  un gris neutre, lue par l’interface (R4).
  Fait : `prereglageTailwind` ne lit que des OKLCH et rend 0 pour une couleur
  sans teinte ; `edition.ts` écarte le gris pur avant de l’appeler.
  `estPaletteGrise` dit la palette grise.
- [x] **G2.4** Alertes (R6, Q3, Q4) : retirer `couleur-presque-grise` et
  `reference-hors-rampe` du type `Alerte`, sans notice de remplacement ;
  faire taire `profils-confondus` quand R1 s’applique.
  Fait : `aDesProfilsTernes` fait taire l’alerte pour une palette sans parts
  propres dont la référence est sous la part commune de Soft.
- [x] **G2.5** `CHROMA_GRISE` et `seuils.chromaGrise` disparaissent (R7),
  `recetteParDefaut` suit. `[MOT-13]` tenu : mesurer une analyse avant et
  après.
  Fait : `rampesDe`, `alertesDePalette`, `verifierPromesses` et
  `estPaletteGrise` d’une palette de onze nuances, médiane de cent calculs à
  dérive neuve : 0,40 à 0,58 ms au commit `6ed8f07`, 0,31 à 0,65 ms après,
  pour `#1E6FD9`, `#897288`, `#7C717B`, `#808080` et `#060605`.

## Lot G3 : recette

- [x] **G3.1** Version de la recette. Si aucune recette 5 n’a été écrite dans
  un fichier Figma quand G3 commence, les règles entrent dans la version 5 de
  Z10.5 : la validation refuse l’origine `grise`, et la lecture d’une
  recette 4 retire ces parts et `seuils.chromaGrise` (R5, R7). Sinon, une version 6 fait la même migration depuis la 5.
  Fait : version 6. La version 5 est commitée depuis `fbb2662`, et la recette
  de Z10 a pu la ranger dans un fichier. La migration de 5 à 6 retire les
  parts `grise` et le seuil ; une recette 4 y passe par la 5.
- [x] **G3.2** Vérifier que la planche marque périmés les cadres des
  palettes dont les couleurs changent, et que les tokens exportés suivent.
  Fait : l’empreinte d’un cadre porte ses hexas. Un test de
  `modeleDeCadre` rejoue les parts d’avant en parts du designer, pour
  `#1E6FD9` et `#6B7280` : pastilles et empreinte diffèrent, le cadre est à
  actualiser. UCM Palettes n’exporte pas de tokens ; le rapport lit
  `rampesDe`, que ses tests suivent.

## Lot G4 : interface

- [x] **G4.1** `ongletPalettes.ts` et `reglagesDeLaPalette.ts` : l’éditeur
  de dérive et la piste de teinte de la carte Z10 se désactivent sur la
  fonction de G2.3, avec la note validée. Le résumé de chaque carte suit.
  « Rétablir » reste actif tant qu’une teinte est rangée : un réglage
  rangé se remet toujours à zéro (C7, une intensité).
- [x] **G4.2** Carte « Teinte, saturation, luminosité » : `origineDesParts` prend les lignes
  validées, et le repère de la référence lit la part de R3.
- [x] **G4.3** Messages : `presentation.ts` et les deux catalogues perdent
  les cas retirés.
  L’éditeur ne montre plus la note de `[DER-14]` quand il est désactivé.
  Fait : la carte désactivée ne se déplie pas, et sa note ne se voit pas ; un
  test d’interface le tient sur `#060605`.
- [x] **G4.4** Réglages communs : le réglage « Gris » et son résumé se
  retirent (R7).
- [x] **G4.5** Galerie : un état pour `#897288`, un pour `#7C717B`, un pour
  un gris neutre, un pour `#060605`. `galerie/etats.cjs` est modifié par une
  autre session au moment où ce plan s’écrit : lire l’index avant d’y
  toucher.
  Fait : `palette-desaturee`, `palette-tres-desaturee`, `palette-grise` et
  `presque-noir` remplacent `couleur-presque-grise`. L’état `alertes-seules`
  garde son identifiant, que quarante tests lisent : Jaune n’y a plus de
  notice, puisque Vivid prend sa part, et son titre devient « Référence plus
  vive que la saturation commune ».

## Lot G5 : tests

Chaque loi se voit rouge sur mutation avant d’être crue.

- [x] **G5.1** Moteur : R1 (le porteur vaut la part de la référence, sous
  et au-dessus de 0,45 ; Vivid au rapport sous 0,45 ; continuité à 0,45 ;
  base forcée Vivid ; porteur figé), R2 (`#060605` et `#7F7F80` donnent
  des gris purs ; `#0C0A09`, `#020617`, `#F8FAFC` et `#FAFAF5` gardent leur
  teinte), R3 (depuis slate-950, la chroma du Soft 500 reste à 0,01 près de
  celle de Tailwind ; une référence dans l’étendue garde sa part), R4
  (dérive Tailwind non nulle pour `#7C717B`). Les tests `[MOT-18]`, `[ENT-09]`, `[VER-08]` et
  `[MOT-17]` qui citent les parts grises se réécrivent sur les nouvelles
  règles.
  Fait : `desaturees.test.ts` pour R2, R3, le porteur figé et
  `estPaletteGrise`. Huit mutations vues rouges : le gris pur à zéro unité,
  la part à la clarté propre, chacune des deux branches du rapport, l’ancrage
  inclus dans la palette grise, les deux retraits de la migration, le silence
  des profils ternes. La dernière a demandé un cas : des parts du designer si
  faibles que seule la référence a une teinte.
- [x] **G5.2** Recette : une recette 4 aux parts `grise` se lit, les perd,
  et perd `seuils.chromaGrise` ; une recette 5 exportée puis relue est
  égale.
- [x] **G5.3** Carte Z10 : à une intensité, baisser la saturation de
  `#897288` tournée de +10° jusqu’à 8 % laisse la teinte réglable ; « Les
  deux » depuis une palette désaturée garde Vivid au-dessus de Soft ;
  saturer Vivid d’un gris neutre déverrouille la teinte.
- [x] **G5.4** Interface : `[DER-15]` réécrit (l’éditeur reste actif pour
  `#7C717B`, se désactive pour `#808080`), aucune alerte « hors de la
  rampe » pour `#060605`, textes validés. `#000000` et `#FFFFFF` donnent
  des rampes grises et aucun point à vérifier.
  Fait : le noir et le blanc sont tenus par le moteur (`alertes.test.ts`,
  `desaturees.test.ts`), l’interface par les états de G4.5. Sur `#1E6FD9`,
  Vivid à 0,894 déplace les valeurs attendues de la planche et du nuancier :
  le 700 clair passe de `#0E5DC6` à `#185EC1`.

## Lot G6 : documents

- [x] **G6.1** Spécification : `[MOT-17]`, `[MOT-18]`, `[ENT-09]`,
  `[ENT-11]`, `[DER-14]`, `[DER-15]`, `[VER-10]`, table 11.3, recette par
  défaut (section 7.2), lecture des versions (section 7.3).
- [x] **G6.2** [Recherche sur les intensités](../2 Ergonomie/RECHERCHE-REFONTE-INTENSITES.md) :
  la réponse sur les palettes grises, et le tableau des références où le
  gris porte des parts `grise`.
- [x] **G6.3** Sixième plan : une ligne dans Z10.5 renvoie à ce plan pour la
  version 5.

## Lot G7 : recette

- [ ] **G7.1** Le mainteneur rejoue dans Figma : `#897288` à deux
  intensités, puis la saturation baissée jusqu’à `#7C717B`, puis jusqu’au
  gris neutre, puis `#060605`. À chaque pas : les voisines de la référence
  lui ressemblent, Vivid reste plus vif que Soft, la dérive reste réglable
  jusqu’au gris neutre, et aucun point à vérifier ne contredit l’éditeur.
  Sur un fichier qui a déjà des planches, presque tous les cadres passent
  « À actualiser » (G0.1, conclusion 5). Une référence colorée très sombre,
  `#1A0000`, passe de Vivid à Soft (conclusion 4).
- [ ] **G7.2** Dans la carte « Teinte, saturation, luminosité » : Soft et
  Vivid de `#7C717B` se règlent avec leur teinte ; à une intensité, la
  saturation descend sous l’ancien seuil sans verrouiller la teinte ; Vivid
  saturé sur `#808080` laisse choisir sa teinte, dans les bornes que G8.3
  décide. « Les deux » garde l’écart des parts : `#7C717B` à 30 % donne
  0,3 et 0,387, avec « Profils confondus » ; `#808080` à 30 % donne deux
  profils identiques.

## Lot G8 : suites de la revue G0

Les trois premières cases changent des couleurs ou un contrôle : chacune
attend la réponse du mainteneur avant le code.

- [ ] **G8.1** Continuité de R1 avec Vivid porteur. Proposition de la revue :
  Soft à `min(s, p × s / v)`, continu en `s` et en `v`. En Auto, Soft
  descend alors entre 0,33 et 0,45 pour une référence entre 0,70 et 0,95 :
  `#1E6FD9` passe de 0,45 à 0,424. Test de continuité côté Vivid, vu rouge
  sur mutation.
- [ ] **G8.2** Part d’une palette à une intensité hors de l’étendue.
  Proposition de la revue : `referenceReglee` mesure la part à la clarté
  bornée, comme R3, et la piste peinte suit. Un geste à la valeur affichée
  garde alors les octets de 6 références sur 7 ; `#000012` bouge encore
  de 0,012 ΔEok. `reglages.part` change de sens : les recettes 6 déjà
  rangées se lisent autrement. Test dans `reglages.test.ts`.
- [ ] **G8.3** Teinte d’un gris neutre saturé : bornes de ±180° quand le
  départ est un gris pur (`reglerTeinte`, validation de `reglages.teinte`,
  `CURSEURS` de la carte), ou R4 et G7.2 récrits pour dire ±30° autour de
  la teinte des octets.
- [ ] **G8.4** Galerie : un état aux parts du designer, Jaune à 0,3 et 0,8,
  dont la notice `reference-plus-vive` se replie sous les curseurs, et un
  test d’interface qui la trouve repliée.

## Hors périmètre

- Un modèle de chroma absolue pour les gris, où chaque nuance garde la
  chroma de la référence au lieu d’une part du plafond. R1 et R3 corrigent
  les cas mesurés sans changer `[MOT-09]`.

## Retours du mainteneur, maquette des palettes désaturées

Texte d’origine, réponses au premier passage de
`MAQUETTES-PALETTES-DESATUREES.html`.

```text
Q1
C
Q1 ter
je n'ai pas compris les exemples : c'est l'actuel ? la proposition ? il faut faire un choix ?
Q1 bis
Q1 bis
très bien
Q2
j'ai pas compris
Q3
a

Q4
pas de message, on a le droit de faire une palette avec un #000 ou un #fff si on veut

Q5
j'ai pas compris
```

Réponses au second passage :

```text
Q2
toutes les palettes soft et vivid ne doivent pas forcément avoir toutes la même saturation, on a le droit de la changer, le plus important c'est que la couleur de référence soit bien intégrée dans la palette et que les checks de contrastes soient OK

Q5
ben en soit c'est bien de conserver la teinte et de n'avoir du gris pur que si on choisi du gris pur mais faut voir le threshold quoi. si c'est vraiment presque 100% neutre en noir et que sur les couleurs clairs on est sur du vert, ça passe pas trop. tu proposes quoi ?
```

Réponses au troisième passage :

```text
Q2 bis, une conséquence à valider.
ok A

Q5
A
```

Réponses sur les textes T1 à T5 :

```text
T1 : c
T2 : a
T3 : faire beaucoup plus simple et avec une rédaction française, pas IA
     puis, sur trois réécritures courtes : je crois qu'on a pas besoin de phrase pour ce cas
T4 : a
T5 : pas de texte non plus
```

## Signalement du mainteneur

> le plugin palette gère très mal les teintes de gris, or on devrait pouvoir
> faire des palettes très désaturées ou 100% gris sans aucun problème.
>
> exemple, je prend #897288 comme couleur de référence avec palette soft et
> vivid. la couleur de référence est affectée à Soft mais les couleurs
> voisines ne matchent absolument pas en terme de saturation.
>
> quand on baisse encore plus la saturation pour aller sur du #7C717B
>
> on a ce message « #7C717B: reference colour #7C717B / This colour is almost
> grey. Hue controls are disabled and both profiles use its intensity.
> Chroma: 0.020, below the threshold of 0.03. / Choose a more saturated
> reference colour for more colourful shades. / Reference colour »
>
> or pourquoi est ce que ça serait désactivé ? ça devrait s'adapter sauf si
> aucune des couleur de la palette après hue drift ne contient de la
> saturation, dans ce cas les deux palettes sont monochromes à 100%.
>
> Bug : j'ai aussi eu ce message qui s'est affiché entre la section hue shift
> et la section Contrast guarentees « Points to check · 1 / #060605:
> reference colour #060605 / The starting lightness (0.121) is outside the
> shade range (0.270 to 0.975). You can adjust the hue on only one side. /
> Use the available control. To adjust both sides, choose a reference colour
> with lightness within this range. / Hue shift / Reference colour »
