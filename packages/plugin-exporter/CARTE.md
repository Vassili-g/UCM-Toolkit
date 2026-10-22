# Carte : plugin-exporter

Le plugin : routage, configuration, forges et interface. Le moteur d'extraction vit dans le socle (`plugin-socle/src/composant/`), et ce paquet le lit en source.

## ./
- README.md : ouvrir le plugin, ses deux commandes, ses limites
- SPEC.md : le moteur, ce que le plugin lit, élit et signale
- manifest.json : chargé dans Figma depuis `dist/`
- invariants/ : les invariants du paquet, un fichier par groupe
- galerie/ : états de l'UI, atteignables hors de Figma
- tests/ : tests du paquet

## src/
- code.ts : routage UI → commandes
- base64.ts : encodage UTF-8/Base64 sans dépendance au sandbox
- config.ts : configuration locale (dépôts, dépôt actif, clé de destination, reprise des anciennes clés)
- fenetre.ts : bornes et clé de la fenêtre ; le socle la lit et la range
- connexion.ts : ce que vaut la connexion au dépôt, et le geste qu'elle demande
- prevol.ts : ce que l'analyse conclut avant d'écrire, et l'action qu'elle propose
- cible.ts : ce sur quoi l'export porte, et pourquoi il ne porte pas
- depot.ts : où écrire, immobilité, collision et corps de la demande
- messages.ts : les deux sens de la frontière sandbox ↔ UI
- ui/ : interface du plugin

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
