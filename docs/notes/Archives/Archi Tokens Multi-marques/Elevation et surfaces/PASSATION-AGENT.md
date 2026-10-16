# Passation : élévation et surfaces

> Remplacé en partie par le modèle des niveaux de la
> [solution des rampes](../../Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/SOLUTION-RAMPES.md) (S2 et S3) : la page Dark reste un gris très
> sombre (cran 50 abaissé à L 0,145, `#0A0A0A` par défaut) et non le noir ; le
> texte des fonds Dark vaut 900, ou 950 au choix du mainteneur ; les fonds
> teintés Dark 200, 300 et 400, la carte au neutre 100 et le focus 800 sont
> repris ; le focus devient `ring` dans chaque dossier, ce qui change les
> contrats. Les mesures ci-dessous restent valables pour la piste qu'elles
> décrivent.

## Question à trancher

En thème sombre, `theme.elevation.raised` et
`theme.neutral.surface.default` valent tous deux `#1A1C1F`. La carte et une
surface neutre au repos se confondent. Toute solution qui change les alias de
surface doit rester synchronisée avec UCM Palettes et s’appliquer aux onze
palettes, dont `neutral`.

Ne pas appliquer les mappings proposés aux tokens de production avant d’avoir
choisi une piste et validé son effet dans Figma et dans le Playground.

## Piste 1 : faire évoluer la table commune de Palettes

Garder les références de composants et `theme.elevation`. En sombre, utiliser :

| Usage | Cran |
|---|---:|
| Surface au repos | 200 |
| Surface au survol | 300 |
| Surface à l’appui | 400 |
| Texte et contour de surface | 950 |
| Focus | 800 |

La table s’applique aux onze palettes et aux deux marques. En clair, les
mappings restent inchangés. Cette piste exige que Palettes distingue le mode
Light/Dark en plus du sens normal/inverse.

Dans Toolkit, examiner `packages/kit/src/emplois/dossiers.ts`,
`packages/couleur/src/promesses.ts`, `packages/couleur/src/garantie.ts`,
`packages/couleur/src/nuances.ts`, les lecteurs de `TABLE_DES_DOSSIERS` et
leurs tests. Mettre à jour les crans requis, la validation, les promesses et
les palettes produites avec la même table. Vérifier les garanties sur les
fonds page et carte.

Mesures déjà faites sur `tokens-source.json` : 0 échec sur 968 couples. Le
balayage et les références du moteur ne révèlent aucun nouvel échec sombre.
Un cas sombre inversé reste à 2,994:1 pour `solid/default` sur carte, comme
dans la mesure actuelle. La surface neutre au repos et la carte ont un ratio
de 1,16:1 ; la validation visuelle reste nécessaire.

## Piste 2 : garder la table et marquer les cartes autrement

Garder les alias de surface actuels et la table de Palettes inchangée. Distinguer
la carte par un contour ou une ombre, ou par un autre indice visuel hors de la
couleur de remplissage.

Établir où cet indice doit vivre dans les tokens et dans les composants.
Vérifier son export, sa présence dans les contrats, son rendu dans les
compositions et les moyens de le tester. Aucune mesure n’a encore été faite
pour cette piste.

## Piste 3 : choisir un fond d’élévation distinct

Garder les surfaces des palettes inchangées et donner à `elevation/raised` une
couleur commune indépendante des rampes. Mesurer cette couleur contre toutes
les palettes et tous les états utilisés dans les cartes.

Deux valeurs testées avec une page noire échouent sur les tokens fournis :
`raised` au cran 200 donne 16 échecs sur 968 couples ; au cran 300, 54. Ces
valeurs ne sont pas des choix validés. Chercher une autre couleur de support ou
combiner cette piste avec un contour, puis mesurer les contrastes et le rendu
réel.

## Mesures et comparatif

Depuis la racine de Toolkit, lancer :

```powershell
npx tsx "docs\notes\Recherches\Archi Tokens Multi-marques\Elevation et surfaces\mesurer-tokens-reels.ts"
npx tsx "docs\notes\Recherches\Archi Tokens Multi-marques\Elevation et surfaces\mesurer-elevation.ts"
```

Les résultats se trouvent dans `MESURES-TOKENS-REELS.json` et
`MESURES-ELEVATION.json`. `COMPARATIF-ELEVATION-SURFACES.html` visualise les
couleurs de l’option de table commune ; vérifier ou étendre ses options si une
autre piste est retenue.

Le fichier de tokens mesuré est `tokens-source.json`. Son empreinte SHA-256 est
`4b52f506383c19cb60a460f0df7afb9f32bbd58b7962694f200fdb8ab36716c0`. Les
exports locaux du Playground et d’Intencial Library ne contiennent pas encore
l’axe `theme` ; ils ne valident donc pas ces mappings.

## Résultat attendu de l’étude

Comparer les trois pistes selon les modifications nécessaires dans Figma,
Toolkit, les composants et les contrôles. Présenter les écarts de contraste et
les limites de perception. Recommander une piste seulement après avoir établi
que la table de Palettes, les alias publiés et les couleurs effectivement
rendues restent synchronisés.
