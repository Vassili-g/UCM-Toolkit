# Carte : plugin-architect

Plugin UCM Architect : ucm-architect-plugin, privé, en lecture seule.

## ./
- SPEC.md : ce que le plugin lit, résout et refuse de conclure
- invariants/ : les invariants du paquet, un fichier par groupe
- galerie/ : états de l'interface, à 1360 × 800, à 560 × 480 et à 520 × 760, un fichier d'états par domaine dans `etats/`, et comparaison à la maquette de la vue composant
- tests/ : dont les lois d'écriture (`loiDEcriture`, `loiDEcritureDesNoms`), les doubles de Figma, `nomenclature*.test.ts` pour le code de Nomenclature et `interface/` pour Chromium
- galerie/nomenclature/ : données des états de Nomenclature, joués dans la galerie d'Architect (`etats/nomenclature.cjs`)

## src/
- code.ts : aiguillage des demandes de l'interface vers les domaines de `sandbox/` ; ouverture, déclaration UCM, sélection et panneau périmé
- lecture.ts : collections et variables locales, cibles d'alias lues par identifiant, huit à la fois, importées par leur clé quand Figma ne les rend pas
- catalogue.ts : catalogue de référence du mode Composant : library lue par noms, valeurs importées à la demande par clé, variables du fichier
- modele.ts : relevé sérialisable : collections, modes, extensions, valeurs typées, lectures manquées
- groupes.ts : arbre des groupes, des seuls segments `/` des noms Figma
- indexation.ts : index d'identité, familles de collections et références inverses par mode
- resolution.ts : chaîne explicative dans un contexte de modes, et sa mémoire
- comparaison.ts : deux contextes : première cible différente, mode différent, valeurs égales ou non ; sans lecteur depuis A1
- diagnostics.ts : chaînes qui n'aboutissent pas, regroupées par cause
- copie.ts : formats de copie et leur précision
- contraste.ts : contraste d'une paire choisie, par le calcul du kit
- consommateurs.ts : liaisons d'un calque et d'un style, et modes effectifs d'un calque
- composant.ts : modèle pur de la vue composant : natures, lignes, sections, résumés, portée, préfixe
- lectureDuComposant.ts : sujet d'une sélection, ses calques, ses frontières, ses liaisons, ses styles de texte
- releveDuComposant.ts : relevé complet d'un jeu de variants pour les contrôles du kit (`ReleveDeComposant`), borné par le budget de layers de S3
- constatsDuMoteur.ts : points à corriger du moteur de l'exporteur traduits en `Constat` du kit, par une table explicite (C30, C34, C35, C41, C42, C44)
- apercu.ts : image du sujet, exportée en mémoire, et boîte de chaque calque
- fenetre.ts : deux dispositions de la fenêtre, une par mode, leurs bornes et leurs clés
- rapport.ts : rapport versionné des diagnostics ; sans lecteur depuis A1
- releves.ts : relevé exporté, réimporté et comparé à un autre ; sans lecteur depuis A1
- simulation.ts : une substitution dans une copie en mémoire ; sans lecteur depuis A1
- preferences.ts : vue compacte et largeurs réglées, dans clientStorage
- espace.ts : couleurs d'un document Display P3 ramenées en sRGB, pour le contraste et la copie hexadécimale ; conversion de Palettes (`p3VersRgb8` de `ucm-couleur`), hors du noyau, qui n'importe pas `ucm-couleur`
- integrations/ : contrats et tokens importés, recette UCM Palettes, profil d'architecture UCM (les sept couches de `COLLECTIONS`)
- ui/ : barre et sa bascule de mode, arbre et sa recherche, table, panneau latéral, bulle de chaîne et poignée des largeurs ; `inspecteur.ts` n'est plus monté (U2)
- ui/nomenclature/ : coquille de Nomenclature et sa frontière, onglets À appliquer, À trancher et Règles, feuilles, Configuration ; montée dans le panneau latéral du mode Tokens

## src/messages/
- index.ts : `UiRequest` et `PluginMessage`, réunis par domaine
- commun.ts : messages communs aux deux modes et identité d'une analyse
- nomenclature.ts : messages de Nomenclature, numérotés par demande et par génération
- arbre.ts, composant.ts : messages de l'arbre des tokens et de la vue Composant
- accessibilite.ts, analyse.ts, bibliotheque.ts, configuration.ts, corrections.ts, fiche.ts, ignores.ts, preparation.ts, questions.ts, recherche.ts, regles.ts, structure.ts : messages des autres domaines

## src/sandbox/
- index.ts : la table des domaines que `code.ts` aiguille
- contexte.ts : ce qu'un domaine reçoit : port vers l'interface, fenêtre, état partagé
- lectureDeFigma.ts : ports de lecture sur `figma`, communs aux domaines
- souche.ts : réponse « non construit » d'un domaine pas encore fait
- commun.ts, arbre.ts, composant.ts, nomenclature.ts, analyse.ts : domaines construits ; `analyse.ts` lance l'analyse (relevé, catalogue, moteur, contrôles du kit), porte l'identité et le panneau périmé
- bibliotheque.ts : library lue depuis un autre fichier : arbre depuis les noms, valeurs d'un groupe importées par lots de huit
- accessibilite.ts, configuration.ts, corrections.ts, fiche.ts, ignores.ts, preparation.ts, questions.ts, recherche.ts, regles.ts, structure.ts : souches

## src/ecriture/
- cleDuFichier.ts : range `figma.fileKey`, quand Figma le sert, sous `CLES_D_ARCHITECT.cleDuFichierDesTokens`
- noms.ts : le seul fichier qui écrive dans le document : noms, règles, journal et point d'annulation ; un refus avant toute écriture quand une règle de nommage vient d'une version plus récente

## src/nomenclature/
- session.ts : inventaire, lexique, règles et résultat, gardés dans le sandbox ; file des calculs
- tranches.ts : un générateur du kit mené par tranches de huit millisecondes, abandonné par une demande plus récente
- lecture.ts : republie l'acquisition de l'inventaire du socle
- lectureFigma.ts : collections et variables locales, variables qu'UCM Palettes a écrites et sa marque `nommage`
- regles.ts : règles du fichier, une entrée de données partagées par règle, journal, export et import ; les clés qui changent un nom, leurs constructeurs et leur lecture viennent du kit (`protocoles`)
- projection.ts : du résultat du kit aux vues de l'écran : bilan, groupes, pages, questions, fiches, effets
- conventions.ts : écriture des noms choisie par le fichier, validée par les registres du kit
- fenetre.ts : bornes et clé de la fenêtre

## src/ui/
- roles.css : couleurs sombres, placées avant la feuille du socle
- textes/ : catalogues des textes, un par domaine ; `index.ts` les réunit
- styles/ : feuilles, une par domaine, chargées dans l'ordre de `FEUILLES_DES_DOMAINES` (`scripts/build-ui.cjs`)

## src/ui/vues/
- composant.ts : vue composant : fil d'Ariane, en-tête, aperçu, frontières, sections, pied

## scripts/
- mesurer.mjs : mesure sur 10 000 variables, hors des tests
