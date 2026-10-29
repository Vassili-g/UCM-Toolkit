# Crans clairs des palettes

Le mainteneur a testé ses palettes sur ses composants, en conditions réelles.
Ses remarques touchent quatre parties d'UCM : le moteur de couleur, la table
qui affecte un cran à chaque variable, le nom des variables et l'architecture
des tokens. Le mainteneur juge ces sujets liés : une solution doit les traiter
ensemble.

**État.** Réflexion ouverte. Le mainteneur a pris position sur la clarté des
crans clairs, la table de `surface` et son texte. Le nom et l'organisation des
variables restent ouverts, comme le thème Dark. Rien n'est implémenté.

| Document | Contenu |
|---|---|
| [Maquettes/MAQUETTE-CRANS-CLAIRS.html](./Maquettes/MAQUETTE-CRANS-CLAIRS.html) | Une section par sujet, numérotée comme ce document : remarques, faits, rendu réel des solutions sur des composants, contrastes |
| [Mesures/palettes-et-reglages.json](./Mesures/palettes-et-reglages.json) | La configuration d'UCM Palettes du mainteneur : douze palettes et leurs réglages |
| [Mesures/generer-donnees.ts](./Mesures/generer-donnees.ts) | Calcule les rampes de cette configuration sous huit courbes : depuis `Mesures/`, `npx tsx generer-donnees.ts > ../Maquettes/donnees-crans.js` |
| [Maquettes/donnees-crans.js](./Maquettes/donnees-crans.js) | Les rampes calculées, lues par la maquette |

Les mesures portent sur les douze palettes du mainteneur, soit 21 rampes en
Soft et en Vivid. Elles portent sur le thème Light normal, sauf mention
contraire. La configuration met un texte blanc sur les boutons dans les deux
modes : son thème Dark est donc un thème inversé.

Le 29 octobre, `generer-donnees.ts` rend des rampes identiques à celles du 23
octobre. Depuis, le fond de la carte (`#1C1C1C` en Dark) a rejoint les fonds
des garanties 2 à 6 (commit `e44583fc`). Si la configuration du mainteneur a
changé dans Figma, il faut l'exporter de nouveau dans `Mesures/`.

Le code concerné :

- la table des crans : `TABLE_DES_DOSSIERS` dans
  `packages/kit/src/emplois/dossiers.ts` ;
- les portées des variables : `SUPPORT_DES_VARIABLES`, même fichier ;
- les garanties de contraste : `GARANTIES` dans
  `packages/kit/src/emplois/garanties.ts` ;
- les libellés des variables : `packages/kit/src/referentiel/theme.ts` ;
- la courbe de clarté : `PREREGLAGES` dans `packages/couleur/src/nuances.ts` ;
- le réglage de luminosité et le décalage selon la teinte :
  `decalageDe` et `clarteSelonLaTeinteGardee` dans
  `packages/couleur/src/palette.ts`, `clarteDuCran` dans
  `packages/couleur/src/rampe.ts`.

## Positions du mainteneur au 29 octobre

| Sujet | Position |
|---|---|
| 1. Crans clairs foncés | La clarté commune, avec le bas de la courbe actuelle |
| 3. Texte de `surface` | 700, comme le texte de `page` |
| 4. Survol du bouton texte | Ce n'est plus un problème : avec la clarté commune, le survol est bien plus clair |
| 5. Fond léger | Ce n'est plus un problème : le 50 de la clarté commune est très léger. Il reste à pouvoir l'employer dans un composant |
| 6. Composant posé dans une alerte | Ce n'est plus un sujet si `page` et `surface` ont le même texte |
| 8. Éléments sans survol | Un fond 100 et un texte 700 conviennent |
| 9. Noms des variables | La forme C, l'élément d'abord, est intéressante, mais il y manque des variables |

La table de `surface` reste donc 100, 200 et 300, avec un texte 700.

## Table actuelle de `surface`, en Light normal

| Variable | Cran |
|---|---|
| `surface/default` | 100 |
| `surface/hover` | 200 |
| `surface/pressed` | 300 |
| `surface/foreground` | 800 |
| `surface/border` | 800 |
| `page/foreground`, `page/border` | 700 |
| `page/divider` | 300 |

