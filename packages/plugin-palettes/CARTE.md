# Carte : plugin-palettes

Plugin UCM Palettes : ucm-palettes-plugin, privé.

## ./
- manifest.json : identifiant attribué par Figma (point M1)
- invariants/ : les invariants du paquet, un fichier par groupe
- galerie/ : états de l'interface, à la taille par défaut et à la taille minimale
- tests/ : dont la loi d'écriture, et `interface/` pour Chromium

## src/
- code.ts : routage des demandes de l'interface, une porte par geste d'écriture
- fileDuDocument.ts : file commune des lectures et mutations du document ; un refus libère le geste suivant
- messages.ts : les deux sens de la frontière sandbox ↔ interface
- lecture.ts : recette rangée, classée, son empreinte, profil du document, cadres retrouvés où qu'ils soient, pages du fichier
- analyse.ts : une palette pour l'onglet : rampes, promesses, alertes et notices triées
- edition.ts : ce qu'une saisie fait à une palette, avant tout rangement, ajustement de la référence compris ; la palette du plugin qu'une palette du fichier devient, recalculée ou figée
- familles.ts : huit familles de teinte, et famille voisine d'une teinte dans un sens, qui nomme les bouts de la piste de teinte
- reglagesParDefaut.ts : valeurs par défaut des trois réglettes du réglage global, ce qui les écarte d'elles, et liste des réglages modifiés d'une palette, sans DOM
- ajustementDeLaReference.ts : panneau d'ajustement sans DOM : pas, proposition, nuance visée, annonce d'un pas, garanties avant et après
- configuration.ts : champs de la configuration, fonds et seuils compris, palettes que chacun touche, et « Par défaut » par carte
- importation.ts : fichier importé, classé comme la recette rangée, son écart avec elle, champ par champ, et nature de cet écart
- rapport.ts : rapport de vérification : crans, promesses, alertes, empreinte et écarts du dernier dessin
- presentation.ts : promesses manquées groupées, place de chaque alerte, réglage que chaque message ouvre, bandes `solid`, `surface`, `page` de l'aperçu et son survol lié, verdict d'une palette, état d'une fiche de Gestion
- lectureDesVariables.ts : collections locales, variables de couleur, suivi rangé et collections des bibliothèques activées ; avec l'écriture, le seul appel à `figma.variables` et à `figma.teamLibrary`
- navigation.ts : « Afficher dans Figma » : ouvre la page du cadre et le cadre, sans toucher au document
- fenetre.ts : bornes et clé de la fenêtre ; le socle la lit et la range
- preferences.ts : langue de l'interface et vue de Gestion, lues et rangées dans clientStorage, rangements ordonnés
- harmonisation.ts : état de l'onglet Comparaison (palettes cochées, palette à régler, thème, intensité, affichage, vision), départ de chaque palette réglée, annulation de ses modifications et constats de la comparaison, sans DOM
- ordreDesPalettes.ts : ordre d'affichage des palettes : par teinte (Création, Comparaison), par nom (Gestion) ; la recette garde le sien
- vision.ts : trois visions des couleurs que la roue simule, par matrice en sRGB linéaire
- roueDesTeintes.ts : géométrie de la roue des teintes : position d'une teinte, teinte visée par le pointeur, arc d'une paire, hauteur des noms
- i18n/ : registre des langues, catalogues anglais et français, traducteur, séparateur décimal
- variables/ : modèle pur des variables, sans Figma ni DOM
- ui/ : en-tête du socle, onglets Création, Vérification, Comparaison et Gestion, Configuration à deux onglets, Palettes et Général

## src/planche/
- modele.ts : modèle pur d'un cadre de planche : par thème, rampes, variables de dossier de chaque intensité et leurs garanties avec leur niveau WCAG, grilles, selon les parties choisies ; styles nommés, empreinte
- fraicheur.ts : chaque cadre à jour, périmé, jamais dessiné, introuvable ou illisible, cadres orphelins et copiés, effet d'un import
- peints.ts : couleurs relues sur la planche, comparées à celles de l'aperçu
- textes.ts : textes des planches : catalogue français, quelle que soit la langue de l'interface

## src/ecriture/
- marque.ts : marque `nommage` que Palettes range à la racine de `ESPACE_PARTAGE` : il y nomme ses variables selon les règles, et UCM Nomenclature cesse alors de les protéger
- recette.ts : rangement de la recette : validation, empreinte lue, commitUndo
- planche.ts : dessin de la planche : page, cadres possédés remplacés à leur place, polices, calques étrangers, un commitUndo par dessin ; retrait du cadre d'une palette supprimée ; choix de la page des planches, qui y déplace les cadres possédés
- restaurationDesVariables.ts : journal qui défait une écriture refusée par Figma et rend les restes qu'il n'a pas pu défaire
- variables.ts : écriture des palettes dans les variables : collection, modes, nom déjà pris, création sans portée, valeurs, suivi, un commitUndo ; rangement de la destination ; retrait des variables d'une palette supprimée ; reprise d'une palette du fichier ; copie d'une palette de bibliothèque

