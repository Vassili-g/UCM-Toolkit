# UCM Palettes : palettes désaturées et grises

## Résultat attendu

Une référence peu saturée donne une palette peu saturée. Soft prend
l’intensité de la référence, et ses nuances voisines lui ressemblent. Vivid
reste plus vif que Soft, dans le rapport des intensités communes, sans devenir
une couleur franche. La dérive de teinte reste réglable tant qu’une nuance de
la palette a une couleur. Elle ne se désactive que pour un gris neutre, dont
toutes les nuances sont grises : les deux profils sont alors identiques. Le
message « presque gris » disparaît de la liste des points à vérifier. Une
référence plus claire ou plus sombre que toutes les nuances ne produit plus de
point à vérifier qui contredit l’éditeur de dérive.

Ce plan est destiné à l’agent qui réalisera les changements. Il s’articule
avec le [lot Z10 du sixième plan](./PLAN-ERGONOMIE-PALETTES-V6.md#lot-z10--refonte-des-intensités),
dont le moteur (Z10.5) n’est pas encore écrit. Le mainteneur fait lui-même
la recette dans Figma.

## Autorités

1. le [signalement du mainteneur](#signalement-du-mainteneur), conservé
   sans modification ;
2. les [réponses aux questions](#questions-au-mainteneur), une fois données ;
3. la [spécification](./RECHERCHE-PLUGIN-PALETTES.md), en particulier
   `[MOT-17]`, `[MOT-18]`, `[ENT-09]`, `[ENT-11]`, `[DER-14]`, `[DER-15]`,
   `[VER-10]` et la table 11.3 ;
4. la [recherche sur les intensités](./RECHERCHE-REFONTE-INTENSITES.md) et
   le [sixième plan](./PLAN-ERGONOMIE-PALETTES-V6.md) ;
5. [AGENTS.md](../../../../AGENTS.md) et
   [CONTRIBUTING.md](../../../../CONTRIBUTING.md).

## Audit

Relevé dans le code au commit `98521f2`, recette par défaut (parts communes
Soft 0,45 et Vivid 0,95, seuil de gris 0,03, onze nuances). Les mesures
viennent du moteur (`packages/couleur/src`), appelé par un script jetable.
Le lot G1 les reprend dans un script rangé ici.

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
pas. Sur les gris les plus neutres, l’écart des profils passe sous le seuil
de « Profils confondus », 0,02 : la question Q3 le traite.

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

### C7. Ce que le lot Z10 a décidé sur les gris

La [recherche sur les intensités](./RECHERCHE-REFONTE-INTENSITES.md#réponses-aux-questions-du-plan)
répond : « Gris : le moteur applique les réglages, l’interface désactive la
teinte, comme la dérive (`[DER-15]`) ». Elle reprend aussi les parts `grise`
de `[ENT-09]`. Ces deux réponses se révisent avec ce plan, avant Z10.5.

## Décisions proposées

Chaque règle se valide par les [questions](#questions-au-mainteneur) avant
le moteur.

- **R1, la proportion.** On note `p` la part de la référence, `s` et `v` les
  parts communes de Soft et de Vivid. Quand `p < s`, le profil porteur prend
  `p` et l’autre garde le rapport des parts communes : Soft porteur donne
  Vivid à `min(1, p × v / s)`, Vivid forcé donne Soft à `p × s / v`. Au-dessus
  de `s`, rien ne change (`[ENT-11]` et le classement automatique). Des parts
  du designer passent toujours avant. Ces parts se calculent à la lecture,
  comme celles d’une base forcée : la recette ne les range pas.
- **R2, le gris neutre.** Une référence dont la chroma est sous
  `seuils.chromaGrise` a une part nulle : toutes ses nuances sont des gris
  neutres, dans les deux profils et les deux modes. La référence garde ses
  octets à son cran (`[MOT-17]`). Le défaut du seuil passe de 0,03 à 0,005,
  où un octet déplace la teinte de plus de 20° (C2).
- **R3, la part à la clarté bornée.** La part de la référence se mesure au
  plafond de sa teinte, à sa clarté bornée à l’étendue de la liste de la
  palette. Une référence dans l’étendue garde sa part.
- **R4, la dérive.** Le préréglage Tailwind se calcule pour toute référence
  de part non nulle. L’éditeur de dérive se désactive seulement quand aucune
  nuance calculée, hors du cran de la référence, n’a de couleur : trois
  octets égaux dans chaque intensité et chaque mode. C’est la condition que
  le mainteneur donne.
- **R5, les parts `grise` disparaissent.** R1 et R2 les remplacent. La
  version 5 de la recette ne les accepte plus ; la lecture d’une recette 4
  les retire. `ajusterPartsGrises` disparaît, et ses appelants
  (`edition.ts`, `configuration.ts`) avec lui.
- **R6, les alertes.** `couleur-presque-grise` quitte la table 11.3 : une note
  dans la carte de la dérive dit pourquoi elle est désactivée.
  `reference-plus-terne` ne sonne plus en Auto, puisque R1 donne à Soft la
  part de la référence ; elle reste pour des parts du designer.
  `reference-hors-rampe` quitte la liste des points à vérifier : la note de
  `[DER-14]` dit la limite de l’éditeur, et elle se tait quand l’éditeur est
  désactivé. Q4 décide si une notice sur l’écart de clarté la remplace.
- **R7, le seuil dans les Réglages communs.** Le champ reste, sous un nouveau
  sens et une nouvelle aide. La lecture d’une recette 4 remet le seuil au
  nouveau défaut, quelle que soit sa valeur : son sens a changé, et le
  mainteneur est le seul designer qui en a rangé une.

## Questions au mainteneur

| # | Question | Recommandation |
|---|---|---|
| Q1 | Sous la part commune de Soft : « Proportion » (Vivid garde le rapport des parts communes) ou « Bornes » (Vivid garde 0,95) | Proportion. Bornes tire un bleu franc de `#6B7280` et un magenta de `#7C717B` |
| Q2 | Au-dessus de 0,45, le profil porteur en Auto doit-il aussi prendre la part de la référence ? Aujourd’hui une référence à 0,60 est portée par Soft à 0,45 : l’écart atteint 0,25 à 0,70 | Oui, dans un second temps : c’est la règle de la base forcée étendue à Auto. Elle change toutes les palettes colorées, et Z10 règle déjà la saturation du porteur. La traiter avec Z10.5, pas ici |
| Q3 | « Profils confondus » sur une palette désaturée : `#78716C` donne 0,014 au 600, sous le seuil de 0,02 | Se taire quand R1 s’applique, comme pour les parts `grise` aujourd’hui : les profils sont proches par construction. Sonner pour un gris neutre n’a pas de sens non plus |
| Q4 | Référence hors de l’étendue : aucun message, ou une notice qui dit que la nuance prévue est remplacée par une couleur plus sombre ou plus claire | Une notice, seulement quand l’écart de clarté dépasse la tolérance du fond, 0,005 (`[ENT-06]`). Elle mène à « Ajuster la référence » |
| Q5 | Seuil du gris neutre : 0,005, un autre nombre, ou aucun seuil (la part de `#060605` corrigée par R3 garde une teinte crème pâle) | 0,005 |

## Ordre d’exécution

G0, puis G1 jusqu’à validation. G2 à G5 ensuite, avant Z10.5 : la version
5 de la recette porte les deux changements, et aucune recette 5 ne se publie
entre les deux. G6 et G7 ferment le plan.

## Lot G0 : revue indépendante

- [ ] **G0.1** Un agent de revue relit ce plan, le code de
  `packages/couleur/src` (`palette.ts`, `rampe.ts`, `tailwind.ts`,
  `alertes.ts`, `recette.ts`, `contraste.ts`) et la recherche sur les
  intensités. Points à examiner : la continuité de R1 aux bornes, R1 avec une
  base forcée Vivid, R3 sur les vecteurs de la section 6.8 et les références
  colorées très sombres, R4 et le coût de `[MOT-13]`, la migration de la
  version 4, l’effet sur la planche et les tokens des palettes existantes.
  Ses conclusions se vérifient dans le code et s’écrivent sous cette case,
  retenues ou rejetées avec leur raison.

## Lot G1 : maquette et textes à valider

- [ ] **G1.1** Script `mesurer-palettes-desaturees.mjs` dans ce dossier, qui
  refait les mesures C2 à C5 par le moteur, sur `#897288`, `#7C717B`,
  `#6B7280`, `#78716C`, `#A0B599`, `#7F7F80`, `#060605`, `#FAFAF5`, et sur
  `#1E6FD9`, `#16A34A`, `#DC2626` pour montrer qu’une référence colorée ne
  change pas.
- [ ] **G1.2** Maquette `MAQUETTES-PALETTES-DESATUREES.html`, selon les
  règles du lot Z3 : une question par bloc, écrans lettrés au-dessus des
  choix, couleurs calculées par le moteur, écrans à 770 et à 500 px. Blocs :
  Q1 (les deux rampes de chaque référence sous chaque règle), Q3, Q4, Q5,
  la carte de la dérive d’un gris neutre, la ligne d’origine des intensités.
- [ ] **G1.3** Textes, chacun en plusieurs rédactions rendues en entier, à
  valider mot à mot avant le code. Les propositions ci-dessous sont un point
  de départ.

  Note de la carte de la dérive, gris neutre (remplace `grisDesactive` et le
  résumé « Désactivée pour une couleur presque grise ») :
  - a. « Votre couleur de référence est un gris neutre. Ses nuances n’ont pas de teinte à régler. »
  - b. « Aucune nuance de cette palette n’a de couleur. La dérive de teinte n’a donc aucun effet. »
  - c. « Cette palette est entièrement grise. La dérive de teinte est désactivée. »

  Ligne d’origine des intensités sous R1 (remplace la ligne `grise` de
  `origineDesParts`) :
  - a. « Votre couleur de référence est peu saturée. Soft prend son intensité, 0,08. Vivid baisse dans la même proportion, à 0,17. »
  - b. « Soft utilise l’intensité de votre couleur de référence, 0,08. Vivid reste deux fois plus intense, à 0,17. »

  Ligne d’origine d’un gris neutre :
  - a. « Votre couleur de référence est un gris neutre. Soft et Vivid sont identiques. »
  - b. « Les deux profils sont gris. Ils sont identiques. »

  Notice de Q4, si elle est retenue (titre, impact, action) :
  - a. « Votre couleur de référence est plus sombre que la nuance 950 prévue. » / « La nuance 950 prend votre couleur telle quelle. L’écart avec la nuance 900 est plus grand que les autres. » / « Pour une rampe régulière, ajustez la référence. »
  - b. « Couleur de référence très sombre. » / « Elle remplace la nuance 950 et rompt la régularité de la rampe. » / « Utilisez “Ajuster la référence”. »

  Aide du seuil dans les Réglages communs (remplace `aideGris`) :
  - a. « Sous cette chroma, la couleur de référence est un gris neutre. Toutes ses nuances sont grises. »

  L’anglais suit par la voie de la traduction. Les textes validés entrent à
  l’[inventaire](./INVENTAIRE-TEXTES-ET-PROPOSITIONS.md).
- [ ] **G1.4** Donner la maquette au mainteneur et s’arrêter. Ses réponses
  se conservent en fin de plan, et les décisions R1 à R7 se corrigent avant
  G2.

## Lot G2 : moteur

- [ ] **G2.1** `partDeLaReference` mesure à la clarté bornée (R3) et rend 0
  sous le seuil (R2). `partDeChroma` reste la mesure brute d’une couleur :
  vérifier chacun de ses appelants et choisir la bonne des deux.
- [ ] **G2.2** `partsDesProfils` applique R1, base forcée comprise.
  `estPresqueGrise` devient la condition du gris neutre ; `profilAutomatique`
  n’en a plus besoin, puisqu’une part sous 0,45 donne déjà Soft.
- [ ] **G2.3** `prereglageTailwind` ne rend une dérive nulle que pour une
  part nulle (R4, `[MOT-18]`). Une fonction du moteur dit si une palette est
  un gris neutre, lue par l’interface (R4).
- [ ] **G2.4** Alertes (R6, et Q3, Q4 selon les réponses) : retirer
  `couleur-presque-grise` et `reference-hors-rampe` du type `Alerte`, faire
  taire `profils-confondus` sous R1, ajouter la notice de Q4 si elle est
  retenue.
- [ ] **G2.5** `CHROMA_GRISE` passe à 0,005 et `recetteParDefaut` suit.
  `[MOT-13]` tenu : mesurer une analyse avant et après.

## Lot G3 : recette

- [ ] **G3.1** `FORMAT_RECETTE` 5, partagé avec Z10.5 : l’origine `grise`
  est refusée par la validation, et la lecture d’une recette 4 retire ces
  parts et remet `seuils.chromaGrise` au défaut (R5, R7). Si Z10.5 a déjà
  posé la version 5, ces règles s’y ajoutent sans nouvelle version.
- [ ] **G3.2** Vérifier que la planche marque périmés les cadres des
  palettes dont les couleurs changent, et que les tokens exportés suivent.

## Lot G4 : interface

- [ ] **G4.1** `ongletPalettes.ts` : la carte de la dérive se désactive sur
  la fonction de G2.3, avec la note validée. Le résumé de la carte suit.
- [ ] **G4.2** Carte « Intensités » : `origineDesParts` prend les lignes
  validées, et le repère de la référence lit la part de R3.
- [ ] **G4.3** Messages : `presentation.ts` et les deux catalogues perdent
  les cas retirés et gagnent la notice de Q4 si elle est retenue.
  L’éditeur ne montre plus la note de `[DER-14]` quand il est désactivé.
- [ ] **G4.4** Réglages communs : libellé et aide du seuil validés.
- [ ] **G4.5** Galerie : un état pour `#897288`, un pour `#7C717B`, un pour
  un gris neutre, un pour `#060605`. `galerie/etats.cjs` est modifié par une
  autre session au moment où ce plan s’écrit : lire l’index avant d’y
  toucher.

## Lot G5 : tests

Chaque loi se voit rouge sur mutation avant d’être crue.

- [ ] **G5.1** Moteur : R1 (Soft vaut la part de la référence, Vivid le
  rapport ; continuité à 0,45 ; base forcée Vivid), R2 (toutes les nuances
  neutres sous le seuil), R3 (`#060605` n’a plus de nuance crème ; une
  référence dans l’étendue garde sa part), R4 (dérive Tailwind non nulle
  pour `#7C717B`). Les tests `[MOT-18]`, `[ENT-09]`, `[VER-08]` et
  `[MOT-17]` qui citent les parts grises se réécrivent sur les nouvelles
  règles.
- [ ] **G5.2** Recette : une recette 4 aux parts `grise` se lit, les perd,
  et reprend le seuil par défaut ; une recette 5 exportée puis relue est
  égale.
- [ ] **G5.3** Interface : `[DER-15]` réécrit (l’éditeur reste actif pour
  `#7C717B`, se désactive pour `#808080`), aucune alerte « hors de la
  rampe » pour `#060605`, textes validés.

## Lot G6 : documents

- [ ] **G6.1** Spécification : `[MOT-17]`, `[MOT-18]`, `[ENT-09]`,
  `[ENT-11]`, `[DER-14]`, `[DER-15]`, `[VER-10]`, table 11.3, recette par
  défaut (section 7.2), lecture des versions (section 7.3).
- [ ] **G6.2** [Recherche sur les intensités](./RECHERCHE-REFONTE-INTENSITES.md) :
  la réponse sur les palettes grises, et le tableau des références où le
  gris porte des parts `grise`.
- [ ] **G6.3** Sixième plan : une ligne dans Z10.5 renvoie à ce plan pour la
  version 5.

## Lot G7 : recette

- [ ] **G7.1** Le mainteneur rejoue dans Figma : `#897288` à deux
  intensités, puis la saturation baissée jusqu’à `#7C717B`, puis jusqu’au
  gris neutre, puis `#060605`. À chaque pas : les voisines de la référence
  lui ressemblent, Vivid reste plus vif que Soft, la dérive reste réglable
  jusqu’au gris neutre, et aucun point à vérifier ne contredit l’éditeur.

## Hors périmètre

- Le porteur qui prend la part de la référence au-dessus de 0,45 (Q2) : il
  relève de Z10.5.
- Un modèle de chroma absolue pour les gris, où chaque nuance garde la
  chroma de la référence au lieu d’une part du plafond. R1 et R3 corrigent
  les cas mesurés sans changer `[MOT-09]`.

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
