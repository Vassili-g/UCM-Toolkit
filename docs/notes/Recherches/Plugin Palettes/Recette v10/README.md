# Recette v10 d'UCM Palettes

Dossier des retours du mainteneur sur le nuancier de Création et de
Vérification, et sur l'onglet Harmonisation : nom de l'onglet, alerte des
palettes trop proches, messages qui déplacent la page, zones hachurées pendant
un glisser, taille de la roue des teintes.

**État.** R2 à R6 sont implémentés, recette Figma à faire. R1 (nom des
palettes décalé entre Création et Vérification) est abandonné : les 47 px restent.

| Document | Contenu |
|---|---|
| [DOSSIER-RECETTE-V10.md](./DOSSIER-RECETTE-V10.md) | Les points R1 à R6 : demande, constat dans le code, proposition, décision ; les lots qui suivent les décisions |
| [Maquettes/MAQUETTE-RECETTE-V10.html](./Maquettes/MAQUETTE-RECETTE-V10.html) | Trois maquettes sur les écrans figés de la galerie : messages à hauteur tenue, roue à la largeur de la carte, seuil des fonds teintés à régler à l'œil |
| [MESURES-PAIRES.json](./MESURES-PAIRES.json) | Les paires que chaque jeu de couleurs comparées signale, sur Tailwind 3.4 et sur la galerie |
| [Mesures/mesurer-paires.ts](./Mesures/mesurer-paires.ts) | Le script de ces mesures : `npx tsx mesurer-paires.ts > ../MESURES-PAIRES.json` |
| [Mesures/extraire-galerie.mjs](./Mesures/extraire-galerie.mjs) | Fige les écrans d'Harmonisation de la galerie sombre dans `Maquettes/galerie/`, après `npm run galerie --workspace ucm-palettes-plugin` |

Pour régénérer les données de la maquette après une nouvelle mesure, lancer
depuis ce dossier :
`node -e "const j=require('./MESURES-PAIRES.json');require('fs').writeFileSync('Maquettes/donnees-paires.js','window.PAIRES = '+JSON.stringify({tailwind:j.tailwind.fondsProches,galerie:j.galerie.fondsProches})+';\n')"`.
