# Carte : couleur

Moteur de couleur d'UCM Palettes : ucm-couleur, privé, lu en source.

## ./
- invariants/ : les invariants du paquet, un fichier par groupe
- tests/ : vecteurs figés, propriétés, et loi de pureté

## src/
- conversions.ts : hexa, sRGB, linéaire, Oklab, OKLCH et Display P3
- plafond.ts : plus grande chroma que sRGB porte, mémorisée
- rampe.ts : un cran et enveloppe de chroma qui le borne (`cranVise`, bosses des jaunes et des cyans), facteur `clairs` des tons clairs du Light, poids d'une nuance, teinte pivotée, Color shift, facteur des fonds du thème Dark, rampes des deux profils
- tailwind.ts : relevé des dix-sept rampes colorées de Tailwind (teinte et clarté de chaque cran), préréglage de dérive lu à la clarté de la référence, décalage de clarté selon la teinte (`clarteSelonLaTeinteDuReleve`)
- contraste.ts : niveaux WCAG, ΔEok, part de chroma, écriture à virgule ; le contraste vient du kit
- recette.ts : forme de la recette au format 12 (parts, `clairs` et enveloppe de chroma par profil, relevé `derives`), sa validation, son classement à la lecture : les formats 8 à 11 se lisent en format 12, une étape par format, aucun format antérieur ne se convertit
- protocole.ts : espace et clé partagés de la recette, qu'UCM Palettes écrit et que l'explorateur lit
- empreinte.ts : JSON canonique, encodeur UTF-8 et FNV-1a
- palette.ts : une palette lue contre sa recette : intensités, parts, gris pur et palette grise, départ et pivot de ses réglages, ancrage de sa référence, rampes ancrées, enveloppe de chroma de chaque intensité, clartés de leurs crans, bornes des fonds du thème Dark, clarté selon la teinte et sa garde (`clarteSelonLaTeinte`, `clarteSelonLaTeinteGardee`), garde de la bosse de chroma
- bosse.ts : bosse de chroma qui monte les voisines de la référence porteuse (`bosseDeChroma`)
- jugement.ts : jugement des promesses sur des rampes données (`jugerLesRampes`), que la garde de la clarté et celle de la bosse appellent
- ordre.ts : ordre des clartés de la chaîne (`ordreDesClartesTenu`)
- reconstruction.ts : réglages d'une palette figée retrouvés depuis ses couleurs : recherche asynchrone, bornée, interruptible, à écart en hexa
- reglages.ts : référence réglée, tirée du départ par la teinte et la clarté du porteur, rangement des réglages d'une palette (`appliquerLesReglages`)
- harmonisation.ts : candidats de teinte, course permise, zones trop proches d'une autre palette, sortie la plus proche, gris de même clarté
- nuances.ts : deux préréglages de nuances, 11 et 13, leurs courbes par défaut selon le texte des boutons de chaque thème (`courbesParDefaut`), nuances 500 à 800 réglées (`nuancesReglees`), changement de texte des boutons (`recetteAvecTexteDesBoutons`), luminosité d'un numéro absent de la liste, liste d'une palette libre
- ajustement.ts : proposition d'un ajustement de la référence, par pas de luminosité
- promesses.ts : sept garanties du kit, jugées par palette, par mode, dans la table du sens du thème, et par intensité présente, contre la page et la carte que le fond de la page détermine (`couleurDeLaCarte`)
- alertes.ts : alertes de conception, cinq fonds que « Profils confondus » juge (`confusionsDe`), palettes trop proches (`pairesTropProches`) et notice
- garantie.ts : garantie des courbes : `page/foreground` et `ring` contre le cran le plus clair, gris, et en Dark contre la carte, puis `solid/default` contre le texte des boutons, sur 360 teintes
- limites.ts : limite dynamique d'un réglage et cause de chaque borne, balayée un pas à la fois
- constats.ts : sévérités et leur ordre d'affichage
- index.ts : porte du paquet, qui republie `@ucm-kit/core/emplois`

## scripts/
- mesurer-temps.mjs : médiane de cent palettes, hors des tests
- mesurer-garantie.mjs : médiane de vingt garanties des courbes, hors des tests
- mesurer-ancrage.mjs : effet de l'ancrage sur les voisines et les promesses, hors des tests
- mesurer-limites.mjs : limites du Color shift sur six références, et leur durée, hors des tests

## planche/
- generer-planche.ts : génère `PLANCHE-DU-MOTEUR.html`, rampes du moteur à côté de Tailwind 3.4 (`npm run planche`)
- tailwind-3.4.17.json : relevé des rampes de Tailwind 3.4, lu par la planche et publié par `exports` (`ucm-couleur/tailwind-3.4.17.json`) pour le hub
