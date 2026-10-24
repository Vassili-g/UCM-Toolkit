# Crans clairs des palettes

Le mainteneur a testé ses palettes sur ses composants, en conditions réelles.
Ses remarques touchent quatre parties d'UCM : le moteur de couleur, la table
qui affecte un cran à chaque variable, le nom des variables et l'architecture
des tokens. Le mainteneur juge ces sujets liés : une solution doit les traiter
ensemble.

**État.** Réflexion ouverte. Aucune solution n'est décidée.

| Document | Contenu |
|---|---|
| [Maquettes/MAQUETTE-CRANS-CLAIRS.html](./Maquettes/MAQUETTE-CRANS-CLAIRS.html) | Une section par sujet : remarques, faits, rendu réel des solutions sur des composants, contrastes |
| [Mesures/palettes-et-reglages.json](./Mesures/palettes-et-reglages.json) | La configuration d'UCM Palettes du mainteneur : douze palettes et leurs réglages |
| [Mesures/generer-donnees.ts](./Mesures/generer-donnees.ts) | Calcule les rampes de cette configuration sous sept courbes : depuis `Mesures/`, `npx tsx generer-donnees.ts > ../Maquettes/donnees-crans.js` |
| [Maquettes/donnees-crans.js](./Maquettes/donnees-crans.js) | Les rampes calculées, lues par la maquette |

Les mesures portent sur les douze palettes du mainteneur, soit 21 rampes en
Soft et en Vivid. Elles portent sur le thème Light normal, sauf mention
contraire.

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

## Table actuelle de `surface`, en Light normal

| Variable | Cran |
|---|---|
| `surface/default` | 100 |
| `surface/hover` | 200 |
| `surface/pressed` | 300 |
| `surface/foreground` | 800 |
| `surface/border` | 800 |
| `page/foreground`, `page/border` | 700 |

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

**Position du mainteneur.** Baisser la saturation rend les palettes trop fades.
Cette piste est écartée.

**Pistes de courbe**, clartés du 50 au 300 :

| Courbe | Clartés | Écart médian 100 → 200 | Écart médian 300 → 400 |
|---|---|---|---|
| Actuelle | 0,975 / 0,95 / 0,905 / 0,845 | 0,044 | 0,084 |
| Légère | 0,98 / 0,96 / 0,925 / 0,875 | 0,035 | 0,113 |
| Moyenne | 0,983 / 0,965 / 0,935 / 0,89 | 0,029 | 0,127 |
| Forte | 0,986 / 0,972 / 0,948 / 0,91 | 0,024 | 0,147 |

### Le lissage du 300 au 400

> « il faudrait lisser pour pas avoir la cassure entre 300 et 400 (quels
> impacts?) »

Le lissage éclaircit le 400 et le 500. Il laisse le 600 et les crans plus
foncés tels quels.

| Courbe lissée | 400 | 500 | Écart médian 300 → 400 | Écart médian 500 → 600 |
|---|---|---|---|---|
| Légère lissée | 0,79 | 0,695 | 0,083 | 0,109 |
| Moyenne lissée | 0,80 | 0,70 | 0,089 | 0,115 |
| Forte lissée | 0,815 | 0,71 | 0,093 | 0,123 |

Impacts mesurés :

- Une référence peut changer de cran. Le cran le plus proche de sa clarté
  change. Poppy passe du 500 au 600 avec les trois courbes lissées. Sky passe
  du 400 au 500 avec la courbe forte lissée.
- Le 400 et le 500 perdent du contraste sur le blanc. Avec la courbe moyenne,
  le 500 de Poppy passe de 3,74 à 2,90. Aucune variable du thème Light ne vise
  ces crans. Un designer qui les emploie comme primitives les verra plus
  clairs.
- La cassure se déplace en partie entre le 500 et le 600.
- `solid`, l'anneau de focus, les textes et le thème Dark ne changent pas.
- Le 500 porte `disabled/foreground` et `disabled/border`. Ces deux couleurs
  s'éclaircissent.

## 2. Un même cran doit avoir la même clarté dans toutes les palettes

> « Je suis pas encore sur de passer les surfaces sur les crans à partir de 50.
> et si on faisait ça il faudrait vérifier que toutes les teintes soient
> harmonisée à la perfection sur le cran 50 pour pas avoir des différence de
> luminosité perçue entre deux teintes sur ce cran. car ça se voit beaucoup »

**Constat.** Avec le moteur actuel et la courbe actuelle, les 50 des palettes
du mainteneur vont de 0,895 à 1,000 de clarté. Les 100 vont de 0,871 à 0,972.
Les 200 vont de 0,827 à 0,921.

**Piste : la clarté commune des crans clairs.** Le 50, le 100 et le 200 de
chaque palette prennent la clarté de la courbe. Le décalage selon la teinte et
le réglage de luminosité de la carte ne s'y appliquent plus. Le 300 et le 400
font la transition. La teinte et la part de saturation de chaque cran restent
celles du moteur. Le cran de la référence ne change pas.

