# Texte des boutons en Light et en Dark

Dossier de recherche d'UCM Palettes : le texte des boutons en blanc ou en noir
purs, choisi par thème pour tout le design system, et ce que ce choix impose
au bouton, au texte coloré et aux contours. Aucune implémentation.

La place des commandes Light/Dark et Soft/Vivid dans le plugin est un autre
sujet, rangé dans
[Commandes Light-Dark et Soft-Vivid](../Commandes%20Light-Dark%20et%20Soft-Vivid/README.md).
La conséquence du thème inversé sur la collection `usage` est étudiée dans
l'[architecture multi-marques](../../Archi%20Tokens%20Multi-marques/Collection%20usage/README.md).

| Document | Contenu |
|---|---|
| [Dossier de recherche](./DOSSIER-TEXTE-DES-BOUTONS.md) | Le document de référence : demande, décisions du mainteneur, proposition du thème inversé, mesures et décisions à prendre |
| [Maquette du thème inversé](./MAQUETTE-THEME-INVERSE.html) | La proposition, avant et après, sur six palettes, dans les deux thèmes ; données écrites par [generer-maquette-theme-inverse.ts](./generer-maquette-theme-inverse.ts) |
| [Maquette du premier tour](./MAQUETTE-MODES-ET-AFFICHAGE.html) | Solutions S1 à S6 ; sa section 4 montre aussi les modèles de commande Light/Dark |
| [mesurer-courbe-du-texte.ts](./mesurer-courbe-du-texte.ts) et [MESURES-COURBE-DU-TEXTE.json](./MESURES-COURBE-DU-TEXTE.json) | Second tour : courbe recalculée et table du thème inversé |
| [mesurer-polarites.ts](./mesurer-polarites.ts) et [MESURES-POLARITES.json](./MESURES-POLARITES.json) | Premier tour, solutions S1 à S5 ; le script actualise aussi la maquette du premier tour |
| [mesurer-encres.mjs](./mesurer-encres.mjs) et [MESURES-ENCRES.json](./MESURES-ENCRES.json) | Toute première mesure du texte des boutons |
| [Archives](./Archives/) | Notes de recette, étude préparatoire et première recherche ; elles traitent les deux sujets |