## src/variables/
- nommeur.ts : noms du plan passés par le calcul de renommage du socle, sur l'inventaire du fichier entier ; sans règles rangées ou dans une collection exclue, ils restent bruts
- destination.ts : où les palettes s'écrivent : collection, groupe, thèmes ; son défaut et sa validation
- noms.ts : segment d'une palette dans le chemin de ses variables, et collision de deux palettes
- plan.ts : ce qu'une palette écrit : clé stable, nom de variable, mode et couleur de chaque entrée
- suivi.ts : suivi rangé sous `ucm_palettes/variables` : destination, variables de chaque palette, lecture tolérante et versionnée
- releve.ts : ce que la lecture rend : collections, variables de couleur, et couleur de Figma arrondie à l'octet
- etat.ts : état des tokens d'une palette, sur trois lectures, avec les couleurs concernées
- detection.ts : palettes que le fichier porte déjà dans ses variables
- reprise.ts : reprise d'une palette du fichier : mode que chaque thème vise, liaison du suivi, palette du fichier qu'une liaison désigne, origine sous laquelle ses autres variables se créent
- bibliotheques.ts : collections de bibliothèque et palettes que leurs noms de variables dessinent, sans leurs couleurs
- gestion.ts : ce que Gestion montre des tokens : ce qu'une écriture créerait et remplacerait, simulation d'une destination, variables d'une palette supprimée
- lot.ts : plan pur d'un lot entier : noms finaux, réservations, refus, créations, remplacements et renommages ; Gestion l'annonce et l'écriture l'exécute