La maquette simule cette piste hors du moteur. L'écart de clarté entre les
palettes tombe à 0,002 sur le 50, le 100 et le 200. Le 50 de Sun et de Grass
retrouve une teinte.

Dans le moteur, cette piste demanderait de ne plus appliquer `decalageDe` ni le
décalage selon la teinte aux crans clairs.

## 3. La différence entre `page` et `surface`

> « quelle est la différence entre page et surface si on peut mettre des
> background sur les deux ? leur usage devient flou »

**Constat.** Aujourd'hui, `page` n'a pas de fond et `surface` est un fond
teinté. Cette définition sépare les deux dossiers.

**Piste écartée.** Donner à `page` ses propres fonds rend floue la différence
entre les deux dossiers.

## 4. Le texte de `surface`

> « je trouve le texte à 800 déjà trop foncé dans /surface donc un texte à 800
> sur /paraitra presque sans teinte. A vrai dire j'aimerais beaucoup que le
> texte de /surface soit aussi à 700 pour toutes les couleurs. »
>
> « d'un côté le texte 800 rend bien aussi. Même sur un fond 100, mais ton fond
> 100 est plus clair que mon fond ocean 100. »

**Constat.** Le fond 100 d'Ocean Vivid est plus foncé à cause du réglage de
luminosité du sujet 1.

Contraste minimum du texte 700 sur les palettes du mainteneur, moteur actuel :

| Courbe | Sur 50 | Sur 100 | Sur 200 | Sur 300 |
|---|---|---|---|---|
| Actuelle | 5,28 | 4,91 | 4,34 (6/21 sous 4,5) | 3,63 |
| Légère | 5,33 | 5,06 | 4,60 | 3,98 |
| Moyenne | 5,39 | 5,12 | 4,74 | 4,15 |
| Forte | 5,44 | 5,23 | 4,90 | 4,40 |

Le texte 800 passe 4,5:1 sur tous ces fonds, avec toutes les courbes.

## 5. Le contraste à l'appui

> « on s'en fiche que les contrastes ne passent pas sur un état pressed qui ne
> dure qu'une demi seconde non ?? il y'a vraiment des règles d'accessibilité
> pour ça ?? »
>
> « je pense qu'il faut laisser tomber les checks de contraste sur le fond
> pressed 300, j'estime que c'est pas utile, tant pis pour les normes (qui sont
> vagues à ce sujet) »

**Constat.** Le critère WCAG 1.4.3 demande 4,5:1 pour tout texte affiché, et
3:1 pour le grand texte. Ses exceptions sont les éléments inactifs, la
décoration et les logos. Le critère 3.2 du RGAA applique la même règle.

Le plugin vérifie aujourd'hui la table en place. Sa garantie 3 contrôle
`surface/foreground` sur `surface/default`, `surface/hover`, `surface/pressed`
et la page. Sa garantie 4 contrôle `surface/border` sur les mêmes fonds. Le
texte 800 passe partout. Les échecs mesurés aux sujets 4 et 6 portent sur des
hypothèses qui ne sont pas en place.

**Position du mainteneur.** L'appui sort des vérifications de contraste.

**Conséquence.** Il faudrait retirer `surface/pressed` des garanties 3 et 4.
La question se pose aussi pour `solid/pressed` dans la garantie 1.

## 6. Le survol du bouton texte part du blanc

> « on a le button type text qui n'a pas de fond. En hover on lui affecte un
> surface/hover (logique) mais c'est hyper foncé alors qu'on partait du fond
> blanc, c'est beaucoup plus beau de partir de surface/default mais ça
> casserait la logique : probleme »

**Pistes.**

- Table décalée : `surface` en 50, 100 et 200. Le survol vaut 100 et le nom
  suit l'état. Avec un texte 800, cette table passe 4,5:1 à tous les états,
  appui compris, sur les palettes du mainteneur.
- Courbe éclaircie : le 200 se rapproche du 100 actuel.
- Survol translucide. Le mainteneur n'en est pas convaincu.

## 7. Un fond vraiment léger

> « on a des alert de type "outlined" sur lesquelles j'aimerais qu'il y ait un
> fond de couleur très très léger. »
>
> « je trouve que tous les fonds proposés sont trop foncés pour un fond
> "léger"... il y'a bien un problème de logique global, tous les sujets sont
> connectés, il faut trouver la bonne solution »

**Constat.** Les fonds proposés jusqu'ici héritent des deux décalages du sujet
1. Le 50 d'Ocean Vivid est à 0,895, plus foncé que le 200 de la plupart des
autres palettes.

**Outil.** La maquette porte un curseur qui fixe la clarté du fond léger de
toutes les palettes, de 0,95 à 0,995. Chaque fond garde la teinte et la part de
saturation du 50 de sa palette. Le mainteneur y choisit la clarté qu'il juge
légère.

