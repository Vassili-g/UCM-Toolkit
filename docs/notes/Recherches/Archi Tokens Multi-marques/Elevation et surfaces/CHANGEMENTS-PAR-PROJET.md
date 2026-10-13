# Changements par projet

> Remplacé en partie par le modèle des niveaux de la
> [solution des rampes](../../Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/SOLUTION-RAMPES.md) (S2 et S3) : la page Dark reste un gris très
> sombre (cran 50 abaissé à L 0,145, `#0A0A0A` par défaut) et non le noir ; le
> texte des fonds Dark vaut 900, ou 950 au choix du mainteneur ; les fonds
> teintés Dark 200, 300 et 400, la carte au neutre 100 et le focus 800 sont
> repris ; le focus devient `ring` dans chaque dossier, ce qui change les
> contrats. Les mesures ci-dessous restent valables pour la piste qu'elles
> décrivent.

Cette proposition distingue le fond de page, les cartes et les surfaces en
thème sombre. Les scripts simulent le résultat ; Figma et les dépôts
consommateurs ne sont pas modifiés.

## Fichier Figma du design system

| Où | Changement | Vérification |
|---|---|---|
| `color-utilities.elevation.dark.page` | Faire viser `primitives.colors.titanium.black` | Relire la page dans les deux marques |
| `color-utilities.elevation.dark.raised` | Faire viser `color-utilities.neutral.dark.100` | Vérifier la séparation carte/page et carte/surface |
| `theme.*.surface.default` | Passer les onze alias sombres au cran 200 | Mesurer repos/carte et G3/G4 sur les deux supports |
| `theme.*.surface.hover` | Passer les onze alias sombres au cran 300 | Mesurer les états sur page et carte |
| `theme.*.surface.pressed` | Passer les onze alias sombres au cran 400 | Mesurer les états sur page et carte |
| `theme.*.surface.foreground` et `border` | Passer les vingt-deux alias sombres au cran 950 | Vérifier les seuils texte et contour |
| `theme.*.page.focus` | Passer les onze alias sombres au cran 800 | Vérifier G7 sur page, carte et surface au repos |
| `theme.elevation` et tokens de composants | Garder les alias et références | Contrôler l’export et la résolution DTCG |

La proposition change 66 alias de surfaces et de focus dans `theme` et deux
alias d’élévation partagés. Elle conserve les identifiants, les axes et les
références des composants. La table de surfaces s’applique aux onze palettes et
aux deux marques ; elle n’introduit pas d’exception pour le neutre.

Le fichier `tokens-source.json` est identique octet pour octet au fichier
fourni pour cette analyse. Les deux empreintes SHA-256 valent
`4b52f506383c19cb60a460f0df7afb9f32bbd58b7962694f200fdb8ab36716c0`.

## Toolkit

Le format DTCG, les contrats et les recettes ne changent pas. Palettes doit
changer avec les alias : `TABLE_DES_DOSSIERS` dépend aujourd’hui du sens du
thème, pas du mode Light/Dark. Ajouter la dimension du mode pour que Dark
emploie les crans 200/300/400, les partenaires 950 et le focus 800, tandis que
Light garde ses mappings actuels.

Mettre à jour tous les lecteurs de cette table, le calcul des crans requis,
ainsi que les tests des promesses, garanties et variables produites. Appliquer
la même table aux onze palettes, y compris `neutral`. Vérifier aussi les
garanties sur les fonds de page et de carte.

Exporter, CLI et Token Explorer ne demandent pas de cas spécial. Ils doivent
continuer de résoudre les alias et les modes tels qu’ils sont publiés.

## UCM Playground

L’export local du Playground ne contient pas encore `theme`. Après migration :

1. afficher la même pastille neutre sur la page et dans une carte ;
2. éprouver repos, survol, appui, focus et état désactivé dans les deux thèmes
   et les deux marques ;
3. régénérer le CSS, contrôler les contrats et relire les compositions dans le
   navigateur.

La scène confirme la distinction visuelle dans un composant réel. Elle ne
remplace pas les contrôles de contraste ni la vérification des références.

## Intencial Library

L’export local ne contient pas encore `theme` et le dépôt ne porte pas
d’implémentation de composant. Après migration, publier les alias relus depuis
Figma et lancer `ucm check`. Ce contrôle valide les références et les
contrastes qu’il sait juger ; il ne prouve pas la distinction visuelle entre
les surfaces dans une carte.

## À l’adoption

- Mettre à jour l’architecture de référence avec les cibles de page, carte,
  états de surface, partenaires et focus.
- Étendre la table commune de Palettes au mode de thème sans créer de branche
  propre à `neutral`.
- Contrôler les 66 alias sombres de `theme` et les deux alias partagés
  d’élévation pour les deux marques.
- Relire les états dans Figma et dans le Playground, y compris les cartes
  imbriquées et les champs.
- Vérifier que l’export et le CSS conservent les références et les axes.

Ne pas modifier les tokens de production avant la mise à jour coordonnée de
Palettes et la validation visuelle dans Figma et dans le Playground.
