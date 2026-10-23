# Carte : plugin-architect

Plugin UCM Architect : ucm-architect-plugin, privé, en lecture seule.

## ./
- SPEC.md : ce que le plugin lit, résout et refuse de conclure
- invariants/ : les invariants du paquet, un fichier par groupe
- galerie/ : états de l'interface, à 1360 × 800, à 560 × 480 et à 520 × 760, un fichier d'états par domaine dans `etats/`, et comparaison à la maquette de la vue composant
- tests/ : dont les lois d'écriture (`loiDEcriture`, `loiDEcritureDesNoms`), les doubles de Figma, `nomenclature*.test.ts` pour le code de Nomenclature et `interface/` pour Chromium
- galerie/composant/ : Alert à 11 variants et Button à 216, leurs analyses, et le fichier hors UCM de `t-hors`
- galerie/nomenclature/ : données des états de Nomenclature, joués dans la galerie d'Architect (`etats/nomenclature.cjs`)
- galerie/recherche/ : fichier d'exemple des états de recherche et de fiche (`t-questions`, `t-terme`, `t-fiche`)
- galerie/structure/ : relevé et message `structure` des états `t-structure` et `t-portees`
- galerie/bibliotheque/ : noms et valeurs de la library Intencial Tokens des états `t-bibliotheque`