La courbe Light place le 50 à une clarté de 0,975, le 100 à 0,95, le 200 à
0,905, le 300 à 0,845, le 400 à 0,76 et le 500 à 0,67.

## 1. Les crans clairs paraissent foncés

> « default (ou background-base) vise le cran 100, qui est quand même assez
> foncé. »
>
> « Regarde la palette "ocean", elle est par défaut, sans modif. les crans
> clairs en vivid sont super foncés par rapport aux autres palettes. très
> bizarre non ? »

**Constat sur Ocean.** La configuration d'Ocean porte `reglages.clarte.vivid =
-0.06`, le curseur « Luminosité » de sa carte. Sa référence d'origine
`#3B82F6` est devenue `#0073DE`. `clarteDuCran` ajoute ce décalage à chaque cran
de la rampe Vivid, crans clairs compris. Le 50 d'Ocean Vivid vaut 0,895. Sans
ce réglage, il vaudrait 0,953. Iris porte le même réglage, à −0,02.

**Constat sur toutes les palettes.** Le moteur décale aussi la clarté selon la
teinte, d'après le relevé Tailwind. Ce décalage pèse surtout sur le 50. Il va
de −0,022 pour Deep à +0,025 pour Sun. Le 50 de Sun touche le blanc pur et
perd sa teinte. Avec une courbe plus claire, le 50 de Grass le touche aussi.

**Positions du mainteneur.** Baisser la saturation rend les palettes trop
fades : cette piste est écartée. La clarté commune du sujet 2 et le bas de la
courbe actuelle conviennent.

**Pistes de courbe écartées**, clartés du 50 au 300 :

| Courbe | Clartés | Écart médian 100 → 200 | Écart médian 300 → 400 |
|---|---|---|---|
| Actuelle, retenue | 0,975 / 0,95 / 0,905 / 0,845 | 0,044 | 0,084 |
| Légère | 0,98 / 0,96 / 0,925 / 0,875 | 0,035 | 0,113 |
| Moyenne | 0,983 / 0,965 / 0,935 / 0,89 | 0,029 | 0,127 |
| Forte | 0,986 / 0,972 / 0,948 / 0,91 | 0,024 | 0,147 |

Le lissage du 300 au 400 ne se pose plus avec la courbe actuelle. La maquette
garde ses mesures : une référence peut changer de cran, et le 400 et le 500
perdent du contraste sur le blanc.

## 2. Un même cran doit avoir la même clarté dans toutes les palettes

> « Je suis pas encore sur de passer les surfaces sur les crans à partir de 50.
> et si on faisait ça il faudrait vérifier que toutes les teintes soient
> harmonisée à la perfection sur le cran 50 pour pas avoir des différence de
> luminosité perçue entre deux teintes sur ce cran. car ça se voit beaucoup »

**Constat.** Avec le moteur actuel et la courbe actuelle, les 50 des palettes
du mainteneur vont de 0,895 à 1,000 de clarté. Les 100 vont de 0,871 à 0,972.
Les 200 vont de 0,827 à 0,921.

**Piste retenue : la clarté commune des crans clairs.** Le 50, le 100 et le 200
de chaque palette prennent la clarté de la courbe. Le décalage selon la teinte
et le réglage de luminosité de la carte ne s'y appliquent plus. Le 300 et le
400 font la transition. La teinte et la part de saturation de chaque cran
restent celles du moteur. Le cran de la référence ne change pas.

La maquette simule cette piste hors du moteur. L'écart de clarté entre les
palettes tombe à 0,002 sur le 50, le 100 et le 200. Le 50 de Sun et de Grass
retrouve une teinte.

Dans le moteur, cette piste demanderait de ne plus appliquer `decalageDe` ni le
décalage selon la teinte aux crans clairs. Le moteur ne l'applique pas encore.
Le relevé Tailwind cesse alors de guider le 50, le 100 et le 200.

## 3. Le texte de `surface`

> « je trouve le texte à 800 déjà trop foncé dans /surface donc un texte à 800
> sur /paraitra presque sans teinte. A vrai dire j'aimerais beaucoup que le
> texte de /surface soit aussi à 700 pour toutes les couleurs. »

**Position du mainteneur.** Avec la clarté commune, le texte de `surface`
passe à 700. `surface` et `page` ont alors le même texte en Light normal.

Contraste minimum du texte 700, clarté commune, courbe actuelle :