## src/ui/
- detailDesTokens.ts : détail de la ligne « Tokens Figma » d'une palette reprise du fichier, sans DOM
- paletteOuverte.ts : recette affichée, palette ouverte, thème montré, son analyse, état du geste et verdict de chaque palette, sans DOM ; ses abonnés prévenus à chaque rendu complet, et ceux du thème à chaque changement
- barreDePalette.ts : barre de la palette ouverte, un bloc ordinaire en un exemplaire que l'onglet actif place dans son panneau : sélecteur, « Nouvelle palette », menu, confirmation de suppression
- basculeDuTheme.ts : choix « Aperçu » Light/Dark du thème montré, que la ligne du titre de Création et celle de Vérification rendent chacune
- ongletCreation.ts : onglet Création : barre, ligne du titre « Palette [nom] » et de la bascule du thème, encart d'une palette reprise du fichier, cartes, dont la configuration repliée après une création, puis pied qui compte les messages ; état du geste en cours
- ongletVerification.ts : onglet Vérification : barre, ligne du titre et de la bascule du thème, verdict de la palette ouverte, ses messages, carte des garanties fixe, pied vers Gestion ou Création ; sans palette ouverte, bilan des palettes
- ongletHarmonisation.ts : onglet Comparaison : en-tête avec l'intensité et le thème, bilan, cinq cartes, compteur de l'onglet ; recette et départs d'avant un glisser ou un rangement en vol, que Échap et un refus rendent ; hauteurs des cartes figées pendant un glisser
- harmonisation/ : cinq cartes de l'onglet : palettes trop proches, liste à cocher, aperçu en couleurs ou en gris, réglages d'une palette, roue des teintes ; couleurs qu'elles peignent, course et zones trop proches partagées par la piste et la roue, prévisualisation d'au plus une palette par image
- grandeursDuReglage.ts : trois grandeurs d'un réglage, teinte, saturation et luminosité : écriture, lecture d'une saisie, bouts de la piste et piste peinte, communes au Réglage global et aux Réglages d'Harmonisation
- bilanDesPalettes.ts : classement de chaque palette, à corriger, à vérifier ou conforme, et son premier constat, sans DOM
- vueDuBilanDesPalettes.ts : Vérification sans palette ouverte : onglets du bilan, nuancier mis en avant ou atténué, détail, « tout est conforme »
- nuancierDesPalettes.ts : nuancier partagé de l'accueil de Création et du bilan : carte de trois aplats par palette, point d'état, carte atténuée
- ligneFixe.ts : un message sur une ligne de 24 px, présente même vide, et sa bulle au clic
- piedDeLaPalette.ts : pied de l'onglet Création, visible seulement en cas de garantie manquée ou d'alerte : bilan, « Vérifier », annonce en fin de geste ; compteur de l'onglet Vérification
- champs.ts : libellé au-dessus de ses saisies, choix du modèle, deux cartes des intensités de la création, segments des intensités de la configuration et choix du profil porteur
- carte.ts : une carte de la configuration, fixe ou repliable : glyphe, titre, sous-titre et résumé ; une carte repliable porte un en-tête de bouton de repli puis l'emplacement de ses choix, visible carte ouverte
- glyphes.ts : glyphe de chaque carte titrée, aperçu compris, en formes à rôle de couleur, que la maquette du Color shift dessine aussi
- calculDesLimites.ts : limites dynamiques calculées par tranches entre les images, terminées au début d'un geste
- localisation.ts : contexte de langue d'une interface : textes liés aux éléments, retraduits à la bascule
- socleLocalise.ts : composants du socle, libellés liés au contexte de langue
- couleur/ : sélecteur de couleur embarqué, ses formats Hex, RGB et HSL, pastilles qu'il propose, une couleur par image pendant un glisser suivi sur le document
- nuancier.ts : aperçu peint du fond de la page du thème montré, sans bascule : case du texte des boutons, pastilles en grille, bandes des dossiers et leurs rayures, survol lié, choix et relâche d'une nuance, détail d'une nuance
- badge.ts : badge d'un niveau WCAG, AAA, AA ou AA ✗, et ce qu'il juge pour l'assistance technique
- garanties.ts : carte des garanties, fixe, dans Vérification : en-tête sans thème, rangée en tête du corps pour le choix Soft/Vivid « Afficher » (deux intensités), liens vers l'autre thème, réglette et arcs, un encadré par minimum, états en colonnes, une ligne par association
- specimens.ts : spécimen d'un rôle : bouton, texte, champ, anneau, trait ou aplat
- selecteur.ts : palette ouverte, en liste déroulante avec la pastille de chaque référence et le verdict de chaque palette
- creation.ts : une palette neuve, en carte : nom, référence, modèle, intensités
- menuPalette.ts : dupliquer, supprimer
- frontiere.ts : numérotation des demandes, un seul rangement en vol, écriture des variables et dessin après lui, un seul choix de page et un seul rangement de destination en vol
- ongletGestion.ts : onglet Gestion : sections repliables, liste dépliable des palettes ; une ligne par palette, et dépliée « Modifier » et sa fiche : rampes, référence, garanties, lignes de sortie, encart d'écriture et encart des couleurs changées dans Figma ; « Déjà dans le fichier » et « Dans les bibliothèques » dans la même liste ; une carte par palette supprimée ; notices, recette repliée
- connexion.ts : section « Connexion à Figma » : destination des tokens et page des planches en résumé ; dépliée, leurs gestes « Changer », heure du dernier état lu et « Synchroniser »
- destination.ts : carte « Destination des tokens » : collection en liste à choix unique, groupe, thèmes, simulation du panneau des variables, et refus du sandbox
- pageDesPlanches.ts : carte « Page des planches » : une page du fichier ou une page neuve, en liste à choix unique, et refus du sandbox
- sorties.ts : lignes de sortie d'une fiche : nom, pastille d'état, détail, gestes
- dessin.ts : suivi d'un dessin : progression, résultat, confirmation des calques étrangers, écarts de peinture
- configuration.ts : Réglages communs en cartes : aperçu de la palette ouverte, fonds, intensités et fonds du thème Dark, courbes ; seuils et contenu des planches repliés
- traceDesCourbes.ts : tracé des deux courbes au-dessus de leur table, et ◆ de la référence insérée
- largeur.ts : largeur affichée d'un graphe, suivie une fois par image : Color shift, réglette des garanties et tracé s'étirent sans grandir
- apercuCompact.ts : rampes présentes d'une palette et résultat de ses garanties, pour une fiche ou les réglages
- reglagesDeLaPalette.ts : carte « Réglage global » : profil visé, trois réglettes bornées par leur limite, et en lignes fixes avertissement de la référence, butée, note d'une palette grise et première alerte
- messagesDePalette.ts : messages de la palette ouverte : ceux de la liste, ceux des intensités, et liste entière de Vérification
- ajustement.ts : modale « Ajuster la référence » : pourquoi ajuster, originale et proposition, pas, code, tableau avant et après, Appliquer
- interfaceDeTest.ts : dernière carte de l'onglet : écran de réglages E2 peint de la palette ouverte, par dossier et par état (`default`, `hover`, `pressed`), un seul écran du profil choisi ; ses choix « Vue » (Écran, États) et « Afficher » (Soft, Vivid) sont dans l'en-tête
- choix.ts : choix d'affichage commun à toutes les cartes (`createChoix`, classe `.choix-d-affichage`) : un libellé, puis des segments ; `createChoixDuProfil` y ajoute « Régler » ou « Afficher », segments Soft, Vivid et Les deux dans cet ordre, ◆ sur le profil porteur ; `createRangeeDesChoix` pour une carte fixe
- gestesDeLaRecette.ts : exporter la recette ou le rapport, importer avec l'écart, repartir de la recette par défaut
- telechargement.ts : fichier proposé au designer, par un lien vers un blob
- derive/ : carte « Color shift » : choix du profil à régler, onglets de grandeur, géométrie pure, graphe SVG et ses rails, glisser, clavier, préréglage de la teinte, lien, annulation et butée
- textes.ts : tous les textes destinés au designer, provisoires jusqu'au point M2

## src/ui/derive/
- reglette.ts : réglette bornée, commune au Color shift et au réglage global : piste peinte, zones hachurées, pouce arrêté sur la borne, marque par défaut, libellé, bouts nommés et pastille facultatifs

## scripts/
- mesurer-glisser.mjs : coût d'un mouvement de poignée, hors des tests
- capturer-etats.mjs : états de la galerie en thème sombre, aux deux tailles, hors des tests
- mesurer-glisser-couleur.mjs : coût d'un glisser dans le sélecteur de couleur et ses rendus par image, hors des tests
