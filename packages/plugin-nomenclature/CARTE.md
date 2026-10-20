# Carte : plugin-nomenclature

Plugin UCM Nomenclature : ucm-nomenclature-plugin, privé ; renomme les variables et les collections locales.

## ./
- galerie/ : états de l'écran, à 640 × 720 et à 360 × 420
- invariants/ : les invariants du paquet, un fichier par groupe
- tests/ : dont la loi d'écriture et le protocole avec une session sur un port factice

## src/
- code.ts : fenêtre, sa taille, et demandes de l'écran confiées à la session
- messages.ts : les deux sens de la frontière sandbox ↔ écran, numérotés par demande et par génération
- session.ts : inventaire, lexique, règles et résultat, gardés dans le sandbox ; file des calculs
- tranches.ts : un générateur du kit mené par tranches de huit millisecondes, abandonné par une demande plus récente
- lecture.ts : republie l'acquisition de l'inventaire du socle
- lectureFigma.ts : collections et variables locales, variables qu'UCM Palettes a écrites et sa marque `nommage`
- regles.ts : règles du fichier, une entrée de données partagées par règle, journal, export et import ; les clés qui changent un nom, leurs constructeurs et leur lecture viennent du kit (`protocoles`)
- projection.ts : du résultat du kit aux vues de l'écran : bilan, groupes, pages, questions, fiches, effets
- ecriture.ts : le seul fichier qui écrive dans le document : noms, règles, journal et point d'annulation ; un refus avant toute écriture quand une règle de nommage vient d'une version plus récente
- conventions.ts : écriture des noms choisie par le fichier, validée par les registres du kit
- fenetre.ts : bornes et clé de la fenêtre
- ui/ : coquille et sa frontière, onglets À appliquer, À trancher et Règles, feuilles, Configuration ; textes dans `textes.ts`