**Pistes.**

- Un fond léger de plus dans `surface`, à une clarté commune. Il coûte une
  variable par palette.
- La table décalée, où le repos de `surface` vaut 50.

## 8. Les éléments sans survol

> « oui mais si on veut l'utiliser pour des éléments sans survol ? ou si c'est
> pas grave si le survol est faible ? »
>
> « c'est très beau en version décalé, c'est subtile Mais le brief parlait
> d'éléments sans survols. »

**Constat.** Une étiquette, un tag ou un encart n'ont pas de survol. Seul leur
fond au repos compte. La maquette les montre pour chaque table.

**Position du mainteneur.** Le survol de la table décalée, de 50 à 100, est
subtil et lui plaît.

## 9. Un composant conçu sur la page, posé dans une alerte teintée

> « un bouton texte est défini dans ses variantes, dans ses variantes, le
> bouton text est posé sur une page, donc quand il est dans une alert teinte
> il a toujours ce problème qu'il devient posé sur un contexte différent de
> celui sur lequel il a été conçu. C'est un autre problème à résoudre. »

| Piste | Mécanisme | Coût |
|---|---|---|
| Variante par contexte | Une variante « sur surface » du composant, comme la propriété `staticColor` des boutons de Spectrum | Les variantes se multiplient. Le designer choisit la bonne. |
| Mode du conteneur | L'alerte pose un mode Figma sur son cadre, et les variables de ses enfants changent de valeur | Une collection de plus. Le designer pose ce mode à la main : ce geste demande d'être discuté avant toute conception. |
| Survol translucide | Le même fond à opacité réduite sur tous les conteneurs | Le mainteneur n'en est pas convaincu. |
| Texte et contour communs | `page` et `surface` partagent le même cran de texte et de contour | Le fond de survol reste à traiter. |

## 10. Les noms des variables

> « default, hover, pressed : désigne des états. Pratique pour pas se tromper
> mais c'est pas harmonisé avec les autres termes. Idées : background-base,
> background-hover, background-pressed ? foreground, border : désigne des
> éléments »
>
> « on ne peut pas appliquer solid/default à un contour, un contour est soit
> posé sur une surface et il se trouve donc sur /surface soit il est posé sur
> la page donc il se trouve dans page. »

**Position du mainteneur.** Ce sujet dépend des autres. Le mainteneur y
réfléchit encore.

**Constats.**

- Dans `surface`, trois noms désignent un état et deux noms désignent un
  élément.
- Un contour appartient au dossier du fond sur lequel il est posé. `solid` n'a
  donc pas de contour. Le kit donne pourtant à `solid/default`, `solid/hover`
  et `solid/pressed` la portée `STROKE_COLOR` et l'emploi `border`.
- Un fond léger serait un niveau. `default`, `hover` et `pressed` sont des
  états.

| Forme | Exemple | Effet |
|---|---|---|
| A | `background`, `background-hover`, `background-pressed`, `foreground`, `border` | L'élément, puis l'état. Le repos n'a pas de suffixe. |
| A bis | `background-base`, `background-hover`, `background-pressed` | Idée du mainteneur. Le repos porte un suffixe. |
| B | Noms actuels | Aucune migration. La règle des dossiers s'écrit dans la documentation. |
| C | `background/solid`, `foreground/surface` | Le dossier passe en second. |

## 11. Le thème Dark et les thèmes inversés

**Constat.** La configuration du mainteneur a sa propre courbe Dark et un fond
de page `#121212`. La table actuelle de `surface` en Dark vaut 300, 400 et
500, avec un texte 950.

| Table Dark | Repos | Survol | Appui |
|---|---|---|---|
| Actuelle : 300, 400, 500, texte 950 | 9,47 | 7,17 | 5,77 |
| 200, 300, 400, texte 900 | 7,82 | 6,44 | 4,94 |
| 100, 200, 300, texte 800 | 4,61 | 4,03 (2/21 sous 4,5) | 3,39 |

Les thèmes inversés ne sont pas mesurés.

## Questions ouvertes

1. Le réglage de luminosité d'une palette doit-il épargner les crans clairs ?
2. Le 50, le 100 et le 200 prennent-ils une clarté commune à toutes les
   palettes ?
3. Quelle courbe du bas retenir, et avec ou sans lissage du 400 et du 500 ?
4. Quelle clarté pour un fond léger ?
5. Le texte de `surface` reste-t-il à 800 ou passe-t-il à 700 ?
6. Quelle table pour `surface` : 100, 200 et 300, ou 50, 100 et 200 ?
7. L'appui sort-il aussi de la garantie 1, pour `solid/pressed` ?
8. Quel nom pour le fond léger, et quelle grammaire pour les noms ?
9. Comment traiter un composant conçu sur la page et posé dans une alerte
   teintée ?
10. Quelle table pour le thème Dark, et que deviennent les thèmes inversés ?