| Fond | Minimum | Rampes sous 4,5 | Rampes sous 3 |
|---|---|---|---|
| 50 | 5,33 | 0 | 0 |
| 100 | 4,95 | 0 | 0 |
| 200 | 4,34 | 5 sur 21 | 0 |
| 300 | 3,65 | 20 sur 21 | 0 |
| Page blanche | 5,69 | 0 | 0 |

Le texte 800 passe 4,5:1 sur tous ces fonds. Le sujet 7 détaille le survol et
l'appui.

`surface/foreground` et `page/foreground` restent deux variables. Elles ont le
même cran en Light normal seulement : 900 et 800 en Light inversé, 950 et 700
en Dark normal, 950 et 800 en Dark inversé.

## 4. Le survol du bouton texte part du blanc

> « on a le button type text qui n'a pas de fond. En hover on lui affecte un
> surface/hover (logique) mais c'est hyper foncé alors qu'on partait du fond
> blanc, c'est beaucoup plus beau de partir de surface/default mais ça
> casserait la logique : probleme »

**Position du mainteneur.** Avec la clarté commune, le survol à 200 est bien
plus clair qu'avant. Le sujet est clos.

Les pistes de la table décalée et du survol translucide restent dans la
maquette pour mémoire.

## 5. Un fond vraiment léger

> « on a des alert de type "outlined" sur lesquelles j'aimerais qu'il y ait un
> fond de couleur très très léger. »

**Position du mainteneur.** Le 50 de la clarté commune est assez léger. Un
composant doit pouvoir l'employer : il lui faut une variable. Le sujet 9
propose son nom et sa place.

**Mesures du 50 en clarté commune.** Le texte 700 y passe à 5,33 au minimum.
Le contour 700 y passe à 3:1 partout. Le 50 vaut 0,975 dans toutes les palettes.

## 6. Un composant conçu sur la page, posé dans une alerte teintée

> « un bouton texte est défini dans ses variantes, dans ses variantes, le
> bouton text est posé sur une page, donc quand il est dans une alert teinte
> il a toujours ce problème qu'il devient posé sur un contexte différent de
> celui sur lequel il a été conçu. C'est un autre problème à résoudre. »

**Position du mainteneur.** Si `page` et `surface` ont le même texte 700, ce
n'est plus un sujet.

**Constat en Light normal.** Le texte du bouton, `page/foreground`, vaut 700
comme `surface/foreground`. Sur l'alerte au 100, il passe à 4,95 au minimum.

**Constat en Dark.** Le problème reste. Dans la configuration du mainteneur,
`page/foreground` vaut 800 et `surface/default` vaut 300. Le texte du bouton
passe à 3,39 au minimum sur l'alerte, et 11 rampes sur 21 sont sous 4,5. Le
sujet 10 mesure une table Dark qui donnerait à `surface` le texte de `page`.

| Piste restante | Mécanisme | Coût |
|---|---|---|
| Variante par contexte | Une variante « sur surface » du composant, comme la propriété `staticColor` des boutons de Spectrum | Les variantes se multiplient. Le designer choisit la bonne. |
| Mode du conteneur | L'alerte pose un mode Figma sur son cadre, et les variables de ses enfants changent de valeur | Une collection de plus. Le designer pose ce mode à la main : ce geste demande d'être discuté avant toute conception. |
| Texte commun en Dark | La table Dark de `surface` prend le texte de `page` | Voir le sujet 10 |

## 7. Le contraste à l'appui

> « on s'en fiche que les contrastes ne passent pas sur un état pressed qui ne
> dure qu'une demi seconde non ?? il y'a vraiment des règles d'accessibilité
> pour ça ?? »
>
> « je pense qu'il faut laisser tomber les checks de contraste sur le fond
> pressed 300, j'estime que c'est pas utile, tant pis pour les normes (qui sont
> vagues à ce sujet) »

**Règles.** Le critère WCAG 1.4.3 demande 4,5:1 pour tout texte affiché, et 3:1
pour le grand texte. Ses exceptions sont les éléments inactifs, la décoration
et les logos. Le critère 3.2 du RGAA applique la même règle. Le survol est un
état affiché tant que le pointeur reste sur l'élément : la règle s'y applique.

**Position du mainteneur.** L'appui sort des vérifications de contraste.