## src/
- code.ts : aiguillage des demandes de l'interface vers les domaines de `sandbox/` ; ouverture, déclaration UCM, sélection et panneau périmé
- lecture.ts : collections et variables locales, cibles d'alias lues par identifiant, huit à la fois, importées par leur clé quand Figma ne les rend pas
- catalogue.ts : catalogue de référence du mode Composant : library lue par noms, valeurs importées à la demande par clé (avec leurs cibles d'alias et les modes de leurs collections), variables du fichier
- modele.ts : relevé sérialisable : collections, modes, extensions, valeurs typées, lectures manquées
- groupes.ts : arbre des groupes, des seuls segments `/` des noms Figma
- indexation.ts : index d'identité, familles de collections et références inverses par mode
- resolution.ts : chaîne explicative dans un contexte de modes, et sa mémoire
- diagnostics.ts : chaînes qui n'aboutissent pas, regroupées par cause
- copie.ts : formats de copie et leur précision
- contraste.ts : contraste d'une paire choisie, par le calcul du kit
- consommateurs.ts : liaisons d'un calque et d'un style, et modes effectifs d'un calque
- composant.ts : modèle pur de la vue composant : natures, lignes, sections, résumés, portée, préfixe
- lectureDuComposant.ts : sujet d'une sélection, ses calques, ses frontières, ses liaisons, ses styles de texte
- releveDuComposant.ts : relevé complet d'un jeu de variants pour les contrôles du kit (`ReleveDeComposant`), borné par le budget de layers de S3
- constatsDuMoteur.ts : points à corriger du moteur de l'exporteur traduits en `Constat` du kit, par une table explicite (C30, C34, C35, C41, C42, C44)
- regles.ts : règles d'usage d'un composant en lecture : C43 (pas d'instance de règles, avec sa correction de sorte `regles`) et C45 (propriété sans règle, règle sans propriété) ; retient le modèle de chaque correction
- apercu.ts : image du sujet, exportée en mémoire, et boîte de chaque calque
- fenetre.ts : deux dispositions de la fenêtre, une par mode, leurs bornes et leurs clés
- preparations.ts : forme d'une préparation, texte échangé (`ucm-preparation`, jugé format, version, champs) et liste rangée dans `clientStorage` sous `CLE_DES_PREPARATIONS` ; couches du catalogue tirées du kit
- preferences.ts : vue compacte et largeurs réglées, dans clientStorage
- espace.ts : couleurs d'un document Display P3 ramenées en sRGB, pour le contraste et la copie hexadécimale ; conversion de Palettes (`p3VersRgb8` de `ucm-couleur`), hors du noyau, qui n'importe pas `ucm-couleur`
- integrations/ : recette UCM Palettes, profil d'architecture UCM (les sept couches de `COLLECTIONS`)
- ui/ : barre et sa bascule de mode, arbre et sa recherche, table, panneau latéral, bulle de chaîne et poignée des largeurs
- ui/composant/ : analyse retenue (constats, pastille), section Variants, corps du mode Composant (vue, frontière tirable, panneau)
- ui/analyse/ : panneau des constats : ses trois onglets et leurs comptes, l'écran de chaque état de l'analyse (vide, en cours, aucun constat, partielle, annulée, arrêtée, périmée, library à choisir, hors UCM)
- ui/corrections/ : onglet Corrections : cartes cochables par section (Liaisons, Tailles, Règles d'usage, Noms de valeurs), carte d'un modèle, sélection au clic, pied, Appliquer et ligne de réussite avec les sautées
- ui/bibliotheque/ : library d'un fichier sans variable locale : relevé bâti sur ses noms, valeurs importées à l'ouverture d'un groupe
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
- commun.ts, arbre.ts, composant.ts, nomenclature.ts, analyse.ts, configuration.ts, corrections.ts, questions.ts, ignores.ts : domaines construits ; `configuration.ts` lit et range le niveau d'accessibilité (`clientStorage`) et la library choisie, et défait le dernier lot de structure depuis l'Historique (`annuler-structure`) ; `analyse.ts` lance l'analyse (relevé, catalogue, moteur, contrôles du kit dont accessibilité et typographie), passe ses constats par `proposerLesCorrections` du kit puis par les ignorés rangés, porte l'identité, les constats, les corrections de l'analyse courante et le panneau périmé ; `questions.ts` tire d'une réponse une correction exacte retenue dans l'analyse ; `ignores.ts` écarte un constat ou sa proposition et le rend ; `corrections.ts` écrit un lot de l'analyse courante non périmée, une opération à la fraction à la fois, et sélectionne les layers d'un constat ; `servir-de-modele` rend les constats de `proposerLaPropagation` et retient leurs corrections sans écrire
- bibliotheque.ts : library lue depuis un autre fichier : arbre depuis les noms, valeurs d'un groupe importées par lots de huit
- structure.ts : mode Tokens sans composant : `lire-structure` rend les constats de `controlerLeCatalogue` du kit et leurs corrections (scopes C63, alias de mode C60) ; `appliquer-structure` n'écrit que les corrections retenues du dernier constat, une opération à la fois
- preparation.ts : plan de préparation des tokens tiré du kit (`preparer`), préparations rangées, texte échangé lu ou copié (`lire-texte` envoie aussi `regles-recues`), création des variables dans le fichier des tokens, retour au composant seulement pour la même clé de jeu (`lier-preparation`)
- accessibilite.ts, fiche.ts, recherche.ts, regles.ts : souches

## src/ecriture/
- configuration.ts : range la library choisie, donnée partagée du nœud racine sous `CLES_D_ARCHITECT.libraryChoisie`
- cleDuFichier.ts : range `figma.fileKey`, quand Figma le sert, sous `CLES_D_ARCHITECT.cleDuFichierDesTokens`
- journal.ts : range un lot du journal (entrées, puis référence) dans les données partagées ; le journal des noms (`journal`) et celui de structure (`journal-structure` : scopes, cible d'alias par mode, création de variables) ; `journaliserLesCreations` sert la création de B8
- structure.ts : écrit les corrections `scope` et `alias-de-mode` après relecture, journal rangé avant, un point d'annulation ; défait le dernier lot de structure (`annulerLeDernierLotDeStructure`), sans supprimer une variable créée qui a gagné un usage
- noms.ts : écrit les noms, les règles du fichier et le point d'annulation des renommages, avec le journal de `journal.ts` ; un refus avant toute écriture quand une règle de nommage vient d'une version plus récente
- regles.ts : applique les corrections de sorte `regles` par `creerLesRegles` du socle ; relit avant d'écrire, saute `objet-change`, `instance-remplie` ou `erreur`, sans point d'annulation
- liaisons.ts : écrit les corrections de sorte `liaison` (nombre, fill, stroke, texte par plage) après relecture, saute avec un motif ; importe la variable cible, une fois par clé et par lot ; `ecrireLeLot` pose le seul point d'annulation du lot, liaisons, règles et noms de valeurs ensemble
- noms-de-valeurs.ts : écrit les corrections de sorte `nom-de-valeur` (C12) : renomme une valeur dans le nom de chaque variant du jeu après relecture ; une valeur cible déjà présente n'est jamais écrite (`fait-faux`)
- ignores.ts : range et lit les clés d'Ignorer (constat, `proposition:` + constat) à la racine du document sous `CLES_D_ARCHITECT.ignorer` ; rien hors UCM ni pour un constat `limite`
- selection.ts : le seul changement de sélection du plugin, les layers d'un constat
- variables.ts : crée les seules variables manquantes d'une préparation dans la collection `components` reconnue par la déclaration UCM, alias de chaque mode compris ; une variable divergente reste telle quelle sans réponse ; un lot du journal de structure, un point d'annulation

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
- recherche/ : lecture du champ de l'arbre (texte, `terme:`, `vise:`), variables trouvées et lignes de la recherche
- fiche/ : fiche d'une variable, à la place de l'inspecteur : chaîne d'alias, renommage à appliquer, « Utilisée par »
- structure/ : onglet À faire dans Figma du mode Tokens (constats typés, chemins en phrase) et cartes de modes et de scopes en deux colonnes, sous Corrections

## src/ui/vues/
- composant.ts : vue composant : fil d'Ariane, en-tête, aperçu, section Variants, frontières, sections, pied ; montre les liaisons que les corrections cochées changent
- horsUcm.ts : alerte d'un fichier non déclaré UCM, à la place des onglets du mode Tokens

## scripts/
- mesurer.mjs : mesure sur 10 000 variables, hors des tests
