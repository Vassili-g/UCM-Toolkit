# Texte des boutons en Light et en Dark

Dossier de recherche d'UCM Palettes : le texte des boutons en blanc ou en noir
purs, choisi par thème pour tout le design system, et ce que ce choix impose
au bouton, au texte coloré, aux contours et à la courbe du thème. Aucune
implémentation.

**État.** Le mainteneur a validé le principe : texte blanc ou
noir purs, un choix par thème dans les Réglages communs, bouton à la 700,
rampe recalculée. La règle du thème inversé est reprise par la
[recherche sur la collection `usage`](../../Archi%20Tokens%20Multi-marques/Collection%20usage/RECHERCHE-COLLECTION-USAGE.md),
section 4.1, et par le fichier Figma remappé. Les choix de moteur et
d'interface sont tranchés ; reste le plan d'implémentation.

| Document | Contenu |
|---|---|
| [TEXTE-DES-BOUTONS.html](./TEXTE-DES-BOUTONS.html) | Le point d'entrée : choix effectués, règle du thème inversé sur six palettes, choix à prendre, maquette du réglage dans les Réglages communs |
| [Dossier de recherche](./DOSSIER-TEXTE-DES-BOUTONS.md) | Le raisonnement, les mesures du second tour, les systèmes comparés et les sources |
| [Mesures](./Mesures/) | [mesurer-courbe-du-texte.ts](./Mesures/mesurer-courbe-du-texte.ts) et [MESURES-COURBE-DU-TEXTE.json](./Mesures/MESURES-COURBE-DU-TEXTE.json) : courbe recalculée et table du thème inversé ; [generer-texte-des-boutons.ts](./Mesures/generer-texte-des-boutons.ts) écrit les couleurs de la page |
| [Archives](./Archives/README.md) | Notes de recette, première recherche, premier tour S1 à S6 et première maquette du thème inversé |

Depuis la racine du dépôt :

```sh
npx tsx "docs/notes/Recherches/Plugin Palettes/Texte des boutons/Mesures/mesurer-courbe-du-texte.ts"
npx tsx "docs/notes/Recherches/Plugin Palettes/Texte des boutons/Mesures/generer-texte-des-boutons.ts"
```
