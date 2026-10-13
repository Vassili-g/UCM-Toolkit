# Élévation et surfaces en thème sombre

> Remplacé en partie par le modèle des niveaux de la
> [solution des rampes](../../Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/SOLUTION-RAMPES.md) (S2 et S3) : la page Dark reste un gris très
> sombre (cran 50 abaissé à L 0,145, `#0A0A0A` par défaut) et non le noir ; le
> texte des fonds Dark vaut 900, ou 950 au choix du mainteneur ; les fonds
> teintés Dark 200, 300 et 400, la carte au neutre 100 et le focus 800 sont
> repris ; le focus devient `ring` dans chaque dossier, ce qui change les
> contrats. Les mesures ci-dessous restent valables pour la piste qu'elles
> décrivent.

**Statut : proposition mesurée, à valider dans Figma.** Les mesures simulent
des alias ; elles ne modifient ni Figma, ni les paquets, ni les tokens des
dépôts consommateurs.

Pour comparer les trois pistes et les travaux attendus d’un agent, lire
[PASSATION-AGENT.md](./PASSATION-AGENT.md).

En sombre, `theme.elevation.raised` et
`theme.neutral.surface.default` aboutissent tous deux à
`primitives.colors.titanium.dark.100` (`#1A1C1F`). Une pastille au repos qui
utilise cette surface se confond donc avec une carte élevée de la même couleur.
La proposition sépare la page, la carte et les surfaces, tout en gardant une
table d’états commune aux onze palettes.

## Proposition

Garder les alias des composants et `theme.elevation`. En sombre, faire viser
la page par `primitives.colors.titanium.black` et la carte par
`color-utilities.neutral.dark.100`. Décaler les surfaces de chaque palette
d’un cran : repos à 200, survol à 300 et appui à 400. Placer le texte et le
contour de surface au cran 950, puis le focus au cran 800. Le thème clair ne
change pas.

| Variable | Light, conservé | Dark actuel | Dark proposé |
|---|---|---|---|
| `elevation/page` | `colors.titanium.light.50` | `colors.titanium.dark.50` | `colors.titanium.black` |
| `elevation/raised` | `colors.titanium.white` | `colors.titanium.dark.100` | `color-utilities.neutral.dark.100` |
| `neutral/surface/default` | `neutral.light.100` | `neutral.dark.100` | `neutral.dark.200` |
| `neutral/surface/hover` | `neutral.light.200` | `neutral.dark.200` | `neutral.dark.300` |
| `neutral/surface/pressed` | `neutral.light.300` | `neutral.dark.300` | `neutral.dark.400` |
| `*.surface/foreground` | `*.light.800` | `*.dark.900` | `*.dark.950` |
| `*.surface/border` | `*.light.800` | `*.dark.900` | `*.dark.950` |
| `*.page/focus` | `*.light.600` | `*.dark.700` | `*.dark.800` |

La même table s’applique aux onze palettes d’usage et aux deux marques. La
proposition décale 55 alias de surface et 11 alias de focus dans `theme`, plus
les deux alias partagés d’élévation. Elle n’ajoute pas de condition selon le
nom ou le type de palette.

## Mesures sur les tokens fournis

[tokens-source.json](./tokens-source.json) est une copie de l'export fourni
par le mainteneur. Son empreinte SHA-256 figure dans
[MESURES-TOKENS-REELS.json](./MESURES-TOKENS-REELS.json).
L'export contient deux marques, deux thèmes et onze palettes d'usage.
Il contient déjà `theme` et les deux niveaux d'élévation.

Les exports présents dans les dépôts Playground et Intencial Library sont
différents : ils déclarent encore le seul axe `color-brand-tokens` et aucun
axe `theme`. Ils ne servent pas de preuve aux couleurs ci-dessous.

| Mesure du neutre sombre | Actuel | Proposition |
|---|---|---|
| Page | `#111213` | `#000000` |
| Carte | `#1A1C1F` | `#1A1C1F` |
| Pastille au repos | `#1A1C1F` | `#25282E` |
| Pastille au survol | `#25282E` | `#31363E` |
| Pastille à l’appui | `#31363E` | `#404855` |
| Contraste pastille au repos / carte | 1,00:1 | 1,16:1 |
| Contraste carte / page | 1,10:1 | 1,23:1 |

Les trois fonds ont maintenant des valeurs différentes. Le contraste de
1,16:1 entre la pastille au repos et la carte reste faible ; les valeurs seules
ne garantissent pas la perception sur toutes les tailles et tous les écrans.
La maquette Figma doit confirmer la séparation visuelle.

Le contrôle couvre 968 couples par option : onze palettes, deux marques et
deux thèmes. Il reprend G1 à G7 et ajoute la carte comme support à G2–G7. Les
seuils sont 4,5:1 pour le texte et 3:1 pour les autres couples.