**Table retenue, mesurée.** Fonds 100, 200 et 300, texte 700, clarté commune,
courbe actuelle :

| État | Fond | Minimum | Rampes sous 4,5 | Rampes sous 3 |
|---|---|---|---|---|
| Repos | 100 | 4,95 | 0 | 0 |
| Survol | 200 | 4,34 | 5 sur 21 | 0 |
| Appui | 300 | 3,65 | 20 sur 21 | 0 |

Au survol, les rampes sous 4,5 sont Emerald Soft (4,34), Grass Soft (4,39),
Grass Vivid (4,41), Emerald Vivid (4,42) et Sky Soft (4,49). Les verts et les
cyans ont la plus forte luminance à clarté égale : ils perdent le plus.

À l'appui, seule Ocean Vivid passe 4,5. Toutes les rampes passent 3:1, au
survol comme à l'appui. Le contour 700 passe donc 3:1 sur les trois fonds.

**Conséquence sur les garanties.** La garantie 3 juge `surface/foreground` sur
`surface/hover`. Avec le texte 700, elle échouerait sur les cinq rampes
ci-dessus. Trois réponses existent :

| Réponse | Effet mesuré |
|---|---|
| Éclaircir le seul 200, de 0,905 à 0,92 | Le survol passe 4,5 sur les 21 rampes, au minimum 4,55. À 0,915, une rampe reste sous 4,5. L'écart de clarté entre le repos et le survol passe de 0,045 à 0,03. Aucune référence ne change de cran. Non mesuré sur 360 teintes. |
| Juger le survol à 3:1 | Toutes les rampes passent. Le texte du survol n'est plus garanti à 4,5. |
| Sortir le survol de la garantie 3 | Comme l'appui. Le texte du survol n'est plus vérifié. |

Retirer l'appui demande de retirer `surface/pressed` des garanties 3 et 4. La
question se pose aussi pour `solid/pressed` dans la garantie 1.

## 8. Les éléments sans survol

> « oui mais si on veut l'utiliser pour des éléments sans survol ? ou si c'est
> pas grave si le survol est faible ? »

**Constat.** Une étiquette, un tag ou un encart n'ont pas de survol. Seul leur
fond au repos compte.

**Position du mainteneur.** Un fond 100 et un texte 700 conviennent, avec la
clarté commune.

## 9. L'organisation et les noms des variables

> « default, hover, pressed : désigne des états. Pratique pour pas se tromper
> mais c'est pas harmonisé avec les autres termes. Idées : background-base,
> background-hover, background-pressed ? foreground, border : désigne des
> éléments »
>
> « on ne peut pas appliquer solid/default à un contour, un contour est soit
> posé sur une surface et il se trouve donc sur /surface soit il est posé sur
> la page donc il se trouve dans page. »
>
> Sur la forme C : « intéressant mais il manque plein de variables, comment on
> fait un fond encore plus clair ? ou sont les divider ? »

### Les règles déjà posées

1. Une couleur appartient au fond qui est juste derrière elle : `solid`,
   `surface` ou `page`.
2. Le texte et le contour ne changent pas avec l'état.
3. `solid` n'a pas de contour. Le kit donne pourtant aux trois fonds de `solid`
   la portée `STROKE_COLOR` et l'emploi `border`.
4. `page` n'a pas de fond par palette. Le fond de la page est `elevation/page`,
   commun à toutes les palettes.
5. Un état qui change la sorte de fond change de dossier, comme la sélection.

### Ce qui manque à la table d'aujourd'hui

**Le fond très léger.** Le 50 n'a pas de variable. Son texte et son contour
sont ceux de `surface` dans les quatre thèmes : 700 en Light normal, 900 en
Light inversé, 950 en Dark. C'est donc un niveau de `surface`, pas un nouveau
dossier. En Dark, il viserait le 200 : le texte 950 y passe à 11,27 au minimum.
Il n'a pas d'état : aucun besoin de survol n'est relevé sur ce fond.

**Le filet sur un fond teinté.** `page/divider` vaut 300 dans les deux modes. En
Light, un filet 300 sur le fond 100 reste visible, à un contraste de 1,34 à
1,50. En Dark, le fond teinté est aussi au 300 : le filet a exactement sa
couleur et disparaît. Un filet dans une alerte teintée demande donc
`surface/divider`, au 300 en Light et au 500 en Dark (contraste de 1,56 à 1,68
sur le 300).

