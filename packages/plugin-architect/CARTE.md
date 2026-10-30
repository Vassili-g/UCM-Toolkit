# Carte : plugin-architect

Plugin UCM Architect : ucm-architect-plugin, privé, en lecture seule.

## ./
- SPEC.md : ce que le plugin lit, résout et refuse de conclure
- invariants/ : les invariants du paquet, un fichier par groupe
- galerie/ : états de l'interface, à 1360 × 800, à 560 × 480 et à 500 × 760, un fichier d'états par domaine dans `etats/`, et comparaison à la maquette de la vue composant
- tests/ : dont les lois d'écriture (`loiDEcriture`, `loiDEcritureDesNoms`), la loi des imbriqués (`imbriquesParLeKit`), les doubles de Figma, `outils/` (le monde fabriqué et le chargeur de capture de `capture.test.ts`), `nomenclature*.test.ts` pour le code de Nomenclature et `interface/` pour Chromium
- galerie/composant/ : Alert à 11 variants et Button à 216, leurs analyses, et le fichier hors UCM de `t-hors`
- galerie/nomenclature/ : données des états de Nomenclature, joués dans la galerie d'Architect (`etats/nomenclature.cjs`)
- galerie/recherche/ : fichier d'exemple des états de recherche et de fiche (`t-questions`, `t-terme`, `t-fiche`)
- galerie/structure/ : relevé et message `structure` des états `t-structure` et `t-portees`
- galerie/bibliotheque/ : noms et valeurs de la library Intencial Tokens des états `t-bibliotheque`

