# Carte : plugin-socle

Ce que les plugins partagent : ucm-plugin-socle, privé, lu en source.

## ./
- galerie/ : banc de galerie, sa capture et décalque du thème Figma ; `planche.cjs` et `planche/` : la planche des signaux du langage et la planche des signes, leurs sources et leurs coques
- lois/ : lois des styles, du gabarit, du manifest et de la galerie, que le test de chaque plugin appelle
- tests/ : build, manifest, fenêtre, banc et loi des styles, pour un plugin quelconque

## build/
- inline-ui.cjs : du bundle et des feuilles de style à un HTML autonome
- manifest.cjs : manifest de distribution
- run-tests.cjs : découvreur de tests, que chaque plugin appelle

## src/
- fenetre.ts : taille bornée de la fenêtre, rangée dans clientStorage
- inventaireDeNoms.ts : acquisition de l'inventaire depuis Figma : ports de lecture, lecture par lots, lecture du suivi de Palettes ; forme de l'inventaire et protection sont dans `@ucm-kit/core/nommage`
- bibliotheque.ts : noms des variables des libraries activées (sans valeur), et choix de la library la plus liée
- ui/ : bouton, onglets dont un peut être indisponible (désactivé, sauté par les flèches), interrupteur, chevron `Chevron.ts` (SVG qui tourne par CSS), feuille modale, poignée de redimensionnement, bouton « Configuration » (engrenage puis libellé), bascule de l'en-tête et composants du langage visuel (voir `## src/ui/`)

## src/composant/
- annonce.ts : le type `Annonce`, par lequel le moteur dit son étape sans dépendre de l'UI
- variables.ts : index commun, collisions et alias

## src/composant/contract/
- exportComponent.ts : orchestration et métadonnées
- componentTree.ts : axes, matrice et wrapper de layout
- compactVariants.ts : catalogue par partie de vue, et liaisons exactes
- elideNeutrals.ts : ce que le contrat n’écrit pas : null, {} et []
- serializeJson.ts : une entrée par ligne, sur deux niveaux
- layoutNodes.ts : élection du node de layout, une fois par variant
- exportableNodes.ts : parcours de l'arbre, hors dépendances composées
- porteeDAnalyse.ts : mémoire des maîtres par instance et du parcours brut et des chemins de texte par racine, et budget coopératif injectable partagé avec les lecteurs
- mesure.ts : trace de chaque analyse : durées, compteurs, avancement de la barre
- budget.ts : budget de layers et préfixe admis, voies synchrone et coopérative du même parcours
- parsers.ts : propriétés Figma → API publique
- merge*.ts : doc et icônes des règles, rangées sur leur axe
- rulesModel.ts : modèle pur des règles d’usage
- semantics.ts : vocabulaire sémantique partagé
- colorKeys.ts : clé d'une couleur dans la feuille d'un variant
- structureTree.ts : qui est un conteneur, qui est une feuille
- textRendering.ts : propriétés de texte sans variable, en CSS
- unsupportedProperties.ts : ce qu'un calque publié porte et que le schéma ignore
- localisation.ts : le Constat : où, quoi, impact et action, séparés
- extract*.ts : structure, layout, tailles, tokens et règles
- flexLayout.ts : propriétés de flux et avertissements non portables
- extractSamples.ts : ce que la maquette montre, sans rien exiger
- slotNames.ts : nommage des slots et calques d'icônes
- slotRelations.ts : composition et visibilité dans un slot
- composedComponents.ts : dépendances entre composants
- nodeBindings.ts : groupes complets de liaisons Figma
- propertyBindings.ts : component properties situées dans chaque variant
- propertySurface.ts : surface publique élue : owner direct et wrapper

## src/composant/template/
- modele.ts : du contrat au modèle des règles à poser, sans Figma
- sources.ts : ce que le document offre, et les maîtres à copier
- ecriture.ts : le seul fichier qui écrive dans le document

## src/ui/
- socle.css : échelle de texte, trame, rôles de couleur et replis sombres, avant la feuille de chaque plugin
- langage.css : le langage visuel commun, après `socle.css` : rôles `--ton-*`, `--teinte-*` et de place, classes de chemin, jeton, alerte, changement, filtre, signe ; sa loi est dans `lois/styles.ts`
- Chemin.ts : chemin de token, chemin ou variant dans une phrase, segment qui part ou arrive, pastille de couleur
- Jeton.ts : jeton d'un renommage, flèche, mot de place
- Alerte.ts : les cinq types d'alerte, tirés de `TYPES_D_ALERTE` du kit : icône, gravité, alerte, liseré, pastille de compte, lien externe
- Changement.ts : colonnes et ligne de diff, ligne de réussite, carte ciblée
- Filtre.ts : puce de filtre et recherche active
- Signe.ts : la tuile d'un signe de `SIGNES` (kit) : taille 14, 16 ou 24 px, gris ou dans la teinte de sa famille, valeur de couleur de token dans la tuile
- PoigneeDeSeparation.ts : poignée entre deux vues
