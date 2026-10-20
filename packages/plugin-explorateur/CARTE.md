# Carte : plugin-explorateur

Plugin UCM Token Explorer : ucm-explorateur-plugin, privé, en lecture seule.

## ./
- SPEC.md : ce que le plugin lit, résout et refuse de conclure
- invariants/ : les invariants du paquet, un fichier par groupe
- galerie/ : états de l'interface, à 1200 × 800, à 560 × 480 et à 364 × 724, et comparaison à la maquette de la vue composant
- tests/ : dont la loi de lecture seule, les doubles de Figma, et `interface/` pour Chromium

## src/
- code.ts : routage des demandes de l'interface ; aucune route n'écrit dans le document
- messages.ts : les deux sens de la frontière sandbox ↔ interface, numérotés par demande
- lecture.ts : collections et variables locales, cibles d'alias lues par identifiant, huit à la fois, importées par leur clé quand Figma ne les rend pas
- modele.ts : relevé sérialisable : collections, modes, extensions, valeurs typées, lectures manquées
- groupes.ts : arbre des groupes, des seuls segments `/` des noms Figma
- indexation.ts : index d'identité, familles de collections et références inverses par mode
- resolution.ts : chaîne explicative dans un contexte de modes, et sa mémoire
- comparaison.ts : deux contextes : première cible différente, mode différent, valeurs égales ou non
- diagnostics.ts : chaînes qui n'aboutissent pas, regroupées par cause
- copie.ts : formats de copie et leur précision
- contraste.ts : contraste d'une paire choisie, par le calcul du kit
- consommateurs.ts : liaisons d'un calque et d'un style, et modes effectifs d'un calque
- composant.ts : modèle pur de la vue composant : natures, lignes, sections, résumés, portée, préfixe
- lectureDuComposant.ts : sujet d'une sélection, ses calques, ses frontières, ses liaisons, ses styles de texte
- apercu.ts : image du sujet, exportée en mémoire, et boîte de chaque calque
- fenetre.ts : deux dispositions de la fenêtre, une par mode, leurs bornes et leurs clés
- rapport.ts : rapport versionné des diagnostics
- releves.ts : relevé exporté, réimporté et comparé à un autre
- simulation.ts : une substitution dans une copie en mémoire
- preferences.ts : vue compacte, intégrations, associations et largeurs réglées, dans clientStorage
- espace.ts : couleurs d'un document Display P3 ramenées en sRGB, pour le contraste et la copie hexadécimale ; conversion de Palettes (`p3VersRgb8` de `ucm-couleur`), hors du noyau, qui n'importe pas `ucm-couleur`
- integrations/ : contrats et tokens importés, recette UCM Palettes, profil d'architecture UCM (les sept couches de `COLLECTIONS`)
- ui/ : barre et sa bascule de mode, arbre et sa recherche, table, inspecteur, bulle de chaîne, poignée des largeurs et vues des onglets

## src/ui/
- roles.css : couleurs sombres, placées avant la feuille du socle

## src/ui/vues/
- composant.ts : vue composant : fil d'Ariane, en-tête, aperçu, frontières, sections, pied

## scripts/
- mesurer.mjs : mesure sur 10 000 variables, hors des tests