**L'anneau de focus sur un fond teinté.** `ring` n'existe qu'une fois par
palette, et la garantie 7 le juge sur la page et la carte. En Light, l'anneau
600 passe 3:1 sur le 100 (3,45 au minimum) et sur le 50 (3,69). En Dark,
l'anneau 700 sur le fond teinté 300 tombe à 2,38 au minimum : 20 rampes sur 21
sont sous 3. Ce défaut existe déjà avec la table d'aujourd'hui.

### Trois organisations complètes

Les trois formes portent les mêmes quinze variables par palette : les treize
d'aujourd'hui, le fond très léger et le filet sur fond teinté. Les crans sont
ceux de la configuration du mainteneur.

| Besoin | Light | Dark | A. Dossier, élément, niveau, état | B. Noms actuels | C. Élément, puis contexte |
|---|---|---|---|---|---|
| Fond plein au repos | 700 | 700 | `solid/background` | `solid/default` | `background/solid` |
| Fond plein survolé | 800 | 600 | `solid/background-hover` | `solid/hover` | `background/solid-hover` |
| Fond plein appuyé | 900 | 500 | `solid/background-pressed` | `solid/pressed` | `background/solid-pressed` |
| Texte sur fond plein | blanc | blanc | `solid/foreground` | `solid/foreground` | `foreground/on-solid` |
| Fond très léger, nouveau | 50 | 200 | `surface/background-subtle` | `surface/subtle` | `background/surface-subtle` |
| Fond teinté au repos | 100 | 300 | `surface/background` | `surface/default` | `background/surface` |
| Fond teinté survolé | 200 | 400 | `surface/background-hover` | `surface/hover` | `background/surface-hover` |
| Fond teinté appuyé | 300 | 500 | `surface/background-pressed` | `surface/pressed` | `background/surface-pressed` |
| Texte sur fond teinté | 700 | 950 | `surface/foreground` | `surface/foreground` | `foreground/on-surface` |
| Contour sur fond teinté | 700 | 950 | `surface/border` | `surface/border` | `border/on-surface` |
| Filet sur fond teinté, nouveau | 300 | 500 | `surface/divider` | `surface/divider` | `divider/on-surface` |
| Texte coloré sur la page | 700 | 800 | `page/foreground` | `page/foreground` | `foreground/on-page` |
| Contour sur la page | 700 | 800 | `page/border` | `page/border` | `border/on-page` |
| Filet sur la page | 300 | 300 | `page/divider` | `page/divider` | `divider/on-page` |
| Anneau de focus | 600 | 700 | `ring` | `ring` | `ring` |

Hors des palettes :

| Besoin | A et B | C |
|---|---|---|
| Fond de la page, fond de la carte | `elevation/page`, `elevation/raised` | `background/page`, `background/raised` |
| Corps de texte et texte secondaire du neutre | `neutral/page/foreground-main`, `neutral/page/foreground-subtle` | `neutral/foreground/on-page-main`, `neutral/foreground/on-page-subtle` |
| Désactivé | `disabled/background`, `disabled/foreground`, `disabled/border` | inchangés |

**La grammaire de A.** `{dossier}/{élément}[-{niveau}][-{état}]`. Le dossier
dit ce qui est juste derrière. L'élément vaut `background`, `foreground`,
`border` ou `divider`. Le niveau vaut `subtle`. L'état vaut `hover` ou
`pressed`. Le repos n'a pas de suffixe. Chaque suffixe a une place fixe : un
niveau et un état ne se confondent plus.

**La grammaire de C.** `{élément}/{contexte}[-{niveau}][-{état}]` pour un fond,
`{élément}/on-{contexte}` pour le reste. Sans `on-`, `background/surface` et
`foreground/surface` se lisent de la même façon alors que l'un est la surface et
l'autre le texte posé dessus. Material 3 emploie `on-surface` pour ce sens.

**A bis**, `background-base`. Avec un niveau `subtle`, `base` se lit aussi comme
un niveau. Le survol de `background-base` s'écrirait `background-base-hover` ou
`background-hover`, sans règle pour trancher.

### Comparaison