## src/
- code.ts : aiguillage des demandes de l'interface vers les domaines de `sandbox/` ; ouverture, déclaration UCM, sélection et panneau périmé
- lecture.ts : collections et variables locales, cibles d'alias lues par identifiant, huit à la fois (`limiteur.ts` du socle), importées par leur clé quand Figma ne les rend pas
- catalogue.ts : catalogue de référence du mode Composant : library lue par noms, valeurs lues par identifiant quand le relevé le donne, sinon importées par clé (avec leurs cibles d'alias et les modes de leurs collections), variables du fichier
- modele.ts : relevé sérialisable : collections, modes, extensions, valeurs typées, lectures manquées
- groupes.ts : arbre des groupes, des seuls segments `/` des noms Figma
- indexation.ts : index d'identité, familles de collections et références inverses par mode
- resolution.ts : chaîne explicative dans un contexte de modes, et sa mémoire
- diagnostics.ts : chaînes qui n'aboutissent pas, regroupées par cause
- copie.ts : formats de copie et leur précision
- contraste.ts : contraste d'une paire choisie, par le calcul du kit
- consommateurs.ts : liaisons d'un calque et d'un style, et modes effectifs d'un calque ; le relevé lui passe les peintures qu'il a copiées, les segments de texte qu'il a lus et la mémoire de champs de la demande pour qu'ils ne se relisent pas
- composant.ts : modèle pur de la vue composant : natures, lignes, sections, résumés, portée, préfixe
- lectureDuComposant.ts : sujet d'une sélection, ses calques, ses frontières, ses liaisons, ses styles de texte
- releveDuComposant.ts : relevé complet d'un jeu de variants pour les contrôles du kit (`ReleveDeComposant`), borné par le budget de layers de S3 ; lit, après les variants de l'hôte, les liaisons des variants de chaque jeu de wrapper de dimensions qu'ils instancient (`wrappers`, comptés dans le budget de layers) ; lit la mise en page scalaire, les peintures et les segments de texte (un appel pour les liaisons de plage et les plages) par `acquisition.ts` du socle, et variables, collections, styles et maîtres par `ressources.ts` ; ses champs de nœud (`name`, `parent`, `children`, `fills`…) par la mémoire de champs de la demande
- imbriquesDuReleve.ts : sorte (`sorteDeLImbrique` du kit) du layer d'une instance imbriquée et provenance de ses liaisons, comparées au layer homologue du composant principal, lu une fois par maître et par demande ; note le jeu de variants d'un wrapper de dimensions que `releveDuComposant.ts` lit ensuite
- constatsDuMoteur.ts : points à corriger du moteur de l'exporteur traduits en `Constat` du kit, par une table explicite (C30, C34, C35, C41, C42, C44)
- regles.ts : règles d'usage d'un composant en lecture : C43 (pas d'instance de règles, avec sa correction de sorte `regles`) et C45 (propriété sans règle, règle sans propriété) ; lit les `props`, le `stateModel` et les imbriqués du résultat interne du moteur, élidés comme le contrat (`contratDesReglesDe`) ; retient le modèle de chaque correction
- apercu.ts : image du sujet, exportée en mémoire, et boîte de chaque calque
- fenetre.ts : deux dispositions de la fenêtre, une par mode, leurs bornes et leurs clés
- preparations.ts : forme d'une préparation, texte échangé (`ucm-preparation`, jugé format, version, champs) et liste rangée dans `clientStorage` sous `CLE_DES_PREPARATIONS` ; couches du catalogue tirées du kit
- preferences.ts : vue compacte et largeurs réglées, dans clientStorage
- espace.ts : couleurs d'un document Display P3 ramenées en sRGB, pour le contraste et la copie hexadécimale ; conversion de Palettes (`p3VersRgb8` de `ucm-couleur`), hors du noyau, qui n'importe pas `ucm-couleur`
- integrations/ : recette UCM Palettes, profil d'architecture UCM (les sept couches de `COLLECTIONS`)
- ui/ : barre et sa bascule de mode, arbre et sa recherche, table, panneau latéral, bulle de chaîne et poignée des largeurs
- ui/composant/ : analyse retenue (constats, pastille ; `modele-propose` y retire les C81 de `retires` et range les constats d'un modèle), section Variants, `signes.ts` (signe de chaque ligne et du titre de la colonne de gauche), corps du mode Composant (vue, frontière tirable, panneau)
- ui/analyse/ : panneau des constats : le sommaire d'éléments, les sections, l'en-tête des Bloquants et le pied, l'écran de chaque état de l'analyse (vide, en cours, aucun constat, partielle, annulée, arrêtée, périmée, library à choisir, hors UCM), `rapport.ts` (nom et contenu du rapport téléchargeable, lien sous la liste)
- ui/panneau/ : `elements.ts` range les constats visibles par élément du composant (couleurs, tailles, texte, tokens, variants, règles, accessibilité) : cartes de corrections, puis questions, puis constats à faire ; nombre de points, Bloquants, éléments tenus, signe de chaque élément. `informations.ts` : phrase et lieu de chaque constat `info`. `rendu.ts` : puce du sommaire, bande de section, section tenue, en-tête des Bloquants, section Informations et ses lignes
- ui/corrections/ : cartes de corrections cochables (Liaisons, Tailles, Règles d'usage, Noms de valeurs), carte d'un modèle, carte des liaisons préparées (`liaisons.ts`), bouton Sélectionner dans le corps déplié, Appliquer par carte, pied avec Appliquer tout et ligne de réussite avec les sautées
- ui/questions/ : une carte par question du moteur (liaison, nom de valeur, liaison d'état avec l'indice du moteur), candidats en boutons, Sélectionner, ligne de réponse avec Annuler la réponse, Plus tard
- ui/ignores/ : constats à faire dans Figma avec l'alerte typée, mesure de contraste et recommandations d'accessibilité (C49 à C52), ligne d'actions avec Sélectionner, Ignorer, section Ignorés avec Ne plus ignorer, carte du composant sans token, carte du modèle C81 (« Proposer les liaisons », liste des layers du modèle)
- ui/bibliotheque/ : library d'un fichier sans variable locale : relevé bâti sur ses noms, valeurs importées à l'ouverture d'un groupe
- ui/nomenclature/ : coquille de Nomenclature et sa frontière, onglets À appliquer, À trancher et Règles, feuilles, Configuration ; montée dans le panneau latéral du mode Tokens

## src/messages/
- index.ts : `UiRequest` et `PluginMessage`, réunis par domaine
- commun.ts : messages communs aux deux modes et identité d'une analyse
- nomenclature.ts : messages de Nomenclature, numérotés par demande et par génération
- arbre.ts, composant.ts : messages de l'arbre des tokens et de la vue Composant
- accessibilite.ts, analyse.ts, bibliotheque.ts, configuration.ts, corrections.ts, fiche.ts, ignores.ts, preparation.ts, questions.ts, rapport.ts, recherche.ts, regles.ts, structure.ts : messages des autres domaines

## src/sandbox/
- index.ts : la table des domaines que `code.ts` aiguille
- contexte.ts : ce qu'un domaine reçoit : port vers l'interface, fenêtre, état partagé ; le suivi des pages écoutées, qui rend celles qu'il n'a pas pu écouter
- lectureDeFigma.ts : ports de lecture sur `figma`, communs aux domaines
- souche.ts : réponse « non construit » d'un domaine pas encore fait
- commun.ts, arbre.ts, composant.ts, nomenclature.ts, analyse.ts, configuration.ts, corrections.ts, questions.ts, ignores.ts : domaines construits ; `configuration.ts` lit et range le niveau d'accessibilité (`clientStorage`) et la library choisie, et défait le dernier lot de structure depuis l'Historique (`annuler-structure`) ; `analyse.ts` lance l'analyse (relevé, catalogue, moteur, contrôles du kit dont accessibilité et typographie), crée les inventaires de la demande que le catalogue, le moteur et la lecture des règles partagent, passe ses constats par `proposerLesCorrections` du kit puis par les ignorés rangés, porte l'identité, les constats, les corrections de l'analyse courante, le panneau périmé et la couverture de sa surveillance ; `questions.ts` tire d'une réponse une correction exacte retenue dans l'analyse ; `ignores.ts` écarte un constat ou sa proposition et le rend ; `corrections.ts` écrit un lot de l'analyse courante non périmée, une opération à la fraction à la fois, et sélectionne les layers d'un constat ; `servir-de-modele` rend les constats de `proposerLaPropagation` et retient leurs corrections sans écrire
- rapport.ts : `preparer-le-rapport` lit le nœud du sujet et rend sa capture en JSON, en lecture seule ; l'interface en fait le rapport téléchargeable
- capture.ts : dans le build de capture seulement (`capturer: true`), après l'analyse : relève en JSON les nœuds, plages de texte, maîtres, variables, styles, libraries et règles de page que le relevé et le moteur lisent, puis chronomètre 10 000 lectures de chaque propriété ; l'envoi passe par `Contexte.envoyerLaCapture`, hors de `PluginMessage`
- projectionsDesControles.ts : pour chaque famille de contrôles du kit, le gabarit de la part du relevé et du catalogue qu'elle lit et la projection qui en découle ; `creerLesRequetes` les compare pour reprendre une famille
- anticipation.ts : lecture des libraries lancée à la sélection d'un composant, reprise ou relue au clic sur Analyser, abandonnée au changement de page ; `rafraichirLesLibraries` la relit pour la prélecture
- prelecture.ts : moment de la prélecture à la sélection : 1 s de silence avant la demande `analyser` d'origine `prelecture`, jeton levé par chaque événement, relance des libraries toutes les 5 s ; `analyse.ts` porte l'analyse discrète
- bibliotheque.ts : library lue depuis un autre fichier : arbre depuis les noms, valeurs d'un groupe importées par lots de huit
- structure.ts : mode Tokens sans composant : `lire-structure` rend les constats de `controlerLeCatalogue` et de `controlerLIntegriteUcm` du kit et leurs corrections (scopes C63, alias de mode C60, création C82), sans les constats ignorés ; `appliquer-structure` n'écrit que les corrections retenues du dernier constat, une opération à la fois
- preparation.ts : plan de préparation des tokens tiré du kit (`preparer`), préparations rangées, texte échangé lu ou copié (`lire-texte` envoie aussi `regles-recues`), création des variables dans le fichier des tokens, retour au composant seulement pour la même clé de jeu (`lier-preparation`)
- accessibilite.ts, fiche.ts, recherche.ts, regles.ts : souches

## src/ecriture/
- configuration.ts : range la library choisie, donnée partagée du nœud racine sous `CLES_D_ARCHITECT.libraryChoisie`
- cleDuFichier.ts : range `figma.fileKey`, quand Figma le sert, sous `CLES_D_ARCHITECT.cleDuFichierDesTokens`
- journal.ts : range un lot du journal (entrées, puis référence) dans les données partagées ; le journal des noms (`journal`) et celui de structure (`journal-structure` : scopes, cible d'alias par mode, création de variables) ; `journaliserLesCreations` sert la création de B8
- structure.ts : écrit les corrections `scope`, `alias-de-mode` et `variable` (création dans `theme`) après relecture, journal rangé avant, un point d'annulation ; défait le dernier lot de structure (`annulerLeDernierLotDeStructure`), sans supprimer une variable créée qui a gagné un usage
- noms.ts : écrit les noms, les règles du fichier et le point d'annulation des renommages, avec le journal de `journal.ts` ; un refus avant toute écriture quand une règle de nommage vient d'une version plus récente
- regles.ts : applique les corrections de sorte `regles` par `creerLesRegles` du socle ; relit avant d'écrire, saute `objet-change`, `instance-remplie` ou `erreur`, sans point d'annulation
- liaisons.ts : écrit les corrections de sorte `liaison` (nombre, fill, stroke, texte par plage) après relecture, saute avec un motif ; importe la variable cible, une fois par clé et par lot ; `ecrireLeLot` pose le seul point d'annulation du lot, liaisons, règles et noms de valeurs ensemble
- noms-de-valeurs.ts : écrit les corrections de sorte `nom-de-valeur` (C12) : renomme une valeur dans le nom de chaque variant du jeu après relecture ; une valeur cible déjà présente n'est jamais écrite (`fait-faux`)
- ignores.ts : range et lit les clés d'Ignorer (constat, `proposition:` + constat) à la racine du document sous `CLES_D_ARCHITECT.ignorer` ; rien hors UCM ni pour un constat `limite` ; `rolesIgnoresDe` rend les rôles ignorés partout (aucun pour l'instant)
- selection.ts : le seul changement de sélection du plugin, les layers d'un constat
- variables.ts : `creerUneVariableAliasee`, seul appel à `createVariable` ; crée les seules variables manquantes d'une préparation dans la collection `components` reconnue par la déclaration UCM, alias de chaque mode compris ; une variable divergente reste telle quelle sans réponse ; un lot du journal de structure, un point d'annulation

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
- textes/ : catalogues des textes, un par domaine (`elements.ts` : les sept éléments du panneau et leurs libellés) ; `index.ts` les réunit
- styles/ : feuilles, une par domaine, chargées dans l'ordre de `FEUILLES_DES_DOMAINES` (`scripts/build-ui.cjs`)
- recherche/ : lecture du champ de l'arbre (texte, `terme:`, `vise:`), variables trouvées et lignes de la recherche
- fiche/ : fiche d'une variable, à la place de l'inspecteur : chaîne d'alias, renommage à appliquer, « Utilisée par »
- structure/ : onglet À faire dans Figma du mode Tokens (constats typés, chemins en phrase) et cartes de modes et de scopes en deux colonnes, sous Corrections
- preparation/ : dialogue de préparation des tokens, texte partagé, création et liaisons au composant
- capture.ts : reçoit `capture-architect` du sandbox et le télécharge, seulement si `UCM_ARCHITECT_CAPTURER` vaut `true`

## src/ui/vues/
- composant.ts : vue composant : fil d'Ariane, en-tête, aperçu, section Variants, frontières, sections, pied ; montre les liaisons que les corrections cochées changent
- horsUcm.ts : alerte d'un fichier non déclaré UCM, à la place des onglets du mode Tokens

## scripts/
- mesurer.mjs : mesure sur 10 000 variables, hors des tests
- rejouer-la-capture.ts : rejoue l'analyse sur une capture et compte ses lectures par étape, champ et appelant, pondérées par le banc
