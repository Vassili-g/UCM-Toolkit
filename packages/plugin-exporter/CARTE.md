# Carte : plugin-exporter

Le moteur : extraction Figma, dépend du kit.

## ./
- README.md : ouvrir le plugin, ses deux commandes, ses limites
- SPEC.md : le moteur, ce que le plugin lit, élit et signale
- manifest.json : chargé dans Figma depuis `dist/`
- invariants/ : les invariants du paquet, un fichier par groupe
- galerie/ : états de l'UI, atteignables hors de Figma
- tests/ : tests du paquet

## src/
- code.ts : routage UI → commandes
- variables.ts : index commun, collisions et alias
- base64.ts : encodage UTF-8/Base64 sans dépendance au sandbox
- config.ts : configuration locale (dépôts, dépôt actif, clé de destination, reprise des anciennes clés)
- fenetre.ts : bornes et clé de la fenêtre ; le socle la lit et la range
- connexion.ts : ce que vaut la connexion au dépôt, et le geste qu'elle demande
- prevol.ts : ce que l'analyse conclut avant d'écrire, et l'action qu'elle propose
- cible.ts : ce sur quoi l'export porte, et pourquoi il ne porte pas
- depot.ts : où écrire, immobilité, collision et corps de la demande
- messages.ts : les deux sens de la frontière sandbox ↔ UI
- ui/ : interface du plugin

## src/contract/
- exportComponent.ts : orchestration et métadonnées
- componentTree.ts : axes, matrice et wrapper de layout
- compactVariants.ts : catalogue par partie de vue, et liaisons exactes
- elideNeutrals.ts : ce que le contrat n’écrit pas : null, {} et []
- serializeJson.ts : une entrée par ligne, sur deux niveaux
- layoutNodes.ts : élection du node de layout, une fois par variant
- exportableNodes.ts : parcours de l'arbre, hors dépendances composées
- porteeDAnalyse.ts : ce qu'une analyse garde le temps d'un export : un maître par instance
- mesure.ts : trace de chaque analyse : durées, compteurs, avancement de la barre
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

## src/template/
- modele.ts : du contrat au modèle des règles à poser, sans Figma
- sources.ts : ce que le document offre, et les maîtres à copier
- ecriture.ts : le seul fichier qui écrive dans le document

## src/tokens/
- exportTokens.ts : export DTCG
- familles.ts : type d'une famille STRING, décidé sur une composante d'alias
- graisses.ts : type d'une graisse STRING, décidé sur tout le graphe d'alias
- mouvement.ts : une TIMING en durée, une EASING en courbe, et les easings sans courbe

## src/forges/
- forge.ts : le port qu'une forge implémente
- termes.ts : mots et limites de chaque forge
- index.ts : l'adaptateur que la configuration désigne
- github.ts : branche, fichier et pull request par l'API GitHub
- gitlab.ts : commit atomique et merge request par l'API GitLab