| Option simulée sur l'export | Couples sous leur seuil | Conséquence |
|---|---:|---|
| Alias actuels | 0 / 968 | La pastille neutre reste confondue avec la carte |
| `raised` sombre à 50 | 0 / 968 | La carte prend exactement la couleur de la page |
| `raised` sombre à 200 | 16 / 968 | Fonds pleins et focus perdent du contraste sur la carte |
| Surfaces du seul neutre à 200 / 300 / 400, texte 900 | 0 / 968 | Écart plus marqué, mais règle spécifique au neutre dans Palettes |
| Toutes les surfaces sombres à 200 / 300 / 400, texte 900 | 14 / 968 | Régressions de focus et de texte sur certaines palettes |
| Proposition : page noire, carte 100, surfaces 200/300/400, partenaires 950, focus 800 | 0 / 968 | Table commune, contraste repos/carte de 1,16:1 |

Le cran 950 est nécessaire : avec les partenaires au cran 900, le texte de
`warning/vivid` sur l’appui tombe à 4,12:1. Les mesures de la proposition
utilisent 950 pour le texte et le contour.

Les mesures générales du moteur, dans
[MESURES-ELEVATION.json](./MESURES-ELEVATION.json), couvrent quatre
combinaisons de thème et de sens, 360 teintes aux parts 0,45 et 0,95, un gris,
puis quatorze références à une ou deux intensités. En sombre, le balayage et
les références ne trouvent aucun nouvel échec. Un cas déjà présent reste au
thème sombre inversé : `solid/default` sur carte atteint 2,994:1, comme avec
les alias actuels. La proposition retire dans ce contexte l’échec de focus sur
carte. En clair, les deux échecs de focus de la référence verte sous 3:1 restent
identiques à l’actuel ; la proposition ne modifie pas le thème clair.

L’absence de nouvel échec porte sur cet export, ces recettes et ce balayage.
Elle ne prouve pas toutes les compositions de composants ni toutes les recettes
possibles.

## Conséquences pour les outils

Les références de composants, le format DTCG et les contrats restent
identiques. La modification des alias seule rendrait toutefois les sorties de
Palettes incorrectes : `TABLE_DES_DOSSIERS` publie les crans 100/200/300 pour
les trois surfaces et choisit les partenaires selon le sens du thème, sans
distinguer Light et Dark.

Pour adopter ces alias, Palettes doit recevoir la même table sombre pour les
onze palettes. Cette table doit distinguer le mode du sens du thème : en Dark,
surfaces 200/300/400, texte et contour 950, focus 800 ; en Light, mappings
actuels inchangés. Les lecteurs de cette table, les crans requis et leurs
tests doivent évoluer avec elle. La règle reste commune à toutes les palettes,
y compris `neutral`.

Les mesures de ce dossier vérifient les couleurs des tokens et le moteur avec
la table cible. Elles ne remplacent pas les changements ni les tests de
Palettes. Exporter, CLI et Token Explorer ne demandent pas de cas spécial ; ils
doivent continuer de résoudre les alias et les modes publiés.

Le Playground peut éprouver le cas d'usage après migration des tokens et de
Palettes : afficher la même pastille neutre sur la page et dans une carte, aux
trois états, dans les deux thèmes et marques. La bibliothèque de tokens peut
valider les alias, mais son contrôle actuel ne prouve pas la visibilité dans
un composant.

## Limites à vérifier

La simulation ne mesure pas la perception visuelle et ne décrit ni les ombres,
ni les bordures, ni les imbrications réelles. Dans Figma, valider la distinction
page/carte et carte/surface au repos, au survol et à l’appui. Vérifier aussi les
focus colorés, les états désactivés et les champs posés sur une carte. Si
l’écart visuel reste insuffisant, tester une bordure ou une ombre et mesurer
cette composition dans les mêmes contextes.

## Reproduire et relire

Depuis la racine de Toolkit :

```powershell
npx tsx "docs\notes\Recherches\Archi Tokens Multi-marques\Elevation et surfaces\mesurer-tokens-reels.ts"
npx tsx "docs\notes\Recherches\Archi Tokens Multi-marques\Elevation et surfaces\mesurer-elevation.ts"
```

Le premier script suit les alias dans chaque contexte de marque et de thème.
Il refuse les cycles, les références absentes et les couleurs hors du périmètre
sRGB opaque. Il arrondit les composantes à l'octet, comme le relevé de Palettes.
Il produit aussi les données du
[comparatif d'élévation et de surfaces](./COMPARATIF-ELEVATION-SURFACES.html).

[CHANGEMENTS-PAR-PROJET.md](./CHANGEMENTS-PAR-PROJET.md) distingue la correction
des alias et les vérifications des dépôts consommateurs. L'[architecture de
référence](../ARCHITECTURE-FINALE-MULTIMARQUES.md) reste inchangée jusqu'à
l'adoption de la proposition.
