# Carte : adapter-typescript

Adaptateur opt-in : parité TS/TSX et types générés.

## src/
- parite.mjs : lit les props et la composition avec TypeScript
- generation.mjs : dérive les unions depuis les contrats
- types-variants.mjs : forme des unions produites
- cli.mjs : commande `ucm-typescript`
- index.mjs : ce que `ucm check` charge quand il le découvre
- index.d.mts : ce que cette porte promet à un consommateur TS
