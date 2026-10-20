# Carte : plugin-socle

Ce que les plugins partagent : ucm-plugin-socle, privé, lu en source.

## ./
- galerie/ : banc de galerie, sa capture et décalque du thème Figma
- lois/ : lois des styles, du gabarit, du manifest et de la galerie, que le test de chaque plugin appelle
- tests/ : build, manifest, fenêtre, banc et loi des styles, pour un plugin quelconque

## build/
- inline-ui.cjs : du bundle et des feuilles de style à un HTML autonome
- manifest.cjs : manifest de distribution
- run-tests.cjs : découvreur de tests, que chaque plugin appelle

## src/
- fenetre.ts : taille bornée de la fenêtre, rangée dans clientStorage
- inventaireDeNoms.ts : acquisition de l'inventaire depuis Figma : ports de lecture, lecture par lots, lecture du suivi de Palettes ; forme de l'inventaire et protection sont dans `@ucm-kit/core/nommage`
- ui/ : bouton, onglets dont un peut être indisponible (désactivé, sauté par les flèches), interrupteur, chevron `Chevron.ts` (SVG qui tourne par CSS), feuille modale, poignée de redimensionnement, bouton « Configuration » (engrenage puis libellé) et bascule de l'en-tête

## src/ui/
- socle.css : échelle de texte, trame, rôles de couleur et replis sombres, avant la feuille de chaque plugin