| Critère | A | B | C |
|---|---|---|---|
| Renommages par palette | 6, les fonds de `solid` et de `surface` | 0 | 12, tout sauf `ring`, plus les variables hors des palettes |
| Un état et un élément dans le même dossier | Non | Oui : `default` côtoie `foreground` | Non |
| Où lire ce qui est juste derrière | Le dossier | Le dossier | La fin du nom |
| Ce qu'il faut dans une alerte teintée | Tout est dans `surface/` | Tout est dans `surface/` | Réparti dans quatre dossiers |
| Portée Figma par dossier | Mêlée : fond, texte et trait | Mêlée | Une seule famille : `background` en remplissage, `foreground` en texte, `border` et `divider` en trait |
| `DOSSIERS` du kit, dossiers affichés par Palettes | Inchangés | Inchangés | Les dossiers deviennent les éléments |

Le sélecteur de variables de Figma filtre par portée. Avec C, les variables
compatibles d'un calque tiennent dans un seul groupe. Avec A, elles se
répartissent entre les dossiers. L'effet sur le choix du designer reste à
vérifier dans Figma.

Les design systems relevés dans `docs/references/design-systems/` se partagent.
Atlassian (`color.background.brand.subtlest.hovered`, `color.text.brand`) et
Primer (`bgColor-accent-muted`, `fgColor-accent`) mettent l'élément d'abord.
Material 3 (`primary-container`, `on-primary-container`) et shadcn
(`--primary`, `--primary-foreground`) mettent le contexte d'abord, comme A.

**Recommandation.** La forme A. Elle garde la règle 1 dans le dossier, que
Palettes affiche et que les garanties 3 et 4 suivent. Elle sépare le niveau et
l'état par leur place dans le nom. Elle coûte six renommages par palette contre
douze pour C. La forme C reste la bonne réponse si l'essai dans Figma montre
que le regroupement par portée aide le designer à choisir.

## 10. Le thème Dark et les thèmes inversés

**Constat.** La configuration du mainteneur a sa propre courbe Dark et un fond
de page `#121212`. Son texte des boutons est blanc en Dark : la table appliquée
est la table Dark inversée. `surface` y vaut 300, 400 et 500, avec un texte
950. `page/foreground` y vaut 800.

| Table Dark de `surface` | Repos | Survol | Appui |
|---|---|---|---|
| Actuelle : 300, 400, 500, texte 950 | 9,47 | 7,17 | 5,77 |
| 200, 300, 400, texte 900 | 7,82 | 6,44 | 4,94 |
| 100, 200, 300, texte 800 | 4,61 | 4,03 (2/21 sous 4,5) | 3,39 |

La dernière ligne donne à `surface` le texte 800 de `page`, comme le Light
normal le fait au 700. Le sujet 6 serait alors réglé en Dark aussi. Son survol
manque 4,5 sur deux rampes.

Avec la table actuelle, trois couleurs de `page` échouent dans un fond teinté
Dark : le texte (3,39 au minimum), le filet (même couleur que le fond) et
l'anneau de focus (2,38 au minimum).

Les thèmes inversés en Light ne sont pas mesurés.

## Questions ouvertes

| Question | État |
|---|---|
| Le réglage de luminosité d'une palette épargne-t-il les crans clairs ? | Oui, avec la clarté commune |
| Le 50, le 100 et le 200 prennent-ils une clarté commune ? | Oui |
| Quelle courbe du bas, avec ou sans lissage ? | La courbe actuelle, sans lissage |
| Quelle clarté pour un fond léger ? | Le 50, à 0,975 |
| Le texte de `surface` reste-t-il à 800 ? | Non, 700 |
| Quelle table pour `surface` ? | 100, 200 et 300 |
| Le survol garde-t-il 4,5:1 : 200 à 0,92, survol à 3:1, ou survol hors de la garantie 3 ? | Ouvert |
| L'appui sort-il aussi de la garantie 1, pour `solid/pressed` ? | Ouvert |
| Quelle organisation des noms : A, B ou C ? | Ouvert, A recommandée |
| `surface/divider` entre-t-il dans le thème ? | Ouvert |
| L'anneau de focus a-t-il une variante sur fond teinté, ou la table Dark change-t-elle ? | Ouvert |
| Quelle table pour le thème Dark ? | Ouvert |
| Que deviennent les thèmes inversés en Light ? | Non mesuré |
