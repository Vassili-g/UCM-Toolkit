# Carte : hub

Page locale et autonome qui montre ce que le kit et le moteur de couleur produisent : ucm-hub, privé, lu en source.

## ./
- HUB-UCM.html : la page générée et commitée ; son test de fraîcheur la compare à `genererHub`
- invariants/ : les invariants du paquet
- scripts/ : découvreur de tests
- tests/ : modèle, fraîcheur et taille de la page

## src/
- generer.ts : `genererHub`, la page autonome que compile esbuild, et `CHEMIN_DU_HUB` (`npm run hub`)

## src/modele/
- modele.ts : modèle pur : jeux de couleurs par palette, intensité et mode, mesures des garanties et des usages, lecture d'une recette

## src/vues/
- page.ts : la page dans le navigateur ; seul fichier du paquet qui lit le DOM
- page.css : feuille de la page
- tsconfig.json : compile les vues avec le DOM
