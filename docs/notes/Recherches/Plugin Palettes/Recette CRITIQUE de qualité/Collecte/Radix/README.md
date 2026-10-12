# Relevé Radix Themes et Radix Colors

Cette collecte fige `@radix-ui/themes@3.3.0` et `@radix-ui/colors@3.0.0`, publiés sur npm. `fetch.ps1` les télécharge depuis les URL exactes, vérifie le SHA-256 de chaque archive, puis extrait uniquement les feuilles CSS et licences utiles. Le script utilise PowerShell et `tar`; il n’installe aucun paquet dans le monorepo.

`releve.json` contient huit cas soft pour Badge et Callout, deux états de thème et quatre couleurs choisies comme témoins. Il contient aussi quatre cas solid pour Badge. Les témoins blue, green, amber et red représentent ici info, success, warning et error pour comparer des couleurs. Radix expose ces familles et une prop `color`; sa documentation ne leur attribue pas ces sémantiques.

Les valeurs des cas suivent les déclarations CSS : pour `soft`, le fond est `--accent-a3` puis `--{couleur}-a3`; le texte est `--accent-a11` puis `--{couleur}-a11`. L’alpha vient des huit chiffres hexadécimaux publiés, sans composition sur un fond. Callout n’a pas de prop de titre distincte dans la feuille CSS. Son icône hérite de la couleur du texte. Ces deux variantes soft ne déclarent pas de bordure. Badge `solid` utilise `--accent-9` et `--accent-contrast`.

Les surfaces de support sont le fond de page (`--color-background`) et le panneau opaque (`--color-panel-solid`). En thème clair, les deux valent blanc. En thème sombre, ils suivent `--gray-1` et `--gray-2`. Le panneau translucide (`--color-panel-translucent`) dépend lui-même de l’arrière-plan; le relevé ne le traite donc pas comme une surface de fond indépendante.

Badge a une taille par défaut `1` et Callout `2`. Badge taille 1 prend `--font-size-1`, `--line-height-1` et `--letter-spacing-1`; son poids est `--font-weight-medium`. Callout taille 2 expose le `line-height-2` pour la hauteur de son icône; le texte demeure un paragraphe stylé par le contexte typographique. Les variables d’échelle sont résolues à 100 % seulement si un thème ne remplace pas `scaling`. Les extraits CSS retenus ne contiennent pas de capture native : les résultats décrivent la cascade statique, sans rendu navigateur vérifié.

Les sources `.txt` conservent les feuilles publiées sous des noms qui évitent leur inclusion dans les contrôles locaux de code et de style. `releve.json` donne pour chaque fichier son URL de paquet, sa révision et son SHA-256. Les licences des deux paquets sont dans `sources/`.

La documentation officielle consultée : [Badge](https://www.radix-ui.com/themes/docs/components/badge), [Callout](https://www.radix-ui.com/themes/docs/components/callout), [système de couleurs Themes](https://www.radix-ui.com/themes/docs/theme/color). La collecte des valeurs provient des archives npm versionnées, et non des pages rendues.
